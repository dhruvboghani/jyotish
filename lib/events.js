/* Personal reminder events: festivals/vrats chosen by the user for their city, plus transit and dasha
   alerts for one chart. Shared by the calendar feed (/api/ics) and the daily e-mail job. */
const J = require('./engine.js');
const P = require('./panchang.js');
const V = require('./varga.js');
const { translator } = require('./i18n-server.js');

const DAY = 86400000;
const memo = new Map();
function yearEvents(year, lat, lon, tz) {
  const k = [year, Math.round(lat * 2) / 2, Math.round(lon * 2) / 2, tz].join('|');
  if (!memo.has(k)) { memo.set(k, P.calendar({ year, lat: Math.round(lat * 2) / 2, lon: Math.round(lon * 2) / 2, tzMinutes: tz })); if (memo.size > 100) memo.delete(memo.keys().next().value); }
  return memo.get(k);
}
const KINDS = ['festival', 'ekadashi', 'purnima', 'amavasya', 'pradosh', 'sankashti', 'sankranti'];

function eventTitle(t, e) {
  if (e.kind === 'festival') return t('fest.' + e.id);
  if (e.kind === 'sankranti') return e.id === 'sankranti' ? t('cal.sankranti', { r: { r: e.sign } }) : t('fest.' + e.id);
  const masa = m => (t('names.masa') || [])[m] || '';
  if (e.id === 'ekadashi') return t('cal.ekadashi', { p: t('names.paksha.' + e.paksha), m: masa(e.month) });
  if (e.id === 'pradosh') return t('cal.pradosh', { p: t('names.paksha.' + e.paksha) });
  return t('cal.' + e.id) + (e.month != null ? ' · ' + masa(e.month) : '');
}
const kindOf = e => e.kind === 'vrat' ? e.id : e.kind;

// settings: { city:{lat,lon,tz,name}, kinds:[...], alerts:bool, alertBirth:{…}, lang }
function personalEvents(settings, fromMs, days) {
  const { t } = translator(settings.lang);
  const out = [];
  const city = settings.city || { lat: 28.6139, lon: 77.209, tz: 330, name: 'New Delhi' };
  const tz = Number.isFinite(city.tz) ? city.tz : 330;
  const kinds = new Set((settings.kinds && settings.kinds.length ? settings.kinds : KINDS).filter(k => KINDS.includes(k)));
  const toDate = ms => new Date(ms + tz * 60000).toISOString().slice(0, 10);
  const fromDate = toDate(fromMs), toDateS = toDate(fromMs + days * DAY);
  const y0 = +fromDate.slice(0, 4), y1 = +toDateS.slice(0, 4);
  for (let y = y0; y <= y1; y++) {
    for (const e of yearEvents(y, city.lat, city.lon, tz)) {
      if (e.date < fromDate || e.date > toDateS || !kinds.has(kindOf(e))) continue;
      out.push({ date: e.date, kind: kindOf(e), title: eventTitle(t, e), uid: `${e.date}-${e.id}${e.paksha || ''}` });
    }
  }
  if (settings.alerts && settings.alertBirth && settings.alertBirth.year) {
    try {
      const r = J.compute(settings.alertBirth), name = settings.alertBirth.name || '';
      for (const ev of V.upcoming(r, fromMs, days)) {
        if (ev.type === 'ingress' && ev.planet === 'Ketu') continue;
        const title = ev.type === 'ingress' ? t('events.ingress', { g: { g: ev.planet }, r: { r: ev.to } })
          : ev.type === 'md' ? t('events.md', { g: { g: ev.lord } }) : t('events.ad', { md: { g: ev.md }, ad: { g: ev.lord } });
        out.push({ date: toDate(ev.at), kind: 'alert', title: (name ? name + ': ' : '') + title, uid: `${ev.type}-${ev.planet || ev.lord}-${ev.at}` });
      }
      // Sade Sati start / end
      const M = r.P.Moon.sign, jd0 = fromMs / DAY + 2440587.5;
      const inZone = jd => { const rel = (Math.floor(J.transit(jd).lon.Saturn / 30) - M + 12) % 12; return rel === 11 || rel === 0 || rel === 1; };
      let prev = inZone(jd0);
      for (let d = 2; d <= days; d += 2) {
        const z = inZone(jd0 + d);
        if (z !== prev) out.push({ date: toDate((jd0 + d - 2440587.5) * DAY), kind: 'alert', title: (name ? name + ': ' : '') + t(z ? 'events.ssStart' : 'events.ssEnd'), uid: `ss-${d}-${z}` });
        prev = z;
      }
    } catch (e) { }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { personalEvents, KINDS };
