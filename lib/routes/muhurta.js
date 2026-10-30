// POST /api/muhurta { purpose, from: 'YYYY-MM-DD', days, lat, lon, tz, people?: [birth…] } — basic for everyone, full when logged in
const J = require('../engine.js');
const M = require('../muhurta.js');
const { validate, clean } = require('../report.js');
const { userFromReq, body: readBody, rateLimit, num } = require('../server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 20, key: 'muhurta' })) return;
  const auth = await userFromReq(req), member = !!auth.user;
  const b = readBody(req) || {};
  // Not logged in: the next 30 days only (2 quick dates within 60 days), not personalised; members search up to 120 days with their own charts
  if (!member) { b.people = []; if (b.top) b.top = Math.min(2, +b.top || 2); }
  const purpose = M.RULES[b.purpose] ? b.purpose : 'general';
  const m = String(b.from || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const days = num(member ? b.days : Math.min(+b.days || 30, b.top ? 60 : 30), 1, b.top ? 240 : 120), lat = num(b.lat, -66, 66), lon = num(b.lon, -180, 180), tz = num(b.tz, -720, 840);
  if (!m || [days, lat, lon, tz].some(v => v === null)) return res.status(400).json({ error: 'Need from (YYYY-MM-DD), days (1-120), lat, lon, tz' });
  const people = [];
  for (const p of (Array.isArray(b.people) ? b.people.slice(0, 2) : [])) {
    if (validate(p)) continue;
    people.push(J.compute(clean(p)));
  }
  if (b.top) return res.status(200).json({ ...M.topDates({ purpose, from: { y: +m[1], m: +m[2], d: +m[3] }, days, lat, lon, tzMinutes: tz, people }, Math.min(10, +b.top || 5)), basic: !member });
  const out = M.find({ purpose, from: { y: +m[1], m: +m[2], d: +m[3] }, days, lat, lon, tzMinutes: tz, people });
  return res.status(200).json({ ...out, personalised: people.length, basic: !member, days });
};
