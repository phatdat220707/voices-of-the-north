# Staging budget and access decision

Prepared for Dat on **18 November 2026 (HKT)**. **Proposal only: no spending, account creation, permission grant or service activation is approved by this document.** Ref: Issue #3 and the agreed staging direction in [STATUS.md](STATUS.md).

## What changes the earlier estimate

The proposed US$32.25/month stack is arithmetically consistent for a **single Render workspace operator**. Hobby allows one member; separate Dat and Zheng dashboard accounts need Pro or higher. Never solve the seat limit by sharing a password or a personal access token. [Render plan limits](https://render.com/docs/platform-features-by-plan), [workspace roles](https://render.com/docs/team-members).

## Two configurations to choose from

Estimates below assume one new staging service, one 1GB audio disk, one Supabase Pro organization with its first Micro project, and a full month at listed base prices. Existing production services are **not** included or upgraded by this proposal.

| Item | A: one staging operator | B: separate Dat/Zheng access |
| --- | ---: | ---: |
| Render workspace | Hobby: $0 | Pro: $25 |
| Render service, 0.5 CPU / 512MB | $7 | $7 |
| Render persistent audio disk, 1GB | $0.25 | $0.25 |
| Supabase Pro + first Micro project | $25 | $25 |
| **Monthly base subtotal (USD)** | **$32.25** | **$57.25** |

Render compute/disk amounts: [pricing](https://render.com/pricing). Pro workspace price: [official plan change](https://render.com/changelog/updated-plans-for-render-workspaces). Supabase includes enough compute credit for one Micro project on Pro: [pricing](https://supabase.com/pricing). Confirm the actual dashboard quote before provisioning; a second paid project changes the arithmetic.

**Recommendation:** choose B if Dat must retain direct dashboard oversight while Zheng independently operates staging. A is a lower-cost alternative only if Dat explicitly accepts one named workspace operator and a documented ownership/recovery handoff. Neither option is selected yet.

These are base estimates, not guaranteed maximum bills. Taxes, currency/card fees, bandwidth/build overages, external backup storage, real Google STT/other AI usage, extra projects, larger compute and paid add-ons are excluded. No extra subscription or upgrade is in scope without another decision. A first billing-cycle trial and its review/renewal date should be recorded before activation; automatic renewal has not been approved here.

## Cost controls to record, not assume

- Keep one Micro database and the chosen smallest service/disk; record actual usage/invoice and who checks it. Hosting/billing controls and resource upgrades belong to the named operator; Dat approves changes.
- Keep Supabase's applicable spend cap enabled. It does **not** cap compute and all add-ons; it is not a global dollar ceiling. [Supabase cost controls](https://supabase.com/docs/guides/platform/cost-control).
- Provider alerts do not prove an application will stop at a budget amount. No Mapbox service is part of this staging decision; its proposed US$50 hard cap does not exist as a provider-enforced billing limit. [Mapbox billing FAQ](https://docs.mapbox.com/accounts/faq/can-i-set-up-a-cap-for-monthly-spending/).
- Disk snapshots and database backups are separate. The hosted restore drill must recover a compatible database/audio pair and preserve withdrawal restrictions. [Render disks](https://render.com/docs/disks), [Supabase backups](https://supabase.com/features/database-backups). No paid PITR/backup add-on is approved.

## Access handoff

Record the following privately with the billing owner and Zheng. Public GitHub evidence should contain only the environment name, reviewed/deployed SHA, safe URL and test result.

| Resource | Required action/capability | Responsible handoff |
| --- | --- | --- |
| Render staging workspace | Identify actual account/workspace owner and plan; deployment, logs, environment variables, disk mount and restart controls | Dat confirms ownership/cost option; Zheng configures the designated staging service |
| GitHub deploy source | Connect the transferred repository, selected reviewed revision and recorded deployment trigger; preserve Dat-only merge governance | Zheng records the source and deployed SHA; Dat coordinates source approval |
| Supabase staging project | SQL/schema setup, connection/pooler configuration and documented runtime DB role; do not expose database credentials to the browser | Zheng configures; Boris supports schema and adapter checks |
| Google OAuth project | Correct callback/origin, test configuration, server-side client settings and agreed invite/reviewer identities | Zheng implements OIDC; Dat confirms the private roster |
| Private audio disk | Explicit mounted `VTN_RECORDS_DIR`, authorized API-only access and capacity check | Zheng; Boris verifies cross-account/audio/Range denial |
| Recovery destination | Approved encrypted backup destination, access owner, compatible database/audio manifest and withdrawal reconciliation procedure | Zheng prepares and executes synthetic restore; Dat reviews results |

Use individual platform accounts and the minimum available role that supports the named task. Do not grant new access, share credentials, create keys or change billing merely by checking an item in this table. Supply secrets directly to approved hosting secrets/private channels, not this repo or a public-view Doc.

## Decision record — pending

- Selected option: **not selected**.
- Billing owner / workspace owner / sole operator if A: **not confirmed**.
- First billing-cycle allowance and renewal/review date: **not approved**.
- STT and backup usage allowance: **not approved**.
- Access actually supplied: **not verified**.
- Activation result and deployed SHA: **not run**.

Zheng can continue local OIDC/configuration work without purchasing resources. Hosted dates must be confirmed after the selected option, access, reviewed backend revision and quote are ready. Neither a cost decision nor a successful deployment authorizes real-user recording; use [release acceptance](RELEASE-ACCEPTANCE.md).
