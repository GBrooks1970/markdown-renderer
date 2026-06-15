/* Markdown Renderer — application logic (vanilla JS, classic script so it runs from file://).
 *
 * Modules (IIFE-scoped, no build step):
 *   FolderAccess  — acquire a directory via File System Access API or <input webkitdirectory> fallback
 *   Enumeration   — collect + sort markdown descriptors; expose a lazy folder index for any file
 *   Render        — markdown -> sanitised HTML -> syntax highlight
 *   Resolve       — relative images (same-folder blob URLs) + internal .md link navigation
 *   UI            — wire DOM, sidebar, filter, theme
 *
 * See docs/design-document.md (FR-1..FR-8, DR-MR-01..06).
 */
(function () {
  "use strict";

  // Pure path/URL helpers, published as a global by src/paths.js (unit-tested there).
  const Paths = window.MarkdownRendererPaths;

  // ---------------------------------------------------------------------------
  // FolderAccess
  // ---------------------------------------------------------------------------
  const FolderAccess = (() => {
    const supportsFsApi = typeof window.showDirectoryPicker === "function";

    async function pickViaInput() {
      const input = document.getElementById("fallback-input");
      return new Promise((resolve) => {
        input.value = "";
        const onChange = () => {
          input.removeEventListener("change", onChange);
          resolve(input.files && input.files.length ? input.files : null);
        };
        input.addEventListener("change", onChange);
        input.click();
      });
    }

    // Returns a normalised DirectorySource, or null if the user cancelled.
    async function selectFolder() {
      if (supportsFsApi) {
        try {
          const handle = await window.showDirectoryPicker();
          return { kind: "fsapi", handle, label: handle.name };
        } catch (err) {
          if (err && err.name === "AbortError") return null; // user cancelled
          // Fall through to the fallback if the API throws for any other reason.
        }
      }
      const fileList = await pickViaInput();
      if (!fileList) return null;
      const first = fileList[0].webkitRelativePath || fileList[0].name;
      const label = first.split("/")[0] || "(selected folder)";
      return { kind: "input", fileList, label };
    }

    return { supportsFsApi, selectFolder };
  })();

  // ---------------------------------------------------------------------------
  // Enumeration + lazy folder index
  // ---------------------------------------------------------------------------
  const Enumeration = (() => {
    function makeDescriptor(relativePath, readBlob) {
      return {
        relativePath,
        name: relativePath.split("/").pop(),
        async readText() { return (await readBlob()).text(); },
        readBlob,
      };
    }

    async function walkFsApi(dirHandle, prefix, mdOut) {
      for await (const entry of dirHandle.values()) {
        const path = prefix ? prefix + "/" + entry.name : entry.name;
        if (entry.kind === "file") {
          if (Paths.isMarkdownPath(entry.name)) {
            mdOut.push(makeDescriptor(path, async () => entry.getFile()));
          }
        } else if (entry.kind === "directory") {
          try { await walkFsApi(entry, path, mdOut); }
          catch (_) { /* skip unreadable sub-directory */ }
        }
      }
    }

    // Build the markdown list + a folder index (read any file by resolved path).
    async function build(source) {
      const markdown = [];
      let index;

      if (source.kind === "fsapi") {
        await walkFsApi(source.handle, "", markdown);
        const root = source.handle;
        index = {
          async readBlob(path) {
            const parts = path.split("/").filter(Boolean);
            try {
              let dir = root;
              for (let i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i]);
              const fh = await dir.getFileHandle(parts[parts.length - 1]);
              return await fh.getFile();
            } catch (_) { return null; }
          },
        };
      } else {
        const fileMap = new Map(); // resolvedPath -> File
        for (const file of source.fileList) {
          const path = file.webkitRelativePath || file.name;
          fileMap.set(path, file);
          if (Paths.isMarkdownPath(file.name)) {
            markdown.push(makeDescriptor(path, async () => file));
          }
        }
        index = {
          async readBlob(path) { return fileMap.get(path) || null; },
        };
      }

      // descriptor(path): a renderable descriptor for any file path in the folder.
      index.descriptor = (path) => makeDescriptor(path, () => index.readBlob(path));

      markdown.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
      return { markdown, index };
    }

    return { build };
  })();

  // ---------------------------------------------------------------------------
  // Resolve — path maths + relative resource resolution
  // ---------------------------------------------------------------------------
  const Resolve = (() => {
    const { isExternal, isMarkdownPath, resolvePath } = Paths;

    // Rewrite images (-> blob URLs) and links (internal .md -> navigate) on an
    // INERT fragment (template.content) before it is inserted, so nothing is
    // fetched from a relative URL. Returns object URLs created (to revoke later).
    async function apply(fragment, currentPath, index, onNavigate) {
      const created = [];

      for (const img of fragment.querySelectorAll("img")) {
        const src = img.getAttribute("src") || "";
        if (!src || isExternal(src)) {
          if (src && !/^(blob|data):/i.test(src)) img.removeAttribute("src"); // never fetch remote
          continue;
        }
        const target = resolvePath(currentPath, src);
        const blob = target ? await index.readBlob(target) : null;
        if (blob) {
          const url = URL.createObjectURL(blob);
          created.push(url);
          img.src = url;
        } else {
          img.removeAttribute("src");
          img.alt = (img.alt ? img.alt + " " : "") + "(image not found: " + src + ")";
        }
      }

      for (const a of fragment.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href");
        if (href.startsWith("#")) continue;            // in-page anchor
        if (isExternal(href)) { a.target = "_blank"; a.rel = "noopener noreferrer"; continue; }
        const target = resolvePath(currentPath, href);
        if (target && isMarkdownPath(target)) {
          a.addEventListener("click", (e) => {
            e.preventDefault();
            onNavigate(index.descriptor(target));
          });
        }
      }
      return created;
    }

    return { apply };
  })();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const Render = (() => {
    let liveUrls = []; // object URLs for the currently-displayed document

    function revoke() { liveUrls.forEach(URL.revokeObjectURL); liveUrls = []; }

    async function render(descriptor, container, ctx) {
      revoke();
      let text;
      try {
        text = await descriptor.readText();
      } catch (err) {
        container.innerHTML = "";
        container.appendChild(notice("Could not read file: " + descriptor.relativePath, true));
        return;
      }

      const dirty = window.marked.parse(text);
      const clean = window.DOMPurify.sanitize(dirty);

      // Inert template: images in template.content do not load until inserted.
      const tpl = document.createElement("template");
      tpl.innerHTML = clean;

      tpl.content.querySelectorAll("pre code").forEach((el) => window.hljs.highlightElement(el));
      liveUrls = await Resolve.apply(tpl.content, descriptor.relativePath, ctx.index, ctx.onNavigate);

      container.innerHTML = "";
      container.appendChild(tpl.content);
      container.scrollTop = 0; // FR-3: reset scroll on new document
    }

    return { render, revoke };
  })();

  function notice(message, isError) {
    const div = document.createElement("div");
    div.className = "notice" + (isError ? " notice--error" : "");
    div.textContent = message;
    return div;
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  (function UI() {
    const els = {
      choose:   document.getElementById("choose-folder"),
      theme:    document.getElementById("theme-toggle"),
      path:     document.getElementById("folder-path"),
      filter:   document.getElementById("file-filter"),
      status:   document.getElementById("sidebar-status"),
      list:     document.getElementById("file-list"),
      content:  document.getElementById("content"),
      hljsLight:document.getElementById("hljs-light"),
      hljsDark: document.getElementById("hljs-dark"),
    };

    let state = { descriptors: [], index: null, activePath: null };

    function setStatus(msg) { els.status.textContent = msg; els.status.style.display = msg ? "" : "none"; }

    function renderSidebar() {
      const term = els.filter.value.trim().toLowerCase();
      els.list.innerHTML = "";
      const visible = state.descriptors.filter(
        (d) => !term || d.relativePath.toLowerCase().includes(term)
      );

      if (!state.descriptors.length) { setStatus("No markdown files found in this folder."); return; }
      if (!visible.length) { setStatus("No files match the filter."); return; }
      setStatus("");

      for (const d of visible) {
        const li = document.createElement("li");
        li.className = "file-list__item";
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(d.relativePath === state.activePath));
        li.title = d.relativePath;

        const name = document.createElement("span");
        name.textContent = d.name;
        li.appendChild(name);

        if (d.relativePath.includes("/")) {
          const sub = document.createElement("span");
          sub.className = "file-list__path";
          sub.textContent = d.relativePath.slice(0, d.relativePath.lastIndexOf("/"));
          li.appendChild(sub);
        }

        li.addEventListener("click", () => open(d));
        els.list.appendChild(li);
      }
    }

    async function open(descriptor) {
      state.activePath = descriptor.relativePath;
      renderSidebar();
      await Render.render(descriptor, els.content, {
        index: state.index,
        onNavigate: open,           // internal-link navigation re-enters here
      });
    }

    async function chooseFolder() {
      const source = await FolderAccess.selectFolder();
      if (!source) return;          // cancelled

      els.path.value = source.label + (source.kind === "input" ? "  (fallback picker)" : "");
      setStatus("Reading folder…");
      els.list.innerHTML = "";

      try {
        const { markdown, index } = await Enumeration.build(source);
        state = { descriptors: markdown, index, activePath: null };
        els.filter.disabled = markdown.length === 0;
        renderSidebar();
      } catch (err) {
        setStatus("Could not read this folder.");
        console.error(err);
      }
    }

    function toggleTheme() {
      const dark = document.documentElement.getAttribute("data-theme") !== "dark";
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      els.hljsLight.disabled = dark;
      els.hljsDark.disabled = !dark;
    }

    // Wire events
    els.choose.addEventListener("click", chooseFolder);
    els.theme.addEventListener("click", toggleTheme);
    els.filter.addEventListener("input", renderSidebar);

    // Configure marked once (GitHub-flavoured line breaks off; headings/tables on by default).
    if (window.marked && window.marked.setOptions) {
      window.marked.setOptions({ gfm: true, breaks: false });
    }

    if (!FolderAccess.supportsFsApi) {
      setStatus("This browser uses the folder picker (File System Access API unavailable). Choose a folder to begin.");
    }
  })();
})();
