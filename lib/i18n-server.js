/* Minimal server-side translator for emails and calendar feeds (same locale files as the site). */
const LOC = { en: require('../locales/en.json'), hi: require('../locales/hi.json'), gu: require('../locales/gu.json'), ta: require('../locales/ta.json'), te: require('../locales/te.json'), kn: require('../locales/kn.json') };
const SKT = require('../locales/_sanskrit.json'), { translit } = require('./translit.js');
const tr = (v, lang) => Array.isArray(v) ? v.map(x => tr(x, lang)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, tr(x, lang)])) : typeof v === 'string' ? translit(lang, v) : v;
// Same Sanskrit names the site build adds (mantras, yogas, karanas…), unless the locale has its own
for (const lang of ['hi', 'gu', 'ta', 'te', 'kn']) for (const k of ['yoga27', 'karana', 'val', 'houseName', 'syll', 'mantra', 'samvatsara', 'japaMantra']) {
  const names = LOC[lang].names = LOC[lang].names || {};
  if (names[k] == null && SKT[k] != null) names[k] = tr(SKT[k], lang);
}
const get = (o, path) => path.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
function translator(lang) {
  const L = LOC[lang] || LOC.en;
  const t = (key, params) => {
    let s = get(L, key); if (s == null) s = get(LOC.en, key); if (s == null) return key;
    return typeof s === 'string' && params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? val(params[k]) : m)) : s;
  };
  const join = arr => { try { return new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(arr); } catch (e) { return arr.join(', '); } };
  const val = v => v == null ? '' : typeof v !== 'object' ? String(v) : v.list ? join(v.list.map(val)) : v.g ? (get(L, 'names.graha.' + v.g) || get(LOC.en, 'names.graha.' + v.g)) : v.r !== undefined ? (get(L, 'names.rashi')||LOC.en.names.rashi)[v.r] : v.k ? t(v.k, v.p) : '';
  return { t, L: (k) => get(L, k) ?? get(LOC.en, k), lang: LOC[lang] ? lang : 'en' };
}
module.exports = { translator };
