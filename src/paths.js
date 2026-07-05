/* Pure path/URL helpers — no DOM, no I/O, no dependencies.
 *
 * Single responsibility (SOLID): the small, bug-prone decisions about how a
 * markdown link/image reference resolves against the picked folder, and how a
 * filename/URL is classified. Kept separate from app.js so it can be unit
 * tested in isolation (see spec/paths.spec.ts).
 *
 * Consumed identically by both runtimes via the global object:
 *   - browser : window.MarkdownRendererPaths   (classic <script>, file:// safe)
 *   - tests   : globalThis.MarkdownRendererPaths (side-effect import in Vitest)
 *
 * Therefore: NO import/export here. A bare assignment to globalThis keeps the
 * file loadable as a classic script (so the page still runs from file://).
 */
(function (root) {
  "use strict";

  /** True when `href` points outside the folder (has a scheme, or is protocol-relative). */
  function isExternal(href) {
    return /^[a-z][a-z0-9+.\-]*:/i.test(href) || href.indexOf("//") === 0;
  }

  /** True when `name` looks like a markdown file. */
  function isMarkdownPath(name) {
    return /\.(md|markdown)$/i.test(name);
  }

  /**
   * Resolve `ref` relative to the directory of `baseFilePath`, POSIX-style.
   * Strips any query/hash, decodes percent-encoding, and collapses `.` / `..`.
   * Returns the resolved path, or null when `ref` is empty.
   */
  function resolvePath(baseFilePath, ref) {
    var clean = String(ref).split("#")[0].split("?")[0];
    try { clean = decodeURIComponent(clean); } catch (_) { /* keep raw */ }
    if (!clean) return null;

    var stack = clean.charAt(0) === "/" ? [] : String(baseFilePath).split("/").slice(0, -1);
    var parts = clean.split("/");
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part === "" || part === ".") continue;
      if (part === "..") stack.pop();
      else stack.push(part);
    }
    return stack.join("/");
  }

  /** Normalise a relative path: `\` -> `/`, strip leading `./` prefixes. */
  function normaliseRelativePath(relativePath) {
    var s = String(relativePath).replace(/\\/g, "/");
    while (s.indexOf("./") === 0) s = s.slice(2);
    return s;
  }

  /** Folder paths above `relativePath`, outermost first (none for root-level files). */
  function ancestorsOf(relativePath) {
    var segments = normaliseRelativePath(relativePath).split("/").filter(Boolean);
    var out = [];
    var path = "";
    for (var i = 0; i < segments.length - 1; i++) {
      path = path ? path + "/" + segments[i] : segments[i];
      out.push(path);
    }
    return out;
  }

  /* Directories before files; case-insensitive alphabetical within each group,
   * with a codepoint tiebreak so ordering is deterministic across locales. */
  function compareNodes(a, b) {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    var al = a.name.toLowerCase();
    var bl = b.name.toLowerCase();
    if (al !== bl) return al < bl ? -1 : 1;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  }

  function sortChildren(dir) {
    dir.children.sort(compareNodes);
    for (var i = 0; i < dir.children.length; i++) {
      if (dir.children[i].kind === "dir") sortChildren(dir.children[i]);
    }
  }

  /**
   * Build a nested tree from a flat descriptor list (each item needs a
   * `relativePath`; the item itself is carried through as `descriptor`).
   * Directory nodes exist only where a markdown file requires them, so empty
   * folders cannot appear by construction (FR-10, DR-MR-09).
   * Returns the root: { kind: 'dir', name: '', path: '', children: [...] }.
   */
  function buildTree(descriptors) {
    var root = { kind: "dir", name: "", path: "", children: [] };
    var dirNodes = { "": root }; // path -> node, memoised
    for (var i = 0; i < descriptors.length; i++) {
      var d = descriptors[i];
      var segments = normaliseRelativePath(d.relativePath).split("/").filter(Boolean);
      var node = root;
      var path = "";
      for (var j = 0; j < segments.length - 1; j++) {
        path = path ? path + "/" + segments[j] : segments[j];
        var dir = dirNodes[path];
        if (!dir) {
          dir = { kind: "dir", name: segments[j], path: path, children: [] };
          dirNodes[path] = dir;
          node.children.push(dir);
        }
        node = dir;
      }
      node.children.push({
        kind: "file",
        name: segments[segments.length - 1],
        path: segments.join("/"),
        descriptor: d,
      });
    }
    sortChildren(root);
    return root;
  }

  /**
   * Reconcile sidebar state with a freshly built tree after a refresh (FR-9):
   * expanded folder paths that no longer exist are dropped; `activePath` is
   * kept only if the file still exists, and its ancestors are added to the
   * expanded set so the restored selection is visible (FR-11 reveal).
   */
  function restoreTreeState(root, expandedPaths, activePath) {
    var dirs = {};
    var files = {};
    (function collect(dir) {
      for (var i = 0; i < dir.children.length; i++) {
        var child = dir.children[i];
        if (child.kind === "dir") { dirs[child.path] = true; collect(child); }
        else files[child.path] = true;
      }
    })(root);

    var expanded = [];
    expandedPaths.forEach(function (p) {
      if (dirs[p] && expanded.indexOf(p) < 0) expanded.push(p);
    });

    var active = activePath && files[normaliseRelativePath(activePath)] ? activePath : null;
    if (active) {
      var ancestors = ancestorsOf(active);
      for (var i = 0; i < ancestors.length; i++) {
        if (expanded.indexOf(ancestors[i]) < 0) expanded.push(ancestors[i]);
      }
    }
    return { expanded: expanded, activePath: active };
  }

  root.MarkdownRendererPaths = {
    isExternal, isMarkdownPath, resolvePath,
    buildTree, ancestorsOf, restoreTreeState,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
