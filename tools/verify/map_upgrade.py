"""Verify map upgrade wiring with deterministic SDK and Mapbox API responses."""

from __future__ import annotations

from playwright.sync_api import sync_playwright

from _harness import frontend_server, launch_browser, warn_if_stale
from era_camera import FIXTURE, check, seed, snapshot


def exercise(browser, base):
    page = browser.new_page(viewport={"width": 320, "height": 740}, reduced_motion="reduce")
    page.add_init_script("""
        window.__cameraEngine = 'mapbox';
        localStorage.setItem('vtn.v2.onboarded','1');
    """)
    errors = []
    queries = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    origin = base.split("/voices-")[0]

    def route_request(route):
        url = route.request.url
        if url.endswith("/api/map/config"):
            route.fulfill(json={
                "mapbox": {"token": "test-token"},
                "geocoding": True,
                "history": {
                    str(year): {
                        "tileset": f"demo.aerial-{year}",
                        "local": True,
                        "bounds": [114.10, 22.45, 114.26, 22.55],
                        "minzoom": 10,
                        "maxzoom": 17,
                    } for year in (1963, 1976, 1982)
                },
            })
        elif url.endswith("/api/map/geocode"):
            queries.append(route.request.post_data_json)
            route.fulfill(json={"places": [{"label": "Fanling, Hong Kong", "center": [114.144, 22.497]}]})
        elif url.startswith(origin):
            route.continue_()
        elif url.endswith("/mapbox-gl.js"):
            route.fulfill(content_type="application/javascript", body=FIXTURE)
        else:
            route.abort()

    page.route("**/*", route_request)
    page.goto(base + "#stories", wait_until="domcontentloaded")
    page.wait_for_function("window.VTN_READY && VTN.map.status() === 'mapbox'")
    check("uses Mapbox Standard", page.evaluate("__cameraFixture.map.options.style") ==
          "mapbox://styles/mapbox/standard")
    page.evaluate("VTN.i18n.setLang('en')")
    seed(page, 15, tilted=True)
    before = snapshot(page)

    def source_ids():
        return page.evaluate("Object.keys(__cameraFixture.map.sources).filter(id => id.startsWith('vtn-history-'))")

    def tile_loaded(source):
        page.evaluate("""sourceId => __cameraFixture.map.emit('sourcedata', {
            sourceId, tile:{state:'loaded'}
        })""", source)

    for index, year in enumerate((None, 1963, 1976, 1982, None)):
        page.locator(f"#atlasTicks [data-era-index='{index}']").click()
        source = f"vtn-history-{year}-mts"
        check(f"decade {index} uses the expected source", source_ids() == ([source] if year else []))
        check(f"decade {index} leaves the camera untouched", before == snapshot(page))
        if year:
            tile_loaded(source)
            check(f"decade {index} names the loaded year", str(year) in page.locator("#mapHistoryNote").inner_text())

    page.locator("#atlasTicks [data-era-index='1']").click()
    page.evaluate("""__cameraFixture.map.emit('error', {
        sourceId:'vtn-history-1963-mts', error:{status:503}
    })""")
    check("MTS failure uses local tiles", source_ids() == ["vtn-history-1963-local"])
    tile_loaded("vtn-history-1963-mts")
    check("stale MTS event cannot mark the local layer ready",
          "Loading" in page.locator("#mapHistoryNote").inner_text())
    tile_loaded("vtn-history-1963-local")
    check("local layer identifies source", "Lands Department" in page.locator("#mapHistoryNote").inner_text())
    check("historical fallback keeps the camera", before == snapshot(page))

    page.locator("#atlasLocate").click()
    form = page.locator(".atlas-place-form")
    form.locator("input").fill("Fanling")
    form.get_by_role("button", name="Search").click()
    form.get_by_role("button", name="Fanling, Hong Kong").click()
    check("one temporary geocode request per submission", queries == [{"query": "Fanling", "language": "en"}])
    check("the geocoded place moves the map", snapshot(page)["camera"]["center"] == [114.144, 22.497])
    check("place search preserves the story decade", page.evaluate("VTN.stories.currentParams().decade") == 1960)

    prior_camera = snapshot(page)["camera"]
    page.evaluate("__cameraFixture.map.emit('error', {error:{status:429}})")
    page.wait_for_function("VTN.map.status() === 'maplibre'")
    check("Mapbox quota failure draws OpenFreeMap", page.evaluate("__cameraFixture.map.options.style") ==
          "https://tiles.openfreemap.org/styles/liberty")
    check("fallback is visibly labelled", "Using the free basemap" in page.locator("#mapTilesNote").inner_text())
    check("fallback retains local imagery and camera",
          source_ids() == ["vtn-history-1963-local"] and snapshot(page)["camera"] == prior_camera)
    for name, center in (("Fanling", [114.1435, 22.4965]), ("Sheung Shui", [114.1285, 22.5025]),
                         ("Kuk Po", [114.24, 22.53])):
        page.locator("#atlasLocate").click()
        form.get_by_role("button", name=name, exact=True).click()
        page.wait_for_function("!document.querySelector('.atlas-place-form')")
        check("offline locate " + name, snapshot(page)["camera"]["center"] == center)
    check("free fallback sends no extra geocoding requests", len(queries) == 1)
    check("no browser runtime errors", not errors, errors)
    page.close()


if __name__ == "__main__":
    warn_if_stale()
    with frontend_server() as base, sync_playwright() as playwright:
        browser = launch_browser(playwright)
        try:
            exercise(browser, base)
        finally:
            browser.close()
