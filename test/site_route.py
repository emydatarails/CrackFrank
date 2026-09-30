"""packacorp.com for the browser tests: a Playwright route that serves the local copies of the site's pages in
test/site/ AND the files those pages load (css/style.css, js/main.js, images/*), so the company site in Frank's IE looks
like the live one. The tests can't reach the live www.packacorp.com (the sandbox has no route to it), and serving only
the .html pages used to 404 every stylesheet and image: unstyled pages in every test run (round 5, P1).

    from site_route import site; ctx.route(SITE_RE, site)
"""
import html, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE_DIR = os.path.join(ROOT, 'test', 'site')
SITE_RE = re.compile(r'https?://(www\.)?packacorp\.com/.*')
PAGES = {'/': 'home.html', '/index.html': 'home.html'}
TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml'}
# the real Packa logo (the same files the game embeds)
LOGOS = {'images/logo.svg': 'packa-logo.svg', 'images/favicon.svg': 'packa-logo.svg', 'images/logo-white.svg': 'packa-logo-white.svg'}


def photo(name):
    """A stand-in for one of the site's pictures (warehouse-hero.jpg, map-placeholder.svg …): a 4:3 SVG with the photo's name on it."""
    label = html.escape(re.sub(r'[-_]+', ' ', os.path.splitext(os.path.basename(name))[0]))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">'
            f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9b79c"/><stop offset="1" stop-color="#8a6d4b"/></linearGradient></defs>'
            f'<rect width="800" height="600" fill="url(#g)"/><rect x="60" y="300" width="680" height="220" fill="#6b4f33" opacity=".55"/>'
            f'<text x="400" y="560" font-family="Arial" font-size="30" fill="#fff" text-anchor="middle">{label}</text></svg>')


def asset(path):
    """(status, content type, body bytes) for a path on www.packacorp.com."""
    rel = PAGES.get(path, path.lstrip('/'))
    if rel in LOGOS:
        return 200, TYPES['.svg'], open(os.path.join(ROOT, 'src', LOGOS[rel]), 'rb').read()
    f = os.path.normpath(os.path.join(SITE_DIR, rel))
    if f.startswith(SITE_DIR + os.sep) and os.path.isfile(f) and os.path.splitext(f)[1] in TYPES:
        return 200, TYPES[os.path.splitext(f)[1]], open(f, 'rb').read()
    if rel.startswith('images/') and re.search(r'\.(jpe?g|png|gif|webp|svg)$', rel, re.I):   # (map-placeholder.svg too)
        return 200, TYPES['.svg'], photo(rel).encode()
    return 404, TYPES['.html'], b'<h1>404 Not Found</h1>'


def site(route):
    path = re.sub(r'^https?://[^/]+', '', route.request.url).split('?')[0].split('#')[0] or '/'
    status, ctype, body = asset(path)
    route.fulfill(status=status, content_type=ctype, body=body)
