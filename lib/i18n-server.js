/* Minimal server-side translator for emails and calendar feeds (same locale files as the site). */
const LOC = { en: require('../locales/en.json'), hi: require('../locales/hi.json'), gu: require('../locales/gu.json'), ta: require('../locales/ta.json'), te: require('../locales/te.json'), kn: require('../locales/kn.json') };
const get = (o, path) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
function translator(lang) {
  const L = LOC[lang] || LOC.en;
  const t = (key, params) => {
    let s = get(L, key); if (s == null) s = get(LOC.en, key); if (s == null) return key;
    return typeof s === 'string' && params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? val(params[k]) : m)) : s;
  };
  const val = v => v == null ? '' : typeof v !== 'object' ? String(v) : v.g ? (get(L, 'names.graha.' + v.g) || get(LOC.en, 'names.graha.' + v.g)) : v.r !== undefined ? (get(L, 'names.rashi')||LOC.en.names.rashi)[v.r] : v.k ? t(v.k, v.p) : '';
  return { t, L: (k) => get(L, k) ?? get(LOC.en, k), lang: LOC[lang] ? lang : 'en' };
}
module.exports = { translator };
