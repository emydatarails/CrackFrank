// PUT /api/save {state, rev} → stores the signed-in player's game.
// `rev` is the revision the client last loaded or saved. If the server has a newer one, the game was
// continued somewhere else, so this returns 409 instead of overwriting it.
const L = require('./_lib');

module.exports = L.handler(['PUT'], async (req, res, body) => {
  const id = await L.currentUser(req);
  if (!id) return L.send(res, 401, { error: 'signed-out' });
  const st = body.state;
  if (!st || typeof st !== 'object' || Array.isArray(st) || !st.solved || typeof st.solved !== 'object')
    return L.send(res, 400, { error: 'state' });

  const cur = await L.loadSave(id);
  if ((+body.rev || 0) < cur.rev) return L.send(res, 409, { error: 'conflict', rev: cur.rev });
  const rev = cur.rev + 1;
  // ver = the game build that wrote it (FR.version, build.py), to match a player's report to a release
  const json = JSON.stringify({ state: st, rev, updatedAt: Date.now(), ver: String(body.ver || '').slice(0, 60) });
  if (json.length > L.MAX_SAVE) return L.send(res, 413, { error: 'too-large' });
  await L.redis('SET', L.K.save(id), json);
  await L.updateBoard(id, cur.state, st);
  L.send(res, 200, { rev });
});
