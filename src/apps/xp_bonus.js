/* FRANK'S COMPUTER — bonus requests. People who don't know Frank is missing keep e-mailing him small finance
   questions. Each one is optional, quick (1–3 minutes), answered in a box inside the e-mail (or by replying with the
   number), and worth bonus points that ADD ON TOP of the main score (the points table is BONUS in src/score_rules.js,
   which the server uses too). A wrong bonus answer costs nothing: no −50, and it never counts toward the Blue Screen
   streak; the sender answers in character, and after two misses explains the method. None of them touches a
   main-puzzle number.
   Delivery: one at a time, each after its checklist item is done, the first 2 minutes into play and then at least
   3½ minutes of active play apart (FR.state.flags.bonusMail); never over a message box, the Blue Screen or typing.
   Solved: FR.state.bonus = { id: { solvedAt, pts } }; tries in FR.state.flags.bonusTries.  Prefix: .bn- */
(() => {
  const $ = FR.$, esc = FR.esc, R = FR.scoreRules;
  const FIRST = 2 * 60000, GAP = 3.5 * 60000;
  const near = (x, want, tol = 0.51) => isFinite(x) && Math.abs(x - want) <= tol;
  const PART = 'part';   // a trap marked PART is a step of the working (never counts against a right answer next to it)
  const TASKS = [
    { id: 'tom_comm', after: 'login', from: { name: 'Tom Bracken', email: 'tom.bracken@packacorp.com' }, subject: 'Quick one — my commission on Hawthorn Foods', q: 'Commission ($)', ph: 'e.g. 1,234',
      body: `Frank,

Closed Hawthorn Foods today. From the Holiday Inn in Joplin. The Wi-Fi here is a rumor.

$80,000 of pizza boxes. My comp plan: 4% on the first $50,000 of a deal, 6% on everything above that.

What's my commission? Just the number. Payroll wants it Thursday and I don't trust myself with percentages after 9 PM.

Tom

Tom Bracken
Sales Manager | Packa Corporation`,
      ok: x => near(x, 3800),
      traps: [[x => near(x, 4800), "That's 6% on the whole thing. I wish. The first $50,000 is only at 4%."], [x => near(x, 3200), "That's 4% on everything. The plan has a kicker above $50K."],
        [x => near(x, 1800), "That's just the kicker part. The first $50K earns something too.", PART], [x => near(x, 2000), "That's just the first $50K. The other $30K earns the 6%.", PART]],
      miss: "That doesn't match what my gut says, and my gut is usually wrong, so check it again?",
      hint: 'Tom again: "Two pieces, right? 4% of the first 50,000, plus 6% of the other 30,000."',
      shown: '$3,800', right: "3,800. That's a used bass boat. Thanks, Frank. Don't tell Drew, he'll want to \"restructure the plan\" again." },
    { id: 'mum_fx', after: 'login', from: { name: 'Linda Warmington', email: 'linda.warmington@sedaliamail.example' }, subject: 'are you eating', q: 'Canadian dollars', ph: 'e.g. 123',
      body: `Frankie,

I called your desk three times, it just rings. Are you at work at midnight AGAIN?

Aunt Carol and I are going to Toronto to see your cousin. The bank says 1 US dollar = 1.36 Canadian dollars. I'm bringing $500. How many Canadian dollars is that? You're the numbers one.

Also are you eating.

Love,
Mom

P.S. Your father says hello. He says it from the recliner.`,
      ok: x => near(x, 680),
      traps: [[x => near(x, 367.65, 1), "That's less than I started with, Frankie. Your father says multiply. He says it from the recliner."], [x => near(x, 500), "That's what I have now, sweetie. I want to know what I'll have there."]],
      miss: 'Are you sure? You sound tired. Try again after a sandwich.',
      hint: 'Mom: "Carol says 500 times the 1.36. Carol was a bank teller in 1979."',
      shown: 'C$680', right: '680! I\'ll bring you back a moose shirt. Eat something green. Not the mints.\n\nLove, Mom' },
    { id: 'intern_accrual', after: 'version', from: { name: 'Kaylee Brooks', email: 'kaylee.brooks@packacorp.com' }, subject: 'sorry, dumb question about accruals', q: 'October accrual ($)', ph: 'e.g. 1,234',
      body: `Hi Frank!

It's Kaylee, the new finance intern (I started Monday, I sit by the plotter).

A man in a cowboy hat told me on his way to the airport to "accrue the electric for October, it's easy". The utility bills us once a quarter: $27,900 for October–December, and we pay it in January.

How much do I accrue for October? I don't want to ask him again. He said "YEEHAW" when I asked the first time.

Kaylee :)`,
      ok: x => near(x, 9300),
      traps: [[x => near(x, 27900), "The whole quarter in October? That would make October look... really bad. Just October's share?"], [x => near(x, 0, 0.001), 'Zero? He said it was easy, not free.'],
        [x => near(x, 3, 0.001), "Three months, yes! But I need the dollars.", PART]],
      miss: "Hmm, that's not what my spreadsheet says (I have a spreadsheet now!!).",
      hint: 'Kaylee: "Oh! Is it one month out of the three? Like, a third?"',
      shown: '$9,300', right: '9,300! Debit utilities expense, credit accrued liabilities, reverse it in November. I wrote it on a sticky note. Can I put it on your monitor? There are already three.' },
    { id: 'it_audit', after: 'version', from: { name: 'Packa IT Asset Audit', email: 'assets@packacorp.com' }, subject: '[AUTOMATED] Disk usage survey — PACKA-FPA-01', q: 'File size (MB)', ph: 'e.g. 1.2',
      body: `This is an automated message from Packa IT Asset Audit.

Workstation PACKA-FPA-01 is low on disk space. To help IT plan, reply with the size, in MB, of the largest file on your Desktop:

    Packa_Corp_Model_FY26_v47_FINAL_FINAL_use_this_one.xls

(Right-click the file on the desktop, then Properties.)

This mailbox is monitored by a script. The script does not know where anybody is.

Packa IT`,
      ok: x => near(x, 4.7, 0.051),
      traps: [[x => x > 4000 && x < 5000, 'VALUE LOOKS LIKE KILOBYTES. THE SCRIPT WANTS MEGABYTES. THE SCRIPT IS VERY LITERAL.']],
      miss: 'VALUE DOES NOT MATCH THE ASSET REGISTER. PLEASE CHECK FILE PROPERTIES AND TRY AGAIN.',
      hint: 'Packa IT: "HINT: on the desktop, right-click Packa_Corp_Model_FY26_v47... and read Size in Properties."',
      shown: '4.7 MB', right: 'THANK YOU. RECORDED: 4.7 MB.\nRECOMMENDED ACTION: DELETE VERSIONS 1–46.\nRECOMMENDATION DECLINED BY USER IN 2024, 2025 AND 2026.\n\nPacka IT' },
    { id: 'steve_margin', after: 'unlock', from: { name: 'Steve Packa', email: 'steve.packa@packacorp.com' }, subject: 'Rotary question (typed by Barb)', q: 'Gross margin (%)', ph: 'e.g. 12%',
      body: `Frank, this is Barb at the front desk, typing for Steve. He is dictating.

"Frank. The Rotary asked me our margin on the new pizza box. Tom says we mark it up 25% on cost. So our margin is 25%. Right?

I say it at lunch tomorrow. Give me the real gross margin, in percent, so I don't embarrass the company in front of the Lions Club. They're at the lunch too."

— Steve (and Barb)`,
      ok: x => near(x, 20, 0.05) || near(x, 0.2, 0.0005),
      traps: [[x => near(x, 25, 0.05) || near(x, 0.25, 0.0005), 'Barb here. Steve says "that\'s what Tom said", and "that\'s why I asked you".'],
        [x => (x >= 33 && x <= 33.4) || near(x, 0.333, 0.001), 'Barb here. Steve says that sounds like more than Tom said. Steve likes it. Steve does not believe it.'],
        [x => near(x, 125, 0.05) || near(x, 1.25, 0.0005) || near(x, 0.8, 0.0005) || near(x, 80, 0.05), 'Barb here. Steve says that\'s the price, not the margin. What part of it is profit?', PART]],
      miss: 'Barb here. Steve says "hm." He only says "hm" when a number is wrong.',
      hint: 'Barb: "Steve says: say the price is $125 when the cost is $100. What part of the $125 is profit?"',
      shown: '20%', right: 'Barb again. Steve says: "Twenty. Markup is on cost, margin is on price. I\'ll say it slowly."\n\nHe also says good work and to go home. He does not know what time it is.' },
    { id: 'dale_var', after: 'ebitda', from: { name: 'Dale Hutchins', email: 'dale.hutchins@packacorp.com' }, subject: 'forklift propane — how bad is it', q: 'Variance (% of budget)', ph: 'e.g. 5%',
      body: `Frank,

Propane for the forklifts. Budget for October: $4,000. We've spent $5,000 and it's the 19th.

Karen is going to ask me for the variance as a percent of budget. What do I tell her? (Please make it a small number.)

Dale
Shipping & Receiving

P.S. Night shift says somebody left a cowboy hat on forklift #3.`,
      ok: x => near(x, 25, 0.05) || near(x, 0.25, 0.0005),
      traps: [[x => near(x, 20, 0.05) || near(x, 0.2, 0.0005), "That's divided by what we spent. Karen divides by the budget. Karen always divides by the budget."], [x => near(x, 1000), "That's the dollars. Karen wants the percent. Karen always wants the percent.", PART],
        [x => near(x, 125, 0.05) || near(x, 1.25, 0.0005), "That's the whole spend as a percent of budget. How much OVER are we?"]],
      miss: "That doesn't look like what Karen's going to get on her calculator.",
      hint: 'Dale: "So it\'s the $1,000 over, divided by the $4,000 we were supposed to spend?"',
      shown: '25% over', right: "25% over. Not small. I'll tell her it's \"seasonal\". It's October. Everything's seasonal.\n\nDale" },
    { id: 'rotary_be', after: 'dscr', from: { name: 'Harold Voss', email: 'treasurer@sedaliarotary.example' }, subject: 'Pancake breakfast — break-even?', q: 'Tickets to break even', ph: 'e.g. 50',
      body: `Frank,

As our finance man (you did say "I do FP&A" at the June meeting, and we all nodded): the Pancake Breakfast.

Tickets are $8. Pancakes, sausage and coffee cost us $3 a plate. The hall and the griddle rental are $600 flat.

How many tickets do we have to sell to break even? Last year we sold 90 and Earl called it "a success".

Yours in service,
Harold Voss
Treasurer, Sedalia Rotary Club`,
      ok: x => near(x, 120, 0.01),
      traps: [[x => near(x, 75, 0.01), 'Earl got 75 too. Earl forgot the pancakes cost money.'], [x => near(x, 200, 0.01), "That's the $600 over the $3. It's the $8 we take in, minus the $3 it costs, per ticket."],
        [x => near(x, 5, 0.001), "Five dollars a ticket, yes. How many tickets, though?", PART], [x => near(x, 150, 0.01), "That's what we lost last year. How many tickets this year?", PART]],
      miss: 'The committee ran that number past Earl and even Earl looked worried.',
      hint: 'Harold: "Each ticket leaves us $8 minus $3. How many of those make $600?"',
      shown: '120 tickets', right: "120. So last year we lost $150 and Earl gave a speech about it.\n\nThank you, Frank. You're on the syrup table.\n\nHarold" },
    { id: 'brenda_disc', after: 'cash', from: { name: 'Brenda Pruitt', email: 'ap@hawthornfoods.example' }, subject: 'Invoice PK-20771 — early payment amount', q: 'Amount to wire ($)', ph: 'e.g. 1,234',
      body: `Hello Frank,

Packa's invoice PK-20771 is $12,000, terms 2/10, net 30. We'd like to take the discount and pay within 10 days.

What amount should I wire? Our system says "ERROR 2/10" when I type 2/10.

Thank you,
Brenda Pruitt
Accounts Payable, Hawthorn Foods (Springfield, MO)`,
      ok: x => near(x, 11760),
      traps: [[x => near(x, 240), "That's the discount. I need the amount to wire.", PART], [x => near(x, 12000), "That's the full amount. We'd like the discount, please. We're a pizza company."],
        [x => near(x, 10000), 'Oh my, that\'s a much bigger discount than our treasurer approved.'], [x => near(x, 0.98, 0.0005) || near(x, 98, 0.01), "That's the percent we pay. I need the dollars to wire.", PART]],
      miss: 'Our system says no to that one too. I think the 2 is a percent and the 10 is days?',
      hint: 'Brenda: "Is it the $12,000 less 2%?"',
      shown: '$11,760', right: "Wiring $11,760 in the morning. Tom said you were \"the smart one\". He said it about himself too.\n\nBrenda" },
    { id: 'vending_ci', after: 'bridge', from: { name: 'Gary Stroud', email: 'gary@ozarksnackvend.example' }, subject: 'Espresso machine — your balance', q: 'Balance today ($)', ph: 'e.g. 1,234',
      body: `Frank,

It's Gary from Ozark Snack & Vend. About the break-room espresso machine you financed with us "until after the Board" (Packa's name, your signature):

$2,000 at 1.5% a month, compounding monthly. Nothing paid for 12 months.

What's the balance today, to the dollar? Our billing guy retired and the new one uses an abacus. Not ironically.

Gary

P.S. Somebody keeps buying all the Funyuns at 2 AM.`,
      ok: x => x >= 2390.5 && x <= 2392,
      traps: [[x => near(x, 2360), "That's simple interest. We are not simple people, Frank. It compounds."], [x => near(x, 2000), "That's what the machine cost. Twelve months ago. Before the interest found it."],
        [x => near(x, 391.24, 1), "That's just the interest part. I need the whole balance.", PART], [x => near(x, 1.1956, 0.001), "That's the growth factor. Times the $2,000, please.", PART]],
      miss: 'The abacus says something else. I trust you more than the abacus. Slightly.',
      hint: 'Gary: "It\'s $2,000 times 1.015, twelve times over. Excel does it: =2000*1.015^12."',
      shown: '$2,391', right: "$2,391. Huh. That's more than the machine.\n\nSend it \"after the Board\", like you said. Gary" },
  ];
  const BY = Object.fromEntries(TASKS.map(t => [t.id, t]));
  // t.check(text) → true | the sender's message (the same grader as the box and the replies, below)
  TASKS.forEach(t => { t.check = v => { const r = judge(t.id, v); return r.ok ? true : r.msg; }; });
  // (F7, round 4) phones have no right-click: the IT survey says how to get to Properties there (desktop text unchanged)
  BY.it_audit.mbody = BY.it_audit.body.replace('(Right-click the file on the desktop, then Properties.)', '(Press and hold the file on the desktop until its menu opens, then tap Properties.)');
  BY.it_audit.mhint = BY.it_audit.hint.replace('right-click', 'press and hold');
  const bodyOf = t => (FR.mobile && t.mbody) || t.body, hintOf = t => (FR.mobile && t.mhint) || t.hint;
  const pts = id => (R && R.BONUS && R.BONUS[id]) || 0;
  const solved = () => (FR.state.bonus && typeof FR.state.bonus === 'object') ? FR.state.bonus : {};
  const flags = () => FR.state.flags;
  const peekMail = () => { const v = flags().bonusMail; return v && typeof v === 'object' ? { at: v.at || {}, last: v.last || 0 } : { at: {}, last: 0 }; };   // (a tick never writes)
  const mailSt = () => { const f = flags(); if (!f.bonusMail || typeof f.bonusMail !== 'object') f.bonusMail = { at: {}, last: 0 }; f.bonusMail.at = f.bonusMail.at || {}; return f.bonusMail; };
  const tries = id => { const f = flags(); f.bonusTries = f.bonusTries && typeof f.bonusTries === 'object' ? f.bonusTries : {}; return f.bonusTries[id] || 0; };
  const addTry = id => { tries(id); flags().bonusTries[id] = (flags().bonusTries[id] || 0) + 1; FR.save(); return flags().bonusTries[id]; };
  const mailId = id => 'bn_' + id;
  if (FR.mail && FR.mail.addContact) TASKS.forEach(t => FR.mail.addContact(t.from));

  /* ---------- delivery ---------- */
  function deliver(id, quiet) {
    const t = BY[id]; if (!t || !FR.mail || !FR.mail.incoming) return false;
    const ms = mailSt();
    if (ms.at[id] != null || hasMail(id)) return false;
    ms.at[id] = FR.clock.playMs(); ms.last = FR.clock.playMs(); FR.save();
    FR.mail.incoming({ id: mailId(id), from: t.from, subject: t.subject, body: bodyOf(t), bonus: id, read: false }, false);
    if (!quiet) {
      FR.sound.play('mail');
      FR.balloon('New request from ' + t.from.name, `${esc(t.subject)}<br><small class="bn-bal-s">Optional bonus request &middot; +${pts(id)} points</small>`, () => FR.mail.open(mailId(id)), { act: 'Open it' });
    }
    FR.bus.emit('bonus-mail', id);
    return true;
  }
  // (without touching Outlook's mailbox object: FR.mail.byId would create it, and a tick must never change the save)
  const hasMail = id => { const oe = FR.state.flags.oe; return !!(oe && Array.isArray(oe.extra) && oe.extra.some(m => m && m.id === mailId(id))); };
  const nextTask = () => { const at = peekMail().at; return TASKS.find(t => at[t.id] == null && !hasMail(t.id)); };
  FR.bus.on('play-tick', ms => {
    if (FR.xp.noPopups || FR.state.finishedAt) return;
    const t = nextTask(); if (!t || !FR.puzzle.isSolved(t.after)) return;
    const s = peekMail();
    if (ms < FIRST || (s.last && ms - s.last < GAP)) return;
    if (FR.xp.quiet() || document.querySelector('.fr-balloon')) return;   // its toast waits for a calm moment
    deliver(t.id);
  });

  /* ---------- grading ---------- */
  function award(id, label) {
    if (!pts(id) || solved()[id]) return false;
    if (!FR.state.bonus || typeof FR.state.bonus !== 'object') FR.state.bonus = {};
    FR.state.bonus[id] = { solvedAt: Date.now(), pts: pts(id) };
    FR.save();
    FR.sound.play('unlock');
    const sc = FR.score ? FR.score.now() : null;
    FR.balloon(`Bonus: +${pts(id)} points`, `${esc(label || (BY[id] ? BY[id].from.name : 'Bonus'))}${sc ? `<br>Score now ${FR.score.fmt(sc.score)} (+${FR.score.fmt(sc.bonus)} ${FR.score.bonusWord})` : ''}`, null, { silent: true });
    FR.bus.emit('bonus', id);
    FR.bus.emit('score');
    return true;
  }
  /* (R7 T5) One grader for the answer box and for replies, the same for every request. The reply is read like a
     person would: every number in it is looked at (commas, $, %, "3.8k", "4,7"), and the right number ANYWHERE counts —
     the question's own numbers ("a 25% markup", "$12,000 less 2%") and the steps of the working never count against it.
     It only fails when (a) no number in it is right, or (b) it clearly settles on a different final answer: the last
     number after "answer / say / tell her / final / go with / wire / accrue / sell / comes to / total" is not right and
     no right number follows it. A number after "not / isn't / instead of / rather than" is never the answer.
     Which wrong answer the sender talks about: the settled one, else the first known trap that isn't a number from the
     question, else the first number that isn't from the question, else the first number.  judge() is pure (tests). */
  const MARK = /(?:\banswer(?:\s+(?:is|=|:|would\s+be))?|\bsay|\btell\s+(?:her|him|them|karen|steve|payroll|the\s+\w+)|\bfinal(?:\s+answer)?(?:\s+is)?|\bgo\s+with|\bcomes?\s+to|\btotal(?:\s+(?:is|of))?|\bwire|\baccrue|\bsell)\s*[:=\-–—]?\s*(?:(?:about|roughly|approximately|approx\.?|exactly|just|only|a|an|is|of|the|you|us|it'?s|it\s+is|be|him|her|them)\s*)*[:=]?\s*$/i;
  const NEG = /(?:\bnot|n't|\bnever|\binstead\s+of|\brather\s+than|\bthan)\s*(?:(?:a|an|the|just|only|quite|really)\s+)*$/i;
  const NUM = /(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+|,\d{1,2}(?![\d,]))?|\.\d+)(\s?k\b)?/gi;
  function numbers(text) {
    const t = String(text || '').replace(/[’‘]/g, "'").replace(/[−‒–—―]/g, '-');
    const out = []; let m; NUM.lastIndex = 0;
    while ((m = NUM.exec(t))) {
      const i = m.index;
      if (/[A-Za-z0-9_.]/.test(t[i - 1] || ' ')) continue;   // part of a name or code: FY27, v47, PK-20771 is fine, Q3 isn't a number
      let v = parseFloat(m[1].replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
      if (m[2]) v *= 1000;
      if (!isFinite(v)) continue;
      const before = t.slice(Math.max(0, i - 48), i).replace(/(?:\b(?:us|ca|c))?[\s$(~\u2248-]*$/i, '');
      out.push({ v: Math.abs(v), i, marked: MARK.test(before), neg: NEG.test(before) });
    }
    return out;
  }
  const inputsCache = {};
  const inputsOf = t => inputsCache[t.id] || (inputsCache[t.id] = [t.body, t.mbody, t.hint, t.subject].filter(Boolean).flatMap(numbers).map(n => n.v));
  function judge(id, text) {
    const t = BY[id]; if (!t) return { ok: false, msg: 'Not quite.' };
    const ns = numbers(text);
    if (!ns.length) return { ok: false, none: true, msg: `Just the number, please. ${t.q}.` };
    const inp = inputsOf(t), isIn = x => inp.some(y => Math.abs(x - y) < 1e-9);
    const trapOf = x => (t.traps || []).find(tr => tr[0](x));
    const good = n => !n.neg && t.ok(n.v);
    const lastGood = ns.reduce((a, n, k) => (good(n) ? k : a), -1);
    const msgFor = n => { const tr = n && trapOf(n.v); return tr ? tr[1] : t.miss; };
    const settled = ns.map((n, k) => [n, k]).filter(([n]) => n.marked && !n.neg).pop();
    if (lastGood >= 0) {
      if (settled && !good(settled[0]) && settled[1] > lastGood) {
        const tr = trapOf(settled[0].v);
        if (!(tr && tr[2] === PART) && !(isIn(settled[0].v) && !tr)) return { ok: false, msg: msgFor(settled[0]) };
      }
      return { ok: true };
    }
    const live = ns.filter(n => !n.neg), pool = live.length ? live : ns;
    const pick = (settled && settled[0]) || pool.find(n => !isIn(n.v) && trapOf(n.v)) || pool.find(n => !isIn(n.v)) || pool.find(n => trapOf(n.v)) || pool[0];
    return { ok: false, msg: msgFor(pick) };
  }
  // → { ok: true } | { ok: false, msg, hint? }
  function grade(id, value) {
    const t = BY[id];
    const r = judge(id, String(value || '').trim());
    if (r.ok) { award(id, `${t.from.name}: ${t.subject}`); return { ok: true }; }
    const n = addTry(id);
    return { ok: false, msg: r.msg || 'Not quite.', hint: n >= 2 ? hintOf(t) : '' };
  }
  // the request a message belongs to: the request itself, the sender's answers to a reply (bonusRe), or — saves from
  // before round 7 — a message from the same sender with the request's subject ("Re: …")
  const stripRe = s => String(s || '').replace(/^((re|fw|fwd)\s*:\s*)+/i, '').trim();
  function taskOf(m) {
    if (!m) return null;
    if (m.bonus && BY[m.bonus]) return BY[m.bonus];
    if (m.bonusRe && BY[m.bonusRe]) return BY[m.bonusRe];
    const e = m.from && String(m.from.email || '').toLowerCase(), sub = stripRe(m.subject);
    return (e && TASKS.find(t => t.from.email === e && t.subject === sub && (FR.state.flags.bonusMail || {}).at && FR.state.flags.bonusMail.at[t.id] != null)) || null;
  }

  /* ---------- the answer box inside the e-mail (Outlook calls mount for a message taskOf() knows) ---------- */
  const drafts = {}; let focusId = null;
  function mount(host, m) {
    const t = taskOf(m); if (!host || !t) return;
    host.querySelectorAll('.bn-box, .bn-jump').forEach(x => x.remove());
    const done = solved()[t.id];
    const box = $(`<div class="bn-box${done ? ' bn-done' : ''}" data-bonus="${t.id}"><div class="bn-h"><span class="bn-star">&#9733;</span><b>Bonus request</b><span>+${pts(t.id)} points &middot; optional</span></div><div class="bn-in"></div></div>`);
    const inner = box.querySelector('.bn-in');
    if (done) {
      inner.innerHTML = `<div class="bn-ok">&#10003; Answered: <b>${esc(t.shown)}</b> &middot; +${pts(t.id)} bonus points</div><div class="bn-reply"><b>${esc(t.from.name)} wrote back:</b><div></div></div>`;
      inner.querySelector('.bn-reply div').textContent = t.right;
    } else {
      inner.innerHTML = `<label class="bn-l"></label><div class="bn-row"><input type="text" class="bn-inp" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off"><button class="bn-go">Send answer</button></div><div class="bn-fb" aria-live="polite"></div>
        <div class="bn-note">Wrong answers cost nothing here. You can also reply to the e-mail: the right number anywhere in your reply counts.</div>`;
      inner.querySelector('.bn-l').textContent = t.q;
      const inp = inner.querySelector('.bn-inp'), fb = inner.querySelector('.bn-fb');
      inp.placeholder = t.ph; inp.setAttribute('aria-label', t.q);
      inp.value = drafts[t.id] || '';
      inp.addEventListener('input', () => { drafts[t.id] = inp.value; });
      inp.addEventListener('focus', () => { focusId = t.id; });
      inp.addEventListener('blur', () => { setTimeout(() => { if (focusId === t.id && (!inp.isConnected || document.activeElement !== inp) && inp.isConnected) focusId = null; }, 0); });
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); go(); } });
      const go = () => {
        const v = inp.value.trim(); if (!v) { inp.focus(); return; }
        const r = grade(t.id, v);
        if (r.ok) { delete drafts[t.id]; focusId = null; refreshAll(); return; }
        FR.sound.play('ding');
        fb.className = 'bn-fb bad';
        fb.innerHTML = `<b>${esc(t.from.name)}:</b> ${esc(r.msg)}${r.hint ? `<div class="bn-hint">${esc(r.hint)}</div>` : ''}`;
        box.classList.remove('bn-shake'); void box.offsetWidth; box.classList.add('bn-shake');
        inp.select();
      };
      inner.querySelector('.bn-go').onclick = go;
      if (focusId === t.id) setTimeout(() => { if (inp.isConnected) { inp.focus(); const l = inp.value.length; try { inp.setSelectionRange(l, l); } catch (e) {} } }, 0);
    }
    host.appendChild(box);
    // (R7 T5) phones / tablets: the box is at the end of the message, often below the fold of the preview pane. A
    // "★ Answer ▸" button stays pinned at the top of the message (sticky) while the box is out of sight; a tap scrolls
    // the box into view and puts the cursor in it
    if (FR.mobile && !done) {
      const j = $(`<button class="bn-jump" type="button"><span class="bn-star">&#9733;</span> Bonus request &middot; +${pts(t.id)} <b>Answer &#9656;</b></button>`);
      const goBox = bx => {
        bx.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const inp = bx.querySelector('.bn-inp'); if (inp) setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (x) { inp.focus(); } }, 350);
      };
      j.onclick = e => {
        e.stopPropagation();
        // a preview pane too short for the box (a phone held upright): the message opens in its own window, at the box
        if (host.classList.contains('oe-pbody') && host.clientHeight < box.offsetHeight + j.offsetHeight + 24 && FR.mail.open) {
          FR.mail.open(m.id);
          setTimeout(() => { const w = FR.wm.active, bx = w && w.el.querySelector('.oe-mbody .bn-box'); if (bx) goBox(bx); }, 300);
          return;
        }
        goBox(box);
      };
      host.insertBefore(j, host.firstChild);
      if (window.IntersectionObserver) {
        const io = new IntersectionObserver(es => { es.forEach(en => j.classList.toggle('bn-jump-off', en.isIntersecting && en.intersectionRatio > 0.6)); }, { root: host, threshold: [0, 0.6, 1] });
        io.observe(box);
      }
    }
  }
  // re-render every place a bonus message is shown (preview pane, message windows)
  function refreshAll() {
    if (FR.mail && FR.mail.refresh) FR.mail.refresh();
    FR.wm.wins.forEach(w => { const m = /^oe-msg-(.+)$/.exec(w.id); if (m) { const msg = FR.mail.byId(m[1]); const host = w.el.querySelector('.oe-mbody'); if (msg && host && taskOf(msg)) mount(host, msg); } });
  }

  /* ---------- a reply to a bonus e-mail (or to the sender's answer to a reply): graded like the box, on the text
     above the quoted original ---------- */
  function onReply(m, orig) {
    const t = taskOf(orig); if (!t) return false;
    // the text above the quoted original; a reply written under the quote (bottom-posting) counts too
    const parts = String(m.body || '').split('----- Original Message -----');
    let body = parts[0];
    if (!numbers(body).length && parts.length > 1) body = parts.slice(1).join('\n').split('\n').filter(l => !/^\s*>/.test(l) && !/^(From|To|Cc|Sent|Subject):/.test(l)).join('\n');
    let text;
    if (solved()[t.id]) text = `You already sent me that. Still right.\n\n${t.from.name}`;
    else {
      const j = judge(t.id, body);
      if (j.none) text = `${j.msg}\n\n${t.from.name}`;
      else {
        const r = grade(t.id, body);
        text = r.ok ? t.right : `${r.msg}${r.hint ? '\n\n' + r.hint : ''}\n\n${t.from.name}`;
        if (r.ok) setTimeout(refreshAll, 0);
      }
    }
    setTimeout(() => FR.mail.incoming({ from: t.from, subject: 'Re: ' + stripRe(t.subject), body: text, bonusRe: t.id }), 2600);
    return true;
  }

  FR.bus.on('bonus', () => { if (FR.checklistRender) FR.checklistRender(); });

  FR.bonus = { TASKS, deliver, award, grade, judge, numbers, taskOf, mount, onReply, next: nextTask, FIRST, GAP, solved: () => Object.keys(solved()) };
  if (FR.xp && FR.xp.LOCAL) FR.bonus._test = { reset: () => { FR.state.bonus = {}; delete FR.state.flags.bonusMail; delete FR.state.flags.bonusTries; FR.save(); } };
})();
