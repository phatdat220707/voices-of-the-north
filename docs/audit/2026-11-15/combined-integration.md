# Combined integration update — November 15, 2026

The existing `codex/local-integration-20261114` branch has been updated from
`6debeccca987913e5ec675ac8fd461afe1a12a19` with the revised Boris candidate and
Steven's latest published UI work. This is a review candidate. No main-branch
merge or deployment was performed.

## Included revisions

| Source | Included commit |
| --- | --- |
| Previous combined candidate | `6debeccca987913e5ec675ac8fd461afe1a12a19` |
| [Boris PR #15](https://github.com/phatdat220707/voices-of-the-north/pull/15) | `c539cd14ecdb08e22070faa6452b29ed6695f526` |
| [Steven UI branch](https://github.com/phatdat220707/voices-of-the-north/tree/fix/demo-labels-a11y-confidence) | `8f87b157e172e89162e1bd888e3c5997f4b642c6` |
| [English retrieval PR #14](https://github.com/phatdat220707/voices-of-the-north/pull/14), retained | `32b5f9800ccf5c0f066582f9de3dead71b845e80` |

Boris and Steven were merged separately, preserving their ancestry. The only
manual conflicts were the English test fixture comment and Steven's evidence
ignore rule. The English fixture still patches both imported corpus bindings.
The generated HTML was rebuilt from the combined source rather than selecting
either contributor's prebuilt HTML. Both source heads and PR #14 were verified
as ancestors of combined source commit `7239cd1`.

Steven's changes include three-language filter names, a larger filter hit area,
assistant label refresh on language changes, visible demo labels for mock media
and story confidence, and the unavailable-confidence wording. Confidence
thresholds and backend publication rules are not changed by Steven's branch.
The separate map-onboarding branch remains available and was not merged as part
of this request to update the older integration branch.

## Rerun results

| Check | Result on the combined source |
| --- | --- |
| `python -X utf8 tools/test_records_api.py` | 80 passed |
| `python -X utf8 tools/test_contribution_flow.py` | 60 passed |
| `python -X utf8 tools/test_lab_api.py` | 48 passed |
| `python -X utf8 tools/verify/database_bridge.py` | 25 passed |
| `python -X utf8 tools/verify/supabase_storage.py` | 12 passed |
| `python -X utf8 tools/verify/english_retrieval.py` | 20 passed |
| `fix_1108.static_checks()` | 20 passed |
| `python -X utf8 tools/verify/publication_acceptance.py` | 70 independent assertions passed |
| `node tools/verify/steven_ui_integration.cjs` | 41 frontend module assertions passed |
| `python -m py_compile server.py lab_api.py storage.py` | passed |
| `python -X utf8 tools/build_frontend.py` | passed; 14 stories |
| `python -X utf8 tools/check_frontend_syntax.py` | passed; 1/1 script blocks |

The six existing API/adapter/retrieval suites total **245 passing assertions**.
With the additional 20 static, 70 publication and 41 frontend module assertions,
this run passed **376 assertions**. The Supabase adapter check uses SQLite and
source/schema markers; it does not establish live PostgreSQL, RLS or restart
acceptance. Frontend module checks execute the actual i18n/assistant modules
and verbatim badge, queue/rendering and catalog functions with DOM doubles.
They are not a browser or screen-reader test.

All backend child processes removed database URL and Gemini variables, disabled
real `.env` loading, used separate temporary SQLite/audio/data paths and pointed
Google credentials at a nonexistent temporary file. Only synthetic identities
and audio were used. No production data, cloud database or STT was exercised.

## Older findings: revision-specific status

The November 14 reports and [older PR #15 review comment](https://github.com/phatdat220707/voices-of-the-north/pull/15#issuecomment-6878198220)
describe `a53dcc9`/`6debecc`, not the revised candidate. The user's recheck and
[Boris's follow-up](https://github.com/phatdat220707/voices-of-the-north/pull/15#issuecomment-6879076599)
report the content-edit repair at `c539cd1`; the combined contribution regressions
also pass.

- **Original approved transcript/audio replacement P1: fixed in `c539cd1`,
  superseding the old finding.** Changed reviewed content returns to
  private/ready and clears the old approval. The earlier description must not be
  read as a current failure of this combined candidate.
- **Owner privacy-narrowing P1: fixed for the tested API path.** The revised
  contribution suite checks immediate narrowing and removal of guest access;
  the client now applies canonical returned publication fields.
- **Reviewer queue P2: implementation updated.** Admins now load submitted
  contributions separately from their owner-filtered recordings. Real browser
  approval/rejection acceptance remains a separate check. The module regression
  confirms another owner's submission reaches Done rendering with approve and
  reject buttons, without owner scope/withdraw/delete actions; ordinary members
  do not retain the reviewer queue.
- **Empty-catalog follow-up: fixed in the module regression.** Successful `[]`
  responses remove the old local corpus; populated results replace it and a
  failed network request preserves the last successful data.

The independent publication test verifies replacement audio byte-for-byte for
the owner, guest text/audio denial, public-catalog removal and Ask refusal of an
explicit private ID. The actual API JavaScript stores the server's private/ready
state. Icon-only metadata changes without an audio upload preserve approval.
The old `publication_findings.py` diagnostic is retained locally as historical
evidence; its expectations deliberately reproduce the old bug, so it is not the
acceptance command for the revised candidate.

### Separate follow-ups observed during the new test

These do not reopen the original unreviewed-content exposure finding:

- When the server omits cleared submission/review timestamps and reviewer fields,
  the frontend merge retains the old local values. Canonical scope and
  `reviewStatus` do update; the new test reports the stale metadata separately.
- Reuploading byte-identical audio during a metadata update also invalidates
  approval. The client can include its retained `audioDataURL` on resync, so the
  no-audio metadata-preservation case does not cover that path.

These follow-ups are reported for review, not changed by this integration.

## Browser and release limits

An attempt to continue real-browser verification was stopped by the Computer
Use tool because it could not reliably identify the current browser URL. No
browser inputs were attempted afterward. This run does not claim new browser
acceptance of the reviewer flow, touch geometry or demo-label rendering.

Before release, use separate contributor/reviewer browser sessions to submit,
review and reject/approve a recording; recheck public-to-private scope and
guest/audio/catalog/Ask visibility. Inspect Steven's filter hit area at phone
widths, language-dependent accessible names, mock labels and unavailable
confidence. Live Supabase CRUD/RLS/restart/backup, invited OIDC and private object
storage also remain outside these local checks. **No deploy.**
