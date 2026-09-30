/* Outlook Express 6 clone — FR.apps.mail  (Frank's Computer) */
(() => {
  const E = s => FR.esc(s == null ? '' : s);
  const $ = h => FR.$(h);

  /* ================= people ================= */
  const ME = { name: 'Frank Warmington', email: 'frank.warmington@packacorp.com' };
  const P = {
    diane: { name: 'Diane Kessler', email: 'diane.kessler@packacorp.com', title: 'Chief Financial Officer', phone: '(660) 555-0110' },
    steve: { name: 'Steve Packa', email: 'steve.packa@packacorp.com', title: 'President', phone: '(660) 555-0101' },
    karen: { name: 'Karen Wills', email: 'karen.wills@packacorp.com', title: 'VP Operations', phone: '(660) 555-0214' },
    tom: { name: 'Tom Bracken', email: 'tom.bracken@packacorp.com', title: 'Sales Manager', phone: '(660) 555-0131' },
    drew: { name: 'Drew Hollis', email: 'drew.hollis@packacorp.com', title: 'VP Finance', phone: '(660) 555-0112' },
    joshua: { name: 'Joshua Reyes', email: 'joshua.reyes@packacorp.com', title: 'FP&A Analyst', phone: '(660) 555-0117' },
    rachel: { name: 'Rachel Moss', email: 'rachel.moss@packacorp.com', title: 'Payroll & HR Coordinator', phone: '(660) 555-0122' },
    helpdesk: { name: 'IT Helpdesk', email: 'helpdesk@packacorp.com', title: 'Packa IT', phone: 'ext. 200' },
    emily: { name: 'Emily Carter', email: 'emily.carter@packacorp.com', title: 'Finance Systems Analyst', phone: '(660) 555-0126' },
    marcus: { name: 'Marcus Hale', email: 'm.hale@prairieledgerbank.example', title: 'Relationship Manager, Prairie Ledger Bank', phone: '(816) 555-0187' },
    ozark: { name: 'Ozark Kraft Mills', email: 'billing@ozarkkraftmills.example', title: 'Billing Department', phone: '' },
  };
  const CONTACT_ORDER = ['diane', 'drew', 'emily', 'helpdesk', 'joshua', 'karen', 'marcus', 'ozark', 'rachel', 'steve', 'tom'];
  const PACKIT = { name: 'Packa IT', email: 'helpdesk@packacorp.com' };
  const ALLSTAFF = { name: 'All Packa Staff', email: 'allstaff@packacorp.com' };
  const POSTMASTER = { name: 'System Administrator', email: 'postmaster@packacorp.com' };
  const FRANK_OFFGRID = { name: 'Frank Warmington', email: 'frank.w.offgrid@vegas-excelclub.example' };

  const SIG = {
    diane: '\n\nDiane Kessler\nChief Financial Officer\nPacka Corporation | 1420 East 3rd Street | Sedalia, MO',
    drew: '\n\nDrew Hollis\nVP Finance | Packa Corporation\nSent from my BlackBerry. In the Porsche.',
    joshua: '\n\nJoshua Reyes | FP&A Analyst | Packa Corporation',
    rachel: '\n\nRachel Moss\nPayroll & HR Coordinator\nPacka Corporation',
    karen: '\n\nKaren Wills\nVP Operations | Packa Corporation',
    tom: '\n\nTom Bracken\nSales Manager | Packa Corporation',
    marcus: '\n\nMarcus Hale\nRelationship Manager, Commercial Banking\nPrairie Ledger Bank\nm.hale@prairieledgerbank.example | (816) 555-0187',
    emily: '\n\nEmily Carter\nFinance Systems Analyst | Packa Corporation\next. 126',
  };

  const FRANK_SIG = '\n\nFrank Warmington | FP&A Manager | Packa Corporation\n"There\'s always a formula." \u2014 K. Bu\u0161\u0101rs';
  const T = s => { const [d, t] = s.split(' '); const [y, mo, da] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number); return new Date(y, mo - 1, da, h, mi).getTime(); };
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fmtShort = t => FR.clock.fmt(new Date(t), 'short');
  const fmtLong = t => { const d = new Date(t); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()} ${FR.clock.fmt(d, 'time')}`; };

  /* ================= seed mailbox ================= */
  const SEED = [];
  const msg = o => SEED.push(Object.assign({ folder: 'inbox', to: [ME], cc: [], attach: [], pri: 0, read: true }, o));

  // ---------- INBOX (game night: Mon Oct 19 2026, 11:47 PM) ----------
  msg({
    id: 'm_diane_pack', from: P.diane, t: T('2026-10-19 22:14'), pri: 1, read: false,
    subject: 'Board Pack — 9:00 AM. No excuses.',
    attach: [{ name: 'Board_Agenda.txt', size: '3 KB', file: 'agenda' }],
    body: `Frank,

The Board meets at 9:00 AM tomorrow. Drew, Joshua, Rachel and Emily are on a plane to Las Vegas looking for you. I am not on a plane.

Prairie Ledger Bank releases the $4.0M survival package only if the Board Pack has all four of these:

  1. The approved FY27 budget (Board copy).
  2. The Q3 covenant certificate, with DSCR.
  3. The 13-week cash forecast (the real one, not the Board version), showing the week we would breach minimum liquidity.
  4. A Q3 EBITDA bridge that closes.

Frank has everything. Frank is not answering. Whoever is reading this on his computer: you're Frank now.

Send the pack to me when it's complete. Not before.

Diane${SIG.diane}`,
  });
  msg({
    id: 'm_drew_vegas', from: P.drew, to: [P.diane], cc: [ME], t: T('2026-10-19 18:02'), pri: 1, read: false,
    subject: "FRANK'S IN VEGAS",
    body: `Diane.

Frank's in Vegas. Emily saw it. Through the hole. Don't ask.

We're on the 9:40 to LAS. YOU finish the Board Pack.

Saddle up.

DREW${SIG.drew}`,
  });
  msg({
    id: 'm_emily_43', from: P.emily, t: T('2026-10-19 14:31'), read: false, to: [ME], cc: [P.joshua],
    subject: 'Re: 43 days',
    body: `Frank,

Joshua showed us the two versions today. The Board deck says six months of runway. Your file says 43 days. Drew said the number is wrong. Joshua said he really wants it to be.

I checked both. Yours ties to the bank balance. The deck ties to nothing I can find. So now there are two runway numbers in this building and only one of them has a formula behind it.

I have a slide about this. Nobody has seen the slide.

Please come back. Joshua keeps opening tabs and whispering "why".

Emily${SIG.emily}`,
  });
  msg({
    id: 'm_joshua_frank', from: P.joshua, t: T('2026-10-19 09:12'), read: false,
    subject: 'frank??',
    body: `Frank,

11 outgoing calls. Voicemail every time.

Your chair was in a weird position. Your yoga mat is still by the wall and the Excel pillow has a dent in it. Drew asked if you sleep here. I said I think so.

Diane wants to know which budget is the real one. I opened the FY27 Budget folder. You save FINAL versions like confetti, man. v4_FINAL, v5_FINAL_FINAL, v5_FINAL_USE_THIS. Which one is final final final?

Also IT wanted to reset your Windows password and I told them to wait, because you always said your password hint is enough for anybody who actually knows this company. Something about where we started? And when? You know what I mean. I don't.

Six years. I work with you. I don't understand you.

(Also the website still says Director. Steve promoted you on the website and nowhere else. HR has you as FP&A Manager. Rachel checked. Rachel checks a lot of things.)

Call me.
Josh${SIG.joshua}`,
  });
  msg({
    id: 'm_diane_which', from: P.diane, to: [P.joshua], cc: [ME], t: T('2026-10-19 08:12'), read: false,
    subject: 'Re: FY27 budget — which one??',
    body: `Joshua,

I approved one version. I am not opening five files to find it, and neither is the Board.

The one I approved passes three tests. Check each file against all three:

  1. HEADCOUNT: it carries every person on our payroll, the same number our website brags about (the Headcount tab should match it).
  2. GROSS MARGIN: exactly 22.0%. That is what I promised the bank. It's on the P&L Summary.
  3. RENT & LEASES: it includes the 2024 warehouse expansion lease at $6.00 per square foot per year, on top of the existing $180K plant lease. Frank knows the square footage; it's on our About page timeline (2024).

If a file fails any one of those, it isn't mine. Frank knows which one it is. Ask Frank.

Diane${SIG.diane}

----- Original Message -----
From: Joshua Reyes
To: Diane Kessler
Cc: Frank Warmington
Sent: Monday, October 19, 2026 7:55 AM
Subject: FY27 budget — which one??

> Diane, Frank isn't in and the FY27 Budget folder has five versions.
> Three of them have FINAL in the name. Which one did you approve?
> Josh`,
  });
  msg({
    id: 'm_rachel_knew', from: P.rachel, t: T('2026-10-18 23:26'), read: false,
    subject: 'I KNEW IT',
    attach: [{ name: 'vegas_evidence.jpg', size: '620 KB', file: 'pic_evidence' }],
    inlineImg: 'kEvidence',
    body: `I KNEW IT.

Somebody posted this on the Kristians fan forum Saturday night. "Spotted on a casino floor in Vegas!!" Look at the mug, Frank. GET SHEET DONE. That's YOUR mug. I know that mug. I gave you a birthday card in 2019 and you used it as a coaster under that mug.

And the arm. I circled the arm. Seventeen years, mīļais. I know that arm.

He took you from me. Kristians Bušārs. The Latvian one. Master of cheat sheets, king of macros. You watched his videos with the sound ON. You have never once watched my videos with the sound on.

And the fan club card on your desk. "Kristians' Cheat Sheet Club. Superfan." Laminated! You never laminated anything of mine.

I bought a Latvian dictionary. Just in case. "Sirds" means heart. "Salauzta" means broken. You can guess the rest.

Wherever you are in Vegas, I hope he doesn't know how you take your coffee. Two sugars. I know that. HE doesn't.

R ♥ (salauzta)`,
  });
  msg({
    id: 'm_marcus_cov', from: P.marcus, t: T('2026-10-16 10:32'), cc: [P.diane],
    subject: 'Covenant certificate due with Board Pack',
    body: `Frank,

A reminder ahead of Tuesday. The credit committee can only release the survival package once it has the Q3 covenant certificate together with the Board Pack.

For the certificate: DSCR must be at least 1.25x per Section 6.1, tested on a trailing-twelve-month basis. Please show the calculation, not just the ratio.

Minimum liquidity of $250K per Section 6.2 applies at every week-end, so the committee will read the 13-week cash forecast alongside the certificate. The real one, please. We have seen the Board version.

If you need the definitions, the loan agreement excerpt is in the documents you zipped up.

Regards,${SIG.marcus}`,
  });
  msg({
    id: 'm_rachel_payroll', from: P.rachel, t: T('2026-10-15 15:21'),
    subject: 'Payroll for your cash thing :)',
    body: `Labdien, Frank!! ♥

(That's "good day" in Latvian. I'm learning. For no reason.)

You asked for payroll numbers for your 13-week cash thingy, so here you go :)

Each run is $196K all-in (wages + taxes + benefits) for the hourly crew. Plant and warehouse, both shifts. Salaried are monthly, you know this.

Next run is Friday Oct 23. That's week 1 of your 13 weeks.

And we pay every other Friday, silly. It's even on our careers page ;) So Oct 23, then two weeks later, then two weeks after that... you know the drill.

Let me know if you need anything else. Anything at all. I'm at my desk until 5. Or 6. I can stay. I always stay.

R ♥${SIG.rachel}`,
  });
  msg({
    id: 'm_drew_budget', from: P.drew, t: T('2026-10-14 09:03'), pri: 1,
    subject: "WHERE'S MY BUDGET",
    body: `FRANK.

Board is Tuesday. I need the FY27 budget on my desk. Not in a folder called FINAL. Not in a folder called FINAL FINAL. ON MY DESK. Printed. Stapled. Top left corner.

And the runway slide. You keep sending me 43 days. The deck says six months. Just make it six months. Make it work.

I have a house. I have a Porsche. I have the company pool-jumping contest in three weeks and I intend to defend my cannonball title. None of those things happen at 43 days.

And don't even think about Vegas. If anybody from this company goes with you, they're fired. Not you. Them. I need you.

Drew${SIG.drew}

P.S. and stop talking about that Excel competition thing in Nevada, nobody here cares

P.P.S. If you're at that Excel rodeo in Nevada, I will find you.`,
  });
  msg({
    id: 'm_karen_capex', from: P.karen, t: T('2026-10-13 07:05'),
    subject: 'Die-cutter rebuild — paid',
    attach: [{ name: 'DieCutter_Rebuild_Invoice_4471.pdf', size: '96 KB', file: 'inv_diecutter' }],
    body: `Frank,

For your covenant math: the die-cutter rebuild on Line 2 is done and paid. $110K, paid in cash out of the operating account, not under the equipment loan. The other $300K of capex over the last twelve months (the corrugator glue station and the two electric forklifts) went on the equipment loan.

Invoice attached. Line 2 is running again and it's louder than before, which the guys say means it's working.

Karen${SIG.karen}`,
  });
  msg({
    id: 'm_marcus_vegas', from: P.marcus, t: T('2026-10-12 11:20'),
    subject: 'Vegas next week?',
    body: `Frank,

Off the record: I'm in Las Vegas next week for a banking conference at the Bellagio... I mean, a hotel. A conference hotel. Are you around?

Would love to talk about the refi over a coffee, away from Diane's calendar and Drew's hat. There are things I can say about the covenant reset in person that I can't put in a memo.

Let me know. First round is on the bank. The coffee, I mean.

Marcus${SIG.marcus}`,
  });
  msg({
    id: 'm_steve_proud', from: P.steve, to: [ALLSTAFF], t: T('2026-10-12 08:15'),
    subject: 'Proud of this team',
    body: `All,

Walked the plant floor this morning with a cup of coffee, the way my grandfather used to. Line 2 is running again, the trucks went out on time, and somebody finally fixed the door on the break room fridge.

I know it's been a hard year. Paper went up, the bank's asking questions, and our finance folks have been here past midnight more often than I'd like. One of them apparently sleeps here. I see it.

Grandpa Walter started this company with not much more than savings and stubbornness. We've still got plenty of the second one.

Board meets Tuesday the 20th. Let's show them who we are.

Steve

Steve Packa
President, Packa Corporation
Since 1958`,
  });
  msg({
    id: 'm_kristians', from: { name: 'Kristians Bušārs', email: 'hello@kristians-sheets.example' }, t: T('2026-10-11 06:00'),
    subject: 'LAMBDA tricks + see you in Vegas?',
    html: `<div class="oe-nl oe-nl-k">
      <div class="oe-nl-k-head"><b>CHEAT&nbsp;SHEETS&nbsp;WITH&nbsp;KRISTIANS</b><span>Issue #211 &middot; the newsletter for people who dream in grids</span></div>
      <p>Labdien, spreadsheet people!</p>
      <p>Three LAMBDA tricks this week, then some news.</p>
      <p><b>1. Name it once, use it everywhere.</b> Put your LAMBDA in Name Manager (e.g. <code>GM_PCT = LAMBDA(rev, cogs, (rev-cogs)/rev)</code>) and call <code>=GM_PCT(B4,B5)</code> like a built-in function. Your colleagues will think you are a wizard. You are.</p>
      <p><b>2. BYROW + LAMBDA.</b> <code>=BYROW(B2:M40, LAMBDA(r, SUM(r)))</code> gives you row totals as one spill. No more dragging formulas down 400 rows at midnight.</p>
      <p><b>3. Recursion, carefully.</b> A LAMBDA can call itself by name. It can also crash your laptop in front of the CFO. Test on a copy.</p>
      <div class="oe-nl-k-box"><b>See you in Vegas?</b><br>The Excel World Championship team qualifier is in Las Vegas this month, October 19 to 21. If you're entered, reply and tell me. I'm hosting a small meetup the night before (bring your own keyboard, no mice allowed).</div>
      <p>Paldies and happy spilling, jah!<br>Kristians</p>
      <p class="oe-nl-small">P.S. Team entries close Friday. Bring a partner who knows INDEX/MATCH better than you do.<br><br>You are receiving this because you subscribed at a spreadsheet meetup and never unsubscribed. <u>Unsubscribe</u></p>
    </div>`,
    attach: [{ name: 'LAMBDA_cheatsheet_v3.pdf', size: '188 KB' }],
  });
  msg({
    id: 'm_tom_sales', from: P.tom, t: T('2026-10-09 16:40'),
    subject: 'Sales plan FY27 = $40.0M, locked',
    body: `Frank,

Confirming for the budget: FY27 sales plan is $40.0M. That's $40,000K in your language. Locked. Steve and Drew signed off in the Oct 8 review.

If you see a version at $39.5M, that's the old one from before we won the co-op contract in Warsaw (Missouri, not Poland). Ignore it. Better yet, delete it.

Don't let anybody talk it down. My guys are already selling to it.

Tom${SIG.tom}`,
  });
  msg({
    id: 'm_chamber', from: { name: 'Sedalia Area Chamber of Commerce', email: 'events@sedaliachamber.example' }, t: T('2026-10-08 12:00'),
    subject: 'Sedalia Area Chamber of Commerce — October mixer',
    html: `<div class="oe-nl oe-nl-c">
      <div class="oe-nl-c-head">Sedalia Area Chamber of Commerce<small>Member News &middot; October 2026</small></div>
      <h3>Business After Hours: October Mixer</h3>
      <p><b>Thursday, October 22 &middot; 5:00 to 7:00 PM</b><br>Chamber Office, downtown Sedalia</p>
      <p>Join fellow members for light refreshments, a cash bar and the traditional business-card drawing. This month's door prize: a homemade pie and two tickets to the Friday football game.</p>
      <ul><li>New member ribbon cuttings: 3 this month</li><li>Holiday parade float applications due Nov 2</li><li>Reminder: renew your membership by Oct 31</li></ul>
      <p>Members, please bring a colleague. Bring two if one of them is from Finance; they never get out. (Packa's Frank Warmington has already RSVP'd "no &mdash; out of state". Frank, you're the first Finance person to RSVP in nine years. Come back and we'll save you a slice.)</p>
      <p class="oe-nl-small">You are receiving this e-mail because Packa Corporation is a Chamber member. To update your preferences, reply to this message.</p>
    </div>`,
  });
  msg({
    id: 'm_it_pw', from: P.helpdesk, t: T('2026-10-07 08:00'),
    subject: 'Password expiry',
    body: `Frank,

Your password expires in 3 days. Press Ctrl+Alt+Del and choose Change Password before Saturday, Oct 10.

Reminder: do not use your name, and please stop using the password hint field to write the answer.

Also: Facilities reports a draft coming from behind the poster at your desk. Please do not tape cardboard over the vent again.

Thanks,
IT Helpdesk
Packa Corporation | ext. 200`,
  });
  msg({
    id: 'm_emily_q', from: P.emily, t: T('2026-10-05 14:15'),
    subject: 'Quick question about the budget process',
    body: `Hi Frank,

Quick one. When the budget changes, how many places do you update by hand? The P&L, the weekly cash, the covenant workbook, Drew's Board deck?

I counted for last month's reforecast: seven files, by hand, in one night. That's not a process, that's a hobby.

I know you've heard my pitch. I'm not sending it again. I'm just asking how many files it was this time.

20 minutes whenever you want. No slides. I'll bring coffee. Two sugars, right? (Rachel told me. Rachel tells everyone.)

Emily${SIG.emily}`,
  });
  msg({
    id: 'm_ozark', from: P.ozark, t: T('2026-09-28 09:00'),
    subject: 'Price increase notice — containerboard',
    attach: [{ name: 'OKM_Price_Notice_2026-07.pdf', size: '64 KB' }],
    body: `OZARK KRAFT MILLS
Accounts Receivable

September 28, 2026

To: Packa Corporation, Accounts Payable / Finance
Re: Containerboard price adjustment

Dear Valued Customer,

This confirms the increase communicated in June.

    Containerboard: +$40.00 per ton, effective July 1, 2026, on all grades
    (linerboard and medium, all basis weights).

Invoices dated on or after July 1, 2026 include the adjusted price. If your records do not show this adjustment, please contact your account representative.

Please note that accounts more than 60 days past due are placed on credit hold.

Sincerely,

Billing Department
Ozark Kraft Mills
billing@ozarkkraftmills.example

This is an automated message. Please do not reply to this e-mail.`,
  });
  msg({
    id: 'm_welcome', from: PACKIT, t: T('2026-09-28 07:30'),
    subject: 'Welcome to Outlook Express 6',
    body: `Welcome to Outlook Express 6!

Your PC was re-imaged over the weekend and your mail has been moved to Local Folders on this computer.

A few tips from Packa IT:

  - Press F5 or click Send/Recv to check for new mail.
  - Double-click a message to open it in its own window.
  - Deleted Items is not a filing system. (Frank.)
  - Mailbox quota is 250 MB. Some of you are at 249 MB. You know who you are. (Frank.)

Questions? Call the IT Helpdesk at ext. 200.

Packa IT`,
  });

  msg({
    id: 'm_kclub', from: { name: "Kristians' Cheat Sheet Club", email: 'club@kristians-sheets.example' }, t: T('2026-10-15 07:00'),
    subject: 'Cheat Sheet #212 hits 100,000 downloads + webinar replay + Superfan of the Month',
    html: `<div class="oe-nl oe-nl-k">
      <div class="oe-nl-k-head"><b>KRISTIANS'&nbsp;CHEAT&nbsp;SHEET&nbsp;CLUB</b><span>Members only &middot; "There's always a formula."</span></div>
      <p>Labdien, club members!</p>
      <p><b>Cheat Sheet #212 hits 100,000 downloads.</b> The Ultimate FP&amp;A Formula Poster: 47 formulas, dynamic arrays, one page. FILTER, SORTBY, UNIQUE, XLOOKUP and the LET pattern I use for every model. Posted September 1, downloaded one hundred thousand times. Print it. Tape it next to your monitor. Your boss will ask what it is. Tell him it's a formula.</p>
      <p><b>Webinar replay:</b> "Stop Hardcoding, Start Living" (58 min). The part at 41:10 where I rebuild a 13-week cash forecast in six formulas made one of you type "oh no" in the chat. That is the correct reaction.</p>
      <div class="oe-nl-k-box"><b>Superfan of the Month: Frank W.</b><br>Member #0003 has downloaded every cheat sheet since #1, sent 37 corrections (36 were right) and asked if #212 comes laminated. Frank, the answer is now yes. Your laminated club card went out in March. Jah!</div>
      <p>See you in the grid,<br>Kristians</p>
      <p class="oe-nl-small">You receive this because you are a member of Kristians' Cheat Sheet Club. Member no. 0003 (Frank W.). (0001 is Kristians. 0002 is his mom.) <u>Manage membership</u></p>
    </div>`,
    attach: [{ name: 'CheatSheet_212_FPA_Formula_Poster.pdf', size: '312 KB' }],
  });

  // ---------- SENT ----------
  msg({
    id: 's_kclub', folder: 'sent', from: ME, to: [{ name: "Kristians' Cheat Sheet Club", email: 'club@kristians-sheets.example' }], t: T('2026-10-15 07:04'),
    subject: 'Re: Cheat Sheet #212 hits 100,000 downloads',
    body: `Hi,

Laminated #212, yes please. A4, not Letter. The one on my wall has a coffee ring on INDEX/MATCH and I need INDEX/MATCH.

Also a small correction: on page 2 the SORTBY example sorts descending, but the caption says ascending.

Big fan. Still.

Frank${FRANK_SIG}`,
  });
  msg({
    id: 's_emily', folder: 'sent', from: ME, to: [P.emily], t: T('2026-10-05 14:40'),
    subject: 'Re: Quick question about the budget process',
    body: `Not now, Emily. Board season.

Frank${FRANK_SIG}

----- Original Message -----
From: Emily Carter
To: Frank Warmington
Sent: Monday, October 05, 2026 2:15 PM
Subject: Quick question about the budget process

> Hi Frank,
> Quick one. When the budget changes, how many places do you update by hand?`,
  });
  msg({
    id: 's_joshua', folder: 'sent', from: ME, to: [P.joshua], t: T('2026-10-16 23:52'),
    subject: 'one thing',
    body: `if anything happens to me, the password hint is enough

and do not touch the Do not touch

F`,
  });
  msg({
    id: 's_self', folder: 'sent', from: ME, to: [ME], t: T('2026-10-16 23:59'),
    subject: 'note to self',
    body: `note to self: stop naming files FINAL`,
  });

  // ---------- DRAFTS ----------
  msg({
    id: 'd_diane', folder: 'drafts', from: ME, to: [P.diane], t: T('2026-10-16 23:55'),
    subject: 'Board Pack',
    body: `Diane,

Everything is in My Documents. The real numbers are not where Drew thinks they are. I'll explain Tuesday. The short version is`,
  });

  // ---------- DELETED ----------
  msg({
    id: 'del_demo', folder: 'deleted', from: P.emily, t: T('2026-10-02 09:01'),
    subject: 'Re: FinanceOS walkthrough?',
    body: `Frank,

You said "maybe after the Board." You say that every quarter. So I put 30 minutes on your calendar for after the Board anyway.

It's the walkthrough I keep mentioning. Datarails FinanceOS is a governed layer that connects our ERP, CRM, HR system and Excel data to the finance work we already do. The budget, the weekly cash and the covenant math run on the same numbers, and every change is traceable, so nobody keeps a change log by hand at midnight.

Right now, if you took a week off, nobody here could find the real number. This is exactly why FinanceOS—

Sorry. I'll stop. Just don't delete this one.

Emily${SIG.emily}

----- Original Message -----
From: Frank Warmington
To: Emily Carter
Sent: Thursday, October 01, 2026 11:58 PM
Subject: FinanceOS walkthrough?

> maybe after the Board`,
  });
  msg({
    id: 'del_spam', folder: 'deleted', from: { name: 'Spreadsheet Deals', email: 'offers@mega-macros.example' }, t: T('2026-10-10 03:12'), read: false,
    subject: 'Increase your ROWS by 300%!!! Accountants HATE this one VLOOKUP trick',
    body: `Dear Valued Excel User,

ARE YOUR SPREADSHEETS TOO SMALL?

Our revolutionary MEGA-MACRO pack adds 3,000,000 extra rows to ANY workbook*. Your spreadsheet will never crash again!!

  >>> CLICK HERE to claim your FREE macro-enabled .xls <<<

*Not compatible with Excel. Or computers.

To unsubscribe, send $49.95 in unmarked bills.`,
  });

  /* ================= progress-triggered mail ================= */
  const PACK = [
    { name: 'Budget_FY27_BOARD.xls', size: '71 KB', file: 'bud_board' },
    { name: 'Covenant_Cert_Q3.xls', size: '39 KB', file: 'covenant' },
    { name: 'Packa_Cash_13wk_REAL_2026-10-16.xls', size: '55 KB', file: 'cash13' },
    { name: 'Q3_EBITDA_Bridge.xls', size: '48 KB', file: 'bridge' },
    { name: 'FOR_THE_BOARD.xls', size: '88 KB', file: 'forboardx' },
  ];
  const TPL = {
    joshua_hidden: () => ({
      from: P.joshua, subject: 'the REAL version',
      body: `Writing from the plane. Wi-Fi is $19 and Drew says I have to expense it under "Frank".

Diane says the covenant is done. Nice. If you're doing the 13-week cash next, don't use the Board deck. Frank keeps a REAL VERSION next to the BOARD VERSION. It's hidden. Tools > Folder Options > View > Show hidden files and folders. Then look in My Documents\\BOARD.

Six years and I only found it today. I work with Frank. I don't understand Frank.

Josh

Sent from 34,000 ft`,
    }),
    drew_bridge: () => ({
      from: P.drew, pri: 1, subject: 'BRIDGE',
      body: `LANDED. THE HOTEL POOL CLOSES AT 10. A DISGRACE.

DIANE FORWARDED ME YOUR CASH THING. WEEK FIVE?? THE DECK SAYS SIX MONTHS. ...FINE. FINE. I'M NOT SAYING ANYTHING.

NOW THE Q3 EBITDA BRIDGE. FRANK'S VERSION HAS TWO QUESTION MARKS IN IT. QUESTION MARKS. IN A BOARD PACK.

IT DOESN'T CLOSE. THE BOARD IS GOING TO ADD IT UP. STEVE ADDS EVERYTHING UP. STEVE ADDS UP THE LUNCH MENU.

MAKE IT WORK. NOT LIKE THAT. ACTUALLY MAKE IT WORK.

DREW${SIG.drew}

P.S. FOUND THIS IN MY PHONE. FRANK'S ANSWER THE LAST TIME I ASKED WHY PAPER COSTS WENT UP. I DIDN'T READ IT THEN EITHER.

> Frank wrote:
> Drew, the mill letter is the $/ton increase. Containerboard cost = $/ton × tons we run a quarter (Products page).
> Volume, price and labor are already in the bridge. Freight is the residual.
> F`,
    }),
    diane_forboard: () => ({
      from: P.diane, pri: 1, subject: 'Next thing.',
      body: `The bridge closes. I checked it twice.

Next thing: Frank's FOR THE BOARD folder on his desktop. The file inside is locked. That's the emergency plan. Open it.

Diane${SIG.diane}`,
    }),
    diane_send: () => ({
      from: P.diane, pri: 1, subject: 'Send me the pack. Now.',
      body: `I've read the emergency plan. So has my blood pressure.

Send me the pack. Now. Reply to this e-mail.

Diane${SIG.diane}`,
    }),
    diane_ok: () => ({
      from: P.diane, subject: 'Re: Board Pack — Approved.',
      body: `Approved.

I called the Board chair at home and woke him up. He read Frank's emergency plan in his bathrobe and approved it. The vote at 9:00 is a formality now.

Every page ties. Budget is the version I signed. DSCR is 1.25x, right on the covenant. Real cash breaches minimum liquidity in week 5, and the plan covers it. The bridge closes.

For the record: from today the Board gets the real numbers. I am done taking Drew's numbers.

Thank you. Whoever you are.

Now. Who is Frank with?

Diane${SIG.diane}`,
    }),
    marcus_ok: () => ({
      from: P.marcus, to: [P.diane], cc: [ME], subject: 'Survival package approved, subject to conditions',
      body: `Diane, Frank,

I've reviewed the Board Pack and the emergency plan with our credit officer tonight.

The $4.0M survival package is approved subject to:

  (i) the Q3 covenant certificate as delivered, signed by the CFO, showing DSCR of 1.25x per Section 6.1, with the executed Board resolution;
  (ii) a covenant reset for FY27 to reflect the new facility's debt service (pro-forma DSCR would otherwise fall below 1.25x);
  (iii) weekly cash reporting from the real 13-week forecast, not the Board version;
  (iv) a waiver of the Q4-26 covenant test. The emergency plan is candid that real Q4 EBITDA is negative and DSCR would fail. We would rather waive a test we can see than pass one we can't.

Minimum liquidity under Section 6.2 will be monitored weekly against that forecast.

Funds will be available once we receive the signed resolution after this morning's meeting.

It's a pleasure to receive a pack that adds up. Please pass my thanks to whoever built it.

Regards,${SIG.marcus}`,
    }),
    joshua_vegas: () => ({
      from: P.joshua, cc: [P.diane], subject: 'from Vegas',
      body: `We're at the team qualifier in Vegas. 300 people in green shirts. No Frank yet.

Rachel says she has a theory about who he's with. She won't tell us. She says she's emailed Frank about it. She's crying in Latvian.

Drew got into the hotel pool after it closed. In the hat. Nobody asked him to. Emily opened her laptop to show Drew a slide and Drew said "NOT NOW, EMILY" so loud a security guard came over. Drew also said if he finds out Frank's in Vegas with someone, that someone is fired. I think he means one of us.

If you figure out who Frank is with, tell us. Please.

Josh`,
    }),
    frank_reveal: () => ({
      from: FRANK_OFFGRID, to: [P.joshua], cc: [P.diane], subject: 'Re: frank??',
      body: `To whoever is on my computer (hopefully not Drew),

Yes. Vegas. With Kristians. The team qualifier. We're through to the quarterfinals. Team "Cheat Sheet Kings". He does the macros, I do the INDEX/MATCH. Tell Rachel it's strictly professional. And that I'm sorry about the birthday card.

I saw the bank approved. Diane says the Board will pass it at 9. Diane is never wrong. That's the problem.

So you found the right version, fixed the #REF!, did the covenant, found the real cash, closed the bridge and opened the plan. In one night. Congratulations, you're Frank now. It's not a great job.

And tell Emily... fine. FinanceOS.

Back Thursday. Do not touch the Do not touch.

—F${FRANK_SIG}

P.S. Drew is here. He's in the hotel pool. In the hat. Kristians says "jah, this is normal for Americans?"`,
    }),
  };
  const TRIG = {
    dscr: [['joshua_hidden', 2500]],
    cash: [['drew_bridge', 2500]],
    bridge: [['diane_forboard', 2500]],
    forboard: [['diane_send', 2500]],
    send: [['diane_ok', 4000], ['marcus_ok', 7000], ['joshua_vegas', 11000]],
    frank: [['frank_reveal', 2500]],
  };
  /* ================= mailbox state ================= */
  const box = () => {
    const f = FR.state.flags;
    if (!f.oe || typeof f.oe !== 'object') f.oe = { moved: {}, gone: {}, extra: [] };
    const b = f.oe; b.moved = b.moved || {}; b.gone = b.gone || {}; b.extra = b.extra || [];
    return b;
  };
  const all = () => { const b = box(); return SEED.concat(b.extra).filter(m => !b.gone[m.id]); };
  const folderOf = m => box().moved[m.id] || m.folder;
  const inFolder = f => all().filter(m => folderOf(m) === f);
  const byId = id => SEED.find(m => m.id === id) || box().extra.find(m => m.id === id);
  const isRead = m => { const r = FR.state.readMail || (FR.state.readMail = {}); return r[m.id] !== undefined ? !!r[m.id] : !!m.read; };
  const setRead = (m, v) => { if (isRead(m) === v) return; (FR.state.readMail = FR.state.readMail || {})[m.id] = v; FR.save(); refresh(); };
  const unreadIn = f => inFolder(f).filter(m => !isRead(m)).length;
  let seq = 0;
  const newId = p => p + '_' + Date.now().toString(36) + (seq++);

  function addMsg(m, notify) {
    box().extra.push(m); FR.save();
    if (notify) {
      FR.sound.play('mail');
      FR.balloon('You have new e-mail', 'From: ' + E(m.from.name || m.from.email), () => FR.apps.mail(), { act: 'Open Inbox' });
    }
    refresh();
    FR.bus.emit('mail-new', m.id);
  }
  function incoming(tpl, notify = true) {
    return addMsg(Object.assign({ id: newId('x'), folder: 'inbox', to: [ME], cc: [], attach: [], pri: 0, read: false, t: FR.clock.now().getTime() }, tpl), notify);
  }
  function deliverKey(key, notify) {
    if (FR.flags.get('mail_' + key) || !TPL[key]) return;
    FR.state.flags['mail_' + key] = true;
    incoming(Object.assign(TPL[key](), { id: 'x_' + key }), notify);
    FR.flags.set('mail_' + key, true);
  }
  function catchUp() {
    Object.keys(TRIG).forEach(id => { if (FR.puzzle.isSolved(id)) TRIG[id].forEach(([k]) => deliverKey(k, false)); });
  }
  FR.bus.on('solved', id => { (TRIG[id] || []).forEach(([k, ms]) => setTimeout(() => deliverKey(k, true), ms)); });
  FR.bus.on('login', () => setTimeout(catchUp, 50));
  setTimeout(catchUp, 0);

  /* ================= icons ================= */
  const sv = (vb, body) => `<svg viewBox="0 0 ${vb} ${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const ENV24 = `<rect x="2" y="7" width="17" height="12" rx="1" fill="#fffbe8" stroke="#8c7a43"/><path d="M2.5 7.5l8 6.5 8-6.5" fill="none" stroke="#8c7a43"/><path d="M2.5 18.5l6-5M18.5 18.5l-6-5" stroke="#c7b680" stroke-width=".8"/>`;
  const TI = {
    create: sv(24, ENV24 + `<path d="M13 9l7.5-7.5 2 2L15 11l-2.8.8z" fill="#f4c542" stroke="#8a6508" stroke-width=".7"/><path d="M20.5 1.5l2 2" stroke="#d45a2a" stroke-width="1.6"/>`),
    reply: sv(24, `<g transform="translate(4 2)">${ENV24}</g><path d="M11 5L3 10.5l8 5.5v-3.2c4.2 0 6.8 1.2 8.8 4.4-.4-5-3.6-7.9-8.8-8.2z" fill="#7b61d9" stroke="#3a2a8c" stroke-width=".8" stroke-linejoin="round"/>`),
    replyall: sv(24, `<g transform="translate(4 2)">${ENV24}</g><path d="M8 5L1 10.5 8 16" fill="none" stroke="#3a2a8c" stroke-width="2.6" stroke-linejoin="round"/><path d="M8 5L1 10.5 8 16" fill="none" stroke="#9c86f0" stroke-width="1.2" stroke-linejoin="round"/><path d="M13 5L6 10.5l7 5.5v-3.2c3.8 0 6 1.2 8 4.4-.4-5-3.2-7.9-8-8.2z" fill="#7b61d9" stroke="#3a2a8c" stroke-width=".8" stroke-linejoin="round"/>`),
    forward: sv(24, `<g transform="translate(0 2)">${ENV24}</g><path d="M13 5l8 5.5-8 5.5v-3.2c-4.2 0-6.8 1.2-8.8 4.4.4-5 3.6-7.9 8.8-8.2z" fill="#2f8be0" stroke="#15528f" stroke-width=".8" stroke-linejoin="round"/>`),
    print: FR.icons.printer,
    del: sv(24, `<g transform="translate(0 1)">${ENV24}</g><path d="M13 3l8 8M21 3l-8 8" stroke="#fff" stroke-width="4.4" stroke-linecap="round"/><path d="M13 3l8 8M21 3l-8 8" stroke="#d8261b" stroke-width="2.8" stroke-linecap="round"/>`),
    sendrecv: sv(24, `<g transform="translate(-1 3) scale(.8)">${ENV24}</g><g transform="translate(6 8) scale(.8)">${ENV24}</g><path d="M19 1v7M16.5 3.5L19 1l2.5 2.5" fill="none" stroke="#1d9a2b" stroke-width="1.8" stroke-linecap="round"/><path d="M4 16v7M1.5 20.5L4 23l2.5-2.5" fill="none" stroke="#2f7de0" stroke-width="1.8" stroke-linecap="round"/>`),
    addresses: sv(24, `<rect x="4" y="2" width="16" height="20" rx="1.5" fill="#3a6fc4" stroke="#1d3f7c"/><rect x="6" y="3.5" width="12.5" height="17" fill="#eef4ff"/><circle cx="12.2" cy="9.3" r="2.8" fill="#e0b07c" stroke="#8a5a2a" stroke-width=".6"/><path d="M7.6 17.5c.6-3 2.3-4.4 4.6-4.4s4 1.4 4.6 4.4z" fill="#3aa04a" stroke="#1f6a2a" stroke-width=".6"/><g fill="#f0c230" stroke="#8a6508" stroke-width=".4"><rect x="19.5" y="5" width="3" height="3"/><rect x="19.5" y="10" width="3" height="3"/><rect x="19.5" y="15" width="3" height="3"/></g>`),
    find: sv(24, `<g transform="translate(0 3)">${ENV24}</g><circle cx="15.5" cy="9" r="4.6" fill="#dff0ff" fill-opacity=".85" stroke="#3a6fc4" stroke-width="1.8"/><path d="M19 12.5l4 4" stroke="#8a5a2a" stroke-width="2.8" stroke-linecap="round"/>`),
    send: sv(24, ENV24 + `<path d="M14 3h9M16 6h7M18 9h5" stroke="#2f7de0" stroke-width="1.4" stroke-linecap="round"/>`),
    cut: sv(24, `<circle cx="7" cy="18" r="3.3" fill="none" stroke="#333" stroke-width="1.6"/><circle cx="17" cy="18" r="3.3" fill="none" stroke="#333" stroke-width="1.6"/><path d="M9 15.5L16 3M15 15.5L8 3" stroke="#7d8793" stroke-width="1.8"/>`),
    copy: sv(24, `<path d="M3 3h9l3 3v11H3z" fill="#fff" stroke="#6b7785"/><path d="M9 8h9l3 3v11H9z" fill="#fff" stroke="#6b7785"/><path d="M11 13h8M11 16h8M11 19h6" stroke="#9ab" stroke-width=".9"/>`),
    paste: sv(24, `<rect x="3" y="4" width="14" height="18" rx="1.5" fill="#c98a3c" stroke="#7d5220"/><rect x="7" y="2" width="6" height="4" rx="1" fill="#9aa6b5" stroke="#5f6d7e"/><path d="M10 9h9l3 3v10H10z" fill="#fff" stroke="#6b7785"/><path d="M12 14h8M12 17h8" stroke="#9ab" stroke-width=".9"/>`),
    undo: sv(24, `<path d="M8 6L3 11l5 5" fill="none" stroke="#2f7de0" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M3.5 11H14a6 6 0 0 1 0 12h-3" fill="none" stroke="#2f7de0" stroke-width="2.2" stroke-linecap="round"/>`),
    check: sv(24, `<rect x="3" y="4" width="14" height="17" rx="1.5" fill="#3a6fc4" stroke="#1d3f7c"/><rect x="5" y="5.5" width="11" height="14" fill="#eef4ff"/><circle cx="10.5" cy="10" r="2.3" fill="#e0b07c"/><path d="M6.8 17c.5-2.4 1.8-3.4 3.7-3.4s3.2 1 3.7 3.4z" fill="#3aa04a"/><path d="M14 16l3 3 6-7" fill="none" stroke="#1d9a2b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`),
    spell: sv(24, `<text x="1" y="12" font-family="Arial" font-weight="bold" font-size="9.5" fill="#1d3f7c">ABC</text><path d="M6 17l4 4 10-10" fill="none" stroke="#1d9a2b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`),
    attach: sv(24, `<path d="M16 7l-7.5 7.5a2.3 2.3 0 0 0 3.2 3.2l8-8a4 4 0 0 0-5.6-5.6l-8.3 8.3a5.6 5.6 0 0 0 8 8L20 14" fill="none" stroke="#555" stroke-width="1.7" stroke-linecap="round"/>`),
    priority: sv(24, `<path d="M9 2h6l-1.3 13h-3.4z" fill="#d8261b" stroke="#8a130c" stroke-width=".7"/><circle cx="12" cy="19.5" r="2.4" fill="#d8261b" stroke="#8a130c" stroke-width=".7"/>`),
    prev: sv(24, `<path d="M12 4L4 12l8 8M20 4l-8 8 8 8" fill="none" stroke="#2f7de0" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`),
    next: sv(24, `<path d="M12 4l8 8-8 8M4 4l8 8-8 8" fill="none" stroke="#2f7de0" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`),
    newc: sv(24, `<circle cx="10" cy="8" r="4" fill="#e0b07c" stroke="#8a5a2a" stroke-width=".7"/><path d="M3 21c.8-5 3.4-7.2 7-7.2s6.2 2.2 7 7.2z" fill="#3a6fc4" stroke="#1d3f7c" stroke-width=".7"/><path d="M19 2l1 2.4 2.5.4-1.8 1.8.4 2.5L19 8l-2.1 1.1.4-2.5-1.8-1.8 2.5-.4z" fill="#ffd33a" stroke="#b58800" stroke-width=".5"/>`),
  };
  const SI = {
    envClosed: sv(16, `<rect x="1" y="3.5" width="14" height="9.5" rx=".8" fill="#fff4b8" stroke="#8c7a43"/><path d="M1.5 4l6.5 5 6.5-5" fill="none" stroke="#8c7a43"/>`),
    envOpen: sv(16, `<path d="M1 7l7-5 7 5v7H1z" fill="#fffbe8" stroke="#8c7a43"/><path d="M3 5.5h10v4.5L8 12 3 10z" fill="#fff" stroke="#b7ab82" stroke-width=".6"/><path d="M1.2 7.2L8 11.5l6.8-4.3" fill="none" stroke="#8c7a43"/>`),
    envSent: sv(16, `<rect x="1" y="4.5" width="11" height="8" rx=".8" fill="#fffbe8" stroke="#8c7a43"/><path d="M1.5 5l5 4 5-4" fill="none" stroke="#8c7a43"/><path d="M11 2h4v4" fill="none" stroke="#2f7de0" stroke-width="1.4"/><path d="M15 2l-5 5" stroke="#2f7de0" stroke-width="1.4"/>`),
    draft: sv(16, `<path d="M2 1.5h8l3 3V15H2z" fill="#fff" stroke="#6b7785"/><path d="M4 6h6M4 8.5h6M4 11h4" stroke="#9ab" stroke-width=".8"/><path d="M8.5 13.5l6-6 1.2 1.2-6 6-1.7.5z" fill="#f4c542" stroke="#8a6508" stroke-width=".6"/>`),
    clip: sv(16, `<path d="M10.5 4.5L5.5 9.5a1.5 1.5 0 0 0 2.1 2.1l5.3-5.3a2.7 2.7 0 0 0-3.8-3.8L3.6 8a3.8 3.8 0 0 0 5.4 5.4L13 9.4" fill="none" stroke="#444" stroke-width="1.2" stroke-linecap="round"/>`),
    bang: sv(16, `<path d="M6.3 1.5h3.4l-.8 8.5H7.1z" fill="#d8261b"/><circle cx="8" cy="12.8" r="1.6" fill="#d8261b"/>`),
    person: sv(16, `<circle cx="8" cy="5" r="3" fill="#e0b07c" stroke="#8a5a2a" stroke-width=".6"/><path d="M2.5 15c.5-4 2.6-5.8 5.5-5.8s5 1.8 5.5 5.8z" fill="#3a6fc4" stroke="#1d3f7c" stroke-width=".6"/>`),
    inbox: sv(16, `<path d="M1 9l2.5-6h9L15 9v5H1z" fill="#dfe8f4" stroke="#50657f"/><path d="M1 9h4l1 2h4l1-2h4" fill="none" stroke="#50657f"/><rect x="5" y="3.5" width="6" height="4.2" fill="#fff4b8" stroke="#8c7a43" stroke-width=".6"/><path d="M5.2 3.8L8 6l2.8-2.2" fill="none" stroke="#8c7a43" stroke-width=".6"/>`),
    outbox: sv(16, `<path d="M1 9l2.5-5h9L15 9v5H1z" fill="#dfe8f4" stroke="#50657f"/><path d="M1 9h4l1 2h4l1-2h4" fill="none" stroke="#50657f"/><path d="M8 9V1M5 4l3-3 3 3" fill="none" stroke="#1d9a2b" stroke-width="1.6"/>`),
    sent: sv(16, `<path d="M1 9l2.5-5h9L15 9v5H1z" fill="#dfe8f4" stroke="#50657f"/><path d="M1 9h4l1 2h4l1-2h4" fill="none" stroke="#50657f"/><path d="M3 6.5h8M8 3.5l3 3-3 3" fill="none" stroke="#2f7de0" stroke-width="1.5"/>`),
    deleted: sv(16, `<path d="M3.5 4.5h9l-1 10h-7z" fill="#dfe8f4" stroke="#50657f"/><rect x="2.5" y="2.8" width="11" height="1.8" rx=".5" fill="#b9c8dc" stroke="#50657f" stroke-width=".7"/><path d="M6 6.5v6M8 6.5v6M10 6.5v6" stroke="#6f86a4" stroke-width=".8"/>`),
    drafts: null,
    local: FR.icons.folder,
    root: sv(16, `<circle cx="9.5" cy="7" r="5.5" fill="#7cc3ff" stroke="#1c63d0"/><path d="M5 5.5c2 .8 3 .2 4-1s2.5-1.2 3.5 0" fill="none" stroke="#e8f6ff" stroke-width=".9"/><rect x="1" y="8" width="10" height="7" rx=".6" fill="#fff4b8" stroke="#8c7a43"/><path d="M1.3 8.3L6 11.8l4.7-3.5" fill="none" stroke="#8c7a43" stroke-width=".8"/>`),
    book: sv(16, `<rect x="2.5" y="1.5" width="10.5" height="13" rx="1" fill="#3a6fc4" stroke="#1d3f7c"/><rect x="4" y="2.5" width="8.2" height="11" fill="#eef4ff"/><circle cx="8.1" cy="6.3" r="1.8" fill="#e0b07c"/><path d="M5.2 11.7c.4-2 1.4-2.8 2.9-2.8s2.5.8 2.9 2.8z" fill="#3aa04a"/>`),
  };
  SI.drafts = SI.draft;
  const ico = (svg, cls = '') => `<span class="oe-i ${cls}">${svg}</span>`;

  /* ================= helpers ================= */
  const nameOf = a => (a && (a.name || a.email)) || '';
  const namesOf = arr => (arr || []).map(nameOf).join('; ');
  const fullOf = a => a.name ? `"${a.name}" <${a.email}>` : `<${a.email}>`;
  const bodyText = m => m.body != null ? m.body : (m.html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h3|li)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&middot;/g, '·').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
  const linkify = s => E(s).replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g, (all, url, mail) => {
    const t = all.replace(/[.,;:)]+$/, ''), tail = all.slice(t.length);
    return (url ? `<a class="oe-link" data-url="${t}">${t}</a>` : `<a class="oe-mailto" data-to="${t}">${t}</a>`) + tail;
  });
  const renderBody = m => (m.html ? m.html : `<div class="oe-plain">${linkify(m.body || '')}</div>`) + (m.inlineImg && FR.data.images && FR.data.images[m.inlineImg] ? `<div class="oe-inline"><img src="${FR.data.images[m.inlineImg]}" alt="" data-att="0"></div>` : '');
  const wireBody = el => {
    el.addEventListener('click', e => {
      const a = e.target.closest('.oe-link, .oe-mailto'); if (!a) return;
      e.preventDefault();
      if (a.classList.contains('oe-mailto')) compose({ to: a.dataset.to });
      else if (FR.apps.ie) FR.apps.ie(/^http/.test(a.dataset.url) ? a.dataset.url : 'http://' + a.dataset.url);
    });
  };
  const attName = a => { const n = a.file && FR.fs && FR.fs.get(a.file); return n ? n.name : a.name; };
  const chipsHTML = atts => atts.map((a, i) => { const nm = attName(a); return `<span class="oe-chip" data-i="${i}" title="${E(nm)} (${E(a.size || '')})">${FR.icon(/\.xls$/i.test(nm) ? 'xls' : /\.txt$/i.test(nm) ? 'txt' : /\.(jpe?g|gif|png)$/i.test(nm) ? 'image' : /\.pdf$/i.test(nm) ? 'txt' : 'eml', 16)}<span>${E(nm)} (${E(a.size || '1 KB')})</span></span>`; }).join('');
  const openAttach = a => {
    if (a.file && FR.fs && FR.fs.get(a.file)) return FR.openFile(a.file);
    if (/\.pdf$/i.test(a.name) && FR.apps.pdf) return FR.apps.pdf({ name: a.name });
    FR.dialog({ icon: 'warn', title: 'Open Attachment', message: `Windows cannot open this file:<br><br>File: ${E(a.name)}<br><br>To open this file, Windows needs to know what program created it. There is no program on this computer associated with this file type.` });
  };
  const wireChips = (el, atts) => {
    el.querySelectorAll('.oe-chip').forEach(c => { c.ondblclick = c.onclick = e => { e.stopPropagation(); openAttach(atts[+c.dataset.i]); }; });
    el.querySelectorAll('.oe-inline img').forEach(img => { img.onclick = () => atts[0] && openAttach(atts[0]); });
  };

  const quoteHdr = m => `\n\n----- Original Message -----\nFrom: ${nameOf(m.from)}\nTo: ${namesOf(m.to)}${m.cc && m.cc.length ? '\nCc: ' + namesOf(m.cc) : ''}\nSent: ${fmtLong(m.t)}\nSubject: ${m.subject}\n\n`;
  const stripRe = s => String(s || '').replace(/^((re|fw|fwd)\s*:\s*)+/i, '');
  function replyTo(m, all) {
    let to = [m.from];
    let cc = [];
    if (all) {
      to = [m.from].concat((m.to || []).filter(a => a.email !== ME.email && a.email !== m.from.email));
      cc = (m.cc || []).filter(a => a.email !== ME.email);
    }
    if (m.from.email === ME.email) to = m.to;
    compose({ to: namesOf(to), cc: namesOf(cc), subject: 'Re: ' + stripRe(m.subject), body: quoteHdr(m) + bodyText(m).split('\n').map(l => '> ' + l).join('\n'), replyOf: m.id });
  }
  function forward(m) {
    compose({ subject: 'Fw: ' + stripRe(m.subject), body: quoteHdr(m) + bodyText(m), attach: (m.attach || []).slice() });
  }
  function printMsg(m) {
    FR.dialog({ icon: 'printer', title: 'Print', message: `Printing "${E(m.subject)}" to \\\\PACKA-FS01\\HP LaserJet 4 — Finance (no toner)...<br><br>No toner. Also no paper. Drew took the last ream for the "printed and stapled" budget.` });
  }
  function moveToDeleted(m) {
    const b = box();
    if (m.from && m.from.email === P.diane.email) {
      return FR.dialog({ icon: 'warn', title: 'Outlook Express', message: 'This message cannot be deleted.<br><br>Diane\'s e-mails do not delete. Nobody knows why. Frank stopped asking.' });
    }
    if (folderOf(m) === 'deleted') {
      return FR.dialog({ icon: 'warn', title: 'Outlook Express', message: 'Are you sure you want to permanently delete the selected message?', buttons: ['Yes', 'No'] }).then(r => {
        if (r.button === 'Yes') { b.gone[m.id] = true; FR.save(); refresh(); }
      });
    }
    b.moved[m.id] = 'deleted'; FR.save(); refresh();
  }

  /* ================= main window ================= */
  const FOLDERS = [
    { id: 'inbox', name: 'Inbox', icon: SI.inbox },
    { id: 'outbox', name: 'Outbox', icon: SI.outbox },
    { id: 'sent', name: 'Sent Items', icon: SI.sent },
    { id: 'deleted', name: 'Deleted Items', icon: SI.deleted },
    { id: 'drafts', name: 'Drafts', icon: SI.drafts },
  ];
  const V = { folder: 'inbox', sel: {}, sort: { col: 't', dir: -1 }, preview: true, W: null, el: null, localOpen: true };

  const menuMain = () => [
    { label: 'File', items: [
      { label: 'New Message', key: 'Ctrl+N', action: () => compose({}) },
      { label: 'Open', key: 'Ctrl+O', action: () => { const m = selMsg(); if (m) openMsg(m); } },
      { sep: true },
      { label: 'Save As...', disabled: true },
      { label: 'Import', disabled: true },
      { label: 'Export', disabled: true },
      { sep: true },
      { label: 'Print...', key: 'Ctrl+P', action: () => { const m = selMsg(); if (m) printMsg(m); } },
      { sep: true },
      { label: 'Switch Identity...', action: () => FR.dialog({ icon: 'info', title: 'Switch Identity', message: 'There is only one identity on this computer: <b>Main Identity (Frank Warmington)</b>.<br><br>You\'re Frank now.' }) },
      { label: 'Properties', key: 'Alt+Enter', action: () => props() },
      { sep: true },
      { label: 'Work Offline', disabled: true },
      { label: 'Exit', action: () => V.W && V.W.close() },
    ] },
    { label: 'Edit', items: [
      { label: 'Copy', key: 'Ctrl+C', action: () => document.execCommand('copy') },
      { label: 'Select All', key: 'Ctrl+A', disabled: true },
      { sep: true },
      { label: 'Delete', key: 'Ctrl+D', action: () => { const m = selMsg(); if (m) moveToDeleted(m); } },
      { label: 'Empty \'Deleted Items\' Folder', action: emptyDeleted },
      { sep: true },
      { label: 'Find', key: 'F3', action: find },
      { sep: true },
      { label: 'Mark as Read', key: 'Ctrl+Q', action: () => { const m = selMsg(); if (m) setRead(m, true); } },
      { label: 'Mark as Unread', action: () => { const m = selMsg(); if (m) setRead(m, false); } },
      { label: 'Mark All Read', key: 'Ctrl+Shift+A', action: () => { inFolder(V.folder).forEach(m => { FR.state.readMail[m.id] = true; }); FR.save(); refresh(); } },
    ] },
    { label: 'View', items: () => [
      { label: 'Current View', disabled: true },
      { label: 'Sort By', disabled: true },
      { label: 'Columns...', disabled: true },
      { label: 'Layout...', disabled: true },
      { sep: true },
      { label: 'Preview Pane', checked: V.preview, action: () => { V.preview = !V.preview; layout(); } },
      { sep: true },
      { label: 'Refresh', key: 'F5', action: sendRecv },
    ] },
    { label: 'Tools', items: [
      { label: 'Send and Receive', key: 'Ctrl+M', action: sendRecv },
      { label: 'Synchronize All', disabled: true },
      { sep: true },
      { label: 'Address Book...', key: 'Ctrl+Shift+B', action: addressBook },
      { label: 'Add Sender to Address Book', disabled: true },
      { sep: true },
      { label: 'Message Rules', disabled: true },
      { label: 'Windows Messenger', disabled: true },
      { sep: true },
      { label: 'Accounts...', action: () => FR.dialog({ icon: 'info', title: 'Internet Accounts', message: '<b>mail.packacorp.com</b> (default)<br>Type: mail · Connection: Local Area Network<br>Account: frank.warmington<br><br>Mailbox: 249.9 MB of 250 MB' }) },
      { label: 'Options...', action: () => FR.dialog({ icon: 'info', title: 'Options', message: 'Check for new messages every <b>1</b> minute(s).<br>Play sound when new messages arrive: <b>Yes</b><br>Mark message read after displaying: <b>0</b> second(s)<br><br>Frank set these. Frank did not want to miss anything. Except, apparently, the last three days.' }) },
    ] },
    { label: 'Message', items: [
      { label: 'New Message', key: 'Ctrl+N', action: () => compose({}) },
      { sep: true },
      { label: 'Reply to Sender', key: 'Ctrl+R', action: () => { const m = selMsg(); if (m) replyTo(m, false); } },
      { label: 'Reply to All', key: 'Ctrl+Shift+R', action: () => { const m = selMsg(); if (m) replyTo(m, true); } },
      { label: 'Forward', key: 'Ctrl+F', action: () => { const m = selMsg(); if (m) forward(m); } },
      { label: 'Forward As Attachment', disabled: true },
      { sep: true },
      { label: 'Flag Message', disabled: true },
      { label: 'Block Sender...', action: () => { const m = selMsg(); if (!m) return; FR.dialog({ icon: 'warn', title: 'Outlook Express', message: m.from.email === P.diane.email ? 'You cannot block the CFO. Nobody can block the CFO.' : m.from.email === P.emily.email ? 'Frank already tried that. Twice. Emily is persistent, and honestly, she has a point.' : `${E(nameOf(m.from))} has been added to your blocked senders list. (Not really. It's Board night.)` }); } },
    ] },
    { label: 'Help', items: [
      { label: 'Contents and Index', key: 'F1', action: () => FR.dialog({ icon: 'info', title: 'Outlook Express Help', message: 'To read a message, click it. To reply, click Reply.<br>To find Frank, keep reading.' }) },
      { label: 'Read Me', action: () => { const m = SEED.find(x => x.id === 'm_welcome'); if (m) openMsg(m); } },
      { sep: true },
      { label: 'About Outlook Express', action: () => FR.dialog({ icon: 'info', title: 'About Outlook Express', message: '<b>Outlook Express 6</b><br>Version 6.00.2900.5512<br><br>This product is licensed to:<br>Frank Warmington<br>Packa Corporation' }) },
    ] },
  ];

  const selMsg = () => { const id = V.sel[V.folder]; const m = id && byId(id); return m && folderOf(m) === V.folder && !box().gone[m.id] ? m : null; };

  function openMain() {
    const ex = FR.wm.wins.get('outlook');
    if (ex) { FR.wm.open({ id: 'outlook' }); return ex; }
    catchUp();
    const el = $(`<div class="oe-app">
      <div class="oe-tb"></div>
      <div class="oe-fbar"><span class="oe-fbar-t">Inbox</span><span class="oe-fbar-id">Main Identity</span></div>
      <div class="oe-main">
        <div class="oe-left">
          <div class="oe-phd"><span>Folders</span><span class="oe-phd-x" title="Close">&#x2715;</span></div>
          <div class="oe-tree"></div>
          <div class="oe-hsplit oe-left-split"></div>
          <div class="oe-phd oe-phd-c"><span class="oe-cbtn">Contacts &#9662;</span><span class="oe-phd-x" title="Close">&#x2715;</span></div>
          <div class="oe-contacts"></div>
        </div>
        <div class="oe-vsplit"></div>
        <div class="oe-right">
          <div class="oe-list" tabindex="0"><table class="oe-tbl"><colgroup><col style="width:18px"><col style="width:18px"><col class="oe-col-from"><col><col style="width:130px"></colgroup>
            <thead><tr><th data-c="pri" title="Priority">${ico(SI.bang, 'oe-hbang')}</th><th data-c="att" title="Attachment">${ico(SI.clip)}</th><th data-c="from"><span class="oe-th-from">From</span></th><th data-c="subject">Subject</th><th data-c="t"><span class="oe-th-t">Received</span></th></tr></thead><tbody></tbody></table></div>
          <div class="oe-hsplit oe-prev-split"></div>
          <div class="oe-prev"></div>
          <div class="oe-start"></div>
        </div>
      </div>
    </div>`);
    const W = FR.wm.open({ id: 'outlook', title: 'Inbox - Outlook Express', icon: 'mail', width: 920, height: 620, className: 'oe-win', menu: menuMain(), content: el, statusBar: ['0 message(s), 0 unread', `<span class="oe-online">${ico(SI.root)} Working Online</span>`], onClose: () => { V.W = null; V.el = null; } });
    V.W = W; V.el = el;
    // toolbar
    const tb = el.querySelector('.oe-tb');
    const B = [
      ['create', 'Create Mail', () => compose({}), 'oe-tb-create'],
      '|',
      ['reply', 'Reply', () => { const m = selMsg(); if (m) replyTo(m, false); }, 'sel'],
      ['replyall', 'Reply All', () => { const m = selMsg(); if (m) replyTo(m, true); }, 'sel'],
      ['forward', 'Forward', () => { const m = selMsg(); if (m) forward(m); }, 'sel'],
      '|',
      ['print', 'Print', () => { const m = selMsg(); if (m) printMsg(m); }, 'sel'],
      ['del', 'Delete', () => { const m = selMsg(); if (m) moveToDeleted(m); }, 'sel'],
      '|',
      ['sendrecv', 'Send/Recv', sendRecv, 'drop'],
      '|',
      ['addresses', 'Addresses', addressBook],
      ['find', 'Find', find, 'drop'],
    ];
    B.forEach(b => {
      if (b === '|') { tb.appendChild($('<span class="oe-tb-sep"></span>')); return; }
      const btn = $(`<button class="oe-tbb ${b[3] === 'sel' ? 'oe-needsel' : ''} ${b[3] || ''}">${ico(TI[b[0]], 'oe-tbi')}<span class="oe-tbl-l">${b[1]}${b[3] === 'drop' ? ' <i class="oe-dd">&#9662;</i>' : ''}</span></button>`);
      btn.onclick = () => { if (!btn.disabled) b[2](); };
      tb.appendChild(btn);
    });
    el.querySelectorAll('.oe-phd-x').forEach(x => (x.onclick = () => FR.dialog({ icon: 'info', title: 'Outlook Express', message: 'Frank pinned this pane open with a sticky note that says <i>"DO NOT CLOSE. I will lose the Inbox again."</i>' })));
    el.querySelector('.oe-cbtn').onclick = () => compose({});
    // list header sort
    el.querySelectorAll('.oe-tbl th').forEach(th => (th.onclick = () => {
      const c = th.dataset.c; if (V.sort.col === c) V.sort.dir *= -1; else { V.sort.col = c; V.sort.dir = c === 't' ? -1 : 1; }
      renderList();
    }));
    const list = el.querySelector('.oe-list');
    list.addEventListener('keydown', e => {
      const rows = sorted(inFolder(V.folder)); if (!rows.length) return;
      let i = rows.findIndex(m => m.id === V.sel[V.folder]);
      if (e.key === 'ArrowDown') { i = Math.min(rows.length - 1, i + 1); select(rows[i]); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { i = Math.max(0, i - 1); select(rows[i]); e.preventDefault(); }
      else if (e.key === 'Delete') { const m = selMsg(); if (m) moveToDeleted(m); }
      else if (e.key === 'Enter') { const m = selMsg(); if (m) { e.preventDefault(); openRow(m); } }
      else if ((e.ctrlKey || e.metaKey) && /^[rfnaq]$/i.test(e.key)) {
        const m = selMsg(), k = e.key.toLowerCase();
        if (k === 'a' && !e.shiftKey) return;
        e.preventDefault();
        if (k === 'n') compose({}); else if (m && k === 'r') replyTo(m, e.shiftKey); else if (m && k === 'f') forward(m);
        else if (k === 'a') { inFolder(V.folder).forEach(x => { FR.state.readMail[x.id] = true; }); FR.save(); refresh(); }
        else if (m && k === 'q') setRead(m, true);
      }
    });
    // splitters
    drag(el.querySelector('.oe-vsplit'), (dx, dy, s) => { el.querySelector('.oe-left').style.width = Math.max(120, Math.min(400, s.w + dx)) + 'px'; }, () => ({ w: el.querySelector('.oe-left').offsetWidth }));
    drag(el.querySelector('.oe-prev-split'), (dx, dy, s) => { list.style.height = Math.max(60, s.h + dy) + 'px'; list.style.flex = 'none'; }, () => ({ h: list.offsetHeight }));
    drag(el.querySelector('.oe-left-split'), (dx, dy, s) => { el.querySelector('.oe-tree').style.height = Math.max(80, s.h + dy) + 'px'; el.querySelector('.oe-tree').style.flex = 'none'; }, () => ({ h: el.querySelector('.oe-tree').offsetHeight }));
    renderAll();
    setTimeout(() => list.focus(), 30);
    return W;
  }
  function drag(h, mv, start) {
    h.addEventListener('mousedown', e => {
      const sx = e.clientX, sy = e.clientY, s = start();
      const m = ev => mv(ev.clientX - sx, ev.clientY - sy, s);
      const up = () => { document.removeEventListener('mousemove', m); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', m); document.addEventListener('mouseup', up); e.preventDefault();
    });
  }

  function refresh() { if (V.el && V.el.isConnected) renderAll(); }
  function renderAll() { renderTree(); renderContacts(); renderList(); renderPreview(); layout(); status(); }
  function status() {
    if (!V.W) return;
    if (V.folder === 'root') { V.W.setStatus(0, ''); return; }
    const ms = inFolder(V.folder);
    V.W.setStatus(0, `${ms.length} message(s), ${ms.filter(m => !isRead(m)).length} unread`);
  }
  function layout() {
    const el = V.el; if (!el) return;
    const root = V.folder === 'root';
    el.querySelector('.oe-list').style.display = root ? 'none' : '';
    el.querySelector('.oe-prev').style.display = root || !V.preview ? 'none' : '';
    el.querySelector('.oe-prev-split').style.display = root || !V.preview ? 'none' : '';
    el.querySelector('.oe-start').style.display = root ? '' : 'none';
    el.querySelector('.oe-list').classList.toggle('oe-list-full', !V.preview);
    const f = FOLDERS.find(x => x.id === V.folder);
    const name = root ? 'Outlook Express' : f.name;
    el.querySelector('.oe-fbar-t').textContent = name;
    V.W && V.W.setTitle(root ? 'Outlook Express' : `${name} - Outlook Express`);
    el.querySelectorAll('.oe-needsel').forEach(b => (b.disabled = root || !selMsg()));
    const th = el.querySelector('.oe-th-from'), tt = el.querySelector('.oe-th-t');
    const outgoing = ['sent', 'outbox', 'drafts'].includes(V.folder);
    th.textContent = outgoing ? 'To' : 'From'; tt.textContent = outgoing ? 'Sent' : 'Received';
  }
  function renderTree() {
    const t = V.el.querySelector('.oe-tree');
    const u = FOLDERS.map(f => ({ f, n: unreadIn(f.id) }));
    t.innerHTML = `<div class="oe-tn oe-l0 ${V.folder === 'root' ? 'sel' : ''}" data-f="root">${ico(SI.root)}<span class="oe-tn-t">Outlook Express</span></div>
      <div class="oe-tn oe-l1" data-f="local"><span class="oe-tw">${V.localOpen ? '&minus;' : '+'}</span>${ico(SI.local)}<span class="oe-tn-t">Local Folders</span></div>
      ${V.localOpen ? u.map(({ f, n }) => `<div class="oe-tn oe-l2 ${V.folder === f.id ? 'sel' : ''}" data-f="${f.id}">${ico(f.icon)}<span class="oe-tn-t ${n ? 'oe-b' : ''}">${f.name}${n ? ` <span class="oe-cnt">(${n})</span>` : ''}</span></div>`).join('') : ''}`;
    t.querySelectorAll('.oe-tn').forEach(n => (n.onclick = e => {
      const f = n.dataset.f;
      if (f === 'local') { if (e.target.closest('.oe-tw')) { V.localOpen = !V.localOpen; renderTree(); } return; }
      V.folder = f; renderAll();
    }));
    const lf = t.querySelector('[data-f=local]'); lf.ondblclick = () => { V.localOpen = !V.localOpen; renderTree(); };
  }
  function renderContacts() {
    const c = V.el.querySelector('.oe-contacts');
    c.innerHTML = CONTACT_ORDER.map(k => `<div class="oe-ct" data-k="${k}" title="${E(P[k].email)}">${ico(SI.person)}<span>${E(P[k].name)}</span></div>`).join('');
    c.querySelectorAll('.oe-ct').forEach(r => {
      r.onclick = () => { c.querySelectorAll('.oe-ct').forEach(x => x.classList.remove('sel')); r.classList.add('sel'); };
      r.ondblclick = () => compose({ to: P[r.dataset.k].name });
    });
  }
  const sortKey = (m, c) => {
    const outgoing = ['sent', 'outbox', 'drafts'].includes(V.folder);
    if (c === 'from') return (outgoing ? namesOf(m.to) : nameOf(m.from)).toLowerCase();
    if (c === 'subject') return stripRe(m.subject).toLowerCase();
    if (c === 'pri') return -(m.pri || 0);
    if (c === 'att') return -((m.attach || []).length ? 1 : 0);
    return m.t;
  };
  const sorted = ms => ms.slice().sort((a, b) => {
    const x = sortKey(a, V.sort.col), y = sortKey(b, V.sort.col);
    return (x < y ? -1 : x > y ? 1 : b.t - a.t) * (x === y ? 1 : V.sort.dir);
  });
  function renderList() {
    if (!V.el) return;
    const tb = V.el.querySelector('.oe-tbl tbody');
    const outgoing = ['sent', 'outbox', 'drafts'].includes(V.folder);
    const ms = V.folder === 'root' ? [] : sorted(inFolder(V.folder));
    V.el.querySelectorAll('.oe-tbl th').forEach(th => th.classList.toggle('oe-sorted', th.dataset.c === V.sort.col));
    V.el.querySelectorAll('.oe-tbl th .oe-arr').forEach(a => a.remove());
    const sth = V.el.querySelector(`.oe-tbl th[data-c="${V.sort.col}"]`);
    if (sth && V.sort.col !== 'pri' && V.sort.col !== 'att') sth.insertAdjacentHTML('beforeend', `<span class="oe-arr">${V.sort.dir < 0 ? '&#9660;' : '&#9650;'}</span>`);
    tb.innerHTML = ms.length ? ms.map(m => {
      const r = isRead(m);
      const env = V.folder === 'drafts' ? SI.draft : outgoing ? SI.envSent : r ? SI.envOpen : SI.envClosed;
      return `<tr data-id="${m.id}" class="${r ? '' : 'oe-unread'} ${V.sel[V.folder] === m.id ? 'sel' : ''}">
        <td class="oe-c">${m.pri ? ico(SI.bang) : ''}</td><td class="oe-c">${(m.attach || []).length ? ico(SI.clip) : ''}</td>
        <td class="oe-from">${ico(env)}<span>${E(outgoing ? namesOf(m.to) : nameOf(m.from))}</span></td>
        <td>${E(m.subject || '(no subject)')}</td><td>${fmtShort(m.t)}</td></tr>`;
    }).join('') : `<tr class="oe-empty"><td colspan="5">There are no items in this view.</td></tr>`;
    if (!tb.dataset.wired) {
      tb.dataset.wired = '1';
      const rowMsg = e => { const tr = e.target.closest('tr[data-id]'); return tr && byId(tr.dataset.id); };
      let again = null;   // phones: tapping the selected message again opens it in its own window (no double-click)
      // (R3b S8) a narrow phone (320-360 px) has room for only a line or two of preview: one tap opens the message
      tb.addEventListener('mousedown', e => { const m = rowMsg(e); if (!m) return; e.preventDefault(); again = FR.mobile && (V.sel[V.folder] === m.id || innerWidth <= 360) ? m.id : null; if (V.sel[V.folder] !== m.id) select(m); else V.el.querySelector('.oe-list').focus({ preventScroll: true }); });
      tb.addEventListener('click', e => { const m = rowMsg(e); if (FR.mobile && m && again === m.id) openRow(m); again = null; });
      tb.addEventListener('dblclick', e => { if (FR.mobile) return; const m = rowMsg(e); if (m) openRow(m); });
    }
    renderStart();
  }
  const openRow = m => (folderOf(m) === 'drafts' ? compose({ to: namesOf(m.to), subject: m.subject, body: m.body, draftOf: m.id }) : openMsg(m));
  function select(m) {
    V.sel[V.folder] = m.id;
    if (!isRead(m)) { FR.state.readMail[m.id] = true; FR.save(); renderTree(); }
    const rows = V.el ? V.el.querySelectorAll('.oe-tbl tr[data-id]') : [];
    if (rows.length) rows.forEach(tr => { const own = tr.dataset.id === m.id; tr.classList.toggle('sel', own); if (own) tr.classList.remove('oe-unread'); });
    else renderList();
    renderPreview(); layout(); status();
    const tr = V.el.querySelector(`tr[data-id="${m.id}"]`); if (tr) tr.scrollIntoView({ block: 'nearest' });
    V.el.querySelector('.oe-list').focus({ preventScroll: true });
  }
  function hdrHTML(m, big) {
    const rows = [['From', m.from.email === ME.email ? nameOf(m.from) : `${nameOf(m.from)}`], ['Date', fmtLong(m.t)], ['To', namesOf(m.to)]];
    if (m.cc && m.cc.length) rows.push(['Cc', namesOf(m.cc)]);
    rows.push(['Subject', m.subject]);
    return rows.map(([k, v]) => `<div class="oe-hr"><b>${k}:</b> <span title="${k === 'From' ? E(m.from.email) : ''}">${E(v)}</span></div>`).join('') +
      ((m.attach || []).length ? `<div class="oe-hr oe-hr-att"><b>Attach:</b> <span class="oe-chips">${chipsHTML(m.attach)}</span></div>` : '');
  }
  function renderPreview() {
    if (!V.el) return;
    const p = V.el.querySelector('.oe-prev');
    const m = selMsg();
    if (!m) { p.innerHTML = '<div class="oe-pbody oe-pempty"></div>'; return; }
    p.innerHTML = `<div class="oe-ph">${hdrHTML(m)}</div><div class="oe-pbody">${renderBody(m)}</div>`;
    wireChips(p, m.attach || []); wireBody(p);
  }
  function renderStart() {
    const s = V.el.querySelector('.oe-start');
    if (V.folder !== 'root') return;
    const n = unreadIn('inbox');
    s.innerHTML = `<div class="oe-st-head">Outlook Express <span>for Frank Warmington</span></div>
      <div class="oe-st-cols"><div class="oe-st-col">
        <div class="oe-st-sec">E-mail</div>
        <a class="oe-st-a" data-a="read">${ico(SI.envClosed)}<span>There ${n === 1 ? 'is' : 'are'} <b>${n} unread Mail message${n === 1 ? '' : 's'}</b> in your Inbox</span></a>
        <a class="oe-st-a" data-a="new">${ico(TI.create)} Create a new Mail message</a>
        <a class="oe-st-a" data-a="read">${ico(SI.inbox)} Read Mail</a>
        <div class="oe-st-sec">Contacts</div>
        <a class="oe-st-a" data-a="ab">${ico(SI.book)} Open the Address Book...</a>
        <a class="oe-st-a" data-a="find">${ico(TI.find)} Find People...</a>
      </div><div class="oe-st-tip"><div class="oe-st-tip-h">Tip of the day</div><p>You can sort messages by clicking any column heading. Clicking <b>Received</b> once puts the oldest mail first, which is where most clues hide.</p><p class="oe-st-tip-n">Next &#9658;</p></div></div>`;
    s.querySelectorAll('.oe-st-a').forEach(a => (a.onclick = () => {
      const k = a.dataset.a;
      if (k === 'read') { V.folder = 'inbox'; renderAll(); } else if (k === 'new') compose({}); else if (k === 'ab') addressBook(); else find();
    }));
  }
  function props() {
    const m = selMsg(); if (!m) return;
    FR.dialog({ icon: 'info', title: m.subject, message: `<b>${E(m.subject)}</b><br><br>From: ${E(fullOf(m.from))}<br>Received: ${E(fmtLong(m.t))}<br>Type: Mail Message<br>Size: ${Math.max(1, Math.round(bodyText(m).length / 900))} KB<br>Attachments: ${(m.attach || []).length || 'None'}` });
  }
  function emptyDeleted() {
    FR.dialog({ icon: 'warn', title: 'Outlook Express', message: 'Are you sure you want to permanently delete all messages in the \'Deleted Items\' folder?', buttons: ['Yes', 'No'] }).then(r => {
      if (r.button !== 'Yes') return;
      inFolder('deleted').forEach(m => { box().gone[m.id] = true; }); FR.save(); refresh();
    });
  }
  function sendRecv() {
    if (!V.W) return;
    FR.sound.play('click');
    V.W.setStatus(1, `<span class="oe-online">${ico(TI.sendrecv)} Checking for new messages on 'mail.packacorp.com'...</span>`);
    setTimeout(() => {
      if (!V.W) return;
      catchUp();
      V.W.setStatus(1, `<span class="oe-online">${ico(SI.root)} Working Online</span>`);
      status();
    }, 1400);
  }
  function find() {
    FR.dialog({ icon: 'question', title: 'Find Message', message: 'Search all Local Folders.', input: { label: 'Look for:', type: 'text' }, buttons: ['Find Now', 'Cancel'] }).then(r => {
      if (r.button !== 'Find Now' || !r.value || !r.value.trim()) return;
      const q = r.value.trim().toLowerCase();
      const hits = sorted(all().filter(m => (m.subject + ' ' + nameOf(m.from) + ' ' + namesOf(m.to) + ' ' + bodyText(m)).toLowerCase().includes(q)));
      if (!hits.length) return FR.dialog({ icon: 'info', title: 'Find Message', message: `There are no messages that match "${E(r.value)}".` });
      const m = hits[0]; V.folder = folderOf(m); V.sel[V.folder] = m.id; renderAll(); select(m);
      if (hits.length > 1 && V.W) V.W.setStatus(0, `Found ${hits.length} message(s) containing "${E(r.value)}" — showing the newest.`);
    });
  }

  /* ================= message window ================= */
  function openMsg(m) {
    setRead(m, true);
    const id = 'oe-msg-' + m.id;
    if (FR.wm.wins.get(id)) return FR.wm.open({ id });
    // phones: one message window at a time (it replaces the one before), so windows don't pile up
    if (FR.mobile) [...FR.wm.wins.values()].filter(v => /^oe-msg-/.test(v.id)).forEach(v => v.close());
    const el = $(`<div class="oe-app oe-mw"><div class="oe-tb"></div><div class="oe-mh">${hdrHTML(m, true)}</div><div class="oe-pbody oe-mbody">${renderBody(m)}</div></div>`);
    const w = FR.wm.open({ id, title: m.subject || '(no subject)', icon: 'eml', width: 680, height: 520, className: 'oe-win', content: el,
      menu: [
        { label: 'File', items: [{ label: 'Print...', action: () => printMsg(m) }, { label: 'Properties', disabled: true }, { sep: true }, { label: 'Close', action: () => w.close() }] },
        { label: 'Edit', items: [{ label: 'Copy', action: () => document.execCommand('copy') }, { label: 'Delete', action: () => { moveToDeleted(m); w.close(); } }] },
        { label: 'View', items: [{ label: 'Next', disabled: true }, { label: 'Previous', disabled: true }] },
        { label: 'Tools', items: [{ label: 'Address Book...', action: addressBook }] },
        { label: 'Message', items: [{ label: 'Reply to Sender', action: () => replyTo(m, false) }, { label: 'Reply to All', action: () => replyTo(m, true) }, { label: 'Forward', action: () => forward(m) }] },
        { label: 'Help', items: [{ label: 'About Outlook Express', action: () => FR.dialog({ icon: 'info', title: 'About Outlook Express', message: '<b>Outlook Express 6</b><br>Version 6.00.2900.5512' }) }] },
      ] });
    const tb = el.querySelector('.oe-tb');
    // (R3b S8) phones: a clear way back to the list, first in the toolbar
    if (FR.mobile) { const bk = $(`<button class="oe-tbb oe-tbb-back">${FR.icon('back', 20)}<span class="oe-tbl-l">Inbox</span></button>`); bk.onclick = () => w.close(); tb.appendChild(bk); }
    [['reply', 'Reply', () => replyTo(m, false)], ['replyall', 'Reply All', () => replyTo(m, true)], ['forward', 'Forward', () => forward(m)], '|', ['print', 'Print', () => printMsg(m)], ['del', 'Delete', () => { moveToDeleted(m); w.close(); }], '|', ['prev', 'Previous', () => step(-1)], ['next', 'Next', () => step(1)], '|', ['addresses', 'Addresses', addressBook]].forEach(b => {
      if (b === '|') { tb.appendChild($('<span class="oe-tb-sep"></span>')); return; }
      const btn = $(`<button class="oe-tbb">${ico(TI[b[0]], 'oe-tbi')}<span class="oe-tbl-l">${b[1]}</span></button>`); btn.onclick = b[2]; tb.appendChild(btn);
    });
    function step(d) {
      const f = folderOf(m); const rows = sorted(inFolder(f)); const i = rows.findIndex(x => x.id === m.id);
      const n = rows[i + d]; if (!n) { FR.sound.play('ding'); return; }
      w.close(); openMsg(n);
    }
    wireChips(el, m.attach || []); wireBody(el);
    return w;
  }

  /* ================= address book ================= */
  function addressBook() {
    if (FR.wm.wins.get('oe-ab')) return FR.wm.open({ id: 'oe-ab' });
    const el = $(`<div class="oe-app oe-ab"><div class="oe-tb"></div><div class="oe-ab-list"><table class="oe-tbl"><thead><tr><th>Name</th><th>E-Mail Address</th><th>Business Phone</th><th>Title</th></tr></thead><tbody>
      ${CONTACT_ORDER.map(k => `<tr data-k="${k}"><td class="oe-from">${ico(SI.person)}<span>${E(P[k].name)}</span></td><td>${E(P[k].email)}</td><td>${E(P[k].phone)}</td><td>${E(P[k].title)}</td></tr>`).join('')}
      </tbody></table></div></div>`);
    const w = FR.wm.open({ id: 'oe-ab', title: 'Address Book - Main Identity', icon: 'user', width: 640, height: 380, className: 'oe-win', content: el, statusBar: [`${CONTACT_ORDER.length} item(s)`],
      menu: [{ label: 'File', items: [{ label: 'Close', action: () => w.close() }] }, { label: 'Edit', items: [{ label: 'Select All', disabled: true }] }, { label: 'View', items: [{ label: 'Details', checked: true }] }, { label: 'Tools', items: [{ label: 'Options', disabled: true }] }, { label: 'Help', items: [{ label: 'About Address Book', disabled: true }] }] });
    const tb = el.querySelector('.oe-tb');
    let sel = null;
    [['newc', 'New', () => FR.dialog({ icon: 'info', title: 'Address Book', message: 'Frank has not added a new contact since 2019. He is not about to start now.' })], ['create', 'Action', () => { if (sel) compose({ to: P[sel].name }); else compose({}); }], '|', ['del', 'Delete', () => FR.dialog({ icon: 'warn', title: 'Address Book', message: 'You can\'t delete people from Frank\'s life. Well, you can. But not tonight.' })], ['find', 'Find People', find]].forEach(b => {
      if (b === '|') { tb.appendChild($('<span class="oe-tb-sep"></span>')); return; }
      const btn = $(`<button class="oe-tbb">${ico(TI[b[0]], 'oe-tbi')}<span class="oe-tbl-l">${b[1]}</span></button>`); btn.onclick = b[2]; tb.appendChild(btn);
    });
    el.querySelectorAll('tr[data-k]').forEach(tr => {
      tr.onclick = () => { el.querySelectorAll('tr').forEach(x => x.classList.remove('sel')); tr.classList.add('sel'); sel = tr.dataset.k; };
      tr.ondblclick = () => compose({ to: P[tr.dataset.k].name });
    });
  }

  /* ================= compose ================= */
  const KNOWN = Object.values(P).concat([ME, FRANK_OFFGRID]);
  function resolve(tok) {
    tok = tok.trim(); if (!tok) return null;
    const em = (tok.match(/<([^>]+)>/) || [])[1] || (/@/.test(tok) ? tok.replace(/^"|"$/g, '') : null);
    if (em) { const e = em.trim().toLowerCase(); return KNOWN.find(p => p.email === e) || { name: '', email: e }; }
    const t = tok.replace(/"/g, '').toLowerCase();
    if (t === 'frank' || t === 'frank warmington' || t === 'me') return ME;
    const hit = Object.values(P).find(p => p.name.toLowerCase() === t) || Object.values(P).find(p => p.name.toLowerCase().split(' ').includes(t)) || Object.values(P).find(p => p.name.toLowerCase().startsWith(t) && t.length >= 3);
    return hit || { unresolved: tok };
  }
  const parseList = s => String(s || '').split(/[;,]/).map(resolve).filter(Boolean);
  const isDiane = a => a && a.email === P.diane.email;
  const packReady = () => FR.puzzle.isUnlocked('send') || FR.puzzle.isSolved('send');
  let ccount = 0;

  function compose(o) {
    const id = 'oe-new-' + (++ccount);
    const el = $(`<div class="oe-app oe-cw">
      <div class="oe-tb"></div>
      <div class="oe-cf">
        <div class="oe-cr"><button class="oe-cl" data-f="to">${ico(SI.book)} To:</button><input class="oe-to" spellcheck="false"></div>
        <div class="oe-cr"><button class="oe-cl" data-f="cc">${ico(SI.book)} Cc:</button><input class="oe-cc" spellcheck="false"></div>
        <div class="oe-cr"><span class="oe-cl oe-cl-s">Subject:</span><input class="oe-subj" spellcheck="false"></div>
        <div class="oe-cr oe-cr-att" style="display:none"><span class="oe-cl oe-cl-s">Attach:</span><div class="oe-chips oe-catt"></div></div>
      </div>
      <div class="oe-packbar" style="display:none">${FR.icon('info', 16)}<span>The Board Pack has been attached automatically: FY27 budget (Board copy), Q3 covenant certificate, 13-week REAL cash forecast, Q3 EBITDA bridge and FOR THE BOARD emergency plan.</span></div>
      <div class="oe-fmt"><select><option>Arial</option><option>Tahoma</option><option>Times New Roman</option><option>Courier New</option></select><select class="oe-fs"><option>10</option><option>12</option><option>14</option></select><span class="oe-fmt-sep"></span><button class="oe-fb"><b>B</b></button><button class="oe-fb"><i>I</i></button><button class="oe-fb"><u>U</u></button><button class="oe-fb oe-fb-a">A</button></div>
      <textarea class="oe-body" spellcheck="false"></textarea>
    </div>`);
    const $to = el.querySelector('.oe-to'), $cc = el.querySelector('.oe-cc'), $sub = el.querySelector('.oe-subj'), $body = el.querySelector('.oe-body');
    $to.value = o.to || ''; $cc.value = o.cc || ''; $sub.value = o.subject || ''; $body.value = o.body || '';
    let userAtt = (o.attach || []).slice();
    let dirty = false, forced = false, sent = false;
    const w = FR.wm.open({ id, title: o.subject || 'New Message', icon: 'mail', width: 640, height: 500, className: 'oe-win', content: el, statusBar: [''],
      menu: [
        { label: 'File', items: [{ label: 'Send Message', key: 'Alt+S', action: () => doSend() }, { label: 'Save', key: 'Ctrl+S', action: () => saveDraft(true) }, { sep: true }, { label: 'Close', action: () => w.close() }] },
        { label: 'Edit', items: [{ label: 'Undo', action: () => document.execCommand('undo') }, { sep: true }, { label: 'Cut', action: () => document.execCommand('cut') }, { label: 'Copy', action: () => document.execCommand('copy') }, { label: 'Paste', action: () => document.execCommand('paste') }] },
        { label: 'View', items: [{ label: 'All Headers', disabled: true }] },
        { label: 'Insert', items: [{ label: 'File Attachment...', action: () => attachDlg() }, { label: 'Signature', action: () => { $body.value += FRANK_SIG; } }] },
        { label: 'Format', items: [{ label: 'Rich Text (HTML)', disabled: true }, { label: 'Plain Text', checked: true }] },
        { label: 'Tools', items: [{ label: 'Check Names', key: 'Ctrl+K', action: () => checkNames() }, { label: 'Spelling...', key: 'F7', action: spelling }] },
        { label: 'Message', items: [{ label: 'Set Priority', disabled: true }] },
        { label: 'Help', items: [{ label: 'About Outlook Express', disabled: true }] },
      ],
      onClose: () => {
        if (sent || forced || !dirty) return true;
        FR.dialog({ icon: 'question', title: 'New Message', message: 'Do you want to save changes to this message?', buttons: ['Yes', 'No', 'Cancel'] }).then(r => {
          if (r.button === 'Cancel') return;
          if (r.button === 'Yes') saveDraft(false);
          forced = true; w.close();
        });
        return false;
      } });
    [$to, $cc, $sub, $body].forEach(i => i.addEventListener('input', () => { dirty = true; update(); }));
    $sub.addEventListener('input', () => w.setTitle($sub.value || 'New Message'));
    el.querySelectorAll('.oe-cl[data-f]').forEach(b => (b.onclick = () => pick(b.dataset.f === 'to' ? $to : $cc)));
    const tb = el.querySelector('.oe-tb');
    [['send', 'Send', () => doSend(), 'oe-tbb-send'], '|', ['cut', 'Cut', () => document.execCommand('cut')], ['copy', 'Copy', () => document.execCommand('copy')], ['paste', 'Paste', () => document.execCommand('paste')], ['undo', 'Undo', () => document.execCommand('undo')], '|', ['check', 'Check', () => checkNames()], ['spell', 'Spelling', spelling], '|', ['attach', 'Attach', () => attachDlg()], ['priority', 'Priority', () => { el.classList.toggle('oe-hipri'); w.setStatus(0, el.classList.contains('oe-hipri') ? 'This message will be sent with High Priority.' : ''); }, 'drop']].forEach(b => {
      if (b === '|') { tb.appendChild($('<span class="oe-tb-sep"></span>')); return; }
      const btn = $(`<button class="oe-tbb ${b[3] || ''}" data-a="${b[0]}">${ico(TI[b[0]], 'oe-tbi')}<span class="oe-tbl-l">${b[1]}${b[3] === 'drop' ? ' <i class="oe-dd">&#9662;</i>' : ''}</span></button>`); btn.onclick = b[2]; tb.appendChild(btn);
    });
    const toDiane = () => parseList($to.value).concat(parseList($cc.value)).some(isDiane);
    const withPack = () => toDiane() && packReady();
    const atts = () => (withPack() ? PACK.filter(p => !userAtt.some(u => u.name === p.name)) : []).concat(userAtt);
    function update() {
      const a = atts();
      el.querySelector('.oe-cr-att').style.display = a.length ? '' : 'none';
      el.querySelector('.oe-packbar').style.display = withPack() ? '' : 'none';
      const c = el.querySelector('.oe-catt'); c.innerHTML = chipsHTML(a); wireChips(c, a);
      // (R3b S16) phones: the short attachment box scrolls, so its label says how many files there are
      if (FR.mobile) el.querySelector('.oe-cr-att .oe-cl-s').textContent = a.length > 1 ? `Attach (${a.length} files):` : 'Attach:';
    }
    function pick(input) {
      FR.dialog({ icon: 'user', title: 'Select Recipients', message: 'Type name or select from list:<br><br>' + CONTACT_ORDER.map(k => `<label class="oe-pick"><input type="checkbox" value="${k}"> ${E(P[k].name)} <span>(${E(P[k].email)})</span></label>`).join(''), buttons: ['OK', 'Cancel'], width: 420 }).then(r => {});
      // wire checkboxes after dialog renders
      setTimeout(() => {
        const dlg = [...document.querySelectorAll('.fr-dialog')].pop(); if (!dlg) return;
        const ok = dlg.querySelector('.fr-dlg-btns button');
        const orig = ok.onclick;
        ok.onclick = () => {
          const names = [...dlg.querySelectorAll('.oe-pick input:checked')].map(i => P[i.value].name);
          if (names.length) { input.value = (input.value.trim() ? input.value.replace(/[;,\s]*$/, '') + '; ' : '') + names.join('; '); dirty = true; update(); }
          orig && orig();
        };
      }, 0);
    }
    function checkNames() {
      const bad = [];
      [$to, $cc].forEach(i => {
        const r = parseList(i.value);
        r.forEach(x => x.unresolved && bad.push(x.unresolved));
        i.value = r.map(x => x.unresolved ? x.unresolved : (x.name || x.email)).join('; ');
      });
      if (bad.length) FR.dialog({ icon: 'warn', title: 'Check Names', message: `Outlook Express could not match "${E(bad[0])}" to a name in the Address Book. Type a full e-mail address, or check the spelling.` });
      update(); return !bad.length;
    }
    function spelling() { FR.dialog({ icon: 'info', title: 'Spelling', message: 'Spelling cannot be checked because no spelling checker is installed on this computer. Frank uninstalled it after it underlined "EBITDA" for the thousandth time.' }); }
    function attachDlg() {
      FR.dialog({ icon: 'question', title: 'Insert Attachment', message: 'Look in: <b>My Documents</b>', input: { label: 'File name:', type: 'text' }, buttons: ['Attach', 'Cancel'] }).then(r => {
        if (r.button !== 'Attach' || !r.value || !r.value.trim()) return;
        const nm = r.value.trim().replace(/^.*[\\/]/, '');
        const node = FR.fs && FR.fs.nodes.find(n => n.type === 'file' && n.name.toLowerCase() === nm.toLowerCase());
        if (!node) return FR.dialog({ icon: 'error', title: 'Insert Attachment', message: `${E(nm)}<br>File not found. Please verify the correct file name was given.` });
        userAtt.push({ name: node.name, size: node.size, file: node.id }); dirty = true; update();
      });
    }
    function saveDraft(notice) {
      const b = box();
      if (o.draftOf) b.gone[o.draftOf] = true;
      const d = { id: newId('d'), folder: 'drafts', from: ME, to: parseList($to.value).filter(x => !x.unresolved), cc: [], subject: $sub.value, body: $body.value, t: FR.clock.now().getTime(), read: true, attach: userAtt.slice() };
      if (!d.to.length && $to.value.trim()) d.to = [{ name: $to.value.trim(), email: '' }];
      b.extra.push(d); o.draftOf = d.id; FR.save(); dirty = false; refresh();
      if (notice) FR.dialog({ icon: 'info', title: 'Saved Message', message: 'Your message has been saved in your \'Drafts\' folder.' });
    }
    async function doSend() {
      const to = parseList($to.value), cc = parseList($cc.value);
      const rcpt = to.concat(cc);
      if (!to.length) return FR.dialog({ icon: 'warn', title: 'Send Message', message: 'The message must have at least one recipient. Please put an e-mail address or a Contact name in the To box.' });
      const bad = rcpt.find(x => x.unresolved);
      if (bad) return FR.dialog({ icon: 'error', title: 'Send Message', message: `The message could not be sent. Outlook Express could not find "${E(bad.unresolved)}" in the Address Book.<br><br>Type a full e-mail address (for example diane.kessler@packacorp.com).` });
      if (!$sub.value.trim()) {
        const r = await FR.dialog({ icon: 'question', title: 'Outlook Express', message: 'This message does not have a subject. Do you want to send it anyway?', buttons: ['Yes', 'No'] });
        if (r.button !== 'Yes') return;
      }
      const hasPack = withPack();
      let body = $body.value;
      if (hasPack && !FR.puzzle.isSolved('send')) {
        const block = `--- Board Pack (Oct 20) ---\n1. FY27 Budget, Board copy (approved v5): EBITDA $3,130K\n2. Q3 Covenant Certificate: DSCR 1.25x (Section 6.1)\n3. 13-week REAL cash: minimum liquidity breach in week 5 (runway 43 days, not 182)\n4. Q3 EBITDA bridge: closes (Freight \u2212$40K)\n5. FOR THE BOARD: Frank's emergency plan (funding need $2,414K, request $4.0M survival facility)\n`;
        const qi = body.indexOf('----- Original Message -----');
        body = qi >= 0 ? (body.slice(0, qi).replace(/\s+$/, '') + '\n\n' + block + '\n' + body.slice(qi)).replace(/^\s+/, '') : body.replace(/\s+$/, '') + '\n\n' + block;
      }
      const m = { id: newId('s'), folder: 'sent', from: ME, to: to, cc: cc, subject: $sub.value || '(no subject)', body, t: FR.clock.now().getTime(), read: true, attach: atts(), pri: el.classList.contains('oe-hipri') ? 1 : 0 };
      if (o.draftOf) box().gone[o.draftOf] = true;
      sent = true;
      addMsg(m, false);
      w.close();
      FR.sound.play('click');
      afterSend(m, rcpt, hasPack);
    }
    el.addEventListener('keydown', e => {
      if (((e.ctrlKey || e.metaKey) && e.key === 'Enter') || (e.altKey && /^s$/i.test(e.key))) { e.preventDefault(); doSend(); }
      else if ((e.ctrlKey || e.metaKey) && /^s$/i.test(e.key)) { e.preventDefault(); saveDraft(true); }
      else if ((e.ctrlKey || e.metaKey) && /^k$/i.test(e.key)) { e.preventDefault(); checkNames(); }
    });
    update();
    setTimeout(() => {
      const f = $to.value ? $body : $to; f.focus();
      if (f === $body && o.body) { try { $body.setSelectionRange(0, 0); } catch (e) {} $body.scrollTop = 0; }
    }, 40);
    return w;
  }

  /* ================= auto replies ================= */
  const reSub = s => 'Re: ' + stripRe(s);
  const OOO = {
    [P.drew.email]: s => ({ from: P.drew, subject: 'AUTO-REPLY: ' + s, body: `AUTO-REPLY. I AM IN LAS VEGAS ON COMPANY BUSINESS. THE BUSINESS IS FRANK.\n\nFor budget questions, contact Frank Warmington.\nFor questions about Frank, also contact Frank Warmington.\nFor questions about my Porsche, do not touch my Porsche.\n\nMAKE IT WORK.\n\nDREW HOLLIS\nVP FINANCE` }),
    [P.karen.email]: s => ({ from: P.karen, subject: 'Out of Office: ' + s, body: `I'm on the plant floor through third shift and I don't read e-mail on the plant floor, because forklifts.\n\nIf something is on fire, call ext. 214. If something is merely late, it can wait until morning.\n\nKaren Wills\nVP Operations` }),
    [P.tom.email]: s => ({ from: P.tom, subject: 'Out of Office: ' + s, body: `I'm visiting customers in Joplin and Springfield through Friday with limited access to e-mail.\n\nThe FY27 sales plan is $40.0M and it is locked. If you are writing to unlock it: no.\n\nTom Bracken\nSales Manager` }),
    [P.steve.email]: s => ({ from: P.steve, subject: 'Re: ' + stripRe(s), body: `Hi, this is Linda at the front desk. Steve doesn't read e-mail after 6 PM. He also doesn't read e-mail before 6 PM. I print them for him in the morning.\n\nIf it's urgent, please call the front office after 7:30 AM.\n\nLinda, on behalf of Steve Packa` }),
    [P.joshua.email]: s => ({ from: P.joshua, subject: reSub(s), body: `Wait. Who is this?\n\nFrank's computer is e-mailing me while I'm in Vegas looking for Frank. If this is Frank: CALL DIANE. If this isn't Frank: his checklist is on the desktop. Work through it in order.\n\nSix years. I work with Frank. I don't understand Frank. Good luck.\n\nJosh` }),
    [P.rachel.email]: s => ({ from: P.rachel, subject: reSub(s), body: `FRANK!!! ♥♥ Mīļais!! You're alive!!!\n\n...wait. Frank never writes to me first. Who is this?? Are you on his computer?? Is HE there with you?? You know who I mean. The one with the cheat sheets.\n\nIf you see Frank, tell him I still have the birthday card. The coaster one. Paldies.\n\nR ♥` }),
    [P.emily.email]: s => ({ from: P.emily, subject: reSub(s), body: `Hi! Whoever you are on Frank's computer: thank you for doing this.\n\nI started to explain to Drew what I would do differently with the cash file and he took my phone.\n\nI'll write later. From Joshua's phone, probably.\n\nEmily${SIG.emily}` }),
    [P.marcus.email]: s => ({ from: P.marcus, subject: reSub(s), body: `Frank,\n\nThank you. The credit committee will only accept the Board Pack from the CFO's office, complete. Please route the full package through Diane Kessler.\n\nRegards,${SIG.marcus}` }),
    [P.helpdesk.email]: s => ({ from: P.helpdesk, subject: 'Ticket #40177 received: ' + stripRe(s), body: `Thank you for contacting the IT Helpdesk. Your ticket #40177 has been created.\n\nCurrent queue position: 38.\nEstimated response time: next business week.\n\nPacka IT` }),
    [P.ozark.email]: s => ({ from: POSTMASTER, subject: 'Undeliverable: ' + stripRe(s), body: ndr(P.ozark.email, 'The recipient does not accept replies. This is a no-reply mailbox.', '#5.7.1') }),
    [FRANK_OFFGRID.email]: s => ({ from: FRANK_OFFGRID, subject: reSub(s), body: `Busy. Quarterfinal in 20 minutes. Kristians says labdien.\n\n—F` }),
  };
  const WON = {
    [P.joshua.email]: s => ({ from: P.joshua, subject: reSub(s), body: `Diane says you did it. Whoever you are. I don't understand you either.\n\nJosh` }),
    [P.marcus.email]: s => ({ from: P.marcus, subject: reSub(s), body: `Received with thanks. Diane has already sent the full pack.\n\nRegards,${SIG.marcus}` }),
    [P.emily.email]: s => ({ from: P.emily, subject: reSub(s), body: `We're at the team qualifier. I started to explain to Drew what I would do differently with the cash file and he took my phone.\n\nDiane says the pack ties. All of it. From the same numbers. I have a slide about this.\n\nEmily${SIG.emily}` }),
  };
  function ndr(addr, reason, code) {
    return `Your message did not reach some or all of the intended recipients.\n\n      Sent: ${fmtLong(FR.clock.now().getTime())}\n\nThe following recipient(s) could not be reached:\n\n      ${addr}\n            ${reason}\n            <PACKA-EXCH01.packacorp.local ${code}>`;
  }
  function afterSend(m, rcpt, hasPack) {
    const s = m.subject;
    const seen = new Set();
    rcpt.forEach(r => {
      if (!r.email || seen.has(r.email)) return; seen.add(r.email);
      const e = r.email;
      if (e === P.diane.email) {
        if (hasPack && !FR.puzzle.isSolved('send')) { FR.puzzle.solve('send'); return; }
        if (FR.puzzle.isSolved('send')) {
          return setTimeout(() => incoming({ from: P.diane, subject: reSub(s), body: `Received. Again. I have the pack, the bank has the pack, the Board has the pack.\n\nNow find Frank.\n\nDiane` }), 3000);
        }
        return setTimeout(() => incoming({ from: P.diane, subject: reSub(s), body: `That's not the pack. The pack is complete when everything on Frank's checklist is done. Not before.\n\nDiane` }), 3000);
      }
      if (e === ME.email) {
        return setTimeout(() => incoming({ from: POSTMASTER, subject: 'Undeliverable: ' + s, body: ndr(ME.email, "The recipient's mailbox is full and can't accept messages now. Mailbox full.", '#5.2.2') }), 2500);
      }
      if (FR.puzzle.isSolved('send') && WON[e]) return setTimeout(() => incoming(WON[e](s)), 3000 + Math.random() * 1500);
      if (OOO[e]) {
        if (e === FRANK_OFFGRID.email && !FR.puzzle.isSolved('frank')) return setTimeout(() => incoming({ from: POSTMASTER, subject: 'Undeliverable: ' + s, body: ndr(e, 'The recipient\'s mailbox is out of range. (Hint: so is the recipient.)', '#5.4.0') }), 2500);
        return setTimeout(() => incoming(OOO[e](s)), 3000 + Math.random() * 1500);
      }
      if (/@packacorp\.com$/.test(e) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
        return setTimeout(() => incoming({ from: POSTMASTER, subject: 'Undeliverable: ' + s, body: ndr(e, 'The e-mail account does not exist at the organization this message was sent to. Check the e-mail address, or contact the recipient directly to find out the correct address.', '#5.1.1') }), 2500);
      }
      // external, unknown: silence (it's midnight in Missouri)
    });
  }

  /* ================= public ================= */
  FR.apps.mail = node => {
    if (node) {
      const n = typeof node === 'string' ? (FR.fs.get(node) || { id: node }) : node;
      const m = byId(n.mailId || n.id);
      if (m) return openMsg(m);
    }
    return openMain();
  };
  FR.mail = { deliver: key => deliverKey(key, true), incoming, open: id => { const m = byId(id); if (m) openMsg(m); }, compose, catchUp, messages: all };
})();
