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
import type { MarkdownRendererPaths } from '../src/paths.js';

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
