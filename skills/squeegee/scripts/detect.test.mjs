// Run: node --test skills/squeegee/scripts/detect.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { scan } from './detect.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ids = (r) => new Set(r.candidates.map((c) => c.id));

// Scans one markup snippet in a throwaway project and returns the candidate ids.
function idsFor(markup, extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'squeegee-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{}');
    writeFileSync(join(dir, 'page.tsx'), markup);
    for (const [name, text] of Object.entries(extra)) writeFileSync(join(dir, name), text);
    return ids(scan(dir));
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

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
