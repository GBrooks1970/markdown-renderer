/* Type contract for the global published by paths.js (consumed by app.js and tests). */

/** Minimal shape buildTree needs; the full descriptor is carried through untouched. */
export interface TreeDescriptor {
  relativePath: string;
}

export interface TreeDir {
  kind: 'dir';
  name: string;
  /** Folder path relative to the picked folder, no trailing slash ('' for the root). */
  path: string;
  children: TreeNode[];
}

export interface TreeFile {
  kind: 'file';
  name: string;
  /** Normalised file path relative to the picked folder. */
  path: string;
  descriptor: TreeDescriptor;
}

export type TreeNode = TreeDir | TreeFile;

export interface RestoredTreeState {
  /** Surviving expanded folder paths, plus the active file's ancestors. */
  expanded: string[];
  /** The previous active path if the file still exists, else null. */
  activePath: string | null;
}

export interface MarkdownRendererPaths {
  /** True when `href` has a scheme or is protocol-relative (points outside the folder). */
  isExternal(href: string): boolean;
  /** True when `name` ends in .md / .markdown (case-insensitive). */
  isMarkdownPath(name: string): boolean;
  /** Resolve `ref` against the directory of `baseFilePath`; null when `ref` is empty. */
  resolvePath(baseFilePath: string, ref: string): string | null;
  /** Nest a flat descriptor list into a tree: dirs first, alphabetical, no empty folders (FR-10). */
  buildTree(descriptors: TreeDescriptor[]): TreeDir;
  /** Folder paths above `relativePath`, outermost first (none for root-level files). */
  ancestorsOf(relativePath: string): string[];
  /** Reconcile expanded/active state with a freshly built tree after refresh (FR-9/FR-11). */
  restoreTreeState(root: TreeDir, expandedPaths: Iterable<string> & { forEach(cb: (p: string) => void): void }, activePath: string | null): RestoredTreeState;
}

declare global {
  // eslint-disable-next-line no-var
  var MarkdownRendererPaths: MarkdownRendererPaths;
}
