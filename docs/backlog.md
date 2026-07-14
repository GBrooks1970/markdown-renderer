<!--
  AUDIENCE: Engineers and AI agents maintaining this project.
  PURPOSE:  Single source of truth for outstanding work, risks, and planning.
  LOCATION: docs/backlog.md
-->

# Markdown Renderer — Backlog

**Version:** 3 — MR-09 accessibility evidence lane delivered (portfolio P-08)
**Last Updated:** 2026-07-14
**Based on:** session-notes handover **v3** (2026-07-05T2258Z) and the repo at `main`.

This backlog is the project's **source of truth** for item status — handovers narrate, this file
records. Ordering is by priority score (highest first).

> **Project nature.** Unlike the Screenplay *test* projects in this portfolio, `markdown-renderer`
> is a **shipped product**: a static, offline, browser-based Markdown viewer (pick a folder →
> sidebar tree → rendered pane). Its "tests" are its own suite (Vitest units + Playwright E2E), and
> its gate is `npm run verify` (typecheck + Vitest + Playwright). Live demo:
> <https://gbrooks1970.github.io/markdown-renderer/>.

**Priority Scoring System:**
- **Score = Security Impact (0–10) + Breakage Probability (0–10) + Maintenance Burden (0–10)**
- **HIGH (20–30):** Critical — immediate action required
- **MEDIUM (10–19):** Important — schedule within the current cycle
- **LOW (0–9):** Desirable — schedule when capacity allows

---

## Outstanding Risks

**None outstanding.** MR-09 (the accessibility evidence lane, opened from portfolio P-08) was
resolved in the same cycle that opened it — see Resolved / Shipped. The product remains
**complete, published, and feature-extended**: FR-1..FR-11 and MR-09 are implemented and live, the
`verify` gate is green, CI is green on `main`, and the GitHub Pages demo serves the current build.

---

### Resolved / Shipped

Kept as a record of what has been delivered — do not delete.

#### MR-09 — Accessibility evidence lane (axe-core) — 8 LOW — ✅ RESOLVED 2026-07-14

**Source:** portfolio backlog **P-08** ("Add a focused accessibility evidence lane"), which selects
this project as host. Design note: [`docs/accessibility-lane.md`](accessibility-lane.md) — written
first, so the scope of the claim is fixed by design.

**Score:** Security Impact 0 + Breakage Probability 3 + Maintenance Burden 5 = **8**.

**Delivered:** `@axe-core/playwright` (dev-only; `npm audit` stayed 0) and
`e2e/accessibility.spec.ts` scanning four representative states (initial page; tree populated and
drilled; document rendered; filter flat list) against the axe tags
`wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa` (`best-practice` deliberately excluded), inside the
existing `npm run verify` gate — CI check name `verify (Node 24)` unchanged, no runtime dependency
or build step added. One violation found and **fixed** (S3 `color-contrast` in the vendored
github-light highlight theme — recoloured via a light-theme-scoped override in `styles.css`); **no
waivers**. README claims exactly the states and tags scanned. Findings record:
[`docs/accessibility-lane.md`](accessibility-lane.md) §7; implementation log:
[`implementation-logs/2026-07-14_mr-09-accessibility-lane.md`](implementation-logs/2026-07-14_mr-09-accessibility-lane.md).

#### Base viewer (FR-1..FR-8, DR-MR-01..07) — ✅ SHIPPED

Static offline Markdown viewer: folder picker (not a typed path), vendored `marked` / `DOMPurify` /
`highlight.js` (not CDN), sanitised render, vanilla classic scripts for `file://`, blob-URL resource
resolution (FR-8). Design: [`docs/design-document.md`](design-document.md) v0.3. Delivered
2026-06-15 (tests + git init); published with CI + Pages 2026-07-05 (handover v2).

#### Folder navigation (FR-9..FR-11, FR-5 amendment, DR-MR-08..11) — ✅ SHIPPED

Refresh (FR-9, picker re-open fallback), folder **tree** sidebar built by a pure `buildTree()` in
`src/paths.js` (FR-10), `<details>`-based drilldown with expansion state surviving
selection/filter/refresh (FR-11), and the FR-5 filter amended to a flat list. Design:
[`docs/design-document-folder-navigation.md`](design-document-folder-navigation.md) v0.3. Delivered
and merged 2026-07-05 (PRs #1 design, #2 implementation); live demo verified.

---

## Risk Summary

| Priority | Count | Status Distribution |
|---|---|---|
| HIGH (20–30) | 0 | — |
| MEDIUM (10–19) | 0 | — |
| LOW (0–9) | 0 | — |
| **Total Outstanding** | **0** | — |
| Resolved / Shipped | FR-1..FR-11, MR-09 | all delivered and live |

---

## Potential Next Steps

Not yet prioritised as risks — the natural next tranche, should the project be picked up again.

### LOW Priority
1. **Formal close-project run** — the handover v3 successor path: verify every public claim, retire
   any worklist, write a terminal FINAL handover. The product is at a genuine close point.
2. ~~**Accessibility pass (axe-core)**~~ — ✅ delivered as **MR-09** (2026-07-14, portfolio P-08).
3. **Visual-regression baselines** — a viewer whose whole point is rendering fidelity is the natural
   fit for Playwright screenshot baselines / Percy. *(See PORTFOLIO_BACKLOG Part B gap 5.)*
4. **`.html` companions for the handovers** — v1..v3 handovers are `.md`-only; generate the `.html`
   pair for consistency with the other projects. *(Portfolio finding 4.)*

---

## Maintenance Notes

- Update the version number at the top when items change status; mark completion dates on ✅ items.
- The gate is `npm run verify`; keep it green before any merge. CI runs it on Node 24 and deploys Pages.
- All changes to `main` go via branch + PR (the harness blocks direct pushes).
- Verify the live Pages URL **content** (not just run status) after any deploy — transient
  `deploy-pages@v4` failures are known (handover v3); `gh run rerun <id> --failed` clears them.
