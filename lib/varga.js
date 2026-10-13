/* Divisional charts (Parashari), birth-time rectification and upcoming transit events. */
const J = require('./engine.js');

// Each function maps a sidereal longitude to the varga sign (0 = Mesha).
const VARGAS = {
  D1: L => Math.floor(L / 30),
  D2: L => { const s = Math.floor(L / 30), first = (L % 30) < 15, odd = s % 2 === 0; return odd === first ? 4 : 3; }, // Hora: Simha / Karka
  D3: L => { const s = Math.floor(L / 30), k = Math.floor((L % 30) / 10); return (s + 4 * k) % 12; },
  D4: L => { const s = Math.floor(L / 30), k = Math.floor((L % 30) / 7.5); return (s + 3 * k) % 12; },
  D7: L => { const s = Math.floor(L / 30), k = Math.floor((L % 30) / (30 / 7)); return (s + (s % 2 === 0 ? 0 : 6) + k) % 12; },
  D9: L => Math.floor(L / (10 / 3)) % 12,
  D10: L => { const s = Math.floor(L / 30), k = Math.floor((L % 30) / 3); return (s + (s % 2 === 0 ? 0 : 8) + k) % 12; },
  D12: L => { const s = Math.floor(L / 30), k = Math.floor((L % 30) / 2.5); return (s + k) % 12; }
};

function vargas(chart) {
  const out = {};
  for (const [k, f] of Object.entries(VARGAS)) {
    out[k] = { asc: f(chart.lagna.lon), planets: Object.fromEntries(chart.planets.map(p => [p.name, f(p.lon)])) };
  }
  return out;
}

// Lagna and Navamsa-lagna across ±3 hours of the given birth time, to help when the time is uncertain.
function rectification(input) {
  const base = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute) - input.tzMinutes * 60000;
  const segs = [];
  let cur = null;
  for (let m = -180; m <= 180; m++) {
    const ms = base + m * 60000, jd = ms / 86400000 + 2440587.5;
    const ay = J.lahiri(jd + 69 / 86400);
    const asc = J.norm(J.ascendant(jd, input.lat, input.lon).asc - ay);
    const key = Math.floor(asc / 30) * 12 + Math.floor(asc / (10 / 3)) % 12;
    if (!cur || cur.key !== key) { if (cur) segs.push(cur); cur = { key, start: ms, end: ms, lagna: Math.floor(asc / 30), navamsa: Math.floor(asc / (10 / 3)) % 12 }; }
    cur.end = ms + 60000;
  }
  segs.push(cur);
  return segs.map(({ key, ...s }) => ({ ...s, current: base >= s.start && base < s.end }));
}

// Sign changes of the slow grahas over the next N days, with the house counted from the natal Moon.
function upcoming(chart, nowMs = Date.now(), days = 730) {
  const moonSign = chart.planets.find(p => p.name === 'Moon').sign;
  const events = [];
  const watch = ['Saturn', 'Jupiter', 'Rahu', 'Ketu'];
  const jd0 = nowMs / 86400000 + 2440587.5;
  let prev = J.transit(jd0).lon;
  for (let d = 1; d <= days; d++) {
    const cur = J.transit(jd0 + d).lon;
    for (const p of watch) {
      const a = Math.floor(prev[p] / 30), b = Math.floor(cur[p] / 30);
      if (a !== b) {
        // refine to the hour
        let lo = jd0 + d - 1, hi = jd0 + d;
        for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (Math.floor(J.transit(mid).lon[p] / 30) === a) lo = mid; else hi = mid; }
        events.push({ type: 'ingress', planet: p, from: a, to: b, at: Math.round((hi - 2440587.5) * 86400000), house: (b - moonSign + 12) % 12 + 1 });
      }
    }
    prev = cur;
  }
  const end = nowMs + days * 86400000;
  for (const md of chart.dashas) {
    if (md.start > nowMs && md.start < end) events.push({ type: 'md', lord: md.lord, at: md.start });
    for (const ad of md.sub) if (ad.start > nowMs && ad.start < end) events.push({ type: 'ad', md: md.lord, lord: ad.lord, at: ad.start });
  }
  return events.sort((x, y) => x.at - y.at);
}

module.exports = { VARGAS, vargas, rectification, upcoming };
