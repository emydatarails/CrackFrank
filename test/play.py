"""Full honest v3 playthrough via the UI (checklist chips, pickers, Excel typing).
Usage: python3 test/play.py [W H] [stopAfterItemId]
packacorp.com is routed to the local copies in test/site/ (pages, css and images: test/site_route.py)."""
import sys, os, re
from playwright.sync_api import sync_playwright

W = int(sys.argv[1]) if len(sys.argv) > 1 else 1366
H = int(sys.argv[2]) if len(sys.argv) > 2 else 800
STOP = sys.argv[3] if len(sys.argv) > 3 else None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
os.makedirs(OUT, exist_ok=True)
URL = 'file://' + ROOT + '/dist/index.html'
logs, n = [], [0]
sys.path.insert(0, os.path.join(ROOT, 'test'))
from site_route import site  # packacorp.com: the local copies in test/site/ with their css + images (round 5, P1)


def shot(pg, name):
    n[0] += 1
    pg.screenshot(path=f'{OUT}/{W}x{H}_{n[0]:02d}_{name}.png')


def note(s):
    print('--', s, flush=True)


def ck(pg):
    """make sure the checklist is open and on top (via the tray icon, like a player)"""
    if not pg.evaluate("() => !!FR.wm.wins.get('checklist') && FR.wm.active && FR.wm.active.id === 'checklist'"):
        pg.locator('.fr-pack').click(); pg.wait_for_timeout(350)
    return pg.locator('.fr-win .ck-item.open').first


def chip(pg, label):
    ck(pg).locator('.ck-chip', has_text=label).first.click(); pg.wait_for_timeout(900)
    return pg.evaluate("() => FR.wm.active && [FR.wm.active.id, FR.wm.active.el.querySelector('.fr-title').textContent]")


def solved(pg):
    return pg.evaluate("() => Object.keys(FR.state.solved).join(',')")


def fb(pg):
    f = pg.locator('.fr-win .ck-item.open .ck-fb')
    return f.first.inner_text() if f.count() else ''


def dlg_msgs(pg):
    return pg.eval_on_selector_all('.fr-dialog .fr-dlg-msg', 'els => els.map(e => e.innerText)')


def dlg_btn(pg, text=None):
    b = pg.locator('.fr-dialog .fr-dlg-btns button', has_text=text) if text else pg.locator('.fr-dialog .fr-dlg-btns button')
    b.last.click(); pg.wait_for_timeout(300)


def dlg_input(pg, value):
    pg.wait_for_selector('.fr-dialog .fr-dlg-input input', timeout=4000)
    inp = pg.locator('.fr-dialog .fr-dlg-input input').last
    inp.fill(value); inp.press('Enter'); pg.wait_for_timeout(500)


def ex_dbl(pg, id_):
    """double-click an item in the top-most explorer window"""
    it = pg.locator(f'.fr-win:not(.fr-inactive) .ex-view [data-id="{id_}"]').first
    it.dblclick(); pg.wait_for_timeout(700)


def xl_type(pg, cell, text):
    nb = pg.locator('.fr-win:not(.fr-inactive) .xl-nb-in')
    nb.click(); nb.fill(cell); nb.press('Enter'); pg.wait_for_timeout(120)
    pg.keyboard.type(text); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)


def paint_erase(pg):
    """Paint is open on Frank's Kristians drawing: take the Eraser and rub the whole picture out, row by row"""
    pg.locator('.pt-win .pt-tool[data-t=eraser]').click(); pg.wait_for_timeout(150)
    bb = pg.locator('.pt-win .pt-cv').bounding_box()
    for y in range(4, int(bb['height']), 26):
        pg.mouse.move(bb['x'] + 2, bb['y'] + y); pg.mouse.down()
        pg.mouse.move(bb['x'] + bb['width'] - 2, bb['y'] + y, steps=12); pg.mouse.up()
    pg.wait_for_timeout(300)


SOL = 'FR.apps.solitaire._test'


def sol_lucky_win(pg):
    """Solitaire › Game › Frank's Lucky Deal, then win it by mouse: right-click sends what it can home, two kings go
    to empty columns and the queen of hearts onto the king of clubs"""
    pg.locator('.so-win .fr-menubar .fr-mi', has_text='Game').click(); pg.wait_for_timeout(150)
    pg.locator('.fr-menu-item', has_text="Frank's Lucky Deal").click(); pg.wait_for_timeout(900)

    def drag(cid, pile):
        r = pg.evaluate(f'{SOL}.rect({cid!r})'); t = pg.evaluate(f'{SOL}.pileRect("tab", {pile})')
        pg.mouse.move(r['x'] + r['w'] / 2, r['y'] + r['h'] * 0.3); pg.mouse.down()
        pg.mouse.move(t['x'] + t['w'] / 2, t['y'] + t['h'] * 0.3, steps=8); pg.mouse.up(); pg.wait_for_timeout(300)

    def auto():
        bx = pg.locator('.so-table').bounding_box(); pg.mouse.click(bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] * 0.92, button='right'); pg.wait_for_timeout(1800)
    auto(); drag('KC', 6); auto(); drag('QH', 6); drag('KH', 0); auto()
    pg.wait_for_timeout(2500)


def closeall(pg):
    for _ in range(20):
        ws = pg.locator('.fr-win:not(.fr-dialog):not(.fr-closing) .title-bar-controls button[aria-label=Close]')
        d = pg.locator('.fr-dialog .fr-dlg-btns button')
        if d.count():
            no = pg.locator('.fr-dialog .fr-dlg-btns button', has_text='No')
            (no.last if no.count() else d.last).click(); pg.wait_for_timeout(250); continue
        ids = pg.evaluate("() => [...FR.wm.wins.values()].filter(w => w.id !== 'checklist').map(w => w.id)")
        if not ids: return
        pg.evaluate("id => FR.wm.wins.get(id).focus()", ids[-1])
        pg.locator('.fr-win:not(.fr-inactive) .title-bar-controls button[aria-label=Close]').first.click()
        pg.wait_for_timeout(250)


def stop(pg, item, b):
    if STOP == item:
        print('\n'.join(logs)); b.close(); sys.exit()


with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}))
    ctx = b.new_context(viewport={'width': W, 'height': H})
    ctx.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(URL); pg.wait_for_timeout(500); shot(pg, 'intro')

    # ---- 1 login
    pg.click('[data-a=go]'); pg.wait_for_timeout(3000); shot(pg, 'login')
    pg.click('.fr-q'); pg.wait_for_timeout(200)
    note('login hint: ' + pg.inner_text('.fr-login-hint'))
    for w in ['packa1958', 'sedalia']:
        pg.fill('.fr-pw-row input', w); pg.press('.fr-pw-row input', 'Enter'); pg.wait_for_timeout(250)
    note('login hint after fails: ' + pg.inner_text('.fr-login-hint')); shot(pg, 'login_fail')
    pg.fill('.fr-pw-row input', 'Sedalia 1958'); pg.press('.fr-pw-row input', 'Enter')
    pg.wait_for_timeout(3600); shot(pg, 'desktop')
    note('solved ' + solved(pg))

    # ---- 2 version
    note('chip diane: ' + str(chip(pg, "Diane's email"))); shot(pg, 'diane_which')
    note('diane body has tests: %s' % pg.locator('.fr-win:not(.fr-inactive) .oe-mbody').inner_text()[:80].replace('\n', ' '))
    closeall(pg)
    note('chip budget: ' + str(chip(pg, 'FY27 Budget folder')))
    note('budget folder items: ' + str(pg.eval_on_selector_all('.fr-win:not(.fr-inactive) .ex-view [data-id]', 'e=>e.map(x=>x.dataset.id)')))
    closeall(pg)
    note('chip home: ' + str(chip(pg, 'packacorp.com home'))); pg.wait_for_timeout(1200); shot(pg, 'ie_home')
    closeall(pg)
    gm = {}
    for fid in ['bud_v3', 'bud_v4', 'bud_v5ff', 'bud_v5ut', 'bud_v6']:
        ck(pg).locator('.ck-file small').nth(['bud_v3', 'bud_v4', 'bud_v5ff', 'bud_v5ut', 'bud_v6'].index(fid)).click(); pg.wait_for_timeout(700)
        gm[fid] = pg.evaluate("""() => { const t=[...document.querySelectorAll('.fr-win:not(.fr-inactive) .xl-grid tr')].find(r=>/Gross margin %/.test(r.innerText)); return t ? t.innerText.replace(/\\s+/g,' ') : 'NO GM ROW'; }""")
        if fid == 'bud_v5ut': shot(pg, 'v5ut')
        closeall(pg)
    note('GM rows: ' + str(gm))
    c = ck(pg).locator('.ck-file', has_text='v5_FINAL_FINAL').first
    c.locator('.ck-pickbtn').click(); pg.wait_for_timeout(300); dlg_btn(pg, 'Send to Diane'); pg.wait_for_timeout(300)
    note('wrong version fb: ' + fb(pg))
    ck(pg).locator('.ck-file', has_text='v5_FINAL_USE_THIS').first.locator('.ck-pickbtn').click(); pg.wait_for_timeout(300)
    dlg_btn(pg, 'Send to Diane'); pg.wait_for_timeout(400); shot(pg, 'version_done')
    note('solved ' + solved(pg))
    stop(pg, 'version', b)

    # ---- 3 unlock
    note('chip v5: ' + str(chip(pg, 'The approved version')))
    a1 = pg.locator('.fr-win:not(.fr-inactive) .xl-grid td').filter(has_text='Packa Corporation').first
    a1.hover(); pg.wait_for_timeout(900)
    note('v5ut comment: ' + str(pg.evaluate("()=>{const t=[...document.querySelectorAll('.xl-cmtip')].pop(); return t && getComputedStyle(t).display+' '+t.innerText}")))
    shot(pg, 'v5ut_comment'); closeall(pg)
    note('chip about: ' + str(chip(pg, 'About Us'))); pg.wait_for_timeout(1000); shot(pg, 'ie_about'); closeall(pg)
    note('chip quality: ' + str(chip(pg, 'Quality & Safety'))); pg.wait_for_timeout(1000); closeall(pg)
    note('chip board: ' + str(chip(pg, 'Budget_FY27_BOARD.xls'))); shot(pg, 'board_pw')
    dlg_input(pg, '1993'); note('wrong pw: ' + str(dlg_msgs(pg))); dlg_btn(pg)
    note('active after dialog: ' + str(pg.evaluate("() => FR.wm.active && FR.wm.active.id")))
    chip(pg, 'Budget_FY27_BOARD.xls'); dlg_input(pg, '4,406'); pg.wait_for_timeout(900); shot(pg, 'board_open')
    note('solved ' + solved(pg))
    stop(pg, 'unlock', b)

    # ---- 4 ebitda (Excel is on top with C12 selected)
    rows = pg.evaluate("""() => [...document.querySelectorAll('.fr-win:not(.fr-inactive) .xl-grid tr')].slice(0,16).map(r=>r.innerText.replace(/\\s+/g,' ').trim())""")
    note('board rows: ' + str(rows))
    xl_type(pg, 'C12', '=C7-C9-C10-C11-C13')  # trap-ish attempt first? keep honest: wrong then right
    note('after wrong formula: dialogs=%s solved=%s' % (dlg_msgs(pg), solved(pg)))
    for d in dlg_msgs(pg): dlg_btn(pg)
    note('active after nudge: ' + str(pg.evaluate("() => FR.wm.active && FR.wm.active.id")))
    xl_type(pg, 'C12', '=C7-C9-C10-C11'); pg.wait_for_timeout(900)
    note('after C12 only: dialogs=%s solved=%s' % (dlg_msgs(pg), solved(pg)))
    for d in dlg_msgs(pg): dlg_btn(pg)
    for col in 'EFGH': xl_type(pg, col + '12', '=%s7-%s9-%s10-%s11' % (col, col, col, col)); pg.wait_for_timeout(300)
    pg.wait_for_timeout(900); shot(pg, 'ebitda_fixed')
    note('solved ' + solved(pg) + ' dialogs ' + str(dlg_msgs(pg)))
    note('sticky: ' + str(pg.eval_on_selector_all('.xl-sticky', 'e=>e.map(x=>x.innerText)')))
    closeall(pg)
    stop(pg, 'ebitda', b)

    # ---- 5 dscr
    note('chip bank: ' + str(chip(pg, 'Bank')))
    ex_dbl(pg, 'bankzip'); note('zip dialogs: ' + str(dlg_msgs(pg))); shot(pg, 'zip')
    if pg.locator('.fr-dialog .fr-dlg-input input').count(): dlg_input(pg, '3130')
    note('zip view: ' + str(pg.eval_on_selector_all('.fr-win:not(.fr-inactive) .ex-view [data-id]', 'e=>e.map(x=>x.dataset.id)')))
    ex_dbl(pg, 'loan')
    if pg.locator('.fr-dialog .fr-dlg-input input').count(): dlg_input(pg, '3130')
    shot(pg, 'loan')
    note('loan text: ' + pg.evaluate("() => (FR.data.texts.loan||'').slice(0,60)"))
    pg.evaluate("() => { const w=[...FR.wm.wins.values()].find(w=>/Bank\\.zip/i.test(w.el.querySelector('.fr-title').textContent)); w && w.focus(); }")
    ex_dbl(pg, 'covenant'); shot(pg, 'covenant')
    pg.evaluate("() => FR.wm.wins.get('xl-covenant').focus()")
    xl_type(pg, 'F13', '0'); note('trap 1.30 (no capex off): dialogs %s solved %s' % (dlg_msgs(pg), solved(pg)))
    shot(pg, 'dscr_trap')
    for d in dlg_msgs(pg): dlg_btn(pg)
    # the cash-paid capex is under Frank's Kristians drawing: My Pictures › Paint › Eraser
    note('chip pictures: ' + str(chip(pg, 'My Pictures')))
    ex_dbl(pg, 'pt_k'); pg.wait_for_selector('.pt-win .pt-cv'); pg.wait_for_timeout(500)
    paint_erase(pg); shot(pg, 'paint_secret')
    note('paint secret revealed: %s' % pg.evaluate("() => !!FR.flags.get('paintSecret')"))
    pg.evaluate("() => FR.wm.wins.get('paint').close()"); pg.wait_for_timeout(300)
    if dlg_msgs(pg): dlg_btn(pg, 'No')
    pg.evaluate("() => FR.wm.wins.get('xl-covenant').focus()")
    xl_type(pg, 'F13', '110'); pg.wait_for_timeout(900); shot(pg, 'dscr_ok')
    note('solved ' + solved(pg) + ' dialogs ' + str(dlg_msgs(pg)))
    for d in dlg_msgs(pg): dlg_btn(pg)
    closeall(pg)
    stop(pg, 'dscr', b)

    # ---- 6 cash
    pg.wait_for_timeout(3500)
    note('mail after dscr: ' + str(pg.evaluate("() => FR.mail.messages().filter(m=>m.id.startsWith('x_')).map(m=>m.subject)")))
    note('chip BOARD: ' + str(chip(pg, 'BOARD')))
    note('boardroot items (no hidden): ' + str(pg.eval_on_selector_all('.fr-win:not(.fr-inactive) .ex-view [data-id]', 'e=>e.map(x=>x.dataset.id)')))
    pg.locator('.fr-win:not(.fr-inactive) .fr-mi', has_text='Tools').click(); pg.wait_for_timeout(150)
    pg.locator('.fr-menu-item', has_text='Folder Options').click(); pg.wait_for_timeout(400)
    pg.locator('.sh-sheet [role=tab]', has_text='View').click(); pg.wait_for_timeout(150)
    pg.locator('.sh-sheet label', has_text='Show hidden files and folders').last.click(); pg.locator('.sh-sheet .sh-ok').click(); pg.wait_for_timeout(400)
    note('boardroot items (hidden): ' + str(pg.eval_on_selector_all('.fr-win:not(.fr-inactive) .ex-view [data-id]', 'e=>e.map(x=>x.dataset.id)')))
    ex_dbl(pg, 'cashdir'); shot(pg, 'realversion')
    note('real items: ' + str(pg.eval_on_selector_all('.fr-win:not(.fr-inactive) .ex-view [data-id]', 'e=>e.map(x=>x.dataset.id)')))
    ex_dbl(pg, 'realnotes'); pg.wait_for_timeout(300); shot(pg, 'realnotes')
    note('realnotes: ' + pg.evaluate("() => FR.data.texts.realnotes").replace('\n', ' | ')[:400])
    pg.locator('.fr-win:not(.fr-inactive) .title-bar-controls button[aria-label=Close]').first.click(); pg.wait_for_timeout(300)
    ex_dbl(pg, 'cash13'); pg.wait_for_timeout(500)
    note('chip rachel: ' + str(chip(pg, "Rachel's email"))); pg.locator('.fr-win:not(.fr-inactive) .title-bar-controls button[aria-label=Close]').first.click(); pg.wait_for_timeout(300)
    # the payroll run is Frank's Solitaire secret: win a game (his Lucky Deal) and Bob gives it away
    note('chip solitaire: ' + str(chip(pg, 'Solitaire')))
    sol_lucky_win(pg); shot(pg, 'solitaire_secret')
    note('solitaire won: %s, Bob says: %s' % (pg.evaluate(f'{SOL}.state().won'), pg.text_content('.so-bob-sec') if pg.locator('.so-bob-sec').count() else 'NO BOB'))
    pg.evaluate("() => FR.wm.wins.get('solitaire').close()"); pg.wait_for_timeout(300)
    pg.evaluate("() => FR.wm.wins.get('xl-cash13').focus()")
    xl_type(pg, 'B14', '196')
    shot(pg, 'cash_payroll')
    ends = pg.evaluate("""() => { const r=[...document.querySelectorAll('.fr-win:not(.fr-inactive) .xl-grid tr')].find(r=>/^\\s*\\d*\\s*Ending cash/.test(r.innerText)); return r ? r.innerText.replace(/\\s+/g,' ') : 'none'; }""")
    note('ending cash row: ' + ends)
    ck(pg).locator('.ck-weeks button', has_text=re.compile(r'^6$')).click(); pg.wait_for_timeout(300)
    note('wrong week 6 fb: ' + fb(pg))
    ck(pg).locator('.ck-weeks button', has_text=re.compile(r'^5$')).click(); pg.wait_for_timeout(500); shot(pg, 'cash_done')
    note('solved ' + solved(pg))
    closeall(pg)
    stop(pg, 'cash', b)

    # ---- 7 bridge
    pg.wait_for_timeout(3500)
    note('chip board mtg: ' + str(chip(pg, 'Board Meeting Oct 20')))
    note('board mtg items: ' + str(pg.eval_on_selector_all('.fr-win:not(.fr-inactive) .ex-view [data-id]', 'e=>e.map(x=>x.dataset.id)')))
    ex_dbl(pg, 'bridge'); shot(pg, 'bridge')
    note('chip mill: ' + str(chip(pg, 'The mill letter'))); pg.locator('.fr-win:not(.fr-inactive) .title-bar-controls button[aria-label=Close]').first.click(); pg.wait_for_timeout(300)
    drew = pg.evaluate("() => (FR.mail.messages().find(m=>m.subject==='BRIDGE')||{}).body || 'NO DREW BRIDGE MAIL'")
    note('drew bridge points at the quarantine: %s' % ('Quarantine' in drew))
    pg.evaluate("() => FR.wm.wins.get('xl-bridge').focus()")
    xl_type(pg, 'C9', '-50')
    note('plug -50: solved=%s dialogs=%s' % (solved(pg), dlg_msgs(pg)))
    for d in dlg_msgs(pg): dlg_btn(pg)
    # Frank's containerboard calc is in Norton's quarantine: the shield in the tray › Quarantine › Restore
    note('chip norton: ' + str(chip(pg, 'Norton AntiVirus')))
    pg.locator('.nv-win .nv-nav', has_text='Quarantine').click(); pg.wait_for_timeout(300); shot(pg, 'norton_quarantine')
    pg.locator('.nv-win .nv-main button', has_text='Restore').click(); pg.wait_for_timeout(1500); shot(pg, 'cbcalc')
    note('restored, opened: %s' % pg.evaluate("() => FR.wm.active && FR.wm.active.el.querySelector('.fr-title').textContent"))
    pg.evaluate("() => FR.wm.wins.get('xl-bridge').focus()")
    xl_type(pg, 'C9', '-60'); pg.wait_for_timeout(900); shot(pg, 'bridge_done')
    note('solved ' + solved(pg) + ' dialogs ' + str(dlg_msgs(pg)))
    for d in dlg_msgs(pg): dlg_btn(pg)
    closeall(pg)
    stop(pg, 'bridge', b)

    # ---- 8 forboard
    pg.wait_for_timeout(3500)
    note('chip forboard: ' + str(chip(pg, 'FOR THE BOARD folder')))
    ex_dbl(pg, 'forboardx'); dlg_input(pg, '43182'); note('wrong: ' + str(dlg_msgs(pg))); dlg_btn(pg)
    ex_dbl(pg, 'forboardx'); dlg_input(pg, '18243'); pg.wait_for_timeout(900); shot(pg, 'forboard_open')
    note('solved ' + solved(pg))
    closeall(pg)
    stop(pg, 'forboard', b)

    # ---- 9 send
    pg.wait_for_timeout(3500)
    note('chip outlook: ' + str(chip(pg, 'Outlook Express'))); pg.wait_for_timeout(500); shot(pg, 'outlook_send')
    row = pg.locator('.fr-win:not(.fr-inactive) tr[data-id]', has_text='Send me the pack')
    note('send-row count %d' % row.count())
    row.first.click(); pg.wait_for_timeout(300)
    pg.locator('.fr-win:not(.fr-inactive) .oe-tbb', has_text='Reply').first.click(); pg.wait_for_timeout(700); shot(pg, 'reply')
    pg.locator('.fr-win:not(.fr-inactive) .oe-tbb-send').click(); pg.wait_for_timeout(700)
    note('solved ' + solved(pg))
    pg.wait_for_timeout(9000); shot(pg, 'after_send')
    note('new mail: ' + str(pg.evaluate("() => FR.mail.messages().filter(m=>m.id.startsWith('x_')).map(m => m.from.name + ': ' + m.subject)")))
    closeall(pg)
    stop(pg, 'send', b)

    # ---- 10 frank
    note('chip rachel knew: ' + str(chip(pg, "Rachel's email"))); closeall(pg)
    note('chip recycle: ' + str(chip(pg, 'Recycle Bin')))
    note('recycle items: ' + str(pg.eval_on_selector_all('.fr-win:not(.fr-inactive) .ex-view [data-id]', 'e=>e.map(x=>x.dataset.id)')))
    closeall(pg)
    ck(pg).locator('.ck-sus', has_text='Drew').click(); pg.wait_for_timeout(300); note('wrong drew: ' + fb(pg)); shot(pg, 'suspects')
    ck(pg).locator('.ck-sus', has_text='Kristians').click(); pg.wait_for_timeout(500)
    note('solved ' + solved(pg))
    pg.wait_for_timeout(4200); shot(pg, 'frank_reveal')
    note('reveal window: ' + str(pg.evaluate("() => FR.wm.active && FR.wm.active.id")))
    pg.locator('.fr-win:not(.fr-inactive) .title-bar-controls button[aria-label=Close]').first.click(); pg.wait_for_timeout(1200); shot(pg, 'ending')
    note('ending: ' + (pg.inner_text('.fr-end')[:300].replace('\n', ' | ') if pg.locator('.fr-end').count() else 'NONE'))
    b.close()
    print('\n'.join(logs) or 'no console errors')
