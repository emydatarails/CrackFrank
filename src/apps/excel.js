/* Frank's Computer — "Microsoft Excel 2003" clone: formula engine, grid UI, Frank's workbooks */
(() => {
  window.FR = window.FR || {};
  const XL = (FR.xl = {});

  /* =====================================================================
     A1 helpers
     ===================================================================== */
  const colName = c => { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
  const colIdx = s => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  const a1 = (r, c) => colName(c) + (r + 1);
  const parseA1 = s => { const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(String(s).trim()); return m ? { r: +m[2] - 1, c: colIdx(m[1]) } : null; };
  const quoteSheet = n => (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(n) && !parseA1(n) ? n : "'" + n.replace(/'/g, "''") + "'") + '!';
  Object.assign(XL, { colName, colIdx, a1, parseA1 });

  /* =====================================================================
     Values & coercion
     ===================================================================== */
  class XErr { constructor(e) { this.e = e; } toString() { return this.e; } }
  const ERRC = {};
  const ERR = e => ERRC[e] || (ERRC[e] = new XErr(e));
  const isErr = v => v instanceof XErr;
  const ERRS = ['#REF!', '#DIV/0!', '#N/A', '#NAME?', '#VALUE!', '#NUM!', '#NULL!'];

  function parseNumText(t) {
    let s = String(t).replace(/\s/g, ''), neg = false, pct = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (s[0] === '-') { neg = !neg; s = s.slice(1); } else if (s[0] === '+') s = s.slice(1);
    if (s[0] === '$') s = s.slice(1);
    if (s.endsWith('%')) { pct = true; s = s.slice(0, -1); }
    if (!/\d/.test(s) || !/^(\d{1,3}(,\d{3})+|\d*)(\.\d*)?(e[+-]?\d+)?$/i.test(s)) return NaN;
    let v = parseFloat(s.replace(/,/g, ''));
    if (isNaN(v)) return NaN;
    if (pct) v /= 100;
    return neg ? -v : v;
  }
  function parseLiteral(raw) {
    if (raw == null || raw === '') return null;
    if (raw[0] === "'") return raw.slice(1);
    const t = raw.trim(), up = t.toUpperCase();
    if (up === 'TRUE') return true;
    if (up === 'FALSE') return false;
    if (ERRS.includes(up)) return ERR(up);
    const n = parseNumText(t);
    return isNaN(n) ? raw : n;
  }
  const genNum = v => {
    if (!isFinite(v)) return '#NUM!';
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
    return String(parseFloat(v.toPrecision(10)));
  };
  const toNum = v => {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (isErr(v)) return v;
    const n = parseNumText(v); return isNaN(n) ? ERR('#VALUE!') : n;
  };
  const toStr = v => (v == null ? '' : typeof v === 'number' ? genNum(v) : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v));
  const toBool = v => {
    if (v == null) return false;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (isErr(v)) return v;
    if (/^true$/i.test(v)) return true;
    if (/^false$/i.test(v)) return false;
    return ERR('#VALUE!');
  };
  function cmpv(a, b) {
    const z = o => (typeof o === 'string' ? '' : typeof o === 'boolean' ? false : 0);
    if (a == null) a = z(b);
    if (b == null) b = z(a);
    const rk = v => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2);
    const ra = rk(a), rb = rk(b);
    if (ra !== rb) return ra - rb;
    if (ra === 1) { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
    if (ra === 2) return (a ? 1 : 0) - (b ? 1 : 0);
    return Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b)) ? 0 : a < b ? -1 : 1;
  }

  /* =====================================================================
     Tokenizer / parser
     ===================================================================== */
  function tokenize(src) {
    const toks = [];
    let i = 0, m;
    while (i < src.length) {
      const ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      const start = i, rest = src.slice(i);
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(rest))) { toks.push({ t: 'num', v: parseFloat(m[0]), s: start, e: start + m[0].length }); i += m[0].length; continue; }
      if (ch === '"') {
        let j = i + 1, v = '';
        for (;;) {
          if (j >= src.length) throw new SyntaxError('unterminated string');
          if (src[j] === '"') { if (src[j + 1] === '"') { v += '"'; j += 2; continue; } break; }
          v += src[j++];
        }
        toks.push({ t: 'str', v, s: start, e: j + 1 }); i = j + 1; continue;
      }
      if (ch === '#') {
        const e = ERRS.find(x => rest.toUpperCase().startsWith(x));
        if (!e) throw new SyntaxError('bad error literal');
        toks.push({ t: 'err', v: e, s: start, e: start + e.length }); i += e.length; continue;
      }
      let sheet = null, j = i;
      if (ch === "'") {
        let k = i + 1, v = '';
        for (;;) {
          if (k >= src.length) throw new SyntaxError('bad sheet');
          if (src[k] === "'") { if (src[k + 1] === "'") { v += "'"; k += 2; continue; } break; }
          v += src[k++];
        }
        if (src[k + 1] !== '!') throw new SyntaxError('bad sheet ref');
        sheet = v; j = k + 2;
      } else if ((m = /^([A-Za-z_][A-Za-z0-9_.]*)!/.exec(rest))) { sheet = m[1]; j = i + m[0].length; }
      if (sheet !== null) {
        const r2 = src.slice(j);
        if (/^#REF!/i.test(r2)) { toks.push({ t: 'err', v: '#REF!', s: start, e: j + 5 }); i = j + 5; continue; }
        m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)/.exec(r2);
        if (!m) throw new SyntaxError('bad ref');
        toks.push({ t: 'ref', sheet, ca: !!m[1], c: colIdx(m[2]), ra: !!m[3], r: +m[4] - 1, s: start, ss: j, e: j + m[0].length });
        i = j + m[0].length; continue;
      }
      if ((m = /^(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_(])/.exec(rest))) {
        toks.push({ t: 'ref', sheet: null, ca: !!m[1], c: colIdx(m[2]), ra: !!m[3], r: +m[4] - 1, s: start, ss: start, e: start + m[0].length });
        i += m[0].length; continue;
      }
      if ((m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(rest))) {
        const nm = m[0];
        toks.push({ t: src[i + nm.length] === '(' ? 'fn' : 'name', v: nm.toUpperCase(), s: start, e: start + nm.length });
        i += nm.length; continue;
      }
      const two = src.substr(i, 2);
      if (two === '<=' || two === '>=' || two === '<>') { toks.push({ t: 'op', v: two, s: start, e: start + 2 }); i += 2; continue; }
      if ('+-*/^&=<>%'.includes(ch)) { toks.push({ t: 'op', v: ch, s: start, e: start + 1 }); i++; continue; }
      const simple = { '(': 'lp', ')': 'rp', ',': 'comma', ':': 'colon' }[ch];
      if (simple) { toks.push({ t: simple, s: start, e: start + 1 }); i++; continue; }
      throw new SyntaxError('unexpected ' + ch);
    }
    return toks;
  }

  function parse(src) {
    const toks = tokenize(src);
    let p = 0;
    const peek = () => toks[p], next = () => toks[p++];
    const isOp = v => peek() && peek().t === 'op' && peek().v === v;
    const expect = t => { const k = next(); if (!k || k.t !== t) throw new SyntaxError('expected ' + t); return k; };
    const CMP = ['=', '<>', '<', '>', '<=', '>='];
    function cmp() { let a = cat(); while (peek() && peek().t === 'op' && CMP.includes(peek().v)) { const op = next().v; a = { t: 'bin', op, a, b: cat() }; } return a; }
    function cat() { let a = add(); while (isOp('&')) { next(); a = { t: 'bin', op: '&', a, b: add() }; } return a; }
    function add() { let a = mul(); while (isOp('+') || isOp('-')) { const op = next().v; a = { t: 'bin', op, a, b: mul() }; } return a; }
    function mul() { let a = pw(); while (isOp('*') || isOp('/')) { const op = next().v; a = { t: 'bin', op, a, b: pw() }; } return a; }
    function pw() { let a = un(); while (isOp('^')) { next(); a = { t: 'bin', op: '^', a, b: un() }; } return a; }
    function un() { if (isOp('-')) { next(); return { t: 'neg', a: un() }; } if (isOp('+')) { next(); return un(); } return post(); }
    function post() { let a = prim(); while (isOp('%')) { next(); a = { t: 'pct', a }; } return a; }
    function prim() {
      const k = next();
      if (!k) throw new SyntaxError('unexpected end');
      switch (k.t) {
        case 'num': return { t: 'num', v: k.v };
        case 'str': return { t: 'str', v: k.v };
        case 'err': return { t: 'err', v: k.v };
        case 'ref':
          if (peek() && peek().t === 'colon') {
            next(); const k2 = expect('ref');
            return { t: 'range', sheet: k.sheet, r1: Math.min(k.r, k2.r), c1: Math.min(k.c, k2.c), r2: Math.max(k.r, k2.r), c2: Math.max(k.c, k2.c) };
          }
          return { t: 'ref', sheet: k.sheet, r: k.r, c: k.c };
        case 'fn': {
          expect('lp');
          const args = [];
          if (peek() && peek().t === 'rp') { next(); return { t: 'fn', name: k.v, args }; }
          for (;;) {
            if (peek() && (peek().t === 'comma' || peek().t === 'rp')) args.push({ t: 'blank' }); else args.push(cmp());
            const s = next();
            if (!s) throw new SyntaxError('unclosed (');
            if (s.t === 'rp') break;
            if (s.t !== 'comma') throw new SyntaxError('expected ,');
          }
          return { t: 'fn', name: k.v, args };
        }
        case 'name':
          if (k.v === 'TRUE' || k.v === 'FALSE') return { t: 'bool', v: k.v === 'TRUE' };
          return { t: 'name', v: k.v };
        case 'lp': { const e = cmp(); expect('rp'); return e; }
      }
      throw new SyntaxError('unexpected token');
    }
    const ast = cmp();
    if (p < toks.length) throw new SyntaxError('trailing input');
    return ast;
  }

  const refText = k => (k.ca ? '$' : '') + colName(k.c) + (k.ra ? '$' : '') + (k.r + 1);
  // Uppercases refs/functions, auto-closes parens. Throws SyntaxError on bad formula.
  function normFormula(text) {
    let body = text.slice(1);
    let depth = 0, inS = false, inQ = false;
    for (const ch of body) {
      if (ch === '"' && !inQ) inS = !inS;
      else if (ch === "'" && !inS) inQ = !inQ;
      else if (!inS && !inQ) { if (ch === '(') depth++; else if (ch === ')') depth--; }
    }
    if (inS) body += '"';
    if (depth > 0) body += ')'.repeat(depth);
    if (!body.trim()) throw new SyntaxError('empty');
    const toks = tokenize(body);
    parse(body);
    let out = body;
    for (let i = toks.length - 1; i >= 0; i--) {
      const k = toks[i];
      if (k.t === 'fn') out = out.slice(0, k.s) + k.v + out.slice(k.e);
      else if (k.t === 'ref') out = out.slice(0, k.ss) + refText(k) + out.slice(k.e);
      else if (k.t === 'name' && (k.v === 'TRUE' || k.v === 'FALSE')) out = out.slice(0, k.s) + k.v + out.slice(k.e);
    }
    return '=' + out;
  }
  // Relative-reference shift for copy/paste
  function shiftFormula(raw, dr, dc) {
    let body = raw.slice(1), toks;
    try { toks = tokenize(body); } catch (e) { return raw; }
    for (let i = toks.length - 1; i >= 0; i--) {
      const k = toks[i];
      if (k.t !== 'ref') continue;
      const nk = { ...k, r: k.ra ? k.r : k.r + dr, c: k.ca ? k.c : k.c + dc };
      if (nk.r < 0 || nk.c < 0) body = body.slice(0, k.s) + '#REF!' + body.slice(k.e);
      else body = body.slice(0, k.ss) + refText(nk) + body.slice(k.e);
    }
    return '=' + body;
  }
  Object.assign(XL, { tokenize, parse, normFormula, shiftFormula, parseLiteral, ERR, isErr });

  /* =====================================================================
     Functions
     ===================================================================== */
  function roundX(x, d, mode) {
    const m = Math.pow(10, d), y = parseFloat((Math.abs(x) * m).toPrecision(15));
    const r = mode === 'up' ? Math.ceil(y) : mode === 'down' ? Math.floor(y) : Math.round(y);
    return (Math.sign(x) || 1) * r / m;
  }
  function critFn(c) {
    if (typeof c === 'string') {
      const m = /^(<=|>=|<>|<|>|=)(.*)$/.exec(c);
      if (m) {
        const op = m[1], lit = parseLiteral(m[2]);
        return v => { const k = cmpv(v == null ? (typeof lit === 'number' ? null : '') : v, lit); if ((typeof v === 'number') !== (typeof lit === 'number') && op !== '<>' && op !== '=') return false; return { '=': k === 0, '<>': k !== 0, '<': k < 0, '>': k > 0, '<=': k <= 0, '>=': k >= 0 }[op]; };
      }
      const lit = parseLiteral(c);
      return v => v != null && cmpv(v, lit) === 0 && (typeof v === 'number') === (typeof lit === 'number');
    }
    return v => v != null && cmpv(v, c) === 0;
  }
  const FUNCS = {
    SUM(A, E) { const l = this.nums(A, E); return isErr(l) ? l : l.reduce((a, b) => a + b, 0); },
    AVERAGE(A, E) { const l = this.nums(A, E); if (isErr(l)) return l; return l.length ? l.reduce((a, b) => a + b, 0) / l.length : ERR('#DIV/0!'); },
    MIN(A, E) { const l = this.nums(A, E); return isErr(l) ? l : l.length ? Math.min(...l) : 0; },
    MAX(A, E) { const l = this.nums(A, E); return isErr(l) ? l : l.length ? Math.max(...l) : 0; },
    COUNT(A, E) { let n = 0; for (const a of A) { const v = E(a); if (v && v.rg) this.rv(v).flat().forEach(x => { if (typeof x === 'number') n++; }); else if (typeof v === 'number' || (a.t !== 'ref' && !isErr(v) && v != null && !isNaN(parseNumText(v)))) n++; } return n; },
    COUNTA(A, E) { let n = 0; for (const a of A) { const v = E(a); if (v && v.rg) this.rv(v).flat().forEach(x => { if (x != null && x !== '') n++; }); else if (v != null && a.t !== 'blank') n++; } return n; },
    COUNTBLANK(A, E) { const v = E(A[0]); if (!v || !v.rg) return ERR('#VALUE!'); return this.rv(v).flat().filter(x => x == null || x === '').length; },
    ROUND(A, E, S) { const x = toNum(S(A[0])), d = toNum(A[1] ? S(A[1]) : 0); if (isErr(x)) return x; if (isErr(d)) return d; return roundX(x, Math.trunc(d)); },
    ROUNDUP(A, E, S) { const x = toNum(S(A[0])), d = toNum(A[1] ? S(A[1]) : 0); if (isErr(x)) return x; if (isErr(d)) return d; return roundX(x, Math.trunc(d), 'up'); },
    ROUNDDOWN(A, E, S) { const x = toNum(S(A[0])), d = toNum(A[1] ? S(A[1]) : 0); if (isErr(x)) return x; if (isErr(d)) return d; return roundX(x, Math.trunc(d), 'down'); },
    ABS(A, E, S) { const x = toNum(S(A[0])); return isErr(x) ? x : Math.abs(x); },
    INT(A, E, S) { const x = toNum(S(A[0])); return isErr(x) ? x : Math.floor(x); },
    SQRT(A, E, S) { const x = toNum(S(A[0])); return isErr(x) ? x : x < 0 ? ERR('#NUM!') : Math.sqrt(x); },
    MOD(A, E, S) { const x = toNum(S(A[0])), y = toNum(S(A[1])); if (isErr(x)) return x; if (isErr(y)) return y; return y === 0 ? ERR('#DIV/0!') : x - y * Math.floor(x / y); },
    POWER(A, E, S) { const x = toNum(S(A[0])), y = toNum(S(A[1])); if (isErr(x)) return x; if (isErr(y)) return y; return Math.pow(x, y); },
    PI() { return Math.PI; },
    NA() { return ERR('#N/A'); },
    IF(A, E, S) {
      if (!A.length) return ERR('#VALUE!');
      const c = toBool(S(A[0]));
      if (isErr(c)) return c;
      if (c) return A.length > 1 ? (A[1].t === 'blank' ? 0 : S(A[1])) : true;
      return A.length > 2 ? (A[2].t === 'blank' ? 0 : S(A[2])) : false;
    },
    IFERROR(A, E, S) { const v = S(A[0]); return isErr(v) ? (A[1] ? S(A[1]) : 0) : v; },
    ISERROR(A, E, S) { return isErr(S(A[0])); },
    ISNUMBER(A, E, S) { return typeof S(A[0]) === 'number'; },
    ISTEXT(A, E, S) { return typeof S(A[0]) === 'string'; },
    ISBLANK(A, E, S) { const v = S(A[0]); return v == null; },
    AND(A, E) { let r = true; for (const a of A) { const v = E(a); const l = v && v.rg ? this.rv(v).flat().filter(x => x != null) : [v]; for (const x of l) { const b = toBool(x); if (isErr(b)) return b; r = r && b; } } return r; },
    OR(A, E) { let r = false; for (const a of A) { const v = E(a); const l = v && v.rg ? this.rv(v).flat().filter(x => x != null) : [v]; for (const x of l) { const b = toBool(x); if (isErr(b)) return b; r = r || b; } } return r; },
    NOT(A, E, S) { const b = toBool(S(A[0])); return isErr(b) ? b : !b; },
    SUMPRODUCT(A, E) {
      const arrs = A.map(a => { const v = E(a); return v && v.rg ? this.rv(v) : [[v]]; });
      if (!arrs.length) return ERR('#VALUE!');
      const R = arrs[0].length, C = arrs[0][0].length;
      if (arrs.some(x => x.length !== R || x[0].length !== C)) return ERR('#VALUE!');
      let s = 0;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        let p = 1;
        for (const x of arrs) { const v = x[r][c]; if (isErr(v)) return v; p *= typeof v === 'number' ? v : 0; }
        s += p;
      }
      return s;
    },
    INDEX(A, E, S) {
      const v = E(A[0]);
      let r = A[1] ? toNum(S(A[1])) : 1, c = A[2] ? toNum(S(A[2])) : 1;
      if (isErr(r)) return r; if (isErr(c)) return c;
      if (!v || !v.rg) return r <= 1 && c <= 1 ? v : ERR('#REF!');
      const R = v.r2 - v.r1 + 1, C = v.c2 - v.c1 + 1;
      if (A.length === 2 && R === 1) { c = r; r = 1; }
      if (r < 1 || c < 1 || r > R || c > C) return ERR('#REF!');
      return this.get(v.si, v.r1 + r - 1, v.c1 + c - 1);
    },
    MATCH(A, E, S) {
      const val = S(A[0]); if (isErr(val)) return val;
      const v = E(A[1]); if (!v || !v.rg) return ERR('#N/A');
      const l = this.rv(v).flat();
      const type = A[2] ? toNum(S(A[2])) : 1;
      if (type === 0) { const i = l.findIndex(x => x != null && typeof x === typeof val && cmpv(x, val) === 0); return i < 0 ? ERR('#N/A') : i + 1; }
      let best = -1;
      l.forEach((x, i) => { if (x == null || typeof x !== typeof val) return; const k = cmpv(x, val); if (type > 0 ? k <= 0 : k >= 0) best = i; });
      return best < 0 ? ERR('#N/A') : best + 1;
    },
    VLOOKUP(A, E, S) {
      const val = S(A[0]); if (isErr(val)) return val;
      const v = E(A[1]); if (!v || !v.rg) return ERR('#N/A');
      const col = toNum(S(A[2])); if (isErr(col)) return col;
      const approx = A[3] ? toBool(S(A[3])) : true;
      if (col < 1 || col > v.c2 - v.c1 + 1) return ERR('#REF!');
      let hit = -1;
      for (let r = v.r1; r <= v.r2; r++) {
        const x = this.get(v.si, r, v.c1);
        if (x == null || typeof x !== typeof val) continue;
        const k = cmpv(x, val);
        if (!approx) { if (k === 0) { hit = r; break; } } else if (k <= 0) hit = r; else break;
      }
      return hit < 0 ? ERR('#N/A') : this.get(v.si, hit, v.c1 + col - 1);
    },
    SUMIF(A, E, S) {
      const rg = E(A[0]); if (!rg || !rg.rg) return ERR('#VALUE!');
      const f = critFn(S(A[1]));
      const sr = A[2] ? E(A[2]) : rg; if (!sr || !sr.rg) return ERR('#VALUE!');
      let s = 0;
      for (let r = 0; r <= rg.r2 - rg.r1; r++) for (let c = 0; c <= rg.c2 - rg.c1; c++) {
        if (f(this.get(rg.si, rg.r1 + r, rg.c1 + c))) { const x = this.get(sr.si, sr.r1 + r, sr.c1 + c); if (typeof x === 'number') s += x; }
      }
      return s;
    },
    COUNTIF(A, E, S) { const rg = E(A[0]); if (!rg || !rg.rg) return ERR('#VALUE!'); const f = critFn(S(A[1])); return this.rv(rg).flat().filter(f).length; },
    CONCATENATE(A, E, S) { let s = ''; for (const a of A) { const v = S(a); if (isErr(v)) return v; s += toStr(v); } return s; },
    CONCAT(A, E) { let s = ''; for (const a of A) { const v = E(a); if (v && v.rg) { for (const x of this.rv(v).flat()) { if (isErr(x)) return x; s += toStr(x); } continue; } if (isErr(v)) return v; s += toStr(v); } return s; },
    LEN(A, E, S) { const v = S(A[0]); return isErr(v) ? v : toStr(v).length; },
    UPPER(A, E, S) { const v = S(A[0]); return isErr(v) ? v : toStr(v).toUpperCase(); },
    LOWER(A, E, S) { const v = S(A[0]); return isErr(v) ? v : toStr(v).toLowerCase(); },
    TRIM(A, E, S) { const v = S(A[0]); return isErr(v) ? v : toStr(v).trim().replace(/\s+/g, ' '); },
    LEFT(A, E, S) { const v = S(A[0]), n = A[1] ? toNum(S(A[1])) : 1; return isErr(v) ? v : toStr(v).slice(0, n); },
    RIGHT(A, E, S) { const v = S(A[0]), n = A[1] ? toNum(S(A[1])) : 1; return isErr(v) ? v : n ? toStr(v).slice(-n) : ''; },
  };

  /* =====================================================================
     Workbook model
     ===================================================================== */
  class Book {
    constructor(name, sheets) { this.name = name; this.sheets = sheets; this.cache = new Map(); this.stack = new Set(); this.circ = false; }
    idx(name) { if (name == null) return -1; const n = String(name).toLowerCase(); return this.sheets.findIndex(s => s.name.toLowerCase() === n); }
    cell(si, r, c) { return this.sheets[si].cells[r + ',' + c]; }
    raw(si, r, c) { const x = this.cell(si, r, c); return x && x.raw != null ? x.raw : ''; }
    setRaw(si, r, c, raw) {
      const cells = this.sheets[si].cells, k = r + ',' + c;
      let x = cells[k];
      if (!x) { if (raw === '' || raw == null) return; x = cells[k] = { raw: '' }; }
      x.raw = raw == null ? '' : String(raw); delete x.ast; delete x.lit;
      this.recalc();
    }
    recalc() { this.cache.clear(); this.circ = false; }
    get(si, r, c) {
      const k = si + '!' + r + ',' + c;
      if (this.cache.has(k)) return this.cache.get(k);
      const cl = this.sheets[si] && this.sheets[si].cells[r + ',' + c];
      if (!cl || cl.raw == null || cl.raw === '') return null;
      let v;
      if (cl.raw[0] === '=' && cl.raw.length > 1) {
        if (this.stack.has(k)) { this.circ = true; return 0; }
        this.stack.add(k);
        try {
          if (cl.ast === undefined) { try { cl.ast = parse(cl.raw.slice(1)); } catch (e) { cl.ast = null; } }
          v = cl.ast ? this.ev(cl.ast, si) : ERR('#NAME?');
          if (v && v.rg) v = v.r1 === v.r2 && v.c1 === v.c2 ? this.get(v.si, v.r1, v.c1) : ERR('#VALUE!');
          if (v == null) v = 0;
          if (typeof v === 'number' && !isFinite(v)) v = ERR('#NUM!');
        } finally { this.stack.delete(k); }
      } else {
        if (!('lit' in cl)) cl.lit = parseLiteral(cl.raw);
        v = cl.lit;
      }
      this.cache.set(k, v);
      return v;
    }
    rv(rg) {
      const out = [];
      for (let r = rg.r1; r <= rg.r2; r++) { const row = []; for (let c = rg.c1; c <= rg.c2; c++) row.push(this.get(rg.si, r, c)); out.push(row); }
      return out;
    }
    nums(A, E) {
      const out = [];
      for (const a of A) {
        if (a.t === 'blank') continue;
        const v = E(a);
        if (v && v.rg) { for (const row of this.rv(v)) for (const x of row) { if (isErr(x)) return x; if (typeof x === 'number') out.push(x); } continue; }
        if (isErr(v)) return v;
        if (v == null) continue;
        if (a.t === 'ref') { if (typeof v === 'number') out.push(v); continue; }
        const x = toNum(v); if (isErr(x)) return x; out.push(x);
      }
      return out;
    }
    ev(n, si) {
      switch (n.t) {
        case 'num': case 'str': case 'bool': return n.v;
        case 'err': return ERR(n.v);
        case 'blank': return null;
        case 'name': return ERR('#NAME?');
        case 'ref': { const s = n.sheet == null ? si : this.idx(n.sheet); if (s < 0) return ERR('#REF!'); return this.get(s, n.r, n.c); }
        case 'range': { const s = n.sheet == null ? si : this.idx(n.sheet); if (s < 0) return ERR('#REF!'); return { rg: true, si: s, r1: n.r1, c1: n.c1, r2: n.r2, c2: n.c2 }; }
        case 'neg': { const a = toNum(this.sc(n.a, si)); return isErr(a) ? a : -a; }
        case 'pct': { const a = toNum(this.sc(n.a, si)); return isErr(a) ? a : a / 100; }
        case 'bin': return this.bin(n, si);
        case 'fn': {
          const F = FUNCS[n.name];
          if (!F) return ERR('#NAME?');
          return F.call(this, n.args, x => this.ev(x, si), x => this.sc(x, si));
        }
      }
      return ERR('#VALUE!');
    }
    sc(n, si) { const v = this.ev(n, si); if (v && v.rg) return v.r1 === v.r2 && v.c1 === v.c2 ? this.get(v.si, v.r1, v.c1) : ERR('#VALUE!'); return v; }
    bin(n, si) {
      const a = this.sc(n.a, si), b = this.sc(n.b, si);
      if (n.op === '&') { if (isErr(a)) return a; if (isErr(b)) return b; return toStr(a) + toStr(b); }
      if (['=', '<>', '<', '>', '<=', '>='].includes(n.op)) {
        if (isErr(a)) return a; if (isErr(b)) return b;
        const k = cmpv(a, b);
        return { '=': k === 0, '<>': k !== 0, '<': k < 0, '>': k > 0, '<=': k <= 0, '>=': k >= 0 }[n.op];
      }
      const x = toNum(a); if (isErr(x)) return x;
      const y = toNum(b); if (isErr(y)) return y;
      switch (n.op) {
        case '+': return x + y;
        case '-': return x - y;
        case '*': return x * y;
        case '/': return y === 0 ? ERR('#DIV/0!') : x / y;
        case '^': { const p = Math.pow(x, y); return isFinite(p) ? p : ERR('#NUM!'); }
      }
      return ERR('#VALUE!');
    }
    // convenience: value by 'Sheet'!A1 style address
    val(sheetName, addr) { const si = this.idx(sheetName), p = parseA1(addr); return this.get(si, p.r, p.c); }
  }
  XL.Book = Book;

  /* =====================================================================
     Sheet builder DSL (used by the workbook definitions)
     ===================================================================== */
  function sheet(name, opts = {}) {
    const sh = { name, cells: {}, colW: {}, rowH: {}, cond: [], shapes: [], charts: [], nr: opts.nr || 0, nc: opts.nc || 0, gridlines: opts.gridlines !== false, tabColor: opts.tabColor };
    const at = ref => (typeof ref === 'string' ? parseA1(ref) : ref);
    const api = {
      sh,
      w(map) { for (const k in map) sh.colW[colIdx(k)] = map[k]; return api; },
      h(row, px) { sh.rowH[row - 1] = px; return api; },
      set(ref, raw, s, cm) {
        const p = at(ref); const k = p.r + ',' + p.c;
        const x = sh.cells[k] || (sh.cells[k] = { raw: '' });
        if (raw !== undefined && raw !== null) x.raw = String(raw);
        if (s) x.s = Object.assign({}, x.s || {}, s);
        if (cm) x.cm = cm;
        return api;
      },
      // row('A5', [v1, v2, ...], style) — fills rightwards; null skips a cell
      row(ref, vals, s) { const p = at(ref); vals.forEach((v, i) => { if (v !== null && v !== undefined) api.set({ r: p.r, c: p.c + i }, v, s); }); return api; },
      style(range, s) {
        const [x, y] = range.split(':'); const p = at(x), q = at(y || x);
        for (let r = p.r; r <= q.r; r++) for (let c = p.c; c <= q.c; c++) { const k = r + ',' + c; const cl = sh.cells[k] || (sh.cells[k] = { raw: '' }); cl.s = Object.assign({}, cl.s || {}, s); }
        return api;
      },
      cm(ref, author, text) { const p = at(ref); const k = p.r + ',' + p.c; (sh.cells[k] || (sh.cells[k] = { raw: '' })).cm = { a: author, t: text }; return api; },
      cond(range, test, s) { const [x, y] = range.split(':'); const p = at(x), q = at(y || x); sh.cond.push({ r1: p.r, c1: p.c, r2: q.r, c2: q.c, test, s }); return api; },
      shape(o) { const p = at(o.at); sh.shapes.push(Object.assign({ r: p.r, c: p.c, dx: 0, dy: 0 }, o)); return api; },
      chart(o) { const p = at(o.at); sh.charts.push(Object.assign({ r: p.r, c: p.c, dx: 0, dy: 0 }, o)); return api; },
    };
    return api;
  }
  XL.sheet = sheet;

  /* ---------- style presets (FP&A conventions: blue = hardcode, black = formula, green = link) ---------- */
  const BLUE = '#0000FF', GREEN = '#008000', GREY = '#808080', RED = '#FF0000';
  const ST = {
    title: { b: 1, fs: 12 },
    sub: { b: 1 },
    unit: { i: 1 },
    stamp: { i: 1, fc: GREY },
    hdr: { b: 1, al: 'c', bg: '#C0C0C0', bb: 't' },
    hdrL: { b: 1, bg: '#C0C0C0', bb: 't' },
    inp: { fc: BLUE, f: 'n0' },
    calc: { f: 'n0' },
    link: { fc: GREEN, f: 'n0' },
    tot: { b: 1, f: 'n0', bt: 't' },
    grand: { b: 1, f: 'n0', bt: 't', bb: 'd' },
    note: { i: 1, fc: GREY },
    red: { b: 1, fc: RED },
    sec: { b: 1, u: 1 },
    chk: { f: 'n0', fc: GREY, i: 1 },
    input: { fc: BLUE, bg: '#FFFFCC', f: 'n0' },
  };
  const M = (...a) => Object.assign({}, ...a);
  const FRANK = 'Frank Warmington', DIANE = 'Diane Kessler';

  /* ---------- quarter split: largest remainder so quarters foot exactly ---------- */
  function split(total, w) {
    const sw = w.reduce((a, b) => a + b, 0), raw = w.map(x => (total * x) / sw), fl = raw.map(Math.floor);
    const rem = Math.round(total - fl.reduce((a, b) => a + b, 0));
    raw.map((x, i) => [x - fl[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, rem).forEach(([, i]) => fl[i]++);
    return fl;
  }
  XL.split = split;
  const QREV = [23, 25, 26, 26], QFLAT = [25, 25, 25, 25];

  /* =====================================================================
     Workbook definitions
     ===================================================================== */
  const VERS = {
    bud_v3: { stamp: 'Version 3 — DRAFT', badge: 'DRAFT', rev: 39500, cogs: 30810, prod: 78, stale: 1, whse: true, saved: '9/14/2026 4:12 PM',
      hint: 'pw for board copy? ask me. —F' },
    bud_v4: { stamp: 'Version 4 — FINAL', badge: 'FINAL', rev: 40000, cogs: 30760, prod: 84, whse: true, saved: '9/21/2026 9:40 AM',
      hint: 'Board copy pw = SUM(year we incorporated, headcount) —F' },
    bud_v5ff: { stamp: 'Version 5 — FINAL FINAL', badge: 'FINAL FINAL', rev: 40000, cogs: 31200, prod: 84, whse: false, saved: '10/2/2026 6:55 PM',
      hint: 'Board copy pw = year the current plant was built —F' },
    bud_v5ut: { stamp: 'Version 5 — FINAL — USE THIS ONE', badge: 'USE THIS', rev: 40000, cogs: 31200, prod: 84, whse: true, saved: '10/5/2026 11:58 PM',
      hint: "PW = SUM(Walter's seed money, the year we first got ISO certified). About Us + Quality & Safety. Digits only. —F" },
    bud_v6: { stamp: "Version 6 — DK review copy (Diane's comments)", badge: 'DK REVIEW', rev: 40000, cogs: 31440, prod: 84, whse: true, saved: '10/4/2026 2:20 PM', savedBy: 'Diane Kessler', diane: true,
      hint: 'pw = CONCAT("packa", founding year) —F' },
  };
  const LOG = [
    ['09/08/2026', 'v1', "Skeleton off FY26 actuals + 4% (Drew's \"gut feel\")."],
    ['09/10/2026', 'v2', "Tom's bottoms-up revenue build. File got corrupted. Don't ask."],
    ['09/14/2026', 'v3', 'Revenue 39,500 (haircut Tom 1.25%). Production heads = 78 (before 2nd shift).'],
    ['09/21/2026', 'v4', 'Revenue to 40,000 per Diane. 2nd shift in (+6 Production). COGS = Karen std cost roll v1.'],
    ['10/02/2026', 'v5 FINAL FINAL', "COGS = Karen std cost roll v2 (mill price increase). Took whse lease out per Drew (\"it's basically free space\")."],
    ['10/04/2026', 'v6 DK', "Diane's review copy — her comments inside. Freight surcharge added to COGS (+240). NOT final."],
    ['10/05/2026', 'v5 USE THIS', "Same as v5 FINAL FINAL, plus the warehouse lease back in (Diane: \"Drew is wrong\"). Diane's v6 comments addressed. This is the one. Sleep."],
  ];
  const LOGUPTO = { bud_v3: 3, bud_v4: 4, bud_v5ff: 5, bud_v6: 6, bud_v5ut: 7 };

  function plSheet(cfg, board) {
    const S = sheet('P&L Summary', { nc: 14, nr: 40 });
    S.w({ A: 200, B: 16, C: 78, D: 14, E: 68, F: 68, G: 68, H: 68, I: 50, J: 14, K: 250 });
    S.h(1, 20);
    S.set('A1', 'Packa Corporation — FY2027 Operating Budget', ST.title, { a: FRANK, t: cfg.hint });
    if (cfg.badge) S.set('K1', cfg.badge, ST.red);
    S.set('A2', 'P&L Summary — ' + cfg.stamp, ST.sub);
    S.set('A3', '($ in thousands)', ST.unit);
    S.set('K2', 'Last saved by ' + (cfg.savedBy || 'Frank Warmington') + ' ' + cfg.saved, ST.stamp);
    S.row('A4', ['', '', 'FY2027', '', 'Q1', 'Q2', 'Q3', 'Q4', 'Check', '', 'Notes'], ST.hdr);
    S.style('A4', { al: 'l' }); S.style('K4', { al: 'l' });
    S.style('B4:J4', { bg: '#C0C0C0' });
    const Qc = ['E', 'F', 'G', 'H'];
    const hardRow = (row, label, fy, weights, style, noteText, fyRaw) => {
      S.set('A' + row, label, style && style.lab);
      S.set('C' + row, fyRaw != null ? fyRaw : fy, style ? style.fy : ST.inp);
      split(fy, weights).forEach((q, i) => S.set(Qc[i] + row, q, ST.inp));
      if (noteText) S.set('K' + row, noteText, ST.note);
    };
    const fRow = (row, label, f, s, labS) => {
      S.set('A' + row, label, labS || {});
      ['C', ...Qc].forEach(c => S.set(c + row, '=' + f(c), s || ST.calc));
    };
    hardRow(5, 'Revenue', cfg.rev, QREV, null, "Tom's number. Tom is an optimist.");
    hardRow(6, 'Cost of goods sold', cfg.cogs, QREV, null, 'Karen std cost roll (mill $/ton baked in)');
    fRow(7, 'Gross profit', c => `${c}5-${c}6`, ST.tot, { b: 1 });
    fRow(8, 'Gross margin %', c => `${c}7/${c}5`, { f: 'p1', i: 1 }, { i: 1, ind: 1 });
    const rent = cfg.whse ? 420 : 180;
    const opx = [[9, 'SG&A', 4850, 16], [10, 'Rent & leases', rent, 21], [11, 'Other opex', 400, 29]];
    opx.forEach(([row, label, v, odRow]) => {
      if (board) hardRow(row, label, v, QFLAT, null);
      else hardRow(row, label, v, QFLAT, { fy: ST.link, lab: {} }, null, `='Opex Detail'!C${odRow}`);
      S.style('A' + row, { ind: 1 });
    });
    S.set('K9', board ? 'from v5 USE THIS (Opex Detail tab not copied)' : "links to Opex Detail tab — don't hardcode, Drew", ST.note);
    if (board) {
      const fixed = FR.puzzle && FR.puzzle.isSolved && FR.puzzle.isSolved('ebitda');
      fRow(12, 'EBITDA', c => (fixed ? `${c}7-${c}9-${c}10-${c}11` : `${c}7-${c}9-${c}10-#REF!`), ST.tot, { b: 1 });
      S.style('C12', { bg: '#FFFF99' });
      S.cm('C12', FRANK, 'Broke this at 3 AM. Fix the ROW, not the cell. Before the Board sees it.');
    } else fRow(12, 'EBITDA', c => `${c}7-${c}9-${c}10-${c}11`, ST.tot, { b: 1 });
    hardRow(13, 'Depreciation & amortization', 900, QFLAT, null, "Karen's fixed asset register (straight-line)");
    fRow(14, 'EBIT', c => `${c}12-${c}13`, ST.tot, { b: 1 });
    S.set('A15', 'Interest expense');
    S.set('C15', '=SUM(E15:H15)', ST.calc);
    Qc.forEach((c, i) => S.set(c + '15', `=ROUND(${c}30*$C$31/4,1)`, ST.calc));
    S.set('K15', 'Term Loan A — 7.50% on opening balance; 1,750/yr amortizes 437.5/qtr (145.8/month, see memo)', ST.note);
    fRow(16, 'Pre-tax income (EBT)', c => `${c}14-${c}15`, ST.calc);
    fRow(17, 'Income taxes', c => `${c}16*$C$21`, ST.calc);
    S.set('K17', '25% blended fed + MO. Ask the tax guy (again).', ST.note);
    fRow(18, 'Net income', c => `${c}16-${c}17`, ST.grand, { b: 1 });
    [5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].forEach(r => S.set('I' + r, `=SUM(E${r}:H${r})-C${r}`, ST.chk));
    S.set('A20', 'Memo:', { i: 1 });
    S.set('A21', 'Effective tax rate', { ind: 1 });
    S.set('C21', 0.25, { fc: BLUE, f: 'p1' });
    S.set('A29', 'Term Loan A — opening balance by quarter', { ind: 1 });
    S.set('E29', "'Q1", ST.hdr); S.set('F29', "'Q2", ST.hdr); S.set('G29', "'Q3", ST.hdr); S.set('H29', "'Q4", ST.hdr);
    S.set('A30', 'Opening balance', { ind: 2 }); S.set('E30', 6000, M(ST.inp, { f: 'n1' })); ['F', 'G', 'H'].forEach((c, i) => S.set(c + '30', `=${Qc[i]}30-$C$32/4`, M(ST.calc, { f: 'n1' })));
    S.set('A31', 'Fixed rate', { ind: 2 }); S.set('C31', 0.075, { fc: BLUE, f: 'p2' });
    S.set('A32', 'Scheduled principal / yr', { ind: 2 }); S.set('C32', 1750, ST.inp);
    S.set('K30', 'Prairie Ledger Bank TLA schedule — opening balance per Sep-26 debt schedule; Q4-26 payments assumed refinanced into the new facility', ST.note);
    S.set('A23', 'Checks', ST.sec);
    S.set('A24', 'Quarters foot to FY (all lines)', { ind: 1 });
    S.set('C24', '=IF(ABS(SUM(I5:I18))<0.5,"OK","ERROR")', { b: 1, al: 'r', fc: GREEN });
    if (!board) {
      S.set('A25', 'Opex ties to Opex Detail tab', { ind: 1 });
      S.set('C25', "=IF(ABS(C9+C10+C11-'Opex Detail'!C31)<0.5,\"OK\",\"ERROR\")", { b: 1, al: 'r', fc: GREEN });
    }
    S.cond('C24:C25', v => v === 'ERROR' || XL.isErr(v), { fc: RED, bg: '#FFC7CE' });
    S.set('A26', 'Hardcodes in blue, formulas in black, links in green. Yes, Drew, it matters.', ST.note);
    if (cfg.diane) {
      S.cm('C6', DIANE, 'COGS is up 240 vs. v5. Why?? The freight surcharge does not belong in this version. —DK');
      S.cm('C8', DIANE, "Where's the 22% margin I promised the bank??");
      S.cm('C10', DIANE, 'Lease is in. Good. Tell Drew.');
      S.set('K6', 'DK: see comment', M(ST.note, { fc: '#993300' }));
    }
    return S.sh;
  }
  function hcSheet(cfg, board) {
    const S = sheet('Headcount', { nc: 10, nr: 30 });
    S.w({ A: 170, B: 60, C: 90, D: 80, E: 14, F: 280 });
    S.h(1, 20);
    S.set('A1', 'Packa Corporation — FY2027 Headcount Plan', ST.title);
    S.set('A2', board ? 'BOARD COPY' : cfg.stamp, ST.sub);
    S.set('A3', '(heads = FTEs at year-end; loaded cost $ in thousands)', ST.unit);
    S.row('A5', ['Department', 'Heads', 'Avg loaded cost', 'Total cost', '', 'Notes'], ST.hdr);
    S.style('A5', { al: 'l' }); S.style('F5', { al: 'l' });
    // hourly (Production, Warehouse) all-in ≈ 52/head → 98 × 52 = 5,096 = Rachel's 196 × 26; salaried (20 heads) ≈ 2,700, paid monthly
    const rows = [['Production', cfg.prod, 52], ['Warehouse & Shipping', 14, 52], ['Sales', 6, 120], ['Finance & Admin', 9, 95], ['Management', 5, 225]];
    rows.forEach(([d, h, c], i) => {
      const r = 6 + i;
      S.set('A' + r, d); S.set('B' + r, h, M(ST.inp, { f: 'n0' })); S.set('C' + r, c, M(ST.inp, { f: 'n1' })); S.set('D' + r, `=B${r}*C${r}`, ST.calc);
    });
    S.set('A11', 'Total', { b: 1 });
    S.set('B11', '=SUM(B6:B10)', ST.tot); S.set('C11', '=D11/B11', M(ST.tot, { f: 'n1' })); S.set('D11', '=SUM(D6:D10)', ST.tot);
    S.style('A11', { bt: 't' });
    S.set('F6', cfg.prod === 78 ? 'old HC — before Karen\'s 2nd-shift hires in Sept (+6). STALE.' : 'incl. Karen\'s 2nd-shift hires (Sept 2026) — matches payroll today', ST.note);
    S.set('F7', 'hourly, paid bi-weekly with Production', ST.note);
    S.set('F8', 'salaried, monthly; loaded cost incl. commissions', ST.note);
    S.set('F10', 'Steve, Diane, Drew, Karen, Tom (Tom counted in Mgmt, not Sales!)', ST.note);
    S.set('A13', "Source: Rachel's HRIS export" + (cfg.prod === 78 ? ' (Aug — pre 2nd shift)' : ' (Oct)') + ". Excludes temps & the December peak crew.", ST.note);
    S.set('A14', 'Salaries sit in COGS (Production, Whse) and SG&A (everyone else) — memo only, not linked.', ST.note);
    S.set('A15', "Avg loaded cost incl. employer taxes, benefits, overtime and bonus accrual. Rachel's $196K bi-weekly run is the ALL-IN payroll cash for the hourly plant & warehouse crew; salaried staff (sales, finance & admin, management) are paid monthly.", ST.note);
    S.set('A17', 'Reconciliation to payroll', ST.sec);
    const run = cfg.prod === 78 ? 184 : 196;
    S.set('A18', 'Hourly payroll run, bi-weekly (all-in — plant & warehouse)', { ind: 1 }); S.set('B18', run, ST.inp); S.set('C18', '× 26 runs', ST.note); S.set('D18', '=B18*26', ST.calc);
    S.set('F18', cfg.prod === 78 ? "Rachel's Aug run — 92 hourly heads, before the 2nd shift" : "Rachel's Oct run — 98 hourly heads (both shifts). =B6+B7", ST.note);
    S.set('A19', 'Salaried payroll & benefits (monthly)', { ind: 1 }); S.set('D19', '=D11-D18', ST.calc); S.set('F19', '≈ 2,700/yr — 20 heads (Sales, F&A, Mgmt), ≈ 225/month. Same line in the 13-week.', ST.note);
    S.set('A20', 'Total loaded cost', { b: 1 }); S.set('D20', '=D18+D19', ST.tot);
    S.set('A21', 'Check: salaried line = D8:D10', { ind: 1, i: 1 }); S.set('D21', '=IF(ABS(D19-SUM(D8:D10))<0.5,"OK","ERROR")', { b: 1, al: 'r', fc: GREEN });
    S.cond('D21', v => v === 'ERROR' || XL.isErr(v), { fc: RED, bg: '#FFC7CE' });
    if (cfg.diane) S.cm('B11', DIANE, 'Karen confirms 2nd shift is on payroll since Sept. 118. Matches the website. Good.');
    return S.sh;
  }
  function opexSheet(cfg) {
    const S = sheet('Opex Detail', { nc: 10, nr: 40 });
    S.w({ A: 240, B: 16, C: 78, D: 14, E: 300 });
    S.h(1, 20);
    S.set('A1', 'Packa Corporation — FY2027 Operating Expense Detail', ST.title);
    S.set('A2', cfg.stamp, ST.sub);
    S.set('A3', '($ in thousands)', ST.unit);
    S.row('A5', ['Line item', '', 'FY2027', '', 'Notes'], ST.hdr);
    S.style('A5', { al: 'l' }); S.style('E5', { al: 'l' });
    S.set('A6', 'Selling, general & administrative', ST.sub);
    const sga = [['Salaries & wages (non-production)', 2610, 'does NOT tie to Headcount (2,700 loaded) — merit + temps. Ask Rachel.'], ['Benefits & payroll taxes', 640], ['Sales commissions', 380, '3.5% on Tom\'s bookings (capped)'], ['Travel & entertainment', 145, 'trade show in Chicago + Tom\'s steak dinners'], ['IT & software', 210, "ERP maint + Office. NO new software (Drew). Kristians says otherwise."], ['Professional fees (audit, legal)', 285], ['Insurance', 260], ['Marketing & trade shows', 120], ['Office & other G&A', 200]];
    sga.forEach(([l, v, n], i) => { const r = 7 + i; S.set('A' + r, l, { ind: 1 }); S.set('C' + r, v, ST.inp); if (n) S.set('E' + r, n, ST.note); });
    S.set('A16', 'Total SG&A', { b: 1 }); S.set('C16', '=SUM(C7:C15)', ST.tot);
    S.set('A18', 'Rent & leases', ST.sub);
    S.set('A19', 'Plant lease — 1420 E 3rd St', { ind: 1 }); S.set('C19', 180, ST.inp); S.set('E19', 'main plant + offices (the 1993 building) — Packa family trust lease, below market, renews 2031', ST.note);
    if (cfg.whse) { S.set('A20', 'Warehouse lease (2024 expansion)', { ind: 1 }); S.set('C20', '=40000*6/1000', ST.calc); S.set('E20', '40,000 sq ft @ $6.00 / sq ft / yr', ST.note); }
    S.set('A21', 'Total rent & leases', { b: 1 }); S.set('C21', '=SUM(C19:C20)', ST.tot);
    S.set('A23', 'Other operating expenses', ST.sub);
    const oth = [['Bank fees & charges', 45], ['Bad debt provision', 120, '0.3% of revenue, rounded'], ['Dues, subscriptions & training', 60], ['Recruiting', 55], ['Misc / contingency', 120, 'the "Drew fund"']];
    oth.forEach(([l, v, n], i) => { const r = 24 + i; S.set('A' + r, l, { ind: 1 }); S.set('C' + r, v, ST.inp); if (n) S.set('E' + r, n, ST.note); });
    S.set('A29', 'Total other opex', { b: 1 }); S.set('C29', '=SUM(C24:C28)', ST.tot);
    S.set('A31', 'Total operating expenses', { b: 1 }); S.set('C31', '=C16+C21+C29', ST.grand);
    return S.sh;
  }
  function notesSheet(id, cfg) {
    const S = sheet('Notes', { nc: 8, nr: 36 });
    S.w({ A: 86, B: 110, C: 640 });
    S.h(1, 20);
    S.set('A1', 'Notes & change log', ST.title);
    S.set('A2', cfg.stamp, ST.stamp);
    S.row('A4', ['Date', 'Version', 'What changed'], ST.hdrL);
    const n = LOGUPTO[id];
    LOG.slice(0, n).forEach(([d, v, t], i) => { S.set('A' + (5 + i), "'" + d); S.set('B' + (5 + i), v); S.set('C' + (5 + i), t); });
    let r = 5 + n + 1;
    S.set('A' + r, 'Board copy:', { b: 1 }); S.set('C' + r, cfg.hint, { fc: '#993300' }); r += 2;
    S.set('A' + r, 'To do:', { b: 1 }); r++;
    ['send Diane the final (WHICH one, Frank)', 'password the Board copy so Drew stops "fixing" it', 'rename these files like an adult', 'ask Rachel for payroll #s for the 13-week', 'look at that FinanceOS email?? (no.)'].forEach(t => { S.set('C' + r, '☐ ' + t); r++; });
    S.set('A' + (r + 1), 'Added a Gross margin % row because Diane asked "what\'s the margin" four times in one meeting. —F', ST.note);
    return S.sh;
  }
  function budgetBook(id) {
    const cfg = VERS[id];
    return new Book(FR.fs && FR.fs.get(id) ? FR.fs.get(id).name : id, [plSheet(cfg), hcSheet(cfg), opexSheet(cfg), notesSheet(id, cfg)]);
  }

  function boardBook() {
    const cfg = Object.assign({}, VERS.bud_v5ut, { stamp: 'BOARD COPY — Board of Directors meeting, Tue Oct 20, 2026', badge: 'CONFIDENTIAL', saved: '10/16/2026 3:04 AM',
      hint: 'Board copy. Protected. Numbers = v5 USE THIS. —F' });
    const pl = plSheet(cfg, true);
    const fixed = FR.puzzle && FR.puzzle.isSolved && FR.puzzle.isSolved('ebitda');
    pl.shapes.push({ id: 'fnote', r: 9, c: 10, dx: 6, dy: 4, w: 236, h: 58, hidden: !fixed, cls: 'xl-sticky',
      html: "Nice. Bank.zip pw: ='P&amp;L Summary'!C12 (as a number, no comma) —F" });
    const hc = hcSheet(cfg, true);
    const S = sheet('Board Notes', { nc: 8, nr: 30 });
    S.w({ A: 30, B: 620 });
    S.h(1, 20);
    S.set('A1', 'Board Pack — Tue Oct 20, 2026, 9:00 AM', ST.title);
    S.set('A2', 'Prairie Ledger Bank wants the full pack before they release the $4.0M survival package.', ST.stamp);
    S.set('A4', 'Contents', ST.sec);
    ['FY2027 Budget — this file (P&L Summary + Headcount)', 'Covenant compliance — DSCR, Q3 TTM (Bank\\Bank.zip)', '13-week cash — min. liquidity $250K test (the REAL one. somewhere safe)', 'Q3 EBITDA bridge — Board Meeting Oct 20\\Q3_EBITDA_Bridge.xls', 'Emergency plan — FOR THE BOARD (desktop)', 'Email the pack to Diane. Before 9. Not at 8:59.'].forEach((t, i) => { S.set('A' + (5 + i), i + 1 + '.', { al: 'r' }); S.set('B' + (5 + i), t); });
    S.set('A11', 'Why is this file password-protected?', ST.sec);
    S.set('B12', 'Because Drew opened v4 in a meeting and "fixed" revenue to 42,000 live on the projector.');
    S.set('B13', 'Numbers here = Budget_FY27_v5_FINAL_USE_THIS.xls. If they don\'t match, this file is wrong, not v5.');
    S.set('B15', 'EBITDA = Gross profit − SG&A − Rent & leases − Other opex. BEFORE D&A. (the D is for depreciation, Drew)', ST.note);
    return new Book('Budget_FY27_BOARD.xls', [pl, hc, S.sh]);
  }

  function covenantBook() {
    const S = sheet('Q3 2026 Certificate', { nc: 10, nr: 44 });
    S.w({ A: 330, B: 62, C: 62, D: 62, E: 62, F: 78, G: 14, H: 250 });
    S.h(1, 20);
    S.set('A1', 'Prairie Ledger Bank', M(ST.title, { fc: '#003366' }));
    S.set('A2', 'Quarterly Compliance Certificate — Term Loan A', ST.sub);
    S.set('A3', 'Borrower: Packa Corporation · Test period: trailing twelve months ended September 30, 2026');
    S.set('A4', '($ in thousands)', ST.unit);
    S.set('H1', 'DRAFT — not signed', ST.red);
    S.set('A6', '1. EBITDA — trailing twelve months', ST.sec);
    S.row('B7', ["Q4'25", "Q1'26", "Q2'26", "Q3'26", 'TTM'], ST.hdr);
    S.style('A7', ST.hdrL);
    S.set('A8', 'EBITDA (per management accounts)', { ind: 1 });
    S.row('B8', [720, 690, 760, 690], ST.inp); S.set('F8', '=SUM(B8:E8)', ST.tot);
    S.set('H8', "Q3 actual per bridge file (690) ✓", ST.note);
    S.set('A10', '2. Capital expenditures — trailing twelve months', ST.sec);
    S.set('A11', 'Total capital expenditures', { ind: 1 }); S.set('F11', 410, ST.inp);
    S.set('H11', 'see Capex log tab', ST.note);
    S.set('A12', 'Less: financed under equipment loan', { ind: 1 }); S.set('F12', 300, ST.inp);
    S.cm('F12', FRANK, 'Equipment loan draw schedule says 300 was financed. The rest we paid out of pocket.');
    S.set('A13', 'Unfunded capital expenditures', { ind: 1, b: 1 }); S.set('F13', '?', M(ST.input, { al: 'r', b: 1, bt: 't' }));
    S.set('H13', 'Karen — which one did we pay cash for??', ST.note);
    S.cm('F13', FRANK, 'Only capex NOT financed by a loan. =F11-F12, if you believe Karen. See her email + loan agreement §6.1');
    S.set('A15', '3. Debt service — per Section 6.1(b)', ST.sec);
    S.set('A16', 'Term Loan A — outstanding principal at the test date (9/30/2026)', { ind: 1 }); S.set('F16', 6000, ST.inp);
    S.set('H16', 'per Debt Schedule / loan agreement §2.1', ST.note);
    S.set('A17', 'Fixed interest rate', { ind: 1 }); S.set('F17', 0.075, { fc: BLUE, f: 'p2' });
    S.set('A18', 'Interest on test-date balance (§6.1(b)) — principal × fixed rate', { ind: 1 }); S.set('F18', '=F16*F17', ST.calc);
    S.set('H18', 'Interest on test-date balance (§6.1(b)) = 450. Not the TTM cash number (≈ 532, declining balance).', ST.note);
    S.set('A19', 'Scheduled principal — next 12 months (§6.1(b))', { ind: 1 }); S.set('F19', 1750, ST.inp);
    S.set('H19', 'next 12 months scheduled principal: 145.8/month × 12, paid on the 20th', ST.note);
    S.set('A20', 'Total debt service', { b: 1 }); S.set('F20', '=F18+F19', ST.tot);
    S.set('A22', '4. Debt Service Coverage Ratio (Section 6.1)', ST.sec);
    S.set('A23', 'DSCR = (TTM EBITDA − Unfunded Capex) ÷ Total debt service', { ind: 1, b: 1 });
    S.set('F23', "'=?", { b: 1, fc: RED, al: 'r', f: 'x2', bg: '#FFFFCC', bt: 't', bb: 't' });
    S.cm('F23', FRANK, 'Read 6.1 in the loan agreement. Carefully. Last time I forgot the capex bit and the bank noticed.');
    S.set('A24', 'Covenant minimum', { ind: 1 }); S.set('F24', 1.25, { fc: BLUE, f: 'x2' });
    S.set('H23', '=IF(ISNUMBER(F23),IF(F23>=F24-0.005,"COMPLIANT — "&ROUND(F23,2)&"x","BREACH — "&ROUND(F23,2)&"x"),"")', { b: 1 });
    S.cond('H23', v => typeof v === 'string' && v.startsWith('COMPLIANT'), { fc: '#006100', bg: '#C6EFCE' });
    S.cond('H23', v => typeof v === 'string' && v.startsWith('BREACH'), { fc: '#9C0006', bg: '#FFC7CE' });
    S.set('A25', 'Headroom / (shortfall)', { ind: 1 }); S.set('F25', '=IF(ISNUMBER(F23),F23-F24,"")', { f: 'x2' });
    S.set('A26', 'Compliant? (Y/N)', { ind: 1, b: 1 }); S.set('F26', '=IF(ISNUMBER(F23),IF(F23>=F24-0.005,"Y","N"),"")', M(ST.input, { al: 'c', b: 1 }));
    S.set('A28', '5. Minimum Liquidity (Section 6.2)', ST.sec);
    S.set('A29', 'Unrestricted cash ≥ $250K at every week-end — see 13-week cash forecast', { ind: 1 });
    S.set('H29', "that file is in a safe place. (hidden. obviously.)", ST.note);
    S.set('A32', 'The undersigned certifies that the above is true and correct and that no Default or Event of Default has occurred', { i: 1 });
    S.set('A33', 'and is continuing as of the date hereof.', { i: 1 });
    S.set('A36', 'Chief Financial Officer: ______________________________', { b: 1 });
    S.set('A37', 'Name: Diane Kessler');
    S.set('A38', 'Date: ______________');
    S.cond('F23', v => typeof v === 'number' && v < 1.25 - 1e-9, { fc: RED, bg: '#FFC7CE' });
    S.cond('F23', v => typeof v === 'number' && v >= 1.25 - 1e-9, { fc: '#006100', bg: '#C6EFCE' });

    const L = sheet('Capex log', { nc: 8, nr: 30 });
    L.w({ A: 90, B: 260, C: 70, D: 140, E: 250 });
    L.h(1, 20);
    L.set('A1', 'Capex log — TTM Oct-2025 to Sep-2026 (cash basis, per the loan agreement)', ST.title);
    L.set('A2', '($ in thousands)', ST.unit);
    L.row('A4', ['Date', 'Project', 'Amount', 'Funding', 'Notes'], ST.hdrL);
    [["'06/15/2026", 'Corrugator upgrade — glue station', 240, '', "Karen's project. Equipment loan drawn 06/01/2026."], ["'06/22/2026", 'Forklifts (2), electric', 60, '', 'with the glue station on the equipment loan'], ["'09/16/2026", 'Die-cutter rebuild (completed 09/16)', 110, '', 'the old one caught fire (a little). Invoice #4471 PAID 09/25/2026 — wire from the operating account.']].forEach((x, i) => {
      const r = 5 + i; L.set('A' + r, x[0]); L.set('B' + r, x[1]); L.set('C' + r, x[2], ST.inp); L.set('D' + r, x[3], { fc: BLUE, bg: '#FFFFCC' }); if (x[4]) L.set('E' + r, x[4], ST.note);
    });
    L.set('B8', 'Total capex', { b: 1 }); L.set('C8', '=SUM(C5:C7)', ST.tot);
    L.set('B10', 'Funding column blank — which ones went on the equipment loan? Ask Karen, she signed the POs.', ST.note);
    return new Book('Covenant_Cert_Q3.xls', [S.sh, L.sh]);
  }

  // 13-week REAL cash (SPEC v2): disbursement lines must foot EXACTLY to the SPEC totals
  const CASH = {
    receipts: [700, 690, 680, 650, 640, 620, 700, 720, 700, 740, 720, 750, 730],
    disb: [1084, 1210, 1094, 1170, 944, 1050, 900, 870, 880, 860, 880, 850, 880],
    mat: [440, 455, 445, 450, 430, 425, 420, 430, 425, 420, 410, 415, 420],
    freight: [62, 64, 61, 63, 60, 58, 57, 59, 60, 55, 54, 56, 58],
    util: [31, 29, 30, 32, 30, 31, 33, 34, 35, 36, 35, 34, 33],
    rent: [0, 0, 35, 0, 0, 0, 35, 0, 0, 0, 0, 35, 0],
    sal: [0, 225, 0, 0, 0, 0, 225, 0, 0, 0, 225, 0, 0],
    debt: [183, 0, 0, 0, 183, 0, 0, 0, 183, 0, 0, 0, 0],
    ins: [0, 22, 0, 0, 0, 22, 0, 0, 0, 0, 22, 0, 0],
    other: [24, 28, 22, 25, 21, 26, 20, 23, 19, 27, 18, 24, 22],
  };
  CASH.ap = CASH.disb.map((d, i) => d - CASH.sal[i] - CASH.mat[i] - CASH.freight[i] - CASH.util[i] - CASH.rent[i] - CASH.debt[i] - CASH.ins[i] - CASH.other[i]);
  XL.CASH = CASH;
  function cashBook() {
    const S = sheet('13-wk Cash REAL', { nc: 18, nr: 44 });
    const W = 'BCDEFGHIJKLMN'.split('');
    const wmap = { A: 290 }; W.forEach(c => (wmap[c] = 56)); wmap.O = 70; wmap.P = 14; wmap.Q = 230;
    S.w(wmap);
    S.h(1, 20);
    S.set('A1', 'Packa Corporation — 13-Week Cash Flow — REAL VERSION', ST.title);
    S.set('A2', 'As of Fri 10/16/2026 · weeks commencing Mon 10/19/2026 · cash basis', ST.sub);
    S.set('A3', '($ in thousands) · owner: FW', ST.unit);
    S.set('H1', 'DO NOT FORWARD (esp. to Drew)', ST.red);
    S.set('H2', 'Board version is in BOARD VERSION. This is the one that\'s true.', ST.note);
    S.set('A5', 'Week', ST.hdrL); W.forEach((c, i) => S.set(c + '5', i + 1, M(ST.hdr, { f: 'int' }))); S.set('O5', '13-wk total', ST.hdr);
    const md = d => d.getMonth() + 1 + '/' + d.getDate();
    S.set('A6', 'Week commencing (Mon)', { i: 1 });
    S.set('A7', 'Week ending (Fri)', { i: 1 });
    W.forEach((c, i) => {
      const m = new Date(2026, 9, 19 + i * 7), f = new Date(2026, 9, 23 + i * 7);
      S.set(c + '6', "'" + md(m), { al: 'c', i: 1 }); S.set(c + '7', "'" + md(f), { al: 'c', i: 1, bb: 't' });
    });
    S.style('A7', { bb: 't' }); S.style('O7', { bb: 't' });
    S.set('A9', 'Opening cash', { b: 1 });
    S.set('B9', 2840, M(ST.inp, { b: 1 }));
    W.slice(1).forEach((c, i) => S.set(c + '9', `=${W[i]}28`, M(ST.calc, { b: 1 })));
    S.set('Q9', 'wk 1 = Prairie Ledger Bank balance Fri 10/16', ST.note);
    S.set('A11', 'Customer collections (receipts)');
    W.forEach((c, i) => S.set(c + '11', CASH.receipts[i], ST.inp));
    S.set('Q11', 'AR aging 10/15. Two big accounts churned in Aug.', ST.note);
    S.set('A13', 'Disbursements', ST.sec);
    S.set('A14', 'Hourly payroll (all-in), bi-weekly', { ind: 1, b: 1 });
    W.forEach(c => S.set(c + '14', '', ST.input));
    S.cm('A14', FRANK, 'PAYROLL — get from Rachel. Hourly crew only; salaried are on the line below.');
    S.set('Q14', "Rachel has the per-run $. Don't assume weekly (did that once. never again). Next run Fri 10/23 = wk 1.", ST.note);
    const lines = [['Salaried payroll & benefits (monthly)', 'sal', 'Sales, F&A, management — ≈ 225/month, last business day (wk 11 = Thu 12/31, holiday)'], ['Past-due AP catch-up (mills on credit hold)', 'ap', 'Ozark Kraft credit hold since 9/8 — pay the old stuff or no board ships'], ['Containerboard & materials', 'mat', 'COD until the hold lifts (+$40/ton since Jul 1)'], ['Freight', 'freight'], ['Utilities & plant', 'util'], ['Rent & leases', 'rent', 'plant + warehouse, monthly'], ['Debt service', 'debt', 'TLA P+I monthly on the 20th (145.8 + interest ≈ 183) — Oct 23 / Nov 20 / Dec 18; Jan 20 is wk 14. Equipment loan auto-debits in Other.'], ['Insurance', 'ins', 'monthly premium'], ['Other', 'other', 'bank fees, equipment loan debit, misc']];
    lines.forEach(([l, k, n], j) => {
      const r = 15 + j; S.set('A' + r, l, { ind: 1 });
      W.forEach((c, i) => S.set(c + r, CASH[k][i], ST.inp));
      if (n) S.set('Q' + r, n, ST.note);
    });
    S.style('A16', { b: 1, fc: '#993300' });
    S.set('A24', 'Total disbursements', { b: 1 });
    W.forEach(c => S.set(c + '24', `=SUM(${c}14:${c}23)`, ST.tot));
    S.set('A26', 'Net cash flow', { b: 1 });
    W.forEach(c => S.set(c + '26', `=${c}11-${c}24`, M(ST.calc, { b: 1 })));
    S.set('A28', 'Ending cash', { b: 1 });
    W.forEach(c => S.set(c + '28', `=${c}9+${c}26`, M(ST.grand)));
    S.set('A30', 'Minimum liquidity (covenant 6.2)', { ind: 1 });
    S.set('B30', 250, ST.inp); W.slice(1).forEach(c => S.set(c + '30', '=$B$30', ST.calc));
    S.set('A31', 'Headroom / (shortfall)', { ind: 1 });
    W.forEach(c => S.set(c + '31', `=${c}28-${c}30`, ST.calc));
    [11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26].forEach(r => S.set('O' + r, `=SUM(B${r}:N${r})`, M(ST.calc, { b: 1 })));
    S.set('O9', '=B9', M(ST.calc, { b: 1 })); S.set('O28', '=N28', ST.grand);
    S.cond('B28:N28', v => typeof v === 'number' && v < 250, { bg: '#FF9999', fc: '#9C0006' });
    S.cond('B31:N31', v => typeof v === 'number' && v < 0, { fc: RED });
    S.set('Q7', 'wk 10 ends Fri 12/25 and wk 11 Fri 1/1 — holidays; hourly run 12/31.', ST.note);
    S.set('A34', 'Red = ending cash below the $250K covenant minimum. Bank tests EVERY week-end, not the average. (Section 6.2)', ST.note);
    S.set('A35', '=IF(COUNT(B14:N14)>0,"Payroll in. Now it\'s just bad news.","Payroll row still empty → this forecast is fiction until it isn\'t.")', ST.note);
    S.set('A36', 'See DO NOT DELETE tab.', ST.note);
    const N = sheet('DO NOT DELETE', { nc: 6, nr: 30, tabColor: '#FF0000' });
    N.w({ A: 26, B: 720 });
    N.h(1, 20);
    N.set('A1', 'DO NOT DELETE', M(ST.title, { fc: RED }));
    N.set('A2', 'Frank\'s notes. Drew: "do not delete" means do not delete. —FW', ST.note);
    ['Board version says 182 days. Real: 43. Funding gap by wk 13 = 2,164 + 250 minimum.',
      'The 2,164 only happens if payroll is in. Put payroll in. (Rachel has the number.)',
      'Past-due AP: Ozark Kraft put us on credit hold 9/8. Every old invoice gets paid before they ship board. That\'s the burn.',
      'Min liquidity (6.2) breaks BEFORE cash goes negative. Find the first red week — that\'s the one the bank cares about.',
      'Receipts are real (AR aging 10/15), not Drew\'s "big-box uplift".',
      'Every Board-version override is in CHANGE_LOG_do_not_share.xls. Dated. Initialed.',
      'The plan is in FOR THE BOARD (desktop). If you\'ve read the change log, you know the password.',
      '43 days. Board is Tuesday. —FW'].forEach((t, i) => { N.set('A' + (4 + i), '•', { al: 'r' }); N.set('B' + (4 + i), t, i === 0 ? { b: 1 } : {}); });
    return new Book('Packa_Cash_13wk_REAL_2026-10-16.xls', [S.sh, N.sh]);
  }

  /* ---------- dates as Excel serials ---------- */
  const serial = (y, m, d) => (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5;
  XL.serial = serial;

  /* ---------- Board packs (BOARD VERSION, Drew's overrides) ---------- */
  const PACKS = {
    bp_q1: { q: 'Q1', asof: [2026, 1, 20], bank: 6380, base: ['Q4-25', 3150, 'Actual, Oct–Dec 2025 (9,450 / 3)'], vol: 0.02, price: 0.01, priceNote: 'Pass-through pricing, 1%', gm: 0.19, opex: 395, capex: 60, wc: 300, hc: 112, act: ["Q4-25 Actual", 9450, 0.184, 720, 'n/a'], fq: 'Q1-26 Forecast' },
    bp_q2: { q: 'Q2', asof: [2026, 4, 21], bank: 5280, base: ['Q1-26', 3040, 'Actual, Jan–Mar 2026 (9,120 / 3)'], vol: 0.04, price: 0.02, priceNote: 'Pass-through pricing, 2%', gm: 0.185, opex: 400, capex: 60, wc: 600, hc: 112, act: ["Q1-26 Actual", 9120, 0.179, 690, '581 days'], fq: 'Q2-26 Forecast' },
    bp_q3: { q: 'Q3', asof: [2026, 7, 21], bank: 4080, base: ['Q2-26', 3170, 'Actual, Apr–Jun 2026 (9,510 / 3)'], vol: 0.12, price: 0.0, priceNote: 'none — price freeze', gm: 0.18, opex: 410, capex: 75, wc: 900, hc: 112, act: ["Q2-26 Actual", 9510, 0.182, 760, '243 days'], fq: 'Q3-26 Forecast' },
    bp_q4: { q: 'Q4', hard182: 1, asof: [2026, 10, 14], bank: 2840, vol: 0.18, price: 0.06, priceNote: 'Pass-through pricing, 6%', gm: 0.18, opex: 400, capex: 75, wc: 1690, hc: 118, act: ["Q3-26 Actual", 9280, 0.198, 690, '131 days'], fq: 'Q4-26 Forecast', drew: 1 },
  };
  const DREW = 'Drew Hollis';
  function runwaySheet(S, o, real) {
    S.w({ A: 380, B: 96, C: 440 });
    S.h(1, 20);
    S.set('A1', 'PACKA CORP — Cash Runway', ST.title);
    S.set('A2', 'Packaging Manufacturing · Sedalia, Missouri · FY2026 · ($ in thousands)', ST.stamp);
    S.set('A3', 'Scenario: ' + (real ? 'REAL VERSION' : 'BOARD VERSION'), { b: 1, fc: real ? '#006100' : '#003366' });
    S.set('A4', 'As of:', { b: 1 }); S.set('B4', serial(...o.asof), { f: 'date', fc: BLUE, al: 'r' });
    S.set('A5', o.line5, { i: 1 });
    S.row('A7', ['Input / Assumption', 'Value', 'Notes'], ST.hdrL); S.style('B7', { al: 'r' });
    const inp = M(ST.input, { f: 'n0' }), pin = M(ST.input, { f: 'p1' });
    const base = o.base || ['Q3-26', 3093, 'Actual, Jul–Sep 2026 (9,280 / 3)'];
    const fq = o.q || 'Q4', pq = base[0].slice(0, 2);
    const rows = [
      ['Cash & equivalents (bank balance)', o.bank, inp, 'Per Prairie Ledger Bank statement, operating + sweep account'],
      [`${base[0]} avg monthly revenue`, base[1], inp, base[2]],
      [`${fq} volume change vs ${pq}`, o.vol, pin, real ? 'Real: two accounts churned in Aug. No big-box account.' : (fq === 'Q4' ? 'Big-box Q4 uplift (per DH)' : 'Volume per Tom\'s pipeline')],
      [`${fq} price change`, o.price, pin, real ? 'Real: customers refused the increase.' : (o.priceNote || 'Pass-through pricing')],
      ['Gross margin', o.gm, pin, real ? 'Q3 19.8% already carries the mill increase (Jul 1). Q4: price freeze, two accounts lost (volume −2%, lost absorption), COD premiums on credit hold → ~12%.' : 'Containerboard cost normalizing'],
      ['Monthly opex (S,G&A + plant overhead)', o.opex, inp, 'SG&A + plant overhead (production labor is in GM)'],
      ['Monthly debt service (term loan + equipment loan)', 195, inp, 'TLA (450 + 1,750)/12 = 183 + equipment loan ~12'],
      ['Monthly capex', o.capex, inp, real ? 'Corrugator rebuild phase 2 (Karen).' : (fq === 'Q4' ? 'Corrugator rebuild phase 2 (Karen) — pushed to Q1 by DH' : 'Corrugator rebuild phase 2 (Karen)')],
      ['Monthly working-capital drag (past-due AP + receivables build)', o.wc, inp, real ? 'Mills on credit hold. DSO 71 days.' : 'Past-due AP + DSO 71 days (per FW — not reviewed)'],
      ['Days per month', 30.4, M(ST.input, { f: 'n1' }), '365 / 12'],
    ];
    rows.forEach(([l, v, s, n], i) => { S.set('A' + (8 + i), l); S.set('B' + (8 + i), v, s); S.set('C' + (8 + i), n, ST.note); });
    S.row('A19', ['Calculation', 'Monthly', 'Formula logic'], ST.hdrL); S.style('B19', { al: 'r' });
    const calc = [['Forecast monthly revenue', '=B9*(1+B10)*(1+B11)', `${pq} avg × volume × price`], ['Gross profit', '=B20*B12', 'Revenue × GM'], ['Operating expenses', '=-B13'], ['EBITDA', '=B21+B22'],
      ['Debt service', '=-B14'], ['Capex', '=-B15'], ['Working capital', '=-B16'], ['NET MONTHLY CASH FLOW', '=B23+B24+B25+B26', 'Negative = burn'], ['Daily burn', '=IF(B27<0,-B27/B17,0)']];
    calc.forEach(([l, f, n], i) => { const r = 20 + i; S.set('A' + r, l, r === 27 ? { b: 1 } : {}); S.set('B' + r, f, r === 27 ? ST.tot : M(ST.calc, r === 28 ? { f: 'n1' } : {})); if (n) S.set('C' + r, n, ST.note); });
    S.set('A30', 'CASH RUNWAY (DAYS)', { b: 1, fs: 11 });
    if (o.hard182) { S.set('B30', 182, { b: 1, fs: 11, f: 'n0', bt: 't', bb: 'd', bg: '#C6EFCE', fc: BLUE }); S.set('C30', '=IF(B28>0,"calc: "&ROUNDDOWN(B8/B28,0),"")', M(ST.note, { fs: 8 })); }
    else S.set('B30', '=IF(B28>0,ROUNDDOWN(B8/B28,0),9999)', { b: 1, fs: 11, f: 'n0', bt: 't', bb: 'd', bg: real ? '#FFC7CE' : '#C6EFCE' });
    S.set('A31', 'Cash runway (months)'); S.set('B31', '=B30/B17', { f: 'n1' });
    S.set('A32', 'Projected cash-out date'); S.set('B32', '=B4+B30', { f: 'date', al: 'r' });
    S.set('A33', 'Legend: blue/yellow = inputs (edit these), black = formulas.', ST.note);
    S.h(30, 19);
  }
  function packBook(id) {
    const o = Object.assign({}, PACKS[id]);
    o.line5 = `Board Pack data tab — ${o.q} 2026 Board Meeting — Packa Corp`;
    const S = sheet('Cash Runway', { nc: 8, nr: 40 });
    runwaySheet(S, o, false);
    const K = sheet('Board KPIs', { nc: 8, nr: 30 });
    K.w({ A: 150, B: 110, C: 120, D: 250 });
    K.h(1, 20);
    K.set('A1', `PACKA CORP — ${o.q} 2026 Board Pack — KPI Summary`, ST.title);
    K.set('A2', '($ in thousands)', ST.unit);
    K.row('A3', ['KPI', o.act[0], o.fq, 'Comment'], ST.hdrL); K.style('B3:C3', { al: 'r' });
    const a = o.act;
    K.set('A4', 'Revenue'); K.set('B4', a[1], ST.inp); K.set('C4', "='Cash Runway'!B20*3", ST.link); K.set('D4', o.q === 'Q4' ? 'Big-box retail Q4 uplift' : 'On plan');
    K.set('A5', 'Gross margin'); K.set('B5', a[2], { fc: BLUE, f: 'p1' }); K.set('C5', "='Cash Runway'!B12", { fc: GREEN, f: 'p1' }); K.set('D5', 'Containerboard normalizing');
    K.set('A6', 'EBITDA'); K.set('B6', a[3], ST.inp); K.set('C6', "='Cash Runway'!B23*3", ST.link); K.set('D6', o.q === 'Q4' ? 'Turnaround underway' : 'In line');
    K.set('A7', 'Cash runway', { b: 1 }); K.set('B7', a[4], { al: 'r', fc: BLUE }); K.set('C7', "='Cash Runway'!B30", { fc: GREEN, f: 'days', b: 1 });
    K.set('D7', o.q === 'Q4' ? 'SIX MONTHS — comfortable' : 'Comfortable', o.q === 'Q4' ? { b: 1, fc: '#006100' } : {});
    K.set('A8', 'Headcount'); K.set('B8', o.hc, M(ST.inp)); K.set('C8', o.hc, ST.inp); K.set('D8', o.q === 'Q4' ? '2nd shift on since Sept' : 'Stable');
    K.style('A8:D8', { bb: 't' });
    K.set('A10', 'Prepared by FP&A (F. Warmington) · reviewed by D. Hollis, VP Finance', ST.note);
    if (o.drew) {
      S.cm('B10', DREW, '18%. The big-box account is coming. Make it work. —DH');
      S.cm('B11', DREW, 'Customers will eat the price increase. —DH');
      S.cm('B12', DREW, "Kraft prices always come back down. Call it a variance. —DH");
      S.cm('B15', DREW, 'Push the corrugator rebuild to Q1. —DH');
      S.cm('B30', DREW, 'Just make it six months.');
      K.cm('C7', DREW, 'Just make it six months.');
      K.cm('D4', DREW, "Don't overthink it. —DH");
      S.set('D30', '← typed. The formula said 51. (REAL VERSION has the rest. —FW)', M(ST.note, { fs: 8 }));
      S.set('C3', 'Last modified by Drew Hollis 10/14/2026 7:31 PM', ST.stamp);
    }
    const nm = FR.fs && FR.fs.get(id) ? FR.fs.get(id).name : id;
    return new Book(nm, [S.sh, K.sh]);
  }

  function changelogBook() {
    const S = sheet('Change Log', { nc: 12, nr: 30 });
    S.w({ A: 82, B: 40, C: 200, D: 44, E: 70, F: 76, G: 86, H: 360, I: 130, J: 100 });
    S.h(1, 20);
    S.set('A1', 'PACKA CORP — Board Model Change Log', ST.title);
    S.set('A2', 'Every manual override to the Board version, dated and initialed. Kept by FW since Jul-2026. ($ in thousands)', ST.stamp);
    S.row('A4', ['Date', 'Init.', 'File / Tab', 'Cell', 'Was', 'Changed to', 'Requested by', 'Reason given', 'Warning issued', 'Taken to Board?'], ST.hdrL);
    const Q3 = 'Board Pack Q3 / Cash Runway', Q4 = 'Board Pack Q4 / Cash Runway', RE = 'REAL / Cash Runway', D = '—';
    const rows = [
      [[2026, 7, 14], 'DH', Q3, 'B10', '-2.0%', '+12.0%', 'Drew', '"Make it work. The big-box account is coming."', 'Yes — email 07/14', 'Yes'],
      [[2026, 7, 14], 'FW', RE, D, D, D, D, 'Filed real version. Runway 108 days.', 'Yes', 'No'],
      [[2026, 7, 28], 'DH', Q4, 'B11', '0.0%', '+6.0%', 'Drew', '"Customers will eat the price increase."', 'Yes — 1:1 07/28', 'Yes'],
      [[2026, 8, 11], 'FW', RE, D, D, D, D, 'Two accounts churned. Runway 84 days.', 'Yes — email 08/11', 'No'],
      [[2026, 8, 18], 'DH', Q4, 'B12', '12.0%', '15.0%', 'Drew', '"Board cost will come down. It\'s temporary."', 'Yes — Slack 08/18', 'Yes'],
      [[2026, 8, 25], 'DH', Q4, 'B15', '110', '75', 'Drew', '"Push the corrugator rebuild to Q1."', 'Yes — 1:1 08/25', 'Yes'],
      [[2026, 9, 8], 'FW', RE, D, D, D, D, 'Ozark Kraft put us on credit hold. Runway 68 days.', 'Yes — email 09/08', 'No'],
      [[2026, 9, 15], 'DH', Q4, 'B12', '15.0%', '18.0%', 'Drew', '"Kraft prices always come back down. Call it a variance."', 'Yes — Slack 09/15', 'Yes'],
      [[2026, 9, 22], 'DH', Q4, 'B10', '+12.0%', '+18.0%', 'Drew', '"New scenario. Optimistic case is the base case now."', 'Yes — 1:1 09/22', 'Yes'],
      [[2026, 9, 28], 'DH', Q4, 'B30', '51 days', '182 days', 'Drew', '"Just make it six months."', 'Yes — email 09/28', 'Yes'],
      [[2026, 10, 6], 'FW', RE, D, D, D, D, 'Payroll risk flagged. Runway 47 days.', 'Yes — email 10/06', 'No'],
      [[2026, 10, 13], 'DH', Q4, 'B13', '415', '400', 'Drew', '"Hiring freeze. Don\'t need to model it, just cut it."', 'Yes — 1:1 10/13', 'Yes'],
      [[2026, 10, 16], 'FW', RE, D, D, D, D, "Real runway 43 days. Board is Tuesday. I'm done.", 'Yes — this file', 'No'],
    ];
    rows.forEach((x, i) => {
      const r = 5 + i, dh = x[1] === 'DH';
      S.set('A' + r, serial(...x[0]), { f: 'ymd', al: 'l' });
      x.slice(1).forEach((v, j) => S.set({ r: r - 1, c: j + 1 }, "'" + v, j === 0 ? { b: 1, al: 'c', fc: dh ? '#C00000' : '#006100' } : j >= 3 && j <= 4 ? { al: 'r' } : {}));
      if (!dh) S.style(`A${r}:J${r}`, { bg: '#EBF1DE' });
    });
    S.style('H14', { b: 1 }); S.style('H17', { b: 1 });
    S.cm('H14', FRANK, 'The formula said 51. He typed over it. I kept the receipt.');
    S.style('A17:J17', { bb: 't' });
    S.set('A19', 'Overrides by DH:', { b: 1 }); S.set('D19', '=COUNTIF(B5:B17,"DH")', { b: 1, al: 'l' });
    S.set('A20', 'Warnings filed by FW:', { b: 1 }); S.set('D20', '=COUNTIF(B5:B17,"FW")', { b: 1, al: 'l' });
    S.set('A21', 'Versions never taken to Board:', { b: 1 }); S.set('D21', '=COUNTIF(J5:J17,"No")', { b: 1, al: 'l' });
    S.set('A23', 'What they told the Board, then what\'s true. Remember that order. —FW', ST.note);
    return new Book('CHANGE_LOG_do_not_share.xls', [S.sh]);
  }

  const TABS47 = ['Summary', 'Assumptions', 'P&L Monthly', 'DO NOT DELETE', 'LINKS', 'BOARD SUMMARY', 'Cover', 'Revenue Bridge', 'COGS Detail', 'Opex Detail', 'Headcount', 'Capex', 'Working Capital', 'Debt Schedule', 'Balance Sheet', 'Cash Flow', 'AR Aging', 'AP Aging', 'Inventory', 'Corrugated', 'Printed Cartons', 'Die-cut', 'Pallets & Crating', 'Pricing', 'Volumes', 'Linerboard Index', 'Kraft Index', 'Scenario A', 'Scenario B', 'Scenario C (Drew)', 'Q1 Bridge', 'Q2 Bridge', 'Q3 Bridge', 'Q4 Bridge', 'Budget FY26', 'Budget vs Actual', 'Board Pack Data', 'Sheet14', 'Sheet14 (2)', 'temp', 'temp2', 'old cash', 'old cash v2', 'FRANK SCRATCH', 'Notes', 'Change Log (mirror)', 'Lookups'];
  XL.TABS47 = TABS47;
  function model47Book() {
    const sheets = {};
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Summary = REAL runway (43 days)
    const Su = sheet('Summary', { nc: 8, nr: 40 });
    runwaySheet(Su, { asof: [2026, 10, 16], bank: 2840, vol: -0.02, price: 0, gm: 0.12, opex: 415, capex: 75, wc: 1678, hc: 118, line5: "Owner: Frank (FP&A). If you're reading this and I'm not here, check DO NOT DELETE." }, true);
    Su.style('A5', { b: 1, i: 0, fc: RED });
    sheets.Summary = Su.sh;
    const A = sheet('Assumptions', { nc: 6, nr: 30 }); A.w({ A: 260, B: 80, C: 300 });
    A.set('A1', 'Assumptions — FY26 model', ST.title);
    [['Tax rate', 0.25, 'p1'], ['Containerboard $/ton increase (Jul 1)', 40, 'n0'], ['Tons per quarter', 1500, 'n0'], ['Min liquidity (covenant 6.2)', 250, 'n0'], ['DSCR minimum (covenant 6.1)', 1.25, 'x2'], ['Term Loan A outstanding', 6000, 'n0'], ['Interest rate (fixed)', 0.075, 'p2'], ['Headcount (FTEs)', 118, 'n0'], ['DSO (days)', 71, 'n0']].forEach(([l, v, f], i) => { A.set('A' + (3 + i), l); A.set('B' + (3 + i), v, { fc: BLUE, f }); });
    A.set('C3', 'blended fed + MO', ST.note);
    sheets.Assumptions = A.sh;
    const P = sheet('P&L Monthly', { nc: 16, nr: 30 }); P.w({ A: 160 });
    P.set('A1', 'P&L Monthly — FY2026 ($K)', ST.title);
    P.row('B3', MON, ST.hdr); P.set('A3', '', ST.hdrL);
    const rev = [3040, 3010, 3070, 3020, 3150, 3340, 3110, 3060, 3110, 0, 0, 0], ebd = [240, 225, 225, 245, 250, 265, 235, 220, 235, 0, 0, 0];
    P.set('A4', 'Revenue'); P.row('B4', rev.map(v => v || null), ST.inp);
    P.set('A5', 'EBITDA'); P.row('B5', ebd.map(v => v || null), ST.inp);
    P.set('A6', 'Oct–Dec: see Summary (real) or BOARD SUMMARY (not real)', ST.note);
    sheets['P&L Monthly'] = P.sh;
    const D = sheet('DO NOT DELETE', { nc: 6, nr: 30, tabColor: '#FF0000' }); D.w({ A: 260, B: 90, C: 440 });
    D.h(1, 20);
    D.set('A1', 'DO NOT DELETE', M(ST.title, { fc: RED }));
    D.set('A2', 'This tab feeds every cash number in the model. Drew, I mean it. — F.', ST.note);
    D.row('A4', ['Cash logic', 'Value', 'Note'], ST.hdrL); D.style('B4', { al: 'r' });
    [['Opening cash (link)', '=Summary!B8', 'Bank balance', 'n0'], ['Real monthly burn (link)', '=-Summary!B27', 'From Summary calc block', 'n0'], ['Real daily burn', '=B6/Summary!B17', '', 'n1'], ['REAL RUNWAY (days)', '=ROUNDDOWN(B5/B7,0)', '<-- this is the number', 'n0'], ['Board Pack shows (days)', 182, 'Typed over by DH 9/28 (see change log)', 'n0'], ['Gap (days)', '=B9-B8', '', 'n0']].forEach(([l, v, n, f], i) => {
      const r = 5 + i; D.set('A' + r, l, r === 8 ? { b: 1 } : {}); D.set('B' + r, v, typeof v === 'number' ? { fc: BLUE, f } : M({ f }, r === 8 ? { b: 1, bg: '#FFC7CE' } : {})); if (n) D.set('C' + r, n, ST.note);
    });
    D.set('A13', 'Notes (cryptic on purpose)', ST.sec);
    ['the real numbers are where Drew never looks: hidden.', 'BOARD VERSION has a sibling. Same folder. You just can\'t see it (Tools → Folder Options, if you must).', 'Drew only ever opens BOARD VERSION. And the pool-jumping sign-up sheet.', 'Every override: dated, initialed. CHANGE_LOG_do_not_share. Not for sharing. Obviously.', 'Do not touch the "Do not touch."'].forEach((t, i) => D.set('A' + (14 + i), '• ' + t, i === 0 ? { b: 1 } : {}));
    sheets['DO NOT DELETE'] = D.sh;
    const L = sheet('LINKS', { nc: 6, nr: 30 }); L.w({ A: 340, B: 110, C: 160 });
    L.set('A1', 'LINKS — external files feeding this model', ST.title);
    L.row('A3', ['File', 'Last refreshed', 'Status'], ST.hdrL);
    ['Prairie_Ledger_TermLoan_Schedule.xls', 'Packa_AP_Aging_2026-10-15.xls', 'Packa_AR_Aging_2026-10-15.xls', 'Packa_Capex_Corrugator_Rebuild.xls', 'Packa_Payroll_HRIS_Export_Sep26.xls', 'Packa_Pricing_Corrugated_v9.xls', 'Containerboard_Index_monthly.xls', 'Cheat_Sheet_Formulas_Kristians.xls'].forEach((f, i) => { L.set('A' + (4 + i), f); L.set('B' + (4 + i), "'10/1" + (i % 6) + '/2026'); L.set('C' + (4 + i), i === 7 ? 'personal. do not ask.' : i === 4 ? '#REF! (moved?)' : 'OK', i === 4 ? { fc: RED } : ST.note); });
    sheets.LINKS = L.sh;
    const BS = sheet('BOARD SUMMARY', { nc: 6, nr: 30 }); BS.w({ A: 220, B: 110, C: 330 });
    BS.set('A1', 'BOARD SUMMARY (Board version)', ST.title);
    [['Bank balance', 2840, 'n0'], ['Q4 revenue forecast', 11606, 'n0'], ['Gross margin', 0.18, 'p1'], ['Cash runway (days)', 182, 'n0']].forEach(([l, v, f], i) => { BS.set('A' + (3 + i), l); BS.set('B' + (3 + i), v, { f, fc: BLUE }); });
    BS.set('C6', 'SIX MONTHS — comfortable', { b: 1, fc: '#006100' });
    BS.cm('B6', DREW, 'Just make it six months.');
    BS.set('A8', 'Hardcoded. Not linked to Summary. Ask me why. —FW', ST.note);
    sheets['BOARD SUMMARY'] = BS.sh;
    const CV = sheet('Cover', { nc: 6, nr: 20 }); CV.w({ A: 420 });
    CV.set('A2', 'PACKA CORPORATION', { b: 1, fs: 16, fc: '#003366' }); CV.h(2, 24);
    CV.set('A3', 'FY26 Operating Model — v47 FINAL FINAL (use this one)', ST.sub);
    CV.set('A5', 'Owner: FW (FP&A Manager) · 47 tabs · 4.7 MB · please do not "clean it up"', ST.note);
    CV.set('A6', 'Sedalia, Missouri · 118 people · ($ in thousands)', ST.note);
    sheets.Cover = CV.sh;
    const HC = sheet('Headcount', { nc: 6, nr: 20 }); HC.w({ A: 180 });
    HC.set('A1', 'Headcount', ST.title); HC.row('A3', ['Dept', 'FTEs'], ST.hdrL);
    [['Production', 84], ['Warehouse & Shipping', 14], ['Sales', 6], ['Finance & Admin', 9], ['Management', 5]].forEach(([d, n], i) => { HC.set('A' + (4 + i), d); HC.set('B' + (4 + i), n, ST.inp); });
    HC.set('A9', 'Total', { b: 1 }); HC.set('B9', '=SUM(B4:B8)', ST.tot);
    sheets.Headcount = HC.sh;
    const SC = sheet('Scenario C (Drew)', { nc: 6, nr: 20, tabColor: '#FF9900' }); SC.w({ A: 240, B: 80, C: 300 });
    SC.set('A1', 'Scenario C (Drew) — "the base case now"', ST.title);
    [['Volume', 0.18, 'big-box account (not signed)'], ['Price', 0.06, 'customers will eat it (they won\'t)'], ['Gross margin', 0.18, 'board cost "temporary"'], ['Working capital', 0, '"call it a variance"']].forEach(([l, v, n], i) => { SC.set('A' + (3 + i), l); SC.set('B' + (3 + i), v, { fc: BLUE, f: 'p1' }); SC.set('C' + (3 + i), n, ST.note); });
    SC.set('A8', 'Make it work. —DH', { b: 1, fc: '#C00000' });
    sheets['Scenario C (Drew)'] = SC.sh;
    const FS = sheet('FRANK SCRATCH', { nc: 8, nr: 30, tabColor: '#00B050' }); FS.w({ A: 90, B: 90, C: 300 });
    FS.set('A1', 'scratch', ST.note);
    FS.set('A3', 2840); FS.set('A4', '=A3/66', { f: 'n1' }); FS.set('B4', 'days. ugh.', ST.note);
    FS.set('A6', 182); FS.set('A7', 43); FS.set('B6', 'told the Board', ST.note); FS.set('B7', 'true', ST.note);
    FS.set('A9', '=A6-A7'); FS.set('B9', 'days of fiction', ST.note);
    FS.set('A12', "'F4 F4 F4", ST.note); FS.cm('A9', FRANK, 'Kristians would use LAMBDA here.'); FS.set('A13', "'practice INDEX/MATCH tonight", ST.note);
    sheets['FRANK SCRATCH'] = FS.sh;
    const NO = sheet('Notes', { nc: 6, nr: 20 }); NO.w({ A: 620 });
    NO.set('A1', 'Notes', ST.title);
    ['v47: fixed circular in Debt Schedule (again).', 'v46: Drew renamed "Cash Flow" to "Cash Flow FINAL". Renamed it back.', 'v45: Scenario C added per DH. Scenario C is now the Board version. Wonderful.', 'If this file won\'t open: it\'s 4.7 MB of hope. Give it a minute.'].forEach((t, i) => NO.set('A' + (3 + i), t));
    sheets.Notes = NO.sh;
    const CL = sheet('Change Log (mirror)', { nc: 6, nr: 20 }); CL.w({ A: 560 });
    CL.set('A1', 'Change Log (mirror)', ST.title);
    CL.set('A3', 'Mirror stopped updating 9/28 (Drew asked what this tab was).');
    CL.set('A4', 'The real one is CHANGE_LOG_do_not_share.xls. Where Drew never looks.', ST.note);
    sheets['Change Log (mirror)'] = CL.sh;
    const TM = sheet('temp', { nc: 6, nr: 20 }); TM.set('A1', '#REF!'); TM.set('B1', '#REF!'); TM.set('A2', '#N/A'); TM.set('A4', "'delete me?", ST.note); sheets.temp = TM.sh;
    const DS = sheet('Debt Schedule', { nc: 10, nr: 30 }); DS.w({ A: 200 });
    DS.set('A1', 'Debt Schedule — FY2026 ($K)', ST.title);
    DS.set('A2', 'Term Loan A: Prairie Ledger Bank, 7.50% fixed. Principal 1,750/yr in equal monthly installments (145.8/month; 437.5/qtr), interest paid monthly with it on the 20th (≈ 183/month). Quarterly totals below. Equipment loan: 300 drawn 06/01/2026, 6.0%, 36 months.', ST.note);
    DS.row('B4', ["Q1'26", "Q2'26", "Q3'26", "Q4'26"], ST.hdr); DS.set('A4', 'Term Loan A', ST.hdrL);
    DS.set('A5', 'Opening balance', { ind: 1 }); DS.set('B5', 7312.5, M(ST.inp, { f: 'n1' })); ['C', 'D', 'E'].forEach((c, i) => DS.set(c + '5', `=${'BCD'[i]}8`, M(ST.calc, { f: 'n1' })));
    DS.set('A6', 'Interest (7.50% / 4)', { ind: 1 }); ['B', 'C', 'D', 'E'].forEach(c => DS.set(c + '6', `=ROUND(${c}5*0.075/4,1)`, M(ST.calc, { f: 'n1' })));
    DS.set('A7', 'Scheduled principal', { ind: 1 }); ['B', 'C', 'D', 'E'].forEach(c => DS.set(c + '7', 437.5, M(ST.inp, { f: 'n1' })));
    DS.set('A8', 'Closing balance', { b: 1 }); ['B', 'C', 'D', 'E'].forEach(c => DS.set(c + '8', `=${c}5-${c}7`, M(ST.tot, { f: 'n1' })));
    DS.set('A9', 'Debt service (interest + principal)', { ind: 1, i: 1 }); ['B', 'C', 'D', 'E'].forEach(c => DS.set(c + '9', `=${c}6+${c}7`, M(ST.calc, { f: 'n1', i: 1 })));
    DS.set('A11', 'Equipment loan', ST.hdrL); DS.style('B11:E11', ST.hdr);
    DS.set('A12', 'Opening balance', { ind: 1 }); DS.set('B12', 0, M(ST.inp, { f: 'n1' })); ['C', 'D', 'E'].forEach((c, i) => DS.set(c + '12', `=${'BCD'[i]}16`, M(ST.calc, { f: 'n1' })));
    DS.set('A13', 'Draw (06/01/2026 — glue station + forklifts)', { ind: 1 }); DS.row('B13', [0, 300, 0, 0], M(ST.inp, { f: 'n1' }));
    DS.set('A14', 'Interest (6.0% / 4)', { ind: 1 }); DS.set('B14', 0, M(ST.inp, { f: 'n1' })); DS.set('C14', 1.5, M(ST.inp, { f: 'n1' })); ['D', 'E'].forEach(c => DS.set(c + '14', `=ROUND(${c}12*0.06/4,1)`, M(ST.calc, { f: 'n1' })));
    DS.set('F14', 'Q2 = one month', ST.note);
    DS.set('A15', 'Principal', { ind: 1 }); DS.row('B15', [0, 0, 25, 25], M(ST.inp, { f: 'n1' }));
    DS.set('A16', 'Closing balance', { b: 1 }); ['B', 'C', 'D', 'E'].forEach(c => DS.set(c + '16', `=${c}12+${c}13-${c}15`, M(ST.tot, { f: 'n1' })));
    DS.set('A17', 'Total debt service', { b: 1 }); ['B', 'C', 'D', 'E'].forEach(c => DS.set(c + '17', `=${c}9+${c}14+${c}15`, ST.grand));
    DS.set('A18', 'TLA closing at 9/30/26 = 6,000 (ties to covenant cert). Covenant interest (§6.1(b)) = 6,000 × 7.50% = 450 — balance at the test date × rate. Actual interest paid TTM ≈ 532 (declining balance).', ST.note);
    sheets['Debt Schedule'] = DS.sh;
    const BP = sheet('Board Pack Data', { nc: 8, nr: 30 }); BP.w({ A: 200, B: 90, C: 90, D: 300 });
    BP.set('A1', 'Board Pack Data — feeds BOARD SUMMARY ($K)', ST.title);
    BP.row('A3', ['Item', 'Q3-26 Actual', 'Q4-26 Fcst', 'Source'], ST.hdrL); BP.style('B3:C3', { al: 'r' });
    [['Net sales', 9280, "='Summary'!B20*3", 'Q3 P&L / Summary'], ['Gross margin', 0.198, "='Summary'!B12", 'Q3 P&L / Summary'], ['EBITDA', 690, "='Summary'!B23*3", 'bridge file / Summary'], ['Bank balance', 2840, 2840, 'Prairie Ledger 10/16'], ['Cash runway (days)', 51, "='DO NOT DELETE'!B8", 'real (Board file says 182)'], ['Headcount', 118, 118, 'HRIS Oct']].forEach(([l, a, f, src], i) => {
      const r = 4 + i, pct = l === 'Gross margin'; BP.set('A' + r, l); BP.set('B' + r, a, { fc: BLUE, f: pct ? 'p1' : 'n0' }); BP.set('C' + r, f, { fc: typeof f === 'string' ? GREEN : BLUE, f: pct ? 'p1' : 'n0' }); BP.set('D' + r, src, ST.note);
    });
    BP.set('A11', 'BOARD SUMMARY no longer links here (Drew pasted values, Sep-28).', ST.note);
    sheets['Board Pack Data'] = BP.sh;
    const OC = sheet('old cash', { nc: 6, nr: 20 }); OC.w({ A: 400 }); OC.set('A1', 'old cash — superseded (Jul-26)', ST.title); OC.set('A3', 'Runway 108 days. Those were the days.', ST.note); sheets['old cash'] = OC.sh;
    // Q bridges (the Q3 one lives in Q3_EBITDA_Bridge.xls)
    const BR = { 'Q1 Bridge': [780, -40, 10, -30, -10, -20], 'Q2 Bridge': [800, 20, 0, -40, -10, -10], 'Q3 Bridge': [850, -120, 80, '??', -20, '??'], 'Q4 Bridge': [700, null, null, null, null, null] };
    Object.keys(BR).forEach(t => {
      const G = sheet(t, { nc: 10, nr: 20 }); G.w({ A: 120 });
      G.set('A1', t + ' — FY2026', ST.title); G.set('A2', '($ in thousands) · Fav / (Unfav)', ST.unit);
      G.row('B4', ['Budget EBITDA', 'Volume', 'Price', 'Board cost', 'Labor', 'Freight', 'Actual'], ST.hdr); G.set('A4', '', ST.hdrL);
      G.set('A5', t.slice(0, 2) + ' 2026');
      const v = BR[t];
      v.forEach((x, j) => { if (x != null) G.set({ r: 4, c: 1 + j }, x, ST.inp); });
      if (t === 'Q4 Bridge') { G.set('A7', 'open — Oct MTD only. Do not use.', M(ST.note, { fc: RED })); }
      else if (t === 'Q3 Bridge') { G.set('H5', 690, ST.tot); G.set('A7', 'actual 690 per P&L Monthly — ?? bars still open, see Q3_EBITDA_Bridge.xls', ST.note); }
      else { G.set('H5', '=SUM(B5:G5)', ST.tot); G.set('A7', 'closed — actual ' + (t === 'Q1 Bridge' ? 690 : 760) + ' per P&L Monthly', ST.note); }
      sheets[t] = G.sh;
    });
    const RB = sheet('Revenue Bridge', { nc: 10, nr: 20 }); RB.w({ A: 140 });
    RB.set('A1', 'Revenue Bridge — FY2026 YTD (Jan–Sep)', ST.title); RB.set('A2', '($ in thousands)', ST.unit);
    RB.row('B4', ['Budget revenue', 'Volume', 'Price', 'Mix', 'New accounts', 'Actual'], ST.hdr); RB.set('A4', '', ST.hdrL);
    RB.set('A5', 'FY 2026 YTD'); [28400, -1050, 420, -80, 220].forEach((x, j) => RB.set({ r: 4, c: 1 + j }, x, ST.inp)); RB.set('G5', '=SUM(B5:F5)', ST.tot);
    RB.set('A7', 'Actual YTD Sep = 27,910 (P&L Monthly). Two accounts churned in Aug.', ST.note);
    sheets['Revenue Bridge'] = RB.sh;
    // generic light tabs — STALE filler, greyed out
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const UNITS = { Volumes: '(tons)', 'Linerboard Index': '($/ton)', 'Kraft Index': '($/ton)', Lookups: '' };
    TABS47.forEach(t => {
      if (sheets[t]) return;
      const G = sheet(t, { nc: 14, nr: 30 }); G.w({ A: 180 });
      if (t === 'Lookups') { G.set('A3', 'nested IFs. 11 deep. I know.', ST.note); G.cm('A3', FRANK, 'Kristians would use LAMBDA here.'); }
      if (/^Sheet14/.test(t) || t === 'temp2') { G.set('A1', t, ST.title); G.set('B6', Math.round(rnd() * 900), { fc: BLUE }); G.set('C9', "'??", ST.note); sheets[t] = G.sh; return; }
      G.set('A1', t + ' — FY2026 — STALE, do not use. —F', M(ST.title, { fc: GREY }));
      G.set('A2', UNITS[t] != null ? UNITS[t] : '($ in thousands)', ST.unit);
      G.row('B4', MON.slice(0, 9), ST.hdr); G.set('A4', '', ST.hdrL);
      const stale = M(ST.inp, { fc: GREY }), staleTot = M(ST.tot, { fc: GREY });
      const fill = (r, lo, hi) => { for (let j = 0; j < 9; j++) G.set({ r, c: 1 + j }, Math.round(lo + rnd() * (hi - lo)), stale); };
      const total = (tr, label, f) => { G.set('A' + tr, label, { b: 1, fc: GREY }); for (let j = 0; j < 9; j++) { const c = colName(1 + j); G.set(c + tr, f(c), staleTot); } };
      if (t === 'Balance Sheet') {
        [['Cash', 2500, 6500], ['AR', 6800, 7600], ['Inventory', 1800, 2400], ['PP&E, net', 9000, 9800]].forEach(([l, lo, hi], i) => { G.set('A' + (5 + i), l); fill(4 + i, lo, hi); });
        total(9, 'Total assets', c => `=SUM(${c}5:${c}8)`);
        [['AP', 3000, 4200], ['Term Loan A', 6000, 7300]].forEach(([l, lo, hi], i) => { G.set('A' + (11 + i), l); fill(10 + i, lo, hi); });
        total(13, 'Total liabilities', c => `=SUM(${c}11:${c}12)`);
      } else if (t === 'Working Capital') {
        [['AR', 6800, 7600], ['Inventory', 1800, 2400], ['AP', 3000, 4200]].forEach(([l, lo, hi], i) => { G.set('A' + (5 + i), l); fill(4 + i, lo, hi); });
        total(8, 'Net working capital (AR + Inv − AP)', c => `=${c}5+${c}6-${c}7`);
      } else {
        const labels = { 'AR Aging': ['Current', '1–30', '31–60', '61–90', '90+'], 'AP Aging': ['Current', '1–30', '31–60', '61–90 (Ozark!)', '90+'] }[t] || ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
        const rng = /Aging/.test(t) ? [300, 2200] : /Index/.test(t) ? [880, 1040] : t === 'Volumes' ? [420, 560] : [100, 1000];
        labels.forEach((l, i) => { G.set('A' + (5 + i), l); fill(4 + i, rng[0], rng[1]); });
        if (!/Index|Lookups/.test(t)) total(5 + labels.length, 'Total', c => `=SUM(${c}5:${c}${4 + labels.length})`);
      }
      if (t === 'old cash v2') G.set('A16', 'superseded by Summary. Do not link. (Drew linked it.)', ST.note);
      sheets[t] = G.sh;
    });
    return new Book('Packa_Corp_Model_FY26_v47_FINAL_FINAL_use_this_one.xls', TABS47.map(t => sheets[t]));
  }

  function forBoardBook() {
    const S = sheet('EMERGENCY PLAN', { nc: 8, nr: 50, tabColor: '#FF0000' });
    S.w({ A: 34, B: 440, C: 90, D: 14, E: 300 });
    S.h(1, 26);
    S.set('A1', 'EMERGENCY PLAN — FOR THE BOARD', { b: 1, fs: 16, fc: '#C00000' });
    S.set('A2', 'Packa Corporation · Board of Directors · Tue Oct 20, 2026, 9:00 AM · prepared by F. Warmington, FP&A Manager', ST.sub);
    S.set('A3', '($ in thousands) · the REAL VERSION', ST.unit);
    S.set('A5', '1.', { b: 1, al: 'r' }); S.set('B5', 'The real numbers', ST.sec);
    const L = (r, lab, v, s, note) => { S.set('B' + r, lab, { ind: 1 }); if (v !== null) S.set('C' + r, v, s || ST.inp); if (note) S.set('E' + r, note, ST.note); };
    L(6, 'Cash today (Prairie Ledger Bank, Fri 10/16)', 2840);
    L(7, 'Runway shown in the Board version (days)', 182, { fc: BLUE, f: 'days' }, 'Drew: "Just make it six months."');
    L(8, 'Real runway (days)', 43, { fc: BLUE, f: 'days', b: 1 }, 'REAL VERSION / change log 10/16');
    L(9, '13-week ending cash, week 13 (real, with payroll)', -2164, ST.inp, 'Packa_Cash_13wk_REAL_2026-10-16.xls');
    L(10, 'Minimum liquidity — covenant 6.2', 250);
    S.set('A12', '2.', { b: 1, al: 'r' }); S.set('B12', 'Funding need', ST.sec);
    L(13, '13-week funding gap', '=-C9', ST.calc);
    L(14, 'Plus: minimum liquidity we must keep', '=C10', ST.calc);
    S.set('B15', 'REAL FUNDING NEED', { b: 1 }); S.set('C15', '=C13+C14', M(ST.grand, { bg: '#FFFF99' }));
    L(17, 'REQUEST: Prairie Ledger Bank survival facility ($4.0M)', 4000, M(ST.inp, { b: 1 }), 'rescue credit facility — Marcus Hale');
    L(18, 'Cushion after the real need', '=C17-C15', ST.calc, 'covers the AP overhang + a bad January');
    S.set('A20', '3.', { b: 1, al: 'r' }); S.set('B20', 'Conditions (the bank will ask — say yes)', ST.sec);
    ['True covenant certificate — DSCR 1.25x, (TTM EBITDA − unfunded capex) ÷ debt service. No Board-version math.', 'Weekly REAL 13-week cash reporting to the bank and the Board.', 'Stop Board overrides. Every change logged, dated, initialed — and approved by the CFO.', 'Covenant waiver for the Q4-26 test (real Q4 EBITDA is negative; DSCR would fail).'].forEach((t, i) => { S.set('B' + (21 + i), `${String.fromCharCode(97 + i)})  ${t}`); });
    S.set('A25', '4.', { b: 1, al: 'r' }); S.set('B25', 'Actions (starting Wednesday)', ST.sec);
    ['Collect past-due AR — top 10 accounts. Tom calls, Diane signs the letters.', 'Renegotiate mill terms with Ozark Kraft Mills — lift the credit hold, back to net 30.', 'Freeze Board-version edits. One model. One version. Read-only.'].forEach((t, i) => { S.set('B' + (26 + i), `${String.fromCharCode(97 + i)})  ${t}`); });
    S.set('B31', "If you're reading this, you rebuilt in one night what lived in 14 files and my head. Get them a real system. —F", { b: 1, i: 1, fc: '#003366' });
    S.cm('C15', FRANK, '2,164 + 250 = 2,414. Ask for 4.0. Don\'t let Drew round it down.');
    S.cond('C15', v => typeof v === 'number', { bg: '#FFFF99' });
    return new Book('FOR_THE_BOARD.xls', [S.sh]);
  }

  function bridgeBook() {
    const S = sheet('Bridge', { nc: 16, nr: 40 });
    S.w({ A: 200, B: 14, C: 70, D: 14, E: 64 });
    S.h(1, 20);
    S.set('A1', 'Packa Corporation — Q3 2026 EBITDA Bridge: Budget to Actual', ST.title);
    S.set('A2', '($ in thousands) · Fav / (Unfav) — unfavorable is negative', ST.unit);
    S.set('A3', 'DRAFT — for Board Pack', ST.red);
    S.row('A5', ['Driver', '', '$K'], ST.hdrL); S.style('C5', { al: 'r' });
    S.set('A6', 'Q3 2026 Budget EBITDA', { b: 1 }); S.set('C6', "='Q3 P&L'!C10", M(ST.link, { b: 1 }));
    const drv = [['Volume', -120], ['Price', 80], ['Containerboard cost', '??'], ['Labor', -20], ['Freight', '??']];
    drv.forEach(([l, v], i) => {
      const r = 7 + i;
      S.set('A' + r, l, { ind: 1 });
      if (v === '??') S.set('C' + r, '??', M(ST.input, { al: 'r', b: 1 }));
      else S.set('C' + r, v, ST.inp);
    });
    S.set('A12', 'Q3 2026 Actual EBITDA', { b: 1, bt: 't' }); S.set('C12', "='Q3 P&L'!D10", M(ST.link, { b: 1, bt: 't' }));
    S.set('A14', 'Check: budget + drivers − actual', { i: 1 }); S.set('C14', '=C6+SUM(C7:C11)-C12', ST.chk);
    S.set('A15', 'Status', { i: 1 }); S.set('C15', '=IF(AND(ISNUMBER(C9),ISNUMBER(C11),ABS(C14)<0.5),"TIES","NO")', { b: 1, al: 'r' });
    S.cond('C15', v => v === 'TIES', { fc: '#006100', bg: '#C6EFCE' });
    S.cond('C15', v => v === 'NO', { fc: RED });
    S.cm('C9', FRANK, 'Mill letter: +$40/ton. Tons per quarter — see our own website. Do NOT plug this one.');
    S.cm('C11', FRANK, 'Freight is the residual. Calculate it, don\'t type it.');
    S.set('A17', 'See Notes tab before touching anything.', ST.note);
    S.chart({ at: 'E5', dx: 4, dy: 0, w: 470, h: 290, render: bridgeChartSVG });
    const P = sheet('Q3 P&L', { nc: 10, nr: 30 });
    P.w({ A: 220, B: 14, C: 70, D: 70, E: 80, F: 14, G: 280 });
    P.h(1, 20);
    P.set('A1', 'Packa Corporation — Q3 2026 P&L: Budget vs Actual', ST.title);
    P.set('A2', '($ in thousands) · quarter ended Sep 30, 2026', ST.unit);
    P.row('A4', ['', '', 'Budget', 'Actual', 'Fav/(Unfav)', '', 'Notes'], ST.hdr); P.style('G4', { al: 'l' });
    P.set('A5', 'Net sales'); P.set('C5', 9600, ST.inp); P.set('D5', 9280, ST.inp); P.set('E5', '=D5-C5', ST.calc);
    P.set('G5', 'volume down (Midwest produce accts), price up', ST.note);
    P.set('A6', 'Materials & freight'); P.set('C6', 6150, ST.inp); P.set('D6', 5970, ST.inp); P.set('E6', '=C6-D6', ST.calc);
    P.set('G6', 'split pending — mill invoice; see memo below', ST.note);
    P.cm('D6', FRANK, 'Containerboard + freight lumped together until the Ozark invoice is booked properly. Yes I know.');
    P.set('A7', 'Direct & indirect labor'); P.set('C7', 1450, ST.inp); P.set('D7', 1470, ST.inp); P.set('E7', '=C7-D7', ST.calc);
    P.set('A8', 'Other plant costs & SG&A'); P.set('C8', 1150, ST.inp); P.set('D8', 1150, ST.inp); P.set('E8', '=C8-D8', ST.calc);
    P.set('A10', 'EBITDA', { b: 1 });
    ['C', 'D'].forEach(c => P.set(c + '10', `=${c}5-${c}6-${c}7-${c}8`, ST.grand));
    P.set('E10', '=D10-C10', ST.grand);
    P.set('A12', 'Volume effect on revenue −400 @ ~30% contribution = −120 EBITDA. Price +80 is pure margin.', ST.note);
    P.set('A14', 'Memo — actual 5,970 splits roughly:', ST.sec);
    P.set('A15', 'Containerboard (≈1,500 t/qtr, Ozark Kraft)', { ind: 1 }); P.set('D15', 1560, M(ST.inp, { fc: GREY })); P.set('G15', 'Q3 tons per the Products page; Jul 1 price letter applies to all of it', ST.note);
    P.set('A16', 'Purchased pallets, crating, foam & supplies (incl. freight until split)', { ind: 1 }); P.set('D16', 4410, M(ST.inp, { fc: GREY }));
    P.set('A17', 'Total materials & freight', { ind: 1, b: 1 }); P.set('D17', '=D15+D16', ST.tot);
    const N = sheet('Notes', { nc: 6, nr: 30 });
    N.w({ A: 30, B: 700 });
    N.h(1, 20);
    N.set('A1', 'Bridge notes', ST.title);
    ['Mill raised prices July 1. Containerboard bar = $/ton increase × tons we run a quarter (Products page).',
      'Freight is the residual. Calculate it, don\'t type it.', "DON'T plug the containerboard bar.",
      'Volume and price from Tom\'s sales cube (the Access database. Yes. Access.)', 'Labor −20 = overtime on the 2nd shift ramp.',
      'Chart updates itself when the ?? cells are filled. I am not redrawing it by hand again.'].forEach((t, i) => { N.set('A' + (3 + i), '•', { al: 'r' }); N.set('B' + (3 + i), t, i < 3 ? { b: i === 2 } : {}); });
    N.set('B11', '—F, 1:12 AM', ST.note);
    return new Book('Q3_EBITDA_Bridge.xls', [S.sh, P.sh, N.sh]);
  }
  function bridgeChartSVG(book) {
    const si = book.idx('Bridge');
    const g = r => book.get(si, r, 2);
    const items = [['Q3 Budget', g(5), 1], ['Volume', g(6)], ['Price', g(7)], ['Container-board', g(8)], ['Labor', g(9)], ['Freight', g(10)], ['Q3 Actual', g(11), 1]];
    const num = v => typeof v === 'number' && isFinite(v);
    const bud = num(items[0][1]) ? items[0][1] : 0, act = num(items[6][1]) ? items[6][1] : 0;
    const known = items.slice(1, 6).filter(x => num(x[1])).reduce((a, x) => a + x[1], 0);
    const unk = items.slice(1, 6).filter(x => !num(x[1])).length;
    let run = bud;
    const bars = items.map(([l, v, tot]) => {
      if (tot) return { l, lo: 0, hi: v, v, tot: 1, ok: num(v) };
      const ok = num(v);
      if (!ok) return { l, lo: run, hi: run, v: 0, ok, unk: 1 };
      const a = run; run += v;
      return { l, lo: Math.min(a, run), hi: Math.max(a, run), v, ok, neg: v < 0 };
    });
    const lv = bars.filter(b => !b.tot).flatMap(b => [b.lo, b.hi]).concat([bud, act]);
    let mn = Math.min(...lv), mx = Math.max(...lv);
    let lo = 0, hi = Math.ceil((mx + 30) / 100) * 100;
    if (hi - lo < 200) hi = lo + 200;
    const step = (hi - lo) / 100 > 6 ? Math.ceil((hi - lo) / 600) * 100 : 50 * ((hi - lo) > 300 ? 2 : 1);
    const W = 470, H = 290, px0 = 52, px1 = W - 14, py0 = 38, py1 = H - 46;
    const y = v => py1 - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (py1 - py0);
    const slot = (px1 - px0) / bars.length, bw = slot * 0.62;
    const fmtL = v => (v < 0 ? '(' + Math.round(-v) + ')' : String(Math.round(v)));
    let s = `<svg class="xl-chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">
      <defs><pattern id="xlhatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#e0e0e0"/><line x1="0" y1="0" x2="0" y2="6" stroke="#808080" stroke-width="2.2"/></pattern></defs>
      <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="#fff" stroke="#000"/>
      <text x="${W / 2}" y="22" text-anchor="middle" font-size="13" font-weight="bold">Q3 2026 EBITDA Bridge ($K)</text>
      <rect x="${px0}" y="${py0}" width="${px1 - px0}" height="${py1 - py0}" fill="#C0C0C0" stroke="#808080"/>`;
    for (let v = lo; v <= hi + 0.01; v += step) {
      const yy = y(v).toFixed(1);
      s += `<line x1="${px0}" x2="${px1}" y1="${yy}" y2="${yy}" stroke="#000" stroke-width="${v === lo ? 1 : 0.6}"/><text x="${px0 - 5}" y="${+yy + 4}" text-anchor="end" font-size="10">${v.toLocaleString('en-US')}</text>`;
    }
    bars.forEach((b, i) => {
      const x = px0 + slot * i + (slot - bw) / 2;
      let yt = y(b.hi), yb = b.tot ? y(lo) : y(b.lo);
      if (b.unk) { yt = y(b.hi) - 9; yb = y(b.hi) + 9; }
      const fill = !b.ok ? 'url(#xlhatch)' : b.tot ? '#9999FF' : b.neg ? '#FF8080' : '#99CC00';
      s += `<rect x="${x.toFixed(1)}" y="${yt.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, yb - yt).toFixed(1)}" fill="${fill}" stroke="${b.ok ? '#000' : '#606060'}" ${b.ok ? '' : 'stroke-dasharray="3,2"'}/>`;
      const lab = !b.ok ? '??' : fmtL(b.v);
      const ly = b.unk ? yb + 12 : b.tot || !b.neg ? yt - 4 : yb + 12;
      s += `<text x="${(x + bw / 2).toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="11" font-weight="${b.ok ? 'normal' : 'bold'}" fill="${b.ok ? '#000' : '#C00000'}">${lab}</text>`;
      if (i < bars.length - 1 && !bars[i + 1].tot) {
        const lvl = b.tot ? b.hi : (b.neg ? b.lo : b.hi);
        s += `<line x1="${(x + bw).toFixed(1)}" x2="${(x + slot).toFixed(1)}" y1="${y(lvl).toFixed(1)}" y2="${y(lvl).toFixed(1)}" stroke="#404040" stroke-width="0.7"/>`;
      }
      const parts = b.l.split('-');
      parts.forEach((p, k) => (s += `<text x="${(x + bw / 2).toFixed(1)}" y="${py1 + 14 + k * 12}" text-anchor="middle" font-size="10">${p}${k < parts.length - 1 ? '-' : ''}</text>`));
    });
    return s + '</svg>';
  }

  function esportsBook() {
    const S = sheet('Practice log', { nc: 10, nr: 36 });
    S.w({ A: 78, B: 190, C: 64, D: 64, E: 64, F: 330 });
    S.h(1, 22);
    S.set('A1', 'EXCEL ESPORTS — PRACTICE LOG', { b: 1, fs: 14, fc: '#003366' });
    S.set('A2', 'Team: Cheat Sheet Kings (F.W. + K.B.) · season 2026', { b: 1, fc: '#003366' });
    S.set('A3', "Qualifier: LAS · Oct 19–21 · DON'T TELL DREW. DON'T TELL RACHEL.", { b: 1, fc: RED, bg: '#FFFF00' }); S.style('B3:E3', { bg: '#FFFF00' });
    S.row('A5', ['Date', 'Drill', 'Time', 'Target', 'Δ target', 'Notes'], ST.hdrL);
    S.style('C5:E5', { al: 'r' });
    const log = [['09/02', 'INDEX/MATCH speedrun', 142.6, ''], ['09/04', 'INDEX/MATCH speedrun', 131.2, 'fumbled the $ anchors'], ['09/05', 'Lookup relay', 305.4, ''],
      ['09/09', 'INDEX/MATCH speedrun', 118.9, 'new PB!!'], ['09/11', 'Lookup relay', 288.0, ''], ['09/15', 'Pivot sprint', 201.7, 'Drew walked by. Alt-Tabbed to the budget.'],
      ['09/18', 'INDEX/MATCH speedrun', 112.4, 'PB. F4 muscle memory finally there'], ['09/22', 'Lookup relay', 262.3, ''], ['09/25', 'Modeling case (airline)', 1842.0, 'ran out of time on the debt schedule. again.'],
      ['09/29', 'INDEX/MATCH speedrun', 109.8, 'sub-1:50 !!!'], ['10/01', 'Lookup relay', 251.9, 'sub-4:15. LET\'S GO'], ['10/03', 'INDEX/MATCH speedrun', 107.1, '1:15 AM. ready.']];
    const tgt = { 'INDEX/MATCH speedrun': 110, 'Lookup relay': 255, 'Pivot sprint': 190, 'Modeling case (airline)': 1800 };
    log.forEach(([d, k, t, n], i) => {
      const r = 6 + i;
      S.set('A' + r, "'" + d + '/2026'); S.set('B' + r, k); S.set('C' + r, t, { fc: BLUE, f: 'ms1' }); S.set('D' + r, tgt[k], { f: 'ms1', fc: BLUE }); S.set('E' + r, `=C${r}-D${r}`, { f: 'ms1' }); if (n) S.set('F' + r, n, ST.note);
    });
    S.cond('E6:E17', v => typeof v === 'number' && v <= 0, { fc: '#006100', bg: '#C6EFCE' });
    S.set('A19', 'Best INDEX/MATCH', { b: 1 }); S.set('C19', '=MIN(C6,C7,C9,C12,C15,C17)', { b: 1, f: 'ms1' });
    S.set('A20', 'Best Lookup relay', { b: 1 }); S.set('C20', '=MIN(C8,C10,C13,C16)', { b: 1, f: 'ms1' });
    S.cm('A3', FRANK, "Out-of-office NOT on. If Drew sees 'Excel' and 'championship' in one sentence he'll want to come.");
    const P = sheet('Packing list', { nc: 6, nr: 30 });
    P.w({ A: 30, B: 380 });
    P.h(1, 20);
    P.set('A1', 'Packing list (qualifier trip)', ST.title);
    ['lucky keyboard (the one with the sticky scroll wheel)', 'wrist brace', 'printed shortcut cheat sheet (laminated)', 'charger', 'boarding pass — PRINT IT, the app never works', 'pack: laptop (the work one. obviously) (Diane will call)', 'leave the Board Pack somewhere they can find it (they will. right?)'].forEach((t, i) => { P.set('A' + (3 + i), '☐', { al: 'c' }); P.set('B' + (3 + i), t); });
    const K = sheet('Shortcuts', { nc: 6, nr: 30 });
    K.w({ A: 150, B: 330 });
    K.h(1, 20);
    K.set('A1', 'Shortcuts I keep forgetting', ST.title);
    [['F2', 'edit cell'], ['F4', 'toggle $ anchors'], ['Alt + =', 'AutoSum'], ['Ctrl + Arrow', 'jump to edge of data'], ['Shift + Arrow', 'extend selection (status bar shows Sum=)'], ['Ctrl + ;', "today's date"], ['Ctrl + `', 'show formulas'], ['Ctrl + Z', 'undo (the most important one)']].forEach(([a, b], i) => { K.set('A' + (3 + i), a, { b: 1 }); K.set('B' + (3 + i), b); });
    return new Book('speedrun_practice.xls', [S.sh, P.sh, K.sh]);
  }

  /* ---------- Kristians fan club (pure flavour) ---------- */
  function barChartSVG(o) {
    return book => {
      const si = book.idx(o.sheet);
      const items = o.rows.map(r => ({ l: (o.prefix || '') + String(book.get(si, r, o.lc) ?? ''), v: book.get(si, r, o.vc) })).filter(x => typeof x.v === 'number');
      const W = o.w, H = o.h, px0 = 34, px1 = W - 10, py0 = 34, py1 = H - 52;
      const hi = o.max || Math.max(1, ...items.map(x => x.v)), slot = (px1 - px0) / Math.max(1, items.length), bw = slot * 0.6;
      const y = v => py1 - (Math.max(0, Math.min(hi, v)) / hi) * (py1 - py0);
      let s = `<svg class="xl-chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif">
        <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="#fff" stroke="#000"/>
        <text x="${W / 2}" y="21" text-anchor="middle" font-size="13" font-weight="bold">${esc(o.title)}</text>
        <rect x="${px0}" y="${py0}" width="${px1 - px0}" height="${py1 - py0}" fill="#C0C0C0" stroke="#808080"/>`;
      for (let v = 0; v <= hi + 1e-9; v += o.step || 2) { const yy = y(v).toFixed(1); s += `<line x1="${px0}" x2="${px1}" y1="${yy}" y2="${yy}" stroke="#000" stroke-width="${v ? 0.6 : 1}"/><text x="${px0 - 4}" y="${+yy + 4}" text-anchor="end" font-size="10">${v}</text>`; }
      items.forEach((it, i) => {
        const x = px0 + slot * i + (slot - bw) / 2, yt = y(it.v);
        s += `<rect x="${x.toFixed(1)}" y="${yt.toFixed(1)}" width="${bw.toFixed(1)}" height="${(py1 - yt).toFixed(1)}" fill="${it.v >= 10 ? '#FF6600' : '#9999FF'}" stroke="#000"/>`;
        s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(yt - 3).toFixed(1)}" text-anchor="middle" font-size="10">${it.v}</text>`;
        s += `<text x="${(x + bw / 2).toFixed(1)}" y="${py1 + 13}" text-anchor="middle" font-size="10">${esc(it.l.slice(0, 9))}</text>`;
      });
      if (o.foot) s += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" font-size="10" font-style="italic" fill="#555">${esc(o.foot)}</text>`;
      return s + '</svg>';
    };
  }
  function rankedBook() {
    const S = sheet('RANKED', { nc: 16, nr: 50, tabColor: '#FF6600' });
    S.w({ A: 44, B: 230, C: 84, D: 50, E: 50, F: 80, G: 96, H: 300 });
    S.h(1, 22);
    S.set('A1', "KRISTIANS BUŠĀRS' CHEAT SHEETS — RANKED", { b: 1, fs: 14, fc: '#003366' });
    S.set('A2', 'Master of cheat sheets. King of macros. All 212, rated by FW. (Selected rows; full list in my heart.) Numbers per the fan page.', ST.stamp);
    S.row('A4', ['#', 'Cheat sheet', 'Posted', 'Clarity', 'Wow', 'Wall-worthy', 'Life-changing', "Frank's notes"], ST.hdrL);
    S.style('C4:G4', { al: 'r' });
    const L = [
      [1, 'Ctrl+Z (a beginning)', [2019, 3, 3], 7, 6, 6, 'where it all began'],
      [7, 'Absolute vs relative refs ($)', [2019, 5, 14], 8, 7, 7, 'F4. F4. F4.'],
      [19, 'SUMIFS in 60 seconds', [2019, 11, 3], 8, 7, 8, ''],
      [33, 'INDEX/MATCH', [2020, 6, 21], 9, 9, 9, 'retired VLOOKUP that night'],
      [61, '50 Ctrl shortcuts', [2021, 4, 9], 9, 8, 9, 'laminated'],
      [88, 'XLOOKUP', [2022, 2, 14], 10, 10, 9, 'cried a little'],
      [104, 'Dynamic arrays', [2022, 9, 30], 9, 10, 8, 'spill! SPILL!'],
      [121, 'LET', [2023, 3, 17], 9, 8, 8, 'naming things. like a grown-up'],
      [137, 'FILTER + SORT', [2023, 8, 8], 9, 9, 8, ''],
      [147, 'Pivot tables for people who fear pivot tables', [2024, 6, 17], 8, 8, 7, 'there were tears'],
      [150, 'Power Query for finance', [2024, 7, 22], 8, 9, 7, 'Drew: "is that a virus"'],
      [168, 'LAMBDA', [2024, 10, 5], 10, 10, 9, 'the model would be 12 tabs, not 47'],
      [181, 'Data validation that people respect', [2025, 1, 12], 7, 7, 6, 'Drew does not respect it'],
      [188, 'Absolute References: F4 and you', [2025, 2, 10], 9, 9, 10, 'F4. F4. F4. (the sequel)'],
      [199, 'Keyboard-only modeling', [2026, 1, 12], 9, 10, 10, 'mouse is for quitters'],
      [211, 'XLOOKUP vs INDEX/MATCH: the final word (it\'s XLOOKUP)', [2026, 8, 4], 9, 8, 8, 'I still use INDEX/MATCH. Sorry.'],
      [212, 'The Ultimate FP&A Formula Poster — 47 formulas, dynamic arrays', [2026, 9, 1], 10, 10, 10, '— posted 09/01. On my wall since 09/02.'],
    ];
    L.forEach(([n, t, d, a, b, c, note], i) => {
      const r = 5 + i;
      S.set('A' + r, "'#" + String(n).padStart(3, '0'), { al: 'r', b: 1 }); S.set('B' + r, t); S.set('C' + r, serial(...d), { f: 'ymd', al: 'r' });
      S.set('D' + r, a, { fc: BLUE }); S.set('E' + r, b, { fc: BLUE }); S.set('F' + r, c, { fc: BLUE });
      S.set('G' + r, `=ROUND(AVERAGE(D${r}:F${r}),1)`, { b: 1, f: 'n1' });
      if (note) S.set('H' + r, (n === 212 ? '#212 ' : '') + note, ST.note);
    });
    S.cond('G5:G21', v => typeof v === 'number' && v >= 9.5, { bg: '#FFEB9C', fc: '#9C5700' });
    S.style('B10', { b: 1 }); S.style('B21', { b: 1 });
    S.set('A23', 'Average life-changing score', { b: 1 }); S.set('G23', '=ROUND(AVERAGE(G5:G21),2)', M(ST.tot, { f: 'n2' }));
    S.set('A24', 'Sheets scoring a perfect 10', { b: 1 }); S.set('G24', '=COUNTIF(G5:G21,">=10")', { b: 1, al: 'r' });
    S.cm('B21', FRANK, 'Printed it poster-size (48×36). It covers the wall behind my desk. Completely. Nobody needs to know what else is back there.');
    S.cm('E10', FRANK, 'Should be an 11. Excel won\'t let me. (Data validation, #181.)');
    S.chart({ at: 'B26', dx: 0, dy: 0, w: 460, h: 260, render: barChartSVG({ w: 460, h: 260, sheet: 'RANKED', rows: [7, 9, 10, 15, 17, 18, 20], lc: 0, vc: 6, max: 10, step: 2, title: 'Life-changing score (top picks)', foot: 'orange = perfect 10' }) });
    const W2 = sheet('Webinars attended', { nc: 10, nr: 30 });
    W2.w({ A: 82, B: 300, C: 80, D: 90, E: 320 });
    W2.h(1, 20);
    W2.set('A1', 'Webinars attended (live, camera off, taking notes)', ST.title);
    W2.row('A3', ['Date', 'Webinar', 'Questions I asked', 'He answered?', 'Notes'], ST.hdrL); W2.style('C3:D3', { al: 'r' });
    [[[2024, 3, 12], 'XLOOKUP deep dive', 1, 'No', 'typed too slow'], [[2024, 9, 26], 'LAMBDA for mortals', 2, 'No', ''], [[2025, 2, 18], 'Speedrunning INDEX/MATCH: under 4 seconds per lookup', 3, 'Yes', 'HE READ MY QUESTION OUT LOUD'], [[2026, 5, 12], 'Dynamic arrays: SORTBY, FILTER, and letting go', 2, 'No', ''], [[2026, 1, 29], 'Protect the sheet. Protect your soul. (Q&A)', 4, 'Yes', '"great question." mine. no name yet.'], [[2026, 6, 11], 'Road to the Excel World Championship', 5, 'Yes', 'asked if he needs a teammate. he said "DM me"'], [[2026, 9, 24], 'LAMBDA Night (live)', 3, 'Yes', '"Frank from Sedalia asks…" — at 1:12:40. MY NAME. #212 is the poster now.']].forEach(([d, t, q, a, n], i) => {
      const r = 4 + i; W2.set('A' + r, serial(...d), { f: 'ymd', al: 'l' }); W2.set('B' + r, t); W2.set('C' + r, q, { fc: BLUE }); W2.set('D' + r, a, { al: 'r' }); if (n) W2.set('E' + r, n, ST.note);
    });
    W2.set('A11', 'Webinars attended', { b: 1 }); W2.set('C11', '=COUNTA(B4:B10)', ST.tot);
    W2.set('A12', 'Questions I asked', { b: 1 }); W2.set('C12', '=SUM(C4:C10)', { b: 1, f: 'n0' });
    W2.set('A13', 'Times he answered', { b: 1 }); W2.set('C13', '=COUNTIF(D4:D10,"Yes")', { b: 1, al: 'r' });
    W2.set('A14', 'Times he said my name', { b: 1 }); W2.set('C14', 1, { b: 1, fc: RED }); W2.set('D14', "(!!!) — 2026-09-24, LAMBDA Night: 'Frank from Sedalia…'", { b: 1, fc: RED });
    W2.set('A16', 'I DMed him. He DMed back. Team name TBD. —F', ST.note);
    return new Book('Kristians_cheat_sheets_RANKED.xls', [S.sh, W2.sh]);
  }
  function v2Book() {
    const S = sheet('Sheet1 (Recovered)', { nc: 14, nr: 40 });
    S.w({ A: 150, B: 40, C: 40, D: 40, E: 40, F: 64 });
    S.set('A1', 'Packa Corporation — FY2027 Budget v2', ST.title);
    S.set('A2', '[Repaired] — formulas removed', ST.red);
    const lab = ['Revenue', 'COGS', 'Gross profit', 'SG&A', 'Rent & leases', 'Other opex', 'EBITDA', 'D&A', 'EBIT'];
    lab.forEach((l, i) => {
      const r = 4 + i; S.set('A' + r, l);
      ['B', 'C', 'D', 'E'].forEach((c, j) => S.set(c + r, (i + j) % 3 === 0 ? 40000000 + i * 1111 : '#REF!', ST.calc));
      S.set('F' + r, i % 2 ? '#REF!' : '#VALUE!');
    });
    S.set('A14', 'note to self: never merge cells again', ST.note);
    S.set('A15', 'v2 is dead. long live v3. and v4. and v5. and...', ST.note);
    S.set('H4', '#NAME?'); S.set('H5', '#DIV/0!'); S.set('H6', '#N/A');
    return new Book('Budget_FY27_v2.xls', [S.sh, sheet('Sheet2').sh, sheet('Sheet3').sh]);
  }
  function blankBook(n) {
    return new Book('Book' + n, [sheet('Sheet1', { nc: 26, nr: 100 }).sh, sheet('Sheet2', { nc: 26, nr: 100 }).sh, sheet('Sheet3', { nc: 26, nr: 100 }).sh]);
  }
  XL.books = { rankedBook, budgetBook, boardBook, covenantBook, cashBook, bridgeBook, esportsBook, v2Book, blankBook, packBook, changelogBook, model47Book, forBoardBook, VERS };

  /* =====================================================================
     Number display
     ===================================================================== */
  const commas = (x, d) => { const [i, f] = x.toFixed(d).split('.'); return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? '.' + f : ''); };
  function fmtNum(v, f) {
    switch (f) {
      case 'n0': case 'n1': case 'n2': {
        const d = +f[1];
        if (Math.abs(v) < 0.5 * Math.pow(10, -d)) return { t: '-', pad: 1 };
        const s = commas(Math.abs(v), d);
        return v < 0 ? { t: '(' + s + ')' } : { t: s, pad: 1 };
      }
      case 'p0': case 'p1': case 'p2': { const d = +f[1]; const s = commas(Math.abs(v) * 100, d) + '%'; return { t: (v < 0 && Math.abs(v) * 100 >= 0.5 * Math.pow(10, -d) ? '-' : '') + s }; }
      case 'x1': case 'x2': { const d = +f[1]; const s = Math.abs(v).toFixed(d) + 'x'; return v < 0 ? { t: '(' + s + ')' } : { t: s, pad: 1 }; }
      case 'ms1': { const neg = v < 0; const x = Math.round(Math.abs(v) * 10) / 10; const m = Math.floor(x / 60), sec = (x - m * 60).toFixed(1).padStart(4, '0'); return { t: (neg ? '-' : '') + m + ':' + sec }; }
      case 'int': return { t: String(Math.round(v)) };
      case 'days': return { t: commas(Math.round(v), 0) + ' days' };
      case 'date': case 'ymd': { const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate(); return { t: f === 'ymd' ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : `${m}/${d}/${y}` }; }
      case 'c0': return { t: (v < 0 ? '-' : '') + commas(Math.abs(v), 0) };
      case 'c2': return { t: (v < 0 ? '-' : '') + commas(Math.abs(v), 2) };
      default: {
        const s = genNum(v);
        if (s.replace('-', '').replace('.', '').length > 11 && !Number.isInteger(v)) return { t: String(parseFloat(v.toPrecision(9))) };
        return { t: s };
      }
    }
  }
  XL.fmtNum = fmtNum;
  const decFmt = (f, dir) => {
    const map = { n0: ['n1', 'n0'], n1: ['n2', 'n0'], n2: ['n2', 'n1'], p0: ['p1', 'p0'], p1: ['p2', 'p0'], p2: ['p2', 'p1'], x1: ['x2', 'x1'], x2: ['x2', 'x1'], c0: ['c2', 'c0'], c2: ['c2', 'c0'] };
    const m = map[f || ''] || ['n1', 'n0'];
    return m[dir > 0 ? 0 : 1];
  };

  /* =====================================================================
     UI
     ===================================================================== */
  if (typeof document === 'undefined') return; // node tests stop here
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = h => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
  const PX = pt => (pt * 4) / 3;
  const RHW = 30, CHH = 18, DEFW = 64, DEFH = 17;
  let mctx = null;
  const measure = (text, s) => {
    if (!mctx) mctx = document.createElement('canvas').getContext('2d');
    mctx.font = `${s.i ? 'italic ' : ''}${s.b ? 'bold ' : ''}${PX(s.fs || 10)}px Arial, "Liberation Sans", Helvetica, sans-serif`;
    return mctx.measureText(text).width;
  };

  // toolbar icons (16x16, original drawings)
  const I = (b) => `<svg viewBox="0 0 16 16" width="16" height="16" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;
  const TI = {
    new: I('<path d="M3 1.5h7l3 3v10H3z" fill="#fff" stroke="#6a7a90"/><path d="M10 1.5v3h3" fill="#dde" stroke="#6a7a90"/>'),
    open: I('<path d="M1 4h5l1 1.5h7V13H1z" fill="#f5cf5a" stroke="#a27a18"/><path d="M1 13l2.5-6h12L13 13z" fill="#fde28a" stroke="#a27a18"/>'),
    save: I('<rect x="1.5" y="1.5" width="13" height="13" rx="1" fill="#4b6fb8" stroke="#233e7a"/><rect x="4" y="1.5" width="8" height="5" fill="#fff" stroke="#233e7a" stroke-width=".6"/><rect x="4" y="9" width="8" height="5.5" fill="#d8d8d8"/><rect x="9.5" y="2.5" width="1.5" height="3" fill="#233e7a"/>'),
    print: I('<rect x="4" y="1.5" width="8" height="5" fill="#fff" stroke="#555"/><rect x="1.5" y="6" width="13" height="6" rx="1" fill="#c8c8c8" stroke="#555"/><rect x="4" y="10" width="8" height="4.5" fill="#fff" stroke="#555"/><circle cx="12.5" cy="8" r=".8" fill="#3a3"/>'),
    preview: I('<path d="M2 1.5h7l2 2v11H2z" fill="#fff" stroke="#6a7a90"/><circle cx="10" cy="9.5" r="3.2" fill="#dff" stroke="#335"/><path d="M12.3 11.8l2.5 2.5" stroke="#335" stroke-width="2"/>'),
    spell: I('<text x="1" y="8" font-size="7" font-family="Arial" font-weight="bold" fill="#224">ABC</text><path d="M4 11l3 3 7-7" stroke="#2a8a2a" stroke-width="2" fill="none"/>'),
    cut: I('<circle cx="4.5" cy="12" r="2.3" fill="none" stroke="#223" stroke-width="1.3"/><circle cx="11.5" cy="12" r="2.3" fill="none" stroke="#223" stroke-width="1.3"/><path d="M6 10.3L11.5 1.5M10 10.3L4.5 1.5" stroke="#6a7a90" stroke-width="1.4"/>'),
    copy: I('<path d="M1.5 1.5h6l2 2v7h-8z" fill="#fff" stroke="#6a7a90"/><path d="M6.5 5.5h6l2 2v7h-8z" fill="#fff" stroke="#6a7a90"/>'),
    paste: I('<rect x="2" y="2.5" width="9" height="12" rx="1" fill="#c9a060" stroke="#7a5a20"/><rect x="4.5" y="1.5" width="4" height="2.5" fill="#ddd" stroke="#555"/><path d="M7 6.5h5l2 2v6H7z" fill="#fff" stroke="#6a7a90"/>'),
    painter: I('<rect x="2" y="2" width="10" height="4" rx="1" fill="#e7b83a" stroke="#8a6a10"/><path d="M12 4h2v4H8v2" fill="none" stroke="#555"/><rect x="7" y="10" width="2" height="5" fill="#8a5a2a"/>'),
    undo: I('<path d="M4 6h6a4 4 0 010 8H6" fill="none" stroke="#1e4fa8" stroke-width="1.8"/><path d="M1 6l4-4v8z" fill="#1e4fa8"/>'),
    redo: I('<path d="M12 6H6a4 4 0 000 8h4" fill="none" stroke="#1e4fa8" stroke-width="1.8"/><path d="M15 6l-4-4v8z" fill="#1e4fa8"/>'),
    link: I('<circle cx="8" cy="8" r="6.3" fill="#8fc0f0" stroke="#2a5aa8"/><path d="M2 8h12M8 2c-3 3-3 9 0 12M8 2c3 3 3 9 0 12" stroke="#2a5aa8" fill="none" stroke-width=".8"/>'),
    sum: I('<path d="M3.5 2.5h9v2.5M3.5 2.5l5 5.5-5 5.5h9V11" fill="none" stroke="#223" stroke-width="1.6"/>'),
    sortA: I('<text x="1" y="7" font-size="6.5" font-family="Arial" font-weight="bold" fill="#1e4fa8">A</text><text x="1" y="15" font-size="6.5" font-family="Arial" font-weight="bold" fill="#b02020">Z</text><path d="M12 2v11M9.5 10.5L12 14l2.5-3.5" stroke="#223" fill="none" stroke-width="1.3"/>'),
    sortZ: I('<text x="1" y="7" font-size="6.5" font-family="Arial" font-weight="bold" fill="#b02020">Z</text><text x="1" y="15" font-size="6.5" font-family="Arial" font-weight="bold" fill="#1e4fa8">A</text><path d="M12 2v11M9.5 10.5L12 14l2.5-3.5" stroke="#223" fill="none" stroke-width="1.3"/>'),
    chart: I('<rect x="1.5" y="1.5" width="13" height="13" fill="#fff" stroke="#6a7a90"/><rect x="3" y="8" width="2.5" height="5.5" fill="#1e4fa8"/><rect x="6.8" y="4" width="2.5" height="9.5" fill="#d33"/><rect x="10.6" y="6" width="2.5" height="7.5" fill="#e8c020"/>'),
    draw: I('<path d="M2 14l2-5 7-7 3 3-7 7z" fill="#f0c040" stroke="#664"/><path d="M2 14l2-5 3 3z" fill="#fbe0b0" stroke="#664"/>'),
    help: I('<circle cx="8" cy="8" r="6.5" fill="#fff" stroke="#1e4fa8"/><text x="8" y="12" text-anchor="middle" font-size="10" font-family="Arial" font-weight="bold" fill="#1e4fa8">?</text>'),
    alL: I('<path d="M2 3h12M2 6h8M2 9h12M2 12h8" stroke="#223" stroke-width="1.2"/>'),
    alC: I('<path d="M2 3h12M4 6h8M2 9h12M4 12h8" stroke="#223" stroke-width="1.2"/>'),
    alR: I('<path d="M2 3h12M6 6h8M2 9h12M6 12h8" stroke="#223" stroke-width="1.2"/>'),
    merge: I('<rect x="1.5" y="3.5" width="13" height="9" fill="#fff" stroke="#6a7a90"/><path d="M3 8h10M3 8l2-2M3 8l2 2M13 8l-2-2M13 8l-2 2" stroke="#1e4fa8" fill="none"/>'),
    cur: I('<text x="8" y="13" text-anchor="middle" font-size="12" font-family="Arial" font-weight="bold" fill="#1a6a1a">$</text>'),
    pct: I('<text x="8" y="12.5" text-anchor="middle" font-size="11" font-family="Arial" font-weight="bold" fill="#223">%</text>'),
    comma: I('<text x="8" y="12" text-anchor="middle" font-size="14" font-family="Arial" font-weight="bold" fill="#223">,</text>'),
    decUp: I('<text x="0" y="7" font-size="6" font-family="Arial" fill="#223">.0</text><text x="4" y="14.5" font-size="6" font-family="Arial" fill="#223">.00</text><path d="M1 10l2 3" stroke="#1e4fa8"/>'),
    decDn: I('<text x="0" y="7" font-size="6" font-family="Arial" fill="#223">.00</text><text x="7" y="14.5" font-size="6" font-family="Arial" fill="#223">.0</text><path d="M3 10l2 3" stroke="#1e4fa8"/>'),
    indL: I('<path d="M7 3h7M7 6h7M7 9h7M7 12h7M1.5 7.5l3-2.5v5z" stroke="#223" fill="#1e4fa8"/>'),
    indR: I('<path d="M7 3h7M7 6h7M7 9h7M7 12h7M4.5 7.5l-3-2.5v5z" stroke="#223" fill="#1e4fa8"/>'),
    border: I('<rect x="2" y="2" width="12" height="12" fill="#fff" stroke="#aaa" stroke-dasharray="1,1"/><path d="M2 14h12" stroke="#000" stroke-width="2"/>'),
    fill: I('<path d="M3 7l5-5 5 5-5 5z" fill="#fff" stroke="#333"/><path d="M13 8c1 2 1 3 0 3s-1-1 0-3z" fill="#333"/><rect x="1" y="13" width="14" height="3" fill="#FFFF00"/>'),
    font: I('<text x="8" y="11" text-anchor="middle" font-size="11" font-family="Times New Roman" font-weight="bold" fill="#223">A</text><rect x="1" y="13" width="14" height="3" fill="#FF0000"/>'),
    arr: '<svg viewBox="0 0 7 4" width="7" height="4"><path d="M0 0h7L3.5 4z" fill="#000"/></svg>',
  };

  let bookCounter = 0;

  function openWorkbook(book, opts = {}) {
    const st = { si: 0, ar: 0, ac: 0, anchor: { r: 0, c: 0 }, focus: { r: 0, c: 0 }, edit: null, tinted: [], hs: [], undo: [], redo: [], dirty: false, circWarned: false, showCm: false, fbar: true, drag: false, clip: null, closed: false };
    const app = $(`<div class="xl-app">
      <div class="xl-dock">
        <div class="xl-tb xl-tb-std"></div>
        <div class="xl-tb xl-tb-fmt"></div>
      </div>
      <div class="xl-fbar">
        <div class="xl-nb"><input class="xl-nb-in" spellcheck="false"><span class="xl-nb-arr">${TI.arr}</span></div>
        <span class="xl-fbtn xl-fx-x" title="Cancel">✕</span><span class="xl-fbtn xl-fx-ok" title="Enter">✓</span>
        <span class="xl-fbtn xl-fx" title="Insert Function"><i>f</i>x</span>
        <input class="xl-fin" spellcheck="false" autocomplete="off">
      </div>
      <div class="xl-main"><div class="xl-scroll" tabindex="0"><div class="xl-wrap"><table class="xl-grid"></table>
        <div class="xl-rangetint"></div><div class="xl-selbox"><div class="xl-fillh"></div></div><div class="xl-pointbox"></div><div class="xl-copybox"></div>
        <input class="xl-editor" spellcheck="false" autocomplete="off"><div class="xl-objs"></div><div class="xl-cmtip"></div>
      </div></div></div>
      <div class="xl-tabbar"><div class="xl-tabnav"><span data-n="first">${navSvg('first')}</span><span data-n="prev">${navSvg('prev')}</span><span data-n="next">${navSvg('next')}</span><span data-n="last">${navSvg('last')}</span></div><div class="xl-tabs"></div><div class="xl-hsplit"></div><div class="xl-hfill"></div></div>
      <div class="xl-status"><span class="xl-st-mode">Ready</span><span class="xl-st-sum"></span><span class="xl-st-box">NUM</span><span class="xl-st-box xl-st-e"></span></div>
    </div>`);
    const q = s => app.querySelector(s);
    const scroll = q('.xl-scroll'), wrap = q('.xl-wrap'), selbox = q('.xl-selbox'), editor = q('.xl-editor'), fillh = q('.xl-fillh');
    let table = q('.xl-grid');
    const tcache = new Map(); // per-sheet rendered grid (sheet switch = swap the table node)
    const fin = q('.xl-fin'), nbin = q('.xl-nb-in'), tabsEl = q('.xl-tabs'), objs = q('.xl-objs'), cmtip = q('.xl-cmtip'), pointbox = q('.xl-pointbox'), copybox = q('.xl-copybox');
    const stMode = q('.xl-st-mode'), stSum = q('.xl-st-sum');
    let tds = [], colTh = [], rowTh = [], colX = [], colWd = [], rowY = [], rowHt = [], NR = 0, NC = 0;

    const title = 'Microsoft Excel - ' + book.name;
    const W = Math.min(960, window.innerWidth - 30), H = Math.min(640, window.innerHeight - 70);
    const win = FR.wm.open({
      id: opts.id, title, icon: 'excel', width: W, height: H, className: 'xl-win', content: app, menu: buildMenu(),
      onClose: () => {
        st.closed = true; return true; // read-only files: close silently (the checklist keeps what matters)
      },
    });
    const mb = win.el.querySelector('.fr-menubar');
    if (mb) {
      const hb = $('<div class="xl-askbox"><input placeholder="Type a question for help" spellcheck="false"><span>' + TI.arr + '</span></div>');
      mb.appendChild(hb);
      const hi = hb.querySelector('input');
      hi.addEventListener('mousedown', e => e.stopPropagation());
      hi.onkeydown = e => { if (e.key === 'Enter') { hi.value = ''; FR.dialog({ icon: 'info', title: 'Microsoft Excel Help', message: 'Microsoft Office Online could not be reached.<br><br>Check your network connection and try again.' }); } };
    }

    /* ---------- toolbar ---------- */
    const tb = (el, items) => {
      el.innerHTML = '<span class="xl-grip"></span>';
      items.forEach(it => {
        if (it === '|') { el.appendChild($('<span class="xl-tsep"></span>')); return; }
        if (it.sel) {
          const s = $(`<select class="xl-tsel" style="width:${it.w}px" title="${it.tip}">${it.sel.map(o => `<option${o === it.v ? ' selected' : ''}>${o}</option>`).join('')}</select>`);
          s.onchange = () => it.on && it.on(s.value);
          s.addEventListener('mousedown', e => e.stopPropagation());
          el.appendChild(s); return;
        }
        const b = $(`<span class="xl-tbtn${it.dd ? ' xl-dd' : ''}" title="${it.tip}">${it.txt ? `<b class="xl-tt" style="${it.css || ''}">${it.txt}</b>` : TI[it.i]}${it.dd ? '<span class="xl-ddarr">' + TI.arr + '</span>' : ''}</span>`);
        b.onmousedown = e => e.preventDefault();
        b.onclick = () => { FR.sound.play('click'); it.on && it.on(); focusGrid(); };
        el.appendChild(b);
      });
      el.appendChild($('<span class="xl-tbend"></span>'));
    };
    const soon = what => () => FR.dialog({ icon: 'info', title: 'Microsoft Excel', message: what });
    tb(q('.xl-tb-std'), [
      { i: 'new', tip: 'New', on: () => FR.apps.excel(null) }, { i: 'open', tip: 'Open', on: soon("Use My Computer or My Documents to open Frank's files.") }, { i: 'save', tip: 'Save', on: saveMsg }, '|',
      { i: 'print', tip: 'Print', on: printMsg }, { i: 'preview', tip: 'Print Preview', on: printMsg }, { i: 'spell', tip: 'Spelling', on: soon('The spelling check is complete for the entire sheet.') }, '|',
      { i: 'cut', tip: 'Cut', on: () => copySel(true) }, { i: 'copy', tip: 'Copy', on: () => copySel(false) }, { i: 'paste', tip: 'Paste', on: () => pasteClip() }, { i: 'painter', tip: 'Format Painter' }, '|',
      { i: 'undo', tip: 'Undo', dd: 1, on: undo }, { i: 'redo', tip: 'Redo', dd: 1, on: redo }, '|',
      { i: 'link', tip: 'Insert Hyperlink' }, { i: 'sum', tip: 'AutoSum', dd: 1, on: autoSum }, { i: 'sortA', tip: 'Sort Ascending' }, { i: 'sortZ', tip: 'Sort Descending' }, '|',
      { i: 'chart', tip: 'Chart Wizard', on: soon('Chart Wizard is not available: the Office 2003 installation source could not be found.<br><br>(Frank borrowed the CD.)') }, { i: 'draw', tip: 'Drawing' },
      { sel: ['200%', '100%', '75%', '50%', '25%'], v: '100%', w: 58, tip: 'Zoom' }, { i: 'help', tip: 'Microsoft Excel Help', on: aboutMsg },
    ]);
    tb(q('.xl-tb-fmt'), [
      { sel: ['Arial', 'Arial Black', 'Courier New', 'Tahoma', 'Times New Roman', 'Verdana'], v: 'Arial', w: 118, tip: 'Font', on: v => applyStyle({ ff: v === 'Arial' ? undefined : v }) },
      { sel: ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24'], v: '10', w: 42, tip: 'Font Size', on: v => applyStyle({ fs: +v === 10 ? undefined : +v }) }, '|',
      { txt: 'B', tip: 'Bold', on: () => toggle('b') }, { txt: 'I', css: 'font-style:italic;font-family:Times New Roman', tip: 'Italic', on: () => toggle('i') }, { txt: 'U', css: 'text-decoration:underline', tip: 'Underline', on: () => toggle('u') }, '|',
      { i: 'alL', tip: 'Align Left', on: () => applyStyle({ al: 'l' }) }, { i: 'alC', tip: 'Center', on: () => applyStyle({ al: 'c' }) }, { i: 'alR', tip: 'Align Right', on: () => applyStyle({ al: 'r' }) }, { i: 'merge', tip: 'Merge and Center', on: () => applyStyle({ al: 'c' }) }, '|',
      { i: 'cur', tip: 'Currency Style', on: () => applyStyle({ f: 'c2' }) }, { i: 'pct', tip: 'Percent Style', on: () => applyStyle({ f: 'p0' }) }, { i: 'comma', tip: 'Comma Style', on: () => applyStyle({ f: 'n2' }) },
      { i: 'decUp', tip: 'Increase Decimal', on: () => bumpDec(1) }, { i: 'decDn', tip: 'Decrease Decimal', on: () => bumpDec(-1) }, '|',
      { i: 'indL', tip: 'Decrease Indent', on: () => bumpInd(-1) }, { i: 'indR', tip: 'Increase Indent', on: () => bumpInd(1) }, '|',
      { i: 'border', tip: 'Borders', dd: 1, on: () => applyStyle({ bb: 't' }) }, { i: 'fill', tip: 'Fill Color (Yellow)', dd: 1, on: () => applyStyle({ bg: '#FFFF00' }) }, { i: 'font', tip: 'Font Color (Red)', dd: 1, on: () => applyStyle({ fc: '#FF0000' }) },
    ]);

    function buildMenu() {
      const dis = l => ({ label: l, disabled: true });
      return [
        { label: 'File', items: () => [{ label: 'New...', key: 'Ctrl+N', action: () => FR.apps.excel(null) }, { label: 'Open...', key: 'Ctrl+O', action: soon("Use My Computer or My Documents to open Frank's files.") }, { label: 'Close', action: () => win.close() }, { sep: 1 },
          { label: 'Save', key: 'Ctrl+S', action: saveMsg }, { label: 'Save As...', action: saveMsg }, dis('Save as Web Page...'), { sep: 1 }, dis('Page Setup...'), { label: 'Print Preview', action: printMsg }, { label: 'Print...', key: 'Ctrl+P', action: printMsg }, { sep: 1 },
          { label: 'Properties', action: propsMsg }, { sep: 1 }, { label: 'Exit', action: () => win.close() }] },
        { label: 'Edit', items: () => [{ label: 'Undo Typing', key: 'Ctrl+Z', disabled: !st.undo.length, action: undo }, { label: 'Redo', key: 'Ctrl+Y', disabled: !st.redo.length, action: redo }, { sep: 1 },
          { label: 'Cut', key: 'Ctrl+X', action: () => copySel(true) }, { label: 'Copy', key: 'Ctrl+C', action: () => copySel(false) }, { label: 'Paste', key: 'Ctrl+V', disabled: !st.clip, action: pasteClip }, { sep: 1 },
          { label: 'Clear Contents', key: 'Del', action: clearSel }, dis('Delete...'), dis('Delete Sheet'), dis('Move or Copy Sheet...'), { sep: 1 }, dis('Find...'), dis('Replace...'), { label: 'Go To...', key: 'Ctrl+G', action: () => { nbin.focus(); nbin.select(); } }] },
        { label: 'View', items: () => [{ label: 'Normal', checked: true }, dis('Page Break Preview'), { sep: 1 }, dis('Task Pane'), dis('Toolbars'), { label: 'Formula Bar', checked: st.fbar, action: () => { st.fbar = !st.fbar; q('.xl-fbar').style.display = st.fbar ? '' : 'none'; } },
          { label: 'Status Bar', checked: q('.xl-status').style.display !== 'none', action: () => { const s = q('.xl-status'); s.style.display = s.style.display === 'none' ? '' : 'none'; } }, { sep: 1 },
          { label: 'Comments', checked: st.showCm, action: () => { st.showCm = !st.showCm; renderObjs(); } }, { sep: 1 }, dis('Full Screen'), dis('Zoom...')] },
        { label: 'Insert', items: () => [dis('Cells...'), dis('Rows'), dis('Columns'), dis('Worksheet'), dis('Chart...'), { sep: 1 }, { label: 'Function...', action: fnHelp }, dis('Name'), dis('Comment'), { sep: 1 }, dis('Picture'), dis('Hyperlink...')] },
        { label: 'Format', items: () => [dis('Cells...'), dis('Row'), dis('Column'), dis('Sheet'), { sep: 1 }, dis('AutoFormat...'), dis('Conditional Formatting...'), dis('Style...')] },
        { label: 'Tools', items: () => [{ label: 'Spelling...', key: 'F7', action: soon('The spelling check is complete for the entire sheet.') }, dis('Error Checking...'), { sep: 1 }, dis('Protection'), dis('Goal Seek...'), dis('Scenarios...'), dis('Formula Auditing'), { sep: 1 }, dis('Macro'), dis('Add-Ins...'), { label: 'Options...', action: soon('Options are locked by the Packa Corp IT policy.<br><br>(Packa Corp IT = Drew.)') }] },
        { label: 'Data', items: () => [dis('Sort...'), dis('Filter'), dis('Form...'), dis('Subtotals...'), dis('Validation...'), { sep: 1 }, dis('Text to Columns...'), dis('Consolidate...'), { sep: 1 }, { label: 'PivotTable and PivotChart Report...', action: soon('PivotTable wizard could not start: not enough memory.<br><br>(There are 14 versions of the budget open in Frank\'s head.)') }, dis('Import External Data'), dis('Refresh Data')] },
        { label: 'Window', items: () => [dis('New Window'), dis('Arrange...'), dis('Hide'), dis('Freeze Panes'), { sep: 1 }, ...[...FR.wm.wins.values()].filter(w => w.el.classList.contains('xl-win')).map((w, i) => ({ label: `${i + 1} ${w.el.querySelector('.fr-title').textContent.replace('Microsoft Excel - ', '')}`, checked: w === win, action: () => { w.restore && w.restore(); w.focus(); } }))] },
        { label: 'Help', items: () => [{ label: 'Microsoft Excel Help', key: 'F1', action: fnHelp }, dis('Show the Office Assistant'), { sep: 1 }, dis('Microsoft Office Online'), dis('Contact Us'), dis('Check for Updates'), dis('Detect and Repair...'), { sep: 1 }, { label: 'About Microsoft Office Excel', action: aboutMsg }] },
      ];
    }
    function saveMsg() { FR.dialog({ icon: 'warn', title: 'Microsoft Excel', message: `'${esc(book.name)}' is read-only. To save a copy, click OK, then give the workbook a new name in the Save As dialog box.<br><br><i>(Frank's disk is set to read-only. Changes stay in memory until you close the file.)</i>` }); }
    function printMsg() { FR.dialog({ icon: 'error', title: 'Microsoft Excel', message: 'No printers are installed. To install a printer, open Printers and Faxes in Control Panel.<br><br><i>(The printer is "HP LaserJet 4 — Finance (no toner)". It has been jammed since August.)</i>' }); }
    function propsMsg() { FR.dialog({ icon: 'info', title: book.name + ' Properties', message: `<b>${esc(book.name)}</b><br><br>Author: ${esc((opts.node && opts.node.author) || 'Frank Warmington')}<br>Company: Packa Corporation<br>Last saved: ${esc((opts.node && opts.node.modified) || '—')}` }); }
    function aboutMsg() { FR.dialog({ icon: 'info', title: 'About Microsoft Office Excel', width: 420, message: '<b>Microsoft® Office Excel 2003</b> (11.8404.8405) SP3<br>Part of Microsoft Office Professional Edition 2003<br><br>This product is licensed to:<br>&nbsp;&nbsp;Frank Warmington<br>&nbsp;&nbsp;Packa Corporation<br><br>Product ID: 73931-640-0000106-57XXX' }); }
    function fnHelp() { FR.dialog({ icon: 'info', title: 'Microsoft Excel Help', width: 440, message: 'Supported functions:<br><br>SUM · AVERAGE · MIN · MAX · COUNT · COUNTA · ROUND · ROUNDUP · ROUNDDOWN · ABS · INT · MOD · SQRT · IF · IFERROR · AND · OR · NOT · SUMPRODUCT · SUMIF · COUNTIF · INDEX · MATCH · VLOOKUP · ISNUMBER · ISERROR · CONCAT · CONCATENATE · LEFT · RIGHT · LEN · UPPER · LOWER · TRIM<br><br>Keys: F2 edit · F4 anchors · Alt+= AutoSum · Ctrl+D / Ctrl+R fill down / right · drag the fill handle · Ctrl+PgUp / PgDn sheets · Ctrl+End last cell · Ctrl+W close<br><br>Tip: select cells and read <b>Sum=</b> in the status bar.' }); }

    /* ---------- geometry & rendering ---------- */
    function sh() { return book.sheets[st.si]; }
    function dims(s) {
      let mr = 0, mc = 0;
      for (const k in s.cells) { const [r, c] = k.split(',').map(Number); if (r > mr) mr = r; if (c > mc) mc = c; }
      s.charts.concat(s.shapes).forEach(o => { if (o.r + 16 > mr) mr = o.r + 16; if (o.c + Math.ceil((o.w || 0) / DEFW) > mc) mc = o.c + Math.ceil((o.w || 0) / DEFW); });
      return { nr: Math.max(s.nr || 0, mr + 14, 40), nc: Math.max(s.nc || 0, mc + 3, 16) };
    }
    function renderSheet() {
      const s = sh();
      const hit = tcache.get(st.si);
      if (hit && hit.table !== table) { table.replaceWith(hit.table); table = hit.table; }
      if (hit) { ({ tds, colTh, rowTh, colX, colWd, rowY, rowHt, NR, NC } = hit); wrap.style.width = table.offsetWidth + 'px'; wrap.style.height = table.offsetHeight + 'px'; renderTabs(); refresh(); return; }
      if (tcache.size) { const nt = document.createElement('table'); nt.className = 'xl-grid'; table.replaceWith(nt); table = nt; }
      const d = dims(s);
      NR = d.nr; NC = d.nc;
      colWd = []; for (let c = 0; c < NC; c++) colWd[c] = s.colW[c] || DEFW;
      rowHt = []; for (let r = 0; r < NR; r++) rowHt[r] = s.rowH[r] || DEFH;
      let h = `<colgroup><col style="width:${RHW}px">${colWd.map(w => `<col style="width:${w}px">`).join('')}</colgroup><thead><tr><th class="xl-corner"><span></span></th>`;
      for (let c = 0; c < NC; c++) h += `<th class="xl-ch" data-c="${c}">${colName(c)}</th>`;
      h += '</tr></thead><tbody>';
      for (let r = 0; r < NR; r++) {
        h += `<tr style="height:${rowHt[r]}px"><th class="xl-rh" data-r="${r}">${r + 1}</th>`;
        for (let c = 0; c < NC; c++) h += `<td data-r="${r}" data-c="${c}"></td>`;
        h += '</tr>';
      }
      table.innerHTML = h + '</tbody>';
      table.style.width = RHW + colWd.reduce((a, b) => a + b, 0) + 'px';
      table.classList.toggle('xl-nogrid', !s.gridlines);
      colTh = [...table.querySelectorAll('thead th.xl-ch')];
      rowTh = [...table.querySelectorAll('tbody th.xl-rh')];
      tds = [...table.tBodies[0].rows].map(tr => [...tr.cells].slice(1));
      colX = colTh.map(th => th.offsetLeft); colWd = colTh.map(th => th.offsetWidth);
      rowY = tds.map(row => row[0].offsetTop); rowHt = tds.map(row => row[0].offsetHeight);
      wrap.style.width = table.offsetWidth + 'px'; wrap.style.height = table.offsetHeight + 'px';
      tcache.set(st.si, { table, tds, colTh, rowTh, colX, colWd, rowY, rowHt, NR, NC });
      renderTabs();
      refresh();
    }
    const EMPTY = {};
    function condStyle(s, r, c, v) {
      let out = null;
      for (const cd of s.cond) if (r >= cd.r1 && r <= cd.r2 && c >= cd.c1 && c <= cd.c2) { try { if (cd.test(v)) out = Object.assign(out || {}, cd.s); } catch (e) {} }
      return out;
    }
    function refresh() {
      const s = sh(), si = st.si;
      for (let r = 0; r < NR; r++) {
        const row = tds[r];
        for (let c = 0; c < NC; c++) {
          const td = row[c], cl = s.cells[r + ',' + c];
          if (!cl) { if (td._x) { td.className = ''; td.style.cssText = ''; td.textContent = ''; td._x = 0; } continue; }
          td._x = 1;
          const v = book.get(si, r, c);
          let sty = cl.s || EMPTY;
          const cs = s.cond.length ? condStyle(s, r, c, v) : null;
          if (cs) sty = Object.assign({}, sty, cs);
          let text = '', al = sty.al, pad = false, isNum = false;
          if (v == null) text = '';
          else if (isErr(v)) { text = v.e; al = al || 'c'; }
          else if (typeof v === 'boolean') { text = v ? 'TRUE' : 'FALSE'; al = al || 'c'; }
          else if (typeof v === 'number') { const f = fmtNum(v, sty.f); text = f.t; pad = !!f.pad && /^(n|x)/.test(sty.f || ''); al = al || 'r'; isNum = true; }
          else { text = String(v); al = al || 'l'; }
          let css = '';
          if (sty.b) css += 'font-weight:bold;';
          if (sty.i) css += 'font-style:italic;';
          if (sty.u) css += 'text-decoration:underline;';
          if (sty.fc) css += `color:${sty.fc};`;
          if (sty.bg) css += `background:${sty.bg};`;
          if (sty.fs) css += `font-size:${PX(sty.fs)}px;`;
          if (sty.ff) css += `font-family:"${sty.ff}";`;
          if (sty.ind) css += `padding-left:${2 + sty.ind * 9}px;`;
          css += `text-align:${{ l: 'left', c: 'center', r: 'right' }[al || 'l']};`;
          const sh2 = [];
          if (sty.bt) sh2.push('inset 0 1px 0 #000');
          if (sty.bb === 'd') { css += 'border-bottom-color:#000;'; sh2.push('inset 0 -1px 0 #fff', 'inset 0 -2px 0 #000'); }
          else if (sty.bb) css += 'border-bottom-color:#000;';
          if (sh2.length) css += `box-shadow:${sh2.join(',')};`;
          let cls = cl.cm ? 'xl-hascm' : '';
          let html;
          const w = colWd[c];
          if (isNum && text && measure(text, sty) > w - 5) { text = '#'.repeat(Math.max(1, Math.floor((w - 5) / 7.4))); pad = false; }
          if (!isNum && text && al === 'l' && !isErr(v)) {
            const tw = measure(text, sty) + 4 + (sty.ind ? sty.ind * 9 : 0);
            if (tw > w) {
              let acc = w, j = c;
              while (acc < tw && j + 1 < NC && !(s.cells[r + ',' + (j + 1)] && s.cells[r + ',' + (j + 1)].raw !== '')) { j++; acc += colWd[j]; }
              if (j > c) { cls += ' xl-spill'; html = `<span class="xl-sp" style="width:${acc - 4}px">${esc(text)}</span>`; }
            }
          }
          if (html === undefined) html = esc(text) + (pad ? '<span class="xl-rp">)</span>' : '');
          td.className = cls; td.style.cssText = css; td.innerHTML = html;
        }
      }
      renderObjs();
      drawSel();
      if (book.circ && !st.circWarned) {
        st.circWarned = true;
        setTimeout(() => FR.dialog({ icon: 'warn', title: 'Microsoft Excel', width: 440, message: 'Microsoft Office Excel cannot calculate a formula. There is a circular reference in an open workbook, but the references that cause it cannot be listed for you automatically.<br><br>The circular reference has been treated as zero.' }), 0);
      }
    }
    function renderObjs() {
      const s = sh();
      objs.innerHTML = '';
      s.charts.forEach(ch => {
        const d = $(`<div class="xl-chart" style="left:${colX[ch.c] + ch.dx}px;top:${rowY[ch.r] + ch.dy}px;width:${ch.w}px;height:${ch.h}px"></div>`);
        try { d.innerHTML = ch.render(book); } catch (e) { d.textContent = 'Chart error'; }
        d.onmousedown = e => { e.stopPropagation(); objs.querySelectorAll('.xl-chart').forEach(x => x.classList.remove('xl-osel')); d.classList.add('xl-osel'); };
        objs.appendChild(d);
      });
      s.shapes.forEach(o => {
        if (o.hidden) return;
        const d = $(`<div class="xl-shape ${o.cls || ''}" style="left:${colX[o.c] + o.dx}px;top:${rowY[o.r] + o.dy}px;width:${o.w}px;min-height:${o.h}px"></div>`);
        d.innerHTML = o.html;
        d.onmousedown = e => e.stopPropagation();
        objs.appendChild(d);
      });
      if (st.showCm) {
        for (const k in s.cells) { const cl = s.cells[k]; if (!cl.cm) continue; const [r, c] = k.split(',').map(Number); if (r >= NR || c >= NC) continue; objs.appendChild(cmBox(cl.cm, r, c, true)); }
      }
    }
    function cmBox(cm, r, c, fixed) {
      const x = colX[c] + colWd[c] + 12, y = Math.max(0, rowY[r] - 6);
      const d = $(`<div class="xl-cm${fixed ? ' xl-cm-fixed' : ''}" style="left:${x}px;top:${y}px"><b></b><div></div></div>`);
      d.querySelector('b').textContent = cm.a + ':';
      d.querySelector('div').textContent = cm.t;
      const ln = $(`<svg class="xl-cm-ln" style="left:${colX[c] + colWd[c] - 2}px;top:${rowY[r]}px" width="16" height="12"><line x1="0" y1="2" x2="14" y2="${Math.min(10, y - rowY[r] + 10)}" stroke="#000" stroke-width="1"/></svg>`);
      const g = document.createElement('div'); g.className = 'xl-cmg'; g.appendChild(ln); g.appendChild(d);
      return g;
    }
    function renderTabs() {
      tabsEl.innerHTML = '';
      book.sheets.forEach((s, i) => {
        const t = $(`<span class="xl-tab${i === st.si ? ' xl-tab-on' : ''}"><span></span></span>`);
        t.firstChild.textContent = s.name;
        if (s.tabColor) t.firstChild.style.cssText = `box-shadow: inset 0 -3px 0 ${s.tabColor};`;
        t.onmousedown = e => { e.preventDefault(); switchSheet(i); };
        tabsEl.appendChild(t);
      });
    }
    function switchSheet(i) {
      if (i === st.si) return;
      if (st.edit && !canPoint()) { if (!commit(0, 0)) return; }
      const keepEdit = st.edit;
      st.si = i;
      if (!keepEdit) { st.ar = st.ac = 0; st.anchor = { r: 0, c: 0 }; st.focus = { r: 0, c: 0 }; }
      else { st.anchor = { r: 0, c: 0 }; st.focus = { r: 0, c: 0 }; }
      scroll.scrollTop = 0; scroll.scrollLeft = 0;
      renderSheet();
      syncEditorVisibility();
      if (!keepEdit) focusGrid(); else fin.focus();
    }
    q('.xl-tabnav').onmousedown = e => {
      const n = e.target.closest('[data-n]'); if (!n) return; e.preventDefault();
      const k = n.dataset.n, N = book.sheets.length;
      if (k === 'first') tabsEl.scrollLeft = 0; else if (k === 'last') tabsEl.scrollLeft = 9999;
      else tabsEl.scrollLeft += k === 'next' ? 60 : -60;
    };

    /* ---------- selection ---------- */
    const selRect = () => ({ r0: Math.min(st.anchor.r, st.focus.r), r1: Math.max(st.anchor.r, st.focus.r), c0: Math.min(st.anchor.c, st.focus.c), c1: Math.max(st.anchor.c, st.focus.c) });
    function boxFor(r0, c0, r1, c1) { return { x: colX[c0], y: rowY[r0], w: colX[c1] + colWd[c1] - colX[c0], h: rowY[r1] + rowHt[r1] - rowY[r0] }; }
    function drawSel() {
      if (!tds.length) return;
      st.tinted.forEach(td => td.classList.remove('xl-in')); st.tinted = [];
      st.hs.forEach(th => th.classList.remove('xl-hs')); st.hs = [];
      const { r0, r1, c0, c1 } = selRect();
      const multi = r0 !== r1 || c0 !== c1;
      if (multi) for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { if (r === st.ar && c === st.ac) continue; const td = tds[r] && tds[r][c]; if (td) { td.classList.add('xl-in'); st.tinted.push(td); } }
      for (let c = c0; c <= c1; c++) if (colTh[c]) { colTh[c].classList.add('xl-hs'); st.hs.push(colTh[c]); }
      for (let r = r0; r <= r1; r++) if (rowTh[r]) { rowTh[r].classList.add('xl-hs'); st.hs.push(rowTh[r]); }
      const b = boxFor(r0, c0, r1, c1);
      Object.assign(selbox.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px', display: st.edit && st.edit.si === st.si && !multi ? 'none' : '' });
      if (!st.drag) nbin.value = a1(st.ar, st.ac);
      if (!st.edit) fin.value = fbarText(st.ar, st.ac);
      // copy marquee
      if (st.clip && st.clip.si === st.si && st.clip.marquee) { const cb = boxFor(st.clip.r0, st.clip.c0, st.clip.r1, st.clip.c1); Object.assign(copybox.style, { display: 'block', left: cb.x - 1 + 'px', top: cb.y - 1 + 'px', width: cb.w + 1 + 'px', height: cb.h + 1 + 'px' }); }
      else copybox.style.display = 'none';
      statusSum(r0, r1, c0, c1, multi);
    }
    function fbarText(r, c) {
      const cl = sh().cells[r + ',' + c];
      if (!cl || !cl.raw) return '';
      const f = (cl.s && cl.s.f) || '';
      if (f[0] === 'p' && cl.raw[0] !== '=') { const n = parseNumText(cl.raw); if (!isNaN(n)) return genNum(parseFloat((n * 100).toPrecision(12))) + '%'; }
      return cl.raw;
    }
    function statusSum(r0, r1, c0, c1, multi) {
      stMode.textContent = st.edit ? (st.edit.point ? 'Point' : st.edit.mode === 'edit' ? 'Edit' : 'Enter') : 'Ready';
      if (!multi) { stSum.textContent = ''; return; }
      const s = sh(); let sum = 0, n = 0, f = null;
      for (const k in s.cells) {
        const i = k.indexOf(','), r = +k.slice(0, i), c = +k.slice(i + 1);
        if (r < r0 || r > r1 || c < c0 || c > c1) continue;
        const v = book.get(st.si, r, c);
        if (typeof v === 'number') { sum += v; n++; if (f === null) f = (s.cells[k].s && s.cells[k].s.f) || ''; }
      }
      if (!n) { stSum.textContent = ''; return; }
      const ff = f && /^(n|p|x|c)/.test(f) ? f : null;
      stSum.textContent = 'Sum=' + (ff ? fmtNum(sum, ff).t : fmtNum(sum, Number.isInteger(sum) ? 'c0' : null).t);
    }
    function select(r, c, extend) {
      r = Math.max(0, Math.min(NR - 1, r)); c = Math.max(0, Math.min(NC - 1, c));
      if (extend) st.focus = { r, c };
      else { st.ar = r; st.ac = c; st.anchor = { r, c }; st.focus = { r, c }; }
      drawSel();
      ensureVisible(extend ? r : st.ar, extend ? c : st.ac);
    }
    function ensureVisible(r, c) {
      const x = colX[c], y = rowY[r], w = colWd[c], h = rowHt[r];
      if (x - RHW < scroll.scrollLeft) scroll.scrollLeft = x - RHW;
      else if (x + w > scroll.scrollLeft + scroll.clientWidth) scroll.scrollLeft = x + w - scroll.clientWidth;
      if (y - CHH < scroll.scrollTop) scroll.scrollTop = y - CHH;
      else if (y + h > scroll.scrollTop + scroll.clientHeight) scroll.scrollTop = y + h - scroll.clientHeight;
    }
    function focusGrid() { if (!st.edit) scroll.focus({ preventScroll: true }); }

    /* ---------- editing ---------- */
    function startEdit(mode, text, from) {
      st.edit = { si: st.si, r: st.ar, c: st.ac, mode, point: null, from: from || 'cell' };
      st.anchor = { r: st.ar, c: st.ac }; st.focus = { r: st.ar, c: st.ac };
      editor.value = text; fin.value = text;
      const cl = sh().cells[st.ar + ',' + st.ac], sty = (cl && cl.s) || EMPTY;
      editor.style.fontWeight = sty.b ? 'bold' : ''; editor.style.fontStyle = sty.i ? 'italic' : ''; editor.style.color = sty.fc || '#000';
      editor.style.background = sty.bg || '#fff'; editor.style.fontSize = PX(sty.fs || 10) + 'px';
      q('.xl-fbar').classList.add('xl-editing');
      syncEditorVisibility();
      sizeEditor();
      const inp = from === 'fbar' ? fin : editor;
      inp.focus({ preventScroll: true });
      const L = inp.value.length; try { inp.setSelectionRange(L, L); } catch (e) {}
      drawSel();
    }
    function syncEditorVisibility() {
      const ed = st.edit;
      if (!ed || ed.si !== st.si || ed.from === 'fbar') { editor.style.display = 'none'; return; }
      const b = boxFor(ed.r, ed.c, ed.r, ed.c);
      Object.assign(editor.style, { display: 'block', left: b.x + 'px', top: b.y + 'px', height: b.h - 1 + 'px', minWidth: b.w - 1 + 'px' });
    }
    function sizeEditor() {
      if (!st.edit || editor.style.display === 'none') return;
      const w = measure(editor.value, { b: editor.style.fontWeight === 'bold' }) + 12;
      editor.style.width = Math.max(colWd[st.edit.c] - 1, Math.min(w, wrap.offsetWidth - colX[st.edit.c] - 2)) + 'px';
    }
    const activeInput = () => (document.activeElement === fin ? fin : st.edit && st.edit.from === 'fbar' ? fin : st.edit && st.edit.si !== st.si ? fin : editor);
    function canPoint() {
      const ed = st.edit; if (!ed) return false;
      const inp = activeInput(), t = inp.value;
      if (t[0] !== '=' ) return false;
      if (ed.point) return true;
      const pos = inp.selectionStart == null ? t.length : inp.selectionStart;
      return /[=+\-*/^(,:<>&]\s*$/.test(t.slice(0, pos));
    }
    function pointInsert(r0, c0, r1, c1) {
      const ed = st.edit, inp = activeInput();
      let t = inp.value, s, e;
      if (ed.point) { s = ed.point.s; e = ed.point.e; } else { s = e = inp.selectionStart == null ? t.length : inp.selectionStart; }
      let ref = a1(Math.min(r0, r1), Math.min(c0, c1));
      if (r0 !== r1 || c0 !== c1) ref += ':' + a1(Math.max(r0, r1), Math.max(c0, c1));
      if (st.si !== ed.si) ref = quoteSheet(sh().name) + ref;
      t = t.slice(0, s) + ref + t.slice(e);
      editor.value = t; fin.value = t;
      ed.point = { s, e: s + ref.length, r0, c0, r1, c1, si: st.si };
      try { inp.setSelectionRange(s + ref.length, s + ref.length); } catch (x) {}
      sizeEditor();
      drawPoint();
      stMode.textContent = 'Point';
    }
    function drawPoint() {
      const p = st.edit && st.edit.point;
      if (!p || p.si !== st.si) { pointbox.style.display = 'none'; return; }
      const b = boxFor(Math.min(p.r0, p.r1), Math.min(p.c0, p.c1), Math.max(p.r0, p.r1), Math.max(p.c0, p.c1));
      Object.assign(pointbox.style, { display: 'block', left: b.x - 1 + 'px', top: b.y - 1 + 'px', width: b.w + 1 + 'px', height: b.h + 1 + 'px' });
    }
    function endEdit() {
      st.edit = null; editor.style.display = 'none'; pointbox.style.display = 'none';
      q('.xl-fbar').classList.remove('xl-editing');
    }
    function cancelEdit() {
      const ed = st.edit; if (!ed) return;
      endEdit();
      if (ed.si !== st.si) { st.si = ed.si; renderSheet(); }
      st.ar = ed.r; st.ac = ed.c; st.anchor = { r: ed.r, c: ed.c }; st.focus = { r: ed.r, c: ed.c };
      drawSel(); focusGrid();
    }
    function commit(dr, dc) {
      const ed = st.edit; if (!ed) return true;
      let text = activeInput().value;
      if (text[0] === '=' || ((text[0] === '+' || text[0] === '-') && text.length > 1 && isNaN(parseNumText(text)))) {
        if (text[0] !== '=') text = '=' + text;
        try { text = normFormula(text); }
        catch (e) {
          FR.dialog({ icon: 'warn', title: 'Microsoft Excel', width: 440, message: 'The formula you typed contains an error.<br><br>• For information about fixing common formula problems, click Help.<br>• To get assistance in entering a function, click OK, then click Function on the Insert menu.<br>• If you are not trying to enter a formula, avoid using an equal sign (=) or minus sign (-), or precede it with a single quotation mark (\').' }).then(() => activeInput().focus());
          return false;
        }
      }
      endEdit();
      if (ed.si !== st.si) { st.si = ed.si; renderSheet(); }
      const s = book.sheets[ed.si], k = ed.r + ',' + ed.c, cl = s.cells[k];
      const old = cl ? cl.raw : '', oldS = cl && cl.s ? { ...cl.s } : undefined;
      if (text !== old) {
        let newS = oldS;
        if (text[0] !== '=' && text[0] !== "'") {
          const tt = text.trim();
          if (/%$/.test(tt) && !isNaN(parseNumText(tt))) { newS = { ...(oldS || {}), f: (oldS && oldS.f && oldS.f[0] === 'p') ? oldS.f : 'p0' }; text = String(parseNumText(tt)); }
          else if (/^\(?-?\$/.test(tt) && !isNaN(parseNumText(tt))) { newS = { ...(oldS || {}), f: (oldS && oldS.f) || 'c2' }; text = String(parseNumText(tt)); }
          else if (/,/.test(tt) && !isNaN(parseNumText(tt))) { newS = { ...(oldS || {}), f: (oldS && oldS.f) || 'c0' }; text = String(parseNumText(tt)); }
          else if (oldS && oldS.f && oldS.f[0] === 'p' && !isNaN(parseNumText(tt)) && tt !== '') { text = String(parseNumText(tt) / 100); }
        }
        pushUndo([{ si: ed.si, r: ed.r, c: ed.c, old, oldS, neu: text, neuS: newS }]);
        applyChanges([{ si: ed.si, r: ed.r, c: ed.c, raw: text, s: newS }]);
      }
      st.ar = ed.r; st.ac = ed.c;
      select(ed.r + dr, ed.c + dc);
      focusGrid();
      return true;
    }
    function applyChanges(list) {
      list.forEach(x => {
        const s = book.sheets[x.si], k = x.r + ',' + x.c;
        let cl = s.cells[k];
        if (!cl) cl = s.cells[k] = { raw: '' };
        cl.raw = x.raw == null ? '' : x.raw; delete cl.ast; delete cl.lit;
        if (x.s !== undefined) cl.s = x.s; else if ('s' in x) delete cl.s;
      });
      st.dirty = true;
      book.recalc();
      refresh();
      if (opts.afterCalc) opts.afterCalc(book, api);
    }
    function pushUndo(batch) { st.undo.push(batch); if (st.undo.length > 100) st.undo.shift(); st.redo = []; }
    function undo() {
      if (st.edit) { cancelEdit(); return; }
      const b = st.undo.pop(); if (!b) return;
      st.redo.push(b);
      applyChanges(b.map(x => ({ si: x.si, r: x.r, c: x.c, raw: x.old, s: x.oldS })));
    }
    function redo() {
      const b = st.redo.pop(); if (!b) return;
      st.undo.push(b);
      applyChanges(b.map(x => ({ si: x.si, r: x.r, c: x.c, raw: x.neu, s: x.neuS })));
    }
    function forSel(fn) { const { r0, r1, c0, c1 } = selRect(); const out = []; for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const x = fn(r, c); if (x) out.push(x); } return out; }
    function styleChange(mut) {
      if (st.edit) commit(0, 0);
      const s = sh();
      const batch = forSel((r, c) => {
        const cl = s.cells[r + ',' + c], oldS = cl && cl.s ? { ...cl.s } : undefined, raw = cl ? cl.raw : '';
        const ns = mut({ ...(oldS || {}) });
        Object.keys(ns).forEach(k => ns[k] === undefined && delete ns[k]);
        return { si: st.si, r, c, old: raw, oldS, neu: raw, neuS: ns };
      });
      pushUndo(batch);
      applyChanges(batch.map(x => ({ si: x.si, r: x.r, c: x.c, raw: x.neu, s: x.neuS })));
    }
    const applyStyle = o => styleChange(s => Object.assign(s, o));
    const toggle = k => { const cl = sh().cells[st.ar + ',' + st.ac]; const on = !(cl && cl.s && cl.s[k]); styleChange(s => { s[k] = on ? 1 : undefined; return s; }); };
    const bumpDec = d => { const cl = sh().cells[st.ar + ',' + st.ac]; const f = decFmt(cl && cl.s && cl.s.f, d); styleChange(s => { s.f = f; return s; }); };
    const bumpInd = d => styleChange(s => { s.ind = Math.max(0, (s.ind || 0) + d) || undefined; return s; });
    function clearSel() {
      const s = sh();
      const batch = forSel((r, c) => { const cl = s.cells[r + ',' + c]; if (!cl || !cl.raw) return null; return { si: st.si, r, c, old: cl.raw, oldS: cl.s ? { ...cl.s } : undefined, neu: '', neuS: cl.s ? { ...cl.s } : undefined }; });
      if (!batch.length) return;
      pushUndo(batch);
      applyChanges(batch.map(x => ({ si: x.si, r: x.r, c: x.c, raw: '', s: x.neuS })));
    }
    function autoSum() {
      if (st.edit) commit(0, 0);
      const s = sh();
      let r = st.ar - 1, c = st.ac;
      const isN = (rr, cc) => typeof book.get(st.si, rr, cc) === 'number';
      let range = null;
      if (r >= 0 && isN(r, c)) { let r0 = r; while (r0 - 1 >= 0 && isN(r0 - 1, c)) r0--; range = a1(r0, c) + ':' + a1(r, c); }
      else if (st.ac > 0 && isN(st.ar, st.ac - 1)) { let c0 = st.ac - 1; while (c0 - 1 >= 0 && isN(st.ar, c0 - 1)) c0--; range = a1(st.ar, c0) + ':' + a1(st.ar, st.ac - 1); }
      startEdit('enter', '=SUM(' + (range || '') + ')');
      if (!range) { const L = editor.value.length - 1; editor.setSelectionRange(L, L); }
    }
    /* ---------- fill (Ctrl+D, Ctrl+R, fill handle) ---------- */
    // fill target rect from a source rect (same sheet): formulas shift, 2+ numbers in a line extend the series, else copy
    function fillRange(src, dst) {
      const s = sh(), batch = [];
      const down = dst.r1 > src.r1 || dst.r0 < src.r0; // vertical fill?
      const srcCells = (r, c) => s.cells[r + ',' + c];
      const seriesStep = (cells) => { const v = cells.map(cl => (cl && cl.raw !== '' && cl.raw[0] !== '=' ? parseLiteral(cl.raw) : null)); if (v.length < 2 || v.some(x => typeof x !== 'number')) return null; const d = v[1] - v[0]; return v.every((x, i) => i === 0 || Math.abs(x - v[i - 1] - d) < 1e-9) ? d : null; };
      for (let r = dst.r0; r <= dst.r1; r++) for (let c = dst.c0; c <= dst.c1; c++) {
        if (r >= src.r0 && r <= src.r1 && c >= src.c0 && c <= src.c1) continue;
        if (r >= NR || c >= NC) continue;
        let sr, sc, k;
        if (down) { sc = c; const n = src.r1 - src.r0 + 1; k = r > src.r1 ? r - src.r1 : r - src.r0; sr = r > src.r1 ? src.r0 + ((r - src.r0) % n) : src.r1 - ((src.r1 - r) % n); }
        else { sr = r; const n = src.c1 - src.c0 + 1; k = c > src.c1 ? c - src.c1 : c - src.c0; sc = c > src.c1 ? src.c0 + ((c - src.c0) % n) : src.c1 - ((src.c1 - c) % n); }
        const from = srcCells(sr, sc); let raw = from ? from.raw : '';
        const line = down ? Array.from({ length: src.r1 - src.r0 + 1 }, (_, i) => srcCells(src.r0 + i, c)) : Array.from({ length: src.c1 - src.c0 + 1 }, (_, i) => srcCells(r, src.c0 + i));
        const step = seriesStep(line);
        if (raw[0] === '=') raw = shiftFormula(raw, r - sr, c - sc);
        else if (step !== null) { const base = down ? (k > 0 ? parseLiteral(line[line.length - 1].raw) : parseLiteral(line[0].raw)) : (k > 0 ? parseLiteral(line[line.length - 1].raw) : parseLiteral(line[0].raw)); raw = genNum(base + step * k); }
        const cl = s.cells[r + ',' + c];
        batch.push({ si: st.si, r, c, old: cl ? cl.raw : '', oldS: cl && cl.s ? { ...cl.s } : undefined, neu: raw, neuS: from && from.s ? { ...from.s } : (cl && cl.s ? { ...cl.s } : undefined) });
      }
      if (!batch.length) return;
      pushUndo(batch);
      applyChanges(batch.map(x => ({ si: x.si, r: x.r, c: x.c, raw: x.neu, s: x.neuS })));
    }
    function fillDir(dir) {
      if (st.edit && !commit(0, 0)) return;
      const { r0, r1, c0, c1 } = selRect();
      if (dir === 'down') { if (r1 === r0) return; fillRange({ r0, r1: r0, c0, c1 }, { r0, r1, c0, c1 }); }
      else { if (c1 === c0) return; fillRange({ r0, r1, c0, c1: c0 }, { r0, r1, c0, c1 }); }
    }
    fillh.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      if (st.edit && !commit(0, 0)) return;
      const src = selRect(); let dst = null;
      st.drag = true; scroll.classList.add('xl-filling');
      const mv = ev => {
        const p = cellAt(ev); if (!p) return;
        const dr = p.r > src.r1 ? p.r - src.r1 : p.r < src.r0 ? p.r - src.r0 : 0, dc = p.c > src.c1 ? p.c - src.c1 : p.c < src.c0 ? p.c - src.c0 : 0;
        if (Math.abs(dr) >= Math.abs(dc)) dst = { r0: Math.min(src.r0, p.r), r1: Math.max(src.r1, p.r), c0: src.c0, c1: src.c1 };
        else dst = { r0: src.r0, r1: src.r1, c0: Math.min(src.c0, p.c), c1: Math.max(src.c1, p.c) };
        st.anchor = { r: dst.r0, c: dst.c0 }; st.focus = { r: dst.r1, c: dst.c1 }; drawSel();
        nbin.value = `${dst.r1 - dst.r0 + 1}R x ${dst.c1 - dst.c0 + 1}C`;
      };
      const up = () => {
        document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
        st.drag = false; scroll.classList.remove('xl-filling');
        if (dst && (dst.r0 !== src.r0 || dst.r1 !== src.r1 || dst.c0 !== src.c0 || dst.c1 !== src.c1)) fillRange(src, dst);
        else { st.anchor = { r: src.r0, c: src.c0 }; st.focus = { r: src.r1, c: src.c1 }; }
        drawSel(); focusGrid();
      };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });
    /* ---------- clipboard ---------- */
    function copySel(cut) {
      if (st.edit) return;
      const { r0, r1, c0, c1 } = selRect(), s = sh();
      const cells = [];
      for (let r = r0; r <= r1; r++) { const row = []; for (let c = c0; c <= c1; c++) { const cl = s.cells[r + ',' + c]; row.push(cl ? { raw: cl.raw, s: cl.s ? { ...cl.s } : undefined } : { raw: '' }); } cells.push(row); }
      const text = cells.map((row, i) => row.map((x, j) => { const v = book.get(st.si, r0 + i, c0 + j); return v == null ? '' : isErr(v) ? v.e : typeof v === 'number' ? genNum(v) : String(v); }).join('\t')).join('\n');
      st.clip = { si: st.si, r0, r1, c0, c1, cells, text, cut, marquee: true };
      drawSel();
      return text;
    }
    function pasteClip(ext) {
      const cp = st.clip, s = sh();
      let grid;
      if (ext != null && (!cp || ext.replace(/\r/g, '') !== cp.text)) {
        grid = ext.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t').map(v => ({ raw: v })));
        paste(grid, null);
      } else if (cp) paste(cp.cells, cp);
      function paste(g0, src) {
        // a selection that is a whole multiple of the clip tiles it (Excel behaviour)
        let g = g0;
        const sel = selRect(), gh = g0.length, gw = g0[0].length, sh_ = sel.r1 - sel.r0 + 1, sw = sel.c1 - sel.c0 + 1;
        if ((sh_ > gh || sw > gw) && sh_ % gh === 0 && sw % gw === 0 && sel.r0 === st.ar && sel.c0 === st.ac) {
          g = []; for (let i = 0; i < sh_; i++) { const row = []; for (let j = 0; j < sw; j++) row.push(g0[i % gh][j % gw]); g.push(row); }
          if (src) src = Object.assign({}, src, { tile: [gh, gw] });
        }
        const batch = [];
        g.forEach((row, i) => row.forEach((x, j) => {
          const r = st.ar + i, c = st.ac + j; if (r >= NR || c >= NC) return;
          const cl = s.cells[r + ',' + c];
          let raw = x.raw || '';
          if (src && raw[0] === '=' && !src.cut) raw = shiftFormula(raw, r - (src.r0 + (src.tile ? i % src.tile[0] : i)), c - (src.c0 + (src.tile ? j % src.tile[1] : j)));
          batch.push({ si: st.si, r, c, old: cl ? cl.raw : '', oldS: cl && cl.s ? { ...cl.s } : undefined, neu: raw, neuS: src ? x.s : (cl && cl.s ? { ...cl.s } : undefined) });
        }));
        if (src && src.cut) {
          const ss = book.sheets[src.si];
          for (let r = src.r0; r <= src.r1; r++) for (let c = src.c0; c <= src.c1; c++) {
            if (src.si === st.si && r >= st.ar && r < st.ar + g.length && c >= st.ac && c < st.ac + g[0].length) continue;
            const cl = ss.cells[r + ',' + c]; if (cl && cl.raw) batch.push({ si: src.si, r, c, old: cl.raw, oldS: cl.s ? { ...cl.s } : undefined, neu: '', neuS: undefined });
          }
          st.clip = null;
        }
        if (!batch.length) return;
        pushUndo(batch);
        applyChanges(batch.map(x => ({ si: x.si, r: x.r, c: x.c, raw: x.neu, s: x.neuS })));
        st.focus = { r: st.ar + g.length - 1, c: st.ac + g[0].length - 1 }; st.anchor = { r: st.ar, c: st.ac };
        drawSel();
      }
    }
    scroll.addEventListener('copy', e => { if (st.edit) return; const t = copySel(false); try { e.clipboardData.setData('text/plain', t); e.preventDefault(); } catch (x) {} });
    scroll.addEventListener('cut', e => { if (st.edit) return; const t = copySel(true); try { e.clipboardData.setData('text/plain', t); e.preventDefault(); } catch (x) {} });
    scroll.addEventListener('paste', e => { if (st.edit) return; let t = null; try { t = e.clipboardData.getData('text/plain'); } catch (x) {} e.preventDefault(); pasteClip(t || null); });

    /* ---------- mouse ---------- */
    const cellAt = e => { const td = e.target.closest && e.target.closest('td[data-r]'); return td ? { r: +td.dataset.r, c: +td.dataset.c } : null; };
    wrap.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (e.target === editor) return;
      const th = e.target.closest('th');
      if (th) {
        e.preventDefault();
        if (st.edit && !commit(0, 0)) return;
        if (th.classList.contains('xl-ch')) { const c = +th.dataset.c; st.ar = 0; st.ac = c; st.anchor = { r: 0, c }; st.focus = { r: NR - 1, c }; }
        else if (th.classList.contains('xl-rh')) { const r = +th.dataset.r; st.ar = r; st.ac = 0; st.anchor = { r, c: 0 }; st.focus = { r, c: NC - 1 }; }
        else { st.ar = 0; st.ac = 0; st.anchor = { r: 0, c: 0 }; st.focus = { r: NR - 1, c: NC - 1 }; }
        drawSel(); focusGrid(); return;
      }
      const p = cellAt(e); if (!p) return;
      e.preventDefault();
      if (st.edit) {
        if (canPoint()) {
          st.pdrag = { r: p.r, c: p.c };
          pointInsert(p.r, p.c, p.r, p.c);
          const mv = ev => { const q2 = cellAt(ev); if (q2) pointInsert(st.pdrag.r, st.pdrag.c, q2.r, q2.c); };
          const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
          document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
          activeInput().focus();
          return;
        }
        if (!commit(0, 0)) return;
      }
      if (e.shiftKey) select(p.r, p.c, true); else select(p.r, p.c);
      focusGrid();
      st.drag = true;
      const mv = ev => {
        const q2 = cellAt(ev); if (!q2) return;
        if (q2.r !== st.focus.r || q2.c !== st.focus.c) { st.focus = q2; drawSel(); const { r0, r1, c0, c1 } = selRect(); nbin.value = `${r1 - r0 + 1}R x ${c1 - c0 + 1}C`; }
      };
      const up = () => { st.drag = false; document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); drawSel(); };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });
    wrap.addEventListener('dblclick', e => {
      const p = cellAt(e); if (!p || st.edit) return;
      select(p.r, p.c);
      startEdit('edit', fbarText(p.r, p.c));
    });
    let tipCell = null;
    wrap.addEventListener('mouseover', e => {
      const td = e.target.closest && e.target.closest('td.xl-hascm');
      if (!td || st.showCm) { if (tipCell && !e.target.closest('.xl-cmtip')) { cmtip.innerHTML = ''; tipCell = null; } return; }
      const r = +td.dataset.r, c = +td.dataset.c;
      if (tipCell === td) return;
      tipCell = td;
      const cl = sh().cells[r + ',' + c];
      cmtip.innerHTML = ''; cmtip.appendChild(cmBox(cl.cm, r, c, false));
    });
    wrap.addEventListener('mouseleave', () => { cmtip.innerHTML = ''; tipCell = null; });

    /* ---------- keyboard ---------- */
    function edgeJump(dr, dc) {
      let r = st.focus.r, c = st.focus.c;
      const has = (rr, cc) => rr >= 0 && cc >= 0 && rr < NR && cc < NC && book.raw(st.si, rr, cc) !== '';
      if (has(r, c) && has(r + dr, c + dc)) { while (has(r + dr, c + dc)) { r += dr; c += dc; } }
      else { r += dr; c += dc; while (r >= 0 && c >= 0 && r < NR && c < NC && !has(r, c)) { r += dr; c += dc; } if (r < 0 || c < 0 || r >= NR || c >= NC) { r = Math.max(0, Math.min(NR - 1, r)); c = Math.max(0, Math.min(NC - 1, c)); } }
      return { r, c };
    }
    scroll.addEventListener('keydown', e => {
      if (st.edit) return;
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
      if (mv) {
        e.preventDefault();
        if (ctrl) { const p = edgeJump(mv[0], mv[1]); select(p.r, p.c, e.shiftKey); }
        else if (e.shiftKey) select(st.focus.r + mv[0], st.focus.c + mv[1], true);
        else select(st.ar + mv[0], st.ac + mv[1]);
        return;
      }
      if (k === 'Enter') { e.preventDefault(); select(st.ar + (e.shiftKey ? -1 : 1), st.ac); return; }
      if (k === 'Tab') { e.preventDefault(); select(st.ar, st.ac + (e.shiftKey ? -1 : 1)); return; }
      if (k === 'PageDown' || k === 'PageUp') { e.preventDefault(); const n = Math.max(1, Math.floor(scroll.clientHeight / DEFH) - 2) * (k === 'PageDown' ? 1 : -1); scroll.scrollTop += n * DEFH; select(st.ar + n, st.ac); return; }
      if (k === 'Home') { e.preventDefault(); select(ctrl ? 0 : st.ar, 0); return; }
      if (k === 'End') { e.preventDefault(); if (ctrl) { let mr = 0, mc = 0; for (const key in sh().cells) { if (!sh().cells[key].raw) continue; const [r, c] = key.split(',').map(Number); if (r > mr) mr = r; if (c > mc) mc = c; } select(mr, mc, e.shiftKey); } else { let c = NC - 1; while (c > 0 && book.raw(st.si, st.ar, c) === '') c--; select(st.ar, c, e.shiftKey); } return; }
      if (k === 'F2') { e.preventDefault(); startEdit('edit', fbarText(st.ar, st.ac)); return; }
      if (k === 'Delete') { e.preventDefault(); clearSel(); return; }
      if (k === 'Backspace') { e.preventDefault(); startEdit('enter', ''); return; }
      if (k === 'Escape') { if (st.clip) { st.clip.marquee = false; drawSel(); } return; }
      if (e.altKey && (k === '=' || k === '+')) { e.preventDefault(); autoSum(); return; }
      if (ctrl) {
        const kk = k.toLowerCase();
        if (kk === 'z') { e.preventDefault(); undo(); } else if (kk === 'y') { e.preventDefault(); redo(); }
        else if (kk === 'b') { e.preventDefault(); toggle('b'); } else if (kk === 'i') { e.preventDefault(); toggle('i'); } else if (kk === 'u') { e.preventDefault(); toggle('u'); }
        else if (kk === 'a') { e.preventDefault(); st.anchor = { r: 0, c: 0 }; st.focus = { r: NR - 1, c: NC - 1 }; drawSel(); }
        else if (kk === 's') { e.preventDefault(); saveMsg(); } else if (kk === 'p') { e.preventDefault(); printMsg(); }
        else if (kk === 'n') { e.preventDefault(); FR.apps.excel(null); }
        else if (kk === 'w' || kk === 'f4') { e.preventDefault(); win.close(); }
        else if (kk === 'd') { e.preventDefault(); fillDir('down'); } else if (kk === 'r') { e.preventDefault(); fillDir('right'); }
        else if (kk === 'end') { e.preventDefault(); let mr = 0, mc = 0; for (const key in sh().cells) { if (!sh().cells[key].raw) continue; const [r, c] = key.split(',').map(Number); if (r > mr) mr = r; if (c > mc) mc = c; } select(mr, mc, e.shiftKey); }
        else if (kk === 'pageup' || kk === 'pagedown') { e.preventDefault(); const n = st.si + (kk === 'pagedown' ? 1 : -1); if (n >= 0 && n < book.sheets.length) switchSheet(n); }
        return;
      }
      if (k.length === 1 && !e.altKey) { e.preventDefault(); startEdit('enter', k); }
    });
    function editKey(e, inp) {
      const k = e.key;
      e.stopPropagation();
      if (!st.edit) {
        if (inp === fin && k === 'Enter') { e.preventDefault(); focusGrid(); }
        return;
      }
      if (k === 'Enter') { e.preventDefault(); commit(e.shiftKey ? -1 : 1, 0); return; }
      if (k === 'Tab') { e.preventDefault(); commit(0, e.shiftKey ? -1 : 1); return; }
      if (k === 'Escape') { e.preventDefault(); cancelEdit(); return; }
      if (k === 'F2') { e.preventDefault(); st.edit.mode = st.edit.mode === 'edit' ? 'enter' : 'edit'; drawSel(); return; }
      if (k === 'F4') { e.preventDefault(); toggleAbs(inp); return; }
      const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
      if (mv && st.edit.mode === 'enter' && inp === editor) {
        if (canPoint()) {
          e.preventDefault();
          const p = st.edit.point;
          let r = (p ? p.r1 : st.edit.r) + mv[0], c = (p ? p.c1 : st.edit.c) + mv[1];
          r = Math.max(0, Math.min(NR - 1, r)); c = Math.max(0, Math.min(NC - 1, c));
          if (e.shiftKey && p) pointInsert(p.r0, p.c0, r, c); else pointInsert(r, c, r, c);
          ensureVisible(r, c);
          return;
        }
        e.preventDefault(); commit(mv[0], mv[1]); return;
      }
    }
    function toggleAbs(inp) {
      const t = inp.value, pos = inp.selectionStart || t.length;
      const re = /(\$?)([A-Za-z]{1,3})(\$?)(\d+)/g; let m, hit = null;
      while ((m = re.exec(t))) { if (m.index <= pos && pos <= m.index + m[0].length) hit = m; }
      if (!hit) return;
      const state = (hit[1] ? 2 : 0) + (hit[3] ? 1 : 0);
      const nx = [3, 0, 1, 2][state];
      const rep = (nx & 2 ? '$' : '') + hit[2].toUpperCase() + (nx & 1 ? '$' : '') + hit[4];
      const nt = t.slice(0, hit.index) + rep + t.slice(hit.index + hit[0].length);
      editor.value = nt; fin.value = nt;
      const np = hit.index + rep.length; inp.setSelectionRange(np, np);
      if (st.edit) st.edit.point = null;
    }
    editor.addEventListener('keydown', e => editKey(e, editor));
    fin.addEventListener('keydown', e => editKey(e, fin));
    editor.addEventListener('input', () => { fin.value = editor.value; if (st.edit) { st.edit.point = null; pointbox.style.display = 'none'; } sizeEditor(); stMode.textContent = st.edit && st.edit.mode === 'edit' ? 'Edit' : 'Enter'; });
    fin.addEventListener('input', () => {
      if (!st.edit) { const v = fin.value; startEdit('edit', v, 'fbar'); fin.value = v; }
      editor.value = fin.value; if (st.edit) { st.edit.point = null; pointbox.style.display = 'none'; } sizeEditor();
    });
    fin.addEventListener('mousedown', e => { e.stopPropagation(); });
    fin.addEventListener('focus', () => { if (!st.edit) { const v = fbarText(st.ar, st.ac); startEdit('edit', v, 'fbar'); } });
    editor.addEventListener('mousedown', e => e.stopPropagation());
    q('.xl-fx-x').onmousedown = e => { e.preventDefault(); cancelEdit(); };
    q('.xl-fx-ok').onmousedown = e => { e.preventDefault(); commit(0, 0); };
    q('.xl-fx').onmousedown = e => { e.preventDefault(); if (!st.edit) startEdit('enter', '='); };
    nbin.addEventListener('mousedown', e => e.stopPropagation());
    nbin.addEventListener('focus', () => nbin.select());
    nbin.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = nbin.value.trim().replace(/^.*!/, '');
        const [x, y] = v.split(':'); const p = parseA1(x), p2 = y ? parseA1(y) : null;
        if (!p || (y && !p2)) { FR.dialog({ icon: 'error', title: 'Microsoft Excel', message: 'Reference is not valid.' }); return; }
        if (st.edit) commit(0, 0);
        select(p.r, p.c); if (p2) { st.focus = { r: Math.min(NR - 1, p2.r), c: Math.min(NC - 1, p2.c) }; drawSel(); }
        focusGrid();
      } else if (e.key === 'Escape') { nbin.value = a1(st.ar, st.ac); focusGrid(); }
    });
    nbin.addEventListener('blur', () => { nbin.value = a1(st.ar, st.ac); });
    app.addEventListener('mousedown', e => { if (e.target.closest('.xl-tabbar, .xl-status')) { e.preventDefault(); } });

    // any core dialog (Frank's notes, errors) hands focus back to this window → put the caret back on the grid
    const onDlgClosed = w => { if (st.closed) { FR.bus.off && FR.bus.off('dialog-closed', onDlgClosed); return; } if (!w || w === win || w.id === win.id) setTimeout(focusGrid, 0); };
    if (FR.bus) FR.bus.on('dialog-closed', onDlgClosed);
    const api = {
      book, win, refresh, renderObjs, switchSheet, st, focusGrid,
      applyRaw: list => applyChanges(list),
      select: (ref, sheetName) => { if (sheetName != null) switchSheet(book.idx(sheetName)); const p = parseA1(ref); select(p.r, p.c); },
      setCell(sheetName, ref, raw) { const si = book.idx(sheetName), p = parseA1(ref); applyChanges([{ si, r: p.r, c: p.c, raw: raw[0] === '=' ? normFormula(raw) : raw, s: (book.cell(si, p.r, p.c) || {}).s }]); },
    };
    renderSheet();
    if (opts.startSheet) switchSheet(book.idx(opts.startSheet));
    if (opts.startCell) { const p = parseA1(opts.startCell); select(p.r, p.c); }
    focusGrid();
    if (opts.afterOpen) opts.afterOpen(book, api);
    return api;
  }
  function navSvg(k) {
    const t = { first: '<path d="M1 0v8M8 0L3 4l5 4z"/>', prev: '<path d="M7 0L2 4l5 4z"/>', next: '<path d="M2 0l5 4-5 4z"/>', last: '<path d="M8 0v8M1 0l5 4-5 4z"/>' }[k];
    return `<svg viewBox="0 0 9 8" width="9" height="8" fill="#000" stroke="#000" stroke-width="1">${t}</svg>`;
  }

  /* =====================================================================
     Board copy puzzle hooks
     ===================================================================== */
  const EARLY = "Nice fix — but tick off the earlier items on Frank's Board Pack checklist first.";
  // generic "solve when the workbook reaches the right state" hook (deferred if the checklist isn't there yet)
  function solveHook(o) {
    let wasOk = null, pending = false, uiRef = null, lastNudge = null;
    const test = book => { try { return !!o.test(book); } catch (e) { return false; } };
    const check = (book, ui, fromBus) => {
      uiRef = ui;
      const ok = test(book);
      // near-miss nudges: say something once when the sheet lands in a known trap state
      if (!ok && o.nudge && !fromBus && !FR.puzzle.isSolved(o.puzzle)) {
        let msg = null; try { msg = o.nudge(book); } catch (e) {}
        if (o.sticky) stickyNudge(book, ui, msg && msg !== lastNudge ? msg : null, o.sticky);
        else if (msg && msg !== lastNudge) FR.dialog({ icon: 'info', title: 'Microsoft Excel', width: 420, message: msg }).then(() => { if (uiRef && !uiRef.st.closed) uiRef.focusGrid(); });
        lastNudge = msg;
      }
      if (ok && (wasOk === false || fromBus)) {
        const solved = FR.puzzle.isSolved(o.puzzle) || FR.puzzle.solve(o.puzzle);
        if (solved) { pending = false; if (o.onSolve) o.onSolve(book, ui); }
        else if (!fromBus) { pending = true; FR.dialog({ icon: 'info', title: 'Microsoft Excel', message: o.early || EARLY }); }
      }
      wasOk = ok;
    };
    const onBus = id => {
      if (!uiRef || uiRef.st.closed) { if (uiRef && FR.bus.off) FR.bus.off('solved', onBus); return; }
      if (pending && wasOk) check(uiRef.book, uiRef, true);
      // solved from the checklist (or another window) while this workbook is open → same reveal
      else if (id === o.puzzle && o.onSolve && !uiRef.st.closed) o.onSolve(uiRef.book, uiRef, true);
    };
    FR.bus.on('solved', onBus);
    return {
      afterOpen: (book, ui) => { wasOk = test(book); uiRef = ui; if (o.afterOpen) o.afterOpen(book, ui); },
      afterCalc: (book, ui) => check(book, ui, false),
    };
  }
  // non-modal yellow note next to the puzzle row; replaced/removed on the next edit
  function stickyNudge(book, ui, msg, at) {
    book.sheets.forEach(sh => { const i = sh.shapes.findIndex(x => x.id === 'xnudge'); if (i >= 0) sh.shapes.splice(i, 1); });
    if (msg) {
      const sh = book.sheets[book.idx(at.sheet)];
      sh.shapes.push({ id: 'xnudge', r: at.r, c: at.c, dx: at.dx || 6, dy: at.dy || 2, w: at.w || 236, h: 40, cls: 'xl-sticky xl-pop', html: msg.replace(/^<b>Frank's sticky note:<\/b><br>/, '') + ' —F' });
    }
    if (!ui.st.closed) ui.renderObjs();
  }
  const near = (v, x, tol) => typeof v === 'number' && Math.abs(v - x) <= tol;
  const boardHooks = () => solveHook({
    puzzle: 'ebitda', sticky: { sheet: 'P&L Summary', r: 12, c: 10, dx: 6, dy: 2, w: 236 }, test: b => near(b.val('P&L Summary', 'C12'), 3130, 0.5) && ['E12', 'F12', 'G12', 'H12'].every(a => typeof b.val('P&L Summary', a) === 'number') && b.val('P&L Summary', 'C24') === 'OK',
    onSolve: revealNote, afterOpen: (b, ui) => ui.select('C12'),
    nudge: b => {
      const c = b.val('P&L Summary', 'C12');
      if (near(c, 2230, 0.5)) return "<b>Frank's sticky note:</b><br>2,230 is EBIT. EBITDA sits <b>above</b> D&amp;A (the D is for depreciation, Drew).";
      if (near(c, 3130, 0.5) && ['E12', 'F12', 'G12', 'H12'].some(a => typeof b.val('P&L Summary', a) !== 'number')) return "<b>Frank's sticky note:</b><br>The quarters are still #REF!. Fix the row, not the cell.";
      if (near(c, 3130, 0.5) && b.val('P&L Summary', 'C24') !== 'OK') return "<b>Frank's sticky note:</b><br>FY is right. The quarters in E12:H12 don't add up to it — the check in C24 says so. Same formula, every column.";
      return null;
    },
  });
  const LATER = "That's it — but tick off the earlier items on Frank's Board Pack checklist first.";
  const FNOTE = t => `<b>Frank's sticky note:</b><br>${t}`;
  const covenantHooks = () => solveHook({ puzzle: 'dscr', early: LATER, test: b => near(b.val('Q3 2026 Certificate', 'F23'), 1.25, 0.005),
    nudge: b => {
      const v = b.val('Q3 2026 Certificate', 'F23');
      if (near(v, 1.3, 0.006)) return FNOTE("\"Compliant\" at 1.30x? That's what I sent last time, and the bank sent it back. Section 6.1 takes <b>unfunded capex</b> (row 13) off EBITDA first.");
      if (near(v, 1.1136, 0.006)) return FNOTE("Only capex we paid for in <b>cash</b> comes off. The glue station and the forklifts went on the equipment loan — Karen's email.");
      return null;
    } });
  const bridgeHooks = () => solveHook({
    puzzle: 'bridge', early: LATER,
    test: b => near(b.val('Bridge', 'C9'), -60, 0.5) && near(b.val('Bridge', 'C11'), -40, 0.5) && b.val('Bridge', 'C15') === 'TIES',
    nudge: b => {
      const cb = b.val('Bridge', 'C9');
      if (typeof cb === 'number' && near(Math.abs(cb), 60000, 1)) return FNOTE('Right idea — but the bridge is in <b>$ thousands</b>.');
      if (near(cb, 60, 0.5)) return FNOTE('A cost that went <b>up</b> hurts EBITDA. In this bridge unfavorable is negative: (60).');
      if (b.val('Bridge', 'C15') === 'TIES' && !near(cb, -60, 0.5)) return FNOTE("It ties — but only because Freight is soaking up the difference. Never plug a bar you can calculate: work out <b>containerboard</b> first ($/ton from the mill letter × tons a quarter from our Products page).");
      return null;
    },
  });
  function revealNote(book, ui, fromChecklist) {
    const pi = book.idx('P&L Summary'), s = book.sheets[pi];
    const n = s.shapes.find(x => x.id === 'fnote');
    if (!n || !n.hidden) return;
    n.hidden = false; n.cls = 'xl-sticky xl-pop';
    if (fromChecklist) {
      // the checklist accepted 3,130: make the open Board copy agree with it (row 12 repaired), then show the note
      const fixed = ['C', 'E', 'F', 'G', 'H'].map(c => ({ si: pi, r: 11, c: XL.colIdx(c), raw: `=${c}7-${c}9-${c}10-${c}11` }));
      if (ui.applyRaw) ui.applyRaw(fixed);
      if (ui.st.si !== pi) ui.switchSheet(pi);
    }
    if (ui.st.si === pi) ui.renderObjs();
  }

  /* =====================================================================
     App entry
     ===================================================================== */
  FR.apps.excel = node => {
    node = node && FR.fs ? FR.fs.get(node) : node;
    const id = node ? 'xl-' + node.id : undefined;
    if (id && FR.wm.wins && FR.wm.wins.has(id)) { const w = FR.wm.wins.get(id); w.restore && w.restore(); w.focus(); return; }
    if (!node) { bookCounter++; return openWorkbook(blankBook(bookCounter), {}); }
    const o = { id, node };
    switch (node.id) {
      case 'bud_v3': case 'bud_v4': case 'bud_v5ff': case 'bud_v5ut': case 'bud_v6':
        return openWorkbook(budgetBook(node.id), o);
      case 'bud_board': return openProtected(node, o, { pw: ['4406'], flag: 'xlBoardPw', puzzle: 'unlock', build: boardBook, hooks: boardHooks, failHint: '"hint is in the version Diane approved. red triangle."',
        decoys: { '2109': 'That hint was in v4. Not the one, Joshua. —F', '1991118': 'That hint was in v4 — and SUM means add. Not the one, Joshua. —F', '1993': 'That hint was in v5 FINAL FINAL. Not the one, Joshua. —F', 'packa1958': 'That hint was in v6, Diane\'s review copy. Not the one, Joshua. —F', '1958': 'That is the Windows password. Different lock. —F', '24002006': 'Right numbers. SUM them, don\'t glue them. —F', '4423': 'ISO recertified 2023, first certified 2006. FIRST. —F', '2400': 'Half of it. —F', '2006': 'The other half. —F' } });
      case 'forboardx': return openProtected(node, o, { pw: '18243', flag: 'xlForBoardPw', puzzle: 'forboard', build: forBoardBook, failHint: '"=CONCAT(what they told the Board, what is true). left a note in REAL VERSION."',
        early: "Password accepted.<br><br>Excel: this file is linked to files you haven't rebuilt yet. Finish Frank's checklist up to the bridge, then open it.",
        decoys: { '43182': 'Right numbers. Wrong order. What they told the Board comes first. —F', '18251': 'The formula said 51. Nobody believed the formula either. What is true today (10/16) is in the change log. —F', '182': 'That is what they told the Board. And then what is true. —F', '43': 'That is what is true. What they told the Board comes first. —F', '225': 'Not a sum. =CONCAT. —F' } });
      case 'bp_q1': case 'bp_q2': case 'bp_q3': case 'bp_q4': return openWorkbook(packBook(node.id), Object.assign(o, node.id === 'bp_q4' ? { startSheet: 'Cash Runway', startCell: 'B30' } : {}));
      case 'changelog': return openWorkbook(changelogBook(), Object.assign(o, { startCell: 'H17' }));
      case 'model47': return openWorkbook(model47Book(), o);
      case 'k_ranked': return openWorkbook(rankedBook(), o);
      case 'copybudget':
        FR.dialog({ icon: 'error', title: 'Microsoft Excel', width: 440, message: `'${esc(node.name)}' cannot be found. Check the spelling of the file name, and verify that the file location is correct.` });
        return;
      case 'covenant': return openWorkbook(covenantBook(), Object.assign(o, { startCell: 'F23' }, covenantHooks()));
      case 'cash13': return openWorkbook(cashBook(), Object.assign(o, { startCell: 'B14' }));
      case 'bridge': return openWorkbook(bridgeBook(), Object.assign(o, bridgeHooks(), { startCell: 'C9' }));
      case 'esports': return openWorkbook(esportsBook(), o);
      case 'bud_v2':
        FR.dialog({ icon: 'warn', title: 'Microsoft Excel', width: 440, buttons: ['Yes', 'No'], message: `Excel found unreadable content in '${esc(node.name)}'. Do you want to recover the contents of this workbook? If you trust the source of this workbook, click Yes.` })
          .then(r => { if (r.button === 'Yes') { const ui = openWorkbook(v2Book(), o); ui.win.setTitle('Microsoft Excel - Budget_FY27_v2.xls  [Repaired]'); } });
        return;
      default: { bookCounter++; const b = blankBook(bookCounter); b.name = node.name; return openWorkbook(b, o); }
    }
  };
  const prompting = {};
  const miss = () => { try { FR.puzzle.miss && FR.puzzle.miss(); } catch (e) {} };
  // "=SUM(2400,2006)" / "SUM(2400,2006)" / "2400+2006" count as the number they make
  function pwNorm(v) {
    let t = String(v || '').trim().replace(/[\s$,.]/g, '');
    const m2 = /^=?SUM\((\d+),(\d+)\)$/i.exec(String(v || '').replace(/\s/g, ''));
    if (m2) return String(+m2[1] + +m2[2]);
    const m3 = /^=?(\d+)\+(\d+)$/.exec(t);
    if (m3) return String(+m3[1] + +m3[2]);
    return t.replace(/^=/, '');
  }
  function openProtected(node, o, cfg) {
    const go = () => openWorkbook(cfg.build(), Object.assign(o, cfg.hooks ? cfg.hooks() : {}));
    const tooEarly = () => cfg.early && !FR.puzzle.isUnlocked(cfg.puzzle);
    if (FR.puzzle.isSolved(cfg.puzzle)) return go();
    if (FR.flags.get(cfg.flag)) { if (tooEarly()) { FR.dialog({ icon: 'info', title: 'Microsoft Excel', width: 440, message: cfg.early }); return; } FR.puzzle.solve(cfg.puzzle); return go(); }
    if (prompting[cfg.flag]) return;
    prompting[cfg.flag] = true;
    FR.dialog({ icon: 'lock', title: 'Password', message: `'${esc(node.name)}' is protected.`, input: { label: 'Password:', type: 'password' }, buttons: ['OK', 'Cancel'] }).then(r => {
      prompting[cfg.flag] = false;
      if (r.button !== 'OK') return;
      const typed = pwNorm(r.value);
      if ([].concat(cfg.pw).includes(typed)) {
        FR.flags.set(cfg.flag, true);
        if (tooEarly()) { FR.dialog({ icon: 'info', title: 'Microsoft Excel', width: 440, message: cfg.early }); return; }
        const ok = FR.puzzle.solve(cfg.puzzle);
        go();
        if (!ok) FR.dialog({ icon: 'info', title: 'Microsoft Excel', message: "Password accepted — but tick off the earlier items on Frank's Board Pack checklist first." });
      } else {
        miss();
        const fails = (FR.state.flags[cfg.flag + 'Fails'] || 0) + 1; FR.state.flags[cfg.flag + 'Fails'] = fails; FR.save();
        const decoy = cfg.decoys && cfg.decoys[typed.toLowerCase()];
        let extra = '';
        if (decoy) extra = `<div style="margin-top:8px;color:#555"><i>File comment (Frank Warmington): "${decoy}"</i></div>`;
        else if (fails >= 3 && cfg.failHint) extra = `<div style="margin-top:8px;color:#555"><i>File comment (Frank Warmington): ${cfg.failHint}</i></div>`;
        FR.dialog({ icon: 'error', title: 'Microsoft Excel', width: 420, message: 'The password you supplied is not correct. Verify that the CAPS LOCK key is off and be sure to use the correct capitalization.' + extra });
      }
    });
  }
  // a correct password entered too early counts as soon as the checklist catches up
  if (FR.bus) FR.bus.on('solved', () => {
    [['xlBoardPw', 'unlock'], ['xlForBoardPw', 'forboard']].forEach(([f, id]) => { if (FR.flags.get(f) && !FR.puzzle.isSolved(id) && FR.puzzle.isUnlocked(id)) FR.puzzle.solve(id); });
  });
})();
