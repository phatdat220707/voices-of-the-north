"""Verify corpus/record withdrawal identity with isolated synthetic local data.

Run: python -X utf8 tools/verify/withdrawal_namespace.py
No real .env, cloud database, Google credentials or production audio is used.
"""
from __future__ import annotations

import base64
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
COUNT = 0


def check(label: str, condition: bool, detail: object = "") -> None:
    global COUNT
    COUNT += 1
    if not condition:
        raise AssertionError(f"FAIL {label}: {detail}")
    print("PASS " + label, flush=True)


def synthetic_wav(sample: int = 0) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(bytes([sample, 0]) * 1600)
    return output.getvalue()


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="vtn-withdrawal-namespace-") as tmp:
        temporary = Path(tmp)
        for key in ("DATABASE_URL", "SUPABASE_DB_URL", "VTN_DATABASE_URL", "GEMINI_API_KEY",
                    "GOOGLE_APPLICATION_CREDENTIALS"):
            os.environ.pop(key, None)
        os.environ.update(
            VTN_ENV_FILE=str(temporary / "missing.env"), VTN_DATABASE_REQUIRED="0",
            VTN_DB_PATH=str(temporary / "records.db"), VTN_LAB_DB=str(temporary / "lab.db"),
            VTN_RECORDS_DIR=str(temporary / "audio"), VTN_DATA_DIR=str(temporary / "data"),
            VTN_STORY_DATA=str(ROOT / "data/stories.json"), VTN_DEMO_AUTH="1",
            VTN_DEMO_ALLOW_ADMIN="1", VTN_ADMIN_EMAILS="", VTN_RECORDS_TOKEN="",
            VTN_SECRET="withdrawal-namespace-synthetic-only",
            GOOGLE_APPLICATION_CREDENTIALS=str(temporary / "missing-google.json"),
        )
        from fastapi.testclient import TestClient
        import server

        with TestClient(server.app) as client:
            def identity(name: str, admin: bool = False) -> tuple[dict, str]:
                response = client.post("/api/auth/verify", json={
                    "school_id": name, "password": "synthetic-only", "admin": admin,
                })
                check("synthetic login " + name, response.status_code == 200, response.text)
                token = response.json()["token"]
                email = server.verify_token(token)["email"]
                return {"Authorization": "Bearer " + token}, email

            owner, owner_email = identity("namespace-owner")
            other, _ = identity("namespace-other")
            reviewer, _ = identity("namespace-reviewer", True)
            policy = server.load_data()["consentPolicyVersion"]
            audio_bytes = synthetic_wav()

            def payload(rid: str) -> dict:
                return {
                    "id": rid, "status": "done", "source": "live",
                    "title": "Synthetic withdrawal record", "formalText": "namespaceproof transcript",
                    "rawText": "namespaceproof transcript", "durationSec": 0.2,
                    "segments": [{"start": 0, "end": 0.2, "text": "namespaceproof transcript",
                                  "keywords": ["namespaceproof"]}],
                    "consentRef": policy, "requestedScope": "public", "mime": "audio/wav",
                    "audioBase64": base64.b64encode(audio_bytes).decode(),
                }

            def database_rows(query: str, parameters: tuple = ()) -> list:
                conn = server._connect()
                try:
                    return conn.execute(query, parameters).fetchall()
                finally:
                    conn.close()

            def withdraw(rid: str, headers: dict, reason: str = "synthetic owner request"):
                return client.post(f"/api/stories/{rid}/withdraw", headers=headers,
                                   json={"reason": reason})

            before_catalog = client.get("/api/stories").json()["visibleIds"]
            static_ids = [str(story["id"]) for story in server.all_stories()]
            check("fixture has visible static stories", len(before_catalog) >= 2)
            static_id, variant_static_id = before_catalog[:2]

            for candidate in static_ids:
                for spelling in sorted({candidate, candidate.swapcase()}):
                    response = client.post("/api/records", headers=owner, json=payload(spelling))
                    check("corpus ID reserved: " + spelling, response.status_code == 409, response.text)
            check("reserved IDs create no database records", not database_rows("SELECT id FROM records"))
            check("reserved IDs write no media files", not list(server.RECORDS_DIR.iterdir()))
            check("reserved IDs do not withdraw static stories",
                  client.get("/api/stories").json()["visibleIds"] == before_catalog)

            # Directly seed historical overlaps that the fixed write path rejects.
            def seed_legacy(rid: str, filename: str) -> tuple:
                legacy = payload(rid)
                legacy.pop("audioBase64")
                legacy.update(owner=owner_email, scope="private", reviewStatus="ready")
                audio_path = server.RECORDS_DIR / filename
                audio_path.write_bytes(audio_bytes)
                conn = server._connect()
                try:
                    conn.execute(
                        "INSERT INTO records "
                        "(id, created_at, updated_at, status, source, has_audio, audio_path, data_json, owner, scope) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (rid, 1, 2, "done", "live", 1, str(audio_path), json.dumps(legacy), owner_email, "private"),
                    )
                    conn.commit()
                finally:
                    conn.close()
                return tuple(database_rows("SELECT * FROM records WHERE id=?", (rid,))[0])

            legacy_exact = seed_legacy(static_id, "legacy-exact.wav")
            variant_id = variant_static_id.swapcase()
            legacy_variant = seed_legacy(variant_id, "legacy-variant.wav")
            for spelling, original_row in ((static_id, legacy_exact), (variant_id, legacy_variant)):
                for headers, label in ((owner, "legacy owner"), (other, "other member"), ({}, "guest")):
                    response = withdraw(spelling, headers)
                    check(label + " cannot withdraw static identity " + spelling,
                          response.status_code == 403, response.text)
                check("denied legacy withdrawal preserves record " + spelling,
                      tuple(database_rows("SELECT * FROM records WHERE id=?", (spelling,))[0]) == original_row)
                response = client.post("/api/records", headers=owner, json=payload(spelling))
                check("legacy overlap cannot be silently overwritten " + spelling,
                      response.status_code == 409, response.text)
            check("denied overlap attempts leave withdrawal log empty",
                  not database_rows("SELECT story_id FROM withdrawals"))
            check("denied overlap attempts leave static catalog intact",
                  client.get("/api/stories").json()["visibleIds"] == before_catalog)

            for canonical_id, spelling, original_row in (
                (static_id, static_id, legacy_exact), (variant_static_id, variant_id, legacy_variant),
            ):
                response = withdraw(spelling, reviewer, "synthetic reviewer request")
                check("reviewer withdraws static identity " + spelling,
                      response.status_code == 200, response.text)
                check("static withdrawal returns canonical corpus ID " + spelling,
                      response.json()["id"] == canonical_id, response.json())
                retry = withdraw(canonical_id, reviewer, "changed retry reason")
                check("reviewer static retry preserves timestamp " + canonical_id,
                      retry.status_code == 200 and retry.json()["withdrawnAt"] == response.json()["withdrawnAt"])
                check("static withdrawal preserves unrelated legacy record " + spelling,
                      tuple(database_rows("SELECT * FROM records WHERE id=?", (spelling,))[0]) == original_row)
                check("static withdrawal preserves legacy owner audio " + spelling,
                      client.get(f"/api/records/{spelling}/audio", headers=owner).content == audio_bytes)
                check("static withdrawal removes canonical catalog story " + canonical_id,
                      canonical_id not in client.get("/api/stories").json()["visibleIds"])
                for headers, label in ((owner, "legacy owner"), (other, "other member"), ({}, "guest")):
                    retry = withdraw(spelling, headers)
                    check(label + " cannot reuse static idempotent reply " + spelling,
                          retry.status_code == 403, retry.text)
            check("case variants share canonical static withdrawal keys",
                  {row[0] for row in database_rows("SELECT story_id FROM withdrawals")} == {static_id, variant_static_id})

            rid = "NAMESPACE-OWNER-RECORD"
            response = client.post("/api/records", headers=owner, json=payload(rid))
            check("ordinary owner creates own recording", response.status_code == 200, response.text)
            response = client.post(f"/api/contributions/{rid}/submit", headers=owner, json={
                "transcriptConfirmed": True, "requestedScope": "public", "policyVersion": policy,
            })
            check("ordinary owner submits own recording", response.status_code == 200, response.text)
            submission_version = response.json()["record"]["submissionVersion"]
            response = client.post(f"/api/contributions/{rid}/review", headers=reviewer,
                                   json={
                                       "approved": True,
                                       "approvedScope": "public",
                                       "submissionVersion": submission_version,
                                   })
            check("reviewer publishes ordinary recording", response.status_code == 200, response.text)
            check("approved owner audio is public", client.get(f"/api/records/{rid}/audio").content == audio_bytes)
            for headers, label in ((other, "non-owner"), ({}, "guest")):
                response = withdraw(rid, headers)
                check(label + " cannot withdraw ordinary recording", response.status_code == 403, response.text)
            check("denied withdrawal keeps recording public", rid in client.get("/api/stories").json()["visibleIds"])
            response = withdraw(rid, owner)
            check("owner withdraws own approved recording", response.status_code == 200, response.text)
            timestamp = response.json()["withdrawnAt"]
            record = client.get(f"/api/records/{rid}", headers=owner).json()
            check("owner withdrawal applies canonical private withdrawn state",
                  record["scope"] == "private" and record["reviewStatus"] == "withdrawn")
            check("owner withdrawal removes public catalog record", rid not in client.get("/api/stories").json()["visibleIds"])
            check("owner withdrawal blocks guest text", client.get(f"/api/records/{rid}").status_code == 403)
            check("owner withdrawal blocks guest ranged audio",
                  client.get(f"/api/records/{rid}/audio", headers={"Range": "bytes=0-63"}).status_code == 403)
            check("owner retains withdrawn audio", client.get(f"/api/records/{rid}/audio", headers=owner).content == audio_bytes)
            for headers, label in ((owner, "owner"), (reviewer, "reviewer")):
                retry = withdraw(rid, headers, "changed retry reason")
                check(label + " recording retry preserves timestamp",
                      retry.status_code == 200 and retry.json()["withdrawnAt"] == timestamp)
            for headers, label in ((other, "non-owner"), ({}, "guest")):
                retry = withdraw(rid, headers)
                check(label + " cannot reuse recording idempotent reply", retry.status_code == 403, retry.text)
            check("idempotent retry preserves original actor and reason",
                  database_rows("SELECT by_user, reason FROM withdrawals WHERE story_id=?", (rid,)) ==
                  [(owner_email, "synthetic owner request")])

    print(f"ALL PASSED: {COUNT} withdrawal namespace checks", flush=True)


if __name__ == "__main__":
    main()
