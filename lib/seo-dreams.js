/* Swapna Shastra (dream meanings): a hub page and one page per dream, in every language. Text: lib/dreams/<lang>.js */
const S = require('./site.js');
const SP = require('./seo-pages.js');
const LIST = require('./dreams/index.js');
const { esc } = S;
const { H, pageObj } = SP;
const CATS = ['divine', 'animals', 'nature', 'people', 'things', 'events'];
const TEXT = {};
const text = lang => TEXT[lang] || (TEXT[lang] = (() => { try { return require('./dreams/' + lang + '.js'); } catch (e) { return require('./dreams/en.js'); } })());
const toneTag = (h, tone) => `<span class="tag ${tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : 'gold'}">${esc(h.t('seo.dr.tone.' + tone))}</span>`;
const crumbs = (name, slug) => [{ name: L2 => L2.seo.dr.hubCrumb, slug: 'dreams/' }, { name, slug }];

function dreamPage(lang, [slug, cat, tone]) {
  const h = H(lang), { t } = h, T = text(lang), [name, meaning, advice] = T[slug] || require('./dreams/en.js')[slug];
  const rel = LIST.filter(d => d[1] === cat && d[0] !== slug).map(d => h.link(`dreams/${d[0]}/`, (T[d[0]] || [])[0] || d[0]));
  const faq = [
    { q: t('seo.dr.fq1', { d: name }), a: t('seo.dr.fa1.' + tone, { d: name }) + ' ' + meaning },
    { q: t('seo.dr.fq2'), a: t('seo.dr.fa2') }
  ];
  const h1 = t('seo.dr.pageH1', { d: name }), path = `dreams/${slug}/`;
  const body = `<main class="wrap page article seo-page">${h.crumbsHtml([{ name: t('seo.dr.hubCrumb'), slug: 'dreams/' }, { name: h1 }])}
  <div class="article-head"><div><p class="eyebrow">${esc(t('seo.dr.eye'))} · ${esc(t('seo.dr.cat.' + cat))}</p><h1>${esc(h1)}</h1><p class="lede">${toneTag(h, tone)}</p></div></div>
  <div class="card prose"><h2>${esc(t('seo.dr.meaningH'))}</h2><p>${esc(meaning)}</p><h2>${esc(t('seo.dr.doH'))}</h2><p>${esc(advice)}</p><p class="muted small">${esc(t('seo.dr.note'))}</p></div>
  ${h.cta(t('seo.dr.cta'), '', t('seo.dr.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.dr.relatedH', { c: t('seo.dr.cat.' + cat) }), rel)}
  ${h.linkrow(t('seo.dr.allH'), [h.link('dreams/', t('seo.dr.hubCrumb'), 'tag gold')])}</main>`;
  return pageObj(h, { id: 'dream', slug: path, article: true, title: t('seo.dr.pageTitle', { d: name }), desc: t('seo.dr.pageDesc', { d: name, m: meaning.split(/(?<=[.!?।])\s/)[0] }).slice(0, 300), h1, body, faq, priority: '0.6', crumbs: crumbs(L2 => S.tr(L2, 'seo.dr.pageH1', { d: (text(L2.meta.code)[slug] || [slug])[0] }), path) });
}

function dreamsHub(lang) {
  const h = H(lang), { t } = h, T = text(lang);
  const groups = CATS.map(c => `<section class="dr-cat"><h2 class="sub-h">${esc(t('seo.dr.cat.' + c))}</h2><div class="dr-grid">${LIST.filter(d => d[1] === c).map(([slug, , tone]) => `<a class="card dr-item ${tone}" href="${h.base}dreams/${slug}/"><b>${esc((T[slug] || [slug])[0])}</b>${toneTag(h, tone)}</a>`).join('')}</div></section>`).join('');
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.dr.hubCrumb') }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.dr.eye'))}</p><h1>${esc(t('seo.dr.hubH1'))}</h1><p class="lede">${esc(t('seo.dr.hubLede'))}</p></div>
  ${groups}
  <div class="card prose"><h2>${esc(t('seo.dr.aboutH'))}</h2><p>${esc(t('seo.dr.about1'))}</p><p>${esc(t('seo.dr.about2'))}</p></div>
  ${h.cta(t('seo.dr.cta'), '', t('seo.dr.ctaBtn'))}</main>`;
  return pageObj(h, { id: 'dreams', slug: 'dreams/', title: t('seo.dr.hubTitle'), desc: t('seo.dr.hubDesc'), h1: t('seo.dr.hubH1'), body, priority: '0.7', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.dr.hubCrumb, slug: 'dreams/' }] });
}

function dreamPages(lang) { return [dreamsHub(lang), ...LIST.map(d => dreamPage(lang, d))]; }
module.exports = { dreamPages };
