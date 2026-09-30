// Bonus-request grading (src/apps/xp_bonus.js): the answer box and e-mail replies share one grader, judge(id, text).
// The right number anywhere in the reply counts; the question's own numbers and the working never count against it;
// a reply fails only when no number is right or it settles on a different final answer ("the answer is …").
// No dependencies: node test/bonus_grade_test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
let fails = 0, n = 0;
const ok = (cond, msg) => { n++; if (!cond) { console.log('FAIL ' + msg); fails++; } else if (process.env.VERBOSE) console.log('ok   ' + msg); };

/* ---------- load xp_bonus.js with a minimal FR ---------- */
const mails = [], awards = [];
const FR = {
  $: () => null, esc: s => String(s), scoreRules: require('../src/score_rules.js'), mobile: false,
  state: { flags: { bonusMail: { at: {}, last: 0 } }, bonus: {} },
  save() {}, sound: { play() {} }, balloon() {}, score: null, xp: {}, clock: { playMs: () => 0 },
  bus: { on() {}, emit(ev, id) { if (ev === 'bonus') awards.push(id); } },
  mail: { addContact() {}, incoming: m => mails.push(m), refresh() {}, byId: () => null },
  wm: { wins: new Map() }, puzzle: { isSolved: () => false },
};
const ctx = { FR, window: { FR }, setTimeout: f => f(), console, IntersectionObserver: undefined };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/apps/xp_bonus.js'), 'utf8'), ctx);
const B = FR.bonus;
ok(B && typeof B.judge === 'function', 'FR.bonus.judge is exported');
const ids = B.TASKS.map(t => t.id);
ok(ids.length === 9 && ids.every(id => FR.scoreRules.BONUS[id]), '9 tasks, every one in the points table');

const right = (id, text) => ok(B.judge(id, text).ok === true, `${id}: RIGHT  ${JSON.stringify(text)}`);
const wrong = (id, text, says) => {
  const r = B.judge(id, text);
  ok(r.ok === false && (!says || String(r.msg).includes(says)), `${id}: WRONG  ${JSON.stringify(text)}${says ? ' → "' + says + '"' : ''}  (got ${r.ok ? 'ok' : JSON.stringify(r.msg)})`);
};
const msgOf = id => B.TASKS.find(t => t.id === id);

/* ---------- number reading ---------- */
const vals = t => B.numbers(t).map(x => x.v);
ok(JSON.stringify(vals('$11,760.00')) === '[11760]', 'numbers: $11,760.00');
ok(JSON.stringify(vals('3.8k')) === '[3800]', 'numbers: 3.8k');
ok(JSON.stringify(vals('4,7 MB')) === '[4.7]', 'numbers: European 4,7');
ok(JSON.stringify(vals('-25%')) === '[25]', 'numbers: -25% (sign dropped)');
ok(JSON.stringify(vals('C$680')) === '[680]', 'numbers: C$680');
ok(JSON.stringify(vals('FY27 v47 Q3 is 20%')) === '[20]', 'numbers: FY27, v47, Q3 are names, not numbers');
ok(JSON.stringify(vals('25/125 = .2')) === '[25,125,0.2]', 'numbers: 25/125 = .2');
ok(B.numbers('not 25%')[0].neg && !B.numbers('say 25%')[0].neg && B.numbers('say 25%')[0].marked, 'numbers: "not" negates, "say" marks');
ok(B.judge('tom_comm', 'no idea, sorry').none === true, 'no number at all: "Just the number, please."');

/* ---------- Steve: markup vs margin (the round-7 report) ---------- */
const S = 'steve_margin';
right(S, 'a 25% markup on cost is a 20% gross margin (25/125). Say 20%.');   // the player's own reply
right(S, '20%'); right(S, '20'); right(S, '0.2'); right(S, '20.0 %'); right(S, 'Twenty. 20%');
right(S, 'Tom is right that it is a 25% markup, but the margin is 20%.');
right(S, 'Margin = 25/125 = 20%');
right(S, 'Say 20%, not 25%.');
right(S, "It's 25% on cost, which is 20% on the price.");
right(S, "The answer isn't 25%, it's 20%.");
right(S, 'Price $125, cost $100, profit $25 → 25/125 = 0.2 = 20% gross margin');
right(S, '20% (a 25% markup)');
right(S, 'Tell him 20 percent');
wrong(S, '25%', "that's what Tom said"); wrong(S, '25', "that's what Tom said"); wrong(S, '0.25', "that's what Tom said");
wrong(S, "It's 25%, not 20%", "that's what Tom said");
wrong(S, '20%? No wait, the answer is 25%', "that's what Tom said");
wrong(S, '33.3%', 'more than Tom said'); wrong(S, '33%', 'more than Tom said');
wrong(S, '25% markup means a 33% margin', 'more than Tom said');
wrong(S, '125', 'price'); wrong(S, '18%', '"hm."');

/* ---------- Tom: tiered commission ---------- */
const T = 'tom_comm';
right(T, '3800'); right(T, '$3,800'); right(T, '3.8k'); right(T, '$3,800.00'); right(T, 'Your commission is $3,800.');
right(T, '4% of $50,000 = $2,000, plus 6% of $30,000 = $1,800, total $3,800');
right(T, '$3,800 ($2,000 + $1,800)');
right(T, "$3,800: that's $2,000 on the first $50K plus $1,800 on the other $30K");
right(T, 'On the $80,000 deal: 2,000 + 1,800 = 3,800');
wrong(T, '4800', '6% on the whole thing'); wrong(T, '$3,200', '4% on everything'); wrong(T, '1,800', 'kicker part');
wrong(T, '6% of 80,000 = 4,800', '6% on the whole thing');
wrong(T, '$80,000', 'gut'); wrong(T, '3,600', 'gut');
wrong(T, '3,800? no, final answer: 4,800', '6% on the whole thing');

/* ---------- Mum: currency ---------- */
const M = 'mum_fx';
right(M, '680'); right(M, 'C$680'); right(M, '500 x 1.36 = 680 Canadian dollars'); right(M, 'About $680 CAD, Mom. And yes, I ate.');
wrong(M, '367.65', 'multiply'); wrong(M, '367', 'multiply'); wrong(M, '500', 'what I have now'); wrong(M, '1.36', 'sandwich');

/* ---------- Kaylee: accrual ---------- */
const K = 'intern_accrual';
right(K, '9300'); right(K, '$9,300'); right(K, '27,900 / 3 = 9,300'); right(K, 'Accrue $9,300 for October (one third of $27,900).');
right(K, "Don't accrue 27,900, accrue 9,300");
wrong(K, '27900', 'whole quarter'); wrong(K, '$27,900', 'whole quarter'); wrong(K, '0', 'not free');
wrong(K, 'Accrue the whole $27,900', 'whole quarter'); wrong(K, '9,000', 'spreadsheet');

/* ---------- IT: file size ---------- */
const I = 'it_audit';
right(I, '4.7'); right(I, '4.7 MB'); right(I, '4,7'); right(I, 'Packa_Corp_Model_FY26_v47_FINAL_FINAL_use_this_one.xls is 4.7 MB');
right(I, '4.7 MB (4,813 KB)');
wrong(I, '4813', 'KILOBYTES'); wrong(I, '4,813 KB', 'KILOBYTES'); wrong(I, '47', 'ASSET REGISTER'); wrong(I, 'v47', 'number');

/* ---------- Dale: variance % of budget ---------- */
const D = 'dale_var';
right(D, '25%'); right(D, '-25%'); right(D, '25% over'); right(D, '0.25'); right(D, '$1,000 over on $4,000 = 25%');
right(D, 'Tell her 25% over budget ($1,000).'); right(D, '25% ($5,000 vs $4,000)');
right(D, 'Spent 5,000 against a budget of 4,000: that is 1,000 over, 25%');
wrong(D, '20%', 'divided by what we spent'); wrong(D, '$1,000', 'the dollars'); wrong(D, '125%', 'whole spend');
wrong(D, '1000/5000 = 20%', 'divided by what we spent'); wrong(D, '5%', 'calculator');

/* ---------- Harold: break-even ---------- */
const H = 'rotary_be';
right(H, '120'); right(H, '120 tickets'); right(H, '120 tickets ($600 / ($8 - $3))'); right(H, '$600 / $5 = 120');
right(H, 'You need to sell 120 tickets. Last year 90 lost you $150.');
wrong(H, '75', 'Earl'); wrong(H, '200', 'over the $3'); wrong(H, '$600 / $8 = 75', 'Earl'); wrong(H, '90', 'Earl looked worried');
wrong(H, '5', 'Five dollars');

/* ---------- Brenda: 2/10 net 30 ---------- */
const R = 'brenda_disc';
right(R, '11760'); right(R, '$11,760'); right(R, '$11,760.00'); right(R, '12,000 less 2% = 11,760');
right(R, 'Wire $11,760 (the $12,000 less the $240 discount).');
right(R, '$11,760 (12,000 less 2% = 240 discount)');
wrong(R, '240', 'the discount'); wrong(R, '12000', 'full amount'); wrong(R, '$10,000', 'bigger discount');
wrong(R, '2/10 net 30', 'percent'); wrong(R, 'Wire the full $12,000', 'full amount');

/* ---------- Gary: compounding ---------- */
const G = 'vending_ci';
right(G, '2391'); right(G, '$2,391.24'); right(G, '$2,391'); right(G, '=2000*1.015^12 = 2,391.24');
right(G, '2,000 x 1.015^12 = 2,391 (of which 391 is interest)');
wrong(G, '2360', 'simple interest'); wrong(G, '$2,000', 'machine cost'); wrong(G, '391.24', 'interest part');
wrong(G, '2000 * 1.015^12', 'machine cost'); wrong(G, '2,400', 'abacus');

/* ---------- every task: its right answer is found next to every number from its own question ---------- */
const RIGHT = { tom_comm: '$3,800', mum_fx: '680', intern_accrual: '$9,300', it_audit: '4.7 MB', steve_margin: '20%', dale_var: '25%', rotary_be: '120', brenda_disc: '$11,760', vending_ci: '$2,391' };
B.TASKS.forEach(t => {
  const inputs = [t.body, t.hint].flatMap(s => B.numbers(s).map(x => x.v));
  right(t.id, `${RIGHT[t.id]} (from ${inputs.join(', ')})`);
  right(t.id, `Working: ${inputs.join(' / ')}. ${RIGHT[t.id]}.`);
  right(t.id, `Answer: ${RIGHT[t.id]}`);
  ok(B.judge(t.id, inputs.join(' ')).ok === false, `${t.id}: only the question's own numbers is not an answer`);
});

/* ---------- replies: the request, the sender's answer to a reply (a reply to a reply), old saves ---------- */
const st = FR.state;
const reply = (orig, body) => { mails.length = 0; awards.length = 0; const r = B.onReply({ body }, orig); return { r, mail: mails[0] }; };
st.flags.bonusMail.at.steve_margin = 1;
const steve = B.TASKS.find(t => t.id === 'steve_margin');
let x = reply({ id: 'bn_steve_margin', bonus: 'steve_margin', from: steve.from, subject: steve.subject }, '25%\n\n----- Original Message -----\n> Tom says 25%');
ok(x.r === true && x.mail && /that's what Tom said/.test(x.mail.body) && x.mail.bonusRe === 'steve_margin' && !awards.length, 'reply "25%" to the request: Barb answers, no award, her answer is tagged bonusRe');
x = reply(x.mail, 'Sorry: a 25% markup on cost is a 20% gross margin (25/125). Say 20%.\n\n----- Original Message -----\nFrom: Steve Packa\n> Barb here.');
ok(x.r === true && awards[0] === 'steve_margin' && x.mail && x.mail.body === steve.right, 'a reply to Barb\'s answer (reply to a reply) is graded: +points, Steve\'s "right" text');
x = reply({ from: steve.from, subject: 'Re: Rotary question (typed by Barb)' }, '20%');
ok(x.r === true && /already sent me that/.test(x.mail.body), 'solved: a later reply gets "You already sent me that"');
st.bonus = {};
st.flags.bonusMail.at.tom_comm = 1;
const tom = B.TASKS.find(t => t.id === 'tom_comm');
x = reply({ from: tom.from, subject: 'RE: Re: ' + tom.subject }, '\n\n----- Original Message -----\nFrom: Tom\nSubject: x\n> What is my commission?\n\n$3,800, Tom.');
ok(x.r === true && awards[0] === 'tom_comm', 'an old-save reply (no bonusRe, same sender + subject) with the answer under the quote is graded');
ok(B.taskOf({ from: tom.from, subject: 'Out of Office: ' + tom.subject }) === null, 'Tom\'s out-of-office is not his request');
ok(B.taskOf({ from: { email: 'someone@packacorp.com' }, subject: tom.subject }) === null, 'another sender with the same subject is not the request');
delete st.flags.bonusMail.at.it_audit;
const it = B.TASKS.find(t => t.id === 'it_audit');
ok(B.taskOf({ from: it.from, subject: 'Re: ' + it.subject }) === null, 'a request not delivered yet is not matched by subject');
x = reply({ from: tom.from, subject: 'Re: ' + tom.subject }, 'Will check tomorrow.');
ok(x.r === true && /already sent/.test(x.mail.body), 'solved request, any reply: "already sent"');
st.bonus = {};
x = reply({ from: tom.from, subject: 'Re: ' + tom.subject }, 'Will check tomorrow.');
ok(x.r === true && /Just the number/.test(x.mail.body) && !awards.length, 'no number: "Just the number, please." and no try counted');

console.log(fails ? `${fails} of ${n} FAILED` : `ALL PASS (${n} checks)`);
process.exit(fails ? 1 : 0);
