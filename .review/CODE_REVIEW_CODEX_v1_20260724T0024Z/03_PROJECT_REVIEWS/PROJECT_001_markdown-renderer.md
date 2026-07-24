# Project Review: markdown-renderer

[<- Previous: Risks and Issues](../02_RISKS_AND_ISSUES.md) | [Back to Index](../00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)

**Reviewer:** AI assistant (Codex GPT-5)

Single-repository review: this file assesses one shipped application and its own test architecture.

## Architecture and Design Patterns

- A static HTML/CSS/classic-JavaScript runtime is an appropriate fit for offline and `file://`
  operation; no framework or production build is required.
- [app.js](../../../app.js) separates FolderAccess, Enumeration, Resolve, Render, and UI through
  IIFEs. These boundaries are easy to read, though closures make targeted integration testing and
  dependency injection harder.
- [paths.js](../../../src/paths.js) is the strongest design choice: pure path and tree operations
  are shared by the browser and Vitest without changing the shipped module format.
- A `DirectorySource` discriminant normalises FS API handles and fallback `FileList` inputs after
  acquisition, but their distinct enumeration and refresh behaviour remains visible and should be
  tested as two adapters.
- Rendering sanitises before parsing into an inert template, then rewrites resources with DOM
  properties; this preserves a clear trust boundary.
- The Render/UI async contract needs an explicit latest-operation rule (R-01).

## Code Quality and Maintainability

- Functions are short, names reflect responsibility, and comments usually explain constraints
  rather than restating syntax.
- State is small and explicit: source, descriptors, index, active path, and expanded folder paths.
- Native controls provide semantics and avoid hand-built keyboard behaviour.
- Object-URL cleanup and refresh reconciliation show attention to browser lifecycle details.
- Silent catches are used narrowly, but unreadable subdirectories are not surfaced or counted as
  the design claims.
- Strict TypeScript settings protect tests and contracts; `checkJs: false` leaves the main runtime
  dependent on behavioural coverage.

## Test Coverage and Approach

- 23 Vitest tests form a fast base for extension checks, external-URL classification, path
  normalisation, tree ordering, ancestor calculation, and refresh restoration.
- 12 functional Playwright tests cover folder population, tree drilldown, keyboard activation,
  Markdown rendering, filtering, image blobs, link behaviour, and isolated refresh scenarios.
- Four axe tests reach representative states through the shared functional fixture and make a
  precise WCAG-tag claim with no waivers.
- Temporary directories in refresh tests provide isolated mutable data and are removed in
  `finally` blocks.
- No `skip`, `fixme`, quarantine tag, focused-only test, or planned executable test was found.
- Coverage gaps are concurrency (R-01), the FS API adapter (R-03), production-JS static checking
  (R-05), and visual rendering (R-07).

## Runtime Lifecycle, Isolation, and Stability

- Playwright uses a single reusable dev server locally and a fresh server in CI; test browser
  contexts isolate page state.
- Functional tests are fully parallel and use read-only shared sample files except for uniquely
  named temporary copies.
- Explicit browser assertions replace arbitrary sleeps in the committed suite.
- The accessibility lane has scoped 60-second timeout headroom and one CI retry, avoiding a global
  stability concession.
- Folder refresh drops stale expanded paths, restores a surviving active file, and reports a
  vanished active file.
- Overlapping document renders are not isolated; a slower prior request can commit after the
  current one.

## Data, API, Token, and Authentication Assumptions

- N/A - there is no remote API, REST/OpenAPI contract, account, credential, token, or session.
- User data is local and selected through browser-granted folder access.
- The fallback fixture uses repository sample documents; refresh tests copy them to unique OS temp
  directories.
- Remote images are removed and external links require an explicit user click to leave the viewer.
- No secrets or credential-like tracked files were found in the repository scan.

## CI, Deployment, and Reproducibility

- CI uses Node 24, `npm ci`, setup-node's npm cache, and Playwright's supported Chromium installer.
- The project gate is exactly `npm run verify`, matching the registry and README.
- Failure-only HTML reports include axe JSON attachments; successful runs publish no coverage or
  test-result artifact.
- Workflow permissions are scoped: CI is read-only, while Pages grants deployment permissions only
  to the deploy job.
- Pages copies only runtime, vendor, source helper, and sample files, preserving the no-build
  distribution.
- Pages is not ordered after CI, so production does not fail closed on main-branch verification
  (R-04).

## Documentation Quality

- Two design documents record requirements, alternatives, traceability, and decisions.
- The accessibility note limits its public claim to four states and named axe tags rather than
  claiming general WCAG conformance.
- The backlog is a clear source of truth and retains shipped/resolved work as history.
- Implementation logs explain both accessibility and third-party licence work.
- Vendor provenance and complete licence texts are unusually strong.
- Remaining contradictions in Node support, jsdom, unreadable-entry counting, and document status
  should be corrected together (R-06).

## Strengths and Weaknesses

- **Strengths:** proportional architecture, testable pure core, defensive render pipeline,
  deterministic test data, credible accessibility scope, and complete legal provenance.
- **Weaknesses:** stale async completion, unproved primary backend, vendor audit blind spot,
  independently triggered deployment, and a small documentation/static-analysis gap.

## Portfolio Credibility

The repository demonstrates senior judgement beyond test-framework syntax: it ships a useful
product, works within browser security constraints, exposes architectural decisions, and creates
multiple evidence layers. Addressing R-01 through R-04 would make its reliability and delivery
claims match the quality of its design narrative.

---

[<- Previous: Risks and Issues](../02_RISKS_AND_ISSUES.md) | [Back to Index](../00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Cross-Cutting Analysis ->](../04_CROSS_PROJECT_ANALYSIS.md)
