/* Shared page renderer: the static build (build.js) and the server-rendered daily pages (lib/routes/seo.js)
   produce identical layout, head tags, structured data and navigation from the same locale files. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = (process.env.SITE_URL || 'https://grahavani.iplocatortools.com').replace(/\/$/, '');
const LANGS = ['en', 'hi', 'gu', 'ta', 'te', 'kn'];
const readBuildId = () => { try { return fs.readFileSync(path.join(ROOT, '.build-id'), 'utf8').trim(); } catch (e) { return ''; } };
const BUILD = process.env.GV_BUILD || (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 10) || readBuildId() || Date.now().toString(36);
const CACHE = {};
const read = p => CACHE[p] || (CACHE[p] = fs.readFileSync(path.join(ROOT, p), 'utf8'));
const json = p => JSON.parse(read(p));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) { const o = { ...a }; for (const k of Object.keys(b || {})) o[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; return o; }
const deepMap = (v, f) => Array.isArray(v) ? v.map(x => deepMap(x, f)) : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepMap(x, f)])) : typeof v === 'string' ? f(v) : v;

const { translit } = require('./translit.js');

// ---- Locales ----
const EN = json('locales/en.json'), SKT = json('locales/_sanskrit.json');
function locale(lang) {
  if (lang === 'en') return EN;
  const own = json(`locales/${lang}.json`);
  const fromSanskrit = { names: deepMap({ yoga27: SKT.yoga27, karana: SKT.karana, val: SKT.val, houseName: SKT.houseName, syll: SKT.syll, mantra: SKT.mantra, samvatsara: SKT.samvatsara, japaMantra: SKT.japaMantra }, s => translit(lang, s)) };
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

const E = require('./engine.js');

// ---- Pages ----
const SIGN_SLUG = ['mesha', 'vrishabha', 'mithuna', 'karka', 'simha', 'kanya', 'tula', 'vrishchika', 'dhanu', 'makara', 'kumbha', 'meena'];
const PL = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const BENEFIC = { Moon: 1, Mercury: 1, Jupiter: 1, Venus: 1 };
const DIGBALA = { Sun: 10, Mars: 10, Jupiter: 1, Mercury: 1, Moon: 4, Venus: 4, Saturn: 7 };
const GOCHAR_GOOD = { Sun: [3, 6, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [3, 6, 11], Mercury: [2, 4, 6, 8, 10, 11], Jupiter: [2, 5, 7, 9, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], Saturn: [3, 6, 11], Rahu: [3, 6, 11], Ketu: [3, 6, 11] };
const NAVS = [['', 'kundali', 'i-chart'], ['matching/', 'matching', 'i-heart'], ['panchang/', 'panchang', 'i-sun'], ['calendar/', 'calendar', 'i-cal'], ['rashifal/', 'rashifal', 'i-star'], ['learn/', 'learn', 'i-book']];
const NAVS_MORE = [['family/', 'family', 'i-users'], ['names/', 'names', 'i-star'], ['numerology/', 'numerology', 'i-num'], ['muhurta/', 'muhurta', 'i-cal'], ['sadhana/', 'sadhana', 'i-check'], ['puja/', 'puja', 'i-lamp'], ['vrat/', 'vrat', 'i-cal'], ['eclipses/', 'eclipses', 'i-half'], ['japa/', 'japa', 'i-mala'], ['tithi-dates/', 'tithi', 'i-lamp'], ['prashna/', 'prashna', 'i-question'], ['biodata/', 'biodata', 'i-doc'], ['delivery-muhurat/', 'delivery', 'i-heart'], ['business-kundali/', 'business', 'i-chart'], ['dreams/', 'dreams', 'i-book'], ['famous-charts/', 'celebs', 'i-star'], ['blog/', 'blog', 'i-doc'], ['download/', 'download', 'i-download'], ['settings/', 'settings', 'i-shield']];
const BUNDLES = { home: ['core', 'report', 'sadhana-core', 'report-plus', 'report-more', 'lifeplus', 'nadi', 'ask', 'home'], panchang: ['core', 'report', 'city', 'daytime', 'panchang'], calendar: ['core', 'city', 'calendar'], rashifal: ['core', 'rashifal'], matching: ['core', 'matching'], share: ['core', 'report', 'sadhana-core', 'report-plus', 'report-more', 'lifeplus', 'nadi', 'share'], names: ['core', 'names'], numerology: ['core', 'numcore', 'numerology'], muhurta: ['core', 'city', 'muhurta'], family: ['core', 'family'], sadhana: ['core', 'sadhana-core', 'sadhana'], today: ['core', 'report', 'sadhana-core', 'daytime', 'today'], me: ['core', 'sadhana-core', 'me'], settings: ['core', 'city', 'settings'], japa: ['core', 'sadhana-core', 'japa'], tithi: ['core', 'city', 'tithi'], prashna: ['core', 'report', 'city', 'prashna'], biodata: ['core', 'city', 'biodata'], puja: ['core', 'city', 'puja'], vrat: ['core', 'city', 'vrat'], eclipses: ['core', 'city', 'eclipses'], delivery: ['core', 'city', 'delivery'], business: ['core', 'report', 'city', 'numcore', 'business'], base: ['core'] };
const PLACES_PAGES = new Set(['home', 'panchang', 'calendar', 'matching', 'muhurta', 'settings', 'tithi', 'prashna', 'biodata', 'puja', 'vrat', 'eclipses', 'delivery', 'business']);

const url = (l, slug = '') => SITE_URL + ALL[l].meta.path + slug;
const tr = (L, key, params) => {
  let v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L);
  if (v == null) throw new Error(`Missing translation "${key}" for ${L.meta.code}`);
  if (params) v = v.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
  return v;
};
const list = (L, arr) => { try { return new Intl.ListFormat(L.meta.locale, { style: 'long', type: 'conjunction' }).format(arr); } catch (e) { return arr.join(', '); } };

// Runtime strings for the browser: one cached file per language (content-hashed name), instead of ~180 KB inlined in every page
const I18N_CACHE = {};
function i18nFile(lang) {
  if (I18N_CACHE[lang]) return I18N_CACHE[lang];
  const L = ALL[lang], { static: _s, faq: _f, info: _i, lp: _lp, legal, tools: _t, pages: _p, seo: _seo, ...rest } = L;
  const content = `window.I18N=${JSON.stringify({ ...rest, legal: { privacyTitle: legal.privacyTitle, termsTitle: legal.termsTitle } }).replace(/</g, '\\u003c')};\n`;
  const h = require('crypto').createHash('sha1').update(content).digest('hex').slice(0, 10);
  return (I18N_CACHE[lang] = { name: `i18n-${lang}-${h}.js`, content });
}
function head(lang, pg) {
  const L = ALL[lang], f = FONTS[lang], here = url(lang, pg.canonicalSlug || pg.slug);
  // Pages that exist only in some languages (blog posts) list just those as alternates
  const alts = pg.altSlugs ? Object.keys(pg.altSlugs).filter(l => LANGS.includes(l)) : LANGS, slugFor = l => pg.altSlugs ? pg.altSlugs[l] : pg.slug;
  const fam = ['Marcellus', 'Hind:wght@400;500;600;700', 'IBM+Plex+Mono:wght@400;500', 'Tiro+Devanagari+Sanskrit', ...f.families].map(x => 'family=' + x).join('&');
  const alternates = alts.map(l => `<link rel="alternate" hreflang="${ALL[l].meta.htmlLang}" href="${url(l, slugFor(l))}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${url(alts.includes('en') ? 'en' : lang, slugFor(alts.includes('en') ? 'en' : lang))}">`;
  const crumbs = [{ name: L.brand.name, item: url(lang) }].concat(pg.crumbs ? pg.crumbs(L) : []);
  const graph = [{ '@type': 'WebSite', '@id': SITE_URL + '/#site', name: 'Grahavani', url: SITE_URL + '/', inLanguage: LANGS.map(l => ALL[l].meta.htmlLang), publisher: { '@id': SITE_URL + '/#org' } },
    { '@type': 'Organization', '@id': SITE_URL + '/#org', name: 'Grahavani', url: SITE_URL + '/', logo: { '@type': 'ImageObject', url: SITE_URL + '/icon-512.png', width: 512, height: 512 } }];
  if (pg.id === 'home') graph.push(
    { '@type': 'WebApplication', '@id': here + '#app', name: L.brand.name, url: here, description: pg.desc, inLanguage: L.meta.htmlLang, applicationCategory: 'LifestyleApplication', operatingSystem: 'Any', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
    { '@type': 'FAQPage', '@id': here + '#faq', inLanguage: L.meta.htmlLang, mainEntity: L.faq.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) });
  else {
    graph.push({ '@type': pg.article ? 'Article' : 'WebPage', '@id': here + '#page', [pg.article ? 'headline' : 'name']: pg.h1 || pg.title, description: pg.desc, url: here, inLanguage: L.meta.htmlLang, isPartOf: { '@id': SITE_URL + '/#site' }, ...(pg.article ? { mainEntityOfPage: here, image: SITE_URL + '/og.png', author: { '@type': 'Organization', name: 'Grahavani', url: SITE_URL + '/' }, publisher: { '@id': SITE_URL + '/#org' } } : {}) });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })) });
    if (pg.faq && pg.faq.length) graph.push({ '@type': 'FAQPage', '@id': here + '#faq', inLanguage: L.meta.htmlLang, mainEntity: pg.faq.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) });
    if (pg.howto) graph.push({ '@type': 'HowTo', '@id': here + '#howto', name: pg.howto.name, inLanguage: L.meta.htmlLang, image: SITE_URL + '/og.png', supply: pg.howto.supply.map(x => ({ '@type': 'HowToSupply', name: x })), step: pg.howto.steps.map((x, i) => ({ '@type': 'HowToStep', position: i + 1, name: x.split(/[.,।]/)[0].slice(0, 80), text: x })) });
    if (pg.event) graph.push({ '@type': 'Event', '@id': here + '#event', name: pg.event.name, startDate: pg.event.startDate, endDate: pg.event.endDate, description: pg.event.description, inLanguage: L.meta.htmlLang, image: SITE_URL + '/og.png', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled', location: { '@type': 'Place', name: 'India', address: { '@type': 'PostalAddress', addressCountry: 'IN' } }, organizer: { '@id': SITE_URL + '/#org' } });
  }
  const ogLocales = LANGS.filter(l => l !== lang).map(l => `<meta property="og:locale:alternate" content="${ALL[l].meta.ogLocale}">`).join('\n');
  const verify = (process.env.GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${esc(process.env.GOOGLE_SITE_VERIFICATION)}">\n` : '') + (process.env.BING_SITE_VERIFICATION ? `<meta name="msvalidate.01" content="${esc(process.env.BING_SITE_VERIFICATION)}">\n` : '');
  return `${pg.id === 'home' ? verify : ''}<title>${esc(pg.title)}</title>
<meta name="description" content="${esc(pg.desc)}">
<meta name="robots" content="${pg.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
<link rel="canonical" href="${here}">
${alternates}
<meta property="og:type" content="${pg.article ? 'article' : 'website'}">
<meta property="og:site_name" content="Grahavani">
<meta property="og:title" content="${esc(pg.title)}">
<meta property="og:description" content="${esc(pg.desc)}">
<meta property="og:url" content="${here}">
${pg.ogImage ? `<meta property="og:image" content="${esc(pg.ogImage)}">` : `<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`}
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
<script defer src="/assets/${i18nFile(lang).name}"></script>`;
}

const icon = spec => {
  const [kind, v] = spec.split(':');
  if (kind === 'gr') return `<svg class="gimg" viewBox="0 0 64 64" aria-hidden="true"><use href="#gr-${v}"/></svg>`;
  if (kind === 'rs') return `<svg class="ui" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${v}"/></svg>`;
  return `<svg class="ui" viewBox="0 0 24 24" aria-hidden="true"><use href="#${v}"/></svg>`;
};
const gimg = (p, cls = 'gimg') => `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><use href="#gr-${p}"/></svg>`;
// Android / iPhone app download badges (hidden inside the app itself)
const appBadges = L => `<div class="app-badges no-print"><a class="app-badge" href="/app.apk" download="grahavani.apk" title="${esc(L.dl.button)}">${icon('i:i-android')}<span><small>${esc(L.dl.getOn)}</small><b>Android</b></span></a><a class="app-badge soon" href="${L.meta.path}download/" title="${esc(L.dl.ios)}">${icon('i:i-phone')}<span><small>${esc(L.dl.soon)}</small><b>iPhone</b></span></a></div>`;
const infoHtml = arr => (arr || []).map(a => `<article class="card"><h2 class="h3">${esc(a.h)}</h2>${a.p.map(p => `<p>${esc(p)}</p>`).join('')}</article>`).join('');
const cityHtml = L => `<div class="field cityfield"><label for="c-place">${esc(L.pp.city)}</label><input id="c-place" type="text" role="combobox" aria-expanded="false" aria-controls="c-suggest" aria-autocomplete="list" placeholder="${esc(L.form.placePh)}"><div class="place-meta" id="c-meta"></div><ul id="c-suggest" class="suggest" role="listbox" hidden></ul><button type="button" class="linkbtn" id="c-online">${esc(L.form.lookup)}</button><p class="err" id="c-err" role="alert"></p></div>`;
const personHtml = (L, p) => `<fieldset class="card mperson-form"><legend>${icon('i:i-users')}${esc(L.mt[p === 'b' ? 'boy' : 'girl'])}</legend>
  <select class="pick-saved" data-p="${p}" hidden aria-label="${esc(L.mt.pick)}"></select>
  <div class="field"><label for="${p}-name">${esc(L.form.name)}</label><input id="${p}-name" type="text" placeholder="${esc(L.form.namePh)}"></div>
  <div class="row2"><div class="field"><label for="${p}-date">${esc(L.form.date)}</label><input id="${p}-date" type="date"></div><div class="field"><label for="${p}-time">${esc(L.form.time)}</label><input id="${p}-time" type="time" step="60"></div></div>
  <div class="field"><label for="${p}-place">${esc(L.form.place)}</label><input id="${p}-place" type="text" role="combobox" aria-expanded="false" aria-controls="${p}-suggest" aria-autocomplete="list" placeholder="${esc(L.form.placePh)}"><div class="place-meta" id="${p}-meta"></div><ul id="${p}-suggest" class="suggest" role="listbox" hidden></ul><button type="button" class="linkbtn" id="${p}-online">${esc(L.form.lookup)}</button></div>
  <input type="hidden" id="${p}-lat"><input type="hidden" id="${p}-lon"><input type="hidden" id="${p}-off"></fieldset>`;

// Links into the search pages (lazy: seo-pages.js requires this module)
const seoLinks = (lang, id) => { try { return require('./seo-pages.js').hubLinks(lang, id); } catch (e) { if (process.env.GV_STRICT) throw e; return ''; } };
function render(lang, pg) {
  const L = ALL[lang], base = L.meta.path;
  const langSlug = l => pg.altSlugs ? (pg.altSlugs[l] || pg.langFallback || '') : pg.slug;
  const navActive = /^learn-/.test(pg.id) ? 'learn/' : pg.slug;
  const navLink = ([slug, key, ico]) => `<a href="${base}${slug}"${slug === navActive ? ' aria-current="page"' : ''}>${icon('i:' + ico)}<span>${esc(L.nav[key])}</span></a>`;
  const nav = NAVS.map(navLink).join(''), navAll = NAVS.concat(NAVS_MORE).map(navLink).join('');
  let body = pg.body || read(`src/pages/${pg.id}.html`);
  if (pg.toolFaq && pg.faq && pg.faq.length) { const fq = `<section class="tool-faq no-print"><h2 class="sub-h">${esc(L.seo.faqH)}</h2><div class="faq">${pg.faq.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q.q)}<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="ans">${esc(q.a)}</div></details>`).join('')}</div></section>`; const at = body.lastIndexOf('</main>'); body = at >= 0 ? body.slice(0, at) + fq + body.slice(at) : body + fq; }
  body = body.replace('<!--CITY-->', cityHtml(L)).replace('<!--APPBADGES-->', appBadges(L))
    .replace('<!--PERSON:b-->', personHtml(L, 'b')).replace('<!--PERSON:g-->', personHtml(L, 'g'))
    .replace('<!--INFO-->', infoHtml(L.info[pg.id]))
    .replace(/<!--SEOLINKS:(\w+)-->/g, (m, id) => seoLinks(lang, id))
    .replace('<!--RELOPTS-->', ['self', 'spouse', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'friend', 'other'].map(r => `<option value="${r}">${esc(L.rel[r])}</option>`).join(''))
    .replace('<!--TOOLS-->', NAVS.slice(1).concat(NAVS_MORE.slice(0, 3)).map(([slug, key, ico]) => `<a class="card tool" href="${base}${slug}"><span class="fi">${icon('i:' + ico)}</span><h3>${esc(L.tools[key].h)}</h3><p>${esc(L.tools[key].p)}</p><span class="go-arrow">→</span></a>`).join(''))
    .replace('<!--FEATURES-->', () => L.static.features.map(f => `<article class="card feature"><span class="fi">${icon(f.icon)}</span><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p></article>`).join(''))
    .replace('<!--ABOUT-->', () => L.static.about.map(a => `<article class="card"><h3>${esc(a.h)}</h3>${a.p.map(p => `<p>${esc(p)}</p>`).join('')}</article>`).join(''))
    .replace('<!--FAQ-->', () => L.faq.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q.q)}<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="ans">${esc(q.a)}</div></details>`).join(''));
  const scripts = (PLACES_PAGES.has(pg.bundle) ? `<script src="/assets/places.js?v=${BUILD}" defer></script>\n` : '') + (pg.bundle === 'home' || pg.bundle === 'share' || pg.bundle === 'today' || pg.bundle === 'biodata' || pg.bundle === 'eclipses' || pg.bundle === 'delivery' || pg.bundle === 'business' ? `<script src="/assets/engine.js?v=${BUILD}" defer></script>\n` : '') + `<script src="/assets/${pg.bundle}.js?v=${BUILD}" defer></script>`;
  let html = read('src/layout.html');
  html = html.replace('<!--APPBADGES-->', () => appBadges(L)).replace('<!--FOOTSEO-->', () => seoLinks(lang, 'footer')).replace('<!--HEAD-->', () => head(lang, pg))
    .replace('<!--SPRITE-->', () => read('src/sprite.svg'))
    .replace('<!--PAGEID-->', pg.id)
    .replace('<!--NAV-->', () => nav).replace('<!--NAVALL-->', () => navAll).replace('<!--NAVALL-->', () => navAll)
    .replace('<!--NEWHREF-->', pg.id === 'home' ? '#top' : base)
    .replace('<!--LANGOPTS-->', LANGS.map(l => `<option value="${l}" data-href="${ALL[l].meta.path}${langSlug(l)}"${l === lang ? ' selected' : ''}>${esc(ALL[l].meta.langName)}</option>`).join(''))
    .replace('<!--LANGLINKS-->', LANGS.map(l => `<a href="${ALL[l].meta.path}${langSlug(l)}" hreflang="${ALL[l].meta.htmlLang}" lang="${ALL[l].meta.htmlLang}" style="margin:0 6px">${esc(ALL[l].meta.langName)}</a>`).join(''))
    .replace('<!--BODY-->', () => body)
    .replace('<!--SCRIPTS-->', scripts);
  return html.replace(/\{\{([\w.]+)\}\}/g, (m, key) => key === 'build' ? BUILD : key === 'home' ? base : esc(tr(L, key)));
}


module.exports = { i18nFile, ROOT, SITE_URL, LANGS, BUILD, ALL, FONTS, E, SIGN_SLUG, PL, BENEFIC, DIGBALA, GOCHAR_GOOD, NAVS, NAVS_MORE, BUNDLES, PLACES_PAGES,
  read, json, esc, isObj, merge, deepMap, translit, url, tr, list, head, icon, gimg, appBadges, infoHtml, cityHtml, personHtml, render };
