// POST /api/tithi  { lat, lon, tz, people: [{ id, kind:'birthday', birth:{…} } | { id, kind:'shraddha', tithi, month } | { id, kind:'death', date:{year,month,day,hour?,minute?} }] }
// → the tithi and month of each, with the next date it falls on at this place (free; no data is stored).
const T = require('../tithidates.js');
const { validate, clean } = require('../report.js');
const { num, body: readBody, rateLimit } = require('../server.js');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 30, key: 'tithi' })) return;
  const b = readBody(req);
  if (!b || !Array.isArray(b.people)) return res.status(400).json({ error: 'Need people[]' });
  const lat = num(b.lat, -66, 66), lon = num(b.lon, -180, 180), tz = num(b.tz, -720, 840);
  if ([lat, lon, tz].some(v => v === null)) return res.status(400).json({ error: 'Need lat (±66), lon, tz (minutes)' });
  const people = [];
  for (const p of b.people.slice(0, 40)) {
    const id = String(p && p.id || '').slice(0, 60);
    if (p && p.kind === 'birthday' && !validate(p.birth)) people.push({ id, kind: 'birthday', birth: clean(p.birth) });
    else if (p && p.kind === 'shraddha' && num(p.tithi, 1, 30) && num(p.month, 0, 11) !== null) people.push({ id, kind: 'shraddha', tithi: p.tithi, month: p.month });
    else if (p && p.kind === 'death' && p.date && num(p.date.year, 1800, 2200) && num(p.date.month, 1, 12) && num(p.date.day, 1, 31)) {
      const dt = T.deathTithi({ year: p.date.year, month: p.date.month, day: p.date.day, hour: num(p.date.hour, 0, 23) ?? 12, minute: num(p.date.minute, 0, 59) ?? 0, tzMinutes: tz });
      people.push({ id, kind: 'shraddha', tithi: dt.tithi, month: dt.month, fromDate: true });
    }
  }
  const out = T.upcoming(people, { lat, lon, tzMinutes: tz });
  out.forEach((o, i) => { if (people[i].fromDate) o.fromDate = true; });
  return res.status(200).json({ people: out });
};
