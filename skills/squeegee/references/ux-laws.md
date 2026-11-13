# UX laws

The 30 UX laws from lawsofux.com. Every audit answers all 30 for each layout group, one row per UX law. `report.md` shows how a finding cites one.

## Results

Give each UX law one result, with what you saw:

- **Pass.** Say what you checked: "18 controls, all 24 px or taller".
- **Fail.** Say what you saw, where, and the value.
- **Not applicable.** The screen holds nothing the UX law governs. Name what is absent: "no multi-step flow".
- **Not run.** The check needs a tool or an interaction you did not have. Name it.

The four auditor UX laws get a note in place of Pass or Fail, and stay out of the failed count.

The audit of UX laws is complete at 30 rows per screen. Screens that share a layout share one table.

## When a tell serves a UX law

Keep the function and replace the mechanism. A striped card that groups related items keeps its grouping and loses the stripe: use spacing or a plain 1 px border. A badge that marks the one new thing keeps its job and becomes plain text with a date. A UX law defends the job an element does. The stock treatment still goes.

## Scored UX laws

These eight have thresholds. A fail is a finding: a defect when you measured it, a judged tell when you judged it. One cause counts once: a fail that a tell or a defect already covers adds no second tell, and one element that fails two UX laws is one finding. "Rendered" means read from `measure.js` or the browser tool.

| UX law | In plain words | Fail when | Confirm | Fix |
|---|---|---|---|---|
| Fitts's Law | A target takes longer to hit as it gets smaller or farther away. | A button, a form field or an icon control is under 24 by 24 px, or under 32 by 24 px with a neighbor closer than 8 px. Text links are exempt, in a sentence or in a navigation row: 94% of reference pages hold a control under 24 px, almost all of them text links. On a native app or a site built for phones the floor is 44 by 44 px. On other sites, report controls under 44 px at 390 px and leave them out of the count. | Rendered: `under24` and `under44` in `measure.js`. Detector L01 gives candidates. | Enlarge the hit area with padding. The visible glyph may stay small. |
| Law of Proximity | Items near each other are read as one group. | The space between an item and its own label or group is equal to or larger than the space between groups. | Rendered, or judged from the code's spacing values. | Space inside a group clearly smaller than space between groups, on the project's spacing scale. |
| Law of Common Region | Items inside one boundary are read as one group. | A border or background wraps unrelated items, or splits items that belong together. | Rendered or judged. | Move the boundary to match the grouping, or drop it and group with spacing. |
| Law of Similarity | Items that look alike are read as the same kind of thing. | A link inside text has no underline and no color difference. Two controls with one function have different styles, or two functions share one style. Focus is invisible (detector X02). | Rendered or judged. Tab through the controls for focus. | One style per function, defined once as a variant. |
| Von Restorff Effect | Among similar items, the one that differs is noticed and remembered. | More than one filled primary button in one view: what is on screen at once, a dialog, a card or a pane. One action repeated in the header, the first section and the footer is one button. Emphasis carried by color alone. So many highlights that none leads. | Judged, per surface. | One filled button per surface. Two main actions the product needs both stay, one filled and one quiet. Add a label or icon where color carries meaning. |
| Hick's Law | Deciding takes longer as choices grow in number and complexity. | More than 7 top-level navigation items of equal weight, or more than 2 calls to action in the first screen. A prompt to judge, since the reference median is 7 navigation links and the 90th percentile is 59 with footers. | Judged. | Group, order and rank what exists: make one option the default and set the rest quieter. Every choice stays. Report it when the screen needs one removed. |
| Choice Overload | Too many options at once make people slower to choose, or stop them choosing. | More than 4 pricing tiers, or a long flat list of equal options with no default or recommendation. | Judged. | Rank and mark a default. Every option stays. |
| Occam's Razor | Among designs that work equally well, the one with the fewest parts is best. | An element passes the removal test (rule 7 in SKILL.md): the screen is no worse without it. | Judged, on every wrapper, border, shadow, icon, label and animation. | Delete it and leave the space empty. |

## Brakes

These two limit every fix. Answer them in the audit as well.

| UX law | In plain words | The audit asks |
|---|---|---|
| Jakob's Law | People spend most of their time in other products and expect this one to work the same way. | Do navigation, forms, tables, carts and checkout work the way they do in comparable products? Name any control that behaves unusually. |
| Mental Model | People act on what they believe about how a system works. | Does anything on the screen act differently from how it looks: a card that is not clickable but looks it, a toggle that navigates? |

Character goes into type, color, spacing and imagery. Controls keep their familiar behavior. When a direction would change how a control works, drop that part of the direction.

## Question UX laws

Answer each with evidence from the code or the screen. A fail is reported in the UX laws table and under "UX law findings". It leaves the tier unchanged. Fix one only at `deep`, and only when the fix restyles or reorders what exists.

| UX law | In plain words | The audit asks |
|---|---|---|
| Doherty Threshold | A response within 400 ms keeps attention. A slower one reads as broken. | Does every action show a response within 400 ms: a pressed state, a spinner, a skeleton? A loading state is added only where the code already tracks a pending state. |
| Goal-Gradient Effect | People speed up as they near a goal they can see. | Does a multi-step flow show how far along the user is? |
| Zeigarnik Effect | People remember unfinished tasks better than finished ones. | Is an unfinished task (a draft, a half-done setup) visible so the user can return to it? |
| Postel's Law | Accept input liberally, send output strictly. | Do inputs accept reasonable variants: spaces in phone numbers, pasted values, either case? Report only. Validation stays as it is. |
| Serial Position Effect | The first and last items in a series are remembered best. | Do the first and last navigation items hold the most important destinations? Report only: importance is the owner's call. |
| Working Memory | People keep only a little in mind, for a short time, while doing a task. | Is the user asked to remember something from a previous screen? Are visited links marked? |
| Miller's Law | People hold about seven items in mind at once. | Does any list, menu or row of equal items run past about seven with no grouping? |
| Chunking | Information grouped into meaningful units is easier to scan and remember. | Is long content broken into groups with headings? Are long numbers and codes formatted in groups? |
| Tesler's Law | Some complexity cannot be removed, only moved between the system and the user. | Does the user do work the interface could do: retype known data, compute a total, pick a format? |
| Paradox of the Active User | People start using a product at once and skip the manual. | Is help placed where the task happens, in the control's label or beside it? |
| Peak-End Rule | People judge an experience by its most intense moment and its end. | Do the success and error states at the end of a flow get the same care as the first screen? |
| Selective Attention | People attend to what serves their goal and filter out the rest. | Does any real content look like an ad, or sit where ads usually sit, so users would skip it? |
| Cognitive Load | Every element the user must read or decide about spends limited mental effort. | What on this screen takes effort and helps no task? Count labels, badges and repeated text per item. |
| Parkinson's Law | A task expands to fill the time available. | Could autofill, defaults or remembered values shorten a task? |
| Law of Uniform Connectedness | Visibly connected items are read as more related than unconnected ones. | Are related controls visibly connected by a line, a shared container or alignment? |
| Law of Prägnanz | People read a complex shape in the simplest form they can. | Are shapes, icons and layouts simple enough to read at a glance? Name any ornate or ambiguous one. |

## Auditor UX laws

These four check the audit itself. Answer each about your own findings.

| UX law | In plain words | The audit asks |
|---|---|---|
| Aesthetic-Usability Effect | People judge a good-looking design as easier to use and forgive its faults. | Does polish hide a usability problem? Name any element that looks finished and fails a scored UX law. After the visual passes, run the scored UX laws again. |
| Pareto Principle | Most of the effect comes from a small share of the causes. | Which screens and elements do most users meet first? Order the findings so those come first. |
| Cognitive Bias | Judgment leans on shortcuts and personal preference. | Does every finding rest on a threshold, a measured value or a research number? Remove any that rests on your own taste. |
| Flow | People working in a rhythm are thrown by interruptions. | Does a confirmation, an animation or a modal interrupt a task the user repeats many times a day? |

## Measured values to aim for

From the 565 reference pages (10th percentile, median, 90th percentile), as published in [RESULTS.md](https://github.com/cablemp5/squeegee/blob/master/research/RESULTS.md). These describe what good sites do. The sprawl limits in `tells.md` are the only hard limits among them.

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
