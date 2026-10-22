/* Lal Kitab view of a chart. Lal Kitab reads planets by house (from the Lagna, signs set aside) and prescribes
   simple household remedies (upay) for planets that are weak there.
   - Pakka ghar (permanent house), exalted and debilitated houses per planet (Lal Kitab tables).
   - A planet is also troubled when it shares a house with a natural enemy or with Rahu/Ketu.
   Remedies are done in daylight, one planet at a time, for 43 days without a break. */
const J = require('./engine.js');

const LK = {
  Sun: { pakka: [1], high: [1], low: [7] },
  Moon: { pakka: [4], high: [2], low: [8] },
  Mars: { pakka: [3, 8], high: [10], low: [4] },
  Mercury: { pakka: [7], high: [6], low: [12] },
  Jupiter: { pakka: [2], high: [4], low: [10] },
  Venus: { pakka: [7], high: [12], low: [6] },
  Saturn: { pakka: [10], high: [7], low: [1] },
  Rahu: { pakka: [12], high: [3, 6], low: [8, 9] },
  Ketu: { pakka: [6], high: [5, 9, 12], low: [3, 8] }
};
const NODES = ['Rahu', 'Ketu'];

function lalKitab(r) {
  const byHouse = {};
  r.planets.forEach(p => { (byHouse[p.house] = byHouse[p.house] || []).push(p.name); });
  const planets = r.planets.map(p => {
    const t = LK[p.name], h = p.house, mates = byHouse[h].filter(n => n !== p.name);
    const enemies = mates.filter(n => (NODES.includes(n) && !NODES.includes(p.name)) || (J.REL[p.name] && J.REL[p.name][n] === 'E'));
    let status = 'neutral';
    if (t.low.includes(h)) status = 'low';
    else if (t.high.includes(h)) status = 'high';
    else if (t.pakka.includes(h)) status = 'pakka';
    const troubled = status === 'low' || enemies.length > 0;
    return { name: p.name, house: h, status, enemies, troubled };
  });
  // Remedies: troubled planets first (debilitated before afflicted), at most three
  const rank = p => (p.status === 'low' ? 2 : 0) + p.enemies.length;
  const remedies = planets.filter(p => p.troubled).sort((a, b) => rank(b) - rank(a)).slice(0, 3).map(p => p.name);
  return { planets, remedies, houses: byHouse };
}

module.exports = { lalKitab, LK };
