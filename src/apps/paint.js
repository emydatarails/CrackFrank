/* FRANK'S COMPUTER — Paint 5.1 (the classic XP one). A real little bitmap editor on a <canvas>: 16 tools, 28 colours,
   undo/redo, selections, flip/rotate/stretch/skew, zoom. Everything is drawn pixel by pixel without anti-aliasing,
   like the real thing, so the bucket fills with tolerance 0 and hearts get jaggy edges.
   It opens on kristians_by_frank.bmp: Frank's MS Paint tribute to Kristians (drawn procedurally, seeded, so it is
   the same picture on every computer).
   Saved pictures live in FR.state.paint.files (PNG data URLs) so they are part of the player's saved game (and follow a
   signed-in player to another device). They show up in My Pictures through FR.fs.extra (see src/fs.js). */
(() => {
  const $ = FR.$, esc = FR.esc;
  const PRINTER = 'HP LaserJet 4 \u2014 Finance (no toner)';
  const K_NAME = 'kristians_by_frank.bmp', K_DATE = '10/11/2026 2:14 AM';
  const DEF_W = 480, DEF_H = 360, MAX_DIM = 800, MAX_AREA = 800 * 600;
  const MAX_FILES = 8, MAX_BYTES = 600 * 1024, UNDO_MAX = 12;
  const MQ = '(max-width: 760px), (pointer: coarse) and (max-width: 1100px)';
  const isMobile = () => typeof FR.mobile === 'boolean' ? FR.mobile : !!(window.matchMedia && matchMedia(FR.MOBILE_MQ || MQ).matches);
  const PICS = 'C:\\Documents and Settings\\Frank Warmington\\My Documents\\My Pictures';

  /* ---------- icons (app + .bmp file), XP-flavoured like src/icons.js ---------- */
  FR.icons.paint = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ptpal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbe8bd"/><stop offset="1" stop-color="#d7a458"/></linearGradient></defs>
    <path d="M15 5C7.5 5 2 9.8 2 16.3 2 22.8 7.4 27 13 27c2.6 0 3.2-1.7 2.4-3.1-.9-1.7.1-3.3 2.2-3.3H22c4.6 0 8-2.6 8-6.9C30 8.8 23.4 5 15 5z" fill="url(#ptpal)" stroke="#8a5a1c" stroke-width=".9"/>
    <circle cx="8.6" cy="13.4" r="2.5" fill="#e3261c" stroke="#8d1610" stroke-width=".5"/><circle cx="14.6" cy="9.8" r="2.5" fill="#f7d417" stroke="#9b8207" stroke-width=".5"/>
    <circle cx="21.2" cy="11" r="2.5" fill="#2a9a3a" stroke="#155d20" stroke-width=".5"/><circle cx="8.4" cy="20.2" r="2.5" fill="#2758d8" stroke="#123a8f" stroke-width=".5"/>
    <path d="M30.5 2.5L19.5 18.5" stroke="#6b3d12" stroke-width="2.8" stroke-linecap="round"/><path d="M30.5 2.5L27 7.6" stroke="#c98a3c" stroke-width="1" stroke-linecap="round"/>
    <path d="M20.2 17.6l-3 4.4c-.9 1.3-2.9 1.8-3.8 1.1 1.1-1.1 1.2-2.8 2.4-4l2.2-2z" fill="#e3261c" stroke="#8d1610" stroke-width=".7"/></svg>`;
  FR.icons.bmp = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 2h14l6 6v22H6z" fill="#fff" stroke="#7d8ea3" stroke-width=".9"/><path d="M20 2v6h6" fill="#eef2f7" stroke="#7d8ea3" stroke-width=".9"/>
    <rect x="8.5" y="11.5" width="15" height="13" fill="#bfe3ff" stroke="#6b7a8c" stroke-width=".8"/><path d="M9 24l4.2-5.2 3 3 2.2-2.2L23 24z" fill="#3a9a3a"/><circle cx="20" cy="15" r="1.9" fill="#ffd33a"/>
    <path d="M13.2 17.2c-1.3-1.2-.3-2.9 1-1.9 1.3-1 2.3.7 1 1.9l-1 1z" fill="#e3261c"/></svg>`;

  /* ---------- the 28 classic colours, tools ---------- */
  const PAL0 = ['#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040'];
  const TOOLS = [
    ['free', 'Free-Form Select', 'Selects a free-form part of the picture to move, copy, or edit.'],
    ['select', 'Select', 'Selects a rectangular part of the picture to move, copy, or edit.'],
    ['eraser', 'Eraser/Color Eraser', 'Erases a portion of the picture, using the selected eraser shape.'],
    ['fill', 'Fill With Color', 'Fills an area with the current drawing color.'],
    ['pick', 'Pick Color', 'Picks up a color from the picture for drawing.'],
    ['mag', 'Magnifier', 'Changes the magnification.'],
    ['pencil', 'Pencil', 'Draws a free-form line one pixel wide.'],
    ['brush', 'Brush', 'Draws using a brush with the selected shape and size.'],
    ['air', 'Airbrush', 'Draws using an airbrush of the selected size.'],
    ['text', 'Text', 'Inserts text into the picture.'],
    ['line', 'Line', 'Draws a straight line with the selected line width.'],
    ['curve', 'Curve', 'Draws a curved line with the selected line width.'],
    ['rect', 'Rectangle', 'Draws a rectangle with the selected fill style.'],
    ['poly', 'Polygon', 'Draws a polygon with the selected fill style.'],
    ['ellipse', 'Ellipse', 'Draws an ellipse with the selected fill style.'],
    ['rrect', 'Rounded Rectangle', 'Draws a rounded rectangle with the selected fill style.'],
  ];
  const TIP = Object.fromEntries(TOOLS.map(t => [t[0], t]));
  const sv = b => `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${b}</svg>`;
  const TI = {
    free: sv('<path d="M3 6L7 2.5 12.5 4 13 9.5 9 13.5 4.5 12 5.5 9z" fill="none" stroke="#000" stroke-dasharray="2 1.2"/>'),
    select: sv('<rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke="#000" stroke-dasharray="2 1"/>'),
    eraser: sv('<path d="M2.5 10.5l6-6 5 5-4 4h-4z" fill="#f6ef9c" stroke="#000"/><path d="M5.5 7.5l5 5" stroke="#000"/><path d="M3 10.5l3 3" stroke="#e7a7c8"/>'),
    fill: sv('<path d="M3.5 8.5l5-5 5 5-5 5z" fill="#dcdcdc" stroke="#000"/><path d="M4 8h9" stroke="#000"/><path d="M13 9v4h1V9z" fill="#0000ff" stroke="none"/><path d="M8.5 3.5V1" stroke="#000"/>'),
    pick: sv('<path d="M3 14l1-3 6-6 2 2-6 6z" fill="#fff" stroke="#000"/><path d="M10 4l2-2 2 2-2 2z" fill="#000"/>'),
    mag: sv('<circle cx="6.5" cy="6.5" r="4" fill="#dff1ff" stroke="#000"/><path d="M9.5 9.5l4.5 4.5" stroke="#000" stroke-width="2"/>'),
    pencil: sv('<path d="M3 13l1-3 7-7 2 2-7 7z" fill="#f7d417" stroke="#000"/><path d="M3 13l1-3 2 2z" fill="#f4c89a"/><path d="M11 3l2 2" stroke="#e7a7c8"/>'),
    brush: sv('<path d="M8 8l5-6 1 1-6 5z" fill="#8a5a1c" stroke="#000" stroke-width=".8"/><path d="M8 8c-2 0-3 1-3.5 3S3 14 2 14c3 0 6-1 6.5-3.5z" fill="#2758d8" stroke="#000" stroke-width=".8"/>'),
    air: sv('<rect x="6.5" y="6.5" width="5" height="8" fill="#c0c0c0" stroke="#000"/><rect x="7.5" y="4.5" width="3" height="2" fill="#000"/><g fill="#0000ff"><rect x="3" y="2" width="1" height="1"/><rect x="1" y="4" width="1" height="1"/><rect x="4" y="5" width="1" height="1"/><rect x="2" y="7" width="1" height="1"/><rect x="5" y="1" width="1" height="1"/></g>'),
    text: sv('<path d="M3 13.5L7.3 2.5h1.4L13 13.5M5 9h6" fill="none" stroke="#000" stroke-width="1.6" shape-rendering="auto"/>'),
    line: sv('<path d="M2 13L14 3" stroke="#000" stroke-width="1.3" shape-rendering="auto"/>'),
    curve: sv('<path d="M2 12C4 2 9 2 8 8s4 6 6-4" fill="none" stroke="#000" stroke-width="1.3" shape-rendering="auto"/>'),
    rect: sv('<rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke="#000"/>'),
    poly: sv('<path d="M2.5 13.5l2-9 5 3 4-5v11z" fill="none" stroke="#000"/>'),
    ellipse: sv('<ellipse cx="8" cy="8" rx="6" ry="4.5" fill="none" stroke="#000" shape-rendering="auto"/>'),
    rrect: sv('<rect x="2.5" y="3.5" width="11" height="9" rx="3" fill="none" stroke="#000" shape-rendering="auto"/>'),
  };
  const BRUSHES = ['r7', 'r4', 'r1', 's8', 's5', 's2', 'f8', 'f5', 'f2', 'b8', 'b5', 'b2'];
  const FONTS = ['Arial', 'Comic Sans MS', 'Courier New', 'Tahoma', 'Times New Roman', 'Verdana'];
  const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];

  /* ---------- colours as canvas pixels (RGBA bytes in a Uint32, little-endian) ---------- */
  const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgb2hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  const U = c => { const [r, g, b] = typeof c === 'string' ? hex2rgb(c) : c; return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; };
  const unU = u => [u & 255, (u >>> 8) & 255, (u >>> 16) & 255];

  /* ---------- a pixel raster over an ImageData: no anti-aliasing anywhere ---------- */
  const SHAPES = {};
  function shape(kind, d) {
    const key = kind + d; if (SHAPES[key]) return SHAPES[key];
    const o = [], h = Math.floor((d - 1) / 2), c = (d - 1) / 2;
    for (let j = 0; j < d; j++) for (let i = 0; i < d; i++) {
      const on = kind === 's' ? true : kind === 'f' ? i + j === d - 1 : kind === 'b' ? i === j
        : d === 1 || (i - c) ** 2 + (j - c) ** 2 <= (d / 2) ** 2 - 0.5;
      if (on) o.push(i - h, j - h);
    }
    return (SHAPES[key] = o);
  }
  const ONE = shape('s', 1);
  class Raster {
    constructor(img) { this.img = img; this.w = img.width; this.h = img.height; this.px = new Uint32Array(img.data.buffer, img.data.byteOffset, img.width * img.height); }
    set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
    get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null; }
    span(a, b, y, c) { if (y < 0 || y >= this.h) return; a = Math.max(0, a); b = Math.min(this.w - 1, b); const r = y * this.w; for (let x = a; x <= b; x++) this.px[r + x] = c; }
    stamp(x, y, sh, c) { for (let i = 0; i < sh.length; i += 2) this.set(x + sh[i], y + sh[i + 1], c); }
    walk(x0, y0, x1, y1, fn) {   // Bresenham
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, n = 0;
      for (;;) { fn(x0, y0); if ((x0 === x1 && y0 === y1) || ++n > 20000) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    }
    line(x0, y0, x1, y1, sh, c) { this.walk(x0, y0, x1, y1, (x, y) => this.stamp(x, y, sh, c)); }
    polyline(pts, sh, c, closed) {
      if (pts.length === 1) this.stamp(pts[0][0], pts[0][1], sh, c);
      for (let i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], sh, c);
      if (closed && pts.length > 2) this.line(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], sh, c);
    }
    // even-odd scanline polygon fill, sampled at pixel centres
    fillPoly(pts, c) {
      let y0 = Infinity, y1 = -Infinity; pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++) {
        const yc = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length], ay = a[1] + 0.5, by = b[1] + 0.5;
          if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(a[0] + 0.5 + (yc - ay) / (by - ay) * (b[0] - a[0]));
        }
        xs.sort((p, q) => p - q);
        for (let i = 0; i + 1 < xs.length; i += 2) this.span(Math.ceil(xs[i] - 0.5), Math.floor(xs[i + 1] - 0.5), y, c);
      }
    }
    // scanline flood fill, 4-connected, tolerance 0 (like Paint)
    flood(x, y, c) {
      const { w, h, px } = this;
      if (x < 0 || y < 0 || x >= w || y >= h) return 0;
      const t = px[y * w + x]; if (t === c) return 0;
      const st = [x, y]; let n = 0;
      while (st.length) {
        const yy = st.pop(), xx = st.pop(), row = yy * w;
        if (px[row + xx] !== t) continue;
        let l = xx, r = xx;
        while (l > 0 && px[row + l - 1] === t) l--;
        while (r < w - 1 && px[row + r + 1] === t) r++;
        for (let i = l; i <= r; i++) px[row + i] = c;
        n += r - l + 1;
        for (let ny = yy - 1; ny <= yy + 1; ny += 2) {
          if (ny < 0 || ny >= h) continue;
          const rr = ny * w; let prev = false;
          for (let i = l; i <= r; i++) { const m = px[rr + i] === t; if (m && !prev) st.push(i, ny); prev = m; }
        }
      }
      return n;
    }
  }
  // row spans for boxes: rectangle / rounded rectangle (r > 0) / ellipse; x0..x1, y0..y1 inclusive pixels
  function boxSpan(kind, x0, y0, x1, y1, r) {
    if (x1 < x0 || y1 < y0) return () => null;
    if (kind === 'ellipse') {
      const rx = (x1 - x0 + 1) / 2, ry = (y1 - y0 + 1) / 2, cx = x0 + rx, cy = y0 + ry;
      return y => {
        if (y < y0 || y > y1) return null;
        const dy = (y + 0.5 - cy) / ry; if (Math.abs(dy) > 1) return null;
        const hw = rx * Math.sqrt(1 - dy * dy), a = Math.ceil(cx - hw - 0.5 - 1e-9), b = Math.floor(cx + hw - 0.5 + 1e-9);
        return a <= b ? [a, b] : null;
      };
    }
    r = Math.max(0, Math.min(r || 0, (x1 - x0 + 1) / 2, (y1 - y0 + 1) / 2));
    return y => {
      if (y < y0 || y > y1) return null;
      const yc = y + 0.5, d = yc < y0 + r ? y0 + r - yc : yc > y1 + 1 - r ? yc - (y1 + 1 - r) : 0;
      if (d > r) return null;
      const inset = r ? r - Math.sqrt(Math.max(0, r * r - d * d)) : 0;
      const a = Math.ceil(x0 + inset - 0.5 - 1e-9), b = Math.floor(x1 + 1 - inset - 0.5 + 1e-9);
      return a <= b ? [a, b] : null;
    };
  }
  // mode 0 outline, 1 outline + fill, 2 fill only
  function drawBox(R, kind, x0, y0, x1, y1, lw, mode, cLine, cFill) {
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    const rad = kind === 'rrect' ? 9 : 0;
    const outer = boxSpan(kind, x0, y0, x1, y1, rad), inner = boxSpan(kind, x0 + lw, y0 + lw, x1 - lw, y1 - lw, Math.max(0, rad - lw));
    for (let y = y0; y <= y1; y++) {
      const o = outer(y); if (!o) continue;
      if (mode === 2) { R.span(o[0], o[1], y, cLine); continue; }
      const i = inner(y);
      if (!i) { R.span(o[0], o[1], y, cLine); continue; }
      R.span(o[0], i[0] - 1, y, cLine); R.span(i[1] + 1, o[1], y, cLine);
      if (mode === 1) R.span(i[0], i[1], y, cFill);
    }
  }
  const bez = (p0, c1, c2, p1) => {
    const n = Math.max(12, Math.ceil((Math.hypot(c1[0] - p0[0], c1[1] - p0[1]) + Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) + Math.hypot(p1[0] - c2[0], p1[1] - c2[1])) / 3));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([Math.round(u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0]), Math.round(u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1])]);
    }
    return out;
  };

  /* ---------- aliased text (thresholded, like non-smoothed XP text) ---------- */
  const tcv = document.createElement('canvas'), tcx = tcv.getContext('2d', { willReadFrequently: true });
  const fontCss = f => `${f.italic ? 'italic ' : ''}${f.bold ? 'bold ' : ''}${f.px}px "${f.family}", Arial, sans-serif`;
  const measure = (s, f) => { tcx.font = fontCss(f); return tcx.measureText(s).width; };
  function textInto(R, str, x, y, f, c) {
    if (!str) return 0;
    tcx.font = fontCss(f);
    const w = Math.ceil(tcx.measureText(str).width) + 6, h = Math.ceil(f.px * 1.35) + 4;
    tcv.width = w; tcv.height = h;
    tcx.font = fontCss(f); tcx.textBaseline = 'top'; tcx.fillStyle = '#000';
    tcx.fillText(str, 2, 2);
    if (f.underline) tcx.fillRect(2, Math.round(f.px * 1.05) + 2, w - 6, Math.max(1, Math.round(f.px / 14)));
    const d = tcx.getImageData(0, 0, w, h).data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (d[(j * w + i) * 4 + 3] >= 128) R.set(x - 2 + i, y - 2 + j, c);
    return w - 6;
  }
  const wrapLines = (text, f, maxW) => {
    const out = [];
    String(text).split('\n').forEach(par => {
      let line = '';
      par.split(/(\s+)/).forEach(tok => {
        const t = line + tok;
        if (line && measure(t.trimEnd(), f) > maxW && tok.trim()) { out.push(line.trimEnd()); line = tok; } else line = t;
      });
      out.push(line);
    });
    return out;
  };

  /* =====================================================================================
     kristians_by_frank.bmp — drawn like a grown man with a mouse at 2 AM after the Summit.
     Seeded wobble (no Math.random), pure Paint colours, bucket fills with jaggy edges.
     ===================================================================================== */
  function rng(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function kristiansImage() {
    const W = DEF_W, H = DEF_H, img = new ImageData(W, H), R = new Raster(img), rnd = rng(3212);
    const C = Object.fromEntries(Object.entries({ k: '#000000', w: '#ffffff', red: '#ff0000', pink: '#ff00ff', rose: '#ff0080', yel: '#ffff00', org: '#ff8040', grn: '#00ff00', dgrn: '#008000', blu: '#0000ff', brn: '#804000', cyan: '#80ffff', gry: '#808080' }).map(([k, v]) => [k, U(v)]));
    R.px.fill(C.w);
    const J = a => (rnd() - 0.5) * 2 * a;
    // sample a path and add a drifting wobble (a hand on a mouse); closed paths end exactly where they began
    const wob = (fn, n, amp, closed) => {
      let nx = 0, ny = 0; const pts = [];
      for (let i = 0; i <= n; i++) { nx = nx * 0.72 + J(amp); ny = ny * 0.72 + J(amp); const [x, y] = fn(i / n); pts.push([Math.round(x + nx), Math.round(y + ny)]); }
      if (closed) pts[pts.length - 1] = pts[0].slice();
      return pts;
    };
    const stroke = (pts, c, d = 3) => R.polyline(pts, shape('r', d), c);
    const seg = (pts, c, d = 3, amp = 1.7) => {   // a hand-drawn polyline through the given points
      const out = [];
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]], n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7));
        wob(t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], n, amp).forEach((p, k) => { if (k || i === 1) out.push(p); });
        out[out.length - 1] = [b[0], b[1]];
      }
      if (out.length) out[0] = [pts[0][0], pts[0][1]];
      stroke(out, c, d);
    };
    const ring = (cx, cy, rx, ry, c, d = 3, amp = 1.2, a0 = -Math.PI / 2, tail = 0.3) => {
      const n = Math.max(14, Math.round((rx + ry) / 2.4));
      const pts = wob(t => [cx + Math.cos(a0 + t * Math.PI * 2) * rx, cy + Math.sin(a0 + t * Math.PI * 2) * ry], n, amp, true);
      stroke(pts, c, d);
      if (tail) stroke(wob(t => { const a = a0 + t * tail; return [cx + Math.cos(a) * (rx + 2), cy + Math.sin(a) * (ry + 2)]; }, 4, amp * 0.6), c, d);   // the kid overshoot
    };
    const fillAt = (x, y, c, max = 12000) => {   // bucket, with a leak guard so a gap never floods the picture
      const keep = R.px.slice(), n = R.flood(Math.round(x), Math.round(y), c);
      if (n > max) R.px.set(keep);
    };
    const heart = (cx, cy, s, c, fill, d = 2) => {
      const k = s / 17;
      const pts = wob(t => { const a = t * Math.PI * 2; return [cx + 16 * Math.sin(a) ** 3 * k, cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * k]; }, Math.max(12, Math.round(s * 1.6)), Math.max(0.5, s / 16), true);
      stroke(pts, c, d);
      if (fill != null) fillAt(cx, cy + s * 0.15, fill, s * s * 5);
    };
    const text = (s, x, y, px, c, bold) => textInto(R, s, x, y, { family: 'Arial', px, bold, italic: false }, c);

    // grass: scribbled back and forth along the bottom
    for (let pass = 0; pass < 3; pass++) {
      const pts = [], base = 336 + pass * 8;
      for (let x = -4, up = pass % 2; x <= W + 8; x += 5 + Math.round(rnd() * 4), up = 1 - up) pts.push([x, base + (up ? -9 - Math.round(rnd() * 6) : 5 + Math.round(rnd() * 3))]);
      stroke(pts, pass === 1 ? C.dgrn : C.grn, 2);
    }
    // the lopsided sun (with a face; Frank can't help it)
    ring(54, 52, 31, 25, C.org, 3, 1.4, -2.2, 0.4);
    fillAt(54, 52, C.yel);
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2 + 0.2 + J(0.12), r0 = 36 + J(2), r1 = r0 + 9 + rnd() * 14;
      seg([[54 + Math.cos(a) * r0, 52 + Math.sin(a) * r0 * 0.85], [54 + Math.cos(a) * r1, 52 + Math.sin(a) * r1 * 0.85]], C.org, 3, 0.6);
    }
    R.stamp(45, 46, shape('r', 5), C.k); R.stamp(63, 45, shape('r', 5), C.k);
    stroke(wob(t => { const a = 0.35 + t * 2.4; return [54 + Math.cos(a) * 13, 50 + Math.sin(a) * 10]; }, 8, 0.6), C.k, 2);

    // KRISTIANS, the head
    const hx = 240, hy = 134, hr = 56;
    ring(hx, hy, hr + 2, hr - 3, C.k, 3, 1.6, -1.1, 0.35);
    // spiky hair: spikes that start and end on the head outline, each one filled with the bucket
    const spikes = 8, a0 = Math.PI * 1.12, a1 = Math.PI * 1.88, hair = [];
    const onHead = a => [hx + Math.cos(a) * (hr + 2), hy + Math.sin(a) * (hr - 3)];
    for (let i = 0; i <= spikes; i++) {
      const a = a0 + (a1 - a0) * i / spikes; hair.push(onHead(a));
      if (i < spikes) { const m = a + (a1 - a0) / spikes / 2 + J(0.05), L = 20 + rnd() * 10; hair.push([hx + Math.cos(m) * (hr + L), hy + Math.sin(m) * (hr - 3 + L)]); }
    }
    seg(hair, C.brn, 3, 0.7);
    for (let i = 0; i < spikes; i++) { const m = a0 + (a1 - a0) * (i + 0.5) / spikes; fillAt(hx + Math.cos(m) * (hr + 9), hy + Math.sin(m) * (hr + 6), C.brn, 900); }
    // glasses (lenses filled light blue), the arms go to the ears
    ring(218, 124, 17, 14, C.k, 3, 0.7, -2, 0.2); ring(263, 124, 17, 14, C.k, 3, 0.7, -1, 0.2);
    fillAt(218, 128, C.cyan, 1200); fillAt(263, 128, C.cyan, 1200);
    seg([[235, 121], [246, 120]], C.k, 3, 0.4); seg([[201, 121], [186, 116]], C.k, 3, 0.4); seg([[280, 121], [295, 117]], C.k, 3, 0.4);
    R.stamp(222, 120, shape('r', 7), C.k); R.stamp(267, 120, shape('r', 7), C.k);   // looking up (at the next cheat sheet)
    R.stamp(224, 118, ONE, C.w); R.stamp(269, 118, ONE, C.w);
    // eyebrows, nose, cheeks
    seg([[204, 104], [213, 99], [226, 100]], C.brn, 3, 0.4); seg([[254, 100], [266, 98], [277, 103]], C.brn, 3, 0.4);
    seg([[242, 132], [237, 146], [245, 147]], C.k, 2, 0.3);
    ring(198, 151, 7, 5, C.rose, 2, 0.4, 0, 0); fillAt(198, 151, C.rose, 200);
    ring(283, 151, 7, 5, C.rose, 2, 0.4, 0, 0); fillAt(283, 151, C.rose, 200);
    // the BIG smile: a D-shaped mouth, bucket-filled red, with teeth
    const mouth = wob(t => { const a = t * Math.PI; return [241 + Math.cos(a) * 30, 156 + Math.sin(a) * 22]; }, 12, 0.8);
    stroke([[211, 156], ...mouth.reverse(), [271, 156], [211, 156]], C.k, 3);
    fillAt(241, 168, C.red, 2000);
    seg([[220, 160], [262, 160]], C.w, 3, 0.3);
    for (let x = 227; x < 262; x += 8) R.line(x, 159, x, 161, ONE, C.k);

    // stick body, arms, legs
    seg([[241, 186], [238, 228], [242, 268]], C.k, 3, 1.8);
    seg([[240, 207], [206, 206], [176, 186]], C.k, 3, 1.6);                 // waving
    ring(171, 180, 7, 7, C.k, 2, 0.5, 0, 0);
    for (let i = 0; i < 4; i++) seg([[164 + i * 5, 174], [158 + i * 6, 163]], C.k, 2, 0.3);
    // CHEAT SHEET #212 (a spreadsheet, obviously)
    seg([[318, 152], [417, 148], [419, 238], [320, 242], [318, 152]], C.k, 2, 0.8);
    text('CHEAT SHEET', 325, 158, 13, C.k, true);
    text('#212', 340, 175, 22, C.red, true);
    for (let y = 204; y <= 230; y += 9) R.line(324, y, 413, y - 1, ONE, C.dgrn);
    for (let x = 352; x <= 384; x += 30) R.line(x, 199, x, 234, ONE, C.dgrn);
    seg([[240, 207], [284, 216], [311, 206]], C.k, 3, 1.6);                  // holding it
    ring(318, 204, 8, 8, C.k, 2, 0.5, 0, 0); fillAt(318, 204, C.w, 300);
    seg([[242, 268], [226, 296], [214, 322]], C.k, 3, 1.7); seg([[242, 268], [257, 296], [268, 320]], C.k, 3, 1.7);
    seg([[214, 322], [200, 324]], C.k, 5, 0.3); seg([[268, 320], [283, 321]], C.k, 5, 0.3);

    // tiny Frank, looking up at him
    ring(84, 262, 10, 10, C.k, 2, 0.4, 0, 0.2);
    ring(80, 262, 3, 3, C.k, 1, 0.1, 0, 0); ring(89, 262, 3, 3, C.k, 1, 0.1, 0, 0); R.set(84, 262, C.k);
    R.set(81, 261, C.k); R.set(90, 261, C.k);
    seg([[80, 267], [84, 269], [88, 267]], C.k, 1, 0.1);
    seg([[84, 272], [84, 302]], C.k, 2, 0.6);
    seg([[84, 280], [72, 268]], C.k, 2, 0.4); seg([[84, 280], [97, 267]], C.k, 2, 0.4);
    seg([[84, 302], [76, 323]], C.k, 2, 0.4); seg([[84, 302], [93, 323]], C.k, 2, 0.4);
    seg([[84, 273], [84, 284]], C.red, 3, 0.2);                           // the tie
    text('me', 104, 292, 13, C.k, false);
    seg([[102, 298], [93, 292]], C.k, 1, 0.2); seg([[93, 292], [97, 292]], C.k, 1, 0); seg([[93, 292], [95, 296]], C.k, 1, 0);

    // hearts. lots of hearts.
    [[150, 82, 14, C.red, C.red], [128, 130, 9, C.pink, null], [150, 234, 11, C.rose, C.rose], [346, 94, 16, C.red, C.rose], [398, 70, 10, C.pink, C.pink],
      [442, 110, 19, C.red, C.red], [458, 172, 9, C.rose, null], [438, 254, 15, C.red, C.red], [370, 272, 9, C.pink, null], [305, 280, 8, C.red, C.red],
      [28, 150, 12, C.red, C.red], [40, 205, 8, C.pink, null], [120, 182, 7, C.red, null], [97, 238, 9, C.red, C.red], [172, 262, 10, C.pink, C.pink], [30, 105, 7, C.rose, null]]
      .forEach(([x, y, s, c, f]) => heart(x, y, s, c, f));

    // the typing (Paint's Text tool, so perfectly straight)
    const f = { family: 'Arial', px: 22, bold: true }, a = 'KRISTIANS', b = 'GET SHEET DONE!!';
    const wa = measure(a, f), wb = measure(b, f), total = wa + 26 + wb, x0 = Math.round(126 + (344 - total) / 2);
    text(a, x0, 10, 22, C.blu, true);
    heart(x0 + wa + 13, 21, 9, C.red, C.red, 2);
    text(b, Math.round(x0 + wa + 26), 10, 22, C.blu, true);
    text('by Frank (member #0003)', 316, 300, 13, C.k, false);
    return img;
  }

  /* =====================================================================================
     saved pictures: FR.state.paint.files → nodes in My Pictures
     ===================================================================================== */
  const files = () => (FR.state.paint && Array.isArray(FR.state.paint.files)) ? FR.state.paint.files : [];
  const isK = f => f.name.toLowerCase() === K_NAME;
  const pngBytes = f => f.png ? Math.round((f.png.length - 22) * 3 / 4) : 0;
  const usedBytes = () => files().reduce((a, f) => a + (f.png ? f.png.length : 0), 0);
  const kb = n => Math.max(1, Math.ceil(n / 1024)).toLocaleString('en-US') + ' KB';
  const fileSize = (name, w, h, f) => /\.bmp$/i.test(name) ? kb(54 + Math.ceil(w * 3 / 4) * 4 * h) : kb(f ? pngBytes(f) : w * h / 8);
  const fmtDate = ms => { const d = new Date(ms), h = d.getHours(); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()} ${(h % 12) || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };
  function nodeOf(f) {
    const saved = !!f.png;
    return {
      id: 'pt_' + f.id, parent: 'pics', name: f.name, type: 'file', app: 'paint', icon: 'bmp', author: 'Frank Warmington',
      size: fileSize(f.name, f.w, f.h, saved ? f : null), modified: saved && f.savedAt ? fmtDate(f.savedAt) : K_DATE, paintId: f.id,
      title: isK(f) ? 'KRISTIANS' : '', comments: isK(f) ? 'drew this after the Summit. took 2 hours. worth it.' : '',
      onDelete: saved ? () => { removeFile(f.id); } : undefined,
    };
  }
  const kFile = () => files().find(isK) || { id: 'k', name: K_NAME, w: DEF_W, h: DEF_H };
  const allFiles = () => [kFile(), ...files().filter(f => !isK(f))];
  if (FR.fs && FR.fs.extra) FR.fs.extra.push(() => allFiles().map(nodeOf));

  function removeFile(id) {
    const st = FR.state.paint; if (!st || !Array.isArray(st.files)) return;
    st.files = st.files.filter(f => f.id !== id); FR.save();
    if (S && S.fileId === id) S.fileId = null;
    FR.bus.emit('fs-change');
  }
  // write one picture into the saved game. false when My Pictures is full (the caller shows Low Disk Space)
  function storeFile(name, png, w, h) {
    const cur = files(), old = cur.find(f => f.name.toLowerCase() === name.toLowerCase());
    const count = cur.length + (old ? 0 : 1), bytes = usedBytes() - (old ? old.png.length : 0) + png.length;
    if (count > MAX_FILES || bytes > MAX_BYTES) return null;
    if (!FR.state.paint || !Array.isArray(FR.state.paint.files)) FR.state.paint = { files: [] };
    const rec = { id: old ? old.id : (name.toLowerCase() === K_NAME ? 'k' : 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36)), name, w, h, png, savedAt: FR.clock.now().getTime() };
    const list = FR.state.paint.files.filter(f => f !== old); list.push(rec);
    FR.state.paint.files = list;
    FR.save();                         // one save per picture (never per stroke); signed in, it goes up to the account
    FR.bus.emit('fs-change');
    return rec;
  }
  const loadPng = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

  /* =====================================================================================
     session prefs (shared by every Paint window this session)
     ===================================================================================== */
  const PREF = { fg: [0, 0, 0], bg: [255, 255, 255], pal: PAL0.slice(), tool: 'pencil', line: 1, brush: 'r4', eraser: 8, air: 1, mode: 0, mag: 4, opaque: true,
    font: { family: 'Arial', size: 12, bold: false, italic: false, underline: false }, toolbox: true, colorbox: true, status: true, textbar: true, grid: false };
  let CLIP = null;     // Paint's own clipboard (ImageData)
  let S = null;        // the open Paint window

  /* =====================================================================================
     the window
     ===================================================================================== */
  function paint(node) {
    node = node ? FR.fs.get(node) : null;
    if (S && FR.wm.wins.get('paint') === S.win) {
      const w = S.win; w.restore(); w.focus();
      if (node) askSave().then(ok => ok && openNode(node));
      return w;
    }
    S = build();
    openNode(node && node.paintId ? node : null);
    return S.win;
  }

  function build() {
    const mob = isMobile();
    const root = $(`<div class="pt${mob ? ' pt-mob' : ''}">
      <div class="pt-main">
        <div class="pt-left"><div class="pt-tools">${TOOLS.map(([k, t]) => `<div class="pt-tool" data-t="${k}" title="${t}">${TI[k]}</div>`).join('')}</div><div class="pt-opts"></div></div>
        <div class="pt-wsw"><div class="pt-ws"><div class="pt-page"><div class="pt-stage">
          <canvas class="pt-cv"></canvas><div class="pt-grid"></div>
          <svg class="pt-svg" preserveAspectRatio="none"><path class="pt-ants-w" d=""/><path class="pt-ants" d=""/></svg>
          <div class="pt-h pt-h-r" data-h="r"></div><div class="pt-h pt-h-b" data-h="b"></div><div class="pt-h pt-h-rb" data-h="rb"></div>
          <div class="pt-ghost"></div>
        </div></div></div>
        <div class="pt-fontbar"><div class="pt-fb-t">Fonts</div><select class="pt-fb-f">${FONTS.map(f => `<option>${f}</option>`).join('')}</select><select class="pt-fb-s">${SIZES.map(s => `<option>${s}</option>`).join('')}</select><span class="pt-fb-b" data-k="bold"><b>B</b></span><span class="pt-fb-b" data-k="italic"><i>I</i></span><span class="pt-fb-b" data-k="underline"><u>U</u></span></div>
        </div>
      </div>
      <div class="pt-colors"><div class="pt-fgbg" title="Click to swap the colors"><div class="pt-bgc"></div><div class="pt-fgc"></div></div><div class="pt-pal"></div></div>
    </div>`);
    const s = {
      root, mob, win: null, cv: root.querySelector('.pt-cv'), stage: root.querySelector('.pt-stage'), ws: root.querySelector('.pt-ws'),
      svg: root.querySelector('.pt-svg'), ants: root.querySelectorAll('.pt-svg path'), ghost: root.querySelector('.pt-ghost'), grid: root.querySelector('.pt-grid'),
      w: DEF_W, h: DEF_H, zoom: 1, name: 'untitled.bmp', fileId: null, dirty: false, undo: [], redo: [], act: null, sel: null, poly: null, curve: null, txt: null,
      R: null, base: null, raf: 0, touches: new Map(), pan: null, prevTool: 'pencil', loading: 0, closing: false,
    };
    s.cx = s.cv.getContext('2d', { willReadFrequently: true });
    s.cv.width = s.w; s.cv.height = s.h;
    const menu = [
      { label: 'File', items: () => [
        { label: 'New', action: () => askSave().then(ok => ok && newImage()) },
        { label: 'Open...', key: 'Ctrl+O', action: () => askSave().then(ok => ok && openDialog()) },
        { label: 'Save', key: 'Ctrl+S', action: () => save() },
        { label: 'Save As...', action: () => saveAs() },
        { label: 'Save to My Device (PNG)...', action: download },
        { sep: true },
        { label: 'Print Preview', disabled: true }, { label: 'Page Setup...', disabled: true },
        { label: 'Print...', key: 'Ctrl+P', action: printDlg },
        { sep: true },
        { label: 'Send...', action: () => FR.dialog({ title: 'Paint', icon: 'info', message: 'To send a picture, open Outlook Express and attach it from My Pictures.' }) },
        { label: 'Set As Background (Tiled)', action: () => wallpaper(true) },
        { label: 'Set As Background (Centered)', action: () => wallpaper(false) },
        { sep: true },
        { label: 'Exit', key: 'Alt+F4', action: () => S.win.close() },
      ] },
      { label: 'Edit', items: () => [
        { label: 'Undo', key: 'Ctrl+Z', disabled: !S.undo.length && !S.txt, action: undo },
        { label: 'Repeat', key: 'Ctrl+Y', disabled: !S.redo.length, action: redo },
        { sep: true },
        { label: 'Cut', key: 'Ctrl+X', disabled: !S.sel, action: cut },
        { label: 'Copy', key: 'Ctrl+C', disabled: !S.sel, action: copy },
        { label: 'Paste', key: 'Ctrl+V', disabled: !CLIP, action: paste },
        { label: 'Clear Selection', key: 'Del', disabled: !S.sel, action: clearSel },
        { label: 'Select All', key: 'Ctrl+A', action: selectAll },
        { sep: true },
        { label: 'Copy To...', disabled: true }, { label: 'Paste From...', disabled: true },
      ] },
      { label: 'View', items: () => [
        { label: 'Tool Box', checked: PREF.toolbox, action: () => { PREF.toolbox = !PREF.toolbox; applyView(); } },
        { label: 'Color Box', key: 'Ctrl+L', checked: PREF.colorbox, action: () => { PREF.colorbox = !PREF.colorbox; applyView(); } },
        { label: 'Status Bar', checked: PREF.status, action: () => { PREF.status = !PREF.status; applyView(); } },
        { label: 'Text Toolbar', checked: PREF.textbar, disabled: S.tool !== 'text', action: () => { PREF.textbar = !PREF.textbar; applyView(); } },
        { sep: true },
        { label: 'Zoom: Normal Size', key: 'Ctrl+PgUp', checked: S.zoom === baseZoom(), action: () => setZoom(baseZoom()) },
        { label: 'Zoom: Large Size', key: 'Ctrl+PgDn', checked: S.zoom === 4, action: () => setZoom(4) },
        { label: 'Zoom: Custom...', action: zoomDialog },
        { label: 'Show Grid', key: 'Ctrl+G', checked: PREF.grid, disabled: S.zoom < 4, action: () => { PREF.grid = !PREF.grid; layout(); } },
        { sep: true },
        { label: 'View Bitmap', key: 'Ctrl+F', action: viewBitmap },
      ] },
      { label: 'Image', items: () => [
        { label: 'Flip/Rotate...', key: 'Ctrl+R', action: flipDialog },
        { label: 'Stretch/Skew...', action: stretchDialog },
        { label: 'Invert Colors', key: 'Ctrl+I', action: () => xform(invert) },
        { label: 'Attributes...', key: 'Ctrl+E', action: attributes },
        { label: 'Clear Image', action: clearImage },
        { label: 'Draw Opaque', checked: PREF.opaque, action: () => { PREF.opaque = !PREF.opaque; renderFloat(); renderOpts(); styleText(); } },
      ] },
      { label: 'Colors', items: [{ label: 'Edit Colors...', action: () => editColors(PREF.pal.findIndex(h => h === rgb2hex(PREF.fg))) }] },
      { label: 'Help', items: [
        { label: 'Help Topics', action: () => FR.dialog({ title: 'Paint Help', icon: 'help', width: 400, message: 'Paint Help could not be found.<br><br>MSPAINT.CHM was moved to <b>Kristians Fan Club\\tutorials</b> in 2024 and then, somehow, deleted.<br><br><i>(To draw a heart: draw a heart. To make it jaggy: fill it with the bucket. —F)</i>' }) },
        { sep: true },
        { label: 'About Paint', action: about },
      ] },
    ];
    const win = FR.wm.open({ id: 'paint', title: 'untitled - Paint', icon: 'paint', width: 700, height: 560, className: 'pt-win', maximized: mob, menu, content: root,
      statusBar: [mob ? 'Tap a color for the foreground, long-press it for the background.' : 'For Help, click Help Topics on the Help Menu.', '', ''],
      onClose: () => {
        if (!S || S.closing || !S.dirty) { teardown(); return true; }
        askSave().then(ok => { if (ok && S) { S.closing = true; S.win.close(); } });
        return false;
      } });
    s.win = win;
    s.tool = PREF.tool;
    S = s;
    wire();
    renderPalette(); renderColors(); setTool(PREF.tool, true); applyView();
    const f = PREF.font; root.querySelector('.pt-fb-f').value = f.family; root.querySelector('.pt-fb-s').value = String(f.size);
    return s;
  }
  function teardown() { if (!S) return; clearInterval(S.airT); cancelAnimationFrame(S.raf); document.querySelectorAll('.pt-viewbmp').forEach(v => v.remove()); S = null; }

  const title = () => { if (S) S.win.setTitle(`${S.name === 'untitled.bmp' && !S.fileId ? 'untitled' : S.name} - Paint`); };
  const setStatus = (i, t) => S && S.win.setStatus(i, t);
  const markDirty = () => { if (S) S.dirty = true; };

  /* ---------- image in/out ---------- */
  const snap = () => S.cx.getImageData(0, 0, S.w, S.h);
  function setImage(img) {
    if (img.width !== S.w || img.height !== S.h) { S.w = img.width; S.h = img.height; S.cv.width = S.w; S.cv.height = S.h; }
    S.cx.putImageData(img, 0, 0);
    layout();
  }
  function blank(w, h, c = PREF.bg) { const img = new ImageData(w, h); new Uint32Array(img.data.buffer).fill(U(c)); return img; }
  function resetDoc(name, fileId) {
    dropSel(); S.txt && endText(false); S.poly = S.curve = null; S.act = null;
    S.undo = []; S.redo = []; S.dirty = false; S.name = name; S.fileId = fileId; title();
  }
  async function openNode(n) {
    const f = n ? files().find(x => x.id === n.paintId) || (n.paintId === 'k' ? null : undefined) : null;
    if (f === undefined) return FR.dialog({ title: 'Paint', icon: 'error', message: `Paint cannot open ${esc(n.name)}.<br><br>The file was deleted.` });
    const tok = ++S.loading;
    if (f && f.png) {
      resetDoc(f.name, f.id);
      try {
        const im = await loadPng(f.png);
        if (!S || tok !== S.loading) return;
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
        setImage(g.getImageData(0, 0, c.width, c.height));
      } catch (e) { if (S) setImage(blank(f.w || DEF_W, f.h || DEF_H, [255, 255, 255])); }
    } else {
      resetDoc(K_NAME, 'k');
      setImage(kristiansImage());
    }
    if (!S || tok !== S.loading) return;
    S.zoom = baseZoom(); layout(); S.ws.scrollTop = S.ws.scrollLeft = 0;
    S.root.dataset.ready = String(tok);
  }
  function newImage() {
    let w = DEF_W, h = DEF_H;
    if (S.mob) { w = Math.max(64, Math.min(MAX_DIM, S.ws.clientWidth - 18)); h = Math.max(64, Math.min(MAX_DIM, S.ws.clientHeight - 18)); if (w * h > MAX_AREA) h = Math.floor(MAX_AREA / w); }
    resetDoc('untitled.bmp', null); S.loading++;
    setImage(blank(w, h, [255, 255, 255]));
    S.zoom = 1; layout(); S.ws.scrollTop = S.ws.scrollLeft = 0;
  }

  /* ---------- layout / zoom ---------- */
  function baseZoom() {
    if (!S || !S.mob) return 1;
    const aw = (S.ws.clientWidth || innerWidth) - 14, ah = (S.ws.clientHeight || innerHeight / 2) - 14;
    return Math.min(1, Math.max(0.25, Math.floor(Math.min(aw / S.w, ah / S.h) * 100) / 100));
  }
  function layout() {
    if (!S) return;
    const z = S.zoom, W = S.w * z, H = S.h * z;
    S.stage.style.width = W + 'px'; S.stage.style.height = H + 'px';
    S.cv.style.width = W + 'px'; S.cv.style.height = H + 'px';
    S.cv.classList.toggle('pt-smooth', z < 1);
    S.svg.setAttribute('viewBox', `0 0 ${S.w} ${S.h}`);
    const g = PREF.grid && z >= 4; S.grid.style.display = g ? 'block' : 'none'; if (g) S.grid.style.backgroundSize = `${z}px ${z}px`;
    placeFloat(); placeText(); drawAnts();
    setStatus(2, S.sel ? `${S.sel.w}x${S.sel.h}` : '');
  }
  function setZoom(z, at) {
    if (!S) return;
    endText(true);
    const ws = S.ws, fx = at ? at.x : (ws.scrollLeft + ws.clientWidth / 2) / S.zoom, fy = at ? at.y : (ws.scrollTop + ws.clientHeight / 2) / S.zoom;
    S.zoom = z; layout();
    ws.scrollLeft = Math.max(0, fx * z - ws.clientWidth / 2); ws.scrollTop = Math.max(0, fy * z - ws.clientHeight / 2);
    renderOpts();
  }
  function applyView() {
    if (!S) return;
    S.root.classList.toggle('pt-notools', !PREF.toolbox);
    S.root.classList.toggle('pt-nocolors', !PREF.colorbox);
    const sb = S.win.el.querySelector('.status-bar'); if (sb) sb.style.display = PREF.status ? '' : 'none';
    S.root.querySelector('.pt-fontbar').classList.toggle('on', S.tool === 'text' && PREF.textbar);
  }

  /* ---------- tool box, options, colour box ---------- */
  function setTool(t, quiet) {
    if (!S) return;
    if (!quiet) finishPending();
    if (t === 'pick' && S.tool !== 'pick') S.prevTool = S.tool;
    S.tool = t; if (t !== 'pick') PREF.tool = t;
    S.root.querySelectorAll('.pt-tool').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    S.stage.dataset.tool = t;
    renderOpts(); applyView();
    setStatus(0, S.mob ? `${TIP[t][1]}. Tap a color for the foreground, long-press it for the background.` : TIP[t][2]);
  }
  function renderOpts() {
    if (!S) return;
    const o = S.root.querySelector('.pt-opts'), t = S.tool;
    let h = '';
    const it = (k, v, on, inner) => `<div class="pt-o${on ? ' on' : ''}" data-k="${k}" data-v="${v}">${inner}</div>`;
    if (t === 'select' || t === 'free' || t === 'text') {
      h = it('opaque', 1, PREF.opaque, `<svg viewBox="0 0 30 18"><rect x="3" y="2" width="12" height="12" fill="#ff0" stroke="#000"/><path d="M10 6h14v10H10z" fill="#08f" stroke="#000"/></svg>`)
        + it('opaque', 0, !PREF.opaque, `<svg viewBox="0 0 30 18"><rect x="3" y="2" width="12" height="12" fill="#ff0" stroke="#000"/><path d="M10 6h14v10H10z" fill="none" stroke="#000"/></svg>`);
    } else if (t === 'eraser') {
      h = [4, 6, 8, 10].map(n => it('eraser', n, PREF.eraser === n, `<span class="pt-sq" style="width:${n}px;height:${n}px"></span>`)).join('');
    } else if (t === 'mag') {
      h = (S.mob ? ['fit', 1, 2, 4, 6, 8] : [1, 2, 4, 6, 8]).map(n => it('mag', n, n === 'fit' ? S.zoom === baseZoom() && S.zoom < 1 : S.zoom === n, n === 'fit' ? 'Fit' : n + 'x')).join('');
    } else if (t === 'brush') {
      h = `<div class="pt-bgrid">${BRUSHES.map(b => it('brush', b, PREF.brush === b, brushIcon(b))).join('')}</div>`;
    } else if (t === 'air') {
      h = [0, 1, 2].map(n => it('air', n, PREF.air === n, `<svg viewBox="0 0 28 28">${sprayIcon(n)}</svg>`)).join('');
    } else if (t === 'line' || t === 'curve') {
      h = [1, 2, 3, 4, 5].map(n => it('line', n, PREF.line === n, `<span class="pt-lw" style="height:${n}px"></span>`)).join('');
    } else if (t === 'rect' || t === 'ellipse' || t === 'rrect' || t === 'poly') {
      const sh = t === 'ellipse' ? 'ellipse' : 'rect';
      const mk = (fill, stroke) => `<svg viewBox="0 0 30 16">${sh === 'ellipse' ? `<ellipse cx="15" cy="8" rx="11" ry="6" fill="${fill}" stroke="${stroke}"/>` : `<rect x="4" y="2.5" width="22" height="11" fill="${fill}" stroke="${stroke}"/>`}</svg>`;
      h = it('mode', 0, PREF.mode === 0, mk('none', '#000')) + it('mode', 1, PREF.mode === 1, mk('#808080', '#000')) + it('mode', 2, PREF.mode === 2, mk('#808080', 'none'));
    }
    o.innerHTML = h;
    o.classList.toggle('pt-empty', !h);
    if (!h) S.root.classList.remove('pt-opts-open');
  }
  function brushIcon(b) {
    const k = b[0], d = +b.slice(1), sh = shape(k, d);
    let r = '';
    for (let i = 0; i < sh.length; i += 2) r += `<rect x="${sh[i] + 5}" y="${sh[i + 1] + 5}" width="1" height="1"/>`;
    return `<svg viewBox="0 0 11 11" shape-rendering="crispEdges">${r}</svg>`;
  }
  function sprayIcon(n) {
    const r = [5, 8, 12][n], g = rng(7 + n); let s = '';
    for (let i = 0; i < r * 3; i++) { const a = g() * 6.283, d = r * Math.sqrt(g()); s += `<rect x="${(14 + Math.cos(a) * d).toFixed(0)}" y="${(14 + Math.sin(a) * d).toFixed(0)}" width="1" height="1"/>`; }
    return s;
  }
  function renderPalette() {
    const p = S.root.querySelector('.pt-pal');
    p.innerHTML = PREF.pal.map((c, i) => `<div class="pt-sw" data-i="${i}" style="background:${c}"></div>`).join('');
  }
  function renderColors() {
    if (!S) return;
    S.root.querySelector('.pt-fgc').style.background = rgb2hex(PREF.fg);
    S.root.querySelector('.pt-bgc').style.background = rgb2hex(PREF.bg);
    styleText(); renderFloat();
  }
  function setColor(which, c) { PREF[which] = c.slice(); renderColors(); }

  /* ---------- selection / floating selection ---------- */
  function drawAnts() {
    if (!S) return;
    let d = '';
    const s = S.sel, a = S.act;
    if (s && !s.lifted) d = s.path ? pathD(s.path) : `M${s.x} ${s.y}h${s.w}v${s.h}h${-s.w}z`;
    else if (a && a.marq) { const m = a.marq; d = m.path ? pathD(m.path, true) : `M${m.x} ${m.y}h${m.w}v${m.h}h${-m.w}z`; }
    else if (S.txt) { const t = S.txt; d = `M${t.x} ${t.y}h${t.w}v${t.h}h${-t.w}z`; }
    S.ants.forEach(p => p.setAttribute('d', d));
  }
  const pathD = (pts, open) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0] + 0.5} ${p[1] + 0.5}`).join('') + (open ? '' : 'z');
  function placeFloat() {
    const s = S && S.sel; if (!s || !s.fc) return;
    const z = S.zoom;
    Object.assign(s.fc.style, { left: s.x * z + 'px', top: s.y * z + 'px', width: s.w * z + 'px', height: s.h * z + 'px' });
  }
  function renderFloat() {
    const s = S && S.sel; if (!s || !s.lifted) return;
    if (!s.fc) { s.fc = document.createElement('canvas'); s.fc.className = 'pt-float'; S.stage.insertBefore(s.fc, S.svg); }
    s.fc.width = s.img.width; s.fc.height = s.img.height;
    const show = new ImageData(new Uint8ClampedArray(s.img.data), s.img.width, s.img.height);
    if (!PREF.opaque) { const p = new Uint32Array(show.data.buffer), bg = U(PREF.bg); for (let i = 0; i < p.length; i++) if (p[i] === bg) p[i] = 0; }
    s.fc.getContext('2d').putImageData(show, 0, 0);
    s.fc.classList.toggle('pt-smooth', S.zoom < 1);
    placeFloat(); setStatus(2, `${s.w}x${s.h}`);
  }
  // erase the selected area to the background colour (in a raster)
  function eraseSel(R, s) {
    const bg = U(PREF.bg);
    for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) if (!s.mask || s.mask[j * s.w + i]) R.set(s.x + i, s.y + j, bg);
  }
  function selPixels(s) {
    const img = S.cx.getImageData(s.x, s.y, s.w, s.h);
    if (s.mask) { const p = new Uint32Array(img.data.buffer); for (let i = 0; i < p.length; i++) if (!s.mask[i]) p[i] = 0; }
    return img;
  }
  function lift() {
    const s = S.sel; if (!s || s.lifted) return;
    pushUndo();
    s.img = selPixels(s);
    const R = new Raster(snap()); eraseSel(R, s); S.cx.putImageData(R.img, 0, 0);
    s.lifted = true; renderFloat(); drawAnts(); markDirty();
  }
  function commitSel() {
    const s = S && S.sel; if (!s) return;
    if (s.lifted && s.img) {
      const R = new Raster(snap()), p = new Uint32Array(s.img.data.buffer), bg = U(PREF.bg), op = PREF.opaque;
      for (let j = 0; j < s.img.height; j++) for (let i = 0; i < s.img.width; i++) {
        const v = p[j * s.img.width + i];
        if ((v >>> 24) === 255 && (op || v !== bg)) R.set(s.x + i, s.y + j, v);
      }
      S.cx.putImageData(R.img, 0, 0); markDirty();
    }
    dropSel();
  }
  function dropSel() {
    if (!S) return;
    if (S.sel && S.sel.fc) S.sel.fc.remove();
    S.sel = null; drawAnts(); setStatus(2, '');
  }
  function clearSel() {
    const s = S.sel; if (!s) return;
    if (!s.lifted) { pushUndo(); const R = new Raster(snap()); eraseSel(R, s); S.cx.putImageData(R.img, 0, 0); }
    dropSel(); markDirty();
  }
  function copy() { const s = S.sel; if (!s) return; CLIP = s.lifted ? new ImageData(new Uint8ClampedArray(s.img.data), s.img.width, s.img.height) : selPixels(s); }
  function cut() { if (!S.sel) return; copy(); clearSel(); }
  async function paste() {
    if (!CLIP) return;
    finishPending();
    if (CLIP.width > S.w || CLIP.height > S.h) {
      const r = await FR.dialog({ title: 'Paint', icon: 'question', buttons: ['Yes', 'No', 'Cancel'], message: 'The image in the clipboard is larger than the bitmap.<br>Would you like the bitmap enlarged?' });
      if (r.button === 'Cancel' || !S) return;
      if (r.button === 'Yes') {
        const nw = Math.max(S.w, CLIP.width), nh = Math.max(S.h, CLIP.height);
        if (tooBig(nw, nh)) return bigErr();
        pushUndo(); setImage(resized(snap(), nw, nh));
      }
    }
    setTool('select', true);
    pushUndo();
    const z = S.zoom, x = Math.max(0, Math.min(S.w - 1, Math.floor(S.ws.scrollLeft / z))), y = Math.max(0, Math.min(S.h - 1, Math.floor(S.ws.scrollTop / z)));
    S.sel = { x, y, w: CLIP.width, h: CLIP.height, lifted: true, img: new ImageData(new Uint8ClampedArray(CLIP.data), CLIP.width, CLIP.height) };
    renderFloat(); drawAnts(); markDirty();
  }
  function selectAll() { finishPending(); setTool('select', true); S.sel = { x: 0, y: 0, w: S.w, h: S.h, lifted: false }; drawAnts(); setStatus(2, `${S.w}x${S.h}`); }

  /* ---------- undo ---------- */
  function pushUndo() { S.undo.push(snap()); if (S.undo.length > UNDO_MAX) S.undo.shift(); S.redo = []; }
  function undo() {
    if (!S || S.act) return;
    if (S.txt) { const had = S.txt.ta.value.trim(); endText(!!had); if (!had) return; }
    finishPending();
    if (!S.undo.length) return;
    S.redo.push(snap()); setImage(S.undo.pop()); markDirty();
  }
  function redo() {
    if (!S || S.act || !S.redo.length) return;
    finishPending();
    S.undo.push(snap()); setImage(S.redo.pop()); markDirty();
  }
  function finishPending() {
    if (!S) return;
    if (S.txt) endText(true);
    if (S.poly) closePoly();
    if (S.curve) endCurve();
    commitSel();
  }

  /* ---------- drawing primitives on the working raster ---------- */
  const colorsFor = btn => btn === 2 ? [U(PREF.bg), U(PREF.fg)] : [U(PREF.fg), U(PREF.bg)];
  function begin(a, preview) { pushUndo(); a.pushed = true; S.R = new Raster(snap()); if (preview) S.base = S.R.px.slice(); }
  function flush() { if (S.raf) return; S.raf = requestAnimationFrame(() => { if (!S) return; S.raf = 0; if (S.R) S.cx.putImageData(S.R.img, 0, 0); }); }
  function flushNow() { cancelAnimationFrame(S.raf); S.raf = 0; if (S.R) S.cx.putImageData(S.R.img, 0, 0); }
  function done() { flushNow(); S.R = null; S.base = null; markDirty(); }
  const constrain = (a, p, kind) => {   // Shift: squares, circles, 45° lines
    if (!a.shift) return p;
    const dx = p.x - a.start.x, dy = p.y - a.start.y;
    if (kind === 'line') {
      const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), len = Math.hypot(dx, dy);
      return { x: Math.round(a.start.x + Math.cos(ang) * len), y: Math.round(a.start.y + Math.sin(ang) * len) };
    }
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: a.start.x + Math.sign(dx || 1) * m, y: a.start.y + Math.sign(dy || 1) * m };
  };
  function boxShape(kind, a, p) {
    const [c1, c2] = colorsFor(a.btn), mode = PREF.mode;
    drawBox(S.R, kind, a.start.x, a.start.y, p.x, p.y, PREF.line, mode, mode === 2 ? c1 : c1, c2);
  }
  function polyDraw(pts, btn, closed) {
    const [c1, c2] = colorsFor(btn), sh = shape('r', PREF.line), mode = PREF.mode, P = pts.map(p => [p.x, p.y]);
    if (closed && mode > 0 && P.length > 2) S.R.fillPoly(P, mode === 2 ? c1 : c2);
    if (!closed || mode !== 2) S.R.polyline(P, sh, c1, closed);
  }

  /* ---------- the tools ---------- */
  const T = {
    pencil: { free: true,
      down(p, a) { begin(a); a.c = colorsFor(a.btn)[0]; S.R.set(p.x, p.y, a.c); flush(); },
      move(p, a) { S.R.line(a.last.x, a.last.y, p.x, p.y, ONE, a.c); flush(); },
      up: done },
    brush: { free: true,
      down(p, a) { begin(a); a.c = colorsFor(a.btn)[0]; a.sh = shape(PREF.brush[0], +PREF.brush.slice(1)); S.R.stamp(p.x, p.y, a.sh, a.c); flush(); },
      move(p, a) { S.R.line(a.last.x, a.last.y, p.x, p.y, a.sh, a.c); flush(); },
      up: done },
    eraser: { free: true,
      down(p, a) { begin(a); T.eraser.move(p, a); },
      move(p, a) {
        const n = PREF.eraser, o = Math.floor(n / 2), bg = U(PREF.bg), fg = U(PREF.fg), R = S.R;
        R.walk(a.last.x, a.last.y, p.x, p.y, (x, y) => {
          for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            const X = x - o + i, Y = y - o + j;
            if (a.btn === 2) { if (R.get(X, Y) === fg) R.set(X, Y, bg); } else R.set(X, Y, bg);   // right button: Color Eraser
          }
        });
        flush();
      },
      up: done },
    air: { free: true,
      down(p, a) {
        begin(a); a.c = colorsFor(a.btn)[0]; a.p = p; a.rnd = rng((p.x * 73856093) ^ (p.y * 19349663) ^ S.undo.length);
        const spray = () => { const r = [4, 8, 12][PREF.air]; for (let i = 0; i < r * 1.6; i++) { const ang = a.rnd() * 6.2832, d = r * Math.sqrt(a.rnd()); S.R.set(Math.round(a.p.x + Math.cos(ang) * d), Math.round(a.p.y + Math.sin(ang) * d), a.c); } flush(); };
        spray(); clearInterval(S.airT); S.airT = setInterval(() => { if (S && S.act === a) spray(); }, 28); a.spray = spray;
      },
      move(p, a) { a.p = p; a.spray(); },
      up() { clearInterval(S.airT); done(); } },
    fill: {
      down(p, a) { begin(a); S.R.flood(p.x, p.y, colorsFor(a.btn)[0]); done(); a.pushed = false; } },
    pick: {
      down(p, a) { T.pick.move(p, a); },
      move(p, a) { if (p.x < 0 || p.y < 0 || p.x >= S.w || p.y >= S.h) return; const d = S.cx.getImageData(p.x, p.y, 1, 1).data; setColor(a.btn === 2 ? 'bg' : 'fg', [d[0], d[1], d[2]]); },
      up() { setTool(S.prevTool && S.prevTool !== 'pick' ? S.prevTool : 'pencil', true); } },
    mag: {
      down(p, a) {
        const b = baseZoom();
        if (a.btn === 2 || S.zoom > b + 0.001) setZoom(b, p); else setZoom(Math.max(PREF.mag, 1), p);
      } },
    line: {
      down(p, a) { begin(a, true); a.c = colorsFor(a.btn)[0]; T.line.move(p, a); },
      move(p, a) { p = constrain(a, p, 'line'); S.R.px.set(S.base); S.R.line(a.start.x, a.start.y, p.x, p.y, shape('r', PREF.line), a.c); a.end = p; flush(); sizeStatus(a.start, p); },
      up(p, a) { T.line.move(p, a); done(); } },
    rect: { down(p, a) { begin(a, true); T.rect.move(p, a); }, move(p, a) { p = constrain(a, p); S.R.px.set(S.base); boxShape('rect', a, p); flush(); sizeStatus(a.start, p); }, up(p, a) { T.rect.move(p, a); done(); } },
    ellipse: { down(p, a) { begin(a, true); T.ellipse.move(p, a); }, move(p, a) { p = constrain(a, p); S.R.px.set(S.base); boxShape('ellipse', a, p); flush(); sizeStatus(a.start, p); }, up(p, a) { T.ellipse.move(p, a); done(); } },
    rrect: { down(p, a) { begin(a, true); T.rrect.move(p, a); }, move(p, a) { p = constrain(a, p); S.R.px.set(S.base); boxShape('rrect', a, p); flush(); sizeStatus(a.start, p); }, up(p, a) { T.rrect.move(p, a); done(); } },
    curve: {
      down(p, a) {
        if (!S.curve) { begin(a, true); S.curve = { p0: p, p1: p, stage: 1, btn: a.btn }; }
        else if (S.curve.stage === 2) S.curve.c1 = p; else S.curve.c2 = p;
        a.keep = true; T.curve.move(p, a);
      },
      move(p, a) { const c = S.curve; if (!c) return; if (c.stage === 1) c.p1 = p; else if (c.stage === 2) c.c1 = p; else c.c2 = p; curveDraw(); },
      up(p, a) {
        const c = S.curve; if (!c) return;
        T.curve.move(p, a);
        if (c.stage === 1 && c.p0.x === c.p1.x && c.p0.y === c.p1.y) { S.R.px.set(S.base); endCurve(); return; }
        if (c.stage < 3) c.stage++; else endCurve();
      } },
    poly: {
      down(p, a) {
        if (!S.poly) { begin(a, true); S.poly = { pts: [p], btn: a.btn, lastUp: 0 }; }
        a.keep = true; T.poly.move(p, a);
      },
      move(p, a) { const P = S.poly; if (!P) return; S.R.px.set(S.base); polyDraw([...P.pts, a.shift ? constrain({ ...a, start: P.pts[P.pts.length - 1] }, p, 'line') : p], P.btn, false); flush(); },
      up(p, a) {
        const P = S.poly; if (!P) return;
        if (a.shift) p = constrain({ ...a, start: P.pts[P.pts.length - 1] }, p, 'line');
        const now = Date.now(), last = P.pts[P.pts.length - 1], first = P.pts[0];
        const near = (q, r) => Math.abs(q.x - r.x) <= 3 && Math.abs(q.y - r.y) <= 3;
        if (P.pts.length === 1) P.pts.push(p);
        else if ((now - P.lastUp < 450 && near(p, last)) || (P.pts.length > 2 && near(p, first))) { closePoly(); return; }
        else P.pts.push(p);
        P.lastUp = now;
        S.R.px.set(S.base); polyDraw(P.pts, P.btn, false); flush();
      } },
    select: selTool(false),
    free: selTool(true),
    text: {
      down(p, a) {
        if (S.txt) { const t = S.txt; if (p.x >= t.x && p.y >= t.y && p.x < t.x + t.w && p.y < t.y + t.h) { a.none = true; return; } endText(true); a.none = true; return; }
        a.marq = { x: p.x, y: p.y, w: 0, h: 0 };
      },
      move(p, a) { if (a.none) return; a.marq = rectOf(a.start, p); drawAnts(); sizeStatus(a.start, p); },
      up(p, a) {
        if (a.none) return;
        const r = rectOf(a.start, p); a.marq = null;
        if (r.w < 12 || r.h < 8) { r.w = Math.min(S.w - r.x, Math.max(120, Math.round(fontPx() * 10))); r.h = Math.min(S.h - r.y, Math.round(fontPx() * 1.25) + 6); }
        startText(Math.max(0, Math.min(r.x, S.w - 8)), Math.max(0, Math.min(r.y, S.h - 8)), Math.max(8, r.w), Math.max(8, r.h));
      } },
  };
  function selTool(free) {
    return {
      down(p, a) {
        const s = S.sel;
        if (s && p.x >= s.x && p.y >= s.y && p.x < s.x + s.w && p.y < s.y + s.h) {
          if (!s.lifted) lift();
          a.mode = 'move'; a.off = { x: p.x - s.x, y: p.y - s.y };
          return;
        }
        commitSel();
        a.mode = 'new'; a.marq = free ? { path: [[p.x, p.y]] } : { x: p.x, y: p.y, w: 0, h: 0 };
      },
      move(p, a) {
        if (a.mode === 'move') { const s = S.sel; s.x = p.x - a.off.x; s.y = p.y - a.off.y; placeFloat(); return; }
        if (free) { const q = a.marq.path, l = q[q.length - 1]; if (l[0] !== p.x || l[1] !== p.y) q.push([clampX(p.x), clampY(p.y)]); }
        else a.marq = rectOf(a.start, p, true);
        drawAnts(); if (!free) sizeStatus(a.start, p);
      },
      up(p, a) {
        if (a.mode === 'move') return;
        const m = a.marq; a.marq = null;
        if (free) {
          if (m.path.length < 3) { drawAnts(); return; }
          let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
          m.path.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
          const w = x1 - x0 + 1, h = y1 - y0 + 1;
          if (w < 2 || h < 2) { drawAnts(); return; }
          const mk = new Raster(new ImageData(w, h)); mk.fillPoly(m.path.map(([x, y]) => [x - x0, y - y0]), 1); mk.polyline(m.path.map(([x, y]) => [x - x0, y - y0]), ONE, 1, true);
          const mask = new Uint8Array(w * h); for (let i = 0; i < mask.length; i++) mask[i] = mk.px[i] ? 1 : 0;
          S.sel = { x: x0, y: y0, w, h, mask, path: m.path, lifted: false };
        } else {
          if (m.w < 1 || m.h < 1) { drawAnts(); return; }
          S.sel = { x: m.x, y: m.y, w: m.w, h: m.h, lifted: false };
        }
        drawAnts(); setStatus(2, `${S.sel.w}x${S.sel.h}`);
      },
    };
  }
  const clampX = x => Math.max(0, Math.min(S.w - 1, x)), clampY = y => Math.max(0, Math.min(S.h - 1, y));
  function rectOf(a, b, clip) {
    let x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y), x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
    if (clip) { x0 = clampX(x0); y0 = clampY(y0); x1 = clampX(x1); y1 = clampY(y1); }
    return { x: x0, y: y0, w: x1 - x0 + (clip ? 1 : 0), h: y1 - y0 + (clip ? 1 : 0) };
  }
  const sizeStatus = (a, b) => setStatus(2, `${Math.abs(b.x - a.x) + 1}x${Math.abs(b.y - a.y) + 1}`);
  function curveDraw() {
    const c = S.curve; S.R.px.set(S.base);
    const p0 = [c.p0.x, c.p0.y], p1 = [c.p1.x, c.p1.y];
    const k1 = c.c1 ? [c.c1.x, c.c1.y] : p0, k2 = c.c2 ? [c.c2.x, c.c2.y] : c.c1 ? k1 : p1;
    S.R.polyline(bez(p0, k1, k2, p1), shape('r', PREF.line), colorsFor(c.btn)[0]);
    flush();
  }
  function endCurve() { if (!S.curve) return; S.curve = null; if (S.R) done(); }
  function closePoly() {
    const P = S.poly; if (!P) return; S.poly = null;
    if (!S.R) return;
    S.R.px.set(S.base);
    if (P.pts.length > 1) polyDraw(P.pts, P.btn, true);
    done();
  }

  /* ---------- text tool ---------- */
  const fontPx = () => Math.round(PREF.font.size * 96 / 72);
  const curFont = () => ({ family: PREF.font.family, px: fontPx(), bold: PREF.font.bold, italic: PREF.font.italic, underline: PREF.font.underline });
  function startText(x, y, w, h) {
    const ta = document.createElement('textarea');
    ta.className = 'pt-ta'; ta.spellcheck = false; ta.setAttribute('autocapitalize', 'off'); ta.setAttribute('autocomplete', 'off');
    S.stage.appendChild(ta);
    S.txt = { x, y, w: Math.min(w, S.w - x), h: Math.min(h, S.h - y), ta };
    ta.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); endText(true); } });
    ta.addEventListener('input', () => { const t = S && S.txt; if (!t) return; const need = wrapLines(ta.value, curFont(), t.w - 4).length * Math.round(fontPx() * 1.2) + 6; if (need > t.h) { t.h = Math.min(S.h - t.y, need); placeText(); drawAnts(); } });
    styleText(); placeText(); drawAnts();
    try { ta.focus({ preventScroll: true }); } catch (e) {}
    setTimeout(() => { if (S && S.txt && S.txt.ta === ta) ta.focus({ preventScroll: true }); }, 0);
  }
  function styleText() {
    const t = S && S.txt; if (!t) return;
    const f = curFont(), z = S.zoom;
    Object.assign(t.ta.style, { font: fontCss({ ...f, px: f.px * z }), lineHeight: Math.round(f.px * 1.2) * z + 'px', color: rgb2hex(PREF.fg), background: PREF.opaque ? rgb2hex(PREF.bg) : 'transparent', textDecoration: f.underline ? 'underline' : 'none' });
  }
  function placeText() {
    const t = S && S.txt; if (!t) return;
    const z = S.zoom;
    Object.assign(t.ta.style, { left: t.x * z + 'px', top: t.y * z + 'px', width: t.w * z + 'px', height: t.h * z + 'px' });
    styleText();
  }
  function endText(commit) {
    const t = S && S.txt; if (!t) return;
    S.txt = null; t.ta.remove(); drawAnts();
    const v = t.ta.value.replace(/\s+$/, '');
    if (!commit || !v) return;
    pushUndo();
    const R = new Raster(snap()), f = curFont(), lh = Math.round(f.px * 1.2), fg = U(PREF.fg);
    if (PREF.opaque) for (let y = t.y; y < t.y + t.h; y++) R.span(t.x, t.x + t.w - 1, y, U(PREF.bg));
    const clipR = new Raster(new ImageData(t.w, t.h));
    wrapLines(v, f, t.w - 4).forEach((ln, i) => textInto(clipR, ln, 2, 2 + i * lh, f, 1));
    for (let j = 0; j < t.h; j++) for (let i = 0; i < t.w; i++) if (clipR.px[j * t.w + i]) R.set(t.x + i, t.y + j, fg);
    S.cx.putImageData(R.img, 0, 0); markDirty();
  }

  /* ---------- whole-image / selection transforms ---------- */
  const tooBig = (w, h) => w > MAX_DIM || h > MAX_DIM || w * h > MAX_AREA;
  const bigErr = () => FR.dialog({ title: 'Paint', icon: 'error', message: `The picture would be too big.<br><br>Frank's computer can't handle more than ${MAX_DIM} pixels on a side (or ${MAX_AREA.toLocaleString('en-US')} pixels in all). It has 512 MB of RAM and Packa_Corp_Model_FY26_v47 open.` });
  function mapImg(img, W, H, fn) {   // fn(x, y) → source index or -1 (→ background)
    const out = new ImageData(W, H), src = new Uint32Array(img.data.buffer), dst = new Uint32Array(out.data.buffer), bg = U(PREF.bg);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = fn(x, y); dst[y * W + x] = i < 0 ? bg : src[i]; }
    return out;
  }
  const flipH = img => mapImg(img, img.width, img.height, (x, y) => y * img.width + (img.width - 1 - x));
  const flipV = img => mapImg(img, img.width, img.height, (x, y) => (img.height - 1 - y) * img.width + x);
  const rot90 = img => mapImg(img, img.height, img.width, (x, y) => (img.height - 1 - x) * img.width + y);
  const rot270 = img => mapImg(img, img.height, img.width, (x, y) => x * img.width + (img.width - 1 - y));
  const rot180 = img => mapImg(img, img.width, img.height, (x, y) => (img.height - 1 - y) * img.width + (img.width - 1 - x));
  const invert = img => { const out = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), d = out.data; for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } return out; };
  const stretch = (sx, sy) => img => { const W = Math.max(1, Math.round(img.width * sx)), H = Math.max(1, Math.round(img.height * sy)); return mapImg(img, W, H, (x, y) => Math.min(img.height - 1, Math.floor(y / sy)) * img.width + Math.min(img.width - 1, Math.floor(x / sx))); };
  // skew: rows (horizontal) or columns (vertical) slide by tan(angle) per pixel; the picture grows to fit
  const skewH = a => img => {
    const t = Math.tan(a * Math.PI / 180), w = img.width, h = img.height, ext = Math.round(Math.abs(t) * (h - 1)), off = t < 0 ? ext : 0;
    return mapImg(img, w + ext, h, (x, y) => { const sx = x - off - Math.round(t * y); return sx < 0 || sx >= w ? -1 : y * w + sx; });
  };
  const skewV = a => img => {
    const t = Math.tan(a * Math.PI / 180), w = img.width, h = img.height, ext = Math.round(Math.abs(t) * (w - 1)), off = t < 0 ? ext : 0;
    return mapImg(img, w, h + ext, (x, y) => { const sy = y - off - Math.round(t * x); return sy < 0 || sy >= h ? -1 : sy * w + x; });
  };
  const resized = (img, W, H) => mapImg(img, W, H, (x, y) => (x < img.width && y < img.height ? y * img.width + x : -1));
  function xform(fn) {
    if (!S) return;
    if (S.txt) endText(true);
    if (S.poly) closePoly(); if (S.curve) endCurve();
    const s = S.sel;
    if (s) {
      if (!s.lifted) lift();
      const out = fn(s.img);
      if (tooBig(out.width, out.height)) return bigErr();
      s.img = out; s.w = out.width; s.h = out.height; s.path = null; renderFloat(); drawAnts(); markDirty();
      return;
    }
    const out = fn(snap());
    if (tooBig(out.width, out.height)) return bigErr();
    pushUndo(); setImage(out); markDirty();
  }
  function clearImage() {
    if (!S) return;
    finishPending(); pushUndo(); setImage(blank(S.w, S.h)); markDirty();
  }

  /* ---------- dialogs ---------- */
  // FR.dialog with a small form in its message; returns { button, el } (the form elements keep their values)
  function form(title, html, buttons = ['OK', 'Cancel'], width = 340, init) {
    const m = FR.sound.muted; FR.sound.muted = true;
    // the form goes in after the dialog is built: the core dialog treats an <input> in its message as its own input box
    const pr = FR.dialog({ title, icon: 'paint', message: '<div class="pt-form"></div>', buttons, width: Math.min(width, innerWidth - 8) });
    FR.sound.muted = m;
    const d = FR.wm.topDialog(), el = d ? d.el : document.createElement('div');
    el.classList.add('pt-dlgwin');
    const box = el.querySelector('.pt-form'); if (box) box.innerHTML = html;
    // now that it has its real size, keep it on screen (phones)
    if (d && isMobile()) {
      if (FR.wm.fitDialog) FR.wm.fitDialog(d, true);
      else { const host = el.parentElement || document.body; el.style.left = Math.max(4, Math.round((host.clientWidth - el.offsetWidth) / 2)) + 'px'; el.style.top = Math.max(4, Math.min(el.offsetTop, host.clientHeight - el.offsetHeight - 4)) + 'px'; }
    }
    el.querySelectorAll('.pt-form input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = el.querySelector('.fr-dlg-btns button'); b && b.click(); } }));
    if (init) init(el);
    const first = el.querySelector('.pt-form input[type=text], .pt-form input[type=number]');
    if (first) setTimeout(() => { first.focus(); first.select && first.select(); }, 40);
    return pr.then(r => ({ button: r.button, el }));
  }
  const val = (el, sel) => { const i = el.querySelector(sel); return i ? i.value : ''; };
  let rid = 0;   // XP.css draws radios as <input id> + <label for>
  const radio = (name, value, label, checked, disabled) => { const id = `pt-r${++rid}`; return `<span class="pt-rad"><input type="radio" id="${id}" name="${name}" value="${value}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}><label for="${id}">${label}</label></span>`; };
  async function flipDialog() {
    const r = await form('Flip and Rotate', `<fieldset><legend>Flip or rotate</legend>
      ${radio('pt-fr', 'h', 'Flip horizontal', 1)}
      ${radio('pt-fr', 'v', 'Flip vertical')}
      ${radio('pt-fr', 'r', 'Rotate by angle')}
      <div class="pt-indent">${radio('pt-ang', '90', '90&deg;', 1)}${radio('pt-ang', '180', '180&deg;')}${radio('pt-ang', '270', '270&deg;')}</div></fieldset>`);
    if (r.button !== 'OK' || !S) return;
    const k = r.el.querySelector('[name=pt-fr]:checked').value, ang = r.el.querySelector('[name=pt-ang]:checked').value;
    xform(k === 'h' ? flipH : k === 'v' ? flipV : ang === '90' ? rot90 : ang === '180' ? rot180 : rot270);
  }
  async function stretchDialog() {
    const r = await form('Stretch and Skew', `<fieldset><legend>Stretch</legend>
      <div class="pt-frow"><span>Horizontal:</span><input type="number" class="pt-sh" value="100" min="1" max="500"> %</div>
      <div class="pt-frow"><span>Vertical:</span><input type="number" class="pt-sv" value="100" min="1" max="500"> %</div></fieldset>
      <fieldset><legend>Skew</legend>
      <div class="pt-frow"><span>Horizontal:</span><input type="number" class="pt-kh" value="0" min="-89" max="89"> Degrees</div>
      <div class="pt-frow"><span>Vertical:</span><input type="number" class="pt-kv" value="0" min="-89" max="89"> Degrees</div></fieldset>`);
    if (r.button !== 'OK' || !S) return;
    const sh = +val(r.el, '.pt-sh'), svv = +val(r.el, '.pt-sv'), kh = +val(r.el, '.pt-kh'), kv = +val(r.el, '.pt-kv');
    if (!(sh >= 1 && sh <= 500 && svv >= 1 && svv <= 500)) return FR.dialog({ title: 'Paint', icon: 'warn', message: 'Please enter an integer between 1 and 500.' });
    if (!(Math.abs(kh) <= 89 && Math.abs(kv) <= 89)) return FR.dialog({ title: 'Paint', icon: 'warn', message: 'Please enter an integer between -89 and 89.' });
    if (sh !== 100 || svv !== 100) xform(stretch(sh / 100, svv / 100));
    if (kh) xform(skewH(kh));
    if (kv) xform(skewV(kv));
  }
  async function attributes() {
    finishPending();
    const r = await form('Attributes', `<div class="pt-attr-i">File last saved: ${S.fileId && files().find(f => f.id === S.fileId) ? esc(fmtDate(files().find(f => f.id === S.fileId).savedAt)) : S.fileId === 'k' ? K_DATE : 'Not Available'}<br>Size on disk: ${S.fileId ? fileSize(S.name, S.w, S.h) : 'Not Available'}<br>Resolution: 96 x 96 dots per inch</div>
      <div class="pt-frow"><span>Width:</span><input type="number" class="pt-aw" value="${S.w}" min="1" max="${MAX_DIM}"> <span>Height:</span><input type="number" class="pt-ah" value="${S.h}" min="1" max="${MAX_DIM}"></div>
      <fieldset><legend>Units</legend>${radio('pt-u', 'inches', 'Inches', 0, 1)}${radio('pt-u', 'cm', 'Cm', 0, 1)}${radio('pt-u', 'pixels', 'Pixels', 1)}</fieldset>
      <fieldset><legend>Colors</legend>${radio('pt-c', 'blackandwhite', 'Black and white', 0, 1)}${radio('pt-c', 'colors', 'Colors', 1)}</fieldset>`, ['OK', 'Cancel', 'Default'], 360);
    if (!S || r.button === 'Cancel') return;
    let w = Math.round(+val(r.el, '.pt-aw')), h = Math.round(+val(r.el, '.pt-ah'));
    if (r.button === 'Default') { w = DEF_W; h = DEF_H; }
    if (!(w >= 1 && h >= 1)) return FR.dialog({ title: 'Paint', icon: 'warn', message: 'Please enter a whole number.' });
    if (tooBig(w, h)) return bigErr();
    if (w === S.w && h === S.h) return;
    pushUndo(); setImage(resized(snap(), w, h)); markDirty();
  }
  async function zoomDialog() {
    const r = await form('Custom Zoom', `<div class="pt-attr-i">Current zoom: ${Math.round(S.zoom * 100)}%</div><fieldset><legend>Zoom to</legend>${[1, 2, 4, 6, 8].map(n => radio('pt-z', n, n * 100 + '%', S.zoom === n)).join('')}</fieldset>`);
    if (r.button !== 'OK' || !S) return;
    const c = r.el.querySelector('[name=pt-z]:checked'); if (c) setZoom(+c.value);
  }
  async function editColors(idx) {
    const start = idx >= 0 ? hex2rgb(PREF.pal[idx]) : PREF.fg;
    const r = await form('Edit Colors', `<div class="pt-ec"><div class="pt-ec-prev"></div><div>
      <div class="pt-frow"><span>Red:</span><input type="number" class="pt-er" min="0" max="255" value="${start[0]}"></div>
      <div class="pt-frow"><span>Green:</span><input type="number" class="pt-eg" min="0" max="255" value="${start[1]}"></div>
      <div class="pt-frow"><span>Blue:</span><input type="number" class="pt-eb" min="0" max="255" value="${start[2]}"></div>
      <div class="pt-frow"><span>Hex:</span><input type="text" class="pt-eh" maxlength="7" value="${rgb2hex(start)}"></div>
      <div class="pt-frow"><span>Picker:</span><input type="color" class="pt-ep" value="${rgb2hex(start)}"></div></div></div>`, ['OK', 'Cancel'], 320, el => {
      const prev = el.querySelector('.pt-ec-prev'), q = s => el.querySelector(s);
      const cl = v => Math.max(0, Math.min(255, Math.round(+v) || 0));
      const fromRgb = () => { const c = [cl(q('.pt-er').value), cl(q('.pt-eg').value), cl(q('.pt-eb').value)]; q('.pt-eh').value = rgb2hex(c); q('.pt-ep').value = rgb2hex(c); prev.style.background = rgb2hex(c); };
      const fromHex = h => { if (!/^#?[0-9a-f]{6}$/i.test(h)) return; h = h[0] === '#' ? h : '#' + h; const c = hex2rgb(h.toLowerCase()); q('.pt-er').value = c[0]; q('.pt-eg').value = c[1]; q('.pt-eb').value = c[2]; q('.pt-ep').value = rgb2hex(c); prev.style.background = rgb2hex(c); };
      ['.pt-er', '.pt-eg', '.pt-eb'].forEach(s => q(s).addEventListener('input', fromRgb));
      q('.pt-eh').addEventListener('input', e => fromHex(e.target.value.trim()));
      q('.pt-ep').addEventListener('input', e => fromHex(e.target.value));
      prev.style.background = rgb2hex(start);
    });
    if (r.button !== 'OK' || !S) return;
    const cl = v => Math.max(0, Math.min(255, Math.round(+v) || 0));
    const c = [cl(val(r.el, '.pt-er')), cl(val(r.el, '.pt-eg')), cl(val(r.el, '.pt-eb'))];
    if (idx >= 0) { PREF.pal[idx] = rgb2hex(c); renderPalette(); }
    setColor('fg', c);
  }
  function about() {
    FR.dialog({ title: 'About Paint', icon: 'paint', width: 400, message: 'Paint<br>Version 5.1 (Build 2600.xpsp_sp3)<br><br>This product is licensed to:<br>&nbsp;&nbsp;Frank Warmington<br>&nbsp;&nbsp;Packa Corporation<br><br>Physical memory available to Windows: 523,760 KB<br>Pictures of Kristians drawn in Paint: 1 <span class="pt-dim">(so far)</span>' });
  }
  const printDlg = () => FR.dialog({ title: 'Print', icon: 'error', width: 400, message: `Unable to print.<br><br>Printer: <b>${PRINTER}</b><br>Status: No toner. Since March. Karen has a PO for toner. Diane has not signed it.<br><br><span class="pt-dim">(Frank printed this one in color at the library.)</span>` });

  /* ---------- files: open / save / low disk ---------- */
  function listHtml(list, sel) {
    return `<div class="pt-fd-list" tabindex="0">${list.map(f => `<div class="pt-fd-it${f.name === sel ? ' on' : ''}" data-id="${esc(f.id)}" data-n="${esc(f.name)}">${FR.icon('bmp', 16)}<span class="pt-fd-n">${esc(f.name)}</span><span class="pt-fd-s">${fileSize(f.name, f.w, f.h, f.png ? f : null)}</span></div>`).join('') || '<div class="pt-fd-empty">(no pictures)</div>'}</div>`;
  }
  function wireList(el, dbl) {
    el.querySelectorAll('.pt-fd-it').forEach(it => {
      it.addEventListener('click', () => { el.querySelectorAll('.pt-fd-it').forEach(x => x.classList.toggle('on', x === it)); const n = el.querySelector('.pt-fd-name'); if (n) n.value = it.dataset.n; });
      it.addEventListener('dblclick', () => { const b = el.querySelector(`.fr-dlg-btns button`); if (dbl && b) b.click(); });
    });
  }
  async function openDialog() {
    const list = allFiles();
    const r = await form('Open', `<div class="pt-frow"><span>Look in:</span><select disabled><option>My Pictures</option></select></div>${listHtml(list, S.name)}
      <div class="pt-frow"><span>File name:</span><input type="text" class="pt-fd-name" value="${esc(S.name)}"></div>
      <div class="pt-frow"><span>Files of type:</span><select disabled><option>All Picture Files</option></select></div>`, ['Open', 'Delete', 'Cancel'], 380, el => wireList(el, true));
    if (!S || r.button === 'Cancel') return;
    const nm = val(r.el, '.pt-fd-name').trim(), f = list.find(x => x.name.toLowerCase() === nm.toLowerCase());
    if (r.button === 'Delete') { if (f) await deleteFlow(f); return openDialog(); }
    if (!f) return FR.dialog({ title: 'Open', icon: 'warn', message: `${esc(nm || '(no name)')}<br>File not found.<br>Please verify the correct file name was given.` });
    openNode(nodeOf(f));
  }
  async function deleteFlow(f) {
    if (!f.png) return FR.dialog({ title: 'Error Deleting File', icon: 'error', message: `Cannot delete ${esc(f.name)}: Access is denied.<br><br><i>(Frank would never.)</i>` });
    const r = await FR.dialog({ title: 'Confirm File Delete', icon: 'question', buttons: ['Yes', 'No'], message: isK(f) ? `Delete your changes to '${esc(f.name)}'?<br><br>Frank's original stays.` : `Are you sure you want to delete '${esc(f.name)}'?` });
    if (r.button === 'Yes') { removeFile(f.id); FR.sound.play('recycle'); return true; }
    return false;
  }
  const BAD = /[\\/:*?"<>|]/;
  async function saveAs() {
    if (!S) return false;
    finishPending();
    const saved = files();
    const r = await form('Save As', `<div class="pt-frow"><span>Save in:</span><select disabled><option>My Pictures</option></select></div>${listHtml(saved.length ? saved : [], S.name)}
      <div class="pt-frow"><span>File name:</span><input type="text" class="pt-fd-name" maxlength="60" value="${esc(S.name)}"></div>
      <div class="pt-frow"><span>Save as type:</span><select class="pt-fd-type"><option value="bmp">24-bit Bitmap (*.bmp;*.dib)</option><option value="png">PNG (*.PNG)</option></select></div>
      <div class="pt-fd-note">Pictures saved here stay on Frank's computer, with your game.</div>`, ['Save', 'Cancel'], 380, el => {
      wireList(el, true);
      const t = el.querySelector('.pt-fd-type'), n = el.querySelector('.pt-fd-name');
      if (/\.png$/i.test(S.name)) t.value = 'png';
      t.addEventListener('change', () => { n.value = n.value.replace(/\.(bmp|png|dib)$/i, '') + '.' + t.value; });
    });
    if (!S || r.button !== 'Save') return false;
    let nm = val(r.el, '.pt-fd-name').trim().replace(/\s+/g, ' ');
    const ty = val(r.el, '.pt-fd-type') || 'bmp';
    if (!nm) return false;
    if (BAD.test(nm)) { await FR.dialog({ title: 'Save As', icon: 'error', message: 'A file name cannot contain any of the following characters:<br><br>\\ / : * ? " &lt; &gt; |' }); return saveAs(); }
    if (!/\.(bmp|png|dib)$/i.test(nm)) nm += '.' + ty;
    const old = files().find(f => f.name.toLowerCase() === nm.toLowerCase());
    if (old && old.id !== S.fileId) {
      const q = await FR.dialog({ title: 'Save As', icon: 'warn', buttons: ['Yes', 'No'], message: `${esc(nm)} already exists.<br>Do you want to replace it?` });
      if (q.button !== 'Yes') return saveAs();
    }
    return writeFile(nm);
  }
  async function save() {
    if (!S) return false;
    if (!S.fileId && S.name === 'untitled.bmp') return saveAs();
    finishPending();
    return writeFile(S.name);
  }
  async function writeFile(nm) {
    for (;;) {
      if (!S) return false;
      const png = S.cv.toDataURL('image/png');
      if (png.length > MAX_BYTES) { await lowDisk(true); return false; }
      const rec = storeFile(nm, png, S.w, S.h);
      if (rec) { S.name = rec.name; S.fileId = rec.id; S.dirty = false; title(); setStatus(0, `Saved to My Pictures: ${esc(rec.name)}`); return true; }
      if (!(await lowDisk(false))) return false;
    }
  }
  // My Pictures is full: an in-character Low Disk Space warning; true if the player made room
  async function lowDisk(tooLarge) {
    const used = Math.round(usedBytes() / 1024);
    const r = await FR.dialog({ title: 'Low Disk Space', icon: 'warn', width: 440, buttons: tooLarge ? ['OK'] : ['Delete Pictures...', 'Cancel'],
      message: `<b>You are running out of disk space on Local Disk (C:).</b><br><br>Most of it is 47 versions of Packa_Corp_Model_FY26_v47_FINAL_FINAL_use_this_one.xls.<br><br>${tooLarge ? 'This picture is too big to save. Try a smaller picture (Image &rsaquo; Attributes).' : `My Pictures has room for ${MAX_FILES} pictures and ${MAX_BYTES / 1024} KB (${used} KB used). To free space, delete a picture you don't need, or save over one.`}` });
    if (r.button !== 'Delete Pictures...') return false;
    const n0 = files().length;
    for (;;) {
      const saved = files(); if (!saved.length) return true;
      const d = await form('Delete Pictures', `<div class="pt-attr-i">Pick a picture to delete:</div>${listHtml(saved, '')}<input type="hidden" class="pt-fd-name" value="">`, ['Delete', 'Done'], 360, el => wireList(el, false));
      if (d.button !== 'Delete') return files().length < n0;
      const nm = val(d.el, '.pt-fd-name'), f = saved.find(x => x.name === nm);
      if (f) await deleteFlow(f);
    }
  }
  // Yes/No/Cancel before throwing work away; resolves true when it's OK to go on
  async function askSave() {
    if (!S) return false;
    if (S.txt && S.txt.ta.value.trim()) endText(true);
    if (!S.dirty) return true;
    const r = await FR.dialog({ title: 'Paint', icon: 'warn', buttons: ['Yes', 'No', 'Cancel'], message: `Save changes to ${esc(S.fileId ? PICS + '\\' + S.name : 'untitled')}?` });
    if (!S || r.button === 'Cancel') return false;
    if (r.button === 'No') return true;
    return save();
  }
  function download() {
    if (!S) return;
    finishPending();
    const base = S.name.replace(/\.(bmp|png|dib)$/i, '') || 'untitled';
    S.cv.toBlob(b => {
      if (!b) return;
      const u = URL.createObjectURL(b), a = document.createElement('a');
      a.href = u; a.download = base + '.png'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 4000);
    }, 'image/png');
  }
  function wallpaper(tiled) {
    if (!S) return;
    finishPending();
    const d = document.querySelector('.fr-desktop'); if (!d) return;
    const img = d.querySelector('.fr-wall-img'); if (img) img.style.display = 'none';
    d.style.background = `#3b6fb6 url(${S.cv.toDataURL('image/png')}) ${tiled ? 'repeat' : 'no-repeat center center'}`;
    FR.balloon('Paint', 'Frank\'s desktop has a new background. (Just for tonight.)', null, { silent: true });
  }
  function viewBitmap() {
    if (!S) return;
    finishPending();
    const v = $(`<div class="pt-viewbmp"><img alt=""></div>`);
    v.querySelector('img').src = S.cv.toDataURL('image/png');
    const bye = () => { v.remove(); document.removeEventListener('keydown', bye, true); };
    v.addEventListener('pointerdown', bye); document.addEventListener('keydown', bye, true);
    (document.getElementById('fr-root') || document.body).appendChild(v);
  }

  /* ---------- events ---------- */
  function toDoc(e) { const r = S.cv.getBoundingClientRect(); return { x: Math.floor((e.clientX - r.left) * S.w / r.width), y: Math.floor((e.clientY - r.top) * S.h / r.height) }; }
  function cancelOp() {
    const a = S.act; if (!a) return;
    S.act = null; clearInterval(S.airT);
    if (a.pushed || S.poly || S.curve) { cancelAnimationFrame(S.raf); S.raf = 0; if (S.undo.length) S.cx.putImageData(S.undo.pop(), 0, 0); }
    S.R = null; S.base = null; S.poly = null; S.curve = null; a.marq = null; drawAnts();
  }
  function wire() {
    const { root, stage, ws } = S;
    // tool box
    root.querySelector('.pt-tools').addEventListener('click', e => {
      const b = e.target.closest('.pt-tool'); if (!b) return;
      if (S.mob && b.dataset.t === S.tool) { root.classList.toggle('pt-opts-open'); return; }
      root.classList.remove('pt-opts-open');
      setTool(b.dataset.t);
    });
    root.querySelector('.pt-tools').addEventListener('mouseover', e => { const b = e.target.closest('.pt-tool'); if (b && !S.mob) setStatus(0, TIP[b.dataset.t][2]); });
    root.querySelector('.pt-opts').addEventListener('click', e => {
      const o = e.target.closest('.pt-o'); if (!o) return;
      const k = o.dataset.k, v = o.dataset.v;
      if (k === 'mag') { setZoom(v === 'fit' ? baseZoom() : +v); if (v !== 'fit') PREF.mag = +v; }
      else if (k === 'opaque') { PREF.opaque = v === '1'; renderFloat(); styleText(); }
      else if (k === 'brush') PREF.brush = v;
      else PREF[k] = +v;
      renderOpts();
      if (S.mob) setTimeout(() => root.classList.remove('pt-opts-open'), 150);
    });
    // colour box: left = foreground, right = background, touch: tap = foreground, long-press = background; double-click = Edit Colors
    const pal = root.querySelector('.pt-pal');
    let lp = null;
    const swc = el => hex2rgb(PREF.pal[+el.dataset.i]);
    pal.addEventListener('contextmenu', e => e.preventDefault());
    pal.addEventListener('pointerdown', e => {
      const sw = e.target.closest('.pt-sw'); if (!sw) return;
      if (e.pointerType === 'touch') { clearTimeout(lp && lp.t); lp = { sw, t: setTimeout(() => { if (lp && lp.sw === sw) { lp.fired = true; setColor('bg', swc(sw)); FR.sound.play('click'); } }, 480), fired: false, x: e.clientX, y: e.clientY }; return; }
      if (e.button === 2) setColor('bg', swc(sw)); else if (e.button === 0) setColor('fg', swc(sw));
    });
    pal.addEventListener('pointermove', e => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 12) { clearTimeout(lp.t); lp = null; } });
    pal.addEventListener('pointerup', e => { if (!lp || e.pointerType !== 'touch') return; clearTimeout(lp.t); if (!lp.fired && e.target.closest('.pt-sw') === lp.sw) setColor('fg', swc(lp.sw)); lp = null; });
    pal.addEventListener('pointercancel', () => { if (lp) clearTimeout(lp.t); lp = null; });
    pal.addEventListener('dblclick', e => { const sw = e.target.closest('.pt-sw'); if (sw) editColors(+sw.dataset.i); });
    root.querySelector('.pt-fgbg').addEventListener('click', () => { const f = PREF.fg; PREF.fg = PREF.bg; PREF.bg = f; renderColors(); });
    // font bar
    const fb = root.querySelector('.pt-fontbar');
    fb.querySelector('.pt-fb-f').addEventListener('change', e => { PREF.font.family = e.target.value; styleText(); S.txt && S.txt.ta.focus(); });
    fb.querySelector('.pt-fb-s').addEventListener('change', e => { PREF.font.size = +e.target.value; styleText(); S.txt && S.txt.ta.focus(); });
    fb.addEventListener('pointerdown', e => { const b = e.target.closest('.pt-fb-b'); if (!b) return; e.preventDefault(); PREF.font[b.dataset.k] = !PREF.font[b.dataset.k]; b.classList.toggle('on', PREF.font[b.dataset.k]); styleText(); });
    fb.querySelectorAll('.pt-fb-b').forEach(b => b.classList.toggle('on', !!PREF.font[b.dataset.k]));

    // drawing
    stage.addEventListener('contextmenu', e => e.preventDefault());
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('.pt-h') || e.target.classList.contains('pt-ta')) return;
      if (e.pointerType === 'touch') {
        if (e.isPrimary) { S.touches.clear(); S.pan = null; }   // a new gesture: no other finger is down
        S.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (S.touches.size === 2) { cancelOp(); const [a, b] = [...S.touches.values()]; S.pan = { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, sl: ws.scrollLeft, st: ws.scrollTop }; e.preventDefault(); return; }
        if (S.touches.size > 2) return;
      }
      if (S.pan || S.act || (e.button !== 0 && e.button !== 2)) return;
      e.preventDefault();
      root.classList.remove('pt-opts-open');
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      const p = toDoc(e);
      S.act = { id: e.pointerId, btn: e.button === 2 ? 2 : 0, start: p, last: p, shift: e.shiftKey, pushed: false };
      T[S.tool].down(p, S.act, e);
    });
    stage.addEventListener('pointermove', e => {
      if (S.touches.has(e.pointerId)) S.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (S.pan) {
        if (S.touches.size >= 2) { const [a, b] = [...S.touches.values()]; ws.scrollLeft = S.pan.sl - ((a.x + b.x) / 2 - S.pan.cx); ws.scrollTop = S.pan.st - ((a.y + b.y) / 2 - S.pan.cy); }
        return;
      }
      const p = toDoc(e);
      setStatus(1, p.x >= 0 && p.y >= 0 && p.x < S.w && p.y < S.h ? `${p.x},${p.y}` : '');
      const a = S.act;
      if (!a || e.pointerId !== a.id) { const s = S.sel; stage.classList.toggle('pt-overSel', !!(s && (S.tool === 'select' || S.tool === 'free') && p.x >= s.x && p.y >= s.y && p.x < s.x + s.w && p.y < s.y + s.h)); return; }
      a.shift = e.shiftKey;
      const t = T[S.tool];
      if (!t.move) return;
      const evs = t.free && e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      (evs.length ? evs.map(toDoc) : [p]).forEach(q => { t.move(q, a); a.last = q; });
    });
    const up = e => {
      S.touches.delete(e.pointerId);
      if (S.pan) { if (S.touches.size === 0) S.pan = null; return; }
      const a = S.act; if (!a || e.pointerId !== a.id) return;
      S.act = null;
      if (e.type === 'pointercancel') { S.act = a; cancelOp(); return; }
      const t = T[S.tool]; t.up && t.up(toDoc(e), a, e);
      drawAnts();
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('lostpointercapture', e => { if (S && S.act && S.act.id === e.pointerId && e.pointerType !== 'mouse') up(e); });
    stage.addEventListener('pointerleave', () => setStatus(1, ''));
    // resize handles
    stage.querySelectorAll('.pt-h').forEach(h => h.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      finishPending();
      const k = h.dataset.h; try { h.setPointerCapture(e.pointerId); } catch (err) {}
      const g = S.ghost; g.style.display = 'block';
      let nw = S.w, nh = S.h;
      const mv = ev => {
        const p = toDoc(ev);
        if (k !== 'b') nw = Math.max(1, Math.min(MAX_DIM, p.x));
        if (k !== 'r') nh = Math.max(1, Math.min(MAX_DIM, p.y));
        if (nw * nh > MAX_AREA) { if (k === 'b') nh = Math.floor(MAX_AREA / nw); else nw = Math.floor(MAX_AREA / nh); }
        Object.assign(g.style, { width: nw * S.zoom + 'px', height: nh * S.zoom + 'px' }); setStatus(2, `${nw}x${nh}`);
      };
      const fin = () => {
        h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', fin); h.removeEventListener('pointercancel', fin);
        g.style.display = 'none'; setStatus(2, '');
        if (S && (nw !== S.w || nh !== S.h)) { pushUndo(); setImage(resized(snap(), nw, nh)); markDirty(); }
      };
      mv(e);
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', fin); h.addEventListener('pointercancel', fin);
    }));
    // clicking the grey workspace (not the picture) commits a selection / text / shape like Paint
    ws.addEventListener('pointerdown', e => { if (e.target === ws || e.target.classList.contains('pt-page')) { finishPending(); root.classList.remove('pt-opts-open'); } });
    ws.addEventListener('contextmenu', e => e.preventDefault());
  }
  // one keyboard handler for the Paint window (only while it is the active window and nothing else has the keyboard)
  document.addEventListener('keydown', e => {
    if (!S || FR.wm.active !== S.win || FR.wm.topDialog() || document.querySelector('.pt-viewbmp')) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const k = e.key.toLowerCase(), c = e.ctrlKey || e.metaKey;
    const run = fn => { e.preventDefault(); fn(); };
    if (c) {
      const map = { z: undo, y: redo, x: cut, c: copy, v: paste, a: selectAll, s: () => save(), o: () => askSave().then(ok => ok && openDialog()), p: printDlg, e: attributes, i: () => xform(invert), r: flipDialog, f: viewBitmap, g: () => { if (S.zoom >= 4) { PREF.grid = !PREF.grid; layout(); } }, l: () => { PREF.colorbox = !PREF.colorbox; applyView(); }, pageup: () => setZoom(baseZoom()), pagedown: () => setZoom(4) };
      if (map[k]) return run(map[k]);
      return;
    }
    if (k === 'delete' && S.sel) return run(clearSel);
    if (k === 'escape') {
      if (S.act) return run(cancelOp);
      if (S.poly || S.curve) return run(() => { S.poly ? closePoly() : endCurve(); });
      if (S.sel) return run(() => { if (S.sel.lifted) commitSel(); else dropSel(); });
    }
    if (k === 'enter' && S.poly) return run(closePoly);
  });
  FR.bus.on('win-resize', w => { if (S && w === S.win && S.mob && S.zoom < 1) { S.zoom = baseZoom(); layout(); } });

  FR.apps.paint = paint;
})();
