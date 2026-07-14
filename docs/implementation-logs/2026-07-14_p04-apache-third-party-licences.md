# P-04 Apache licence and third-party bundle — 2026-07-14

## Session summary

Implemented portfolio backlog P-04 decision D-09 after explicit owner approval. Markdown
Renderer now includes canonical Apache License 2.0 terms for original project material, a public
README licence boundary, and the complete upstream licence files for every vendored runtime
library. Runtime code and vendored assets are unchanged.

---

## Objectives

1. ✅ Apply the owner-approved Apache-2.0 project licence.
2. ✅ Keep package, lockfile, README, and root legal text consistent.
3. ✅ Bundle exact licence information for Marked 14.1.4, DOMPurify 3.1.7, and highlight.js 11.10.0.
4. ✅ Verify the bundled files against both upstream tags and the pinned CDN packages.
5. ✅ Run the repository's full `npm run verify` gate.

---

## Distribution boundary

| Material | Terms |
|---|---|
| Original Markdown Renderer code and documentation | Apache-2.0 |
| Marked 14.1.4 | MIT, with upstream Markdown attribution/terms preserved in its complete licence file |
| DOMPurify 3.1.7 | Apache-2.0 OR MPL-2.0; both full alternatives bundled |
| highlight.js 11.10.0 and its two GitHub themes | BSD-3-Clause |
| npm development dependencies | Their respective package terms; not shipped by the static Pages runtime |

`THIRD_PARTY_NOTICES.md` is the entry point for this boundary. The existing Pages workflow copies
the complete `vendor/` directory, so the local licence bundle accompanies the deployed runtime.

---

## Validation

| Check | Result | Status |
|---|---|---|
| Root `LICENSE` comparison | Exact canonical Apache-2.0 text after newline normalisation | ✅ PASS |
| Vendored licence provenance | Each local file matches its upstream version tag and exact pinned CDN package | ✅ PASS |
| Package/lock root metadata | Both resolve to `Apache-2.0` | ✅ PASS |
| `npm run verify` | TypeScript clean; 23/23 Vitest and 11/11 Playwright tests passed | ✅ PASS |
| `npm pack --dry-run --json` | Root and all vendored legal files included | ✅ PASS |
| `git diff --check` | No whitespace errors | ✅ PASS |

---

## Technical decisions

| Decision | Rationale | Alternatives rejected |
|---|---|---|
| Retain Apache-2.0 for original project material | Implements approved D-09 and matches existing package/lock intent | Relicensing the project without a new owner decision |
| Bundle complete version-pinned upstream files | The shipped page vendors its runtime libraries, so headers and a summary table alone are incomplete distribution evidence | Linking only to mutable upstream pages |
| Preserve DOMPurify's full dual-licence file | Accurately retains both upstream alternatives and avoids implying that the repository relicenses DOMPurify | Bundling only the project's preferred Apache text |
| Keep notices inside `vendor/` as well as at repository root | Pages already copies `vendor/` wholesale, ensuring the licences accompany the deployed runtime | Changing runtime deployment architecture for a documentation-only tranche |

No ADR is required because this implements an owner-approved distribution decision without
changing product architecture or behaviour.

---

*Session logged: 2026-07-14. Author: Codex, directed by Gary Brooks.*
