# Deployment verification and handoff

Updated 18 November 2026. Read [STATUS.md](STATUS.md) for the exact review candidate. No staging readiness or cost approval is granted by this document.

## Owners and agreed direction

- Zheng/Boxuan owns Google OIDC implementation, invite/role enforcement, deployment/configuration, and the deployed-SHA record. Boris supports backend/schema, samples and acceptance. Dat coordinates reviewed merges, approves costs and makes the recording-release decision.
- One Render FastAPI service serves frontend/API on the same origin. Private audio lives on a Render persistent disk behind the authorized API. Supabase PostgreSQL is the staging database. SQLite remains a local/demo fallback, not an accepted hosted substitute. Supabase Auth and Storage buckets are outside this round.
- The proposed bill in the [architecture handoff](https://github.com/phatdat220707/voices-of-the-north/pull/15#issuecomment-6945928339) is an estimate requiring current pricing and Dat's approval. No purchase, subscription or account change is authorized here.
- The original $32.25/month estimate supports a single Render Hobby operator. Separate Dat/Zheng workspace access adds a Pro workspace, yielding a $57.25/month base estimate before exclusions. Choose explicitly from [budget/access options](BUDGET-AND-ACCESS.md); do not share account credentials to avoid the Hobby seat limit.
- Local implementation/review can continue before buying hosting. Use [free-first capability limits](FREE-FIRST-STAGING.md) to identify the minimum missing capability; neither the $32.25 nor $57.25 proposal is automatically required. A free Render filesystem cannot satisfy private-upload restart durability.

## Current boundary

PR #15 is not merged; OIDC/invite enforcement still needs implementation. Local signed demo identities and adapter checks do not establish invited onboarding, hosted PostgreSQL/RLS, storage isolation or recovery.

The last team-confirmed production dashboard check was Nov 16 at `a6b932a`. A later read-only public check at 23:02 HKT on Nov 18 found frontend HTML matching main `3f23a55`, not PR #15's new e038d82. Health returned OK and reported storage/STT ready, LLM not ready. This does not identify the backend deployed SHA, tier, disk, actual STT result or authorization acceptance. No separate staging URL/deployed backend SHA is verified. The Nov 19-20 dates were conditional targets; Zheng supplies revised dates after scope/access and any necessary budget decision. Issue #3's Nov 30 acceptance date remains unless Dat changes it.

## Configure staging explicitly

1. Use a separate service, database and audio directory with synthetic data; do not reuse production recordings. Confirm the source is `phatdat220707/voices-of-the-north` after repository transfer.
2. Record service environment, reviewed source SHA, actual build/start commands and automatic-deploy behavior. Do not infer CI/deployment from a GitHub merge. No project GitHub Actions workflow is currently established.
3. Disable demo auth and demo admin. Use a stable server-only signing secret, require the PostgreSQL connection, and set `VTN_RECORDS_DIR` to the mounted disk. Do not silently fall back to local SQLite when invited staging expects PostgreSQL. Configure Google OAuth callback/origin, server-verified OIDC identity, allowlist, stable owner IDs and reviewer roles.
4. Put credentials and invite/account lists directly in approved hosting secrets/private access channels, never public GitHub or a public-view Doc. Keep frontend tokens separate from server secrets.
5. Record a public-safe staging URL and deployed SHA, then verify the served bundle matches that source. A healthy `/api/health` alone does not establish identity, durability or authorization.

## Hosted acceptance before real recording

Use the [26-case acceptance matrix](RELEASE-ACCEPTANCE.md) to record the deployed SHA, role/device, expected/observed result and proof. All its hosted cases start as NOT RUN.

- Check invited, uninvited, guest, contributor A, contributor B and reviewer. B cannot read A's private text/audio, including direct and Range requests. Guests see only approved public material; contributors cannot grant themselves review roles or publish directly.
- Run real consent -> record -> STT -> transcript/sharing review -> private submission -> reviewer approve/reject -> public source playback -> owner withdrawal. Keep cancelled and failed operations from displaying success or losing drafts. Check both server state and the local sharing badge, including saved overrides.
- After withdrawal verify catalog, map, search, Ask and old audio/Range URLs deny public access. Re-check cache/offline/error paths and authenticated retries.
- Restart/redeploy and verify database/audio persistence. Restore database and audio to compatible points, verify withdrawn content stays withdrawn, and repeat cross-account/guest denial. Provider snapshots alone do not prove this paired recovery.
- Use phone and desktop browser sessions against the exact deployed SHA. Record pass/fail/not-run, sample procedure, expected/observed result, browser and safe evidence. Keep identity and raw-media evidence private.

Dat authorizes a contributor release only after these gates and incident/takedown ownership are verified. Dat is the prototype coordination contact; Zheng operates the service. If recording gates remain open, retain recording on staging; separately verify read-only public scope.
