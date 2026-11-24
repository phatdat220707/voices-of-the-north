"""Verify transcript-only stories, video seeking, and playback after video failure.

Run after building the frontend: python tools/verify/story_media.py
"""

from __future__ import annotations

import asyncio
import socket
import threading
import time
from contextlib import closing, contextmanager

import uvicorn
from playwright.sync_api import expect, sync_playwright
from starlette.applications import Starlette
from starlette.routing import Mount
from starlette.staticfiles import StaticFiles

from _harness import FRONTEND, launch_browser, warn_if_stale


DEMO_VIDEO = {"mediaType": "video", "mediaUrl": "assets/interview-story.mp4"}


@contextmanager
def range_server():
    # The shared static harness omits Range, which browsers need for video seeking.
    app = Starlette(routes=[Mount("/", app=StaticFiles(directory=FRONTEND))])
    server = uvicorn.Server(uvicorn.Config(app, log_level="warning"))
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))

        def serve():
            # Keep the server's event loop separate from Playwright's on Windows.
            with closing(asyncio.SelectorEventLoop()) as loop:
                loop.run_until_complete(server.serve(sockets=[listener]))

        thread = threading.Thread(target=serve, daemon=True)
        thread.start()
        try:
            deadline = time.monotonic() + 5
            while thread.is_alive() and not server.started and time.monotonic() < deadline:
                time.sleep(0.025)
            if not server.started:
                raise RuntimeError("Local media verification server did not start")
            yield f"http://127.0.0.1:{listener.getsockname()[1]}"
        finally:
            server.should_exit = True
            thread.join(timeout=5)


@contextmanager
def story_page(browser, origin, story_id, *, block_video=False, changes=None):
    page = browser.new_page(viewport={"width": 390, "height": 844})
    try:
        page.set_default_timeout(8000)

        def route_request(route):
            url = route.request.url
            if not url.startswith(origin + "/") or (block_video and url.endswith(".mp4")):
                route.abort()
            else:
                route.continue_()

        page.route("**/*", route_request)
        page.add_init_script("localStorage.setItem('vtn.v2.onboarded', '1')")
        page.goto(origin + "/voices-of-the-north-app.html#stories", wait_until="domcontentloaded")
        page.wait_for_function("window.VTN_READY === true")
        if changes:
            page.evaluate(
                "({id, changes}) => Object.assign(VTN.stories.get(id), changes)",
                {"id": story_id, "changes": changes},
            )
        page.locator("#atlasViewBtn").click()
        page.locator(f"#story-{story_id} .story-item__main").click()
        expect(page.locator("#storyDetail h2")).to_be_visible()
        yield page
    finally:
        page.close()


def seek_second_segment(container):
    segment = container.locator("button.segment").nth(1)
    start = float(segment.get_attribute("data-start"))
    assert start > 0, "Expected a segment with a nonzero timestamp"
    segment.click()
    return start


def assert_audio_seek(page, container, story_id):
    expect(container.locator(".player__btn")).to_be_visible()
    start = seek_second_segment(container)
    page.wait_for_function(
        "({id, start}) => VTN.audio.playingStoryId() === id && "
        "Math.abs(VTN.audio.currentTime() - start) < 3",
        arg={"id": story_id, "start": start},
    )


def main():
    warn_if_stale()
    with range_server() as origin, sync_playwright() as playwright:
        with launch_browser(playwright) as browser:
            with story_page(browser, origin, "KT-002") as page:
                detail = page.locator("#storyDetail")
                expect(detail.locator(".story-media-launch__btn, .player__btn, button.segment")).to_have_count(0)
                expect(detail.get_by_role("heading", name="逐字稿", exact=True)).to_be_visible()
                detail.locator(".story-sheet__toggle").click()
                expect(detail.locator(".segment:visible")).to_have_count(3)
                page.evaluate("VTN.stories.select('KT-002', {playAt: 16})")
                expect(detail.locator('.segment.is-playing[data-start="16"]')).to_be_visible()
                expect(page.locator("#mediaOverlay")).to_be_hidden()
            print("PASS KT-002 transcript and source link")

            with story_page(browser, origin, "YL-001", changes={"mediaType": None}) as page:
                assert_audio_seek(page, page.locator("#storyDetail"), "YL-001")
            print("PASS audio-only transcript seeks the YL-001 recording")

            with story_page(browser, origin, "YL-001", changes=DEMO_VIDEO) as page:
                page.locator("#storyDetail .story-media-launch__btn").click()
                video = page.locator("#storyVideo[controls]")
                expect(video).to_be_visible()
                start = seek_second_segment(page.locator("#mediaOverlay"))
                page.wait_for_function(
                    "start => { const video = document.getElementById('storyVideo'); "
                    "return video && video.videoWidth > 0 && !video.paused && !video.seeking && "
                    "Math.abs(video.currentTime - start) < 3; }",
                    arg=start,
                )
            print(f"PASS demo video and transcript seek to {start:g}s")

            with story_page(browser, origin, "YL-001", block_video=True, changes=DEMO_VIDEO) as page:
                page.locator("#storyDetail .story-media-launch__btn").click()
                overlay = page.locator("#mediaOverlay")
                expect(overlay.locator(".universal-media__fallbackText")).to_have_text("多媒體載入失敗，已切換為音頻")
                assert_audio_seek(page, overlay, "YL-001")
            print("PASS failed video falls back to the attached recording")

            with story_page(browser, origin, "YL-001", block_video=True, changes={**DEMO_VIDEO, "audio": None}) as page:
                page.locator("#storyDetail .story-media-launch__btn").click()
                overlay = page.locator("#mediaOverlay")
                expect(overlay.locator(".universal-media__fallbackText")).to_have_text("多媒體載入失敗，請閱讀逐字稿")
                expect(overlay.locator(".player__btn, button.segment")).to_have_count(0)
                expect(overlay.get_by_role("heading", name="逐字稿", exact=True)).to_be_visible()
                expect(overlay.locator(".segment").first).to_be_visible()
            print("PASS failed video without audio leaves a readable transcript")


if __name__ == "__main__":
    main()
