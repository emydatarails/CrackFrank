# Core API contract (window.FR) — every app file must follow this

Build: `python3 build.py` concatenates `src/xp.css`, `src/core.css`, `src/apps/*.css` and `src/core.js`, `src/fs.js`,
`src/apps/*.js`, `src/boot.js` (in that order) into `dist/index.html`. Plain browser JS (ES2020), no modules, no
imports, no network except the in-game Internet Explorer iframe and the player-account calls in `src/account.js`. Each app file is an IIFE: `(() => { ... })();`.
Prefix every CSS class with your app name (e.g. `.xl-`, `.oe-`, `.ex-`) to avoid collisions. XP.css (0.2.6) is loaded:
`.window`, `.title-bar`, `.title-bar-text`, `.title-bar-controls`, `.window-body`, `button`, `input`, `select`,
`fieldset`, `menu[role=tablist]`, `.status-bar`, `.status-bar-field`, `ul.tree-view` are all styled XP-like.
Test page: `dist/index.html?dev=1` skips intro/login (logged in, all items unlocked for testing).

## Globals
- `FR.icons.<name>` → SVG markup string (32x32 viewBox; scale with CSS). `FR.icon(name, size)` → `<span class="fr-ico">svg</span>` HTML.
  Names: computer, mydocs, folder, folderOpen, folderHidden, recycle, recycleFull, ie, mail, excel, xls, xlsLocked, txt, zip,
  eml, image, lock, checklist, calc, notepad, help, logoff, shutdown, user, drive, cdrom, network, back, forward, up, search,
  views, warn, error, info, question, search, printer, controlpanel, star, key.
- `FR.wm.open(opts)` → `win` — opts: `{ id?, title, icon (icon name), width, height, x?, y?, resizable=true, maximized=false,
  className?, menu? (array of {label, items:[{label, action?:fn, disabled?, sep?:true, checked?}]}), content (HTMLElement or html string),
  statusBar? (array of strings), onClose?: fn → return false to cancel }`.
  If `id` is given and a window with that id exists, it is focused and returned instead of opening a new one.
  `win` = `{ id, el (the .window), body (the .window-body element; you fill it), setTitle(t), setStatus(i, text), close(), focus(), minimize(), maximize() }`.
- `FR.wm.dialog({ title, icon: 'error'|'warn'|'info'|'question'|'lock'|'key', message (html), input?: {label, type:'password'|'text', value?},
  buttons?: ['OK'] | ['OK','Cancel'] | ['Yes','No'], width?, def? })` → Promise resolving `{ button, value }`. Modal, beeps (error/warn).
  `def` = index of the default (focused) button, 0 if omitted; closing with ✕ always answers the last button.
- `FR.balloon(title, text, onClick?)` → XP tray balloon notification.
- `FR.sound.play('ding'|'chord'|'error'|'mail'|'tada'|'click'|'unlock')`.
- `FR.state` (persisted): `{ solved: {id: timestampMs}, flags: {}, hintsUsed: {id: n}, readMail: {} , startedAt }`.
  Paint adds `paint: { files: [{ id, name, w, h, png (PNG data URL), savedAt }] }` (max 8 pictures / 600 KB, validated by `harden` in core.js).
  Excel adds `xl: { <fileId>: { <sheet name>: { <A1>: '<typed>' | ['<typed>', '<number format>'] } } }`: the player's cell edits, only
  the difference from the file as built (`FR.xl.edits` in excel.js: restored when the file opens, saved on every committed edit/undo;
  max ~100 KB, validated by `harden`). A workbook opened with no file node (File › New) isn't saved.
  The extras add `missStreak` (number), `bonus` and `eggs` (validated by `harden`). Timed things keep their schedule in
  `flags.norton`, `flags.bonusMail`, `flags.bonusTries`, `flags.solDeals`; nothing is written on a play tick unless a
  popup or an e-mail is actually due (two signed-in computers would otherwise race each other).
  `FR.save()` persists. `FR.flags.get(k)`, `FR.flags.set(k, v)` (persists + emits 'flag').
- `FR.loadState(obj)` → a validated state (or null) built from a save that came from elsewhere.
- `FR.account` (src/account.js): `{ user (player name or null), available (account server reachable), start(), screen(mode), signOut() }`.
  When signed in, `FR.save()` also syncs `FR.state` to `/api/save`, and `FR.resetSave()` returns a Promise that resolves once the
  account's save is wiped. Anything that must survive a reload or a change of computer has to be in `FR.state`.
- `FR.score` (src/score.js): `now()` → `{ score, main, bonus, solved, total, hints, paidHints, freeLeft, wrong, finished, timeMs }` for `FR.state`;
  `open()` opens the leaderboard (intranet.packacorp.local/who-covered-for-frank) in IE; `render(pageEl, isCurrent)` fills an IE page; `available()`; `rules` (= `FR.scoreRules`, src/score_rules.js).
  Wording built from the rules (never type the numbers in): `rulesList()` / `rulesLine()`, `breakdown(calc?)` ("10 × 1,000 − 4 wrong × 50 + 1,150 bonus requests = 10,950"; eggs as "+ n eggs × 10"), `bonusWord` ("bonus & eggs": the total of both, wherever it is shown on its own),
  `boardRule` (which game is on the board), `otherGame(me)` (the board entry is an earlier game than this one: a replay). `FR.account.sync()` sends unsaved progress
  (waits for a save already on its way). Server: `GET /api/me` → `{user: null}` when signed out; `GET /api/scores` → `{top, me (+ me.game = the entry's finishedAt), players, rules}`.
- `FR.data.images.sa_<key>` (src/salon_images.js): the AL PACKA website photos; `mewc_<name>` (src/portraits.js): the Solitaire portraits.
- `FR.version` (build.py, from `VERSION`): `{ version, build ('dev' or the short commit), date, full }`; shown in Help and Support and About Windows.
- `FR.bus.on(evt, fn)`, `FR.bus.emit(evt, data)`. Events: 'solved' (id), 'flag' ({k,v}), 'login', 'fs-change'.
- `FR.puzzle.solve(id)` — marks a checklist item solved (only if it's the current/unlocked one or earlier; else ignored and returns false),
  plays sound, emits 'solved'. `FR.puzzle.isSolved(id)`, `FR.puzzle.isUnlocked(id)`, `FR.puzzle.norm(str)`.
  Checklist order: login, version, unlock, ebitda, dscr, cash, bridge, send, frank.
- `FR.puzzle.miss(opts?)` — counts one wrong guess (password boxes, checklist) toward the final score and saves. Every miss
  except `{ login: true }` (the Windows log-on screen) also adds to `FR.state.missStreak` and emits 'miss' (streak); 4 in a
  row = the Blue Screen (`FR.bsod`, src/apps/xp_bsod.js). `FR.puzzle.hit()` ends the streak (solving an item does too).
- Extras (src/apps/xp_*.js): `FR.xp` { LOCAL, noPopups (`?nopopups=1`, LOCAL only), quiet(), ff(ms) (LOCAL only: moves the
  play clock) }; `FR.bsod` { show, hide, active }; `FR.norton` { pop(text?), statusWin() }; `FR.eggs` { list, find(id),
  count(), total, has(id) } with `FR.state.eggs = { id: foundAtMs }`; `FR.bonus` { TASKS, deliver(id, quiet?), award(id),
  grade(id, text), judge(id, text) → { ok, msg } (pure: the one grader for the answer box and replies, test/bonus_grade_test.js),
  numbers(text), taskOf(msg) (the request a message belongs to: `msg.bonus`, the sender's answers `msg.bonusRe`, or sender +
  subject), mount(el, msg), onReply(msg, orig) } with `FR.state.bonus = { id: { solvedAt, pts } }` (points come
  from `BONUS` in src/score_rules.js). Other files can add Run… commands (`FR.runCommands[name] = fn`), Internet Explorer
  pages (`FR.iePages[host] = { title, html(url), onShow? }`), Favorites (`FR.ieFavs.push([folder, [[title, url]]])`) and Links toolbar buttons (`FR.ieLinks.push([title, url])`, after Packa's own),
  and built-in Paint pictures (a file node with `app: 'paint'` and `paintImage()` → ImageData, via `FR.fs.extra`).
- `FR.balloon(title, html, onClick?, { act, silent, icon, cls })` — `icon` replaces the title icon (HTML), `cls` adds a class.
- Events added: 'miss' (streak), 'bsod' (true/false), 'egg' ({id, n, total}), 'bonus' (id), 'bonus-mail' (id), 'desktop'
  (the desktop element, after each log-on), 'screensaver', 'calc-display' (value), 'xl-select' ({book, sheet, r, c}),
  'xl-kristians', 'sol-deal' (seed), 'paint-open' (name).
- Events also: 'dialog-closed' (the window that got focus back after a core dialog finished — refocus your grid), 'play-tick' (playMs, every active second).
- `FR.wm.topDialog()`, `FR.wm.closeMenus()`. Esc (core) closes only the Start menu, context/menubar menus, or the top dialog; never app windows; ignored while typing.
- `FR.clock.now()` = GAME_START + active play time (`FR.state.playMs`, counted only while the tab is visible, the desktop is up and no screensaver). `FR.clock.playMs()`, `FR.clock.dur(ms)`.
- `FR.clock.now()` → Date inside the game (starts Thu Oct 8 2026 23:47, runs in real time). `FR.clock.fmt(date, 'short'|'long'|'time')`.

## Filesystem (src/fs.js, owned by core)
- `FR.fs.get(id)` → node; `FR.fs.children(id, {showHidden})`, `FR.fs.path(id)` → 'C:\\Documents and Settings\\...'.
- node = `{ id, name, type: 'folder'|'file', app (which app opens it), icon, hidden?, size (string, e.g. '48 KB'), modified (string 'MM/DD/YYYY h:mm AM'),
  author?, title?, comments?, parent }`. Special folder ids: 'desktop', 'mycomputer', 'cdrive', 'mydocs', 'budget', 'board', 'bank',
  'cashdir'(hidden), 'personal', 'pics', 'recycle', 'bankzip' (a file node with app 'zip', whose `children` are listed by FR.fs.children('bankzip') once unlocked).
- `FR.openFile(nodeOrId)` → dispatches to `FR.apps[node.app](node)`.
- `FR.fs.extra` — an app can push `() => [node, ...]` to add nodes generated at listing time from `FR.state` (Paint's saved
  pictures in My Pictures). `FR.fs.get/children/path/nodes` include them. A generated node may carry `onDelete()`: Explorer's
  Delete then really deletes it (everything else of Frank's stays "Access is denied").
- `FR.apps` — register your app: `FR.apps.excel = (node|null) => {...}`. App names: 'erp' (ShowMe ERP, no args), 'paint' (Paint; null → kristians_by_frank.bmp, or a My Pictures node from FR.fs.extra), 'excel', 'mail' (Outlook Express; called with an .eml
  node or null), 'explorer' (called with a folder node/id), 'zip', 'notepad', 'image', 'ie' (called with url string or null), 'calc', 'checklist'
  (core), 'recycle' (= explorer at 'recycle').
- Text file contents: `FR.data.texts[fileId] = '...'` (defined by the shell-apps file). Workbook data: inside excel.js. Emails: inside outlook.js.
- Show hidden files flag: `FR.flags.get('showHidden')`. Zip unlocked flag: `FR.flags.get('bankzipOpen')`.
