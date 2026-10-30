/* Career finder: which kinds of work suit the chart, and when a job change is best timed.
   Significators (each weighted by the planet's strength):
   planets in the 10th house, the 10th lord, the lord of the navamsa sign the 10th lord sits in (Varahamihira's rule),
   planets in the 10th from the Moon, the D10 lagna lord and the lord of the 10th in D10, Amatyakaraka and Atmakaraka (Jaimini).
   Each field of work has its own mix of planets; the score is the sum of significator weight × field weight. */
const J = require('./engine.js');
const { VARGAS } = require('./varga.js');

const PL7 = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const FIELDS = {
  govt: { Sun: 3, Saturn: 1, Jupiter: 1 },
  medicine: { Sun: 1, Mars: 2, Jupiter: 1, Ketu: 1, Moon: 1 },
  engineering: { Mars: 2.5, Saturn: 1, Rahu: 1.5, Mercury: 1 },
  it: { Mercury: 2, Rahu: 2.5, Saturn: 1 },
  finance: { Mercury: 2, Jupiter: 2, Venus: 1 },
  business: { Mercury: 3, Venus: 1, Rahu: 1 },
  law: { Jupiter: 3, Saturn: 1, Sun: 1 },
  teaching: { Jupiter: 3, Mercury: 1, Ketu: 1 },
  arts: { Venus: 3, Moon: 1, Mercury: 0.5, Rahu: 1 },
  hospitality: { Venus: 2, Moon: 2 },
  defence: { Mars: 3, Sun: 1 },
  realestate: { Mars: 2, Saturn: 2, Moon: 0.5 },
  writing: { Mercury: 3, Moon: 1 },
  food: { Moon: 2, Venus: 1, Saturn: 1 },
  spiritual: { Ketu: 2, Jupiter: 2, Saturn: 1 },
  foreign: { Rahu: 3, Moon: 1 },
  industry: { Saturn: 3, Rahu: 1, Mars: 1 }
};
const ELEMENT = ['fire', 'earth', 'air', 'water'];      // Mesha fire, Vrishabha earth, Mithuna air, Karka water …
const MODE = ['movable', 'fixed', 'dual'];
const DAY = 864e5;

function careerFinder(r, an, nowMs = Date.now()) {
  const P = r.P, L = r.lagna.sign, st = an.strength;
  const lordOfSign = s => J.SIGN_LORD[s];
  const tenthSign = (L + 9) % 12, tenthLord = lordOfSign(tenthSign);
  const sig = {};      // planet → { w, why: [ [key, params] ] }
  const add = (p, w, key, params = {}) => { const s = sig[p] || (sig[p] = { w: 0, why: [] }); s.w += w; s.why.push([key, { g: { g: p }, ...params }]); };
  r.planets.filter(p => p.house === 10).forEach(p => add(p.name, 3, 'cr.why.in10'));
  add(tenthLord, 3, 'cr.why.lord10', { r: { r: tenthSign } });
  const navLord = lordOfSign(VARGAS.D9(P[tenthLord].lon));
  add(navLord, 2.5, 'cr.why.navLord', { l: { g: tenthLord } });
  const moon10 = (P.Moon.sign + 9) % 12;
  r.planets.filter(p => p.sign === moon10 && p.name !== 'Moon').forEach(p => add(p.name, 1.5, 'cr.why.moon10'));
  const d10asc = VARGAS.D10(r.lagna.lon), d10Lord = lordOfSign(d10asc), d10Tenth = lordOfSign((d10asc + 9) % 12);
  add(d10Lord, 2, 'cr.why.d10lagna');
  add(d10Tenth, 1.5, 'cr.why.d10tenth');
  // Chara karakas: degree within the sign, highest = Atmakaraka, second = Amatyakaraka
  const ck = PL7.map(p => ({ p, d: P[p].lon % 30 })).sort((a, b) => b.d - a.d);
  add(ck[1].p, 2.5, 'cr.why.amk');
  add(ck[0].p, 1.5, 'cr.why.ak');
  // Strength scales each planet's weight
  for (const [p, s] of Object.entries(sig)) s.w *= 0.6 + (st[p] != null ? st[p] : 50) / 100;

  const fields = Object.entries(FIELDS).map(([k, mix]) => {
    let score = 0; const by = [];
    for (const [p, fw] of Object.entries(mix)) if (sig[p]) { const v = sig[p].w * fw; score += v; by.push({ p, v }); }
    by.sort((a, b) => b.v - a.v);
    return { k, score, planets: by.slice(0, 3).map(x => x.p) };
  }).sort((a, b) => b.score - a.score);
  const top = fields[0].score || 1;
  const list = fields.slice(0, 6).map(f => ({ k: f.k, pct: Math.round(f.score / top * 100), planets: f.planets }));

  // Job or own business: 7th house (dealings, partners), Mercury, 3rd/11th versus 6th (service) and Saturn
  const lordOf = h => lordOfSign((L + h - 1) % 12);
  const has = (h, ps) => r.planets.some(p => p.house === h && ps.includes(p.name));
  const biz = (st[lordOf(7)] + st.Mercury + st[lordOf(11)]) / 3 + (has(7, ['Mercury', 'Jupiter', 'Venus']) ? 8 : 0) + (has(3, ['Mars', 'Rahu']) ? 4 : 0) + ([1, 7, 10].includes(P[lordOf(10)].house) ? 4 : 0);
  const job = (st[lordOf(6)] + st.Saturn + st[lordOf(10)]) / 3 + (P[lordOf(10)].house === 6 ? 8 : 0) + (has(6, ['Saturn', 'Mars', 'Sun']) ? 4 : 0);
  const lean = biz - job > 6 ? 'business' : job - biz > 6 ? 'job' : 'both';

  // Job-change windows in the next 10 years: antardasha of a strong career significator,
  // stronger when Jupiter transits the 10th from the lagna or the Moon during it
  const keyP = new Set(Object.entries(sig).filter(([, s]) => s.w >= 2.4).map(([p]) => p));
  const windows = [];
  for (const m of r.dashas) for (const a of m.sub) {
    if (a.end < nowMs || a.start > nowMs + 10 * 365.25 * DAY || !keyP.has(a.lord)) continue;
    let jup = false;
    for (let t = Math.max(a.start, nowMs); t < a.end && !jup; t += 30 * DAY) {
      const js = Math.floor(J.transit(t / DAY + 2440587.5).lon.Jupiter / 30);
      if (js === tenthSign || js === moon10 || js === L) jup = true;
    }
    windows.push({ md: m.lord, ad: a.lord, start: Math.max(a.start, nowMs), end: a.end, now: a.start <= nowMs, jup });
  }
  windows.sort((a, b) => (b.jup - a.jup) || a.start - b.start);
  const best = windows.slice(0, 5).sort((a, b) => a.start - b.start);

  return {
    fields: list, lean,
    tenth: { sign: tenthSign, lord: tenthLord, element: ELEMENT[tenthSign % 4], mode: MODE[tenthSign % 3] },
    significators: Object.entries(sig).sort((a, b) => b[1].w - a[1].w).slice(0, 5).map(([p, s]) => ({ p, w: Math.round(s.w * 10) / 10, why: s.why })),
    amk: ck[1].p, ak: ck[0].p, windows: best
  };
}

module.exports = { careerFinder, FIELDS };
