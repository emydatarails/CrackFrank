// node test for excel.js engine + SPEC numbers
globalThis.window = globalThis;
require('../src/apps/excel.js');
const XL = FR.xl, B = XL.books;
let fails = 0;
const eq = (name, got, exp, tol = 1e-9) => { const ok = typeof exp === 'number' ? typeof got === 'number' && Math.abs(got - exp) <= tol : got === exp; if (!ok) fails++; console.log((ok ? 'ok  ' : 'FAIL') + ' ' + name + ' = ' + (got && got.e ? got.e : got) + (ok ? '' : ' (expected ' + exp + ')')); };
// engine basics
const bk = B.blankBook(1); const s = bk.idx('Sheet1');
const set = (a, v) => { const p = XL.parseA1(a); bk.setRaw(s, p.r, p.c, v); };
const g = a => { const p = XL.parseA1(a); return bk.get(s, p.r, p.c); };
set('A1', '10'); set('A2', '20'); set('A3', '=A1+A2*2'); eq('A3', g('A3'), 50);
set('A4', '=-2^2'); eq('-2^2', g('A4'), 4);
set('A5', '=SUM(A1:A3)/0'); eq('div0', g('A5'), undefined === 1 ? 0 : g('A5')); eq('div0 err', g('A5').e, '#DIV/0!');
set('A6', '=FOO(1)'); eq('name', g('A6').e, '#NAME?');
set('A7', '=A1+#REF!'); eq('ref', g('A7').e, '#REF!');
set('A8', '=A1+"x"'); eq('value', g('A8').e, '#VALUE!');
set('B1', '=B2'); set('B2', '=B1+1'); eq('circ', g('B2'), 1); eq('circ flag', bk.circ, true);
set('C1', '=ROUND(2.5,0)'); eq('round', g('C1'), 3); set('C2', '=ROUND(-1.005,2)'); eq('round neg', g('C2'), -1.01);
set('C3', '=IF(A1>5,"big","small")'); eq('if', g('C3'), 'big');
set('C4', '=SUMPRODUCT(A1:A2,A1:A2)'); eq('sumproduct', g('C4'), 500);
set('C5', "=Sheet2!A1+1"); eq('xsheet blank', g('C5'), 1);
set('C6', "=AVERAGE(A1:A2)"); eq('avg', g('C6'), 15);
set('C7', "=MAX(A1:A3)-MIN(A1:A3)"); eq('maxmin', g('C7'), 40);
set('C8', "=COUNT(A1:A8)"); eq('count', g('C8'), 4);
set('C9', "=INDEX(A1:A3,MATCH(20,A1:A3,0))"); eq('index/match', g('C9'), 20);
set('C10', "=ABS(-3)+10%"); eq('abs pct', g('C10'), 3.1);
eq('norm', XL.normFormula("=sum(a1:b2)+'P&L Summary'!c5+round(1"), "=SUM(A1:B2)+'P&L Summary'!C5+ROUND(1)");
eq('shift', XL.shiftFormula('=A1+$B$2+C$3', 1, 1), '=B2+$B$2+D$3');
// budgets
const v5i = () => B.budgetBook('bud_v5ut');
const gm = {};
for (const id of ['bud_v3', 'bud_v4', 'bud_v5ff', 'bud_v5ut', 'bud_v6']) {
  const b = B.budgetBook(id);
  const rev = b.val('P&L Summary', 'C5'), cogs = b.val('P&L Summary', 'C6');
  gm[id] = ((rev - cogs) / rev * 100).toFixed(1);
  console.log(id, 'Rev', rev, 'COGS', cogs, 'GM%', gm[id], 'Rent', b.val('P&L Summary', 'C10'), 'SGA', b.val('P&L Summary', 'C9'), 'Other', b.val('P&L Summary', 'C11'), 'EBITDA', b.val('P&L Summary', 'C12'), 'EBIT', b.val('P&L Summary', 'C14'), 'NI', b.val('P&L Summary', 'C18'), 'HC', b.val('Headcount', 'B11'), 'chk', b.val('P&L Summary', 'C24'), b.val('P&L Summary', 'C25'));
  eq(id + ' qchk', b.val('P&L Summary', 'C24'), 'OK'); eq(id + ' opexchk', b.val('P&L Summary', 'C25'), 'OK');
}
eq('gm v3', gm.bud_v3, '22.0'); eq('gm v4', gm.bud_v4, '23.1'); eq('gm v5ff', gm.bud_v5ff, '22.0'); eq('gm v5ut', gm.bud_v5ut, '22.0'); eq('gm v6', gm.bud_v6, '21.4');
eq('v5ut EBITDA', B.budgetBook('bud_v5ut').val('P&L Summary', 'C12'), 3130);
eq('v5ut EBIT', B.budgetBook('bud_v5ut').val('P&L Summary', 'C14'), 2230);
eq('v3 HC', B.budgetBook('bud_v3').val('Headcount', 'B11'), 112);
eq('v5ff rent', B.budgetBook('bud_v5ff').val('P&L Summary', 'C10'), 180);
// board
const bb = B.boardBook(); const pl = bb.idx('P&L Summary');
eq('board EBITDA broken', bb.val('P&L Summary', 'C12').e, '#REF!'); eq('board EBIT broken', bb.val('P&L Summary', 'C14').e, '#REF!');
eq('board GP', bb.val('P&L Summary', 'C7'), 8800);
bb.setRaw(pl, 11, 2, '=C7-C9-C10-C11'); eq('board EBITDA fixed', bb.val('P&L Summary', 'C12'), 3130); eq('board EBIT', bb.val('P&L Summary', 'C14'), 2230);
eq('board check still REF (quarters unfixed)', bb.val('P&L Summary', 'C24').e, '#REF!');
['E','F','G','H'].forEach((c, i) => bb.setRaw(pl, 11, 4 + i, `=${c}7-${c}9-${c}10-${c}11`)); eq('board check OK after row fix', bb.val('P&L Summary', 'C24'), 'OK');
eq('interest FY (declining)', Math.round(v5i().val('P&L Summary', 'C15') * 10) / 10, 400.8); eq('interest Q1', v5i().val('P&L Summary', 'E15'), 112.5); eq('interest Q4', v5i().val('P&L Summary', 'H15'), 87.9);
eq('HC reconciliation', v5i().val('Headcount', 'D20'), v5i().val('Headcount', 'D11')); eq('HC hourly all-in', v5i().val('Headcount', 'D18'), 5096); eq('HC salaried', v5i().val('Headcount', 'D19'), 2700); eq('HC salaried check', v5i().val('Headcount', 'D21'), 'OK'); eq('HC v3 salaried check', B.budgetBook('bud_v3').val('Headcount', 'D21'), 'OK');
eq('model 47 tabs still', B.model47Book().sheets.length, 47); eq('debt sched TLA closing Q3', B.model47Book().val('Debt Schedule', 'D8'), 6000);
eq('equipment loan Q2 closing = Q3 opening', B.model47Book().val('Debt Schedule', 'C16'), 300); eq('equipment loan Q3 opening', B.model47Book().val('Debt Schedule', 'D12'), 300); eq('equipment loan Q4 closing', B.model47Book().val('Debt Schedule', 'E16'), 250);
['Q1 Bridge', 'Q2 Bridge', 'Revenue Bridge'].forEach(t => eq(t + ' foots', B.model47Book().val(t, t === 'Revenue Bridge' ? 'G5' : 'H5'), { 'Q1 Bridge': 690, 'Q2 Bridge': 760, 'Revenue Bridge': 27910 }[t]));
eq('Revenue Bridge label', B.model47Book().val('Revenue Bridge', 'A5'), 'FY 2026 YTD'); eq('Q4 bridge open', /open/.test(B.model47Book().val('Q4 Bridge', 'A7')), true);
eq('BS total assets', B.model47Book().val('Balance Sheet', 'A9'), 'Total assets'); eq('Volumes unit', B.model47Book().val('Volumes', 'A2'), '(tons)');
eq('CONCAT', (() => { set('D1', '=CONCAT(182,43)'); return g('D1'); })(), '18243'); eq('CONCATENATE', (() => { set('D2', '=CONCATENATE("a",1)'); return g('D2'); })(), 'a1');
eq('v5ut Notes C11 not a formula', typeof B.budgetBook('bud_v5ut').val('Notes', 'C11'), 'string');
eq('v6 saved by Diane', /Diane Kessler/.test(B.budgetBook('bud_v6').val('P&L Summary', 'K2')), true);
eq('board saved 10/16 3:04', /10\/16\/2026 3:04 AM/.test(bb.val('P&L Summary', 'K2')), true);
eq('DS interest Q1', B.model47Book().val('Debt Schedule', 'B6'), 137.1);
eq('board HC', bb.val('Headcount', 'B11'), 118);
// covenant
const cv = B.covenantBook(), cs = 'Q3 2026 Certificate';
eq('TTM', cv.val(cs, 'F8'), 2860); eq('interest', cv.val(cs, 'F18'), 450); eq('debt svc', cv.val(cs, 'F20'), 2200);
cv.setRaw(cv.idx(cs), 12, 5, '=F11-F12'); cv.setRaw(cv.idx(cs), 22, 5, '=(F8-F13)/F20'); eq('DSCR', cv.val(cs, 'F23'), 1.25); eq('headroom', cv.val(cs, 'F25'), 0, 1e-9);
eq('capex log', cv.val('Capex log', 'C8'), 410); eq('compliant Y/N', cv.val(cs, 'F26'), 'Y'); eq('compliant Y/N blank before', B.covenantBook().val(cs, 'F26'), '');
eq('cert interest label', /test-date balance/.test(cv.val(cs, 'A18')), true); eq('capex log die-cutter', /09\/16\/2026/.test(cv.val('Capex log', 'A7')), true);
// cash (v2 REAL)
const C = XL.CASH; C.disb.forEach((d, i) => { const sum = C.ap[i] + C.sal[i] + C.mat[i] + C.freight[i] + C.util[i] + C.rent[i] + C.debt[i] + C.ins[i] + C.other[i]; if (sum !== d || C.ap[i] < 100) { fails++; console.log('FAIL disb wk', i + 1, sum, d, C.ap[i]); } });
eq('debt service 183 in wks 1,5,9 only', C.debt.join(','), '183,0,0,0,183,0,0,0,183,0,0,0,0'); eq('salaried monthly 225 in wks 2,7,11', C.sal.join(','), '0,225,0,0,0,0,225,0,0,0,225,0,0');
console.log('AP catch-up', C.ap.join(','));
const csn = '13-wk Cash REAL', W = 'BCDEFGHIJKLMN'.split('');
const cb0 = B.cashBook(); const endNoPay = W.map(c => cb0.val(csn, c + '28'));
eq('disb totals', W.map(c => cb0.val(csn, c + '24')).join(','), C.disb.join(','));
eq('cash line labels', [15, 21].map(r => cb0.val(csn, 'A' + r)).join(' | '), 'Salaried payroll & benefits (monthly) | Debt service');
eq('no payroll first breach', endNoPay.findIndex(v => v < 250) + 1, 7);
const cb = B.cashBook(), ci = cb.idx(csn);
[0, 2, 4, 6, 8, 10, 12].forEach(i => cb.setRaw(ci, 13, 1 + i, '196'));
const ends = W.map(c => cb.val(csn, c + '28')); console.log('ending', ends.join(', '));
eq('cash ending series', ends.join(','), '2260,1740,1130,610,110,-320,-716,-866,-1242,-1362,-1718,-1818,-2164');
eq('first breach wk', ends.findIndex(v => v < 250) + 1, 5); eq('first negative wk', ends.findIndex(v => v < 0) + 1, 6);
const cw = B.cashBook(); W.forEach((c, i) => cw.setRaw(cw.idx(csn), 13, 1 + i, '196')); eq('weekly payroll trap first breach', W.map(c => cw.val(csn, c + '28')).findIndex(v => v < 250) + 1, 4);
eq('cash footnote empty', cb0.val(csn, 'A35').startsWith('Payroll row still empty'), true); eq('cash footnote filled', cb.val(csn, 'A35'), "Payroll in. Now it's just bad news.");
eq('DO NOT DELETE sheet', cb.idx('DO NOT DELETE') >= 0, true);
// board packs / change log / model / for board
for (const id of ['bp_q1', 'bp_q2', 'bp_q3', 'bp_q4']) { const p = B.packBook(id); console.log(id, 'runway', p.val('Cash Runway', 'B30'), 'days, cash-out', XL.fmtNum(p.val('Cash Runway', 'B32'), 'date').t, 'KPI C7', XL.fmtNum(p.val('Board KPIs', 'C7'), 'days').t); }
const q4 = B.packBook('bp_q4'); eq('Q4 runway 182 (typed)', q4.val('Cash Runway', 'B30'), 182); eq('Q4 calc cell', q4.val('Cash Runway', 'C30'), 'calc: 51'); eq('Q4 KPI GM', q4.val('Board KPIs', 'B5'), 0.198); eq('Q4 base 3,093', q4.val('Cash Runway', 'B9'), 3093);
eq('Q1 pack runway', B.packBook('bp_q1').val('Cash Runway', 'B30'), 581); eq('Q2 pack runway', B.packBook('bp_q2').val('Cash Runway', 'B30'), 243); eq('Q3 pack runway', B.packBook('bp_q3').val('Cash Runway', 'B30'), 131);
eq('Q1 pack HC 112', B.packBook('bp_q1').val('Board KPIs', 'B8'), 112); eq('Q4 pack HC 118', q4.val('Board KPIs', 'B8'), 118);
const q3pl = B.bridgeBook(); eq('Q3 P&L implied GM', Math.round((q3pl.val('Q3 P&L', 'D5') - q3pl.val('Q3 P&L', 'D6') - q3pl.val('Q3 P&L', 'D7')) / q3pl.val('Q3 P&L', 'D5') * 1000) / 1000, 0.198);
const m47 = B.model47Book(); eq('47 tabs', m47.sheets.length, 47); eq('real runway 43', m47.val('Summary', 'B30'), 43); eq('DND real runway', m47.val('DO NOT DELETE', 'B8'), 43); eq('DND gap', m47.val('DO NOT DELETE', 'B10'), 139);
const cl = B.changelogBook(); eq('DH overrides', cl.val('Change Log', 'D19'), 8); eq('FW warnings', cl.val('Change Log', 'D20'), 5); eq('last FW date', XL.fmtNum(cl.val('Change Log', 'A17'), 'ymd').t, '2026-10-16'); eq('last FW text', cl.val('Change Log', 'H17'), "Real runway 43 days. Board is Tuesday. I'm done.");
const fb = B.forBoardBook(); eq('funding need', fb.val('EMERGENCY PLAN', 'C15'), 2414); eq('cushion', fb.val('EMERGENCY PLAN', 'C18'), 1586); eq('waiver condition', /waiver/.test(fb.val('EMERGENCY PLAN', 'B24')), true);
// bridge
const br = B.bridgeBook(), bs = br.idx('Bridge');
eq('bridge budget', br.val('Bridge', 'C6'), 850); eq('bridge actual', br.val('Bridge', 'C12'), 690);
eq('bridge check unknowns', br.val('Bridge', 'C14'), 100);
br.setRaw(bs, 8, 2, '=-40*1500/1000'); br.setRaw(bs, 10, 2, '=C12-C6-SUM(C7:C10)');
eq('bridge containerboard', br.val('Bridge', 'C9'), -60); eq('bridge freight', br.val('Bridge', 'C11'), -40); eq('bridge ties', br.val('Bridge', 'C15'), 'TIES');
eq('q3 pl var', br.val('Q3 P&L', 'E10'), -160); eq('q3 pl materials memo foots', br.val('Q3 P&L', 'D17'), br.val('Q3 P&L', 'D6'));
eq('esports modeling case 30:42', XL.fmtNum(B.esportsBook().val('Practice log', 'C14'), 'ms1').t, '30:42.0');
// formatting
eq('fmt n0 neg', XL.fmtNum(-1234.4, 'n0').t, '(1,234)'); eq('fmt x2', XL.fmtNum(1.25, 'x2').t, '1.25x'); eq('fmt p1', XL.fmtNum(0.25, 'p1').t, '25.0%'); eq('fmt ms1', XL.fmtNum(107.1, 'ms1').t, '1:47.1');
// (R6 Q8) General-format numbers fit their column the way Excel does: fewer decimals, then scientific, then ###
const fitN = (v, n) => XL.fitGeneral(v, t => t.length <= n);
eq('general fits as is', fitN(2000 * Math.pow(1.015, 12), 11), '2391.236343');
eq('general 8 wide: 3 decimals (Excel: 2391.236)', fitN(2000 * Math.pow(1.015, 12), 8), '2391.236');
eq('general 6 wide', fitN(2391.2363, 6), '2391.2'); eq('general 4 wide: no decimals', fitN(2391.2363, 4), '2391');
eq('general rounds up', fitN(2391.96, 4), '2392'); eq('general negative', fitN(-2391.2363, 7), '-2391.2');
eq('general trailing zeros dropped', fitN(1.50004, 4), '1.5');
eq('general big integer → scientific (Excel: 1.23457E+11)', fitN(123456789012, 11), '1.23457E+11');
eq('general big integer, narrow', fitN(123456789012, 5), '1E+11'); eq('general 3 wide: ###', fitN(123456789012, 3), null);
eq('general small number keeps a digit (scientific)', fitN(0.0000123, 5), '1E-05');
eq('general 0.5 at 1 wide rounds (Excel: 1)', fitN(0.5, 1), '1');
eq('split', XL.split(30810, [23, 25, 26, 26]).reduce((a, b) => a + b), 30810);
B.esportsBook(); B.v2Book();
// v3
const v5 = B.budgetBook('bud_v5ut'); eq('GM% row FY', Math.round(v5.val('P&L Summary', 'C8') * 1000) / 10, 22); eq('GM% row Q1', Math.round(v5.val('P&L Summary', 'E8') * 1000) / 10, 22);
eq('v4 GM row', Math.round(B.budgetBook('bud_v4').val('P&L Summary', 'C8') * 1000) / 10, 23.1); eq('v6 GM row', Math.round(B.budgetBook('bud_v6').val('P&L Summary', 'C8') * 1000) / 10, 21.4);
eq('board GM row', Math.round(B.boardBook().val('P&L Summary', 'C8') * 1000) / 10, 22);
eq('v5 hint', v5.cell(0, 0, 0).cm.t, "PW = SUM(Walter's seed money, the year we first got ISO certified). About Us + Quality & Safety. Digits only. —F");
eq('cov compliant text', cv.val(cs, 'H23'), 'COMPLIANT — 1.25x');
const kr = B.rankedBook(); eq('ranked #212 score', kr.val('RANKED', 'G21'), 10); eq('ranked #88', kr.val('RANKED', 'G10'), 9.7); eq('ranked #001 label', kr.val('RANKED', 'A5'), '#001'); eq('ranked dates ascending', (() => { let ok = true; for (let r = 6; r <= 21; r++) if (kr.val('RANKED', 'C' + r) <= kr.val('RANKED', 'C' + (r - 1))) ok = false; return ok; })(), true);
eq('model47 Q3 Bridge actual', B.model47Book().val('Q3 Bridge', 'H5'), 690); eq('Q3 P&L G17 empty', B.bridgeBook().val('Q3 P&L', 'G17'), null); eq('webinars', kr.val('Webinars attended', 'C11'), 7); eq('questions', kr.val('Webinars attended', 'C12'), 20);
console.log(fails ? fails + ' FAILURES' : 'ALL PASS'); process.exit(fails ? 1 : 0);
