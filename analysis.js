/* Kundali Ganit — rule-based reading of a computed chart.
   Every verdict here comes from a stated classical rule applied to the numbers from engine.js. */
(function (root) {
  const J = root.Jyotish || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const SKT = { Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangal', Mercury: 'Budh', Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu' };
  const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const MALEFIC = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
  const KENDRA = [1, 4, 7, 10], TRIKONA = [1, 5, 9], DUS = [6, 8, 12];
  const KARAKA = {
    Sun: 'soul, father, authority and vitality', Moon: 'mind, mother, emotions and peace', Mars: 'energy, courage, siblings and property',
    Mercury: 'intellect, speech, business and learning', Jupiter: 'wisdom, children, wealth and good fortune', Venus: 'love, marriage, arts and comforts',
    Saturn: 'discipline, career, endurance and longevity', Rahu: 'ambition, foreign links, technology and desire', Ketu: 'detachment, intuition, spirituality and past karma'
  };
  const HOUSE = ['self, body and personality', 'wealth, family and speech', 'courage, siblings and effort', 'home, mother and happiness', 'children, intelligence and creativity', 'enemies, debts, health and service', 'marriage and partnership', 'longevity, secrets and sudden events', 'luck, dharma, father and higher learning', 'career, status and karma', 'gains, income and friends', 'expenses, foreign lands and moksha'];
  const HOUSE_NAME = ['Tanu', 'Dhana', 'Sahaja', 'Sukha', 'Putra', 'Ripu', 'Kalatra', 'Ayu', 'Dharma', 'Karma', 'Labha', 'Vyaya'];
  const LAGNA_TRAITS = ['Energetic, pioneering and quick to act', 'Steady, patient and fond of comfort and beauty', 'Curious, communicative and adaptable', 'Caring, protective and emotionally deep', 'Confident, generous and a natural leader', 'Analytical, practical and detail-minded', 'Balanced, diplomatic and relationship-oriented', 'Intense, determined and private', 'Optimistic, philosophical and freedom-loving', 'Disciplined, ambitious and responsible', 'Independent, humanitarian and inventive', 'Compassionate, imaginative and spiritual'];
  const GOCHAR_GOOD = { Sun: [3, 6, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [3, 6, 11], Mercury: [2, 4, 6, 8, 10, 11], Jupiter: [2, 5, 7, 9, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], Saturn: [3, 6, 11], Rahu: [3, 6, 11], Ketu: [3, 6, 11] };
  const ord = n => n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[(Math.floor(n / 10) % 10 === 1) ? 0 : n % 10] || 'th');

  function analyze(r) {
    const P = r.P, L = r.lagna.sign, M = P.Moon.sign;
    const hFrom = (sign, ref) => ((sign - ref + 12) % 12) + 1;
    const lordOf = h => J.SIGN_LORD[(L + h - 1) % 12];
    const items = [];
    const add = (tone, icon, title, text, kind) => items.push({ tone, icon, title, text, kind: kind || 'placement' });

    // Neecha Bhanga: dispositor, or the planet exalted in that sign, in a kendra from Lagna or Moon
    const neechaBhanga = p => {
      const s = P[p].sign, disp = J.SIGN_LORD[s];
      const exaltIn = Object.keys(EXALT).find(k => EXALT[k] === s);
      return [disp, exaltIn].filter(Boolean).some(q => KENDRA.includes(P[q].house) || KENDRA.includes(hFrom(P[q].sign, M)));
    };

    // ---- Strength (indicative) ----
    const strength = {};
    for (const p of r.planets) {
      let s = 50;
      s += { Exalted: 30, 'Own sign': 22, Friendly: 10, Neutral: 0, Enemy: -10, Debilitated: -30 }[p.dignity] || 0;
      const h = p.house, mal = MALEFIC.includes(p.name);
      if (KENDRA.includes(h)) s += 8;
      if (h === 5 || h === 9) s += 10;
      if (h === 11) s += 6;
      if (h === 2) s += 2;
      if (mal && (h === 3 || h === 6 || h === 11)) s += 8;
      else if (DUS.includes(h)) s -= 10;
      if (p.combust) s -= 15;
      if (p.retro && p.name !== 'Rahu' && p.name !== 'Ketu') s += 5;
      if (p.dignity === 'Debilitated' && neechaBhanga(p.name)) s += 18;
      if (r.bav[p.name]) s += (r.bav[p.name][p.sign] - 4) * 3;
      strength[p.name] = Math.max(5, Math.min(98, Math.round(s)));
    }

    // ---- Per-graha reading ----
    const reading = {};
    for (const p of r.planets) {
      const nb = p.dignity === 'Debilitated' && neechaBhanga(p.name);
      const dig = {
        Exalted: 'It is exalted here, at its strongest, so its results come through fully.',
        'Own sign': 'It sits in its own sign, comfortable and dependable.',
        Friendly: 'It is in a friendly sign and well supported.',
        Neutral: 'It is in a neutral sign.',
        Enemy: 'It is in an enemy sign, so its results need extra effort.',
        Debilitated: nb ? 'It is debilitated, but the debilitation is cancelled (Neecha Bhanga), which can turn early struggle into later success.' : 'It is debilitated, at its weakest, so its results can come with struggle.'
      }[p.dignity] || '';
      let houseNote = '';
      if (KENDRA.includes(p.house)) houseNote = 'A kendra (angular) house gives it visible influence.';
      else if (p.house === 5 || p.house === 9) houseNote = 'A trikona (trine) house is one of the most fortunate placements.';
      else if (DUS.includes(p.house)) houseNote = MALEFIC.includes(p.name) && p.house === 6 ? 'A malefic in the 6th helps defeat obstacles and rivals.' : 'This is a dusthana (6, 8, 12), a house of difficulty.';
      else if (p.house === 11) houseNote = 'The 11th house of gains supports every graha.';
      else if (p.house === 3 && MALEFIC.includes(p.name)) houseNote = 'A malefic in the 3rd gives courage and drive.';
      const extra = [p.combust ? 'It is combust (too close to the Sun), which weakens it.' : '', p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' ? 'It is retrograde, which adds intensity and turns its energy inward.' : ''].filter(Boolean).join(' ');
      reading[p.name] = `${SKT[p.name]}, karaka of ${KARAKA[p.name]}, is in ${J.RASHI[p.sign]} in the ${ord(p.house)} house of ${HOUSE[p.house - 1]}. ${dig} ${houseNote} ${extra}`.replace(/\s+/g, ' ').trim();
      const tone = strength[p.name] >= 62 ? 'good' : strength[p.name] <= 40 ? 'bad' : 'mixed';
      reading[p.name + '_tone'] = tone;
    }

    // ---- Dignity highlights ----
    for (const p of r.planets) {
      if (p.dignity === 'Exalted') add('good', p.name, `${SKT[p.name]} exalted in ${J.RASHI[p.sign]}`, `The karaka of ${KARAKA[p.name].split(',')[0]} is at its peak strength in the ${ord(p.house)} house.`);
      else if (p.dignity === 'Own sign') add('good', p.name, `${SKT[p.name]} in its own sign`, `${J.RASHI[p.sign]} is home ground for ${SKT[p.name]}, placed in the ${ord(p.house)} house of ${HOUSE[p.house - 1].split(',')[0]}.`);
      else if (p.dignity === 'Debilitated') {
        if (neechaBhanga(p.name)) add('good', p.name, `Neecha Bhanga for ${SKT[p.name]}`, `${SKT[p.name]} is debilitated in ${J.RASHI[p.sign]}, but the cancellation rule is met, so the weakness can turn into strength.`, 'yoga');
        else add('bad', p.name, `${SKT[p.name]} debilitated in ${J.RASHI[p.sign]}`, `${SKT[p.name]} is at its weakest; matters of ${KARAKA[p.name].split(',').slice(0, 2).join(' and')} may need extra care.`);
      }
      if (p.combust) add('bad', p.name, `${SKT[p.name]} combust`, `Within combustion range of the Sun, ${SKT[p.name]} loses some of its independent strength.`);
    }

    // ---- Lagna lord ----
    const ll = lordOf(1), llH = P[ll].house;
    if (KENDRA.includes(llH) || TRIKONA.includes(llH)) add('good', ll, 'Strong Lagna lord', `Lagna lord ${SKT[ll]} is in the ${ord(llH)} house, a kendra or trikona, which supports health and self-confidence.`);
    else if (DUS.includes(llH)) add('bad', ll, 'Lagna lord in a dusthana', `Lagna lord ${SKT[ll]} is in the ${ord(llH)} house, which can bring more effort and obstacles in life.`);

    // ---- Yogas ----
    const yogas = [];
    const yoga = (name, present, tone, rule, text) => yogas.push({ name, present, tone, rule, text });
    const jupFromMoon = hFrom(P.Jupiter.sign, M);
    yoga('Gajakesari Yoga', KENDRA.includes(jupFromMoon), 'good', 'Guru in a kendra (1, 4, 7, 10) from the Moon', `Guru is ${ord(jupFromMoon)} from the Moon. Gives wisdom, reputation and lasting prosperity.`);
    yoga('Budhaditya Yoga', P.Sun.sign === P.Mercury.sign, 'good', 'Surya and Budh in the same sign', 'Sharp intellect, good communication and recognition for skill.');
    yoga('Chandra-Mangal Yoga', P.Moon.sign === P.Mars.sign, 'good', 'Chandra and Mangal in the same sign', 'Drive for earning and a talent for business and wealth.');
    const MP = { Mars: 'Ruchaka', Mercury: 'Bhadra', Jupiter: 'Hamsa', Venus: 'Malavya', Saturn: 'Sasa' };
    for (const [g, n] of Object.entries(MP)) {
      const ok = KENDRA.includes(P[g].house) && (P[g].dignity === 'Exalted' || P[g].dignity === 'Own sign');
      yoga(`${n} Yoga`, ok, 'good', `${SKT[g]} in own or exalted sign in a kendra from Lagna`, `One of the five Pancha Mahapurusha yogas; gives the best qualities of ${SKT[g]}.`);
    }
    // Raj yoga: kendra lord with trikona lord
    const kl = [...new Set([1, 4, 7, 10].map(lordOf))], tl = [...new Set([1, 5, 9].map(lordOf))];
    const raj = [];
    kl.forEach(a => tl.forEach(b => { if (a !== b && P[a].sign === P[b].sign) { const k = [a, b].sort().join('+'); if (!raj.includes(k)) raj.push(k); } }));
    yoga('Raj Yoga', raj.length > 0, 'good', 'A kendra lord and a trikona lord together in one sign', raj.length ? `Formed by ${raj.map(k => k.split('+').map(x => SKT[x]).join(' with ')).join('; ')}. Brings rise in status and authority.` : 'Kendra and trikona lords are not conjunct.');
    const yk = [...new Set([4, 7, 10].map(lordOf))].filter(p => [5, 9].map(lordOf).includes(p));
    yoga('Yogakaraka', yk.length > 0, 'good', 'One graha rules both a kendra and a trikona', yk.length ? `${yk.map(x => SKT[x]).join(', ')} rules both a kendra and a trikona for this Lagna and acts as the chart's chief benefic.` : 'No single graha rules both a kendra and a trikona for this Lagna.');
    const vip = [6, 8, 12].filter(h => DUS.includes(P[lordOf(h)].house)).map(h => `${ord(h)} lord ${SKT[lordOf(h)]}`);
    yoga('Vipreet Raj Yoga', vip.length > 0, 'good', 'Lord of 6, 8 or 12 placed in 6, 8 or 12', vip.length ? `${vip.join(', ')} sits in a dusthana. Success comes out of difficult situations.` : 'No dusthana lord is placed in a dusthana.');
    const benef = ['Mercury', 'Jupiter', 'Venus'].filter(p => [6, 7, 8].includes(hFrom(P[p].sign, M)));
    yoga('Adhi Yoga', benef.length >= 2, 'good', 'Two or more natural benefics in the 6th, 7th or 8th from the Moon', 'Leadership, a comfortable life and victory over rivals.');
    const around = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const s2 = around.some(p => hFrom(P[p].sign, M) === 2), s12 = around.some(p => hFrom(P[p].sign, M) === 12);
    const kendraMoon = around.some(p => KENDRA.includes(hFrom(P[p].sign, M)) && hFrom(P[p].sign, M) !== 1);
    if (s2 && s12) yoga('Durudhara Yoga', true, 'good', 'Grahas on both sides of the Moon (2nd and 12th)', 'Wealth, comforts and a generous nature.');
    else if (s2) yoga('Sunapha Yoga', true, 'good', 'A graha in the 2nd from the Moon', 'Self-earned wealth and a good reputation.');
    else if (s12) yoga('Anapha Yoga', true, 'good', 'A graha in the 12th from the Moon', 'Good health, charm and a contented life.');
    yoga('Kemadruma Yoga', !s2 && !s12 && !kendraMoon, 'bad', 'No graha in the 2nd or 12th from the Moon, and none in a kendra from it', 'The Moon stands alone, which can bring loneliness or money worries.');
    const eclipse = ['Sun', 'Moon'].filter(p => P[p].sign === P.Rahu.sign || P[p].sign === P.Ketu.sign);
    yoga('Grahan Dosha', eclipse.length > 0, 'bad', 'Surya or Chandra in the same sign as Rahu or Ketu', eclipse.length ? `${eclipse.map(p => SKT[p]).join(' and ')} is joined by a node, which can cloud confidence or peace of mind.` : 'Neither luminary is joined by Rahu or Ketu.');
    const gc = P.Jupiter.sign === P.Rahu.sign ? 'Rahu' : P.Jupiter.sign === P.Ketu.sign ? 'Ketu' : null;
    yoga('Guru Chandal Dosha', !!gc, 'bad', 'Guru in the same sign as Rahu or Ketu', gc ? `Guru is with ${gc}; judgement and advice from teachers may be clouded.` : 'Guru is free of the nodes.');
    const mFromJ = hFrom(M, P.Jupiter.sign);
    yoga('Shakata Yoga', [6, 8, 12].includes(mFromJ) && !KENDRA.includes(P.Moon.house), 'bad', 'Moon in the 6th, 8th or 12th from Guru, Moon not in a kendra', 'Ups and downs in fortune, like the turning wheel of a cart.');

    // Doshas
    const mg = r.manglik, mgFrom = [mg.lagna && 'Lagna', mg.moon && 'Moon', mg.venus && 'Venus'].filter(Boolean);
    yoga('Mangal Dosha', mgFrom.length > 0, 'bad', 'Mangal in the 1st, 2nd, 4th, 7th, 8th or 12th', mgFrom.length ? `Present when counted from ${mgFrom.join(', ')}. Mangal is ${ord(mg.houseL)} from Lagna, ${ord(mg.houseM)} from the Moon and ${ord(mg.houseV)} from Venus.` : `Mangal is ${ord(mg.houseL)} from Lagna, ${ord(mg.houseM)} from the Moon and ${ord(mg.houseV)} from Venus.`);
    yoga('Kaal Sarp Dosha', !!r.kaalSarp, 'bad', 'All seven grahas on one side of the Rahu–Ketu axis', r.kaalSarp ? r.kaalSarp + '.' : 'The grahas are spread on both sides of the nodal axis.');
    const gm = [0, 8, 9, 17, 18, 26].includes(P.Moon.nak);
    yoga('Gand Mool', gm, 'bad', 'Moon in Ashwini, Ashlesha, Magha, Jyeshtha, Mula or Revati', `Moon is in ${J.NAK[P.Moon.nak]}. ${gm ? 'Traditionally a shanti puja is advised.' : ''}`.trim());

    for (const y of yogas) if (y.present) add(y.tone, null, y.name, y.text, 'yoga');

    // Ashtakavarga highlights
    const savSorted = r.sav.map((v, s) => ({ v, s, h: hFrom(s, L) })).sort((a, b) => b.v - a.v);
    const top = savSorted[0], low = savSorted[11];
    if (top.v >= 30) add('good', null, `Strong ${ord(top.h)} house`, `${top.v} Ashtakavarga bindus in ${J.RASHI[top.s]} support ${HOUSE[top.h - 1]}.`, 'ashtaka');
    if (low.v <= 22) add('bad', null, `Weak ${ord(low.h)} house`, `Only ${low.v} bindus in ${J.RASHI[low.s]}; ${HOUSE[low.h - 1]} need more effort.`, 'ashtaka');

    const good = items.filter(i => i.tone === 'good'), bad = items.filter(i => i.tone === 'bad');
    return { strength, reading, yogas, good, bad, HOUSE, HOUSE_NAME, LAGNA_TRAITS, KARAKA, GOCHAR_GOOD, ord, SKT };
  }

  const api = { analyze };
  if (typeof module !== 'undefined') module.exports = api; else root.KundaliAnalysis = api;
})(typeof window !== 'undefined' ? window : globalThis);
