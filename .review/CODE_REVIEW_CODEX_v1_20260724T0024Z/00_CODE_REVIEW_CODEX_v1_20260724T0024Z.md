# Code Review: Markdown Renderer

**Reviewer:** AI assistant (Codex GPT-5)
**Date:** 2026-07-24T00:24Z
**Scope:** Full repository review at `d51b05638b7f1410d545e1db8ae9d11b0c0cc25b`
**Product:** Shipped offline browser-based Markdown viewer
**Review version:** CODEX v1

## Evidence warning

Workspace preflight classified the evidence as `WARN`: the latest paired handover,
`markdown-renderer_session-notes_v5_20260720T1634Z.md` and `.html`, predates the fetched default
head `d51b05638b7f1410d545e1db8ae9d11b0c0cc25b`. The handover itself names that head, but this
review preserves the freshness warning and relies on the current backlog, Git history, source,
tests, local validation, and GitHub state for current claims.

## Table of Contents

1. [Executive Summary](01_EXECUTIVE_SUMMARY.md)
2. [Risks and Issues](02_RISKS_AND_ISSUES.md)
3. [Project Review](03_PROJECT_REVIEWS/PROJECT_001_markdown-renderer.md)
4. [Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md)
5. [Recommendations](05_RECOMMENDATIONS.md)
6. [Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md)
7. [Migration Plans](07_MIGRATION_PLANS.md)

## Structure Summary

- The executive summary gives the decision-level assessment and evidence basis.
- Risks are ordered high to low and contain file evidence, impact, and remediation.
- The project review assesses this repository as one shipped product, not as a Screenplay suite.
- Cross-cutting analysis connects the runtime, tests, CI, deployment, documentation, and licences.
- Recommendations and migration plans turn the findings into a staged improvement path.

## Key Findings

1. **MEDIUM - overlapping file reads can render stale content.** A controlled Playwright probe
   reproduced a mismatch: the active sidebar row remained `index.md` while the pane reverted to
   `Guide` after a slower earlier read completed.
2. **MEDIUM - vendored runtime dependencies bypass `npm audit`.** The runtime-critical DOMPurify
   3.1.7 is not represented in the npm lockfile; an OSV package/version query returns advisory
   matches that the clean npm audit cannot see. This review does not claim an exploit without
   matching an advisory's preconditions to the current default-config call site.
3. **MEDIUM - the primary Chromium folder backend is untested.** Every E2E test deliberately
   disables `showDirectoryPicker`, leaving the distinct recursive handle walk and permission
   refresh branches without automated execution.
4. **MEDIUM - Pages deployment is independent of the verification workflow.** Both workflows
   start on a push to `main`, so deployment does not wait for the same commit's `npm run verify`.
5. **LOW - static and visual evidence has gaps.** `checkJs: false` leaves shipped `app.js`
   outside meaningful TypeScript checking, and the backlog's visual-regression idea remains
   unimplemented.

There are no HIGH findings. The full gate passed locally: strict test TypeScript, 23 Vitest tests,
and 16 Playwright tests. The latest `main` CI and Pages runs were also verified successful, and the
live URL returned the expected page.

## Backlog Alignment

[backlog.md](../../docs/backlog.md) (lines 34-41, 103-125) begins this review with zero outstanding
risks, all FR-1..FR-11 and MR-09 shipped, and visual regression parked as an unprioritised next
step. The implementation substantiates the shipped feature set and contains no skipped,
quarantined, or deferred tests. The findings in this review are new evidence and therefore are not
yet reflected in backlog version 4.

## Navigation Guide

Start with the [Executive Summary](01_EXECUTIVE_SUMMARY.md), then use
[Risks and Issues](02_RISKS_AND_ISSUES.md) for actionable detail. Readers evaluating architecture
and teaching value should continue to the
[Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md). Maintainers can move directly from a
risk to the staged actions in [Recommendations](05_RECOMMENDATIONS.md).

---

[Next: Executive Summary ->](01_EXECUTIVE_SUMMARY.md)
