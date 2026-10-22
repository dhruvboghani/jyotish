// Daily job (Vercel Cron, see vercel.json, 18:00 IST): sends each member a browser notification for
// tomorrow's festivals/vrats they picked, and transit alerts one week ahead.
// Needs (server only): SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET.
const { adminClient } = require('../server.js');
const { personalEvents } = require('../events.js');
const { translator } = require('../i18n-server.js');
const push = require('../push.js');
const TD = require('../tithidates.js');

const DAY = 86400000;
const dateIn = (ms, tz) => new Date(ms + (Number.isFinite(tz) ? tz : 330) * 60000).toISOString().slice(0, 10);
// Index of today's session in a sadhana (same rules as the browser tracker), or -1 when none is due today
function sessionIndexToday(r, now) {
  const today = Date.parse(dateIn(now, r.tz_minutes) + 'T00:00:00Z');
  let first = Date.parse(r.start_date + 'T00:00:00Z');
  if (r.cadence === 'weekly') first += ((r.weekday - new Date(first).getUTCDay() + 7) % 7) * DAY;
  const step = (r.cadence === 'weekly' ? 7 : 1) * DAY, k = (today - first) / step;
  return Number.isInteger(k) && k >= 0 && k < r.total ? k : -1;
}
module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.authorization || '') !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorised' });
  const admin = adminClient();
  if (!admin) return res.status(503).json({ error: 'SUPABASE_SECRET_KEY not set' });
  if (!push.configured()) return res.status(503).json({ error: 'No push keys set (VAPID or FCM_SERVICE_ACCOUNT)' });
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
  // Sadhana reminders: a practice scheduled for today that is not ticked yet
  let sadhana = 0;
  const { data: sds } = await admin.from('sadhanas').select('id,user_id,title,cadence,weekday,total,start_date,done_dates,tz_minutes,lang').eq('status', 'active').eq('remind', true).limit(20000);
  const due = {};
  for (const r of sds || []) {
    const i = sessionIndexToday(r, now);
    if (i < 0 || (r.done_dates || []).includes(dateIn(now, r.tz_minutes))) continue;
    (due[r.user_id] = due[r.user_id] || []).push({ r, i });
  }
  for (const [uid, list] of Object.entries(due)) {
    const mine = byUser[uid]; if (!mine) continue;
    const { t, L } = translator(list[0].r.lang);
    const body = list.map(({ r, i }) => t('sd.pushBody', { x: r.title, n: i + 1, t: r.total })).join('\n');
    for (const sub of mine) {
      const res = await push.send(sub, { title: t('sd.pushTitle'), body, url: (L('meta.path') || '/') + 'sadhana/', tag: 'sd-' + dateIn(now, list[0].r.tz_minutes), lang: list[0].r.lang });
      if (res === 'sent') { sent++; sadhana++; }
      if (res === 'gone') { gone++; await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); }
    }
  }
  // Tithi reminders: Hindu (tithi) birthdays of saved Kundalis and added people, shraddha of ancestors — tomorrow
  let tithiSent = 0;
  const tithiUsers = (rows || []).filter(r => r.reminders && r.reminders.tithi && r.reminders.tithi.remind && byUser[r.user_id]);
  if (tithiUsers.length) {
    const { data: kds } = await admin.from('kundalis').select('user_id,name,birth').in('user_id', tithiUsers.map(r => r.user_id)).limit(20000);
    const kByUser = {};
    (kds || []).forEach(k => (kByUser[k.user_id] = kByUser[k.user_id] || []).push(k));
    for (const row of tithiUsers) {
      try {
        const s = row.reminders, td = s.tithi, c = s.city && Number.isFinite(s.city.lat) ? s.city : { lat: 28.6139, lon: 77.209, tz: 330 };
        const tz = Number.isFinite(c.tz) ? c.tz : 330, tm = new Date(now + tz * 60000 + DAY);
        const day = { y: tm.getUTCFullYear(), m: tm.getUTCMonth() + 1, d: tm.getUTCDate() };
        const { t, L } = translator(s.lang);
        const label = (T, M) => t('td.tithiOf', { m: (L('names.masa') || [])[M], t: (T <= 15 ? L('names.paksha.Shukla') : L('names.paksha.Krishna')) + ' ' + (T === 15 ? L('names.tithi')[14] : T === 30 ? L('names.tithi')[15] : L('names.tithi')[(T - 1) % 15]) });
        const lines = [];
        const people = [...(kByUser[row.user_id] || []).map(k => ({ name: (k.birth && k.birth.name) || k.name || '', birth: k.birth })), ...(td.people || [])];
        for (const p of people) {
          if (!p.birth || !Number.isFinite(p.birth.year)) continue;
          const bt = TD.birthTithi(p.birth);
          if (TD.observedOn(day, bt.tithi, bt.month, 'sunrise', c.lat, c.lon, tz)) lines.push(t('td.pushBirthday', { n: p.name, x: label(bt.tithi, bt.month) }));
        }
        for (const a of td.ancestors || []) {
          if (TD.observedOn(day, a.tithi, a.month, 'aparahna', c.lat, c.lon, tz)) lines.push(t('td.pushShraddha', { n: a.name, x: label(a.tithi, a.month) }));
          else if (TD.observedOn(day, TD.mahalayaTithi(a.tithi), 5, 'aparahna', c.lat, c.lon, tz)) lines.push(t('td.pushMahalaya', { n: a.name }));
        }
        if (!lines.length) continue;
        for (const sub of byUser[row.user_id]) {
          const r = await push.send(sub, { title: t('td.pushTitle'), body: lines.join('\n'), url: (L('meta.path') || '/') + 'tithi-dates/', tag: 'td-' + day.y + day.m + day.d, lang: s.lang });
          if (r === 'sent') { sent++; tithiSent++; }
          if (r === 'gone') { gone++; await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); }
        }
      } catch (e) { }
    }
  }
  return res.status(200).json({ users, sent, sadhana, tithi: tithiSent, removed: gone });
};
