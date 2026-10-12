/* Builds the JSON the browser renders: a small free preview, or the full report for logged-in users. */
const J = require('./engine.js');
const { analyze, GOCHAR_GOOD } = require('./analysis.js');

function validate(b) {
  const n = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
  if (!b || typeof b !== 'object') return 'Missing body';
  if (!n(b.year, 1800, 2200) || !n(b.month, 1, 12) || !n(b.day, 1, 31)) return 'Invalid date';
  if (!n(b.hour, 0, 23) || !n(b.minute, 0, 59)) return 'Invalid time';
  if (!n(b.lat, -89, 89) || !n(b.lon, -180, 180)) return 'Invalid coordinates';
  if (!n(b.tzMinutes, -720, 840)) return 'Invalid UTC offset';
  return null;
}

function clean(b) {
  return {
    name: String(b.name || '').slice(0, 80), placeLabel: String(b.placeLabel || '').slice(0, 160),
    year: b.year, month: b.month, day: b.day, hour: b.hour, minute: b.minute, lat: b.lat, lon: b.lon, tzMinutes: b.tzMinutes
  };
}

function preview(input) {
  const r = J.compute(input), m = r.P.Moon;
  return {
    locked: true, input,
    preview: {
      utMs: r.utMs,
      lagna: { sign: r.lagna.sign, deg: r.lagna.deg, nak: r.lagna.nak, pada: r.lagna.pada },
      moon: { sign: m.sign, nak: m.nak, pada: m.pada }
    }
  };
}

function sadeSati(utMs, moonSign) {
  const start = utMs / 86400000 + 2440587.5, list = []; let cur = null;
  for (let jd = start; jd < start + 100 * 365.25; jd += 5) {
    const rel = (Math.floor(J.transit(jd).lon.Saturn / 30) - moonSign + 12) % 12, inn = rel === 11 || rel === 0 || rel === 1;
    if (inn) { if (!cur) cur = { start: jd, end: jd }; else cur.end = jd; } else if (cur) { list.push(cur); cur = null; }
  }
  if (cur) list.push(cur);
  const merged = [];
  list.forEach(p => { const last = merged[merged.length - 1]; if (last && p.start - last.end < 400) last.end = p.end; else merged.push({ ...p }); });
  const ms = jd => Math.round((jd - 2440587.5) * 86400000);
  return merged.map(p => ({ start: ms(p.start), end: ms(p.end) }));
}

function full(input, nowMs = Date.now()) {
  const r = J.compute(input);
  const an = analyze(r);
  const nowJd = nowMs / 86400000 + 2440587.5;
  const tr = J.transit(nowJd), prev = J.transit(nowJd - 0.5).lon, next = J.transit(nowJd + 0.5).lon;
  const M = r.P.Moon.sign;
  const gochar = J.PLANETS.map(p => {
    const L = tr.lon[p], sign = Math.floor(L / 30), fromMoon = (sign - M + 12) % 12 + 1;
    const retro = !['Sun', 'Moon', 'Rahu', 'Ketu'].includes(p) && (J.norm(next[p] - prev[p] + 180) - 180) < 0;
    return { name: p, sign, deg: L - sign * 30, nak: Math.floor(L / (360 / 27)), fromMoon, fromLagna: (sign - r.lagna.sign + 12) % 12 + 1, good: GOCHAR_GOOD[p].includes(fromMoon), retro };
  });
  const satSign = Math.floor(tr.lon.Saturn / 30), rel = (satSign - M + 12) % 12;
  const a = J.ascendant(r.jd, input.lat, input.lon);
  const { P, ...rest } = r; // P is rebuilt on the client
  return {
    locked: false, input, nowMs,
    chart: rest,
    analysis: an,
    gochar,
    sadeSati: { periods: sadeSati(r.utMs, M), phase: rel === 11 ? 'rising' : rel === 0 ? 'peak' : rel === 1 ? 'setting' : null, dhaiya: rel === 3 ? 4 : rel === 7 ? 8 : null, satSign, house: rel + 1 },
    method: { lstDeg: a.lst, sayanaAsc: a.asc }
  };
}

module.exports = { validate, clean, preview, full };
