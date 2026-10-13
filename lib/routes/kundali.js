// POST /api/kundali
// - Logged in: full report + members-only sections; saved to "My Kundalis" and history.
// - Not logged in: the first chart in this browser is free (full report, no members-only sections),
//   remembered in a signed httpOnly cookie; any other birth gets the preview + login prompt.
const crypto = require('crypto');
const { validate, clean, preview, full } = require('../report.js');
const { userFromReq, body: readBody, rateLimit } = require('../server.js');

const TRIAL_SECRET = process.env.FREE_TRIAL_SECRET || 'kg-free-trial-' + (process.env.SUPABASE_URL || '');
const TRIAL_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years
const birthKeyOf = i => [i.year, i.month, i.day, i.hour, i.minute, i.lat.toFixed(4), i.lon.toFixed(4), i.tzMinutes].join('|');
const sign = v => crypto.createHmac('sha256', TRIAL_SECRET).update(v).digest('base64url').slice(0, 22);
const trialHash = key => crypto.createHash('sha256').update(key).digest('base64url').slice(0, 22);
function readTrial(req) {
  const raw = (req.headers.cookie || '').match(/(?:^|;\s*)kg_free=([^;]*)/);
  if (!raw) return null;
  const m = raw[1].match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return 'invalid';
  const a = Buffer.from(sign(m[1])), b = Buffer.from(m[2]);
  // A cookie that fails the signature check still counts as "trial used".
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? m[1] : 'invalid';
}
function setTrial(res, h) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `kg_free=${h}.${sign(h)}; Path=/; Max-Age=${TRIAL_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 40, key: 'kundali' })) return;
  const body = readBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });
  const problem = validate(body);
  if (problem) return res.status(400).json({ error: problem });
  const input = clean(body);

  const auth = await userFromReq(req);
  if (!auth.user) {
    const used = readTrial(req), mine = trialHash(birthKeyOf(input));
    if (!used || used === mine) {
      if (!used) setTrial(res, mine);
      return res.status(200).json({ ...full(input), trial: true });
    }
    return res.status(200).json({ ...preview(input), reason: 'trial_used' });
  }

  const report = full(input, { premium: true });
  let saved = false, logged = false;
  if (body.save !== false) {
    const row = { user_id: auth.user.id, name: input.name || null, birth: input, birth_key: birthKeyOf(input) };
    if (input.relation) row.relation = input.relation;
    let { error } = await auth.sb.from('kundalis').upsert(row, { onConflict: 'user_id,birth_key' });
    if (error && /relation/.test(error.message)) { delete row.relation; ({ error } = await auth.sb.from('kundalis').upsert(row, { onConflict: 'user_id,birth_key' })); }
    saved = !error;
    if (error) console.error('save failed', error.message);
  }
  if (body.log === true) {
    const c = report.chart, moon = c.planets.find(p => p.name === 'Moon');
    const { error } = await auth.sb.from('kundali_history').insert({
      user_id: auth.user.id, name: input.name || null, birth: input,
      summary: { lagna: c.lagna.sign, moon: moon.sign, nak: moon.nak, pada: moon.pada },
      lang: String(body.lang || '').slice(0, 5) || null
    });
    logged = !error;
    if (error) console.error('history failed', error.message);
  }
  return res.status(200).json({ ...report, saved, logged });
};
