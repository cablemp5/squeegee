#!/usr/bin/env node
// squeegee bench: runs the detector on labeled public repos and compares the classes.
// The page research measured rendered pages. This measures source code: how often each detector rule fires
// per class, and how much style variation each repo holds (source-metrics.mjs).
// Each repo is fetched shallow and source-only (markup, styles and scripts, a few MB per repo) into scratch/bench/repos,
// and is only read: nothing in it is installed or run. Zero dependencies. Node 22+, git, and gh for dated snapshots.
//
//   node research/bench.mjs [--no-clone]
//
// Classes in bench-repos.csv (class,source,repo,until):
//   agent    a coding agent wrote it: find-agent-repos.mjs confirmed a commit signature or an agent file
//   builder  an AI site builder made it: the scan confirms the Lovable or Bolt fingerprint
//   hand     a product with a design team, as its code stands today (agents may have touched it)
//   hand22   the same kind of product frozen at the date in "until", before coding agents existed

import { execFile, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { scan, RULES, VARIATION } from '../skills/squeegee/scripts/detect.mjs';
import { metrics } from './source-metrics.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'scratch', 'bench');
const rows = readFileSync(join(here, 'bench-repos.csv'), 'utf8').trim().split(/\r?\n/).slice(1).filter((l) => l && !l.startsWith('#'))
  .map((l) => { const [cls, source, repo, until] = l.split(',').map((s) => s.trim()); return { cls, source, repo, until: until || null, dir: join(out, 'repos', repo.replace('/', '__') + (until ? `@${until.slice(0, 4)}` : '')) }; });
mkdirSync(join(out, 'repos'), { recursive: true });

const run = promisify(execFile);
const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1' };
const WANT = /\.(tsx|jsx|ts|js|mjs|html|css|scss|vue|svelte|astro|mdx)$|(^|\/)(package|components)\.json$|(^|\/)\.(bolt|lovable)\//;
const SKIP = /(^|\/)(node_modules|dist|build|out|vendor|coverage|\.next|\.nuxt)\/|\.min\./;

async function fetchRepo(r) {
  if (existsSync(r.dir) || process.argv.includes('--no-clone')) return;
  try {
    const git = (...a) => run('git', ['-C', r.dir, '-c', 'core.longpaths=true', ...a], { env, timeout: 300_000, maxBuffer: 1 << 27 });
    let want = 'HEAD';
    if (r.until) {   // the last commit on or before the date
      want = (await run('gh', ['api', `repos/${r.repo}/commits?until=${r.until}T23:59:59Z&per_page=1`, '--jq', '.[0].sha'])).stdout.trim();
      if (!/^[0-9a-f]{40}$/.test(want)) { r.error = `no commit before ${r.until}`; return; }
    }
    await run('git', ['init', '--quiet', r.dir], { env });
    await git('remote', 'add', 'origin', `https://github.com/${r.repo}.git`);
    await git('fetch', '--depth', '1', '--filter=blob:none', '--no-tags', '--quiet', 'origin', want);   // commits and trees only
    const files = (await git('ls-tree', '-r', '-z', 'FETCH_HEAD')).stdout.split('\0').map((l) => { const [meta, path] = l.split('\t'); return { oid: (meta || '').split(' ')[2], path }; })
      .filter((f) => f.path && WANT.test(f.path) && !SKIP.test(f.path));
    if (!files.length) return;
    // Download only the source files, by id, in one request. Then check them out.
    const fetch = git('-c', 'fetch.negotiationAlgorithm=noop', 'fetch', '--no-tags', '--no-write-fetch-head', '--quiet', '--stdin', 'origin');
    fetch.child.stdin.end([...new Set(files.map((f) => f.oid))].join('\n') + '\n');
    await fetch;
    writeFileSync(join(r.dir, '.git', 'bench-paths'), files.map((f) => f.path).join('\0'));
    await git('checkout', '--quiet', 'FETCH_HEAD', '--pathspec-from-file=.git/bench-paths', '--pathspec-file-nul').catch(() => {});   // an invalid Windows path is skipped
  } catch (e) { r.error = String(e.stderr || e.message).trim().split('\n')[0].slice(0, 120); }
}
const queue = [...rows];   // eight repos at a time
await Promise.all(Array.from({ length: 8 }, async () => { for (let r; (r = queue.shift());) await fetchRepo(r); }));

// The app folder a builder made, up to three levels down: it holds .bolt, .lovable, or a package.json that names a Lovable package.
function builderApp(dir, depth = 0) {
  let pkg = ''; try { pkg = readFileSync(join(dir, 'package.json'), 'utf8'); } catch {}
  if (existsSync(join(dir, '.lovable')) || /"(lovable-tagger|@lovable\.dev\/[\w-]+)"/.test(pkg)) return { dir, kind: 'lovable' };
  if (existsSync(join(dir, '.bolt'))) return { dir, kind: 'bolt' };
  if (depth < 3) for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === 'node_modules' || e.name === '.git') continue;
    const found = builderApp(join(dir, e.name), depth + 1);
    if (found) return found;
  }
  return null;
}

for (const r of rows) {
  if (!existsSync(r.dir)) { r.error ||= 'not fetched'; continue; }
  try {
    const app = r.cls === 'builder' ? builderApp(r.dir) : null;
    r.fingerprint = app ? app.kind : null;
    const files = execFileSync('git', ['-C', r.dir, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 27 }).split('\0').filter((f) => f && !SKIP.test(f));
    r.ui = files.filter((f) => /\.(tsx|jsx|vue|svelte|astro|html|css|scss)$/.test(f)).length;
    const s = scan(app ? app.dir : r.dir);
    Object.assign(r, { files: s.files, rules: [...new Set(s.candidates.map((c) => c.id))], defaults: s.defaults.map((d) => d.id), cluster: s.cluster.present, stack: s.stack, source: r.source, variation: s.variation ? s.variation.measures.filter((m) => m.over).map((m) => m.id) : null, metrics: metrics(files.map((f) => join(r.dir, f))) });
  } catch (e) { r.error = e.message; }
}

// A repo counts when it has a web frontend to read (five or more markup or style files), and a builder repo only when its fingerprint is present.
const ok = (r) => !r.error && r.metrics && r.ui >= 5 && (r.cls !== 'builder' || r.fingerprint);
const classes = ['agent', 'builder', 'hand', 'hand22'];
const LABEL = { agent: 'Agent', builder: 'Builder', hand: 'Hand now', hand22: 'Hand 2022' };
const group = Object.fromEntries(classes.map((c) => [c, rows.filter((r) => r.cls === c && ok(r))]));
const pct = (list, f) => (list.length ? Math.round((100 * list.filter(f).length) / list.length) : 0);
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const line = (id, name, f) => { const v = classes.map((c) => pct(group[c], f)); return { id, name, v, gap: v[0] - v[2] }; };

const DEFAULT_NAMES = { D01: 'shadcn stock primary color', D02: 'Lucide at the default stroke', D03: 'no font chosen', D04: 'Inter', D05: 'headline weight 700 or more', D06: 'centered headline', D07: 'body text under 16 px', D08: 'badge above the headline', D09: 'motion with no reduced-motion rule' };
const defaults = Object.entries(DEFAULT_NAMES).map(([id, name]) => line(id, name, (r) => r.defaults.includes(id)));
const rules = RULES.filter((r) => r.tier !== 'default').map((x) => line(x.id, `${x.name} (${x.tier})`, (r) => r.rules.includes(x.id)));
const cluster = [3, 4, 5, 6, 7].map((n) => line(`${n}+`, `${n} or more stock defaults`, (r) => r.cluster >= n));
const head = `| ${classes.map((c) => LABEL[c]).join(' | ')} |`;
const table = (title, list) => [`## ${title}`, '', `| Id | Rule ${head} Agent minus hand now |`, `|---|---|${classes.map(() => '---').join('|')}|---|`,
  ...list.map((l) => `| ${l.id} | ${l.name} | ${l.v.map((x) => `${x}%`).join(' | ')} | ${l.gap > 0 ? '+' : ''}${l.gap} |`), ''].join('\n');

// Source metrics: the median per class, and how many repos sit above the 90th percentile of both hand-made classes.
const names = Object.keys((rows.find((r) => r.metrics) || { metrics: {} }).metrics);
const metricRows = names.map((m) => {
  const vals = (c) => group[c].map((r) => r.metrics[m]);
  const limit = Math.max(q(vals('hand'), 0.9), q(vals('hand22'), 0.9));
  return { m, med: classes.map((c) => q(vals(c), 0.5)), limit, over: classes.map((c) => pct(group[c], (r) => r.metrics[m] > limit)) };
});
const metricTable = ['## Other style counts in source (exploratory)', '',
  'The limit is the higher 90th percentile of the two hand-made classes. "Over" is the share of repos above it, so about 10% or less for hand-made by construction.', '',
  `| Metric | ${classes.map((c) => `${LABEL[c]} median`).join(' | ')} | Limit | ${classes.map((c) => `${LABEL[c]} over`).join(' | ')} |`, `|---|${classes.map(() => '---').join('|')}|---|${classes.map(() => '---').join('|')}|`,
  ...metricRows.map((x) => `| ${x.m} | ${x.med.join(' | ')} | ${x.limit} | ${x.over.map((v) => `${v}%`).join(' | ')} |`), ''].join('\n');

// The detector's eight source variation measures, on repos with 1,000 lines or more of interface code.
const measured = Object.fromEntries(classes.map((c) => [c, group[c].filter((r) => r.variation)]));
const vline = (id, name, f) => `| ${id} | ${name} | ${classes.map((c) => `${pct(measured[c], f)}%`).join(' | ')} |`;
const variationTable = ['## Source variation (the detector\'s V01 to V08)', '',
  `Repos measured: ${classes.map((c) => `${LABEL[c].toLowerCase()} ${measured[c].length}`).join(', ')}. Share of repos over each limit, then the share with several over at once.`, '',
  `| Id | Measure ${head}`, `|---|---|${classes.map(() => '---').join('|')}|`,
  ...VARIATION.map(([id, name]) => vline(id, name, (r) => r.variation.includes(id))),
  ...[2, 3, 4, 5].map((n) => vline(`${n}+`, `${n} or more over`, (r) => r.variation.length >= n)), ''].join('\n');

const skipped = rows.filter((r) => !ok(r));
const reasons = {};
for (const r of skipped) { const k = r.error ? 'could not fetch' : !(r.ui >= 5) ? 'fewer than five markup or style files' : 'no builder fingerprint'; (reasons[k] ||= []).push(r.repo); }
const md = ['# Squeegee source bench', '',
  `Repos counted: ${classes.map((c) => `${LABEL[c].toLowerCase()} ${group[c].length}`).join(', ')}. Rule tables give the share of repos where the rule fires at least once.`, '',
  `Median stock defaults per repo: ${classes.map((c) => `${LABEL[c].toLowerCase()} ${q(group[c].map((r) => r.cluster), 0.5)}`).join(', ')}.`, '',
  table('Stock-default cluster', cluster), table('Stock defaults', defaults), table('Candidate rules', rules), variationTable, metricTable,
  `## Left out: ${skipped.length}`, '', ...Object.entries(reasons).map(([k, v]) => `- ${k}: ${v.length}`), ''].join('\n');

writeFileSync(join(out, 'results.json'), JSON.stringify(rows.map(({ dir, ...r }) => r), null, 1));
writeFileSync(join(out, 'BENCH.md'), md);
console.log(md);
