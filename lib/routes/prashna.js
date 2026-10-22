// GET /api/prashna?lat=23.02&lon=72.57&tz=330&topic=career[&t=<utc ms>]   (free; chart for the moment of asking)
const { prashna } = require('../prashna.js');
const { num, rateLimit } = require('../server.js');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!rateLimit(req, res, { limit: 60, key: 'prashna' })) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const lat = num(q.lat, -66, 66), lon = num(q.lon, -180, 180), tz = num(q.tz, -720, 840);
  if ([lat, lon, tz].some(v => v === null)) return res.status(400).json({ error: 'Need lat (±66), lon, tz (minutes)' });
  const now = Date.now(), t = num(q.t, now - 7 * 86400000, now + 60000) || now; // the question's moment: now or the recent past
  return res.status(200).json(prashna({ utMs: t, lat, lon, tzMinutes: tz, topic: String(q.topic || 'general') }));
};
