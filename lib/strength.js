/* Shadbala (six-fold strength) and Bhava Bala, following BPHS in a compact form (virupas; 60 virupas = 1 rupa).
   Components: Sthana (uchcha, saptavargaja, ojha-yugma, kendradi, drekkana), Dig, Kala (nathonnata, paksha,
   tribhaga, vara, hora, ayana), Chesta, Naisargika and Drik. Temporal friendship is used in the varga dignities. */
const J = require('./engine.js');
const V = require('./varga.js');

const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const DEEP_EXALT = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
const MOOLA = { Sun: [4, 0, 20], Moon: [1, 3, 30], Mars: [0, 0, 12], Mercury: [5, 15, 20], Jupiter: [8, 0, 10], Venus: [6, 0, 15], Saturn: [10, 0, 20] };
const NAISARGIKA = { Sun: 60, Moon: 51.43, Venus: 42.85, Jupiter: 34.28, Mercury: 25.7, Mars: 17.14, Saturn: 8.57 };
const REQUIRED = { Sun: 6.5, Moon: 6, Mars: 5, Mercury: 7, Jupiter: 6.5, Venus: 5.5, Saturn: 5 }; // rupas
const MEAN_SPEED = { Mars: 0.524, Mercury: 1.383, Jupiter: 0.083, Venus: 1.2, Saturn: 0.034 };
const DIG_STRONG = { Sun: 'mc', Mars: 'mc', Jupiter: 'asc', Mercury: 'asc', Moon: 'ic', Venus: 'ic', Saturn: 'dsc' };
const MALE = ['Sun', 'Mars', 'Jupiter'], FEMALE = ['Moon', 'Venus'];
const ASPECT = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10] };
const dist = (a, b) => { const d = Math.abs(J.norm(a - b)); return d > 180 ? 360 - d : d; };
const houseFrom = (a, b) => (b - a + 12) % 12 + 1;

function relation(p, toSign, signs) {
  const lord = J.SIGN_LORD[toSign];
  if (lord === p) return 'own';
  const nat = (J.REL[p] && J.REL[p][lord]) || 'N';
  // temporal: lords in 2,3,4,10,11,12 from the planet are friends
  const h = houseFrom(signs[p], signs[lord]), temp = [2, 3, 4, 10, 11, 12].includes(h) ? 'F' : 'E';
  const score = (nat === 'F' ? 1 : nat === 'E' ? -1 : 0) + (temp === 'F' ? 1 : -1);
  return score >= 2 ? 'great' : score === 1 ? 'friend' : score === 0 ? 'neutral' : score === -1 ? 'enemy' : 'bitter';
}
const VARGA_PTS = { moola: 45, own: 30, great: 22.5, friend: 15, neutral: 7.5, enemy: 3.75, bitter: 1.875 };

function shadbala(r, input) {
  const P = r.P, signs = Object.fromEntries(r.planets.map(p => [p.name, p.sign]));
  const asc = r.lagna.lon, mc = r.mc, jd = r.jd;
  const benefic = n => ['Jupiter', 'Venus'].includes(n) || (n === 'Mercury') || (n === 'Moon' && r.panchang.elong < 180);
  const rise = r.panchang.sunrise, set = r.panchang.sunset, day = rise != null && set != null && jd >= rise && jd < set;
  // hours from midnight (local apparent, approximated by distance of the Sun from the meridian below)
  const sunHA = J.norm(J.ascendant(jd, input.lat, input.lon).lst - J.tropical(jd).lon.Sun); // rough hour angle in degrees
  const fromMidnight = J.norm(sunHA + 180) / 15; // 0..24
  const vargaSign = {}; for (const k of ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30']) vargaSign[k] = Object.fromEntries(r.planets.map(p => [p.name, V.VARGAS[k](p.lon)]));
  const out = {};
  for (const n of SEVEN) {
    const p = P[n], c = {};
    c.uchcha = (180 - dist(p.lon, DEEP_EXALT[n])) / 3;
    let sv = 0;
    for (const k of Object.keys(vargaSign)) {
      const s = vargaSign[k][n], [ms, a, b] = MOOLA[n];
      const isMoola = k === 'D1' && s === ms && p.deg >= a && p.deg <= b;
      sv += VARGA_PTS[isMoola ? 'moola' : relation(n, s, signs)];
    }
    c.saptavarga = sv;
    const even = x => x % 2 === 1;
    c.ojha = (FEMALE.includes(n) ? (even(p.sign) ? 15 : 0) + (even(p.navamsa) ? 15 : 0) : (!even(p.sign) ? 15 : 0) + (!even(p.navamsa) ? 15 : 0));
    c.kendra = [1, 4, 7, 10].includes(p.house) ? 60 : [2, 5, 8, 11].includes(p.house) ? 30 : 15;
    const dk = Math.floor(p.deg / 10);
    c.drekkana = (MALE.includes(n) && dk === 0) || (FEMALE.includes(n) && dk === 2) || (!MALE.includes(n) && !FEMALE.includes(n) && dk === 1) ? 15 : 0;
    const point = { mc, asc, ic: J.norm(mc + 180), dsc: J.norm(asc + 180) }[DIG_STRONG[n]];
    c.dig = (180 - dist(p.lon, point)) / 3;
    const noonness = 1 - Math.abs(fromMidnight - 12) / 12; // 1 at noon, 0 at midnight
    c.nathonnata = n === 'Mercury' ? 60 : ['Sun', 'Jupiter', 'Venus'].includes(n) ? 60 * noonness : 60 * (1 - noonness);
    const el = r.panchang.elong, fold = el > 180 ? 360 - el : el;
    c.paksha = (benefic(n) ? fold / 3 : 60 - fold / 3) * (n === 'Moon' ? 2 : 1);
    const dayPart = day ? Math.min(2, Math.floor((jd - rise) / ((set - rise) / 3))) : null;
    const triLord = day ? ['Mercury', 'Sun', 'Saturn'][dayPart] : null;
    c.tribhaga = n === 'Jupiter' || n === triLord ? 60 : (!day && ((fromMidnight >= 18 || fromMidnight < 2) ? n === 'Moon' : fromMidnight < 4 ? n === 'Venus' : n === 'Mars') ? 60 : 0);
    c.vara = r.panchang.varaLord === n ? 45 : 0;
    const dec = Math.asin(Math.sin(23.44 * Math.PI / 180) * Math.sin(J.tropical(jd).lon[n] * Math.PI / 180)) * 180 / Math.PI;
    const northGood = ['Sun', 'Mars', 'Jupiter', 'Venus'].includes(n), kr = n === 'Mercury' ? Math.abs(dec) : northGood ? dec : -dec;
    c.ayana = (23.44 + kr) / 46.88 * 60 * (n === 'Sun' ? 2 : 1);
    if (n === 'Sun') c.chesta = c.ayana / 2;
    else if (n === 'Moon') c.chesta = c.paksha / 2;
    else { const sp = p.speed; c.chesta = sp < 0 ? 60 : Math.abs(sp) < MEAN_SPEED[n] * 0.25 ? 15 : sp < MEAN_SPEED[n] ? 30 : 45; }
    c.naisargika = NAISARGIKA[n];
    let dr = 0;
    for (const o of r.planets) {
      if (o.name === n || o.name === 'Rahu' || o.name === 'Ketu') continue;
      const h = houseFrom(o.sign, p.sign);
      if (h === 7 || (ASPECT[o.name] || []).includes(h)) dr += benefic(o.name) ? 15 : -15;
    }
    c.drik = dr;
    const sthana = c.uchcha + c.saptavarga + c.ojha + c.kendra + c.drekkana;
    const kala = c.nathonnata + c.paksha + c.tribhaga + c.vara + c.ayana;
    const total = sthana + c.dig + kala + c.chesta + c.naisargika + c.drik;
    const rupas = total / 60;
    out[n] = { sthana, dig: c.dig, kala, chesta: c.chesta, naisargika: c.naisargika, drik: c.drik, total, rupas, required: REQUIRED[n], ratio: rupas / REQUIRED[n] };
  }
  const rank = SEVEN.slice().sort((a, b) => out[b].ratio - out[a].ratio);
  // Bhava Bala: strength of the house lord + direction strength of the sign type + aspects and occupants
  const HUMAN = [2, 5, 6, 10], WATER = [3, 11], QUAD = [0, 1, 4, 9], INSECT = [7];
  const bhava = [];
  for (let h = 1; h <= 12; h++) {
    const s = (r.lagna.sign + h - 1) % 12, lord = J.SIGN_LORD[s];
    const lordB = out[lord] ? out[lord].total : 300;
    const strong = HUMAN.includes(s) || (s === 8 && true) ? 1 : WATER.includes(s) ? 4 : QUAD.includes(s) ? 10 : INSECT.includes(s) ? 7 : 1;
    const dig = 60 - (Math.min(Math.abs(h - strong), 12 - Math.abs(h - strong)) * 10);
    let asp = 0;
    for (const o of r.planets) {
      if (o.name === 'Rahu' || o.name === 'Ketu') continue;
      const hh = houseFrom(o.sign, s);
      if (hh === 1) asp += benefic(o.name) ? 20 : -10;
      else if (hh === 7 || (ASPECT[o.name] || []).includes(hh)) asp += benefic(o.name) ? 15 : -10;
    }
    const total = lordB + dig + asp;
    bhava.push({ house: h, sign: s, lord, total, rupas: total / 60 });
  }
  const bRank = bhava.slice().sort((a, b) => b.total - a.total).map(b => b.house);
  return { planets: out, rank, bhava, bhavaRank: bRank };
}

module.exports = { shadbala, REQUIRED };
