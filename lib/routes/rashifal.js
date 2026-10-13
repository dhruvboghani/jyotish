// GET /api/rashifal?date=2026-10-13   (free, cached) — transits at 06:00 IST of the given date
const R = require('../rashifal.js');
const { cache, rateLimit } = require('../server.js');

module.exports = (req, res) => {
  if (!rateLimit(req, res, { limit: 120, key: 'rashifal' })) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const m = String(q.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const now = new Date(Date.now() + 330 * 60000);
  const [y, mo, d] = m ? [+m[1], +m[2], +m[3]] : [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()];
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return res.status(400).json({ error: 'Use date=YYYY-MM-DD' });
  const ms = Date.UTC(y, mo - 1, d, 0, 30); // 06:00 IST
  cache(res, 6 * 3600);
  return res.status(200).json({ date: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, ...R.forDate(ms) });
};
