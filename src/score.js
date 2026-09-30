/* FRANK'S COMPUTER — score and the "Board Pack Rescue - Who Covered for Frank?" leaderboard.
   Rules: src/score_rules.js (shared with the server). The leaderboard is a page on Packa's company intranet
   (intranet.packacorp.local), shown by Frank's Internet Explorer (src/apps/shell.js) and filled from GET /api/scores.
   It needs the player-account server (FR.account.available); without it the score still shows in the game and the page
   says the intranet is offline. */
(() => {
  const esc = FR.esc, R = FR.scoreRules;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const dur = ms => FR.clock && FR.clock.dur ? FR.clock.dur(ms) : Math.round(ms / 60000) + ' min';
  const URL_ = 'http://intranet.packacorp.local/who-covered-for-frank';
  const TITLE = 'Board Pack Rescue - Who Covered for Frank?';
  const logo = () => 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(FR.data.logo.mark)));

  FR.score = {
    rules: R,
    fmt,
    url: URL_,
    title: TITLE,
    now: () => R.calc(FR.state),
    available: () => !!(FR.account && FR.account.available),
    // the leaderboard data, with the signed-in player's latest progress sent first so their row is current
    fetch: () => Promise.resolve(FR.account && FR.account.sync ? FR.account.sync() : null)
      .then(() => fetch('/api/scores', { credentials: 'same-origin', cache: 'no-store' }))
      .then(r => r.ok ? r.json() : Promise.reject(new Error('scores ' + r.status))),
    // open the leaderboard in Frank's Internet Explorer (closing the ending screen, which sits on top of the desktop)
    open: () => { document.querySelectorAll('.fr-end').forEach(e => e.remove()); FR.apps.ie(URL_); },
    render,
    rulesLine: () => `Each riddle solved +${fmt(R.PER_SOLVED)} · each wrong answer −${R.PER_WRONG} · ${R.FREE_HINTS} free hints, then −${R.PER_HINT} per hint · bonus requests and Easter eggs add up to +${fmt(R.BONUS_MAX)} on top`,
  };

  // Packa's intranet, circa 2006: the company's own frame around the leaderboard
  const shell = inner => `<div class="st">
    <div class="st-top"><img src="${logo()}" alt=""><div><b>PACKA CORPORATION</b><span>Intranet &middot; Finance</span></div><em>Internal use only</em></div>
    <div class="st-crumb">Home &rsaquo; Finance &rsaquo; Board Meeting Oct 20 &rsaquo; <b>Who Covered for Frank?</b></div>
    <div class="st-body">
      <div class="st-live"><i></i>LIVE</div>
      <h1>${esc(TITLE)}</h1>
      <p class="st-sub">Frank is out of office (reason: unknown; hole behind poster: not discussed). The Board meets at 9:00 AM. These are the people who sat down at his desk and got the Board Pack out the door. Ranked by points, then by time at the desk.</p>
      ${inner}
      <div class="st-rules"><b>Scoring.</b> ${esc(FR.score.rulesLine())}. Your first finished Board Pack is the one that counts.</div>
      <div class="st-foot">Updates live; press Refresh for the latest. Page owner: F. Warmington (out of office). Questions: IT (also out of office).</div>
    </div></div>`;

  const medal = r => r <= 3 ? ` st-m${r}` : '';
  const row = (e, me) => `<tr class="${me ? 'st-me' : ''}"><td class="st-rank${medal(e.rank)}"><span>${e.rank}</span></td>
    <td class="st-name">${esc(e.name)}${me ? ' <i>(you)</i>' : ''}</td><td class="st-score">${fmt(e.score)}${e.bonus ? `<span class="st-pbonus">incl. +${fmt(e.bonus)}</span>` : ''}</td><td class="st-bonus">${e.bonus ? '+' + fmt(e.bonus) : '&mdash;'}</td>
    <td>${e.finished ? '<span class="st-done">Board Pack sent</span>' : `At Frank's desk &middot; ${e.solved}/${R.ITEMS.length}`}</td>
    <td>${e.hints}</td><td>${e.wrong}</td><td>${esc(dur(e.timeMs))}</td></tr>`;

  // fill an IE page element; isCurrent() is false once the player has navigated away (the answer arrives late)
  function render(page, isCurrent = () => true) {
    const c = FR.score.now();
    const mine = c.solved ? `<div class="st-mine"><b>Your Board Pack right now:</b> ${fmt(c.score)} points${c.bonus ? ` (incl. +${fmt(c.bonus)} bonus)` : ''} &middot; ${c.solved}/${c.total} done &middot; ${c.hints} hint${c.hints === 1 ? '' : 's'} (${c.freeLeft} free left) &middot; ${c.wrong} wrong</div>` : '';
    if (!FR.score.available()) {
      page.innerHTML = shell(`${mine}<div class="st-msg">The intranet is offline. (The server is also in Vegas.)<br><small>The leaderboard is in the online game, for players with a player account.</small></div>`);
      return;
    }
    page.innerHTML = shell(`${mine}<div class="st-msg">Loading&hellip;</div>`);
    FR.score.fetch().then(d => {
      if (!isCurrent() || !page.isConnected) return;
      const signedIn = !!(FR.account && FR.account.user);
      const note = !signedIn ? `<p class="st-note">You're playing without a visitor badge (no player account), so you're not on the list. Create a player on the start screen to get on it.</p>`
        : !d.me ? `<p class="st-note">You'll appear here once you've ticked off your first item.</p>`
        : d.me.finished && !c.finished ? `<p class="st-note">Your place is from your first finished Board Pack: ${fmt(d.me.score)} points.</p>` : '';
      if (!d.top.length) { page.innerHTML = shell(`${mine}<div class="st-msg">Nobody has covered for Frank yet. Be the first.</div>${note}`); return; }
      const meRank = d.me ? d.me.rank : -1;
      page.innerHTML = shell(`${mine}<table class="st-t"><thead><tr><th>#</th><th>Player</th><th>Points</th><th title="Bonus requests and Easter eggs, included in Points">Bonus</th><th>Status</th><th>Hints</th><th>Wrong</th><th>Time</th></tr></thead><tbody>
        ${d.top.map(e => row(e, e.rank === meRank)).join('')}
        ${d.me && !d.me.inTop ? `<tr class="st-gap"><td colspan="8">&hellip;</td></tr>${row(d.me, true)}` : ''}
        </tbody></table><p class="st-count">${fmt(d.players)} ${d.players === 1 ? 'person has' : 'people have'} covered for Frank so far</p>${note}`);
      const me = page.querySelector('.st-me'); if (me) me.scrollIntoView({ block: 'nearest' });
    }, () => { if (isCurrent() && page.isConnected) page.innerHTML = shell(`${mine}<div class="st-msg">The leaderboard didn't load. Press Refresh to try again.</div>`); });
  }
})();
