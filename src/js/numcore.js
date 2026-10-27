/* Numerology maths, shared by the browser tool (bundled into numerology.js) and the static pages (lib/seo-pages3.js).
   Chaldean letter values and the Indian number–planet scheme, same as the baby-names tool. */
const NU = (() => {
  const CH = { a: 1, i: 1, j: 1, q: 1, y: 1, b: 2, k: 2, r: 2, c: 3, g: 3, l: 3, s: 3, d: 4, m: 4, t: 4, e: 5, h: 5, n: 5, x: 5, u: 6, v: 6, w: 6, o: 7, z: 7, f: 8, p: 8 };
  const PLANET = [null, 'Sun', 'Moon', 'Jupiter', 'Rahu', 'Mercury', 'Venus', 'Ketu', 'Saturn', 'Mars'];
  const DAY = [null, 0, 1, 4, 6, 3, 5, 1, 6, 2];          // lucky weekday (0 = Sunday)
  const GEM = [null, 'ruby', 'pearl', 'yellowSapphire', 'hessonite', 'emerald', 'diamond', 'catsEye', 'blueSapphire', 'coral'];
  const GEM_SLUG = [null, 'ruby', 'pearl', 'yellow-sapphire', 'hessonite', 'emerald', 'diamond', 'cats-eye', 'blue-sapphire', 'red-coral'];
  // Friendly / unfriendly numbers (common Indian practice; enemies kept symmetric)
  const FRIEND = { 1: [1, 2, 3, 5, 9], 2: [1, 2, 3, 5], 3: [1, 2, 3, 5, 9], 4: [1, 5, 6, 7], 5: [1, 4, 5, 6], 6: [4, 5, 6, 8], 7: [1, 4, 5, 6], 8: [5, 6, 8], 9: [1, 3, 5, 9] };
  const ENEMY = { 1: [6, 8], 2: [4, 8, 9], 3: [6], 4: [2, 9], 5: [], 6: [1, 3], 7: [], 8: [1, 2], 9: [2, 4] };
  const digits = s => String(s).replace(/\D/g, '');
  const sumDigits = s => digits(s).split('').reduce((a, b) => a + +b, 0);
  const reduce = n => { n = Math.abs(Math.round(n)); while (n > 9) n = sumDigits(n); return n; };
  const letterValue = ch => CH[ch.toLowerCase()] || 0;
  const nameTotal = name => [...String(name).toLowerCase()].reduce((a, ch) => a + (CH[ch] || 0), 0);
  const nameNumber = name => reduce(nameTotal(name));
  const mulank = day => reduce(day);
  const bhagyank = (d, m, y) => reduce(sumDigits(String(d) + String(m) + String(y)));
  const personalYear = (d, m, year) => reduce(sumDigits(String(d) + String(m)) + sumDigits(year));
  const rel = (a, b) => FRIEND[a].includes(b) ? 'F' : ENEMY[a].includes(b) ? 'E' : 'N';
  // Two numbers together: both directions count
  function level(a, b) {
    const r = [rel(a, b), rel(b, a)].sort().join('');      // EE EF EN FF FN NN
    return { FF: 'excellent', FN: 'good', NN: 'average', EF: 'mixed', EN: 'difficult', EE: 'difficult' }[r];
  }
  const LEVEL_ORDER = ['excellent', 'good', 'average', 'mixed', 'difficult'];
  // Lucky numbers for a person: friendly to both Mulank and Bhagyank, Mulank first
  const luckyFor = (mu, bh) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !ENEMY[mu].includes(n) && (!bh || !ENEMY[bh].includes(n)) && (FRIEND[mu].includes(n) || (bh && FRIEND[bh].includes(n))));
  const avoidFor = (mu, bh) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => ENEMY[mu].includes(n) || (bh && ENEMY[bh].includes(n)));
  const luckyDates = nums => Array.from({ length: 31 }, (_, i) => i + 1).filter(d => nums.includes(reduce(d)));
  // How well a number (name, mobile, vehicle, house) suits a person
  function fit(n, mu, bh) {
    const a = rel(mu, n), b = bh ? rel(bh, n) : a;
    if (a === 'E' || b === 'E') return 'avoid';
    if (a === 'F' && b === 'F') return 'best';
    if (a === 'F' || b === 'F') return 'good';
    return 'neutral';
  }
  // Spelling variants of a name that reach a friendly number (doubling a letter or adding one at the end)
  function variants(name, targets, max = 8) {
    const clean = String(name).trim();
    if (!clean || !/[a-z]/i.test(clean)) return [];
    const seen = new Set([clean.toLowerCase()]), out = [];
    const add = v => { const k = v.toLowerCase(); if (seen.has(k)) return; seen.add(k); const n = nameNumber(v); if (targets.includes(n)) out.push({ name: v, number: n, total: nameTotal(v) }); };
    const words = clean.split(/\s+/);
    words.forEach((w, k) => {
      const put = x => add(words.map((y, j) => j === k ? x : y).join(' '));
      for (let i = 1; i < w.length; i++) if (/[a-z]/i.test(w[i]) && w[i].toLowerCase() !== w[i - 1].toLowerCase()) put(w.slice(0, i + 1) + w[i].toLowerCase() + w.slice(i + 1)); // double a letter
      if (/[^aeiou]$/i.test(w)) put(w + 'a');                                   // Dhruv → Dhruva
      if (k === 0 && w.length > 3 && /[^aeiou]a$/i.test(w)) put(w.slice(0, -1)); // Rama → Ram (first name only)
    });
    return out.sort((a, b) => a.name.length - b.name.length).slice(0, max);
  }
  // Mobile / vehicle number: all digits added
  const phoneNumber = s => { const d = digits(s); return d ? { digits: d, total: sumDigits(d), number: reduce(sumDigits(d)) } : null; };
  // Vehicle plates mix letters and digits: numerologists add the digits only
  const vehicleNumber = s => phoneNumber(s);
  return { CH, PLANET, DAY, GEM, GEM_SLUG, FRIEND, ENEMY, LEVEL_ORDER, reduce, sumDigits, letterValue, nameTotal, nameNumber, mulank, bhagyank, personalYear, rel, level, luckyFor, avoidFor, luckyDates, fit, variants, phoneNumber, vehicleNumber };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = NU;
