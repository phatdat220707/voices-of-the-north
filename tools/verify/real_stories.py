"""真實故事聯調驗收：媒體 Range、故事 API、Ask the Village、撤回保護。

Run: python tools/verify/real_stories.py
只讀檢查，不寫入 storage；不需要外部 API 金鑰或瀏覽器。
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

CHECKS = 0
REAL_IDS = ["RL-001", "RL-002", "RL-003"]
MEDIA = {
    "RL-001": ("assets/real-story-1-lek-yuen.mp3", "assets/real-story-1-lek-yuen.mp4"),
    "RL-002": ("assets/real-story-2-east-rail.mp3", "assets/real-story-2-east-rail.mp4"),
    "RL-003": ("assets/real-story-3-shing-mun-river.mp3", "assets/real-story-3-shing-mun-river.mp4"),
}
QUESTIONS = [
    ("沙田瀝源邨以前嘅徙置區係點", "RL-001"),
    ("以前過羅湖要揸手推車行鐵橋嗎", "RL-002"),
    ("城門河以前係漂染廠臭河嗎", "RL-003"),
    ("What was Lo Wu bridge like", "RL-002"),
]


def check(label, condition, detail=None):
    global CHECKS
    if not condition:
        raise AssertionError(f"{label}: {detail}")
    CHECKS += 1
    print(f"PASS {label}", flush=True)


def data_checks():
    data = json.loads((ROOT / "data" / "stories.json").read_text(encoding="utf-8"))
    stories = {s["id"]: s for s in data["stories"]}
    for sid in REAL_IDS:
        story = stories.get(sid)
        check(f"{sid}: 存在於數據源", story is not None)
        if not story:
            continue
        check(f"{sid}: 標記為真實授權故事",
              story.get("authorized") is True and story.get("rolePlayed") is False
              and story.get("consentRef") and story.get("scope") == "public", story)
        check(f"{sid}: 具備三語文稿", bool(story.get("formalText")) and bool(story.get("englishSummary")))
        audio, video = MEDIA[sid]
        check(f"{sid}: 本地媒體存在",
              (ROOT / "frontend" / audio).is_file() and (ROOT / "frontend" / video).is_file())
        check(f"{sid}: 媒體欄位指向本地檔",
              story.get("audio") == audio and story.get("mediaType") == "video"
              and story.get("mediaUrl") == video, story)
        ends = [float(seg["end"]) for seg in story["segments"]]
        duration = float(story["durationSec"])
        check(f"{sid}: 時間戳在時長內且遞增",
              all(ends[i] < ends[i + 1] for i in range(len(ends) - 1)) and ends[-1] <= duration,
              ends)


def api_checks(client):
    catalog = client.get("/api/stories").json()
    stories = {s["id"]: s for s in catalog["stories"]}
    for sid in REAL_IDS:
        story = stories.get(sid)
        check(f"{sid}: /api/stories 可見", story is not None)
        if story:
            check(f"{sid}: API 附帶音訊與影片路徑",
                  story.get("audioUrl") == "/" + MEDIA[sid][0]
                  and story.get("mediaUrl") == MEDIA[sid][1], story)
    north = client.get("/api/stories", params={"bbox": "114.10,22.48,114.14,22.53"}).json()
    check("北區視口只留下 RL-002",
          [s["id"] for s in north["stories"] if s["id"] in REAL_IDS] == ["RL-002"], north)

    for question, expected in QUESTIONS:
        result = client.post("/api/ask-village", json={"question": question}).json()
        check(f"問答命中 {expected}: {question}",
              result.get("inScope") is True and result.get("storyId") == expected
              and result.get("demo") is False and result.get("sources"), result)
        duration = stories[expected]["durationSec"]
        check(f"問答出處時間戳有效: {question}",
              all(0 <= s["start"] <= duration and 0 <= s["end"] <= duration
                  for s in result["sources"]), result["sources"])

    with patch("server._withdrawn_ids", return_value={"RL-002"}):
        blocked = client.get("/assets/real-story-2-east-rail.mp4",
                             headers={"Range": "bytes=0-31"})
    check("撤回 story 後影片連結被擋下", blocked.status_code == 404, blocked.status_code)


def media_checks(client):
    for audio, video in MEDIA.values():
        for rel in (audio, video):
            full = client.get("/" + rel)
            check(f"{rel}: 完整請求 200", full.status_code == 200, full.status_code)
            ranged = client.get("/" + rel, headers={"Range": "bytes=0-31"})
            check(f"{rel}: Range 請求 206",
                  ranged.status_code == 206 and len(ranged.content) == 32
                  and ranged.headers.get("content-range", "").endswith(
                      f"/{full.headers['content-length']}"),
                  (ranged.status_code, len(ranged.content), ranged.headers.get("content-range")))


if __name__ == "__main__":
    from fastapi.testclient import TestClient
    import server

    data_checks()
    with TestClient(server.app) as client:
        media_checks(client)
        api_checks(client)
    print(f"ALL PASSED: {CHECKS} checks")
