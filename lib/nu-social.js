/* Numerology reel captions (Hindi + English, for Instagram and Facebook) and the comment reply maker.
   Used by /api/social/?caption=1&kind=nu|reply (lib/routes/social.js). */
const NU = require('../src/js/numcore.js');
const S = require('./site.js');
const { translator } = require('./i18n-server.js');

const N9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const datesOf = n => [n, n + 9, n + 18, n + 27].filter(d => d <= 31);
const yd = y => NU.reduce(NU.sumDigits(y));
const host = () => S.SITE_URL.replace(/^https?:\/\//, '');
function yearRel(n, y) { const a = NU.rel(n, yd(y)), b = NU.rel(yd(y), n); return a === 'F' || b === 'F' ? (a === 'E' || b === 'E' ? 'N' : 'F') : (a === 'E' || b === 'E' ? 'E' : 'N'); }
function months(n, y, lang) {
  const v = NU.reduce(n + yd(y)), L = translator(lang).L, f = new Intl.DateTimeFormat(L('meta.locale') || 'en-IN', { month: 'short', timeZone: 'UTC' });
  const m = Array.from({ length: 12 }, (_, i) => ({ i, f: NU.fit(NU.reduce(v + i + 1), n, null) }));
  return { v, best: m.filter(x => x.f === 'best').map(x => f.format(Date.UTC(y, x.i, 1))), bad: m.filter(x => x.f === 'avoid').map(x => f.format(Date.UTC(y, x.i, 1))) };
}
const ig = () => { try { const l = require('./social-links.js').links().instagram; return l ? '@' + l.handle : ''; } catch (e) { return ''; } };
const follow = () => `➕ Follow Grahavani${ig() ? ' (Instagram ' + ig() + ' · Facebook)' : ''} — रोज़ राशिफल, पंचांग और अंक ज्योतिष | Daily Rashifal, Panchang & Numerology`;

function captionAll(y) {
  const hi = translator('hi').t, en = translator('en').t;
  const by = r => N9.filter(n => yearRel(n, y) === r);
  return [
    `🔢 ${hi('sc.nu.allH', { y })} | ${en('sc.nu.allH', { y })} ✨`, '',
    `${hi('sc.nu.allSub')} | ${en('sc.nu.allSub')}`, '',
    `🌟 ${en('seo.nu.toneL.best')} | ${hi('seo.nu.toneL.best')}: Mulank ${by('F').join(', ')}`,
    by('N').length ? `🔸 ${en('seo.nu.toneL.neutral')} | ${hi('seo.nu.toneL.neutral')}: Mulank ${by('N').join(', ')}` : '',
    by('E').length ? `⚠️ ${en('seo.nu.toneL.avoid')} | ${hi('seo.nu.toneL.avoid')}: Mulank ${by('E').join(', ')}` : '', '',
    `👇 कमेंट में अपनी जन्म तिथि लिखें — हम आपका मूलांक और ${y} का फल बताएँगे | Comment your date of birth — we'll reply with your Mulank & ${y} prediction`, '',
    follow(),
    `🔗 Free numerology calculator: ${host()}/numerology/ (link in bio)`, '',
    `#numerology #mulank #ankjyotish #numerology${y} #grahavani`
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n').trim();
}
function captionOne(n, y) {
  const hi = translator('hi'), en = translator('en'), mh = months(n, y, 'hi'), me = months(n, y, 'en');
  const d = datesOf(n).join(', ');
  return [
    `🔢 ${hi.t('sc.nu.yearH', { n, y })} | ${en.t('sc.nu.yearH', { n, y })} ✨`,
    `जन्म तारीख ${d} वालों के लिए | For everyone born on ${d}`, '',
    hi.L('nu.num')[mh.v].py, en.L('nu.num')[me.v].py, '',
    `🟢 ${en.t('sc.nu.best')}: ${me.best.join(', ')} | ${hi.t('sc.nu.best')}: ${mh.best.join(', ')}`,
    me.bad.length ? `🔴 ${en.t('sc.nu.care')}: ${me.bad.join(', ')} | ${hi.t('sc.nu.care')}: ${mh.bad.join(', ')}` : '',
    `💎 Lucky numbers ${NU.FRIEND[n].join(', ')} · ${en.L('names.vara')[NU.DAY[n]]} · ${en.t('gm.g.' + NU.GEM[n])}`, '',
    `👇 ${d} तारीख को जन्मे किसी अपने को टैग करें | Tag someone born on ${d}`, '',
    follow(),
    `🔗 Full ${y} prediction: ${host()}/numerology/mulank-${n}-${y}/ (link in bio)`, '',
    `#numerology #mulank${n} #numerology${y} #ankjyotish #grahavani`
  ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n').trim();
}
// "16-08-1995", "16/8/1995", "16.08.95", "1995-08-16" → { d, m, y }
function parseDob(s) {
  const t = String(s || '').trim(); let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/), d, mo, y;
  if (m) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else if ((m = t.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2}|\d{4})$/))) { [d, mo, y] = [+m[1], +m[2], +m[3]]; if (y < 100) y += y > 30 ? 1900 : 2000; }
  else return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d && y >= 1900 && y <= 2100 ? { d, m: mo, y } : null;
}
function reply(dob, lang, year) {
  const b = parseDob(dob); if (!b) return null;
  const { t, L } = translator(lang), mu = NU.mulank(b.d), bh = NU.bhagyank(b.d, b.m, b.y), py = NU.personalYear(b.d, b.m, year);
  const url = host() + (S.ALL[lang] ? S.ALL[lang].meta.path : '/') + `numerology/mulank-${mu}-${year}/`;
  return { mu, bh, py, text: t('sc.nu.reply', { mu, bh, g: L('names.graha')[NU.PLANET[mu]], y: year, py, pyt: L('nu.num')[py].py, lucky: NU.luckyFor(mu, bh).join(', '), color: L('nu.num')[mu].color, day: L('names.vara')[NU.DAY[mu]], url }) };
}
module.exports = { captionAll, captionOne, reply, parseDob };
