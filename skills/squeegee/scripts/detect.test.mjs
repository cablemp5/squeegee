// Run: node --test skills/squeegee/scripts/detect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { scan, tally, newTally } from './detect.mjs';
import { deal, check, AXES } from './direction.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ids = (r) => new Set(r.candidates.map((c) => c.id));

// Scans one markup snippet in a throwaway project and returns the result. Extra names may hold folders.
function scanFor(markup, extra = {}, sub = '') {
  const dir = mkdtempSync(join(tmpdir(), 'squeegee-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{}');
    writeFileSync(join(dir, 'page.tsx'), markup);
    for (const [name, text] of Object.entries(extra)) { mkdirSync(dirname(join(dir, name)), { recursive: true }); writeFileSync(join(dir, name), text); }
    return scan(join(dir, sub));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const idsFor = (markup, extra) => ids(scanFor(markup, extra));
const defaultIds = (r) => new Set(r.defaults.map((d) => d.id));

test('stock fixture: cluster is flagged and the tells are found', () => {
  const r = scan(join(here, 'fixtures', 'stock'));
  assert.ok(r.cluster.flagged, `expected 5 or more defaults, got ${r.cluster.present}: ${r.defaults.map((d) => d.id)}`);
  for (const id of ['T01', 'T02', 'T03', 'T04', 'T05', 'T07', 'X01', 'X02', 'X03', 'R01', 'R02']) assert.ok(ids(r).has(id), `missing ${id}`);
  assert.equal(r.stack.shadcn, true);
});

test('chosen fixture: deliberate choices are left alone', () => {
  const r = scan(join(here, 'fixtures', 'chosen'));
  assert.equal(r.cluster.flagged, false, `defaults: ${r.defaults.map((d) => d.id)}`);
  assert.deepEqual([...ids(r)], [], `unexpected: ${r.candidates.map((c) => `${c.id} ${c.file}:${c.line}`)}`);
  assert.equal(r.stack.tailwind, 'v4');
});

test('default-tier rules never appear as candidates', () => {
  const r = scan(join(here, 'fixtures', 'stock'));
  assert.ok(r.candidates.every((c) => c.tier !== 'default'));
});

test('a single file still sees the project theme', () => {
  const r = scan(join(here, 'fixtures', 'stock', 'page.tsx'));
  assert.equal(r.files, 1);
  assert.equal(r.stack.shadcn, true);
  assert.ok(r.defaults.some((d) => d.id === 'D01'), 'the stock theme in globals.css must count');
  assert.ok(r.candidates.every((c) => c.file === 'page.tsx'), 'line rules stay inside the target');
});

test('counts and badges are not proof claims', () => {
  assert.ok(!idsFor('<span className="badge">99+</span>\n<p>Page 10+</p>').has('R02'));
  assert.ok(idsFor('<p>Trusted by 10,000+ teams</p>').has('R02'));
});

test('focus replacement on the next line of a class list clears X02', () => {
  assert.ok(!idsFor('<button className={cn(\n  "outline-none rounded",\n  "focus-visible:ring-2")}>Go</button>').has('X02'));
  assert.ok(idsFor('<button className="outline-none rounded">Go</button>').has('X02'));
});

test('zoom: maximum-scale=1 is flagged, 1.5 and 5 are not', () => {
  assert.ok(idsFor('<meta name="viewport" content="width=device-width, maximum-scale=1">').has('X04'));
  assert.ok(!idsFor('<meta name="viewport" content="width=device-width, maximum-scale=1.5">').has('X04'));
  assert.ok(!idsFor('<meta name="viewport" content="width=device-width, initial-scale=1">').has('X04'));
});

test('small target: single quotes and multi-line tags are read, padded controls are not flagged', () => {
  assert.ok(idsFor("<button class='size-4 text-ink'>x</button>").has('L01'));
  assert.ok(idsFor('<button\n  onClick={close}\n  className="h-4 w-4"\n>x</button>').has('L01'));
  assert.ok(!idsFor('<button className="size-4 p-3">x</button>').has('L01'));
});

test('em dash: interface copy is flagged, comments are not', () => {
  assert.ok(idsFor('<p>Fast — really</p>').has('H01'));
  assert.ok(!idsFor('{/* fast — really */}\n// a — b').has('H01'));
});

test('checkmark list is exempt in a pricing file', () => {
  const list = '<li><Check /> a</li>\n<li><Check /> b</li>\n<li><Check /> c</li>';
  assert.ok(idsFor(list).has('T03'));
  assert.ok(!idsFor('<main />', { 'pricing.tsx': list }).has('T03'));
});

test('one icon with a stroke does not clear the Lucide default, a global rule does', () => {
  const dir = mkdtempSync(join(tmpdir(), 'squeegee-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{}');
    for (const n of ['a', 'b', 'c']) writeFileSync(join(dir, `${n}.tsx`), 'import { X } from "lucide-react";\nexport const C = () => <X />;');
    writeFileSync(join(dir, 'd.tsx'), 'import { X } from "lucide-react";\nexport const D = () => <X strokeWidth={1.5} />;');
    assert.ok(scan(dir).defaults.some((d) => d.id === 'D02'));
    writeFileSync(join(dir, 'app.css'), '.lucide { stroke-width: 1.5; }');
    assert.ok(!scan(dir).defaults.some((d) => d.id === 'D02'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('runs when the skill folder is reached through a link', () => {
  const dir = mkdtempSync(join(tmpdir(), 'squeegee-'));
  const link = join(dir, 'scripts');
  try {
    symlinkSync(here, link, 'junction');
    const out = execFileSync(process.execPath, [join(link, 'detect.mjs'), join(here, 'fixtures', 'stock')], { encoding: 'utf8' });
    assert.match(out, /squeegee detector: \d+ target files/);
  } finally { rmSync(link, { force: true }); rmSync(dir, { recursive: true, force: true }); }
});

test('a skill installed in a dot folder does not hide the font and motion defaults', () => {
  const r = scanFor('<div className="transition-colors">x</div>', { '.claude/skills/squeegee/detect.mjs': 'const re = /@font-face|prefers-reduced-motion/;' });
  for (const id of ['D03', 'D09']) assert.ok(defaultIds(r).has(id), `missing ${id}`);
});

test('a target inside a skipped folder name, in any case, is still scanned', () => {
  for (const sub of process.platform === 'win32' ? ['build', 'BUILD'] : ['build']) {
    const r = scanFor('<main />', { 'build/page.tsx': '<p>Trusted by 10,000+ teams</p>' }, sub);
    assert.equal(r.files, 1, sub);
    assert.ok(ids(r).has('R02'), sub);
  }
});

test('focus:outline-none alone is still a removed outline', () => {
  assert.ok(idsFor('<button className="focus:outline-none">Go</button>').has('X02'));
  assert.ok(idsFor('<button className="focus-visible:outline-none">Go</button>').has('X02'));
  assert.ok(!idsFor('<button className="focus:outline-none focus:ring-2">Go</button>').has('X02'));
});

test('JSX in a .js file gets line rules', () => {
  assert.ok(idsFor('<main />', { 'app.js': 'export const B = () => <button className="outline-none">Go</button>;' }).has('X02'));
});

test('a plain CSS or Typekit font counts as chosen, a system stack does not', () => {
  assert.ok(!defaultIds(scanFor('<main />', { 'app.css': 'body { font-family: "Tiempos Text", Georgia, serif; }' })).has('D03'));
  assert.ok(!defaultIds(scanFor('<link rel="stylesheet" href="https://use.typekit.net/abc1234.css">')).has('D03'));
  assert.ok(defaultIds(scanFor('<main />', { 'app.css': 'body { font-family: system-ui, -apple-system, sans-serif; }' })).has('D03'));
});

test('Inter counts only when it is loaded or declared', () => {
  assert.ok(!defaultIds(scanFor('<main />', { 'notes.ts': '// font choice: we avoided Inter here' })).has('D04'));
  assert.ok(defaultIds(scanFor('<main />', { 'app.css': 'body { font-family: Inter, sans-serif; }' })).has('D04'));
  assert.ok(defaultIds(scanFor('<main />', { 'layout.tsx': 'import { Inter } from "next/font/google";' })).has('D04'));
});

test('an arrow function before className does not end the tag', () => {
  assert.ok(idsFor('<button\n  onClick={() => close()}\n  className="h-4 w-4"\n>x</button>').has('L01'));
  assert.ok(defaultIds(scanFor('<h1\n  onClick={() => go()}\n  className="text-5xl font-bold"\n>Hi</h1>')).has('D05'));
});

test('small target reads only the class value', () => {
  assert.ok(!idsFor('<a className="text-sm" href="/guides/h-4">Guide</a>').has('L01'));
});

test('smaller misses: zoom 1.0, multi-line body size, gap-x, trademark, Expo', () => {
  assert.ok(idsFor('<meta name="viewport" content="width=device-width, maximum-scale=1.0">').has('X04'));
  assert.ok(defaultIds(scanFor('<main />', { 'app.css': 'body {\n  margin: 0;\n  font-size: 14px;\n}' })).has('D07'));
  assert.ok(idsFor('<div className="gap-x-[13px]" />\n<div className="gap-x-[14px]" />\n<div className="gap-y-[15px]" />').has('X03'));
  assert.ok(!idsFor('<h1>Acme™ Cloud</h1>').has('T04'));
  assert.ok(idsFor('<h1>Launch 🚀</h1>').has('T04'));
  assert.equal(scanFor('<main />', { 'package.json': '{"dependencies":{"expo":"~51.0.0"}}' }).stack.native, 'react-native');
});

test('em dash: a lone dash placeholder is data, a dash between words is copy', () => {
  assert.ok(!idsFor('<td>{ping ?? "—"}</td>\n<span>—</span>').has('H01'));
  assert.ok(idsFor('<p>Round over—next round soon</p>').has('H01'));
  assert.ok(!idsFor('<main />', { 'app.css': '.a { color: red; } /* brand red—do not change */\n.b::after { content: "more—soon"; }'.split('\n')[0] }).has('H01'));
  assert.ok(idsFor('<main />', { 'app.css': '.b::after { content: "more—soon"; }' }).has('H01'));
});

test('a face named in CSS but never loaded is flagged, a loaded or system face is not', () => {
  const css = 'h2 { font-family: "Rajdhani", "Segoe UI", sans-serif; }';
  assert.ok(idsFor('<main />', { 'app.css': css }).has('X05'));
  assert.ok(!idsFor('<main />', { 'app.css': `@font-face { font-family: "Rajdhani"; src: url(r.woff2); }\n${css}` }).has('X05'));
  assert.ok(!idsFor(`<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk">`, { 'app.css': 'h2 { font-family: "Space Grotesk", sans-serif; }' }).has('X05'));
  assert.ok(!idsFor('<main />', { 'app.css': 'body { font-family: "Segoe UI", system-ui, sans-serif; }\ncode { font-family: var(--mono); }' }).has('X05'));
});

test('plain CSS: an h1 rule feeds the weight and centering defaults, and the style counts are reported', () => {
  const r = scanFor('<main />', { 'app.css': '.hero h1 {\n  font-weight: 850;\n  text-align: center;\n}\np { font-size: 13px; color: #abc; font-weight: 400; text-transform: uppercase; }' });
  for (const id of ['D05', 'D06']) assert.ok(defaultIds(r).has(id), `missing ${id}`);
  assert.deepEqual(r.styles, { cssFiles: 1, fontFamilies: 0, fontSizes: 1, fontWeights: 2, colors: 1, uppercase: 1, gradients: 0 });
  assert.ok(!defaultIds(scanFor('<main />', { 'app.css': 'h1 { font-weight: 500; }\nh2 { font-weight: 800; text-align: center; }' })).has('D05'));
});

test('measure.js and stress.js are each one expression a browser tool can evaluate', () => {
  for (const name of ['measure.js', 'stress.js']) {
    const src = readFileSync(join(here, name), 'utf8');
    assert.equal(typeof new Function(`return () => (${src.replace(/^\/\/.*$/gm, '')})`)(), 'function', name);
  }
});

test('source variation: dense one-off styling is flagged, plain code is not, a small project is not measured', () => {
  const noisy = scanFor(Array(3200).fill('<p className="text-xs uppercase tracking-widest" style={{ color: "#ff00aa" }}>🚀 New</p>').join('\n'));
  assert.ok(noisy.variation.flagged, JSON.stringify(noisy.variation));
  const over = new Set(noisy.variation.measures.filter((m) => m.over).map((m) => m.id));
  for (const id of ['V01', 'V02', 'V03', 'V04', 'V05']) assert.ok(over.has(id), `missing ${id}`);
  assert.equal(scanFor(Array(3200).fill('<p className="text-base">Plain text</p>').join('\n')).variation.over, 0);
  assert.equal(scanFor(Array(1200).fill('<p className="text-xs">Small project</p>').join('\n')).variation, null);
  const css = scanFor('<main />', { 'app.css': Array(1100).fill('.k { text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; }\n.b { backdrop-filter: blur(8px); }\n.t { font-size: 16px; }').join('\n') });
  assert.deepEqual(css.variation.measures.filter((m) => m.over).map((m) => m.id), ['V01', 'V02', 'V07']);
});

test('source variation counts: tracking values, text size units, markup in .js files', () => {
  const t = (path, text) => { const v = newTally(); tally(path, text, v); return v; };
  assert.equal(t('a.css', '.k { text-transform: uppercase; letter-spacing: normal; }').caps, 0);
  assert.equal(t('a.css', '.k { text-transform: uppercase; letter-spacing: 0; }').caps, 0);
  assert.equal(t('a.css', '.k { text-transform: uppercase; letter-spacing:0.1em; }').caps, 1);
  assert.deepEqual([t('a.tsx', '<p className="text-[12.5px]" />').small, t('a.tsx', '<p className="text-[0.75rem]" />').small, t('a.tsx', '<p className="text-[12px]" />').small], [0, 1, 1]);
  assert.equal(t('a.js', 'export const A = () => <p className="text-xs" style={{ color: "#f0a" }}>hi</p>;').inline, 1);
  assert.equal(t('a.js', 'export const sum = (a, b) => a + b;').lines, 0);
});

test('motion rules read the rule the declaration sits in, not a neighbor on the same line', () => {
  const css = (text) => idsFor('<main />', { 'app.css': text });
  assert.ok(!css('.a:hover { color: red } .b { transform: scale(1.08) }').has('T08'));
  assert.ok(css('.a { color: red } .b:hover { transform: scale(1.08) }').has('T08'));
  assert.ok(!css('@keyframes out { from { transform: scale(1); } to { transform: scale(0); } }').has('T09'));
  assert.ok(css('@keyframes pop { 0% { transform: scale(0); } 100% { transform: scale(1); } }').has('T09'));
  assert.ok(css('.a { transform: scale(1.08) } .b:hover { transform: scale(1.08) }').has('T08'));
  assert.ok(css('@keyframes blink { 50% { transform: scale(0); } } @keyframes pop { from { transform: scale(0); } }').has('T09'));
});

test('direction.mjs: one seed deals one hand, hands differ, and the contract check reads each ingredient', () => {
  const hands = deal('karkats-arcade', 2);
  assert.deepEqual(hands, deal('karkats-arcade', 2));
  assert.notDeepEqual(hands, deal('another-project', 2));
  assert.ok(Object.keys(AXES).filter((k) => hands[0][k] !== hands[1][k]).length >= 4);
  const got = { ground: '#0b0c0f', dark: true, ink: '#f2f3f5', accent: '#5e6ad2', bodyFace: 'Inter', headingFace: 'Inter', headline: { size: 57, weight: 500 }, body: { size: 16 }, radius: 8 };
  const rows = check({ ground: '#0a0b0e', dark: true, accent: '#5e6ad2', bodyFace: '"Inter", sans-serif', headline: { size: 56, weight: 500 }, body: { size: 16 }, radius: 12 }, got);
  assert.deepEqual(rows.filter((r) => !r.pass).map((r) => r.key), ['radius']);
  assert.equal(rows.length, 8);   // ink and headingFace are not in the contract, so they are not checked
  assert.deepEqual(check({ ground: '#ffffff', headline: { size: 56 } }, { ground: '#0b0c0f', headline: null }).map((r) => r.pass), [false, false]);
});

test('motion tells: hover growth, an entrance from scale(0), ease-in, a slow CSS transition', () => {
  const css = (text) => idsFor('<main />', { 'app.css': text });
  assert.ok(idsFor('<div className="transition hover:scale-105" />').has('T08'));
  assert.ok(!idsFor('<div className="transition hover:scale-[1.02]" />').has('T08'));
  assert.ok(css('.card:hover {\n  transform: scale(1.08);\n}').has('T08'));
  assert.ok(!css('.card.is-open {\n  transform: scale(1.08);\n}').has('T08'));
  assert.ok(idsFor('<motion.div initial={{ opacity: 0, scale: 0 }} />').has('T09'));
  assert.ok(!idsFor('<motion.div initial={{ opacity: 0, scale: 0.95 }} />').has('T09'));
  assert.ok(css('@keyframes pop {\n  from { transform: scale(0); }\n  to { transform: scale(1); }\n}').has('T09'));
  assert.ok(css('.menu { transition: opacity 200ms ease-in; }').has('T10'));
  assert.ok(!css('.menu { transition: opacity 200ms ease-in-out; }').has('T10'));
  assert.ok(css('.menu { transition: opacity 0.6s ease; }').has('L02'));
  assert.ok(!css('.menu { transition: opacity 0.25s ease, transform 150ms; }').has('L02'));
});

test('plain CSS h1: reads the h1 rule itself, not a neighbor on the line or a descendant', () => {
  const d = (css) => defaultIds(scanFor('<main />', { 'app.css': css }));
  assert.ok(!d('p { font-weight: 800; text-align: center; } h1 { font-weight: 400; text-align: left; }').has('D05'));
  assert.ok(!d('p { font-weight: 800; text-align: center; } h1 { font-weight: 400; text-align: left; }').has('D06'));
  assert.ok(d('p { font-weight: 400; } h1 { font-weight: 800; }').has('D05'));
  assert.ok(!d('h1 span { font-weight: 800; }').has('D05'));
  assert.ok(d('h1,\nh2 {\n  font-weight: 700;\n}').has('D05'));
  assert.ok(d('@media (min-width: 600px) {\n  .hero h1.title { font-weight: 900; }\n}').has('D05'));
});

test('font loading: a longer family name does not count, and non-family font variables are not faces', () => {
  const tight = '@font-face { font-family: "Inter Tight"; src: url(t.woff2); }\n';
  assert.ok(idsFor('<main />', { 'app.css': `${tight}body { font-family: "Rajdhani", sans-serif; }\nh1 { font-family: "Raj", sans-serif; }` }).has('X05'));
  assert.ok(!idsFor('<main />', { 'app.css': `${tight}body { font-family: "Inter Tight", sans-serif; }` }).has('X05'));
  assert.ok(!idsFor('<main />', { 'app.css': ':root { --font-display: swap; --font-weight: bold; --font-feature: "ss01"; }\nbody { font-family: system-ui, sans-serif; }' }).has('X05'));
  assert.ok(idsFor('<main />', { 'app.css': ':root { --font-sans: "Rajdhani", sans-serif; }\nbody { font-family: var(--font-sans); }' }).has('X05'));
  assert.ok(!idsFor('<main />', { 'layout.tsx': 'import { Space_Grotesk } from "next/font/google";', 'app.css': 'body { font-family: "Space Grotesk", sans-serif; }' }).has('X05'));
  assert.ok(!idsFor('<main />', { 'main.ts': 'import "@fontsource-variable/inter";', 'app.css': ':root { --font-sans: "Inter Variable", sans-serif; }' }).has('X05'));
});
