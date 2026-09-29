/* FRANK'S COMPUTER — core: state, bus, window manager, dialogs, sound, clock, puzzle engine */
window.FR = window.FR || {};
FR.data = FR.data || { texts: {} };
FR.apps = FR.apps || {};
(() => {
  const DEV_MODE = (() => { try { return new URLSearchParams(location.search).has('dev'); } catch (e) { return false; } })();
  const SAVE_KEY = DEV_MODE ? 'frank-riddles-save-v1-dev' : 'frank-riddles-save-v1';
  const $ = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  FR.$ = $;
  FR.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- mobile (phones, small tablets) ----------
     One media query decides it, the same one src/mobile.css uses. Desktop (fine pointer, >= 1100px wide) never
     matches, so nothing below changes it. FR.mobile follows rotation / resizing; <html> gets .fr-m while it is on. */
  FR.MOBILE_MQ = '(max-width: 760px), (pointer: coarse) and (max-width: 1100px)';
  const mobileMq = window.matchMedia ? window.matchMedia(FR.MOBILE_MQ) : null;
  const setMobile = () => { FR.mobile = !!(mobileMq && mobileMq.matches); document.documentElement.classList.toggle('fr-m', FR.mobile); };
  setMobile();
  // phones: no automatic zoom-in when a small text field gets focus (iOS still lets people pinch-zoom)
  if (FR.mobile) { const vp = document.querySelector('meta[name=viewport]'); if (vp && !/maximum-scale/.test(vp.content)) vp.content += ', maximum-scale=1'; }
  if (mobileMq) {
    const onMq = () => {
      const was = FR.mobile; setMobile();
      // turned into a phone layout (e.g. a narrow window): every app window fills the screen
      if (FR.mobile && !was && FR.wm) FR.wm.wins.forEach(w => { if (!w.max && !w.el.classList.contains('fr-dialog')) w.maximize(true); });
    };
    if (mobileMq.addEventListener) mobileMq.addEventListener('change', onMq); else if (mobileMq.addListener) mobileMq.addListener(onMq);
  }

  /* ---------- bus ---------- */
  const handlers = {};
  FR.bus = {
    on(e, fn) { (handlers[e] = handlers[e] || []).push(fn); },
    off(e, fn) { handlers[e] = (handlers[e] || []).filter(f => f !== fn); },
    emit(e, d) { (handlers[e] || []).slice().forEach(fn => { try { fn(d); } catch (err) { console.error(err); } }); },
  };

  /* ---------- state ---------- */
  const fresh = () => ({ solved: {}, flags: {}, hintsUsed: {}, readMail: {}, answers: {}, startedAt: null, finishedAt: null, playMs: 0, wrong: 0 });
  const OBJ_KEYS = ['solved', 'flags', 'hintsUsed', 'readMail', 'answers', 'unlockedAt', 'nudged'];
  // merge a saved state over a fresh one; anything malformed (null, wrong type) falls back to the default
  const harden = st => {
    OBJ_KEYS.forEach(k => { if (st[k] !== undefined && (!st[k] || typeof st[k] !== 'object' || Array.isArray(st[k]))) st[k] = {}; });
    ['playMs', 'wrong'].forEach(k => { if (typeof st[k] !== 'number' || !isFinite(st[k]) || st[k] < 0) st[k] = 0; });
    Object.keys(st.hintsUsed).forEach(k => { const n = +st.hintsUsed[k]; st.hintsUsed[k] = isFinite(n) ? Math.max(0, Math.min(3, n)) : 0; });
    // Paint's saved pictures (src/apps/paint.js): keep only well-formed ones
    if (st.paint !== undefined) {
      const okPic = f => f && typeof f === 'object' && typeof f.id === 'string' && typeof f.name === 'string' && f.name.length <= 80 && typeof f.png === 'string'
        && f.png.startsWith('data:image/png;base64,') && f.w >= 1 && f.w <= 800 && f.h >= 1 && f.h <= 800;
      st.paint = { files: (st.paint && Array.isArray(st.paint.files) ? st.paint.files.filter(okPic) : []).slice(0, 8) };
    }
    return st;
  };
  FR.state = fresh();
  // can this browser save at all? (private mode / blocked storage)
  FR.storageOk = (() => { try { const k = SAVE_KEY + '-t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } })();
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && typeof s === 'object' && s.solved && typeof s.solved === 'object') FR.state = harden(Object.assign(fresh(), s)); } catch (e) {}
  FR.save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(FR.state)); } catch (e) { FR.storageOk = false; } };
  FR.resetSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} FR.state = fresh(); };
  // a saved state from anywhere else (the player-account server), validated like the local one
  FR.loadState = s => (s && typeof s === 'object' && s.solved && typeof s.solved === 'object') ? harden(Object.assign(fresh(), s)) : null;
  FR.flags = {
    get: k => FR.state.flags[k],
    set(k, v) { FR.state.flags[k] = v; FR.save(); FR.bus.emit('flag', { k, v }); },
  };

  /* ---------- sound (synthesised, original) ---------- */
  let ac = null;
  const tone = (freq, t0, dur, type = 'sine', vol = 0.12) => {
    const o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.value = freq; o.connect(gn); gn.connect(ac.destination);
    const s = ac.currentTime + t0; gn.gain.setValueAtTime(0, s); gn.gain.linearRampToValueAtTime(vol, s + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, s + dur); o.start(s); o.stop(s + dur + 0.05);
  };
  const SEQ = {
    ding: [[880, 0, 0.35], [1320, 0.02, 0.3, 'sine', 0.05]],
    error: [[330, 0, 0.18, 'square', 0.06], [247, 0.12, 0.3, 'square', 0.06]],
    chord: [[523, 0, 0.5], [659, 0, 0.5], [784, 0, 0.5]],
    mail: [[988, 0, 0.12], [1319, 0.12, 0.25]],
    click: [[1800, 0, 0.03, 'square', 0.03]],
    unlock: [[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.35]],
    tada: [[523, 0, 0.2], [659, 0.15, 0.2], [784, 0.3, 0.2], [1047, 0.45, 0.8], [784, 0.45, 0.8, 'triangle', 0.06]],
    startup: [[392, 0, 0.6, 'triangle', 0.08], [523, 0.25, 0.7, 'triangle', 0.08], [659, 0.5, 0.8, 'triangle', 0.08], [784, 0.75, 1.3, 'triangle', 0.08], [1047, 1.0, 1.4, 'sine', 0.05]],
  };
  FR.sound = {
    muted: !!FR.state.flags.muted,
    play(n) {
      if (this.muted) return;
      try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); (SEQ[n] || SEQ.ding).forEach(a => tone(a[0], a[1], a[2], a[3], a[4])); } catch (e) {}
    },
  };

  /* ---------- clock ---------- */
  const GAME_START = new Date(2026, 9, 19, 23, 47, 0).getTime();
  // the game clock runs on ACTIVE play time (persisted): only while the tab is visible, the desktop is up and no screensaver
  let playTicks = 0;
  setInterval(() => {
    if (FR.state.finishedAt || document.visibilityState !== 'visible' || !document.querySelector('.fr-desktop') || document.querySelector('.fr-saver')) return;
    FR.state.playMs = (FR.state.playMs || 0) + 1000;
    if (++playTicks % 5 === 0) FR.save();
    FR.bus.emit('play-tick', FR.state.playMs);
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') FR.save(); });
  window.addEventListener('pagehide', () => FR.save());
  FR.clock = {
    now: () => new Date(GAME_START + (FR.state.playMs || 0)),
    playMs: () => FR.state.playMs || 0,
    dur(ms) { const mins = Math.max(1, Math.round((ms || 0) / 60000)); return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`; },
    fmt(d, kind = 'time') {
      const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0'), ap = h >= 12 ? 'PM' : 'AM', hh = (h % 12) || 12;
      if (kind === 'time') return `${hh}:${m} ${ap}`;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (kind === 'long') return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${hh}:${m} ${ap}`;
    },
  };

  /* ---------- puzzle engine ---------- */
  const ORDER = ['login', 'version', 'unlock', 'ebitda', 'dscr', 'cash', 'bridge', 'forboard', 'send', 'frank'];
  const norm = s => String(s || '').toLowerCase().replace(/[\s$,_.\-'"]/g, '');
  const num = s => {
    let t = String(s || '').toLowerCase().replace(/[\u2212\u2012\u2013\u2014\u2015]/g, '-').replace(/\s+/g, '');
    t = t.replace(/(:1|to1)$/, '').replace(/x$/, '');
    let pct = false;
    if (/%$/.test(t)) { pct = true; t = t.slice(0, -1); }
    if (/^[^,]*\d,\d{1,2}$/.test(t)) t = t.replace(',', '.');   // European decimal: 1,25
    t = t.replace(/[$,k]/g, '');
    let neg = false;
    if (/^-?\(.*\)$/.test(t)) { neg = true; t = t.replace(/^-/, '').slice(1, -1); }
    const v = parseFloat(t); if (isNaN(v)) return NaN;
    const r = neg ? -Math.abs(v) : v; return pct ? r / 100 : r;
  };
  FR.puzzle = {
    ORDER,
    norm, num,
    isSolved: id => !!FR.state.solved[id],
    current: () => ORDER.find(id => !FR.state.solved[id]) || null,
    isUnlocked(id) { const i = ORDER.indexOf(id); return i >= 0 && ORDER.slice(0, i).every(p => FR.state.solved[p]); },
    solve(id) {
      if (FR.state.solved[id]) return true;
      if (!this.isUnlocked(id)) return false;
      FR.state.solved[id] = Date.now(); FR.save();
      FR.sound.play(id === 'frank' ? 'tada' : 'unlock');
      FR.bus.emit('solved', id);
      return true;
    },
    // a wrong guess anywhere (checklist, password boxes) counts toward the final score
    miss() { FR.state.wrong = (FR.state.wrong || 0) + 1; FR.save(); },
    // answer checkers for checklist input items
    check: {
      version: v => norm(v).includes('v5finaluse'),
      ebitda: v => Math.abs(num(v) - 3130) < 0.6,
      dscr: v => { const x = num(v); return x >= 1.245 - 1e-9 && x <= 1.255 + 1e-9; },
      cash: v => { const t = norm(v).replace(/^(week|wk|w)/, ''); return t === '5'; },
      bridge: v => Math.abs(num(v) + 40) < 0.6,       // unfavorable = negative: (40), -40, −40
      frank: v => { const t = norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return /kristian|busar|bushar|bousar/.test(t); },
      forboard: v => norm(v) === '18243',
      login: v => ['lowersedalia1958', 'sedalia1958', 'sedaliamo1958', 'sedaliamissouri1958', '1958sedalia', 'missouri1958', 'easts3rdstreet1958', 'east3rdstreet1958', 'east3rd1958', 'ohio1958', 'ohioavenue1958', 'ohioave1958', 'ohioav1958'].includes(String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')),
    },
  };

  /* ---------- window manager ---------- */
  let z = 100, wid = 0, dn = 0;
  const wins = new Map();
  const menuClosers = new Set();
  const topWin = (except) => [...wins.values()].filter(v => !v.min && v !== except && !v.el.classList.contains('fr-dialog')).sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0))[0];
  let layer, taskbarList;
  /* phones: the taskbar's window buttons become one "switcher" button (active window's full title + how many are
     open); tapping it lists every open window by its full name, to switch to or close. */
  let swT = 0, swEl = null;
  function swSoon() { if (FR.mobile && !swT) swT = setTimeout(() => { swT = 0; swUpdate(); }, 0); }
  const appWins = () => [...wins.values()].filter(v => v.tb && v.tb.isConnected).sort((a, b) => (b._used || 0) - (a._used || 0) || (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0));
  const winTitle = v => v.el.querySelector('.fr-title').textContent;
  function swUpdate() {
    if (!FR.mobile || !taskbarList || !taskbarList.isConnected) return;
    let b = taskbarList.parentElement.querySelector('.fr-switch');
    if (!b) {
      b = $(`<button class="fr-switch" aria-label="Open windows"><span class="fr-sw-i"></span><span class="fr-sw-t"></span><span class="fr-sw-n"></span></button>`);
      taskbarList.before(b);
      b.onclick = e => { e.stopPropagation(); FR.sound.play('click'); swList(!swEl); };
    }
    const ws = appWins(), a = FR.wm.active && ws.includes(FR.wm.active) ? FR.wm.active : null;
    b.querySelector('.fr-sw-i').innerHTML = a ? a.tb.querySelector('.fr-ico').outerHTML : FR.icon('views', 18);
    b.querySelector('.fr-sw-t').textContent = a ? splitTitle(winTitle(a))[0] : 'Windows';
    b.querySelector('.fr-sw-n').textContent = ws.length;
    b.classList.toggle('on', !!swEl);
    if (swEl) swMark();   // the open list keeps its rows where they are (it is re-sorted the next time it opens)
  }
  // "Microsoft Excel - Budget.xls" → ['Budget.xls', 'Microsoft Excel']; "Inbox - Outlook Express" → ['Inbox', 'Outlook Express']
  const splitTitle = t => {
    let m = /^(Microsoft Excel) - (.+)$/.exec(t); if (m) return [m[2], m[1]];
    m = /^(.+) - (Internet Explorer|Outlook Express|Notepad|Windows Picture and Fax Viewer|Document Viewer)$/.exec(t); if (m) return [m[1], m[2]];
    return [t, ''];
  };
  // the open list after a window was closed or switched: the row stays (greyed, "closed"), nothing moves under the finger
  function swMark() {
    if (!swEl) return;
    const open = appWins();
    swEl.querySelectorAll('.fr-swl-r[data-wid]').forEach(r => {
      const v = open.find(x => x.id === r.dataset.wid);
      if (!v && !r.classList.contains('gone')) { r.classList.add('gone'); r.classList.remove('on'); r.onclick = null; const sm = r.querySelector('small'); if (sm) sm.textContent = 'closed'; const x = r.querySelector('.fr-swl-x'); if (x) { x.onclick = null; x.style.visibility = 'hidden'; } const c = r.querySelector('.fr-swl-cur'); if (c) c.remove(); }
    });
    const h = swEl.querySelector('.fr-swl-h'); if (h) h.textContent = `Open windows (${open.length})`;
  }
  function swList(show) {
    if (swEl) { swEl.remove(); swEl = null; }
    const host = taskbarList && taskbarList.closest('.fr-desktop');
    if (!show || !host) { const b = document.querySelector('.fr-switch'); if (b) b.classList.remove('on'); return; }
    // most recently used first; the Board Pack checklist is always pinned at the top (open or not)
    const all = appWins(), ck = all.find(v => v.id === 'checklist'), ws = all.filter(v => v !== ck);
    const L = $(`<div class="fr-swlist"><div class="fr-swl-h">Open windows (${all.length})</div><div class="fr-swl-b"></div></div>`);
    const body = L.querySelector('.fr-swl-b');
    const row = (v, pin) => {
      const cur = v === FR.wm.active && !v.min;
      const [t, app] = splitTitle(winTitle(v));
      const r = $(`<div class="fr-swl-r${cur ? ' on' : ''}${v.min ? ' min' : ''}${pin ? ' pin' : ''}" data-wid="${FR.esc(v.id)}">${v.tb.querySelector('.fr-ico').outerHTML}<span class="fr-swl-t"><b></b><small></small></span>${cur ? '<span class="fr-swl-cur">current</span>' : ''}<button class="fr-swl-x" aria-label="Close">&#x2715;</button></div>`);
      r.querySelector('b').textContent = t;
      r.querySelector('small').textContent = [app, v.min ? 'minimized' : ''].filter(Boolean).join(' · ');
      r.onclick = e => { e.stopPropagation(); swList(false); if (v.min) v.restore(); v.focus(); };
      r.querySelector('.fr-swl-x').onclick = e => { e.stopPropagation(); FR.sound.play('click'); v.close(); setTimeout(swMark, 0); };
      return r;
    };
    if (ck) body.appendChild(row(ck, true));
    else if (FR.apps.checklist) {
      const r = $(`<div class="fr-swl-r pin min">${FR.icon('checklist', 18)}<span class="fr-swl-t"><b>Board Pack — TO DO</b><small>not open · tap to open</small></span></div>`);
      r.onclick = e => { e.stopPropagation(); swList(false); FR.apps.checklist(); };
      body.appendChild(r);
    }
    ws.forEach(v => body.appendChild(row(v)));
    if (!ws.length) body.appendChild($('<div class="fr-swl-empty">Nothing else is open. Open something from the desktop or the Start menu.</div>'));
    if (all.some(v => !v.min)) {
      const d = $(`<div class="fr-swl-r fr-swl-desk">${FR.icon('computer', 18)}<span class="fr-swl-t"><b>Show the desktop</b></span></div>`);
      d.onclick = e => { e.stopPropagation(); swList(false); appWins().forEach(v => v.minimize()); };
      body.appendChild(d);
    }
    L._frShown = Date.now(); L._frGuard = 300;
    host.appendChild(L); swEl = L;
    // anchored at its top edge from now on: closing a window never slides the rows below the finger
    L.style.top = L.offsetTop + 'px'; L.style.bottom = 'auto';
    const b = document.querySelector('.fr-switch'); if (b) b.classList.add('on');
    setTimeout(() => document.addEventListener('mousedown', function h(e) { if (!swEl || swEl !== L) return document.removeEventListener('mousedown', h, true); if (!L.contains(e.target) && !e.target.closest('.fr-switch')) { swList(false); document.removeEventListener('mousedown', h, true); } }, true), 0);
  }
  FR.wm_switcher = swList;
  FR.wm = {
    wins,
    init(layerEl, taskbarEl) {
      // a fresh desktop (e.g. after Log Off) starts with no windows
      wins.forEach(w => { w.el.remove(); w.tb.remove(); }); wins.clear(); FR.wm.active = null;
      layer = layerEl; taskbarList = taskbarEl;
      swList(false); swSoon();
    },
    layer() {
      if (layer && layer.isConnected && !document.querySelector('.fr-end')) return layer;   // over the end card, dialogs float above it
      // before the desktop exists (intro / login), dialogs go to a floating layer
      let fl = document.querySelector('.fr-float-layer');
      if (!fl) { fl = $('<div class="fr-float-layer"></div>'); (document.getElementById('fr-root') || document.body).appendChild(fl); }
      return fl;
    },
    open(o) {
      if (o.id && wins.has(o.id)) { const w = wins.get(o.id); w.restore(); w.focus(); return w; }
      const id = o.id || 'w' + (++wid);
      if (FR.mobile && swEl) swList(false);   // phones: a window that opens (by itself or from a chip) is never under the window list
      const W = Math.min(o.width || 640, window.innerWidth - 20), H = Math.min(o.height || 460, window.innerHeight - 50);
      const n = wins.size;
      const x = o.x ?? Math.max(10, Math.round((window.innerWidth - W) / 2 - 120 + (n % 6) * 28));
      const y = o.y ?? Math.max(8, Math.round((window.innerHeight - 30 - H) / 2 - 60 + (n % 6) * 26));
      const el = $(`<div class="window fr-win ${o.className || ''}" style="left:${x}px;top:${y}px;width:${W}px;height:${H}px">
        <div class="title-bar"><div class="title-bar-text">${FR.icon(o.icon || 'folder', 16)}<span class="fr-title"></span></div>
        <div class="title-bar-controls"><button aria-label="Minimize"></button><button aria-label="Maximize"></button><button aria-label="Close"></button></div></div>
        ${o.menu ? '<div class="fr-menubar"></div>' : ''}
        <div class="window-body fr-body"></div>
        ${o.statusBar ? `<div class="status-bar">${o.statusBar.map(s => `<p class="status-bar-field">${s}</p>`).join('')}</div>` : ''}
        ${o.resizable === false ? '' : '<div class="fr-resize"></div>'}
      </div>`);
      el.querySelector('.fr-title').textContent = o.title;
      const body = el.querySelector('.fr-body');
      if (o.content) { if (typeof o.content === 'string') body.innerHTML = o.content; else body.appendChild(o.content); }
      const host = FR.wm.layer();
      host.appendChild(el);
      const tb = $(`<button class="fr-task">${FR.icon(o.icon || 'folder', 16)}<span class="fr-task-t"></span></button>`);
      tb.querySelector('.fr-task-t').textContent = o.title;
      if (host === layer && taskbarList && !(o.className || '').includes('fr-dialog')) taskbarList.appendChild(tb);
      const isDlg = (o.className || '').includes('fr-dialog');
      const w = {
        id, el, body, opts: o, min: false, max: false, dz: isDlg ? 100000 + (++dn) : 0,
        setTitle(t) { el.querySelector('.fr-title').textContent = t; tb.querySelector('.fr-task-t').textContent = t; swSoon(); },
        setIcon(n) { el.querySelector('.title-bar-text .fr-ico').outerHTML = FR.icon(n, 16); tb.querySelector('.fr-ico').outerHTML = FR.icon(n, 16); },
        setStatus(i, t) { const f = el.querySelectorAll('.status-bar-field')[i]; if (f) f.innerHTML = t; },
        focus(fromUser) {
          // phones: a window that jumps to the front by itself (not by a tap in it) ignores taps for a moment (no ghost taps)
          if (FR.mobile && !fromUser && FR.wm.active !== w) el._frShown = Date.now();
          w._used = Date.now();
          swSoon();
          wins.forEach(v => { v.el.classList.add('fr-inactive'); v.tb.classList.remove('active'); });
          el.classList.remove('fr-inactive'); tb.classList.add('active'); el.style.zIndex = w.dz || ++z; FR.wm.active = w;
        },
        _toTb() { const r = el.getBoundingClientRect(), t = tb.getBoundingClientRect(); if (!t.width) return 'scale(.2)'; const sx = t.width / r.width, sy = t.height / r.height; return `translate(${t.left - r.left}px, ${t.top - r.top}px) scale(${sx}, ${sy})`; },
        minimize() {
          if (w.min) return; w.min = true; tb.classList.remove('active'); el.classList.add('fr-inactive'); FR.sound.play('minimize'); swSoon();
          if (FR.wm.active === w) { FR.wm.active = null; const nx = topWin(w); if (nx) nx.focus(); }
          el.style.transformOrigin = '0 0'; el.style.transition = 'transform .2s ease-in, opacity .2s ease-in';
          el.style.transform = w._toTb(); el.style.opacity = '0';
          setTimeout(() => { if (w.min) { el.style.display = 'none'; el.style.transition = ''; } }, 200);
        },
        restore() {
          if (!w.min) return; w.min = false; el.style.display = ''; FR.sound.play('restore'); el._frShown = Date.now(); swSoon();
          el.style.transition = 'none'; el.style.transformOrigin = '0 0'; el.style.transform = w._toTb(); el.style.opacity = '0';
          void el.offsetWidth; el.style.transition = 'transform .2s ease-out, opacity .2s ease-out'; el.style.transform = ''; el.style.opacity = '';
          setTimeout(() => { el.style.transition = ''; }, 220);
        },
        maximize(quiet) {
          if (!w.max) { w.prev = el.getAttribute('style'); el.style.left = '0px'; el.style.top = '0px'; el.style.width = '100%'; el.style.height = '100%'; el.classList.add('fr-max'); }
          else { el.setAttribute('style', w.prev); el.classList.remove('fr-max'); }
          w.max = !w.max; el.style.zIndex = ++z; if (!quiet) FR.sound.play(w.max ? 'maximize' : 'restore'); FR.bus.emit('win-resize', w);
        },
        close() {
          if (wins.get(id) !== w) return;                   // already closed (double-close)
          if (o.onClose && o.onClose() === false) return;
          if (wins.get(id) !== w) return;                   // onClose already tore it down (dialogs)
          tb.remove(); wins.delete(id); swSoon(); if (FR.wm.active === w) FR.wm.active = null; el.classList.add('fr-closing'); el.style.pointerEvents = 'none'; setTimeout(() => el.remove(), 140);
          const top = [...wins.values()].filter(v => !v.min).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0];
          if (top) top.focus();
        },
        tb,
      };
      wins.set(id, w);
      const [bMin, bMax, bClose] = el.querySelectorAll('.title-bar-controls button');
      bMin.onclick = e => { e.stopPropagation(); w.minimize(); };
      bMax.onclick = e => { e.stopPropagation(); if (o.resizable !== false && !(FR.mobile && w.max)) w.maximize(); };
      bClose.onclick = e => { e.stopPropagation(); FR.sound.play('click'); w.close(); };
      if (o.resizable === false) bMax.disabled = true;
      tb.onclick = () => { if (w.min) { w.restore(); w.focus(); } else if (FR.wm.active === w && !el.classList.contains('fr-inactive')) w.minimize(); else w.focus(); };
      // bring to front on ANY interaction anywhere in the window: mouse, pen, touch, keyboard focus
      const raise = () => { if (!w.min && FR.wm.active !== w) w.focus(true); };
      ['pointerdown', 'mousedown', 'touchstart', 'focusin'].forEach(ev => el.addEventListener(ev, raise, { capture: true, passive: true }));
      el.addEventListener('click', raise, true);
      // drag
      const bar = el.querySelector('.title-bar');
      // on a phone, app windows always fill the screen (there is no room, and no mouse, to drag them around)
      bar.addEventListener('dblclick', e => { if (!e.target.closest('button') && o.resizable !== false && !FR.mobile) w.maximize(); });
      bar.addEventListener('mousedown', e => {
        if (e.target.closest('button') || w.max) return;
        const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
        const mv = ev => { el.style.left = ox + ev.clientX - sx + 'px'; el.style.top = Math.max(0, oy + ev.clientY - sy) + 'px'; };
        const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); w.clamp(); };
        document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); e.preventDefault();
      });
      // keep at least 60px of the title bar on screen, so a window can always be grabbed again
      w.clamp = () => {
        if (w.max) return;
        const hw = host.clientWidth || innerWidth, hh = host.clientHeight || innerHeight, ww = el.offsetWidth;
        const l = Math.min(Math.max(el.offsetLeft, 60 - ww), hw - 60), t = Math.min(Math.max(el.offsetTop, 0), Math.max(0, hh - 24));
        el.style.left = l + 'px'; el.style.top = t + 'px';
      };
      const rz = el.querySelector('.fr-resize');
      if (rz) rz.addEventListener('mousedown', e => {
        const sx = e.clientX, sy = e.clientY, ow = el.offsetWidth, oh = el.offsetHeight;
        const mv = ev => { el.style.width = Math.max(260, ow + ev.clientX - sx) + 'px'; el.style.height = Math.max(160, oh + ev.clientY - sy) + 'px'; };
        const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); FR.bus.emit('win-resize', w); };
        document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); e.preventDefault(); e.stopPropagation();
      });
      if (o.menu) FR.wm.menubar(el.querySelector('.fr-menubar'), o.menu, w);
      if (!isDlg && (o.maximized || FR.mobile || window.innerWidth < 700 || ((o.className || '').includes('xl-win') && window.innerWidth < 1300))) w.maximize(FR.mobile);
      el.classList.add('fr-opening'); setTimeout(() => el.classList.remove('fr-opening'), 200);
      el._frShown = Date.now(); el._frGuard = isDlg ? 500 : 250;
      w.focus();
      return w;
    },
    menubar(bar, menu, w) {
      let openM = null;
      const closeAll = () => { bar.querySelectorAll('.fr-menu-drop').forEach(d => d.remove()); bar.querySelectorAll('.fr-mi').forEach(b => b.classList.remove('open')); openM = null; };
      menu.forEach(m => {
        const b = $(`<span class="fr-mi"></span>`); b.textContent = m.label; bar.appendChild(b);
        const show = () => {
          closeAll(); b.classList.add('open'); openM = b;
          const d = $(`<div class="fr-menu-drop"></div>`);
          (typeof m.items === 'function' ? m.items() : m.items).forEach(it => {
            if (it.sep) { d.appendChild($('<div class="fr-menu-sep"></div>')); return; }
            const r = $(`<div class="fr-menu-item ${it.disabled ? 'disabled' : ''}"><span class="fr-menu-check">${it.checked ? '&#10003;' : ''}</span><span></span><span class="fr-menu-key">${it.key || ''}</span></div>`);
            r.children[1].textContent = it.label;
            r.onclick = e => { e.stopPropagation(); if (it.disabled) return; closeAll(); it.action && it.action(w); };
            d.appendChild(r);
          });
          d.style.left = b.offsetLeft + 'px'; bar.appendChild(d);
          // phones: the menu bar scrolls sideways, so the drop-down floats (fixed) under its item and stays on screen
          if (FR.mobile) {
            const r = b.getBoundingClientRect(); d.classList.add('fr-menu-fixed'); d.style.left = Math.max(2, Math.min(r.left, innerWidth - d.offsetWidth - 2)) + 'px';
            // a menu bar low on the screen (IE puts its bars at the bottom on a phone) opens its menus upwards
            d.style.top = (r.bottom + d.offsetHeight > innerHeight - 44 ? Math.max(2, r.top - d.offsetHeight) : r.bottom) + 'px';
          }
        };
        b.onmousedown = e => { e.stopPropagation(); openM === b ? closeAll() : show(); };
        b.onmouseenter = () => { if (openM && openM !== b && !FR.mobile) show(); };   // (a tap fires mouseenter too)
      });
      document.addEventListener('mousedown', e => { if (!bar.contains(e.target)) closeAll(); });
      menuClosers.add(() => { if (!bar.isConnected) return null; const was = !!openM; if (was) closeAll(); return was; });
    },
    // close any open menubar dropdown; true if one was open
    closeMenus() { let any = false; menuClosers.forEach(f => { const r = f(); if (r === null) menuClosers.delete(f); else if (r) any = true; }); return any; },
    // phones: a dialog sits in the upper part of the screen (clear of the soft keyboard) and never hangs off an edge
    fitDialog(w, place) {
      const el = w.el, host = el.parentElement; if (!host) return;
      const hw = host.clientWidth || innerWidth, hh = host.clientHeight || innerHeight;
      if (el.offsetWidth > hw - 8) el.style.width = (hw - 8) + 'px';
      const ww = el.offsetWidth, h = el.offsetHeight;
      el.style.left = Math.max(4, Math.round((hw - ww) / 2)) + 'px';
      const top = place ? Math.round((hh - h) / 3) : el.offsetTop;
      el.style.top = Math.max(4, Math.min(top, hh - h - 4)) + 'px';
    },
    topDialog() { return [...wins.values()].filter(v => v.el.classList.contains('fr-dialog')).sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0))[0] || null; },
    dialog(o) {
      return new Promise(res => {
        const shade = $('<div class="fr-modal-shade"></div>');
        const iconName = o.icon || 'info';
        const btns = o.buttons || ['OK'];
        const content = $(`<div class="fr-dlg"><div class="fr-dlg-row">${FR.icon(iconName, 32)}<div class="fr-dlg-msg">${o.message || ''}</div></div>
          ${o.input ? `<div class="fr-dlg-input"><label>${o.input.label || ''}</label><input type="${o.input.type || 'text'}" autocomplete="off" spellcheck="false" autocapitalize="off" autocorrect="off"></div>` : ''}
          <div class="fr-dlg-btns">${btns.map((b, i) => `<button ${i === (o.def || 0) ? 'class="default"' : ''}>${b}</button>`).join('')}</div></div>`);
        FR.wm.layer().appendChild(shade);
        const prev = FR.wm.active;
        const w = FR.wm.open({ title: o.title || 'Frank Warmington\'s Computer', icon: iconName, width: o.width || 380, height: o.height || (o.input ? 190 : 150), resizable: false, content, className: 'fr-dialog', onClose: () => { finish(btns[btns.length - 1]); } });
        w.el.style.height = 'auto'; w.el.style.zIndex = w.dz; shade.style.zIndex = w.dz - 1;
        if (FR.mobile) FR.wm.fitDialog(w, true);
        let done = false;
        const inp = content.querySelector('input');
        function finish(button) { if (done) return; done = true; shade.remove(); w.el.remove(); w.tb.remove(); wins.delete(w.id);
          if (!FR.wm.topDialog()) dn = 0;
          // give focus back to the window that was active before the dialog (or the top-most one)
          let back = null;
          if (FR.wm.active === w) {
            FR.wm.active = null;
            back = prev && wins.has(prev.id) && !prev.min ? prev : FR.wm.topDialog() || topWin();
            if (back) back.focus();
          } else back = FR.wm.active;
          res({ button, value: inp ? inp.value : undefined });
          // apps (Excel) listen for this to put keyboard focus back into their grid
          setTimeout(() => { if (!FR.wm.topDialog()) FR.bus.emit('dialog-closed', back && wins.has(back.id) ? back : FR.wm.active); }, 0); }
        content.querySelectorAll('.fr-dlg-btns button').forEach((b, i) => (b.onclick = () => finish(btns[i])));
        if (inp) { inp.value = o.input.value || ''; setTimeout(() => inp.focus(), 30); inp.onkeydown = e => { if (e.key === 'Enter') finish(btns[0]); if (e.key === 'Escape') finish(btns[btns.length - 1]); }; }
        else setTimeout(() => (content.querySelector('.fr-dlg-btns button.default') || content.querySelector('button')).focus(), 30);
        if (iconName === 'error') FR.sound.play('error'); else if (iconName === 'warn') FR.sound.play('warn'); else if (iconName !== 'lock' && iconName !== 'key') FR.sound.play('ding');
      });
    },
  };
  // clicks inside an embedded web page (IE window) never reach us; when the page steals focus, raise its window
  window.addEventListener('blur', () => setTimeout(() => {
    const a = document.activeElement;
    if (a && a.tagName === 'IFRAME') { const host = a.closest('.fr-win'); const w = host && [...wins.values()].find(v => v.el === host); if (w && FR.wm.active !== w) w.focus(); }
  }, 0));
  FR.dialog = o => FR.wm.dialog(o);
  FR.openFile = n => {
    n = FR.fs.get(n); if (!n) return;
    const app = FR.apps[n.app];
    if (app) return app(n);
    FR.dialog({ icon: 'warn', title: n.name, message: `Windows cannot open this file:<br><br>File: ${FR.esc(n.name)}` });
  };

  /* ---------- balloon ---------- */
  FR.balloon = (title, text, onClick, opts = {}) => {
    if (document.querySelector('.fr-end')) return;
    // phones: never while typing (keyboard up) or while a message box waits for an answer; it waits its turn
    const typing = () => { const a = document.activeElement; return !!a && (/^(INPUT|TEXTAREA)$/.test(a.tagName) && !a.readOnly) && !!a.closest('#fr-root'); };
    // (nor over a property sheet's OK / Cancel or a checklist Submit bar, which sit where the toast goes)
    if (FR.mobile && (document.documentElement.classList.contains('fr-kb') || FR.wm.topDialog() || typing() || document.querySelector('.sh-sheetwin:not(.fr-inactive):not(.fr-closing), .fr-win:not(.fr-inactive) .ck-confirm'))) {
      const n = (opts.tries || 0) + 1; if (n < 20) setTimeout(() => FR.balloon(title, text, onClick, Object.assign({}, opts, { tries: n })), 1500); return;
    }
    if (!opts.silent && Date.now() - (FR._lastSound || 0) > 400) FR.sound.play('notify');
    const tray = document.querySelector('.fr-tray');
    document.querySelectorAll('.fr-balloon').forEach(b => b.remove());
    const b = $(`<div class="fr-balloon"><div class="fr-balloon-t">${FR.icon('info', 16)}<b></b><span class="fr-balloon-x">&#x2715;</span></div><div class="fr-balloon-b"></div></div>`);
    b.querySelector('b').textContent = title; b.querySelector('.fr-balloon-b').innerHTML = text;
    document.body.appendChild(b);
    if (tray) { const r = tray.getBoundingClientRect(); b.style.right = Math.max(6, window.innerWidth - r.right + 4) + 'px'; }
    // phones: when it goes, a tap already on its way to it must not land on what was underneath (see the tap guard below)
    const bye = () => { if (!b.isConnected) return; if (FR.mobile) balloonGhost = { r: b.getBoundingClientRect(), at: Date.now() }; b.remove(); };
    b.onclick = e => {
      // phones (S2): a toast whose text is cut off opens up on the first tap (the whole text, scrolling if long); it then
      // stays until ✕, a tap elsewhere, or a second tap (which does what the toast is for)
      const x = e.target.classList.contains('fr-balloon-x') || (FR.mobile && !!e.target.closest('.fr-balloon-x'));
      if (FR.mobile && !x && b.classList.contains('fr-balloon-more') && !b.classList.contains('fr-balloon-open')) { b.classList.add('fr-balloon-open'); b._frShown = Date.now(); b._frGuard = 350; return; }
      bye(); if (!x && onClick) onClick();
    };
    // phones: it doesn't vanish from under a finger (waits while the screen is being touched, or was just touched, or
    // while it is opened up), and a long text stays up long enough to read
    const auto = () => { if (FR.mobile && b.isConnected && (touching || Date.now() - lastTouch < 1500 || b.classList.contains('fr-balloon-open'))) return setTimeout(auto, 1500); bye(); };
    setTimeout(auto, FR.mobile ? Math.min(12000, Math.max(5000, 2500 + 45 * (b.textContent || '').length)) : 9000);
    if (FR.mobile) {
      // opened up, the toast shows what a tap on it does as a real button (e.g. "Open the checklist")
      if (onClick) { const go = $(`<div class="fr-balloon-acts"><button class="fr-balloon-go"></button></div>`); go.firstChild.textContent = opts.act || 'Open'; b.appendChild(go); }
      const bb = b.querySelector('.fr-balloon-b'), bt = b.querySelector('.fr-balloon-t b');
      if (bb.scrollHeight > bb.clientHeight + 1 || b.scrollHeight > b.clientHeight + 1 || (bt && bt.scrollWidth > bt.clientWidth + 1)) b.classList.add('fr-balloon-more');
      b._frShown = Date.now(); b._frGuard = 500;
      // a tap anywhere else puts it away (like a toast)
      setTimeout(() => {
        const away = e => { if (!b.contains(e.target)) bye(); if (!b.isConnected) document.removeEventListener('touchstart', away, true); };
        if (b.isConnected) document.addEventListener('touchstart', away, { capture: true, passive: true });
      }, 1200);
    }
  };

  /* ---------- phones: tap guard ----------
     A finger that was already on its way when something appeared under it (a message box, a window that came to the
     front by itself, a balloon, the window list) must not press what appeared, and a tap aimed at a balloon that just
     went away must not press what was underneath. Only touch taps are filtered (a mouse on a tablet is not). */
  let lastTouch = 0, balloonGhost = null;
  // phones: starting to type (a cell, the formula bar, an answer box) puts a balloon away at once
  document.addEventListener('focusin', e => {
    if (!FR.mobile || !e.target || !/^(INPUT|TEXTAREA)$/.test(e.target.tagName) || e.target.readOnly) return;
    document.querySelectorAll('.fr-balloon').forEach(b => b.remove());
  });
  let touching = false;   // a finger is on the screen right now
  const noteTouch = () => { lastTouch = Date.now(); };
  window.addEventListener('touchstart', e => { noteTouch(); touching = true; }, { capture: true, passive: true });
  ['touchend', 'touchcancel'].forEach(ev => window.addEventListener(ev, e => { touching = e.touches.length > 0; }, { capture: true, passive: true }));
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') noteTouch(); }, { capture: true, passive: true });
  const tapBlocked = e => {
    if (!FR.mobile || !e.isTrusted) return false;
    const touch = e.pointerType ? e.pointerType === 'touch' : Date.now() - lastTouch < 1000;
    if (!touch) return false;
    // the nearest guarded thing under the finger: a confirm bar (.fr-guard), the window list, a balloon or a window
    for (let t = e.target && e.target.closest ? e.target.closest('.fr-guard, .fr-win, .fr-swlist, .fr-balloon') : null; t; t = t.parentElement && t.parentElement.closest('.fr-guard, .fr-win, .fr-swlist, .fr-balloon')) {
      if (t._frShown && lastTouch < t._frShown + (t._frGuard || 350)) return true;
    }
    const g = balloonGhost;
    if (g && lastTouch > g.at - 1500 && lastTouch < g.at + 600 && e.clientX >= g.r.left && e.clientX <= g.r.right && e.clientY >= g.r.top && e.clientY <= g.r.bottom) return true;
    return false;
  };
  ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick'].forEach(ev => window.addEventListener(ev, e => {
    if (tapBlocked(e)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true));
  FR.tapGuard = { blocked: tapBlocked, lastTouch: () => lastTouch };

  /* ---------- phones: long-press = right-click, and the soft keyboard never covers the field being typed in ----------
     Everything here only acts while FR.mobile is on. */
  // long-press (550 ms, finger still) sends a contextmenu event to what's under the finger: desktop icons, Explorer items…
  // Android also fires its own contextmenu on a long-press; whichever comes first wins, the other is swallowed.
  let lp = null, lpBlockUntil = 0, lpClickUntil = 0;
  const lpCancel = () => { if (lp) { clearTimeout(lp.timer); if (!lp.fired) lp = null; } };
  document.addEventListener('touchstart', e => {
    lpCancel(); lp = null;
    // formulas, passwords, cell addresses: the phone keyboard must not capitalise or "correct" them
    const f = FR.mobile && e.target && e.target.tagName === 'INPUT' ? e.target : null;
    if (f && !f.hasAttribute('autocapitalize')) { f.setAttribute('autocapitalize', 'off'); f.setAttribute('autocorrect', 'off'); }
    if (!FR.mobile || e.touches.length !== 1) return;
    const t = e.touches[0], target = e.target;
    if (!target.closest || target.closest('input, textarea, select, iframe, [contenteditable]')) return;
    const x = t.clientX, y = t.clientY;
    const me = lp = { x, y, fired: false, timer: setTimeout(() => {
      if (lp !== me) return;
      me.fired = true; lpBlockUntil = Date.now() + 700;
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) {} }
      target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 2, buttons: 2 }));
    }, 550) };
  }, { capture: true, passive: true });
  document.addEventListener('touchmove', e => {
    if (!lp || lp.fired) return;
    const t = e.touches[0];
    if (!t || Math.abs(t.clientX - lp.x) > 10 || Math.abs(t.clientY - lp.y) > 10) lpCancel();
  }, { capture: true, passive: true });
  document.addEventListener('touchend', e => {
    // after a long-press, the lift must not also "tap" (open) what was under the finger
    if (lp && lp.fired) { if (e.cancelable) e.preventDefault(); lp = null; lpClickUntil = Date.now() + 350; return; }
    lpCancel();
  }, { capture: true, passive: false });
  document.addEventListener('touchcancel', () => { lpCancel(); lp = null; }, { capture: true, passive: true });
  document.addEventListener('contextmenu', e => {
    if (!FR.mobile || !e.isTrusted) return;
    if (lp && !lp.fired) { clearTimeout(lp.timer); lp.fired = true; lpBlockUntil = Date.now() + 700; return; }   // the browser's own long-press came first
    if (Date.now() < lpBlockUntil) { e.preventDefault(); e.stopImmediatePropagation(); }                         // ours already opened the menu
  }, true);
  document.addEventListener('click', e => { if (FR.mobile && Date.now() < lpClickUntil && e.isTrusted) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);

  // soft keyboard: when it shrinks the visible area, #fr-root shrinks to that area (windows, dialogs and the taskbar
  // move up above the keyboard), and the focused field is scrolled into view
  const vv = window.visualViewport;
  let kbOpen = false;
  // Works both ways browsers do it: iOS Safari / Chrome (visual viewport shrinks, layout stays) and Android Chrome with
  // interactive-widget=resizes-content (the layout itself shrinks). baseH = the full height for this orientation.
  let baseH = innerHeight, baseW = innerWidth;
  const inField = a => a && a !== document.body && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
  const reveal = a => {
    if (!inField(a)) return;
    try { a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (err) {}
    // still under the keyboard (nothing scrollable around it): nudge the nearest scroller
    const h = vv ? vv.height : innerHeight, r = a.getBoundingClientRect();
    if (r.bottom > h - 6) { let p = a.parentElement; while (p && p !== document.body && !(p.scrollHeight > p.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(p).overflowY))) p = p.parentElement; if (p && p !== document.body) p.scrollTop += r.bottom - h + 16; }
  };
  FR.viewportFit = (vh, vtop) => {
    const root = document.getElementById('fr-root'); if (!root) return;
    if (Math.abs(innerWidth - baseW) > 40) { baseW = innerWidth; baseH = innerHeight; }   // rotated: a new full height
    else if (innerHeight > baseH) baseH = innerHeight;
    if (vh == null && window.scrollY && FR.mobile) window.scrollTo(0, 0);                 // iOS scrolls the page to the field; the game never scrolls
    const h = vh != null ? vh : vv ? vv.height : innerHeight, t = vtop != null ? vtop : vv ? vv.offsetTop : 0;
    const zoomed = vh == null && vv && Math.abs((vv.scale || 1) - 1) > 0.02;
    const open = FR.mobile && !zoomed && Math.max(baseH, innerHeight) - h > 120;
    if (open && (innerHeight - h > 60 || t > 0)) { root.style.top = Math.round(t) + 'px'; root.style.bottom = 'auto'; root.style.height = Math.round(h) + 'px'; }
    else if (root.style.height) { root.style.top = ''; root.style.bottom = ''; root.style.height = ''; }
    if (open !== kbOpen) {
      kbOpen = open; document.documentElement.classList.toggle('fr-kb', open);
      wins.forEach(w => { if (w.el.classList.contains('fr-dialog')) FR.wm.fitDialog(w, false); });
    }
    if (open) { const a = document.activeElement; setTimeout(() => reveal(a), 60); setTimeout(() => reveal(a), 350); }
  };
  if (vv) { vv.addEventListener('resize', () => FR.viewportFit()); vv.addEventListener('scroll', () => { if (kbOpen || window.scrollY) FR.viewportFit(); }); }
  window.addEventListener('resize', () => { if (FR.mobile) FR.viewportFit(); });
  // a field that gets focus: once the keyboard is up (it takes ~300 ms to slide in), make sure the field is above it
  document.addEventListener('focusin', e => {
    if (!FR.mobile || !inField(e.target)) return;
    const a = e.target; setTimeout(() => { FR.viewportFit(); reveal(a); }, 60); setTimeout(() => { FR.viewportFit(); reveal(a); }, 450);
  });
  // Android Chrome: let the keyboard shrink the layout itself (iOS ignores this); phones only
  if (FR.mobile) { const vp = document.querySelector('meta[name=viewport]'); if (vp && !/interactive-widget/.test(vp.content)) vp.content += ', interactive-widget=resizes-content'; }
})();
