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
  buttons?: ['OK'] | ['OK','Cancel'] | ['Yes','No'], width? })` → Promise resolving `{ button, value }`. Modal, beeps (error/warn).
- `FR.balloon(title, text, onClick?)` → XP tray balloon notification.
- `FR.sound.play('ding'|'chord'|'error'|'mail'|'tada'|'click'|'unlock')`.
- `FR.state` (persisted): `{ solved: {id: timestampMs}, flags: {}, hintsUsed: {id: n}, readMail: {} , startedAt }`.
  `FR.save()` persists. `FR.flags.get(k)`, `FR.flags.set(k, v)` (persists + emits 'flag').
- `FR.loadState(obj)` → a validated state (or null) built from a save that came from elsewhere.
- `FR.account` (src/account.js): `{ user (player name or null), available (account server reachable), start(), screen(mode), signOut() }`.
  When signed in, `FR.save()` also syncs `FR.state` to `/api/save`, and `FR.resetSave()` returns a Promise that resolves once the
  account's save is wiped. Anything that must survive a reload or a change of computer has to be in `FR.state`.
- `FR.bus.on(evt, fn)`, `FR.bus.emit(evt, data)`. Events: 'solved' (id), 'flag' ({k,v}), 'login', 'fs-change'.
- `FR.puzzle.solve(id)` — marks a checklist item solved (only if it's the current/unlocked one or earlier; else ignored and returns false),
  plays sound, emits 'solved'. `FR.puzzle.isSolved(id)`, `FR.puzzle.isUnlocked(id)`, `FR.puzzle.norm(str)`.
  Checklist order: login, version, unlock, ebitda, dscr, cash, bridge, send, frank.
- `FR.puzzle.miss()` — counts one wrong guess (password boxes, checklist) toward the final score and saves.
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
- `FR.apps` — register your app: `FR.apps.excel = (node|null) => {...}`. App names: 'excel', 'mail' (Outlook Express; called with an .eml
  node or null), 'explorer' (called with a folder node/id), 'zip', 'notepad', 'image', 'ie' (called with url string or null), 'calc', 'checklist'
  (core), 'recycle' (= explorer at 'recycle').
- Text file contents: `FR.data.texts[fileId] = '...'` (defined by the shell-apps file). Workbook data: inside excel.js. Emails: inside outlook.js.
- Show hidden files flag: `FR.flags.get('showHidden')`. Zip unlocked flag: `FR.flags.get('bankzipOpen')`.
