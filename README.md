# Frank's Computer

A Windows XP–style browser puzzle game for the Datarails web series **"Frank Is Missing"**.

Frank Warmington, FP&A Manager at Packa Corp, has vanished. The Board meets at 9:00 AM, and the bank releases a
$4.0M survival package only if the Board Pack is complete and true. The player sits at Frank's computer, cracks
his password and works through his email, Excel files and folders to assemble the pack. Hints come from
"Datarails FinanceOS" (the joke: Packa doesn't have it). The clues also point to the live site www.packacorp.com.

The game is one self-contained HTML file (about 3.4 MB). All images and sounds are embedded and it has no runtime
dependencies. Its only network calls are the in-game Internet Explorer, which frames packacorp.com, and the optional
player accounts (`/api/*`, see below).

## Repository layout

| Path | What it is |
|---|---|
| `src/` | Game source (the real Packa logo is `packa-logo.svg` / `packa-logo-white.svg`, embedded by `build.py`): `core.js` (window manager, state, dialogs), `fs.js` (virtual file system), `boot.js` (intro, login, desktop, checklist, ending, config defaults), `apps/*.js|css` (Excel, Outlook Express, Explorer, IE, Notepad …), `assets.js` (embedded images), `sounds.js` (embedded Windows XP sounds), `xp.css` (XP.css 0.2.6). |
| `src/account.js`, `src/account.css` | Player sign-in screen and cloud save (talks to `api/`). |
| `src/score_rules.js` | The scoring rules. One copy, used by the game and by the server. |
| `src/score.js`, `src/score.css` | Score in the checklist and ending, and the Live Standings page. |
| `api/` | Vercel functions for player accounts and the scoreboard: `register`, `login`, `logout`, `me`, `save`, `scores` (shared code in `_lib.js`). No npm dependencies. |
| `build.py` | Concatenates `src/` into `dist/index.html` and copies `public/` next to it. Python 3, standard library only. |
| `config.json` | Site links, end-screen CTA and share-card metadata, injected at build time. |
| `public/` | Static files copied into the build (`og-image.png` share card). |
| `dist/` | A prebuilt copy of the game (Vercel rebuilds it on every deploy). |
| `vercel.json` | Vercel build settings (build command, `dist/` output, cache headers). |
| `.github/workflows/ci.yml` | Builds and runs the spreadsheet-engine tests on every push and PR. |
| `test/` | `excel_engine_test.js` (node, no deps), `play.py` (full Playwright playthrough; the Packa site pages it needs are in `test/site/`), `account_api_test.js` + `account_play.py` (player accounts), `local_server.js` + `fake_redis.js` (runs the game and `api/` locally with an in-memory database). |
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

### Player accounts (Upstash Redis)

Players can create a player name and password on the first screen, and their progress follows them to any computer.
"Play without an account" keeps the old behaviour (progress in that browser only), and a guest can create an account
later from the intro without losing progress.

To turn it on:

1. In the Vercel project, open **Storage → Create Database → Upstash for Redis** (free tier is fine), and connect it
   to the project for Production and Preview. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the code also
   accepts `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
2. Redeploy. Until the database is connected, `/api/*` answers 503 and the game quietly plays in browser-only mode.

How it works:

- Passwords are hashed with scrypt (Node's built-in crypto). Sessions are a random token in an HttpOnly, Secure,
  SameSite=Lax cookie that lasts 30 days; Redis only stores the token's SHA-256.
- The whole save is `FR.state` (a few KB). Real progress is sent within ~2 seconds, the play clock at most once a
  minute, and again when the tab is hidden or closed.
- Each save has a revision number. If a player continues on another computer, the older tab gets "This game was
  continued somewhere else" and reloads instead of overwriting the newer save. A change made while offline stays in
  the browser and is sent when the server is reachable again.
- Sign-up is limited to 10 per IP per hour; sign-in to 10 tries per player name and 30 per IP per 15 minutes.
- There is no password reset (no email is collected). Player names are 3–20 letters, numbers, `.`, `-` or `_`,
  unique regardless of case.
- Redis keys: `fc:user:<name>`, `fc:save:<name>`, `fc:sess:<token hash>`, `fc:rl:*` (rate limits, expire on their own).

Run it locally without Vercel or a database:

```bash
python3 build.py && node test/local_server.js 8000    # http://localhost:8000/ with an in-memory database
```

### Score and Live Standings

| | Points |
|---|---|
| Each checklist item solved (10 in all) | +1,000 |
| Each wrong guess (password boxes, checklist answers) | −50 |
| Hints | first 10 free, then −100 each (a hint asks before it costs) |

The score never goes below 0; a perfect game is 10,000. Change the numbers in `src/score_rules.js` only: the game and
the server both load that file.

- The score shows in the checklist footer (with the free hints left) and on the ending screen, with the player's rank.
- The leaderboard is **"Board Pack Rescue — Live Standings"**, a page on the in-game Excel World Championship site
  (`http://championship.example/standings`, the event Frank is at in Vegas), shown in Frank's Internet Explorer. Its
  story: the championship's *Desk Division*, "the only event played from home", for whoever is stuck finishing the
  Board Pack while everyone else is in Vegas. Open it from the **Vegas Live Standings** shortcut on the desktop, the
  Start menu, the Schedule page's link, the score in the checklist, or the ending screen.
- It lists the top 50 by points, ties broken by less time at the desk, with medals for the top three. The signed-in
  player's row is highlighted, and shown under the list if they're outside the top 50. Without the account server the
  shortcut is hidden and the page says the standings are offline.
- Only signed-in players are on the board, under their player name. The board follows a player's game until they
  finish it; their **first finished game** is then locked in, so replaying with the answers known doesn't count.
  Starting over before finishing takes them off the board until they solve a riddle again.
- The server computes the score from the saved game (`api/_lib.js` → `updateBoard`), not from a number the browser
  sends. The save itself comes from the browser, so a determined player could still forge one; this is a campaign
  game, not a tournament.
- Redis keys: `fc:board` (sorted set) and `fc:board:info` (hash). To reset the board, delete both.

### The in-game browser and packacorp.com

The in-game Internet Explorer shows packacorp.com in an iframe. If the site sends `X-Frame-Options: DENY/SAMEORIGIN`,
or a `Content-Security-Policy` with `frame-ancestors` that doesn't include the game's domain, the page won't load
inside the game. Players can still open the site in another tab (the intro says so). For the best experience,
allow the game's domain in the Packa site's `frame-ancestors`. The website clue changes the puzzles depend on are
listed in `docs/PACKA_SITE_GAME_CLUES.md`.

## Tests

```bash
node test/excel_engine_test.js           # spreadsheet engine + answer checks (no dependencies)
node test/account_api_test.js            # player-account API against an in-memory Redis (no dependencies)
node test/score_test.js                  # scoring rules + scoreboard API (no dependencies)
pip install playwright && python3 test/play.py   # full honest playthrough in headless Chromium
python3 test/account_play.py             # sign up, continue on another computer, guest → player, sign out, conflicts
python3 test/score_play.py               # checklist score, paid hints, desktop shortcut → Live Standings, ending rank
```

## Sounds

`src/sounds.js` embeds the Windows XP sound pack supplied by the campaign team (`tools/xpsounds/`). To change
which sample plays for which event, edit `MAP` in `tools/make_sounds.py`, then run it (needs ffmpeg) and rebuild.

## Answers (spoilers, for the team)

sedalia1958 → v5_FINAL_USE_THIS → Board copy password 4406 → EBITDA row 12 = 3,130 → Bank.zip 3130, DSCR 1.25x →
hidden REAL VERSION, first week below $250K = week 5 → bridge freight −60, other −40 → FOR_THE_BOARD 18243 →
reply to Diane and send → Kristians Bušārs is on Frank's team.
