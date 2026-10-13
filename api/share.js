// POST /api/share { birth… }  (members) → { token }        create a private share link
// GET  /api/share?t=TOKEN                → full report      anyone with the link can view
// DELETE /api/share?t=TOKEN (members)    → revoke
const crypto = require('crypto');
const { validate, clean, full } = require('../lib/report.js');
const { userFromReq, anonClient, body: readBody, rateLimit } = require('../lib/server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  if (req.method === 'GET') {
    if (!rateLimit(req, res, { limit: 60, key: 'share-get' })) return;
    const t = String(q.t || '');
    if (!/^[A-Za-z0-9_-]{16,40}$/.test(t)) return res.status(400).json({ error: 'Invalid link' });
    const sb = anonClient();
    if (!sb) return res.status(503).json({ error: 'Sharing is not configured' });
    const { data, error } = await sb.rpc('get_shared_kundali', { share_token: t });
    if (error) return res.status(500).json({ error: error.message });
    const birth = Array.isArray(data) ? data[0] && data[0].birth : data && data.birth;
    if (!birth) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ ...full(clean(birth)), shared: true });
  }
  if (!rateLimit(req, res, { limit: 20, key: 'share-post' })) return;
  const auth = await userFromReq(req);
  if (!auth.user) return res.status(401).json({ error: 'login_required' });
  if (req.method === 'DELETE') {
    const { error } = await auth.sb.from('kundali_shares').update({ revoked: true }).eq('token', String(q.t || '')).eq('user_id', auth.user.id);
    return error ? res.status(500).json({ error: error.message }) : res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST, DELETE'); return res.status(405).json({ error: 'Method not allowed' }); }
  const b = readBody(req);
  const problem = validate(b);
  if (problem) return res.status(400).json({ error: problem });
  const birth = clean(b);
  // Reuse an existing live link for the same birth
  const key = [birth.year, birth.month, birth.day, birth.hour, birth.minute, birth.lat.toFixed(4), birth.lon.toFixed(4), birth.tzMinutes].join('|');
  const existing = await auth.sb.from('kundali_shares').select('token').eq('user_id', auth.user.id).eq('birth_key', key).eq('revoked', false).limit(1);
  if (existing.data && existing.data[0]) return res.status(200).json({ token: existing.data[0].token });
  const token = crypto.randomBytes(15).toString('base64url');
  const { error } = await auth.sb.from('kundali_shares').insert({ token, user_id: auth.user.id, birth, birth_key: key });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ token });
};
