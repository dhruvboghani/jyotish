/* Vrat (fast) list for a city with the time to break the fast (parana):
   - Ekadashi: next morning after sunrise, after Hari Vasara (first quarter of Dwadashi) and preferably within
     the first fifth of the day (pratahkal), and before Dwadashi ends.
   - Pradosh: after the evening puja — pradosh kaal is sunset to 2 h 24 min after.
   - Sankashti Chaturthi: after moonrise.  - Purnima: after next sunrise.  - Amavasya: observance only. */
const P = require('./panchang.js');
const A = require('./astro.js');

const DAY = 86400000;
const toJd = ms => ms / DAY + 2440587.5, toMs = jd => Math.round((jd - 2440587.5) * DAY);
const tithiAt = jd => Math.floor(P.elongAt(jd) / 12); // 0..29

// End of the tithi running at jd (bisection over at most 1.5 days)
function tithiEnd(jd) {
  const t = tithiAt(jd); let lo = jd, hi = jd + 1.5;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (tithiAt(mid) === t) lo = mid; else hi = mid; }
  return hi;
}
function tithiStart(jd) {
  const t = tithiAt(jd); let lo = jd - 1.5, hi = jd;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (tithiAt(mid) === t) hi = mid; else lo = mid; }
  return hi;
}
const parts = iso => iso.split('-').map(Number);
const nextIso = iso => { const [y, m, d] = parts(iso), x = new Date(Date.UTC(y, m - 1, d + 1)); return x.toISOString().slice(0, 10); };

function parana(e, lat, lon, tzMinutes) {
  const [y, m, d] = parts(e.date);
  if (e.id === 'ekadashi') {
    const [y2, m2, d2] = parts(nextIso(e.date)), st = P.sunTimes(y2, m2, d2, lat, lon, tzMinutes);
    if (st.rise == null) return null;
    // Dwadashi index = 11 (Shukla) or 26 (Krishna)
    const dw = e.paksha === 'Shukla' ? 11 : 26;
    let jdDw = st.rise; const tr = tithiAt(st.rise);
    if (tr !== dw) jdDw = tr === dw - 1 ? tithiEnd(st.rise) + 1e-5 : st.rise; // still Ekadashi at sunrise → Dwadashi starts later
    const dwStart = tithiAt(jdDw) === dw ? tithiStart(jdDw) : null, dwEnd = tithiAt(jdDw) === dw ? tithiEnd(jdDw) : null;
    const hariEnd = dwStart != null ? dwStart + (dwEnd - dwStart) / 4 : st.rise;
    const start = Math.max(st.rise, hariEnd), pratah = st.rise + (st.set - st.rise) / 5;
    let end = pratah;
    if (start >= pratah) end = start + 2 / 24; // Hari Vasara runs past the morning: break soon after it ends
    if (dwEnd != null && dwEnd > start && dwEnd < end) end = dwEnd;
    return { kind: 'parana', date: nextIso(e.date), start: toMs(start), end: toMs(end), dwadashiEnd: dwEnd ? toMs(dwEnd) : null, hariVasaraEnd: hariEnd > st.rise ? toMs(hariEnd) : null };
  }
  if (e.id === 'pradosh') {
    const st = P.sunTimes(y, m, d, lat, lon, tzMinutes); if (st.set == null) return null;
    return { kind: 'puja', date: e.date, start: toMs(st.set), end: toMs(st.set + 144 / 1440) };
  }
  if (e.id === 'sankashti') {
    const mr = A.moonEvents({ year: y, month: m, day: d, lat, lon, tzMinutes });
    return mr.rise ? { kind: 'moonrise', date: e.date, start: mr.rise } : null;
  }
  if (e.id === 'purnima') {
    const [y2, m2, d2] = parts(nextIso(e.date)), st = P.sunTimes(y2, m2, d2, lat, lon, tzMinutes);
    return st.rise ? { kind: 'sunrise', date: nextIso(e.date), start: toMs(st.rise) } : null;
  }
  return null;
}

const KINDS = ['ekadashi', 'pradosh', 'sankashti', 'purnima', 'amavasya'];
function vrats({ fromMs, days = 90, lat, lon, tzMinutes, kinds = KINDS }) {
  const fromIso = new Date(fromMs + tzMinutes * 60000).toISOString().slice(0, 10), toIso = new Date(fromMs + tzMinutes * 60000 + days * DAY).toISOString().slice(0, 10);
  const y0 = +fromIso.slice(0, 4), y1 = +toIso.slice(0, 4), out = [];
  for (let y = y0; y <= y1; y++) for (const e of P.calendar({ year: y, lat, lon, tzMinutes })) {
    if (e.kind !== 'vrat' || !kinds.includes(e.id) || e.date < fromIso || e.date > toIso) continue;
    out.push({ id: `${e.date}-${e.id}${e.paksha || ''}`, date: e.date, kind: e.id, paksha: e.paksha || null, month: e.month, adhika: e.adhika, parana: parana(e, lat, lon, tzMinutes) });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { vrats, parana, KINDS, tithiEnd };
