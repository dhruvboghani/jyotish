// Daily job (Vercel Cron, see vercel.json): e-mails / WhatsApps each member the events of tomorrow
// (festivals and vrats they picked) and transit alerts one week ahead.
// Needs SUPABASE_SECRET_KEY (server only) to read all members' settings, plus:
//   e-mail:   RESEND_API_KEY and EMAIL_FROM (e.g. "Kundali Ganit <reminders@yourdomain.com>")
//   WhatsApp: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID and an approved template WHATSAPP_TEMPLATE with one {{1}} text variable
// Vercel calls it with "Authorization: Bearer $CRON_SECRET".
const { adminClient } = require('../lib/server.js');
const { personalEvents } = require('../lib/events.js');
const { translator } = require('../lib/i18n-server.js');

const DAY = 86400000;
const escH = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendEmail(to, subject, html, text) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return 'skipped';
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text }) });
  return r.ok ? 'sent' : 'failed ' + r.status;
}
async function sendWhatsApp(phone, text, lang) {
  const { WHATSAPP_TOKEN: tok, WHATSAPP_PHONE_ID: id, WHATSAPP_TEMPLATE: tpl } = process.env;
  if (!tok || !id || !tpl) return 'skipped';
  const to = String(phone).replace(/[^\d]/g, '');
  if (to.length < 10) return 'bad number';
  const r = await fetch(`https://graph.facebook.com/v20.0/${id}/messages`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: tpl, language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: text.slice(0, 900) }] }] } }) });
  return r.ok ? 'sent' : 'failed ' + r.status;
}

module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || (req.headers.authorization || '') !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorised' });
  const admin = adminClient();
  if (!admin) return res.status(503).json({ error: 'SUPABASE_SECRET_KEY not set' });
  const { data: rows, error } = await admin.from('user_settings').select('user_id, reminders').not('reminders', 'is', null).limit(5000);
  if (error) return res.status(500).json({ error: error.message });
  const site = (process.env.SITE_URL || '').replace(/\/$/, '');
  const now = Date.now(), log = [];
  for (const row of rows || []) {
    const s = row.reminders || {};
    if (!s.email && !s.whatsapp) continue;
    try {
      const tz = (s.city && Number.isFinite(s.city.tz)) ? s.city.tz : 330;
      const dateOf = ms => new Date(ms + tz * 60000).toISOString().slice(0, 10);
      const tomorrow = dateOf(now + DAY), weekAhead = dateOf(now + 7 * DAY);
      const evs = personalEvents(s, now, 8).filter(e => (e.kind !== 'alert' && e.date === tomorrow) || (e.kind === 'alert' && (e.date === weekAhead || e.date === tomorrow)));
      if (!evs.length) continue;
      const { t } = translator(s.lang);
      const lines = evs.map(e => `${e.date} · ${e.title}`);
      const subject = t('rem.mailSubject', { n: evs.length });
      const text = t('rem.mailIntro') + '\n\n' + lines.join('\n') + '\n\n' + site + '/';
      const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#16173B"><p>${escH(t('rem.mailIntro'))}</p><ul>${lines.map(l => `<li>${escH(l)}</li>`).join('')}</ul><p><a href="${escH(site)}/">${escH(t('brand.name'))}</a></p><p style="color:#7A7C9C;font-size:12px">${escH(t('rem.mailFooter'))}</p></div>`;
      if (s.email) {
        const u = await admin.auth.admin.getUserById(row.user_id);
        const email = u.data && u.data.user && u.data.user.email;
        if (email) log.push(['email', await sendEmail(email, subject, html, text)]);
      }
      if (s.whatsapp && s.phone) log.push(['whatsapp', await sendWhatsApp(s.phone, lines.join(' | '), s.lang)]);
    } catch (e) { log.push(['error', e.message]); }
  }
  return res.status(200).json({ users: (rows || []).length, sent: log.filter(x => x[1] === 'sent').length, log: log.slice(0, 50) });
};
