# Architecture Assessment

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Alignment and gaps against the template's seven lenses.

## Test Pyramid

- **Well-shaped for a UI product.** Broad, fast base of 23 pure-logic unit tests over
  `src/paths.js`; a focused top of 15 Playwright E2E (11 functional + 4 axe) through the real
  browser boundary. No redundant mid-tier - appropriate, since the only non-trivial pure logic *is*
  the path/tree module and the rest is DOM wiring best proven end-to-end.
- **Gap:** no coverage instrumentation and no keyboard-path E2E (R-01). The `fsapi` silent-refresh
  branch is covered at unit level (`restoreTreeState`) rather than E2E - an accepted, documented
  limitation (the native picker cannot be automated).

## SOLID

- **SRP:** strong. Each IIFE module owns one concern (access/enumeration/resolve/render/UI), and
  the pure decisions are isolated in `paths.js`.
- **OCP/DIP:** the `DirectorySource` tagged union lets Enumeration and Refresh treat both backends
  uniformly; adding a backend means one new `kind` branch, not scattered edits.
- **ISP:** `src/paths.d.ts` defines a minimal `TreeDescriptor` (`{relativePath}`) rather than
  demanding the full descriptor - deliberate interface segregation.
- **LSP:** N/A in the classical sense (no inheritance hierarchy); the two `DirectorySource`
  variants are behaviourally substitutable behind the enumeration interface.

## KISS

- Exemplary. No framework, no build, no runtime dependency the page does not need; the tree is a
  pure transform over data that already existed; refresh re-runs an existing pipeline. Complexity is
  spent only where the domain demands it (browser sandbox, blob lifecycle).

## YAGNI

- Well-observed. Live file-watching, lazy enumeration, a custom ARIA tree, and a typed-path server
  were all considered and *rejected* with recorded rationale (design §10 alternatives matrices) -
  the discipline of not building them is documented, which is the ideal.
- Minor counter-signal: the FR-8 doc describes a sanitiser allow-list that was never needed and
  never built (R-05) - a documentation remnant of an unbuilt approach.

## REST + OpenAPI

- **N/A** - no API surface by design (offline, no runtime network). Nothing to align to.

## ISTQB Strategies

- **Equivalence partitioning / boundary analysis** are visible in the unit suite: markdown vs
  non-markdown extensions, external vs internal refs, `.`/`..`/root-slash path cases, empty-input
  tree, case-only-differing filenames, folder/file name collisions.
- **State-transition** thinking underlies `restoreTreeState` (expanded-set survival, active-file
  vanish) and the refresh E2E (add-file / vanish-file). Decision-table-style coverage of the
  fallback-vs-fsapi behaviours is present in the design, partially in tests.
- **Gap:** no explicit negative test for malformed/binary "markdown" content rendering safely
  (though DOMPurify + inert template make it low-risk).

## Pedagogical Comments

- Above average. Comments explain *why* (the inert-`<template>` no-fetch trick, the
  `webkitRelativePath` prefix strip, why the sort has a codepoint tiebreak, why classic scripts and
  a global instead of ES modules). Design docs and `DR-MR-*` IDs extend the teaching. The main risk
  to the pedagogy is the stale base document (R-02) teaching a wrong stack.

---

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)
