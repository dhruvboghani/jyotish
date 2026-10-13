// GET /api/panchang?y=2026&m=10&d=13&lat=23.02&lon=72.57&tz=330   (free, cached)
const P = require('../panchang.js');
const { num, cache, rateLimit } = require('../server.js');

module.exports = (req, res) => {
  if (!rateLimit(req, res, { limit: 120, key: 'panchang' })) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const y = num(q.y, 1800, 2200), m = num(q.m, 1, 12), d = num(q.d, 1, 31), lat = num(q.lat, -66, 66), lon = num(q.lon, -180, 180), tz = num(q.tz, -720, 840);
  if ([y, m, d, lat, lon, tz].some(v => v === null)) return res.status(400).json({ error: 'Need y, m, d, lat (±66), lon, tz (minutes)' });
  const out = P.day({ year: y, month: m, day: d, lat, lon, tzMinutes: tz });
  cache(res, 86400);
  return res.status(200).json(out);
};
