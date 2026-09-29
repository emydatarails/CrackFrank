/* FRANK'S COMPUTER — boot: intro, login, desktop, taskbar, start menu, checklist, ending */
(() => {
  const CONFIG = Object.assign({
    siteUrl: 'https://www.packacorp.com/',
    ctaUrl: 'https://www.datarails.com/',
    ctaLabel: 'See how FinanceOS works',
    seriesUrl: '',            // set to the "Frank Is Missing" episode page when it exists
  }, window.FR_CONFIG || {});
  FR.config = CONFIG;
  const $ = FR.$, esc = FR.esc;
  const root = document.getElementById('fr-root');
  const q = new URLSearchParams(location.search);
  // dev shortcuts (?dev=1, ?solve=) only work locally, never on the public site
  const LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);
  const DEV = LOCAL && q.has('dev');
  // the real Packa mark (src/packa-logo*.svg, embedded by build.py): white on the boot screen and Start button,
  // Packa red on the log-on screen (the text next to it stays white)
  const svgUri = svg => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  const LOGO = svgUri(FR.data.logo.markWhite), LOGO_RED = svgUri(FR.data.logo.mark);

  // Render every icon once, off-screen, so gradient ids always resolve (even when the first copy is hidden)
  const sprite = $('<div class="fr-sprite" aria-hidden="true"></div>');
  sprite.innerHTML = Object.values(FR.icons).join('');
  document.body.appendChild(sprite);

  FR.state.wrong = FR.state.wrong || 0;
  FR.state.playMs = FR.state.playMs || 0;

  /* =========================================================== CHECKLIST DATA */
  // where-to-look chips: [label, action]
  const W = {
    // website chips reuse one IE window: close any other IE window first
    site: (page = '', label = 'packacorp.com') => [label + ' ↗', () => {
      [...FR.wm.wins.values()].filter(w => / - Internet Explorer$|^Internet Explorer/.test(w.el.querySelector('.fr-title').textContent) && w.id !== 'ie').forEach(w => w.close());
      FR.apps.ie(CONFIG.siteUrl + page);
    }],
    folder: (id, label) => [label, () => FR.apps.explorer(id)],
    file: (id, label) => [label, () => FR.openFile(id)],
    mail: (label = 'Outlook Express', id) => [label, () => { FR.apps.mail(null); if (id && FR.mail && FR.mail.open) setTimeout(() => FR.mail.open(id), 250); }],
  };
  const ITEMS = [
    { id: 'login', level: 1, t: "Get into Frank's computer", d: 'Crack the Windows password. The hint is on the log-on screen.', auto: true,
      hints: ['Click the blue ? next to the password box. Frank wrote the hint as an Excel formula: & joins text.', "The town and the year are both on the Packa homepage.", '=LOWER("Sedalia")&1958 → sedalia1958'] },
    { id: 'version', level: 1, t: 'Pick the FY27 budget Diane approved', d: 'Five versions. Three say FINAL. Diane signed one. Her three tests: headcount matches the website, gross margin exactly 22.0%, the 2024 warehouse lease in Rent & leases.', pick: 'files',
      where: [W.mail("Diane's email", 'm_diane_which'), W.folder('budget', 'FY27 Budget folder'), W.site('', 'packacorp.com home'), W.site('about.html', 'About Us')],
      hints: ['The website is the referee. The homepage gives the headcount; the About Us timeline gives the size of the 2024 warehouse.', 'Open each file: check the Headcount tab against the website, the Gross margin % row, and the Rent & leases line in Opex Detail.', 'The 2024 warehouse is 40,000 sq ft (About page timeline) × $6.00 = $240K, so Rent & leases must be $420K. Only v5_FINAL_USE_THIS has 118 heads, 22.0% and $420K.'] },
    { id: 'unlock', level: 2, t: 'Unlock the Board copy of the budget', d: 'Budget_FY27_BOARD.xls is password-protected. Frank left the hint inside the approved version.', auto: true,
      where: [W.file('bud_v5ut', 'The approved version'), W.file('bud_board', 'Budget_FY27_BOARD.xls'), W.site('about.html', 'About Us'), W.site('quality.html', 'Quality & Safety')],
      // phones have no hover: the first hint says "tap" there (mhints replaces hints[i] when FR.mobile)
      mhints: ["In the approved file, tap cell A1 (the one with the red triangle) to read Frank's note, or read its Notes tab."],
      hints: ['In the approved file, hover the red triangle in cell A1 (or read its Notes tab).', "Walter's seed money is in \"How We Got Started\" on About Us. The ISO year is on Quality & Safety.", '=SUM(2400, 2006) → 4406.'] },
    { id: 'ebitda', level: 1, t: 'Repair FY27 EBITDA in the Board copy', d: 'Frank broke the EBITDA row at 3 AM (#REF!). Fix row 12 in Excel — FY and all four quarters (E12:H12) — or type the FY number here.', input: 'FY27 EBITDA ($K)', ph: 'e.g. 1,234',
      where: [W.file('bud_board', 'Budget_FY27_BOARD.xls')],
      hints: ["It's not one cell. The FY column and all four quarters say #REF!. Excel only ticks it when the whole row adds up. (Or type the FY number here.)", 'Gross profit minus SG&A, Rent & leases and Other opex. In C12 type =C7-C9-C10-C11, then the same in E12:H12.', '40,000 − 31,200 − 4,850 − 420 − 400 = 3,130.'] },
    { id: 'dscr', level: 2, t: 'Prove the bank covenant (DSCR)', d: 'The bank wants the Q3 covenant certificate. Fill in the DSCR in Excel (it ticks itself) or type it here.', input: 'DSCR (x)', ph: 'e.g. 1.40',
      where: [W.folder('bank', 'My Documents › Bank'), W.mail("Karen's email", 'm_karen_capex')],
      hints: ["Bank.zip needs a password. Open Budget_FY27_BOARD.xls: the yellow note Frank left next to the EBITDA row tells you which cell holds it (passwords.txt on the desktop says the same).", "Section 6.1: capex that wasn't financed by a loan comes off EBITDA first. Karen's email says what was paid in cash.", '(2,860 − 110) ÷ (450 + 1,750) = 1.25x. Just.'] },
    { id: 'cash', level: 3, t: 'Find the first week cash drops below $250K', d: "Frank kept a REAL cash forecast the Board never saw. Find it, add payroll, and pick the first week cash falls below $250K.", pick: 'weeks',
      where: [W.folder('boardroot', 'My Documents › BOARD'), W.mail("Rachel's email", 'm_rachel_payroll'), W.site('careers.html', 'Careers page')],
      hints: ["The REAL VERSION folder is hidden. In any folder window: Tools › Folder Options › View › Show hidden files and folders.", "The payroll row is empty. Rachel has the amount per run; the Careers page says how often Packa pays.", '$196K every other Friday from Oct 23 → weeks 1, 3, 5… Week 5 ends at $110K.'] },
    { id: 'bridge', level: 3, t: 'Close the Q3 EBITDA bridge', d: 'Two bars are missing. Fill both in Excel until the check says TIES — or type the Freight bar here.', input: 'Freight ($K)', ph: 'e.g. -25',
      where: [W.folder('board', 'Board Meeting Oct 20'), W.mail('The mill letter', 'm_ozark'), W.site('products.html', 'Products page')],
      hints: ["Open Q3_EBITDA_Bridge.xls. Frank's rule: never plug a bar you can calculate. Work out containerboard first.", "The mill letter gives $ per ton. How many tons Packa runs a quarter is on the Products page.", '$40 × 1,500 tons = $60K more cost, so −60. Then −160 − (−120 + 80 − 20 − 60) = −40.'] },
    { id: 'forboard', level: 4, t: 'Open FOR THE BOARD', d: "The locked file on Frank's desktop is his emergency plan. The survival package depends on it.", auto: true,
      where: [W.folder('forboard_dir', 'FOR THE BOARD folder'), W.file('realnotes', 'NOTES_to_whoever_finds_this.txt'), W.file('changelog', 'CHANGE_LOG_do_not_share.xls')],
      hints: ["Frank left a note for whoever finds the REAL VERSION folder. The password is written as an Excel formula.", "CONCAT joins numbers as text: what they told the Board, then what's true (Frank's real runway), both in days. The Board number is on the Cash Runway tab (B30) of the Q4 Board Pack in BOARD › BOARD VERSION, and in the change log.", '=CONCAT(182, 43) → 18243 (as of 10/16).'] },
    { id: 'send', level: 1, t: 'Send the Board Pack to Diane', d: 'Everything the Board and the bank need, in one email, before 9:00 AM.', auto: true,
      where: [W.mail()],
      hints: ["Reply to Diane's email \"Send me the pack. Now.\" in Outlook Express.", 'Or a new message to diane.kessler@packacorp.com.', 'Reply, then Send. The files attach themselves.'] },
    { id: 'frank', level: 2, t: "Find out who is on Frank's team", d: "The team is in Vegas and can't find him. Who is on Frank's team at the championship?", pick: 'suspects',
      where: [W.mail("Rachel's email", 'm_rachel_knew'), W.folder('recycle', 'Recycle Bin'), W.folder('personal', 'My Documents › Personal')],
      hints: ['Rachel has a theory. Read her email "I KNEW IT".', "Frank's Recycle Bin has a boarding pass with a +1. His speedrun file lists a team.", 'Kristians Bušārs. Pick his card.'] },
  ];
  const BUDGET_FILES = ['bud_v3', 'bud_v4', 'bud_v5ff', 'bud_v5ut', 'bud_v6'];
  const SUSPECTS = [
    { id: 'kristians', n: 'Kristians Bušārs', r: 'FP&A influencer, Riga', photo: true },
    { id: 'drew', n: 'Drew Hollis', r: 'VP Finance, cowboy hat' },
    { id: 'rachel', n: 'Rachel Moss', r: 'Payroll & HR' },
    { id: 'marcus', n: 'Marcus Hale', r: 'Prairie Ledger Bank' },
  ];
  FR.checklist = { ITEMS };

  /* =========================================================== SCREENS */
  function show(el) { root.querySelectorAll('.fr-screen').forEach(s => s.remove()); root.appendChild(el); }

  function intro() {
    const hasSave = Object.keys(FR.state.solved).length > 0;
    const el = $(`<div class="fr-screen fr-intro"><div class="fr-folder">
      <div class="fr-stamp">URGENT</div>
      <h1>Packa Corporation</h1>
      <div class="fr-sub">INTERNAL · FINANCE · CASE FILE #FW-1016 · Sedalia, Missouri</div>
      <div class="fr-clip"><div class="fr-polaroid"><img class="fr-missing" src="${FR.data.images.frankAvatar}" alt="Frank Warmington"><span>FP&amp;A Manager<br><small>(the website says Director)</small></span></div>
      <div><p><b>Monday, October 19, 2026 — 11:47 PM.</b> Frank, our FP&amp;A Manager, has not been seen since Friday night. There is a man-sized hole behind the cheat-sheet poster at his desk. We are not discussing the hole.</p>
      <p>The Board meets <b>tomorrow at 9:00 AM</b>. Prairie Ledger Bank will release a <b>$4.0M survival package</b> only if the Board Pack is complete — and true.</p></div></div>
      <p>Packa doesn't run on a finance platform. Every number lives in Frank's files, Frank's inbox and Frank's head. The rest of the team flew to Las Vegas to look for him. You're at his desk.</p>
      <ul class="fr-objectives"><li>Crack Frank's Windows password.</li><li>Work through his email, Excel files and folders.</li><li>Track your progress on Frank's <b>Board Pack</b> checklist.</li><li>You will need <b>www.packacorp.com</b>. Frank's Internet Explorer opens it, or keep it in another tab.</li></ul>
      <div class="fr-intro-start">
        <button class="fr-bigbtn" data-a="go">${hasSave ? 'Continue at Frank\'s desk' : "Sit down at Frank's desk"}</button>
        ${hasSave ? '<button class="fr-bigbtn" data-a="new">Start over</button>' : ''}
        <a class="fr-small" href="${CONFIG.siteUrl}" target="_blank" rel="noopener">Open packacorp.com ↗</a>
      </div>
      <p class="fr-small fr-save-line" style="margin-top:14px">Made for finance people. ${FR.mobile ? 'Best on a laptop or desktop, but it works on a phone too (Excel is easier sideways).' : 'Best on a laptop or desktop.'} ${saveLine()}</p>
    </div></div>`);
    el.querySelector('[data-a=go]').onclick = () => { FR.sound.play('click'); if (!FR.state.startedAt) { FR.state.startedAt = Date.now(); FR.save(); } boot(); };
    const n = el.querySelector('[data-a=new]');
    if (n) n.onclick = () => confirmStartOver();
    const acct = el.querySelector('[data-a=acct]'), out = el.querySelector('[data-a=out]');
    if (acct) acct.onclick = e => { e.preventDefault(); FR.sound.play('click'); FR.account.screen('new').then(intro); };
    if (out) out.onclick = e => { e.preventDefault(); FR.dialog({ icon: 'question', title: 'Sign out', message: `Sign out of <b>${esc(FR.account.user)}</b>?<br><br>Your progress stays saved in your player account.`, buttons: ['Sign out', 'Cancel'] }).then(r => { if (r.button === 'Sign out') FR.account.signOut(); }); };
    show(el);
  }

  // where progress is kept: the player's account, or only this browser (with a way to sign in)
  function saveLine() {
    const A = FR.account || {};
    if (A.user) return `Signed in as <b>${esc(A.user)}</b>: progress saves to your player account. <a href="#" data-a="out">Sign out</a>`;
    if (A.available) return 'Progress saves in this browser. <a href="#" data-a="acct">Sign in or create a player</a> to continue on any computer.';
    return 'Progress saves in this browser.';
  }

  function confirmStartOver() {
    const keeps = FR.account && FR.account.user && FR.puzzle.isSolved('frank') ? '<br><br>Your place on the leaderboard stays: only your first finished game counts.' : '';
    return FR.dialog({ icon: 'warn', title: 'Start over', message: "Start over from the beginning?<br><br>Everything you've done at Frank's desk will be erased: the checklist, hints and time." + keeps, buttons: ['Start over', 'Cancel'] })
      .then(r => { if (r.button === 'Start over') Promise.resolve(FR.resetSave()).then(() => location.reload()); });
  }

  function boot() {
    const el = $(`<div class="fr-screen fr-boot">
      <div class="fr-boot-logo"><img src="${LOGO}" alt=""><div>Packa Corporation<small>WORKSTATION · PACKA-FPA-01</small></div></div>
      <div class="fr-boot-bar"><i><b></b><b></b><b></b></i></div>
      <div class="fr-boot-foot"><span>Copyright © Packa Corporation IT</span><span>Loading Frank's profile…</span></div></div>`);
    show(el);
    // returning player: Frank's password is already cracked, go straight to the desktop (short boot); any click skips the boot
    const resuming = FR.puzzle.isSolved('login') && !DEV;
    let went = false; const go = () => { if (went) return; went = true; (resuming ? () => welcome(true) : login)(); };
    el.onclick = go;
    setTimeout(go, DEV ? 10 : resuming ? 900 : 2600);
  }

  function login() {
    let fails = 0;
    const el = $(`<div class="fr-screen fr-login">
      <div class="fr-login-top"></div>
      <div class="fr-login-mid">
        <div class="fr-login-left"><div class="fr-brand"><img src="${LOGO_RED}" alt="Packa Corporation logo"><div>PACKA CORPORATION<small>Packaging &amp; Corrugated Products</small></div></div><p>Frank's account is the only one. Obviously.</p></div>
        <div class="fr-login-div"></div>
        <div class="fr-login-right">
          <div class="fr-user"><div class="fr-avatar"><img src="${FR.data.images.frankAvatar}" alt="Frank's account picture"></div>
            <div><div class="fr-user-name">Frank Warmington</div><div class="fr-user-sub">FP&amp;A · last log on Fri 10/16 11:59 PM</div>
              <div class="fr-pw-row"><input type="password" placeholder="Type your password" autocomplete="off" spellcheck="false" aria-label="Password">
                <button class="fr-go" title="Log on" aria-label="Log on"><svg viewBox="0 0 16 16"><path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                <button class="fr-q" title="Password hint" aria-label="Password hint">?</button></div>
              <div class="fr-err-slot"></div></div></div>
        </div>
      </div>
      <div class="fr-postit" title="A sticky note on Frank's monitor">PW hint is<br>on our own<br>homepage :)<br><span>— F.</span></div>
      <div class="fr-login-bot"><div class="fr-offbtn">${FR.icon('shutdown', 26)}<span>Turn off computer</span></div>
        <div class="fr-login-note">Everything you need is on Frank's computer — and on <a href="${CONFIG.siteUrl}" target="_blank" rel="noopener" style="color:#fff">www.packacorp.com</a>.<br>The Board meets at 9:00 AM.</div></div>
    </div>`);
    show(el);
    const inp = el.querySelector('input'), slot = el.querySelector('.fr-err-slot');
    setTimeout(() => inp.focus(), 50);
    let hintEl = null;
    const showHint = (extra) => {
      if (hintEl) hintEl.remove();
      // sit below the error message (if any), never on top of it
      const r = el.querySelector('.fr-pw-row').getBoundingClientRect(), er = slot.getBoundingClientRect();
      const top = Math.max(r.bottom, slot.childElementCount ? er.bottom : 0);
      hintEl = $(`<div class="fr-login-hint"><b>${FR.icon('info', 14)} Password hint</b>=LOWER(the town where Packa started) &amp; the year it started. (Yes, an Excel formula. No spaces.)${extra ? `<div style="margin-top:6px"><b style="display:inline">Still stuck?</b> It's right on the <a href="${CONFIG.siteUrl}" target="_blank" rel="noopener">packacorp.com</a> homepage: the town, then the year.</div>` : ''}<div class="fr-login-fos">FinanceOS Assist is available once you're in.</div></div>`);
      hintEl.style.left = r.left + 'px'; hintEl.style.top = top + 10 + 'px';
      // phones: in the flow under the password box, so it moves with it when the keyboard comes up
      if (FR.mobile) { hintEl.classList.add('fr-login-hint-m'); slot.after(hintEl); } else el.appendChild(hintEl);
    };
    el.querySelector('.fr-q').onclick = () => { FR.sound.play('ding'); hintEl ? (hintEl.remove(), hintEl = null) : showHint(fails >= 2); };
    const attempt = () => {
      if (FR.puzzle.check.login(inp.value)) {
        const back = FR.puzzle.isSolved('login');   // logging back on after Log Off: resume, no intro replay
        FR.puzzle.solve('login');
        if (!FR.state.startedAt) { FR.state.startedAt = Date.now(); FR.save(); }
        welcome(back); return;
      }
      fails++; FR.puzzle.miss(); FR.sound.play('error');
      const u = el.querySelector('.fr-user'); u.classList.remove('fr-shake'); void u.offsetWidth; u.classList.add('fr-shake');
      slot.innerHTML = `<div class="fr-login-err">Did you forget your password? Please type your password again.<br>Be sure to use the correct uppercase and lowercase letters.</div>`;
      inp.value = ''; inp.focus();
      showHint(fails >= 2);
    };
    el.querySelector('.fr-go').onclick = attempt;
    inp.onkeydown = e => { if (e.key === 'Enter') attempt(); };
    el.querySelector('.fr-offbtn').onclick = () => FR.dialog({ icon: 'warn', title: 'Turn off computer', message: "It's almost midnight and the Board meets at 9:00 AM.<br>Frank would never." });
  }

  function welcome(resume) {
    const el = $(`<div class="fr-screen fr-login"><div class="fr-login-top"></div><div class="fr-login-mid" style="font:italic 700 44px Tahoma;text-shadow:2px 2px 3px rgba(0,0,0,.3)">welcome</div><div class="fr-login-bot"></div></div>`);
    show(el);
    FR.sound.play('startup');
    setTimeout(() => desktop(!resume, resume), 1700);
  }

  /* =========================================================== DESKTOP */
  let startMenu = null, storageWarned = false, lowDiskShown = false;
  // Properties for a file node: the shell's dialog if it has one, else a plain summary
  function props(node) {
    if (FR.apps.properties) return FR.apps.properties(node);
    FR.dialog({ icon: 'info', title: node.name + ' Properties', message: `<b>${esc(node.name)}</b><br><br>Location: ${esc(FR.fs.path ? FR.fs.path(node.id) : '')}<br>Size: ${esc(node.size || '')}<br>Modified: ${esc(node.modified || '')}${node.author ? '<br>Author: ' + esc(node.author) : ''}${node.comments ? '<br>Comments: ' + esc(node.comments) : ''}` });
  }
  function desktop(firstTime, resumed) {
    const el = $(`<div class="fr-screen fr-desktop">
      <div class="fr-wall">${WALLPAPER()}</div>
      <div class="fr-icons"></div>
      <div class="fr-layer"></div>
      <div class="fr-taskbar">
        <button class="fr-startbtn"><img src="${LOGO}" alt="">start</button>
        <div class="fr-quick"></div>
        <div class="fr-tasks"></div>
        <div class="fr-tray"><span class="fr-pack" title="Board Pack checklist">${FR.icon('checklist', 16)}<span class="fr-pack-n"></span></span><img class="fr-ktray" src="${FR.data.images.kristians}" alt="" title="Kristians' Cheat Sheet of the Day">${FR.icon('volume', 16)}<span class="fr-clock"></span></div>
      </div></div>`);
    show(el);
    FR.wm.init(el.querySelector('.fr-layer'), el.querySelector('.fr-tasks'));
    // icons
    const icons = [
      { n: 'My Documents', i: 'mydocs', a: () => FR.apps.explorer('mydocs') },
      { n: 'My Computer', i: 'computer', a: () => FR.apps.explorer('mycomputer') },
      { n: 'Recycle Bin', i: 'recycleFull', a: () => FR.apps.recycle() },
      { n: 'Internet Explorer', i: 'ie', a: () => FR.apps.ie(null) },
      { n: 'Outlook Express', i: 'mail', a: () => FR.apps.mail(null) },
      { n: 'Microsoft Excel', i: 'excel', a: () => FR.apps.excel(null) },
      { n: 'ShowMe ERP', i: 'erp', a: () => FR.apps.erp() },
      { n: 'Board Pack — TO DO', i: 'checklist', a: () => openChecklist() },
      ...(FR.score.available() ? [{ n: 'Who Covered for Frank?', i: 'ie', a: () => FR.score.open(), shortcut: true }] : []),
      ...FR.fs.children('desktop', { showHidden: false }).map(n => ({ n: n.name, i: n.icon, a: () => FR.openFile(n), node: n })),
    ];
    const box = el.querySelector('.fr-icons');
    const touch = matchMedia('(pointer: coarse)').matches;
    icons.forEach(ic => {
      // long file names: allow breaks after _ and . ; two lines max (full name on hover / when selected)
      const d = $(`<div class="fr-dicon${ic.shortcut ? ' fr-dicon-lnk' : ''}" tabindex="0">${FR.icon(ic.i, 32)}<span class="fr-dl">${esc(ic.n).replace(/([_.])/g, '$1<wbr>')}</span></div>`);
      d.title = ic.n;
      const select = () => { box.querySelectorAll('.sel').forEach(s => s.classList.remove('sel')); d.classList.add('sel'); };
      // touch / phones: one tap opens; a double-tap (desktop habit) must not open it two or three times
      d.onclick = e => { e.stopPropagation(); select(); if ((touch || FR.mobile) && Date.now() > (d.tapGuard || 0)) { d.tapGuard = Date.now() + 600; ic.a(); } };
      d.oncontextmenu = e => {
        e.preventDefault(); e.stopPropagation(); select();
        const items = [{ label: 'Open', action: () => ic.a() }];
        if (ic.node) items.push({ sep: true }, { label: 'Properties', action: () => props(ic.node) });
        ctxMenu(e.clientX, e.clientY, items);
      };
      d.ondblclick = () => { if (touch || FR.mobile) return; FR.sound.play('click'); ic.a(); };
      d.onkeydown = e => { if (e.key === 'Enter') ic.a(); };
      box.appendChild(d);
    });
    el.querySelector('.fr-wall').onclick = () => box.querySelectorAll('.sel').forEach(s => s.classList.remove('sel'));
    el.querySelector('.fr-wall').oncontextmenu = e => { e.preventDefault(); ctxMenu(e.clientX, e.clientY, [
      { label: 'Arrange Icons By', disabled: true }, { label: 'Refresh', action: () => {} }, { sep: true },
      { label: 'New', disabled: true }, { sep: true },
      { label: 'Properties', action: () => FR.dialog({ icon: 'warn', title: 'Display Properties', message: 'Frank has locked the display settings.<br>Do not touch the "Do not touch." —F' }) }]); };
    // quick launch
    const ql = el.querySelector('.fr-quick');
    [['ie', () => FR.apps.ie(null), 'Launch Internet Explorer'], ['mail', () => FR.apps.mail(null), 'Launch Outlook Express'], ['excel', () => FR.apps.excel(null), 'Microsoft Excel']].forEach(([i, a, t]) => {
      const s = $(`<span title="${t}">${FR.icon(i, 18)}</span>`); s.onclick = a; ql.appendChild(s);
    });
    // tray
    const clock = el.querySelector('.fr-clock');
    const tick = () => { const d = FR.clock.now(); clock.textContent = FR.clock.fmt(d, 'time'); clock.title = FR.clock.fmt(d, 'long'); };
    tick(); setInterval(tick, 5000);
    el.querySelector('.fr-pack').onclick = () => { if (FR.puzzle.isSolved('frank') && !document.querySelector('.fr-end')) ending(); else openChecklist(); };
    const vol = el.querySelectorAll('.fr-tray > .fr-ico')[0];
    vol.title = 'Volume'; vol.style.opacity = FR.sound.muted ? .45 : 1;
    vol.onclick = () => { FR.sound.muted = !FR.sound.muted; FR.state.flags.muted = FR.sound.muted; FR.save(); vol.style.opacity = FR.sound.muted ? .45 : 1; FR.balloon('Volume', FR.sound.muted ? 'Sounds are muted.' : 'Sounds are on.'); };
    if (!FR.storageOk && !storageWarned) { storageWarned = true; setTimeout(() => FR.balloon('Progress not saved', "Progress can't be saved in this browser (private mode?)"), 4000); }
    updateTray();
    el.querySelector('.fr-ktray').onclick = () => kTip();
    stickies(el);
    // start menu
    const sb = el.querySelector('.fr-startbtn');
    sb.onclick = e => { e.stopPropagation(); if (startMenu) closeStart(); else { FR.sound.play('start'); openStart(el, sb); } };
    document.addEventListener('mousedown', e => { if (startMenu && !startMenu.contains(e.target) && !sb.contains(e.target)) closeStart(); });

    if (firstTime || DEV || resumed) {
      setTimeout(() => openChecklist(), DEV ? 0 : 700);
      if (!DEV && !resumed) setTimeout(() => FR.balloon('You have new e-mail', 'Diane Kessler: "Board Pack — 9:00 AM. No excuses."', () => FR.apps.mail(null)), 2600);
    }
    if (FR.puzzle.isSolved('frank') && !DEV) setTimeout(ending, 800);
    if (!DEV) {
      setTimeout(() => kTip(0), resumed ? 20000 : 45000);
      if (!lowDiskShown) { lowDiskShown = true; setTimeout(() => FR.balloon('Low Disk Space', 'You are running out of disk space on Local Disk (C:).<br>47 versions of the model will do that.', null, { silent: false }), 150000); }
    }
  }

  /* ---------- Frank's personality: sticky notes, Kristians tips, screensaver ---------- */
  const KTIPS = [
    'F2 edits a cell, Esc gets you out. I do both 400 times a day. Frank tries to keep up.',
    'Select a few cells and look at the status bar: Sum= is a free calculator.',
    'A red triangle in a cell corner means a comment. Hover to read it.',
    'Right-click a file and choose Properties. Authors and dates tell stories.',
    'Hidden files are still files. Tools › Folder Options › View shows them.',
    "Never plug a number you can calculate. There's always a formula.",
    'F4 toggles $ in a reference. Absolute ranges, absolute peace.',
    'Alt+= AutoSums the block above. Kristians does it blindfolded.',
  ];
  // phones: same tips where they need a mouse, said for a finger
  const KTIPS_M = { 2: 'A red triangle in a cell corner means a comment. Tap the cell to read it.', 3: 'Long-press a file and choose Properties. Authors and dates tell stories.' };
  let kIdx = 0;
  function kTip(i) {
    const n = (i ?? kIdx) % KTIPS.length, t = (FR.mobile && KTIPS_M[n]) || KTIPS[n]; kIdx = (i ?? kIdx) + 1;
    FR.balloon("Kristians' Cheat Sheet of the Day", `<div class="fr-ktip"><img src="${FR.data.images.kristians}" alt=""><span>${esc(t)}</span></div>`, null);
  }
  setInterval(() => { if (document.querySelector('.fr-desktop') && !document.querySelector('.fr-balloon')) kTip(); }, 240000);

  function stickies(el) {
    const notes = [
      { c: 'y', t: 'DO NOT TOUCH<br>the DO NOT DELETE tab', x: 200, y: 16, r: -3 },
      { c: 'p', t: 'Kristians LIVE ★<br>Thu 8pm (4am Riga!!)<br><small>ask about the Vegas team thing</small>', x: 372, y: 22, r: 2 },
      { c: 'g', t: 'Drew "make it work"<br>count: <s>IIII</s> <s>IIII</s> II', x: 544, y: 14, r: -1.5 },
    ];
    const layer = $('<div class="fr-stickies"></div>');
    notes.forEach(n => {
      const d = $(`<div class="fr-sticky fr-sticky-${n.c}" style="left:${n.x}px;top:${n.y}px;transform:rotate(${n.r}deg)">${n.t}</div>`);
      d.onmousedown = e => {
        const sx = e.clientX, sy = e.clientY, ox = d.offsetLeft, oy = d.offsetTop;
        const mv = ev => { d.style.left = ox + ev.clientX - sx + 'px'; d.style.top = oy + ev.clientY - sy + 'px'; };
        const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
        document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); e.preventDefault();
      };
      layer.appendChild(d);
    });
    el.querySelector('.fr-wall').after(layer);
  }

  // screensaver after 5 minutes idle on the desktop
  let idleT = null;
  const resetIdle = () => {
    clearTimeout(idleT);
    idleT = setTimeout(() => { if (document.querySelector('.fr-desktop') && !document.querySelector('.fr-end') && !document.querySelector('.fr-dialog')) screensaver(); }, 300000);
  };
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'].forEach(ev => document.addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();
  function screensaver() {
    if (document.querySelector('.fr-saver')) return;
    const sv = $(`<div class="fr-saver"><img src="${FR.data.images.kristians}" alt=""><div class="fr-saver-m">GET SHEET DONE &nbsp;✦&nbsp; There's always a formula &nbsp;✦&nbsp; Cheat Sheet #212 &nbsp;✦&nbsp; Kristians is my co-pilot &nbsp;✦&nbsp; GET SHEET DONE</div></div>`);
    root.appendChild(sv);
    const img = sv.querySelector('img');
    let x = 80, y = 60, vx = 1.6, vy = 1.2, raf;
    const step = () => {
      const W = innerWidth - 180, H = innerHeight - 220;
      x += vx; y += vy; if (x < 0 || x > W) vx = -vx; if (y < 0 || y > H) vy = -vy;
      img.style.transform = `translate(${x}px, ${y}px)`; raf = requestAnimationFrame(step);
    };
    step();
    const quit = () => { cancelAnimationFrame(raf); sv.remove(); ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(ev => document.removeEventListener(ev, quitH)); };
    let armed = false; setTimeout(() => (armed = true), 400);
    const quitH = () => { if (armed) quit(); };
    ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, quitH));
  }
  FR.screensaver = screensaver;

  function ctxMenu(x, y, items) {
    document.querySelectorAll('.fr-ctx').forEach(c => c.remove());
    const m = $('<div class="fr-ctx"></div>');
    items.forEach(it => {
      if (it.sep) { m.appendChild($('<div class="fr-menu-sep"></div>')); return; }
      const r = $(`<div class="fr-menu-item ${it.disabled ? 'disabled' : ''}"><span class="fr-menu-check"></span><span></span></div>`);
      r.children[1].textContent = it.label;
      r.onclick = () => { m.remove(); if (!it.disabled && it.action) it.action(); };
      m.appendChild(r);
    });
    m.style.left = Math.min(x, innerWidth - 180) + 'px'; m.style.top = Math.min(y, innerHeight - 160) + 'px';
    document.body.appendChild(m);
    setTimeout(() => document.addEventListener('mousedown', function h(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', h); } }), 0);
  }

  function openStart(el, sb) {
    sb.classList.add('on');
    const it = (icon, title, sub, a, cls = '') => { const r = $(`<div class="fr-sm-item ${cls}">${FR.icon(icon, 30)}<div><b></b>${sub ? '<small></small>' : ''}</div></div>`); r.querySelector('b').textContent = title; if (sub) r.querySelector('small').textContent = sub; r.onclick = () => { closeStart(); a(); }; return r; };
    const m = $(`<div class="fr-start"><div class="fr-start-head"><div class="fr-avatar"><img src="${FR.data.images.frankAvatar}" alt=""></div>Frank Warmington</div>
      <div class="fr-start-body"><div class="fr-start-l"></div><div class="fr-start-r"></div></div><div class="fr-start-foot"></div></div>`);
    const L = m.querySelector('.fr-start-l'), R = m.querySelector('.fr-start-r'), F = m.querySelector('.fr-start-foot');
    L.append(it('ie', 'Internet', 'Internet Explorer', () => FR.apps.ie(null)), it('mail', 'E-mail', 'Outlook Express', () => FR.apps.mail(null)), $('<div class="fr-sm-sep"></div>'),
      it('excel', 'Microsoft Excel', '', () => FR.apps.excel(null)), it('erp', 'ShowMe ERP', 'Packa Corporation', () => FR.apps.erp()), it('checklist', 'Board Pack — TO DO', '', openChecklist), it('notepad', 'Notepad', '', () => FR.apps.notepad(null)), it('calc', 'Calculator', '', () => FR.apps.calc()),
      ...(FR.score.available() ? [it('ie', 'Who Covered for Frank?', 'Board Pack Rescue leaderboard', () => FR.score.open())] : []),
      ...(FR.puzzle.isSolved('frank') ? [it('star', 'Show the ending again', '', () => ending())] : []),
      $('<div class="fr-sm-sep"></div>'), it('star', 'All Programs', '', () => FR.dialog({ icon: 'info', title: 'All Programs', message: 'Frank uninstalled everything except Excel, Outlook and Solitaire.<br>Then he uninstalled Solitaire.' }), 'fr-sm-all'));
    R.append(it('mydocs', 'My Documents', '', () => FR.apps.explorer('mydocs')), it('image', 'My Pictures', '', () => FR.apps.explorer('pics')), it('computer', 'My Computer', '', () => FR.apps.explorer('mycomputer')),
      $('<div class="fr-sm-sep"></div>'), it('controlpanel', 'Control Panel', '', () => FR.dialog({ icon: 'error', title: 'Control Panel', message: 'Access is denied.<br><br>Contact your system administrator. (IT is also in Vegas.)' })),
      it('help', 'Help and Support', '', openHelp), it('search', 'Search', '', () => FR.apps.explorer('mydocs')), it('question', 'Run...', '', runBox));
    F.append(it('logoff', 'Log Off', '', () => FR.dialog({ icon: 'question', title: 'Log Off Windows', message: 'Are you sure you want to log off? Your progress is saved.', buttons: ['Log Off', 'Cancel'] }).then(r => { if (r.button === 'Log Off') { FR.sound.play('logoff'); FR.save(); document.querySelectorAll('.fr-balloon, .fr-ctx').forEach(x => x.remove()); setTimeout(login, 600); } })),
      it('shutdown', 'Turn Off Computer', '', shutdown));
    el.appendChild(m); startMenu = m;
  }
  function closeStart() { if (startMenu) startMenu.remove(); startMenu = null; document.querySelectorAll('.fr-startbtn').forEach(b => b.classList.remove('on')); }

  function runBox() {
    FR.dialog({ icon: 'question', title: 'Run', message: 'Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.', input: { label: 'Open:', value: '' }, buttons: ['OK', 'Cancel'] }).then(r => {
      if (r.button !== 'OK') return;
      const v = (r.value || '').trim().toLowerCase().replace(/\.exe$/, '');
      const map = { solitaire: () => FR.dialog({ icon: 'error', title: 'solitaire', message: 'Uninstalled. Frank had a problem.' }), sol: () => FR.dialog({ icon: 'error', title: 'sol', message: 'Uninstalled. Frank had a problem.' }), kristians: () => FR.dialog({ icon: 'error', title: 'kristians', message: "Windows cannot find 'kristians'. Neither can Rachel." }), excel: () => FR.apps.excel(null), calc: () => FR.apps.calc(), notepad: () => FR.apps.notepad(null), iexplore: () => FR.apps.ie(null), msimn: () => FR.apps.mail(null), outlook: () => FR.apps.mail(null), explorer: () => FR.apps.explorer('mydocs'), cmd: () => FR.dialog({ icon: 'error', title: 'cmd', message: 'Frank disabled the command prompt after "the incident".' }) };
      if (map[v]) return map[v]();
      if (/^https?:|^www\./.test(v)) return FR.apps.ie(v.startsWith('www.') ? 'https://' + v : v);
      FR.dialog({ icon: 'error', title: esc(r.value || ''), message: `Windows cannot find '${esc(r.value || '')}'. Make sure you typed the name correctly, and then try again.` });
    });
  }

  function shutdown() {
    const s = $(`<div class="fr-shut"><div class="fr-shut-box"><div class="fr-shut-t">Turn off computer</div><div class="fr-shut-b">
      <div data-a="s">${FR.icon('logoff', 34)}Stand By</div><div data-a="t">${FR.icon('shutdown', 34)}Turn Off</div><div data-a="r">${FR.icon('back', 34)}Restart</div></div>
      <div class="fr-shut-f"><button>Cancel</button></div></div></div>`);
    root.appendChild(s);
    s.querySelector('button').onclick = () => s.remove();
    s.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { s.remove(); if (b.dataset.a === 'r') { boot(); return; } FR.dialog({ icon: 'warn', title: 'Frank Warmington\'s Computer', message: FR.puzzle.isSolved('frank') ? "The pack is sent. Fine. Go to bed. Frank isn't back till Thursday." : "It's " + FR.clock.fmt(FR.clock.now()) + '. The Board meets at 9:00 AM.<br>Nobody is turning anything off tonight.' }); });
  }

  function openHelp() {
    FR.wm.open({ id: 'help', title: 'Help and Support Center', icon: 'help', width: 520, height: 470, content: `<div class="fr-help">
      <h3>What is going on?</h3><p>Frank Warmington, Packa's FP&amp;A Manager, disappeared on Friday night. The Board meets at 9:00 AM and the bank's $4.0M survival package depends on a complete, honest Board Pack. Everything is on this computer.</p>
      <h3>How to play</h3><p>Open <b>Board Pack — TO DO</b> (desktop or the clipboard in the tray) to see where you stand. Items unlock one by one. The orange dots show how hard each one is. Each one has <b>Look in</b> shortcuts that open the right folder, email or web page. Some items tick themselves when you crack something in Excel or Outlook; others ask you to pick or type an answer.</p>
      ${FR.mobile ? `<p>Tap to open files and folders. Long-press a file (on the desktop too) for Properties. In Excel, tap a cell, then tap it again (or tap the formula bar) to type; Enter or ✓ puts it in. A cell with a red triangle has a note: tap it to read it. Switch windows with the buttons on the taskbar.</p>` : `<p>Double-click to open files and folders. Right-click files (on the desktop too) for Properties. Excel works like Excel: type formulas, and select cells to see their Sum in the status bar.</p>`}
      <h3>Where are the clues?</h3><p>In Frank's email, his Excel files, his folders (some are hidden), his Recycle Bin, and on <a href="${CONFIG.siteUrl}" target="_blank" rel="noopener">www.packacorp.com</a> — the company website. Keep it open in another tab.</p>
      <h3>Stuck?</h3><p>Emily from finance installed a Datarails FinanceOS trial on Frank's machine (day 13 of 14). Every checklist item has an <b>Ask FinanceOS</b> button with three hints, from a gentle nudge to the full answer.</p><h3>Score</h3><p>${esc(FR.score.rulesLine())}.${FR.score.available() ? ' Signed-in players are ranked on <b>Board Pack Rescue - Who Covered for Frank?</b> on Packa\'s intranet (the shortcut on the desktop); your first finished game is the one that counts.' : ''}</p>
      <h3>Progress</h3><p>Your progress saves in this browser. Log off and come back any time.</p></div>` });
  }

  /* =========================================================== CHECKLIST APP */
  function openChecklist() {
    const h = Math.max(200, Math.min(600, innerHeight - 70));
    const w = FR.wm.open({ id: 'checklist', title: 'Board Pack — TO DO.txt', icon: 'checklist', width: 440, height: h, x: Math.max(10, innerWidth - 470), y: 16, content: '<div class="ck-wrap"></div>' });
    if (!w.max) { w.el.style.height = h + 'px'; if (w.clamp) w.clamp(); }
    renderChecklist(w);
    return w;
  }
  FR.apps.checklist = openChecklist;

  let justSolved = null;
  // hints are "provided by" Emily's FinanceOS trial on Frank's machine (story frame only; hint content unchanged)
  const FOS_MARK = '<svg class="ck-fos-mark" viewBox="0 0 16 16" aria-hidden="true"><rect x="0.5" y="0.5" width="15" height="15" rx="4" fill="#2f44c9"/><path d="M5.5 4h5.5M5.5 4v8M5.5 7.8h4.3" stroke="#fff" stroke-width="1.9" stroke-linecap="round" fill="none"/></svg>';
  const FOS_PREFACE = [
    "Packa doesn't run on FinanceOS. If it did, this would be one click. Instead:",
    'Connected to nothing at Packa, still helpful:',
    "Governed data would answer this. Frank's folders will have to do:",
    "No ERP, no CRM, no HRIS connected. Just Frank's files. Here goes:",
    "One version of the truth would help here. Packa has five. So:",
  ];
  function renderChecklist(w) {
    const wrap = w.body.querySelector('.ck-wrap');
    if (!wrap) return;
    const done = ITEMS.filter(i => FR.puzzle.isSolved(i.id)).length;
    const sc = FR.score.now();
    const scrollTop = wrap.querySelector('.ck-list') ? wrap.querySelector('.ck-list').scrollTop : 0;
    // keep a half-typed answer (and focus) across re-renders triggered by mail/flag events
    const oldInp = wrap.querySelector('.ck-item.open .ck-ans input');
    const keep = oldInp && oldInp.value ? { id: FR.puzzle.current(), v: oldInp.value, f: document.activeElement === oldInp } : null;
    wrap.innerHTML = `<div class="ck-head">${FR.icon('checklist', 34)}<div><h2>BOARD PACK — due Tue 9:00 AM</h2><p>Frank's to-do list. Get all ten done and Packa survives.</p></div></div>
      <div class="ck-prog"><progress max="${ITEMS.length}" value="${done}"></progress><b>${done} of ${ITEMS.length} done</b></div>
      <div class="ck-list"></div>
      <div class="ck-foot"><span class="ck-meta">${FR.score.available() ? '<a href="#" class="ck-score">' : '<b class="ck-score">'}Score: ${FR.score.fmt(sc.score)}${FR.score.available() ? '</a>' : '</b>'} · ${sc.freeLeft ? `Free hints left: ${sc.freeLeft}` : `Hints: −${FR.score.rules.PER_HINT} each`} · Time: <span class="ck-time">${FR.clock.dur(FR.clock.playMs())}</span></span><button class="ck-help">How to play</button></div>`;
    wrap.querySelector('.ck-help').onclick = openHelp;
    const scoreLink = wrap.querySelector('a.ck-score');
    if (scoreLink) scoreLink.onclick = e => { e.preventDefault(); FR.score.open(); };
    const list = wrap.querySelector('.ck-list');
    FR.state.unlockedAt = FR.state.unlockedAt || {};
    ITEMS.forEach((it, idx) => {
      const solved = FR.puzzle.isSolved(it.id), unlocked = FR.puzzle.isUnlocked(it.id);
      const active = unlocked && !solved;
      if (active && !FR.state.unlockedAt[it.id]) { FR.state.unlockedAt[it.id] = Date.now(); FR.save(); }
      const used = FR.state.hintsUsed[it.id] || 0;
      const pips = `<span class="ck-lvl" title="Difficulty">${[1, 2, 3, 4].map(n => `<i class="${n <= it.level ? 'on' : ''}"></i>`).join('')}</span>`;
      const row = $(`<div class="ck-item ${solved ? 'done' : active ? 'open' : 'locked'} ${justSolved === it.id ? 'ck-just' : ''}"><div class="ck-box">${!solved && !unlocked ? FR.icon('lock', 12) : ''}</div><div class="ck-main">
        <div class="ck-t"><span class="ck-n">${idx + 1}.</span> ${solved ? `<s>${esc(it.t)}</s>` : unlocked ? esc(it.t) : 'Locked — finish the item above first'} ${active && it.id !== 'login' ? pips : ''}</div>
        ${active ? `<div class="ck-d">${esc(it.d)}</div>` : ''}
        ${active && it.where ? `<div class="ck-where"><span>Look in:</span></div>` : ''}
        ${active && it.input ? `<div class="ck-ans"><input type="text" placeholder="${esc(it.ph || '')}" aria-label="${esc(it.input)}" spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off"><button>Submit</button></div>` : ''}
        ${active && it.pick ? `<div class="ck-pick ck-pick-${it.pick}"></div>` : ''}
        ${active ? `<div class="ck-fb"></div>` : ''}
        ${active && it.auto && it.id !== 'login' ? `<div class="ck-auto">Ticks itself when you do it.</div>` : ''}
        <div class="ck-hints"></div>
        ${active ? `<div class="ck-hrow"><button class="ck-hbtn" ${used >= 3 ? 'disabled' : ''}>${FOS_MARK}<span>${used >= 3 ? 'FinanceOS has nothing more' : (used ? `Ask FinanceOS (${used}/3)` : 'Ask FinanceOS') + (sc.freeLeft ? '' : ` · −${FR.score.rules.PER_HINT} pts`)}</span></button></div>` : ''}
        ${solved && FR.state.answers && FR.state.answers[it.id] ? `<div class="ck-solved-val">✓ ${esc(FR.state.answers[it.id])}</div>` : ''}
        ${solved && justSolved === it.id ? `<div class="ck-stamp">DONE</div>` : ''}
      </div></div>`);
      // where-to-look chips
      const wh = row.querySelector('.ck-where');
      if (wh) it.where.forEach(([label, act]) => { const c = $(`<button class="ck-chip"></button>`); c.textContent = label; c.onclick = () => { FR.sound.play('click'); act(); }; wh.appendChild(c); });
      const hbox = row.querySelector('.ck-hints');
      if (active) for (let i = 0; i < used; i++) hbox.appendChild($(`<div class="ck-hint ck-fos"><div class="ck-fos-h">${FOS_MARK}<b>Datarails FinanceOS</b><span>· Emily's trial · hint ${i + 1}/3</span></div><div class="ck-fos-p">${esc(FOS_PREFACE[(idx + i) % FOS_PREFACE.length])}</div><div class="ck-fos-t">${esc((FR.mobile && it.mhints && it.mhints[i]) || it.hints[i])}</div></div>`));
      const hb = row.querySelector('.ck-hbtn');
      if (hb) hb.onclick = () => {
        const n = FR.state.hintsUsed[it.id] || 0;
        if (n >= 3) return;
        const take = () => { FR.state.hintsUsed[it.id] = n + 1; FR.save(); FR.sound.play('ding'); renderChecklist(w); };
        // the free hints are gone: every hint now costs points, so ask first
        const cost = FR.score.now().freeLeft ? '' : `You've used your ${FR.score.rules.FREE_HINTS} free hints. This one costs <b>${FR.score.rules.PER_HINT} points</b>.`;
        if (n === 2 || cost) {
          FR.dialog({ icon: 'question', title: 'FinanceOS Assist', message: [n === 2 ? "This one gives the answer away. FinanceOS won't judge. Emily might." : '', cost].filter(Boolean).join('<br><br>'), buttons: [n === 2 ? 'Show it' : 'Use a hint', 'Cancel'] })
            .then(r => { if (r.button === 'Show it' || r.button === 'Use a hint') take(); });
          return;
        }
        take();
      };
      const fb = row.querySelector('.ck-fb');
      const tryAnswer = (value, shown, ok) => {
        const chk = FR.puzzle.check[it.id];
        if (ok ?? (chk && chk(value))) {
          FR.state.answers = FR.state.answers || {}; FR.state.answers[it.id] = shown || value; FR.save();
          FR.puzzle.solve(it.id); return true;
        }
        FR.puzzle.miss(); FR.sound.play('error');
        fb.className = 'ck-fb bad'; fb.textContent = WRONG[it.id] ? WRONG[it.id](value) : 'Not quite. Check the numbers again.';
        row.classList.remove('fr-shake'); void row.offsetWidth; row.classList.add('fr-shake');
        return false;
      };
      const inp = row.querySelector('.ck-ans input');
      if (inp) {
        const submit = () => { const v = inp.value.trim(); if (!v) return; if (!tryAnswer(v, it.id === 'bridge' ? '(40)' : undefined)) inp.select(); };
        row.querySelector('.ck-ans button').onclick = submit;
        inp.onkeydown = e => { if (e.key === 'Enter') submit(); };
      }
      const pk = row.querySelector('.ck-pick');
      if (pk && it.pick === 'files') {
        BUDGET_FILES.forEach(fid => {
          const n = FR.fs.get(fid);
          const c = $(`<div class="ck-file">${FR.icon('xls', 20)}<span class="ck-fn"></span><small>open</small><button class="ck-pickbtn">This one</button></div>`);
          c.querySelector('.ck-fn').textContent = n.name.replace(/\.xls$/, '');
          c.querySelector('small').onclick = e => { e.stopPropagation(); FR.openFile(fid); };
          c.ondblclick = () => FR.openFile(fid);
          c.querySelector('.ck-pickbtn').onclick = e => {
            e.stopPropagation();
            FR.dialog({ icon: 'question', title: 'Send to Diane for sign-off', message: `Tell Diane this is the approved FY27 budget?<br><br><b>${esc(n.name)}</b>`, buttons: ['Send to Diane', 'Cancel'] })
              .then(r => { if (r.button === 'Send to Diane') tryAnswer(n.name, n.name); });
          };
          pk.appendChild(c);
        });
      }
      if (pk && it.pick === 'weeks') {
        pk.appendChild($(`<div class="ck-pick-l">First week below $250K:</div>`));
        const g = $('<div class="ck-weeks"></div>');
        for (let wk = 1; wk <= 13; wk++) {
          const b = $(`<button>${wk}</button>`);
          b.title = 'Week ' + wk;
          b.onclick = () => { if (!tryAnswer(String(wk), 'Week ' + wk)) b.classList.add('ck-x'); };
          g.appendChild(b);
        }
        pk.appendChild(g);
      }
      if (pk && it.pick === 'suspects') {
        SUSPECTS.forEach(sp => {
          const c = $(`<button class="ck-sus"><span class="ck-sus-ph"><svg viewBox="0 0 40 44"><circle cx="20" cy="15" r="9" fill="#9fb0cc"/><path d="M3 44c1-11 8-17 17-17s16 6 17 17z" fill="#9fb0cc"/></svg></span><b></b><small></small></button>`);
          c.querySelector('b').textContent = sp.n; c.querySelector('small').textContent = sp.r;
          if (sp.photo && FR.data.images && FR.data.images.kristians) c.querySelector('.ck-sus-ph').innerHTML = `<img src="${FR.data.images.kristians}" alt="">`;
          c.onclick = () => { if (!tryAnswer(sp.n, sp.n, sp.id === 'kristians')) { c.classList.add('ck-x'); fb.textContent = SUSPECT_NO[sp.id]; } };
          pk.appendChild(c);
        });
      }
      list.appendChild(row);
    });
    list.scrollTop = scrollTop;
    if (keep && keep.id === FR.puzzle.current()) { const ni = list.querySelector('.ck-item.open .ck-ans input'); if (ni) { ni.value = keep.v; if (keep.f) ni.focus(); } }
    const focusRow = list.querySelector('.ck-just') || list.querySelector('.ck-item.open');
    if (focusRow && (!scrollTop || justSolved)) setTimeout(() => focusRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
    if (justSolved) { const j = justSolved; setTimeout(() => { if (justSolved === j) justSolved = null; }, 1500); }
  }
  const SUSPECT_NO = {
    drew: "Drew is in Vegas looking for Frank. Loudly. In a cowboy hat.",
    rachel: "Rachel wishes. She's the one crying in Latvian.",
    marcus: 'Marcus is at a banking conference. At a hotel. A conference hotel.',
  };

  // soft idle nudge: 4 minutes on one item without a hint → a friendly balloon
  setInterval(() => {
    const cur = FR.puzzle.current();
    if (!cur || cur === 'login' || !FR.state.unlockedAt || !FR.state.unlockedAt[cur]) return;
    FR.state.nudged = FR.state.nudged || {};
    if (FR.state.nudged[cur] || (FR.state.hintsUsed[cur] || 0) > 0) return;
    if (Date.now() - FR.state.unlockedAt[cur] < 240000) return;
    FR.state.nudged[cur] = 1; FR.save();
    const it = ITEMS.find(i => i.id === cur);
    FR.balloon('FinanceOS Assist', `Stuck on <b>${esc(it.t)}</b>? Ask FinanceOS on the checklist. Emily's trial has 1 day left.`, () => openChecklist());
  }, 30000);

  // targeted feedback for common traps
  const WRONG = {
    version: v => { const t = FR.puzzle.norm(v); if (t.includes('finalfinal')) return 'Diane would bounce this one. Check the rent line.'; if (t.includes('v4')) return 'Check the gross margin on that one.'; if (t.includes('v3')) return 'Count the heads.'; if (t.includes('v6')) return "Diane's comments aren't the same as Diane's approval. Check the margin."; if (t.includes('board')) return "That's the locked copy. Which version did Diane approve?"; return "That file isn't the one Diane approved."; },
    ebitda: v => { const n = FR.puzzle.num(v); if (Math.abs(n - 2230) < 1) return "That's EBIT. EBITDA comes before D&A."; if (Math.abs(n - 3530) < 1) return 'Close. You left out Other opex (row 11). Other opex sits above EBITDA too.'; return 'Not quite. Which lines sit above EBITDA?'; },
    dscr: v => { const x = FR.puzzle.num(v); if (Math.abs(x - 1.3) < 0.011) return 'The bank reads Section 6.1 more carefully than that. What about capex?'; if (Math.abs(x - 1.1) < 0.02) return "Only unfunded capex comes off. Some of it went on the equipment loan."; if (Math.abs(x - 1.1636) < 0.01) return 'Backwards: the 300 went on the equipment loan. Take off only what was paid in cash.'; if (Math.abs(x - 1.278) < 0.01) return "Use the certificate's cash interest (450), not the Board copy's budget interest."; if (Math.abs(x - 1.24) < 0.004) return '1.24x is a breach. The bank rounds nothing in your favor.'; return 'Not quite. Read Section 6.1 again.'; },
    cash: v => { const t = FR.puzzle.norm(v).replace(/^(week|wk|w)/, ''); if (t === '7') return "Without payroll the numbers look better than they are. Rachel's number is missing."; if (t === '4') return 'Payroll runs every other Friday, not every week.'; if (t === '6') return 'Week 6 is where cash goes negative. The $250K test breaks earlier. Payroll starts Fri Oct 23, in week 1.'; return 'Not that week. Did you add payroll on the right Fridays?'; },
    bridge: v => { const n = FR.puzzle.num(v), x = Math.abs(n); if (Math.abs(n - 40) < 0.6) return 'Right size, wrong sign: unfavorable variances are negative here.'; if (Math.abs(x - 160) < 1) return "That's the whole budget-to-actual gap. Freight is only part of it."; if (Math.abs(x - 40000) < 1) return 'Right idea, but the bridge is in $ thousands.'; if (Math.abs(x - 50) < 1) return "Splitting the gap evenly is a plug. Calculate the containerboard bar."; if (Math.abs(x - 60) < 1) return "That's the containerboard bar. Now what's left for freight?"; if (Math.abs(x - 100) < 1) return "That's both missing bars together."; return "The bridge still doesn't close with that."; },
    frank: v => /vegas|lasvegas|lv/.test(FR.puzzle.norm(v)) ? "That's where he is. The question is who he's with." : 'Rachel would disagree. Look again at who Frank admires.',
  };

  // one-line reactions in the "done" balloon (short, in character)
  const REACT = {
    version: 'Diane: "Finally."',
    unlock: 'Seed money plus the ISO year. Frank calls that security.',
    ebitda: 'No more #REF!. Frank would be proud. Then embarrassed.',
    dscr: '1.25x. Just. The bank will be thrilled. Relatively.',
    cash: 'Week 5. The number nobody wanted to see.',
    bridge: 'TIES. No plugs. Kristians would approve.',
    forboard: 'Frank had a plan after all.',
    send: 'Sent. Diane is typing…',
  };
  function updateTray() {
    const n = document.querySelector('.fr-pack-n');
    if (n) n.textContent = `${ITEMS.filter(i => FR.puzzle.isSolved(i.id)).length}/${ITEMS.length}`;
  }

  FR.bus.on('solved', id => {
    updateTray();
    const nx = FR.puzzle.current();   // start the idle-nudge clock even if the checklist is closed
    if (nx) { FR.state.unlockedAt = FR.state.unlockedAt || {}; FR.state.unlockedAt[nx] = FR.state.unlockedAt[nx] || Date.now(); FR.save(); }
    justSolved = id;
    const w = FR.wm.wins.get('checklist');
    if (w) renderChecklist(w);
    const it = ITEMS.find(i => i.id === id);
    const n = ITEMS.filter(i => FR.puzzle.isSolved(i.id)).length;
    const nxt = ITEMS.find(i => !FR.puzzle.isSolved(i.id));
    if (it && id !== 'login') setTimeout(() => FR.balloon(`Board Pack: ${n} of ${ITEMS.length} done`, `<b>${esc(it.t)}</b> — done.${REACT[id] ? `<br><i>${esc(REACT[id])}</i>` : ''}${nxt ? `<br>Next up: ${esc(nxt.t)}` : ''}`, () => openChecklist(), { silent: true }), 900);
    if (id === 'frank') {
      FR.state.finishedAt = FR.state.finishedAt || Date.now();
      if (FR.state.finishPlayMs == null) FR.state.finishPlayMs = FR.clock.playMs();
      FR.save();
      // let the player read Frank's reply first: open it, and roll the ending when it's closed (or after 30 s)
      setTimeout(() => {
        if (FR.mail && FR.mail.open) FR.mail.open('x_frank_reveal');
        const w = FR.wm.wins.get('oe-msg-x_frank_reveal');
        if (!w) return setTimeout(ending, 6000);
        const oc = w.opts.onClose;
        w.opts.onClose = () => { const r = oc ? oc() : undefined; if (r !== false && !endShown) setTimeout(ending, 400); return r; };
      }, 3200);
      setTimeout(() => { if (!endShown) ending(); }, 30000);
    }
  });
  FR.bus.on('play-tick', ms => { const t = document.querySelector('.ck-wrap .ck-time'); if (t) { const s = FR.clock.dur(ms); if (t.textContent !== s) t.textContent = s; } });
  FR.bus.on('flag', () => { const w = FR.wm.wins.get('checklist'); if (w) renderChecklist(w); });

  // Esc: closes the Start menu, an open menu / context menu, or the top-most dialog. Never closes an app window,
  // and does nothing while you're typing (Excel / Outlook / dialog inputs handle their own Esc).
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (startMenu) { closeStart(); return; }
    const ctx = document.querySelector('.fr-ctx'); if (ctx) { ctx.remove(); return; }
    if (FR.wm.closeMenus()) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const dlg = FR.wm.topDialog();
    if (dlg) { e.preventDefault(); dlg.close(); }
  });

  /* =========================================================== ENDING */
  let endShown = false;
  function ending() {
    if (document.querySelector('.fr-end')) return;
    endShown = true;
    document.querySelectorAll('.fr-balloon, .fr-start').forEach(b => b.remove());
    const t = FR.clock.dur(FR.state.finishPlayMs != null ? FR.state.finishPlayMs : FR.clock.playMs());
    const hints = Object.values(FR.state.hintsUsed).reduce((a, b) => a + b, 0);
    const sc = FR.score.now();
    const e = $(`<div class="fr-end"><div class="fr-end-card">
      <div class="fr-kicker">Board Pack delivered · Survival package approved</div>
      <h1>Packa Corp is saved.<br>Frank is in Vegas.</h1>
      <p>You rebuilt Packa's numbers from a pile of "FINAL" files, a hidden folder, a change log and one man's head. The Board saw the real runway, the bank got a true covenant certificate, and the emergency plan passed.</p>
      <div class="fr-end-stats"><div class="fr-end-score"><b>${FR.score.fmt(sc.score)}</b><span>Score</span></div><div><b>${t}</b><span>Time at Frank's desk</span></div><div><b>${hints}</b><span>Hints used</span></div><div><b>${FR.state.wrong || 0}</b><span>Wrong guesses</span></div></div>
      <p class="fr-end-rank"></p>
      <div class="fr-end-line"></div>
      <p><b style="color:#fff">Packa doesn't run on Datarails.</b> So when Frank walked through the wall, the truth nearly went with him.</p>
      <p>Datarails FinanceOS connects your ERP, CRM, HRIS and Excel data in one governed layer, so the budget, the cash forecast and the covenant math come from the same numbers — and nobody has to be Frank.</p>
      <p class="fr-end-fos">Hints courtesy of Emily's FinanceOS trial. Day 13 of 14.</p>
      <div class="fr-end-cta"><a class="pri" href="${CONFIG.ctaUrl}" target="_blank" rel="noopener">${esc(CONFIG.ctaLabel)}</a>
        ${CONFIG.seriesUrl ? `<a class="sec" href="${CONFIG.seriesUrl}" target="_blank" rel="noopener">Watch "Frank Is Missing"</a>` : ''}
        ${FR.score.available() ? '<button class="sec" data-a="board">Who covered for Frank?</button>' : ''}
        <button class="sec" data-a="back">Back to Frank's desk</button><button class="sec" data-a="again">Play again</button></div>
    </div></div>`);
    e.querySelector('[data-a=back]').onclick = () => e.remove();
    const sbBtn = e.querySelector('[data-a=board]');
    if (sbBtn) sbBtn.onclick = () => FR.score.open();
    // where this game landed on the board (or how to get on it)
    const rankEl = e.querySelector('.fr-end-rank');
    if (FR.score.available() && !(FR.account && FR.account.user)) rankEl.textContent = "Playing without an account, so this score isn't on the leaderboard.";
    else if (FR.score.available()) FR.score.fetch().then(d => {
      if (d.me) rankEl.innerHTML = `You're <b>#${d.me.rank}</b> of ${FR.score.fmt(d.players)} ${d.players === 1 ? 'person who has' : 'people who have'} covered for Frank${d.me.score !== sc.score ? ` with your first finished game (${FR.score.fmt(d.me.score)} points)` : ''}.`;
    }, () => {});
    e.querySelector('[data-a=again]').onclick = () => confirmStartOver();
    root.appendChild(e);
    FR.sound.play('tada');
  }
  FR.ending = ending;

  /* =========================================================== ART */
  function WALLPAPER() {
    return `<img class="fr-wall-img" src="${FR.data.images.wallpaper}" alt="" draggable="false">`;
  }

  /* =========================================================== START */
  if (DEV) {
    FR.state.solved.login = FR.state.solved.login || Date.now();
    FR.state.startedAt = FR.state.startedAt || Date.now();
    const upto = q.get('solve');
    if (upto) { for (const id of FR.puzzle.ORDER) { FR.state.solved[id] = FR.state.solved[id] || Date.now(); if (id === upto) break; } }
    FR.save();
    desktop(false);
    FR.bus.emit('login');
  } else {
    // signed-in players get their saved game first (or the sign-in screen); without the account server this resolves at once
    (FR.account ? FR.account.start() : Promise.resolve()).then(() => {
      if (FR.puzzle.isSolved('login') && q.has('resume')) desktop(false);
      else intro();
    });
  }
})();
