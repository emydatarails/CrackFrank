"""The whole game on a phone, by touch only: an emulated iPhone 13 (390x664, touch, mobile browser) taps its way through
every checklist item the way test/play.py clicks through them on a desktop. Taps (no double-clicks), a long-press for
the context menu, typing with the phone keyboard into the formula bar, dialogs and the checklist. Then a few screens in
landscape and on a small phone. Screenshots go to OUT (default test/out).
Usage: python3 test/mobile_play.py      (Playwright + Chromium, like test/play.py; CHROMIUM=path to use another binary)"""
import os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
URL = 'file://' + ROOT + '/dist/index.html'
PAGES = {'/': 'home.html', '/index.html': 'home.html'}
fails, logs, n = [0], [], [0]
TOP = '.fr-win:not(.fr-inactive):not(.fr-closing)'


def site(route):
    path = re.sub(r'^https?://[^/]+', '', route.request.url).split('?')[0].split('#')[0] or '/'
    f = os.path.join(ROOT, 'test', 'site', PAGES.get(path, path.lstrip('/')))
    if os.path.isfile(f) and f.endswith('.html'):
        route.fulfill(status=200, content_type='text/html', body=open(f, encoding='utf-8').read())
    else:
        route.fulfill(status=404, content_type='text/html', body='<h1>404</h1>')


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg, flush=True)
    if not cond: fails[0] += 1


def shot(pg, name):
    n[0] += 1
    pg.screenshot(path=f'{OUT}/mobile_{n[0]:02d}_{name}.png')


def solved(pg):
    return pg.evaluate("() => Object.keys(FR.state.solved)")


def tap(pg, loc, wait=350):
    loc.tap(); pg.wait_for_timeout(wait)


def longpress(pg, loc, ms=800):
    b = loc.bounding_box(); x, y = b['x'] + b['width'] / 2, b['y'] + min(b['height'] / 2, 20)
    cdp = pg.context.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
    pg.wait_for_timeout(ms)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    cdp.detach(); pg.wait_for_timeout(300)


def ck(pg):
    """the checklist, open and on top (via the tray icon, like a player)"""
    if not pg.evaluate("() => !!FR.wm.wins.get('checklist') && FR.wm.active && FR.wm.active.id === 'checklist' && !FR.wm.wins.get('checklist').min"):
        tap(pg, pg.locator('.fr-pack'))
    return pg.locator(TOP + ' .ck-item.open').first


def chip(pg, label, wait=900):
    tap(pg, ck(pg).locator('.ck-chip', has_text=label).first, wait)
    return pg.evaluate("() => FR.wm.active && FR.wm.active.el.querySelector('.fr-title').textContent")


def close_top(pg):
    tap(pg, pg.locator(TOP + ':not(.fr-dialog) .title-bar-controls button[aria-label=Close]').first, 300)


def dlg_btn(pg, text):
    tap(pg, pg.locator('.fr-dialog .fr-dlg-btns button', has_text=text).last, 350)


def dlg_type(pg, value, button='OK'):
    pg.wait_for_selector('.fr-dialog .fr-dlg-input input', timeout=4000)
    tap(pg, pg.locator('.fr-dialog .fr-dlg-input input').last, 150)
    pg.keyboard.type(value, delay=15)
    dlg_btn(pg, button); pg.wait_for_timeout(300)


def closeall(pg):
    for _ in range(25):
        d = pg.locator('.fr-dialog .fr-dlg-btns button')
        if d.count():
            no = pg.locator('.fr-dialog .fr-dlg-btns button', has_text='No')
            tap(pg, no.last if no.count() else d.last, 250); continue
        ids = pg.evaluate("() => [...FR.wm.wins.values()].filter(w => w.id !== 'checklist' && !w.el.classList.contains('fr-dialog')).map(w => w.id)")
        if not ids: return
        # bring it back with its taskbar button, then close it with the title-bar X
        if not pg.evaluate("id => FR.wm.active && FR.wm.active.id === id", ids[-1]):
            tap(pg, pg.locator('.fr-task').nth(pg.evaluate("id => [...document.querySelectorAll('.fr-task')].indexOf(FR.wm.wins.get(id).tb)", ids[-1])), 300)
        close_top(pg)


def ex_tap(pg, id_, wait=700):
    """one tap opens an item in the top Explorer window (phones have no double-click)"""
    tap(pg, pg.locator(f'{TOP} .ex-view [data-id="{id_}"]').first, wait)


def task(pg, text):
    tap(pg, pg.locator('.fr-task', has_text=text).first, 400)


def xl_type(pg, r, c, text):
    """tap a cell, tap it again (edit in the formula bar), type with the phone keyboard, Enter"""
    cell = pg.locator(f'{TOP} .xl-grid td[data-r="{r}"][data-c="{c}"]').first
    tap(pg, cell, 400); tap(pg, cell, 300)
    active = pg.evaluate("() => document.activeElement && document.activeElement.className")
    if active != 'xl-fin': ok(False, f'second tap on R{r}C{c} did not open the formula bar (focus: {active})')
    pg.keyboard.type(text, delay=10); pg.keyboard.press('Enter'); pg.wait_for_timeout(350)


def topmost_is_visible(pg, sel):
    return pg.evaluate("""s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect();
      const x = Math.min(innerWidth - 2, Math.max(1, r.left + r.width / 2)), y = Math.min(innerHeight - 2, Math.max(1, r.top + Math.min(r.height / 2, 12)));
      const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)) && r.right <= innerWidth + 1 && r.left >= -1; }""", sel)


os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
    b = p.chromium.launch(**kw)
    dev = dict(p.devices['iPhone 13']); dev.pop('default_browser_type', None)
    ctx = b.new_context(**dev)
    ctx.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and '404' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL); pg.wait_for_timeout(700)
    ok(pg.evaluate('() => FR.mobile === true && document.documentElement.classList.contains("fr-m")'), 'phone detected (FR.mobile, html.fr-m)')
    ok(pg.evaluate('() => document.documentElement.scrollWidth <= innerWidth'), 'intro: no sideways scrolling')
    shot(pg, 'intro')

    # ---- 1 login: the hint "?", two wrong tries, then the password
    tap(pg, pg.locator('[data-a=go]')); pg.wait_for_selector('.fr-login input', timeout=8000); pg.wait_for_timeout(300)
    tap(pg, pg.locator('.fr-q'), 250)
    ok(pg.locator('.fr-login-hint').count() == 1, 'log-on: the ? shows the password hint')
    inp = pg.locator('.fr-pw-row input')
    for w in ['packa1958', 'sedalia']:
        tap(pg, inp, 100); pg.keyboard.type(w); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    ok('Still stuck' in pg.inner_text('.fr-login-hint'), 'log-on: hint grows after two misses')
    ok(topmost_is_visible(pg, '.fr-login-hint') and topmost_is_visible(pg, '.fr-pw-row input'), 'log-on: hint and password box both on screen')
    shot(pg, 'login_fail')
    tap(pg, inp, 100); pg.keyboard.type('Sedalia 1958'); tap(pg, pg.locator('.fr-go'), 3800)
    ok('login' in solved(pg), '1 login by touch')
    ok(pg.evaluate("() => FR.wm.wins.get('checklist') && FR.wm.wins.get('checklist').max"), 'checklist opens filling the screen')
    ok(pg.locator(TOP + ' .title-bar-controls button[aria-label=Maximize]').first.is_hidden(), 'no Maximize button on phone windows')
    shot(pg, 'desktop_checklist')

    # ---- 2 version: chips, open every budget, pick one
    chip(pg, "Diane's email")
    ok(pg.evaluate("() => /^oe-msg-/.test(FR.wm.active.id) && FR.wm.active.max"), "chip: Diane's email opens full screen")
    closeall(pg)
    ok('FY27 Budget' in (chip(pg, 'FY27 Budget folder') or ''), 'chip: FY27 Budget folder')
    closeall(pg)
    chip(pg, 'packacorp.com home', 1500)
    ok(pg.frame_locator(TOP + ' iframe').locator('body').inner_text().count('1958') > 0, 'IE shows the Packa homepage')
    shot(pg, 'ie_home'); closeall(pg)
    gm = {}
    for i, fid in enumerate(['bud_v3', 'bud_v4', 'bud_v5ff', 'bud_v5ut', 'bud_v6']):
        tap(pg, ck(pg).locator('.ck-file small').nth(i), 900)
        gm[fid] = pg.evaluate("""() => { const t=[...document.querySelectorAll('.fr-win:not(.fr-inactive) .xl-grid tr')].find(r=>/Gross margin %/.test(r.innerText)); return t ? t.innerText.replace(/\\s+/g,' ') : 'NO GM ROW'; }""")
        if fid == 'bud_v5ut': shot(pg, 'excel_v5ut')
        closeall(pg)
    ok(all('Gross margin' in v for v in gm.values()), 'all five budgets open from the checklist by tap')
    tap(pg, ck(pg).locator('.ck-file', has_text='v5_FINAL_FINAL').first.locator('.ck-pickbtn'), 300); dlg_btn(pg, 'Send to Diane')
    ok('version' not in solved(pg), '2 wrong budget is refused')
    tap(pg, ck(pg).locator('.ck-file', has_text='v5_FINAL_USE_THIS').first.locator('.ck-pickbtn'), 300); dlg_btn(pg, 'Send to Diane')
    ok('version' in solved(pg), '2 version by touch')

    # ---- 3 unlock: the note in A1 is shown by a tap (no hover on a phone)
    pg.wait_for_timeout(600)
    chip(pg, 'The approved version', 1200)
    a1 = pg.locator(TOP + ' .xl-grid td.xl-hascm').first
    tap(pg, a1, 400)
    tip = pg.evaluate("() => { const t = document.querySelector('.fr-win:not(.fr-inactive) .xl-cmtip .xl-cm'); if (!t) return null; const r = t.getBoundingClientRect(); return [t.innerText, r.left >= 0 && r.right <= innerWidth + 1] }")
    ok(bool(tip) and 'PW = SUM' in tip[0] and tip[1], "unlock: tapping A1 shows Frank's note, fully on screen")
    shot(pg, 'excel_note'); closeall(pg)
    chip(pg, 'About Us', 1200); closeall(pg)
    chip(pg, 'Budget_FY27_BOARD.xls', 700)
    ok(topmost_is_visible(pg, '.fr-dialog .fr-dlg-input input'), 'password dialog fits the phone screen')
    shot(pg, 'board_pw')
    dlg_type(pg, '1993'); dlg_btn(pg, 'OK')
    chip(pg, 'Budget_FY27_BOARD.xls', 700); dlg_type(pg, '4406'); pg.wait_for_timeout(900)
    ok('unlock' in solved(pg), '3 unlock by touch (password typed in the dialog)')

    # ---- 4 ebitda: tap, tap again, type formulas in the formula bar
    pg.evaluate("() => document.querySelectorAll('.fr-balloon').forEach(b => b.remove())")
    xl_type(pg, 11, 2, '=C7-C9-C10-C11'); pg.wait_for_timeout(700)
    for d in range(pg.locator('.fr-dialog').count()): dlg_btn(pg, 'OK')
    for c in (4, 5, 6, 7):
        L = 'EFGH'[c - 4]; xl_type(pg, 11, c, f'={L}7-{L}9-{L}10-{L}11'); pg.wait_for_timeout(250)
        for d in range(pg.locator('.fr-dialog').count()): dlg_btn(pg, 'OK')
    pg.wait_for_timeout(900); shot(pg, 'ebitda_fixed')
    ok('ebitda' in solved(pg), '4 ebitda by touch (formulas typed on the phone keyboard)')
    for d in range(pg.locator('.fr-dialog').count()): dlg_btn(pg, 'OK')
    closeall(pg)

    # ---- 5 dscr: a tap opens the zip, password dialog, covenant certificate
    pg.wait_for_timeout(600)
    chip(pg, 'Bank')
    ex_tap(pg, 'bankzip')
    if pg.locator('.fr-dialog .fr-dlg-input input').count(): dlg_type(pg, '3130')
    ex_tap(pg, 'loan')
    if pg.locator('.fr-dialog .fr-dlg-input input').count(): dlg_type(pg, '3130')
    ok(pg.evaluate("() => /Loan_Agreement/.test(FR.wm.active.el.querySelector('.fr-title').textContent)"), 'the loan agreement opens in Notepad from the zip')
    shot(pg, 'loan'); close_top(pg)
    ex_tap(pg, 'covenant', 1000)
    chip(pg, "Karen's email"); close_top(pg)
    task(pg, 'Covenant')
    xl_type(pg, 12, 5, '=F11-F12'); xl_type(pg, 22, 5, '=(F8-F13)/F20'); pg.wait_for_timeout(900)
    ok('dscr' in solved(pg), '5 dscr by touch')
    shot(pg, 'dscr')
    for d in range(pg.locator('.fr-dialog').count()): dlg_btn(pg, 'OK')
    closeall(pg)

    # ---- 6 cash: Tools > Folder Options by tap, hidden folder, payroll, pick the week
    pg.wait_for_timeout(3000)
    chip(pg, 'BOARD')
    tap(pg, pg.locator(TOP + ' .fr-mi', has_text='Tools'), 300)
    ok(topmost_is_visible(pg, '.fr-menu-drop .fr-menu-item'), 'Tools menu drops down on screen')
    tap(pg, pg.locator('.fr-menu-item', has_text='Folder Options'), 500)
    tap(pg, pg.locator('.sh-sheet [role=tab]', has_text='View'), 250)
    tap(pg, pg.locator('.sh-sheet label', has_text='Show hidden files and folders').last, 200)
    shot(pg, 'folder_options')
    tap(pg, pg.locator('.sh-sheet .sh-ok'), 500)
    ok(pg.locator(f'{TOP} .ex-view [data-id="cashdir"]').count() == 1, 'hidden REAL VERSION folder shows up')
    # long-press = right-click: Properties of the hidden folder
    longpress(pg, pg.locator(f'{TOP} .ex-view [data-id="cashdir"]').first)
    ok(pg.locator('.sh-pop').count() > 0, 'long-press on a folder opens its context menu')
    shot(pg, 'longpress_menu')
    tap(pg, pg.locator('.sh-pop-i', has_text='Properties').first, 600)
    ok(pg.evaluate("() => /Properties/.test(FR.wm.active.el.querySelector('.fr-title').textContent)"), 'context menu > Properties opens')
    close_top(pg)
    ex_tap(pg, 'cashdir'); ex_tap(pg, 'realnotes', 500); shot(pg, 'realnotes'); close_top(pg)
    ex_tap(pg, 'cash13', 1000)
    chip(pg, "Rachel's email"); close_top(pg)
    chip(pg, 'Careers page', 1300); close_top(pg)
    task(pg, 'Cash_13wk')
    for c in (1, 3, 5, 7, 9, 11, 13): xl_type(pg, 13, c, '196')
    shot(pg, 'cash_payroll')
    tap(pg, ck(pg).locator('.ck-weeks button', has_text=re.compile(r'^6$')), 300)
    tap(pg, ck(pg).locator('.ck-weeks button', has_text=re.compile(r'^5$')), 500)
    ok('cash' in solved(pg), '6 cash by touch')
    closeall(pg)

    # ---- 7 bridge
    pg.wait_for_timeout(3000)
    chip(pg, 'Board Meeting Oct 20'); ex_tap(pg, 'bridge', 1000)
    xl_type(pg, 8, 2, '=-40*1500/1000'); xl_type(pg, 10, 2, '=C12-C6-C7-C8-C9-C10'); pg.wait_for_timeout(900)
    ok('bridge' in solved(pg), '7 bridge by touch')
    for d in range(pg.locator('.fr-dialog').count()): dlg_btn(pg, 'OK')
    closeall(pg)

    # ---- 8 forboard
    pg.wait_for_timeout(3000)
    chip(pg, 'FOR THE BOARD folder'); ex_tap(pg, 'forboardx', 600); dlg_type(pg, '18243'); pg.wait_for_timeout(900)
    ok('forboard' in solved(pg), '8 forboard by touch')
    closeall(pg)

    # ---- 9 send: tap the message, Reply, Send
    pg.wait_for_timeout(3000)
    chip(pg, 'Outlook Express', 900); shot(pg, 'outlook')
    row = pg.locator(TOP + ' tr[data-id]', has_text='Send me the pack').first
    tap(pg, row, 400)
    ok(pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .oe-prev').innerText.length > 40"), 'Outlook: a tap shows the message in the preview')
    tap(pg, pg.locator(TOP + ' .oe-tbb', has_text='Reply').first, 800); shot(pg, 'reply')
    tap(pg, pg.locator(TOP + ' .oe-tbb-send'), 800)
    ok('send' in solved(pg), '9 send by touch')
    pg.wait_for_timeout(8000); closeall(pg)

    # ---- 10 frank
    chip(pg, "Rachel's email"); closeall(pg)
    tap(pg, ck(pg).locator('.ck-sus', has_text='Drew'), 300)
    tap(pg, ck(pg).locator('.ck-sus', has_text='Kristians'), 500)
    ok('frank' in solved(pg), '10 frank by touch')
    pg.wait_for_timeout(4200); shot(pg, 'reveal')
    close_top(pg); pg.wait_for_timeout(1500)
    ok(pg.locator('.fr-end').count() == 1, 'ending screen')
    ok(topmost_is_visible(pg, '.fr-end-cta .pri'), 'ending: the main button is reachable')
    shot(pg, 'ending')
    tap(pg, pg.locator('.fr-end [data-a=back]'), 400)

    # ---- landscape: the same phone turned sideways
    ctx2 = b.new_context(**dict(dev, viewport={'width': 664, 'height': 390}))
    ctx2.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    p2 = ctx2.new_page(); p2.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    p2.goto(URL + '?dev=1&solve=unlock'); p2.wait_for_selector('.fr-desktop'); p2.wait_for_timeout(800)
    ok(p2.evaluate('() => FR.mobile'), 'landscape phone is mobile too')
    p2.evaluate("() => FR.openFile('bud_board')"); p2.wait_for_timeout(900)
    ok(p2.evaluate("() => { const s = document.querySelector('.fr-win:not(.fr-inactive) .xl-scroll'); return s && s.clientHeight > 150; }"), 'landscape Excel keeps a usable grid')
    p2.screenshot(path=f'{OUT}/mobile_landscape_excel.png')
    p2.evaluate("() => { FR.wm.wins.forEach(w => w.close()); document.querySelector('.fr-startbtn').click(); }"); p2.wait_for_timeout(400)
    ok(p2.evaluate("() => { const m = document.querySelector('.fr-start'); const r = m.getBoundingClientRect(); return r.top >= 0 && m.scrollHeight >= m.clientHeight; }"), 'landscape Start menu fits (scrolls)')
    p2.screenshot(path=f'{OUT}/mobile_landscape_start.png')
    ctx2.close()

    # ---- small phone (iPhone SE): the keyboard-sized screen still shows the checklist answer box
    se = dict(p.devices['iPhone SE']); se.pop('default_browser_type', None)
    ctx3 = b.new_context(**se); p3 = ctx3.new_page(); p3.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    p3.goto(URL + '?dev=1&solve=unlock'); p3.wait_for_selector('.fr-desktop'); p3.wait_for_timeout(800)
    p3.locator('.fr-win .ck-item.open .ck-ans input').tap(); p3.wait_for_timeout(200)
    p3.evaluate('() => FR.viewportFit(innerHeight - 260, 0)'); p3.wait_for_timeout(300)   # what the soft keyboard does
    ok(p3.evaluate("() => { const i = document.activeElement, r = i.getBoundingClientRect(); return i.tagName === 'INPUT' && r.bottom <= innerHeight - 260 + 1 && r.top >= 0; }"), 'soft keyboard up: the answer box moves above it')
    p3.screenshot(path=f'{OUT}/mobile_se_keyboard.png')
    p3.evaluate('() => FR.viewportFit(innerHeight, 0)')
    ctx3.close()
    b.close()

print('\n'.join(logs) or 'no console errors')
print('ALL PASS' if not fails[0] and not logs else f'{fails[0]} FAILED')
sys.exit(1 if fails[0] or logs else 0)
