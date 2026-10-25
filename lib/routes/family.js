// POST /api/family { births: [ {birth…, id?, relation?} ] }  — members only
// One line per family member: running dasha, Sade Sati, today's personal rating and the next big changes.
const J = require('../engine.js');
const V = require('../varga.js');
const PS = require('../personal.js');
const TR = require('../transits.js');
const TD = require('../tithidates.js');
const { validate, clean } = require('../report.js');
const { userFromReq, body: readBody, rateLimit } = require('../server.js');

const DAY = 86400000;
function sade(nowMs, moonSign) {
  // phase now + next start within 30 years (scan every 15 days)
  const jd0 = nowMs / DAY + 2440587.5;
  const inZone = jd => { const rel = (Math.floor(J.transit(jd).lon.Saturn / 30) - moonSign + 12) % 12; return rel === 11 || rel === 0 || rel === 1 ? rel : -1; };
  const cur = inZone(jd0);
  let edge = null;
  for (let d = 15; d < 30 * 365; d += 15) { const z = inZone(jd0 + d); if ((cur >= 0) !== (z >= 0)) { edge = Math.round((jd0 + d - 2440587.5) * DAY); break; } }
  return { phase: cur === 11 ? 'rising' : cur === 0 ? 'peak' : cur === 1 ? 'setting' : null, until: cur >= 0 ? edge : null, next: cur < 0 ? edge : null };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Use POST' }); }
  if (!rateLimit(req, res, { limit: 20, key: 'family' })) return;
  const auth = await userFromReq(req);
  if (!auth.user) return res.status(401).json({ error: 'login_required' });
  const b = readBody(req) || {};
  const now = Date.now();
  if (b.timeline) {
    // One year of events for every member: dasha changes, Sade Sati, Saturn/Jupiter sign changes, tithi birthday
    const end = now + 366 * DAY, events = [], city = b.city && Number.isFinite(b.city.lat) ? b.city : null;
    for (const raw of (Array.isArray(b.births) ? b.births.slice(0, 30) : [])) {
      if (validate(raw)) continue;
      const input = clean(raw), r = J.compute(input), who = { id: raw.id || null, name: input.name, relation: input.relation || raw.relation || null };
      for (const md of r.dashas) {
        if (md.start > now && md.start < end) events.push({ ...who, type: 'md', lord: md.lord, at: md.start });
        for (const ad of md.sub) if (ad.start > now && ad.start < end && Math.abs(ad.start - md.start) > DAY) events.push({ ...who, type: 'ad', md: md.lord, lord: ad.lord, at: ad.start });
      }
      for (const e of TR.timeline(r, { nowMs: now, years: 1 })) {
        if (e.current || e.planet === 'Rahu' && !e.phase) continue;
        events.push({ ...who, type: 'transit', planet: e.planet, sign: e.sign, fromMoon: e.fromMoon, good: e.good, phase: e.phase || null, retro: !!e.retro, at: e.at });
      }
      try {
        const tz = city ? city.tz : input.tzMinutes;
        const u = TD.upcoming([{ id: 'x', kind: 'birthday', birth: input }], { lat: city ? city.lat : input.lat, lon: city ? city.lon : input.lon, tzMinutes: tz, nowMs: now })[0];
        if (u.next) events.push({ ...who, type: 'tithiBirthday', tithi: u.tithi, month: u.month, age: u.age, at: Date.UTC(u.next.y, u.next.m - 1, u.next.d) - tz * 60000 + 6 * 3600000 });
      } catch (e) { }
    }
    return res.status(200).json({ at: now, events: events.sort((x, y) => x.at - y.at) });
  }
  const members = [];
  for (const raw of (Array.isArray(b.births) ? b.births.slice(0, 30) : [])) {
    if (validate(raw)) continue;
    const input = clean(raw), r = J.compute(input);
    const md = r.dashas.find(m => m.start <= now && now < m.end), ad = md && md.sub.find(a => a.start <= now && now < a.end);
    const nextAd = md && (md.sub[md.sub.indexOf(ad) + 1] || (r.dashas[r.dashas.indexOf(md) + 1] || {}).sub && r.dashas[r.dashas.indexOf(md) + 1].sub[0]);
    const today = PS.personalDay(r, now);
    const all = V.upcoming(r, now, 120);
    const events = all.filter(e => !(e.type === 'ingress' && e.planet === 'Ketu') && !(e.type === 'ad' && all.some(x => x.type === 'md' && Math.abs(x.at - e.at) < 864e5))).slice(0, 4);
    members.push({
      id: raw.id || null, name: input.name, relation: input.relation || raw.relation || null,
      moonSign: r.P.Moon.sign, nak: r.P.Moon.nak, lagna: r.lagna.sign,
      md: md && { lord: md.lord, end: md.end }, ad: ad && { lord: ad.lord, end: ad.end }, nextAd: nextAd ? { md: nextAd === (md.sub[md.sub.indexOf(ad) + 1]) ? md.lord : r.dashas[r.dashas.indexOf(md) + 1].lord, lord: nextAd.lord, start: nextAd.start } : null,
      sadeSati: sade(now, r.P.Moon.sign), today: { stars: today.stars, area: today.area, tara: today.tara, chandraH: today.chandraH }, events, birth: input
    });
  }
  return res.status(200).json({ at: now, members });
};
