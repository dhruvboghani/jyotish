// POST /api/match { boy: {birth…}, girl: {birth…} }   — members only (free, login required)
const { validate, clean } = require('../lib/report.js');
const { match } = require('../lib/match.js');
const { userFromReq, body: readBody, rateLimit } = require('../lib/server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 30, key: 'match' })) return;
  const b = readBody(req);
  if (!b || !b.boy || !b.girl) return res.status(400).json({ error: 'Send boy and girl birth details' });
  const p1 = validate(b.boy), p2 = validate(b.girl);
  if (p1 || p2) return res.status(400).json({ error: p1 || p2, who: p1 ? 'boy' : 'girl' });
  const auth = await userFromReq(req);
  if (!auth.user) return res.status(401).json({ error: 'login_required' });
  return res.status(200).json(match(clean(b.boy), clean(b.girl)));
};
