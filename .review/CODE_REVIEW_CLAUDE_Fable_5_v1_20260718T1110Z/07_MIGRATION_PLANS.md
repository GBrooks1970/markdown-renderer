# Migration Plans

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Annex - Metrics ->](ANNEX/METRICS.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

The template's three canonical plans are scoped to this single, dependency-free static product.
Where a plan does not apply it is kept as a heading with a one-line justification.

## Plan 1: Single Source of Truth for Features

The product already single-sources its *logic* (`src/paths.js` shared by page and tests). The
migration worth doing is on the *documentation* side - retiring the stale base design document as an
authority.

- Flip [docs/design-document.md](../../docs/design-document.md) status `Draft` -> `Implemented`.
- Set every Requirements Traceability row from `Not Started` to its real state (all `Implemented`).
- Correct the technology-stack table: Vitest 4 (node env, not jsdom), Playwright 1.5x.
- Add a v0.4 Document-History row recording the reconciliation.
- Point the README's "authoritative record" phrasing at the backlog for *status*, keeping the
  design docs authoritative for *decisions* only.
- Verify: no code change, so `npm run verify` remains green; the change is purely truth-in-docs.

## Plan 2: Docker Compose for Local Development

- **N/A** - the product is a static, offline, build-free page with a dependency-free Node dev server
  ([scripts/dev-server.mjs](../../scripts/dev-server.mjs)). Containerisation would add ceremony
  against the project's explicit zero-toolchain goal (DR-MR-02/04). `npm run dev` (or opening
  `index.html`) is the correct local-dev story; no compose file is warranted.

## Plan 3: GitHub Actions / Workflow (current status and next steps)

Two workflows exist and are healthy; the plan is incremental hardening, not migration.

- **CI** ([.github/workflows/ci.yml](../../.github/workflows/ci.yml)): `verify (Node 24)` runs
  typecheck + Vitest + Playwright on PR/push to main, installs Chromium with deps, uploads the
  Playwright report on failure. Green on `main` (verified via `gh run list`).
- **Pages** ([.github/workflows/pages.yml](../../.github/workflows/pages.yml)): stages
  runtime-files-only (`index.html`, `styles.css`, `app.js`, `src`, `vendor`, `sample-docs`) and
  deploys - correctly keeping tests/docs out of the published site. Green on `main`.
- **Next steps:** add axe-lane timeout headroom + a CI retry (R-03) to protect the gate from cold
  flake; bump `@types/node` to match the Node 24 runtime (R-06); optionally add cross-engine E2E
  projects (R-04) and a coverage step. The Pages staging list is the deployment manifest - any new
  runtime file must be added to its `cp` list (a lesson already recorded in the design's refactoring
  section).

---

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Annex - Metrics ->](ANNEX/METRICS.md)
