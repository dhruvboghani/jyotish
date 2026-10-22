/* KP (Krishnamurti Paddhati) tables.
   - Ayanamsa: KP (Krishnamurti) ≈ Lahiri − 0°5′45″.
   - Cusps: Placidus (semi-arc) houses; houses 1 and 10 are the Ascendant and MC.
   - Every longitude gets a sign lord, star (nakshatra) lord and sub lord. A nakshatra (13°20′) is split into nine
     subs in Vimshottari order starting from its own lord, each proportional to that lord's dasha years.
   - Significators of each house in KP's four levels: (A) planets in the star of occupants, (B) occupants,
     (C) planets in the star of the cusp's sign lord, (D) that sign lord. */
const J = require('./engine.js');

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const KP_OFFSET = 0.0958; // degrees subtracted from Lahiri
const NAK = 360 / 27;
const sin = x => Math.sin(x * D2R), cos = x => Math.cos(x * D2R), tan = x => Math.tan(x * D2R);

function lords(lon) {
  const sign = Math.floor(lon / 30), nak = Math.floor(lon / NAK), starIdx = nak % 9;
  let off = lon - nak * NAK, k = 0, subIdx = starIdx;
  for (; k < 9; k++) {
    subIdx = (starIdx + k) % 9;
    const len = NAK * J.DASHA_YEARS[J.DASHA_ORDER[subIdx]] / 120;
    if (off < len || k === 8) break;
    off -= len;
  }
  return { sign: J.SIGN_LORD[sign], star: J.DASHA_ORDER[starIdx], sub: J.DASHA_ORDER[subIdx] };
}

// Ecliptic longitude of the point on the ecliptic with right ascension `ra`
const eclFromRa = (ra, eps) => J.norm(Math.atan2(sin(ra), cos(ra) * cos(eps)) * R2D);

// Placidus cusps (tropical). Returns 12 longitudes, cusps[0] = house 1.
function placidus(jdUT, lat, lon) {
  const a = J.ascendant(jdUT, lat, lon), ramc = a.lst, eps = a.eps;
  const cusp = (fraction, above) => {
    // above: houses 11, 12 (diurnal semi-arc east of MC); below: houses 2, 3 (nocturnal semi-arc before IC)
    let lam = eclFromRa(ramc + (above ? 90 * fraction : 180 - 90 * fraction), eps);
    for (let i = 0; i < 30; i++) {
      const dec = Math.asin(sin(eps) * sin(lam)) * R2D;
      const x = tan(lat) * tan(dec), ad = Math.abs(x) >= 1 ? 90 * Math.sign(x) : Math.asin(x) * R2D;
      const ra = above ? ramc + fraction * (90 + ad) : ramc + 180 - fraction * (90 - ad);
      const next = eclFromRa(ra, eps);
      if (Math.abs(J.norm(next - lam + 180) - 180) < 1e-7) { lam = next; break; }
      lam = next;
    }
    return lam;
  };
  const c = new Array(12);
  c[0] = a.asc; c[9] = a.mc;
  c[10] = cusp(1 / 3, true); c[11] = cusp(2 / 3, true);
  c[1] = cusp(2 / 3, false); c[2] = cusp(1 / 3, false);
  for (const i of [0, 1, 2, 9, 10, 11]) c[(i + 6) % 12] = J.norm(c[i] + 180);
  return c;
}

// r: result of J.compute(input); input for place
function kp(r, input) {
  const t = J.tropical(r.jd), ay = J.lahiri(t.jdTT) - KP_OFFSET;
  const cuspsTrop = placidus(r.jd, input.lat, input.lon);
  const cusps = cuspsTrop.map(x => J.norm(x - ay));
  const inHouse = lon => {
    for (let h = 0; h < 12; h++) {
      const a = cusps[h], b = cusps[(h + 1) % 12], span = J.norm(b - a);
      if (J.norm(lon - a) < span) return h + 1;
    }
    return 1;
  };
  const planets = J.PLANETS.map(name => {
    const lon = J.norm(t.lon[name] - ay), l = lords(lon);
    return { name, lon, house: inHouse(lon), ...l, retro: r.P[name].retro };
  });
  const byName = Object.fromEntries(planets.map(p => [p.name, p]));
  const inStarOf = lord => planets.filter(p => p.star === lord).map(p => p.name);
  const houses = cusps.map((lon, i) => {
    const l = lords(lon), occ = planets.filter(p => p.house === i + 1).map(p => p.name);
    const A = [...new Set(occ.flatMap(inStarOf))], C = inStarOf(l.sign);
    return { house: i + 1, lon, ...l, A, B: occ, C, D: [l.sign] };
  });
  // Each planet signifies: houses it occupies, houses whose cusp-sign it rules, and the same for its star lord
  const ownsHouses = name => houses.filter(h => h.sign === name).map(h => h.house);
  const signifies = planets.map(p => {
    const sl = byName[p.star];
    const set = new Set([sl.house, ...ownsHouses(sl.name), p.house, ...ownsHouses(p.name)]);
    return { name: p.name, houses: [...set].sort((a, b) => a - b) };
  });
  return { ayanamsa: ay, cusps: houses, planets, signifies };
}

// Ruling planets at a moment and place (day lord, Moon's sign/star/sub lords, Lagna's sign/star/sub lords)
function rulingPlanets(utMs, lat, lon) {
  const jd = utMs / 86400000 + 2440587.5, t = J.tropical(jd), ay = J.lahiri(t.jdTT) - KP_OFFSET;
  const asc = J.norm(J.ascendant(jd, lat, lon).asc - ay), moon = J.norm(t.lon.Moon - ay);
  return { lagna: lords(asc), moon: lords(moon) };
}

module.exports = { kp, lords, placidus, rulingPlanets, KP_OFFSET };
