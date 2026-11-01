/* Shareable images in one look: WhatsApp / Instagram status (9:16) and post (4:5).
   shareCardModal() shows a preview with a size switch, then shares the PNG (app share sheet, Web Share with files)
   or offers a download. Cards: Rashifal for one sign, Rashifal for all 12 signs, today's Panchang, the Kundali card. */
const SC_SIZE = { story: [1080, 1920], post: [1080, 1350] };
const SC = { ink: '#16173B', ink2: '#2A2E7C', gold: '#E2A92E', goldL: '#F7E7B8', paper: '#FFFDF7', line: '#EDE3CC', muted: '#7A7C9C', bad: '#C2352D', good: '#2E7D4F' };
const scFont = () => getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
const scDisp = () => (getComputedStyle(document.documentElement).getPropertyValue('--f-display') || '').trim() || scFont();
const scHost = () => SITE_ORIGIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
const scIg = () => { const c = window.KG_CONFIG && KG_CONFIG.social; return c && c.instagram ? '@' + c.instagram.handle : ''; };

// Make sure the page fonts (also the regional script) are ready before drawing, or canvas falls back to a system font
async function scFonts(sample) {
  const F = scFont(), D = scDisp(), s = String(sample || 'Grahavani');
  try { await Promise.all([...['400', '600', '700'].map(w => document.fonts.load(`${w} 40px ${F}`, s)), document.fonts.load(`400 40px ${D}`, s)]); await document.fonts.ready; } catch (e) { }
}

// Sprite symbols (rashi glyphs, grahas, logo) as images for the canvas
const scImgs = {};
function scSym(id, color) {
  const key = id + '|' + (color || '');
  if (scImgs[key]) return scImgs[key];
  const s = document.getElementById(id);
  if (!s) return Promise.resolve(null);
  const defs = (document.querySelector('body > svg defs') || {}).outerHTML || '';
  const inner = color ? s.innerHTML.replace(/currentColor/g, color) : s.innerHTML;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.getAttribute('viewBox')}" width="512" height="512">${defs}${inner}</svg>`;
  return (scImgs[key] = new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }));
}

function scWrap(x, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean), lines = []; let cur = '';
  for (const w of words) { const s = cur ? cur + ' ' + w : w; if (x.measureText(s).width > maxW && cur) { lines.push(cur); cur = w; } else cur = s; }
  if (cur) lines.push(cur);
  return lines;
}
// Text shortened with … so it never spills out of its box
function scFit(x, text, maxW) {
  let s = String(text || ''); if (x.measureText(s).width <= maxW) return s;
  while (s.length > 1 && x.measureText(s + '…').width > maxW) s = s.slice(0, -1);
  return s.trim() + '…';
}
function scRound(x, X, Y, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, r); else x.rect(X, Y, w, h); }
function scStar(x, cx, cy, r, fill) {
  x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); }
  x.closePath(); x.fillStyle = fill; x.fill();
}
// n of 5 stars; align 'center' | 'left' | 'right' at (X, cy); returns the row width
function scStars(x, n, X, cy, r, align = 'center', on = SC.gold, off = 'rgba(226,169,46,.25)') {
  const gap = r * 2.5, w = gap * 4 + r * 2;
  const x0 = align === 'center' ? X - w / 2 : align === 'right' ? X - w : X;
  for (let i = 0; i < 5; i++) scStar(x, x0 + r + i * gap, cy, r, i < n ? on : off);
  return w;
}

function scBg(x, W, H, seed0 = 11) {
  const bg = x.createLinearGradient(0, 0, W * 0.3, H); bg.addColorStop(0, SC.ink); bg.addColorStop(1, SC.ink2); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow = x.createRadialGradient(W * 0.85, H * 0.08, 0, W * 0.85, H * 0.08, W * 0.7); glow.addColorStop(0, 'rgba(226,169,46,.22)'); glow.addColorStop(1, 'rgba(226,169,46,0)'); x.fillStyle = glow; x.fillRect(0, 0, W, H);
  let seed = seed0; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < Math.round(H / 11); i++) { x.fillStyle = `rgba(247,231,184,${(0.1 + rnd() * 0.45).toFixed(2)})`; x.beginPath(); x.arc(rnd() * W, rnd() * H, rnd() * 2 + 0.4, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(226,169,46,.18)'; x.lineWidth = 2; x.setLineDash([3, 9]); x.beginPath(); x.arc(W * 0.92, H * 0.06, W * 0.32, 0, 7); x.stroke(); x.setLineDash([]);
}
// Logo + brand name at the top; returns the y below it
async function scBrand(x, W, y) {
  const F = scFont(), logo = await scSym('logo');
  x.font = `600 38px ${F}`; const name = t('brand.name'), tw = x.measureText(name).width, s = 64, gap = 16, x0 = (W - (s + gap + tw)) / 2;
  if (logo) x.drawImage(logo, x0, y, s, s);
  x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = SC.goldL; x.fillText(name, x0 + s + gap, y + s / 2 + 2);
  x.textBaseline = 'alphabetic'; x.textAlign = 'center';
  return y + s;
}
// Call to action at the bottom: gold pill + the site address
function scFooter(x, W, H, story) {
  const F = scFont(), pillH = story ? 92 : 78, y = H - (story ? 200 : 150);
  x.font = `700 ${story ? 36 : 31}px ${F}`;
  const label = t('sc.cta'), pw = Math.min(W - 160, x.measureText(label).width + 90);
  const gr = x.createLinearGradient(0, y, 0, y + pillH); gr.addColorStop(0, '#F3C459'); gr.addColorStop(1, '#D3971C');
  scRound(x, (W - pw) / 2, y, pw, pillH, pillH / 2); x.fillStyle = gr; x.fill();
  x.fillStyle = SC.ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(scFit(x, label, pw - 50), W / 2, y + pillH / 2 + 2);
  x.textBaseline = 'alphabetic'; x.font = `500 ${story ? 30 : 27}px ${F}`; x.fillStyle = 'rgba(255,255,255,.8)';
  x.fillText(scHost() + (scIg() ? '  ·  Instagram ' + scIg() : ''), W / 2, y + pillH + (story ? 62 : 52));
}
function scCanvas(fmt) { const [W, H] = SC_SIZE[fmt] || SC_SIZE.story, cv = document.createElement('canvas'); cv.width = W; cv.height = H; return cv; }
const scDate = iso => { const [y, m, d] = String(iso).split('-').map(Number); return longDateFmt.format(new Date(Date.UTC(y, m - 1, d))); };

// ---------- Rashifal: one sign ----------
async function rashifalSignCanvas(data, sign, fmt) {
  const s = data.signs.find(z => z.sign === sign); if (!s) throw new Error('no sign');
  const story = fmt === 'story', cv = scCanvas(fmt), W = cv.width, H = cv.height, x = cv.getContext('2d'), F = scFont(), D = scDisp();
  scBg(x, W, H, 7 + sign);
  let y = await scBrand(x, W, story ? 110 : 64);
  x.textAlign = 'center';
  x.fillStyle = SC.gold; x.font = `600 ${story ? 32 : 28}px ${F}`; y += story ? 70 : 52; x.fillText(t('rf.eye').toUpperCase(), W / 2, y);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = `400 ${story ? 32 : 28}px ${F}`; y += story ? 50 : 42; x.fillText(scDate(data.date), W / 2, y);
  // Rashi glyph in a gold ring
  const gs = story ? 250 : 150, gy = y + (story ? 50 : 30), cx = W / 2;
  const glyph = await scSym('rs-' + sign, SC.goldL);
  x.beginPath(); x.arc(cx, gy + gs / 2, gs / 2, 0, 7); x.fillStyle = 'rgba(255,255,255,.06)'; x.fill();
  x.lineWidth = 4; x.strokeStyle = SC.gold; x.stroke();
  if (glyph) x.drawImage(glyph, cx - gs * 0.32, gy + gs * 0.18, gs * 0.64, gs * 0.64);
  y = gy + gs + (story ? 100 : 76);
  x.fillStyle = '#fff'; x.font = `400 ${story ? 92 : 70}px ${D}`; x.fillText(scFit(x, rn(sign), W - 160), cx, y);
  x.fillStyle = 'rgba(247,231,184,.8)'; x.font = `400 ${story ? 30 : 27}px ${F}`; y += story ? 54 : 44; const lord = t('res.lord', { g: { g: SIGN_LORD[sign] } }); x.fillText(lord.charAt(0).toUpperCase() + lord.slice(1), cx, y);
  y += story ? 66 : 46; scStars(x, s.stars, cx, y, story ? 28 : 21, 'center', SC.gold, 'rgba(255,255,255,.18)');
  // Paper card: the Moon's message, the four areas, support / caution
  const px = story ? 70 : 60, pw = W - px * 2, pad = story ? 54 : 44, top = y + (story ? 66 : 44);
  const msgSize = story ? 39 : 30, lh = msgSize * 1.42;
  x.font = `400 ${msgSize}px ${F}`;
  const msg = scWrap(x, t('rf.moon.' + (s.moonHouse - 1)), pw - pad * 2).slice(0, story ? 6 : 4);
  const good = s.items.filter(i => i.good).map(i => gn(i.planet)), bad = s.items.filter(i => !i.good && i.planet !== 'Moon').map(i => gn(i.planet));
  const areaRowH = story ? 82 : 0, areaGridH = story ? areaRowH * 4 : 2 * 96, notesH = (good.length ? 1 : 0) + (bad.length ? 1 : 0);
  const ch = pad + msg.length * lh + (s.chandrashtama ? (story ? 80 : 66) : 0) + 34 + areaGridH + (notesH ? 22 + notesH * (story ? 50 : 44) : 0) + pad - 10;
  scRound(x, px, top, pw, ch, 34); x.fillStyle = 'rgba(255,253,247,.97)'; x.fill();
  let yy = top + pad + msgSize * 0.8;
  x.textAlign = 'left'; x.fillStyle = SC.ink; x.font = `400 ${msgSize}px ${F}`;
  msg.forEach(ln => { x.fillText(ln, px + pad, yy); yy += lh; });
  if (s.chandrashtama) {
    x.font = `600 ${story ? 27 : 24}px ${F}`; const tag = scFit(x, t('rf.chandrashtama').split(/[:：]/)[0], pw - pad * 2 - 40), tw = x.measureText(tag).width + 40;
    scRound(x, px + pad, yy - 10, tw, story ? 54 : 48, 27); x.fillStyle = '#FBE3DF'; x.fill();
    x.fillStyle = SC.bad; x.fillText(tag, px + pad + 20, yy + (story ? 26 : 23)); yy += story ? 80 : 66;
  }
  x.strokeStyle = SC.line; x.lineWidth = 2; x.beginPath(); x.moveTo(px + pad, yy - 12); x.lineTo(px + pw - pad, yy - 12); x.stroke();
  yy += 22;
  const areas = ['career', 'money', 'love', 'health'];
  if (story) {
    areas.forEach((a, i) => {
      const ry = yy + i * areaRowH + 26;
      x.textAlign = 'left'; x.fillStyle = '#8C5E05'; x.font = `600 32px ${F}`; x.fillText(t('rf.area.' + a), px + pad, ry + 11);
      scStars(x, s.area[a], px + pw - pad, ry, 19, 'right');
    });
  } else {
    const colW = (pw - pad * 2) / 2;
    areas.forEach((a, i) => {
      const cx2 = px + pad + (i % 2) * colW, ry = yy + Math.floor(i / 2) * 96;
      x.textAlign = 'left'; x.fillStyle = '#8C5E05'; x.font = `600 27px ${F}`; x.fillText(t('rf.area.' + a), cx2, ry + 18);
      scStars(x, s.area[a], cx2, ry + 56, 15, 'left');
    });
  }
  yy += areaGridH + (notesH ? 22 : 0);
  x.textAlign = 'left'; x.font = `500 ${story ? 29 : 26}px ${F}`;
  if (good.length) { x.fillStyle = SC.good; x.fillText(scFit(x, t('rf.support') + ' ' + joinList(good), pw - pad * 2), px + pad, yy + 10); yy += story ? 50 : 44; }
  if (bad.length) { x.fillStyle = SC.bad; x.fillText(scFit(x, t('rf.caution') + ' ' + joinList(bad), pw - pad * 2), px + pad, yy + 10); }
  x.textAlign = 'center';
  scFooter(x, W, H, story);
  return cv;
}

// ---------- Rashifal: all 12 signs ----------
async function rashifalAllCanvas(data, fmt) {
  const story = fmt === 'story', cv = scCanvas(fmt), W = cv.width, H = cv.height, x = cv.getContext('2d'), F = scFont(), D = scDisp();
  scBg(x, W, H, 5);
  let y = await scBrand(x, W, story ? 100 : 54);
  x.textAlign = 'center';
  x.fillStyle = '#fff'; x.font = `400 ${story ? 66 : 54}px ${D}`; y += story ? 96 : 74; x.fillText(scFit(x, t('sc.allH'), W - 120), W / 2, y);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = `400 ${story ? 32 : 28}px ${F}`; y += story ? 54 : 46; x.fillText(scDate(data.date), W / 2, y);
  const glyphs = await Promise.all(data.signs.map(s => scSym('rs-' + s.sign, SC.gold)));
  const best = s => ['career', 'money', 'love', 'health'].reduce((b, a) => s.area[a] > s.area[b] ? a : b, 'career');
  const top = y + (story ? 50 : 36);
  if (story) {
    const px = 60, pw = W - 120, rowH = 106, ch = rowH * 12 + 20;
    scRound(x, px, top, pw, ch, 30); x.fillStyle = 'rgba(255,253,247,.97)'; x.fill();
    data.signs.forEach((s, i) => {
      const ry = top + 10 + i * rowH, mid = ry + rowH / 2;
      if (glyphs[i]) x.drawImage(glyphs[i], px + 34, mid - 30, 60, 60);
      x.textAlign = 'left'; x.fillStyle = SC.ink; x.font = `700 36px ${F}`; x.fillText(scFit(x, rn(s.sign), 330), px + 120, mid - 4);
      x.fillStyle = s.chandrashtama ? SC.bad : SC.muted; x.font = `500 25px ${F}`;
      x.fillText(scFit(x, s.chandrashtama ? t('sc.careDay') : t('sc.best', { a: t('rf.area.' + best(s)) }), 330), px + 120, mid + 34);
      scStars(x, s.stars, px + pw - 40, mid, 20, 'right');
      if (i < 11) { x.strokeStyle = SC.line; x.lineWidth = 2; x.beginPath(); x.moveTo(px + 34, ry + rowH); x.lineTo(px + pw - 34, ry + rowH); x.stroke(); }
    });
  } else {
    const px = 50, gap = 18, cols = 3, tw = (W - px * 2 - gap * (cols - 1)) / cols, th = 196;
    data.signs.forEach((s, i) => {
      const tx = px + (i % cols) * (tw + gap), ty = top + Math.floor(i / cols) * (th + gap);
      scRound(x, tx, ty, tw, th, 22); x.fillStyle = 'rgba(255,253,247,.97)'; x.fill();
      if (s.chandrashtama) { x.lineWidth = 3; x.strokeStyle = SC.bad; x.stroke(); }
      if (glyphs[i]) x.drawImage(glyphs[i], tx + tw / 2 - 26, ty + 18, 52, 52);
      x.textAlign = 'center'; x.fillStyle = SC.ink; x.font = `700 30px ${F}`; x.fillText(scFit(x, rn(s.sign), tw - 24), tx + tw / 2, ty + 112);
      scStars(x, s.stars, tx + tw / 2, ty + 152, 14);
    });
  }
  x.textAlign = 'center';
  scFooter(x, W, H, story);
  return cv;
}

// ---------- Today's Panchang ----------
async function panchangCanvas(p, tz, city, fmt) {
  const story = fmt === 'story', cv = scCanvas(fmt), W = cv.width, H = cv.height, x = cv.getContext('2d'), F = scFont(), D = scDisp();
  scBg(x, W, H, 11);
  let y = await scBrand(x, W, story ? 100 : 50);
  x.textAlign = 'center';
  x.fillStyle = '#fff'; x.font = `400 ${story ? 70 : 56}px ${D}`; y += story ? 100 : 76; x.fillText(scFit(x, t('pc.title'), W - 120), W / 2, y);
  const d = new Date(p.sunrise + tz * 60000);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = `400 ${story ? 32 : 29}px ${F}`; y += story ? 56 : 46;
  x.fillText(longDateFmt.format(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), W / 2, y);
  x.fillStyle = SC.goldL; x.font = `500 ${story ? 29 : 26}px ${F}`; y += story ? 46 : 38; x.fillText(scFit(x, city.name || '', W - 160), W / 2, y);
  const rows = [
    [t('sec.pan.tithi'), dtTithi(p.tithi[0].index), t('pp.until', { t: fTime(p.tithi[0].end, tz) })],
    [t('sec.pan.nakshatra'), L.names.nak[p.nakshatra[0].index], t('pp.until', { t: fTime(p.nakshatra[0].end, tz) })],
    [t('sec.pan.yoga'), L.names.yoga27[p.yoga[0].index], ''],
    [t('sec.pan.karana'), L.names.karana[p.karana[0].name], ''],
    [t('sec.pan.vara'), L.names.vara[p.weekday], ''],
    [t('pp.masa'), L.names.masa[p.lunarMonth], regionalLine(p)],
    [t('sec.pan.sunrise') + ' / ' + t('sec.pan.sunset'), `${fTime(p.sunrise, tz)} / ${fTime(p.sunset, tz)}`, ''],
    [t('pp.rahu'), `${fTime(p.rahuKaal.start, tz)} – ${fTime(p.rahuKaal.end, tz)}`, '', SC.bad],
    [t('pp.abhijit'), p.abhijit ? `${fTime(p.abhijit.start, tz)} – ${fTime(p.abhijit.end, tz)}` : t('pp.noAbhijit'), '', SC.good]
  ];
  const top = y + (story ? 54 : 34), px = 60, pw = W - 120, pad = 40, rowH = story ? 128 : 96, half = (pw - pad * 2) / 2;
  scRound(x, px, top, pw, rows.length * rowH + 24, 30); x.fillStyle = 'rgba(255,253,247,.97)'; x.fill();
  rows.forEach(([k, v, sub, col], i) => {
    const ry = top + 12 + i * rowH, mid = ry + rowH / 2, kv = story ? 27 : 24, vv = story ? 35 : 31;
    x.textAlign = 'left'; x.fillStyle = '#8C5E05'; x.font = `600 ${kv}px ${F}`; x.fillText(scFit(x, k, half - 10), px + pad, mid + kv * 0.35);
    x.textAlign = 'right'; x.fillStyle = col || SC.ink; x.font = `700 ${vv}px ${F}`;
    x.fillText(scFit(x, v, half + 30), px + pw - pad, sub ? mid - 4 : mid + vv * 0.35);
    if (sub) { x.fillStyle = SC.muted; x.font = `400 ${story ? 24 : 21}px ${F}`; x.fillText(scFit(x, sub, half + 30), px + pw - pad, mid + (story ? 32 : 27)); }
    if (i < rows.length - 1) { x.strokeStyle = SC.line; x.lineWidth = 2; x.beginPath(); x.moveTo(px + pad, ry + rowH); x.lineTo(px + pw - pad, ry + rowH); x.stroke(); }
  });
  x.textAlign = 'center';
  scFooter(x, W, H, story);
  return cv;
}

// The Kundali card is drawn at 4:5 (report-more.js); for a status it floats on a 9:16 background
async function storyFrame(inner, title, sub) {
  const cv = scCanvas('story'), W = cv.width, H = cv.height, x = cv.getContext('2d'), F = scFont(), D = scDisp();
  scBg(x, W, H, 3);
  let y = await scBrand(x, W, 96);
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = `400 60px ${D}`; y += 92; x.fillText(scFit(x, title, W - 120), W / 2, y);
  if (sub) { x.fillStyle = 'rgba(255,255,255,.85)'; x.font = `400 30px ${F}`; y += 50; x.fillText(scFit(x, sub, W - 160), W / 2, y); }
  const iw = W - 120, ih = iw * inner.height / inner.width, iy = y + 44 + Math.max(0, (H - 260 - (y + 44) - ih) / 2);
  x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 40; x.shadowOffsetY = 14; scRound(x, 60, iy, iw, ih, 30); x.fillStyle = SC.ink; x.fill(); x.restore();
  x.save(); scRound(x, 60, iy, iw, ih, 30); x.clip(); x.drawImage(inner, 60, iy, iw, ih); x.restore();
  x.lineWidth = 3; x.strokeStyle = 'rgba(226,169,46,.6)'; scRound(x, 60, iy, iw, ih, 30); x.stroke();
  scFooter(x, W, H, true);
  return cv;
}

// ---------- Preview + share ----------
const scBlob = cv => new Promise(r => cv.toBlob(r, 'image/png'));
async function scShareCanvas(cv, name, text) {
  if (APP && APP.shareImage) { await APP.shareImage(cv.toDataURL('image/png'), name, text); return true; }
  const blob = await scBlob(cv), file = blob && typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); track('share', { via: 'card' }); return true; } catch (e) { if (e && e.name === 'AbortError') return true; }
  }
  return false;
}
const scCanShareFiles = () => !!(APP && APP.shareImage) || (typeof File === 'function' && navigator.canShare && (() => { try { return navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }); } catch (e) { return false; } })());

// opts: { title, text, name (file name without .png), sample (text to load fonts for), draw: fmt => Promise<canvas>, formats? }
async function shareCardModal(opts) {
  const formats = opts.formats || ['story', 'post'];
  let fmt = formats.includes(store.get('gv-cardfmt')) ? store.get('gv-cardfmt') : formats[0], cv = null, url = null, seq = 0;
  const canShare = scCanShareFiles();
  openModal(`<h2>${esc(opts.title)}</h2>
    ${formats.length > 1 ? `<div class="seg sc-fmt" role="group" aria-label="${esc(t('sc.size'))}">${formats.map(f => `<button type="button" data-fmt="${f}" aria-pressed="${f === fmt}">${esc(t('sc.' + f))}</button>`).join('')}</div>` : ''}
    <div class="sc-prev ${fmt}"><span class="spin"></span></div>
    <div class="sc-acts">${canShare ? `<button class="btn-cta" type="button" id="sc-share">${ic('i-whatsapp')}${esc(t('sc.share'))}</button>` : ''}<a class="${canShare ? 'btn-line' : 'btn-cta'}" id="sc-dl" href="#" download>${ic('i-download')}${esc(t('cc.download'))}</a></div>
    <p class="muted small sc-hint">${esc(t(canShare ? 'sc.hintShare' : 'cc.hint'))}</p>`);
  const box = modal.querySelector('.sc-prev'), dl = modal.querySelector('#sc-dl'), fileName = () => `${opts.name}-${fmt === 'story' ? 'status' : 'post'}.png`;
  async function render() {
    const my = ++seq; box.className = 'sc-prev ' + fmt; box.innerHTML = '<span class="spin"></span>';
    try {
      await scFonts(opts.sample);
      const c = await opts.draw(fmt); if (my !== seq) return;
      cv = c; const blob = await scBlob(c); if (my !== seq) return;
      if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob);
      box.innerHTML = `<img src="${url}" alt="${esc(opts.title)}">`;
      dl.href = url; dl.setAttribute('download', fileName());
    } catch (e) { if (my === seq) box.innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; }
  }
  modal.querySelectorAll('.sc-fmt button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.fmt === fmt) return; fmt = b.dataset.fmt; store.set('gv-cardfmt', fmt);
    modal.querySelectorAll('.sc-fmt button').forEach(z => z.setAttribute('aria-pressed', String(z === b))); render();
  }));
  const sb = modal.querySelector('#sc-share');
  if (sb) sb.addEventListener('click', async () => { if (!cv) return; const ok = await scShareCanvas(cv, fileName(), opts.text); if (!ok) dl.click(); });
  dl.addEventListener('click', e => { if (!cv) { e.preventDefault(); return; } track('share', { via: 'card-download' }); if (APP && APP.shareImage) { e.preventDefault(); scShareCanvas(cv, fileName(), opts.text); } });
  render();
}

// Entry points used by the pages
function shareRashifalCard(data, sign) {
  const d = scDate(data.date);
  shareCardModal({ title: t('sc.rfTitle', { r: rn(sign) }), text: t('sc.rfText', { r: rn(sign), d }) + ' ' + SITE_ORIGIN + HOME + 'rashifal/', name: 'rashifal-' + data.date + '-' + (sign + 1), sample: rn(sign) + t('rf.moon.0'), draw: fmt => rashifalSignCanvas(data, sign, fmt) });
}
function shareRashifalAll(data) {
  shareCardModal({ title: t('sc.allH'), text: t('sc.allText', { d: scDate(data.date) }) + ' ' + SITE_ORIGIN + HOME + 'rashifal/', name: 'rashifal-' + data.date, sample: data.signs.map(s => rn(s.sign)).join(''), draw: fmt => rashifalAllCanvas(data, fmt) });
}
function sharePanchangCard(p, tz, city) {
  const iso = new Date(p.sunrise + tz * 60000).toISOString().slice(0, 10);
  shareCardModal({ title: t('pc.title'), text: t('pc.text', { c: city.name || '' }) + ' ' + SITE_ORIGIN + HOME + 'panchang/', name: 'panchang-' + iso, sample: t('pc.title') + L.names.nak[p.nakshatra[0].index], draw: fmt => panchangCanvas(p, tz, city, fmt) });
}
