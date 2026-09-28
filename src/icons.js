/* Original XP-flavoured icon set (hand-drawn SVG, 32x32) */
(() => {
  const g = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const S = (defs, body) => `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${body}</svg>`;
  let uid = 0;
  const U = p => p + (uid++);

  const folder = (tint = ['#fde79a', '#f3c24a'], extra = '') => { const a = U('fa'), b = U('fb'); return S(
    g(a, [[0, '#f9d97a'], [1, '#e0a92c']]) + g(b, [[0, tint[0]], [1, tint[1]]]),
    `<path d="M2 7h10l2.5 3H30v17H2z" fill="url(#${a})" stroke="#b9862a" stroke-width=".8"/>
     <path d="M2 12.5h28l-1.6 14.5H3.6z" fill="url(#${b})" stroke="#c99a33" stroke-width=".8"/>
     <path d="M3.5 13.5h25" stroke="#fff6cf" stroke-width="1" opacity=".8"/>${extra}`); };

  const doc = (fold = '#fff', lines = '#9ab', badge = '') => { const a = U('da'); return S(
    g(a, [[0, '#ffffff'], [1, '#e7ecf3']]),
    `<path d="M7 2h13l6 6v22H7z" fill="url(#${a})" stroke="#7d8ea3" stroke-width=".9"/>
     <path d="M20 2v6h6" fill="${fold}" stroke="#7d8ea3" stroke-width=".9"/>
     <g stroke="${lines}" stroke-width="1.2"><path d="M10 12h12M10 15h12M10 18h12M10 21h9"/></g>${badge}`); };

  const sheet = (lock = false) => { const a = U('sa'), b = U('sb'); return S(
    g(a, [[0, '#ffffff'], [1, '#e8f1e8']]) + g(b, [[0, '#3fae4a'], [1, '#1d7a2b']]),
    `<path d="M8 2h13l6 6v22H8z" fill="url(#${a})" stroke="#5c7f62" stroke-width=".9"/>
     <path d="M21 2v6h6" fill="#fff" stroke="#5c7f62" stroke-width=".9"/>
     <g stroke="#9bc3a0" stroke-width=".8"><path d="M11 12h13M11 16h13M11 20h13M11 24h13M15 10v17M20 10v17"/></g>
     <rect x="2" y="11" width="13" height="13" rx="2" fill="url(#${b})" stroke="#155d20" stroke-width=".8"/>
     <path d="M5.2 14.2l5.6 6.6M10.8 14.2l-5.6 6.6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
     ${lock ? `<g transform="translate(17 17)"><rect x="1" y="6" width="12" height="9" rx="1.5" fill="#f2c230" stroke="#8a6508"/><path d="M3.5 6V4a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="#6f6f6f" stroke-width="1.8"/><circle cx="7" cy="10.5" r="1.4" fill="#7a5a06"/></g>` : ''}`); };

  const I = {};
  I.folder = folder();
  I.folderOpen = folder(['#fff0b8', '#f6cf5c']);
  I.folderHidden = S('', `<g opacity=".55">${folder().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`);
  I.mydocs = folder(['#fde79a', '#f3c24a'], `<g transform="translate(14 10)"><path d="M2 1h9l3 3v12H2z" fill="#fff" stroke="#7d8ea3" stroke-width=".8"/><path d="M4 7h8M4 10h8M4 13h6" stroke="#6a8fc9" stroke-width="1"/></g>`);
  I.desktop = S(g('dk', [[0, '#5aa0f0'], [1, '#2a63c7']]), `<rect x="2" y="4" width="28" height="19" rx="1.5" fill="url(#dk)" stroke="#274b86"/><path d="M2 18c7-4 14-4 28 0v5H2z" fill="#58a93c"/><rect x="11" y="24" width="10" height="3" fill="#9aa4b1"/><rect x="7" y="27" width="18" height="2" rx="1" fill="#7c8793"/>`);
  I.computer = S(g('cm', [[0, '#e8edf3'], [1, '#b7c1cd']]) + g('cs', [[0, '#4d8ae8'], [1, '#1d4fb0']]),
    `<rect x="3" y="3" width="24" height="18" rx="2" fill="url(#cm)" stroke="#5f6d7e"/><rect x="5.5" y="5.5" width="19" height="13" fill="url(#cs)"/>
     <path d="M5.5 15c5-3 11-3 19 0v3.5h-19z" fill="#62b04a" opacity=".9"/><path d="M10 21h10l2 4H8z" fill="#aab4c0" stroke="#5f6d7e" stroke-width=".7"/>
     <rect x="4" y="25" width="22" height="4" rx="1" fill="url(#cm)" stroke="#5f6d7e" stroke-width=".7"/>`);
  I.drive = S(g('dr', [[0, '#eef1f5'], [1, '#aeb8c4']]), `<rect x="2" y="11" width="28" height="12" rx="2" fill="url(#dr)" stroke="#5f6d7e"/><rect x="5" y="17" width="12" height="2" fill="#6b7785"/><circle cx="25" cy="18" r="1.5" fill="#39c44b"/>`);
  I.cdrom = S(g('cd', [[0, '#eef1f5'], [1, '#aeb8c4']]), `<rect x="2" y="15" width="28" height="10" rx="2" fill="url(#cd)" stroke="#5f6d7e"/><ellipse cx="16" cy="12" rx="11" ry="5" fill="#dfe8f4" stroke="#8aa0bd"/><ellipse cx="16" cy="12" rx="2.5" ry="1.2" fill="#fff" stroke="#8aa0bd"/>`);
  I.network = S(g('nw', [[0, '#eef1f5'], [1, '#aeb8c4']]), `<rect x="2" y="9" width="28" height="11" rx="2" fill="url(#nw)" stroke="#5f6d7e"/><rect x="5" y="14" width="12" height="2" fill="#6b7785"/><path d="M16 20v5M8 27h16" stroke="#3a6fc4" stroke-width="2"/><path d="M4 4l24 22" stroke="#d22" stroke-width="2.5" opacity=".85"/>`);
  I.recycle = S(g('rb', [[0, '#e6f0fb'], [1, '#9fb6d3']]), `<path d="M7 9h18l-2 20H9z" fill="url(#rb)" stroke="#50657f"/><ellipse cx="16" cy="9" rx="9.5" ry="2.5" fill="#cfdcec" stroke="#50657f"/><path d="M12 13l1 13M16 13v13M20 13l-1 13" stroke="#6f86a4" stroke-width=".9"/>`);
  I.recycleFull = S(g('rf', [[0, '#e6f0fb'], [1, '#9fb6d3']]), `<path d="M7 11h18l-2 18H9z" fill="url(#rf)" stroke="#50657f"/><path d="M9 11l3-7 6 4 4-5 2 8z" fill="#fff" stroke="#8a97a8" stroke-width=".7"/><path d="M13 6l4 3" stroke="#6a8fc9"/><ellipse cx="16" cy="11" rx="9.5" ry="2.3" fill="none" stroke="#50657f"/><path d="M12 15l1 11M16 15v11M20 15l-1 11" stroke="#6f86a4" stroke-width=".9"/>`);
  I.ie = S(g('ie', [[0, '#7cc3ff'], [1, '#1c63d0']]), `<circle cx="16" cy="16" r="11" fill="url(#ie)" stroke="#164a9c"/><path d="M5.5 13c4 1.5 6 .5 8-2s5-3 7-1 3 5 6 4M6.5 21c3-2 6-1 8 1s5 2 7-1 3-3 5-2" fill="none" stroke="#bfe6ff" stroke-width="1.3"/><path d="M16 5c-4 3-4 19 0 22M16 5c4 3 4 19 0 22" fill="none" stroke="#bfe6ff" stroke-width="1"/><ellipse cx="16" cy="16" rx="15" ry="5.5" transform="rotate(-25 16 16)" fill="none" stroke="#f3b400" stroke-width="2"/>`);
  I.mail = S(g('ml', [[0, '#fffdf2'], [1, '#e9dfb8']]), `<rect x="2" y="7" width="28" height="19" rx="1.5" fill="url(#ml)" stroke="#8c7a43"/><path d="M2.5 8l13.5 10L29.5 8" fill="none" stroke="#8c7a43" stroke-width="1.2"/><path d="M2.5 25.5l10-9M29.5 25.5l-10-9" stroke="#b8a66a"/><circle cx="25" cy="9" r="5" fill="#2f7de0" stroke="#fff" stroke-width="1.2"/><path d="M22.8 9h4.4M25 6.8v4.4" stroke="#fff" stroke-width="1.4"/>`);
  I.eml = S(g('em', [[0, '#fffdf2'], [1, '#e9dfb8']]), `<rect x="3" y="8" width="26" height="17" rx="1.5" fill="url(#em)" stroke="#8c7a43"/><path d="M3.5 9l12.5 9L28.5 9" fill="none" stroke="#8c7a43" stroke-width="1.2"/>`);
  I.excel = sheet(false);
  I.xls = sheet(false);
  I.xlsLocked = sheet(true);
  I.txt = doc('#fff', '#9aa9bb');
  I.notepad = S(g('np', [[0, '#e5f3ff'], [1, '#b7d7f3']]), `<rect x="6" y="4" width="20" height="25" fill="url(#np)" stroke="#3f6d9c"/><path d="M9 11h14M9 15h14M9 19h14M9 23h10" stroke="#5b87b8"/><g fill="#555"><circle cx="10" cy="4" r="1.4"/><circle cx="14" cy="4" r="1.4"/><circle cx="18" cy="4" r="1.4"/><circle cx="22" cy="4" r="1.4"/></g>`);
  I.zip = folder(['#fde79a', '#f3c24a'], `<rect x="14.5" y="12" width="3" height="15" fill="#6d6d6d"/><g fill="#d8d8d8"><rect x="14.5" y="13" width="3" height="1.4"/><rect x="14.5" y="16" width="3" height="1.4"/><rect x="14.5" y="19" width="3" height="1.4"/><rect x="14.5" y="22" width="3" height="1.4"/></g>`);
  I.image = S(g('im', [[0, '#9fd3ff'], [1, '#e8f6ff']]), `<rect x="3" y="5" width="26" height="22" rx="1" fill="#fff" stroke="#6b7a8c"/><rect x="5.5" y="7.5" width="21" height="17" fill="url(#im)"/><path d="M5.5 24.5l6-8 4 5 3-3 8 6z" fill="#4d9a3a"/><circle cx="22" cy="12" r="2.3" fill="#ffd33a"/>`);
  I.lock = S(g('lk', [[0, '#ffe07a'], [1, '#d59a10']]), `<path d="M10 14v-4a6 6 0 0 1 12 0v4" fill="none" stroke="#777" stroke-width="3"/><rect x="6" y="14" width="20" height="15" rx="2.5" fill="url(#lk)" stroke="#8a6508"/><circle cx="16" cy="20.5" r="2.2" fill="#6b4c04"/><rect x="15" y="21" width="2" height="4.5" fill="#6b4c04"/>`);
  I.key = S(g('ky', [[0, '#ffe07a'], [1, '#d59a10']]), `<circle cx="10" cy="16" r="6.5" fill="url(#ky)" stroke="#8a6508"/><circle cx="8.5" cy="16" r="2" fill="#fff"/><path d="M16 14.5h13v3h-2v3h-3v-3h-2v2h-3v-2h-3z" fill="url(#ky)" stroke="#8a6508" stroke-width=".8"/>`);
  I.checklist = S(g('ck', [[0, '#ffffff'], [1, '#e9eef6']]), `<rect x="5" y="5" width="22" height="25" rx="2" fill="#c98a3c" stroke="#7d5220"/><rect x="7.5" y="8" width="17" height="20" fill="url(#ck)" stroke="#9aa6b5" stroke-width=".7"/><rect x="11" y="3" width="10" height="5" rx="1.5" fill="#9aa6b5" stroke="#5f6d7e"/><path d="M9.5 13l1.6 1.6 3-3M9.5 19l1.6 1.6 3-3" stroke="#1f9a33" stroke-width="1.6" fill="none"/><path d="M16 13.5h7M16 19.5h7M10 25h13" stroke="#6a7c93" stroke-width="1.2"/>`);
  I.calc = S(g('cc', [[0, '#eef1f5'], [1, '#b3bdc9']]), `<rect x="6" y="3" width="20" height="26" rx="2" fill="url(#cc)" stroke="#5f6d7e"/><rect x="9" y="6" width="14" height="5" fill="#dff2d8" stroke="#6d8a64" stroke-width=".7"/><g fill="#5b6b7f"><rect x="9" y="14" width="3.5" height="3"/><rect x="14.3" y="14" width="3.5" height="3"/><rect x="19.5" y="14" width="3.5" height="3"/><rect x="9" y="19" width="3.5" height="3"/><rect x="14.3" y="19" width="3.5" height="3"/><rect x="9" y="24" width="3.5" height="3"/><rect x="14.3" y="24" width="3.5" height="3"/></g><rect x="19.5" y="19" width="3.5" height="8" fill="#d9731f"/>`);
  I.help = S(g('hp', [[0, '#5aa0f0'], [1, '#1d4fb0']]), `<circle cx="16" cy="16" r="12" fill="url(#hp)" stroke="#16408f"/><path d="M12 12.5a4 4 0 1 1 5.5 3.7c-1 .5-1.5 1.1-1.5 2.3v1" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="16" cy="23.5" r="1.7" fill="#fff"/>`);
  I.question = I.help;
  I.info = S(g('if', [[0, '#6fb0ff'], [1, '#1d5fc9']]), `<circle cx="16" cy="16" r="13" fill="url(#if)" stroke="#fff" stroke-width="1.5"/><circle cx="16" cy="9.5" r="2" fill="#fff"/><rect x="14.2" y="13" width="3.6" height="11" rx="1" fill="#fff"/>`);
  I.warn = S(g('wn', [[0, '#ffe36a'], [1, '#f0b400']]), `<path d="M16 3l14 25H2z" fill="url(#wn)" stroke="#9a7300" stroke-linejoin="round"/><rect x="14.5" y="11" width="3" height="10" rx="1" fill="#222"/><circle cx="16" cy="24.3" r="1.7" fill="#222"/>`);
  I.error = S(g('er', [[0, '#ff7a6a'], [1, '#c8120a']]), `<circle cx="16" cy="16" r="13" fill="url(#er)" stroke="#fff" stroke-width="1.5"/><path d="M11 11l10 10M21 11L11 21" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>`);
  I.logoff = S(g('lo', [[0, '#ffd36a'], [1, '#e79a00']]), `<rect x="3" y="3" width="26" height="26" rx="4" fill="url(#lo)" stroke="#9a6400"/><path d="M13 9h-4v14h4M14 16h10M20 12l4 4-4 4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`);
  I.shutdown = S(g('sd', [[0, '#ff8e6a'], [1, '#d23a0a']]), `<rect x="3" y="3" width="26" height="26" rx="4" fill="url(#sd)" stroke="#8f2200"/><path d="M11.5 10.5a8 8 0 1 0 9 0" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M16 7v9" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`);
  I.user = S(g('us', [[0, '#d9a46a'], [1, '#a76a2c']]), `<rect x="0" y="0" width="32" height="32" rx="3" fill="#7fb7ea"/><path d="M5 13l11-5 11 5v12l-11 5-11-5z" fill="url(#us)" stroke="#6b4115" stroke-width=".8"/><path d="M5 13l11 5 11-5M16 18v12" fill="none" stroke="#6b4115" stroke-width=".8"/><path d="M9 11l11 5" stroke="#e9c79a" stroke-width="2.2"/><path d="M11 21l3 1.3" stroke="#3a220a" stroke-width="1"/>`);
  I.back = S(g('bk', [[0, '#7fe07a'], [1, '#1d9a2b']]), `<circle cx="16" cy="16" r="13" fill="url(#bk)" stroke="#11691c"/><path d="M18 9l-7 7 7 7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`);
  I.forward = S(g('fw', [[0, '#7fe07a'], [1, '#1d9a2b']]), `<circle cx="16" cy="16" r="13" fill="url(#fw)" stroke="#11691c"/><path d="M14 9l7 7-7 7" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`);
  I.up = folder(['#fde79a', '#f3c24a'], `<path d="M16 25V15M11.5 19.5L16 15l4.5 4.5" fill="none" stroke="#1d9a2b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`);
  I.search = S('', `<circle cx="13" cy="13" r="8" fill="#dff0ff" stroke="#3a6fc4" stroke-width="2.5"/><path d="M19 19l9 9" stroke="#8a5a2a" stroke-width="4" stroke-linecap="round"/>`);
  I.views = S('', `<g fill="#fff" stroke="#4a6fa5"><rect x="4" y="5" width="10" height="10"/><rect x="18" y="5" width="10" height="10"/><rect x="4" y="18" width="10" height="10"/><rect x="18" y="18" width="10" height="10"/></g><g fill="#6fa2e6"><rect x="6" y="7" width="6" height="6"/><rect x="20" y="7" width="6" height="6"/><rect x="6" y="20" width="6" height="6"/><rect x="20" y="20" width="6" height="6"/></g>`);
  I.printer = S(g('pr', [[0, '#eef1f5'], [1, '#aeb8c4']]), `<rect x="9" y="3" width="14" height="9" fill="#fff" stroke="#6b7785"/><rect x="3" y="11" width="26" height="12" rx="2" fill="url(#pr)" stroke="#5f6d7e"/><rect x="8" y="19" width="16" height="10" fill="#fff" stroke="#6b7785"/>`);
  I.controlpanel = S(g('cp', [[0, '#eef1f5'], [1, '#aeb8c4']]), `<rect x="3" y="5" width="26" height="22" rx="2" fill="url(#cp)" stroke="#5f6d7e"/><path d="M9 10v14M16 10v14M23 10v14" stroke="#6b7785"/><rect x="6.5" y="13" width="5" height="3" fill="#2f7de0"/><rect x="13.5" y="18" width="5" height="3" fill="#39a34a"/><rect x="20.5" y="12" width="5" height="3" fill="#e0662f"/>`);
  I.star = S('', `<path d="M16 3l3.8 8.2 8.9.9-6.7 6 1.9 8.8L16 22.4 8.1 26.9 10 18.1l-6.7-6 8.9-.9z" fill="#ffd33a" stroke="#b58800"/>`);
  I.volume = S('', `<path d="M4 12h6l7-6v20l-7-6H4z" fill="#e8ecf2" stroke="#3a4a60"/><path d="M21 11c2 2.5 2 7.5 0 10M24 8c4 4.5 4 11.5 0 16" fill="none" stroke="#e8ecf2" stroke-width="2"/>`);
  I.box = I.user;
  // ShowMe ERP: a database drum with a green ledger page
  I.erp = S(g('ep', [[0, '#e9f1f8'], [1, '#8fa9c4']]), `<path d="M4 7v17c0 2.2 5 4 11 4s11-1.8 11-4V7" fill="url(#ep)" stroke="#3f5a78"/><ellipse cx="15" cy="7" rx="11" ry="4" fill="#dce7f2" stroke="#3f5a78"/><path d="M4 13c0 2.2 5 4 11 4s11-1.8 11-4M4 19c0 2.2 5 4 11 4s11-1.8 11-4" fill="none" stroke="#3f5a78"/><rect x="17" y="14" width="13" height="16" rx="1" fill="#fff" stroke="#1d7a2b"/><path d="M19.5 18h8M19.5 21h8M19.5 24h8M19.5 27h5" stroke="#1d7a2b" stroke-width="1.2"/>`);

  FR.icons = I;
  FR.icon = (name, size = 32) => `<span class="fr-ico" style="width:${size}px;height:${size}px">${I[name] || I.txt}</span>`;
})();
