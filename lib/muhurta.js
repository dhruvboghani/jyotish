/* Muhurta finder: good time windows for a purpose over a date range in a city.
   Classical filters (Muhurta Chintamani style, simplified): allowed tithi, nakshatra and weekday per purpose;
   avoid Vishti karana, harsh yogas, Rahu Kaal / Yamaganda / Gulika; season blocks (Chaturmas, Kharmas,
   Adhika maas, Pitru Paksha, Holashtak, combust Jupiter/Venus) for marriage and griha pravesh;
   optionally Tara bala and Chandra bala for one or two people. */
const J = require('./engine.js');
const P = require('./panchang.js');

const DAY = 86400000, toJd = ms => ms / DAY + 2440587.5;
const RULES = {
  marriage: { tithiS: [2, 3, 5, 7, 10, 11, 12, 13, 15], tithiK: [1, 2, 3, 5], nak: [3, 4, 9, 11, 12, 14, 16, 18, 20, 25, 26], days: [0, 1, 3, 4, 5], season: true, harshYoga: true },
  griha: { tithiS: [2, 3, 5, 7, 10, 11, 12, 13], tithiK: [2, 3, 5], nak: [3, 4, 11, 13, 16, 20, 22, 23, 25, 26], days: [1, 3, 4, 5], season: true, harshYoga: true },
  vehicle: { tithiS: [1, 2, 3, 5, 6, 7, 10, 11, 12, 13, 15], tithiK: [1, 2, 3, 5, 6, 7], nak: [0, 3, 4, 6, 7, 12, 13, 14, 16, 21, 22, 23, 26], days: [1, 3, 4, 5], season: false, harshYoga: false },
  business: { tithiS: [1, 2, 3, 5, 7, 10, 11, 13, 15], tithiK: [1, 2, 3, 5], nak: [0, 3, 7, 11, 12, 13, 16, 20, 21, 25, 26], days: [1, 3, 4, 5], season: false, harshYoga: true },
  general: { tithiS: [2, 3, 5, 7, 10, 11, 12, 13, 15], tithiK: [1, 2, 3, 5], nak: [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26], days: [1, 3, 4, 5], season: false, harshYoga: true }
};
const BAD_YOGA = [16, 26], HARSH_YOGA = [0, 5, 8, 9, 12, 14, 18];
const BEST_NAK = { marriage: [3, 11, 20, 25, 16], griha: [3, 11, 20, 25], vehicle: [7, 0, 12], business: [7, 0, 12], general: [7, 3, 0] };
const TARA_BAD = [3, 5, 7];

// Index of the element (tithi/nakshatra/yoga/karana) running at time t, from day()'s chain list
const at = (chain, t) => { for (const x of chain) if (t < x.end) return x; return chain[chain.length - 1]; };

function seasonBlock(p, sunSign, tr) {
  const m = p.lunarMonth, tIdx = p.tithi[0].index; // tithi index 0..29 at sunrise
  if (p.adhika) return 'adhika';
  if ((m === 3 && tIdx >= 10) || m === 4 || m === 5 || m === 6 || (m === 7 && tIdx < 10)) return 'chaturmas';
  if (sunSign === 8 || sunSign === 11) return 'kharmas';
  if (m === 11 && tIdx >= 7 && tIdx <= 14) return 'holashtak';
  const dist = q => Math.abs(J.norm(tr[q] - tr.Sun + 180) - 180);
  if (dist('Jupiter') < 11) return 'guruAsta';
  if (dist('Venus') < 10) return 'shukraAsta';
  return null;
}

function find({ purpose, from, days, lat, lon, tzMinutes, people = [] }) {
  const R = RULES[purpose] || RULES.general;
  const out = [], blocked = [];
  const people2 = people.map(c => ({ nak: c.P.Moon.nak, moonSign: c.P.Moon.sign }));
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(from.y, from.m - 1, from.d + i));
    const y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, dd = d.getUTCDate();
    const p = P.day({ year: y, month: mo, day: dd, lat, lon, tzMinutes });
    if (p.polar) continue;
    const date = `${y}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const trNoon = J.transit(toJd((p.sunrise + p.sunset) / 2)).lon;
    if (R.season) {
      const b = seasonBlock(p, Math.floor(trNoon.Sun / 30), trNoon);
      if (b) { blocked.push({ date, reason: b }); continue; }
    } else if (p.lunarMonth === 5 && p.tithi[0].index >= 15) { blocked.push({ date, reason: 'pitru' }); continue; }
    if (R.season && p.lunarMonth === 5 && p.tithi[0].index >= 15) { blocked.push({ date, reason: 'pitru' }); continue; }
    if (!R.days.includes(p.weekday)) continue;
    // Cut the Vedic day (sunrise → next sunrise) at every element boundary
    const cuts = new Set([p.sunrise, p.nextSunrise]);
    for (const k of ['tithi', 'nakshatra', 'yoga', 'karana']) for (const x of p[k]) if (x.end > p.sunrise && x.end < p.nextSunrise) cuts.add(x.end);
    for (const k of ['rahuKaal', 'yamaganda', 'gulikaKaal']) { cuts.add(p[k].start); cuts.add(p[k].end); }
    const pts = [...cuts].sort((a, b) => a - b);
    let cur = null;
    const flush = () => { if (cur && cur.end - cur.start >= 48 * 60000) out.push(cur); cur = null; };
    for (let j = 0; j < pts.length - 1; j++) {
      const a = pts[j], b = pts[j + 1], mid = (a + b) / 2;
      if (b - a < 60000) continue;
      const t = at(p.tithi, mid).index, n = at(p.nakshatra, mid).index, yg = at(p.yoga, mid).index, kn = at(p.karana, mid).name;
      const shukla = t < 15, tn = t % 15 + 1;
      let ok = (shukla ? R.tithiS : R.tithiK).includes(tn) && t !== 29 && R.nak.includes(n) && kn !== 'Vishti' && !BAD_YOGA.includes(yg) && !(R.harshYoga && HARSH_YOGA.includes(yg));
      if (ok && ['rahuKaal', 'yamaganda', 'gulikaKaal'].some(k => mid >= p[k].start && mid < p[k].end)) ok = false;
      let personal = null;
      if (ok && people2.length) {
        const moonSign = Math.floor(J.transit(toJd(mid)).lon.Moon / 30);
        personal = people2.map(pp => ({ tara: ((n - pp.nak + 27) % 27) % 9 + 1, chandra: ((moonSign - pp.moonSign + 12) % 12) + 1 }));
        if (personal.some(x => TARA_BAD.includes(x.tara) || x.chandra === 8)) ok = false;
      }
      const key = ok ? [t, n, yg].join('|') : null;
      if (ok && cur && cur.key === key && cur.end === a) { cur.end = b; continue; }
      flush();
      if (ok) {
        let score = 60 + (shukla ? 10 : 0) + (BEST_NAK[purpose] || []).includes(n) * 12 + ([4, 5].includes(p.weekday) ? 6 : 0) + ([3, 15, 20, 22].includes(yg) ? 5 : 0);
        if (p.abhijit && mid >= p.abhijit.start && mid < p.abhijit.end) score += 6;
        if (personal) score += personal.filter(x => [2, 4, 6, 8, 9].includes(x.tara)).length * 4;
        cur = { key, date, start: a, end: b, tithi: t, nak: n, yoga: yg, weekday: p.weekday, score: Math.min(99, score), personal };
      }
    }
    flush();
  }
  out.forEach(w => delete w.key);
  return { purpose, windows: out, blocked };
}

module.exports = { find, RULES };
