/* Yogini dasha (8 yoginis, 36-year cycle) and Jaimini Chara dasha (sign dashas, K. N. Rao method). */
const J = require('./engine.js');

const YEAR = 365.25 * 86400000;
const YOGINI = [['Mangala', 'Moon', 1], ['Pingala', 'Sun', 2], ['Dhanya', 'Jupiter', 3], ['Bhramari', 'Mars', 4], ['Bhadrika', 'Mercury', 5], ['Ulka', 'Saturn', 6], ['Siddha', 'Venus', 7], ['Sankata', 'Rahu', 8]];

function yogini(r, years = 100) {
  const moon = r.P.Moon.lon, nakLen = 360 / 27, nak = Math.floor(moon / nakLen), frac = (moon % nakLen) / nakLen;
  const startIdx = ((nak + 1 + 3) % 8 + 7) % 8; // (nakshatra number + 3) mod 8, 1 = Mangala … 0 = Sankata
  const first = YOGINI[startIdx];
  let t = r.utMs - frac * first[2] * YEAR;
  const list = [];
  for (let k = 0; t < r.utMs + years * YEAR; k++) {
    const [name, lord, yrs] = YOGINI[(startIdx + k) % 8];
    const md = { name, lord, years: yrs, start: t, end: t + yrs * YEAR, sub: [] };
    let s = t;
    for (let j = 0; j < 8; j++) {
      const [n2, l2, y2] = YOGINI[(startIdx + k + j) % 8], len = yrs * y2 / 36 * YEAR;
      md.sub.push({ name: n2, lord: l2, start: s, end: s + len }); s += len;
    }
    list.push(md); t = md.end;
  }
  return { list, balance: { name: first[0], years: (1 - frac) * first[2] } };
}

// Chara dasha
const SAVYA = [0, 1, 2, 6, 7, 8]; // signs counted forward ("savya" group); the rest are counted backward
function charaLord(s, r) {
  const P = r.P;
  if (s === 7 || s === 10) {
    const [a, b] = s === 7 ? ['Mars', 'Ketu'] : ['Saturn', 'Rahu'];
    if (P[a].sign === s && P[b].sign !== s) return b;
    if (P[b].sign === s && P[a].sign !== s) return a;
    const with_ = n => r.planets.filter(p => p.sign === P[n].sign && p.name !== n).length;
    if (with_(a) !== with_(b)) return with_(a) > with_(b) ? a : b;
    return P[a].deg >= P[b].deg ? a : b;
  }
  return J.SIGN_LORD[s];
}
function charaYears(s, r) {
  const lord = charaLord(s, r), ls = r.P[lord].sign;
  const n = SAVYA.includes(s) ? (ls - s + 12) % 12 : (s - ls + 12) % 12;
  return n === 0 ? 12 : n;
}
function chara(r) {
  const L = r.lagna.sign, ninth = (L + 8) % 12, forward = SAVYA.includes(ninth);
  const seq = Array.from({ length: 12 }, (_, i) => (forward ? L + i : L - i + 120) % 12);
  const list = []; let t = r.utMs;
  for (const cycle of [1, 2]) for (const s of seq) {
    const y1 = charaYears(s, r), yrs = cycle === 1 ? y1 : 12 - y1;
    if (!yrs) continue;
    const md = { sign: s, years: yrs, start: t, end: t + yrs * YEAR, sub: [] };
    // antardashas: the 12 signs from the next sign in the same direction, equal parts
    for (let j = 1; j <= 12; j++) { const ss = (forward ? s + j : s - j + 120) % 12, len = yrs * YEAR / 12; md.sub.push({ sign: ss, start: t + (j - 1) * len, end: t + j * len }); }
    list.push(md); t = md.end;
    if (t > r.utMs + 110 * YEAR) break;
  }
  return { list, forward };
}

module.exports = { yogini, chara, YOGINI };
