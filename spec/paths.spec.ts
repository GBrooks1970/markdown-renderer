/**
 * Responsibility: prove the pure path/URL helpers in src/paths.js at the bottom
 * of the test pyramid — no DOM, no I/O.
 *
 * Pedagogical decision: paths.js publishes its API on the global object (so the
 * browser can consume it as a classic script without a build). The spec mirrors
 * that exactly: a side-effect import runs the file, then we read the global.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import '../src/paths.js';
import type { MarkdownRendererPaths, TreeDir, TreeNode } from '../src/paths.js';

let paths: MarkdownRendererPaths;

beforeAll(() => {
  paths = (globalThis as unknown as { MarkdownRendererPaths: MarkdownRendererPaths }).MarkdownRendererPaths;
});

describe('isMarkdownPath', () => {
  it('accepts .md and .markdown, case-insensitively', () => {
    expect(paths.isMarkdownPath('readme.md')).toBe(true);
    expect(paths.isMarkdownPath('GUIDE.MARKDOWN')).toBe(true);
    expect(paths.isMarkdownPath('Notes.Md')).toBe(true);
  });

  it('rejects non-markdown names', () => {
    expect(paths.isMarkdownPath('image.png')).toBe(false);
    expect(paths.isMarkdownPath('notes.txt')).toBe(false);
    expect(paths.isMarkdownPath('mdfile')).toBe(false); // no extension
    expect(paths.isMarkdownPath('a.md.bak')).toBe(false);
  });
});

describe('isExternal', () => {
  it('treats scheme and protocol-relative URLs as external', () => {
    expect(paths.isExternal('https://example.com')).toBe(true);
    expect(paths.isExternal('http://example.com')).toBe(true);
    expect(paths.isExternal('mailto:a@b.com')).toBe(true);
    expect(paths.isExternal('//cdn.example.com/x.js')).toBe(true);
  });

  it('treats relative references as internal', () => {
    expect(paths.isExternal('guide.md')).toBe(false);
    expect(paths.isExternal('./assets/x.png')).toBe(false);
    expect(paths.isExternal('../sibling/doc.md')).toBe(false);
    expect(paths.isExternal('images/photo.png')).toBe(false);
  });
});

describe('resolvePath', () => {
  it('resolves a sibling reference against the file directory', () => {
    expect(paths.resolvePath('docs/index.md', 'guide.md')).toBe('docs/guide.md');
  });

  it('resolves a nested reference', () => {
    expect(paths.resolvePath('docs/guide.md', 'assets/diagram.svg')).toBe('docs/assets/diagram.svg');
  });

  it('collapses "." and ".." segments', () => {
    expect(paths.resolvePath('docs/sub/page.md', './x.png')).toBe('docs/sub/x.png');
    expect(paths.resolvePath('docs/sub/page.md', '../assets/x.png')).toBe('docs/assets/x.png');
    expect(paths.resolvePath('docs/sub/page.md', '../../top.png')).toBe('top.png');
  });

  it('strips query strings and hash fragments', () => {
    expect(paths.resolvePath('a/b.md', 'c.png?v=2')).toBe('a/c.png');
    expect(paths.resolvePath('a/b.md', 'c.md#section')).toBe('a/c.md');
  });

  it('decodes percent-encoded references', () => {
    expect(paths.resolvePath('a/b.md', 'My%20File.md')).toBe('a/My File.md');
  });

  it('treats a leading slash as folder-root-relative', () => {
    expect(paths.resolvePath('docs/sub/page.md', '/top/x.png')).toBe('top/x.png');
  });

  it('returns null for an empty reference', () => {
    expect(paths.resolvePath('a/b.md', '')).toBeNull();
    expect(paths.resolvePath('a/b.md', '#only-anchor')).toBeNull();
  });
});

/** Shorthand: a descriptor as produced by the Enumeration module. */
const d = (relativePath: string) => ({ relativePath });

/** Readable projection of a node list for order assertions. */
const shape = (nodes: TreeNode[]) => nodes.map((n) => `${n.kind}:${n.name}`);

describe('buildTree', () => {
  it('nests by folder with dirs before files, alphabetical within each group', () => {
    const tree = paths.buildTree([
      d('readme.md'), d('docs/b.md'), d('docs/a.md'), d('docs/img/x.md'),
    ]);
    expect(shape(tree.children)).toEqual(['dir:docs', 'file:readme.md']);
    const docs = tree.children[0] as TreeDir;
    expect(docs.path).toBe('docs');
    expect(shape(docs.children)).toEqual(['dir:img', 'file:a.md', 'file:b.md']);
  });

  it('handles root-level files only', () => {
    const tree = paths.buildTree([d('b.md'), d('a.md')]);
    expect(shape(tree.children)).toEqual(['file:a.md', 'file:b.md']);
  });

  it('normalises backslash separators and "./" prefixes', () => {
    const tree = paths.buildTree([d('docs\\sub\\x.md'), d('./docs/y.md')]);
    const docs = tree.children[0] as TreeDir;
    expect(docs.name).toBe('docs');
    expect(shape(docs.children)).toEqual(['dir:sub', 'file:y.md']);
    expect((docs.children[0] as TreeDir).children[0].path).toBe('docs/sub/x.md');
  });

  it('keeps a folder and a file sharing a name as distinct siblings, dir first', () => {
    const tree = paths.buildTree([d('docs.md'), d('docs/inner.md')]);
    expect(shape(tree.children)).toEqual(['dir:docs', 'file:docs.md']);
  });

  it('sorts case-insensitively with a deterministic tiebreak', () => {
    const tree = paths.buildTree([d('Zeta.md'), d('alpha.md'), d('Alpha.md')]);
    expect(tree.children.map((n) => n.name)).toEqual(['Alpha.md', 'alpha.md', 'Zeta.md']);
  });

  it('returns an empty root for no descriptors — and never phantom folders', () => {
    expect(paths.buildTree([]).children).toEqual([]);
  });

  it('carries the original descriptor through untouched', () => {
    const input = { relativePath: 'docs/a.md', extra: 42 };
    const tree = paths.buildTree([input]);
    const file = (tree.children[0] as TreeDir).children[0];
    expect(file.kind).toBe('file');
    expect((file as { descriptor: unknown }).descriptor).toBe(input);
  });
});

describe('ancestorsOf', () => {
  it('lists folder paths outermost first', () => {
    expect(paths.ancestorsOf('a/b/c/file.md')).toEqual(['a', 'a/b', 'a/b/c']);
  });

  it('is empty for a root-level file', () => {
    expect(paths.ancestorsOf('file.md')).toEqual([]);
  });
});

describe('restoreTreeState', () => {
  const tree = () => paths.buildTree([d('docs/a.md'), d('docs/img/x.md'), d('root.md')]);

  it('keeps surviving expanded folders and drops vanished ones', () => {
    const restored = paths.restoreTreeState(tree(), new Set(['docs', 'gone/away']), null);
    expect(restored.expanded).toEqual(['docs']);
    expect(restored.activePath).toBeNull();
  });

  it('keeps the active file when it still exists and reveals its ancestors', () => {
    const restored = paths.restoreTreeState(tree(), new Set<string>(), 'docs/img/x.md');
    expect(restored.activePath).toBe('docs/img/x.md');
    expect(restored.expanded).toEqual(['docs', 'docs/img']);
  });

  it('clears the active file when it no longer exists', () => {
    const restored = paths.restoreTreeState(tree(), new Set(['docs']), 'docs/deleted.md');
    expect(restored.activePath).toBeNull();
    expect(restored.expanded).toEqual(['docs']);
  });
});
