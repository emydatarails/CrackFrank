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
// bonus requests and Easter eggs: points on top of the main score, from the table only
const B = id => ({ [id]: { solvedAt: 123, pts: 99999 } });
ok(R.calc(st(3, {}, 0, { bonus: B('tom_comm') })).score === 3000 + R.BONUS.tom_comm, 'a solved bonus request adds its table points on top');
ok(R.calc(st(3, {}, 0, { bonus: B('tom_comm') })).bonus === R.BONUS.tom_comm && R.calc(st(3, {}, 0, { bonus: B('tom_comm') })).main === 3000, 'calc returns main and bonus separately');
ok(R.calc(st(3, {}, 0, { bonus: { hack: { solvedAt: 1, pts: 5000 }, __proto__x: 1 } })).bonus === 0, 'unknown bonus ids are ignored');
ok(R.calc(st(3, {}, 0, { bonus: { tom_comm: true, mum_fx: { solvedAt: 0 }, dale_var: { solvedAt: 'x' }, steve_margin: null } })).bonus === 0, 'malformed bonus entries count as zero');
ok(R.calc(st(3, {}, 0, { bonus: [1, 2] })).bonus === 0 && R.calc(st(3, {}, 0, { bonus: 'x' })).bonus === 0, 'a bonus that is not an object counts as zero');
ok(R.calc(st(1, {}, 1000, { bonus: B('vending_ci') })).score === R.BONUS.vending_ci, 'penalties floor the main score at 0; bonus is added after the floor');
const allB = Object.fromEntries(Object.keys(R.BONUS).map(id => [id, { solvedAt: 5 }]));
const allEggs = Object.fromEntries(R.EGGS.map((id, i) => [id, 100 + i]));
const perfect = R.calc(st(10, {}, 0, { bonus: allB, eggs: allEggs }));
ok(perfect.score === 10000 + R.BONUS_MAX && perfect.score > 10000 && perfect.bonusDone === perfect.bonusTotal, `a perfect game with every bonus = 10,000 + ${R.BONUS_MAX} = ${perfect.score}`);
ok(Object.values(R.BONUS).every(v => v >= 100 && v <= 300), 'every bonus is worth +100 to +300');
// (round 5, P3) Easter eggs: +PER_EGG each as it's found (was 150 for all 15 or nothing); the max is unchanged
ok(R.PER_EGG === 10 && R.EGGS.length === 15 && R.EGGS_MAX === 150 && R.REQUESTS_MAX === 1300 && R.BONUS_MAX === 1450, `eggs: +${R.PER_EGG} each × ${R.EGGS.length} = ${R.EGGS_MAX}; requests ${R.REQUESTS_MAX}; bonus max ${R.BONUS_MAX}`);
const e4 = R.calc(st(10, {}, 4, { eggs: { resign: 1, diary: 2, xl_hidden: 3, calc0003: 4 } }));
ok(e4.eggs === 4 && e4.eggPts === 40 && e4.bonus === 40 && e4.score === 9840, `4 eggs found = +40 (${e4.score})`);
ok(R.calc(st(1, {}, 0, { eggs: { bogus: 5, __proto__x: 5, diary: 0, resign: 'x', clock: -3 } })).eggs === 0, 'unknown egg ids, and eggs without a time, count as zero');
ok(R.calc(st(1, {}, 0, { eggs: [1, 2] })).eggs === 0 && R.calc(st(1, {}, 0, { eggs: 'x' })).eggs === 0, 'eggs that are not an object count as zero');
ok(R.calc(st(1, {}, 0, { bonus: { eggs: { solvedAt: 5 } }, eggs: allEggs })).bonus === 150, "an old save's all-eggs bonus (bonus.eggs) isn't counted twice: the 15 eggs are +150");
ok(R.calc(st(1, {}, 1000, { eggs: { diary: 1 } })).score === 10, 'egg points are added after the floor too');
{ // the same 15 ids as the game's own list (src/apps/xp_eggs.js)
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'apps', 'xp_eggs.js'), 'utf8');
  const block = src.slice(src.indexOf('const EGGS = ['), src.indexOf('];', src.indexOf('const EGGS = [')));
  const ids = [...block.matchAll(/\[\s*'([a-z0-9_]+)'/g)].map(m => m[1]);
  ok(ids.length === 15 && ids.join() === R.EGGS.join(), `score_rules EGGS = xp_eggs.js EGGS (${ids.length} ids)`);
}
ok(R.rankValue({ score: 10100, timeMs: 9e12 }) > R.rankValue({ score: 10000, timeMs: 0 }), 'bonus points count for the rank');
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

  // a save that only adds a bonus request updates the board (score and bonus)
  r = await c('scores'); const cara0 = r.data.me;
  await c('save', 'PUT', { state: st(5, {}, 2, { playMs: 1000, bonus: { steve_margin: { solvedAt: 7, pts: 200 } } }), rev: 1 });
  r = await c('scores');
  ok(r.data.me.score === cara0.score + R.BONUS.steve_margin && r.data.me.bonus === R.BONUS.steve_margin, `a bonus-only save updates the board: ${cara0.score} → ${r.data.me.score} (bonus ${r.data.me.bonus})`);
  ok(r.data.top[0].name === 'Alice' && r.data.top.find(e => e.name === 'Cara').bonus === R.BONUS.steve_margin && r.data.top.find(e => e.name === 'Bob').bonus === 0, 'the board lists each player\'s bonus (0 without)');
  ok(r.data.rules.bonus && r.data.rules.bonus.steve_margin === R.BONUS.steve_margin, 'the bonus table is published with the rules');
  // a bogus bonus id in a save changes nothing
  await c('save', 'PUT', { state: st(5, {}, 2, { playMs: 1000, bonus: { steve_margin: { solvedAt: 7 }, free_money: { solvedAt: 1, pts: 1e6 } } }), rev: 2 });
  r = await c('scores'); ok(r.data.me.score === cara0.score + R.BONUS.steve_margin, 'a made-up bonus id in the save earns nothing on the board');
  // a replay's bonus never changes the entry of the first finished game
  await a('save', 'PUT', { state: st(10, {}, 0, { finishedAt: 9, finishPlayMs: 60000, bonus: allB }), rev: 4 });
  r = await a('scores'); ok(r.data.me.score === 9750 && r.data.me.bonus === 0 && r.data.me.game === 5, 'bonus earned in a replay does not change the first finished game\'s entry');

  // (F4, round 4) ONE SCORE: the first finished game keeps counting after the ending, in the same game
  const d = browser('1.0.0.4');
  await d('register', 'POST', { username: 'Dana', password: 'dana-pw' });
  const fin = extra => st(10, {}, 4, { finishedAt: 777, finishPlayMs: 3474000, ...extra });
  const b8 = Object.fromEntries(['rotary_be', 'brenda_disc', 'vending_ci', 'dale_var', 'steve_margin', 'it_audit', 'intern_accrual', 'mum_fx'].map(id => [id, { solvedAt: 3 }]));
  await d('save', 'PUT', { state: fin({ bonus: b8 }), rev: 0 });
  const game = R.calc(fin({ bonus: b8 }));
  r = await d('scores');
  ok(game.score === 10950 && r.data.me.score === game.score && r.data.me.bonus === 1150, `the round-4 player's game: the board shows what the game shows (${r.data.me.score} = ${game.score}, incl. +${r.data.me.bonus})`);
  ok(r.data.me.game === 777 && r.data.me.finished, 'the entry knows which game it is (finishedAt)');
  const withEgg = { ...b8, tom_comm: { solvedAt: 9 } };
  await d('save', 'PUT', { state: fin({ bonus: withEgg, eggs: { diary: 11, resign: 12, calc0003: 13 } }), rev: 1 });
  r = await d('scores'); ok(r.data.me.score === R.calc(fin({ bonus: withEgg, eggs: { diary: 11, resign: 12, calc0003: 13 } })).score && r.data.me.score === 10950 + R.BONUS.tom_comm + 3 * R.PER_EGG, `a bonus request and 3 Easter eggs after the ending still count: ${r.data.me.score}`);
  ok(r.data.rules.perEgg === R.PER_EGG && r.data.rules.eggs === 15 && r.data.rules.bonusMax === 1450, '/api/scores sends the egg rule');
  await d('save', 'PUT', { state: fin({ bonus: withEgg, eggs: allEggs }), rev: 2 });
  r = await d('scores'); ok(r.data.me.score === 10950 + R.BONUS.tom_comm + 150, `all 15 eggs: +150 on the board (${r.data.me.score})`);
  await d('save', 'PUT', { state: fin({ bonus: withEgg, eggs: allEggs, wrong: 5 }), rev: 3 });
  r = await d('scores'); ok(r.data.me.score === R.calc(fin({ bonus: withEgg, eggs: allEggs, wrong: 5 })).score, 'a wrong guess after the ending (same game) shows on the board too: the numbers never drift apart');
  const locked = r.data.me.score;
  await d('save', 'PUT', { state: st(0), rev: 4 });
  await d('save', 'PUT', { state: st(10, {}, 0, { finishedAt: 888, finishPlayMs: 60000, bonus: allB }), rev: 5 });
  r = await d('scores'); ok(r.data.me.score === locked && r.data.me.game === 777, 'Start over + a perfect replay: the first finished game stays on the board');

  // an entry locked before entries remembered their game (no "game" field) follows the same game only
  const L = require('../api/_lib');
  const e = browser('1.0.0.5');
  await e('register', 'POST', { username: 'Eve', password: 'eve-pw1' });
  const legacyState = st(10, {}, 4, { finishedAt: 555, finishPlayMs: 3000000 });
  await e('save', 'PUT', { state: legacyState, rev: 0 });
  const info = JSON.parse(await L.redis('HGET', L.K.boardInfo, 'eve')); delete info.game; delete info.bonus;
  await L.redis('HSET', L.K.boardInfo, 'eve', JSON.stringify(info));
  await e('save', 'PUT', { state: { ...legacyState, bonus: b8 }, rev: 1 });
  r = await e('scores'); ok(r.data.me.score === 9800 + 1150 && r.data.me.game === 555, `an old entry (no game id) picks up bonus from the same game: ${r.data.me.score}`);
  const info2 = JSON.parse(await L.redis('HGET', L.K.boardInfo, 'eve')); delete info2.game;
  await L.redis('HSET', L.K.boardInfo, 'eve', JSON.stringify(info2));
  await e('save', 'PUT', { state: st(0), rev: 2 });
  await e('save', 'PUT', { state: st(10, {}, 0, { finishedAt: 999, finishPlayMs: 60000 }), rev: 3 });
  r = await e('scores'); ok(r.data.me.score === 10950, 'an old entry is not replaced by a replay');

  // play-clock-only saves don't touch the board (cheap saves)
  const before = (await anon('scores')).data.top.find(e => e.name === 'Cara');
  await c('save', 'PUT', { state: st(5, {}, 2, { playMs: 999999, bonus: { steve_margin: { solvedAt: 7 } } }), rev: 3 });
  const after = (await anon('scores')).data.top.find(e => e.name === 'Cara');
  ok(before.timeMs === after.timeMs, 'a save that only moves the play clock leaves the board alone');

  server.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
