/* Gemstone and Rudraksha guidance from the chart.
   Gems strengthen a graha, so they are suggested only for functional benefics of the Lagna:
   - Life stone: Lagna lord.  - Fortune stone: 9th lord.  - Wisdom/progeny stone: 5th lord.
   - Dasha stone: the running Mahadasha lord, when it is a functional benefic.
   A lord of 6, 8 or 12 (that does not also rule the Lagna or a trikona) is marked "avoid".
   Rudraksha: by Lagna lord, Moon sign lord and the running Mahadasha lord. */
const J = require('./engine.js');

const GEM = { Sun: 'ruby', Moon: 'pearl', Mars: 'coral', Mercury: 'emerald', Jupiter: 'yellowSapphire', Venus: 'diamond', Saturn: 'blueSapphire', Rahu: 'hessonite', Ketu: 'catsEye' };
const UPRATNA = { Sun: ['garnet', 'redSpinel'], Moon: ['moonstone'], Mars: ['carnelian'], Mercury: ['peridot', 'greenTourmaline'], Jupiter: ['yellowTopaz', 'citrine'], Venus: ['whiteSapphire', 'zircon'], Saturn: ['amethyst', 'iolite'], Rahu: ['orangeZircon'], Ketu: ['tigersEye'] };
const MUKHI = { Sun: [1, 12], Moon: [2], Mars: [3], Mercury: [4], Jupiter: [5], Venus: [6, 13], Saturn: [7, 14], Rahu: [8], Ketu: [9] };
const RATTI_PER_KG = { ruby: 1 / 12, pearl: 1 / 10, coral: 1 / 10, emerald: 1 / 12, yellowSapphire: 1 / 12, diamond: 1 / 60, blueSapphire: 1 / 12, hessonite: 1 / 10, catsEye: 1 / 10 };

function gems(r, nowMs = Date.now()) {
  const L = r.lagna.sign, lordOf = h => J.SIGN_LORD[(L + h - 1) % 12];
  const owns = p => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(h => lordOf(h) === p);
  const good = p => owns(p).some(h => [1, 5, 9].includes(h));
  const bad = p => !good(p) && owns(p).some(h => [6, 8, 12].includes(h));
  const md = r.dashas.find(m => m.start <= nowMs && nowMs < m.end);
  const pick = (role, p) => {
    const pl = r.P[p];
    const status = bad(p) ? 'avoid' : good(p) ? (pl.dignity === 'Debilitated' ? 'caution' : 'suit') : 'caution';
    return { role, planet: p, gem: GEM[p], upratna: UPRATNA[p], status, houses: owns(p), dignity: pl.dignity, house: pl.house, perKg: RATTI_PER_KG[GEM[p]] };
  };
  const stones = [pick('life', lordOf(1)), pick('fortune', lordOf(9)), pick('wisdom', lordOf(5))];
  if (md && !stones.some(s => s.planet === md.lord) && md.lord !== 'Rahu' && md.lord !== 'Ketu') stones.push(pick('dasha', md.lord));
  // never two stones of planets that are natural enemies together: mark the weaker one
  const enemies = (a, b) => (J.REL[a] && J.REL[a][b] === 'E') || (J.REL[b] && J.REL[b][a] === 'E');
  stones.forEach((s, i) => { s.clash = stones.slice(0, i).filter(o => o.status === 'suit' && s.status === 'suit' && enemies(o.planet, s.planet)).map(o => o.planet); });
  const rud = [];
  const addR = (role, p) => { for (const m of MUKHI[p]) if (!rud.some(x => x.mukhi === m)) rud.push({ role, planet: p, mukhi: m }); };
  addR('lagna', lordOf(1)); addR('moon', J.SIGN_LORD[r.P.Moon.sign]); if (md) addR('dasha', md.lord);
  return { stones, rudraksha: rud.slice(0, 4), md: md && md.lord };
}

module.exports = { gems, GEM, MUKHI };
