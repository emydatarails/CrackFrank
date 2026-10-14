"""Share your score (src/share.js) on the end screen: the score card is drawn in the game's look, the rank redraws it,
and the buttons work (Download, LinkedIn opens a post with the card downloaded, Copy link). Desktop + iPhone 13.
Usage: python3 test/share_play.py      (Playwright + Chromium; CHROMIUM=path to use another binary)"""
import os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
os.makedirs(OUT, exist_ok=True)
URL = 'file://' + ROOT + '/dist/index.html?dev=1&nopopups=1&solve=frank'
fails, errors = [0], []


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg, flush=True)
    if not cond: fails[0] += 1


with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}))
    for name in ('desktop', 'iPhone 13'):
        if name == 'desktop': ctx = b.new_context(viewport={'width': 1366, 'height': 800}, accept_downloads=True)
        else:
            dev = dict(p.devices[name]); dev.pop('default_browser_type', None); ctx = b.new_context(**dev, accept_downloads=True)
        pg = ctx.new_page()
        pg.on('console', lambda m: m.type == 'error' and errors.append(m.text)); pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto(URL); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
        pg.evaluate('FR.ending()'); pg.wait_for_function("() => { const i = document.querySelector('.fr-share-img'); return i && i.naturalWidth > 0 }", timeout=8000)
        ok(pg.evaluate("document.querySelector('.fr-share-img').naturalWidth") == 1200 and 'Share your score' in (pg.text_content('.fr-share-h') + (pg.text_content('.fr-share-opener') if name != 'desktop' else '')),
           f'{name}: the end screen asks to share, with a 1200x630 score card')
        if name != 'desktop':
            # phones: a gold "Share your score" button next to the main one (which stays on screen); it opens the block
            cta = pg.locator('.fr-end-cta .pri').bounding_box()
            ok(pg.locator('.fr-share-opener').is_visible() and not pg.locator('.fr-share').is_visible() and cta['y'] + cta['height'] <= pg.viewport_size['height'],
               f'{name}: a gold "Share your score" button by the main button, which is still on screen')
            pg.wait_for_timeout(1600)   # (the end screen ignores taps for its first 1.5 s on phones)
            pg.locator('.fr-share-opener').tap(); pg.wait_for_timeout(700)
            ok(pg.locator('.fr-share-pic').is_visible() and pg.locator('.fr-share-b[data-s=linkedin]').is_visible(), f'{name}: a tap opens the card and the share buttons')
        pg.locator('.fr-share').scroll_into_view_if_needed(); pg.wait_for_timeout(700)
        pg.screenshot(path=f'{OUT}/share_{name.replace(" ", "")}.png')
        # the card itself: an XP screen (wallpaper sky, Luna title bar, green Start), the Datarails logo in the tray
        info = pg.evaluate("""() => FR.share.draw({ score: 11650, name: 'Tester', time: '42 min', rank: 1, players: 9, hints: 0, bonus: 1650 }).then(c => {
          const g = c.getContext('2d'), at = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data.slice(0, 3));
          return { w: c.width, h: c.height, sky: at(600, 8), title: at(300, 95), start: at(20, 612),
                   logo: Array.from(g.getImageData(955, 592, 115, 24).data).some((v, i) => i % 4 === 0 && v > 235) }; })""")
        sky, title, start = info['sky'], info['title'], info['start']
        ok(info['w'] == 1200 and info['h'] == 630 and sky[2] > sky[0] + 80 and title[2] > 200 and title[0] < 60 and start[1] > start[0] + 50 and info['logo'],
           f'{name}: the card is a 1200x630 XP screen (sky {sky}, Luna title bar {title}, green Start {start}), Datarails logo in the tray')
        ok(pg.evaluate("FR.share.tier(11650)") == 'PERFECT GAME · KRISTIANS IS NERVOUS' and pg.evaluate("FR.share.tier(10000)") == 'FRANK-LEVEL FP&A', 'a title for the score (perfect game / Frank-level …)')
        t = pg.evaluate("FR.share.text({ score: 10000, time: '1h 2m', rank: 3 })")
        ok(t.startswith('I just saved Packa Corp!') and '10,000 points' in t and '#3 on the leaderboard' in t and 'WhereisFrank.help' in t and 'packacorp' not in t.lower(),
           f'{name}: the post leads with saving Packa and points to WhereisFrank.help: {t[:80]}…')
        ok(pg.evaluate("FR.share.url()") == 'https://whereisfrank.help/', f'{name}: the shared link is whereisfrank.help')
        with pg.expect_download() as d:
            pg.locator('.fr-share-b[data-s=download]').click()
        ok(d.value.suggested_filename == 'franks-computer-score.png', f'{name}: Download image saves franks-computer-score.png')
        with ctx.expect_page() as np, pg.expect_download() as d2:
            pg.locator('.fr-share-b[data-s=linkedin]').click()
        np.value.close(); pg.wait_for_timeout(1300)
        ok(d2.value.suggested_filename == 'franks-computer-score.png' and 'LinkedIn opened' in pg.text_content('.fr-share-note'),
           f'{name}: LinkedIn opens a post and downloads the card to attach ({pg.text_content(".fr-share-note")[:60]})')
        ctx.close()
    b.close()
print('\n'.join(errors) or 'no console errors')
print('ALL PASS' if not fails[0] and not errors else f'{fails[0]} FAILED')
sys.exit(1 if fails[0] or errors else 0)
