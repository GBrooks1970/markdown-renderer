# Migration Plans

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md)

**Reviewer:** AI assistant (Codex GPT-5)

These are incremental plans, not a recommendation to replace the current no-build architecture.

## Plan 1 - Latest-Selection Rendering and Testable Browser Adapters

1. Extract a small render coordinator that issues monotonically increasing operation IDs.
2. Keep each render's fragment and blob URLs local until its operation is confirmed current.
3. Revoke URLs for stale operations without changing the pane; commit current fragment and URL
   ownership atomically.
4. Inject or parameterise the directory picker and URL lifecycle at narrow seams.
5. Build deterministic fake file/directory handles covering nested walks, lookup, permission
   transitions, and unreadable directories.
6. Add the reversed-completion test and adapter decision-table tests.
7. Run the unchanged full gate and manual real-picker smoke before merge.

## Plan 2 - Vendored Runtime Governance

1. Choose currently supported Marked, DOMPurify, and highlight.js releases compatible with classic
   scripts and offline use.
2. Download release assets from authenticated upstream sources and record SHA-256 checksums.
3. Update the vendor manifest, third-party notices, versioned licence texts, and any theme-specific
   CSS override evidence together.
4. Add a machine-readable manifest consumed by a small advisory-check command.
5. Evaluate OSV matches against the actual default-config, string-output, template-context call
   path; record applicable, not-applicable, and accepted-risk dispositions.
6. Add malicious-Markdown regression fixtures for script/event attributes, malformed markup,
   raw-text elements, SVG/MathML, dangerous URL schemes, and post-sanitisation resource rewriting.
7. Validate offline `file://`, localhost, functional, axe, licence, and live Pages behaviour.

## Plan 3 - Verification-Gated GitHub Pages

1. Keep `npm run verify` as the canonical job used by pull requests and `main`.
2. Move Pages staging into a job that depends on successful verification, or consume only a
   successful exact-SHA CI workflow run.
3. Retain read-only repository permissions for build and `pages: write`/`id-token: write` only for
   deploy.
4. Preserve the minimal `_site` contents and vendored licence bundle.
5. Add an HTML/runtime smoke check against the staged artifact before upload.
6. After deployment, request the environment URL and assert the expected title or stable marker.
7. Keep failure Playwright reports and deployment evidence on separate retention policies.

## Single Source of Truth for Features

- Keep `docs/backlog.md` authoritative for status and prioritisation.
- Record R-01..R-07 dispositions before calling the project closed.
- Use design documents for enduring requirements/decisions, not changing dependency counts.
- Generate or validate duplicated version/support claims where practical.
- Keep the vendor manifest authoritative for shipped third-party versions and checksums.

## Docker Compose for Local Development

N/A - a loopback dependency-free Node static server already reproduces the application boundary.
Docker would add image maintenance and startup cost without an external service, OS dependency, or
deployment parity requirement.

## GitHub Actions / Workflow Current Status

- Current main CI run `29760169644`: successful for `d51b056`.
- Current main Pages run `29760169642`: successful for `d51b056`.
- Local `npm run verify`: passed with 23 Vitest and 16 Playwright tests.
- Live page request: HTTP 200 and expected `<title>Markdown Renderer</title>`.
- Target state: deployment is structurally dependent on verification, not merely successful beside
  it.

## Exit Criteria

- No stale-render mismatch under reversed completion.
- Both folder backends have automated adapter evidence.
- Vendor advisory scanning covers the shipped versions.
- Pages cannot deploy an unverified SHA.
- Backlog and handover record final dispositions and validation evidence.

---

[<- Previous: Architecture Assessment](06_ARCHITECTURE_ASSESSMENT.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md)
