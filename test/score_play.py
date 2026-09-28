"""Score and scoreboard through the real UI: checklist score, free-hint countdown, the cost prompt after 10 hints,
the Start-menu scoreboard, and the ending screen's score and rank. Runs on test/local_server.js (in-memory Redis).
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

        # scoreboard from the Start menu
        pg.click('.fr-startbtn'); pg.wait_for_timeout(300)
        pg.locator('.fr-sm-item', has_text='Scoreboard').click(); pg.wait_for_selector('.sb-table', timeout=6000)
        rows = pg.eval_on_selector_all('.sb-table tbody tr', 'rs => rs.map(r => r.innerText.replace(/\\s+/g, " ").trim())')
        ok(len(rows) == 2 and rows[0].startswith('1 Rival 950') and rows[1].startswith('2 Scorer (you) 900'), 'board: ' + ' | '.join(rows))
        ok(pg.locator('.sb-table tr.sb-me').count() == 1, 'your row is highlighted')
        pg.screenshot(path=f'{OUT}/score_board.png')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
        ok(pg.locator('.sb-shade').count() == 0, 'Esc closes the scoreboard')

        # finish (skip to the end) and check the ending screen
        pg.evaluate("() => { FR.puzzle.ORDER.forEach(id => FR.state.solved[id] = FR.state.solved[id] || Date.now()); FR.state.finishedAt = Date.now(); FR.state.finishPlayMs = FR.clock.playMs(); FR.save(); FR.ending(); }")
        pg.wait_for_timeout(2500)
        ok(pg.inner_text('.fr-end-score b') == '9,900', 'ending shows the score (10,000 − 100)')
        ok('#1 of 2' in pg.inner_text('.fr-end-rank'), 'ending shows the rank: ' + pg.inner_text('.fr-end-rank'))
        pg.screenshot(path=f'{OUT}/score_ending.png')
        pg.click('.fr-end-cta [data-a=board]'); pg.wait_for_selector('.sb-table', timeout=6000)
        ok(pg.locator('.sb-table tr.sb-me td.sb-rank').inner_text() == '1', 'scoreboard opens over the ending, you are #1')
        b.close()
finally:
    server.terminate()

ok(not errors, 'no console errors' + ('' if not errors else ': ' + ' | '.join(errors[:5])))
print(f'{fails[0]} FAILED' if fails[0] else 'ALL PASS')
sys.exit(1 if fails[0] else 0)
