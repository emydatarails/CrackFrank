// GET /api/me → the signed-in player and their saved game, or {user: null} when signed out. (Asking "who am I?" while
// signed out is a normal answer, not an error: a 401 here was red noise in every new player's console. /api/save still
// answers 401 without a session.)
const L = require('./_lib');

module.exports = L.handler(['GET'], async (req, res) => {
  const id = await L.currentUser(req);
  if (!id) return L.send(res, 200, { user: null });
  const raw = await L.redis('GET', L.K.user(id));
  if (!raw) return L.send(res, 200, { user: null });
  const save = await L.loadSave(id);
  L.send(res, 200, { user: JSON.parse(raw).name, state: save.state, rev: save.rev });
});
