/* Lunar (tithi) anniversaries.
   - Hindu birthday (janma tithi): the tithi and amanta month at the moment of birth; each year it is kept on the
     day whose sunrise falls in that tithi of that month (the first such day; adhika months are skipped).
   - Shraddha (annual tithi of an ancestor): the tithi running at aparahna (afternoon, 0.6–0.8 of daytime) of
     that month, and the same tithi in Pitru Paksha (Mahalaya: Krishna paksha of amanta Bhadrapada).
   If the tithi never touches the chosen time in that month (kshaya), the day on which it begins is used. */
const J = require('./engine.js');
const P = require('./panchang.js');

const DAY = 86400000;
const toJd = ms => ms / DAY + 2440587.5;
const tithiAt = jd => Math.floor(P.elongAt(jd) / 12) + 1; // 1–30
const prevT = T => T === 1 ? 30 : T - 1, nextT = T => T === 30 ? 1 : T + 1;

// Tithi (1–30) and amanta month at a UTC moment
function tithiOf(utMs) {
  const jd = toJd(utMs), lm = P.lunarMonth(jd);
  return { tithi: tithiAt(jd), month: lm.month, adhika: lm.adhika };
}
function birthTithi(input) {
  const utMs = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute) - input.tzMinutes * 60000;
  return tithiOf(utMs);
}

/* Next dates (local calendar days) on or after `from` when tithi T of amanta month M is observed.
   kaal: 'sunrise' | 'aparahna'. count: how many yearly occurrences to return. */
function nextDates({ tithi: T, month: M, kaal = 'sunrise', lat, lon, tzMinutes, from, count = 1, maxDays = 400 * count + 30 }) {
  const out = [];
  let ms = Date.UTC(from.y, from.m - 1, from.d);
  const dayInfo = new Map();
  const info = ms => {
    if (dayInfo.has(ms)) return dayInfo.get(ms);
    const dt = new Date(ms), y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const st = P.sunTimes(y, m, d, lat, lon, tzMinutes);
    if (st.rise == null || st.set == null) { dayInfo.set(ms, null); return null; }
    const jd = kaal === 'aparahna' ? st.rise + (st.set - st.rise) * 0.7 : st.rise + 1 / 1440;
    const r = { y, m, d, jd, t: tithiAt(jd) };
    dayInfo.set(ms, r); return r;
  };
  const monthOf = r => r.lm || (r.lm = P.lunarMonth(r.jd));
  for (let i = 0; i < maxDays && out.length < count; i++, ms += DAY) {
    const a = info(ms); if (!a) continue;
    let hit = false;
    if (a.t === T) {
      const prev = info(ms - DAY);
      if (!(prev && prev.t === T)) hit = true; // first day of a doubled (vriddhi) tithi only
    } else if (a.t === prevT(T)) {
      const b = info(ms + DAY);
      if (b && b.t === nextT(T)) hit = true; // T is skipped (kshaya): keep it on the day it begins
    }
    if (!hit) continue;
    const lm = monthOf(a);
    // a kshaya tithi starts during this day; its month is the month at the next kaal
    const mon = a.t === T ? lm : monthOf(info(ms + DAY));
    if (mon.month !== M || mon.adhika) continue;
    out.push({ date: `${a.y}-${String(a.m).padStart(2, '0')}-${String(a.d).padStart(2, '0')}`, y: a.y, m: a.m, d: a.d });
    ms += 300 * DAY - DAY; i += 299; // jump ahead to the next year
  }
  return out;
}

// Mahalaya (Pitru Paksha) tithi for an ancestor's tithi: Krishna paksha of Bhadrapada (amanta month 5);
// Purnima stays Bhadrapada Purnima.
const mahalayaTithi = T => T === 15 ? 15 : T > 15 ? T : T + 15;

function todayParts(tzMinutes, nowMs = Date.now()) {
  const d = new Date(nowMs + tzMinutes * 60000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

/* people: [{ id, kind:'birthday', birth:{…kundali input} } | { id, kind:'shraddha', tithi, month } ]
   Returns each with its tithi/month and the next date(s) at the given place. */
function upcoming(people, { lat, lon, tzMinutes, nowMs = Date.now() }) {
  const from = todayParts(tzMinutes, nowMs);
  return people.map(p => {
    if (p.kind === 'birthday') {
      const bt = birthTithi(p.birth);
      const next = nextDates({ tithi: bt.tithi, month: bt.month, kaal: 'sunrise', lat, lon, tzMinutes, from })[0] || null;
      const age = next ? next.y - p.birth.year : null;
      return { id: p.id, kind: 'birthday', tithi: bt.tithi, month: bt.month, birthAdhika: bt.adhika, next, age };
    }
    const T = p.tithi, M = p.month;
    const next = nextDates({ tithi: T, month: M, kaal: 'aparahna', lat, lon, tzMinutes, from })[0] || null;
    const mahalaya = nextDates({ tithi: mahalayaTithi(T), month: 5, kaal: 'aparahna', lat, lon, tzMinutes, from })[0] || null;
    return { id: p.id, kind: 'shraddha', tithi: T, month: M, next, mahalaya };
  });
}

// Tithi and month of a date of death (time optional, default noon) at a place
function deathTithi({ year, month, day, hour = 12, minute = 0, tzMinutes }) {
  return tithiOf(Date.UTC(year, month - 1, day, hour, minute) - tzMinutes * 60000);
}

module.exports = { birthTithi, nextDates, upcoming, deathTithi, mahalayaTithi, todayParts, tithiOf };
