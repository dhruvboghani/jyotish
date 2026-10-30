// POST /api/signup { email, password, name, lang }
// Creates an account that is already confirmed (no verification email), so the browser can log in at once.
// Uses SUPABASE_SECRET_KEY when set; otherwise the register_user() database function (supabase/v10_instant_signup.sql)
// guarded by SIGNUP_SECRET. With neither, this returns 503 and the browser falls back to normal Supabase sign-up.
const { adminClient, anonClient, body: readBody, rateLimit } = require('../server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 8, windowMs: 10 * 60000, key: 'signup' })) return;
  const admin = adminClient(), anon = !admin && process.env.SIGNUP_SECRET ? anonClient() : null;
  if (!admin && !anon) return res.status(503).json({ error: 'not_configured' });
  const b = readBody(req) || {};
  const email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return res.status(400).json({ error: 'invalid_email' });
  if (password.length < 6 || password.length > 72) return res.status(400).json({ error: 'weak_password' });
  if (anon) {
    const { data, error } = await anon.rpc('register_user', { p_secret: process.env.SIGNUP_SECRET, p_email: email, p_password: password, p_name: String(b.name || '').trim().slice(0, 80), p_lang: String(b.lang || '').slice(0, 5) });
    if (error) { console.error('register_user', error.message); return res.status(503).json({ error: 'not_configured' }); }
    if (data === 'ok') return res.status(200).json({ ok: true });
    if (data === 'exists') return res.status(409).json({ error: 'exists' });
    if (data === 'invalid_email' || data === 'weak_password') return res.status(400).json({ error: data });
    return res.status(503).json({ error: 'not_configured' });
  }
  const { error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name: String(b.name || '').trim().slice(0, 80), lang: String(b.lang || '').slice(0, 5) }
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return res.status(409).json({ error: 'exists' });
    return res.status(400).json({ error: error.message });
  }
  return res.status(200).json({ ok: true });
};
