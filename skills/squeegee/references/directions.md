# Directions

A direction is a short set of choices that the rest of the run follows. It comes from the product. This file covers how to read the product, how to build three directions that are worth choosing between, the archetypes to start from, and the check that stops a fix from becoming the next template.

## Read the product first

Before proposing anything, read the README, the route list, the data models and the existing copy. Write five lines:

- **Product:** what it does, in one sentence a customer would say.
- **Audience:** who uses it and in what setting (at a desk all day, on a phone in a shop, once a year).
- **Existing assets:** logo, brand colors, fonts, photography, illustration. These stay.
- **Surface:** landing page, dashboard, desktop app or mobile app. This decides density.
- **What must stay familiar:** the parts used so often that changing them would feel hostile.

If the repo holds no brand material and the copy does not say what the product is, ask the user one question: who is this for and what should it feel like? Do not guess.

## Sources, in order

1. `--ref <url or image>`. Look at it, name its ingredients (ground, ink, accent, type, radius, density, imagery), and apply those ingredients to this product's content. Do not copy its layout, text or assets.
2. A direction already saved in `.squeegee.md`. Use it without asking again.
3. The archetypes below. Each is a starting point that you bend to the product's own colors and content.

## Three directions

Offer three when the tier is Grimy or Opaque and the depth is `full` or `deep`. Otherwise offer one that keeps the existing design.

Each direction states:

- its name and the archetype it starts from
- ground, ink and accent as color values
- the type face or faces, with headline weight and size
- radius, border and shadow treatment
- density (spacing scale step for sections and for cards)
- icon style and imagery
- **preserved bones:** what stays exactly as it is
- **main changes:** the three largest differences from the current screen
- **cost:** what it needs that the project lacks (a font file, real screenshots, photography)

Rules:

- The three differ from each other on at least three of these axes: type genre, color temperature, light or dark ground, density, corner shape, imagery. Changing only palette, radius or icon style does not make a new direction.
- All three are finished to the same level. No option is a sketch beside a polished one.
- All three meet the thresholds in `ux-laws.md`. A plain direction that is correct beats a striking one that fails contrast.
- All three pass the over-correction check below before the user sees them.
- At least one direction is the quiet option: closest to the current screen, with the stock defaults replaced and nothing else moved.

## Rendering the previews

Previews must not change the project. The preservation inventory from `passes.md` is already taken at this point.

With a browser tool, in order of preference:

1. **Inject, do not edit.** Load the page and add a temporary stylesheet to the rendered page through the browser tool (for example its script or style injection). Override tokens and the first section's styles there. No file changes, so nothing needs restoring.
2. **If injection cannot show the direction** (it needs a different font file or changed markup): copy each file you will touch to `.squeegee/preview-backup/` first, with its path, and list any file you create in `.squeegee/preview-created.txt`. Edit, capture, then restore every copied file from the backup and delete every created file. Never use `git checkout`, `git restore`, `git stash` or `git clean` to restore: the tree may hold the user's uncommitted work.

Then:

3. Capture each direction at 1440 px. Save as `.squeegee/shots/direction-1.png`, `-2.png`, `-3.png`. With `--no-shots`, show the images in the conversation and skip steps 4 and 5.
4. Write `.squeegee/shots/directions.json`: an array of `{ "name", "summary", "preserved", "changes", "cost" }` in the same order.
5. Run `node <skill folder>/scripts/compare.mjs directions .squeegee/shots`. It writes `.squeegee/directions.html`.
6. Confirm that `git status --porcelain` matches `.squeegee/start-status.txt` exactly, and that the preservation inventory is unchanged. If either differs, restore from the backup before doing anything else.

Without a browser tool, write the three directions as text in the format above and say that they were not rendered.

For sections with a layout tell (three equal cards, the same centered template), add two layout options per section to the same page at `full` and `deep`. Each keeps all the content and links.

Ask the user to pick by number and to name anything to change. Save the result to `.squeegee.md`.

## Archetypes

Ten starting points. Eight are drawn from the measured profiles of the reference pages grouped by kind, in the "Reference profiles by kind" table of `research/RESULTS.md`. Numbers are medians or shares for that group, and the smaller groups hold 20 to 30 pages, so read them as a sketch. The two native archetypes rest on the platform guides: the research holds no native app screens. None names a brand: describe ingredients, never "like" another product.

| Archetype | Fits | Ingredients | Measured profile |
|---|---|---|---|
| Technical dark | Developer tools, infrastructure, APIs | Near-black ground, light ink, one cool accent, a monospace face for code and labels, pill-shaped tags, real code or terminal output as the imagery | 57% dark, 73% use a monospace face, 58% use pill shapes, radius 8 px, headline 62 px at weight 500 |
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

## Over-correction check

Run this on each direction before showing it, and on the finished screen at step 7. A fix that lands on one of these has replaced one template with another. Undo it and choose from the product.

| If you removed | Do not land on |
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
