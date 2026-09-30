/* FRANK'S COMPUTER — scoring rules. ONE copy, used by the game (build.py concatenates it) and by the scoreboard
   server (api/_lib.js requires it), so the score a player sees is exactly the score on the board.
   Change the numbers here only. */
(() => {
  const R = {
    ITEMS: ['login', 'version', 'unlock', 'ebitda', 'dscr', 'cash', 'bridge', 'forboard', 'send', 'frank'],
    PER_SOLVED: 1000,      // each checklist item done
    PER_WRONG: 50,         // each wrong guess (password boxes, checklist answers)
    PER_HINT: 100,         // each hint after the free ones
    FREE_HINTS: 10,        // every player gets this many hints at no cost
    MAX_HINTS_PER_ITEM: 3,
    // Optional bonus requests (src/apps/xp_bonus.js: e-mails from people who don't know Frank is missing) and the
    // Easter-egg hunt (src/apps/xp_eggs.js: PER_EGG for each egg found). These points ADD ON TOP of the main score and
    // count for the leaderboard, so a perfect game can pass 10,000. A wrong bonus answer costs nothing.
    BONUS: {
      tom_comm: 150,        // Tom Bracken: a tiered sales commission
      mum_fx: 100,          // Frank's mum: US dollars to Canadian dollars
      intern_accrual: 150,  // the new intern: accrue one month of a quarterly bill
      steve_margin: 200,    // Steve Packa: markup vs margin
      dale_var: 100,        // Dale in Shipping: % variance to budget
      rotary_be: 150,       // Sedalia Rotary Club: break-even tickets
      brenda_disc: 100,     // a customer's AP clerk: 2/10 net 30
      vending_ci: 250,      // the vending man: compound interest
      it_audit: 100,        // IT's audit script: read a file size off Properties
    },
    // (round 5) every Easter egg is worth points as it's found (it used to be 150 for all 15 or nothing). The ids are
    // the eggs of src/apps/xp_eggs.js (the same list, checked by test/score_test.js); a save's other keys don't count.
    PER_EGG: 10,
    EGGS: ['karaoke', 'diary', 'resign', 'portrait', 'run_frank', 'run_vegas', 'run_xlookup', 'xl_kristians', 'xl_hidden',
      'tray_k5', 'saver', 'sol212', 'calc0003', 'ie_karaoke', 'clock'],
  };

  // state = FR.state (or a saved copy of it). Never trusts the shape: anything odd counts as zero.
  // score = max(0, riddles − wrong guesses − paid hints) + bonus: penalties never eat into bonus points.
  R.calc = st => {
    st = st && typeof st === 'object' ? st : {};
    const solvedMap = st.solved && typeof st.solved === 'object' ? st.solved : {};
    const hintMap = st.hintsUsed && typeof st.hintsUsed === 'object' ? st.hintsUsed : {};
    const bonusMap = st.bonus && typeof st.bonus === 'object' && !Array.isArray(st.bonus) ? st.bonus : {};
    const solved = R.ITEMS.filter(id => solvedMap[id]).length;
    const hints = R.ITEMS.reduce((n, id) => { const h = Math.floor(+hintMap[id]); return n + (h > 0 ? Math.min(h, R.MAX_HINTS_PER_ITEM) : 0); }, 0);
    const w = Math.floor(+st.wrong);
    const wrong = w > 0 ? Math.min(w, 1e6) : 0;
    const paidHints = Math.max(0, hints - R.FREE_HINTS);
    const main = Math.max(0, solved * R.PER_SOLVED - wrong * R.PER_WRONG - paidHints * R.PER_HINT);
    // only ids in the table count, at the table's points (never the points a save claims)
    const bonusIds = Object.keys(R.BONUS).filter(id => {
      const b = Object.prototype.hasOwnProperty.call(bonusMap, id) ? bonusMap[id] : null;
      return !!b && typeof b === 'object' && +b.solvedAt > 0;
    });
    const eggMap = st.eggs && typeof st.eggs === 'object' && !Array.isArray(st.eggs) ? st.eggs : {};
    const eggs = R.EGGS.filter(id => Object.prototype.hasOwnProperty.call(eggMap, id) && +eggMap[id] > 0).length;
    const eggPts = eggs * R.PER_EGG;
    const requestPts = bonusIds.reduce((n, id) => n + R.BONUS[id], 0);
    const bonus = requestPts + eggPts;
    const score = main + bonus;
    const finished = solved === R.ITEMS.length;
    const t = +(finished && st.finishPlayMs != null ? st.finishPlayMs : st.playMs);
    const timeMs = t > 0 && isFinite(t) ? Math.floor(t) : 0;
    return { score, main, bonus, bonusDone: bonusIds.length, bonusTotal: Object.keys(R.BONUS).length, requestPts, eggs, eggsTotal: R.EGGS.length, eggPts, solved, total: R.ITEMS.length, hints, paidHints, freeLeft: Math.max(0, R.FREE_HINTS - hints), wrong, finished, timeMs };
  };
  // the most bonus a game can collect: every bonus request, and every egg
  R.REQUESTS_MAX = Object.keys(R.BONUS).reduce((n, id) => n + R.BONUS[id], 0);
  R.EGGS_MAX = R.EGGS.length * R.PER_EGG;
  R.BONUS_MAX = R.REQUESTS_MAX + R.EGGS_MAX;

  // sort key for the board: higher score first, then less time at the desk
  R.rankValue = c => c.score * 1e7 + (1e7 - 1 - Math.min(Math.floor(c.timeMs / 1000), 1e7 - 1));

  if (typeof module === 'object' && module.exports) module.exports = R;
  else window.FR.scoreRules = R;
})();
