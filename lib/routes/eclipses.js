// GET /api/eclipses?lat=&lon=&years=2  → solar and lunar eclipses with local visibility and sutak, plus retrograde stations (free)
const A = require('../astro.js');
const { num, cache, rateLimit } = require('../server.js');

module.exports = (req, res) => {
  if (!rateLimit(req, res, { limit: 30, key: 'eclipses' })) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const lat = num(q.lat, -66, 66), lon = num(q.lon, -180, 180), years = num(q.years || 2, 1, 5);
  if ([lat, lon, years].some(v => v === null)) return res.status(400).json({ error: 'Need lat (±66), lon' });
  const from = Date.now() - 30 * 86400000, to = from + years * 365.25 * 86400000;
  cache(res, 86400);
  return res.status(200).json({ eclipses: A.eclipses({ fromMs: from, toMs: to, lat, lon }), stations: A.stations({ fromMs: Date.now(), toMs: Date.now() + 365.25 * 86400000 }) });
};
