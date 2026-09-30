/* FRANK'S COMPUTER — ShowMe ERP Classic 4.2: Packa's ERP. Old, grey, not fancy, and it works.
   It holds the transactions (vendors, customers, inventory, POs, period close); the budget, the forecast and the Board
   Pack live in Frank's Excel files. That's the joke: the data exists, nothing connects it.
   CANON: this app must never show a puzzle number (EBITDA, DSCR, capex, payroll, tons, cash, bridge bars, passwords).
   See docs/CANON_DECISIONS.md → "Packa's ERP". */
(() => {
  const $ = FR.$, esc = FR.esc;
  const PRODUCT = 'ShowMe ERP Classic 4.2';
  let exported = 1284;   // reports exported to Excel this year; every "Run" adds one (Frank's only workflow)

  const table = (head, rows, cls = '') => `<table class="erp-t ${cls}"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const kv = rows => `<table class="erp-kv">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>`;
  const note = (t, cls = '') => `<div class="erp-note ${cls}">${t}</div>`;
  const locked = (t, sub) => `<div class="erp-lock">${FR.icon('lock', 32)}<div><b>${t}</b><p>${sub}</p></div></div>`;

  /* ---------- screens (html only; no puzzle numbers) ---------- */
  const S = {
    home: ['Home', 'Company 01 &middot; Sedalia, MO', () => `
      <h3>Welcome, FWARMINGTON</h3>
      ${kv([
        ['Company', '01 &mdash; PACKA CORPORATION'],
        ['Fiscal year', 'Calendar (FY2026)'],
        ['Current period', 'P10 &mdash; October 2026 <span class="erp-ok">Open</span>'],
        ['Last period close', 'P09 September 2026 &mdash; closed 10/07/2026 by FWARMINGTON'],
        ['Last log on', 'FWARMINGTON &middot; 10/16/2026 11:48 PM &middot; this workstation'],
        ['Database', 'PACKA-SQL01 (server closet, behind the mop bucket)'],
      ])}
      <div class="erp-box"><div class="erp-box-h">Messages (4)</div><ul>
        <li>3 purchase orders are waiting for your approval.</li>
        <li>Journal entry JE-10-0042 <i>Q3 accrual true-up</i> is waiting for approval by FWARMINGTON.</li>
        <li>Your password expires in 3 days. <span class="erp-dim">(It has said that since 2017.)</span></li>
        <li>Your support contract expired on 12/31/2014. Please call your Show-Me representative. <span class="erp-dim">(He retired.)</span></li>
      </ul></div>`],

    gl: ['General Ledger', 'Periods &middot; Chart of accounts &middot; Journal entries', () => `
      <h3>Period status &mdash; FY2026</h3>
      <div class="erp-periods">${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) =>
        `<span class="${i < 9 ? 'c' : i === 9 ? 'o' : 'f'}"><b>P${String(i + 1).padStart(2, '0')}</b>${m}<i>${i < 9 ? 'Closed' : i === 9 ? 'Open' : 'Future'}</i></span>`).join('')}</div>
      <h3>Chart of accounts (excerpt)</h3>
      ${table(['Account', 'Description', 'Type'], [
        ['1000', 'Cash &mdash; Operating (Prairie Ledger Bank)', 'Asset'], ['1010', 'Cash &mdash; Payroll clearing', 'Asset'],
        ['1200', 'Accounts receivable &mdash; Trade', 'Asset'], ['1300', 'Inventory &mdash; Raw materials', 'Asset'],
        ['1310', 'Inventory &mdash; Finished goods', 'Asset'], ['1500', 'Machinery &amp; equipment', 'Asset'],
        ['2000', 'Accounts payable &mdash; Trade', 'Liability'], ['2100', 'Accrued payroll', 'Liability'],
        ['2500', 'Term Loan A &mdash; Prairie Ledger Bank', 'Liability'], ['2510', 'Equipment loan', 'Liability'],
        ['4000', 'Sales &mdash; Corrugated boxes', 'Revenue'], ['4100', 'Sales &mdash; Die-cut &amp; specialty', 'Revenue'],
        ['5000', 'COGS &mdash; Materials', 'Expense'], ['5200', 'COGS &mdash; Freight', 'Expense'],
        ['6000', 'SG&amp;A &mdash; Salaries', 'Expense'], ['6400', 'Rent &amp; leases', 'Expense'], ['6900', 'Other operating expense', 'Expense'],
      ])}
      <h3>Journal entries waiting for approval</h3>
      ${table(['Entry', 'Description', 'Prepared by', 'Status'], [
        ['JE-10-0042', 'Q3 accrual true-up', 'J. Reyes', '<span class="erp-warn">Waiting for FWARMINGTON</span>'],
        ['JE-10-0043', 'Reclass: cowboy hat to Marketing', 'D. Hollis', '<span class="erp-bad">Rejected (D. Kessler)</span>'],
      ])}
      ${note('Balances: run a Trial Balance from <b>Reports</b>. It exports to Excel. Everything does.')}`],

    ap: ['Accounts Payable', 'Vendor master', () => `
      ${table(['Vendor', 'Name', 'City', 'Terms', 'Status'], [
        ['V0101', 'Ozark Kraft Mills', 'Springfield, MO', 'Net 30', 'Active'],
        ['V0114', 'Sedalia Machine Works', 'Sedalia, MO', 'Net 30', 'Active'],
        ['V0120', 'Heartland Pallet Co.', 'Warsaw, MO', 'Net 15', 'Active'],
        ['V0133', 'Katy Freight Lines', 'Sedalia, MO', 'Net 30', 'Active'],
        ['V0140', 'Sedalia Power &amp; Light', 'Sedalia, MO', 'Net 10', 'Active'],
        ['V0152', 'Missouri Foam &amp; Crating', 'Columbia, MO', 'Net 30', 'Active'],
        ['V0166', 'Ink &amp; Plate Supply', 'Kansas City, MO', 'Net 30', 'Active'],
        ['V0199', 'Sedalia Industrial Park LLC (warehouse lease)', 'Sedalia, MO', 'Monthly', 'Active'],
        ['V0212', 'Cheat Sheet Club (membership)', 'Riga, Latvia', '&mdash;', '<span class="erp-bad">Blocked: personal expense (D. Kessler)</span>'],
      ])}
      ${locked('Invoice history is restricted', 'Paid invoices and payment details need the AP Manager role. Nobody at Packa has had it since 2016.')}`],

    ar: ['Accounts Receivable', 'Customer master', () => `
      ${table(['Customer', 'Name', 'City', 'Terms', 'Credit'], [
        ['C1001', 'Katy Trail Bottling Co.', 'Boonville, MO', 'Net 30', 'OK'],
        ['C1002', 'Sedalia Feed &amp; Seed', 'Sedalia, MO', 'Net 30', 'OK'],
        ['C1003', 'Lake of the Ozarks Candle Works', 'Osage Beach, MO', 'Net 45', 'OK'],
        ['C1004', 'Heartland Pet Supply', 'Columbia, MO', 'Net 30', 'OK'],
        ['C1005', 'Show-Me Barbecue Sauce Co.', 'Kansas City, MO', 'Net 30', 'OK'],
        ['C1006', 'Mid-Missouri Hardware &amp; Mail Order', 'Jefferson City, MO', 'Net 30', 'OK'],
        ['C1007', 'State Fair Concessions', 'Sedalia, MO', 'Due on receipt', '<span class="erp-dim">August only</span>'],
        ['C1008', 'Hollis Western Wear', 'Sedalia, MO', 'Net 60', '<span class="erp-bad">On hold &mdash; "ask Drew" (his cousin)</span>'],
      ])}`],

    inv: ['Inventory', 'Item master &middot; Warehouse 01', () => `
      ${table(['Item', 'Description', 'UOM', 'On hand'], [
        ['FG-RSC-121212', 'Regular slotted carton 12&times;12&times;12', 'EA', '18,400'],
        ['FG-RSC-181212', 'Regular slotted carton 18&times;12&times;12', 'EA', '9,750'],
        ['FG-MLR-0906', 'Die-cut mailer 9&times;6', 'EA', '22,300'],
        ['FG-PAL-4840', 'Pallet box 48&times;40', 'EA', '610'],
        ['RM-LNR-42', 'Linerboard 42# (rolls)', 'ROLL', '<span class="erp-dim">not tracked here &mdash; count sheet in Karen\'s office</span>'],
        ['RM-MED-26', 'Corrugating medium 26# (rolls)', 'ROLL', '<span class="erp-dim">see RM-LNR-42</span>'],
        ['SUP-GLUE', 'Starch adhesive', 'DRUM', '38'],
      ])}
      ${note('Last physical count: 06/30/2026. Cycle counts: "soon" (K. Wills).')}`],

    po: ['Purchasing', 'Purchase orders waiting for approval', () => `
      ${table(['PO', 'Vendor', 'Description', 'Requested by', ''], [
        ['PO-26-0917', 'Heartland Pallet Co.', 'Pallets, 48&times;40 heat-treated', 'K. Wills', '<button class="erp-b" data-approve>Approve</button>'],
        ['PO-26-0918', 'Missouri Foam &amp; Crating', 'Foam inserts for the candle account', 'T. Bracken', '<button class="erp-b" data-approve>Approve</button>'],
        ['PO-26-0919', 'Ink &amp; Plate Supply', 'Flexo plates, new BBQ sauce artwork', 'T. Bracken', '<button class="erp-b" data-approve>Approve</button>'],
      ])}`],

    prod: ['Production', 'Work orders &middot; Plant', () => `
      ${kv([['Open work orders', '42'], ['Shifts', 'Two (second shift added in September &mdash; K. Wills)'], ['Machines', 'Flexo folder-gluer, rotary die-cutter, glue station'], ['Days without an incident', '<span class="erp-dim">See the sign. The sign has notes.</span>']])}`],

    pay: ['Payroll &amp; HR', '', () => locked('Module not licensed', "Payroll hasn't run in ShowMe since 2016. It runs on Rachel's spreadsheet and the bank's portal. Headcount questions: Rachel.")],

    bud: ['Budgeting', '', () => `${locked('Budget module: last used FY2019', 'Note on the FY2019 budget, by F. Warmington (03/2019): <i>"Excel is faster."</i><br>The FY27 budget is in My Documents &rsaquo; FY27 Budget. Pick the right version.')}`],

    cash: ['Cash Forecast', '', () => locked('Not included in ShowMe ERP Classic', 'Cash forecasting is part of ShowMe Professional (released 2009). Packa is on Classic. Cash forecasting at Packa lives in Excel.')],

    board: ['Board Reporting', '', () => locked('No Board reporting in ShowMe', "The Board Pack is not an ERP report. It's Frank's folders, Frank's spreadsheets and Frank's head.")],

    rep: ['Reports', 'Report Writer', () => `
      ${table(['Report', 'Last run', ''], [
        ['Trial Balance', '10/16/2026 11:31 PM', ''], ['AP Aging', '10/16/2026 11:33 PM', ''], ['AR Aging', '10/16/2026 11:34 PM', ''],
        ['Inventory Valuation', '09/30/2026 6:12 PM', ''], ['Sales by Customer', '10/05/2026 9:02 AM', ''], ['Vendor 1099 Summary', '01/27/2026 4:40 PM', ''],
      ].map(r => { r[2] = `<button class="erp-b" data-run="${r[0]}">Run</button>`; return r; }))}
      ${note(`Reports exported to Excel this year: <b class="erp-count">${exported.toLocaleString('en-US')}</b>`)}`],

    int: ['Integrations', 'Connected systems', () => `
      ${kv([['Connected systems', 'None'], ['Export formats', 'CSV, fixed-width text, fax'], ['Import', 'Disabled by your administrator (Drew)'], ['Workflow', 'Export &rarr; Excel &rarr; Frank']])}`],
  };

  const NAV = [
    ['Company', [['home', 'Home']]],
    ['Financials', [['gl', 'General Ledger'], ['ap', 'Accounts Payable'], ['ar', 'Accounts Receivable']]],
    ['Operations', [['inv', 'Inventory'], ['po', 'Purchasing'], ['prod', 'Production']]],
    ['People', [['pay', 'Payroll &amp; HR']]],
    ['Planning', [['bud', 'Budgeting'], ['cash', 'Cash Forecast'], ['board', 'Board Reporting']]],
    ['Tools', [['rep', 'Reports'], ['int', 'Integrations']]],
  ];

  function about() {
    FR.dialog({ icon: 'info', title: 'About ' + PRODUCT, width: 400, message: `<b>${PRODUCT}</b> (build 1187)<br>&copy; 1998&ndash;2011 Show-Me Business Systems, Inc., Jefferson City, Missouri<br><br>Licensed to: PACKA CORPORATION (5 users)<br>Support contract: expired 12/31/2014<br><br><i>"It's not fancy. It works."</i>` });
  }

  function erp() {
    if (FR.wm.wins.has('erp')) { const w = FR.wm.wins.get('erp'); w.restore(); w.focus(); return w; }
    const root = $(`<div class="erp">
      <div class="erp-top"><div class="erp-brand"><b>ShowMe</b> ERP <span>Classic</span></div><div class="erp-co">PACKA CORPORATION &middot; Company 01</div></div>
      <div class="erp-main"><nav class="erp-nav">${NAV.map(([g, items]) => `<div class="erp-g">${g}</div>${items.map(([k, t]) => `<button class="erp-n" data-k="${k}">${t}</button>`).join('')}`).join('')}</nav>
      <div class="erp-pane"></div></div></div>`);
    const pane = root.querySelector('.erp-pane');
    const show = k => {
      const [t, sub, body] = S[k];
      root.querySelectorAll('.erp-n').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      // (R3b S13) phones: the module strip keeps the open module in view
      if (FR.mobile) { const on = root.querySelector('.erp-n.on'); if (on && on.parentElement.scrollWidth > on.parentElement.clientWidth) { const nav = on.parentElement, r = on.getBoundingClientRect(), nr = nav.getBoundingClientRect(); nav.scrollLeft = Math.max(0, nav.scrollLeft + r.left - nr.left - (nav.clientWidth - r.width) / 2); } }
      pane.innerHTML = `<div class="erp-h"><b>${t}</b><span>${sub}</span></div><div class="erp-body">${body()}</div>`;
      pane.scrollTop = 0;
      win.setStatus(0, `<span>${t.replace(/&amp;/g, '&')}</span>`);
    };
    const menu = [
      { label: 'File', items: [{ label: 'Print...', action: () => FR.dialog({ icon: 'error', title: PRODUCT, message: 'Printer "HP LaserJet 4 — Finance (no toner)" is not responding.' }) }, { sep: true }, { label: 'Exit', action: () => win.close() }] },
      { label: 'Modules', items: NAV.flatMap(([, items]) => items).map(([k, t]) => ({ label: t.replace(/&amp;/g, '&'), action: () => show(k) })) },
      { label: 'Help', items: [{ label: 'Contents', action: () => FR.dialog({ icon: 'warn', title: PRODUCT, message: 'Help file SHOWME.HLP not found.<br><br>(It was on a floppy disk.)' }) }, { label: 'Contact support...', action: () => FR.dialog({ icon: 'info', title: PRODUCT, message: 'Your support contract expired on 12/31/2014.<br><br>Please call your Show-Me representative. (He retired.)' }) }, { sep: true }, { label: 'About ShowMe ERP', action: about }] },
    ];
    const small = innerWidth < 900;
    const win = FR.wm.open({ id: 'erp', title: `${PRODUCT} — PACKA CORPORATION — FWARMINGTON`, icon: 'erp', width: 820, height: 540, maximized: small, className: 'erp-win', menu, content: root,
      statusBar: ['Home', 'User: FWARMINGTON', 'Period: P10 Oct 2026 (Open)', 'PACKA-SQL01'] });
    root.addEventListener('click', e => {
      const n = e.target.closest('.erp-n'); if (n) { FR.sound.play('click'); show(n.dataset.k); return; }
      if (e.target.closest('[data-approve]')) {
        FR.dialog({ icon: 'lock', title: PRODUCT, message: 'Approval requires the approver\'s password.<br><br>The approver is FWARMINGTON. The approver is not here.' });
        return;
      }
      const r = e.target.closest('[data-run]');
      if (r) {
        r.disabled = true; r.textContent = 'Running…';
        setTimeout(() => {
          exported++;
          const c = pane.querySelector('.erp-count'); if (c) c.textContent = exported.toLocaleString('en-US');
          if (r.isConnected) { r.disabled = false; r.textContent = 'Run'; }
          const file = `${r.dataset.run.replace(/[^A-Za-z0-9]+/g, '_')}_P10_2026 (${exported}).csv`;
          FR.dialog({ icon: 'info', title: 'ShowMe Report Writer', width: 430, message: `The report is too wide for the screen (214 columns).<br><br>Exported to <b>C:\\ShowMe\\Exports\\${esc(file)}</b> instead.<br><br><span style="color:#666">Frank opens these in Excel. Then he builds another spreadsheet.</span>` });
        }, 900);
      }
    });
    show('home');
    return win;
  }
  FR.apps.erp = erp;
})();
