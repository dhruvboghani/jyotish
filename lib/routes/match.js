// POST /api/match { boy: {birth…}, girl: {birth…} }   — basic result for everyone, full result when logged in
const { validate, clean } = require('../report.js');
const { match } = require('../match.js');
const { userFromReq, body: readBody, rateLimit } = require('../server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 30, key: 'match' })) return;
  const b = readBody(req);
  if (b && b.rank && Array.isArray(b.candidates)) {
    // Rank saved profiles against one person: b.rank = { birth, as: 'boy'|'girl' }
    const auth0 = await userFromReq(req);
    if (!auth0.user) return res.status(401).json({ error: 'login_required' });
    if (validate(b.rank.birth)) return res.status(400).json({ error: 'Invalid birth' });
    const me = clean(b.rank.birth), asBoy = b.rank.as !== 'girl', list = [];
    for (const c of b.candidates.slice(0, 30)) {
      if (validate(c)) continue;
      const o = clean(c), m = asBoy ? match(me, o) : match(o, me);
      const eff = m.total + m.kootas.filter(k => k.cancelled).reduce((s, k) => s + k.max, 0);
      list.push({ id: c.id || null, name: o.name, total: m.total, effective: Math.min(36, eff), verdict: m.verdict, porutham: { good: m.porutham.good, verdict: m.porutham.verdict, mustPass: m.porutham.mustPass }, manglik: m.manglik.status, compat: m.report.score, band: m.report.band });
    }
    list.sort((x, y) => (y.effective + y.compat / 10) - (x.effective + x.compat / 10));
    return res.status(200).json({ ranked: list });
  }
  if (!b || !b.boy || !b.girl) return res.status(400).json({ error: 'Send boy and girl birth details' });
  const p1 = validate(b.boy), p2 = validate(b.girl);
  if (p1 || p2) return res.status(400).json({ error: p1 || p2, who: p1 ? 'boy' : 'girl' });
  const auth = await userFromReq(req), r = match(clean(b.boy), clean(b.girl));
  // Not logged in: the Ashtakoot score and Mangal dosha; Porutham and the detailed report are for members
  if (!auth.user) { const { porutham, report, ...basic } = r; return res.status(200).json({ ...basic, basic: true }); }
  // Members: the next 30 days for the two of them together
  try { const J = require('../engine.js'), boy = clean(b.boy), girl = clean(b.girl); r.month = require('../couple.js').monthAhead(J.compute(boy), J.compute(girl), { tzMinutes: girl.tzMinutes }); } catch (e) { console.error('month', e.message); }
  return res.status(200).json(r);
};
