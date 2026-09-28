# Frank's Computer

A Windows XP–style browser puzzle game for the Datarails web series **"Frank Is Missing"**.

Frank Warmington, FP&A Manager at Packa Corp, has vanished. The Board meets at 9:00 AM, and the bank releases a
$4.0M survival package only if the Board Pack is complete and true. The player sits at Frank's computer, cracks
his password and works through his email, Excel files and folders to assemble the pack. Hints come from
"Datarails FinanceOS" (the joke: Packa doesn't have it). The clues also point to the live site www.packacorp.com.

The game is one self-contained HTML file (about 3.4 MB). All images and sounds are embedded, it has no runtime
dependencies, and it makes no network calls except the in-game Internet Explorer, which frames packacorp.com.

## Repository layout

| Path | What it is |
|---|---|
| `src/` | Game source: `core.js` (window manager, state, dialogs), `fs.js` (virtual file system), `boot.js` (intro, login, desktop, checklist, ending, config defaults), `apps/*.js|css` (Excel, Outlook Express, Explorer, IE, Notepad …), `assets.js` (embedded images), `sounds.js` (embedded Windows XP sounds), `xp.css` (XP.css 0.2.6). |
| `build.py` | Concatenates `src/` into `dist/index.html` and copies `public/` next to it. Python 3, standard library only. |
| `config.json` | Site links, end-screen CTA and share-card metadata, injected at build time. |
| `public/` | Static files copied into the build (`og-image.png` share card). |
| `dist/` | A prebuilt copy of the game (Vercel rebuilds it on every deploy). |
| `vercel.json` | Vercel build settings (build command, `dist/` output, cache headers). |
| `.github/workflows/ci.yml` | Builds and runs the spreadsheet-engine tests on every push and PR. |
| `test/` | `excel_engine_test.js` (node, no deps) and `play.py` (full Playwright playthrough; the Packa site pages it needs are in `test/site/`). |
| `tools/` | `make_sounds.py` + the Windows XP sound pack, to regenerate `src/sounds.js`. |
| `docs/` | `SPEC.md` (the design spec; later sections win), `API.md` (the `window.FR` API every app uses), `CANON_DECISIONS.md` (numbers and story facts that must stay consistent), `PACKA_SITE_GAME_CLUES.md` (what must exist on packacorp.com), `PLAYTEST_FPA.md`. |

## Build and run locally

```bash
python3 build.py            # -> dist/index.html
open dist/index.html        # or: python3 -m http.server -d dist 8000
```

For testing only: `dist/index.html?dev=1` skips the intro and login, and `?dev=1&solve=<itemId>` marks every
checklist item up to that id as solved. The checklist order is login, version, unlock, ebitda, dscr, cash,
bridge, forboard, send, frank. These shortcuts work only on `file://` and `localhost`, never on the public site.

## Configuration (`config.json`)

| Key | Meaning |
|---|---|
| `siteUrl` | The Packa Corp website the in-game Internet Explorer opens (clue source). Default `https://www.packacorp.com/`. |
| `ctaUrl`, `ctaLabel` | The main button on the ending screen. |
| `seriesUrl` | Optional. When set, adds a "Watch Frank Is Missing" button on the ending screen. |
| `meta.url` | The public URL of the game. Set it so the share card (`og:image`, `og:url`) uses absolute links. |
| `meta.description`, `meta.image` | Share-card text and image (image path relative to the site root, or a full URL). |

Rebuild after editing (`python3 build.py`). A push to `main` rebuilds and redeploys on Vercel automatically.

## Deploy (Vercel)

The repository is ready for Vercel; `vercel.json` holds the settings, so nothing needs to be typed in the dashboard.

1. In Vercel, **Add New → Project**, import `emydatarails/CrackFrank` and keep the detected settings
   (Framework preset: Other). Vercel runs `python3 build.py && node test/excel_engine_test.js` and serves `dist/`.
2. Every push to `main` deploys to production; every other branch or PR gets a preview URL.
3. Share card: if `meta.url` in `config.json` is empty, the build uses Vercel's production domain
   (`VERCEL_PROJECT_PRODUCTION_URL`) so `og:image` and `og:url` are absolute. Set `meta.url` once you have a
   final custom domain.
4. Optional custom domain (e.g. `game.packacorp.com`): add it under **Project → Settings → Domains** and create
   the DNS record Vercel shows you (a `CNAME` to Vercel for a subdomain).

`.vercelignore` keeps `tools/` (the sound pack), `docs/` and the Playwright fixtures out of the upload.
`.github/workflows/ci.yml` builds and runs the spreadsheet-engine tests on every push and PR.

### The in-game browser and packacorp.com

The in-game Internet Explorer shows packacorp.com in an iframe. If the site sends `X-Frame-Options: DENY/SAMEORIGIN`,
or a `Content-Security-Policy` with `frame-ancestors` that doesn't include the game's domain, the page won't load
inside the game. Players can still open the site in another tab (the intro says so). For the best experience,
allow the game's domain in the Packa site's `frame-ancestors`. The website clue changes the puzzles depend on are
listed in `docs/PACKA_SITE_GAME_CLUES.md`.

## Tests

```bash
node test/excel_engine_test.js           # spreadsheet engine + answer checks (no dependencies)
pip install playwright && python3 test/play.py   # full honest playthrough in headless Chromium
```

## Sounds

`src/sounds.js` embeds the Windows XP sound pack supplied by the campaign team (`tools/xpsounds/`). To change
which sample plays for which event, edit `MAP` in `tools/make_sounds.py`, then run it (needs ffmpeg) and rebuild.

## Answers (spoilers, for the team)

sedalia1958 → v5_FINAL_USE_THIS → Board copy password 4406 → EBITDA row 12 = 3,130 → Bank.zip 3130, DSCR 1.25x →
hidden REAL VERSION, first week below $250K = week 5 → bridge freight −60, other −40 → FOR_THE_BOARD 18243 →
reply to Diane and send → Kristians Bušārs is on Frank's team.
