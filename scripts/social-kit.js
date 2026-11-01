/* Starter kit for the Grahavani Instagram / Facebook pages: profile picture, Facebook cover and 9 launch posts (4:5).
   Run: node scripts/social-kit.js <outDir>. Same look and text engine as the daily cards (lib/social-card.js). */
const fs = require('fs'), path = require('path');
const T = require('../lib/hbtext.js');
if (process.env.KIT_DEBUG) { const f0 = T.fit; T.fit = (s, w, o) => { const l = T.line(s, o); if (l.width > w) console.log('  cut:', s); return f0(s, w, o); }; }
const SC = require('../lib/social-card.js');
const { C, background, brand, footer, rect, hline, glyph, logo, wrapSvg, sym, SPRITE } = SC.kit;
const { translator } = require('../lib/i18n-server.js');
const OUT = process.argv[2] || 'social-kit';
const LANGS = ['en', 'hi', 'gu', 'ta', 'te', 'kn'];
let t, L, X, LOC; // set per language in build()
const W = 1080, H = 1350;
const DEFS = (SPRITE.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
const graha = (name, x, y, size) => { const g = sym('gr-' + name); return g ? `<g transform="translate(${x} ${y}) scale(${size / 64})">${g.inner}</g>` : ''; };
const text = (s, x, y, o) => T.line(s, o).svg(x, y, o);
const centerWrap = (s, y, o, lh = 40) => T.wrap(s, W - 160, o, 2).map((l, i) => l.svg(W / 2, y + i * lh, { align: 'center', ...o })).join('');
const center = (s, y, o) => T.fit(s, W - 140, o).svg(W / 2, y, { align: 'center', ...o });
function para(s, x, y, maxW, o, lh) { let out = ''; T.wrap(s, maxW, o).forEach((l, i) => { out += l.svg(x, y + i * lh, o); }); return { svg: out, h: T.wrap(s, maxW, o).length * lh }; }
// Standard post frame: brand, eyebrow, title (up to 2 lines), then body() draws from y; footer CTA
function post(seed, eyebrow, title, body) { return () => {
  let out = background(W, H, seed) + DEFS;
  const b = brand(t, W, 54); out += b.svg; let y = b.bottom + 64;
  if (eyebrow) { out += center(eyebrow.toUpperCase(), y, { size: 27, weight: 600, fill: C.gold, letter: 2 }); y += 70; }
  T.wrap(title, W - 140, { size: 62, display: true }).forEach(l => { out += l.svg(W / 2, y, { align: 'center', fill: '#fff' }); y += 72; });
  out += body(y + 10);
  out += footer(t, W, H, false);
  return wrapSvg(W, H, out);
}; }
const cap = x => x.charAt(0).toUpperCase() + x.slice(1);
const fdate = (y, m, d) => new Intl.DateTimeFormat(LOC, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
// 1 = Monday … 7 = Sunday (5 Jan 2026 was a Monday)
const wday = n => cap(new Intl.DateTimeFormat(LOC, { weekday: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, 0, 4 + n)));
const card = (y, h) => rect(60, y, W - 120, h, 30, C.paper, 'fill-opacity=".97"');

function buildItems() {
const items = [];
// 1 Welcome
items.push(['01-welcome', post(3, X.welcome.eye, X.welcome.title, y => {
  let o = center(X.welcome.tag, y + 10, { size: 34, fill: C.goldL });
  const rows = ['i-chart', 'i-heart', 'i-sun', 'i-star', 'i-cal'].map((ic, i) => [ic, ...X.welcome.rows[i]]);
  const top = y + 60; o += card(top, rows.length * 118 + 30);
  rows.forEach(([ic, a, b], i) => {
    const ry = top + 30 + i * 118, s = sym(ic);
    o += `<circle cx="${130}" cy="${ry + 44}" r="34" fill="#FFF3D6"/>` + (s ? `<g transform="translate(${106} ${ry + 20}) scale(2)" color="${C.brown}">${s.inner}</g>` : '');
    o += T.fit(a, W - 330, { size: 34, weight: 700 }).svg(190, ry + 38, { fill: C.ink }) + T.fit(b, W - 330, { size: 26 }).svg(190, ry + 78, { fill: C.muted });
    if (i < rows.length - 1) o += hline(100, W - 100, ry + 112);
  });
  return o + center('English · हिन्दी · ગુજરાતી · தமிழ் · తెలుగు · ಕನ್ನಡ', top + rows.length * 118 + 100, { size: 30, weight: 500, fill: C.goldL });
})]);
// 2 Diwali + Dhanteras muhurat
items.push(['02-diwali-2026', post(9, X.diwali.eye, X.diwali.title, y => {
  let o = '';
  const rows = [[X.diwali.names[0], fdate(2026, 11, 6), '17:32 – 19:56'], [X.diwali.names[1], fdate(2026, 11, 8), '17:55 – 19:51']];
  rows.forEach(([a, d, m], i) => {
    const top = y + 30 + i * 300; o += card(top, 270);
    o += T.fit(a, W - 220, { size: 44, display: true }).svg(110, top + 76, { fill: C.ink }) + text(d, 110, top + 126, { size: 30, fill: C.muted });
    o += T.fit(X.diwali.label, 480, { size: 27, weight: 600 }).svg(110, top + 190, { fill: C.brown }) + text(m, W - 110, top + 196, { size: 46, weight: 700, fill: C.good, align: 'right' });
  });
  return o + centerWrap(X.diwali.note, y + 660, { size: 28, fill: '#fff', opacity: 0.85 });
})]);
// 3 Sade Sati
items.push(['03-sade-sati', post(4, X.sade.eye, X.sade.title, y => {
  let o = para(X.sade.intro, 100, y + 20, W - 200, { size: 31, fill: '#fff', opacity: 0.9 }, 44).svg;
  const introH = T.wrap(X.sade.intro, W - 200, { size: 31 }).length * 44, top = y + 50 + introH, ph = X.sade.phases;
  o += card(top, ph.length * 150 + 30);
  ph.forEach(([a, b], i) => { const ry = top + 30 + i * 150; o += text(a, 110, ry + 44, { size: 34, weight: 700, fill: C.brown }) + para(b, 110, ry + 90, W - 220, { size: 28, fill: C.ink }, 38).svg; if (i < 2) o += hline(100, W - 100, ry + 140); });
  return o + centerWrap(X.sade.note, top + ph.length * 150 + 90, { size: 28, weight: 500, fill: C.goldL });
})]);
// 4 Rahu Kaal weekday table
items.push(['04-rahu-kaal', post(6, X.rahu.eye, X.rahu.title, y => {
  const times = ['07:30 – 09:00', '15:00 – 16:30', '12:00 – 13:30', '13:30 – 15:00', '10:30 – 12:00', '09:00 – 10:30', '16:30 – 18:00'], rows = times.map((tm, i) => [wday(i + 1), tm]);
  const top = y + 20; let o = card(top, rows.length * 86 + 30);
  rows.forEach(([d, tm], i) => { const ry = top + 15 + i * 86, mid = ry + 43; o += text(d, 110, mid + 12, { size: 33, weight: 600, fill: C.ink }) + text(tm, W - 110, mid + 12, { size: 34, weight: 700, fill: C.bad, align: 'right' }); if (i < rows.length - 1) o += hline(100, W - 100, ry + 86); });
  return o + para(X.rahu.note, 100, top + rows.length * 86 + 90, W - 200, { size: 26, fill: '#fff', opacity: 0.8, align: 'left' }, 36).svg;
})]);
// 5 Mangal Dosha myths
items.push(['05-mangal-dosha', post(8, X.mangal.eye, X.mangal.title, y => {
  const rows = X.mangal.rows.map(([a, b]) => [X.mangal.myth, a, X.mangal.fact, b]);
  let o = '', top = y + 20;
  rows.forEach(([m, mt, f, ft]) => {
    o += card(top, 330);
    o += text(m.toUpperCase(), 110, top + 62, { size: 26, weight: 700, fill: C.bad, letter: 2 }) + T.fit(mt, W - 220, { size: 32, weight: 600 }).svg(110, top + 108, { fill: C.ink });
    o += hline(100, W - 100, top + 140) + text(f.toUpperCase(), 110, top + 192, { size: 26, weight: 700, fill: C.good, letter: 2 }) + para(ft, 110, top + 238, W - 220, { size: 29, fill: C.ink }, 40).svg;
    top += 360;
  });
  return o;
})]);
// 6 The 12 rashis and their lords
items.push(['06-rashis', post(5, X.rashis.eye, X.rashis.title, y => {
  const lords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const px = 50, gap = 16, tw = (W - px * 2 - gap * 2) / 3, th = 168; let o = '';
  for (let i = 0; i < 12; i++) {
    const tx = px + (i % 3) * (tw + gap), ty = y + 10 + Math.floor(i / 3) * (th + gap);
    o += rect(tx, ty, tw, th, 22, C.paper, 'fill-opacity=".97"') + glyph(i, tx + tw / 2 - 24, ty + 16, 48, C.gold);
    o += T.fit(L('names.rashi')[i], tw - 20, { size: 30, weight: 700 }).svg(tx + tw / 2, ty + 106, { align: 'center', fill: C.ink });
    o += T.fit(cap(t('res.lord', { g: { g: lords[i] } })), tw - 20, { size: 23 }).svg(tx + tw / 2, ty + 142, { align: 'center', fill: C.muted });
  }
  return o;
})]);
// 7 Guna milan
items.push(['07-guna-milan', post(7, X.guna.eye, X.guna.title, y => {
  const k = X.guna.k.map(([a, b], i) => [a, b, i + 1]);
  const top = y + 20; let o = card(top, k.length * 80 + 30);
  k.forEach(([a, b, n], i) => { const ry = top + 15 + i * 80, mid = ry + 40; o += T.fit(a, 330, { size: 32, weight: 700 }).svg(110, mid + 11, { fill: C.ink }) + T.fit(b, 440, { size: 27 }).svg(470, mid + 10, { fill: C.muted }) + text(String(n), W - 110, mid + 12, { size: 36, weight: 700, fill: C.brown, align: 'right' }); if (i < k.length - 1) o += hline(100, W - 100, ry + 80); });
  return o + centerWrap(X.guna.note, top + k.length * 80 + 90, { size: 30, weight: 600, fill: C.goldL });
})]);
// 8 Gemstones
items.push(['08-gemstones', post(2, X.gems.eye, X.gems.title, y => {
  const g = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map((p, i) => [p, X.gems.stones[i]]);
  const px = 50, gap = 16, tw = (W - px * 2 - gap * 2) / 3, th = 196; let o = '';
  g.forEach(([p, s], i) => {
    const tx = px + (i % 3) * (tw + gap), ty = y + 10 + Math.floor(i / 3) * (th + gap);
    o += rect(tx, ty, tw, th, 22, C.paper, 'fill-opacity=".97"') + graha(p, tx + tw / 2 - 36, ty + 14, 72);
    o += T.fit(L('names.graha')[p], tw - 20, { size: 29, weight: 700 }).svg(tx + tw / 2, ty + 128, { align: 'center', fill: C.ink });
    o += T.fit(s, tw - 20, { size: 25 }).svg(tx + tw / 2, ty + 166, { align: 'center', fill: C.brown });
  });
  return o + centerWrap(X.gems.note, y + 3 * (th + gap) + 50, { size: 28, weight: 500, fill: C.goldL });
})]);
// 9 App
items.push(['09-app', post(10, X.app.eye, X.app.title, y => {
  const pts = X.app.pts;
  const top = y + 30; let o = card(top, pts.length * 96 + 30);
  pts.forEach((p, i) => { const ry = top + 15 + i * 96, mid = ry + 48, s = sym('i-check'); o += `<circle cx="125" cy="${mid}" r="24" fill="#E3F3EA"/>` + (s ? `<g transform="translate(109 ${mid - 16}) scale(1.33)" color="${C.good}">${s.inner}</g>` : '') + T.fit(p, W - 300, { size: 31, weight: 500 }).svg(170, mid + 11, { fill: C.ink }); if (i < pts.length - 1) o += hline(100, W - 100, ry + 96); });
  return o + centerWrap(X.app.note, top + pts.length * 96 + 100, { size: 30, weight: 600, fill: C.goldL });
})]);
return items;
}

// Profile picture (Instagram shows it as a circle)
function profile() {
  const S = 1080; let o = `<defs><radialGradient id="pg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2A2E7C"/><stop offset="1" stop-color="#16173B"/></radialGradient></defs><rect width="${S}" height="${S}" fill="url(#pg)"/>`;
  return wrapSvg(S, S, o + logo(0, 0, S));
}
// Facebook cover 1640×624; key content kept in the middle 1200px (phones crop the sides)
function cover() {
  const CW = 1640, CH = 624; let o = background(CW, CH, 12);
  o += logo(250, 150, 200);
  o += T.fit(t('brand.name'), 1000, { size: 110, display: true }).svg(500, 270, { fill: '#fff' });
  o += T.line(X.cover.tag, { size: 44 }).svg(505, 336, { fill: C.goldL });
  o += T.fit(X.cover.line, 1060, { size: 38, weight: 500 }).svg(505, 410, { fill: '#fff', opacity: 0.9 });
  o += T.line('English · हिन्दी · ગુજરાતી · தமிழ் · తెలుగు · ಕನ್ನಡ', { size: 34 }).svg(505, 466, { fill: '#fff', opacity: 0.8 });
  return wrapSvg(CW, CH, o);
}

(async () => {
  await T.ready();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'profile-picture.png'), SC.toPng(profile()));
  const only = process.argv[3] ? process.argv[3].split(',') : LANGS;
  for (const lang of only) {
    ({ t, L } = translator(lang)); X = require('./social-kit-text/' + lang + '.js'); LOC = L('meta.locale') || 'en-IN';
    const dir = path.join(OUT, lang); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'facebook-cover.png'), SC.toPng(cover()));
    for (const [name, svg] of buildItems()) fs.writeFileSync(path.join(dir, 'post-' + name + '.png'), SC.toPng(svg()));
    const order = ['app', 'gems', 'guna', 'rashis', 'mangal', 'rahu', 'sade', 'diwali', 'welcome'];
    fs.writeFileSync(path.join(dir, 'captions.txt'), order.map((k, i) => `POST ${String(9 - i).padStart(2, '0')} – ${k}\n${X.cap[k]}\n${X.tags}\n`).join('\n'));
    console.log('Wrote', lang);
  }
})();
