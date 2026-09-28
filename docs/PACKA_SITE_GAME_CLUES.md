# Packa Corp website — edits for the "Frank's Computer" game

Drop this file into the packacorp.com repo and ask Claude Code:
"Apply every change in PACKA_SITE_GAME_CLUES.md exactly as written, then run the verification checklist at the bottom."

## Context

The site is a clue source for a browser puzzle game. Players read packacorp.com to find passwords and numbers. Two rules follow from that:

1. **Copy below is exact.** The game checks these numbers and phrases. Do not reword, round, or "improve" them.
2. **Do not touch anything in the "Frozen facts" section.** If any of those change, a puzzle breaks.

The site is static HTML (index.html, about.html, products.html, careers.html, quality.html, contact.html, industries.html + css/, images/, js/). Keep the existing structure, classes and tone.

## Required changes (3)

### 1. careers.html — payroll cadence

In the intro paragraph (the one starting "We've got employees who started on the line in the 1980s…"), insert the phrase **"pay every other Friday by direct deposit,"** into the list of benefits, so the paragraph reads:

```
We've got employees who started on the line in the 1980s and never left, and we've got people who started last year. We pay competitively for the Sedalia area, offer health insurance and a 401(k) with a company match, pay every other Friday by direct deposit, and we try not to make people work weekends unless there's a real crunch.
```

The words "every other Friday" must appear exactly.

### 2. products.html — containerboard volume

Append one sentence to the end of the intro paragraph under "Products & Capabilities" (the one ending "email us your specs and we'll quote it."):

```
Our corrugator runs about 1,500 tons of containerboard a quarter, most of it from mills in Missouri and Arkansas.
```

The phrase "1,500 tons of containerboard a quarter" must appear exactly (with the comma in 1,500).

### 3. index.html and about.html — hidden comment

Add this HTML comment on its own line immediately before the `<footer` tag in both files. It must not be visible on the page; it is only found with View Source:

```html
<!-- FW 10/16: out of office. Vegas. Championship. Team with K.B. Back when we are champions. Don't tell Drew. -->
```

## Optional change (1)

### about.html — Frank's bio

In "Our Leadership", change Frank Warmington's description to:

```
Frank Warmington — FP&A Manager. Leads financial planning and analysis. Builds the annual budget, tracks costs by job, and keeps a cheat sheet for everything. Currently out of the office.
```

Keep the same markup as the other leaders. Only do this if the site owner has approved it; it is story flavour, not a puzzle clue.

## Frozen facts — do NOT change

These existing lines are puzzle answers. Leave the wording and numbers exactly as they are today.

| File | Text that must stay | Why |
|---|---|---|
| index.html | "Missouri's Packaging Manufacturer Since 1958" and "out of the same corner of Sedalia" | Windows password (sedalia1958) |
| index.html | the "118" Employees stat | Budget headcount test |
| about.html | "with $2,400 in savings" | Board file password (2400…) |
| about.html timeline | "2006 … earns ISO 9001 certification" | Board file password (…2006) |
| about.html timeline | "2024 … adding 40,000 square feet of finished goods storage" | Warehouse lease = 40,000 × $6.00 |
| about.html | "that was Walter's brother Frank" / "hardware store on Ohio Avenue" | Alternate password |
| about.html | Diane Kessler, Chief Financial Officer; Frank Warmington in leadership | Story characters |
| quality.html | "ISO 9001 certification since 2006" | Board file password |

Also keep the site embeddable in an iframe: do not add `X-Frame-Options` or a `frame-ancestors` CSP header (the game shows the site inside its own browser window).

## Verification checklist (run after editing)

```
grep -c "every other Friday" careers.html                       # expect 1
grep -c "1,500 tons of containerboard a quarter" products.html   # expect 1
grep -c "Team with K.B." index.html about.html                   # expect 1 each
grep -c "Since 1958" index.html                                  # expect >= 1
grep -c "118" index.html                                         # expect >= 1
grep -c '\$2,400' about.html                                     # expect 1
grep -c "40,000 square feet" about.html                          # expect 1
grep -c "since 2006" quality.html                                # expect 1
```

Then open each edited page in a browser: the new sentences should read as ordinary company copy, and the comment must not render. Deploy, and confirm the live URLs return the new text (the game reads the live site, not the repo).
