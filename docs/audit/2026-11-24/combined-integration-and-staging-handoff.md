# 2026-11-24 combined integration and staging handoff

## Result

The 17-story/map candidate now includes both of the latest adjacent fixes:

- Base: `265cab9` (`codex/local-integration-20261114`), containing the
  three authorized interview stories and the map upgrade.
- Boris withdrawal repair: `e038d82`, including the saved-scope-override fix
  after successful server acknowledgement.
- PR #19: `6bc30fe`, including transcript-only rendering, media-error fallback,
  and removal of non-interactive timestamp buttons.

The merged implementation was validated as `2ff9270` before this handoff
document was added. The branch is
`codex/today-integration-20261124` in the authoritative repository
`phatdat220707/voices-of-the-north`. The integration PR is
`https://github.com/phatdat220707/voices-of-the-north/pull/20`; use the PR
head for the current documentation SHA.

## Local verification

All checks below ran locally against synthetic identities, temporary
SQLite/audio/data, or the checked-in static frontend. No hosted database,
Google identity provider, production service, or private deployment was
mutated.

- `tools/test_records_api.py`: 75/75 passed.
- `tools/test_contribution_flow.py`: passed, including login, private
  submission, reviewer approval/rejection, second-account denial, guest
  visibility, content re-review, withdrawal, and local UI state.
- `tools/test_lab_api.py`: 48/48 passed.
- `tools/verify/publication_acceptance.py`: 70/70 passed.
- `tools/verify/withdrawal_frontend.cjs`: 65/65 passed.
- `tools/verify/steven_ui_integration.cjs`: 41/41 passed.
- `tools/verify/withdrawal_namespace.py`: 90/90 passed for all 17 static story
  IDs and representative case variants.
- `tools/verify/pr15_p1_followup.py`: 20/20 passed.
- `tools/verify/database_bridge.py`: passed.
- `tools/verify/supabase_storage.py`: passed.
- `tools/verify/story_media.py`: 5/5 browser checks passed, including KT-002
  transcript-only rendering, audio/video seeking, and media-error fallback.
- `tools/verify/real_stories.py`: 46/46 passed, including local media Range
  requests, real-story API visibility, Ask citations, and withdrawal blocking.
- `tools/verify/map_upgrade.py`: passed, including historical imagery fallback,
  geocoding behavior, offline place search, and no browser runtime errors.
- `tools/build_frontend.py --check`: 17 stories valid.
- `tools/build_frontend.py`: rebuilt the bundled frontend.
- `tools/check_frontend_syntax.py`: 1/1 script parsed.
- Python compilation passed for `server.py`, `map_api.py`, `storage.py`, and
  `lab_api.py`.

PR #19 was also checked at its exact head `6bc30fe` in an isolated worktree:
the 14-story data check and JavaScript syntax check passed, and all five
`story_media.py` browser scenarios passed.

## Deployment status

There is still no verified staging URL or accepted staging deployment SHA.
The local candidate does not establish:

- server-side invited Google OIDC and invite-list behaviour;
- hosted PostgreSQL/RLS and private audio persistence;
- restart persistence or paired database/audio restore;
- browser acceptance against the deployed candidate.

The current implementation still uses demo authentication for local testing.
Demo authentication and demo administrator grants must remain disabled for any
real staging acceptance. Do not report the local results above as deployed
results.

A read-only check of the currently reachable production URL on 2026-11-24 at
20:22 HKT returned:

- `/api/health`: HTTP 200, `story_count=14`, `storage_mode=scoped`,
  `stt_ready=true`, `ai_status=degraded`.
- `/api/stories`: 14 visible stories. The three `RL-001` to `RL-003` interview
  stories from the combined candidate are not deployed.

This production observation is not a staging acceptance result and does not
verify the combined candidate.

## Next handoff

Zheng/Boxuan can use `codex/today-integration-20261124` for exact-head review
and PR reconciliation. Staging remains blocked on their OIDC/invite
implementation, hosting configuration, and a safe deployed build reference.
Dat should receive the candidate branch plus the separation between local and
deployed evidence above.
