/* Famous charts: birth chart, source and rating, and the dasha running at each well-known life event. */
const S = require('./site.js');
const SP = require('./seo-pages.js');
const J = require('./engine.js');
const LIST = require('./celebs.js');
const { esc, gimg } = S;
const { H, pageObj } = SP;
const PL = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const crumbs = (name, slug) => [{ name: L2 => L2.seo.cel.hubCrumb, slug: 'famous-charts/' }, { name, slug }];
const dashaAt = (c, ms) => { const md = c.dashas.find(m => m.start <= ms && ms < m.end), ad = md && md.sub.find(a => a.start <= ms && ms < a.end); return md ? [md.lord, ad && ad.lord] : [null, null]; };

function celebPage(lang, P) {
  const h = H(lang), { t, L, gr, rashi, nak } = h, c = J.compute(P.birth);
  const name = t('seo.cel.p.' + P.slug + '.name'), role = t('seo.cel.p.' + P.slug + '.role');
  const b = P.birth, pad = n => String(n).padStart(2, '0');
  const dateStr = h.fDate.format(new Date(Date.UTC(b.year, b.month - 1, b.day)));
  const facts = [
    [t('seo.cel.born'), `${esc(dateStr)}, ${pad(b.hour)}:${pad(b.minute)} ${esc(b.lmt ? t('seo.cel.lmt') : 'IST')}`],
    [t('seo.cel.place'), esc(t('seo.cel.pl.' + P.place))],
    [t('seo.cel.source'), `${esc(t('seo.cel.src.' + P.src))} · <span class="tag ${P.rating === 'AA' || P.rating === 'A' ? 'good' : P.rating === 'B' ? 'gold' : 'bad'}">${esc(t('seo.cel.rating', { r: P.rating }))}</span>`],
    [t('seo.cel.lagna'), `${esc(rashi(c.lagna.sign))} ${c.lagna.deg.toFixed(1)}°`],
    [t('seo.cel.moon'), `${esc(rashi(c.P.Moon.sign))} · ${esc(nak(c.P.Moon.nak))} ${c.P.Moon.pada}`]
  ];
  const planets = PL.map(p => { const x = c.P[p]; return `<tr><td>${gimg(p, 'gimg sm')} ${esc(gr(p))}</td><td>${esc(rashi(x.sign))} ${x.deg.toFixed(1)}°${x.retro && !['Rahu', 'Ketu'].includes(p) ? ' ℞' : ''}</td><td class="num">${x.house}</td><td>${esc(nak(x.nak))}</td></tr>`; }).join('');
  const events = P.events.map(([d, k]) => {
    const [y, m, dd] = d.split('-').map(Number), ms = Date.UTC(y, m - 1, dd, 6), [md, ad] = dashaAt(c, ms);
    const tr = J.transit(ms / 864e5 + 2440587.5).lon, js = Math.floor(tr.Jupiter / 30), ss = Math.floor(tr.Saturn / 30);
    const hJ = (js - c.lagna.sign + 12) % 12 + 1, hS = (ss - c.lagna.sign + 12) % 12 + 1;
    return `<tr><td class="num">${esc(h.fDate.format(new Date(ms)))}</td><td>${esc(t('seo.cel.ev.' + k))}</td><td>${md ? `${gimg(md, 'gimg sm')} ${esc(gr(md))}–${esc(gr(ad))}` : ''}</td><td class="small">${esc(t('seo.cel.trLine', { j: gr('Jupiter'), a: hJ, s: gr('Saturn'), b: hS }))}</td></tr>`;
  }).join('');
  const others = LIST.filter(x => x.slug !== P.slug).map(x => h.link(`famous-charts/${x.slug}/`, t('seo.cel.p.' + x.slug + '.name')));
  const h1 = t('seo.cel.pageH1', { n: name }), path = `famous-charts/${P.slug}/`;
  const faq = [{ q: t('seo.cel.fq1', { n: name }), a: t('seo.cel.fa1', { n: name, l: rashi(c.lagna.sign), m: rashi(c.P.Moon.sign), k: nak(c.P.Moon.nak) }) }, { q: t('seo.cel.fq2', { n: name }), a: t('seo.cel.fa2', { r: P.rating, s: t('seo.cel.src.' + P.src) }) }];
  const body = `<main class="wrap page article seo-page">${h.crumbsHtml([{ name: t('seo.cel.hubCrumb'), slug: 'famous-charts/' }, { name }])}
  <div class="article-head"><div><p class="eyebrow">${esc(t('seo.cel.eye'))}</p><h1>${esc(h1)}</h1><p class="lede">${esc(role)}</p></div></div>
  ${SP.factTable(facts)}
  <h2 class="sub-h">${esc(t('seo.cel.eventsH'))}</h2><p class="muted">${esc(t('seo.cel.eventsLede'))}</p>
  <div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.cel.date'))}</th><th>${esc(t('seo.cel.event'))}</th><th>${esc(t('seo.cel.dasha'))}</th><th>${esc(t('seo.cel.transit'))}</th></tr></thead><tbody>${events}</tbody></table></div>
  <h2 class="sub-h">${esc(t('seo.cel.planetsH'))}</h2>
  <div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.cel.planet'))}</th><th>${esc(t('seo.cel.sign'))}</th><th class="num">${esc(t('seo.cel.house'))}</th><th>${esc(t('seo.cel.nak'))}</th></tr></thead><tbody>${planets}</tbody></table></div>
  <p class="muted small">${esc(t('seo.cel.note'))}</p>
  ${h.cta(t('seo.cel.cta'), '', t('seo.cel.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.cel.othersH'), others)}</main>`;
  return pageObj(h, { id: 'celeb', slug: path, article: true, title: t('seo.cel.pageTitle', { n: name }), desc: t('seo.cel.pageDesc', { n: name, l: rashi(c.lagna.sign), m: rashi(c.P.Moon.sign) }), h1, body, faq, priority: '0.6', crumbs: crumbs(L2 => S.tr(L2, 'seo.cel.p.' + P.slug + '.name'), path) });
}

function celebHub(lang) {
  const h = H(lang), { t, rashi } = h;
  const cards = LIST.map(P => { const c = J.compute(P.birth); return `<a class="card dr-item good" href="${h.base}famous-charts/${P.slug}/"><span><b>${esc(t('seo.cel.p.' + P.slug + '.name'))}</b><small class="muted" style="display:block">${esc(t('seo.cel.lagnaShort', { l: rashi(c.lagna.sign) }))}</small></span><span class="tag">${esc(P.rating)}</span></a>`; }).join('');
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.cel.hubCrumb') }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.cel.eye'))}</p><h1>${esc(t('seo.cel.hubH1'))}</h1><p class="lede">${esc(t('seo.cel.hubLede'))}</p></div>
  <div class="dr-grid">${cards}</div>
  <div class="card prose"><h2>${esc(t('seo.cel.ratingH'))}</h2><p>${esc(t('seo.cel.ratingText'))}</p></div>
  ${h.cta(t('seo.cel.cta'), '', t('seo.cel.ctaBtn'))}</main>`;
  return pageObj(h, { id: 'celebs', slug: 'famous-charts/', title: t('seo.cel.hubTitle'), desc: t('seo.cel.hubDesc'), h1: t('seo.cel.hubH1'), body, priority: '0.6', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.cel.hubCrumb, slug: 'famous-charts/' }] });
}
function celebPages(lang) { return [celebHub(lang), ...LIST.map(P => celebPage(lang, P))]; }
module.exports = { celebPages };
