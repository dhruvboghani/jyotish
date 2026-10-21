/* Members' reports built on a computed chart:
   - personalDay: today's transits read against this chart (Moon, Lagna, Ashtakavarga, Tara and Chandra bala, dasha)
   - lifeAreas:   career, marriage, finance, health, education, children — rule-based factors and timing
   - remedies:    gemstone / mantra / fasting / donation per weak graha or dosha, with the reason for each
   All text is language-neutral: [translationKey, params] messages, rendered by the client. */
const J = require('./engine.js');
const V = require('./varga.js');

const DAY = 86400000;
const toJd = ms => ms / DAY + 2440587.5;
const GOCHAR_GOOD = { Sun: [3, 6, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [3, 6, 11], Mercury: [2, 4, 6, 8, 10, 11], Jupiter: [2, 5, 7, 9, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], Saturn: [3, 6, 11], Rahu: [3, 6, 11], Ketu: [3, 6, 11] };
const WEIGHT = { Moon: 3, Jupiter: 2.5, Saturn: 2.5, Rahu: 1, Ketu: 0.5, Sun: 1, Mars: 1, Mercury: 1, Venus: 1 };
const BENEFIC = { Moon: 1, Mercury: 1, Jupiter: 1, Venus: 1 };
const KENDRA = [1, 4, 7, 10], TRIKONA = [1, 5, 9], DUS = [6, 8, 12], UPACHAYA = [3, 6, 10, 11];
const TARA_GOOD = [2, 4, 6, 8, 9], TARA_BAD = [3, 5, 7];
const G = g => ({ g }), R = r => ({ r });
const hFrom = (sign, ref) => ((sign - ref + 12) % 12) + 1;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const stars = v => clamp(Math.round(1 + v * 4), 1, 5);

function transitAt(ms) {
  const jd = toJd(ms), tr = J.transit(jd).lon, prev = J.transit(jd - 0.5).lon, next = J.transit(jd + 0.5).lon;
  const out = {};
  for (const p of J.PLANETS) out[p] = { lon: tr[p], sign: Math.floor(tr[p] / 30), retro: !['Sun', 'Moon', 'Rahu', 'Ketu'].includes(p) && (J.norm(next[p] - prev[p] + 180) - 180) < 0 };
  return out;
}

function dayScore(r, tr) {
  const M = r.P.Moon.sign, L = r.lagna.sign;
  let num = 0, den = 0;
  const items = J.PLANETS.map(p => {
    const hm = hFrom(tr[p].sign, M), hl = hFrom(tr[p].sign, L);
    const bav = r.bav[p] ? r.bav[p][tr[p].sign] : null;
    let v = GOCHAR_GOOD[p].includes(hm) ? 1 : 0;
    if (bav != null) v = v * 0.65 + clamp((bav - 1) / 6, 0, 1) * 0.35; // a sign with many bindus softens a bad transit
    num += v * WEIGHT[p]; den += WEIGHT[p];
    return { planet: p, sign: tr[p].sign, fromMoon: hm, fromLagna: hl, bav, good: v >= 0.5, retro: tr[p].retro };
  });
  const moonNak = Math.floor(tr.Moon.lon / (360 / 27));
  const taraN = ((moonNak - r.P.Moon.nak + 27) % 27) % 9 + 1;
  const tara = TARA_GOOD.includes(taraN) ? 'good' : TARA_BAD.includes(taraN) ? 'bad' : 'mixed';
  const chandraH = hFrom(tr.Moon.sign, M);
  const chandra = chandraH === 8 ? 'bad' : GOCHAR_GOOD.Moon.includes(chandraH) ? 'good' : 'mixed';
  let s = num / den;
  s += tara === 'good' ? 0.08 : tara === 'bad' ? -0.1 : 0;
  s += chandraH === 8 ? -0.15 : chandra === 'good' ? 0.05 : 0;
  return { score: clamp(s, 0, 1), items, moonNak, taraN, tara, chandraH, chandra };
}

const AREAS_DAY = { career: ['Sun', 'Saturn', 'Mercury', 'Jupiter'], money: ['Jupiter', 'Venus', 'Mercury', 'Moon'], love: ['Venus', 'Moon', 'Jupiter', 'Mars'], health: ['Sun', 'Moon', 'Mars', 'Saturn'] };

function personalDay(r, nowMs) {
  const tr = transitAt(nowMs), d = dayScore(r, tr);
  const now = nowMs;
  const md = r.dashas.find(m => m.start <= now && now < m.end), ad = md && md.sub.find(a => a.start <= now && now < a.end);
  const area = {};
  for (const [a, list] of Object.entries(AREAS_DAY)) {
    const sel = d.items.filter(i => list.includes(i.planet));
    area[a] = stars(sel.filter(i => i.good).length / sel.length * 0.8 + (d.chandra === 'good' ? 0.2 : d.chandra === 'bad' ? 0 : 0.1));
  }
  const notes = [];
  notes.push(['my.tara.' + d.tara, { t: { k: 'names.tara.' + (d.taraN - 1) }, nk: { nk: d.moonNak } }]);
  notes.push(['rf.moon.' + (d.chandraH - 1), {}]);
  if (ad) {
    const h = hFrom(tr[ad.lord].sign, r.P.Moon.sign), good = GOCHAR_GOOD[ad.lord].includes(h);
    notes.push([good ? 'my.dasha.good' : 'my.dasha.bad', { md: G(md.lord), ad: G(ad.lord), h, r: R(tr[ad.lord].sign) }]);
  }
  // The slow grahas set the tone of the weeks; mention Jupiter, Saturn and Rahu from Moon and Lagna
  for (const p of ['Jupiter', 'Saturn', 'Rahu']) {
    const it = d.items.find(i => i.planet === p);
    notes.push([it.good ? 'my.slow.good' : 'my.slow.bad', { g: G(p), r: R(it.sign), h: it.fromMoon, l: it.fromLagna, b: it.bav == null ? '—' : it.bav }]);
  }
  // Next 7 days
  const week = [];
  for (let i = 0; i < 7; i++) {
    const ms = nowMs + i * DAY, w = dayScore(r, transitAt(ms));
    week.push({ at: ms, stars: stars(w.score), tara: w.tara, chandraH: w.chandraH });
  }
  return { at: nowMs, stars: stars(d.score), score: Math.round(d.score * 100), area, tara: d.tara, taraN: d.taraN, moonNak: d.moonNak, chandraH: d.chandraH, chandra: d.chandra, notes, transits: d.items, week, md: md ? md.lord : null, ad: ad ? ad.lord : null };
}

// ---------- Life areas ----------
const AREA_DEF = {
  career: { houses: [10], karaka: ['Sun', 'Saturn', 'Mercury'], varga: 'D10' },
  marriage: { houses: [7], karaka: ['Venus', 'Jupiter'], varga: 'D9' },
  finance: { houses: [2, 11], karaka: ['Jupiter', 'Venus'], varga: 'D2' },
  health: { houses: [1, 6], karaka: ['Sun', 'Moon'], varga: null },
  education: { houses: [4, 5], karaka: ['Mercury', 'Jupiter'], varga: null },
  children: { houses: [5], karaka: ['Jupiter'], varga: 'D7' }
};
const ASPECTS = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10], Rahu: [5, 7, 9], Ketu: [5, 7, 9] }; // others: 7th only
const aspectsOn = (P, house) => J.PLANETS.filter(p => (ASPECTS[p] || [7]).some(a => (P[p].house + a - 2) % 12 + 1 === house));
const DIGN = { Exalted: 'exalted', 'Own sign': 'own', Debilitated: 'debil' };
function vargaDignity(p, sign) {
  if (J.EXALT[p] === sign) return 'exalted';
  if (J.EXALT[p] != null && (J.EXALT[p] + 6) % 12 === sign) return 'debil';
  if (J.OWN[p] && J.OWN[p].includes(sign)) return 'own';
  return null;
}

function lifeAreas(r, an, vargas) {
  const P = r.P, L = r.lagna.sign, now = Date.now();
  const lordOf = h => J.SIGN_LORD[(L + h - 1) % 12];
  const out = {};
  for (const [area, def] of Object.entries(AREA_DEF)) {
    const f = []; let pts = 0;
    const push = (tone, key, params, w = 1) => { f.push({ tone, msg: [key, params] }); pts += tone === 'good' ? w : tone === 'bad' ? -w : 0; };
    const keyPlanets = new Set(def.karaka);
    for (const h of def.houses) {
      const lord = lordOf(h), lh = P[lord].house, st = an.strength[lord];
      keyPlanets.add(lord);
      const placeTone = lh === h || KENDRA.includes(lh) || TRIKONA.includes(lh) || lh === 11 ? 'good' : DUS.includes(lh) ? 'bad' : 'mixed';
      push(placeTone, 'la.lord', { h, g: G(lord), x: lh }, 1.5);
      push(st >= 62 ? 'good' : st <= 40 ? 'bad' : 'mixed', 'la.lordStr', { g: G(lord), s: st });
      const occ = r.planets.filter(p => p.house === h);
      occ.forEach(p => keyPlanets.add(p.name));
      if (occ.length) {
        const ben = occ.filter(p => BENEFIC[p.name]), mal = occ.filter(p => !BENEFIC[p.name]);
        const malOk = UPACHAYA.includes(h);
        if (ben.length) push('good', 'la.occBen', { h, list: { list: ben.map(p => G(p.name)) } });
        if (mal.length) push(malOk ? 'good' : 'bad', malOk ? 'la.occMalOk' : 'la.occMal', { h, list: { list: mal.map(p => G(p.name)) } });
      } else push('mixed', 'la.occNone', { h }, 0);
      const sav = r.sav[(L + h - 1) % 12];
      push(sav >= 28 ? 'good' : sav < 25 ? 'bad' : 'mixed', 'la.sav', { h, n: sav });
      const asp = aspectsOn(P, h).filter(p => !occ.some(o => o.name === p));
      const jupAsp = asp.includes('Jupiter'), malAsp = asp.filter(p => ['Saturn', 'Mars', 'Rahu'].includes(p));
      if (jupAsp) push('good', 'la.aspJup', { h });
      if (malAsp.length && !UPACHAYA.includes(h)) push('bad', 'la.aspMal', { h, list: { list: malAsp.map(G) } }, 0.7);
    }
    for (const k of def.karaka) {
      const st = an.strength[k];
      push(st >= 62 ? 'good' : st <= 40 ? 'bad' : 'mixed', 'la.karaka', { g: G(k), s: st, kk: { k: 'names.karaka.' + k } });
    }
    if (def.varga && vargas && vargas[def.varga]) {
      const v = vargas[def.varga], who = area === 'marriage' ? 'Venus' : lordOf(def.houses[0]);
      const dg = vargaDignity(who, v.planets[who]);
      if (dg) push(dg === 'debil' ? 'bad' : 'good', 'la.varga.' + dg, { d: def.varga, g: G(who), r: R(v.planets[who]) }, 1.2);
      else push('mixed', 'la.varga.plain', { d: def.varga, g: G(who), r: R(v.planets[who]) }, 0);
    }
    if (area === 'marriage' && r.manglik && (r.manglik.lagna || r.manglik.moon)) push('bad', 'la.manglik', {}, 0.8);
    if (area === 'health') {
      const ll = lordOf(1);
      if (an.strength[ll] >= 62) push('good', 'la.healthLL', { g: G(ll) });
    }
    // Timing: dasha periods (next 15 years) of the key planets that are reasonably strong
    const when = [];
    for (const m of r.dashas) for (const a of m.sub) {
      if (a.end < now || a.start > now + 15 * 365.25 * DAY) continue;
      const hit = keyPlanets.has(m.lord) && keyPlanets.has(a.lord) || (keyPlanets.has(a.lord) && an.strength[a.lord] >= 55);
      if (hit && an.strength[a.lord] >= 45) when.push({ md: m.lord, ad: a.lord, start: Math.max(a.start, now), end: a.end, now: a.start <= now });
    }
    const score = clamp(Math.round(50 + pts / Math.sqrt(def.houses.length) * 4.5), 5, 98);
    out[area] = { score, band: score >= 66 ? 'strong' : score >= 45 ? 'moderate' : 'care', factors: f, when: when.slice(0, 5), houses: def.houses };
  }
  return out;
}

// ---------- Remedies ----------
const MANTRA_JAPA = { Sun: 7000, Moon: 11000, Mars: 10000, Mercury: 9000, Jupiter: 19000, Venus: 16000, Saturn: 23000, Rahu: 18000, Ketu: 17000 };
function remedies(r, an, ss, nowMs) {
  const P = r.P, L = r.lagna.sign;
  const lordOf = h => J.SIGN_LORD[(L + h - 1) % 12];
  const owns = p => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(h => lordOf(h) === p);
  const functionalBenefic = p => p === lordOf(1) || owns(p).some(h => TRIKONA.includes(h));
  const dusLord = p => p !== lordOf(1) && owns(p).length > 0 && owns(p).every(h => DUS.includes(h) || h === 3 || h === 11);
  const md = r.dashas.find(m => m.start <= nowMs && nowMs < m.end), ad = md && md.sub.find(a => a.start <= nowMs && nowMs < a.end);
  const map = new Map();
  const add = (p, reason, prio) => { const e = map.get(p) || { planet: p, reasons: [], prio: 0 }; e.reasons.push(reason); e.prio += prio; map.set(p, e); };
  for (const pl of r.planets) {
    const st = an.strength[pl.name];
    if (pl.dignity === 'Debilitated') add(pl.name, ['rm.why.debil', { g: G(pl.name), r: R(pl.sign) }], 3);
    if (pl.combust) add(pl.name, ['rm.why.combust', { g: G(pl.name) }], 2);
    if (st <= 40 && pl.dignity !== 'Debilitated') add(pl.name, ['rm.why.weak', { g: G(pl.name), s: st }], 2);
  }
  if (md && an.strength[md.lord] <= 50) add(md.lord, ['rm.why.md', { g: G(md.lord), s: an.strength[md.lord] }], 2);
  if (ad && ad.lord !== md.lord && an.strength[ad.lord] <= 45) add(ad.lord, ['rm.why.ad', { g: G(ad.lord), s: an.strength[ad.lord] }], 1);
  if (r.manglik && (r.manglik.lagna || r.manglik.moon)) add('Mars', ['rm.why.manglik', {}], 2);
  if (r.kaalSarp) { add('Rahu', ['rm.why.kaalsarp', {}], 2); add('Ketu', ['rm.why.kaalsarp', {}], 1); }
  if (ss && (ss.phase || ss.dhaiya)) add('Saturn', [ss.phase ? 'rm.why.sadesati' : 'rm.why.dhaiya', {}], 3);
  const eclipse = ['Sun', 'Moon'].filter(p => P[p].sign === P.Rahu.sign || P[p].sign === P.Ketu.sign);
  eclipse.forEach(p => add(p, ['rm.why.grahan', { g: G(p) }], 1));
  if (P.Jupiter.sign === P.Rahu.sign || P.Jupiter.sign === P.Ketu.sign) add('Jupiter', ['rm.why.guruchandal', { g: G('Jupiter') }], 1);
  const list = [...map.values()].sort((a, b) => b.prio - a.prio).map(e => {
    const p = e.planet, node = p === 'Rahu' || p === 'Ketu';
    // Gemstones strengthen a graha; classical advice: only for functional benefics, never for lords of dusthanas.
    let gem = 'no', gemWhy;
    if (!node && an.strength[p] >= 60) { gem = 'skip'; gemWhy = ['rm.gem.strong', { g: G(p), s: an.strength[p] }]; }
    else if (!node && functionalBenefic(p)) { gem = 'yes'; gemWhy = ['rm.gem.yes', { g: G(p), list: { list: owns(p).filter(h => TRIKONA.includes(h) || h === 1) } }]; }
    else if (node) gemWhy = ['rm.gem.node', { g: G(p) }];
    else if (dusLord(p)) gemWhy = ['rm.gem.dus', { g: G(p), list: { list: owns(p) } }];
    else { gem = 'maybe'; gemWhy = ['rm.gem.maybe', { g: G(p), list: { list: owns(p) } }]; }
    return { planet: p, reasons: e.reasons, gem, gemWhy, japa: MANTRA_JAPA[p], strength: an.strength[p] };
  });
  return list.slice(0, 6);
}

// Doshas with their classical remedies, and "lucky" factors from the Lagna and Rashi lords.
const NUMBER = { Sun: 1, Moon: 2, Jupiter: 3, Rahu: 4, Mercury: 5, Venus: 6, Ketu: 7, Saturn: 8, Mars: 9 };
const RUDRA = { Sun: '1 / 12', Moon: '2', Mars: '3', Mercury: '4', Jupiter: '5', Venus: '6', Saturn: '7', Rahu: '8', Ketu: '9' };
function remedyExtras(r, ss) {
  const P = r.P, M = P.Moon.sign, node = s => s === P.Rahu.sign || s === P.Ketu.sign, doshas = [];
  const add = (id, params) => doshas.push({ id, params: params || {} });
  if (r.manglik && (r.manglik.lagna || r.manglik.moon)) add('manglik', { list: { list: [r.manglik.lagna ? r.manglik.houseL : null, r.manglik.moon ? r.manglik.houseM : null].filter((v, i, a) => v && a.indexOf(v) === i) } });
  if (r.kaalSarp) add('kaalsarp');
  if (ss && ss.phase) add('sadesati'); else if (ss && ss.dhaiya) add('dhaiya');
  if (node(P.Sun.sign) || P.Rahu.house === 9 || P.Ketu.house === 9 || (P.Sun.house === 9 && P.Saturn.sign === P.Sun.sign)) add('pitra');
  if (node(M)) add('grahan', { g: G('Moon') }); else if (node(P.Sun.sign)) add('grahan', { g: G('Sun') });
  if (node(P.Jupiter.sign)) add('guruchandal');
  if (P.Saturn.sign === P.Rahu.sign) add('shrapit');
  // Kemadruma: no graha (other than Sun and the nodes) 2nd or 12th from the Moon, and none in a kendra from it (cancellation)
  const real = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].map(p => hFrom(P[p].sign, M));
  if (!real.some(h => h === 2 || h === 12) && !real.some(h => KENDRA.includes(h))) add('kemadruma');
  const lagnaLord = J.SIGN_LORD[r.lagna.sign], moonLord = J.SIGN_LORD[M];
  return { doshas, lucky: { lagnaLord, moonLord, number: NUMBER[lagnaLord], numbers: [...new Set([NUMBER[lagnaLord], NUMBER[moonLord]])], rudra: RUDRA[lagnaLord] }, number: NUMBER, rudra: RUDRA };
}

module.exports = { personalDay, lifeAreas, remedies, remedyExtras, transitAt, dayScore, GOCHAR_GOOD };
