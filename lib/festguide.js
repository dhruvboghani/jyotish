/* Puja guides: the festival's date in a city (from the festival calendar) and its puja muhurta.
   Windows: pradosh (sunset → +2 h 24 m), nishita (midnight ± 24 m), madhyahna (3rd fifth of the day),
   aparahna (4th fifth), morning (sunrise → +2 h 24 m). Diwali also gets the Sthir (Vrishabha) lagna inside pradosh;
   Karwa Chauth gets moonrise; Shivaratri gets the four night prahars. */
const J = require('./engine.js');
const P = require('./panchang.js');
const A = require('./astro.js');

const DAY = 86400000;
const toMs = jd => Math.round((jd - 2440587.5) * DAY), toJd = ms => ms / DAY + 2440587.5;
const GUIDES = {
  diwali: 'diwaliLagna', dhanteras: 'pradosh', ganeshChaturthi: 'madhyahna', janmashtami: 'nishita', mahaShivaratri: 'prahar',
  navratri: 'morning', holikaDahan: 'pradosh', rakshaBandhan: 'aparahna', karwaChauth: 'moonrise', ramNavami: 'madhyahna',
  hanumanJayanti: 'morning', dussehra: 'aparahna', sharadPurnima: 'nishita', vasantPanchami: 'morning'
};

function window(kind, y, m, d, lat, lon, tz) {
  const st = P.sunTimes(y, m, d, lat, lon, tz), nx = new Date(Date.UTC(y, m - 1, d + 1));
  const st2 = P.sunTimes(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate(), lat, lon, tz);
  if (st.rise == null) return null;
  const len = st.set - st.rise, night = st2.rise - st.set, w = (a, b) => ({ start: toMs(a), end: toMs(b) });
  switch (kind) {
    case 'pradosh': return { main: w(st.set, st.set + 144 / 1440) };
    case 'nishita': { const mid = (st.set + st2.rise) / 2; return { main: w(mid - 24 / 1440, mid + 24 / 1440) }; }
    case 'madhyahna': return { main: w(st.rise + len * 0.4, st.rise + len * 0.6) };
    case 'aparahna': return { main: w(st.rise + len * 0.6, st.rise + len * 0.8) };
    case 'morning': return { main: w(st.rise, st.rise + 144 / 1440) };
    case 'prahar': return { main: w(st.set, st2.rise), prahars: [0, 1, 2, 3].map(i => w(st.set + night * i / 4, st.set + night * (i + 1) / 4)) };
    case 'moonrise': { const mr = A.moonEvents({ year: y, month: m, day: d, lat, lon, tzMinutes: tz }); return { main: w(st.set, st.set + 144 / 1440), moonrise: mr.rise }; }
    case 'diwaliLagna': {
      // Vrishabha (fixed) lagna rising during the evening
      const ay = jd => J.lahiri(jd + 69 / 86400), lag = jd => Math.floor(J.norm(J.ascendant(jd, lat, lon).asc - ay(jd)) / 30);
      let a = null, b = null;
      for (let jd = st.set - 2 / 24; jd < st.set + 6 / 24; jd += 1 / 1440) { const isT = lag(jd) === 1; if (isT && a == null) a = jd; if (!isT && a != null && b == null) b = jd; }
      return { main: w(st.set, st.set + 144 / 1440), sthir: a != null ? w(a, b || a + 2 / 24) : null };
    }
  }
  return null;
}

function guide(id, { year, lat, lon, tzMinutes }) {
  if (!GUIDES[id]) return null;
  const evs = [year, year + 1].flatMap(y => P.calendar({ year: y, lat, lon, tzMinutes }).filter(e => e.kind === 'festival' && e.id === id));
  return evs.map(e => { const [y, m, d] = e.date.split('-').map(Number); return { date: e.date, kind: GUIDES[id], ...window(GUIDES[id], y, m, d, lat, lon, tzMinutes) }; });
}

module.exports = { guide, GUIDES };
