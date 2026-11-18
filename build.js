/* Grahavani — static build for Vercel.
   Generates one SEO-ready page per language (/, /hi/, /gu/, /ta/, /te/, /kn/) into ./public,
   plus config.js (Supabase public keys from env), sitemap.xml and robots.txt. */
const fs = require('fs');
const path = require('path');

// One id per deploy for ?v= cache busting; the server-rendered pages read the same id
if (!process.env.GV_BUILD) process.env.GV_BUILD = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 10) || Date.now().toString(36);
fs.writeFileSync(path.join(__dirname, '.build-id'), process.env.GV_BUILD);
const S = require('./lib/site.js');
const { ROOT, SITE_URL, LANGS, BUILD, ALL, E, SIGN_SLUG, PL, BENEFIC, DIGBALA, GOCHAR_GOOD, BUNDLES, read, json, esc, url, tr, list, icon, gimg, render } = S;
const OUT = path.join(ROOT, 'public');
const SP = require('./lib/seo-pages.js');
{ // compare the rewrites only: the platform may reformat vercel.json in its build checkout
  const G = require('./scripts/gen-vercel.js'), rw = t => JSON.stringify((JSON.parse(t).rewrites || []).filter(r => /fn=seo/.test(r.destination)));
  if (rw(fs.readFileSync(G.file, 'utf8')) !== rw(G.merged())) { const m = 'vercel.json rewrites are out of date: run node scripts/gen-vercel.js'; if (process.env.VERCEL) console.warn('Warning: ' + m); else throw new Error(m); } }
const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
if (/^sb_secret_|service_role/.test(PUBLIC_KEY)) throw new Error('A Supabase SECRET key was given as the public key. Use the publishable (sb_publishable_…) key instead.');

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
  ${SP.learnIndexExtra(L.meta.code)}
</main>`;
}
const legalBody = (L, k) => `<main class="wrap page article"><div class="page-hero"><h1>${esc(L.legal[k + 'Title'])}</h1><p class="lede">${esc(L.legal.updated)}</p></div><div class="card prose">${L.legal[k].map(a => `<h2>${esc(a.h)}</h2>${a.p.map(p => `<p>${esc(p)}</p>`).join('')}`).join('')}</div></main>`;

function pagesFor(L) {
  const tf = id => (L.seo.tf && L.seo.tf[id]) ? { faq: L.seo.tf[id], toolFaq: true } : {};
  const P = (id, slug, extra = {}) => ({ id, slug, title: extra.title || L.pages[id].title, desc: extra.desc || L.pages[id].description, crumbs: extra.crumbs || (slug ? L2 => [{ name: L2.pages[id].name, item: url(L2.meta.code, slug) }] : null), bundle: BUNDLES[id] ? id : 'base', ...(extra.noindex ? {} : tf(id)), ...extra });
  const out = [
    P('home', '', { title: L.meta.title, desc: L.meta.description, priority: '1.0', freq: 'weekly' }),
    P('matching', 'matching/', { priority: '0.9', freq: 'monthly' }),
    P('panchang', 'panchang/', { priority: '0.9', freq: 'daily' }),
    P('calendar', 'calendar/', { priority: '0.9', freq: 'monthly' }),
    P('rashifal', 'rashifal/', { priority: '0.9', freq: 'daily' }),
    P('names', 'names/', { priority: '0.8', freq: 'monthly' }),
    P('numerology', 'numerology/', { priority: '0.8', freq: 'monthly' }),
    P('muhurta', 'muhurta/', { priority: '0.8', freq: 'weekly' }),
    P('family', 'family/', { noindex: true }),
    P('sadhana', 'sadhana/', { noindex: true }),
    P('today', 'today/', { noindex: true }),
    P('me', 'me/', { noindex: true }),
    P('settings', 'settings/', { noindex: true }),
    P('admin', 'admin/', { noindex: true }),
    P('puja', 'puja/', { priority: '0.8', freq: 'weekly' }),
    P('vrat', 'vrat/', { priority: '0.8', freq: 'weekly' }),
    P('eclipses', 'eclipses/', { priority: '0.8', freq: 'monthly' }),
    P('download', 'download/', { priority: '0.6', freq: 'monthly' }),
    P('japa', 'japa/', { priority: '0.7', freq: 'monthly' }),
    P('tithi', 'tithi-dates/', { priority: '0.7', freq: 'monthly' }),
    P('prashna', 'prashna/', { priority: '0.7', freq: 'monthly' }),
    P('biodata', 'biodata/', { priority: '0.7', freq: 'monthly' }),
    P('delivery', 'delivery-muhurat/', { priority: '0.7', freq: 'monthly' }),
    P('business', 'business-kundali/', { priority: '0.7', freq: 'monthly' }),
    P('gochar', 'gochar/', { priority: '0.9', freq: 'daily' }),
    P('mangal', 'mangal-dosha/', { priority: '0.9', freq: 'weekly' }),
    P('lagna', 'lagna/', { priority: '0.8', freq: 'weekly' }),
    P('love', 'love-match/', { priority: '0.9', freq: 'weekly' }),
    P('dasha', 'dasha-planner/', { priority: '0.8', freq: 'monthly' }),
    P('yogas', 'yogas/', { priority: '0.8', freq: 'monthly' }),
    P('navamsha', 'navamsha/', { priority: '0.8', freq: 'monthly' }),
    P('ashtakavarga', 'ashtakavarga/', { priority: '0.7', freq: 'monthly' }),
    P('varshphal', 'varshphal/', { priority: '0.8', freq: 'yearly' }),
    P('ratna', 'rashi-ratna/', { priority: '0.8', freq: 'monthly' }),
    P('sarpa', 'sarpa-dosha/', { priority: '0.8', freq: 'monthly' }),
    P('hora', 'hora-time/', { priority: '0.8', freq: 'daily' }),
    P('learn', 'learn/', { priority: '0.8', freq: 'monthly', body: learnIndex(L) }),
    P('share', 'share/', { noindex: true }),
    P('privacy', 'privacy/', { priority: '0.3', freq: 'yearly', body: legalBody(L, 'privacy') }),
    P('terms', 'terms/', { priority: '0.3', freq: 'yearly', body: legalBody(L, 'terms') })
  ];
  for (const p of PL) for (let h = 1; h <= 12; h++) { const x = learnPH(L, p, h); out.push({ id: 'learn-ph', slug: `learn/${p.toLowerCase()}-in-house-${h}/`, article: true, bundle: 'base', priority: '0.6', freq: 'yearly', ...x }); }
  for (let s = 0; s < 12; s++) { const x = learnLagna(L, s); out.push({ id: 'learn-lagna', slug: `learn/${SIGN_SLUG[s]}-lagna/`, article: true, bundle: 'base', priority: '0.6', freq: 'yearly', ...x }); }
  out.push(...SP.staticPages(L.meta.code)); // festivals, date lists, muhurat, yearly rashifal, sade sati, nakshatras, compatibility…
  out.push(...require('./lib/seo-pages2.js').staticPages2(L.meta.code)); // puja vidhi, month calendar, transits, retrogrades, mahadasha, yogas, planet-in-sign, baby names
  out.push(...require('./lib/seo-pages3.js').staticPages3(L.meta.code));
  out.push(...require('./lib/seo-dreams.js').dreamPages(L.meta.code)); // Swapna Shastra: dream meanings
  out.push(...require('./lib/seo-celebs.js').celebPages(L.meta.code)); // famous charts // numerology: Mulank, Bhagyank, compatibility, yearly, guides
  return out;
}

// ---- Write output ----
try {
  fs.rmSync(OUT, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch (e) {
  try {
    for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch (err) {}
}
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
const sitemap = [];
let count = 0;
const PAGESETS = Object.fromEntries(LANGS.map(l => [l, pagesFor(ALL[l])]));
// Sitemap <lastmod> only moves when a page's content really changes (hashes kept in seo-lastmod.json, committed)
const LASTMOD_FILE = path.join(ROOT, 'seo-lastmod.json');
const lastmodOld = fs.existsSync(LASTMOD_FILE) ? JSON.parse(fs.readFileSync(LASTMOD_FILE, 'utf8')) : {};
const lastmod = {}, changed = [];
const todayIso = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const hashOf = html => require('crypto').createHash('sha1').update(html.split(BUILD).join('')).digest('base64').slice(0, 16);
for (const l of LANGS) {
  for (const pg of PAGESETS[l]) {
    const dir = path.join(OUT, ALL[l].meta.path, pg.slug);
    fs.mkdirSync(dir, { recursive: true });
    const html = render(l, pg);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    if (!pg.noindex) {
      const key = l + ':' + pg.slug, h = hashOf(html), prev = lastmodOld[key];
      lastmod[key] = prev && prev[0] === h ? prev : [h, todayIso];
      if (lastmod[key][1] === todayIso) changed.push(url(l, pg.slug)); // pinged to IndexNow on the production deploy
    }
    count++;
  }
}
fs.writeFileSync(LASTMOD_FILE, JSON.stringify(lastmod, null, 0).replace(/\],"/g, '],\n"') + '\n');
fs.writeFileSync(path.join(ROOT, '.indexnow-urls'), changed.join('\n'));
for (const pg of PAGESETS.en) if (!pg.noindex) sitemap.push(pg);
fs.writeFileSync(path.join(OUT, '404.html'), require('./lib/routes/seo.js').notFound('en'));
for (const [name, parts] of Object.entries(BUNDLES)) {
  const src = parts.map(p => `// ---- ${p}.js ----\n` + read(`src/js/${p}.js`)).join('\n');
  fs.writeFileSync(path.join(OUT, 'assets', name + '.js'), `(function () {\n'use strict';\nconst ASSET_V = ${JSON.stringify(BUILD)};\n${src}\nboot();\n})();\n`);
}
for (const l of LANGS) { const f = S.i18nFile(l); fs.writeFileSync(path.join(OUT, 'assets', f.name), f.content); }
for (const f of ['places.js', 'styles.css', 'reelmaker.js']) fs.copyFileSync(path.join(ROOT, 'src', f), path.join(OUT, 'assets', f));
fs.copyFileSync(path.join(ROOT, 'node_modules', 'mp4-muxer', 'build', 'mp4-muxer.js'), path.join(OUT, 'assets', 'mp4-muxer.js')); // admin daily reels (MP4 in the browser)
fs.copyFileSync(path.join(ROOT, 'lib', 'engine.js'), path.join(OUT, 'assets', 'engine.js')); // same maths in the browser for the live sky wheel
fs.cpSync(path.join(ROOT, 'static'), OUT, { recursive: true }); // icons, manifest, sw.js, music/ for reels

fs.writeFileSync(path.join(OUT, 'config.js'), `window.KG_CONFIG=${JSON.stringify({ supabaseUrl: process.env.SUPABASE_URL || '', supabaseAnonKey: PUBLIC_KEY, vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '', gemShop: process.env.GEM_SHOP_URL || '', social: require('./lib/social-links.js').links() })};\n`);

const today = new Date().toISOString().slice(0, 10);
const urlXml = (slug, freq, priority) => LANGS.map(l => `  <url>
    <loc>${url(l, slug)}</loc>
    <lastmod>${(lastmod[l + ':' + slug] || [0, todayIso])[1]}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
${LANGS.map(a => `    <xhtml:link rel="alternate" hreflang="${ALL[a].meta.htmlLang}" href="${url(a, slug)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${url('en', slug)}"/>
  </url>`).join('\n');
const urlset = body => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
fs.writeFileSync(path.join(OUT, 'sitemap-pages.xml'), urlset(sitemap.filter(pg => !pg.seo).map(pg => urlXml(pg.slug, pg.freq, pg.priority)).join('\n')));
fs.writeFileSync(path.join(OUT, 'sitemap-guides.xml'), urlset(sitemap.filter(pg => pg.seo).map(pg => urlXml(pg.slug, pg.freq, pg.priority)).join('\n')));
// sitemap-daily.xml (city panchang, Rahu Kaal, Choghadiya, daily rashifal) is served by /api/seo so its lastmod is always today
const newest = arr => arr.reduce((m, pg) => LANGS.reduce((mm, l) => { const d = (lastmod[l + ':' + pg.slug] || [0, ''])[1]; return d > mm ? d : mm; }, m), '');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[['sitemap-pages.xml', newest(sitemap.filter(pg => !pg.seo))], ['sitemap-guides.xml', newest(sitemap.filter(pg => pg.seo))], ['sitemap-daily.xml', todayIso], ['sitemap-blog.xml', todayIso]].map(([f, d]) => `  <sitemap><loc>${SITE_URL}/${f}</loc><lastmod>${d || todayIso}</lastmod></sitemap>`).join('\n')}
</sitemapindex>
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /api/
Disallow: /share/
Disallow: /admin/

User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /share/
Disallow: /admin/

User-agent: Bingbot
Allow: /
Disallow: /api/
Disallow: /share/
Disallow: /admin/

User-agent: GPTBot
Allow: /
Disallow: /api/
Disallow: /share/
Disallow: /admin/

User-agent: PerplexityBot
Allow: /
Disallow: /api/
Disallow: /share/
Disallow: /admin/

User-agent: ClaudeBot
Allow: /
Disallow: /api/
Disallow: /share/
Disallow: /admin/

User-agent: Google-Extended
Allow: /
Disallow: /api/
Disallow: /share/
Disallow: /admin/

User-agent: Applebot-Extended
Allow: /
Disallow: /api/
Disallow: /share/
Disallow: /admin/

Sitemap: ${SITE_URL}/sitemap.xml
Host: ${SITE_URL.replace(/^https?:\/\//, '')}
`);

const missing = [];
if (!process.env.SUPABASE_URL || !PUBLIC_KEY) missing.push('SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (login will be disabled)');
if (!process.env.SITE_URL) missing.push('SITE_URL (using ' + SITE_URL + ' for canonical URLs and sitemap)');
console.log(`Built ${count} pages in ${LANGS.length} languages into ./public (build ${BUILD}).`);
if (missing.length) console.warn('Note: env not set → ' + missing.join('; '));
