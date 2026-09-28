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
