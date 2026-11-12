# Tells

Every rule here has an id, the evidence for it, and its fix. The evidence columns give the share of pages showing the signal: 282 reference landing pages against 84 AI-built landing pages, both limited to pages of 250 words or more and 3 screens or longer. The source is [RESULTS.md](https://github.com/cablemp5/squeegee/blob/master/research/RESULTS.md). "Not measured" means the rule rests on judgment or on other skills' experience, and you should weigh it that way.

A tell is a prompt to look, never a verdict. Confirm that it reaches the screen under audit. Then run the removal test.

The research measured rendered pages. The detector reads source text. Their definitions differ, and the detector's are narrower: the research counted any shadcn-style theme variables, and detector rule D01 fires only when the theme still holds a stock primary color. Treat detector rules as heuristics that point at the measured signal, not as the signal itself.

## Stock defaults (cluster rule)

One of these alone means nothing: 24% of the reference landing pages use Inter. Count how many you confirmed on the screen under audit. Five or more is a finding. Seven or more counts toward Opaque.

| Present on one page | Reference | AI-built |
|---|---|---|
| 4 or more | 8% | 90% |
| 5 or more | 2% | 65% |
| 6 or more | 0% | 37% |
| 7 or more | 0% | 13% |

| Id | Default (as the research measured it) | Reference | AI-built | Fix at the source |
|---|---|---|---|---|
| D01 | shadcn-style theme variables present | 6% | 87% | The variables are fine. Their stock values are the problem: replace them with the product's own neutrals, accent and radius. |
| D02 | Lucide icons | 10% | 87% | Keep the set when it suits. Set stroke width and size once to match the type weight, or use the product's icon set. |
| D03 | No font chosen (system default stack) | 5% | 24% | Choose a face from the direction and load it once in the theme. A native app using the system font on purpose is exempt. |
| D04 | Inter | 24% | 50% | Keep it when it suits the product. Otherwise set a face from the direction. |
| D05 | Headline weight 700 or more | 22% | 67% | The reference median is 500. Carry emphasis with size unless the direction calls for a heavy headline. |
| D06 | Centered headline | 40% | 50% | Weak evidence. Align to the layout's grid when the content is not symmetric. |
| D07 | Body text under 16 px | 35% | 63% | Body text at 16 px or more. Dense app tables may use 13 or 14 px. |
| D08 | Small pill badge above the headline | 6% | 35% | See T02. |
| D09 | No reduced-motion rule | 32% | 39% | Weak evidence, and still worth fixing: add one reduced-motion rule in the theme. |

The detector reads D01 to D04 and D09 from the whole project and says where it saw each one. A default seen in a file that the screen under audit does not use does not count.

## Detector tells and defects

| Id | Tier | Tell | Reference | AI-built | Fix |
|---|---|---|---|---|---|
| T01 | Tell | Gradient text | 16% | 32% | One solid ink color. Emphasis comes from size or weight. |
| T02 | Tell | Pill badge above the headline | 6% | 35% | Remove it, or move its content into the headline or subhead. Keep it when it carries real news with a date or a link. |
| T03 | Tell | Checkmark list (3 or more items) | 1% | 24% | Plain text or a table. Pricing tables, comparison tables and real checklists the user completes are exempt. |
| T04 | Tell | Emoji in a heading or button | 11% | 12% | No evidence as a tell. Remove when decorative. Keep when the product's voice uses it everywhere on purpose. |
| T05 | Tell | Stock palette class used directly (`bg-indigo-500`) | not measured | not measured | Define the accent as a token and reference the token. |
| T06 | Tell | Scroll reveal in 4 or more places | not measured | not measured | One entrance at most. Follow the removal steps in `passes.md`. |
| T07 | Tell | Looping pulse, ping or bounce on something that is not live | not measured | not measured | Remove it. |
| L02 | Tell | Interface transition of 500 ms or more | not measured | not measured | 300 ms or less. The reference median is 200 ms. |
| X01 | Defect | `transition: all` | 65% | 83% | Common on good sites too, so it is no tell. It is still a defect: name the properties. |
| X02 | Defect | Focus outline removed with no replacement | not measured | not measured | Add a visible `focus-visible` style. Check the component's own styles first: the replacement may live in another file. |
| X03 | Defect | Arbitrary spacing values (`mt-[13px]`) in 3 or more places | not measured | not measured | Use the project's spacing scale. Leave a value that aligns something to a fixed asset. |
| X04 | Defect | Zoom disabled in the viewport tag | not measured | not measured | Remove it. |
| L01 | Defect | Tap target under 24 by 24 px | see `ux-laws.md` | | Enlarge the hit area. |
| R01 | Report only | Placeholder names or text (Jane Doe, Acme, Lorem ipsum) | not measured | not measured | Report. The owner confirms or supplies real content. |
| R02 | Report only | Proof claim to check ("Trusted by 10,000+ teams") | not measured | not measured | Report. Ask for the source. Never adjust the number. |
| H01 | House rule | Em dash in interface copy | 60% | 70% | Not an AI tell by this evidence. Rewrite with approval. |

## Judged tells

The detector has no rule for these. The research found most of them about as often on reference pages as on AI-built ones, so presence proves nothing. Ask one question: is this the stock version, or did someone design it? The stock version uses default values, repeats without variation, and would fit any product.

Color and effects:

| Id | Tell | Reference | AI-built | The stock version | Fix |
|---|---|---|---|---|---|
| J01 | Purple or violet as a main color | 9% | 6% | A violet to blue gradient from a default palette, not a brand color. | Use the product's color. If purple is the brand, keep it and record it. |
| J02 | Large gradient area | 52% | 64% | Two-stop linear gradient behind the first section. | Flat ground, or a gradient with a reason (depth, a photo's light). |
| J03 | Glass (backdrop blur) | 48% | 67% | Blur on cards that sit over nothing. | Blur only where content scrolls beneath, such as a sticky bar. |
| J04 | Radial orbs, glows, grain, dot grids | not measured | not measured | Decoration that fills an empty first section. | Removal test. The usual finding is that the content or spacing is the real problem. |
| J05 | Neon or rainbow coloring | 11% have 4 or more hues | 8% | Every card or chart series in a different bright hue with no meaning. | One accent for interface chrome. The reference median is one saturated hue per page. |
| J06 | Low-contrast text, most often in dark mode | 24% have 10% or more low-contrast text | 37% | Grey text on near-black below 4.5:1. | Raise text to 4.5:1. This one is a defect when measured. |

Layout:

| Id | Tell | Reference | AI-built | The stock version | Fix |
|---|---|---|---|---|---|
| J07 | Three equal icon cards in a row | 52% | 45% | Icon, two-word heading, one line of text, three times. | Vary the weight by importance, or write it as text. Keep when the three items are true peers. |
| J08 | Bento grid | 25% | 17% | Boxes of different sizes with no reason for the sizes. | Size follows importance, or use a plain grid. |
| J09 | Cards inside cards | 23% | 35% | A bordered box inside a bordered box. | Remove the inner border. Group with spacing. |
| J10 | Every section the same centered template | not measured | not measured | Heading, subhead, grid, same padding, repeated. | Vary alignment and density by what each section says. |
| J11 | Colored left stripe or colored border on cards | 1% | 6% | A stripe as decoration. | Keep only where it marks a state. Then add an icon and a label so color is not the only signal. |
| J12 | Fake terminal or browser window | not measured | not measured | A drawn window around invented content. | Report it and ask for a real capture of the product. Never remove it: it is content, and removal is outside Squeegee's scope. |

Type and components:

| Id | Tell | The stock version | Fix |
|---|---|---|---|
| J13 | One italic serif word in a sans headline | An accent word in a second face. | One face for the headline. |
| J14 | Tiny uppercase tracked labels | A label above every section heading. | Fold it into the heading. 24% of reference landing pages use at least one against 51% of AI-built ones, so a few are fine and one above every section is the stock version. |
| J15 | Icon in a tinted rounded square | Every feature has one. | Icon alone, or none. |
| J16 | Sparkle icon for anything involving AI | Decoration. | A label that says what the feature does. |
| J17 | Section numbering (`01 / 04`) | Decoration. | Remove unless the order matters to the reader. |
| J18 | Soft drop shadow on every card | The same blurred shadow everywhere. | A 1 px border at low contrast, or one shadow level reserved for things that float. |
| J19 | Buttons whose only hover state is a fade | Opacity change, nothing else. | A hover, a focus-visible and an active state that differ from each other. |

Copy (interface strings only):

| Id | Tell | Reference | AI-built | Fix |
|---|---|---|---|---|
| J20 | Hype words | 36% use 2 or more | 23% | Not a tell by evidence. Say what the product does in the customer's words. |
| J21 | "It's not X, it's Y" | not measured | not measured | State the point. |
| J22 | Headline that fits any product | not measured | not measured | Name what this product does and for whom. |
| J23 | "Learn more", "Get started", "Explore" as the only button labels | not measured | not measured | Say what happens when it is pressed. |
| J24 | Residue: `{{tokens}}`, "Certainly!", markdown on the page | not measured | not measured | Remove. This is a defect. |

Copy changes need the user's approval. A climbing shop may say "harness". A studio that is really named Summit keeps its name.

## Dashboard tells

Every metric, chart, column and control on a dashboard is content. Reorder and reweight. Never delete one, and never add one.

| Id | Tell | Fix |
|---|---|---|
| A01 | A grid of 8 equal KPI cards | Keep all 8. Give one or two the lead by size and position, and set the rest smaller. |
| A02 | First screen holds only large metric cards while a chart and a table sit below | Tighten the cards so the existing chart and the start of the existing table rise above the fold. |
| A03 | Marketing spacing: card padding of 32 to 48 px | 16 to 20 px. Table rows of 40 to 48 px. |
| A04 | Decorative sparklines, gauges and progress rings | Report any chart nobody could read a value from. Group, order and set it quieter. Never remove it: removal is outside Squeegee's scope. |
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

Do not flag these. Each appeared on a large share of the reference pages.

- A dark page (27% of reference landing pages) or a pure white page (48% of all reference pages).
- Tailwind (36% of reference landing pages) or shadcn components whose theme has been customized.
- Inter, Geist or any single font, alone.
- Three columns of true peers, a pricing table with checkmarks, a bento grid sized by importance.
- A dark mode toggle, navigation icons, row chevrons, status dots that mark real state.
- Rounded corners. The reference median radius is 8 px and the spread runs from 3 px to 50 px.

## The Zap, Shield, Sparkles triad

Three feature cards titled with speed, security and intelligence, each with the matching stock icon, is the clearest single sign of a generated features section. Treat it as J07 confirmed.
