# Laws of UX

The 30 laws from lawsofux.com each have a role here. Six are checks with thresholds. Two are brakes. The rest are questions for `deep` runs or notes for judgment. Every finding that rests on a law cites it, so the report says why and not only what.

## When a tell serves a law

Keep the function. Replace the mechanism. A striped card that groups related items keeps its grouping and loses the stripe: use spacing or a plain 1 px border. A badge that marks the one new thing keeps its job and becomes plain text with a date. A law never excuses the stock treatment itself.

## Six scored checks

Each check names how it can be confirmed. "Rendered" needs a browser tool that can read computed styles or a screenshot. Without one, report the check as not run.

### 1. Fitts's Law: targets are large enough and far enough apart

- Fail: a control smaller than 24 by 24 px, or smaller than 32 by 24 px with a neighbor closer than 8 px. On touch screens the target is 44 by 44 px.
- Exclude text links inside a sentence. In the research, 62% of reference sites had a quarter of their controls under 24 px, almost all of them inline links, so counting those would flag most good sites.
- Confirm: rendered (read each control's box). The detector's L01 gives candidates.
- Fix: enlarge the hit area with padding. The visible glyph may stay small.

### 2. Proximity and Common Region: grouping reads correctly

- Fail: the space between an item and its own label or group is equal to or larger than the space between groups.
- Fail: a border or background wraps items that are unrelated, or separates items that belong together.
- Confirm: rendered, by measurement, or judged from the code's spacing values.
- Fix: make the space inside a group clearly smaller than the space between groups. Use the project's spacing scale, or the default scale in `passes.md`.

### 3. Similarity: things that act alike look alike

- Fail: a link inside text has no underline and no color difference from the text around it.
- Fail: two controls with the same function have different styles, or two controls with different functions share one style.
- Fail: focus is invisible (detector X02).
- Confirm: rendered or judged.
- Fix: one style per function, defined once as a variant.

### 4. Von Restorff Effect: one thing stands out

- Fail: more than one filled primary button on a single surface (a page, a dialog, a card, a pane), or emphasis carried by color alone.
- Fail: so many highlighted elements that none leads. Badges, glows and pulses on several items at once.
- Confirm: judged, per view.
- Fix: one filled button per surface. Where the product needs two main actions side by side, keep both and make one quiet. Add a label or icon wherever color carries meaning.

### 5. Hick's Law and Choice Overload: choices are few and ranked

- Flag for judgment: more than 7 top-level navigation items of equal weight, more than 4 pricing tiers, or more than 2 calls to action in the first screen.
- This is a prompt, never an automatic failure. The reference median is 7 navigation links and the 90th percentile is 59, because large sites have footers.
- Confirm: judged.
- Fix at `lite` and `full`: rank what exists (make one option the default, group the rest). Removing choices is a `deep` change and needs approval.

### 6. Occam's Razor: nothing is there without a job

- Apply the removal test from SKILL.md rule 6 to every wrapper, border, shadow, icon, label and animation.
- Fail: an element that passes the removal test (nothing gets worse without it).
- Confirm: judged.
- Fix: delete it. Add nothing in its place.

## Brakes

- **Jakob's Law** and **Mental Model.** Users expect this product to work like the others they use. Give the screen character in type, color, spacing and imagery. Keep navigation, forms, tables, carts and checkout conventional. If a direction would change how a control works, drop that part of the direction.

## Questions for `deep` runs

Answer each with evidence from the code or the screen, or write "not assessed". None of them deducts anything on its own.

| Law | Question |
|---|---|
| Doherty Threshold | Does every action show a response within 400 ms: a pressed state, a spinner, a skeleton? Report missing feedback. Add a loading state only where the code already tracks a pending state. |
| Goal-Gradient Effect, Zeigarnik Effect | Does a multi-step flow show progress? |
| Postel's Law | Do inputs accept reasonable variants (spaces in phone numbers, pasted values)? Report only. Changing validation is out of scope. |
| Serial Position Effect | Are the most important navigation items first and last? Report only: importance is the owner's call. |
| Working Memory | Are visited links marked? Is the user asked to remember something from a previous screen? |
| Miller's Law, Chunking | Is long content broken into scannable groups with headings? |
| Tesler's Law, Paradox of the Active User | Does the interface carry complexity the user would otherwise carry? Is help placed where the task happens? |
| Peak-End Rule | Do the success and error states at the end of a flow get the same care as the first screen? |
| Selective Attention | Does any content look like an ad, or sit where ads usually sit? |
| Cognitive Load | What on this screen takes effort and helps no task? |
| Parkinson's Law | Could autofill, defaults or remembered values shorten a task? |
| Law of Uniform Connectedness, Law of Prägnanz | Are related controls visibly connected, and are shapes simple? |

## Notes for judgment

These have no check. They shape how you weigh the others.

- **Aesthetic-Usability Effect.** A polished screen hides usability problems. After the visual passes, check the six laws again.
- **Pareto Principle.** Spend the effort on the screens and elements most users meet first.
- **Cognitive Bias.** Your own preference for a style is not evidence. Use the thresholds and the research numbers.
- **Flow.** Do not add friction, confirmations or motion to a task the user repeats many times a day.

## Measured values to aim for

From the 565 reference pages (10th percentile, median, 90th percentile), as published in `research/RESULTS.md`. These describe what good sites do. They are not limits.

| Property | Low | Median | High |
|---|---|---|---|
| Body text size | 13 px | 16 px | 20 px |
| Headline size (desktop) | 24 px | 56 px | 86 px |
| Headline size (phone, median) | | 36 px | |
| Headline weight | 400 | 500 | 700 |
| Headline line height | 0.98 | 1.1 | 1.33 |
| Headline to body size ratio | 1.4 | 3.5 | 5.5 |
| Font families on a page | 1 | 2 | 4 |
| Distinct text sizes on a page | 4 | 9 | 14 |
| Most common corner radius | 3 px | 8 px | 50 px |
| Most common transition duration | 100 ms | 200 ms | 350 ms |
| Saturated hues on a page | 0 | 1 | 3 |

Contrast targets: 4.5:1 for text, 3:1 for text of 24 px or more, 7:1 preferred for body text.
