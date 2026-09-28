# FRANK'S COMPUTER — canonical game spec (single source of truth)

Browser game: the player is logged into missing FP&A Director Frank Warmington's Windows XP computer at
Packa Corporation (Sedalia, MO — packaging manufacturer, www.packacorp.com). Goal: assemble the Board Pack
so Prairie Ledger Bank (FICTIONAL) releases a $4.0M "survival package" (rescue credit facility) at the
Board meeting, Fri Oct 9 2026 9:00 AM. Game clock starts Thu Oct 8 2026 11:47 PM.
Packa does NOT use Datarails: every number lives in Frank's scattered files and Frank's head. That's the joke.
Audience: FP&A professionals; puzzles are intermediate. All money in $K unless stated.

## People (use exactly)
- Frank Warmington — Director of FP&A (missing since Tue Oct 6). email frank.warmington@packacorp.com
- Diane Kessler — CFO. diane.kessler@packacorp.com (Board-pack requester, precise, dry)
- Steve Packa — President. steve.packa@packacorp.com
- Karen Wills — VP Operations. karen.wills@packacorp.com
- Tom Bracken — Sales Manager. tom.bracken@packacorp.com
- Drew Hollis — VP Finance, Frank's boss, wears a cowboy hat, loud. drew.hollis@packacorp.com
- Joshua Reyes — FP&A Analyst, Frank's colleague. joshua.reyes@packacorp.com
- Rachel Moss — Payroll & HR coordinator, secretly in love with Frank (hearts, over-friendly). rachel.moss@packacorp.com
- Emily Carter — Account Executive at Datarails, keeps emailing Frank about FinanceOS; Frank ignores/deletes. emily.carter@datarails.com
- Prairie Ledger Bank — Marcus Hale, Relationship Manager. m.hale@prairieledgerbank.com (fictional)
- Ozark Kraft Mills — containerboard supplier (fictional). billing@ozarkkraftmills.com

## Checklist (quest log) — ids, order, answers. Items unlock in order.
| id | title | how solved | answer / accept |
|---|---|---|---|
| login | Get into Frank's computer | login screen password | `ohio1958` (normalize: lowercase, strip spaces/punct; also accept `ohioavenue1958`, `ohioave1958`) |
| version | Identify the budget version Diane approved | checklist input (filename) | normalized contains `v5finaluse` → Budget_FY27_v5_FINAL_USE_THIS.xls |
| unlock | Unlock the Board copy of the budget | Excel password dialog on Budget_FY27_BOARD.xls | `24002006` |
| ebitda | Repair FY27 EBITDA in the Board copy | type a formula/value into the #REF! cell in Excel (value 3130 ±0.5) OR checklist input | 3130 |
| dscr | Prove the bank covenant (DSCR) | checklist input | 1.25 (accept 1.24–1.26, "1.25x") |
| cash | Find the week cash breaches the $250K minimum | checklist input | 9 (accept "9", "week 9", "wk 9", "w9") |
| bridge | Close the Q3 EBITDA bridge: Freight variance ($K) | checklist input | -40 (accept -40, 40, (40), -40k) |
| send | Send the Board Pack to Diane | Outlook compose to diane → Send (auto) | — |
| frank | Where is Frank? | checklist input | "las vegas" / "vegas" / "lv" / "las" |

Normalize for text answers: lowercase, remove spaces, remove $ , k x ( ) → treat "(40)" as -40.

## Puzzle 1 — login (website: About page, existing)
User tile "Frank Warmington". Hint (the "?" button, XP-style balloon): "The other Frank's street + the year it all began".
After 3 wrong tries: extra line "Hint: Read our story. Not my story — Walter's." Answer ohio1958.
(About page: Walter's brother Frank ran the hardware store on Ohio Avenue; company founded 1958.)

## Puzzle 2 — which budget is final (My Documents\FY27 Budget)
Diane's email (Tue Oct 6, subj "Re: FY27 budget — which one??") criteria:
 1. carries every person on our payroll — "the same headcount we brag about on our own website" (=118)
 2. gross margin exactly 22.0% (what she promised the bank)
 3. includes the 2024 warehouse expansion lease "at $6.00 per square foot per year" on top of the existing $180K
    plant lease (website About timeline: 2024 added 40,000 sq ft → $240K → Rent & leases = 420)
Files (all revenue 40,000 except v3 = 39,500):
| file | modified | HC (sum of depts) | Revenue | COGS | GM% | Rent & leases | SG&A | Other opex | cell note (decoy/real pw hint) |
|---|---|---|---|---|---|---|---|---|---|
| Budget_FY27_v3.xls | 9/14/2026 4:12 PM | 112 (Prod 78, Whse 14, Sales 6, Fin&Admin 9, Mgmt 5) | 39,500 | 30,810 | 22.0% | 420 | 4,850 | 400 | "pw for board copy? ask me. —F" |
| Budget_FY27_v4_FINAL.xls | 9/21/2026 9:40 AM | 118 (Prod 84, Whse 14, Sales 6, Fin&Admin 9, Mgmt 5) | 40,000 | 30,760 | 23.1% | 420 | 4,850 | 400 | "Board copy pw = year we incorporated + headcount" (=1991118, WRONG) |
| Budget_FY27_v5_FINAL_FINAL.xls | 10/2/2026 6:55 PM | 118 | 40,000 | 31,200 | 22.0% | 180 | 4,850 | 400 | "Board copy pw = year the current plant was built" (=1993, WRONG) |
| Budget_FY27_v5_FINAL_USE_THIS.xls | 10/5/2026 11:58 PM | 118 | 40,000 | 31,200 | 22.0% | 420 | 4,850 | 400 | "Board copy (Budget_FY27_BOARD.xls) is locked. PW = Walter's seed money + the year we first got ISO certified. Digits only. —F" (=24002006, RIGHT) |
| Budget_FY27_v6_DK_comments.xls | 10/4/2026 2:20 PM | 118 | 40,000 | 31,440 | 21.4% | 420 | 4,850 | 400 | "pw = packa + founding year" (=packa1958, WRONG) |
| Budget_FY27_BOARD.xls | 10/6/2026 12:04 AM | protected | | | | | | | |
| ~$Budget_FY27_v5_FINAL_USE_THIS.xls | hidden owner/lock file (only with Show hidden files) 165 bytes, "Owner: Frank Warmington" — a bonus clue |
GM% is NOT shown directly in the files; players compute COGS/Revenue. EBITDA rows shown in versions are fine.
Correct version EBITDA = 40,000 − 31,200 − 4,850 − 420 − 400 = 3,130. D&A 900 → EBIT 2,230.
Sheets per version workbook: "P&L Summary", "Headcount", "Opex Detail" (Rent & leases line shows "Plant lease 180" and, when present, "Warehouse lease (2024 expansion) 240"), "Notes".
The pw hint lives as a cell comment (red triangle, hover shows it) on the P&L Summary title cell AND in Notes sheet.

## Puzzle 3 — unlock Budget_FY27_BOARD.xls: password 24002006 (About: $2,400 savings; 2006 ISO 9001 — About timeline & Quality page).
Excel-style dialog: "'Budget_FY27_BOARD.xls' is protected. Password:" [OK][Cancel]; wrong → "The password you supplied is not correct. Verify that the CAPS LOCK key is off and be sure to use the correct capitalization."

## Puzzle 4 — EBITDA #REF!
Board copy "P&L Summary": Revenue 40,000; COGS 31,200; Gross profit (formula) 8,800; SG&A 4,850; Rent & leases 420; Other opex 400;
EBITDA = #REF! (editable cell, yellow-ish selection); D&A 900; EBIT formula depends on EBITDA; Interest 450; EBT; Taxes 25%; Net income.
When EBITDA cell evaluates to 3130 → solve 'ebitda', show Frank's note appearing (comment/text box): "Nice. Bank.zip password = the number you just fixed. —F".
Trap: subtracting D&A gives 2,230.

## Puzzle 5 — DSCR (My Documents\Bank\Bank.zip, password 3130)
Contents: Loan_Agreement_Excerpt.txt, Covenant_Cert_Q3.xls.
Loan: Term Loan A, outstanding $6,000,000, fixed 7.50% (interest $450K/yr), scheduled principal $1,750,000/yr.
Covenant 6.1 DSCR = (TTM EBITDA − Unfunded Capital Expenditures) / (Cash Interest + Scheduled Principal) ≥ 1.25x, tested quarterly TTM.
Covenant 6.2 Minimum Liquidity: unrestricted cash ≥ $250,000 at every week-end.
Covenant_Cert_Q3.xls: TTM EBITDA by quarter Q4'25 720, Q1'26 690, Q2'26 760, Q3'26 690 = 2,860.
Capex TTM 410, of which financed under equipment loan 300 (Karen's email: die-cutter rebuild $110K paid cash) → unfunded 110.
DSCR cell blank "=?". Answer (2,860−110)/(450+1,750) = 2,750/2,200 = 1.25x. Trap 2,860/2,200 = 1.30.

## Puzzle 6 — 13-week cash (hidden folder My Documents\Cash — only visible with Tools > Folder Options > Show hidden files)
File Cash_13wk_Q4.xls. Week 1 = w/c Mon Oct 12 2026. Opening cash 1,180. Min liquidity 250.
Receipts (customer collections) and non-payroll disbursements total per week:
| wk | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
| receipts | 410 | 395 | 380 | 420 | 360 | 430 | 350 | 440 | 340 | 450 | 380 | 460 | 400 |
| disb (non-payroll) | 380 | 420 | 405 | 395 | 410 | 390 | 400 | 380 | 420 | 360 | 390 | 370 | 420 |
Payroll row is EMPTY with a note "PAYROLL — get from Rachel". Rachel's email: "each run is $196K all-in", first run of the quarter Fri Oct 16.
Cadence "every other Friday" is hidden on the website Careers page. Payroll hits weeks 1,3,5,7,9,11,13.
Ending cash: 1014, 989, 768, 793, 547, 587, 341, 401, **125 (wk 9 breach)**, 215, 9, 99, -117.
Without payroll: never breaches (trap). Weekly payroll: first breach wk 5 (trap).
Payroll row cells are editable so the player can model it live.

## Puzzle 7 — Q3 bridge (My Documents\Board Meeting Oct 9\Q3_EBITDA_Bridge.xls)
Q3 budget EBITDA 850 → Q3 actual 690 (Δ −160). Drivers: Volume −120, Price +80, Containerboard cost ??, Labor −20, Freight ??.
Ozark Kraft Mills email: +$40/ton effective July 1 2026. Website Products page (NEW hidden line): "we run about 1,500 tons of containerboard a quarter".
Containerboard = −60 → Freight = −160 −(−120+80−20−60) = −40. Answer −40.
Waterfall chart drawn with two "??" bars.

## Puzzle 8 — send pack
Unlocks after 'bridge'. Diane emails "Send me the pack. Now." Outlook: Reply/New to diane.kessler → attachments auto-listed (Board Pack) → Send → solve 'send'.
Then Diane: "Bank approved the survival package. Board is happy. One question: WHERE IS FRANK?" + Marcus Hale approval email.

## Puzzle 9 — Where is Frank?
Clues: Recycle Bin "boarding_pass.txt" (smudged: "MCI → L_S … Seat 12F … Conf XLWC26"), Drew email about "that Excel championship thing in Nevada", website hidden HTML comment/404 page. Answer Las Vegas → ENDING.

## Ending
Diane/Frank reveal email from frank.w.offgrid@... : "I'm in Vegas for the Excel World Championship. Tell Diane the numbers were always there — just in 14 files and my head. Get a real system before I come back. —F"
End card (brand): "Packa Corp almost lost everything because one person disappeared." / "With Datarails FinanceOS, your numbers don't live in one person's head." CTA button "See FinanceOS" → https://www.datarails.com ; stats: time taken, hints used.

---------------------------------------------------------------------------------------------------
# v2 OVERRIDES — aligned with the "Frank Is Missing" web series (these WIN over anything above)
Series canon (scripts in series/scripts/*.txt, props in series/excels/): Frank = Packa's FP&A Manager (website title "Director of FP&A" is fine in bios), escaped through a man-sized hole behind his giant FORMULA CHEAT SHEET poster; "GET SHEET DONE" mug; sleeps on a yoga mat with an Excel pillow; 47-tab model with a tab called "DO NOT DELETE" ("do not touch the Do not touch"); Drew (cowboy hat, "Make it work.", worries about his Porsche and the company pool-jumping contest) kept overriding the BOARD VERSION numbers; Frank kept a REAL VERSION of weekly cash files and a dated, initialed CHANGE LOG; the Board deck says six months (182 days) of runway, Frank's real file says 43 days; a password-protected FOR THE BOARD folder = Frank's rescue/emergency plan; Rachel has loved Frank for 17 years, thinks he ran off with Kristians Bušārs (Latvian FP&A influencer, "master of cheat sheets, king of macros"), reads a Latvian dictionary; Joshua worked with Frank 6 years ("I work with Frank. I don't understand Frank."); Emily is an INTERNAL Packa colleague who keeps saying "This is exactly why FinanceOS—" and gets cut off ("Not now, Emily."); she got sucked into the hole and saw the Las Vegas strip; Frank is in Vegas at the Microsoft Excel World Championship; the team leaves for Vegas ("buckle up").
- Emily Carter = Packa Finance Systems Analyst, emily.carter@packacorp.com (NOT a Datarails employee). Her FinanceOS lines stay modest (no stats, no competitors).
- Game clock: Mon Oct 19 2026 11:47 PM. Board meeting: Tue Oct 20 2026 9:00 AM. Frank last seen Fri Oct 16 night (last files ~11:50 PM Oct 16). The team (Drew, Joshua, Rachel, Emily) flew to Vegas Monday evening to find Frank; Diane (CFO) stayed and needs the pack; the player is "you", at Frank's desk.
- Frank's initials in change logs: FW. Drew = DH (Drew Hollis).
- Folder changes: My Documents\BOARD\BOARD VERSION (bp_q1..bp_q4 Drew's rosy Board packs: bank balance 2,860; Board KPI "Cash runway 182 days — SIX MONTHS — comfortable", Drew cell comment "Just make it six months."), My Documents\BOARD\REAL VERSION (HIDDEN; replaces the old 'Cash' folder): cash13 = Packa_Cash_13wk_REAL_2026-10-16.xls, changelog = CHANGE_LOG_do_not_share.xls, realnotes = NOTES_to_whoever_finds_this.txt, cashnote = dont_show_drew.txt. Board Meeting folder renamed "Board Meeting Oct 20". Desktop: folder FOR THE BOARD containing forboardx = FOR_THE_BOARD.xls (password), and model47 = Packa_Corp_Model_FY26_v47_FINAL_FINAL_use_this_one.xls (47 tabs incl. DO NOT DELETE). My Pictures: pic_kristians (photo in FR.data.images.kristians, a data: URI).
- Checklist ORDER now: login, version, unlock, ebitda, dscr, cash, bridge, forboard, send, frank.

## Puzzle 6 v2 — 13-week REAL cash (replaces the old numbers)
Week 1 = w/c Mon 10/19/2026 (Fridays 10/23, 10/30, ...). Opening cash 2,860 (matches the bank balance in the series props). Min liquidity 250.
| wk | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
| receipts | 700 | 690 | 680 | 650 | 640 | 620 | 700 | 720 | 700 | 740 | 720 | 750 | 730 |
| disb (non-payroll) | 1084 | 1210 | 1094 | 1170 | 944 | 1050 | 900 | 870 | 880 | 860 | 880 | 850 | 880 |
Disbursement lines must include a big "Past-due AP catch-up (mills on credit hold)" line (explains the burn) + Containerboard & materials, Freight, Utilities & plant, Rent & leases, Debt service (week 6 includes quarterly interest), Insurance, Other — lines sum EXACTLY to the totals.
Payroll $196K per run, every other Friday, first run Fri Oct 23 → weeks 1,3,5,7,9,11,13.
Ending cash: 2280, 1760, 1150, 630, **130 (wk 5 breach)**, -300, -696, -846, -1222, -1342, -1698, -1798, -2144. Cash goes negative in week 6 (~43 days after Oct 16 = Frank's "43 days").
Traps: no payroll → first breach wk 7; weekly payroll → wk 4. ANSWER: 5.
A "DO NOT DELETE" sheet in this workbook holds Frank's notes, incl. "Board version says 182 days. Real: 43. Funding gap by wk 13 = 2,144 + 250 minimum."

## Puzzle 8 v2 — 'forboard': FOR THE BOARD\FOR_THE_BOARD.xls
Password: 18243 ("what they told the Board, then what's true" = 182 then 43). Hint lives in NOTES_to_whoever_finds_this.txt (REAL VERSION) and the change log's last rows show 51→182 (Drew) and "Real runway 43 days". Accept via Excel password dialog → FR.puzzle.solve('forboard').
Content: "EMERGENCY PLAN — FOR THE BOARD" by Frank: real funding need = 13-wk gap 2,144 + 250 min liquidity = 2,394 → request the Prairie Ledger Bank $4.0M survival facility; conditions (true covenant cert DSCR 1.25x, weekly real cash reporting, stop Board overrides); actions (collect past-due AR, renegotiate mill terms, freeze Board-version edits); closing note: "If you're reading this, you rebuilt in one night what lived in 14 files and my head. Get them a real system. —F".

## Puzzle 9 v2 — 'send': email Diane the pack (incl. FOR_THE_BOARD.xls) → Board approves emergency plan, bank approves survival package.
## Puzzle 10 v2 — 'frank': "Who is Frank competing with in Vegas?" → Kristians Bušārs (accept kristians / busars / bušārs / bushars).
Clues: Rachel's jealous email with Kristians' photo; speedrun_practice.xls team "Cheat Sheet Kings: F. Warmington + K. B."; boarding pass companion line "WARMINGTON/FRANK + 1 (B_S_RS/K____ANS)"; team emails from Vegas ("we're at the championship, 300 people, no Frank"); website clue (hidden HTML comment). After solve → Frank's reveal email → ending.

---------------------------------------------------------------------------------------------------
# v3 — PLAYABILITY PASS (wins over v1/v2 where they conflict)
Goals from the client: easier, intuitive start; rising (sawtooth) difficulty; no free-text guessing of long strings; Frank's computer must feel like a real person's — an Excel lover and a superfan of Kristians Bušārs (photo: FR.data.images.kristians); XP-style sounds (src/sounds.js: FR.sound.play names ding, error, warn, chord/exclamation, mail, notify, click, nav, recycle, minimize, maximize, restore, unlock, tada, startup, logon, logoff); open/close window animations (core).
Difficulty curve: 1 Login (tutorial, <60 s) · 2 Budget (easy) · 3 Board pw (medium) · 4 EBITDA fix (breather, teaches Excel) · 5 DSCR (medium) · 6 Cash (medium-hard, hidden files) · 7 Bridge (hard) · 8 FOR THE BOARD (hardest, synthesis) · 9 Send (breather) · 10 Who is Frank with (finale, pick a card).
Changes:
- Ch1 password is now **sedalia1958** (homepage: "Missouri's Packaging Manufacturer Since 1958", "same corner of Sedalia"). Hint: "Where Packa started + when. (It's on our homepage.)". ohio1958 still accepted as a secret alt.
- Ch2 answer is picked from file cards in the checklist (no typing). Budget workbooks now SHOW a "Gross margin %" row under Gross profit (formula) so the test is a lookup, not arithmetic. Diane's tests unchanged (118 heads, 22.0% GM, warehouse lease 240 → Rent & leases 420).
- Ch3 pw hint comment in v5 USE THIS points to pages: "PW = Walter's seed money (About Us) + the year we first got ISO certified (Quality & Safety). Digits only. —F".
- Ch4 unchanged (auto-solve on cell fix; checklist also takes the number).
- Ch5 Covenant_Cert_Q3.xls: when the DSCR cell evaluates to 1.25 (±0.005) → FR.puzzle.solve('dscr') with the same "earlier items first" logic as the Board copy. Checklist still accepts the number.
- Ch6 answer via week buttons 1–13 in the checklist (no typing).
- Ch7 Q3 bridge: when both ?? cells are correct (−60 and −40) and the check TIES → FR.puzzle.solve('bridge'). Checklist still accepts −40.
- Ch10: suspect cards in the checklist: Kristians Bušārs (photo), Drew Hollis, Rachel Moss, Marcus Hale — pick one.
New Frank-flavour nodes (fs.js): desktop folder 'fanclub' "Kristians Fan Club" (pic_k_signed, pic_k_me, pic_k_card, k_webinar txt, k_ranked xls), desktop clutter: 'newfolder3' (empty folder), 'copybudget' xls (Excel: "cannot be found... may have been moved"), 'drewhat' image, 'passwords' txt ("Nice try. —F" + joke list).

# v4 — playtest fixes (Sep 27). Opening cash now 2,840; 13-wk ending: 2260,1740,1130,610,110(wk5),-320,-716,-866,-1242,-1362,-1718,-1818,-2164; funding need 2,164+250=2,414. EBITDA item requires the full row 12. Interest declines quarterly (400.8 FY). Q3 GM 19.8%. Frank = FP&A Manager (website says Director — a joke). Login ? is not a hint. Timer/clock persist from first sit-down. Esc closes top window. Screensaver 5 min. PDF attachments open in Document Viewer (inv_diecutter).
- v5: Board copy password is now 4406 = SUM(2400, 2006); hint written as a SUM(); decoy hints use SUM()/CONCAT() too.

# v6 — deep QA pass (Sep 28). See qa/FIXPLAN.md for canon decisions (three FINAL files; payroll all-in hourly + salaried monthly; DSCR = test-date balance × rate + next-12-month principal; die-cutter paid 09/25; TLA monthly P&I 183; #212 canon; .example domains; Kristians photos are generated, funny; hints are "Datarails FinanceOS · Emily's trial" cards; Board pw 4406; freight must be negative).
