/* Search pages: each function returns a page object for lib/site.js render() — title, description, h1, body,
   breadcrumbs, FAQ and extra structured data. Daily pages (city panchang, Rahu Kaal, Choghadiya, sign rashifal)
   are rendered on request by lib/routes/seo.js; everything else is written by build.js.
   All astronomy is locale-independent and memoised, so six languages cost one calculation. */
const S = require('./site.js');
const J = require('./engine.js');
const P = require('./panchang.js');
const A = require('./astro.js');
const R = require('./rashifal.js');
const V = require('./vrat.js');
const M = require('./muhurta.js');
const FG = require('./festguide.js');
const MT = require('./match.js');
const D = require('./seo-data.js');

const { esc, url, list, gimg, SIGN_SLUG } = S;
const DAY = 86400000;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const memo = new Map();
const once = (key, f) => { if (!memo.has(key)) memo.set(key, f()); return memo.get(key); };
const kebab = s => s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const DELHI = { lat: 28.6139, lon: 77.209, tz: 330 };
const PLANETS9 = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const LUCKY_NUM = { Sun: 1, Moon: 2, Jupiter: 3, Rahu: 4, Mercury: 5, Venus: 6, Ketu: 7, Saturn: 8, Mars: 9 };
const WEEKDAY_OF = { Sun: 0, Moon: 1, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Saturn: 6, Rahu: 6, Ketu: 2 };

// ---------- per-language helpers ----------
const HC = {};
function H(lang) { return HC[lang] || (HC[lang] = Hraw(lang)); }
function Hraw(lang) {
  const L = S.ALL[lang], base = L.meta.path;
  const t = (k, p) => S.tr(L, k, p);
  const has = k => k.split('.').reduce((o, x) => (o == null ? undefined : o[x]), L) != null;
  const df = o => new Intl.DateTimeFormat(L.meta.locale, { timeZone: 'UTC', ...o });
  const fLong = df({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), fDate = df({ day: 'numeric', month: 'long', year: 'numeric' });
  const fShort = df({ day: 'numeric', month: 'short', year: 'numeric' }), fDM = df({ day: 'numeric', month: 'short' }), fWd = df({ weekday: 'short' }), fMonth = df({ month: 'long' }), fMonthY = df({ month: 'long', year: 'numeric' });
  const ymd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const time = (ms, tz) => { const x = new Date(ms + tz * 60000); return pad(x.getUTCHours()) + ':' + pad(x.getUTCMinutes()); };
  const local = (ms, tz) => new Date(ms + tz * 60000);
  const range = (r, tz) => r ? `${time(r.start, tz)} – ${time(r.end, tz)}` : '—';
  const tithi = idx => L.names.paksha[idx < 15 ? 'Shukla' : 'Krishna'] + ' ' + (idx === 14 ? L.names.tithi[14] : idx === 29 ? L.names.tithi[15] : L.names.tithi[idx % 15]);
  const rashi = s => L.names.rashi[s], nak = i => L.names.nak[i], gr = p => L.names.graha[p];
  const city = c => c.name[lang] || c.name.en;
  const link = (slug, text, cls = 'tag') => `<a class="${cls}" href="${base}${slug}">${esc(text)}</a>`;
  const stars = n => `<span class="stars" aria-label="${n}/5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
  const faqHtml = faq => faq.length ? `<h2 class="sub-h">${esc(t('seo.faqH'))}</h2><div class="faq">${faq.map((q, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q.q)}<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-chev"/></svg></summary><div class="ans">${esc(q.a)}</div></details>`).join('')}</div>` : '';
  const crumbsHtml = items => `<nav class="crumbs" aria-label="breadcrumb"><a href="${base}">${esc(L.brand.name)}</a>${items.map((c, i) => ' › ' + (i < items.length - 1 && c.slug != null ? `<a href="${base}${c.slug}">${esc(c.name)}</a>` : `<span>${esc(c.name)}</span>`)).join('')}</nav>`;
  const crumbsFn = items => L2 => items.map(c => ({ name: typeof c.name === 'function' ? c.name(L2) : c.name, item: url(L2.meta.code, c.slug) }));
  const linkrow = (h, links) => links.length ? `<h2 class="sub-h">${esc(h)}</h2><div class="meta linkrow seo-links">${links.join('')}</div>` : '';
  const cta = (text, slug, btn) => `<div class="card cta-card no-print"><div><b>${esc(text)}</b></div><a class="btn-cta" href="${base}${slug}">${esc(btn)}</a></div>`;
  return { L, lang, base, t, has, fLong, fDate, fShort, fDM, fWd, fMonth, fMonthY, ymd, time, local, range, tithi, rashi, nak, gr, city, link, stars, faqHtml, crumbsHtml, crumbsFn, linkrow, cta };
}

// ---------- shared astronomy (memoised, locale-free) ----------
const calendarFor = (year, c) => once(`cal:${year}:${c.lat}:${c.lon}:${c.tz}`, () => P.calendar({ year, lat: c.lat, lon: c.lon, tzMinutes: c.tz }));
const festDates = (year, c = DELHI) => calendarFor(year, c).filter(e => e.kind === 'festival' || e.id === 'makarSankranti' || e.id === 'meshaSankranti');
// Tithi start/end around a date: the run of tithi intervals covering [date-1, date+1]
const tithiSpan = (y, m, d, idx, c) => once(`ts:${y}:${m}:${d}:${idx}:${c.lat}`, () => tithiSpanRaw(y, m, d, idx, c));
const fguide = (id, year, c) => once(`fg:${id}:${year}:${c.lat}:${c.lon}`, () => FG.guide(id, { year, lat: c.lat, lon: c.lon, tzMinutes: 330 }));
function tithiSpanRaw(y, m, d, idx, c) {
  const seq = [];
  for (const k of [-2, -1, 0, 1]) { const x = new Date(Date.UTC(y, m - 1, d + k)); const p = P.day({ year: x.getUTCFullYear(), month: x.getUTCMonth() + 1, day: x.getUTCDate(), lat: c.lat, lon: c.lon, tzMinutes: c.tz }); for (const tt of p.tithi) if (!seq.length || seq[seq.length - 1].end < tt.end - 60000) seq.push(tt); }
  for (let i = 1; i < seq.length; i++) if (seq[i].index === idx) return { start: seq[i - 1].end, end: seq[i].end };
  return null;
}
// Slow-planet sign changes (Jupiter, Saturn, Rahu) between two instants
function ingresses(planet, fromMs, toMs) {
  const signOf = ms => Math.floor(J.transit(ms / DAY + 2440587.5).lon[planet] / 30);
  const out = []; let ms = fromMs, s = signOf(ms); const step = planet === 'Jupiter' ? DAY : 2 * DAY;
  while (ms < toMs) {
    const m2 = ms + step, s2 = signOf(m2);
    if (s2 !== s) { let lo = ms, hi = m2; for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (signOf(mid) === s) lo = mid; else hi = mid; } out.push({ at: hi, planet, from: s, sign: s2 }); s = s2; }
    ms = m2;
  }
  return out;
}
const saturnPath = () => once('satpath', () => { const from = Date.UTC(1975, 0, 1), to = Date.UTC(2066, 0, 1); return { from, start: Math.floor(J.transit(from / DAY + 2440587.5).lon.Saturn / 30), moves: ingresses('Saturn', from, to) }; });
// Intervals when Saturn is in any of the given signs (merging touching intervals)
function saturnIn(signs) {
  const { from, start, moves } = saturnPath(); const out = []; let cur = start, at = from;
  const seg = [];
  for (const mv of moves) { seg.push({ sign: cur, start: at, end: mv.at }); cur = mv.sign; at = mv.at; }
  seg.push({ sign: cur, start: at, end: Date.UTC(2066, 0, 1) });
  for (const s of seg) if (signs.includes(s.sign)) { const last = out[out.length - 1]; if (last && s.start - last.end < 400 * DAY) { last.end = s.end; last.parts.push(s); } else out.push({ start: s.start, end: s.end, parts: [s] }); }
  return out;
}
const vratYear = (kind, year) => once(`vy:${kind}:${year}`, () => V.vrats({ fromMs: Date.UTC(year, 0, 1) - 330 * 60000, days: 366, lat: DELHI.lat, lon: DELHI.lon, tzMinutes: DELHI.tz, kinds: [kind] }).filter(v => v.date.startsWith(String(year))));
const muhuratYear = (purpose, year) => once(`mu:${purpose}:${year}`, () => {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const days = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const r = M.topDates({ purpose, from: { y: year, m, d: 1 }, days, lat: DELHI.lat, lon: DELHI.lon, tzMinutes: DELHI.tz }, 31);
    months.push(r.dates.filter(w => w.score >= 60).sort((a, b) => a.date < b.date ? -1 : 1));
  }
  return months;
});
const eclipsesYear = year => once(`ecl:${year}`, () => A.eclipses({ fromMs: Date.UTC(year, 0, 1) - 330 * 60000, toMs: Date.UTC(year + 1, 0, 1) - 330 * 60000, lat: DELHI.lat, lon: DELHI.lon }));
const rashiYear = year => once(`ry:${year}`, () => {
  const months = Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => ({ n: 0, stars: 0, career: 0, money: 0, love: 0, health: 0 })));
  for (let ms = Date.UTC(year, 0, 1, 0, 30); ms < Date.UTC(year + 1, 0, 1); ms += DAY) {
    const m = new Date(ms).getUTCMonth(), r = R.forDate(ms);
    for (const s of r.signs) { const a = months[m][s.sign]; a.n++; a.stars += s.stars; for (const k of ['career', 'money', 'love', 'health']) a[k] += s.area[k]; }
  }
  const start = Date.UTC(year, 0, 1), end = Date.UTC(year + 1, 0, 1);
  const pos = ms => J.transit(ms / DAY + 2440587.5).lon;
  const at0 = pos(start);
  const moves = ['Jupiter', 'Saturn', 'Rahu'].flatMap(p => ingresses(p, start, end));
  return { months, moves, startSigns: { Jupiter: Math.floor(at0.Jupiter / 30), Saturn: Math.floor(at0.Saturn / 30), Rahu: Math.floor(at0.Rahu / 30), Ketu: Math.floor(at0.Ketu / 30) } };
});
// Sign-level and nakshatra-level guna milan for two Moon signs (boy a, girl b)
const quarters = s => { const out = []; for (let q = s * 9; q < s * 9 + 9; q++) { const nak = Math.floor(q / 4), pada = q % 4 + 1, deg = (q % 9) * 3.333 + 1.66; out.push({ moonSign: s, nak, pada, moonDeg: deg, av: MT.avFor(s, nak, deg) }); } return out; };
const compatPair = (a, b) => once(`cp:${a}:${b}`, () => {
  const totals = []; let first = null;
  for (const B of quarters(a)) for (const G of quarters(b)) { const k = MT.kootas(B, G); if (!first) first = k; totals.push(k.reduce((s, x) => s + x.score, 0)); }
  const signK = first.filter(k => ['varna', 'vashya', 'maitri', 'bhakoot'].includes(k.id));
  const avg = totals.reduce((s, x) => s + x, 0) / totals.length;
  return { signK, signScore: signK.reduce((s, k) => s + k.score, 0), min: Math.min(...totals), max: Math.max(...totals), avg, good: totals.filter(x => x >= 18).length / totals.length };
});
const compatBand = (a, b) => { const x = compatPair(a, b), y = compatPair(b, a), avg = (x.avg + y.avg) / 2; return avg >= 24 ? 'excellent' : avg >= 20 ? 'good' : avg >= 16 ? 'average' : 'low'; };

// ---------- shared blocks ----------
function moreLinks(h, ctx, { cityC, sign } = {}) {
  const { t, link, city, rashi } = h;
  const Y = ctx.year;
  const blocks = [];
  if (cityC) blocks.push(h.linkrow(t('seo.links.thisCity', { c: city(cityC) }), [link(`panchang/${cityC.slug}/`, t('seo.cp.short')), link(`rahu-kaal/${cityC.slug}/`, t('seo.rk.short')), link(`choghadiya/${cityC.slug}/`, t('seo.ch.short'))]));
  if (cityC) blocks.push(h.linkrow(t('seo.links.nearby'), D.nearest(cityC, 10).map(c => link(`panchang/${c.slug}/`, city(c)))));
  if (sign != null) blocks.push(h.linkrow(t('seo.links.thisSign', { r: rashi(sign) }), [link(`rashifal/${SIGN_SLUG[sign]}/`, t('seo.rd.short')), link(`rashifal/${SIGN_SLUG[sign]}/${Y}/`, t('seo.ry.short', { y: Y })), link(`sade-sati/${SIGN_SLUG[sign]}/`, t('seo.ss.short')), link(`learn/${SIGN_SLUG[sign]}-rashi/`, t('seo.rs.short'))]));
  blocks.push(h.linkrow(t('seo.links.popular'), [
    ...D.TOP_CITIES.slice(0, 8).filter(s => !cityC || s !== cityC.slug).map(s => link(`panchang/${s}/`, t('seo.cp.inCity', { c: city(D.CITY[s]) }))),
    link('festivals/', t('seo.fe.indexShort', { y: Y })), link(`ekadashi-${Y}/`, t('seo.vl.ekadashi.short', { y: Y })), link(`muhurat/vivah-${Y}/`, t('seo.mh.marriage.short', { y: Y })), link(`transit/saturn-${Y}/`, t('seo.gt.short', { g: h.gr('Saturn'), y: Y })), link(`calendar/${Y}/`, t('seo.mc.yearShort', { y: Y }))
  ]));
  return blocks.join('');
}
const pageObj = (h, o) => ({ bundle: 'base', id: o.id, slug: o.slug, title: o.title, desc: o.desc, h1: o.h1, body: o.body, faq: o.faq || [], article: !!o.article, priority: o.priority || '0.6', freq: o.freq || 'yearly', crumbs: h.crumbsFn(o.crumbs), seo: true });

// ===================== DAILY (server-rendered) =====================
function dayData(c, nowMs, plus = 0) {
  const td = D.cityToday(c, nowMs, plus);
  const p = P.day({ year: td.y, month: td.m, day: td.d, lat: c.lat, lon: c.lon, tzMinutes: td.tz });
  return { td, p, tz: td.tz };
}
function panchangBlocks(h, p, tz) {
  const { t, L, time, range } = h;
  if (p.polar) return `<p class="empty">${esc(t('pp.polar'))}</p>`;
  const day0 = Math.floor((p.sunrise + tz * 60000) / DAY);
  const tm = ms => { const dd = Math.floor((ms + tz * 60000) / DAY); return time(ms, tz) + (dd !== day0 ? ' · ' + h.fDM.format(h.local(ms, tz)) : ''); };
  const seq = (arr, nameOf) => arr.map((x, i) => `<div class="pseq${i ? ' next' : ''}"><b>${esc(nameOf(x))}</b><span>${esc(i < arr.length - 1 || x.end < p.nextSunrise ? t('pp.until', { t: tm(x.end) }) : t('pp.fullDay'))}</span></div>`).join('');
  const el = (k, body) => `<div class="card pan"><dl style="margin:0"><dt>${esc(t(k))}</dt><dd>${body}</dd></dl></div>`;
  const masa = L.names.masa[p.lunarMonth] + (p.adhika ? ' (' + t('pp.adhika') + ')' : '');
  const tile = (cls, k, r, sub) => `<div class="card ptime ${cls}"><span>${esc(t(k))}</span><b class="num">${range(r, tz)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  return `<h2 class="sub-h">${esc(t('pp.elements'))}</h2><div class="pan-grid">${[
    el('sec.pan.tithi', seq(p.tithi, x => h.tithi(x.index))), el('sec.pan.nakshatra', seq(p.nakshatra, x => h.nak(x.index))),
    el('sec.pan.yoga', seq(p.yoga, x => L.names.yoga27[x.index])), el('sec.pan.karana', seq(p.karana, x => L.names.karana[x.name])),
    el('sec.pan.vara', `<b>${esc(L.names.vara[p.weekday])}</b>`), el('pp.masa', `<b>${esc(masa)}</b><span>${esc(t('pp.purnimanta'))}: ${esc(L.names.masa[p.purnimantaMonth])}</span>`),
    el('pp.moonSign', `<b>${esc(h.rashi(p.moonSign))}</b><span>${esc(t('pp.sunSign'))}: ${esc(h.rashi(p.sunSign))}</span>`),
    el('pp.samvat', `<b>${esc(t('pp.vikram'))} ${p.vikramSamvat}</b><span>${esc(t('pp.shaka'))} ${p.shakaSamvat}</span>`)
  ].join('')}</div>
  <h2 class="sub-h">${esc(t('pp.timings'))}</h2><div class="ptimes">${[
    tile('good', 'pp.brahma', p.brahmaMuhurta, t('pp.brahmaSub')), tile('good', 'pp.abhijit', p.abhijit, p.abhijit ? t('pp.abhijitSub') : t('pp.noAbhijit')), tile('good', 'pp.nishita', p.nishita, t('pp.nishitaSub')),
    tile('bad', 'pp.rahu', p.rahuKaal, t('pp.rahuSub')), tile('bad', 'pp.yama', p.yamaganda, t('pp.yamaSub')), tile('bad', 'pp.gulika', p.gulikaKaal, t('pp.gulikaSub'))
  ].join('')}</div>`;
}
function choghBlock(h, p, tz, part, title) {
  const li = p.choghadiya.filter(c => c.part === part).map(c => `<li class="${c.quality}"><b>${esc(h.L.names.chogh[c.name])}</b><span class="num">${h.time(c.start, tz)} – ${h.time(c.end, tz)}</span><span class="q">${esc(h.t('pp.q.' + c.quality))}</span></li>`).join('');
  return `<div class="card"><h3 class="h4">${esc(title)}</h3><ol class="chogh">${li}</ol></div>`;
}
function upcomingBlock(h, c, td, n = 10) {
  const today = iso(td.y, td.m, td.d), fromMs = Date.UTC(td.y, td.m - 1, td.d) - td.tz * 60000;
  // Festivals: the New Delhi calendar for Indian cities (computed once per server), the city's own abroad; vrats: next 30 days for the city
  const fc = c.india ? DELHI : { lat: c.lat, lon: c.lon, tz: td.tz };
  const fest = [...festDates(td.y, fc), ...(td.m >= 11 ? festDates(td.y + 1, fc) : [])].filter(e => e.date >= today).slice(0, 6);
  const vr = [...calendarFor(td.y, fc), ...(td.m >= 11 ? calendarFor(td.y + 1, fc) : [])].filter(e => e.kind === 'vrat').map(e => ({ ...e, kind: e.id }));
  const evs = [...fest, ...vr].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0).filter(e => e.date >= today).slice(0, n);
  if (!evs.length) return '';
  const isFest = e => e.kind === 'festival' || e.kind === 'sankranti';
  void fromMs;
  const name = e => isFest(e) ? h.L.fest[e.id] : vratName(h, e);
  const href = e => isFest(e) ? `festivals/${kebab(e.id)}-${e.date.slice(0, 4)}/` : `${(D.VRAT_LISTS.find(v => v[0] === e.kind) || [])[1]}-${e.date.slice(0, 4)}/`;
  return `<h2 class="sub-h">${esc(h.t('seo.cp.upcoming'))}</h2><div class="card"><ul class="seo-list">${evs.map(e => `<li><span class="num">${esc(h.fDM.format(h.ymd(e.date)))} · ${esc(h.fWd.format(h.ymd(e.date)))}</span><a href="${h.base}${href(e)}">${esc(name(e))}</a></li>`).join('')}</ul>${c.india ? `<p class="muted small">${esc(h.t('seo.cp.upNote'))}</p>` : ''}</div>`;
}
function vratName(h, v0) {
  const { t, L } = h, v = { ...v0, id: v0.kind && v0.kind !== 'vrat' ? v0.kind : v0.id };
  if (v.id === 'ekadashi') { const e = v.adhika ? D.ADHIKA_EKADASHI : D.EKADASHI[v.month]; const k = e && e[v.paksha === 'Shukla' ? 's' : 'k']; return k ? t('seo.ek.' + k) : t('vt.k.ekadashi'); }
  if (v.id === 'pradosh') { const wd = h.ymd(v.date).getUTCDay(); return wd === 1 ? t('seo.vl.soma') : wd === 2 ? t('seo.vl.bhauma') : wd === 6 ? t('seo.vl.shani') : t('vt.k.pradosh'); }
  if (v.id === 'sankashti') return h.ymd(v.date).getUTCDay() === 2 ? t('seo.vl.angaraki') : t('vt.k.sankashti');
  if (v.id === 'purnima' || v.id === 'amavasya') return L.names.masa[v.month] + ' ' + t('vt.k.' + v.id);
  return t('vt.k.' + v.id);
}

function cityPanchang(lang, c, nowMs = Date.now()) {
  const h = H(lang), { t } = h, { td, p, tz } = dayData(c, nowMs), cn = h.city(c);
  const dateL = h.fLong.format(new Date(Date.UTC(td.y, td.m - 1, td.d)));
  const mr = A.moonEvents({ year: td.y, month: td.m, day: td.d, lat: c.lat, lon: c.lon, tzMinutes: tz });
  const ti = p.polar ? '' : h.tithi(p.tithi[0].index), nk = p.polar ? '' : h.nak(p.nakshatra[0].index);
  const faq = p.polar ? [] : [
    { q: t('seo.cp.fq1', { c: cn }), a: t('seo.cp.fa1', { t: ti, e: h.time(p.tithi[0].end, tz), n: p.tithi[1] ? h.tithi(p.tithi[1].index) : ti }) },
    { q: t('seo.cp.fq2', { c: cn }), a: t('seo.cp.fa2', { n: nk, e: h.time(p.nakshatra[0].end, tz) }) },
    { q: t('seo.cp.fq3', { c: cn }), a: t('seo.cp.fa3', { r: h.range(p.rahuKaal, tz) }) },
    { q: t('seo.cp.fq4', { c: cn }), a: t('seo.cp.fa4', { a: h.time(p.sunrise, tz), b: h.time(p.sunset, tz) }) },
    { q: t('seo.cp.fq5'), a: t('seo.cp.fa5', { a: h.range(p.abhijit, tz), b: h.range(p.brahmaMuhurta, tz) }) }
  ];
  const sky = p.polar ? '' : `<div class="card seo-sum"><div><span class="eyebrow">${esc(dateL)}</span><p class="seo-big">${esc(ti)} · ${esc(nk)}</p><p class="muted">${esc(h.L.names.masa[p.lunarMonth])} · ${esc(h.L.names.vara[p.weekday])}</p></div>
    <dl class="seo-kv"><div><dt>${esc(t('sec.pan.sunrise'))}</dt><dd class="num">${h.time(p.sunrise, tz)}</dd></div><div><dt>${esc(t('sec.pan.sunset'))}</dt><dd class="num">${h.time(p.sunset, tz)}</dd></div>
    <div><dt>${esc(t('seo.moonrise'))}</dt><dd class="num">${mr.rise ? h.time(mr.rise, tz) : '—'}</dd></div><div><dt>${esc(t('seo.moonset'))}</dt><dd class="num">${mr.set ? h.time(mr.set, tz) : '—'}</dd></div></dl></div>`;
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('pages.panchang.name'), slug: 'panchang/' }, { name: t('seo.cp.allCities'), slug: 'panchang/cities/' }, { name: cn }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('pp.eye'))}</p><h1>${esc(t('seo.cp.h1', { c: cn }))}</h1><p class="lede">${esc(t('seo.cp.lede', { c: cn, d: dateL }))}</p></div>
  ${sky}${panchangBlocks(h, p, tz)}
  ${p.polar ? '' : `<h2 class="sub-h">${esc(t('pp.chogh'))}</h2><p class="lede">${esc(t('pp.choghLede'))}</p><div class="chogh-grid">${choghBlock(h, p, tz, 'day', t('pp.choghDay'))}${choghBlock(h, p, tz, 'night', t('pp.choghNight'))}</div>`}
  ${upcomingBlock(h, c, td)}
  ${h.cta(t('seo.cp.cta'), 'panchang/', t('seo.cp.ctaBtn'))}
  ${h.faqHtml(faq)}
  <p class="muted small">${esc(t('seo.tzNote', { c: cn, z: c.tz }))}</p>
  ${moreLinks(h, { year: td.y }, { cityC: c })}
</main>`;
  return pageObj(h, { id: 'city-panchang', slug: `panchang/${c.slug}/`, title: t('seo.cp.title', { c: cn, d: h.fDate.format(new Date(Date.UTC(td.y, td.m - 1, td.d))) }), desc: p.polar ? t('seo.cp.h1', { c: cn }) : t('seo.cp.desc', { c: cn, t: ti, n: nk, s: h.time(p.sunrise, tz), r: h.range(p.rahuKaal, tz) }), h1: t('seo.cp.h1', { c: cn }), body, faq, freq: 'daily', priority: '0.8', crumbs: [{ name: L2 => L2.pages.panchang.name, slug: 'panchang/' }, { name: L2 => c.name[L2.meta.code] || c.name.en, slug: `panchang/${c.slug}/` }] });
}

function cityRahu(lang, c, nowMs = Date.now()) {
  const h = H(lang), { t } = h, cn = h.city(c), days = Array.from({ length: 7 }, (_, i) => dayData(c, nowMs, i));
  const { td, p, tz } = days[0];
  const dateL = h.fLong.format(new Date(Date.UTC(td.y, td.m - 1, td.d)));
  const rows = days.map(({ td: d, p: q, tz: z }) => { const dt = new Date(Date.UTC(d.y, d.m - 1, d.d)); return `<tr><td>${esc(h.fDM.format(dt))} <small class="muted">${esc(h.fWd.format(dt))}</small></td><td class="num bad">${h.range(q.rahuKaal, z)}</td><td class="num">${h.range(q.yamaganda, z)}</td><td class="num">${h.range(q.gulikaKaal, z)}</td></tr>`; }).join('');
  const faq = p.polar ? [] : [
    { q: t('seo.rk.fq1', { c: cn }), a: t('seo.rk.fa1', { r: h.range(p.rahuKaal, tz), d: dateL }) },
    { q: t('seo.rk.fq2'), a: t('seo.rk.fa2') },
    { q: t('seo.rk.fq3', { c: cn }), a: t('seo.rk.fa3', { y: h.range(p.yamaganda, tz), g: h.range(p.gulikaKaal, tz) }) },
    { q: t('seo.rk.fq4'), a: t('seo.rk.fa4') }
  ];
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.rk.index'), slug: 'rahu-kaal/' }, { name: cn }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('pp.rahu'))}</p><h1>${esc(t('seo.rk.h1', { c: cn }))}</h1><p class="lede">${esc(dateL)}</p></div>
  ${p.polar ? `<p class="empty">${esc(t('pp.polar'))}</p>` : `<div class="ptimes"><div class="card ptime bad seo-hero-t"><span>${esc(t('pp.rahu'))}</span><b class="num">${h.range(p.rahuKaal, tz)}</b><small>${esc(t('pp.rahuSub'))}</small></div>
  <div class="card ptime bad"><span>${esc(t('pp.yama'))}</span><b class="num">${h.range(p.yamaganda, tz)}</b><small>${esc(t('pp.yamaSub'))}</small></div><div class="card ptime bad"><span>${esc(t('pp.gulika'))}</span><b class="num">${h.range(p.gulikaKaal, tz)}</b><small>${esc(t('pp.gulikaSub'))}</small></div>
  <div class="card ptime good"><span>${esc(t('pp.abhijit'))}</span><b class="num">${h.range(p.abhijit, tz)}</b><small>${esc(p.abhijit ? t('pp.abhijitSub') : t('pp.noAbhijit'))}</small></div>
  <div class="card ptime"><span>${esc(t('sec.pan.sunrise'))}</span><b class="num">${h.time(p.sunrise, tz)}</b></div><div class="card ptime"><span>${esc(t('sec.pan.sunset'))}</span><b class="num">${h.time(p.sunset, tz)}</b></div></div>`}
  <h2 class="sub-h">${esc(t('seo.rk.week'))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('pp.date'))}</th><th>${esc(t('pp.rahu'))}</th><th>${esc(t('pp.yama'))}</th><th>${esc(t('pp.gulika'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="card prose"><h2>${esc(t('seo.rk.aboutH'))}</h2><p>${esc(t('seo.rk.about1'))}</p><p>${esc(t('seo.rk.about2'))}</p></div>
  ${h.cta(t('seo.cp.cta'), 'panchang/', t('seo.cp.ctaBtn'))}
  ${h.faqHtml(faq)}
  <p class="muted small">${esc(t('seo.tzNote', { c: cn, z: c.tz }))}</p>
  ${moreLinks(h, { year: td.y }, { cityC: c })}
</main>`;
  return pageObj(h, { id: 'city-rahu', slug: `rahu-kaal/${c.slug}/`, title: t('seo.rk.title', { c: cn, d: h.fDate.format(new Date(Date.UTC(td.y, td.m - 1, td.d))) }), desc: p.polar ? t('seo.rk.h1', { c: cn }) : t('seo.rk.desc', { c: cn, r: h.range(p.rahuKaal, tz), y: h.range(p.yamaganda, tz), g: h.range(p.gulikaKaal, tz) }), h1: t('seo.rk.h1', { c: cn }), body, faq, freq: 'daily', priority: '0.7', crumbs: [{ name: L2 => L2.seo.rk.index, slug: 'rahu-kaal/' }, { name: L2 => c.name[L2.meta.code] || c.name.en, slug: `rahu-kaal/${c.slug}/` }] });
}

function cityChogh(lang, c, nowMs = Date.now()) {
  const h = H(lang), { t } = h, cn = h.city(c), { td, p, tz } = dayData(c, nowMs), tmr = dayData(c, nowMs, 1);
  const dateL = h.fLong.format(new Date(Date.UTC(td.y, td.m - 1, td.d))), tmrL = h.fLong.format(new Date(Date.UTC(tmr.td.y, tmr.td.m - 1, tmr.td.d)));
  const good = p.polar ? [] : p.choghadiya.filter(x => x.quality === 'good' && x.part === 'day');
  const faq = p.polar ? [] : [
    { q: t('seo.ch.fq1', { c: cn }), a: t('seo.ch.fa1', { list: list(h.L, good.map(x => `${h.L.names.chogh[x.name]} ${h.time(x.start, tz)}–${h.time(x.end, tz)}`)) }) },
    { q: t('seo.ch.fq2'), a: t('seo.ch.fa2') },
    { q: t('seo.ch.fq3'), a: t('seo.ch.fa3') }
  ];
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.ch.index'), slug: 'choghadiya/' }, { name: cn }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('pp.chogh'))}</p><h1>${esc(t('seo.ch.h1', { c: cn }))}</h1><p class="lede">${esc(dateL)} · ${esc(t('sec.pan.sunrise'))} ${p.polar ? '—' : h.time(p.sunrise, tz)} · ${esc(t('sec.pan.sunset'))} ${p.polar ? '—' : h.time(p.sunset, tz)}</p></div>
  ${p.polar ? `<p class="empty">${esc(t('pp.polar'))}</p>` : `<p class="lede">${esc(t('pp.choghLede'))}</p><div class="chogh-grid">${choghBlock(h, p, tz, 'day', t('pp.choghDay'))}${choghBlock(h, p, tz, 'night', t('pp.choghNight'))}</div>
  ${tmr.p.polar ? '' : `<h2 class="sub-h">${esc(t('seo.ch.tomorrow', { d: tmrL }))}</h2><div class="chogh-grid">${choghBlock(h, tmr.p, tmr.tz, 'day', t('pp.choghDay'))}${choghBlock(h, tmr.p, tmr.tz, 'night', t('pp.choghNight'))}</div>`}`}
  <div class="card prose"><h2>${esc(t('seo.ch.aboutH'))}</h2><p>${esc(t('seo.ch.about1'))}</p><p>${esc(t('seo.ch.about2'))}</p></div>
  ${h.cta(t('seo.cp.cta'), 'panchang/', t('seo.cp.ctaBtn'))}
  ${h.faqHtml(faq)}
  <p class="muted small">${esc(t('seo.tzNote', { c: cn, z: c.tz }))}</p>
  ${moreLinks(h, { year: td.y }, { cityC: c })}
</main>`;
  return pageObj(h, { id: 'city-chogh', slug: `choghadiya/${c.slug}/`, title: t('seo.ch.title', { c: cn, d: h.fDate.format(new Date(Date.UTC(td.y, td.m - 1, td.d))) }), desc: t('seo.ch.desc', { c: cn, list: list(h.L, good.map(x => h.L.names.chogh[x.name] + ' ' + h.time(x.start, tz))) }), h1: t('seo.ch.h1', { c: cn }), body, faq, freq: 'daily', priority: '0.7', crumbs: [{ name: L2 => L2.seo.ch.index, slug: 'choghadiya/' }, { name: L2 => c.name[L2.meta.code] || c.name.en, slug: `choghadiya/${c.slug}/` }] });
}

function signCard(h, s, data, label) {
  const { t, gr } = h, x = data.signs[s];
  const good = x.items.filter(i => i.good), bad = x.items.filter(i => !i.good && i.planet !== 'Moon');
  return `<article class="card rcard${x.chandrashtama ? ' warn' : ''}"><div class="rh"><svg class="rg big" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${s}"/></svg><div><h3>${esc(label)}</h3><small>${esc(t('res.lord', { g: gr(J.SIGN_LORD[s]) }))}</small></div>${h.stars(x.stars)}</div>
    <p class="rmoon">${esc(t('rf.moon.' + (x.moonHouse - 1)))}</p>${x.chandrashtama ? `<p class="tag bad">${esc(t('rf.chandrashtama'))}</p>` : ''}
    <dl class="areas">${['career', 'money', 'love', 'health'].map(a => `<div><dt>${esc(t('rf.area.' + a))}</dt><dd>${h.stars(x.area[a])}</dd></div>`).join('')}</dl>
    <p class="rsupport">${good.length ? `<b class="good">${esc(t('rf.support'))}</b> ${esc(list(h.L, good.map(i => gr(i.planet) + ' (' + t('rf.house', { h: i.house }) + ')')))}` : ''}${bad.length ? `<br><b class="bad">${esc(t('rf.caution'))}</b> ${esc(list(h.L, bad.map(i => gr(i.planet) + ' (' + t('rf.house', { h: i.house }) + ')')))}` : ''}</p></article>`;
}
function signDaily(lang, s, nowMs = Date.now()) {
  const h = H(lang), { t } = h, ist = new Date(nowMs + 330 * 60000), y = ist.getUTCFullYear(), m = ist.getUTCMonth(), d = ist.getUTCDate();
  const at = k => Date.UTC(y, m, d + k, 0, 30), r = h.rashi(s);
  const today = R.forDate(at(0)), tmr = R.forDate(at(1));
  const week = Array.from({ length: 7 }, (_, k) => ({ dt: new Date(Date.UTC(y, m, d + k)), x: (k === 0 ? today : k === 1 ? tmr : R.forDate(at(k))).signs[s] }));
  const dateL = h.fLong.format(new Date(Date.UTC(y, m, d)));
  const best = week.slice().sort((a, b) => b.x.stars - a.x.stars)[0];
  const faq = [
    { q: t('seo.rd.fq1', { r }), a: t('seo.rd.fa1', { n: today.signs[s].stars, m: t('rf.moon.' + (today.signs[s].moonHouse - 1)) }) },
    { q: t('seo.rd.fq2', { r }), a: t('seo.rd.fa2', { d: h.fLong.format(best.dt), n: best.x.stars }) },
    { q: t('seo.rd.fq3'), a: t('seo.rd.fa3') }
  ];
  const others = SIGN_SLUG.map((sl, i) => i === s ? `<span class="tag gold">${esc(h.rashi(i))}</span>` : h.link(`rashifal/${sl}/`, h.rashi(i))).join('');
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('pages.rashifal.name'), slug: 'rashifal/' }, { name: r }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.rd.eye'))}</p><h1>${esc(t('seo.rd.h1', { r, w: t('seo.west.' + s) }))}</h1><p class="lede">${esc(dateL)}</p></div>
  <div class="rgrid seo-two">${signCard(h, s, today, t('seo.today'))}${signCard(h, s, tmr, t('seo.tomorrow'))}</div>
  <h2 class="sub-h">${esc(t('seo.rd.week'))}</h2><div class="card seo-week">${week.map(w => `<div><b>${esc(h.fWd.format(w.dt))}</b><small>${esc(h.fDM.format(w.dt))}</small>${h.stars(w.x.stars)}${w.x.chandrashtama ? `<span class="tag bad">${esc(t('seo.rd.ch8'))}</span>` : ''}</div>`).join('')}</div>
  <p class="muted small">${esc(t('rf.note'))}</p>
  ${h.cta(t('seo.rd.cta'), '', t('seo.rd.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.rd.allSigns'), [others])}
  ${moreLinks(h, { year: y }, { sign: s })}
</main>`;
  return pageObj(h, { id: 'sign-daily', slug: `rashifal/${SIGN_SLUG[s]}/`, title: t('seo.rd.title', { r, w: t('seo.west.' + s), d: h.fDate.format(new Date(Date.UTC(y, m, d))) }), desc: t('seo.rd.desc', { r, n: today.signs[s].stars }), h1: t('seo.rd.h1', { r, w: t('seo.west.' + s) }), body, faq, freq: 'daily', priority: '0.8', crumbs: [{ name: L2 => L2.pages.rashifal.name, slug: 'rashifal/' }, { name: L2 => L2.names.rashi[s], slug: `rashifal/${SIGN_SLUG[s]}/` }] });
}

// ===================== YEARLY (static) =====================
function cityIndex(lang, kind) { // kind: panchang | rahu | chogh
  const h = H(lang), { t } = h, Y = new Date(Date.now() + 330 * 60000).getUTCFullYear();
  const pre = { panchang: 'panchang', rahu: 'rahu-kaal', chogh: 'choghadiya' }[kind], key = { panchang: 'cp', rahu: 'rk', chogh: 'ch' }[kind];
  const india = D.CITIES.filter(c => c.india), abroad = D.CITIES.filter(c => !c.india);
  const byRegion = {}; india.forEach(c => (byRegion[c.region] = byRegion[c.region] || []).push(c));
  const grid = cs => `<div class="meta linkrow seo-links">${cs.map(c => h.link(`${pre}/${c.slug}/`, h.city(c))).join('')}</div>`;
  const body = `<main class="wrap page seo-page">${h.crumbsHtml(kind === 'panchang' ? [{ name: t('pages.panchang.name'), slug: 'panchang/' }, { name: t('seo.cp.allCities') }] : [{ name: t(`seo.${key}.index`) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t(kind === 'panchang' ? 'pp.eye' : kind === 'rahu' ? 'pp.rahu' : 'pp.chogh'))}</p><h1>${esc(t(`seo.${key}.indexH1`))}</h1><p class="lede">${esc(t(`seo.${key}.indexLede`))}</p></div>
  <h2 class="sub-h">${esc(t('seo.popularCities'))}</h2>${grid(D.TOP_CITIES.map(s => D.CITY[s]))}
  ${Object.keys(byRegion).sort().map(rg => `<h2 class="sub-h h4">${esc(rg)}</h2>${grid(byRegion[rg])}`).join('')}
  <h2 class="sub-h">${esc(t('seo.abroad'))}</h2>${grid(abroad)}
  ${kind === 'panchang' ? '' : `<div class="card prose"><h2>${esc(t(`seo.${key}.aboutH`))}</h2><p>${esc(t(`seo.${key}.about1`))}</p><p>${esc(t(`seo.${key}.about2`))}</p></div>`}
  ${moreLinks(h, { year: Y })}
</main>`;
  const slug = kind === 'panchang' ? 'panchang/cities/' : pre + '/';
  return pageObj(h, { id: 'city-index', slug, title: t(`seo.${key}.indexTitle`), desc: t(`seo.${key}.indexLede`), h1: t(`seo.${key}.indexH1`), body, freq: 'monthly', priority: '0.8', crumbs: kind === 'panchang' ? [{ name: L2 => L2.pages.panchang.name, slug: 'panchang/' }, { name: L2 => L2.seo.cp.allCities, slug }] : [{ name: L2 => L2.seo[key].index, slug }] });
}

const FEST_CITIES = ['delhi', 'mumbai', 'ahmedabad', 'kolkata', 'chennai', 'bengaluru', 'hyderabad', 'pune', 'jaipur', 'lucknow'];
function festivalPage(lang, id, year) {
  const h = H(lang), { t, L } = h, name = L.fest[id], ev = festDates(year).find(e => e.id === id); if (!ev) return null;
  const dt = h.ymd(ev.date), dateL = h.fLong.format(dt), [y, m, d] = ev.date.split('-').map(Number);
  const F = P.FESTIVALS.find(f => f.id === id), idx = F ? F.tithi - 1 : null;
  const span = idx != null ? tithiSpan(y, m, d, idx, DELHI) : null;
  const guide = FG.GUIDES[id] ? fguide(id, year, DELHI) : null;
  const gw = guide && (Array.isArray(guide) ? guide.find(g => g.date === ev.date) || guide[0] : guide);
  const rows = FEST_CITIES.map(sl => { const c = D.CITY[sl], cc = { lat: c.lat, lon: c.lon, tz: 330 }, e = festDates(year, cc).find(x => x.id === id); if (!e) return ''; let w = '';
    if (FG.GUIDES[id]) { const g = fguide(id, year, c); const gg = Array.isArray(g) ? g.find(x => x.date === e.date) : g; const win = gg && (gg.sthir || gg.main); if (win) w = h.range(win, 330); }
    return `<tr><td>${h.link(`panchang/${c.slug}/`, h.city(c), '')}</td><td>${esc(h.fDM.format(h.ymd(e.date)))} <small class="muted">${esc(h.fWd.format(h.ymd(e.date)))}</small></td>${FG.GUIDES[id] ? `<td class="num">${w || '—'}</td>` : ''}</tr>`; }).join('');
  const about = h.has(`pj.f.${id}.about`) ? t(`pj.f.${id}.about`) : h.has(`seo.fa.${id}`) ? t(`seo.fa.${id}`) : '';
  const mainWin = gw ? (gw.sthir || gw.main) : null;
  const faq = [
    { q: t('seo.fe.fq1', { f: name, y: year }), a: t('seo.fe.fa1', { f: name, d: dateL }) },
    ...(span ? [{ q: t('seo.fe.fq2', { f: name, y: year }), a: t('seo.fe.fa2', { t: h.tithi(idx), a: h.fDM.format(h.local(span.start, 330)) + ' ' + h.time(span.start, 330), b: h.fDM.format(h.local(span.end, 330)) + ' ' + h.time(span.end, 330) }) }] : []),
    ...(mainWin ? [{ q: t('seo.fe.fq3', { f: name, y: year }), a: t('seo.fe.fa3', { r: h.range(mainWin, 330) }) }] : [])
  ];
  const sameMonth = festDates(year).filter(e => e.date.slice(0, 7) === ev.date.slice(0, 7) && e.id !== id).map(e => h.link(`festivals/${kebab(e.id)}-${year}/`, L.fest[e.id]));
  const otherYear = [year - 1, year + 1].filter(yy => yy >= S_YEARS()[0] && yy <= S_YEARS()[S_YEARS().length - 1]).map(yy => h.link(`festivals/${kebab(id)}-${yy}/`, `${name} ${yy}`));
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.fe.index', { y: year }), slug: 'festivals/' }, { name: `${name} ${year}` }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.fe.eye'))}</p><h1>${esc(t('seo.fe.h1', { f: name, y: year }))}</h1><p class="lede seo-big">${esc(dateL)}</p></div>
  <div class="card seo-sum"><dl class="seo-kv">
    ${span ? `<div><dt>${esc(t('seo.fe.tithi'))}</dt><dd>${esc(h.tithi(idx))}</dd></div><div><dt>${esc(t('seo.fe.begins'))}</dt><dd class="num">${esc(h.fDM.format(h.local(span.start, 330)))} ${h.time(span.start, 330)}</dd></div><div><dt>${esc(t('seo.fe.ends'))}</dt><dd class="num">${esc(h.fDM.format(h.local(span.end, 330)))} ${h.time(span.end, 330)}</dd></div>` : ''}
    ${gw && gw.main ? `<div><dt>${esc(t('pj.k.' + gw.kind))}</dt><dd class="num">${h.range(gw.main, 330)}</dd></div>` : ''}${gw && gw.sthir ? `<div><dt>${esc(t('pj.sthir'))}</dt><dd class="num">${h.range(gw.sthir, 330)}</dd></div>` : ''}${gw && gw.moonrise ? `<div><dt>${esc(t('pj.moonrise'))}</dt><dd class="num">${h.time(gw.moonrise, 330)}</dd></div>` : ''}
  </dl><p class="muted small">${esc(t('seo.fe.delhiNote'))}</p></div>
  ${about ? `<div class="card prose"><h2>${esc(t('seo.fe.aboutH', { f: name }))}</h2><p>${esc(about)}</p>${FG.GUIDES[id] ? `<p><a href="${h.base}puja/${kebab(id)}/">${esc(t('seo.fe.pujaLink', { f: name }))}</a></p>` : ''}</div>` : ''}
  <h2 class="sub-h">${esc(t('seo.fe.cities', { f: name, y: year }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('pp.city'))}</th><th>${esc(t('pp.date'))}</th>${FG.GUIDES[id] ? `<th>${esc(t('seo.fe.muhurat'))}</th>` : ''}</tr></thead><tbody>${rows}</tbody></table></div>
  ${FG.GUIDES[id] ? h.cta(t('seo.fe.cta', { f: name }), 'puja/', t('seo.fe.ctaBtn')) : h.cta(t('seo.fe.ctaCal'), 'calendar/', t('seo.fe.ctaCalBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.fe.sameMonth', { m: h.fMonthY.format(dt) }), sameMonth)}${h.linkrow(t('seo.fe.otherYears'), otherYear)}
  ${moreLinks(h, { year })}
</main>`;
  let festDesc = t('seo.fe.desc', { f: name, y: year, d: dateL }) + (mainWin ? ' ' + t('seo.fe.descMu', { r: h.range(mainWin, 330) }) : '');
  if (festDesc.length < 110) {
    const extra = about || (span ? t('seo.fe.fa2', { t: h.tithi(idx), a: h.fDM.format(h.local(span.start, 330)) + ' ' + h.time(span.start, 330), b: h.fDM.format(h.local(span.end, 330)) + ' ' + h.time(span.end, 330) }) : '');
    if (extra) festDesc += ' ' + extra;
  }
  return { event: { name: `${name} ${year}`, startDate: mainWin ? new Date(mainWin.start + 330 * 60000).toISOString().slice(0, 16) + '+05:30' : ev.date, endDate: mainWin ? new Date(mainWin.end + 330 * 60000).toISOString().slice(0, 16) + '+05:30' : ev.date, description: about || t('seo.fe.desc', { f: name, y: year, d: dateL }) }, ...pageObj(h, { id: 'festival', slug: `festivals/${kebab(id)}-${year}/`, title: t('seo.fe.title', { f: name, y: year, d: h.fDate.format(dt) }), desc: festDesc, h1: t('seo.fe.h1', { f: name, y: year }), body, faq, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => S.tr(L2, 'seo.fe.index', { y: year }), slug: 'festivals/' }, { name: L2 => `${L2.fest[id]} ${year}`, slug: `festivals/${kebab(id)}-${year}/` }]  }) };
}
let YEARS = null;
const S_YEARS = () => YEARS || (YEARS = (() => { const y = new Date(Date.now() + 330 * 60000).getUTCFullYear(); return [y, y + 1]; })());

function festivalIndex(lang) {
  const h = H(lang), { t, L } = h, years = S_YEARS();
  const sec = year => { const evs = festDates(year); return `<h2 class="sub-h">${esc(t('seo.fe.index', { y: year }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.fe.festival'))}</th><th>${esc(t('pp.date'))}</th><th>${esc(t('seo.fe.day'))}</th></tr></thead><tbody>${evs.map(e => `<tr><td><a href="${h.base}festivals/${kebab(e.id)}-${year}/">${esc(L.fest[e.id])}</a></td><td>${esc(h.fDate.format(h.ymd(e.date)))}</td><td>${esc(L.names.vara[h.ymd(e.date).getUTCDay()])}</td></tr>`).join('')}</tbody></table></div>`; };
  const vl = years.flatMap(y => D.VRAT_LISTS.map(([k, w]) => h.link(`${w}-${y}/`, t(`seo.vl.${k}.short`, { y })))).concat(years.map(y => h.link(`grahan-${y}/`, t('seo.gr.short', { y }))));
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.fe.indexName') }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.fe.eye'))}</p><h1>${esc(t('seo.fe.indexH1', { a: years[0], b: years[1] }))}</h1><p class="lede">${esc(t('seo.fe.indexLede'))}</p></div>
  ${years.map(sec).join('')}
  ${h.linkrow(t('seo.fe.lists'), vl)}
  ${moreLinks(h, { year: years[0] })}
</main>`;
  return pageObj(h, { id: 'festival-index', slug: 'festivals/', title: t('seo.fe.indexTitle', { a: years[0], b: years[1] }), desc: t('seo.fe.indexLede'), h1: t('seo.fe.indexH1', { a: years[0], b: years[1] }), body, priority: '0.9', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.fe.indexName, slug: 'festivals/' }] });
}

function vratList(lang, kind, word, year) {
  const h = H(lang), { t, L } = h, list_ = vratYear(kind, year);
  const rows = list_.map(v => {
    const dt = h.ymd(v.date), p = v.parana; let extra = '';
    if (kind === 'ekadashi' && p && p.kind === 'parana') extra = `${esc(h.fDM.format(h.local(p.start, 330)))} ${h.range(p, 330)}`;
    else if (kind === 'pradosh' && p) extra = h.range(p, 330);
    else if (kind === 'sankashti' && p && p.start) extra = h.time(p.start, 330);
    else if (kind === 'purnima' || kind === 'amavasya') { const [y, m, d] = v.date.split('-').map(Number); const sp = tithiSpan(y, m, d, kind === 'purnima' ? 14 : 29, DELHI); if (sp) extra = `${esc(h.fDM.format(h.local(sp.start, 330)))} ${h.time(sp.start, 330)} – ${esc(h.fDM.format(h.local(sp.end, 330)))} ${h.time(sp.end, 330)}`; }
    return `<tr><td><b>${esc(h.fDM.format(dt))}</b> <small class="muted">${esc(h.fWd.format(dt))}</small></td><td><b>${esc(vratName(h, v))}</b><br><small class="muted">${esc(L.names.masa[v.month])}${v.adhika ? ' (' + esc(t('pp.adhika')) + ')' : ''}${v.paksha ? ' · ' + esc(L.names.paksha[v.paksha]) : ''}</small></td><td class="num">${extra || '—'}</td></tr>`;
  }).join('');
  const col = t(`seo.vl.${kind}.col`);
  const first = list_.find(v => v.date >= iso(year, 1, 1));
  const faq = [
    { q: t(`seo.vl.fq1`, { v: t(`vt.k.${kind}`), y: year }), a: t('seo.vl.fa1', { n: list_.length, v: t(`vt.k.${kind}`), y: year }) },
    { q: t(`seo.vl.${kind}.fq`), a: t(`seo.vl.${kind}.fa`) }
  ];
  const other = S_YEARS().filter(y => y !== year).map(y => h.link(`${word}-${y}/`, t(`seo.vl.${kind}.short`, { y }))).concat(D.VRAT_LISTS.filter(x => x[0] !== kind).map(([k, w]) => h.link(`${w}-${year}/`, t(`seo.vl.${k}.short`, { y: year }))));
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.fe.indexName'), slug: 'festivals/' }, { name: t(`seo.vl.${kind}.short`, { y: year }) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('vt.eye'))}</p><h1>${esc(t(`seo.vl.${kind}.h1`, { y: year }))}</h1><p class="lede">${esc(t(`seo.vl.${kind}.lede`, { y: year, n: list_.length }))}</p></div>
  <div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('pp.date'))}</th><th>${esc(t('seo.vl.name'))}</th><th>${esc(col)}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="muted small">${esc(t('seo.vl.note'))}</p>
  ${h.cta(t('seo.vl.cta'), 'vrat/', t('seo.vl.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.fe.lists'), other)}
  ${moreLinks(h, { year })}
</main>`;
  return pageObj(h, { id: 'vrat-list', slug: `${word}-${year}/`, title: t(`seo.vl.${kind}.title`, { y: year }), desc: t(`seo.vl.${kind}.lede`, { y: year, n: list_.length }), h1: t(`seo.vl.${kind}.h1`, { y: year }), body, faq, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.fe.indexName, slug: 'festivals/' }, { name: L2 => S.tr(L2, `seo.vl.${kind}.short`, { y: year }), slug: `${word}-${year}/` }] });
}

function grahanPage(lang, year) {
  const h = H(lang), { t } = h, ecl = eclipsesYear(year);
  const cards = ecl.map(e => {
    const lo = e.local || {}, vis = lo.visible, dt = h.local(e.max, 330);
    const affected = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(s => ({ s, hh: (e.sign - s + 12) % 12 + 1 }));
    const goodS = affected.filter(a => [3, 6, 10, 11].includes(a.hh)).map(a => h.rashi(a.s)), badS = affected.filter(a => [1, 4, 8, 12].includes(a.hh)).map(a => h.rashi(a.s));
    return `<article class="card ecl"><h2 class="h3">${esc(t(`ec.k.${e.kind}.${e.type}`))}</h2><p class="seo-big">${esc(h.fLong.format(new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()))))}</p>
      <p><span class="tag ${vis ? 'good' : ''}">${esc(vis ? t('seo.gr.visible') : t('seo.gr.notVisible'))}</span></p>
      <dl class="seo-kv">${vis && lo.start ? `<div><dt>${esc(t('ec.start'))}</dt><dd class="num">${h.time(lo.start, 330)}</dd></div>` : ''}<div><dt>${esc(t('ec.max'))}</dt><dd class="num">${h.time(e.max, 330)}</dd></div>${vis && lo.end ? `<div><dt>${esc(t('ec.end'))}</dt><dd class="num">${h.time(lo.end, 330)}</dd></div>` : ''}
      <div><dt>${esc(t('ec.sutak'))}</dt><dd>${esc(vis && e.sutak ? h.fDM.format(h.local(e.sutak, 330)) + ' ' + h.time(e.sutak, 330) : e.kind === 'lunar' && e.type === 'penumbral' ? t('ec.noSutakPen') : t('ec.noSutak'))}</dd></div>
      <div><dt>${esc(t('ec.in'))}</dt><dd>${esc(h.rashi(e.sign))} · ${esc(h.nak(e.nak))}</dd></div></dl>
      <p class="small"><b class="good">${esc(t('seo.gr.good'))}</b> ${esc(list(h.L, goodS))}<br><b class="bad">${esc(t('seo.gr.bad'))}</b> ${esc(list(h.L, badS))}</p></article>`;
  }).join('');
  const visN = ecl.filter(e => e.local && e.local.visible).length;
  const faq = [{ q: t('seo.gr.fq1', { y: year }), a: t('seo.gr.fa1', { n: ecl.length, v: visN, y: year }) }, { q: t('seo.gr.fq2'), a: t('seo.gr.fa2') }];
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('pages.eclipses.name'), slug: 'eclipses/' }, { name: t('seo.gr.short', { y: year }) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('ec.eye'))}</p><h1>${esc(t('seo.gr.h1', { y: year }))}</h1><p class="lede">${esc(t('seo.gr.lede', { y: year, n: ecl.length, v: visN }))}</p></div>
  <div class="ecl-list">${cards || `<p class="empty">${esc(t('ec.none'))}</p>`}</div>
  <p class="muted small">${esc(t('seo.gr.note'))}</p>
  ${h.cta(t('seo.gr.cta'), 'eclipses/', t('seo.gr.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.fe.lists'), S_YEARS().filter(y => y !== year).map(y => h.link(`grahan-${y}/`, t('seo.gr.short', { y }))))}
  ${moreLinks(h, { year })}
</main>`;
  return pageObj(h, { id: 'grahan', slug: `grahan-${year}/`, title: t('seo.gr.title', { y: year }), desc: t('seo.gr.lede', { y: year, n: ecl.length, v: visN }), h1: t('seo.gr.h1', { y: year }), body, faq, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => L2.pages.eclipses.name, slug: 'eclipses/' }, { name: L2 => S.tr(L2, 'seo.gr.short', { y: year }), slug: `grahan-${year}/` }] });
}

function muhuratPage(lang, purpose, word, year) {
  const h = H(lang), { t } = h, months = muhuratYear(purpose, year), total = months.reduce((s, m) => s + m.length, 0);
  const sec = months.map((ds, i) => { const mdt = new Date(Date.UTC(year, i, 1)); return `<section class="card mu-month"><h2 class="h4">${esc(h.fMonthY.format(mdt))} <span class="tag">${ds.length}</span></h2>${ds.length ? `<ul class="seo-list">${ds.map(w => { const a = h.local(w.start, 330), b = h.local(w.end, 330), dt = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())), next = b.getUTCDate() !== a.getUTCDate(); return `<li><span><b>${esc(h.fDM.format(dt))}</b> <small class="muted">${esc(h.fWd.format(dt))}</small></span><span class="num">${h.range(w, 330)}${next ? ' <small class="muted">(+1)</small>' : ''}</span><span class="muted small">${esc(h.tithi(w.tithi))} · ${esc(h.nak(w.nak))}</span></li>`; }).join('')}</ul>` : `<p class="muted small">${esc(t('seo.mh.none'))}</p>`}</section>`; }).join('');
  const busiest = months.map((m, i) => ({ i, n: m.length })).sort((a, b) => b.n - a.n).slice(0, 3).filter(x => x.n).map(x => h.fMonth.format(new Date(Date.UTC(year, x.i, 1))));
  const faq = [{ q: t(`seo.mh.${purpose}.fq`, { y: year }), a: t('seo.mh.fa1', { n: total, y: year, list: list(h.L, busiest) }) }, { q: t('seo.mh.fq2'), a: t(`seo.mh.${purpose}.rule`) }];
  const others = D.MUHURAT.filter(x => x[0] !== purpose).map(([p, w]) => h.link(`muhurat/${w}-${year}/`, t(`seo.mh.${p}.short`, { y: year }))).concat(S_YEARS().filter(y => y !== year).map(y => h.link(`muhurat/${word}-${y}/`, t(`seo.mh.${purpose}.short`, { y }))));
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.mh.index'), slug: 'muhurat/' }, { name: t(`seo.mh.${purpose}.short`, { y: year }) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('pages.muhurta.name'))}</p><h1>${esc(t(`seo.mh.${purpose}.h1`, { y: year }))}</h1><p class="lede">${esc(t('seo.mh.lede', { n: total, y: year }))}</p></div>
  <div class="card prose"><p>${esc(t(`seo.mh.${purpose}.rule`))}</p></div>
  <div class="mu-months">${sec}</div>
  <p class="muted small">${esc(t('seo.mh.note'))}</p>
  ${h.cta(t('seo.mh.cta'), 'muhurta/', t('seo.mh.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.mh.more'), others)}
  ${moreLinks(h, { year })}
</main>`;
  let muDesc = t(`seo.mh.${purpose}.desc`, { y: year, n: total });
  if (muDesc.length < 110) muDesc += ' ' + t(`seo.mh.${purpose}.rule`);
  return pageObj(h, { id: 'muhurat', slug: `muhurat/${word}-${year}/`, title: t(`seo.mh.${purpose}.title`, { y: year }), desc: muDesc, h1: t(`seo.mh.${purpose}.h1`, { y: year }), body, faq, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.mh.index, slug: 'muhurat/' }, { name: L2 => S.tr(L2, `seo.mh.${purpose}.short`, { y: year }), slug: `muhurat/${word}-${year}/` }] });
}
function muhuratIndex(lang) {
  const h = H(lang), { t } = h, years = S_YEARS();
  const cards = D.MUHURAT.map(([p, w]) => `<article class="card"><h2 class="h4">${esc(t(`mu.p.${p}`))}</h2><div class="meta">${years.map(y => h.link(`muhurat/${w}-${y}/`, t(`seo.mh.${p}.short`, { y }))).join('')}</div></article>`).join('');
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.mh.index') }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('pages.muhurta.name'))}</p><h1>${esc(t('seo.mh.indexH1', { a: years[0], b: years[1] }))}</h1><p class="lede">${esc(t('seo.mh.indexLede'))}</p></div>
  <div class="seo-cards">${cards}</div>
  ${h.cta(t('seo.mh.cta'), 'muhurta/', t('seo.mh.ctaBtn'))}
  ${moreLinks(h, { year: years[0] })}
</main>`;
  return pageObj(h, { id: 'muhurat-index', slug: 'muhurat/', title: t('seo.mh.indexTitle', { a: years[0], b: years[1] }), desc: t('seo.mh.indexLede'), h1: t('seo.mh.indexH1', { a: years[0], b: years[1] }), body, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.mh.index, slug: 'muhurat/' }] });
}

function rashiYearPage(lang, s, year) {
  const h = H(lang), { t, gr } = h, data = rashiYear(year), r = h.rashi(s);
  const avg = (a, k) => Math.max(1, Math.min(5, Math.round(a[k] / a.n)));
  const rows = data.months.map((ms, i) => { const a = ms[s]; return { i, a, o: a.stars / a.n }; });
  const best = rows.slice().sort((x, y) => y.o - x.o).slice(0, 3).map(x => h.fMonth.format(new Date(Date.UTC(year, x.i, 1))));
  const hard = rows.slice().sort((x, y) => x.o - y.o).slice(0, 2).map(x => h.fMonth.format(new Date(Date.UTC(year, x.i, 1))));
  const houseOf = sign => (sign - s + 12) % 12 + 1;
  const transitLine = (p, sign, at) => { const hh = houseOf(sign), good = S.GOCHAR_GOOD[p].includes(hh); return `<li class="${good ? 'good' : 'bad'}">${at ? `<span class="num">${esc(h.fDate.format(h.local(at, 330)))}</span> ` : ''}<b>${esc(t('seo.ry.enters', { g: gr(p), r: h.rashi(sign) }))}</b> — ${esc(t('seo.ry.house', { h: hh, m: h.L.names.house[hh - 1] }))} <span class="tag ${good ? 'good' : 'bad'}">${esc(t(good ? 'seo.ry.fav' : 'seo.ry.unfav'))}</span></li>`; };
  const start = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'].map(p => `<li>${esc(t('seo.ry.startsIn', { g: gr(p), r: h.rashi(data.startSigns[p]), h: houseOf(data.startSigns[p]) }))}</li>`).join('');
  const moves = data.moves.sort((a, b) => a.at - b.at).flatMap(mv => mv.planet === 'Rahu' ? [transitLine('Rahu', mv.sign, mv.at), transitLine('Ketu', (mv.sign + 6) % 12, mv.at)] : [transitLine(mv.planet, mv.sign, mv.at)]).join('');
  const ss = saturnIn([(s + 11) % 12, s, (s + 1) % 12]).find(x => x.start < Date.UTC(year + 1, 0, 1) && x.end > Date.UTC(year, 0, 1));
  const ecl = eclipsesYear(year).map(e => `<li>${esc(h.fDate.format(h.local(e.max, 330)))} — ${esc(t(`ec.k.${e.kind}.${e.type}`))} · ${esc(t('seo.ry.house', { h: houseOf(e.sign), m: h.L.names.house[houseOf(e.sign) - 1] }))}</li>`).join('');
  const faq = [{ q: t('seo.ry.fq1', { r, y: year }), a: t('seo.ry.fa1', { list: list(h.L, best) }) }, { q: t('seo.ry.fq2', { r, y: year }), a: ss ? t('seo.ry.faSs', { a: h.fDate.format(new Date(ss.start)), b: h.fDate.format(new Date(ss.end)) }) : t('seo.ry.faNoSs', { r, y: year }) }];
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('pages.rashifal.name'), slug: 'rashifal/' }, { name: r, slug: `rashifal/${SIGN_SLUG[s]}/` }, { name: String(year) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.ry.eye'))}</p><h1>${esc(t('seo.ry.h1', { r, y: year, w: t('seo.west.' + s) }))}</h1><p class="lede">${esc(t('seo.ry.lede', { r, y: year, b: list(h.L, best), c: list(h.L, hard) }))}</p></div>
  <h2 class="sub-h">${esc(t('seo.ry.monthly'))}</h2><div class="card seo-tablewrap"><table class="seo-table ry-table"><thead><tr><th>${esc(t('seo.ry.month'))}</th><th>${esc(t('seo.ry.overall'))}</th>${['career', 'money', 'love', 'health'].map(a => `<th>${esc(t('rf.area.' + a))}</th>`).join('')}</tr></thead><tbody>${rows.map(({ i, a }) => `<tr><td>${esc(h.fMonth.format(new Date(Date.UTC(year, i, 1))))}</td><td>${h.stars(avg(a, 'stars'))}</td>${['career', 'money', 'love', 'health'].map(k => `<td>${h.stars(avg(a, k))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <h2 class="sub-h">${esc(t('seo.ry.transits', { y: year }))}</h2><div class="card prose"><ul>${start}</ul>${moves ? `<ul class="seo-tr">${moves}</ul>` : ''}</div>
  <div class="card prose"><h2>${esc(t('seo.ry.ssH'))}</h2><p>${esc(ss ? t('seo.ry.faSs', { a: h.fDate.format(new Date(ss.start)), b: h.fDate.format(new Date(ss.end)) }) : t('seo.ry.faNoSs', { r, y: year }))} <a href="${h.base}sade-sati/${SIGN_SLUG[s]}/">${esc(t('seo.ss.short'))}</a></p>${ecl ? `<h2>${esc(t('seo.ry.eclH'))}</h2><ul>${ecl}</ul>` : ''}</div>
  <p class="muted small">${esc(t('seo.ry.note'))}</p>
  ${h.cta(t('seo.rd.cta'), '', t('seo.rd.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.rd.allSigns'), SIGN_SLUG.map((sl, i) => i === s ? `<span class="tag gold">${esc(h.rashi(i))}</span>` : h.link(`rashifal/${sl}/${year}/`, h.rashi(i))))}
  ${moreLinks(h, { year }, { sign: s })}
</main>`;
  return pageObj(h, { id: 'sign-year', slug: `rashifal/${SIGN_SLUG[s]}/${year}/`, title: t('seo.ry.title', { r, y: year, w: t('seo.west.' + s) }), desc: t('seo.ry.lede', { r, y: year, b: list(h.L, best), c: list(h.L, hard) }), h1: t('seo.ry.h1', { r, y: year, w: t('seo.west.' + s) }), body, faq, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => L2.pages.rashifal.name, slug: 'rashifal/' }, { name: L2 => L2.names.rashi[s], slug: `rashifal/${SIGN_SLUG[s]}/` }, { name: () => String(year), slug: `rashifal/${SIGN_SLUG[s]}/${year}/` }] });
}

function sadeSatiPage(lang, s) {
  const h = H(lang), { t } = h, r = h.rashi(s), now = Date.now();
  const ss = saturnIn([(s + 11) % 12, s, (s + 1) % 12]).filter(x => x.end > Date.UTC(1990, 0, 1));
  const dh = [3, 7].map(k => ({ k, iv: saturnIn([(s + k) % 12]).filter(x => x.end > Date.UTC(1990, 0, 1)) }));
  const phase = sign => sign === (s + 11) % 12 ? 'rising' : sign === s ? 'peak' : 'setting';
  const fd = ms => h.fDate.format(h.local(ms, 330)), fs = ms => h.fShort.format(h.local(ms, 330));
  const cur = ss.find(x => x.start <= now && x.end > now), next = ss.find(x => x.start > now);
  const curDh = dh.flatMap(d => d.iv.filter(x => x.start <= now && x.end > now).map(x => ({ ...x, k: d.k })))[0];
  const status = cur ? t('seo.ss.nowIn', { r, a: fd(cur.start), b: fd(cur.end), p: t('seo.ss.ph.' + phase(cur.parts.find(p => p.start <= now && p.end > now).sign)) }) : t('seo.ss.notIn', { r, a: next ? fd(next.start) : '—' });
  const rows = ss.map(x => `<tr class="${x.start <= now && x.end > now ? 'live' : ''}"><td><b class="num">${esc(fs(x.start))} – ${esc(fs(x.end))}</b>${x.parts.map(p => `<div class="small"><span>${esc(t('seo.ss.ph.' + phase(p.sign)))}</span> <span class="muted">${esc(fs(p.start))} – ${esc(fs(p.end))}</span></div>`).join('')}</td></tr>`).join('');
  const dhRows = dh.flatMap(d => d.iv.map(x => ({ ...x, k: d.k }))).sort((a, b) => a.start - b.start).filter(x => x.end > Date.UTC(2000, 0, 1) && x.start < Date.UTC(2050, 0, 1)).map(x => `<tr><td class="num">${esc(fs(x.start))} – ${esc(fs(x.end))}</td><td>${esc(t(x.k === 3 ? 'seo.ss.kantak' : 'seo.ss.ashtama'))}</td></tr>`).join('');
  const faq = [{ q: t('seo.ss.fq1', { r }), a: status }, { q: t('seo.ss.fq2', { r }), a: next ? t('seo.ss.fa2', { r, a: fd(next.start), b: fd(next.end) }) : '—' }, { q: t('seo.ss.fq3'), a: t('seo.ss.fa3') }];
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.ss.index'), slug: 'sade-sati/' }, { name: r }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.ss.eye'))}</p><h1>${esc(t('seo.ss.h1', { r }))}</h1><p class="lede">${esc(status)}</p></div>
  <h2 class="sub-h">${esc(t('seo.ss.periods'))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.ss.period'))} · ${esc(t('seo.ss.phases'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
  ${curDh ? `<p class="tag bad">${esc(t('seo.ss.dhNow', { k: t(curDh.k === 3 ? 'seo.ss.kantak' : 'seo.ss.ashtama'), b: fd(curDh.end) }))}</p>` : ''}
  <h2 class="sub-h">${esc(t('seo.ss.dhaiyaH'))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.ss.period'))}</th><th>${esc(t('seo.ss.kind'))}</th></tr></thead><tbody>${dhRows}</tbody></table></div>
  <div class="card prose"><h2>${esc(t('seo.ss.aboutH'))}</h2><p>${esc(t('seo.ss.about1'))}</p><p>${esc(t('seo.ss.about2'))}</p><p><a href="${h.base}learn/sade-sati-dosha/">${esc(t('seo.ds.sade-sati.title'))}</a></p></div>
  ${h.cta(t('seo.ss.cta'), '', t('seo.rd.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.ss.allSigns'), SIGN_SLUG.map((sl, i) => i === s ? `<span class="tag gold">${esc(h.rashi(i))}</span>` : h.link(`sade-sati/${sl}/`, h.rashi(i))))}
  ${moreLinks(h, { year: S_YEARS()[0] }, { sign: s })}
</main>`;
  let ssDesc = status;
  if (ssDesc.length < 110 && !cur && next) ssDesc += ' ' + t('seo.ss.fa2', { r, a: fd(next.start), b: fd(next.end) });
  if (ssDesc.length < 110) ssDesc += ' ' + t('seo.ss.about1');
  return pageObj(h, { id: 'sade-sati', slug: `sade-sati/${SIGN_SLUG[s]}/`, title: t('seo.ss.title', { r }), desc: ssDesc, h1: t('seo.ss.h1', { r }), body, faq, priority: '0.7', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.ss.index, slug: 'sade-sati/' }, { name: L2 => L2.names.rashi[s], slug: `sade-sati/${SIGN_SLUG[s]}/` }] });
}
function sadeSatiIndex(lang) {
  const h = H(lang), { t } = h, now = Date.now();
  const rows = SIGN_SLUG.map((sl, s) => { const ss = saturnIn([(s + 11) % 12, s, (s + 1) % 12]); const cur = ss.find(x => x.start <= now && x.end > now), next = ss.find(x => x.start > now);
    return `<tr class="${cur ? 'live' : ''}"><td><a href="${h.base}sade-sati/${sl}/">${esc(h.rashi(s))}</a></td><td>${esc(cur ? t('seo.ss.yes', { b: h.fDate.format(new Date(cur.end)) }) : t('seo.ss.no'))}</td><td>${esc(next ? h.fDate.format(new Date(next.start)) : '—')}</td></tr>`; }).join('');
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.ss.index') }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.ss.eye'))}</p><h1>${esc(t('seo.ss.indexH1'))}</h1><p class="lede">${esc(t('seo.ss.indexLede'))}</p></div>
  <div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('pp.moonSign'))}</th><th>${esc(t('seo.ss.now'))}</th><th>${esc(t('seo.ss.next'))}</th></tr></thead><tbody>${rows}</tbody></table></div>
  <div class="card prose"><h2>${esc(t('seo.ss.aboutH'))}</h2><p>${esc(t('seo.ss.about1'))}</p><p>${esc(t('seo.ss.about2'))}</p></div>
  ${h.cta(t('seo.ss.cta'), '', t('seo.rd.ctaBtn'))}
  ${moreLinks(h, { year: S_YEARS()[0] })}
</main>`;
  return pageObj(h, { id: 'sade-sati-index', slug: 'sade-sati/', title: t('seo.ss.indexTitle'), desc: t('seo.ss.indexLede'), h1: t('seo.ss.indexH1'), body, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.ss.index, slug: 'sade-sati/' }] });
}

// ===================== LEARN (static) =====================
const learnCrumb = (name, slug) => [{ name: L2 => L2.lp.indexH1, slug: 'learn/' }, { name, slug }];
function article(h, { eye, h1, lede, icon = '', html }) {
  return `<main class="wrap page article seo-page">${h.crumbsHtml([{ name: h.L.lp.indexH1, slug: 'learn/' }, { name: h1 }])}
  <div class="article-head">${icon}<div><p class="eyebrow">${esc(eye)}</p><h1>${esc(h1)}</h1>${lede ? `<p class="lede">${esc(lede)}</p>` : ''}</div></div>${html}</main>`;
}
const factTable = rows => `<div class="card seo-tablewrap"><table class="seo-table facts"><tbody>${rows.filter(Boolean).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join('')}</tbody></table></div>`;

function nakshatraPage(lang, i) {
  const h = H(lang), { t, L, gr } = h, n = D.NAK[i], name = h.nak(i), lord = J.DASHA_ORDER[i % 9];
  const s0 = i * 13 + 1 / 3, startDeg = i * 40 / 3, endDeg = startDeg + 40 / 3;
  const dms = x => { const s = Math.floor(x / 30), d = x - s * 30, dd = Math.floor(d + 1e-9), mm = Math.round((d - dd) * 60); return `${h.rashi(s)} ${dd}°${mm ? ' ' + mm + '′' : ''}`; };
  const padas = [1, 2, 3, 4].map(p => `<li><b>${esc(t('seo.nk.pada', { n: p }))}</b> · ${esc(dms(startDeg + (p - 1) * 10 / 3))} – ${esc(dms(startDeg + p * 10 / 3))} · ${esc(t('seo.nk.navamsa', { r: h.rashi((i * 4 + p - 1) % 12) }))} · ${esc(t('seo.nk.syll'))}: <b>${esc(L.names.syll[i][p - 1])}</b></li>`).join('');
  const sign = Math.floor(startDeg / 30);
  const others = Array.from({ length: 27 }, (_, j) => j).filter(j => j !== i).map(j => { const B = { moonSign: Math.floor((j * 40 / 3 + 1) / 30), nak: j, pada: 2, moonDeg: 0 }; B.av = MT.avFor(B.moonSign, j, 10); const A0 = { moonSign: Math.floor((startDeg + 1) / 30), nak: i, pada: 2, moonDeg: 0 }; A0.av = MT.avFor(A0.moonSign, i, 10); return { j, sc: MT.kootas(A0, B).reduce((s, k) => s + k.score, 0) }; }).sort((a, b) => b.sc - a.sc);
  const gana = { D: 'Deva', M: 'Manushya', R: 'Rakshasa' }[J.GANA[i]];
  const gem = D.GEMS.find(g => g.planet === lord);
  const html = `${factTable([
    [t('seo.nk.span'), esc(`${dms(startDeg)} – ${dms(endDeg)}`)], [t('seo.nk.lord'), esc(gr(lord))], [t('seo.nk.deity'), esc(t('seo.deity.' + n.deity))], [t('seo.nk.symbol'), esc(t('seo.symbol.' + n.symbol))],
    [t('seo.nk.gana'), esc(t('seo.gana.' + gana))], [t('seo.nk.yoni'), esc(t('seo.yoni.' + J.YONI[i]))], [t('seo.nk.nadi'), esc(t('seo.nadi.' + J.NADI_P[i % 6]))],
    [t('seo.nk.rashi'), esc(list(L, [...new Set([sign, Math.floor((endDeg - 0.01) / 30)])].map(h.rashi)))], [t('seo.nk.gem'), `<a href="${h.base}learn/${gem.slug}-gemstone/">${esc(t('gm.g.' + gem.gem))}</a>`]
  ])}
  <div class="card prose"><h2>${esc(t('seo.nk.natureH', { n: name }))}</h2><p>${esc(t('seo.nkt.' + i))}</p><p>${esc(t('seo.nk.lordLine', { n: name, g: gr(lord), k: L.names.karaka[lord] }))}</p>
  <h2>${esc(t('seo.nk.padasH'))}</h2><ul>${padas}</ul>
  <h2>${esc(t('seo.nk.matchH'))}</h2><p>${esc(t('seo.nk.best', { list: list(L, others.slice(0, 5).map(o => h.nak(o.j))) }))}</p><p>${esc(t('seo.nk.hard', { list: list(L, others.slice(-3).map(o => h.nak(o.j))) }))}</p><p class="muted small">${esc(t('seo.nk.matchNote'))}</p></div>
  ${h.cta(t('seo.nk.namesCta', { n: name }), 'names/', t('seo.nk.namesBtn'))}
  ${h.linkrow(t('seo.nk.all'), D.NAK_SLUG.map((sl, j) => j === i ? `<span class="tag gold">${esc(h.nak(j))}</span>` : h.link(`learn/${sl}-nakshatra/`, h.nak(j))))}`;
  const h1 = t('seo.nk.h1', { n: name }), slug = `learn/${D.NAK_SLUG[i]}-nakshatra/`;
  return pageObj(h, { id: 'learn-nak', slug, article: true, title: t('seo.nk.title', { n: name }), desc: t('seo.nk.desc', { n: name, g: gr(lord), d: t('seo.deity.' + n.deity) }), h1, body: article(h, { eye: t('seo.nk.eye'), h1, lede: t('seo.nkt.' + i).split(/(?<=[.!?।])\s/)[0], icon: gimg(lord, 'gimg xl'), html }), crumbs: learnCrumb(L2 => S.tr(L2, 'seo.nk.h1', { n: L2.names.nak[i] }), slug) });
}

function rashiPage(lang, s) {
  const h = H(lang), { t, L, gr } = h, r = h.rashi(s), lord = J.SIGN_LORD[s], gem = D.GEMS.find(g => g.planet === lord);
  const naks = []; for (let q = s * 9; q < s * 9 + 9; q++) { const n = Math.floor(q / 4); if (!naks.includes(n)) naks.push(n); }
  const compat = Array.from({ length: 12 }, (_, b) => `<tr><td><a href="${h.base}learn/${compatSlug(s, b)}/">${esc(h.rashi(b))}</a></td><td><span class="tag ${{ excellent: 'good', good: 'good', average: '', low: 'bad' }[compatBand(s, b)]}">${esc(t('seo.cm.band.' + compatBand(s, b)))}</span></td></tr>`).join('');
  const html = `${factTable([
    [t('seo.rs.lord'), esc(gr(lord))], [t('seo.rs.element'), esc(L.lp.elem[s % 4])], [t('seo.rs.quality'), esc(L.lp.qual[s % 3])],
    [t('seo.rs.naks'), naks.map(n => `<a href="${h.base}learn/${D.NAK_SLUG[n]}-nakshatra/">${esc(h.nak(n))}</a>`).join(', ')],
    [t('seo.rs.gem'), `<a href="${h.base}learn/${gem.slug}-gemstone/">${esc(t('gm.g.' + gem.gem))}</a>`], [t('seo.rs.day'), esc(L.names.vara[WEEKDAY_OF[lord]])], [t('seo.rs.number'), String(LUCKY_NUM[lord])],
    [t('seo.rs.exalted'), esc(list(L, PLANETS9.slice(0, 7).filter(p => J.EXALT[p] === s).map(gr)) || '—')]
  ])}
  <div class="card prose"><h2>${esc(t('seo.rs.natureH', { r }))}</h2><p>${esc(t('seo.rst.' + s))}</p><p>${esc(t('seo.rs.lordLine', { r, g: gr(lord), k: L.names.karaka[lord] }))}</p></div>
  <h2 class="sub-h">${esc(t('seo.rs.compatH', { r }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><tbody>${compat}</tbody></table></div>
  ${h.cta(t('seo.rd.cta'), '', t('seo.rd.ctaBtn'))}
  ${moreLinks(h, { year: S_YEARS()[0] }, { sign: s })}`;
  const h1 = t('seo.rs.h1', { r, w: t('seo.west.' + s) }), slug = `learn/${SIGN_SLUG[s]}-rashi/`;
  return pageObj(h, { id: 'learn-rashi', slug, article: true, title: t('seo.rs.title', { r, w: t('seo.west.' + s) }), desc: t('seo.rs.desc', { r, g: gr(lord) }), h1, body: article(h, { eye: t('seo.rs.eye'), h1, lede: t('seo.rst.' + s).split(/(?<=[.!?।])\s/)[0], icon: `<svg class="rg xl" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${s}"/></svg>`, html }), crumbs: learnCrumb(L2 => S.tr(L2, 'seo.rs.h1', { r: L2.names.rashi[s], w: S.tr(L2, 'seo.west.' + s) }), slug) });
}

const compatSlug = (a, b) => { const [x, y] = a <= b ? [a, b] : [b, a]; return `${SIGN_SLUG[x]}-${SIGN_SLUG[y]}-compatibility`; };
function compatPage(lang, a, b) {
  const h = H(lang), { t, L, gr } = h, ra = h.rashi(a), rb = h.rashi(b), x = compatPair(a, b), y = compatPair(b, a), band = compatBand(a, b);
  const kRow = k => `<tr><td>${esc(t('kt.' + k.id + '.name'))}</td><td class="num">${k.score}/${k.max}</td><td class="num">${(a === b ? k : y.signK.find(z => z.id === k.id)).score}/${k.max}</td></tr>`;
  const la = J.SIGN_LORD[a], lb = J.SIGN_LORD[b], rel = MT.relation(la, lb), rel2 = MT.relation(lb, la);
  const dist = (b - a + 12) % 12 + 1, dd = (a - b + 12) % 12 + 1;
  const bad = [[2, 12], [12, 2], [5, 9], [9, 5], [6, 8], [8, 6]].some(([p, q]) => p === dist && q === dd);
  const elemA = a % 4, elemB = b % 4, elemKey = elemA === elemB ? 'same' : (elemA + elemB) % 2 === 0 ? 'friendly' : 'mixed'; // fire+air, earth+water friendly
  const lines = [t('seo.cm.elem.' + elemKey, { a: L.lp.elem[elemA], b: L.lp.elem[elemB] }), la === lb ? t('seo.cm.sameLord', { g: gr(la) }) : t('seo.cm.lords', { a: gr(la), b: gr(lb), r1: t('seo.rel.' + rel), r2: t('seo.rel.' + rel2) }), bad ? t('seo.cm.bhakootBad', { d: `${dist}/${dd}` }) + (la === lb || (rel === 'F' && rel2 === 'F') ? ' ' + t('seo.cm.bhakootCancel') : '') : t('seo.cm.bhakootOk', { d: `${dist}/${dd}` })];
  const html = `<div class="card seo-sum"><div><span class="eyebrow">${esc(t('seo.cm.verdict'))}</span><p class="seo-big"><span class="tag ${{ excellent: 'good', good: 'good', average: '', low: 'bad' }[band]}">${esc(t('seo.cm.band.' + band))}</span></p></div>
    <dl class="seo-kv"><div><dt>${esc(t('seo.cm.range'))}</dt><dd class="num">${Math.min(x.min, y.min)}–${Math.max(x.max, y.max)} / 36</dd></div><div><dt>${esc(t('seo.cm.avg'))}</dt><dd class="num">${((x.avg + y.avg) / 2).toFixed(1)} / 36</dd></div><div><dt>${esc(t('seo.cm.pass'))}</dt><dd class="num">${Math.round((x.good + y.good) / 2 * 100)}%</dd></div></dl></div>
  <div class="card prose"><h2>${esc(t('seo.cm.whyH'))}</h2>${lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>
  <h2 class="sub-h">${esc(t('seo.cm.signK'))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.cm.koota'))}</th><th>${esc(t('seo.cm.boyGirl', { a: ra, b: rb }))}</th><th>${esc(t('seo.cm.boyGirl', { a: rb, b: ra }))}</th></tr></thead><tbody>${x.signK.map(kRow).join('')}</tbody></table></div>
  <p class="muted small">${esc(t('seo.cm.note'))}</p>
  ${h.cta(t('seo.cm.cta'), 'matching/', t('seo.cm.ctaBtn'))}
  ${h.linkrow(t('seo.cm.moreA', { r: ra }), Array.from({ length: 12 }, (_, j) => j).filter(j => j !== b).map(j => h.link(`learn/${compatSlug(a, j)}/`, `${ra} + ${h.rashi(j)}`)))}
  ${a !== b ? h.linkrow(t('seo.cm.moreA', { r: rb }), Array.from({ length: 12 }, (_, j) => j).filter(j => j !== a).map(j => h.link(`learn/${compatSlug(b, j)}/`, `${rb} + ${h.rashi(j)}`))) : ''}`;
  const h1 = t('seo.cm.h1', { a: ra, b: rb }), slug = `learn/${compatSlug(a, b)}/`;
  return pageObj(h, { id: 'learn-compat', slug, article: true, title: t('seo.cm.title', { a: ra, b: rb }), desc: t('seo.cm.desc', { a: ra, b: rb, band: t('seo.cm.band.' + band), lo: Math.min(x.min, y.min), hi: Math.max(x.max, y.max) }), h1, body: article(h, { eye: t('seo.cm.eye'), h1, lede: t('seo.cm.lede', { a: ra, b: rb }), html }), crumbs: learnCrumb(L2 => S.tr(L2, 'seo.cm.h1', { a: L2.names.rashi[a], b: L2.names.rashi[b] }), slug) });
}

function doshaPage(lang, id) {
  const h = H(lang), { t } = h, k = `seo.ds.${id}`;
  const sec = ['what', 'check', 'effects', 'cancel', 'remedies'].map(s => `<h2>${esc(t(`${k}.${s}H`))}</h2>${[].concat(h.L.seo.ds[id][s]).map(p => `<p>${esc(p)}</p>`).join('')}`).join('');
  const extra = id === 'sade-sati' ? h.linkrow(t('seo.ss.allSigns'), SIGN_SLUG.map((sl, i) => h.link(`sade-sati/${sl}/`, h.rashi(i)))) : '';
  const html = `<div class="card prose">${sec}<p class="muted small">${esc(h.L.lp.disclaimer)}</p></div>${h.cta(t('seo.ds.cta'), '', t('seo.rd.ctaBtn'))}${extra}
  ${h.linkrow(t('seo.ds.more'), D.DOSHAS.filter(d => d !== id).map(d => h.link(`learn/${d}-dosha/`, t(`seo.ds.${d}.title`))))}`;
  const h1 = t(`${k}.title`), slug = `learn/${id}-dosha/`;
  return pageObj(h, { id: 'learn-dosha', slug, article: true, title: t(`${k}.seoTitle`), desc: t(`${k}.desc`), h1, body: article(h, { eye: t('seo.ds.eye'), h1, lede: t(`${k}.desc`), html }), crumbs: learnCrumb(L2 => L2.seo.ds[id].title, slug) });
}

function gemPage(lang, gi) {
  const h = H(lang), { t, L, gr } = h, g = D.GEMS[gi], name = t('gm.g.' + g.gem), p = g.planet;
  const verdict = s => { const lordOf = hh => J.SIGN_LORD[(s + hh - 1) % 12]; if (p === 'Rahu' || p === 'Ketu') return 'caution'; const hs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(hh => lordOf(hh) === p); const good = hs.some(x => [1, 5, 9].includes(x)), badH = hs.some(x => [6, 8, 12].includes(x)); return good && !badH ? 'suit' : good || hs.includes(4) || hs.includes(10) ? 'caution' : 'avoid'; };
  const rows = SIGN_SLUG.map((sl, s) => { const v = verdict(s); return `<tr><td><a href="${h.base}learn/${sl}-lagna/">${esc(h.rashi(s))}</a></td><td><span class="tag ${v === 'suit' ? 'good' : v === 'avoid' ? 'bad' : ''}">${esc(t('gm.st.' + v))}</span></td></tr>`; }).join('');
  const enemies = PLANETS9.slice(0, 7).filter(q => J.REL[p] && J.REL[p][q] === 'E').map(q => t('gm.g.' + D.GEMS.find(x => x.planet === q).gem));
  const html = `${factTable([[t('seo.gs.planet'), esc(gr(p))], [t('seo.gs.upratna'), esc(list(L, g.upratna.map(u => t('gm.u.' + u))))], [t('seo.gs.metal'), esc(t('seo.metal.' + g.metal))], [t('seo.gs.finger'), esc(t('seo.finger.' + g.finger))], [t('seo.gs.day'), esc(L.names.vara[g.day])], [t('seo.gs.mantra'), esc(L.names.mantra[p] || '')], [t('seo.gs.weight'), esc(t('gm.weightNote'))], enemies.length ? [t('seo.gs.clash'), esc(list(L, enemies))] : null])}
  <div class="card prose"><h2>${esc(t('seo.gs.benefitH', { g: name }))}</h2><p>${esc(t('seo.gs.benefit', { g: name, p: gr(p), k: L.names.karaka[p] }))}</p><h2>${esc(t('gm.energise'))}</h2><p>${esc(t('gm.energiseText', { m: L.names.mantra[p] || '' }))}</p></div>
  <h2 class="sub-h">${esc(t('seo.gs.lagnaH', { g: name }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><tbody>${rows}</tbody></table></div>
  <p class="muted small">${esc(t('gm.disclaimer'))}</p>
  ${h.cta(t('seo.gs.cta'), '', t('seo.rd.ctaBtn'))}
  ${h.linkrow(t('seo.gs.all'), D.GEMS.map((x, j) => j === gi ? `<span class="tag gold">${esc(t('gm.g.' + x.gem))}</span>` : h.link(`learn/${x.slug}-gemstone/`, t('gm.g.' + x.gem))))}`;
  const h1 = t('seo.gs.h1', { g: name }), slug = `learn/${g.slug}-gemstone/`;
  return pageObj(h, { id: 'learn-gem', slug, article: true, title: t('seo.gs.title', { g: name }), desc: t('seo.gs.desc', { g: name, p: gr(p) }), h1, body: article(h, { eye: t('seo.gs.eye'), h1, lede: t('seo.gs.lede', { g: name, p: gr(p) }), icon: gimg(p, 'gimg xl'), html }), crumbs: learnCrumb(L2 => S.tr(L2, 'seo.gs.h1', { g: S.tr(L2, 'gm.g.' + g.gem) }), slug) });
}

function rudrakshaPage(lang, n) {
  const h = H(lang), { t, L, gr } = h, rd = D.RUDRAKSHA[n], p = rd.planet;
  const signs = SIGN_SLUG.map((_, s) => s).filter(s => J.SIGN_LORD[s] === p).map(h.rashi);
  const html = `${factTable([[t('seo.ru.planet'), esc(gr(p))], [t('seo.ru.deity'), esc(t('seo.rdeity.' + rd.deity))], [t('seo.ru.mantra'), esc(L.seo.ru.mantras[n])], signs.length ? [t('seo.ru.signs'), esc(list(L, signs))] : null])}
  <div class="card prose"><h2>${esc(t('seo.ru.benefitH'))}</h2><p>${esc(t('seo.rut.' + n))}</p><h2>${esc(t('gm.rudHow'))}</h2><ol>${L.gm.rudSteps.map(x => `<li>${esc(x)}</li>`).join('')}</ol><p class="muted small">${esc(t('seo.ru.note'))}</p></div>
  ${h.cta(t('seo.gs.cta'), '', t('seo.rd.ctaBtn'))}
  ${h.linkrow(t('seo.ru.all'), Array.from({ length: 14 }, (_, j) => j + 1).map(j => j === n ? `<span class="tag gold">${esc(t('gm.mukhi', { n: j }))}</span>` : h.link(`learn/${j}-mukhi-rudraksha/`, t('gm.mukhi', { n: j }))))}`;
  const h1 = t('seo.ru.h1', { n }), slug = `learn/${n}-mukhi-rudraksha/`;
  return pageObj(h, { id: 'learn-rud', slug, article: true, title: t('seo.ru.title', { n }), desc: t('seo.ru.desc', { n, p: gr(p), d: t('seo.rdeity.' + rd.deity) }), h1, body: article(h, { eye: t('seo.ru.eye'), h1, lede: t('seo.ru.desc', { n, p: gr(p), d: t('seo.rdeity.' + rd.deity) }), html }), crumbs: learnCrumb(L2 => S.tr(L2, 'seo.ru.h1', { n }), slug) });
}

// Learn index extra sections (appended to build.js learnIndex)
function learnIndexExtra(lang) {
  const h = H(lang), { t } = h;
  const grid = cells => `<div class="meta linkrow seo-links">${cells.join('')}</div>`;
  const cm = `<div class="card seo-tablewrap"><table class="seo-table cm-grid"><thead><tr><th></th>${SIGN_SLUG.map((_, b) => `<th>${esc(h.L.names.rashi[b].slice(0, 4))}</th>`).join('')}</tr></thead><tbody>${SIGN_SLUG.map((_, a) => `<tr><th>${esc(h.rashi(a))}</th>${SIGN_SLUG.map((__, b) => { const band = compatBand(a, b); return `<td class="cm-${band}"><a href="${h.base}learn/${compatSlug(a, b)}/" title="${esc(h.rashi(a) + ' + ' + h.rashi(b))}">${esc(t('seo.cm.short.' + band))}</a></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `<h2 class="sub-h">${esc(t('seo.nk.all'))}</h2>${grid(D.NAK_SLUG.map((sl, i) => h.link(`learn/${sl}-nakshatra/`, h.nak(i))))}
  <h2 class="sub-h">${esc(t('seo.rs.all'))}</h2>${grid(SIGN_SLUG.map((sl, s) => h.link(`learn/${sl}-rashi/`, h.rashi(s))))}
  <h2 class="sub-h">${esc(t('seo.cm.indexH'))}</h2>${cm}
  <h2 class="sub-h">${esc(t('seo.ds.more'))}</h2>${grid(D.DOSHAS.map(d => h.link(`learn/${d}-dosha/`, t(`seo.ds.${d}.title`))))}
  <h2 class="sub-h">${esc(t('seo.gs.all'))}</h2>${grid(D.GEMS.map(g => h.link(`learn/${g.slug}-gemstone/`, t('gm.g.' + g.gem))))}
  <h2 class="sub-h">${esc(t('seo.ru.all'))}</h2>${grid(Array.from({ length: 14 }, (_, j) => h.link(`learn/${j + 1}-mukhi-rudraksha/`, t('gm.mukhi', { n: j + 1 }))))}
  <h2 class="sub-h">${esc(t('seo.md.all'))}</h2>${grid(J.DASHA_ORDER.map(p => h.link(`learn/${p.toLowerCase()}-mahadasha/`, t('seo.md.short', { g: h.gr(p) }))))}
  <h2 class="sub-h">${esc(t('seo.yg.all'))}</h2>${grid(require('./seo-pages2.js').YOGAS.map(([id, sl]) => h.link(`learn/${sl}-yoga/`, h.L.yoga[id].name)))}
  <h2 class="sub-h">${esc(t('seo.ps.indexH'))}</h2><div class="card seo-tablewrap"><table class="seo-table ps-grid"><thead><tr><th></th>${SIGN_SLUG.map((_, b) => `<th>${esc(h.rashi(b))}</th>`).join('')}</tr></thead><tbody>${PLANETS9.map(p => `<tr><th>${esc(h.gr(p))}</th>${SIGN_SLUG.map((sl, b) => `<td><a href="${h.base}learn/${p.toLowerCase()}-in-${sl}/" title="${esc(t('seo.ps.short', { g: h.gr(p), r: h.rashi(b) }))}">${esc(h.rashi(b).slice(0, 3))}</a></td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <h2 class="sub-h">${esc(t('seo.nu.hubMu'))}</h2>${grid([h.link('numerology/', t('pages.numerology.name'), 'tag gold'), ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => h.link(`numerology/mulank-${n}/`, t('seo.nu.muShort', { n })))])}
  <h2 class="sub-h">${esc(t('seo.bn.index'))}</h2>${grid([h.link('baby-names/', t('seo.bn.indexH1'), 'tag gold'), ...D.NAK_SLUG.slice(0, 9).map((sl, i) => h.link(`baby-names/${sl}-nakshatra/`, t('seo.bn.nakH1', { n: h.nak(i) })))])}`;
}

// Hub links placed into existing tool pages (<!--SEOLINKS:id-->)
function hubLinks(lang, id) {
  const h = H(lang), { t } = h, Y = S_YEARS();
  const cities = D.TOP_CITIES.map(s => D.CITY[s]);
  const blocks = {
    panchang: () => h.linkrow(t('seo.hub.cities'), cities.map(c => h.link(`panchang/${c.slug}/`, h.city(c))).concat([h.link('panchang/cities/', t('seo.cp.allCities'), 'tag gold'), h.link('rahu-kaal/', t('seo.rk.index'), 'tag gold'), h.link('choghadiya/', t('seo.ch.index'), 'tag gold')])),
    rashifal: () => h.linkrow(t('seo.hub.signs'), SIGN_SLUG.map((sl, s) => h.link(`rashifal/${sl}/`, h.rashi(s)))) + h.linkrow(t('seo.rw.eye'), SIGN_SLUG.map((sl, s) => h.link(`rashifal/${sl}/weekly/`, h.rashi(s)))) + h.linkrow(t('seo.rm.eye'), SIGN_SLUG.map((sl, s) => h.link(`rashifal/${sl}/monthly/`, h.rashi(s)))) + h.linkrow(t('seo.hub.signsYear', { y: Y[1] }), SIGN_SLUG.map((sl, s) => h.link(`rashifal/${sl}/${Y[1]}/`, `${h.rashi(s)} ${Y[1]}`))) + h.linkrow(t('seo.ss.index'), [h.link('sade-sati/', t('seo.ss.indexH1'))]),
    calendar: () => Y.map(y => h.linkrow(t('seo.mc.yearShort', { y }), [h.link(`calendar/${y}/`, t('seo.mc.yearShort', { y }), 'tag gold'), ...Array.from({ length: 12 }, (_, m) => h.link(`calendar/${y}/${MONTHS[m]}/`, h.fMonth.format(new Date(Date.UTC(y, m, 1)))))])).join('') + h.linkrow(t('seo.fe.lists'), [h.link('festivals/', t('seo.fe.indexName'), 'tag gold'), ...Y.flatMap(y => D.VRAT_LISTS.map(([k, w]) => h.link(`${w}-${y}/`, t(`seo.vl.${k}.short`, { y }))))]),
    muhurta: () => h.linkrow(t('seo.mh.more'), [h.link('muhurat/', t('seo.mh.index'), 'tag gold'), ...Y.flatMap(y => D.MUHURAT.map(([p, w]) => h.link(`muhurat/${w}-${y}/`, t(`seo.mh.${p}.short`, { y }))))]),
    eclipses: () => h.linkrow(t('seo.fe.lists'), Y.map(y => h.link(`grahan-${y}/`, t('seo.gr.short', { y })))) + h.linkrow(t('seo.gt.index'), [h.link('transit/', t('seo.gt.index'), 'tag gold'), ...Y.flatMap(y => ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].map(p => h.link(`retrograde/${p.toLowerCase()}-${y}/`, t('seo.rt.short', { g: h.gr(p), y }))))]),
    puja: () => h.linkrow(t('seo.pv.more'), Object.keys(FG.GUIDES).map(id => h.link(`puja/${kebab(id)}/`, t('seo.pv.short', { f: h.L.fest[id] })))) + h.linkrow(t('seo.fe.lists'), [h.link('festivals/', t('seo.fe.indexName'), 'tag gold'), ...Object.keys(FG.GUIDES).map(id => h.link(`festivals/${kebab(id)}-${Y[0]}/`, `${h.L.fest[id]} ${Y[0]}`))]),
    vrat: () => h.linkrow(t('seo.fe.lists'), Y.flatMap(y => D.VRAT_LISTS.map(([k, w]) => h.link(`${w}-${y}/`, t(`seo.vl.${k}.short`, { y }))))),
    matching: () => h.linkrow(t('seo.cm.indexH'), SIGN_SLUG.map((sl, s) => h.link(`learn/${sl}-rashi/`, h.rashi(s)))),
    numerology: () => require('./seo-pages3.js').numerologyHub(lang),
    names: () => h.linkrow(t('seo.nu.hubGuides'), [h.link('numerology/name-numerology/', t('seo.nu.nmH1'), 'tag gold'), h.link('numerology/', t('pages.numerology.name'))]) + h.linkrow(t('seo.bn.byNak'), [h.link('baby-names/', t('seo.bn.index'), 'tag gold'), ...D.NAK_SLUG.map((sl, i) => h.link(`baby-names/${sl}-nakshatra/`, h.nak(i)))]) + h.linkrow(t('seo.nk.all'), D.NAK_SLUG.map((sl, i) => h.link(`learn/${sl}-nakshatra/`, h.nak(i)))),
    footer: () => `<nav class="foot-seo no-print" aria-label="${esc(t('seo.links.popular'))}">${cities.slice(0, 8).map(c => h.link(`panchang/${c.slug}/`, t('seo.cp.inCity', { c: h.city(c) }), '')).join('')}${h.link('matching/', (h.L.pages.matching && h.L.pages.matching.name) || 'Kundali Matching', '')}${h.link('rahu-kaal/', t('seo.rk.index'), '')}${h.link('choghadiya/', t('seo.ch.index'), '')}${h.link('festivals/', t('seo.fe.indexName'), '')}${h.link(`ekadashi-${Y[0]}/`, t('seo.vl.ekadashi.short', { y: Y[0] }), '')}${h.link('muhurat/', t('seo.mh.index'), '')}${h.link(`muhurat/vivah-${Y[1]}/`, t('seo.mh.marriage.short', { y: Y[1] }), '')}${h.link('sade-sati/', t('seo.ss.index'), '')}${h.link('transit/', t('seo.gt.index'), '')}${h.link(`calendar/${Y[0]}/`, t('seo.mc.yearShort', { y: Y[0] }), '')}${h.link('baby-names/', t('seo.bn.index'), '')}${h.link('numerology/', t('pages.numerology.name'), '')}${h.link('prashna/', (h.L.pages.prashna && h.L.pages.prashna.name) || 'Prashna', '')}${h.link('dreams/', h.L.dreams || 'Dream Meanings', '')}${h.link('vrat/', (h.L.pages.vrat && h.L.pages.vrat.name) || 'Vrat', '')}${h.link('learn/', (h.L.pages.learn && h.L.pages.learn.name) || 'Learn Astrology', '')}</nav>`
  };
  return blocks[id] ? blocks[id]() : '';
}

// Every static search page for one language
function staticPages(lang) {
  const out = [], Y = S_YEARS();
  out.push(cityIndex(lang, 'panchang'), cityIndex(lang, 'rahu'), cityIndex(lang, 'chogh'), festivalIndex(lang), muhuratIndex(lang), sadeSatiIndex(lang));
  for (const y of Y) {
    for (const e of festDates(y)) out.push(festivalPage(lang, e.id, y));
    for (const [k, w] of D.VRAT_LISTS) out.push(vratList(lang, k, w, y));
    out.push(grahanPage(lang, y));
    for (const [p, w] of D.MUHURAT) out.push(muhuratPage(lang, p, w, y));
    for (let s = 0; s < 12; s++) out.push(rashiYearPage(lang, s, y));
  }
  for (let s = 0; s < 12; s++) out.push(sadeSatiPage(lang, s), rashiPage(lang, s));
  for (let i = 0; i < 27; i++) out.push(nakshatraPage(lang, i));
  for (let a = 0; a < 12; a++) for (let b = a; b < 12; b++) out.push(compatPage(lang, a, b));
  for (const d of D.DOSHAS) out.push(doshaPage(lang, d));
  D.GEMS.forEach((_, i) => out.push(gemPage(lang, i)));
  for (let n = 1; n <= 14; n++) out.push(rudrakshaPage(lang, n));
  return out.filter(Boolean);
}
// URLs of the server-rendered pages (for the sitemap)
const dailySlugs = () => [...D.CITIES.flatMap(c => [`panchang/${c.slug}/`, `rahu-kaal/${c.slug}/`, `choghadiya/${c.slug}/`]), ...SIGN_SLUG.map(s => `rashifal/${s}/`)];

module.exports = { H, cityPanchang, cityRahu, cityChogh, signDaily, staticPages, learnIndexExtra, hubLinks, dailySlugs, S_YEARS, kebab, compatSlug,
  pageObj, moreLinks, article, factTable, learnCrumb, signCard, festDates, fguide, calendarFor, vratYear, muhuratYear, eclipsesYear, ingresses, once, DELHI, FEST_CITIES, PLANETS9, LUCKY_NUM, WEEKDAY_OF, DAY };
