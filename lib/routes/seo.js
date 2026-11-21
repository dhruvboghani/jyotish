// GET /api/seo?t=panchang|rahu|chogh|rashi&lang=en&slug=<city or sign>   — server-rendered daily pages
// GET /api/seo?t=sitemap                                                  — sitemap of those pages, lastmod today
// Public URLs (/panchang/delhi/, /hi/rahu-kaal/surat/, /rashifal/mesha/ …) are rewritten here by vercel.json.
// Pages are cached at the edge until the next local midnight, so each one is computed about once a day.
const S = require('../site.js');
const SP = require('../seo-pages.js');
const D = require('../seo-data.js');
const SP2 = require('../seo-pages2.js');

const KINDS = { panchang: SP.cityPanchang, rahu: SP.cityRahu, chogh: SP.cityChogh };
const untilMidnight = tzMin => { const now = Date.now(), loc = new Date(now + tzMin * 60000); const next = Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth(), loc.getUTCDate() + 1) - tzMin * 60000; return Math.max(60, Math.round((next - now) / 1000) + 30); };
const send = (res, status, type, body, sMaxAge) => {
  res.setHeader('Content-Type', type);
  const edgeAge = Math.max(Number(sMaxAge) || 0, 14400);
  res.setHeader('Cache-Control', status === 200 ? `public, max-age=3600, s-maxage=${edgeAge}, stale-while-revalidate=86400` : 'public, max-age=60, s-maxage=300');
  if (typeof res.status === 'function') res.status(status); else res.statusCode = status;
  if (typeof res.send === 'function') return res.send(body);
  return res.end(body);
};

function notFound(lang) {
  const L = S.ALL[lang];
  const pg = { id: 'notfound', slug: '', title: L.seo.cp.allCities, desc: L.seo.cp.indexLede, noindex: true, bundle: 'base', body: `<main class="wrap page"><div class="page-hero"><h1>404</h1><p class="lede"><a href="${L.meta.path}panchang/cities/">${S.esc(L.seo.cp.allCities)}</a> · <a href="${L.meta.path}rashifal/">${S.esc(L.pages.rashifal.name)}</a></p></div></main>` };
  return S.render(lang, pg);
}

function sitemap() {
  const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const urls = [...SP.dailySlugs(), ...SP2.dailySlugs2()].flatMap(slug => S.LANGS.map(l => `  <url>
    <loc>${S.url(l, slug)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${/^panchang\//.test(slug) || /^rashifal\//.test(slug) ? '0.8' : '0.7'}</priority>
${S.LANGS.map(a => `    <xhtml:link rel="alternate" hreflang="${S.ALL[a].meta.htmlLang}" href="${S.url(a, slug)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${S.url('en', slug)}"/>
  </url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

module.exports = async (req, res) => {
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const lang = S.LANGS.includes(q.lang) ? q.lang : 'en', t = String(q.t || ''), slug = String(q.slug || '').toLowerCase();
  try {
    // Blog (posts from the database; cached 5 minutes at the edge so a new post shows up quickly)
    if (t === 'blog' || t === 'post' || t === 'blogmap') {
      const B = require('../blog.js');
      if (t === 'blogmap') return send(res, 200, 'application/xml; charset=utf-8', await B.sitemap(), 900);
      if (t === 'post') { const pg = /^[a-z0-9-]{1,90}$/.test(slug) ? await B.postPage(lang, slug) : null; return pg ? send(res, 200, 'text/html; charset=utf-8', S.render(lang, pg), 300) : send(res, 404, 'text/html; charset=utf-8', notFound(lang)); }
      const cat = B.CATS.includes(slug) ? slug : null; if (slug && !cat) return send(res, 404, 'text/html; charset=utf-8', notFound(lang));
      const page = Math.max(1, Math.min(200, parseInt(q.p, 10) || 1));
      return send(res, 200, 'text/html; charset=utf-8', S.render(lang, await B.indexPage(lang, { cat, page })), 300);
    }
    if (t === 'sitemap') return send(res, 200, 'application/xml; charset=utf-8', sitemap(), untilMidnight(330));
    if (KINDS[t]) {
      const c = D.CITY[slug]; if (!c) return send(res, 404, 'text/html; charset=utf-8', notFound(lang));
      const pg = KINDS[t](lang, c);
      return send(res, 200, 'text/html; charset=utf-8', S.render(lang, pg), untilMidnight(D.cityToday(c).tz));
    }
    if (t === 'rweek' || t === 'rmonth') {
      const s = S.SIGN_SLUG.indexOf(slug); if (s < 0) return send(res, 404, 'text/html; charset=utf-8', notFound(lang));
      return send(res, 200, 'text/html; charset=utf-8', S.render(lang, SP2.signPeriod(lang, s, t === 'rweek' ? 'weekly' : 'monthly')), untilMidnight(330));
    }
    if (t === 'rashi') {
      const s = S.SIGN_SLUG.indexOf(slug); if (s < 0) return send(res, 404, 'text/html; charset=utf-8', notFound(lang));
      return send(res, 200, 'text/html; charset=utf-8', S.render(lang, SP.signDaily(lang, s)), untilMidnight(330));
    }
    return send(res, 404, 'text/html; charset=utf-8', notFound(lang));
  } catch (e) {
    console.error('seo page', t, slug, lang, e);
    return send(res, 500, 'text/plain; charset=utf-8', 'Error');
  }
};
module.exports.notFound = notFound;
