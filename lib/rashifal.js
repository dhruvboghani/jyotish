/* Daily rashifal for the 12 Moon signs, computed from the actual transits of the day (gochar),
   not from pre-written text. Each line is a [key, params] message the client translates. */
const J = require('./engine.js');

const GOOD = { Sun: [3, 6, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [3, 6, 11], Mercury: [2, 4, 6, 8, 10, 11], Jupiter: [2, 5, 7, 9, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], Saturn: [3, 6, 11], Rahu: [3, 6, 11], Ketu: [3, 6, 11] };
const WEIGHT = { Moon: 3, Jupiter: 2, Saturn: 2, Sun: 1, Mars: 1, Mercury: 1, Venus: 1, Rahu: 0.5, Ketu: 0.5 };
const AREAS = { career: ['Sun', 'Saturn', 'Mercury', 'Mars'], money: ['Jupiter', 'Venus', 'Mercury', 'Moon'], love: ['Venus', 'Moon', 'Jupiter'], health: ['Sun', 'Mars', 'Moon', 'Saturn'] };

function forDate(ms) {
  const jd = ms / 86400000 + 2440587.5;
  const tr = J.transit(jd).lon;
  const prev = J.transit(jd - 0.5).lon, next = J.transit(jd + 0.5).lon;
  const pos = Object.fromEntries(J.PLANETS.map(p => [p, { sign: Math.floor(tr[p] / 30), deg: tr[p] % 30, retro: !['Sun', 'Moon', 'Rahu', 'Ketu'].includes(p) && (J.norm(next[p] - prev[p] + 180) - 180) < 0 }]));
  const signs = [];
  for (let s = 0; s < 12; s++) {
    const items = J.PLANETS.map(p => { const h = (pos[p].sign - s + 12) % 12 + 1; return { planet: p, house: h, good: GOOD[p].includes(h) }; });
    let num = 0, den = 0;
    for (const it of items) { num += (it.good ? 1 : 0) * WEIGHT[it.planet]; den += WEIGHT[it.planet]; }
    const stars = Math.max(1, Math.min(5, Math.round(1 + 4 * num / den)));
    const area = {};
    for (const [a, list] of Object.entries(AREAS)) {
      const sel = items.filter(i => list.includes(i.planet)), g = sel.filter(i => i.good).length;
      area[a] = Math.max(1, Math.min(5, Math.round(1 + 4 * g / sel.length)));
    }
    const moon = items.find(i => i.planet === 'Moon');
    signs.push({ sign: s, stars, area, moonHouse: moon.house, chandrashtama: moon.house === 8, items });
  }
  return { at: ms, positions: pos, signs };
}

module.exports = { forDate };
