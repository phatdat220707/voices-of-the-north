# Withdrawal identity and local state repairs

Based on PR #15 head `979ccb30c52f7366484f078b91e202101bea11b1`.
Implementation branch: `codex/pr15-withdrawal-identity-fix`.

This change repairs the two findings in the [November 17 re-review](https://github.com/phatdat220707/voices-of-the-north/pull/15#issuecomment-6941576725).

## Resulting behavior

An owned recording no longer grants authority over a built-in story with the
same ID. Record upserts reject corpus IDs, including case variants, before any
media or metadata is written. Withdrawal resolves the corpus identity first and
requires an administrator for it, including when a historical same-ID recording
exists. Only the record-only path applies owner/admin recording authorization.
Static-story withdrawal uses the canonical corpus ID and does not mutate a
historical overlapping recording. Authorization still precedes idempotent replay.

The recording-card and story-detail entry points now pass their entity kind
explicitly. Recording actions update an existing local recording by its ID;
published-story actions use the server-provided `sourceRecordId`. Static stories
cannot patch an unrelated same-ID local recording. The patch happens only after
server acknowledgement, writes private/withdrawn state and the server timestamp,
and suppresses automatic re-sync. A failed request or cancelled confirmation
leaves local state unchanged. Records with missing, empty or non-empty segments
follow the same recording behavior. The shared classifier used by privacy and
correction flows is unchanged.

The bundled frontend was rebuilt from these source changes.

## Automated verification

All selected commands passed on the fixed working tree:

| Check | Passing assertions |
| --- | ---: |
| `python -X utf8 tools/verify/withdrawal_namespace.py` | 84 |
| `node tools/verify/withdrawal_frontend.cjs` | 46 |
| `python -X utf8 tools/verify/pr15_p1_followup.py` | 20 |
| `python -X utf8 tools/test_records_api.py` | 81 |
| `python -X utf8 tools/test_contribution_flow.py` | 60 |
| `python -X utf8 tools/test_lab_api.py` | 48 |
| `python -X utf8 tools/verify/publication_acceptance.py` | 70 |
| `story_scope.backend_checks()` | 14 |
| `python -X utf8 tools/verify/database_bridge.py` | 25 |
| `python -X utf8 tools/verify/supabase_storage.py` | 12 |
| `python -X utf8 tools/verify/english_retrieval.py` | 20 |
| `fix_1108.static_checks()` | 20 |
| `node tools/verify/steven_ui_integration.cjs` | 41 |
| **Total** | **541** |

Python compilation, `tools/build_frontend.py --check` (14 stories), bundled
JavaScript parsing and a complete generated-HTML/source reconstruction also
passed. No source files changed during the verification run.

The new backend regression failed against the unmodified `979ccb3` baseline and
passed after the repair. It checks all corpus IDs and case variants, absence of
media/database writes on rejected upserts, historical overlap authorization,
reviewer authority without modification of the overlapping record, owner and
non-owner recording controls, authenticated retries and guest ranged-audio denial.
The new frontend regression executes the actual store/API/account modules with
controlled network and DOM doubles and exercises the actual two button callbacks.
It covers segmented recordings, published projections, absent local copies,
same-ID static/local records, delayed acknowledgement, failures and cancellation.

The original scope script's direct-Playwright browser portion was not run. Its
14 backend checks and the separate actual-browser checks below are the verified
coverage; the full original 25-check scope result is not claimed for this run.

## Actual local browser acceptance

A temporary loopback service served the rebuilt worktree HTML byte-for-byte.
Two approved synthetic recordings were seeded with a non-empty and an empty
`segments` array respectively. A synthetic member signed in through the actual
UI and performed:

1. Recording card withdrawal of `FIX17-SEGMENTS`: after acknowledgement its card
   showed private scope and no approved badge; an independent guest browser could
   no longer read the record.
2. Story-detail withdrawal of `FIX17-PROJECTION`: the story disappeared from the
   catalogue and its existing source recording also showed private scope with no
   approved badge; the independent guest browser was denied record access.

After both UI operations, independent controls confirmed guest text/audio/Range
403, catalogue exclusion and explicit-ID Ask refusal with no sources. Owners
retained private/withdrawn canonical records and exact synthetic audio; another
member was denied and repeated owner requests preserved the original timestamp.
The temporary service was stopped and its loopback port verified unreachable.

The source-record association was obtained from the server's published story
projection. Screenshots and sanitized API controls are retained locally in
`.task-pr15-fix/browser` in the original checkout. This local evidence is not a
hosted staging result.

## Data and release boundary

Tests used temporary SQLite/audio/data paths, synthetic identities and WAV
bytes, disabled real `.env` loading and database/AI credentials, and performed no
production or hosted-service mutation. Existing conflicting records and media
are preserved; this change does not migrate, rename, delete or repair historical
data. Any existing approved/public corpus-overlapping rows require separately
reviewed reconciliation before real-data release.

Live PostgreSQL/Supabase CRUD and RLS, invited OIDC, private object storage,
hosted restart persistence, database-plus-media restore and deployed-staging
browser acceptance remain unverified. This implementation does not establish a
staging URL or deployed SHA. No merge or deployment is part of this change.
