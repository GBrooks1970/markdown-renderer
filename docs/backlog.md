<!--
  AUDIENCE: Engineers and AI agents maintaining this project.
  PURPOSE:  Single source of truth for outstanding work, risks, and planning.
  LOCATION: docs/backlog.md
-->

# Markdown Renderer — Backlog

**Version:** 4 — code review v1 findings (R-01..R-06) resolved via WORKLIST_markdown-renderer.md
**Last Updated:** 2026-07-20
**Based on:** session-notes handover **v3** (2026-07-05T2258Z), code review v1
(`.review/CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z/`, 2026-07-18 — no HIGH findings),
remediated by TRIAGE-01..06 on PRs
[#7](https://github.com/GBrooks1970/markdown-renderer/pull/7)–[#12](https://github.com/GBrooks1970/markdown-renderer/pull/12),
merged 2026-07-20, and the repo at `main`.

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
resolved in the same cycle that opened it; the first code review (v1) found no HIGH findings and
all six of its findings (R-01..R-06) are now resolved — see Resolved / Shipped. The product
remains **complete, published, and feature-extended**: FR-1..FR-11 and MR-09 are implemented and
live, the `verify` gate is green, CI is green on `main`, and the GitHub Pages demo serves the
current build.

---

### Resolved / Shipped

Kept as a record of what has been delivered — do not delete.

#### Code review v1 findings (R-01..R-06) — ✅ RESOLVED 2026-07-20

**Source:** `.review/CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z/` (first review of this project,
2026-07-18 — no HIGH findings). Triaged into `WORKLIST_markdown-renderer.md`, delivered one item
per `loop-worklist` iteration.

| Item | Finding | Resolution | Commit / PR |
|---|---|---|---|
| TRIAGE-01 | R-01 (MEDIUM): sidebar file rows had no keyboard path | `fileItem()` now renders `<li><button type="button">`, matching the original folder-navigation design's spec exactly; native button semantics give Enter/Space activation for free; new Playwright test | `efb7cc8` / PR #7 |
| TRIAGE-02 | R-02 (MEDIUM): design doc still said Draft/Not Started despite shipping | Status → Implemented, v0.3→v0.4; traceability matrix flipped to Shipped; tech-stack table corrected to actual installed versions | `1e8b95f` / PR #8 |
| TRIAGE-03 | R-03 (LOW): axe lane could time out on a cold start | `test.describe.configure({ timeout: 60_000, retries: process.env.CI ? 1 : 0 })` scoped to the accessibility describe block | `ca222b0` / PR #10 |
| TRIAGE-04 | R-04 (LOW): no documented cross-engine verification stance | One sentence added to §8 stating WebKit/Firefox rendering is verified manually, not in CI (decision: document, don't add browser projects) | `83f95b6` / PR #11 |
| TRIAGE-05 | R-05 (LOW): FR-8's security note described the wrong mechanism | Rewrote the note to the real code path (sanitise on raw HTML with default config → inert `<template>` → `img.src` set via direct DOM property assignment, never re-entering the sanitiser) | `acb8741` / PR #9 |
| TRIAGE-06 | R-06 (LOW): `@types/node` had a real major-version gap vs. CI's Node 24 | `@types/node` `^22`→`^24`; `@playwright/test`/`vitest` patch bumps taken | `dd2003b` / PR #12 |

`npm run verify` green throughout (23/23 Vitest, 16/16 Playwright); `npm audit` 0 vulnerabilities.
3 stale merged remote branches pruned as end-of-cycle housekeeping.

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
| Resolved / Shipped | FR-1..FR-11, MR-09, review v1 (R-01..R-06) | all delivered and live |

---

## Potential Next Steps

Not yet prioritised as risks — the natural next tranche, should the project be picked up again.

### LOW Priority
1. **Formal close-project run** — verify every public claim, retire any worklist, write a terminal
   FINAL handover. The product has been at a genuine close point since v3/v4; the review v1 cycle
   (2026-07-20) is a second natural close checkpoint.
2. ~~**Accessibility pass (axe-core)**~~ — ✅ delivered as **MR-09** (2026-07-14, portfolio P-08).
3. **Visual-regression baselines** — a viewer whose whole point is rendering fidelity is the natural
   fit for Playwright screenshot baselines / Percy. *(See PORTFOLIO_BACKLOG Part B gap 5.)*
4. ~~**`.html` companions for the handovers**~~ — done; v1..v4 all have `.md`+`.html` pairs.

---

## Maintenance Notes

- Update the version number at the top when items change status; mark completion dates on ✅ items.
- The gate is `npm run verify`; keep it green before any merge. CI runs it on Node 24 and deploys Pages.
- All changes to `main` go via branch + PR (the harness blocks direct pushes).
- Verify the live Pages URL **content** (not just run status) after any deploy — transient
  `deploy-pages@v4` failures are known (handover v3); `gh run rerun <id> --failed` clears them.
