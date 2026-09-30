"""Paint (src/apps/paint.js) through the UI: Frank's kristians_by_frank.bmp is drawn (deterministically), the tools draw
real pixels (pencil, brush, fill, rectangle, ellipse, line, text, select + move, eraser), undo/redo, Flip/Rotate, Invert,
Attributes, zoom, menus, About, Print; Save As keeps the picture in the saved game (reload → still in My Pictures and
File › Open; Explorer opens and deletes it; Low Disk Space when full), a signed-in player's picture shows up on another
computer (test/local_server.js), and on a phone (iPhone 13 emulation) drawing, colours and panning work by touch.
Usage: python3 test/paint_play.py   (Playwright's Chromium; set CHROMIUM=/path/to/chrome to use another one)"""
import os, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
URL = 'file://' + ROOT + '/dist/index.html?dev=1'
PORT = int(os.environ.get('PORT', '8131'))
fails, errors = [0], []


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg, flush=True)
    if not cond: fails[0] += 1


JS_STATS = """() => { const c = document.querySelector('.pt-cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let white = 0, red = 0, pink = 0, h = 2166136261;
  for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r === 255 && g === 255 && b === 255) white++; if (r === 255 && g === 0 && b === 0) red++; if (r === 255 && g === 0 && (b === 255 || b === 128)) pink++;
    h = Math.imul(h ^ r ^ (g << 8) ^ (b << 16), 16777619) >>> 0; }
  return { w: c.width, h: c.height, total: c.width * c.height, nonwhite: c.width * c.height - white, red, pink, hash: h }; }"""
JS_PX = """([x, y]) => Array.from(document.querySelector('.pt-cv').getContext('2d').getImageData(x, y, 1, 1).data.slice(0, 3))"""


def stats(pg): return pg.evaluate(JS_STATS)
def px(pg, x, y): return pg.evaluate(JS_PX, [x, y])


def at(pg, x, y):
    """client coordinates of canvas pixel (x, y)"""
    b = pg.locator('.pt-cv').bounding_box(); w = pg.evaluate("() => document.querySelector('.pt-cv').width")
    z = b['width'] / w
    return b['x'] + (x + 0.5) * z, b['y'] + (y + 0.5) * z


def drag(pg, pts, button='left'):
    x, y = at(pg, *pts[0]); pg.mouse.move(x, y); pg.mouse.down(button=button)
    for p in pts[1:]:
        x, y = at(pg, *p); pg.mouse.move(x, y, steps=4)
    pg.mouse.up(button=button); pg.wait_for_timeout(60)


def click(pg, x, y, button='left'): drag(pg, [(x, y)], button)
def tool(pg, t): pg.click(f'.pt-tool[data-t="{t}"]'); pg.wait_for_timeout(40)
def swatch(pg, i, button='left'): pg.click(f'.pt-sw[data-i="{i}"]', button=button)


def menu(pg, top, item):
    pg.locator('.pt-win .fr-menubar .fr-mi', has_text=top).first.click(); pg.wait_for_timeout(120)
    pg.locator('.pt-win .fr-menu-drop .fr-menu-item', has_text=item).first.click(); pg.wait_for_timeout(200)


def dlg_button(pg, text):
    pg.locator('.fr-dialog .fr-dlg-btns button', has_text=text).last.click(); pg.wait_for_timeout(250)


def open_paint(pg):
    pg.evaluate("() => { FR.wm.wins.forEach(w => { if (!w.el.classList.contains('fr-dialog')) w.close(); }); FR.apps.paint(); }")
    pg.wait_for_selector('.pt[data-ready]', timeout=5000); pg.wait_for_timeout(150)


def save_as(pg, name):
    menu(pg, 'File', 'Save As...')
    pg.fill('.fr-dialog .pt-fd-name', name); dlg_button(pg, 'Save'); pg.wait_for_timeout(200)


def listen(pg, allow=()):
    pg.on('console', lambda m: m.type == 'error' and not any(a in m.text for a in allow) and errors.append(m.text))
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.route('https://www.packacorp.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<h1>Packa</h1>'))


os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
    b = p.chromium.launch(**kw)

    # ------------------------------------------------------------------ desktop
    ctx = b.new_context(viewport={'width': 1366, 'height': 800}, accept_downloads=True)
    pg = ctx.new_page(); listen(pg)
    pg.goto(URL); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(600)
    pg.evaluate("() => { localStorage.clear(); FR.state.paint = undefined; }")
    open_paint(pg)
    title = pg.evaluate("() => FR.wm.wins.get('paint').el.querySelector('.fr-title').textContent")
    ok(title == 'kristians_by_frank.bmp - Paint', 'opens on Frank\'s drawing: ' + title)
    s0 = stats(pg)
    ok(s0['w'] == 480 and s0['h'] == 360, f"canvas 480x360 ({s0['w']}x{s0['h']})")
    ok(0.08 * s0['total'] < s0['nonwhite'] < 0.6 * s0['total'], f"the Kristians drawing is on the canvas ({s0['nonwhite']} non-white pixels)")
    ok(s0['red'] > 1500 and s0['pink'] > 300, f"hearts: {s0['red']} pure red and {s0['pink']} pink pixels")
    ok(px(pg, 2, 2) == [255, 255, 255] and px(pg, 54, 36) == [255, 255, 0], 'white paper, a yellow (bucket-filled) sun')
    pg.screenshot(path=f'{OUT}/paint_desktop.png')
    pg.locator('.pt-cv').screenshot(path=f'{OUT}/paint_kristians.png')
    open_paint(pg)
    ok(stats(pg)['hash'] == s0['hash'], 'the drawing is deterministic (same pixels when opened again)')
    ok(pg.locator('.pt-tool').count() == 16 and pg.locator('.pt-sw').count() == 28, 'tool box has 16 tools, colour box 28 colours')

    # menus open and close; About; Print
    for top in ['File', 'Edit', 'View', 'Image', 'Colors', 'Help']:
        pg.locator('.pt-win .fr-menubar .fr-mi', has_text=top).first.click(); pg.wait_for_timeout(80)
        n = pg.locator('.pt-win .fr-menu-drop .fr-menu-item').count()
        pg.keyboard.press('Escape'); pg.wait_for_timeout(60)
        ok(n >= 1 and pg.locator('.pt-win .fr-menu-drop').count() == 0, f'{top} menu opens ({n} items) and closes')
    menu(pg, 'Help', 'About Paint')
    ok('Version 5.1' in pg.inner_text('.fr-dialog') and 'Frank Warmington' in pg.inner_text('.fr-dialog'), 'Help › About Paint')
    dlg_button(pg, 'OK')
    menu(pg, 'File', 'Print...')
    ok('HP LaserJet 4 — Finance (no toner)' in pg.inner_text('.fr-dialog'), 'Print: HP LaserJet 4 — Finance (no toner)')
    dlg_button(pg, 'OK')
    txt = pg.inner_text('.pt-win')
    ok('Datarails' not in txt and 'FinanceOS' not in txt, 'no Datarails inside Paint')

    # File › New: a blank canvas to test the tools on
    menu(pg, 'File', 'New')
    s = stats(pg)
    ok(s['nonwhite'] == 0 and pg.evaluate("() => FR.wm.wins.get('paint').el.querySelector('.fr-title').textContent") == 'untitled - Paint', 'File › New: blank, untitled')

    tool(pg, 'pencil'); drag(pg, [(20, 20), (100, 20)])
    ok(px(pg, 60, 20) == [0, 0, 0] and px(pg, 60, 22) == [255, 255, 255], 'pencil draws a 1 px black line')
    swatch(pg, 16); tool(pg, 'brush'); drag(pg, [(20, 50), (100, 52)])
    ok(px(pg, 60, 51) == [255, 0, 0], 'left-click red + brush paints red')
    swatch(pg, 20, 'right')
    ok(pg.evaluate("() => getComputedStyle(document.querySelector('.pt-bgc')).backgroundColor") == 'rgb(0, 0, 255)', 'right-click a colour sets the background (blue)')
    swatch(pg, 14, 'right')
    tool(pg, 'rect'); drag(pg, [(150, 30), (250, 100)])
    ok(px(pg, 150, 60) == [255, 0, 0] and px(pg, 200, 65) == [255, 255, 255], 'rectangle outline')
    tool(pg, 'fill'); before = stats(pg)['red']; click(pg, 200, 65)
    after = stats(pg)['red']
    ok(px(pg, 200, 65) == [255, 0, 0] and after - before > 90 * 60, f'bucket fills the rectangle ({after - before} px)')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(80)
    ok(px(pg, 200, 65) == [255, 255, 255], 'Ctrl+Z undoes the fill')
    pg.keyboard.press('Control+y'); pg.wait_for_timeout(80)
    ok(px(pg, 200, 65) == [255, 0, 0], 'Ctrl+Y redoes it')
    pg.keyboard.press('Control+z'); pg.keyboard.press('Control+z'); pg.wait_for_timeout(80)
    ok(px(pg, 150, 60) == [255, 255, 255], 'multi-level undo (rectangle gone too)')
    pg.keyboard.press('Control+y'); pg.wait_for_timeout(80)
    ok(px(pg, 150, 60) == [255, 0, 0] and px(pg, 200, 65) == [255, 255, 255], 'redo brings the rectangle back')
    swatch(pg, 20, 'right'); tool(pg, 'fill'); click(pg, 400, 300, 'right')
    ok(px(pg, 400, 300) == [0, 0, 255] and px(pg, 200, 65) == [255, 255, 255], 'right-button fill uses the background colour, stops at the outline')
    pg.keyboard.press('Control+z'); swatch(pg, 14, 'right')
    tool(pg, 'ellipse'); pg.click('.pt-o[data-k="mode"][data-v="1"]'); swatch(pg, 0); swatch(pg, 17, 'right')
    drag(pg, [(300, 150), (380, 210)])
    ok(px(pg, 340, 180) == [255, 255, 0] and px(pg, 300, 180) == [0, 0, 0] and px(pg, 301, 151) == [255, 255, 255], 'ellipse: outline (FG) + fill (BG)')
    swatch(pg, 14, 'right')
    tool(pg, 'line'); pg.click('.pt-o[data-k="line"][data-v="3"]'); drag(pg, [(20, 300), (200, 300)])
    ok(px(pg, 100, 299) == [0, 0, 0] and px(pg, 100, 301) == [0, 0, 0] and px(pg, 100, 303) == [255, 255, 255], 'line, 3 px wide')
    def black(x0, y0, w, h):
        return pg.evaluate("([x, y, w, h]) => { const d = document.querySelector('.pt-cv').getContext('2d').getImageData(x, y, w, h).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] === 0) n++; return n; }", [x0, y0, w, h])
    tool(pg, 'curve'); drag(pg, [(310, 300), (460, 300)]); drag(pg, [(385, 300), (385, 250)]); drag(pg, [(430, 300), (430, 330)])
    ok(px(pg, 385, 300) == [255, 255, 255] and black(310, 240, 151, 60) > 150, 'curve: a line bent twice')
    tool(pg, 'poly'); pg.click('.pt-o[data-k="mode"][data-v="2"]')
    drag(pg, [(400, 100), (470, 100)]); pg.wait_for_timeout(500); click(pg, 470, 140); pg.wait_for_timeout(500); click(pg, 400, 100)
    ok(px(pg, 460, 110) == [0, 0, 0] and px(pg, 405, 135) == [255, 255, 255], 'polygon, filled, closed by clicking the start')
    pg.click('.pt-o[data-k="mode"][data-v="0"]')
    tool(pg, 'air'); x, y = at(pg, 440, 230); pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(250); pg.mouse.up()
    dots = black(428, 218, 25, 25)
    ok(8 < dots < 400, f'airbrush sprays dots ({dots})')
    tool(pg, 'free'); drag(pg, [(395, 95), (475, 95), (475, 145), (395, 145), (395, 100)])
    ok(pg.locator('.pt-svg .pt-ants').get_attribute('d').startswith('M'), 'free-form select draws marching ants')
    pg.keyboard.press('Delete'); pg.wait_for_timeout(60)
    ok(px(pg, 460, 110) == [255, 255, 255], 'free-form selection deleted')
    tool(pg, 'text'); click(pg, 30, 200); pg.keyboard.type('HELLO FRANK')
    ok(pg.locator('.pt-ta').count() == 1 and pg.locator('.pt-fontbar.on').count() == 1, 'text tool: text box and Fonts toolbar')
    # (F21, round 4) the text box is transparent to start with (it doesn't blank out the drawing); the Opaque option still works
    ok(pg.evaluate("() => getComputedStyle(document.querySelector('.pt-ta')).backgroundColor") == 'rgba(0, 0, 0, 0)' and pg.locator('.pt-opts .pt-o.on[data-k=topaque][data-v="0"]').count() == 1, 'text box is transparent by default (Transparent option on)')
    tool(pg, 'pencil')
    ink = pg.evaluate("() => { const d = document.querySelector('.pt-cv').getContext('2d').getImageData(30, 200, 140, 24).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 0) n++; return n; }")
    ok(ink > 60 and pg.locator('.pt-ta').count() == 0, f'text is typed onto the picture ({ink} px)')

    # select + move
    tool(pg, 'select'); drag(pg, [(145, 25), (255, 105)])
    ok(pg.evaluate("() => FR.wm.wins.get('paint').el.querySelectorAll('.status-bar-field')[2].textContent") == '111x81', 'selection size in the status bar')
    drag(pg, [(200, 60), (300, 90)])
    ok(px(pg, 150, 60) == [255, 255, 255] and pg.locator('.pt-float').count() == 1, 'dragging the selection lifts it')
    tool(pg, 'pencil')
    ok(px(pg, 250, 90) == [255, 0, 0] and pg.locator('.pt-float').count() == 0, 'moved rectangle lands 100 px right, 30 px down')
    tool(pg, 'select'); drag(pg, [(240, 80), (360, 140)]); pg.keyboard.press('Delete'); pg.wait_for_timeout(60)
    ok(px(pg, 250, 90) == [255, 255, 255], 'Delete clears the selection')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(60)
    ok(px(pg, 250, 90) == [255, 0, 0], 'undo after Delete')
    tool(pg, 'eraser'); drag(pg, [(20, 20), (100, 20)])
    ok(px(pg, 60, 20) == [255, 255, 255], 'eraser paints the background colour')

    # Image menu
    snap = pg.evaluate("() => { const c = document.querySelector('.pt-cv'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.filter((v, i) => i % 4 === 0)); }")
    menu(pg, 'Image', 'Flip/Rotate...'); dlg_button(pg, 'OK')
    flipped = pg.evaluate("() => { const c = document.querySelector('.pt-cv'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.filter((v, i) => i % 4 === 0)); }")
    ok(all(flipped[y * 480 + x] == snap[y * 480 + 479 - x] for y in range(0, 360, 7) for x in range(0, 480, 5)), 'Flip horizontal mirrors every pixel')
    menu(pg, 'Image', 'Flip/Rotate...'); pg.click('.fr-dialog [name=pt-fr][value=r] + label'); dlg_button(pg, 'OK')
    s = stats(pg); ok(s['w'] == 360 and s['h'] == 480, 'Rotate 90°: 360x480')
    menu(pg, 'Image', 'Flip/Rotate...'); pg.click('.fr-dialog [name=pt-fr][value=r] + label'); pg.click('.fr-dialog [name=pt-ang][value="270"] + label'); dlg_button(pg, 'OK')
    menu(pg, 'Image', 'Flip/Rotate...'); dlg_button(pg, 'OK')
    back = pg.evaluate("() => { const c = document.querySelector('.pt-cv'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.filter((v, i) => i % 4 === 0)); }")
    ok(back == snap, 'rotate 270° + flip again = the original picture')
    menu(pg, 'Image', 'Invert Colors')
    ok(px(pg, 2, 2) == [0, 0, 0] and px(pg, 250, 90) == [0, 255, 255], 'Invert Colors')
    pg.keyboard.press('Control+z')
    menu(pg, 'Image', 'Stretch/Skew...'); pg.fill('.fr-dialog .pt-sh', '50'); dlg_button(pg, 'OK')
    ok(stats(pg)['w'] == 240, 'Stretch 50% horizontally → 240 px wide')
    pg.keyboard.press('Control+z')
    menu(pg, 'Image', 'Attributes...'); pg.fill('.fr-dialog .pt-aw', '300'); pg.fill('.fr-dialog .pt-ah', '200'); dlg_button(pg, 'OK')
    s = stats(pg); ok(s['w'] == 300 and s['h'] == 200, 'Attributes: 300x200')
    pg.keyboard.press('Control+z'); ok(stats(pg)['w'] == 480, 'undo Attributes')

    # zoom
    tool(pg, 'mag'); click(pg, 100, 100)
    cw = pg.evaluate("() => document.querySelector('.pt-cv').getBoundingClientRect().width")
    ok(abs(cw - 480 * 4) < 1 and pg.evaluate("() => document.querySelector('.pt-ws').scrollWidth > document.querySelector('.pt-ws').clientWidth"), 'Magnifier: 4x with scrollbars')
    tool(pg, 'pencil'); drag(pg, [(100, 100), (110, 100)])
    ok(px(pg, 105, 100) == [0, 0, 0], 'drawing while zoomed lands on the right pixels')
    tool(pg, 'mag'); click(pg, 100, 100)
    ok(abs(pg.evaluate("() => document.querySelector('.pt-cv').getBoundingClientRect().width") - 480) < 1, 'Magnifier again: back to 1x')

    # colours: Edit Colors (double-click a swatch)
    pg.dblclick('.pt-sw[data-i="27"]'); pg.wait_for_timeout(150)
    pg.fill('.fr-dialog .pt-eh', '#123456'); dlg_button(pg, 'OK')
    ok(pg.evaluate("() => getComputedStyle(document.querySelector('.pt-fgc')).backgroundColor") == 'rgb(18, 52, 86)', 'Edit Colors: custom colour becomes the foreground')

    # Save As → in the saved game and in My Pictures
    save_as(pg, 'my_art')
    ok(pg.evaluate("() => FR.wm.wins.get('paint').el.querySelector('.fr-title').textContent") == 'my_art.bmp - Paint', 'Save As my_art → my_art.bmp - Paint')
    saved_hash = stats(pg)['hash']
    ok(pg.evaluate("() => FR.state.paint.files.map(f => f.name)") == ['my_art.bmp'], 'saved into FR.state.paint.files')
    ok('my_art.bmp' in pg.evaluate("() => FR.fs.children('pics').map(n => n.name)"), 'listed in My Pictures')
    with pg.expect_download() as dl:
        menu(pg, 'File', 'Save to My Device (PNG)...')
    ok(dl.value.suggested_filename == 'my_art.png', 'Save to My Device downloads my_art.png')

    pg.goto(URL); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(600)
    ok(pg.evaluate("() => (FR.state.paint.files || []).map(f => f.name)") == ['my_art.bmp'], 'after reload the picture is still in the saved game')
    open_paint(pg)
    menu(pg, 'File', 'Open...')
    names = pg.eval_on_selector_all('.fr-dialog .pt-fd-it', 'els => els.map(e => e.dataset.n)')
    ok(names == ['kristians_by_frank.bmp', 'my_art.bmp'], 'File › Open lists Frank\'s drawing and the saved picture')
    pg.locator('.fr-dialog .pt-fd-it', has_text='my_art.bmp').dblclick(); pg.wait_for_timeout(500)
    ok(stats(pg)['hash'] == saved_hash, 'reopened my_art.bmp: pixels match what was saved')
    # Explorer: My Pictures shows it and opens it in Paint
    pg.evaluate("() => { FR.wm.wins.get('paint').close(); FR.apps.explorer('pics'); }"); pg.wait_for_timeout(400)
    ex = pg.locator('.fr-win', has_text='My Pictures').last
    ok(ex.locator('text=my_art.bmp').count() >= 1 and ex.locator('text=kristians_by_frank.bmp').count() >= 1, 'Explorer › My Pictures lists the pictures')
    ex.locator('text=my_art.bmp').first.dblclick(); pg.wait_for_selector('.pt[data-ready]', timeout=5000); pg.wait_for_timeout(300)
    ok(stats(pg)['hash'] == saved_hash, 'double-click in Explorer opens it in Paint')

    # Low Disk Space when My Pictures is full
    pg.evaluate("""() => { const png = document.querySelector('.pt-cv').toDataURL('image/png');
      for (let i = 0; i < 7; i++) FR.state.paint.files.push({ id: 'x' + i, name: 'filler_' + i + '.bmp', w: 480, h: 360, png, savedAt: Date.now() }); FR.save(); }""")
    save_as(pg, 'one_too_many')
    ok('Low Disk Space' in pg.inner_text('.fr-dialog') and '47 versions' in pg.inner_text('.fr-dialog'), 'full: Low Disk Space (47 versions)')
    dlg_button(pg, 'Delete Pictures...')
    pg.locator('.fr-dialog .pt-fd-it', has_text='filler_0.bmp').click(); dlg_button(pg, 'Delete'); dlg_button(pg, 'Yes')
    dlg_button(pg, 'Done'); pg.wait_for_timeout(300)
    names = pg.evaluate("() => FR.state.paint.files.map(f => f.name)")
    ok('filler_0.bmp' not in names and 'one_too_many.bmp' in names and len(names) == 8, 'deleted one, then the save went through')
    # delete from Explorer
    pg.evaluate("() => { FR.wm.wins.get('paint').close(); FR.apps.explorer('pics'); }"); pg.wait_for_timeout(400)
    ex = pg.locator('.fr-win', has_text='My Pictures').last
    ex.locator('text=filler_1.bmp').first.click(); pg.keyboard.press('Delete'); pg.wait_for_timeout(200)
    if pg.locator('.fr-dialog').count(): dlg_button(pg, 'Yes')
    pg.wait_for_timeout(300)
    ok('filler_1.bmp' not in pg.evaluate("() => FR.state.paint.files.map(f => f.name)"), 'Explorer can delete a saved picture')
    ok(ex.locator('text=filler_1.bmp').count() == 0, 'and it is gone from the folder view')
    pg.evaluate("() => { localStorage.clear(); FR.state.paint = undefined; FR.save(); }")
    ctx.close()

    # ------------------------------------------------------------------ phone (touch)
    dev = dict(p.devices['iPhone 13']); dev.pop('default_browser_type', None)
    mctx = b.new_context(**dev)
    m = mctx.new_page(); listen(m)
    m.goto(URL); m.wait_for_selector('.fr-desktop'); m.wait_for_timeout(700)
    open_paint(m)
    vw = m.evaluate('() => innerWidth')
    ok(m.locator('.pt.pt-mob').count() == 1, f'phone layout ({vw}px wide)')
    ok(m.evaluate("() => document.documentElement.scrollWidth <= innerWidth"), 'no horizontal page scroll')
    cb = m.locator('.pt-cv').bounding_box()
    ok(cb['width'] <= vw and cb['width'] > vw * 0.8, f"the drawing fits the screen ({cb['width']:.0f}px)")
    ok(m.evaluate("() => getComputedStyle(document.querySelector('.pt-cv')).touchAction") == 'none', 'touch-action: none on the canvas')
    ok(stats(m)['red'] > 1500, 'Kristians drawing on the phone too')
    m.screenshot(path=f'{OUT}/paint_phone.png')
    cdp = mctx.new_cdp_session(m)

    def touch(points_seq, hold=0):
        """points_seq: list of lists of (x, y) client points per step (1 or 2 fingers)"""
        first = points_seq[0]
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(first)]})
        if hold: m.wait_for_timeout(hold)
        for pts in points_seq[1:]:
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(pts)]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); m.wait_for_timeout(120)

    def center(sel):
        bb = m.locator(sel).bounding_box(); return bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2

    touch([[center('.pt-tool[data-t="pencil"]')]])
    before = stats(m)
    pts = [[at(m, 30 + i * 4, 240)] for i in range(0, 12)]
    touch(pts)
    after = stats(m)
    ok(after['hash'] != before['hash'] and px(m, 50, 240) == [0, 0, 0], 'one finger draws with the pencil')
    touch([[center('.pt-sw[data-i="16"]')]])
    ok(m.evaluate("() => getComputedStyle(document.querySelector('.pt-fgc')).backgroundColor") == 'rgb(255, 0, 0)', 'tap a colour → foreground')
    touch([[center('.pt-sw[data-i="18"]')]], hold=750)
    ok(m.evaluate("() => getComputedStyle(document.querySelector('.pt-bgc')).backgroundColor") == 'rgb(0, 255, 0)' and
       m.evaluate("() => getComputedStyle(document.querySelector('.pt-fgc')).backgroundColor") == 'rgb(255, 0, 0)', 'long-press a colour → background')
    ok('long-press' in m.inner_text('.pt-win .status-bar'), 'status bar explains tap / long-press')
    m.wait_for_timeout(500)   # (a tap right after a long-press is swallowed by the core's tap guard on phones)
    touch([[center('.pt-tool[data-t="brush"]')]])
    touch([[center('.pt-tool[data-t="brush"]')]])
    ok(m.locator('.pt.pt-opts-open .pt-opts').is_visible(), 'tap the active tool again → tool options popover')
    touch([[center('.pt-o[data-k="brush"][data-v="r7"]')]])
    touch([[at(m, 300, 250)], [at(m, 330, 252)], [at(m, 360, 255)]])
    ok(px(m, 330, 252) == [255, 0, 0], 'brush by touch in red')
    # zoom in, then two fingers pan without drawing
    touch([[center('.pt-tool[data-t="mag"]')]]); m.wait_for_selector('.pt-tool.on[data-t="mag"]', timeout=3000); touch([[at(m, 240, 180)]])
    m.wait_for_function("() => document.querySelector('.pt-ws').scrollWidth > document.querySelector('.pt-ws').clientWidth * 2", timeout=3000)
    h0 = stats(m)['hash']; sl0 = m.evaluate("() => [document.querySelector('.pt-ws').scrollLeft, document.querySelector('.pt-ws').scrollTop]")
    touch([[center('.pt-tool[data-t="pencil"]')]]); m.wait_for_selector('.pt-tool.on[data-t="pencil"]', timeout=3000)
    wb = m.locator('.pt-ws').bounding_box(); cx, cy = wb['x'] + wb['width'] / 2, wb['y'] + wb['height'] / 2
    touch([[(cx - 40, cy), (cx + 40, cy)]] + [[(cx - 40 + d, cy + d / 2), (cx + 40 + d, cy + d / 2)] for d in range(10, 90, 10)])
    sl1 = m.evaluate("() => [document.querySelector('.pt-ws').scrollLeft, document.querySelector('.pt-ws').scrollTop]")
    ok(sl1 != sl0 and stats(m)['hash'] == h0, f'two-finger pan scrolls the zoomed picture ({sl0} → {sl1}) and draws nothing')
    m.screenshot(path=f'{OUT}/paint_phone_zoom.png')
    mctx.close()

    # ------------------------------------------------------------------ signed-in player: picture follows to another computer
    server = subprocess.Popen(['node', 'test/local_server.js', str(PORT)], cwd=ROOT, stdout=subprocess.PIPE)
    server.stdout.readline()
    try:
        SURL = f'http://localhost:{PORT}/'
        allow = ('401', '409', 'ERR_FAILED')

        def computer():
            c = b.new_context(viewport={'width': 1366, 'height': 800})
            q = c.new_page(); listen(q, allow); q.goto(SURL); q.wait_for_timeout(600); return q

        def sign(q, mode, user, pw):
            if mode == 'back': q.click('.fr-acct-tabs [data-m=back]')
            q.fill('.fr-acct-form input[name=u]', user); q.fill('.fr-acct-form input[name=p]', pw)
            q.click('.fr-acct-form [type=submit]'); q.wait_for_timeout(700)

        A = computer(); sign(A, 'new', 'painter', 'hearts-212')
        A.click('.fr-intro [data-a=go]'); A.wait_for_selector('.fr-login input', timeout=8000)
        A.fill('.fr-login input', 'sedalia1958'); A.click('.fr-go'); A.wait_for_selector('.fr-desktop', timeout=8000); A.wait_for_timeout(1500)
        open_paint(A)
        tool(A, 'brush'); swatch(A, 16); drag(A, [(20, 330), (200, 330), (200, 350)])
        save_as(A, 'cloud_art')
        h_a = stats(A)['hash']
        # the cloud save goes up ~1.5 s after a change: wait until this browser has nothing unsent
        A.wait_for_function("() => /:0$/.test(localStorage.getItem('frank-player-sync') || '') && (FR.state.paint.files || []).length === 1", timeout=10000)
        A.wait_for_timeout(300)
        B = computer(); sign(B, 'back', 'painter', 'hearts-212')
        ok(B.evaluate("() => ((FR.state.paint || {}).files || []).map(f => f.name)") == ['cloud_art.bmp'], 'signed in on another computer: the picture came along')
        B.click('.fr-intro [data-a=go]'); B.wait_for_selector('.fr-desktop', timeout=8000); B.wait_for_timeout(500)
        ok('cloud_art.bmp' in B.evaluate("() => FR.fs.children('pics').map(n => n.name)"), 'it is in My Pictures there')
        B.evaluate("() => FR.openFile(FR.fs.children('pics').find(n => n.name === 'cloud_art.bmp'))")
        B.wait_for_selector('.pt[data-ready]', timeout=5000); B.wait_for_timeout(400)
        ok(stats(B)['hash'] == h_a, 'same pixels on the second computer')
        A.context.close(); B.context.close()
    finally:
        server.terminate()
    b.close()

ok(not errors, 'no console errors' + ('' if not errors else ': ' + ' | '.join(errors[:5])))
print(f'{fails[0]} FAILED' if fails[0] else 'ALL PASS')
sys.exit(1 if fails[0] else 0)
