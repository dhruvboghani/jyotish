// POST /api/muhurta { purpose, from: 'YYYY-MM-DD', days, lat, lon, tz, people?: [birth…] } — members only
const J = require('../lib/engine.js');
const M = require('../lib/muhurta.js');
const { validate, clean } = require('../lib/report.js');
const { userFromReq, body: readBody, rateLimit, num } = require('../lib/server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 20, key: 'muhurta' })) return;
  const auth = await userFromReq(req);
  if (!auth.user) return res.status(401).json({ error: 'login_required' });
  const b = readBody(req) || {};
  const purpose = M.RULES[b.purpose] ? b.purpose : 'general';
  const m = String(b.from || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const days = num(b.days, 1, 120), lat = num(b.lat, -66, 66), lon = num(b.lon, -180, 180), tz = num(b.tz, -720, 840);
  if (!m || [days, lat, lon, tz].some(v => v === null)) return res.status(400).json({ error: 'Need from (YYYY-MM-DD), days (1-120), lat, lon, tz' });
  const people = [];
  for (const p of (Array.isArray(b.people) ? b.people.slice(0, 2) : [])) {
    if (validate(p)) continue;
    people.push(J.compute(clean(p)));
  }
  const out = M.find({ purpose, from: { y: +m[1], m: +m[2], d: +m[3] }, days, lat, lon, tzMinutes: tz, people });
  return res.status(200).json({ ...out, personalised: people.length });
};
