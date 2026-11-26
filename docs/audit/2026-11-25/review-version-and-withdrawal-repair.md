# 2026-11-25 review-version and withdrawal repair

## Input

Boxuan reviewed `a94cc80bc90d8db25edbb6a2ee440c516ed2dc66` on PR #20 and
identified two release blockers:

- an approval could be applied to a newer submission than the one the reviewer
  loaded;
- a withdrawn record could still serve direct transcript or audio access when
  a legacy public row coexisted with its withdrawal tombstone.

He also observed that an icon-only edit could reset an existing approval.

## Changes

- Every submission now receives an opaque `submissionVersion`.
- Reviewer approval requires that exact version. A stale or missing version is
  rejected with HTTP 409 (missing: HTTP 400), so a reviewer cannot approve a
  version they did not load.
- The frontend sends the version from the reviewer card and preserves version
  metadata during record synchronization.
- Content changes clear the old submission/review-version metadata and return
  the record to private `ready` state.
- Re-uploading byte-identical audio during an icon-only or metadata edit no
  longer counts as a content change.
- Withdrawal idempotency now repairs a stale public row instead of returning
  before the row is made private. Both `scope` and `requestedScope` become
  `private`.
- Direct record listing, transcript reads and audio reads all consult
  withdrawal tombstones for non-owners. Owners and reviewers retain private
  access for recovery and audit.

## Focused verification

- `tools/test_contribution_flow.py`: passed, including stale-version rejection
  and approval of the current version.
- `tools/verify/publication_acceptance.py`: 211/211 passed, including:
  - title, English-title and keyword edits requiring renewed approval;
  - identical-audio icon edit preserving approval;
  - invalid duration rejection;
  - opaque submission-version binding;
  - tombstone enforcement on direct transcript/audio/list access;
  - idempotent repair of a legacy stale public row.
- `tools/verify/withdrawal_namespace.py`: 90/90 passed.
- `tools/verify/withdrawal_frontend.cjs`: 67/67 passed.
- `tools/verify/pr15_p1_followup.py`: 20/20 passed.
- `tools/verify/publication_findings.py`: both historical publication defects
  remain closed.
- `tools/test_records_api.py`: 75/75 passed.
- `tools/test_lab_api.py`: 48/48 passed.
- `tools/verify/story_scope.py`: 25/25 passed.
- `tools/verify/english_retrieval.py`: 20/20 passed.
- `tools/verify/story_media.py`: 6/6 browser checks passed.
- `tools/verify/real_stories.py`: 46/46 passed.
- `tools/verify/map_upgrade.py`, `tools/verify/fix_1108.py`,
  `tools/verify/database_bridge.py`, and `tools/verify/supabase_storage.py`
  passed.
- The 17-story frontend rebuilt successfully and its bundled JavaScript passed
  syntax validation.

All checks used isolated SQLite/audio, synthetic identities and synthetic WAV
data. Hosted OIDC, PostgreSQL/RLS, private audio persistence, restart/restore
and deployed-browser acceptance remain outstanding and are not claimed by
these local results.
