# Continue development before approving hosting costs

Prepared **18 November 2026**. No new paid resource, account, credential or deployment is created by this plan. It supplements the agreed FastAPI + PostgreSQL + private-audio architecture; it does not replace that architecture or count partial tests as release acceptance.

## What the team can do immediately

| Work | New hosting purchase needed? | Owner / handoff |
| --- | --- | --- |
| Repair/review code, merge locally, rebuild UI, run synthetic contribution/moderation/withdrawal tests | No | Boris and Zheng; send exact SHA/results |
| Implement direct Google OIDC and invite enforcement locally | No new hosting purchase; existing OAuth test configuration/access still needed for a real identity run | Zheng, separate branch; document callback/role contract |
| Mobile/desktop local UI and Ask a Story checks | No | Steven; label fixtures/emulation and exact candidate |
| Prepare scope, consent-cleared demo excerpts, claims and pitch | No hosting purchase | Dat and Douglas; raw media/consent remains private |
| Local persistence and backup/recovery rehearsal with synthetic data | No new hosted service; does not prove Render/PostgreSQL hosted recovery | Zheng/Boris; Dat reviews procedure |
| Real STT, a hosted database or a new platform account | Not established as free by this plan | Check existing project access, quotas, terms and billing before use |

None of these requires buying Mapbox, upgrading a team workspace or automatically selecting Supabase Pro.

## What zero-cost hosted checks can and cannot prove

**Render Free:** useful for disposable code/identity-flow experiments if the existing workspace has capacity. It sleeps after inactivity and its local files can be lost on restart/redeploy/spindown; it cannot attach a persistent disk. Therefore newly uploaded audio on that filesystem cannot satisfy the agreed durability/restore gate. Only use synthetic, replaceable data for that path. Free service hours/quotas are shared with other services; do not disrupt the existing demo or assume unlimited free capacity. [Render Free limitations](https://render.com/docs/free), [persistent disks](https://render.com/docs/disks).

**Supabase Free:** can support PostgreSQL integration experiments if an eligible existing/free project is available, within its quotas. It may pause after low activity, and free projects require manual exported backups rather than the Pro daily-backup feature. A free database does not solve the separate ephemeral-audio problem. [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), [backup guide](https://supabase.com/docs/guides/platform/backups).

Moving audio to a free object bucket would require a new storage integration and its access tests. Supabase Auth/Storage are deliberately outside this round, so do not quietly add them just to label the deployment free. Existing bundled sample audio is not evidence that new uploads persist.

## Cost choices, only when the missing capability is needed

All figures below are **base estimates, not invoices or guaranteed caps**, excluding taxes, STT, usage/backup overages and existing services. Nothing is activated or selected.

| Path | Base estimate | What it buys / remaining limitation |
| --- | ---: | --- |
| Local checks / existing demo, no new services | $0 new hosting | Continue current engineering/review work; no hosted acceptance claim |
| Disposable Render Free + available Supabase Free project | $0 base within quotas | Hosted metadata/identity experiments; new audio remains disposable; no durability acceptance |
| One paid Render service + 1GB disk + available Supabase Free project | $7.25/month | Can preserve audio under the agreed disk design; DB pause/manual backup and actual restart/restore still need review; one Hobby workspace operator |
| Same service/disk + Supabase Pro first Micro project | $32.25/month | Removes free-project inactivity pausing and adds daily DB backups; still needs paired audio recovery; one Hobby operator |
| Add Render Pro workspace for separate Dat/Zheng dashboard members | +$25/month | Team dashboard collaboration only; does not implement OIDC, repair application behavior or itself prove release readiness |

Sources: [Render pricing](https://render.com/pricing), [workspace limits](https://render.com/docs/platform-features-by-plan), [Supabase pricing](https://supabase.com/pricing). The $7.25 path assumes a free database project is actually available and accepted for this prototype. Neither that assumption nor the live quota has been verified in a dashboard.

The extra $25 Render workspace cost is optional unless independent dashboard membership is required. Do not share a login/token to work around a seat limit. Hosting can have one named operator with documented handoff if Dat explicitly accepts that operating model. Billing approval, account ownership and actual access are separate from GitHub repo ownership.

## Configuration inventory: confirmed vs unknown

At this review main is `3f23a55`; PR #15 has advanced to `e038d82`. No tracked Render Blueprint, Procfile or Docker deployment specification was found in those checked revisions. The repository documents local commands, but the actual hosting build/start command, plan, disk and auto-deploy trigger remain dashboard-specific facts for Zheng to supply. Do not create a guessed configuration and present it as the live service setup.

No Render/Supabase billing dashboard, existing credits, free-project availability, OAuth quota or cloud secret was accessed during this review. The public app/health read is not proof of the hosting tier or durable disk. A local Docker availability probe lacked daemon access and no database container was started; no local PostgreSQL/RLS result is claimed.

## Next handoff to remove uncertainty

Zheng can complete local auth/configuration while supplying a **redacted inventory**: actual staging service/plan/operator, source/deployment trigger, audio mount, usable PostgreSQL project, OAuth test setup, backup destination and the precise missing access. Do not include credentials or billing details publicly. Dat then approves only a specifically identified resource/amount if free/local resources cannot meet the next needed check.

Use synthetic data until the [deployed acceptance matrix](RELEASE-ACCEPTANCE.md) and recording-release decision pass. Spending money is not a substitute for those checks.
