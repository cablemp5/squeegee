#!/usr/bin/env node
// Compares three capture runs: reference sites, pages from AI site builders, and live sites of agent-written repos.
// It reuses the signals of analyze.mjs and adds the counts behind the sprawl measures, so each can be judged
// for how well it marks an agent-written page. Prints markdown.
//
//   node research/compare-pages.mjs <reference.jsonl> <builder.jsonl> <agent.jsonl> [> PAGES.md]

import { readFileSync } from 'node:fs';
import { SIGNALS, DEFAULTS } from './analyze.mjs';

const BLOCKED = /just a moment|attention required|access denied|verify you are human|are you a robot|^\s*$/i;
const load = (p) => readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  .filter((r) => !r.error && !BLOCKED.test(r.title || '') && r.words >= 15 && !r.passwordFields && r.viewport === 'desktop');
const [refPath, builderPath, agentPath] = process.argv.slice(2);
if (!agentPath) { console.error('usage: compare-pages.mjs <reference.jsonl> <builder.jsonl> <agent.jsonl>'); process.exit(2); }
const groups = { Reference: load(refPath), Builder: load(builderPath), Agent: load(agentPath) };
groups['Agent, signed commits'] = groups.Agent.filter((r) => r.category === 'agent-signature');
const names = Object.keys(groups), ref = groups.Reference;

const pct = (rows, fn) => (rows.length ? Math.round((100 * rows.filter(fn).length) / rows.length) : 0);
const q = (xs, p) => { const s = xs.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const head = (first) => [`| ${first} | ${names.join(' | ')} |`, `|---|${names.map(() => '---').join('|')}|`];
const out = [`# Rendered pages: reference, builder and agent-written`, '',
  `Pages that loaded and were not blocked, desktop width: ${names.map((n) => `${n.toLowerCase()} ${groups[n].length}`).join(', ')}. "Agent" is the live site of a repo that find-agent-repos.mjs confirmed. "Agent, signed commits" is the stricter part of that group.`, ''];

out.push('## Signals', '', 'Share of pages showing each signal, sorted by agent minus reference.', '', ...head('Signal'));
const sig = Object.entries(SIGNALS).map(([name, fn]) => ({ name, v: names.map((n) => pct(groups[n], fn)) })).sort((a, b) => (b.v[2] - b.v[0]) - (a.v[2] - a.v[0]));
for (const s of sig) out.push(`| ${s.name} | ${s.v.map((x) => `${x}%`).join(' | ')} |`);

const defaultsOn = (r) => DEFAULTS.filter((k) => SIGNALS[k](r)).length;
out.push('', '## Stock-default cluster', '', ...head('At least'));
for (const n of [3, 4, 5, 6, 7]) out.push(`| ${n} | ${names.map((g) => `${pct(groups[g], (r) => defaultsOn(r) >= n)}%`).join(' | ')} |`);

// Counts behind sprawl. The limit is the reference 90th percentile.
const COUNTS = {
  'Font families': (r) => r.familyCount, 'Distinct text sizes': (r) => r.sizeCount, 'Saturated hues': (r) => (r.hues || []).length,
  'Tracked uppercase labels': (r) => r.trackedCaps, 'Share of text under 12 px': (r) => r.tinyTextShare,
  'Font weights': (r) => (r.weights || []).length, 'Text colors (top list, 8 at most)': (r) => (r.textColors || []).length,
  'Distinct radii': (r) => (r.radii || []).length, 'Distinct shadows': (r) => r.shadowCount, 'Distinct transition times': (r) => (r.durations || []).length,
  'Saturated button colors': (r) => (r.accents || []).length, 'Share of text with low contrast': (r) => r.lowContrastShare,
  'Share of controls under 24 px': (r) => (r.interactive ? +(r.smallTargets / r.interactive).toFixed(2) : null),
  'Gradients': (r) => r.gradients, 'Emoji in headings or buttons': (r) => r.emojiInLabels, 'Em dashes': (r) => r.emDashes, 'Exclamation marks': (r) => r.exclaims,
  'Words on the page': (r) => r.words, 'Page length (screens)': (r) => r.pageHeights, 'Body text size (px)': (r) => r.bodySize,
  'Headline size (px)': (r) => r.h1 && r.h1.size, 'Headline weight': (r) => r.h1 && +r.h1.weight,
};
out.push('', '## Counts', '', 'Median per group, then the share of each group above the reference 90th percentile.', '',
  `| Count | ${names.map((n) => `${n} median`).join(' | ')} | Limit | ${names.map((n) => `${n} over`).join(' | ')} |`, `|---|${names.map(() => '---').join('|')}|---|${names.map(() => '---').join('|')}|`);
for (const [name, fn] of Object.entries(COUNTS)) {
  const limit = q(ref.map(fn), 0.9);
  out.push(`| ${name} | ${names.map((n) => q(groups[n].map(fn), 0.5)).join(' | ')} | ${limit} | ${names.map((n) => `${pct(groups[n], (r) => fn(r) > limit)}%`).join(' | ')} |`);
}

const SPRAWL = ['Font families', 'Distinct text sizes', 'Saturated hues', 'Tracked uppercase labels', 'Share of text under 12 px'];
const limits = SPRAWL.map((k) => ({ fn: COUNTS[k], limit: q(ref.map(COUNTS[k]), 0.9) }));
const over = (r) => limits.filter((l) => l.fn(r) > l.limit).length;
out.push('', '## Sprawl: how many of the five measures are over their limit', '', ...head('At least'));
for (const n of [1, 2, 3, 4]) out.push(`| ${n} | ${names.map((g) => `${(100 * groups[g].filter((r) => over(r) >= n).length / (groups[g].length || 1)).toFixed(1)}%`).join(' | ')} |`);
console.log(out.join('\n'));
