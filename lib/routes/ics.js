// GET /api/ics?t=FEED_TOKEN — private calendar feed (subscribe in Google Calendar / iPhone / Outlook).
// Festivals and vrats the member picked, for their city, plus transit/dasha alerts for their chart,
// each with a reminder the evening before.
const { anonClient, rateLimit } = require('../server.js');
const { personalEvents } = require('../events.js');

const esc = s => String(s).replace(/[\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
const fold = line => { const out = []; let s = line; while (Buffer.byteLength(s) > 74) { let n = 74; while (Buffer.byteLength(s.slice(0, n)) > 74) n--; out.push(s.slice(0, n)); s = ' ' + s.slice(n); } out.push(s); return out.join('\r\n'); };

module.exports = async (req, res) => {
  if (!rateLimit(req, res, { limit: 30, key: 'ics' })) return;
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const tok = String(q.t || '');
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(tok)) return res.status(400).send('Invalid feed link');
  const sb = anonClient();
  if (!sb) return res.status(503).send('Not configured');
  const { data, error } = await sb.rpc('get_feed', { feed: tok });
  const settings = Array.isArray(data) ? data[0] && data[0].reminders : data && data.reminders;
  if (error || !settings) return res.status(404).send('Feed not found');
  const now = Date.now();
  const events = personalEvents(settings, now - 7 * 86400000, 400);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kundali Ganit//Reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + esc('Kundali Ganit'), 'X-PUBLISHED-TTL:PT12H', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H'];
  for (const e of events) {
    const d = e.date.replace(/-/g, ''), next = new Date(Date.parse(e.date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10).replace(/-/g, '');
    lines.push('BEGIN:VEVENT', 'UID:' + esc(e.uid) + '@kundali-ganit', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + next,
      'SUMMARY:' + esc(e.title), 'TRANSP:TRANSPARENT', 'CATEGORIES:' + esc(e.kind),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(e.title), 'TRIGGER:-PT6H', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="kundali-ganit.ics"');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=21600');
  return res.status(200).send(lines.map(fold).join('\r\n') + '\r\n');
};
