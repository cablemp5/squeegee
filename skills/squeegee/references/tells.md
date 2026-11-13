# Tells

Every rule here has an id, the evidence for it, and its fix. The evidence columns give the share of pages showing the signal in three groups, each limited to pages of 250 words or more and 3 screens or longer:

- **Reference:** 282 landing pages of professionally made products.
- **Builder:** 84 landing pages published from AI site builders such as Lovable and Bolt.
- **Agent:** 282 pages from the live sites of repos a coding agent wrote (Claude Code, Cursor, Codex). Each repo carries agent commit signatures or an agent instruction file.

The sources are [RESULTS.md](https://github.com/cablemp5/squeegee/blob/master/research/RESULTS.md) and [AGENT-RESULTS.md](https://github.com/cablemp5/squeegee/blob/master/research/AGENT-RESULTS.md). "Not measured" means the rule rests on judgment or on other skills' experience, and you should weigh it that way.

Quote the column that matches the project. A project with `CLAUDE.md`, `AGENTS.md`, `.claude` or `.cursor` in its tree, or agent signatures in its commit log, is agent-written: use the Agent column. Most agent-written sites are developer tools, so where a number could come from that alone, the rule says so.

A tell is a prompt to look. The verdict comes after you confirm that it reaches a screen you audited and run the removal test.

The research measured rendered pages. The detector reads source text. Their definitions differ, and the detector's are narrower: the research counted any shadcn-style theme variables, and detector rule D01 fires only when the theme still holds a stock primary color. Treat detector rules as heuristics that point at the measured signal, not as the signal itself.

## Stock defaults (cluster rule)

One of these alone means nothing: 24% of the reference landing pages use Inter. Count how many you confirmed on a screen you audited. The tier table in SKILL.md says what the count means.

The numbers describe pages of 250 words or more with no password field, so a sign-in screen or a short dialog is outside them. The cluster marks builder pages best. Agent-written pages reach 5 or more a quarter of the time, so on an agent-written project a low count clears nothing: check the sprawl measures next.

| Present on one page | Reference | Builder | Agent |
|---|---|---|---|
| 4 or more | 8% | 90% | 40% |
| 5 or more | 2% | 65% | 24% |
| 6 or more | 0% | 37% | 10% |
| 7 or more | 0% | 13% | 4% |

| Id | Default (as the research measured it) | Reference | Builder | Agent | Fix at the source |
|---|---|---|---|---|---|
| D01 | shadcn-style theme variables present | 6% | 87% | 26% | The variables are fine. Their stock values are the problem: replace them with the product's own neutrals, accent and radius. |
| D02 | Lucide icons | 10% | 87% | 31% | Keep the set when it suits. Set stroke width and size once to match the type weight, or use the product's icon set. |
| D03 | No font chosen (system default stack) | 5% | 24% | 23% | Choose a face from the direction and load it once in the theme. A native app using the system font on purpose is exempt. |
| D04 | Inter | 24% | 50% | 28% | Keep it when it suits the product. Otherwise set a face from the direction. |
| D05 | Headline weight 700 or more | 22% | 67% | 48% | The reference median is 500. Carry emphasis with size unless the direction calls for a heavy headline. |
| D06 | Centered headline | 40% | 50% | 43% | Weak evidence. Align to the layout's grid when the content is not symmetric. |
| D07 | Body text under 16 px | 35% | 63% | 68% | Body text at 16 px or more. Dense app tables may use 13 or 14 px. The body size is the most-used text size on the screen (`bodySize` in `measure.js`), not the value on the `body` rule. |
| D08 | Small pill badge above the headline | 6% | 35% | 25% | See T02. |
| D09 | No reduced-motion rule | 32% | 39% | 30% | Weak evidence, and still worth fixing: add one reduced-motion rule in the theme. |

Count the defaults on the rendered page: `defaults` in `measure.js` reads all nine the way the research measured them. The detector's own count from source runs low. It finds 4 or more in 56% of builder repos, 18% of agent repos and 16% of hand-made ones, so use it to locate each default in the code, not to decide the count.

## Sprawl measures (cluster rule)

Sprawl is what an interface looks like when it grew one request at a time: every new element got its own size, weight and label, and nothing was merged afterward. It is the mark of agent-written work, and custom art does not rule it out. `scripts/measure.js` returns each count for the screen it runs on. It leaves out text inside drawings (`svg`).

Four measures carry it. The numbers come from running `measure.js` on 277 reference pages and 236 agent pages.

| Over on one page | Reference | Agent |
|---|---|---|
| 2 or more | 10.5% | 38.1% |
| 3 or more | 3.6% | 15.7% |
| All 4 | 0.4% | 3.8% |

Three or more is where the tier table in SKILL.md sets its anchor. Reference developer-tool sites, the closest kind to most agent-written sites, reach three 7.7% of the time (3 of 39 pages) and two 25.6% of the time, so two over decides nothing.

| Id | Measure | Limit | Reference over | Agent over | Fix at the source |
|---|---|---|---|---|---|
| S01 | Text sizes 1 px apart | more than 4 pairs | 13% | 39% | The sizes were picked one at a time: 13, 14, 15, 16 and 17 px on one screen is four pairs. Choose a scale of nine steps or fewer, as tokens, and move each size to its nearest step. |
| S02 | Tracked uppercase labels | more than 5 | 9% | 31% | See J14. Keep the few that name a group. Fold the rest into their heading or set them in sentence case. |
| S03 | Share of text under 12 px | more than 6.6% | 9% | 21% | Raise it to 12 px or more. Text that small is usually a label that the heading already covers. |
| S04 | Font weights in use | more than 4 | 18% | 28% | Three weights or fewer: text, emphasis, display. The reference median is 3. |

The S01 and S04 limits sit below the reference 90th percentile, which is 5 for both, because the groups separate better there. Alone each proves little: 18% of reference pages use five weights or more. The cluster is the finding.

Four more counts have limits at the reference 90th percentile. Reference pages go over them as often as agent pages do, so they are not sprawl measures. Each one over its limit is a tell and counts with the tells: the screen is outside what 90% of professional pages do.

| Id | Measure | Limit | Reference over | Agent over | Fix at the source |
|---|---|---|---|---|---|
| S05 | Font families in use | more than 4 | 7% | 2% | One face for text and one for display. A monospace face only where the content is code or tabular data. |
| S06 | Distinct text sizes | more than 14 | 8% | 11% | See S01. The reference median is 9. |
| S07 | Saturated hues | more than 3 | 11% | 11% | One accent, plus hues that mark a state or a category. The reference median is 1. |
| S08 | Text colors | more than 14 | 7% | 9% | Ink, muted ink, and one color per state or role, as tokens. The reference median is 6. |

Heading structure is not a rule. Reference pages skip a heading level (13% against 3%), set a lower heading larger than a higher one (22% against 12%) and use more heading styles (a median of 5 against 4) more often than agent pages do. Left edges are in the `measure.js` output for you to read, and the count is no rule either: reference pages hold a median of 15.

Sprawl fixes change values and leave content as it is. A caption stays a caption and every label keeps its text unless the user approves a cut.

## Source variation (cluster rule)

The same habit shows in the code before a page renders: styles written one at a time, in place, where a system would hold them once. The detector counts eight densities over the interface files of the target and reports them as `variation` in `detect.json`. Each limit is the 90th percentile of 165 hand-made repo snapshots (87 as they stand today, 78 frozen at the end of 2022, before coding agents), so "over" means denser than 90% of hand-made code. It needs 3,000 lines of interface code to measure: below that, one blur or one label trips a density, and the hand-made baseline holds few repos that small.

| Over in one repo | Agent | Builder | Hand-made today | Hand-made 2022 |
|---|---|---|---|---|
| 3 or more | 56% | 55% | 4% | 4% |
| 4 or more | 33% | 27% | 1% | 1% |
| 5 or more | 17% | 14% | 0% | 0% |

The shares come from the repos with 3,000 lines or more: 254 agent, 22 builder, 81 hand-made today and 73 hand-made in 2022.

| Id | Measure | Limit | Hand-made over | Agent over | Fix at the source |
|---|---|---|---|---|---|
| V01 | Tracked uppercase labels per 1,000 lines | 0.15 | 7% | 65% | See S02 and J14. One label style as a token or a component, used where a group needs a name. |
| V02 | Share of text sizes at 12 px or smaller | 0.47 | 7% | 37% | See S03. Reserve the smallest size for captions and legal text. |
| V03 | Hard-coded colors in markup per 1,000 lines | 9.03 | 6% | 35% | Move each color to a theme token and reference the token. |
| V04 | Inline styles per 1,000 lines | 6.93 | 12% | 30% | Move repeated inline styles into the component or the theme. A value computed at run time stays inline. |
| V05 | Emoji per 1,000 lines | 1.07 | 10% | 29% | See T04. Use the project icon set where the icon carries meaning. |
| V06 | Gradients per 1,000 lines | 1.69 | 10% | 28% | See J02. One gradient with a reason, defined once. |
| V07 | Backdrop blurs per 1,000 lines | 0.25 | 9% | 45% | See J03. Blur only where content scrolls beneath. |
| V08 | Arbitrary Tailwind values per 1,000 lines | 5.3 | 6% | 20% | Use the theme scale. Builder repos are over 86% of the time. |

The hand-made column gives the higher of the two hand-made groups. Three or more over is a prompt, not a verdict: look for the same sprawl on the screens you audit, where the S measures decide. The tier table in SKILL.md says when the count sets the tier.

## Detector tells and defects

| Id | Tier | Tell | Reference | Builder | Agent | Fix |
|---|---|---|---|---|---|---|
| T01 | Tell | Gradient text | 16% | 32% | 28% | One solid ink color. Emphasis comes from size or weight. |
| T02 | Tell | Pill badge above the headline | 6% | 35% | 25% | Remove it, or move its content into the headline or subhead. Keep it when it carries real news with a date or a link. |
| T03 | Tell | Checkmark list (3 or more items) | 1% | 24% | 9% | Plain text or a table. Pricing tables, comparison tables and real checklists the user completes are exempt. |
| T04 | Tell | Emoji in a heading or button | 11% | 12% | 15% | No evidence as a tell. Remove when decorative. Keep when the product's voice uses it everywhere on purpose. |
| T05 | Tell | Stock palette class used directly (`bg-indigo-500`) | not measured | not measured | not measured | Define the accent as a token and reference the token. |
| T06 | Tell | Scroll reveal in 4 or more places | not measured | not measured | not measured | One entrance at most. Follow the removal steps in `passes.md`. |
| T07 | Tell | Looping pulse, ping or bounce on something that is not live | not measured | not measured | not measured | Remove it. |
| T08 | Tell | Hover grows the element by 5% or more (`hover:scale-105`) | not measured | not measured | not measured | Grow by 2% or less, or mark hover with color, border or shadow. A card that swells pushes against its neighbors. The source bench found it in 60% of builder repos, 30% of agent repos and 39% of hand-made ones, so it shows a craft gap, not a generated page. |
| T09 | Tell | An element enters from `scale(0)` | not measured | not measured | not measured | Start at `scale(0.95)` with `opacity: 0`. Nothing on a screen grows from a point. |
| T10 | Tell | `ease-in` on interface motion | not measured | not measured | not measured | An ease-out curve. Ease-in starts slowly, so the interface feels late to respond. Keep it on something that accelerates off the screen. The source bench found it in 12% of agent repos and 53% of hand-made ones, so it is no sign of a generated page. |
| L02 | Tell | Interface transition of 500 ms or more | not measured | not measured | not measured | 300 ms or less. The reference median is 200 ms. |
| X01 | Defect | `transition: all` | 65% | 83% | 42% | Common on good sites too, so it is no tell. It is still a defect: name the properties. |
| X02 | Defect | Focus outline removed with no replacement | not measured | not measured | not measured | Add a visible `focus-visible` style. Check the component's own styles first: the replacement may live in another file. |
| X03 | Defect | Arbitrary spacing values (`mt-[13px]`) in 3 or more places | not measured | not measured | not measured | Use the project's spacing scale. Leave a value that aligns something to a fixed asset. |
| X04 | Defect | Zoom disabled in the viewport tag | not measured | not measured | not measured | Remove it. |
| X05 | Defect | A face named first in a font stack that nothing in the project loads | not measured | not measured | not measured | Load it once in the theme with `@font-face` or a font link, or name a face every visitor has. Confirm with `facesNotLoaded` in `measure.js`: the face renders only on machines that have it installed, so the screen you see may not be the screen a visitor sees. The rule fires in 26% of agent repos and 28% of hand-made ones, and 10% of reference pages name a first face they do not load, most often a platform face such as Avenir Next on purpose. It is a defect only when the face is one the project meant to ship. |
| X06 | Report only | The layout breaks with worst-case content | 72% | not measured | 69% | Found by `scripts/stress.js`, not the detector. It fills repeated items with a long name, one unbroken 35-letter word and a ten-digit number. The evidence columns give the share of pages where a box breaks at desktop width: professional pages break as often as agent-written ones, so a break is ordinary and leaves the rating alone. Report a box whose text comes from data that can grow (a user name, a title someone types, a count), with the fix: let the text wrap (`min-width: 0` on the flex or grid child, `overflow-wrap: anywhere`), or truncate it with an ellipsis where one line is required. A break that makes the page scroll sideways at phone width is the most serious kind, and 30% of reference pages have one. |
| L01 | Defect | Tap target under 24 by 24 px | see Fitts's Law in `ux-laws.md` | |  | Enlarge the hit area. |
| R01 | Report only | Placeholder names or text (Jane Doe, Acme, Lorem ipsum) | not measured | not measured | not measured | Report. The owner confirms or supplies real content. |
| R02 | Report only | Proof claim to check ("Trusted by 10,000+ teams") | not measured | not measured | not measured | Report. Ask for the source. The number stays as written. |
| H01 | House rule | Em dash in interface copy | 60% | 70% | 58% | One dash is no tell. Many are: 5 or more on one page appear on 13% of reference pages, 35% of builder pages and 27% of agent pages. Rewrite with approval. The detector flags a dash between words only. A lone dash that stands for an empty value is data. |

## Judged tells

The detector has no line rule for these. Its `styles` field counts font sizes, weights, color values, uppercase rules and gradients in plain CSS, which shows where the code holds the most variation. The research found most of them about as often on reference pages as on AI-built ones, so presence proves nothing. Ask one question: is this the stock version, or did someone design it? The stock version uses default values, repeats without variation, and would fit any product.

Color and effects:

| Id | Tell | Reference | Builder | Agent | The stock version | Fix |
|---|---|---|---|---|---|---|
| J01 | Purple or violet as a main color | 9% | 6% | 4% | A violet to blue gradient from a default palette, not a brand color. | Use the product's color. If purple is the brand, keep it and record it. |
| J02 | Large gradient area | 52% | 64% | 54% | Two-stop linear gradient behind the first section. | Flat ground, or a gradient with a reason (depth, a photo's light). |
| J03 | Glass (backdrop blur) | 48% | 67% | 63% | Blur on cards that sit over nothing. | Blur only where content scrolls beneath, such as a sticky bar. |
| J04 | Radial orbs, glows, grain, dot grids | not measured | not measured | not measured | Decoration that fills an empty first section. | Removal test. The usual finding is that the content or spacing is the real problem. |
| J05 | Neon or rainbow coloring | 11% have 4 or more hues | 8% | 13% | Every card or chart series in a different bright hue with no meaning. | One accent for interface chrome. The reference median is one saturated hue per page. |
| J06 | Low-contrast text, most often in dark mode | 24% have 10% or more low-contrast text | 37% | 22% | Grey text on near-black below 4.5:1. | Raise text to 4.5:1. A defect when measured on text people must read: body copy, a label, a control. Punctuation in a code sample is not. `measure.js` blends translucent text with its ground before it compares. |

Layout:

| Id | Tell | Reference | Builder | Agent | The stock version | Fix |
|---|---|---|---|---|---|---|
| J07 | Three equal icon cards in a row | 52% | 45% | 27% | Icon, two-word heading, one line of text, three times. | Vary the weight by importance, or write it as text. Keep when the three items are true peers. |
| J08 | Bento grid | 25% | 17% | 15% | Boxes of different sizes with no reason for the sizes. | Size follows importance, or use a plain grid. |
| J09 | Cards inside cards | 23% | 35% | 40% | A bordered box inside a bordered box. | Remove the inner border. Group with spacing. |
| J10 | Every section the same centered template | not measured | not measured | not measured | Heading, subhead, grid, same padding, repeated. | Vary alignment and density by what each section says. |
| J11 | Colored left stripe or colored border on cards | 1% | 6% | 7% | A stripe as decoration. | Keep only where it marks a state. Then add an icon and a label so color is not the only signal. |
| J12 | Fake terminal or browser window | not measured | not measured | not measured | A drawn window around invented content. | Report it and ask for a real capture of the product. It stays in place: it is content, and removal is outside Squeegee's scope. |
| J25 | Ragged alignment | not measured | not measured | not measured | Text blocks in one section start at many different left edges, and neighbors miss each other by a few pixels. Judge it by looking. `leftEdges` in `measure.js` counts the edges on the screen, and the count alone proves nothing: reference pages hold a median of 15. | Align each section to one grid. Blocks that belong together share an edge. |

Type and components:

| Id | Tell | The stock version | Fix |
|---|---|---|---|
| J13 | One italic serif word in a sans headline | An accent word in a second face. | One face for the headline. |
| J14 | Tiny uppercase tracked labels (eyebrows, kickers) | A label above every section heading, card and button. | Fold it into the heading. 24% of reference landing pages use at least one, against 51% of builder pages and 51% of agent pages. 90% of reference pages have five or fewer, so a few are fine. More than five is sprawl measure S02. |
| J15 | Icon in a tinted rounded square | Every feature has one. | Icon alone, or none. |
| J16 | Sparkle icon for anything involving AI | Decoration. | A label that says what the feature does. |
| J17 | Section numbering (`01 / 04`) | Decoration. | Remove unless the order matters to the reader. |
| J18 | Soft drop shadow on every card | The same blurred shadow everywhere. | A 1 px border at low contrast, or one shadow level reserved for things that float. |
| J19 | Buttons whose only hover state is a fade | Opacity change, nothing else. | A hover, a focus-visible and an active state that differ from each other. |

Copy (interface strings only):

| Id | Tell | Reference | Builder | Agent | Fix |
|---|---|---|---|---|---|
| J20 | Hype words | 36% use 2 or more | 23% | 5% | Not a tell by evidence. Say what the product does in the customer's words. |
| J21 | "It's not X, it's Y" | not measured | not measured | not measured | State the point. |
| J22 | Headline that fits any product | not measured | not measured | not measured | Name what this product does and for whom. |
| J23 | "Learn more", "Get started", "Explore" as the only button labels | not measured | not measured | not measured | Say what happens when it is pressed. |
| J24 | Residue: `{{tokens}}`, "Certainly!", markdown on the page | not measured | not measured | not measured | Remove. This is a defect. |
| J26 | Stacked text layers: a kicker, a heading, a subhead and a description on one item, each restating the last | not measured | not measured | not measured | List the lines that repeat another line and propose which to cut or merge. A cut is a copy change, so it needs approval. Without approval, set the repeated layers quieter and report them. |

Copy changes need the user's approval. A climbing shop may say "harness". A studio that is really named Summit keeps its name.

## Dashboard tells

Every metric, chart, column and control on a dashboard is content. Reorder and reweight them. The dashboard ends with the same set it started with.

| Id | Tell | Fix |
|---|---|---|
| A01 | A grid of 8 equal KPI cards | Keep all 8. Give one or two the lead by size and position, and set the rest smaller. |
| A02 | First screen holds only large metric cards while a chart and a table sit below | Tighten the cards so the existing chart and the start of the existing table rise above the fold. |
| A03 | Marketing spacing: card padding of 32 to 48 px | 16 to 20 px. Table rows of 40 to 48 px. |
| A04 | Decorative sparklines, gauges and progress rings | Report any chart nobody could read a value from. Group, order and set it quieter. It stays: removal is outside Squeegee's scope. |
| A05 | 3D charts, a pie with more than 3 slices, a bright hue per series with no meaning | A flat chart. One hue with steps plus one highlight where series are ordered. Distinct hues are right for unordered categories, and a pie or donut is fine for 2 or 3 parts of a whole. |
| A06 | Uppercase table headers, status as large colored pills | Sentence case. A 6 to 8 px dot plus a word. |
| A07 | No sticky header on a table longer than 15 rows | Make the header sticky. Use tabular numerals. |
| A08 | Several solid primary buttons in a filter toolbar | Quiet controls in the toolbar. The filled style goes to the main action of that surface. |
| A09 | Time series with no date range control | Report it at every depth. Squeegee does not add controls. |

## Mobile tells

For a native app, follow the platform's guide first: Apple's Human Interface Guidelines or Material Design. Use the platform's units (points, dp), respect the user's text size setting, and check each screen with the platform screen reader's labels.

| Id | Tell | Fix |
|---|---|---|
| M01 | A desktop sidebar where a tab bar or bottom navigation belongs | The platform's navigation pattern. This is a structural change: `deep`, with approval. |
| M02 | Targets under 44 by 44 pt (iOS) or 48 by 48 dp (Android) | Enlarge. Keep 8 between neighbors. |
| M03 | Main action out of thumb reach, or a destructive action inside it | Main action in the lower third. |
| M04 | Controls that only appear on hover, swipe actions with no visible equivalent | A visible control for each. |
| M05 | Fixed bars that ignore the safe area, `100vh` | `env(safe-area-inset-*)`, `100dvh`. |
| M06 | Inputs under 16 px on the web (iOS zooms the page), wrong keyboard type | 16 px, the right `inputmode`. |
| M07 | A desktop layout collapsed into one long stack with nothing reprioritized | Reorder for the small screen. |
| M08 | A dropdown where a bottom sheet belongs, sheets with no drag handle | The platform's pattern. |
| M09 | Fixed text sizes that ignore the system text size setting | Use scalable type styles. |

## Desktop app tells

Follow the platform guide: Apple's guidelines for Mac, Microsoft's Windows app design guidance, the GNOME guidelines for Linux.

| Id | Tell | Fix |
|---|---|---|
| K01 | Web marketing styling on a native utility: large radius, glow, emoji | The system font, the platform's icons, restrained radius. |
| K02 | Keyboard shortcut pills as decoration for shortcuts that do not exist | Show only real shortcuts. |
| K03 | Native controls unreadable in dark mode | Set `color-scheme` and explicit colors on native selects. |
| K04 | Layout breaks at 1280 and 1024 px with all panes open | Check each pane state at each width. |
| K05 | No keyboard path: focus order broken, no visible focus, menus unreachable | Restore focus order and visible focus. Report missing menu commands. |

The research holds no native app screens. Its mobile and desktop rows are the product websites of apps. So the mobile and desktop tells above rest on the platform guides and on other skills' experience, not on measurement.

## Not tells

These pass. Each appeared on a large share of the reference pages.

- A dark page (27% of reference landing pages) or a pure white page (48% of all reference pages). Agent-written sites are dark 67% of the time, and so are 58% of reference developer-tool sites: dark follows the kind of product, not who wrote it.
- Tailwind (36% of reference landing pages). shadcn-style variables count as one default, D01, whatever their values, and one default alone means nothing.
- Inter, Geist or any single font, alone.
- Three columns of true peers, a pricing table with checkmarks, a bento grid sized by importance.
- A dark mode toggle, navigation icons, row chevrons, status dots that mark real state.
- Rounded corners. The reference median radius is 8 px and the spread runs from 3 px to 50 px.

## The Zap, Shield, Sparkles triad

Three feature cards titled with speed, security and intelligence, each with the matching stock icon, is the clearest single sign of a generated features section. Treat it as J07 confirmed.
