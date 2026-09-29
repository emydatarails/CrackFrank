/* FRANK'S COMPUTER — player accounts: the sign-in screen and cloud save (server side: api/*.js on Vercel).
   Signed in, FR.state is loaded from the player's account and every FR.save() also goes up to the server.
   Without the API (file://, a static host, storage not set up) the game plays exactly as before: browser-only saves. */
(() => {
  const $ = FR.$, esc = FR.esc;
  const ONLINE = /^https?:$/.test(location.protocol) && !new URLSearchParams(location.search).has('dev');
  const GUEST = 'frank-player-guest';     // "play without an account" was chosen in this browser
  const OWNER = 'frank-player-owner';     // whose progress the browser's save belongs to ('' = a guest's)
  const SYNC = 'frank-player-sync';       // "<rev>:<1 if this browser has changes the server hasn't got>"
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const A = FR.account = { user: null, available: false, rev: 0 };
  const hasProgress = st => Object.keys(st.solved || {}).length > 0 || (st.playMs || 0) > 0;

  function api(path, method = 'GET', body, keepalive) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
    const json = body ? JSON.stringify(body) : undefined;
    // browsers refuse keepalive bodies over 64 KB (a save with Paint pictures in it): send those as a normal request
    keepalive = !!keepalive && (!json || json.length < 60000);
    return fetch('/api/' + path, {
      method, credentials: 'same-origin', cache: 'no-store', keepalive, signal: keepalive ? undefined : ctl.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined, body: json,
    }).then(async r => { clearTimeout(t); let data = {}; try { data = await r.json(); } catch (e) {} return { ok: r.ok, status: r.status, data }; },
      e => { clearTimeout(t); throw e; });
  }

  /* ---------- cloud save ---------- */
  const localSave = FR.save, localReset = FR.resetSave;
  let timer = null, busy = null, blocked = false, lastSig = '', lastPlay = 0, backoff = 0;
  // everything except the play clock: a change here is real progress and goes up within seconds;
  // the clock alone (ticks every 5 s) goes up at most once a minute
  const sig = () => { const { playMs, ...rest } = FR.state; return JSON.stringify(rest); };
  const dirty = () => sig() !== lastSig || (FR.state.playMs || 0) !== lastPlay;

  function schedule() {
    if (!A.user || blocked) return;
    const changed = sig() !== lastSig;
    if (timer && !changed) return;
    clearTimeout(timer);
    timer = setTimeout(() => flush(false), backoff || (changed ? 1500 : 60000));
  }

  function flush(keepalive) {
    clearTimeout(timer); timer = null;
    if (!A.user || blocked || !dirty()) return Promise.resolve();
    if (busy) { if (!keepalive) schedule(); return busy; }
    const s = sig(), play = FR.state.playMs || 0;
    busy = api('save', 'PUT', { state: FR.state, rev: A.rev }, keepalive).then(r => {
      if (r.ok) { A.rev = r.data.rev; lastSig = s; lastPlay = play; backoff = 0; mark(); }
      else if (r.status === 409) conflict();
      else if (r.status === 401) expired();
      else throw new Error('save ' + r.status);
    }).catch(() => { backoff = Math.min((backoff || 2500) * 2, 60000); }).finally(() => { busy = null; if (!keepalive && dirty()) schedule(); });
    return busy;
  }

  function conflict() {
    blocked = true;
    FR.dialog({ icon: 'warn', title: 'Player account', buttons: ['Reload'],
      message: `This game was continued somewhere else (another tab or computer).<br><br>Reload to pick up from there.` })
      .then(() => location.reload());
  }
  function expired() {
    A.user = null;
    if (FR.balloon) FR.balloon('Signed out', 'Your sign-in expired. Progress now saves only in this browser. Reload the page to sign in again.');
  }

  const mark = () => store.set(SYNC, A.rev + ':' + (dirty() ? 1 : 0));
  FR.save = () => { localSave(); if (A.user && !blocked) { mark(); schedule(); } };
  // "Start over" wipes the account's save too; boot waits for this before reloading
  FR.resetSave = () => { localReset(); return A.user ? Promise.resolve(busy).then(() => flush(false)) : Promise.resolve(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true); });
  window.addEventListener('pagehide', () => flush(true));

  // take over the account's saved game (or keep/upload this browser's, when that's the right one)
  function adopt(d) {
    A.user = d.user; A.rev = d.rev || 0; blocked = false;
    const id = d.user.toLowerCase(), owner = store.get(OWNER);
    const cloud = FR.loadState(d.state), local = FR.state;
    const mine = owner === id, guests = !owner;
    // this browser's copy wins only if it has changes that never reached the server and nobody saved since
    const [syncRev, pending] = (store.get(SYNC) || '').split(':');
    const unsent = mine && pending === '1' && +syncRev === A.rev;
    if (cloud && !unsent) FR.state = cloud;
    else if (!cloud && !(hasProgress(local) && (mine || guests))) FR.state = FR.loadState({ solved: {} });
    // else: this browser has newer (or the only) progress for this player; it goes up below
    FR.sound.muted = !!FR.state.flags.muted;
    store.set(OWNER, id);
    localSave();
    if (FR.state === cloud) { lastSig = sig(); lastPlay = FR.state.playMs || 0; mark(); } else { lastSig = ''; mark(); flush(false); }
  }

  /* ---------- start-up ---------- */
  // resolves once the game can start: signed in, "play without an account", or no account server at all
  A.start = () => {
    if (!ONLINE) return Promise.resolve();
    return api('me').then(r => {
      if (r.ok && r.data.user) { A.available = true; adopt(r.data); return; }
      if (r.status === 401) { A.available = true; return store.get(GUEST) ? null : A.screen('new'); }
      // 404 (static host) / 503 (storage not set up) / anything else: browser-only saves, as before
    }, () => {});
  };

  // send any unsaved progress now (the leaderboard page calls this before loading)
  A.sync = () => flush(false);

  A.signOut = () => Promise.resolve(flush(false))
    .then(() => api('logout', 'POST', {}).catch(() => {}))
    .then(() => { clearTimeout(timer); A.user = null; localReset(); store.set(OWNER, ''); store.del(GUEST); store.del(SYNC); location.reload(); });

  /* ---------- sign-in screen ---------- */
  A.screen = (mode = 'new') => new Promise(done => {
    const el = $(`<div class="fr-screen fr-intro fr-acct"><div class="fr-folder">
      <div class="fr-stamp">VISITOR</div>
      <h1>Packa Corporation</h1>
      <div class="fr-sub">FRONT DESK · VISITOR SIGN-IN · Sedalia, Missouri</div>
      <p>Sign in so your progress goes with you. Close the tab, switch computers, come back tomorrow: Frank's desk will be exactly how you left it.</p>
      <div class="fr-acct-tabs" role="tablist">
        <button type="button" role="tab" data-m="new">New player</button>
        <button type="button" role="tab" data-m="back">I've been here before</button>
      </div>
      <form class="fr-acct-form" novalidate>
        <label>Player name<input name="u" maxlength="20" spellcheck="false" autocapitalize="off" autocomplete="username" required></label>
        <label>Password<input name="p" type="password" maxlength="200" required></label>
        <div class="fr-acct-note"></div>
        <div class="fr-acct-err" role="alert"></div>
        <div class="fr-intro-start">
          <button class="fr-bigbtn" type="submit"></button>
          <button class="fr-acct-guest" type="button">Play without an account</button>
        </div>
      </form>
      <p class="fr-small" style="margin-top:14px">Without an account, progress saves only in this browser. We keep your player name, a scrambled copy of your password and your game progress. Nothing else.</p>
    </div></div>`);
    const form = el.querySelector('form'), u = form.elements.u, p = form.elements.p;
    const err = el.querySelector('.fr-acct-err'), note = el.querySelector('.fr-acct-note'), go = form.querySelector('[type=submit]');
    const setMode = m => {
      mode = m;
      el.querySelectorAll('[data-m]').forEach(b => { const on = b.dataset.m === m; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      go.textContent = m === 'new' ? 'Create player' : 'Sign in';
      p.autocomplete = m === 'new' ? 'new-password' : 'current-password';
      note.textContent = m === 'new' ? "3–20 letters or numbers, and a password of 6+ characters. There's no password reset, so pick one you'll remember." : '';
      err.textContent = '';
    };
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { FR.sound.play('click'); setMode(b.dataset.m); u.focus(); });
    setMode(mode);
    const finish = () => { el.remove(); done(); };
    el.querySelector('.fr-acct-guest').onclick = () => { FR.sound.play('click'); store.set(GUEST, '1'); finish(); };
    form.onsubmit = e => {
      e.preventDefault();
      const name = u.value.trim(), pw = p.value;
      err.textContent = '';
      if (!/^[A-Za-z0-9_.-]{3,20}$/.test(name)) { err.textContent = 'Player names are 3–20 letters, numbers, dots, dashes or underscores.'; return u.focus(); }
      if (mode === 'new' ? pw.length < 6 : !pw) { err.textContent = mode === 'new' ? 'Passwords need at least 6 characters.' : 'Type your password.'; return p.focus(); }
      // a guest's progress in this browser becomes the new player's first save
      const carry = mode === 'new' && !store.get(OWNER) && hasProgress(FR.state) ? FR.state : undefined;
      go.disabled = true; go.textContent = mode === 'new' ? 'Creating…' : 'Signing in…';
      api(mode === 'new' ? 'register' : 'login', 'POST', { username: name, password: pw, state: carry }).then(r => {
        if (r.ok) { FR.sound.play('ding'); store.del(GUEST); adopt(r.data); return finish(); }
        FR.sound.play('error');
        err.textContent = r.data.message || "Couldn't reach the sign-in server. Try again in a moment.";
      }, () => { err.textContent = "Couldn't reach the sign-in server. Check your connection and try again."; })
        .finally(() => { if (el.isConnected) { const msg = err.textContent; go.disabled = false; setMode(mode); err.textContent = msg; } });
    };
    document.querySelectorAll('#fr-root > .fr-screen').forEach(s => s.remove());
    document.getElementById('fr-root').appendChild(el);
    setTimeout(() => u.focus(), 50);
  });
})();
