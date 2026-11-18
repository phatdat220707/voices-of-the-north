# Current work and decisions

Last reconciled: **18 November 2026 (HKT)**. This is a dated handoff snapshot, not an automatic deployment status. Check the linked PR's current head before testing or editing.

## Start here

1. Find your issue and first independent task below.
2. Read [AGENTS.md](../../AGENTS.md), the [shared flow](DEMO-FLOW.md), and the relevant code.
3. Work on your branch, give the reviewer a SHA and test steps, then notify Dat after the handoff. Dat merges reviewed PRs; a merge is not a recording-release approval.

Dat's next handoff is prepared: [budget/access decision](BUDGET-AND-ACCESS.md), [product/demo scope and historical-map review](PRODUCT-SCOPE.md), and [26 deployed acceptance cases](RELEASE-ACCEPTANCE.md). Budget choice, actual platform access and hosted sign-off remain pending; these documents do not activate a service or authorize new map implementation.

## Repository and review state

- `main` at this audit: [`3f23a55`](https://github.com/phatdat220707/voices-of-the-north/commit/3f23a55da85eb390b7501a19ce6b2d56631b60c9).
- Steven's UI fixes [#16](https://github.com/phatdat220707/voices-of-the-north/pull/16), local Ask a Story [#17](https://github.com/phatdat220707/voices-of-the-north/pull/17), and toolbar adjustment [#18](https://github.com/phatdat220707/voices-of-the-north/pull/18) are merged. This does not establish a deployed SHA or full Issue #5 acceptance.
- [Backend integration #15](https://github.com/phatdat220707/voices-of-the-north/pull/15) is Draft at `e90d7f75209fb086958c283f74059bd628270698`. It has not been merged or deployed. A later Nov 18 independent check supersedes the earlier merge-conflict note: GitHub reports mergeable and a local merge with main `3f23a55` completes without conflicts. Boris still needs the saved-sharing-override repair and a newly tested integrated SHA, not a manual conflict investigation for these inputs.
- The original withdrawal-authority P1 is closed for e90d7f7. A [saved sharing-override P2](https://github.com/phatdat220707/voices-of-the-north/pull/15#issuecomment-6945438123) remains: a recording card may display public after the server has made it private/withdrawn. No server access bypass was demonstrated by that UI finding.
- Boris and Zheng report 541 selected automated assertions passing on e90d7f7; Zheng also documented limited local-browser withdrawal checks. Those results do not transfer automatically to the next merged candidate or a hosted service.
- Independent Nov 18 QA merged these exact inputs locally and rebuilt the bundle (local-only commit `a0460e0`, source tree `1b4d879ab8cb2035c4af086ac76109bb0e6e416a`). All 541 selected existing assertions plus data/build/syntax passed on that tree. An additional 10-case saved-override probe passed eight failure/cancel controls and failed both successful-withdrawal entrypoints: canonical private/withdrawn but effective local scope public. No actual browser or hosted service acceptance was run in this QA; no repair, remote integration merge or deploy was performed.
- PRs #10-14 are historical component proposals already included in #15's ancestry. Preserve their evidence and branches; use #15 for integration review rather than merging the old PRs separately.
- Cleanup applied Nov 18: PRs #10-14 are closed as superseded, without merging or deleting their branches. Duplicate UI planning issue #9 is closed; active UI acceptance remains in #5. Issues #2-8 now contain the current handoff notes, and #3 is assigned to Zheng.
- GitHub rejected assigning `BorisLau` to #4 (HTTP 422). Boris remains the named accountable owner in that issue; confirm accepted repository access before assigning his account. This cleanup does not grant new access.
- Repository setup [#1](https://github.com/phatdat220707/voices-of-the-north/pull/1) carries current docs and archives and still needs a teammate's review before Dat merges it. Its original Nov 16 checkpoint is overdue; it is not silently marked completed.

## Parallel next steps

| Owner | Issue / current independent work | Review and final dependency |
| --- | --- | --- |
| Dat (`phatdat220707`) | [#2](https://github.com/phatdat220707/voices-of-the-north/issues/2): finish repo/workflow review; [#6](https://github.com/phatdat220707/voices-of-the-north/issues/6): prepare moderation/public-visibility acceptance. Confirm scope, billing decisions and the release/takedown contact. Dat is the coordination contact for errors and takedowns during this prototype. | Zheng reviews technical evidence; Dat makes merge/release decisions. No recording release before the gates pass. |
| Zheng / Boxuan (`buwanmihayou`) | [#3](https://github.com/phatdat220707/voices-of-the-north/issues/3): implement Google OIDC + invite allowlist; prepare staging configuration, access matrix, paired database/audio restore and deployment evidence. This can proceed on an isolated branch while Boris repairs #15. | Re-review Boris's new SHA. Hosted provisioning requires Dat's cost approval and account access. Provide a revised dated staging plan; Nov 19-20 were conditional targets, not accepted ready dates. |
| Boris (`BorisLau`) | [#4](https://github.com/phatdat220707/voices-of-the-north/issues/4) / #15: repair saved scope overrides only after successful withdrawal acknowledgement; cover failure/cancel plus owner, another member and reviewer; reconcile latest main and regenerate the bundle. | Zheng reviews the new SHA; Dat checks the user flow. Support PostgreSQL/schema and hosted acceptance after staging access is supplied. |
| Steven (`kakasplayer2266-max`) | [#5](https://github.com/phatdat220707/voices-of-the-north/issues/5): preserve merged UI/Ask changes during integration; prepare fixture walkthroughs for all contributor states and repeat mobile/desktop checks on the next candidate. Onboarding v2 is a separate pending handoff. | Dat reviews UI; coordinate shared files with Boris. Existing screenshots are dated local evidence, not proof of the next candidate or a physical-phone test. |
| Douglas (`PromizedFlower`) | [#7](https://github.com/phatdat220707/voices-of-the-north/issues/7): Competition & Pitch; consolidate current PRD, tested claims and deferred proposals. Review the new interview's consent and intended use with Steven before demo inclusion. | Dat approves scope and claims; Steven checks deck/demo playback. Historical-map and Mapbox PRDs remain proposals, not implementation or spending authorization. |

Original delivery dates remain in [ROADMAP.md](ROADMAP.md). Owners must propose replacement dates for missed checkpoints; Dat confirms them. Do not invent a new same-day deadline from this snapshot.

## Product decisions and proposal boundaries

- Public target: read/listen/ask about approved stories. Recording and submission are invited-only; new content is private, publication requires reviewer approval, and withdrawal removes public text/audio/search/map/Ask access.
- Ask a Story solicits a new story from a person. Ask the Village searches existing authorized stories. A local question pin is not a public server submission; replying must still go through the recording/moderation flow.
- Current era controls filter story years. Changing historical geography requires dated geographic data, not merely a new renderer. The November 18 Mapbox PRD is under review: its proposed US$50 hard cap must not be described as a provider-enforced limit. [Mapbox confirms no monthly billing cap](https://docs.mapbox.com/accounts/faq/can-i-set-up-a-cap-for-monthly-spending/). [MapLibre supports raster layers](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-raster-tile-source/). Check data rights, coverage and a small comparison before a migration decision.
- Recorded interviews are newly reported team inputs, not yet reviewed release assets. Keep raw material and consent records private; confirm approved excerpts, attribution and sharing scope before publishing. Script readings verify a technical path, not authentic personal history or customer demand.

## Staging and release

Agreed direction: **Render FastAPI (frontend + API, one origin) + persistent private-audio disk + Supabase PostgreSQL + Google OIDC verified in FastAPI with an invite allowlist**. Local/demo SQLite remains available. Supabase Auth and Storage buckets are not part of this round. Paid activation is not approved by this document.

No verified separate staging URL or accepted deployed SHA is recorded. The last team-confirmed production check was Nov 16 at `a6b932a`; do not infer that current main is deployed. Invited auth is still implementation work, not just an unrun test. Hosted database/RLS, private audio, real STT, restart and paired restore remain acceptance gates. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Main protection

Two active rulesets were configured on Nov 18: only `phatdat220707` can bypass the update restriction **through a PR**, and a separate rule requires one approving review, dismisses stale approvals, resolves review threads and blocks deletion/force-push without bypass. No required CI check is configured because no project CI workflow is currently established; local evidence and human review remain necessary. Repository owners can administer these rules, so changes to governance must be explicit and recorded.
