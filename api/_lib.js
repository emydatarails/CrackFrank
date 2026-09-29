// Shared helpers for the player-account API (Vercel Node functions). No npm dependencies:
// Redis is Upstash's REST API over fetch, passwords are scrypt from node:crypto.
// Files starting with "_" are not deployed as their own endpoint.
const crypto = require('crypto');
const RULES = require('../src/score_rules.js');   // the same scoring code the game runs

const SESSION_DAYS = 30;
const COOKIE = 'fc_session';
const MAX_SAVE = 1024 * 1024;          // bytes of JSON; a finished game is ~3 KB, Paint pictures (src/apps/paint.js) add up to ~600 KB
const USER_RE = /^[A-Za-z0-9_.-]{3,20}$/;

/* ---------- Redis (Upstash REST) ---------- */
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd.map(String)),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('redis: ' + (j.error || r.status));
  return j.result;
}

const K = {
  user: u => `fc:user:${u}`,
  save: u => `fc:save:${u}`,
  sess: h => `fc:sess:${h}`,
  rate: (kind, id) => `fc:rl:${kind}:${id}`,
  board: 'fc:board',            // sorted set: player id → RULES.rankValue
  boardInfo: 'fc:board:info',   // hash: player id → {name, score, solved, hints, wrong, finished, timeMs, at}
};

/* ---------- passwords + sessions ---------- */
const scrypt = (pw, salt) => new Promise((ok, no) => crypto.scrypt(pw, salt, 64, (e, k) => e ? no(e) : ok(k)));

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: (await scrypt(pw, salt)).toString('hex') };
}
async function checkPassword(pw, rec) {
  const want = Buffer.from(rec.hash, 'hex');
  const got = await scrypt(pw, rec.salt);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

// the cookie holds a random token; Redis only ever sees its SHA-256
const tokenHash = t => crypto.createHash('sha256').update(t).digest('hex');

async function createSession(res, req, username) {
  const token = crypto.randomBytes(32).toString('hex');
  await redis('SET', K.sess(tokenHash(token)), username, 'EX', SESSION_DAYS * 86400);
  setCookie(res, req, token, SESSION_DAYS * 86400);
}

async function currentUser(req) {
  const t = cookies(req)[COOKIE];
  if (!t || !/^[0-9a-f]{64}$/.test(t)) return null;
  return (await redis('GET', K.sess(tokenHash(t)))) || null;
}

async function endSession(req, res) {
  const t = cookies(req)[COOKIE];
  if (t && /^[0-9a-f]{64}$/.test(t)) await redis('DEL', K.sess(tokenHash(t)));
  setCookie(res, req, '', 0);
}

/* ---------- rate limiting (fixed window) ---------- */
async function limited(kind, id, max, windowSec) {
  const k = K.rate(kind, id);
  const n = await redis('INCR', k);
  if (n === 1) await redis('EXPIRE', k, windowSec);
  return n > max;
}

/* ---------- HTTP ---------- */
function cookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function setCookie(res, req, value, maxAge) {
  const host = String(req.headers.host || '');
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (local ? '' : '; Secure'));
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function clientIp(req) {
  return String(req.headers['x-real-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'unknown').trim();
}

// Vercel parses JSON into req.body; a plain Node server (the local test server) doesn't
async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > MAX_SAVE * 2) throw new Error('too large'); }
  return raw ? JSON.parse(raw) : {};
}

// wraps a handler: method check, JSON-only writes (blocks cross-site form posts), storage check, errors
function handler(methods, fn) {
  return async (req, res) => {
    if (!methods.includes(req.method)) { res.setHeader('Allow', methods.join(', ')); return send(res, 405, { error: 'method' }); }
    if (!REDIS_URL || !REDIS_TOKEN) return send(res, 503, { error: 'storage', message: 'Player accounts are not set up on this server.' });
    if (req.method !== 'GET' && !/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return send(res, 415, { error: 'json' });
    let body = {};
    if (req.method !== 'GET') { try { body = await readBody(req); } catch (e) { return send(res, 400, { error: 'body' }); } }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'body' });
    try { await fn(req, res, body); } catch (e) { console.error(e); send(res, 500, { error: 'server', message: 'Something went wrong. Try again in a moment.' }); }
  };
}

async function loadSave(username) {
  const raw = await redis('GET', K.save(username));
  if (!raw) return { state: null, rev: 0 };
  try { const s = JSON.parse(raw); return { state: s.state || null, rev: s.rev || 0 }; } catch (e) { return { state: null, rev: 0 }; }
}

/* ---------- scoreboard ---------- */
// Called after every save. The board follows the player's game until they finish it once; that first finished
// game is their scoreboard entry for good (a replay with the answers known doesn't count).
async function updateBoard(id, prevState, state) {
  const next = RULES.calc(state);
  if (prevState) {
    const prev = RULES.calc(prevState);
    if (prev.score === next.score && prev.solved === next.solved && prev.hints === next.hints && prev.wrong === next.wrong) return;
  }
  const raw = await redis('HGET', K.boardInfo, id);
  const cur = raw ? JSON.parse(raw) : null;
  if (cur && cur.finished) return;
  if (!next.solved) {                       // "Start over" before finishing: off the board until they play again
    if (cur) { await redis('ZREM', K.board, id); await redis('HDEL', K.boardInfo, id); }
    return;
  }
  const user = JSON.parse((await redis('GET', K.user(id))) || '{}');
  const entry = { name: user.name || id, score: next.score, solved: next.solved, hints: next.hints, wrong: next.wrong, finished: next.finished, timeMs: next.timeMs, at: Date.now() };
  await redis('HSET', K.boardInfo, id, JSON.stringify(entry));
  await redis('ZADD', K.board, RULES.rankValue(next), id);
}

module.exports = {
  RULES, updateBoard,
  redis, K, USER_RE, MAX_SAVE, hashPassword, checkPassword, createSession, currentUser, endSession,
  limited, send, clientIp, handler, loadSave,
};
