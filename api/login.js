// POST /api/login {username, password} → signs the player in and returns their saved game.
const L = require('./_lib');

const WRONG = { error: 'credentials', message: "That player name and password don't match." };

module.exports = L.handler(['POST'], async (req, res, body) => {
  const name = String(body.username || '').trim(), pw = String(body.password || '');
  const id = name.toLowerCase();
  if (await L.limited('login-ip', L.clientIp(req), 30, 900) || (L.USER_RE.test(name) && await L.limited('login-user', id, 10, 900)))
    return L.send(res, 429, { error: 'rate', message: 'Too many tries. Wait 15 minutes and try again.' });
  if (!L.USER_RE.test(name) || !pw) return L.send(res, 401, WRONG);

  const raw = await L.redis('GET', L.K.user(id));
  const rec = raw ? JSON.parse(raw) : null;
  if (!rec || !(await L.checkPassword(pw, rec))) return L.send(res, 401, WRONG);

  await L.createSession(res, req, id);
  const save = await L.loadSave(id);
  L.send(res, 200, { user: rec.name, state: save.state, rev: save.rev });
});
