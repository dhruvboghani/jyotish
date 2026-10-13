// POST /api/names { nak, pada?, gender?, birth? , check? }  — members only (free with login)
// Baby names for the nakshatra syllables, ranked by Chaldean numerology against the birth date.
const J = require('../lib/engine.js');
const N = require('../lib/names.js');
const { validate, clean } = require('../lib/report.js');
const { userFromReq, body: readBody, rateLimit } = require('../lib/server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 60, key: 'names' })) return;
  const auth = await userFromReq(req);
  if (!auth.user) return res.status(401).json({ error: 'login_required' });
  const b = readBody(req) || {};
  let nak = Number(b.nak), pada = b.pada ? Number(b.pada) : null, day = Number(b.day) || null, month = Number(b.month) || null, year = Number(b.year) || null;
  if (b.birth) {
    const problem = validate(b.birth);
    if (problem) return res.status(400).json({ error: problem });
    const input = clean(b.birth), r = J.compute(input);
    nak = r.P.Moon.nak; pada = r.P.Moon.pada; day = input.day; month = input.month; year = input.year;
  }
  if (!(nak >= 0 && nak <= 26)) return res.status(400).json({ error: 'Send nak (0-26) or birth details' });
  if (pada && !(pada >= 1 && pada <= 4)) pada = null;
  const gender = ['m', 'f', 'any'].includes(b.gender) ? b.gender : 'any';
  const out = N.forNakshatra({ nak, pada: b.allPadas ? null : pada, gender, day, month, year });
  const check = typeof b.check === 'string' && b.check.trim() && day ? N.numerology(b.check.trim().slice(0, 40), day, month, year) : null;
  return res.status(200).json({ nak, pada, ...out, check });
};
