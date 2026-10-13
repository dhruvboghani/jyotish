// POST /api/signup { email, password, name, lang }
// Creates an account that is already confirmed (no verification email), so the browser can log in at once.
// Needs SUPABASE_SECRET_KEY in Vercel (server only). Without it this returns 503 and the browser falls back
// to normal Supabase sign-up, which follows the "Confirm email" setting in the Supabase dashboard.
const { adminClient, body: readBody, rateLimit } = require('../lib/server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 8, windowMs: 10 * 60000, key: 'signup' })) return;
  const admin = adminClient();
  if (!admin) return res.status(503).json({ error: 'not_configured' });
  const b = readBody(req) || {};
  const email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return res.status(400).json({ error: 'invalid_email' });
  if (password.length < 6 || password.length > 72) return res.status(400).json({ error: 'weak_password' });
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
