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
    // the board entry is from another (earlier) game than the one on this computer (this one is a replay)
    otherGame: me => !!(me && me.finished && (me.game ? me.game !== +FR.state.finishedAt : !FR.state.finishedAt)),
    // the rules in words, every number from src/score_rules.js (never typed in twice)
    rulesList: () => [
      `Each checklist item done: +${fmt(R.PER_SOLVED)}`,
      `Each wrong answer or wrong password: −${R.PER_WRONG} (an answer that isn't a number where a number is asked doesn't count)`,
      `${R.FREE_HINTS} free hints, then −${R.PER_HINT} per hint`,
      `Bonus requests (up to +${fmt(R.REQUESTS_MAX)}) and Easter eggs (+${R.PER_EGG} for each one you find, ${R.EGGS.length} hidden): up to +${fmt(R.BONUS_MAX)} on top, and they count on the leaderboard`,
    ],
    rulesLine: () => FR.score.rulesList().join(' · '),
    // (R5 P3) "4 of 15 Easter eggs · 9 of 9 bonus requests": what this game has found so far
    // (R6 Q9) the one word for the bonus total (bonus requests + Easter eggs) wherever it is shown on its own: the
    // checklist footer, the ending's tile, the leaderboard; the breakdown splits it into "bonus requests" and "eggs"
    bonusWord: 'bonus & eggs',
    found: (c = R.calc(FR.state)) => `${c.eggs} of ${c.eggsTotal} Easter eggs · ${c.bonusDone} of ${c.bonusTotal} bonus requests`,
    // which game is on the board (the same wording everywhere)
    boardRule: 'Your first finished Board Pack is your entry. Bonus requests and Easter eggs you finish later in that same game still add to it; a replay after "Start over" doesn\'t change it.',
    // "10 × 1,000 − 4 wrong × 50 + 1,300 bonus requests + 4 eggs × 10 = 11,140": how this game's score adds up
    breakdown: (c = R.calc(FR.state)) => {
      const parts = [`${c.solved} × ${fmt(R.PER_SOLVED)}`];
      if (c.wrong) parts.push(`− ${c.wrong} wrong × ${R.PER_WRONG}`);
      if (c.paidHints) parts.push(`− ${c.paidHints} paid hint${c.paidHints === 1 ? '' : 's'} × ${R.PER_HINT}`);
      const floored = c.main === 0 && c.solved * R.PER_SOLVED > 0;
      const eggs = c.eggs ? ` + ${c.eggs} egg${c.eggs === 1 ? '' : 's'} × ${R.PER_EGG}` : '';
      return `${parts.join(' ')}${floored ? ' (never below 0)' : ''}${c.requestPts ? ` + ${fmt(c.requestPts)} bonus requests` : ''}${eggs} = ${fmt(c.score)}`;
    },
  };

  // Packa's intranet, circa 2006: the company's own frame around the leaderboard
  const shell = inner => `<div class="st">
    <div class="st-top"><img src="${logo()}" alt=""><div><b>PACKA CORPORATION</b><span>Intranet &middot; Finance</span></div><em>Internal use only</em></div>
    <div class="st-crumb">Home &rsaquo; Finance &rsaquo; Board Meeting Oct 20 &rsaquo; <b>Who Covered for Frank?</b></div>
    <div class="st-body">
      <div class="st-live"><i></i>LIVE</div>
      <h1>${esc(TITLE)}</h1>
      <p class="st-sub">Frank is out of office (reason: unknown; hole behind poster: not discussed). The Board meets at 9:00 AM. These are the people who sat down at his desk and got the Board Pack out the door.</p>
      <div class="st-rules st-howto"><b>How points work</b><ul>${FR.score.rulesList().map(r => `<li>${esc(r)}</li>`).join('')}</ul><span>${esc(FR.score.boardRule)} Ranked by points, then by time at the desk.</span></div>
      ${inner}
      <div class="st-foot">Updates live; press Refresh for the latest. Page owner: F. Warmington (out of office). Questions: IT (also out of office).</div>
    </div></div>`;

  const medal = r => r <= 3 ? ` st-m${r}` : '';
  const row = (e, me) => `<tr class="${me ? 'st-me' : ''}"><td class="st-rank${medal(e.rank)}"><span>${e.rank}</span></td>
    <td class="st-name">${esc(e.name)}${me ? ' <i>(you)</i>' : ''}</td><td class="st-score">${fmt(e.score)}${e.bonus ? `<span class="st-pbonus">incl. +${fmt(e.bonus)} ${FR.score.bonusWord}</span>` : ''}</td><td class="st-bonus">${e.bonus ? '+' + fmt(e.bonus) : '&mdash;'}</td>
    <td>${e.finished ? '<span class="st-done">Board Pack sent</span>' : `At Frank's desk &middot; ${e.solved}/${R.ITEMS.length}`}</td>
    <td>${e.hints}</td><td>${e.wrong}</td><td>${esc(dur(e.timeMs))}</td></tr>`;

  // fill an IE page element; isCurrent() is false once the player has navigated away (the answer arrives late)
  function render(page, isCurrent = () => true) {
    const c = FR.score.now();
    const mine = c.solved ? `<div class="st-mine"><b>Your Board Pack right now:</b> ${fmt(c.score)} points${c.bonus ? ` (incl. +${fmt(c.bonus)} ${FR.score.bonusWord})` : ''} &middot; ${esc(FR.score.breakdown(c))} &middot; ${c.solved}/${c.total} done &middot; ${c.hints} hint${c.hints === 1 ? '' : 's'} (${c.freeLeft} free left) &middot; ${c.wrong} wrong &middot; ${esc(FR.score.found(c))}</div>` : '';
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
        : FR.score.otherGame(d.me) ? `<p class="st-note">Your place is from your first finished Board Pack: ${fmt(d.me.score)} points. This game is a replay, so it doesn't change it.</p>` : '';
      if (!d.top.length) { page.innerHTML = shell(`${mine}<div class="st-msg">Nobody has covered for Frank yet. Be the first.</div>${note}`); return; }
      const meRank = d.me ? d.me.rank : -1;
      page.innerHTML = shell(`${mine}<table class="st-t"><thead><tr><th>#</th><th>Player</th><th>Points</th><th title="Bonus requests and Easter eggs, included in Points">Bonus &amp; eggs</th><th>Status</th><th>Hints</th><th>Wrong</th><th>Time</th></tr></thead><tbody>
        ${d.top.map(e => row(e, e.rank === meRank)).join('')}
        ${d.me && !d.me.inTop ? `<tr class="st-gap"><td colspan="8">&hellip;</td></tr>${row(d.me, true)}` : ''}
        </tbody></table><p class="st-count">${fmt(d.players)} ${d.players === 1 ? 'person has' : 'people have'} covered for Frank so far</p>${note}`);
      const me = page.querySelector('.st-me'); if (me) me.scrollIntoView({ block: 'nearest' });
    }, () => { if (isCurrent() && page.isConnected) page.innerHTML = shell(`${mine}<div class="st-msg">The leaderboard didn't load. Press Refresh to try again.</div>`); });
  }
})();
