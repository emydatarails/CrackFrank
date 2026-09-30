#!/usr/bin/env node
// Leaderboard admin for the live game ("Board Pack Rescue - Who Covered for Frank?"). Talks to the same Upstash Redis as
// the site, so it needs the site's KV_REST_API_URL / KV_REST_API_TOKEN. The easiest way to get them:
//   vercel env pull .env.local            (once; .env.local is git-ignored)
//   node --env-file=.env.local tools/board_admin.js list
// Commands:
//   list [n]          the top n entries (default 50) with their player names
//   hide <name>       take a player off the board and keep them off (their account and save stay; they can still play)
//   unhide <name>     let them back on (they reappear the next time their game saves)
//   hidden            the players that are hidden
const L = require('../api/_lib');

const fmtTime = ms => { const m = Math.floor((ms || 0) / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

async function list(n = 50) {
  const ids = (await L.redis('ZREVRANGE', L.K.board, 0, n - 1)) || [];
  const infos = ids.length ? await L.redis('HMGET', L.K.boardInfo, ...ids) : [];
  return ids.map((id, i) => ({ rank: i + 1, id, ...(infos[i] ? JSON.parse(infos[i]) : {}) }));
}
async function userRec(name) {
  const id = String(name || '').trim().toLowerCase();
  const raw = id && await L.redis('GET', L.K.user(id));
  if (!raw) throw new Error(`no player called "${name}"`);
  return { id, rec: JSON.parse(raw) };
}
async function hide(name) {
  const { id, rec } = await userRec(name);
  rec.hidden = Date.now();
  await L.redis('SET', L.K.user(id), JSON.stringify(rec));
  await L.redis('ZREM', L.K.board, id);
  await L.redis('HDEL', L.K.boardInfo, id);
  return rec.name || id;
}
async function unhide(name) {
  const { id, rec } = await userRec(name);
  delete rec.hidden;
  await L.redis('SET', L.K.user(id), JSON.stringify(rec));
  // put them back now from their save, rather than waiting for the next one
  const save = await L.loadSave(id);
  if (save.state) await L.updateBoard(id, null, save.state);
  return rec.name || id;
}
async function hidden() {
  const out = []; let cursor = '0';
  do {
    const [next, keys] = await L.redis('SCAN', cursor, 'MATCH', 'fc:user:*', 'COUNT', 500);
    for (const k of keys) { const r = JSON.parse((await L.redis('GET', k)) || '{}'); if (r.hidden) out.push(r.name || k.slice(8)); }
    cursor = String(next);
  } while (cursor !== '0');
  return out;
}

module.exports = { list, hide, unhide, hidden };

if (require.main === module) (async () => {
  if (!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)) {
    console.error('Needs KV_REST_API_URL and KV_REST_API_TOKEN. Run: vercel env pull .env.local, then node --env-file=.env.local tools/board_admin.js ' + process.argv.slice(2).join(' '));
    process.exit(2);
  }
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'list') for (const e of await list(+arg || 50)) console.log(`${String(e.rank).padStart(3)}. ${(e.name || e.id).padEnd(22)} ${String(e.score).padStart(6)}  ${e.solved}/10${e.finished ? ' done' : ''}  ${fmtTime(e.timeMs)}`);
  else if (cmd === 'hide' && arg) console.log('hidden from the board:', await hide(arg));
  else if (cmd === 'unhide' && arg) console.log('back on the board:', await unhide(arg));
  else if (cmd === 'hidden') console.log((await hidden()).join('\n') || '(nobody is hidden)');
  else { console.log('usage: tools/board_admin.js list [n] | hide <name> | unhide <name> | hidden'); process.exit(1); }
})().catch(e => { console.error(e.message); process.exit(1); });
