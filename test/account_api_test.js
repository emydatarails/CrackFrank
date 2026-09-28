// Player-account API tests (api/*.js) against the in-memory Redis. No dependencies: node test/account_api_test.js
const start = require('./local_server');
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; };

(async () => {
  const server = await start(0), base = `http://localhost:${server.address().port}`;
  // a tiny cookie jar per "browser"
  const browser = (ip) => {
    let cookie = '';
    return async (path, method = 'GET', body, headers = {}) => {
      const r = await fetch(base + '/api/' + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), 'x-real-ip': ip, ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
      const set = r.headers.get('set-cookie');
      if (set) { const v = set.split(';')[0]; cookie = /=$/.test(v) ? '' : v; }
      return { status: r.status, data: await r.json().catch(() => ({})), set };
    };
  };
  const a = browser('1.1.1.1'), b = browser('2.2.2.2');
  const state = (n) => ({ solved: { login: 1, version: 2 }, flags: { oe: { moved: {} } }, hintsUsed: { version: 1 }, playMs: n });

  let r = await a('me'); ok(r.status === 401, 'signed out: /me is 401');
  r = await a('register', 'POST', { username: 'ab', password: 'secret1' }); ok(r.status === 400 && r.data.error === 'username', 'short name rejected');
  r = await a('register', 'POST', { username: 'Emily', password: '123' }); ok(r.status === 400 && r.data.error === 'password', 'short password rejected');
  r = await a('register', 'POST', { username: 'Emily', password: 'secret1', state: state(5000) });
  ok(r.status === 201 && r.data.user === 'Emily' && r.data.rev === 1 && r.data.state.playMs === 5000, 'register carries guest progress up');
  ok(/HttpOnly/.test(r.set) && /SameSite=Lax/.test(r.set) && !/Secure/.test(r.set), 'session cookie is HttpOnly + SameSite (no Secure on localhost)');
  r = await a('me'); ok(r.status === 200 && r.data.user === 'Emily' && r.data.state.solved.version === 2, '/me returns the player and save');
  r = await b('register', 'POST', { username: 'emily', password: 'other12' }); ok(r.status === 409 && r.data.error === 'taken', 'names are unique, case-insensitive');

  r = await b('login', 'POST', { username: 'EMILY', password: 'wrong!!' }); ok(r.status === 401 && r.data.error === 'credentials', 'wrong password rejected');
  r = await b('login', 'POST', { username: 'nobody', password: 'secret1' }); ok(r.status === 401 && r.data.error === 'credentials', 'unknown player gets the same message');
  r = await b('login', 'POST', { username: 'EMILY', password: 'secret1' }); ok(r.status === 200 && r.data.state.playMs === 5000 && r.data.rev === 1, 'sign in from another browser returns the save');

  r = await b('save', 'PUT', { state: state(9000), rev: 1 }); ok(r.status === 200 && r.data.rev === 2, 'save bumps the revision');
  r = await a('save', 'PUT', { state: state(6000), rev: 1 }); ok(r.status === 409 && r.data.rev === 2, 'stale browser gets 409, not an overwrite');
  r = await a('me'); ok(r.data.state.playMs === 9000 && r.data.rev === 2, 'newest save wins');
  r = await a('save', 'PUT', { state: { nope: 1 }, rev: 2 }); ok(r.status === 400, 'malformed state rejected');
  r = await a('save', 'PUT', { state: { solved: {}, pad: 'x'.repeat(200000) }, rev: 2 }); ok(r.status === 413, 'oversized save rejected');
  r = await a('save', 'POST', { state: state(1), rev: 2 }); ok(r.status === 405, 'wrong method rejected');
  r = await a('save', 'PUT', undefined, { 'Content-Type': 'text/plain' }); ok(r.status === 415, 'non-JSON write rejected (no cross-site form posts)');

  r = await b('logout', 'POST', {}); ok(r.status === 200 && /Max-Age=0/.test(r.set), 'logout clears the cookie');
  r = await b('me'); ok(r.status === 401, 'signed out after logout');
  r = await b('save', 'PUT', { state: state(1), rev: 99 }); ok(r.status === 401, 'save needs a session');
  r = await a('me'); ok(r.status === 200, "other browser's session is unaffected");

  const c = browser('3.3.3.3');
  let last; for (let i = 0; i < 11; i++) last = await c('login', 'POST', { username: 'Emily', password: 'guess' + i });
  ok(last.status === 429, 'password guessing is rate limited per player');

  server.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
