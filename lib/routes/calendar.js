// GET /api/calendar?year=2026&lat=28.61&lon=77.21&tz=330   (free, cached per location rounded to 0.5°)
const P = require('../panchang.js');
const { num, cache, rateLimit } = require('../server.js');
const memo = new Map();

module.exports = (req, res) => {
  if (!rateLimit(req, res, { limit: 30, key: 'calendar' })) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const year = num(q.year, 1900, 2100), lat = num(q.lat, -66, 66), lon = num(q.lon, -180, 180), tz = num(q.tz, -720, 840);
  if ([year, lat, lon, tz].some(v => v === null)) return res.status(400).json({ error: 'Need year, lat (±66), lon, tz (minutes)' });
  const rl = v => Math.round(v * 2) / 2, key = [year, rl(lat), rl(lon), tz].join('|');
  let events = memo.get(key);
  if (!events) {
    events = P.calendar({ year, lat: rl(lat), lon: rl(lon), tzMinutes: tz });
    memo.set(key, events);
    if (memo.size > 200) memo.delete(memo.keys().next().value);
  }
  cache(res, 7 * 86400);
  return res.status(200).json({ year, events });
};
