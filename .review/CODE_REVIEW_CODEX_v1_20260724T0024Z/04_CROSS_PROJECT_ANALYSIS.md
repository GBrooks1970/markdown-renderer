# Cross-Cutting Analysis

[<- Previous: Project Review](03_PROJECT_REVIEWS/PROJECT_001_markdown-renderer.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (Codex GPT-5)

This is a single-repository review. "Cross-cutting" means alignment among the application,
functional core, browser tests, accessibility lane, CI, deployment, documentation, and vendored
runtime.

## Tool-Agnostic Tests

- Behavioural intent is expressed through user-visible roles, labels, headings, file names, and
  content, so most functional scenarios could be ported to another browser runner.
- Unit cases are plain input/output examples around paths and trees and are not conceptually tied
  to Vitest.
- The fixture and Playwright APIs are tool-specific implementation detail, but the scenarios do
  not encode a Playwright-only architecture.
- Axe integration is intentionally Playwright-specific because it shares the existing page fixture
  and report mechanism.

## Code-Agnostic Tests

- Path resolution and tree requirements are expressed as data transformations and could be
  reimplemented in another language.
- Browser scenarios depend on web-platform behaviour and DOM semantics, not internal function
  names, with a few CSS selectors used for structural assertions.
- There is no executable Gherkin layer; for a product this small, direct test names are clearer and
  avoid unnecessary glue.
- The concurrency and FS API gaps arise because some behaviour is hidden inside closures, not
  because the tests are coupled to a Screenplay pattern.

## Single Source of Truth

- [backlog.md](../../docs/backlog.md) is the canonical status record and reports zero outstanding
  work at review start.
- Requirements are duplicated across the base design, folder-navigation design, README, backlog,
  code comments, and implementation logs; traceability is strong but duplication causes R-06.
- `src/paths.js` is genuinely shared between browser and unit runtime, avoiding a test-only
  reimplementation.
- The vendor manifest and third-party notices agree on shipped versions and licences.

## API Contract Compliance

N/A - the application has no REST, OpenAPI, WebSocket, authentication, or remote data contract.
The relevant boundary is the browser File System Access API plus fallback `FileList`. Those two
adapters expose a common descriptor/index shape, but only the fallback is executed by tests.

## Screenplay Parity

N/A - this is a shipped browser product, not a Screenplay automation suite. Imposing Actors,
Abilities, Tasks, Questions, or Gherkin step glue would add ceremony without improving its current
test intent.

## Batch File Design

N/A - there are no batch or PowerShell launchers. npm scripts provide one cross-platform command
surface, and the dependency-free Node dev server supports local and CI use.

## Documentation Alignment

- README, backlog, designs, accessibility note, implementation logs, notices, and workflows agree
  on the core product shape: static, offline, local folder selection, vendored runtime, Vitest plus
  Playwright.
- The backlog's shipped features are present and the current full gate passes.
- The paired handover v5 is advisory-stale per preflight even though it names current head
  `d51b056`; current-tree evidence takes precedence.
- Node 18 support, jsdom use, unreadable-entry counts, and the accessibility-note status are small
  remaining contradictions.
- The backlog should not be called current after this review until the new findings receive owner
  dispositions.

## Logging Alignment

- Browser read failures become visible inline notices; folder adoption errors also write the
  caught error to the console.
- Unreadable subdirectories are silently skipped, which prevents a user from knowing that the
  visible tree is incomplete.
- Playwright list and HTML reporters provide readable local/CI output; axe violations are attached
  as JSON.
- No central runtime logger is justified for an offline static page.

## Test Coverage Metrics

- Vitest: 1 file, 23 tests, 23 passed in the review gate.
- Playwright: 2 files, 16 tests, 16 passed (12 functional plus 4 accessibility).
- Automated browser engine: Chromium only.
- Automated folder backend: fallback `webkitdirectory` only.
- Statement/branch/function coverage: N/A - no coverage collector or threshold is configured.

## CI and Infrastructure Alignment

- `npm run verify` is identical locally and in CI, supporting reproduction.
- npm caching is used; Playwright browser binaries are installed each run rather than cached,
  favouring correctness over a brittle large cache.
- `ubuntu-latest` and major action tags are mutable inputs; SHA pinning would improve supply-chain
  reproducibility.
- Failure reports are retained for 14 days and named by run/attempt.
- The Pages workflow has least-privilege job permissions but is not gated by CI success.

## Dependency, Security, and Licence Alignment

- `npm audit --audit-level=low` returned zero vulnerabilities for the development dependency tree.
- `npm outdated` showed only new majors for `@types/node` and TypeScript; installed wanted versions
  were current for the declared ranges.
- Vendored Marked, DOMPurify, and highlight.js are outside the npm audit; the DOMPurify OSV query
  demonstrates the visibility gap even where current call-site applicability is not proved.
- No credential-like tracked files or source matches were found in the scoped secret scan.
- Apache-2.0, third-party notices, versioned upstream licence texts, and vendor source URLs are
  present and consistent.

---

[<- Previous: Project Review](03_PROJECT_REVIEWS/PROJECT_001_markdown-renderer.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)
