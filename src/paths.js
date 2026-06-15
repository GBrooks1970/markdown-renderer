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

  root.MarkdownRendererPaths = { isExternal, isMarkdownPath, resolvePath };
})(typeof globalThis !== "undefined" ? globalThis : this);
