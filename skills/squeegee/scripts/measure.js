// squeegee page measure: one expression. Evaluate this whole file in the page with a browser tool and
// save the returned object as .squeegee/measure-<width>.json. It reads computed styles only and changes nothing.
// The limits come from running this script on 277 reference pages and 236 agent-written pages
// (research/AGENT-RESULTS.md). "Over" means outside what most professionally made pages do, not "wrong".
// Three or more of the four sprawl measures over appear on 3.6% of reference pages and 15.7% of agent-written pages.
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
  const fonts = {}, sizes = {}, weights = {}, colors = {}, lefts = {}, leads = {}, low = [];
  let chars = 0, lowChars = 0, tinyChars = 0;
  // An element's own opacity times every ancestor's. A fade that is still playing counts as finished, so an entrance caught mid-way is not read as faint text.
  const fading = new Set(document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getKeyframes().some((k) => 'opacity' in k)).map((a) => a.effect.target));
  const opac = new Map();
  const opacityOf = (e) => { if (!e) return 1; if (!opac.has(e)) opac.set(e, (fading.has(e) ? 1 : +getComputedStyle(e).opacity) * opacityOf(e.parentElement)); return opac.get(e); };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(), i = 0; n && i < 4000; n = walker.nextNode()) {
    const len = n.nodeValue.trim().length, p = n.parentElement;
    if (!len || !p || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName) || p.closest('svg')) continue;   // text in a drawing is not the interface's type
    const r = p.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(p);
    if (cs.visibility === 'hidden' || opacityOf(p) < 0.05) continue;
    i++;
    const size = Math.round(px(cs.fontSize)), fg = rgba(cs.color);
    add(fonts, first(cs.fontFamily), len); add(sizes, size, len); add(weights, cs.fontWeight, len); add(colors, hex(fg), len);
    if (len > 20) add(lefts, Math.round(r.left / 4) * 4);
    if (!(size in leads) && px(cs.lineHeight)) leads[size] = +(px(cs.lineHeight) / size).toFixed(2);
    chars += len;
    if (size < 12) tinyChars += len;
    // A translucent color or a faded parent shows the ground through the text: blend before comparing.
    const ground = bgOf(p), alpha = fg[3] * opacityOf(p), shown = [0, 1, 2].map((k) => fg[k] * alpha + ground[k] * (1 - alpha));
    const a = lum(shown), b = lum(ground), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    // Fully transparent text is painted by its background (gradient text): not judged here.
    if (fg[3] > 0 && ratio < (size >= 24 ? 3 : 4.5)) { lowChars += len; if (low.length < 8) low.push({ text: n.nodeValue.trim().slice(0, 40), ratio: +ratio.toFixed(2), size }); }
  }

  // Boxes: hues, tracked uppercase labels, controls, corner radius, shadows.
  const hues = {}, radii = {}, accents = {}, small = [], touch = [];
  let caps = 0, controls = 0, seen = 0, n24 = 0, n44 = 0, boxes = 0, shadowed = 0, pills = 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (seen >= 6000) break;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    seen++;
    const cs = getComputedStyle(el), bg = rgba(cs.backgroundColor);
    const vivid = bg[3] > 0.5 && hsl(bg)[1] > 0.35;
    if (vivid) add(hues, Math.round(hsl(bg)[0] / 30) * 30 % 360, r.width * r.height);
    if ((bg[3] > 0.05 || px(cs.borderTopWidth) > 0) && r.width >= 40 && r.height >= 20) {   // a box with a surface of its own
      boxes++;
      const rad = Math.round(px(cs.borderTopLeftRadius));
      if (rad > 0 && rad >= r.height / 2 - 1) pills++; else add(radii, rad);
      if (cs.boxShadow !== 'none') shadowed++;
    }
    if (cs.textTransform === 'uppercase' && px(cs.fontSize) <= 13 && px(cs.letterSpacing) >= px(cs.fontSize) * 0.05 && el.childElementCount === 0) caps++;
    if (r.width > 1 && r.height > 1 && el.matches('a[href],button,[role=button],input:not([type=hidden]),select,textarea,summary')) {   // a 1 px control is hidden from sight on purpose
      controls++;
      if (vivid) add(accents, hex(bg));
      const inline = el.matches('a') && cs.display === 'inline' && el.parentElement && el.parentElement.innerText.trim().length > el.innerText.trim().length + 20;
      const box = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (!inline && Math.min(r.width, r.height) < 24 && ++n24 <= 12) small.push({ label: label(el), box });
      if (!inline && Math.min(r.width, r.height) < 44 && ++n44 <= 12) touch.push({ label: label(el), box });
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
  const SYSTEM = /^(serif|sans-serif|monospace|cursive|fantasy|emoji|math|system-ui|ui-[a-z-]+|-apple-system|blinkmacsystemfont|inherit|arial|helvetica( neue)?|times( new roman)?|georgia|courier( new)?|verdana|tahoma|trebuchet ms|segoe ui( [a-z]+)*|roboto|sf pro( [a-z]+)*|sf mono|sfmono-regular|menlo|monaco|consolas|ubuntu( mono)?|noto [a-z ]+|avenir( next)?|helveticaneue|helvetica-bold|arial black|apple (color emoji|symbols)|pingfang [a-z]+|songti [a-z]+|hiragino [a-z ]+|microsoft yahei|iowan old style|cascadia (code|mono)|dejavu [a-z ]+|liberation [a-z]+|palatino|impact)$/i;
  const web = new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, '').toLowerCase()));
  const width = (font) => { ctx.font = `40px ${font}`; return ctx.measureText('mmmmmmmmmmlli10OQ@').width; };
  const installed = (name) => ['monospace', 'serif'].some((g) => width(`"${name}", ${g}`) !== width(g));
  const faces = Object.keys(fonts).filter((n) => n && !SYSTEM.test(n)).map((n) => ({ family: n, webFont: web.has(n.toLowerCase()), installedHere: installed(n) }));

  const count = (m) => Object.keys(m).length;
  const bodySize = +(top(sizes, 1)[0] || [0])[0];
  const tiny = chars ? +(tinyChars / chars).toFixed(3) : 0;
  // Sprawl: the four counts that agent-written pages go over most often. Sizes 1 px apart mean no type scale was chosen.
  const sizeList = top(sizes, 24).map(([s]) => +s).sort((a, b) => a - b);
  const sprawl = [
    ['S01', 'text sizes 1 px apart', sizeList.filter((s, i) => i && s - sizeList[i - 1] === 1).length, 4],
    ['S02', 'tracked uppercase labels', caps, 5],
    ['S03', 'share of text under 12 px', tiny, 0.066],
    ['S04', 'font weights', count(weights), 4],
  ].map(([id, name, value, limit]) => ({ id, name, value, limit, over: value > limit }));
  // Four more counts, each with its limit at the reference 90th percentile. Reference pages go over them as often as
  // agent-written pages do, so each one over is a tell, not a sprawl measure.
  const counts = [
    ['S05', 'font families', count(fonts), 4],
    ['S06', 'distinct text sizes', count(sizes), 14],
    ['S07', 'saturated hues', hueList.length, 3],
    ['S08', 'text colors', count(colors), 14],
  ].map(([id, name, value, limit]) => ({ id, name, value, limit, over: value > limit }));

  // Ingredients: what a design direction is made of. Read the same way from this page and from a reference page,
  // so a direction can state them as numbers and direction.mjs can check the finished screen against them.
  const words = (document.body.innerText || '').split(/\s+/).filter(Boolean).length;
  const groundRgb = bgOf(document.body), corner = top(Object.fromEntries(Object.entries(radii).filter(([k]) => +k > 0)), 1)[0];
  const ingredients = {
    ground: hex(groundRgb), dark: lum(groundRgb) < 0.2, ink: (top(colors, 1)[0] || [null])[0], accent: (top(accents, 1)[0] || [null])[0],
    bodyFace: (top(fonts, 1)[0] || [null])[0], headingFace: h1 ? first(h1cs.fontFamily) : null, monoFace: Object.keys(fonts).find((n) => /mono|code|courier|consolas|menlo/i.test(n)) || null,
    headline: h1 ? { size: Math.round(px(h1cs.fontSize)), weight: +h1cs.fontWeight, leading: +(px(h1cs.lineHeight) / px(h1cs.fontSize)).toFixed(2) || null, tracking: +(px(h1cs.letterSpacing) / px(h1cs.fontSize)).toFixed(3) || 0 } : null,
    body: { size: bodySize, leading: leads[bodySize] || null },
    radius: corner ? +corner[0] : 0, pills, shadowShare: boxes ? +(shadowed / boxes).toFixed(2) : 0,
    wordsPerScreen: Math.round(words / Math.max(1, document.documentElement.scrollHeight / innerHeight)),
    imagery: { images: [...document.images].filter((i) => i.getBoundingClientRect().width >= 120).length, drawings: [...document.querySelectorAll('svg,canvas')].filter((d) => d.getBoundingClientRect().width >= 120).length, videos: document.querySelectorAll('video').length },
  };

  // The nine stock defaults, read from the rendered page the way the research measured them.
  const rootCs = getComputedStyle(document.documentElement), bodyFace = ((top(fonts, 1)[0] || [''])[0]).toLowerCase();
  const mentionsMotion = (rules) => [...rules].some((r) => (r.conditionText && r.conditionText.includes('prefers-reduced-motion')) || (r.cssRules && mentionsMotion(r.cssRules)));   // also inside @layer and @supports
  const reducedMotionRule = [...document.styleSheets].some((s) => { try { return mentionsMotion(s.cssRules); } catch { return false; } });
  const h1r = document.querySelector('h1'), h1rcs = h1r && getComputedStyle(h1r);   // the research read the first h1 in the document, shown or not
  let badge = false;   // a small fully rounded element just above the headline
  for (let e = h1r, hops = 0; e && hops < 3 && !badge; e = e.parentElement, hops++) {
    const prev = e.previousElementSibling;
    if (prev) for (const c of [prev, ...prev.querySelectorAll('*')].slice(0, 12)) {
      const s = getComputedStyle(c), b = c.getBoundingClientRect();
      if (b.height > 0 && b.height < 44 && b.width < 420 && px(s.borderTopLeftRadius) >= b.height / 2 - 1 && (rgba(s.backgroundColor)[3] > 0.05 || px(s.borderTopWidth) > 0) && c.innerText && c.innerText.trim().length > 2) { badge = true; break; }
    }
  }
  const defaults = [
    ['D01', 'shadcn-style theme variables', ['--radius', '--primary', '--muted-foreground', '--ring'].filter((v) => rootCs.getPropertyValue(v).trim()).length >= 3],
    ['D02', 'Lucide icons', !!document.querySelector('svg[class*="lucide"]')],
    ['D03', 'no font chosen (system default stack)', /^(ui-sans-serif|system-ui|-apple-system|blinkmacsystemfont|segoe ui|sans-serif|arial|helvetica)/.test(bodyFace)],
    ['D04', 'Inter', Object.keys(fonts).some((f) => /^inter\b/i.test(f))],
    ['D05', 'headline weight 700 or more', !!h1r && +h1rcs.fontWeight >= 700],
    ['D06', 'centered headline', !!h1r && h1rcs.textAlign === 'center'],
    ['D07', 'body text under 16 px', bodySize > 0 && bodySize < 16],
    ['D08', 'badge above the headline', badge],
    ['D09', 'no reduced-motion rule', !reducedMotionRule],
  ].map(([id, name, present]) => ({ id, name, present }));

  return {
    viewport: [innerWidth, innerHeight], url: location.href, prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
    sprawl, sprawlOver: sprawl.filter((s) => s.over).length, counts,
    defaults, defaultsPresent: defaults.filter((d) => d.present).length, ingredients,
    families: top(fonts, 8), sizes: sizeList, bodySize,
    weights: Object.keys(weights).map(Number).sort((a, b) => a - b), textColors: count(colors), topTextColors: top(colors, 6), hues: hueList,
    headings: headings.length, headingStyles: Object.keys(headingStyles), leftEdges: count(lefts),
    h1: h1 ? { text: h1.innerText.trim().slice(0, 80), size: Math.round(px(h1cs.fontSize)), weight: +h1cs.fontWeight, family: first(h1cs.fontFamily), centered: h1cs.textAlign === 'center' } : null,
    words,
    faces, facesNotLoaded: faces.filter((f) => !f.webFont).map((f) => f.family),
    lowContrastShare: chars ? +(lowChars / chars).toFixed(3) : 0, lowContrast: low,
    controls, under24Count: n24, under24: small, under44Count: n44, under44: touch,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1, reducedMotionRule,
  };
})()
