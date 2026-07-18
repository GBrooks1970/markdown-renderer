# Risks and Issues

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Project Reviews ->](03_PROJECT_REVIEWS/PROJECT_001_markdown-renderer.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Numbered high to low. Severity reflects a portfolio product with no security-sensitive data flow
and no outstanding backlog items; nothing here is release-blocking. Each risk gives evidence,
impact, and a remediation strategy.

---

## R-01 (MEDIUM) - Sidebar file rows are not keyboard-operable

**Description.** File entries in the sidebar are plain `<li>` elements carrying a `click`
listener, with no `tabindex`, no interactive role, and no key handler. A keyboard-only user can
expand/collapse folders (native `<details>/<summary>` is focusable) but cannot **select a file to
render** - the product's primary action.

**Evidence.**
- [app.js](../../app.js) lines 252-270 (`fileItem`): builds `<li class="file-list__item">` with
  `li.addEventListener("click", ...)`; no `tabindex`/`role`/`keydown`.
- [app.js](../../app.js) line 274 (`treeNode`): file nodes reuse `fileItem`, so tree files inherit
  the same limitation.
- The folder-navigation design specified focusable rows: "Files: `<li><button class="file" ...>`"
  ([docs/design-document-folder-navigation.md](../../docs/design-document-folder-navigation.md)
  §5.2). The shipped code uses a non-interactive `<li>` instead - a divergence from its own design.
- The axe lane did **not** catch this: axe flags roles/labels/contrast on the *rendered* DOM, but a
  `<li>` with a JS click listener is not a detectable "control", so keyboard operability
  (WCAG 2.1.1, Level A) is a structural blind spot of automated scanning - worth stating explicitly
  given the project ships an accessibility claim.

**Impact.** Level A keyboard-access gap on the core interaction. It also slightly overstates the
accessibility lane: the README scans four states for WCAG A/AA rule tags, but the most common
keyboard failure on this widget is exactly the class axe cannot see.

**Remediation.** Make file rows real controls: render the row as (or wrap its label in) a
`<button type="button">`, or give the `<li>` `role="button"` + `tabindex="0"` + a `keydown` handler
for Enter/Space that calls `open(descriptor)`. Add one Playwright assertion that a file can be
focused and activated by keyboard. Low effort; closes the gap the design already intended to close.

---

## R-02 (MEDIUM) - Base design document has drifted from the shipped product

**Description.** The README calls the design document "the authoritative record of requirements and
decisions", but [docs/design-document.md](../../docs/design-document.md) still reads as pre-build.

**Evidence.**
- Status `Draft`; Approval rows "Pending" ([docs/design-document.md](../../docs/design-document.md)
  lines 8, 770-771).
- Requirements Traceability Matrix lists every FR as **`Not Started`** (lines 216-225), though
  FR-1..FR-8 shipped in June 2026 and are covered by passing tests.
- Technology-stack table (lines 287-288) states **Vitest ^2.1 (+ jsdom)** and **Playwright
  1.60.x**. Actual: `vitest ^4.1.9`, `@playwright/test ^1.53.0` (installed 1.61.0), and the unit
  tests run in the **node** environment, not jsdom
  ([package.json](../../package.json) lines 24-28; [vitest.config.ts](../../vitest.config.ts)
  line 7). The jsdom claim is contradicted by the config.
- The companion doc
  ([design-document-folder-navigation.md](../../docs/design-document-folder-navigation.md)) is, by
  contrast, current (traceability `Implemented`, history through v0.3). The drift is isolated to
  the base document.

**Impact.** A reviewer who opens the "authoritative" document first meets a stale story
(wrong frameworks, nothing built). Pedagogically it undpercuts an otherwise exemplary
documentation set. This mirrors the recurring portfolio theme of documentation/metadata drift.

**Remediation.** Flip base-doc status to `Implemented`/`Shipped`, set the traceability rows to
match the current suite, and correct the tech-stack row to Vitest 4 (node env, no jsdom) and
Playwright 1.5x. Add a v0.4 history line. Docs-only; no code change.

---

## R-03 (LOW) - Accessibility lane flakes on a cold first run (no timeout headroom)

**Description.** On the first `npm run verify` of this review (cold Playwright/browser start), 3 of
the 4 axe scans failed with "Test timeout of 30000ms exceeded while setting up page"; a subsequent
`npx playwright test e2e/accessibility.spec.ts` and a later full `npm run verify` both passed all
15 E2E tests. The axe scans are the heaviest tests (axe injects and runs a large script) and are
the ones that tip over the default 30 s ceiling when the machine is cold.

**Evidence.**
- Observed run: S1/S3/S4 failed "while setting up page" (~30-41 s each); warm rerun 4/4 passed in
  ~48 s total; full-gate rerun 15/15 passed. See [ANNEX/METRICS.md](ANNEX/METRICS.md).
- [playwright.config.ts](../../playwright.config.ts): no `timeout` override (default 30 s per test);
  `fullyParallel: true` with 4 workers means four axe scans start together and contend on a cold
  start. `webServer.timeout` is 30 s.

**Impact.** Local-reproducibility and CI-stability risk: a cold or loaded CI runner could flake the
gate that also blocks Pages. Not observed in the recorded CI history (runs green), but the margin is
thin and the failure mode is environmental, not deterministic.

**Remediation.** Give the axe lane headroom: raise the per-test `timeout` (e.g. 60 s) globally or
via a `test.describe.configure({ timeout: 60_000 })` in
[e2e/accessibility.spec.ts](../../e2e/accessibility.spec.ts), and/or add one Playwright retry in CI
(`retries: process.env.CI ? 1 : 0`). Cheap insurance against a heisen-flake.

---

## R-04 (LOW) - E2E coverage is Chromium-only, but the fallback path is the cross-browser story

**Description.** The suite runs a single `chromium` project. The product's headline
cross-browser feature is graceful degradation to the `webkitdirectory` fallback on Firefox/Safari
(FR-7), and the E2E suite *does* drive that fallback - but only inside Chromium.

**Evidence.**
- [playwright.config.ts](../../playwright.config.ts) lines 32-37: one project, `Desktop Chrome`.
- The design justifies Chromium-only for the *pipeline* (the native picker cannot be automated, so
  E2E targets the fallback anyway - a sound argument, design §8). But rendering/highlight/contrast
  and the fallback DOM could still differ on WebKit/Gecko engines, which are never exercised.

**Impact.** Low - the runtime logic is engine-agnostic and the risk is rendering nuance, not
correctness. Worth noting only because the product markets cross-browser support the CI never
proves.

**Remediation.** Optionally add `webkit` and `firefox` projects for the render/fallback specs (the
accessibility lane can stay Chromium-only, since its claim is explicitly light-theme Chromium). If
declined, add a one-line note in the design's testing strategy that cross-engine rendering is
verified manually, not in CI.

---

## R-05 (LOW) - Documented sanitiser configuration does not match the code

**Description.** FR-8's security constraint says "the sanitiser is configured to permit `blob:` and
block other dynamic schemes"
([docs/design-document.md](../../docs/design-document.md) line 193). In practice `DOMPurify.sanitize`
is called with **no options** ([app.js](../../app.js) line 201), so no `blob:` allow-listing is
configured. The pipeline is nonetheless safe because blob URLs are injected *after* sanitisation
(the sanitiser never sees them), and remote `src` values are stripped before insertion.

**Evidence.**
- [app.js](../../app.js) line 201: `const clean = window.DOMPurify.sanitize(dirty);` - defaults only.
- [app.js](../../app.js) lines 145-161: images are rewritten to `blob:`/removed *after* sanitisation,
  on the inert template - which is why default DOMPurify (which strips `blob:` img src) does not
  break the feature.

**Impact.** Documentation describes a mechanism (sanitiser allow-list) the code does not use. No
security impact - the actual design (post-sanitise substitution) is arguably safer - but a reader
auditing "how is blob: permitted?" will look in the wrong place.

**Remediation.** Correct the FR-8 note to describe the real mechanism: "relative images are
resolved to same-folder `blob:` URLs *after* DOMPurify runs, on an inert `<template>`, so no
sanitiser allow-list is required." Docs-only.

---

## R-06 (LOW) - Minor dev-dependency drift; `@types/node` a major behind runtime

**Description.** `npm outdated` shows small patch/minor lags and one larger gap.

**Evidence (from `npm outdated`, this review).**
- `@playwright/test` 1.61.0 -> 1.61.1 (patch), `vitest` 4.1.9 -> 4.1.10 (patch),
  `@types/node` 22.19.21 -> 26.1.1 (major; project pins `^22`), `typescript` 5.9.3 (latest major 7
  exists; project pins `^5.7`).
- All are **devDependencies**; the shipped page bundles none of them. `npm audit`: **0
  vulnerabilities**.

**Impact.** Negligible. `@types/node ^22` while CI runs on Node 24 is a mild mismatch (types a
major behind the runtime) but harmless for this codebase's small Node surface (`node:fs`,
`node:http`, `node:path`, `node:url`).

**Remediation.** Optionally bump `@types/node` to `^24` to match the CI Node version, and take the
patch bumps on the next maintenance pass. No urgency.

---

## Strengths (counterpoint to the risks)

- Security pipeline is careful and correct (inert-template render, sanitise-then-resolve,
  same-folder blob-only, `noopener noreferrer`).
- Pure-helper extraction gives a genuinely testable core with 23 focused unit tests.
- Licensing and third-party attribution are exemplary and audit-ready.
- The accessibility lane's *scope discipline* (design-fixed-before-code, no waivers, honest
  "not a WCAG conformance statement") is a model worth copying - R-01 is a gap in *what automated
  scanning can see*, not in that discipline.

---

[<- Back to Index](00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md) | [Next: Project Reviews ->](03_PROJECT_REVIEWS/PROJECT_001_markdown-renderer.md)
