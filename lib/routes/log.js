// POST /api/log { events: [...], token? }  — activity log (page views, tool use, sign-ins, errors)
// Sent with navigator.sendBeacon (text/plain body, so no CORS preflight). The approximate location comes from
// Vercel's edge headers; no IP address is stored. The account is set by the database from the session token.
const { createClient } = require('@supabase/supabase-js');
const { body: readBody, rateLimit } = require('../server.js');

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const hdr = (req, k) => { const v = req.headers[k]; if (!v) return null; try { return decodeURIComponent(String(v)).slice(0, 80); } catch (e) { return String(v).slice(0, 80); } };
const client = token => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false }, ...(token ? { global: { headers: { Authorization: 'Bearer ' + token } } } : {}) });

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 120, key: 'log' })) return;
  if (!URL_ || !KEY) return res.status(204).end();
  const b = readBody(req) || {};
  const events = Array.isArray(b.events) ? b.events.slice(0, 25).filter(e => e && typeof e === 'object' && typeof e.event === 'string') : [];
  if (!events.length) return res.status(204).end();
  const ua = String(req.headers['user-agent'] || '');
  if (/bot|crawl|spider|slurp|preview|headless|lighthouse/i.test(ua)) return res.status(204).end(); // search engines and link previews
  const token = typeof b.token === 'string' && b.token.length < 4000 ? b.token : (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
  const args = { p_events: events, p_country: hdr(req, 'x-vercel-ip-country'), p_region: hdr(req, 'x-vercel-ip-country-region'), p_city: hdr(req, 'x-vercel-ip-city') };
  try {
    let { error } = await client(token).rpc('log_activity', args);
    if (error && token) ({ error } = await client(null).rpc('log_activity', args)); // expired session: still keep the event, without the account
    if (error) console.warn('log_activity', error.message);
  } catch (e) { console.warn('log_activity', e.message); }
  return res.status(204).end();
};
