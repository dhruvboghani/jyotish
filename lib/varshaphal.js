/* Varshaphal (Tajika annual chart).
   - Solar return: the moment the sidereal Sun returns to its natal longitude in the chosen year; chart cast for the
     birth place.
   - Muntha: natal Lagna sign advanced one sign per completed year.
   - Year lord (Varsheshwara): strongest of the five office-bearers (natal Lagna lord, Varsha Lagna lord, Muntha lord,
     Tri-rashi lord, and the day/night lord = lord of the Sun's sign for a daytime return, the Moon's sign at night),
     preferring one that aspects the Varsha Lagna by Tajika aspect.
   - Mudda dasha: Vimshottari compressed into the solar year, starting from
     (birth nakshatra no. + completed years − 2) mod 9 → Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, Ketu, Venus. */
const J = require('./engine.js');

const DAY = 86400000;
const toJd = ms => ms / DAY + 2440587.5, toMs = jd => Math.round((jd - 2440587.5) * DAY);
const MUDDA = ['Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu']; // remainder 0..8
const MUDDA_ORDER = ['Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus'];
// Tri-rashi lords [day, night] by Varsha Lagna sign
const TRI_RASHI = [['Sun', 'Jupiter'], ['Venus', 'Moon'], ['Saturn', 'Mercury'], ['Venus', 'Mars'], ['Jupiter', 'Sun'], ['Moon', 'Venus'],
  ['Mercury', 'Saturn'], ['Mars', 'Venus'], ['Saturn', 'Saturn'], ['Mars', 'Mars'], ['Jupiter', 'Jupiter'], ['Moon', 'Moon']];
const DIGNITY_PTS = { Exalted: 3, 'Own sign': 2, Friendly: 1, Neutral: 0, Enemy: -1, Debilitated: -2 };
// Muntha: good in 9, 10, 11; fair in 1, 2, 3, 5; difficult in 4, 6, 7, 8, 12
const MUNTHA_Q = { 1: 'fair', 2: 'fair', 3: 'fair', 4: 'bad', 5: 'fair', 6: 'bad', 7: 'bad', 8: 'bad', 9: 'good', 10: 'good', 11: 'good', 12: 'bad' };

function localFields(utMs, tzMinutes) {
  const d = new Date(utMs + tzMinutes * 60000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

function solarReturn(natalSun, guessMs) {
  let jd = toJd(guessMs);
  for (let i = 0; i < 8; i++) {
    const diff = J.norm(J.sidereal(jd).lon.Sun - natalSun + 180) - 180;
    jd -= diff / 0.9856;
    if (Math.abs(diff) < 1e-6) break;
  }
  return toMs(jd);
}

// Tajika aspect: a planet in house h (from the sign aspected) aspects it unless h is 2, 6, 8 or 12
const tajikaAspects = (fromSign, toSign) => ![1, 5, 7, 11].includes((toSign - fromSign + 12) % 12);

function varshaphal(input, targetYear) {
  const natal = J.compute(input);
  const years = targetYear - input.year;
  if (years < 0) return null;
  const guess = Date.UTC(targetYear, input.month - 1, Math.min(input.day, 28), input.hour, input.minute) - input.tzMinutes * 60000;
  const retMs = solarReturn(natal.P.Sun.lon, guess);
  const nextMs = solarReturn(natal.P.Sun.lon, retMs + 365.25 * DAY);
  // Same place, same standard offset as birth (an approximation when DST differs)
  const v = J.compute({ ...localFields(retMs, input.tzMinutes), lat: input.lat, lon: input.lon, tzMinutes: input.tzMinutes });
  // compute() works in whole minutes; keep the exact return moment
  const L = v.lagna.sign;
  const munthaSign = (natal.lagna.sign + years) % 12, munthaHouse = (munthaSign - L + 12) % 12 + 1;
  const dayChart = v.panchang.sunrise != null && v.panchang.sunset != null ? (v.jd >= v.panchang.sunrise && v.jd < v.panchang.sunset) : true;

  const offices = [
    { role: 'janmaLagna', lord: J.SIGN_LORD[natal.lagna.sign] },
    { role: 'varshaLagna', lord: J.SIGN_LORD[L] },
    { role: 'muntha', lord: J.SIGN_LORD[munthaSign] },
    { role: 'triRashi', lord: TRI_RASHI[L][dayChart ? 0 : 1] },
    { role: 'dinRatri', lord: J.SIGN_LORD[dayChart ? v.P.Sun.sign : v.P.Moon.sign] }
  ];
  const scored = offices.map((o, i) => {
    const p = v.P[o.lord];
    const aspects = tajikaAspects(p.sign, L);
    const kendra = [1, 4, 7, 10].includes(p.house), dusthana = [6, 8, 12].includes(p.house);
    const score = (DIGNITY_PTS[p.dignity] || 0) + (kendra ? 1 : 0) - (dusthana ? 1 : 0) - (p.combust ? 1 : 0);
    return { ...o, aspects, score, order: i, sign: p.sign, house: p.house, dignity: p.dignity };
  });
  const pool = scored.filter(s => s.aspects).length ? scored.filter(s => s.aspects) : scored;
  const yearLord = pool.slice().sort((a, b) => b.score - a.score || a.order - b.order)[0];

  // Mudda dasha
  const nakNo = natal.P.Moon.nak + 1;
  const startIdx = MUDDA_ORDER.indexOf(MUDDA[((nakNo + years - 2) % 9 + 9) % 9]);
  const span = nextMs - retMs, mudda = [];
  let t = retMs;
  for (let k = 0; k < 9; k++) {
    const lord = MUDDA_ORDER[(startIdx + k) % 9], len = span * J.DASHA_YEARS[lord] / 120;
    mudda.push({ lord, start: Math.round(t), end: Math.round(t + len) }); t += len;
  }

  return {
    year: targetYear, age: years, returnMs: retMs, nextReturnMs: nextMs, dayChart,
    lagna: { sign: L, deg: v.lagna.deg, lon: v.lagna.lon },
    planets: v.planets.map(p => ({ name: p.name, lon: p.lon, sign: p.sign, deg: p.deg, house: p.house, retro: p.retro, dignity: p.dignity })),
    muntha: { sign: munthaSign, house: munthaHouse, lord: J.SIGN_LORD[munthaSign], quality: MUNTHA_Q[munthaHouse] },
    yearLord: { planet: yearLord.lord, role: yearLord.role, sign: yearLord.sign, house: yearLord.house, dignity: yearLord.dignity, strong: yearLord.score >= 1 },
    offices: scored.map(({ role, lord, aspects, score }) => ({ role, lord, aspects, score })),
    mudda
  };
}

// The current year (last solar return on or before now) and the next one
function current(input, nowMs = Date.now()) {
  const local = new Date(nowMs + input.tzMinutes * 60000).getUTCFullYear();
  let v = varshaphal(input, local);
  if (v && v.returnMs > nowMs) v = varshaphal(input, local - 1);
  return v;
}

module.exports = { varshaphal, current, solarReturn };
