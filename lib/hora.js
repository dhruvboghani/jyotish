/* Hora (planetary hours) and regional calendar dates for a day.
   Hora: 12 equal parts of daytime (sunrise→sunset) and 12 of night (sunset→next sunrise). The first day hora
   belongs to the weekday lord; each next hora goes to the next planet in the Chaldean order
   (Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon), continuing through the night. */
const J = require('./engine.js');

const DAY = 86400000;
const toMs = jd => Math.round((jd - 2440587.5) * DAY), toJd = ms => ms / DAY + 2440587.5;
const CHALDEAN = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
const DAY_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
// Benefic horas suit new work; Sun is for authority/government; Mars and Saturn call for care.
const HORA_QUALITY = { Jupiter: 'good', Venus: 'good', Mercury: 'good', Moon: 'good', Sun: 'neutral', Mars: 'bad', Saturn: 'bad' };

function horas(rise, set, nextRise, weekday) {
  const start = CHALDEAN.indexOf(DAY_LORD[weekday]), dl = (set - rise) / 12, nl = (nextRise - set) / 12, out = [];
  for (let i = 0; i < 24; i++) {
    const lord = CHALDEAN[(start + i) % 7], night = i >= 12, k = night ? i - 12 : i;
    const a = night ? set + k * nl : rise + k * dl, b = night ? set + (k + 1) * nl : rise + (k + 1) * dl;
    out.push({ part: night ? 'night' : 'day', lord, quality: HORA_QUALITY[lord], start: toMs(a), end: toMs(b) });
  }
  return out;
}

// ---------- Regional calendars ----------
// 60-year cycle (Prabhava … Akshaya). Southern (Ugadi) count: index = (Shaka + 11) mod 60.
// Tamil count runs from Mesha sankranti (Chithirai 1): index = (solar year − 1987) mod 60.
const samvatsaraOfShaka = shaka => ((shaka + 11) % 60 + 60) % 60;

// Tamil solar date: month = sidereal Sun's sign at sunset; day 1 is the day of the sankranti if it falls
// before that day's sunset, otherwise the next day.
function tamilDate({ year, month, day, lat, lon, tzMinutes, sunsetJd, sunTimes }) {
  const sunAt = jd => J.sidereal(jd).lon.Sun;
  const sign = Math.floor(sunAt(sunsetJd) / 30);
  let lo = sunsetJd - 32, hi = sunsetJd; // the Sun spends at most ~31.5 days in a sign
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (Math.floor(sunAt(mid) / 30) === sign) hi = mid; else lo = mid; }
  const ingressMs = toMs(hi), local = new Date(ingressMs + tzMinutes * 60000);
  const iy = local.getUTCFullYear(), im = local.getUTCMonth() + 1, id = local.getUTCDate();
  const st = sunTimes(iy, im, id, lat, lon, tzMinutes);
  let day1 = Date.UTC(iy, im - 1, id);
  if (st.set != null && hi >= st.set) day1 += DAY;
  const dayNo = Math.round((Date.UTC(year, month - 1, day) - day1) / DAY) + 1;
  const solarYear = year - (month <= 4 && sign >= 8 ? 1 : 0);
  return { month: sign, day: dayNo, year: ((solarYear - 1987) % 60 + 60) % 60, ingress: ingressMs };
}

/* Gujarati: amanta months, sud (bright) / vad (dark) fortnights, Vikram Samvat counted from Kartik Shukla 1
   (the day after Diwali). Chaitradi Vikram year − 1 for Chaitra…Ashvin. */
function gujaratiDate({ lunarMonth, adhika, tithiIndex, vikramSamvat }) {
  return {
    month: lunarMonth, adhika, paksha: tithiIndex < 15 ? 'sud' : 'vad', tithi: (tithiIndex % 15) + 1,
    samvat: lunarMonth <= 6 ? vikramSamvat - 1 : vikramSamvat
  };
}

module.exports = { horas, HORA_QUALITY, CHALDEAN, tamilDate, gujaratiDate, samvatsaraOfShaka, toJd };
