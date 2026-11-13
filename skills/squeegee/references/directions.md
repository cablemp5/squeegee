# Directions

A direction is a short set of choices that the rest of the run follows. It comes from the product and from any reference the user gave. Every direction is previewed on the real page before a file changes, states its choices as numbers, and is checked against those numbers when the run ends.

## Read the product first

Before proposing anything, read the README, the route list, the data models and the existing copy. Write five lines:

- **Product:** what it does, in one sentence a customer would say.
- **Audience:** who uses it and in what setting (at a desk all day, on a phone in a shop, once a year).
- **Existing assets:** logo, brand colors, fonts, photography, illustration. These stay.
- **Surface:** landing page, dashboard, desktop app or mobile app. This decides density.
- **What must stay familiar:** the parts used so often that changing them would feel hostile.

If the repo holds no brand material and the copy does not say what the product is, ask the user one question: who is this for and what should it feel like?

## Ingredients

A direction is made of ingredients. `measure.js` reads the same list from any rendered page as `ingredients`, so the current screen, a reference and the finished screen are all described in the same terms.

| Ingredient | Field in `ingredients` |
|---|---|
| Ground and whether it is dark | `ground`, `dark` |
| Ink (the most-used text color) | `ink` |
| Accent (the saturated color on buttons) | `accent` |
| Faces | `bodyFace`, `headingFace`, `monoFace` |
| Headline size, weight, line height and tracking | `headline` |
| Body size and line height | `body` |
| Corner radius and pill shapes | `radius`, `pills` |
| Shadow use (share of boxes with a shadow) | `shadowShare` |
| Density (words per screen) | `wordsPerScreen` |
| Imagery (images, drawings, videos) | `imagery` |

Step 1 already saved the current screen's ingredients in its measure file. They are the "before" column of every direction.

## References

`--ref <url or image>` may appear any number of times. Several refs feed one direction unless the user says they are alternatives. Words the user wrote about a ref ("for its type", "but warmer", "not the purple") are its note, and a note limits what is taken from that ref.

For each ref, in the order given:

1. **A URL.** Load it at 1440 px and evaluate `measure.js` in the page. Save the result as `.squeegee/ref-<n>.json`, and unless `--no-shots` save an image as `.squeegee/shots/ref-<n>.png`. Its ingredients are the `ingredients` field: quote them, with no adjusting by eye.
2. **An image.** Look at it and write the same ingredient list by eye, with "read by eye" beside it. Colors sampled from an image are estimates.
3. **A ref that will not load.** Say so, name it, and continue with the rest.

Take ingredients only. A ref's layout, text, images, logo and signature effect stay behind: a hero lifted from a ref is the ref leaking. Three limits:

- **The product's brand outranks a ref.** Brand color, logo and name stay (rule 3 in SKILL.md). A ref's accent replaces the brand color only when the user's note asks for it.
- **A face you cannot ship is replaced by its genre.** When a ref uses a licensed face, name a face of the same genre that the project can load, and say which face it stands in for.
- **A ref ingredient that fails a scored UX law is corrected, not copied.** Text at 3.4:1 in the ref becomes 4.5:1 here.

## How many directions

| Situation | Prepare |
|---|---|
| No ref, tier Grimy or Opaque, depth `full` or `deep` | Three: the quiet one, the fitted one and the dealt one (below). |
| No ref, anything else | One: the quiet one. |
| One ref, or several the user means as one look (the default) | Two: the ref direction, built from all of them, and the quiet one. |
| Refs the user calls alternatives ("either", "or", "show me each") | One per alternative, up to three, plus the quiet one when there are only two. An alternative may be one ref or a group of refs. Name any alternative beyond the third as not previewed. |
| A direction saved in `.squeegee.md`, and no ref in this run | That direction, with no previews. A ref in this run reopens the choice. |

- **The quiet one** keeps the current design and changes only what the audit flagged: the type scale, the weights, the labels, the stock defaults. Its contract is the current screen's ingredients with those values corrected.
- **The fitted one** starts from the archetype that fits the product (below) and is bent to the product's own colors and content.
- **The dealt one** starts from a hand dealt by `node <skill folder>/scripts/direction.mjs deal <project folder name> 2`. Models reach for the same few looks when they choose freely, and a dealt hand starts outside that habit. Take the first hand. Bend it to the product. When the product rules out a dealt value (a monospace face for a children's shop), take that value from the second hand and say so.
- **A ref direction** takes every ingredient the notes allow from its refs. A ref is a source, and the direction is what gets a preview: ten refs for one look make one direction and one preview. When it has several refs, a note decides which ref gives an ingredient. Without a note, take the value most of the refs share, within the tolerances `direction.mjs check` uses. When no value is shared, take the earliest ref's. Name any ref that gave nothing.

Whatever the source, the directions shown together differ on at least three of these axes: type genre, color temperature, light or dark ground, density, corner shape, imagery. Changing only palette, radius or icon style does not make a new direction. All are finished to the same level, all pass the scored UX laws in `ux-laws.md`, and all pass the over-correction check below before the user sees them.

## Close the agent drift

Agent-written pages drift from professionally made pages of the same kind in the same few ways. Every direction, the quiet one included, closes them unless the product gives a reason to keep one. The reference column is developer-tool sites, the closest kind. Body size, headline weight and words compare 419 agent-written sites with 78 of them. The four sprawl rows come from `measure.js` on 236 agent-written pages and 39 of them.

| Property | Reference | Agent-written | A direction sets |
|---|---|---|---|
| Body text size | 16 px | 14 px | 16 px. Dense app tables may run 13 or 14 px. |
| Headline weight | 500 | 600, and 19% go above 700 | 500 or 600. Heavier only when the direction is built on it. |
| Text sizes 1 px apart (more than 4 pairs) | 23% | 39% | A scale of nine steps or fewer with no two steps 1 px apart. |
| More than 5 small uppercase labels | 18% | 31% | Five or fewer, each naming a group. |
| More than 6.6% of text under 12 px | 13% | 21% | 12 px as the smallest size. |
| More than 4 font weights | 23% | 28% | Three: text, emphasis, display. |
| Words on the page | 884 | 554 | The content the page has. Squeegee adds none: report a page that says too little to sell the product. |

## The contract

Each direction is saved as `.squeegee/direction-<n>.json` before it is previewed:

```json
{
  "name": "Ledger, from ref 1",
  "summary": "White ground, one blue, a light headline. Type and radius from ref 1, accent from the product.",
  "sources": { "ground": "ref 1", "type": "ref 1", "radius": "ref 2", "accent": "product", "imagery": "product" },
  "contract": {
    "ground": "#ffffff", "dark": false, "ink": "#1c2430", "accent": "#1f56c4",
    "bodyFace": "Inter", "headingFace": "Inter",
    "headline": { "size": 48, "weight": 500 }, "body": { "size": 16 }, "radius": 4
  },
  "preserved": "The game art, the logo, every route and form.",
  "changes": ["Body text from 13 px to 16 px", "Eleven weights become three", "38 uppercase labels become 5"],
  "cost": "One font file to load."
}
```

- `sources` names where each ingredient came from: a ref by number, the product, an archetype or the dealt hand. Nothing in a direction is unsourced.
- `contract` holds the values the finished screen will be measured against. State every ingredient the direction decides. Leave out one it does not touch.
- `changes` gives the three largest differences from the current screen, as before and after values.

## Rendering the previews

Previews must leave no lasting change in the project. The preservation inventory from `passes.md` is already taken at this point.

With a browser tool, in order of preference:

1. **Inject first.** Load the page and add a temporary stylesheet to the rendered page through the browser tool (for example its script or style injection). Override the theme tokens and the styles the direction changes. No file changes, so nothing needs restoring.
2. **If injection cannot show the direction** (it needs a different font file or changed markup): copy each file you will touch to `.squeegee/preview-backup/` first, with its path, and list any file you create in `.squeegee/preview-created.txt`. Edit, capture, then restore every copied file from the backup and delete every created file. The backup is the only restore path (rule 10 in SKILL.md).

Then, for each direction:

3. Evaluate `measure.js` in the previewed page, save it as `.squeegee/preview-<n>.json`, and run `node <skill folder>/scripts/direction.mjs check .squeegee/direction-<n>.json .squeegee/preview-<n>.json`. Fix the preview until every line passes, so the image the user chooses from is the direction as written.
4. Capture it at 1440 px, the first screen and one screen further down. Save as `.squeegee/shots/direction-<n>.png`. With `--no-shots`, show the images in the conversation and skip steps 5 and 6.
5. Write `.squeegee/shots/directions.json`: an array of `{ "name", "summary", "preserved", "changes", "cost" }` in the same order, copied from the direction files.
6. Run `node <skill folder>/scripts/compare.mjs directions .squeegee/shots`. It writes `.squeegee/directions.html`.
7. Confirm that `git status --porcelain` matches `.squeegee/start-status.txt` exactly, that the hash of `git diff` matches `.squeegee/start-diff.txt`, and that the preservation inventory is unchanged. Outside a git repository, compare each file in `.squeegee/preview-backup/` with its original instead. If anything differs, restore from the backup before doing anything else.

Without a browser tool, write the directions as text in the contract format and say that they were not rendered or checked.

For a section with a layout tell (three equal cards, the same centered template) at `full` or `deep`, put the layout change inside a direction's preview and name it in that direction's `changes`. It keeps all the content and links.

Show the user each direction with its sources and its three changes. Ask them to pick by number and to name anything to change: an ingredient moved from one direction to another is a normal request. Save the chosen direction as `.squeegee/direction.json` and record it in `.squeegee.md`.

## Holding the result to the contract

The chosen direction is a promise about the finished screen.

1. After the last pass group, evaluate `measure.js` on the finished screen and run `node <skill folder>/scripts/direction.mjs check .squeegee/direction.json <the after measure file>`.
2. A line that fails is repaired, or goes under "Still open" in the final report with its reason. The report carries the check's output as it printed.
3. The blind recheck (step 8 of SKILL.md) also receives `.squeegee/direction.json` and the approved preview image. It says whether the finished screen is the approved preview, naming any difference in type, ground or material. Its verdict goes in the report in its own words.

## Archetypes

Ten starting points for the fitted direction. Eight are drawn from the measured profiles of the reference pages grouped by kind, in the "Reference profiles by kind" table of [RESULTS.md](https://github.com/cablemp5/squeegee/blob/master/research/RESULTS.md). Numbers are medians or shares for that group, and the smaller groups hold 20 to 30 pages, so read them as a sketch. The two native archetypes rest on the platform guides: the research holds no native app screens. Describe each by its ingredients, with no brand named.

| Archetype | Fits | Ingredients | Measured profile |
|---|---|---|---|
| Technical dark | Developer tools, infrastructure, APIs | Near-black ground, light ink, one cool accent, a monospace face for code and labels, pill-shaped tags, real code or terminal output as the imagery | 57% dark, 73% use a monospace face, 58% use pill shapes, radius 8 px, headline 62 px at weight 500 with tracking of -0.02 em, body 16 px |
| Bright product | Productivity and team software | White or warm off-white ground, a friendly sans, generous radius, real product screenshots as the main imagery, long scrolling pages | 66% pure white, 14% dark, radius 12 px, headline 64 px at weight 500, about 960 words |
| Trust ledger | Finance, insurance, legal | White or cool off-white ground, a restrained accent, no serif, numbers set in tabular figures, long explanatory pages | 62% pure white, 10% dark, no serif headlines, radius 12 px, about 1,260 words |
| Quiet catalog | Commerce, hardware, physical goods | White ground, no accent color on buttons, photography carries everything, smaller headline, plain buttons in ink | 66% pure white, 66% have no saturated button color, headline 48 px |
| Editorial | News, magazines, long-form writing | Serif headlines, small heavy headings, tight radius, dense text in columns, rules between items | 29% serif headlines, headline 38 px at weight 700, radius 4 px, about 1,640 words |
| Studio minimal | Agencies, portfolios, studios | Very little on the page, small body text, near-square corners, no accent, work samples at full width | Radius 4 px, 63% have no saturated button color, body 14 px, about 210 words |
| Friendly consumer | Consumer apps, food, fitness, travel | A warm accent, pill buttons, heavier headline, photography of people or product | 48% use pill shapes, radius 12 px, headline weight 600 |
| Working app | Dashboards, admin panels, tools | Small radius, compact spacing, a modest heading, tables and forms as the content, dark mode offered | Radius 6 px, headline 42 px at weight 600, 40% dark, about 230 words on screen |
| Native mobile | iOS and Android apps | The platform's own font, navigation and controls, the platform's corner radius, one accent | Not measured. Follow the platform guide. |
| Native desktop | Mac, Windows and Linux apps | The system font, dense controls, a ground that follows the system setting, restrained radius, the platform's icons | Not measured. Follow the platform guide. |

Pick by what the product is, then bend: use the product's own brand color as the accent, its own screenshots or photography as the imagery, and its audience to set density.

Most agent-written projects are developer tools, and most of those already look like "Technical dark": 67% are dark and 70% use a monospace face. For such a project the fitted direction is close to the quiet one, so the dealt direction is the real alternative. Say so when you present them.

## Over-correction check

Run this on each direction before showing it, and on the finished screen at step 7. A fix that lands on one of these has replaced one template with another. Undo it and choose from the product.

| If you removed | The next template, which is the same finding again |
|---|---|
| A purple or blue gradient | A cream ground with a terracotta or rust accent and a serif headline |
| Inter or the system font | Whichever face is fashionable this year, chosen with no reason from the product |
| Glass cards | Grain, noise or a dot grid over the same layout |
| Three equal cards | A bento grid holding the same three items |
| Rounded everything | Hard-edged brutalism with a monospace face on a product that is not technical |
| Emoji icons | A sparkle or a different icon set used the same decorative way |
| A badge above the headline | A tracked uppercase label above the headline |
| A drop shadow on every card | A glow or a colored border on every card |
| Fade in on scroll | A different entrance on every section |

Two last tests:

- **Swap test.** Put another product's name on the finished screen. If it still fits, the direction did not come from this product.
- **Wireframe test.** Strip color and type in your head and look at the skeleton. If the skeleton is the category's default page, the layout was not addressed. Say so in the report. Changing it is a `full` or `deep` decision.
