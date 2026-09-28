// Scoring rules (src/score_rules.js) and the scoreboard API (api/scores.js + board updates on save/register).
// No dependencies: node test/score_test.js
const R = require('../src/score_rules.js');
const start = require('./local_server');
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; };
const solvedUpTo = n => Object.fromEntries(R.ITEMS.slice(0, n).map((id, i) => [id, 1000 + i]));
const st = (n, hints = {}, wrong = 0, extra = {}) => ({ solved: solvedUpTo(n), hintsUsed: hints, wrong, flags: {}, playMs: 60000 * n, ...extra });

/* ---------- rules ---------- */
ok(R.calc({}).score === 0 && R.calc(null).score === 0, 'empty / missing state scores 0');
ok(R.calc(st(3)).score === 3000, '3 riddles, no hints, no wrong = 3,000');
ok(R.calc(st(3, {}, 4)).score === 2800, 'each wrong answer −50');
ok(R.calc(st(10, { login: 3, version: 3, unlock: 3, ebitda: 1 })).score === 10000, '10 hints are free');
const c13 = R.calc(st(10, { login: 3, version: 3, unlock: 3, ebitda: 3, dscr: 1 }));
ok(c13.hints === 13 && c13.paidHints === 3 && c13.score === 9700 && c13.freeLeft === 0, 'hints 11–13 cost −100 each');
ok(R.calc(st(2, { login: 99, bogus: 3 })).hints === 3, 'hints capped at 3 per item, unknown items ignored');
ok(R.calc({ solved: { hack: 1, login: 1 } }).solved === 1, 'only real checklist items count as solved');
ok(R.calc(st(1, {}, 1000)).score === 0, 'score never goes below 0');
ok(R.calc(st(0, {}, 'x')).wrong === 0 && R.calc(st(0, {}, -5)).wrong === 0, 'nonsense wrong counts are 0');
ok(R.calc(st(10)).finished && !R.calc(st(9)).finished, 'finished = all 10 done');
ok(R.rankValue({ score: 5000, timeMs: 600000 }) > R.rankValue({ score: 5000, timeMs: 900000 }), 'tie on score: faster ranks higher');
ok(R.rankValue({ score: 5000, timeMs: 9e12 }) > R.rankValue({ score: 4950, timeMs: 0 }), 'more points always beats time');

/* ---------- API ---------- */
(async () => {
  const server = await start(0), base = `http://localhost:${server.address().port}`;
  const browser = ip => {
    let cookie = '';
    return async (path, method = 'GET', body) => {
      const r = await fetch(base + '/api/' + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), 'x-real-ip': ip, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
      const set = r.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
      return { status: r.status, data: await r.json().catch(() => ({})) };
    };
  };
  const anon = browser('9.9.9.9');
  let r = await anon('scores'); ok(r.status === 200 && r.data.top.length === 0 && r.data.me === null && r.data.rules.freeHints === 10, 'empty board, rules published');

  const a = browser('1.0.0.1'), b = browser('1.0.0.2'), c = browser('1.0.0.3');
  await a('register', 'POST', { username: 'Alice', password: 'alice-pw', state: st(2) });   // guest progress carried in
  await b('register', 'POST', { username: 'Bob', password: 'bob-pw1' });
  await c('register', 'POST', { username: 'Cara', password: 'cara-pw' });
  r = await anon('scores'); ok(r.data.top.length === 1 && r.data.top[0].name === 'Alice' && r.data.top[0].score === 2000, 'registering with progress puts the player on the board');
  ok(r.data.players === 1, 'players with nothing solved are not on the board');

  await b('save', 'PUT', { state: st(5, {}, 2), rev: 0 });                      // 5000 − 100 = 4900
  await c('save', 'PUT', { state: st(5, {}, 2, { playMs: 1000 }), rev: 0 });    // same score, faster
  r = await anon('scores');
  ok(r.data.top.map(e => e.name).join() === 'Cara,Bob,Alice', 'ranked by score, ties by time');
  ok(r.data.top[1].score === 4900 && r.data.top[1].solved === 5 && r.data.top[1].wrong === 2 && r.data.top[1].rank === 2, 'entry carries score, riddles, wrong, rank');

  r = await b('scores'); ok(r.data.me && r.data.me.name === 'Bob' && r.data.me.rank === 2 && r.data.me.inTop, 'signed-in player gets their own row and rank');

  await a('save', 'PUT', { state: st(10, { login: 3, version: 3, unlock: 3, ebitda: 3 }, 1, { finishedAt: 5, finishPlayMs: 3600000 }), rev: 1 });
  r = await anon('scores'); ok(r.data.top[0].name === 'Alice' && r.data.top[0].score === 9750 && r.data.top[0].finished, 'finishing: 10,000 − 2 paid hints − 1 wrong = 9,750, marked finished');

  // replaying after finishing doesn't change the entry
  await a('save', 'PUT', { state: st(0), rev: 2 });
  await a('save', 'PUT', { state: st(10, {}, 0, { finishedAt: 9, finishPlayMs: 60000 }), rev: 3 });
  r = await a('scores'); ok(r.data.me.score === 9750 && r.data.me.rank === 1, 'first finished game counts; a replay does not change it');

  // start over before finishing: off the board
  await b('save', 'PUT', { state: st(0), rev: 1 });
  r = await b('scores'); ok(r.data.me === null && r.data.top.every(e => e.name !== 'Bob'), 'start over before finishing takes you off the board');
  await b('save', 'PUT', { state: st(1), rev: 2 });
  r = await b('scores'); ok(r.data.me && r.data.me.score === 1000, 'and you are back once you solve a riddle');

  // play-clock-only saves don't touch the board (cheap saves)
  const before = (await anon('scores')).data.top.find(e => e.name === 'Cara');
  await c('save', 'PUT', { state: st(5, {}, 2, { playMs: 999999 }), rev: 1 });
  const after = (await anon('scores')).data.top.find(e => e.name === 'Cara');
  ok(before.timeMs === after.timeMs, 'a save that only moves the play clock leaves the board alone');

  server.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
