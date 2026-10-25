/* Extra astronomy: Moon latitude and distance (Meeus ch. 47), moonrise/moonset, eclipses (Meeus ch. 54 with
   local circumstances of solar eclipses by topocentric Sun–Moon separation) and planetary stations (retrogrades). */
const J = require('./engine.js');

const D2R = Math.PI / 180, R2D = 180 / Math.PI, DAY = 86400000;
const sin = x => Math.sin(x * D2R), cos = x => Math.cos(x * D2R), norm = J.norm;
const toMs = jd => Math.round((jd - 2440587.5) * DAY), toJd = ms => ms / DAY + 2440587.5;

function deltaT(year) { // seconds, same polynomials as the engine (2005–2050 range is what we need)
  if (year >= 2005 && year < 2050) { const t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
  if (year >= 2050 && year < 2150) return -20 + 32 * ((year - 1820) / 100) ** 2 - 0.5628 * (2150 - year);
  if (year >= 1986 && year < 2005) { const t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  const u = (year - 1820) / 100; return -20 + 32 * u * u;
}
const ttOf = jdUT => jdUT + deltaT(2000 + (jdUT - 2451545) / 365.25) / 86400;

const MB = [[0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],[0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],[0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],[4,0,0,-1,1021],[4,0,-1,1,833]];
const MR = [[0,0,1,0,-20905355],[2,0,-1,0,-3699111],[2,0,0,0,-2955968],[0,0,2,0,-569925],[0,1,0,0,48888],[0,0,0,2,-3149],[2,0,-2,0,246158],[2,-1,-1,0,-152138],[2,0,1,0,-170733],[2,-1,0,0,-204586],[0,1,-1,0,-129620],[1,0,0,0,108743],[0,1,1,0,104755],[2,0,0,-2,10321],[0,0,1,-2,79661],[4,0,-1,0,-34782],[0,0,3,0,-23210],[4,0,-2,0,-21636],[2,1,-1,0,24208],[2,1,0,0,30824],[1,0,-1,0,-8379],[1,1,0,0,-16675],[2,-1,1,0,-12831],[2,0,2,0,-10445],[4,0,0,0,-11650],[2,0,-3,0,14403],[0,1,-2,0,-7003],[2,-1,-2,0,10056],[1,0,1,0,6322],[2,-2,0,0,-9884],[0,1,2,0,5751],[2,-2,-1,0,-4950],[2,0,1,-2,4130],[4,-1,-1,0,-3958],[3,0,-1,0,3258],[2,1,1,0,2616],[4,-1,-2,0,-1897],[0,2,-1,0,-2117],[2,2,-1,0,2354],[4,0,1,0,-1423],[0,0,4,0,-1117],[4,-1,0,0,-1571],[1,0,-2,0,-1739],[0,0,2,-2,-4421],[0,2,1,0,1165],[2,0,-1,-2,8752]];

// Moon ecliptic latitude (deg) and distance (km), tropical frame of date
function moonLatDist(jdTT) {
  const T = (jdTT - 2451545) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const A1 = 119.75 + 131.849 * T, A3 = 313.45 + 481266.484 * T;
  const ef = m => Math.abs(m) === 1 ? E : m ? E * E : 1;
  let b = 0, r = 0;
  for (const [d, m, mp, f, c] of MB) b += c * ef(m) * sin(d * D + m * M + mp * Mp + f * F);
  b += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F) + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);
  for (const [d, m, mp, f, c] of MR) r += c * ef(m) * Math.cos((d * D + m * M + mp * Mp + f * F) * D2R);
  return { lat: b / 1e6, dist: 385000.56 + r / 1000 };
}

const obliquity = jd => 23.4392911 - 0.0130042 * (jd - 2451545) / 36525;
const toEq = (lon, lat, eps) => ({
  ra: norm(Math.atan2(sin(lon) * cos(eps) - Math.tan(lat * D2R) * sin(eps), cos(lon)) * R2D),
  dec: Math.asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon)) * R2D
});
const gmst = jd => { const T = (jd - 2451545) / 36525; return norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T); };

// Geocentric equatorial positions of Sun and Moon at jd (UT)
function sunMoon(jd) {
  const t = J.tropical(jd), eps = obliquity(jd), m = moonLatDist(ttOf(jd));
  return { sun: toEq(t.lon.Sun, 0, eps), moon: toEq(t.lon.Moon, m.lat, eps), moonDist: m.dist, moonLon: t.lon.Moon, sunLon: t.lon.Sun };
}
// Topocentric Moon (Meeus ch. 40), altitude of a body
function topo(ra, dec, distKm, jd, lat, lon) {
  const par = Math.asin(6378.14 / distKm) * R2D, H = norm(gmst(jd) + lon - ra);
  const u = Math.atan(0.99664719 * Math.tan(lat * D2R)), rs = 0.99664719 * Math.sin(u), rc = Math.cos(u);
  const dA = Math.atan2(-rc * sin(par) * sin(H), cos(dec) - rc * sin(par) * cos(H)) * R2D;
  const dec2 = Math.atan2((sin(dec) - rs * sin(par)) * Math.cos(dA * D2R), cos(dec) - rc * sin(par) * cos(H)) * R2D;
  return { ra: ra + dA, dec: dec2, par };
}
const altitude = (ra, dec, jd, lat, lon) => { const H = norm(gmst(jd) + lon - ra); return Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(H)) * R2D; };

// Moonrise and moonset during the local civil day (UTC ms, or null)
function moonEvents({ year, month, day, lat, lon, tzMinutes }) {
  const start = toJd(Date.UTC(year, month - 1, day) - tzMinutes * 60000);
  const h = jd => { const s = sunMoon(jd), par = Math.asin(6378.14 / s.moonDist) * R2D; return altitude(s.moon.ra, s.moon.dec, jd, lat, lon) - (0.7275 * par - 0.5667); };
  let rise = null, set = null, prev = h(start), step = 1 / 72;
  for (let jd = start + step; jd <= start + 1 + 1e-9; jd += step) {
    const cur = h(jd);
    if ((prev < 0) !== (cur < 0)) {
      let lo = jd - step, hi = jd, up = prev < 0;
      for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if ((h(mid) < 0) === up) lo = mid; else hi = mid; }
      if (up && rise == null) rise = toMs(hi); else if (!up && set == null) set = toMs(hi);
    }
    prev = cur;
  }
  return { rise, set };
}

// ---------- Eclipses (Meeus ch. 54) ----------
function eclipseAt(k, lunar) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3;
  const M = 2.5534 + 29.10535670 * k - 0.0000014 * T2;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3;
  const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  if (Math.abs(sin(F)) > 0.36) return null;
  const F1 = F - 0.02665 * sin(Om), A1 = 299.77 + 0.107408 * k - 0.009173 * T2;
  jde += (lunar ? -0.4065 : -0.4075) * sin(Mp) + (lunar ? 0.1727 : 0.1721) * E * sin(M) + 0.0161 * sin(2 * Mp) - 0.0097 * sin(2 * F1) + 0.0073 * E * sin(Mp - M)
    - 0.0050 * E * sin(Mp + M) - 0.0023 * sin(Mp - 2 * F1) + 0.0021 * E * sin(2 * M) + 0.0012 * sin(Mp + 2 * F1) + 0.0006 * E * sin(2 * Mp + M)
    - 0.0004 * sin(3 * Mp) - 0.0003 * E * sin(M + 2 * F1) + 0.0003 * sin(A1) - 0.0002 * E * sin(M - 2 * F1) - 0.0002 * E * sin(2 * Mp - M) - 0.0002 * sin(Om);
  const P = 0.2070 * E * sin(M) + 0.0024 * E * sin(2 * M) - 0.0392 * sin(Mp) + 0.0116 * sin(2 * Mp) - 0.0073 * E * sin(Mp + M) + 0.0067 * E * sin(Mp - M) + 0.0118 * sin(2 * F1);
  const Q = 5.2207 - 0.0048 * E * cos(M) + 0.0020 * E * cos(2 * M) - 0.3299 * cos(Mp) - 0.0060 * E * cos(Mp + M) + 0.0041 * E * cos(Mp - M);
  const W = Math.abs(cos(F1)), g = (P * cos(F1) + Q * sin(F1)) * (1 - 0.0048 * W);
  const u = 0.0059 + 0.0046 * E * cos(M) - 0.0182 * cos(Mp) + 0.0004 * cos(2 * Mp) - 0.0005 * cos(M + Mp);
  const jdUT = jde - deltaT(2000 + k / 12.3685) / 86400, ag = Math.abs(g);
  if (lunar) {
    const pen = (1.5573 + u - ag) / 0.5450, umb = (1.0128 - u - ag) / 0.5450;
    if (pen <= 0) return null;
    const n = 0.5458 + 0.0400 * cos(Mp), sd = x => x > ag ? 60 / n * Math.sqrt(x * x - g * g) : 0;
    return { kind: 'lunar', type: umb >= 1 ? 'total' : umb > 0 ? 'partial' : 'penumbral', max: toMs(jdUT), magnitude: umb > 0 ? umb : pen,
      semi: { pen: sd(1.5573 + u), partial: sd(1.0128 - u), total: sd(0.4678 - u) } };
  }
  if (ag > 1.5433 + u) return null;
  const type = ag < 0.9972 ? (u < 0 ? 'total' : u > 0.0047 ? 'annular' : (u < 0.00464 * Math.sqrt(1 - g * g) ? 'hybrid' : 'annular')) : 'partial';
  return { kind: 'solar', type, max: toMs(jdUT), magnitude: ag < 0.9972 ? 1 : (1.5433 + u - ag) / (0.5461 + 2 * u), gamma: g };
}
// Local circumstances of a solar eclipse: scan ±4 h around greatest eclipse
function solarLocal(e, lat, lon) {
  const t0 = toJd(e.max) - 4 / 24, n = 8 * 60;
  let start = null, end = null, best = null;
  for (let i = 0; i <= n; i++) {
    const jd = t0 + i / 1440, s = sunMoon(jd), m = topo(s.moon.ra, s.moon.dec, s.moonDist, jd, lat, lon);
    const sep = Math.acos(Math.max(-1, Math.min(1, sin(s.sun.dec) * sin(m.dec) + cos(s.sun.dec) * cos(m.dec) * cos(s.sun.ra - m.ra)))) * R2D;
    const rs = 0.2666, rm = 0.2725 * m.par * 1.0 * (1 + 0), on = sep < rs + rm;
    const alt = altitude(s.sun.ra, s.sun.dec, jd, lat, lon);
    if (on && alt > -0.833) {
      if (start == null) start = toMs(jd);
      end = toMs(jd);
      const mag = (rs + rm - sep) / (2 * rs);
      if (!best || mag > best.mag) best = { mag, at: toMs(jd) };
    }
  }
  return start == null ? { visible: false } : { visible: true, start, end, max: best.at, magnitude: Math.min(1, best.mag) };
}
// All eclipses between two dates, with local visibility, sutak and the sidereal sign/nakshatra of the eclipse
function eclipses({ fromMs, toMs: endMs, lat, lon }) {
  const out = [];
  const y0 = new Date(fromMs).getUTCFullYear() + new Date(fromMs).getUTCMonth() / 12;
  const k0 = Math.floor((y0 - 2000) * 12.3685) - 1, k1 = k0 + Math.ceil((endMs - fromMs) / (29.53 * DAY)) + 2;
  for (let k = k0; k <= k1; k++) for (const lunar of [false, true]) {
    const e = eclipseAt(k + (lunar ? 0.5 : 0), lunar);
    if (!e || e.max < fromMs || e.max > endMs) continue;
    const sid = J.sidereal(toJd(e.max)).lon, L = lunar ? sid.Moon : sid.Sun;
    e.sign = Math.floor(L / 30); e.nak = Math.floor(L / (360 / 27));
    if (lunar) {
      const at = ms => { const jd = toJd(ms), s = sunMoon(jd); return altitude(s.moon.ra, s.moon.dec, jd, lat, lon); };
      const p = e.semi.partial, start = p ? e.max - p * 60000 : e.max - e.semi.pen * 60000, end = p ? e.max + p * 60000 : e.max + e.semi.pen * 60000;
      let vis = false; for (let ms = start; ms <= end; ms += 5 * 60000) if (at(ms) > 0) { vis = true; break; }
      e.local = { visible: vis, start, end, penStart: e.max - e.semi.pen * 60000, penEnd: e.max + e.semi.pen * 60000, totalStart: e.semi.total ? e.max - e.semi.total * 60000 : null, totalEnd: e.semi.total ? e.max + e.semi.total * 60000 : null };
      e.sutak = vis && p ? start - 9 * 3600000 : null; // no sutak for a penumbral-only eclipse
    } else {
      e.local = solarLocal(e, lat, lon);
      e.sutak = e.local.visible ? e.local.start - 12 * 3600000 : null;
    }
    delete e.semi; delete e.gamma;
    out.push(e);
  }
  return out.sort((a, b) => a.max - b.max);
}

// ---------- Stations: retrograde and direct dates ----------
function stations({ fromMs, toMs: endMs }) {
  const out = [], PL = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const speed = (jd, p) => J.norm(J.transit(jd + 0.25).lon[p] - J.transit(jd - 0.25).lon[p] + 180) - 180;
  for (const p of PL) {
    let jd = toJd(fromMs), sp = speed(jd, p);
    out.push({ planet: p, kind: sp < 0 ? 'inRetro' : 'inDirect', at: fromMs, current: true, sign: Math.floor(J.transit(jd).lon[p] / 30) });
    for (; jd < toJd(endMs); jd += 1) {
      const s2 = speed(jd + 1, p);
      if ((sp < 0) !== (s2 < 0)) {
        let lo = jd, hi = jd + 1;
        for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if ((speed(mid, p) < 0) === (sp < 0)) lo = mid; else hi = mid; }
        out.push({ planet: p, kind: s2 < 0 ? 'retro' : 'direct', at: toMs(hi), sign: Math.floor(J.transit(hi).lon[p] / 30) });
      }
      sp = s2;
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

module.exports = { moonLatDist, moonEvents, eclipses, eclipseAt, stations, sunMoon, altitude, topo };
