"""Verify the two PR #15 P1 follow-ups with isolated local dependencies."""

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


FRONTEND_HARNESS = r"""
const fs = require('fs');
const vm = require('vm');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const state = {toasts: [], withdrawn: [], patches: [], renders: 0};
const record = {
  id: 'P1-OWNER', status: 'done', scope: 'public',
  reviewStatus: 'approved', segments: undefined
};
const VTN = {
  config: {},
  util: {},
  i18n: {t: key => key},
  ui: {
    confirm: () => Promise.resolve(true),
    toast: (text, kind) => state.toasts.push({text, kind})
  },
  store: {
    records: {
      get: id => id === record.id ? record : null,
      patch: (id, patch, options) => {
        if (id !== record.id) throw new Error('wrong record ID');
        state.patches.push({patch, options});
        Object.assign(record, patch);
        return record;
      }
    },
    withdrawn: {add: item => state.withdrawn.push(item.id)}
  },
  api: {
    withdraw: () => input.mode === 'success'
      ? Promise.resolve({ok: true, withdrawnAt: '2026-11-17T04:00:00+08:00'})
      : Promise.reject(Object.assign(new Error('forbidden'), {status: 403}))
  },
  recordings: {renderAll: () => { state.renders += 1; }},
  stories: {
    render: () => { state.renders += 1; },
    refreshFromServer: () => Promise.resolve(true)
  },
  router: {current: () => ({view: 'recordings'}), go: () => {}},
  assistant: {refresh: () => {}}
};
const context = vm.createContext({window: {VTN}, document: {}, Blob});
vm.runInContext(input.code, context, {filename: '65-account.js'});
Promise.resolve(VTN.account.openWithdraw(record, {kind: 'record'})).then(result => {
  process.stdout.write(JSON.stringify({result, state, record}));
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
"""


def frontend_withdrawal(mode: str) -> dict:
    result = subprocess.run(
        ["node", "-e", FRONTEND_HARNESS],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        input=json.dumps({
            "mode": mode,
            "code": (ROOT / "frontend/src/js/65-account.js").read_text(encoding="utf-8"),
        }),
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout)


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="vtn-pr15-p1-") as tmp:
        root = Path(tmp)
        for key in (
            "DATABASE_URL",
            "SUPABASE_DB_URL",
            "VTN_DATABASE_URL",
            "GEMINI_API_KEY",
            "GOOGLE_APPLICATION_CREDENTIALS",
        ):
            os.environ.pop(key, None)
        os.environ.update(
            VTN_ENV_FILE=str(root / "missing.env"),
            VTN_DATABASE_REQUIRED="0",
            VTN_DB_PATH=str(root / "records.db"),
            VTN_LAB_DB=str(root / "lab.db"),
            VTN_RECORDS_DIR=str(root / "audio"),
            VTN_STORY_DATA=str(ROOT / "data/stories.json"),
            VTN_DEMO_AUTH="1",
            VTN_DEMO_ALLOW_ADMIN="1",
            VTN_ADMIN_EMAILS="",
            VTN_SECRET="pr15-p1-local-only",
        )

        from fastapi.testclient import TestClient

        import server

        with TestClient(server.app) as client:
            def identity(name: str, admin: bool = False) -> dict:
                response = client.post(
                    "/api/auth/verify",
                    json={"school_id": name, "password": "demo-pass", "admin": admin},
                )
                check(f"login {name}", response.status_code == 200, response.text)
                return {"Authorization": "Bearer " + response.json()["token"]}

            owner = identity("p1-owner")
            other = identity("p1-other")
            reviewer = identity("p1-reviewer", admin=True)
            policy = server.load_data()["consentPolicyVersion"]

            record = {
                "id": "P1-CASE-AUDIO",
                "status": "done",
                "source": "live",
                "title": "P1 withdrawal fixture",
                "formalText": "case audio proof",
                "rawText": "case audio proof",
                "segments": [{"start": 0, "end": 1, "text": "case audio proof",
                              "keywords": ["case-audio-proof"]}],
                "location": {"area": "Yuen Long", "lat": 22.4445, "lng": 114.015, "radiusM": 800},
                "consentRef": policy,
                "contributionFlow": True,
                "requestedScope": "public",
                "mime": "audio/wav",
                "audioBase64": base64.b64encode(synthetic_wav(1)).decode(),
            }
            created = client.post("/api/records", headers=owner, json=record)
            check("create approved-candidate fixture", created.status_code == 200, created.text)
            submitted = client.post(
                "/api/contributions/P1-CASE-AUDIO/submit",
                headers=owner,
                json={
                    "transcriptConfirmed": True,
                    "requestedScope": "public",
                    "policyVersion": policy,
                },
            )
            check("submit fixture", submitted.status_code == 200, submitted.text)
            approved = client.post(
                "/api/contributions/P1-CASE-AUDIO/review",
                headers=reviewer,
                json={"approved": True, "approvedScope": "public"},
            )
            check("approve fixture", approved.status_code == 200, approved.text)
            expected_audio = synthetic_wav(1)
            published_audio = client.get("/api/records/P1-CASE-AUDIO/audio")
            check("fixture audio is public", published_audio.status_code == 200
                  and published_audio.content == expected_audio)

            collision_payload = dict(
                record,
                id="p1-case-audio",
                title="Collision attempt",
                formalText="different owner collision",
                rawText="different owner collision",
                audioBase64=base64.b64encode(synthetic_wav(9)).decode(),
            )
            collision = client.post("/api/records", headers=other, json=collision_payload)
            check("case-only ID variant is rejected", collision.status_code == 409, collision.text)
            check("case-only collision cannot overwrite public audio",
                  client.get("/api/records/P1-CASE-AUDIO/audio").content == expected_audio)
            check("case-only collision cannot create an alias record",
                  client.get("/api/records/p1-case-audio").status_code == 404)

            denied = client.post(
                "/api/stories/P1-CASE-AUDIO/withdraw",
                headers=other,
                json={},
            )
            check("non-owner cannot withdraw record", denied.status_code == 403, denied.text)
            check("denied withdrawal leaves public record visible",
                  client.get("/api/records/P1-CASE-AUDIO").status_code == 200)

            withdrawn = client.post(
                "/api/stories/P1-CASE-AUDIO/withdraw",
                headers=owner,
                json={"reason": "Owner request"},
            )
            check("owner can withdraw own approved record", withdrawn.status_code == 200,
                  withdrawn.text)
            repeated = client.post(
                "/api/stories/P1-CASE-AUDIO/withdraw",
                headers=owner,
                json={},
            )
            check("owner retry is idempotent",
                  repeated.status_code == 200
                  and repeated.json()["withdrawnAt"] == withdrawn.json()["withdrawnAt"])
            check("withdrawn record leaves public catalog",
                  "P1-CASE-AUDIO" not in client.get("/api/stories").json()["visibleIds"])
            check("withdrawn record audio is blocked",
                  client.get("/api/records/P1-CASE-AUDIO/audio").status_code == 403)

        failed_ui = frontend_withdrawal("failure")
        check("frontend reports failed withdrawal", failed_ui["result"] is False
              and failed_ui["state"]["toasts"][-1]["text"] == "withdraw.failed"
              and failed_ui["state"]["toasts"][-1]["kind"] == "error")
        check("failed withdrawal does not hide content locally",
              failed_ui["state"]["withdrawn"] == []
              and failed_ui["state"]["patches"] == []
              and failed_ui["record"]["scope"] == "public")

        success_ui = frontend_withdrawal("success")
        check("frontend marks success only after server acknowledgement", success_ui["result"] is True
              and success_ui["state"]["withdrawn"] == ["P1-OWNER"]
              and success_ui["record"]["reviewStatus"] == "withdrawn")
        check("successful withdrawal patches canonical private state",
              success_ui["state"]["patches"][0]["patch"]["scope"] == "private"
              and success_ui["state"]["patches"][0]["options"] == {"suppressSync": True})

    print(f"ALL PASSED: {COUNT} PR #15 P1 follow-up checks")


if __name__ == "__main__":
    main()
