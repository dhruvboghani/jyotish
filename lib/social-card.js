/* Server-made PNG cards for social media: today's Rashifal for all 12 signs and today's Panchang,
   as a post (1080×1350, 4:5) or a story (1080×1920, 9:16). Same look as the share cards in the browser (src/js/sharecard.js).
   SVG is built by hand, text comes from lib/hbtext.js as paths, and @resvg/resvg-js turns it into PNG. */
const fs = require('fs'), path = require('path');
const T = require('./hbtext.js');
const R = require('./rashifal.js');
const P = require('./panchang.js');
const { translator } = require('./i18n-server.js');
const S = require('./site.js');

const SIZE = { post: [1080, 1350], story: [1080, 1920] };
const C = { ink: '#16173B', ink2: '#2A2E7C', gold: '#E2A92E', goldL: '#F7E7B8', paper: '#FFFDF7', line: '#EDE3CC', muted: '#7A7C9C', bad: '#C2352D', good: '#2E7D4F', brown: '#8C5E05' };
const IG = require('./social-links.js').links().instagram;
const HOST = S.SITE_URL.replace(/^https?:\/\//, '') + (IG ? '  ·  Instagram @' + IG.handle : '');

// Rashi glyphs and the logo, straight from the site's sprite
const SPRITE = fs.readFileSync(path.join(S.ROOT, 'src', 'sprite.svg'), 'utf8');
const sym = id => { const m = SPRITE.match(new RegExp(`<symbol id="${id}" viewBox="([^"]+)">([\\s\\S]*?)</symbol>`)); return m ? { vb: m[1].split(/\s+/).map(Number), inner: m[2] } : null; };
const SIGNS = Array.from({ length: 12 }, (_, i) => sym('rs-' + i)), LOGO = sym('logo');
const glyph = (s, x, y, size, color) => { const g = SIGNS[s]; return g ? `<g transform="translate(${x} ${y}) scale(${size / g.vb[2]})" color="${color}">${g.inner}</g>` : ''; };
const logo = (x, y, size) => LOGO ? `<g transform="translate(${x} ${y}) scale(${size / LOGO.vb[2]})">${LOGO.inner}</g>` : '';

const r2 = n => Math.round(n * 100) / 100;
const rect = (x, y, w, h, r, fill, extra = '') => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${r}" fill="${fill}" ${extra}/>`;
const hline = (x1, x2, y) => `<path d="M${r2(x1)} ${r2(y)}H${r2(x2)}" stroke="${C.line}" stroke-width="2"/>`;
function star(cx, cy, r, fill) {
  let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += (i ? 'L' : 'M') + r2(cx + rr * Math.cos(a)) + ' ' + r2(cy + rr * Math.sin(a)); }
  return `<path d="${d}Z" fill="${fill}"/>`;
}
function stars(n, X, cy, r, align = 'center', off = 'rgba(226,169,46,.25)') {
  const gap = r * 2.5, w = gap * 4 + r * 2, x0 = align === 'center' ? X - w / 2 : align === 'right' ? X - w : X;
  let s = ''; for (let i = 0; i < 5; i++) s += star(x0 + r + i * gap, cy, r, i < n ? C.gold : off); return s;
}
function background(W, H, seed0) {
  let seed = seed0; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let dots = ''; for (let i = 0; i < Math.round(H / 11); i++) dots += `<circle cx="${r2(rnd() * W)}" cy="${r2(rnd() * H)}" r="${r2(rnd() * 2 + 0.4)}" fill="#F7E7B8" fill-opacity="${(0.1 + rnd() * 0.45).toFixed(2)}"/>`;
  return `<defs><linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${C.ink}"/><stop offset="1" stop-color="${C.ink2}"/></linearGradient>
  <radialGradient id="glow" cx="${W * 0.85}" cy="${H * 0.08}" r="${W * 0.7}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#E2A92E" stop-opacity=".22"/><stop offset="1" stop-color="#E2A92E" stop-opacity="0"/></radialGradient>
  <linearGradient id="pill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3C459"/><stop offset="1" stop-color="#D3971C"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>${dots}
  <circle cx="${W * 0.92}" cy="${H * 0.06}" r="${W * 0.32}" fill="none" stroke="#E2A92E" stroke-opacity=".18" stroke-width="2" stroke-dasharray="3 9"/>`;
}
function brand(t, W, y) {
  const name = T.line(t('brand.name'), { size: 38, weight: 600 }), s = 64, gap = 16, x0 = (W - (s + gap + name.width)) / 2;
  return { svg: logo(x0, y, s) + name.svg(x0 + s + gap, y + s / 2 + 13, { fill: C.goldL }), bottom: y + s };
}
function footer(t, W, H, story) {
  const pillH = story ? 92 : 78, y = H - (story ? 200 : 150), lab = T.fit(t('sc.cta'), W - 210, { size: story ? 36 : 31, weight: 700 });
  const pw = Math.min(W - 160, lab.width + 90), host = T.line(HOST, { size: story ? 30 : 27, weight: 500 });
  return rect((W - pw) / 2, y, pw, pillH, pillH / 2, 'url(#pill)') + lab.svg(W / 2, y + pillH / 2 + (story ? 13 : 11), { align: 'center', fill: C.ink })
    + host.svg(W / 2, y + pillH + (story ? 62 : 52), { align: 'center', fill: '#fff', opacity: 0.8 });
}
const wrapSvg = (W, H, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
const dateFmt = (lang, ms) => { const { L } = translator(lang); try { return new Intl.DateTimeFormat(L('meta.locale') || 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(ms); } catch (e) { return new Date(ms).toISOString().slice(0, 10); } };

// date: { y, m, d } (IST calendar day)
function rashifalSvg(lang, date, fmt) {
  const { t, L } = translator(lang), story = fmt === 'story', [W, H] = SIZE[fmt], data = R.forDate(Date.UTC(date.y, date.m - 1, date.d, 0, 30));
  const rn = i => L('names.rashi')[i];
  let out = background(W, H, 5);
  const b = brand(t, W, story ? 100 : 54); out += b.svg; let y = b.bottom;
  y += story ? 96 : 74; out += T.fit(t('sc.allH'), W - 120, { size: story ? 66 : 54, display: true }).svg(W / 2, y, { align: 'center', fill: '#fff' });
  y += story ? 54 : 46; out += T.line(dateFmt(lang, Date.UTC(date.y, date.m - 1, date.d)), { size: story ? 32 : 28 }).svg(W / 2, y, { align: 'center', fill: '#fff', opacity: 0.85 });
  const best = s => ['career', 'money', 'love', 'health'].reduce((bb, a) => s.area[a] > s.area[bb] ? a : bb, 'career');
  const top = y + (story ? 50 : 36);
  if (story) {
    const px = 60, pw = W - 120, rowH = 106;
    out += rect(px, top, pw, rowH * 12 + 20, 30, C.paper, 'fill-opacity=".97"');
    data.signs.forEach((s, i) => {
      const ry = top + 10 + i * rowH, mid = ry + rowH / 2;
      out += glyph(s.sign, px + 34, mid - 30, 60, C.gold);
      out += T.fit(rn(s.sign), 330, { size: 36, weight: 700 }).svg(px + 120, mid - 4, { fill: C.ink });
      out += T.fit(s.chandrashtama ? t('sc.careDay') : t('sc.best', { a: t('rf.area.' + best(s)) }), 330, { size: 25, weight: 500 }).svg(px + 120, mid + 34, { fill: s.chandrashtama ? C.bad : C.muted });
      out += stars(s.stars, px + pw - 40, mid, 20, 'right');
      if (i < 11) out += hline(px + 34, px + pw - 34, ry + rowH);
    });
  } else {
    const px = 50, gap = 18, cols = 3, tw = (W - px * 2 - gap * (cols - 1)) / cols, th = 196;
    data.signs.forEach((s, i) => {
      const tx = px + (i % cols) * (tw + gap), ty = top + Math.floor(i / cols) * (th + gap);
      out += rect(tx, ty, tw, th, 22, C.paper, s.chandrashtama ? `stroke="${C.bad}" stroke-width="3"` : 'fill-opacity=".97"');
      out += glyph(s.sign, tx + tw / 2 - 26, ty + 18, 52, C.gold);
      out += T.fit(rn(s.sign), tw - 24, { size: 30, weight: 700 }).svg(tx + tw / 2, ty + 112, { align: 'center', fill: C.ink });
      out += stars(s.stars, tx + tw / 2, ty + 152, 14);
    });
  }
  out += footer(t, W, H, story);
  return { svg: wrapSvg(W, H, out), data };
}

function tithiName(L, i) { return (i < 15 ? L('names.paksha').Shukla : L('names.paksha').Krishna) + ' ' + (i === 14 ? L('names.tithi')[14] : i === 29 ? L('names.tithi')[15] : L('names.tithi')[i % 15]); }
const hm = (ms, tz) => { const d = new Date(ms + tz * 60000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
// city: { name, lat, lon, tz }
function panchangSvg(lang, date, fmt, city) {
  const { t, L } = translator(lang), story = fmt === 'story', [W, H] = SIZE[fmt], tz = city.tz;
  const p = P.day({ year: date.y, month: date.m, day: date.d, lat: city.lat, lon: city.lon, tzMinutes: tz });
  let out = background(W, H, 11);
  const b = brand(t, W, story ? 100 : 50); out += b.svg; let y = b.bottom;
  y += story ? 100 : 76; out += T.fit(t('pc.title'), W - 120, { size: story ? 70 : 56, display: true }).svg(W / 2, y, { align: 'center', fill: '#fff' });
  y += story ? 56 : 46; out += T.line(dateFmt(lang, Date.UTC(date.y, date.m - 1, date.d)), { size: story ? 32 : 29 }).svg(W / 2, y, { align: 'center', fill: '#fff', opacity: 0.85 });
  y += story ? 46 : 38; out += T.fit(city.label || city.name, W - 160, { size: story ? 29 : 26, weight: 500 }).svg(W / 2, y, { align: 'center', fill: C.goldL });
  const rows = p.polar ? [] : [
    [t('sec.pan.tithi'), tithiName(L, p.tithi[0].index), t('pp.until', { t: hm(p.tithi[0].end, tz) })],
    [t('sec.pan.nakshatra'), L('names.nak')[p.nakshatra[0].index], t('pp.until', { t: hm(p.nakshatra[0].end, tz) })],
    [t('sec.pan.yoga'), L('names.yoga27')[p.yoga[0].index], ''],
    [t('sec.pan.karana'), (L('names.karana') || {})[p.karana[0].name] || p.karana[0].name, ''],
    [t('sec.pan.vara'), L('names.vara')[p.weekday], ''],
    [t('pp.masa'), L('names.masa')[p.lunarMonth], ''],
    [t('sec.pan.sunrise') + ' / ' + t('sec.pan.sunset'), `${hm(p.sunrise, tz)} / ${hm(p.sunset, tz)}`, ''],
    [t('pp.rahu'), `${hm(p.rahuKaal.start, tz)} – ${hm(p.rahuKaal.end, tz)}`, '', C.bad],
    [t('pp.abhijit'), p.abhijit ? `${hm(p.abhijit.start, tz)} – ${hm(p.abhijit.end, tz)}` : t('pp.noAbhijit'), '', C.good]
  ];
  const top = y + (story ? 54 : 34), px = 60, pw = W - 120, pad = 40, rowH = story ? 128 : 92, half = (pw - pad * 2) / 2;
  out += rect(px, top, pw, rows.length * rowH + 24, 30, C.paper, 'fill-opacity=".97"');
  rows.forEach(([k, v, sub, col], i) => {
    const ry = top + 12 + i * rowH, mid = ry + rowH / 2, kv = story ? 27 : 24, vv = story ? 35 : 31;
    out += T.fit(k, half - 10, { size: kv, weight: 600 }).svg(px + pad, mid + kv * 0.35, { fill: C.brown });
    out += T.fit(v, half + 30, { size: vv, weight: 700 }).svg(px + pw - pad, sub ? mid - 4 : mid + vv * 0.35, { align: 'right', fill: col || C.ink });
    if (sub) out += T.fit(sub, half + 30, { size: story ? 24 : 21 }).svg(px + pw - pad, mid + (story ? 32 : 27), { align: 'right', fill: C.muted });
    if (i < rows.length - 1) out += hline(px + pad, px + pw - pad, ry + rowH);
  });
  out += footer(t, W, H, story);
  return { svg: wrapSvg(W, H, out), panchang: p };
}

function render(svg) { const { Resvg } = require('@resvg/resvg-js'); return new Resvg(svg, { font: { loadSystemFonts: false }, fitTo: { mode: 'original' } }).render(); }
function toPng(svg) { return render(svg).asPng(); }
// Instagram's publishing API takes JPEG only
function toJpeg(svg, quality = 90) {
  const img = render(svg);
  return require('jpeg-js').encode({ data: img.pixels, width: img.width, height: img.height }, quality).data;
}
// kind: 'rashifal' | 'panchang'; returns { png, info }
async function card(kind, { lang = 'en', date, fmt = 'post', city, type = 'png' } = {}) {
  await T.ready();
  const r = kind === 'panchang' ? panchangSvg(lang, date, fmt, city) : rashifalSvg(lang, date, fmt);
  return type === 'jpg' ? { jpg: Buffer.from(toJpeg(r.svg)), info: r } : { png: toPng(r.svg), info: r };
}
module.exports = { card, SIZE, toPng, kit: { C, background, brand, footer, rect, hline, star, stars, glyph, logo, wrapSvg, sym, SPRITE } };
