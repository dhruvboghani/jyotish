// GET /api/festival?id=diwali&year=2026&lat=&lon=&tz=  → this year's and next year's date with the puja muhurta (free)
const F = require('../festguide.js');
const { num, cache, rateLimit } = require('../server.js');

module.exports = (req, res) => {
  if (!rateLimit(req, res, { limit: 60, key: 'festival' })) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const lat = num(q.lat, -66, 66), lon = num(q.lon, -180, 180), tz = num(q.tz, -720, 840), year = num(q.year, 1900, 2100);
  if ([lat, lon, tz, year].some(v => v === null) || !F.GUIDES[q.id]) return res.status(400).json({ error: 'Need id, year, lat, lon, tz' });
  cache(res, 86400);
  return res.status(200).json({ id: q.id, dates: F.guide(q.id, { year, lat, lon, tzMinutes: tz }) });
};
