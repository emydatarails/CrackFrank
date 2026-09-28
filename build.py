#!/usr/bin/env python3
"""Concatenate sources into dist/index.html (full standalone page) and dist/artifact.html (body-only for Artifact publish)."""
import glob, os, re
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
def rd(p):
    return open(p, encoding='utf-8').read() if os.path.exists(p) else ''
xp = rd(os.path.join(src, 'xp.css'))
# drop the DOS font-face (external woff files we don't ship)
xp = re.sub(r'@font-face\{[^}]*\}', '', xp)  # all external woff files (we don't ship them)
css = xp + '\n' + rd(os.path.join(src, 'core.css')) + '\n' + '\n'.join(rd(p) for p in sorted(glob.glob(os.path.join(src, 'apps', '*.css'))))
order = ['core.js', 'icons.js', 'fs.js', 'assets.js', 'sounds.js']
js = '\n;\n'.join(rd(os.path.join(src, f)) for f in order)
js += '\n;\n' + '\n;\n'.join(rd(p) for p in sorted(glob.glob(os.path.join(src, 'apps', '*.js'))))
js += '\n;\n' + rd(os.path.join(src, 'boot.js'))
js = js.replace('</script', '<\\/script')
title = "Frank's Computer"
import json, html as _h
cfg_path = os.path.join(root, 'config.json')
cfg = json.load(open(cfg_path, encoding='utf-8')) if os.path.exists(cfg_path) else {}
game_cfg = {k: v for k, v in cfg.items() if k in ('siteUrl', 'ctaUrl', 'ctaLabel', 'seriesUrl')}
meta = cfg.get('meta', {})
page_url = meta.get('url', '')
# on Vercel, fall back to the production domain so og:image / og:url are absolute
if not page_url and os.environ.get('VERCEL_PROJECT_PRODUCTION_URL'):
    page_url = 'https://' + os.environ['VERCEL_PROJECT_PRODUCTION_URL'] + '/'
desc = meta.get('description', "Frank, Packa Corp's FP&A manager, is missing. The Board meets at 9:00 AM. All you have is his computer.")
og_img = meta.get('image', 'og-image.png')
if page_url and not og_img.startswith('http'): og_img = page_url.rstrip('/') + '/' + og_img
FAV = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cpath d='M32 3 56 16v28L32 61 8 44V16z' fill='%23a33a1e'/%3E%3Cpath d='M32 3 56 16 32 29 8 16z' fill='%23c9582f'/%3E%3Cpath d='M32 29v32L8 44V16z' fill='%237e2a14'/%3E%3C/svg%3E"
e = lambda x: _h.escape(x, quote=True)
head_extra = (f'<meta name="description" content="{e(desc)}">'
              f'<meta property="og:type" content="website"><meta property="og:title" content="{e(title)}">'
              f'<meta property="og:description" content="{e(desc)}"><meta property="og:image" content="{e(og_img)}">'
              + (f'<meta property="og:url" content="{e(page_url)}">' if page_url else '') +
              f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title)}">'
              f'<meta name="twitter:description" content="{e(desc)}"><meta name="twitter:image" content="{e(og_img)}">'
              f'<link rel="icon" href="{FAV}"><meta name="theme-color" content="#245edb">')
cfg_js = f'<script>window.FR_CONFIG = {json.dumps(game_cfg)};</script>\n' if game_cfg else ''

body = f'<div id="fr-root"></div>\n{cfg_js}<style>\n{css}\n</style>\n<script>\n{js}\n</script>\n'
os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
full = f'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>{head_extra}</head><body>\n{body}</body></html>\n'
open(os.path.join(root, 'dist', 'index.html'), 'w', encoding='utf-8').write(full)
open(os.path.join(root, 'dist', 'artifact.html'), 'w', encoding='utf-8').write(f'<title>{title}</title>\n' + body)
import shutil
pub = os.path.join(root, 'public')
if os.path.isdir(pub):
    for f in os.listdir(pub): shutil.copy2(os.path.join(pub, f), os.path.join(root, 'dist', f))
print('built', len(full) // 1024, 'KB')
