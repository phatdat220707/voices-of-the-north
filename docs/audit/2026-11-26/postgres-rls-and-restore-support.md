# PostgreSQL/RLS and restore support — 2026-11-26

## What the repository provides

- A PostgreSQL connection adapter with SQLite fallback for local/demo use.
- A migration that creates the application tables, enables RLS on each table,
  and defines the server-side data relationship model.
- API-level ownership, publication, withdrawal, consent, review and audit
  checks that are exercised against isolated SQLite and synthetic data.
- A disposable-PostgreSQL regression at
  `tools/test_postgres_review_atomicity.py` that verifies save and review use
  the same advisory lock and fail closed as concurrent writers.

## What Boris can support

- Apply or review the schema migration in a staging-only Supabase project.
- Create and validate the restricted application role and connection.
- Run CRUD, RLS, cross-account denial, withdrawal, and concurrency checks
  against staging.
- Prepare a paired database-plus-audio restore procedure and verify counts,
  hashes, consent/review state, withdrawal tombstones, and owner-only access.
- Validate the FastAPI connection, session cookie behavior, and same-origin
  API/media routing after hosting configuration.

## Access and configuration still needed

- A staging-only Supabase project reference and migration/owner access, without
  exposing credentials in the repository or group chat.
- A restricted runtime DSN stored in hosting secrets.
- A Render staging service/workspace with deployment, environment, log,
  restart, and persistent-disk access owned by a named operator.
- The exact persistent audio mount path.
- An approved encrypted backup destination plus a disposable restore target.
- Zheng's Google OIDC client/callback configuration and the contributor,
  reviewer, and uninvited test identities.
- Dat's cost/billing approval before any paid resource is enabled.

## Evidence boundary

No hosted PostgreSQL/RLS, persistent-audio restart, or paired restore test has
been executed. Local and mocked adapter checks are not hosted acceptance.
