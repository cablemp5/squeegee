#!/usr/bin/env node
// squeegee detector: scans source text for patterns that the research associated with AI-built pages.
// Output is a list of candidates, not verdicts. A text match cannot prove what renders: it misses
// multi-line and computed class names, component wrappers and plain CSS selectors, and it can match
// unused code. The agent confirms each candidate against the code path and the rendered page.
// Zero dependencies. Node 18+.
//
//   node detect.mjs <file or folder> [--json]
//
// Line rules run on the target. Stack and stock-default checks read the whole project the target
// belongs to (nearest folder with package.json or .git), so a single file still sees its theme.
// Exit 0: scan finished (with or without candidates). Exit 2: bad usage or a path that cannot be read.

import { readFileSync, readdirSync, lstatSync, existsSync, realpathSync } from 'node:fs';
import { join, extname, relative, basename, dirname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', '.astro', 'coverage', 'scratch', '.squeegee', 'vendor', 'fixtures']);
const EXTS = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.html', '.css', '.scss', '.vue', '.svelte', '.astro', '.mdx']);
const MARKUP = new Set(['.tsx', '.jsx', '.js', '.html', '.vue', '.svelte', '.astro', '.mdx']);
const MAX_BYTES = 400_000;
const CLS = `class(?:Name)?=(?:"[^"]*?|'[^']*?|\`[^\`]*?|\\{[^}]*?)`;   // inside a class attribute value, any quote style

// Stock shadcn primary colors. A theme that still holds one of these has probably not been customized.
const SHADCN_STOCK = [/--primary:\s*222\.2 47\.4% 11\.2%/, /--primary:\s*240 5\.9% 10%/, /--primary:\s*0 0% 9%/, /--primary:\s*oklch\(0\.205 0 0\)/,
  /--primary:\s*oklch\(0\.21 0\.006 285\.885\)/, /--primary:\s*221\.2 83\.2% 53\.3%/, /--primary:\s*262\.1 83\.3% 57\.8%/];

// The opening tag that starts on line i, joined across up to 8 lines.
const tagAt = (lines, i) => { let t = lines[i]; for (let j = i + 1; j < Math.min(lines.length, i + 8) && !/(?<!=)>/.test(t.slice(t.search(/<[a-zA-Z]/))); j++) t += ' ' + lines[j]; return t; };
// The declarations of plain CSS rules that start on this line and style h1 itself: "h1", ".hero h1", "h1.title", not "h1 span".
const h1Block = (l, lines, i) => {
  if (!/\bh1\b/.test(l)) return '';
  let out = '';
  for (const m of lines.slice(i, i + 40).join('\n').matchAll(/(?<=^|[};])([^{};]*)\{([^}]*)\}/g)) {
    if (m.index >= l.length) break;
    if (m[1].split(',').some((s) => /(^|[\s>+~])h1(?![\w-])[^\s>+~]*$/.test(s.trim()))) out += m[2];
  }
  return out;
};

// tier: defect (always fix) | tell (fix unless kept) | default (cluster only) | report (never generate) | house (fix with approval)
export const RULES = [
  { id: 'T01', tier: 'tell', name: 'gradient text', law: null,
    test: (l) => (/bg-clip-text/.test(l) && /text-transparent/.test(l)) || (/background-clip:\s*text/.test(l)),
    fix: 'Use one solid ink color. Put emphasis in size or weight.' },
  { id: 'T02', tier: 'tell', name: 'badge above the headline', law: 'Von Restorff', special: true,
    fix: 'Remove it, or move its content into the headline or subhead. Keep it only when it carries real news.' },
  { id: 'T03', tier: 'tell', name: 'checkmark list', law: null, special: true,
    fix: 'Write the items as plain text or a table. Pricing and comparison tables are exempt.' },
  { id: 'T04', tier: 'tell', name: 'emoji in a heading or button', law: null,
    test: (l) => /<(h[1-4]|button|Button)\b[^>]*>[^<]*(?![©®™])\p{Extended_Pictographic}/u.test(l),
    fix: 'Remove the emoji, or use the project icon set where the icon carries meaning.' },
  { id: 'T05', tier: 'tell', name: 'stock palette color used directly', law: null, min: 5,
    test: (l) => /\b(bg|text|from|via|to|border|ring)-(indigo|violet|purple|fuchsia|blue|sky)-(400|500|600)\b/.test(l),
    fix: 'Define the accent once as a theme token and reference the token.' },
  { id: 'T06', tier: 'tell', name: 'scroll reveal in many places', law: null, min: 4,
    test: (l) => /\bwhileInView\b|data-aos=|\banimate-(fade|slide)-(in|up)\b/.test(l),
    fix: 'Keep at most one entrance. Remove the hidden start state together with the animation.' },
  { id: 'T07', tier: 'tell', name: 'looping attention animation', law: 'Von Restorff',
    test: (l) => /\banimate-(bounce|pulse|ping)\b/.test(l) && !/skeleton|loading|spinner|placeholder/i.test(l),
    fix: 'Remove it unless it marks something that is live right now.' },
  { id: 'X01', tier: 'defect', name: 'transition on all properties', law: null,
    test: (l) => /\btransition-all\b|transition:\s*all\b/.test(l),
    fix: 'Name the properties that change, usually transform and opacity.' },
  { id: 'X02', tier: 'defect', name: 'focus outline removed with no replacement', law: 'Similarity',
    test: (l, lines, i, file) => {
      const near = [lines[i - 1], l, lines[i + 1], lines[i + 2]].join(' ');
      if (/\boutline-none\b/.test(l)) return !/focus-visible:|focus:ring|focus:outline|focus:border|focus-within:/.test(near.replace(/[\w:-]*outline-none\b/g, ''));
      return /outline:\s*(none|0)\b/.test(l) && !/:focus-visible/.test(file.text);
    },
    fix: 'Add a visible focus-visible style.' },
  { id: 'X03', tier: 'defect', name: 'arbitrary spacing value', law: 'Proximity', min: 3,
    test: (l) => /(^|[\s"'`:])-?(p[trblxy]?|m[trblxy]?|gap(-[xy])?|space-[xy])-\[\d+px\]/.test(l),
    fix: 'Use the project spacing scale.' },
  { id: 'X04', tier: 'defect', name: 'zoom disabled', law: 'Postel',
    test: (l) => /user-scalable\s*=\s*(no|0)\b|maximum-scale\s*=\s*1(\.0+)?(?![.\d])/.test(l),
    fix: 'Remove it from the viewport meta tag.' },
  { id: 'X05', tier: 'defect', name: 'font named but never loaded', law: null, special: true,
    fix: 'Load the face once in the theme with @font-face or a font link, or name a face every visitor has.' },
  { id: 'L01', tier: 'defect', name: 'small tap target', law: 'Fitts',
    test: (l, lines, i) => { const t = tagAt(lines, i); return new RegExp(`<(button|a)\\b(?:=>|[^>])*?${CLS}\\b(h-[3-5]|size-[3-5])\\b`).test(t) && !/\bp[xy]?-[2-9]\b|\bp[xy]?-\d\d\b|\bmin-[hw]-/.test(t); },
    fix: 'Give the control a hit area of at least 24 by 24 px, 44 by 44 px on touch screens.' },
  { id: 'L02', tier: 'tell', name: 'slow interface transition', law: null,
    test: (l) => /\bduration-(500|700|1000)\b/.test(l) && /hover:|focus:|active:|transition/.test(l),
    fix: 'Keep interface transitions at 300 ms or less.' },
  { id: 'R01', tier: 'report', name: 'placeholder name or text', law: null,
    test: (l) => /\b(Jane Doe|John Doe|Acme (Inc|Corp|Co)\b|Lorem ipsum|Your Company|example@example\.com)/.test(l),
    fix: 'Report it. The owner confirms or supplies the real content.' },
  { id: 'R02', tier: 'report', name: 'proof claim to check', law: null,
    test: (l) => /\b(trusted|loved|used|chosen) by (over |more than )?[\d,.]+[kKmM]?\+?/i.test(l),
    fix: 'Report it. Ask the owner for the source. Never invent or adjust a number.' },
  { id: 'H01', tier: 'house', name: 'em dash in interface copy', law: null,
    // A dash between words only: a lone "—" is a placeholder for an empty value, which is data.
    test: (l) => /[\p{L}\p{N}.,!?)]\s?—\s?[\p{L}\p{N}(]/u.test(l) && !/^\s*(\/\/|\*|\/\*|\{\/\*|<!--)/.test(l),
    fix: 'House rule, not an evidence-based tell. Rewrite with a period or comma after approval.' },
  // Stock defaults found by line. They feed the cluster count and are never reported alone.
  { id: 'D05', tier: 'default', name: 'headline weight 700 or more', law: null,
    test: (l, lines, i) => (/<h1\b/.test(l) && /\bfont-(bold|extrabold|black)\b/.test(tagAt(lines, i))) || /font-weight:\s*(bold|[7-9]\d\d)\b/.test(h1Block(l, lines, i)) },
  { id: 'D06', tier: 'default', name: 'centered headline', law: null,
    test: (l, lines, i) => (/<h1\b/.test(l) && /\btext-center\b/.test(tagAt(lines, i))) || /text-align:\s*center\b/.test(h1Block(l, lines, i)) },
  { id: 'D07', tier: 'default', name: 'body text under 16 px', law: null,
    test: (l, lines, i) => (/<body\b/.test(l) && /\btext-(xs|sm)\b/.test(tagAt(lines, i))) || (/\b(html|body)\s*\{/.test(l) && /\b(html|body)\s*\{[^}]*font-size:\s*(1[0-5]px|0\.[0-9]+rem)/.test(lines.slice(i, i + 40).join('\n'))) },
];
const rule = (id) => RULES.find((r) => r.id === id);
// A font-family whose first family is not a system or generic one. A system-only stack stays eligible for D03.
const FAMILY_CHOSEN = /font-family\s*:\s*(?!["']?(ui-|system-ui|-apple-system|blinkmacsystemfont|segoe ui|sans-serif|serif|monospace|cursive|fantasy|arial|helvetica|inherit|initial|unset|revert|var\(|theme\())["']?[a-z]/i;
// Faces that need no loading: generic names and the faces operating systems ship in their default stacks.
const SAFE_FACE = /^(serif|sans-serif|monospace|cursive|fantasy|emoji|math|system-ui|ui-[a-z-]+|-apple-system|blinkmacsystemfont|inherit|initial|unset|revert|arial|helvetica( neue)?|times( new roman)?|georgia|courier( new)?|verdana|tahoma|trebuchet ms|impact|palatino|segoe ui( [a-z]+)*|roboto|sf pro( [a-z]+)*|sf mono|sfmono-regular|menlo|monaco|consolas|lucida [a-z ]+|liberation [a-z]+|dejavu [a-z ]+|ubuntu( mono)?|cantarell|oxygen|fira sans|droid sans|noto [a-z ]+|apple color emoji)$/i;
// A font-family declaration, or a custom property with "font" in its name whose value is a stack ending in a generic family.
// The stack test keeps --font-display: swap and --font-weight: bold from being read as faces.
const FACE_DECL = /(?:font-family\s*:\s*([^;}{\n]+)|--[\w-]*font[\w-]*\s*:\s*([^;}{\n]+,\s*(?:serif|sans-serif|monospace|system-ui|ui-[a-z-]+|cursive|fantasy))\s*(?=[;}\n]|$))/g;
const norm = (t) => t.trim().replace(/^["']|["']$/g, '').toLowerCase().replace(/[+_-]/g, ' ');
// The family names a file loads: @font-face rules, Google or Bunny font links, @fontsource packages, next/font/google imports.
const loadedFaces = (text) => [
  ...[...text.matchAll(/@font-face\s*\{[^}]*?font-family\s*:\s*([^;}]+)/g)].map((m) => m[1]),
  ...[...text.matchAll(/fonts\.(?:googleapis|bunny)[^"'\s)]*/g)].flatMap((m) => [...m[0].matchAll(/family=([^&:"']+)/g)].flatMap((f) => f[1].replace(/%20/g, ' ').split('|'))),
  ...[...text.matchAll(/@fontsource(?:-variable)?\/([\w-]+)/g)].map((m) => m[1]),
  ...[...text.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]next\/font\/google['"]/g)].flatMap((m) => m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0])),
].map(norm);
const CHECK =/<(Check|CheckCircle2?|CircleCheck|CheckIcon)\b|[✓✔✅]/;

function walk(dir, out, skipped) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = lstatSync(p); } catch { skipped.unreadable++; continue; }
    if (st.isSymbolicLink()) { skipped.links++; continue; }   // never follow links: avoids cycles and leaving the project
    if (st.isDirectory()) { if (!name.startsWith('.')) walk(p, out, skipped); }   // dot folders hold tooling, such as this skill in .claude/skills
    else if (EXTS.has(extname(name)) && !/\.(min|test|spec)\./.test(name)) { if (st.size > MAX_BYTES) skipped.large++; else out.push(p); }
  }
  return out;
}

function projectRootOf(start) {
  for (let d = start; ; d = dirname(d)) {
    if (existsSync(join(d, 'package.json')) || existsSync(join(d, '.git'))) return d;
    if (dirname(d) === d) return start;
  }
}

export function scan(target) {
  const abs = realpathSync.native(resolve(target));   // true case and no links, so it matches the walked paths
  const isDir = lstatSync(abs).isDirectory();
  const targetDir = isDir ? abs : dirname(abs);
  const root = projectRootOf(targetDir);
  const skipped = { large: 0, unreadable: 0, links: 0 };
  const projectFiles = walk(root, [], skipped);
  const inTarget = (f) => (isDir ? f === abs || f.startsWith(abs.endsWith(sep) ? abs : abs + sep) : f === abs);
  const targetFiles = projectFiles.filter(inTarget);
  // A target the project walk skipped (a file, or a folder such as build/ or fixtures/) is still scanned when named.
  if (!targetFiles.length) { if (isDir) walk(abs, targetFiles, skipped); else targetFiles.push(abs); }
  const targetSet = new Set(targetFiles);
  const rel = (f) => relative(root, f).replace(/\\/g, '/');
  const candidates = [];
  const hits = {};
  const p = { fontChosen: false, inter: false, lucideFiles: 0, strokeFiles: 0, globalStroke: false, shadcnStock: null, shadcnVars: false,
    motion: false, reducedMotion: false, cssInJs: false, tailwindV4: false, modules: false, loaded: new Set(), unknownLoader: false };
  const faces = new Map();   // first family of each font declaration in the target, with where it was first seen
  const st = { files: 0, sizes: new Set(), weights: new Set(), families: new Set(), colors: new Set(), uppercase: 0, gradients: 0 };
  const add = (r, file, line, match) => {
    const c = { id: r.id, tier: r.tier, name: r.name, law: r.law || null, file: rel(file), line, match: match.trim().slice(0, 140), fix: r.fix || null };
    if (r.min) (hits[r.id] ||= []).push(c); else candidates.push(c);
  };

  for (const path of new Set([...projectFiles, ...targetFiles])) {
    let text;
    try { text = readFileSync(path, 'utf8'); } catch { skipped.unreadable++; continue; }
    const ext = extname(path);
    const markup = MARKUP.has(ext), css = /\.s?css$/.test(path);
    const lines = text.split(/\r?\n/);

    // Project-level facts, read from every file in the project.
    if (/\bInter\b[^;]{0,120}from\s*['"]next\/font\/google|@fontsource(-variable)?\/inter\b|family=Inter\b|font-family\s*:[^;}]*\bInter\b|--font-[\w-]+\s*:[^;}]*\bInter\b|fontFamily\s*:[^}]*['"]Inter\b/.test(text)) p.inter = true;
    if (FAMILY_CHOSEN.test(text) || /@font-face|next\/font|@fontsource|fonts\.googleapis|fonts\.bunny|use\.typekit\.net|fontFamily\s*:\s*[{\[]|--font-[a-z-]+\s*:\s*["']/.test(text)) p.fontChosen = true;
    if (/from ['"]lucide-(react|vue-next|vue|svelte)['"]|data-lucide=/.test(text)) { p.lucideFiles++; if (/strokeWidth=|stroke-width=|:stroke-width=/.test(text)) p.strokeFiles++; }
    if (/absoluteStrokeWidth|\.lucide\s*\{[^}]*stroke-width|LucideProps/.test(text)) p.globalStroke = true;
    if (/--background\s*:/.test(text) && /--primary\s*:/.test(text) && /--ring\s*:/.test(text)) { p.shadcnVars = true; if (SHADCN_STOCK.some((re) => re.test(text))) p.shadcnStock = rel(path); }
    if (/\btransition(-|:)|\banimate-|@keyframes|framer-motion|from ['"]motion\//.test(text)) p.motion = true;
    if (/prefers-reduced-motion|\bmotion-(reduce|safe):|useReducedMotion|reducedMotion=/.test(text)) p.reducedMotion = true;
    if (/from ['"](styled-components|@emotion\/|@stitches\/|@vanilla-extract\/)/.test(text)) p.cssInJs = true;
    if (css && /@import\s+["']tailwindcss["']|@theme\b/.test(text)) p.tailwindV4 = true;
    if (/\.module\.s?css$/.test(path)) p.modules = true;
    for (const f of loadedFaces(text)) p.loaded.add(f);
    if (/use\.typekit\.net|next\/font\/local|fonts\.adobe/.test(text)) p.unknownLoader = true;   // loads faces under names this scan cannot read

    // Line rules read markup and stylesheets inside the target only.
    if (!targetSet.has(path)) continue;
    if (!markup && !css) continue;
    const file = { text };
    for (const m of text.matchAll(FACE_DECL)) {
      const face = (m[1] || m[2]).split(',')[0].trim().replace(/\s*!important$/, '').replace(/^["']|["']$/g, '');
      if (!/^[A-Za-z][\w .-]*$/.test(face) || SAFE_FACE.test(face)) continue;   // skips var(), theme() and system faces
      if (css) st.families.add(face.toLowerCase());
      if (!faces.has(face.toLowerCase())) faces.set(face.toLowerCase(), { face, path, line: text.slice(0, m.index).split('\n').length, match: m[0] });
    }
    if (css) {   // how many distinct values a plain stylesheet holds: where to consolidate, not a verdict
      st.files++;
      for (const m of text.matchAll(/font-size:\s*([^;}]+)/g)) st.sizes.add(m[1].trim());
      for (const m of text.matchAll(/font-weight:\s*([^;}]+)/g)) st.weights.add(m[1].trim());
      for (const m of text.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\([^)]*\)/gi)) st.colors.add(m[0].toLowerCase().replace(/\s+/g, ''));
      st.uppercase += (text.match(/text-transform:\s*uppercase/g) || []).length;
      st.gradients += (text.match(/\b(linear|radial|conic)-gradient\(/g) || []).length;
    }
    for (const r of RULES) {
      if (r.special) continue;
      lines.forEach((l, i) => { if (l.length < 2000 && r.test(l, lines, i, file)) add(r, path, i + 1, l); });
    }
    if (!markup) continue;
    // T03: three or more checkmark items in one file. Pricing and comparison files are exempt.
    if (!/pricing|plans?|compar/i.test(basename(path)) && (text.match(new RegExp(CHECK.source, 'g')) || []).length >= 3)
      add(rule('T03'), path, 1 + lines.findIndex((l) => CHECK.test(l)), 'three or more checkmark icons in this file. Confirm they form a feature checklist before reporting');
    // T02: a small fully rounded element on the three lines before an h1.
    lines.forEach((l, i) => {
      if (!/<h1\b/.test(l)) return;
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (/\brounded-full\b/.test(lines[j]) && /\btext-(xs|sm)\b/.test(lines[j])) { add(rule('T02'), path, j + 1, lines[j]); break; }
      }
    });
  }
  // X05: a face the styles name first that nothing in the project loads. It renders only where it is installed.
  if (!p.unknownLoader) for (const f of faces.values()) if (!p.loaded.has(norm(f.face))) add(rule('X05'), f.path, f.line, f.match);
  for (const r of RULES) if (r.min && (hits[r.id] || []).length >= r.min) candidates.push({ ...hits[r.id][0], count: hits[r.id].length, alsoAt: hits[r.id].slice(1, 6).map((c) => `${c.file}:${c.line}`) });

  const has = (...names) => names.some((n) => existsSync(join(root, n)));
  let pkg = ''; try { pkg = readFileSync(join(root, 'package.json'), 'utf8'); } catch {}
  const stack = {
    tailwind: p.tailwindV4 ? 'v4' : has('tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs') ? 'v3' : null,
    shadcn: has('components.json') || p.shadcnVars,
    cssInJs: p.cssInJs, cssModules: p.modules,
    native: has('pubspec.yaml') ? 'flutter' : (has('metro.config.js', 'metro.config.cjs') || /"(react-native|expo)"\s*:/.test(pkg)) && !has('next.config.js', 'next.config.mjs', 'next.config.ts', 'vite.config.ts', 'vite.config.js') ? 'react-native' : null,
  };
  const first = (id) => candidates.find((c) => c.id === id);
  const at = (c) => (c ? `${c.file}:${c.line}` : null);
  const anyMarkup = projectFiles.some((f) => MARKUP.has(extname(f)));
  // Each default says where it was seen, so the agent can confirm it applies to the screen under audit.
  const defaults = [
    ['D01', 'shadcn theme holds a stock primary color', !!p.shadcnStock, p.shadcnStock],
    ['D02', 'Lucide icons at the default stroke', p.lucideFiles > 0 && !p.globalStroke && p.strokeFiles * 2 < p.lucideFiles, `${p.lucideFiles} files import Lucide, ${p.strokeFiles} set a stroke`],
    ['D03', 'no font chosen (system default stack)', anyMarkup && !p.fontChosen && !p.inter, 'no font declaration found in the project'],
    ['D04', 'Inter', p.inter, 'project-wide'],
    ['D05', 'headline weight 700 or more', !!first('D05'), at(first('D05'))],
    ['D06', 'centered headline', !!first('D06'), at(first('D06'))],
    ['D07', 'body text under 16 px', !!first('D07'), at(first('D07'))],
    ['D08', 'badge above the headline', !!first('T02'), at(first('T02'))],
    ['D09', 'motion with no reduced-motion rule', p.motion && !p.reducedMotion, 'project-wide'],
  ].filter(([, , on]) => on).map(([id, name, , where]) => ({ id, name, where }));

  const shown = candidates.filter((c) => c.tier !== 'default');
  const order = { defect: 0, tell: 1, report: 2, house: 3 };
  shown.sort((a, b) => order[a.tier] - order[b.tier] || a.file.localeCompare(b.file) || a.line - b.line);
  const counts = shown.reduce((m, c) => (m[c.tier] = (m[c.tier] || 0) + 1, m), {});
  const styles = st.files ? { cssFiles: st.files, fontFamilies: st.families.size, fontSizes: st.sizes.size, fontWeights: st.weights.size, colors: st.colors.size, uppercase: st.uppercase, gradients: st.gradients } : null;
  return { projectRoot: root.replace(/\\/g, '/'), target: rel(abs) || '.', files: targetFiles.length, projectFiles: projectFiles.length, skipped, stack, defaults, styles,
    cluster: { present: defaults.length, of: 9, flagged: defaults.length >= 5, opaque: defaults.length >= 7 }, counts, candidates: shown };
}

function main() {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--'));
  if (!target || !existsSync(target)) { console.error('usage: detect.mjs <file or folder> [--json]\nFor a URL, pass the project folder that serves it.'); process.exit(2); }
  let r;
  try { r = scan(target); } catch (e) { console.error(`detect.mjs could not scan ${target}: ${e.message}`); process.exit(2); }
  if (!r.files) console.error(`detect.mjs: 0 target files under ${target}. Check the path and its case.`);
  if (args.includes('--json')) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log(`squeegee detector: ${r.files} target files, ${r.projectFiles} project files read for stack and defaults. Candidates only, confirm each one.`);
  const sk = r.skipped;
  if (sk.large || sk.unreadable || sk.links) console.log(`not scanned: ${sk.large} files over 400 KB, ${sk.unreadable} unreadable, ${sk.links} links`);
  console.log(`stack: tailwind ${r.stack.tailwind || 'none'}, shadcn ${r.stack.shadcn ? 'yes' : 'no'}, css-in-js ${r.stack.cssInJs ? 'yes' : 'no'}${r.stack.native ? ', ' + r.stack.native : ''}`);
  console.log(`stock defaults: ${r.cluster.present} of 9${r.cluster.flagged ? ' (flagged: 5 or more)' : ''}`);
  for (const d of r.defaults) console.log(`  ${d.id}  ${d.name}  (${d.where})`);
  if (r.styles) console.log(`plain CSS in ${r.styles.cssFiles} files: ${r.styles.fontFamilies} chosen faces, ${r.styles.fontSizes} font sizes, ${r.styles.fontWeights} weights, ${r.styles.colors} color values, ${r.styles.uppercase} uppercase rules, ${r.styles.gradients} gradients`);
  console.log(`candidates: ${Object.entries(r.counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'none'}`);
  for (const c of r.candidates) console.log(`  ${c.id}  ${c.tier.padEnd(6)} ${c.file}:${c.line}  ${c.name}${c.count ? ` (${c.count} places)` : ''}${c.law ? `  [UX law: ${c.law}]` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();   // realpath: the skill folder may be a link
