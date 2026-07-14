<!--
  AUDIENCE: Engineers and AI agents maintaining this project's test suite.
  PURPOSE:  Design/implementation note for the accessibility evidence lane (MR-09,
            portfolio P-08) — the authoritative record of exactly what is scanned,
            with which rules, and how findings are handled.
  LOCATION: docs/accessibility-lane.md
-->

# Accessibility Evidence Lane (MR-09)

**Status:** Design fixed before implementation (portfolio P-08, Stage 1)
**Created:** 2026-07-14
**Source:** portfolio backlog item P-08 — "Add a focused accessibility evidence lane"
(`test-automation-portfolio/PORTFOLIO_BACKLOG.md`), executed per
`PORTFOLIO_P08_ACCESSIBILITY_ACTION_PLAN_2026-07-14.md`.

This note is written **before** any axe code so that the scope of the accessibility claim is
fixed by design, not by whatever happened to pass. Public wording (README, portfolio) may claim
only the states and rule tags recorded here.

---

## 1. Host choice

**Host: `markdown-renderer` (this repository).** Rationale:

- Public, owned, and Apache-2.0 licensed — results are reviewer-visible with no access hurdles.
- A deterministic, dependency-free static page: scans run against a stable DOM with no network,
  auth, or data variability.
- Already Playwright-tested (`e2e/renderer.spec.ts`, Chromium, `webkitdirectory` fallback), so the
  axe engine rides the existing browser test stack with zero new infrastructure.
- As a *reading surface*, accessibility is a genuine product quality here, not a box-tick.

**Why not Mobile Forex:** the portfolio backlog allows Mobile Forex only if a documented
role-targeting reason outweighs Markdown Renderer's simpler deterministic surface. No such reason
exists at the time of writing: no active engagement targets a mobile-accessibility role, and the
Mobile Forex surface is neither public nor as deterministic. Default stands.

## 2. Engine and where it runs

- **Engine:** `axe-core` via **`@axe-core/playwright`**, installed as a **dev-dependency only**.
  The shipped page stays build-free, vendored, and `file://`-capable (DR-MR-02/DR-MR-04): nothing
  in this lane adds a runtime dependency or build step.
- **Where:** a new spec `e2e/accessibility.spec.ts` inside the existing Playwright E2E suite, so
  the lane runs as part of **`npm run verify`** (typecheck + Vitest + Playwright) and therefore in
  the normal CI gate — the single existing check **`verify (Node 24)`**, unchanged in name and
  triggers. The lane cannot be skipped without failing the normal gate.
- **Evidence on failure:** CI already uploads the Playwright report as a failure-only artifact
  (14-day retention); each axe scan additionally attaches its violations array as a JSON test
  attachment so findings are readable straight from the report.

## 3. Representative states scanned (the exact scope of the claim)

Four deterministic UI states, all reached with the suite's existing fixture-loading helper
(`sample-docs/` via the `webkitdirectory` fallback):

| State | How it is reached | Why it is meaningful |
|---|---|---|
| **S1 — Initial page** | Open `index.html`; no folder chosen (refresh disabled) | The empty/entry experience: landmark structure, control labelling, focus order of the picker controls. |
| **S2 — Tree populated and drilled** | Load `sample-docs/`, expand the `notes` directory | The `<details>`-based tree sidebar (FR-10/FR-11): expandable structure semantics, link/summary names. |
| **S3 — Document rendered** | Select `index.md`, whose render includes headings, a highlighted code block, and a table | The core reading surface incl. vendored `highlight.js` styling — the most likely source of colour-contrast findings. |
| **S4 — Filter flat list** | Type `guide` into `#file-filter` so the tree is replaced by the flat match list (FR-5) | A dynamic content swap: list semantics and the filter input's labelling. |

Each scan waits on the state's own functional assertions (the same ones the existing E2E tests
use) before invoking axe, so results are deterministic. Scanning further states is optional and
**must not** widen the public claim beyond these four.

## 4. Standards and rules claimed

- **Included:** WCAG 2.0/2.1 levels A and AA, via the axe tags
  **`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`** —
  `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])`.
- **Deliberately excluded:** axe **`best-practice`** rules. They are advisory, not WCAG
  success criteria, and including them would blur what the pass actually certifies. This exclusion
  is intentional and permanent for this lane.
- **No "WCAG compliant" phrasing anywhere.** The claim is precisely: *these four states pass the
  axe-core rules tagged wcag2a/wcag2aa/wcag21a/wcag21aa, with the waivers (if any) listed below.*

## 5. Remediation and waiver policy

- Every violation found is either **fixed** or **waived** — never ignored, and never resolved by
  disabling a whole scan or dropping a state.
- **Fixes** to the shipped page are allowed only when justified by a recorded violation, and must
  keep the page build-free, vendored, and `file://`-capable, with the full existing test suite
  green after each fix (`npm run verify` rerun in full).
- **Waivers** are the exception: a waiver is recorded per rule **and** per scope (axe rule id +
  selector scope + reason + evidence) in §6 below, and excluded precisely in the spec
  (per-rule/per-element), never by disabling entire scans. Expected candidate: colour contrast
  inside the vendored `highlight.js` theme — where switching to an accessible vendored theme is
  preferred over waiving.
- If a fix would break the `file://`/vendoring runtime contract, the fix is reverted and a narrow
  waiver recorded instead: the runtime contract outranks an individual axe rule.

## 6. Recorded waivers

*To be filled during implementation (Stage 2). If this section still reads "None", no waiver is
in force and the spec excludes nothing.*

## 7. Findings and resolutions (implementation record)

*To be filled during implementation (Stage 2) from the real axe output: every violation found,
with its rule id, scope, and whether it was fixed (and how) or waived (per §5).*

## 8. How to run it

```bash
npm run verify                                   # full gate (typecheck + unit + E2E incl. this lane)
npx playwright test e2e/accessibility.spec.ts    # the accessibility lane alone
```
