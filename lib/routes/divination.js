// POST /api/divination
// Saves any divination reading (moles, forehead, signature, thumb, foot, eye, dreamcalc)
// into Supabase for both anonymous visitors (user_id = null) and logged-in users.
const { userFromReq, anonClient, adminClient, body: readBody, rateLimit } = require('../server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 60, key: 'divination' })) return;

  const b = readBody(req);
  if (!b || !b.kind) return res.status(400).json({ error: 'kind_required' });

  const auth = await userFromReq(req);
  const userId = auth && auth.user ? auth.user.id : null;
  const sb = (auth && auth.sb) || adminClient() || anonClient();

  if (!sb) {
    return res.status(200).json({ ok: true, id: 'local-' + Date.now(), saved: false, note: 'db_not_configured' });
  }

  try {
    const { data, error } = await sb.from('divination_readings').insert({
      user_id: userId,
      kind: String(b.kind).slice(0, 40),
      input: b.input || {},
      result: b.result || {}
    }).select('id').single();

    if (error) {
      console.warn('divination_readings insert:', error.message);
      return res.status(200).json({ ok: true, saved: false, error: error.message });
    }

    return res.status(200).json({ ok: true, id: data ? data.id : null, saved: true });
  } catch (err) {
    console.error('divination_readings error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
