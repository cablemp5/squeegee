# Reports

Squeegee writes two reports: the audit at step 4 and the final report at step 9. Both follow the writing rules below. A reader should be able to act on either without reading the code.

## Writing rules

1. Plain words. "Use", not "utilize". "Help", not "facilitate".
2. Active voice with a named actor. "The detector found 4 candidates", not "4 candidates were found".
3. Numbers instead of adjectives. "14 findings", "contrast 2.9:1", never "many" or "poor".
4. Say what a thing does, not how it feels. "The headline is 72 px at weight 800 and centered", not "the hero feels heavy".
5. One idea per sentence. If a reader would have to backtrack, split it.
6. Sentence case for headings.
7. No em dashes. Use a period or a comma.
8. No bold label followed by a colon that restates the line. A bold lead-in that names an item and is followed by new detail is fine.
9. No decorative emoji. No praise, no apology, no closing pleasantries.
10. No figure of speech where a literal phrase exists.
11. Every finding carries a `file:line`. Every pass carries the evidence that it passed.
12. Uncertainty is stated once, where it applies: "not run", "unverified", "self-graded".

## Audit format

```markdown
# Squeegee audit: <target>

**Tier: Grimy (heavy slop).** <One sentence of reason.>

Stock defaults: 6 of 9. Findings: 3 defects, 7 tells, 2 report only, 1 kept by decision.

## The read
<The four lines written before the detector output: what the screen is for, what works and stays, what reads as generated, what is broken.>

## Findings

| Id | Tier | Law | Where | What | Fix |
|---|---|---|---|---|---|
| X02 | Defect | Similarity | `components/ui/button.tsx:14` | Focus outline removed, no replacement | Add a focus-visible ring in the button variant |
| D01 | Default | | `app/globals.css:8` | shadcn theme holds stock values | Replace in group 1 |

Order: defects, tells, the default cluster, judged tells. Within a tier, group by law.

## Stock defaults present
<The list from the detector, each confirmed or rejected.>

## Report only
<Proof claims with no source, placeholder content, missing terms or privacy pages, missing controls. One line each with file:line. State that squeegee will not write these.>

## Kept by decision
<Entries from .squeegee.md that matched a finding.>

## Left alone
<What you looked at and chose not to change, with the reason. At least two items.>

## Coverage

| Check | Result |
|---|---|
| Detector | passed, 16 candidate rules and 9 default checks, 41 files |
| Rendered look, 1440 px and 390 px | passed |
| Dark mode | not run: the page has no dark mode |
| 320 px overflow | failed: `Pricing` scrolls sideways |
| Law checks | 5 run, 1 not run (Fitts: no computed sizes without a browser tool) |

## Shared definitions this fix would touch
<Each token or variant, with the files that use it. Mark any outside the target.>

## Proposed depth
<lite, full or deep, with one sentence of reason.>
```

How the audit ends depends on the mode:

- `audit`: end after the proposed depth. Ask nothing.
- Default mode: follow the audit with the directions from step 5, then ask once for approval, a depth and a direction.
- `fix`: do not ask for approval of the findings. Continue to step 5.

## Final report format

```markdown
# Squeegee report: <target>

**Before: Grimy (heavy slop). After: Spotless (no slop).** <If the blind recheck ran, give its tier too. If it did not, write "self-graded".>

Findings: 13 before, 1 after. Stock defaults: 6 of 9 before, 1 of 9 after.

## What changed
<Three to six lines, each a result the user can see. "Body text is 16 px in Söhne, up from 14 px in the system font.">

## Still open

| Id | What | Why it remains |
|---|---|---|
| R02 | "Trusted by 10,000+ teams" in `Hero.tsx:22` | Report only. Needs a source from you. |
| J10 | Sections share one template | Needs `full` depth. This run was `lite`. |

Each row gives one of three reasons: kept by your decision, needs a deeper depth, or report only.

## Left alone
<What you chose not to change, and why.>

## Checks

| Check | Result | Evidence |
|---|---|---|
| Preservation | passed | 14 of 14 links, 6 of 6 fields, 9 of 9 handlers, 3 of 3 test ids |
| Typecheck | passed | `npm run typecheck`, exit 0 |
| Build | passed | `npm run build`, exit 0 |
| Tests | not run | The project has no test script |
| Dark mode parity | passed | Both modes captured before and after |
| Interactions exercised | passed | 3 links followed, 1 form submitted, 1 dialog opened and closed |
| Blind recheck | passed | Fresh subagent rated Spotless |

## Files changed
<From .squeegee/changes.jsonl, grouped by pass. Mark shared definitions and list their consumers.>

## See it
Before and after: `.squeegee/compare.html` (omit this section with `--no-shots`)
```

Never write "passed" for a check that did not run. Never call a visual result verified without a rendered look.

## The decisions file

`.squeegee.md` lives at the project root and is meant to be committed. Squeegee reads it at the start of every run and writes to it when the user makes a decision.

```markdown
# Squeegee decisions

## Direction
Chosen 2026-11-12: "Trust ledger", bent to the brand.
- Ground `oklch(0.98 0.005 95)`, ink `oklch(0.2 0.01 95)`, accent `oklch(0.52 0.14 150)`
- Type: Söhne, headline weight 500
- Radius 4 px, hairline borders, no shadows
- Reference given: none

## Kept
- J01 purple accent, everywhere. Reason: it is the brand color, in the logo since 2021.
- T03 checkmark list, `components/Onboarding.tsx`. Reason: it is a real checklist the user completes.
```

Rules:

- Every kept entry names the rule id, where it applies (a file, a component or everywhere), and a reason of at least a few words.
- A kept entry silences that rule only in the scope it names.
- More than 5 kept tells is itself reported in the audit. The file exists to record deliberate choices, and a long list means the skill has been switched off by hand.
- To revise a decision, the user edits or deletes the line. Squeegee never removes a kept entry on its own.
