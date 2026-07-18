# Executive Summary

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Risks and Issues ->](02_RISKS_AND_ISSUES.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

`markdown-renderer` is a self-contained, build-free, offline static web page that renders a chosen
local folder of Markdown files. It is a genuinely shipped product (public repo, live GitHub Pages
demo), reviewed here as its own artefact rather than against portfolio Screenplay conventions. It
is a strong, honest portfolio piece: small, inspectable, secure-by-default, and unusually
well-documented for its size. The findings below are refinements, not rescue work - the backlog's
"complete, published, feature-extended, 0 outstanding" claim is substantially accurate.

## Design Quality

- **Clean separation of pure logic from I/O and DOM.** The bug-prone path/URL/tree logic lives in
  one dependency-free module ([src/paths.js](../../src/paths.js)) published on a global, so the
  browser loads it as a classic script and the unit suite tests the *same* code in Node - a
  deliberate, well-justified design (DR-MR-07/09) that pays off in test quality.
- **Secure by construction.** Markdown is parsed, then DOMPurify-sanitised, then rendered on an
  **inert** `<template>` so relative images never fetch before rewriting, and only same-folder
  `blob:` URLs are ever injected ([app.js](../../app.js) lines 142-213). External links get
  `rel="noopener noreferrer"`. This is careful, threat-aware work.
- **Honest progressive enhancement.** The File System Access API path and the `webkitdirectory`
  fallback are normalised behind one `DirectorySource` abstraction, and the design is candid that
  fallback refresh must re-open the picker (DR-MR-08) rather than pretending parity.
- **Decisions are traceable.** Every structural choice carries a `DR-MR-*` identifier tying code to
  two thorough design documents. Rare at this scale.
- **Weak spot:** the *base* design document (v0.3) has not kept pace with the shipped code - stale
  status, "Not Started" traceability, and a wrong tech-stack table (see R-02).

## Code Quality

- **Idiomatic, readable vanilla JS.** IIFE module boundaries, small functions, `"use strict"`,
  pedagogical comments that explain *why* (the inert-template trick, the `webkitRelativePath`
  prefix strip). No framework, no build, no dead weight.
- **The pure helpers are excellent** - total functions, deterministic ordering with a codepoint
  tiebreak, defensive normalisation of `\` and `./`. They read like a textbook example of testable
  design.
- **The one real code gap is accessibility of the sidebar file rows** (R-01): non-focusable
  `<li>` click targets, where the folder-navigation design itself called for `<button>` rows.
- **Minor doc-vs-code drift** in the sanitiser configuration claim (R-05) and a small dead-comment
  (marked configured with `gfm: true` while the design table says GFM line breaks off - consistent,
  but the README/design wording could mislead).

## Main Highlights

- 0 npm vulnerabilities; dev-only tooling on current major versions (Vitest 4, Playwright 1.61).
- 23 Vitest unit tests + 15 Playwright E2E (incl. a 4-state axe-core accessibility lane inside the
  gate) - a healthy pyramid for a UI product: broad pure-logic base, focused browser top.
- Exemplary licensing: Apache-2.0, `THIRD_PARTY_NOTICES.md`, per-library pinned licence texts under
  `vendor/licenses/`, and a vendoring manifest with exact source URLs.
- CI (`verify` on Node 24) and a runtime-files-only Pages deploy, both green on `main`.

## Pedagogical Value

- **High.** It teaches a real, transferable lesson most test-suite portfolios cannot: how to make
  DOM-coupled browser code testable by extracting pure logic and sharing it verbatim between the
  runtime and the tests. The security pipeline (sanitise-then-resolve on an inert fragment) and the
  honest backend-asymmetry story are both instructive.
- The design documents model good engineering communication (alternatives-considered matrices,
  resolved-questions logs) - useful reading for mid-level engineers, provided the base document's
  drift (R-02) is corrected so it does not teach a stale story.

---

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Risks and Issues ->](02_RISKS_AND_ISSUES.md)
