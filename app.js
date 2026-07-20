/* Markdown Renderer — application logic (vanilla JS, classic script so it runs from file://).
 *
 * Modules (IIFE-scoped, no build step):
 *   FolderAccess  — acquire a directory via File System Access API or <input webkitdirectory> fallback
 *   Enumeration   — collect + sort markdown descriptors; expose a lazy folder index for any file
 *   Render        — markdown -> sanitised HTML -> syntax highlight
 *   Resolve       — relative images (same-folder blob URLs) + internal .md link navigation
 *   UI            — wire DOM, sidebar tree + filter, refresh, theme
 *
 * See docs/design-document.md (FR-1..FR-8, DR-MR-01..07) and
 * docs/design-document-folder-navigation.md (FR-9..FR-11, DR-MR-08..11).
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
          const raw = file.webkitRelativePath || file.name;
          // webkitRelativePath is prefixed with the picked folder's own name;
          // strip it so both backends yield the same folder-relative paths
          // (the fsapi walk starts inside the picked folder).
          const path = raw.includes("/") ? raw.slice(raw.indexOf("/") + 1) : raw;
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
      refresh:  document.getElementById("refresh-folder"),
      theme:    document.getElementById("theme-toggle"),
      path:     document.getElementById("folder-path"),
      filter:   document.getElementById("file-filter"),
      status:   document.getElementById("sidebar-status"),
      list:     document.getElementById("file-list"),
      content:  document.getElementById("content"),
      hljsLight:document.getElementById("hljs-light"),
      hljsDark: document.getElementById("hljs-dark"),
    };

    // expanded (Set of folder paths) is the single source of truth for
    // drilldown state; <details> toggle events write it, renders read it.
    let state = { source: null, descriptors: [], index: null, activePath: null, expanded: new Set() };

    function setStatus(msg) { els.status.textContent = msg; els.status.style.display = msg ? "" : "none"; }

    function setPathDisplay(source) {
      els.path.value = source.label + (source.kind === "input" ? "  (fallback picker)" : "");
    }

    function fileItem(descriptor, showPath) {
      const li = document.createElement("li");

      // A real <button>, not a clickable <li> — keyboard-focusable and
      // Enter/Space-activatable for free, per the original folder-navigation
      // design (docs/design-document-folder-navigation.md).
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "file-list__item" + (descriptor.relativePath === state.activePath ? " is-active" : "");
      btn.title = descriptor.relativePath;

      const name = document.createElement("span");
      name.textContent = descriptor.name;
      btn.appendChild(name);

      if (showPath && descriptor.relativePath.includes("/")) {
        const sub = document.createElement("span");
        sub.className = "file-list__path";
        sub.textContent = descriptor.relativePath.slice(0, descriptor.relativePath.lastIndexOf("/"));
        btn.appendChild(sub);
      }

      btn.addEventListener("click", () => open(descriptor));
      li.appendChild(btn);
      return li;
    }

    // FR-10/FR-11: folders as <details>/<summary>, files as plain rows.
    function treeNode(node) {
      if (node.kind === "file") return fileItem(node.descriptor, false);

      const li = document.createElement("li");
      const details = document.createElement("details");
      details.className = "tree-dir";
      details.dataset.path = node.path;
      details.open = state.expanded.has(node.path);

      const summary = document.createElement("summary");
      summary.className = "tree-dir__label";
      summary.textContent = node.name;
      summary.title = node.path;
      details.appendChild(summary);

      const ul = document.createElement("ul");
      ul.className = "tree-dir__children";
      for (const child of node.children) ul.appendChild(treeNode(child));
      details.appendChild(ul);

      details.addEventListener("toggle", () => {
        if (details.open) state.expanded.add(node.path);
        else state.expanded.delete(node.path);
      });

      li.appendChild(details);
      return li;
    }

    function renderSidebar() {
      const term = els.filter.value.trim().toLowerCase();
      els.list.innerHTML = "";

      if (!state.descriptors.length) {
        if (state.source) setStatus("No markdown files found in this folder.");
        return;
      }

      // DR-MR-11: while filtering, a flat matched list; otherwise the tree.
      if (term) {
        const visible = state.descriptors.filter((d) => d.relativePath.toLowerCase().includes(term));
        if (!visible.length) { setStatus("No files match the filter."); return; }
        setStatus("");
        for (const d of visible) els.list.appendChild(fileItem(d, true));
      } else {
        setStatus("");
        const root = Paths.buildTree(state.descriptors);
        for (const child of root.children) els.list.appendChild(treeNode(child));
      }

      const active = els.list.querySelector(".is-active");
      if (active) active.scrollIntoView({ block: "nearest" });
    }

    async function open(descriptor) {
      state.activePath = descriptor.relativePath;
      // FR-11: reveal the active file — expand its ancestors (matters when it
      // was reached via an internal link into a collapsed folder).
      for (const ancestor of Paths.ancestorsOf(descriptor.relativePath)) state.expanded.add(ancestor);
      renderSidebar();
      await Render.render(descriptor, els.content, {
        index: state.index,
        onNavigate: open,           // internal-link navigation re-enters here
      });
    }

    async function adoptSource(source, restoreFrom) {
      setPathDisplay(source);
      setStatus("Reading folder…");

      let markdown, index;
      try {
        ({ markdown, index } = await Enumeration.build(source));
      } catch (err) {
        setStatus("Could not read this folder — it may have been moved or deleted. Choose it again.");
        console.error(err);
        return;
      }

      const prevActive = restoreFrom ? restoreFrom.activePath : null;
      const restored = Paths.restoreTreeState(
        Paths.buildTree(markdown),
        restoreFrom ? restoreFrom.expanded : new Set(),
        prevActive
      );

      state = {
        source,
        descriptors: markdown,
        index,
        activePath: restored.activePath,
        expanded: new Set(restored.expanded),
      };
      els.filter.disabled = markdown.length === 0;
      els.refresh.disabled = false;
      renderSidebar();

      // FR-9: re-render the active document from its FRESH descriptor, or say
      // clearly that it has gone; stale object URLs are revoked either way.
      if (restored.activePath) {
        const active = markdown.find((d) => d.relativePath === restored.activePath);
        await Render.render(active, els.content, { index, onNavigate: open });
      } else if (prevActive) {
        Render.revoke();
        els.content.innerHTML = "";
        els.content.appendChild(notice(
          "The open file (" + prevActive + ") no longer exists in this folder. Choose another file.", false));
      }
    }

    async function chooseFolder() {
      const source = await FolderAccess.selectFolder();
      if (!source) return;          // cancelled
      await adoptSource(source, null);
    }

    // FR-9 / DR-MR-08: silent re-walk on the FS Access API path; the fallback
    // FileList is a one-time snapshot, so refresh routes through the picker.
    async function refreshFolder() {
      if (!state.source) return;

      let next = state.source;
      if (next.kind === "fsapi") {
        try {
          const handle = next.handle;
          const query = handle.queryPermission ? await handle.queryPermission({ mode: "read" }) : "granted";
          if (query !== "granted") {
            const granted = handle.requestPermission ? await handle.requestPermission({ mode: "read" }) : "denied";
            if (granted !== "granted") next = await FolderAccess.selectFolder(); // last resort: re-pick
          }
        } catch (_) {
          next = await FolderAccess.selectFolder();
        }
      } else {
        setStatus("This browser's picker takes a one-time snapshot — choose the folder again to refresh it.");
        next = await FolderAccess.selectFolder();
      }
      if (!next) return;            // cancelled — current state stays untouched

      await adoptSource(next, state);
    }

    function toggleTheme() {
      const dark = document.documentElement.getAttribute("data-theme") !== "dark";
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
      els.hljsLight.disabled = dark;
      els.hljsDark.disabled = !dark;
    }

    // Wire events
    els.choose.addEventListener("click", chooseFolder);
    els.refresh.addEventListener("click", refreshFolder);
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
