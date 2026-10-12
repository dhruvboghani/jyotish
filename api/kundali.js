// POST /api/kundali
// Anonymous callers get a small preview (Lagna, Moon sign, Nakshatra).
// Callers with a valid Supabase session get the full report, and the chart is saved to their account.
const { createClient } = require('@supabase/supabase-js');
const { validate, clean, preview, full } = require('../lib/report.js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// Publishable key (sb_publishable_…) or legacy anon key. Never the secret/service_role key.
const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

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

  if (!auth.user) return res.status(200).json(preview(input));

  const report = full(input);
  let saved = false;
  if (body.save !== false) {
    const birthKey = [input.year, input.month, input.day, input.hour, input.minute, input.lat.toFixed(4), input.lon.toFixed(4), input.tzMinutes].join('|');
    const { error } = await auth.sb.from('kundalis').upsert(
      { user_id: auth.user.id, name: input.name || null, birth: input, birth_key: birthKey },
      { onConflict: 'user_id,birth_key' }
    );
    saved = !error;
    if (error) console.error('save failed', error.message);
  }
  return res.status(200).json({ ...report, saved });
};
