---
name: squeegee
description: Cleans AI-looking UI that already exists. Audits every screen, rates it Spotless, Streaky, Grimy or Opaque, shows design directions on the real page, then fixes it at the theme source with everything still working. Run it with /squeegee.
disable-model-invocation: true
argument-hint: "[audit|fix] [lite|full|deep] <path or URL> [--ref <url or image>] [--no-shots] [--no-recheck]"
license: MIT
---

# Squeegee

An interface looks generated when nobody chose anything. Two measured patterns show it, and `references/tells.md` holds the numbers:

- **Stock defaults.** The values a tool ships with, left in place. One alone means nothing. A cluster of them marks a generated page.
- **Sprawl.** More text sizes, weights, colors and labels than one system would hold. It marks an interface that grew one request at a time, even one with its own art.

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
| `--ref <url or image>` | A design the user wants this to feel like. It outranks the archetypes. |
| `--no-shots` | Save no images and build no `compare.html` or `directions.html`. You still look at the screen. |
| `--no-recheck` | Skip the blind recheck. |

Depth limits the fixes. The audit is the same in every mode and at every depth: every screen, every rule, all 30 UX laws.

With no depth given, the tier proposes one: Streaky `lite`, Grimy `full`, Opaque `deep`. In `fix` mode that depth stops at `full` unless the user typed `deep`.

Directions: prepare three when the tier is Grimy or Opaque and the depth is `full` or `deep`. Otherwise prepare one that keeps the existing design. A direction recorded in `.squeegee.md` or given by `--ref` is used as it is, with no previews.

## Stops

- **Default mode:** one stop. Present the audit, the proposed depth and the directions together, then wait.
- **`fix` mode:** no stop for the findings. Stop for a direction only when three are called for and none is recorded or given. Changes that need approval (rule 3, H01, copy changes) go under "Still open" in the final report, unapplied.
- **Any mode:** stop when a check fails after the repair rounds, or when a shared definition has consumers outside the target and no variant can isolate the fix. Outside `fix` mode, also stop when a change needs approval under rule 3.

## Run

### 0. Set up

1. Create `.squeegee/.gitignore` containing `*`, so nothing Squeegee writes shows up in git. Delete `.squeegee/shots/` left by an earlier run.
2. Save the baseline: `git status --porcelain` to `.squeegee/start-status.txt`, and `git diff | git hash-object --stdin` to `.squeegee/start-diff.txt`. The hash catches a new edit to a file that was already modified. Name any uncommitted changes as the user's. Outside a git repository, say so in the report and rely on `.squeegee/changes.jsonl` and the preview backups.
3. Read `.squeegee.md` if it exists: it holds kept decisions and the chosen direction.
4. Run `node <skill folder>/scripts/detect.mjs <target> --json > .squeegee/detect.json`. Read its `stack` field now and leave the candidates for step 2. With CSS-in-JS or a native toolkit the line rules do not apply: report the detector as not run and continue.
5. Find a browser tool, in this order: Playwright MCP, Chrome DevTools MCP, the harness's own browser. For a native app, use a simulator or device screenshot tool, or ask for screenshots. With none, continue on code alone and recommend one in the report. Use only tools that are already installed.
6. Find the page: the URL argument, then a local server that is already running, then ask before starting the project's dev script.

Done when `detect.json` exists, the baseline is saved or reported absent, and you have named the browser tool and the URL.

### 1. Look first

1. List the screens. A file or URL target is one screen. A folder or app target is every route, view, panel and dialog reachable from its navigation. Screens that share one layout form a group: measure one and look at the rest. A screen you cannot reach (behind a sign-in, or reached only by changing data) is listed as out of reach.
2. View each screen at 1440 px and 390 px wide, in light and dark mode when both exist. Check 320 px for horizontal overflow.
3. For one screen of each layout group, at 1440 px and 390 px, evaluate the whole of `<skill folder>/scripts/measure.js` in the page. Save the result as `.squeegee/measure-<screen>-<width>.json`. Without a browser tool that can evaluate a script (a code-only run, a native app, screenshots only), the measurements are "not run": say why in the coverage list.
4. Press Tab through the first ten controls and hover the main buttons. Note whether each shows a visible focus state and a hover state.
5. Unless `--no-shots`, save the images as `.squeegee/shots/before-<screen>-<width>-<mode>.png`. When the browser tool saves images elsewhere, copy them there.
6. Before reading the detector's candidates, write four lines per layout group: what the screen is for, what works and stays, what reads as generated, what is broken.

Done when every layout group has a measure file for both widths or a stated reason for having none, every listed screen is viewed or named as out of reach, and the four lines are written.

### 2. Audit

Load `references/tells.md` and `references/ux-laws.md`. Read the candidates, defaults and `styles` counts in `detect.json`, and the measure files.

1. Confirm or reject each detector candidate and each stock default under rule 8. A measured value decides where one exists: the body size is the most-used text size, the headline is the rendered `h1`.
2. Count the sprawl measures that are over their limit.
3. Weigh every judged tell in `tells.md` against the screen.
4. Answer all 30 UX laws for each layout group.
5. Drop anything `.squeegee.md` keeps.

Done when every candidate and default is confirmed or rejected, the sprawl table has 8 rows (each "not run" when there are no measurements), and the UX laws table has 30 rows per layout group.

### 3. Rate the tier

Use the table under "Tiers". Rate each layout group and report the worst as the tier. Give one sentence of reason that names what set it: defects, tells, stock defaults or sprawl.

### 4. Report

Load `references/report.md` and write the audit to `.squeegee/audit.md`. Done when its completion list holds. `audit` ends here. A Spotless tier ends here in every mode.

### 5. Set the direction

Load `references/passes.md` and take the preservation inventory before any file changes. Then load `references/directions.md` and prepare the directions that "Arguments" calls for. "Stops" says when to wait for the user.

Done when `.squeegee/before.json` exists and the chosen direction is saved in `.squeegee.md`.

### 6. Fix in three pass groups

Follow `references/passes.md`: theme and tokens, then structure and copy, then motion. After each group, look at the screen, run the project's typecheck, build and tests, compare the preservation inventory, and append each change to `.squeegee/changes.jsonl`. When a check fails, repair and check again, three rounds at most per group. When it still fails, restore that group's edits, stop, and report.

### 7. Check for over-correction

Check the finished screen against every row of the table in `references/directions.md`, then run its two last tests. Undo a fix that landed on another template.

### 8. Blind recheck

At `full` and `deep`, unless `--no-recheck`. Start a fresh subagent with the final screenshots, the code, the URL of the finished page and this skill, and nothing else: no first audit, no before images, no measure files, no list of changes. It takes its own measurements with `measure.js` (step 1, item 3), runs steps 2 and 3, and returns a tier and findings. When its tier is worse than yours, do one more fix round, then stop. With no subagents available, rerun the detector and label the tier "self-graded".

### 9. Finish

Take the final look and run `measure.js` again, so the report gives each sprawl measure before and after. Rerun the eight scored UX laws on the finished screen. Unless `--no-shots`, save `after-*` images and run `node <skill folder>/scripts/compare.mjs .squeegee/shots` to build `compare.html`. Compare `git status --porcelain` with the baseline and confirm that every difference is a change you logged. Report any file that changed and is missing from `changes.jsonl`. Write the final report.

Done when every row of the final report's "Checks" table has a result.

## Tiers

| Tier | Meaning | Anchor |
|---|---|---|
| Spotless | no slop | No confirmed defects, 2 confirmed tells or fewer, fewer than 5 stock defaults, 2 sprawl measures over or fewer. |
| Streaky | light slop, or a defect on a clean screen | Any confirmed defect, or 3 or 4 confirmed tells, on a design that was otherwise chosen. The screen still fits only this product. |
| Grimy | heavy slop | 5 or more stock defaults, or 5 or more confirmed tells, or 3 or more sprawl measures over. Parts of the screen would fit any product, or no system holds the screen together. |
| Opaque | slop maxed | 7 or more stock defaults, or 8 or more confirmed tells, or the whole screen still fits after you swap in another product's name. |

Count only what you confirmed on a screen you audited. Sprawl measures are S01 to S05 in `references/tells.md`, read from `measure.js`. Product-specific art leaves a sprawl tier where it is: a screen can fit only this product and still be Grimy. `references/ux-laws.md` says how a failed UX law counts.

## Rule tiers

| Tier | What Squeegee does |
|---|---|
| Defect | Always fixes it. |
| Tell | Fixes it unless `.squeegee.md` keeps it. |
| Stock default | Counts it toward the tier. From the Grimy anchor up, customizes all of them at the theme. Below it, leaves them. |
| Sprawl measure | Counts it toward the tier. From the Grimy anchor up, consolidates sizes, weights, colors and labels into one scale at the theme. Below it, leaves them. |
| Judged tell | Weighs it with the removal test: is this the stock version or a deliberate one? |
| Report only | Proof claims with no source, placeholder content, missing terms or privacy pages, missing controls. Reports them for the owner to supply. |
| House rule | Em dashes in interface copy. Fixes with approval. The evidence does not mark them as an AI tell. |

## References

| File | Load it |
|---|---|
| `scripts/measure.js` | At steps 1 and 9. One expression to evaluate in the page. It returns the sprawl measures, faces that are not loaded, contrast, target sizes and overflow. |
| `references/tells.md` | At step 2. Every tell with its evidence and fix, the sprawl measures, plus dashboard, mobile and desktop sections. |
| `references/ux-laws.md` | At step 2. All 30 UX laws: the plain-words statement of each, and what the audit asks. |
| `references/report.md` | At steps 4 and 9. Report formats, how to ground a finding, the `.squeegee.md` format. |
| `references/passes.md` | At step 5 for the preservation inventory, and again immediately before the first edit in step 6. |
| `references/directions.md` | At steps 5 and 7. Archetypes, what a direction states, the over-correction table. |
