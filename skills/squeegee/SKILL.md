---
name: squeegee
description: Cleans AI-looking UI that already exists. Audits every screen, rates it Spotless, Streaky, Grimy or Opaque, shows design directions on the real page, then fixes it at the theme source with everything still working. Run it with /squeegee.
disable-model-invocation: true
argument-hint: "[audit|fix] [lite|full|deep] <path or URL> [--ref <url or image>]... [--no-shots] [--no-recheck]"
license: MIT
---

# Squeegee

An interface looks generated when nobody chose anything. Two measured patterns show it, and `references/tells.md` holds the numbers:

- **Sprawl.** Text sizes a pixel apart, many weights, small uppercase labels and tiny text: more than one system would hold. It marks an interface a coding agent wrote one request at a time, even one with its own art. Agent-written sites show it about four times as often as professionally made ones.
- **Stock defaults.** The values a tool ships with, left in place. One alone means nothing. A cluster of them marks a page from an AI site builder, and about a quarter of agent-written pages.

The job is to make the choices that were never made: from the product itself, at the source in the code, with everything that works still working.

## Rules for every run

1. **Work with what exists.** Reorder, reweight and restyle it. The run ends with the same features, sections, content, metrics, calls to action, pricing tiers, forms, claims, numbers, testimonials, logos and legal text it started with: none added, none removed. Report missing or unsourced proof for the owner to supply.
2. **Everything that works keeps working.** Every route, link, form field, handler, `id`, `name`, `data-testid`, `aria-*` attribute, `"use client"` directive and exported prop signature survives the run, and each handler still does what it did.
3. **The owner approves identity changes.** Brand color, logo, product name, and the wording or meaning of content change only with the user's approval.
4. **Fix at the source.** Theme tokens, the Tailwind theme, shared component variants. Before editing a shared definition, list every file that uses it. When one sits outside the target, add a new variant or ask to widen the scope.
5. **The project's own design system wins.** The values in the references fill in where the project made no choice.
6. **Replacements come from the product.** Its brand assets, its audience, its content, or a reference the user gave. A second stock choice in place of the first is the same finding again.
7. **Run the removal test on every decoration.** Name its job and picture the screen without it. When nothing the user needs gets worse, delete it and leave the space empty. When something gets worse, keep the job and do it with the plainest means.
8. **A finding needs proof that it reaches a screen you audited.** The code path renders there, and nothing overrides it.
9. **Every check gets a result.** Passed, failed or not run, for every row of the coverage list in `references/report.md`. "Passed" means you ran it and can name the evidence. Without a rendered page, visual results are "unverified".
10. **Git stays the user's.** Make no commits. Restore only files this run changed, from this run's own backups. `git checkout`, `git restore`, `git stash` and `git clean` are off limits, because the tree may hold uncommitted work.
11. **A Spotless screen is finished.** Say so and stop.
12. **Controls stay conventional.** Character goes into type, color, spacing and imagery. Navigation, forms and controls keep the behavior users already know.

## Arguments

| Argument | Meaning |
|---|---|
| `audit` | Report only. Runs steps 0 to 4. Nothing outside `.squeegee/` changes. |
| `fix` | Applies the findings without stopping for approval. See "Stops". |
| neither | Audit, propose, stop once for approval, then fix. The default. |
| `lite` | Fixes presentation only: tokens, type, color, spacing, states of existing elements. Elements and sections stay where they are. |
| `full` | Fixes may also restructure a section that has a layout tell. |
| `deep` | Fixes may also rework the page, add loading, empty and error states where the code already tracks that state, and fix failed question UX laws. |
| `<path or URL>` | A file or folder is the target. A URL is where to look: the target is then the project folder that serves it, so pass that folder to the detector. |
| `--ref <url or image>` | A design the user wants this to feel like. It may repeat, as many times as the user likes. Each ref is measured. Several refs feed one direction with one preview, unless the user says they are alternatives. Refs outrank the archetypes. |
| `--no-shots` | Save no images and build no `compare.html` or `directions.html`. You still look at the screen. |
| `--no-recheck` | Skip the blind recheck. |

Depth limits the fixes. The audit is the same in every mode and at every depth: every screen, every rule, all 30 UX laws.

With no depth given, the tier proposes one: Streaky `lite`, Grimy `full`, Opaque `deep`. In `fix` mode that depth stops at `full` unless the user typed `deep`.

Directions: `references/directions.md` says how many to prepare and from what. Without a ref it is three when the tier is Grimy or Opaque and the depth is `full` or `deep`, and otherwise one that keeps the existing design. Every direction is previewed on the real page and states its choices as numbers. A direction recorded in `.squeegee.md` is used as it is when the run names no ref.

## Stops

- **Default mode:** one stop. Present the audit, the proposed depth and the directions together, then wait.
- **`fix` mode:** no stop for the findings. Stop for a direction only when two or more are prepared and the choice is open: none is recorded, and the refs do not make exactly one direction. When the refs make one direction, take it. Changes that need approval (rule 3, H01, copy changes) go under "Still open" in the final report, unapplied.
- **Any mode:** stop when a check fails after the repair rounds, or when a shared definition has consumers outside the target and no variant can isolate the fix. Outside `fix` mode, also stop when a change needs approval under rule 3.

## Run

### 0. Set up

1. Create `.squeegee/.gitignore` containing `*`, so nothing Squeegee writes shows up in git. Delete `.squeegee/shots/` left by an earlier run.
2. Save the baseline: `git status --porcelain` to `.squeegee/start-status.txt`, and `git diff | git hash-object --stdin` to `.squeegee/start-diff.txt`. The hash catches a new edit to a file that was already modified. Name any uncommitted changes as the user's. Outside a git repository, say so in the report and rely on `.squeegee/changes.jsonl` and the preview backups.
3. Read `.squeegee.md` if it exists: it holds kept decisions and the chosen direction.
4. Run `node <skill folder>/scripts/detect.mjs <target> --json > .squeegee/detect.json`. Read its `stack` field now and leave the candidates for step 2. With CSS-in-JS or a native toolkit the line rules do not apply: report the detector as not run and continue.
5. Find a browser tool, in this order: Playwright MCP, Chrome DevTools MCP, the harness's own browser. For a native app, use a simulator or device screenshot tool, or ask for screenshots. With none, continue on code alone and recommend one in the report. Use only tools that are already installed.
6. Find the page: the URL argument, then a local server that is already running, then ask before starting the project's dev script.
7. With a URL, check that the target folder serves it: the page's title and `h1` appear in the folder's source. When they do not, say so at the top of the report, treat the detector's candidates as out of reach, and cite the rule in the live stylesheet where a finding needs a place.

Done when `detect.json` exists, the baseline is saved or reported absent, you have named the browser tool and the URL, and you have said whether the folder serves the URL.

### 1. Look first

1. List the screens. A file target is one screen. A URL or folder target is every route, view, panel and dialog reachable from its navigation. Screens that share one layout form a group: measure one and look at the rest. A screen you cannot reach (behind a sign-in, or reached only by changing data) is listed as out of reach.
2. View each screen at 1440 px and 390 px wide, in light and dark mode when both exist. Scroll it from top to bottom one viewport at a time: a full-page image hides pinned and scroll-revealed sections. Check 320 px for horizontal overflow.
3. For one screen of each layout group, at 1440 px and 390 px, evaluate the whole of `<skill folder>/scripts/measure.js` in a freshly loaded page, before any scrolling. Save the result as `.squeegee/measure-<screen>-<width>.json`, with `-dark` added for a dark-mode capture. `prefersDark` in the result says which mode the page rendered in. Without a browser tool that can evaluate a script (a code-only run, a native app, screenshots only), the measurements are "not run": say why in the coverage list.
4. Press Tab through the first ten controls and hover the main buttons. Note whether each shows a visible focus state and a hover state.
5. Unless `--no-shots`, save the images as `.squeegee/shots/before-<screen>-<width>-<mode>.png`. When the browser tool saves images elsewhere, copy them there.
6. Last on each measured screen, at both widths, evaluate the whole of `<skill folder>/scripts/stress.js`. It swaps the text of repeated items for worst-case content in the live page and returns what broke, for the report-only list. Save the result as `.squeegee/stress-<screen>-<width>.json`. Unless `--no-shots`, save an image as `.squeegee/shots/stress-<screen>-<width>.png`. Then reload the page. It is "not run" under the same conditions as item 3.
7. Before you study the detector's candidates, write four lines per layout group: what the screen is for, what works and stays, what reads as generated, what is broken. They go in the report under "First look".

Done when every layout group has a measure file and a stress file for both widths or a stated reason for having none, every listed screen is viewed or named as out of reach, and the four lines are written.

### 2. Audit

Load `references/tells.md` and `references/ux-laws.md`. Read the candidates, defaults, `variation` and `styles` counts in `detect.json`, and the measure files.

1. Confirm or reject each detector candidate under rule 8. Count the stock defaults from `defaults` in the measure file, and use the detector to find each one in the code. With no measure file, count the detector's defaults that you confirm.
2. Count the sprawl measures that are over their limit at 1440 px. Reject a measure that is over only because of text that is not the interface's own type, such as an embedded product demo or a code sample, and say so in the table. When `variation` in `detect.json` has 3 or more over, look for that sprawl on every screen.
3. Scan the `broken` entries in the stress files. Report as X06 the ones whose text comes from data that can grow: a name, a title someone types, a count, a list. The rest need no listing.
4. Weigh every judged tell in `tells.md` against the screen.
5. Answer all 30 UX laws for each layout group.
6. Drop anything `.squeegee.md` keeps.

Done when every candidate and default is confirmed or rejected, each of the 8 counts (S01 to S08) has a result ("not run" when there are no measurements), and all 30 UX laws have a result for each layout group.

### 3. Rate the tier

Use the table under "Tiers". Rate each layout group and report the worst as the tier. Give one sentence of reason that names what set it: defects, tells, stock defaults or sprawl.

### 4. Report

Load `references/report.md` and write the audit to `.squeegee/audit.md`. Done when its completion list holds. `audit` ends here. A Spotless tier ends here in every mode.

### 5. Set the direction

Load `references/passes.md` and take the preservation inventory before any file changes. Then load `references/directions.md`: measure each ref, save each direction with its contract, preview it on the real page, and check the preview against its contract. "Stops" says when to wait for the user.

Done when `.squeegee/before.json` exists, each preview passed its own contract check, and the chosen direction is saved as `.squeegee/direction.json` and recorded in `.squeegee.md`.

### 6. Fix in three pass groups

Follow `references/passes.md`: theme and tokens, then structure and copy, then motion. After each group, look at the screen, run the project's typecheck, build and tests, compare the preservation inventory, and append each change to `.squeegee/changes.jsonl`. When a check fails, repair and check again, three rounds at most per group. When it still fails, restore that group's edits, stop, and report.

### 7. Check for over-correction

Check the finished screen against every row of the table in `references/directions.md`, then run its two last tests. Undo a fix that landed on another template.

### 8. Blind recheck

At `full` and `deep`, unless `--no-recheck`. Start a fresh subagent with the final screenshots, the code, the URL of the finished page, this skill, the chosen direction file and its approved preview image, and nothing else: no first audit, no before images, no measure files, no list of changes. It takes its own measurements with `measure.js` (step 1, item 3), runs steps 2 and 3, and returns a tier, findings, and whether the finished screen is the approved preview. Report its verdict in its own words. When its tier is worse than yours, do one more fix round, then stop. With no subagents available, rerun the detector and label the tier "self-graded".

### 9. Finish

Take the final look and run `measure.js` again, so the report gives each sprawl measure before and after. Run `direction.mjs check` on the result, as "Holding the result to the contract" in `references/directions.md` says. Run `stress.js` again and reload. Rerun the eight scored UX laws on the finished screen. Unless `--no-shots`, save `after-*` images and run `node <skill folder>/scripts/compare.mjs .squeegee/shots` to build `compare.html`. Compare `git status --porcelain` with the baseline and confirm that every difference is a change you logged. Report any file that changed and is missing from `changes.jsonl`. Write the final report.

Done when every row of the final report's "Checks" table has a result.

## Tiers

| Tier | Meaning | Anchor |
|---|---|---|
| Spotless | no slop | No confirmed defects, 2 confirmed tells or fewer, fewer than 5 stock defaults, 2 sprawl measures over or fewer. |
| Streaky | light slop, or a defect on a clean screen | Any confirmed defect, or 3 or 4 confirmed tells, on a design that was otherwise chosen. The screen still fits only this product. |
| Grimy | heavy slop | 5 or more stock defaults, or 5 or more confirmed tells, or 3 or more sprawl measures over. Parts of the screen would fit any product, or no system holds the screen together. |
| Opaque | slop maxed | 7 or more stock defaults, or 8 or more confirmed tells, or the whole screen still fits after you swap in another product's name. |

Count only what you confirmed on a screen you audited, and count one cause once, whichever rules and UX laws name it. The stock-default anchors describe screens of 250 words or more: on a shorter screen, such as a sign-in form or a dialog, report the count and rate by defects and tells. Sprawl measures are S01 to S04 in `references/tells.md`, read from `measure.js`. S05 to S08 count as tells when over. Product-specific art leaves a sprawl tier where it is: a screen can fit only this product and still be Grimy. `references/ux-laws.md` says how a failed UX law counts.

In a run with no rendered page, the source stands in for the sprawl measures: 5 or more of the eight source variation measures over (V01 to V08, `variation` in `detect.json`) is the Grimy anchor, a count no hand-made repo in the bench reaches. Say in the rating that it is unverified.

## Rule tiers

| Tier | What Squeegee does |
|---|---|
| Defect | Always fixes it. |
| Tell | Fixes it unless `.squeegee.md` keeps it. |
| Stock default | Counts it toward the tier. From the Grimy anchor up, customizes all of them at the theme. Below it, leaves them. |
| Sprawl measure | Counts it toward the tier. From the Grimy anchor up, consolidates sizes, weights, colors and labels into one scale at the theme. Below it, leaves them. |
| Source variation | Uses it to find sprawl in the code. It sets the tier only in a run with no rendered page. From the Grimy anchor up, moves the one-off values into the theme. |
| Judged tell | Weighs it with the removal test: is this the stock version or a deliberate one? |
| Report only | Proof claims with no source, placeholder content, missing terms or privacy pages, missing controls, boxes that break with worst-case content. Reports them for the owner to act on. |
| House rule | Em dashes in interface copy. Fixes with approval. The evidence does not mark them as an AI tell. |

## References

| File | Load it |
|---|---|
| `scripts/measure.js` | At steps 1 and 9. One expression to evaluate in the page. It returns the sprawl measures, the nine stock defaults as rendered, the ingredients of a direction, faces that are not loaded, contrast, target sizes and overflow. It reads a reference page the same way. |
| `scripts/direction.mjs` | At steps 5 and 9. `deal` gives a starting hand for one direction. `check` compares a direction's contract with a measure file and prints what matches. |
| `scripts/stress.js` | At steps 1 and 9, after `measure.js`. One expression to evaluate in the page. It fills repeated items with long names, one unbroken word and large numbers, then returns the boxes that spill, cut text off or make the page scroll sideways. |
| `references/tells.md` | At step 2. Every tell with its evidence and fix, the sprawl and source variation measures, plus dashboard, mobile and desktop sections. |
| `references/ux-laws.md` | At step 2. All 30 UX laws: the plain-words statement of each, and what the audit asks. |
| `references/report.md` | At steps 4 and 9. Report formats, how to ground a finding, the `.squeegee.md` format. |
| `references/passes.md` | At step 5 for the preservation inventory, and again immediately before the first edit in step 6. |
| `references/directions.md` | At steps 5, 7 and 9. How to read refs, how many directions to prepare, the contract each one states, the archetypes, the over-correction table. |
