/* Writes the rewrites for the server-rendered search pages into vercel.json, from the city and sign lists.
   Run after adding a city: node scripts/gen-vercel.js  (build.js fails if vercel.json is out of date). */
const fs = require('fs'), path = require('path');
const D = require('../lib/seo-data.js'), { SIGN_SLUG } = require('../lib/site.js');
const file = path.join(__dirname, '..', 'vercel.json');
function rewrites() {
  const cities = D.CITIES.map(c => c.slug).join('|'), signs = SIGN_SLUG.join('|'), langs = 'hi|gu|ta|te|kn';
  const out = [];
  for (const [pre, t] of [['panchang', 'panchang'], ['rahu-kaal', 'rahu'], ['choghadiya', 'chogh']]) {
    out.push({ source: `/${pre}/:slug(${cities})/`, destination: `/api/[fn]?fn=seo&t=${t}&lang=en&slug=:slug` });
    out.push({ source: `/:lang(${langs})/${pre}/:slug(${cities})/`, destination: `/api/[fn]?fn=seo&t=${t}&lang=:lang&slug=:slug` });
  }
  out.push({ source: `/rashifal/:slug(${signs})/`, destination: '/api/[fn]?fn=seo&t=rashi&lang=en&slug=:slug' });
  out.push({ source: `/:lang(${langs})/rashifal/:slug(${signs})/`, destination: '/api/[fn]?fn=seo&t=rashi&lang=:lang&slug=:slug' });
  for (const [kind, t] of [['weekly', 'rweek'], ['monthly', 'rmonth']]) {
    out.push({ source: `/rashifal/:slug(${signs})/${kind}/`, destination: `/api/[fn]?fn=seo&t=${t}&lang=en&slug=:slug` });
    out.push({ source: `/:lang(${langs})/rashifal/:slug(${signs})/${kind}/`, destination: `/api/[fn]?fn=seo&t=${t}&lang=:lang&slug=:slug` });
  }
  out.push({ source: '/sitemap-daily.xml', destination: '/api/[fn]?fn=seo&t=sitemap' });
  return out;
}
function merged() {
  const v = JSON.parse(fs.readFileSync(file, 'utf8'));
  v.rewrites = [...(v.rewrites || []).filter(r => !/fn=seo/.test(r.destination)), ...rewrites()];
  return JSON.stringify(v, null, 2) + '\n';
}
if (require.main === module) { fs.writeFileSync(file, merged()); console.log('vercel.json rewrites updated'); }
module.exports = { merged, file };
