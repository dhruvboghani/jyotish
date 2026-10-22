/* Grahavani — static build for Vercel.
   Generates one SEO-ready page per language (/, /hi/, /gu/, /ta/, /te/, /kn/) into ./public,
   plus config.js (Supabase public keys from env), sitemap.xml and robots.txt. */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname, OUT = path.join(ROOT, 'public');
const SITE_URL = (process.env.SITE_URL || 'https://grahavani.vercel.app').replace(/\/$/, '');
const LANGS = ['en', 'hi', 'gu', 'ta', 'te', 'kn'];
const BUILD = Date.now().toString(36);
const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
if (/^sb_secret_|service_role/.test(PUBLIC_KEY)) throw new Error('A Supabase SECRET key was given as the public key. Use the publishable (sb_publishable_…) key instead.');

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = p => JSON.parse(read(p));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) { const o = { ...a }; for (const k of Object.keys(b || {})) o[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; return o; }
const deepMap = (v, f) => Array.isArray(v) ? v.map(x => deepMap(x, f)) : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepMap(x, f)])) : typeof v === 'string' ? f(v) : v;

// ---- Transliteration of Sanskrit terms from Devanagari ----
const BASE = { gu: 0x0A80, te: 0x0C00, kn: 0x0C80 };
const offsetTr = (s, base) => [...s].map(ch => { const c = ch.codePointAt(0); return c >= 0x0900 && c <= 0x097F && c !== 0x0950 ? String.fromCodePoint(c - 0x0900 + base) : ch; }).join('');
const TA_C = { 'क': 'க', 'ख': 'க', 'ग': 'க', 'घ': 'க', 'ङ': 'ங', 'च': 'ச', 'छ': 'ச', 'ज': 'ஜ', 'झ': 'ஜ', 'ञ': 'ஞ', 'ट': 'ட', 'ठ': 'ட', 'ड': 'ட', 'ढ': 'ட', 'ण': 'ண', 'त': 'த', 'थ': 'த', 'द': 'த', 'ध': 'த', 'न': 'ந', 'प': 'ப', 'फ': 'ப', 'ब': 'ப', 'भ': 'ப', 'म': 'ம', 'य': 'ய', 'र': 'ர', 'ल': 'ல', 'व': 'வ', 'श': 'ஷ', 'ष': 'ஷ', 'स': 'ஸ', 'ह': 'ஹ', 'ळ': 'ள' };
const TA_V = { 'अ': 'அ', 'आ': 'ஆ', 'इ': 'இ', 'ई': 'ஈ', 'उ': 'உ', 'ऊ': 'ஊ', 'ऋ': 'ரு', 'ए': 'ஏ', 'ऐ': 'ஐ', 'ओ': 'ஓ', 'औ': 'ஔ' };
const TA_M = { 'ा': 'ா', 'ि': 'ி', 'ी': 'ீ', 'ु': 'ு', 'ू': 'ூ', 'ृ': '்ரு', 'े': 'ே', 'ै': 'ை', 'ो': 'ோ', 'ौ': 'ௌ', '्': '்', 'ं': 'ம்', 'ः': '' };
const taTr = s => [...s].map(ch => TA_C[ch] || TA_V[ch] || (ch in TA_M ? TA_M[ch] : ch)).join('');
const translit = (lang, s) => lang === 'hi' ? s : lang === 'ta' ? taTr(s) : BASE[lang] ? offsetTr(s, BASE[lang]) : s;

// ---- Locales ----
const EN = json('locales/en.json'), SKT = json('locales/_sanskrit.json');
function locale(lang) {
  if (lang === 'en') return EN;
  const own = json(`locales/${lang}.json`);
  const fromSanskrit = { names: deepMap({ yoga27: SKT.yoga27, karana: SKT.karana, val: SKT.val, houseName: SKT.houseName, syll: SKT.syll, mantra: SKT.mantra }, s => translit(lang, s)) };
  return merge(merge(EN, fromSanskrit), own);
}
const ALL = Object.fromEntries(LANGS.map(l => [l, locale(l)]));

// ---- Fonts per language ----
const FONTS = {
  en: { families: [], body: "'Hind'", display: "'Marcellus'" },
  hi: { families: ['Tiro+Devanagari+Hindi'], body: "'Hind'", display: "'Marcellus', 'Tiro Devanagari Hindi'" },
  gu: { families: ['Hind+Vadodara:wght@400;500;600;700'], body: "'Hind Vadodara', 'Hind'", display: "'Marcellus', 'Hind Vadodara'", bold: true },
  ta: { families: ['Hind+Madurai:wght@400;500;600;700'], body: "'Hind Madurai', 'Hind'", display: "'Marcellus', 'Hind Madurai'", bold: true },
  te: { families: ['Hind+Guntur:wght@400;500;600;700'], body: "'Hind Guntur', 'Hind'", display: "'Marcellus', 'Hind Guntur'", bold: true },
  kn: { families: ['Noto+Sans+Kannada:wght@400;500;600;700'], body: "'Noto Sans Kannada', 'Hind'", display: "'Marcellus', 'Noto Sans Kannada'", bold: true }
};

const E = require('./lib/engine.js');

// ---- Pages ----
const SIGN_SLUG = ['mesha', 'vrishabha', 'mithuna', 'karka', 'simha', 'kanya', 'tula', 'vrishchika', 'dhanu', 'makara', 'kumbha', 'meena'];
const PL = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const BENEFIC = { Moon: 1, Mercury: 1, Jupiter: 1, Venus: 1 };
const DIGBALA = { Sun: 10, Mars: 10, Jupiter: 1, Mercury: 1, Moon: 4, Venus: 4, Saturn: 7 };
const GOCHAR_GOOD = { Sun: [3, 6, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [3, 6, 11], Mercury: [2, 4, 6, 8, 10, 11], Jupiter: [2, 5, 7, 9, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], Saturn: [3, 6, 11], Rahu: [3, 6, 11], Ketu: [3, 6, 11] };
const NAVS = [['', 'kundali', 'i-chart'], ['matching/', 'matching', 'i-heart'], ['panchang/', 'panchang', 'i-sun'], ['calendar/', 'calendar', 'i-cal'], ['rashifal/', 'rashifal', 'i-star'], ['learn/', 'learn', 'i-book']];
const NAVS_MORE = [['family/', 'family', 'i-users'], ['names/', 'names', 'i-star'], ['muhurta/', 'muhurta', 'i-cal'], ['sadhana/', 'sadhana', 'i-check'], ['settings/', 'settings', 'i-shield']];
const BUNDLES = { home: ['core', 'report', 'sadhana-core', 'report-plus', 'home'], panchang: ['core', 'report', 'city', 'panchang'], calendar: ['core', 'city', 'calendar'], rashifal: ['core', 'rashifal'], matching: ['core', 'matching'], share: ['core', 'report', 'sadhana-core', 'report-plus', 'share'], names: ['core', 'names'], muhurta: ['core', 'city', 'muhurta'], family: ['core', 'family'], sadhana: ['core', 'sadhana-core', 'sadhana'], today: ['core', 'report', 'sadhana-core', 'today'], me: ['core', 'sadhana-core', 'me'], settings: ['core', 'city', 'settings'], base: ['core'] };
const PLACES_PAGES = new Set(['home', 'panchang', 'calendar', 'matching', 'muhurta', 'settings']);

const url = (l, slug = '') => SITE_URL + ALL[l].meta.path + slug;
const tr = (L, key, params) => {
  let v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L);
  if (v == null) throw new Error(`Missing translation "${key}" for ${L.meta.code}`);
  if (params) v = v.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
  return v;
};
const list = (L, arr) => { try { return new Intl.ListFormat(L.meta.locale, { style: 'long', type: 'conjunction' }).format(arr); } catch (e) { return arr.join(', '); } };

function head(lang, pg) {
  const L = ALL[lang], f = FONTS[lang], here = url(lang, pg.slug);
  const fam = ['Marcellus', 'Hind:wght@400;500;600;700', 'IBM+Plex+Mono:wght@400;500', 'Tiro+Devanagari+Sanskrit', ...f.families].map(x => 'family=' + x).join('&');
  const alternates = LANGS.map(l => `<link rel="alternate" hreflang="${ALL[l].meta.htmlLang}" href="${url(l, pg.slug)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${url('en', pg.slug)}">`;
  const crumbs = [{ name: L.brand.name, item: url(lang) }].concat(pg.crumbs ? pg.crumbs(L) : []);
  const graph = [{ '@type': 'WebSite', '@id': SITE_URL + '/#site', name: 'Grahavani', url: SITE_URL + '/', inLanguage: LANGS.map(l => ALL[l].meta.htmlLang) }];
  if (pg.id === 'home') graph.push(
    { '@type': 'WebApplication', '@id': here + '#app', name: L.brand.name, url: here, description: pg.desc, inLanguage: L.meta.htmlLang, applicationCategory: 'LifestyleApplication', operatingSystem: 'Any', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
    { '@type': 'FAQPage', '@id': here + '#faq', inLanguage: L.meta.htmlLang, mainEntity: L.faq.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) });
  else {
    graph.push({ '@type': pg.article ? 'Article' : 'WebPage', '@id': here + '#page', [pg.article ? 'headline' : 'name']: pg.h1 || pg.title, description: pg.desc, url: here, inLanguage: L.meta.htmlLang, isPartOf: { '@id': SITE_URL + '/#site' }, ...(pg.article ? { author: { '@type': 'Organization', name: 'Grahavani' }, publisher: { '@type': 'Organization', name: 'Grahavani' } } : {}) });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })) });
  }
  const { static: _s, faq: _f, info: _i, lp: _lp, legal, tools: _t, pages: _p, ...rest } = L;
  const runtime = { ...rest, legal: { privacyTitle: legal.privacyTitle, termsTitle: legal.termsTitle } };
  const ogLocales = LANGS.filter(l => l !== lang).map(l => `<meta property="og:locale:alternate" content="${ALL[l].meta.ogLocale}">`).join('\n');
  return `<title>${esc(pg.title)}</title>
<meta name="description" content="${esc(pg.desc)}">
<meta name="robots" content="${pg.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<link rel="canonical" href="${here}">
${alternates}
<meta property="og:type" content="${pg.article ? 'article' : 'website'}">
<meta property="og:site_name" content="Grahavani">
<meta property="og:title" content="${esc(pg.title)}">
<meta property="og:description" content="${esc(pg.desc)}">
<meta property="og:url" content="${here}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="${L.meta.ogLocale}">
${ogLocales}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pg.title)}">
<meta name="twitter:description" content="${esc(pg.desc)}">
<meta name="twitter:image" content="${SITE_URL}/og.png">
<meta name="theme-color" content="#16173B">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam}&display=swap">
<style>:root{--f-body:${f.body}, system-ui, -apple-system, 'Segoe UI', sans-serif;--f-display:${f.display}, Georgia, serif}${f.bold ? '.hero h1,.page-hero h1,.sec-head h2,.profile h2,.graha h3,.now-card h3,.gate h3,.modal h2,.formcard h2,.article h1,.article h2{font-weight:600;letter-spacing:0}' : ''}</style>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>
<script>window.I18N=${JSON.stringify(runtime).replace(/</g, '\\u003c')};</script>`;
}

const icon = spec => {
  const [kind, v] = spec.split(':');
  if (kind === 'gr') return `<svg class="gimg" viewBox="0 0 64 64" aria-hidden="true"><use href="#gr-${v}"/></svg>`;
  if (kind === 'rs') return `<svg class="ui" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${v}"/></svg>`;
  return `<svg class="ui" viewBox="0 0 24 24" aria-hidden="true"><use href="#${v}"/></svg>`;
};
const gimg = (p, cls = 'gimg') => `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><use href="#gr-${p}"/></svg>`;
const infoHtml = arr => (arr || []).map(a => `<article class="card"><h2 class="h3">${esc(a.h)}</h2>${a.p.map(p => `<p>${esc(p)}</p>`).join('')}</article>`).join('');
const cityHtml = L => `<div class="field cityfield"><label for="c-place">${esc(L.pp.city)}</label><input id="c-place" type="text" role="combobox" aria-expanded="false" aria-controls="c-suggest" aria-autocomplete="list" placeholder="${esc(L.form.placePh)}"><div class="place-meta" id="c-meta"></div><ul id="c-suggest" class="suggest" role="listbox" hidden></ul><button type="button" class="linkbtn" id="c-online">${esc(L.form.lookup)}</button><p class="err" id="c-err" role="alert"></p></div>`;
const personHtml = (L, p) => `<fieldset class="card mperson-form"><legend>${icon('i:i-users')}${esc(L.mt[p === 'b' ? 'boy' : 'girl'])}</legend>
  <select class="pick-saved" data-p="${p}" hidden aria-label="${esc(L.mt.pick)}"></select>
  <div class="field"><label for="${p}-name">${esc(L.form.name)}</label><input id="${p}-name" type="text" placeholder="${esc(L.form.namePh)}"></div>
  <div class="row2"><div class="field"><label for="${p}-date">${esc(L.form.date)}</label><input id="${p}-date" type="date"></div><div class="field"><label for="${p}-time">${esc(L.form.time)}</label><input id="${p}-time" type="time" step="60"></div></div>
  <div class="field"><label for="${p}-place">${esc(L.form.place)}</label><input id="${p}-place" type="text" role="combobox" aria-expanded="false" aria-controls="${p}-suggest" aria-autocomplete="list" placeholder="${esc(L.form.placePh)}"><div class="place-meta" id="${p}-meta"></div><ul id="${p}-suggest" class="suggest" role="listbox" hidden></ul><button type="button" class="linkbtn" id="${p}-online">${esc(L.form.lookup)}</button></div>
  <input type="hidden" id="${p}-lat"><input type="hidden" id="${p}-lon"><input type="hidden" id="${p}-off"></fieldset>`;

// ---- Learn pages ----
function learnPH(L, planet, h) {
  const g = L.names.graha[planet], n = L.lp.ord[h - 1], hn = L.names.houseName[h - 1];
  const cls = [1, 4, 7, 10].includes(h) ? 'kendra' : [5, 9].includes(h) ? 'trikona' : [6, 8, 12].includes(h) ? 'dusthana' : [3, 11].includes(h) ? 'upachaya' : 'maraka';
  const paras = [tr(L, 'lp.intro', { g, kk: L.names.karaka[planet], n, hn, m: L.names.house[h - 1] }), L.lp.nat[BENEFIC[planet] ? 'ben' : 'mal'][h - 1], tr(L, 'lp.cls.' + cls, { n })];
  if (DIGBALA[planet] === h) paras.push(tr(L, 'lp.digbala', { g, n }));
  else if (DIGBALA[planet] && (DIGBALA[planet] + 5) % 12 + 1 === h) paras.push(tr(L, 'lp.digWeak', { g, n }));
  const ex = E.EXALT[planet], deb = (ex + 6) % 12;
  paras.push(E.OWN[planet] ? tr(L, 'lp.strong', { g, ex: L.names.rashi[ex], own: list(L, E.OWN[planet].map(s => L.names.rashi[s])) }) : tr(L, 'lp.strongNode', { g, ex: L.names.rashi[ex] }));
  paras.push(tr(L, planet === 'Sun' ? 'lp.weakSun' : 'lp.weak', { g, deb: L.names.rashi[deb] }));
  const gochar = tr(L, GOCHAR_GOOD[planet].includes(h) ? 'lp.gocharFav' : 'lp.gocharUnfav', { g, n });
  const title = tr(L, 'lp.phTitle', { g, n }), h1 = tr(L, 'lp.phH1', { g, n });
  const others = Array.from({ length: 12 }, (_, i) => i + 1).map(x => x === h ? `<span class="tag gold">${esc(L.lp.ord[x - 1])}</span>` : `<a class="tag" href="${L.meta.path}learn/${planet.toLowerCase()}-in-house-${x}/">${esc(L.lp.ord[x - 1])}</a>`).join('');
  const sameHouse = PL.filter(p => p !== planet).map(p => `<a class="tag" href="${L.meta.path}learn/${p.toLowerCase()}-in-house-${h}/">${gimg(p, 'gimg sm')}${esc(L.names.graha[p])}</a>`).join('');
  const body = `<main class="wrap page article">
  <nav class="crumbs" aria-label="breadcrumb"><a href="${L.meta.path}">${esc(L.brand.name)}</a> › <a href="${L.meta.path}learn/">${esc(L.lp.indexH1)}</a> › <span>${esc(h1)}</span></nav>
  <div class="article-head">${gimg(planet, 'gimg xl')}<div><p class="eyebrow">${esc(L.lp.phSection)} · ${esc(tr(L, 'lp.clsName.' + cls))}</p><h1>${esc(h1)}</h1><p class="lede">${esc(L.names.grahaAlt[planet])} · ${esc(hn)} ${esc(L.lp.bhava)}</p></div></div>
  <div class="card prose">${paras.map(p => `<p>${esc(p)}</p>`).join('')}<h2>${esc(L.lp.gocharH)}</h2><p>${esc(gochar)}</p><p class="muted small">${esc(L.lp.disclaimer)}</p></div>
  <div class="card cta-card"><div><b>${esc(tr(L, 'lp.cta', { g }))}</b></div><a class="btn-cta" href="${L.meta.path}">${esc(L.lp.ctaBtn)}</a></div>
  <h2 class="sub-h">${esc(tr(L, 'lp.otherHouses', { g }))}</h2><div class="meta linkrow">${others}</div>
  <h2 class="sub-h">${esc(tr(L, 'lp.otherPlanets', { n }))}</h2><div class="meta linkrow">${sameHouse}</div>
</main>`;
  return { title, h1, desc: tr(L, 'lp.phDesc', { g, n, m: L.names.house[h - 1] }), body, crumbs: L2 => [{ name: L2.lp.indexH1, item: url(L2.meta.code, 'learn/') }, { name: h1, item: url(L2.meta.code, `learn/${planet.toLowerCase()}-in-house-${h}/`) }] };
}
function learnLagna(L, s) {
  const r = L.names.rashi[s], lordOf = h => E.SIGN_LORD[(s + h - 1) % 12];
  const uniq = a => [...new Set(a)];
  const tri = uniq([1, 5, 9].map(lordOf)), bad = uniq([3, 6, 11].map(lordOf)).filter(p => !tri.includes(p));
  const yk = PL.slice(0, 7).find(p => { const hs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(h => lordOf(h) === p); return hs.some(h => [4, 7, 10].includes(h)) && hs.some(h => [5, 9].includes(h)); });
  const gl = a => list(L, a.map(p => L.names.graha[p]));
  const paras = [
    tr(L, 'lp.lgIntro', { r }) + ' ' + L.names.lagnaTrait[s],
    tr(L, 'lp.lgLord', { r, g: L.names.graha[E.SIGN_LORD[s]], el: L.lp.elem[s % 4], q: L.lp.qual[s % 3] }),
    tr(L, 'lp.lgBen', { r, list: gl(tri) }),
    bad.length ? tr(L, 'lp.lgMal', { list: gl(bad) }) : '',
    yk ? tr(L, 'lp.lgYk', { g: L.names.graha[yk] }) : tr(L, 'lp.lgNoYk', { r })
  ].filter(Boolean);
  const h1 = tr(L, 'lp.lgH1', { r });
  const signs = SIGN_SLUG.map((sl, i) => i === s ? `<span class="tag gold">${esc(L.names.rashi[i])}</span>` : `<a class="tag" href="${L.meta.path}learn/${sl}-lagna/">${esc(L.names.rashi[i])}</a>`).join('');
  const body = `<main class="wrap page article">
  <nav class="crumbs" aria-label="breadcrumb"><a href="${L.meta.path}">${esc(L.brand.name)}</a> › <a href="${L.meta.path}learn/">${esc(L.lp.indexH1)}</a> › <span>${esc(h1)}</span></nav>
  <div class="article-head"><svg class="rg xl" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${s}"/></svg><div><p class="eyebrow">${esc(L.lp.lgSection)}</p><h1>${esc(h1)}</h1><p class="lede">${esc(L.names.lagnaTrait[s])}</p></div></div>
  <div class="card prose">${paras.map(p => `<p>${esc(p)}</p>`).join('')}<p class="muted small">${esc(L.lp.disclaimer)}</p></div>
  <div class="card cta-card"><div><b>${esc(L.lp.lgCta)}</b></div><a class="btn-cta" href="${L.meta.path}">${esc(L.lp.ctaBtn)}</a></div>
  <h2 class="sub-h">${esc(L.lp.lgSection)}</h2><div class="meta linkrow">${signs}</div>
</main>`;
  return { title: tr(L, 'lp.lgTitle', { r }), h1, desc: tr(L, 'lp.lgDesc', { r }), body, crumbs: L2 => [{ name: L2.lp.indexH1, item: url(L2.meta.code, 'learn/') }, { name: h1, item: url(L2.meta.code, `learn/${SIGN_SLUG[s]}-lagna/`) }] };
}
function learnIndex(L) {
  const grid = PL.map(p => `<article class="card learn-p"><h2 class="h3">${gimg(p, 'gimg sm')}${esc(L.names.graha[p])}</h2><div class="meta">${Array.from({ length: 12 }, (_, i) => `<a class="tag" href="${L.meta.path}learn/${p.toLowerCase()}-in-house-${i + 1}/">${esc(L.lp.ord[i])}</a>`).join('')}</div></article>`).join('');
  const lg = SIGN_SLUG.map((sl, i) => `<a class="card lagna-link" href="${L.meta.path}learn/${sl}-lagna/"><svg class="rg" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${i}"/></svg><b>${esc(tr(L, 'lp.lgH1', { r: L.names.rashi[i] }))}</b></a>`).join('');
  return `<main class="wrap page">
  <div class="page-hero"><p class="eyebrow">${esc(L.lp.indexEye)}</p><h1>${esc(L.lp.indexH1)}</h1><p class="lede">${esc(L.lp.indexLede)}</p></div>
  <h2 class="sub-h">${esc(L.lp.phSection)}</h2><div class="learn-grid">${grid}</div>
  <h2 class="sub-h">${esc(L.lp.lgSection)}</h2><div class="lagna-grid">${lg}</div>
</main>`;
}
const legalBody = (L, k) => `<main class="wrap page article"><div class="page-hero"><h1>${esc(L.legal[k + 'Title'])}</h1><p class="lede">${esc(L.legal.updated)}</p></div><div class="card prose">${L.legal[k].map(a => `<h2>${esc(a.h)}</h2>${a.p.map(p => `<p>${esc(p)}</p>`).join('')}`).join('')}</div></main>`;

function pagesFor(L) {
  const P = (id, slug, extra = {}) => ({ id, slug, title: extra.title || L.pages[id].title, desc: extra.desc || L.pages[id].description, crumbs: extra.crumbs || (slug ? L2 => [{ name: L2.pages[id].name, item: url(L2.meta.code, slug) }] : null), bundle: BUNDLES[id] ? id : 'base', ...extra });
  const out = [
    P('home', '', { title: L.meta.title, desc: L.meta.description, priority: '1.0', freq: 'weekly' }),
    P('matching', 'matching/', { priority: '0.9', freq: 'monthly' }),
    P('panchang', 'panchang/', { priority: '0.9', freq: 'daily' }),
    P('calendar', 'calendar/', { priority: '0.9', freq: 'monthly' }),
    P('rashifal', 'rashifal/', { priority: '0.9', freq: 'daily' }),
    P('names', 'names/', { priority: '0.8', freq: 'monthly' }),
    P('muhurta', 'muhurta/', { priority: '0.8', freq: 'weekly' }),
    P('family', 'family/', { noindex: true }),
    P('sadhana', 'sadhana/', { noindex: true }),
    P('today', 'today/', { noindex: true }),
    P('me', 'me/', { noindex: true }),
    P('settings', 'settings/', { noindex: true }),
    P('learn', 'learn/', { priority: '0.8', freq: 'monthly', body: learnIndex(L) }),
    P('share', 'share/', { noindex: true }),
    P('privacy', 'privacy/', { priority: '0.3', freq: 'yearly', body: legalBody(L, 'privacy') }),
    P('terms', 'terms/', { priority: '0.3', freq: 'yearly', body: legalBody(L, 'terms') })
  ];
  for (const p of PL) for (let h = 1; h <= 12; h++) { const x = learnPH(L, p, h); out.push({ id: 'learn-ph', slug: `learn/${p.toLowerCase()}-in-house-${h}/`, article: true, bundle: 'base', priority: '0.6', freq: 'yearly', ...x }); }
  for (let s = 0; s < 12; s++) { const x = learnLagna(L, s); out.push({ id: 'learn-lagna', slug: `learn/${SIGN_SLUG[s]}-lagna/`, article: true, bundle: 'base', priority: '0.6', freq: 'yearly', ...x }); }
  return out;
}

function render(lang, pg) {
  const L = ALL[lang], base = L.meta.path;
  const navActive = pg.id === 'learn-ph' || pg.id === 'learn-lagna' ? 'learn/' : pg.slug;
  const navLink = ([slug, key, ico]) => `<a href="${base}${slug}"${slug === navActive ? ' aria-current="page"' : ''}>${icon('i:' + ico)}<span>${esc(L.nav[key])}</span></a>`;
  const nav = NAVS.map(navLink).join(''), navAll = NAVS.concat(NAVS_MORE).map(navLink).join('');
  let body = pg.body || read(`src/pages/${pg.id}.html`);
  body = body.replace('<!--CITY-->', cityHtml(L))
    .replace('<!--PERSON:b-->', personHtml(L, 'b')).replace('<!--PERSON:g-->', personHtml(L, 'g'))
    .replace('<!--INFO-->', infoHtml(L.info[pg.id]))
    .replace('<!--RELOPTS-->', ['self', 'spouse', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'friend', 'other'].map(r => `<option value="${r}">${esc(L.rel[r])}</option>`).join(''))
    .replace('<!--TOOLS-->', NAVS.slice(1).concat(NAVS_MORE.slice(0, 3)).map(([slug, key, ico]) => `<a class="card tool" href="${base}${slug}"><span class="fi">${icon('i:' + ico)}</span><h3>${esc(L.tools[key].h)}</h3><p>${esc(L.tools[key].p)}</p><span class="go-arrow">→</span></a>`).join(''))
    .replace('<!--FEATURES-->', () => L.static.features.map(f => `<article class="card feature"><span class="fi">${icon(f.icon)}</span><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p></article>`).join(''))
    .replace('<!--ABOUT-->', () => L.static.about.map(a => `<article class="card"><h3>${esc(a.h)}</h3>${a.p.map(p => `<p>${esc(p)}</p>`).join('')}</article>`).join(''))
    .replace('<!--FAQ-->', () => L.faq.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q.q)}<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="ans">${esc(q.a)}</div></details>`).join(''));
  const scripts = (PLACES_PAGES.has(pg.bundle) ? `<script src="/assets/places.js?v=${BUILD}" defer></script>\n` : '') + (pg.bundle === 'home' || pg.bundle === 'today' ? `<script src="/assets/engine.js?v=${BUILD}" defer></script>\n` : '') + `<script src="/assets/${pg.bundle}.js?v=${BUILD}" defer></script>`;
  let html = read('src/layout.html');
  html = html.replace('<!--HEAD-->', () => head(lang, pg))
    .replace('<!--SPRITE-->', () => read('src/sprite.svg'))
    .replace('<!--PAGEID-->', pg.id)
    .replace('<!--NAV-->', () => nav).replace('<!--NAVALL-->', () => navAll).replace('<!--NAVALL-->', () => navAll)
    .replace('<!--NEWHREF-->', pg.id === 'home' ? '#top' : base)
    .replace('<!--LANGOPTS-->', LANGS.map(l => `<option value="${l}" data-href="${ALL[l].meta.path}${pg.slug}"${l === lang ? ' selected' : ''}>${esc(ALL[l].meta.langName)}</option>`).join(''))
    .replace('<!--LANGLINKS-->', LANGS.map(l => `<a href="${ALL[l].meta.path}${pg.slug}" hreflang="${ALL[l].meta.htmlLang}" lang="${ALL[l].meta.htmlLang}" style="margin:0 6px">${esc(ALL[l].meta.langName)}</a>`).join(''))
    .replace('<!--BODY-->', () => body)
    .replace('<!--SCRIPTS-->', scripts);
  return html.replace(/\{\{([\w.]+)\}\}/g, (m, key) => key === 'build' ? BUILD : key === 'home' ? base : esc(tr(L, key)));
}

// ---- Write output ----
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
const sitemap = [];
let count = 0;
const PAGESETS = Object.fromEntries(LANGS.map(l => [l, pagesFor(ALL[l])]));
for (const l of LANGS) {
  for (const pg of PAGESETS[l]) {
    const dir = path.join(OUT, ALL[l].meta.path, pg.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), render(l, pg));
    count++;
  }
}
for (const pg of PAGESETS.en) if (!pg.noindex) sitemap.push(pg);
for (const [name, parts] of Object.entries(BUNDLES)) {
  const src = parts.map(p => `// ---- ${p}.js ----\n` + read(`src/js/${p}.js`)).join('\n');
  fs.writeFileSync(path.join(OUT, 'assets', name + '.js'), `(function () {\n'use strict';\n${src}\nboot();\n})();\n`);
}
for (const f of ['places.js', 'styles.css']) fs.copyFileSync(path.join(ROOT, 'src', f), path.join(OUT, 'assets', f));
fs.copyFileSync(path.join(ROOT, 'lib', 'engine.js'), path.join(OUT, 'assets', 'engine.js')); // same maths in the browser for the live sky wheel
for (const f of fs.readdirSync(path.join(ROOT, 'static'))) fs.copyFileSync(path.join(ROOT, 'static', f), path.join(OUT, f));

fs.writeFileSync(path.join(OUT, 'config.js'), `window.KG_CONFIG=${JSON.stringify({ supabaseUrl: process.env.SUPABASE_URL || '', supabaseAnonKey: PUBLIC_KEY, vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '' })};\n`);

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map(l => sitemap.map(pg => `  <url>
    <loc>${url(l, pg.slug)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${pg.freq}</changefreq>
    <priority>${pg.priority}</priority>
${LANGS.map(a => `    <xhtml:link rel="alternate" hreflang="${ALL[a].meta.htmlLang}" href="${url(a, pg.slug)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${url('en', pg.slug)}"/>
  </url>`).join('\n')).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /share/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

const missing = [];
if (!process.env.SUPABASE_URL || !PUBLIC_KEY) missing.push('SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (login will be disabled)');
if (!process.env.SITE_URL) missing.push('SITE_URL (using ' + SITE_URL + ' for canonical URLs and sitemap)');
console.log(`Built ${count} pages in ${LANGS.length} languages into ./public (build ${BUILD}).`);
if (missing.length) console.warn('Note: env not set → ' + missing.join('; '));
