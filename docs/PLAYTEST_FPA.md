# Playtest report — "Frank's Computer" (Packa Corp)

**Who I am:** FP&A Manager at a ~200-person company. I live in Excel, I have opinions about waterfall charts, and I have been sent one too many "platform" pitches with a stock photo of a smiling CFO. Blind playtest, 1440x900, one browser session, roughly 65 minutes at the desk end to end, of which maybe 40 was the critical path and the rest was me reading Frank's mail like a bad colleague.

**Hints:** I never opened a checklist hint. I did click the little `?` next to the Windows password box on the log-on screen (the sticky note told me to), and the game silently counted that as "Hints used: 1". More on that below. **Wrong guesses: 0. Every password and answer went in first time.**

---

## 1. First impressions — intro, boot, log-on

The manila folder intro card is good. "There is a man-sized hole behind the cheat-sheet poster at his desk. We are not discussing the hole." got a laugh out of me before I'd clicked anything, and the four bullets (crack the password, work through email/Excel/folders, track progress on the checklist, keep packacorp.com open) tell me exactly what kind of game this is: a finance escape room in a fake Windows XP. I know within ten seconds whether I'm the audience, and I am.

The "Sit down at Frank's desk" button → black boot screen with "WORKSTATION · FIN-FW01 … Loading Frank's profile…" → the XP log-on. The boot takes about six seconds. That's fine once; it would be annoying on a replay, and there's no way to skip it.

The log-on screen is the right amount of easy. Sticky note says "PW hint is on our own homepage :)", the `?` says "Where Packa started + the year it started. All lowercase, no spaces." Homepage says Sedalia, 1958. `sedalia1958` and I'm in. Good on-ramp: it teaches "the website is part of the game" without being a puzzle yet. My only hesitation was whether "where Packa started" meant Sedalia or East 3rd Street — I guessed the town and it worked, but a wrong-guess counter exists, so a player who tries `east3rdstreet1958` first gets dinged for a reasonable reading of the hint.

**Would I have kept going if nobody had asked me to?** Yes, and honestly the reason is not the puzzle, it's the desktop. The moment the XP wallpaper appeared with sticky notes reading "DO NOT TOUCH the DO NOT DELETE tab" and "Drew 'make it work' count: ~~IIII IIII~~ II", a file called `Packa_Corp_Model_FY26_v47_FINAL_FINAL_use_this_one.xls`, and a folder called `Copy of Copy of Budget_FY27_v2 (2).xls`, I was in. That is my life. The "You have new e-mail — Diane Kessler: Board Pack — 9:00 AM. No excuses." toast in the corner sealed it. The one thing that nearly lost me was that the checklist window opens *on top of* everything at 40% of the screen and I had to work out that it's a normal window I can minimise; for a second I thought it was a modal tutorial.

---

## 2. Gameplay notes per stage (the 10 checklist items)

**1. Get into Frank's computer** (~3 min incl. boot). Fine. See above. Change needed: don't count the Windows `?` password hint as a game hint, or if you must, say so on the screen. I ended the game with "1 hint used" on my score card having never opened a hint, and that stings for a zero-wrong-guess run.

**2. Pick the FY27 budget Diane approved** (~10 min). Diane's email gives three tests: headcount = website (118), gross margin exactly 22.0%, rent & leases = $180K plant + 40,000 sq ft × $6 = $420K (sq ft from the About page timeline, 2024). Then it's open five workbooks × four tabs. The design here is elegant — each decoy fails exactly one test: v3 fails headcount (112), v4_FINAL fails margin (23.1%), v5_FINAL_FINAL fails rent (180, "Took whse lease out per Drew — 'it's basically free space'"), v6_DK fails margin (21.4%, freight reclass). Only `v5_FINAL_USE_THIS` passes all three. What confused me: how to *answer*. The checklist shows five rows each with an "open" link; I didn't realise clicking the filename row itself (not "open") is the pick until I tried it. A "Select" button or radio would fix that. The "Send to Diane for sign-off — Tell Diane this is the approved FY27 budget?" confirm dialog is a nice touch. What felt good: the Notes tab of each file carries a *different* Board-copy password hint, so a player who skips the three tests and guesses gets punished at the next stage. Very good.

**3. Unlock the Board copy** (~2 min). The right file's Notes tab says "PW = Walter's seed money (About Us) + the year we first got ISO certified (Quality & Safety). Digits only." About page: $2,400. Quality page: ISO 9001 since 2006. `24002006`. First try. The wrong files say things like "pw = packa + founding year", which is a lovely trap. Nothing to change.

**4. Repair FY27 EBITDA in the Board copy** (~3 min). Click C12, formula bar shows `=C7-C9-C10-#REF!`, cell comment from Frank: "Broke this at 3am. Fix before the Board sees it." Typed `=C7-C9-C10-C11`, Enter, checklist ticked. Two things: (a) the item ticked on the FY column alone while Q1–Q4 were still `#REF!` and the "Quarters foot to FY" check still read `#REF!`. I fixed E12:H12 myself out of professional shame and the check flipped to OK, but the game didn't require it. It should — "fix the row, not the cell" is the whole lesson. (b) On closing I got "Do you want to save the changes?" → Yes → "'Budget_FY27_BOARD.xls' is read-only. Frank's files open read-only on this machine — your changes were not saved." Asking me and then refusing is a UX contradiction. Either save (state is already persisted for the checklist anyway) or don't ask. Nice touch: the Board Notes tab, "EBITDA = Gross profit − SG&A − Rent & leases − Other opex. BEFORE D&A. (the D is for depreciation, Drew)".

**5. Prove the bank covenant (DSCR)** (~5 min). Bank.zip password is "the number you just fixed" (3130). The Loan Agreement excerpt is genuinely well written — real definitions, a proper 6.1/6.2/6.3, and Events of Default including "(k) the loss, departure or disappearance of any Key Person, including the Director of FP&A" and "(l) the Lender shall have received no response to three (3) consecutive e-mails". Certificate: TTM EBITDA 2,860; capex 410 of which 300 on the equipment loan; Karen's email says the $110K die-cutter was paid cash. Unfunded capex 110. (2,860 − 110) / 2,200 = **1.25x exactly**. Zero headroom. I typed `=(F8-F13)/F20` and it ticked and the cell next to it said "COMPLIANT — 1.25x". Good puzzle, right difficulty. It rewards reading the definition ("Unfunded Capital Expenditures … financed with the proceeds of the Equipment Loan shall not constitute…") rather than pattern-matching; plugging 410 gives 1.11x, plugging 300 gives 1.16x, both fail.

**6. Find the week cash breaks the $250K minimum** (~8 min). Best item in the game. "1 objects (plus 1 hidden)" in My Documents\BOARD, Tools → Folder Options → View → Show hidden files, and there's `REAL VERSION` with `dont_show_drew.txt`, the change log, and the real 13-week. Payroll row is blank; Rachel's email: $196K per run, first run Fri Oct 23, "every other Friday, silly. It's even on our careers page ;)". Weeks 1,3,5,7,9,11,13. With payroll: 2,280 / 1,760 / 1,150 / 630 / **130** — week 5 (w/e 11/20). Without payroll the first breach is week 7, and with weekly payroll it's week 4, so the cadence actually matters. The conditional formatting went red as I typed, which is the most satisfying moment in the game. Change needed: after I filled the row, the footnote "Payroll row still empty → this forecast is fiction until it isn't." stays. Make it react.

**7. Close the Q3 EBITDA bridge** (~4 min). Two `??` cells, a live waterfall chart, and a Notes tab: "Board cost bar = $/ton increase × tons we run a quarter (it's on our own website, Products page)", "Freight is the plug", "DON'T plug the board cost." Mill letter: +$40/ton. Products page: ~1,500 tons a quarter. Board = (60). Freight = 690 − (850 − 120 + 80 − 60 − 20) = (40). Check goes "TIES" in green and the chart redraws. Also checks against the P&L tab: materials & freight favourable 180 = ~280 volume saving − 60 − 40. Someone did the arithmetic properly. Good.

**8. Open FOR THE BOARD** (~2 min). `NOTES_to_whoever_finds_this.txt`: "password: what they told the Board, then what's true. Days. No spaces." → `18243`. The emergency plan is a decent one-pager: funding gap 2,144 + 250 minimum = 2,394 need, $4.0M ask, 1,606 cushion, conditions, actions. Easy but it's the narrative payoff, not a puzzle.

**9. Send the Board Pack to Diane** (~2 min). Reply to "Send me the pack. Now." — the five attachments are added automatically with a banner explaining it. I typed a message; not sure it was read. Fine. Marcus's approval and Diane's "Approved." land 30 seconds later.

**10. Find out who Frank is with** (~3 min, plus 10 of snooping). Rachel's "I KNEW IT" email, the fan-club folder, `todo.txt` ("cowboy hat — NO, that's Drew's thing"), the boarding pass in the Recycle Bin with "+1 companion: B▒▒ĀRS/K▒▒▒▒IANS". Not a puzzle. Kristians. Then Frank's final email and the ending card.

---

## 3. Each riddle — good for an FP&A person? Too easy/hard? Fair? Order?

| # | Riddle | Verdict |
|---|---|---|
| 1 | Windows password | Trivial, correctly so. Fair. |
| 2 | Which budget | Easy in logic, *laborious* in execution (20 tabs). The three-tests structure is clever and realistic — "same number as our website says" is exactly the kind of external tie-out a CFO asks for. Fair. Would be better if one decoy passed two tests and failed the third only in a sub-line (e.g. rent 420 but made of 180 + 240 at $5/sq ft on 48,000 sq ft). |
| 3 | Board copy password | Easy. Fair. The wrong-file-wrong-hint mechanic is the best design idea in the game. |
| 4 | #REF! | Too easy for anyone who has opened Excel. It's a "you can do it" beat. Fair. Make it require the whole row. |
| 5 | DSCR | Good. Medium. Requires reading the agreement, not just the certificate. The 1.25x-on-the-nose answer is a nice narrative beat and a good tripwire for pluggers. Fair. |
| 6 | Cash breach week | Best. Medium. Hidden folder + payroll cadence + "bank tests EVERY week-end, not the average". Fair, and the careers page tie-in is realistic. |
| 7 | Bridge | Easy-medium. "Freight is the plug" is cynically accurate. Fair. |
| 8 | Emergency plan password | Easy once you've read NOTES. Fair. |
| 9 | Send | Not a riddle. |
| 10 | Who | Not a riddle; comedy finale. |

**Order:** Right. The chain of dependencies (approved version → its Notes tab → Board copy → the EBITDA you fix → the zip password → the covenant → the real cash → the runway numbers → the plan password) is tight and every step uses an artefact from the previous one, which is how real month-end feels. Difficulty dots go 1→3 as promised. One quibble: #2 is the heaviest reading load in the whole game and it's the first real item; a player who isn't a finance person could bounce there. Consider surfacing Diane's three tests *in* the checklist item text so the email is confirmation, not discovery. I would not reorder 5 and 6: reading Section 6.2 in the certificate before finding the forecast it references is good foreshadowing.

---

## 4. Enjoyment

**Jokes that landed, in order of how loudly I laughed:**
- The change log. "2026-09-28 · DH · B30 · 51 days → 182 days · 'Just make it six months.' · Warning issued: Yes — email 09/28 · Taken to Board? Yes". Then the totals: Overrides by DH 8, Warnings filed by FW 5, Versions never taken to Board 5. That is a real document. I have kept that document.
- `passwords.txt`: "Board file: not here / Bank.zip: the number I broke / Windows: you're already in, genius / Diane: coffee, black / Drew: 'make it work'".
- Drew's all-caps BlackBerry emails. "STEVE ADDS EVERYTHING UP. STEVE ADDS UP THE LUNCH MENU." And "Sent from my phone in the Porsche".
- The Loan Agreement's Event of Default (l): no response to three consecutive e-mails. Every banker I know would sign that.
- The corrupted v2 in the Recycle Bin: `[Repaired] — formulas removed`, a grid of `####`, `#REF!`, `#DIV/0!`, `#N/A`, and "note to self: never merge cells again / v2 is dead. long live v3. and v4. and v5. and…".
- Packa IT: "Deleted Items is not a filing system. (Frank.)" and "Some of you are at 249 MB. You know who you are. (Frank.)"
- The "Low Disk Space" balloon: "47 copies of the model will do that."
- `me_and_kristians_(photoshop).jpg` — a cartoon Frank pasted next to a stock headshot with TRIAL VERSION watermarked across it.
- The screensaver: Kristians' headshot bouncing DVD-logo style with a green marquee "GET SHEET DONE ✦ There's always a formula ✦ Kristians is my co-pilot". I sat and watched it.
- "Kristians says 'jah, this is normal for Americans?'"

**Jokes that didn't:**
- Emily's "This is exactly why FinanceOS—" runs five times (two inbox emails, one deleted, one in Joshua's Vegas email, one in the finale). Twice is a running gag; five is the vendor being unable to help itself. The Datarails pitch is otherwise handled with real restraint — the deleted-email version is genuinely funny because Frank deleted it — so don't overdraw the account.
- Rachel's "salauzta / sirds" Latvian bit is sweet the first time, and the birthday-card-as-coaster line is good, but three separate Rachel artefacts (email, card_from_rachel.txt, guestbook "who is frank_w? just asking. for a friend. <3") make her a bit of a one-note stalker joke. One fewer.
- The "Chamber of Commerce October mixer" email is filler that a player will read hoping it's a clue. Either plant a clue in it (the pie? the football tickets?) or cut it.

**Frank's personality:** comes across strongly and consistently — passive-aggressive workbook notes, midnight timestamps, "GET SHEET DONE", the yoga mat and Excel pillow, "rename these files like an adult" on his own to-do list four versions running. He is a specific person, not a stock "Excel guy". The best line about him isn't his: Joshua's "Six years. I work with you. I don't understand you." The final email is the right tone — dry, a little kind, "It's not a great job."

**Does the Kristians thing work?** Mostly yes. As a running gag (Latvian Excel influencer, cheat sheets, "jah") it's charming, and the fan site in IE — Geocities layout, "Best viewed in Internet Explorer 6 at 800x600", "You are visitor number 0048213", the FP&A Webring — is the best single screen in the game. Where it wobbles: the reveal that Frank is *with* Kristians is telegraphed from the first ten minutes (Rachel's email, the sticky note, the fan-club folder, the desktop shortcut), so item 10 has no tension. Give me one red herring with teeth — the Drew hat evidence is set up as one but the game itself tells me it's Drew's hat, and the boarding pass literally contains Kristians' half-smudged name. And a continuity slip: the club newsletter calls Frank "Member no. 0001 (Frank W.)" while the fan site and the card say #0003.

**Moments of "ugh":** re-opening five workbooks and tabbing through four sheets each for item 2; every PDF attachment throwing "Windows cannot open this file" (funny once, then just a dead end — Karen's invoice would have been nice to see); the save-then-read-only dialog pair; the ending card resurfacing every time I closed Frank's last email.

**The ending:** Diane's "I called the Board chair at home and woke him up. He read Frank's emergency plan in his bathrobe and approved it." is a good finish. The end card ("Packa Corp is saved. Frank is in Vegas. / 19 min · 1 hints · 0 wrong guesses") is clean. The pitch copy underneath ("Packa doesn't run on Datarails. So when Frank walked through the wall, the truth nearly went with him.") is tolerable because it's earned by 40 minutes of showing rather than telling. Keep "See how FinanceOS works" as the only CTA; don't add a form.

---

## 5. Finance sanity check

Mostly this holds up better than most vendor demo data. Things that would make a real FP&A person squint:

1. **Headcount test vs. timeline.** v3 has 112 heads "before 2nd shift"; v4 onward has 118 "incl. 2nd shift (+6) from Jan". So 118 is the FY27 year-end plan, not today's payroll. But the website says 118 employees *now* and the Q3 Board KPI says 118 actual. Either the six second-shift hires are already on payroll (then v3's 112 makes no sense) or the website is wrong. Diane's test "it carries every person on our payroll" only works if current = 118.
2. **Gross margin contradictions.** FY27 budget: 22.0% (and Diane "promised the bank" that). Q3'26 Board KPI: 17.2% actual. Q3 P&L file: (9,280 − 5,970 − 1,470) / 9,280 = 19.9%. Real runway model: 12.0% for Q4. Four different margins for adjacent quarters with no bridge between them. The 17.2% vs 19.9% is a straight inconsistency between two files that are both supposed to be actuals.
3. **Payroll vs. loaded cost.** Rachel: $196K per run all-in × 26 runs = $5.1M/yr for everybody. Budget headcount tab: 118 heads at $66.1K average loaded = $7.8M. Q3 P&L: direct + indirect labour 1,470/qtr = $5.9M/yr for production alone. These three don't reconcile within $2–3M.
4. **Interest expense.** Budget shows 450 on "6,000 @ 7.50% fixed" but the agreement amortises $1,750K/yr in equal quarterly instalments, so FY27 average balance is ~$5.1M and interest should be ~$385K, falling each quarter, not flat 113/113/112/112.
5. **Debt service label.** Runway models say "Monthly debt service (term loan + equipment loan) 183" — but 183 is exactly TLA only (450 + 1,750)/12. The equipment loan ($300K, June 2026) adds nothing. The 13-week has 161 monthly + 113 quarterly interest, which is a different number again.
6. **The bank's behaviour.** DSCR at exactly 1.25x, revolver "fully drawn since Aug-26", 43 days of runway, an Event of Default already triggered under 7.1(k) by the FP&A director disappearing — and the credit committee approves a *new* $4.0M facility at 11:49 PM on the strength of a pack that adds up. A real Marcus would at minimum say "approved subject to a covenant reset", because the new facility's debt service would push pro-forma DSCR well under 1.25x. One sentence in his email would fix it.
7. **2,860 twice.** TTM EBITDA is $2,860K and the bank balance is $2,860K. Reads like a copy-paste. Change one.
8. **Change log vs. file.** Change log says Drew overrode B30 "51 days → 182 days"; NOTES says "Drew typed 182 into the Board file himself". But B30 in `Packa_Board_Pack_Q4_2026_FINAL.xls` is a live formula (`=IF(B28>0,ROUNDDOWN(B8/B28,0),9999)`) that produces 182 from the overridden inputs. The hardcode is actually in the v47 model's BOARD SUMMARY tab. Pick one story.
9. **The Board version tells the truth in its own notes.** Drew's Board file has notes like "Board: 'big-box Q4 uplift'. Real: two accounts churned in Aug." next to each overridden input. Drew would never leave that in. Move those notes to the REAL file or the change log.
10. **Plant lease.** $180K/yr for the main plant + offices (172,000 sq ft implied) is ~$1.05/sq ft, while the warehouse is $6.00/sq ft. A related-party family lease could explain it — say so in a note, it's a one-liner and adds flavour.
11. **Frank's title.** Intro and email signature: "FP&A Manager". Website and Loan Agreement Key Person clause: "Director of FP&A / Director of Financial Planning and Analysis". If it's deliberate (website inflates titles), have someone joke about it.
12. **Model filler tabs.** The v47 model's Debt Schedule tab has opening balance 162, principal 575, interest 970 in *January*, closing 672. Board Pack Data is similar random noise. Any FP&A player will open these. Either make them plausible or make them visibly placeholders ("Sheet14 (2)" is fine; "Debt Schedule" with nonsense in it is not). Also "Flexible Film", "Resin Index" and "Folding Cartons" tabs in a corrugated box plant's model.
13. **Runway consistency (good).** 13-week with payroll goes negative in week 6 (w/e 11/27); the real runway model says cash-out 11/28. Receipts ~700/wk ≈ Q3 revenue; board 440/wk ≈ Q3 materials; rent 35/month = 420; insurance 22/month ≈ 260. This ties, and I noticed that it ties, which is the point.
14. **Timeline.** Oct 19, 2026 really is a Monday; the Chamber mixer on Thu Oct 22 checks out. "Kristians LIVE Thu 8pm (3am Riga!!)" — 8 PM Central in mid-October is 04:00 in Riga (CDT/EEST). Frank would know.
15. **Clock.** Everything from "Send me the pack" to bank approval to the Board chair being woken happens between 11:49 and 11:55 PM on the desktop clock. Fine for a game; a "9:00 AM" pressure that never advances is a missed opportunity.

---

## 6. Bugs / UX friction

- `Esc` closes nothing — not Notepad, not the picture viewer, not the "Windows cannot open this file" modal. Modals block all clicks until OK, which is XP-accurate but Esc should still work.
- "Do you want to save the changes?" → Yes → "read-only… your changes were not saved." Contradictory dialog pair on every Excel close after an edit.
- Item 4 ticks on C12 alone while E12:H12 and the check row stay `#REF!`.
- Windows password `?` counts as a game hint ("Hints used: 1" on the score card with zero checklist hints opened).
- Score-card timer: it showed "19 min"; I was at the desk for ~65. I reloaded the page once mid-game (progress restored perfectly via "Continue at Frank's desk" — nice) and the timer appears to have restarted, and the desktop clock reset to 11:47 PM.
- Ending card re-triggers every time Frank's "Re: frank??" email window is closed, including after "Back to Frank's desk".
- `Copy of Copy of Budget_FY27_v2 (2).xls` on the desktop: "cannot be found. Check the spelling…". If that's a joke about broken shortcuts it needs a wink; if not, it's a bug.
- Closing the topmost window when only the checklist is open closes the checklist. Not a bug (it's in the tray), but I lost it once without noticing.
- The 13-week footnote "Payroll row still empty" persists after payroll is entered.
- Idle → screensaver kicks in after roughly two minutes, which is short when a player is reading a long email or thinking; make it 5 minutes.
- Checklist item 2: no visible affordance that clicking the filename row is the answer.
- The intro says "Keep www.packacorp.com open in another tab" but in-game IE loads the real site (and the fan site) perfectly well. Say so; fewer tab switches.
- Never saw a JS error in the console. Excel (name box, formula bar, comments on hover, conditional formatting, live chart, status-bar Sum) is impressively solid. I didn't test copy/paste, fill-down or undo.
- Untested by me: what a wrong answer looks like, and the actual content of the three-tier hints.

---

## 7. CHANGE LIST

1. **[must]** Don't count the log-on `?` password hint as a game hint, or label it as one on the log-on screen.
2. **[must]** Item 4 should require the whole EBITDA row (or the "Quarters foot to FY" check = OK), not just C12.
3. **[must]** Fix the save dialog: either persist edits (state is already saved for the checklist) or remove the "save changes?" prompt on read-only files.
4. **[must]** Fix the score-card timer so it survives a reload/continue (65 min showed as 19).
5. **[must]** Reconcile Q3 gross margin: 17.2% (Board KPIs) vs 19.9% implied by the Q3 P&L file; pick one and make the 12% "real Q4" assumption explicable in a note.
6. **[should]** Make the answer control for item 2 explicit (a "Select" button / radio per file, separate from "open").
7. **[should]** Cut Emily's "This is exactly why FinanceOS—" from five occurrences to two (deleted email + finale).
8. **[should]** Give item 10 a real red herring so the reveal isn't fully telegraphed by minute ten; un-smudge less of the boarding pass name.
9. **[should]** Marcus's approval: add "subject to a covenant reset / pro-forma DSCR" language so the bank's behaviour is credible with DSCR at exactly 1.25x and a new facility.
10. **[should]** Reconcile payroll ($196K × 26 = $5.1M) vs loaded headcount cost ($7.8M) vs Q3 labour ($5.9M annualised); a "production only / excludes bonuses" note on the headcount tab would do.
11. **[should]** Move the "Real: two accounts churned…" notes out of Drew's Board version file; he wouldn't leave them.
12. **[should]** Fix the headcount timeline: either the +6 second shift are already hired (drop v3's 112 story) or the website/Q3 KPI shouldn't say 118 today.
13. **[should]** Make `Esc` close the topmost window/dialog.
14. **[should]** Unify Frank's title (FP&A Manager vs Director of FP&A) or make the mismatch a joke.
15. **[should]** Kristians club member number: 0001 in the newsletter vs 0003 on the card/fan site.
16. **[should]** Make the 13-week "Payroll row still empty" footnote react when payroll is filled.
17. **[should]** Interest expense in the FY27 budget should decline with amortisation (~385, not flat 450) or carry a "held flat, refi assumed" note.
18. **[should]** Stop the ending card re-showing every time Frank's final email is closed.
19. **[nice]** Change one of the two 2,860s (TTM EBITDA vs bank balance).
20. **[nice]** Make the change-log / NOTES "Drew typed 182" story match the file (B30 is a formula; the hardcode lives in v47 BOARD SUMMARY).
21. **[nice]** Replace random-number filler in the v47 model's Debt Schedule / Board Pack Data tabs with plausible figures, and drop the flexible-film/resin tabs from a corrugated plant.
22. **[nice]** Let Karen's invoice PDF open (as an image) instead of "Windows cannot open this file"; keep the joke for the cheat sheets.
23. **[nice]** Lengthen the screensaver idle timeout to ~5 minutes; keep the screensaver, it's great.
24. **[nice]** Add a "skip boot" on replay / continue.
25. **[nice]** Tell players in-game IE works for packacorp.com (it does, and the fan-site favourite is a treat).
26. **[nice]** Either plant a clue in the Chamber of Commerce email or cut it.
27. **[nice]** Riga time: 8 PM Central in October is 4 AM Riga, not 3 AM. Frank would have got that right.
28. **[nice]** Add a related-party note on the $180K plant lease so the $/sq ft gap vs the warehouse reads as intentional.
29. **[nice]** One fewer Rachel artefact (email + card + guestbook is one too many).
30. **[nice]** Make item 2's decoys slightly nastier — one file that passes two tests and fails the third only in the detail line.
