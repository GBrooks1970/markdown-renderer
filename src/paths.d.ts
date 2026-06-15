/* Type contract for the global published by paths.js (consumed by app.js and tests). */
export interface MarkdownRendererPaths {
  /** True when `href` has a scheme or is protocol-relative (points outside the folder). */
  isExternal(href: string): boolean;
  /** True when `name` ends in .md / .markdown (case-insensitive). */
  isMarkdownPath(name: string): boolean;
  /** Resolve `ref` against the directory of `baseFilePath`; null when `ref` is empty. */
  resolvePath(baseFilePath: string, ref: string): string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var MarkdownRendererPaths: MarkdownRendererPaths;
}
