# Vendored Libraries

These third-party libraries are committed locally (not loaded from a CDN) so the
page works fully offline and is reproducible — see decision **DR-MR-02** in
[`../docs/design-document.md`](../docs/design-document.md).

| File | Library | Version | Licence | Source |
|------|---------|---------|---------|--------|
| `marked.min.js` | marked | 14.1.4 | MIT | https://cdn.jsdelivr.net/npm/marked@14.1.4/marked.min.js |
| `purify.min.js` | DOMPurify | 3.1.7 | Apache-2.0 / MPL-2.0 | https://cdn.jsdelivr.net/npm/dompurify@3.1.7/dist/purify.min.js |
| `highlight.min.js` | highlight.js | 11.10.0 | BSD-3-Clause | https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/highlight.min.js |
| `highlight-github.min.css` | highlight.js theme (GitHub light) | 11.10.0 | BSD-3-Clause | https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/styles/github.min.css |
| `highlight-github-dark.min.css` | highlight.js theme (GitHub dark) | 11.10.0 | BSD-3-Clause | https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.10.0/styles/github-dark.min.css |

## Updating

Re-download the pinned URLs above (bump the version in the URL and in this table).
Do **not** switch to CDN `<script src>` tags — that would break offline operation.

Licence headers are preserved inside each minified file.
