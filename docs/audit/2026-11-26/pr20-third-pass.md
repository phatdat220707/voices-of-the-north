# PR #20 third-pass repair — 2026-11-26

## Review input

Boxuan re-reviewed exact head
`873d8909695f349685a484d3956e7f53b3447bdd` and requested three
follow-ups before sign-off:

- P1: recording saves and reviewer approvals did not share the same
  PostgreSQL per-record lock.
- P2: a partial icon-only save that omitted sharing fields could still reset
  approval, including a sparse legacy-record browser save.
- P2: a withdrawn record could still enter submit/review state even though
  guest transcript and audio access was blocked.

## Changes

- `create_record`, contributor submission, reviewer approval, and withdrawal
  now use the same PostgreSQL advisory transaction lock before reading or
  mutating one record.
- Scope narrowing occurs only when the client explicitly sends `scope` or
  `requestedScope`. A sparse icon-only save preserves the existing sharing
  scope and approval.
- Byte-identical audio re-upload remains a no-op for review-sensitivity.
- Submit and review both reject records with a withdrawal tombstone, including
  legacy rows whose recorded state has not yet been repaired.
- A PostgreSQL two-writer regression was added at
  `tools/test_postgres_review_atomicity.py`. It refuses non-loopback databases
  and verifies that save and review both block on the same per-record lock and
  finish without publishing unreviewed replacement content.

## Verification

At the corrected working tree, before creating this report:

- `tools/verify/publication_acceptance.py`: 217/217 passed, including sparse
  icon-only save, withdrawal lifecycle rejection, exact-version approval,
  title/keyword re-review, identical-audio edit, invalid duration, and
  tombstone enforcement.
- `tools/test_contribution_flow.py`: passed.
- `tools/verify/withdrawal_namespace.py`: 90/90 passed.
- `tools/verify/withdrawal_frontend.cjs`: 67/67 passed.
- `tools/verify/pr15_p1_followup.py`: 20/20 passed.
- `tools/test_records_api.py`: 75/75 passed.
- `tools/test_lab_api.py`: 48/48 passed.
- `tools/verify/story_scope.py`: 25/25 passed.
- `tools/verify/english_retrieval.py`: 20/20 passed.
- `tools/verify/real_stories.py`: 46/46 passed.
- `tools/verify/story_media.py`: 6/6 browser checks passed.
- Map upgrade, frontend audit, database bridge, Supabase adapter, Python
  compilation, 17-story build, and bundled-JavaScript syntax passed.

## Environment boundary

`tools/test_postgres_review_atomicity.py` is ready but was not executed because
this machine has no disposable local PostgreSQL/Docker instance. Running it
against a hosted project would mutate that project and is intentionally
blocked.

Hosted staging remains unverified: no accepted staging URL/deployed SHA,
invited OIDC, PostgreSQL/RLS acceptance, private-audio persistence,
restart/restore, or deployed-browser acceptance has been completed.
