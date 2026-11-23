"""Optional isolated integration: python tests/r13-api-browser.py <reviewed external_api.js>.

Requires an installed Python Playwright/Chromium and localhost:4173. Never joins
the real room: all requests outside localhost are intercepted and fulfilled.
"""
import hashlib
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

api_bytes = Path(sys.argv[1]).read_bytes()
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    blocked = []

    def isolate(route):
        url = route.request.url
        if url.startswith("http://127.0.0.1:4173/"):
            route.continue_()
        elif url == "https://118.193.36.35:8443/external_api.js":
            route.fulfill(status=200, content_type="application/javascript", body=api_bytes)
        else:
            blocked.append(url)
            route.fulfill(status=200, content_type="text/html", body="<!doctype html><title>Isolated fixture</title>")

    page.route("**/*", isolate)
    page.goto("http://127.0.0.1:4173/?room=855851964")
    page.locator("#name").fill("隔离集成验证")
    page.locator("#join").click()
    iframe = page.locator("#frame iframe")
    iframe.wait_for()
    result = iframe.evaluate("el => ({src:el.src,allow:el.getAttribute('allow')})")
    assert result["src"].startswith("https://118.193.36.35:8443/855851964"), result
    assert "camera" in result["allow"] and "microphone" in result["allow"]
    assert "deeplinking" in result["src"]
    page.locator("#leave").click()
    assert page.locator("#frame iframe").count() == 0
    assert page.locator("#lobby").is_visible()
    print(json.dumps({"apiSha256": hashlib.sha256(api_bytes).hexdigest(),
                      "iframe": result, "blockedRequests": blocked,
                      "disposed": True, "realMeetingJoined": False}, ensure_ascii=False))
    browser.close()
