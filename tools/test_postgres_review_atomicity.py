"""PostgreSQL two-writer regression for approval/save serialization.

Run against a disposable local PostgreSQL database:

    VTN_DATABASE_URL=postgresql://... \
    VTN_DATABASE_REQUIRED=1 \
    python tools/test_postgres_review_atomicity.py

The script refuses non-loopback databases so a review test cannot mutate a
hosted project by accident.
"""

from __future__ import annotations

import os
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlsplit

import psycopg

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main() -> None:
    dsn = os.environ.get("VTN_DATABASE_URL", "")
    if urlsplit(dsn).hostname not in ("127.0.0.1", "localhost"):
        print("SKIP: VTN_DATABASE_URL must point to a disposable local PostgreSQL")
        return

    os.environ.update({
        "VTN_DATABASE_REQUIRED": "1",
        "VTN_DEMO_AUTH": "1",
        "VTN_DEMO_ALLOW_ADMIN": "1",
        "VTN_SECRET": "postgres-atomicity-local-only",
        "VTN_STORY_DATA": str(ROOT / "data/stories.json"),
    })

    from fastapi.testclient import TestClient
    import server

    assert server.storage_ready, server.storage_reason
    login_client = TestClient(server.app)

    def login(name: str, admin: bool = False) -> dict[str, str]:
        response = login_client.post("/api/auth/verify", json={
            "school_id": name, "password": "postgres-atomicity",
            "admin": admin,
        })
        response.raise_for_status()
        return {"Authorization": "Bearer " + response.json()["token"]}

    owner = login("postgres-atomicity-owner")
    reviewer = login("postgres-atomicity-reviewer", admin=True)
    policy = server.load_data()["consentPolicyVersion"]
    rid = "PG-ATOMIC-" + os.urandom(5).hex().upper()
    payload = {
        "id": rid,
        "status": "done",
        "source": "live",
        "title": "PostgreSQL atomic approval fixture",
        "formalText": "version one",
        "rawText": "version one",
        "durationSec": 1,
        "consentRef": policy,
        "contributionFlow": True,
        "requestedScope": "public",
        "segments": [{"start": 0, "end": 1, "text": "version one"}],
    }
    created = login_client.post("/api/records", headers=owner, json=payload)
    assert created.status_code == 200, created.text
    submitted = login_client.post(f"/api/contributions/{rid}/submit", headers=owner, json={
        "transcriptConfirmed": True,
        "requestedScope": "public",
        "policyVersion": policy,
    })
    assert submitted.status_code == 200, submitted.text
    version = submitted.json()["record"]["submissionVersion"]

    blocker = psycopg.connect(dsn, autocommit=True)
    blocker.execute(
        "SELECT pg_advisory_lock(hashtextextended(%s, 0))",
        (rid,),
    )
    outcomes: dict[str, int] = {}

    def update_record() -> None:
        with TestClient(server.app) as client:
            response = client.post("/api/records", headers=owner, json={
                "id": rid,
                "status": "done",
                "formalText": "version two",
                "rawText": "version two",
                "segments": [{"start": 0, "end": 1, "text": "version two"}],
            })
            outcomes["update"] = response.status_code

    def approve_record() -> None:
        with TestClient(server.app) as client:
            response = client.post(f"/api/contributions/{rid}/review", headers=reviewer, json={
                "approved": True,
                "approvedScope": "public",
                "submissionVersion": version,
            })
            outcomes["review"] = response.status_code

    update_thread = threading.Thread(target=update_record)
    review_thread = threading.Thread(target=approve_record)
    update_thread.start()
    review_thread.start()
    time.sleep(0.35)
    assert update_thread.is_alive(), "record save did not take the per-record lock"
    assert review_thread.is_alive(), "review did not take the same per-record lock"

    blocker.execute(
        "SELECT pg_advisory_unlock(hashtextextended(%s, 0))",
        (rid,),
    )
    blocker.close()
    update_thread.join(timeout=10)
    review_thread.join(timeout=10)
    assert not update_thread.is_alive() and not review_thread.is_alive()

    record = login_client.get(f"/api/records/{rid}", headers=owner).json()
    assert not (
        record.get("scope") == "public"
        and record.get("reviewStatus") == "approved"
    ), record
    assert outcomes.get("review") in (200, 409), outcomes
    assert outcomes.get("update") == 200, outcomes
    print("PASS PostgreSQL save/review use the same record lock and fail closed")


if __name__ == "__main__":
    main()
