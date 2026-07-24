# Recommendations

[<- Previous: Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)

**Reviewer:** AI assistant (Codex GPT-5)

## Recommended Refactors

- **P1 - Make rendering latest-selection-wins.** Add a generation/abort protocol, keep each
  render's URLs local until commit, and test reversed completion order (R-01).
- **P1 - Add vendor-aware dependency governance.** Upgrade authenticated vendor assets, record
  checksums, and scan the machine-readable versions separately from the npm lockfile (R-02).
- **P1 - Test both folder adapters.** Provide fake FS API handles and cover enumeration,
  permission, lookup, unreadable-directory, and refresh paths (R-03).
- **P2 - Gate deployment on verification.** Put Pages behind the verified job or a successful
  exact-SHA workflow run (R-04).
- **P3 - Tighten static/docs/visual evidence.** Check the shipped JS, reconcile duplicated docs,
  and start with two focused screenshot baselines (R-05..R-07).

## Next Steps

1. Reconcile the backlog with R-01..R-07 and decide whether the resting project should reopen
   before a formal close-project run.
2. Fix R-01 first because it is a reproduced product-correctness defect independent of dependency
   or workflow policy.
3. Pair the DOMPurify upgrade with malicious-Markdown regression cases and an explicit advisory
   applicability note; do not rely on a zero-result npm audit for vendor assets.
4. Add the mocked-handle lane before widening browser engines; it addresses a larger unproved code
   branch than a second rendering engine.
5. Change the deployment graph only after the same local `npm run verify` gate remains green.

## Future Project Ideas

- Add light/dark component screenshots for the rendered sample and one narrow responsive layout.
- Add an optional status disclosure for unreadable/skipped directories without exposing local
  absolute paths.
- Record a compact release-evidence checklist covering real FS picker, Firefox/Safari fallback,
  live Pages content, and vendor advisory review.
- Consider preserving a rendered document fragment/hash when following `file.md#section`, if user
  demand justifies expanding navigation semantics.

## Recorded Questions (Unattended Review)

1. Should R-01..R-04 reopen the resting backlog before the proposed formal close-project run, or
   should any finding receive an explicit accepted-risk disposition?
2. Where is evidence for the documented manual Firefox/Safari verification retained, and should a
   repeatable release checklist become the source for that supported-browser claim?
3. Should visual regression remain a parked portfolio idea, or become a scoped LOW backlog item
   now that the product has a stable sample document and two themes?

No response was awaited; the questions are recorded for owner disposition.

## Definition of Done for the Highest-Priority Tranche

- A deterministic test reverses two file-read completion times and the latest selection owns the
  sidebar, pane, and object URLs.
- Vendor versions and checksums are machine-readable; a CI command evaluates them against an
  advisory source.
- The FS API adapter has automated nested-walk and refresh/permission cases.
- A failing verify job makes the corresponding deployment ineligible.
- `npm run verify`, `npm audit`, review-link checks, and the live-content check are recorded.

---

[<- Previous: Cross-Cutting Analysis](04_CROSS_PROJECT_ANALYSIS.md) | [Back to Index](00_CODE_REVIEW_CODEX_v1_20260724T0024Z.md) | [Next: Architecture Assessment ->](06_ARCHITECTURE_ASSESSMENT.md)
