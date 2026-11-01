// Morning brief (Vercel Cron, 06:00 IST): for each member who turned it on — today's tithi, nakshatra and Rahu Kaal
// for their city, their own day rating (Self or alert chart) and the remedy of the day. Same push channels as reminders.
const J = require('../engine.js');
const P = require('../panchang.js');
const PS = require('../personal.js');
const { cronClient } = require('../server.js');
const { translator } = require('../i18n-server.js');
const push = require('../push.js');

const VARA_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
const fmt = (ms, tz) => { const d = new Date(ms + tz * 60000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };

function brief(s, birth, now) {
  const { t, L } = translator(s.lang);
  const c = s.city && Number.isFinite(s.city.lat) ? s.city : { lat: 28.6139, lon: 77.209, tz: 330 };
  const tz = Number.isFinite(c.tz) ? c.tz : 330, d = new Date(now + tz * 60000);
  const p = P.day({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), lat: c.lat, lon: c.lon, tzMinutes: tz });
  if (p.polar) return null;
  const ti = p.tithi[0].index, tithi = (ti < 15 ? L('names.paksha.Shukla') : L('names.paksha.Krishna')) + ' ' + (ti === 14 ? L('names.tithi')[14] : ti === 29 ? L('names.tithi')[15] : L('names.tithi')[ti % 15]);
  const lines = [t('mb.line1', { t: tithi, n: L('names.nak')[p.nakshatra[0].index] }), t('mb.rahu', { a: fmt(p.rahuKaal.start, tz), b: fmt(p.rahuKaal.end, tz) })];
  if (birth && Number.isFinite(birth.year)) {
    try { const day = PS.personalDay(J.compute(birth), now); lines.push(t('mb.day', { s: '★'.repeat(day.stars) + '☆'.repeat(5 - day.stars), n: (birth.name || '').split(' ')[0] })); } catch (e) { }
  }
  const lord = VARA_LORD[p.weekday];
  lines.push(t('mb.remedy', { m: (L('names.mantra') || {})[lord] || '' }));
  return { title: t('mb.title', { d: L('names.vara')[p.weekday].split(' ')[0] }), body: lines.join('\n'), url: (L('meta.path') || '/') + 'today/', tag: 'mb-' + d.toISOString().slice(0, 10), lang: s.lang };
}

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.authorization || '') !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorised' });
  // Daily Instagram / Facebook post runs alongside the push briefs (lib/social-post.js); its result is added to the reply
  const social = require('../social-post.js').run().catch(e => ({ error: e.message }));
  const out = await briefs().catch(e => ({ status: 500, body: { error: e.message } }));
  return res.status(out.status).json({ ...out.body, social: await social });
};
async function briefs() {
  const admin = await cronClient();
  if (!admin) return { status: 503, body: { error: 'Set SUPABASE_SECRET_KEY or CRON_DB_SECRET' } };
  if (!push.configured()) return { status: 503, body: { error: 'No push keys set' } };
  const [{ data: subs }, { data: rows }] = await Promise.all([
    admin.from('push_subscriptions').select('endpoint,user_id,p256dh,auth,lang').limit(20000),
    admin.from('user_settings').select('user_id, reminders').not('reminders', 'is', null).limit(10000)
  ]);
  const byUser = {}; (subs || []).forEach(s => (byUser[s.user_id] = byUser[s.user_id] || []).push(s));
  const want = (rows || []).filter(r => r.reminders && r.reminders.brief && byUser[r.user_id]);
  const selfs = {};
  if (want.length) {
    const { data: kds } = await admin.from('kundalis').select('user_id,birth,relation').in('user_id', want.map(r => r.user_id)).eq('relation', 'self').limit(20000);
    (kds || []).forEach(k => { selfs[k.user_id] = k.birth; });
  }
  const now = Date.now(); let sent = 0, gone = 0;
  for (const row of want) {
    try {
      const msg = brief(row.reminders, selfs[row.user_id] || row.reminders.alertBirth, now); if (!msg) continue;
      for (const sub of byUser[row.user_id]) {
        const r = await push.send(sub, msg);
        if (r === 'sent') sent++;
        if (r === 'gone') { gone++; await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); }
      }
    } catch (e) { }
  }
  return { status: 200, body: { users: want.length, sent, removed: gone } };
}
module.exports.brief = brief;
