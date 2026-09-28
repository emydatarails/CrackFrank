// POST /api/logout → ends the session on the server and clears the cookie.
const L = require('./_lib');

module.exports = L.handler(['POST'], async (req, res) => {
  await L.endSession(req, res);
  L.send(res, 200, { ok: true });
});
