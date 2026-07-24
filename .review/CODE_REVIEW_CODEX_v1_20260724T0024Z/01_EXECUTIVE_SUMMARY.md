# Executive Summary

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Risks and Issues ->](02_RISKS_AND_ISSUES.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Overall Assessment

Markdown Renderer is a credible, shipped product with a deliberately small runtime, a well-chosen
pure core, and unusually disciplined design and licence records. It should not be judged as a
Screenplay suite: its architectural value is the separation of a classic-script browser runtime
from unit-testable path/tree logic and its honest treatment of browser file-access constraints.

The current release is functional and reproducible. `npm run verify` passed with 23/23 Vitest and
16/16 Playwright tests; `npm audit` reported zero vulnerabilities in the npm dependency tree; the
latest CI and Pages runs for `d51b056` are successful. Those green signals do not cover all of the
risk surface. A controlled probe reproduced an async selection race, the primary File System
Access API branch is never exercised, vendored libraries are outside the npm audit boundary, and
deployment does not depend on the main verification job.

## Design Quality

- The no-build, no-runtime-network design is proportionate to an offline local-file viewer and is
  supported by vendored libraries and classic scripts.
- `src/paths.js` is an effective functional core: path resolution, tree construction, ancestor
  calculation, and refresh reconciliation are isolated from DOM and I/O.
- IIFE-scoped FolderAccess, Enumeration, Resolve, Render, and UI areas provide readable
  responsibility boundaries without introducing a framework.
- The async Render/UI boundary lacks ownership of in-flight work. The most recently completed read
  wins, rather than the most recently selected file.
- The two folder backends share descriptors but not enumeration or refresh mechanics; treating the
  fallback as proof of the primary backend overstates their parity.

## Code Quality

- Naming, comments, native elements, defensive catches, and `textContent` use make the small
  JavaScript codebase easy to inspect.
- Sanitise-before-parse plus inert-template resource rewriting is a thoughtful security boundary;
  relative images become same-folder blob URLs and external links gain `noopener noreferrer`.
- Object URLs are revoked on navigation, and refresh preserves valid tree/selection state while
  reporting vanished documents.
- The production code is not meaningfully statically checked because `checkJs` is false; the
  strict TypeScript gate primarily checks tests and declarations.
- The dev server is dependency-free and loopback-only, which keeps local and CI reproduction
  simple.

## Main Highlights

- 23 focused unit tests cover the pure path/tree core.
- 12 functional browser tests cover the real fallback workflow, including refresh with isolated
  temporary directories; four additional axe scans cover explicitly scoped UI states.
- CI uses `npm ci`, npm caching, Node 24, a single Chromium installation, and failure-only
  Playwright reports.
- The runtime distribution has an Apache-2.0 project licence plus versioned upstream terms for all
  vendored libraries.
- Documentation distinguishes automated accessibility evidence from a general WCAG conformance
  claim, which is sound testing communication.

## Pedagogical Value

- The repository teaches why browser security rules require a folder picker rather than a typed
  filesystem path.
- The pure-core/classic-script compromise is a useful example of improving testability without
  requiring a build.
- The design records alternatives and rejected complexity, demonstrating KISS and YAGNI rather
  than merely naming them.
- The test suite shows good use of real browser state, accessible-role selectors, deterministic
  fixtures, and temporary data.
- Its teaching value would improve further if it demonstrated cancellation/stale-result control,
  injected fake directory handles, and vendor-aware security automation.

## Risk Profile

| Severity | Count | Summary |
|---|---:|---|
| HIGH | 0 | No release-critical defect proved |
| MEDIUM | 4 | Render race, vendor-audit blind spot, untested primary backend, ungated deployment |
| LOW | 3 | Static-check gap, documentation/toolchain drift, no visual baselines |

## Current-State Claims

- **Backlog:** version 4, zero outstanding at review start; new findings await reconciliation.
- **Deferred/quarantined coverage:** no skipped, quarantined, or focused-only tests found.
- **Planned but unimplemented:** visual-regression baselines remain a parked LOW-priority idea.
- **Data/auth/API:** no remote API, credentials, tokens, account data, or test-user provisioning.
- **Licence:** Apache-2.0 for original work; complete notices exist for vendored runtime assets.

---

[<- Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Risks and Issues ->](02_RISKS_AND_ISSUES.md)
