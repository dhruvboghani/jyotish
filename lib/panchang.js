/* Daily panchang with end times, muhurta periods and choghadiya; yearly festival and vrat calendar.
   All times are returned as UTC milliseconds; the client formats them in the place's offset. */
const J = require('./engine.js');

const DAY = 86400000;
const toJd = ms => ms / DAY + 2440587.5, toMs = jd => Math.round((jd - 2440587.5) * DAY);
const sid = jd => J.sidereal(jd);
const elongAt = jd => { const s = sid(jd).lon; return J.norm(s.Moon - s.Sun); };
const moonAt = jd => sid(jd).lon.Moon;
const yogaAt = jd => { const s = sid(jd).lon; return J.norm(s.Moon + s.Sun); };
const sunAt = jd => sid(jd).lon.Sun;

// Time (jd) after jd0 when f(jd) reaches the next multiple of `step`. f increases ~monotonically.
function nextBoundary(f, jd0, step, maxDays = 3) {
  const v0 = f(jd0), idx = Math.floor(v0 / step), target = ((idx + 1) * step) % 360;
  const passed = v => { const d = J.norm(v - target + 180) - 180; return d >= 0; };
  let lo = jd0, hi = jd0, h = 1 / 24;
  while (hi < jd0 + maxDays) { hi = lo + h; if (passed(f(hi))) break; lo = hi; }
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (passed(f(mid))) hi = mid; else lo = mid; }
  return { index: idx, end: hi };
}

function localMidnightJd(y, m, d, tzMinutes) { return toJd(Date.UTC(y, m - 1, d) - tzMinutes * 60000); }
function sunTimes(y, m, d, lat, lon, tzMinutes) {
  const ev = J.sunEvents(localMidnightJd(y, m, d, tzMinutes), lat, lon);
  return { rise: ev.rise, set: ev.set, noon: ev.noon };
}

const KARANA_FIXED = { 0: 'Kimstughna', 57: 'Shakuni', 58: 'Chatushpada', 59: 'Naga' };
const karanaName = k => KARANA_FIXED[k] || J.KARANA_MOV[(k - 1) % 7];

// Amanta lunar month for a given jd: name from the sidereal Sun's sign at the preceding new moon.
function newMoonNear(jdGuess) {
  // bisection on "before new moon" (elongation > 180) within ±2.5 days of the guess
  let a = jdGuess - 2.5, b = jdGuess + 2.5;
  for (let i = 0; i < 40; i++) { const mid = (a + b) / 2; if (elongAt(mid) > 180) a = mid; else b = mid; }
  return b;
}
function lunarMonth(jd) {
  const nm = newMoonNear(jd - elongAt(jd) / 12.19);
  const next = newMoonNear(nm + 29.53);
  const sunSign = Math.floor(sunAt(nm) / 30), nextSun = Math.floor(sunAt(next) / 30);
  return { month: (sunSign + 1) % 12, adhika: nextSun === sunSign, start: nm, end: next };
}

function choghadiya(rise, set, nextRise, weekday) {
  const NAMES = ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'];
  const GOOD = { Udveg: 'bad', Char: 'neutral', Labh: 'good', Amrit: 'good', Kaal: 'bad', Shubh: 'good', Rog: 'bad' };
  const dayStart = [0, 3, 6, 2, 5, 1, 4][weekday], nightStart = (dayStart + 5) % 7;
  const dl = (set - rise) / 8, nl = (nextRise - set) / 8, out = [];
  for (let i = 0; i < 8; i++) { const n = NAMES[(dayStart + 3 * i) % 7]; out.push({ part: 'day', name: n, quality: GOOD[n], start: toMs(rise + i * dl), end: toMs(rise + (i + 1) * dl) }); }
  for (let i = 0; i < 8; i++) { const n = NAMES[((nightStart - 2 * i) % 7 + 7) % 7]; out.push({ part: 'night', name: n, quality: GOOD[n], start: toMs(set + i * nl), end: toMs(set + (i + 1) * nl) }); }
  return out;
}

const RITU = ['Vasant', 'Grishma', 'Grishma', 'Varsha', 'Varsha', 'Sharad', 'Sharad', 'Hemant', 'Hemant', 'Shishir', 'Shishir', 'Vasant'];

function day({ year, month, day: d, lat, lon, tzMinutes }) {
  const st = sunTimes(year, month, d, lat, lon, tzMinutes);
  const nx = new Date(Date.UTC(year, month - 1, d + 1));
  const st2 = sunTimes(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate(), lat, lon, tzMinutes);
  if (st.rise == null || st.set == null) return { polar: true };
  const rise = st.rise, set = st.set, nextRise = st2.rise;
  const weekday = new Date(Date.UTC(year, month - 1, d)).getUTCDay();

  // Elements running at sunrise, with their end times, plus the next one if it starts before next sunrise.
  const chain = (f, step, count, nameOf) => {
    const list = []; let t = rise;
    for (let i = 0; i < 3 && t < nextRise; i++) {
      const b = nextBoundary(f, t + 1e-6, step);
      list.push({ index: b.index, name: nameOf ? nameOf(b.index) : b.index, end: toMs(b.end) });
      t = b.end;
    }
    return list;
  };
  const tithi = chain(elongAt, 12, 30);
  const nakshatra = chain(moonAt, 360 / 27, 27);
  const yoga = chain(yogaAt, 360 / 27, 27);
  const karana = chain(elongAt, 6, 60, karanaName);
  const sunLon = sunAt(rise), moonLon = moonAt(rise);
  const moonSignChange = (() => { const b = nextBoundary(moonAt, rise, 30); return b.end < nextRise ? toMs(b.end) : null; })();
  const lm = lunarMonth(rise);

  const len = set - rise, part = len / 8;
  const seg = n => ({ start: toMs(rise + (n - 1) * part), end: toMs(rise + n * part) });
  const RAHU = [8, 2, 7, 5, 6, 4, 3], GULIKA = [7, 6, 5, 4, 3, 2, 1], YAMA = [5, 4, 3, 2, 1, 7, 6];
  const mid = (rise + set) / 2, muhurta = len / 15;
  const nightMid = (set + nextRise) / 2;

  const civilYear = year;
  const vikram = civilYear + 57 - (lm.month >= 9 && month <= 4 ? 1 : 0); // Vikram Samvat begins at Chaitra Shukla 1
  const shaka = civilYear - 78 - (lm.month >= 9 && month <= 4 ? 1 : 0);

  return {
    date: { year, month, day: d }, weekday,
    sunrise: toMs(rise), sunset: toMs(set), nextSunrise: toMs(nextRise), daylength: len * DAY,
    tithi, nakshatra, yoga, karana,
    paksha: tithi[0].index < 15 ? 'Shukla' : 'Krishna',
    sunSign: Math.floor(sunLon / 30), moonSign: Math.floor(moonLon / 30), moonSignChange,
    lunarMonth: lm.month, adhika: lm.adhika, purnimantaMonth: tithi[0].index >= 15 ? (lm.month + 1) % 12 : lm.month,
    ritu: RITU[Math.floor(sunLon / 30)], ayana: (sunLon >= 270 || sunLon < 90) ? 'Uttarayana' : 'Dakshinayana',
    vikramSamvat: vikram, shakaSamvat: shaka,
    rahuKaal: seg(RAHU[weekday]), gulikaKaal: seg(GULIKA[weekday]), yamaganda: seg(YAMA[weekday]),
    abhijit: weekday === 3 ? null : { start: toMs(mid - muhurta / 2), end: toMs(mid + muhurta / 2) },
    brahmaMuhurta: { start: toMs(rise - 96 / 1440), end: toMs(rise - 48 / 1440) },
    nishita: { start: toMs(nightMid - 24 / 1440), end: toMs(nightMid + 24 / 1440) },
    choghadiya: choghadiya(rise, set, nextRise, weekday)
  };
}

// ---------------- Festivals ----------------
// month: amanta month index (0 Chaitra … 11 Phalguna); tithi 1–30 (16–30 = Krishna paksha); kaal decides the observance day.
const FESTIVALS = [
  { id: 'vasantPanchami', month: 10, tithi: 5, kaal: 'purvahna' },
  { id: 'mahaShivaratri', month: 10, tithi: 29, kaal: 'nishita' },
  { id: 'holikaDahan', month: 11, tithi: 16, kaal: 'sunrise', offset: -1 },
  { id: 'holi', month: 11, tithi: 16, kaal: 'sunrise' },
  { id: 'ugadi', month: 0, tithi: 1, kaal: 'sunrise' },
  { id: 'chaitraNavratri', month: 0, tithi: 1, kaal: 'sunrise' },
  { id: 'ramNavami', month: 0, tithi: 9, kaal: 'madhyahna' },
  { id: 'mahavirJayanti', month: 0, tithi: 13, kaal: 'sunrise' },
  { id: 'hanumanJayanti', month: 0, tithi: 15, kaal: 'sunrise' },
  { id: 'akshayaTritiya', month: 1, tithi: 3, kaal: 'purvahna' },
  { id: 'buddhaPurnima', month: 1, tithi: 15, kaal: 'sunrise' },
  { id: 'nirjalaEkadashi', month: 2, tithi: 11, kaal: 'sunrise' },
  { id: 'rathYatra', month: 3, tithi: 2, kaal: 'sunrise' },
  { id: 'devshayaniEkadashi', month: 3, tithi: 11, kaal: 'sunrise' },
  { id: 'guruPurnima', month: 3, tithi: 15, kaal: 'sunrise' },
  { id: 'nagPanchami', month: 4, tithi: 5, kaal: 'sunrise' },
  { id: 'rakshaBandhan', month: 4, tithi: 15, kaal: 'aparahna', avoidBhadra: true },
  { id: 'janmashtami', month: 4, tithi: 23, kaal: 'sunrise' },
  { id: 'ganeshChaturthi', month: 5, tithi: 4, kaal: 'madhyahna' },
  { id: 'anantChaturdashi', month: 5, tithi: 14, kaal: 'sunrise' },
  { id: 'pitruPakshaStart', month: 5, tithi: 16, kaal: 'sunrise' },
  { id: 'navratri', month: 6, tithi: 1, kaal: 'sunrise' },
  { id: 'durgaAshtami', month: 6, tithi: 8, kaal: 'sunrise' },
  { id: 'dussehra', month: 6, tithi: 10, kaal: 'aparahna' },
  { id: 'sharadPurnima', month: 6, tithi: 15, kaal: 'pradosh' },
  { id: 'karwaChauth', month: 6, tithi: 19, kaal: 'pradosh' },
  { id: 'dhanteras', month: 6, tithi: 28, kaal: 'pradosh' },
  { id: 'diwali', month: 6, tithi: 30, kaal: 'pradosh' },
  { id: 'govardhanPuja', month: 7, tithi: 1, kaal: 'sunrise' },
  { id: 'bhaiDooj', month: 7, tithi: 2, kaal: 'sunrise' },
  { id: 'chhathPuja', month: 7, tithi: 6, kaal: 'sunset' },
  { id: 'devUthaniEkadashi', month: 7, tithi: 11, kaal: 'sunrise' },
  { id: 'kartikPurnima', month: 7, tithi: 15, kaal: 'sunrise' },
  { id: 'gitaJayanti', month: 8, tithi: 11, kaal: 'sunrise' }
];
const SANKRANTI_FEST = { 9: 'makarSankranti', 0: 'meshaSankranti' };

function kaalJd(kaal, st, nextRise) {
  const len = st.set - st.rise;
  switch (kaal) {
    case 'sunrise': return st.rise + 1 / 1440;
    case 'purvahna': return st.rise + len * 0.4;
    case 'madhyahna': return st.rise + len * 0.5;
    case 'aparahna': return st.rise + len * 0.7;
    case 'sunset': return st.set - 1 / 1440;
    case 'pradosh': return st.set + 40 / 1440;
    case 'nishita': return (st.set + nextRise) / 2;
  }
}

function calendar({ year, lat, lon, tzMinutes }) {
  // Civil days from 1 Dec (year-1) to 31 Jan (year+1), with tithi/month at each kaal on demand.
  const startMs = Date.UTC(year - 1, 11, 1), endMs = Date.UTC(year + 1, 0, 31);
  const days = [];
  for (let ms = startMs; ms <= endMs; ms += DAY) {
    const dt = new Date(ms), y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const st = sunTimes(y, m, d, lat, lon, tzMinutes);
    days.push({ y, m, d, st });
  }
  for (let i = 0; i < days.length - 1; i++) days[i].nextRise = days[i + 1].st.rise;
  days.pop();
  const memo = new Map();
  const tithiMonthAt = jd => {
    const key = Math.round(jd * 1440);
    if (memo.has(key)) return memo.get(key);
    const tithi = Math.floor(elongAt(jd) / 12) + 1;
    const lm = lunarMonth(jd);
    const r = { tithi, month: lm.month, adhika: lm.adhika };
    memo.set(key, r); return r;
  };
  const inYear = x => x.y === year;
  const events = [];
  const fmt = x => `${x.y}-${String(x.m).padStart(2, '0')}-${String(x.d).padStart(2, '0')}`;

  const vishtiAt = jd => karanaName(Math.floor(elongAt(jd) / 6)) === 'Vishti';
  const prevT = T => T === 1 ? 30 : T - 1, nextT = T => T === 30 ? 1 : T + 1;
  for (const f of FESTIVALS) {
    const off = f.offset || 0;
    let found = null;
    for (let i = 0; i < days.length && !found; i++) {
      const x = days[i], jd = kaalJd(f.kaal, x.st, x.nextRise), r = tithiMonthAt(jd);
      if (r.tithi !== f.tithi || r.month !== f.month || r.adhika) continue;
      if (f.avoidBhadra && vishtiAt(jd)) {
        // Bhadra covers the preferred time: use the next morning if the tithi is still running at sunrise
        const nx = days[i + 1];
        if (nx && tithiMonthAt(nx.st.rise).tithi === f.tithi) { if (inYear(nx)) found = nx; continue; }
      }
      const tgt = days[i + off];
      if (tgt && inYear(tgt)) found = tgt;
    }
    if (!found) {
      // kshaya tithi (never present at the kaal time): observe on the day it begins
      for (let i = 0; i < days.length && !found; i++) {
        const x = days[i], a = tithiMonthAt(x.st.rise), b = tithiMonthAt(x.nextRise - 1e-4);
        if (a.tithi === prevT(f.tithi) && b.tithi === nextT(f.tithi) && b.month === f.month && !b.adhika) {
          const tgt = days[i + off]; if (tgt && inYear(tgt)) found = tgt;
        }
      }
    }
    if (found) events.push({ date: fmt(found), id: f.id, kind: 'festival' });
  }

  // Recurring vrats by sunrise tithi (Ekadashi, Purnima, Amavasya) and pradosh-time trayodashi.
  let prevSunriseTithi = null;
  for (let i = 0; i < days.length; i++) {
    const x = days[i];
    const a = tithiMonthAt(x.st.rise);
    const nextA = i + 1 < days.length ? tithiMonthAt(days[i + 1].st.rise) : null;
    if (!inYear(x)) { prevSunriseTithi = a.tithi; continue; }
    const marks = [];
    // a tithi counts on the first day whose sunrise falls in it (or, if skipped, the day it begins)
    const prevT = T => T === 1 ? 30 : T - 1, nextT = T => T === 30 ? 1 : T + 1;
    const covers = T => (a.tithi === T && prevSunriseTithi !== T) || (a.tithi === prevT(T) && nextA && nextA.tithi === nextT(T));
    if (covers(11)) marks.push({ id: 'ekadashi', paksha: 'Shukla' });
    if (covers(26)) marks.push({ id: 'ekadashi', paksha: 'Krishna' });
    if (covers(15)) marks.push({ id: 'purnima' });
    if (covers(30)) marks.push({ id: 'amavasya' });
    const p = tithiMonthAt(x.st.set + 40 / 1440).tithi;
    if (p === 13 || p === 28) marks.push({ id: 'pradosh', paksha: p === 13 ? 'Shukla' : 'Krishna' });
    const c = tithiMonthAt(x.st.set + 90 / 1440).tithi;
    if (c === 19) marks.push({ id: 'sankashti' });
    for (const mk of marks) events.push({ date: fmt(x), kind: 'vrat', month: a.month, adhika: a.adhika, ...mk });
    prevSunriseTithi = a.tithi;
  }
  // de-duplicate pradosh/sankashti appearing on consecutive days: keep the first
  const seen = new Set();
  const dedup = events.filter(e => {
    if (e.kind !== 'vrat' || !['pradosh', 'sankashti'].includes(e.id)) return true;
    const d = new Date(e.date + 'T00:00:00Z').getTime(), prevKey = e.id + (e.paksha || '') + new Date(d - DAY).toISOString().slice(0, 10);
    const key = e.id + (e.paksha || '') + e.date;
    seen.add(key);
    return !seen.has(prevKey);
  });

  // Sankrantis (sidereal solar ingress) in the year, dated by the local day of ingress
  const jdA = toJd(Date.UTC(year, 0, 1) - tzMinutes * 60000), jdB = toJd(Date.UTC(year + 1, 0, 1) - tzMinutes * 60000);
  let t = jdA, s0 = Math.floor(sunAt(t) / 30);
  while (t < jdB) {
    const t2 = t + 1, s1 = Math.floor(sunAt(t2) / 30);
    if (s1 !== s0) {
      let lo = t, hi = t2;
      for (let i = 0; i < 25; i++) { const mid = (lo + hi) / 2; if (Math.floor(sunAt(mid) / 30) === s0) lo = mid; else hi = mid; }
      const local = new Date(toMs(hi) + tzMinutes * 60000);
      dedup.push({ date: local.toISOString().slice(0, 10), kind: 'sankranti', sign: s1, at: toMs(hi), id: SANKRANTI_FEST[s1] || 'sankranti' });
      s0 = s1;
    }
    t = t2;
  }
  return dedup.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'festival' ? -1 : 1));
}

module.exports = { day, calendar, lunarMonth, FESTIVALS };
