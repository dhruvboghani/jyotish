/* What is special about one day (for the "Special day" reel): festivals and vrats, eclipses, special yogas
   (Sarvartha Siddhi, Guru / Ravi Pushya), planets changing sign or turning retrograde / direct, the Moon's sign change,
   Bhadra (Vishti karana), Panchak (Moon in Kumbha or Meena), Rahu Kaal, Abhijit and signs with Chandrashtama.
   dayInfo(date {y,m,d}, city {lat,lon,tz}) → { p (panchang), events: [{ kind, tone, ... }] }  — tone: good | bad | fest | info */
const J = require('./engine.js');
const P = require('./panchang.js');
const A = require('./astro.js');
const R = require('./rashifal.js');
const SC = require('./social-card.js');

const DAY = 86400000, toJd = ms => ms / DAY + 2440587.5;
// Sarvartha Siddhi Yoga: weekday (0 = Sunday) + nakshatra at sunrise
const SARVARTHA = { 0: [12, 18, 20, 11, 25, 0, 7], 1: [21, 3, 4, 7, 16], 2: [0, 25, 2, 8], 3: [3, 16, 12, 2, 4], 4: [26, 16, 0, 6, 7], 5: [26, 16, 0, 6, 21], 6: [21, 3, 14] };
const PLANETS = ['Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'];

function dayInfo(date, city) {
  const tz = city.tz, p = P.day({ year: date.y, month: date.m, day: date.d, lat: city.lat, lon: city.lon, tzMinutes: tz });
  const d0 = Date.UTC(date.y, date.m - 1, date.d) - tz * 60000, d1 = d0 + DAY, ev = [];
  // festivals and vrats
  SC.festData(date, city, 1).forEach(e => ev.push({ kind: e.kind === 'festival' ? 'festival' : e.kind === 'sankranti' ? 'sankranti' : 'vrat', tone: 'fest', e }));
  // eclipses that peak today
  try { A.eclipses({ fromMs: d0 - DAY, toMs: d1 + DAY, lat: city.lat, lon: city.lon }).filter(x => x.max >= d0 && x.max < d1).forEach(x => ev.push({ kind: 'eclipse', tone: 'bad', x })); } catch (e) { }
  // special yogas at sunrise
  const nak = p.nakshatra[0].index, wd = p.weekday;
  if (nak === 7 && (wd === 4 || wd === 0)) ev.push({ kind: wd === 4 ? 'guruPushya' : 'raviPushya', tone: 'good', until: p.nakshatra[0].end });
  if ((SARVARTHA[wd] || []).includes(nak)) ev.push({ kind: 'sarvartha', tone: 'good', until: p.nakshatra[0].end });
  // planets changing sign today (checked at the day's start and end, IST civil day)
  const lon0 = J.transit(toJd(d0)).lon, lon1 = J.transit(toJd(d1)).lon;
  const hasSank = ev.some(x => x.kind === 'sankranti'); // the Sun's sign change is already the Sankranti
  PLANETS.forEach(pl => { const s0 = Math.floor(lon0[pl] / 30), s1 = Math.floor(lon1[pl] / 30); if (s0 !== s1 && !(pl === 'Sun' && hasSank)) ev.push({ kind: 'ingress', tone: 'info', planet: pl, sign: s1 }); });
  // retrograde / direct stations today
  try { A.stations({ fromMs: d0, toMs: d1 }).filter(s => !s.current && s.at >= d0 && s.at < d1).forEach(s => ev.push({ kind: /retro/i.test(s.kind) ? 'retro' : 'direct', tone: /retro/i.test(s.kind) ? 'bad' : 'good', planet: s.planet, sign: s.sign })); } catch (e) { }
  if (p.moonSignChange) ev.push({ kind: 'moonSign', tone: 'info', sign: (p.moonSign + 1) % 12, at: p.moonSignChange });
  // Bhadra: Vishti karana windows that touch the day (sunrise → next sunrise)
  const ks = p.karana || [];
  ks.forEach((k, i) => { if (k.name === 'Vishti') { const start = i ? ks[i - 1].end : p.sunrise, end = k.end; if (end > p.sunrise && start < p.nextSunrise) ev.push({ kind: 'bhadra', tone: 'bad', start: Math.max(start, p.sunrise), end: Math.min(end, p.nextSunrise) }); } });
  // Panchak: Moon in Kumbha or Meena
  const moonEnd = p.moonSignChange || null;
  if (p.moonSign === 10 || p.moonSign === 11) ev.push({ kind: 'panchak', tone: 'bad', until: (p.moonSign === 11 && moonEnd) ? moonEnd : null });
  else if (p.moonSignChange && (p.moonSign + 1) % 12 === 10) ev.push({ kind: 'panchak', tone: 'bad', from: moonEnd });
  // the daily windows
  ev.push({ kind: 'rahu', tone: 'bad', start: p.rahuKaal.start, end: p.rahuKaal.end });
  if (p.abhijit) ev.push({ kind: 'abhijit', tone: 'good', start: p.abhijit.start, end: p.abhijit.end });
  const ch = R.forDate(Date.UTC(date.y, date.m - 1, date.d, 0, 30)).signs.filter(s => s.chandrashtama).map(s => s.sign);
  if (ch.length) ev.push({ kind: 'chandrashtama', tone: 'bad', signs: ch });
  return { p, events: ev };
}
// The day's best 3–4 muhurats: the festival's own puja window first (and Diwali's Sthir lagna, Karwa Chauth's moonrise),
// then the best Amrit / Labh / Shubh choghadiya slots that keep clear of Rahu Kaal, then Abhijit. Sorted by time after the puja window.
function bestMuhurats(date, city, D) {
  D = D || dayInfo(date, city);
  const FG = require('./festguide.js'), p = D.p, out = [];
  const rahu = p.rahuKaal, overlap = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  for (const ev of D.events.filter(e => e.kind === 'festival' && FG.GUIDES[e.e.id])) {
    try {
      const g = FG.guide(ev.e.id, { year: date.y, lat: city.lat, lon: city.lon, tzMinutes: city.tz }), gg = Array.isArray(g) ? g.find(x => x.date === ev.e.date) : g;
      if (!gg || !gg.main) continue;
      out.push({ kind: 'puja', fest: ev.e, win: gg.kind, start: gg.main.start, end: gg.main.end, top: 1 });
      if (gg.sthir) out.push({ kind: 'sthir', fest: ev.e, start: gg.sthir.start, end: gg.sthir.end, top: 2 });
      if (gg.moonrise) out.push({ kind: 'moonrise', fest: ev.e, start: gg.moonrise, end: null, top: 2 });
    } catch (e) { }
  }
  const dayEnd = Date.UTC(date.y, date.m - 1, date.d + 1) - city.tz * 60000; // local midnight
  const RANK = { Amrit: 3, Labh: 2, Shubh: 1 };
  const ch = (p.choghadiya || []).filter(c => RANK[c.name] && c.start < dayEnd && c.end > p.sunrise && overlap(c, rahu) < (c.end - c.start) / 2)
    .sort((a, b) => RANK[b.name] - RANK[a.name] || a.start - b.start);
  const room = Math.max(0, 4 - out.length - (p.abhijit ? 1 : 0));
  ch.slice(0, Math.max(room, out.length ? 2 : 3)).forEach(c => out.push({ kind: 'chogh', name: c.name, start: c.start, end: Math.min(c.end, dayEnd) }));
  if (p.abhijit && out.length < 5) out.push({ kind: 'abhijit', start: p.abhijit.start, end: p.abhijit.end });
  const head = out.filter(m => m.top).sort((a, b) => a.top - b.top), rest = out.filter(m => !m.top).sort((a, b) => a.start - b.start);
  return { list: head.concat(rest).slice(0, 4), avoid: rahu, hasFest: D.events.some(e => e.kind === 'festival' || e.kind === 'vrat' || e.kind === 'sankranti') };
}
module.exports = { dayInfo, bestMuhurats };
