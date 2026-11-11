<img src="assets/icon.svg" width="64" height="64" alt="">

# Squeegee

An agent skill that cleans AI-looking UI that already exists. It audits a page, a dashboard or an app, rates how generated it looks, shows three design directions on your real page, then fixes it at the theme source without breaking what works.

It does not build new UI. It makes the choices nobody made.

## Status

Version 0.1.0, first build.

- **Tested:** the detector (11 tests), the research scripts on 838 pages, and the script that builds the before and after page.
- **Not yet tested:** a full `/squeegee` run on a real project, the install commands below, and agents other than Claude Code.
- **Reviewed:** two independent model reviews of the plan and of the build. Their findings are fixed or listed as limits.

## What it found

Most lists of "AI tells" are opinion. This one was measured. A script loaded 565 professionally made sites and 273 pages published from AI site builders, read their computed styles, and counted. The tables below compare 282 reference landing pages with 84 AI-built ones of similar length.

| | Reference landing pages | AI-built landing pages |
|---|---|---|
| shadcn-style theme variables present | 6% | 87% |
| Lucide icons | 10% | 87% |
| No font chosen | 15% | 58% |
| Headline weight 700 or more | 22% | 67% |
| Badge above the headline | 6% | 35% |
| **Five or more of nine stock defaults** | **2%** | **76%** |

Several things widely called AI tells differed little between the two groups, or ran the other way:

| | Reference landing pages | AI-built landing pages |
|---|---|---|
| Purple or violet as a main color | 9% | 6% |
| Three equal icon cards in a row | 52% | 45% |
| Bento grid | 25% | 17% |
| Two or more hype words | 36% | 23% |

In this sample, what marked an AI-built page was a cluster of stock defaults, not purple gradients. So squeegee counts stock defaults as a cluster, fixes them where they are defined, and treats the rest as things to weigh, not things to ban.

These are associations in one sample of 84 AI-built landing pages from four builders. They are not proof of cause, the signals record presence and not quality, and the mobile and desktop reference rows are product websites, not app screens.

The full tables, the method and its limits are in [research/RESULTS.md](research/RESULTS.md). The 565 reference sites are listed in [research/reference-sites.csv](research/reference-sites.csv).

## What it does

1. **Looks first.** Captures the screen at desktop and phone width, in light and dark mode.
2. **Audits.** A detector scans the code with 16 candidate rules and 9 stock-default checks and reports candidates. The agent confirms each one reaches the screen, adds six checks drawn from the Laws of UX, and weighs the judged tells.
3. **Rates the tier.** Spotless (no slop), Streaky (light slop), Grimy (heavy slop) or Opaque (slop maxed).
4. **Shows three directions** when the screen is Grimy or Opaque. Each is rendered on your page's own first section without changing your files, so you choose by looking. A Streaky screen keeps its design and gets one direction.
5. **Fixes in three passes.** Theme and tokens, then structure and copy, then motion. After each pass it looks again, runs your typecheck, build and tests, and confirms every link, field, handler and piece of content still exists.
6. **Rechecks blind.** A fresh agent that never saw the first audit rates the result.
7. **Shows the result.** A before and after page, and a report that states what passed, what failed and what did not run.

## Install

Claude Code:

```
/plugin marketplace add cablemp5/squeegee
/plugin install squeegee@squeegee
```

Any agent that reads skills (Claude Code, Cursor, Codex):

```
npx skills add cablemp5/squeegee
```

Or copy `skills/squeegee` into your agent's skills folder.

## Use

```
/squeegee audit app/page.tsx
/squeegee app/                              # audit, propose, wait for approval, fix
/squeegee fix lite components/Hero.tsx
/squeegee deep http://localhost:3000 --ref https://example.com
```

| Argument | Meaning |
|---|---|
| `audit` | Report only. |
| `fix` | Apply the findings without waiting for approval. It still asks you to pick a direction when one is needed and none is saved. |
| neither | Audit, show the proposal and the directions, wait once for approval, then fix. The default. |
| `lite` | Restyle only: tokens, type, color, spacing, states. |
| `full` | May restructure a section that has a layout tell. |
| `deep` | May rework the page and fix structural UX problems. |
| a path | The file or folder to clean. |
| a URL | Where to look at the page. Squeegee then works on the project that serves it. |
| `--ref <url or image>` | A design you want this to feel like. |
| `--no-shots` | Save no images and build no before and after page. |
| `--no-recheck` | Skip the blind recheck. |

With no depth given, squeegee proposes one from the tier.

Squeegee is a slash command only. It never starts on its own. Installed as a Claude Code plugin, the command is `/squeegee:squeegee`.

## What it will not do

- Add features, sections, claims, numbers, testimonials, logos or legal text.
- Delete content, metrics, calls to action, pricing tiers or forms. It reorders and reweights what exists.
- Change your brand color, logo or the meaning of your content without asking.
- Commit anything.
- Replace one template with another. A removed gradient does not become grain, and a removed font does not become this year's fashionable one.

## Decisions it remembers

Squeegee keeps your choices in `.squeegee.md` at the project root: the direction you picked, and anything you told it to keep with the reason. Later runs read it and stay consistent. Images and logs go in `.squeegee/`, which ignores itself in git.

## Browser tools

Squeegee works on code alone, and then it labels every visual result unverified. It works much better when it can see the page. It uses the first of these it finds and never installs one itself:

1. **Playwright MCP.** Sets exact viewport sizes, switches color scheme, and reads computed styles, so contrast and target sizes are measured.
2. **Chrome DevTools MCP.** Similar captures, plus console errors.
3. **Your agent's own browser.** The way to reach screens behind a login with your real session.

For native mobile and desktop apps, give it a simulator or device screenshot tool, or screenshots.

## What it covers

| Surface | Audit, tier, directions, judged fixes | Detector and source fixes |
|---|---|---|
| Landing pages, dashboards, web apps (React, Tailwind, shadcn, plain CSS) | Yes | Yes |
| Desktop apps built with web code (Electron, Tauri) | Yes | Yes |
| React Native | Yes, with thinner rules: the research holds no native app screens | Planned |
| SwiftUI, Flutter, WinUI | Yes, with thinner rules | No |

## Rerun the research

The capture needs Node 22 or later and an installed Chrome. It has no dependencies and uses no model.

```
node research/capture.mjs <sites.csv> <outDir>
node research/find-ai-pages.mjs <out.csv>
node research/analyze.mjs <reference.jsonl> <ai-built.jsonl> --write research
```

What reads as generated changes every year. Rerunning this is how the tells stay current.

## Test

```
node --test skills/squeegee/scripts/detect.test.mjs
```

## Roadmap

- **Click to comment on directions.** Click any element in a direction preview, type a note, and hand all notes back to the agent.
- **Unslop replay.** A short video of the old page becoming the new one, with fonts, spacing, images and colors changing in order.
- **React Native detector.**
- **An evaluation suite.** Slopped fixtures in, squeegee runs, a blind judge and the preservation check score the result.

## Credits

Squeegee's structure draws on [unslop](https://github.com/heydamir/unslop), [hallmark](https://github.com/Nutlope/hallmark), [impeccable](https://github.com/pbakaus/impeccable), [taste-skill](https://github.com/leonxlnx/taste-skill), [ui-craft](https://github.com/educlopez/ui-craft), [no-ai-design-slop](https://github.com/mengto/skills) and [design-lab](https://github.com/0xdesign/design-plugin). Its motion values come from [Emil Kowalski's skills](https://github.com/emilkowalski/skills). Its law checks follow [Laws of UX](https://lawsofux.com) by Jon Yablonski. No text from any of them is copied here.

## License

MIT.
