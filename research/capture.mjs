#!/usr/bin/env node
// Measures real pages: loads each URL in headless Chrome over the DevTools protocol,
// reads computed styles, writes one JSON line per page and viewport, saves a screenshot.
// Zero dependencies: needs Node 22+ (built-in WebSocket and fetch) and an installed Chrome.
//
//   node research/capture.mjs <sites.csv> <outDir> [--limit N] [--only 1,2,3] [--jobs 4] [--no-shots] [--scripts a.js,b.js]
//
// --scripts evaluates extra page scripts after the measurements, in order, and stores each result under the
// script's file name (measure.js becomes row.measure). Use it to run the skill's own measure.js and stress.js.
//
// CSV header: n,surface,category,name,url,source_type

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900, mobile: false },
  { key: 'phone', width: 390, height: 844, mobile: true },
];
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const NAV_TIMEOUT_MS = 30000;
const PORT = 9333;

// Runs inside the page. Returns plain data only.
function extract() {
  const add = (m, k, v = 1) => { m[k] = (m[k] || 0) + v; };
  const top = (m, n = 6) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
  const vw = innerWidth, vh = innerHeight;

  // Canvas normalizes any CSS color (oklch, color(), named) to rgba bytes.
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const colorCache = new Map();
  const rgba = (s) => {
    if (colorCache.has(s)) return colorCache.get(s);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000'; ctx.fillStyle = s; ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const out = [d[0], d[1], d[2], d[3] / 255];
    colorCache.set(s, out);
    return out;
  };
  const hex = ([r, g, b]) => '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  const hsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
  };
  const lum = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c[3] > 0.5) return c;
    }
    return [255, 255, 255, 1];
  };
  const px = (s) => parseFloat(s) || 0;
  const family = (s) => s.split(',')[0].trim().replace(/^["']|["']$/g, '');

  const fonts = {}, headingFonts = {}, sizes = {}, weights = {}, textColors = {};
  let chars = 0, lowContrastChars = 0, tinyChars = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(), i = 0; n && i < 4000; n = walker.nextNode()) {
    const len = n.nodeValue.trim().length;
    const p = n.parentElement;
    if (!len || !p || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName)) continue;
    const r = p.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    i++;
    const cs = getComputedStyle(p);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const fam = family(cs.fontFamily), size = Math.round(px(cs.fontSize));
    add(fonts, fam, len); add(sizes, size, len); add(weights, cs.fontWeight, len);
    if (p.closest('h1,h2,h3')) add(headingFonts, fam, len);
    const fg = rgba(cs.color);
    add(textColors, hex(fg), len);
    chars += len;
    if (size < 12) tinyChars += len;
    const ratio = contrast(fg, bgOf(p));
    if (ratio < (size >= 24 ? 3 : 4.5)) lowContrastChars += len;
  }

  const radii = {}, durations = {}, gaps = {}, cardPads = {}, hues = {}, accents = {}, shadows = {};
  let gradients = 0, bigGradients = 0, gradientText = 0, glass = 0, shadowCount = 0, transAll = 0,
    animated = 0, leftStripe = 0, trackedCaps = 0, interactive = 0, smallTargets = 0, filledButtons = 0,
    threeCards = 0, bento = 0, cardsInCards = 0, seen = 0;
  const isCard = (cs, r) => r.width > 120 && r.height > 80 && r.width < vw * 0.9 &&
    (px(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none') && px(cs.borderTopLeftRadius) > 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (seen >= 6000) break;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    seen++;
    const cs = getComputedStyle(el);
    const area = r.width * r.height;
    const bg = rgba(cs.backgroundColor);
    const hasBox = bg[3] > 0.05 || px(cs.borderTopWidth) > 0;
    if (cs.backgroundImage.includes('gradient')) {
      gradients++;
      if (area > vw * vh * 0.2) bigGradients++;
      if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') gradientText++;
    }
    if (cs.backdropFilter && cs.backdropFilter !== 'none') glass++;
    if (cs.boxShadow !== 'none') { shadowCount++; add(shadows, cs.boxShadow.slice(0, 80)); }
    if (hasBox && area > 400) add(radii, Math.min(Math.round(px(cs.borderTopLeftRadius)), 999));
    const dur = Math.round(parseFloat(cs.transitionDuration) * 1000);
    if (dur > 0) { add(durations, dur); if (cs.transitionProperty.split(',').some((p) => p.trim() === 'all')) transAll++; }
    if (cs.animationName !== 'none') animated++;
    if ((cs.display.includes('grid') || cs.display.includes('flex')) && px(cs.rowGap || cs.gap) > 0) add(gaps, Math.round(px(cs.rowGap || cs.gap)));
    if (px(cs.borderLeftWidth) >= 3 && px(cs.borderTopWidth) <= 1 && px(cs.borderRightWidth) <= 1 && r.height > 40) leftStripe++;
    if (cs.textTransform === 'uppercase' && px(cs.fontSize) <= 13 && px(cs.letterSpacing) >= px(cs.fontSize) * 0.05 && el.childElementCount === 0) trackedCaps++;
    if (bg[3] > 0.5) { const [h, s] = hsl(bg); if (s > 0.35) add(hues, Math.round(h / 30) * 30 % 360, area); }
    if (isCard(cs, r)) {
      add(cardPads, Math.round(px(cs.paddingTop)));
      const parentCard = el.parentElement && el.parentElement.closest('*');
      for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
        if (isCard(getComputedStyle(e), e.getBoundingClientRect())) { cardsInCards++; break; }
      }
    }
    if (el.matches('a[href],button,[role=button],input:not([type=hidden]),select,textarea,summary')) {
      interactive++;
      if (Math.min(r.width, r.height) < 24) smallTargets++;
      if (bg[3] > 0.5 && el.matches('a,button,[role=button]')) {
        filledButtons++;
        if (hsl(bg)[1] > 0.35) add(accents, hex(bg));
      }
    }
    if (cs.display.includes('grid') || cs.display.includes('flex')) {
      const kids = [...el.children].filter((k) => k.getBoundingClientRect().width > 0);
      if (kids.length === 3) {
        const w = kids.map((k) => k.getBoundingClientRect().width);
        if (w[0] > 200 && Math.abs(w[0] - w[1]) < 3 && Math.abs(w[1] - w[2]) < 3 &&
          kids.every((k) => k.querySelector('svg,img') && k.querySelector('h2,h3,h4,strong,p'))) threeCards++;
      }
      if (cs.display.includes('grid') && kids.length >= 4) {
        const spans = new Set(kids.map((k) => { const c = getComputedStyle(k); return c.gridColumnEnd + '/' + c.gridRowEnd; }));
        if (spans.size >= 2 && [...spans].some((s) => s.includes('span'))) bento++;
      }
    }
  }

  const h1 = document.querySelector('h1');
  let h1Info = null, badgeAboveH1 = false;
  if (h1) {
    const cs = getComputedStyle(h1), r = h1.getBoundingClientRect();
    h1Info = {
      text: h1.innerText.trim().slice(0, 140), words: h1.innerText.trim().split(/\s+/).length,
      size: Math.round(px(cs.fontSize)), weight: cs.fontWeight, family: family(cs.fontFamily),
      tracking: +(px(cs.letterSpacing) / px(cs.fontSize)).toFixed(3),
      leading: +(px(cs.lineHeight) / px(cs.fontSize)).toFixed(2) || null,
      centered: cs.textAlign === 'center', top: Math.round(r.top),
    };
    for (let e = h1, hops = 0; e && hops < 3 && !badgeAboveH1; e = e.parentElement, hops++) {
      const prev = e.previousElementSibling;
      if (!prev) continue;
      for (const c of [prev, ...prev.querySelectorAll('*')].slice(0, 12)) {
        const s = getComputedStyle(c), b = c.getBoundingClientRect();
        if (b.height > 0 && b.height < 44 && b.width < 420 && px(s.borderTopLeftRadius) >= b.height / 2 - 1 &&
          (rgba(s.backgroundColor)[3] > 0.05 || px(s.borderTopWidth) > 0) && c.innerText && c.innerText.trim().length > 2) { badgeAboveH1 = true; break; }
      }
    }
  }

  const text = document.body.innerText || '';
  const headingText = [...document.querySelectorAll('h1,h2,h3,h4,button,nav a,[role=button]')].map((e) => e.innerText || '').join('\n');
  const buzz = ['seamless', 'supercharge', 'unlock', 'revolutioni', 'effortless', 'elevate', 'empower', 'cutting-edge', 'next-generation',
    'game-chang', 'all-in-one', 'unleash', 'transform your', 'streamline', 'robust', 'leverage', 'powerful', 'blazing', 'reimagin', 'magic'];
  const lower = text.toLowerCase();
  const sections = [...document.querySelectorAll('main > section, main > div, body > section, body > div > section, section')].filter((s) => s.getBoundingClientRect().height > 200);
  const sectionPads = {};
  for (const s of sections.slice(0, 40)) add(sectionPads, Math.round(px(getComputedStyle(s).paddingTop)));
  const rootCs = getComputedStyle(document.documentElement);
  const classed = [...document.querySelectorAll('[class]')].slice(0, 400);
  const twHits = classed.filter((e) => /(^|\s)(px|py|mt|mb|gap|flex|grid|text|bg|rounded|items|justify)-/.test(String(e.className))).length;
  const pageBg = bgOf(document.body);
  const hueList = top(hues, 12);
  const hueTotal = hueList.reduce((a, [, v]) => a + v, 0) || 1;

  return {
    title: document.title.slice(0, 120),
    pageBg: hex(pageBg), dark: lum(pageBg) < 0.2, pureWhite: hex(pageBg) === '#ffffff', pureBlack: hex(pageBg) === '#000000',
    pageHeights: +(document.documentElement.scrollHeight / vh).toFixed(1),
    fonts: top(fonts, 4), headingFonts: top(headingFonts, 3), familyCount: Object.keys(fonts).length,
    sizes: top(sizes, 8), sizeCount: Object.keys(sizes).length, weights: top(weights, 5),
    bodySize: +(top(sizes, 1)[0] || [0])[0], textColors: top(textColors, 4),
    lowContrastShare: chars ? +(lowContrastChars / chars).toFixed(3) : 0, tinyTextShare: chars ? +(tinyChars / chars).toFixed(3) : 0,
    hues: hueList.filter(([, v]) => v / hueTotal > 0.03).map(([h, v]) => [+h, +(v / hueTotal).toFixed(2)]),
    accents: top(accents, 3), radii: top(radii, 6), cardPads: top(cardPads, 4), gaps: top(gaps, 6), sectionPads: top(sectionPads, 4),
    gradients, bigGradients, gradientText, glass, shadowCount, shadows: top(shadows, 3),
    durations: top(durations, 5), transAll, animated,
    leftStripe, trackedCaps, threeCards, bento, cardsInCards, badgeAboveH1,
    interactive, smallTargets, filledButtons,
    navLinks: [...document.querySelectorAll('header nav a, nav a')].filter((a) => a.getBoundingClientRect().width > 0).length,
    sections: sections.length, h1: h1Info, h1Count: document.querySelectorAll('h1').length,
    svgs: document.querySelectorAll('svg').length, lucide: document.querySelectorAll('svg[class*="lucide"]').length,
    imgs: document.querySelectorAll('img,picture,video').length,
    emojiInLabels: (headingText.match(/\p{Extended_Pictographic}/gu) || []).length,
    emDashes: (text.match(/\u2014/g) || []).length, exclaims: (text.match(/!/g) || []).length,
    words: text.split(/\s+/).length, buzz: buzz.filter((b) => lower.includes(b)),
    checkmarkItems: [...document.querySelectorAll('li')].filter((li) => /^[\u2713\u2714\u2705]/.test(li.innerText.trim()) || li.querySelector('svg[class*="check"]')).length,
    passwordFields: document.querySelectorAll('input[type=password]').length,
    generator: (document.querySelector('meta[name=generator]') || {}).content || null,
    next: !!document.querySelector('#__next, script#__NEXT_DATA__, script[src*="/_next/"]'),
    tailwindShare: classed.length ? +(twHits / classed.length).toFixed(2) : 0,
    shadcnVars: ['--radius', '--primary', '--muted-foreground', '--ring'].filter((v) => rootCs.getPropertyValue(v).trim()).length,
    reducedMotionRule: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => r.conditionText && r.conditionText.includes('prefers-reduced-motion')); } catch { return false; } }),
  };
}

function parseArgs(argv) {
  const [csv, outDir, ...rest] = argv;
  if (!csv || !outDir) { console.error('usage: capture.mjs <sites.csv> <outDir> [--limit N] [--only 1,2] [--jobs 4] [--no-shots] [--scripts a.js,b.js]'); process.exit(2); }
  const opt = { csv, outDir: resolve(outDir), limit: Infinity, only: null, jobs: 4, shots: true, scripts: [] };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--limit') opt.limit = +rest[++i];
    else if (rest[i] === '--only') opt.only = new Set(rest[++i].split(','));
    else if (rest[i] === '--jobs') opt.jobs = +rest[++i];
    else if (rest[i] === '--no-shots') opt.shots = false;
    else if (rest[i] === '--scripts') opt.scripts = rest[++i].split(',').map((p) => ({ key: p.split(/[\\/]/).pop().replace(/\.\w+$/, ''), src: readFileSync(p, 'utf8') }));
  }
  return opt;
}

function readSites(path) {
  const [head, ...lines] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const keys = head.split(',');
  // A list without an n column (such as reference-sites.csv) is numbered by row, so screenshot names stay unique.
  return lines.filter(Boolean).map((l, row) => { const s = Object.fromEntries(l.split(',').map((v, i) => [keys[i], v.trim()])); s.n ||= String(row + 1); return s; });
}

function findChrome() {
  const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
  const hit = c.find(existsSync);
  if (!hit) throw new Error('No Chrome found. Set CHROME_PATH.');
  return hit;
}

async function waitForChrome() {
  for (let i = 0; i < 100; i++) {
    try { return await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('Chrome did not open its debugging port');
}

class Tab {
  static async open() {
    const info = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
    const tab = new Tab(info.id);
    tab.ws = new WebSocket(info.webSocketDebuggerUrl);
    await new Promise((ok, bad) => { tab.ws.onopen = ok; tab.ws.onerror = () => bad(new Error('ws failed')); });
    tab.ws.onclose = tab.ws.onerror = () => { for (const { bad } of tab.pending.values()) bad(new Error('tab connection closed')); tab.pending.clear(); };
    tab.ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && tab.pending.has(msg.id)) { const { ok, bad } = tab.pending.get(msg.id); tab.pending.delete(msg.id); msg.error ? bad(new Error(msg.error.message)) : ok(msg.result); }
      else if (msg.method) for (const fn of tab.listeners) fn(msg);
    };
    return tab;
  }
  constructor(id) { this.id = id; this.seq = 0; this.pending = new Map(); this.listeners = new Set(); }
  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((ok, bad) => {
      const t = setTimeout(() => { this.pending.delete(id); bad(new Error(`${method} timed out`)); }, NAV_TIMEOUT_MS + 15000);
      this.pending.set(id, { ok: (v) => { clearTimeout(t); ok(v); }, bad: (e) => { clearTimeout(t); bad(e); } });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  // Resolves on the first matching event, or with null at the timeout.
  until(test, ms) {
    return new Promise((ok) => {
      const fn = (msg) => { if (test(msg)) { done(msg); } };
      const t = setTimeout(() => done(null), ms);
      const done = (v) => { clearTimeout(t); this.listeners.delete(fn); ok(v); };
      this.listeners.add(fn);
    });
  }
  async close() { try { this.ws.close(); await fetch(`http://127.0.0.1:${PORT}/json/close/${this.id}`); } catch {} }
}

async function capture(site, vp, opt) {
  const tab = await Tab.open();
  const row = { n: site.n, surface: site.surface, category: site.category, name: site.name, url: site.url, viewport: vp.key };
  try {
    await tab.send('Page.enable');
    await tab.send('Page.setLifecycleEventsEnabled', { enabled: true });
    await tab.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    if (vp.mobile) await tab.send('Emulation.setUserAgentOverride', { userAgent: PHONE_UA });
    const idle = tab.until((m) => m.method === 'Page.lifecycleEvent' && m.params.name === 'networkIdle', NAV_TIMEOUT_MS);
    const nav = await tab.send('Page.navigate', { url: site.url });
    if (nav.errorText) throw new Error(nav.errorText);
    row.timedOut = (await idle) === null;
    const res = await tab.send('Runtime.evaluate', {
      expression: `document.fonts.ready.then(() => (${extract.toString()})())`, returnByValue: true, awaitPromise: true,
    });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description?.slice(0, 200) || 'extract failed');
    Object.assign(row, res.result.value);
    for (const sc of opt.scripts) {   // a script that fails leaves its key null and the row stays usable
      try { const r2 = await tab.send('Runtime.evaluate', { expression: sc.src, returnByValue: true }); row[sc.key] = r2.exceptionDetails ? null : r2.result.value; } catch { row[sc.key] = null; }
    }
    if (opt.shots) {
      const shot = await tab.send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
      writeFileSync(join(opt.outDir, 'shots', `${site.n}-${vp.key}.jpg`), Buffer.from(shot.data, 'base64'));
    }
  } catch (e) {
    row.error = String(e.message || e).slice(0, 200);
  } finally {
    await tab.close();
  }
  return row;
}

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  let sites = readSites(opt.csv);
  if (opt.only) sites = sites.filter((s) => opt.only.has(s.n));
  sites = sites.slice(0, opt.limit);
  mkdirSync(join(opt.outDir, 'shots'), { recursive: true });
  const outFile = join(opt.outDir, 'measurements.jsonl');
  // analyze.mjs counts every row, so appending a second run would duplicate the sample.
  if (existsSync(outFile)) { console.error(`${outFile} already exists. Pick a fresh output folder.`); process.exit(2); }
  const profile = join(opt.outDir, 'chrome-profile');
  const chrome = spawn(findChrome(), ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--disable-extensions', '--hide-scrollbars', '--mute-audio', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  let failed = 0;
  try {
    await waitForChrome();
    const queue = sites.flatMap((s) => VIEWPORTS.map((vp) => [s, vp]));
    let done = 0;
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const row = await capture(job[0], job[1], opt);
        appendFileSync(outFile, JSON.stringify(row) + '\n');
        if (row.error) failed++;
        console.log(`${++done}/${sites.length * VIEWPORTS.length} ${row.error ? 'FAIL' : 'ok  '} ${row.n} ${row.viewport} ${row.name}${row.error ? ' :: ' + row.error : ''}`);
      }
    };
    await Promise.all(Array.from({ length: opt.jobs }, worker));
  } finally {
    const running = chrome.exitCode === null && chrome.signalCode === null;
    chrome.kill();
    if (running) await new Promise((r) => chrome.once('exit', r));
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
  console.log(`done: ${sites.length} sites, ${failed} failed captures, results in ${outFile}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
