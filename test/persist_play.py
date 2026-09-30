"""Spreadsheet edits are saved with the game (FR.state.xl): after a reload, on another computer (player account),
with undo, for items that tick themselves in Excel (no second award, a fix made too early counts later), bad saved
data, the size limit, and "Start over". Runs dist/ + api/ on test/local_server.js (in-memory Redis), desktop size.
Usage: python3 test/persist_play.py   (needs node and Playwright's Chromium, like test/play.py)"""
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('PORT', '8125'))
URL = f'http://localhost:{PORT}/'
fails, errors = [0], []
CASH, BRIDGE = '13-wk Cash REAL', 'Bridge'


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg, flush=True)
    if not cond: fails[0] += 1


def computer(b):
    ctx = b.new_context(viewport={'width': 1366, 'height': 800})
    pg = ctx.new_page()
    pg.on('console', lambda m: m.type == 'error' and '401' not in m.text and errors.append(m.text))
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
    pg.click('.fr-intro [data-a=go]'); pg.wait_for_selector('.fr-login input', timeout=8000)
    pg.fill('.fr-login input', 'sedalia1958'); pg.click('.fr-go')
    pg.wait_for_selector('.fr-desktop', timeout=8000); pg.wait_for_timeout(1500)


def cont(pg):
    """returning player: intro → Continue at Frank's desk"""
    pg.click('.fr-intro [data-a=go]'); pg.wait_for_selector('.fr-desktop', timeout=8000); pg.wait_for_timeout(1200)


def solve_upto(pg, last):
    pg.evaluate("""last => { for (const id of FR.puzzle.ORDER) { FR.puzzle.solve(id); if (id === last) break; } }""", last)
    pg.wait_for_timeout(400)


def xl_type(pg, cell, text):
    nb = pg.locator('.fr-win:not(.fr-inactive) .xl-nb-in')
    nb.click(); nb.fill(cell); nb.press('Enter'); pg.wait_for_timeout(120)
    pg.keyboard.type(text); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)


def close_dialogs(pg):
    for _ in range(6):
        d = pg.locator('.fr-dialog .fr-dlg-btns button')
        if not d.count(): return
        d.last.click(); pg.wait_for_timeout(250)


def open_file(pg, fid):
    pg.evaluate('id => FR.openFile(id)', fid); pg.wait_for_timeout(500)


def cell_text(pg, fid, a1):
    """what the open workbook's grid shows in a cell (the rendered <td>)"""
    return pg.evaluate("""([fid, a1]) => { const w = FR.wm.wins.get('xl-' + fid); if (!w) return null;
      const p = FR.xl.parseA1(a1), td = w.el.querySelector(`td[data-r="${p.r}"][data-c="${p.c}"]`); if (!td) return null; const t = td.cloneNode(true); t.querySelectorAll('.xl-rp').forEach(x => x.remove()); return t.textContent.trim(); }""", [fid, a1])


def close_win(pg, wid):
    pg.evaluate('id => { const w = FR.wm.wins.get(id); if (w) w.close(); }', wid); pg.wait_for_timeout(300)


xl = lambda pg: pg.evaluate('() => FR.state.xl || null')

server = subprocess.Popen(['node', 'test/local_server.js', str(PORT)], cwd=ROOT, stdout=subprocess.PIPE)
server.stdout.readline()
try:
    with sync_playwright() as p:
        kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
        b = p.chromium.launch(**kw)

        # 1. a player types payroll into the 13-week cash file
        a = computer(b)
        sign(a, 'new', 'Keeper', 'keep-my-cells')
        crack_password(a)
        solve_upto(a, 'dscr')
        open_file(a, 'cash13')
        for c in ['B14', 'D14', 'F14']: xl_type(a, c, '196')
        x = xl(a)
        ok(x == {'cash13': {CASH: {'B14': '196', 'D14': '196', 'F14': '196'}}}, 'typed cells are in FR.state.xl (only the changed cells): ' + json.dumps(x))
        # typing and undoing leaves nothing behind; a cell set back to what the file had isn't stored
        xl_type(a, 'H20', 'oops'); ok('H20' in (xl(a) or {}).get('cash13', {}).get(CASH, {}), 'a stray edit is saved too')
        a.keyboard.press('Control+z'); a.wait_for_timeout(300)
        ok('H20' not in xl(a)['cash13'][CASH] and cell_text(a, 'cash13', 'H20') not in ('oops', None), 'undo takes it back out of the save: ' + json.dumps(xl(a)) + ' ' + str(cell_text(a, 'cash13', 'H20')))
        a.keyboard.press('Control+y'); a.wait_for_timeout(300)
        ok(xl(a)['cash13'][CASH].get('H20') == 'oops', 'redo puts it back')
        a.keyboard.press('Control+z'); a.wait_for_timeout(300)
        a.wait_for_timeout(2500)   # the cloud save goes up ~1.5 s after a change

        # 2. reload: the edits are there when the file opens again
        a.goto(URL); a.wait_for_timeout(700); cont(a)
        open_file(a, 'cash13')
        ok(cell_text(a, 'cash13', 'B14') == '196' and cell_text(a, 'cash13', 'F14') == '196', 'after a reload the file opens with the typed payroll')
        ok('H20' not in xl(a)['cash13'][CASH], 'the undone edit stayed out')

        # 3. same player, another computer
        bb = computer(b); sign(bb, 'back', 'keeper', 'keep-my-cells'); cont(bb)
        open_file(bb, 'cash13')
        ok(cell_text(bb, 'cash13', 'D14') == '196', 'on another computer the file has the typed payroll')
        close_win(bb, 'xl-cash13'); bb.context.close()
        a.goto(URL); a.wait_for_timeout(700); cont(a)   # (B saved last: A picks that up instead of being told to reload)

        # 4. an item that ticks itself in Excel, fixed before the checklist got there: counts once the checklist catches up
        open_file(a, 'bridge')
        xl_type(a, 'C9', '=-40*1500/1000'); xl_type(a, 'C11', '=C12-C6-C7-C8-C9-C10'); a.wait_for_timeout(500)
        ok(not a.evaluate("() => FR.puzzle.isSolved('bridge')") and a.locator('.fr-dialog').count() > 0, 'bridge fixed too early: not ticked yet (Excel says so)')
        close_dialogs(a); a.wait_for_timeout(2500)
        a.goto(URL); a.wait_for_timeout(700); cont(a)
        a.evaluate("() => { window.__solvedEv = []; FR.bus.on('solved', id => __solvedEv.push(id)); }")
        solve_upto(a, 'cash')
        ok(not a.evaluate("() => FR.puzzle.isSolved('bridge')"), 'bridge still open before the file is opened again')
        open_file(a, 'bridge'); a.wait_for_timeout(600); close_dialogs(a)
        ok(a.evaluate("() => FR.puzzle.isSolved('bridge')"), 'reopened with the saved fix: the bridge ticks now')
        ok(cell_text(a, 'bridge', 'C15') == 'TIES', 'bridge shows TIES')
        ok(a.evaluate("() => __solvedEv.filter(x => x === 'bridge').length") == 1, 'awarded once')
        t0 = a.evaluate("() => FR.state.solved.bridge"); sc0 = a.evaluate('() => FR.score.now().score')
        close_win(a, 'xl-bridge'); a.wait_for_timeout(2500)

        # 5. reopening a solved file with saved edits: no second award, nothing breaks
        a.goto(URL); a.wait_for_timeout(700); cont(a)
        a.evaluate("() => { window.__solvedEv = []; FR.bus.on('solved', id => __solvedEv.push(id)); }")
        open_file(a, 'bridge'); a.wait_for_timeout(600)
        ok(a.locator('.fr-dialog').count() == 0, 'no dialog when a solved file opens')
        ok(cell_text(a, 'bridge', 'C15') == 'TIES' and cell_text(a, 'bridge', 'C9') == '(60)', 'solved bridge opens with TIES and (60): ' + str(cell_text(a, 'bridge', 'C9')))
        ok(a.evaluate("() => __solvedEv.length") == 0 and a.evaluate("() => FR.state.solved.bridge") == t0, 'no second award (same solve time)')
        ok(a.evaluate('() => FR.score.now().score') == sc0, 'score unchanged')
        # editing a solved file still saves (and a wrong edit doesn't un-solve it)
        xl_type(a, 'C9', '5'); a.wait_for_timeout(300)
        ok(xl(a)['bridge'][BRIDGE]['C9'] == '5' and a.evaluate("() => FR.puzzle.isSolved('bridge')"), 'later edits are saved, item stays done')
        a.keyboard.press('Control+z'); a.wait_for_timeout(300)
        close_win(a, 'xl-bridge')

        # 6. bad saved data is cleaned when loaded; the size limit holds
        clean = a.evaluate("""() => FR.loadState({ solved: {}, xl: { 'bad id!': { S: { A1: 'x' } }, cash13: { S: { B14: 5, ZZZ99999: 'x', B2: 'ok', C3: ['=1', 'p0'], C4: ['=1', 7], C5: 'y'.repeat(3000) }, T: 'nope' }, arr: [] } }).xl""")
        ok(clean == {'cash13': {'S': {'B2': 'ok', 'C3': ['=1', 'p0']}}}, 'malformed edits dropped on load: ' + json.dumps(clean))
        ok(a.evaluate("() => FR.loadState({ solved: {}, xl: 'junk' }).xl") == {}, 'non-object xl → empty')
        big = a.evaluate("""() => { const bk = FR.xl.books.blankBook(99), m = new Map(); const prev = JSON.stringify(FR.state.xl);
            for (let r = 0; r < 200; r++) { bk.setRaw(0, r, 0, 'x'.repeat(1500)); m.set('0,' + r + ',0', { raw: '' }); }
            const res = FR.xl.edits.save(bk, 'huge', m); return { res, same: JSON.stringify(FR.state.xl) === prev, len: JSON.stringify(FR.state).length }; }""")
        ok(big['res'] is False and big['same'], 'an edit that would go over the size limit is not saved (the rest stays)')
        ok(big['len'] < 200000 and a.evaluate('() => FR.xl.edits.MAX') <= 150000, "the edits' limit keeps a save far below the server's 1 MB cap")
        # a percentage typed into a plain cell keeps its % format after a reload
        open_file(a, 'cash13'); xl_type(a, 'J30', '22%'); a.wait_for_timeout(300)
        ok(xl(a)['cash13'][CASH].get('J30') == ['0.22', 'p0'], 'typed % stored with its number format: ' + json.dumps(xl(a)['cash13'][CASH].get('J30')))
        close_win(a, 'xl-cash13'); a.wait_for_timeout(2500)
        a.goto(URL); a.wait_for_timeout(700); cont(a); open_file(a, 'cash13')
        ok(cell_text(a, 'cash13', 'J30') == '22%', 'and shows as 22% after a reload')
        close_win(a, 'xl-cash13')

        # 7. start over wipes the edits (here and on the account)
        a.goto(URL); a.wait_for_timeout(700)
        a.click('.fr-intro [data-a=new]'); a.locator('.fr-dialog .fr-dlg-btns button', has_text='Start over').click(); a.wait_for_timeout(1500)
        ok(not a.evaluate('() => FR.state.xl'), 'start over: no saved edits')
        k = computer(b); sign(k, 'back', 'keeper', 'keep-my-cells')
        ok(not k.evaluate('() => FR.state.xl') and k.evaluate('() => Object.keys(FR.state.solved).length') == 0, 'start over reached the server')
        k.context.close()

        # 8. without an account (browser-only save): a reload keeps the edits too
        g = computer(b)
        g.click('.fr-acct-guest'); g.wait_for_timeout(300); crack_password(g)
        solve_upto(g, 'dscr'); open_file(g, 'cash13'); xl_type(g, 'B14', '196'); g.wait_for_timeout(300)
        g.goto(URL); g.wait_for_timeout(700); cont(g); open_file(g, 'cash13')
        ok(cell_text(g, 'cash13', 'B14') == '196', 'guest (browser-only): edit there after a reload')

        b.close()
finally:
    server.terminate()

ok(not errors, 'no console errors' + ('' if not errors else ': ' + ' | '.join(errors[:5])))
print(f'{fails[0]} FAILED' if fails[0] else 'ALL PASS')
sys.exit(1 if fails[0] else 0)
