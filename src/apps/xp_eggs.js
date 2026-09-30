/* FRANK'S COMPUTER — Frank's private Easter eggs. Fifteen harmless, in-canon secrets hidden around his computer
   (none of them gives a puzzle away). Found eggs live in FR.state.eggs ({ id: foundAtMs }); each one shows a small
   "Easter egg found (n/15) · +10 points" note that never takes a tap (pointer-events: none); each egg is worth PER_EGG
   in src/score_rules.js (whose EGGS list must match this one). The list, with where to find each one, is in README.md ("Easter eggs").  Prefix: .eg- */
(() => {
  const $ = FR.$, esc = FR.esc, T = FR.data.texts = FR.data.texts || {};
  const EGGS = [
    ['karaoke', "Frank's karaoke setlist"],
    ['diary', "Frank's diary (he said not to read it)"],
    ['resign', 'The resignation letter, version 9'],
    ['portrait', 'Self-portrait in a borrowed hat'],
    ['run_frank', 'Run… frank'],
    ['run_vegas', 'Run… vegas'],
    ['run_xlookup', 'Run… xlookup'],
    ['xl_kristians', '=KRISTIANS()'],
    ['xl_hidden', 'The cell at the very end'],
    ['tray_k5', 'Five cheat sheets in a row'],
    ['saver', 'The screensaver'],
    ['sol212', 'Deal #212'],
    ['calc0003', 'Member #0003'],
    ['ie_karaoke', 'Tuesday Karaoke at the Tipsy Ledger'],
    ['clock', 'Riga time'],
  ];
  const NAME = Object.fromEntries(EGGS);
  const got = () => (FR.state.eggs && typeof FR.state.eggs === 'object') ? FR.state.eggs : {};
  const count = () => EGGS.filter(([id]) => got()[id]).length;

  /* ---------- the note ("Easter egg found (n/N)") ---------- */
  const EGG_ICO = '<svg class="eg-ico" viewBox="0 0 16 20" aria-hidden="true"><path d="M8 1C4.2 1 1.5 7.4 1.5 11.6 1.5 15.8 4.4 19 8 19s6.5-3.2 6.5-7.4C14.5 7.4 11.8 1 8 1z" fill="#fff4c9" stroke="#b8860b" stroke-width="1.1"/><path d="M2.6 10.5l2.2-1.6 2.2 1.6 2-1.6 2.2 1.6 2.3-1.6" fill="none" stroke="#2f7de0" stroke-width="1.3"/><path d="M2.3 13.4l2.4-1.4 2.2 1.4 2.2-1.4 2.2 1.4 2.3-1.4" fill="none" stroke="#d6260f" stroke-width="1.1"/></svg>';
  let toastT = 0;
  function toast(id, n) {
    document.querySelectorAll('.eg-toast').forEach(t => t.remove());
    const pe = FR.scoreRules ? FR.scoreRules.PER_EGG : 0;
    const t = $(`<div class="eg-toast" role="status">${EGG_ICO}<span><b>Easter egg found (${n}/${EGGS.length})${pe ? ` · +${pe} points` : ''}</b><i></i></span></div>`);
    t.querySelector('i').textContent = n === EGGS.length ? `${NAME[id]}. That's all of them!` : NAME[id];
    document.body.appendChild(t);
    clearTimeout(toastT); toastT = setTimeout(() => { t.classList.add('eg-out'); setTimeout(() => t.remove(), 500); }, n === EGGS.length ? 6000 : 4200);
  }
  function find(id) {
    if (!NAME[id] || got()[id]) return false;
    if (!FR.state.eggs || typeof FR.state.eggs !== 'object') FR.state.eggs = {};
    FR.state.eggs[id] = Date.now();
    const n = count();
    FR.save();
    toast(id, n);
    FR.bus.emit('egg', { id, n, total: EGGS.length });
    if (FR.checklistRender) FR.checklistRender();   // the footer's score and egg count
    return true;
  }
  FR.eggs = { list: EGGS.map(([id, name]) => ({ id, name })), find, count, total: EGGS.length, has: id => !!got()[id] };

  /* ---------- files: diary, karaoke setlist (hidden), resignation letter (Recycle Bin), self-portrait (Paint) ---------- */
  const F = (id, parent, name, extra) => Object.assign({ id, parent, name, type: 'file', app: 'notepad', icon: 'txt', size: '1 KB', author: 'Frank Warmington', wide: true }, extra);
  const PORTRAIT = 'frank_self_portrait_(drews_hat).bmp';
  const portraitSaved = () => FR.state.paint && Array.isArray(FR.state.paint.files) && FR.state.paint.files.some(f => f && f.name && f.name.toLowerCase() === PORTRAIT);
  const FILES = [
    F('egg_diary', 'personal', 'diary_do_not_read.txt', { modified: '10/16/2026 11:48 PM', comments: 'DO NOT READ. (Rachel, this means you.)' }),
    F('egg_karaoke', 'personal', 'karaoke_setlist.txt', { hidden: true, modified: '10/09/2026 1:02 AM', title: 'Tuesdays', comments: 'hidden from Rachel. She requests duets.' }),
    F('egg_resign', 'recycle', 'resignation_letter_v9_NOT_SENT.txt', { modified: '10/16/2026 11:31 PM', origin: 'C:\\Documents and Settings\\Frank Warmington\\Desktop' }),
    F('egg_portrait', 'pics', PORTRAIT, { app: 'paint', icon: 'bmp', size: '507 KB', modified: '10/07/2026 12:58 PM', title: 'ME (in the hat)', comments: "Drew's hat. He left it on my keyboard. Again. So I drew myself in it. He doesn't know.", paintImage: () => portraitImage() }),
  ];
  const EGG_OF = { egg_diary: 'diary', egg_karaoke: 'karaoke', egg_resign: 'resign', egg_portrait: 'portrait' };
  if (FR.fs && FR.fs.extra) FR.fs.extra.push(() => FILES.filter(n => n.id !== 'egg_portrait' || !portraitSaved()));
  // opening one of them finds its egg (FR.openFile dispatches through FR.apps[app] at call time)
  const wrapOpen = app => { const orig = FR.apps[app]; if (!orig) return; FR.apps[app] = Object.assign(function (node, ...rest) { const r = orig.call(this, node, ...rest); const n = node && FR.fs.get(node); if (n && EGG_OF[n.id]) find(EGG_OF[n.id]); return r; }, orig); };
  wrapOpen('notepad'); wrapOpen('paint');

  T.egg_diary = `DIARY — DO NOT READ
(If you are Drew: this is a macro. Close it. If you are Rachel: hi. Also close it.)

09/02  Hung the #212 poster. Measured twice, hung it once. Checked it with a
       spreadsheet: the wall is off by 0.3 degrees. Filed a ticket with
       Facilities. Ticket #212. There are no coincidences.

09/07  Drew asked me to "make the number bigger". Which number. "The good one."
       Formatted it 14pt bold. He said "perfect". I have never felt emptier.

09/11  Dreamt in R1C1 notation again. Woke up at R6C3.

09/15  Merged cells in the Board deck. Unmerged them. Merged them back so Drew
       wouldn't notice the unmerging. Some nights I am the problem.

09/19  Typed 0.0003 into the Calculator. Just to look at it. Nobody understands.
       The Calculator understands.

09/24  HE SAID MY NAME. On the LAMBDA webinar. "Frank from Sedalia, good
       question." Played it back 41 times. Joshua heard it from the break room
       and asked if I was OK. I have never been more OK.

09/30  Month end. Found a hardcoded 7 inside a formula nobody has touched since
       2019. Left it. Named it. It's Gerald now. Gerald stays.

10/03  Dealt Solitaire until the deal counter felt meaningful. 212 is
       meaningful. Something happened at 212. I won't say what.

10/06  Tuesday karaoke at the Tipsy Ledger. "Total Eclipse of the Chart".
       97 points. Karen says the machine is broken. The machine is honest.
       Put the bar in my IE Favorites so I stop asking Joshua for the address.

10/09  Moved the setlist where Rachel can't find it. Hidden. Obviously.

10/13  Pressed Ctrl+End in my speedrun log. There is something at the end.
       I put it there. I still jumped.

10/16  If you are reading this, you found this too. You're thorough.
       That's either very good or very bad news for Drew.
                                                                       —F`;

  T.egg_karaoke = `KARAOKE SETLIST — Tuesday nights, The Tipsy Ledger, Sedalia
(hidden from Rachel. She requests duets.)

 #  Song                                           Key  Notes
 1  Total Eclipse of the Chart                     Bb   the closer. 97 pts
 2  Livin' on a Pivot                              E    "WOAH-OH, we're halfway there (Q2)"
 3  Don't Stop Believin' (in the Forecast)         E    Drew's request. He believes every forecast
 4  Sum-thing Stupid                               C    solo. Rachel keeps volunteering
 5  I Will Survive (the Audit)                     Am
 6  Hit Me With Your Best Plot                     E    scatter, obviously
 7  Every Breath You Take (I'll Be Auditing You)   Ab   Karen's anthem
 8  Don't You (Forget About Me) — VLOOKUP remix    D    for column 7, wherever it went
 9  Hello (Is It Me You're Looking For)            A    only if Diane's in the room. Never
10  Take On Me                                     A    NEVER AGAIN. The high note is circular

Banned by management: "Ice Ice Baby" (I rapped the INDEX/MATCH syntax. Twice.)
Do NOT hand Drew the mic. He does "Achy Breaky Heart". In the hat.`;

  T.egg_resign = `Dear Drew,

Please accept this letter as notice of my resignation from Packa Corporation,
effective immediately, because

    [v9. v1-v8 said "because of the budget". v5 was called FINAL.
     v6 was in all caps, to make you feel at home.]

...on second thought, who would fix the model.

Dear Drew,
Please make the number bigger yourself.

Dear Drew,
I'm taking Thursday off.

—Frank

(Not sent. Never sent. Kept in the Recycle Bin, where I keep my feelings.)`;

  /* ---------- Frank's self-portrait in Drew's hat (drawn at 2 AM with a mouse; snapped to Paint's colours) ---------- */
  function portraitImage() {
    const W = 480, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    let seed = 20261007; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const J = a => (rnd() - 0.5) * 2 * a;
    const path = (pts, close) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + J(1.2), y + J(1.2)) : g.moveTo(x, y))); if (close) g.closePath(); };
    const ell = (cx, cy, rx, ry, n = 40) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * Math.PI * 2) * rx, cy + Math.sin(i / n * Math.PI * 2) * ry]);
    const fillP = (pts, col, line = '#000000', w = 3) => { path(pts, true); g.fillStyle = col; g.fill(); g.lineWidth = w; g.strokeStyle = line; g.stroke(); };
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    // a sky and a lot of desert (he has been looking at Vegas pictures. No comment.)
    g.fillStyle = '#80ffff'; g.fillRect(0, 0, W, 250); g.fillStyle = '#ffff80'; g.fillRect(0, 250, W, 110);
    fillP([[0, 250], [70, 200], [120, 238], [175, 205], [230, 250]], '#ff8040', '#804000', 2);
    fillP([[300, 250], [360, 214], [410, 236], [480, 206], [480, 250]], '#ff8040', '#804000', 2);
    fillP(ell(420, 48, 26, 26), '#ffff00', '#ff8040', 2);
    // body: blue shirt, red tie, a pocket with an Excel X
    fillP([[160, 360], [168, 280], [205, 258], [275, 258], [312, 280], [320, 360]], '#0080ff');
    fillP([[232, 262], [248, 262], [244, 282], [254, 336], [240, 350], [226, 336], [236, 282]], '#ff0000');
    fillP([[270, 292], [300, 292], [300, 318], [270, 318]], '#ffffff', '#000000', 2);
    g.strokeStyle = '#008000'; g.lineWidth = 4; path([[276, 297], [294, 313]]); g.stroke(); path([[294, 297], [276, 313]]); g.stroke();
    // head: Frank green. Ears. Glasses. The smile of a man whose model ties.
    fillP(ell(240, 196, 66, 72), '#00ff00', '#008000', 3);
    fillP(ell(174, 200, 10, 16, 16), '#00ff00', '#008000', 3); fillP(ell(306, 200, 10, 16, 16), '#00ff00', '#008000', 3);
    g.lineWidth = 3; g.strokeStyle = '#000000';
    path(ell(215, 190, 18, 14, 22), true); g.stroke(); path(ell(265, 190, 18, 14, 22), true); g.stroke();
    path([[233, 190], [247, 190]]); g.stroke();
    fillP(ell(215, 191, 5, 5, 10), '#000000'); fillP(ell(265, 191, 5, 5, 10), '#000000');
    path([[208, 230], [222, 242], [240, 246], [258, 242], [272, 230]]); g.stroke();
    // THE HAT (Drew's). Brim, crown, band, a dent Drew calls "character".
    fillP([[118, 146], [150, 132], [200, 126], [280, 126], [330, 132], [362, 146], [330, 154], [240, 150], [150, 154]], '#804000');
    fillP([[172, 138], [180, 88], [204, 70], [240, 82], [276, 70], [300, 88], [308, 138]], '#804000');
    fillP([[176, 124], [304, 124], [306, 138], [174, 138]], '#000000', '#000000', 1);
    g.strokeStyle = '#ffff00'; g.lineWidth = 2; path([[200, 131], [212, 131]]); g.stroke(); path([[268, 131], [280, 131]]); g.stroke();
    // labels, in Paint's Arial, crooked
    g.fillStyle = '#000000'; g.font = 'bold 22px Arial, sans-serif';
    g.save(); g.translate(22, 38); g.rotate(-0.06); g.fillText('ME', 0, 0); g.restore();
    g.font = '14px Arial, sans-serif'; g.fillText("(in Drew's hat. borrowed. he doesn't know)", 22, 60);
    g.lineWidth = 3; g.strokeStyle = '#000000'; path([[60, 70], [150, 114]]); g.stroke(); path([[150, 114], [133, 113]]); g.stroke(); path([[150, 114], [140, 100]]); g.stroke();
    g.font = 'italic 13px "Times New Roman", serif'; g.fillText('self portrait, 2 AM. F.W.', 330, 344);
    g.fillStyle = '#ff0000'; g.font = 'bold 15px Arial, sans-serif'; g.save(); g.translate(318, 96); g.rotate(0.1); g.fillText('YEEHAW = XLOOKUP', 0, 0); g.restore();
    // snap every pixel to Paint's 28 colours, no anti-aliasing: it has to look like 2 AM in mspaint
    const PAL = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#804000', '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#80ffff', '#0080ff', '#ff8040']
      .map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      let best = 0, bd = 1e9;
      for (let k = 0; k < PAL.length; k++) { const p = PAL[k], dr = d[i] - p[0], dg = d[i + 1] - p[1], db = d[i + 2] - p[2], dd = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (dd < bd) { bd = dd; best = k; } }
      d[i] = PAL[best][0]; d[i + 1] = PAL[best][1]; d[i + 2] = PAL[best][2]; d[i + 3] = 255;
    }
    return img;
  }
  FR.bus.on('paint-open', name => { if (String(name).toLowerCase() === PORTRAIT) find('portrait'); });

  /* ---------- Run… commands ---------- */
  const say = (title, msg, icon = 'info') => FR.dialog({ icon, title, message: msg });
  FR.runCommands = Object.assign(FR.runCommands || {}, {
    frank: () => { find('run_frank'); say('frank', "Windows cannot find 'frank'.<br><br>Neither can Diane, Drew, Joshua, Rachel or the Board. Frank's out-of-office reply is also missing.", 'error'); },
    vegas: () => { find('run_vegas'); say('vegas', 'What happens in Vegas is reconciled in Sedalia.<br><br>Usually by Frank. Tonight: by you.'); },
    xlookup: () => { find('run_xlookup'); say('xlookup', 'XLOOKUP is not installed. This is Excel 2003.<br><br>Frank has asked IT for it every Monday since 2019. IT is in Vegas. (INDEX/MATCH still works. It always worked. —F)', 'error'); },
    vlookup: () => say('vlookup', 'VLOOKUP returned the wrong column. Somebody inserted one.<br><br>(Frank\'s support group meets Tuesdays. The small conference room.)', 'warn'),
    pivot: () => say('pivot', '"PIVOT! PIVOT! PIVOT!"<br><br>— Drew, moving a sofa. And the Q4 forecast.'),
    datarails: () => say('datarails', "Windows cannot find 'datarails'.<br><br>Packa doesn't have it. Emily has a trial. It's day 13 of 14. She would like you to know that.", 'error'),
    financeos: () => say('financeos', 'FinanceOS is a trial on this computer (Emily\'s, day 13 of 14). It lives on the checklist: the <b>Ask FinanceOS</b> button.'),
    drew: () => say('drew', 'DREW.EXE is not responding.<br><br>It never was. It just talks louder.', 'warn'),
    winver: () => say('About Windows', '<b>Microsoft Windows XP</b><br>Version 2002, Service Pack 3<br><br>Licensed to: Frank Warmington, Packa Corporation<br>Physical memory available to Windows: most of it is the model.'),
  });

  /* ---------- Excel: =KRISTIANS() and the cell at the very end ---------- */
  FR.bus.on('xl-kristians', () => setTimeout(() => find('xl_kristians'), 0));
  FR.bus.on('xl-select', s => { if (s && s.book === 'speedrun_practice.xls' && s.sheet === 'Practice log' && s.r === 35 && s.c === 9) find('xl_hidden'); });

  /* ---------- the tray: Kristians five times in a row; the clock ---------- */
  let kClicks = [];
  document.addEventListener('click', e => {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('.fr-ktray')) {
      const now = Date.now(); kClicks = kClicks.filter(t => now - t < 6000); kClicks.push(now);
      if (kClicks.length >= 5) {
        kClicks = [];
        setTimeout(() => {
          FR.balloon("Kristians' Cheat Sheet of the Day", `<div class="fr-ktip"><img src="${FR.data.images.kristians}" alt=""><span>Five tips in a row? Frank, is that you? Go to bed. The spreadsheet will still be there. It is always there. —K</span></div>`, null);
          find('tray_k5');
        }, 80);
      }
    }
    // phones have no double-click: two taps on the clock within half a second do the same
    if (FR.mobile && e.target.closest('.fr-clock')) { const now = Date.now(); if (now - (clockTap || 0) < 550) { clockTap = 0; clockDlg(); } else clockTap = now; }
  }, true);
  let clockTap = 0;
  // a phone too narrow for the tray icon (src/mobile.css hides it under 380 px): the fifth tip that comes by itself counts
  const KT = "Kristians' Cheat Sheet of the Day", origBalloon = FR.balloon;
  let kSeen = 0;
  FR.balloon = function (title, text, onClick, opts) {
    if (title === KT && FR.mobile && !(opts && opts.tries)) { const tray = document.querySelector('.fr-ktray'); if (tray && !tray.offsetParent && ++kSeen >= 5) setTimeout(() => find('tray_k5'), 0); }
    return origBalloon.apply(this, arguments);
  };
  document.addEventListener('dblclick', e => { if (!FR.mobile && e.target && e.target.closest && e.target.closest('.fr-clock')) clockDlg(); }, true);
  function clockDlg() {
    if (FR.wm.topDialog()) return;
    find('clock');
    FR.dialog({ icon: 'error', title: 'Date and Time Properties', message: 'Access is denied.<br><br>Frank set this clock to Riga time once, "to be closer to the content". Diane noticed on payday.' });
  }

  /* ---------- the screensaver, Solitaire's 212th deal, the Calculator's 0.0003 ---------- */
  FR.bus.on('screensaver', () => find('saver'));
  FR.bus.on('sol-deal', () => {
    const f = FR.state.flags; f.solDeals = (+f.solDeals || 0) + 1;
    if (f.solDeals % 20 === 0 || f.solDeals === 212) FR.save();
    if (f.solDeals === 212 && !got().sol212) {
      find('sol212');
      FR.balloon('Solitaire', "Deal #212. Like the cheat sheet. Frank's record is 213 deals in one night: he was \"waiting for a file to open\".", null);
    }
  });
  let calcShown = 0;
  FR.bus.on('calc-display', v => {
    if (String(v).replace(/,/g, '') !== '0.0003' || Date.now() - calcShown < 4000) return;
    calcShown = Date.now();
    FR.balloon('Member #0003', `<div class="fr-ktip"><img src="${FR.data.images.kristians}" alt=""><span>0.0003: Frank's member number in Kristians' Cheat Sheet Club. #0001 is Kristians. #0002 is his mom.</span></div>`, null);
    find('calc0003');
  });

  /* ---------- Internet Explorer: a favourite that exists ---------- */
  const BAR = 'http://www.tipsyledger.example/karaoke';
  FR.ieFavs = (FR.ieFavs || []).concat([["Frank's", [['Tuesday Karaoke — The Tipsy Ledger', BAR]]]]);
  FR.iePages = Object.assign(FR.iePages || {}, {
    'tipsyledger.example': {
      title: 'The Tipsy Ledger — Tuesday is Karaoke Night',
      onShow: () => find('ie_karaoke'),
      html: () => `<div class="eg-bar">
        <div class="eg-bar-top"><marquee scrollamount="3">*** TUESDAY IS KARAOKE NIGHT *** 8 PM TO CLOSE *** WINGS 10 FOR $8 *** NO CHARTS ON THE BIG SCREEN, FRANK ***</marquee></div>
        <h1>The Tipsy Ledger</h1><div class="eg-bar-sub">Bar &amp; Grill &middot; East 2nd Street, Sedalia, MO &middot; "Where the drinks are balanced and the tabs are not"</div>
        <h2>Karaoke Hall of Fame</h2>
        <table class="eg-bar-t"><tr><th>#</th><th>Singer</th><th>Song</th><th>Score</th></tr>
          <tr><td>1</td><td><b>frank_w</b></td><td>Total Eclipse of the Chart</td><td>97</td></tr>
          <tr><td>2</td><td>Karen W.</td><td>Every Breath You Take</td><td>91 <small>("the machine is broken")</small></td></tr>
          <tr><td>3</td><td>Earl (Rotary)</td><td>My Way</td><td>88 <small>(every Tuesday since 2011)</small></td></tr>
          <tr><td>4</td><td>Drew H.</td><td>Achy Breaky Heart</td><td>12 <small>(in the hat. banned from the stage)</small></td></tr></table>
        <h2>This week</h2>
        <ul><li><b>The Balance Sheet Burger</b>: it balances. Barely.</li><li><b>Wings</b>: 10 for $8, or $0.80 each. <i>"Frank asked. It's linear, Frank."</i></li>
          <li>Banned song: "Ice Ice Baby" (see: frank_w, INDEX/MATCH verse, August)</li></ul>
        <div class="eg-bar-foot">You are visitor number 000212. Best viewed after two drinks at 800x600.</div></div>`,
    },
  });

  /* ---------- test hook (file:// and localhost only) ---------- */
  if (FR.xp && FR.xp.LOCAL) FR.eggs._test = { reset: () => { FR.state.eggs = {}; FR.save(); }, portraitImage };
})();
