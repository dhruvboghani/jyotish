// One serverless function for every /api/<name> route (the Vercel Hobby plan allows at most 12 functions).
// Each route's code lives in lib/routes/<name>.js. Routes load lazily, so a request only pays for what it uses.
const ROUTES = {
  kundali: () => require('../lib/routes/kundali.js'),
  panchang: () => require('../lib/routes/panchang.js'),
  calendar: () => require('../lib/routes/calendar.js'),
  rashifal: () => require('../lib/routes/rashifal.js'),
  match: () => require('../lib/routes/match.js'),
  share: () => require('../lib/routes/share.js'),
  signup: () => require('../lib/routes/signup.js'),
  names: () => require('../lib/routes/names.js'),
  muhurta: () => require('../lib/routes/muhurta.js'),
  family: () => require('../lib/routes/family.js'),
  ics: () => require('../lib/routes/ics.js'),
  'cron-reminders': () => require('../lib/routes/cron-reminders.js'),
  'push-test': () => require('../lib/routes/push-test.js')
};

// The Android app (Capacitor) serves its pages from https://localhost and calls this API cross-origin.
const APP_ORIGINS = new Set(['https://localhost', 'http://localhost', 'capacitor://localhost']);
function cors(req, res) {
  const o = req.headers.origin;
  if (!o || !APP_ORIGINS.has(o)) return false;
  res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-KG-Free');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-KG-Free');
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}

module.exports = async (req, res) => {
  if (cors(req, res) && req.method === 'OPTIONS') return res.status(204).end();
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  const name = String(q.fn || new URL(req.url, 'http://x').pathname.split('/').filter(Boolean)[1] || '');
  const load = Object.prototype.hasOwnProperty.call(ROUTES, name) && ROUTES[name];
  if (!load) { res.setHeader('Cache-Control', 'no-store'); return res.status(404).json({ error: 'Not found' }); }
  return load()(req, res);
};
