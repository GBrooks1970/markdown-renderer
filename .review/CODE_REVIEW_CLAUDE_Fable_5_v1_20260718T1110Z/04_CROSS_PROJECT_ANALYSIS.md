# Cross-Cutting Analysis (within the repo)

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Per the template's single-repository customisation, this is a cross-cutting analysis *within* the
one repo - runtime page vs pure helpers vs unit suite vs E2E suite vs CI vs docs. Screenplay- and
API-specific headings are kept and marked `N/A`.

## Single Source of Truth (page vs tests)

- Genuinely single-sourced: [src/paths.js](../../src/paths.js) is loaded verbatim by both the page
  (classic `<script>`) and the unit tests (side-effect import), so the tested logic *is* the
  shipped logic - no reimplementation drift possible (DR-MR-07/09).
- `sample-docs/` is the single fixture for both functional and accessibility E2E, so all browser
  tests exercise one representative corpus.
- Weakness: the *documentation* single-source is split - the backlog is authoritative and current,
  but the base design doc claims to be authoritative and is stale (R-02).

## Tool-Agnostic / Code-Agnostic Tests

- Unit tests are code-agnostic in the useful sense: they assert pure input/output contracts of
  `paths.js`, independent of DOM or browser. They would survive an internal refactor untouched.
- E2E tests are coupled to DOM structure (`#file-list > li`, `.tree-dir > summary`) - appropriate
  for a UI product, but it means a markup change (e.g. the R-01 `<li>`->`<button>` fix) will
  require test updates. That is expected, not a defect.

## API Contract Compliance (REST/OpenAPI)

- **N/A** - no network API. The product is entirely client-side against local files; there is no
  REST surface, no OpenAPI document, and (by design, DR-MR-02) no runtime network at all.

## Screenplay Parity

- **N/A** - this is a shipped product, not a Screenplay test suite; the portfolio registry
  explicitly exempts it from Screenplay conventions. The relevant "pattern faithfulness" question
  (is the implementation faithful to its own design?) is covered in the Project Review: faithful
  except the file-row `<button>`-vs-`<li>` divergence (R-01).

## Batch File / Script Design

- **N/A (light).** The only script is [scripts/dev-server.mjs](../../scripts/dev-server.mjs), a
  dependency-free Node static server. It is well-scoped: content-type map, path-traversal guard
  (`filePath.startsWith(root)`), 403/404 handling. No batch/PowerShell tooling to assess.

## Documentation Alignment

- Backlog <-> repo: **aligned** (verified: 0 outstanding, MR-09 resolved, FR-1..11 live).
- Folder-nav design <-> code: **aligned** (traceability `Implemented`).
- Base design <-> code: **misaligned** (R-02 - status, traceability, tech-stack table).
- README <-> code: **mostly aligned**; the sanitiser-permits-blob wording (R-05) and "authoritative
  design document" pointer (which points at the stale doc) are the two soft spots.

## Logging / Observability Alignment

- Minimal and appropriate: user-facing errors surface as in-page `notice(...)` blocks; genuine
  faults `console.error` (folder read failure, [app.js](../../app.js) line 348). Consistent style,
  no noisy logging in the shipped page. Axe violations are attached as JSON to the Playwright
  report on failure - good test observability.

## Test Coverage Metrics (quantitative)

- Unit: 23 tests, 1 file, all pure-helper (`spec/paths.spec.ts`). Fast (~46 ms test time).
- E2E: 15 tests (11 functional + 4 axe), 1 project (chromium).
- No coverage instrumentation is configured (`coverage/` is gitignored but no `--coverage` gate).
  For a project whose logic is concentrated in one small pure module thoroughly exercised, this is
  acceptable; a `vitest --coverage` line would make the claim quantitative (see Recommendations).
- Balance: broad pure base + focused browser top = a sound pyramid for a UI tool (details in
  [06_ARCHITECTURE_ASSESSMENT.md](06_ARCHITECTURE_ASSESSMENT.md)).

---

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Recommendations ->](05_RECOMMENDATIONS.md)
