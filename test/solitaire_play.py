"""Solitaire (src/apps/solitaire.js) through the UI: a fresh Klondike deal (7 piles of 1..7, tops face up, 24 in the stock),
dealing from the stock, a legal and an illegal drag, an ace to a foundation by double-click, Undo, Options (Draw Three +
Vegas, with Vegas's three-pass limit), Deck…, the 12 MEWC face cards (names on the cards and in Help › The Face Cards…),
a won game (bouncing cards + "Game over. Deal again?"), then an iPhone 13 by touch (tap-select + tap-move, double-tap,
touch drag, 7 columns fit, landscape) and an iPhone SE (320 px).
Usage: python3 test/solitaire_play.py   (Playwright's Chromium, like test/play.py; runs on file:// with ?dev=1)
Set CHROMIUM=/path/to/chrome to use a specific browser build."""
import os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
URL = 'file://' + ROOT + '/dist/index.html?dev=1'
fails, errors = [0], []
NAMES = ['Diarmuid Early', 'Michael Jarman', 'Andrew “The Annihilator” Ngai', 'Jean Wolleh', 'Jaq Kennedy', 'Nicolas Micot']
FACE_IDS = [r + s for r in 'KQJ' for s in 'SHDC']
ALL = [r + s for s in 'SHDC' for r in ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']]


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg, flush=True)
    if not cond: fails[0] += 1


def watch(pg):
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.on('pageerror', lambda e: errors.append(str(e)))


T = 'FR.apps.solitaire._test'
st = lambda pg: pg.evaluate(f'{T}.state()')
status = lambda pg: pg.evaluate("() => [...FR.wm.wins.get('solitaire').el.querySelectorAll('.status-bar-field')].map(f => f.textContent)")


def center(pg, cid, fy=0.55):
    r = pg.evaluate(f'{T}.rect({cid!r})')
    return r['x'] + r['w'] / 2, r['y'] + r['h'] * fy


def load(pg, spec):
    used = [c.lstrip('#') for p in spec.get('tab', []) + spec.get('found', []) for c in p] + [c.lstrip('#') for c in spec.get('waste', [])]
    spec = dict(spec, stock=[c for c in ALL if c not in used])
    pg.evaluate(f'spec => {T}.load(spec)', spec); pg.wait_for_timeout(150)


# a small position: J♣ can go on Q♥, 8♥ on 9♠, the A♥ is free; 9♠ on 8♥ is illegal
POS = {'tab': [['KS'], ['#5D', 'QH'], ['#7C', 'JC'], ['#8D', 'AH'], ['#3S', '9S'], ['#4H', '8H'], ['#6C', '2S']]}


def menu(pg, top, item):
    pg.locator('.so-win .fr-menubar .fr-mi', has_text=top).click(); pg.wait_for_timeout(150)
    pg.locator('.fr-menu-item', has_text=item).first.click(); pg.wait_for_timeout(250)


def dialog_text(pg):
    pg.wait_for_selector('.fr-dialog', timeout=4000); return pg.inner_text('.fr-dialog .fr-dlg-msg')


def close_dialog(pg, label=None):
    btns = pg.locator('.fr-dialog .fr-dlg-btns button')
    (btns.filter(has_text=label).first if label else btns.last).click(); pg.wait_for_timeout(250)


def felt(pg, fx=0.5, fy=0.85):
    b = pg.locator('.so-table').bounding_box(); return b['x'] + b['width'] * fx, b['y'] + b['height'] * fy


def stock_click(pg):
    b = pg.locator('.so-stock').bounding_box(); pg.mouse.click(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2); pg.wait_for_timeout(40)


os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
    b = p.chromium.launch(**kw)

    # ================= desktop =================
    pg = b.new_page(viewport={'width': 1366, 'height': 800}); watch(pg)
    pg.goto(URL); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(700)
    pg.evaluate('FR.apps.solitaire()'); pg.wait_for_selector('.so-win .so-card'); pg.wait_for_timeout(1100)
    title = pg.evaluate("() => FR.wm.wins.get('solitaire').el.querySelector('.fr-title').textContent")
    ok(title == 'Solitaire', 'window "Solitaire" opens')
    ok(pg.evaluate("() => FR.apps.solitaire() === FR.wm.wins.get('solitaire') && FR.wm.wins.size >= 1"), 'opening it again focuses the same window')
    ok(pg.locator('.so-win .fr-menubar .fr-mi').all_inner_texts() == ['Game', 'Help'], 'menus: Game, Help')

    pg.evaluate(f'{T}.deal(20261008)'); pg.wait_for_timeout(1000)
    s = st(pg)
    ok([len(t) for t in s['tab']] == [1, 2, 3, 4, 5, 6, 7], 'tableau: 7 piles of 1..7 cards')
    ok(all(t[-1].endswith('+') and all(c.endswith('-') for c in t[:-1]) for t in s['tab']), 'tableau: only the top card of each pile is face up')
    ok(len(s['stock']) == 24 and not s['waste'] and all(not f for f in s['found']), 'stock 24, waste and foundations empty')
    ok(pg.locator('.so-card').count() == 52 and pg.locator('.so-card:not(.down)').count() == 7, '52 cards drawn, 7 face up')
    ok(s['solvable'], f'the deal passed the solver (seed {s["seed"]})')
    ok(status(pg) == ['Score: 0', 'Time: 0'], 'status bar: Score 0, Time 0')
    pg.screenshot(path=f'{OUT}/solitaire_deal.png')

    top = s['stock'][-1]
    stock_click(pg); s = st(pg)
    ok(len(s['stock']) == 23 and s['waste'] == [top] and pg.locator(f'.so-card[data-id="{top}"]:not(.down)').count() == 1, f'click the stock: {top} turns over onto the waste')
    ok(s['undo'] == 1, 'the deal can be undone')

    # ---- drag & drop on a known position
    load(pg, POS)
    fx, fy = center(pg, 'JC'); tx, ty = center(pg, 'QH')
    pg.mouse.move(fx, fy); pg.mouse.down(); pg.mouse.move(fx + 8, fy + 8, steps=2); pg.mouse.move(tx, ty + 18, steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
    s = st(pg)
    ok(s['tab'][1][-2:] == ['QH+', 'JC+'] and s['tab'][2] == ['7C+'], 'legal drag: J♣ onto Q♥, the 7♣ underneath turns over')
    ok(status(pg)[0] == 'Score: 5', 'score +5 for turning over a card: ' + status(pg)[0])
    fx, fy = center(pg, '9S'); tx, ty = center(pg, '8H')
    pg.mouse.move(fx, fy); pg.mouse.down(); pg.mouse.move(fx + 8, fy + 8, steps=2); pg.mouse.move(tx, ty + 18, steps=8); pg.mouse.up(); pg.wait_for_timeout(400)
    s = st(pg)
    ok(s['tab'][4] == ['3S-', '9S+'] and s['tab'][5] == ['4H-', '8H+'], 'illegal drag (9♠ onto 8♥) is rejected')
    r9 = pg.evaluate(f'{T}.rect("9S")'); g = pg.evaluate(f'{T}.pileRect("tab", 4)')
    ok(abs(r9['x'] - g['x']) < 2 and abs(r9['y'] - g['y']) < 2, '... and the 9♠ slides back to its pile')

    # ---- double-click an ace to a foundation, then Undo
    x, y = center(pg, 'AH'); pg.mouse.dblclick(x, y); pg.wait_for_timeout(300)
    s = st(pg)
    ok(['AH'] in s['found'] and s['tab'][3] == ['8D+'], 'double-click: A♥ goes to a foundation (8♦ turns over)')
    ok(status(pg)[0] == 'Score: 20', 'score +10 to the foundation, +5 turn over: ' + status(pg)[0])
    menu(pg, 'Game', 'Undo'); s = st(pg)
    ok(s['tab'][3] == ['8D-', 'AH+'] and all(not f for f in s['found']) and status(pg)[0] == 'Score: 5', 'Game › Undo puts the ace back (score 5)')
    pg.keyboard.press('Control+z'); s = st(pg)
    ok(s['tab'][2] == ['7C-', 'JC+'] and s['tab'][1] == ['5D-', 'QH+'], 'Ctrl+Z undoes the move before it too (multi-level Undo)')

    # ---- click a card, click where it goes (XP's other way of moving)
    x, y = center(pg, 'JC'); pg.mouse.click(x, y); pg.wait_for_timeout(120)
    ok(st(pg)['sel'] == ['JC'] and pg.locator('.so-card.so-sel').count() == 1, 'click a card: it is selected')
    x, y = center(pg, 'QH'); pg.mouse.click(x, y); pg.wait_for_timeout(250)
    ok(st(pg)['tab'][1][-1] == 'JC+', 'click the destination: it moves')

    # ---- right-click: auto-play to the foundations
    load(pg, {'tab': [['AS'], ['2S'], ['AH'], ['#5D', '3S'], [], [], []]})
    pg.mouse.click(*felt(pg), button='right'); pg.wait_for_timeout(900)
    ok(pg.evaluate(f'{T}.state().found.map(f => f.length).sort().join()') == '0,0,1,3', 'right-click plays A♠ 2♠ 3♠ and A♥ up')

    # ---- Options: Draw Three + Vegas
    menu(pg, 'Game', 'Options')
    ok(pg.locator('.fr-dialog .so-opt').count() == 1, 'Game › Options… opens')
    pg.click('label[for="so-o-draw-3"]'); pg.click('label[for="so-o-sc-vegas"]'); close_dialog(pg, 'OK'); pg.wait_for_timeout(1000)
    o = pg.evaluate(f'{T}.opts'); s = st(pg)
    ok(o['draw'] == 3 and o['scoring'] == 'vegas', 'Options: Draw three + Vegas scoring')
    ok(len(s['stock']) == 24 and status(pg)[0] == 'Score: $-52', 'a new Vegas deal costs $52: ' + status(pg)[0])
    stock_click(pg); s = st(pg)
    xs = [pg.evaluate(f'{T}.rect({c!r}).x') for c in s['waste']]
    ok(len(s['waste']) == 3 and len(s['stock']) == 21 and xs[0] < xs[1] < xs[2], 'Draw three: three cards turn over, fanned')
    for _ in range(40):
        s = st(pg)
        if not s['stock'] and s['passes'] == 3: break
        stock_click(pg)
    s = st(pg); stock_click(pg); s2 = st(pg)
    ok(s['passes'] == 3 and s2['passes'] == 3 and len(s2['waste']) == 24 and pg.locator('.so-stock.so-x').count() == 1, 'Vegas, Draw three: three passes through the deck, then the stock shows an X')
    pg.screenshot(path=f'{OUT}/solitaire_vegas.png')

    # ---- Deck…
    menu(pg, 'Game', 'Deck')
    ok(pg.locator('.fr-dialog .so-back-pick').count() == 3, 'Game › Deck… offers three card backs')
    pg.click('.fr-dialog .so-back-pick[data-k="packa"]'); close_dialog(pg, 'OK')
    ok('a33a1e' in pg.evaluate("() => getComputedStyle(document.querySelector('.so-table')).getPropertyValue('--so-back')"), 'the Packa-red box back is in use')

    # ---- the face cards: MEWC competitors
    faces = pg.evaluate(f'() => Object.keys({T}.FACES).map(id => {T}.faceInfo(id))')
    ok(sorted(f['id'] for f in faces) == sorted(FACE_IDS), 'all 12 face cards (J, Q, K of every suit) are competitors')
    counts = {n: sum(f['name'] == n for f in faces) for n in NAMES}
    ok(all(1 <= c <= 3 for c in counts.values()) and sum(counts.values()) == 12, 'each competitor on 1-3 cards: ' + ', '.join(f'{k.split()[-1]} {v}' for k, v in counts.items()))
    load(pg, {'tab': [['KS', 'QH', 'JS'], ['KH', 'QS', 'JH'], ['KD', 'QC', 'JD'], ['KC', 'QD', 'JC'], [], [], []]})
    txt = pg.evaluate("() => Object.fromEntries([...document.querySelectorAll('.so-card')].filter(e => /^[JQK]/.test(e.dataset.id)).map(e => [e.dataset.id, e.textContent]))")
    miss = [i for i in FACE_IDS if next(f for f in faces if f['id'] == i)['last'].upper() not in txt.get(i, '')]
    ok(not miss, 'every face card on the table shows its competitor\'s name' + (': missing ' + ', '.join(miss) if miss else ''))
    ok('2025 World Champion' in txt['KS'] and 'EARLY' in txt['KS'], 'K♠ = Diarmuid Early, 2025 World Champion')
    pg.screenshot(path=f'{OUT}/solitaire_faces_table.png')
    menu(pg, 'Help', 'The Face Cards')
    gal = pg.locator('.so-gal .so-gc')
    ok(gal.count() == 12, 'Help › The Face Cards… shows 12 cards')
    gtext = pg.inner_text('.so-gal')
    ok(all(n in gtext for n in NAMES) and 'Excel World Championship' in gtext, 'the gallery names all six competitors and the championship')
    pg.evaluate("FR.wm.wins.get('so-faces').maximize()"); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{OUT}/solitaire_faces.png')
    pg.evaluate("FR.wm.wins.get('so-faces').close()"); pg.wait_for_timeout(300)

    # ---- Help
    menu(pg, 'Help', 'About Solitaire'); t = dialog_text(pg); close_dialog(pg)
    ok('favourite way to "reconcile"' in t and 'Excel World Championship' in t, 'Help › About: Frank\'s favourite way to "reconcile"; face cards celebrate the MEWC')
    menu(pg, 'Help', 'Contents'); t2 = dialog_text(pg); close_dialog(pg)
    ok('mouse pad' in t2, 'Help › Contents: "Frank was using it as a mouse pad."')
    ok('Datarails' not in t + t2 + gtext and 'FinanceOS' not in t + t2 + gtext, 'no Datarails inside Solitaire')

    # ---- a won game: the last four kings go up by right-click
    load(pg, {'found': [[r + s for r in ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q']] for s in 'SHDC'], 'tab': [['KS'], ['KH'], ['KD'], ['KC'], [], [], []]})
    pg.mouse.click(*felt(pg), button='right'); pg.wait_for_timeout(1400)
    s = st(pg)
    ok(s['won'] and all(len(f) == 13 for f in s['found']), 'all 52 cards on the foundations: won')
    ok(pg.locator('.so-table canvas.so-fx').count() == 1 and pg.evaluate(f'{T}.fx()'), 'the bouncing-cards cascade starts')
    pg.wait_for_timeout(1500)
    painted = pg.evaluate("""() => { const c = document.querySelector('.so-fx'); const x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < x.length; i += 4 * 97) if (x[i]) n++; return n; }""")
    ok(painted > 50, f'... and paints bouncing cards on the felt ({painted} samples)')
    pg.screenshot(path=f'{OUT}/solitaire_win.png')
    pg.mouse.click(*felt(pg, 0.5, 0.6))
    t = dialog_text(pg)
    ok(t.startswith('Game over. Deal again?'), 'a click ends it: "Game over. Deal again?"')
    close_dialog(pg, 'Yes'); pg.wait_for_timeout(1000); s = st(pg)
    ok(not s['won'] and len(s['stock']) == 24 and pg.locator('.so-fx').count() == 0, 'Yes deals a new game')
    seed = s['seed']; pg.keyboard.press('F2'); pg.wait_for_timeout(1000)
    ok(st(pg)['seed'] != seed, 'F2 deals again (new seed)')
    pg.evaluate("FR.wm.wins.get('solitaire').close()"); pg.wait_for_timeout(300)
    ok(not pg.evaluate("FR.wm.wins.has('solitaire')"), 'Game › Exit / close')
    pg.close()

    # ================= phone: iPhone 13, by touch =================
    dev = dict(p.devices['iPhone 13']); dev.pop('default_browser_type', None)
    ctx = b.new_context(**dev); pg = ctx.new_page(); watch(pg)
    cdp = ctx.new_cdp_session(pg)
    pg.goto(URL); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate('FR.apps.solitaire()'); pg.wait_for_selector('.so-win .so-card'); pg.wait_for_timeout(1200)
    ok(pg.evaluate("FR.wm.wins.get('solitaire').max"), 'phone: the window fills the screen')
    g = pg.evaluate(f'{T}.geo()')
    ok(40 <= g['W'] <= 56 and g['tabX'][6] + g['W'] <= g['tw'] and g['tabX'][0] >= 0, f'phone: 7 columns fit ({g["W"]}px cards in {g["tw"]}px)')
    ok(pg.evaluate('() => document.documentElement.scrollWidth <= innerWidth'), 'phone: no sideways scrolling')
    ok(pg.evaluate("() => getComputedStyle(document.querySelector('.so-table')).touchAction") == 'none', 'phone: the table never scrolls the page (touch-action: none)')
    ok(pg.locator('.so-tools button').count() == 4 and pg.locator('.so-tools').is_visible(), 'phone: Deal / Undo / Auto / Options buttons')
    pg.screenshot(path=f'{OUT}/solitaire_phone.png')
    load(pg, POS)
    x, y = center(pg, 'JC'); pg.touchscreen.tap(x, y); pg.wait_for_timeout(450)
    ok(st(pg)['sel'] == ['JC'] and pg.locator('.so-tgt').count() == 1, 'tap J♣: selected, its one legal target (Q♥) is highlighted')
    pg.screenshot(path=f'{OUT}/solitaire_phone_select.png')
    x, y = center(pg, 'QH'); pg.touchscreen.tap(x, y); pg.wait_for_timeout(450)
    s = st(pg)
    ok(s['tab'][1][-1] == 'JC+' and s['sel'] is None and pg.locator('.so-tgt').count() == 0, 'tap Q♥: J♣ moves there')
    x, y = center(pg, 'AH'); pg.touchscreen.tap(x, y); pg.wait_for_timeout(120); pg.touchscreen.tap(x, y); pg.wait_for_timeout(400)
    ok(['AH'] in st(pg)['found'], 'double-tap A♥: it goes to a foundation')
    fx, fy = center(pg, '8H'); tx, ty = center(pg, '9S')
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': fx, 'y': fy}]})
    for i in range(1, 11):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': fx + (tx - fx) * i / 10, 'y': fy + (ty + 14 - fy) * i / 10}]}); pg.wait_for_timeout(16)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(400)
    ok(st(pg)['tab'][4][-1] == '8H+' and pg.evaluate('() => scrollY') == 0, 'touch drag: 8♥ onto 9♠ (the page does not scroll)')
    pg.locator('.so-tools button', has_text='Undo').tap(); pg.wait_for_timeout(300)
    ok(st(pg)['tab'][5][-1] == '8H+', 'Undo button')
    load(pg, {'tab': [['KS', 'QH', 'JS'], ['KH', 'QS', 'JH'], ['KD', 'QC', 'JD'], ['KC', 'QD', 'JC'], [], [], []]}); pg.wait_for_timeout(200)
    pg.screenshot(path=f'{OUT}/solitaire_phone_faces.png')
    # a long column squeezes to fit the height
    load(pg, {'tab': [['#AS', '#2S', '#3S', '#4S', '#5S', '#6S', 'KH', 'QS', 'JH', '10S', '9H', '8S', '7H', '6D', '5C', '4H', '3C', '2H'], [], [], [], [], [], []]})
    bot = pg.evaluate(f'() => {{ const r = {T}.rect("2H"), t = document.querySelector(".so-table").getBoundingClientRect(); return [r.y + r.h, t.bottom]; }}')
    ok(bot[0] <= bot[1] + 0.5, f'phone: an 18-card column squeezes to fit ({bot[0]:.0f} ≤ {bot[1]:.0f})')
    pg.screenshot(path=f'{OUT}/solitaire_phone_long.png')
    menu(pg, 'Help', 'The Face Cards'); pg.wait_for_timeout(400)
    ok(pg.locator('.so-gal .so-gc').count() == 12 and pg.evaluate('() => document.documentElement.scrollWidth <= innerWidth'), 'phone: the face-card gallery fits')
    pg.screenshot(path=f'{OUT}/solitaire_phone_gallery.png')
    pg.evaluate("FR.wm.wins.get('so-faces').close()"); pg.wait_for_timeout(300)
    # landscape
    pg.set_viewport_size({'width': 844, 'height': 390}); pg.wait_for_timeout(700)
    pg.evaluate(f'{T}.deal(7)'); pg.wait_for_timeout(1100)
    g = pg.evaluate(f'{T}.geo()')
    ok(g['wide'] and g['found'][1]['x'] + g['W'] <= g['tw'] and g['tabY'] + g['H'] * 2 <= g['th'], f'landscape: stock | 7 columns | foundations fit ({g["W"]}px cards)')
    pg.screenshot(path=f'{OUT}/solitaire_phone_landscape.png')
    ctx.close()

    # iPhone SE: 320 px wide
    se = dict(p.devices['iPhone SE']); se.pop('default_browser_type', None)
    ctx = b.new_context(**se); pg = ctx.new_page(); watch(pg)
    pg.goto(URL); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    pg.evaluate('FR.apps.solitaire()'); pg.wait_for_selector('.so-win .so-card'); pg.wait_for_timeout(1200)
    g = pg.evaluate(f'{T}.geo()')
    ok(g['W'] >= 38 and g['tabX'][6] + g['W'] <= g['tw'], f'iPhone SE: 7 columns fit ({g["W"]}px cards in {g["tw"]}px)')
    ctx.close()
    b.close()

ok(not errors, 'no console errors' + ('' if not errors else ': ' + ' | '.join(errors[:5])))
print(f'{fails[0]} FAILED' if fails[0] else 'ALL PASS')
sys.exit(1 if fails[0] else 0)
