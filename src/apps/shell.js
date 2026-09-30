/* FRANK'S COMPUTER — shell apps: Explorer (+ My Computer, Recycle Bin, zip folders), Folder Options, Properties,
   Notepad (+ all text file contents), Picture Viewer, Internet Explorer 6, Calculator.  Prefixes: sh- ex- fo- pr- np- iv- ie- ca- */
(() => {
  const $ = FR.$, esc = FR.esc;
  const ico = (n, s = 16) => FR.icon(n, s);
  let uidc = 0;
  const uid = p => 'sh-' + p + (++uidc);
  const showHidden = () => !!FR.flags.get('showHidden');
  const showSystem = () => !!FR.flags.get('showSystem');
  const T = FR.data.texts = FR.data.texts || {};

  /* ======================================================================================
     Small inline SVG glyphs (16x16) for task panes, toolbars and menus — original art
     ====================================================================================== */
  const sv = (b, vb = 16) => `<svg viewBox="0 0 ${vb} ${vb}" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;
  const G = {
    newfolder: sv('<path d="M1 4h5l1.5 1.5H15V14H1z" fill="#f3c24a" stroke="#b9862a" stroke-width=".7"/><path d="M11 1.5l.7 1.6 1.7.2-1.3 1.1.4 1.7-1.5-.9-1.5.9.4-1.7-1.3-1.1 1.7-.2z" fill="#ffe34a" stroke="#c9a200" stroke-width=".5"/>'),
    web: sv('<circle cx="8" cy="8" r="6.5" fill="#6fb6ff" stroke="#1d5fc9"/><path d="M2 7c3 1 4-2 6-1s2 3 5 2M3 11c2-1 4 0 5 1s3 0 4-2" fill="none" stroke="#3a9a32" stroke-width="1.6"/>'),
    share: sv('<path d="M1 5h5l1.5 1.5H15V14H1z" fill="#f3c24a" stroke="#b9862a" stroke-width=".7"/><path d="M3 15c1-3 3-3 3-3s2 0 3 3z" fill="#5a8ed8"/><circle cx="6" cy="10.5" r="1.8" fill="#f1c9a0" stroke="#8a5a2a" stroke-width=".5"/>'),
    rename: sv('<rect x="1" y="4" width="14" height="8" fill="#fff" stroke="#6b7a8c"/><path d="M4 6v4M3 6h2M3 10h2" stroke="#000"/><rect x="6.5" y="6.5" width="6" height="3" fill="#316ac5"/>'),
    move: sv('<path d="M1 3h4l1 1h5v8H1z" fill="#f3c24a" stroke="#b9862a" stroke-width=".7"/><path d="M8 11h6M11.5 8.5L14 11l-2.5 2.5" fill="none" stroke="#1d9a2b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
    copy: sv('<path d="M2 1h7l2 2v8H2z" fill="#fff" stroke="#6b7a8c"/><path d="M6 5h7l2 2v8H6z" fill="#fff" stroke="#6b7a8c"/><path d="M8 9h5M8 11h5M8 13h4" stroke="#8aa0bd" stroke-width=".8"/>'),
    email: sv('<rect x="1" y="3.5" width="14" height="9.5" fill="#fffbe8" stroke="#8c7a43"/><path d="M1.5 4l6.5 5 6.5-5" fill="none" stroke="#8c7a43"/>'),
    print: sv('<rect x="4" y="1.5" width="8" height="5" fill="#fff" stroke="#6b7785"/><rect x="1" y="6" width="14" height="6" rx="1" fill="#c9d0d8" stroke="#5f6d7e"/><rect x="4" y="10" width="8" height="5" fill="#fff" stroke="#6b7785"/><circle cx="12.5" cy="8" r=".8" fill="#39c44b"/>'),
    del: sv('<path d="M3 3l10 10M13 3L3 13" stroke="#d6260f" stroke-width="3" stroke-linecap="round"/><path d="M3 3l10 10M13 3L3 13" stroke="#ff7a5c" stroke-width="1" stroke-linecap="round"/>'),
    sysinfo: sv('<rect x="1" y="2" width="14" height="10" rx="1" fill="#dfe6ee" stroke="#5f6d7e"/><rect x="2.5" y="3.5" width="11" height="7" fill="#3a7de0"/><path d="M5 14h6" stroke="#5f6d7e" stroke-width="2"/><circle cx="8" cy="7" r="2.3" fill="#fff"/><path d="M8 6v2.2" stroke="#3a7de0" stroke-width="1"/>'),
    addrem: sv('<rect x="2" y="5" width="12" height="9" fill="#e8d9b0" stroke="#8a6a2a"/><path d="M2 5l3-3h6l3 3" fill="#f3e6c3" stroke="#8a6a2a"/><circle cx="8" cy="9.5" r="3" fill="#3a9a32"/><path d="M6.5 9.5h3M8 8v3" stroke="#fff" stroke-width="1.2"/>'),
    setting: sv('<rect x="1.5" y="2" width="13" height="12" rx="1" fill="#dfe6ee" stroke="#5f6d7e"/><path d="M5 4v8M11 4v8" stroke="#6b7785"/><rect x="3.5" y="5" width="3" height="2" fill="#2f7de0"/><rect x="9.5" y="9" width="3" height="2" fill="#e0662f"/>'),
    restore: sv('<path d="M3 5h10l-1 9H4z" fill="#cfdcec" stroke="#50657f"/><path d="M8 11V2M5 5l3-3 3 3" fill="none" stroke="#1d9a2b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'),
    empty: sv('<path d="M3 4h10l-1 10H4z" fill="#cfdcec" stroke="#50657f"/><ellipse cx="8" cy="4" rx="5" ry="1.2" fill="#e8eef7" stroke="#50657f"/>'),
    extract: sv('<path d="M1 4h5l1.5 1.5H15V14H1z" fill="#f3c24a" stroke="#b9862a" stroke-width=".7"/><rect x="7" y="6" width="2" height="7" fill="#6d6d6d"/><path d="M11 2v4M9.5 4.5L11 6l1.5-1.5" stroke="#1d9a2b" stroke-width="1.4" fill="none"/>'),
    network: sv('<circle cx="8" cy="8" r="6.5" fill="#8fc8ff" stroke="#1d5fc9"/><rect x="4" y="5" width="8" height="5" fill="#dfe6ee" stroke="#5f6d7e" stroke-width=".7"/><path d="M8 10v3M5 13h6" stroke="#5f6d7e"/>'),
    shared: sv('<path d="M1 4h5l1.5 1.5H15V14H1z" fill="#f3c24a" stroke="#b9862a" stroke-width=".7"/><path d="M4 15c0-3 2-4 4-4s4 1 4 4" fill="#e39c3c"/><circle cx="8" cy="9" r="2" fill="#f1c9a0"/>'),
    chevUp: sv('<circle cx="8" cy="8" r="7.3" fill="#fff" stroke="#c7d3f7"/><path d="M5 8.2L8 5.4l3 2.8M5 11.2L8 8.4l3 2.8" fill="none" stroke="#2c5bd2" stroke-width="1.5"/>'),
    chevDown: sv('<circle cx="8" cy="8" r="7.3" fill="#fff" stroke="#c7d3f7"/><path d="M5 4.8L8 7.6l3-2.8M5 7.8l3 2.8 3-2.8" fill="none" stroke="#2c5bd2" stroke-width="1.5"/>'),
    dd: sv('<path d="M4 6l4 4 4-4z" fill="#000"/>'),
    go: sv('<rect x="1" y="1" width="14" height="14" rx="2" fill="#3fb042" stroke="#1d7a2b"/><path d="M4 8h7M8 4.5L11.5 8 8 11.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    close: sv('<path d="M4 4l8 8M12 4l-8 8" stroke="#000" stroke-width="1.5"/>'),
    shield: sv('<path d="M16 3l11 4v8c0 7-5 11-11 14C10 26 5 22 5 15V7z" fill="#4a86d8" stroke="#1d4fb0"/><path d="M16 3v26M5 14h22" stroke="#fff" stroke-width="1.5" opacity=".8"/><path d="M16 3l11 4v7H16z" fill="#e8b92a"/><path d="M5 14h11v15C10 26 5 22 5 15z" fill="#e8b92a"/>', 32),
    stop: sv('<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#7d8ea3"/><circle cx="10" cy="11" r="4.6" fill="#e0301e" stroke="#8a1a0e"/><path d="M8 9l4 4M12 9l-4 4" stroke="#fff" stroke-width="1.5"/>'),
    refresh: sv('<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#7d8ea3"/><path d="M11.5 9.5a3.7 3.7 0 1 1-1.1-2.7" fill="none" stroke="#1d9a2b" stroke-width="1.8"/><path d="M11.8 4.8v3.2H8.6z" fill="#1d9a2b"/>'),
    home: sv('<path d="M1.5 8L8 2l6.5 6" fill="none" stroke="#9a3a1a" stroke-width="1.8" stroke-linejoin="round"/><path d="M3.5 7.5V15h9V7.5L8 3.5z" fill="#fbe7b6" stroke="#8a6a2a" stroke-width=".8"/><rect x="6.5" y="10" width="3" height="5" fill="#b2582c"/><rect x="10.5" y="2.5" width="1.5" height="3" fill="#9a3a1a"/>'),
    history: sv('<circle cx="8" cy="8" r="6.8" fill="#fff" stroke="#2c5bd2" stroke-width="1.4"/><path d="M8 3.5V8l3 2" fill="none" stroke="#1d3a8a" stroke-width="1.4" stroke-linecap="round"/><path d="M1 3.5l1.8 2.5L5 3.7" fill="#1d9a2b"/>'),
    page: sv('<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#7d8ea3"/><circle cx="8.5" cy="9.5" r="3.5" fill="#6fb6ff" stroke="#1d5fc9" stroke-width=".7"/><path d="M5.5 9c1.5.5 2-1 3-.5s1 1.5 2.5 1" fill="none" stroke="#3a9a32"/>'),
    globe: sv('<circle cx="8" cy="8" r="6.5" fill="#6fb6ff" stroke="#1d5fc9"/><path d="M1.8 7c3 1 4-2 6.2-1s2 3 5 2M3 11.5c2-1 4 0 5 1s3 0 4-2" fill="none" stroke="#3a9a32" stroke-width="1.6"/>'),
    ieDoc: sv('<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#7d8ea3"/><circle cx="8" cy="9" r="3.2" fill="#3c8ae8"/><ellipse cx="8" cy="9" rx="5" ry="1.8" transform="rotate(-25 8 9)" fill="none" stroke="#f3b400" stroke-width="1.1"/>'),
    lockedFolder: sv('<path d="M1 3h5l1.5 1.5H15V14H1z" fill="#f3c24a" stroke="#b9862a" stroke-width=".7"/>'),
    exe: sv('<rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#44609a"/><rect x="1.5" y="2.5" width="13" height="2.5" fill="#2a64d0"/>'),
    sysfile: sv('<path d="M3 1h7l3 3v11H3z" fill="#fff" stroke="#7d8ea3"/><circle cx="8" cy="10" r="2.6" fill="none" stroke="#6b7785" stroke-width="1.4" stroke-dasharray="1.6 1"/>'),
    zoomIn: sv('<circle cx="6.5" cy="6.5" r="5" fill="#e8f4ff" stroke="#2c5bd2" stroke-width="1.5"/><path d="M4 6.5h5M6.5 4v5" stroke="#1d3a8a" stroke-width="1.5"/><path d="M10 10l4.5 4.5" stroke="#6b4c1c" stroke-width="2.4" stroke-linecap="round"/>'),
    zoomOut: sv('<circle cx="6.5" cy="6.5" r="5" fill="#e8f4ff" stroke="#2c5bd2" stroke-width="1.5"/><path d="M4 6.5h5" stroke="#1d3a8a" stroke-width="1.5"/><path d="M10 10l4.5 4.5" stroke="#6b4c1c" stroke-width="2.4" stroke-linecap="round"/>'),
    rotCw: sv('<path d="M3.5 11A5 5 0 1 1 12 5.5" fill="none" stroke="#1d7a2b" stroke-width="2"/><path d="M13.8 2v5h-5z" fill="#1d7a2b"/>'),
    rotCcw: sv('<path d="M12.5 11A5 5 0 1 0 4 5.5" fill="none" stroke="#1d7a2b" stroke-width="2"/><path d="M2.2 2v5h5z" fill="#1d7a2b"/>'),
    bestFit: sv('<rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#2c5bd2" stroke-width="1.2"/><path d="M3.5 5V4.5h2M12.5 5v-.5h-2M3.5 11v.5h2M12.5 11v.5h-2" fill="none" stroke="#1d3a8a" stroke-width="1.2"/><rect x="5.5" y="6" width="5" height="4" fill="#9fd3ff"/>'),
    actual: sv('<rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#2c5bd2" stroke-width="1.2"/><text x="8" y="11" font-size="6.5" text-anchor="middle" font-family="Tahoma" font-weight="bold" fill="#1d3a8a">1:1</text>'),
    slide: sv('<rect x="1.5" y="2.5" width="13" height="10" fill="#1d3a8a" stroke="#0a1f5a"/><path d="M6.5 5v5l4-2.5z" fill="#fff"/><path d="M8 12.5v2M5 15h6" stroke="#5f6d7e"/>'),
    prev: sv('<circle cx="8" cy="8" r="7" fill="#3fb042" stroke="#1d7a2b"/><path d="M9.5 4.5L6 8l3.5 3.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    next: sv('<circle cx="8" cy="8" r="7" fill="#3fb042" stroke="#1d7a2b"/><path d="M6.5 4.5L10 8l-3.5 3.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
    edit: sv('<path d="M2 14l1-4 8-8 3 3-8 8z" fill="#ffd33a" stroke="#8a6508"/><path d="M2 14l1-4 3 3z" fill="#f2c9a0"/>'),
    help: sv('<circle cx="8" cy="8" r="7" fill="#2c6ad8" stroke="#16408f"/><path d="M6 6.2a2 2 0 1 1 2.8 1.8c-.5.3-.8.6-.8 1.2v.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="12" r="1" fill="#fff"/>'),
  };
  const g = (n, s = 16) => `<span class="sh-g" style="width:${s}px;height:${s}px">${G[n] || ''}</span>`;
  const img = n => G[n] ? g(n) : ico(n, 16);

  /* ======================================================================================
     Popup menus (context menus, Views dropdown, address dropdown). Supports submenus.
     ====================================================================================== */
  let popRoot = null;
  const closePops = () => { document.querySelectorAll('.sh-pop').forEach(p => p.remove()); popRoot = null; };
  document.addEventListener('mousedown', e => { if (popRoot && !e.target.closest('.sh-pop')) closePops(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && popRoot) closePops(); });
  function popup(x, y, items, level = 0) {
    if (level === 0) closePops();
    const p = $('<div class="sh-pop"></div>');
    items.forEach(it => {
      if (!it) return;
      if (it.sep) { p.appendChild($('<div class="sh-pop-sep"></div>')); return; }
      const r = $(`<div class="sh-pop-i${it.disabled ? ' dis' : ''}${it.bold ? ' bold' : ''}"><span class="sh-pop-c">${it.radio ? '&#9679;' : it.checked ? '&#10003;' : ''}</span><span class="sh-pop-ic">${it.icon ? img(it.icon) : ''}</span><span class="sh-pop-l"></span><span class="sh-pop-a">${it.sub ? '&#9656;' : ''}</span></div>`);
      r.querySelector('.sh-pop-l').textContent = it.label;
      r.addEventListener('mouseenter', () => {
        p.querySelectorAll('.sh-pop').forEach(s => s.remove());
        [...document.querySelectorAll('.sh-pop')].filter(s => +s.dataset.level > level).forEach(s => s.remove());
        if (it.sub && !it.disabled) { const b = r.getBoundingClientRect(); popup(b.right - 3, b.top - 3, it.sub, level + 1); }
      });
      r.addEventListener('mousedown', e => e.stopPropagation());
      r.addEventListener('click', e => { e.stopPropagation(); if (it.disabled || it.sub) return; closePops(); it.action && it.action(); });
      p.appendChild(r);
    });
    p.dataset.level = level;
    p.style.left = '0px'; p.style.top = '0px';
    document.body.appendChild(p);
    const w = p.offsetWidth, h = p.offsetHeight;
    p.style.left = Math.max(0, Math.min(x, window.innerWidth - w - 2)) + 'px';
    p.style.top = Math.max(0, Math.min(y, window.innerHeight - h - 2 - (FR.mobile ? 46 : 0))) + 'px';   // phones: clear of the taskbar
    if (level === 0) popRoot = p;
    return p;
  }

  /* ======================================================================================
     Helpers: dates, sizes, types
     ====================================================================================== */
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function parseMod(s) {
    const m = /^(\d+)\/(\d+)\/(\d{4})\s+(\d+):(\d+)\s*(AM|PM)/i.exec(s || '');
    if (!m) return null;
    let h = +m[4] % 12; if (/pm/i.test(m[6])) h += 12;
    return new Date(+m[3], +m[1] - 1, +m[2], h, +m[5]);
  }
  const hm = d => { const h = d.getHours(); return `${(h % 12) || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
  const fmtShort = d => d ? `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${hm(d)}` : '';
  const fmtLong = d => d ? `${DAYS[d.getDay()]}, ${MONS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}, ${hm(d)}` : '';
  const fmtLongS = d => d ? `${DAYS[d.getDay()]}, ${MONS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}, ${hm(d).replace(' ', ':00 ')}` : '';
  const commas = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  function bytesOf(n) {
    if (!n || n.type === 'folder') return 0;
    if (typeof T[n.id] === 'string') return T[n.id].replace(/\n/g, '\r\n').length;
    const m = /([\d.]+)\s*(KB|MB|GB|bytes)/i.exec(n.size || '');
    if (!m) return 0;
    const mul = { bytes: 1, kb: 1024, mb: 1048576, gb: 1073741824 }[m[2].toLowerCase()];
    let h = 0; for (const c of n.id) h = (h * 31 + c.charCodeAt(0)) % 997;
    return mul === 1 ? parseFloat(m[1]) : Math.round(parseFloat(m[1]) * mul - (h / 997) * Math.min(mul, 1024) * 0.9);
  }
  const kb = b => b ? commas(Math.max(1, Math.ceil(b / 1024))) + ' KB' : '';
  function niceSize(b) {
    if (b < 1024) return `${b} bytes`;
    if (b < 1048576) return `${(b / 1024).toFixed(b < 10240 ? 2 : 1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
  }
  const extOf = n => (/\.([a-z0-9]+)$/i.exec(n.name || '') || [])[1]?.toLowerCase() || '';
  const TYPES = { xls: 'Microsoft Excel Worksheet', txt: 'Text Document', zip: 'Compressed (zipped) Folder', jpg: 'JPEG Image', eml: 'Outlook Express Mail Message', pdf: 'Adobe Acrobat Document', exe: 'Application', ini: 'Configuration Settings', log: 'Text Document', dll: 'Application Extension', bmp: 'Bitmap Image', dat: 'DAT File', sys: 'System file' };
  function typeOf(n) {
    if (!n) return '';
    if (n.fakeType) return n.fakeType;
    if (n.type === 'folder') return ({ cdrive: 'Local Disk', ddrive: 'CD Drive', pdrive: 'Disconnected Network Drive', mycomputer: 'System Folder', recycle: 'Recycle Bin', desktop: 'System Folder' })[n.id] || 'File Folder';
    return TYPES[extOf(n)] || (extOf(n).toUpperCase() + ' File');
  }
  const OPENS = { excel: 'Excel', notepad: 'Notepad', image: 'Windows Picture and Fax Viewer', mail: 'Outlook Express', zip: 'Compressed (zipped) Folders', pdf: 'Document Viewer', paint: 'Paint' };
  const OPENS_ICO = { excel: 'excel', notepad: 'notepad', image: 'image', mail: 'mail', zip: 'zip', pdf: 'txt', paint: 'paint' };
  const iconOf = n => n.id === 'recycle' ? (FR.fs.children('recycle').length ? 'recycleFull' : 'recycle') : (n.icon || (n.type === 'folder' ? 'folder' : 'txt'));
  const nameOf = n => n.id === 'mydocs' ? 'My Documents' : n.name;
  const inRecycle = n => n && n.parent === 'recycle';
  const inZip = n => n && n.parent === 'bankzip';

  const PARENT = { mydocs: 'desktop', mycomputer: 'desktop', recycle: 'desktop', desktop: null };
  const parentOf = id => (id in PARENT) ? PARENT[id] : (FR.fs.get(id) || {}).parent || null;
  function addrOf(id) {
    if (id === 'mycomputer') return 'My Computer';
    if (id === 'desktop') return 'Desktop';
    if (id === 'recycle') return 'Recycle Bin';
    if (id === 'mailatt') return 'C:\\Documents and Settings\\Frank Warmington\\Local Settings\\Temporary Internet Files\\OLK4';
    return FR.fs.path(id);
  }

  function denied(what, name) {
    const titles = { Rename: 'Error Renaming File or Folder', Delete: 'Error Deleting File or Folder', Move: 'Error Moving File or Folder', Copy: 'Error Copying File or Folder' };
    return FR.dialog({
      title: titles[what] || 'Error', icon: 'error',
      message: `Cannot ${what.toLowerCase()} ${esc(name)}: Access is denied.<br><br>Make sure the disk is not full or write-protected and that the file is not currently in use.`,
    });
  }

  const PRINTER = 'HP LaserJet 4 \u2014 Finance (no toner)';
  const printDlg = (title = 'Print') => FR.dialog({ title, icon: 'error', width: 400, message: `Unable to print.<br><br>Printer: <b>${PRINTER}</b><br>Status: No toner. Since March. Karen has a PO for toner. Diane has not signed it.` });

  /* ======================================================================================
     Password-protected zip (Bank.zip)
     ====================================================================================== */
  const ZIP_HINT = `<div class="sh-hint">(Frank's note on the zip comment field: "='P&amp;L Summary'!C12 — the one I broke. Fix it first.")</div>`;
  let zipBusy = null;
  function zipUnlock(zipNode, fileName) {
    if (FR.flags.get('bankzipOpen')) return Promise.resolve(true);
    if (zipBusy) return zipBusy;                       // re-entrancy guard: one password prompt at a time
    zipBusy = zipUnlockRun(zipNode, fileName).finally(() => { zipBusy = null; });
    return zipBusy;
  }
  async function zipUnlockRun(zipNode, fileName) {
    zipNode = FR.fs.get(zipNode) || FR.fs.get('bankzip');
    for (;;) {
      const fails = FR.state.flags.bankzipFails || 0;
      const r = await FR.dialog({
        title: 'Password needed', icon: 'key', width: 400,
        message: `The file '${esc(fileName)}' is password protected. Please enter the password below.${fails >= 3 ? ZIP_HINT : ''}`,
        input: { label: 'Password:', type: 'password' }, buttons: ['OK', 'Skip File', 'Cancel'],
      });
      if (r.button !== 'OK') return false;
      const v = String(r.value || '').trim().replace(/[\s,$]/g, '');
      if (v && v === String(zipNode.password)) {
        zipTypedNow = true;
        FR.flags.set('bankzipOpen', true); FR.sound.play('unlock');
        return true;
      }
      FR.state.flags.bankzipFails = fails + 1; FR.save();
      FR.puzzle && FR.puzzle.miss && FR.puzzle.miss();
      await FR.dialog({ title: 'Compressed (zipped) Folders', icon: 'error', message: `The password is incorrect. Please try again.${fails + 1 >= 3 ? ZIP_HINT : ''}` });
    }
  }
  const zipSeen = new Set();   // files opened from the zip in this session
  let zipTypedNow = false;     // the zip's password was typed in this session (not just remembered from an earlier one)
  async function openZipChild(n) {
    const known = FR.flags.get('bankzipOpen');
    if (!(await zipUnlock(n.parent, n.name))) return;
    // (F2, round 4) phones: opening a file from the zip AGAIN (or after a reload: the password was typed another time)
    // says why no password is asked, in a box where the password box used to be, so a tap aimed at "the password field"
    // and a typed password + Enter land in the box (Enter = Open), not in a cell of the workbook that would otherwise
    // have opened under the finger. (The first open right after typing the password opens at once.)
    const again = known && (zipSeen.has(n.id) || !zipTypedNow);
    zipSeen.add(n.id);
    if (again && FR.mobile) {
      const r = await FR.dialog({ icon: 'key', title: 'Compressed (zipped) Folders', width: 400, buttons: ['Open', 'Cancel'], enterKey: true,
        message: `Bank.zip is already unlocked: Windows remembered the password you typed earlier.<br><br>Open <b>${esc(n.name)}</b>?` });
      if (r.button !== 'Open') return;
    }
    FR.openFile(n);
  }

  /* ======================================================================================
     Fake system contents for "locked" folders (Program Files, WINDOWS)
     ====================================================================================== */
  const FAKE = {
    progfiles: [
      ['Common Files', 'd', '06/12/2019 9:14 AM'], ['Internet Explorer', 'd', '06/12/2019 9:15 AM'], ['Outlook Express', 'd', '06/12/2019 9:15 AM'],
      ['Microsoft Office', 'd', '11/03/2019 2:41 PM'], ['Prairie Ledger BankLink', 'd', '03/15/2024 10:22 AM'], ['Solitaire (MEWC face cards)', 'd', '10/03/2026 1:20 AM'],
      ['Speedrun Trainer for Spreadsheets', 'd', '09/19/2026 1:37 AM'], ['Windows Media Player', 'd', '06/12/2019 9:16 AM'], ['Windows NT', 'd', '06/12/2019 9:16 AM'],
    ],
    windows: [
      ['Fonts', 'd', '06/12/2019 9:12 AM'], ['Help', 'd', '06/12/2019 9:12 AM'], ['Media', 'd', '06/12/2019 9:12 AM'], ['system32', 'd', '09/30/2026 3:00 AM'],
      ['Temp', 'd', '10/06/2026 12:05 AM'], ['Web', 'd', '06/12/2019 9:13 AM'], ['explorer.exe', 'f', '06/12/2019 9:12 AM', '1,004 KB'], ['notepad.exe', 'f', '06/12/2019 9:12 AM', '68 KB'],
      ['system.ini', 'f', '06/12/2019 9:12 AM', '1 KB'], ['win.ini', 'f', '08/22/2021 4:40 PM', '1 KB'], ['WindowsUpdate.log', 'f', '10/06/2026 12:03 AM', '412 KB'],
    ],
  };
  const fakeItems = id => (FAKE[id] || []).map(([name, k, mod, size], i) => ({
    id: `fake:${id}:${i}`, name, type: k === 'd' ? 'folder' : 'file', fake: true, modified: mod, size: size || '',
    icon: k === 'd' ? 'folder' : null, g: k === 'd' ? null : (/\.exe$/.test(name) ? 'exe' : 'sysfile'), parent: id,
  }));

  /* ======================================================================================
     WINDOWS EXPLORER
     ====================================================================================== */
  const explorers = new Set();
  FR.bus.on('flag', d => { if (d && ['showHidden', 'showSystem', 'bankzipOpen'].includes(d.k)) explorers.forEach(x => x.render()); });
  FR.bus.on('fs-change', () => explorers.forEach(x => x.render()));

  function explorer(target) {
    let node = FR.fs.get(target || 'mydocs') || FR.fs.get('mydocs');
    if (node.type === 'file' && node.app !== 'zip') return FR.openFile(node);
    if (node.empty) { emptyDriveError(node); return null; }
    for (const x of explorers) if (x.cur === node.id && !x.search) { x.win.restore(); x.win.focus(); return x.win; }
    // (R3b S7) phones: one Explorer window, reused (Back goes to where it was): a checklist chip or a desktop icon
    // doesn't pile up another full-screen window each time
    if (FR.mobile) {
      const x = [...explorers].filter(v => FR.wm.wins.has(v.win.id)).sort((a, b) => (b.win._used || 0) - (a.win._used || 0))[0];
      if (x && x.go(node.id, true) !== false) { x.win.restore(); x.win.focus(); return x.win; }
    }
    const X = new Explorer(node.id);
    return X.win;
  }
  function emptyDriveError(n) {
    const letter = (/\(([A-Z]):\)/.exec(n.name) || [])[1] || '';
    const parts = n.empty.split('\n\n');
    return FR.dialog({ title: n.id === 'pdrive' ? 'Error' : `${letter}:\\`, icon: 'error', width: 400, message: parts.map(esc).join('<br><br>') });
  }

  class Explorer {
    constructor(id) {
      this.cur = null; this.back = []; this.fwd = []; this.sel = null; this.views = {}; this.sort = { k: 'name', d: 1 };
      this.pane = 'tasks'; this.revealed = new Set(); this.collapsed = {}; this.search = null; this.exp = new Set(['desktop', 'mycomputer']);
      this.statusOn = true;
      const root = $(`<div class="ex">
        <div class="ex-bars">
          <div class="ex-tb">
            <button class="ex-b ex-b-lbl" data-a="back" title="Back">${ico('back', 24)}<span class="ex-bt">Back</span><span class="ex-b-dd">${G.dd}</span></button>
            <button class="ex-b" data-a="fwd" title="Forward">${ico('forward', 24)}<span class="ex-b-dd">${G.dd}</span></button>
            <button class="ex-b" data-a="up" title="Up">${ico('up', 24)}</button>
            <span class="ex-tsep"></span>
            <button class="ex-b ex-b-lbl" data-a="search" title="Search">${ico('search', 24)}<span class="ex-bt">Search</span></button>
            <button class="ex-b ex-b-lbl" data-a="folders" title="Folders">${ico('folderOpen', 24)}<span class="ex-bt">Folders</span></button>
            <span class="ex-tsep"></span>
            <button class="ex-b" data-a="views" title="Views">${ico('views', 24)}<span class="ex-b-dd">${G.dd}</span></button>
          </div>
          <div class="ex-addr">
            <span class="ex-addr-l">Address</span>
            <div class="ex-addr-box"><span class="ex-addr-i"></span><input type="text" spellcheck="false" autocomplete="off"><span class="ex-addr-dd" title="Address list"></span></div>
            <button class="ex-go">${g('go')}<span>Go</span></button>
          </div>
        </div>
        <div class="ex-main"><div class="ex-side"></div><div class="ex-view" tabindex="0"></div></div>
      </div>`);
      this.root = root;
      this.side = root.querySelector('.ex-side');
      this.view = root.querySelector('.ex-view');
      this.addr = root.querySelector('.ex-addr input');
      const n0 = FR.fs.get(id);
      this.win = FR.wm.open({
        title: nameOf(n0), icon: iconOf(n0), width: 820, height: 560, className: 'ex-win', content: root,
        menu: this.menus(), statusBar: ['', '', ''], onClose: () => { explorers.delete(this); },
      });
      explorers.add(this);
      this.wire();
      this.go(id, false);
      if (window.ResizeObserver) new ResizeObserver(() => this.fit()).observe(root);
    }
    fit() {
      const w = this.root.clientWidth;
      this.root.classList.toggle('ex-narrow', w < 600);
      this.root.classList.toggle('ex-tiny', w < 440);
    }
    get node() { return FR.fs.get(this.cur); }
    defaultView(id) { return this.views[id] || (id === 'recycle' || id === 'bankzip' || id === 'windows' || id === 'progfiles' ? 'details' : 'tiles'); }
    get mode() { return this.search ? (this.search.view || 'details') : this.defaultView(this.cur); }
    set mode(v) { if (this.search) this.search.view = v; else this.views[this.cur] = v; this.render(); }

    go(id, push = true) {
      const n = FR.fs.get(id);
      if (!n) return false;
      if (n.type === 'file' && n.app !== 'zip') { if (inZip(n)) openZipChild(n); else FR.openFile(n); return false; }
      if (n.empty) { emptyDriveError(n); return false; }
      if (push && this.cur && (this.cur !== id || this.search)) { this.back.push(this.cur); this.fwd = []; }
      if (push && this.cur) FR.sound.play('nav');
      this.cur = id; this.sel = null; this.search = null;
      let p = parentOf(id); while (p) { this.exp.add(p); p = parentOf(p); }
      this.render();
      return true;
    }
    doBack() { if (this.search) { this.search = null; this.render(); return; } const p = this.back.pop(); if (p) { FR.sound.play('nav'); this.fwd.push(this.cur); this.cur = p; this.sel = null; this.render(); } }
    doFwd() { const p = this.fwd.pop(); if (p) { FR.sound.play('nav'); this.back.push(this.cur); this.cur = p; this.sel = null; this.search = null; this.render(); } }
    doUp() { const p = parentOf(this.cur); if (p) this.go(p); }

    /* ----- items of the current folder ----- */
    items() {
      const id = this.cur, n = this.node;
      if (this.search) return this.search.results;
      if (id === 'desktop') return ['mydocs', 'mycomputer', 'recycle'].map(i => FR.fs.get(i)).concat(FR.fs.children('desktop'));
      if (n.locked && !(this.revealed.has(id) || showSystem())) return null;
      if (n.locked) return fakeItems(id);
      if (id === 'bankzip') return FR.fs.children('bankzip', { showHidden: true });
      return FR.fs.children(id);
    }
    hiddenCount() {
      if (showHidden() || this.search || ['desktop', 'mycomputer', 'recycle', 'bankzip'].includes(this.cur)) return 0;
      return FR.fs.children(this.cur, { showHidden: true }).filter(n => n.hidden).length;
    }
    sorted(list) {
      const { k, d } = this.sort;
      const key = n => k === 'size' ? bytesOf(n) : k === 'type' ? typeOf(n) : k === 'modified' ? (parseMod(n.modified) || 0) - 0 : k === 'origin' ? (n.origin || '') : k === 'folder' ? FR.fs.path(n.parent) : nameOf(n).toLowerCase();
      return list.slice().sort((a, b) => {
        const fa = a.type === 'folder' ? 0 : 1, fb = b.type === 'folder' ? 0 : 1;
        if (fa !== fb && k !== 'type') return fa - fb;
        const x = key(a), y = key(b);
        return (x < y ? -1 : x > y ? 1 : 0) * d || nameOf(a).localeCompare(nameOf(b));
      });
    }
    findItem(id) { return (this._items || []).find(i => i.id === id); }

    /* ----- rendering ----- */
    render() {
      const n = this.node, win = this.win;
      const title = this.search ? 'Search Results' : nameOf(n);
      win.setTitle(title);
      const icn = this.search ? 'search' : iconOf(n);
      if (this._icn !== icn) { this._icn = icn; if (win.setIcon) win.setIcon(icn); }
      this.addr.value = this.search ? 'Search Results' : addrOf(this.cur);
      if (FR.mobile) setTimeout(() => { this.addr.scrollLeft = this.addr.scrollWidth; }, 0);   // phones: show the end of a long path
      this.root.querySelector('.ex-addr-i').innerHTML = ico(icn, 16);
      const tb = this.root.querySelector('.ex-tb');
      tb.querySelector('[data-a=back]').disabled = !this.back.length && !this.search;
      tb.querySelector('[data-a=fwd]').disabled = !this.fwd.length;
      tb.querySelector('[data-a=up]').disabled = !parentOf(this.cur);
      tb.querySelector('[data-a=folders]').classList.toggle('on', this.pane === 'folders');
      tb.querySelector('[data-a=search]').classList.toggle('on', this.pane === 'search');
      this.renderView();
      this.renderSide();
      this.renderStatus();
      this.fit();
    }

    renderView() {
      const v = this.view, list = this.items(), n = this.node;
      v.className = 'ex-view';
      this._items = list || [];
      if (list === null) {
        const [head, ...rest] = n.locked.split(/(?<=\.)\s/);
        v.innerHTML = `<div class="ex-lockpage">${g('shield', 32)}<div><div class="ex-lock-h">${esc(head)}</div><div class="ex-lock-t">${esc(rest.join(' '))}</div><a class="ex-link" data-reveal="1">Show the contents of this folder</a></div></div>`;
        return;
      }
      const mode = this.mode;
      v.classList.add('ex-v-' + mode);
      if (this.cur === 'mycomputer' && !this.search) {
        const groups = [
          ['Files Stored on This Computer', [FR.fs.get('mydocs')], { mydocs: "Frank Warmington's Documents" }],
          ['Hard Disk Drives', [FR.fs.get('cdrive')]],
          ['Devices with Removable Storage', [FR.fs.get('ddrive')]],
          ['Network Drives', [FR.fs.get('pdrive')]],
        ];
        this._items = groups.flatMap(g => g[1]);
        this._alias = { mydocs: "Frank Warmington's Documents" };
        if (mode === 'details') v.innerHTML = this.detailsHTML(this._items, groups);
        else v.innerHTML = groups.map(([t, its]) => `<div class="ex-grp"><div class="ex-grp-h">${esc(t)}</div><div class="ex-grp-b ex-${mode}">${its.map(i => this.itemHTML(i, mode)).join('')}</div></div>`).join('');
      } else {
        this._alias = {};
        const items = this.cur === 'desktop' && !this.search ? list.slice(0, 3).concat(this.sorted(list.slice(3))) : this.sorted(list);
        this._items = items;
        if (!items.length) { v.innerHTML = (mode === 'details' ? this.detailsHTML([]) : '') + (this.search ? '' : '<div class="ex-emptymsg">This folder is empty.</div>'); }
        else if (mode === 'details') v.innerHTML = this.detailsHTML(items);
        else v.innerHTML = `<div class="ex-${mode}">${items.map(i => this.itemHTML(i, mode)).join('')}</div>`;
      }
      this.paintSel();
    }
    label(i) { return this._alias[i.id] || nameOf(i); }
    icoHTML(i, size) {
      if (i.g) return `<span class="ex-ico${i.hidden ? ' ex-hid' : ''}">${g(i.g, size)}</span>`;
      const nm = iconOf(i) === 'folderHidden' ? 'folder' : iconOf(i);
      return `<span class="ex-ico${i.hidden ? ' ex-hid' : ''}">${ico(nm, size)}</span>`;
    }
    subLines(i) {
      if (i.id === 'cdrive') return ['Local Disk', '3.21 GB free of 37.6 GB'];
      if (i.id === 'ddrive') return ['CD Drive', ''];
      if (i.id === 'pdrive') return ['Disconnected Network Drive', ''];
      if (i.id === 'mydocs' && this.cur === 'mycomputer') return ['File Folder', ''];
      if (i.id === 'mycomputer') return ['System Folder', ''];
      if (i.id === 'recycle') return ['Recycle Bin', ''];
      if (i.type === 'folder') return ['File Folder', ''];
      return [typeOf(i), i.fake ? i.size : kb(bytesOf(i))];
    }
    itemHTML(i, mode) {
      const nm = esc(this.label(i));
      const cls = `ex-it${i.hidden ? ' ex-ishid' : ''}`;
      if (mode === 'tiles') {
        const [a, b] = this.subLines(i);
        return `<div class="${cls} ex-tile" data-id="${esc(i.id)}" title="${nm}">${this.icoHTML(i, 48)}<div class="ex-tt"><div class="ex-nm">${nm}</div><div class="ex-sub">${esc(a)}</div>${b ? `<div class="ex-sub">${esc(b)}</div>` : ''}</div></div>`;
      }
      if (mode === 'icons') return `<div class="${cls} ex-icon" data-id="${esc(i.id)}" title="${nm}">${this.icoHTML(i, 32)}<div class="ex-nm">${nm}</div></div>`;
      return `<div class="${cls} ex-li" data-id="${esc(i.id)}">${this.icoHTML(i, 16)}<span class="ex-nm">${nm}</span></div>`;
    }
    detailsHTML(items, groups) {
      const rec = this.cur === 'recycle' && !this.search, zip = this.cur === 'bankzip' && !this.search, srch = !!this.search;
      let cols;
      if (rec) cols = [['name', 'Name', 150], ['origin', 'Original Location', 152], ['modified', 'Date Deleted', 126], ['size', 'Size', 48, 'r'], ['type', 'Type', 110]];
      else if (zip) cols = [['name', 'Name', 200], ['type', 'Type', 150], ['packed', 'Packed Size', 80, 'r'], ['pw', 'Password Protected', 110], ['size', 'Size', 70, 'r'], ['ratio', 'Ratio', 50, 'r'], ['modified', 'Date Modified', 130]];
      else if (srch) cols = [['name', 'Name', 220], ['folder', 'In Folder', 300], ['size', 'Size', 70, 'r'], ['type', 'Type', 170], ['modified', 'Date Modified', 130]];
      else if (this.cur === 'mycomputer') cols = [['name', 'Name', 220], ['type', 'Type', 150], ['total', 'Total Size', 80, 'r'], ['free', 'Free Space', 80, 'r']];
      else cols = [['name', 'Name', 220], ['size', 'Size', 64, 'r'], ['type', 'Type', 164], ['modified', 'Date Modified', 124]];
      const val = (i, k) => {
        switch (k) {
          case 'name': return `${this.icoHTML(i, 16)}<span class="ex-nm">${esc(this.label(i))}</span>`;
          case 'size': return i.type === 'folder' ? '' : (i.fake ? i.size : kb(bytesOf(i)));
          case 'type': return esc(typeOf(i));
          case 'modified': return esc(i.fake ? fmtShort(parseMod(i.modified)) : fmtShort(parseMod(i.modified)));
          case 'origin': return esc(i.origin || '');
          case 'folder': return esc(FR.fs.path(i.parent));
          case 'packed': { const b = bytesOf(i); return kb(Math.round(b * (/\.xls$/.test(i.name) ? 0.21 : 0.34))); }
          case 'pw': return 'Yes';
          case 'ratio': return /\.xls$/.test(i.name) ? '79%' : '66%';
          case 'total': return i.id === 'cdrive' ? '37.6 GB' : '';
          case 'free': return i.id === 'cdrive' ? '3.21 GB' : '';
        }
        return '';
      };
      const sk = this.sort.k;
      const head = `<thead><tr>${cols.map(([k, t, w, al]) => `<th data-sort="${k}" class="${sk === k ? 'srt' : ''}${al ? ' r' : ''}" style="width:${w}px"><span>${t}</span>${sk === k ? `<i class="ex-arr">${this.sort.d > 0 ? '&#9650;' : '&#9660;'}</i>` : ''}</th>`).join('')}<th class="ex-fill"></th></tr></thead>`;
      const row = i => `<tr class="ex-it${i.hidden ? ' ex-ishid' : ''}" data-id="${esc(i.id)}">${cols.map(([k, , , al]) => `<td class="${k === sk ? 'srt' : ''}${al ? ' r' : ''}${k === 'name' ? ' ex-tdn' : ''}">${val(i, k)}</td>`).join('')}<td></td></tr>`;
      let body;
      if (groups) body = groups.map(([t, its]) => `<tr class="ex-grow"><td colspan="${cols.length + 1}"><div class="ex-grp-h">${esc(t)}</div></td></tr>` + its.map(row).join('')).join('');
      else body = items.map(row).join('');
      return `<table class="ex-det">${head}<tbody>${body}</tbody></table>`;
    }
    paintSel() {
      this.view.querySelectorAll('.ex-it').forEach(e => e.classList.toggle('sel', e.dataset.id === this.sel));
    }
    select(id) {
      if (this.sel === id) return;
      this.sel = id; this.paintSel(); this.renderSide(); this.renderStatus();
    }

    /* ----- left pane ----- */
    renderSide() {
      const s = this.side;
      s.className = 'ex-side ex-side-' + this.pane;
      if (this.pane === 'folders') return this.renderTree();
      if (this.pane === 'search') return this.renderSearch();
      const n = this.node, sel = this.sel ? this.findItem(this.sel) : null;
      const panels = [];
      const link = (act, icon, text, extra = '') => `<a class="ex-task" data-act="${act}"${extra}>${img(icon)}<span>${esc(text)}</span></a>`;
      const place = id => { const p = FR.fs.get(id); return `<a class="ex-task" data-go="${id}">${ico(iconOf(p), 16)}<span>${esc(id === 'mydocs' ? 'My Documents' : p.name)}</span></a>`; };
      if (this.cur === 'mycomputer') {
        panels.push({ k: 'sys', t: 'System Tasks', special: true, b: link('sysinfo', 'sysinfo', 'View system information') + link('addrem', 'addrem', 'Add or remove programs') + link('setting', 'setting', 'Change a setting') });
        panels.push({ k: 'other', t: 'Other Places', b: ['desktop', 'mydocs'].map(place).join('') + link('cpanel', 'controlpanel', 'Control Panel') });
      } else if (this.cur === 'recycle') {
        panels.push({ k: 'rb', t: 'Recycle Bin Tasks', special: true, b: link('emptyrb', 'empty', 'Empty the Recycle Bin') + (sel ? link('restore1', 'restore', 'Restore this item') : link('restoreall', 'restore', 'Restore all items')) });
        panels.push({ k: 'other', t: 'Other Places', b: ['desktop', 'mydocs', 'mycomputer'].map(place).join('') });
      } else {
        if (this.cur === 'bankzip') panels.push({ k: 'zip', t: 'Folder Tasks', special: true, b: link('extract', 'extract', 'Extract all files') });
        let tasks;
        const kind = sel ? (sel.type === 'folder' ? 'folder' : 'file') : null;
        if (kind) {
          tasks = link('rename', 'rename', `Rename this ${kind}`) + link('move', 'move', `Move this ${kind}`) + link('copy', 'copy', `Copy this ${kind}`) +
            link('publish', 'web', `Publish this ${kind} to the Web`) + (kind === 'folder' ? link('share', 'share', 'Share this folder') : '') +
            link('email', 'email', kind === 'folder' ? "E-mail this folder's files" : 'E-mail this file') + (kind === 'file' ? link('print', 'print', 'Print this file') : '') +
            link('delete', 'del', `Delete this ${kind}`);
        } else tasks = link('newfolder', 'newfolder', 'Make a new folder') + link('publish', 'web', 'Publish this folder to the Web') + link('share', 'share', 'Share this folder');
        if (this.cur !== 'desktop' && this.cur !== 'bankzip' && !(n.locked && !this.revealed.has(this.cur) && !showSystem()))
          panels.push({ k: 'ff', t: 'File and Folder Tasks', b: tasks });
        const others = [];
        const par = parentOf(this.cur);
        if (par && !['desktop', 'mydocs', 'mycomputer'].includes(par)) others.push(par);
        ['desktop', 'mydocs', 'mycomputer'].forEach(o => { if (o !== this.cur) others.push(o); });
        panels.push({ k: 'other', t: 'Other Places', b: [...new Set(others)].map(place).join('') });
      }
      panels.push({ k: 'det', t: 'Details', b: this.detailsPanel(sel) });
      s.innerHTML = panels.map(p => `<div class="ex-panel${p.special ? ' sp' : ''}${this.collapsed[p.k] ? ' col' : ''}" data-k="${p.k}"><div class="ex-ph"><span>${esc(p.t)}</span><i class="ex-chev">${this.collapsed[p.k] ? G.chevDown : G.chevUp}</i></div><div class="ex-pb">${p.b}</div></div>`).join('');
    }
    detailsPanel(sel) {
      const i = sel || (this.search ? null : this.node);
      if (!i) return `<b>Search Results</b><br>${this._items.length} items found`;
      const lines = [];
      const nm = sel ? this.label(i) : nameOf(i);
      if (i.id === 'cdrive') lines.push('Local Disk', '', 'File System: NTFS', 'Free Space: 3.21 GB', 'Total Size: 37.6 GB');
      else if (i.id === 'ddrive') lines.push('CD Drive');
      else if (i.id === 'pdrive') lines.push('Disconnected Network Drive', '', '\\\\PACKA-FS01\\finance');
      else if (i.id === 'mycomputer' || i.id === 'desktop') lines.push('System Folder');
      else if (i.id === 'recycle') lines.push('Recycle Bin', '', `${FR.fs.children('recycle').length} objects`);
      else {
        lines.push(typeOf(i));
        if (i.fake) { lines.push(''); lines.push('Attributes: Hidden, System'); }
        else {
          const d = parseMod(i.modified);
          if (inRecycle(i) && i.origin) { lines.push('', 'Original Location: ' + i.origin); }
          if (d) { lines.push(''); lines.push(`${inRecycle(i) ? 'Date Deleted' : 'Date Modified'}: ${fmtLong(d)}`); }
          if (i.type === 'file') lines.push('Size: ' + niceSize(bytesOf(i)));
          if (i.author) lines.push('Author: ' + i.author);
          if (inZip(i)) lines.push('Password protected: Yes');
          if (i.hidden) lines.push('Attributes: Hidden');
        }
      }
      return `<div class="ex-dt"><b>${esc(nm)}</b>${lines.map(l => l === '' ? '<div class="ex-dgap"></div>' : `<div>${esc(l)}</div>`).join('')}</div>`;
    }
    renderTree() {
      const kids = id => {
        if (id === 'desktop') return ['mydocs', 'mycomputer', 'recycle'];
        if (id === 'mycomputer') return ['cdrive', 'ddrive', 'pdrive'];
        const n = FR.fs.get(id);
        if (!n || n.empty || n.locked || id === 'recycle' || id === 'bankzip') return [];
        return FR.fs.children(id).filter(c => c.type === 'folder' || c.app === 'zip').sort((a, b) => (a.type === 'folder' ? 0 : 1) - (b.type === 'folder' ? 0 : 1) || a.name.localeCompare(b.name)).map(c => c.id);
      };
      const hasKids = id => ['desktop', 'mycomputer', 'ddrive', 'pdrive', 'progfiles', 'windows'].includes(id) || kids(id).length > 0;
      const row = (id, depth) => {
        const n = FR.fs.get(id), k = kids(id), open = this.exp.has(id);
        const box = hasKids(id) ? `<i class="ex-tx" data-tog="${id}">${open && k.length ? '&minus;' : '+'}</i>` : '<i class="ex-tx ex-tx0"></i>';
        return `<div class="ex-tr${this.cur === id && !this.search ? ' cur' : ''}${n.hidden ? ' ex-ishid' : ''}" style="padding-left:${depth * 19 + 2}px" data-go="${id}">${box}<span class="ex-ico${n.hidden ? ' ex-hid' : ''}">${ico(iconOf(n) === 'folderHidden' ? 'folder' : iconOf(n), 16)}</span><span class="ex-trl">${esc(nameOf(n))}</span></div>` +
          (open ? k.map(c => row(c, depth + 1)).join('') : '');
      };
      this.side.innerHTML = `<div class="ex-fp"><div class="ex-fp-h"><span>Folders</span><button class="ex-fp-x" data-closepane="1" title="Close">${G.close}</button></div><div class="ex-fp-b">${row('desktop', 0)}</div></div>`;
      const cur = this.side.querySelector('.ex-tr.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
    }
    renderSearch() {
      const s = this.search || {};
      this.side.innerHTML = `<div class="ex-fp ex-sp"><div class="ex-fp-h"><span>Search Companion</span><button class="ex-fp-x" data-closepane="1" title="Close">${G.close}</button></div>
        <div class="ex-sp-b"><div class="ex-sp-t">Search by any or all of the criteria below.</div>
        <label>All or part of the file name:</label><input type="text" class="ex-sq-n" value="${esc(s.qn || '')}">
        <label>A word or phrase in the file:</label><input type="text" class="ex-sq-w" value="${esc(s.qw || '')}">
        <label>Look in:</label><select class="ex-sq-l"><option value="cdrive">Local Disk (C:)</option><option value="mydocs">My Documents</option><option value="__cur">${esc(this.search ? 'Previous folder' : nameOf(this.node))}</option></select>
        <div class="ex-sp-btns"><button class="ex-sq-go">Search</button></div>
        ${this.search ? `<div class="ex-sp-r">${this.search.results.length} file(s) found.</div>` : ''}</div></div>`;
      const sel = this.side.querySelector('.ex-sq-l'); sel.value = s.root === 'mydocs' ? 'mydocs' : s.root === 'cdrive' || !s.root ? 'cdrive' : '__cur';
      const run = () => {
        const qn = this.side.querySelector('.ex-sq-n').value.trim(), qw = this.side.querySelector('.ex-sq-w').value.trim();
        const lv = sel.value, rootId = lv === '__cur' ? (s.root || this.cur) : lv;
        const res = [];
        const walk = id => FR.fs.children(id).forEach(c => {
          if (c.id === 'recycle') return;
          const nm = c.name.toLowerCase();
          const re = qn ? new RegExp('^' + qn.toLowerCase().split('*').map(p => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$') : null;
          const okN = !qn || (qn.includes('*') ? re.test(nm) : nm.includes(qn.toLowerCase()));
          const okW = !qw || (typeof T[c.id] === 'string' && T[c.id].toLowerCase().includes(qw.toLowerCase()));
          if ((qn || qw) && okN && okW) res.push(c);
          if (c.type === 'folder' && !c.locked && !c.empty) walk(c.id);
        });
        walk(rootId === 'cdrive' ? 'cdrive' : rootId);
        if (!this.search) { this.back.push(this.cur); this.fwd = []; }
        this.search = { qn, qw, root: rootId, results: res };
        this.sel = null; this.render();
      };
      this.side.querySelector('.ex-sq-go').onclick = run;
      this.side.querySelectorAll('input').forEach(i => (i.onkeydown = e => { if (e.key === 'Enter') run(); }));
    }
    renderStatus() {
      const list = this._items || [];
      const sel = this.sel ? this.findItem(this.sel) : null;
      const zone = `${ico(this.cur === 'recycle' ? 'recycle' : 'computer', 16)}<span>My Computer</span>`;
      if (!this.statusOn) return;
      if (sel && sel.type === 'file' && !sel.fake) {
        const d = parseMod(sel.modified);
        this.win.setStatus(0, esc(`Type: ${typeOf(sel)} ${inRecycle(sel) ? 'Date Deleted' : 'Date Modified'}: ${fmtShort(d)} Size: ${niceSize(bytesOf(sel))}`));
        this.win.setStatus(1, esc(niceSize(bytesOf(sel))));
      } else if (sel) {
        this.win.setStatus(0, '1 object(s) selected'); this.win.setStatus(1, '');
      } else {
        const h = this.hiddenCount();
        const total = list.reduce((a, i) => a + (i.fake ? 0 : bytesOf(i)), 0);
        this.win.setStatus(0, this.node.locked && list.length === 0 && !this.revealed.has(this.cur) ? '0 objects' : `${list.length} objects${h ? ` (plus ${h} hidden)` : ''}`);
        this.win.setStatus(1, total ? esc(niceSize(total)) : '');
      }
      this.win.setStatus(2, zone);
    }

    /* ----- actions ----- */
    openItem(i) {
      if (!i) return;
      if (i.fake) {
        if (i.type === 'folder') return FR.dialog({ title: i.name, icon: 'error', message: `${esc(FR.fs.path(i.parent))}\\${esc(i.name)} is not accessible.<br><br>Access is denied.` });
        return FR.dialog({ title: i.name, icon: 'warn', message: 'This operation has been cancelled due to restrictions in effect on this computer. Please contact your system administrator.<br><br><i>(The administrator is Frank.)</i>' });
      }
      if (inZip(i)) return openZipChild(i);
      if (i.type === 'folder' || i.app === 'zip') return this.go(i.id);
      FR.openFile(i);
    }
    async task(act) {
      const sel = this.sel ? this.findItem(this.sel) : null;
      const nm = sel ? this.label(sel) : nameOf(this.node);
      switch (act) {
        case 'rename': return denied('Rename', nm);
        case 'move': return denied('Move', nm);
        case 'copy': return denied('Copy', nm);
        case 'delete': {
          if (!sel || sel.fake) return;
          const r = await FR.dialog({ title: sel.type === 'folder' ? 'Confirm Folder Delete' : 'Confirm File Delete', icon: 'question', buttons: ['Yes', 'No'], message: `Are you sure you want to send '${esc(nm)}' to the Recycle Bin?` });
          // only files the player made (Paint pictures) can really be deleted; everything of Frank's is protected
          if (r.button === 'Yes') { if (sel.onDelete) { FR.sound.play('recycle'); this.sel = null; return sel.onDelete(); } return denied('Delete', nm); }
          return;
        }
        case 'publish': return FR.dialog({ title: 'Web Publishing Wizard', icon: 'error', message: 'The Web Publishing Wizard could not connect to the Internet.<br><br>Check your connection settings, or ask your network administrator.' });
        case 'share': return FR.dialog({ title: 'Sharing', icon: 'info', message: 'As a security measure, Windows has disabled remote access to this computer.<br><br>(Frank really does not share.)' });
        case 'email': return FR.dialog({ title: 'Send To Mail Recipient', icon: 'info', message: 'To send files, open Outlook Express and attach them from there.' });
        case 'print': return printDlg();
        case 'newfolder': return FR.dialog({ title: 'Error Creating Folder', icon: 'error', message: 'Unable to create the folder \'New Folder\'. Access is denied.' });
        case 'extract': {
          if (await zipUnlock('bankzip', 'Loan_Agreement_Excerpt.txt'))
            FR.dialog({ title: 'Extraction Wizard', icon: 'info', message: 'The password was accepted.<br><br>Double-click a file in this compressed folder to open it.' });
          return;
        }
        case 'emptyrb': {
          const c = FR.fs.children('recycle').length;
          const r = await FR.dialog({ title: 'Confirm Multiple File Delete', icon: 'question', buttons: ['Yes', 'No'], message: `Are you sure you want to delete these ${c} items?` });
          if (r.button === 'Yes') FR.sound.play('recycle');
          if (r.button === 'Yes') setTimeout(() => FR.dialog({ title: 'Recycle Bin', icon: 'error', message: "Frank has disabled emptying the Recycle Bin.<br><br>'Evidence.' —F" }), 450);
          return;
        }
        case 'restoreall': case 'restore1':
          return FR.dialog({ title: 'Error Restoring File', icon: 'error', message: `Cannot restore ${act === 'restoreall' ? 'items' : esc(nm)}: Access is denied.<br><br>The source file may be in use.` });
        case 'sysinfo': return sysProps();
        case 'addrem': return FR.dialog({ title: 'Add or Remove Programs', icon: 'error', message: 'Your system administrator has disabled Add or Remove Programs.' });
        case 'setting': case 'cpanel': return FR.dialog({ title: 'Control Panel', icon: 'error', message: 'This operation has been cancelled due to restrictions in effect on this computer. Please contact your system administrator.' });
      }
    }
    ctxItem(i, x, y) {
      const isF = i.type === 'folder' && !i.fake;
      popup(x, y, [
        { label: 'Open', bold: true, action: () => this.openItem(i) },
        isF ? { label: 'Explore', action: () => explorer(i.id) } : null,
        i.app === 'zip' ? { label: 'Extract All...', action: () => this.task('extract') } : null,
        i.type === 'file' && !i.fake ? { label: 'Open With', sub: [{ label: OPENS[i.app] || 'Notepad', icon: OPENS_ICO[i.app] || 'notepad', action: () => this.openItem(i) }] } : null,
        { sep: true },
        { label: 'Send To', disabled: true },
        { sep: true },
        { label: 'Cut', disabled: true }, { label: 'Copy', disabled: true },
        { sep: true },
        { label: 'Create Shortcut', disabled: true },
        { label: 'Delete', disabled: !!i.fake || i.id === 'mycomputer', action: () => this.task('delete') },
        { label: 'Rename', disabled: !!i.fake, action: () => this.task('rename') },
        { sep: true },
        { label: 'Properties', disabled: !!i.fake, action: () => properties(i.id) },
      ]);
    }
    ctxBg(x, y) {
      const m = this.mode;
      popup(x, y, [
        { label: 'View', sub: this.viewItems(m) },
        { label: 'Arrange Icons By', sub: this.arrangeItems() },
        { label: 'Refresh', action: () => this.render() },
        { sep: true },
        { label: 'Customize This Folder...', disabled: true },
        { sep: true },
        { label: 'Paste', disabled: true }, { label: 'Paste Shortcut', disabled: true },
        { sep: true },
        { label: 'New', disabled: true },
        { sep: true },
        { label: 'Properties', action: () => properties(this.cur) },
      ]);
    }
    viewItems(m) {
      return [{ label: 'Thumbnails', disabled: true }, ...['Tiles', 'Icons', 'List', 'Details'].map(t => ({ label: t, radio: m === t.toLowerCase(), action: () => { this.mode = t.toLowerCase(); } }))];
    }
    arrangeItems() {
      const ks = this.cur === 'recycle' ? [['name', 'Name'], ['origin', 'Original Location'], ['modified', 'Date Deleted'], ['type', 'Type'], ['size', 'Size']] : [['name', 'Name'], ['size', 'Size'], ['type', 'Type'], ['modified', 'Modified']];
      return ks.map(([k, t]) => ({ label: t, radio: this.sort.k === k, action: () => { this.sort = { k, d: 1 }; this.render(); } }));
    }
    navAddress(raw) {
      const s = raw.trim();
      if (!s) return;
      if (/^(https?:\/\/|www\.)/i.test(s) || /\.(com|net|org)(\/|$)/i.test(s)) { FR.apps.ie(s); this.addr.value = addrOf(this.cur); return; }
      const hit = resolvePath(s);
      if (!hit) {
        const hiddenHit = resolvePath(s, true);
        FR.dialog({ title: s, icon: 'error', width: 420, message: hiddenHit
          ? `Windows cannot find '${esc(s)}'.<br><br>The folder may be hidden. To show hidden files and folders, click <b>Tools &rsaquo; Folder Options</b>, and then the <b>View</b> tab.`
          : `Windows cannot find '${esc(s)}'. Check the spelling and try again, or try searching for the item by clicking Start and then clicking Search.` });
        this.addr.value = addrOf(this.cur);
        return;
      }
      if (hit.type === 'folder' || hit.app === 'zip') this.go(hit.id);
      else { this.addr.value = addrOf(this.cur); this.openItem(hit); }
    }

    wire() {
      const r = this.root, v = this.view;
      r.querySelector('.ex-tb').addEventListener('click', e => {
        const b = e.target.closest('.ex-b'); if (!b || b.disabled) return;
        const a = b.dataset.a;
        if (a === 'back') { if (e.target.closest('.ex-b-dd')) return this.histMenu(b, this.back.slice().reverse(), 'back'); this.doBack(); }
        if (a === 'fwd') { if (e.target.closest('.ex-b-dd')) return this.histMenu(b, this.fwd.slice().reverse(), 'fwd'); this.doFwd(); }
        if (a === 'up') this.doUp();
        if (a === 'folders') { this.pane = this.pane === 'folders' ? 'tasks' : 'folders'; this.renderSide(); this.render(); }
        if (a === 'search') { this.pane = this.pane === 'search' ? 'tasks' : 'search'; this.render(); if (this.pane === 'search') { const i = this.side.querySelector('.ex-sq-n'); i && i.focus(); } }
        if (a === 'views') { const bb = b.getBoundingClientRect(); popup(bb.left, bb.bottom, this.viewItems(this.mode)); }
      });
      const go = () => this.navAddress(this.addr.value);
      this.addr.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      this.addr.addEventListener('focus', () => this.addr.select());
      r.querySelector('.ex-go').onclick = go;
      r.querySelector('.ex-addr-dd').addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        const box = r.querySelector('.ex-addr-box').getBoundingClientRect();
        const p = popup(box.left, box.bottom, ['desktop', 'mydocs', 'mycomputer', 'cdrive', 'ddrive', 'pdrive', 'recycle'].map(id => ({ label: id === 'mydocs' ? 'My Documents' : FR.fs.get(id).name, icon: iconOf(FR.fs.get(id)), action: () => this.go(id) })));
        p.style.minWidth = box.width + 'px'; p.classList.add('sh-pop-addr');
      });
      // item interactions
      v.addEventListener('mousedown', e => {
        const it = e.target.closest('.ex-it');
        if (e.target.closest('th')) return;
        if (it) this.select(it.dataset.id); else if (!e.target.closest('.ex-link')) this.select(null);
      });
      v.addEventListener('dblclick', e => { if (FR.mobile) return; const it = e.target.closest('.ex-it'); if (it) this.openItem(this.findItem(it.dataset.id)); });
      v.addEventListener('click', e => {
        const th = e.target.closest('th[data-sort]');
        if (th) { const k = th.dataset.sort; if (['packed', 'pw', 'ratio', 'total', 'free'].includes(k)) return; this.sort = { k, d: this.sort.k === k ? -this.sort.d : 1 }; this.render(); return; }
        if (e.target.closest('[data-reveal]')) { this.revealed.add(this.cur); this.render(); return; }
        // phones: one tap opens (there is no double-click); a quick second tap (double-tap habit) is ignored
        const it = FR.mobile && e.target.closest('.ex-it');
        if (it && Date.now() > (this.tapGuard || 0)) { this.tapGuard = Date.now() + 500; this.openItem(this.findItem(it.dataset.id)); }
      });
      v.addEventListener('contextmenu', e => {
        e.preventDefault();
        const it = e.target.closest('.ex-it');
        if (it) { this.select(it.dataset.id); this.ctxItem(this.findItem(it.dataset.id), e.clientX, e.clientY); } else this.ctxBg(e.clientX, e.clientY);
      });
      v.addEventListener('keydown', e => {
        const list = this._items || [];
        const idx = list.findIndex(i => i.id === this.sel);
        if (e.key === 'Enter' && this.sel) this.openItem(this.findItem(this.sel));
        else if (e.key === 'Backspace') this.doBack();
        else if (e.key === 'F5') { e.preventDefault(); this.render(); }
        else if (e.key === 'Delete' && this.sel) this.task('delete');
        else if (e.key === 'F2' && this.sel) this.task('rename');
        else if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key) && list.length) {
          e.preventDefault();
          const d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
          const ni = Math.max(0, Math.min(list.length - 1, idx < 0 ? 0 : idx + d));
          this.select(list[ni].id);
          const el = v.querySelector(`.ex-it[data-id="${CSS.escape(list[ni].id)}"]`); el && el.scrollIntoView({ block: 'nearest' });
        }
      });
      // side pane
      this.side.addEventListener('click', e => {
        const tog = e.target.closest('[data-tog]');
        if (tog) { e.stopPropagation(); const id = tog.dataset.tog; this.exp.has(id) ? this.exp.delete(id) : this.exp.add(id); this.renderTree(); return; }
        if (e.target.closest('[data-closepane]')) { this.pane = 'tasks'; this.render(); return; }
        const gl = e.target.closest('[data-go]'); if (gl) { this.go(gl.dataset.go); return; }
        const t = e.target.closest('[data-act]'); if (t) { this.task(t.dataset.act); return; }
        const ph = e.target.closest('.ex-ph');
        if (ph) { const k = ph.parentElement.dataset.k; this.collapsed[k] = !this.collapsed[k]; this.renderSide(); }
      });
      this.side.addEventListener('dblclick', e => { const tr = e.target.closest('.ex-tr'); if (tr) { const id = tr.dataset.go; this.exp.has(id) ? this.exp.delete(id) : this.exp.add(id); this.renderTree(); } });
    }
    histMenu(btn, ids, dir) {
      if (!ids.length) return;
      const b = btn.getBoundingClientRect();
      popup(b.left, b.bottom, ids.slice(0, 9).map((id, k) => ({
        label: id === 'mydocs' ? 'My Documents' : FR.fs.get(id).name, icon: iconOf(FR.fs.get(id)),
        action: () => { for (let j = 0; j <= k; j++) dir === 'back' ? this.doBack() : this.doFwd(); },
      })));
    }
    menus() {
      const X = this;
      const sel = () => X.sel ? X.findItem(X.sel) : null;
      return [
        { label: 'File', items: () => {
          const s = sel();
          return s ? [
            { label: 'Open', action: () => X.openItem(s) },
            { sep: true },
            { label: 'Delete', disabled: !!s.fake, action: () => X.task('delete') },
            { label: 'Rename', disabled: !!s.fake, action: () => X.task('rename') },
            { label: 'Properties', disabled: !!s.fake, action: () => properties(s.id) },
            { sep: true }, { label: 'Close', action: () => X.win.close() },
          ] : [
            { label: 'New', disabled: true }, { sep: true },
            { label: 'Create Shortcut', disabled: true }, { label: 'Delete', disabled: true }, { label: 'Rename', disabled: true },
            { label: 'Properties', action: () => properties(X.cur) },
            { sep: true }, { label: 'Close', action: () => X.win.close() },
          ];
        } },
        { label: 'Edit', items: [
          { label: 'Undo', disabled: true, key: 'Ctrl+Z' }, { sep: true },
          { label: 'Cut', disabled: true, key: 'Ctrl+X' }, { label: 'Copy', disabled: true, key: 'Ctrl+C' }, { label: 'Paste', disabled: true, key: 'Ctrl+V' },
          { label: 'Paste Shortcut', disabled: true }, { sep: true },
          { label: 'Copy To Folder...', action: () => X.task('copy') }, { label: 'Move To Folder...', action: () => X.task('move') }, { sep: true },
          { label: 'Select All', disabled: true, key: 'Ctrl+A' }, { label: 'Invert Selection', disabled: true },
        ] },
        { label: 'View', items: () => [
          { label: 'Toolbars', disabled: true },
          { label: 'Status Bar', checked: X.statusOn, action: () => { X.statusOn = !X.statusOn; const sb = X.win.el.querySelector('.status-bar'); if (sb) sb.style.display = X.statusOn ? '' : 'none'; X.renderStatus(); } },
          { label: 'Explorer Bar: Folders', checked: X.pane === 'folders', action: () => { X.pane = X.pane === 'folders' ? 'tasks' : 'folders'; X.render(); } },
          { label: 'Explorer Bar: Search', checked: X.pane === 'search', key: 'Ctrl+E', action: () => { X.pane = X.pane === 'search' ? 'tasks' : 'search'; X.render(); } },
          { sep: true },
          { label: 'Thumbnails', disabled: true },
          ...['Tiles', 'Icons', 'List', 'Details'].map(t => ({ label: t, checked: X.mode === t.toLowerCase(), action: () => { X.mode = t.toLowerCase(); } })),
          { sep: true },
          ...X.arrangeItems().map(a => ({ label: 'Arrange Icons by ' + a.label, checked: a.radio, action: a.action })),
          { sep: true },
          { label: 'Go To: Back', disabled: !X.back.length, key: 'Alt+Left', action: () => X.doBack() },
          { label: 'Go To: Forward', disabled: !X.fwd.length, key: 'Alt+Right', action: () => X.doFwd() },
          { label: 'Go To: Up One Level', disabled: !parentOf(X.cur), action: () => X.doUp() },
          { label: 'Refresh', key: 'F5', action: () => X.render() },
        ] },
        { label: 'Favorites', items: [
          { label: 'Add to Favorites...', disabled: true }, { label: 'Organize Favorites...', disabled: true }, { sep: true },
          { label: 'Links: Packa Corp — Home', action: () => FR.apps.ie('https://www.packacorp.com/') },
          { label: 'Links: Careers', action: () => FR.apps.ie('https://www.packacorp.com/careers.html') },
        ] },
        { label: 'Tools', items: [
          { label: 'Map Network Drive...', action: () => FR.dialog({ title: 'Map Network Drive', icon: 'error', message: 'The network path \\\\PACKA-FS01\\finance could not be found.<br><br>(IT unplugged the file server in 2024 "to save power".)' }) },
          { label: 'Disconnect Network Drive...', disabled: true },
          { label: 'Synchronize...', disabled: true },
          { sep: true },
          { label: 'Folder Options...', action: () => folderOptions() },
        ] },
        { label: 'Help', items: [
          { label: 'Help and Support Center', action: () => FR.dialog({ title: 'Help and Support Center', icon: 'info', message: "Help and Support Center is not available.<br><br>A sticky note on the monitor says: <i>'Help yourself. —F'</i>" }) },
          { sep: true },
          { label: 'Is this copy of Windows legal?', action: () => FR.dialog({ title: 'Windows', icon: 'info', message: 'Probably. Frank bought it with a purchase order. Diane approved it. Twice, because of the version thing.' }) },
          { label: 'About Windows', action: () => aboutWin() },
        ] },
      ];
    }
  }

  function resolvePath(s, anyHidden = false) {
    const t = s.trim().replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase().replace(/^"|"$/g, '');
    const alias = { 'my documents': 'mydocs', 'my computer': 'mycomputer', desktop: 'desktop', 'recycle bin': 'recycle', 'c:': 'cdrive', 'd:': 'ddrive', 'p:': 'pdrive',
      '%userprofile%': 'frankhome', '%homepath%': 'frankhome', 'c:\\documents and settings\\frank warmington\\desktop': 'desktop', '\\\\packa-fs01\\finance': 'pdrive' };
    if (alias[t]) return FR.fs.get(alias[t]);
    const tt = t.replace(/^%userprofile%/, 'c:\\documents and settings\\frank warmington').replace(/^my documents\\/, 'c:\\documents and settings\\frank warmington\\my documents\\');
    const sh = showHidden() || anyHidden;
    for (const n of FR.fs.nodes) {
      if (n.id === 'mycomputer' || n.id === 'mailatt' || n.parent === 'mailatt') continue;
      if (FR.fs.path(n.id).toLowerCase().replace(/\\+$/, '') !== tt) continue;
      // hidden items (or items inside hidden folders) are only reachable when hidden files are shown
      let p = n, hid = false; while (p) { if (p.hidden) hid = true; p = FR.fs.get(p.parent); }
      if (hid && !sh) return null;
      return n;
    }
    return null;
  }

  function aboutWin() {
    FR.dialog({ title: 'About Windows', icon: 'info', width: 400, message: 'Windows<br>Version 5.1 (Build 2600.xpsp_sp3)<br><br>This product is licensed to:<br>&nbsp;&nbsp;Frank Warmington<br>&nbsp;&nbsp;Packa Corporation<br><br>Physical memory available to Windows: 1,046,512 KB' });
  }
  function sysProps() {
    FR.dialog({ title: 'System Properties', icon: 'info', width: 400, message: '<b>System:</b> Windows XP Professional, Version 2002, Service Pack 3<br><br><b>Registered to:</b> Frank Warmington, Packa Corporation<br><br><b>Computer:</b> Pentium(R) 4 CPU 2.80GHz, 1.00 GB of RAM<br><br><b>Computer name:</b> PACKA-FPA-01<br><b>Total disk:</b> 37.6 GB (3.21 GB free)<br><b>Uptime:</b> 2 days, 23 hours (nobody has touched this PC since Friday night)' });
  }

  FR.apps.explorer = explorer;
  FR.apps.recycle = () => explorer('recycle');
  FR.apps.zip = n => explorer(FR.fs.get(n) || 'bankzip');
  FR.shell = FR.shell || {};
  FR.shell.explorers = explorers;
  FR.shell.popup = popup;
  FR.shell.zipUnlock = zipUnlock;

  /* ======================================================================================
     Dialog window helper (tabbed property sheets)
     ====================================================================================== */
  function sheet({ id, title, icon, width = 370, tabs, onOK, onApply, auto = false }) {
    if (id && FR.wm.wins.has(id)) { const w = FR.wm.wins.get(id); w.restore && w.restore(); w.focus(); return w; }
    const root = $(`<div class="sh-sheet${auto ? ' sh-auto' : ''}"><menu role="tablist">${tabs.map((t, i) => `<button role="tab" aria-selected="${i === 0}" data-i="${i}">${esc(t.label)}</button>`).join('')}</menu>
      <div class="sh-panes">${tabs.map((t, i) => `<div role="tabpanel" class="sh-pane" data-i="${i}" ${i ? 'hidden' : ''}></div>`).join('')}</div>
      <div class="sh-sheet-btns"><button class="sh-ok">OK</button><button class="sh-cancel">Cancel</button><button class="sh-apply" disabled>Apply</button></div></div>`);
    tabs.forEach((t, i) => { const p = root.querySelector(`.sh-pane[data-i="${i}"]`); if (typeof t.content === 'string') p.innerHTML = t.content; else p.appendChild(t.content); });
    root.querySelectorAll('[role=tab]').forEach(b => b.addEventListener('click', () => {
      root.querySelectorAll('[role=tab]').forEach(x => x.setAttribute('aria-selected', x === b));
      root.querySelectorAll('.sh-pane').forEach(p => (p.hidden = p.dataset.i !== b.dataset.i));
    }));
    const win = FR.wm.open({ id, title, icon, width, height: 480, resizable: false, className: 'sh-sheetwin', content: root });
    // phones: the sheet fills the screen (the window manager maximizes it); its page scrolls by touch and
    // OK / Cancel / Apply stay pinned at the bottom
    if (FR.mobile) { if (!win.max) win.maximize(true); } else win.el.style.height = 'auto';
    const apply = root.querySelector('.sh-apply');
    root.addEventListener('change', () => (apply.disabled = false));
    root.addEventListener('input', () => (apply.disabled = false));
    root.querySelector('.sh-cancel').onclick = () => win.close();
    root.querySelector('.sh-ok').onclick = async () => { if (onOK && (await onOK()) === false) return; win.close(); };
    root.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
      e.preventDefault(); root.querySelector('.sh-ok').click();
    });
    apply.onclick = async () => { if (onApply) await onApply(); apply.disabled = true; };
    return { win, root };
  }

  /* ======================================================================================
     Folder Options (Tools > Folder Options...)
     ====================================================================================== */
  function folderOptions() {
    if (FR.wm.wins.has('sh-folderopts')) { FR.wm.wins.get('sh-folderopts').focus(); return; }
    const S = { hidden: showHidden(), hideExt: false, hideSys: !showSystem() };
    const cb = (key, label, checked) => { const i = uid('cb'); return `<div class="fo-row fo-l1"><input type="checkbox" id="${i}" data-k="${key}" ${checked ? 'checked' : ''}><label for="${i}">${esc(label)}</label></div>`; };
    const rd = (name, key, label, checked) => { const i = uid('rd'); return `<div class="fo-row fo-l2"><input type="radio" name="${name}" id="${i}" data-k="${key}" ${checked ? 'checked' : ''}><label for="${i}">${esc(label)}</label></div>`; };
    const hn = uid('hid');
    const adv = `<div class="fo-row fo-l0">${g('lockedFolder')}<span>Files and Folders</span></div>` +
      cb('', 'Automatically search for network folders and printers', false) +
      cb('', 'Display file size information in folder tips', true) +
      cb('', 'Display simple folder view in Explorer\'s Folders list', true) +
      cb('', 'Display the contents of system folders', false) +
      cb('', 'Display the full path in the address bar', true) +
      cb('', 'Display the full path in the title bar', false) +
      cb('', 'Do not cache thumbnails', false) +
      `<div class="fo-row fo-l1">${g('lockedFolder')}<span>Hidden files and folders</span></div>` +
      rd(hn, 'nohidden', 'Do not show hidden files and folders', !S.hidden) +
      rd(hn, 'showhidden', 'Show hidden files and folders', S.hidden) +
      cb('hideExt', 'Hide extensions for known file types', S.hideExt) +
      cb('hideSys', 'Hide protected operating system files (Recommended)', S.hideSys) +
      cb('', 'Launch folder windows in a separate process', false) +
      cb('', 'Remember each folder\'s view settings', true) +
      cb('', 'Restore previous folder windows at logon', false) +
      cb('', 'Show Control Panel in My Computer', false) +
      cb('', 'Show encrypted or compressed NTFS files in color', true) +
      cb('', 'Show pop-up description for folder and desktop items', true) +
      cb('', 'Use simple file sharing (Recommended)', true);
    const r = (n, l, c) => { const i = uid('r'); return `<div class="fo-opt"><input type="radio" name="${n}" id="${i}" ${c ? 'checked' : ''}><label for="${i}">${esc(l)}</label></div>`; };
    const n1 = uid('g'), n2 = uid('g'), n3 = uid('g'), n4 = uid('g');
    const general = `
      <fieldset><legend>Tasks</legend><div class="fo-grp">${fakePreview('tasks')}<div>${r(n1, 'Show common tasks in folders', true)}${r(n1, 'Use Windows classic folders', false)}</div></div></fieldset>
      <fieldset><legend>Browse folders</legend><div class="fo-grp">${fakePreview('same')}<div>${r(n2, 'Open each folder in the same window', true)}${r(n2, 'Open each folder in its own window', false)}</div></div></fieldset>
      <fieldset><legend>Click items as follows</legend><div class="fo-grp">${fakePreview('click')}<div>${r(n3, 'Single-click to open an item (point to select)', false)}
        <div class="fo-sub">${r(n4, 'Underline icon titles consistent with my browser', false)}${r(n4, 'Underline icon titles only when I point at them', true)}</div>
        ${r(n3, 'Double-click to open an item (single-click to select)', true)}</div></div></fieldset>
      <div class="fo-right"><button class="fo-restore-g">Restore Defaults</button></div>`;
    const view = `
      <fieldset><legend>Folder views</legend><div class="fo-grp">${ico('folder', 32)}<div class="fo-fv">You can apply the view (such as Details or Tiles) that you are using for this folder to all folders.<div class="fo-fvb"><button class="fo-all">Apply to All Folders</button><button class="fo-reset">Reset All Folders</button></div></div></div></fieldset>
      <div class="fo-advl">Advanced settings:</div>
      <div class="fo-adv">${adv}</div>
      <div class="fo-right"><button class="fo-restore">Restore Defaults</button></div>`;
    const types = `<div class="fo-ftl">Registered file types:</div>
      <div class="fo-ft"><table><thead><tr><th>Extensions</th><th>File Types</th></tr></thead><tbody>
      ${[['EML', 'Outlook Express Mail Message', 'eml'], ['JPG', 'JPEG Image', 'image'], ['TXT', 'Text Document', 'txt'], ['PDF', 'Adobe Acrobat Document', 'txt'], ['XLS', 'Microsoft Excel Worksheet', 'xls'], ['ZIP', 'Compressed (zipped) Folder', 'zip']].map(([e, t, i], k) => `<tr class="${e === 'XLS' ? 'sel' : ''}" data-e="${e}" data-t="${esc(t)}"><td>${ico(i, 16)} ${e}</td><td>${esc(t)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="fo-right"><button disabled>New</button><button disabled>Delete</button></div>
      <fieldset class="fo-ftd"><legend>Details for 'XLS' extension</legend><div class="fo-ftd-b">Opens with: ${ico('excel', 16)} <b>Excel</b> <button class="fo-chg">Change...</button></div>
      <div class="fo-ftd-t">Files with extension 'XLS' are of type 'Microsoft Excel Worksheet'. To change settings that affect all 'Microsoft Excel Worksheet' files, click Advanced.</div><div class="fo-right"><button class="fo-advb">Advanced</button></div></fieldset>`;
    const applyNow = () => {
      const root = s.root;
      const sh = root.querySelector('[data-k=showhidden]').checked;
      const hideSys = root.querySelector('[data-k=hideSys]').checked;
      if (sh !== showHidden()) FR.flags.set('showHidden', sh);
      if (!hideSys !== showSystem()) FR.flags.set('showSystem', !hideSys);
    };
    const s = sheet({ id: 'sh-folderopts', title: 'Folder Options', icon: 'folder', width: 382, tabs: [{ label: 'General', content: general }, { label: 'View', content: view }, { label: 'File Types', content: types }], onOK: applyNow, onApply: applyNow });
    const root = s.root;
    // clicking anywhere on a row (label text included) selects that option — XP behaviour, and some browsers
    // don't forward label clicks to the hidden (opacity:0, position:fixed) XP.css inputs
    root.querySelector('.fo-adv').addEventListener('click', e => {
      const row = e.target.closest('.fo-row'); if (!row || e.target.tagName === 'INPUT') return;
      const inp = row.querySelector('input'); if (!inp || inp.disabled) return;
      if (inp.type === 'radio') { if (!inp.checked) { inp.checked = true; inp.dispatchEvent(new Event('change', { bubbles: true })); } }
      else if (e.target.tagName !== 'LABEL') { inp.checked = !inp.checked; inp.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    root.querySelector('[data-k=hideSys]').addEventListener('change', async e => {
      if (e.target.checked) return;
      const r2 = await FR.dialog({ title: 'Warning', icon: 'warn', width: 420, buttons: ['Yes', 'No'], message: 'You have chosen to display protected operating system files (files labeled System and Hidden) in Windows Explorer. These files are required to start and run Windows. Deleting or editing them can make your computer inoperable.<br><br>Are you sure you want to display these files?' });
      if (r2.button !== 'Yes') e.target.checked = true;
    });
    const restore = () => {
      root.querySelector('[data-k=nohidden]').checked = true; root.querySelector('[data-k=hideSys]').checked = true; root.querySelector('[data-k=hideExt]').checked = false;
      root.querySelector('.sh-apply').disabled = false;
    };
    root.querySelector('.fo-restore').onclick = restore;
    root.querySelector('.fo-restore-g').onclick = () => {};
    root.querySelector('.fo-all').onclick = async () => { const r3 = await FR.dialog({ title: 'Folder Views', icon: 'question', buttons: ['Yes', 'No'], message: 'This will set all of your folders to match the current folder\'s view settings.<br><br>Do you want to continue?' }); if (r3.button === 'Yes') explorers.forEach(x => { x.views = {}; x.render(); }); };
    root.querySelector('.fo-reset').onclick = () => explorers.forEach(x => { x.views = {}; x.render(); });
    root.querySelector('.fo-chg').onclick = () => FR.dialog({ title: 'Open With', icon: 'info', message: 'Frank has locked file associations. XLS files open in Excel. Everything opens in Excel.' });
    root.querySelector('.fo-advb').onclick = () => FR.dialog({ title: 'Edit File Type', icon: 'error', message: 'Access is denied.' });
    root.querySelectorAll('.fo-ft tbody tr').forEach(tr => tr.onclick = () => {
      root.querySelectorAll('.fo-ft tr').forEach(x => x.classList.remove('sel')); tr.classList.add('sel');
      const e = tr.dataset.e, t = tr.dataset.t, app = { EML: ['mail', 'Outlook Express'], JPG: ['image', 'Windows Picture and Fax Viewer'], TXT: ['notepad', 'Notepad'], PDF: ['txt', 'Document Viewer'], XLS: ['excel', 'Excel'], ZIP: ['zip', 'Compressed (zipped) Folders'] }[e];
      root.querySelector('.fo-ftd legend').textContent = `Details for '${e}' extension`;
      root.querySelector('.fo-ftd-b').innerHTML = `Opens with: ${ico(app[0], 16)} <b>${esc(app[1])}</b> <button class="fo-chg">Change...</button>`;
      root.querySelector('.fo-ftd-b .fo-chg').onclick = () => FR.dialog({ title: 'Open With', icon: 'info', message: 'Frank has locked file associations.' });
      root.querySelector('.fo-ftd-t').textContent = `Files with extension '${e}' are of type '${t}'. To change settings that affect all '${t}' files, click Advanced.`;
    });
    return s.win;
  }
  function fakePreview(kind) {
    if (kind === 'tasks') return `<div class="fo-prev"><div class="fo-prev-l"></div><div class="fo-prev-r">${ico('folder', 16)}${ico('folder', 16)}</div></div>`;
    if (kind === 'same') return `<div class="fo-prev fo-prev2"><div class="fo-prev-w">${ico('folder', 16)}</div></div>`;
    return `<div class="fo-prev fo-prev2"><div class="fo-prev-w">${ico('txt', 16)}<u>abc</u></div></div>`;
  }
  FR.apps.folderOptions = folderOptions;

  /* ======================================================================================
     Properties dialog (General / Summary)
     ====================================================================================== */
  const FLAVOR = {
    model47: { comments: '47 tabs. 12 links. Do not touch the DO NOT DELETE.', keywords: 'final, final, use this one', title: 'THE Model' },
    copybudget: { comments: 'which one is this?? —J', keywords: 'copy, of, copy' },
    newfolder3: { comments: "made this at 2am. don't remember why." },
    k_ranked: { comments: '#212 > #188 > everything else. Not up for debate.', title: 'Cheat sheets, ranked (objectively)', keywords: 'kristians, goat' },
    pic_k_me: { comments: 'took 4 hours. worth it.', title: 'me and K. (Riga, sort of)' },
    pic_k_signed: { comments: 'DO NOT LET DREW TOUCH', title: 'signed!!!' },
    pic_k_poster: { comments: 'from the club shop. bought three. one is for the car.', title: 'MASTER OF CHEAT SHEETS' },
    pic_k_cal: { comments: 'October is the best month. He is holding #212.', title: '12 months of cheat sheets' },
    pic_k_mug: { comments: 'the club mug. my other mug says GET SHEET DONE. Drew uses both.', title: 'mug' },
    pic_k_card: { comments: 'member #0003. #0001 is him. #0002 is his mom. yes, that is his photo. club policy.', title: 'fan club card' },
    drewhat: { comments: 'Exhibit A. Found on my keyboard 10/7. Again.', title: 'evidence' },
    passwords: { comments: 'nice try', title: 'passwords' },
    k_webinar: { keywords: 'LAMBDA, best night ever' },
    pic_poster: { comments: 'cheat sheet #212, printed A0 at the FedEx place. They asked if it was a wedding.', title: '#212 on my wall' },
    pic_plant: { comments: '400 days without an incident, says the website. The sign says otherwise. The sign is closer.', title: 'second shift' },
    pic_team: { comments: 'BBQ 2025. Drew wore the hat. Nobody asked him to.', keywords: 'bbq, hat, cake' },
    bud_v4: { comments: 'FINAL means final. —F', keywords: 'final' },
    bud_v5ff: { comments: 'FINAL FINAL means I was wrong once. —F', keywords: 'final, final' },
    bud_v5ut: { comments: 'USE THIS ONE. Diane knows why. —F', keywords: 'final, use this', title: 'FY27 Budget' },
    cash13: { comments: 'The real one. Rachel\'s number goes in the payroll row. Do the math. —F', title: '13-week cash (REAL)' },
    boarding: { comments: 'deleted this. obviously nobody will look in the Recycle Bin.', title: 'boarding pass' },
    esports: { comments: 'Speedrun practice. 30:42 on the case. Kristians does it in 19.', keywords: 'speedrun, vegas' },
    todo: { comments: 'personal. NOT work. —F' },
    agenda: { comments: 'Draft 4. No pack, no vote. —DK', title: 'Special meeting agenda' },
  };
  function properties(id) {
    const n = FR.fs.get(id);
    if (!n) return;
    const nm = nameOf(n);
    const fl = FLAVOR[n.id] || {};
    const meta = k => n[k] || fl[k] || '';
    const loc = n.parent ? addrOf(n.parent) : '';
    const d = parseMod(n.modified);
    const created = parseMod(n.created || n.modified);
    const icoBig = ico(iconOf(n), 32);
    const cbx = (label, checked, key) => { const i = uid('pa'); return `<span class="pr-cb"><input type="checkbox" id="${i}" data-k="${key}" ${checked ? 'checked' : ''}><label for="${i}">${label}</label></span>`; };
    let general;
    if (['cdrive', 'ddrive', 'pdrive'].includes(n.id)) {
      general = `<div class="pr-top">${icoBig}<input type="text" value="${n.id === 'cdrive' ? '' : ''}" class="pr-name" placeholder=""></div><hr>
        <table class="pr-t"><tr><td>Type:</td><td>${esc(typeOf(n))}</td></tr><tr><td>File system:</td><td>${n.id === 'cdrive' ? 'NTFS' : ''}</td></tr></table><hr>
        ${n.id === 'cdrive' ? `<table class="pr-t"><tr><td><i class="pr-sw" style="background:#2c5bd2"></i>Used space:</td><td class="r">36,947,337,216 bytes</td><td class="r">34.4 GB</td></tr>
        <tr><td><i class="pr-sw" style="background:#e03ce0"></i>Free space:</td><td class="r">3,446,768,640 bytes</td><td class="r">3.21 GB</td></tr></table><hr>
        <table class="pr-t"><tr><td>Capacity:</td><td class="r">40,394,105,856 bytes</td><td class="r">37.6 GB</td></tr></table>
        <div class="pr-pie"><svg viewBox="0 0 120 70"><ellipse cx="60" cy="40" rx="50" ry="22" fill="#1d3a9a"/><rect x="10" y="30" width="100" height="10" fill="#1d3a9a"/><ellipse cx="60" cy="30" rx="50" ry="22" fill="#2c5bd2" stroke="#1d3a9a"/><path d="M60 30 L110 30 A50 22 0 0 0 102 18 Z" fill="#e03ce0" stroke="#9a1a9a"/></svg><div>Drive C:</div></div>` : `<div class="pr-empty">${esc(n.empty || '')}</div>`}`;
    } else if (n.type === 'folder') {
      const kids = FR.fs.children(n.id, { showHidden: true });
      const files = kids.filter(k => k.type === 'file').length, folders = kids.length - files;
      const total = kids.reduce((a, k) => a + bytesOf(k), 0);
      general = `<div class="pr-top">${icoBig}<input type="text" readonly value="${esc(nm)}" class="pr-name"></div><hr>
        <table class="pr-t"><tr><td>Type:</td><td>${esc(typeOf(n))}</td></tr>${loc ? `<tr><td>Location:</td><td class="pr-wrap">${esc(loc)}</td></tr>` : ''}
        <tr><td>Size:</td><td>${esc(niceSize(total))} (${commas(total)} bytes)</td></tr><tr><td>Size on disk:</td><td>${esc(niceSize(Math.ceil(total / 4096) * 4096))} (${commas(Math.ceil(total / 4096) * 4096)} bytes)</td></tr>
        <tr><td>Contains:</td><td>${files} Files, ${folders} Folders</td></tr></table><hr>
        <table class="pr-t"><tr><td>Created:</td><td>${esc(created ? fmtLongS(created) : 'Wednesday, June 12, 2019, 9:14:02 AM')}</td></tr></table><hr>
        <table class="pr-t"><tr><td>Attributes:</td><td>${cbx('Read-only', false, 'ro')} <button class="pr-adv">Advanced...</button><br>${cbx('Hidden', !!n.hidden, 'hid')}</td></tr></table>`;
    } else {
      const b = bytesOf(n);
      general = `<div class="pr-top">${icoBig}<input type="text" readonly value="${esc(nm)}" class="pr-name"></div><hr>
        <table class="pr-t"><tr><td>Type of file:</td><td>${esc(typeOf(n))}</td></tr>
        <tr><td>Opens with:</td><td>${ico(OPENS_ICO[n.app] || 'notepad', 16)} ${esc(OPENS[n.app] || 'Notepad')} <button class="pr-chg">Change...</button></td></tr></table><hr>
        <table class="pr-t"><tr><td>Location:</td><td class="pr-wrap">${esc(inRecycle(n) ? 'C:\\RECYCLER\\S-1-5-21-1958-2400-2006-1003' : loc)}</td></tr>
        <tr><td>Size:</td><td>${esc(niceSize(b))} (${commas(b)} bytes)</td></tr><tr><td>Size on disk:</td><td>${esc(niceSize(Math.ceil(b / 4096) * 4096))} (${commas(Math.ceil(b / 4096) * 4096)} bytes)</td></tr></table><hr>
        <table class="pr-t"><tr><td>Created:</td><td>${esc(fmtLongS(created))}</td></tr><tr><td>Modified:</td><td>${esc(fmtLongS(d))}</td></tr><tr><td>Accessed:</td><td>${esc(fmtLongS(d))}</td></tr></table><hr>
        <table class="pr-t"><tr><td>Attributes:</td><td>${cbx('Read-only', inZip(n) || inRecycle(n), 'ro')} ${cbx('Hidden', !!n.hidden, 'hid')} <button class="pr-adv">Advanced...</button></td></tr></table>`;
    }
    const tabs = [{ label: 'General', content: general }];
    if (n.type === 'file' || fl.comments) {
      const f = (l, v, ta) => `<tr><td>${l}:</td><td>${ta ? `<textarea rows="3">${esc(v || '')}</textarea>` : `<input type="text" value="${esc(v || '')}">`}</td></tr>`;
      tabs.push({ label: 'Summary', content: `<table class="pr-sum">${f('Title', meta('title'))}${f('Subject', meta('subject'))}${f('Author', n.author)}${f('Category', meta('category'))}${f('Keywords', meta('keywords'))}${f('Comments', meta('comments'), true)}</table><div class="fo-right"><button class="pr-advs">Advanced &gt;&gt;</button></div>` });
    }
    const orig = { ro: inZip(n) || inRecycle(n), hid: !!n.hidden };
    const check = async () => {
      const root = s.root;
      const changed = [...root.querySelectorAll('.pr-cb input')].some(i => i.checked !== orig[i.dataset.k]);
      const sumChanged = [...root.querySelectorAll('.pr-sum input, .pr-sum textarea')].some(i => i.value !== i.defaultValue);
      if (changed || sumChanged) {
        await FR.dialog({ title: changed ? 'Error Applying Attributes' : 'Error Applying Properties', icon: 'error', message: `An error occurred applying ${changed ? 'attributes' : 'properties'} to the file:<br><br>${esc(nm)}<br><br>Access is denied.` });
        root.querySelectorAll('.pr-cb input').forEach(i => (i.checked = orig[i.dataset.k]));
        root.querySelectorAll('.pr-sum input, .pr-sum textarea').forEach(i => (i.value = i.defaultValue));
        return false;
      }
    };
    const s = sheet({ id: 'sh-props-' + n.id, title: `${nm} Properties`, icon: iconOf(n), width: 364, tabs, onOK: check, onApply: check, auto: true });
    s.root.querySelectorAll('.pr-adv').forEach(b => (b.onclick = () => FR.dialog({ title: 'Advanced Attributes', icon: 'info', message: 'File is ready for archiving: Yes<br>Compress contents to save disk space: No<br>Encrypt contents to secure data: No<br><br><i>(Frank\'s idea of encryption is naming things "FINAL".)</i>' })));
    s.root.querySelectorAll('.pr-chg').forEach(b => (b.onclick = () => FR.dialog({ title: 'Open With', icon: 'info', message: 'Frank has locked file associations.' })));
    s.root.querySelectorAll('.pr-advs').forEach(b => (b.onclick = () => FR.dialog({ title: 'Summary', icon: 'info', message: `Last saved by: ${esc(n.author || 'Frank Warmington')}<br>Revision number: ${1 + (n.name.length % 9)}<br>Application: ${esc(OPENS[n.app] || 'Notepad')}` })));
    return s.win;
  }
  FR.apps.properties = properties;

  /* ======================================================================================
     NOTEPAD
     ====================================================================================== */
  // (R3b S10) phones: is this a text hard-wrapped at ~90 columns (most lines long and ending mid-sentence)?
  const npLong = l => l.length >= 70;
  function npReflowable(t) {
    const ls = t.split('\n').filter(l => l.trim());
    return ls.length >= 8 && ls.filter(npLong).length / ls.length >= 0.4;
  }
  // one paragraph per line: a line joins the one before it when that one ran to the margin (≥ 70 columns) and it isn't a
  // new list item; separators get short, centred headings move to the left, wide gaps (two columns) become " · "
  function npReflow(t) {
    const out = []; let prev = null;
    const sep = l => /^\s*[-=_*]{8,}\s*$/.test(l), item = l => /^(\([a-z0-9]{1,4}\)|\d+[.)]\s|[-•*]\s|Section\s|\[|\.\.\.)/.test(l);
    t.split('\n').forEach(raw => {
      const l = raw.trim().replace(/(\S) {3,}(?=\S)/g, '$1 · ');
      if (!l) { out.push(''); prev = null; return; }
      if (sep(raw)) { out.push('—————————'); prev = null; return; }
      if (prev !== null && npLong(prev) && !item(l)) out[out.length - 1] += ' ' + l;
      else out.push(l);
      prev = raw;
    });
    return out.join('\n');
  }
  function notepad(node) {
    node = node ? FR.fs.get(node) : null;
    const id = node ? 'np-' + node.id : undefined;
    if (id && FR.wm.wins.has(id)) { const w = FR.wm.wins.get(id); w.restore(); w.focus(); return w; }
    let name = node ? node.name : 'Untitled';
    const S = { wrap: true, status: false, dirty: false, closing: false };
    const root = $(`<div class="np"><textarea class="np-ta" spellcheck="false" wrap="soft"></textarea><div class="np-sb"><span></span><span class="np-pos">Ln 1, Col 1</span></div></div>`);
    const ta = root.querySelector('textarea');
    ta.value = node ? (T[node.id] ?? '') : '';
    const pos = () => {
      const v = ta.value.slice(0, ta.selectionStart); const lines = v.split('\n');
      root.querySelector('.np-pos').textContent = `Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}`;
    };
    // phones: a visible Wrap switch (the Format menu is far away and sideways swiping a wide text is tiring), in its own
    // slim bar under the text (R3b S10: never floating over the text)
    const wrapB = FR.mobile ? $('<button class="np-wrapb" aria-label="Word wrap"></button>') : null;
    // (R3b S10) phones, Wrap on: a text Frank broke into ~90-column lines (the loan agreement) is shown reflowed, one
    // paragraph per line, headings on their own line, so it wraps cleanly to the screen; Wrap off shows the file as it is
    const orig = ta.value, reflow = FR.mobile && npReflowable(orig) ? npReflow(orig) : null;
    const setWrap = on => { S.wrap = on; ta.setAttribute('wrap', on ? 'soft' : 'off'); ta.classList.toggle('np-nowrap', !on);
      if (reflow && !S.dirty) { const v = on ? reflow : orig; if (ta.value !== v) { ta.value = v; ta.scrollTop = 0; ta.scrollLeft = 0; } }
      if (wrapB) { wrapB.textContent = on ? 'Wrap: on' : 'Wrap: off'; wrapB.classList.toggle('on', on); } };
    if (wrapB) { const bar = $('<div class="np-mbar"></div>'); bar.appendChild(wrapB); root.appendChild(bar); wrapB.onclick = e => { e.stopPropagation(); setWrap(!S.wrap); if (S.wrap) setStatus(false); }; }
    const setStatus = on => { S.status = on; root.classList.toggle('np-sbon', on); pos(); };
    const saveDenied = () => FR.dialog({ title: 'Notepad', icon: 'error', message: `Cannot create the ${esc(node ? FR.fs.path(node.parent) + '\\' + node.name : 'Untitled.txt')} file.<br><br>Access is denied. Make sure the path and file name are correct.` });
    const find = async () => {
      const r = await FR.dialog({ title: 'Find', icon: 'question', message: 'Find what:', input: { label: '', type: 'text', value: S.lastFind || '' }, buttons: ['Find Next', 'Cancel'] });
      if (r.button !== 'Find Next' || !r.value) return;
      S.lastFind = r.value; findNext();
    };
    const findNext = () => {
      if (!S.lastFind) return find();
      const hay = ta.value.toLowerCase(), q = S.lastFind.toLowerCase();
      let i = hay.indexOf(q, ta.selectionEnd); if (i < 0) i = hay.indexOf(q);
      if (i < 0) { FR.dialog({ title: 'Notepad', icon: 'info', message: `Cannot find "${esc(S.lastFind)}"` }); return; }
      ta.focus(); ta.setSelectionRange(i, i + q.length);
      const lineH = 16, line = ta.value.slice(0, i).split('\n').length; ta.scrollTop = Math.max(0, (line - 4) * lineH); pos();
    };
    const goTo = async () => {
      const r = await FR.dialog({ title: 'Goto line', icon: 'question', message: 'Line number:', input: { label: '', type: 'text', value: '1' }, buttons: ['OK', 'Cancel'] });
      if (r.button !== 'OK') return;
      const ln = parseInt(r.value, 10), lines = ta.value.split('\n');
      if (!(ln >= 1 && ln <= lines.length)) { FR.dialog({ title: 'Notepad - Goto Line', icon: 'info', message: 'The line number is beyond the total number of lines' }); return; }
      const off = lines.slice(0, ln - 1).join('\n').length + (ln > 1 ? 1 : 0); ta.focus(); ta.setSelectionRange(off, off); ta.scrollTop = (ln - 3) * 16; pos();
    };
    const timeDate = () => {
      const d = FR.clock.now(), s = `${hm(d)} ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      ta.setRangeText(s, ta.selectionStart, ta.selectionEnd, 'end'); S.dirty = true; pos();
    };
    const exec = c => { ta.focus(); try { document.execCommand(c); } catch (e) {} };
    const menu = [
      { label: 'File', items: [
        { label: 'New', key: 'Ctrl+N', action: () => { ta.value = ''; name = 'Untitled'; win.setTitle('Untitled - Notepad'); S.dirty = false; } },
        { label: 'Open...', key: 'Ctrl+O', action: () => explorer(node ? node.parent === 'recycle' ? 'recycle' : node.parent : 'mydocs') },
        { label: 'Save', key: 'Ctrl+S', action: saveDenied }, { label: 'Save As...', action: saveDenied }, { sep: true },
        { label: 'Page Setup...', disabled: true }, { label: 'Print...', key: 'Ctrl+P', action: () => printDlg() }, { sep: true },
        { label: 'Exit', action: () => win.close() },
      ] },
      { label: 'Edit', items: () => [
        { label: 'Undo', key: 'Ctrl+Z', action: () => exec('undo') }, { sep: true },
        { label: 'Cut', key: 'Ctrl+X', action: () => exec('cut') }, { label: 'Copy', key: 'Ctrl+C', action: () => exec('copy') },
        { label: 'Paste', key: 'Ctrl+V', action: () => { ta.focus(); navigator.clipboard && navigator.clipboard.readText().then(t => { ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, 'end'); S.dirty = true; }).catch(() => {}); } },
        { label: 'Delete', key: 'Del', action: () => { ta.setRangeText('', ta.selectionStart, ta.selectionEnd, 'end'); S.dirty = true; } }, { sep: true },
        { label: 'Find...', key: 'Ctrl+F', action: find }, { label: 'Find Next', key: 'F3', action: findNext },
        { label: 'Replace...', key: 'Ctrl+H', disabled: true }, { label: 'Go To...', key: 'Ctrl+G', disabled: S.wrap, action: goTo }, { sep: true },
        { label: 'Select All', key: 'Ctrl+A', action: () => { ta.focus(); ta.select(); } }, { label: 'Time/Date', key: 'F5', action: timeDate },
      ] },
      { label: 'Format', items: () => [
        { label: 'Word Wrap', checked: S.wrap, action: () => { setWrap(!S.wrap); if (S.wrap) setStatus(false); } },
        { label: 'Font...', action: () => FR.dialog({ title: 'Font', icon: 'info', message: 'Font: Lucida Console<br>Font style: Regular<br>Size: 10<br><br>Frank has strong opinions about fonts. This is the only one.' }) },
      ] },
      { label: 'View', items: () => [{ label: 'Status Bar', checked: S.status, disabled: S.wrap, action: () => setStatus(!S.status) }] },
      { label: 'Help', items: [
        { label: 'Help Topics', action: () => FR.dialog({ title: 'Notepad Help', icon: 'info', message: 'Notepad is a basic text editor. It is not a system of record. (Frank used it as one anyway.)' }) },
        { sep: true },
        { label: 'About Notepad', action: () => FR.dialog({ title: 'About Notepad', icon: 'notepad', message: 'Notepad<br>Version 5.1 (Build 2600.xpsp_sp3)<br><br>This product is licensed to:<br>&nbsp;&nbsp;Frank Warmington<br>&nbsp;&nbsp;Packa Corporation' }) },
      ] },
    ];
    const wide = node && (node.wide || ['loan', 'agenda', 'boarding', 'packlist', 'k_webinar', 'todo', 'realnotes'].includes(node.id));
    const win = FR.wm.open({
      id, title: `${name} - Notepad`, icon: 'notepad', width: wide ? 800 : 620, height: wide ? 560 : 440, className: 'np-win', menu, content: root,
      onClose: () => {
        if (!S.dirty || S.closing) return true;
        FR.dialog({ title: 'Notepad', icon: 'warn', buttons: ['Yes', 'No', 'Cancel'], message: `The text in the ${esc(node ? FR.fs.path(node.parent) + '\\' + name : 'Untitled')} file has changed.<br><br>Do you want to save the changes?` })
          .then(r => { if (r.button === 'No') { S.closing = true; win.close(); } else if (r.button === 'Yes') saveDenied(); });
        return false;
      },
    });
    ta.addEventListener('input', () => { S.dirty = true; pos(); });
    ['keyup', 'click', 'select'].forEach(ev => ta.addEventListener(ev, pos));
    ta.addEventListener('keydown', e => {
      if (e.key === 'F5') { e.preventDefault(); timeDate(); }
      else if (e.key === 'F3') { e.preventDefault(); findNext(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); find(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDenied(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g' && !S.wrap) { e.preventDefault(); goTo(); }
      else if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('\t', ta.selectionStart, ta.selectionEnd, 'end'); S.dirty = true; }
    });
    // phones: Frank's preformatted files (tables, the boarding pass) keep their layout: no wrapping, scroll sideways
    // (Format › Word Wrap still switches it). Plain prose keeps wrapping.
    const lines = ta.value.split('\n').filter(l => l.trim()), art = lines.filter(l => /\S {3,}\S|[|+=_\-]{4,}/.test(l)).length;
    setWrap(!(FR.mobile && lines.length && art / lines.length >= 0.2));
    // (F15, round 4) phones: a small piece of ASCII art (the boarding pass: 70 columns) shrinks to fit the screen with
    // Wrap off (no mush, nothing cut off), when that still leaves it readable (≥ 8.5 px); wider files scroll as before
    if (FR.mobile && !S.wrap) {
      const cols = Math.max(...ta.value.split('\n').map(l => l.length));
      const fit = () => {
        if (!ta.isConnected) return removeEventListener('resize', fit);
        ta.classList.remove('np-fit');
        const cs = getComputedStyle(ta), cx = document.createElement('canvas').getContext('2d');
        cx.font = `100px ${cs.fontFamily}`;
        const cw = cx.measureText('M').width / 100, room = ta.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
        const px = Math.floor(Math.min(parseFloat(cs.fontSize), room / (cols * cw)) * 2) / 2;
        if (cols && px >= 8.5 && px < parseFloat(cs.fontSize)) { ta.style.setProperty('--np-fit', px + 'px'); ta.classList.add('np-fit'); }
      };
      setTimeout(fit, 30); addEventListener('resize', fit);
    }
    setTimeout(() => { ta.focus(); ta.setSelectionRange(0, 0); ta.scrollTop = 0; }, 40);
    return win;
  }
  FR.apps.notepad = notepad;

  /* ======================================================================================
     WINDOWS PICTURE AND FAX VIEWER (+ original SVG "photos")
     ====================================================================================== */
  const photoFx = (id, w, h) => `<defs><filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="t"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/></filter>
    <radialGradient id="${id}v" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".42"/></radialGradient></defs>`;
  const photoTop = (id, w, h) => `<rect width="${w}" height="${h}" fill="url(#${id}v)"/><rect width="${w}" height="${h}" filter="url(#${id}n)" fill="#fff"/>`;

  function artPoster() {
    const L = [['=SUMIFS()', 'Sum with conditions'], ['=XLOOKUP()', 'Find anything'], ['=INDEX(MATCH())', 'Find anything, faster'], ['=IFERROR()', 'Hide the evidence'], ['=EOMONTH()', 'Month-end, every month'], ['=SUMPRODUCT()', 'Weighted everything'], ['=LET()', 'Name it, reuse it'], ['=NPV() / =IRR()', 'Ask the Board nicely']];
    const R = [['Ctrl+Shift+L', 'Filter on / off'], ['Alt+=', 'AutoSum'], ['F4', 'Lock $A$1 / repeat last'], ['Ctrl+[', 'Jump to precedents'], ['Ctrl+`', 'Show formulas'], ['Alt+E, S, V', 'Paste Special: Values'], ['F9', 'Recalculate'], ['Ctrl+Z', 'Undo (spreadsheets only)']];
    const key = (x, y, k) => { const w = Math.min(150, 12 + k.length * 7.6); return `<rect x="${x}" y="${y - 14}" width="${w}" height="21" rx="4" fill="#fbfbf7" stroke="#8a8a80" stroke-width="1.2"/><rect x="${x + 1.5}" y="${y + 3}" width="${w - 3}" height="3" rx="1.5" fill="#d6d6cc"/><text x="${x + w / 2}" y="${y + 1}" font-family="Verdana,Tahoma,sans-serif" font-size="11.5" font-weight="bold" text-anchor="middle" fill="#1f3a1f">${esc(k)}</text>`; };
    const col = (arr, x0) => arr.map(([k, d], i) => { const y = 208 + i * 34; return key(x0, y, k) + `<text x="${x0 + 150}" y="${y + 1}" font-family="Verdana,Tahoma,sans-serif" font-size="12" fill="#222">${esc(d)}</text>`; }).join('');
    return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${photoFx('ps', 800, 600)}
      <defs><linearGradient id="psw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8ccb0"/><stop offset="1" stop-color="#bfae8c"/></linearGradient>
      <linearGradient id="psh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8f3a"/><stop offset="1" stop-color="#1c6428"/></linearGradient></defs>
      <rect width="800" height="600" fill="url(#psw)"/>
      <g opacity=".18" stroke="#8a7a5a">${Array.from({ length: 30 }, (_, i) => `<path d="M0 ${i * 20 + 5}h800"/>`).join('')}</g>
      <rect x="0" y="545" width="800" height="55" fill="#7d6a4c"/><rect x="0" y="545" width="800" height="6" fill="#5e4e36"/>
      <g transform="rotate(-1.2 400 290)">
        <rect x="58" y="34" width="690" height="508" fill="#000" opacity=".22" transform="translate(7 8)"/>
        <rect x="58" y="34" width="690" height="508" fill="#fdfdf6" stroke="#cfcfc0"/>
        <rect x="58" y="34" width="690" height="92" fill="url(#psh)"/>
        <text x="403" y="78" font-family="Impact,'Arial Black',sans-serif" font-size="34" fill="#fff" text-anchor="middle" textLength="600" lengthAdjust="spacingAndGlyphs">FORMULA CHEAT SHEET</text>
        <text x="403" y="108" font-family="Verdana,sans-serif" font-size="14" fill="#d9f5d4" text-anchor="middle" font-weight="bold" letter-spacing="3">GET SHEET DONE.  NO MOUSE. EVER.</text>
        <text x="90" y="160" font-family="Verdana,sans-serif" font-size="13" font-weight="bold" fill="#1c6428">FORMULAS</text>
        <text x="420" y="160" font-family="Verdana,sans-serif" font-size="13" font-weight="bold" fill="#1c6428">SHORTCUTS</text>
        <path d="M90 170h290M420 170h300" stroke="#1c6428" stroke-width="2"/>
        ${col(L, 90)}${col(R, 420)}
        <rect x="90" y="508" width="630" height="24" fill="#fff3b0" stroke="#d9c25a"/>
        <text x="405" y="525" font-family="Verdana,sans-serif" font-size="12" font-weight="bold" fill="#5a4a00" text-anchor="middle">RULE #1: IF YOU TOUCH THE MOUSE, YOU BUY LUNCH.  RULE #2: DO NOT TOUCH THE "DO NOT DELETE".</text>
        <text x="90" y="500" font-family="Verdana,sans-serif" font-size="9" fill="#777">cheat sheet #212 — F.W. &amp; K.B.</text>
        <g transform="rotate(-5 690 482)"><text x="596" y="482" font-family="'Comic Sans MS','Segoe Print','Bradley Hand',cursive" font-size="11" fill="#2440a8">behind this poster: nothing.</text>
        <text x="608" y="497" font-family="'Comic Sans MS','Segoe Print','Bradley Hand',cursive" font-size="11" fill="#2440a8">definitely nothing.</text></g>
        <rect x="44" y="24" width="60" height="22" fill="#f4efd8" opacity=".75" transform="rotate(-28 74 35)"/>
        <rect x="704" y="24" width="60" height="22" fill="#f4efd8" opacity=".75" transform="rotate(30 734 35)"/>
        <rect x="46" y="526" width="60" height="22" fill="#f4efd8" opacity=".75" transform="rotate(25 76 537)"/>
        <rect x="702" y="526" width="60" height="22" fill="#f4efd8" opacity=".75" transform="rotate(-25 732 537)"/>
      </g>
      <g transform="translate(18 470) rotate(-4)"><rect width="46" height="60" fill="#3c7bd0"/><rect x="4" y="4" width="38" height="38" fill="#fff"/><text x="23" y="30" font-size="16" text-anchor="middle" font-family="Tahoma" fill="#3c7bd0" font-weight="bold">OCT</text></g>
      ${photoTop('ps', 800, 600)}</svg>`;
  }

  function artTeam() {
    const person = (x, o) => {
      const skin = o.skin || '#f1c9a0', y = o.y || 330;
      return `<g transform="translate(${x} ${y})">
        <path d="M-16 150l-4 70M16 150l4 70" stroke="${o.pants || '#3a4a6a'}" stroke-width="14" stroke-linecap="round"/>
        <rect x="-30" y="40" width="60" height="118" rx="22" fill="${o.shirt}"/>
        <path d="M-28 60l-26 ${o.armL || 60}M28 60l26 ${o.armR || 60}" stroke="${o.shirt}" stroke-width="14" stroke-linecap="round"/>
        <circle cx="${-54 + (o.armL ? 0 : 0)}" cy="${60 + (o.armL || 60)}" r="8" fill="${skin}"/><circle cx="54" cy="${60 + (o.armR || 60)}" r="8" fill="${skin}"/>
        <rect x="-8" y="26" width="16" height="18" fill="${skin}"/>
        <circle cx="0" cy="0" r="30" fill="${skin}"/>
        ${o.hair || ''}
        <circle cx="-10" cy="-2" r="3" fill="#222"/><circle cx="10" cy="-2" r="3" fill="#222"/>
        <path d="M-11 12q11 9 22 0" stroke="#7a2a1a" stroke-width="3" fill="none" stroke-linecap="round"/>
        ${o.extra || ''}</g>`;
    };
    const bunting = Array.from({ length: 16 }, (_, i) => { const x = 20 + i * 50; const c = ['#d42a2a', '#fff', '#2a4ad4'][i % 3]; return `<path d="M${x} ${48 + Math.sin(i / 2) * 6}l22 0-11 22z" fill="${c}" stroke="#8a8a8a" stroke-width=".6"/>`; }).join('');
    return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${photoFx('tm', 800, 600)}
      <defs><linearGradient id="tmsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb1ea"/><stop offset="1" stop-color="#cfe8f8"/></linearGradient>
      <linearGradient id="tmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6aa83c"/><stop offset="1" stop-color="#3f7a22"/></linearGradient></defs>
      <rect width="800" height="600" fill="url(#tmsky)"/>
      <circle cx="690" cy="90" r="40" fill="#fff6c0" opacity=".85"/>
      <g fill="#fff" opacity=".85"><ellipse cx="160" cy="110" rx="60" ry="18"/><ellipse cx="200" cy="100" rx="40" ry="18"/><ellipse cx="480" cy="140" rx="70" ry="16"/></g>
      <g fill="#2f6a2a"><circle cx="60" cy="300" r="70"/><circle cx="130" cy="280" r="60"/><circle cx="740" cy="290" r="80"/><circle cx="660" cy="310" r="55"/></g>
      <rect x="0" y="330" width="800" height="270" fill="url(#tmg)"/>
      <path d="M0 40 Q400 80 800 40" stroke="#555" stroke-width="1.5" fill="none"/>${bunting}
      <g transform="translate(560 360)"><rect x="-10" y="60" width="150" height="14" fill="#8a5a2a"/><path d="M0 74l-10 90M130 74l10 90" stroke="#6a4420" stroke-width="8"/>
        <rect x="-10" y="46" width="150" height="18" fill="#d42a2a"/><g fill="#fff">${Array.from({ length: 7 }, (_, i) => `<rect x="${-10 + i * 22}" y="46" width="11" height="9"/><rect x="${1 + i * 22}" y="55" width="11" height="9"/>`).join('')}</g>
        <ellipse cx="30" cy="42" rx="18" ry="6" fill="#fff" stroke="#999"/><ellipse cx="90" cy="42" rx="14" ry="5" fill="#fff" stroke="#999"/><rect x="100" y="18" width="14" height="26" fill="#c02a1a"/><text x="107" y="36" font-size="8" fill="#fff" text-anchor="middle" font-family="Arial" font-weight="bold">K</text></g>
      <g transform="translate(60 380)"><path d="M10 40h110l-15 55H25z" fill="#222"/><rect x="0" y="30" width="130" height="12" rx="4" fill="#333"/><path d="M40 95l-12 70M90 95l12 70" stroke="#333" stroke-width="6"/>
        <g fill="#8a3a1a"><rect x="20" y="22" width="30" height="9" rx="4"/><rect x="60" y="22" width="30" height="9" rx="4"/><rect x="95" y="22" width="22" height="9" rx="4"/></g>
        <g fill="#ccc" opacity=".7"><circle cx="40" cy="0" r="14"/><circle cx="60" cy="-30" r="20"/><circle cx="50" cy="-70" r="26"/><circle cx="80" cy="-110" r="30"/></g></g>
      ${person(236, { shirt: '#2a6ad0', pants: '#555', hair: '<path d="M-30 -8q0-30 30-30t30 30q-8-16-30-16t-30 16z" fill="#6a4a2a"/>', armR: 20, extra: '<g transform="translate(36 70)"><rect x="0" y="0" width="50" height="34" fill="#333" stroke="#111"/><rect x="3" y="3" width="44" height="26" fill="#1f7a2f"/><g stroke="#8fe09a" stroke-width=".7"><path d="M3 10h44M3 17h44M3 24h44M17 3v26M32 3v26"/></g></g><circle cx="-10" cy="-2" r="8" fill="none" stroke="#222" stroke-width="2"/><circle cx="10" cy="-2" r="8" fill="none" stroke="#222" stroke-width="2"/><path d="M-2 -2h4" stroke="#222" stroke-width="2"/>' })}
      ${person(328, { shirt: '#e0a02a', skin: '#c68a5a', pants: '#2a3a5a', hair: '<path d="M-28 -10q2-24 28-24t28 24q-10-10-28-10t-28 10z" fill="#1a1a1a"/>', armL: 30, extra: '<ellipse cx="-58" cy="84" rx="18" ry="5" fill="#fff" stroke="#999"/><rect x="-66" y="76" width="16" height="5" rx="2" fill="#8a3a1a"/>' })}
      ${person(420, { shirt: '#e05a8a', pants: '#3a3a4a', hair: '<path d="M-32 10q-4-46 32-46t32 46l-6 30q2-40-26-44-28 4-26 44z" fill="#c8862a"/>', armL: 20, extra: '<path d="M-26 -52c-4-8 6-12 8-4 2-8 12-4 8 4l-8 8z" fill="#e0203a"/><path d="M36 -48c-3-6 5-9 6-3 2-6 9-3 6 3l-6 6z" fill="#e0203a" opacity=".8"/>' })}
      ${person(512, { shirt: '#2a9a8a', pants: '#444', skin: '#e9b98f', hair: '<path d="M-31 -2q-2-34 31-34t31 34q-6-22-31-22t-31 22z" fill="#2a1a10"/><circle cx="0" cy="-36" r="11" fill="#2a1a10"/>', armR: 24, extra: '<rect x="40" y="70" width="26" height="34" rx="2" fill="#f4f4f4" stroke="#666"/><path d="M45 80h16M45 86h16M45 92h10" stroke="#888"/>' })}
      ${person(655, { y: 318, shirt: '#8a2a2a', pants: '#2a2a2a', skin: '#e8b890', extra: '<ellipse cx="0" cy="-22" rx="62" ry="12" fill="#b07a3a" stroke="#6a441a" stroke-width="2"/><path d="M-30 -24q0-40 30-40t30 40z" fill="#c08a4a" stroke="#6a441a" stroke-width="2"/><rect x="-30" y="-32" width="60" height="7" fill="#5a3010"/><path d="M-14 12q14 14 28 0" stroke="#7a2a1a" stroke-width="4" fill="#fff"/>' })}
      <rect x="0" y="548" width="800" height="52" fill="#000" opacity=".72"/>
      <text x="400" y="580" font-family="Tahoma,Verdana,sans-serif" font-size="19" fill="#fff" text-anchor="middle">FP&amp;A team BBQ 2025 — Frank, Joshua, Rachel, Emily, Drew (hat)</text>
      <text x="770" y="535" font-family="'Courier New',monospace" font-size="20" font-weight="bold" fill="#ff9a2a" text-anchor="end" opacity=".9">'25 7 4</text>
      ${photoTop('tm', 800, 600)}</svg>`;
  }

  function artPlant() {
    const box = (x, y, w, h, c = '#c8965a') => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="#7a5428" stroke-width="1.2"/><path d="M${x} ${y + h * 0.18}h${w}" stroke="#a8763a" stroke-width="2"/><rect x="${x + w * 0.4}" y="${y}" width="${w * 0.2}" height="${h}" fill="#d8b070" opacity=".6"/></g>`;
    const stack = (x, y, cols, rows, bw = 46, bh = 34) => { let s = `<rect x="${x - 6}" y="${y + rows * bh}" width="${cols * bw + 12}" height="10" fill="#9a7a4a" stroke="#5a4020"/>`; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += box(x + c * bw, y + (rows - 1 - r) * bh, bw, bh); return s; };
    const lights = [120, 300, 480, 660].map(x => `<g><path d="M${x} 0v38" stroke="#555" stroke-width="2"/><path d="M${x - 26} 48l26-12 26 12z" fill="#6a6a6a"/><ellipse cx="${x}" cy="50" rx="24" ry="5" fill="#fffbd0"/><path d="M${x - 24} 50L${x - 110} 330h220L${x + 24} 50z" fill="#fffbd0" opacity=".07"/></g>`).join('');
    const rollers = Array.from({ length: 12 }, (_, i) => `<circle cx="${130 + i * 40}" cy="318" r="9" fill="#7a8a9a" stroke="#3a4a5a" stroke-width="2"/>`).join('');
    return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${photoFx('pl', 800, 600)}
      <defs><linearGradient id="plw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6470"/><stop offset="1" stop-color="#8a949e"/></linearGradient>
      <linearGradient id="plf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa0a0"/><stop offset="1" stop-color="#6a7070"/></linearGradient></defs>
      <rect width="800" height="600" fill="url(#plw)"/>
      <g stroke="#3a424c" stroke-width="3">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 100} 0v250"/>`).join('')}<path d="M0 30h800M0 80h800"/></g>
      ${lights}
      <rect x="60" y="120" width="330" height="54" fill="#1f5aa8" stroke="#fff" stroke-width="3"/>
      <text x="225" y="143" font-family="Arial Black,Arial,sans-serif" font-size="15" fill="#fff" text-anchor="middle" font-weight="bold">SAFETY FIRST</text>
      <text x="225" y="164" font-family="Arial,sans-serif" font-size="12" fill="#fff" text-anchor="middle">214 DAYS WITHOUT A LOST-TIME INCIDENT</text>
      <rect x="480" y="120" width="230" height="44" fill="#b8321f"/><text x="595" y="150" font-family="Arial Black,Arial,sans-serif" font-size="22" fill="#fff" text-anchor="middle" letter-spacing="3">PACKA</text>
      <path d="M0 250h800v350H0z" fill="url(#plf)"/>
      <path d="M0 470L800 430M0 520L800 470" stroke="#e8c020" stroke-width="7"/>
      <g><rect x="100" y="230" width="520" height="80" fill="#3a6a9a" stroke="#1a3a5a" stroke-width="2"/><rect x="100" y="230" width="520" height="14" fill="#2a4a7a"/>
        <rect x="620" y="205" width="90" height="120" fill="#2a5a8a" stroke="#1a3a5a" stroke-width="2"/><circle cx="665" cy="250" r="22" fill="#9aa8b8" stroke="#1a3a5a" stroke-width="3"/><circle cx="665" cy="250" r="6" fill="#1a3a5a"/>
        <rect x="120" y="252" width="480" height="20" fill="#c8965a" stroke="#7a5428"/>
        <g stroke="#a8763a" stroke-width="1.5">${Array.from({ length: 24 }, (_, i) => `<path d="M${124 + i * 20} 254q5 8 10 0t10 0"/>`).join('')}</g>
        <rect x="100" y="310" width="520" height="10" fill="#1a2a3a"/>${rollers}
        <text x="140" y="298" font-family="Arial,sans-serif" font-size="11" fill="#fff" font-weight="bold">CORRUGATOR LINE 1 — 87" B/C FLUTE</text>
        <rect x="560" y="276" width="40" height="22" fill="#111"/><circle cx="572" cy="287" r="4" fill="#3f3"/><circle cx="588" cy="287" r="4" fill="#f33"/></g>
      ${stack(40, 360, 3, 4)}${stack(560, 380, 4, 3)}${stack(330, 420, 2, 3, 50, 36)}
      <g transform="translate(200 400)"><rect x="0" y="40" width="110" height="50" rx="6" fill="#e8820a" stroke="#8a4a00" stroke-width="2"/><rect x="70" y="0" width="40" height="44" fill="none" stroke="#333" stroke-width="5"/>
        <rect x="-30" y="-40" width="8" height="130" fill="#444"/><path d="M-60 85h40M-60 70h40" stroke="#444" stroke-width="6"/><circle cx="20" cy="92" r="16" fill="#222"/><circle cx="92" cy="92" r="16" fill="#222"/><circle cx="20" cy="92" r="6" fill="#888"/><circle cx="92" cy="92" r="6" fill="#888"/></g>
      <rect x="0" y="548" width="800" height="52" fill="#000" opacity=".72"/>
      <text x="400" y="580" font-family="Tahoma,Verdana,sans-serif" font-size="19" fill="#fff" text-anchor="middle">Plant floor</text>
      ${photoTop('pl', 800, 600)}</svg>`;
  }
  // photos: the caption is rendered in its own bar under the stage (never over the image, never rotated)
  const artPhoto = (key, cap) => ({ key, cap });
  const ART = { pic_k_poster: artPhoto('kPoster', 'The poster. The wall. The man. (ordered 3, one for the car)'), pic_k_cal: artPhoto('kCalendar', 'October. Obviously.'), pic_k_mug: artPhoto('kMug', 'The club mug. My other mug says GET SHEET DONE. Drew uses both. Drew uses everything.'), pic_poster: artPhoto('phPoster', 'My wall. Behind this poster: nothing. Definitely nothing.'), pic_team: artPhoto('phBbq', 'FP&A team BBQ 2025 — everyone left before I took the photo. The cake was mine.'), pic_plant: artPhoto('phPlant', 'Plant floor, second shift. The website says 400 days without an incident. The sign has notes.'), pic_kristians: artPhoto('kHero', 'Cheat Sheet Summit 2026. He held #212 over his head and 3,000 people lost their minds. I was one of them.'), pic_evidence: artPhoto('kEvidence', 'From Rachel. Subject: I KNEW IT. Note the mug. Note the arm. Note nothing, Rachel.'), pic_k_signed: artPhoto('phKSigned', 'Signed. Riga, 2025. "Keep your ranges absolute." I will, Kristians. I will.'), pic_k_me: artPhoto('phKMe', 'Me and Kristians (I am the one on the left). Photoshop trial expired before I could fix the edges.'), pic_k_card: artPhoto('phKCard', 'Member #0003. They print HIS photo on every card. I did not complain.'), drewhat: artPhoto('phHat', 'EVIDENCE. He left it on my keyboard. Again.') };

  let viewer = null;
  function image(node) {
    node = FR.fs.get(node);
    if (!node) return;
    if (viewer && FR.wm.wins.has(viewer.win.id)) { viewer.show(node); viewer.win.restore(); viewer.win.focus(); return viewer.win; }
    const root = $(`<div class="iv"><div class="iv-stage"><div class="iv-rot"><div class="iv-pic"></div></div></div>
      <div class="iv-caption" hidden></div>
      <div class="iv-bar">
        <button data-a="prev" title="Previous Image (Left Arrow)">${g('prev')}</button><button data-a="next" title="Next Image (Right Arrow)">${g('next')}</button><i class="iv-sep"></i>
        <button data-a="fit" title="Best Fit (Ctrl+B)">${g('bestFit')}</button><button data-a="actual" title="Actual Size (Ctrl+A)">${g('actual')}</button><button data-a="slide" title="Start Slide Show (F11)">${g('slide')}</button><i class="iv-sep"></i>
        <button data-a="zin" title="Zoom In (+)">${g('zoomIn')}</button><button data-a="zout" title="Zoom Out (-)">${g('zoomOut')}</button><i class="iv-sep"></i>
        <button data-a="rcw" title="Rotate Clockwise (Ctrl+K)">${g('rotCw')}</button><button data-a="rccw" title="Rotate Counterclockwise (Ctrl+L)">${g('rotCcw')}</button><i class="iv-sep"></i>
        <button data-a="del" title="Delete (Del)">${g('del')}</button><button data-a="print" title="Print (Ctrl+P)">${g('print')}</button><button data-a="copy" title="Copy To (Ctrl+S)">${g('copy')}</button><button data-a="edit" title="Close this program and open the image for editing (Ctrl+E)">${g('edit')}</button><i class="iv-sep"></i>
        <button data-a="help" title="Help (F1)">${g('help')}</button>
      </div></div>`);
    const V = { node: null, zoom: 0, rot: 0 };
    const pic = root.querySelector('.iv-pic'), rot = root.querySelector('.iv-rot'), stage = root.querySelector('.iv-stage'), capEl = root.querySelector('.iv-caption');
    const apply = () => {
      rot.style.transform = `rotate(${V.rot}deg)`;
      const sw = stage.clientWidth - 24, sh = stage.clientHeight - 24;
      const r90 = V.rot % 180 !== 0;
      let w;
      if (!V.zoom) { const fw = r90 ? sh : sw, fh = r90 ? sw : sh; w = Math.max(40, Math.min(fw, fh * 4 / 3, 800)); } else w = 800 * V.zoom;
      pic.style.width = w + 'px'; pic.style.height = (w * 0.75) + 'px';
      stage.classList.toggle('iv-scroll', !!V.zoom && w > sw);
    };
    V.show = n => {
      V.node = n; V.zoom = 0; V.rot = 0;
      const a = ART[n.id], src = a && (FR.data.images || {})[a.key];
      pic.innerHTML = a ? `<div class="iv-photo">${src ? `<img src="${src}" alt="">` : '<div class="iv-nophoto">Drawing Failed.</div>'}</div>`
        : `<svg viewBox="0 0 800 600"><rect width="800" height="600" fill="#fff"/><text x="400" y="300" text-anchor="middle" font-family="Tahoma" font-size="20" fill="#888">Drawing Failed.</text></svg>`;
      capEl.textContent = a ? a.cap : ''; capEl.hidden = !a;
      win.setTitle(`${n.name} - Windows Picture and Fax Viewer`);
      apply();
    };
    const sibs = () => FR.fs.children(V.node.parent).filter(c => c.app === 'image');
    const step = d => { const s = sibs(), i = s.findIndex(c => c.id === V.node.id); if (s.length) V.show(s[(i + d + s.length) % s.length]); };
    const act = a => {
      if (a === 'prev') step(-1); else if (a === 'next') step(1);
      else if (a === 'fit') { V.zoom = 0; apply(); } else if (a === 'actual') { V.zoom = 1; apply(); }
      else if (a === 'zin') { V.zoom = Math.min(4, (V.zoom || (pic.offsetWidth / 800)) * 1.25); apply(); }
      else if (a === 'zout') { V.zoom = Math.max(0.1, (V.zoom || (pic.offsetWidth / 800)) / 1.25); apply(); }
      else if (a === 'rcw') { V.rot = (V.rot + 90) % 360; apply(); } else if (a === 'rccw') { V.rot = (V.rot + 270) % 360; apply(); }
      else if (a === 'del') FR.dialog({ title: 'Confirm File Delete', icon: 'question', buttons: ['Yes', 'No'], message: `Are you sure you want to send '${esc(V.node.name)}' to the Recycle Bin?` }).then(r => r.button === 'Yes' && denied('Delete', V.node.name));
      else if (a === 'print') printDlg('Photo Printing Wizard');
      else if (a === 'copy') denied('Copy', V.node.name);
      else if (a === 'edit') FR.dialog({ title: 'Windows Picture and Fax Viewer', icon: 'error', message: 'No image editor is installed.<br><br>(Frank\'s only creative tool is conditional formatting.)' });
      else if (a === 'slide') { V.zoom = 0; apply(); win.maximize && !win.max && win.maximize(); }
      else if (a === 'help') FR.dialog({ title: 'Windows Picture and Fax Viewer', icon: 'info', message: 'Use the arrow buttons to browse the pictures in this folder.' });
    };
    const win = FR.wm.open({ title: 'Windows Picture and Fax Viewer', icon: 'image', width: 720, height: 590, className: 'iv-win', content: root, onClose: () => { viewer = null; } });
    root.querySelector('.iv-bar').addEventListener('click', e => { const b = e.target.closest('button'); if (b) act(b.dataset.a); });
    root.tabIndex = 0;
    root.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') act('prev'); else if (e.key === 'ArrowRight') act('next');
      else if (e.key === '+' || e.key === '=') act('zin'); else if (e.key === '-') act('zout');
    });
    stage.addEventListener('dblclick', () => act(V.zoom ? 'fit' : 'actual'));
    if (window.ResizeObserver) new ResizeObserver(apply).observe(stage);
    FR.bus.on('win-resize', w => { if (w === win) setTimeout(apply, 0); });
    V.win = win;
    viewer = V;
    V.show(node);
    setTimeout(() => { apply(); root.focus(); }, 30);
    return win;
  }
  FR.apps.image = image;


  /* ======================================================================================
     DOCUMENT VIEWER (PDF attachments)
     ====================================================================================== */
  const money = n => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  function pdfInvoice() {
    const rows = [['1', 'Die-cutter rebuild, Line 2 (teardown, bearings, drive)', '1', money(84500), money(84500)],
      ['2', 'Replacement rotary die set (2)', '2', money(9750), money(19500)], ['3', 'Field labor, 6 days, 2 techs', '1', money(4800), money(4800)], ['4', 'Freight & rigging', '1', money(1200), money(1200)]];
    return `<svg viewBox="0 0 612 792" xmlns="http://www.w3.org/2000/svg" font-family="Arial,Helvetica,sans-serif">
      <rect width="612" height="792" fill="#fff"/>
      <text x="48" y="70" font-size="22" font-weight="bold" fill="#1a3a6a">SEDALIA MACHINE WORKS</text>
      <text x="48" y="86" font-size="9" fill="#555">Industrial repair &amp; rebuild · 2210 W. Main St, Sedalia, MO 65301 · (660) 555-0142</text>
      <text x="564" y="70" font-size="26" font-weight="bold" text-anchor="end" fill="#1a3a6a">INVOICE</text>
      <text x="564" y="88" font-size="10" text-anchor="end">Invoice #4471</text><text x="564" y="102" font-size="10" text-anchor="end">Date: 09/18/2026 &nbsp; Terms: Net 15</text>
      <path d="M48 112h516" stroke="#1a3a6a" stroke-width="2"/>
      <text x="48" y="136" font-size="9" fill="#555">BILL TO</text><text x="48" y="150" font-size="11" font-weight="bold">Packa Corporation</text><text x="48" y="164" font-size="10">Attn: Karen Wills, VP Operations</text><text x="48" y="177" font-size="10">1420 East 3rd Street, Sedalia, MO 65301</text>
      <text x="330" y="136" font-size="9" fill="#555">JOB</text><text x="330" y="150" font-size="11" font-weight="bold">Die-cutter rebuild — Line 2</text><text x="330" y="164" font-size="10">PO: PC-26-0917 · Completed 09/16/2026</text>
      <g font-size="9.5"><rect x="48" y="200" width="516" height="20" fill="#e8eef7"/><text x="54" y="214" font-weight="bold">#</text><text x="78" y="214" font-weight="bold">Description</text><text x="420" y="214" font-weight="bold" text-anchor="end">Qty</text><text x="490" y="214" font-weight="bold" text-anchor="end">Unit</text><text x="558" y="214" font-weight="bold" text-anchor="end">Amount</text>
      ${rows.map((r, i) => `<text x="54" y="${238 + i * 22}">${r[0]}</text><text x="78" y="${238 + i * 22}">${esc(r[1])}</text><text x="420" y="${238 + i * 22}" text-anchor="end">${r[2]}</text><text x="490" y="${238 + i * 22}" text-anchor="end">${r[3]}</text><text x="558" y="${238 + i * 22}" text-anchor="end">${r[4]}</text><path d="M48 ${246 + i * 22}h516" stroke="#ddd"/>`).join('')}</g>
      <g font-size="10"><text x="480" y="352" text-anchor="end">Subtotal</text><text x="558" y="352" text-anchor="end">${money(110000)}</text>
      <text x="480" y="368" text-anchor="end">Sales tax (exempt — mfg. equipment)</text><text x="558" y="368" text-anchor="end">$0.00</text>
      <path d="M400 378h164" stroke="#1a3a6a"/><text x="480" y="396" text-anchor="end" font-weight="bold" font-size="12">TOTAL DUE</text><text x="558" y="396" text-anchor="end" font-weight="bold" font-size="12">${money(110000)}</text></g>
      <rect x="48" y="406" width="360" height="62" fill="#f7f7f2" stroke="#ccc"/>
      <text x="58" y="423" font-size="9" fill="#555">PAYMENT</text><text x="58" y="439" font-size="9.5">Paid in full 09/25/2026 by wire from Packa Corporation</text><text x="58" y="452" font-size="9.5">operating account (Prairie Ledger Bank ····0117).</text>
      <text x="58" y="464" font-size="9.5" font-weight="bold">Not financed. No equipment loan, no lease — paid from cash.</text>
      <g transform="rotate(-10 486 445)"><rect x="420" y="422" width="132" height="46" rx="6" fill="none" stroke="#c0281a" stroke-width="4" opacity=".8"/><text x="486" y="454" font-size="30" font-weight="bold" text-anchor="middle" fill="#c0281a" opacity=".8" letter-spacing="4">PAID</text><text x="486" y="464" font-size="8" text-anchor="middle" fill="#c0281a" opacity=".8">09/25/2026 · WIRE</text></g>
      <text x="48" y="490" font-size="11" font-family="'Segoe Script','Comic Sans MS',cursive" fill="#1d3a9a">Frank — this one we paid by WIRE from operating. NOT financed.</text>
      <text x="48" y="506" font-size="11" font-family="'Segoe Script','Comic Sans MS',cursive" fill="#1d3a9a">The $300K equipment loan = the glue station + the forklifts. Not this. —K</text>
      <text x="48" y="740" font-size="8" fill="#888">Thank you for your business. Remit to: Sedalia Machine Works, PO Box 771, Sedalia, MO 65302. Questions: ap@sedaliamachineworks.example</text>
      <text x="564" y="770" font-size="8" fill="#888" text-anchor="end">Page 1 of 1</text></svg>`;
  }
  function pdfGeneric(name) {
    const lambda = /lambda/i.test(name);
    const tips = lambda
      ? [['=LAMBDA(x, x*1.07)(A2)', 'test it inline first, THEN name it'], ['=LET(rate, 0.075, bal, C4, bal*rate)', 'LET inside LAMBDA: your future self is a stakeholder'], ['=BYROW(tbl, LAMBDA(r, SUM(r)))', 'no more dragging formulas down 4,000 rows at midnight'], ['=MAP(A2:A99, LAMBDA(v, IF(v<0, 0, v)))', 'one formula, one range, no helper column'], ['=REDUCE(0, A2:A99, LAMBDA(a, v, a+v^2))', 'recursion is possible. recursion is possible.'], ['Name Manager (Ctrl+F3)', 'where LAMBDAs live. Name them like a grown-up.'], ['NOT: Frank1, Frank2, FrankFINAL', 'a name is a promise'], ['"If a formula needs a comment, it needs a LAMBDA."', '— K.B.']]
      : [['=XLOOKUP(what, where, result, "n/a")', 'stop nesting IFERROR around VLOOKUP'], ['=LET(x, A1*1.07, IF(x>100, x, 0))', 'name it once, read it forever'], ['=SORTBY(tbl, tbl[EBITDA], -1)', 'the only sort that matters (page 1, not page 2)'], ['=FILTER(tbl, tbl[Owner]="FW")', 'the only filter that matters'], ['=EOMONTH(TODAY(), 0)', 'month-end. every month.'], ['F4 / $A$1', 'keep your ranges ABSOLUTE'], ['Ctrl+Shift+L', 'filter on/off'], ['Ctrl+[', 'go to precedents, find the plug']];
    const title = lambda ? 'LAMBDA CHEAT SHEET v3' : 'CHEAT SHEET #212';
    return `<svg viewBox="0 0 612 792" xmlns="http://www.w3.org/2000/svg" font-family="Arial,Helvetica,sans-serif">
      <rect width="612" height="792" fill="#fff"/><rect x="0" y="0" width="612" height="90" fill="#1d6b3a"/>
      <text x="306" y="44" font-size="26" font-weight="bold" fill="#fff" text-anchor="middle">${title}</text><text x="306" y="68" font-size="11" fill="#cfe8d4" text-anchor="middle" letter-spacing="3">KRISTIANS BUŠĀRS · ${esc(name.replace(/\.pdf$/i, '').replace(/_/g, ' '))}</text>
      ${tips.map(([f, d], i) => `<rect x="48" y="${118 + i * 72}" width="516" height="56" rx="6" fill="${i % 2 ? '#f4f8f4' : '#eaf3ea'}"/><text x="64" y="${142 + i * 72}" font-family="Consolas,'Courier New',monospace" font-size="13" font-weight="bold" fill="#123">${esc(f)}</text><text x="64" y="${162 + i * 72}" font-size="10" fill="#555">${esc(d)}</text>`).join('')}
      <text x="306" y="740" font-size="10" fill="#1d6b3a" text-anchor="middle" font-weight="bold">GET SHEET DONE. — K.B. · cheatsheetclub.example · not for resale · jā</text>
      <text x="564" y="770" font-size="8" fill="#888" text-anchor="end">Page 1 of 1</text></svg>`;
  }
  function pdfOkm() {
    const grades = [['Kraft linerboard, 42# and 69#', '+ $40.00 / ton'], ['Semi-chem medium, 26# and 33#', '+ $40.00 / ton'], ['High-performance liner (all basis weights)', '+ $40.00 / ton'], ['Recycled liner and medium', '+ $40.00 / ton']];
    return `<svg viewBox="0 0 612 792" xmlns="http://www.w3.org/2000/svg" font-family="Georgia,'Times New Roman',serif">
      <rect width="612" height="792" fill="#fff"/>
      <rect x="0" y="0" width="612" height="8" fill="#5a3a1a"/>
      <text x="48" y="64" font-size="24" font-weight="bold" fill="#5a3a1a" letter-spacing="1">OZARK KRAFT MILLS</text>
      <text x="48" y="80" font-size="9" fill="#666" font-family="Arial,Helvetica,sans-serif">Containerboard · Kraft paper · Springfield, Missouri · sales@ozarkkraftmills.example · (417) 555-0180</text>
      <path d="M48 92h516" stroke="#5a3a1a" stroke-width="1.5"/>
      <text x="48" y="124" font-size="11">June 12, 2026</text>
      <text x="48" y="150" font-size="11">Packa Corporation</text><text x="48" y="164" font-size="11">Attn: Frank Warmington, FP&amp;A · Karen Wills, Operations</text><text x="48" y="178" font-size="11">1420 East 3rd Street, Sedalia, MO 65301</text>
      <text x="48" y="212" font-size="15" font-weight="bold" fill="#5a3a1a">PRICE ADJUSTMENT NOTICE — CONTAINERBOARD</text>
      <text x="48" y="228" font-size="10" fill="#666" font-family="Arial,Helvetica,sans-serif">Reference: OKM-PN-2026-07 · Supply agreement PC/OKM-2023</text>
      <text x="48" y="258" font-size="11">Dear Frank and Karen,</text>
      <text x="48" y="282" font-size="11">This letter confirms the verbal notice given to Packa Corporation on June 5, 2026. Effective with</text>
      <text x="48" y="298" font-size="11">shipments on and after <tspan font-weight="bold">July 1, 2026</tspan>, Ozark Kraft Mills will apply a price increase of</text>
      <text x="48" y="314" font-size="11"><tspan font-weight="bold">$40.00 per ton on all containerboard grades</tspan> supplied under our agreement.</text>
      <g font-size="10.5" font-family="Arial,Helvetica,sans-serif"><rect x="48" y="334" width="516" height="20" fill="#f1ebe2"/><text x="56" y="348" font-weight="bold">Grade</text><text x="556" y="348" font-weight="bold" text-anchor="end">Adjustment (effective 07/01/2026)</text>
      ${grades.map(([g, a], i) => `<text x="56" y="${372 + i * 20}">${esc(g)}</text><text x="556" y="${372 + i * 20}" text-anchor="end">${esc(a)}</text><path d="M48 ${379 + i * 20}h516" stroke="#e4ded4"/>`).join('')}</g>
      <text x="48" y="474" font-size="11">The increase reflects higher recovered-fiber and energy costs at our Springfield mill. Orders placed</text>
      <text x="48" y="490" font-size="11">before July 1 ship at current pricing. Volumes, terms (net 30) and all other conditions of the</text>
      <text x="48" y="506" font-size="11">agreement are unchanged. Your account currently shows invoices in the 61–90 day column; please</text>
      <text x="48" y="522" font-size="11">bring these current before the July shipments.</text>
      <text x="48" y="552" font-size="11">We value our partnership with Packa Corporation.</text>
      <text x="48" y="590" font-size="11">Sincerely,</text>
      <text x="48" y="622" font-size="16" font-family="'Segoe Script','Comic Sans MS',cursive" fill="#2a3a6a">R. Tellinghast</text>
      <text x="48" y="638" font-size="11">Ruth Tellinghast, Director of Sales</text><text x="48" y="652" font-size="11">Ozark Kraft Mills</text>
      <g transform="rotate(-8 470 600)"><rect x="392" y="574" width="156" height="52" rx="4" fill="none" stroke="#1d3a9a" stroke-width="2" opacity=".75"/><text x="470" y="596" font-size="10" text-anchor="middle" fill="#1d3a9a" opacity=".75" font-family="Arial,Helvetica,sans-serif" font-weight="bold">RECEIVED — PACKA FP&amp;A</text><text x="470" y="614" font-size="10" text-anchor="middle" fill="#1d3a9a" opacity=".75" font-family="Arial,Helvetica,sans-serif">JUN 15 2026 · FW</text></g>
      <text x="48" y="700" font-size="10.5" font-family="'Segoe Script','Comic Sans MS',cursive" fill="#1d3a9a">+$40/ton × the tons we run a quarter (Products page) = the containerboard bar. Freight is the residual. —F</text>
      <text x="564" y="770" font-size="8" fill="#888" text-anchor="end" font-family="Arial,Helvetica,sans-serif">Page 1 of 1</text></svg>`;
  }
  const PDFS = { inv_diecutter: pdfInvoice };
  function pdf(node) {
    const n = (typeof node === 'string' ? FR.fs.get(node) : node) || {};
    const name = n.name || 'document.pdf';
    const id = 'pdf-' + (n.id || name);
    if (FR.wm.wins.has(id)) { const w = FR.wm.wins.get(id); w.restore(); w.focus(); return w; }
    const render = PDFS[n.id] || (/invoice|4471|die.?cut/i.test(name) ? pdfInvoice : /okm|ozark|price.?notice/i.test(name) ? pdfOkm : null);
    const root = $(`<div class="pv"><div class="pv-tb"><button class="pv-b" data-a="zout" title="Zoom Out">${g('zoomOut')}</button><span class="pv-z">100%</span><button class="pv-b" data-a="zin" title="Zoom In">${g('zoomIn')}</button><i class="iv-sep"></i><button class="pv-b" data-a="print" title="Print">${g('print')}</button><button class="pv-b" data-a="save" title="Save a Copy">${g('copy')}</button><span class="pv-pg">Page 1 of 1</span></div><div class="pv-stage"><div class="pv-page">${render ? render() : pdfGeneric(name)}</div></div></div>`);
    let zoom = 1;
    const pg = root.querySelector('.pv-page'), stage = root.querySelector('.pv-stage');
    const apply = () => { const w = Math.min(stage.clientWidth - 40, 612) * zoom; pg.style.width = w + 'px'; pg.style.height = (w * 792 / 612) + 'px'; root.querySelector('.pv-z').textContent = Math.round(zoom * 100) + '%'; };
    const win = FR.wm.open({ id, title: `${name} - Document Viewer`, icon: 'txt', width: 700, height: 620, className: 'pv-win', content: root,
      menu: [{ label: 'File', items: [{ label: 'Open...', action: () => explorer(n.parent || 'board') }, { label: 'Save a Copy...', action: () => denied('Copy', name) }, { label: 'Print...', action: () => printDlg() }, { sep: true }, { label: 'Close', action: () => win.close() }] },
        { label: 'View', items: () => [{ label: 'Zoom In', action: () => { zoom = Math.min(3, zoom * 1.25); apply(); } }, { label: 'Zoom Out', action: () => { zoom = Math.max(.4, zoom / 1.25); apply(); } }, { label: 'Fit Width', action: () => { zoom = 1; apply(); } }] },
        { label: 'Help', items: [{ label: 'About Document Viewer', action: () => FR.dialog({ title: 'About Document Viewer', icon: 'info', message: 'Document Viewer 6.0<br><br>Opens PDF files. Slowly. Like the real one.<br><br>Licensed to: Frank Warmington, Packa Corporation' }) }] }] });
    root.querySelector('.pv-tb').addEventListener('click', e => { const b = e.target.closest('.pv-b'); if (!b) return; const a = b.dataset.a;
      if (a === 'zin') { zoom = Math.min(3, zoom * 1.25); apply(); } else if (a === 'zout') { zoom = Math.max(.4, zoom / 1.25); apply(); }
      else if (a === 'print') printDlg(); else denied('Copy', name); });
    if (window.ResizeObserver) new ResizeObserver(apply).observe(stage);
    setTimeout(apply, 20);
    return win;
  }
  FR.apps.pdf = pdf;

  /* ======================================================================================
     INTERNET EXPLORER 6
     ====================================================================================== */
  const SITE = 'https://www.packacorp.com';
  const CLUB = 'http://www.cheatsheetclub.example/kristians';
  const LINKS = [['Packa Corp — Home', SITE + '/'], ['About Us', SITE + '/about.html'], ['Products', SITE + '/products.html'], ['Careers', SITE + '/careers.html'], ['Quality & Safety', SITE + '/quality.html'], ['Contact', SITE + '/contact.html']];
  const PTITLE = { '/': 'Packa Corporation | Packaging Manufacturer, Sedalia, Missouri', '/index.html': 'Packa Corporation | Packaging Manufacturer, Sedalia, Missouri', '/about.html': 'About Us | Packa Corporation', '/products.html': 'Products & Capabilities | Packa Corporation', '/careers.html': 'Careers | Packa Corporation', '/quality.html': 'Quality & Safety | Packa Corporation', '/contact.html': 'Contact Us | Packa Corporation', '/industries.html': 'Industries Served | Packa Corporation' };
  const IEHIST = [
    ['Friday', [['Packa Corporation — Home', SITE + '/'], ['Careers | Packa Corporation', SITE + '/careers.html']]],
    ['Last Week', [["Kristians' Cheat Sheet Club — Guestbook", CLUB], ['Microsoft Excel World Championship — schedule', 'http://championship.example/schedule'], ['Kristians Bušārs — cheat sheet #212', 'http://cheatsheets.example/212'], ['Mojave weather', 'http://weather.example/mojave'], ['How to put a poster back from the other side', 'http://www.askjeeves.example/q?poster+other+side']]],
    ['2 Weeks Ago', [['Prairie Ledger Bank — Commercial Online Banking', 'https://online.prairieledgerbank.example/'], ['Yoga mats — extra long, extra quiet', 'http://shop.example/yoga-mats'], ['Novelty spreadsheet pillows', 'http://shop.example/pillows']]],
  ];
  function clubPage(sub) {
    const src = (FR.data.images || {}).kWeb || '';
    const counter = '0048213'.split('').map(d => `<b>${d}</b>`).join('');
    const posts = [
      ['frank_w', 'Sedalia, MO', '10/11/2026 12:41 AM', '#212 is a MASTERPIECE. 47 formulas. Printed it A0. My boss thinks it is a poster. It is a poster.'],
      ['vlookup_viktor', 'Tallinn', '10/10/2026 9:02 PM', 'first!!! ...ok fifth. #212 changed my life, deleted all my VLOOKUPs'],
      ['frank_w', 'Sedalia, MO', '10/09/2026 2:14 AM', 'see you in Vegas?? ;)'],
      ['excel_mom_1971', 'Duluth, MN', '10/08/2026 6:30 PM', 'Does anyone have the INDEX/MATCH one in pink? For my daughter. She is 34.'],
      ['Rachel M.', 'location hidden', '10/07/2026 11:58 PM', 'who is frank_w?'],
      ['frank_w', 'Sedalia, MO', '09/24/2026 11:03 PM', 'HE SAID MY NAME ON THE LAMBDA WEBINAR!!! "Frank from Sedalia, good question." best night of my career. do not tell my VP.'],
    ].map(([u, loc, d, t]) => `<div class="cc-post"><div class="cc-ph"><b>${esc(u)}</b> <span>(${esc(loc)})</span> <i>${esc(d)}</i></div><div class="cc-pt">${t}</div></div>`).join('');
    return `<div class="cc">
      <div class="cc-top"><marquee scrollamount="4">*** WELCOME TO THE #1 UNOFFICIAL FAN CLUB OF KRISTIANS BUSARS *** CHEAT SHEET #212 HITS 100,000 DOWNLOADS *** ABSOLUTE REFERENCES FOREVER *** SIGN THE GUESTBOOK!!! ***</marquee></div>
      <table class="cc-t"><tr>
        <td class="cc-nav">
          <div class="cc-navh">MENU</div>
          <a data-nav="home">&raquo; Home</a><a data-nav="sheets">&raquo; Cheat Sheets (212)</a><a data-nav="gallery">&raquo; Photo Gallery</a><a data-nav="webinars">&raquo; Webinar Archive</a><a data-nav="members">&raquo; Members Only</a><a data-nav="guestbook">&raquo; Guestbook</a><a data-nav="links">&raquo; Links</a>
          <div class="cc-navh">MEMBERS</div><div class="cc-small">1,204 members<br>#0001 Kristians (duh)<br>#0002 his mom<br>#0003 frank_w</div>
          <div class="cc-best">Best viewed in<br>Internet Explorer 6<br>at 800x600</div>
        </td>
        <td class="cc-main">
          <h1>Kristians' Cheat Sheet Club</h1>
          <div class="cc-sub">Unofficial Fan Site (of the official club) &middot; Master of cheat sheets. King of macros. Est. 2019</div>
          ${sub ? clubSub(sub) : `<div class="cc-hero"><div class="cc-photo">${src ? `<img src="${src}" alt="">` : ''}<div>Kristians Bušārs</div></div>
            <div class="cc-news"><div class="cc-blink">NEW!!</div><h2>#212 &mdash; The Ultimate FP&amp;A Formula Poster</h2>
            <p>47 formulas. Dynamic arrays. 1 LAMBDA that will make you cry. <b>100,000 downloads</b> since September 1st. Print it big. Print it BIGGER.</p>
            <p>Next up: the <b>Excel World Championship</b> in Las Vegas. Fan club meet-up TBA!!</p></div></div>
          <div class="cc-sotm"><div class="cc-sotmh">&#9733; SUPERFAN OF THE MONTH &#9733;</div><b>Frank W.</b> (Sedalia, MO)<br>Member #0003 &middot; has every cheat sheet laminated &middot; owns the Excel pillow<br><i>"Frank, you are the reason we added a 'posts per night' limit."</i></div>
          <h3>Guestbook</h3>${posts}
          <div class="cc-count">You are visitor number <span class="cc-digits">${counter}</span></div>`}
          <div class="cc-foot"><a class="cc-ring" data-nav="prev">&laquo; prev</a> &nbsp;|&nbsp; <b>FP&amp;A Webring</b> &nbsp;|&nbsp; <a class="cc-ring" data-nav="next">next &raquo;</a><br>This is an unofficial fan page. Not affiliated with anyone. Especially not with any software company. &copy; 2019&ndash;2026 frank_w &amp; friends</div>
        </td></tr></table></div>`;
  }
  function clubSub(sub) {
    const box = t => `<div class="cc-sotm" style="text-align:left">${t}</div>`;
    if (sub === 'sheets') return `<h3>Cheat Sheets (212)</h3>
      <table class="cc-list"><tr><th>#</th><th>Title</th><th>Posted</th><th>Downloads</th></tr>
      <tr><td>#212</td><td><b>The Ultimate FP&amp;A Formula Poster</b> &mdash; 47 formulas, dynamic arrays</td><td>09/01/2026</td><td><b>100,000</b> <span class="cc-blink">HOT</span></td></tr>
      <tr><td>#211</td><td>XLOOKUP vs INDEX/MATCH: the final word (it's XLOOKUP)</td><td>08/04/2026</td><td>41,207</td></tr>
      <tr><td>#188</td><td>Absolute References: F4 and you</td><td>06/16/2025</td><td>38,910</td></tr>
      <tr><td>#147</td><td>Pivot tables for people who fear pivot tables</td><td>11/18/2023</td><td>22,301</td></tr>
      <tr><td>#001</td><td>VLOOKUP basics (a beginning)</td><td>03/02/2019</td><td>1,204</td></tr></table>
      ${box('Downloads are for <b>members</b>. frank_w has every one of them laminated. He also has the laminator. &mdash; admin')}`;
    if (sub === 'gallery') return `<h3>Photo Gallery</h3>
      <div class="cc-gal">${['Kristians holding #212 over his head, Cheat Sheet Summit 2026', 'The mug. THE mug.', 'Kristians and superfan #0003 (photoshopped by superfan #0003)', 'The laminator'].map(t => `<div class="cc-galp"><div class="cc-galx">image loading...<br><small>(dial-up. be patient.)</small></div><div>${t}</div></div>`).join('')}</div>
      ${box('Photos are 800x600 and take about four minutes each. Kristians says this builds character.')}`;
    if (sub === 'webinars') return `<h3>Webinar Archive</h3>
      <table class="cc-list"><tr><th>Date</th><th>Webinar</th><th>Attendees</th></tr>
      <tr><td>09/24/2026</td><td><b>LAMBDA Night</b> &mdash; "your future self is a stakeholder" (at 1:12:40: "Frank from Sedalia, good question")</td><td>300</td></tr>
      <tr><td>05/12/2026</td><td>Dynamic arrays: SORTBY, FILTER, and letting go</td><td>212</td></tr>
      <tr><td>01/29/2026</td><td>Protect the sheet. Protect your soul. (Q&amp;A)</td><td>188</td></tr>
      <tr><td>02/18/2025</td><td>Speedrunning INDEX/MATCH: under 4 seconds per lookup</td><td>147</td></tr></table>
      ${box('Recordings are for <b>members</b>. If you are frank_w: yes, we kept the part where he says your name. Once. 9/24. You have told everyone.')}`;
    if (sub === 'links') return `<h3>Links</h3>
      <p><a class="cc-lnk" data-url="http://championship.example/schedule">&raquo; Excel World Championship &mdash; Las Vegas schedule</a></p>
      <p><a class="cc-lnk" data-url="${SITE}/">&raquo; Packa Corporation (frank_w asked. we said yes.)</a></p>
      <p><a class="cc-lnk" data-url="https://online.prairieledgerbank.example/">&raquo; Prairie Ledger Bank (frank_w asked. we said why.)</a></p>
      <p><a class="cc-lnk" data-url="http://vlookup-anonymous.example/">&raquo; VLOOKUP Anonymous &mdash; a support group</a></p>
      <p><a class="cc-lnk" data-url="https://www.datarails.com/">&raquo; Datarails (blocked by frank_w. "After the Board.")</a></p>`;
    if (sub === 'prev') return `<h3>&laquo; FP&amp;A Webring: VLOOKUP Anonymous</h3>
      ${box('<b>Step 1.</b> Admit that your ranges are not absolute.<br><b>Step 2.</b> Admit that column 7 will not always be column 7.<br><b>Step 3.</b> XLOOKUP.<br><br>Meetings: Tuesdays, 7 PM, the small conference room (the one with the broken projector).<br>Members: 4. One of them is frank_w. He came to help. He stayed to argue.')}`;
    if (sub === 'next') return `<h3>FP&amp;A Webring: Drew's Cowboy Hat Appreciation Society &raquo;</h3>
      ${box('Members: 1.<br>Hats: 1.<br>Meetings: whenever Drew is in the office and near a keyboard that is not his.<br><br><i>"This site was not built by Drew. Drew cannot build sites. Drew can barely build a budget." &mdash; frank_w, webmaster</i>')}`;
    return '';
  }
  function champPage() {
    const row = (d, t, w) => `<tr><td>${d}</td><td>${t}</td><td>${w}</td></tr>`;
    return `<div class="ch">
      <div class="ch-top"><b>MICROSOFT EXCEL WORLD CHAMPIONSHIP</b> &middot; Las Vegas, NV &middot; October 17&ndash;19, 2026</div>
      <div class="ch-body">
        <h1>Schedule</h1>
        <p class="ch-sub">All times Pacific. Venue: the Grand Ballroom (and, for the finals, the big screen behind the pool).</p>
        <table class="ch-t"><tr><th>When</th><th>Event</th><th>Where</th></tr>
        ${row('Sat 10/17, 9:00 AM', 'Registration &amp; badge pickup (teams of 2: BOTH players must be present)', 'Ballroom foyer')}
        ${row('Sat 10/17, 1:00 PM', 'Qualifier 1 &mdash; Modeling case, 30 minutes', 'Grand Ballroom')}
        ${row('Sat 10/17, 6:00 PM', 'Fan club meet-ups (see your club\'s newsletter)', 'Pool deck (pool closes at 10)')}
        ${row('Sun 10/18, 10:00 AM', 'Qualifier 2 &mdash; Lookup speedrun (INDEX/MATCH, XLOOKUP)', 'Grand Ballroom')}
        ${row('Sun 10/18, 4:00 PM', 'Doubles semi-final &mdash; 2-player teams, shared workbook, no mouse', 'Grand Ballroom')}
        ${row('Sun 10/18, 8:00 PM', 'Cheat Sheet Signing with Kristians Bu&scaron;&#257;rs (members only, bring your card)', 'Salon B')}
        ${row('Mon 10/19, 7:00 PM', '<b>GRAND FINAL</b> &mdash; live on the big screen', 'Pool deck')}
        ${row('Tue 10/20, 11:00 AM', 'Awards brunch. Flights home. Reality.', 'Caf&eacute; Sierra')}
        </table>
        <div class="ch-note"><b>Team entries close Friday 10/16.</b> Companion registrations must match the name on the boarding pass. No exceptions, no "he is basically my colleague".</div>
        <div class="ch-foot">Sponsored by the Spreadsheet Speedrun Association. Not affiliated with any finance software company. Especially not with the one that keeps emailing us.</div>
      </div></div>`;
  }
  function resolveUrl(raw) {
    let s = String(raw || '').trim();
    if (!s) return null;
    if (/^about:/i.test(s)) return { kind: 'blank', url: 'about:blank' };
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'http://' + s;
    let u; try { u = new URL(s); } catch (e) { return { kind: 'error', url: raw }; }
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'packacorp.com') return { kind: 'site', url: SITE + (u.pathname || '/') + u.search + u.hash, path: u.pathname || '/' };
    if (host === 'cheatsheetclub.example') { const sub = (u.pathname.replace(/^\/kristians\/?/, '').split('/')[0] || '').toLowerCase(); return { kind: 'club', url: CLUB + (sub ? '/' + sub : ''), sub: ['sheets', 'gallery', 'webinars', 'links', 'prev', 'next'].includes(sub) ? sub : '' }; }
    if (host === 'championship.example') return { kind: 'champ', url: u.href };
    if (host === 'intranet.packacorp.local') return { kind: 'standings', url: FR.score.url };
    if (FR.iePages && Object.prototype.hasOwnProperty.call(FR.iePages, host)) return { kind: 'extra', url: u.href, host };
    if (host === 'datarails.com' || host.endsWith('.datarails.com')) return { kind: 'blocked', url: u.href };
    return { kind: 'error', url: u.href };
  }
  function errorPage(url, blocked) {
    return `<div class="ie-err"><table><tr><td class="ie-err-i">${ico('info', 32)}</td><td>
      <h1>The page cannot be displayed</h1>
      <p>The page you are looking for is currently unavailable. The Web site might be having technical difficulties, or you may need to adjust your browser settings.</p>
      ${blocked ? `<p class="ie-err-frank">Frank blocked this site in Tools &gt; Internet Options. Of course he did.</p>` : ''}
      <hr><p>Please try the following:</p><ul>
      <li>Click the ${g('refresh')} <a class="ie-ln" data-ie="refresh">Refresh</a> button, or try again later.</li>
      <li>If you typed the page address in the Address bar, make sure that it is spelled correctly.</li>
      <li>To check your connection settings, click the <b>Tools</b> menu, and then click <b>Internet Options</b>. On the <b>Connections</b> tab, click <b>Settings</b>. The settings should match those provided by your local area network (LAN) administrator or Internet service provider (ISP).</li>
      <li>If your network administrator has enabled it, Windows can examine your network and automatically discover network connection settings.</li>
      <li>Click ${g('home')} <a class="ie-ln" data-ie="home">Home</a> to return to the Packa Corporation home page.</li>
      </ul>
      <h2>Cannot find server or DNS Error<br>Internet Explorer</h2>
      <div class="ie-err-u">${esc(url)}</div></td></tr></table></div>`;
  }
  function ie(url, opts = {}) {
    if (!opts.fresh && FR.wm.wins.has('ie')) { const w = FR.wm.wins.get('ie'); w.restore(); w.focus(); if (url && w._ieGo) w._ieGo(url); return w; }
    const S = { hist: [], idx: -1, pane: null, loading: false };
    const root = $(`<div class="ie">
      <div class="ie-bars">
        <div class="ie-tb">
          <button class="ie-b ie-bl" data-a="back" title="Back">${ico('back', 24)}<span class="ex-bt">Back</span><span class="ex-b-dd">${G.dd}</span></button>
          <button class="ie-b" data-a="fwd" title="Forward">${ico('forward', 24)}<span class="ex-b-dd">${G.dd}</span></button>
          <button class="ie-b" data-a="stop" title="Stop">${g('stop', 24)}</button>
          <button class="ie-b" data-a="refresh" title="Refresh">${g('refresh', 24)}</button>
          <button class="ie-b" data-a="home" title="Home">${g('home', 24)}</button>
          <span class="ex-tsep"></span>
          <button class="ie-b ie-bl" data-a="search" title="Search">${ico('search', 24)}<span class="ex-bt">Search</span></button>
          <button class="ie-b ie-bl" data-a="favorites" title="Favorites">${ico('star', 24)}<span class="ex-bt">Favorites</span></button>
          <button class="ie-b" data-a="history" title="History">${g('history', 24)}</button>
          <span class="ex-tsep"></span>
          <button class="ie-b" data-a="mail" title="Mail">${ico('mail', 24)}</button>
          <button class="ie-b" data-a="print" title="Print">${ico('printer', 24)}</button>
        </div>
        <div class="ex-addr ie-addr">
          <span class="ex-addr-l">Address</span>
          <div class="ex-addr-box"><span class="ex-addr-i">${g('ieDoc')}</span><input type="text" spellcheck="false" autocomplete="off"><span class="ex-addr-dd"></span></div>
          <button class="ex-go">${g('go')}<span>Go</span></button>
        </div>
        <div class="ie-links"><span class="ie-links-l">Links</span><a class="ie-link" data-url="${CLUB}" title="${CLUB}">${ico('star', 16)}<span>Kristians' Cheat Sheet Club</span></a>${LINKS.map(([t, u]) => `<a class="ie-link" data-url="${esc(u)}" title="${esc(u)}">${g('ieDoc')}<span>${esc(t)}</span></a>`).join('')}</div>
      </div>
      <div class="ie-main"><div class="ie-side" hidden></div><div class="ie-page"></div></div>
    </div>`);
    const page = root.querySelector('.ie-page'), side = root.querySelector('.ie-side'), addr = root.querySelector('.ie-addr input');
    const cur = () => S.hist[S.idx];
    const setBtns = () => {
      root.querySelector('[data-a=back]').disabled = S.idx <= 0;
      root.querySelector('[data-a=fwd]').disabled = S.idx >= S.hist.length - 1;
      root.querySelectorAll('.ie-tb [data-a=search],.ie-tb [data-a=favorites],.ie-tb [data-a=history]').forEach(b => b.classList.toggle('on', S.pane === b.dataset.a));
    };
    const status = (text, loading) => {
      win.setStatus(0, `${g(loading ? 'ieDoc' : 'page')}<span>${esc(text)}</span>`);
      win.setStatus(1, loading ? '<span class="ie-prog"><i></i></span>' : '');
      win.setStatus(2, `${g('globe')}<span>Internet</span>`);
    };
    const render = () => {
      const r = cur(); if (!r) return;
      addr.value = r.url;
      setBtns();
      page.innerHTML = '';
      if (r.kind === 'site') {
        const f = document.createElement('iframe');
        f.className = 'ie-frame';
        f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
        f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        f.src = r.url;
        S.loading = true; status(`Opening page ${r.url}...`, true);
        let first = true;
        f.onload = () => {
          S.loading = false; status('Done');
          // (R6 Q2) a same-origin page tells the screensaver the player is using it (another site's page can't be
          // listened to: src/boot.js frameInUse covers that)
          try { const d = f.contentDocument; if (d) ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(ev => d.addEventListener(ev, () => FR.idle && FR.idle.poke(), { passive: true, capture: true })); } catch (er) {}
          // navigated inside the site: the page's own title when the browser lets us read it (same origin), else the
          // company name (a cross-origin page's title and URL can't be read) (R3b S17)
          let t = '';
          try { t = (f.contentDocument && f.contentDocument.title || '').trim(); } catch (er) {}
          if (!first) win.setTitle(`${t || 'Packa Corporation'} - Internet Explorer`);
          first = false;
        };
        page.appendChild(f);
        win.setTitle(`${PTITLE[r.path] || 'Packa Corporation'} - Internet Explorer`);
      } else if (r.kind === 'club') {
        page.innerHTML = clubPage(r.sub); win.setTitle("Kristians' Cheat Sheet Club :: Unofficial Fan Site (of the official club) - Internet Explorer"); status('Done');
      } else if (r.kind === 'champ') {
        page.innerHTML = champPage(); win.setTitle('Microsoft Excel World Championship — Schedule - Internet Explorer'); status('Done');
      } else if (r.kind === 'standings') {
        // the players' leaderboard on Packa's intranet (src/score.js); it loads from the account server, so it can arrive after a navigation
        win.setTitle(`${FR.score.title} - Internet Explorer`); status('Done');
        FR.score.render(page, () => cur() === r);
      } else if (r.kind === 'extra') {
        const xp = FR.iePages[r.host];
        page.innerHTML = xp.html(r.url); win.setTitle(`${xp.title} - Internet Explorer`); status('Done');
        if (xp.onShow) xp.onShow(page, r.url);
      } else if (r.kind === 'blank') {
        page.innerHTML = '<div class="ie-blank"></div>'; win.setTitle('about:blank - Internet Explorer'); status('Done');
      } else {
        page.innerHTML = errorPage(r.url, r.kind === 'blocked');
        win.setTitle('The page cannot be displayed - Internet Explorer');
        status('Done');
        FR.sound.play('click');
      }
    };
    const go = (raw, push = true) => {
      const r = resolveUrl(raw); if (!r) return;
      if (push) { S.hist = S.hist.slice(0, S.idx + 1); S.hist.push(r); S.idx = S.hist.length - 1; } else S.hist[S.idx] = r;
      render();
    };
    const renderPane = () => {
      side.hidden = !S.pane;
      root.classList.toggle('ie-haspane', !!S.pane);
      if (!S.pane) return setBtns();
      let body = '';
      if (S.pane === 'favorites') {
        body = `<div class="ie-pbtn"><button disabled>Add...</button><button disabled>Organize...</button></div>
          <div class="ie-fav">${ico('folderOpen', 16)}<b>Links</b></div>${LINKS.map(([t, u]) => `<a class="ie-fl" data-url="${esc(u)}">${g('ieDoc')}<span>${esc(t)}</span></a>`).join('')}
          <a class="ie-fl" data-url="https://online.prairieledgerbank.example/">${g('ieDoc')}<span>Prairie Ledger Bank</span></a>
          <div class="ie-fav">${ico('folderOpen', 16)}<b>Kristians</b></div><a class="ie-fl" data-url="${CLUB}">${ico('star', 16)}<span>Kristians' Cheat Sheet Club</span></a>
          ${(FR.ieFavs || []).map(([folder, list]) => `<div class="ie-fav">${ico('folderOpen', 16)}<b>${esc(folder)}</b></div>${list.map(([t, u]) => `<a class="ie-fl" data-url="${esc(u)}">${g('ieDoc')}<span>${esc(t)}</span></a>`).join('')}`).join('')}
          <a class="ie-fl" data-tip="1">${g('help')}<span>Tip: View &gt; Source</span></a>`;
      } else if (S.pane === 'history') {
        body = `<div class="ie-pbtn"><button disabled>View</button><button disabled>Search</button></div>` + IEHIST.map(([day, ents]) => `<div class="ie-fav">${g('history')}<b>${esc(day)}</b></div>${ents.map(([t, u]) => `<a class="ie-fl" data-url="${esc(u)}" title="${esc(u)}">${g('ieDoc')}<span>${esc(t)}</span></a>`).join('')}`).join('');
      } else {
        body = `<div class="ie-sq"><div>Find a Web page containing:</div><input type="text" class="ie-sq-i"><div class="ie-pbtn"><button class="ie-sq-go">Search</button></div><div class="ie-sq-n">Search is provided by your default search provider. Frank's default search provider is "asking Joshua".</div></div>`;
      }
      side.innerHTML = `<div class="ex-fp"><div class="ex-fp-h"><span>${{ favorites: 'Favorites', history: 'History', search: 'Search' }[S.pane]}</span><button class="ex-fp-x" data-closepane="1">${G.close}</button></div><div class="ie-pb">${body}</div></div>`;
      const sq = side.querySelector('.ie-sq-go');
      if (sq) { const run = () => go('http://search.example/results?q=' + encodeURIComponent(side.querySelector('.ie-sq-i').value)); sq.onclick = run; side.querySelector('.ie-sq-i').onkeydown = e => { if (e.key === 'Enter') run(); }; }
      setBtns();
    };
    const tipSource = () => {
      const r = cur(); const u = r && r.kind === 'site' ? r.url : SITE + '/';
      window.open(u, '_blank', 'noopener');
      if (FR.mobile) return FR.dialog({ title: 'View Source', icon: 'info', message: "Frank's IE can't show source. Opening the page in your phone's browser.<br><br>On Android (Chrome), put <b>view-source:</b> in front of the address. On an iPhone there's no View Source: a laptop is easiest (Ctrl+U)." });
      FR.dialog({ title: 'View Source', icon: 'info', width: 420, message: "Frank's IE can't show source. Opening the page in your real browser.<br><br>When it opens, press <b>Ctrl+U</b> (or <b>&#8984;+Option+U</b> on a Mac) to view the page source." });
    };
    // (F12, round 4) Edit › Find (on This Page): Frank's own pages (the intranet leaderboard, the fan club, the
    // championship…) are searched here: every hit is marked, the first one (then the next, on "Find Next") scrolled into
    // view. packacorp.com is the live company site in a frame the game can't read; the browser's own Find can.
    const findOnPage = async () => {
      const r = cur();
      if (r && r.kind === 'site') {
        let doc = null; try { doc = page.querySelector('iframe').contentDocument; } catch (er) {}
        if (!doc) return FR.dialog({ title: 'Find', icon: 'info', width: 420, message: `This page is on <b>www.packacorp.com</b>, the company's live website. Frank's Internet Explorer can't search inside it, but your own browser can:<br><br>${FR.mobile ? "the browser's menu › <b>Find in page</b> (Chrome), or <b>Share › Find on Page</b> (Safari)." : 'press <b>Ctrl+F</b> (<b>&#8984;+F</b> on a Mac).'}` });
      }
      const res = await FR.dialog({ title: 'Find', icon: 'question', message: 'Find what:', input: { label: '', type: 'text', value: S.lastFind || '' }, buttons: ['Find Next', 'Cancel'] });
      if (res.button !== 'Find Next' || !res.value || !res.value.trim()) return;
      const q = res.value.trim(); S.lastFind = q;
      let root_ = page, doc = document;
      if (r && r.kind === 'site') { try { doc = page.querySelector('iframe').contentDocument; root_ = doc.body; } catch (er) { return; } }
      root_.querySelectorAll('mark.ie-hit').forEach(m => m.replaceWith(doc.createTextNode(m.textContent)));
      root_.normalize();
      const hits = [], ql = q.toLowerCase(), tw = doc.createTreeWalker(root_, NodeFilter.SHOW_TEXT);
      const nodes = []; for (let n = tw.nextNode(); n; n = tw.nextNode()) if (n.parentElement && !n.parentElement.closest('script, style') && n.nodeValue.toLowerCase().includes(ql)) nodes.push(n);
      nodes.forEach(n => {
        let t = n;
        for (let i = t.nodeValue.toLowerCase().indexOf(ql); i >= 0; i = t.nodeValue.toLowerCase().indexOf(ql)) {
          const hit = t.splitText(i); t = hit.splitText(q.length);
          const m = doc.createElement('mark'); m.className = 'ie-hit'; m.style.cssText = 'background:#ffef5a;color:inherit;outline:1px solid #c9a800';
          hit.replaceWith(m); m.appendChild(hit); hits.push(m);
        }
      });
      if (!hits.length) return FR.dialog({ title: 'Microsoft Internet Explorer', icon: 'info', message: `Finished searching the page. "${esc(q)}" was not found.` });
      S.hitN = S.lastHitQ === q ? (S.hitN + 1) % hits.length : 0; S.lastHitQ = q;
      hits[S.hitN].style.background = '#ff9632';
      hits[S.hitN].scrollIntoView({ block: 'center' });
      status(`Found ${hits.length} match${hits.length === 1 ? '' : 'es'} for "${q}"${hits.length > 1 ? ` (${S.hitN + 1} of ${hits.length}; Find again for the next)` : ''}`);
    };
    const openReal = () => { const r = cur(); window.open(r && r.kind === 'site' ? r.url : (r ? r.url : SITE + '/'), '_blank', 'noopener'); };
    const menu = [
      { label: 'File', items: [
        { label: 'New Window', key: 'Ctrl+N', action: () => FR.apps.ie(cur() ? cur().url : null, { fresh: true }) },
        { label: 'Open in new window (real browser)', action: openReal },
        { label: 'Open...', key: 'Ctrl+O', action: () => addr.focus() },
        { label: 'Save As...', disabled: true }, { sep: true },
        { label: 'Page Setup...', disabled: true }, { label: 'Print...', key: 'Ctrl+P', action: () => printDlg() }, { sep: true },
        { label: 'Properties', action: () => { const r = cur(); FR.dialog({ title: 'Properties', icon: 'info', width: 420, message: `<b>${esc(r ? (PTITLE[r.path] || r.url) : '')}</b><br><br>Protocol: HyperText Transfer Protocol${r && r.url.startsWith('https') ? ' with Privacy' : ''}<br>Type: HTML Document<br>Connection: Not Encrypted (it's 2003 in here)<br>Address (URL): ${esc(r ? r.url : '')}<br>Zone: Internet` }); } },
        { label: 'Close', action: () => win.close() },
      ] },
      { label: 'Edit', items: [{ label: 'Cut', disabled: true }, { label: 'Copy', disabled: true }, { label: 'Paste', disabled: true }, { sep: true }, { label: 'Select All', disabled: true }, { sep: true }, { label: 'Find (on This Page)...', key: 'Ctrl+F', action: () => findOnPage() }] },
      { label: 'View', items: () => [
        { label: 'Toolbars', disabled: true }, { label: 'Status Bar', checked: true, disabled: true },
        { label: 'Explorer Bar: Favorites', checked: S.pane === 'favorites', action: () => { S.pane = S.pane === 'favorites' ? null : 'favorites'; renderPane(); } },
        { label: 'Explorer Bar: History', checked: S.pane === 'history', action: () => { S.pane = S.pane === 'history' ? null : 'history'; renderPane(); } },
        { sep: true },
        { label: 'Stop', key: 'Esc', action: () => status('Done') }, { label: 'Refresh', key: 'F5', action: () => render() }, { sep: true },
        { label: 'Source', action: tipSource }, { label: 'Full Screen', key: 'F11', action: () => win.maximize() },
      ] },
      { label: 'Favorites', items: [
        { label: 'Add to Favorites...', disabled: true }, { label: 'Organize Favorites...', disabled: true }, { sep: true },
        ...LINKS.map(([t, u]) => ({ label: t, action: () => go(u) })), { sep: true },
        { label: "Kristians' Cheat Sheet Club", action: () => go(CLUB) }, { sep: true },
        { label: 'Tip: View > Source', action: tipSource },
      ] },
      { label: 'Tools', items: [
        { label: 'Mail and News', disabled: true }, { label: 'Pop-up Blocker', disabled: true }, { label: 'Manage Add-ons...', disabled: true }, { sep: true },
        { label: 'Windows Update', action: () => FR.dialog({ title: 'Windows Update', icon: 'error', message: 'Windows Update has been disabled by your administrator.<br><br>"It works. Don\'t touch it." —F' }) },
        { sep: true },
        { label: 'Internet Options...', action: () => FR.dialog({ title: 'Internet Options', icon: 'lock', width: 430, message: '<b>Home page:</b> https://www.packacorp.com/<br><br><b>Restricted sites</b> (added by Frank Warmington):<br>&nbsp;&nbsp;&#8226; *.datarails.com<br><br><b>Note field:</b> <i>"Emily: yes, I know. After the Board. After every Board."</i>' }) },
      ] },
      { label: 'Help', items: [{ label: 'About Internet Explorer', action: () => FR.dialog({ title: 'About Internet Explorer', icon: 'ie', message: 'Internet Explorer<br>Version: 6.0.2900.5512.xpsp_sp3<br>Cipher Strength: 128-bit<br><br>Licensed to: Frank Warmington, Packa Corporation' }) }] },
    ];
    const win = FR.wm.open({ id: !opts.fresh && !FR.wm.wins.has('ie') ? 'ie' : undefined, title: 'Internet Explorer', icon: 'ie', width: 880, height: 620, className: 'ie-win', menu, content: root, statusBar: ['', '', ''] });
    win._ieGo = go;
    root.querySelector('.ie-tb').addEventListener('click', e => {
      const b = e.target.closest('.ie-b'); if (!b || b.disabled) return;
      const a = b.dataset.a;
      if (a === 'back' && S.idx > 0) { S.idx--; render(); }
      else if (a === 'fwd' && S.idx < S.hist.length - 1) { S.idx++; render(); }
      else if (a === 'stop') { const f = page.querySelector('iframe'); if (f && S.loading) { try { f.contentWindow.stop(); } catch (er) {} } status('Done'); }
      else if (a === 'refresh') render();
      else if (a === 'home') go(SITE + '/');
      else if (['search', 'favorites', 'history'].includes(a)) { S.pane = S.pane === a ? null : a; renderPane(); }
      else if (a === 'mail') FR.apps.mail ? FR.apps.mail(null) : null;
      else if (a === 'print') printDlg();
    });
    addr.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(addr.value); } });
    root.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && e.target !== addr) { e.preventDefault(); findOnPage(); } });
    addr.addEventListener('focus', () => addr.select());
    root.querySelector('.ie-addr .ex-go').onclick = () => go(addr.value);
    root.querySelector('.ie-addr .ex-addr-dd').addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const box = root.querySelector('.ie-addr .ex-addr-box').getBoundingClientRect();
      const seen = [...new Set(S.hist.map(h => h.url).concat(LINKS.map(l => l[1])))];
      const p = popup(box.left, box.bottom, seen.map(u => ({ label: u, icon: 'ieDoc', action: () => go(u) }))); p.style.minWidth = box.width + 'px'; p.classList.add('sh-pop-addr');
    });
    root.querySelector('.ie-links').addEventListener('click', e => { const l = e.target.closest('[data-url]'); if (l) go(l.dataset.url); });
    side.addEventListener('click', e => {
      if (e.target.closest('[data-closepane]')) { S.pane = null; renderPane(); return; }
      if (e.target.closest('[data-tip]')) return tipSource();
      const l = e.target.closest('[data-url]'); if (l) go(l.dataset.url);
    });
    page.addEventListener('click', e => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const k = nav.dataset.nav;
        if (k === 'members') { FR.sound.play('click'); FR.dialog({ title: 'Members Only', icon: 'lock', width: 400, message: "Members Only &mdash; you are not a member.<br><br>Frank is.<br><br><i>(Member #0003. He will tell you. You don't have to ask.)</i>" }); return; }
        if (k === 'guestbook') { const h = [...page.querySelectorAll('h3')].find(x => /guestbook/i.test(x.textContent)); if (h) h.scrollIntoView({ block: 'start' }); else go(CLUB); return; }
        go(k === 'home' ? CLUB : CLUB + '/' + k); return;
      }
      const lk = e.target.closest('.cc-lnk'); if (lk) { go(lk.dataset.url); return; }
      const l = e.target.closest('[data-ie]'); if (!l) return; if (l.dataset.ie === 'home') go(SITE + '/'); else render(); });
    go(url || SITE + '/');
    return win;
  }
  FR.apps.ie = ie;

  /* ======================================================================================
     CALCULATOR
     ====================================================================================== */
  function calc() {
    if (FR.wm.wins.has('sh-calc')) { const w = FR.wm.wins.get('sh-calc'); w.restore(); w.focus(); return w; }
    const C = { disp: '0', acc: null, op: null, fresh: true, lastOp: null, lastVal: null, mem: 0, err: false, group: false };
    const B = (t, cls, k) => `<button class="ca-k ${cls}" data-k="${esc(k || t)}">${t}</button>`;
    const root = $(`<div class="ca">
      <input class="ca-disp" type="text" readonly value="0.">
      <div class="ca-r1"><span class="ca-mi"></span>${B('Backspace', 'ca-red ca-wide', 'bs')}${B('CE', 'ca-red ca-wide', 'ce')}${B('C', 'ca-red ca-wide', 'c')}</div>
      <div class="ca-grid">
        ${B('MC', 'ca-red', 'mc')}${B('7', 'ca-blue')}${B('8', 'ca-blue')}${B('9', 'ca-blue')}${B('/', 'ca-red')}${B('sqrt', 'ca-blue', 'sqrt')}
        ${B('MR', 'ca-red', 'mr')}${B('4', 'ca-blue')}${B('5', 'ca-blue')}${B('6', 'ca-blue')}${B('*', 'ca-red')}${B('%', 'ca-blue')}
        ${B('MS', 'ca-red', 'ms')}${B('1', 'ca-blue')}${B('2', 'ca-blue')}${B('3', 'ca-blue')}${B('-', 'ca-red')}${B('1/x', 'ca-blue', 'inv')}
        ${B('M+', 'ca-red', 'm+')}${B('0', 'ca-blue')}${B('+/-', 'ca-blue', 'neg')}${B('.', 'ca-blue')}${B('+', 'ca-red')}${B('=', 'ca-red')}
      </div></div>`);
    const d = root.querySelector('.ca-disp'), mi = root.querySelector('.ca-mi');
    const fmt = n => {
      if (!isFinite(n)) return null;
      let s = String(parseFloat(n.toPrecision(15)));
      if (/e/.test(s)) { const [m, e] = s.split('e'); s = (m.includes('.') ? m : m + '.') + 'e' + (e[0] === '-' ? '-' : '+') + e.replace(/^[+-]/, '').padStart(3, '0'); }
      return s;
    };
    const grp = s => { if (!C.group || /e/.test(s)) return s; const neg = s[0] === '-'; const [i, f] = s.replace('-', '').split('.'); return (neg ? '-' : '') + commas(i) + (f !== undefined ? '.' + f : ''); };
    const show = () => {
      if (C.err) { d.value = C.err; } else { const s = C.disp; d.value = grp(s) + (s.includes('.') || /e/.test(s) ? '' : '.'); }
      mi.textContent = C.mem ? 'M' : '';
      FR.bus.emit('calc-display', d.value);
    };
    const val = () => parseFloat(C.disp) || 0;
    const set = n => { const s = fmt(n); if (s === null) { C.err = 'Cannot divide by zero.'; C.acc = null; C.op = null; } else C.disp = s; };
    const ev = (a, op, b) => op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : op === '/' ? (b === 0 ? Infinity : a / b) : b;
    const press = k => {
      if (C.err && k !== 'c' && k !== 'ce') { C.err = false; C.disp = '0'; C.acc = null; C.op = null; C.fresh = true; }
      if (/^[0-9]$/.test(k) || k === '.') {
        if (C.fresh) { C.disp = k === '.' ? '0.' : k; C.fresh = false; }
        else { if (k === '.' && C.disp.includes('.')) return show(); if (C.disp.replace(/[-.]/g, '').length >= 32) return show(); C.disp = (C.disp === '0' && k !== '.') ? k : C.disp + k; }
        if (!C.op) C.lastOp = null;
      } else if (['+', '-', '*', '/'].includes(k)) {
        if (C.op && !C.fresh) { const r = ev(C.acc, C.op, val()); set(r); C.acc = r; } else if (!C.op || !C.fresh) C.acc = val();
        if (C.acc === null) C.acc = val();
        C.op = k; C.fresh = true; C.lastOp = null;
      } else if (k === '=') {
        if (C.op) { const b = val(); const r = ev(C.acc, C.op, b); C.lastOp = C.op; C.lastVal = b; C.op = null; set(r); C.acc = r; }
        else if (C.lastOp) { const r = ev(val(), C.lastOp, C.lastVal); set(r); C.acc = r; }
        C.fresh = true;
      } else if (k === 'c') { Object.assign(C, { disp: '0', acc: null, op: null, fresh: true, lastOp: null, lastVal: null, err: false }); }
      else if (k === 'ce') { C.disp = '0'; C.fresh = true; C.err = false; }
      else if (k === 'bs') { if (!C.fresh) { C.disp = C.disp.slice(0, -1); if (!C.disp || C.disp === '-') C.disp = '0'; } }
      else if (k === 'neg') { if (C.disp !== '0') C.disp = C.disp[0] === '-' ? C.disp.slice(1) : '-' + C.disp; }
      else if (k === 'sqrt') { const v = val(); if (v < 0) C.err = 'Invalid input for function.'; else set(Math.sqrt(v)); C.fresh = true; }
      else if (k === 'inv') { const v = val(); if (v === 0) C.err = 'Cannot divide by zero.'; else set(1 / v); C.fresh = true; }
      else if (k === '%') { set(C.op ? C.acc * val() / 100 : 0); C.fresh = true; }
      else if (k === 'mc') C.mem = 0;
      else if (k === 'mr') { set(C.mem); C.fresh = true; }
      else if (k === 'ms') { C.mem = val(); C.fresh = true; }
      else if (k === 'm+') { C.mem += val(); C.fresh = true; }
      show();
    };
    const menu = [
      { label: 'Edit', items: [
        { label: 'Copy', key: 'Ctrl+C', action: () => { try { navigator.clipboard.writeText(C.err ? '' : C.disp); } catch (e) {} } },
        { label: 'Paste', key: 'Ctrl+V', action: () => { try { navigator.clipboard.readText().then(t => { const n = parseFloat(String(t).replace(/,/g, '')); if (!isNaN(n)) { set(n); C.fresh = false; show(); } }); } catch (e) {} } },
      ] },
      { label: 'View', items: () => [
        { label: 'Standard', checked: true }, { label: 'Scientific', disabled: true }, { sep: true },
        { label: 'Digit grouping', checked: C.group, action: () => { C.group = !C.group; show(); } },
      ] },
      { label: 'Help', items: [
        { label: 'Help Topics', action: () => FR.dialog({ title: 'Calculator Help', icon: 'info', message: 'Keyboard: 0-9 . + - * / Enter, Esc = C, Del = CE, Backspace, % , @ = sqrt, r = 1/x, F9 = +/-.' }) },
        { sep: true },
        { label: 'About Calculator', action: () => FR.dialog({ title: 'About Calculator', icon: 'calc', message: 'Calculator<br>Version 5.1<br><br>Licensed to: Frank Warmington, Packa Corporation<br><br><i>"Real FP&amp;A people use Excel as a calculator." —F</i>' }) },
      ] },
    ];
    const win = FR.wm.open({ id: 'sh-calc', title: 'Calculator', icon: 'calc', width: 262, height: 260, resizable: false, className: 'ca-win', menu, content: root });
    win.el.style.height = 'auto';
    root.addEventListener('click', e => { const b = e.target.closest('.ca-k'); if (b) { press(b.dataset.k); b.blur(); } });
    const onKey = e => {
      if (!FR.wm.wins.has(win.id)) { document.removeEventListener('keydown', onKey); return; }
      if (FR.wm.active !== win || win.el.classList.contains('fr-inactive')) return;
      if (e.target.closest && e.target.closest('input:not(.ca-disp),textarea')) return;
      const map = { Enter: '=', '=': '=', Escape: 'c', Delete: 'ce', Backspace: 'bs', '@': 'sqrt', r: 'inv', R: 'inv', F9: 'neg', ',': '.' };
      let k = map[e.key] || e.key;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { menu[0].items[0].action(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { menu[0].items[1].action(); return; }
      if (e.ctrlKey && e.key.toLowerCase() === 'm') k = 'ms'; else if (e.ctrlKey && e.key.toLowerCase() === 'r') k = 'mr'; else if (e.ctrlKey && e.key.toLowerCase() === 'l') k = 'mc'; else if (e.ctrlKey && e.key.toLowerCase() === 'p') k = 'm+';
      else if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(k) || ['.', '+', '-', '*', '/', '=', 'c', 'ce', 'bs', 'sqrt', 'inv', 'neg', '%', 'ms', 'mr', 'mc', 'm+'].includes(k)) {
        e.preventDefault();
        press(k);
        const btn = root.querySelector(`.ca-k[data-k="${CSS.escape(k)}"]`); if (btn) { btn.classList.add('ca-press'); setTimeout(() => btn.classList.remove('ca-press'), 90); }
      }
    };
    document.addEventListener('keydown', onKey);
    show();
    return win;
  }
  FR.apps.calc = calc;

  /* ======================================================================================
     TEXT FILE CONTENTS (FR.data.texts)
     ====================================================================================== */
  T.agenda = `PACKA CORPORATION
BOARD OF DIRECTORS - SPECIAL MEETING
AGENDA  (DRAFT 4 - D. Kessler)

Date:      Tuesday, October 20, 2026
Time:      9:00 AM - 11:30 AM Central
Location:  Conference Room B, 1420 East 3rd Street, Sedalia, MO 65301
           (the one with the broken projector - bring paper copies)

Invited:   S. Packa (Chair), D. Kessler, K. Wills, T. Bracken, D. Hollis,
           F. Warmington (FP&A Manager), two outside directors
Guest:     Marcus Hale, Relationship Manager, Prairie Ledger Bank, N.A.
           (items 4 through 7 only)

-----------------------------------------------------------------------------------
 #   ITEM                                                PRESENTER            TIME
-----------------------------------------------------------------------------------
 1.  Call to order; approval of minutes of July 21       S. Packa             9:00
 2.  Q3 results & EBITDA bridge                          F. Warmington        9:10
 3.  FY27 budget approval (Board copy)                   F. Warmington /      9:30
                                                         D. Kessler
 4.  Covenant compliance certificate -                   D. Kessler           9:50
     Prairie Ledger Bank (Q3, DSCR)
 5.  13-week cash forecast & liquidity                   F. Warmington       10:05
 6.  Emergency plan (FOR THE BOARD) - vote               F. Warmington /     10:25
                                                         D. Hollis
 7.  Survival package - $4.0M facility vote              S. Packa /          10:50
                                                         D. Kessler
 8.  AOB (incl. annual pool-jumping contest - D. Hollis) All                 11:15
-----------------------------------------------------------------------------------

Pre-reads ("the Board Pack") to D. Kessler no later than 9:00 AM Tuesday:
  - FY27 Budget, Board copy (approved version)
  - Covenant compliance certificate, Q3 2026
  - 13-week cash forecast, weeks beginning Oct 19 (the REAL one, Frank)
  - Q3 EBITDA bridge, budget to actual
  - Emergency plan (FOR THE BOARD)

No pack, no vote. No vote, no facility.  -DK

Coffee: Karen.  Donuts: Tom (not the ones from the gas station again, Tom).
`;

  T.packlist = `WHAT THE BANK WANTS  (per Marcus Hale, call 10/12)
==================================================

Board Pack for Tue 10/20. Diane sends it to the Board + Marcus before the meeting.
Marcus: "No blanks, no plugs, no TBDs, or there is no $4.0M."

  [ ] 1. FY27 Budget - Board copy, the version Diane actually approved
  [ ] 2. Covenant compliance certificate Q3 - DSCR, calculated the bank's way
  [ ] 3. 13-week cash forecast - the REAL one, and the first week we dip under
         the minimum
  [ ] 4. Q3 EBITDA bridge - budget to actual, every bar filled in
  [ ] 5. FOR THE BOARD - the plan. You'll need the truth to open it.

Notes to self (in case I'm not here) — from the FP&A Manager, not "Director":

1. Budget: Diane's criteria are in her email. Ignore file names. File names lie.
2. Board copy is locked; the hint is in the RIGHT version only.
3. Covenant: read 6.1 slowly. Not all capex is equal.
4. Cash: I keep it where Drew won't look.
5. Bridge: never plug a bar you can calculate. Freight is the residual.
   Calculate it, don't type it.
6. The plan: it's on the desktop. It's been on the desktop for three months.

("in case I'm not here" - relax, it's a figure of speech.)
`;

  T.bud_readme = `Frank,

there are FIVE versions in here and THREE of them say FINAL. Which one is final???

Diane asked me for "the final one" and I sent her v4_FINAL and she said
"That is not the final one, Joshua." In the voice.

- J

---------------------------------------------------------------------------

(Frank:) the one that passes all three of Diane's tests. Obviously.
`;

  // Office owner/lock file: length byte + user name padded, then the UTF-16 copy (nulls shown as dots)
  const lockName = 'Frank Warmington';
  T.bud_lock = (('\u0010' + lockName).padEnd(54, ' ') + '\u0010.' + lockName.split('').join('.') + '.').padEnd(163, '.') + '\u00ff\u00ff';

  T.loan = `CONFORMED COPY (as amended and restated through June 1, 2026)          CONFIDENTIAL

                            CREDIT AGREEMENT
                        (EXCERPT - ARTICLES I, II, VI AND VII)

                    originally dated as of March 15, 2024
              as amended and restated through Amendment No. 3, June 1, 2026

                                  between

                           PACKA CORPORATION,
                          a Missouri corporation,
                              as Borrower,

                                    and

                        PRAIRIE LEDGER BANK, N.A.,
                                as Lender

------------------------------------------------------------------------------------------
                                  ARTICLE I
                                 DEFINITIONS

Section 1.1  Defined Terms.  As used in this Agreement, the following terms have the
meanings specified below:

"Capital Expenditures" means, for any period, the aggregate of all expenditures by the
Borrower during such period that, in accordance with GAAP, are or should be included in
"purchase of property and equipment" or similar items reflected in the statement of cash
flows of the Borrower.

"Consolidated EBITDA" means, for any period, Consolidated Net Income for such period plus,
without duplication and to the extent deducted in determining such Consolidated Net Income,
(a) interest expense, (b) income tax expense, and (c) depreciation and amortization
expense, all as determined in accordance with GAAP.

"Equipment Loan" means the equipment financing facility provided by the Lender to the
Borrower pursuant to the Equipment Loan Supplement dated as of June 1, 2026.

"Key Person" means each of the President, the Chief Financial Officer and the Director of
Financial Planning and Analysis of the Borrower.

"Scheduled Principal Payments" means, for any period, the sum of all scheduled payments of
principal on the Term Loan A made or required to be made during such period.

"Test Period" means, at any date of determination, the period of four (4) consecutive
fiscal quarters of the Borrower most recently ended.

"Unfunded Capital Expenditures" means Capital Expenditures not financed with the proceeds
of Indebtedness (other than Revolving Loans). For the avoidance of doubt, Capital
Expenditures financed with the proceeds of the Equipment Loan shall not constitute
Unfunded Capital Expenditures.

"Unrestricted Cash" means cash and cash equivalents of the Borrower that are not subject to
any Lien (other than Liens in favor of the Lender) and are not otherwise restricted.

------------------------------------------------------------------------------------------
                                  ARTICLE II
                                 TERM LOAN A

Section 2.1  Term Loan A.  Subject to the terms and conditions set forth herein, the Lender
has made a term loan (the "Term Loan A") to the Borrower. As of the last day of the fiscal
quarter ended September 30, 2026, the outstanding principal amount of the Term Loan A is
$6,000,000.

Section 2.2  Interest.  The Term Loan A shall bear interest at a fixed rate of seven and
one-half percent (7.50%) per annum (the "Fixed Rate") on the outstanding principal amount
thereof, payable in cash monthly in arrears on the twentieth (20th) day of each calendar
month, together with the Scheduled Principal Payment then due.

Section 2.3  Amortization.  The Borrower shall repay the principal of the Term Loan A in
equal monthly installments of $145,833.33 on the twentieth (20th) day of each calendar
month (each a "Scheduled Principal Payment"), aggregating $1,750,000 per annum, with the
remaining balance due on the Maturity Date.

------------------------------------------------------------------------------------------
                                  ARTICLE VI
                             FINANCIAL COVENANTS

Section 6.1  Debt Service Coverage Ratio.  The Borrower shall not permit the Debt Service
Coverage Ratio, as of the last day of any fiscal quarter, to be less than 1.25 to 1.00.
For purposes hereof, "Debt Service Coverage Ratio" means the ratio of

     (a) Consolidated EBITDA  minus  Unfunded Capital Expenditures, in each case for
         the Test Period then ended (i.e., the trailing four fiscal quarters),

  to

     (b) the sum of (i) interest on the outstanding principal amount of the Term Loan A
         as of such date of determination, computed at the Fixed Rate for one year
         (i.e., the test-date balance multiplied by 7.50%), plus (ii) the Scheduled
         Principal Payments falling due in the twelve (12) months immediately following
         such date of determination.

For the avoidance of doubt, clause (b) is a forward-looking measure of debt service and is
not the interest or principal actually paid during the Test Period.

Section 6.2  Minimum Liquidity.  The Borrower shall maintain Unrestricted Cash of not less
than $250,000 at the end of each calendar week.

Section 6.3  Compliance Certificate.  Within forty-five (45) days after the end of each
fiscal quarter, the Borrower shall deliver to the Lender a certificate signed by a
Responsible Officer setting forth reasonably detailed calculations demonstrating compliance
with Sections 6.1 and 6.2, together with a thirteen (13) week cash flow forecast.

------------------------------------------------------------------------------------------
                                 ARTICLE VII
                              EVENTS OF DEFAULT

Section 7.1  Events of Default.  Each of the following shall constitute an "Event of
Default":

  (a) the Borrower fails to pay any principal of the Term Loan A when due;

  (b) the Borrower fails to pay any interest or fee within three (3) Business Days after
      the same becomes due;

  (c) the Borrower fails to observe or perform any covenant contained in Article VI;

    ...

  (j) any financial statement, certificate or forecast delivered hereunder proves to have
      been incorrect in any material respect when delivered, including by reason of any
      figure having been "plugged", hard-coded or otherwise not derived from the books and
      records of the Borrower;

  (k) the loss, departure or disappearance of any Key Person, including the Director of
      FP&A, without a replacement reasonably acceptable to the Lender within thirty (30)
      days thereof; or

  (l) the Lender shall have received no response to three (3) consecutive e-mails
      addressed to a Key Person.

------------------------------------------------------------------------------------------
[Remainder of page intentionally left blank. Signature pages follow.]

PACKA CORPORATION                              PRAIRIE LEDGER BANK, N.A.

By: /s/ Steven Packa                           By: /s/ Marcus Hale
Name: Steven Packa                             Name: Marcus Hale
Title: President                               Title: Relationship Manager
`;

  T.realnotes = `PACKA CORP — REAL VERSION — notes
Frank, FP&A Manager (the website says Director. Steve's idea.)

Jul 14  Runway 108 days. Told Drew. "Make it work."
Aug 11  84 days. Two accounts gone. "Temporary variance."
Sep 08  68 days. Revolver maxed. "New scenario."
Sep 28  51 days. Drew typed 182 into the Board file himself.
Oct 06  47 days. Payroll risk. No reply.
Oct 16  43 days. Board is Tuesday.

Everything is in CHANGE_LOG. Dated. Initialed.
The real cash file is the weekly one in this folder. Dated.
The Board versions are next door.

FOR THE BOARD (desktop) password:
=CONCAT(what they told the Board, what's true)
Both in days. CONCAT, not SUM. I'm not an animal.

Do not touch the "DO NOT DELETE" tab.
GET SHEET DONE.
`;

  T.cashnote = `If you found this you know how to show hidden files. Congrats.
Drew doesn't. That's the point.

Cash forecast: payroll row is blank because Rachel's number changes every
time I ask. Latest from Rachel: $196K per run, all-in.

Payroll = every run, not every week. We pay on the schedule on our careers
page. First run of the forecast is Fri Oct 23.

Do the math before you believe the Board deck.

Plant lease is $180K because Steve rents it from the family trust at 1993
prices. Don't bring it up.

—F
`;

  T.todo = `TODO (personal - NOT work)
--------------------------
renew driver's license ✓
championship registration - confirm team entry (2 players) ✓
practice INDEX/MATCH speedruns (under 4 seconds per lookup)
practice INDEX/MATCH speedruns AGAIN (video call w/ K., 4am his time)
buy sunscreen (desert)
pack Excel pillow + yoga mat
put poster back from the outside (how?)
stop the newspaper Sat-Sun
water the ficus -> ask Joshua (he will forget)
tell Diane? no.
cowboy hat — NO, that's Drew's thing
pack: laptop, 2 chargers, the good calculator, lucky keyboard, GET SHEET DONE mug
FY27 budget: five versions, three say FINAL, Diane signed one. she knows which.
finish the Board Pack  <- it's all in the files. mostly. they'll figure it out.
`;

  T.rachelcard = `♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥

    FRANK!!!!!  (mīļais ♥ — that's Latvian! I've been learning!!)

    Happy SEVENTEEN years at Packa!!! ♥ 17!!! We started the same
    month, remember? You probably don't. I do. ♥

    I just want you to know this office would fall apart without you.
    Especially payroll. Especially ME. lol!!! jk. (not jk ♥)

    Payday Fridays are my favorite because I get to email you the
    payroll number ♥

    If you ever want to grab lunch and talk about accruals or
    headcount or ANYTHING, my calendar is SO open. So open. ♥♥
    (NOT with "cheat sheet" people. Just saying.)

    Your favorite payroll & HR coordinator,
    xoxo (professionally!!!)
    Rachel ☺

    P.S. Paldies for fixing my pivot table. Paldies = thank you. ♥

♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥ ♥
`;

  T.boarding = ` ____________________________________________________________________
|                                                                    |
|   PRAIRIE SKY AIRWAYS                          BOARDING PASS       |
|   ~ flying the heartland since 1991 ~                              |
|____________________________________________________________________|
|                                                                    |
|   PASSENGER      WARMINGTON/FRANK                                  |
|                  +1 companion: B▒▒▒▒S/K▒▒▒▒▒▒▒S                    |
|   FREQUENT FLYER CHE▒T SH▒▒T CLUB #00▒3                            |
|                                                                    |
|   FROM           KANSAS CITY (MCI)                                 |
|   TO             L▒S  ▒▒▒▒▒▒▒▒▒ ▒▒▒▒▒▒▒     [ink smudge]           |
|                                                                    |
|   FLIGHT         PS 1958              DATE        17OCT26          |
|   SEAT           12F / 12E            GROUP       B                |
|   BOARDING       05:40                GATE        ▒▒               |
|   CONF           XLWC26                                            |
|                                                                    |
|   ||| || ||||| | |||| || ||| |||| | ||| || |||| ||| || | |||| |    |
|____________________________________________________________________|

   (coffee ring, lower left)
`;

  T.k_webinar = `WEBINAR NOTES — "LAMBDA NIGHT" w/ KRISTIANS BUŠĀRS  (Thu 9/24, 8 PM our time = 4 AM Riga. He did it anyway.)
=============================================================================

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
HE SAID MY NAME!!! (first time. ever. 9/24. write it down. I did.)
"Frank from Sedalia, good question." FRANK FROM SEDALIA. THAT'S ME.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

LAMBDA tips:
 - =LAMBDA(x, x*1.07)(A2)  -> test it inline first, THEN name it
 - Name Manager = where LAMBDAs live. Name them like a grown-up
   (NOT "Frank1", "Frank2", "FrankFINAL")
 - LET() inside LAMBDA -> readable. "Your future self is a stakeholder." (!!)
 - recursion is possible. recursion is possible. recursion is possible.
 - BYROW / MAP -> no more dragging formulas down 4,000 rows at midnight
 - "If a formula needs a comment to explain it, it needs a LAMBDA." — K.

My question: "how do you stop your boss from typing over formulas?"
His answer: "My friend. You protect the sheet. And your soul." jā.
(no name the second time. once is enough. once is EVERYTHING.)
(the chat went crazy. 300 people. someone typed "FRANK!!!")

TODO:
 - rebuild the DO NOT DELETE tab with LAMBDAs (after the Board)
 - print cheat sheet #212 BIG (done - it's the poster now)
 - ask about the Vegas team thing
 - practice. practice. practice.

best. night. ever.
`;

  T.passwords = `Nice try. —F

-----------------------------------------------
PASSWORDS (not really)
-----------------------------------------------
Board file:   not here
Bank.zip:     ='P&L Summary'!C12 (the one I broke)
Windows:      you're already in, genius
Diane:        coffee, black
Drew:         "make it work"
Voicemail:    I don't check voicemail
Fan club:     ask me in person ;)
Website:      still says 'Director'. Steve. Don't ask.
`;

  FR.shell.texts = T;
})();
