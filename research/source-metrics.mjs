// Counts of style variation in source code, used by bench.mjs to look for sprawl that shows before a page renders.
// Each number describes one repo. They are exploratory: bench.mjs reports which ones separate the classes.

import { readFileSync } from 'node:fs';

const MARKUP = /\.(tsx|jsx|vue|svelte|astro|html)$/, CSS = /\.s?css$/;
const HUES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const count = (s, re) => (s.match(re) || []).length;
const each = (s, re, f) => { for (const m of s.matchAll(re)) f(m); };
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
const per = (n, kloc) => (kloc ? +(n / kloc).toFixed(2) : 0);

export function metrics(paths) {
  const d = Object.fromEntries(['size', 'arb', 'color', 'hue', 'weight', 'radius', 'shadow', 'hex', 'cssSize', 'cssColor', 'z'].map((k) => [k, new Set()]));
  const n = { lines: 0, files: 0, style: 0, important: 0, emoji: 0, eyebrow: 0, gradient: 0, blur: 0, xs: 0, sizeUses: 0, hexUses: 0, long: 0 };
  const lens = [], strings = new Map();
  for (const p of paths) {
    const markup = MARKUP.test(p), css = CSS.test(p);
    if (!markup && !css) continue;
    let t; try { t = readFileSync(p, 'utf8'); } catch { continue; }
    if (t.length > 400_000) continue;
    const lines = count(t, /\n/g) + 1;
    n.files++; n.lines += lines;
    n.gradient += count(t, /\bbg-gradient-to-|\bbg-linear-to-|\b(?:linear|radial|conic)-gradient\(/g);
    if (css) {
      each(t, /font-size:\s*([^;}]+)/g, (m) => d.cssSize.add(m[1].trim()));
      each(t, /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\([^)]*\)/gi, (m) => d.cssColor.add(m[0].toLowerCase().replace(/\s+/g, '')));
      each(t, /z-index:\s*(-?\d+)/g, (m) => d.z.add(m[1]));
      n.important += count(t, /!important/g);
      continue;
    }
    lens.push(lines);
    each(t, /\btext-(xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(?:px|rem|em)\])(?![\w-])/g, (m) => { d.size.add(m[1]); n.sizeUses++; if (m[1] === 'xs' || /^\[(?:\d|1[01])(?:\.\d+)?px\]$/.test(m[1])) n.xs++; });
    each(t, /\b[a-z][\w-]*-\[[^\]\s]{1,40}\]/g, (m) => d.arb.add(m[0]));
    each(t, new RegExp(`\\b(?:bg|text|border|from|to|via|ring|fill|stroke)-(${HUES})-\\d{2,3}\\b`, 'g'), (m) => { d.color.add(m[0]); d.hue.add(m[1]); });
    each(t, /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g, (m) => d.weight.add(m[1]));
    each(t, /\brounded(?:-[trblse]{1,2})?(?:-(none|sm|md|lg|xl|2xl|3xl|full|\[[^\]]+\]))?(?![\w-])/g, (m) => d.radius.add(m[1] || 'base'));
    each(t, /\bshadow(?:-(sm|md|lg|xl|2xl|inner|none|\[[^\]]+\]))?(?![\w-])/g, (m) => d.shadow.add(m[1] || 'base'));
    each(t, /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (m) => { d.hex.add(m[0].toLowerCase()); n.hexUses++; });
    each(t, /z-(\d+|\[[^\]]+\])(?![\w-])/g, (m) => d.z.add(m[1]));
    n.style += count(t, /\bstyle=\{\{|\bstyle="/g);
    n.emoji += count(t.replace(/[©®™]/g, ''), /\p{Extended_Pictographic}/gu);
    n.eyebrow += t.split('\n').filter((l) => /\buppercase\b/.test(l) && /\btracking-/.test(l)).length;
    n.blur += count(t, /\bbackdrop-blur/g);
    each(t, /class(?:Name)?="([^"]{40,})"/g, (m) => { n.long++; strings.set(m[1], (strings.get(m[1]) || 0) + 1); });
  }
  const kloc = n.lines / 1000;
  const repeated = [...strings.values()].filter((v) => v >= 3).reduce((a, v) => a + v, 0);
  return {
    'UI files': n.files, 'UI lines (thousands)': +kloc.toFixed(1),
    'Lines in the median markup file': median(lens), 'Lines in the longest markup file': Math.max(0, ...lens),
    'Distinct Tailwind text sizes': d.size.size, 'Share of text-size classes that are text-xs or smaller': n.sizeUses ? +(n.xs / n.sizeUses).toFixed(2) : 0,
    'Distinct font weights': d.weight.size, 'Distinct radius steps': d.radius.size, 'Distinct shadow steps': d.shadow.size,
    'Distinct palette color classes': d.color.size, 'Distinct palette hues': d.hue.size,
    'Distinct arbitrary values': d.arb.size, 'Arbitrary values per thousand lines': per(d.arb.size, kloc),
    'Distinct hex colors in markup': d.hex.size, 'Hex colors in markup per thousand lines': per(n.hexUses, kloc),
    'Inline styles per thousand lines': per(n.style, kloc), 'Emoji per thousand lines': per(n.emoji, kloc),
    'Tracked uppercase labels per thousand lines': per(n.eyebrow, kloc), 'Gradients per thousand lines': per(n.gradient, kloc),
    'Backdrop blurs per thousand lines': per(n.blur, kloc), 'Share of long class strings repeated 3 or more times': n.long ? +(repeated / n.long).toFixed(2) : 0,
    'Distinct font sizes in CSS': d.cssSize.size, 'Distinct colors in CSS': d.cssColor.size, 'Distinct z-index values': d.z.size, '!important per thousand lines': per(n.important, kloc),
  };
}
