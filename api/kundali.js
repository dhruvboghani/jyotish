// POST /api/kundali
// Anonymous callers get a small preview (Lagna, Moon sign, Nakshatra).
// Callers with a valid Supabase session get the full report, and the chart is saved to their account.
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { validate, clean, preview, full } = require('../lib/report.js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// Publishable key (sb_publishable_…) or legacy anon key. Never the secret/service_role key.
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

// ---- Free trial: one birth chart per browser, remembered in a signed httpOnly cookie ----
const TRIAL_COOKIE = 'kg_free';
const TRIAL_SECRET = process.env.FREE_TRIAL_SECRET || 'kg-free-trial-' + (SUPABASE_URL || '');
const TRIAL_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years
const birthKeyOf = i => [i.year, i.month, i.day, i.hour, i.minute, i.lat.toFixed(4), i.lon.toFixed(4), i.tzMinutes].join('|');
const sign = v => crypto.createHmac('sha256', TRIAL_SECRET).update(v).digest('base64url').slice(0, 22);
const trialHash = key => crypto.createHash('sha256').update(key).digest('base64url').slice(0, 22);
function readTrial(req) {
  const raw = (req.headers.cookie || '').match(/(?:^|;\s*)kg_free=([^;]*)/);
  if (!raw) return null;
  const m = raw[1].match(/^([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return 'invalid';
  const [, h, sig] = m;
  const a = Buffer.from(sign(h)), b = Buffer.from(sig);
  // A cookie that fails the signature check still counts as "trial used".
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? h : 'invalid';
}
function setTrial(res, h) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${TRIAL_COOKIE}=${h}.${sign(h)}; Path=/; Max-Age=${TRIAL_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`);
}

async function userFromToken(token) {
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return { user: null, sb: null };
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data || !data.user) return { user: null, sb: null };
  return { user: data.user, sb };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); } }
  const problem = validate(body);
  if (problem) return res.status(400).json({ error: problem });
  const input = clean(body);

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  let auth = { user: null, sb: null };
  try { auth = await userFromToken(token); } catch (e) { /* treat as anonymous */ }

  if (!auth.user) {
    // First chart in this browser is free (and stays free to reopen). Any other birth needs an account.
    const used = readTrial(req), mine = trialHash(birthKeyOf(input));
    if (!used || used === mine) {
      if (!used) setTrial(res, mine);
      return res.status(200).json({ ...full(input), trial: true });
    }
    return res.status(200).json({ ...preview(input), reason: 'trial_used' });
  }

  const report = full(input);
  let saved = false;
  if (body.save !== false) {
    const birthKey = birthKeyOf(input);
    const { error } = await auth.sb.from('kundalis').upsert(
      { user_id: auth.user.id, name: input.name || null, birth: input, birth_key: birthKey },
      { onConflict: 'user_id,birth_key' }
    );
    saved = !error;
    if (error) console.error('save failed', error.message);
  }
  // History: one row per explicit request (form submit), not for silent re-opens.
  let logged = false;
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
