#!/usr/bin/env node
// squeegee directions: two small tools that keep a design direction honest.
//
//   node direction.mjs deal <seed> [count]
//     Deals `count` hands (default 2) of six axis values, the same hand for the same seed. Models reach for the
//     same few looks when they choose freely. A dealt hand is a starting point outside that habit.
//
//   node direction.mjs check <direction.json> <measure.json>
//     Compares the "contract" in a direction file with "ingredients" in a measure.js result and prints one line
//     per ingredient. Exit 0 when every stated ingredient matches, 1 when one does not, 2 on bad usage.
//
// Zero dependencies. Node 18+.

import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const AXES = {
  type: ['grotesque sans', 'humanist sans', 'geometric sans', 'serif headlines over a sans', 'slab or mono headlines', 'one monospace face throughout'],
  ground: ['pure white', 'warm off-white', 'cool off-white', 'a light tint of the accent', 'near-black', 'a dark tint of the accent'],
  temperature: ['cool', 'neutral', 'warm'],
  density: ['compact', 'regular', 'airy'],
  corner: ['square, 0 to 2 px', 'small, 4 to 6 px', 'medium, 8 to 12 px', 'large, 16 px or more', 'pill controls on square surfaces'],
  imagery: ['product screenshots', 'photography', 'illustration', 'type and space only', 'data and diagrams'],
};

// A small seeded generator, so one seed always deals one hand.
function rng(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h |= 0; h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Hands differ from each other on at least four of the six axes.
export function deal(seed, count = 2) {
  const next = rng(seed), hands = [];
  for (let tries = 0; hands.length < count && tries < 500; tries++) {
    const hand = Object.fromEntries(Object.entries(AXES).map(([k, v]) => [k, v[Math.floor(next() * v.length)]]));
    if (hands.every((h) => Object.keys(AXES).filter((k) => h[k] !== hand[k]).length >= 4)) hands.push(hand);
  }
  return hands;
}

const rgb = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; };
const face = (s) => String(s || '').toLowerCase().replace(/["']/g, '').split(',')[0].trim();
// How each ingredient is compared. Colors may sit 16 steps apart per channel, sizes 2 px or 6%, radius 2 px.
const SAME = {
  color: (want, got) => { const a = rgb(want), b = rgb(got); return !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= 16); },
  face: (want, got) => face(want) === face(got),
  size: (want, got) => typeof got === 'number' && Math.abs(want - got) <= Math.max(2, want * 0.06),
  weight: (want, got) => typeof got === 'number' && Math.abs(want - got) <= 50,
  radius: (want, got) => typeof got === 'number' && Math.abs(want - got) <= 2,
  exact: (want, got) => want === got,
};
const CHECKS = [
  ['ground', 'color', (i) => i.ground], ['dark', 'exact', (i) => i.dark], ['ink', 'color', (i) => i.ink], ['accent', 'color', (i) => i.accent],
  ['bodyFace', 'face', (i) => i.bodyFace], ['headingFace', 'face', (i) => i.headingFace],
  ['headline.size', 'size', (i) => i.headline && i.headline.size], ['headline.weight', 'weight', (i) => i.headline && i.headline.weight],
  ['body.size', 'size', (i) => i.body && i.body.size], ['radius', 'radius', (i) => i.radius],
];
const at = (o, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), o);

// One row per ingredient the contract states. An ingredient the contract leaves out is not checked.
export function check(contract, ingredients) {
  return CHECKS.filter(([key]) => at(contract, key) !== undefined && at(contract, key) !== null)
    .map(([key, kind, read]) => { const want = at(contract, key), got = read(ingredients || {}); return { key, want, got: got ?? null, pass: SAME[kind](want, got) }; });
}

function main() {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === 'deal' && a) {
    deal(a, +b || 2).forEach((h, i) => console.log(`hand ${i + 1}: ` + Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('; ')));
    return;
  }
  if (cmd === 'check' && a && b) {
    let rows;
    try { rows = check(JSON.parse(readFileSync(a, 'utf8')).contract || {}, JSON.parse(readFileSync(b, 'utf8')).ingredients); }
    catch (e) { console.error(`direction.mjs could not read its inputs: ${e.message}`); process.exit(2); }
    if (!rows.length) { console.error('direction.mjs: the direction file states no contract'); process.exit(2); }
    for (const r of rows) console.log(`${r.pass ? 'pass' : 'FAIL'}  ${r.key}: wanted ${JSON.stringify(r.want)}, measured ${JSON.stringify(r.got)}`);
    const failed = rows.filter((r) => !r.pass).length;
    console.log(`${rows.length - failed} of ${rows.length} ingredients match`);
    process.exit(failed ? 1 : 0);
  }
  console.error('usage: direction.mjs deal <seed> [count]\n       direction.mjs check <direction.json> <measure.json>');
  process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();
