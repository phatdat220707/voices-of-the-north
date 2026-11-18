# Dat's independent exact-head recheck and free-first handoff

Date: **18 November 2026 (HKT)**. Candidate PR #15 head: **e038d823446bd6d8dd115ae7a61a26372841dd13**. Main checked: **3f23a55da85eb390b7501a19ce6b2d56631b60c9**. No source repair, remote merge, deployment, login, recording or transcription request was performed by this review.

## Local result

All **560** selected existing assertions passed independently on the exact candidate: namespace 84, withdrawal frontend 65, focused P1 20, records 81, contribution 60, lab 48, publication 70, frontend UI 41, English 20, database bridge 25, adapter 12, scope backend 14 and static UI 20. Build validation passed for 14 stories and bundled-JavaScript syntax parsed 1/1. No full browser run is included.

The separate saved-override probe that failed on e90d7f7 now passes **10/10** cases: success, 403, 500, network failure and cancellation through both record and published-story entrypoints. On success, the canonical recording is private/withdrawn and its effective `scopeOf` is private. Prior state is preserved before acknowledgement and after failed/cancelled operations. A different recording's family override remains unchanged.

This closes the reproduced override defect for these local paths, rather than requiring Boris to repair it again. Zheng still re-reviews the exact SHA before integration. `git merge-tree --write-tree` with checked main succeeded without conflicts; resulting merge tree e00434b8d6fc143da39b6411e983d3000914eeb3. This tree check does not claim that the newly combined HTML has been deployed or browser-accepted.

Run project regressions from the candidate repository root, with dependencies installed and an isolated environment:

```text
node tools/verify/withdrawal_frontend.cjs
python -X utf8 tools/verify/withdrawal_namespace.py
python -X utf8 tools/verify/pr15_p1_followup.py
python -X utf8 tools/test_records_api.py
python -X utf8 tools/test_contribution_flow.py
python -X utf8 tools/test_lab_api.py
python -X utf8 tools/verify/publication_acceptance.py
node tools/verify/steven_ui_integration.cjs
python -X utf8 tools/verify/english_retrieval.py
python -X utf8 tools/verify/database_bridge.py
python -X utf8 tools/verify/supabase_storage.py
python -X utf8 tools/build_frontend.py --check
python -X utf8 tools/check_frontend_syntax.py
```

The 14 scope assertions and 20 static assertions were run through their backend/static functions only; the scripts' browser portions are excluded. The independent 10-case probe loads the real store/API/account modules with the same controlled DOM/fetch-harness pattern and is separate from the 560 total.

Environment: Windows, Python 3.14.6, FastAPI 0.139.0, Starlette 1.3.1, HTTPX 0.28.1, Pydantic 2.14.3. All backend runs used temporary SQLite/data/audio paths, synthetic identities and WAV bytes, a nonexistent env file/Google credential path, and cleared database/Gemini credentials. Adapter results do not establish actual PostgreSQL/Supabase/RLS behavior. Sanitized logs and the independent probe are retained in Dat's local QA bundle, outside this public repo.

## Public read at 23:02 HKT

Only GET requests to `/api/health` and `/voices-of-the-north-app.html` were made.

- Both returned 200. Public app size: 717,531 bytes; SHA-256: 63d17ba93a4fccf273af7cad9677ca054c1346d6ba8f6e8a409fb90964b86ec3.
- HTML matches main 3f23a55 after newline normalization; it does not match the earlier a6b932a or backend candidate e038d82.
- Health reports status OK, storage ready, STT ready and LLM not ready. No real STT call was made; readiness is a server report, not speech accuracy or billing proof.
- Frontend parity does not identify the backend deployed SHA, hosting tier, disk, restart/restore behavior or invited-account acceptance. No separate staging URL is verified.

## Dat's no-purchase next step

Continue code/review/local identity work without selecting a paid plan. [Free-first staging](../../techathon/FREE-FIRST-STAGING.md) distinguishes disposable free hosted checks from durable-audio acceptance. Render Free cannot retain new audio through restart; Supabase Free can be used for a PostgreSQL experiment only if a project is available, with pause/manual-backup limits. Neither limitation requires an immediate purchase just to continue development.

Zheng supplies the actual service/access/configuration inventory and OIDC handoff; Boris supports schema and hosted acceptance after review. Dat approves a specific resource only when its necessity and quote are clear. No costs, account permissions, cloud secrets or live services were changed here.
