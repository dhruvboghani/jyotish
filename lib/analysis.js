/* Grahavani — rule-based reading of a computed chart.
   Output is language-neutral: every message is [translationKey, params].
   Param values: number/string as-is, {g:'Sun'} graha name, {r:3} rashi, {nk:5} nakshatra,
   {list:[...]} a joined list, {k:'key', p:{...}} a nested message. */
const J = require('./engine.js');

const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
const MALEFIC = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'];
const KENDRA = [1, 4, 7, 10], TRIKONA = [1, 5, 9], DUS = [6, 8, 12];
const GOCHAR_GOOD = { Sun: [3, 6, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [3, 6, 11], Mercury: [2, 4, 6, 8, 10, 11], Jupiter: [2, 5, 7, 9, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], Saturn: [3, 6, 11], Rahu: [3, 6, 11], Ketu: [3, 6, 11] };
const G = g => ({ g }), R = r => ({ r });
const NODES = ['Rahu', 'Ketu'];

function analyze(r) {
  const P = r.P, L = r.lagna.sign, M = P.Moon.sign;
  const hFrom = (sign, ref) => ((sign - ref + 12) % 12) + 1;
  const lordOf = h => J.SIGN_LORD[(L + h - 1) % 12];
  const items = [];
  const add = (tone, icon, kind, title, text) => items.push({ tone, icon, kind, title, text });

  const neechaBhanga = p => {
    const s = P[p].sign, disp = J.SIGN_LORD[s];
    const exaltIn = Object.keys(EXALT).find(k => EXALT[k] === s);
    return [disp, exaltIn].filter(Boolean).some(q => KENDRA.includes(P[q].house) || KENDRA.includes(hFrom(P[q].sign, M)));
  };

  // Indicative strength
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
    if (p.retro && !NODES.includes(p.name)) s += 5;
    if (p.dignity === 'Debilitated' && neechaBhanga(p.name)) s += 18;
    if (r.bav[p.name]) s += (r.bav[p.name][p.sign] - 4) * 3;
    strength[p.name] = Math.max(5, Math.min(98, Math.round(s)));
  }

  // Per-graha reading as message parts
  const DIG = { Exalted: 'exalted', 'Own sign': 'own', Friendly: 'friendly', Neutral: 'neutral', Enemy: 'enemy', Debilitated: 'debil' };
  const reading = {};
  for (const p of r.planets) {
    const parts = [['read.intro', { g: G(p.name), r: R(p.sign), h: p.house, m: { k: 'names.house.' + (p.house - 1) }, kk: { k: 'names.karaka.' + p.name } }]];
    if (p.dignity) {
      const nb = p.dignity === 'Debilitated' && neechaBhanga(p.name);
      parts.push(['read.dig.' + (nb ? 'debilNB' : DIG[p.dignity]), {}]);
    }
    const mal = MALEFIC.includes(p.name);
    if (KENDRA.includes(p.house)) parts.push(['read.house.kendra', {}]);
    else if (p.house === 5 || p.house === 9) parts.push(['read.house.trikona', {}]);
    else if (mal && p.house === 6) parts.push(['read.house.mal6', {}]);
    else if (DUS.includes(p.house)) parts.push(['read.house.dus', {}]);
    else if (p.house === 11) parts.push(['read.house.h11', {}]);
    else if (p.house === 3 && mal) parts.push(['read.house.mal3', {}]);
    if (p.combust) parts.push(['read.combust', {}]);
    if (p.retro && !NODES.includes(p.name)) parts.push(['read.retro', {}]);
    const st = strength[p.name];
    reading[p.name] = { tone: st >= 62 ? 'good' : st <= 40 ? 'bad' : 'mixed', parts };
  }

  // Dignity highlights
  for (const p of r.planets) {
    const k = { kk: { k: 'names.karaka.' + p.name } };
    if (p.dignity === 'Exalted') add('good', p.name, 'placement', ['hl.exalted.t', { g: G(p.name), r: R(p.sign) }], ['hl.exalted.x', { g: G(p.name), h: p.house, ...k }]);
    else if (p.dignity === 'Own sign') add('good', p.name, 'placement', ['hl.own.t', { g: G(p.name) }], ['hl.own.x', { g: G(p.name), r: R(p.sign), h: p.house, m: { k: 'names.house.' + (p.house - 1) } }]);
    else if (p.dignity === 'Debilitated') {
      if (neechaBhanga(p.name)) add('good', p.name, 'yoga', ['hl.nb.t', { g: G(p.name) }], ['hl.nb.x', { g: G(p.name), r: R(p.sign) }]);
      else add('bad', p.name, 'placement', ['hl.debil.t', { g: G(p.name), r: R(p.sign) }], ['hl.debil.x', { g: G(p.name), ...k }]);
    }
    if (p.combust) add('bad', p.name, 'placement', ['hl.combust.t', { g: G(p.name) }], ['hl.combust.x', { g: G(p.name) }]);
  }

  const ll = lordOf(1), llH = P[ll].house;
  if (KENDRA.includes(llH) || TRIKONA.includes(llH)) add('good', ll, 'placement', ['hl.llGood.t', {}], ['hl.llGood.x', { g: G(ll), h: llH }]);
  else if (DUS.includes(llH)) add('bad', ll, 'placement', ['hl.llBad.t', {}], ['hl.llBad.x', { g: G(ll), h: llH }]);

  // Yogas
  const yogas = [];
  const yoga = (id, present, tone, params, nameParams) => yogas.push({ id, present, tone, params: params || {}, nameParams: nameParams || {} });
  const jupFromMoon = hFrom(P.Jupiter.sign, M);
  yoga('gajakesari', KENDRA.includes(jupFromMoon), 'good', { h: jupFromMoon });
  yoga('budhaditya', P.Sun.sign === P.Mercury.sign, 'good');
  yoga('chandramangal', P.Moon.sign === P.Mars.sign, 'good');
  const MP = { Mars: 'ruchaka', Mercury: 'bhadra', Jupiter: 'hamsa', Venus: 'malavya', Saturn: 'sasa' };
  for (const [g, id] of Object.entries(MP)) {
    const ok = KENDRA.includes(P[g].house) && (P[g].dignity === 'Exalted' || P[g].dignity === 'Own sign');
    yoga(id, ok, 'good', { g: G(g) });
  }
  const kl = [...new Set([1, 4, 7, 10].map(lordOf))], tl = [...new Set([1, 5, 9].map(lordOf))];
  const raj = [];
  kl.forEach(a => tl.forEach(b => { if (a !== b && P[a].sign === P[b].sign) { const k = [a, b].sort().join('+'); if (!raj.includes(k)) raj.push(k); } }));
  yoga('raj', raj.length > 0, 'good', { list: { list: raj.map(k => { const [a, b] = k.split('+'); return { k: 'fmt.with', p: { a: G(a), b: G(b) } }; }) } });
  const yk = [...new Set([4, 7, 10].map(lordOf))].filter(p => [5, 9].map(lordOf).includes(p));
  yoga('yogakaraka', yk.length > 0, 'good', { list: { list: yk.map(G) } });
  const vip = [6, 8, 12].filter(h => DUS.includes(P[lordOf(h)].house)).map(h => ({ k: 'fmt.houseLord', p: { h, g: G(lordOf(h)) } }));
  yoga('vipreet', vip.length > 0, 'good', { list: { list: vip } });
  const benef = ['Mercury', 'Jupiter', 'Venus'].filter(p => [6, 7, 8].includes(hFrom(P[p].sign, M)));
  yoga('adhi', benef.length >= 2, 'good');
  const around = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const s2 = around.some(p => hFrom(P[p].sign, M) === 2), s12 = around.some(p => hFrom(P[p].sign, M) === 12);
  const kendraMoon = around.some(p => [4, 7, 10].includes(hFrom(P[p].sign, M)));
  if (s2 && s12) yoga('durudhara', true, 'good');
  else if (s2) yoga('sunapha', true, 'good');
  else if (s12) yoga('anapha', true, 'good');
  yoga('kemadruma', !s2 && !s12 && !kendraMoon, 'bad');
  const eclipse = ['Sun', 'Moon'].filter(p => P[p].sign === P.Rahu.sign || P[p].sign === P.Ketu.sign);
  yoga('grahan', eclipse.length > 0, 'bad', { list: { list: eclipse.map(G) } });
  const gc = P.Jupiter.sign === P.Rahu.sign ? 'Rahu' : P.Jupiter.sign === P.Ketu.sign ? 'Ketu' : null;
  yoga('guruchandal', !!gc, 'bad', gc ? { g: G(gc) } : {});
  const mFromJ = hFrom(M, P.Jupiter.sign);
  yoga('shakata', [6, 8, 12].includes(mFromJ) && !KENDRA.includes(P.Moon.house), 'bad');
  const mg = r.manglik, mgFrom = [mg.lagna && 'Lagna', mg.moon && 'Moon', mg.venus && 'Venus'].filter(Boolean);
  yoga('mangal', mgFrom.length > 0, 'bad', { list: { list: mgFrom.map(x => ({ k: 'names.ref.' + x })) }, a: mg.houseL, b: mg.houseM, c: mg.houseV });
  yoga('kaalsarp', !!r.kaalSarp, 'bad', { v: r.kaalSarp ? { k: 'yoga.kaalsarp.' + r.kaalSarp } : '' });
  const gm = [0, 8, 9, 17, 18, 26].includes(P.Moon.nak);
  yoga('gandmool', gm, 'bad', { nk: { nk: P.Moon.nak } });

  for (const y of yogas) if (y.present) add(y.tone, null, 'yoga', ['yoga.' + y.id + '.name', y.nameParams], ['yoga.' + y.id + '.text', y.params]);

  // Ashtakavarga highlights
  const sorted = r.sav.map((v, s) => ({ v, s, h: hFrom(s, L) })).sort((a, b) => b.v - a.v);
  const top = sorted[0], low = sorted[11];
  if (top.v >= 30) add('good', null, 'ashtaka', ['hl.strongH.t', { h: top.h }], ['hl.strongH.x', { n: top.v, r: R(top.s), m: { k: 'names.house.' + (top.h - 1) } }]);
  if (low.v <= 22) add('bad', null, 'ashtaka', ['hl.weakH.t', { h: low.h }], ['hl.weakH.x', { n: low.v, r: R(low.s), m: { k: 'names.house.' + (low.h - 1) } }]);

  return { strength, reading, yogas, good: items.filter(i => i.tone === 'good'), bad: items.filter(i => i.tone === 'bad') };
}

module.exports = { analyze, GOCHAR_GOOD };
