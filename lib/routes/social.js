// GET /api/social/?img=rashifal|panchang&fmt=post|story&lang=en&date=YYYY-MM-DD[&city=Name|lat|lon|tz][&type=jpg] → PNG or JPEG (public, cached)
// GET /api/social/?post=1[&dry=1] with "Authorization: Bearer <CRON_SECRET>" → posts today's cards to Instagram / Facebook now
const { cache, rateLimit } = require('../server.js');

const LANGS = new Set(['en', 'hi', 'gu', 'ta', 'te', 'kn']);
module.exports = async (req, res) => {
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  if (q.post) {
    res.setHeader('Cache-Control', 'no-store');
    const secret = process.env.CRON_SECRET;
    if (!secret || (req.headers.authorization || '') !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorised' });
    const out = await require('../social-post.js').run({ dry: !!q.dry });
    return res.status(200).json(out);
  }
  if (!rateLimit(req, res, { limit: 150, key: 'social' })) return;
  if (q.caption) { // the day's caption with hashtags, in one language
    const SPo = require('../social-post.js'), cfg = SPo.config(), m0 = String(q.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/), n0 = new Date(Date.now() + 330 * 60000);
    cfg.lang = LANGS.has(q.lang) ? q.lang : 'en';
    if (q.city) { const [n, lat, lon] = String(q.city).split('|'); if (Number.isFinite(+lat) && Number.isFinite(+lon)) cfg.city = { name: String(n || '').slice(0, 40), lat: +lat, lon: +lon, tz: 330 }; }
    const d = m0 ? { y: +m0[1], m: +m0[2], d: +m0[3] } : { y: n0.getUTCFullYear(), m: n0.getUTCMonth() + 1, d: n0.getUTCDate() };
    cache(res, 3600);
    return res.status(200).json({ caption: SPo.caption(cfg, d, false) });
  }
  const kind = q.img === 'panchang' ? 'panchang' : q.img === 'rashifal' ? 'rashifal' : null;
  if (!kind) return res.status(400).json({ error: 'Use img=rashifal or img=panchang' });
  const fmt = q.fmt === 'story' ? 'story' : 'post', lang = LANGS.has(q.lang) ? q.lang : 'en';
  const now = new Date(Date.now() + 330 * 60000), m = String(q.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = m ? { y: +m[1], m: +m[2], d: +m[3] } : { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
  if (date.y < 1900 || date.y > 2100 || date.m < 1 || date.m > 12 || date.d < 1 || date.d > 31) return res.status(400).json({ error: 'Bad date' });
  let city = { name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 330 };
  if (q.city) {
    const [n, lat, lon, tz] = String(q.city).split('|');
    if (!Number.isFinite(+lat) || !Number.isFinite(+lon) || Math.abs(+lat) > 70 || Math.abs(+lon) > 180) return res.status(400).json({ error: 'Bad city' });
    city = { name: String(n || '').slice(0, 40), lat: +lat, lon: +lon, tz: Number.isFinite(+tz) && Math.abs(+tz) <= 840 ? Math.round(+tz) : 330 };
  }
  try {
    const type = q.type === 'jpg' ? 'jpg' : 'png';
    const r = await require('../social-card.js').card(kind, { lang, date, fmt, city, type }), buf = r[type];
    cache(res, 86400);
    res.setHeader('Content-Type', type === 'jpg' ? 'image/jpeg' : 'image/png');
    res.setHeader('Content-Length', buf.length);
    return res.status(200).end(buf);
  } catch (e) {
    console.error('social card', e);
    return res.status(500).json({ error: 'Could not draw the card' });
  }
};
