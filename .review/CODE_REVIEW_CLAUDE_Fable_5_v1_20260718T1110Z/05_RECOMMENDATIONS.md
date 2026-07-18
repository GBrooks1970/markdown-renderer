# Recommendations

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

## Recommended Refactors (priority order)

- **Make sidebar file rows keyboard-operable (R-01).** Render the row label as a
  `<button type="button">` (or add `role="button"` + `tabindex="0"` + Enter/Space `keydown`) in
  `fileItem` ([app.js](../../app.js) lines 252-270), aligning code with the folder-nav design.
  Highest-value change: closes a Level A gap on the product's core action.
- **Reconcile the base design document with reality (R-02).** Status -> Implemented; traceability
  rows -> current tests; tech-stack table -> Vitest 4 (node env) + Playwright 1.5x; add a v0.4
  history line. Docs-only.
- **Correct the FR-8 sanitiser wording (R-05).** Describe the real mechanism (post-sanitise blob
  substitution on an inert template), not a sanitiser allow-list. Docs-only.

## Next Steps (immediate, low effort)

- **Add axe-lane timeout headroom / a CI retry (R-03)** so a cold runner cannot flake the gate:
  `test.describe.configure({ timeout: 60_000 })` in the accessibility spec and/or
  `retries: process.env.CI ? 1 : 0` in [playwright.config.ts](../../playwright.config.ts).
- **Add a keyboard-selection E2E assertion** alongside the R-01 fix (focus a file row, press Enter,
  assert it renders) so the gap cannot silently reopen.
- **Bump `@types/node` to `^24`** to match the CI Node runtime, and take the Vitest/Playwright patch
  bumps (R-06) on the next maintenance pass.

## Future Project Ideas (longer term)

- **Cross-engine E2E (R-04):** add `webkit`/`firefox` Playwright projects for the render/fallback
  specs to actually prove the cross-browser degradation the product markets.
- **Visual-regression baselines:** a rendering-fidelity tool is the natural home for Playwright
  screenshot baselines (already noted as a backlog "next step" and in the portfolio backlog) - would
  guard the highlight-theme contrast fix (MR-09) against regression.
- **Optional coverage gate:** a `vitest run --coverage` threshold on `src/paths.js` would turn the
  strong-but-unquantified unit story into a measured one.
- **Formal close-project run:** the backlog flags the product at a genuine close point; a terminal
  FINAL handover after these refinements would cap it cleanly.

---

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)
