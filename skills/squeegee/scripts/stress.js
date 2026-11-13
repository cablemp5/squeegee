// squeegee worst-case content test: one expression. Evaluate this whole file in the page with a browser tool,
// after measure.js and the before images. It swaps the text of repeated items (cards, rows, list entries: the
// parts a page fills from data) for worst-case content, in the live page only, then reports what broke.
// No file changes. The page keeps the test content until it reloads: save an image, then reload.
(() => {
  const LONG = 'Wolfeschlegelsteinhausenbergerdorff';   // one unbroken 35-letter word, a real surname
  const FIXED = 'nav,footer,h1,h2,h3,h4,h5,h6,button,[role=button],label,th,legend,summary,option,svg,script,style,noscript,template';   // fixed copy, not data
  const root = document.documentElement;
  const name = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');

  // Repeated items: three or more siblings that share a tag and a class list.
  const items = new Set();
  for (const parent of document.body.querySelectorAll('*')) {
    if (parent.childElementCount < 3) continue;
    const groups = {};
    for (const c of parent.children) (groups[`${c.tagName} ${c.className}`] ||= []).push(c);
    for (const g of Object.values(groups)) if (g.length >= 3) for (const c of g) items.add(c);
  }
  const inItem = (el) => { for (let e = el; e; e = e.parentElement) if (items.has(e)) return true; return false; };

  // Boxes whose content does not fit: text painted outside its box, or cut off with no ellipsis.
  const broken = () => {
    const out = new Map();
    let seen = 0;
    for (const el of document.body.querySelectorAll('*')) {
      if (seen >= 6000) break;
      if (!el.clientWidth || !el.clientHeight) continue;
      seen++;
      const wide = el.scrollWidth > el.clientWidth + 1, tall = el.scrollHeight > el.clientHeight + 1;
      if (!wide && !tall) continue;
      const cs = getComputedStyle(el);
      const clipX = /hidden|clip/.test(cs.overflowX), clipY = /hidden|clip/.test(cs.overflowY);
      const clamp = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
      if (wide && cs.overflowX === 'visible') out.set(el, 'text spills out of its box');
      else if ((wide && clipX && cs.textOverflow !== 'ellipsis') || (tall && clipY && !clamp)) out.set(el, 'text is cut off with no ellipsis');
    }
    return out;
  };

  const width = innerWidth;   // read now: on a phone the layout viewport grows with content that overflows
  const before = broken(), overflowBefore = root.scrollWidth > width + 1;
  const was = new Map();
  let stressed = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let n = walker.nextNode(); n && nodes.length < 3000; n = walker.nextNode()) nodes.push(n);
  for (const n of nodes) {
    const t = n.nodeValue.trim(), p = n.parentElement;
    if (!t || !p || p.closest(FIXED) || !inItem(p) || !p.getClientRects().length) continue;
    if (!was.has(p)) was.set(p, t.slice(0, 40));
    n.nodeValue = /^[\d.,%$€£+\-\s]+$/.test(t) ? t.replace(/\d[\d.,]*/, '9,999,999,999')   // a count or an amount
      : t.length <= 40 ? `${t} ${LONG} ${t}`                                                  // a name, a title, a tag
      : `${t} ${t} ${t}`;                                                                     // a description, three times as long
    stressed++;
  }

  const after = broken(), found = [];
  const fresh = [...after.keys()].filter((el) => !before.has(el));
  for (const [el, what] of after) {
    // Report the innermost box only: its ancestors overflow for the same reason.
    if (before.has(el) || found.length >= 20 || fresh.some((o) => o !== el && el.contains(o))) continue;
    const r = el.getBoundingClientRect(), src = [...was].find(([p]) => el === p || el.contains(p));
    found.push({ what, element: name(el), box: `${Math.round(r.width)}x${Math.round(r.height)}`, was: src ? src[1] : null });
  }
  const pageOverflow = root.scrollWidth > width + 1 || innerWidth > width + 1;
  if (pageOverflow && !overflowBefore) {   // name the deepest element that reaches past the right edge
    const past = [...document.body.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > width + 1);
    const deepest = past.filter((el) => !past.some((o) => o !== el && el.contains(o))).slice(0, 3);
    for (const el of deepest) found.unshift({ what: 'the page scrolls sideways', element: name(el), box: `${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`, was: (was.get(el) || el.innerText || '').slice(0, 40) });
  }
  return { viewport: [width, innerHeight], url: location.href, items: items.size, stressed, pageOverflowBefore: overflowBefore, pageOverflow, broken: found,
    note: stressed ? 'The page now shows the test content. Save an image, then reload it.' : 'No repeated items with text were found, so nothing was tested.' };
})()
