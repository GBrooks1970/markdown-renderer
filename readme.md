<!--
  AUDIENCE: Engineers and AI agents encountering this repository for the first time.
  PURPOSE:  Project entry point — purpose, prerequisites, quick-start, and links to deeper docs.
  LOCATION: readme.md (project root)
  TEMPLATE: templates/readme.template.md
-->

# Markdown Renderer

**Updated: 2026-06-15**

A general-purpose, self-contained static HTML page that renders local markdown files. Pick a folder, browse its markdown files in a sidebar, and read any of them as formatted, syntax-highlighted HTML in a scrollable pane. It runs entirely client-side with **no build step and no network connection** — open the page in a browser and use it.

This project is currently at the **design stage**. The design document is the authoritative artefact; implementation (`index.html`, `vendor/`) follows once the design is approved.

---

## Project Structure

### Shared Packages

N/A — this is a standalone single-page tool with no shared packages.

### Stacks

- **markdown-renderer** (`./`) — HTML5 + CSS3 + vanilla JavaScript (ES2020), no framework, no server. Entry point is `index.html` (opened directly in a browser).

Layout of the source tree:

- `index.html`, `styles.css`, `app.js` — the shipped static page (no build).
- `src/paths.js` — pure path/URL helpers, published on a global so both the page and the unit tests consume the same code (unit-tested in isolation).
- `vendor/` — locally vendored `marked`, `DOMPurify`, `highlight.js` (so the page works fully offline).
- `sample-docs/` — a demo folder to try the viewer.
- `spec/` — Vitest unit tests; `e2e/` — Playwright browser tests; `scripts/dev-server.mjs` — dependency-free static dev server.

All third-party libraries are **vendored locally** so the page works fully offline. Test tooling is **dev-only** — nothing in the shipped page requires a build.

---

## Installation and Build

### Prerequisites

- **To use the page:** a modern web browser. No Node, no package manager, no build tooling.
  - **Best experience:** Chromium-based (Chrome, Edge, Opera) — uses the File System Access API.
  - **Supported via fallback:** Firefox, Safari — use the `<input webkitdirectory>` folder picker.
- **To run the tests:** Node 18+ and `npm` (dev-only; the page itself needs neither).

### Initial Setup

There is no build for the page itself:

```
# Clone, then open the page:
#   double-click  markdown-renderer/index.html
# or serve it on localhost (recommended — the File System Access API needs a secure context):
cd markdown-renderer
npm run dev          # static dev server on http://127.0.0.1:4180

# For the tests only:
npm install
npx playwright install chromium
```

---

## Quick Start

### markdown-renderer

```
1. Open index.html in a browser (or serve it on localhost).
2. Click "Choose folder" and select a folder containing markdown files.
3. The sidebar lists every .md / .markdown file found (including sub-folders).
4. Click a file to render it in the scrollable display pane.
5. Use the filter box to narrow the file list.
```

---

## Testing

Test tooling matches the portfolio convention — **Vitest** for unit tests and **Playwright** for browser end-to-end tests — and is dev-only.

```
npm run typecheck    # tsc against the specs
npm test             # Vitest unit tests (spec/)
npm run test:e2e     # Playwright E2E tests (e2e/) — auto-starts the dev server
npm run verify       # typecheck + unit + e2e (the full gate)
```

- **Unit (`spec/`)** — the pure path/URL helpers in `src/paths.js` (resolution of `.`/`..`, query/hash stripping, markdown/external classification).
- **E2E (`e2e/`)** — the real browser flow against `sample-docs/`: listing/sorting, filtering, rendering with code highlighting and tables, relative images resolving to `blob:` URLs, internal-link navigation, and external links opening in a new tab. The native File System Access API dialog cannot be automated, so the E2E suite drives the `webkitdirectory` fallback path (same pipeline).

---

## Architecture Overview

A single page hosts a two-pane layout (sidebar + display pane) driven by three small vanilla-JS modules:

- **Folder Access Module** — obtains a directory via the File System Access API, with a `webkitdirectory` fallback.
- **Enumeration Module** — recursively collects and sorts markdown file descriptors.
- **Render Module** — parses markdown (`marked`), sanitises the output (`DOMPurify`), and highlights code (`highlight.js`) before display.
- **Resource Resolution Module** — resolves relative images (shown via same-folder `blob:` URLs) and internal `.md` links (navigate within the viewer) against the picked folder; external links open in a new tab.

All generated HTML is sanitised before insertion to prevent XSS, and only same-folder `blob:` resources are ever injected. Tests use **Vitest** (unit) and **Playwright** (E2E) as dev-only tooling — the shipped page stays build-free. See [`docs/design-document.md`](docs/design-document.md) for the complete design, decisions, and rationale.

---

## Documentation

| Document | Location | Purpose |
|---|---|---|
| Design Document | `docs/design-document.md` | Full design, requirements, decisions (DR-MR-*), and alternatives |
| Project README | `readme.md` | This entry point |

---

## Common Gotchas

### Typing a folder path does nothing / there is no path text box that reads disk

**Cause:** Browsers forbid a static page from reading an arbitrary filesystem path supplied as text (security sandbox).
**Solution:** Use the "Choose folder" picker. The path text box is a read-only display of the picked folder plus a quick filter, not a path entry field. A true typed path would require a local server (out of scope).

### Folder selection / sidebar does not appear on Firefox or Safari

**Cause:** The File System Access API is Chromium-only.
**Solution:** The page automatically falls back to the `<input webkitdirectory>` picker on those browsers; folder browsing still works.

### Markdown renders as raw text or libraries fail to load

**Cause:** Vendored library files missing or moved.
**Solution:** Ensure `vendor/marked.min.js`, `vendor/purify.min.js`, and `vendor/highlight.min.js` are present (vendored, not CDN, by design).

### File System Access API not available when opened via `file://`

**Cause:** The API needs a secure context.
**Solution:** Serve the page from `localhost` (e.g. `npx serve`), or rely on the `file://` fallback picker.

---

## Contributing

- Record any structural change as a `DR-MR-*` decision and reflect it in `docs/design-document.md`.
- Keep the page static: no build step, no runtime network, libraries vendored.
- Sanitise all rendered HTML — never insert parsed markdown without `DOMPurify`.
