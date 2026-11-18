# Deployed candidate acceptance and release decision

Prepared by Dat, **18 November 2026**, for Issues #3-6 and #8. This is a ready-to-run plan. **Every hosted case below is NOT RUN until evidence for the deployed SHA is attached.** The earlier 541-check candidate and latest e038d82 rerun (560 existing assertions plus 10 independent override cases, passing) are recorded separately in [STATUS.md](STATUS.md). Local success does not fill these hosted rows.

## Candidate record

| Field | Value |
| --- | --- |
| Safe staging URL / environment | Not established |
| Reviewed source SHA / actually deployed SHA | Not accepted |
| Deployment time / operator | Not recorded / Zheng accountable |
| Dat's scope/budget decision | No contributor-release or paid activation approval |
| Identity fixture labels | Guest; uninvited U; invited A and B; reviewer R (real account details private) |
| Data | Synthetic story/record IDs and synthetic audio first; consent-cleared real/STT sample separately |
| Devices | Desktop browser and physical phone, recorded by tester; emulation labelled separately |

Before running, Zheng provides the exact build/configuration and private access procedure; Boris supplies a pending submission fixture and regression steps. Dat or another teammate who did not implement the flow repeats the representative phone/guest path. Use one candidate SHA throughout; when it changes, retest affected boundaries and the representative flow.

## Case matrix

Use `PASS`, `FAIL` or `NOT RUN`, with expected/observed result and a safe evidence reference per case. Do not paste credentials, identity rosters or raw participant content. Local fixture results do not fill hosted rows automatically.

| ID | Action / expected result | Executor; reviewer | Hosted status |
| --- | --- | --- | --- |
| D01 | Confirm served frontend/API matches the recorded deployed SHA, separate from production; actual build/start/auto-deploy settings recorded | Zheng; Dat | NOT RUN |
| D02 | Demo auth/admin disabled, stable server secret, required PostgreSQL and mounted private-audio path; missing required configuration fails closed | Zheng; Boris | NOT RUN |
| A01 | Guest can read approved public material but cannot create/upload/submit/review through direct API calls | Boris; Zheng | NOT RUN |
| A02 | Invited A/B sign in through real Google OIDC; server validates identity and allowlist, with stable owner mapping | Zheng; Dat | NOT RUN |
| A03 | Uninvited U is denied contribution; changing a request's owner/role fields cannot grant privileges | Zheng; Boris | NOT RUN |
| A04 | Invalid/expired identity, wrong issuer/audience and failed callback state/nonce are denied; logout/session expiry does not retain privileged access | Zheng; Boris | NOT RUN |
| A05 | B and guest cannot fetch A's private/pending metadata or audio, including direct, Range and conditional URLs | Boris; Zheng | NOT RUN |
| C01 | Consent appears before microphone access; cancel leaves microphone idle and creates no submission | Steven; Dat | NOT RUN |
| C02 | Record a short sample, stop, leave/reopen as designed: draft is retained with an honest saved state | Boris; Dat | NOT RUN |
| C03 | Run real STT with approved sample/service allowance; review transcript/timestamps and distinguish unavailable confidence | Boris; Zheng | NOT RUN |
| C04 | Upload/STT/network failure offers retry and preserves the draft; no false success | Boris; Steven | NOT RUN |
| C05 | Review transcript and intended sharing scope; submission becomes private/pending; guest and B cannot discover it | Boris; Dat | NOT RUN |
| M01 | Reviewer R sees A's pending item without receiving owner-only controls; an ordinary member has no reviewer queue/authority | Boris; Zheng | NOT RUN |
| M02 | R rejects one sample and approves another; contributor cannot forge approval via generic sync/direct publish | Boris; Dat | NOT RUN |
| P01 | Approved public sample appears consistently in archive/list/search/map/Ask and plays through the protected audio route | Dat; Zheng | NOT RUN |
| P02 | Source citation opens the correct story/time; an unsupported/empty-scope question refuses without fabricated sources | Dat; Douglas | NOT RUN |
| W01 | Owner A withdraws approved recording through its card; only after server acknowledgement does the correct record/badge become private/withdrawn | Boris; Dat | NOT RUN |
| W02 | Repeat via the published story's source-record link, with a prior public sharing override and non-empty transcript segments; correct local private badge | Boris; Dat | NOT RUN |
| W03 | Non-owner B is denied; HTTP failure, delayed response and cancellation preserve prior state and unrelated records | Boris; Zheng | NOT RUN |
| W04 | After acknowledged withdrawal, fresh guest catalog/map/search/Ask and old audio/Range URLs cannot retrieve it; owner retains intended private access | Dat; Zheng | NOT RUN |
| W05 | Retry withdrawal is authorized/idempotent and preserves first timestamp; reserved/case-variant corpus IDs cannot grant recording authority or share media | Boris; Zheng | NOT RUN |
| W06 | Cached/offline/server-error paths do not republish or retrieve withdrawn/private material; changing reviewed content requires review again | Dat; Zheng | NOT RUN |
| S01 | Restart/redeploy the designated staging service; database state and exact private audio survive | Zheng; Boris | NOT RUN |
| S02 | Restore a compatible database/audio backup pair in isolated staging; replay/reconcile later acknowledged withdrawals before reopening access; repeat guest/B denial | Zheng; Dat | NOT RUN |
| U01 | Physical phone + desktop walkthrough: five contributor states, readable next actions, language refresh, modal bounds, keyboard/focus and touch targets | Steven; Dat | NOT RUN |
| U02 | Local Ask a Story creates a local question and hands context to recorder without bypassing invited submission/moderation; optional media missing/error paths remain honest | Steven; Dat | NOT RUN |

If the architecture uses direct SQL connections, record the runtime database role and the actual row-isolation enforcement being tested. Per-request API authorization and database RLS claims need distinct evidence; direct Google OIDC alone does not demonstrate Supabase Auth/RLS behavior.

## Evidence row template

```text
Case / result:
Reviewed SHA / deployed SHA / environment:
Tester / device / browser / time HKT:
Fixture labels and safe reproduction:
Expected / observed:
Safe proof reference (private evidence kept private):
Defect owner / next action if failed:
```

## Recovery drill details

Use synthetic data. Record schema version, backup timestamps, audio storage-key/file-hash manifest and the withdrawal ledger reference. Pause writes during the consistent capture/restore window. Restore into the designated isolated environment, check database/audio associations, then reconcile withdrawal/takedown actions acknowledged after the selected backup point before exposing any public route. A restored old database must not silently make removed material public again.

Record the observed data-loss window and service recovery time; Dat accepts or rejects that recovery behavior. Supabase database backups and Render audio disk snapshots are separate provider features, not proof that a compatible pair has been recovered. Do not restore production data for this drill.

## Release decision

- Recording release: **NOT APPROVED**.
- Read-only public release: **not automatically approved**; assess its visibility and failure behavior separately if contribution gates remain incomplete.
- Revision-specific defect status: the saved sharing-override P2 on e90d7f7 is repaired in e038d82 for the independently tested local paths. Zheng's exact-head re-review, integrated browser acceptance and hosted cases above remain pending.
- Takedown/error coordination: Dat. Service operation: Zheng. Backend repair/support: Boris. UI: Steven. Public claims/deck: Douglas.
- Decision requires the named deployed SHA, the completed evidence matrix, unresolved-defect disposition and Dat's recorded approval. Passing a local suite, a healthy service or a GitHub merge alone is insufficient.
