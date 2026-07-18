# Project Review: markdown-renderer

[<- Back to Index](../00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Single-repository review: one product, assessed as its own artefact.

## Architecture and design patterns

- Single static page (`index.html` + `styles.css` + `app.js`) driving a two-pane layout, with
  five IIFE-scoped modules in [app.js](../../../app.js) - FolderAccess, Enumeration, Resolve,
  Render, UI - each a clear single responsibility, no framework, no build.
- The standout pattern is the **pure-core extraction**: all path/URL/tree decisions live in
  [src/paths.js](../../../src/paths.js) and are published on a global consumed identically by the
  browser (classic script, `file://`-safe) and the Node unit tests (side-effect import). This is
  the design's cleverest, most transferable idea (DR-MR-07/09).
- The `DirectorySource` abstraction (`{kind:'fsapi',...}` | `{kind:'input',...}`) normalises two
  very different browser backends behind one interface, with the fallback's snapshot semantics
  handled honestly rather than papered over (DR-MR-08).

## Code quality and maintainability

- Readable, idiomatic vanilla JS with `"use strict"`, small functions, and genuinely pedagogical
  comments (the inert-`<template>` rationale at [app.js](../../../app.js) lines 203-206; the
  `webkitRelativePath` prefix strip at lines 108-112).
- `src/paths.js` is total and defensive: `\`->`/` and `./` normalisation, a deterministic
  case-insensitive sort with a codepoint tiebreak, `try/catch` around `decodeURIComponent`.
- Maintainability aids: a hand-written `src/paths.d.ts` type contract, `DR-MR-*` decision IDs
  threaded from code to design docs, and a strict `tsconfig` (`noUnusedLocals`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`).
- Chief maintainability snag is the doc drift (R-02, R-05), not the code.

## Test coverage and approach

- **Healthy pyramid for a UI tool:** 23 Vitest unit tests over the pure helpers (broad, fast base:
  `isMarkdownPath`, `isExternal`, `resolvePath` incl. `.`/`..`/query/hash/percent-encoding,
  `buildTree` ordering/nesting/collisions/empty, `ancestorsOf`, `restoreTreeState`) + 11 functional
  Playwright E2E + 4 axe accessibility scans at the top.
- The E2E suite drives the real browser boundary against `sample-docs/` and covers the hard cases:
  tree nesting, drilldown, filter-flat-then-restore, blob-image resolution, internal-link
  navigation, external-link `target`/`rel`, refresh-adds-file-keeps-selection, and
  refresh-reports-vanished-file. It uses real temp dirs (`mkdtempSync`) for the refresh tests -
  proper integration, not mocks.
- A shared `openFolder` fixture ([e2e/fixture.ts](../../../e2e/fixture.ts)) keeps the accessibility
  lane reaching its states through the exact pipeline the functional tests prove - good design.
- **Gap:** file-row keyboard operability is neither implemented nor tested (R-01); the suite is
  Chromium-only (R-04); the `fsapi` silent-refresh path is (necessarily) unit-tested via
  `restoreTreeState` rather than E2E - a limitation the design states openly.

## Documentation quality

- Unusually rich for the size: two full design documents with alternatives matrices and
  resolved-question logs, a dedicated `docs/accessibility-lane.md` scoping the axe claim precisely,
  two implementation logs, `THIRD_PARTY_NOTICES.md`, and a `vendor/vendored-libraries.md` manifest
  with exact pinned source URLs.
- [docs/backlog.md](../../../docs/backlog.md) is a clean single source of truth (version 3,
  0 outstanding, resolved items retained as record) - and its claims verified true in this review.
- The one blemish: the base design document is stale (R-02) while everything else is current.

## Strengths and weaknesses

- **Strengths:** secure-by-default render pipeline; testable pure core; honest cross-backend
  handling; audit-ready licensing; disciplined, scope-limited accessibility claim; green gate and
  0 vulnerabilities.
- **Weaknesses:** mouse-only file selection (R-01, and it contradicts the project's own design);
  base-doc drift (R-02); thin timeout margin on the axe lane (R-03); single-engine E2E (R-04);
  documented-vs-actual sanitiser mechanism (R-05).

## Portfolio credibility

- High. This proves senior judgement a test-suite-only portfolio cannot: shipping a real product,
  reasoning about browser security sandboxing, extracting pure logic for testability, and being
  candid about limitations (fallback asymmetry, "not a WCAG conformance statement"). Closing R-01
  and R-02 would make it close to exemplary.

---

[<- Back to Index](../00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)
