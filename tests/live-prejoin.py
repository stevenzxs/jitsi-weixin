"""Opt-in read-only Jitsi UI check; never clicks Jitsi's join button.

Usage: python tests/live-prejoin.py <public-ca.crt> <evidence-directory>
Requires Python Playwright/Chromium and the H5 dev server on 127.0.0.1:4173.
Remote GETs use strict CA/IP verification; signaling and other origins blocked.
This scoped relay is NOT evidence of browser/system or WeChat certificate trust.
"""
import json
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ORIGIN = 'https://118.193.36.35:8443'
LOCAL = 'http://127.0.0.1:4173'
output = Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
tls = ssl.create_default_context(cafile=sys.argv[1])
blocked, failed = [], []
opener = urllib.request.build_opener(
    urllib.request.HTTPSHandler(context=tls))


def inspect_route(route):
    request = route.request
    url = urlsplit(request.url)
    if request.url.startswith(LOCAL + '/'):
        route.continue_()
        return
    if (url.scheme + '://' + url.netloc != ORIGIN
            or request.method != 'GET'
            or any(part in url.path for part in ['/http-bind', '/xmpp-websocket', '/colibri-ws'])):
        blocked.append(request.url)
        route.abort()
        return
    try:
        with opener.open(request.url, timeout=25) as response:
            route.fulfill(status=response.status, body=response.read(),
                          content_type=response.headers.get('Content-Type', 'application/octet-stream'))
    except urllib.error.HTTPError as error:
        failed.append({'url': request.url, 'status': error.code})
        route.fulfill(status=error.code, body=error.read())
    except Exception as error:
        failed.append({'url': request.url, 'error': str(error)})
        route.abort()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        for label, options in [('chromium-mobile-viewport', {}),
                               ('android-wechat-ua-simulation', {
                                   'user_agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 '
                                                 '(KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36 '
                                                 'MicroMessenger/8.0.50'})]:
            blocked.clear()
            failed.clear()
            context = browser.new_context(viewport={'width': 390, 'height': 844}, **options)
            context.route('**/*', inspect_route)
            context.route_web_socket('**/*', lambda ws: ws.close())
            page = context.new_page()
            page.goto(LOCAL + '/?room=855851964', wait_until='networkidle')
            page.locator('#name').fill('网页准备页验证')
            page.locator('#join').click()  # H5 action only, not the Jitsi join.
            frame = page.frame_locator('#frame iframe')
            join = frame.get_by_role('button', name='加入会议', exact=True)
            join.wait_for(state='visible', timeout=90000)
            result = frame.locator('body').evaluate('''() => ({
                prejoin: window.config.prejoinConfig.enabled,
                disabledDeepLink: window.config.deeplinking.disabled,
                audioMuted: window.config.startWithAudioMuted,
                videoMuted: window.config.startWithVideoMuted,
                websocket: window.config.websocket,
                bosh: window.config.bosh,
                text: document.body.innerText
            })''')
            assert result['prejoin'] and result['disabledDeepLink']
            assert result['audioMuted'] and result['videoMuted']
            assert result['websocket'] == 'wss://118.193.36.35:8443/xmpp-websocket'
            assert '会议中' not in page.locator('#meeting-state').inner_text()
            page.screenshot(path=str(output / (label + '.png')))
            page.locator('#leave').click()
            assert page.locator('#frame iframe').count() == 0
            assert page.locator('#lobby').is_visible()
            result.update({'browser': label, 'blocked': list(blocked), 'failedResources': list(failed),
                           'realMeetingJoined': False, 'systemTrustTested': False,
                           'realWeChatTested': False, 'iframeDisposed': True})
            (output / (label + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            print(json.dumps(result, ensure_ascii=False))
            context.close()
    finally:
        browser.close()
