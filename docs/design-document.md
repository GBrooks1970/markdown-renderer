# Markdown Renderer — Design Document

**Version:** v0.4
**Date:** 2026-07-20T00:00:00Z
**Author:** Gary Brooks
**Reviewer:** AI assistant (CLAUDE Opus 4.8)
**Status:** Implemented

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Analysis](#2-problem-analysis)
3. [Requirements](#3-requirements)
4. [Design Overview](#4-design-overview)
5. [Detailed Design](#5-detailed-design)
6. [Implementation Plan](#6-implementation-plan)
7. [Refactoring Strategy](#7-refactoring-strategy)
8. [Testing Strategy](#8-testing-strategy)
9. [Migration Path](#9-migration-path)
10. [Alternatives Considered](#10-alternatives-considered)
11. [Open Questions](#11-open-questions)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

### Purpose
A general-purpose, self-contained static HTML page that lets a user select a local folder, browse the markdown files inside it via a sidebar, and render a chosen file as formatted HTML in a scrollable display area. It requires no build step, no server, and no network connection at runtime — open the single HTML file in a browser and use it.

### Scope
**In Scope:**
- Folder selection via the browser's native directory picker (File System Access API, with an `<input webkitdirectory>` fallback).
- A read-only **path/name display** text box plus a quick **filter** field in the sidebar.
- A scrollable sidebar listing every `.md` / `.markdown` file found (including those in sub-folders, shown with relative paths).
- A scrollable main pane rendering the selected file's markdown to sanitised HTML.
- Code-block syntax highlighting.
- **Resolution of relative image references and internal markdown links** against the picked folder (Phase 3): relative images display via blob URLs; internal `.md` links navigate within the viewer.
- Graceful handling of unsupported browsers, empty folders, and folders with no markdown.

**Out of Scope:**
- Editing or saving markdown (read-only viewer).
- A literal "type any absolute path" text box that reads the filesystem (impossible in a static page — see §2 and §10).
- Live file-watching / auto-refresh on disk changes.
- Rendering remote markdown via URL.
- Resolving **remote/absolute** image and link references (only same-folder `blob:` resources are injected; external links open in a new tab).

### Key Decisions
1. **Picker + path-display, not a literal typed path** (DR-MR-01) — browser sandboxing forbids a static page reading an arbitrary typed filesystem path; the native picker is the only secure mechanism. The requested "text box for the folder path" is delivered as a read-only display of the picked folder plus a filter box.
2. **Vendored libraries, not CDN** (DR-MR-02) — `marked`, `DOMPurify`, and `highlight.js` are committed under `vendor/` so the page works fully offline and is reproducible/auditable for a portfolio reviewer.
3. **Mandatory output sanitisation** (DR-MR-03) — all generated HTML is passed through DOMPurify before insertion to prevent XSS from untrusted markdown.
4. **Vanilla JS, no framework** (DR-MR-04) — keeps the page genuinely static, dependency-light, and easy to inspect.
5. **Resolve relative resources via same-folder blob URLs** (DR-MR-05) — relative images and internal `.md` links are resolved against the picked folder using `blob:` URLs only; remote/absolute resources are blocked and external links open in a new tab.
6. **Vitest + Playwright for tests, dev-only** (DR-MR-06) — matches portfolio convention (`hand-baked-screenplay-pattern` uses Vitest; `calculator`/`magento` use Playwright); test tooling never ships, so the runtime artefact stays build-free.
7. **Pure helpers extracted to `src/paths.js`** (DR-MR-07) — the bug-prone, DOM-free path/URL logic is isolated into one module published on a global, so it is unit-testable in Node while the page still loads it as a classic script (file://-safe). SOLID: separates pure logic from DOM wiring.

### Success Criteria
- The page loads and is fully usable with **no build step and no network access**.
- Selecting a folder populates the sidebar with all markdown files within it.
- Selecting a sidebar entry renders that file as formatted HTML in the main pane.
- The sidebar and the main pane scroll **independently**.
- Rendered output is sanitised (no script execution from file contents).
- On an unsupported browser the page shows a clear message and the fallback path still works.

---

## 2. Problem Analysis

### Current State
There is no lightweight, zero-dependency way in this portfolio to eyeball a folder full of markdown files (design docs, handovers, backlogs) with proper formatting without either committing them to a renderer like GitHub or spinning up a doc toolchain. Existing options are heavyweight (static-site generators) or online-only.

**Current Architecture (if applicable):**
```
N/A — greenfield. No existing implementation to replace.
```

**Pain Points:**
1. **No offline viewer** — reading raw `.md` in a text editor loses tables, headings, and code formatting.
2. **Toolchain overhead** — static-site generators require Node/build steps to preview a handful of files.
3. **Online dependency** — pasting into web renderers needs internet and leaks content to a third party.

### Root Cause Analysis
Markdown is plain text by design; viewing it *formatted* needs a parser plus a host to run it. The friction comes from every existing host either being online, requiring a build, or being a full application.

**Contributing Factors:**
- Browsers do not render `.md` natively.
- Secure browsers forbid arbitrary local filesystem reads, so the "obvious" approach (type a path, read the folder) is blocked.
- Portfolio context favours a small, inspectable artefact over a framework.

### Constraints and Assumptions

**Technical Constraints:**
- **Browser sandbox:** a static page cannot read a filesystem path supplied as text; folder access must come from a user-gesture picker.
- **File System Access API** (`showDirectoryPicker`) is Chromium-only (Chrome/Edge/Opera) and needs a secure context (`https://` or `localhost`); it is not available on Firefox/Safari and is unreliable from `file://`.
- **`<input type="file" webkitdirectory>`** works across all major browsers and from `file://`, but yields a one-time snapshot rather than a live handle.
- Must run with **no build tooling** and **no runtime network**.

**Business Constraints:**
- Portfolio deliverable — clarity, honesty about limitations, and inspectability matter more than feature breadth.
- Single-developer effort; small scope.

**Assumptions:**
- Users open the page in a reasonably modern browser (last ~2 years).
- Folders contain a manageable number of markdown files (tens to low hundreds), each of modest size.
- Users accept selecting a folder via a dialog rather than typing a raw path.

### Stakeholders
| Stakeholder | Role | Interest | Impact Level |
|-------------|------|----------|--------------|
| Gary Brooks | Author / portfolio owner | A clean, honest, working artefact | High |
| Portfolio reviewers | Readers / evaluators | Inspectable code, offline operation | Medium |
| Future contributors | Maintainers | Easy to extend, well-documented decisions | Low |

---

## 3. Requirements

### Functional Requirements

**FR-1: Folder selection**
- **Description:** The user can choose a local folder whose markdown files will be listed.
- **User Story:** As a reader, I want to pick a folder so that I can browse its markdown files.
- **Acceptance Criteria:**
  - Given the page is open
  - When the user activates "Choose folder" and selects a directory
  - Then the chosen folder's name/relative path is shown in the read-only path display, and the sidebar is populated.
- **Priority:** Must Have

**FR-2: Markdown file listing**
- **Description:** The sidebar lists every `.md` / `.markdown` file within the selected folder, including sub-folders, shown with relative paths and sorted alphabetically.
- **User Story:** As a reader, I want to see all available markdown files so that I can choose one.
- **Acceptance Criteria:**
  - Given a folder has been selected
  - When enumeration completes
  - Then all markdown files appear as a scrollable list; non-markdown files are excluded.
- **Priority:** Must Have

**FR-3: Render selected file**
- **Description:** Selecting a file renders its markdown as sanitised, formatted HTML in the main pane.
- **User Story:** As a reader, I want to click a file so that I can read it formatted.
- **Acceptance Criteria:**
  - Given the sidebar is populated
  - When the user clicks a file entry
  - Then its contents are parsed, sanitised, and displayed; the entry is highlighted as active; the main pane scrolls to the top.
- **Priority:** Must Have

**FR-4: Independent scrolling**
- **Description:** The sidebar and main pane scroll independently.
- **User Story:** As a reader, I want the document to scroll without losing the file list.
- **Acceptance Criteria:**
  - Given a long document is rendered
  - When the user scrolls the main pane
  - Then the sidebar remains in place and is independently scrollable.
- **Priority:** Must Have

**FR-5: Quick filter**
- **Description:** A filter input narrows the sidebar list by filename substring.
- **User Story:** As a reader with many files, I want to filter the list so that I can find a file quickly.
- **Acceptance Criteria:**
  - Given a populated sidebar
  - When the user types in the filter box
  - Then only matching entries remain visible.
- **Priority:** Should Have

**FR-6: Code syntax highlighting**
- **Description:** Fenced code blocks are syntax-highlighted.
- **User Story:** As a reader, I want highlighted code so that technical docs are readable.
- **Acceptance Criteria:**
  - Given a document contains a fenced code block with a language hint
  - When it renders
  - Then the code is highlighted.
- **Priority:** Should Have

**FR-7: Graceful degradation**
- **Description:** On browsers without the File System Access API, the page automatically uses the `webkitdirectory` fallback and informs the user.
- **User Story:** As a Firefox/Safari user, I want the tool to still work so that I am not blocked.
- **Acceptance Criteria:**
  - Given an unsupported browser
  - When the page loads
  - Then the fallback picker is offered and folder browsing works.
- **Priority:** Must Have

**FR-8: Relative resource resolution**
- **Description:** Relative image references resolve against the picked folder and display; internal links to `.md`/`.markdown` files within the folder open in the viewer instead of navigating away. External `http(s)` links open in a new tab; unresolved targets show an inline notice.
- **User Story:** As a reader, I want diagrams to show and cross-document links to work so that real-world docs render completely.
- **Acceptance Criteria:**
  - Given a rendered document containing a relative image and an internal `.md` link
  - When it displays / the link is clicked
  - Then the image renders from a same-folder `blob:` URL, and the link loads the target file into the pane.
  - And remote/absolute `src` values are not injected; external links open in a new tab.
- **Security Constraint:** `blob:` URLs are not sanitiser-permitted content — they never pass through `DOMPurify.sanitize()` at all. The rendered HTML is sanitised first (`app.js` line 201), *then* parsed into an inert `<template>` fragment (nothing in it loads), and only afterwards does `Resolve.apply` (`app.js` lines 145-161) directly set `img.src` via the DOM property (not an HTML string) to an object URL created from a same-folder file read through the picked-folder handle. Because the assignment never re-enters HTML parsing, no sanitiser allow-list for `blob:` is required or configured (DR-MR-05).
- **Priority:** Should Have

### Non-Functional Requirements

**NFR-1: Performance**
- Rendering a typical document (<200 KB) completes in <300 ms on a mid-range laptop. Enumerating a folder of ~200 files completes in <1 s.

**NFR-2: Portability**
- Runs from `file://` (fallback path) and from any static host; no build step, no runtime network.

**NFR-3: Reliability**
- No uncaught errors on empty folders, folders with no markdown, or unreadable files; each shows a clear in-page message.

**NFR-4: Security**
- All rendered HTML is sanitised with DOMPurify (DR-MR-03). No `eval`, no remote script loading. Vendored libraries pinned by version.

**NFR-5: Maintainability**
- Vanilla JS split into clear modules (selection, enumeration, rendering, UI). Decisions recorded with DR-MR-* identifiers. No framework lock-in.

### Requirements Traceability Matrix

| Requirement ID | Design Component | Test Case(s) | Status |
|----------------|------------------|--------------|--------|
| FR-1 | Folder Access Module | TC-SEL-01..03 | Shipped |
| FR-2 | Enumeration Module | TC-ENU-01..03 | Shipped |
| FR-3 | Render Module | TC-REN-01..04 | Shipped |
| FR-4 | Layout / CSS | TC-UI-01 | Shipped |
| FR-5 | Sidebar UI | TC-UI-02 | Shipped |
| FR-6 | Render Module (highlight) | TC-REN-05 | Shipped |
| FR-7 | Folder Access Module (fallback) | TC-SEL-04 | Shipped |
| FR-8 | Resource Resolution Module | TC-RES-01..04 | Shipped |
| NFR-4 | Render Module (sanitise) | TC-SEC-01..03 | Shipped |

---

## 4. Design Overview

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        index.html (page)                       │
│                                                                │
│  ┌────────────────────┐        ┌────────────────────────────┐ │
│  │   Sidebar (left)    │        │    Display pane (right)     │ │
│  │  ┌───────────────┐  │        │                            │ │
│  │  │ path display  │  │        │   rendered, sanitised      │ │
│  │  │ [Choose...]   │  │        │   HTML (scrollable)        │ │
│  │  │ filter box    │  │        │                            │ │
│  │  ├───────────────┤  │        │                            │ │
│  │  │ file list     │  │ click  │                            │ │
│  │  │ (scrollable)  │──┼───────▶│                            │ │
│  │  └───────────────┘  │        └────────────────────────────┘ │
│  └────────────────────┘                                        │
│                                                                │
│  app.js  →  Folder Access ─▶ Enumeration ─▶ Render(marked →    │
│              Module           Module          DOMPurify →      │
│                                               highlight.js)    │
│  vendor/ : marked.min.js · purify.min.js · highlight.min.js    │
└──────────────────────────────────────────────────────────────┘
```

**Description:**
A single page hosts two panes. `app.js` orchestrates three logical modules. The **Folder Access Module** obtains a directory (API or fallback) on a user gesture. The **Enumeration Module** walks the directory and produces a sorted list of markdown file descriptors. The **Render Module** reads a chosen file, converts it via `marked`, sanitises via `DOMPurify`, applies `highlight.js`, and injects it into the display pane. All libraries are vendored locally.

### Component Overview

| Component | Responsibility | Technology | Dependencies |
|-----------|---------------|------------|--------------|
| Folder Access Module | Acquire a directory handle / FileList via picker; detect capability; fallback | Vanilla JS, File System Access API, `<input webkitdirectory>` | Browser APIs |
| Enumeration Module | Recursively collect `.md`/`.markdown` entries; sort; build descriptors | Vanilla JS | Folder Access Module |
| Render Module | Read file text; parse → sanitise → highlight; inject into pane | `marked`, `DOMPurify`, `highlight.js` | Enumeration Module, vendored libs |
| Resource Resolution Module | Resolve relative images (blob URLs) and internal `.md` links against the picked folder; route external links | Vanilla JS, browser Blob/Object URL APIs | Folder Access + Render Modules, Path Helpers |
| Path Helpers (`src/paths.js`) | Pure, DOM-free path/URL logic: `resolvePath`, `isExternal`, `isMarkdownPath`; published on a global for both the page and the unit tests | Vanilla JS | None (no DOM, no I/O) |
| UI / Layout | Two-pane responsive layout; sidebar list, filter, path display, active state, theming | HTML + CSS | All of the above |

### Data Flow

```
1. User clicks "Choose folder"  →  Folder Access Module returns a directory source
2. Enumeration Module walks the source  →  array of { name, relativePath, getFile() }
3. UI renders the sorted, filterable list in the sidebar
4. User clicks an entry  →  Render Module reads text → marked() → DOMPurify.sanitize() → highlight → innerHTML
5. Display pane shows formatted HTML; active entry highlighted; pane scrollTop reset to 0
```

### Technology Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| Markup/Layout | HTML5 + CSS3 | — | Native, zero-build |
| Logic | Vanilla JavaScript (ES2020) | — | No framework needed; inspectable (DR-MR-04) |
| Markdown parse | marked | pinned (latest stable at build) | Fast, small, widely used |
| Unit/Integration tests | Vitest (node env, no jsdom — the tested `src/paths.js` helpers are pure, no DOM) | ^4.1 | Portfolio convention (hand-baked); dev-only (DR-MR-06) |
| E2E tests | Playwright | ^1.53 | Portfolio convention (calculator/magento); drives `webkitdirectory` fallback |
| Sanitisation | DOMPurify | pinned | Industry-standard XSS sanitiser (DR-MR-03) |
| Syntax highlight | highlight.js | pinned | De-facto code highlighter |
| Hosting of libs | Local `vendor/` | — | Offline, reproducible (DR-MR-02) |

### Design Principles Applied

- **KISS:** single page, three small modules, no framework.
- **Separation of Concerns:** access vs enumeration vs rendering are independent units.
- **Secure by default:** sanitise all generated HTML before insertion.
- **Progressive enhancement:** best experience on Chromium; functional fallback everywhere else.

---

## 5. Detailed Design

### 5.1 Component A: Folder Access Module

**Purpose:** Obtain a browsable directory from the user and normalise the two underlying mechanisms behind one interface.

**Public Interface:**
```javascript
// Returns a normalised directory source, or throws/falls back.
async function selectFolder(): Promise<DirectorySource>

// Capability probe used to decide which mechanism to offer.
function supportsFileSystemAccess(): boolean

// DirectorySource abstracts both backends:
//   { kind: 'fsapi', handle }  | { kind: 'input', fileList }
```

**Internal Structure:**
```javascript
async function selectFolder() {
  if (supportsFileSystemAccess()) {
    const handle = await window.showDirectoryPicker();   // user gesture
    return { kind: 'fsapi', handle };
  }
  // Fallback: programmatically trigger <input type=file webkitdirectory>
  const fileList = await pickViaInputElement();
  return { kind: 'input', fileList };
}
```

**Dependencies:** Browser File System Access API; `<input webkitdirectory>` element.

**State Management:** Holds the most recent `DirectorySource` so the chosen folder name can be displayed and re-enumerated.

**Error Handling:** User-cancellation of the picker resolves to a no-op (no error shown). Unsupported-API automatically routes to the fallback; the chosen path is surfaced to the path-display box.

### 5.2 Component B: Enumeration Module

**Purpose:** Produce a sorted, filterable list of markdown file descriptors from a `DirectorySource`.

**Public Interface:**
```javascript
// Walks the source (recursively for fsapi) and returns descriptors.
async function listMarkdownFiles(source: DirectorySource): Promise<FileDescriptor[]>

// FileDescriptor: { name, relativePath, read(): Promise<string> }
```

**Internal Structure:**
```javascript
const MD_EXT = /\.(md|markdown)$/i;

async function listMarkdownFiles(source) {
  const out = [];
  if (source.kind === 'fsapi') {
    await walk(source.handle, '', out);          // recursive directory walk
  } else {
    for (const file of source.fileList) {
      if (MD_EXT.test(file.name)) {
        out.push(descriptorFromFile(file, file.webkitRelativePath));
      }
    }
  }
  return out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
```

**Dependencies:** Folder Access Module output.

**State Management:** Stateless; returns a fresh array each call.

**Error Handling:** Unreadable entries are skipped and counted; an empty result triggers an "no markdown files found" message in the UI.

### 5.3 Component C: Render Module

**Purpose:** Convert a chosen file's markdown text into safe, highlighted HTML in the display pane.

**Public Interface:**
```javascript
async function renderDescriptor(descriptor: FileDescriptor, container: HTMLElement): Promise<void>
```

**Internal Structure:**
```javascript
async function renderDescriptor(descriptor, container) {
  const text  = await descriptor.read();
  const dirty = marked.parse(text);                 // markdown → HTML
  const clean = DOMPurify.sanitize(dirty);          // strip unsafe nodes/attrs
  container.innerHTML = clean;
  container.querySelectorAll('pre code')
           .forEach(el => hljs.highlightElement(el));
  container.scrollTop = 0;                            // reset scroll on new doc
}
```

**Dependencies:** `marked`, `DOMPurify`, `highlight.js` (all vendored).

**State Management:** Writes into the supplied container only.

**Error Handling:** Read failures render an inline error block in the pane rather than throwing.

### 5.4 Component D: Resource Resolution Module

**Purpose:** Make rendered documents complete — display relative images and let internal markdown links navigate within the viewer — without ever fetching remote resources.

**Public Interface:**
```javascript
// Post-render pass over the injected HTML for the given file's folder context.
async function resolveResources(container: HTMLElement, current: FileDescriptor,
                                index: FolderIndex, onNavigate: (d) => void): Promise<void>

// FolderIndex: lazy lookup of any file by resolved relative path → Blob.
```

**Internal Structure:**
```javascript
async function resolveResources(container, current, index, onNavigate) {
  // Images: swap relative src → same-folder blob URL
  for (const img of container.querySelectorAll('img')) {
    const target = resolveRelative(current.relativePath, img.getAttribute('src'));
    const blob = await index.read(target);                 // null if outside folder / missing
    if (blob) img.src = trackObjectURL(URL.createObjectURL(blob));
    else img.removeAttribute('src');                       // never leave a remote/absolute src
  }
  // Links: internal .md → in-app navigate; external → new tab
  for (const a of container.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (isExternal(href)) { a.target = '_blank'; a.rel = 'noopener'; continue; }
    const target = resolveRelative(current.relativePath, href);
    if (MD_EXT.test(target) && index.has(target)) {
      a.addEventListener('click', e => { e.preventDefault(); onNavigate(index.descriptor(target)); });
    }
  }
}
```

**Dependencies:** Folder index (lazy, built over the `DirectorySource`), Render Module output.

**State Management:** Tracks created object URLs and revokes them on navigation to avoid leaks.

**Error Handling:** Unresolved images drop their `src` (no broken remote fetch); unresolved internal links show an inline notice on click. Only `blob:` URLs from within the picked folder are ever injected (DR-MR-05).

### 5.5 API Design (if applicable)
N/A — no network API. The page operates entirely client-side against local files.

### 5.6 Algorithm Design (if applicable)

**Algorithm: Recursive directory walk (File System Access API path)**

**Pseudocode:**
```
FUNCTION walk(dirHandle, prefix, out):
    FOR each entry IN dirHandle.values():
        IF entry.kind == 'file' AND entry.name matches /\.(md|markdown)$/i:
            APPEND descriptor(entry, prefix + entry.name) TO out
        ELSE IF entry.kind == 'directory':
            walk(entry, prefix + entry.name + '/', out)
```

**Complexity Analysis:**
- Time Complexity: O(n) over total filesystem entries under the folder.
- Space Complexity: O(m) where m = number of markdown files.

**Edge Cases:**
- Symlink loops: not applicable to the directory-handle API (no symlink traversal exposed).
- Permission-denied sub-directory: caught and skipped.
- Very deep trees: bounded by the JS call stack; acceptable for expected folder sizes.

---

## 6. Implementation Plan

### Phase 1: Foundation

**Goal:** Static shell, layout, and vendored libraries in place.

**Tasks:**
1. **Scaffold page & layout** — `index.html`, `styles.css`; two-pane responsive layout with independent scroll regions.
   - Effort: 0.5 day
   - Dependencies: None
   - Deliverable: Static shell renders with placeholder sidebar/pane.
2. **Vendor libraries** — add pinned `marked`, `DOMPurify`, `highlight.js` under `vendor/` with licence headers.
   - Effort: 0.25 day
   - Dependencies: Task 1
   - Deliverable: Libraries load offline.

**Success Metrics:**
- Page renders offline with correct two-pane layout and independent scrolling.

### Phase 2: Core Implementation

**Goal:** Folder selection, enumeration, and rendering working end-to-end.

**Tasks:**
1. **Folder Access Module** with capability detection + fallback.
2. **Enumeration Module** with recursive walk and sort.
3. **Render Module** with parse → sanitise → highlight.
4. **Wire UI** — path display, file list, active state, scroll reset.

### Phase 3: Integration and Polish

**Goal:** Relative-resource resolution, robustness, filter, theming, and empty/error states.

**Tasks:**
1. **Resource Resolution Module (FR-8)** — lazy folder index + relative-path resolver; relative images via same-folder `blob:` URLs (with object-URL lifecycle management, set post-sanitisation on an inert fragment — see §3 Security Constraint), internal `.md` link interception, external links to new tab.
2. Quick filter (FR-5).
3. Light/dark theme toggle.
4. Empty-folder / no-markdown / unsupported-browser messaging.
5. Cross-browser pass (Chrome, Edge, Firefox, Safari).

### Risk Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| File System Access API absent (Firefox/Safari) | High | Medium | `webkitdirectory` fallback baked in from Phase 2 |
| Unsanitised HTML → XSS | Low | High | DOMPurify mandatory in Render Module (DR-MR-03) |
| `file://` API quirks | Medium | Low | Fallback path is the `file://` default; document `localhost` for API path |
| Large folders slow to enumerate | Low | Low | Lazy file reads (read on selection, not on enumeration) |

### Dependencies and Blockers

**External Dependencies:**
- `marked`, `DOMPurify`, `highlight.js` — vendored once at implementation.

**Known Blockers:**
- None.

---

## 7. Refactoring Strategy

N/A — greenfield project; there is no existing code to refactor. Future structural changes will be recorded as DR-MR-* decisions and reflected here.

---

## 8. Testing Strategy

### Unit Testing

**Components to Test:**
- Enumeration Module — extension filtering, sorting, recursion (target 80%).
- Render Module — sanitisation correctness, highlight invocation (target 80%).
- Resource Resolution Module — relative-path resolution, blob-URL substitution, external-link handling, remote/absolute rejection (target 80%).

**Test Cases:**
```javascript
describe('Enumeration Module', () => {
  test('includes only .md/.markdown and sorts by relative path', async () => {
    // Arrange: fake source with mixed files
    const source = fakeInputSource(['b.md', 'a.markdown', 'note.txt']);
    // Act
    const result = await listMarkdownFiles(source);
    // Assert
    expect(result.map(d => d.name)).toEqual(['a.markdown', 'b.md']);
  });
});
```

### Integration Testing

**Integration Points:**
- Folder Access ↔ Enumeration: a picked source yields the correct descriptor list.
- Enumeration ↔ Render: selecting a descriptor renders its content into the pane.

**Test Scenarios:**
1. Happy path: pick folder → list appears → click file → formatted output shown.
2. Empty/markdown-less folder → friendly message, no crash.
3. Unsupported browser → fallback picker engaged, browsing works.

### End-to-End Testing

**User Workflows:**
```gherkin
Scenario: Browse and read a markdown file
  Given the page is open in a supported browser
  When I choose a folder containing markdown files
  And I click a file in the sidebar
  Then the file renders as formatted HTML in the display pane
  And the display pane scrolls independently of the sidebar
```

### Performance Testing

**Load Testing:**
- Enumerate a folder of ~200 markdown files; assert <1 s to populated sidebar.

**Stress Testing:**
- Render a ~1 MB markdown document; confirm the page stays responsive.

**Benchmarks:**
| Operation | Current Baseline | Target | Max Acceptable |
|-----------|------------------|--------|----------------|
| Render ~200 KB doc | N/A (new) | 300 ms | 800 ms |
| Enumerate ~200 files | N/A (new) | 1 s | 2 s |

### Test Automation

**Tools:**
- Unit/Integration: **Vitest**, node environment, no jsdom — the tested `src/paths.js` helpers are pure (portfolio convention per `hand-baked-screenplay-pattern`, adapted since this project's helpers need no DOM).
- E2E: **Playwright** (matches `calculator`/`magento`), driving the **`webkitdirectory` fallback** via `setInputFiles` — the File System Access API native picker is an OS dialog Playwright cannot automate, so E2E targets the fallback path, which exercises the same enumeration→render pipeline.
- E2E runs **Chromium only** (`playwright.config.ts`'s `projects`); cross-engine (WebKit/Firefox) rendering is verified manually, not in CI, since the deliberately single-engine automated pipeline doesn't cover it (review R-04).
- All test tooling is **dev-only** (`devDependencies`); the shipped page (`index.html` + `vendor/`) remains build-free (DR-MR-06).

**CI/CD Integration:**
- Run on PR; block merge on failure. (Aligned with portfolio conventions.)

---

## 9. Migration Path

N/A — greenfield. No existing system, data, or users to migrate. This section will be populated only if a breaking redesign is undertaken later.

---

## 10. Alternatives Considered

### Alternative 1: Literal typed-path text box reading the filesystem

**Description:** A text box where the user types an absolute folder path; the page reads that path directly.

**Pros:**
- Matches the original request literally.
- Fast, no dialog.

**Cons:**
- **Impossible in a static page** — browsers forbid arbitrary filesystem reads from script for security.
- Would require a local backend server, making the project no longer static.

**Reason for Rejection:** Violates the static, zero-server constraint. Delivered instead as a read-only path display fed by the native picker (DR-MR-01). True typed-path support is noted as a future, server-backed enhancement.

### Alternative 2: CDN-loaded libraries

**Description:** Load `marked`, `DOMPurify`, `highlight.js` from a public CDN via `<script src="https://…">`.

**Pros:**
- Zero vendoring; smallest repo; trivial version bumps.
- Possible shared browser cache.

**Cons:**
- **Requires internet at runtime** — breaks the offline/"works anywhere" goal.
- Third-party availability and supply-chain trust (mitigated, not removed, by SRI).

**Reason for Rejection:** Undercuts the core value of a self-contained offline viewer. Vendored locally instead (DR-MR-02).

### Alternative 3: Static-site generator (e.g. MkDocs/Docusaurus)

**Description:** Use a generator to build an HTML site from the markdown.

**Pros:**
- Rich features (search, navigation, theming).

**Cons:**
- Requires a build step and toolchain; not a single-file artefact; rebuild needed per content change.

**Reason for Rejection:** Far heavier than the goal; defeats the "open one file, browse any folder" use case.

### Comparison Matrix

| Criterion | Chosen Design | Alt 1 (typed path) | Alt 2 (CDN) | Alt 3 (SSG) |
|-----------|---------------|--------------------|-------------|-------------|
| Complexity | Low | High (needs server) | Low | High |
| Offline | Yes | Depends | No | Yes (post-build) |
| Static / zero-build | Yes | No | Yes | No |
| Maintainability | High | Low | Medium | Medium |
| Matches request | Closely (picker) | Literally | — | No |

---

## 11. Open Questions

### Technical Questions

_None open — both prior technical questions are resolved below._

### Business Questions

**Q1: Is the picker-based folder selection an acceptable substitute for a literal typed path for portfolio presentation?**
- **Impact:** High
- **Blocking:** No
- **Who Can Answer:** Gary Brooks
- **Deadline:** Design approval
- **Current Status:** Resolved — see below.

### Resolved Questions

**Q1: Picker vs literal typed path**
- **Answer:** Use the native picker plus a read-only path display; document typed-path as future server-backed work.
- **Resolved By:** Gary Brooks
- **Resolved Date:** 2026-06-15
- **Impact on Design:** Fixes DR-MR-01; shapes the Folder Access Module.

**Q2: CDN vs vendored libraries**
- **Answer:** Vendor locally under `vendor/`.
- **Resolved By:** Gary Brooks
- **Resolved Date:** 2026-06-15
- **Impact on Design:** Fixes DR-MR-02; adds `vendor/` to project structure.

**Q3: Should relative image/link references be resolved to the picked folder?**
- **Answer:** Yes — resolve both relative images and internal `.md` links as a single Phase 3 feature. Images display via same-folder `blob:` URLs; internal links navigate in-app; external links open in a new tab; remote/absolute resources are blocked.
- **Resolved By:** Gary Brooks
- **Resolved Date:** 2026-06-15
- **Impact on Design:** Fixes DR-MR-05; adds FR-8, the Resource Resolution Module (§5.4), and Phase 3 Task 1; moved into scope (§1).

**Q4: Which test frameworks should the implementation adopt?**
- **Answer:** Vitest (unit/integration, jsdom) + Playwright (E2E via the `webkitdirectory` fallback), dev-only.
- **Resolved By:** Gary Brooks
- **Resolved Date:** 2026-06-15
- **Impact on Design:** Fixes DR-MR-06; sets §8 tooling. Matches `hand-baked-screenplay-pattern` (Vitest) and `calculator`/`magento` (Playwright); shipped artefact stays build-free.

---

## 12. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| File System Access API | Browser API (`showDirectoryPicker`) granting scripted access to a user-picked directory; Chromium-only. |
| `webkitdirectory` | Attribute on `<input type="file">` allowing folder selection, yielding a FileList; broadly supported. |
| Sanitisation | Removing unsafe HTML (scripts, event handlers) before insertion to prevent XSS. |
| Vendoring | Committing third-party library files into the repository rather than fetching them at runtime. |

### Appendix B: References

1. MDN — File System Access API — https://developer.mozilla.org/docs/Web/API/File_System_API
2. marked — https://github.com/markedjs/marked
3. DOMPurify — https://github.com/cure53/DOMPurify
4. highlight.js — https://github.com/highlightjs/highlight.js

### Appendix C: Related Documents

- Project README: `readme.md`
- (Future) Implementation log, code review — to be created during implementation.

### Appendix D: Diagrams

See the high-level architecture and data-flow diagrams in §4.

### Appendix E: Code Examples

```javascript
// End-to-end glue (illustrative)
document.querySelector('#choose').addEventListener('click', async () => {
  const source = await selectFolder();
  if (!source) return;                         // user cancelled
  pathDisplay.value = describe(source);
  const files = await listMarkdownFiles(source);
  renderSidebar(files, descriptor =>
    renderDescriptor(descriptor, displayPane));
});
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v0.1 | 2026-06-15 | Gary Brooks | Initial draft for review |
| v0.2 | 2026-06-15 | Gary Brooks | Resolved open questions: added FR-8 + Resource Resolution Module (DR-MR-05) and Vitest/Playwright test tooling (DR-MR-06); updated scope, traceability, Phase 3, and §8 |
| v0.3 | 2026-06-15 | Gary Brooks | Implementation + tests: extracted pure helpers to `src/paths.js` (DR-MR-07) with Path Helpers component; 11 Vitest unit tests + 6 Playwright E2E tests; `verify` gate green |
| v0.4 | 2026-07-20 | Gary Brooks | Currency pass (review R-02): flipped Status to Implemented and the Requirements Traceability Matrix to Shipped (FR-1..FR-8, NFR-4 — all had been sitting at their pre-build Draft values despite the project having shipped); corrected the tech-stack table to the actual installed Vitest 4 (node env, no jsdom) and Playwright ^1.53 |

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Author | Gary Brooks | Pending | 2026-06-15 |
| Reviewer | AI assistant (CLAUDE Opus 4.8) | Pending | 2026-06-15 |

---

*End of Design Document*
