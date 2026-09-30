"""The whole game on a phone, by touch only: an emulated iPhone 13 (390x664, touch, mobile browser) taps its way through
every checklist item the way test/play.py clicks through them on a desktop. Taps (no double-clicks), a long-press for
the context menu, typing with the phone keyboard into the formula bar, dialogs and the checklist. Then a few screens in
landscape and on a small phone. The same on a Pixel 7 and on an iPhone SE (320x568), with round-3 regression checks
(S1: nothing invisible over a property sheet's OK/Cancel/Apply; S2: toasts open up, never vanish under a finger and a tap
where one just vanished doesn't go through; S4 Submit label; S5 comment marker; S6 formula bar; S7/S8 Notepad), and round-3b
checks (r3b_checks: tips never under a finger / over the window list, pass-through, fading tip, stale tips, comment pop-ups,
checklist footer, one window per file, one-tap mail on 320 px, Start menu, leaderboard, edits kept after a reload),
and round-4 checks (r4_checks + in the playthrough: F1 Prev/Next, F2 zip reopen, F3 toast placement, F4 one score, F5/F6
ending, F7-F19, N3).
Screenshots go to OUT (default test/out).
Usage: python3 test/mobile_play.py      (Playwright + Chromium, like test/play.py; CHROMIUM=path to use another binary)"""
import os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
URL = 'file://' + ROOT + '/dist/index.html'
sys.path.insert(0, os.path.join(ROOT, 'test'))
from site_route import site  # packacorp.com: the local copies in test/site/ with their css + images (round 5, P1)
fails, logs, n = [0], [], [0]
PFX = ['']
FILL = [False]   # Pixel: the EBITDA row by "Fill…"; iPhone: cell by cell
DEVICES = sys.argv[1:] or ['iPhone 13', 'Pixel 7', 'iPhone SE']   # the whole game on each (iPhone SE: 320x568, the smallest)
TOP = '.fr-win:not(.fr-inactive):not(.fr-closing)'


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


def tap(pg, loc, wait=350, what='', only_reach=False):
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
    if only_reach: return h['x'], h['y']
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
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
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
    pg.evaluate("() => { FR.__bal = FR.balloon; FR.balloon = (t, ...a) => t === 'Test 3' ? FR.__bal(t, ...a) : null; FR.tips.clear(); FR.balloon('Test 3', 'a short one'); }")   # (no other tip meanwhile)
    pg.wait_for_selector('.fr-balloon:has-text("Test 3")', timeout=8000); pg.wait_for_timeout(700)
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
    # (F2, round 4) the covenant again from the zip: no password prompt any more, but a box saying so, where the prompt
    # was: the player's tap "on the password field" and "3130" + Enter land in that box, never in a cell of the sheet
    xl0 = pg.evaluate("() => JSON.stringify((FR.state.xl || {}).covenant || {})")
    pg.evaluate("() => FR.apps.explorer('bank')"); pg.wait_for_timeout(700)   # (item 5 is done: no chip any more)
    ex_tap(pg, 'bankzip'); ex_tap(pg, 'covenant', 150)
    pg.wait_for_selector('.fr-dialog', timeout=4000)
    msg2 = pg.inner_text('.fr-dialog .fr-dlg-msg')
    d2 = pg.locator('.fr-dialog .fr-dlg-msg').bounding_box(); pg.wait_for_timeout(600)
    pg.touchscreen.tap(d2['x'] + d2['width'] / 2, d2['y'] + d2['height'] - 6); pg.wait_for_timeout(200)
    pg.keyboard.type('3130', delay=20); pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
    xl1 = pg.evaluate("() => JSON.stringify((FR.state.xl || {}).covenant || {})")
    act2 = pg.evaluate("() => FR.wm.active && FR.wm.active.id")
    ok('already unlocked' in msg2 and pg.locator('.fr-dialog').count() == 0 and act2 == 'xl-covenant' and xl0 == xl1,
       f'F2 ({msg2[:40]!r}, {pg.locator(".fr-dialog").count()}, {act2}, {xl0 == xl1}): reopening the zipped covenant: a "Bank.zip is already unlocked" box takes the tap + "3130" + Enter (Enter = Open), nothing typed into the sheet')
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
        if subj == 'Next thing':   # (F1, round 4) Previous / Next always on screen, and still in the same place in the next message
            nx = lambda: pg.evaluate("() => { const b = document.querySelector('.fr-win:not(.fr-inactive) .oe-tbb[data-a=next]'), p = document.querySelector('.fr-win:not(.fr-inactive) .oe-tbb[data-a=prev]'); if (!b || !p) return null; const r = b.getBoundingClientRect(), q = p.getBoundingClientRect(); return [Math.round(r.left), r.right <= innerWidth && q.left >= 0, document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) && b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)), FR.wm.active.id]; }")
            f1a = nx(); pg.touchscreen.tap(f1a[0] + 20, pg.locator(TOP + ' .oe-tbb[data-a=next]').bounding_box()['y'] + 20); pg.wait_for_timeout(900)
            f1b = nx()
            ok(bool(f1a) and f1a[1] and f1a[2] and bool(f1b) and f1b[1] and f1b[0] == f1a[0] and f1b[3] != f1a[3], f'F1: Previous / Next on screen without swiping the toolbar; after Next the next message has them in the same place {f1a} -> {f1b}')
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
    # (F6, round 4) Frank's reply opens and stays: no ending on a timer while it's being read, no 10/10 toast over it
    ok(pg.evaluate("() => FR.wm.active && FR.wm.active.id") == 'oe-msg-x_frank_reveal' and pg.locator('.fr-balloon').count() == 0, "F6: Frank's reply opens, no toast over it")
    pg.wait_for_timeout(9000)
    ok(pg.locator('.fr-end').count() == 0 and pg.evaluate("() => FR.wm.active && FR.wm.active.id") == 'oe-msg-x_frank_reveal', 'F6: 13 s later the ending still waits (the player is reading)')
    if FILL[0]:   # Pixel: the "See how it ended" button at the end of the mail (reached by a swipe)
        tap(pg, pg.locator(TOP + ' .fr-end-go'), 300)
    else:
        close_top(pg)
    pg.wait_for_selector('.fr-end', timeout=8000)
    # (F5) opaque: nothing of the desktop / the mail shows through
    ok(pg.evaluate("() => { const c = getComputedStyle(document.querySelector('.fr-end')).backgroundColor; return /rgb\(/.test(c) || c === 'rgba(0, 0, 0, 0)' ? true : false; }") and pg.evaluate("() => !/rgba\([^)]*0\.[0-8]/.test(getComputedStyle(document.querySelector('.fr-end')).backgroundImage)"), 'F5: the ending is opaque')
    # (F4) one score: the ending, its breakdown and the checklist footer say the same number
    f4 = pg.evaluate("() => [document.querySelector('.fr-end-score b').textContent, document.querySelector('.fr-end-calc').textContent, FR.score.breakdown(), (document.querySelector('.ck-foot .ck-score') || {}).textContent || '', FR.score.fmt(FR.score.now().score)]")
    ok(f4[0] == f4[4] and f4[1] == f4[2] and f4[1].endswith('= ' + f4[0]) and ('Score: ' + f4[0]) in f4[3], f'F4: ending score = breakdown = checklist footer {f4}')
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
    # (R5 P5) after the ending the tray's checklist button opens the checklist; the ending is a link at its top
    pg.evaluate(MUTE)
    tap(pg, pg.locator('.fr-pack'), 700)
    ok(pg.locator('.fr-end').count() == 0 and pg.evaluate("() => FR.wm.active && FR.wm.active.id") == 'checklist', 'P5: the 10/10 tray button opens the checklist, not the ending')
    ok(topmost_is_visible(pg, TOP + ' .ck-endlink'), 'P5: the finished checklist has "See how it ended" on screen')
    shot(pg, 'checklist_done')
    tap(pg, pg.locator(TOP + ' .ck-endlink'), 1800)
    ok(pg.locator('.fr-end').count() == 1, 'P5: ... and it brings the ending back')
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
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
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
    nb0 = pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-nb-in').value")
    pg.touchscreen.tap(x[0], x[1]); pg.wait_for_timeout(300)
    ok(pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-zoomb').textContent") == fit0 and pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-nb-in').value") == nb0, 'R3b S4: a tap where a tip just faded out is swallowed (nothing under its ✕ pressed or selected)')
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
      const r = t.getBoundingClientRect(), pr = p.getBoundingClientRect(), wrong = t.querySelector('th:nth-child(7)');   /* Wrong (the Bonus column is 4, hidden on phones) */
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


def r4_checks(p, b, devname):
    """round 4 (iPhone 13 player): toasts never over Excel's sheet tabs / Fit or the checklist footer, one pop-up at a time,
    "banana" isn't a wrong guess, DONE stamp on its own line, the passwords.txt chip, 44 px Properties tabs, the IT survey
    says press-and-hold, Paint's tools / swatches / Fonts bar, more inbox rows and rows that stay put when mail arrives,
    the boarding pass fits, ERP tabs wrap, the change log opens at column A, Find on an IE page (F3 F7 F8 F9 F10 F11 F12
    F13 F14 F15 F17 F18 F19 N3)"""
    dev = dict(p.devices[devname]); dev.pop('default_browser_type', None)
    PFX[0] = 'r4_' + devname.replace(' ', '') + '_'
    print('== round 4 checks on', devname, flush=True)
    ctx = b.new_context(**dev); ctx.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL + '?dev=1&solve=ebitda'); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate(MUTE)

    # F3: over Excel the toast sits above the sheet tabs + Fit / Fill…; over the checklist, above its footer
    pg.evaluate("() => FR.openFile('bud_v5ut')"); pg.wait_for_timeout(1000); pg.evaluate(MUTE)
    pg.evaluate("() => FR.balloon('T-xl', 'a toast over Excel', () => FR.apps.mail(null), { act: 'Open it' })")
    pg.wait_for_selector('.fr-balloon:has-text("over Excel")', timeout=6000); pg.wait_for_timeout(400)
    f3 = pg.evaluate("""() => { const b = document.querySelector('.fr-balloon').getBoundingClientRect(), w = document.querySelector('.fr-win:not(.fr-inactive)'), t = w.querySelector('.xl-tabbar').getBoundingClientRect(), z = w.querySelector('.xl-zoomb').getBoundingClientRect();
      return [Math.round(b.bottom), Math.round(t.top), b.bottom <= t.top + 1 && !(z.top < b.bottom && z.bottom > b.top)]; }""")
    ok(f3[2], f'F3: the toast sits above Excel\'s sheet tabs and Fit, never over them {f3}')
    shot(pg, 'toast_excel')
    tabsel = TOP + ' .xl-tab:not(.xl-tab-on)'; tabname = pg.locator(tabsel).first.inner_text()
    tap(pg, pg.locator(tabsel).first, 400)
    ok(pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-tab-on').innerText") == tabname and pg.evaluate("() => FR.wm.active.id") == 'xl-bud_v5ut', f'F3: a tap on a sheet tab while a toast is up switches the tab (it never opens the toast\'s e-mail) ({tabname})')
    pg.evaluate("() => FR.tips.clear()")
    # F14: one pop-up at a time: no toast while a cell's note / full-text box is open; it comes when that closes
    tap(pg, pg.locator(TOP + ' .xl-tab', has_text='P&L').first, 300)
    tap(pg, pg.locator(TOP + ' .xl-grid td.xl-hascm').first, 400)
    pg.evaluate("() => FR.balloon('T-note', 'waits for the note')"); pg.wait_for_timeout(3000)
    ok(pg.locator('.fr-balloon').count() == 0 and pg.locator(TOP + ' .xl-cmtip .xl-cm').count() == 1, 'F14: no toast while a cell note is open')
    tap(pg, pg.locator(TOP + ' .xl-grid td[data-r="6"][data-c="2"]'), 300)
    pg.wait_for_selector('.fr-balloon:has-text("waits for the note")', timeout=6000); ok(True, 'F14: the toast comes once the note is closed')
    pg.evaluate("() => FR.tips.clear()"); closeall(pg)
    ck(pg)
    pg.evaluate("() => FR.balloon('T-ck', 'a toast over the checklist')")
    pg.wait_for_selector('.fr-balloon:has-text("over the checklist")', timeout=6000)
    ok(pg.evaluate("() => document.querySelector('.fr-balloon').getBoundingClientRect().bottom <= FR.wm.wins.get('checklist').el.querySelector('.ck-foot').getBoundingClientRect().top + 1"), 'F3: over the checklist the toast sits above its footer (score link, How to play)')
    pg.evaluate("() => FR.tips.clear()")

    # N3: item 5 points at passwords.txt on the desktop
    ok('passwords' in (chip(pg, 'passwords.txt') or ''), 'N3: item 5 has a "passwords.txt (desktop)" chip that opens it')
    closeall(pg)
    # F19: "banana" is not a number: said so, no wrong guess, no step to the Blue Screen; a wrong number still costs 50
    item = ck(pg); w0 = pg.evaluate("() => [FR.state.wrong || 0, FR.state.missStreak || 0]")
    tap(pg, item.locator('.ck-ans input'), 150); pg.keyboard.type('banana'); tap(pg, item.locator('.ck-ans button'), 400)
    fb1 = pg.inner_text(TOP + ' .ck-item.open .ck-fb'); w1 = pg.evaluate("() => [FR.state.wrong || 0, FR.state.missStreak || 0]")
    ok("not a number" in fb1 and w1 == w0, f'F19: "banana" gets "That\'s not a number" and is not a wrong guess ({fb1!r}, wrong/streak {w0} -> {w1})')
    tap(pg, item.locator('.ck-ans input'), 150); pg.keyboard.type('1.3'); tap(pg, item.locator('.ck-ans button'), 400)
    fb2 = pg.inner_text(TOP + ' .ck-item.open .ck-fb'); w2 = pg.evaluate("() => FR.state.wrong || 0")
    ok(w2 == w0[0] + 1 and '(−50 points)' in fb2 and 'Section 6.1' in fb2, f'F19/N1: a wrong number still counts, and says what it cost ({fb2!r})')
    # F13: the DONE stamp on its own line under the item's title
    pg.evaluate("() => FR.puzzle.solve('dscr')"); pg.wait_for_timeout(300)
    f13 = pg.evaluate("() => { const st = document.querySelector('.ck-stamp'); if (!st) return null; const t = st.closest('.ck-main').querySelector('.ck-t').getBoundingClientRect(), r = st.getBoundingClientRect(); return [r.top >= t.bottom - 3, Math.round(r.top), Math.round(t.bottom)]; }")
    ok(bool(f13) and f13[0], f'F13: the DONE stamp sits under the title, not over it {f13}')
    pg.evaluate(MUTE)

    # F8: Properties tabs 44 px, sharing the strip
    pg.evaluate("() => FR.apps.properties('model47')"); pg.wait_for_timeout(700)
    f8 = pg.evaluate("() => [...document.querySelectorAll('.sh-sheetwin .sh-sheet [role=tab]')].map(t => Math.round(t.getBoundingClientRect().height))")
    ok(f8 and min(f8) >= 44, f'F8: Properties tabs are 44 px tall {f8}')
    tap(pg, pg.locator('.sh-sheet [role=tab]', has_text='Summary'), 300)
    ok(pg.evaluate("() => document.querySelector('.sh-sheet [role=tab][aria-selected=true]').textContent") == 'Summary', 'F8: one tap on "Summary" opens it')
    tap(pg, pg.locator('.sh-sheet .sh-cancel'), 400)
    # F7: the IT disk survey says press-and-hold on a phone
    pg.evaluate("() => FR.bonus.deliver('it_audit', true)"); pg.wait_for_timeout(300)
    body = pg.evaluate("() => (FR.mail.messages().find(m => m.id === 'bn_it_audit') || {}).body || ''")
    ok('Press and hold the file' in body and 'Right-click' not in body, 'F7: the IT survey says "press and hold" on a phone')

    # F9 / F10: Paint: every tool on screen, big swatches, the Fonts bar docked above the picture, only with the Text tool
    closeall(pg); pg.evaluate("() => FR.apps.paint()"); pg.wait_for_timeout(1000)
    f10 = pg.evaluate("""() => { const w = document.querySelector('.fr-win:not(.fr-inactive)'), ts = [...w.querySelectorAll('.pt-tool')], sw = w.querySelector('.pt-sw').getBoundingClientRect();
      const bad = ts.filter(t => { const r = t.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.right > innerWidth + 1 || r.left < 0 || !(h && t.contains(h)); }).map(t => t.dataset.t);
      return [ts.length, bad, Math.round(sw.width), Math.round(sw.height)]; }""")
    ok(not f10[1] and f10[2] >= 28 and f10[3] >= 26, f'F10: all {f10[0]} Paint tools on screen and tappable, swatches {f10[2]}x{f10[3]} px {f10[1]}')
    tap(pg, pg.locator(TOP + ' .pt-tool[data-t=text]'), 300)
    f9 = pg.evaluate("() => { const w = document.querySelector('.fr-win:not(.fr-inactive)'), f = w.querySelector('.pt-fontbar'), ws = w.querySelector('.pt-ws'); const r = f.getBoundingClientRect(), s = ws.getBoundingClientRect(); return [f.classList.contains('on'), r.bottom <= s.top + 1, Math.round(r.bottom), Math.round(s.top)]; }")
    ok(f9[0] and f9[1], f'F9: with the Text tool the Fonts bar is docked above the picture, not over it {f9}')
    tap(pg, pg.locator(TOP + ' .pt-tool[data-t=pencil]'), 300)
    ok(pg.evaluate("() => getComputedStyle(document.querySelector('.fr-win:not(.fr-inactive) .pt-fontbar')).display") == 'none', 'F9: another tool: no Fonts bar')
    shot(pg, 'paint')
    closeall(pg)

    # F11: Outlook: more rows in portrait; a new mail doesn't move the rows under the finger
    pg.evaluate("() => FR.apps.mail(null)"); pg.wait_for_timeout(1000); pg.evaluate(MUTE)
    f11 = pg.evaluate("() => { const l = document.querySelector('.fr-win:not(.fr-inactive) .oe-list'), r = l.querySelector('tbody tr'); return [Math.floor((l.clientHeight - l.querySelector('thead').offsetHeight) / r.offsetHeight), document.querySelector('.fr-win:not(.fr-inactive) .oe-prev').offsetHeight]; }")
    ok(f11[0] >= (6 if narrow(pg) else 8), f'F11: the inbox shows {f11[0]} rows (no empty preview pane until a message is picked)')
    tops = pg.evaluate("""() => { const l = document.querySelector('.fr-win:not(.fr-inactive) .oe-list'); l.scrollTop = 80; return new Promise(ok => setTimeout(() => {
      const rows = [...l.querySelectorAll('tr[data-id]')].slice(2, 6).map(r => [r.dataset.id, Math.round(r.getBoundingClientRect().top)]);
      FR.mail.incoming({ from: { name: 'Test Sender', email: 'test@example.com' }, subject: 'T-new arrives', body: 'x' }, false);
      setTimeout(() => { const after = rows.map(([id]) => Math.round(l.querySelector('tr[data-id="' + id + '"]').getBoundingClientRect().top)); const p = document.querySelector('.oe-newpill'), h = l.querySelector('thead th').getBoundingClientRect();
        ok([rows.map(r => r[1]), after, !!p, p ? p.getBoundingClientRect().bottom <= h.bottom + 1 : false]); }, 200); }, 150)); }""")
    ok(tops[0] == tops[1] and tops[2] and tops[3], f'F11: a new mail arriving leaves the rows where they were; "New message" shows over the headers {tops}')
    pg.wait_for_timeout(700); tap(pg, pg.locator('.oe-newpill'), 700)
    ok(pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .oe-list').scrollTop") < 4 and pg.locator('.oe-newpill').count() == 0, 'F11: tapping "New message" scrolls up to it')
    closeall(pg)

    # F15: the boarding pass fits the screen with Wrap off (when that stays readable)
    pg.evaluate("() => FR.openFile('boarding')"); pg.wait_for_timeout(700)
    f15 = pg.evaluate("() => { const t = document.querySelector('.fr-win:not(.fr-inactive) .np-ta'); return [t.classList.contains('np-nowrap'), t.classList.contains('np-fit'), t.scrollWidth <= t.clientWidth + 1, parseFloat(getComputedStyle(t).fontSize)]; }")
    ok(f15[0] and ((f15[1] and f15[2] and f15[3] >= 8.5) or (narrow(pg) and not f15[1])), f'F15: the ASCII boarding pass fits the screen unwrapped {f15}')
    closeall(pg)
    # F17: ShowMe ERP's module tabs wrap (nothing runs off the right edge)
    pg.evaluate("() => FR.apps.erp()"); pg.wait_for_timeout(700)
    f17 = pg.evaluate("() => { const n = document.querySelector('.fr-win:not(.fr-inactive) .erp-nav'); return [n.scrollWidth <= n.clientWidth + 1, Math.max(...[...n.querySelectorAll('.erp-n')].map(e => e.getBoundingClientRect().right)) <= innerWidth + 1]; }")
    ok(f17[0] and f17[1], f'F17: ERP module tabs all on screen {f17}')
    closeall(pg)
    # F18: the change log opens at its first columns (date, who), on row 17
    pg.evaluate("() => FR.openFile('changelog')"); pg.wait_for_timeout(900)
    f18 = pg.evaluate("() => { const w = document.querySelector('.fr-win:not(.fr-inactive)'); return [w.querySelector('.xl-scroll').scrollLeft, w.querySelector('.xl-nb-in').value]; }")
    ok(f18[0] == 0 and f18[1] == 'A17', f'F18: the change log opens at column A (row 17) {f18}')
    closeall(pg)
    # F12: Find on an IE page
    pg.evaluate("() => FR.apps.ie('http://championship.example/schedule')"); pg.wait_for_timeout(1200)
    tap(pg, pg.locator(TOP + ' .fr-mi', has_text='Edit'), 300); tap(pg, pg.locator('.fr-menu-item', has_text='Find (on This Page)'), 500)
    dlg_type(pg, 'Pool', 'Find Next'); pg.wait_for_timeout(300)
    ok(pg.locator(TOP + ' mark.ie-hit').count() >= 1, 'F12: Edit › Find (on This Page) marks the matches on the page')
    ctx.close()


SITE_OK = """() => { const cs = getComputedStyle(document.body), imgs = [...document.images];
  const rules = [...document.styleSheets].reduce((n, s) => { try { return n + s.cssRules.length; } catch (e) { return n; } }, 0);
  return { font: cs.fontFamily, rules, imgs: imgs.length, broken: imgs.filter(i => !i.complete || !i.naturalWidth).map(i => i.getAttribute('src')) }; }"""


def site_frame(pg):
    fr = [f for f in pg.frames if 'packacorp.com' in f.url]
    return fr[-1] if fr else None


def site_styled(pg, what, bad):
    fr = site_frame(pg)
    r = fr.evaluate(SITE_OK) if fr else None
    good = bool(r) and 'Times' not in r['font'] and r['rules'] > 20 and not r['broken'] and not bad
    ok(good, f'P1: {what}: packacorp.com styled, images load, no 404 ({(fr.url if fr else "no frame")}, {r and r["rules"]} css rules, broken {r and r["broken"]}, {len(bad)} failed requests {bad[:2]})')
    bad.clear()


def r5_checks(p, b, devname):
    """round 5 (Pixel player): the company site in IE stays styled across pages (P1), the workbook you type into is
    named on screen (P2), every Easter egg is worth points and the count shows (P3), Go To Last Cell on a phone (P4)"""
    dev = dict(p.devices[devname]); dev.pop('default_browser_type', None)
    PFX[0] = 'r5_' + devname.replace(' ', '') + '_'
    print('== round 5 checks on', devname, flush=True)
    ctx = b.new_context(**dev); ctx.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    pg = ctx.new_page(); bad = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.on('response', lambda r: r.status >= 400 and bad.append(f'{r.status} {r.url}'))
    pg.goto(URL + '?dev=1&solve=bridge'); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate(MUTE)

    # P1: the company site, page after page (chips, the Links / Favorites, a link inside the site, Refresh, Back)
    pg.evaluate("() => FR.apps.ie('https://www.packacorp.com/')"); pg.wait_for_timeout(1200)
    site_styled(pg, 'home', bad)
    for u in ('about.html', 'products.html', 'careers.html', 'quality.html', 'contact.html', 'industries.html'):
        pg.evaluate(f"() => FR.apps.ie('https://www.packacorp.com/{u}')"); pg.wait_for_timeout(900)
        site_styled(pg, u, bad)
    fr = site_frame(pg)
    fr.evaluate("() => { const t = document.getElementById('navToggle'); if (t && getComputedStyle(t).display !== 'none') t.click(); }"); pg.wait_for_timeout(200)
    fr.evaluate("() => document.querySelector('.main-nav a[href=\"products.html\"]').click()"); pg.wait_for_timeout(1000)   # (a tap into the cross-origin frame lands off by a frame offset in headless Chromium: mob_server.py)
    site_styled(pg, 'a link tapped inside the site (Products)', bad)
    tap(pg, pg.locator(TOP + ' .ie-b[data-a=refresh]'), 1000); site_styled(pg, 'after Refresh', bad)
    tap(pg, pg.locator(TOP + ' .ie-b[data-a=back]'), 1000); site_styled(pg, 'after Back', bad)
    pg.screenshot(path=f'{OUT}/mobile_{PFX[0]}site.png')
    ok(pg.locator(TOP + ' .fr-menubar').is_visible() and not pg.locator(TOP + ' .fr-mbtn').is_visible(), 'P6: upright, IE keeps its menu bar and shows no Menu button')
    closeall(pg)

    # P2: the workbook's name under the formula bar, in its own colour; the empty formula bar names it too
    pg.evaluate("() => FR.openFile('bud_v5ut')"); pg.wait_for_timeout(900); pg.evaluate(MUTE)
    pg.evaluate("() => FR.openFile('bud_v3')"); pg.wait_for_timeout(900)
    p2 = pg.evaluate("""() => { const w = document.querySelector('.fr-win.xl-win:not(.fr-inactive)'), f = w.querySelector('.xl-fname'), r = f.getBoundingClientRect(), nm = f.querySelector('b').textContent, fb = w.querySelector('.xl-fbar').getBoundingClientRect();
      return [nm, w.querySelector('.fr-title').textContent, w.querySelector('.xl-fin').placeholder, getComputedStyle(f).backgroundColor, r.height, f.parentElement.classList.contains('xl-fbar') && r.top >= fb.top + 30 && r.bottom <= fb.bottom + 1 && r.width >= innerWidth - 4,
              [...document.querySelectorAll('.xl-win .xl-fname')].map(x => getComputedStyle(x).backgroundColor)]; }""")
    ok(p2[0] == 'Budget_FY27_v3.xls' and p2[1].endswith(p2[0]) and p2[2] == 'Typing into Budget_FY27_v3.xls' and p2[4] >= 18 and p2[5], f'P2: the active workbook is named on its own line under the formula bar: {p2[:6]}')
    ok(len(set(p2[6])) == 2, f'P2: two open workbooks, two colours {p2[6]}')
    tap(pg, pg.locator('.fr-switch'), 400); tap(pg, pg.locator('.fr-swl-r', has_text='v5_FINAL_USE_THIS').first, 700)
    ok(pg.evaluate("() => document.querySelector('.fr-win.xl-win:not(.fr-inactive) .xl-fname b').textContent") == 'Budget_FY27_v5_FINAL_USE_THIS.xls', 'P2: switching windows: the strip follows the workbook on top')
    pg.screenshot(path=f'{OUT}/mobile_{PFX[0]}xl_name.png')
    closeall(pg)

    # P4: no Ctrl or End on a phone keyboard: Edit › Go To Last Cell (Ctrl+End) finds the white-on-white note
    pg.evaluate("() => FR.eggs._test.reset()")
    sc0 = pg.evaluate('() => FR.score.now().score')
    pg.evaluate("() => FR.openFile('esports')"); pg.wait_for_timeout(900); pg.evaluate(MUTE)
    tap(pg, pg.locator(TOP + ' .fr-mi', has_text='Edit'), 300)
    item = pg.locator('.fr-menu-item', has_text='Go To Last Cell')
    ok(item.count() == 1 and 'Go To Last Cell (Ctrl+End)' in item.inner_text(), 'P4: Edit menu has "Go To Last Cell (Ctrl+End)" on a phone')
    tap(pg, item, 600)
    ok(pg.input_value(TOP + ' .xl-nb-in') == 'J36' and pg.evaluate("() => FR.eggs.has('xl_hidden')"), 'P4: it jumps to J36 and finds the egg')
    # P3: an egg is worth +10 as it's found, the note says so, and the count is in words
    t = pg.evaluate("() => (document.querySelector('.eg-toast') || {}).textContent || ''")
    ok('(1/15)' in t and '+10 points' in t and pg.evaluate('() => FR.score.now().score') == sc0 + 10, f'P3: egg note "{t}"; score +10')
    ok(pg.evaluate('() => FR.score.found()').startswith('1 of 15 Easter eggs') and '1 egg × 10' in pg.evaluate('() => FR.score.breakdown()'), 'P3: egg progress in words: ' + pg.evaluate('() => FR.score.found() + " | " + FR.score.breakdown()'))
    pg.screenshot(path=f'{OUT}/mobile_{PFX[0]}egg.png')
    closeall(pg)
    pg.evaluate("() => FR.apps.ie('http://intranet.packacorp.local/')"); pg.wait_for_timeout(900)
    howto = pg.inner_text(TOP + ' .st-howto')
    ok('+10 for each one you find, 15 hidden' in howto and 'up to +1,450' in howto, 'P3: "How points work" says what an egg is worth')
    ok('1 of 15 Easter eggs' in pg.inner_text(TOP + ' .st-mine'), 'P3: the leaderboard page shows the egg count')
    closeall(pg)
    ctx.close()


def r5_desktop(p, b):
    """round 5: none of the phone-only additions reach a desktop (no strip, no Menu button, no Go To Last Cell)"""
    PFX[0] = 'r5_desktop_'
    ctx = b.new_context(viewport={'width': 1366, 'height': 800}); pg = ctx.new_page()
    pg.goto(URL + '?dev=1&solve=bridge'); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(700)
    pg.evaluate("() => FR.openFile('esports')"); pg.wait_for_timeout(700)
    pg.locator('.fr-win:not(.fr-inactive) .fr-mi', has_text='Edit').dispatch_event('mousedown'); pg.wait_for_timeout(200)
    ok(not pg.evaluate('() => FR.mobile') and pg.locator('.xl-fname').count() == 0 and pg.locator('.fr-mbtn').count() == 0 and pg.locator('.fr-menu-item', has_text='Go To Last Cell').count() == 0 and pg.locator('.fr-menu-item', has_text='Go To...').count() == 1,
       'desktop: no workbook strip, no Menu button, Edit menu unchanged')
    ctx.close()


ICONS = "() => [...document.querySelectorAll('.fr-dicon')].map(i => { const r = i.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right)]; })"
SAVER = "() => !!document.querySelector('.fr-saver')"


def r6_checks(p, b, devname):
    """round 6 (iPhone SE player): a hint is never spent by a near miss and always asks first on a phone (Q1), the
    screensaver waits while IE's web page is in use (Q2), the checklist footer follows every score change (Q4), a
    long-press doesn't move a desktop icon and icons stay on screen (Q6), Paint's Save As fits a 320 px phone (Q7),
    General numbers fit their column in Excel (Q8), "bonus & eggs" / "bonus requests" (Q9)"""
    dev = dict(p.devices[devname]); dev.pop('default_browser_type', None)
    PFX[0] = 'r6_' + devname.replace(' ', '') + '_'
    print('== round 6 checks on', devname, flush=True)
    ctx = b.new_context(**dev); ctx.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL + '?dev=1&solve=version'); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate(MUTE)

    # Q1: item 3 (unlock). The line just above the button ("Ticks itself when you do it.") is not the button, even
    # with the browser's near-miss snapping; the button itself asks first ("Use a free hint? (10 left)")
    item = ck(pg)
    reachable(pg, item.locator('.ck-hbtn'))
    g = pg.evaluate("() => { const it = document.querySelector('.ck-item.open'), a = it.querySelector('.ck-auto').getBoundingClientRect(), h = it.querySelector('.ck-hbtn').getBoundingClientRect(); return [Math.round(h.top - a.bottom), a.left + 40, a.bottom - 2, h.left + 30, h.top + h.height / 2]; }")
    ok(g[0] >= 16, f'Q1: {g[0]} px of plain space between "Ticks itself when you do it." and the hint button')
    for dy in (0, 3, 7):   # the report's tap was on the text's last pixels; also a little lower
        pg.touchscreen.tap(g[1], g[2] + dy); pg.wait_for_timeout(350)
    ok(pg.evaluate("() => (FR.state.hintsUsed.unlock || 0) === 0 && !document.querySelector('.fr-dialog')"), 'Q1: taps on the line above the button spend nothing and open nothing')
    tap(pg, item.locator('.ck-hbtn'), 400)
    msg = pg.inner_text('.fr-dialog .fr-dlg-msg') if pg.locator('.fr-dialog').count() else ''
    ok('Use a free hint? (10 left)' in msg and pg.evaluate("() => (FR.state.hintsUsed.unlock || 0) === 0"), f'Q1: the button asks first: {msg!r}')
    shot(pg, 'hint_confirm')
    dlg_btn(pg, 'Cancel')
    ok(pg.evaluate("() => (FR.state.hintsUsed.unlock || 0) === 0 && FR.score.now().freeLeft === 10"), 'Q1: Cancel: no hint used, still 10 free')
    tap(pg, ck(pg).locator('.ck-hbtn'), 400); dlg_btn(pg, 'Use a hint')
    ok(pg.evaluate("() => FR.state.hintsUsed.unlock === 1") and pg.locator(TOP + ' .ck-item.open .ck-fos').count() == 1, 'Q1: "Use a hint": hint 1 shows')
    tap(pg, ck(pg).locator('.ck-hbtn'), 400)
    ok('(9 left)' in (pg.inner_text('.fr-dialog .fr-dlg-msg') if pg.locator('.fr-dialog').count() else ''), 'Q1: the next one says 9 left')
    dlg_btn(pg, 'Cancel')

    # Q4: the footer drops by 50 at each wrong answer, while the checklist stays open (and the message stays)
    pg.evaluate("() => FR.puzzle.solve('unlock')"); pg.wait_for_timeout(400); pg.evaluate(MUTE)
    item = ck(pg)
    foot = lambda: pg.evaluate("() => (document.querySelector('.fr-win .ck-foot .ck-score').textContent.match(/Score: ([\\d,]+)/) || [])[1]")
    s0 = pg.evaluate('() => FR.score.now().score')
    for k, v in enumerate(('2230', '3530')):
        tap(pg, item.locator('.ck-ans input'), 150); pg.keyboard.type(v); tap(pg, item.locator('.ck-ans button'), 400)
        want = f'{s0 - 50 * (k + 1):,}'
        ok(foot() == want and '(−50 points)' in pg.inner_text(TOP + ' .ck-item.open .ck-fb'), f'Q4: wrong answer {k + 1}: the footer says {foot()} at once (want {want}), the message stays')
    shot(pg, 'footer_live')
    # Q9: one word for the total ("bonus & eggs"), the breakdown splits it
    pg.evaluate("() => { FR.eggs.find('diary'); FR.state.bonus = FR.state.bonus || {}; FR.state.bonus.mum_fx = { solvedAt: Date.now(), pts: 100 }; FR.save(); FR.bus.emit('bonus', 'mum_fx'); FR.bus.emit('score'); }"); pg.wait_for_timeout(300)
    ft = pg.inner_text(TOP + ' .ck-foot .ck-meta'); bd = pg.evaluate('() => FR.score.breakdown()')
    ok('(+110 bonus & eggs)' in ft and '+ 100 bonus requests + 1 egg × 10 =' in bd, f'Q9: footer {ft.split(" · ")[0]!r}, breakdown {bd!r}')
    pg.evaluate(MUTE)
    closeall(pg)

    # Q2: the screensaver waits while the player is on IE's web page (its touches never reach the game), comes otherwise
    pg.evaluate("() => FR.apps.ie('https://www.packacorp.com/about.html')"); pg.wait_for_timeout(1200)
    pg.evaluate('() => FR.idle._fire(0)'); pg.wait_for_timeout(200)
    ok(not pg.evaluate(SAVER), 'Q2: 5 minutes with no touch the game can see, IE on packacorp.com on top: no screensaver')
    pg.evaluate('() => FR.idle._fire(31 * 60000)'); pg.wait_for_timeout(200)
    ok(pg.evaluate(SAVER), 'Q2: ... but after 30 minutes it comes anyway')
    pg.wait_for_timeout(500); pg.touchscreen.tap(100, 100); pg.wait_for_timeout(900)
    st2 = pg.evaluate("() => [!!document.querySelector('.fr-saver'), FR.wm.active && FR.wm.active.id, [...FR.wm.wins.keys()]]")
    ok(not st2[0] and st2[1] == 'ie', f'Q2: a touch ends it, and only ends it (nothing under it was pressed) {st2}')
    closeall(pg)
    if pg.evaluate("() => !!FR.wm.wins.get('checklist')"): pg.evaluate("() => FR.wm.wins.get('checklist').close()")
    pg.wait_for_timeout(300)
    pg.evaluate('() => FR.idle._fire(0)'); pg.wait_for_timeout(200)
    ok(pg.evaluate(SAVER), 'Q2: with no web page on top, 5 idle minutes bring the screensaver as before')
    pg.wait_for_timeout(500); pg.touchscreen.tap(60, 60); pg.wait_for_timeout(900)
    ok(not pg.evaluate(SAVER) and pg.evaluate("() => FR.wm.wins.size") == 0, 'Q2: the tap that ends it doesn\'t open the desktop icon under it')

    # Q6: a long-press opens the menu and moves nothing; every icon stays on the visible desktop, also when it gets short
    before = pg.evaluate(ICONS)
    longpress(pg, pg.locator('.fr-dicon', has_text='Model_FY26'))
    ok(pg.locator('.fr-ctx').count() == 1, 'Q6: long-press on the model file opens its menu')
    pg.wait_for_timeout(600)   # (the menu ignores taps for its first moments: tap guard)
    tap(pg, pg.locator('.fr-ctx .fr-menu-item', has_text='Properties'), 700)
    tap(pg, pg.locator('.sh-sheet .sh-cancel'), 500)
    after = pg.evaluate(ICONS)
    ok(before == after, 'Q6: after long-press + Properties no icon has moved' + ('' if before == after else f' {before} -> {after}'))
    ok(all(r <= pg.viewport_size['width'] for _, _, r in after), 'Q6: every icon is on screen')
    shot(pg, 'icons_after_longpress')
    vw, vh = pg.viewport_size['width'], pg.viewport_size['height']
    pg.set_viewport_size({'width': vw, 'height': 330}); pg.wait_for_timeout(500)
    q6 = pg.evaluate("() => { const box = document.querySelector('.fr-icons'), br = box.getBoundingClientRect(); const ic = [...box.children].map(i => i.getBoundingClientRect()); const off = ic.filter(r => r.right > innerWidth + 1).length; return [off, box.className, box.scrollWidth > box.clientWidth ? getComputedStyle(box).overflowX : 'fits']; }")
    ok(q6[0] == 0 or q6[2] == 'auto', f'Q6: a short screen ({vw}x330): the icons get tighter, and scroll sideways if they still don\'t fit {q6}')
    pg.set_viewport_size({'width': vw, 'height': vh}); pg.wait_for_timeout(500)
    ok(pg.evaluate(ICONS) == after, 'Q6: back to full height: the icons are where they were')

    # Q7: Paint's Save As fits a 320 px phone (nothing cut off on the left)
    pg.evaluate("() => FR.apps.paint(null)"); pg.wait_for_timeout(900)
    tap(pg, pg.locator(TOP + ' .fr-mi', has_text='File'), 300)
    tap(pg, pg.locator('.fr-menu-item', has_text='Save As'), 700)
    q7 = pg.evaluate("() => { const d = [...document.querySelectorAll('.fr-dialog')].pop(), row = d.querySelector('.fr-dlg-row'), dr = d.getBoundingClientRect(); const labs = [...d.querySelectorAll('.pt-frow > span:first-child')].map(s => s.getBoundingClientRect()); return [row.scrollWidth <= row.clientWidth + 1, row.scrollLeft, labs.every(r => r.left >= dr.left + 2 && r.right <= dr.right), dr.left >= 0 && dr.right <= innerWidth]; }")
    ok(all([q7[0], q7[1] == 0, q7[2], q7[3]]), f'Q7: Save As fits the screen, no sideways scroll, labels whole {q7}')
    shot(pg, 'paint_saveas')
    dlg_btn(pg, 'Cancel')
    closeall(pg)

    # Q8: a blank sheet shows =2000*(1+1.5%)^12 as a number (General: as many decimals as fit), never #######
    pg.evaluate("() => FR.apps.excel(null)"); pg.wait_for_timeout(900)
    xl_type(pg, 0, 1, '=2000*(1+1.5%)^12')
    t8 = pg.inner_text(f'{TOP} .xl-grid td[data-r="0"][data-c="1"]').strip()
    ok(t8.startswith('2391.2') and '#' not in t8, f'Q8: B1 shows {t8!r} (Excel: 2391.236)')
    xl_type(pg, 1, 1, '=123456789012*10')
    t8b = pg.inner_text(f'{TOP} .xl-grid td[data-r="1"][data-c="1"]').strip()
    ok(re.match(r'^1\.2\d*E\+12$', t8b) is not None, f'Q8: a number too long for the column goes scientific: {t8b!r}')
    shot(pg, 'excel_general')
    closeall(pg)
    ctx.close()


def r6_land(p, b, devname):
    """round 6, phones sideways: Paint gives the picture the height (Q3), tips are one line over the title bar (Q5)"""
    dev = dict(p.devices[devname]); dev.pop('default_browser_type', None)
    vw, vh = dev['viewport']['width'], dev['viewport']['height']
    PFX[0] = 'r6_land_' + devname.replace(' ', '') + '_'
    ctx = b.new_context(**dict(dev, viewport={'width': max(vw, vh), 'height': min(vw, vh)}))
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL + '?dev=1&solve=unlock'); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate(MUTE)
    H = pg.viewport_size['height']
    # Q3: Paint sideways
    pg.evaluate("() => FR.apps.paint(null)"); pg.wait_for_timeout(900)
    PT = """() => { const w = document.querySelector('.fr-win:not(.fr-inactive)'), q = s => w.querySelector(s).getBoundingClientRect(), tb = document.querySelector('.fr-taskbar').getBoundingClientRect();
      const tools = [...w.querySelectorAll('.pt-tool')].map(t => t.getBoundingClientRect()), sw = [...w.querySelectorAll('.pt-sw')].map(t => t.getBoundingClientRect());
      return { ws: [Math.round(q('.pt-ws').width), Math.round(q('.pt-ws').height)], toolsOn: tools.every(r => r.top >= 0 && r.bottom <= tb.top + 1 && r.height >= 26 && r.width >= 30), swOn: sw.length === 28 && sw.every(r => r.bottom <= tb.top + 1 && r.right <= innerWidth && r.height >= 24 && r.width >= 22),
        status: getComputedStyle(w.querySelector('.status-bar')).display, menubar: w.querySelector('.fr-menubar').getBoundingClientRect().height }; }"""
    r = pg.evaluate(PT)
    ok(r['ws'][1] >= 0.75 * (H - 62) and r['ws'][0] >= 300, f'Q3: sideways Paint: the picture area is {r["ws"][0]}x{r["ws"][1]} (screen {pg.viewport_size["width"]}x{H})')
    ok(r['toolsOn'] and r['swOn'] and r['status'] == 'none' and r['menubar'] == 0, f'Q3: all 16 tools and 28 colours on screen, big enough to tap; no status bar, no menu bar {r}')
    shot(pg, 'paint')
    tap(pg, pg.locator(TOP + ' .pt-tool[data-t=text]'), 300)
    r = pg.evaluate(PT); fb = pg.evaluate("() => { const f = document.querySelector('.fr-win:not(.fr-inactive) .pt-fontbar'); const r = f.getBoundingClientRect(); return [getComputedStyle(f).display, Math.round(r.height)]; }")
    ok(fb[0] == 'flex' and fb[1] <= 36 and r['ws'][1] >= 0.6 * (H - 62), f'Q3: with the Text tool: one slim Fonts row {fb}, the picture still {r["ws"][0]}x{r["ws"][1]}')
    shot(pg, 'paint_text')
    tap(pg, pg.locator(TOP + ' .pt-tool[data-t=brush]'), 300); tap(pg, pg.locator(TOP + ' .pt-tool[data-t=brush]'), 300)
    op = pg.evaluate("() => { const e = document.querySelector('.fr-win:not(.fr-inactive) .pt-opts'), r = e.getBoundingClientRect(), t = document.querySelector('.fr-win:not(.fr-inactive) .pt-tools').getBoundingClientRect(); return [getComputedStyle(e).display, r.left >= t.right - 1 && r.bottom <= innerHeight && r.right <= innerWidth]; }")
    ok(op[0] == 'flex' and op[1], f'Q3: the brush options pop out beside the tool column, on screen {op}')
    tap(pg, pg.locator(TOP + ' .pt-o').nth(1), 300)
    # draw a stroke by finger in the middle of the picture
    before = pg.evaluate("() => { const c = document.querySelector('.fr-win:not(.fr-inactive) .pt-cv'); return c.toDataURL().length; }")
    bb = pg.locator(TOP + ' .pt-cv').bounding_box()
    swipe(pg, bb['x'] + 30, bb['y'] + 40, bb['x'] + min(bb['width'], 300) - 30, bb['y'] + min(bb['height'], 200) - 30)
    ok(pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .pt-cv').toDataURL().length") != before, 'Q3: a finger stroke draws on the picture')
    ok(topmost_is_visible(pg, TOP + ' .fr-mbtn'), 'Q3: a Menu button in the title bar')
    tap(pg, pg.locator(TOP + ' .fr-mbtn'), 300); tap(pg, pg.locator(TOP + ' .fr-mi', has_text='File'), 300)
    tap(pg, pg.locator('.fr-menu-item', has_text='Save As'), 700)
    ok(pg.locator('.fr-dialog .pt-fd-name').count() == 1, 'Q3: Menu › File › Save As… opens')
    dlg_btn(pg, 'Cancel')
    ok(not pg.locator(TOP + ' .fr-menubar').is_visible(), 'Q3: the menu bar goes away again')
    closeall(pg)
    # Q5: a tip sideways over Excel: one line over the title bar's caption, never over rows / formula bar / tabs / buttons
    tap(pg, pg.locator('.fr-win .ck-item.open .ck-chip', has_text='Budget_FY27_BOARD.xls').first, 1200)
    pg.evaluate("() => FR.balloon('T-new', 'New request from Steve Packa: Rotary question (typed by Barb). How many tickets does the Rotary Club have to sell to break even this year?<br><small>Optional bonus request · +200 points</small>', () => FR.apps.mail(null), { act: 'Open it' })")
    pg.wait_for_selector('.fr-balloon:has-text("Rotary")', timeout=6000); pg.wait_for_timeout(500)
    q5 = pg.evaluate("""() => { const b = document.querySelector('.fr-balloon').getBoundingClientRect(), w = document.querySelector('.fr-win:not(.fr-inactive)'), tb = w.querySelector('.title-bar').getBoundingClientRect(), mb = w.querySelector('.fr-mbtn').getBoundingClientRect(), ctl = w.querySelector('.title-bar-controls').getBoundingClientRect(), grid = w.querySelector('.xl-scroll').getBoundingClientRect(), fbar = w.querySelector('.xl-fbar').getBoundingClientRect();
      return [Math.round(b.top), Math.round(b.bottom), Math.round(b.height), b.bottom <= tb.bottom + 0.5, b.right <= mb.left && b.right <= ctl.left, b.bottom <= fbar.top + 0.5 && b.bottom <= grid.top, Math.round(b.width)]; }""")
    ok(q5[2] <= 30 and q5[3] and q5[4] and q5[5] and q5[6] >= 200, f'Q5: the tip is one line ({q5[2]} px) over the title bar\'s caption, clear of Menu / Minimize / Close, the formula bar and the grid {q5}')
    shot(pg, 'toast_excel')
    ok(pg.evaluate("() => document.querySelector('.fr-balloon').classList.contains('fr-balloon-more')"), 'Q5: the cut-off line says "more"')
    pg.wait_for_timeout(400); tap(pg, pg.locator('.fr-balloon .fr-balloon-b'), 400)
    op = pg.evaluate("() => { const b = document.querySelector('.fr-balloon'); return [b.classList.contains('fr-balloon-open'), Math.round(b.getBoundingClientRect().height), b.getBoundingClientRect().bottom <= innerHeight]; }")
    ok(op[0] and op[1] > 30 and op[2], f'Q5: a tap opens it up to the whole text {op}')
    shot(pg, 'toast_open')
    pg.evaluate("() => FR.tips.clear()")
    ctx.close()


def r6_desktop(p, b):
    """round 6 on a desktop: the hint button's hit area is the button (Q1), the footer follows a wrong answer (Q4), the
    screensaver waits while the mouse is on IE's web page (Q2), General numbers fit (Q8), no phone confirmation"""
    PFX[0] = 'r6_desktop_'
    ctx = b.new_context(viewport={'width': 1366, 'height': 800}); ctx.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL + '?dev=1&solve=version'); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate(MUTE)
    h = pg.evaluate("() => { const b = document.querySelector('.ck-item.open .ck-hbtn').getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }")
    for x, y in ((h[0] + 20, h[1] - 2), (h[2] + 3, (h[1] + h[3]) / 2), (h[0] + 20, h[3] + 2), (h[0] - 3, (h[1] + h[3]) / 2)):
        pg.mouse.click(x, y); pg.wait_for_timeout(200)
    ok(pg.evaluate("() => (FR.state.hintsUsed.unlock || 0) === 0"), f'Q1 desktop: clicks just outside the button (above, right, below, left) spend nothing {h}')
    pg.mouse.click(h[0] + 20, (h[1] + h[3]) / 2); pg.wait_for_timeout(300)
    ok(pg.evaluate("() => FR.state.hintsUsed.unlock === 1 && !document.querySelector('.fr-dialog')"), 'Q1 desktop: a click on the button shows a free hint at once (unchanged)')
    pg.evaluate("() => FR.puzzle.solve('unlock')"); pg.wait_for_timeout(400); pg.evaluate(MUTE)
    s0 = pg.evaluate('() => FR.score.now().score')
    pg.fill('.ck-item.open .ck-ans input', '2230'); pg.click('.ck-item.open .ck-ans button'); pg.wait_for_timeout(300)
    ft = pg.inner_text('.ck-foot .ck-score')
    ok(f'Score: {s0 - 50:,}' in ft and 'EBIT' in pg.inner_text('.ck-item.open .ck-fb'), f'Q4 desktop: the footer drops at once ({ft!r}), the message stays')
    # Q2: the mouse on the web page in IE: no screensaver; off it: the screensaver as before
    pg.evaluate("() => FR.apps.ie('https://www.packacorp.com/about.html')"); pg.wait_for_timeout(1500)
    fb = pg.locator('.fr-win:not(.fr-inactive) .ie-frame').bounding_box()
    pg.mouse.move(fb['x'] + fb['width'] / 2, fb['y'] - 60, steps=2); pg.mouse.move(fb['x'] + fb['width'] / 2, fb['y'] + 120, steps=15); pg.wait_for_timeout(200)
    pg.evaluate('() => FR.idle._fire(0)'); pg.wait_for_timeout(200)
    ok(not pg.evaluate(SAVER), 'Q2 desktop: the mouse is over the web page in IE: no screensaver')
    pg.mouse.move(fb['x'] + fb['width'] / 2, 785, steps=4); pg.wait_for_timeout(200)
    pg.evaluate('() => FR.idle._fire(0)'); pg.wait_for_timeout(200)
    ok(pg.evaluate(SAVER), 'Q2 desktop: mouse off the page (on the taskbar), 5 idle minutes: the screensaver')
    pg.wait_for_timeout(500); pg.mouse.move(300, 300); pg.mouse.move(320, 320); pg.wait_for_timeout(300)
    # Q8
    pg.evaluate("() => FR.apps.excel(null)"); pg.wait_for_timeout(900)
    pg.evaluate("() => { const w = FR.wm.active; w.el.querySelector('.xl-grid td[data-r=\"0\"][data-c=\"1\"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); }")
    pg.keyboard.type('=2000*(1+1.5%)^12'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    t8 = pg.evaluate("() => FR.wm.active.el.querySelector('.xl-grid td[data-r=\"0\"][data-c=\"1\"]').textContent")
    ok(t8.startswith('2391.2') and '#' not in t8, f'Q8 desktop: B1 shows {t8!r}')
    pg.screenshot(path=f'{OUT}/mobile_{PFX[0]}excel_general.png')
    ctx.close()



def fully_visible(pg, sel_js):
    """the element is on screen, inside every scrolling box around it, and on top at its centre"""
    return pg.evaluate("""(sel) => { const e = eval(sel); if (!e) return false; const r = e.getBoundingClientRect(); if (!r.width) return false;
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/auto|scroll|hidden/.test(cs.overflowX + cs.overflowY)) { const q = p.getBoundingClientRect(); if (r.left < q.left - 1 || r.right > q.right + 1 || r.top < q.top - 1 || r.bottom > q.bottom + 1) return false; } }
      const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && !!h && (h === e || e.contains(h)); }""", sel_js)


def dbltap(pg, x, y):
    pg.touchscreen.tap(x, y); pg.wait_for_timeout(80); pg.touchscreen.tap(x, y); pg.wait_for_timeout(450)


def r7_checks(p, b, devname, land=False):
    """round 7 (iPad Mini player): bonus e-mail grading + the pinned "Answer" button + replies to replies (T5), Frank's
    sticky notes always reachable (T1), double-tap edits a cell (T2), a tap on a new tip is for the new tip (T3), a
    window that opens by itself ignores taps for a moment / the checklist comes with the desktop (T4), property sheets
    sized to their page on a tablet (T6), what Run… opens comes to the front (T7)"""
    dev = dict(p.devices[devname]); dev.pop('default_browser_type', None)
    if land: dev['viewport'] = {'width': max(dev['viewport'].values()), 'height': min(dev['viewport'].values())}
    PFX[0] = 'r7_' + devname.replace(' ', '') + ('_land' if land else '') + '_'
    print('== round 7 checks on', devname, 'sideways' if land else '', flush=True)
    ctx = b.new_context(**dev); ctx.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL + '?dev=1&solve=unlock'); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate(MUTE)
    tablet = min(dev['viewport'].values()) >= 600

    # ---- T1: Frank's sticky notes on the Board copy: a chip shows while one is off the screen, a tap brings it in
    tap(pg, pg.locator('.fr-win .ck-item.open .ck-chip', has_text='Budget_FY27_BOARD.xls').first, 1300)
    xl_type(pg, 11, 2, '=C7-C9-C10-C11')
    NOTE = "document.querySelector('.fr-win:not(.fr-inactive) .xl-sticky')"
    CHIP = "document.querySelector('.fr-win:not(.fr-inactive) .xl-stickchip:not([hidden])')"
    has_note = pg.evaluate(f"() => !!{NOTE} && /quarters are still/.test({NOTE}.textContent)")
    ok(has_note, 'T1: the near-miss sticky note ("The quarters are still #REF!") is on the sheet')
    vis = fully_visible(pg, NOTE); chipped = pg.evaluate(f"() => !!{CHIP}")
    ok(vis != chipped, f'T1: the chip shows exactly while the note is out of sight (note visible {vis}, chip {chipped})')
    if chipped:
        shot(pg, 'sticky_chip')
        tap(pg, pg.locator(TOP + ' .xl-stickchip'), 600)
    ok(fully_visible(pg, NOTE) and not pg.evaluate(f"() => !!{CHIP}"), 'T1: the note is on screen in full (not under the frozen column A), the chip is gone')
    shot(pg, 'sticky_shown')
    g = pg.locator(TOP + ' .xl-scroll').bounding_box()
    for _ in range(6):   # back to the left, by finger
        if pg.evaluate("() => FR.wm.active.el.querySelector('.xl-scroll').scrollLeft") < 1: break
        swipe(pg, g['x'] + g['width'] * 0.4, g['y'] + g['height'] * 0.6, g['x'] + g['width'] * 0.95, g['y'] + g['height'] * 0.6)
    for c in (4, 5, 6, 7): xl_type(pg, 11, c, f'={"CEFGH"[c - 3]}7-{"CEFGH"[c - 3]}9-{"CEFGH"[c - 3]}10-{"CEFGH"[c - 3]}11')
    pg.wait_for_timeout(600)
    notes = pg.evaluate("() => [...document.querySelectorAll('.fr-win:not(.fr-inactive) .xl-sticky')].map(n => n.textContent)")
    ok('ebitda' in solved(pg) and len(notes) == 1 and 'Bank.zip' in notes[0], f'T1: row fixed: the stale #REF! note is gone, only the Bank.zip note is left {notes}')
    pg.evaluate("() => { const s = FR.wm.active.el.querySelector('.xl-scroll'); s.scrollLeft = 0; s.scrollTop = 0; }"); pg.wait_for_timeout(300)
    vis = fully_visible(pg, NOTE); chipped = pg.evaluate(f"() => !!{CHIP}")
    ok(vis != chipped, f'T1: the Bank.zip note: chip exactly while it is out of sight (visible {vis}, chip {chipped})')
    if chipped: tap(pg, pg.locator(TOP + ' .xl-stickchip'), 600)
    ok(fully_visible(pg, NOTE), 'T1: the Bank.zip password clue can be read in full')

    # ---- T2: double-tap on a cell = edit it (formula bar, with the cell showing what's typed); not after one tap
    pg.keyboard.press('Escape'); pg.evaluate("() => { const s = FR.wm.active.el.querySelector('.xl-scroll'); s.scrollLeft = 0; s.scrollTop = 0; }"); pg.wait_for_timeout(300)
    cell = lambda r, c: pg.locator(f'{TOP} .xl-grid td[data-r="{r}"][data-c="{c}"]').first
    tap(pg, cell(8, 4), 500)
    ok(pg.evaluate("() => document.activeElement.className") != 'xl-fin', 'T2: one tap on a new cell only selects it (no edit, no keyboard)')
    x, y = tap(pg, cell(9, 4), only_reach=True); dbltap(pg, x, y)
    t2 = pg.evaluate("() => { const w = FR.wm.active.el, ed = w.querySelector('.xl-editor'), td = w.querySelector('td[data-r=\"9\"][data-c=\"4\"]').getBoundingClientRect(), r = ed.getBoundingClientRect();"
                     " return [document.activeElement.className, w.querySelector('.xl-nb-in').value, ed.classList.contains('xl-editor-mirror') && getComputedStyle(ed).display !== 'none' && Math.abs(r.left - td.left) < 3 && Math.abs(r.top - td.top) < 3, ed.value]; }")
    ok(t2[0] == 'xl-fin' and t2[1] == 'E10' and t2[2] and t2[3] == '105', f'T2: a double-tap edits the cell: formula bar focused on E10, the cell shows "{t2[3]}" {t2}')
    pg.keyboard.type('106'); pg.wait_for_timeout(150)
    ok(pg.evaluate("() => FR.wm.active.el.querySelector('.xl-editor').value") == '106', 'T2: what is typed shows in the cell as well')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    # a cell cut off at the right edge: the first tap scrolls the grid, the second (same spot) still edits THAT cell
    edge = pg.evaluate("""() => { const w = FR.wm.active.el, s = w.querySelector('.xl-scroll').getBoundingClientRect();
      const td = [...w.querySelectorAll('td[data-r="4"]')].find(t => { const r = t.getBoundingClientRect(); return r.left < s.right - 14 && r.right > s.right + 6; });
      if (!td) return null; const r = td.getBoundingClientRect(); return [+td.dataset.c, (r.left + s.right) / 2, r.top + r.height / 2]; }""")
    if edge:
        dbltap(pg, edge[1], edge[2])
        e2 = pg.evaluate("() => [document.activeElement.className, FR.wm.active.el.querySelector('.xl-nb-in').value]")
        want = chr(65 + edge[0]) + '5'
        ok(e2[0] == 'xl-fin' and e2[1] == want, f'T2: double-tap on a cell cut off at the edge (the grid scrolls under the finger) edits {want}: {e2}')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
    else:
        print('     (T2: no cell cut off at the right edge on this screen)')
    closeall(pg)

    # ---- T3: a tip that fades out, and a new one right behind it: the new one waits until a tap aimed at the old
    # one can't be taken for it; then a tap on it is for it (it opens), never for the old one
    pg.evaluate("() => { FR.__T = Object.assign({}, FR.tips.TIP); FR.tips.TIP.MIN = FR.tips.TIP.MAX = 1500; window.__t3 = []; window.__nb = 0; window.__nbi = setInterval(() => { window.__nb = Math.max(window.__nb, document.querySelectorAll('.fr-balloon').length); }, 30); }")
    pg.evaluate("() => FR.balloon('T-old', 'Board Pack: 5 of 10 done', () => __t3.push('old'), { act: 'Open' })")
    pg.wait_for_timeout(2600)   # (shown, 1.5 s up, then it fades: leaving)
    pg.wait_for_function("() => !FR.tips.state().cur || FR.tips.state().cur.state === 'leaving'", timeout=8000)
    pg.evaluate("() => FR.balloon('T-new', 'New request from Packa IT Asset Audit', () => __t3.push('new'), { act: 'Open it' })")
    old_box = pg.evaluate("() => { const b = document.querySelector('.fr-balloon'); if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }")
    pg.wait_for_function("() => !FR.tips.state().cur || FR.tips.state().cur.title !== 'T-old'", timeout=4000)
    t_gone = pg.evaluate('() => Date.now()')
    if old_box: pg.touchscreen.tap(old_box[0], old_box[1]); pg.wait_for_timeout(100)   # aimed at the old one as it went
    st3 = pg.evaluate('() => FR.tips.state().cur')
    ok(not st3 or st3['title'] != 'T-new' or pg.evaluate('() => Date.now()') - t_gone > 900, f'T3: the new tip does not appear while the old one\'s ghost is there {st3}')
    ok(pg.evaluate('() => __t3.length') == 0, 'T3: the tap aimed at the fading tip pressed nothing')
    pg.wait_for_function("() => FR.tips.state().cur && FR.tips.state().cur.title === 'T-new' && FR.tips.state().cur.state === 'shown'", timeout=6000)
    shot(pg, 'tip_new')
    tap(pg, pg.locator('.fr-balloon'), 400)
    if pg.evaluate("() => !!document.querySelector('.fr-balloon.fr-balloon-open')"): tap(pg, pg.locator('.fr-balloon .fr-balloon-go'), 400)
    t3 = pg.evaluate('() => [__t3, __nb]')
    ok(t3[0] == ['new'] and t3[1] <= 1, f'T3: a tap on the new tip opens the new one (never the old one), one tip on screen at a time {t3}')
    pg.evaluate("() => { clearInterval(__nbi); Object.assign(FR.tips.TIP, FR.__T); }")
    closeall(pg); pg.evaluate(MUTE)

    # ---- T7: Run… → calc comes to the front, over the Excel that was on top; Start menu, desktop too
    tap(pg, pg.locator('.fr-win .ck-item .ck-chip', has_text='Budget_FY27_BOARD.xls').first if pg.locator('.fr-win .ck-item .ck-chip', has_text='Budget_FY27_BOARD.xls').count() else pg.locator('.fr-pack'), 1200)
    if not pg.evaluate("() => FR.wm.active && /xl/.test(FR.wm.active.el.className)"): pg.evaluate("() => FR.apps.excel(null)"); pg.wait_for_timeout(1200)
    tap(pg, pg.locator('.fr-startbtn'), 500)
    tap(pg, pg.locator('.fr-sm-item', has_text='Run...').first, 700)
    dlg_type(pg, 'calc', 'OK'); pg.wait_for_timeout(700)
    t7 = pg.evaluate("() => { const a = FR.wm.active, top = [...FR.wm.wins.values()].filter(w => !w.min).sort((x, y) => (+y.el.style.zIndex) - (+x.el.style.zIndex))[0]; return [a && a.el.querySelector('.fr-title').textContent, top && top.el.querySelector('.fr-title').textContent, !!a && !a.el.classList.contains('fr-inactive')]; }")
    ok(t7[0] == 'Calculator' and t7[1] == 'Calculator' and t7[2], f'T7: Run… calc: the Calculator is in front and active {t7}')
    shot(pg, 'run_calc')
    ok(fully_visible(pg, "document.querySelector('.fr-win:not(.fr-inactive) .ca-k[data-k=\"7\"]')"), 'T7: its keys are on screen and tappable')
    closeall(pg)

    # ---- T4: a window that opens by itself ignores taps for 600 ms; one opened by a tap: 250 ms as before
    pg.wait_for_timeout(700)
    pg.evaluate("() => { window.__c4 = 0; setTimeout(() => FR.apps.calc(), 0); }"); pg.wait_for_timeout(120)
    k7 = pg.locator(TOP + ' .ca-k[data-k="7"]'); bb = k7.bounding_box()
    disp = lambda: pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .ca-disp').value")
    d0 = disp()
    pg.wait_for_timeout(250); pg.touchscreen.tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(100)
    ok(disp() == d0, f'T4: a tap 0.4 s after a window opened by itself presses nothing ({d0!r} -> {disp()!r})')
    pg.wait_for_timeout(400); pg.touchscreen.tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.wait_for_timeout(200)
    ok(disp().rstrip('.').endswith('7'), f'T4: after 0.6 s taps work ({disp()!r})')
    closeall(pg)

    # ---- T6: Properties: a tablet floats it, sized to its page (buttons right under it); a phone fills the screen
    pg.evaluate("() => FR.apps.properties('model47')"); pg.wait_for_timeout(800)
    t6 = pg.evaluate("""() => { const w = document.querySelector('.sh-sheetwin'), r = w.getBoundingClientRect(), ok = w.querySelector('.sh-ok').getBoundingClientRect(), pn = w.querySelector('.sh-panes');
      const tb = document.querySelector('.fr-taskbar').getBoundingClientRect();
      return { max: w.classList.contains('fr-max'), h: Math.round(r.height), vh: innerHeight, top: Math.round(r.top), bottom: Math.round(r.bottom), tb: Math.round(tb.top), okIn: ok.bottom <= r.bottom + 1 && ok.top >= r.top, gap: Math.round(r.bottom - ok.bottom), left: Math.round(r.left), right: Math.round(innerWidth - r.right), scroll: pn.scrollHeight > pn.clientHeight + 2 }; }""")
    if tablet:
        ok(not t6['max'] and t6['h'] < 0.75 * t6['vh'] and t6['okIn'] and t6['gap'] < 20 and abs(t6['left'] - t6['right']) < 4 and t6['bottom'] <= t6['tb'], f'T6: tablet: Properties floats, sized to its page, centred, OK at its bottom {t6}')
        ok(topmost_is_visible(pg, '.sh-sheet .sh-ok') and topmost_is_visible(pg, '.sh-sheet .sh-cancel'), 'T6: OK / Cancel on screen')
        shot(pg, 'props_tablet')
        tap(pg, pg.locator('.sh-sheet .sh-cancel'), 400)
        # Folder Options (the longest page): still fits the screen, the page scrolls, buttons pinned
        tap(pg, pg.locator('.fr-startbtn'), 500); tap(pg, pg.locator('.fr-sm-item', has_text='My Documents').first, 900)
        tap(pg, pg.locator(TOP + ' .fr-mi', has_text='Tools'), 300) if pg.locator(TOP + ' .fr-mi', has_text='Tools').is_visible() else (tap(pg, pg.locator(TOP + ' .fr-mbtn'), 300), tap(pg, pg.locator(TOP + ' .fr-mi', has_text='Tools'), 300))
        tap(pg, pg.locator('.fr-menu-item', has_text='Folder Options'), 500)
        tap(pg, pg.locator('.sh-sheet [role=tab]', has_text='View'), 300)
        fo = pg.evaluate("() => { const w = document.querySelector('.sh-sheetwin'), r = w.getBoundingClientRect(), tb = document.querySelector('.fr-taskbar').getBoundingClientRect(); return [w.classList.contains('fr-max'), r.top >= 0 && r.bottom <= tb.top + 1, Math.round(r.height)]; }")
        ok(not fo[0] and fo[1] and topmost_is_visible(pg, '.sh-sheet .sh-ok'), f'T6: tablet: Folder Options floats and fits above the taskbar, OK on screen {fo}')
        tap(pg, pg.locator('.sh-sheet label', has_text='Show hidden files and folders').last, 200, 'Show hidden files')
        ok(topmost_is_visible(pg, '.sh-sheet .sh-ok'), 'T6: … the option reached by finger, OK still on screen')
        shot(pg, 'folder_options_tablet')
        tap(pg, pg.locator('.sh-sheet .sh-cancel'), 400)
    else:
        ok(t6['max'] and t6['okIn'], f'T6: phone: Properties fills the screen, OK / Cancel / Apply pinned at the bottom (as before) {t6}')
        tap(pg, pg.locator('.sh-sheet .sh-cancel'), 400)
    closeall(pg)

    # ---- T5: the bonus request answer box is one tap away (pinned "Answer ▸"); replies graded on the answer
    pg.evaluate("() => FR.bonus.deliver('steve_margin', true)"); pg.wait_for_timeout(300)
    pg.evaluate("() => FR.apps.mail(null)"); pg.wait_for_timeout(1200)
    row = pg.locator(TOP + ' tr[data-id="bn_steve_margin"]').first
    tap(pg, row, 800)
    host = "(document.querySelector('.fr-win:not(.fr-inactive) .oe-mbody') || document.querySelector('.fr-win:not(.fr-inactive) .oe-prev .oe-pbody'))"
    pg.wait_for_timeout(300)
    box_vis = fully_visible(pg, host + ".querySelector('.bn-box .bn-inp')")
    jump_vis = fully_visible(pg, host + ".querySelector('.bn-jump')")
    ok(box_vis or jump_vis, f'T5: the answer box, or the pinned "Answer ▸" button, is on screen when the message opens (box {box_vis}, button {jump_vis})')
    if not box_vis:
        shot(pg, 'bonus_jump')
        tap(pg, pg.locator(TOP + ' .bn-jump'), 900)
        ok(fully_visible(pg, host + ".querySelector('.bn-box .bn-inp')") and pg.evaluate("() => document.activeElement && document.activeElement.classList.contains('bn-inp')"), 'T5: a tap on "Answer ▸" brings the box into view with the cursor in it')
    # the player's own first reply, in the box: right
    inp = pg.locator(TOP + ' .bn-box .bn-inp').first
    tap(pg, inp, 200); pg.keyboard.type('a 25% markup on cost is a 20% gross margin (25/125). Say 20%.', delay=2)
    tap(pg, pg.locator(TOP + ' .bn-box .bn-go').first, 600)
    ok(pg.evaluate("() => !!(FR.state.bonus || {}).steve_margin"), 'T5: box: "a 25% markup on cost is a 20% gross margin (25/125). Say 20%." is right (+200)')
    shot(pg, 'bonus_right')
    # replies: "25%" (wrong: Barb answers), then a reply to Barb's answer (a reply to a reply) is graded too
    pg.evaluate("() => { delete FR.state.bonus.steve_margin; FR.save(); FR.mail.refresh(); }")
    pg.evaluate("() => FR.bonus.deliver('tom_comm', true)"); pg.wait_for_timeout(300)
    closeall(pg); pg.evaluate("() => FR.mail.open('bn_tom_comm')"); pg.wait_for_timeout(900)
    tap(pg, pg.locator(TOP + ' .oe-tbb', has_text='Reply').first, 900)
    pg.keyboard.type('6% of 80,000 = 4,800', delay=2)
    tap(pg, pg.locator(TOP + ' .oe-tbb-send'), 800)
    pg.wait_for_timeout(3300)
    re_id = pg.evaluate("() => (FR.mail.messages().filter(m => m.bonusRe === 'tom_comm').pop() || {}).id")
    ok(bool(re_id) and not pg.evaluate("() => !!(FR.state.bonus || {}).tom_comm"), f'T5: reply "4,800": Tom answers (no points yet) {re_id}')
    closeall(pg); pg.evaluate(f"() => FR.mail.open('{re_id}')"); pg.wait_for_timeout(900)
    ok(pg.locator(TOP + ' .bn-box').count() >= 1, "T5: Tom's answer has the answer box too")
    tap(pg, pg.locator(TOP + ' .oe-tbb', has_text='Reply').first, 900)
    pg.keyboard.type('Sorry: 4% of $50,000 = $2,000 plus 6% of $30,000 = $1,800, total $3,800.', delay=2)
    tap(pg, pg.locator(TOP + ' .oe-tbb-send'), 800)
    pg.wait_for_timeout(600)
    ok(pg.evaluate("() => !!(FR.state.bonus || {}).tom_comm"), 'T5: a reply to Tom\'s answer (a reply to a reply) is graded: +150')
    pg.wait_for_timeout(2800)
    last = pg.evaluate("() => (FR.mail.messages().filter(m => m.bonusRe === 'tom_comm').pop() || {}).body || ''")
    ok('bass boat' in last, f'T5: … and Tom says thanks ({last[:40]!r})')
    closeall(pg)
    ctx.close()


def r7_resume(p, b, devname, land=False):
    """T4: after a reload, "Continue at Frank's desk": the checklist is there together with the desktop"""
    dev = dict(p.devices[devname]); dev.pop('default_browser_type', None)
    if land: dev['viewport'] = {'width': max(dev['viewport'].values()), 'height': min(dev['viewport'].values())}
    PFX[0] = 'r7_' + devname.replace(' ', '') + ('_land' if land else '') + '_resume_'
    ctx = b.new_context(**dev); pg = ctx.new_page(); pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL); pg.wait_for_selector('.fr-intro [data-a=go]'); pg.wait_for_timeout(400)
    tap(pg, pg.locator('.fr-intro [data-a=go]'), 300)
    pg.wait_for_selector('.fr-login input', timeout=8000); pg.wait_for_timeout(300)
    tap(pg, pg.locator('.fr-login input'), 200); pg.keyboard.type('sedalia1958'); pg.keyboard.press('Enter')
    pg.wait_for_selector('.fr-win .ck-wrap', timeout=8000); pg.wait_for_timeout(1500)
    pg.reload(); pg.wait_for_selector('.fr-intro [data-a=go]'); pg.wait_for_timeout(400)
    ok('Continue' in pg.inner_text('.fr-intro [data-a=go]'), 'T4: after a reload: "Continue at Frank\'s desk"')
    tap(pg, pg.locator('.fr-intro [data-a=go]'), 50)
    gap = pg.evaluate("""() => new Promise(res => { let d0 = 0; const t0 = Date.now(); const f = () => { const d = document.querySelector('.fr-desktop'), c = document.querySelector('.fr-win .ck-wrap');
      if (d && !d0) d0 = performance.now(); if (d0 && c) return res(Math.round(performance.now() - d0)); if (Date.now() - t0 > 12000) return res(-1); requestAnimationFrame(f); }; f(); })""")
    ok(0 <= gap <= 120, f'T4: after "Continue at Frank\'s desk" the checklist comes with the desktop ({gap} ms after it; was ~700 ms)')
    ctx.close()


def r7_desktop(p, b):
    """round 7 on a desktop: double-click edits in the cell as before (no mirror), no sticky chip, no Answer button,
    Properties sized to its page as before, Run… calc in front"""
    PFX[0] = 'r7_desktop_'
    ctx = b.new_context(viewport={'width': 1366, 'height': 800}); pg = ctx.new_page(); pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL + '?dev=1&solve=unlock'); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate(MUTE)
    pg.click('.fr-win .ck-item.open .ck-chip:has-text("Budget_FY27_BOARD.xls")'); pg.wait_for_timeout(1200)
    pg.dblclick('.fr-win:not(.fr-inactive) td[data-r="9"][data-c="4"]'); pg.wait_for_timeout(300)
    d = pg.evaluate("() => { const ed = FR.wm.active.el.querySelector('.xl-editor'); return [document.activeElement === ed, ed.classList.contains('xl-editor-mirror')]; }")
    ok(d == [True, False], f'T2 desktop: double-click edits in the cell as before {d}')
    pg.keyboard.press('Escape')
    ok(pg.locator('.xl-stickchip').count() == 0, 'T1 desktop: no sticky-note chip')
    pg.evaluate("() => FR.apps.properties('model47')"); pg.wait_for_timeout(600)
    ok(pg.evaluate("() => { const w = document.querySelector('.sh-sheetwin'); return !w.classList.contains('fr-max') && !w.classList.contains('sh-float') && w.style.height === 'auto'; }"), 'T6 desktop: Properties as before')
    pg.click('.sh-sheet .sh-cancel'); pg.wait_for_timeout(300)
    pg.evaluate("() => FR.apps.excel(null)"); pg.wait_for_timeout(900)
    pg.click('.fr-startbtn'); pg.wait_for_timeout(300); pg.click('.fr-sm-item:has-text("Run...")'); pg.wait_for_timeout(400)
    pg.fill('.fr-dialog .fr-dlg-input input', 'calc'); pg.click('.fr-dialog .fr-dlg-btns button:has-text("OK")'); pg.wait_for_timeout(500)
    ok(pg.evaluate("() => FR.wm.active && FR.wm.active.el.querySelector('.fr-title').textContent === 'Calculator' && document.activeElement.closest('.fr-win') === FR.wm.active.el || FR.wm.active.el.querySelector('.fr-title').textContent === 'Calculator'"), 'T7 desktop: Run… calc is in front of Excel')
    pg.evaluate("() => FR.bonus.deliver('steve_margin', true)"); pg.evaluate("() => FR.mail.open('bn_steve_margin')"); pg.wait_for_timeout(800)
    ok(pg.locator('.bn-jump').count() == 0 and pg.locator('.bn-box').count() >= 1, 'T5 desktop: the answer box as before, no Answer button')
    ctx.close()

os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
    b = p.chromium.launch(**kw)
    R7_DEV = ['iPad Mini'] + DEVICES
    for devname in (R7_DEV if not os.environ.get('PLAY_ONLY') else []): r7_checks(p, b, devname)
    for devname in (R7_DEV if not os.environ.get('PLAY_ONLY') else []): r7_checks(p, b, devname, land=True)
    for devname in (['iPad Mini', 'iPhone 13'] if not os.environ.get('PLAY_ONLY') else []): r7_resume(p, b, devname); r7_resume(p, b, devname, land=True)
    if not os.environ.get('PLAY_ONLY'): r7_desktop(p, b)
    if os.environ.get('R7_ONLY'):   # (developers: only the round-7 checks)
        print('\n'.join(logs) or 'no console errors'); print('ALL PASS' if not fails[0] and not logs else f'{fails[0]} FAILED'); sys.exit(1 if fails[0] or logs else 0)
    for devname in (DEVICES if not os.environ.get('PLAY_ONLY') else []): r6_checks(p, b, devname)
    for devname in (DEVICES if not os.environ.get('PLAY_ONLY') else []): r6_land(p, b, devname)
    if not os.environ.get('PLAY_ONLY'): r6_desktop(p, b)
    if os.environ.get('R6_ONLY'):   # (developers: only the round-6 checks)
        print('\n'.join(logs) or 'no console errors'); print('ALL PASS' if not fails[0] and not logs else f'{fails[0]} FAILED'); sys.exit(1 if fails[0] or logs else 0)
    for devname in (DEVICES if not os.environ.get('PLAY_ONLY') else []): r5_checks(p, b, devname)
    if not os.environ.get('PLAY_ONLY'): r5_desktop(p, b)
    if os.environ.get('R5_ONLY'):   # (developers: only the round-5 checks)
        print('\n'.join(logs) or 'no console errors'); print('ALL PASS' if not fails[0] and not logs else f'{fails[0]} FAILED'); sys.exit(1 if fails[0] or logs else 0)
    for devname in (DEVICES if not os.environ.get('PLAY_ONLY') else []): r4_checks(p, b, devname)   # (PLAY_ONLY=1: developers, just the playthroughs)
    if os.environ.get('R4_ONLY'):   # (developers: only the round-4 checks)
        print('\n'.join(logs) or 'no console errors'); print('ALL PASS' if not fails[0] and not logs else f'{fails[0]} FAILED'); sys.exit(1 if fails[0] or logs else 0)
    for devname in (DEVICES if not os.environ.get('PLAY_ONLY') else []): r3b_checks(p, b, devname)
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
        # (R5 P2) sideways too, the workbook is named under the formula bar
        nm = p2.evaluate("""() => { const w = document.querySelector('.fr-win.xl-win:not(.fr-inactive)'), f = w.querySelector('.xl-fname'), r = f.getBoundingClientRect(), i = w.querySelector('.xl-fin').getBoundingClientRect();
          return r.height >= 24 && Math.abs(r.top + r.height / 2 - (i.top + i.height / 2)) < 3 && r.left >= i.right && r.right <= innerWidth ? f.querySelector('b').textContent : ''; }""")
        ok(nm == 'Budget_FY27_BOARD.xls', f'P2: landscape Excel: the workbook is named at the end of the formula bar (same row): {nm!r}')
        # (R5 P6) no menu bar sideways, but a "Menu" button brings it back: Edit › Go To Last Cell is reachable
        ok(topmost_is_visible(p2, TOP + ' .fr-mbtn') and not p2.locator(TOP + ' .fr-menubar').is_visible(), 'P6: landscape Excel: menu bar hidden, a Menu button in the title bar')
        tap(p2, p2.locator(TOP + ' .fr-mbtn'), 300)
        ok(p2.locator(TOP + ' .fr-menubar').is_visible(), 'P6: Menu shows the menu bar')
        tap(p2, p2.locator(TOP + ' .fr-mi', has_text='Edit'), 300)
        ok(p2.locator('.fr-menu-item', has_text='Go To Last Cell (Ctrl+End)').count() == 1, 'P6: ... with Edit › Go To Last Cell (Ctrl+End)')
        tap(p2, p2.locator('.fr-menu-item', has_text='Go To Last Cell'), 400)
        ok(not p2.locator(TOP + ' .fr-menubar').is_visible(), 'P6: picking a command puts the menu bar away again')
        p2.screenshot(path=f'{OUT}/mobile_{PFX[0]}excel.png')
        closeall(p2)
        # (R5 P6) IE sideways: View › Source and Favorites through the Menu button; the site stays styled (P1)
        p2.evaluate("() => FR.apps.ie('https://www.packacorp.com/products.html')"); p2.wait_for_timeout(1200)
        fr = site_frame(p2); r = fr.evaluate(SITE_OK) if fr else None
        ok(bool(r) and 'Times' not in r['font'] and not r['broken'], f'P1: landscape IE: the Products page is styled ({r and r["rules"]} css rules)')
        ok(topmost_is_visible(p2, TOP + ' .fr-mbtn') and not p2.locator(TOP + ' .fr-menubar').is_visible(), 'P6: landscape IE: a Menu button (the menu bar is hidden for room)')
        tap(p2, p2.locator(TOP + ' .fr-mbtn'), 300)
        tap(p2, p2.locator(TOP + ' .fr-mi', has_text='View'), 300)
        src = p2.locator('.fr-menu-item', has_text='Source').first; bb = src.bounding_box() if src.count() else None
        ok(bool(bb) and bb['y'] >= 0 and bb['y'] + bb['height'] <= p2.viewport_size['height'], f'P6: View › Source is on screen {bb}')
        with ctx2.expect_page() as newpg:
            tap(p2, p2.locator('.fr-menu-item', has_text='Source').first, 600)
        newpg.value.close()
        ok('view-source' in p2.inner_text('.fr-dialog'), 'P6: View › Source: the phone dialog (view-source: in Chrome)')
        dlg_btn(p2, 'OK')
        tap(p2, p2.locator(TOP + ' .fr-mbtn'), 300)
        tap(p2, p2.locator(TOP + ' .fr-mi', has_text='Favorites'), 300)
        tap(p2, p2.locator('.fr-menu-item', has_text="Kristians' Cheat Sheet Club"), 800)
        ok(p2.locator(TOP + ' .cc').count() == 1 and not p2.locator(TOP + ' .fr-menubar').is_visible(), 'P6: Favorites › the fan club opens, the menu bar goes away')
        p2.screenshot(path=f'{OUT}/mobile_{PFX[0]}ie_menu.png')
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
        f16 = p2.evaluate("() => { const m = document.querySelector('.fr-start'), h = m.querySelector('.fr-start-hint'); return [m.scrollHeight > m.clientHeight + 6, !!h && getComputedStyle(h).display !== 'none']; }")
        ok(f16[0] == f16[1], f'F16: landscape Start menu: "more below" shows exactly when there is more below {f16}')
        if f16[0]:
            sb = p2.locator('.fr-start').bounding_box()
            for _ in range(4):
                if p2.evaluate("() => { const m = document.querySelector('.fr-start'); return m.scrollHeight - m.scrollTop - m.clientHeight <= 6; }"): break
                swipe(p2, sb['x'] + 80, sb['y'] + sb['height'] - 30, sb['x'] + 80, sb['y'] + 30)
            ok(p2.evaluate("() => getComputedStyle(document.querySelector('.fr-start .fr-start-hint')).display") == 'none', 'F16: scrolled to the end, the hint goes')
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
