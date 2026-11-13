# Reports

Squeegee writes two reports: the audit at step 4 and the final report at step 9. The reader is the product's owner. They have not read the code, this skill or its rule ids. Each report lets them act without opening any of the three.

## Writing rules

1. Lead with the verdict and the three largest problems. Detail follows.
2. Give every number its comparison. "16 text sizes. 90% of professionally made pages use 14 or fewer."
3. Describe what you measured, in its units. "The headline is 72 px at weight 800 and centered."
4. Name a rule beside its id the first time it appears: "S01, text sizes 1 px apart".
5. Every finding carries a `file:line`, or the rule in the live stylesheet when the source is out of reach, and a reason (see "Grounding a finding"). Every pass carries the evidence that it passed.
6. State uncertainty once, where it applies: "not run", "unverified", "self-graded".
7. Plain words, active voice with a named actor, one idea per sentence, sentence case headings, periods and commas in place of em dashes, literal phrases. Leave out emoji, praise, apology and sign-offs.

## Grounding a finding

Every finding has three parts.

**Seen.** The observation with its value, the screen and width it was seen at, and the `file:line` that produces it.

**Why it counts.** One or two sentences built from the rule's own evidence. Use every kind that applies:

- A measured comparison from `tells.md`: the share of reference pages against AI-built pages, or the reference range. "Gradient text appears on 16% of reference landing pages and 32% of AI-built ones."
- A UX law from `ux-laws.md`: its name, its plain-words statement, then what that costs this user on this screen. "Fitts's Law: a target takes longer to hit as it gets smaller. At 18 px tall, this link is the main route to the games list and the hardest control on the screen to press."
- A threshold: "Contrast is 2.9:1. Text needs 4.5:1."

When the evidence is weak, say so in the same breath: "Emoji in a heading appears on 11% of reference pages and 12% of AI-built ones, so it is no tell. It is listed because this one is decoration." A reason states an effect on the user or a distance from a measured range. Replace a verdict such as "looks generic" or "feels heavy" with the observation that led to it.

**Fix.** The change, and the place in the code where it is made once.

## Audit format

```markdown
# Squeegee audit: <target>

**Grimy (heavy slop).** <Two sentences a stranger would understand: what the screens are, and the main reason for the rating in numbers.>

## In short

- **Rating:** Grimy, set by sprawl: 3 of 4 sprawl measures are over their limit.
- **Largest problems:** 1. Text comes in 16 sizes and 11 weights. 2. 38 small uppercase labels sit above headings, cards and buttons. 3. The display font is never loaded, so headings change face on Mac and phones.
- **Works and stays:** <the product-specific parts: art, layout, color that passed the removal test>
- **Screens:** 3 of 3 audited (Home, Shop, Games).
- **Counts:** 3 defects, 6 tells, 2 of 9 stock defaults, 3 of 4 sprawl measures over, 5 of 30 UX laws failed, 1 report only.

## Broken

Defects. Squeegee always fixes these.

### 1. "Browse all games" is 18 px tall (L01, small tap target)
- Seen: 129 by 18 px on Home at 1440 px and 390 px. `client/index.html:212`.
- Why it counts: Fitts's Law: a target takes longer to hit as it gets smaller. The floor is 24 px, and 44 px on touch screens. This link is the main route to the games list.
- Fix: pad the hit area to 44 px tall in `.browse-link`. The text keeps its size.

## Reads as generated

Tells, the stock-default cluster and sprawl. Largest first.

### 2. Six pairs of text sizes sit 1 px apart (S01, text sizes 1 px apart)
- Seen: 11, 12, 13, 14, 15, 16, 17, 19, 28, 30, 37, 42, 46, 49, 72 and 86 px on Home at 1440 px. The stylesheets hold 111 distinct `font-size` values.
- Why it counts: 87% of professionally made pages hold 4 such pairs or fewer, and 39% of agent-written pages hold more. Law of Similarity: items that look alike are read as the same kind of thing. Sizes 1 px apart make the same kind of label look like two kinds.
- Fix: map every size to a nine-step scale of tokens in `client/src/styles/main.css`, then replace each literal with its token.

## UX law findings

Failed question UX laws that are not already listed above. They leave the rating unchanged.

### 7. Each game card carries four text layers (Cognitive Load)
- Seen: a category label, a title, a tagline and a description on each of 6 cards on Home.
- Why it counts: Cognitive Load: every element the user must read spends limited effort. The label repeats the section heading, so 6 of 24 lines add nothing.
- Fix: needs your approval, because it removes copy. Proposed: drop the category label inside its own section.

## Evidence

### First look
<The four lines per layout group from step 1: what the screen is for, what works and stays, what reads as generated, what is broken.>

### Detector candidates: 4 confirmed, 7 rejected, 2 out of reach
<One line for each rejected or out-of-reach candidate, with the reason.>

### Stock defaults: 2 of 9

| Id | Stock default | Result | Seen |
|---|---|---|---|
| D04 | Inter | present | Body text on every screen |
| D07 | Body text under 16 px | present | Most-used size is 13 px |
| D01 | shadcn theme variables | absent | No theme variables in the project |

<All nine, one row each.>

### Sprawl measures: 3 of 4 over

| Id | Measure | Home | Shop | Limit | Over |
|---|---|---|---|---|---|
| S01 | Text sizes 1 px apart | 6 | 5 | 4 | yes |

<S01 to S08 from `measure.js` at 1440 px, one row each, one column per screen. S01 to S04 are the sprawl measures. S05 to S08 count as tells when over.>

### Source variation: 3 of 8 over

| Id | Measure | Value | Limit | Over |
|---|---|---|---|---|
| V01 | Tracked uppercase labels per 1,000 lines | 5.16 | 0.15 | yes |

<V01 to V08 from `variation` in `detect.json`, one row each. Write "not measured: under 3,000 lines of interface code" or "not run" in place of the table when that applies.>

### UX laws: 30 checked

| UX law | Result | Seen |
|---|---|---|
| Fitts's Law | Fail | 1 control under 24 px, 9 under 44 px at 390 px. Finding 1. |
| Goal-Gradient Effect | Not applicable | No multi-step flow on these screens |
| Doherty Threshold | Not run | The browser tool cannot time a response |

<All 30 rows, in the order of `ux-laws.md`. One table for screens that share a layout.>

## Report only
<Proof claims with no source, placeholder content, missing terms or privacy pages, missing controls. One line each with file:line. Squeegee reports these and the owner supplies them.>

## Kept by decision
<Entries from .squeegee.md that matched a finding.>

## Left alone
<What you looked at and chose to keep, with the reason. At least two items.>

## Coverage

| Check | Result |
|---|---|
| Detector | passed, 41 files, 12 candidates, 2 of 9 stock defaults |
| Screens | 3 of 3 audited |
| Rendered look, 1440 px and 390 px | passed |
| Images saved | passed, 12 files in `.squeegee/shots/` |
| Dark mode | not run: the page has no dark mode |
| 320 px overflow | failed: `Pricing` scrolls sideways |
| Measure script | passed at 1440 px and 390 px on 3 screens |
| Worst-case content (X06) | reported: 6 card titles are cut off with no ellipsis at 390 px |
| Contrast (J06) | failed: 12% of text under 4.5:1, lowest 2.9:1 |
| Faces loaded (X05) | failed: Rajdhani is named and never loaded |
| Target sizes (Fitts's Law) | failed: 1 control under 24 px, 9 under 44 px at 390 px |
| Focus visible (X02) | not run: the browser tool cannot send key presses |
| Hover and active states (J19) | passed |
| UX laws | 30 answered: 22 pass, 5 fail, 2 not applicable, 1 not run |

## Shared definitions this fix would touch
<Each token or variant, with the files that use it. Mark any outside the target.>

## Proposed depth
<lite, full or deep, with one sentence of reason.>

## What a run would do
<Two or three lines: how many directions it would show, which pass groups it would run, and the largest visible changes.>

## Not checked
Squeegee looks for the generated look and for the defects in its rules. It leaves the product's content, features and flows to the owner. <Add any screen or state that was out of reach, such as screens behind a sign-in.>
```

The audit is complete when:

- every finding has Seen, Why it counts and Fix
- the evidence tables hold 9 stock defaults, 8 sprawl and count rows, 8 source variation rows (or the reason there are none) and 30 UX laws
- every coverage row above is present with a result. A check you skipped reads "not run" with the reason.

With several layout groups, give each evidence table one column per group, and put the worst group's numbers in the Counts line with the group named.

In default mode the directions from step 5 follow the audit. Unless `--no-shots`, link `.squeegee/directions.html`. Then ask once for approval, a depth and a direction.

## Final report format

```markdown
# Squeegee report: <target>

**Before: Grimy (heavy slop). After: Spotless (no slop).** <If the blind recheck ran, give its tier too. If it did not, write "self-graded".>

Findings: 13 before, 1 after. Stock defaults: 6 of 9 before, 1 of 9 after. Sprawl: 3 of 4 over before, 0 after.

## What changed
<Three to six lines, each a result the user can see. "Body text is 16 px in Söhne, up from 14 px in the system font.">

## Still open

| Id | What | Why it remains |
|---|---|---|
| R02 | "Trusted by 10,000+ teams" in `Hero.tsx:22` | Report only. Needs a source from you. |
| J10 | Sections share one template | Needs `full` depth. This run was `lite`. |

Each row gives one of four reasons: kept by your decision, needs a deeper depth, report only, or needs your approval. In `fix` mode, changes that need approval (such as H01 and copy changes) are listed here and left unapplied.

## Left alone
<What you chose to keep, and why.>

## Checks

| Check | Result | Evidence |
|---|---|---|
| Preservation | passed | 14 of 14 links, 6 of 6 fields, 9 of 9 handlers, 3 of 3 test ids |
| Typecheck | passed | `npm run typecheck`, exit 0 |
| Build | passed | `npm run build`, exit 0 |
| Tests | not run | The project has no test script |
| Dark mode parity | passed | Both modes captured before and after |
| Worst-case content | reported | 0 boxes break at 1440 px and 390 px, 6 before |
| Interactions exercised | passed | 3 links followed, 1 form submitted, 1 dialog opened and closed |
| Scored UX laws, second pass | passed | All 8 rerun on the finished screen |
| Direction contract | passed | 9 of 9 ingredients match `.squeegee/direction.json` |
| Blind recheck | passed | Fresh subagent rated Spotless and found the screen matches the approved preview |

## Files changed
<From .squeegee/changes.jsonl, grouped by pass. Mark shared definitions and list their consumers.>

## See it
Before and after: `.squeegee/compare.html` (omit this section with `--no-shots`)
```

A result of "passed" means the check ran and you can name its evidence. A visual result is "verified" only after a rendered look.

## The decisions file

`.squeegee.md` lives at the project root and is meant to be committed. Squeegee reads it at the start of every run and writes to it when the user makes a decision.

```markdown
# Squeegee decisions

## Direction
Chosen 2026-11-12: "Ledger, from ref 1".
- Refs: 1 `https://example.com` (ground, type), 2 `moodboard.png` (radius, read by eye)
- Ground `#ffffff`, ink `#1c2430`, accent `#1f56c4` from the product
- Type: Inter, headline 48 px at weight 500, body 16 px
- Radius 4 px, hairline borders, no shadows

## Kept
- J01 purple accent, everywhere. Reason: it is the brand color, in the logo since 2021.
- T03 checkmark list, `components/Onboarding.tsx`. Reason: it is a real checklist the user completes.
```

Rules:

- The direction lines hold the contract values, so a later run can rebuild `.squeegee/direction.json` from them.
- Every kept entry names the rule id, where it applies (a file, a component or everywhere), and a reason of at least a few words.
- A kept entry silences that rule only in the scope it names.
- More than 5 kept tells is itself reported in the audit. The file records deliberate choices, and a long list means the skill has been switched off by hand.
- The user revises a decision by editing or deleting the line. Kept entries stay until the user removes them.
