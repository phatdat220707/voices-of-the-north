# Issue #4 validation

## Automated checks

Run from the repository root on Windows:

```powershell
python -X utf8 tools/test_contribution_flow.py
python -X utf8 tools/test_lab_api.py
python -X utf8 tools/build_frontend.py
python -X utf8 tools/check_frontend_syntax.py
```

The contribution test creates a temporary SQLite database and synthetic WAV,
then verifies:

- client-requested public scope is forced to private at creation;
- owner-only transcript and audio access while pending;
- guest and second-contributor isolation;
- transcript and current consent-policy checks;
- reviewer-only queue, approve, reject, and post-approval access;
- approval is bound to the exact opaque `submissionVersion` the reviewer
  loaded, and a resubmission invalidates the earlier version;
- title, English title, keyword and other review-sensitive edits return the
  record to private review;
- byte-identical audio resubmission during an icon-only edit preserves an
  existing approval, including sparse saves that omit sharing fields;
- recording saves, submission, review, and withdrawal share the same
  per-record PostgreSQL advisory lock;
- withdrawn records cannot be read or played through direct record/audio
  endpoints even if a legacy row still says public, and cannot re-enter the
  submit/review lifecycle.

## Runnable pending-review fixture

Start the API, then run:

```powershell
python -X utf8 tools/seed_contribution_fixture.py --base http://127.0.0.1:8000
```

The command creates one synthetic 8000 Hz WAV recording, a contributor
account, and one submitted-private story. It prints the record ID, the
reviewer queue request, and the review request. The approval request must pass
the `submissionVersion` returned by the submit/list response. All data is
synthetic and can be used with temporary/private storage.

The PostgreSQL two-writer regression in
`tools/test_postgres_review_atomicity.py` must run against a disposable
loopback database. It intentionally refuses hosted database URLs.
