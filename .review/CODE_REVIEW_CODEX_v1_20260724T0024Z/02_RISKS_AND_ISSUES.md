# Risks and Issues

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_markdown-renderer.md)

**Reviewer:** AI assistant (Codex GPT-5)

Findings are ordered high to low. There are no HIGH findings.

## R-01 (MEDIUM) - An older file read can overwrite the latest selection

**Risk description.** `open()` records the new active path and starts an asynchronous render, but
there is no request token, cancellation, or final "still current" check. Two rapid selections can
complete out of order, leaving the sidebar on the newest file while the pane displays the older
one. The shared `liveUrls` variable also lets overlapping renders revoke or replace each other's
resource ownership.

**Evidence.**

- [app.js](../../app.js) (lines 185-212) stores one module-level `liveUrls`, awaits file text and
  every image resolution, then unconditionally replaces the container.
- [app.js](../../app.js) (lines 334-343) sets `state.activePath`, redraws the sidebar, and awaits
  `Render.render()` without an operation identity.
- [renderer.spec.ts](../../e2e/renderer.spec.ts) (lines 54-73) proves one selection at a time but
  contains no overlapping-read case.
- Controlled review probe: `File.prototype.text()` was delayed by 400 ms for `guide.md`; the probe
  selected `guide.md` then `index.md`. It failed after the wait because `.is-active` contained
  `index.md` while `#content h1` contained `Guide`. The temporary probe was removed after the run.

**Impact.** A large file, slow blob read, or image-heavy document makes the pane and selection
disagree. The user can act on the wrong content, and object URLs from concurrent renders can have
an ambiguous lifecycle. This is a deterministic correctness defect once completion order is
reversed, not a theoretical timing concern.

**Remediation strategy.**

1. Increment a render generation in `open()` and capture it for each render.
2. Build each result and its object-URL list locally.
3. Before committing DOM or URL ownership, confirm the generation still matches the active
   request; revoke URLs from stale work and return.
4. Add a Playwright test with controlled delayed reads proving the latest selection owns both the
   active row and pane.

## R-02 (MEDIUM) - Vendored runtime dependencies are invisible to the clean npm audit

**Risk description.** The shipped page depends on pinned copies of Marked, DOMPurify, and
highlight.js, but none is an npm runtime dependency. `npm audit` therefore reports only the
development tree and cannot support the broader statement that the shipped runtime has no known
dependency risk.

**Evidence.**

- [vendored-libraries.md](../../vendor/vendored-libraries.md) (lines 7-13) pins Marked 14.1.4,
  DOMPurify 3.1.7, and highlight.js 11.10.0.
- [app.js](../../app.js) (lines 200-205) makes DOMPurify the core boundary between untrusted local
  Markdown and an `innerHTML` parse.
- [package.json](../../package.json) (lines 23-29) contains development tooling only, so the
  vendor versions do not enter `package-lock.json` audit resolution.
- Review commands: `npm audit --audit-level=low` returned zero; an OSV query for npm package
  `dompurify` version `3.1.7` returned 19 advisory records; `npm view dompurify version` returned
  `3.4.12`. See the [OSV API](https://api.osv.dev/v1/query) and the
  [DOMPurify advisories](https://github.com/cure53/DOMPurify/security/advisories).
- Applicability qualification: sampled records depend on optional modes or re-parsing contexts
  such as `SAFE_FOR_TEMPLATES`, `RETURN_DOM`, `IN_PLACE`, hooks, custom-element predicates, or
  special raw-text wrappers. The current call uses default configuration and a normal template
  context, so this review does **not** claim that those specific exploit preconditions are present.

**Impact.** The product's most security-sensitive dependency can age past fixes while its standard
audit stays green. Manual applicability review is expensive and easy to omit, particularly when
future code changes enable an affected mode. The backlog's broad zero-vulnerability narrative is
therefore stronger than the automated evidence.

**Remediation strategy.**

1. Upgrade the vendored libraries from authenticated upstream release assets, preserving hashes,
   headers, notices, and offline behaviour.
2. Add a machine-readable vendor manifest (package, ecosystem, version, source URL, checksum).
3. Query OSV or an equivalent advisory source for both npm and vendored assets in CI.
4. Add malicious-Markdown regression cases around the actual sanitise-to-template pipeline.
5. Report advisory matches separately from proved applicability; do not treat every range match as
   a confirmed exploit.

## R-03 (MEDIUM) - The primary File System Access API backend has no automated execution

**Risk description.** The product recommends the Chromium File System Access API as its best
experience, but every browser test disables it and exercises only the `webkitdirectory` fallback.
The two backends converge on descriptor/index shapes only after materially different enumeration,
lookup, permission, and refresh code.

**Evidence.**

- [readme.md](../../readme.md) (lines 46-49) calls Chromium/File System Access API the best
  experience and Firefox/Safari the fallback.
- [app.js](../../app.js) (lines 71-104) contains a distinct asynchronous directory-handle walk and
  handle-based `readBlob()` implementation.
- [app.js](../../app.js) (lines 402-412) contains FS API-only `queryPermission`,
  `requestPermission`, and re-pick branches.
- [fixture.ts](../../e2e/fixture.ts) (lines 16-30) explicitly replaces
  `window.showDirectoryPicker` with `undefined`; every functional and accessibility test that
  loads a folder uses this fixture.
- [playwright.config.ts](../../playwright.config.ts) (lines 32-37) runs Chromium only, so there is
  no separate engine or backend lane.

**Impact.** Regressions in the preferred production branch can pass all 39 automated assertions.
The fallback proves the downstream render pipeline but does not prove recursive handle iteration,
handle lookup, unreadable-directory behaviour, or permission recovery.

**Remediation strategy.**

1. Inject a fake `showDirectoryPicker()` returning a deterministic in-page hierarchy of directory
   and file handles; the OS dialog does not need to be automated.
2. Cover nested enumeration, unreadable subdirectories, file lookup, granted permission,
   permission re-request, denied permission, and refresh.
3. Keep one fallback E2E lane and one mocked-handle integration lane so backend parity is explicit.
4. Retain manual real-dialog checks as release evidence, not as the only primary-backend evidence.

## R-04 (MEDIUM) - Production deployment does not wait for the verification workflow

**Risk description.** CI and Pages are separate workflows triggered concurrently by pushes to
`main`. Pages copies and deploys runtime files without depending on the same commit's verification
result.

**Evidence.**

- [ci.yml](../../.github/workflows/ci.yml) (lines 11-16, 25-44) triggers on `main` and runs
  `npm run verify`.
- [pages.yml](../../.github/workflows/pages.yml) (lines 8-11, 20-49) independently triggers on
  `main`, stages runtime files, and deploys them; it has no test job or CI-result dependency.
- GitHub evidence at review time: CI run `29760169644` and Pages run `29760169642` both succeeded
  for `d51b056`, so the current deployment is healthy. That success does not create an ordering
  guarantee for future commits.

**Impact.** A commit whose main-branch CI fails can still be published if the file-copy/deploy
workflow succeeds. Branch protection reduces the likelihood of a logically failing commit reaching
`main`, but it does not make the production workflow itself fail closed.

**Remediation strategy.**

1. Prefer one workflow where a Pages build/deploy job `needs` the verified job.
2. Alternatively trigger Pages from a successful CI `workflow_run` and check the exact head SHA.
3. Keep deployment permissions scoped to the deploy job, as they are now.
4. Add a smoke request for the deployed title/runtime files after deployment and retain the URL as
   job output.

## R-05 (LOW) - The typecheck does not check the shipped application

**Risk description.** The script called `typecheck` uses a strict TypeScript configuration, but
`checkJs` is false. Most production behaviour lives in `app.js`, so the gate's static analysis
primarily protects tests and declarations rather than the shipped code.

**Evidence.**

- [package.json](../../package.json) (lines 7-13) makes `tsc -p tsconfig.spec.json` the first
  verification step.
- [tsconfig.json](../../tsconfig.json) (lines 8-18) is strict but sets `allowJs: true` and
  `checkJs: false`.
- [app.js](../../app.js) (lines 22-443) contains folder access, enumeration, rendering, resource
  resolution, state, and event wiring.

**Impact.** Refactors can introduce bad shapes, null mistakes, or wrong browser API assumptions in
the runtime while the named typecheck remains green. E2E tests catch observed behaviour but not all
branches.

**Remediation strategy.** Add a separate checked-JS config with browser globals and targeted JSDoc
types, or migrate only the pure/runtime modules that benefit from checking while retaining a
classic-script build output. Keep the no-build user experience; static checking is a development
concern, not a reason to add runtime tooling.

## R-06 (LOW) - Prerequisite and design-document claims still drift

**Risk description.** A few onboarding and architecture statements conflict with the installed
toolchain or implementation.

**Evidence.**

- [readme.md](../../readme.md) (line 49) says Node 18+ runs the tests, but Vitest 4.1.10 declares
  `^20.0.0 || ^22.0.0 || >=24.0.0` (`npm view vitest@4.1.10 engines`).
- [design-document.md](../../docs/design-document.md) (line 374) says unreadable entries are
  "skipped and counted"; [app.js](../../app.js) (lines 79-82) silently skips them without a count.
- [design-document.md](../../docs/design-document.md) (lines 706-710) still describes Vitest with
  jsdom, while [vitest.config.ts](../../vitest.config.ts) (lines 3-8) uses the node environment.
- [accessibility-lane.md](../../docs/accessibility-lane.md) (lines 9-19) retains a
  pre-implementation status even though its later findings section and backlog say it shipped.

**Impact.** Node 18 users can encounter an unsupported test runner, and reviewers receive
contradictory implementation guidance. This is a credibility and reproducibility issue, not a
runtime defect.

**Remediation strategy.** Set the test prerequisite to Node 20+ (or the exact supported ranges),
add a root `engines.node` field, and perform one targeted documentation currency pass across the
duplicated test-environment, error-handling, and status claims.

## R-07 (LOW) - Rendering fidelity has no visual-regression evidence

**Risk description.** The product exists to render Markdown, has two themes and vendored syntax
styles, but tests assert selected semantic elements rather than pixel/layout stability. The backlog
already identifies visual baselines as a potential next step.

**Evidence.**

- [backlog.md](../../docs/backlog.md) (lines 115-126) parks visual-regression baselines as an
  unprioritised LOW next step.
- [renderer.spec.ts](../../e2e/renderer.spec.ts) (lines 54-60) proves heading, highlighted code,
  and table presence but not layout or styling.
- [accessibility.spec.ts](../../e2e/accessibility.spec.ts) (lines 51-58) scans the same rendered
  state for axe rules, not visual drift.
- [playwright.config.ts](../../playwright.config.ts) (line 22) captures screenshots only after
  failure; no committed `toHaveScreenshot()` baselines exist.

**Impact.** CSS, theme, responsive, table, or code-block regressions can pass functional and axe
checks. Risk remains LOW because the current UI is compact and the idea is honestly parked.

**Remediation strategy.** Start with two stable component-sized baselines: the default rendered
sample in light and dark themes at one fixed viewport. Mask environment-dependent content, review
baseline changes in PRs, and avoid a large browser/viewport matrix until evidence justifies it.

## Strengths

- The sanitise-then-resolve pipeline, same-folder blob policy, and external-link hardening are
  materially better than direct parsed-Markdown insertion.
- Unit, functional E2E, accessibility, refresh, and failure-state tests are deterministic and
  readable.
- Native `<button>` and `<details>/<summary>` controls preserve keyboard semantics without custom
  widget complexity.
- Licence and provenance records for every shipped third-party asset are complete and prominent.
- No committed secrets, credentials, environment files, ignored tests, or runtime network/API
  assumptions were found.

---

[<- Previous: Executive Summary](01_EXECUTIVE_SUMMARY.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Project Review ->](03_PROJECT_REVIEWS/PROJECT_001_markdown-renderer.md)
