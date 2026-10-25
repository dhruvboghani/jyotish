// GET /api/vrat?lat=&lon=&tz=&days=90[&kinds=ekadashi,pradosh]  → fasts with parana (fast-breaking) times (free)
const V = require('../vrat.js');
const { num, cache, rateLimit } = require('../server.js');

module.exports = (req, res) => {
  if (!rateLimit(req, res, { limit: 40, key: 'vrat' })) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const lat = num(q.lat, -66, 66), lon = num(q.lon, -180, 180), tz = num(q.tz, -720, 840), days = num(q.days || 90, 1, 400), back = num(q.back || 0, 0, 400) || 0;
  if ([lat, lon, tz, days].some(v => v === null)) return res.status(400).json({ error: 'Need lat (±66), lon, tz (minutes)' });
  const kinds = String(q.kinds || '').split(',').filter(k => V.KINDS.includes(k));
  const day = Math.floor((Date.now() + tz * 60000) / 86400000) * 86400000 - tz * 60000; // local midnight
  cache(res, 3600);
  return res.status(200).json({ vrats: V.vrats({ fromMs: day - back * 86400000, days: days + back, lat, lon, tzMinutes: tz, kinds: kinds.length ? kinds : V.KINDS }) });
};
