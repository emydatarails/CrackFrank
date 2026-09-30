// GET /api/scores → the top 50 players, plus the signed-in player's own entry and rank (even outside the top 50).
// me.game = the finishedAt of the game the entry is (0 while unfinished), so the game can tell "this game" from "a replay".
const L = require('./_lib');
const TOP = 50;

const pub = (e, rank) => e && { rank, name: e.name, score: e.score, bonus: e.bonus || 0, solved: e.solved, hints: e.hints, wrong: e.wrong, finished: !!e.finished, timeMs: e.timeMs || 0 };

module.exports = L.handler(['GET'], async (req, res) => {
  const ids = (await L.redis('ZREVRANGE', L.K.board, 0, TOP - 1)) || [];
  const infos = ids.length ? await L.redis('HMGET', L.K.boardInfo, ...ids) : [];
  const top = ids.map((id, i) => pub(infos[i] && JSON.parse(infos[i]), i + 1)).filter(Boolean);
  const players = (await L.redis('ZCARD', L.K.board)) || 0;

  let me = null;
  const id = await L.currentUser(req);
  if (id) {
    const rank = await L.redis('ZREVRANK', L.K.board, id), raw = await L.redis('HGET', L.K.boardInfo, id);
    if (rank !== null && raw) { const e = JSON.parse(raw); me = pub(e, rank + 1); me.inTop = me.rank <= TOP; me.game = e.game || 0; }
  }
  L.send(res, 200, { top, me, players, rules: { perSolved: L.RULES.PER_SOLVED, perWrong: L.RULES.PER_WRONG, perHint: L.RULES.PER_HINT, freeHints: L.RULES.FREE_HINTS, bonus: L.RULES.BONUS, bonusMax: L.RULES.BONUS_MAX } });
});
