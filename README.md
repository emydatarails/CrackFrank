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
| `src/apps/erp.js`, `src/apps/erp.css` | ShowMe ERP Classic, Packa's old ERP: transactions only, no budget, forecast or Board reporting (and no puzzle numbers). |
| `src/account.js`, `src/account.css` | Player sign-in screen and cloud save (talks to `api/`). |
| `src/score_rules.js` | The scoring rules. One copy, used by the game and by the server. |
| `src/score.js`, `src/score.css` | Score in the checklist and ending, and the leaderboard page. |
| `src/apps/paint.js`, `src/apps/solitaire.js` | Paint (XP mspaint, opens on Frank's `kristians_by_frank.bmp`) and Solitaire (Klondike; the face cards are MEWC competitors). On the desktop and in the Start menu. |
| `src/apps/xp_*.js`, `src/apps/xp_extras.css` | The extras (see "Extras" below): `xp_0base.js` (shared helpers), `xp_bsod.js` (Blue Screen after 4 wrong answers in a row), `xp_norton.js` (the Norton AntiVirus popup), `xp_eggs.js` (Frank's Easter eggs), `xp_bonus.js` (bonus requests). |
| `src/mobile.css` | Phones and small tablets only (see "Phones" below). |
| `api/` | Vercel functions for player accounts and the scoreboard: `register`, `login`, `logout`, `me`, `save`, `scores` (shared code in `_lib.js`). No npm dependencies. |
| `build.py` | Concatenates `src/` into `dist/index.html` and copies `public/` next to it. Python 3, standard library only. |
| `config.json` | Site links, end-screen CTA and share-card metadata, injected at build time. |
| `public/` | Static files copied into the build (`og-image.png` share card). |
| `dist/` | A prebuilt copy of the game (Vercel rebuilds it on every deploy). |
| `vercel.json` | Vercel build settings (build command, `dist/` output, cache headers). |
| `.github/workflows/ci.yml` | Builds and runs the spreadsheet-engine tests on every push and PR. |
| `test/` | `excel_engine_test.js` (node, no deps), `play.py` (full Playwright playthrough; the tests can't reach the live packacorp.com, so `site_route.py` serves the copies in `test/site/`: the pages, a stand-in stylesheet and script, the real logo and stand-in photos), `account_api_test.js` + `account_play.py` (player accounts), `persist_play.py` (spreadsheet edits saved with the game), `local_server.js` + `fake_redis.js` (runs the game and `api/` locally with an in-memory database). |
| `tools/` | `make_sounds.py` + the Windows XP sound pack, to regenerate `src/sounds.js`. |
| `docs/` | `SPEC.md` (the design spec; later sections win), `API.md` (the `window.FR` API every app uses), `CANON_DECISIONS.md` (numbers and story facts that must stay consistent), `PACKA_SITE_GAME_CLUES.md` (what must exist on packacorp.com), `PLAYTEST_FPA.md`. |

## Build and run locally

```bash
python3 build.py            # -> dist/index.html
open dist/index.html        # or: python3 -m http.server -d dist 8000
```

For testing only: `dist/index.html?dev=1` skips the intro and login, and `?dev=1&solve=<itemId>` marks every
checklist item up to that id as solved. The checklist order is login, version, unlock, ebitda, dscr, cash,
bridge, forboard, send, frank. `?nopopups=1` turns off the timed Norton popups and the timed bonus e-mails (for scripted
tests). These shortcuts work only on `file://` and `localhost`, never on the public site.

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
- `GET /api/me` answers `{user: null}` (200) when nobody is signed in: asking "who am I?" isn't an error, so a new
  player's console stays clean. `/api/save` without a session is still 401.
- Sign-up is limited to 10 per IP per hour; sign-in to 10 tries per player name and 30 per IP per 15 minutes.
- There is no password reset (no email is collected). Player names are 3–20 letters, numbers, `.`, `-` or `_`,
  unique regardless of case.
- Redis keys: `fc:user:<name>`, `fc:save:<name>`, `fc:sess:<token hash>`, `fc:rl:*` (rate limits, expire on their own).

Run it locally without Vercel or a database:

```bash
python3 build.py && node test/local_server.js 8000    # http://localhost:8000/ with an in-memory database
```

The local server serves `dist/` fresh on every request and reloads `api/*.js` and `src/score_rules.js` when they change
(a long-running server once kept pre-bonus scoring code and put a different score on the board than the game showed).

### Score and leaderboard

| | Points |
|---|---|
| Each checklist item solved (10 in all) | +1,000 |
| Each wrong guess (password boxes, checklist answers) | −50 |
| Hints | first 10 free, then −100 each (a hint asks before it costs; on a phone every hint asks first) |
| Each bonus request answered (9, optional, see "Extras") | +100 to +250, on top |
| Each Easter egg found (15 hidden, see "Easter eggs") | +10, on top (+150 for all 15) |

Score = max(0, riddles − wrong guesses − paid hints) + bonus: the main score never goes below 0, and penalties never
eat into bonus points. A perfect game is 10,000, or 11,450 with every bonus request and every egg. Wrong bonus answers cost nothing. Change
the numbers in `src/score_rules.js` only (`BONUS` is the bonus table): the game and the server both load that file.

- The score shows in the checklist footer (with the free hints left and, once there is any, "(+N bonus & eggs)") and on the
  ending screen (with a separate "+N Bonus & eggs" box), with the player's rank. The leaderboard has a "Bonus & eggs" column.
- The leaderboard is **"Board Pack Rescue - Who Covered for Frank?"**, a page on Packa Corporation's intranet
  (`http://intranet.packacorp.local/who-covered-for-frank`), shown in Frank's Internet Explorer: the company's list of
  the people who sat down at Frank's desk and got the Board Pack out. Open it from the **Who Covered for Frank?**
  shortcut on the desktop, the Start menu, the score in the checklist, or the ending screen (or type the address).
- It lists the top 50 by points, ties broken by less time at the desk, with medals for the top three. The signed-in
  player's row is highlighted, and shown under the list if they're outside the top 50. Without the account server the
  shortcut is hidden and the page says the intranet is offline.
- **One score everywhere**: the checklist footer, the ending screen and the leaderboard always show the same number
  (all three use `src/score_rules.js`). The ending adds how it's made up ("10 × 1,000 − 4 wrong × 50 + 1,300 bonus requests +
  4 eggs × 10 = 11,140") and the leaderboard page opens with a "How points work" box; both are written from the rules file, never
  typed in twice. A wrong answer's message says what it cost ("(−50 points)"); an answer that isn't a number where a
  number is asked ("banana") gets "That's not a number" and costs nothing.
- Only signed-in players are on the board, under their player name. The board follows a player's game, and their
  **first finished game** stays their entry: it keeps following *that game* after the ending (bonus requests answered
  and Easter eggs found later still count), but a replay after "Start over", with the answers known, never changes it.
  A game is known by its `finishedAt` (stored in the entry as `game`). Starting over before finishing takes them off the
  board until they solve a riddle again.
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

### Phones

The game also plays on a phone or small tablet. `src/core.js` decides it once with one media query,
`(max-width: 760px), (pointer: coarse) and (max-width: 1100px)` (`FR.mobile`, and `<html class="fr-m">`), and follows
rotation. Desktop browsers never match it and are unchanged. On a phone:

- app windows fill the screen above a taller taskbar (no Maximize, nothing to drag); dialogs sit in the upper part of the screen
  and never grow past it (a long message scrolls, the buttons stay); property sheets (Folder Options) fill the screen with
  OK / Cancel pinned at the bottom and a page that scrolls by swiping;
- the taskbar has one switcher button that lists every open window by its full title (rows stay put while you close
  windows from it); IE keeps its bars at the bottom;
- a tap that started just before a message box or window appeared is ignored (no answering by accident); one-tap checklist
  answers (weeks, suspects) ask for a Submit; balloons are a slim strip above the taskbar with a big ✕ that never vanishes
  under a finger (a tap where one just vanished is ignored; a cut-off one opens up on a tap, with its action as a button);
  the end screen ignores taps for a moment and "Play again" asks with Cancel as the default;
- Excel keeps column A frozen (and very wide columns capped), Enter stays on the cell, tapping cut-off text shows all of it,
  Fit / 100% zooms the sheet to the screen width and Fill… copies a cell right or down (the fill handle);
- Notepad has a Wrap on/off button;
- one tap opens desktop icons, Explorer items and (tapping it again) a selected message; a long-press is a right-click;
- Excel: tap a cell to select it (and read its red-triangle note), tap it again to type in the formula bar; Enter or ✓ puts it in
  (the first tap into the formula bar selects its content, the next one places the caret);
- when the soft keyboard comes up, the screen shrinks to the part above it, so the field being typed in stays visible;
- tap targets, text and inputs are bigger (inputs are 16px, so iOS doesn't zoom in); landscape gets slimmer toolbars.

All mobile CSS is in `src/mobile.css`, inside that media query; mobile JS only runs when `FR.mobile` is set.

## Tests

```bash
node test/excel_engine_test.js           # spreadsheet engine + answer checks (no dependencies)
node test/account_api_test.js            # player-account API against an in-memory Redis (no dependencies)
node test/score_test.js                  # scoring rules + scoreboard API (no dependencies)
pip install playwright && python3 test/play.py   # full honest playthrough in headless Chromium
python3 test/account_play.py             # sign up, continue on another computer, guest → player, sign out, conflicts
python3 test/persist_play.py             # spreadsheet edits: reload, another computer, undo, no second award, start over
python3 test/erp_play.py                 # ShowMe ERP: every module, exports, no puzzle answers inside
python3 test/score_play.py               # checklist score, paid hints, desktop shortcut → leaderboard, ending rank
python3 test/mobile_play.py              # the whole game by touch on an emulated iPhone 13, Pixel 7 and iPhone SE (320x568), plus landscape
python3 test/paint_play.py               # Paint: tools, save, My Pictures, phones
python3 test/solitaire_play.py           # Solitaire: deal, moves, scoring, the face cards
python3 test/features_play.py            # Blue Screen, Norton, bonus requests, Easter eggs, Paint/Solitaire icons (desktop + iPhone 13)
```

## Extras

- **Blue Screen of Death** (`src/apps/xp_bsod.js`). Four wrong answers in a row (checklist answers, Excel and zip
  passwords; never the Windows log-on riddle, which calls `FR.puzzle.miss({ login: true })`) bring up a full-screen XP
  stop screen ("…shut down to prevent damage to your Board Pack", `*** STOP: 0x00000004 (TOO_MANY_WRONG_ANSWERS,
  0x0000BOARD, 0xDEADLINE, 0x00000900)`, `PACKA_SEDALIA.SYS`) with a countdown in the text ("Windows will return to normal
  in 5 seconds…"). Every tap, click and key is ignored while it shows; then it goes and everything is exactly where it
  was. Cosmetic only: no extra points lost. Any solved item or correct password ends the streak (`FR.puzzle.hit()`); the
  streak is `FR.state.missStreak`, so a reload doesn't dodge it. Wrong guesses are counted for the score exactly as before.
- **Norton AntiVirus 2003** (`src/apps/xp_norton.js`): a nostalgic tray popup, "Virus definitions are up to date.",
  about 3 minutes into play, then every 8–15 minutes of active play; every other time it says something else ("LiveUpdate
  found 0 viruses and 47 versions of the same model."). It waits while a message box, the Blue Screen, the screensaver,
  the ending, a menu or typing is going on. It is an ordinary tray balloon, so phones get the usual toast. Clicking it opens
  a small status window ("System Status: OK", "Scan Frank's inbox"…). A generic yellow shield, no real logo.
- **Bonus requests** (`src/apps/xp_bonus.js`): e-mails from people who don't know Frank is missing, each with a small
  finance question and an answer box inside the message (or reply, also to the sender's answer). One grader for both
  (`judge()`, tests in `test/bonus_grade_test.js`): the right number anywhere in the text counts, the question's own numbers
  and the working never count against it; it fails only if no number is right or the text settles on another final answer
  ("the answer is …", "say …"). On phones/tablets an "Answer ▸" button is pinned at the top of the message. Optional; they arrive one at a time
  after a checklist item, the first 2 minutes into play and then at least 3½ minutes apart, with a toast "New request
  from …". Wrong answers cost nothing and never count toward the Blue Screen; the sender answers in character and, after two
  misses, explains the method. Saved in `FR.state.bonus` (`{ id: { solvedAt, pts } }`); points from `BONUS` in
  `src/score_rules.js`. None of them uses a main-puzzle number. Answers (spoilers):

| id | From | Arrives after | Ask | Answer | Points |
|---|---|---|---|---|---|
| `tom_comm` | Tom Bracken, Sales | log-on | commission on an $80,000 deal: 4% up to $50,000, 6% above | $3,800 | +150 |
| `mum_fx` | Linda Warmington, Frank's mum | log-on | $500 at 1.36 CAD per USD | C$680 | +100 |
| `intern_accrual` | Kaylee Brooks, the new intern | item 2 | accrue October of a $27,900 Oct–Dec utility bill | $9,300 | +150 |
| `it_audit` | Packa IT Asset Audit (a script) | item 2 | size of `Packa_Corp_Model_FY26_v47…xls` (Properties) | 4.7 MB | +100 |
| `steve_margin` | Steve Packa (typed by Barb at the front desk) | item 3 | margin on a 25% markup | 20% | +200 |
| `dale_var` | Dale Hutchins, Shipping | item 4 | $5,000 spent on a $4,000 budget, % of budget | 25% over | +100 |
| `rotary_be` | Harold Voss, Sedalia Rotary | item 5 | break-even tickets: $8 ticket, $3 a plate, $600 fixed | 120 | +150 |
| `brenda_disc` | Brenda Pruitt, AP at Hawthorn Foods | item 6 | $12,000 invoice, 2/10 net 30, paid early | $11,760 | +100 |
| `vending_ci` | Gary Stroud, Ozark Snack & Vend | item 7 | $2,000 at 1.5%/month compounded, 12 months | $2,391 | +250 |

## Easter eggs (spoilers)

Fifteen of Frank's private secrets (`src/apps/xp_eggs.js`). Each shows a small "Easter egg found (n/15) · +10 points"
note (it never takes a tap) and is worth +10 as soon as it's found (+150 for all 15; the ids are also listed in
`src/score_rules.js`, `EGGS`). The count so far is on the leaderboard ("Your Board Pack right now") and in How to play.
Found eggs are in `FR.state.eggs`. None of them gives a puzzle answer.

| # | Egg | Where / how |
|---|---|---|
| 1 | Frank's karaoke setlist | My Documents › Personal › `karaoke_setlist.txt` (hidden: Folder Options › Show hidden files) |
| 2 | Frank's diary | My Documents › Personal › `diary_do_not_read.txt` (it drops hints for several other eggs) |
| 3 | The resignation letter, v9 | Recycle Bin › `resignation_letter_v9_NOT_SENT.txt` |
| 4 | Self-portrait in Drew's hat | My Pictures › `frank_self_portrait_(drews_hat).bmp` (opens in Paint) |
| 5 | Run… `frank` | Start › Run… › `frank` |
| 6 | Run… `vegas` | Start › Run… › `vegas` |
| 7 | Run… `xlookup` | Start › Run… › `xlookup` (also flavour answers for `vlookup`, `pivot`, `datarails`, `financeos`, `drew`, `winver`) |
| 8 | `=KRISTIANS()` | type it in any Excel cell: "There's always a formula." |
| 9 | The cell at the very end | `speedrun_practice.xls` (Personal), Practice log: Ctrl+End, or select cell J36 (white on white) |
| 10 | Five cheat sheets in a row | click Kristians' face in the tray 5 times quickly (on a phone too narrow for that icon: the 5th tip that comes by itself) |
| 11 | The screensaver | wait 5 minutes, or right-click the desktop › Properties › Screen Saver… › Preview |
| 12 | Deal #212 | deal Solitaire 212 times (F2) |
| 13 | Member #0003 | make the Calculator show 0.0003 |
| 14 | Tuesday Karaoke at the Tipsy Ledger | Internet Explorer › Favorites › Frank's › Tuesday Karaoke |
| 15 | Riga time | double-click the tray clock (on a phone: tap it twice) |

## Sounds

`src/sounds.js` embeds the Windows XP sound pack supplied by the campaign team (`tools/xpsounds/`). To change
which sample plays for which event, edit `MAP` in `tools/make_sounds.py`, then run it (needs ffmpeg) and rebuild.

## Answers (spoilers, for the team)

sedalia1958 → v5_FINAL_USE_THIS → Board copy password 4406 → EBITDA row 12 = 3,130 → Bank.zip 3130, DSCR 1.25x →
hidden REAL VERSION, first week below $250K = week 5 → bridge freight −60, other −40 → FOR_THE_BOARD 18243 →
reply to Diane and send → Kristians Bušārs is on Frank's team.
