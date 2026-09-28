"""Player accounts through the real UI: sign up, cloud save, continue on another computer, guest → player,
sign out, start over, and the two-computers conflict. Runs dist/ + api/ on test/local_server.js (in-memory Redis).
Usage: python3 test/account_play.py   (needs node and Playwright's Chromium, like test/play.py)"""
import os, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('PORT', '8123'))
URL = f'http://localhost:{PORT}/'
fails, errors = [0], []


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg, flush=True)
    if not cond: fails[0] += 1


def computer(b):
    """a fresh browser profile = another computer"""
    ctx = b.new_context(viewport={'width': 1366, 'height': 800})
    pg = ctx.new_page()
    # expected: signed-out /api/me (401), the stale-computer save (409), the simulated dropped connection (ERR_FAILED)
    pg.on('console', lambda m: m.type == 'error' and not any(c in m.text for c in ('401', '409', 'ERR_FAILED')) and errors.append(m.text))
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.route('https://www.packacorp.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<h1>Packa</h1>'))
    pg.goto(URL); pg.wait_for_timeout(600)
    return pg


def sign(pg, mode, user, pw):
    if mode == 'back': pg.click('.fr-acct-tabs [data-m=back]')
    pg.fill('.fr-acct-form input[name=u]', user)
    pg.fill('.fr-acct-form input[name=p]', pw)
    pg.click('.fr-acct-form [type=submit]'); pg.wait_for_timeout(700)


def crack_password(pg):
    """intro → boot → Windows log-on → desktop"""
    pg.click('.fr-intro [data-a=go]'); pg.wait_for_selector('.fr-login input', timeout=8000)
    pg.fill('.fr-login input', 'sedalia1958'); pg.click('.fr-go')
    pg.wait_for_selector('.fr-desktop', timeout=8000); pg.wait_for_timeout(2500)   # cloud save goes up ~1.5 s after a change


def dialog_click(pg, text):
    pg.locator('.fr-dialog .fr-dlg-btns button', has_text=text).click(); pg.wait_for_timeout(300)


solved = lambda pg: pg.evaluate('() => Object.keys(FR.state.solved)')
save_line = lambda pg: pg.inner_text('.fr-save-line')

server = subprocess.Popen(['node', 'test/local_server.js', str(PORT)], cwd=ROOT, stdout=subprocess.PIPE)
server.stdout.readline()
try:
    with sync_playwright() as p:
        kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
        b = p.chromium.launch(**kw)

        # 1. new player on computer A
        a = computer(b)
        ok(a.locator('.fr-acct').count() == 1, 'first visit shows the player sign-in screen')
        sign(a, 'new', 'ab', 'x'); ok('3–20' in a.inner_text('.fr-acct-err'), 'bad player name explained before any request')
        sign(a, 'new', 'Frankie', 'board-pack-9')
        ok('Signed in as Frankie' in save_line(a), 'intro says who is signed in')
        crack_password(a)
        ok(solved(a) == ['login'], 'password cracked on computer A')

        # 2. same player, computer B
        bb = computer(b)
        sign(bb, 'back', 'frankie', 'wrong-password')
        ok("don't match" in bb.inner_text('.fr-acct-err'), 'wrong password is refused')
        sign(bb, 'back', 'frankie', 'board-pack-9')
        ok(solved(bb) == ['login'], 'progress from computer A is there on computer B')
        ok("Continue at Frank" in bb.inner_text('.fr-intro [data-a=go]'), 'intro offers Continue')
        bb.click('.fr-intro [data-a=go]'); bb.wait_for_selector('.fr-desktop', timeout=8000)
        ok(True, 'returning player goes straight to the desktop')

        # 3. two computers at once: B moves on, A is stale and must not overwrite it
        bb.evaluate("() => { FR.state.flags.fromB = 1; FR.save(); }"); bb.wait_for_timeout(2500)
        a.evaluate("() => { FR.state.flags.fromA = 1; FR.save(); }"); a.wait_for_timeout(2500)
        ok('continued somewhere else' in a.inner_text('.fr-dialog'), 'stale computer is told to reload instead of overwriting')
        dialog_click(a, 'Reload'); a.wait_for_timeout(900)
        ok(a.evaluate('() => FR.state.flags.fromB') == 1, 'after reload, computer A has computer B\'s progress')

        # 4. reload keeps you signed in (cookie) and skips the sign-in screen
        bb.goto(URL); bb.wait_for_timeout(700)
        ok(bb.locator('.fr-acct').count() == 0 and 'Signed in as Frankie' in save_line(bb), 'reload: still signed in, no sign-in screen')

        # 4b. connection drops mid-game: progress stays in the browser and goes up once the server is reachable again
        bb.route('**/api/save', lambda r: r.abort())
        bb.evaluate("() => { FR.state.flags.offline = 1; FR.save(); }"); bb.wait_for_timeout(2000)
        bb.goto(URL); bb.wait_for_timeout(800)
        ok(bb.evaluate('() => FR.state.flags.offline') == 1, 'offline change survives a reload (not replaced by the older server copy)')
        bb.unroute('**/api/save'); bb.goto(URL); bb.wait_for_timeout(1500)
        m = computer(b); sign(m, 'back', 'Frankie', 'board-pack-9')
        ok(m.evaluate('() => FR.state.flags.offline') == 1, 'offline change reached the server once back online')
        m.context.close()

        # 5. sign out
        bb.click('.fr-save-line [data-a=out]'); dialog_click(bb, 'Sign out'); bb.wait_for_timeout(1200)
        ok(bb.locator('.fr-acct').count() == 1, 'after sign out the sign-in screen is back')
        ok(bb.evaluate('() => Object.keys(FR.state.solved).length') == 0, "sign out leaves no progress behind in this browser")

        # 6. guest plays, then turns into a player without losing anything
        g = computer(b)
        g.click('.fr-acct-guest'); g.wait_for_timeout(300)
        ok('Sign in or create a player' in save_line(g), 'guest intro offers an account')
        crack_password(g)
        g.goto(URL); g.wait_for_timeout(700)
        ok(g.locator('.fr-acct').count() == 0 and solved(g) == ['login'], 'guest choice remembered, guest progress kept')
        g.click('.fr-save-line [data-a=acct]'); sign(g, 'new', 'guest_2', 'guest-pass')
        ok('Signed in as guest_2' in save_line(g) and solved(g) == ['login'], 'guest progress carried into the new player')
        h = computer(b); sign(h, 'back', 'guest_2', 'guest-pass')
        ok(solved(h) == ['login'], "the new player's progress is on the server")

        # 7. start over wipes the account's save too
        h.click('.fr-intro [data-a=new]'); dialog_click(h, 'Start over'); h.wait_for_timeout(1200)
        ok(solved(h) == [] and 'Signed in as guest_2' in save_line(h), 'start over: fresh game, still signed in')
        k = computer(b); sign(k, 'back', 'guest_2', 'guest-pass')
        ok(solved(k) == [], 'start over reached the server')

        b.close()
finally:
    server.terminate()

ok(not errors, 'no console errors' + ('' if not errors else ': ' + ' | '.join(errors[:5])))
print(f'{fails[0]} FAILED' if fails[0] else 'ALL PASS')
sys.exit(1 if fails[0] else 0)
