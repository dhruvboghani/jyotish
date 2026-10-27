/* Numerology search pages (static, all six languages): Mulank 1–9, Bhagyank 1–9, number compatibility for every pair,
   Mulank predictions for this year and next, and two guides (mobile number, name numerology).
   The maths is src/js/numcore.js, the same file the browser calculator uses. */
const S = require('./site.js');
const NU = require('../src/js/numcore.js');
const SP = require('./seo-pages.js');

const { esc, list, gimg } = S;
const { H, pageObj, factTable, S_YEARS } = SP;
const N9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const sentence1 = s => String(s).split(/(?<=[.!?।])\s/)[0];
const datesOf = n => [n, n + 9, n + 18, n + 27].filter(d => d <= 31);
const lvTag = (h, lv) => `<span class="tag ${lv === 'excellent' || lv === 'good' ? 'good' : lv === 'difficult' ? 'bad' : ''}">${esc(h.t('nu.lv.' + lv + '.label'))}</span>`;
const fitTag = (h, f) => `<span class="tag ${f === 'best' || f === 'good' ? 'good' : f === 'avoid' ? 'bad' : ''}">${esc(h.t('seo.nu.toneL.' + f))}</span>`;
const pairSlug = (a, b) => { const [x, y] = a <= b ? [a, b] : [b, a]; return `numerology/compatibility/${x}-and-${y}/`; };
const SYM = { excellent: '★★', good: '★', average: '•', mixed: '±', difficult: '✕' };
const yearOfDigits = y => NU.reduce(NU.sumDigits(y));

// Crumbs: Numerology › page
const crumbs = (name, slug) => [{ name: L2 => L2.pages.numerology.name, slug: 'numerology/' }, { name, slug }];
function nuArticle(h, { eye, h1, lede, icon = '', html }) {
  return `<main class="wrap page article seo-page">${h.crumbsHtml([{ name: h.L.pages.numerology.name, slug: 'numerology/' }, { name: h1 }])}
  <div class="article-head">${icon}<div><p class="eyebrow">${esc(eye)}</p><h1>${esc(h1)}</h1>${lede ? `<p class="lede">${esc(lede)}</p>` : ''}</div></div>${html}</main>`;
}
const numIcon = n => `<span class="nu-badge" aria-hidden="true">${n}</span>`;
const calcCta = h => h.cta(h.t('seo.nu.calcCta'), 'numerology/', h.t('seo.nu.calcBtn'));
const gemLink = (h, n) => `<a href="${h.base}learn/${NU.GEM_SLUG[n]}-gemstone/">${esc(h.t('gm.g.' + NU.GEM[n]))}</a>`;

function nuLinks(h, { mu, bh, year } = {}) {
  const { t } = h, Y = S_YEARS();
  return h.linkrow(t('seo.nu.hubMu'), N9.map(n => n === mu ? `<span class="tag gold">${esc(t('seo.nu.muShort', { n }))}</span>` : h.link(`numerology/mulank-${n}/`, t('seo.nu.muShort', { n }))))
    + h.linkrow(t('seo.nu.hubBh'), N9.map(n => n === bh ? `<span class="tag gold">${esc(t('seo.nu.bhShort', { n }))}</span>` : h.link(`numerology/bhagyank-${n}/`, t('seo.nu.bhShort', { n }))))
    + h.linkrow(t('seo.nu.hubYr', { y: year || Y[0] }), N9.map(n => h.link(`numerology/mulank-${n}-${year || Y[0]}/`, t('seo.nu.yrShort', { n, y: year || Y[0] }))))
    + h.linkrow(t('seo.nu.hubGuides'), [h.link('numerology/', t('pages.numerology.name'), 'tag gold'), h.link('numerology/mobile-number/', t('seo.nu.mobH1')), h.link('numerology/name-numerology/', t('seo.nu.nmH1'))]);
}

function mulankPage(lang, n) {
  const h = H(lang), { t, L, gr } = h, N = L.nu.num[n], g = gr(NU.PLANET[n]);
  const dates = list(L, datesOf(n).map(String)), friends = NU.FRIEND[n], enemies = NU.ENEMY[n];
  const rows = N9.map(b => { const lv = NU.level(n, b); return `<tr><td><a href="${h.base}${pairSlug(n, b)}">${esc(t('seo.nu.cpShort', { a: n, b }))}</a></td><td>${lvTag(h, lv)}</td></tr>`; }).join('');
  const faq = [
    { q: t('seo.nu.muFq1', { n }), a: t('seo.nu.muFa1', { n, dates, g }) },
    { q: t('seo.nu.muFq2', { n }), a: t('seo.nu.muFa2', { n, list: list(L, friends.map(String)), avoid: enemies.length ? list(L, enemies.map(String)) : t('seo.nu.none') }) },
    { q: t('seo.nu.muFq3', { n }), a: t('seo.nu.muFa3', { n, c: N.color, d: L.names.vara[NU.DAY[n]], gem: t('gm.g.' + NU.GEM[n]) }) }
  ];
  const html = `${factTable([[t('seo.nu.bornOn'), esc(dates)], [t('seo.nu.ruler'), `${gimg(NU.PLANET[n], 'gimg sm')} ${esc(g)}`], [t('seo.nu.luckyNums'), esc(list(L, friends.map(String)))], [t('seo.nu.avoidNums'), esc(enemies.length ? list(L, enemies.map(String)) : t('seo.nu.none'))], [t('seo.nu.luckyDay'), esc(L.names.vara[NU.DAY[n]])], [t('seo.nu.luckyColor'), esc(N.color)], [t('seo.nu.gem'), gemLink(h, n)], [t('seo.nu.luckyDates'), esc(NU.luckyDates(friends).join(', '))]])}
  <div class="card prose"><h2>${esc(t('seo.nu.personalityH', { n }))}</h2><p>${esc(N.trait)}</p>
  <h2>${esc(t('seo.nu.strongH'))}</h2><p>${esc(N.strong)}</p><h2>${esc(t('seo.nu.weakH'))}</h2><p>${esc(N.weak)}</p>
  <h2>${esc(t('seo.nu.careerH'))}</h2><p>${esc(N.career)}</p><h2>${esc(t('seo.nu.loveH'))}</h2><p>${esc(N.love)}</p><h2>${esc(t('seo.nu.healthH'))}</h2><p>${esc(N.health)}</p></div>
  <h2 class="sub-h">${esc(t('seo.nu.compatH', { n }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.nu.number'))}</th><th>${esc(t('seo.nu.match'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
  ${calcCta(h)}
  ${h.faqHtml(faq)}
  ${nuLinks(h, { mu: n })}`;
  const h1 = t('seo.nu.muH1', { n, g }), slug = `numerology/mulank-${n}/`;
  return pageObj(h, { id: 'nu-mulank', slug, article: true, title: t('seo.nu.muTitle', { n }), desc: t('seo.nu.muDesc', { n, g, dates }), h1, body: nuArticle(h, { eye: t('seo.nu.eye'), h1, lede: sentence1(N.trait), icon: numIcon(n), html }), faq, priority: '0.7', crumbs: crumbs(L2 => S.tr(L2, 'seo.nu.muShort', { n }), slug) });
}

// A date whose digits reduce to n, written out step by step
function bhExample(n) {
  for (let d = 1; d <= 28; d++) {
    const ds = `${String(d).padStart(2, '0')}${'08'}${1995}`;
    if (NU.bhagyank(d, 8, 1995) !== n) continue;
    const chain = [ds.split('').join(' + ')]; let v = NU.sumDigits(ds); chain.push(String(v));
    while (v > 9) { const s = String(v).split('').join(' + '); v = NU.sumDigits(v); chain.push(`${s} = ${v}`); }
    return `${String(d).padStart(2, '0')}-08-1995: ${chain[0]} = ${chain.slice(1).join(' → ')}`;
  }
  return '';
}
function bhagyankPage(lang, n) {
  const h = H(lang), { t, L, gr } = h, N = L.nu.num[n], g = gr(NU.PLANET[n]), ex = bhExample(n);
  const rows = N9.map(m => { const lv = NU.level(n, m); return `<tr><td><a href="${h.base}numerology/mulank-${m}/">${esc(t('seo.nu.muShort', { n: m }))}</a></td><td>${lvTag(h, lv)}</td></tr>`; }).join('');
  const faq = [
    { q: t('seo.nu.bhFq1'), a: t('seo.nu.bhFa1', { ex }) },
    { q: t('seo.nu.bhFq2', { n }), a: N.destiny + ' ' + t('seo.nu.muFa2', { n, list: list(L, NU.FRIEND[n].map(String)), avoid: NU.ENEMY[n].length ? list(L, NU.ENEMY[n].map(String)) : t('seo.nu.none') }) },
    { q: t('seo.nu.bhFq3'), a: t('seo.nu.bhFa3') }
  ];
  const html = `${factTable([[t('seo.nu.ruler'), `${gimg(NU.PLANET[n], 'gimg sm')} ${esc(g)}`], [t('seo.nu.luckyNums'), esc(list(L, NU.FRIEND[n].map(String)))], [t('seo.nu.avoidNums'), esc(NU.ENEMY[n].length ? list(L, NU.ENEMY[n].map(String)) : t('seo.nu.none'))], [t('seo.nu.luckyDay'), esc(L.names.vara[NU.DAY[n]])], [t('seo.nu.luckyColor'), esc(N.color)], [t('seo.nu.gem'), gemLink(h, n)]])}
  <div class="card prose"><h2>${esc(t('seo.nu.bhMeaningH', { n }))}</h2><p>${esc(N.destiny)}</p><p>${esc(N.career)}</p>
  <h2>${esc(t('seo.nu.bhCalcH'))}</h2><p>${esc(t('seo.nu.bhCalc', { ex }))}</p></div>
  <h2 class="sub-h">${esc(t('seo.nu.bhWithH', { n }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('nu.mulank'))}</th><th>${esc(t('seo.nu.match'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="muted small">${esc(t('seo.nu.bhWithNote'))}</p>
  ${calcCta(h)}
  ${h.faqHtml(faq)}
  ${nuLinks(h, { bh: n })}`;
  const h1 = t('seo.nu.bhH1', { n }), slug = `numerology/bhagyank-${n}/`;
  return pageObj(h, { id: 'nu-bhagyank', slug, article: true, title: t('seo.nu.bhTitle', { n }), desc: t('seo.nu.bhDesc', { n, g }), h1, body: nuArticle(h, { eye: t('seo.nu.eye'), h1, lede: sentence1(N.destiny), icon: numIcon(n), html }), faq, priority: '0.7', crumbs: crumbs(L2 => S.tr(L2, 'seo.nu.bhShort', { n }), slug) });
}

function pairPage(lang, a, b) {
  const h = H(lang), { t, L, gr } = h, lv = NU.level(a, b), ga = gr(NU.PLANET[a]), gb = gr(NU.PLANET[b]);
  const lvl = t('nu.lv.' + lv + '.label'), love = t('nu.lv.' + lv + '.love'), work = t('nu.lv.' + lv + '.work');
  const each = [t('seo.nu.cpEach', { a, b, r: t('seo.nu.rel.' + NU.rel(a, b)) }), a !== b ? t('seo.nu.cpEach', { a: b, b: a, r: t('seo.nu.rel.' + NU.rel(b, a)) }) : ''].filter(Boolean).join(' ');
  const faq = [{ q: t('seo.nu.cpFq1', { a, b }), a: `${lvl}. ${love}` }, { q: t('seo.nu.cpFq2', { a, b }), a: t('seo.nu.cpFa2', { love }) }];
  const brings = [...new Set([a, b])].map(n => `<li><b>${esc(t('seo.nu.muShort', { n }))}</b> (${esc(gr(NU.PLANET[n]))}): ${esc(L.nu.num[n].kw)}. ${esc(sentence1(L.nu.num[n].love))}</li>`).join('');
  const html = `<div class="card seo-sum"><div><span class="eyebrow">${esc(t('seo.nu.cpVerdict'))}</span><p class="seo-big">${lvTag(h, lv)}</p></div><p>${esc(t('seo.nu.cpPlanets', { a, b, ga, gb }))} ${esc(each)}</p></div>
  <div class="card prose"><h2>${esc(t('seo.nu.cpLoveH'))}</h2><p>${esc(love)}</p><h2>${esc(t('seo.nu.cpWorkH'))}</h2><p>${esc(work)}</p><h2>${esc(t('seo.nu.cpBringsH'))}</h2><ul>${brings}</ul></div>
  <p class="muted small">${esc(t('seo.nu.cpNote'))}</p>
  ${h.cta(t('seo.cm.cta'), 'matching/', t('seo.cm.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.nu.cpMore', { n: a }), N9.filter(x => x !== b).map(x => h.link(pairSlug(a, x), t('seo.nu.cpShort', { a, b: x }))))}
  ${a !== b ? h.linkrow(t('seo.nu.cpMore', { n: b }), N9.filter(x => x !== a).map(x => h.link(pairSlug(b, x), t('seo.nu.cpShort', { a: b, b: x })))) : ''}
  ${h.linkrow(t('seo.nu.hubMu'), [...new Set([a, b])].map(n => h.link(`numerology/mulank-${n}/`, t('seo.nu.muShort', { n }))))}`;
  const h1 = t('seo.nu.cpH1', { a, b }), slug = pairSlug(a, b);
  return pageObj(h, { id: 'nu-pair', slug, article: true, title: t('seo.nu.cpTitle', { a, b }), desc: t('seo.nu.cpDesc', { a, b, ga, gb, lvl: lvl.toLowerCase() }), h1, body: nuArticle(h, { eye: t('seo.nu.eye'), h1, lede: sentence1(love), icon: numIcon(`${a}·${b}`), html }), faq, priority: '0.6', crumbs: crumbs(L2 => S.tr(L2, 'seo.nu.cpShort', { a, b }), slug) });
}

function yearPage(lang, n, y) {
  const h = H(lang), { t, L, gr } = h, yn = yearOfDigits(y), v = NU.reduce(n + yn), g = gr(NU.PLANET[n]), gy = gr(NU.PLANET[yn]);
  const r = NU.rel(n, yn) === 'F' || NU.rel(yn, n) === 'F' ? (NU.rel(n, yn) === 'E' || NU.rel(yn, n) === 'E' ? 'N' : 'F') : (NU.rel(n, yn) === 'E' || NU.rel(yn, n) === 'E' ? 'E' : 'N');
  const months = Array.from({ length: 12 }, (_, i) => { const mv = NU.reduce(v + i + 1); return { i, mv, f: NU.fit(mv, n, null) }; });
  const mName = i => h.fMonth.format(new Date(Date.UTC(y, i, 1)));
  const best = months.filter(x => x.f === 'best').map(x => mName(x.i)), bad = months.filter(x => x.f === 'avoid').map(x => mName(x.i));
  const faq = [
    { q: t('seo.nu.yrFq1', { n, y }), a: t('seo.nu.yrLede', { y, yn, gy, n, v }) + ' ' + L.nu.num[v].py + ' ' + t('seo.nu.yrRel.' + r, { gy, g, y }) },
    { q: t('seo.nu.yrFq2', { n, y }), a: bad.length ? t('seo.nu.yrFa2', { list: list(L, best), bad: list(L, bad) }) : t('seo.nu.yrFa2none', { list: list(L, best) }) }
  ];
  const html = `<div class="card prose"><h2>${esc(t('seo.nu.yrThemeH', { y }))}</h2><p>${esc(L.nu.num[v].py)}</p><h2>${esc(t('seo.nu.yrRelH', { y, n }))}</h2><p>${esc(t('seo.nu.yrRel.' + r, { gy, g, y }))}</p><p><b>${esc(t('seo.nu.careerH'))}:</b> ${esc(L.nu.num[n].career)}</p></div>
  <h2 class="sub-h">${esc(t('seo.nu.yrMonthsH', { y }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.nu.month'))}</th><th>${esc(t('seo.nu.vib'))}</th><th>${esc(t('seo.nu.tone'))}</th></tr></thead><tbody>${months.map(x => `<tr><td>${esc(mName(x.i))}</td><td class="num">${x.mv} · ${esc(gr(NU.PLANET[x.mv]))}</td><td>${fitTag(h, x.f)}</td></tr>`).join('')}</tbody></table></div>
  <p class="muted small">${esc(t('seo.nu.yrNote'))}</p>
  ${calcCta(h)}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.nu.yrMore', { y }), N9.map(m => m === n ? `<span class="tag gold">${esc(t('seo.nu.yrShort', { n: m, y }))}</span>` : h.link(`numerology/mulank-${m}-${y}/`, t('seo.nu.yrShort', { n: m, y }))))}
  ${h.linkrow(t('seo.nu.hubMu'), [h.link(`numerology/mulank-${n}/`, t('seo.nu.muShort', { n }))])}`;
  const h1 = t('seo.nu.yrH1', { n, y }), slug = `numerology/mulank-${n}-${y}/`;
  return pageObj(h, { id: 'nu-year', slug, article: true, title: t('seo.nu.yrTitle', { n, y }), desc: t('seo.nu.yrDesc', { n, y, yn, gy }), h1, body: nuArticle(h, { eye: t('seo.nu.eye'), h1, lede: t('seo.nu.yrLede', { y, yn, gy, n, v }), icon: numIcon(n), html }), faq, priority: '0.7', freq: 'monthly', crumbs: crumbs(L2 => S.tr(L2, 'seo.nu.yrShort', { n, y }), slug) });
}

function mobilePage(lang) {
  const h = H(lang), { t, L } = h, faq = L.seo.nu.mobFaq;
  const rows = N9.map(m => `<tr><td><a href="${h.base}numerology/mulank-${m}/">${esc(t('seo.nu.muShort', { n: m }))}</a></td><td>${NU.FRIEND[m].map(x => `<span class="tag good">${x}</span>`).join(' ')}</td><td>${NU.ENEMY[m].length ? NU.ENEMY[m].map(x => `<span class="tag bad">${x}</span>`).join(' ') : esc(t('seo.nu.none'))}</td></tr>`).join('');
  const html = `<div class="card prose">${L.seo.nu.mobP.map(p => `<p>${esc(p)}</p>`).join('')}<p>${esc(t('seo.nu.vehP'))}</p></div>
  <h2 class="sub-h">${esc(t('seo.nu.mobTableH'))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('nu.mulank'))}</th><th>${esc(t('seo.nu.mobBest'))}</th><th>${esc(t('seo.nu.mobAvoid'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
  ${calcCta(h)}
  ${h.faqHtml(faq)}
  ${nuLinks(h)}`;
  const h1 = t('seo.nu.mobH1'), slug = 'numerology/mobile-number/';
  return pageObj(h, { id: 'nu-mobile', slug, article: true, title: t('seo.nu.mobTitle'), desc: t('seo.nu.mobDesc'), h1, body: nuArticle(h, { eye: t('seo.nu.eye'), h1, lede: L.seo.nu.mobP[0], icon: `<span class="nu-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><use href="#i-phone"/></svg></span>`, html }), faq, priority: '0.7', crumbs: crumbs(L2 => L2.seo.nu.mobH1, slug) });
}

function nameGuide(lang) {
  const h = H(lang), { t, L, gr } = h, faq = L.seo.nu.nmFaq;
  const byVal = {}; for (const [ch, v] of Object.entries(NU.CH)) (byVal[v] = byVal[v] || []).push(ch.toUpperCase());
  const chart = Object.keys(byVal).sort().map(v => `<tr><td class="num"><b>${v}</b></td><td>${esc(byVal[v].join(', '))}</td><td>${esc(gr(NU.PLANET[v]))}</td></tr>`).join('');
  const ex = 'Rahul Sharma', words = ex.split(' ').map(w => `${w} (${[...w.toLowerCase()].map(c => NU.CH[c]).join('+')} = ${NU.nameTotal(w)})`).join(' + ');
  const html = `<div class="card prose">${L.seo.nu.nmP.map(p => `<p>${esc(p)}</p>`).join('')}</div>
  <h2 class="sub-h">${esc(t('seo.nu.nmChartH'))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.nu.number'))}</th><th>A–Z</th><th>${esc(t('seo.nu.ruler'))}</th></tr></thead><tbody>${chart}</tbody></table></div>
  <div class="card prose"><h2>${esc(t('seo.nu.nmExampleH'))}</h2><p>${esc(t('seo.nu.nmExample', { name: ex, calc: words, t: NU.nameTotal(ex), n: NU.nameNumber(ex), g: gr(NU.PLANET[NU.nameNumber(ex)]) }))}</p></div>
  ${calcCta(h)}
  ${h.faqHtml(faq)}
  ${nuLinks(h)}`;
  const h1 = t('seo.nu.nmH1'), slug = 'numerology/name-numerology/';
  return pageObj(h, { id: 'nu-name', slug, article: true, title: t('seo.nu.nmTitle'), desc: t('seo.nu.nmDesc'), h1, body: nuArticle(h, { eye: t('seo.nu.eye'), h1, lede: L.seo.nu.nmP[0], icon: numIcon('A'), html }), faq, priority: '0.7', crumbs: crumbs(L2 => L2.seo.nu.nmH1, slug) });
}

// Links on the calculator page (<!--SEOLINKS:numerology-->)
function numerologyHub(lang) {
  const h = H(lang), { t } = h, Y = S_YEARS();
  const legend = `<p class="muted small">${NU.LEVEL_ORDER.map(lv => `${SYM[lv]} ${esc(t('nu.lv.' + lv + '.label'))}`).join(' · ')}</p>`;
  const grid = `<h2 class="sub-h">${esc(t('seo.nu.hubCp'))}</h2><div class="card seo-tablewrap"><table class="seo-table nu-grid-t"><thead><tr><th></th>${N9.map(b => `<th>${b}</th>`).join('')}</tr></thead><tbody>${N9.map(a => `<tr><th>${a}</th>${N9.map(b => { const lv = NU.level(a, b); return `<td class="nu-${lv}"><a href="${h.base}${pairSlug(a, b)}" title="${esc(t('seo.nu.cpShort', { a, b }) + ' · ' + t('nu.lv.' + lv + '.label'))}">${SYM[lv]}</a></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>${legend}`;
  return nuLinks(h, { year: Y[0] }) + h.linkrow(t('seo.nu.hubYr', { y: Y[1] }), N9.map(n => h.link(`numerology/mulank-${n}-${Y[1]}/`, t('seo.nu.yrShort', { n, y: Y[1] })))) + grid;
}

function staticPages3(lang) {
  const out = [];
  for (const n of N9) out.push(mulankPage(lang, n), bhagyankPage(lang, n));
  for (const a of N9) for (const b of N9) if (a <= b) out.push(pairPage(lang, a, b));
  for (const y of S_YEARS()) for (const n of N9) out.push(yearPage(lang, n, y));
  out.push(mobilePage(lang), nameGuide(lang));
  return out;
}

module.exports = { staticPages3, numerologyHub, pairSlug };
