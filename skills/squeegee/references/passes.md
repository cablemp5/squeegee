# Passes

Read the first two sections at step 5, before any file changes. Read the whole file again immediately before the first edit in step 6. It covers where a fix belongs, how to prove nothing broke, and the values for each pass group.

Rule 5 in SKILL.md applies to every value here. Where the project's own scale or a platform convention won, say so in the report.

## Take the preservation inventory (step 5, before anything changes)

List for every file in the target, and for every shared file you may edit:

- every `href`, route and navigation call, with its destination
- every form and field: `name`, `id`, `type`, `required`, validation attributes, and what the field's value is bound to
- every event handler, with the name of the function it calls
- every `data-testid`, `aria-*` attribute, `role` and accessible name
- every `"use client"` or `"use server"` directive
- every exported component's prop names and types
- every state prop passed to headless components (`open`, `onOpenChange`, `asChild`, `value`, `onValueChange`)
- every conditional branch that renders something (loading, empty, error, signed-out)
- every piece of visible content: headings, metrics, list items, table columns, images

Save it to `.squeegee/before.json`.

After each pass group, take it again and compare entry by entry, values included. A link that kept its `href` but lost its visible text has changed. A handler that kept its name but is no longer attached to a rendered element has changed. Any difference you did not intend is a failure: name the edit that caused it and restore that one edit.

The inventory proves that names and bindings survived. It does not prove behavior. With a browser tool, also exercise what you touched: follow each changed link, submit each changed form with valid and invalid input, open and close each changed dialog or menu, and tab through the screen. Report these as run or not run.

## Check consumers before touching anything shared

A theme variable or a shared component variant changes every screen that uses it.

1. Search for every use of the variable, class or component you are about to change. Include indirect uses: a variable referenced by another variable, a component re-exported under another name, a style inherited from a parent.
2. If every use is inside the target, change it.
3. If uses exist outside the target, choose one: add a new variant or token and use it in the target only, or stop and ask to widen the scope to those screens.
4. If you cannot tell where a shared definition is used, treat it as used outside the target.
5. Record the list of consumers in the report.

A token change is the right fix when the user asked for the whole app. A one-off override in a component file is the wrong fix wherever a token or variant can carry it. A local exception is fine when the element truly is unique.

When a file in the target imports a shared component you may not change, that component keeps its old look. Report it as open. The run still passes.

## Find the styling system

Use the detector's `stack` field, then confirm by reading the files.

| System | Where theme values live | How to add a token |
|---|---|---|
| Tailwind v4 | An `@theme` block in the main CSS file | `--color-accent: oklch(...)` inside `@theme`. Utilities appear from the variable name. |
| Tailwind v3 | `tailwind.config.*` under `theme.extend`, with CSS variables in `:root` | Add the variable in `:root`, map it in `theme.extend.colors`. |
| shadcn | CSS variables in the main CSS file, variants in `components/ui/*` | Change the variable values. Add a variant with `cva` for a new look. |
| Plain CSS or CSS modules | `:root` custom properties, or none yet | Create the custom properties in one file and reference them. |
| CSS-in-JS, React Native, SwiftUI, Flutter, WinUI | The project's theme object or style constants | Follow the project's own pattern. The detector's line rules do not cover these, so say so in the report. |

Tailwind v4 already limits `hover:` to devices that can hover. Tailwind v3 does not: there, gate hover styles yourself.

When you cannot edit the styling system safely, report it and leave the files as they are.

## Log every change

Append one line per change to `.squeegee/changes.jsonl`:

```json
{"pass":"theme","file":"app/globals.css","target":"--primary","property":"color","before":"222.2 47.4% 11.2%","after":"oklch(0.52 0.14 150)","rule":"D01"}
```

The final report is built from this log. So is the check at step 9 that every changed file is one you changed on purpose.

## Group 1: theme and tokens

Do this first so every later fix can reference a token.

1. **Neutrals.** One ground, one ink, one muted ink, one hairline. Tint the neutrals slightly toward the accent's hue.
2. **Accent.** It comes from the brand or the chosen direction. In the research, 73% of reference pages had one saturated button color or none, and 36% had none.
3. **Type.** Load the direction's face once. Two families is typical: 67% of reference pages use two or fewer. Set the scale so each level is clearly larger than the next. The reference median headline is 3.5 times the body size, and the range runs from 1.4 to 5.5.
4. **Radius.** One base value and derived steps. An inner radius equals the outer radius minus the padding between them.
5. **Shadow and border.** One hairline. At most two shadow levels, used for things that float.

When sprawl measures are over their limit, group 1 is where they come down. List every distinct text size, weight and text color the target uses. Map each to the nearest step of a scale, so no two steps sit 1 px apart: nine sizes or fewer, three weights or fewer, ink and muted ink plus one color per state or role. Define the steps as tokens, then replace each literal value with its token. Raise text under 12 px to 12 px or more. Every element keeps its role: a caption stays the smallest step and a headline stays the largest. Run `measure.js` after the group and confirm that each count fell.

The source variation measures in `detect.json` say where the one-off values live. For each measure that is over, move its values into the theme in this group: hard-coded colors and arbitrary values become tokens, repeated inline styles become a class or a variant, and the label style becomes one token or component. Rerun the detector and confirm that each measure fell.
6. **Icons.** Set stroke width and size once, matched to the body text weight.
7. **Motion tokens.** See group 3. Define them now.
8. **Dark mode.** Every token gets a dark value. A screen that had dark mode before must still have it, at 4.5:1 or better.

After this group, check that no file inside the approved scope still uses a hard-coded color where a token now exists.

## Group 2: structure and copy

Work file by file. In each file, do these in order.

1. **Spacing.** Use the project's scale. If it has none, use 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 96. Replace arbitrary values that have no reason. Space inside a group is clearly smaller than the space between groups. Vary section spacing by content: identical padding on every section is the template look.
2. **Color use.** Apply the accent to the main action and to links. Remove color that carries no meaning. Where color marks a state or a category, add a label or an icon and keep the color.
3. **Type.** Headline weight follows the direction. The reference median is 500. Body at 16 px or more on marketing pages, with lines of 45 to 75 characters. Dense interfaces may run smaller. Tabular numerals in tables and prices.
4. **Components and icons.** One filled primary button per surface, where a surface is a page, a dialog, a card or a pane. Two primary actions that the product needs side by side both stay: make one filled and one quiet. Run the removal test on every border, shadow, badge and icon tile.
5. **Layout.** Only at `full` and `deep`, and only for sections with a layout tell. Use the layout the user picked. Keep every piece of content and every link.
6. **Copy.** Interface strings only, and only with approval. Fix residue without asking.
7. **States.** Every interactive element gets hover, focus-visible, active and disabled styles where that state applies to it. These are styles on existing elements, so they are in scope at every depth. Missing loading, empty and error states are reported at `lite` and `full`. At `deep`, build one only where the code already tracks that state.
8. **Mechanical UX law fixes** from `ux-laws.md`: target size, spacing between targets, link styling.

## Group 3: motion

Keep the project's own motion tokens and conventions when it has them. Otherwise define these once in the theme:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* entering and leaving */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* moving on screen */
--duration-press: 120ms;
--duration-fast: 160ms;   /* hover, color, small state changes */
--duration-base: 220ms;   /* menus, popovers */
--duration-slow: 300ms;   /* drawers, dialogs */
```

Defaults:

- Interface transitions stay at 300 ms or less. The reference median is 200 ms.
- Prefer `transform` and `opacity`. Replace `transition: all` with the named properties that change.
- A press state on buttons and small controls that have none: `transform: scale(0.97)` over the press duration. Not on cards, table rows or tabs.
- Nothing enters from `scale(0)`. Start at `scale(0.95)` with `opacity: 0`.
- One entrance per page at most. No identical reveal on every section.
- Feedback for an action stays whether it came from a pointer or the keyboard. Remove only motion that delays a frequent action.
- Add `@media (prefers-reduced-motion: reduce)` that shortens or removes movement while keeping state changes visible.
- On Tailwind v3 or plain CSS, put hover styles inside `@media (hover: hover) and (pointer: fine)`. Touch and keyboard users get the same information another way.

### Removing an animation

1. Find everything attached to it: the hidden start state (`opacity: 0`, `initial={{ opacity: 0 }}`, a `forwards` keyframe), any `onAnimationEnd`, `onTransitionEnd` or `onExitComplete` callback, and any timeout sized to its duration.
2. Remove the hidden start state, so the content is visible without the animation.
3. For each callback or timeout, read what it does. If it does real work (closes a dialog, unmounts an element, navigates, sets state, moves focus), keep that work and make it run directly at the moment the animation used to end. Removing the callback is only correct when it did nothing but clean up the animation itself.
4. If you cannot show that the work still happens, leave the animation in place and report it.
5. Look at the rendered screen and exercise the element.

## After each group

1. Look at the rendered screen at both widths and both modes. Check 320 px for horizontal overflow.
2. Run the project's typecheck, build and tests, using the scripts in `package.json`.
3. Compare the preservation inventory and exercise what you touched.
4. If a check fails: repair, then run all three again. Three rounds per group at most.
5. If it still fails after three rounds, restore that group's edits from the change log, stop, and report what failed and why.

## When the fix is to stop and report

- The styling system is one you cannot edit safely.
- A finding sits in a shared file whose consumers you may not touch, and no variant can isolate it.
- The screen needs content you do not have: a real screenshot, a real quote, a real number, a missing control. Leave the existing content as it is.
