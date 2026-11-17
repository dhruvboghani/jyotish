/* Reel cards, "clean modern" look: cream background, large bold text, one accent colour (saffron).
   Every card is 1080×1920. Each renderer also returns `bands`: the rectangles (title block, each row) that the
   browser reveals one after another, and a `base` image (the card with those bands painted over) to start from.
   GET /api/social/?img=<kind>&theme=modern[&part=base] (lib/routes/social.js); bands come in the X-Bands header. */
const T = require('./hbtext.js');
const R = require('./rashifal.js');
const P = require('./panchang.js');
const SC = require('./social-card.js');
const S = require('./site.js');
const J = require('./engine.js');
const { translator } = require('./i18n-server.js');

const W = 1080, H = 1920, MX = 72;
const K = { bg: '#FBF7EF', card: '#FFFFFF', ink: '#17172B', sub: '#6E6A80', accent: '#E0701B', soft: '#FCEBDA', line: '#EEE6D8', good: '#23855A', bad: '#D0342C', dim: '#E9E2D4' };
const NATIVE = { en: 'English', hi: 'हिन्दी', gu: 'ગુજરાતી', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ' };
const { glyph, logo, sym } = SC.kit;
const IG = require('./social-links.js').links().instagram;
const r2 = n => Math.round(n * 100) / 100;
const rect = (x, y, w, h, r, fill, extra = '') => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${r}" fill="${fill}" ${extra}/>`;
const hl = (x1, x2, y) => `<path d="M${r2(x1)} ${r2(y)}H${r2(x2)}" stroke="${K.line}" stroke-width="2"/>`;
const dots = (n, cx, cy, r = 7, on = K.accent) => { const g = r * 2.6; let o = ''; for (let i = 0; i < 5; i++) o += `<circle cx="${r2(cx - g * 2 + i * g)}" cy="${r2(cy)}" r="${r}" fill="${i < n ? on : K.dim}"/>`; return o; };
const msOf = d => Date.UTC(d.y, d.m - 1, d.d);

// Page: cream background, top bar (logo, name, language chip), title block, footer. Returns helpers to add bands.
function page(lang, title, sub, sub2) {
  const { t } = translator(lang), bands = [];
  let out = `<defs><filter id="sh" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#5A4A2A" flood-opacity=".10"/></filter></defs>`
    + rect(0, 0, W, H, 0, K.bg) + `<circle cx="${W - 40}" cy="40" r="170" fill="${K.soft}"/>`;
  // top bar (static)
  out += logo(MX, 84, 58) + T.line(t('brand.name').toUpperCase(), { size: 30, weight: 700, letter: 4 }).svg(MX + 74, 124, { fill: K.ink });
  const chip = T.line(NATIVE[lang] || lang, { size: 28, weight: 700 }), cw = chip.width + 48;
  out += rect(W - MX - cw, 84, cw, 58, 29, K.card, `stroke="${K.accent}" stroke-width="2.5"`) + chip.svg(W - MX - cw / 2, 124, { align: 'center', fill: K.accent });
  // title block (one band)
  let y = 270; const y0 = y - 90;
  const lines = T.wrap(title, W - 2 * MX, { size: 84, weight: 700 }, 2);
  lines.forEach(l => { out += l.svg(MX, y, { fill: K.ink }); y += 96; });
  out += rect(MX, y - 60, 110, 10, 5, K.accent); y += 10;
  if (sub) { out += T.fit(sub, W - 2 * MX, { size: 36, weight: 500 }).svg(MX, y, { fill: K.sub }); y += 50; }
  if (sub2) { out += T.fit(sub2, W - 2 * MX, { size: 30, weight: 600 }).svg(MX, y, { fill: K.accent }); y += 44; }
  bands.push({ x: 0, y: y0, w: W, h: y - y0 + 6, fill: K.bg });
  // footer (static)
  const site = T.line(S.SITE_URL.replace(/^https?:\/\//, ''), { size: 38, weight: 700 });
  out += site.svg(W / 2, H - 132, { align: 'center', fill: K.accent });
  if (IG) out += T.line('Instagram @' + IG.handle, { size: 28, weight: 500 }).svg(W / 2, H - 84, { align: 'center', fill: K.sub });
  return { out, bands, top: y + 26, t };
}
// White card with rows; each row becomes one band
function cardBox(x, y, w, h) { return rect(x, y, w, h, 36, K.card, 'filter="url(#sh)"'); }
const rowBand = (bands, x, y, w, h) => bands.push({ x: x + 4, y, w: w - 8, h, fill: K.card });
function finish(pg) { return { svg: SC.kit.wrapSvg(W, H, pg.out), bands: pg.bands }; }

// ---------- Rashifal ----------
function rashifal(lang, date) {
  const { L } = translator(lang), data = R.forDate(Date.UTC(date.y, date.m - 1, date.d, 0, 30)), rn = i => L('names.rashi')[i];
  const pg = page(lang, translator(lang).t('sc.allH'), SC.dateFmt(lang, msOf(date))), t = pg.t;
  const best = s => ['career', 'money', 'love', 'health'].reduce((b, a) => s.area[a] > s.area[b] ? a : b, 'career');
  const x = MX - 24, w = W - 2 * x, rowH = Math.min(100, Math.floor((H - 230 - pg.top) / 12)), y0 = pg.top;
  pg.out += cardBox(x, y0, w, rowH * 12 + 16);
  data.signs.forEach((s, i) => {
    const ry = y0 + 8 + i * rowH, mid = ry + rowH / 2, bad = s.chandrashtama;
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += `<circle cx="${x + 64}" cy="${mid}" r="32" fill="${bad ? '#FBE3E1' : K.soft}"/>` + glyph(s.sign, x + 42, mid - 22, 44, bad ? K.bad : K.accent);
    pg.out += T.fit(rn(s.sign), 420, { size: 38, weight: 700 }).svg(x + 118, mid - 2, { fill: K.ink });
    pg.out += T.fit(bad ? t('sc.careDay') : t('sc.best', { a: t('rf.area.' + best(s)) }), 440, { size: 25, weight: 500 }).svg(x + 118, mid + 32, { fill: bad ? K.bad : K.sub });
    pg.out += dots(s.stars, x + w - 108, mid, 9);
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}
function rashifal2(lang, date) {
  const { t, L } = translator(lang), data = R.forDate(Date.UTC(date.y, date.m - 1, date.d, 0, 30)), rn = i => L('names.rashi')[i];
  const pg = page(lang, t('sc.detailH'), SC.dateFmt(lang, msOf(date)));
  const x = MX - 40, w = W - 2 * x, head = 64, rowH = Math.min(96, Math.floor((H - 240 - pg.top - head) / 12)), y0 = pg.top;
  const areas = ['career', 'money', 'love', 'health'], cols = [440, 556, 672, 788], luckX = x + w - 64;
  pg.out += cardBox(x, y0, w, head + rowH * 12 + 14);
  areas.forEach((a, i) => { pg.out += T.fit(t('rf.area.' + a), 110, { size: 22, weight: 700 }).svg(cols[i], y0 + 44, { align: 'center', fill: K.sub }); });
  pg.out += T.fit(t('sc.lucky'), 120, { size: 22, weight: 700 }).svg(luckX, y0 + 44, { align: 'center', fill: K.sub });
  rowBand(pg.bands, x, y0 + 8, w, head - 10);
  data.signs.forEach((s, i) => {
    const ry = y0 + head + i * rowH, mid = ry + rowH / 2, lk = SC.luckyFor(s.sign, [s.items]);
    pg.out += hl(x + 28, x + w - 28, ry);
    pg.out += glyph(s.sign, x + 30, mid - 20, 40, s.chandrashtama ? K.bad : K.accent);
    pg.out += T.fit(rn(s.sign), 250, { size: 32, weight: 700 }).svg(x + 86, mid + 11, { fill: s.chandrashtama ? K.bad : K.ink });
    areas.forEach((a, k) => { pg.out += dots(s.area[a], cols[k], mid, 6.5); });
    pg.out += `<circle cx="${luckX}" cy="${mid}" r="27" fill="${lk.color}" stroke="${lk.color === '#F1F3F5' ? '#CFC7B8' : 'none'}" stroke-width="2"/>` + T.line(String(lk.num), { size: 30, weight: 700 }).svg(luckX, mid + 11, { align: 'center', fill: ['#F1F3F5', '#F2C94C', '#F783AC'].includes(lk.color) ? K.ink : '#fff' });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}

// ---------- Panchang ----------
function kvCard(pg, rows, y0, rowH) {
  const x = MX - 24, w = W - 2 * x, pad = 36;
  pg.out += cardBox(x, y0, w, rows.length * rowH + 16);
  rows.forEach(([k, v, sub, col], i) => {
    const ry = y0 + 8 + i * rowH, mid = ry + rowH / 2;
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += T.fit(k, w / 2 - pad, { size: 28, weight: 600 }).svg(x + pad, mid + 10, { fill: K.sub });
    pg.out += T.fit(v, w / 2 + 10, { size: 38, weight: 700 }).svg(x + w - pad, sub ? mid - 2 : mid + 13, { align: 'right', fill: col || K.ink });
    if (sub) pg.out += T.fit(sub, w / 2 + 10, { size: 24, weight: 500 }).svg(x + w - pad, mid + 32, { align: 'right', fill: K.sub });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return y0 + rows.length * rowH + 16;
}
function panchang(lang, date, city) {
  const { t, L } = translator(lang), tz = city.tz, hm = ms => SC.hm(ms, tz);
  const p = P.day({ year: date.y, month: date.m, day: date.d, lat: city.lat, lon: city.lon, tzMinutes: tz });
  const pg = page(lang, t('pc.title'), SC.dateFmt(lang, msOf(date)), city.label || city.name);
  const rows = [
    [t('sec.pan.tithi'), SC.tithiName(L, p.tithi[0].index), t('pp.until', { t: hm(p.tithi[0].end) })],
    [t('sec.pan.nakshatra'), L('names.nak')[p.nakshatra[0].index], t('pp.until', { t: hm(p.nakshatra[0].end) })],
    [t('sec.pan.yoga'), L('names.yoga27')[p.yoga[0].index]],
    [t('sec.pan.karana'), (L('names.karana') || {})[p.karana[0].name] || p.karana[0].name],
    [t('sec.pan.vara'), L('names.vara')[p.weekday]],
    [t('pp.masa'), L('names.masa')[p.lunarMonth]],
    [t('sec.pan.sunrise') + ' / ' + t('sec.pan.sunset'), `${hm(p.sunrise)} / ${hm(p.sunset)}`],
    [t('pp.rahu'), `${hm(p.rahuKaal.start)} – ${hm(p.rahuKaal.end)}`, '', K.bad],
    [t('pp.abhijit'), p.abhijit ? `${hm(p.abhijit.start)} – ${hm(p.abhijit.end)}` : t('pp.noAbhijit'), '', K.good]
  ];
  kvCard(pg, rows, pg.top, Math.min(128, Math.floor((H - 240 - pg.top) / rows.length)));
  return finish(pg);
}
function panchang2(lang, date, city) {
  const { t, L } = translator(lang), tz = city.tz, hm = ms => SC.hm(ms, tz);
  const p = P.day({ year: date.y, month: date.m, day: date.d, lat: city.lat, lon: city.lon, tzMinutes: tz });
  const pg = page(lang, t('sc.panDetH'), SC.dateFmt(lang, msOf(date)), city.label || city.name);
  const x = MX - 24, w = W - 2 * x, pad = 36, rh = 72, ch = (p.choghadiya || []).filter(c => c.part === 'day');
  let y = pg.top;
  pg.out += cardBox(x, y, w, 70 + ch.length * rh + 12);
  pg.out += T.fit(t('pp.choghDay'), w - 2 * pad, { size: 30, weight: 700 }).svg(x + pad, y + 50, { fill: K.ink });
  rowBand(pg.bands, x, y + 6, w, 62);
  ch.forEach((c, i) => {
    const ry = y + 70 + i * rh, mid = ry + rh / 2, col = c.quality === 'good' ? K.good : c.quality === 'bad' ? K.bad : K.sub;
    pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += `<circle cx="${x + pad + 10}" cy="${mid}" r="10" fill="${col}"/>`;
    pg.out += T.fit((L('names.chogh') || {})[c.name] || c.name, 280, { size: 32, weight: 700 }).svg(x + pad + 36, mid + 11, { fill: K.ink });
    pg.out += T.fit(t('pp.q.' + c.quality), 200, { size: 24, weight: 600 }).svg(x + pad + 330, mid + 9, { fill: col });
    pg.out += T.line(`${hm(c.start)} – ${hm(c.end)}`, { size: 32, weight: 700 }).svg(x + w - pad, mid + 11, { align: 'right', fill: K.ink });
    rowBand(pg.bands, x, ry + 2, w, rh - 4);
  });
  y += 70 + ch.length * rh + 12 + 26;
  const rows = [
    [t('pp.yama'), `${hm(p.yamaganda.start)} – ${hm(p.yamaganda.end)}`, '', K.bad],
    [t('pp.gulika'), `${hm(p.gulikaKaal.start)} – ${hm(p.gulikaKaal.end)}`, '', K.bad],
    [t('pp.brahma'), p.brahmaMuhurta ? `${hm(p.brahmaMuhurta.start)} – ${hm(p.brahmaMuhurta.end)}` : '—', '', K.good],
    [t('pp.moonSign'), L('names.rashi')[p.moonSign]],
    [t('pp.sunSign'), L('names.rashi')[p.sunSign]],
    [t('pp.ritu'), (L('names.ritu') || [])[p.ritu] || '']
  ].filter(r => r[1]);
  kvCard(pg, rows, y, Math.min(76, Math.floor((H - 230 - y) / rows.length)));
  return finish(pg);
}

// ---------- Week ----------
function week(lang, date) {
  const { t, L } = translator(lang), wk = SC.weekData(date), rn = i => L('names.rashi')[i];
  const pg = page(lang, t('sc.weekH'), SC.rangeFmt(lang, wk.days[0], wk.days[6]));
  const x = MX - 24, w = W - 2 * x, rowH = Math.min(100, Math.floor((H - 230 - pg.top) / 12)), y0 = pg.top;
  pg.out += cardBox(x, y0, w, rowH * 12 + 16);
  wk.signs.forEach((s, i) => {
    const ry = y0 + 8 + i * rowH, mid = ry + rowH / 2;
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += `<circle cx="${x + 64}" cy="${mid}" r="32" fill="${K.soft}"/>` + glyph(s.sign, x + 42, mid - 22, 44, K.accent);
    pg.out += T.fit(rn(s.sign), 420, { size: 38, weight: 700 }).svg(x + 118, mid - 2, { fill: K.ink });
    const best = t('sc.weekBest', { d: SC.dayShort(lang, s.best) }), care = s.care ? t('sc.weekCare', { d: SC.dayShort(lang, s.care) }) : '';
    const bl = T.fit(best, 300, { size: 25, weight: 600 }); pg.out += bl.svg(x + 118, mid + 32, { fill: K.good });
    if (care) pg.out += T.fit(care, 260, { size: 25, weight: 600 }).svg(x + 118 + bl.width + 24, mid + 32, { fill: K.bad });
    pg.out += dots(s.stars, x + w - 108, mid, 9);
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}
function week2(lang, date) {
  const { t, L } = translator(lang), wk = SC.weekData(date), rn = i => L('names.rashi')[i], loc = L('meta.locale') || 'en-IN';
  const per = wk.days.map(d => R.forDate(Date.UTC(d.y, d.m - 1, d.d, 0, 30)).signs);
  const pg = page(lang, t('sc.weekDetH'), SC.rangeFmt(lang, wk.days[0], wk.days[6]));
  const x = MX - 44, w = W - 2 * x, head = 84, rowH = Math.min(94, Math.floor((H - 240 - pg.top - head) / 12)), y0 = pg.top;
  const nameW = 236, luckW = 92, cellW = (w - nameW - luckW - 24) / 7, cx0 = x + nameW, wdf = new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' });
  const heat = n => ['#FADCD9', '#FCEBD3', '#F4F0E7', '#DDF1E4', '#BFE6CC'][Math.max(1, Math.min(5, n)) - 1];
  pg.out += cardBox(x, y0, w, head + rowH * 12 + 12);
  wk.days.forEach((d, j) => { const cx = cx0 + j * cellW + cellW / 2; pg.out += T.fit(wdf.format(msOf(d)), cellW - 4, { size: 21, weight: 700 }).svg(cx, y0 + 40, { align: 'center', fill: K.sub }); pg.out += T.line(String(d.d), { size: 27, weight: 700 }).svg(cx, y0 + 72, { align: 'center', fill: K.ink }); });
  pg.out += T.fit(t('sc.lucky'), luckW + 12, { size: 21, weight: 700 }).svg(x + w - 12 - luckW / 2, y0 + 56, { align: 'center', fill: K.sub });
  rowBand(pg.bands, x, y0 + 6, w, head - 8);
  wk.signs.forEach((s, i) => {
    const ry = y0 + head + i * rowH, mid = ry + rowH / 2, lk = SC.luckyFor(s.sign, per.map(p => p[s.sign].items));
    pg.out += glyph(s.sign, x + 22, mid - 19, 38, K.accent) + T.fit(rn(s.sign), nameW - 80, { size: 28, weight: 700 }).svg(x + 70, mid + 10, { fill: K.ink });
    per.forEach((p, j) => {
      const st = p[s.sign].stars, cx = cx0 + j * cellW;
      pg.out += rect(cx + 3, ry + 7, cellW - 6, rowH - 14, 14, heat(st), p[s.sign].chandrashtama ? `stroke="${K.bad}" stroke-width="2.5"` : '');
      pg.out += T.line(String(st), { size: 30, weight: 700 }).svg(cx + cellW / 2, mid + 11, { align: 'center', fill: st >= 4 ? K.good : st <= 1 ? K.bad : K.ink });
    });
    const lx = x + w - 12 - luckW / 2;
    pg.out += `<circle cx="${lx}" cy="${mid}" r="25" fill="${lk.color}" stroke="${lk.color === '#F1F3F5' ? '#CFC7B8' : 'none'}" stroke-width="2"/>` + T.line(String(lk.num), { size: 28, weight: 700 }).svg(lx, mid + 10, { align: 'center', fill: ['#F1F3F5', '#F2C94C', '#F783AC'].includes(lk.color) ? K.ink : '#fff' });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}

// ---------- Festivals ----------
function fest(lang, date, city) {
  const { t, L } = translator(lang), loc = L('meta.locale') || 'en-IN', all = SC.festData(date, city), max = 9;
  const pick = all.length <= max ? all : all.filter(e => e.kind === 'festival').concat(all.filter(e => e.kind !== 'festival')).slice(0, max).sort((a, b) => a.date < b.date ? -1 : 1);
  const pg = page(lang, t('sc.festH'), SC.rangeFmt(lang, date, SC.addDays(date, 13)), city.label || city.name);
  const x = MX - 24, w = W - 2 * x, rowH = Math.max(120, Math.min(150, Math.floor((H - 240 - pg.top) / Math.max(1, pick.length)))), y0 = pg.top;
  const mon = new Intl.DateTimeFormat(loc, { month: 'short', timeZone: 'UTC' }), wd = new Intl.DateTimeFormat(loc, { weekday: 'long', timeZone: 'UTC' });
  pg.out += cardBox(x, y0, w, Math.max(1, pick.length) * rowH + 16);
  if (!pick.length) pg.out += T.fit(t('sc.festNone'), w - 80, { size: 32 }).svg(W / 2, y0 + 70, { align: 'center', fill: K.sub });
  pick.forEach((e, i) => {
    const ry = y0 + 8 + i * rowH, mid = ry + rowH / 2, [yy, mm, dd] = e.date.split('-').map(Number), ms = Date.UTC(yy, mm - 1, dd), big = e.kind === 'festival';
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    const bs = 92, bx = x + 32, by = mid - bs / 2;
    pg.out += rect(bx, by, bs, bs, 22, big ? K.accent : K.soft);
    pg.out += T.line(String(dd), { size: 42, weight: 700 }).svg(bx + bs / 2, by + 52, { align: 'center', fill: big ? '#fff' : K.accent });
    pg.out += T.fit(mon.format(ms), bs - 10, { size: 20, weight: 700 }).svg(bx + bs / 2, by + 80, { align: 'center', fill: big ? '#fff' : K.accent });
    const tx = bx + bs + 28, tw = x + w - 32 - tx;
    pg.out += T.fit(SC.festName(lang, e), tw, { size: 36, weight: 700 }).svg(tx, mid - 4, { fill: K.ink });
    pg.out += T.fit(wd.format(ms) + '  ·  ' + t('cal.k.' + e.kind), tw, { size: 25, weight: 500 }).svg(tx, mid + 34, { fill: big ? K.accent : K.sub });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}
function fest2(lang, date, city) {
  const { t, L } = translator(lang), loc = L('meta.locale') || 'en-IN', FG = require('./festguide.js'), all = SC.festData(date, city), main = all.filter(e => e.kind === 'festival');
  const pick = (main.length ? main : all).slice(0, 4);
  const pg = page(lang, t('sc.festDetH'), SC.rangeFmt(lang, date, SC.addDays(date, 13)), city.label || city.name);
  const x = MX - 24, w = W - 2 * x, pad = 40, f = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  let y = pg.top;
  if (!pick.length) pg.out += cardBox(x, y, w, 150) + T.fit(t('sc.festNone'), w - 80, { size: 32 }).svg(W / 2, y + 88, { align: 'center', fill: K.sub });
  const blockH = Math.min(340, Math.floor((H - 240 - y) / Math.max(1, pick.length)) - 22);
  pick.forEach(e => {
    const [yy, mm, dd] = e.date.split('-').map(Number);
    let win = null;
    if (FG.GUIDES[e.id]) { try { const g = FG.guide(e.id, { year: yy, lat: city.lat, lon: city.lon, tzMinutes: city.tz }); const gg = Array.isArray(g) ? g.find(q => q.date === e.date) : g; win = gg && (gg.sthir || gg.main); } catch (er) { } }
    let about = t('pj.f.' + e.id + '.about'); if (about.startsWith('pj.f.')) about = t('seo.fa.' + e.id); if (about.startsWith('seo.fa.')) about = '';
    pg.out += cardBox(x, y, w, blockH) + rect(x, y + 28, 8, blockH - 56, 4, K.accent);
    let yy2 = y + 62;
    pg.out += T.fit(SC.festName(lang, e), w - 2 * pad, { size: 42, weight: 700 }).svg(x + pad, yy2, { fill: K.ink }); yy2 += 44;
    pg.out += T.fit(f.format(Date.UTC(yy, mm - 1, dd)), w - 2 * pad, { size: 27, weight: 500 }).svg(x + pad, yy2, { fill: K.sub }); yy2 += 48;
    if (win) { pg.out += T.fit(t('sc.muhurat', { r: `${SC.hm(win.start, city.tz)} – ${SC.hm(win.end, city.tz)}` }), w - 2 * pad, { size: 32, weight: 700 }).svg(x + pad, yy2, { fill: K.good }); yy2 += 46; }
    const lines = Math.max(0, Math.floor((y + blockH - 20 - yy2 + 30) / 38));
    if (about && lines) T.wrap(about, w - 2 * pad, { size: 27 }, lines).forEach(l => { pg.out += l.svg(x + pad, yy2, { fill: K.ink, opacity: 0.8 }); yy2 += 38; });
    pg.bands.push({ x: x - 20, y: y - 14, w: w + 40, h: blockH + 30, fill: K.bg });
    y += blockH + 22;
  });
  return finish(pg);
}

// ---------- Special day: what's special + precautions & remedies ----------
const TONE = { good: K.good, bad: K.bad, fest: K.accent, info: K.ink };
function dayRows(lang, date, city) {
  const { t, L } = translator(lang), D = require('./dayinfo.js').dayInfo(date, city), hm = ms => SC.hm(ms, city.tz);
  const g = p => L('names.graha')[p], r = i => L('names.rashi')[i], c = city.label || city.name;
  const rows = D.events.map(e => {
    switch (e.kind) {
      case 'festival': case 'vrat': case 'sankranti': return { e, tone: 'fest', label: SC.festName(lang, e.e), sub: t('cal.k.' + e.e.kind) };
      case 'eclipse': return { e, tone: 'bad', label: t('sc.dy.' + e.x.kind), sub: e.x.local && e.x.local.visible ? t('sc.dy.visible', { c }) + ' · ' + hm(e.x.local.start) + ' – ' + hm(e.x.local.end) : t('sc.dy.notVisible', { c }) };
      case 'guruPushya': case 'raviPushya': case 'sarvartha': return { e, tone: 'good', label: t('sc.dy.' + e.kind), sub: t('sc.dy.until', { t: hm(e.until) }) };
      case 'ingress': return { e, tone: 'info', label: t('sc.dy.ingress', { g: g(e.planet), r: r(e.sign) }) };
      case 'retro': case 'direct': return { e, tone: e.tone, label: t('sc.dy.' + e.kind, { g: g(e.planet) }), sub: r(e.sign) };
      case 'moonSign': return { e, tone: 'info', label: t('sc.dy.moonSign', { r: r(e.sign) }), sub: t('sc.dy.at', { t: hm(e.at) }) };
      case 'bhadra': return { e, tone: 'bad', label: t('sc.dy.bhadra'), sub: hm(e.start) + ' – ' + hm(e.end) };
      case 'panchak': return { e, tone: 'bad', label: t('sc.dy.panchak'), sub: e.until ? t('sc.dy.until', { t: hm(e.until) }) : e.from ? t('sc.dy.fromT', { t: hm(e.from) }) : t('sc.dy.allDay') };
      case 'rahu': return { e, tone: 'bad', label: t('pp.rahu'), sub: hm(e.start) + ' – ' + hm(e.end) };
      case 'abhijit': return { e, tone: 'good', label: t('pp.abhijit'), sub: hm(e.start) + ' – ' + hm(e.end) };
      case 'chandrashtama': return { e, tone: 'bad', label: t('sc.dy.chandrashtama'), sub: e.signs.map(r).join(', ') };
    }
  }).filter(Boolean);
  // the day's tithi and nakshatra first, so even a quiet day has its basics
  const p = D.p;
  rows.unshift({ e: { kind: 'nak' }, tone: 'info', label: L('names.nak')[p.nakshatra[0].index], sub: t('sec.pan.nakshatra') + ' · ' + t('pp.until', { t: hm(p.nakshatra[0].end) }) });
  rows.unshift({ e: { kind: 'tithi' }, tone: 'info', label: SC.tithiName(L, p.tithi[0].index), sub: t('sec.pan.tithi') + ' · ' + t('pp.until', { t: hm(p.tithi[0].end) }) });
  return { D, rows };
}
function day(lang, date, city) {
  const { t } = translator(lang), { rows } = dayRows(lang, date, city);
  const pg = page(lang, t('sc.dy.dayH'), SC.dateFmt(lang, msOf(date)), city.label || city.name);
  const list = rows.slice(0, 10), x = MX - 24, w = W - 2 * x, rowH = Math.max(100, Math.min(170, Math.floor((H - 240 - pg.top) / Math.max(1, list.length)))), y0 = pg.top, big = rowH >= 140;
  pg.out += cardBox(x, y0, w, list.length * rowH + 16);
  list.forEach((rw, i) => {
    const ry = y0 + 8 + i * rowH, mid = ry + rowH / 2, col = TONE[rw.tone];
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += `<circle cx="${x + 54}" cy="${mid}" r="${big ? 16 : 13}" fill="${col}"/>`;
    pg.out += T.fit(rw.label, w - 120, { size: big ? 44 : 36, weight: 700 }).svg(x + 92, rw.sub ? mid - (big ? 8 : 4) : mid + 14, { fill: K.ink });
    if (rw.sub) pg.out += T.fit(rw.sub, w - 120, { size: big ? 32 : 27, weight: 500 }).svg(x + 92, mid + (big ? 42 : 34), { fill: rw.tone === 'info' ? K.sub : col });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}
function day2(lang, date, city) {
  const { t, L } = translator(lang), { D, rows } = dayRows(lang, date, city), hm = ms => SC.hm(ms, city.tz);
  const g = p => L('names.graha')[p], r = i => L('names.rashi')[i];
  const VR = { ekadashi: 'p_ekadashi', purnima: 'p_purnima', amavasya: 'p_amavasya', pradosh: 'p_pradosh', sankashti: 'p_sankashti' };
  const tips = [];
  rows.forEach(rw => {
    const e = rw.e;
    if (e.kind === 'festival') { let a = t('pj.f.' + e.e.id + '.about'); if (a.startsWith('pj.f.')) a = t('seo.fa.' + e.e.id); if (!a.startsWith('seo.fa.')) tips.push(['fest', t('sc.dy.p_festival', { f: rw.label, a })]); }
    else if (e.kind === 'vrat' && VR[e.e.id]) tips.push(['fest', t('sc.dy.' + VR[e.e.id])]);
    else if (e.kind === 'sankranti') tips.push(['fest', t('sc.dy.p_sankranti')]);
    else if (e.kind === 'eclipse') tips.push(['bad', t('sc.dy.p_eclipse')]);
    else if (e.kind === 'guruPushya' || e.kind === 'raviPushya') tips.push(['good', t('sc.dy.p_' + e.kind)]);
    else if (e.kind === 'sarvartha') tips.push(['good', t('sc.dy.p_sarvartha', { t: t('sc.dy.until', { t: hm(e.until) }) })]);
    else if (e.kind === 'ingress') tips.push(['info', t('sc.dy.p_ingress', { g: g(e.planet) })]);
    else if (e.kind === 'retro' || e.kind === 'direct') tips.push([e.tone, t('sc.dy.p_' + e.kind, { g: g(e.planet) })]);
    else if (e.kind === 'bhadra') tips.push(['bad', t('sc.dy.p_bhadra', { a: hm(e.start), b: hm(e.end) })]);
    else if (e.kind === 'panchak') tips.push(['bad', t('sc.dy.p_panchak')]);
    else if (e.kind === 'rahu') tips.push(['bad', t('sc.dy.p_rahu', { a: hm(e.start), b: hm(e.end) })]);
    else if (e.kind === 'abhijit') tips.push(['good', t('sc.dy.p_abhijit', { a: hm(e.start), b: hm(e.end) })]);
    else if (e.kind === 'chandrashtama') tips.push(['bad', t('sc.dy.p_chandrashtama', { x: e.signs.map(r).join(', ') })]);
  });
  const lord = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'][D.p.weekday], mantra = (L('names.mantra') || {})[lord];
  if (mantra) tips.push(['fest', t('mb.remedy', { m: mantra })]);
  const pg = page(lang, t('sc.dy.precH'), SC.dateFmt(lang, msOf(date)), city.label || city.name);
  const x = MX - 24, w = W - 2 * x, pad = 34, room = H - 250 - pg.top, list = tips.slice(0, 8);
  let fs = 42, lh, wrapped, need;
  for (; fs >= 26; fs -= 2) { lh = Math.round(fs * 1.32); wrapped = list.map(([tone, txt]) => [tone, T.wrap(txt, w - pad * 2 - 64, { size: fs, weight: 500 }, 4)]); need = wrapped.reduce((a, [, ls]) => a + ls.length * lh + 40, 0) + 20; if (need <= room) break; }
  const scale = Math.min(1, room / Math.max(1, need));
  const gapY = Math.max(18, 34 * scale);
  let y = pg.top;
  pg.out += cardBox(x, y, w, Math.min(room, need) + 16);
  y += 18;
  wrapped.forEach(([tone, ls], i) => {
    const h = ls.length * lh + gapY, col = TONE[tone];
    if (y + h > pg.top + room) return;
    if (i) pg.out += hl(x + 30, x + w - 30, y - gapY / 2 + 4);
    const cx = x + pad + 20, cy = y + lh * 0.55;
    const mark = tone === 'good' ? `<path d="M${cx - 8} ${cy}l5.5 5.5L${cx + 9} ${cy - 7}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
      : tone === 'bad' ? `<rect x="${cx - 2.2}" y="${cy - 10}" width="4.4" height="12" rx="2" fill="#fff"/><circle cx="${cx}" cy="${cy + 7}" r="2.6" fill="#fff"/>`
      : `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#fff"/>`;
    pg.out += `<circle cx="${cx}" cy="${cy}" r="20" fill="${col}"/>` + mark;
    ls.forEach((l, k) => { pg.out += l.svg(x + pad + 64, y + lh * 0.55 + fs * 0.36 + k * lh, { fill: K.ink }); });
    rowBand(pg.bands, x, y - 6, w, h);
    y += h + 6;
  });
  return finish(pg);
}

// Third card of the special-day reel on festival / vrat days: the best 3–4 muhurats, then Rahu Kaal to avoid
function muhLabel(t, L, m) {
  if (m.kind === 'puja') return [t('sc.dy.puja_' + m.win) === 'sc.dy.puja_' + m.win ? t('sc.dy.pujaWin') : t('sc.dy.puja_' + m.win), t('sc.dy.use_puja', { f: SC.festName(m.lang, m.fest) })];
  if (m.kind === 'sthir') return [t('sc.dy.sthir'), t('sc.dy.use_sthir')];
  if (m.kind === 'moonrise') return [t('sc.dy.moonrise'), t('sc.dy.use_moonrise')];
  if (m.kind === 'chogh') return [t('sc.dy.chogh', { n: (L('names.chogh') || {})[m.name] || m.name }), t('sc.dy.use_' + m.name)];
  return [t('pp.abhijit'), t('sc.dy.use_abhijit')];
}
function day3(lang, date, city) {
  const { t, L } = translator(lang), DI = require('./dayinfo.js'), M = DI.bestMuhurats(date, city), hm = ms => SC.hm(ms, city.tz);
  const fest = M.list.find(m => m.fest), firstFest = fest ? fest.fest : (DI.dayInfo(date, city).events.find(e => e.kind === 'festival' || e.kind === 'vrat' || e.kind === 'sankranti') || {}).e;
  const pg = page(lang, firstFest ? t('sc.dy.muhFestH', { f: SC.festName(lang, firstFest).split('·')[0].split('(')[0].trim() }) : t('sc.dy.muhH'), SC.dateFmt(lang, msOf(date)), city.label || city.name);
  const rows = M.list.map(m => ({ ...m, lang }));
  const x = MX - 24, w = W - 2 * x, pad = 36, n = rows.length + 1, rowH = Math.max(150, Math.min(210, Math.floor((H - 250 - pg.top) / n))), y0 = pg.top;
  pg.out += cardBox(x, y0, w, n * rowH + 16);
  rows.forEach((m, i) => {
    const ry = y0 + 8 + i * rowH, [label, use] = muhLabel(t, L, m), star = i === 0 && (m.kind === 'puja' || m.kind === 'sthir');
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    if (star) pg.out += rect(x + 10, ry + 6, w - 20, rowH - 12, 26, K.soft);
    pg.out += `<circle cx="${x + pad + 12}" cy="${ry + 50}" r="13" fill="${star ? K.accent : K.good}"/>`;
    pg.out += T.fit(label, w - 2 * pad - 40, { size: 34, weight: 700 }).svg(x + pad + 42, ry + 62, { fill: K.ink });
    pg.out += T.fit(m.end ? `${hm(m.start)} – ${hm(m.end)}` : hm(m.start), w - 2 * pad - 40, { size: 50, weight: 700 }).svg(x + pad + 42, ry + 122, { fill: star ? K.accent : K.good });
    pg.out += T.fit(use, w - 2 * pad - 40, { size: 25, weight: 500 }).svg(x + pad + 42, ry + Math.min(rowH - 18, 162), { fill: K.sub });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  const ry = y0 + 8 + rows.length * rowH;
  if (rows.length) pg.out += hl(x + 30, x + w - 30, ry);
  pg.out += `<circle cx="${x + pad + 12}" cy="${ry + 50}" r="13" fill="${K.bad}"/>`;
  pg.out += T.fit(t('pp.rahu'), w - 2 * pad - 40, { size: 34, weight: 700 }).svg(x + pad + 42, ry + 62, { fill: K.ink });
  pg.out += T.fit(`${hm(M.avoid.start)} – ${hm(M.avoid.end)}`, w - 2 * pad - 40, { size: 50, weight: 700 }).svg(x + pad + 42, ry + 122, { fill: K.bad });
  pg.out += T.fit(t('sc.dy.use_avoid'), w - 2 * pad - 40, { size: 25, weight: 500 }).svg(x + pad + 42, ry + Math.min(rowH - 18, 162), { fill: K.sub });
  rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  return finish(pg);
}

// ---------- Outro ----------
function outro() {
  const { t } = translator('en'), bands = [];
  let out = rect(0, 0, W, H, 0, K.bg) + `<circle cx="${W - 40}" cy="40" r="170" fill="${K.soft}"/><circle cx="60" cy="${H - 80}" r="140" fill="${K.soft}"/>`;
  out += logo(W / 2 - 120, 260, 240) + T.line(t('brand.name'), { size: 100, weight: 700 }).svg(W / 2, 640, { align: 'center', fill: K.ink });
  out += T.line(t('brand.tagline'), { size: 38, weight: 500 }).svg(W / 2, 700, { align: 'center', fill: K.sub });
  bands.push({ x: 0, y: 230, w: W, h: 500, fill: K.bg });
  ['hi', 'gu', 'ta', 'te', 'kn', 'en'].forEach((l, i) => {
    const y = 820 + i * 84;
    out += T.fit(translator(l).t('sc.cta'), W - 200, { size: 42, weight: 700 }).svg(W / 2, y, { align: 'center', fill: i % 2 ? K.ink : K.accent });
    bands.push({ x: 0, y: y - 54, w: W, h: 76, fill: K.bg });
  });
  const site = T.line(S.SITE_URL.replace(/^https?:\/\//, ''), { size: 44, weight: 700 }), pw = site.width + 100, py = 1400;
  out += rect((W - pw) / 2, py, pw, 104, 52, K.accent) + site.svg(W / 2, py + 67, { align: 'center', fill: '#fff' });
  if (IG) out += T.line('Instagram @' + IG.handle, { size: 34, weight: 600 }).svg(W / 2, py + 180, { align: 'center', fill: K.sub });
  bands.push({ x: 0, y: py - 10, w: W, h: 230, fill: K.bg });
  return { svg: SC.kit.wrapSvg(W, H, out), bands };
}


// ---------- Numerology (Mulank) reels ----------
const NU = require('../src/js/numcore.js');
const N9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const datesOf = n => [n, n + 9, n + 18, n + 27].filter(d => d <= 31);
const yearDigits = y => NU.reduce(NU.sumDigits(y));
const nuList = (lang, arr) => arr.map(String).join(', ');
// How a year treats a Mulank: F friendly, N neutral, E unfriendly (as on the numerology prediction pages)
function yearRel(n, y) { const yn = yearDigits(y), a = NU.rel(n, yn), b = NU.rel(yn, n); return a === 'F' || b === 'F' ? (a === 'E' || b === 'E' ? 'N' : 'F') : (a === 'E' || b === 'E' ? 'E' : 'N'); }
function nuYear(n, y) {
  const v = NU.reduce(n + yearDigits(y)), months = Array.from({ length: 12 }, (_, i) => ({ i, f: NU.fit(NU.reduce(v + i + 1), n, null) }));
  return { v, r: yearRel(n, y), best: months.filter(x => x.f === 'best').map(x => x.i), bad: months.filter(x => x.f === 'avoid').map(x => x.i) };
}
const badge = (cx, cy, r, n, fill = K.accent, col = '#fff') => `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r}" fill="${fill}"/>` + T.line(String(n), { size: r * 1.15, weight: 700 }).svg(cx, cy + r * 0.4, { align: 'center', fill: col });
// White card of stacked rows: small label, then a value wrapped over up to `max` lines
function stackCard(pg, rows, y0, { size = 36, max = 2, gap = 30 } = {}) {
  const x = MX - 24, w = W - 2 * x, pad = 40, lh = size * 1.3; let y = y0 + 24, parts = [];
  rows.forEach(([k, v, col]) => {
    const lines = T.wrap(v, w - 2 * pad, { size, weight: 700 }, max), h = 40 + lines.length * lh + gap;
    parts.push({ k, lines, col, y, h }); y += h;
  });
  pg.out += cardBox(x, y0, w, y - y0 + 4);
  parts.forEach((r, i) => {
    if (i) pg.out += hl(x + 30, x + w - 30, r.y - gap / 2 - 6);
    pg.out += T.fit(r.k, w - 2 * pad, { size: 26, weight: 600 }).svg(x + pad, r.y + 26, { fill: K.sub });
    r.lines.forEach((l, j) => { pg.out += l.svg(x + pad, r.y + 40 + (j + 0.8) * lh, { fill: r.col || K.ink }); });
    rowBand(pg.bands, x, r.y - 8, w, r.h - 6);
  });
  return y + 4;
}
function mulank(lang, date, city, opt = {}) {
  const n = opt.n || 1, { t, L } = translator(lang), N = L('nu.num')[n], g = L('names.graha')[NU.PLANET[n]];
  const pg = page(lang, t('seo.nu.muShort', { n }) + ' · ' + g, t('seo.nu.bornOn') + ' ' + nuList(lang, datesOf(n)), N.kw);
  pg.out += badge(W - MX - 70, 330, 70, n);
  stackCard(pg, [
    [t('seo.nu.personalityH', { n }), String(N.trait).split(/(?<=[.!?।])\s/).slice(1, 2).join(' ') || N.trait],
    [t('nu.luckyNums'), nuList(lang, NU.FRIEND[n])],
    [t('nu.luckyDay') + ' · ' + t('nu.gem'), L('names.vara')[NU.DAY[n]] + ' · ' + t('gm.g.' + NU.GEM[n])],
    [t('nu.luckyColor'), N.color],
    [t('nu.career'), N.career]
  ], pg.top, { size: 38, max: 3, gap: 30 });
  return finish(pg);
}
function mulank2(lang, date, city, opt = {}) {
  const n = opt.n || 1, y = opt.y || date.y, { t, L } = translator(lang), g = L('names.graha')[NU.PLANET[n]], Y = nuYear(n, y);
  const gy = L('names.graha')[NU.PLANET[yearDigits(y)]], mName = i => new Intl.DateTimeFormat(L('meta.locale') || 'en-IN', { month: 'long', timeZone: 'UTC' }).format(Date.UTC(y, i, 1));
  const pg = page(lang, t('sc.nu.yearH', { n, y }), t('sc.nu.vib', { v: Y.v, g: L('names.graha')[NU.PLANET[Y.v]] }));
  pg.out += badge(W - MX - 70, 330, 70, n);
  let yy = stackCard(pg, [
    [t('sc.nu.theme'), L('nu.num')[Y.v].py],
    [t('seo.nu.yrRelH', { y, n }), t('seo.nu.yrRel.' + Y.r, { gy, g, y }), Y.r === 'F' ? K.good : Y.r === 'E' ? K.bad : K.ink],
    [t('sc.nu.best'), nuList(lang, Y.best.map(mName)), K.good],
    [t('sc.nu.care'), Y.bad.length ? nuList(lang, Y.bad.map(mName)) : t('sc.nu.noCare'), Y.bad.length ? K.bad : K.ink]
  ], pg.top, { size: 32, max: 3, gap: 24 });
  const url = S.SITE_URL.replace(/^https?:\/\//, '') + S.ALL[lang].meta.path + `numerology/mulank-${n}-${y}/`;
  if (yy < H - 300) { pg.out += T.fit(t('sc.nu.more') + ': ' + url, W - 2 * MX, { size: 26, weight: 600 }).svg(W / 2, Math.min(yy + 56, H - 220), { align: 'center', fill: K.accent }); pg.bands.push({ x: 0, y: Math.min(yy + 56, H - 220) - 36, w: W, h: 50, fill: K.bg }); }
  return finish(pg);
}
function nuall(lang, date, city, opt = {}) {
  const y = opt.y || date.y, { t, L } = translator(lang);
  const pg = page(lang, t('sc.nu.allH', { y }), t('sc.nu.allSub'));
  const x = MX - 24, w = W - 2 * x, rowH = Math.min(132, Math.floor((H - 250 - pg.top) / 9)), y0 = pg.top;
  pg.out += cardBox(x, y0, w, rowH * 9 + 16);
  const tone = { F: [4, K.good, 'best'], N: [3, K.sub, 'neutral'], E: [2, K.bad, 'avoid'] };
  N9.forEach((n, i) => {
    const ry = y0 + 8 + i * rowH, mid = ry + rowH / 2, [st, col, key] = tone[yearRel(n, y)];
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += badge(x + 70, mid, 36, n, K.soft, K.accent);
    pg.out += T.fit(nuList(lang, datesOf(n)) + ' · ' + L('names.graha')[NU.PLANET[n]], 520, { size: 32, weight: 700 }).svg(x + 128, mid - 4, { fill: K.ink });
    pg.out += T.fit(L('nu.num')[n].kw, 520, { size: 24, weight: 500 }).svg(x + 128, mid + 32, { fill: K.sub });
    pg.out += dots(st, x + w - 120, mid - 14, 8, col) + T.fit(t('seo.nu.toneL.' + key), 200, { size: 24, weight: 700 }).svg(x + w - 120, mid + 30, { align: 'center', fill: col });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}

// Month-wise: how a month goes for each Mulank (month number as on the yearly prediction pages), then lucky dates
const spreadN = (a, k) => a.length <= k ? a : Array.from({ length: k }, (_, i) => a[Math.round(i * (a.length - 1) / (k - 1))]);
const mLabel = (lang, y, m) => new Intl.DateTimeFormat(translator(lang).L('meta.locale') || 'en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1));
function nuMonth(n, y, m) {
  const mv = NU.reduce(NU.reduce(n + yearDigits(y)) + m), days = new Date(Date.UTC(y, m, 0)).getUTCDate(), dv = d => NU.reduce(NU.sumDigits(d) + NU.sumDigits(m) + NU.sumDigits(y));
  const all = Array.from({ length: days }, (_, i) => i + 1);
  return { mv, tone: NU.fit(mv, n, null), lucky: all.filter(d => NU.fit(dv(d), n, null) === 'best'), care: all.filter(d => NU.fit(dv(d), n, null) === 'avoid') };
}
function numonth(lang, date, city, opt = {}) {
  const y = opt.y || date.y, m = opt.m || date.m, { t, L } = translator(lang);
  const pg = page(lang, t('sc.nu.monthH', { m: mLabel(lang, y, m) }), t('sc.nu.monthSub'));
  const x = MX - 24, w = W - 2 * x, rowH = Math.min(132, Math.floor((H - 250 - pg.top) / 9)), y0 = pg.top;
  pg.out += cardBox(x, y0, w, rowH * 9 + 16);
  const tone = { best: [4, K.good, 'best'], good: [4, K.good, 'best'], neutral: [3, K.sub, 'neutral'], avoid: [2, K.bad, 'avoid'] };
  N9.forEach((n, i) => {
    const ry = y0 + 8 + i * rowH, mid = ry + rowH / 2, M = nuMonth(n, y, m), [st, col, key] = tone[M.tone];
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += badge(x + 70, mid, 36, n, K.soft, K.accent);
    pg.out += T.fit(nuList(lang, datesOf(n)) + ' · ' + t('sc.nu.mnum', { v: M.mv, g: L('names.graha')[NU.PLANET[M.mv]] }), 540, { size: 30, weight: 700 }).svg(x + 128, mid - 4, { fill: K.ink });
    pg.out += T.fit(L('nu.num')[M.mv].kw, 540, { size: 24, weight: 500 }).svg(x + 128, mid + 32, { fill: K.sub });
    pg.out += dots(st, x + w - 110, mid - 14, 8, col) + T.fit(t('seo.nu.toneL.' + key), 190, { size: 24, weight: 700 }).svg(x + w - 110, mid + 30, { align: 'center', fill: col });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}
function numonth2(lang, date, city, opt = {}) {
  const y = opt.y || date.y, m = opt.m || date.m, { t } = translator(lang);
  const pg = page(lang, t('sc.nu.datesH', { m: mLabel(lang, y, m) }), t('sc.nu.monthSub'));
  const x = MX - 24, w = W - 2 * x, rowH = Math.min(132, Math.floor((H - 250 - pg.top) / 9)), y0 = pg.top;
  pg.out += cardBox(x, y0, w, rowH * 9 + 16);
  N9.forEach((n, i) => {
    const ry = y0 + 8 + i * rowH, mid = ry + rowH / 2, M = nuMonth(n, y, m);
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += badge(x + 70, mid, 36, n, K.soft, K.accent);
    pg.out += T.fit(t('sc.nu.lucky') + ': ' + (M.lucky.length ? nuList(lang, spreadN(M.lucky, 8)) : '–'), w - 170, { size: 30, weight: 700 }).svg(x + 128, mid - 4, { fill: K.good });
    pg.out += T.fit(t('sc.nu.careful') + ': ' + (M.care.length ? nuList(lang, spreadN(M.care, 6)) : '–'), w - 170, { size: 26, weight: 600 }).svg(x + 128, mid + 32, { fill: K.bad });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}
// Closing card of the "all 9" reel, Hindi + English: ask for the date of birth in the comments
function nucta(lang, date, city, opt = {}) {
  const y = opt.y || date.y, hi = translator('hi').t, en = translator('en').t;
  const pg = page('hi', hi('sc.nu.ctaH'), en('sc.nu.ctaH'));
  let yy = pg.top + 120;
  // arrow pointing down to the comments
  pg.out += `<path d="M${W / 2} ${yy}v220" stroke="${K.accent}" stroke-width="22" stroke-linecap="round"/><path d="M${W / 2 - 90} ${yy + 150}L${W / 2} ${yy + 250}L${W / 2 + 90} ${yy + 150}" fill="none" stroke="${K.accent}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`;
  pg.bands.push({ x: W / 2 - 120, y: yy - 20, w: 240, h: 300, fill: K.bg });
  yy += 340;
  const ex = '16-08-1995';
  pg.out += cardBox(MX - 24, yy, W - 2 * (MX - 24), 170) + T.line(ex, { size: 72, weight: 700 }).svg(W / 2, yy + 112, { align: 'center', fill: K.ink });
  pg.bands.push({ x: MX - 20, y: yy, w: W - 2 * (MX - 20), h: 170, fill: K.bg });
  yy += 250;
  const ml = l => opt.m ? mLabel(l, y, opt.m) : null;
  [[opt.m ? hi('sc.nu.ctaSubM', { m: ml('hi') }) : hi('sc.nu.ctaSub', { y }), 36, K.ink], [opt.m ? en('sc.nu.ctaSubM', { m: ml('en') }) : en('sc.nu.ctaSub', { y }), 32, K.sub]].forEach(([s, sz, col]) => {
    const ls = T.wrap(s, W - 2 * MX, { size: sz, weight: 600 }, 2), y1 = yy - sz;
    ls.forEach(l => { pg.out += l.svg(W / 2, yy, { align: 'center', fill: col }); yy += sz * 1.35; });
    pg.bands.push({ x: 0, y: y1 - 6, w: W, h: yy - y1 - sz * 0.2, fill: K.bg }); yy += 24;
  });
  return finish(pg);
}

// ---------- Festival wishes (greeting reel): one festive card per language ----------
const WP = {
  night: { top: '#1E0A2E', mid: '#4A0F2E', bot: '#6E1C1E', gold: '#F6C66B', cream: '#FFF4DF', sub: '#EBCFAE' },
  dawn: { top: '#16224F', mid: '#7A3550', bot: '#E0803A', gold: '#FFD27A', cream: '#FFF6E8', sub: '#F6DCC0' },
  holi: { top: '#25103F', mid: '#5E1A66', bot: '#B0285E', gold: '#FFD84D', cream: '#FFF6EE', sub: '#F5D6E6' }
};
const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sparkle = (x, y, r, fill, o = 1) => `<path d="M${r2(x)} ${r2(y - r)}Q${r2(x + r * .18)} ${r2(y - r * .18)} ${r2(x + r)} ${r2(y)}Q${r2(x + r * .18)} ${r2(y + r * .18)} ${r2(x)} ${r2(y + r)}Q${r2(x - r * .18)} ${r2(y + r * .18)} ${r2(x - r)} ${r2(y)}Q${r2(x - r * .18)} ${r2(y - r * .18)} ${r2(x)} ${r2(y - r)}Z" fill="${fill}" opacity="${o}"/>`;
function rangoli(cx, cy, R, cols) {
  let o = '';
  [[R, 16, R * 0.22, R * 0.09, cols[0], .32], [R * 0.72, 12, R * 0.2, R * 0.085, cols[1], .36], [R * 0.45, 8, R * 0.17, R * 0.08, cols[2], .4]].forEach(([rad, n, a, b, c, op]) => {
    for (let i = 0; i < n; i++) { const ang = i * 360 / n; o += `<ellipse cx="${r2(cx)}" cy="${r2(cy - rad)}" rx="${r2(b)}" ry="${r2(a)}" fill="${c}" opacity="${op}" transform="rotate(${ang} ${r2(cx)} ${r2(cy)})"/>`; }
  });
  for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16; o += `<circle cx="${r2(cx + Math.cos(a) * R * 1.12)}" cy="${r2(cy + Math.sin(a) * R * 1.12)}" r="${r2(R * 0.025)}" fill="${cols[3]}" opacity=".7"/>`; }
  return o + `<circle cx="${cx}" cy="${cy}" r="${r2(R * 0.9)}" fill="none" stroke="${cols[3]}" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round" opacity=".55"/>`;
}
function diyaSvg(cx, cy, s, id) {
  const S = v => r2(v * s);
  let o = `<defs><radialGradient id="gl${id}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE29A" stop-opacity=".75"/><stop offset=".45" stop-color="#FFB347" stop-opacity=".28"/><stop offset="1" stop-color="#FF8A00" stop-opacity="0"/></radialGradient>
    <radialGradient id="fl${id}" cx="50%" cy="70%" r="65%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="#FFF1A8"/><stop offset=".75" stop-color="#FFB02E"/><stop offset="1" stop-color="#F06A10"/></radialGradient>
    <linearGradient id="bw${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9662A"/><stop offset="1" stop-color="#7A2810"/></linearGradient></defs>`;
  o += `<circle cx="${cx}" cy="${r2(cy - S(120))}" r="${S(260)}" fill="url(#gl${id})"/>`;
  // bowl with a pointed spout on the right where the wick sits
  o += `<path d="M${r2(cx - S(205))} ${r2(cy)}Q${r2(cx - S(190))} ${r2(cy + S(120))} ${r2(cx - S(10))} ${r2(cy + S(128))}Q${r2(cx + S(150))} ${r2(cy + S(126))} ${r2(cx + S(200))} ${r2(cy + S(18))}L${r2(cx + S(250))} ${r2(cy - S(28))}Q${r2(cx + S(140))} ${r2(cy - S(30))} ${r2(cx + S(60))} ${r2(cy - S(22))}Q${r2(cx - S(80))} ${r2(cy - S(34))} ${r2(cx - S(205))} ${r2(cy)}Z" fill="url(#bw${id})"/>`;
  o += `<ellipse cx="${r2(cx - S(10))}" cy="${r2(cy - S(8))}" rx="${S(190)}" ry="${S(26)}" fill="#5A1E0C"/><ellipse cx="${r2(cx - S(10))}" cy="${r2(cy - S(10))}" rx="${S(160)}" ry="${S(16)}" fill="#C88A2C" opacity=".65"/>`;
  for (let i = 0; i < 9; i++) o += `<circle cx="${r2(cx - S(150) + i * S(36))}" cy="${r2(cy + S(52) + Math.sin(i / 8 * Math.PI) * S(14))}" r="${S(7)}" fill="#F6C66B"/>`;
  o += `<path d="M${r2(cx - S(170))} ${r2(cy + S(28))}Q${r2(cx - S(10))} ${r2(cy + S(70))} ${r2(cx + S(170))} ${r2(cy + S(30))}" fill="none" stroke="#F6C66B" stroke-width="${S(5)}" opacity=".8"/>`;
  // flame
  const fx = cx + S(212), fy = cy - S(34);
  o += `<circle cx="${r2(fx)}" cy="${r2(fy - S(70))}" r="${S(120)}" fill="url(#gl${id})"/>`;
  o += `<path d="M${r2(fx)} ${r2(fy - S(190))}C${r2(fx + S(62))} ${r2(fy - S(110))} ${r2(fx + S(52))} ${r2(fy - S(14))} ${r2(fx)} ${r2(fy - S(4))}C${r2(fx - S(52))} ${r2(fy - S(14))} ${r2(fx - S(62))} ${r2(fy - S(110))} ${r2(fx)} ${r2(fy - S(190))}Z" fill="url(#fl${id})"/>`;
  o += `<path d="M${r2(fx)} ${r2(fy - S(110))}C${r2(fx + S(24))} ${r2(fy - S(70))} ${r2(fx + S(20))} ${r2(fy - S(26))} ${r2(fx)} ${r2(fy - S(20))}C${r2(fx - S(20))} ${r2(fy - S(26))} ${r2(fx - S(24))} ${r2(fy - S(70))} ${r2(fx)} ${r2(fy - S(110))}Z" fill="#FFFFFF" opacity=".85"/>`;
  return o;
}
function wealthSvg(cx, cy, s) {
  const S = v => r2(v * s); let o = '';
  o += `<defs><linearGradient id="pot" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A3A12"/><stop offset=".45" stop-color="#E08A3C"/><stop offset="1" stop-color="#7A2E0E"/></linearGradient>
    <radialGradient id="coin" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#FFF2B0"/><stop offset=".6" stop-color="#F2BE3A"/><stop offset="1" stop-color="#B07810"/></radialGradient>
    <radialGradient id="wgl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE29A" stop-opacity=".6"/><stop offset="1" stop-color="#FFB347" stop-opacity="0"/></radialGradient></defs>`;
  o += `<circle cx="${cx}" cy="${r2(cy - S(40))}" r="${S(300)}" fill="url(#wgl)"/>`;
  // pot (kalash) and rim
  o += `<path d="M${r2(cx - S(110))} ${r2(cy - S(150))}Q${r2(cx - S(230))} ${r2(cy - S(60))} ${r2(cx - S(190))} ${r2(cy + S(60))}Q${r2(cx - S(130))} ${r2(cy + S(170))} ${cx} ${r2(cy + S(172))}Q${r2(cx + S(130))} ${r2(cy + S(170))} ${r2(cx + S(190))} ${r2(cy + S(60))}Q${r2(cx + S(230))} ${r2(cy - S(60))} ${r2(cx + S(110))} ${r2(cy - S(150))}Z" fill="url(#pot)"/>`;
  o += `<rect x="${r2(cx - S(130))}" y="${r2(cy - S(178))}" width="${S(260)}" height="${S(36)}" rx="${S(18)}" fill="#A64A18"/><path d="M${r2(cx - S(170))} ${r2(cy + S(10))}Q${cx} ${r2(cy + S(60))} ${r2(cx + S(170))} ${r2(cy + S(10))}" fill="none" stroke="#F6C66B" stroke-width="${S(8)}"/>`;
  o += T.line('ॐ', { size: 80 * s, weight: 700 }).svg(cx, cy + S(122), { align: 'center', fill: '#F6C66B' });
  // heap of coins on top and a few in front
  const coin = (x, y, r) => `<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(r)}" ry="${r2(r * .42)}" fill="url(#coin)" stroke="#9A6A10" stroke-width="${S(3)}"/>`;
  [[-80, -200, 46], [0, -214, 50], [80, -200, 46], [-40, -240, 44], [40, -244, 44], [0, -276, 42]].forEach(([dx, dy, r]) => o += coin(cx + S(dx), cy + S(dy), S(r)));
  [[-250, 150, 44], [-190, 175, 40], [230, 160, 44], [280, 130, 36], [170, 182, 38]].forEach(([dx, dy, r]) => o += coin(cx + S(dx), cy + S(dy), S(r)));
  for (let i = 0; i < 7; i++) o += sparkle(cx + S(-220 + i * 75), cy - S(330 + (i % 2) * 40), S(14 + (i % 3) * 5), '#FFF2B0', .9);
  return o;
}
function sunSvg(cx, cy, s, pal) {
  const S = v => r2(v * s); let o = `<defs><radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF6C8"/><stop offset=".55" stop-color="#FFC24A"/><stop offset="1" stop-color="#F0761E"/></radialGradient><radialGradient id="sgl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD27A" stop-opacity=".7"/><stop offset="1" stop-color="#FF8A3C" stop-opacity="0"/></radialGradient><clipPath id="sky"><rect x="0" y="0" width="${W}" height="${r2(cy)}"/></clipPath></defs>`;
  o += `<g clip-path="url(#sky)"><circle cx="${cx}" cy="${cy}" r="${S(420)}" fill="url(#sgl)"/>`;
  for (let i = 0; i < 18; i++) { const a = Math.PI + i * Math.PI / 17; o += `<path d="M${r2(cx + Math.cos(a) * S(210))} ${r2(cy + Math.sin(a) * S(210))}L${r2(cx + Math.cos(a) * S(320))} ${r2(cy + Math.sin(a) * S(320))}" stroke="#FFD27A" stroke-width="${S(i % 2 ? 6 : 12)}" stroke-linecap="round" opacity=".85"/>`; }
  o += `<circle cx="${cx}" cy="${cy}" r="${S(180)}" fill="url(#sun)"/></g>`;
  for (let i = 0; i < 6; i++) { const y = cy + S(24 + i * 30), w = S(360 - i * 40); o += `<path d="M${r2(cx - w)} ${r2(y)}Q${r2(cx - w / 2)} ${r2(y - S(10))} ${cx} ${r2(y)}T${r2(cx + w)} ${r2(y)}" fill="none" stroke="${i % 2 ? '#FFD27A' : '#FFF1C8'}" stroke-width="${S(6 - i * 0.7)}" opacity="${r2(.9 - i * .12)}" stroke-linecap="round"/>`; }
  // sugarcane on both sides
  [[-330, -1], [330, 1]].forEach(([dx, dir]) => { const x = cx + S(dx); o += `<path d="M${r2(x)} ${r2(cy + S(200))}L${r2(x - dir * S(40))} ${r2(cy - S(330))}" stroke="#3E8E3A" stroke-width="${S(20)}" stroke-linecap="round"/>`; for (let k = 0; k < 6; k++) { const t = k / 6, yy = cy + S(200) - t * S(530), xx = x - dir * t * S(40); o += `<path d="M${r2(xx - S(12))} ${r2(yy)}H${r2(xx + S(12))}" stroke="#235E22" stroke-width="${S(5)}"/>`; } o += `<path d="M${r2(x - dir * S(40))} ${r2(cy - S(330))}q${r2(-dir * S(90))} ${S(-40)} ${r2(-dir * S(150))} ${S(30)}M${r2(x - dir * S(40))} ${r2(cy - S(330))}q${r2(dir * S(60))} ${S(-60)} ${r2(dir * S(130))} ${S(-10)}" fill="none" stroke="#4FA845" stroke-width="${S(10)}" stroke-linecap="round"/>`; });
  // floating diyas
  [[-170, 110, .26], [180, 140, .22]].forEach(([dx, dy, sc], i) => o += diyaSvg(cx + S(dx), cy + S(dy), s * sc, 'w' + i));
  return o;
}
function holiSvg(cx, cy, s) {
  const S = v => r2(v * s), cols = ['#FF3E8A', '#FFD000', '#21C46B', '#2E8BFF', '#FF7A1A', '#B44CFF'], rr = rnd(7); let o = '';
  cols.forEach((c, i) => { const a = i / cols.length * Math.PI * 2, x = cx + Math.cos(a) * S(190), y = cy + Math.sin(a) * S(150); o += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${S(130)}" fill="${c}" opacity=".55"/>`; for (let k = 0; k < 9; k++) { const b = a + (rr() - .5) * 1.4, d = S(220 + rr() * 160); o += `<circle cx="${r2(cx + Math.cos(b) * d)}" cy="${r2(cy + Math.sin(b) * d * .8)}" r="${S(10 + rr() * 26)}" fill="${c}" opacity=".8"/>`; } });
  return o + rangoli(cx, cy, S(150), ['#FFFFFF', '#FFD000', '#FF3E8A', '#FFFFFF']);
}
function toran(y) {
  let o = `<path d="M0 ${y}Q${W / 2} ${y + 60} ${W} ${y}" fill="none" stroke="#C98B2B" stroke-width="4"/>`;
  for (let i = 0; i <= 12; i++) {
    const x = i * W / 12, yy = y + 60 * 4 * (i / 12) * (1 - i / 12) * 0.5 * 2 * 0.5;
    const c = i % 2 ? '#FFB020' : '#FF7A10';
    if (i % 2 === 0 && i > 0 && i < 12) o += `<path d="M${r2(x - 18)} ${r2(yy + 4)}L${r2(x)} ${r2(yy + 64)}L${r2(x + 18)} ${r2(yy + 4)}Z" fill="#3E8E3A"/>`;
    o += `<circle cx="${r2(x)}" cy="${r2(yy + 6)}" r="20" fill="${c}"/><circle cx="${r2(x)}" cy="${r2(yy + 6)}" r="12" fill="${i % 2 ? '#FF8A00' : '#F05A00'}"/><circle cx="${r2(x)}" cy="${r2(yy + 6)}" r="4" fill="#7A2E0E"/>`;
  }
  return o;
}
function wish(lang, date, city, festId) {
  const { t, L } = translator(lang), DI = require('./dayinfo.js'), WS = require('./wishes.js'), hm = ms => SC.hm(ms, city.tz);
  const evs = DI.dayInfo(date, city).events.filter(e => e.e && (e.kind === 'festival' || e.kind === 'sankranti' || e.kind === 'vrat'));
  const ev = (festId && evs.find(e => e.e.id === festId)) || evs.find(e => e.kind === 'festival') || evs[0];
  const id = festId || (ev ? ev.e.id : 'diwali'), fname = ev ? SC.festName(lang, ev.e) : t('fest.' + id);
  const w = WS.wish(id, lang, fname), pal = w.art === 'sun' ? WP.dawn : w.art === 'colours' ? WP.holi : WP.night, bands = [];
  let out = `<defs><linearGradient id="wbg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}"><stop offset="0" stop-color="${pal.top}"/><stop offset=".55" stop-color="${pal.mid}"/><stop offset="1" stop-color="${pal.bot}"/></linearGradient></defs>`;
  out += rect(0, 0, W, H, 0, 'url(#wbg)');
  const rr = rnd(11); for (let i = 0; i < 40; i++) { const x = rr() * W, y = 300 + rr() * 1500; if (x > 110 && x < W - 110) continue; out += sparkle(x, y, 5 + rr() * 12, pal.gold, .35 + rr() * .5); }
  for (let i = 0; i < 14; i++) out += sparkle(60 + rr() * (W - 120), 290 + rr() * 40, 4 + rr() * 8, pal.gold, .5);
  // top bar
  out += logo(MX, 70, 58) + T.line(t('brand.name').toUpperCase(), { size: 30, weight: 700, letter: 4 }).svg(MX + 74, 110, { fill: pal.gold });
  const chip = T.line(NATIVE[lang] || lang, { size: 28, weight: 700 }), cw = chip.width + 48;
  out += rect(W - MX - cw, 70, cw, 58, 29, 'none', `stroke="${pal.gold}" stroke-width="2.5"`) + chip.svg(W - MX - cw / 2, 110, { align: 'center', fill: pal.gold });
  out += toran(168);
  // artwork (one band)
  const ax = W / 2, ay = 640;
  let art = '';
  if (w.art === 'sun') art = sunSvg(ax, ay + 60, 1, pal);
  else if (w.art === 'colours') art = holiSvg(ax, ay - 20, 1);
  else {
    art = rangoli(ax, ay - 10, 270, ['#FF6FA0', '#FFB020', '#FF7A10', pal.gold]);
    art += w.art === 'wealth' ? wealthSvg(ax, ay + 20, 1) + diyaSvg(ax - 330, ay + 230, .34, 'l') + diyaSvg(ax + 300, ay + 230, .34, 'r') : diyaSvg(ax - 30, ay + 120, 1, 'm') + diyaSvg(ax - 350, ay + 210, .36, 'l') + diyaSvg(ax + 320, ay + 220, .36, 'r');
  }
  out += art; bands.push({ x: 0, y: 290, w: W, h: 740, fill: 'url(#wbg)' });
  // greeting
  let y = 1120, size = 96, gl;
  for (; size >= 60; size -= 4) { gl = T.wrap(w.greet, W - 2 * MX, { size, weight: 700, display: true }, 9); if (gl.length <= 2) break; }
  gl = gl.slice(0, 2); const g0 = y - size;
  gl.forEach(l => { out += l.svg(W / 2, y, { align: 'center', fill: pal.gold }); y += size * 1.12; });
  bands.push({ x: 0, y: Math.max(1032, g0 - 10), w: W, h: y - Math.max(1032, g0 - 10) - size * 0.12 + 34, fill: 'url(#wbg)' });
  out += rect(W / 2 - 70, y - size * 0.12 + 6, 140, 8, 4, pal.gold, 'opacity=".8"');
  // blessing
  y += 46; const b0 = y - 44;
  let bs = 40, bl = T.wrap(w.bless, W - 2 * MX - 40, { size: bs, weight: 500 }, 3);
  if (bl.length > 2) { bs = 34; bl = T.wrap(w.bless, W - 2 * MX - 20, { size: bs, weight: 500 }, 3); }
  bl.forEach(l => { out += l.svg(W / 2, y, { align: 'center', fill: pal.cream }); y += bs * 1.38; });
  bands.push({ x: 0, y: b0, w: W, h: y - b0 - 20, fill: 'url(#wbg)' });
  // the festival's puja muhurat, if there is one
  let M = DI.bestMuhurats(date, city).list.filter(m => (m.kind === 'puja' || m.kind === 'sthir' || m.kind === 'moonrise') && (!festId || !m.fest || m.fest.id === festId)).slice(0, 2);
  while (M.length > 1 && y + 14 + 36 + M.length * 88 + 64 > H - 190) M = M.slice(0, -1); // keep clear of the sign-off and footer
  if (M.length) {
    y += 14; const ph = 36 + M.length * 88, px = MX + 10, pw = W - 2 * px;
    out += rect(px, y, pw, ph, 36, '#FFFFFF', 'fill-opacity=".08" stroke="' + pal.gold + '" stroke-opacity=".7" stroke-width="2"');
    M.forEach((m, i) => {
      const yy = y + 58 + i * 88, [lab] = muhLabel(t, L, { ...m, lang });
      out += T.fit(lab, pw * 0.62 - 40, { size: 30, weight: 600 }).svg(px + 40, yy, { fill: pal.sub });
      out += T.line(m.end ? `${hm(m.start)} – ${hm(m.end)}` : hm(m.start), { size: 44, weight: 700 }).svg(px + pw - 40, yy + 4, { align: 'right', fill: pal.gold });
      out += T.fit(city.label || city.name, pw * 0.56 - 40, { size: 22, weight: 500 }).svg(px + 40, yy + 32, { fill: pal.sub, opacity: .75 });
    });
    bands.push({ x: px - 4, y: y - 4, w: pw + 8, h: ph + 8, fill: 'url(#wbg)' });
    y += ph;
  }
  // sign-off
  y = Math.min(H - 190, Math.max(y + 64, 1660));
  out += T.fit(WS.SIGN[lang].replace('{b}', t('brand.name')), W - 2 * MX, { size: 36, weight: 600 }).svg(W / 2, y, { align: 'center', fill: pal.cream });
  bands.push({ x: 0, y: y - 48, w: W, h: 66, fill: 'url(#wbg)' });
  // footer (static)
  out += T.line(S.SITE_URL.replace(/^https?:\/\//, ''), { size: 38, weight: 700 }).svg(W / 2, H - 120, { align: 'center', fill: pal.gold });
  if (IG) out += T.line('Instagram @' + IG.handle, { size: 28, weight: 500 }).svg(W / 2, H - 74, { align: 'center', fill: pal.cream, opacity: .8 });
  return { svg: SC.kit.wrapSvg(W, H, out), bands };
}

// ---------- YouTube Shorts: Single Moon Sign Deep-Dive ----------
function sign(lang, date, city, opt = {}) {
  const { t, L } = translator(lang), sIdx = Math.min(11, Math.max(0, +opt.sign || 0));
  const sName = L('names.rashi')[sIdx], sLord = J.SIGN_LORD[sIdx], lordName = L('names.graha')[sLord];
  const ms = Date.UTC(date.y, date.m - 1, date.d, 0, 30);
  const data = R.forDate(ms), s = data.signs[sIdx] || { stars: 3, area: { career: 3, money: 3, love: 3, health: 3 } };
  const pg = page(lang, sName + ' ' + t('sc.rashifal'), SC.dateFmt(lang, ms), s.chandrashtama ? t('sc.careDay') : t('sc.bestDay'));

  const x = MX - 24, w = W - 2 * x, pad = 36;
  let y = pg.top;
  const heroH = 220;
  pg.out += cardBox(x, y, w, heroH);
  pg.out += `<circle cx="${x + 90}" cy="${y + heroH / 2}" r="64" fill="${s.chandrashtama ? '#FBE3E1' : K.soft}"/>` + glyph(sIdx, x + 50, y + heroH / 2 - 40, 80, s.chandrashtama ? K.bad : K.accent);
  pg.out += T.fit(sName, 360, { size: 54, weight: 700 }).svg(x + 180, y + 80, { fill: K.ink });
  pg.out += T.fit((t('admin.lord') || 'Lord') + ': ' + lordName, 360, { size: 28, weight: 600 }).svg(x + 180, y + 126, { fill: K.sub });
  pg.out += dots(s.stars, x + w - 160, y + heroH / 2, 14);
  rowBand(pg.bands, x, y + 4, w, heroH - 8);
  y += heroH + 28;

  const areas = [
    ['career', t('rf.area.career'), s.area.career],
    ['money', t('rf.area.money'), s.area.money],
    ['love', t('rf.area.love'), s.area.love],
    ['health', t('rf.area.health'), s.area.health]
  ];
  const rowH = 120, totalH = areas.length * rowH + 20;
  pg.out += cardBox(x, y, w, totalH);
  areas.forEach(([k, label, score], i) => {
    const ry = y + 10 + i * rowH, mid = ry + rowH / 2;
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    const col = score >= 4 ? K.good : score <= 2 ? K.bad : K.accent;
    pg.out += `<circle cx="${x + 56}" cy="${mid}" r="12" fill="${col}"/>`;
    pg.out += T.fit(label, 320, { size: 34, weight: 700 }).svg(x + 88, mid + 12, { fill: K.ink });
    const barW = 240, barH = 18, barX = x + w - pad - barW;
    pg.out += rect(barX, mid - 9, barW, barH, 9, K.line);
    if (score > 0) pg.out += rect(barX, mid - 9, (barW * score) / 5, barH, 9, col);
    pg.out += T.line(`${score}/5`, { size: 30, weight: 700 }).svg(barX - 20, mid + 10, { align: 'right', fill: col });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}

function sign2(lang, date, city, opt = {}) {
  const { t, L } = translator(lang), sIdx = Math.min(11, Math.max(0, +opt.sign || 0));
  const sName = L('names.rashi')[sIdx], sLord = J.SIGN_LORD[sIdx];
  const ms = Date.UTC(date.y, date.m - 1, date.d, 0, 30);
  const data = R.forDate(ms), s = data.signs[sIdx] || { items: 'number: 7, color: yellow' };
  const lk = SC.luckyFor(sIdx, [s.items]);
  const pg = page(lang, sName + ' — ' + t('sc.luckyAndRemedy'), SC.dateFmt(lang, ms));

  const x = MX - 24, w = W - 2 * x, pad = 36;
  let y = pg.top;
  const lkRows = [
    [t('sc.luckyNum'), String(lk.num || 7), null, K.accent],
    [t('sc.luckyCol'), lk.color ? (t('sc.col.' + lk.color) || lk.color) : t('sc.col.yellow'), null, K.ink],
    [t('sc.rashiLord'), L('names.graha')[sLord], null, K.ink],
    [t('sc.luckyDir'), t('sc.dir.' + ((sIdx * 3) % 4)), null, K.ink]
  ];
  y = kvCard(pg, lkRows, y, 108) + 30;

  const YT = require('./yt-shorts.js');
  const mantra = YT.MANTRAS[sLord] || 'ॐ नमः शिवाय';
  const remH = 340;
  pg.out += cardBox(x, y, w, remH);
  pg.out += T.fit(t('sc.remedyTitle'), w - 2 * pad, { size: 34, weight: 700 }).svg(x + pad, y + 60, { fill: K.ink });
  pg.out += rect(x + pad, y + 84, 80, 6, 3, K.accent);
  pg.out += T.fit(t('sc.beejMantra'), w - 2 * pad, { size: 26, weight: 600 }).svg(x + pad, y + 130, { fill: K.sub });
  pg.out += rect(x + pad, y + 150, w - 2 * pad, 80, 16, K.soft);
  pg.out += T.fit(mantra, w - 2 * pad - 40, { size: 34, weight: 700 }).svg(W / 2, y + 204, { align: 'center', fill: K.ink });
  pg.out += T.fit(t('sc.mantraChant', { n: 108 }), w - 2 * pad, { size: 26, weight: 500 }).svg(W / 2, y + 276, { align: 'center', fill: K.sub });
  rowBand(pg.bands, x, y + 4, w, remH - 8);

  return finish(pg);
}

// ---------- YouTube Shorts: Planetary Transit / Shani Sade Sati ----------
function transit(lang, date, city, opt = {}) {
  const { t, L } = translator(lang);
  const ms = Date.UTC(date.y, date.m - 1, date.d);
  const YT = require('./yt-shorts.js');
  const tr = YT.saturnTransit(ms);
  const rn = i => L('names.rashi')[i];
  const pg = page(lang, t('sc.tr.shaniTitle'), t('sc.tr.shaniSub'), SC.dateFmt(lang, ms));

  const x = MX - 24, w = W - 2 * x, pad = 36;
  let y = pg.top;

  const sadeRows = [
    [t('sc.tr.rising'), tr.sade.rising, t('sc.tr.charan1'), K.accent],
    [t('sc.tr.peak'), tr.sade.peak, t('sc.tr.charan2'), K.bad],
    [t('sc.tr.setting'), tr.sade.setting, t('sc.tr.charan3'), K.accent]
  ];
  const rowH = 110, headH = 68, cardH = headH + sadeRows.length * rowH + 16;
  pg.out += cardBox(x, y, w, cardH);
  pg.out += T.fit('🪐 ' + t('sc.tr.sadeSati'), w - 2 * pad, { size: 32, weight: 700 }).svg(x + pad, y + 48, { fill: K.ink });
  rowBand(pg.bands, x, y + 4, w, headH - 4);
  sadeRows.forEach(([phase, sIdx, sub, col], i) => {
    const ry = y + headH + i * rowH, mid = ry + rowH / 2;
    pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += `<circle cx="${x + 64}" cy="${mid}" r="28" fill="${K.soft}"/>` + glyph(sIdx, x + 44, mid - 20, 40, col);
    pg.out += T.fit(rn(sIdx), 260, { size: 36, weight: 700 }).svg(x + 110, mid + 12, { fill: K.ink });
    pg.out += T.fit(phase, 240, { size: 28, weight: 600 }).svg(x + w - pad - 180, mid - 2, { align: 'right', fill: col });
    pg.out += T.fit(sub, 240, { size: 22, weight: 500 }).svg(x + w - pad - 180, mid + 24, { align: 'right', fill: K.sub });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  y += cardH + 28;

  const dhRows = [
    [t('sc.tr.kantaka'), tr.dhaiya.kantaka, t('sc.tr.house4')],
    [t('sc.tr.ashtama'), tr.dhaiya.ashtama, t('sc.tr.house8')]
  ];
  const dCardH = headH + dhRows.length * rowH + 16;
  pg.out += cardBox(x, y, w, dCardH);
  pg.out += T.fit('⚡ ' + t('sc.tr.dhaiya'), w - 2 * pad, { size: 32, weight: 700 }).svg(x + pad, y + 48, { fill: K.ink });
  rowBand(pg.bands, x, y + 4, w, headH - 4);
  dhRows.forEach(([label, sIdx, sub], i) => {
    const ry = y + headH + i * rowH, mid = ry + rowH / 2;
    pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += `<circle cx="${x + 64}" cy="${mid}" r="28" fill="#FBE3E1"/>` + glyph(sIdx, x + 44, mid - 20, 40, K.bad);
    pg.out += T.fit(rn(sIdx), 260, { size: 36, weight: 700 }).svg(x + 110, mid + 12, { fill: K.ink });
    pg.out += T.fit(label, 260, { size: 28, weight: 600 }).svg(x + w - pad, mid - 2, { align: 'right', fill: K.bad });
    pg.out += T.fit(sub, 260, { size: 22, weight: 500 }).svg(x + w - pad, mid + 24, { align: 'right', fill: K.sub });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });
  return finish(pg);
}

function transit2(lang, date, city, opt = {}) {
  const { t, L } = translator(lang);
  const ms = Date.UTC(date.y, date.m - 1, date.d);
  const YT = require('./yt-shorts.js');
  const tr = YT.saturnTransit(ms);
  const rn = i => L('names.rashi')[i];
  const pg = page(lang, t('sc.tr.remediesTitle'), t('sc.tr.remediesSub'), SC.dateFmt(lang, ms));

  const x = MX - 24, w = W - 2 * x, pad = 36;
  let y = pg.top;

  const benH = 150;
  pg.out += cardBox(x, y, w, benH);
  pg.out += T.fit('🌟 ' + t('sc.tr.benefic'), w - 2 * pad, { size: 30, weight: 700 }).svg(x + pad, y + 48, { fill: K.good });
  const benNames = tr.benefic.map(rn).join('  •  ');
  pg.out += T.fit(benNames, w - 2 * pad, { size: 36, weight: 700 }).svg(W / 2, y + 104, { align: 'center', fill: K.ink });
  rowBand(pg.bands, x, y + 4, w, benH - 8);
  y += benH + 28;

  const remRows = [
    ['📖', t('sc.tr.rem1H'), t('sc.tr.rem1D')],
    ['🪔', t('sc.tr.rem2H'), t('sc.tr.rem2D')],
    ['🕉️', t('sc.tr.rem3H'), t('sc.tr.rem3D')]
  ];
  const rRowH = 150, rCardH = remRows.length * rRowH + 24;
  pg.out += cardBox(x, y, w, rCardH);
  remRows.forEach(([icon, h, d], i) => {
    const ry = y + 12 + i * rRowH, mid = ry + rRowH / 2;
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    pg.out += T.line(icon, { size: 44, weight: 700 }).svg(x + pad, mid + 8, { fill: K.accent });
    pg.out += T.fit(h, w - pad * 2 - 80, { size: 32, weight: 700 }).svg(x + pad + 68, mid - 14, { fill: K.ink });
    pg.out += T.fit(d, w - pad * 2 - 80, { size: 24, weight: 500 }).svg(x + pad + 68, mid + 24, { fill: K.sub });
    rowBand(pg.bands, x, ry + 2, w, rRowH - 4);
  });

  return finish(pg);
}

// ---------- YouTube Shorts: Kundali 36 Guna Milan & Compatibility ----------
function match(lang, date, city, opt = {}) {
  const { t, L } = translator(lang);
  const bs = Math.min(11, Math.max(0, +opt.bSign || 0));
  const gs = Math.min(11, Math.max(0, +opt.gSign || 4));
  const bName = L('names.rashi')[bs], gName = L('names.rashi')[gs];
  const M = require('./match.js');

  const B = { sign: bs, nak: bs * 2 + 1, deg: 10, lord: J.SIGN_LORD[bs], av: M.avFor(bs, bs * 2 + 1, 10) };
  const G_data = { sign: gs, nak: gs * 2 + 1, deg: 10, lord: J.SIGN_LORD[gs], av: M.avFor(gs, gs * 2 + 1, 10) };
  const kootas = M.kootas(B, G_data);
  const total = kootas.reduce((s, x) => s + x.score, 0);

  const verdict = total >= 28 ? t('sc.ma.excellent') : total >= 18 ? t('sc.ma.average') : t('sc.ma.low');
  const vColor = total >= 28 ? K.good : total >= 18 ? K.accent : K.bad;

  const pg = page(lang, t('sc.ma.title'), `${bName} + ${gName}`, verdict);

  const x = MX - 24, w = W - 2 * x, pad = 36;
  let y = pg.top;

  const heroH = 170;
  pg.out += cardBox(x, y, w, heroH);
  pg.out += T.line(`${total} / 36`, { size: 68, weight: 700 }).svg(W / 2, y + 84, { align: 'center', fill: vColor });
  pg.out += T.fit(verdict, w - 2 * pad, { size: 30, weight: 700 }).svg(W / 2, y + 134, { align: 'center', fill: K.ink });
  rowBand(pg.bands, x, y + 4, w, heroH - 8);
  y += heroH + 28;

  const rowH = 78, kCardH = kootas.length * rowH + 20;
  pg.out += cardBox(x, y, w, kCardH);
  kootas.forEach((k, i) => {
    const ry = y + 10 + i * rowH, mid = ry + rowH / 2;
    if (i) pg.out += hl(x + 30, x + w - 30, ry);
    const ok = k.score === k.max;
    const col = ok ? K.good : k.score > 0 ? K.accent : K.bad;
    pg.out += `<circle cx="${x + pad + 10}" cy="${mid}" r="10" fill="${col}"/>`;
    pg.out += T.fit(t('kt.' + k.id + '.name'), 280, { size: 30, weight: 700 }).svg(x + pad + 36, mid + 10, { fill: K.ink });
    pg.out += T.line(`${k.score} / ${k.max}`, { size: 32, weight: 700 }).svg(x + w - pad, mid + 10, { align: 'right', fill: col });
    rowBand(pg.bands, x, ry + 2, w, rowH - 4);
  });

  return finish(pg);
}

function match2(lang, date, city, opt = {}) {
  const { t, L } = translator(lang);
  const bs = Math.min(11, Math.max(0, +opt.bSign || 0));
  const gs = Math.min(11, Math.max(0, +opt.gSign || 4));
  const bName = L('names.rashi')[bs], gName = L('names.rashi')[gs];
  const M = require('./match.js');

  const B = { sign: bs, nak: bs * 2 + 1, deg: 10, lord: J.SIGN_LORD[bs], av: M.avFor(bs, bs * 2 + 1, 10) };
  const G_data = { sign: gs, nak: gs * 2 + 1, deg: 10, lord: J.SIGN_LORD[gs], av: M.avFor(gs, gs * 2 + 1, 10) };
  const kootas = M.kootas(B, G_data);
  const nadiK = kootas.find(x => x.id === 'nadi') || { score: 8, max: 8 };
  const bhakootK = kootas.find(x => x.id === 'bhakoot') || { score: 7, max: 7 };
  const ganaK = kootas.find(x => x.id === 'gana') || { score: 6, max: 6 };

  const pg = page(lang, t('sc.ma.doshaTitle'), `${bName} & ${gName}`, t('sc.ma.doshaSub'));

  const x = MX - 24, w = W - 2 * x, pad = 36;
  let y = pg.top;

  const dRows = [
    [t('kt.nadi.name'), nadiK.score === 8 ? t('sc.ma.noDosha') : t('sc.ma.nadiDosha'), nadiK.score === 8 ? K.good : K.bad],
    [t('kt.bhakoot.name'), bhakootK.score === 7 ? t('sc.ma.noDosha') : t('sc.ma.bhakootDosha'), bhakootK.score === 7 ? K.good : K.bad],
    [t('kt.gana.name'), ganaK.score >= 5 ? t('sc.ma.ganaFriendly') : t('sc.ma.ganaDiff'), ganaK.score >= 5 ? K.good : K.accent]
  ];
  y = kvCard(pg, dRows.map(([k, v, col]) => [k, v, null, col]), y, 120) + 30;

  const remH = 340;
  pg.out += cardBox(x, y, w, remH);
  pg.out += T.fit(t('sc.ma.pariharaTitle'), w - 2 * pad, { size: 34, weight: 700 }).svg(x + pad, y + 60, { fill: K.ink });
  pg.out += rect(x + pad, y + 84, 80, 6, 3, K.accent);
  const adviceLines = [
    t('sc.ma.adv1'),
    t('sc.ma.adv2'),
    t('sc.ma.adv3')
  ];
  adviceLines.forEach((adv, i) => {
    pg.out += T.fit('• ' + adv, w - 2 * pad, { size: 28, weight: 600 }).svg(x + pad, y + 140 + i * 54, { fill: K.ink });
  });
  rowBand(pg.bands, x, y + 4, w, remH - 8);

  return finish(pg);
}

// ---------- YouTube Shorts: Lucky Gemstones & Remedies ----------
function gem(lang, date, city, opt = {}) {
  const { t, L } = translator(lang);
  const sIdx = Math.min(11, Math.max(0, +opt.sign || 0));
  const sName = L('names.rashi')[sIdx];
  const sLord = J.SIGN_LORD[sIdx], lordName = L('names.graha')[sLord];
  const G = require('./gems.js');

  const lifeGem = G.GEM[sLord];
  const bhagyaLord = J.SIGN_LORD[(sIdx + 8) % 12];
  const bhagyaGem = G.GEM[bhagyaLord];

  const pg = page(lang, sName + ' — ' + t('sc.gem.title'), t('sc.gem.sub', { lord: lordName }));

  const x = MX - 24, w = W - 2 * x, pad = 36;
  let y = pg.top;

  const lifeH = 210;
  pg.out += cardBox(x, y, w, lifeH);
  pg.out += `<circle cx="${x + 64}" cy="${y + lifeH / 2}" r="32" fill="${K.soft}"/>` + T.line('🛡️', { size: 36, weight: 700 }).svg(x + 44, y + lifeH / 2 + 12, { fill: K.accent });
  pg.out += T.fit(t('sc.gem.life'), 320, { size: 28, weight: 600 }).svg(x + 116, y + 68, { fill: K.sub });
  pg.out += T.fit(t('gm.g.' + lifeGem), w - 2 * pad - 120, { size: 44, weight: 700 }).svg(x + 116, y + 124, { fill: K.ink });
  pg.out += T.fit(t('sc.gem.lifeDesc'), w - 2 * pad - 120, { size: 24, weight: 500 }).svg(x + 116, y + 164, { fill: K.good });
  rowBand(pg.bands, x, y + 4, w, lifeH - 8);
  y += lifeH + 28;

  const bhagyaH = 210;
  pg.out += cardBox(x, y, w, bhagyaH);
  pg.out += `<circle cx="${x + 64}" cy="${y + bhagyaH / 2}" r="32" fill="${K.soft}"/>` + T.line('🌟', { size: 36, weight: 700 }).svg(x + 44, y + bhagyaH / 2 + 12, { fill: K.accent });
  pg.out += T.fit(t('sc.gem.fortune'), 320, { size: 28, weight: 600 }).svg(x + 116, y + 68, { fill: K.sub });
  pg.out += T.fit(t('gm.g.' + bhagyaGem), w - 2 * pad - 120, { size: 44, weight: 700 }).svg(x + 116, y + 124, { fill: K.ink });
  pg.out += T.fit(t('sc.gem.fortuneDesc'), w - 2 * pad - 120, { size: 24, weight: 500 }).svg(x + 116, y + 164, { fill: K.accent });
  rowBand(pg.bands, x, y + 4, w, bhagyaH - 8);
  y += bhagyaH + 28;

  const YT = require('./yt-shorts.js');
  const deity = (YT.DEITIES[sLord] || {})[lang] || (YT.DEITIES[sLord] || {}).en || 'Lord Shiva';
  const deityH = 140;
  pg.out += cardBox(x, y, w, deityH);
  pg.out += T.fit('🕉️ ' + t('sc.gem.deity') + ': ' + deity, w - 2 * pad, { size: 32, weight: 700 }).svg(W / 2, y + 84, { align: 'center', fill: K.ink });
  rowBand(pg.bands, x, y + 4, w, deityH - 8);

  return finish(pg);
}

function gem2(lang, date, city, opt = {}) {
  const { t, L } = translator(lang);
  const sIdx = Math.min(11, Math.max(0, +opt.sign || 0));
  const sName = L('names.rashi')[sIdx];
  const sLord = J.SIGN_LORD[sIdx];
  const YT = require('./yt-shorts.js');
  const G = require('./gems.js');
  const rules = YT.WEAR_RULES[sLord] || YT.WEAR_RULES.Mars;

  const pg = page(lang, sName + ' — ' + t('sc.gem.rulesTitle'), t('sc.gem.rulesSub'));

  const x = MX - 24, w = W - 2 * x, pad = 36;
  let y = pg.top;

  const rows = [
    [t('sc.gem.day'), rules.day[lang] || rules.day.en, null, K.ink],
    [t('sc.gem.metal'), rules.metal[lang] || rules.metal.en, null, K.ink],
    [t('sc.gem.finger'), rules.finger[lang] || rules.finger.en, null, K.ink],
    [t('sc.gem.rudraksha'), t('sc.gem.rudM', { m: G.MUKHI[sLord] ? G.MUKHI[sLord][0] : 3 }), null, K.accent]
  ];
  y = kvCard(pg, rows, y, 108) + 30;

  const cauH = 260;
  pg.out += cardBox(x, y, w, cauH);
  pg.out += `<circle cx="${x + 64}" cy="${y + 60}" r="24" fill="#FBE3E1"/>` + T.line('⚠️', { size: 28, weight: 700 }).svg(x + 48, y + 70, { fill: K.bad });
  pg.out += T.fit(t('sc.gem.cautionTitle'), w - 2 * pad - 80, { size: 32, weight: 700 }).svg(x + 104, y + 70, { fill: K.bad });
  pg.out += T.wrap(t('sc.gem.cautionDesc'), w - 2 * pad, { size: 26, weight: 500 }).map((l, i) => l.svg(x + pad, y + 130 + i * 40, { fill: K.sub })).join('');
  rowBand(pg.bands, x, y + 4, w, cauH - 8);

  return finish(pg);
}

const MAKERS = { numonth, numonth2, mulank, mulank2, nuall, nucta, wish, rashifal, rashifal2, panchang, panchang2, week, week2, fest, fest2, day, day2, day3, outro, sign, sign2, transit, transit2, match, match2, gem, gem2 };
// part 'full' → the finished card; 'base' → bands painted over (what the reel starts from)
async function reelCard(kind, { lang = 'en', date, city, part = 'full', type = 'png', fest, n, y, m, sign, planet, bSign, gSign } = {}) {
  await T.ready();
  const opt = kind === 'wish' ? fest : /^(mulank|nu)/.test(kind) ? { n, y, m } : { n, y, m, sign, planet, bSign, gSign, fest };
  const r = MAKERS[kind](lang, date, city, opt);
  const svg = part === 'base' ? r.svg.replace(/<\/svg>$/, r.bands.map(b => rect(b.x, b.y, b.w, b.h, 0, b.fill)).join('') + '</svg>') : r.svg;
  const buf = type === 'jpg' ? Buffer.from(SC.toJpeg(svg)) : SC.toPng(svg);
  return { buf, bands: r.bands.map(b => [Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h)]) };
}
module.exports = { reelCard, dayRows, KINDS: Object.keys(MAKERS) };

