/* FRANK'S COMPUTER — score and scoreboard. Rules: src/score_rules.js (shared with the server). Board: GET /api/scores.
   The board needs the player-account server (FR.account.available); without it the score still shows in the game. */
(() => {
  const $ = FR.$, esc = FR.esc, R = FR.scoreRules;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const dur = ms => FR.clock && FR.clock.dur ? FR.clock.dur(ms) : Math.round(ms / 60000) + ' min';

  FR.score = {
    rules: R,
    fmt,
    now: () => R.calc(FR.state),
    available: () => !!(FR.account && FR.account.available),
    // the board, with the signed-in player's latest progress sent first so their row is current
    fetch: () => Promise.resolve(FR.account && FR.account.sync ? FR.account.sync() : null)
      .then(() => fetch('/api/scores', { credentials: 'same-origin', cache: 'no-store' }))
      .then(r => r.ok ? r.json() : Promise.reject(new Error('scores ' + r.status))),
    open,
    rulesLine: () => `Each riddle solved +${fmt(R.PER_SOLVED)} · each wrong answer −${R.PER_WRONG} · ${R.FREE_HINTS} free hints, then −${R.PER_HINT} per hint`,
  };

  function row(e, me) {
    return `<tr class="${me ? 'sb-me' : ''}"><td class="sb-rank">${e.rank}</td><td class="sb-name">${esc(e.name)}${me ? ' <i>(you)</i>' : ''}</td>
      <td class="sb-score">${fmt(e.score)}</td><td>${e.solved}/${R.ITEMS.length}${e.finished ? ' ✓' : ''}</td><td>${e.hints}</td><td>${e.wrong}</td><td>${esc(dur(e.timeMs))}</td></tr>`;
  }

  function open() {
    document.querySelectorAll('.sb-shade').forEach(x => x.remove());
    const el = $(`<div class="sb-shade"><div class="window sb-win" role="dialog" aria-modal="true" aria-label="Scoreboard">
      <div class="title-bar"><div class="title-bar-text">Scoreboard — Board Pack Challenge</div><div class="title-bar-controls"><button aria-label="Close"></button></div></div>
      <div class="window-body">
        <p class="sb-rules">${esc(FR.score.rulesLine())}. Your first finished game is the one that counts.</p>
        <div class="sb-mine"></div>
        <div class="sb-body"><p class="sb-msg">Loading the scoreboard…</p></div>
        <div class="sb-foot"><button class="sb-close">Close</button></div>
      </div></div></div>`);
    const close = () => { el.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
    el.querySelectorAll('[aria-label=Close], .sb-close').forEach(b => b.onclick = () => { FR.sound.play('click'); close(); });
    el.onclick = e => { if (e.target === el) close(); };
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(el);
    el.querySelector('.sb-close').focus();

    // this browser's game, as the game itself counts it
    const c = FR.score.now(), mine = el.querySelector('.sb-mine');
    if (c.solved) mine.innerHTML = `<b>This game:</b> ${fmt(c.score)} points · ${c.solved}/${c.total} riddles · ${c.hints} hint${c.hints === 1 ? '' : 's'} (${c.freeLeft} free left) · ${c.wrong} wrong`;

    const body = el.querySelector('.sb-body');
    if (!FR.score.available()) { body.innerHTML = `<p class="sb-msg">The scoreboard is available in the online game, with a player account.</p>`; return; }
    FR.score.fetch().then(d => {
      if (!el.isConnected) return;
      const signedIn = !!(FR.account && FR.account.user);
      const note = !signedIn ? `<p class="sb-note">You're playing without an account, so your score isn't on the board. Sign in or create a player from the start screen to add it.</p>`
        : !d.me ? `<p class="sb-note">You'll appear here once you've solved your first riddle.</p>`
        : d.me.finished && !c.finished ? `<p class="sb-note">Your board score is from your first finished game: ${fmt(d.me.score)} points.</p>` : '';
      if (!d.top.length) { body.innerHTML = `<p class="sb-msg">Nobody is on the board yet. Be the first.</p>${note}`; return; }
      const meId = d.me ? d.me.rank : -1;
      body.innerHTML = `<div class="sb-scroll"><table class="sb-table"><thead><tr><th>#</th><th>Player</th><th>Score</th><th>Riddles</th><th>Hints</th><th>Wrong</th><th>Time</th></tr></thead><tbody>
        ${d.top.map(e => row(e, e.rank === meId)).join('')}
        ${d.me && !d.me.inTop ? `<tr class="sb-gap"><td colspan="7">⋯</td></tr>${row(d.me, true)}` : ''}
        </tbody></table></div><p class="sb-count">${fmt(d.players)} player${d.players === 1 ? '' : 's'} on the board</p>${note}`;
      const meRow = body.querySelector('.sb-me'); if (meRow) meRow.scrollIntoView({ block: 'nearest' });
    }, () => { if (el.isConnected) body.innerHTML = `<p class="sb-msg">Couldn't load the scoreboard. Try again in a moment.</p>`; });
  }
})();
