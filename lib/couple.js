/* Couple's month ahead: the next 30 days for two people together.
   Each day: Tara bala (the day's nakshatra counted from each birth nakshatra) and Chandra bala (the Moon's sign
   counted from each Moon sign). Days good for both are the best days to plan things together; days bad for both are tense.
   Plus each person's running dasha and where Jupiter, Saturn and Venus are transiting from their Moon. */
const J = require('./engine.js');
const { GOCHAR_GOOD } = require('./analysis.js');

const TARA_GOOD = [2, 4, 6, 8, 9], TARA_BAD = [3, 5, 7];
const CH_GOOD = [1, 3, 6, 7, 10, 11], CH_BAD = [4, 8, 12];
const DAY = 864e5;

function dayFor(p, nak, moonSign) {
  const tara = ((nak - p.nak + 27) % 27) % 9 + 1, ch = (moonSign - p.moonSign + 12) % 12 + 1;
  const pts = (TARA_GOOD.includes(tara) ? 1 : TARA_BAD.includes(tara) ? -1 : 0) + (CH_GOOD.includes(ch) ? 1 : CH_BAD.includes(ch) ? -1.2 : 0);
  return { tara, ch, tone: pts >= 1.5 ? 'good' : pts <= -1 ? 'bad' : 'mixed' };
}

function monthAhead(a, b, opts = {}) {
  const now = opts.nowMs || Date.now(), tz = opts.tzMinutes != null ? opts.tzMinutes : 330;
  const people = [a, b].map(c => ({ nak: c.P.Moon.nak, moonSign: c.P.Moon.sign }));
  // Local noon each day
  const local0 = new Date(now + tz * 6e4); const base = Date.UTC(local0.getUTCFullYear(), local0.getUTCMonth(), local0.getUTCDate(), 12) - tz * 6e4;
  const days = [];
  for (let d = 0; d < 30; d++) {
    const ms = base + d * DAY, lon = J.transit(ms / DAY + 2440587.5).lon, nak = Math.floor(lon.Moon / (360 / 27)), ms_ = Math.floor(lon.Moon / 30);
    const per = people.map(p => dayFor(p, nak, ms_));
    const tone = per.every(x => x.tone === 'good') ? 'both' : per.every(x => x.tone === 'bad') ? 'tense' : per.some(x => x.tone === 'bad') ? 'one' : 'ok';
    days.push({ ms, nak, moonSign: ms_, per, tone });
  }
  const tr = J.transit(now / DAY + 2440587.5).lon;
  const info = [a, b].map(c => {
    const md = c.dashas.find(m => m.start <= now && now < m.end), ad = md && md.sub.find(x => x.start <= now && now < x.end);
    const next = md && ad && ad.end < now + 60 * DAY ? (md.sub[md.sub.indexOf(ad) + 1] || null) : null;
    const from = p => { const h = (Math.floor(tr[p] / 30) - c.P.Moon.sign + 12) % 12 + 1; return { h, good: GOCHAR_GOOD[p].includes(h) }; };
    return { md: md && md.lord, ad: ad && ad.lord, adEnd: ad && ad.end, next: next && { lord: next.lord, start: next.start }, jup: from('Jupiter'), sat: from('Saturn'), ven: from('Venus') };
  });
  return { days, info, both: days.filter(d => d.tone === 'both').length, tense: days.filter(d => d.tone === 'tense').length };
}

module.exports = { monthAhead };
