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
  };

  // state = FR.state (or a saved copy of it). Never trusts the shape: anything odd counts as zero.
  R.calc = st => {
    st = st && typeof st === 'object' ? st : {};
    const solvedMap = st.solved && typeof st.solved === 'object' ? st.solved : {};
    const hintMap = st.hintsUsed && typeof st.hintsUsed === 'object' ? st.hintsUsed : {};
    const solved = R.ITEMS.filter(id => solvedMap[id]).length;
    const hints = R.ITEMS.reduce((n, id) => { const h = Math.floor(+hintMap[id]); return n + (h > 0 ? Math.min(h, R.MAX_HINTS_PER_ITEM) : 0); }, 0);
    const w = Math.floor(+st.wrong);
    const wrong = w > 0 ? Math.min(w, 1e6) : 0;
    const paidHints = Math.max(0, hints - R.FREE_HINTS);
    const score = Math.max(0, solved * R.PER_SOLVED - wrong * R.PER_WRONG - paidHints * R.PER_HINT);
    const finished = solved === R.ITEMS.length;
    const t = +(finished && st.finishPlayMs != null ? st.finishPlayMs : st.playMs);
    const timeMs = t > 0 && isFinite(t) ? Math.floor(t) : 0;
    return { score, solved, total: R.ITEMS.length, hints, paidHints, freeLeft: Math.max(0, R.FREE_HINTS - hints), wrong, finished, timeMs };
  };

  // sort key for the board: higher score first, then less time at the desk
  R.rankValue = c => c.score * 1e7 + (1e7 - 1 - Math.min(Math.floor(c.timeMs / 1000), 1e7 - 1));

  if (typeof module === 'object' && module.exports) module.exports = R;
  else window.FR.scoreRules = R;
})();
