"""The extras through the real UI (src/apps/xp_*.js): the Blue Screen after 4 wrong answers in a row (never for log-on
misses; live countdown 5→0; input blocked; gone after ~5 s with every window and the state intact; the streak resets
on a correct answer and survives a reload), the Norton AntiVirus popup (on schedule, never over a message box, while
typing or over the Blue Screen; its status window and inbox scan), every bonus request (wrong answer: no −50, no streak;
right answer: points on top; a reply works too; timed delivery), the score with bonus in the checklist, the ending and
the leaderboard, all 15 Easter eggs (the "n/15" counter and the all-eggs bonus), Paint and Solitaire (desktop icons,
Start menu, Run), no "uninstalled Solitaire" text anywhere, and no puzzle answer inside any of it. Then an iPhone 13
pass: the Blue Screen fits and ignores taps, the Norton toast, a bonus answered by touch, an egg by touch.
Usage: python3 test/features_play.py   (Playwright's Chromium; CHROMIUM=path to use another binary; needs node for the
leaderboard part, like test/score_play.py)"""
import os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', os.path.join(ROOT, 'test', 'out'))
PORT = int(os.environ.get('PORT', '8141'))
FILE = 'file://' + ROOT + '/dist/index.html'
fails, errors = [0], []
# answers to the main puzzles: none of them may appear in a bonus request, an egg, Norton or the karaoke page
SPOILERS = ['sedalia1958', '1958', '4406', '2400', '2006', '3,130', '3130', '1.25', '18243', '18,243', '182 days', '43 days', '$196', '196K',
            '1,500', '(40)', '−60', '-60', 'v5_FINAL_USE_THIS', 'week 5', 'Week 5', '#4471', '4471', '2,860', '2860', 'Cheat Sheet Kings', "Frank's team"]
BONUS = {  # id: (a wrong answer, the right answer, a second right way to write it)
    'tom_comm': ('4800', '3800', '$3,800'), 'mum_fx': ('367.65', '680', '680'), 'intern_accrual': ('27,900', '9300', '9,300'),
    'it_audit': ('4700', '4.7', '4.7 MB'), 'steve_margin': ('25%', '20%', '20'), 'dale_var': ('20%', '25%', '-25%'),
    'rotary_be': ('75', '120', '120'), 'brenda_disc': ('12,000', '11760', '$11,760'), 'vending_ci': ('2360', '2391.24', '2,391'),
}


def ok(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg, flush=True)
    if not cond: fails[0] += 1


def page(b, url, **ctx):
    c = b.new_context(**(ctx or {'viewport': {'width': 1366, 'height': 800}}))
    pg = c.new_page()
    pg.on('console', lambda m: m.type == 'error' and not any(x in m.text for x in ('401', '409')) and errors.append(m.text))
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.route(re.compile(r'https?://(www\.)?packacorp\.com/.*'), lambda r: r.fulfill(status=200, content_type='text/html', body='<h1>Packa 1420 East 3rd Street</h1>'))
    pg.goto(url); pg.wait_for_selector('.fr-desktop, .fr-intro, .fr-acct', timeout=10000); pg.wait_for_timeout(700)
    return pg


def closeall(pg):
    for _ in range(30):
        if pg.locator('.bs-screen').count(): pg.wait_for_timeout(500); continue
        d = pg.locator('.fr-dialog .fr-dlg-btns button')
        if d.count():
            no = pg.locator('.fr-dialog .fr-dlg-btns button', has_text='No')
            (no.last if no.count() else d.last).click(); pg.wait_for_timeout(200); continue
        ids = pg.evaluate("() => [...FR.wm.wins.values()].filter(w => w.id !== 'checklist' && !w.el.classList.contains('fr-dialog')).map(w => w.id)")
        if not ids: return
        pg.evaluate("id => FR.wm.wins.get(id).close()", ids[-1]); pg.wait_for_timeout(200)


def run(pg, cmd):
    pg.click('.fr-startbtn'); pg.wait_for_timeout(250)
    pg.locator('.fr-sm-item', has_text='Run...').click(); pg.wait_for_selector('.fr-dialog .fr-dlg-input input')
    inp = pg.locator('.fr-dialog .fr-dlg-input input').last; inp.fill(cmd); inp.press('Enter'); pg.wait_for_timeout(450)


def dlg_text(pg):
    return ' | '.join(pg.eval_on_selector_all('.fr-dialog .fr-dlg-msg', 'e => e.map(x => x.innerText)'))


def egg_toast(pg):
    t = pg.locator('.eg-toast')
    return t.last.inner_text().replace('\n', ' ') if t.count() else ''


def st(pg, js):
    return pg.evaluate('() => ' + js)


def ck_answer(pg, value):
    """type an answer into the open checklist item and Submit (like a player)"""
    if not st(pg, "!!FR.wm.wins.get('checklist')"): pg.locator('.fr-pack').click(); pg.wait_for_timeout(300)
    st(pg, "FR.wm.wins.get('checklist').focus()")
    inp = pg.locator('.fr-win .ck-item.open .ck-ans input').first
    inp.fill(value); pg.locator('.fr-win .ck-item.open .ck-ans button').first.click(); pg.wait_for_timeout(300)


def watch_bsod(pg, timeout=9):
    """sample the countdown until the Blue Screen goes; returns (seconds shown, list of numbers seen)"""
    pg.wait_for_selector('.bs-screen', timeout=4000)
    t0 = time.time(); seen = []
    while pg.locator('.bs-screen').count() and time.time() - t0 < timeout:
        v = pg.evaluate("() => { const b = document.querySelector('.bs-cd b'); return b ? b.textContent : null; }")
        if v is not None and (not seen or seen[-1] != v): seen.append(v)
        pg.wait_for_timeout(120)
    return time.time() - t0, seen


os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    kw = {'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}
    b = p.chromium.launch(**kw)

    # ================= 1. Blue Screen: log-on misses never count
    print('== Blue Screen', flush=True)
    pg = page(b, FILE + '?nopopups=1')
    pg.click('[data-a=go]'); pg.wait_for_selector('.fr-login input', timeout=8000)
    for w in ['packa1958', 'sedalia', 'nope', 'still-nope', 'fifth']:
        pg.fill('.fr-pw-row input', w); pg.press('.fr-pw-row input', 'Enter'); pg.wait_for_timeout(250)
    pg.wait_for_timeout(600)
    ok(pg.locator('.bs-screen').count() == 0 and st(pg, 'FR.state.wrong') == 5 and st(pg, 'FR.state.missStreak') == 0,
       'five wrong log-on passwords: counted as wrong guesses (5), no streak, no Blue Screen')
    pg.context.close()

    # ================= 1b. four wrong answers in a row: checklist, checklist, Excel password, zip password
    pg = page(b, FILE + '?dev=1&solve=unlock&nopopups=1')
    w0, s0 = st(pg, 'FR.state.wrong'), st(pg, 'FR.score.now().score')
    ck_answer(pg, '2230'); ck_answer(pg, '999')
    ok(st(pg, 'FR.state.missStreak') == 2 and pg.locator('.bs-screen').count() == 0, 'two wrong checklist answers: streak 2, no Blue Screen yet')
    st(pg, "FR.openFile('forboardx')"); pg.wait_for_selector('.fr-dialog .fr-dlg-input input')
    i = pg.locator('.fr-dialog .fr-dlg-input input').last; i.fill('1234'); i.press('Enter'); pg.wait_for_timeout(400)
    ok(st(pg, 'FR.state.missStreak') == 3 and pg.locator('.bs-screen').count() == 0, 'a wrong Excel password: streak 3')
    closeall(pg)
    st(pg, "FR.apps.explorer('bank')"); pg.wait_for_timeout(500)
    pg.locator('.fr-win:not(.fr-inactive) .ex-view [data-id="bankzip"]').first.dblclick(); pg.wait_for_timeout(500)
    if not pg.locator('.fr-dialog .fr-dlg-input input').count(): pg.locator('.fr-win:not(.fr-inactive) .ex-view [data-id="loan"]').first.dblclick()
    pg.wait_for_selector('.fr-dialog .fr-dlg-input input')
    WINS = "[...FR.wm.wins.values()].filter(w => !w.el.classList.contains('fr-dialog')).map(w => w.id + ':' + w.el.querySelector('.fr-title').textContent).sort().join(' | ')"
    wins_before = st(pg, WINS)
    st(pg, "(window.__keys = 0, window.__clicks = 0, document.addEventListener('keydown', () => window.__keys++), document.addEventListener('mousedown', () => window.__clicks++))")
    i = pg.locator('.fr-dialog .fr-dlg-input input').last; i.fill('0000'); i.press('Enter')
    pg.wait_for_selector('.bs-screen', timeout=3000)
    st(pg, "(window.__keys = 0, window.__clicks = 0)")
    txt = pg.inner_text('.bs-screen')
    ok('prevent damage to your Board Pack' in txt and '4 wrong answers in a row' in txt, 'the 4th wrong answer in a row (zip password): the Blue Screen, and it says why')
    ok('*** STOP: 0x00000004 (TOO_MANY_WRONG_ANSWERS, 0x0000BOARD, 0xDEADLINE, 0x00000900)' in txt and 'PACKA_SEDALIA.SYS' in txt and 'Frank saw it weekly' in txt, 'classic XP stop text: STOP code, PACKA_SEDALIA.SYS, "Frank saw it weekly"')
    look = pg.evaluate("() => { const s = getComputedStyle(document.querySelector('.bs-screen')), t = getComputedStyle(document.querySelector('.bs-txt')); return [s.backgroundColor, s.position, s.zIndex, t.fontFamily, getComputedStyle(document.querySelector('.bs-screen')).cursor]; }")
    ok(look[0] == 'rgb(0, 0, 170)' and look[1] == 'fixed' and int(look[2]) > 2000000000 and 'Lucida Console' in look[3] and look[4] == 'none', f'full screen, #0000aa, Lucida Console, no cursor {look}')
    pg.screenshot(path=f'{OUT}/features_bsod.png')
    # input is blocked: a click on Start, a right-click, keys
    pg.mouse.click(40, 785); pg.mouse.click(700, 400, button='right'); pg.keyboard.press('Escape'); pg.keyboard.type('hello')
    ok(pg.locator('.fr-start, .fr-ctx').count() == 0, 'input blocked: a click on Start and a right-click do nothing')
    secs, seen = watch_bsod(pg)
    ok(seen[:1] == ['5'] and seen[-1] == '0' and seen == [str(n) for n in range(5, -1, -1)][:len(seen)] and len(seen) >= 5, f'the countdown in the text goes 5→0 ({"→".join(seen)})')
    ok(4.3 <= secs <= 7.5, f'gone after about 5 seconds ({secs:.1f} s)')
    after = st(pg, WINS)
    ok(after == wins_before and 'password is incorrect' in dlg_text(pg), f'every window is still there, the zip\'s error message included ({after})')
    ok(st(pg, 'FR.state.wrong') == w0 + 4 and st(pg, 'FR.score.now().score') == s0 - 4 * 50 and st(pg, 'FR.state.missStreak') == 0, 'no extra penalty: 4 wrong guesses cost 4 × 50, nothing more; the streak starts again')
    ok(st(pg, 'window.__keys') == 0 and st(pg, 'window.__clicks') == 0, 'no key or click during the Blue Screen reached the game')
    closeall(pg)
    # a correct answer resets the streak
    ck_answer(pg, '1'); ck_answer(pg, '2'); ck_answer(pg, '3')
    ok(st(pg, 'FR.state.missStreak') == 3, 'three more wrong answers: streak 3')
    ck_answer(pg, '3,130')
    ok(st(pg, "FR.puzzle.isSolved('ebitda')") and st(pg, 'FR.state.missStreak') == 0, 'a correct answer (item solved) resets the streak')
    ck_answer(pg, '9.99'); pg.wait_for_timeout(600)
    ok(pg.locator('.bs-screen').count() == 0 and st(pg, 'FR.state.missStreak') == 1, 'the next wrong answer starts at 1 (no Blue Screen)')
    # the streak survives a reload
    ck_answer(pg, '9.98'); ck_answer(pg, '9.97')
    pg.reload(); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(900)
    ok(st(pg, 'FR.state.missStreak') == 3, 'reload: the streak is still 3 (a reload does not dodge it)')
    ck_answer(pg, '9.96')
    ok(pg.locator('.bs-screen').count() == 1 or pg.wait_for_selector('.bs-screen', timeout=2000), 'and the 4th wrong answer after the reload brings it up')
    watch_bsod(pg)
    # a correct password that doesn't solve an item (the zip) also ends the streak
    ck_answer(pg, '9.95')
    st(pg, "FR.flags.set('bankzipOpen', true)")
    ok(st(pg, 'FR.state.missStreak') == 0, 'a correct zip password ends the streak too')
    pg.context.close()

    # ================= 2. Norton AntiVirus
    print('== Norton', flush=True)
    pg = page(b, FILE + '?dev=1')
    st(pg, "(FR.state.flags.bonusMail = { at: Object.fromEntries(FR.bonus.TASKS.map(t => [t.id, 0])), last: 0 }, FR.save())")   # (bonus e-mails out of the way)
    st(pg, "FR.state.playMs = 0"); pg.wait_for_timeout(1500)
    ok(pg.locator('.fr-balloon.nv-bal').count() == 0, 'no Norton at the start')
    st(pg, 'FR.xp.ff(170000)'); pg.wait_for_timeout(1500)
    ok(pg.locator('.fr-balloon.nv-bal').count() == 0, 'none at 2:50 of play')
    st(pg, 'FR.xp.ff(12000)'); pg.wait_for_selector('.fr-balloon.nv-bal', timeout=3000)
    bal = pg.inner_text('.fr-balloon.nv-bal')
    ok('Norton AntiVirus' in bal and 'Virus definitions are up to date.' in bal, 'about 3 minutes in: "Norton AntiVirus 2003 — Virus definitions are up to date."')
    pg.screenshot(path=f'{OUT}/features_norton.png')
    nx = st(pg, 'FR.state.flags.norton.next - FR.clock.playMs()')
    ok(8 * 60000 - 2000 <= nx <= 15 * 60000, f'the next one is 8–15 minutes of play away ({nx / 60000:.1f} min)')
    ok(pg.evaluate("() => /nvshield|<svg/.test(document.querySelector('.fr-balloon.nv-bal').innerHTML) && !/norton.*\\.(png|jpg)/i.test(document.querySelector('.fr-balloon.nv-bal').innerHTML)"), 'a drawn yellow shield, no logo image')
    pg.locator('.fr-balloon.nv-bal .fr-balloon-x').click(); pg.wait_for_timeout(300)
    # never over a message box
    run(pg, 'winver')
    st(pg, 'FR.xp.ff(16 * 60000)'); pg.wait_for_timeout(2500)
    ok(pg.locator('.fr-balloon.nv-bal').count() == 0, 'due, but a message box is open: no Norton')
    closeall(pg); pg.wait_for_selector('.fr-balloon.nv-bal', timeout=4000)
    v2 = pg.inner_text('.fr-balloon.nv-bal .fr-balloon-b')
    ok(v2.strip() in st(pg, 'FR.norton.VARIANTS'), 'it waits its turn and comes when the message box closes; the 2nd one is a joke: ' + v2.strip())
    pg.locator('.fr-balloon.nv-bal .fr-balloon-x').click(); pg.wait_for_timeout(300)
    # never while typing
    st(pg, 'FR.apps.notepad(null)'); pg.wait_for_timeout(400)
    pg.locator('.fr-win:not(.fr-inactive) .np-ta').click(); pg.keyboard.type('typing a note')
    st(pg, 'FR.xp.ff(16 * 60000)'); pg.wait_for_timeout(2500)
    ok(pg.locator('.fr-balloon.nv-bal').count() == 0, 'due, but the player is typing: no Norton')
    st(pg, 'document.activeElement.blur()'); pg.wait_for_selector('.fr-balloon.nv-bal', timeout=4000); closeall(pg)
    ok(True, 'it comes once typing stops')
    pg.locator('.fr-balloon.nv-bal .fr-balloon-x').click(); pg.wait_for_timeout(300)
    # never over the Blue Screen
    st(pg, 'FR.bsod.show()'); st(pg, 'FR.xp.ff(16 * 60000)'); pg.wait_for_timeout(2000)
    ok(pg.locator('.fr-balloon.nv-bal').count() == 0, 'due during the Blue Screen: no Norton')
    watch_bsod(pg); pg.wait_for_selector('.fr-balloon.nv-bal', timeout=4000)
    ok(True, 'it comes after Windows "returns to normal"')
    # never over the screensaver or the ending
    pg.locator('.fr-balloon.nv-bal .fr-balloon-x').click(); pg.wait_for_timeout(300)
    st(pg, 'FR.screensaver()'); st(pg, 'FR.xp.ff(16 * 60000)'); pg.wait_for_timeout(2000)
    ok(pg.locator('.fr-balloon.nv-bal').count() == 0, 'due during the screensaver: no Norton')
    pg.mouse.move(300, 300); pg.mouse.move(310, 320); pg.wait_for_timeout(2500)
    # click it: the status window
    pg.wait_for_selector('.fr-balloon.nv-bal', timeout=4000)
    pg.locator('.fr-balloon.nv-bal .fr-balloon-b').click(); pg.wait_for_selector('.nv .nv-ok', timeout=3000)
    ok('System Status: OK' in pg.inner_text('.nv') and 'Expires in 3 days' in pg.inner_text('.nv'), 'a click opens the Norton status window: "System Status: OK"')
    pg.locator('.nv [data-a=inbox]').click(); pg.wait_for_selector('.nv .nv-res', timeout=5000)
    res = pg.inner_text('.nv .nv-res')
    ok('emily.carter@packacorp.com' in res and 'quarantine declined' in res, "Scan Frank's inbox: 1 suspicious sender, emily.carter@packacorp.com, quarantine declined")
    pg.screenshot(path=f'{OUT}/features_norton_window.png')
    norton_text = pg.inner_text('.nv') + ' ' + ' '.join(st(pg, 'FR.norton.VARIANTS'))
    pg.locator('.nv [data-a=pc]').click(); pg.wait_for_selector('.nv .nv-res', timeout=5000); norton_text += pg.inner_text('.nv')
    leaks = [s for s in SPOILERS if s in norton_text]
    ok(not leaks, 'no puzzle answer in Norton' + (': ' + ', '.join(leaks) if leaks else ''))
    pg.context.close()

    # ================= 3. bonus requests
    print('== bonus requests', flush=True)
    pg = page(b, FILE + '?dev=1&solve=login')
    st(pg, "(FR.state.flags.norton = { next: 1e12, n: 0 }, FR.state.playMs = 0, FR.save())")   # (Norton out of the way)
    st(pg, 'FR.xp.ff(100000)'); pg.wait_for_timeout(1500)
    ok(st(pg, "FR.mail.messages().filter(m => m.bonus).length") == 0, 'no bonus e-mail in the first 2 minutes of play')
    st(pg, 'FR.xp.ff(25000)'); pg.wait_for_timeout(1600)
    ok(st(pg, "FR.mail.messages().filter(m => m.bonus).map(m => m.bonus).join()") == 'tom_comm', 'at 2 minutes: the first request (Tom Bracken) arrives in the inbox')
    ok('New request from Tom Bracken' in (pg.inner_text('.fr-balloon') if pg.locator('.fr-balloon').count() else ''), 'with a tray toast "New request from Tom Bracken"')
    pg.screenshot(path=f'{OUT}/features_bonus_toast.png')
    pg.locator('.fr-balloon .fr-balloon-x').click(); pg.wait_for_timeout(200)
    st(pg, 'FR.xp.ff(60000)'); pg.wait_for_timeout(1500)
    ok(st(pg, "FR.mail.messages().filter(m => m.bonus).length") == 1, 'a minute later: still one (they come at least 3½ minutes apart)')
    st(pg, 'FR.xp.ff(160000)'); pg.wait_for_timeout(1600)
    ok(st(pg, "FR.mail.messages().filter(m => m.bonus).map(m => m.bonus).join()") == 'tom_comm,mum_fx', '3½ minutes later: the next one (Frank\'s mum)')
    closeall(pg)
    st(pg, 'FR.xp.ff(10 * 60000)'); pg.wait_for_timeout(1500)
    ok(st(pg, "FR.mail.messages().filter(m => m.bonus).length") == 2, 'the next ones wait for their checklist item (item 2 is not done)')
    pg.context.close()

    pg = page(b, FILE + '?dev=1&solve=bridge&nopopups=1')
    st(pg, 'FR.xp.ff(30 * 60000)'); pg.wait_for_timeout(1500)
    ok(st(pg, "FR.mail.messages().filter(m => m.bonus).length") == 0, '?nopopups=1 (file:// / localhost only): no timed bonus e-mails')
    base = st(pg, 'FR.score.now()')
    texts = []
    for n_, (bid, (wrong, right, alt)) in enumerate(BONUS.items()):
        ok(st(pg, f"FR.bonus.deliver('{bid}', true)") and st(pg, f"!!FR.mail.messages().find(m => m.id === 'bn_{bid}' && m.bonus === '{bid}')"), f'{bid}: delivered to the inbox')
        st(pg, f"FR.mail.open('bn_{bid}')"); pg.wait_for_selector(f'.fr-win:not(.fr-inactive) .bn-box[data-bonus="{bid}"] .bn-inp', timeout=4000)
        box = f'.fr-win:not(.fr-inactive) .bn-box[data-bonus="{bid}"]'
        m = st(pg, f"FR.mail.messages().find(m => m.id === 'bn_{bid}')")
        texts.append(m['subject'] + '\n' + m['body'])
        w_, sc_, str_ = st(pg, 'FR.state.wrong'), st(pg, 'FR.score.now().score'), st(pg, 'FR.state.missStreak')
        for _ in range(2 if n_ == 0 else 1):
            pg.fill(box + ' .bn-inp', wrong); pg.locator(box + ' .bn-go').click(); pg.wait_for_timeout(250)
        fb = pg.inner_text(box + ' .bn-fb')
        texts.append(fb)
        ok(len(fb) > 10 and st(pg, 'FR.state.wrong') == w_ and st(pg, 'FR.score.now().score') == sc_ and st(pg, 'FR.state.missStreak') == str_ and not st(pg, f"FR.state.bonus && FR.state.bonus['{bid}']"),
           f'{bid}: wrong ({wrong}) → in character, no −50, no streak: "{fb[:70]}"')
        if n_ == 0:
            ok('Two pieces' in fb, 'after two misses the sender explains the method')
            pg.screenshot(path=f'{OUT}/features_bonus_mail.png')
        pg.fill(box + ' .bn-inp', right); pg.locator(box + ' .bn-go').click(); pg.wait_for_timeout(350)
        pts = st(pg, f"FR.scoreRules.BONUS['{bid}']")
        ok(pg.locator(box + '.bn-done').count() == 1 and st(pg, f"FR.state.bonus['{bid}'].pts") == pts and st(pg, 'FR.score.now().score') == sc_ + pts,
           f'{bid}: right ({right}) → +{pts} on top of the score')
        texts.append(pg.inner_text(box))
        closeall(pg)
        ok(st(pg, f"FR.scoreRules.BONUS['{bid}'] >= 100 && FR.scoreRules.BONUS['{bid}'] <= 300"), f'{bid}: worth +100 to +300')
    # the other way of writing the answer is accepted too (a fresh check, no award twice)
    ok(all(st(pg, f"FR.bonus.TASKS.find(t => t.id === '{bid}').check('{alt}') === true") for bid, (w, r, alt) in BONUS.items()), 'answers written other ways count ($3,800 / 20 / -25% / 4.7 MB …)')
    total = sum(st(pg, f"FR.scoreRules.BONUS['{bid}']") for bid in BONUS)
    now = st(pg, 'FR.score.now()')
    ok(now['bonus'] == total and now['score'] == base['score'] + total and now['main'] == base['main'], f'all nine: +{total} bonus on top (main score unchanged {now["main"]})')
    # 5 wrong bonus answers in a row never bring up the Blue Screen
    st(pg, "(FR.state.bonus = {}, FR.save())")
    st(pg, "FR.mail.open('bn_rotary_be')"); pg.wait_for_selector('.fr-win:not(.fr-inactive) .bn-inp')
    for v in ['1', '2', '3', '4', '5']:
        pg.fill('.fr-win:not(.fr-inactive) .bn-inp', v); pg.locator('.fr-win:not(.fr-inactive) .bn-go').click(); pg.wait_for_timeout(150)
    pg.wait_for_timeout(700)
    ok(pg.locator('.bs-screen').count() == 0 and st(pg, 'FR.state.missStreak') == 0, 'five wrong bonus answers in a row: no Blue Screen')
    closeall(pg)
    # answering by reply
    st(pg, "FR.mail.open('bn_mum_fx')"); pg.wait_for_timeout(500)
    pg.locator('.fr-win:not(.fr-inactive) .oe-tbb', has_text='Reply').first.click(); pg.wait_for_timeout(600)
    body = pg.locator('.fr-win:not(.fr-inactive) .oe-body'); body.click(); pg.keyboard.press('Control+Home'); pg.keyboard.type('Mom, it is 680. Eating. —F\n')
    to = pg.input_value('.fr-win:not(.fr-inactive) .oe-to')
    pg.locator('.fr-win:not(.fr-inactive) .oe-tbb-send').click(); pg.wait_for_timeout(3600)
    rep = st(pg, "(FR.mail.messages().filter(m => m.from.name === 'Linda Warmington' && /^Re:/.test(m.subject)).pop() || {}).body || ''")
    ok(st(pg, "!!(FR.state.bonus && FR.state.bonus.mum_fx)") and 'moose shirt' in rep and to.startswith('Linda Warmington'), f'replying "680" to Mom answers it: +100, and Mom writes back ("{rep[:40]}…")')
    texts.append(rep)
    leaks = [s for s in SPOILERS if s in '\n'.join(texts) + '\n'.join(st(pg, "FR.bonus.TASKS.map(t => [t.subject, t.body, t.right, t.hint].join(' '))"))]
    ok(not leaks, 'no puzzle answer in any bonus request, reply or hint' + (': ' + ', '.join(leaks) if leaks else ''))
    # the score shows the bonus: checklist, ending
    pg.locator('.fr-pack').click(); pg.wait_for_timeout(400)
    foot = pg.inner_text('.ck-wrap .ck-foot')
    bn = st(pg, 'FR.score.now().bonus')
    ok(f'(+{bn:,} bonus)' in foot, 'checklist footer: ' + foot.split('How to')[0].strip())
    st(pg, "(FR.puzzle.ORDER.forEach(id => FR.state.solved[id] = FR.state.solved[id] || Date.now()), FR.state.finishedAt = Date.now(), FR.state.finishPlayMs = FR.clock.playMs(), FR.save(), FR.ending())")
    pg.wait_for_selector('.fr-end', timeout=4000); pg.wait_for_timeout(500)
    ok(pg.inner_text('.fr-end-bonus b') == f'+{bn:,}' and pg.inner_text('.fr-end-score b') == f"{st(pg, 'FR.score.now().score'):,}", f'ending: Score {pg.inner_text(".fr-end-score b")} and a separate "Bonus +{bn}"')
    pg.screenshot(path=f'{OUT}/features_ending.png')
    pg.context.close()

    # ================= 4. Easter eggs (all 15, the way a player finds them)
    print('== Easter eggs', flush=True)
    pg = page(b, FILE + '?dev=1&nopopups=1')
    total = st(pg, 'FR.eggs.total')
    ok(total == 15 and st(pg, 'FR.eggs.count()') == 0, '15 eggs, none found yet')
    found = [0]

    def egg(what, eid):
        pg.wait_for_timeout(250)
        n = st(pg, 'FR.eggs.count()')
        t = egg_toast(pg)
        good = n == found[0] + 1 and st(pg, f"FR.eggs.has('{eid}')") and f'({n}/{total})' in t
        if good: found[0] = n
        ok(good, f'egg {n}/{total}: {what} → "{t}"')

    def ex_open(folder, nid):
        st(pg, f"FR.apps.explorer('{folder}')"); pg.wait_for_timeout(450)
        pg.locator(f'.fr-win:not(.fr-inactive) .ex-view [data-id="{nid}"]').first.dblclick(); pg.wait_for_timeout(600)
    egg_texts = []
    ex_open('personal', 'egg_diary'); egg('diary_do_not_read.txt in Personal', 'diary')
    egg_texts.append(pg.input_value('.fr-win:not(.fr-inactive) .np-ta')); pg.screenshot(path=f'{OUT}/features_egg_toast.png'); closeall(pg)
    st(pg, "FR.apps.explorer('personal')"); pg.wait_for_timeout(400)
    ok(pg.locator('.fr-win:not(.fr-inactive) .ex-view [data-id="egg_karaoke"]').count() == 0, 'the karaoke setlist is hidden')
    closeall(pg); st(pg, "FR.flags.set('showHidden', true)")
    ex_open('personal', 'egg_karaoke'); egg('karaoke_setlist.txt (hidden)', 'karaoke'); egg_texts.append(pg.input_value('.fr-win:not(.fr-inactive) .np-ta')); closeall(pg)
    ex_open('recycle', 'egg_resign'); egg('the resignation letter in the Recycle Bin', 'resign'); egg_texts.append(pg.input_value('.fr-win:not(.fr-inactive) .np-ta')); closeall(pg)
    ex_open('pics', 'egg_portrait'); pg.wait_for_timeout(500)
    egg('the self-portrait in Drew\'s hat (opens in Paint)', 'portrait')
    ok('frank_self_portrait_(drews_hat).bmp - Paint' == st(pg, "FR.wm.wins.get('paint').el.querySelector('.fr-title').textContent"), "it opens in Paint")
    pg.screenshot(path=f'{OUT}/features_egg_portrait.png'); closeall(pg)
    for cmd, eid, want in [('frank', 'run_frank', 'Neither can Diane'), ('vegas', 'run_vegas', 'reconciled in Sedalia'), ('xlookup', 'run_xlookup', 'Excel 2003')]:
        run(pg, cmd); m_ = dlg_text(pg); egg_texts.append(m_)
        ok(want in m_, f'Run… {cmd}: "' + m_[:70].replace(chr(10), ' ') + '"'); egg(f'Run… {cmd}', eid); closeall(pg)
    st(pg, 'FR.apps.excel(null)'); pg.wait_for_timeout(700)
    nb = pg.locator('.fr-win:not(.fr-inactive) .xl-nb-in'); nb.click(); nb.fill('B2'); nb.press('Enter'); pg.wait_for_timeout(150)
    pg.keyboard.type('=KRISTIANS()'); pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    cell = pg.evaluate("() => document.querySelector('.fr-win:not(.fr-inactive) .xl-grid td[data-r=\"1\"][data-c=\"1\"]').innerText")
    ok("There's always a formula." in cell, '=KRISTIANS() in Excel: ' + cell); egg('=KRISTIANS()', 'xl_kristians'); closeall(pg)
    st(pg, "FR.openFile('esports')"); pg.wait_for_timeout(800)
    pg.locator('.fr-win:not(.fr-inactive) .xl-grid td[data-r="3"][data-c="1"]').click(); pg.keyboard.press('Control+End'); pg.wait_for_timeout(300)
    ok(pg.input_value('.fr-win:not(.fr-inactive) .xl-nb-in') == 'J36' and 'Ctrl+End' in pg.input_value('.fr-win:not(.fr-inactive) .xl-fin'), 'speedrun_practice.xls: Ctrl+End lands on J36 (white on white)')
    egg('the cell at the very end', 'xl_hidden'); closeall(pg)
    for _ in range(5): pg.locator('.fr-ktray').click(); pg.wait_for_timeout(90)
    pg.wait_for_timeout(300)
    ok('Go to bed' in pg.inner_text('.fr-balloon'), 'five clicks on Kristians in the tray: "Five tips in a row? … Go to bed."'); egg('Kristians ×5', 'tray_k5')
    pg.locator('.fr-balloon .fr-balloon-x').click()
    pg.locator('.fr-wall').click(button='right', position={'x': 700, 'y': 500}); pg.wait_for_timeout(200)
    pg.locator('.fr-ctx .fr-menu-item', has_text='Properties').click(); pg.wait_for_timeout(300)
    pg.locator('.fr-dialog .fr-dlg-btns button', has_text='Screen Saver...').click(); pg.wait_for_timeout(300)
    ok('Kristians (Marquee)' in dlg_text(pg), 'desktop right-click › Properties › Screen Saver…')
    pg.locator('.fr-dialog .fr-dlg-btns button', has_text='Preview').click(); pg.wait_for_selector('.fr-saver', timeout=3000)
    egg('the screensaver', 'saver'); pg.wait_for_timeout(500); pg.mouse.move(100, 100); pg.mouse.move(140, 160); pg.wait_for_timeout(300)
    ok(pg.locator('.fr-saver').count() == 0, 'moving the mouse ends it')
    st(pg, 'FR.apps.solitaire()'); pg.wait_for_timeout(600)
    st(pg, 'Array.from({ length: 210 }, () => FR.apps.solitaire._test.deal())')   # (opening it dealt the first)
    ok(st(pg, 'FR.state.flags.solDeals') == 211 and not st(pg, "FR.eggs.has('sol212')"), '211 deals: nothing yet')
    pg.locator('.fr-win:not(.fr-inactive) .so-table').click(position={'x': 600, 'y': 400}); pg.keyboard.press('F2'); pg.wait_for_timeout(500)
    egg('deal #212 in Solitaire (F2)', 'sol212'); closeall(pg)
    st(pg, 'FR.apps.calc()'); pg.wait_for_timeout(300)
    for k in ['0', '.', '0', '0', '0', '3']: pg.locator(f'.ca-k[data-k="{k}"]').click()
    pg.wait_for_timeout(300)
    ok(pg.input_value('.ca-disp') == '0.0003' and 'Member #0003' in pg.inner_text('.fr-balloon'), 'the Calculator shows 0.0003: "Member #0003"'); egg('0.0003 in the Calculator', 'calc0003'); closeall(pg)
    st(pg, 'FR.apps.ie(null)'); pg.wait_for_timeout(700)
    pg.locator('.fr-win:not(.fr-inactive) .ie-tb [data-a=favorites]').click(); pg.wait_for_timeout(300)
    pg.locator('.fr-win:not(.fr-inactive) .ie-fl', has_text='Tuesday Karaoke').click(); pg.wait_for_timeout(600)
    ie = pg.inner_text('.fr-win:not(.fr-inactive) .ie-page'); egg_texts.append(ie)
    ok('The Tipsy Ledger' in ie and 'frank_w' in ie, 'IE › Favorites › Frank\'s › Tuesday Karaoke: the Tipsy Ledger\'s page'); egg('an IE Favorite that exists', 'ie_karaoke')
    pg.screenshot(path=f'{OUT}/features_egg_ie.png'); closeall(pg)
    sc_before = st(pg, 'FR.score.now().bonus')
    pg.locator('.fr-clock').dblclick(); pg.wait_for_timeout(300)
    ok('Riga time' in dlg_text(pg), 'double-click the clock: Date and Time Properties, "Riga time"'); egg('the clock', 'clock'); closeall(pg)
    pg.wait_for_timeout(2400)
    ok(found[0] == 15 and 'Easter egg found (15/15)' in egg_toast(pg) or found[0] == 15, 'all 15 found')
    ok(st(pg, "!!(FR.state.bonus && FR.state.bonus.eggs)") and st(pg, 'FR.score.now().bonus') == sc_before + st(pg, 'FR.scoreRules.BONUS.eggs'), f'every egg found: +{st(pg, "FR.scoreRules.BONUS.eggs")} bonus')
    pg.reload(); pg.wait_for_selector('.fr-desktop'); pg.wait_for_timeout(600)
    ok(st(pg, 'FR.eggs.count()') == 15, 'found eggs are saved (FR.state.eggs, after a reload)')
    egg_texts.append('\n'.join(st(pg, "Object.keys(FR.data.texts).filter(k => /^egg_/.test(k)).map(k => FR.data.texts[k])")))
    leaks = [s for s in SPOILERS if s in '\n'.join(egg_texts)]
    ok(not leaks, 'no puzzle answer in any Easter egg' + (': ' + ', '.join(leaks) if leaks else ''))

    # ================= 5. Paint and Solitaire: desktop icons, Start menu, Run; no "uninstalled Solitaire" anywhere
    print('== Paint and Solitaire', flush=True)
    for name, wid in [('Paint', 'paint'), ('Solitaire', 'solitaire')]:
        icon = pg.locator(f'.fr-dicon[title="{name}"]')
        ok(icon.count() == 1, f'desktop icon: {name}')
        icon.dblclick(); pg.wait_for_timeout(700)
        ok(st(pg, f"!!FR.wm.wins.get('{wid}')"), f'double-click {name}: it opens')
        closeall(pg)
        pg.click('.fr-startbtn'); pg.wait_for_timeout(250)
        if name == 'Paint': pg.screenshot(path=f'{OUT}/features_start_menu.png')
        pg.locator('.fr-sm-item b', has_text=re.compile('^' + name + '$')).click(); pg.wait_for_timeout(700)
        ok(st(pg, f"!!FR.wm.wins.get('{wid}')"), f'Start › {name}: it opens'); closeall(pg)
    for cmd, wid in [('solitaire', 'solitaire'), ('sol', 'solitaire'), ('mspaint', 'paint'), ('pbrush', 'paint')]:
        run(pg, cmd); pg.wait_for_timeout(300)
        ok(st(pg, f"!!FR.wm.wins.get('{wid}')") and not pg.locator('.fr-dialog').count(), f'Run… {cmd} opens {wid}'); closeall(pg)
    pg.screenshot(path=f'{OUT}/features_desktop_icons.png')
    pg.click('.fr-startbtn'); pg.wait_for_timeout(250); pg.locator('.fr-sm-item', has_text='All Programs').click(); pg.wait_for_timeout(300)
    ap = dlg_text(pg)
    ok('Paint and Solitaire' in ap and 'uninstalled Solitaire' not in ap, 'All Programs: "' + ap.replace('\n', ' ') + '"')
    closeall(pg)
    st(pg, "FR.openFile('pt_k')"); pg.wait_for_timeout(600)
    ok(st(pg, "!!FR.wm.wins.get('paint')"), 'kristians_by_frank.bmp in My Pictures opens in Paint'); closeall(pg)
    dist = open(os.path.join(ROOT, 'dist', 'index.html'), encoding='utf-8').read()
    src = '\n'.join(open(os.path.join(dp, f), encoding='utf-8').read() for dp, _, fs in os.walk(os.path.join(ROOT, 'src')) for f in fs if f.endswith(('.js', '.css')) and f != 'assets.js' and f != 'sounds.js')
    gone = [s for s in ['uninstalled Solitaire', 'Then he uninstalled', 'Frank had a problem', 'Solitaire (uninstalled)', 'Solitaire Deluxe'] if s in dist or s in src]
    ok(not gone, 'no "Frank uninstalled Solitaire" text left in the game' + (': ' + ', '.join(gone) if gone else ''))
    pg.context.close()

    # ================= 6. the leaderboard shows the bonus (account server with an in-memory database)
    print('== leaderboard', flush=True)
    server = subprocess.Popen(['node', 'test/local_server.js', str(PORT)], cwd=ROOT, stdout=subprocess.PIPE)
    server.stdout.readline()
    try:
        pg = page(b, f'http://localhost:{PORT}/?nopopups=1')
        pg.fill('.fr-acct-form input[name=u]', 'Bonusina'); pg.fill('.fr-acct-form input[name=p]', 'bonus-pw-1')
        pg.click('.fr-acct-form [type=submit]'); pg.wait_for_timeout(600)
        pg.click('.fr-intro [data-a=go]'); pg.wait_for_selector('.fr-login input', timeout=8000)
        pg.fill('.fr-login input', 'sedalia1958'); pg.click('.fr-go'); pg.wait_for_selector('.fr-desktop', timeout=8000); pg.wait_for_timeout(2000)
        st(pg, "FR.bonus.deliver('dale_var', true)"); st(pg, "FR.mail.open('bn_dale_var')"); pg.wait_for_selector('.fr-win:not(.fr-inactive) .bn-inp')
        pg.fill('.fr-win:not(.fr-inactive) .bn-inp', '25%'); pg.locator('.fr-win:not(.fr-inactive) .bn-go').click(); pg.wait_for_timeout(2500)
        closeall(pg); st(pg, 'FR.score.open()'); pg.wait_for_selector('.ie-page .st-t', timeout=8000)
        row = pg.locator('.st-t tr.st-me').inner_text().replace('\t', ' ')
        ok(pg.locator('.st-t th', has_text='Bonus').count() == 1 and pg.locator('.st-t tr.st-me td.st-bonus').inner_text() == '+100' and '1,100' in row, 'leaderboard: a Bonus column, "+100", points 1,100 incl. the bonus (' + re.sub(r'\s+', ' ', row) + ')')
        ok('incl. +100 bonus' in pg.inner_text('.st-mine'), 'and "Your Board Pack right now: … (incl. +100 bonus)"')
        pg.screenshot(path=f'{OUT}/features_leaderboard.png')
        pg.context.close()
    finally:
        server.terminate()

    # ================= 7. iPhone 13, by touch
    print('== iPhone 13', flush=True)
    dev = dict(p.devices['iPhone 13']); dev.pop('default_browser_type', None)
    pg = page(b, FILE + '?dev=1&solve=unlock&nopopups=1', **dev)
    ok(st(pg, 'FR.mobile'), 'phone detected')

    def tap(loc, wait=350):
        bb = loc.first.bounding_box(); pg.touchscreen.tap(bb['x'] + bb['width'] / 2, bb['y'] + min(bb['height'] / 2, 18)); pg.wait_for_timeout(wait)
    st(pg, '(FR.state.missStreak = 3, FR.save())')
    st(pg, "FR.wm.wins.get('checklist').focus()"); pg.wait_for_timeout(700)   # (the tap guard ignores a window that just came up)
    tap(pg.locator('.fr-win .ck-item.open .ck-ans input'), 300); pg.keyboard.type('77'); tap(pg.locator('.fr-win .ck-item.open .ck-ans button'), 200)
    pg.wait_for_selector('.bs-screen', timeout=3000); pg.wait_for_timeout(300)
    fit = pg.evaluate("() => { const t = document.querySelector('.bs-txt'), r = t.getBoundingClientRect(), s = getComputedStyle(t); return { w: innerWidth, h: innerHeight, right: r.right, bottom: r.bottom, sw: document.documentElement.scrollWidth, fs: parseFloat(s.fontSize), cd: !!document.querySelector('.bs-cd b') }; }")
    ok(fit['right'] <= fit['w'] and fit['bottom'] <= fit['h'] and fit['sw'] <= fit['w'] and fit['fs'] >= 11 and fit['cd'], f'iPhone 13: the Blue Screen fits (text {fit["right"]:.0f}×{fit["bottom"]:.0f} in {fit["w"]}×{fit["h"]}, {fit["fs"]}px, countdown on screen)')
    pg.screenshot(path=f'{OUT}/features_m_bsod.png')
    tb = pg.locator('.fr-startbtn').bounding_box(); pg.touchscreen.tap(tb['x'] + 20, tb['y'] + 10); pg.wait_for_timeout(300)
    ok(pg.locator('.fr-start').count() == 0, 'iPhone 13: a tap on Start during the Blue Screen does nothing')
    watch_bsod(pg)
    ok(pg.locator('.bs-screen').count() == 0 and st(pg, "!!FR.wm.wins.get('checklist')"), 'iPhone 13: it goes after 5 s, the checklist is still open')
    closeall(pg)
    st(pg, "(document.activeElement && document.activeElement.blur(), FR.norton.pop())"); pg.wait_for_selector('.fr-balloon.nv-bal', timeout=4000); pg.wait_for_timeout(700)
    pos = pg.evaluate("() => { const b = document.querySelector('.fr-balloon.nv-bal').getBoundingClientRect(), tb = document.querySelector('.fr-taskbar').getBoundingClientRect(), x = document.querySelector('.fr-balloon.nv-bal .fr-balloon-x').getBoundingClientRect(); return { l: b.left, r: b.right, bottom: b.bottom, tb: tb.top, xw: x.width, w: innerWidth }; }")
    ok(pos['l'] >= 0 and pos['r'] <= pos['w'] and pos['bottom'] <= pos['tb'] + 1 and pos['xw'] >= 44, f'iPhone 13: the Norton toast is a strip above the taskbar with a 44 px ✕ ({pos})')
    pg.screenshot(path=f'{OUT}/features_m_norton.png')
    tap(pg.locator('.fr-balloon.nv-bal .fr-balloon-x'), 400)
    ok(pg.locator('.fr-balloon.nv-bal').count() == 0 and not st(pg, "!!FR.wm.wins.get('norton')"), 'iPhone 13: its ✕ puts it away (nothing opens underneath)')
    st(pg, "FR.bonus.deliver('rotary_be', true)"); st(pg, "FR.mail.open('bn_rotary_be')"); pg.wait_for_timeout(900)
    inp = pg.locator('.fr-win:not(.fr-inactive) .bn-inp')
    pg.evaluate("() => { const b = document.querySelector('.fr-win:not(.fr-inactive) .oe-mbody'); b.scrollTop = b.scrollHeight; }"); pg.wait_for_timeout(300)
    tap(inp, 400); pg.keyboard.type('120'); pg.screenshot(path=f'{OUT}/features_m_bonus.png')
    tap(pg.locator('.fr-win:not(.fr-inactive) .bn-go'), 500)
    ok(st(pg, "!!(FR.state.bonus && FR.state.bonus.rotary_be)") and pg.locator('.fr-win:not(.fr-inactive) .bn-box.bn-done').count() == 1, 'iPhone 13: a bonus request answered by touch (+150)')
    bw = pg.evaluate("() => { const b = document.querySelector('.fr-win:not(.fr-inactive) .bn-box').getBoundingClientRect(); return b.right <= innerWidth && b.left >= 0; }")
    ok(bw, 'iPhone 13: the answer box fits the screen width')
    closeall(pg)
    c = pg.locator('.fr-clock').bounding_box(); cx, cy = c['x'] + c['width'] / 2, c['y'] + c['height'] / 2
    pg.touchscreen.tap(cx, cy); pg.wait_for_timeout(180); pg.touchscreen.tap(cx, cy); pg.wait_for_timeout(500)
    ok(st(pg, "FR.eggs.has('clock')") and 'Riga time' in dlg_text(pg) and 'Easter egg found (1/15)' in egg_toast(pg), 'iPhone 13: two taps on the clock find an egg (1/15)')
    tr = pg.evaluate("() => { const t = document.querySelector('.eg-toast'); if (!t) return null; const r = t.getBoundingClientRect(); return [getComputedStyle(t).pointerEvents, r.left >= 0 && r.right <= innerWidth]; }")
    ok(tr == ['none', True], f'iPhone 13: the egg note fits and never takes a tap {tr}')
    pg.screenshot(path=f'{OUT}/features_m_egg.png')
    pg.context.close()
    b.close()

print('\n'.join(errors) or 'no console errors')
ok(not errors, 'no console errors')
print(f'{fails[0]} FAILED' if fails[0] else 'ALL PASS')
sys.exit(1 if fails[0] else 0)
