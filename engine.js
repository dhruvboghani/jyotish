/* Kundali Ganit — calculation engine. Pure math, no external data.
   Planet theory: Schlyter orbital elements with perturbations (mean equinox of date).
   Ayanamsa: Lahiri (Chitrapaksha). Houses: whole sign from Lagna. */
(function (root) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm = x => ((x % 360) + 360) % 360;
  const sin = x => Math.sin(x * D2R), cos = x => Math.cos(x * D2R);
  const atan2 = (y, x) => norm(Math.atan2(y, x) * R2D);

  function julianDay(y, m, d, h) { // Gregorian, h in fractional hours UT
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + h / 24 + B - 1524.5;
  }

  function deltaT(year) { // seconds (Espenak & Meeus polynomials)
    let t;
    if (year >= 2005 && year < 2050) { t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (year >= 1986 && year < 2005) { t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    if (year >= 1961 && year < 1986) { t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
    if (year >= 1941 && year < 1961) { t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
    if (year >= 1920 && year < 1941) { t = year - 1920; return 21.20 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3; }
    if (year >= 1900 && year < 1920) { t = year - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
    if (year >= 2050 && year < 2150) { return -20 + 32 * ((year - 1820) / 100) ** 2 - 0.5628 * (2150 - year); }
    const u = (year - 1820) / 100; return -20 + 32 * u * u;
  }

  function kepler(M, e) {
    let E = M + e * R2D * sin(M) * (1 + e * cos(M));
    for (let i = 0; i < 8; i++) E = E - (E - e * R2D * sin(E) - M) / (1 - e * cos(E));
    return E;
  }

  const ELEM = {
    Mercury: d => [48.3313 + 3.24587e-5 * d, 7.0047 + 5.0e-8 * d, 29.1241 + 1.01444e-5 * d, 0.387098, 0.205635 + 5.59e-10 * d, 168.6562 + 4.0923344368 * d],
    Venus: d => [76.6799 + 2.4659e-5 * d, 3.3946 + 2.75e-8 * d, 54.891 + 1.38374e-5 * d, 0.72333, 0.006773 - 1.302e-9 * d, 48.0052 + 1.6021302244 * d],
    Mars: d => [49.5574 + 2.11081e-5 * d, 1.8497 - 1.78e-8 * d, 286.5016 + 2.92961e-5 * d, 1.523688, 0.093405 + 2.516e-9 * d, 18.6021 + 0.5240207766 * d],
    Jupiter: d => [100.4542 + 2.76854e-5 * d, 1.303 - 1.557e-7 * d, 273.8777 + 1.64505e-5 * d, 5.20256, 0.048498 + 4.469e-9 * d, 19.895 + 0.0830853001 * d],
    Saturn: d => [113.6634 + 2.3898e-5 * d, 2.4886 - 1.081e-7 * d, 339.3939 + 2.97661e-5 * d, 9.55475, 0.055546 - 9.499e-9 * d, 316.967 + 0.0334442282 * d]
  };

  function helio(name, d) {
    const [N, i, w, a, e, M] = ELEM[name](d);
    const E = kepler(norm(M), e);
    const xv = a * (cos(E) - e), yv = a * Math.sqrt(1 - e * e) * sin(E);
    const v = atan2(yv, xv), r = Math.hypot(xv, yv);
    const xh = r * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i));
    const yh = r * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i));
    const zh = r * sin(v + w) * sin(i);
    let lon = atan2(yh, xh), lat = Math.atan2(zh, Math.hypot(xh, yh)) * R2D;
    if (name === 'Jupiter' || name === 'Saturn') {
      const Mj = norm(19.895 + 0.0830853001 * d), Ms = norm(316.967 + 0.0334442282 * d);
      if (name === 'Jupiter') {
        lon += -0.332 * sin(2 * Mj - 5 * Ms - 67.6) - 0.056 * sin(2 * Mj - 2 * Ms + 21) + 0.042 * sin(3 * Mj - 5 * Ms + 21)
          - 0.036 * sin(Mj - 2 * Ms) + 0.022 * cos(Mj - Ms) + 0.023 * sin(2 * Mj - 3 * Ms + 52) - 0.016 * sin(Mj - 5 * Ms - 69);
      } else {
        lon += 0.812 * sin(2 * Mj - 5 * Ms - 67.6) - 0.229 * cos(2 * Mj - 4 * Ms - 2) + 0.119 * sin(Mj - 2 * Ms - 3)
          + 0.046 * sin(2 * Mj - 6 * Ms - 69) + 0.014 * sin(Mj - 3 * Ms + 32);
        lat += -0.02 * cos(2 * Mj - 4 * Ms - 2) + 0.018 * sin(2 * Mj - 6 * Ms - 49);
      }
    }
    return [r * cos(lat) * cos(lon), r * cos(lat) * sin(lon), r * sin(lat)];
  }

  function sunPos(d) {
    const w = 282.9404 + 4.70935e-5 * d, e = 0.016709 - 1.151e-9 * d, M = norm(356.047 + 0.9856002585 * d);
    const E = kepler(M, e);
    const xv = cos(E) - e, yv = Math.sqrt(1 - e * e) * sin(E);
    return { lon: norm(atan2(yv, xv) + w), r: Math.hypot(xv, yv), M, L: norm(M + w) };
  }

  function moonPos(d, sun) {
    const N = 125.1228 - 0.0529538083 * d, i = 5.1454, w = 318.0634 + 0.1643573223 * d, e = 0.0549;
    const M = norm(115.3654 + 13.0649929509 * d);
    const E = kepler(M, e);
    const xv = 60.2666 * (cos(E) - e), yv = 60.2666 * Math.sqrt(1 - e * e) * sin(E);
    const v = atan2(yv, xv);
    const xh = cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(i);
    const yh = sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(i);
    let lon = atan2(yh, xh);
    const Lm = norm(M + w + N), D = norm(Lm - sun.L), F = norm(Lm - N), Ms = sun.M;
    lon += -1.274 * sin(M - 2 * D) + 0.658 * sin(2 * D) - 0.186 * sin(Ms) - 0.059 * sin(2 * M - 2 * D)
      - 0.057 * sin(M - 2 * D + Ms) + 0.053 * sin(M + 2 * D) + 0.046 * sin(2 * D - Ms) + 0.041 * sin(M - Ms)
      - 0.035 * sin(D) - 0.031 * sin(M + Ms) - 0.015 * sin(2 * F - 2 * D) + 0.011 * sin(M - 4 * D);
    return { lon: norm(lon), node: norm(N) };
  }

  // Meeus ch.47 lunar longitude (60 periodic terms) — ~10" accuracy
  const ML = [[0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],[0,0,0,2,-114332],[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],[4,0,-2,0,8548],[2,1,-1,0,-7888],[2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],[2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],[1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],[2,0,1,-2,-1773],[2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],[2,1,1,0,-810],[4,-1,-2,0,759],[0,2,-1,0,-713],[2,2,-1,0,-700],[2,1,-2,0,691],[2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],[4,-1,0,0,520],[1,0,-2,0,-487],[2,1,0,-2,-399],[0,0,2,-2,-381],[1,1,1,0,351],[3,0,-2,0,-340],[4,0,-3,0,330],[2,-1,2,0,327],[0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]];
  function moonMeeus(jdTT) {
    const T = (jdTT - 2451545) / 36525;
    const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000;
    const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000;
    const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000;
    const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000;
    const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    let s = 0;
    for (const [d, m, mp, f, c] of ML) s += c * (Math.abs(m) === 1 ? E : m ? E * E : 1) * sin(d * D + m * M + mp * Mp + f * F);
    s += 3958 * sin(119.75 + 131.849 * T) + 1962 * sin(Lp - F) + 318 * sin(53.09 + 479264.29 * T);
    const node = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T ** 3 / 467441 - T ** 4 / 60616000;
    return { lon: norm(Lp + s / 1e6), node: norm(node) };
  }

  function lahiri(jd) { // mean Lahiri ayanamsa, fitted to Swiss Ephemeris SE_SIDM_LAHIRI
    const T = (jd - 2451545) / 36525;
    return LAHIRI[0] + LAHIRI[1] * T + LAHIRI[2] * T * T;
  }
  const LAHIRI = [23.85709, 1.396971, 0.000308];

  function tropical(jdUT) {
    const y = 2000 + (jdUT - 2451545) / 365.25;
    const jdTT = jdUT + deltaT(y) / 86400, d = jdTT - 2451543.5;
    const sun = sunPos(d), moon = moonMeeus(jdTT);
    const xs = sun.r * cos(sun.lon), ys = sun.r * sin(sun.lon);
    const out = { Sun: sun.lon, Moon: moon.lon, Rahu: moon.node };
    for (const p of ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
      const [x, yy] = helio(p, d);
      out[p] = atan2(yy + ys, x + xs);
    }
    out.Ketu = norm(out.Rahu + 180);
    return { lon: out, jdTT };
  }

  function ascendant(jdUT, lat, lon) {
    const T = (jdUT - 2451545) / 36525;
    const gmst = 280.46061837 + 360.98564736629 * (jdUT - 2451545) + 0.000387933 * T * T - T ** 3 / 38710000;
    const lst = norm(gmst + lon), eps = 23.4392911 - 0.0130042 * T;
    const asc = atan2(cos(lst), -(sin(lst) * cos(eps) + Math.tan(lat * D2R) * sin(eps)));
    const mc = atan2(sin(lst), cos(lst) * cos(eps));
    return { asc, mc, lst, eps };
  }

  const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

  function sidereal(jdUT) {
    const t = tropical(jdUT), ay = lahiri(t.jdTT), r = {};
    for (const p of PLANETS) r[p] = norm(t.lon[p] - ay);
    return { lon: r, ayanamsa: ay };
  }

  // Sun equatorial for sunrise
  function sunRaDec(jdUT) {
    const t = tropical(jdUT), T = (jdUT - 2451545) / 36525, eps = 23.4392911 - 0.0130042 * T, l = t.lon.Sun;
    return { ra: atan2(cos(eps) * sin(l), cos(l)), dec: Math.asin(sin(eps) * sin(l)) * R2D };
  }
  function gmstDeg(jd) { const T = (jd - 2451545) / 36525; return norm(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T); }

  function sunEvents(jdLocalMidnightUT, lat, lon) {
    let jt = jdLocalMidnightUT + 0.5;
    for (let k = 0; k < 3; k++) {
      const s = sunRaDec(jt);
      let ha = norm(gmstDeg(jt) + lon - s.ra); if (ha > 180) ha -= 360;
      jt -= ha / 360;
    }
    const ev = sign => {
      let j = jt;
      for (let k = 0; k < 3; k++) {
        const s = sunRaDec(j);
        const c = (sin(-0.8333) - sin(lat) * sin(s.dec)) / (cos(lat) * cos(s.dec));
        if (c < -1 || c > 1) return null;
        const H0 = Math.acos(c) * R2D;
        let ha = norm(gmstDeg(j) + lon - s.ra); if (ha > 180) ha -= 360;
        j = j - (ha - sign * H0) / 360;
      }
      return j;
    };
    return { rise: ev(-1), set: ev(1), noon: jt };
  }

  // ---------- Reference tables ----------
  const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const RASHI = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'];
  const RASHI_DEV = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
  const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const NAK = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];
  const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
  const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
  const TITHI = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi'];
  const YOGA = ['Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shoola', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti'];
  const KARANA_MOV = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];
  const VARA = ['Ravivara (Sunday)', 'Somavara (Monday)', 'Mangalavara (Tuesday)', 'Budhavara (Wednesday)', 'Guruvara (Thursday)', 'Shukravara (Friday)', 'Shanivara (Saturday)'];
  const VARA_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const GANA = 'DMRMDMDDRRMMDRDRDRRMMDRRMMD'; // D=Deva M=Manushya R=Rakshasa
  const NADI_P = ['Adi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Adi'];
  const YONI = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Serpent', 'Dog', 'Cat', 'Sheep', 'Cat', 'Rat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Buffalo', 'Tiger', 'Deer', 'Deer', 'Dog', 'Monkey', 'Mongoose', 'Monkey', 'Lion', 'Horse', 'Lion', 'Cow', 'Elephant'];
  const SYLL = 'Chu Che Cho La|Li Lu Le Lo|A I U E|O Va Vi Vu|Ve Vo Ka Ki|Ku Gha Ng Chha|Ke Ko Ha Hi|Hu He Ho Da|Di Du De Do|Ma Mi Mu Me|Mo Ta Ti Tu|Te To Pa Pi|Pu Sha Na Tha|Pe Po Ra Ri|Ru Re Ro Ta|Ti Tu Te To|Na Ni Nu Ne|No Ya Yi Yu|Ye Yo Bha Bhi|Bhu Dha Pha Dha|Bhe Bho Ja Ji|Khi Khu Khe Kho|Ga Gi Gu Ge|Go Sa Si Su|Se So Da Di|Du Tha Jha Na|De Do Cha Chi'.split('|').map(s => s.split(' '));
  const VARNA = ['Kshatriya', 'Vaishya', 'Shudra', 'Brahmin'];
  const TATVA = ['Fire (Agni)', 'Earth (Prithvi)', 'Air (Vayu)', 'Water (Jala)'];
  const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 7 };
  const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
  const REL = { // natural friendship: F friend, N neutral, E enemy
    Sun: { Moon: 'F', Mars: 'F', Jupiter: 'F', Mercury: 'N', Venus: 'E', Saturn: 'E' },
    Moon: { Sun: 'F', Mercury: 'F', Mars: 'N', Jupiter: 'N', Venus: 'N', Saturn: 'N' },
    Mars: { Sun: 'F', Moon: 'F', Jupiter: 'F', Venus: 'N', Saturn: 'N', Mercury: 'E' },
    Mercury: { Sun: 'F', Venus: 'F', Mars: 'N', Jupiter: 'N', Saturn: 'N', Moon: 'E' },
    Jupiter: { Sun: 'F', Moon: 'F', Mars: 'F', Saturn: 'N', Mercury: 'E', Venus: 'E' },
    Venus: { Mercury: 'F', Saturn: 'F', Mars: 'N', Jupiter: 'N', Sun: 'E', Moon: 'E' },
    Saturn: { Mercury: 'F', Venus: 'F', Jupiter: 'N', Sun: 'E', Moon: 'E', Mars: 'E' }
  };
  const COMBUST = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
  const COMBUST_R = { Mercury: 12, Venus: 8 };
  // Ashtakavarga: houses counted from each contributor [Sun,Moon,Mars,Mercury,Jupiter,Venus,Saturn,Lagna]
  const AV = {
    Sun: ['1,2,4,7,8,9,10,11', '3,6,10,11', '1,2,4,7,8,9,10,11', '3,5,6,9,10,11,12', '5,6,9,11', '6,7,12', '1,2,4,7,8,9,10,11', '3,4,6,10,11,12'],
    Moon: ['3,6,7,8,10,11', '1,3,6,7,10,11', '2,3,5,6,9,10,11', '1,3,4,5,7,8,10,11', '1,4,7,8,10,11,12', '3,4,5,7,9,10,11', '3,5,6,11', '3,6,10,11'],
    Mars: ['3,5,6,10,11', '3,6,11', '1,2,4,7,8,10,11', '3,5,6,11', '6,10,11,12', '6,8,11,12', '1,4,7,8,9,10,11', '1,3,6,10,11'],
    Mercury: ['5,6,9,11,12', '2,4,6,8,10,11', '1,2,4,7,8,9,10,11', '1,3,5,6,9,10,11,12', '6,8,11,12', '1,2,3,4,5,8,9,11', '1,2,4,7,8,9,10,11', '1,2,4,6,8,10,11'],
    Jupiter: ['1,2,3,4,7,8,9,10,11', '2,5,7,9,11', '1,2,4,7,8,10,11', '1,2,4,5,6,9,10,11', '1,2,3,4,7,8,10,11', '2,5,6,9,10,11', '3,5,6,12', '1,2,4,5,6,7,9,10,11'],
    Venus: ['8,11,12', '1,2,3,4,5,8,9,11,12', '3,5,6,9,11,12', '3,5,6,9,11', '5,8,9,10,11', '1,2,3,4,5,8,9,10,11', '3,4,5,8,9,10,11', '1,2,3,4,5,8,9,11'],
    Saturn: ['1,2,4,7,8,10,11', '3,6,11', '3,5,6,10,11,12', '6,8,9,10,11,12', '5,6,11,12', '6,11,12', '3,5,6,11', '1,3,4,6,10,11']
  };

  // ---------- Time zone helper (IANA, handles DST and historical offsets) ----------
  function tzOffsetMinutes(tz, y, mo, d, h, mi) {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    const offAt = ms => {
      const p = {}; for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value;
      return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms) / 60000;
    };
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    let off = offAt(guess); off = offAt(guess - off * 60000);
    return off;
  }

  // ---------- Main computation ----------
  function compute(input) {
    const { year, month, day, hour, minute, lat, lon, tzMinutes } = input;
    const utMs = Date.UTC(year, month - 1, day, hour, minute) - tzMinutes * 60000;
    const jd = utMs / 86400000 + 2440587.5;
    const sid = sidereal(jd);
    const prev = sidereal(jd - 0.5).lon, next = sidereal(jd + 0.5).lon;
    const a = ascendant(jd, lat, lon);
    const ascSid = norm(a.asc - sid.ayanamsa);
    const lagnaSign = Math.floor(ascSid / 30);

    const planets = PLANETS.map(p => {
      const L = sid.lon[p], sign = Math.floor(L / 30), deg = L - sign * 30;
      let speed = norm(next[p] - prev[p] + 180) - 180;
      const retro = p === 'Rahu' || p === 'Ketu' ? true : (p === 'Sun' || p === 'Moon' ? false : speed < 0);
      const nak = Math.floor(L / (360 / 27)), pada = Math.floor((L % (360 / 27)) / (360 / 108)) + 1;
      let dignity = '';
      if (EXALT[p] !== undefined && sign === EXALT[p]) dignity = 'Exalted';
      else if (EXALT[p] !== undefined && sign === (EXALT[p] + 6) % 12) dignity = 'Debilitated';
      else if (OWN[p] && OWN[p].includes(sign)) dignity = 'Own sign';
      else if (REL[p]) { const r = REL[p][SIGN_LORD[sign]]; dignity = r === 'F' ? 'Friendly' : r === 'E' ? 'Enemy' : 'Neutral'; }
      let combust = false;
      if (COMBUST[p]) {
        const sep = Math.abs(norm(L - sid.lon.Sun + 180) - 180);
        combust = sep < (retro && COMBUST_R[p] ? COMBUST_R[p] : COMBUST[p]);
      }
      return { name: p, lon: L, sign, deg, retro, speed, nak, pada, nakLord: DASHA_ORDER[nak % 9], house: ((sign - lagnaSign + 12) % 12) + 1, dignity, combust, navamsa: Math.floor(L / (10 / 3)) % 12 };
    });
    const P = Object.fromEntries(planets.map(p => [p.name, p]));
    const lagna = { lon: ascSid, sign: lagnaSign, deg: ascSid - lagnaSign * 30, nak: Math.floor(ascSid / (360 / 27)), pada: Math.floor((ascSid % (360 / 27)) / (360 / 108)) + 1, navamsa: Math.floor(ascSid / (10 / 3)) % 12 };
    lagna.nakLord = DASHA_ORDER[lagna.nak % 9];

    // Panchang
    const moon = sid.lon.Moon, sun = sid.lon.Sun, elong = norm(moon - sun);
    const tIdx = Math.floor(elong / 12);
    const paksha = tIdx < 15 ? 'Shukla' : 'Krishna';
    const tithiName = tIdx === 14 ? 'Purnima' : tIdx === 29 ? 'Amavasya' : TITHI[tIdx % 15];
    const kIdx = Math.floor(elong / 6);
    const karana = kIdx === 0 ? 'Kimstughna' : kIdx === 57 ? 'Shakuni' : kIdx === 58 ? 'Chatushpada' : kIdx === 59 ? 'Naga' : KARANA_MOV[(kIdx - 1) % 7];
    const yogaIdx = Math.floor(norm(sun + moon) / (360 / 27));
    const localMid = Date.UTC(year, month - 1, day) - tzMinutes * 60000;
    const jdLocalMid = localMid / 86400000 + 2440587.5;
    const ev = sunEvents(jdLocalMid, lat, lon);
    let wd = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const bornBeforeSunrise = ev.rise !== null && jd < ev.rise;
    const varaIdx = bornBeforeSunrise ? (wd + 6) % 7 : wd;

    // Moon-based details (Avakahada)
    const mSign = P.Moon.sign, mNak = P.Moon.nak, mDegInSign = P.Moon.deg;
    let vashya = ['Chatushpad', 'Chatushpad', 'Manav', 'Jalchar', 'Vanchar', 'Manav', 'Manav', 'Keet', mDegInSign < 15 ? 'Manav' : 'Chatushpad', mDegInSign < 15 ? 'Chatushpad' : 'Jalchar', 'Manav', 'Jalchar'][mSign];
    const gana = { D: 'Deva', M: 'Manushya', R: 'Rakshasa' }[GANA[mNak]];
    const avakahada = {
      rashi: mSign, rashiLord: SIGN_LORD[mSign], nakshatra: mNak, pada: P.Moon.pada, nakLord: DASHA_ORDER[mNak % 9],
      varna: VARNA[mSign % 4], vashya, yoni: YONI[mNak], gana, nadi: NADI_P[mNak % 6], tatva: TATVA[mSign % 4],
      syllable: SYLL[mNak][P.Moon.pada - 1], lagnaLord: SIGN_LORD[lagnaSign]
    };

    // Vimshottari dasha
    const nakLen = 360 / 27, frac = (moon % nakLen) / nakLen;
    const startLordIdx = mNak % 9;
    const YEAR_MS = 365.25 * 86400000;
    let t = utMs - frac * DASHA_YEARS[DASHA_ORDER[startLordIdx]] * YEAR_MS;
    const dashas = [];
    for (let k = 0; k < 9 * 2; k++) {
      const lord = DASHA_ORDER[(startLordIdx + k) % 9], yrs = DASHA_YEARS[lord];
      const md = { lord, start: t, end: t + yrs * YEAR_MS, sub: [] };
      let s = t;
      for (let j = 0; j < 9; j++) {
        const al = DASHA_ORDER[(startLordIdx + k + j) % 9], len = yrs * DASHA_YEARS[al] / 120 * YEAR_MS;
        md.sub.push({ lord: al, start: s, end: s + len }); s += len;
      }
      dashas.push(md); t = md.end;
      if (t > utMs + 121 * YEAR_MS) break;
    }
    const balance = { lord: DASHA_ORDER[startLordIdx], years: (1 - frac) * DASHA_YEARS[DASHA_ORDER[startLordIdx]] };

    // Doshas
    const marsFromL = P.Mars.house, marsFromM = ((P.Mars.sign - mSign + 12) % 12) + 1, marsFromV = ((P.Mars.sign - P.Venus.sign + 12) % 12) + 1;
    const MANGAL = [1, 2, 4, 7, 8, 12];
    const manglik = { lagna: MANGAL.includes(marsFromL), moon: MANGAL.includes(marsFromM), venus: MANGAL.includes(marsFromV), houseL: marsFromL, houseM: marsFromM, houseV: marsFromV };
    const rahu = sid.lon.Rahu;
    const seven = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].map(p => norm(sid.lon[p] - rahu));
    const kaalSarp = seven.every(x => x < 180) ? 'Kaal Sarp (planets from Rahu to Ketu)' : seven.every(x => x > 180) ? 'Kaal Amrit (planets from Ketu to Rahu)' : null;

    // Ashtakavarga
    const contributors = [...['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].map(p => P[p].sign), lagnaSign];
    const bav = {}, sav = new Array(12).fill(0);
    for (const p of Object.keys(AV)) {
      bav[p] = new Array(12).fill(0);
      AV[p].forEach((list, ci) => list.split(',').forEach(h => { bav[p][(contributors[ci] + +h - 1) % 12]++; }));
      bav[p].forEach((v, s) => sav[s] += v);
    }

    return {
      jd, utMs, ayanamsa: sid.ayanamsa, lagna, planets, P, mc: norm(a.mc - sid.ayanamsa),
      panchang: { tithi: tIdx + 1, tithiName, paksha, karana, yoga: YOGA[yogaIdx], yogaIdx, vara: VARA[varaIdx], varaLord: VARA_LORD[varaIdx], elong, sunrise: ev.rise, sunset: ev.set, bornBeforeSunrise },
      avakahada, dashas, balance, manglik, kaalSarp, bav, sav
    };
  }

  function transit(jdUT) { return sidereal(jdUT); }

  const api = { compute, sidereal, tropical, ascendant, lahiri, julianDay, tzOffsetMinutes, transit, sunEvents, norm,
    SIGNS, RASHI, RASHI_DEV, SIGN_LORD, NAK, DASHA_ORDER, DASHA_YEARS, PLANETS };
  if (typeof module !== 'undefined') module.exports = api; else root.Jyotish = api;
})(typeof window !== 'undefined' ? window : globalThis);
