/* Kundali Milan: Ashtakoot Guna Milan (36 points) + Mangal dosha of both charts.
   Tables follow the standard North-Indian convention used by most panchangs; rows = boy, columns = girl. */
const J = require('./engine.js');
const { analyze } = require('./analysis.js');
const V = require('./varga.js');
const PS = require('./personal.js');
const { porutham } = require('./porutham.js');

const VASHYA_CLASSES = ['Chatushpad', 'Manav', 'Jalchar', 'Vanchar', 'Keet'];
const VASHYA = [ // boy \ girl
  [2, 1, 1, 0.5, 1],
  [0, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0.5, 0, 1, 2, 0],
  [1, 1, 1, 0, 2]
];
const YONIS = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'];
const YONI = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4]
];
const GANAS = ['Deva', 'Manushya', 'Rakshasa'];
const GANA = [[6, 5, 0], [5, 6, 0], [0, 1, 6]]; // boy \ girl
const VARNA_RANK = { Shudra: 1, Vaishya: 2, Kshatriya: 3, Brahmin: 4 };
const TARA_BAD = [3, 5, 7];

function person(input) {
  const r = J.compute(input), m = r.P.Moon;
  return { r, input, moonSign: m.sign, moonDeg: m.deg, nak: m.nak, pada: m.pada, av: r.avakahada, manglik: r.manglik, lagna: r.lagna.sign };
}

function relation(a, b) { // natural relation of planet a towards b
  if (a === b) return 'F';
  return (J.REL[a] && J.REL[a][b]) || 'N';
}

function match(boyInput, girlInput) {
  const B = person(boyInput), G = person(girlInput);
  const k = [];
  // 1 Varna
  const vb = VARNA_RANK[B.av.varna], vg = VARNA_RANK[G.av.varna];
  k.push({ id: 'varna', max: 1, score: vb >= vg ? 1 : 0, boy: B.av.varna, girl: G.av.varna });
  // 2 Vashya
  const ib = VASHYA_CLASSES.indexOf(B.av.vashya), ig = VASHYA_CLASSES.indexOf(G.av.vashya);
  k.push({ id: 'vashya', max: 2, score: VASHYA[ib][ig], boy: B.av.vashya, girl: G.av.vashya });
  // 3 Tara (both directions, 1.5 each)
  const cnt = (from, to) => ((to - from + 27) % 27) + 1;
  const rem = n => { const r = n % 9; return r === 0 ? 9 : r; };
  const tGB = rem(cnt(G.nak, B.nak)), tBG = rem(cnt(B.nak, G.nak));
  const tara = (TARA_BAD.includes(tGB) ? 0 : 1.5) + (TARA_BAD.includes(tBG) ? 0 : 1.5);
  k.push({ id: 'tara', max: 3, score: tara, boy: tBG, girl: tGB });
  // 4 Yoni
  const yb = YONIS.indexOf(B.av.yoni), yg = YONIS.indexOf(G.av.yoni);
  k.push({ id: 'yoni', max: 4, score: YONI[yb][yg], boy: B.av.yoni, girl: G.av.yoni });
  // 5 Graha Maitri
  const lb = J.SIGN_LORD[B.moonSign], lg = J.SIGN_LORD[G.moonSign];
  const r1 = relation(lb, lg), r2 = relation(lg, lb), pair = [r1, r2].sort().join('');
  const MAITRI = { FF: 5, FN: 4, NN: 3, EF: 1, EN: 0.5, EE: 0 };
  k.push({ id: 'maitri', max: 5, score: lb === lg ? 5 : MAITRI[pair], boy: lb, girl: lg });
  // 6 Gana
  const gb = GANAS.indexOf(B.av.gana), gg = GANAS.indexOf(G.av.gana);
  k.push({ id: 'gana', max: 6, score: GANA[gb][gg], boy: B.av.gana, girl: G.av.gana });
  // 7 Bhakoot
  const d = ((G.moonSign - B.moonSign + 12) % 12) + 1, dd = ((B.moonSign - G.moonSign + 12) % 12) + 1;
  const badPair = [[2, 12], [12, 2], [5, 9], [9, 5], [6, 8], [8, 6]].some(([x, y]) => x === d && y === dd);
  const bhakootCancel = badPair && (lb === lg || (relation(lb, lg) === 'F' && relation(lg, lb) === 'F'));
  k.push({ id: 'bhakoot', max: 7, score: badPair ? 0 : 7, boy: B.moonSign, girl: G.moonSign, distance: [dd, d], cancelled: bhakootCancel });
  // 8 Nadi
  const sameNadi = B.av.nadi === G.av.nadi;
  const nadiCancel = sameNadi && ((B.moonSign === G.moonSign && B.nak !== G.nak) || (B.nak === G.nak && B.pada !== G.pada) || (B.nak === G.nak && B.moonSign !== G.moonSign));
  k.push({ id: 'nadi', max: 8, score: sameNadi ? 0 : 8, boy: B.av.nadi, girl: G.av.nadi, cancelled: nadiCancel });

  const total = k.reduce((s, x) => s + x.score, 0);
  const mg = p => p.manglik.lagna || p.manglik.moon || p.manglik.venus;
  const manglik = { boy: mg(B), girl: mg(G), boyDetail: B.manglik, girlDetail: G.manglik };
  manglik.status = manglik.boy && manglik.girl ? 'both' : manglik.boy || manglik.girl ? 'one' : 'none';
  const verdict = total >= 33 ? 'excellent' : total >= 25 ? 'good' : total >= 18 ? 'average' : 'low';
  const strip = p => ({ moonSign: p.moonSign, nak: p.nak, pada: p.pada, lagna: p.lagna, name: p.input.name, placeLabel: p.input.placeLabel, gana: p.av.gana, nadi: p.av.nadi, yoni: p.av.yoni, varna: p.av.varna, vashya: p.av.vashya });
  const ten = porutham({ nak: B.nak, moonSign: B.moonSign, gana: B.av.gana }, { nak: G.nak, moonSign: G.moonSign, gana: G.av.gana }, YONI[yb][yg]);
  return { boy: strip(B), girl: strip(G), kootas: k, total, max: 36, verdict, manglik, porutham: ten, report: compat(B, G) };
}

// Full compatibility: each chart's marriage factors (7th house, Venus/Jupiter, Navamsa) + cross-chart checks + dashas.
function compat(B, G, nowMs = Date.now()) {
  const side = p => { const an = analyze(p.r), vg = V.vargas(p.r); return { an, vg, m: PS.lifeAreas(p.r, an, vg).marriage }; };
  const b = side(B), g = side(G);
  const cross = []; let pts = 0;
  const add = (tone, key, params, w = 1) => { cross.push({ tone, msg: [key, params] }); pts += tone === 'good' ? w : tone === 'bad' ? -w : 0; };
  const R = r => ({ r }), Gg = x => ({ g: x });
  const ll = p => J.SIGN_LORD[p.r.lagna.sign];
  const rl = relation(ll(B), ll(G)), rl2 = relation(ll(G), ll(B));
  add(rl === 'E' || rl2 === 'E' ? 'bad' : rl === 'F' && rl2 === 'F' ? 'good' : 'mixed', 'cp.lagna', { a: R(B.lagna), b: R(G.lagna), ga: Gg(ll(B)), gb: Gg(ll(G)) });
  const dm = ((G.moonSign - B.moonSign + 12) % 12) + 1;
  add([1, 7, 3, 11, 4, 10].includes(dm) ? 'good' : [6, 8, 2, 12].includes(dm) ? 'bad' : 'mixed', 'cp.moon', { a: R(B.moonSign), b: R(G.moonSign), d: dm });
  const vB = B.r.P.Venus.sign, mG = G.r.P.Mars.sign, vG = G.r.P.Venus.sign, mB = B.r.P.Mars.sign;
  const attract = [vB, vG].some((v, i) => { const m = i === 0 ? mG : mB; const dd = ((m - v + 12) % 12) + 1; return dd === 1 || dd === 7; });
  if (attract) add('good', 'cp.attraction', {});
  const d9b = b.vg.D9.asc, d9g = g.vg.D9.asc, l9b = J.SIGN_LORD[d9b], l9g = J.SIGN_LORD[d9g];
  const r9 = relation(l9b, l9g), r9b = relation(l9g, l9b);
  add(r9 === 'E' || r9b === 'E' ? 'bad' : r9 === 'F' || r9b === 'F' || l9b === l9g ? 'good' : 'mixed', 'cp.navamsa', { a: R(d9b), b: R(d9g) });
  // Dashas: the next five years for each
  const dashaNote = (p, an, who) => {
    const md = p.r.dashas.find(m => m.start <= nowMs && nowMs < m.end), ad = md && md.sub.find(a => a.start <= nowMs && nowMs < a.end);
    if (!md) return;
    const st = (an.strength[md.lord] + an.strength[ad.lord]) / 2;
    add(st >= 58 ? 'good' : st <= 40 ? 'bad' : 'mixed', 'cp.dasha', { who: { k: 'mt.' + who }, md: Gg(md.lord), ad: Gg(ad.lord) }, 0.7);
    if (md.end - nowMs < 365.25 * 86400000) add('mixed', 'cp.sandhi', { who: { k: 'mt.' + who }, g: Gg(md.lord), n: p.r.dashas[p.r.dashas.indexOf(md) + 1] ? Gg(p.r.dashas[p.r.dashas.indexOf(md) + 1].lord) : '' }, 0);
  };
  dashaNote(B, b.an, 'boy'); dashaNote(G, g.an, 'girl');
  const score = Math.max(5, Math.min(98, Math.round((b.m.score + g.m.score) / 2 + pts * 4)));
  return { boy: { score: b.m.score, factors: b.m.factors }, girl: { score: g.m.score, factors: g.m.factors }, cross, score, band: score >= 66 ? 'strong' : score >= 45 ? 'moderate' : 'care' };
}

module.exports = { match };
