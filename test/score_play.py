"""Score and the "Board Pack Rescue - Who Covered for Frank?" leaderboard through the real UI: checklist score, free-hint
countdown, the cost prompt after 10 hints, the desktop shortcut to the leaderboard on Packa's intranet, and the ending
screen's score and rank. Runs on test/local_server.js (in-memory Redis).
Usage: python3 test/score_play.py   (needs node and Playwright's Chromium, like test/play.py)"""
import os, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('PORT', '8126'))
URL = f'http://localhost:{PORT}/'
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
fails, errors = [0], []


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg, flush=True)
    if not cond: fails[0] += 1


def player(b, name, pw):
    pg = b.new_context(viewport={'width': 1366, 'height': 800}).new_page()
    pg.on('console', lambda m: m.type == 'error' and '401' not in m.text and errors.append(m.text))
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.route('https://www.packacorp.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<h1>Packa</h1>'))
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.fill('.fr-acct-form input[name=u]', name); pg.fill('.fr-acct-form input[name=p]', pw)
    pg.click('.fr-acct-form [type=submit]'); pg.wait_for_timeout(600)
    pg.click('.fr-intro [data-a=go]'); pg.wait_for_selector('.fr-login input', timeout=8000)
    pg.fill('.fr-login input', 'sedalia1958'); pg.click('.fr-go')
    pg.wait_for_selector('.fr-desktop', timeout=8000); pg.wait_for_timeout(2600)
    return pg


def checklist(pg):
    pg.evaluate('() => FR.apps.checklist()'); pg.wait_for_timeout(400)
    return pg.inner_text('.ck-wrap .ck-foot')


server = subprocess.Popen(['node', 'test/local_server.js', str(PORT)], cwd=ROOT, stdout=subprocess.PIPE)
server.stdout.readline()
os.makedirs(OUT, exist_ok=True)
try:
    with sync_playwright() as p:
        kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
        b = p.chromium.launch(**kw)

        # a rival with one wrong guess, to rank against
        rival = player(b, 'Rival', 'rival-pw')
        rival.evaluate('() => { FR.puzzle.miss(); }'); rival.wait_for_timeout(2500)

        pg = player(b, 'Scorer', 'scorer-pw')
        foot = checklist(pg)
        ok('Score: 1,000' in foot and 'Free hints left: 10' in foot, 'checklist footer: score and free hints (' + foot.split('How to')[0].strip() + ')')

        pg.click('.ck-item.open .ck-hbtn'); pg.wait_for_timeout(300)
        ok('Free hints left: 9' in pg.inner_text('.ck-wrap .ck-foot'), 'a free hint counts down, score unchanged')

        # use up the free hints, then the next one asks first and costs points
        pg.evaluate("() => { FR.state.hintsUsed.login = 3; FR.state.hintsUsed.unlock = 3; FR.state.hintsUsed.ebitda = 3; FR.save(); FR.bus.emit('flag', {}); }")
        pg.wait_for_timeout(300)
        foot = pg.inner_text('.ck-wrap .ck-foot')
        ok('Hints: −100 each' in foot, 'no free hints left: footer says hints now cost')
        ok('−100 pts' in pg.inner_text('.ck-item.open .ck-hbtn'), 'hint button shows the cost')
        pg.click('.ck-item.open .ck-hbtn'); pg.wait_for_timeout(300)
        ok('costs 100 points' in pg.inner_text('.fr-dialog .fr-dlg-msg'), 'paid hint asks before charging')
        pg.locator('.fr-dialog .fr-dlg-btns button', has_text='Cancel').click(); pg.wait_for_timeout(200)
        ok('Score: 1,000' in pg.inner_text('.ck-wrap .ck-foot'), 'Cancel: nothing charged')
        pg.click('.ck-item.open .ck-hbtn'); pg.wait_for_timeout(300)
        pg.locator('.fr-dialog .fr-dlg-btns button', has_text='Use a hint').click(); pg.wait_for_timeout(300)
        ok('Score: 900' in pg.inner_text('.ck-wrap .ck-foot'), 'paid hint: 1,000 − 100 = 900')

        # the leaderboard: a desktop shortcut to Packa's intranet in Internet Explorer
        icon = pg.locator('.fr-dicon.fr-dicon-lnk', has_text='Who Covered for Frank?')
        ok(icon.count() == 1, 'desktop has the "Who Covered for Frank?" shortcut')
        icon.dblclick(); pg.wait_for_selector('.ie-page .st-t', timeout=6000)
        ie_title = pg.evaluate("() => FR.wm.wins.get('ie').el.querySelector('.fr-title').textContent")
        ok(ie_title == 'Board Pack Rescue - Who Covered for Frank? - Internet Explorer', 'opens Internet Explorer: ' + ie_title)
        ok(pg.input_value('.ie-addr input') == 'http://intranet.packacorp.local/who-covered-for-frank', 'address bar: ' + pg.input_value('.ie-addr input'))
        ok(pg.inner_text('.ie-page h1') == 'Board Pack Rescue - Who Covered for Frank?', 'page title: ' + pg.inner_text('.ie-page h1'))
        page_text = pg.inner_text('.ie-page')
        ok('PACKA CORPORATION' in page_text and 'Championship' not in page_text and 'Vegas' not in page_text.split('Ranked by')[0], 'Packa intranet frame, no championship theme')
        rows = pg.eval_on_selector_all('.st-t tbody tr', 'rs => rs.map(r => r.innerText.replace(/\\s+/g, " ").trim())')
        ok(len(rows) == 2 and rows[0].startswith('1 Rival 950') and rows[1].startswith('2 Scorer (you) 900'), 'standings: ' + ' | '.join(rows))
        ok(pg.locator('.st-t tr.st-me').count() == 1 and pg.locator('.st-t .st-m1').count() == 1, 'your row highlighted, #1 gets the gold medal')
        pg.screenshot(path=f'{OUT}/standings.png')

        # typing the intranet address works too, and the championship schedule no longer links here
        pg.fill('.ie-addr input', 'http://championship.example/schedule'); pg.press('.ie-addr input', 'Enter'); pg.wait_for_timeout(300)
        ok('Who Covered' not in pg.inner_text('.ie-page') and 'Standings' not in pg.inner_text('.ie-page'), 'championship schedule has no leaderboard link')
        pg.fill('.ie-addr input', 'intranet.packacorp.local'); pg.press('.ie-addr input', 'Enter'); pg.wait_for_selector('.ie-page .st-t', timeout=6000)
        ok(True, 'typing intranet.packacorp.local opens the leaderboard')

        # Start menu entry opens the same page
        pg.evaluate("() => { document.querySelectorAll('.fr-win').forEach(w => { const c = w.querySelector('[aria-label=Close]'); if (c && /Internet Explorer/.test(w.innerText)) c.click(); }); }")
        pg.wait_for_timeout(300)
        pg.click('.fr-startbtn'); pg.wait_for_timeout(300)
        pg.locator('.fr-sm-item', has_text='Who Covered for Frank?').click(); pg.wait_for_selector('.ie-page .st-t', timeout=6000)
        ok(True, 'Start menu → Who Covered for Frank?')

        # finish (skip to the end) and check the ending screen
        pg.evaluate("() => { FR.puzzle.ORDER.forEach(id => FR.state.solved[id] = FR.state.solved[id] || Date.now()); FR.state.finishedAt = Date.now(); FR.state.finishPlayMs = FR.clock.playMs(); FR.save(); FR.ending(); }")
        pg.wait_for_timeout(2500)
        ok(pg.inner_text('.fr-end-score b') == '9,900', 'ending shows the score (10,000 − 100)')
        ok("#1 of 2 people who have covered for Frank" in pg.inner_text('.fr-end-rank'), 'ending shows the rank: ' + pg.inner_text('.fr-end-rank'))
        pg.screenshot(path=f'{OUT}/score_ending.png')
        pg.click('.fr-end-cta [data-a=board]'); pg.wait_for_timeout(400)
        ok(pg.locator('.fr-end').count() == 0, 'ending → "Who covered for Frank?" closes the ending screen')
        pg.wait_for_selector('.ie-page .st-me', timeout=6000)
        ok(pg.locator('.st-t tr.st-me td.st-rank').inner_text() == '1' and 'Board Pack sent' in pg.inner_text('.st-t tr.st-me'), 'you are #1, marked Board Pack sent')
        b.close()
finally:
    server.terminate()

ok(not errors, 'no console errors' + ('' if not errors else ': ' + ' | '.join(errors[:5])))
print(f'{fails[0]} FAILED' if fails[0] else 'ALL PASS')
sys.exit(1 if fails[0] else 0)
