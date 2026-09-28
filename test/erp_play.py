"""ShowMe ERP (src/apps/erp.js) through the UI: desktop icon and Start menu open it, every module renders, Reports
export (the counter goes up), Approve and About answer, and no puzzle answer appears anywhere in the ERP.
Usage: python3 test/erp_play.py   (Playwright's Chromium, like test/play.py; runs on file:// with ?dev=1)"""
import os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
URL = 'file://' + ROOT + '/dist/index.html?dev=1'
# the ERP must never give a puzzle away (docs/CANON_DECISIONS.md → "Packa's ERP")
SPOILERS = ['sedalia1958', '4406', '3,130', '3130', '1.25', '18243', '18,243', '$196', '196K', '1,500', '(40)', '−60', 'Bušārs',
            'Kristians', 'v5_FINAL_USE_THIS', 'week 5', '#4471', '4471', '2,860', '2860']
fails, errors = [0], []


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg, flush=True)
    if not cond: fails[0] += 1


def close_dialog(pg):
    pg.locator('.fr-dialog .fr-dlg-btns button').last.click(); pg.wait_for_timeout(200)


os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
    b = p.chromium.launch(**kw)
    pg = b.new_page(viewport={'width': 1366, 'height': 800})
    pg.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.route('https://www.packacorp.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<h1>Packa</h1>'))
    pg.goto(URL); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(800)

    icon = pg.locator('.fr-dicon', has_text='ShowMe ERP')
    ok(icon.count() == 1, 'desktop has the ShowMe ERP icon')
    icon.dblclick(); pg.wait_for_selector('.erp .erp-h', timeout=5000)
    title = pg.evaluate("() => FR.wm.wins.get('erp').el.querySelector('.fr-title').textContent")
    ok(title == 'ShowMe ERP Classic 4.2 — PACKA CORPORATION — FWARMINGTON', 'window title: ' + title)
    ok('Welcome, FWARMINGTON' in pg.inner_text('.erp-pane'), 'opens on Home')

    seen = []
    for k in pg.eval_on_selector_all('.erp-n', 'bs => bs.map(b => b.dataset.k)'):
        pg.click(f'.erp-n[data-k="{k}"]'); pg.wait_for_timeout(120)
        head = pg.inner_text('.erp-h b'); body = pg.inner_text('.erp-body')
        ok(head and len(body) > 40 and pg.locator(f'.erp-n.on[data-k="{k}"]').count() == 1, f'module {k}: {head}')
        seen.append(body)
        if k == 'gl': pg.screenshot(path=f'{OUT}/erp_gl.png')
    ok(len(seen) == 13, f'all 13 modules render ({len(seen)})')

    pg.click('.erp-n[data-k="bud"]')
    ok('Excel is faster' in pg.inner_text('.erp-body'), 'Budgeting: last used FY2019, "Excel is faster."')

    pg.click('.erp-n[data-k="rep"]')
    before = pg.inner_text('.erp-count')
    pg.locator('[data-run="Trial Balance"]').click(); pg.wait_for_selector('.fr-dialog', timeout=4000)
    msg = pg.inner_text('.fr-dialog .fr-dlg-msg'); seen.append(msg)
    ok('Exported to' in msg and 'Trial_Balance_P10_2026 (1285).csv' in msg, 'Run exports to CSV: ' + msg.split('\n')[2 if len(msg.split('\n')) > 2 else 0])
    close_dialog(pg)
    ok(before == '1,284' and pg.inner_text('.erp-count') == '1,285', 'export counter 1,284 → 1,285')

    pg.click('.erp-n[data-k="po"]')
    pg.locator('[data-approve]').first.click(); pg.wait_for_selector('.fr-dialog', timeout=4000)
    seen.append(pg.inner_text('.fr-dialog .fr-dlg-msg'))
    ok('approver is not here' in pg.inner_text('.fr-dialog'), 'Approve: "The approver is not here."')
    close_dialog(pg)

    pg.locator('.fr-win .fr-menubar > *', has_text='Help').last.click(); pg.wait_for_timeout(200)
    about = pg.locator('.fr-menu-item', has_text='About ShowMe ERP')
    if about.count():
        about.first.click(); pg.wait_for_selector('.fr-dialog', timeout=4000)
        seen.append(pg.inner_text('.fr-dialog .fr-dlg-msg'))
        ok('Show-Me Business Systems' in pg.inner_text('.fr-dialog'), 'Help › About ShowMe ERP')
        close_dialog(pg)
    else:
        ok(False, 'Help › About ShowMe ERP menu item found')

    text = '\n'.join(seen)
    leaks = [s for s in SPOILERS if s in text]
    ok(not leaks, 'no puzzle answers anywhere in the ERP' + (': ' + ', '.join(leaks) if leaks else ''))
    ok('Datarails' not in text and 'FinanceOS' not in text, 'no Datarails inside the ERP (Packa does not use it)')

    # Start menu entry
    pg.evaluate("() => FR.wm.wins.get('erp').close()"); pg.wait_for_timeout(300)
    pg.click('.fr-startbtn'); pg.wait_for_timeout(300)
    pg.locator('.fr-sm-item', has_text='ShowMe ERP').click(); pg.wait_for_selector('.erp .erp-h', timeout=5000)
    ok(True, 'Start menu → ShowMe ERP')
    pg.wait_for_timeout(600); pg.screenshot(path=f'{OUT}/erp_home.png')
    b.close()

ok(not errors, 'no console errors' + ('' if not errors else ': ' + ' | '.join(errors[:5])))
print(f'{fails[0]} FAILED' if fails[0] else 'ALL PASS')
sys.exit(1 if fails[0] else 0)
