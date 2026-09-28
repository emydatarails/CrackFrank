// Local stand-in for Vercel: serves dist/ and runs api/*.js against the in-memory Redis.
// Usage: node test/local_server.js [port]   (then open http://localhost:8000/)
const http = require('http'), fs = require('fs'), path = require('path');
require('./fake_redis')();
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

function start(port = 8000) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const api = url.pathname.match(/^\/api\/([a-z]+)$/);
    if (api) {
      const f = path.join(ROOT, 'api', api[1] + '.js');
      if (!fs.existsSync(f)) { res.statusCode = 404; return res.end('{}'); }
      return require(f)(req, res);
    }
    const file = path.join(ROOT, 'dist', url.pathname === '/' ? 'index.html' : path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(path.join(ROOT, 'dist')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(port, () => ok(server)));
}
module.exports = start;
if (require.main === module) start(+process.argv[2] || 8000).then(s => console.log('http://localhost:' + s.address().port + '/'));
