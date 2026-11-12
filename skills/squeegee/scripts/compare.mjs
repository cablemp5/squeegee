#!/usr/bin/env node
// Builds the two pages squeegee shows the user. Zero dependencies.
//
//   node compare.mjs <shotsDir>              -> <shotsDir>/../compare.html   (before and after, side by side)
//   node compare.mjs directions <shotsDir>   -> <shotsDir>/../directions.html (direction previews to choose from)
//
// Before and after images are matched by name: before-<size>-<mode>.png with after-<size>-<mode>.png.
// Directions read direction-<n>.png and directions.json: [{ name, summary, preserved, changes, cost }].
// Both pages are plain HTML with ids on every figure, so a comment overlay can be added later.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; --ground: #f7f6f3; --ink: #1c1b19; --muted: #6b6963; --rule: rgb(28 27 25 / 0.14); }
  @media (prefers-color-scheme: dark) { :root { --ground: #161513; --ink: #eceae5; --muted: #9a978f; --rule: rgb(236 234 229 / 0.16); } }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px 96px; background: var(--ground); color: var(--ink); font: 16px/1.5 ui-sans-serif, system-ui, sans-serif; }
  main { max-width: 1600px; margin: 0 auto; }
  h1 { font-size: 28px; font-weight: 500; margin: 0 0 4px; }
  h2 { font-size: 18px; font-weight: 500; margin: 48px 0 12px; padding-top: 16px; border-top: 1px solid var(--rule); }
  p { margin: 0 0 8px; max-width: 70ch; }
  .muted { color: var(--muted); }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  .pair.narrow { max-width: 820px; }
  .three { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; align-items: start; }
  figure { margin: 0; }
  figcaption { font-size: 14px; color: var(--muted); margin-bottom: 8px; }
  img { display: block; width: 100%; height: auto; border: 1px solid var(--rule); }
  dl { margin: 12px 0 0; font-size: 14px; }
  dt { color: var(--muted); margin-top: 8px; }
  dd { margin: 0; }
  @media (max-width: 700px) { .pair { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;

function compare(dir) {
  const files = readdirSync(dir).filter((f) => /^before-.+\.(png|jpe?g|webp)$/i.test(f)).sort();
  const pairs = files.map((b) => [b, b.replace(/^before-/, 'after-')]).filter(([, a]) => existsSync(join(dir, a)));
  if (!pairs.length) { console.error(`no before-*/after-* image pairs in ${dir}`); process.exit(2); }
  const rel = basename(resolve(dir));
  const body = `<h1>Before and after</h1>\n<p class="muted">${pairs.length} view${pairs.length === 1 ? '' : 's'}. Before on the left, after on the right.</p>\n` +
    pairs.map(([b, a]) => {
      const label = b.replace(/^before-/, '').replace(/\.\w+$/, '').replace(/-/g, ', ');
      const narrow = /390|320|phone|mobile/.test(b) ? ' narrow' : '';
      return `<h2>${esc(label)}</h2>\n<div class="pair${narrow}" id="view-${esc(label.replace(/\W+/g, '-'))}">\n` +
        `  <figure id="before-${esc(label.replace(/\W+/g, '-'))}"><figcaption>Before</figcaption><img src="${esc(rel)}/${esc(b)}" alt="Before, ${esc(label)}"></figure>\n` +
        `  <figure id="after-${esc(label.replace(/\W+/g, '-'))}"><figcaption>After</figcaption><img src="${esc(rel)}/${esc(a)}" alt="After, ${esc(label)}"></figure>\n</div>`;
    }).join('\n');
  const out = join(dirname(resolve(dir)), 'compare.html');
  writeFileSync(out, page('Squeegee: before and after', body));
  console.log(`wrote ${out} (${pairs.length} pairs)`);
}

function directions(dir) {
  const shots = readdirSync(dir).filter((f) => /^direction-\d+\.(png|jpe?g|webp)$/i.test(f)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
  if (!shots.length) { console.error(`no direction-<n> images in ${dir}`); process.exit(2); }
  const metaPath = join(dir, 'directions.json');
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : [];
  const rel = basename(resolve(dir));
  const row = (label, value) => (value ? `<dt>${label}</dt><dd>${esc(Array.isArray(value) ? value.join('. ') : value)}</dd>` : '');
  const body = `<h1>Directions</h1>\n<p class="muted">Each direction is rendered on this page's own first section. Pick one by number and say what you would change.</p>\n<div class="three">\n` +
    shots.map((f) => {
      const n = parseInt(f.match(/\d+/)), m = meta[n - 1] || {};   // keyed by the file's number, so a gap does not shift labels
      return `  <figure id="direction-${n}"><figcaption>${n}. ${esc(m.name || `Direction ${n}`)}</figcaption><img src="${esc(rel)}/${esc(f)}" alt="Direction ${n}">\n` +
        `    <dl>${row('Summary', m.summary)}${row('Stays as it is', m.preserved)}${row('Main changes', m.changes)}${row('Needs', m.cost)}</dl></figure>`;
    }).join('\n') + '\n</div>';
  const out = join(dirname(resolve(dir)), 'directions.html');
  writeFileSync(out, page('Squeegee: directions', body));
  console.log(`wrote ${out} (${shots.length} directions)`);
}

const args = process.argv.slice(2);
if (args[0] === 'directions' && args[1] && existsSync(args[1])) directions(args[1]);
else if (args[0] && existsSync(args[0])) compare(args[0]);
else { console.error('usage: compare.mjs <shotsDir> | compare.mjs directions <shotsDir>'); process.exit(2); }
