# Architecture Assessment

[<- Previous: Recommendations](05_RECOMMENDATIONS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Test Pyramid

- The base has 23 fast unit tests over the pure path/tree core.
- The top has 12 functional E2E tests and four axe scans; for a small static UI, browser-heavy
  evidence is reasonable because DOM and file-picker behaviour are the product.
- The middle is thin: FolderAccess, Enumeration, Render, and Resolve are closure-private and have
  no component/integration tests.
- The missing middle explains both the untested FS API path and the need to reproduce the render
  race through a browser-level probe.
- Add adapter/component tests rather than indiscriminately increasing E2E count.

## SOLID Principles

### Single Responsibility

- Strong at module and helper level: path/tree maths is separate from folder I/O, rendering,
  resource resolution, and UI state.
- `UI` still coordinates state, folder adoption, selection, refresh, and theme, but the size is
  currently manageable.

### Open/Closed

- Descriptor/index shapes allow another folder source to be added with limited downstream change.
- The closed IIFEs make extension and isolated substitution harder than necessary for testing.

### Liskov Substitution

- Both source backends produce descriptors with `readText`/`readBlob`, and downstream rendering can
  substitute them.
- Behaviour is not fully substitutable: refresh and permission semantics differ, correctly
  documented but insufficiently tested.

### Interface Segregation

- The descriptor and index APIs are minimal.
- The `.d.ts` file captures the pure global API but not the richer internal folder/render
  contracts, leaving runtime assumptions implicit.

### Dependency Inversion

- The pure core depends on no browser or test framework.
- Folder and render modules reach browser globals directly. Small injected seams for
  `showDirectoryPicker`, URL creation/revocation, and content commit would improve tests without a
  framework rewrite.

## KISS

- Excellent alignment: vanilla scripts, one page, one state object, native controls, a
  dependency-free dev server, and direct npm scripts.
- The folder adapter abstraction and pure core solve real constraints rather than creating layers
  for their own sake.
- Recommended fixes should preserve this shape; a framework migration is not justified.

## YAGNI

- Live watching, editing, typed filesystem paths, a custom ARIA tree, remote Markdown, and a
  persistent view toggle were explicitly rejected.
- Chromium-only CI and a scoped axe lane reflect deliberate restraint, although primary-backend
  integration evidence is still needed.
- Visual baselines should start narrow rather than become a full cross-engine matrix.

## REST and OpenAPI

N/A - no HTTP application API exists. The local dev server is a static-file test utility, not a
product contract, and the browser file APIs are platform interfaces rather than REST resources.

## ISTQB-Aligned Strategy

- **Equivalence partitioning:** Markdown/non-Markdown extensions, internal/external references,
  existing/missing resources, root/nested files, and matching/non-matching filters are represented.
- **Boundary value analysis:** empty descriptor lists, root-level files, `.`/`..`, empty anchors,
  removed active files, and folder/no-folder states are covered.
- **State transition testing:** initial -> folder selected -> folder expanded -> file active ->
  filtered -> restored -> refreshed is well represented.
- **Decision tables:** FS API availability, permission state, refresh backend, and missing resource
  outcomes would benefit from an explicit decision table and adapter tests.
- **Use-case testing:** the main browse/read/navigate/refresh journeys are readable and
  user-oriented.
- **Non-functional testing:** four scoped accessibility states exist; performance, visual
  regression, and security-payload regression remain light.

## Runtime Lifecycle and Synchronisation

- Playwright locators and assertions give implicit synchronisation; committed tests contain no
  arbitrary sleeps.
- Test data mutations use unique temporary directories and `finally` cleanup.
- Object URLs are revoked before a new render under sequential use.
- No concurrency policy exists for overlapping renders, producing R-01.
- Sequential image awaits can extend the stale window for image-heavy Markdown; a generation check
  is more important than parallelising images.

## CI Architecture

- Local and CI gates are aligned and currently pass.
- npm cache and `npm ci` provide lockfile reproducibility; browser installation is explicit.
- Failure artifacts and axe JSON make red runs diagnosable.
- Separate CI/Pages push triggers violate fail-closed deployment ordering.
- Actions are version-tag pinned rather than immutable SHA pinned; consider SHA pinning as a
  supply-chain hardening follow-up.

## Security and Licence

- Untrusted Markdown is sanitised and remote images are suppressed.
- External links gain `noopener noreferrer`; no tokens or remote APIs exist.
- Vendor audit coverage is the main security-process gap, not an established current XSS exploit.
- Apache-2.0 and all third-party licence texts/provenance are present and consistent.

## Pedagogical Comments

- Comments explain why the page uses classic scripts, why the picker fallback exists, why template
  content is inert, and why native controls are preferred.
- Design documents record alternatives and decisions, which makes the repository teach judgement.
- Reproducing and fixing R-01 would add a valuable example of async UI ownership.
- A fake directory-handle fixture would teach how to test browser-native boundaries without
  automating OS dialogs.

---

[<- Previous: Recommendations](05_RECOMMENDATIONS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Migration Plans ->](07_MIGRATION_PLANS.md)
