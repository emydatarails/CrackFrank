/* FRANK'S COMPUTER — "Norton AntiVirus 2003": the nostalgic tray popup ("Virus definitions are up to date") that
   comes up about 3 minutes into play, then every 8–15 minutes of ACTIVE play (FR.clock.playMs), never over a message
   box, the Blue Screen, the screensaver, the ending, a menu, or while the player is typing (it waits its turn). Now and
   then it says something else. It is an ordinary tray balloon (FR.balloon), so on a phone it follows the toast rules
   (a strip above the taskbar that never vanishes under a finger). Clicking it opens a small Norton-style status window.
   A nostalgic parody: a generic yellow shield, no real logo. Schedule in FR.state.flags.norton = { next, n }.  Prefix: .nv-
   Item 7 (the EBITDA bridge): Norton quarantined Frank's containerboard_calc.xls as a "macro virus". Its Quarantine page
   restores it (FR.flags.nortonRestored) into Board Meeting Oct 20; a shield in the tray opens Norton at any time. */
(() => {
  const $ = FR.$, esc = FR.esc;
  const FIRST = 3 * 60000, MIN = 8 * 60000, MAX = 15 * 60000;
  const SHIELD = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 2.5l11.5 4v8.2c0 7.4-4.9 12.3-11.5 14.8C9.4 27 4.5 22.1 4.5 14.7V6.5z" fill="#ffd400" stroke="#7a5c00" stroke-width="1.3"/><path d="M16 5l9 3.2v6.6c0 5.9-3.8 9.9-9 12V5z" fill="#ffe866"/><path d="M9.6 15.8l4.4 4.4 8.6-9.3" fill="none" stroke="#1a1a1a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.6 15.8l4.4 4.4 8.6-9.3" fill="none" stroke="#39b54a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  FR.icons.nvshield = SHIELD;
  const TITLE = 'Norton AntiVirus 2003';
  const PLAIN = 'Virus definitions are up to date.';
  const VARIANTS = [
    "Virus definitions are up to date. Frank's definitions of FINAL are not.",
    'LiveUpdate found 0 viruses and 47 versions of the same model.',
    'Your subscription expires in 3 days. It has said that since 2004.',
    'Scan complete. 0 threats found. 1 cowboy hat found on the keyboard.',
    'Auto-Protect blocked 1 attempt to hard-code a plug. Frank taught it that.',
    "E-mail scanning: 14 messages from Drew in ALL CAPS. Loud, not malicious.",
    'Virus definitions are up to date. Excel is from 2003. Nobody is perfect.',
  ];
  // (read-only until a popup is due: a tick must not change the save, or two computers would race each other)
  const peek = () => { const v = FR.state.flags.norton; return v && typeof v === 'object' ? v : { next: FIRST, n: 0 }; };
  const st = () => { const f = FR.state.flags; if (!f.norton || typeof f.norton !== 'object') f.norton = { next: FIRST, n: 0 }; return f.norton; };
  const busy = () => FR.xp.quiet() || !!document.querySelector('.fr-balloon') || (FR.bsod && FR.bsod.active());

  // the popup itself (text = null picks the next line: plain every other time, a joke in between)
  function pop(text) {
    const s = st();
    const line = text || (s.n % 2 === 1 ? VARIANTS[Math.floor(s.n / 2) % VARIANTS.length] : PLAIN);
    s.n++; FR.save();
    FR.balloon(TITLE, `<div class="nv-tip"><span class="nv-ico">${SHIELD}</span><span>${esc(line)}</span></div>`, () => statusWin(), { cls: 'nv-bal', icon: `<span class="fr-ico nv-ico16">${SHIELD}</span>`, act: 'Open Norton', silent: false });
    return line;
  }
  FR.bus.on('play-tick', ms => {
    if (FR.xp.noPopups || FR.state.finishedAt && document.querySelector('.fr-end')) return;
    if (ms < peek().next || busy()) return;     // not yet, or not now (it waits its turn)
    pop();
    const s = st();
    s.next = ms + MIN + Math.floor(Math.random() * (MAX - MIN)); FR.save();
  });

  /* ---------- the quarantined file (item 7) ---------- */
  const QFILE = 'containerboard_calc.xls', QDATE = '10/06/2026 1:14 AM';
  const restored = () => !!FR.flags.get('nortonRestored');
  if (FR.fs && FR.fs.extra) FR.fs.extra.push(() => restored() ? [{ id: 'cbcalc', parent: 'board', name: QFILE, type: 'file', app: 'excel', icon: 'xls', size: '14 KB', modified: QDATE, author: 'Frank Warmington' }] : []);
  function restore() {
    if (!restored()) { FR.flags.set('nortonRestored', true); FR.bus.emit('fs-change'); FR.sound.play('unlock'); }
    setTimeout(() => FR.openFile('cbcalc'), 350);
  }
  // the shield in the tray: Norton is always one click away (it used to be only the popups)
  FR.bus.on('desktop', el => {
    const tray = el && el.querySelector('.fr-tray'), k = tray && tray.querySelector('.fr-ktray');
    if (!tray || tray.querySelector('.nv-tray')) return;
    const t = $(`<span class="nv-tray" role="button" title="Norton AntiVirus" aria-label="Norton AntiVirus">${SHIELD}</span>`);
    t.onclick = () => statusWin();
    tray.insertBefore(t, k || tray.firstChild.nextSibling);
  });

  /* ---------- the status window ---------- */
  function statusWin(page) {
    if (FR.wm.wins.has('norton')) { const w = FR.wm.wins.get('norton'); w.restore(); w.focus(); if (page && w.nvShow) w.nvShow(page); return w; }
    const el = $(`<div class="nv">
      <div class="nv-side"><div class="nv-brand"><span class="nv-ico32">${SHIELD}</span><b>Norton <br>AntiVirus</b><small>2003 &middot; Professional</small></div>
        <a class="nv-nav on" data-p="status">Status</a><a class="nv-nav" data-p="scan">Scan for Viruses</a><a class="nv-nav" data-p="quarantine">Quarantine<span class="nv-qn"></span></a><a class="nv-nav" data-p="reports">Reports</a><a class="nv-nav nv-dis">Options</a></div>
      <div class="nv-main"></div></div>`);
    const main = el.querySelector('.nv-main');
    const inbox = () => (FR.mail && FR.mail.messages ? FR.mail.messages().length : 31);
    const P = {
      status: () => `<div class="nv-ok"><span class="nv-ico32">${SHIELD}</span><div><b>System Status: OK</b><span>Security features are enabled and up to date.</span></div></div>
        <table class="nv-t"><tr><td>Auto-Protect</td><td class="nv-on">On</td></tr><tr><td>E-mail Scanning</td><td class="nv-on">On</td></tr><tr><td>Script Blocking</td><td class="nv-on">On</td></tr>
        <tr><td>Full System Scan</td><td>Not since 2019</td></tr><tr><td>Virus Definitions</td><td>10/16/2026 (up to date)</td></tr>
        <tr><td>Subscription</td><td class="nv-warn">Expires in 3 days (it has said that since 2004)</td></tr><tr><td>Automatic LiveUpdate</td><td class="nv-on">On</td></tr>
        <tr><td>Quarantine</td><td${restored() ? '>Empty' : ` class="nv-warn"><a class="nv-go" data-p="quarantine">1 item</a> (${QFILE})`}</td></tr></table>
        <div class="nv-btns"><button data-a="inbox">Scan Frank's inbox</button><button data-a="pc">Scan My Computer</button><button data-a="lu">LiveUpdate</button></div><div class="nv-out"></div>`,
      scan: () => `<h3>Scan for Viruses</h3><p>Pick what to scan. Frank's last full scan was in 2019. He was "busy".</p>
        <div class="nv-btns nv-col"><button data-a="inbox">Scan Frank's inbox</button><button data-a="pc">Scan My Computer</button></div><div class="nv-out"></div>`,
      quarantine: () => restored()
        ? `<h3>Quarantine</h3><p>Quarantine is empty.</p><div class="nv-res"><b>${QFILE}</b> was restored to <span class="nv-mono">My Documents\\Board Meeting Oct 20</span>.</div><div class="nv-btns" style="margin-top:8px"><button data-a="open">Open ${QFILE}</button></div><div class="nv-out"></div>`
        : `<h3>Quarantine</h3><p>Norton isolated these files so they can't harm your computer.</p>
        <table class="nv-t nv-q"><tr><th>File</th><th>Threat</th><th>Quarantined</th></tr>
        <tr><td><b>${QFILE}</b><br><small>My Documents\\Board Meeting Oct 20</small></td><td>W97M.Macro.Generic<br><small>(heuristic: "contains a formula")</small></td><td>${QDATE}</td></tr></table>
        <div class="nv-res">Note added by F. Warmington: <i>"IT'S A SPREADSHEET, NORTON. It has ONE formula. Give it back."</i></div>
        <div class="nv-btns" style="margin-top:8px"><button data-a="restore">Restore</button><button data-a="qdel">Delete</button><button data-a="qsub">Submit to Symantec</button></div><div class="nv-out"></div>`,
      reports: () => `<h3>Reports</h3><table class="nv-t"><tr><td>Viruses found (lifetime)</td><td>0</td></tr><tr><td>Macros blocked</td><td>1 (Drew's "MAKE_IT_WORK.xls")</td></tr><tr><td>Files quarantined</td><td>${restored() ? '1 (restored: a false positive)' : `1 (${QFILE}, see Quarantine)`}</td></tr><tr><td>E-mail quarantine</td><td>declined (see Scan Frank's inbox)</td></tr><tr><td>Tracking cookies</td><td>212, all from a fan club</td></tr></table>`,
    };
    const show = k => {
      el.querySelectorAll('.nv-nav').forEach(a => a.classList.toggle('on', a.dataset.p === k));
      main.innerHTML = P[k]();
      main.querySelectorAll('[data-a]').forEach(b => { b.onclick = () => act(b.dataset.a); });
      main.querySelectorAll('.nv-go[data-p]').forEach(a => { a.onclick = () => show(a.dataset.p); });
      el.querySelector('.nv-qn').textContent = restored() ? '' : ' (1)';
    };
    let scanning = null;
    const act = a => {
      const out = main.querySelector('.nv-out'); if (!out) return;
      if (a === 'restore') { restore(); show('quarantine'); return; }
      if (a === 'open') { FR.openFile('cbcalc'); return; }
      if (a === 'qdel') { FR.dialog({ title: TITLE, icon: 'warn', message: `Delete <b>${QFILE}</b>?<br><br>Norton is unable to delete this file: it is marked <b>DO NOT DELETE — it's the containerboard calc. —F</b>` }); return; }
      if (a === 'qsub') { FR.sound.play('ding'); out.innerHTML = '<div class="nv-res">Submitted to Symantec Security Response. Expected reply: 6–8 weeks. The Board meets Tuesday.</div>'; return; }
      if (a === 'lu') { FR.sound.play('ding'); out.innerHTML = '<div class="nv-res"><b>LiveUpdate</b>: Norton AntiVirus is up to date.<br>So is Frank\'s LinkedIn. It says "Director".</div>'; return; }
      if (scanning) return;
      const total = a === 'inbox' ? inbox() : 1212;
      out.innerHTML = `<div class="nv-scan"><div class="nv-sl">Scanning…</div><div class="nv-bar"><i></i></div></div>`;
      const bar = out.querySelector('.nv-bar i'), sl = out.querySelector('.nv-sl');
      let k = 0;
      scanning = setInterval(() => {
        k++; const n = Math.min(total, Math.round(total * k / 12));
        bar.style.width = Math.round(100 * k / 12) + '%';
        sl.textContent = a === 'inbox' ? `Scanning Inbox: message ${n} of ${total}` : `Scanning C:\\ … ${n.toLocaleString('en-US')} files`;
        if (k < 12) return;
        clearInterval(scanning); scanning = null;
        FR.sound.play('ding');
        out.innerHTML = a === 'inbox'
          ? `<div class="nv-res"><b>Scan complete.</b> Messages scanned: ${total}. Threats found: <b>0</b>.<br><br>Suspicious sender: <b>1</b><br><span class="nv-mono">emily.carter@packacorp.com</span> &mdash; "FinanceOS" in the subject line. Again.<br>Action: <b>quarantine declined</b> by user (F. Warmington): <i>"She's right. Don't tell her."</i><br><br>Also flagged: <span class="nv-mono">drew.hollis@packacorp.com</span> &mdash; 100% capital letters. Classified: loud, not malicious.</div>`
          : `<div class="nv-res"><b>Scan complete.</b> Files scanned: 1,212. Threats found: <b>0</b>.<br><br>Found instead: 47 versions of the same model (not a virus; worse), 5 budgets, 3 of them called FINAL, and one file called passwords.txt that contains no passwords and a lot of attitude.</div>`;
      }, 180);
    };
    const w = FR.wm.open({ id: 'norton', title: TITLE, icon: 'nvshield', width: 540, height: 460, className: 'nv-win', content: el, onClose: () => { if (scanning) clearInterval(scanning); scanning = null; } });
    el.querySelectorAll('.nv-nav[data-p]').forEach(a => { a.onclick = () => { if (!scanning) show(a.dataset.p); }; });
    w.nvShow = k => { if (!scanning) show(k); };
    show(page && P[page] ? page : 'status');
    return w;
  }

  FR.norton = { pop, statusWin, restore, state: st, FIRST, MIN, MAX, VARIANTS, PLAIN };
})();
