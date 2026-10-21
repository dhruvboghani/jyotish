/* Offline calculations for the Grahavani app: the server's own route code, run on the phone.
   Built by mobile/build-app.js with esbuild (lib/server.js is swapped for offline-server-shim.js).
   window.GV_OFFLINE.handle(path, { method, body, headers }) → { status, data, trialToken } or null when a route needs the internet. */
const { validate, clean, preview, full } = require('../../lib/report.js');
const ROUTES = {
  panchang: require('../../lib/routes/panchang.js'),
  calendar: require('../../lib/routes/calendar.js'),
  rashifal: require('../../lib/routes/rashifal.js'),
  match: require('../../lib/routes/match.js'),
  names: require('../../lib/routes/names.js'),
  muhurta: require('../../lib/routes/muhurta.js'),
  family: require('../../lib/routes/family.js')
};
const birthKeyOf = i => [i.year, i.month, i.day, i.hour, i.minute, i.lat.toFixed(4), i.lon.toFixed(4), i.tzMinutes].join('|');

// Same rules as lib/routes/kundali.js; the free-trial marker is the birth key itself on the phone.
function kundali(b, headers) {
  const problem = validate(b);
  if (problem) return { status: 400, data: { error: problem } };
  const input = clean(b), key = birthKeyOf(input);
  if (headers.Authorization) return { status: 200, data: { ...full(input, { premium: true }), saved: false, logged: false, offline: true } };
  const used = String(headers['X-KG-Free'] || '');
  const mine = 'local:' + key;
  if (!used || used === mine) return { status: 200, data: { ...full(input), trial: true, offline: true }, trialToken: used ? null : mine };
  // Any other marker (a different local chart, or a signed one from the server) means the free chart was used
  return { status: 200, data: { ...preview(input), reason: 'trial_used', offline: true } };
}

function run(handler, path, opts) {
  const url = new URL(path, 'https://localhost');
  const req = { method: opts.method || 'GET', url: url.pathname + url.search, query: Object.fromEntries(url.searchParams), headers: Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v])), body: opts.body };
  return new Promise(resolve => {
    let status = 200;
    const res = { setHeader() { return res; }, status(c) { status = c; return res; }, json(d) { resolve({ status, data: d }); return res; }, send(d) { resolve({ status, data: d }); return res; }, end() { resolve({ status, data: null }); return res; } };
    Promise.resolve(handler(req, res)).catch(e => resolve({ status: 500, data: { error: e.message } }));
  });
}

window.GV_OFFLINE = {
  async handle(path, opts = {}) {
    const name = (path.match(/^\/api\/([a-z-]+)/) || [])[1];
    if (name === 'kundali') { let b = opts.body; try { b = typeof b === 'string' ? JSON.parse(b) : b; } catch (e) { b = null; } return b ? kundali(b, opts.headers || {}) : { status: 400, data: { error: 'Invalid JSON' } }; }
    if (ROUTES[name]) return run(ROUTES[name], path, opts);
    return null; // signup, share, ics, push-test need the server
  },
  // Used by the app layer for the home-screen widget
  panchangDay: q => require('../../lib/panchang.js').day(q)
};
