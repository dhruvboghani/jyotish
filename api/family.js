// POST /api/family { births: [ {birth…, id?, relation?} ] }  — members only
// One line per family member: running dasha, Sade Sati, today's personal rating and the next big changes.
const J = require('../lib/engine.js');
const V = require('../lib/varga.js');
const PS = require('../lib/personal.js');
const { validate, clean } = require('../lib/report.js');
const { userFromReq, body: readBody, rateLimit } = require('../lib/server.js');

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
