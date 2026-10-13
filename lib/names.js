/* Baby names by nakshatra syllable + Chaldean numerology (name number, Moolank, Bhagyank). */
const NAMES = require('./names-data.js');
const SYLL = [["Chu","Che","Cho","La"],["Li","Lu","Le","Lo"],["A","I","U","E"],["O","Va","Vi","Vu"],["Ve","Vo","Ka","Ki"],["Ku","Gha","Na","Chha"],["Ke","Ko","Ha","Hi"],["Hu","He","Ho","Da"],["Di","Du","De","Do"],["Ma","Mi","Mu","Me"],["Mo","Ta","Ti","Tu"],["Te","To","Pa","Pi"],["Pu","Sha","Na","Tha"],["Pe","Po","Ra","Ri"],["Ru","Re","Ro","Ta"],["Ti","Tu","Te","To"],["Na","Ni","Nu","Ne"],["No","Ya","Yi","Yu"],["Ye","Yo","Bha","Bhi"],["Bhu","Dha","Pha","Dha"],["Bhe","Bho","Ja","Ji"],["Khi","Khu","Khe","Kho"],["Ga","Gi","Gu","Ge"],["Go","Sa","Si","Su"],["Se","So","Da","Di"],["Du","Tha","Jha","Na"],["De","Do","Cha","Chi"]];
const VOWEL = { a: ['a'], i: ['i', 'ee', 'y'], u: ['u', 'oo'], e: ['e', 'ai', 'ay'], o: ['o', 'au'] };
const ALT = { pha: ['pha', 'fa'], sha: ['sha', 'sh'], vu: ['vu', 'vru'], ki: ['ki', 'kee', 'kri'], bhi: ['bhi', 'bhee'] };

function matches(name, syl) {
  const n = name.toLowerCase(), s = syl.toLowerCase();
  if (ALT[s] && ALT[s].some(p => n.startsWith(p))) return true;
  const m = s.match(/^([^aeiou]*)([aeiou])$/);
  if (!m) return false;
  const [, c, v] = m;
  if (!n.startsWith(c)) return false;
  // "Ka" must not take "Kha", "Ta" not "Tha" and so on; "Cha" not "Chha"
  const rest = n.slice(c.length);
  if (c && !c.endsWith('h') && rest[0] === 'h') return false;
  if (c === 'ch' && rest.startsWith('h')) return false;
  return VOWEL[v].some(p => rest.startsWith(p)) && !(v === 'a' && rest.startsWith('ai') && false);
}

// Chaldean values
const CH = { a: 1, i: 1, j: 1, q: 1, y: 1, b: 2, k: 2, r: 2, c: 3, g: 3, l: 3, s: 3, d: 4, m: 4, t: 4, e: 5, h: 5, n: 5, x: 5, u: 6, v: 6, w: 6, o: 7, z: 7, f: 8, p: 8 };
const reduce = n => { while (n > 9) n = String(n).split('').reduce((a, b) => a + +b, 0); return n; };
const nameNumber = name => reduce([...name.toLowerCase()].reduce((a, ch) => a + (CH[ch] || 0), 0));
const NUM_PLANET = { 1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury', 6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars' };
// Friendly numbers (common Chaldean practice)
const FRIEND = { 1: [1, 2, 3, 5, 9], 2: [1, 2, 3, 5], 3: [1, 2, 3, 5, 9], 4: [1, 5, 6, 7], 5: [1, 4, 5, 6], 6: [4, 5, 6, 8], 7: [1, 4, 5, 6], 8: [5, 6, 8], 9: [1, 3, 5, 9] };

function forNakshatra({ nak, pada, gender, day, month, year, letters }) {
  const syls = letters && letters.length ? letters : (pada ? [SYLL[nak][pada - 1]] : SYLL[nak]);
  const moolank = day ? reduce(day) : null;
  const bhagyank = day && month && year ? reduce(String(day) + String(month) + String(year)).valueOf() : null;
  const seen = new Set(), out = [];
  for (const n of NAMES) {
    if (seen.has(n.name)) continue;
    if (gender && gender !== 'any' && n.gender !== gender && n.gender !== 'u') continue;
    const syl = syls.find(s => matches(n.name, s));
    if (!syl) continue;
    seen.add(n.name);
    const num = nameNumber(n.name);
    const lucky = (moolank ? FRIEND[moolank].includes(num) : false) + (bhagyank ? FRIEND[bhagyank].includes(num) : false);
    out.push({ ...n, syllable: syl, number: num, planet: NUM_PLANET[num], lucky });
  }
  out.sort((a, b) => b.lucky - a.lucky || a.name.localeCompare(b.name));
  return { syllables: syls, moolank, bhagyank, moolankPlanet: moolank && NUM_PLANET[moolank], bhagyankPlanet: bhagyank && NUM_PLANET[bhagyank], names: out };
}

function numerology(name, day, month, year) {
  const num = nameNumber(name), moolank = reduce(day), bhagyank = reduce(String(day) + String(month) + String(year));
  return { name, number: num, planet: NUM_PLANET[num], moolank, bhagyank, friendlyMoolank: FRIEND[moolank].includes(num), friendlyBhagyank: FRIEND[bhagyank].includes(num), friends: FRIEND[moolank] };
}

module.exports = { forNakshatra, numerology, nameNumber, SYLL, matches };
