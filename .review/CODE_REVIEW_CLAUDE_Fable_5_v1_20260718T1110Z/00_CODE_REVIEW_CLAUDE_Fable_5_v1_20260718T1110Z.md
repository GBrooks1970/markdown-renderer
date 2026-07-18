# Code Review: markdown-renderer

**Reviewer:** AI assistant (CLAUDE Fable 5)
**Date:** 2026-07-18T11:10Z
**Scope:** Full single-repository review of `markdown-renderer` - a shipped product (static, offline, browser-based Markdown viewer), reviewed against its own suite and `docs/backlog.md`. Reviewed at `main` HEAD `ae38706` (Merge PR #5, MR-09 accessibility lane).

> **Project nature.** Per the portfolio registry row, this is a **shipped product**, not a
> Screenplay test suite. Its Vitest + Playwright tests are reviewed as the product's own suite,
> not against portfolio Screenplay conventions. Gate: `npm run verify`.

---

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md)
2. [Risks and Issues](02_RISKS_AND_ISSUES.md)
3. [Project Reviews](03_PROJECT_REVIEWS/PROJECT_001_markdown-renderer.md)
4. [Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md)
5. [Recommendations](05_RECOMMENDATIONS.md)
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md)
7. [Migration Plans](07_MIGRATION_PLANS.md)
8. [Annex: Metrics and Validation Evidence](ANNEX/METRICS.md)

## Structure Summary

This is a single-repository review, so `03_PROJECT_REVIEWS/` carries one file
(`PROJECT_001_markdown-renderer.md`) and `04_CROSS_PROJECT_ANALYSIS.md` is a cross-cutting
analysis *within* the repo: runtime page vs pure helpers vs unit suite vs E2E suite vs CI vs
documentation. Sections that do not apply to a dependency-free static page (e.g. API contract,
Screenplay parity, Docker plans) are kept as headings marked `N/A` with a one-line justification,
per the template's single-repository customisation notes.

## Key Findings

1. **R-01 (MEDIUM)** - Sidebar **file rows are mouse-only**: plain `<li>` elements with a click
   listener, no `tabindex`, no role, no key handling ([app.js](../../app.js) lines 252-270). The
   folder-navigation design itself specified `<button>` rows. Keyboard users can expand folders
   (native `<details>`) but cannot select a file - a WCAG 2.1.1 (Level A) gap that the axe
   automated lane structurally cannot detect.
2. **R-02 (MEDIUM)** - The base design document, which the README names "the authoritative
   record", has drifted: status `Draft`, all traceability rows `Not Started`, and a technology
   table (Vitest ^2.1 + jsdom, Playwright 1.60.x) that matches neither `package.json` nor
   `vitest.config.ts` ([docs/design-document.md](../../docs/design-document.md)).
3. **R-03 (LOW)** - The accessibility lane timed out locally on a cold first run (3 of 4 axe
   scans exceeded the default 30 s test timeout "while setting up page"); a warm rerun and the
   full gate then passed. No timeout headroom is configured in
   [playwright.config.ts](../../playwright.config.ts).
4. **R-05 (LOW)** - FR-8's stated security constraint, "the sanitiser is configured to permit
   `blob:`", is not implemented - `DOMPurify.sanitize` runs with defaults
   ([app.js](../../app.js) line 201). The pipeline is still safe (blob substitution happens
   *after* sanitisation), but the documented mechanism is not the real one.
5. **Health check:** `npm run verify` green locally (typecheck + 23 unit + 15 E2E incl. 4 axe
   scans), `npm audit` reports **0 vulnerabilities**, CI and Pages green on `main`, licence
   bundle (Apache-2.0 + third-party notices) exemplary. The backlog's claims verified true.

## Navigation Guide

Read [01_EXECUTIVE_SUMMARY.md](01_EXECUTIVE_SUMMARY.md) for the overall verdict, then
[02_RISKS_AND_ISSUES.md](02_RISKS_AND_ISSUES.md) for the full evidence-backed risk list
(numbered high to low). The per-project deep dive is in
[03_PROJECT_REVIEWS/](03_PROJECT_REVIEWS/PROJECT_001_markdown-renderer.md). Validation commands
run for this review, with outcomes including the cold-start flake evidence, are in
[ANNEX/METRICS.md](ANNEX/METRICS.md). Every file carries breadcrumb navigation.

---

[Next: Executive Summary ->](01_EXECUTIVE_SUMMARY.md)
