# Third-party notices

The root [Apache License 2.0](LICENSE) applies to the original Markdown Renderer project
code and documentation. It does not replace the licences of the third-party runtime libraries
committed under `vendor/`.

## Vendored runtime libraries

| Library | Version | Distributed files | Upstream terms and bundled text |
|---|---:|---|---|
| [Marked](https://github.com/markedjs/marked/tree/v14.1.4) | 14.1.4 | `vendor/marked.min.js` | MIT; the upstream file also preserves the original Markdown copyright and BSD-style terms. See [complete licence information](vendor/licenses/marked-14.1.4-LICENSE.md). |
| [DOMPurify](https://github.com/cure53/DOMPurify/tree/3.1.7) | 3.1.7 | `vendor/purify.min.js` | `Apache-2.0 OR MPL-2.0`. See the [complete dual-licence file](vendor/licenses/dompurify-3.1.7-LICENSE.txt), containing both full alternatives. |
| [highlight.js](https://github.com/highlightjs/highlight.js/tree/11.10.0) | 11.10.0 | `vendor/highlight.min.js`, `vendor/highlight-github.min.css`, `vendor/highlight-github-dark.min.css` | BSD-3-Clause. See the [complete licence](vendor/licenses/highlight.js-11.10.0-LICENSE.txt). |

Copyright, attribution, and licence headers already present in the minified JavaScript and CSS
files are retained. This licensing change does not modify those runtime assets.

The bundled licence files come from the corresponding upstream release tags and were verified
against the packages served by the exact pinned CDN sources recorded in
`vendor/vendored-libraries.md`.

## Development dependencies

Packages installed by npm are test and development tooling rather than part of the static runtime
distribution. They retain their own licence terms, as recorded in their packages and the lockfile.
