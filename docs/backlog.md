<!--
  AUDIENCE: Engineers and AI agents maintaining this project.
  PURPOSE:  Single source of truth for outstanding work, risks, and planning.
  LOCATION: docs/backlog.md
-->

# Markdown Renderer — Backlog

**Version:** 2 — MR-09 accessibility evidence lane opened (portfolio P-08)
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

### MR-09 — Accessibility evidence lane (axe-core) — 8 LOW — 🔓 OPEN

**Source:** portfolio backlog **P-08** ("Add a focused accessibility evidence lane"), which selects
this project as host. Design note: [`docs/accessibility-lane.md`](accessibility-lane.md) — written
first, so the scope of the claim is fixed by design.

**Score:** Security Impact 0 + Breakage Probability 3 + Maintenance Burden 5 = **8**.

**Scope:** add `@axe-core/playwright` (dev-only) and an `e2e/accessibility.spec.ts` that scans four
representative states (initial page; tree populated and drilled; document rendered; filter flat
list) against the axe tags `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa` (`best-practice` deliberately
excluded), inside the existing `npm run verify` gate. Violations are fixed where the build-free/
vendored/`file://` runtime contract allows, otherwise recorded as narrow per-rule, per-scope
waivers in the design note. README then claims exactly the states and tags scanned — nothing more.

**Invariants:** no runtime dependency or build step; `npm audit` stays 0; the CI check name
`verify (Node 24)` is unchanged.

---

Prior to MR-09, as of handover v3 the product was **complete, published, and feature-extended**:
FR-1..FR-11 are all implemented and live, the `verify` gate is green (typecheck + 23 Vitest + 11
Playwright), CI is green on `main`, and the GitHub Pages demo is verified serving the current build.

---

### Resolved / Shipped

Kept as a record of what has been delivered — do not delete.

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
| LOW (0–9) | 1 | MR-09 open |
| **Total Outstanding** | **1** | MR-09 |
| Resolved / Shipped | FR-1..FR-11 | all delivered and live |

---

## Potential Next Steps

Not yet prioritised as risks — the natural next tranche, should the project be picked up again.

### LOW Priority
1. **Formal close-project run** — the handover v3 successor path: verify every public claim, retire
   any worklist, write a terminal FINAL handover. The product is at a genuine close point.
2. **Accessibility pass (axe-core)** — the portfolio has no accessibility coverage; this UI (a
   reading surface) is a natural first host. *(See PORTFOLIO_BACKLOG Part B gap 4.)*
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
