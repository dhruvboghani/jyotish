/* Reel cards, "clean modern" look: cream background, large bold text, one accent colour (saffron).
   Every card is 1080×1920. Each renderer also returns `bands`: the rectangles (title block, each row) that the
   browser reveals one after another, and a `base` image (the card with those bands painted over) to start from.
   GET /api/social/?img=<kind>&theme=modern[&part=base] (lib/routes/social.js); bands come in the X-Bands header. */
const T = require('./hbtext.js');
const R = require('./rashifal.js');
const P = require('./panchang.js');
const SC = require('./social-card.js');
const S = require('./site.js');
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

const MAKERS = { rashifal, rashifal2, panchang, panchang2, week, week2, fest, fest2, day, day2, day3, outro };
// part 'full' → the finished card; 'base' → bands painted over (what the reel starts from)
async function reelCard(kind, { lang = 'en', date, city, part = 'full', type = 'png' } = {}) {
  await T.ready();
  const r = MAKERS[kind](lang, date, city);
  const svg = part === 'base' ? r.svg.replace(/<\/svg>$/, r.bands.map(b => rect(b.x, b.y, b.w, b.h, 0, b.fill)).join('') + '</svg>') : r.svg;
  const buf = type === 'jpg' ? Buffer.from(SC.toJpeg(svg)) : SC.toPng(svg);
  return { buf, bands: r.bands.map(b => [Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h)]) };
}
module.exports = { reelCard, dayRows, KINDS: Object.keys(MAKERS) };
