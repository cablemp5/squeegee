// squeegee page measure: one expression. Evaluate this whole file in the page with a browser tool and
// save the returned object as .squeegee/measure-<width>.json. It reads computed styles only and changes nothing.
// The limits are the 90th percentile of the 565 reference pages (research/RESULTS.md), so "over" means
// "outside the range of 90% of professionally made pages", not "wrong".
(() => {
  const add = (m, k, v = 1) => { m[k] = (m[k] || 0) + v; };
  const top = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
  const px = (s) => parseFloat(s) || 0;
  const first = (s) => s.split(',')[0].trim().replace(/^["']|["']$/g, '');
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const cache = new Map();
  const rgba = (s) => {   // canvas turns any CSS color into rgba bytes
    if (!cache.has(s)) { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; cache.set(s, [d[0], d[1], d[2], d[3] / 255]); }
    return cache.get(s);
  };
  const hex = ([r, g, b]) => '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  const hsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l];
  };
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0.5) return c; } return [255, 255, 255, 1]; };
  const label = (el) => (el.innerText || el.getAttribute('aria-label') || el.title || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);

  // Text: faces, sizes, weights, colors, contrast. Weighted by character count.
  const fonts = {}, sizes = {}, weights = {}, colors = {}, lefts = {}, low = [];
  let chars = 0, lowChars = 0, tinyChars = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(), i = 0; n && i < 4000; n = walker.nextNode()) {
    const len = n.nodeValue.trim().length, p = n.parentElement;
    if (!len || !p || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName)) continue;
    const r = p.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(p);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    i++;
    const size = Math.round(px(cs.fontSize)), fg = rgba(cs.color);
    add(fonts, first(cs.fontFamily), len); add(sizes, size, len); add(weights, cs.fontWeight, len); add(colors, hex(fg), len);
    if (len > 20) add(lefts, Math.round(r.left / 4) * 4);
    chars += len;
    if (size < 12) tinyChars += len;
    const a = lum(fg), b = lum(bgOf(p)), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < (size >= 24 ? 3 : 4.5)) { lowChars += len; if (low.length < 8) low.push({ text: n.nodeValue.trim().slice(0, 40), ratio: +ratio.toFixed(2), size }); }
  }

  // Boxes: hues, tracked uppercase labels, controls.
  const hues = {}, small = [], touch = [];
  let caps = 0, controls = 0, seen = 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (seen >= 6000) break;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    seen++;
    const cs = getComputedStyle(el), bg = rgba(cs.backgroundColor);
    if (bg[3] > 0.5) { const [h, s] = hsl(bg); if (s > 0.35) add(hues, Math.round(h / 30) * 30 % 360, r.width * r.height); }
    if (cs.textTransform === 'uppercase' && px(cs.fontSize) <= 13 && px(cs.letterSpacing) >= px(cs.fontSize) * 0.05 && el.childElementCount === 0) caps++;
    if (el.matches('a[href],button,[role=button],input:not([type=hidden]),select,textarea,summary')) {
      controls++;
      const inline = el.matches('a') && cs.display === 'inline' && el.parentElement && el.parentElement.innerText.trim().length > el.innerText.trim().length + 20;
      const box = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (!inline && Math.min(r.width, r.height) < 24 && small.length < 12) small.push({ label: label(el), box });
      if (!inline && Math.min(r.width, r.height) < 44 && touch.length < 12) touch.push({ label: label(el), box });
    }
  }
  const hueTotal = Object.values(hues).reduce((a, v) => a + v, 0) || 1;
  const hueList = Object.entries(hues).filter(([, v]) => v / hueTotal > 0.03).map(([h]) => +h);

  // Headings: one style per level is the plain case.
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => h.getBoundingClientRect().width > 0);
  const headingStyles = {};
  for (const h of headings) { const cs = getComputedStyle(h); add(headingStyles, `${h.tagName.toLowerCase()} ${first(cs.fontFamily)} ${Math.round(px(cs.fontSize))}px ${cs.fontWeight}`); }
  const h1 = headings.find((h) => h.tagName === 'H1'), h1cs = h1 && getComputedStyle(h1);

  // Faces: a first-choice family that is not a loaded web font renders only where it is installed.
  // Generic names and system faces need no loading. Fallbacks later in a stack are not checked.
  const SYSTEM = /^(serif|sans-serif|monospace|cursive|fantasy|emoji|math|system-ui|ui-[a-z-]+|-apple-system|blinkmacsystemfont|inherit|arial|helvetica( neue)?|times( new roman)?|georgia|courier( new)?|verdana|tahoma|trebuchet ms|segoe ui( [a-z]+)*|roboto|sf pro( [a-z]+)*|sf mono|sfmono-regular|menlo|monaco|consolas|ubuntu( mono)?|noto [a-z ]+)$/i;
  const web = new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, '').toLowerCase()));
  const width = (font) => { ctx.font = `40px ${font}`; return ctx.measureText('mmmmmmmmmmlli10OQ@').width; };
  const installed = (name) => ['monospace', 'serif'].some((g) => width(`"${name}", ${g}`) !== width(g));
  const faces = Object.keys(fonts).filter((n) => n && !SYSTEM.test(n)).map((n) => ({ family: n, webFont: web.has(n.toLowerCase()), installedHere: installed(n) }));

  const count = (m) => Object.keys(m).length;
  const bodySize = +(top(sizes, 1)[0] || [0])[0];
  const tiny = chars ? +(tinyChars / chars).toFixed(3) : 0;
  const sprawl = [
    ['S01', 'font families', count(fonts), 4],
    ['S02', 'distinct text sizes', count(sizes), 14],
    ['S03', 'saturated hues', hueList.length, 3],
    ['S04', 'tracked uppercase labels', caps, 5],
    ['S05', 'share of text under 12 px', tiny, 0.066],
  ].map(([id, name, value, limit]) => ({ id, name, value, limit, over: value > limit }));
  // Limits set by judgment: the research did not record these counts in full. Each one over is a judged tell, not a sprawl measure.
  const levels = new Set(headings.map((h) => h.tagName)).size;
  const judged = [
    ['S06', 'font weights', count(weights), 5],
    ['S07', 'text colors', count(colors), 8],
    ['S08', 'heading styles', count(headingStyles), levels + 1],
  ].map(([id, name, value, limit]) => ({ id, name, value, limit, over: value > limit }));

  return {
    viewport: [innerWidth, innerHeight], url: location.href,
    sprawl, sprawlOver: sprawl.filter((s) => s.over).length, judged,
    families: top(fonts, 8), sizes: top(sizes, 24).map(([s]) => +s).sort((a, b) => a - b), bodySize,
    weights: Object.keys(weights).map(Number).sort((a, b) => a - b), textColors: count(colors), topTextColors: top(colors, 6), hues: hueList,
    headings: headings.length, headingStyles: Object.keys(headingStyles), leftEdges: count(lefts),
    h1: h1 ? { text: h1.innerText.trim().slice(0, 80), size: Math.round(px(h1cs.fontSize)), weight: +h1cs.fontWeight, family: first(h1cs.fontFamily), centered: h1cs.textAlign === 'center' } : null,
    words: (document.body.innerText || '').split(/\s+/).filter(Boolean).length,
    faces, facesNotLoaded: faces.filter((f) => !f.webFont).map((f) => f.family),
    lowContrastShare: chars ? +(lowChars / chars).toFixed(3) : 0, lowContrast: low,
    controls, under24: small, under44: touch,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1,
    reducedMotionRule: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.conditionText && r.conditionText.includes('prefers-reduced-motion')); } catch { return false; } }),
  };
})()
