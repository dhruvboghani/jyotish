// POST /api/push-test — members: sends a test notification to this account's own browsers.
const { userFromReq, rateLimit } = require('../lib/server.js');
const push = require('../lib/push.js');
const { translator } = require('../lib/i18n-server.js');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 6, key: 'push-test' })) return;
  const auth = await userFromReq(req);
  if (!auth.user) return res.status(401).json({ error: 'login_required' });
  if (!push.configured()) return res.status(503).json({ error: 'not_configured' });
  const { data, error } = await auth.sb.from('push_subscriptions').select('endpoint,p256dh,auth,lang').eq('user_id', auth.user.id);
  if (error) return res.status(500).json({ error: error.message });
  let sent = 0;
  for (const row of data || []) {
    const { t } = translator(row.lang);
    const r = await push.send(row, { title: t('brand.name'), body: t('st.pushTestBody'), url: '/', lang: row.lang });
    if (r === 'sent') sent++;
    if (r === 'gone') await auth.sb.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
  }
  return res.status(200).json({ sent, devices: (data || []).length });
};
