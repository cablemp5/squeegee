#!/usr/bin/env node
// Calibrates the skill's own page scripts. Reads two capture runs made with
//   capture.mjs ... --scripts skills/squeegee/scripts/measure.js,skills/squeegee/scripts/stress.js
// and compares what measure.js and stress.js return on reference sites and on agent-written sites.
// Prints markdown.
//
//   node research/compare-measure.mjs <reference.jsonl> <agent.jsonl>

import { readFileSync } from 'node:fs';

const BLOCKED = /just a moment|attention required|access denied|verify you are human|are you a robot|^\s*$/i;
const load = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => !r.error && !BLOCKED.test(r.title || '') && r.words >= 15 && !r.passwordFields && r.measure);
const [refPath, agentPath] = process.argv.slice(2);
if (!agentPath) { console.error('usage: compare-measure.mjs <reference.jsonl> <agent.jsonl>'); process.exit(2); }
const all = { Reference: load(refPath), Agent: load(agentPath) };
const desk = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.filter((r) => r.viewport === 'desktop')]));
const phone = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.filter((r) => r.viewport === 'phone')]));
const names = Object.keys(all);

const pct = (rows, fn) => (rows.length ? +(100 * rows.filter(fn).length / rows.length).toFixed(1) : 0);
const q = (xs, p) => { const s = xs.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
// A count by its name, so captures made before and after the measures were renumbered both read.
const sv = (name) => (r) => { const x = [...r.measure.sprawl, ...(r.measure.counts || r.measure.judged || [])].find((s) => s.name === name); return x ? x.value : null; };
const steps = (r) => r.measure.sizes.filter((s, i, a) => i && s - a[i - 1] === 1).length;
const levels = (r) => new Set(r.measure.headingStyles.map((h) => h.split(' ')[0])).size;
const COUNTS = {
  'S01 text sizes 1 px apart (pairs)': steps, 'S02 tracked uppercase labels': sv('tracked uppercase labels'), 'S03 share of text under 12 px': sv('share of text under 12 px'), 'S04 font weights': (r) => r.measure.weights.length,
  'S05 font families': sv('font families'), 'S06 distinct text sizes': sv('distinct text sizes'), 'S07 saturated hues': sv('saturated hues'), 'S08 text colors': sv('text colors'),
  'Heading styles': (r) => r.measure.headingStyles.length, 'Heading styles beyond one per level': (r) => r.measure.headingStyles.length - levels(r),
  'Left edges of text blocks': (r) => r.measure.leftEdges, 'Left edges per 100 words': (r) => (r.measure.words >= 100 ? +(100 * r.measure.leftEdges / r.measure.words).toFixed(1) : null),
  'Faces named first and not loaded': (r) => r.measure.facesNotLoaded.length, 'Share of text with low contrast': (r) => r.measure.lowContrastShare,
  'Body size (most-used text size, px)': (r) => r.measure.bodySize, 'Words': (r) => r.measure.words,
};
// The limits measure.js applies. A count with no entry is compared with the reference 90th percentile.
const RULE = { 'S01 text sizes 1 px apart (pairs)': 4, 'S02 tracked uppercase labels': 5, 'S03 share of text under 12 px': 0.066, 'S04 font weights': 4, 'S05 font families': 4, 'S06 distinct text sizes': 14, 'S07 saturated hues': 3, 'S08 text colors': 14 };
const out = ['# measure.js and stress.js on reference and agent-written sites', '',
  `Pages with a result, desktop: ${names.map((n) => `${n.toLowerCase()} ${desk[n].length}`).join(', ')}. Phone: ${names.map((n) => `${n.toLowerCase()} ${phone[n].length}`).join(', ')}.`, '',
  '## Counts at desktop width', '', 'The limit is the one `measure.js` applies, or the reference 90th percentile for a count with no rule. "Over" is the share of pages above it.', '',
  '| Count | Reference median | Agent median | Reference 90th percentile | Limit | Reference over | Agent over |', '|---|---|---|---|---|---|---|'];
const limits = {};
for (const [name, fn] of Object.entries(COUNTS)) {
  const p90 = q(desk.Reference.map(fn), 0.9), limit = (limits[name] = name in RULE ? RULE[name] : p90);
  out.push(`| ${name} | ${q(desk.Reference.map(fn), 0.5)} | ${q(desk.Agent.map(fn), 0.5)} | ${p90} | ${limit} | ${pct(desk.Reference, (r) => fn(r) > limit)}% | ${pct(desk.Agent, (r) => fn(r) > limit)}% |`);
}
out.push('', '## Share of pages with', '', '| Fact | Reference | Agent |', '|---|---|---|');
const hs = (r) => r.measure.headingStyles.map((s) => s.match(/^h(\d) .* (\d+)px (\d+)$/)).filter(Boolean).map((m) => ({ level: +m[1], size: +m[2], weight: +m[3] }));
const maxAt = (r, lv, k) => Math.max(0, ...hs(r).filter((h) => h.level === lv).map((h) => h[k]));
const FACTS = { 'a face named first and not loaded': (r) => r.measure.facesNotLoaded.length > 0, 'horizontal overflow at desktop width': (r) => r.measure.overflowX,
  'no reduced-motion rule': (r) => !r.measure.reducedMotionRule, 'body size under 16 px': (r) => r.measure.bodySize > 0 && r.measure.bodySize < 16, 'body size under 14 px': (r) => r.measure.bodySize > 0 && r.measure.bodySize < 14,
  'a control under 24 px': (r) => r.measure.under24.length > 0, 'more than 8 text colors (the limit before this study)': (r) => sv('text colors')(r) > 8,
  'heading styles over one per level plus one (a rule this study dropped)': (r) => r.measure.headingStyles.length > levels(r) + 1,
  'a heading level skipped': (r) => { const l = [...new Set(hs(r).map((h) => h.level))].sort(); return l.some((x, i) => i && x - l[i - 1] > 1); },
  'a lower heading level larger than a higher one': (r) => [1, 2, 3, 4, 5].some((a) => maxAt(r, a, 'size') && [a + 1, a + 2, a + 3].some((b) => maxAt(r, b, 'size') > maxAt(r, a, 'size'))),
  'a lower heading heavier than the h1': (r) => maxAt(r, 1, 'weight') > 0 && [2, 3, 4, 5, 6].some((b) => maxAt(r, b, 'weight') > maxAt(r, 1, 'weight')) };
for (const [name, fn] of Object.entries(FACTS)) out.push(`| ${name} | ${pct(desk.Reference, fn)}% | ${pct(desk.Agent, fn)}% |`);

// Sprawl clusters: how many measures sit over their limit on one page. Reference developer tools are the closest kind to most agent-written sites.
const cluster = (keys) => (r) => keys.filter((k) => COUNTS[k](r) > limits[k]).length;
const groups = { Reference: desk.Reference, 'Reference developer tools': desk.Reference.filter((r) => r.category === 'dev tools'), Agent: desk.Agent };
const SETS = { 'the four sprawl measures (S01 to S04)': ['S01 text sizes 1 px apart (pairs)', 'S02 tracked uppercase labels', 'S03 share of text under 12 px', 'S04 font weights'],
  'the five-measure set used before this study (families, sizes, hues, labels, small text)': ['S05 font families', 'S06 distinct text sizes', 'S07 saturated hues', 'S02 tracked uppercase labels', 'S03 share of text under 12 px'],
  'all eight counts': Object.keys(RULE) };
for (const [name, keys] of Object.entries(SETS)) {
  out.push('', `## Sprawl cluster: ${name}`, '', `Pages: ${Object.entries(groups).map(([g, v]) => `${g.toLowerCase()} ${v.length}`).join(', ')}.`, '', `| Over at least | ${Object.keys(groups).join(' | ')} |`, `|---|${Object.keys(groups).map(() => '---').join('|')}|`);
  for (const n of [1, 2, 3, 4, 5].filter((x) => x <= keys.length)) out.push(`| ${n} | ${Object.values(groups).map((v) => `${pct(v, (r) => cluster(keys)(r) >= n)}%`).join(' | ')} |`);
}

// stress.js: how often worst-case content breaks a page.
const heading = (b) => /^h[1-6]\b/.test(b.element);
const ST = { 'had repeated items to test': (r) => r.stress && r.stress.stressed > 0, 'one or more boxes broke': (r) => r.stress && r.stress.broken.length > 0,
  'three or more boxes broke': (r) => r.stress && r.stress.broken.length >= 3, 'a box that is not a heading broke': (r) => r.stress && r.stress.broken.some((b) => !heading(b)),
  'text spilled out of its box': (r) => r.stress && r.stress.broken.some((b) => /spills/.test(b.what)), 'text was cut off': (r) => r.stress && r.stress.broken.some((b) => /cut off/.test(b.what)),
  'the page began to scroll sideways': (r) => r.stress && r.stress.pageOverflow && !r.stress.pageOverflowBefore };
for (const [label, rows] of [['desktop', desk], ['phone', phone]]) {
  out.push('', `## stress.js at ${label} width`, '', '| Share of pages where | Reference | Agent |', '|---|---|---|');
  for (const [name, fn] of Object.entries(ST)) out.push(`| ${name} | ${pct(rows.Reference, fn)}% | ${pct(rows.Agent, fn)}% |`);
}
console.log(out.join('\n'));
