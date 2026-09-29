/* FRANK'S COMPUTER — Solitaire (Klondike), Windows XP style. Frank's favourite way to "reconcile".
   Everything is drawn here in SVG/CSS (no images, no network). The twelve face cards celebrate the top competitors of
   the Microsoft Excel World Championship (friendly generic cartoons, not likenesses; each name on two cards).
   Rules: Klondike, Draw One / Draw Three, Windows Standard or Vegas scoring (or none), timed game, multi-level Undo.
   Deals: seeded PRNG (mulberry32); each Deal reseeds and a small solver picks a deal it can finish ("solvable-ish").
   Nothing here touches FR.state: it's a toy on Frank's desktop, not part of the Board Pack. */
(() => {
  const $ = FR.$, esc = FR.esc;
  const MQ = FR.MOBILE_MQ || '(max-width: 760px), (pointer: coarse) and (max-width: 1100px)';
  const isMobile = () => (typeof FR.mobile === 'boolean' ? FR.mobile : !!(window.matchMedia && matchMedia(MQ).matches));

  /* ---------- icon (32x32, XP-flavoured fanned cards) ---------- */
  FR.icons.solitaire = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-20 11 22)"><rect x="4.5" y="7" width="13" height="18" rx="1.8" fill="#2458c6" stroke="#1b3b7a" stroke-width=".8"/>
      <rect x="6.3" y="8.8" width="9.4" height="14.4" rx="1" fill="none" stroke="#a9c6ff" stroke-width=".7"/><path d="M7 12l8 5M7 17l8-5M7 20l8-5M7 15l8 5" stroke="#8fb3ff" stroke-width=".55"/></g>
    <g transform="rotate(-3 15 22)"><rect x="9" y="5.5" width="13" height="18" rx="1.8" fill="#fff" stroke="#55606e" stroke-width=".8"/>
      <path d="M15.5 17.6c-2.4-1.9-4-3.2-4-4.9 0-1.2.9-2 2-2 .9 0 1.6.5 2 1.3.4-.8 1.1-1.3 2-1.3 1.1 0 2 .8 2 2 0 1.7-1.6 3-4 4.9z" fill="#d40000"/></g>
    <g transform="rotate(14 20 22)"><rect x="14.5" y="5" width="13" height="18" rx="1.8" fill="#fff" stroke="#55606e" stroke-width=".8"/>
      <path d="M21 9.2c.9 2.1 4.1 3.4 4.1 5.6 0 1.4-1.1 2.2-2.2 2.2-.8 0-1.4-.4-1.6-.9.1.9.4 1.4 1.1 1.8h-2.8c.7-.4 1-.9 1.1-1.8-.2.5-.8.9-1.6.9-1.1 0-2.2-.8-2.2-2.2 0-2.2 3.2-3.5 4.1-5.6z" fill="#111"/>
      <text x="15.8" y="10.2" font-size="4.4" font-family="Arial, sans-serif" font-weight="700" fill="#111">A</text></g>
  </svg>`;

  /* ---------- cards ---------- */
  const SUITS = ['S', 'H', 'D', 'C'];
  const SUIT_NAME = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
  const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RANK_NAME = ['', 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King'];
  const isRed = s => s === 1 || s === 2;
  const INK = s => (isRed(s) ? '#d40000' : '#111');
  // face-card frames: spades in Excel green, hearts crimson, diamonds orange-red, clubs navy
  const DARK = ['#1d6f42', '#b01e2d', '#c2410c', '#1e3a6e'];
  const TINT = ['#e6f3ea', '#fbe7e9', '#fdecdf', '#e4eaf6'];
  const FONT = 'Arial, Helvetica, "DejaVu Sans", sans-serif';

  /* The face cards: the MEWC's top competitors (public results). Each name on two cards. */
  const P = {
    early: { first: 'Diarmuid', last: 'Early', from: 'Ireland', hair: '#6b3e1f', style: 'short', shirt: '#1b7f79' },
    jarman: { first: 'Michael', last: 'Jarman', from: 'Canada', hair: '#3a2a1a', style: 'swoop', shirt: '#27408b', glasses: true },
    ngai: { first: 'Andrew', nick: 'The Annihilator', last: 'Ngai', from: 'Australia', hair: '#1d1d1d', style: 'spiky', shirt: '#6a3d9a' },
    wolleh: { first: 'Jean', last: 'Wolleh', from: 'Germany', hair: '#2a2a2a', style: 'buzz', shirt: '#3b4a5a' },
    kennedy: { first: 'Jaq', last: 'Kennedy', from: 'United Kingdom', hair: '#b5651d', style: 'wavy', shirt: '#2e7d32', glasses: true },
    micot: { first: 'Nicolas', last: 'Micot', from: '', hair: '#4a3222', style: 'curly', shirt: '#8e2b3a' },
  };
  // [card id] → who, the tag on the card, the prop they hold
  const FACES = {
    KS: ['early', '2025 World Champion', 'belt', '2025'],
    KH: ['jarman', '2024 World Champion', 'belt', '2024'],
    KD: ['ngai', 'Three-time World Champion', 'belt', '3×'],
    KC: ['wolleh', 'Bronze medalist, 2025', 'medal', '3'],
    QS: ['kennedy', 'Founded the UK chapter', 'pennant', 'UK'],
    QH: ['micot', 'Landmark Battle finalist', 'stopwatch'],
    QD: ['early', 'Won the 2026 Landmark Battle', 'trophy'],
    QC: ['jarman', 'Unseated the three-time champ', 'sheet'],
    JS: ['ngai', 'Champion 2021, 2022, 2023', 'keys'],
    JH: ['kennedy', 'Landmark Battle finalist', 'laptop'],
    JD: ['micot', 'Cool under the clock', 'laptop'],
    JC: ['wolleh', 'On the podium in 2025', 'sheet'],
  };
  const fullName = p => p.nick ? `${p.first} “${p.nick}” ${p.last}` : `${p.first} ${p.last}`;
  const cardName = id => `${RANK_NAME[RANKS.indexOf(id.slice(0, -1))]} of ${SUIT_NAME[SUITS.indexOf(id.slice(-1))]}`;
  const faceInfo = id => { const f = FACES[id]; if (!f) return null; const p = P[f[0]]; return { id, name: fullName(p), first: p.first, last: p.last, from: p.from, tag: f[1], card: cardName(id) }; };

  /* ---------- SVG art (viewBox 0 0 140 190) ---------- */
  const SHAPE = [
    '<path d="M50 2C60 24 98 38 98 64 98 80 86 90 72 90 63 90 57 85 54 79 55 88 59 94 68 98H32C41 94 45 88 46 79 43 85 37 90 28 90 14 90 2 80 2 64 2 38 40 24 50 2Z"/>',
    '<path d="M50 96C20 72 2 54 2 32 2 15 14 4 29 4 39 4 46 10 50 19 54 10 61 4 71 4 86 4 98 15 98 32 98 54 80 72 50 96Z"/>',
    '<path d="M50 2C60 20 74 36 90 50 74 64 60 80 50 98 40 80 26 64 10 50 26 36 40 20 50 2Z"/>',
    '<circle cx="50" cy="27" r="21"/><circle cx="25" cy="59" r="21"/><circle cx="75" cy="59" r="21"/><circle cx="50" cy="52" r="12"/><path d="M45 55C45 80 40 90 30 98H70C60 90 55 80 55 55Z"/>',
  ];
  const pip = (s, cx, cy, size, flip, fill) => `<g transform="translate(${cx} ${cy})${flip ? ' rotate(180)' : ''} scale(${size / 100}) translate(-50 -50)" fill="${fill || INK(s)}">${SHAPE[s]}</g>`;
  // squeeze a text line that would not fit (SVG textLength) — widths are estimates, so be generous
  const fit = (t, size, max, k = 0.52) => { const w = [...t].length * size * k; return w > max ? ` textLength="${max}" lengthAdjust="spacingAndGlyphs"` : ''; };
  const txt = (x, y, size, fill, t, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-family='${FONT}' ${extra}>${esc(t)}</text>`;

  const COLS = [44, 70, 96];
  const LAYOUT = {   // [column 0..2, row 0..1]
    2: [[1, 0], [1, 1]], 3: [[1, 0], [1, .5], [1, 1]],
    4: [[0, 0], [2, 0], [0, 1], [2, 1]], 5: [[0, 0], [2, 0], [1, .5], [0, 1], [2, 1]],
    6: [[0, 0], [2, 0], [0, .5], [2, .5], [0, 1], [2, 1]], 7: [[0, 0], [2, 0], [1, .25], [0, .5], [2, .5], [0, 1], [2, 1]],
    8: [[0, 0], [2, 0], [1, .25], [0, .5], [2, .5], [1, .75], [0, 1], [2, 1]],
    9: [[0, 0], [2, 0], [0, 1 / 3], [2, 1 / 3], [1, .5], [0, 2 / 3], [2, 2 / 3], [0, 1], [2, 1]],
    10: [[0, 0], [2, 0], [1, 1 / 6], [0, 1 / 3], [2, 1 / 3], [0, 2 / 3], [2, 2 / 3], [1, 5 / 6], [0, 1], [2, 1]],
  };

  function pips(s, r, compact) {
    const y1 = compact ? 64 : 34, y5 = compact ? 170 : 156, size = compact ? 23 : 26;
    const xs = compact ? [42, 70, 98] : COLS;
    if (r === 1) return pip(s, 70, compact ? 118 : 95, s === 0 ? (compact ? 62 : 74) : (compact ? 50 : 58));
    return LAYOUT[r].map(([c, t]) => pip(s, xs[c], y1 + t * (y5 - y1), size, t > .5)).join('');
  }

  /* a friendly cartoon competitor in a playing-card frame */
  const SKIN = '#f5cfa6', SKIN_D = '#e8b78b', LINE = '#8a5a3a';
  const HAIR = {
    short: 'M51 57C49 38 60 31 71 31 84 31 92 40 89 57 87 49 83 44 76 43 70 46 60 46 54 47 52 50 51 53 51 57Z',
    swoop: 'M51 58C47 36 66 26 80 33 90 38 92 48 89 58 86 48 78 42 66 44 60 45 55 50 51 58Z',
    spiky: 'M51 55 50 42 56 44 57 33 63 38 67 29 72 36 78 30 80 38 87 35 86 44 90 45 89 56C85 47 78 43 70 43 62 43 55 47 51 55Z',
    buzz: 'M52 52C52 38 62 33 70 33 80 33 88 38 88 52 84 45 77 42 70 42 63 42 56 45 52 52Z',
    wavy: 'M50 66C44 40 58 29 71 30 86 30 96 42 90 66 88 57 88 50 85 46 78 44 64 42 56 46 53 52 52 58 50 66Z',
  };
  function hair(p) {
    if (p.style === 'curly') return [[54, 46, 6], [60, 38, 7], [70, 35, 7.5], [80, 38, 7], [86, 46, 6], [52, 53, 4], [88, 53, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.hair}"/>`).join('');
    return `<path d="${HAIR[p.style]}" fill="${p.hair}"/>`;
  }
  function hat(r, s) {
    const c = DARK[s];
    if (r === 13) return `<path d="M53 38 55 21 62 29 70 17 78 29 85 21 87 38Z" fill="#f4c430" stroke="#9c7a14" stroke-width="1"/><rect x="53" y="35" width="34" height="5" rx="1" fill="#e0ad1f" stroke="#9c7a14" stroke-width=".8"/><circle cx="70" cy="29.5" r="2.3" fill="${c}"/><circle cx="61" cy="33" r="1.4" fill="#fff"/><circle cx="79" cy="33" r="1.4" fill="#fff"/>`;
    if (r === 12) return `<path d="M50 60C48 30 92 30 90 60" fill="none" stroke="#2f2f2f" stroke-width="3.2"/><rect x="45" y="52" width="8" height="15" rx="3" fill="#2f2f2f"/><rect x="87" y="52" width="8" height="15" rx="3" fill="#2f2f2f"/><rect x="46.5" y="55" width="3" height="9" rx="1.5" fill="${c}"/><path d="M49 66Q51 77 61 76" fill="none" stroke="#2f2f2f" stroke-width="1.6"/><circle cx="62" cy="76" r="2.3" fill="#2f2f2f"/>`;
    return `<path d="M51 48C51 29 89 29 89 48Z" fill="${c}"/><path d="M51 45.5C62 43 80 43 89 45.5" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none"/><path d="M50 47C62 44 82 44 95 47.5L96 50.5C82 50 64 50.5 50 51Z" fill="#222" opacity=".85"/><circle cx="70" cy="30.5" r="2" fill="#222"/>`;
  }
  function prop(kind, s, label) {
    const c = DARK[s];
    switch (kind) {
      case 'belt': return `<rect x="29" y="98" width="82" height="12" rx="2" fill="#262626"/><g fill="#f4c430" stroke="#9c7a14" stroke-width=".7"><rect x="36" y="99.5" width="9" height="9" rx="1.5"/><rect x="95" y="99.5" width="9" height="9" rx="1.5"/></g><ellipse cx="70" cy="104" rx="18" ry="12.5" fill="#f4c430" stroke="#9c7a14" stroke-width="1.2"/><ellipse cx="70" cy="104" rx="13" ry="8.5" fill="#ffe27a" stroke="#c9981e" stroke-width=".8"/>${txt(70, 107.2, 8.4, '#6b4e00', label, 'font-weight="700" text-anchor="middle"')}`;
      case 'medal': return `<path d="M60 87 66 102 70 100 74 102 80 87 74 87 70 96 66 87Z" fill="#2f5aa8"/><circle cx="70" cy="104" r="8.5" fill="#c27c3e" stroke="#7a4a1d" stroke-width="1.1"/><circle cx="70" cy="104" r="5.8" fill="none" stroke="#e7a86a" stroke-width=".8"/>${txt(70, 107, 8, '#5a3310', label, 'font-weight="700" text-anchor="middle"')}`;
      case 'laptop': { let g = ''; for (let x = 56; x < 91; x += 7) g += `M${x} 91V109`; for (let y = 95; y < 109; y += 4) g += `M49 ${y}H91`; return `<rect x="46" y="88" width="48" height="24" rx="2" fill="#bfc5cc" stroke="#6b7280"/><rect x="49" y="91" width="42" height="18" fill="#1d6f42"/><path d="${g}" stroke="#fff" stroke-opacity=".45" stroke-width=".6"/><rect x="49" y="91" width="42" height="4" fill="#fff" opacity=".3"/>`; }
      case 'stopwatch': return `<rect x="95" y="84" width="5" height="4" rx="1" fill="#555"/><circle cx="97.5" cy="99" r="10.5" fill="#eef0f2" stroke="#555" stroke-width="1.5"/><path d="M97.5 90.5v1.8M97.5 105.7v1.8M89 99h1.8M104.2 99h1.8" stroke="#555" stroke-width="1"/><path d="M97.5 99V92.5M97.5 99l4 2.5" stroke="#c00" stroke-width="1.4" stroke-linecap="round"/>`;
      case 'trophy': return `<path d="M89 85H106V91C106 98 102 102 97.5 102 93 102 89 98 89 91Z" fill="#f4c430" stroke="#9c7a14"/><path d="M89 87C83 87 83 95 89.5 95M106 87C112 87 112 95 105.5 95" stroke="#9c7a14" fill="none" stroke-width="1.5"/><rect x="95.5" y="102" width="4" height="5" fill="#c9981e"/><rect x="91" y="107" width="13" height="5" rx="1" fill="#6b4e00"/>`;
      case 'sheet': { let g = ''; for (let x = 38; x < 54; x += 5) g += `M${x} 92V112`; for (let y = 96; y < 112; y += 4) g += `M32 ${y}H54`; return `<rect x="31" y="88" width="23" height="24" rx="1.5" fill="#fff" stroke="#1d6f42" stroke-width="1.2"/><rect x="31" y="88" width="23" height="4" fill="#1d6f42"/><path d="${g}" stroke="#1d6f42" stroke-opacity=".5" stroke-width=".6"/><path d="M34 106l4-5 4 3 5-7 5 3" fill="none" stroke="${c}" stroke-width="1.3"/>`; }
      case 'keys': { let k = ''; for (let i = 0; i < 9; i++) k += `<rect x="${39 + i * 7}" y="103" width="5" height="3" rx=".6"/>`; return `<rect x="36" y="100" width="68" height="12" rx="2" fill="#3a3f47"/><g fill="#c9ced6">${k}<rect x="50" y="107.5" width="40" height="2.6" rx=".6"/></g><path d="M101 82 94 94H99L96 104 106 90H101L104 82Z" fill="#ffd400" stroke="#9c7a14" stroke-width=".6"/>`; }
      case 'pennant': return `<path d="M33 85V112" stroke="#6b4e00" stroke-width="1.6"/><path d="M34 86 58 93 34 100Z" fill="${c}" stroke="#fff" stroke-width=".6"/>${txt(41, 95.8, 6.4, '#fff', label, 'font-weight="700"')}`;
    }
    return '';
  }
  // a long tag goes on two lines, split at the space nearest the middle
  const tagLines = t => { if (t.length <= 21) return [t]; let best = -1; for (let i = 0; i < t.length; i++) if (t[i] === ' ' && (best < 0 || Math.abs(i - t.length / 2) < Math.abs(best - t.length / 2))) best = i; return best < 0 ? [t] : [t.slice(0, best), t.slice(best + 1)]; };
  function faceBody(id, s, r) {
    const f = FACES[id], p = P[f[0]], c = DARK[s];
    let grid = ''; for (let x = 36; x < 116; x += 12) grid += `M${x} 9V113`; for (let y = 19; y < 113; y += 11) grid += `M25 ${y}H115`;
    const last = p.last.toUpperCase(), first = p.nick && r === 11 ? `“${p.nick}”` : p.nick && r === 13 ? `${p.first} “${p.nick}”` : p.first;
    return `<rect x="24" y="8" width="92" height="174" rx="5" fill="${TINT[s]}" stroke="${c}" stroke-width="1.6"/>
      <path d="${grid}" stroke="${c}" stroke-width=".5" opacity=".2"/>
      <circle cx="70" cy="64" r="38" fill="#fff" opacity=".6"/>
      ${pip(s, 106, 19, 12, false, c)}
      <path d="M30 113C31 97 44 89 58 87H82C96 89 109 97 110 113Z" fill="${p.shirt}" stroke="#00000055" stroke-width=".8"/>
      <path d="M61 87 70 98 79 87Z" fill="#fff"/>
      <path d="M63 74h14v14c-4 3-10 3-14 0z" fill="${SKIN_D}"/>
      <circle cx="52" cy="60" r="4.5" fill="${SKIN}" stroke="${LINE}" stroke-width=".8"/><circle cx="88" cy="60" r="4.5" fill="${SKIN}" stroke="${LINE}" stroke-width=".8"/>
      <ellipse cx="70" cy="58" rx="18" ry="20" fill="${SKIN}" stroke="${LINE}" stroke-width=".9"/>
      ${hair(p)}
      <path d="M60 52.5q4-3 8 0M72 52.5q4-3 8 0" stroke="${p.hair}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="64" cy="58.5" r="2.3" fill="#2a2a2a"/><circle cx="76" cy="58.5" r="2.3" fill="#2a2a2a"/><circle cx="64.8" cy="57.7" r=".7" fill="#fff"/><circle cx="76.8" cy="57.7" r=".7" fill="#fff"/>
      ${p.glasses ? '<g fill="#fff" fill-opacity=".25" stroke="#333" stroke-width="1.3"><circle cx="64" cy="58.5" r="5.2"/><circle cx="76" cy="58.5" r="5.2"/></g><path d="M69.2 58.5h1.6M58.8 57.5l-5.5-1.8M81.2 57.5l5.5-1.8" stroke="#333" stroke-width="1.2"/>' : ''}
      <path d="M70 60.5q-2.5 5 .5 6" stroke="${LINE}" fill="none" stroke-width="1"/>
      <circle cx="59" cy="66" r="3" fill="#f28b82" opacity=".45"/><circle cx="81" cy="66" r="3" fill="#f28b82" opacity=".45"/>
      <path d="M62.5 68q7.5 7.5 15 0q-7.5 2.6-15 0z" fill="#fff" stroke="#8a3b2a" stroke-width="1.1" stroke-linejoin="round"/>
      ${hat(r, s)}
      ${prop(f[2], s, f[3] || '')}
      <rect x="24" y="113" width="92" height="45" fill="${c}"/>
      <path d="M24 115.5H116M24 155.5H116" stroke="#f4c430" stroke-width="1"/>
      ${txt(70, 129, 10.5, '#fff', first, `text-anchor="middle" opacity=".92"${fit(first, 10.5, 84)}`)}
      ${txt(70, 148.5, 17, '#fff', last, `text-anchor="middle" font-weight="700" letter-spacing=".4"${fit(last, 17, 86, 0.74)}`)}
      ${tagLines(f[1]).map((t, i, a) => txt(70, a.length > 1 ? 167.5 + i * 9.5 : 172.5, a.length > 1 ? 8.6 : 9.2, c, t, `text-anchor="middle" font-style="italic" font-weight="700"${fit(t, a.length > 1 ? 8.6 : 9.2, 88, 0.56)}`)).join('')}`;
  }

  /* the whole face of a card; compact = small cards (phones): big index top-left + suit top-right, body shrunk below */
  function cardSVG(id, compact) {
    const s = SUITS.indexOf(id.slice(-1)), R = id.slice(0, -1), r = RANKS.indexOf(R), ink = INK(s);
    const face = r > 10;
    let idx;
    if (compact) {
      idx = txt(R === '10' ? 4 : 7, 40, 40, ink, R, `font-weight="700"${R === '10' ? ' textLength="52" lengthAdjust="spacingAndGlyphs"' : ''}`) + pip(s, 114, 23, 32);
    } else {
      const one = txt(13, 24, R === '10' ? 20 : 22, ink, R, `font-weight="700" text-anchor="middle"${R === '10' ? ' textLength="22" lengthAdjust="spacingAndGlyphs"' : ''}`) + pip(s, 13, 36, 14);
      idx = one + `<g transform="rotate(180 70 95)">${one}</g>`;
    }
    const body = face ? (compact ? `<g transform="translate(18 50) scale(.745)">${faceBody(id, s, r)}</g>` : faceBody(id, s, r)) : pips(s, r, compact);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 190" width="100%" height="100%" preserveAspectRatio="none"><rect x=".6" y=".6" width="138.8" height="188.8" rx="9" fill="#fff" stroke="#6d6d6d" stroke-width="1.2"/>${idx}${body}</svg>`;
  }

  /* ---------- card backs (Game › Deck…) ---------- */
  const BACKS = {
    grid: ['Spreadsheet', () => {
      let g = ''; for (let x = 18; x < 134; x += 12) g += `M${x} 18V184`; for (let y = 27; y < 184; y += 9) g += `M6 ${y}H134`;
      let hdr = ''; 'ABCDEFGHI'.split('').forEach((l, i) => { hdr += `<text x="${24 + i * 12}" y="15.2" font-size="6.5" fill="#bfe3cc" text-anchor="middle" font-family='${FONT}'>${l}</text>`; });
      return `<rect x="6" y="6" width="128" height="178" rx="4" fill="#1f7a4a"/><rect x="6" y="6" width="128" height="12" fill="#135a33"/><rect x="6" y="6" width="12" height="178" fill="#135a33"/>
        <path d="${g}" stroke="#58b27f" stroke-width=".7" opacity=".7"/>${hdr}
        <rect x="46" y="54" width="36" height="18" fill="none" stroke="#fff" stroke-width="1.4" opacity=".8"/>
        <g transform="translate(0 20)"><rect x="22" y="80" width="96" height="15" rx="3" fill="#1e1e1e"/><g fill="#f4c430" stroke="#9c7a14" stroke-width=".7"><rect x="29" y="82" width="10" height="11" rx="2"/><rect x="101" y="82" width="10" height="11" rx="2"/></g>
        <ellipse cx="70" cy="87.5" rx="23" ry="17" fill="#f4c430" stroke="#9c7a14" stroke-width="1.3"/><ellipse cx="70" cy="87.5" rx="17" ry="11.5" fill="#ffe27a" stroke="#c9981e"/>
        <path d="M70 79.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z" fill="#c9981e"/></g>`;
    }],
    packa: ['Packa box', () => {
      const box = (x, y, k, solid) => { const P = (d) => d.map(([a, b]) => `${x + a * k} ${y + b * k}`).join(' ');
        return solid
          ? `<path d="M${P([[0, 10], [20, 0], [40, 10], [20, 20]])}Z" fill="#e2b77f"/><path d="M${P([[0, 10], [20, 20], [20, 44], [0, 34]])}Z" fill="#c8904f"/><path d="M${P([[20, 20], [40, 10], [40, 34], [20, 44]])}Z" fill="#b57a3c"/><path d="M${P([[10, 5], [30, 15]])}" stroke="#f3dcb4" stroke-width="${3 * k}"/><path d="M${P([[0, 10], [20, 20], [40, 10], [20, 0]])}Z M${P([[20, 20], [20, 44]])}" fill="none" stroke="#7a4a1d" stroke-width="${.8 * k}"/>`
          : `<path d="M${P([[0, 10], [20, 0], [40, 10], [20, 20]])}Z M${P([[0, 10], [0, 34], [20, 44], [40, 34], [40, 10]])} M${P([[20, 20], [20, 44]])}" fill="none" stroke="#c9644a" stroke-width="1"/>`; };
      let bg = ''; for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) bg += box(10 + col * 25 + (row % 2) * 12, 8 + row * 26, .45, false);
      return `<rect x="6" y="6" width="128" height="178" rx="4" fill="#a33a1e"/>${bg}<rect x="6" y="6" width="128" height="178" rx="4" fill="none" stroke="#7c2a14" stroke-width="2"/><circle cx="70" cy="95" r="34" fill="#a33a1e"/>${box(38, 67, 1.6, true)}`;
    }],
    classic: ['Classic blue', () => {
      let g = ''; for (let i = -180; i < 180; i += 9) { g += `M${6 + i} 6l178 178M${134 - i} 6l-178 178`; }
      return `<rect x="6" y="6" width="128" height="178" rx="4" fill="#2150b8"/><path d="${g}" stroke="#fff" stroke-width="1.1" opacity=".38"/><rect x="11" y="11" width="118" height="168" rx="3" fill="none" stroke="#fff" stroke-width="1.6" opacity=".85"/><rect x="15" y="15" width="110" height="160" rx="2" fill="none" stroke="#9fc0ff" stroke-width=".8"/>`;
    }],
  };
  const backCache = {};
  const backURL = k => backCache[k] || (backCache[k] = 'url("data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 190" preserveAspectRatio="none"><defs><clipPath id="c"><rect x="6" y="6" width="128" height="178" rx="4"/></clipPath></defs><rect x=".6" y=".6" width="138.8" height="188.8" rx="9" fill="#fff" stroke="#6d6d6d" stroke-width="1.2"/><g clip-path="url(#c)">${BACKS[k][1]()}</g></svg>`) + '")');

  /* ---------- deals: seeded PRNG + a small Klondike solver ---------- */
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function shuffled(seed) { const r = mulberry(seed), d = [...Array(52).keys()]; for (let i = 51; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
  // card number n = suit * 13 + (rank - 1); dealt row by row like a real deal; the last 24 are the stock (top = last)
  function dealOut(d) { const tab = [[], [], [], [], [], [], []]; let k = 0; for (let row = 0; row < 7; row++) for (let c = row; c < 7; c++) tab[c].push(d[k++]); return { tab, stock: d.slice(28) }; }

  /* Depth-first search with safe auto-moves and a visited set. Talon = the stock/waste as one list in drawing order,
     p = cards already in the waste; with Draw k (unlimited passes) only some talon positions can be reached. */
  function solve(tab0, stock, k, budget = 6000) {
    const S = c => (c / 13) | 0, R = c => c % 13, red = c => { const s = S(c); return s === 1 || s === 2; };
    const access = (n, p) => { const a = new Set(); if (p > 0) a.add(p - 1); for (let q = p; q < n;) { q = Math.min(q + k, n); a.add(q - 1); } for (let q = 0; q < n;) { q = Math.min(q + k, n); a.add(q - 1); } return [...a]; };
    const copy = st => ({ t: st.t.map(a => a.slice()), d: st.d.slice(), f: st.f.slice(), s: st.s.slice(), p: st.p });
    const flip = (st, c) => { if (st.t[c].length === st.d[c] && st.d[c] > 0) st.d[c]--; };
    const safe = (st, c) => { const r = R(c); if (r !== st.f[S(c)]) return false; if (r <= 1) return true; const o = red(c) ? [0, 3] : [1, 2]; return st.f[o[0]] >= r && st.f[o[1]] >= r; };
    const auto = st => { for (let again = true; again;) { again = false;
      for (let c = 0; c < 7; c++) { const col = st.t[c]; if (col.length > st.d[c] && safe(st, col[col.length - 1])) { st.f[S(col.pop())]++; flip(st, c); again = true; } }
      if (st.p > 0 && safe(st, st.s[st.p - 1])) { st.f[S(st.s[st.p - 1])]++; st.s.splice(st.p - 1, 1); st.p--; again = true; } } };
    const key = st => st.f.join(',') + '|' + st.p + ':' + st.s.join(',') + '|' + st.t.map((a, i) => st.d[i] + ':' + a.join(',')).sort().join('/');
    const kids = st => {
      const out = [], fm = [], tt = [], tl = [], other = [];
      const acc = access(st.s.length, st.p);
      for (let c = 0; c < 7; c++) { const col = st.t[c]; if (col.length > st.d[c] && R(col[col.length - 1]) === st.f[S(col[col.length - 1])]) { const n = copy(st); n.f[S(n.t[c].pop())]++; flip(n, c); fm.push(n); } }
      acc.forEach(i => { const cd = st.s[i]; if (R(cd) === st.f[S(cd)]) { const n = copy(st); n.f[S(cd)]++; n.s.splice(i, 1); n.p = i; fm.push(n); } });
      const empty = st.t.findIndex(a => a.length === 0);
      const fits = (cd, b) => { const col = st.t[b]; if (!col.length) return R(cd) === 12 && b === empty; const top = col[col.length - 1]; return R(top) === R(cd) + 1 && red(top) !== red(cd); };
      for (let a = 0; a < 7; a++) { const col = st.t[a]; for (let i = st.d[a]; i < col.length; i++) {
        const base = i === st.d[a]; if (!base && !(R(col[i - 1]) === st.f[S(col[i - 1])])) continue;
        if (base && i === 0 && R(col[i]) === 12) continue;   // a king that's already at the bottom
        for (let b = 0; b < 7; b++) { if (b === a || !fits(col[i], b)) continue; if (base && i === 0 && !st.t[b].length) continue;
          const n = copy(st); n.t[b].push(...n.t[a].splice(i)); flip(n, a); (base && st.d[a] > 0 ? tt : base && i === 0 ? tt : other).push(n); } } }
      acc.forEach(i => { const cd = st.s[i]; for (let b = 0; b < 7; b++) { if (!fits(cd, b)) continue; const n = copy(st); n.t[b].push(cd); n.s.splice(i, 1); n.p = i; tl.push(n); } });
      return out.concat(fm, tt, tl, other);
    };
    const seen = new Set(); const stack = [{ t: tab0.map(a => a.slice()), d: [0, 1, 2, 3, 4, 5, 6], f: [0, 0, 0, 0], s: stock.slice().reverse(), p: 0 }];
    let nodes = 0;
    while (stack.length) {
      const st = stack.pop(); auto(st);
      if (st.f[0] + st.f[1] + st.f[2] + st.f[3] === 52) return true;
      const kk = key(st); if (seen.has(kk)) continue; seen.add(kk);
      if (++nodes > budget) return false;
      const ch = kids(st); for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]);
    }
    return false;
  }
  // from a seed, the first seed (seed, seed+1, …) whose deal the solver finishes, within a small time budget
  function pickDeal(seed, draw) {
    const t0 = performance.now();
    for (let i = 0; i < 40; i++) {
      const sd = (seed + i) >>> 0, d = shuffled(sd), { tab, stock } = dealOut(d);
      if (solve(tab, stock, draw)) return { seed: sd, deck: d, solved: true };
      if (performance.now() - t0 > 250) break;
    }
    return { seed: seed >>> 0, deck: shuffled(seed >>> 0), solved: false };
  }

  /* ---------- the game ---------- */
  const opts = { draw: 1, scoring: 'standard', timed: true, status: true, cumulative: false, back: 'grid' };
  let vegasBank = 0;
  let G = null, win = null, table = null, root = null, cards = {}, slots = {}, tick = 0, fx = null, keyH = null, geo = null, lastCompact = null;
  let busy = false, sel = null, press = null, lastTap = null, hints = [];

  const idOf = n => RANKS[n % 13 + 1] + SUITS[(n / 13) | 0];
  const mk = id => ({ id, s: SUITS.indexOf(id.slice(-1)), r: RANKS.indexOf(id.slice(0, -1)), up: false });
  const pileArr = ref => ref.t === 'stock' ? G.stock : ref.t === 'waste' ? G.waste : ref.t === 'found' ? G.found[ref.i] : G.tab[ref.i];
  const same = (a, b) => a && b && a.t === b.t && (a.i || 0) === (b.i || 0);
  function where(c) {
    if (G.stock.includes(c)) return { t: 'stock' }; if (G.waste.includes(c)) return { t: 'waste' };
    for (let i = 0; i < 4; i++) if (G.found[i].includes(c)) return { t: 'found', i };
    for (let i = 0; i < 7; i++) if (G.tab[i].includes(c)) return { t: 'tab', i };
    return null;
  }
  const top = a => a[a.length - 1];
  const vegas = () => opts.scoring === 'vegas', standard = () => opts.scoring === 'standard';
  const maxPasses = () => (vegas() ? (opts.draw === 3 ? 3 : 1) : Infinity);

  function newGame(seed) {
    const pick = pickDeal(seed == null ? (Math.random() * 4294967296) >>> 0 : seed >>> 0, opts.draw);
    const { tab, stock } = dealOut(pick.deck);
    G = { seed: pick.seed, solvable: pick.solved, stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []], fan: 0,
      score: 0, penalty: 0, time: 0, started: false, won: false, passes: 1, undo: [], moves: 0 };
    const C = n => { const id = idOf(n); const c = cards[id] ? Object.assign(cards[id].c, { up: false }) : mk(id); return c; };
    tab.forEach((col, i) => col.forEach((n, j) => { const c = C(n); c.up = j === col.length - 1; G.tab[i].push(c); }));
    stock.forEach(n => G.stock.push(C(n)));
    if (vegas()) { G.score = (opts.cumulative ? vegasBank : 0) - 52; vegasBank = G.score; }
    return G;
  }

  /* undo snapshots: every pile as ids (+ face-up flag), the score and the pass count */
  const snap = () => ({ p: [G.stock, G.waste, ...G.found, ...G.tab].map(a => a.map(c => c.id + (c.up ? '+' : '-'))), score: G.score, penalty: G.penalty, passes: G.passes, fan: G.fan });
  function pushUndo() { G.undo.push(snap()); if (G.undo.length > 500) G.undo.shift(); }
  function restore(sn) {
    const piles = sn.p.map(a => a.map(t => { const c = cards[t.slice(0, -1)].c; c.up = t.slice(-1) === '+'; return c; }));
    G.stock = piles[0]; G.waste = piles[1]; G.found = piles.slice(2, 6); G.tab = piles.slice(6, 13);
    G.passes = sn.passes; G.fan = sn.fan;
    G.score = standard() ? Math.max(0, sn.score - (G.penalty - sn.penalty)) : sn.score;
    if (vegas()) vegasBank = G.score;
  }
  function undo() {
    if (busy || !G || G.won || !G.undo.length) return false;
    clearSel(); restore(G.undo.pop()); layout(true); status(); return true;
  }
  function addScore(n) { if (opts.scoring === 'none') return; G.score += n; if (standard()) G.score = Math.max(0, G.score); if (vegas()) vegasBank = G.score; }

  /* rules */
  const canFound = (c, i, n = 1) => { if (n !== 1 || !c.up) return false; const f = G.found[i]; return f.length ? top(f).s === c.s && top(f).r === c.r - 1 : c.r === 1; };
  const canTab = (c, i) => { const t = top(G.tab[i]); return t ? t.up && isRed(t.s) !== isRed(c.s) && t.r === c.r + 1 : c.r === 13; };
  // the cards that would move if c is picked up (null if it can't be)
  function grab(c) {
    const ref = where(c); if (!ref || !c.up) return null; const a = pileArr(ref), i = a.indexOf(c);
    if (ref.t === 'stock') return null;
    if (ref.t !== 'tab') return i === a.length - 1 ? { ref, i, list: [c] } : null;
    for (let j = i + 1; j < a.length; j++) { const u = a[j - 1], v = a[j]; if (!v.up || isRed(u.s) === isRed(v.s) || u.r !== v.r + 1) return null; }
    return { ref, i, list: a.slice(i) };
  }
  const legal = (g, to) => { if (!g || same(g.ref, to)) return false; if (to.t === 'found') return canFound(g.list[0], to.i, g.list.length); if (to.t === 'tab') return canTab(g.list[0], to.i); return false; };

  function move(g, to) {
    if (!legal(g, to)) return false;
    pushUndo();
    const from = pileArr(g.ref), list = from.splice(g.i);
    pileArr(to).push(...list);
    const ft = g.ref.t, tt = to.t;
    if (standard()) {
      if (ft === 'waste' && tt === 'tab') addScore(5);
      if (tt === 'found' && ft !== 'found') addScore(10);
      if (ft === 'found' && tt === 'tab') addScore(-15);
    } else if (vegas()) {
      if (tt === 'found' && ft !== 'found') addScore(5);
      if (ft === 'found' && tt === 'tab') addScore(-5);
    }
    if (ft === 'waste' && G.fan > 1) G.fan--;
    if (ft === 'tab') autoFlip(g.ref.i);
    G.started = true; G.moves++;
    layout(true, list); status(); checkWin();
    return true;
  }
  function autoFlip(i) { const t = top(G.tab[i]); if (t && !t.up) { t.up = true; if (standard()) addScore(5); } }
  function flipTop(c) { const ref = where(c); if (!ref || ref.t !== 'tab' || top(G.tab[ref.i]) !== c || c.up) return false; pushUndo(); c.up = true; if (standard()) addScore(5); G.started = true; layout(true); status(); return true; }

  function drawStock() {
    if (busy || G.won) return;
    clearSel();
    if (G.stock.length) {
      pushUndo();
      const n = Math.min(opts.draw, G.stock.length), moved = [];
      for (let i = 0; i < n; i++) { const c = G.stock.pop(); c.up = true; G.waste.push(c); moved.push(c); }
      G.fan = n; G.started = true; layout(true, moved); status(); return;
    }
    if (!G.waste.length || G.passes >= maxPasses()) return;
    pushUndo();
    while (G.waste.length) { const c = G.waste.pop(); c.up = false; G.stock.push(c); }
    G.passes++; G.fan = 0; G.started = true;
    if (standard()) { if (opts.draw === 1) addScore(-100); else if (G.passes > 3) addScore(-20); }   // Draw Three: the first three passes are free
    layout(true); status();
  }
  function toFoundation(c) {
    const g = grab(c); if (!g || g.list.length !== 1) return false;
    for (let i = 0; i < 4; i++) if (legal(g, { t: 'found', i })) return move(g, { t: 'found', i });
    return false;
  }
  // right-click (or the phone's Auto button): every card that can go up goes up, one after another
  function autoPlay() {
    if (busy || !G || G.won) return;
    clearSel();
    const step = () => {
      if (!G || G.won) { busy = false; return; }
      const tops = [top(G.waste), ...G.tab.map(top)].filter(Boolean);
      for (const c of tops) if (c.up && toFoundation(c)) { busy = !G.won; if (!G.won) setTimeout(step, 90); return; }
      busy = false;
    };
    step();
  }

  function checkWin() {
    if (G.won || G.found.some(f => f.length !== 13)) return;
    G.won = true; clearSel();
    let bonus = 0;
    if (standard() && opts.timed && G.time >= 30) { bonus = Math.floor(700000 / G.time); G.score += bonus; }
    G.bonus = bonus; status();
    busy = true;
    setTimeout(() => cascade(), 380);
  }

  /* ---------- geometry & drawing ---------- */
  function measure() {
    const tw = table.clientWidth, th = table.clientHeight, mob = isMobile();
    const wide = mob && tw > th * 1.45, cols = wide ? 10 : 7;
    const pad = mob ? 4 : Math.max(6, Math.round(tw * 0.012));
    let W = (tw - 2 * pad) / cols * (mob ? 0.92 : 0.86);
    const hMax = (th - 2 * pad) / (wide ? 2.9 : 3.05);
    if (W * 190 / 140 > hMax) W = hMax * 140 / 190;
    W = Math.max(28, Math.min(W, mob ? 90 : 124));
    W = Math.floor(W); const H = Math.round(W * 190 / 140);
    const gap = Math.max(2, Math.min((tw - 2 * pad - cols * W) / (cols - 1), W * 0.3));
    const x0 = (tw - (cols * W + (cols - 1) * gap)) / 2, X = i => Math.round(x0 + i * (W + gap));
    const g = { tw, th, W, H, pad, gap, wide, compact: W < 64, mob };
    g.dDown = Math.max(3, Math.round(H * (mob ? 0.09 : 0.075)));
    g.dUp = Math.round(H * (W < 64 ? 0.27 : 0.2));
    if (wide) {
      g.stock = { x: X(0), y: pad }; g.waste = { x: X(0), y: pad + H + gap }; g.fanDx = 0; g.fanDy = Math.round(H * 0.24);
      g.tabX = [1, 2, 3, 4, 5, 6, 7].map(X); g.tabY = pad;
      g.found = [0, 1, 2, 3].map(i => ({ x: X(8 + (i % 2)), y: pad + (i > 1 ? H + gap : 0) }));
    } else {
      g.stock = { x: X(0), y: pad }; g.waste = { x: X(1), y: pad }; g.fanDx = Math.round(W * 0.22); g.fanDy = 0;
      g.found = [0, 1, 2, 3].map(i => ({ x: X(3 + i), y: pad }));
      g.tabX = [0, 1, 2, 3, 4, 5, 6].map(X); g.tabY = pad + H + Math.max(pad, Math.round(H * 0.14));
    }
    return g;
  }
  // tableau offsets for column i: compress face-up (then face-down) spacing when the column would run off the table
  function offsets(i) {
    const col = G.tab[i], n = col.length, g = geo; if (n < 2) return [];
    const avail = g.th - g.tabY - g.pad - g.H - (g.mob ? 2 : 6);
    const nd = col.slice(0, -1).filter(c => !c.up).length, nu = n - 1 - nd;
    let dd = g.dDown, du = g.dUp;
    if (nd * dd + nu * du > avail) {
      du = Math.max(Math.round(g.H * (g.compact ? 0.15 : 0.12)), nu ? (avail - nd * dd) / nu : du);
      if (nd * dd + nu * du > avail) { dd = Math.max(2, nd ? (avail - nu * du) / nd : dd); if (nd * dd + nu * du > avail) { const k = avail / (nd * dd + nu * du); dd *= k; du *= k; } }
    }
    return col.slice(0, -1).map(c => (c.up ? du : dd));
  }
  function posOf(c) {
    const ref = where(c), a = pileArr(ref), i = a.indexOf(c), g = geo;
    if (ref.t === 'stock') { const k = Math.floor(i / 8); return { x: g.stock.x + k * 1.5, y: g.stock.y + k * 1, z: i + 1 }; }
    if (ref.t === 'waste') { const fan = Math.max(1, Math.min(G.fan || 1, 3)), f = Math.max(0, i - (a.length - fan)); return { x: g.waste.x + f * g.fanDx, y: g.waste.y + f * g.fanDy, z: i + 1 }; }
    if (ref.t === 'found') return { x: g.found[ref.i].x, y: g.found[ref.i].y, z: i + 1 };
    const off = offsets(ref.i); let y = g.tabY; for (let j = 0; j < i; j++) y += off[j];
    return { x: g.tabX[ref.i], y: Math.round(y), z: i + 1 };
  }
  function renderFaces(compact) {
    Object.values(cards).forEach(o => { o.el.querySelector('.so-f').innerHTML = cardSVG(o.c.id, compact); });
    lastCompact = compact;
  }
  function layout(anim, moved) {
    if (!table || !G) return;
    geo = measure();
    const g = geo;
    table.style.setProperty('--w', g.W + 'px'); table.style.setProperty('--h', g.H + 'px');
    table.classList.toggle('so-compact', g.compact);
    if (lastCompact !== g.compact) renderFaces(g.compact);
    table.classList.toggle('so-noanim', !anim);
    const place = (el, p) => { el.style.transform = `translate(${p.x}px, ${p.y}px)`; };
    place(slots.stock, g.stock); slots.found.forEach((s, i) => place(s, g.found[i])); slots.tab.forEach((s, i) => place(s, { x: g.tabX[i], y: g.tabY }));
    slots.stock.classList.toggle('so-x', !G.stock.length && (G.passes >= maxPasses() || !G.waste.length));
    const mv = new Set(moved || []);
    Object.values(cards).forEach(({ c, el }) => {
      const p = posOf(c); c.pos = p;
      el.classList.toggle('down', !c.up);
      el.classList.remove('so-hide');
      if (!el.classList.contains('so-drag')) {
        place(el, p);
        if (anim && mv.has(c)) { el.style.zIndex = 600 + p.z; clearTimeout(el._z); el._z = setTimeout(() => { el.style.zIndex = c.pos.z; }, 200); }
        else el.style.zIndex = p.z;
      }
      const f = c.up && FACES[c.id] && faceInfo(c.id); const t = f ? `${f.card}: ${f.name} (${f.tag})` : '';
      if (el.title !== t) el.title = t;
    });
    if (!anim) { void table.offsetWidth; table.classList.remove('so-noanim'); }
    if (sel) markSel();
  }
  function status() {
    if (!win || !G) return;
    const sc = opts.scoring === 'none' ? '' : vegas() ? `Score: <span class="${G.score < 0 ? 'so-neg' : ''}">$${G.score}</span>` : `Score: ${G.score}`;
    win.setStatus(0, sc); win.setStatus(1, opts.timed ? `Time: ${G.time}` : '');
    win.el.classList.toggle('so-nostatus', !opts.status);
    const u = root && root.querySelector('[data-t=undo]'); if (u) u.disabled = !G.undo.length || G.won;
  }

  /* ---------- selection (tap a card, tap where it goes) ---------- */
  function clearSel() { sel = null; table && table.querySelectorAll('.so-sel').forEach(e => e.classList.remove('so-sel')); hints.forEach(h => h.remove()); hints = []; }
  function markSel() {
    table.querySelectorAll('.so-sel').forEach(e => e.classList.remove('so-sel'));
    hints.forEach(h => h.remove()); hints = [];
    if (!sel) return;
    sel.list.forEach(c => cards[c.id].el.classList.add('so-sel'));
    if (!isMobile()) return;
    // phones: show where the selected card(s) can go
    targets(sel).forEach(r => { const h = document.createElement('div'); h.className = 'so-tgt'; const b = pileRect(r); h.style.transform = `translate(${b.x}px, ${b.y}px)`; h.style.height = b.h + 'px'; table.appendChild(h); hints.push(h); });
  }
  function select(g) { sel = g; markSel(); }
  const allPiles = () => [...[0, 1, 2, 3].map(i => ({ t: 'found', i })), ...[0, 1, 2, 3, 4, 5, 6].map(i => ({ t: 'tab', i }))];
  const targets = g => allPiles().filter(r => legal(g, r));
  // the drop zone of a pile: its top card (or its empty slot)
  function pileRect(r) {
    const g = geo;
    if (r.t === 'found') return { x: g.found[r.i].x, y: g.found[r.i].y, w: g.W, h: g.H };
    const a = G.tab[r.i], t = top(a), y = t && !t.drag ? t.pos.y : g.tabY;
    return { x: g.tabX[r.i], y, w: g.W, h: g.H };
  }

  /* ---------- pointer: drag & drop, click/tap, double-click ---------- */
  function hitPile(x, y) {
    const g = geo;
    for (let i = 0; i < 7; i++) if (x >= g.tabX[i] && x <= g.tabX[i] + g.W && y >= g.tabY) return { t: 'tab', i };
    for (let i = 0; i < 4; i++) if (x >= g.found[i].x && x <= g.found[i].x + g.W && y >= g.found[i].y && y <= g.found[i].y + g.H) return { t: 'found', i };
    if (x >= g.stock.x && x <= g.stock.x + g.W && y >= g.stock.y && y <= g.stock.y + g.H) return { t: 'stock' };
    return null;
  }
  const local = e => { const b = table.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  function onDown(e) {
    if (fx) { endCascade(); return; }
    if (busy || !G || G.won || press) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = e.target.closest('.so-card'), c = el && cards[el.dataset.id].c;
    const p = local(e);
    press = { id: e.pointerId, c, x0: p.x, y0: p.y, cx: e.clientX, cy: e.clientY, g: c && c.up ? grab(c) : null, drag: false, touch: e.pointerType !== 'mouse' };
    try { table.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onMove(e) {
    if (!press || e.pointerId !== press.id) return;
    const dx = e.clientX - press.cx, dy = e.clientY - press.cy;
    if (!press.drag) {
      if (!press.g || Math.hypot(dx, dy) < (press.touch ? 7 : 3)) return;
      press.drag = true; clearSel();
      press.g.list.forEach((c, j) => { const el = cards[c.id].el; el.classList.add('so-drag'); el.style.zIndex = 1000 + j; c.drag = true; });
    }
    press.g.list.forEach(c => { cards[c.id].el.style.transform = `translate(${c.pos.x + dx}px, ${c.pos.y + dy}px)`; });
  }
  function onUp(e) {
    if (!press || e.pointerId !== press.id) return;
    const pr = press; press = null;
    try { table.releasePointerCapture(e.pointerId); } catch (err) {}
    if (pr.drag) {
      const dx = e.clientX - pr.cx, dy = e.clientY - pr.cy, lead = pr.g.list[0];
      pr.g.list.forEach(c => { cards[c.id].el.classList.remove('so-drag'); c.drag = false; });
      const r = { x: lead.pos.x + dx, y: lead.pos.y + dy, w: geo.W, h: geo.H };
      // the legal pile the dragged card overlaps most (a little forgiving on purpose)
      const cand = allPiles().map(t => { const b = pileRect(t); if (t.t === 'tab') b.h = Math.max(b.h, geo.th - b.y); const ox = Math.min(r.x + r.w, b.x + b.w) - Math.max(r.x, b.x), oy = Math.min(r.y + r.h, b.y + b.h) - Math.max(r.y, b.y); return { t, a: ox > 0 && oy > 0 ? ox * oy : 0 }; })
        .filter(o => o.a > 0).sort((a, b) => b.a - a.a);
      const hit = cand.find(o => legal(pr.g, o.t));
      if (!hit || !move(pr.g, hit.t)) layout(true, pr.g.list);   // back where it came from
      return;
    }
    const p = local(e);
    tap(pr.c, hitPile(p.x, p.y));
  }
  function onCancel(e) {
    if (!press || e.pointerId !== press.id) return;
    const pr = press; press = null;
    if (pr.drag) { pr.g.list.forEach(c => { cards[c.id].el.classList.remove('so-drag'); c.drag = false; }); layout(true, pr.g.list); }
  }
  function tap(c, pileHit) {
    const ref = c ? where(c) : pileHit;
    if (ref && ref.t === 'stock') { drawStock(); lastTap = null; return; }
    if (c && !c.up) { clearSel(); flipTop(c); lastTap = null; return; }
    if (c) {
      const now = performance.now(), dbl = lastTap && lastTap.c === c && now - lastTap.t < 420;
      lastTap = dbl ? null : { c, t: now };
      if (dbl) { const had = sel; clearSel(); if (toFoundation(c)) return; sel = had; }
      if (sel && !sel.list.includes(c)) { if (move(sel, ref)) { clearSel(); lastTap = null; return; } }
      if (sel && sel.list[0] === c && !dbl) { clearSel(); return; }
      const g = grab(c); if (g) select(g); else clearSel();
      return;
    }
    if (sel && pileHit && move(sel, pileHit)) { clearSel(); return; }
    clearSel();
  }

  /* ---------- the win: bouncing cards ---------- */
  const imgCache = {};
  const cardImg = id => { const k = id + (lastCompact ? 'c' : ''); return imgCache[k] || (imgCache[k] = Object.assign(new Image(), { src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cardSVG(id, lastCompact)) })); };
  function cascade() {
    if (!table || !G) return;
    const cv = document.createElement('canvas'); cv.className = 'so-fx';
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = geo.W, H = geo.H, tw = geo.tw, th = geo.th;
    cv.width = Math.round(tw * dpr); cv.height = Math.round(th * dpr);
    table.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const order = []; for (let r = 13; r >= 1; r--) for (let f = 0; f < 4; f++) { const c = G.found[f][r - 1]; if (c) order.push({ c, f }); }
    order.forEach(o => cardImg(o.c.id));
    const live = []; let next = 0, lastLaunch = 0, last = performance.now();
    fx = { cv, raf: 0, done: false };
    const frame = now => {
      if (!fx || fx.cv !== cv) return;
      const dt = Math.min(3, (now - last) / 16.67); last = now;
      if (next < order.length && now - lastLaunch > 190) {
        const { c, f } = order[next++]; lastLaunch = now;
        cards[c.id].el.classList.add('so-hide');
        const vx = (W * (0.035 + Math.random() * 0.06)) * (Math.random() < .5 ? -1 : 1);
        live.push({ img: cardImg(c.id), x: geo.found[f].x, y: geo.found[f].y, vx, vy: -H * (0.02 + Math.random() * 0.1) });
      }
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        p.vy += H * 0.012 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y + H > th) { p.y = th - H; p.vy = -p.vy * 0.78; }
        if (p.img.complete && p.img.naturalWidth) ctx.drawImage(p.img, p.x, p.y, W, H); else { ctx.fillStyle = '#fff'; ctx.fillRect(p.x, p.y, W, H); ctx.strokeStyle = '#555'; ctx.strokeRect(p.x, p.y, W, H); }
        if (p.x > tw || p.x + W < 0) live.splice(i, 1);
      }
      if (next >= order.length && !live.length) { endCascade(); return; }
      fx.raf = requestAnimationFrame(frame);
    };
    fx.raf = requestAnimationFrame(frame);
    FR.sound.play('tada');
  }
  function endCascade() {
    if (!fx || fx.done) return;
    fx.done = true; cancelAnimationFrame(fx.raf);
    fx.cv.classList.add('so-fx-done');
    Object.values(cards).forEach(o => o.el.classList.add('so-hide'));
    const msg = `Game over. Deal again?${standard() || vegas() ? `<br><br>Score: ${vegas() ? '$' + G.score : G.score.toLocaleString('en-US')}${G.bonus ? ` (time bonus ${G.bonus.toLocaleString('en-US')})` : ''}` : ''}`;
    setTimeout(() => {
      FR.dialog({ title: 'Solitaire', icon: 'question', message: msg, buttons: ['Yes', 'No'] }).then(r => {
        busy = false;
        if (r.button === 'Yes' && win && FR.wm.wins.get('solitaire') === win) deal();
      });
    }, 60);
  }
  function clearFx() { if (fx) { cancelAnimationFrame(fx.raf); fx.cv.remove(); fx = null; } }

  /* ---------- dealing ---------- */
  function deal(seed) {
    if (!table) return;
    clearFx(); clearSel(); press = null; busy = true;
    newGame(seed);
    geo = measure();
    ensureCards();
    // everything starts on the stock, then flies out to the tableau (quick, like a real deal)
    table.classList.add('so-noanim');
    Object.values(cards).forEach(({ el }) => { el.classList.remove('so-hide', 'so-drag'); el.classList.add('down'); el.style.transform = `translate(${geo.stock.x}px, ${geo.stock.y}px)`; el.style.transitionDelay = ''; });
    void table.offsetWidth; table.classList.remove('so-noanim');
    const order = []; for (let row = 0; row < 7; row++) for (let c = row; c < 7; c++) order.push(G.tab[c][row]);
    order.forEach((c, k) => { cards[c.id].el.style.transitionDelay = (k * 18) + 'ms'; });
    layout(true);
    status();
    setTimeout(() => { Object.values(cards).forEach(({ el }) => { el.style.transitionDelay = ''; }); busy = false; }, 28 * 18 + 260);
    win.el.dataset.seed = G.seed;
    if (FR.bus) FR.bus.emit('sol-deal', G.seed);
  }
  function ensureCards() {
    const compact = geo ? geo.compact : false;
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) {
      const id = RANKS[r] + SUITS[s];
      if (cards[id]) continue;
      const c = [...G.stock, ...G.tab.flat()].find(x => x.id === id);
      const el = document.createElement('div'); el.className = 'so-card down'; el.dataset.id = id;
      el.innerHTML = `<div class="so-f">${cardSVG(id, compact)}</div>`;
      table.appendChild(el); cards[id] = { c, el };
    }
    lastCompact = compact;
  }
  function setBack(k) { opts.back = k; if (table) table.style.setProperty('--so-back', backURL(k)); }

  /* ---------- dialogs ----------
     Options… and Deck… are small modal windows of their own (the core dialog treats any <input> as its text box). */
  function modal(title, width, html, onOk) {
    const shade = $('<div class="fr-modal-shade"></div>');
    const content = $(`<div class="fr-dlg so-dlg">${html}<div class="fr-dlg-btns"><button class="default">OK</button><button>Cancel</button></div></div>`);
    FR.wm.layer().appendChild(shade);
    const host = win && !win.min ? win.el : null;
    const x = host ? Math.max(4, Math.round(host.offsetLeft + (host.offsetWidth - width) / 2)) : undefined, y = host ? Math.max(4, host.offsetTop + 56) : undefined;
    const d = FR.wm.open({ title, icon: 'solitaire', width, height: 260, x, y, resizable: false, content, className: 'fr-dialog so-dlg-win', onClose: () => { shade.remove(); } });
    d.el.style.height = 'auto'; d.el.style.zIndex = d.dz; shade.style.zIndex = d.dz - 1;
    if (FR.mobile && FR.wm.fitDialog) FR.wm.fitDialog(d, true);
    const [okB, noB] = content.querySelectorAll('.fr-dlg-btns button');
    okB.onclick = () => { d.close(); onOk(content); };
    noB.onclick = () => d.close();
    content.addEventListener('keydown', e => { if (e.key === 'Enter' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); okB.click(); } });
    setTimeout(() => okB.focus(), 30);
    return content;
  }
  function deckDialog() {
    let pick = opts.back;
    const box = modal('Select Card Back', 380, `<div class="so-deck">${Object.keys(BACKS).map(k => `<button class="so-back-pick${k === pick ? ' on' : ''}" data-k="${k}" title="${BACKS[k][0]}" style="background-image:${backURL(k).replace(/"/g, '&quot;')}"></button>`).join('')}</div><div class="so-deck-l">${Object.keys(BACKS).map(k => `<span>${BACKS[k][0]}</span>`).join('')}</div>`,
      () => setBack(pick));
    box.addEventListener('click', e => { const b = e.target.closest('.so-back-pick'); if (!b) return; pick = b.dataset.k; box.querySelectorAll('.so-back-pick').forEach(x => x.classList.toggle('on', x === b)); });
    box.addEventListener('dblclick', e => { if (e.target.closest('.so-back-pick')) box.querySelector('.fr-dlg-btns button').click(); });
  }
  function optionsDialog() {
    const R = (name, v, label, on) => `<div class="so-o-r"><input type="radio" id="so-o-${name}-${v}" name="so-o-${name}" value="${v}"${on ? ' checked' : ''}><label for="so-o-${name}-${v}">${label}</label></div>`;
    const X = (k, label) => `<div class="so-o-r"><input type="checkbox" id="so-o-${k}"${opts[k] ? ' checked' : ''}><label for="so-o-${k}">${label}</label></div>`;
    modal('Options', 330, `<div class="so-opt">
      <div class="so-o-row"><fieldset><legend>Draw</legend>${R('draw', 1, 'Draw one', opts.draw === 1)}${R('draw', 3, 'Draw three', opts.draw === 3)}</fieldset>
      <fieldset><legend>Scoring</legend>${R('sc', 'standard', 'Standard', standard())}${R('sc', 'vegas', 'Vegas', vegas())}${R('sc', 'none', 'None', opts.scoring === 'none')}</fieldset></div>
      ${X('timed', 'Timed game')}${X('status', 'Status bar')}${X('cumulative', 'Cumulative score (Vegas)')}
      <div class="so-o-r so-o-dis"><input type="checkbox" id="so-o-outline" disabled><label for="so-o-outline">Outline dragging</label></div></div>`, el => {
      if (!win) return;
      const q = sl => el.querySelector(sl);
      const v = { draw: +q('input[name=so-o-draw]:checked').value, scoring: q('input[name=so-o-sc]:checked').value, timed: q('#so-o-timed').checked, status: q('#so-o-status').checked, cumulative: q('#so-o-cumulative').checked };
      const redeal = v.draw !== opts.draw || v.scoring !== opts.scoring;   // like XP: a new draw or scoring rule starts a new game
      if (v.scoring === 'vegas' && (opts.scoring !== 'vegas' || !v.cumulative)) vegasBank = 0;
      Object.assign(opts, v);
      if (redeal) deal(); else { layout(false); status(); }
    });
  }
  function gallery() {
    if (FR.wm.wins.has('so-faces')) { const w = FR.wm.wins.get('so-faces'); w.restore(); w.focus(); return w; }
    const ids = ['KS', 'KH', 'KD', 'KC', 'QS', 'QH', 'QD', 'QC', 'JS', 'JH', 'JD', 'JC'];
    const el = $(`<div class="so-gal"><p class="so-gal-i">The face cards in this deck celebrate the top competitors of the <b>Microsoft Excel World Championship</b>. Frank printed them himself. He is in Vegas watching the real thing.</p>
      <div class="so-gal-g">${ids.map(id => { const f = faceInfo(id); return `<figure class="so-gc" data-id="${id}"><div class="so-gc-c">${cardSVG(id, false)}</div><figcaption><b>${esc(f.name)}</b><span>${esc(f.card)}</span><i>${esc(f.tag)}${f.from ? ' · ' + esc(f.from) : ''}</i></figcaption></figure>`; }).join('')}</div></div>`);
    return FR.wm.open({ id: 'so-faces', title: 'Solitaire — The Face Cards', icon: 'solitaire', width: 760, height: 600, className: 'so-gal-win', content: el });
  }
  const help = () => FR.dialog({ title: 'Solitaire Help', icon: 'warn', message: 'Help file <b>SOL.CHM</b> not found.<br><br>Frank was using it as a mouse pad.' });
  const about = () => FR.dialog({ title: 'About Solitaire', icon: 'solitaire', width: 400, message: `<b>Solitaire</b> &mdash; Frank's favourite way to "reconcile".<br>Version 5.1<br><br>Licensed to: Frank Warmington, Packa Corporation<br><br>The face cards celebrate the top competitors of the Microsoft Excel World Championship: Diarmuid Early, Michael Jarman, Andrew "The Annihilator" Ngai, Jean Wolleh, Jaq Kennedy and Nicolas Micot.<br><br><i>"Everything ties out if you move enough cards." &mdash;F</i>` });

  /* ---------- the window ---------- */
  function solitaire() {
    if (FR.wm.wins.has('solitaire')) { const w = FR.wm.wins.get('solitaire'); w.restore(); w.focus(); return w; }
    root = $(`<div class="so"><div class="so-table" tabindex="-1"><div class="so-slot so-stock"></div>${'<div class="so-slot so-fnd"></div>'.repeat(4)}${'<div class="so-slot so-tab"></div>'.repeat(7)}</div>
      <div class="so-tools"><button data-t="deal">Deal</button><button data-t="undo">Undo</button><button data-t="auto">Auto</button><button data-t="opt">Options</button></div></div>`);
    table = root.querySelector('.so-table');
    slots = { stock: table.querySelector('.so-stock'), found: [...table.querySelectorAll('.so-fnd')], tab: [...table.querySelectorAll('.so-tab')] };
    cards = {}; lastCompact = null;
    const menu = [
      { label: 'Game', items: () => [
        { label: 'Deal', key: 'F2', action: () => deal() }, { sep: true },
        { label: 'Undo', key: 'Ctrl+Z', disabled: !G || !G.undo.length || G.won, action: undo },
        { label: 'Deck...', action: deckDialog }, { label: 'Options...', action: optionsDialog }, { sep: true },
        { label: 'Exit', action: () => win.close() },
      ] },
      { label: 'Help', items: [
        { label: 'Contents', key: 'F1', action: help }, { label: 'The Face Cards...', action: gallery }, { sep: true },
        { label: 'About Solitaire', action: about },
      ] },
    ];
    win = FR.wm.open({ id: 'solitaire', title: 'Solitaire', icon: 'solitaire', width: 700, height: 540, className: 'so-win', menu, content: root,
      statusBar: ['Score: 0', 'Time: 0'],
      onClose: () => { clearInterval(tick); clearFx(); document.removeEventListener('keydown', keyH); ro && ro.disconnect(); win = null; table = null; root = null; G = null; cards = {}; busy = false; sel = null; press = null; } });
    setBack(opts.back);
    table.addEventListener('pointerdown', onDown);
    table.addEventListener('pointermove', onMove);
    table.addEventListener('pointerup', onUp);
    table.addEventListener('pointercancel', onCancel);
    table.addEventListener('lostpointercapture', onCancel);
    table.addEventListener('contextmenu', e => { e.preventDefault(); if (isMobile() || press) return; autoPlay(); });
    table.addEventListener('dragstart', e => e.preventDefault());
    root.querySelector('.so-tools').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      ({ deal: () => deal(), undo, auto: autoPlay, opt: optionsDialog })[b.dataset.t]();
    });
    keyH = e => {
      if (!win || FR.wm.active !== win || win.el.classList.contains('fr-inactive') || FR.wm.topDialog()) return;
      if (e.target.closest && e.target.closest('input, textarea')) return;
      if (e.key === 'F2') { e.preventDefault(); deal(); }
      else if (e.key === 'F1') { e.preventDefault(); help(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    };
    document.addEventListener('keydown', keyH);
    const ro = window.ResizeObserver ? new ResizeObserver(() => { if (G && !press && !fx) layout(false); else if (fx && !fx.done) endCascade(); }) : null;
    if (ro) ro.observe(table);
    tick = setInterval(() => {
      if (!G || !G.started || G.won || !win || win.min || document.hidden) return;
      G.time++;
      if (standard() && opts.timed && G.time % 10 === 0) { G.penalty += 2; addScore(-2); }
      status();
    }, 1000);
    deal();
    return win;
  }
  FR.apps.solitaire = solitaire;

  /* test hook (file:// and localhost only): lets test/solitaire_play.py set up positions and check the art */
  if (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    solitaire._test = {
      opts, FACES, faceInfo, cardSVG, solve: (seed, draw) => { const { tab, stock } = dealOut(shuffled(seed)); return solve(tab, stock, draw || 1); }, pickDeal,
      deal: seed => deal(seed),
      state: () => G && { seed: G.seed, solvable: G.solvable, score: G.score, time: G.time, passes: G.passes, won: G.won, undo: G.undo.length, busy, sel: sel && sel.list.map(c => c.id),
        stock: G.stock.map(c => c.id), waste: G.waste.map(c => c.id), found: G.found.map(f => f.map(c => c.id)), tab: G.tab.map(t => t.map(c => c.id + (c.up ? '+' : '-'))) },
      // piles as ids; a leading "#" = face down. Every card must appear once.
      load(spec) {
        clearFx(); clearSel(); busy = false;
        const c = t => { const o = cards[t.replace('#', '')].c; o.up = t[0] !== '#'; return o; };
        G.stock = (spec.stock || []).map(t => { const o = c(t); o.up = false; return o; }); G.waste = (spec.waste || []).map(c); G.found = [0, 1, 2, 3].map(i => ((spec.found || [])[i] || []).map(c)); G.tab = [0, 1, 2, 3, 4, 5, 6].map(i => ((spec.tab || [])[i] || []).map(c));
        const n = G.stock.length + G.waste.length + G.found.flat().length + G.tab.flat().length; if (n !== 52) throw new Error('load: ' + n + ' cards');
        G.fan = Math.min(G.waste.length, opts.draw); G.undo = []; G.won = false; G.started = true; G.passes = 1;
        layout(false); status();
      },
      rect: id => { const b = cards[id].el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; },
      pileRect: (t, i) => { const r = pileRect({ t, i }), b = table.getBoundingClientRect(); return { x: b.left + r.x, y: b.top + r.y, w: r.w, h: r.h }; },
      geo: () => geo, fx: () => !!fx, endCascade,
    };
  }
})();
