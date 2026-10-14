#!/usr/bin/env python3
"""Draw the game's link preview (public/og-image.png, 1200x630: what LinkedIn, X, Slack, WhatsApp… show for a link to
the game) with the game's own code, so it matches the end-of-game score card: the same Windows XP scene
(src/share.js FR.share.drawPreview).

  python3 build.py && python3 tools/make_og_image.py      (Playwright + Chromium; CHROMIUM=path to use another binary)

Run it after changing the preview or the score card's look. The fonts are the machine's own (Tahoma, Trebuchet MS on
Windows/Mac; their stand-ins elsewhere), so run it where those fonts are installed for the most XP-like result.
"""
import base64, os
from playwright.sync_api import sync_playwright

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(root, 'public', 'og-image.png')

with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}))
    pg = b.new_page()
    pg.goto('file://' + os.path.join(root, 'dist', 'index.html') + '?dev=1&nopopups=1')
    pg.wait_for_selector('.fr-desktop')
    data = pg.evaluate("FR.share.drawPreview().then(c => c.toDataURL('image/png'))")
    open(OUT, 'wb').write(base64.b64decode(data.split(',', 1)[1]))
    b.close()
print('wrote', OUT, os.path.getsize(OUT) // 1024, 'KB')
