// POST /api/kundali
// - Logged in: full report + members-only sections; saved to "My Kundalis" and history.
// - Not logged in: the basic report (no members-only sections) for any birth.
const { validate, clean, full } = require('../report.js');
const { userFromReq, body: readBody, rateLimit } = require('../server.js');

const birthKeyOf = i => [i.year, i.month, i.day, i.hour, i.minute, i.lat.toFixed(4), i.lon.toFixed(4), i.tzMinutes].join('|');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 40, key: 'kundali' })) return;
  const body = readBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });
  const problem = validate(body);
  if (problem) return res.status(400).json({ error: problem });
  const input = clean(body);

  const auth = await userFromReq(req);
  // Not logged in: the basic report (members-only sections stay locked), for any birth and as many times as wanted
  if (!auth.user) return res.status(200).json({ ...full(input), basic: true });

  // Members: one more city for "Best city for you" → { relocate: { lat, lon } }
  if (body.relocate) {
    const lat = Number(body.relocate.lat), lon = Number(body.relocate.lon);
    if (!(Math.abs(lat) <= 66 && Math.abs(lon) <= 180)) return res.status(400).json({ error: 'Invalid place' });
    const J = require('../engine.js'), RL = require('../relocate.js');
    return res.status(200).json(RL.at(J.compute(input).utMs, lat, lon));
  }
  const report = full(input, { premium: true });
  let saved = false, logged = false;
  if (body.save !== false) {
    const row = { user_id: auth.user.id, name: input.name || null, birth: input, birth_key: birthKeyOf(input) };
    if (input.relation) row.relation = input.relation;
    let { error } = await auth.sb.from('kundalis').upsert(row, { onConflict: 'user_id,birth_key' });
    if (error && /relation/.test(error.message)) { delete row.relation; ({ error } = await auth.sb.from('kundalis').upsert(row, { onConflict: 'user_id,birth_key' })); }
    saved = !error;
    if (error) console.error('save failed', error.message);
  }
  if (body.log === true) {
    const c = report.chart, moon = c.planets.find(p => p.name === 'Moon');
    const { error } = await auth.sb.from('kundali_history').insert({
      user_id: auth.user.id, name: input.name || null, birth: input,
      summary: { lagna: c.lagna.sign, moon: moon.sign, nak: moon.nak, pada: moon.pada },
      lang: String(body.lang || '').slice(0, 5) || null
    });
    logged = !error;
    if (error) console.error('history failed', error.message);
  }
  return res.status(200).json({ ...report, saved, logged });
};
