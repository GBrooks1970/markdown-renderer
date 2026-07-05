# Markdown Renderer — Design Document: Folder Tree Navigation & Refresh

**Version:** v0.2
**Date:** 2026-07-05T00:00:00Z
**Author:** Gary Brooks
**Reviewer:** AI assistant (CLAUDE Fable 5)
**Status:** Draft
**Extends:** [`design-document.md`](design-document.md) v0.3 (FR-1..FR-8, DR-MR-01..07, Phases 1–3)

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
Extend the shipped Markdown Renderer (design v0.3, implemented and published) with three navigation features: a **Refresh** button that re-reads the currently selected folder, a **folder tree** in the sidebar that shows the folder layout hierarchically instead of a flat relative-path list, and **drilldown** — expanding and collapsing folders in that tree to navigate into sub-folders. All existing constraints hold: no build step, no server, no network at runtime, classic scripts, `file://`-safe.

### Scope
**In Scope:**
- A **Refresh** control that re-enumerates the already-selected folder and re-renders the current document, picking up added, removed, and edited files.
- A **tree view** in the sidebar: folders and markdown files shown as a hierarchy rooted at the picked folder, replacing the current flat relative-path list.
- **Drilldown**: expand/collapse of folder nodes by click; expansion state preserved across file selection and refresh; the path to the active file is auto-revealed.
- Filter (FR-5) behaviour redefined to coexist with the tree.
- Preservation of the active file and scroll-independent layout across refresh.

**Out of Scope:**
- Live file-watching / auto-refresh on disk changes (unchanged from v0.3 — refresh is deliberately manual; see §10 Alt 3).
- Showing non-markdown files in the tree (the viewer remains a markdown browser).
- Full ARIA `role="tree"` keyboard navigation (native `<details>` semantics only for now; see §10 Alt 2).
- Any change to rendering, sanitisation, or resource resolution (FR-3/FR-6/FR-8 untouched).

### Key Decisions
1. **Refresh re-enumerates the retained `DirectorySource`; the two backends differ honestly** (DR-MR-08) — the File System Access API handle supports a silent re-walk, so refresh is seamless on Chromium. The `webkitdirectory` fallback yields a one-time snapshot (stale `File` objects can throw on re-read after disk changes), so on the fallback path Refresh re-opens the folder picker. The button is always present; its behaviour degrades gracefully and the UI says so.
2. **The tree is a pure transform of the existing flat descriptor list** (DR-MR-09) — `buildTree(descriptors)` lives in `src/paths.js` alongside the other pure helpers (DR-MR-07): no new I/O, identical behaviour for both backends (both already produce `relativePath`), and fully unit-testable in Node.
3. **Expand/collapse uses native nested `<details>/<summary>` elements** (DR-MR-10) — zero-framework, `file://`-safe, keyboard-operable out of the box, and consistent with the vanilla-JS decision (DR-MR-04). Expansion state is tracked as a set of folder paths and re-applied after any re-render.
4. **While the filter is active, the sidebar shows a flat matched list; clearing it restores the tree** (DR-MR-11) — preserves FR-5's proven substring behaviour exactly, avoids ambiguous "matched file inside collapsed folder" states, and keeps the tree renderer simple.

### Success Criteria
- Refresh on the API path picks up added/removed/edited files **without re-picking the folder**; the active document re-renders from fresh content; the fallback path routes through the picker with a clear message.
- The sidebar shows the picked folder's layout as a tree; folders sort before files; both alphabetical.
- Clicking a folder toggles it; clicking a file renders it (existing FR-3 path); expansion state survives selection and refresh.
- Navigating to a file in a collapsed folder (internal FR-8 link, or restored selection after refresh) auto-expands its ancestors.
- `npm run verify` stays green; no regression to FR-1..FR-8.

---

## 2. Problem Analysis

### Current State
The implemented v0.3 sidebar is a **flat list** of relative paths (`docs/notes/a.md`), sorted alphabetically. This is adequate for shallow folders but degrades as depth and file count grow: long path prefixes repeat, structure is invisible, and there is no way to focus on one sub-folder. Separately, the enumeration is a **one-shot snapshot** taken at pick time: files added, removed, or edited afterwards are invisible until the user re-picks the folder — an irritation precisely in this tool's core use case (reading docs that are being actively written).

**Current Architecture (if applicable):**
```
selectFolder() → listMarkdownFiles(source) → renderSidebar(flat sorted list)
                                              └─ click → renderDescriptor()
No re-enumeration path exists after the initial pick.
```

**Pain Points:**
1. **No structure** — a portfolio-sized docs tree (e.g. `session-notes/`, `docs/`, per-project folders) reads as a wall of repeated prefixes.
2. **No focus** — the reader cannot collapse folders they are not interested in.
3. **Stale listing** — edits and new files on disk require re-picking the folder to appear, losing the current selection.

### Root Cause Analysis
The flat list was the correct Phase-2 minimum: `relativePath` strings were rendered directly without interpreting their structure. The hierarchy information has been present in the descriptors all along — it has simply never been parsed into a tree. Likewise the `fsapi` backend has always retained a live directory handle capable of re-walks; no code path exercised it after the initial enumeration.

**Contributing Factors:**
- Phase 2/3 prioritised the render pipeline (parse → sanitise → resolve) over sidebar ergonomics.
- The fallback backend's snapshot semantics discouraged designing any "reload" affordance at all, even though the primary backend supports it.

### Constraints and Assumptions

**Technical Constraints:**
- **Fallback snapshot semantics:** `<input webkitdirectory>` returns a fixed `FileList`; there is no handle to re-walk, and re-reading a stale `File` after the underlying file changed fails in Chromium (`ERR_UPLOAD_FILE_CHANGED`). A silent fallback refresh is therefore **impossible**; it must route through the picker.
- **Permission lifetime (fsapi):** a directory handle's read permission can lapse between visits/gestures; a refresh re-walk may need `handle.requestPermission()` or, failing that, a re-pick.
- All v0.3 constraints persist: classic scripts only, no build, no runtime network, sanitise everything (DR-MR-03/04).

**Business Constraints:**
- Portfolio deliverable — the feature must stay small, inspectable, and honest about the backend asymmetry.

**Assumptions:**
- Folder shapes remain modest (tens to low hundreds of files, depth < ~10), so an eager full re-walk on refresh is acceptable — no incremental diffing needed.
- Users understand "Refresh" as *re-read this folder now*, not live watching.

### Stakeholders
| Stakeholder | Role | Interest | Impact Level |
|-------------|------|----------|--------------|
| Gary Brooks | Author / portfolio owner | Navigation that scales to real docs trees | High |
| Portfolio reviewers | Readers / evaluators | Visible structure; behaviour honest per browser | Medium |
| Future contributors | Maintainers | Tree logic pure and unit-tested; no framework creep | Low |

---

## 3. Requirements

Numbering continues from design v0.3 (FR-1..FR-8, NFR-1..NFR-5).

### Functional Requirements

**FR-9: Refresh selected folder**
- **Description:** A Refresh control re-enumerates the currently selected folder and updates the sidebar. The active file, if still present (matched by `relativePath`), stays selected and is **re-rendered from fresh content**; if it has disappeared, the pane shows a clear notice. Stale `blob:` object URLs are revoked. On the `fsapi` backend this is silent; on the `webkitdirectory` fallback it re-opens the folder picker (with the UI stating why). The control is disabled until a folder has been chosen.
- **User Story:** As a reader whose docs are being edited, I want to reload the folder so that new and changed files appear without losing my place.
- **Acceptance Criteria:**
  - Given a folder is selected on the `fsapi` backend and a file has been added on disk
  - When the user activates Refresh
  - Then the sidebar includes the new file without the picker appearing, and the previously active file remains selected and re-renders.
  - And on the fallback backend, activating Refresh opens the folder picker; cancelling it leaves the existing listing untouched.
- **Priority:** Must Have

**FR-10: Folder tree sidebar**
- **Description:** The sidebar presents the selected folder's markdown files as a hierarchy rooted at the picked folder. Folder nodes sort before file nodes; each group sorts alphabetically (case-insensitive). Folders containing no markdown anywhere beneath them do not appear. File rows show the file name only (the hierarchy conveys the path); the full relative path is available as a tooltip/`title`.
- **User Story:** As a reader of a structured docs tree, I want to see the folder layout so that I can understand and navigate the structure.
- **Acceptance Criteria:**
  - Given a selected folder containing `a.md`, `docs/b.md`, and `docs/img/logo.png`
  - When enumeration completes
  - Then the sidebar shows `a.md` and a `docs` folder node containing `b.md`, and no `img` node.
- **Priority:** Must Have

**FR-11: Tree drilldown (expand/collapse)**
- **Description:** Folder nodes expand and collapse on click (and via keyboard, per native `<details>` semantics). On first population, root-level entries are visible and folders start collapsed. Expansion state is remembered (per folder path) across file selection, filtering, and refresh. When a file inside a collapsed folder becomes active — via an internal link (FR-8), or selection restore after refresh — its ancestor folders auto-expand and the entry scrolls into view.
- **User Story:** As a reader, I want to open only the folders I care about so that deep trees stay manageable.
- **Acceptance Criteria:**
  - Given a populated tree with a collapsed folder
  - When the user clicks the folder row
  - Then its children appear; clicking again hides them.
  - And given the active document links to a file inside a collapsed folder
  - When the link is followed
  - Then the target renders and its ancestors expand with the entry visible and highlighted.
- **Priority:** Must Have

**FR-5 (amended): Quick filter × tree**
- **Description:** While the filter box is non-empty, the sidebar shows a **flat list** of matching files (substring match against the relative path, as today). Clearing the filter restores the tree with its prior expansion state. (DR-MR-11.)
- **Acceptance Criteria:**
  - Given a populated tree and expanded folders
  - When the user types a filter term
  - Then a flat list of matches replaces the tree; and when the filter is cleared, the tree returns with the same folders expanded.
- **Priority:** Should Have

### Non-Functional Requirements

**NFR-1 (extended): Performance**
- Building and rendering the tree for ~200 files adds <50 ms over the flat list. A refresh (re-walk + tree rebuild + re-render of the active document) completes in <1.5 s for ~200 files.

**NFR-3 (extended): Reliability**
- Refresh handles: folder deleted/renamed on disk, permission lapsed (re-request, then prompt re-pick), active file removed, and picker cancellation — each with a clear in-page message and no uncaught errors.

**NFR-5 (extended): Maintainability**
- Tree construction is pure and DOM-free in `src/paths.js` (DR-MR-09), unit-tested like `resolvePath`. The sidebar DOM code consumes the tree structure; it contains no path-parsing logic.

### Requirements Traceability Matrix

| Requirement ID | Design Component | Test Case(s) | Status |
|----------------|------------------|--------------|--------|
| FR-9 | Folder Access Module (refresh path) + UI | TC-REF-01..04 | Not Started |
| FR-10 | Tree Builder (`src/paths.js`) + Sidebar Tree UI | TC-TRE-01..04 | Not Started |
| FR-11 | Sidebar Tree UI (expansion state) | TC-TRE-05..07 | Not Started |
| FR-5 (amended) | Sidebar Tree UI (filter mode) | TC-UI-03 | Not Started |
| NFR-3 (ext) | Refresh error handling | TC-REF-05..06 | Not Started |

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
│  │  │ [Choose] [⟳]  │  │        │   HTML (scrollable)        │ │
│  │  │ filter box    │  │        │                            │ │
│  │  ├───────────────┤  │        │                            │ │
│  │  │ ▸ docs        │  │        │                            │ │
│  │  │ ▾ notes       │  │ click  │                            │ │
│  │  │   · a.md      │──┼───────▶│                            │ │
│  │  │ · readme.md   │  │        │                            │ │
│  │  └───────────────┘  │        └────────────────────────────┘ │
│  └────────────────────┘                                        │
│                                                                │
│  app.js →  Folder Access ─▶ Enumeration ─▶ buildTree ─▶ Tree UI│
│             Module           Module         (paths.js)          │
│                 ▲                                               │
│                 └── Refresh: re-walk retained source, rebuild,  │
│                     restore selection + expansion state         │
└──────────────────────────────────────────────────────────────┘
```

**Description:**
The existing pipeline gains one pure step and one control. After enumeration, the flat `FileDescriptor[]` is fed through **`buildTree`** (a new pure helper in `src/paths.js`) to produce a nested node structure, which the **Sidebar Tree UI** renders as nested `<details>/<summary>` markup. The **Refresh** control re-invokes enumeration against the retained `DirectorySource` (silent re-walk on `fsapi`; picker round-trip on the fallback), then rebuilds the tree and restores the active file and expansion state. Rendering, sanitisation, and resource resolution are untouched.

### Component Overview

| Component | Responsibility | Technology | Dependencies |
|-----------|---------------|------------|--------------|
| Folder Access Module (extended) | As v0.3, plus `refresh()`: re-walk `fsapi` handle (re-requesting permission if lapsed) or re-open fallback picker | Vanilla JS, File System Access API | Browser APIs |
| Tree Builder (`src/paths.js`) | Pure: flat `FileDescriptor[]` → nested `TreeNode` structure; folders-first alphabetical ordering; no empty folders | Vanilla JS | None (no DOM, no I/O) |
| Sidebar Tree UI | Render `TreeNode`s as nested `<details>/<summary>/<ul>`; track + re-apply expansion state; auto-reveal active file; filter mode (flat) | HTML + CSS + vanilla JS | Tree Builder, existing sidebar wiring |
| Selection/State Keeper | Remember active `relativePath` + expanded folder set across refresh/filter; revoke stale object URLs on refresh | Vanilla JS | Folder Access, Resource Resolution |

### Data Flow

```
1. User clicks Refresh  →  Folder Access Module re-acquires entries
     fsapi   : re-walk retained handle (permission re-requested if needed)
     fallback: picker re-opens; cancel → abort, keep current state
2. Enumeration Module returns fresh FileDescriptor[]
3. buildTree(descriptors) → TreeNode root            (pure, paths.js)
4. Sidebar Tree UI re-renders; expanded-set re-applied; active file
   re-matched by relativePath (ancestors auto-expanded) or notice shown
5. Active descriptor re-read → existing render pipeline (marked →
   DOMPurify → highlight → resolveResources); old blob: URLs revoked
```

### Technology Stack

No additions. The features use HTML (`<details>/<summary>`), CSS, and vanilla JS already in the stack; `marked`/`DOMPurify`/`highlight.js` are unaffected; test tooling remains Vitest + Playwright, dev-only (DR-MR-06).

### Design Principles Applied

- **KISS:** the tree is a view over data that already exists; refresh is a re-run of an existing pipeline.
- **Separation of Concerns:** structure-building (pure, tested in Node) is separate from tree DOM rendering.
- **Progressive enhancement:** full silent refresh on Chromium; honest, functional degradation on the fallback.
- **Secure by default:** no change to the sanitise-then-inject pipeline; refresh revokes object URLs before rebuilding.

---

## 5. Detailed Design

### 5.1 Component A: Tree Builder (`src/paths.js`)

**Purpose:** Convert the flat, sorted descriptor list into a nested tree, purely and deterministically, shared verbatim by the page and the unit tests (as `resolvePath` is today, DR-MR-07/09).

**Public Interface:**
```javascript
// Published on globalThis.MarkdownRendererPaths alongside resolvePath etc.
// descriptors: [{ name, relativePath, ... }]  (opaque payload carried through)
// returns the root TreeNode.
function buildTree(descriptors): TreeNode

// TreeNode:
//   { kind: 'dir',  name, path,          children: TreeNode[] }   // folders first,
//   { kind: 'file', name, path, descriptor }                      // then files; both A→Z
```

**Internal Structure:**
```javascript
function buildTree(descriptors) {
  const root = { kind: 'dir', name: '', path: '', children: [] };
  for (const d of descriptors) {
    const segments = d.relativePath.split('/');
    let node = root;
    for (const seg of segments.slice(0, -1)) {
      node = getOrCreateDir(node, seg);          // creates { kind:'dir', ... } once
    }
    node.children.push({ kind: 'file', name: segments.at(-1),
                         path: d.relativePath, descriptor: d });
  }
  sortChildren(root);                             // recursive: dirs first, then files,
  return root;                                    // localeCompare within each group
}
```

**Dependencies:** None — no DOM, no I/O; input is the Enumeration Module's output.

**State Management:** Stateless; returns a fresh tree each call.

**Error Handling:** Tolerates `\`-separated and `./`-prefixed relative paths by normalising before splitting; empty input yields a root with no children (UI shows the existing "no markdown files" message). Empty folders cannot occur by construction — only paths that terminate in a markdown file create directory nodes.

### 5.2 Component B: Sidebar Tree UI

**Purpose:** Render the tree, own expansion state, and route clicks — folders toggle, files render.

**Public Interface:**
```javascript
// Renders root into the sidebar list container, re-applying expansion state.
function renderTree(root: TreeNode, container: HTMLElement,
                    state: SidebarState, onSelect: (descriptor) => void): void

// SidebarState: { expanded: Set<string> /* dir paths */, activePath: string|null }
// Reveal a file entry, expanding ancestors (used by FR-8 navigation + refresh restore).
function revealPath(relativePath: string, state: SidebarState): void
```

**Internal Structure:**
```javascript
// Folders: <li><details open?><summary>name</summary><ul>…children…</ul></details></li>
// Files:   <li><button class="file" data-path title=path>name</button></li>
function renderTree(root, container, state, onSelect) {
  container.replaceChildren(subtree(root));
  function subtree(dir) { /* build nested <ul>; details.open = state.expanded.has(dir.path);
                             details 'toggle' event keeps state.expanded in sync */ }
}
function revealPath(path, state) {
  for (const ancestor of ancestorsOf(path)) state.expanded.add(ancestor);
  // re-apply open flags, mark active row, scrollIntoView({ block:'nearest' })
}
```

**Dependencies:** Tree Builder output; existing `onSelect` → Render Module wiring (FR-3) is reused unchanged.

**State Management:** `SidebarState` lives in `app.js` for the lifetime of the selected folder; the expanded set survives re-renders (selection, filter clear, refresh) and is reset when a *different* folder is picked. Native `<details>` `toggle` events are the single source of expansion changes.

**Error Handling:** None beyond the existing empty-state message — the renderer draws whatever tree it is given.

**Filter mode (DR-MR-11):** while the filter input is non-empty, `renderTree` is bypassed and the existing flat matched list is rendered (unchanged FR-5 code path, matching against `relativePath`); on clearing, `renderTree` runs again with the preserved `SidebarState`.

### 5.3 Component C: Folder Access Module — refresh path

**Purpose:** Re-acquire the folder's contents on demand, per backend, without disturbing the v0.3 selection flow.

**Public Interface:**
```javascript
// Re-acquires entries for the retained source.
// Resolves to a fresh DirectorySource, or null if the user cancelled (fallback picker)
// — null means "keep current state untouched".
async function refreshFolder(current: DirectorySource): Promise<DirectorySource | null>
```

**Internal Structure:**
```javascript
async function refreshFolder(current) {
  if (current.kind === 'fsapi') {
    if (await current.handle.queryPermission({ mode: 'read' }) !== 'granted') {
      const p = await current.handle.requestPermission({ mode: 'read' });   // user gesture
      if (p !== 'granted') return await selectFolder();     // last resort: re-pick
    }
    return current;                       // same handle; caller re-runs enumeration
  }
  // Fallback: snapshot cannot be re-read (stale File objects can throw
  // ERR_UPLOAD_FILE_CHANGED) — route through the picker, message the user.
  return await pickViaInputElement();     // null on cancel
}
```

**Dependencies:** v0.3 `selectFolder` / `pickViaInputElement`; Enumeration Module re-run by the caller.

**State Management:** On success, `app.js` swaps the descriptor list, rebuilds the tree, restores `SidebarState` (dropping expanded paths that no longer exist), re-matches `activePath`, and re-renders the active document from its **fresh** descriptor. All object URLs from the previous render are revoked first (existing FR-8 lifecycle hook).

**Error Handling:** Handle re-walk failures (folder deleted/renamed, `NotFoundError`) surface an in-page message offering re-pick; picker cancellation is a silent no-op (matching v0.3 behaviour); a vanished active file leaves the sidebar updated and shows "*file no longer exists — choose another*" in the pane.

### 5.4 API Design (if applicable)
N/A — no network API; entirely client-side, as before.

### 5.5 Algorithm Design (if applicable)

**Algorithm: Tree construction from relative paths**

**Pseudocode:**
```
FUNCTION buildTree(descriptors):
    root ← dir node ''
    FOR each descriptor d:                       # descriptors pre-sorted by v0.3
        node ← root
        FOR each folder segment s in d.relativePath (all but last):
            node ← child dir s of node, created if absent (memoised per node)
        APPEND file node (last segment, d) TO node.children
    SORT children recursively: dirs before files, localeCompare within group
    RETURN root
```

**Complexity Analysis:**
- Time Complexity: O(n·d) insertion + O(n log n) sorting, n = files, d = max depth.
- Space Complexity: O(n + f) where f = number of distinct folders containing markdown.

**Edge Cases:**
- Files at the root (no folder segments) — appended directly to root.
- Two files whose names differ only by case — distinct siblings; `localeCompare` ordering is deterministic.
- A folder and a file sharing a name at the same level (`docs` + `docs.md`) — distinct nodes; dirs-first ordering keeps them unambiguous.
- Windows-style `\` separators from `webkitRelativePath` variants — normalised to `/` before splitting.

---

## 6. Implementation Plan

Phases continue from design v0.3 (Phases 1–3 shipped).

### Phase 4: Tree Foundation

**Goal:** Tree structure and rendering replace the flat list, with drilldown, at parity with existing tests.

**Tasks:**
1. **`buildTree` in `src/paths.js`** — pure builder + normalisation, published on the existing global; Vitest unit tests (ordering, nesting, edge cases) first.
   - Effort: 0.5 day
   - Dependencies: None
   - Deliverable: TC-TRE-01..04 green in Node.
2. **Sidebar Tree UI** — nested `<details>/<summary>` renderer, expansion-state set, active-row highlight, `revealPath`; styles for indent/chevrons in both themes.
   - Effort: 0.5 day
   - Dependencies: Task 1
   - Deliverable: FR-10/FR-11 working in the page; existing E2E amended and green.
3. **Filter mode integration** — flat matched list while filtering; state restored on clear (DR-MR-11).
   - Effort: 0.25 day
   - Dependencies: Task 2
   - Deliverable: FR-5 (amended) green.

**Success Metrics:**
- All v0.3 behaviour intact; tree renders `sample-docs/` correctly with drilldown; `npm run verify` green.

### Phase 5: Refresh

**Goal:** Folder reload with state preservation, honest per backend.

**Tasks:**
1. **`refreshFolder` + button wiring** — button beside the path display (disabled until a folder is chosen); `fsapi` silent re-walk with permission re-request; fallback picker round-trip with explanatory message.
2. **State restoration** — active-file re-match + re-render from fresh descriptor; expanded-set pruning; object-URL revocation; vanished-file and vanished-folder notices.
3. **`sample-docs/` additions if needed** — ensure a nested fixture exists that exercises deep reveal (`revealPath`) end-to-end.

**Success Metrics:**
- FR-9 acceptance criteria demonstrably met on Chromium (manual, API path) and via Playwright (fallback path); NFR-3 (ext) failure modes each show their message.

### Risk Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Fallback users expect silent refresh | High | Low | Refresh works everywhere but re-opens the picker on the fallback, with an inline message stating why (DR-MR-08) |
| `fsapi` permission lapses between gestures | Medium | Low | `queryPermission`/`requestPermission` inside the click handler (user gesture); re-pick as last resort |
| Expansion state drifts from DOM after re-renders | Medium | Medium | Single source of truth: `<details>` `toggle` events write the set; renders only read it |
| `<details>` marker styling inconsistent across browsers | Medium | Low | Custom chevron via CSS on `summary`; cross-browser pass in Phase 5 |
| Deep trees make rows cramped | Low | Low | Indent by depth with `title` tooltips carrying the full path; assumption bounds depth |

### Dependencies and Blockers

**External Dependencies:**
- None — no new libraries (vendored set unchanged, DR-MR-02).

**Known Blockers:**
- None.

---

## 7. Refactoring Strategy

Unlike v0.3 this is not greenfield; the touched seams are:

- **`renderSidebar` (flat) → `renderTree` + filter mode.** The flat renderer survives as the filter-mode view rather than being deleted — least-change, and FR-5's tests keep their meaning.
- **`src/paths.js` grows `buildTree`** — same pattern as the existing helpers: pure, global-published, classic-script-safe (no `import`/`export` — permanent constraint per DR-MR-04/07).
- **`app.js` selection state** is promoted from an implicit "which row has the active class" to an explicit `SidebarState` object, which refresh and filter both need. No other module changes.
- **`pages.yml` staging list**: no new runtime files are planned (`buildTree` lives in the already-deployed `src/paths.js`), but if any file *is* added it must join the staging `cp` list — that list is the deployment manifest (handover v2 lesson).

Each structural change lands with its tests in the same commit; `npm run verify` green is the gate throughout.

---

## 8. Testing Strategy

### Unit Testing

**Components to Test:**
- Tree Builder — nesting, ordering, normalisation, edge cases (target 80%). Guarded like `resolvePath`: this is the new bug-prone pure logic.

**Test Cases:**
```javascript
describe('buildTree', () => {
  test('nests by folder, dirs before files, alphabetical within groups', () => {
    // Arrange: flat descriptors as produced by listMarkdownFiles
    const tree = buildTree([
      d('readme.md'), d('docs/b.md'), d('docs/a.md'), d('docs/img/x.md'),
    ]);
    // Assert: root = [docs(dir), readme.md]; docs = [img(dir), a.md, b.md]
    expect(tree.children.map(n => `${n.kind}:${n.name}`))
      .toEqual(['dir:docs', 'file:readme.md']);
    expect(tree.children[0].children.map(n => n.name))
      .toEqual(['img', 'a.md', 'b.md']);
  });
});
```
Further cases: root-level files only; backslash separators; folder/file name collision; empty input; no phantom empty folders.

### Integration Testing

**Integration Points:**
- Enumeration ↔ Tree Builder: a source with nested folders yields the expected tree.
- Refresh ↔ State Keeper: post-refresh, active path and surviving expanded folders are restored; removed paths pruned.

**Test Scenarios:**
1. Happy path: pick nested folder → tree appears → drill into sub-folder → click file → renders.
2. Refresh (fallback, via E2E): re-pick an extended fixture → new file visible, selection retained.
3. Active file removed before refresh → sidebar updates, pane shows the notice.
4. Filter while folders expanded → flat matches; clear → tree returns, expansion intact.

### End-to-End Testing

**User Workflows:**
```gherkin
Scenario: Drill into a sub-folder and read a file
  Given the page has a folder selected containing nested markdown
  When I expand a folder node in the sidebar tree
  And I click a file inside it
  Then the file renders as formatted HTML in the display pane
  And the folder remains expanded with the file highlighted

Scenario: Refresh picks up a newly added file
  Given a folder is selected and a document is open
  When I refresh the folder listing
  Then the new file appears in the tree
  And the open document remains selected and re-renders
```

### Performance Testing

**Benchmarks:**
| Operation | Current Baseline | Target | Max Acceptable |
|-----------|------------------|--------|----------------|
| buildTree + render, ~200 files | N/A (new) | 50 ms | 150 ms |
| Full refresh cycle, ~200 files | N/A (new) | 1 s | 1.5 s |

### Test Automation

**Tools:**
- Unit/Integration: **Vitest** (`spec/paths.spec.ts` extended with `buildTree` cases — same file consumed by page and tests, DR-MR-07).
- E2E: **Playwright**, `e2e/renderer.spec.ts` extended. As established in v0.3 §8: the native picker cannot be automated, so E2E drives the **`webkitdirectory` fallback** via `chooser.setFiles(<dir>)` — which conveniently *is* the fallback refresh path, so FR-9's fallback behaviour is fully automatable (refresh → picker → `setFiles` an extended fixture). The `fsapi` silent-refresh path is covered by unit-level tests of the state-restoration logic plus a manual Chromium check.
- All tooling remains **dev-only**; the shipped page stays build-free (DR-MR-06).

**CI/CD Integration:**
- Existing `ci.yml` runs `npm run verify` on PR/push; no workflow changes needed.

---

## 9. Migration Path

No data or user migration. The sidebar's flat list is replaced by the tree on upgrade; the filter behaviour users know is retained verbatim while filtering (DR-MR-11). No stored state exists to migrate (the page keeps no persistence). Rollback = revert the commit; the flat renderer remains in the codebase as the filter-mode view.

---

## 10. Alternatives Considered

### Alternative 1: Always-expanded full tree (no drilldown)

**Description:** Render the hierarchy fully expanded, with indentation only; no collapse affordance.

**Pros:**
- Simplest possible renderer; every file always visible; no state to manage.

**Cons:**
- Deep trees scroll worse than the current flat list — negates the feature's purpose.
- "Drilldown" was explicitly requested.

**Reason for Rejection:** Fails the core requirement (FR-11). Collapse state is cheap with `<details>`.

### Alternative 2: Custom ARIA `role="tree"` widget

**Description:** A hand-rolled tree with `role="tree"/"treeitem"`, full arrow-key navigation, and `aria-expanded` management.

**Pros:**
- Best-practice screen-reader semantics and richer keyboard model.

**Cons:**
- Substantially more JS and state to maintain by hand — against DR-MR-04's spirit.
- Native `<details>/<summary>` already gives click + Enter/Space toggling and is understood by assistive tech.

**Reason for Rejection:** Disproportionate for the current scope; recorded as the upgrade path if accessibility requirements grow (out of scope, §1).

### Alternative 3: Live file-watching instead of a Refresh button

**Description:** Observe the picked directory (`FileSystemObserver`) and update the sidebar automatically.

**Pros:**
- Zero-interaction freshness.

**Cons:**
- `FileSystemObserver` is experimental and Chromium-only; **nothing equivalent exists for the fallback**, so behaviour would silently differ by browser.
- Live-watching was declared out of scope in design v0.3 and remains so.

**Reason for Rejection:** An explicit, honest Refresh works on both backends today (DR-MR-08). Watching can layer on top later without design change.

### Alternative 4: Lazy per-folder enumeration on expand

**Description:** Enumerate only the root initially; walk a sub-folder when its node is first expanded.

**Pros:**
- Faster initial listing on very large trees.

**Cons:**
- Impossible on the fallback (the `FileList` snapshot is already flat and complete).
- Breaks the "folders with no markdown are omitted" rule (can't know without walking).
- Complicates refresh, filter, and `revealPath` for no benefit at assumed folder sizes (NFR-1).

**Reason for Rejection:** Eager walk is already proven fast enough; the tree stays a pure view over one flat list (DR-MR-09).

### Comparison Matrix

| Criterion | Chosen Design | Alt 1 (no collapse) | Alt 2 (ARIA tree) | Alt 3 (watching) | Alt 4 (lazy) |
|-----------|---------------|---------------------|-------------------|------------------|--------------|
| Complexity | Low | Lowest | High | Medium | High |
| Works on both backends | Yes | Yes | Yes | No | No |
| Meets FR-9..11 | Yes | No (FR-11) | Yes | Partially | Partially |
| Vanilla-JS fit (DR-MR-04) | High | High | Low | Medium | Medium |
| Testable in Node (DR-MR-09) | Yes | Yes | Partly | No | Partly |

---

## 11. Open Questions

### Technical Questions

_None open — both prior technical questions are resolved below._

### Business Questions

_None — the features are portfolio-internal ergonomics with no presentation-layer implications beyond §1._

### Resolved Questions

**Q1: On the fallback backend, should Refresh re-open the picker or be disabled with an explanatory tooltip?**
- **Answer:** Re-open the picker (keeps the feature functional everywhere; a disabled control helps nobody), with an inline message explaining the extra step. This is what DR-MR-08 and §5.3 assume.
- **Resolved By:** Gary Brooks
- **Resolved Date:** 2026-07-05
- **Impact on Design:** Confirms DR-MR-08 and the `refreshFolder` fallback path in §5.3 as written; FR-9 acceptance criteria unchanged.

**Q2: Initial expansion depth — folders collapsed at first population, or first level pre-expanded?**
- **Answer:** Collapsed (root-level entries visible, folders closed) — `revealPath` auto-expands wherever the user actually goes.
- **Resolved By:** Gary Brooks
- **Resolved Date:** 2026-07-05
- **Impact on Design:** Confirms FR-11's initial-state wording and the Sidebar Tree UI defaults in §5.2 as written.

**Q3: Should the tree replace the flat list outright, or sit behind a view toggle?**
- **Answer:** Replace it. The flat presentation survives only as the filter-mode view (DR-MR-11); a persistent toggle would double the UI states to test for no identified user.
- **Resolved By:** Design recommendation (this document)
- **Resolved Date:** 2026-07-05
- **Impact on Design:** Shapes FR-10, DR-MR-11, and §7's decision to retain the flat renderer for filter mode only.

---

## 12. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| Drilldown | Navigating into nested folders by expanding tree nodes in the sidebar. |
| `<details>/<summary>` | Native HTML disclosure elements providing built-in expand/collapse with keyboard support. |
| `DirectorySource` | The v0.3 abstraction over the two folder backends (`fsapi` handle / fallback `FileList`). |
| Snapshot semantics | The fallback's `FileList` is fixed at pick time; it cannot be re-walked and stale entries may fail to re-read. |
| Expansion state | The set of folder paths currently open, preserved across re-renders and refresh. |

### Appendix B: References

1. Design v0.3 (base document) — [`design-document.md`](design-document.md)
2. MDN — `<details>`: The Details disclosure element — https://developer.mozilla.org/docs/Web/HTML/Element/details
3. MDN — FileSystemHandle.requestPermission — https://developer.mozilla.org/docs/Web/API/FileSystemHandle/requestPermission
4. MDN — File System Access API — https://developer.mozilla.org/docs/Web/API/File_System_API

### Appendix C: Related Documents

- Base design document: `docs/design-document.md` (v0.3 — FR-1..8, DR-MR-01..07)
- Project README: `readme.md`
- Handover: `session-notes/markdown-renderer_session-notes_v2_20260705T1602Z.md` (portfolio root)

### Appendix D: Diagrams

See the high-level architecture and refresh data-flow diagrams in §4.

### Appendix E: Code Examples

```javascript
// Refresh glue (illustrative)
refreshButton.addEventListener('click', async () => {
  const source = await refreshFolder(currentSource);
  if (!source) return;                          // fallback picker cancelled
  currentSource = source;
  revokeAllObjectURLs();                        // existing FR-8 lifecycle
  const files = await listMarkdownFiles(source);
  const tree  = MarkdownRendererPaths.buildTree(files);
  renderTree(tree, sidebarList, sidebarState, select);
  const active = files.find(f => f.relativePath === sidebarState.activePath);
  if (active) { revealPath(active.relativePath, sidebarState); select(active); }
  else if (sidebarState.activePath) showNotice('The open file no longer exists.');
});
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v0.1 | 2026-07-05 | Gary Brooks | Initial draft: FR-9 (refresh), FR-10 (folder tree), FR-11 (drilldown), FR-5 amendment; DR-MR-08..11; Phases 4–5 |
| v0.2 | 2026-07-05 | Gary Brooks | Resolved open questions Q1 (fallback Refresh re-opens picker) and Q2 (initial tree state collapsed) per proposed answers; no design changes — both confirmed the draft as written |

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Author | Gary Brooks | Pending | 2026-07-05 |
| Reviewer | AI assistant (CLAUDE Fable 5) | Pending | 2026-07-05 |

---

*End of Design Document*
