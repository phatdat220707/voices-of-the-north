"""Independent publication regression acceptance with synthetic local records.

Run: python -X utf8 tools/verify/publication_acceptance.py

Uses isolated SQLite/audio, no .env or live cloud credentials, and the actual
FastAPI application. Node executes the actual frontend API module with recorded
server responses. Boundary observations are reported separately from acceptance.
"""
from __future__ import annotations

import base64
import io
import json
import os
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
COUNT = 0


def check(label: str, condition: bool, detail: object = "") -> None:
    global COUNT
    COUNT += 1
    if not condition:
        raise AssertionError(f"FAIL {label}: {detail}")
    print(f"PASS {label}", flush=True)


def synthetic_wav(sample: int) -> bytes:
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(bytes([sample, 0]) * 8000)
    return output.getvalue()


NODE_HARNESS = r"""
const fs = require('fs');
const vm = require('vm');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
let local = input.before;
let posted;
let patchOptions;
const VTN = {
  config: {apiBase: ''},
  util: {},
  store: {
    session: () => ({email: 'synthetic@example.test', role: 'member', token: 'local-test'}),
    records: {
      patch: (id, patch, options) => {
        if (id !== local.id) throw new Error('wrong local ID');
        patchOptions = options;
        local = {...local, ...patch};
        return local;
      }
    }
  }
};
const fetch = async (url, options) => {
  posted = {url, ...options};
  return {
    ok: true,
    headers: {get: () => 'application/json'},
    json: async () => input.response
  };
};
const context = vm.createContext({window: {VTN}, fetch, FormData, setTimeout, clearTimeout});
vm.runInContext(input.code, context, {filename: '15-api.js'});
VTN.api.records.sync(local).then(() => {
  process.stdout.write(JSON.stringify({local, posted, patchOptions}));
}).catch(error => { console.error(error); process.exitCode = 1; });
"""


def frontend_sync(before: dict, response: dict) -> dict:
    run = subprocess.run(
        ["node", "-e", NODE_HARNESS], cwd=ROOT, text=True, encoding="utf-8",
        input=json.dumps({
            "before": before, "response": response,
            "code": (ROOT / "frontend/src/js/15-api.js").read_text(encoding="utf-8"),
        }), capture_output=True, check=True,
    )
    return json.loads(run.stdout)


def main() -> None:
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    print("Publication acceptance source HEAD: " + head, flush=True)
    with tempfile.TemporaryDirectory(prefix="vtn-publication-acceptance-") as tmp:
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
            VTN_SECRET="publication-acceptance-local-only",
            GOOGLE_APPLICATION_CREDENTIALS=str(temporary / "missing-google.json"),
        )
        from fastapi.testclient import TestClient
        import server

        with TestClient(server.app) as client:
            def post(path: str, payload: dict, auth: dict | None = None) -> dict:
                response = client.post(path, json=payload, headers=auth or {})
                check(path + " returns 200", response.status_code == 200, response.text)
                return response.json()

            def identity(name: str, admin: bool = False) -> dict:
                result = post("/api/auth/verify", {
                    "school_id": name, "password": "synthetic-password", "admin": admin,
                })
                return {"Authorization": "Bearer " + result["token"]}

            owner = identity("publication-acceptance-owner")
            other = identity("publication-acceptance-other")
            reviewer = identity("publication-acceptance-reviewer", admin=True)
            policy = server.load_data()["consentPolicyVersion"]

            def fixture(rid: str, **fields: object) -> tuple[dict, dict]:
                original = {
                    "id": rid, "status": "done", "source": "live",
                    "title": "Synthetic approved contribution", "formalText": "originalproof transcript",
                    "rawText": "originalproof transcript", "durationSec": 1, "consentRef": policy,
                    "contributionFlow": True, "requestedScope": "public", "scope": "public",
                    "segments": [{"start": 0, "end": 1, "text": "originalproof transcript",
                                  "keywords": ["originalproof"]}],
                    "mime": "audio/wav", "audioBase64": base64.b64encode(synthetic_wav(0)).decode(),
                    "location": {"area": "Yuen Long", "lat": 22.4445, "lng": 114.015, "radiusM": 800},
                }
                original.update(fields)
                created = post("/api/records", original, owner)["record"]
                check(rid + " creation is private/ready",
                      created["scope"] == "private" and created["reviewStatus"] == "ready", created)
                submitted = post(f"/api/contributions/{rid}/submit", {
                    "transcriptConfirmed": True, "requestedScope": "public", "policyVersion": policy,
                }, owner)["record"]
                check(rid + " submission is private/submitted",
                      submitted["scope"] == "private" and submitted["reviewStatus"] == "submitted")
                approved = post(f"/api/contributions/{rid}/review", {
                    "approved": True, "approvedScope": "public", "note": "Original content only",
                }, reviewer)["record"]
                check(rid + " approved public fixture",
                      approved["scope"] == "public" and approved["reviewStatus"] == "approved"
                      and bool(approved.get("reviewedAt")) and bool(approved.get("reviewedBy")))
                check(rid + " guest reads approved record", client.get(f"/api/records/{rid}").status_code == 200)
                check(rid + " guest plays approved audio",
                      client.get(f"/api/records/{rid}/audio").content == synthetic_wav(0))
                catalog = client.get("/api/stories").json()
                check(rid + " enters guest catalog", rid in catalog["visibleIds"])
                answer = post("/api/ask-village", {"question": "originalproof", "storyIds": [rid]})
                check(rid + " is searchable while approved", answer.get("inScope") is True
                      and answer.get("storyId") == rid, answer)
                return original, approved

            def private_assertions(rid: str, record: dict, expected_audio: bytes) -> None:
                check(rid + " replacement/private narrowing canonical state",
                      record["scope"] == "private" and record["reviewStatus"] == "ready", record)
                check(rid + " old review metadata is cleared", all(record.get(key) is None for key in (
                    "submittedAt", "reviewedAt", "reviewedBy", "reviewNote")), record)
                check(rid + " guest record denied", client.get(f"/api/records/{rid}").status_code == 403)
                check(rid + " guest audio denied", client.get(f"/api/records/{rid}/audio").status_code == 403)
                check(rid + " other member record denied",
                      client.get(f"/api/records/{rid}", headers=other).status_code == 403)
                check(rid + " owner still reads record",
                      client.get(f"/api/records/{rid}", headers=owner).status_code == 200)
                own_audio = client.get(f"/api/records/{rid}/audio", headers=owner)
                check(rid + " owner audio matches expected bytes",
                      own_audio.status_code == 200 and own_audio.content == expected_audio)
                catalog = client.get("/api/stories").json()
                check(rid + " absent from guest catalog", rid not in catalog["visibleIds"]
                      and all(story["id"] != rid for story in catalog["stories"]))
                answer = post("/api/ask-village", {"question": "reviewescape", "storyIds": [rid]})
                check(rid + " Ask refuses explicit private ID", answer.get("inScope") is False
                      and answer.get("storyId") != rid and not answer.get("sources"), answer)

            original, approved = fixture("ACCEPT-CONTENT")
            for auth, label in (({}, "guest"), (other, "other member")):
                denial = client.post("/api/records", headers=auth, json=original)
                check(label + " cannot replace owner content", denial.status_code == 403)
            replacement = dict(original, formalText="reviewescape replacement transcript",
                               rawText="reviewescape replacement transcript",
                               segments=[{"start": 0, "end": 1, "text": "reviewescape replacement transcript",
                                          "keywords": ["reviewescape"]}],
                               audioBase64=base64.b64encode(synthetic_wav(1)).decode())
            response = post("/api/records", replacement, owner)
            record = response["record"]
            check("replacement transcript/segments persisted for owner",
                  record["formalText"] == replacement["formalText"]
                  and record["segments"] == replacement["segments"])
            private_assertions(original["id"], record, synthetic_wav(1))

            sync = frontend_sync(dict(approved, sync="synced"), response)
            check("actual 15-api.js posts expected endpoint/method",
                  sync["posted"]["url"] == "/api/records" and sync["posted"]["method"] == "POST")
            check("actual 15-api.js stores canonical private/ready state",
                  sync["local"]["scope"] == "private" and sync["local"]["reviewStatus"] == "ready")
            check("actual 15-api.js suppresses recursive sync", sync["patchOptions"] == {"suppressSync": True})
            stale = [key for key in ("submittedAt", "reviewedAt", "reviewedBy", "reviewNote")
                     if key not in record and sync["local"].get(key) == approved.get(key)
                     and sync["local"].get(key) is not None]
            print("BOUNDARY frontend omitted-field merge retains old metadata: " + json.dumps(stale), flush=True)

            _original, approval = fixture("ACCEPT-NARROWING")
            private = dict(approval, scope="private", requestedScope="private")
            private.pop("audioUrl", None)
            narrowed = post("/api/records", private, owner)["record"]
            check("private narrowing preserves owner requestedScope", narrowed["requestedScope"] == "private")
            private_assertions("ACCEPT-NARROWING", narrowed, synthetic_wav(0))

            original, approval = fixture("ACCEPT-METADATA")
            metadata = dict(approval, iconKey="oral")
            metadata.pop("audioUrl", None)
            kept = post("/api/records", metadata, owner)["record"]
            check("icon-only edit without audio preserves public approval",
                  kept["scope"] == "public" and kept["reviewStatus"] == "approved")
            check("icon-only edit keeps original reviewer metadata",
                  all(kept.get(key) == approval.get(key) for key in (
                      "submittedAt", "reviewedAt", "reviewedBy", "reviewNote")))
            check("icon-only edit stays guest-readable",
                  client.get("/api/records/ACCEPT-METADATA").status_code == 200)
            partial_icon = post("/api/records", {
                "id": "ACCEPT-METADATA", "status": "done", "iconKey": "oral-history", "requestedScope": "public",
            }, owner)["record"]
            check("partial icon edit preserves approved content and sharing scope",
                  partial_icon["scope"] == "public" and partial_icon["reviewStatus"] == "approved"
                  and partial_icon["formalText"] == kept["formalText"] and partial_icon["segments"] == kept["segments"])
            same_audio = dict(partial_icon, audioBase64=original["audioBase64"])
            same_audio.pop("audioUrl", None)
            replay = post("/api/records", same_audio, owner)["record"]
            print("BOUNDARY identical audio reupload on metadata edit: " + json.dumps({
                "scope": replay.get("scope"), "reviewStatus": replay.get("reviewStatus"),
                "sameBytes": True,
            }, sort_keys=True), flush=True)

            for field, value in (
                ("title", "Revised contribution title"),
                ("titleEn", "Revised English title"),
                ("keywords", ["revisedkeyword"]),
            ):
                rid = "ACCEPT-REVIEW-" + field
                _, approval = fixture(rid, titleEn="Initial English title", keywords=["originalproof"], segments=[])
                edited = post("/api/records", {
                    "id": rid, "status": "done", field: value, "requestedScope": "public",
                }, owner)["record"]
                check(field + " edit preserves unspecified transcript and audio",
                      edited[field] == value and edited["formalText"] == approval["formalText"])
                private_assertions(rid, edited, synthetic_wav(0))
                query = value[0] if isinstance(value, list) else value
                answer = post("/api/ask-village", {"question": query, "storyIds": [rid]})
                check(field + " edit is hidden from guest Ask pending review", not answer["sources"])
                post(f"/api/contributions/{rid}/submit", {
                    "transcriptConfirmed": True, "requestedScope": "public", "policyVersion": policy,
                }, owner)
                post(f"/api/contributions/{rid}/review", {"approved": True, "approvedScope": "public"}, reviewer)
                answer = post("/api/ask-village", {"question": query, "storyIds": [rid]})
                check(field + " edit can be found after renewed approval", answer["storyId"] == rid)

            for invalid in ("unknown", "inf", "NaN", -1, True):
                response = client.post("/api/records", headers=owner, json={
                    "id": "ACCEPT-INVALID-DURATION", "status": "done", "durationSec": invalid,
                })
                check("invalid duration rejected: " + repr(invalid), response.status_code == 400)
            optional = post("/api/records", {"id": "ACCEPT-OPTIONAL-DURATION", "durationSec": None}, owner)
            check("null duration can be omitted from measurement", optional["record"]["durationSec"] is None)

            rid = "ACCEPT-LEGACY-DURATION"
            _, approval = fixture(rid, durationSec="2.5")
            legacy = dict(approval, durationSec="unknown", words=[{"end": "inf"}, {"end": "2.5"}],
                          segments=[{"start": "nan", "end": "inf", "text": "Invalid timestamp"}],
                          keywords=["legacydurationproof"])
            connection = server._connect()
            try:
                connection.execute("UPDATE records SET data_json=? WHERE id=?", (json.dumps(legacy), rid))
                connection.commit()
            finally:
                connection.close()
            catalog = client.get("/api/stories")
            check("legacy duration leaves guest catalog and healthy stories available",
                  catalog.status_code == 200
                  and {rid, "ACCEPT-REVIEW-keywords"} <= set(catalog.json()["visibleIds"]))
            projected = next(story for story in catalog.json()["stories"] if story["id"] == rid)
            check("legacy duration falls back to finite word timing",
                  projected["durationSec"] == 2.5 and projected["segments"][0]["end"] == 2.5)
            answer = post("/api/ask-village", {"question": "legacydurationproof", "storyIds": [rid]})
            check("legacy duration keeps the guest Ask citation finite",
                  answer["storyId"] == rid and answer["sources"][0]["end"] == 2.5)
            answer = post("/api/ask-village", {"question": "revisedkeyword"})
            check("legacy duration leaves other guest Ask results available",
                  answer["storyId"] == "ACCEPT-REVIEW-keywords")
    print(f"ALL PASSED: {COUNT} publication acceptance assertions at {head}", flush=True)


if __name__ == "__main__":
    main()
