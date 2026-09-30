"""The whole game on a phone, by touch only: an emulated iPhone 13 (390x664, touch, mobile browser) taps its way through
every checklist item the way test/play.py clicks through them on a desktop. Taps (no double-clicks), a long-press for
the context menu, typing with the phone keyboard into the formula bar, dialogs and the checklist. Then a few screens in
landscape and on a small phone. The same on a Pixel 7 and on an iPhone SE (320x568), with round-3 regression checks
(S1: nothing invisible over a property sheet's OK/Cancel/Apply; S2: toasts open up, never vanish under a finger and a tap
where one just vanished doesn't go through; S4 Submit label; S5 comment marker; S6 formula bar; S7/S8 Notepad), and round-3b
checks (r3b_checks: tips never under a finger / over the window list, pass-through, fading tip, stale tips, comment pop-ups,
checklist footer, one window per file, one-tap mail on 320 px, Start menu, leaderboard, edits kept after a reload).
Screenshots go to OUT (default test/out).
Usage: python3 test/mobile_play.py      (Playwright + Chromium, like test/play.py; CHROMIUM=path to use another binary)"""
import os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
URL = 'file://' + ROOT + '/dist/index.html'
PAGES = {'/': 'home.html', '/index.html': 'home.html'}
fails, logs, n = [0], [], [0]
PFX = ['']
FILL = [False]   # Pixel: the EBITDA row by "Fill…"; iPhone: cell by cell
DEVICES = sys.argv[1:] or ['iPhone 13', 'Pixel 7', 'iPhone SE']   # the whole game on each (iPhone SE: 320x568, the smallest)
TOP = '.fr-win:not(.fr-inactive):not(.fr-closing)'


def site(route):
    path = re.sub(r'^https?://[^/]+', '', route.request.url).split('?')[0].split('#')[0] or '/'
    f = os.path.join(ROOT, 'test', 'site', PAGES.get(path, path.lstrip('/')))
    if os.path.isfile(f) and f.endswith('.html'):
        route.fulfill(status=200, content_type='text/html', body=open(f, encoding='utf-8').read())
    else:
        route.fulfill(status=404, content_type='text/html', body='<h1>404</h1>')


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + (PFX[0] + ' ' if PFX[0] else '') + msg, flush=True)
    if not cond: fails[0] += 1


def shot(pg, name):
    n[0] += 1
    pg.screenshot(path=f'{OUT}/mobile_{PFX[0]}{n[0]:02d}_{name}.png')


def solved(pg):
    return pg.evaluate("() => Object.keys(FR.state.solved)")


# Touch only, like a finger: the target must be on screen and on top at the tap point. If it isn't (scrolled away,
# under a sticky column), the test swipes the nearest scrollable box by touch until it is; no programmatic scrolling
# (Playwright's own tap scrolls elements into view by script, which is how a dialog that can't be scrolled by a finger
# slipped through before).
HIT = """el => {
  const vw = innerWidth, vh = innerHeight, r = el.getBoundingClientRect();
  const x = r.left + Math.min(r.width / 2, 24), y = r.top + Math.min(r.height / 2, 16);
  const on = r.width > 0 && r.height > 0 && x >= 1 && y >= 1 && x <= vw - 1 && y <= vh - 1;
  const h = on ? document.elementFromPoint(x, y) : null;
  if (h && (h === el || el.contains(h) || (h.tagName === 'LABEL' && h.control === el))) return { ok: true, x, y };
  let sc = el.parentElement;
  while (sc && sc !== document.body) { const cs = getComputedStyle(sc); if ((sc.scrollHeight > sc.clientHeight + 2 && /auto|scroll/.test(cs.overflowY)) || (sc.scrollWidth > sc.clientWidth + 2 && /auto|scroll/.test(cs.overflowX))) break; sc = sc.parentElement; }
  const hit = h ? (h.className || h.tagName) + '' : 'off-screen';
  if (!sc || sc === document.body) return { ok: false, hit, bal: !!(h && h.closest && h.closest('.fr-balloon')) };
  const s = sc.getBoundingClientRect(), cx = s.left + s.width / 2, cy = s.top + s.height / 2;
  // move only along an axis the box can scroll and where the target is not fully inside the box (a finger swipe
  // that is mostly sideways would lock to sideways scrolling)
  const canX = sc.scrollWidth > sc.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(sc).overflowX), canY = sc.scrollHeight > sc.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(sc).overflowY);
  const outX = r.left < s.left + 40 || r.right > s.right - 4, outY = r.top < s.top + 30 || r.bottom > s.bottom - 4 || !h;
  let dx = canX && outX ? cx - (r.left + r.width / 2) : 0, dy = canY && (outY || !dx) ? cy - (r.top + r.height / 2) : 0;
  if (!dx && !dy) dy = canY ? (r.top < s.top + s.height / 2 ? 60 : -60) : 0;
  return { ok: false, hit, sx: Math.min(Math.max(cx, 8), vw - 8), sy: Math.min(Math.max(cy, 8), vh - 8), dx, dy, hw: s.width * .35, hh: s.height * .35, bal: !!(h && h.closest && h.closest('.fr-balloon')) };
}"""


def swipe(pg, x1, y1, x2, y2, steps=14):
    cdp = pg.context.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x1, 'y': y1}]})
    for i in range(1, steps + 1):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x1 + (x2 - x1) * i / steps, 'y': y1 + (y2 - y1) * i / steps}]})
        pg.wait_for_timeout(16)
    pg.wait_for_timeout(120)   # the finger rests before lifting: no fling
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    cdp.detach(); pg.wait_for_timeout(350)


def tap(pg, loc, wait=350, what=''):
    loc.wait_for(state='attached', timeout=10000)
    h = None; waited = False
    for _ in range(14):
        h = loc.first.evaluate(HIT)
        if h['ok'] and waited:   # a toast just went: like a person, don't tap in the same instant (S2 swallows that tap)
            pg.wait_for_timeout(700); waited = False; continue
        if h['ok']: break
        if h.get('bal'): pg.wait_for_timeout(1500); waited = True; continue          # a toast over it: wait for it to go
        if 'sx' not in h: pg.wait_for_timeout(400); continue
        mx, my = min(220, 2 * h['hw']), min(220, 2 * h['hh'])   # the whole swipe stays inside the scrolling box
        dx, dy = max(-mx, min(mx, h['dx'])), max(-my, min(my, h['dy']))
        swipe(pg, h['sx'] - dx / 2, h['sy'] - dy / 2, h['sx'] + dx / 2, h['sy'] + dy / 2)
    if not h['ok']:
        ok(False, f'touch: cannot reach {what or loc} by finger ({h})'); raise SystemExit(1)
    pg.touchscreen.tap(h['x'], h['y']); pg.wait_for_timeout(wait)


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
    tap(pg, ck(pg).locator('.ck-chip', has_text=label).first, wait, 'chip ' + label)
    return pg.evaluate("() => FR.wm.active && FR.wm.active.el.querySelector('.fr-title').textContent")


def close_top(pg):
    tap(pg, pg.locator(TOP + ':not(.fr-dialog) .title-bar-controls button[aria-label=Close]').first, 300)


def dlg_btn(pg, text):
    pg.wait_for_timeout(550)   # a message box ignores taps for its first half second (tap guard)
    tap(pg, pg.locator('.fr-dialog .fr-dlg-btns button', has_text=text).last, 350)


def dlg_type(pg, value, button='OK'):
    pg.wait_for_selector('.fr-dialog .fr-dlg-input input', timeout=4000); pg.wait_for_timeout(550)
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
        # close it from the window list (the taskbar's switcher button on a phone)
        tap(pg, pg.locator('.fr-switch'), 350)
        tap(pg, pg.locator(f'.fr-swlist .fr-swl-r[data-wid="{ids[-1]}"] .fr-swl-x'), 400)
        if pg.locator('.fr-swlist').count(): tap(pg, pg.locator('.fr-switch'), 300)


def ex_tap(pg, id_, wait=700):
    """one tap opens an item in the top Explorer window (phones have no double-click)"""
    tap(pg, pg.locator(f'{TOP} .ex-view [data-id="{id_}"]').first, wait)


def task(pg, text):
    """switch windows the phone way: the taskbar's switcher button lists every open window by its full title"""
    tap(pg, pg.locator('.fr-switch'), 400)
    tap(pg, pg.locator('.fr-swlist .fr-swl-r', has_text=text).first, 450)


def xl_type(pg, r, c, text):
    """tap a cell, tap it again (edit in the formula bar), type with the phone keyboard, Enter"""
    cell = pg.locator(f'{TOP} .xl-grid td[data-r="{r}"][data-c="{c}"]').first
    tap(pg, cell, 400); tap(pg, cell, 300)
    active = pg.evaluate("() => document.activeElement && document.activeElement.className")
    if active != 'xl-fin': ok(False, f'second tap on R{r}C{c} did not open the formula bar (focus: {active})')
    pg.keyboard.type(text, delay=10); pg.keyboard.press('Enter'); pg.wait_for_timeout(350)
    nb = pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-nb-in').value")
    want = pg.evaluate("([r, c]) => { let s = '', n = c + 1; while (n) { s = String.fromCharCode(65 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); } return s + (r + 1); }", [r, c])
    if nb != want: ok(False, f'Enter should stay on {want} on a phone (now on {nb})')


def narrow(pg):
    return pg.viewport_size['width'] < 360   # iPhone SE (320 wide)


def reachable(pg, loc):
    """like tap(), swipes the nearest scroller by finger until loc is on top on screen, but doesn't tap it"""
    for _ in range(14):
        h = loc.first.evaluate(HIT)
        if h['ok']: return True
        if 'sx' not in h: return False
        mx, my = min(220, 2 * h['hw']), min(220, 2 * h['hh'])
        dx, dy = max(-mx, min(mx, h['dx'])), max(-my, min(my, h['dy']))
        swipe(pg, h['sx'] - dx / 2, h['sy'] - dy / 2, h['sx'] + dx / 2, h['sy'] + dy / 2)
    return False


FOOTER_PROBE = """() => {
  const out = [], sheet = [...document.querySelectorAll('.sh-sheetwin')].pop();
  for (const b of sheet.querySelectorAll('.sh-ok, .sh-cancel, .sh-apply')) {
    const r = b.getBoundingClientRect();
    for (const fy of [0.1, 0.3, 0.5, 0.7, 0.9]) for (const fx of [0.1, 0.5, 0.9]) {
      const h = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
      if (!(h === b || b.contains(h))) out.push(b.className + ' @' + fx + ',' + fy + ' -> ' + (h ? h.tagName + '#' + h.id + '.' + h.className : 'null'));
    }
  }
  const tb = document.querySelector('.fr-taskbar').getBoundingClientRect();
  for (let x = 4; x < innerWidth; x += 12) { const h = document.elementFromPoint(x, tb.top + tb.height / 2); if (h && h.tagName === 'INPUT') out.push('taskbar x=' + x + ' -> INPUT#' + h.id); }
  return out;
}"""


def footer_clear(pg, what):
    """S1: every point of a property sheet's OK / Cancel / Apply is the button itself (no invisible checkbox on top),
    with the settings list at its top, middle and bottom"""
    bad = []
    for pos in ('top', 'mid', 'bot'):
        pg.evaluate("(p) => { const s = [...document.querySelectorAll('.sh-sheetwin .sh-panes')].pop(); s.scrollTop = p === 'top' ? 0 : p === 'mid' ? (s.scrollHeight - s.clientHeight) / 2 : s.scrollHeight; }", pos)
        pg.wait_for_timeout(80); bad += pg.evaluate(FOOTER_PROBE)
    ok(not bad, f'S1: {what}: OK / Cancel / Apply are hit wherever they are touched (list scrolled top/middle/bottom) {bad[:3]}')


def topmost_is_visible(pg, sel):
    return pg.evaluate("""s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect();
      const x = Math.min(innerWidth - 2, Math.max(1, r.left + r.width / 2)), y = Math.min(innerHeight - 2, Math.max(1, r.top + Math.min(r.height / 2, 12)));
      const h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)) && r.right <= innerWidth + 1 && r.left >= -1; }""", sel)


def playthrough(p, b, devname):
    dev = dict(p.devices[devname]); dev.pop('default_browser_type', None)
    PFX[0] = devname.replace(' ', '') + '_'; FILL[0] = 'Pixel' in devname
    print('== whole game by touch on', devname, flush=True)
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
    y_before = pg.evaluate("() => document.querySelector('.fr-pw-row input').getBoundingClientRect().top")
    tap(pg, pg.locator('.fr-login-web'), 1500)
    ok(pg.frame_locator('.fr-win iframe').locator('body').inner_text().count('1958') > 0, 'P9: the log-on screen opens the Packa homepage in IE')
    close_top(pg)
    ok(pg.locator('.fr-win').count() == 0, 'P9: closing IE goes back to the log-on screen')
    tap(pg, inp, 100); pg.keyboard.type('nope'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    ok(abs(pg.evaluate("() => document.querySelector('.fr-pw-row input').getBoundingClientRect().top") - y_before) < 2, 'P10: a wrong password leaves the password box where it was')
    kb = pg.evaluate('() => Math.round(innerHeight * (innerHeight > innerWidth ? 0.45 : 0.55))')   # a phone keyboard's height
    tap(pg, inp, 700); pg.evaluate(f'() => FR.viewportFit(innerHeight - {kb}, 0)'); pg.wait_for_timeout(600)
    ok(pg.evaluate(f"() => {{ const r = document.querySelector('.fr-pw-row input').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight - {kb}; }}"), 'soft keyboard up: the password box sits above it')
    shot(pg, 'login_keyboard'); pg.evaluate('() => FR.viewportFit(innerHeight, 0)')
    pg.keyboard.type('Sedalia 1958'); tap(pg, pg.locator('.fr-go'), 3800)
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
    # phones: "This one" uses the same Select → Submit bar as weeks and suspects (R2), and it ignores a too-quick tap
    tap(pg, ck(pg).locator('.ck-file', has_text='v5_FINAL_FINAL').first.locator('.ck-pickbtn'), 60)
    ok(pg.locator('.fr-dialog').count() == 0 and pg.locator('.ck-confirm .ck-conf-ok', has_text='Send to Diane').count() == 1, 'R2: "This one" shows the Submit bar (no dialog)')
    lab = pg.evaluate("() => { const b = document.querySelector('.ck-confirm .ck-conf-ok'), r = b.getBoundingClientRect(); return [b.innerText.replace(/\\s+/g, ''), b.scrollWidth <= b.clientWidth + 1 && b.scrollHeight <= b.clientHeight + 1, r.left >= 0 && r.right <= innerWidth + 1]; }")
    ok('Budget_FY27_v5_FINAL_FINAL' in lab[0] and lab[1] and lab[2], f'S4: the Submit bar shows the whole file name, nothing cut ({lab})')
    bb = pg.locator('.ck-confirm .ck-conf-ok').bounding_box(); pg.touchscreen.tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(150)
    ok('version' not in solved(pg) and pg.locator('.ck-confirm').count() == 1, 'P1: a tap in the first half second of the Submit bar is ignored (no accidental answer)')
    pg.wait_for_timeout(450); tap(pg, pg.locator('.ck-confirm .ck-conf-ok'), 400)
    ok('version' not in solved(pg), '2 wrong budget is refused')
    tap(pg, ck(pg).locator('.ck-file', has_text='v5_FINAL_USE_THIS').first.locator('.ck-pickbtn'), 600); tap(pg, pg.locator('.ck-confirm .ck-conf-ok'), 400)
    ok('version' in solved(pg), '2 version by touch')

    # ---- 3 unlock: the note in A1 is shown by a tap (no hover on a phone)
    pg.wait_for_timeout(600)
    chip(pg, 'The approved version', 1200)
    a1 = pg.locator(TOP + ' .xl-grid td.xl-hascm').first
    tap(pg, a1, 400)
    tip = pg.evaluate("() => { const t = document.querySelector('.fr-win:not(.fr-inactive) .xl-cmtip .xl-cm'); if (!t) return null; const r = t.getBoundingClientRect(); return [t.innerText, r.left >= 0 && r.right <= innerWidth + 1] }")
    ok(bool(tip) and 'PW = SUM' in tip[0] and tip[1], "unlock: tapping A1 shows Frank's note, fully on screen")
    z5 = pg.evaluate("() => { const c = getComputedStyle(document.querySelector('.fr-win:not(.fr-inactive) .xl-grid td.xl-hascm'), '::after'); return [c.zIndex, parseFloat(c.borderRightWidth)]; }")
    ok(z5[0] not in ('auto', '0') and int(z5[0]) >= 3 and z5[1] >= 10, f'S5: the red comment triangle is big and drawn on top of spilling text and the selection {z5}')
    shot(pg, 'excel_note')
    ok(pg.evaluate("() => getComputedStyle(document.querySelector('.fr-win:not(.fr-inactive) .xl-grid td[data-c=\"0\"]')).position === 'sticky'"), 'Excel: column A is frozen on a phone')
    tap(pg, pg.locator(TOP + ' .xl-tab', has_text='Notes'), 400)
    long = pg.locator(TOP + ' .xl-grid td[data-r="7"][data-c="2"]').first
    tap(pg, long, 400)
    ok(pg.evaluate("() => { const t = document.querySelector('.fr-win:not(.fr-inactive) .xl-cm-text'); return !!t && /Revenue to 40,000/.test(t.innerText); }"), 'Excel: a tap on a cut-off text cell shows the whole text')
    shot(pg, 'excel_longtext')
    tap(pg, pg.locator(TOP + ' .xl-zoomb'), 400)
    z = pg.evaluate("() => +getComputedStyle(document.querySelector('.fr-win:not(.fr-inactive) .xl-scroll')).zoom")
    fits = pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-ch[data-c=\"2\"]').getBoundingClientRect().right <= innerWidth + 1")
    ok(z <= 1.2 and fits and pg.locator(TOP + ' .xl-zoomb').inner_text() == '100%', f'R2: Fit makes the sheet fit the screen width (zoom {z:.2f}), the button says 100%')
    tap(pg, pg.locator(TOP + ' .xl-zoomb'), 400)
    ok(abs(pg.evaluate("() => +getComputedStyle(document.querySelector('.fr-win:not(.fr-inactive) .xl-scroll')).zoom") - 1.2) < 0.01, 'R2: 100% goes back')
    pg.evaluate("() => { FR.tips.clear(); FR.balloon('Test', 'a balloon'); }"); pg.wait_for_timeout(100)
    tap(pg, pg.locator(TOP + ' .xl-fin'), 300)
    sel6 = pg.evaluate("() => { const f = document.activeElement; return [f.className, f.selectionStart, f.selectionEnd, f.value.length]; }")
    ok(sel6[0] == 'xl-fin' and sel6[1] == 0 and sel6[2] == sel6[3] > 0, f'S6: the first tap into the formula bar selects the whole content {sel6}')
    ok(pg.locator('.fr-balloon').count() == 0, 'R2: no balloon over the formula bar while you type')
    pg.evaluate("() => FR.balloon('Test 2', 'while typing')"); pg.wait_for_timeout(2600)
    ok(pg.locator('.fr-balloon').count() == 0, 'R2: no balloon appears while you are typing (it waits)')
    tap(pg, pg.locator(TOP + ' .xl-fx-x'), 300)   # ✕ in the formula bar (a phone has no Esc)
    pg.wait_for_selector('.fr-balloon:has-text("a balloon")', timeout=6000); pg.wait_for_timeout(700)   # they waited their turn, oldest first
    ok(pg.evaluate("() => FR.tips.state().queued.includes('Test 2')"), 'R3b: one tip at a time, the next one waits in the queue')
    tap(pg, pg.locator('.fr-balloon .fr-balloon-x'), 300)
    pg.wait_for_selector('.fr-balloon:has-text("while typing")', timeout=6000); pg.wait_for_timeout(700)
    tap(pg, pg.locator('.fr-balloon .fr-balloon-x'), 300)
    pg.evaluate("() => FR.balloon('Board Pack: 7 of 10 done', '<b>Close the Q3 EBITDA bridge</b> — done.<br><i>A long reaction line to fill the toast.</i><br>Next up: Open FOR THE BOARD')")
    pg.wait_for_selector('.fr-balloon:has-text("7 of 10")', timeout=6000); pg.wait_for_timeout(700)
    pos = pg.evaluate("""() => { const b = document.querySelector('.fr-balloon').getBoundingClientRect(), x = document.querySelector('.fr-balloon .fr-balloon-x').getBoundingClientRect();
      const w = document.querySelector('.fr-win:not(.fr-inactive)'), tb = document.querySelector('.fr-taskbar').getBoundingClientRect();
      const top = Math.max(...['.title-bar', '.fr-menubar', '.xl-fbar'].map(s => w.querySelector(s)).filter(Boolean).map(e => e.getBoundingClientRect().bottom));
      return { clear: b.top >= top && b.bottom <= tb.top + 1, xw: x.width, xh: x.height, h: b.height }; }""")
    ok(pos['clear'] and pos['h'] <= 80, f'Q5: the toast is a strip above the taskbar, clear of the title bar, menu bar and formula bar ({pos})')
    ok(pos['xw'] >= 44 and pos['xh'] >= 44, 'Q5: the toast has a real ✕ target (44 px)')
    tap(pg, pg.locator('.fr-balloon:has-text("7 of 10") .fr-balloon-x'), 300)
    st5 = pg.evaluate("() => [[...document.querySelectorAll('.fr-balloon')].filter(b => /7 of 10/.test(b.textContent)).length, FR.wm.active && FR.wm.active.id]")
    ok(st5[0] == 0 and st5[1].startswith('xl-'), f'Q5: ✕ puts the toast away (the window under it stays) {st5}')
    # S2: a toast cut off at "…" opens up on a tap (the whole text, and what it does as a real button)
    pg.evaluate("() => { window.__s2 = 0; FR.balloon('Board Pack: 7 of 10 done', '<b>Close the Q3 EBITDA bridge</b> — done.<br><i>' + 'A long reaction line that goes on and on until it is cut off. '.repeat(3) + '</i><br>Next up: Open FOR THE BOARD', () => { window.__s2++; }, { act: 'Open the checklist' }); }")
    pg.wait_for_selector('.fr-balloon.fr-balloon-more', timeout=6000); pg.wait_for_timeout(700)
    tap(pg, pg.locator('.fr-balloon .fr-balloon-b'), 450)
    s2 = pg.evaluate("() => { const b = document.querySelector('.fr-balloon'), bb = b && b.querySelector('.fr-balloon-b'), g = b && b.querySelector('.fr-balloon-go'); if (!b) return null; const gr = g.getBoundingClientRect(); return [b.classList.contains('fr-balloon-open'), bb.scrollHeight <= bb.clientHeight + 1 || getComputedStyle(bb).overflowY === 'auto', gr.height >= 36 && gr.top >= 0 && gr.bottom <= innerHeight, g.innerText, window.__s2]; }")
    ok(bool(s2) and s2[0] and s2[1] and s2[2] and s2[3] == 'Open the checklist' and s2[4] == 0, f'S2: a tap on a cut-off toast opens it up: whole text, its action as a button, nothing done yet {s2}')
    tap(pg, pg.locator('.fr-balloon .fr-balloon-go'), 350)
    ok(pg.evaluate("() => window.__s2 === 1 && !document.querySelector('.fr-balloon')"), "S2: the opened toast's button does what the toast is for")
    # S2: it never goes away from under a finger resting on it (well past its 5 s)
    pg.evaluate("() => { FR.__bal = FR.balloon; FR.balloon = (t, ...a) => t === 'Test 3' ? FR.__bal(t, ...a) : null; FR.balloon('Test 3', 'a short one'); }")   # (no other tip meanwhile)
    pg.wait_for_selector('.fr-balloon:has-text("Test 3")', timeout=6000); pg.wait_for_timeout(700)
    r3 = pg.locator('.fr-balloon').bounding_box(); cx, cy = r3['x'] + 60, r3['y'] + r3['height'] / 2
    cdp = pg.context.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': cx, 'y': cy}]})
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': cx + 14, 'y': cy}]})   # (no long-press)
    pg.wait_for_timeout(6500)
    ok(pg.locator('.fr-balloon:has-text("Test 3")').count() == 1, 'S2: a toast never auto-hides while a finger is on the screen')
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); cdp.detach()
    # S2: a tap that lands where a toast was a moment ago (it just auto-hid) hits nothing
    pg.evaluate("() => { window.__thru = null; window.__thruOn = true; if (!window.__thruL) { window.__thruL = 1; ['pointerdown', 'mousedown', 'click'].forEach(t => document.addEventListener(t, e => { if (window.__thruOn) window.__thru = t + ' ' + String(e.target.className || e.target.tagName); }, true)); } }")
    pg.wait_for_function("() => !document.querySelector('.fr-balloon')", timeout=20000, polling=40)
    pg.touchscreen.tap(cx, cy); pg.wait_for_timeout(250)
    thru = pg.evaluate("() => window.__thru")
    pg.wait_for_timeout(1200); pg.touchscreen.tap(cx, cy); pg.wait_for_timeout(300)   # (control: a moment later a tap there counts)
    thru2 = pg.evaluate("() => { window.__thruOn = false; FR.balloon = FR.__bal; return window.__thru; }")
    ok(thru is None and thru2 is not None, f'S2: a tap landing where a toast just vanished does not go through (then: {thru}, a second later: {thru2})')
    closeall(pg)
    chip(pg, 'About Us', 1200); closeall(pg)
    chip(pg, 'Budget_FY27_BOARD.xls', 700)
    ok(topmost_is_visible(pg, '.fr-dialog .fr-dlg-input input'), 'password dialog fits the phone screen')
    shot(pg, 'board_pw')
    dlg_type(pg, '1993'); dlg_btn(pg, 'OK')
    chip(pg, 'Budget_FY27_BOARD.xls', 700); dlg_type(pg, '4406'); pg.wait_for_timeout(900)
    ok('unlock' in solved(pg), '3 unlock by touch (password typed in the dialog)')

    # ---- 4 ebitda: tap, tap again, type formulas in the formula bar
    if pg.locator('.fr-balloon').count(): tap(pg, pg.locator('.fr-balloon .fr-balloon-x'), 300)   # put the toast away
    xl_type(pg, 11, 2, '=C7-C9-C10-C11'); pg.wait_for_timeout(700)
    for d in range(pg.locator('.fr-dialog').count()): dlg_btn(pg, 'OK')
    if FILL[0]:   # Q8: no fill handle on a phone: "Fill…" copies C12 across to H12 (the formula moves along)
        tap(pg, pg.locator(TOP + ' .xl-fillb'), 600)
        dlg_type(pg, 'H12', 'Fill'); pg.wait_for_timeout(500)
        ok(pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-fin').value") == '=C7-C9-C10-C11' and
           pg.evaluate("() => { const t = document.querySelector('.fr-win:not(.fr-inactive) .xl-grid td[data-r=\"11\"][data-c=\"7\"]'); return t && t.innerText.trim(); }") not in ('', '#REF!'),
           'Q8: Fill… copies the EBITDA formula from C12 to H12 in one go')
        for d in range(pg.locator('.fr-dialog').count()): dlg_btn(pg, 'OK')
    else:
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
    s7 = pg.evaluate("() => { const w = document.querySelector('.fr-win:not(.fr-inactive)'), t = w.querySelector('.np-ta'), b = w.querySelector('.np-wrapb'); const tr = t.getBoundingClientRect(), br = b.getBoundingClientRect(); return [br.top >= tr.bottom - 1, parseFloat(getComputedStyle(t).fontSize), br.height]; }")
    ok(s7[0] and s7[2] >= 26, f'R3b S10: the Wrap button sits in its own bar under the text, never over a line {s7}')
    if narrow(pg): ok(s7[1] <= 12, f'S8: 320 px: Notepad text a notch smaller ({s7[1]} px)')
    was_wrap = pg.evaluate("() => !document.querySelector('.fr-win:not(.fr-inactive) .np-ta.np-nowrap')")
    if not was_wrap: tap(pg, pg.locator(TOP + ' .np-wrapb'), 300)
    rf = pg.evaluate("""() => { const t = document.querySelector('.fr-win:not(.fr-inactive) .np-ta'), L = t.value.split('\\n');
      return [L.filter(l => /^ {6,}\\S/.test(l)).length, L.filter(l => /Section 6\\.1  Debt Service Coverage Ratio\\.  The Borrower shall not permit the Debt Service Coverage Ratio, as of/.test(l)).length, t.scrollWidth <= t.clientWidth + 1]; }""")
    ok(rf[0] == 0 and rf[1] == 1 and rf[2], f'R3b S10: Wrap on: the loan agreement reflows (paragraphs on one line, headings not centred with spaces, nothing sideways) {rf}')
    tap(pg, pg.locator(TOP + ' .np-wrapb'), 300)
    ok(pg.evaluate("() => { const t = document.querySelector('.fr-win:not(.fr-inactive) .np-ta'); return t.classList.contains('np-nowrap') && /^ {20,}CREDIT AGREEMENT$/m.test(t.value); }"), 'R3b S10: Wrap off shows the file exactly as it is again')
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
    ok(topmost_is_visible(pg, '.sh-sheet .sh-ok'), 'Q1: Folder Options: OK is on screen (pinned) without scrolling')
    ok(pg.evaluate("() => Math.min(...[...document.querySelectorAll('.sh-sheetwin .fo-row')].map(r => r.getBoundingClientRect().height))") >= 44, 'Q4: Folder Options rows are at least 44 px')
    y0 = pg.evaluate("() => document.querySelector('.sh-sheetwin .sh-panes').scrollTop")
    tap(pg, pg.locator('.sh-sheet label', has_text='Show hidden files and folders').last, 200, 'Show hidden files')   # swipes the list by finger
    ok(pg.evaluate("() => document.querySelector('[data-k=showhidden]').checked"), 'Q1: "Show hidden files and folders" picked by a tap')
    bx = pg.locator('.sh-sheetwin .sh-panes').bounding_box()
    swipe(pg, bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] * .8, bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] * .3)
    ok(pg.evaluate("() => document.querySelector('.sh-sheetwin .sh-panes').scrollTop") > y0, 'Q1: the settings list scrolls by a finger swipe')
    ok(topmost_is_visible(pg, '.sh-sheet .sh-ok'), 'Q1: OK still on screen after scrolling')
    shot(pg, 'folder_options')
    footer_clear(pg, 'Folder Options (View)')
    for t in ('General', 'File Types'):
        tap(pg, pg.locator('.sh-sheet [role=tab]', has_text=t), 200); footer_clear(pg, 'Folder Options (' + t + ')')
    tap(pg, pg.locator('.sh-sheet [role=tab]', has_text='View'), 200)
    ok(pg.evaluate("() => document.querySelector('[data-k=showhidden]').checked"), 'S1: switching tabs and probing changed no setting')
    b1 = pg.locator('.sh-sheet .sh-ok').bounding_box()
    pg.touchscreen.tap(b1['x'] + b1['width'] / 2, b1['y'] + b1['height'] * 0.2); pg.wait_for_timeout(500)   # the upper part of OK (the player's tap)
    ok(pg.evaluate("() => FR.flags.get('showHidden') === true && !FR.wm.wins.get('sh-folderopts')"), 'S1: a tap on the UPPER part of OK presses OK')
    ok(pg.evaluate("() => FR.flags.get('showHidden') === true && !FR.wm.wins.get('sh-folderopts')"), 'Q1: OK by touch applies "show hidden files"')
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
    wrong0 = pg.evaluate("() => FR.state.wrong")
    for c in (1, 3, 5, 7, 9, 11, 13): xl_type(pg, 13, c, '196')
    shot(pg, 'cash_payroll')
    tap(pg, ck(pg).locator('.ck-weeks button', has_text=re.compile(r'^13$')), 300)
    ok(pg.evaluate("() => FR.state.wrong") == wrong0 and pg.locator('.ck-confirm').count() == 1, 'P2: one tap on a week only picks it (Submit button, no answer yet)')
    tap(pg, ck(pg).locator('.ck-weeks button', has_text=re.compile(r'^6$')), 300)
    pg.wait_for_timeout(450); tap(pg, ck(pg).locator('.ck-conf-ok', has_text='Week 6'), 400)
    tap(pg, ck(pg).locator('.ck-weeks button', has_text=re.compile(r'^5$')), 300)
    shot(pg, 'week_confirm')
    pg.wait_for_timeout(450); tap(pg, ck(pg).locator('.ck-conf-ok', has_text='Week 5'), 500)
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
    c_on = "() => /FOR_THE_BOARD/.test(FR.wm.active.el.querySelector('.fr-title').textContent) && document.querySelector('.fr-win:not(.fr-inactive) .xl-ch[data-c=\"2\"]').getBoundingClientRect().right <= innerWidth + 1"
    if not narrow(pg):
        ok(pg.evaluate(c_on), 'Q7: FOR_THE_BOARD at 100%: the values column (C) is on screen (wide text columns capped)')
    else:   # 320 px: labels (A) + text (B) + values (C) can't all fit at 100%; one tap on Fit brings C on screen
        tap(pg, pg.locator(TOP + ' .xl-zoomb'), 400)
        ok(pg.evaluate(c_on), 'Q7 (320 px): FOR_THE_BOARD after Fit: the values column (C) is on screen')
    closeall(pg)

    # ---- 9 send: tap the message, Reply, Send
    pg.wait_for_timeout(3000)
    chip(pg, 'Outlook Express', 900); shot(pg, 'outlook')
    tap(pg, pg.locator('.fr-switch'), 400)
    rows = pg.eval_on_selector_all('.fr-swlist .fr-swl-r', 'e => e.map(r => [r.className, r.innerText.replace(/\\s+/g, " ")])')
    ok(any('Inbox' in t and 'Outlook Express' in t for c, t in rows), 'P3: the window list shows full window names (and the app)')
    ok('pin' in rows[0][0] and 'Board Pack' in rows[0][1], 'R2: the checklist is pinned at the top of the window list')
    ok(any('on' in c.split() and 'current' in t and 'Inbox' in t for c, t in rows), 'R2: the current window is marked in the list')
    ok('Inbox' in rows[1][1], 'R2: most recently used first (after the pinned checklist)')
    shot(pg, 'window_list'); tap(pg, pg.locator('.fr-switch'), 300)
    row = pg.locator(TOP + ' tr[data-id]', has_text='Send me the pack').first
    tap(pg, row, 700)
    if narrow(pg):   # (R3b S8) 320 px: one tap opens the message in its own window, with a way back to the list
        ok(pg.evaluate("() => /^oe-msg-/.test(FR.wm.active.id) && !!FR.wm.active.el.querySelector('.oe-tbb-back') && FR.wm.active.el.querySelector('.oe-mbody').innerText.length > 40"), 'R3b S8: 320 px: one tap opens the message, readable, with a Back button')
    else:
        ok(pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .oe-prev').innerText.length > 40"), 'Outlook: a tap shows the message in the preview')
    tap(pg, pg.locator(TOP + ' .oe-tbb', has_text='Reply').first, 800); shot(pg, 'reply')
    tap(pg, pg.locator(TOP + ' .oe-tbb-send'), 800)
    ok('send' in solved(pg), '9 send by touch')
    task(pg, 'Inbox')
    for subj in ('Next thing', 'BRIDGE'):   # tap a message, tap it again: it opens in its own window (320 px: one tap)
        row = pg.locator(TOP + ' tr[data-id]', has_text=subj).first
        tap(pg, row, 700)
        if not narrow(pg): tap(pg, row, 700)
        task(pg, 'Inbox')
    ok(pg.evaluate("() => [...FR.wm.wins.keys()].filter(k => /^oe-msg-/.test(k)).length") == 1, 'P3: one message window at a time on a phone')
    tap(pg, pg.locator('.fr-switch'), 400)
    tops = lambda: pg.eval_on_selector_all('.fr-swlist .fr-swl-r', 'e => e.map(r => Math.round(r.getBoundingClientRect().top))')
    t0 = tops()
    tap(pg, pg.locator('.fr-swlist .fr-swl-r[data-wid^="oe-msg-"] .fr-swl-x'), 400)
    ok(tops() == t0 and pg.locator('.fr-swlist .fr-swl-r.gone').count() == 1 and not pg.evaluate("() => [...FR.wm.wins.keys()].some(k => /^oe-msg-/.test(k))"),
       'Q3: closing a window from the list leaves every row where it was (the closed one greyed)')
    tap(pg, pg.locator('.fr-switch'), 300)
    pg.wait_for_timeout(8000); closeall(pg)

    # ---- 10 frank
    chip(pg, "Rachel's email"); closeall(pg)
    chip(pg, 'Recycle Bin'); ex_tap(pg, 'boarding', 700)
    ok(pg.evaluate("() => !!document.querySelector('.fr-win:not(.fr-inactive) .np-ta.np-nowrap')"), 'P13: the ASCII boarding pass opens without wrapping')
    shot(pg, 'boarding')
    tap(pg, pg.locator(TOP + ' .np-wrapb'), 300)
    ok(pg.evaluate("() => !document.querySelector('.fr-win:not(.fr-inactive) .np-ta.np-nowrap')") and pg.locator(TOP + ' .np-wrapb').inner_text() == 'Wrap: on', 'Q9: the Wrap button wraps the text (no sideways swiping)')
    tap(pg, pg.locator(TOP + ' .np-wrapb'), 300)
    ok(pg.evaluate("() => !!document.querySelector('.fr-win:not(.fr-inactive) .np-ta.np-nowrap')"), 'Q9: and back to the original layout')
    closeall(pg)
    tap(pg, ck(pg).locator('.ck-sus', has_text='Drew'), 600); tap(pg, ck(pg).locator('.ck-conf-ok'), 300)
    tap(pg, ck(pg).locator('.ck-sus', has_text='Kristians'), 600); tap(pg, ck(pg).locator('.ck-conf-ok'), 500)
    ok('frank' in solved(pg), '10 frank by touch')
    pg.wait_for_timeout(4200); shot(pg, 'reveal')
    close_top(pg)
    pg.wait_for_selector('.fr-end', timeout=8000)
    b0 = pg.locator('.fr-end [data-a=again]').bounding_box()
    pg.touchscreen.tap(b0['x'] + b0['width'] / 2, b0['y'] + b0['height'] / 2); pg.wait_for_timeout(300)   # a stray tap just as it appears
    ok(pg.locator('.fr-dialog').count() == 0, 'Q2: a tap in the first moment of the end screen does nothing (no "Start over?")')
    pg.wait_for_timeout(1500)
    ok(pg.locator('.fr-end').count() == 1, 'ending screen')
    ok(topmost_is_visible(pg, '.fr-end-cta .pri') or (narrow(pg) and reachable(pg, pg.locator('.fr-end-cta .pri'))), 'ending: the main button is reachable' + (' (by a swipe on 320 px)' if narrow(pg) else ''))
    low = pg.evaluate("() => { const e = document.querySelector('.fr-end'), r = e.querySelector('[data-a=again]').getBoundingClientRect(); return innerHeight - (r.bottom - (e.scrollHeight - e.clientHeight - e.scrollTop)); }")
    ok(low >= 90, f'Q2: "Play again" never sits in the bottom strip where the taskbar was ({low:.0f} px above the bottom, fully scrolled)')
    shot(pg, 'ending')
    tap(pg, pg.locator('.fr-end [data-a=again]'), 700)
    ok(pg.locator('.fr-dialog .fr-dlg-btns button.default').inner_text() == 'Cancel', 'Q2: in "Start over?" Cancel is the default')
    dlg_btn(pg, 'Cancel')
    ok(pg.locator('.fr-end').count() == 1 and 'frank' in solved(pg), 'Q2: Cancel keeps the game')
    tap(pg, pg.locator('.fr-end [data-a=back]'), 400)

    ctx.close()


MUTE = "() => { FR.__bal = FR.__bal || FR.balloon; FR.balloon = (t, ...a) => /^T-/.test(t) ? FR.__bal(t, ...a) : null; FR.tips.clear(); }"   # only the test's own tips
TIPST = "() => FR.tips.state()"


def touch_hold(pg, x, y):
    cdp = pg.context.new_cdp_session(pg)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + 40, 'y': y}]})   # (moves: no long-press, no tap)
    return cdp


def touch_up(cdp):
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); cdp.detach()


def center(pg, sel):
    return pg.evaluate("s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.left, r.top, r.right, r.bottom]; }", sel)


def r3b_checks(p, b, devname):
    """round 3b (iPhone SE player): tips never under a finger / over a list, taps pass through a tip that just appeared,
    a fading tip still takes its tap, stale tips dropped, comment pop-ups inside the grid, checklist footer, one window
    per file / one Explorer, one-tap mail on 320 px, Start menu fits, leaderboard fits (S2-S9, S11, S12)"""
    dev = dict(p.devices[devname]); dev.pop('default_browser_type', None)
    PFX[0] = 'r3b_' + devname.replace(' ', '') + '_'
    print('== round 3b checks on', devname, flush=True)
    ctx = b.new_context(**dev); ctx.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and '404' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL + '?dev=1&solve=login'); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate(MUTE)
    nwin = lambda: pg.evaluate("() => FR.wm.wins.size")

    # S7: the same file twice from the checklist → one window; a folder chip twice (after going elsewhere) → one Explorer
    tap(pg, ck(pg).locator('.ck-file small').first, 900)
    n1 = nwin(); ck(pg); tap(pg, ck(pg).locator('.ck-file small').first, 900)
    ok(nwin() == n1 and pg.evaluate("() => FR.wm.active.id") == 'xl-bud_v3', 'R3b S7: "open" on a file that is already open brings its window back (no second window)')
    chip(pg, 'FY27 Budget folder'); pg.evaluate("() => FR.apps.explorer('mydocs')"); pg.wait_for_timeout(400)
    chip(pg, 'FY27 Budget folder')
    exs = pg.evaluate("() => [...FR.wm.wins.values()].filter(w => w.el.classList.contains('ex-win')).length")
    ok(exs == 1 and 'FY27 Budget' in pg.evaluate("() => FR.wm.active.el.querySelector('.fr-title').textContent"), f'R3b S7: phones reuse one Explorer window ({exs} open)')
    tap(pg, pg.locator(TOP + ' .ex-b', has_text='Back').first if pg.locator(TOP + ' .ex-b', has_text='Back').count() else pg.locator(TOP + ' .title-bar-controls button[aria-label=Close]').first, 500)
    closeall(pg)

    # S6: the checklist list ends clear of its footer; the footer is one compact row
    ckl = ck(pg)
    six = pg.evaluate("""() => { const w = FR.wm.wins.get('checklist').el, l = w.querySelector('.ck-list'), f = w.querySelector('.ck-foot'); l.scrollTop = 1e6;
      const last = [...l.querySelectorAll('.ck-item')].pop().getBoundingClientRect(), fr = f.getBoundingClientRect(), m = f.querySelector('.ck-meta');
      return [fr.top - last.bottom, fr.height, m.scrollWidth <= m.clientWidth + 1]; }""")
    ok(six[0] >= 20 and six[1] <= 60 and six[2], f'R3b S6/S16: scrolled to the end, the last checklist row sits clear of the footer; footer one compact row, nothing cut {six}')
    pg.evaluate("() => { FR.wm.wins.get('checklist').el.querySelector('.ck-list').scrollTop = 0; }")

    # an Excel window with sheet tabs (the approved budget) for the tip checks
    tap(pg, ck(pg).locator('.ck-file small').nth(3), 900)
    pg.evaluate(MUTE); pg.wait_for_timeout(300)
    # S2: a tip never appears while a finger is on the screen, nor within 2 s of the last touch
    g = center(pg, TOP + ' .xl-grid td[data-r="6"][data-c="3"]')
    cdp = touch_hold(pg, g[0], g[1])
    pg.evaluate("() => FR.balloon('T-under', 'queued under a finger')"); pg.wait_for_timeout(2500)
    ok(pg.locator('.fr-balloon').count() == 0, 'R3b S2: no tip appears while a finger is down')
    touch_up(cdp); pg.wait_for_timeout(1000)
    ok(pg.locator('.fr-balloon').count() == 0, 'R3b S2: nor in the first second after the finger lifts')
    pg.wait_for_selector('.fr-balloon:has-text("queued under a finger")', timeout=4000)
    ok(True, 'R3b S2: it shows once the screen has been quiet for a moment')
    pg.wait_for_timeout(700); tap(pg, pg.locator('.fr-balloon .fr-balloon-x'), 300)
    # S2: while the player keeps tapping, the tip waits (debounce), then comes ~2 s after the last tap
    pg.evaluate("() => FR.balloon('T-busy', 'the player is busy')")
    seen = False
    for i in range(6):
        c = center(pg, TOP + f' .xl-grid td[data-r="{4 + i}"][data-c="4"]'); pg.touchscreen.tap(c[0], c[1]); pg.wait_for_timeout(700)
        seen = seen or pg.locator('.fr-balloon').count() > 0
    t_last = pg.evaluate('() => Date.now()')
    pg.wait_for_selector('.fr-balloon:has-text("the player is busy")', timeout=5000)
    gap = pg.evaluate(f'() => Date.now() - {t_last}')
    ok(not seen and gap >= 1200, f'R3b S2: no tip while the player is tapping; it came {gap} ms after the last tap')
    pg.wait_for_timeout(700); tap(pg, pg.locator('.fr-balloon .fr-balloon-x'), 300)
    # S2: a tap that lands just as a tip appears goes to what's under it (a sheet tab here), and the tip stays
    pg.wait_for_timeout(1200)
    tabsel = TOP + ' .xl-tab:not(.xl-tab-on)'
    tb = center(pg, tabsel); tabname = pg.locator(tabsel).first.inner_text()
    pg.evaluate("() => FR.balloon('T-pass', 'appears under the finger')")
    pg.wait_for_function("() => !!document.querySelector('.fr-balloon')", timeout=6000, polling=10)
    br = center(pg, '.fr-balloon')
    pg.touchscreen.tap(tb[0], tb[1]); pg.wait_for_timeout(300)
    on = pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-tab-on').innerText")
    st = pg.evaluate(TIPST)
    under = br[3] <= tb[1] <= br[5]
    ok(on == tabname and st['cur'] and st['cur']['title'] == 'T-pass', f'R3b S2: a tap in the first 0.4 s of a tip goes through to the sheet tab under it ({tabname}; tab under the tip: {under}), the tip stays')
    pg.wait_for_timeout(700); tap(pg, pg.locator('.fr-balloon .fr-balloon-x'), 300)

    # S4: a fading tip still takes the tap aimed at its ✕ (Fit underneath is not toggled); no fade within 1.5 s of a touch
    pg.evaluate("() => Object.assign(FR.tips.TIP, { MIN: 1500, MAX: 1500, BASE: 0 })"); pg.wait_for_timeout(1500)
    fit0 = pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-zoomb').textContent")
    pg.evaluate("() => FR.balloon('T-leave', 'about to fade')")
    pg.wait_for_function("() => { const s = FR.tips.state(); return s.cur && s.cur.state === 'leaving'; }", timeout=9000, polling=15)
    x = center(pg, '.fr-balloon .fr-balloon-x'); pg.touchscreen.tap(x[0], x[1]); pg.wait_for_timeout(400)
    log = [e[1] for e in pg.evaluate(TIPST)['log']]
    fit1 = pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-zoomb').textContent")
    ok('gone closed' in log and 'gone timeout' not in log[-3:] and fit0 == fit1, f'R3b S4: a tap on the ✕ of a tip that is fading closes the tip, nothing under it is pressed ({fit0} → {fit1})')
    pg.wait_for_timeout(1500)
    pg.evaluate("() => FR.balloon('T-hold', 'a finger touched it')")
    pg.wait_for_function("() => { const s = FR.tips.state(); return s.cur && s.cur.state === 'shown'; }", timeout=6000, polling=20)
    bb = center(pg, '.fr-balloon .fr-balloon-b'); cdp = touch_hold(pg, bb[0], bb[1]); pg.wait_for_timeout(200); touch_up(cdp)
    pg.wait_for_timeout(1250)
    st = pg.evaluate(TIPST)
    ok(st['cur'] and st['cur']['title'] == 'T-hold' and st['cur']['state'] == 'shown', f'R3b S4: its time is up, but it does not fade within 1.5 s of a touch {st["cur"]} {[e[1] for e in st["log"][-6:]]}')
    pg.wait_for_function("() => !document.querySelector('.fr-balloon')", timeout=8000, polling=20)
    pg.touchscreen.tap(x[0], x[1]); pg.wait_for_timeout(300)
    ok(pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-zoomb').textContent") == fit0, 'R3b S4: a tap where a tip just faded out is swallowed (Fit under its ✕ not toggled)')
    pg.evaluate("() => Object.assign(FR.tips.TIP, { MIN: 5000, MAX: 12000, BASE: 2500 })")

    # S3: no tip while the window list is open; the tap on its last row switches window; the tip comes afterwards
    pg.evaluate("() => { FR.apps.calc(); FR.apps.notepad(null); }"); pg.wait_for_timeout(1500)
    tap(pg, pg.locator('.fr-switch'), 400)
    pg.evaluate("() => FR.balloon('T-list', 'waits for the window list')"); pg.wait_for_timeout(3000)
    ok(pg.locator('.fr-balloon').count() == 0, 'R3b S3: no tip while the window list is open')
    last = pg.locator('.fr-swlist .fr-swl-r[data-wid]').last; wid = last.get_attribute('data-wid')
    tap(pg, last, 500)
    ok(pg.locator('.fr-swlist').count() == 0 and pg.evaluate("() => FR.wm.active.id") == wid, f'R3b S3: the tap on the last row of the window list switches to it ({wid})')
    pg.wait_for_selector('.fr-balloon:has-text("waits for the window list")', timeout=5000); ok(True, 'R3b S3: the tip comes once the list is gone')
    pg.wait_for_timeout(700); tap(pg, pg.locator('.fr-balloon .fr-balloon-x'), 300)
    # a message box that comes up by itself over a tip: the tip steps aside and comes back after
    pg.wait_for_timeout(1200); pg.evaluate("() => FR.balloon('T-susp', 'steps aside')")
    pg.wait_for_function("() => { const s = FR.tips.state(); return s.cur && s.cur.state === 'shown'; }", timeout=6000, polling=20)
    pg.evaluate("() => { void FR.dialog({ title: 'Test', message: 'a message box' }); }"); pg.wait_for_timeout(500)
    st = pg.evaluate(TIPST)
    ok(pg.locator('.fr-balloon').count() == 0 and 'T-susp' in st['queued'], f'R3b S3: a message box coming up puts the tip back in the queue {st["queued"]}')
    dlg_btn(pg, 'OK')
    pg.wait_for_selector('.fr-balloon:has-text("steps aside")', timeout=5000); ok(True, 'R3b S3: and it comes back once the message box is gone')
    pg.wait_for_timeout(700); tap(pg, pg.locator('.fr-balloon .fr-balloon-x'), 300)
    # S9: a tip that no longer applies when its turn comes is dropped (the "Stuck on …" nudge for a solved item)
    tap(pg, pg.locator('.fr-switch'), 400)
    pg.evaluate("() => { window.__still = true; FR.balloon('T-stale', 'no longer true', null, { still: () => window.__still }); window.__still = false; }")
    tap(pg, pg.locator('.fr-switch'), 400); pg.wait_for_timeout(3500)
    ok(pg.locator('.fr-balloon').count() == 0 and any('stale T-stale' in e[1] for e in pg.evaluate(TIPST)['log']), 'R3b S9: a tip that no longer applies when its turn comes is dropped')
    pg.evaluate("() => { const w = FR.wm.wins.get('xl-bud_v5ut'); if (w) { w.restore(); w.focus(); } }"); pg.wait_for_timeout(400)

    # S5: a note on a cell near the bottom of the grid opens above it, inside the grid (not under the sheet tabs)
    closeall(pg); pg.evaluate("() => FR.openFile('bridge')"); pg.wait_for_timeout(900)
    pg.evaluate("""() => { const w = FR.wm.active.el, s = w.querySelector('.xl-scroll'), td = w.querySelector('td[data-r="10"][data-c="2"]');
      s.scrollTop = Math.max(0, td.offsetTop + td.offsetHeight - s.clientHeight + 3); }"""); pg.wait_for_timeout(300)
    tap(pg, pg.locator(TOP + ' .xl-grid td[data-r="10"][data-c="2"]'), 400)
    s5 = pg.evaluate("""() => { const w = FR.wm.active.el, c = w.querySelector('.xl-cmtip .xl-cm'), s = w.querySelector('.xl-scroll').getBoundingClientRect(), td = w.querySelector('td[data-r="10"][data-c="2"]').getBoundingClientRect(), t = w.querySelector('.xl-tabbar').getBoundingClientRect();
      if (!c) return null; const r = c.getBoundingClientRect(); return [r.top >= s.top - 1 && r.bottom <= s.bottom + 1 && r.bottom <= t.top + 1, r.left >= s.left - 1 && r.right <= s.right + 1, /residual/.test(c.innerText), r.bottom <= td.top + 1]; }""")
    ok(bool(s5) and s5[0] and s5[1] and s5[2], f'R3b S5: a note near the bottom of the grid shows whole, above the cell, clear of the sheet tabs {s5}')
    closeall(pg)

    # S8: 320 px: one tap on a message opens it (full height, a Back button); wider phones keep the preview
    tap(pg, pg.locator('.fr-startbtn'), 500); tap(pg, pg.locator('.fr-sm-item', has_text='E-mail').first, 1200)
    pg.evaluate(MUTE)
    tap(pg, pg.locator(TOP + ' tr[data-id]').nth(1), 800)
    if narrow(pg):
        ok(pg.evaluate("() => /^oe-msg-/.test(FR.wm.active.id) && FR.wm.active.max"), 'R3b S8: 320 px: one tap opens the message full screen')
        tap(pg, pg.locator(TOP + ' .oe-tbb-back'), 600)
        ok(pg.evaluate("() => FR.wm.active && FR.wm.active.id === 'outlook'"), 'R3b S8: its Back button goes back to the Inbox')
    else:
        ok(pg.evaluate("() => FR.wm.active.id === 'outlook'"), 'R3b S8: wider phones: one tap previews (a second tap opens)')
    closeall(pg)

    # S11: the Start menu fits above the taskbar (with the leaderboard shortcut in it): All Programs and Log Off on screen
    pg.evaluate("() => { FR.score.__av = FR.score.available; FR.score.available = () => true; }")
    tap(pg, pg.locator('.fr-startbtn'), 500)
    ap = pg.evaluate("""() => { const m = document.querySelector('.fr-start'), tb = document.querySelector('.fr-taskbar').getBoundingClientRect();
      const it = t => [...m.querySelectorAll('.fr-sm-item')].find(e => e.textContent.includes(t)).getBoundingClientRect();
      const a = it('All Programs'), l = it('Log Off'); return [a.bottom <= tb.top && l.bottom <= tb.top && a.top >= 0, m.scrollHeight <= m.clientHeight + 1]; }""")
    ok(ap[0], f'R3b S11: Start menu: All Programs and Log Off above the taskbar {ap}')
    tap(pg, pg.locator('.fr-startbtn'), 400)

    # S12: the leaderboard page fits the phone's width (no sideways panning); ≤ 360 px drops the minor columns
    pg.evaluate("""() => { FR.score.fetch = () => Promise.resolve({ players: 4, me: { rank: 2, name: 'fpaemy3', score: 10000, finished: true, solved: 10, hints: 0, wrong: 0, timeMs: 1740000, inTop: true },
      top: [{ rank: 1, name: 'Kristians_Busars_Fan_Club_Riga_2026', score: 10000, finished: true, solved: 10, hints: 0, wrong: 0, timeMs: 1500000 }, { rank: 2, name: 'fpaemy3', score: 10000, finished: true, solved: 10, hints: 0, wrong: 0, timeMs: 1740000 },
        { rank: 3, name: 'diane.k', score: 6000, finished: false, solved: 6, hints: 1, wrong: 2, timeMs: 1260000 }] }); FR.score.open(); }"""); pg.wait_for_timeout(1500)
    s12 = pg.evaluate("""() => { const p = document.querySelector('.fr-win:not(.fr-inactive) .ie-page'), t = p.querySelector('.st-t'); if (!t) return null;
      const r = t.getBoundingClientRect(), pr = p.getBoundingClientRect(), wrong = t.querySelector('th:nth-child(6)');
      return [p.scrollWidth <= p.clientWidth + 1, r.right <= pr.right + 1 && r.left >= pr.left - 1, getComputedStyle(wrong).display]; }""")
    ok(bool(s12) and s12[0] and s12[1] and (s12[2] == 'none' or not narrow(pg)), f'R3b S12: leaderboard fits the width, no sideways swipe (≤ 360 px: fewer columns) {s12}')
    pg.screenshot(path=f'{OUT}/mobile_{PFX[0]}leaderboard.png')
    pg.evaluate("() => { FR.score.available = FR.score.__av; }")
    closeall(pg)

    # S1: what the player typed is still in the file after a reload (FR.state.xl)
    pg.evaluate("() => FR.openFile('cash13')"); pg.wait_for_timeout(1000); pg.evaluate(MUTE)
    xl_type(pg, 13, 1, '196')
    pg.reload(); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate("() => FR.openFile('cash13')"); pg.wait_for_timeout(1000)
    v = pg.evaluate("() => { const t = document.querySelector('.fr-win:not(.fr-inactive) .xl-grid td[data-r=\"13\"][data-c=\"1\"]').cloneNode(true); t.querySelectorAll('.xl-rp').forEach(x => x.remove()); return t.textContent.trim(); }")
    ok(v == '196', f'R3b S1: a cell typed on the phone is still there after a reload ({v})')
    ctx.close()


os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
    b = p.chromium.launch(**kw)
    for devname in DEVICES: r3b_checks(p, b, devname)
    if os.environ.get('R3B_ONLY'):   # (developers: only the round-3b checks)
        print('\n'.join(logs) or 'no console errors'); print('ALL PASS' if not fails[0] and not logs else f'{fails[0]} FAILED'); sys.exit(1 if fails[0] or logs else 0)
    for devname in DEVICES: playthrough(p, b, devname)

    # ---- landscape: the same phones turned sideways
    for devname in DEVICES:
        dev = dict(p.devices[devname]); dev.pop('default_browser_type', None)
        vw, vh = dev['viewport']['width'], dev['viewport']['height']
        ctx2 = b.new_context(**dict(dev, viewport={'width': max(vw, vh), 'height': min(vw, vh)}))
        ctx2.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
        p2 = ctx2.new_page(); p2.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
        p2.goto(URL + '?dev=1&solve=unlock'); p2.wait_for_selector('.fr-desktop'); p2.wait_for_timeout(800)
        PFX[0] = 'landscape_' + devname.replace(' ', '') + '_'
        ok(p2.evaluate('() => FR.mobile'), 'landscape phone is mobile too')
        tap(p2, p2.locator('.fr-win .ck-item.open .ck-chip', has_text='Budget_FY27_BOARD.xls').first, 1200)
        rows = p2.evaluate("() => { const s = document.querySelector('.fr-win:not(.fr-inactive) .xl-scroll'); return Math.floor((s.getBoundingClientRect().height - 22) / 20.4); }")
        ok(rows >= (7 if min(vw, vh) < 360 else 11), f'P5: landscape Excel shows {rows} rows (slim chrome, no menu bar)')   # SE: 320 px high (R2-D16)
        p2.screenshot(path=f'{OUT}/mobile_{PFX[0]}excel.png')
        closeall(p2)
        # Q1: Folder Options sideways, by touch: OK pinned, the list scrolls by a swipe
        tap(p2, p2.locator('.fr-startbtn'), 500)
        tap(p2, p2.locator('.fr-sm-item', has_text='My Documents').first, 900)
        tap(p2, p2.locator(TOP + ' .fr-mi', has_text='Tools'), 300)
        tap(p2, p2.locator('.fr-menu-item', has_text='Folder Options'), 500)
        tap(p2, p2.locator('.sh-sheet [role=tab]', has_text='View'), 300)
        ok(topmost_is_visible(p2, '.sh-sheet .sh-ok') and topmost_is_visible(p2, '.sh-sheet .sh-cancel'), 'Q1: landscape Folder Options: OK / Cancel on screen')
        tap(p2, p2.locator('.sh-sheet label', has_text='Show hidden files and folders').last, 200, 'Show hidden files')
        ok(p2.evaluate("() => document.querySelector('.sh-sheetwin .sh-panes').scrollTop") > 0 and topmost_is_visible(p2, '.sh-sheet .sh-ok'), 'Q1: landscape: the list scrolled by finger to the option, OK still on screen')
        p2.screenshot(path=f'{OUT}/mobile_{PFX[0]}folder_options.png')
        footer_clear(p2, 'landscape Folder Options (View)')
        tap(p2, p2.locator('.sh-sheet .sh-cancel'), 500)
        closeall(p2)
        # Q6: Outlook sideways: a message gets most of the height
        tap(p2, p2.locator('.fr-startbtn'), 500)
        tap(p2, p2.locator('.fr-sm-item', has_text='E-mail').first, 1200)
        row = p2.locator(TOP + ' tr[data-id]', has_text='the REAL version').first
        if not row.count(): row = p2.locator(TOP + ' tr[data-id]').first
        tap(p2, row, 500); tap(p2, row, 900)
        frac = p2.evaluate("() => { const b = document.querySelector('.fr-win:not(.fr-inactive) .oe-mbody'); return b ? b.getBoundingClientRect().height / innerHeight : 0; }")
        ok(frac >= (0.5 if min(vw, vh) < 360 else 0.55), f'Q6: landscape Outlook message: the text gets {frac:.0%} of the height')
        p2.screenshot(path=f'{OUT}/mobile_{PFX[0]}outlook_msg.png')
        tap(p2, p2.locator('.fr-startbtn'), 500)
        ok(p2.evaluate("() => { const m = document.querySelector('.fr-start'); const r = m.getBoundingClientRect(); return r.top >= 0 && m.scrollHeight >= m.clientHeight; }"), 'landscape Start menu fits (scrolls)')
        p2.screenshot(path=f'{OUT}/mobile_{PFX[0]}start.png')
        ctx2.close()

    # ---- small phone (iPhone SE): the keyboard-sized screen still shows the checklist answer box
    se = dict(p.devices['iPhone SE']); se.pop('default_browser_type', None)
    ctx3 = b.new_context(**se); p3 = ctx3.new_page(); p3.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    p3.goto(URL + '?dev=1&solve=unlock'); p3.wait_for_selector('.fr-desktop'); p3.wait_for_timeout(800)
    PFX[0] = 'se_'
    tap(p3, p3.locator('.fr-win .ck-item.open .ck-ans input'), 700)   # (after the focus handler's own checks)
    p3.evaluate('() => FR.viewportFit(innerHeight - 260, 0)'); p3.wait_for_timeout(300)   # what the soft keyboard does
    ok(p3.evaluate("() => { const i = document.activeElement, r = i.getBoundingClientRect(); return i.tagName === 'INPUT' && r.bottom <= innerHeight - 260 + 1 && r.top >= 0; }"), 'soft keyboard up: the answer box moves above it')
    p3.screenshot(path=f'{OUT}/mobile_se_keyboard.png')
    p3.evaluate('() => FR.viewportFit(innerHeight, 0)')
    ctx3.close()
    b.close()

print('\n'.join(logs) or 'no console errors')
print('ALL PASS' if not fails[0] and not logs else f'{fails[0]} FAILED')
sys.exit(1 if fails[0] or logs else 0)
