// POST /api/face: Saves a face selfie reading (base64 photo + features + report) into Supabase
const { userFromReq, anonClient, adminClient, body: readBody, rateLimit } = require('../server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 30, key: 'face' })) return;

  const b = readBody(req);
  if (!b || !b.photo_base64) return res.status(400).json({ error: 'photo_required' });

  // Cap photo_base64 to 700 KB to keep database lean and prevent abuse
  const photo = String(b.photo_base64);
  if (photo.length > 700000) return res.status(413).json({ error: 'photo_too_large' });

  const auth = await userFromReq(req);
  const userId = auth && auth.user ? auth.user.id : null;
  const sb = (auth && auth.sb) || adminClient() || anonClient();

  if (!sb) {
    return res.status(200).json({ ok: true, id: 'local-' + Date.now(), saved: false, note: 'db_not_configured' });
  }

  try {
    const { data, error } = await sb.from('face_readings').insert({
      user_id: userId,
      photo_base64: photo,
      features: b.features || {},
      report: b.report || {}
    }).select('id').single();

    if (error) {
      console.warn('face_readings insert:', error.message);
      return res.status(200).json({ ok: true, saved: false, error: error.message });
    }

    return res.status(200).json({ ok: true, id: data ? data.id : null, saved: true });
  } catch (err) {
    console.error('face_readings error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
