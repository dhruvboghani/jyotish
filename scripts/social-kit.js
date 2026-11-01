/* Starter kit for the Grahavani Instagram / Facebook pages: profile picture, Facebook cover and 9 launch posts (4:5).
   Run: node scripts/social-kit.js <outDir>. Same look and text engine as the daily cards (lib/social-card.js). */
const fs = require('fs'), path = require('path');
const T = require('../lib/hbtext.js');
const SC = require('../lib/social-card.js');
const { C, background, brand, footer, rect, hline, glyph, logo, wrapSvg, sym, SPRITE } = SC.kit;
const { translator } = require('../lib/i18n-server.js');
const OUT = process.argv[2] || 'social-kit';
const { t, L } = translator('en');
const W = 1080, H = 1350;
const DEFS = (SPRITE.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
const graha = (name, x, y, size) => { const g = sym('gr-' + name); return g ? `<g transform="translate(${x} ${y}) scale(${size / 64})">${g.inner}</g>` : ''; };
const text = (s, x, y, o) => T.line(s, o).svg(x, y, o);
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
const card = (y, h) => rect(60, y, W - 120, h, 30, C.paper, 'fill-opacity=".97"');

const items = [];
// 1 Welcome
items.push(['01-welcome', post(3, 'Namaste', 'Welcome to Grahavani', y => {
  let o = center('Voice of the planets', y + 10, { size: 34, fill: C.goldL });
  const rows = [['i-chart', 'Free Kundali', 'Birth chart, dashas, yogas, doshas and remedies'], ['i-heart', 'Kundali matching', '36 gunas, Mangal Dosha and Porutham'], ['i-sun', 'Daily Panchang', 'Tithi, nakshatra, Rahu Kaal for your city'], ['i-star', 'Rashifal', 'Daily, monthly and yearly for all 12 signs'], ['i-cal', 'Muhurta', 'Good dates for marriage, griha pravesh, more']];
  const top = y + 60; o += card(top, rows.length * 118 + 30);
  rows.forEach(([ic, a, b], i) => {
    const ry = top + 30 + i * 118, s = sym(ic);
    o += `<circle cx="${130}" cy="${ry + 44}" r="34" fill="#FFF3D6"/>` + (s ? `<g transform="translate(${106} ${ry + 20}) scale(2)" color="${C.brown}">${s.inner}</g>` : '');
    o += text(a, 190, ry + 38, { size: 34, weight: 700, fill: C.ink }) + T.fit(b, W - 330, { size: 26 }).svg(190, ry + 78, { fill: C.muted });
    if (i < rows.length - 1) o += hline(100, W - 100, ry + 112);
  });
  return o + center('English · हिन्दी · ગુજરાતી · தமிழ் · తెలుగు · ಕನ್ನಡ', top + rows.length * 118 + 100, { size: 30, weight: 500, fill: C.goldL });
})]);
// 2 Diwali + Dhanteras muhurat
items.push(['02-diwali-2026', post(9, 'Festival dates 2026', 'Dhanteras & Diwali Puja Muhurat', y => {
  let o = '';
  const rows = [['Dhanteras', 'Friday, 6 November 2026', '17:32 – 19:56'], ['Diwali · Lakshmi Puja', 'Sunday, 8 November 2026', '17:55 – 19:51']];
  rows.forEach(([a, d, m], i) => {
    const top = y + 30 + i * 300; o += card(top, 270);
    o += text(a, 110, top + 76, { size: 44, display: true, fill: C.ink }) + text(d, 110, top + 126, { size: 30, fill: C.muted });
    o += text('Puja muhurat (New Delhi)', 110, top + 190, { size: 27, weight: 600, fill: C.brown }) + text(m, W - 110, top + 196, { size: 46, weight: 700, fill: C.good, align: 'right' });
  });
  return o + center('Timings for your own city on the Grahavani Panchang', y + 660, { size: 28, fill: '#fff', opacity: 0.85 });
})]);
// 3 Sade Sati
items.push(['03-sade-sati', post(4, 'Shani explained', 'What is Sade Sati?', y => {
  let o = para('Saturn takes about 2½ years per sign. Sade Sati is the 7½ years it spends in the sign before your Moon sign, in it, and after it.', 100, y + 20, W - 200, { size: 31, fill: '#fff', opacity: 0.9 }, 44).svg;
  const top = y + 180, ph = [['1 · Rising', 'Expenses, travel, restless sleep. Cut waste, finish old work.'], ['2 · Peak', 'Saturn over the Moon: pressure, duties, patience tested.'], ['3 · Setting', 'Money and family speech tested, but hard work pays off.']];
  o += card(top, ph.length * 150 + 30);
  ph.forEach(([a, b], i) => { const ry = top + 30 + i * 150; o += text(a, 110, ry + 44, { size: 34, weight: 700, fill: C.brown }) + para(b, 110, ry + 90, W - 220, { size: 28, fill: C.ink }, 38).svg; if (i < 2) o += hline(100, W - 100, ry + 140); });
  return o + center('Not always bad: Saturn rewards discipline and honest work.', top + ph.length * 150 + 90, { size: 28, weight: 500, fill: C.goldL });
})]);
// 4 Rahu Kaal weekday table
items.push(['04-rahu-kaal', post(6, 'Daily timing', 'Rahu Kaal by weekday', y => {
  const rows = [['Monday', '07:30 – 09:00'], ['Tuesday', '15:00 – 16:30'], ['Wednesday', '12:00 – 13:30'], ['Thursday', '13:30 – 15:00'], ['Friday', '10:30 – 12:00'], ['Saturday', '09:00 – 10:30'], ['Sunday', '16:30 – 18:00']];
  const top = y + 20; let o = card(top, rows.length * 86 + 30);
  rows.forEach(([d, tm], i) => { const ry = top + 15 + i * 86, mid = ry + 43; o += text(d, 110, mid + 12, { size: 33, weight: 600, fill: C.ink }) + text(tm, W - 110, mid + 12, { size: 34, weight: 700, fill: C.bad, align: 'right' }); if (i < rows.length - 1) o += hline(100, W - 100, ry + 86); });
  return o + para('Approximate, for a 6:00 sunrise. Real times change with your city and season — avoid starting new work in this window.', 100, top + rows.length * 86 + 90, W - 200, { size: 26, fill: '#fff', opacity: 0.8, align: 'left' }, 36).svg;
})]);
// 5 Mangal Dosha myths
items.push(['05-mangal-dosha', post(8, 'Marriage matching', 'Mangal Dosha: myth vs fact', y => {
  const rows = [['Myth', 'A Manglik marriage will fail.', 'Fact', 'Almost half of all people have some Mangal Dosha. It describes temperament, not destiny.'], ['Myth', 'Only a Manglik can marry a Manglik.', 'Fact', 'Many rules cancel the dosha: Mars in own sign, Jupiter’s aspect, and more.']];
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
items.push(['06-rashis', post(5, 'Vedic zodiac', 'The 12 Rashis and their lords', y => {
  const lords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const px = 50, gap = 16, tw = (W - px * 2 - gap * 2) / 3, th = 168; let o = '';
  for (let i = 0; i < 12; i++) {
    const tx = px + (i % 3) * (tw + gap), ty = y + 10 + Math.floor(i / 3) * (th + gap);
    o += rect(tx, ty, tw, th, 22, C.paper, 'fill-opacity=".97"') + glyph(i, tx + tw / 2 - 24, ty + 16, 48, C.gold);
    o += T.fit(L('names.rashi')[i], tw - 20, { size: 30, weight: 700 }).svg(tx + tw / 2, ty + 106, { align: 'center', fill: C.ink });
    o += T.fit('Lord ' + L('names.graha')[lords[i]], tw - 20, { size: 23 }).svg(tx + tw / 2, ty + 142, { align: 'center', fill: C.muted });
  }
  return o;
})]);
// 7 Guna milan
items.push(['07-guna-milan', post(7, 'Kundali matching', 'The 36 Gunas explained', y => {
  const k = [['Varna', 'Work & ego', 1], ['Vashya', 'Attraction', 2], ['Tara', 'Health & luck', 3], ['Yoni', 'Intimacy', 4], ['Graha Maitri', 'Friendship', 5], ['Gana', 'Temperament', 6], ['Bhakoot', 'Love & family', 7], ['Nadi', 'Health & children', 8]];
  const top = y + 20; let o = card(top, k.length * 80 + 30);
  k.forEach(([a, b, n], i) => { const ry = top + 15 + i * 80, mid = ry + 40; o += text(a, 110, mid + 11, { size: 32, weight: 700, fill: C.ink }) + text(b, 470, mid + 10, { size: 27, fill: C.muted }) + text(String(n), W - 110, mid + 12, { size: 36, weight: 700, fill: C.brown, align: 'right' }); if (i < k.length - 1) o += hline(100, W - 100, ry + 80); });
  return o + center('18+ is a fair match · 24+ is very good', top + k.length * 80 + 90, { size: 30, weight: 600, fill: C.goldL });
})]);
// 8 Gemstones
items.push(['08-gemstones', post(2, 'Ratna guide', 'A gemstone for each graha', y => {
  const g = [['Sun', 'Ruby'], ['Moon', 'Pearl'], ['Mars', 'Red Coral'], ['Mercury', 'Emerald'], ['Jupiter', 'Yellow Sapphire'], ['Venus', 'Diamond'], ['Saturn', 'Blue Sapphire'], ['Rahu', 'Hessonite'], ['Ketu', "Cat's Eye"]];
  const px = 50, gap = 16, tw = (W - px * 2 - gap * 2) / 3, th = 196; let o = '';
  g.forEach(([p, s], i) => {
    const tx = px + (i % 3) * (tw + gap), ty = y + 10 + Math.floor(i / 3) * (th + gap);
    o += rect(tx, ty, tw, th, 22, C.paper, 'fill-opacity=".97"') + graha(p, tx + tw / 2 - 36, ty + 14, 72);
    o += T.fit(L('names.graha')[p], tw - 20, { size: 29, weight: 700 }).svg(tx + tw / 2, ty + 128, { align: 'center', fill: C.ink });
    o += T.fit(s, tw - 20, { size: 25 }).svg(tx + tw / 2, ty + 166, { align: 'center', fill: C.brown });
  });
  return o + center('Wear one only if that graha is good for your lagna.', y + 3 * (th + gap) + 50, { size: 28, weight: 500, fill: C.goldL });
})]);
// 9 App
items.push(['09-app', post(10, 'Free app', 'Grahavani in your pocket', y => {
  const pts = ['Your Kundali saved, even offline', 'Morning Panchang and Rahu Kaal alerts', 'Daily Rashifal you can listen to', 'Japa counter, vrat tracker, puja guides', 'Six Indian languages'];
  const top = y + 30; let o = card(top, pts.length * 96 + 30);
  pts.forEach((p, i) => { const ry = top + 15 + i * 96, mid = ry + 48, s = sym('i-check'); o += `<circle cx="125" cy="${mid}" r="24" fill="#E3F3EA"/>` + (s ? `<g transform="translate(109 ${mid - 16}) scale(1.33)" color="${C.good}">${s.inner}</g>` : '') + T.fit(p, W - 300, { size: 31, weight: 500 }).svg(170, mid + 11, { fill: C.ink }); if (i < pts.length - 1) o += hline(100, W - 100, ry + 96); });
  return o + center('Android app · download from the website', top + pts.length * 96 + 100, { size: 30, weight: 600, fill: C.goldL });
})]);

// Profile picture (Instagram shows it as a circle)
function profile() {
  const S = 1080; let o = `<defs><radialGradient id="pg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#2A2E7C"/><stop offset="1" stop-color="#16173B"/></radialGradient></defs><rect width="${S}" height="${S}" fill="url(#pg)"/>`;
  return wrapSvg(S, S, o + logo(0, 0, S));
}
// Facebook cover 1640×624; key content kept in the middle 1200px (phones crop the sides)
function cover() {
  const CW = 1640, CH = 624; let o = background(CW, CH, 12);
  o += logo(250, 150, 200);
  o += T.line('Grahavani', { size: 110, display: true }).svg(500, 270, { fill: '#fff' });
  o += T.line('Voice of the planets', { size: 44, fill: C.goldL }).svg(505, 336, { fill: C.goldL });
  o += T.line('Free Kundali · Matching · Panchang · Rashifal', { size: 38, weight: 500 }).svg(505, 410, { fill: '#fff', opacity: 0.9 });
  o += T.line('English · हिन्दी · ગુજરાતી · தமிழ் · తెలుగు · ಕನ್ನಡ', { size: 34 }).svg(505, 466, { fill: '#fff', opacity: 0.8 });
  return wrapSvg(CW, CH, o);
}

(async () => {
  await T.ready();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'profile-picture.png'), SC.toPng(profile()));
  fs.writeFileSync(path.join(OUT, 'facebook-cover.png'), SC.toPng(cover()));
  for (const [name, svg] of items) fs.writeFileSync(path.join(OUT, 'post-' + name + '.png'), SC.toPng(svg()));
  console.log('Wrote', items.length + 2, 'images to', OUT);
})();
