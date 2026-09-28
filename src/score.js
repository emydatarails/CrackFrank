/* FRANK'S COMPUTER — score and the Live Standings page. Rules: src/score_rules.js (shared with the server).
   The standings are a page on the in-game Excel World Championship site (championship.example/standings), shown by
   Frank's Internet Explorer (src/apps/shell.js) and filled from GET /api/scores. They need the player-account server
   (FR.account.available); without it the score still shows in the game and the page says the standings are offline. */
(() => {
  const esc = FR.esc, R = FR.scoreRules;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const dur = ms => FR.clock && FR.clock.dur ? FR.clock.dur(ms) : Math.round(ms / 60000) + ' min';
  const URL_ = 'http://championship.example/standings';
  const TITLE = 'Board Pack Rescue — Live Standings';

  FR.score = {
    rules: R,
    fmt,
    url: URL_,
    title: TITLE,
    now: () => R.calc(FR.state),
    available: () => !!(FR.account && FR.account.available),
    // the standings, with the signed-in player's latest progress sent first so their row is current
    fetch: () => Promise.resolve(FR.account && FR.account.sync ? FR.account.sync() : null)
      .then(() => fetch('/api/scores', { credentials: 'same-origin', cache: 'no-store' }))
      .then(r => r.ok ? r.json() : Promise.reject(new Error('scores ' + r.status))),
    // open the standings in Frank's Internet Explorer (closing the ending screen, which sits on top of the desktop)
    open: () => { document.querySelectorAll('.fr-end').forEach(e => e.remove()); FR.apps.ie(URL_); },
    render,
    rulesLine: () => `Each riddle solved +${fmt(R.PER_SOLVED)} · each wrong answer −${R.PER_WRONG} · ${R.FREE_HINTS} free hints, then −${R.PER_HINT} per hint`,
  };

  const shell = inner => `<div class="ch st">
    <div class="ch-top"><b>MICROSOFT EXCEL WORLD CHAMPIONSHIP</b> &middot; Las Vegas, NV &middot; October 17&ndash;19, 2026</div>
    <div class="st-nav"><a class="cc-lnk" data-url="http://championship.example/schedule">Schedule</a><a class="on">Live Standings</a></div>
    <div class="ch-body">
      <div class="st-live"><i></i>LIVE</div>
      <h1>${esc(TITLE)}</h1>
      <p class="ch-sub"><b>Desk Division</b> &mdash; the only event played from home. Half the FP&amp;A world is in Vegas this week, and somebody still has to finish the Board Pack before the 9:00 AM Board meeting. Ranked by points, then by time at the desk.</p>
      ${inner}
      <div class="ch-note"><b>Scoring.</b> ${esc(FR.score.rulesLine())}. Your first finished Board Pack is the one that counts.</div>
      <div class="ch-foot">Standings update live; press Refresh for the latest. Sponsored by the Spreadsheet Speedrun Association. Not affiliated with any finance software company. Especially not with the one that keeps emailing us.</div>
    </div></div>`;

  const medal = r => r <= 3 ? ` st-m${r}` : '';
  const row = (e, me) => `<tr class="${me ? 'st-me' : ''}"><td class="st-rank${medal(e.rank)}"><span>${e.rank}</span></td>
    <td class="st-name">${esc(e.name)}${me ? ' <i>(you)</i>' : ''}</td><td class="st-score">${fmt(e.score)}</td>
    <td>${e.finished ? '<span class="st-done">Board Pack sent</span>' : `At the desk &middot; ${e.solved}/${R.ITEMS.length}`}</td>
    <td>${e.hints}</td><td>${e.wrong}</td><td>${esc(dur(e.timeMs))}</td></tr>`;

  // fill an IE page element; isCurrent() is false once the player has navigated away (the answer arrives late)
  function render(page, isCurrent = () => true) {
    const c = FR.score.now();
    const mine = c.solved ? `<div class="st-mine"><b>Your Board Pack right now:</b> ${fmt(c.score)} points &middot; ${c.solved}/${c.total} done &middot; ${c.hints} hint${c.hints === 1 ? '' : 's'} (${c.freeLeft} free left) &middot; ${c.wrong} wrong</div>` : '';
    if (!FR.score.available()) {
      page.innerHTML = shell(`${mine}<div class="st-msg">The live standings are offline. (The championship Wi-Fi is also in Vegas.)<br><small>They're in the online game, for players with a player account.</small></div>`);
      return;
    }
    page.innerHTML = shell(`${mine}<div class="st-msg">Loading standings&hellip;</div>`);
    FR.score.fetch().then(d => {
      if (!isCurrent() || !page.isConnected) return;
      const signedIn = !!(FR.account && FR.account.user);
      const note = !signedIn ? `<p class="st-note">You're playing without a badge (no player account), so you're not in the standings. Create a player on the start screen to enter.</p>`
        : !d.me ? `<p class="st-note">You'll appear here once you've ticked off your first item.</p>`
        : d.me.finished && !c.finished ? `<p class="st-note">Your standing is from your first finished Board Pack: ${fmt(d.me.score)} points.</p>` : '';
      if (!d.top.length) { page.innerHTML = shell(`${mine}<div class="st-msg">No entries yet. The Desk Division is wide open.</div>${note}`); return; }
      const meRank = d.me ? d.me.rank : -1;
      page.innerHTML = shell(`${mine}<table class="ch-t st-t"><thead><tr><th>#</th><th>Player</th><th>Points</th><th>Status</th><th>Hints</th><th>Wrong</th><th>Time</th></tr></thead><tbody>
        ${d.top.map(e => row(e, e.rank === meRank)).join('')}
        ${d.me && !d.me.inTop ? `<tr class="st-gap"><td colspan="7">&hellip;</td></tr>${row(d.me, true)}` : ''}
        </tbody></table><p class="st-count">${fmt(d.players)} player${d.players === 1 ? '' : 's'} in the Desk Division</p>${note}`);
      const me = page.querySelector('.st-me'); if (me) me.scrollIntoView({ block: 'nearest' });
    }, () => { if (isCurrent() && page.isConnected) page.innerHTML = shell(`${mine}<div class="st-msg">The standings didn't load. Press Refresh to try again.</div>`); });
  }
})();
