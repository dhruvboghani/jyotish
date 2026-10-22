// POST /api/varshaphal  { …birth, year }  → the annual (solar-return) chart for that year. Members only.
const VP = require('../varshaphal.js');
const { validate, clean } = require('../report.js');
const { userFromReq, num, body: readBody, rateLimit } = require('../server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 30, key: 'varshaphal' })) return;
  const b = readBody(req);
  if (!b) return res.status(400).json({ error: 'Invalid JSON' });
  const problem = validate(b);
  if (problem) return res.status(400).json({ error: problem });
  const auth = await userFromReq(req);
  if (!auth.user) return res.status(401).json({ error: 'Login required' });
  const input = clean(b), year = num(b.year, input.year, input.year + 120);
  if (year === null) return res.status(400).json({ error: 'Invalid year' });
  return res.status(200).json(VP.varshaphal(input, year));
};
