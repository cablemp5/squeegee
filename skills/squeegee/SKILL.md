---
name: squeegee
description: Cleans AI-looking UI that already exists. Audits a page, screen or app for the measured signature of generated interfaces (stock theme variables, default icons, no chosen font, a heavy headline, a badge above it), rates it Spotless, Streaky, Grimy or Opaque, shows three design directions rendered on the real page, then fixes it at the theme source while keeping every link, field and handler working. Covers landing pages, dashboards, desktop apps and mobile apps. Never builds new UI. Run it with /squeegee.
disable-model-invocation: true
argument-hint: "[audit|fix] [lite|full|deep] <path or URL> [--ref <url or image>] [--no-shots] [--no-recheck]"
license: MIT
---

# Squeegee

An interface looks generated when nobody chose anything. The research behind this skill measured 565 professionally made sites and 273 pages published from AI builders. Purple gradients, three-card rows and bento grids were about as common on the good sites as on the generated ones. What marked the generated pages was a cluster of stock defaults: shadcn-style theme variables, Lucide icons, no chosen font, a heavy headline, a badge above it. Five or more of nine such defaults appeared on 2% of the reference landing pages and 76% of the AI-built ones. That is an association in one sample, and `research/RESULTS.md` lists its limits.

So the job is to make the choices that were never made, from the product itself, at the place in the code where they belong, without breaking anything that works.

## Rules that hold even if you read nothing else

1. Fix existing UI only. Never add a feature, a section, a claim, a number, a testimonial, a logo or legal text. Never delete content, a metric, a call to action, a pricing tier or a form: reorder and reweight what exists.
2. Everything that works keeps working: every route, link, form field, handler, `id`, `name`, `data-testid`, `aria-*` attribute, `"use client"` directive and exported prop signature survives the run, and each handler still does what it did.
3. Brand color, logo, product name and the meaning of the content change only with the user's approval.
4. Fix at the source: theme tokens, the Tailwind theme, shared component variants. Before editing a shared definition, list every file that uses it. If one sits outside the target, add a new variant or ask to widen the scope.
5. A project's own design system wins. The values in the references are defaults for where no choice exists.
6. Never swap one stock choice for another. A replacement comes from the product: its brand assets, its audience, its content, or a reference the user gave.
7. Run the removal test on every decoration: name its job, picture the screen without it. If nothing the user needs gets worse, delete it and add nothing in its place. If something gets worse, keep the job and do it with the plainest means.
8. A finding counts only when you have shown it reaches the screen under audit: the code path renders there, and nothing overrides it.
9. Report every check as passed, failed or not run. Without a rendered page, call visual results unverified.
10. Make no commits. Never revert or clean files you did not change in this run.
11. When the screen is Spotless, say so and stop. Changing a good screen to make it different is a failure.

## Arguments

| Argument | Meaning |
|---|---|
| `audit` | Report only. Stops after the audit. No file outside `.squeegee/` is touched. |
| `fix` | Applies the findings without stopping for approval. See "Stops" below. |
| neither | Audit, propose, stop once for approval, then fix. The default. |
| `lite` | Presentation only: tokens, type, color, spacing, states of existing elements. No new elements, no moved sections. |
| `full` | May restructure a section that has a layout tell. The default depth when the user gives none and approves the proposal. |
| `deep` | May rework the page, add missing loading, empty and error states where the code already tracks that state, and fix structural UX findings. |
| `<path or URL>` | A file or folder is the target. A URL is where to look: the target is then the project folder that serves it, so pass that folder to the detector. |
| `--ref <url or image>` | A design the user wants this to feel like. It outranks the archetypes. |
| `--no-shots` | Save no images and build no `compare.html`. You still look at the screen. |
| `--no-recheck` | Skip the blind recheck. |

## Stops

- **Default mode:** one stop. Present the audit, the proposed depth and the directions together, then wait.
- **`fix` mode:** no stop for the findings. Stop only if a direction is needed and none is available.
- **A direction is available without asking** when `.squeegee.md` records one or `--ref` is given. Use it and render no previews.
- **Any mode:** stop when a check fails after the repair rounds, when a shared definition has consumers outside the target and no variant can isolate the fix, or when a change needs approval under rule 3.

## Run

0. **Set up.** Save the output of `git status --porcelain` to `.squeegee/start-status.txt`: this is the baseline you compare against later. Create `.squeegee/.gitignore` containing `*`. Warn if the tree has uncommitted changes, and name them as the user's. Read `.squeegee.md` if it exists: it holds kept decisions and the chosen direction. Run `node <skill folder>/scripts/detect.mjs <target> --json` and read its `stack` field. If the styling system is CSS-in-JS or a native toolkit, the detector's line rules do not apply: the audit, tier, directions and judged fixes still run, and the report lists the detector as not run. Find a browser tool in this order: Playwright MCP, Chrome DevTools MCP, the harness's own browser. For a native app, use a simulator or device screenshot tool, or ask for screenshots. With none, continue on code alone and recommend one in the report. Never install one. For a page to look at, use the URL argument, then a local server that is already running, then ask before starting the project's dev script.
1. **Look first.** View the screen at 1440 px and 390 px wide, in light and dark mode when both exist, and check 320 px for horizontal overflow. Unless `--no-shots`, save the images as `.squeegee/shots/before-<width>-<mode>.png`. Before you read the detector's candidates, write four lines: what the screen is for, what works and stays, what reads as generated, what is broken.
2. **Audit.** Load `references/tells.md` and `references/ux-laws.md`. Confirm or reject each detector candidate and each stock default under rule 8. Add the judged tells and the six law checks. Drop anything `.squeegee.md` keeps.
3. **Rate the tier** from the table below. Give one sentence of reason.
4. **Report.** Load `references/report.md` and write the audit. `audit` ends here. A Spotless tier ends here in every mode.
5. **Set the direction.** Load `references/passes.md` and take the preservation inventory now, before any file changes. Then load `references/directions.md`. If a direction is available, use it. Otherwise: for Grimy or Opaque at `full` or `deep` (use the proposed depth when the user gave none), prepare three directions; for Streaky or `lite`, prepare one that keeps the existing design. In default mode, show the directions with the audit and stop. Save the chosen direction to `.squeegee.md`.
6. **Fix in three pass groups**, following `references/passes.md`: theme and tokens, then structure and copy, then motion. After each group: look at the screen, run the project's typecheck, build and tests, compare the preservation inventory, and append each change to `.squeegee/changes.jsonl`. If a check fails, repair and check again, three rounds at most per group. If it still fails, restore the edits of that group, stop, and report.
7. **Check for over-correction** with the table in `references/directions.md`. Undo a fix that landed on another template.
8. **Blind recheck** at `full` and `deep` unless `--no-recheck`. Start a fresh subagent with the final screenshots and the code, and nothing else: no first audit, no before images, no list of changes. It runs steps 2 and 3 and returns a tier and findings. If its tier is worse than yours, do one more fix round, then stop. With no subagents available, rerun the detector and label the tier self-graded.
9. **Finish.** Take the final look. Unless `--no-shots`, save `after-*` images and run `node <skill folder>/scripts/compare.mjs .squeegee/shots` to build `compare.html`. Compare `git status --porcelain` with the baseline and confirm that every difference is a change you logged. Write the final report.

There are five scheduled looks: before the audit, after each pass group, and at the end. Each repair round adds one.

## Tiers

| Tier | Meaning | Anchor |
|---|---|---|
| Spotless | no slop | No confirmed defects, 2 confirmed tells or fewer, fewer than 5 stock defaults. |
| Streaky | light slop | 3 or 4 confirmed tells on a design that was otherwise chosen. The screen still fits only this product. |
| Grimy | heavy slop | 5 or more stock defaults, or 5 or more confirmed tells. Parts of the screen would fit any product. |
| Opaque | slop maxed | 7 or more stock defaults, or 8 or more confirmed tells, or the whole screen still fits after you swap in another product's name. |

Count only what you confirmed on the screen under audit. Suggest a depth from the tier: Streaky suggests `lite`, Grimy suggests `full`, Opaque suggests `deep`.

## Rule tiers

| Tier | What squeegee does |
|---|---|
| Defect | Always fixes it. |
| Tell | Fixes it unless `.squeegee.md` keeps it. |
| Stock default | Never flags one alone. Flags 5 or more together, then customizes them at the theme. |
| Judged tell | No detector rule. Weighs it with the removal test and asks whether this is the stock version or a deliberate one. |
| Report only | Proof claims with no source, placeholder content, missing terms or privacy pages, missing controls. Reports them. Never writes them. |
| House rule | Em dashes in interface copy. Fixes with approval. The evidence does not mark them as an AI tell. |

## References

| File | Load it |
|---|---|
| `references/tells.md` | At step 2. Every tell with its evidence and fix, plus dashboard, mobile and desktop sections. |
| `references/ux-laws.md` | At step 2. The six scored law checks and the role of the other 24 laws. |
| `references/report.md` | At steps 4 and 9. Report formats, writing rules, the `.squeegee.md` format. |
| `references/passes.md` | At step 5 for the preservation inventory, and again immediately before the first edit in step 6. |
| `references/directions.md` | At steps 5 and 7. Archetypes, the rules for three directions, the over-correction table. |

## Never

- Never invent proof, scarcity, metrics, names or legal text.
- Never make interaction unusual. Character goes into the visuals. Navigation, forms and controls stay conventional.
- Never report a pass you did not run.
