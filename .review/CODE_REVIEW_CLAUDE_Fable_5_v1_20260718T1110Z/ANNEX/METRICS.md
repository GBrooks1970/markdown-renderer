# Annex: Metrics and Validation Evidence

[<- Back to Index](../00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md)

**Reviewer:** AI assistant (CLAUDE Fable 5)

Evidence gathered while reviewing at `main` HEAD `ae38706`. Commands were run locally on Windows
(PowerShell); results are reported verbatim, not inferred.

## Validation commands run

| Command | Result | Notes |
|---|---|---|
| `npm run verify` (cold, 1st run) | **FAIL (exit 1)** | 23/23 unit passed; E2E 12/15 - S1/S3/S4 axe scans timed out "while setting up page" (~30-41 s each) on a cold browser start. |
| `npx playwright test e2e/accessibility.spec.ts` (warm) | **PASS** | 4/4 axe scans passed in ~48 s total. |
| `npm run verify` (warm rerun) | **PASS** | 23/23 unit + 15/15 E2E (incl. all 4 axe scans), full gate green in ~34 s E2E. |
| `npm audit` | **0 vulnerabilities** | Clean. |
| `npm outdated` | minor drift (see below) | All dev-only. |
| `gh run list -L 4` | CI + Pages **success** on `main` | Latest runs 2026-07-14. |

**R-03 evidence:** the cold/warm split above is the basis for the accessibility-lane flake finding.
The failure was environmental (per-test 30 s default timeout exceeded during page setup under
4-worker cold contention), not a deterministic assertion failure - the identical tests pass warm.

## Test counts

- Unit (Vitest, `spec/paths.spec.ts`): **23** tests, node environment, ~46 ms test time.
- E2E (Playwright, chromium project): **15** tests = 11 functional (`e2e/renderer.spec.ts`) +
  4 accessibility (`e2e/accessibility.spec.ts`).
- Total suite: **38** automated tests.

## Dependency snapshot (`npm outdated`)

| Package | Current | Wanted | Latest | Kind |
|---|---|---|---|---|
| `@playwright/test` | 1.61.0 | 1.61.1 | 1.61.1 | dev |
| `vitest` | 4.1.9 | 4.1.10 | 4.1.10 | dev |
| `@types/node` | 22.19.21 | 22.20.1 | 26.1.1 | dev (pinned `^22`; CI runs Node 24) |
| `typescript` | 5.9.3 | 5.9.3 | 7.0.2 | dev (pinned `^5.7`) |

Installed transitive of note: `axe-core` 4.12.1 (via `@axe-core/playwright` 4.12.1). No runtime
(non-dev) dependencies exist - the shipped page bundles only the vendored libraries.

## Licence / security pass

- Repo licence: **Apache-2.0** ([LICENSE](../../LICENSE), [package.json](../../package.json) line 6).
- Third-party runtime libs vendored with pinned versions and full licence texts:
  marked 14.1.4 (MIT), DOMPurify 3.1.7 (Apache-2.0 OR MPL-2.0), highlight.js 11.10.0 (BSD-3-Clause)
  - see [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md) and
  [vendor/vendored-libraries.md](../../vendor/vendored-libraries.md).
- No secrets or tokens committed (grep of the tree; the product has no auth/network surface).
- `npm audit`: 0 vulnerabilities. No CVE is asserted for any vendored library here (not
  independently audited beyond `npm audit`, which does not cover the vendored copies - stated as an
  inference, not a proven clean bill for the vendored blobs).

## Repository state at review

- HEAD: `ae38706` (Merge PR #5 - MR-09 accessibility lane).
- `git status --short`: clean before the review branch was created.
- Review written into `.review/` (this is the project's first review directory; `{N}` = v1 for
  agent CLAUDE Fable 5).

## Recorded questions (unattended run - not asked interactively)

The prompt allows asking the user; running unattended, these are recorded here and in the report
instead of blocking:

- **Q1:** Should file-row keyboard operability (R-01) be fixed now, or deferred to a close-project
  pass? (Recommendation: fix now - it is Level A and small.)
- **Q2:** Add `webkit`/`firefox` E2E projects (R-04), or record cross-engine as manual-only in the
  design? (Recommendation: record as manual-only unless a role targets cross-browser proof.)

---

[<- Back to Index](../00_CODE_REVIEW_CLAUDE_Fable_5_v1_20260718T1110Z.md)
