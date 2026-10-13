/* South Indian Dasha (10) Porutham matching, counted from the bride's nakshatra/rasi to the groom's. */
const J = require('./engine.js');

const RAJJU = { // 0 pada (feet), 1 kati (waist), 2 nabhi (navel), 3 kanta (neck), 4 siro (head)
  0: 0, 8: 0, 9: 0, 17: 0, 18: 0, 26: 0,
  1: 1, 7: 1, 10: 1, 16: 1, 19: 1, 25: 1,
  2: 2, 6: 2, 11: 2, 15: 2, 20: 2, 24: 2,
  3: 3, 5: 3, 12: 3, 14: 3, 21: 3, 23: 3,
  4: 4, 13: 4, 22: 4
};
const VEDHA = [[0, 17], [1, 16], [2, 15], [3, 14], [5, 21], [6, 20], [7, 19], [8, 18], [9, 26], [10, 25], [11, 24], [12, 23], [4, 22], [4, 13], [13, 22]];
const VASYA = { 0: [4, 7], 1: [3, 6], 2: [5], 3: [7, 8], 4: [6], 5: [2, 11], 6: [5, 9], 7: [3], 8: [11], 9: [0, 10], 10: [0], 11: [9] };
const MAHENDRA = [4, 7, 10, 13, 16, 19, 22, 25];
const rel = (a, b) => a === b ? 'F' : (J.REL[a] && J.REL[a][b]) || 'N';

function porutham(boy, girl, yoniScore) {
  // boy/girl: { nak, moonSign, gana }
  const cnt = ((boy.nak - girl.nak + 27) % 27) + 1; // girl → boy, inclusive
  const rasiCnt = ((boy.moonSign - girl.moonSign + 12) % 12) + 1;
  const list = [];
  const add = (id, status, extra = {}) => list.push({ id, status, ...extra });
  const r9 = cnt % 9;
  add('dina', [2, 4, 6, 8, 0].includes(r9) ? 'good' : 'bad', { n: cnt });
  const gB = boy.gana, gG = girl.gana;
  add('gana', gB === gG ? 'good' : (gB !== 'Rakshasa' && gG !== 'Rakshasa') ? 'mid' : 'bad', { boy: gB, girl: gG });
  add('mahendra', MAHENDRA.includes(cnt) ? 'good' : 'bad', { n: cnt });
  add('streeDeergha', cnt > 13 ? 'good' : cnt > 9 ? 'mid' : 'bad', { n: cnt });
  add('yoni', yoniScore >= 3 ? 'good' : yoniScore === 2 ? 'mid' : 'bad', { s: yoniScore });
  add('rasi', rasiCnt === 1 ? (boy.nak !== girl.nak ? 'good' : 'mid') : [2, 12, 6, 8].includes(rasiCnt) ? 'bad' : 'good', { n: rasiCnt });
  const lb = J.SIGN_LORD[boy.moonSign], lg = J.SIGN_LORD[girl.moonSign], f1 = rel(lb, lg), f2 = rel(lg, lb);
  add('rasiAdhipati', f1 === 'F' && f2 === 'F' || lb === lg ? 'good' : f1 === 'E' || f2 === 'E' ? 'bad' : 'mid', { boy: lb, girl: lg });
  add('vasya', (VASYA[girl.moonSign] || []).includes(boy.moonSign) || (VASYA[boy.moonSign] || []).includes(girl.moonSign) ? 'good' : 'bad', {});
  add('rajju', RAJJU[boy.nak] === RAJJU[girl.nak] ? 'bad' : 'good', { boy: RAJJU[boy.nak], girl: RAJJU[girl.nak] });
  add('vedha', VEDHA.some(([a, b]) => (a === boy.nak && b === girl.nak) || (b === boy.nak && a === girl.nak)) ? 'bad' : 'good', {});
  const good = list.filter(x => x.status === 'good').length, mid = list.filter(x => x.status === 'mid').length;
  const mustPass = list.find(x => x.id === 'rajju').status === 'good' && list.find(x => x.id === 'vedha').status === 'good';
  const verdict = !mustPass ? 'low' : good >= 7 ? 'excellent' : good + mid * 0.5 >= 5 ? 'good' : 'average';
  return { list, good, mid, total: 10, mustPass, verdict };
}

module.exports = { porutham };
