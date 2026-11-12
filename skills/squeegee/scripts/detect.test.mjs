// Run: node --test skills/squeegee/scripts/detect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { scan } from './detect.mjs';

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
