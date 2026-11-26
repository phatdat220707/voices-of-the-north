# PR #15 P1 follow-up — 2026-11-17

This follow-up starts from combined candidate `f5392e4`, keeps the work unmerged
and undeployed, and closes the two P1 findings in Zheng's 16 November review.

## Fixed

1. Owner withdrawal:
   - a signed-in owner can withdraw their own approved contribution;
   - a non-owner is rejected with HTTP 403;
   - demo stories still require a reviewer;
   - repeated owner withdrawal is idempotent and preserves the first timestamp;
   - the browser waits for the server acknowledgement before hiding content locally,
     and shows an error without changing local scope when the request fails.
2. Case-only record ID collision:
   - new media is stored under a server-generated random key instead of the
     client-supplied record ID;
   - a record ID that differs from an existing ID only by letter case is rejected
     with HTTP 409;
   - a second contributor cannot replace or alias another contributor's audio.

The bundled frontend was regenerated with `tools/build_frontend.py`.

## Local verification

All checks used temporary SQLite/audio/data, synthetic identities and synthetic
WAV bytes. No `.env`, hosted Supabase project, Google credential or cloud secret
was used.

- `tools/verify/pr15_p1_followup.py`: 20/20 focused P1 checks passed.
- `tools/test_records_api.py`: 75/75 passed.
- `tools/test_contribution_flow.py`: all contribution, review, publication and
  withdrawal checks passed.
- `tools/test_lab_api.py`: 48/48 passed.
- `tools/verify/publication_acceptance.py`: 70/70 passed.
- `tools/verify/story_scope.py`: 25/25 passed with local DOM and API stubs.
- `tools/verify/database_bridge.py`: passed.
- `tools/verify/supabase_storage.py`: adapter and migration checks passed.
- `tools/verify/english_retrieval.py`: 20/20 passed.
- Python compilation, frontend build, bundle syntax and 14-story validation passed.

## Test sample and steps

Run from the repository root:

```bash
python -m py_compile server.py lab_api.py storage.py
python -X utf8 tools/verify/pr15_p1_followup.py
python -X utf8 tools/test_contribution_flow.py
python -X utf8 tools/test_records_api.py
python -X utf8 tools/test_lab_api.py
python -X utf8 tools/verify/publication_acceptance.py
python -X utf8 tools/verify/story_scope.py
python -X utf8 tools/verify/database_bridge.py
python -X utf8 tools/verify/supabase_storage.py
python -X utf8 tools/verify/english_retrieval.py
python -X utf8 tools/build_frontend.py --check
python -X utf8 tools/check_frontend_syntax.py
```

For a browser acceptance run, start the FastAPI app with local temporary storage
and demo identities, sign in as contributor A for recording/submission, reviewer
for approval, contributor B for isolation, and a fresh guest browser for public
discovery and withdrawal. Keep the server-generated audio key, not the record ID,
as the storage identity under test.

## Verified locally vs. still required live

Verified locally:

- consent → recording → transcript review → private submission;
- separate reviewer approval/rejection;
- public catalogue/map/Ask visibility;
- owner and reviewer withdrawal;
- cross-account denial and case-only ID collision denial;
- SQLite persistence and the portable PostgreSQL adapter contract.

Not verified and still required on an approved staging service:

- hosted Supabase PostgreSQL CRUD, RLS and restart persistence;
- invited Google OIDC and role/invitation enforcement;
- private bucket upload/download and direct-object denial;
- backup/restore of database plus media;
- full browser acceptance against the deployed candidate and exact commit SHA.

No merge, production deployment, paid resource or cloud credential change was
performed in this follow-up.
