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
    return st;
  };
  FR.state = fresh();
  // can this browser save at all? (private mode / blocked storage)
  FR.storageOk = (() => { try { const k = SAVE_KEY + '-t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } })();
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && typeof s === 'object' && s.solved && typeof s.solved === 'object') FR.state = harden(Object.assign(fresh(), s)); } catch (e) {}
  FR.save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(FR.state)); } catch (e) { FR.storageOk = false; } };
  FR.resetSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} FR.state = fresh(); };
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
  FR.wm = {
    wins,
    init(layerEl, taskbarEl) {
      // a fresh desktop (e.g. after Log Off) starts with no windows
      wins.forEach(w => { w.el.remove(); w.tb.remove(); }); wins.clear(); FR.wm.active = null;
      layer = layerEl; taskbarList = taskbarEl;
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
        setTitle(t) { el.querySelector('.fr-title').textContent = t; tb.querySelector('.fr-task-t').textContent = t; },
        setIcon(n) { el.querySelector('.title-bar-text .fr-ico').outerHTML = FR.icon(n, 16); tb.querySelector('.fr-ico').outerHTML = FR.icon(n, 16); },
        setStatus(i, t) { const f = el.querySelectorAll('.status-bar-field')[i]; if (f) f.innerHTML = t; },
        focus() {
          wins.forEach(v => { v.el.classList.add('fr-inactive'); v.tb.classList.remove('active'); });
          el.classList.remove('fr-inactive'); tb.classList.add('active'); el.style.zIndex = w.dz || ++z; FR.wm.active = w;
        },
        _toTb() { const r = el.getBoundingClientRect(), t = tb.getBoundingClientRect(); if (!t.width) return 'scale(.2)'; const sx = t.width / r.width, sy = t.height / r.height; return `translate(${t.left - r.left}px, ${t.top - r.top}px) scale(${sx}, ${sy})`; },
        minimize() {
          if (w.min) return; w.min = true; tb.classList.remove('active'); el.classList.add('fr-inactive'); FR.sound.play('minimize');
          if (FR.wm.active === w) { FR.wm.active = null; const nx = topWin(w); if (nx) nx.focus(); }
          el.style.transformOrigin = '0 0'; el.style.transition = 'transform .2s ease-in, opacity .2s ease-in';
          el.style.transform = w._toTb(); el.style.opacity = '0';
          setTimeout(() => { if (w.min) { el.style.display = 'none'; el.style.transition = ''; } }, 200);
        },
        restore() {
          if (!w.min) return; w.min = false; el.style.display = ''; FR.sound.play('restore');
          el.style.transition = 'none'; el.style.transformOrigin = '0 0'; el.style.transform = w._toTb(); el.style.opacity = '0';
          void el.offsetWidth; el.style.transition = 'transform .2s ease-out, opacity .2s ease-out'; el.style.transform = ''; el.style.opacity = '';
          setTimeout(() => { el.style.transition = ''; }, 220);
        },
        maximize() {
          if (!w.max) { w.prev = el.getAttribute('style'); el.style.left = '0px'; el.style.top = '0px'; el.style.width = '100%'; el.style.height = '100%'; el.classList.add('fr-max'); }
          else { el.setAttribute('style', w.prev); el.classList.remove('fr-max'); }
          w.max = !w.max; el.style.zIndex = ++z; FR.sound.play(w.max ? 'maximize' : 'restore'); FR.bus.emit('win-resize', w);
        },
        close() {
          if (wins.get(id) !== w) return;                   // already closed (double-close)
          if (o.onClose && o.onClose() === false) return;
          if (wins.get(id) !== w) return;                   // onClose already tore it down (dialogs)
          tb.remove(); wins.delete(id); if (FR.wm.active === w) FR.wm.active = null; el.classList.add('fr-closing'); el.style.pointerEvents = 'none'; setTimeout(() => el.remove(), 140);
          const top = [...wins.values()].filter(v => !v.min).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0];
          if (top) top.focus();
        },
        tb,
      };
      wins.set(id, w);
      const [bMin, bMax, bClose] = el.querySelectorAll('.title-bar-controls button');
      bMin.onclick = e => { e.stopPropagation(); w.minimize(); };
      bMax.onclick = e => { e.stopPropagation(); if (o.resizable !== false) w.maximize(); };
      bClose.onclick = e => { e.stopPropagation(); FR.sound.play('click'); w.close(); };
      if (o.resizable === false) bMax.disabled = true;
      tb.onclick = () => { if (w.min) { w.restore(); w.focus(); } else if (FR.wm.active === w && !el.classList.contains('fr-inactive')) w.minimize(); else w.focus(); };
      // bring to front on ANY interaction anywhere in the window: mouse, pen, touch, keyboard focus
      const raise = () => { if (!w.min && FR.wm.active !== w) w.focus(); };
      ['pointerdown', 'mousedown', 'touchstart', 'focusin'].forEach(ev => el.addEventListener(ev, raise, { capture: true, passive: true }));
      el.addEventListener('click', raise, true);
      // drag
      const bar = el.querySelector('.title-bar');
      bar.addEventListener('dblclick', e => { if (!e.target.closest('button') && o.resizable !== false) w.maximize(); });
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
      if (!isDlg && (o.maximized || window.innerWidth < 700 || ((o.className || '').includes('xl-win') && window.innerWidth < 1300))) w.maximize();
      el.classList.add('fr-opening'); setTimeout(() => el.classList.remove('fr-opening'), 200);
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
        };
        b.onmousedown = e => { e.stopPropagation(); openM === b ? closeAll() : show(); };
        b.onmouseenter = () => { if (openM && openM !== b) show(); };
      });
      document.addEventListener('mousedown', e => { if (!bar.contains(e.target)) closeAll(); });
      menuClosers.add(() => { if (!bar.isConnected) return null; const was = !!openM; if (was) closeAll(); return was; });
    },
    // close any open menubar dropdown; true if one was open
    closeMenus() { let any = false; menuClosers.forEach(f => { const r = f(); if (r === null) menuClosers.delete(f); else if (r) any = true; }); return any; },
    topDialog() { return [...wins.values()].filter(v => v.el.classList.contains('fr-dialog')).sort((a, b) => (+b.el.style.zIndex || 0) - (+a.el.style.zIndex || 0))[0] || null; },
    dialog(o) {
      return new Promise(res => {
        const shade = $('<div class="fr-modal-shade"></div>');
        const iconName = o.icon || 'info';
        const btns = o.buttons || ['OK'];
        const content = $(`<div class="fr-dlg"><div class="fr-dlg-row">${FR.icon(iconName, 32)}<div class="fr-dlg-msg">${o.message || ''}</div></div>
          ${o.input ? `<div class="fr-dlg-input"><label>${o.input.label || ''}</label><input type="${o.input.type || 'text'}" autocomplete="off" spellcheck="false"></div>` : ''}
          <div class="fr-dlg-btns">${btns.map((b, i) => `<button ${i === 0 ? 'class="default"' : ''}>${b}</button>`).join('')}</div></div>`);
        FR.wm.layer().appendChild(shade);
        const prev = FR.wm.active;
        const w = FR.wm.open({ title: o.title || 'Frank Warmington\'s Computer', icon: iconName, width: o.width || 380, height: o.height || (o.input ? 190 : 150), resizable: false, content, className: 'fr-dialog', onClose: () => { finish(btns[btns.length - 1]); } });
        w.el.style.height = 'auto'; w.el.style.zIndex = w.dz; shade.style.zIndex = w.dz - 1;
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
        else setTimeout(() => content.querySelector('button').focus(), 30);
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
    if (!opts.silent && Date.now() - (FR._lastSound || 0) > 400) FR.sound.play('notify');
    const tray = document.querySelector('.fr-tray');
    document.querySelectorAll('.fr-balloon').forEach(b => b.remove());
    const b = $(`<div class="fr-balloon"><div class="fr-balloon-t">${FR.icon('info', 16)}<b></b><span class="fr-balloon-x">&#x2715;</span></div><div class="fr-balloon-b"></div></div>`);
    b.querySelector('b').textContent = title; b.querySelector('.fr-balloon-b').innerHTML = text;
    document.body.appendChild(b);
    if (tray) { const r = tray.getBoundingClientRect(); b.style.right = Math.max(6, window.innerWidth - r.right + 4) + 'px'; }
    b.onclick = e => { b.remove(); if (!e.target.classList.contains('fr-balloon-x') && onClick) onClick(); };
    setTimeout(() => b.remove(), 9000);
  };
})();
