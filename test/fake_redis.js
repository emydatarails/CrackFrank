// In-memory stand-in for Upstash's Redis REST API, for tests and local play. Intercepts fetch() calls to `url`.
module.exports = function install(url = 'http://fake-redis.test', token = 'test-token') {
  const db = new Map(), exp = new Map();
  const live = k => { if (exp.has(k) && exp.get(k) <= Date.now()) { db.delete(k); exp.delete(k); } return db.has(k); };
  const run = ([cmd, k, ...a]) => {
    switch (cmd.toUpperCase()) {
      case 'GET': return live(k) ? db.get(k) : null;
      case 'SET': {
        const up = a.slice(1).map(x => x.toUpperCase());
        if (up.includes('NX') && live(k)) return null;
        db.set(k, a[0]); exp.delete(k);
        const i = up.indexOf('EX'); if (i >= 0) exp.set(k, Date.now() + +a[i + 2] * 1000);
        return 'OK';
      }
      case 'DEL': { const had = live(k); db.delete(k); exp.delete(k); return had ? 1 : 0; }
      case 'INCR': { const n = (live(k) ? +db.get(k) : 0) + 1; db.set(k, String(n)); return n; }
      case 'EXPIRE': if (!live(k)) return 0; exp.set(k, Date.now() + +a[0] * 1000); return 1;
      // hashes and sorted sets (scoreboard): stored as Maps under the key
      case 'HGET': return live(k) && db.get(k).has(a[0]) ? db.get(k).get(a[0]) : null;
      case 'HMGET': return a.map(f => live(k) && db.get(k).has(f) ? db.get(k).get(f) : null);
      case 'HSET': { if (!live(k)) db.set(k, new Map()); const h = db.get(k), had = h.has(a[0]); h.set(a[0], a[1]); return had ? 0 : 1; }
      case 'HDEL': return live(k) && db.get(k).delete(a[0]) ? 1 : 0;
      case 'ZADD': { if (!live(k)) db.set(k, new Map()); const z = db.get(k), had = z.has(a[1]); z.set(a[1], +a[0]); return had ? 0 : 1; }
      case 'ZREM': return live(k) && db.get(k).delete(a[0]) ? 1 : 0;
      case 'ZCARD': return live(k) ? db.get(k).size : 0;
      case 'ZREVRANGE': case 'ZREVRANK': {
        // Redis order for ZREVRANGE: score high → low, ties by member high → low
        const sorted = live(k) ? [...db.get(k)].sort((x, y) => y[1] - x[1] || (y[0] > x[0] ? 1 : -1)).map(e => e[0]) : [];
        if (cmd.toUpperCase() === 'ZREVRANK') { const i = sorted.indexOf(a[0]); return i < 0 ? null : i; }
        const stop = +a[1] < 0 ? sorted.length + +a[1] : +a[1];
        return sorted.slice(+a[0], stop + 1);
      }
      default: throw new Error('fake redis: unsupported ' + cmd);
    }
  };
  const realFetch = global.fetch;
  global.fetch = async (u, opts = {}) => {
    if (String(u) !== url) return realFetch(u, opts);
    if (opts.headers.Authorization !== `Bearer ${token}`) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    try { return new Response(JSON.stringify({ result: run(JSON.parse(opts.body)) })); }
    catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 400 }); }
  };
  process.env.KV_REST_API_URL = url;
  process.env.KV_REST_API_TOKEN = token;
  return db;
};
