# Findings reverification — 2026-11-14

Source: `codex/local-integration-20261114` at `6debeccca987913e5ec675ac8fd461afe1a12a19`.

## Backend P1 verification

Command: `python -X utf8 tools/verify/publication_findings.py`

**Both P1 findings reproduced.** The diagnostic exited 0 because its expectations explicitly assert that the reported defects remain observable. This is not a release acceptance pass and does not mean either defect is fixed. The unchanged full test suites were not repeated.

The reproducible diagnostic creates separate synthetic fixtures through the real API: signed member creation, current-policy submission, admin approval, and subsequent owner changes. It uses `TestClient`, temporary SQLite/audio/data directories and synthetic one-second WAV files. All database URLs and Gemini credentials are removed before import; `.env` and Google credentials point to nonexistent temporary files. No live database, speech, model, production or object-storage service is contacted. No application fix, Git write, external message, or production mutation was performed.

Management controls held:

```json
{"unauthenticated_post":403,"other_member_post":403}
```

### P1 — Approved public content replacement

After admin approval, the owner posts the same ID to `/api/records` with replacement title, transcript, segments, keywords and audio. The server accepts the change and keeps the original approval. Guest record/audio requests, the public catalogue, and Ask the Village expose the replacement without renewed review.

Actual observed result:

```json
{
  "owner_post": 200,
  "returned_scope": "public",
  "returned_reviewStatus": "approved",
  "original_review_preserved": true,
  "guest_record": 200,
  "guest_receives_replacement_text": true,
  "guest_audio": 200,
  "guest_receives_replacement_audio": true,
  "catalogue_receives_replacement_text": true,
  "ask_inScope": true,
  "ask_receives_replacement_text": true,
  "ask_citation_start": 0.0
}
```

The original reviewer identity and timestamp were preserved. Audio equality was checked byte-for-byte; Ask used the replacement segment's unique keyword and the fixture's story ID.

Expected fixed acceptance: reject an inappropriate replacement or require renewed review before exposing changed content. A generic sync must not publish unreviewed replacement text/audio under the former approval.

### P1 — Successful privacy narrowing leaves public access

For a separate approved public record, the owner posts the same ID with `scope:"private"` and `requestedScope:"private"`. The response reports success while restoring both fields to public. Guest access remains available.

Actual observed result:

```json
{
  "requested_scope": "private",
  "owner_post": 200,
  "returned_scope": "public",
  "returned_requestedScope": "public",
  "returned_reviewStatus": "approved",
  "guest_record": 200,
  "guest_audio": 200,
  "still_in_guest_catalogue": true
}
```

Expected fixed acceptance: a successful narrowing removes guest record/audio/catalogue access. An unsupported operation must return an explicit failure rather than a success that leaves the record public.

These backend results reconfirm the previously reported lifecycle defects; they do not establish staged or deployed behavior. The diagnostic intentionally stops reproducing successfully when the defects are corrected, at which point fixed-behavior acceptance assertions should replace these diagnostic expectations.

## P2 — Real browser contributor/reviewer verification

**The missing reviewer submission was reproduced in the actual application UI.** A dedicated local server used a fresh temporary SQLite database and synthetic audio/accounts. The backend fixture was initially a completed private recording in `ready` state. Browser interactions used the application's school-account demo login, not a fabricated localStorage session.

The contributor browser used `http://127.0.0.1:8768`; the reviewer browser used `http://localhost:8768`. The two origins had independent browser storage while reaching the same temporary backend.

1. Signed in as the synthetic contributor and opened the completed recording `VERIFY-REVIEW-6DEBECC`.
2. Opened the submission dialog, confirmed the synthetic transcript/timestamps and submitted through the UI.
3. The contributor UI displayed private scope and pending review. See [contributor submission](p2-contributor-submitted.jpg).
4. In the independent reviewer browser, signed in with the demo administrator checkbox. The account page identified the session as administrator and showed zero saved recordings; the login accessibility state also reported merging one server record. See [reviewer identity and zero count](p2-reviewer-admin-merged-one.jpg), which captures the role and counts.
5. Opened the reviewer's recordings and selected Completed. It displayed no completed stories, with no submission or approve/reject controls. See [empty reviewer list](p2-reviewer-completed-empty.jpg).

The matching backend control used a signed synthetic administrator against the same running server. Both `GET /api/contributions` and `GET /api/records` returned 200 and contained the submitted record. The pending queue count was 1. An unauthenticated request for that still-private record returned 403. The sanitized result is saved in [backend control JSON](p2-browser-backend-control.json); it contains no bearer tokens.

The UI failure therefore persists when the authenticated backend queue contains the contribution. This browser run confirms the earlier store-filter finding. It does not verify real Google login, Supabase, object storage or a complete approve/reject workflow, because the reviewer cannot reach the submitted item in the UI.

The local test server was stopped after verification. No application fix, merge, deployment or GitHub publication was performed in this reverification.
