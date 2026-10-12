/* Kundali Ganit — static build for Vercel.
   Generates one SEO-ready page per language (/, /hi/, /gu/, /ta/, /te/, /kn/) into ./public,
   plus config.js (Supabase public keys from env), sitemap.xml and robots.txt. */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname, OUT = path.join(ROOT, 'public');
const SITE_URL = (process.env.SITE_URL || 'https://kundali-ganit.vercel.app').replace(/\/$/, '');
const LANGS = ['en', 'hi', 'gu', 'ta', 'te', 'kn'];
const BUILD = Date.now().toString(36);

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = p => JSON.parse(read(p));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) { const o = { ...a }; for (const k of Object.keys(b || {})) o[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; return o; }
const deepMap = (v, f) => Array.isArray(v) ? v.map(x => deepMap(x, f)) : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepMap(x, f)])) : typeof v === 'string' ? f(v) : v;

// ---- Transliteration of Sanskrit terms from Devanagari ----
const BASE = { gu: 0x0A80, te: 0x0C00, kn: 0x0C80 };
const offsetTr = (s, base) => [...s].map(ch => { const c = ch.codePointAt(0); return c >= 0x0900 && c <= 0x097F ? String.fromCodePoint(c - 0x0900 + base) : ch; }).join('');
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
  const fromSanskrit = { names: deepMap({ yoga27: SKT.yoga27, karana: SKT.karana, val: SKT.val, houseName: SKT.houseName, syll: SKT.syll }, s => translit(lang, s)) };
  return merge(merge(EN, fromSanskrit), own);
}
const ALL = Object.fromEntries(LANGS.map(l => [l, locale(l)]));
const url = l => SITE_URL + ALL[l].meta.path;

// ---- Fonts per language ----
const FONTS = {
  en: { families: [], body: "'Hind'", display: "'Marcellus'" },
  hi: { families: ['Tiro+Devanagari+Hindi'], body: "'Hind'", display: "'Marcellus', 'Tiro Devanagari Hindi'" },
  gu: { families: ['Hind+Vadodara:wght@400;500;600;700'], body: "'Hind Vadodara', 'Hind'", display: "'Marcellus', 'Hind Vadodara'", bold: true },
  ta: { families: ['Hind+Madurai:wght@400;500;600;700'], body: "'Hind Madurai', 'Hind'", display: "'Marcellus', 'Hind Madurai'", bold: true },
  te: { families: ['Hind+Guntur:wght@400;500;600;700'], body: "'Hind Guntur', 'Hind'", display: "'Marcellus', 'Hind Guntur'", bold: true },
  kn: { families: ['Noto+Sans+Kannada:wght@400;500;600;700'], body: "'Noto Sans Kannada', 'Hind'", display: "'Marcellus', 'Noto Sans Kannada'", bold: true }
};

function head(lang) {
  const L = ALL[lang], f = FONTS[lang];
  const fam = ['Marcellus', 'Hind:wght@400;500;600;700', 'IBM+Plex+Mono:wght@400;500', 'Tiro+Devanagari+Sanskrit', ...f.families].map(x => 'family=' + x).join('&');
  const alternates = LANGS.map(l => `<link rel="alternate" hreflang="${ALL[l].meta.htmlLang}" href="${url(l)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${url('en')}">`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebApplication', '@id': url(lang) + '#app', name: L.brand.name, url: url(lang), description: L.meta.description, inLanguage: L.meta.htmlLang, applicationCategory: 'LifestyleApplication', operatingSystem: 'Any', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
      { '@type': 'FAQPage', '@id': url(lang) + '#faq', inLanguage: L.meta.htmlLang, mainEntity: L.faq.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) },
      { '@type': 'WebSite', '@id': SITE_URL + '/#site', name: 'Kundali Ganit', url: SITE_URL + '/', inLanguage: LANGS.map(l => ALL[l].meta.htmlLang) }
    ]
  };
  // The browser only needs what it renders; static page text and FAQ are already in the HTML.
  const { static: _s, faq: _f, ...runtime } = L;
  const ogLocales = LANGS.filter(l => l !== lang).map(l => `<meta property="og:locale:alternate" content="${ALL[l].meta.ogLocale}">`).join('\n');
  return `<title>${esc(L.meta.title)}</title>
<meta name="description" content="${esc(L.meta.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url(lang)}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kundali Ganit">
<meta property="og:title" content="${esc(L.meta.title)}">
<meta property="og:description" content="${esc(L.meta.description)}">
<meta property="og:url" content="${url(lang)}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="${L.meta.ogLocale}">
${ogLocales}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(L.meta.title)}">
<meta name="twitter:description" content="${esc(L.meta.description)}">
<meta name="twitter:image" content="${SITE_URL}/og.png">
<meta name="theme-color" content="#16173B">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fam}&display=swap">
<style>:root{--f-body:${f.body}, system-ui, -apple-system, 'Segoe UI', sans-serif;--f-display:${f.display}, Georgia, serif}${f.bold ? '.hero h1,.sec-head h2,.profile h2,.graha h3,.now-card h3,.gate h3,.modal h2,.formcard h2{font-weight:600;letter-spacing:0}' : ''}</style>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script>window.I18N=${JSON.stringify(runtime).replace(/</g, '\\u003c')};</script>`;
}

const icon = spec => {
  const [kind, v] = spec.split(':');
  if (kind === 'gr') return `<svg class="gimg" viewBox="0 0 64 64" aria-hidden="true"><use href="#gr-${v}"/></svg>`;
  if (kind === 'rs') return `<svg class="ui" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${v}"/></svg>`;
  return `<svg class="ui" viewBox="0 0 24 24" aria-hidden="true"><use href="#${v}"/></svg>`;
};

function page(lang) {
  const L = ALL[lang];
  let html = read('src/template.html');
  html = html.replace('<!--HEAD-->', head(lang))
    .replace('<!--SPRITE-->', read('src/sprite.svg'))
    .replace('<!--LANGOPTS-->', LANGS.map(l => `<option value="${l}" data-href="${ALL[l].meta.path}"${l === lang ? ' selected' : ''}>${esc(ALL[l].meta.langName)}</option>`).join(''))
    .replace('<!--LANGLINKS-->', LANGS.map(l => `<a href="${ALL[l].meta.path}" hreflang="${ALL[l].meta.htmlLang}" lang="${ALL[l].meta.htmlLang}" style="margin:0 6px">${esc(ALL[l].meta.langName)}</a>`).join(''))
    .replace('<!--FEATURES-->', L.static.features.map(f => `<article class="card feature"><span class="fi">${icon(f.icon)}</span><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p></article>`).join(''))
    .replace('<!--ABOUT-->', L.static.about.map(a => `<article class="card"><h3>${esc(a.h)}</h3>${a.p.map(p => `<p>${esc(p)}</p>`).join('')}</article>`).join(''))
    .replace('<!--FAQ-->', L.faq.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q.q)}<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="ans">${esc(q.a)}</div></details>`).join(''));
  html = html.replace(/\{\{([\w.]+)\}\}/g, (m, key) => {
    if (key === 'build') return BUILD;
    if (key === 'home') return L.meta.path;
    const v = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L);
    if (v == null) throw new Error(`Missing translation "${key}" for ${lang}`);
    return esc(v);
  });
  return html;
}

// ---- Write output ----
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const l of LANGS) {
  const dir = path.join(OUT, ALL[l].meta.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(l));
}
for (const f of ['app.js', 'places.js', 'styles.css']) fs.copyFileSync(path.join(ROOT, 'src', f), path.join(OUT, 'assets', f));
for (const f of fs.readdirSync(path.join(ROOT, 'static'))) fs.copyFileSync(path.join(ROOT, 'static', f), path.join(OUT, f));

fs.writeFileSync(path.join(OUT, 'config.js'), `window.KG_CONFIG=${JSON.stringify({ supabaseUrl: process.env.SUPABASE_URL || '', supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '' })};\n`);

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map(l => `  <url>
    <loc>${url(l)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${l === 'en' ? '1.0' : '0.9'}</priority>
${LANGS.map(a => `    <xhtml:link rel="alternate" hreflang="${ALL[a].meta.htmlLang}" href="${url(a)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${url('en')}"/>
  </url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

const missing = [];
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) missing.push('SUPABASE_URL / SUPABASE_ANON_KEY (login will be disabled)');
if (!process.env.SITE_URL) missing.push('SITE_URL (using ' + SITE_URL + ' for canonical URLs and sitemap)');
console.log(`Built ${LANGS.length} language pages into ./public (build ${BUILD}).`);
if (missing.length) console.warn('Note: env not set → ' + missing.join('; '));
