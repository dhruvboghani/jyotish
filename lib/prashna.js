/* Prashna (horary): a chart for the moment the question is asked, judged by classical rules.
   Factors (each adds or subtracts from a score):
   - Lagna lord and the lord of the house of the matter: joined, in mutual aspect, or in kendra from each other (+2);
     in 6/8/12 from each other (−1).
   - The matter's lord: in a kendra/trikona (+1) or a dusthana (−1); exalted/own (+1), debilitated or combust (−1).
   - The Moon: waxing (+1), in a kendra/trikona (+1), in 6/8/12 (−1).
   - Benefics in the Lagna or the house of the matter (+1); malefics in the house of the matter (−1).
   - A shirshodaya (head-rising) Lagna favours a quick result (+1); prishtodaya rises "backwards" (delay).
   - Lagna in its first or last 3° — the question is early or late; judge again later.
   Timing: movable Lagna → soon (days–weeks), fixed → slow (months), dual → in between. */
const J = require('./engine.js');

const TOPICS = { general: 11, career: 10, marriage: 7, money: 11, health: 1, travel: 9, property: 4, children: 5, education: 4, legal: 6 };
const BENEFIC = ['Jupiter', 'Venus', 'Mercury'], MALEFIC = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];
const SHIRSHA = [2, 4, 5, 6, 7, 10], PRISHTA = [0, 1, 3, 8, 9]; // Pisces (11) rises both ways
const ASPECT = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10] };
const aspects = (p, toSign) => { const h = (toSign - p.sign + 12) % 12 + 1; return h === 7 || (ASPECT[p.name] || []).includes(h); };
const houseFrom = (a, b) => (b - a + 12) % 12 + 1;

function localFields(utMs, tzMinutes) {
  const d = new Date(utMs + tzMinutes * 60000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

function prashna({ utMs, lat, lon, tzMinutes, topic }) {
  if (!TOPICS[topic]) topic = 'general';
  const r = J.compute({ ...localFields(utMs, tzMinutes), lat, lon, tzMinutes });
  const L = r.lagna.sign, H = TOPICS[topic], karyaSign = (L + H - 1) % 12;
  const ll = r.P[J.SIGN_LORD[L]], kl = r.P[J.SIGN_LORD[karyaSign]], moon = r.P.Moon;
  const f = [];
  const add = (id, pts, params) => f.push({ id, pts, params: params || {} });

  if (ll.name === kl.name) add('sameLord', 2, { p: ll.name });
  else {
    const rel = houseFrom(ll.sign, kl.sign);
    if (rel === 1) add('lordsJoined', 2, { a: ll.name, b: kl.name });
    else if (aspects(ll, kl.sign) && aspects(kl, ll.sign)) add('lordsAspect', 2, { a: ll.name, b: kl.name });
    else if ([4, 7, 10].includes(rel)) add('lordsKendra', 2, { a: ll.name, b: kl.name });
    else if ([5, 9].includes(rel)) add('lordsTrikona', 1, { a: ll.name, b: kl.name });
    else if ([6, 8, 12].includes(rel)) add('lordsDusthana', -1, { a: ll.name, b: kl.name });
  }
  if ([1, 4, 7, 10, 5, 9].includes(kl.house)) add('karyaGood', 1, { p: kl.name, h: kl.house });
  else if ([6, 8, 12].includes(kl.house)) add('karyaBad', -1, { p: kl.name, h: kl.house });
  if (kl.dignity === 'Exalted' || kl.dignity === 'Own sign') add('karyaStrong', 1, { p: kl.name });
  if (kl.dignity === 'Debilitated') add('karyaDebil', -1, { p: kl.name });
  if (kl.combust) add('karyaCombust', -1, { p: kl.name });

  const waxing = r.panchang.elong < 180;
  add(waxing ? 'moonWaxing' : 'moonWaning', waxing ? 1 : 0);
  if ([6, 8, 12].includes(moon.house)) add('moonDusthana', -1, { h: moon.house });
  else if ([1, 4, 7, 10, 5, 9].includes(moon.house)) add('moonGood', 1, { h: moon.house });

  const inSign = s => r.planets.filter(p => p.sign === s).map(p => p.name);
  const benL = inSign(L).filter(n => BENEFIC.includes(n) || (n === 'Moon' && waxing));
  const benK = H === 1 ? [] : inSign(karyaSign).filter(n => BENEFIC.includes(n) || (n === 'Moon' && waxing));
  const malK = inSign(karyaSign).filter(n => MALEFIC.includes(n) && n !== kl.name);
  if (benL.length || benK.length) add('benefics', 1, { list: [...new Set([...benL, ...benK])] });
  if (malK.length) add('malefics', -1, { list: malK });

  const rising = SHIRSHA.includes(L) ? 'head' : PRISHTA.includes(L) ? 'back' : 'both';
  if (rising === 'head') add('shirsha', 1);
  else if (rising === 'back') add('prishta', 0);

  const deg = r.lagna.deg, early = deg < 3, late = deg > 27;
  const score = f.reduce((s, x) => s + x.pts, 0);
  const verdict = score >= 5 ? 'yes' : score >= 3 ? 'likely' : score >= 1 ? 'mixed' : 'unlikely';
  const timing = L % 3 === 0 ? 'soon' : L % 3 === 1 ? 'slow' : 'medium';
  return {
    utMs: r.utMs, topic, house: H, lagna: { sign: L, deg, lon: r.lagna.lon }, lagnaLord: ll.name, karyaLord: kl.name,
    planets: r.planets.map(p => ({ name: p.name, lon: p.lon, sign: p.sign, deg: p.deg, house: p.house, retro: p.retro })),
    moon: { sign: moon.sign, nak: moon.nak, house: moon.house, waxing },
    factors: f, score, verdict, timing, rising, early, late
  };
}

module.exports = { prashna, TOPICS };
