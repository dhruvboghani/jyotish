// Daily job (Vercel Cron, see vercel.json, 18:00 IST): sends each member a browser notification for
// tomorrow's festivals/vrats they picked, and transit alerts one week ahead.
// Needs (server only): SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET.
const { adminClient } = require('../lib/server.js');
const { personalEvents } = require('../lib/events.js');
const { translator } = require('../lib/i18n-server.js');
const push = require('../lib/push.js');

const DAY = 86400000;
module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.authorization || '') !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorised' });
  const admin = adminClient();
  if (!admin) return res.status(503).json({ error: 'SUPABASE_SECRET_KEY not set' });
  if (!push.configured()) return res.status(503).json({ error: 'VAPID keys not set' });
  const [{ data: subs, error: e1 }, { data: rows, error: e2 }] = await Promise.all([
    admin.from('push_subscriptions').select('endpoint,user_id,p256dh,auth,lang').limit(20000),
    admin.from('user_settings').select('user_id, reminders').not('reminders', 'is', null).limit(10000)
  ]);
  if (e1 || e2) return res.status(500).json({ error: (e1 || e2).message });
  const byUser = {};
  (subs || []).forEach(s => (byUser[s.user_id] = byUser[s.user_id] || []).push(s));
  const now = Date.now(); let sent = 0, gone = 0, users = 0;
  for (const row of rows || []) {
    const s = row.reminders || {}, mine = byUser[row.user_id];
    if (!s.push || !mine) continue;
    try {
      const tz = (s.city && Number.isFinite(s.city.tz)) ? s.city.tz : 330;
      const dateOf = ms => new Date(ms + tz * 60000).toISOString().slice(0, 10);
      const tomorrow = dateOf(now + DAY), weekAhead = dateOf(now + 7 * DAY);
      const evs = personalEvents(s, now, 8).filter(e => (e.kind !== 'alert' && e.date === tomorrow) || (e.kind === 'alert' && (e.date === weekAhead || e.date === tomorrow)));
      if (!evs.length) continue;
      users++;
      const { t } = translator(s.lang);
      const tom = evs.filter(e => e.date === tomorrow), later = evs.filter(e => e.date !== tomorrow);
      const body = [tom.length ? t('rem.tomorrow') + ': ' + tom.map(e => e.title).join(', ') : '', later.length ? t('rem.nextWeek') + ': ' + later.map(e => e.title).join(', ') : ''].filter(Boolean).join('\n');
      for (const sub of mine) {
        const r = await push.send(sub, { title: t('rem.pushTitle'), body, url: '/calendar/', tag: 'kg-' + tomorrow, lang: s.lang });
        if (r === 'sent') sent++;
        if (r === 'gone') { gone++; await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); }
      }
    } catch (e) { }
  }
  return res.status(200).json({ users, sent, removed: gone });
};
