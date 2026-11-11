#!/usr/bin/env node
// Lists public pages hosted on AI site builders' own publish domains. The hostname is the evidence
// that a page was AI-built. Sources: Hacker News search (Algolia) and urlscan.io public search.
// Zero dependencies, no model.
//
//   node research/find-ai-pages.mjs <out.csv> [--per 50] [--start 301]

import { writeFileSync } from 'node:fs';

const BUILDERS = { lovable: 'lovable.app', bolt: 'bolt.host', replit: 'replit.app', base44: 'base44.app' };
// Hosts that are the builder's own pages or previews behind a login, not user sites.
const SKIP = /^(www|app|api|docs|preview--|id-preview--|auth|login|staging|dev|test|cdn|status|blog)/;

const args = process.argv.slice(2);
const out = args[0];
if (!out) { console.error('usage: find-ai-pages.mjs <out.csv> [--per 50] [--start 301]'); process.exit(2); }
const opt = (k, d) => (args.includes(k) ? +args[args.indexOf(k) + 1] : d);
const per = opt('--per', 50), start = opt('--start', 301);

const getJson = async (url) => {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 80)}`);
  return r.json();
};
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return null; } };

async function fromHackerNews(domain) {
  const hosts = new Set();
  for (let page = 0; page < 10; page++) {
    const j = await getJson(`https://hn.algolia.com/api/v1/search_by_date?query=${domain}&restrictSearchableAttributes=url&hitsPerPage=100&page=${page}`);
    for (const h of j.hits) { const host = hostOf(h.url); if (host && host.endsWith('.' + domain)) hosts.add(host); }
    if (page + 1 >= j.nbPages) break;
  }
  return hosts;
}

async function fromUrlscan(domain) {
  const hosts = new Set();
  let after = '';
  for (let page = 0; page < 5; page++) {
    const j = await getJson(`https://urlscan.io/api/v1/search/?q=${encodeURIComponent('page.domain:' + domain)}&size=100${after}`);
    for (const r of j.results || []) { const host = hostOf(r.page && r.page.url); if (host && host.endsWith('.' + domain)) hosts.add(host); }
    const last = (j.results || []).at(-1);
    if (!last || !j.has_more) break;
    after = '&search_after=' + last.sort.join(',');
  }
  return hosts;
}

const rows = [];
let n = start;
for (const [builder, domain] of Object.entries(BUILDERS)) {
  const found = {};
  for (const [name, fn] of [['hn', fromHackerNews], ['urlscan', fromUrlscan]]) {
    try { found[name] = [...await fn(domain)].filter((h) => !SKIP.test(h)).sort(); }
    catch (e) { found[name] = []; console.log(`${builder} ${name}: failed (${e.message})`); }
  }
  // Even spread across a sorted list, so the sample is not the first N alphabetically.
  const spread = (list, k) => { const step = Math.max(1, list.length / k); return [...new Set(Array.from({ length: Math.min(k, list.length) }, (_, i) => list[Math.floor(i * step)]))]; };
  // urlscan is a security scanner, so its hosts include phishing pages. Use it only to fill what Hacker News lacks.
  const hn = spread(found.hn, per);
  const fill = spread(found.urlscan.filter((h) => !found.hn.includes(h)), per - hn.length);
  for (const [list, src] of [[hn, 'hacker news'], [fill, 'urlscan']])
    for (const h of list) rows.push([n++, 'unknown', builder, h.split('.')[0].replace(/,/g, ' '), `https://${h}`, src].join(','));
  console.log(`${builder}: hn ${found.hn.length}, urlscan ${found.urlscan.length}, picked ${hn.length} + ${fill.length}`);
}
writeFileSync(out, 'n,surface,category,name,url,source_type\n' + rows.join('\n') + '\n');
console.log(`wrote ${rows.length} rows to ${out}`);
