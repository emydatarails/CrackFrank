// POST /api/register {username, password, state?} → creates a player, signs them in.
// `state` (optional) is the guest progress from this browser, so it isn't lost when they sign up.
const L = require('./_lib');
const { nameProblem } = require('./_names');

module.exports = L.handler(['POST'], async (req, res, body) => {
  const name = String(body.username || '').trim(), pw = String(body.password || '');
  if (!L.USER_RE.test(name)) return L.send(res, 400, { error: 'username', message: 'Player names are 3–20 letters, numbers, dots, dashes or underscores.' });
  // names show on the public leaderboard (api/_names.js)
  const bad = nameProblem(name);
  if (bad) return L.send(res, 400, { error: 'name', message: bad === 'reserved' ? 'That player name is reserved. Pick another one.' : "That player name isn't allowed on the public leaderboard. Pick another one." });
  if (pw.length < 6 || pw.length > 200) return L.send(res, 400, { error: 'password', message: 'Passwords need at least 6 characters.' });
  if (await L.limited('reg', L.clientIp(req), 10, 3600)) return L.send(res, 429, { error: 'rate', message: 'Too many new players from here. Try again later.' });

  const id = name.toLowerCase();
  const rec = { name, ...(await L.hashPassword(pw)), createdAt: Date.now() };
  // NX: only if the name is free (atomic, so two people can't grab the same name)
  const ok = await L.redis('SET', L.K.user(id), JSON.stringify(rec), 'NX');
  if (ok !== 'OK') return L.send(res, 409, { error: 'taken', message: 'That player name is taken. Pick another, or sign in.' });

  let rev = 0, state = null;
  if (body.state && typeof body.state === 'object' && !Array.isArray(body.state)) {
    const json = JSON.stringify({ state: body.state, rev: 1, updatedAt: Date.now() });
    if (json.length <= L.MAX_SAVE) { await L.redis('SET', L.K.save(id), json); rev = 1; state = body.state; await L.updateBoard(id, null, state); }
  }
  await L.createSession(res, req, id);
  L.send(res, 201, { user: name, state, rev });
});
