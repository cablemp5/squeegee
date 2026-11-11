#!/usr/bin/env node
// Compares two capture runs: how often each signal appears on reference sites and on AI-built pages.
// Prints the tables, and with --write <dir> also writes RESULTS.md, results.json and reference-sites.csv there.
//
//   node research/analyze.mjs <reference.jsonl> <ai-built.jsonl> [--write research]

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const BLOCKED = /just a moment|attention required|access denied|verify you are human|are you a robot|^\s*$/i;
const loadAll = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  .filter((r) => !r.error && !BLOCKED.test(r.title || '') && r.words >= 15 && !r.passwordFields);
const load = (p) => loadAll(p).filter((r) => r.viewport === 'desktop');
// The same length rule for both groups, so short pages are not compared with long ones.
const landingStyle = (r) => r.words >= 250 && r.pageHeights >= 3;

const fam = (r) => [...(r.fonts || []), ...(r.headingFonts || [])].map(([f]) => f.toLowerCase());
const hasFont = (r, re) => fam(r).some((f) => re.test(f));
const hueShare = (r, list) => (r.hues || []).filter(([h]) => list.includes(h)).reduce((a, [, s]) => a + s, 0);
const topNum = (pairs) => (pairs && pairs[0] ? +pairs[0][0] : null);
const commonRadius = (r) => topNum((r.radii || []).filter(([v]) => +v > 0 && +v < 999));

// Each signal is true or false for one rendered page.
export const SIGNALS = {
  'shadcn-style theme variables present': (r) => r.shadcnVars >= 3,
  'Lucide icons': (r) => r.lucide > 0,
  'No chosen font (system default stack)': (r) => hasFont(r, /^(ui-sans-serif|system-ui|-apple-system|blinkmacsystemfont|segoe ui|sans-serif|arial|helvetica)/),
  'Inter': (r) => hasFont(r, /^inter\b/),
  'Headline weight 700 or more': (r) => !!r.h1 && +r.h1.weight >= 700,
  'Centered headline': (r) => !!r.h1 && r.h1.centered,
  'Body text under 16 px': (r) => r.bodySize > 0 && r.bodySize < 16,
  'Pill badge above the headline': (r) => r.badgeAboveH1,
  'No reduced-motion rule': (r) => !r.reducedMotionRule,
  'Gradient text': (r) => r.gradientText > 0,
  'Three or more checkmark list items': (r) => r.checkmarkItems >= 3,
  'Tailwind classes': (r) => r.tailwindShare >= 0.3,
  'Geist': (r) => hasFont(r, /geist/),
  'Three or more font families': (r) => r.familyCount >= 3,
  'Purple or violet is 30% or more of colored area': (r) => hueShare(r, [270, 300]) >= 0.3,
  'Blue-violet is 30% or more of colored area': (r) => hueShare(r, [240]) >= 0.3,
  'Four or more distinct hues': (r) => (r.hues || []).length >= 4,
  'Pure white page': (r) => r.pureWhite,
  'Dark page': (r) => r.dark,
  '10% or more of text is low contrast': (r) => r.lowContrastShare >= 0.1,
  'Large gradient area': (r) => r.bigGradients > 0,
  'Glass (backdrop blur)': (r) => r.glass > 0,
  'Three equal icon cards in a row': (r) => r.threeCards > 0,
  'Bento grid': (r) => r.bento > 0,
  'Cards inside cards': (r) => r.cardsInCards > 0,
  'Left stripe card': (r) => r.leftStripe > 0,
  'Tracked uppercase labels': (r) => r.trackedCaps > 0,
  'Most common radius 12 px or more': (r) => commonRadius(r) >= 12,
  'Emoji in headings or buttons': (r) => r.emojiInLabels > 0,
  'Em dash on the page': (r) => r.emDashes > 0,
  'Two or more hype words': (r) => (r.buzz || []).length >= 2,
  'transition: all': (r) => r.transAll > 0,
  'A quarter or more of controls under 24 px': (r) => r.interactive > 0 && r.smallTargets / r.interactive >= 0.25,
};

// The nine stock defaults. One alone is harmless. The count per page is the finding.
export const DEFAULTS = Object.keys(SIGNALS).slice(0, 9);

const SERIF = /serif|tiempos|georgia|times|garamond|playfair|freight|canela|lyon|sectra|newsreader|fraunces|caslon|baskerville|charter|merriweather|lora|recoleta|chronicle|publico|guardian|cheltenham|tobias|reckless|signifier|domaine|roslindale/i;
const headFont = (r) => ((r.headingFonts && r.headingFonts[0]) || (r.fonts && r.fonts[0]) || [''])[0];
const FACTS = {
  'Two or fewer font families': (r) => r.familyCount <= 2,
  'One saturated button color or none': (r) => (r.accents || []).length <= 1,
  'No saturated button color': (r) => (r.accents || []).length === 0,
  'Serif headline face': (r) => SERIF.test(headFont(r)) && !/sans/i.test(headFont(r)),
  'Monospace face present': (r) => (r.fonts || []).some(([f]) => /mono|code|courier/i.test(f)),
  'Pill shapes (3 or more fully rounded elements)': (r) => (r.radii || []).some(([v, c]) => +v >= 999 && c >= 3),
};

const pct = (rows, fn) => (rows.length ? Math.round(100 * rows.filter(fn).length / rows.length) : 0);
const q = (xs, p) => { const s = xs.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const defaultsOn = (r) => DEFAULTS.filter((k) => SIGNALS[k](r)).length;
const tally = (rows, key) => Object.entries(rows.reduce((m, r) => (m[r[key]] = (m[r[key]] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]);

export function analyze(good, slop, phone = []) {
  const goodLanding = good.filter((r) => r.surface === 'landing' && landingStyle(r));
  const slopLanding = slop.filter(landingStyle);
  const signals = Object.entries(SIGNALS).map(([name, fn]) => ({
    signal: name, reference: pct(good, fn), aiBuilt: pct(slop, fn), referenceLanding: pct(goodLanding, fn), aiBuiltLanding: pct(slopLanding, fn),
  })).map((s) => ({ ...s, lift: +((s.aiBuiltLanding + 2) / (s.referenceLanding + 2)).toFixed(1) })).sort((a, b) => b.lift - a.lift);
  const cluster = [3, 4, 5, 6, 7].map((n) => ({ atLeast: n, reference: pct(good, (r) => defaultsOn(r) >= n), aiBuilt: pct(slop, (r) => defaultsOn(r) >= n),
    referenceLanding: pct(goodLanding, (r) => defaultsOn(r) >= n), aiBuiltLanding: pct(slopLanding, (r) => defaultsOn(r) >= n) }));
  const measures = {
    'Body text size (px)': (r) => r.bodySize, 'Headline size (px)': (r) => r.h1 && r.h1.size, 'Headline weight': (r) => r.h1 && +r.h1.weight,
    'Headline line height': (r) => r.h1 && r.h1.leading,
    'Headline to body size ratio': (r) => (r.h1 && r.bodySize ? +(r.h1.size / r.bodySize).toFixed(1) : null), 'Font families': (r) => r.familyCount,
    'Distinct text sizes': (r) => r.sizeCount, 'Most common radius (px)': commonRadius, 'Most common transition (ms)': (r) => topNum(r.durations),
    'Saturated hues': (r) => (r.hues || []).length, 'Navigation links': (r) => r.navLinks, 'Sections': (r) => r.sections,
    'Words on the page': (r) => r.words, 'Page length (screens)': (r) => r.pageHeights,
  };
  const medians = Object.entries(measures).map(([name, fn]) => ({ measure: name, p10: q(good.map(fn), 0.1), reference: q(good.map(fn), 0.5), p90: q(good.map(fn), 0.9), aiBuilt: q(slop.map(fn), 0.5) }));
  const referenceFacts = Object.entries(FACTS).map(([fact, fn]) => ({ fact, reference: pct(good, fn) }));
  const phoneFacts = { headline: q(phone.map((r) => r.h1 && r.h1.size), 0.5), body: q(phone.map((r) => r.bodySize), 0.5) };
  const groupOf = (r) => (r.surface === 'landing' ? r.category : r.surface === 'web app' ? 'web apps and design systems' : `${r.surface} app product sites`);
  const groups = {};
  for (const r of good) (groups[groupOf(r)] ||= []).push(r);
  const profiles = Object.entries(groups).filter(([, rows]) => rows.length >= 15).sort((a, b) => b[1].length - a[1].length).map(([group, rows]) => ({
    group, pages: rows.length, dark: pct(rows, (r) => r.dark), white: pct(rows, (r) => r.pureWhite), mono: pct(rows, FACTS['Monospace face present']),
    serif: pct(rows, FACTS['Serif headline face']), pill: pct(rows, FACTS['Pill shapes (3 or more fully rounded elements)']), noAccent: pct(rows, FACTS['No saturated button color']),
    radius: q(rows.map(commonRadius), 0.5), headline: q(rows.map((r) => r.h1 && r.h1.size), 0.5), weight: q(rows.map((r) => r.h1 && +r.h1.weight), 0.5),
    body: q(rows.map((r) => r.bodySize), 0.5), words: q(rows.map((r) => r.words), 0.5) }));
  return { pages: { reference: good.length, aiBuilt: slop.length, referenceLanding: goodLanding.length, aiBuiltLanding: slopLanding.length },
    bySurface: tally(good, 'surface'), byBuilder: tally(slop, 'category'), signals, cluster, medians, referenceFacts, phoneFacts, profiles };
}

function markdown(r, good) {
  const strong = r.signals.filter((s) => s.lift >= 2);
  const none = r.signals.filter((s) => s.lift >= 0.7 && s.lift <= 1.3);
  const reversed = r.signals.filter((s) => s.lift < 0.7);
  const at5 = r.cluster.find((c) => c.atLeast === 5);
  const quote = (s) => `"${s.signal}"`;
  const lines = [];
  const add = (...x) => lines.push(...x);
  add('# What squeegee measured', '', 'This file is generated by `research/analyze.mjs`. Rerun it after a new capture to refresh every number.', '');
  add('## Highlights', '');
  add(`- In this sample, a cluster of stock defaults marks an AI-built page better than any single visual style. ${at5.aiBuiltLanding}% of AI-built landing pages carry 5 or more of the nine stock defaults. ${at5.referenceLanding}% of the reference landing pages do.`);
  add(`- The strongest single signals are ${strong.slice(0, 3).map((s) => `${quote(s)} (${s.referenceLanding}% against ${s.aiBuiltLanding}%)`).join(', ')}.`);
  add(`- ${none.length} signals differed little between the groups, including ${none.slice(0, 5).map(quote).join(', ')}.`);
  add(`- ${reversed.length} signals were more common on the reference pages: ${reversed.map(quote).join(', ')}.`, '');
  add('## The sample', '');
  add(`- **Reference pages:** ${r.pages.reference} professionally made sites that loaded and were not blocked. By surface: ${r.bySurface.map(([k, v]) => `${k} ${v}`).join(', ')}. The mobile and desktop rows are the product websites of mobile and desktop apps, not screens of the apps.`);
  add(`- **AI-built pages:** ${r.pages.aiBuilt} public pages hosted on the publish domains of AI site builders. By builder: ${r.byBuilder.map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  add(`- **Landing-page comparison:** ${r.pages.referenceLanding} reference landing pages against ${r.pages.aiBuiltLanding} AI-built pages. Both groups are limited to pages with 250 words or more that are at least 3 screens long.`, '');
  add('The full list of reference sites is in [reference-sites.csv](reference-sites.csv). The AI-built pages are not listed: they are mostly individual people\'s projects, and this research is about patterns, not about them.', '');
  add('## Method', '');
  add('1. `capture.mjs` loads each URL in headless Chrome at 1440 px wide and reads computed styles from the rendered page: fonts, sizes, weights, colors, radius, shadows, gradients, transitions, layout patterns and text.');
  add('2. Pages behind a bot challenge, pages with a password field, and pages with fewer than 15 words are dropped.');
  add('3. `analyze.mjs` turns the measurements into yes or no signals per page and counts how many pages in each group show each signal.', '');
  add('No model reads the pages. The numbers below are counts.', '');
  add('## The nine stock defaults', '', ...DEFAULTS.map((d, i) => `${i + 1}. ${d}`), '');
  add('Share of pages with at least this many of the nine:', '');
  add('| At least | Reference landing pages | AI-built landing pages | All reference pages | All AI-built pages |', '|---|---|---|---|---|');
  add(...r.cluster.map((c) => `| ${c.atLeast} | ${c.referenceLanding}% | ${c.aiBuiltLanding}% | ${c.reference}% | ${c.aiBuilt}% |`), '');
  add('## Every signal', '', 'Sorted by how strongly the signal separates AI-built landing pages from reference landing pages.', '');
  add('| Signal | Reference landing pages | AI-built landing pages | All reference pages | All AI-built pages |', '|---|---|---|---|---|');
  add(...r.signals.map((s) => `| ${s.signal} | ${s.referenceLanding}% | ${s.aiBuiltLanding}% | ${s.reference}% | ${s.aiBuilt}% |`), '');
  add('## Typical values', '', 'The reference columns give the 10th percentile, the median and the 90th percentile across all reference pages.', '');
  add('| Measure | Reference low | Reference median | Reference high | AI-built median |', '|---|---|---|---|---|');
  add(...r.medians.map((m) => `| ${m.measure} | ${m.p10} | ${m.reference} | ${m.p90} | ${m.aiBuilt} |`), '');
  add('## Other facts about the reference pages', '');
  add(...r.referenceFacts.map((f) => `- ${f.fact}: ${f.reference}%`));
  add(`- Median headline size at 390 px wide: ${r.phoneFacts.headline} px. Median body size at 390 px wide: ${r.phoneFacts.body} px.`, '');
  add('## Reference profiles by kind', '', 'Groups with 15 or more pages. Radius, headline size, headline weight, body size and words are medians.', '');
  add('| Kind | Pages | Dark | Pure white | Monospace | Serif headline | Pill shapes | No button color | Radius | Headline | Weight | Body | Words |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  add(...r.profiles.map((g) => `| ${g.group} | ${g.pages} | ${g.dark}% | ${g.white}% | ${g.mono}% | ${g.serif}% | ${g.pill}% | ${g.noAccent}% | ${g.radius} px | ${g.headline} px | ${g.weight} | ${g.body} px | ${g.words} |`), '');
  add('## Reference pages by category', '', ...tally(good, 'category').map(([k, v]) => `- ${k}: ${v}`), '');
  add('## Limits', '');
  add('- These are associations in one sample, not proof of cause. No uncertainty ranges are computed, so treat differences of a few points as noise.');
  add('- A signal records that a pattern is present, not how well it is executed. A three-card row on a well-made site and on a generated page count the same.');
  add('- Rates are per page and are not adjusted for page length. The reference pages are several times longer than the AI-built ones, so they have more chances to contain any given pattern.');
  add('- Signals are measured on the rendered page and are broader than their plain names suggest. "shadcn-style theme variables present" means at least three of `--radius`, `--primary`, `--muted-foreground` and `--ring` are set on the root element. It does not check their values. "Lucide icons" and "Inter" mean any use.');
  add('- The page is not scrolled, so content that loads on scroll is not measured. A reduced-motion rule inside a stylesheet served from another origin cannot be read and counts as absent.');
  add('- Fonts are the declared families, which may differ from the face that loaded. Contrast ignores background images.');
  add('- "AI-built" means hosted on a builder\'s publish domain. That does not show how much manual work a page received. The pages were found through Hacker News posts and a public scan index, so they are not a random sample of what the builders produce.');
  add('- The reference set leans toward established companies with design teams.');
  add('- Pages behind a bot challenge are dropped by title, which can miss some. Pages with a password field are dropped, which removes some legitimate pages. Captures that timed out before the network went idle are kept.');
  add('- Pages made with tools that have no publish domain of their own are missing.', '');
  return lines.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const [goodPath, slopPath] = args;
  if (!goodPath || !slopPath) { console.error('usage: analyze.mjs <reference.jsonl> <ai-built.jsonl> [--write <dir>]'); process.exit(2); }
  const good = load(goodPath), slop = load(slopPath);
  const r = analyze(good, slop, loadAll(goodPath).filter((x) => x.viewport === 'phone'));
  console.log(`pages: ${r.pages.reference} reference, ${r.pages.aiBuilt} AI-built; landing-style: ${r.pages.referenceLanding} and ${r.pages.aiBuiltLanding}\n`);
  console.log('signal'.padEnd(52) + 'ref-land  ai-land  lift');
  for (const s of r.signals) console.log(s.signal.padEnd(52) + String(s.referenceLanding).padStart(7) + String(s.aiBuiltLanding).padStart(9) + String(s.lift).padStart(7));
  console.log('\nstock defaults, landing pages');
  for (const c of r.cluster) console.log(`  ${c.atLeast}+`.padEnd(52) + String(c.referenceLanding).padStart(7) + String(c.aiBuiltLanding).padStart(9));
  const w = args.indexOf('--write');
  if (w > -1 && args[w + 1]) {
    const dir = args[w + 1];
    writeFileSync(join(dir, 'RESULTS.md'), markdown(r, good));
    writeFileSync(join(dir, 'results.json'), JSON.stringify(r, null, 2) + '\n');
    const rows = [...good].sort((a, b) => a.surface.localeCompare(b.surface) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    writeFileSync(join(dir, 'reference-sites.csv'), 'surface,category,name,url\n' + rows.map((x) => [x.surface, x.category, x.name, x.url].join(',')).join('\n') + '\n');
    console.log(`\nwrote RESULTS.md, results.json and reference-sites.csv to ${dir}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
