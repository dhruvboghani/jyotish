// POST /api/ask: "Ask my chart". Members only, a few questions a day.
// The server works out the chart, turns it into a numbered list of facts [F1], [F2] … and asks the model to answer
// only from those facts and cite them. The facts go back to the page so every claim links to the report section it came from.
const { validate, clean, full } = require('../report.js');
const { userFromReq, body: readBody, rateLimit } = require('../server.js');
const { translator } = require('../i18n-server.js');
const E = require('../engine.js');

const DAILY = Math.max(1, Math.min(50, parseInt(process.env.ASK_DAILY_LIMIT || '10', 10) || 10));
const MODEL = process.env.ASK_MODEL || 'claude-haiku-5-5';
const LANG_NAME = { en: 'English', hi: 'Hindi', gu: 'Gujarati', ta: 'Tamil', te: 'Telugu', kn: 'Kannada' };
const PL = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const AREA_SEC = 'areas';
const DIG = { Exalted: 'exalted', 'Own sign': 'own', Debilitated: 'debil', Friendly: 'friendly', Enemy: 'enemy', Neutral: 'neutral' };

const ymd = ms => new Date(ms).toISOString().slice(0, 10);
const msg = (T, m) => Array.isArray(m) ? T.t(m[0], m[1]) : String(m || '');

// Jupiter/Saturn over the natal planets this year and next (Nadi rule, same sign or opposite), computed monthly
function nadiActs(c, y) {
  const natal = Object.fromEntries(c.planets.map(p => [p.name, p.sign])), out = new Map();
  for (let m = 0; m < 12; m++) {
    const lon = E.transit(Date.UTC(y, m, 15, 12) / 864e5 + 2440587.5).lon;
    for (const tp of ['Jupiter', 'Saturn']) {
      const s = Math.floor(lon[tp] / 30);
      for (const p of PL) { const d = (natal[p] - s + 12) % 12 + 1; if (d === 1 || d === 7) { const k = tp + p; if (!out.has(k)) out.set(k, { by: tp, on: p, rel: d === 1 ? 'conj' : 'opp' }); } }
    }
  }
  return [...out.values()];
}

// The chart as numbered facts. T = translator for the language the facts are written in.
function buildFacts(r, T) {
  const c = r.chart, an = r.analysis, pr = r.premium || {}, F = [];
  const add = (sec, text) => { if (text) F.push({ id: 'F' + (F.length + 1), sec, text: String(text).replace(/\s+/g, ' ').trim() }); };
  const gn = p => T.t('names.graha.' + p), rn = s => (T.L('names.rashi') || [])[s], nk = n => (T.L('names.nak') || [])[n];
  const P = Object.fromEntries(c.planets.map(p => [p.name, p]));
  const ll = SIGN_LORD[c.lagna.sign];
  add('charts', `${T.t('ask.f.lagna')}: ${rn(c.lagna.sign)} ${c.lagna.deg.toFixed(1)}°, ${T.t('ask.f.nak')} ${nk(c.lagna.nak)}. ${T.t('ask.f.lagnaLord')}: ${gn(ll)} (${T.t('ask.f.house')} ${P[ll].house}).`);
  add('grahas', `${T.t('ask.f.moon')}: ${rn(P.Moon.sign)}, ${T.t('ask.f.nak')} ${nk(P.Moon.nak)} ${T.t('ask.f.pada')} ${P.Moon.pada}.`);
  for (const p of PL) {
    const x = P[p], s = an.strength && an.strength[p];
    const bits = [`${gn(p)}: ${rn(x.sign)} ${x.deg.toFixed(1)}°, ${T.t('ask.f.house')} ${x.house}`];
    const dk = DIG[x.dignity]; if (dk && dk !== 'neutral') bits.push(T.t('sec.grahas.' + dk));
    if (x.retro && !['Rahu', 'Ketu'].includes(p)) bits.push(T.t('sec.grahas.retro'));
    if (x.combust) bits.push(T.t('sec.grahas.combust'));
    if (s != null) bits.push(`${T.t('sec.grahas.strength')} ${s}/100`);
    const own = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(h => SIGN_LORD[(c.lagna.sign + h - 1) % 12] === p);
    if (own.length) bits.push(`${T.t('ask.f.rules')} ${own.join(', ')}`);
    add('grahas', bits.join(', ') + '.');
  }
  for (const y of (an.yogas || []).filter(y => y.present)) add('yogas', `${T.t('yoga.' + y.id + '.name', y.nameParams)}: ${T.t('yoga.' + y.id + '.text', y.params)}`);
  if (!(an.yogas || []).some(y => y.id === 'mangal' && y.present)) add('yogas', `${T.t('ask.f.manglik')}: ${T.t('ask.f.no')}.`);
  for (const h of (an.good || []).slice(0, 5)) add('highlights', `${msg(T, h.title)}. ${msg(T, h.text)}`);
  for (const h of (an.bad || []).slice(0, 5)) add('highlights', `${msg(T, h.title)}. ${msg(T, h.text)}`);
  // Dashas: current, then the next few antardashas
  const now = Date.now(), md = c.dashas.find(d => d.start <= now && now < d.end);
  if (md) {
    const ad = md.sub.find(a => a.start <= now && now < a.end);
    add('dasha', `${T.t('ask.f.dashaNow')}: ${gn(md.lord)} ${T.t('ask.f.md')} (${ymd(md.start)} – ${ymd(md.end)})${ad ? `, ${gn(ad.lord)} ${T.t('ask.f.ad')} (${ymd(ad.start)} – ${ymd(ad.end)})` : ''}.`);
    const next = [];
    for (const d of c.dashas) for (const a of d.sub) if (a.start > now && next.length < 4) next.push(`${gn(d.lord)}–${gn(a.lord)} ${T.t('ask.f.from')} ${ymd(a.start)}`);
    if (next.length) add('dasha', `${T.t('ask.f.dashaNext')}: ${next.join('; ')}.`);
  }
  const ss = r.sadeSati || {};
  const ssNow = (ss.periods || []).find(p => p.start <= now && now < p.end), ssNext = (ss.periods || []).find(p => p.start > now);
  add('yogas', ssNow ? `${T.t('ask.f.sadeSatiNow')} (${ymd(ssNow.start)} – ${ymd(ssNow.end)}).` : `${T.t('ask.f.sadeSatiNo')}${ssNext ? ` ${T.t('ask.f.sadeSatiNext')} ${ymd(ssNext.start)}.` : ''}`);
  for (const g of (r.gochar || []).filter(g => ['Jupiter', 'Saturn', 'Rahu'].includes(g.name)))
    add('gochar', `${T.t('ask.f.transitNow')}: ${gn(g.name)} ${T.t('ask.f.in')} ${rn(g.sign)}, ${T.t('ask.f.fromMoon')} ${g.fromMoon}, ${T.t('ask.f.fromLagna')} ${g.fromLagna} (${g.good ? T.t('ask.f.good') : T.t('ask.f.hard')}).`);
  for (const u of (pr.upcoming || []).filter(u => u.type === 'ingress' && ['Jupiter', 'Saturn'].includes(u.planet)).slice(0, 3))
    add('events', `${ymd(u.at)}: ${gn(u.planet)} ${T.t('ask.f.enters')} ${rn(u.to)} (${T.t('ask.f.house')} ${u.house} ${T.t('ask.f.fromLagnaShort')}).`);
  const y0 = new Date().getUTCFullYear();
  for (const y of [y0, y0 + 1]) {
    const acts = nadiActs(c, y);
    if (acts.length) add('nadi', `${T.t('ask.f.nadi')} ${y}: ${acts.map(a => `${gn(a.by)} ${a.rel === 'conj' ? T.t('ask.f.on') : T.t('ask.f.opp')} ${gn(a.on)}`).join('; ')}.`);
  }
  for (const [k, a] of Object.entries(pr.areas || {})) {
    const when = (a.when || []).slice(0, 3).map(w => `${gn(w.md)}–${gn(w.ad)} ${ymd(w.start).slice(0, 4)}–${ymd(w.end).slice(0, 4)}`).join(', ');
    const why = (a.factors || []).slice(0, 4).map(f => msg(T, f.msg)).join(' ');
    add(AREA_SEC, `${T.t('la.' + k + '.name')}: ${a.score}/100 (${T.t('la.band.' + a.band)}). ${why}${when ? ` ${T.t('ask.f.activeIn')}: ${when}.` : ''}`);
  }
  for (const m of (pr.remedies || []).slice(0, 3)) add('remedies', `${T.t('ask.f.remedyFor')} ${gn(m.planet)}: ${(m.reasons || []).map(x => msg(T, x)).join(' ')}`);
  return F;
}

const SYSTEM = lang => `You are the "Ask my chart" assistant on Grahavani, a Vedic astrology (Jyotish) website using Lahiri ayanamsa, whole-sign houses and Vimshottari dasha.
Answer the user's question about their own birth chart using ONLY the numbered chart facts given. After each claim, cite the fact ids it rests on in square brackets, like [F3] or [F3][F12]. Never cite an id that is not in the list, and never invent placements, dates or yogas.
If the facts do not cover the question, say so plainly and suggest what part of the report to look at.
Write in ${LANG_NAME[lang] || 'English'}, warm and plain, under 180 words, no headings. Use the planet and sign names as they appear in the facts.
Astrology shows tendencies, not certainties: never predict death, lifespan, serious illness, accidents or exact lottery/market outcomes; for health, legal or money decisions, add that a professional should be consulted. Do not ask the user for personal details.`;

async function callModel(facts, q, history, lang) {
  const key = process.env.ANTHROPIC_API_KEY;
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 40000);
  const factText = facts.map(f => `[${f.id}] (${f.sec}) ${f.text}`).join('\n');
  const msgs = [];
  for (const h of history) { msgs.push({ role: 'user', content: h.q }); msgs.push({ role: 'assistant', content: h.a }); }
  msgs.push({ role: 'user', content: `Chart facts:\n${factText}\n\nQuestion: ${q}` });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 900, system: SYSTEM(lang), messages: msgs })
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) { console.error('ask model error', r.status, j && j.error && j.error.message); return null; }
    return (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  } catch (e) { console.error('ask failed', e.message); return null; } finally { clearTimeout(timer); }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 8, key: 'ask' })) return;
  const body = readBody(req);
  if (!body || typeof body.birth !== 'object') return res.status(400).json({ error: 'Invalid JSON' });
  const q = String(body.q || '').trim().slice(0, 500);
  if (q.length < 3) return res.status(400).json({ error: 'empty_question' });
  const problem = validate(body.birth);
  if (problem) return res.status(400).json({ error: problem });
  const auth = await userFromReq(req);
  if (!auth.user) return res.status(401).json({ error: 'login_required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'not_configured' });
  const lang = LANG_NAME[body.lang] ? body.lang : 'en';
  const { data: left, error } = await auth.sb.rpc('ask_take', { p_limit: DAILY });
  if (error) { console.error('ask quota', error.message); return res.status(503).json({ error: 'not_configured' }); }
  if (left < 0) return res.status(429).json({ error: 'quota', limit: DAILY });

  const input = clean(body.birth), report = full(input, { premium: true });
  const factsEn = buildFacts(report, translator('en')), factsUser = lang === 'en' ? factsEn : buildFacts(report, translator(lang));
  const history = (Array.isArray(body.history) ? body.history : []).slice(-3)
    .map(h => ({ q: String(h && h.q || '').slice(0, 500), a: String(h && h.a || '').slice(0, 1500) })).filter(h => h.q && h.a);
  const answer = await callModel(factsEn, q, history, lang);
  if (!answer) return res.status(502).json({ error: 'model_failed' });
  const cited = new Set((answer.match(/\[F\d+\]/g) || []).map(s => s.slice(1, -1)));
  const facts = factsUser.filter(f => cited.has(f.id));
  return res.status(200).json({ answer, facts, left, limit: DAILY });
};
module.exports.buildFacts = buildFacts;
