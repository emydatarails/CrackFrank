"""Full honest v3 playthrough via the UI (checklist chips, pickers, Excel typing).
Usage: python3 test/play.py [W H] [stopAfterItemId]
packacorp.com is routed to the local *.html pages in the repo root (the website_patch versions)."""
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
PAGES = {'/': 'home.html', '/index.html': 'home.html'}


def site(route):
    path = re.sub(r'^https?://[^/]+', '', route.request.url).split('?')[0].split('#')[0] or '/'
    f = os.path.join(ROOT, 'test', 'site', PAGES.get(path, path.lstrip('/')))
    if os.path.isfile(f) and f.endswith('.html'):
        route.fulfill(status=200, content_type='text/html', body=open(f, encoding='utf-8').read())
    else:
        route.fulfill(status=404, content_type='text/html', body='<h1>404</h1>')


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
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': W, 'height': H})
    ctx.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), site)
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and '404' not in m.text else None)
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
    note('chip karen: ' + str(chip(pg, "Karen's email"))); pg.locator('.fr-win:not(.fr-inactive) .title-bar-controls button[aria-label=Close]').first.click(); pg.wait_for_timeout(300)
    pg.evaluate("() => FR.wm.wins.get('xl-covenant').focus()")
    xl_type(pg, 'F23', '=F8/F20'); note('trap 1.30: dialogs %s solved %s H23 %s' % (dlg_msgs(pg), solved(pg), pg.evaluate("()=>0")))
    shot(pg, 'dscr_trap')
    for d in dlg_msgs(pg): dlg_btn(pg)
    xl_type(pg, 'F13', '=F11-F12')
    xl_type(pg, 'F23', '=(F8-F13)/F20'); pg.wait_for_timeout(900); shot(pg, 'dscr_ok')
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
    note('chip careers: ' + str(chip(pg, 'Careers page'))); pg.wait_for_timeout(1200); shot(pg, 'ie_careers')
    note('careers every other friday: %s' % pg.frame_locator('.fr-win:not(.fr-inactive) iframe').locator('body').inner_text().count('every other Friday'))
    pg.locator('.fr-win:not(.fr-inactive) .title-bar-controls button[aria-label=Close]').first.click(); pg.wait_for_timeout(300)
    pg.evaluate("() => FR.wm.wins.get('xl-cash13').focus()")
    for col in 'BDFHJLN':
        xl_type(pg, col + '14', '196')
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
    note('chip products: ' + str(chip(pg, 'Products page'))); pg.wait_for_timeout(1200)
    note('products 1,500 tons: %s' % pg.frame_locator('.fr-win:not(.fr-inactive) iframe').locator('body').inner_text().count('1,500 tons'))
    pg.locator('.fr-win:not(.fr-inactive) .title-bar-controls button[aria-label=Close]').first.click(); pg.wait_for_timeout(300)
    drew = pg.evaluate("() => (FR.mail.messages().find(m=>m.subject==='BRIDGE')||{}).body || 'NO DREW BRIDGE MAIL'")
    note('drew bridge quotes tons formula: %s' % ('x tons' in drew))
    pg.evaluate("() => FR.wm.wins.get('xl-bridge').focus()")
    xl_type(pg, 'C9', '-50'); xl_type(pg, 'C11', '-50')
    note('plug -50/-50: solved=%s dialogs=%s' % (solved(pg), dlg_msgs(pg)))
    for d in dlg_msgs(pg): dlg_btn(pg)
    xl_type(pg, 'C9', '=-40*1500/1000'); xl_type(pg, 'C11', '=C12-C6-C7-C8-C9-C10'); pg.wait_for_timeout(900); shot(pg, 'bridge_done')
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
