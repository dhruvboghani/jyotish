/* Personal transit timeline: Saturn, Jupiter and Rahu–Ketu sign changes over the next few years, and what they touch
   in the chart (house from the Moon and from the Lagna, Vedha-free gochar result, Sade Sati / Dhaiya phases). */
const J = require('./engine.js');

const DAY = 86400000;
const toJd = ms => ms / DAY + 2440587.5, toMs = jd => Math.round((jd - 2440587.5) * DAY);
const GOOD = { Saturn: [3, 6, 11], Jupiter: [2, 5, 7, 9, 11], Rahu: [3, 6, 11], Ketu: [3, 6, 11] };

function timeline(r, { nowMs = Date.now(), years = 5 } = {}) {
  const moon = r.P.Moon.sign, lagna = r.lagna.sign;
  const start = toJd(nowMs), end = start + years * 365.25, out = [];
  const signOf = (jd, p) => Math.floor(J.transit(jd).lon[p] / 30);
  for (const p of ['Saturn', 'Jupiter', 'Rahu']) {
    let jd = start, s = signOf(jd, p);
    out.push({ at: nowMs, planet: p, sign: s, current: true });
    const step = p === 'Jupiter' ? 1 : 2;
    while (jd < end) {
      const j2 = jd + step, s2 = signOf(j2, p);
      if (s2 !== s) {
        let lo = jd, hi = j2;
        for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (signOf(mid, p) === s) lo = mid; else hi = mid; }
        // moving backwards into the previous sign = retrograde re-entry
        const back = (s2 - s + 12) % 12 === 11;
        out.push({ at: toMs(hi), planet: p, sign: s2, retro: p === 'Rahu' ? false : back, from: s });
        s = s2;
      }
      jd = j2;
    }
  }
  const events = out.map(e => {
    const fromMoon = (e.sign - moon + 12) % 12 + 1, fromLagna = (e.sign - lagna + 12) % 12 + 1;
    const ev = { ...e, fromMoon, fromLagna, good: GOOD[e.planet].includes(fromMoon) };
    if (e.planet === 'Rahu') {
      const k = (e.sign + 6) % 12;
      ev.ketu = { sign: k, fromMoon: (k - moon + 12) % 12 + 1, fromLagna: (k - lagna + 12) % 12 + 1 };
    }
    if (e.planet === 'Saturn') {
      ev.phase = fromMoon === 12 ? 'sadeRising' : fromMoon === 1 ? 'sadePeak' : fromMoon === 2 ? 'sadeSetting'
        : fromMoon === 4 ? 'dhaiya4' : fromMoon === 8 ? 'dhaiya8' : (fromMoon === 3 && e.from != null && (e.from - moon + 12) % 12 + 1 === 2) ? 'sadeEnds' : null;
    }
    if (e.planet === 'Jupiter' && fromMoon === 1) ev.phase = 'jupiterOverMoon';
    return ev;
  });
  return events.sort((a, b) => a.at - b.at || (a.current ? -1 : 1));
}

module.exports = { timeline };
