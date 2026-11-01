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
const W = 1080; let H = 1350, MODE = 'post'; // MODE 'reel' → 1080×1920, content split into layers at M
const M = '<!--L-->';
const DEFS = (SPRITE.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
const graha = (name, x, y, size) => { const g = sym('gr-' + name); return g ? `<g transform="translate(${x} ${y}) scale(${size / 64})">${g.inner}</g>` : ''; };
const text = (s, x, y, o) => T.line(s, o).svg(x, y, o);
const centerWrap = (s, y, o, lh = 40) => T.wrap(s, W - 160, o, 2).map((l, i) => l.svg(W / 2, y + i * lh, { align: 'center', ...o })).join('');
const center = (s, y, o) => T.fit(s, W - 140, o).svg(W / 2, y, { align: 'center', ...o });
function para(s, x, y, maxW, o, lh) { let out = ''; T.wrap(s, maxW, o).forEach((l, i) => { out += l.svg(x, y + i * lh, o); }); return { svg: out, h: T.wrap(s, maxW, o).length * lh }; }
// Standard post frame: brand, eyebrow, title (up to 2 lines), then body() draws from y; footer CTA
function post(seed, eyebrow, title, body) { return () => {
  const reel = MODE === 'reel', bg = background(W, reel ? H + 120 : H, seed), bgDefs = (bg.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
  let out = '';
  const b = brand(t, W, reel ? 150 : 54); out += b.svg; let y = b.bottom + (reel ? 110 : 64);
  if (eyebrow) { out += center(eyebrow.toUpperCase(), y, { size: reel ? 30 : 27, weight: 600, fill: C.gold, letter: 2 }); y += reel ? 82 : 70; }
  T.wrap(title, W - 140, { size: reel ? 70 : 62, display: true }).forEach(l => { out += l.svg(W / 2, y, { align: 'center', fill: '#fff' }); y += reel ? 84 : 72; });
  out += M + body(y + (reel ? 50 : 10));
  out += M + footer(t, W, reel ? H - 300 : H, reel); // reels: keep the button above Instagram's caption area
  if (!reel) return wrapSvg(W, H, bg + DEFS + out.split(M).join(''));
  return { bg: wrapSvg(W, H + 120, bg), defs: bgDefs + DEFS, parts: out.split(M).filter(x => x.trim()) };
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
  rows.forEach(([ic, a, b], i) => { o += M;
    const ry = top + 30 + i * 118, s = sym(ic);
    o += `<circle cx="${130}" cy="${ry + 44}" r="34" fill="#FFF3D6"/>` + (s ? `<g transform="translate(${106} ${ry + 20}) scale(2)" color="${C.brown}">${s.inner}</g>` : '');
    o += T.fit(a, W - 330, { size: 34, weight: 700 }).svg(190, ry + 38, { fill: C.ink }) + T.fit(b, W - 330, { size: 26 }).svg(190, ry + 78, { fill: C.muted });
    if (i < rows.length - 1) o += hline(100, W - 100, ry + 112);
  });
  return o + M + center('English · हिन्दी · ગુજરાતી · தமிழ் · తెలుగు · ಕನ್ನಡ', top + rows.length * 118 + 100, { size: 30, weight: 500, fill: C.goldL });
})]);
// 2 Diwali + Dhanteras muhurat
items.push(['02-diwali-2026', post(9, X.diwali.eye, X.diwali.title, y => {
  let o = '';
  const rows = [[X.diwali.names[0], fdate(2026, 11, 6), '17:32 – 19:56'], [X.diwali.names[1], fdate(2026, 11, 8), '17:55 – 19:51']];
  rows.forEach(([a, d, m], i) => { o += M;
    const top = y + 30 + i * 300; o += card(top, 270);
    o += T.fit(a, W - 220, { size: 44, display: true }).svg(110, top + 76, { fill: C.ink }) + text(d, 110, top + 126, { size: 30, fill: C.muted });
    o += T.fit(X.diwali.label, 480, { size: 27, weight: 600 }).svg(110, top + 190, { fill: C.brown }) + text(m, W - 110, top + 196, { size: 46, weight: 700, fill: C.good, align: 'right' });
  });
  return o + M + centerWrap(X.diwali.note, y + 660, { size: 28, fill: '#fff', opacity: 0.85 });
})]);
// 3 Sade Sati
items.push(['03-sade-sati', post(4, X.sade.eye, X.sade.title, y => {
  let o = para(X.sade.intro, 100, y + 20, W - 200, { size: 31, fill: '#fff', opacity: 0.9 }, 44).svg;
  const introH = T.wrap(X.sade.intro, W - 200, { size: 31 }).length * 44, top = y + 50 + introH, ph = X.sade.phases;
  o += card(top, ph.length * 150 + 30);
  ph.forEach(([a, b], i) => { o += M; const ry = top + 30 + i * 150; o += text(a, 110, ry + 44, { size: 34, weight: 700, fill: C.brown }) + para(b, 110, ry + 90, W - 220, { size: 28, fill: C.ink }, 38).svg; if (i < 2) o += hline(100, W - 100, ry + 140); });
  return o + M + centerWrap(X.sade.note, top + ph.length * 150 + 90, { size: 28, weight: 500, fill: C.goldL });
})]);
// 4 Rahu Kaal weekday table
items.push(['04-rahu-kaal', post(6, X.rahu.eye, X.rahu.title, y => {
  const times = ['07:30 – 09:00', '15:00 – 16:30', '12:00 – 13:30', '13:30 – 15:00', '10:30 – 12:00', '09:00 – 10:30', '16:30 – 18:00'], rows = times.map((tm, i) => [wday(i + 1), tm]);
  const top = y + 20; let o = card(top, rows.length * 86 + 30);
  rows.forEach(([d, tm], i) => { o += M; const ry = top + 15 + i * 86, mid = ry + 43; o += text(d, 110, mid + 12, { size: 33, weight: 600, fill: C.ink }) + text(tm, W - 110, mid + 12, { size: 34, weight: 700, fill: C.bad, align: 'right' }); if (i < rows.length - 1) o += hline(100, W - 100, ry + 86); });
  return o + M + para(X.rahu.note, 100, top + rows.length * 86 + 90, W - 200, { size: 26, fill: '#fff', opacity: 0.8, align: 'left' }, 36).svg;
})]);
// 5 Mangal Dosha myths
items.push(['05-mangal-dosha', post(8, X.mangal.eye, X.mangal.title, y => {
  const rows = X.mangal.rows.map(([a, b]) => [X.mangal.myth, a, X.mangal.fact, b]);
  let o = '', top = y + 20;
  rows.forEach(([m, mt, f, ft]) => { o += M;
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
  for (let i = 0; i < 12; i++) { o += M;
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
  k.forEach(([a, b, n], i) => { o += M; const ry = top + 15 + i * 80, mid = ry + 40; o += T.fit(a, 330, { size: 32, weight: 700 }).svg(110, mid + 11, { fill: C.ink }) + T.fit(b, 440, { size: 27 }).svg(470, mid + 10, { fill: C.muted }) + text(String(n), W - 110, mid + 12, { size: 36, weight: 700, fill: C.brown, align: 'right' }); if (i < k.length - 1) o += hline(100, W - 100, ry + 80); });
  return o + M + centerWrap(X.guna.note, top + k.length * 80 + 90, { size: 30, weight: 600, fill: C.goldL });
})]);
// 8 Gemstones
items.push(['08-gemstones', post(2, X.gems.eye, X.gems.title, y => {
  const g = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'].map((p, i) => [p, X.gems.stones[i]]);
  const px = 50, gap = 16, tw = (W - px * 2 - gap * 2) / 3, th = 196; let o = '';
  g.forEach(([p, s], i) => { o += M;
    const tx = px + (i % 3) * (tw + gap), ty = y + 10 + Math.floor(i / 3) * (th + gap);
    o += rect(tx, ty, tw, th, 22, C.paper, 'fill-opacity=".97"') + graha(p, tx + tw / 2 - 36, ty + 14, 72);
    o += T.fit(L('names.graha')[p], tw - 20, { size: 29, weight: 700 }).svg(tx + tw / 2, ty + 128, { align: 'center', fill: C.ink });
    o += T.fit(s, tw - 20, { size: 25 }).svg(tx + tw / 2, ty + 166, { align: 'center', fill: C.brown });
  });
  return o + M + centerWrap(X.gems.note, y + 3 * (th + gap) + 50, { size: 28, weight: 500, fill: C.goldL });
})]);
// 9 App
items.push(['09-app', post(10, X.app.eye, X.app.title, y => {
  const pts = X.app.pts;
  const top = y + 30; let o = card(top, pts.length * 96 + 30);
  pts.forEach((p, i) => { o += M; const ry = top + 15 + i * 96, mid = ry + 48, s = sym('i-check'); o += `<circle cx="125" cy="${mid}" r="24" fill="#E3F3EA"/>` + (s ? `<g transform="translate(109 ${mid - 16}) scale(1.33)" color="${C.good}">${s.inner}</g>` : '') + T.fit(p, W - 300, { size: 31, weight: 500 }).svg(170, mid + 11, { fill: C.ink }); if (i < pts.length - 1) o += hline(100, W - 100, ry + 96); });
  return o + M + centerWrap(X.app.note, top + pts.length * 96 + 100, { size: 30, weight: 600, fill: C.goldL });
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

// ---------- Reels: layers fade and slide in one after another over a slowly zooming sky, with a soft tanpura drone ----------
const { execFileSync } = require('child_process');
function drone(file, secs) {
  // Tanpura-like plucks (Pa Sa' Sa' Sa) on C#, each a few harmonics with a decaying envelope, plus a quiet hum
  const notes = [207.65, 277.18, 277.18, 138.59], step = 0.9;
  const f = notes.map((hz, i) => `if(eq(mod(floor(t/${step}),4),${i}),${hz},0)`).join('+');
  const env = `exp(-1.6*mod(t,${step}))`;
  const expr = `0.16*${env}*(sin(2*PI*(${f})*t)+0.5*sin(4*PI*(${f})*t)+0.25*sin(6*PI*(${f})*t))+0.035*sin(2*PI*69.3*t)`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `aevalsrc='${expr}|${expr}':s=44100:d=${secs}`, '-af', 'aecho=0.8:0.7:60:0.3,lowpass=f=3000', file]);
}
// Bounding box of what a layer draws (from its alpha channel)
function bboxOf(svg) {
  const { Resvg } = require('@resvg/resvg-js'), img = new Resvg(svg, { font: { loadSystemFonts: false } }).render(), px = img.pixels, w = img.width, h = img.height;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (px[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(w - 1, x1 + 4); y1 = Math.min(h - 1, y1 + 4);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// Reels are 9:16: the body (everything between the title and the button) is scaled up and centred in the free space
function reelLayers(r) {
  const n = r.parts.length, svg = (p, tr) => wrapSvg(W, H, r.defs + (tr ? `<g transform="${tr}">${p}</g>` : p));
  const boxes = r.parts.map(p => bboxOf(svg(p)));
  const body = boxes.slice(1, n - 1).filter(Boolean);
  const ux = Math.min(...body.map(b => b.x)), uy = Math.min(...body.map(b => b.y)), ux1 = Math.max(...body.map(b => b.x + b.w)), uy1 = Math.max(...body.map(b => b.y + b.h));
  const top = boxes[0].y + boxes[0].h + 70, bottom = boxes[n - 1].y - 80, uw = ux1 - ux, uh = uy1 - uy;
  const k = Math.min(1.32, (W - 90) / uw, (bottom - top) / uh);
  const tx = W / 2 - k * (ux + uw / 2), ty = top + (bottom - top - uh * k) / 2 - k * uy, tr = `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${k.toFixed(4)})`;
  return r.parts.map((p, i) => { const s2 = svg(p, i > 0 && i < n - 1 ? tr : ''); return { svg: s2, box: bboxOf(s2) }; });
}
// opts.quick: shorter build-up and reading time (one language segment inside the all-languages reel); audio null = silent
function encodeReel(dir, boxes, out, audio, opts = {}) {
  const layerCount = boxes.length;
  const fadeD = opts.quick ? 0.38 : 0.45, bodyN = layerCount - 2;
  const stag = opts.quick ? Math.max(0.16, Math.min(0.35, 2.2 / Math.max(1, bodyN))) : Math.max(0.28, Math.min(0.6, 3.6 / Math.max(1, bodyN)));
  const starts = [0.2]; for (let i = 0; i < bodyN; i++) starts.push((opts.quick ? 0.6 : 0.95) + i * stag); starts.push(starts[starts.length - 1] + (opts.quick ? 0.4 : 0.6));
  const D = +(starts[starts.length - 1] + (opts.quick ? 2.6 : 4.5)).toFixed(2); // time to read before it moves on / loops
  const args = ['-y', '-v', 'error', '-framerate', '30', '-i', path.join(dir, 'bg.png')];
  for (let i = 0; i < layerCount; i++) args.push('-framerate', '30', '-i', path.join(dir, `l${i}.png`));
  if (audio) args.push('-i', audio);
  let g = `[0:v]loop=-1:1,trim=duration=${D},crop=1080:1920:0:'120*(1-t/${D})'[v0];`;
  for (let i = 0; i < layerCount; i++) {
    const S = starts[i].toFixed(2);
    const b = boxes[i];
    g += `[${i + 1}:v]crop=${b.w}:${b.h}:${b.x}:${b.y},loop=-1:1,trim=duration=${D},format=rgba,fade=in:st=${S}:d=${fadeD}:alpha=1[l${i}];`;
    g += `[v${i}][l${i}]overlay=x=${b.x}:y='${b.y}+if(lt(t,${S}),36,36*pow(max(0,1-(t-${S})/${fadeD}),2))':format=auto[v${i + 1}];`;
  }
  g += `[v${layerCount}]format=yuv420p[vout]` + (audio ? `;[${layerCount + 1}:a]atrim=0:${D},afade=t=in:d=0.6,afade=t=out:st=${D - 1.2}:d=1.2,volume=2.6[aout]` : '');
  const tmp = out.replace(/\.mp4$/, '.part.mp4');
  args.push('-filter_complex', g, '-map', '[vout]', ...(audio ? ['-map', '[aout]'] : []), '-t', String(D), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', ...(audio ? ['-c:a', 'aac', '-b:a', '128k'] : []), '-movflags', '+faststart', tmp);
  execFileSync('ffmpeg', args);
  fs.renameSync(tmp, out);
  return D;
}

// One reel per topic with every language in turn: segments cross-fade into each other over one continuous drone
function joinReels(segs, out, audio) {
  const X = 0.45, args = ['-y', '-v', 'error'];
  segs.forEach(sg => args.push('-i', sg.file));
  args.push('-i', audio);
  let g = '', prev = '[0:v]', t = segs[0].D;
  for (let i = 1; i < segs.length; i++) {
    const lab = i === segs.length - 1 ? '[vj]' : `[x${i}]`;
    g += `${prev}[${i}:v]xfade=transition=slideleft:duration=${X}:offset=${(t - X).toFixed(2)}${lab};`;
    prev = lab; t += segs[i].D - X;
  }
  const D = +t.toFixed(2);
  g += `[vj]format=yuv420p[vout];[${segs.length}:a]atrim=0:${D},afade=t=in:d=0.8,afade=t=out:st=${(D - 1.5).toFixed(2)}:d=1.5,volume=2.6[aout]`;
  const tmp = out.replace(/\.mp4$/, '.part.mp4');
  args.push('-filter_complex', g, '-map', '[vout]', '-map', '[aout]', '-t', String(D), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', tmp);
  execFileSync('ffmpeg', args);
  fs.renameSync(tmp, out);
  return D;
}

(async () => {
  await T.ready();
  if (process.argv.includes('--combined')) return combined();
  const reels = process.argv.includes('--reels'), args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const outDir = args[0] || OUT, only = args[1] ? args[1].split(',') : LANGS, pick = args[2] ? args[2].split(',') : null;
  fs.mkdirSync(outDir, { recursive: true });
  if (reels) { MODE = 'reel'; H = 1920; }
  else fs.writeFileSync(path.join(outDir, 'profile-picture.png'), SC.toPng(profile()));
  const audio = path.join(outDir, '.drone.wav'); if (reels) drone(audio, 20);
  for (const lang of only) {
    ({ t, L } = translator(lang)); X = require('./social-kit-text/' + lang + '.js'); LOC = L('meta.locale') || 'en-IN';
    const dir = path.join(outDir, lang); fs.mkdirSync(dir, { recursive: true });
    if (!reels) fs.writeFileSync(path.join(dir, 'facebook-cover.png'), SC.toPng(cover()));
    for (const [name, make] of buildItems()) {
      if (pick && !pick.some(p => name.includes(p))) continue;
      if (!reels) { fs.writeFileSync(path.join(dir, 'post-' + name + '.png'), SC.toPng(make())); continue; }
      const r = make(), tmp = path.join(outDir, '.layers-' + lang + '-' + name); fs.mkdirSync(tmp, { recursive: true });
      fs.writeFileSync(path.join(tmp, 'bg.png'), SC.toPng(r.bg));
      const lay = reelLayers(r);
      if (process.argv.includes('--frame')) { fs.writeFileSync(path.join(dir, 'frame-' + name + '.png'), SC.toPng(wrapSvg(W, H, r.bg.replace(/^<svg[^>]*>|<\/svg>$/g, '') + lay.map(l => l.svg.replace(/^<svg[^>]*>|<\/svg>$/g, '')).join('')))); fs.rmSync(tmp, { recursive: true, force: true }); continue; }
      lay.forEach((l, i) => fs.writeFileSync(path.join(tmp, `l${i}.png`), SC.toPng(l.svg)));
      const D = encodeReel(tmp, lay.map(l => l.box), path.join(dir, 'reel-' + name + '.mp4'), audio);
      fs.rmSync(tmp, { recursive: true, force: true });
      console.log('  reel', lang, name, D + 's');
    }
    const order = ['app', 'gems', 'guna', 'rashis', 'mangal', 'rahu', 'sade', 'diwali', 'welcome'];
    fs.writeFileSync(path.join(dir, 'captions.txt'), order.map((k, i) => `${reels ? 'REEL' : 'POST'} ${String(9 - i).padStart(2, '0')} – ${k}\n${X.cap[k]}\n${X.tags}\n`).join('\n'));
    console.log('Wrote', lang);
  }
  if (reels) fs.rmSync(audio, { force: true });
})();

// node scripts/social-kit.js <outDir> [langs] [topics] --combined  →  <outDir>/reel-<topic>-all-languages.mp4
async function combined() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const outDir = args[0] || OUT, langs = args[1] ? args[1].split(',') : LANGS, pick = args[2] ? args[2].split(',') : null;
  fs.mkdirSync(outDir, { recursive: true }); MODE = 'reel'; H = 1920;
  const audio = path.join(outDir, '.drone.wav'); drone(audio, 90);
  const segs = {}; // topic → [{ file, D }]
  for (const lang of langs) {
    ({ t, L } = translator(lang)); X = require('./social-kit-text/' + lang + '.js'); LOC = L('meta.locale') || 'en-IN';
    for (const [name, make] of buildItems()) {
      if (pick && !pick.some(p => name.includes(p))) continue;
      const r = make(), tmp = path.join(outDir, '.layers-' + lang + '-' + name); fs.mkdirSync(tmp, { recursive: true });
      fs.writeFileSync(path.join(tmp, 'bg.png'), SC.toPng(r.bg));
      const lay = reelLayers(r); lay.forEach((l, i) => fs.writeFileSync(path.join(tmp, `l${i}.png`), SC.toPng(l.svg)));
      const file = path.join(outDir, `.seg-${name}-${lang}.mp4`), D = encodeReel(tmp, lay.map(l => l.box), file, null, { quick: true });
      fs.rmSync(tmp, { recursive: true, force: true });
      (segs[name] = segs[name] || []).push({ file, D });
    }
    console.log('  segments', lang);
  }
  for (const [name, list] of Object.entries(segs)) {
    const D = joinReels(list, path.join(outDir, `reel-${name}-all-languages.mp4`), audio);
    list.forEach(sg => fs.rmSync(sg.file, { force: true }));
    console.log('reel', name, D + 's');
  }
  fs.rmSync(audio, { force: true });
}
