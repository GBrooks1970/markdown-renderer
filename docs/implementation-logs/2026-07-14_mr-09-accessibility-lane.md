# MR-09 Accessibility evidence lane — 2026-07-14

## Session summary

Implemented portfolio backlog P-08 (project item MR-09) per
`PORTFOLIO_P08_ACCESSIBILITY_ACTION_PLAN_2026-07-14.md`: an axe-core accessibility lane inside the
existing Playwright E2E suite, scanning four representative UI states against WCAG 2.0/2.1 A/AA
rule tags. The design note (`docs/accessibility-lane.md`) was written and committed **before** any
axe code, so the scope of the public claim was fixed by design. One violation was found and fixed
in the page; no waivers were recorded.

---

## Objectives

1. ✅ Fix the lane's scope in `docs/accessibility-lane.md` and open MR-09 before implementation.
2. ✅ Add `@axe-core/playwright` as a dev-only dependency with `npm audit` remaining at 0.
3. ✅ Scan S1 (initial page), S2 (tree drilled), S3 (document rendered), S4 (filter flat list)
   with tags `wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa`, attaching violations as JSON evidence.
4. ✅ Fix or narrowly waive every finding; keep the page build-free, vendored, `file://`-capable.
5. ✅ Update README (Testing → Accessibility) to claim exactly the states and tags scanned.
6. ✅ Keep the full `npm run verify` gate and the CI check name `verify (Node 24)` unchanged.

---

## Changes

| Area | Change |
|---|---|
| `docs/accessibility-lane.md` | New design/implementation note: host rationale, states, tags, exclusions, waiver policy, findings record. |
| `package.json` / lockfile | `@axe-core/playwright` ^4.12.1 (dev-only). `npm audit`: 0 before and after. |
| `e2e/fixture.ts` | Extracted the shared `openFolder()` fixture helper from `renderer.spec.ts` so both specs reach states through the identical `webkitdirectory` fallback pipeline. |
| `e2e/accessibility.spec.ts` | The lane: 4 scans (S1–S4), each waiting on the state's functional assertions first, then asserting zero violations and attaching the violations array as a JSON test attachment. |
| `styles.css` | **Accessibility fix** (the run's single finding): S3 `color-contrast` (serious) — the vendored `highlight-github.min.css` token group `#d73a49` is 4.29:1 on `#f6f8fa`, below AA 4.5:1. Recoloured to `#b31d28` (~6.3:1) via a `[data-theme="light"]`-scoped override; vendor files untouched, dark theme unaffected. |
| `readme.md` | Testing → Accessibility subsection stating exactly the four states, tags, exclusions (no waivers), and the run command; documentation table row for the note. |
| `docs/backlog.md` | v2 opened MR-09 (Stage 1 commit); v3 resolves it (this commit). |

No CI workflow change was needed: `ci.yml` already runs `npm run verify` (which now includes the
lane) and already uploads the Playwright report as a failure-only artifact.

---

## Validation

| Check | Result | Status |
|---|---|---|
| Accessibility lane | 4/4 scans pass, zero unwaived violations (zero waivers exist) | ✅ PASS |
| `npm run verify` (clean tree) | TypeScript clean; 23/23 Vitest; 15/15 Playwright (11 existing + 4 axe) | ✅ PASS |
| `npm audit` | 0 vulnerabilities after adding the dev-dependency | ✅ PASS |
| Runtime contract | No runtime dependency, no build step; page still vendored and `file://`-capable | ✅ PASS |
| Visual parity after fix | Screenshot of the rendered document confirms the code block reads as before, keywords slightly darker | ✅ PASS |

---

## Technical decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Fix the contrast finding with a light-theme-scoped override in `styles.css` | Minimal, vendored-safe: vendor CSS stays pristine and byte-identical to upstream; the licence bundle needs no change; visual character is preserved | Switching to a different vendored accessible theme (larger visual change, new vendored assets and licence provenance work for a 0.21-ratio shortfall); waiving the rule (a fix was available within the runtime contract, and the plan prefers fixes) |
| Extract `e2e/fixture.ts` rather than duplicate `openFolder()` | The axe lane must reach states through exactly the pipeline the functional tests prove; one helper keeps them from drifting | Copy-pasting the helper into the new spec |
| Scan the default light theme only | It is the page's shipped default and the claim's scope; the dark theme swaps a different vendored highlight sheet and would double the claimed surface | Scanning both themes and widening the public claim |

No ADR is required: the only runtime change is a colour override justified by a recorded
violation, within the existing design contract (DR-MR-02/DR-MR-04 untouched).

---

*Session logged: 2026-07-14. Author: Claude Fable 5 (Claude Code), directed by Gary Brooks.*
