/* Kundali report rendering (home page and shared-link page). Uses helpers from core.js. */

// ---------- Wheel ----------
// With no chart yet the wheel shows the live sky: grahas where they are this minute and the
// Lagna rising over the chosen place, recomputed every 30 s with the same engine as the server.
let liveTimer = null, liveFirst = true;
const LIVE_PLACE = { lat: 23.18, lon: 75.78 }; // Ujjain, the traditional Jyotish meridian
function liveSky() {
  const E = window.Jyotish; if (!E) return null;
  const lat = parseFloat(($('#f-lat') || {}).value), lon = parseFloat(($('#f-lon') || {}).value);
  const pl = isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 66 ? { lat, lon } : LIVE_PLACE;
  const jd = Date.now() / 86400000 + 2440587.5, sid = E.sidereal(jd), prev = E.sidereal(jd - .5).lon, next = E.sidereal(jd + .5).lon;
  const ascLon = E.norm(E.ascendant(jd, pl.lat, pl.lon).asc - sid.ayanamsa);
  const planets = E.PLANETS.map(n => { const L = sid.lon[n]; return { name: n, lon: L, sign: Math.floor(L / 30), deg: L % 30, retro: n === 'Rahu' || n === 'Ketu' || (n !== 'Sun' && n !== 'Moon' && E.norm(next[n] - prev[n] + 180) - 180 < 0) }; });
  return { ascLon, lagnaSign: Math.floor(ascLon / 30), planets, live: true };
}
function startLive() {
  clearInterval(liveTimer); liveFirst = true;
  const tick = () => { const d = liveSky(); if (d) { drawWheel(d, true); liveFirst = false; } };
  if (window.Jyotish) tick(); else drawWheel(null, true);
  liveTimer = setInterval(() => { if (!document.hidden) tick(); }, 30000);
}
function stars(C) { // fixed pseudo-random starfield inside the house ring
  let seed = 7, s = '';
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) {
    const a = rnd() * 360, r = 70 + rnd() * 120, x = C + r * Math.cos(a * Math.PI / 180), y = C - r * Math.sin(a * Math.PI / 180);
    s += `<circle class="star" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(.6 + rnd() * 1.1).toFixed(2)}" style="--t:${(2.2 + rnd() * 3.5).toFixed(2)}s;--w:${(rnd() * 4).toFixed(2)}s"/>`;
  }
  return `<g class="stars" aria-hidden="true">${s}</g>`;
}
function drawWheel(data, keepLive) {
  const host = $('#wheel'); if (!host) return;
  if (!keepLive) { clearInterval(liveTimer); liveTimer = null; if (!data) return startLive(); }
  const live = !!(data && data.live), intro = !live || liveFirst;
  const C = 270, asc = data ? data.ascLon : 0, lagnaSign = data ? data.lagnaSign : -1;
  const pt = (lon, rad) => { const a = (180 + (lon - asc)) * Math.PI / 180; return [C + rad * Math.cos(a), C - rad * Math.sin(a)]; };
  const f = n => n.toFixed(1), R1 = 258, R2 = 212, R3 = 196;
  let s = `<svg class="wheel${live ? ' is-live' : ''}${intro ? '' : ' no-intro'}" viewBox="0 0 540 540" role="img" aria-label="${esc(t(live ? 'hero.live' : 'hero.wheel'))}">
<defs><linearGradient id="swp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D3971C" stop-opacity="0"/><stop offset="1" stop-color="#D3971C" stop-opacity=".22"/></linearGradient>
<radialGradient id="pglow"><stop offset="0" stop-color="currentColor" stop-opacity=".38"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>
<g class="halo"><circle cx="${C}" cy="${C}" r="266" fill="none" stroke="#D3971C" stroke-width="1" stroke-dasharray="2 7" opacity=".7"/></g><g class="orbit" aria-hidden="true"><circle class="orbit-dot" cx="${C}" cy="${C - 266}" r="3.4" fill="#D3971C"/><circle class="orbit-dot" cx="${C}" cy="${C + 266}" r="2.2" fill="#2A2E7C"/></g>`;
  s += `<g class="spinner"><circle cx="${C}" cy="${C}" r="${R1}" fill="#fff" stroke="#D9B66B" stroke-width="1.5"/>`;
  for (let i = 0; i < 12; i++) {
    const a = i * 30, b = a + 30, [x1, y1] = pt(a, R1), [x2, y2] = pt(b, R1), [x3, y3] = pt(b, R2), [x4, y4] = pt(a, R2);
    s += `<path class="${i === lagnaSign ? 'lg-seg' : ''}" d="M${f(x1)} ${f(y1)} A${R1} ${R1} 0 0 0 ${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)} A${R2} ${R2} 0 0 1 ${f(x4)} ${f(y4)}Z" fill="${i === lagnaSign ? '#F7E1AE' : i % 2 ? '#FDF8EC' : '#FFFFFF'}" stroke="#D9B66B"/>`;
    const [gx, gy] = pt(a + 15, 235);
    s += `<use href="#rs-${i}" x="${f(gx - 12)}" y="${f(gy - 12)}" width="24" height="24" style="color:${i === lagnaSign ? '#8C5E05' : '#2A2E7C'}"><title>${esc(rn(i))}</title></use>`;
  }
  s += `<circle cx="${C}" cy="${C}" r="${R2}" fill="#FDFCF7" stroke="#D9B66B"/>`;
  for (let k = 0; k < 27; k++) { const [a1, b1] = pt(k * 360 / 27, R2), [a2, b2] = pt(k * 360 / 27, R3); s += `<line x1="${f(a1)}" y1="${f(b1)}" x2="${f(a2)}" y2="${f(b2)}" stroke="#D9B66B"/>`; }
  s += `<circle cx="${C}" cy="${C}" r="${R3}" fill="none" stroke="#E8D3A3"/>`;
  s += stars(C);
  // Radar-style sweep inside the house ring
  const [sx, sy] = [C + R3, C], [ex, ey] = [C + R3 * Math.cos(-40 * Math.PI / 180), C + R3 * Math.sin(-40 * Math.PI / 180)];
  s += `<g class="sweep" aria-hidden="true"><path d="M${C} ${C} L${f(ex)} ${f(ey)} A${R3} ${R3} 0 0 1 ${f(sx)} ${f(sy)}Z" fill="url(#swp)"/><line x1="${C}" y1="${C}" x2="${f(sx)}" y2="${f(sy)}" stroke="#D3971C" stroke-opacity=".35"/></g>`;
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = pt(i * 30, R3), [x2, y2] = pt(i * 30, 62);
    s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#EFE3C6"/>`;
    if (data) { const [hx, hy] = pt(i * 30 + 15, 182); s += `<text x="${f(hx)}" y="${f(hy + 4)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#B8A06A">${(i - lagnaSign + 12) % 12 + 1}</text>`; }
  }
  s += `<circle class="core-pulse" cx="${C}" cy="${C}" r="62" fill="none" stroke="#D3971C"/><circle cx="${C}" cy="${C}" r="62" fill="#fff" stroke="#E8D3A3"/><use class="core-logo" href="#logo" x="${C - 34}" y="${C - 34}" width="68" height="68"/>`;
  if (data) {
    const [l1x, l1y] = pt(asc, 62), [l2x, l2y] = pt(asc, R1 + 2), [lt, lty] = pt(asc, 202);
    s += `<line class="lg-line" x1="${f(l1x)}" y1="${f(l1y)}" x2="${f(l2x)}" y2="${f(l2y)}" stroke="#C2352D" stroke-width="2"/><text x="${f(lt + 6)}" y="${f(lty - 6)}" font-weight="700" font-size="12" fill="#C2352D">${esc(t(live ? 'hero.rising' : 'sec.charts.asc'))}</text>`;
    const levels = [], radii = [160, 128, 96];
    [...(data.planets || [])].sort((a, b) => a.lon - b.lon).forEach((p, i) => {
      let lv = 0; while (levels[lv] !== undefined && Math.abs(((p.lon - levels[lv] + 540) % 360) - 180) < 13 && lv < 2) lv++;
      levels[lv] = p.lon;
      const [x, y] = pt(p.lon, radii[lv]), [ox, oy] = pt(p.lon, R3);
      s += `<g class="pm" style="--d:${i * 90}ms;color:${COL[p.name]}"><line x1="${f(ox)}" y1="${f(oy)}" x2="${f(x)}" y2="${f(y)}" stroke="${COL[p.name]}" stroke-dasharray="2 3" opacity=".6"/><g class="pg" style="--b:${(i * .43).toFixed(2)}s;transform-origin:${f(x)}px ${f(y)}px"><circle class="glow" cx="${f(x)}" cy="${f(y)}" r="27" fill="url(#pglow)"/><circle cx="${f(x)}" cy="${f(y)}" r="17" fill="#fff" stroke="${COL[p.name]}" stroke-opacity=".35"/><use href="#gr-${p.name}" x="${f(x - 15)}" y="${f(y - 15)}" width="30" height="30"><title>${esc(gn(p.name))} · ${esc(rn(p.sign))} ${dm(p.deg)}${p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' ? ' ℞' : ''}</title></use>${p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' ? `<text x="${f(x + 13)}" y="${f(y - 10)}" font-size="10" font-weight="700" fill="${COL[p.name]}">℞</text>` : ''}</g></g>`;
    });
  }
  let legend = `<p class="wheel-legend">${esc(t('hero.wheel'))}</p>`;
  if (live || keepLive) {
    const now = new Date().toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
    legend = `<p class="wheel-legend live-legend"><span class="live-badge"><i></i>${esc(t('hero.live'))} · ${esc(now)}</span><span>${esc(t('hero.liveNote'))}</span></p>`;
  }
  host.innerHTML = s + `</g></svg>` + legend;
}

// ---------- Square charts ----------
const NORTH = { 1: [[200, 100], [200, 178], 'd'], 2: [[100, 36], [100, 86], 'h'], 3: [[36, 100], [84, 104], 'v'], 4: [[100, 200], [178, 204], 'd'], 5: [[36, 300], [84, 304], 'v'], 6: [[100, 364], [100, 322], 'h'], 7: [[200, 300], [200, 230], 'd'], 8: [[300, 364], [300, 322], 'h'], 9: [[364, 300], [316, 304], 'v'], 10: [[300, 200], [222, 204], 'd'], 11: [[364, 100], [316, 104], 'v'], 12: [[300, 36], [300, 86], 'h'] };
function labels(items, cx, cy, cols, delay) {
  const lh = 15, rows = Math.ceil(items.length / cols), colW = 48;
  return items.map((it, i) => {
    const c = cols > 1 ? i % cols : 0, r = cols > 1 ? Math.floor(i / cols) : i, x = cx + (c - (cols - 1) / 2) * colW, y = cy - (rows - 1) * lh / 2 + r * lh + 4;
    return `<text class="${it.asc ? 'asc' : 'pl'} fadein" style="--d:${delay + i * 40}ms" x="${x}" y="${y}" text-anchor="middle"${it.c ? ` fill="${it.c}"` : ''}>${esc(it.t)}${it.r ? '<tspan class="r" dx="1">R</tspan>' : ''}</text>`;
  }).join('');
}
function drawNorth(d) {
  let s = `<svg viewBox="-4 -4 408 408" role="img" aria-label="${esc(d.title)}"><rect class="ch-bg" x="0" y="0" width="400" height="400"/><polygon class="lagna-fill" points="200,0 300,100 200,200 100,100"/>`;
  s += `<rect class="frame draw" pathLength="1" x="0" y="0" width="400" height="400"/><line class="ln draw" pathLength="1" x1="0" y1="0" x2="400" y2="400"/><line class="ln draw" pathLength="1" x1="400" y1="0" x2="0" y2="400"/><polygon class="ln draw" pathLength="1" points="200,0 400,200 200,400 0,200"/>`;
  for (let h = 1; h <= 12; h++) {
    const sign = (d.asc + h - 1) % 12, [[lx, ly], [nx, ny], kind] = NORTH[h];
    s += `<text class="sn fadein" x="${nx}" y="${ny + 4}" text-anchor="middle">${sign + 1}</text>`;
    const items = (h === 1 ? [{ t: t('sec.charts.asc'), asc: true }] : []).concat(d.bySign[sign]), n = items.length;
    s += labels(items, lx, ly, kind === 'h' ? (n > 2 ? 2 : 1) : kind === 'd' ? (n > 4 ? 2 : 1) : 1, h * 50);
  }
  return s + '</svg>';
}
const SOUTH_POS = [[1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1], [0, 0]];
function drawSouth(d) {
  let s = `<svg viewBox="-4 -4 408 408" role="img" aria-label="${esc(d.title)}"><rect class="ch-bg" x="0" y="0" width="400" height="400"/>`;
  for (let sg = 0; sg < 12; sg++) {
    const [c, r] = SOUTH_POS[sg], x = c * 100, y = r * 100;
    s += `<rect class="${sg === d.asc ? 'lagna-fill' : 'cell'}" x="${x}" y="${y}" width="100" height="100"/>`;
    if (sg === d.asc) s += `<line class="ascline draw" pathLength="1" x1="${x}" y1="${y + 24}" x2="${x + 24}" y2="${y}"/>`;
    s += `<use href="#rs-${sg}" x="${x + 74}" y="${y + 76}" width="18" height="18" style="color:#B8A06A"/>`;
    const items = (sg === d.asc ? [{ t: t('sec.charts.asc'), asc: true }] : []).concat(d.bySign[sg]);
    s += labels(items, x + 50, y + 46, items.length > 4 ? 2 : 1, sg * 50);
  }
  s += `<rect class="frame draw" pathLength="1" x="0" y="0" width="400" height="400"/><rect class="frame draw" pathLength="1" x="100" y="100" width="200" height="200" style="fill:#fff"/>`;
  return s + `<text class="ctitle fadein" x="200" y="196" text-anchor="middle">${esc(d.title)}</text><text class="csub fadein" x="200" y="220" text-anchor="middle">${esc(d.sub)}</text></svg>`;
}
let chartStyle = store.get('kg-style') || 'north';
if (typeof chartStyle !== 'string') chartStyle = 'north';
const drawChart = d => chartStyle === 'north' ? drawNorth(d) : drawSouth(d);
function bySignFrom(c, signOf, withDeg) {
  const bySign = Array.from({ length: 12 }, () => []);
  c.planets.forEach(p => bySign[signOf(p)].push({ t: ga(p.name) + (withDeg ? ' ' + Math.floor(p.deg) + '°' : ''), c: COL[p.name], r: p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' }));
  return bySign;
}
function chartsHtml(c) {
  const moon = c.planets.find(p => p.name === 'Moon');
  return [
    { asc: c.lagna.sign, bySign: bySignFrom(c, p => p.sign, true), title: t('sec.charts.c1'), sub: t('sec.charts.c1s'), h: t('sec.charts.d1'), p: t('sec.charts.d1t', { r: { r: c.lagna.sign } }) },
    { asc: c.lagna.navamsa, bySign: bySignFrom(c, p => p.navamsa, false), title: t('sec.charts.c9'), sub: t('sec.charts.c9s'), h: t('sec.charts.d9'), p: t('sec.charts.d9t') },
    { asc: moon.sign, bySign: bySignFrom(c, p => p.sign, true), title: t('sec.charts.cm'), sub: t('sec.charts.cms'), h: t('sec.charts.moon'), p: t('sec.charts.moont', { r: { r: moon.sign } }) }
  ].map(d => `<div class="card chart">${drawChart(d)}<h3>${esc(d.h)}</h3><p>${esc(d.p)}</p></div>`).join('');
}
const VARGA_KEYS = ['D2', 'D3', 'D4', 'D7', 'D10', 'D12'];
function vargaHtml(c, vargas, key) {
  const v = vargas[key];
  const d = { asc: v.asc, bySign: bySignFrom(c, p => v.planets[p.name], false), title: key, sub: t('varga.' + key + '.name') };
  const rows = c.planets.map(p => `<tr><td>${g(p.name, 'gimg sm')}${esc(gn(p.name))}</td><td>${rg(v.planets[p.name], 'rg sm')}${esc(rn(v.planets[p.name]))}</td></tr>`).join('');
  return `<div class="varga-view"><div class="card chart">${drawChart(d)}</div><div class="varga-info"><h3>${esc(key)} · ${esc(t('varga.' + key + '.name'))}</h3><p>${esc(t('varga.' + key + '.about'))}</p>
    <p class="muted">${esc(t('varga.lagnaIn', { r: { r: v.asc } }))}</p><div class="tbl-card card"><table class="mini"><tbody>${rows}</tbody></table></div></div></div>`;
}

// ---------- Belt, ribbon, moon phase ----------
function drawBelt(c) {
  const W = 1100, X0 = 14, X1 = W - 14, x = l => X0 + l / 360 * (X1 - X0);
  let s = `<svg class="belt" viewBox="0 0 ${W} 210" role="img" aria-label="${esc(t('sec.belt.title'))}">`;
  for (let i = 0; i < 12; i++) s += `<rect x="${x(i * 30)}" y="34" width="${x(30) - x(0)}" height="40" fill="${i === c.lagna.sign ? '#F7E1AE' : i % 2 ? '#FDF8EC' : '#FFFFFF'}" stroke="#E3D2A6"/><use href="#rs-${i}" x="${x(i * 30 + 15) - 34}" y="45" width="18" height="18" style="color:#2A2E7C"/><text x="${x(i * 30 + 15) - 12}" y="59" font-size="13" font-weight="600" fill="#16173B">${esc(rn(i))}</text>`;
  for (let k = 0; k <= 27; k++) { const lx = x(k * 360 / 27); s += `<line x1="${lx}" y1="74" x2="${lx}" y2="96" stroke="#D9B66B"/>`; if (k < 27) s += `<text x="${x((k + .5) * 360 / 27)}" y="89" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#7A7C9C">${k + 1}</text>`; }
  s += `<line x1="${X0}" y1="108" x2="${X1}" y2="108" stroke="#16173B" stroke-width="1.3"/>`;
  const la = x(c.lagna.lon);
  s += `<line x1="${la}" y1="22" x2="${la}" y2="114" stroke="#C2352D" stroke-width="2"/><text x="${la}" y="16" text-anchor="middle" font-size="12" font-weight="700" fill="#C2352D">${esc(t('sec.charts.asc'))} ${dm(c.lagna.deg)}</text>`;
  const rows = [];
  [...c.planets].sort((a, b) => a.lon - b.lon).forEach(p => {
    const px = x(p.lon); let row = 0; while (rows[row] !== undefined && px - rows[row] < 78) row++; rows[row] = px;
    const cy = 138 + row * 34;
    s += `<line x1="${px}" y1="108" x2="${px}" y2="${cy - 12}" stroke="${COL[p.name]}" stroke-dasharray="2 2"/><circle cx="${px}" cy="108" r="4" fill="${COL[p.name]}"/><use href="#gr-${p.name}" x="${px - 13}" y="${cy - 13}" width="26" height="26"/><text x="${px + 15}" y="${cy + 4}" font-size="11.5" fill="${COL[p.name]}" font-weight="600">${esc(ga(p.name))} ${dm(p.deg)}</text>`;
  });
  return s + '</svg>';
}
function drawRibbon(c, now) {
  const YEAR = 365.25 * 86400000, t0 = c.utMs, t1 = t0 + 100 * YEAR, W = 1000, x = tm => 10 + (tm - t0) / (t1 - t0) * (W - 20);
  let s = `<svg class="ribbon" viewBox="0 0 ${W} 96" role="img" aria-label="${esc(t('sec.dasha.title'))}">`;
  c.dashas.forEach(m => {
    const a = Math.max(m.start, t0), b = Math.min(m.end, t1); if (b <= a) return; const w = x(b) - x(a);
    s += `<rect x="${x(a)}" y="18" width="${w}" height="38" rx="6" fill="${COL[m.lord]}" fill-opacity=".16" stroke="${COL[m.lord]}" stroke-opacity=".5"/>`;
    if (w > 44) s += `<use href="#gr-${m.lord}" x="${x(a) + 5}" y="25" width="24" height="24"/>`;
    if (w > 88) s += `<text x="${x(a) + 33}" y="42" font-size="13" font-weight="600" fill="${COL[m.lord]}">${esc(gn(m.lord))}</text>`;
  });
  for (let yr = 0; yr <= 100; yr += 10) { const tx = x(t0 + yr * YEAR); s += `<line x1="${tx}" y1="60" x2="${tx}" y2="66" stroke="#9A9CB8"/><text x="${tx}" y="80" text-anchor="middle" font-size="11" fill="#7A7C9C">${esc(yr === 0 ? t('sec.dasha.birth') : t('sec.dasha.age', { n: yr }))}</text>`; }
  if (now > t0 && now < t1) { const nx = x(now); s += `<line x1="${nx}" y1="8" x2="${nx}" y2="62" stroke="#C2352D" stroke-width="2"/><circle cx="${nx}" cy="8" r="4" fill="#C2352D"/><text x="${nx + 7}" y="12" font-size="12" font-weight="700" fill="#C2352D">${esc(t('sec.dasha.today'))}</text>`; }
  return s + '</svg>';
}
function moonPhase(elong) {
  const rr = 15, rx = Math.abs(rr * Math.cos(elong * Math.PI / 180)), wax = elong < 180, term = wax ? (elong < 90 ? 0 : 1) : (elong > 270 ? 1 : 0);
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="15" fill="#3A3F78"/><path d="M20 5 A15 15 0 0 ${wax ? 1 : 0} 20 35 A${rx.toFixed(2)} 15 0 0 ${term} 20 5Z" fill="#F4E7C2"/></svg>`;
}
// Pratyantar dashas inside one antardasha: each graha's share of the antardasha, in the Vimshottari order from the AD lord.
function pratyantar(adLord, start, end) {
  const i0 = DASHA_ORDER.indexOf(adLord), len = end - start, out = []; let s = start;
  for (let j = 0; j < 9; j++) { const l = DASHA_ORDER[(i0 + j) % 9], d = len * DASHA_YEARS[l] / 120; out.push({ lord: l, start: s, end: s + d }); s += d; }
  return out;
}

// ---------- Profile card ----------
function profileHtml(input, utMs, lagna, moon, extraFacts) {
  const tz = input.tzMinutes, ll = SIGN_LORD[lagna.sign];
  return `<div class="card profile reveal">
    <div class="who"><span class="eyebrow">${esc(t('res.eyebrow'))}${input.relation ? ` · <span class="tag gold">${esc(t('rel.' + input.relation))}</span>` : ''}</span><h2>${esc(input.name || t('res.defaultName'))}</h2>
      <p class="birthline"><span>${ic('i-cal')}${fDate(utMs, tz)}</span><span>${ic('i-clock')}${fTime(utMs, tz)} (UTC${offStr(tz)})</span><span>${ic('i-pin')}${esc(input.placeLabel)}</span></p>
      <div class="lagna-trait"><span class="glyph">${rg(lagna.sign, '')}</span><p><b>${esc(t('res.lagnaLine', { r: { r: lagna.sign } }))}</b> ${esc(L.names.lagnaTrait[lagna.sign])}${extraFacts.llHouse ? ' ' + esc(t('res.lagnaLord', { g: { g: ll }, h: extraFacts.llHouse })) : ''}</p></div>
    </div>
    <dl class="facts">
      <div class="fact"><span class="ic">${rg(lagna.sign, '')}</span><div><dt>${esc(t('res.lagna'))}</dt><dd>${esc(rn(lagna.sign))} ${dm(lagna.deg)}<span>${esc(nk(lagna.nak))} · ${esc(t('res.pada', { p: lagna.pada }))}</span></dd></div></div>
      <div class="fact"><span class="ic">${g('Moon')}</span><div><dt>${esc(t('res.moonSign'))}</dt><dd>${esc(rn(moon.sign))}<span>${esc(t('res.lord', { g: { g: SIGN_LORD[moon.sign] } }))}</span></dd></div></div>
      <div class="fact"><span class="ic">${ic('i-star')}</span><div><dt>${esc(t('res.nakshatra'))}</dt><dd>${esc(nk(moon.nak))} · ${moon.pada}<span>${esc(t('res.nameLetter'))}: ${syllables(moon.nak, moon.pada)}</span></dd></div></div>
      ${extraFacts.dasha || ''}
    </dl></div>`;
}

// ---------- Preview (birth locked behind login) ----------
function renderPreview(data, host = $('#results')) {
  const { input, preview: pv } = data, used = data.reason === 'trial_used';
  drawWheel({ ascLon: pv.lagna.sign * 30 + pv.lagna.deg, lagnaSign: pv.lagna.sign, planets: [] });
  const benefits = ['b1', 'b2', 'b3', 'b4', 'b5'].map(k => `<li>${ic('i-check')}<span>${esc(t('gate.' + k))}</span></li>`).join('');
  const mock = ['Sun', 'Jupiter', 'Saturn'].map(n => `<div class="m">${g(n)}<div class="ln"></div><div class="ln s"></div><div class="ln g"></div><div class="ln b"></div><div class="ln"></div></div>`).join('');
  host.innerHTML = `
    <div style="margin-top:28px"><span class="preview-badge">${ic('i-info')}${esc(t('gate.preview'))}</span></div>
    ${profileHtml(input, pv.utMs, pv.lagna, pv.moon, {})}
    <div class="gate reveal"><div class="mock" aria-hidden="true">${mock}${mock}</div>
      <div class="over"><div class="panel"><div class="lock">${ic('i-lock')}</div><h3>${esc(t(used ? 'gate.usedTitle' : 'gate.title'))}</h3><p>${esc(t(used ? 'gate.usedText' : 'gate.text'))}</p><ul>${benefits}</ul>
        <div class="btns"><button class="btn-cta go" type="button" data-auth="signup" style="grid-column:auto">${esc(t('gate.signup'))}</button><button class="btn-line" type="button" data-auth="login">${esc(t('gate.login'))}</button></div>
        <small>${esc(t('gate.free'))}</small></div></div></div>`;
  observeReveals();
  if (used && sb) setTimeout(() => authModal('signup'), 700);
}

// ---------- Share & PDF ----------
async function shareChart(input) {
  if (!requireLogin('share')) return;
  openModal(`<h2>${esc(t('share.title'))}</h2><p class="muted">${esc(t('share.lede'))}</p><div id="sharebox"><span class="spin"></span></div>`);
  try {
    const { log, lang, save, ...birth } = input;
    const { token } = await api('/api/share', { method: 'POST', body: JSON.stringify(birth) });
    const link = `${location.origin}${HOME}share/?t=${token}`;
    const wa = 'https://wa.me/?text=' + encodeURIComponent(t('share.waText', { n: input.name || t('res.defaultName') }) + ' ' + link);
    $('#sharebox').innerHTML = `<div class="sharelink"><input id="sharelink" type="text" readonly value="${esc(link)}" aria-label="${esc(t('share.link'))}"><button class="btn-cta" type="button" id="copylink">${esc(t('share.copy'))}</button></div>
      <div class="share-actions"><a class="btn-line" href="${esc(wa)}" target="_blank" rel="noopener">${ic('i-whatsapp')}${esc(t('share.whatsapp'))}</a><button class="linkbtn" type="button" id="revoke">${esc(t('share.revoke'))}</button></div>
      <p class="muted small">${esc(t('share.note'))}</p>`;
    $('#copylink').onclick = async () => { const el = $('#sharelink'); try { await navigator.clipboard.writeText(link); toast(t('share.copied')); } catch (e) { el.select(); } };
    $('#revoke').onclick = async () => { try { await api('/api/share?t=' + token, { method: 'DELETE' }); closeModal(); toast(t('share.revoked')); } catch (e) { toast(e.message); } };
  } catch (e) {
    $('#sharebox').innerHTML = `<p class="err">${esc(e.message === 'login_required' ? t('members.lockText') : t('share.error'))}</p>`;
  }
}
function downloadPdf() {
  if (!requireLogin('pdf')) return;
  const opened = $$('details:not([open])'); opened.forEach(d => d.setAttribute('open', ''));
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); opened.forEach(d => d.removeAttribute('open')); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  toast(t('pdf.hint'));
  setTimeout(() => { window.print(); setTimeout(done, 1500); }, 300);
}

// ---------- Full report ----------
function renderFull(data, host = $('#results'), opts = {}) {
  const { input, chart: c, analysis: an, gochar, sadeSati: ss, method, premium } = data;
  const tz = input.tzMinutes, now = Date.now();
  const P = Object.fromEntries(c.planets.map(p => [p.name, p])), av = c.avakahada, pc = c.panchang;
  const md = c.dashas.find(m => m.start <= now && now < m.end), ad = md && md.sub.find(a => a.start <= now && now < a.end);
  drawWheel({ ascLon: c.lagna.lon, lagnaSign: c.lagna.sign, planets: c.planets });
  if (!data.shared) store.set('kg-moon',{ sign: P.Moon.sign, nak: P.Moon.nak, name: input.name || '' });

  const total = an.good.length + an.bad.length, gp = total ? Math.round(an.good.length / total * 100) : 50;
  const hlItem = (it, i) => `<li class="reveal" style="--d:${i * 50}ms"><span class="ic">${it.icon ? g(it.icon) : ic(it.kind === 'yoga' ? 'i-yoga' : it.kind === 'ashtaka' ? 'i-house' : it.tone === 'good' ? 'i-star' : 'i-alert')}</span><span><b>${esc(msg(it.title))}</b><p>${esc(msg(it.text))}</p></span></li>`;
  const toneWord = tn => t('sec.grahas.' + (tn === 'good' ? 'strong' : tn === 'bad' ? 'weak' : 'moderate'));

  const grahaCards = c.planets.map((p, i) => {
    const rd = an.reading[p.name], st = an.strength[p.name], tags = [];
    const DT = { Exalted: ['good', 'exalted'], 'Own sign': ['good', 'own'], Debilitated: ['bad', 'debil'], Friendly: ['gold', 'friendly'], Enemy: ['warn', 'enemy'], Neutral: ['', 'neutral'] }[p.dignity];
    if (DT) tags.push(`<span class="tag ${DT[0]}">${esc(t('sec.grahas.' + DT[1]))}</span>`);
    if (p.retro && p.name !== 'Rahu' && p.name !== 'Ketu') tags.push(`<span class="tag warn">${esc(t('sec.grahas.retro'))}</span>`);
    if (p.combust) tags.push(`<span class="tag bad">${esc(t('sec.grahas.combust'))}</span>`);
    tags.push(`<span class="tag">${esc(t('res.house', { h: p.house }))}</span>`, `<span class="tag">${esc(t('res.navamsa', { r: { r: p.navamsa } }))}</span>`);
    return `<article class="card graha reveal" style="--gc:${COL[p.name]};--d:${(i % 3) * 70}ms">
      <div class="top"><div class="art" style="--d:${i * .4}s">${g(p.name, '')}</div><div><h3>${esc(gn(p.name))}<small>${esc(L.names.grahaAlt[p.name])}</small></h3></div><span class="verdict ${rd.tone}">${esc(toneWord(rd.tone))}</span></div>
      <div class="pos">${rg(p.sign)}<span><b>${esc(rn(p.sign))}</b><br><span style="font-size:13.5px;color:var(--ink-2)">${esc(nk(p.nak))} · ${esc(t('res.pada', { p: p.pada }))}</span></span><span class="deg">${dms(p.deg)}</span></div>
      <div class="meta">${tags.join('')}</div>
      <div class="strength"><div class="row"><span>${esc(t('sec.grahas.strength'))}</span><b>${st}/100</b></div><div class="meter"><i class="${rd.tone}" style="width:${st}%"></i></div></div>
      <p class="read">${esc(rd.parts.map(msg).join(' '))}</p>
      <a class="learn-link" href="${HOME}learn/${p.name.toLowerCase()}-in-house-${p.house}/">${esc(t('learn.moreAbout', { g: { g: p.name }, h: p.house }))} →</a></article>`;
  }).join('');

  const ys = [...an.yogas].sort((a, b) => (b.present - a.present) || (a.tone === 'good' ? -1 : 1));
  const yogaCard = (id, present, tone, name, rule, text, extra = '') => `<article class="card yoga reveal ${present ? 'on' : 'off'} ${tone}"><div class="yh"><h3>${esc(name)}</h3><span class="verdict ${present ? tone : ''}" style="${present ? '' : 'background:var(--bg);color:var(--ink-3)'}">${esc(present ? t(tone === 'good' ? 'sec.yogas.pGood' : 'sec.yogas.pBad') : t('sec.yogas.off'))}</span></div><p class="rule">${esc(rule)}</p><p>${esc(text)}</p>${extra}</article>`;
  const yogaCards = ys.map(y => {
    const off = get('yoga.' + y.id + '.off');
    return yogaCard(y.id, y.present, y.tone, t('yoga.' + y.id + '.name', y.nameParams), t('yoga.' + y.id + '.rule', y.params), y.present || !off ? t('yoga.' + y.id + '.text', y.params) : t('yoga.' + y.id + '.off', y.params));
  }).join('');
  const ssList = ss.periods.map(p => `<span class="tag ${p.start <= now && now <= p.end ? 'bad' : ''}">${fDate(p.start, tz)} → ${fDate(p.end, tz)}</span>`).join(' ');
  const ssOn = !!(ss.phase || ss.dhaiya);
  const ssText = t('yoga.sadesati.now', { r: { r: ss.satSign }, h: ss.house, m: { r: P.Moon.sign } }) + (ss.phase ? ' ' + t('yoga.sadesati.' + ss.phase) : ss.dhaiya ? ' ' + t('yoga.sadesati.dhaiya' + ss.dhaiya) : '');
  const ssCard = yogaCard('sadesati', ssOn, 'bad', t('yoga.sadesati.name'), t('yoga.sadesati.rule'), ssText, `<div class="meta" style="margin-top:4px">${ssList || `<span class="tag">${esc(t('yoga.sadesati.none'))}</span>`}</div>`);
  const nGoodY = an.yogas.filter(y => y.present && y.tone === 'good').length, nBadY = an.yogas.filter(y => y.present && y.tone === 'bad').length + (ssOn ? 1 : 0);

  // Dasha (antardashas expand into pratyantar for members)
  const progress = md ? (now - md.start) / (md.end - md.start) : 0, circ = 2 * Math.PI * 40;
  const mdTone = md ? an.reading[md.lord].tone : 'mixed';
  const nowCard = md ? `<div class="card now-card reveal"><div class="pair">${g(md.lord)}${ad ? g(ad.lord) : ''}</div>
      <div><span class="eyebrow">${esc(t('sec.dasha.runningNow'))}</span><h3>${esc(t('sec.dasha.mdad', { md: { g: md.lord }, ad: { g: ad.lord } }))}</h3>
      <p>${esc(t('sec.dasha.nowText', { md: { g: md.lord }, ad: { g: ad.lord }, s: fDate(md.start, tz), e: fDate(md.end, tz), ae: fDate(ad.end, tz) }))} <b style="color:var(--${mdTone === 'mixed' ? 'warn' : mdTone})">${esc(t('sec.dasha.tone_' + mdTone, { g: { g: md.lord } }))}</b></p></div>
      <svg class="ring" viewBox="0 0 100 100" role="img" aria-label="${Math.round(progress * 100)}%"><circle class="bg" cx="50" cy="50" r="40"/><circle class="fg" id="ringfg" cx="50" cy="50" r="40" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/><text x="50" y="56" text-anchor="middle">${Math.round(progress * 100)}%</text></svg></div>` : '';
  const dashaList = c.dashas.filter(m => m.end > c.utMs && m.start < c.utMs + 110 * 365.25 * 86400000).map((m, i) => {
    const isNow = m === md, past = m.end < now;
    const sub = m.sub.filter(a => a.end > c.utMs).map(a => `<button type="button" class="ad ${a === ad ? 'now' : ''}" data-ad="${m.lord}|${a.lord}|${a.start}|${a.end}">${g(a.lord)}<span><b>${esc(gn(m.lord))} / ${esc(gn(a.lord))}</b><span>${fDate(Math.max(a.start, c.utMs), tz)} → ${fDate(a.end, tz)}</span></span>${ic('i-chev', 'chev')}</button>`).join('');
    return `<details class="${isNow ? 'now' : ''}" ${isNow ? 'open' : ''}><summary>${g(m.lord)}<span class="lord">${esc(t('sec.dasha.md', { g: { g: m.lord } }))}<span>${esc(t('sec.dasha.years', { n: DASHA_YEARS[m.lord] }))}${i === 0 ? ' · ' + esc(t('sec.dasha.balance', { v: ymd(c.balance.years) })) : ''}</span></span>
      <span class="when">${fDate(Math.max(m.start, c.utMs), tz)} → ${fDate(m.end, tz)}</span><span class="pill ${isNow ? '' : past ? 'past' : 'fut'}">${esc(t('sec.dasha.' + (isNow ? 'now' : past ? 'past' : 'ahead')))}</span>${ic('i-chev', 'chev')}</summary><div class="sub"><p class="muted small">${esc(t(premium ? 'pd.hint' : 'pd.hintLocked'))}</p><div class="subgrid">${sub}</div></div></details>`;
  }).join('');

  // Panchang at birth
  const tithiName = pc.tithi === 15 ? L.names.tithi[14] : pc.tithi === 30 ? L.names.tithi[15] : L.names.tithi[(pc.tithi - 1) % 15];
  const paksha = L.names.paksha[pc.paksha];
  const sunrise = pc.sunrise ? fTime(jdMs(pc.sunrise), tz) : '—', sunset = pc.sunset ? fTime(jdMs(pc.sunset), tz) : '—';
  const lit = Math.round((1 - Math.cos(pc.elong * Math.PI / 180)) / 2 * 100);
  const pan = [
    [`<span class="ic moonph">${moonPhase(pc.elong)}</span>`, t('sec.pan.tithi'), `${paksha} ${tithiName}`, t('sec.pan.tithiSub', { n: pc.tithi, p: lit })],
    [`<span class="ic">${ic('i-cal')}</span>`, t('sec.pan.vara'), L.names.vara[pc.varaIdx], t('res.lord', { g: { g: pc.varaLord } }) + (pc.bornBeforeSunrise ? ' · ' + t('sec.pan.beforeSunrise') : '')],
    [`<span class="ic">${ic('i-star')}</span>`, t('sec.pan.nakshatra'), nk(P.Moon.nak), t('res.pada', { p: P.Moon.pada }) + ' · ' + t('res.lord', { g: { g: av.nakLord } })],
    [`<span class="ic">${ic('i-loop')}</span>`, t('sec.pan.yoga'), L.names.yoga27[pc.yogaIdx], t('sec.pan.of27', { n: pc.yogaIdx + 1 })],
    [`<span class="ic">${ic('i-half')}</span>`, t('sec.pan.karana'), L.names.karana[pc.karana], t('sec.pan.karanaSub')],
    [`<span class="ic">${ic('i-rise')}</span>`, t('sec.pan.sunrise'), sunrise, t('sec.pan.localTime')],
    [`<span class="ic">${ic('i-set')}</span>`, t('sec.pan.sunset'), sunset, t('sec.pan.localTime')],
    [`<span class="ic">${ic('i-sun')}</span>`, t('sec.pan.paksha'), paksha, t(pc.paksha === 'Shukla' ? 'sec.pan.waxing' : 'sec.pan.waning')]
  ].map(([icon, k, v, sub], i) => `<div class="card pan reveal" style="--d:${(i % 4) * 50}ms">${icon}<dl style="margin:0"><dt>${esc(k)}</dt><dd>${esc(v)}<span>${esc(sub)}</span></dd></dl></div>`).join('');
  const V = L.names.val, avRows = [['varna', V[av.varna]], ['vashya', V[av.vashya]], ['yoni', V[av.yoni]], ['gana', V[av.gana]], ['nadi', V[av.nadi]], ['tatva', V[av.tatva]], ['lagnaLord', gn(av.lagnaLord)], ['rashiLord', gn(av.rashiLord)], ['nakLord', gn(av.nakLord)], ['nameLetter', L.names.syll[P.Moon.nak][P.Moon.pada - 1]]];

  // Bhavas
  const bhavas = Array.from({ length: 12 }, (_, i) => {
    const sign = (c.lagna.sign + i) % 12, lord = SIGN_LORD[sign], occ = c.planets.filter(p => p.house === i + 1), sav = c.sav[sign], tone = sav >= 28 ? 'good' : sav < 25 ? 'bad' : 'mixed';
    const mean = L.names.house[i];
    return `<article class="card bhava reveal ${i === 0 ? 'lagna' : ''}" style="--d:${(i % 4) * 50}ms"><div class="bh"><span class="no">${i + 1}</span><h3>${esc(t('sec.bhava.name', { n: L.names.houseName[i] }))}<small>${esc(rn(sign))}</small></h3>${rg(sign)}</div>
      <p class="means">${esc(mean.charAt(0).toUpperCase() + mean.slice(1))}</p>
      <div class="occ">${occ.length ? occ.map(p => `<span title="${esc(gn(p.name))}">${g(p.name, '')}</span>`).join('') : `<span class="none">${esc(t('sec.bhava.none'))}</span>`}</div>
      <p class="lordline">${esc(t('sec.bhava.lordIn', { g: { g: lord }, h: P[lord].house }))}</p>
      <div class="savbar"><span style="color:var(--ink-3)">SAV</span><div class="meter"><i class="${tone}" style="width:${Math.min(100, sav / 45 * 100)}%"></i></div><b style="color:var(--${tone === 'mixed' ? 'warn' : tone})">${sav}</b></div></article>`;
  }).join('');

  // Ashtakavarga
  const heat = v => { const q = Math.max(0, Math.min(1, v / 8)); return q >= .5 ? `rgba(17,128,78,${((q - .5) * 2 * .55 + .06).toFixed(2)})` : `rgba(194,53,45,${((.5 - q) * 2 * .45 + .05).toFixed(2)})`; };
  const savHeat = v => v >= 28 ? `rgba(17,128,78,${Math.min(.6, (v - 26) / 14).toFixed(2)})` : `rgba(194,53,45,${Math.min(.5, (30 - v) / 16).toFixed(2)})`;
  const avHead = Array.from({ length: 12 }, (_, i) => `<th class="${i === c.lagna.sign ? 'lg' : ''}">${rg(i, 'th-glyph')}${esc(rn(i))}</th>`).join('');
  const bavRows = Object.keys(c.bav).map(p => `<tr><td><span style="display:inline-flex;align-items:center;gap:8px"><svg class="gimg" viewBox="0 0 64 64" style="width:24px;height:24px"><use href="#gr-${p}"/></svg><b>${esc(gn(p))}</b></span></td>${c.bav[p].map(v => `<td class="hm" style="background:${heat(v)}">${v}</td>`).join('')}<td class="hm"><b>${c.bav[p].reduce((a, b) => a + b)}</b></td></tr>`).join('');
  const savRow = `<tr class="sav"><td>${esc(t('sec.ashtaka.sarva'))}</td>${c.sav.map(v => `<td class="hm" style="background:${savHeat(v)}">${v}</td>`).join('')}<td class="hm">337</td></tr>`;

  const goc = gochar.map((x, i) => `<div class="card goc reveal" style="--d:${(i % 4) * 50}ms">${g(x.name)}<div><b>${esc(t('sec.gochar.inSign', { g: { g: x.name }, r: { r: x.sign } }))}</b><span>${dm(x.deg)} · ${esc(t('sec.gochar.fromMoon', { h: x.fromMoon }))}${x.retro ? ' · ' + esc(t('sec.grahas.retro')) : ''}</span><span class="tag ${x.good ? 'good' : 'bad'}">${esc(t(x.good ? 'sec.gochar.fav' : 'sec.gochar.unfav'))}</span></div></div>`).join('');

  // Members-only: divisional charts, upcoming events, rectification
  const vargaTabs = `<div class="seg varga-tabs" role="tablist" aria-label="${esc(t('varga.title'))}">${VARGA_KEYS.map((k, i) => `<button type="button" role="tab" data-varga="${k}" aria-pressed="${i === 0}">${k}<small>${esc(t('varga.' + k + '.short'))}</small></button>`).join('')}</div>`;
  const vargaSection = premium ? `${vargaTabs}<div id="vargabox">${vargaHtml(c, premium.vargas, VARGA_KEYS[0])}</div>` : lockCard('vargas', `<p class="muted small">${VARGA_KEYS.map(k => k + ' ' + t('varga.' + k + '.short')).join(' · ')}</p>`);
  const upcomingHtml = premium ? (() => {
    const evs = premium.upcoming.slice();
    ss.periods.forEach(p => { if (p.start > now && p.start < now + 730 * 864e5) evs.push({ type: 'ssStart', at: p.start }); if (p.end > now && p.end < now + 730 * 864e5) evs.push({ type: 'ssEnd', at: p.end }); });
    evs.sort((a, b) => a.at - b.at);
    if (!evs.length) return `<p class="empty">${esc(t('events.none'))}</p>`;
    return `<ol class="timeline">${evs.map(e => {
      let icon, title, text, tone = '';
      if (e.type === 'ingress') { const good = GOCHAR_GOOD[e.planet].includes(e.house); tone = good ? 'good' : 'bad'; icon = g(e.planet); title = t('events.ingress', { g: { g: e.planet }, r: { r: e.to } }); text = t('events.ingressText', { h: e.house, m: { k: 'names.house.' + (e.house - 1) } }) + ' ' + t(good ? 'events.fav' : 'events.unfav'); }
      else if (e.type === 'md') { icon = g(e.lord); title = t('events.md', { g: { g: e.lord } }); text = t('events.mdText', { n: DASHA_YEARS[e.lord] }); tone = 'gold'; }
      else if (e.type === 'ad') { icon = g(e.lord); title = t('events.ad', { md: { g: e.md }, ad: { g: e.lord } }); text = t('events.adText'); }
      else { icon = g('Saturn'); title = t(e.type === 'ssStart' ? 'events.ssStart' : 'events.ssEnd'); text = t(e.type === 'ssStart' ? 'events.ssStartText' : 'events.ssEndText'); tone = e.type === 'ssStart' ? 'bad' : 'good'; }
      return `<li class="${tone}"><span class="when">${esc(fDate(e.at, tz))}</span><span class="dot">${icon}</span><div><b>${esc(title)}</b><p>${esc(text)}</p></div></li>`;
    }).join('')}</ol>`;
  })() : lockCard('events');
  const rectHtml = premium ? `<div class="card tbl-card reveal"><table class="rect"><thead><tr><th>${esc(t('rect.from'))}</th><th>${esc(t('rect.to'))}</th><th>${esc(t('rect.lagna'))}</th><th>${esc(t('rect.navamsa'))}</th></tr></thead><tbody>${premium.rectification.map(s => `<tr class="${s.current ? 'cur' : ''}"><td class="num">${fTime(s.start, tz)}</td><td class="num">${fTime(s.end, tz)}</td><td>${rg(s.lagna, 'rg sm')}${esc(rn(s.lagna))}</td><td>${esc(rn(s.navamsa))}${s.current ? ` <span class="tag gold">${esc(t('rect.yours'))}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>` : lockCard('rectify');

  const lstH = method.lstDeg / 15, lst = `${Math.floor(lstH)}h ${pad(Math.floor((lstH % 1) * 60))}m`;
  const dashaFact = `<div class="fact"><span class="ic">${md ? g(md.lord) : ''}</span><div><dt>${esc(t('res.dasha'))}</dt><dd>${md ? `${esc(gn(md.lord))} / ${esc(gn(ad.lord))}` : '—'}<span>${ad ? esc(t('res.until', { d: fDate(ad.end, tz) })) : ''}</span></dd></div></div>`;
  const sec = (id, k, body, right = '', lede) => `<section id="${id}"><div class="sec-head"><div><p class="eyebrow">${esc(t('sec.' + k + '.eye'))}</p><h2>${esc(t('sec.' + k + '.title'))}</h2><p class="lede">${lede !== undefined ? lede : esc(t('sec.' + k + '.lede'))}</p></div>${right}</div>${body}</section>`;
  const mSec = (id, k, body) => `<section id="${id}"><div class="sec-head"><div><p class="eyebrow">${esc(t(k + '.eye'))} <span class="tag gold">${esc(t('members.badge'))}</span></p><h2>${esc(t(k + '.title'))}</h2><p class="lede">${esc(t(k + '.lede'))}</p></div></div>${body}</section>`;

  const trialBanner = data.trial && !session ? `<div class="trial-banner reveal"><span class="ic">${ic('i-star')}</span><div><b>${esc(t('trial.title'))}</b><p>${esc(t('trial.text'))}</p></div><button class="btn-cta" type="button" data-auth="signup">${esc(t('trial.cta'))}</button></div>` : '';
  const sharedBanner = data.shared ? `<div class="trial-banner reveal"><span class="ic">${ic('i-link')}</span><div><b>${esc(t('share.viewTitle'))}</b><p>${esc(t('share.viewText'))}</p></div><a class="btn-cta" href="${HOME}">${esc(t('share.makeOwn'))}</a></div>` : '';
  const actions = `<div class="report-actions no-print">${!data.shared ? `<button class="btn-line" type="button" id="act-share">${ic('i-link')}${esc(t('share.button'))}${session ? '' : ic('i-lock', 'lk')}</button>` : ''}<button class="btn-line" type="button" id="act-pdf">${ic('i-download')}${esc(t('pdf.button'))}${session ? '' : ic('i-lock', 'lk')}</button><a class="btn-line" href="${HOME}matching/">${ic('i-heart')}${esc(t('nav.matching'))}</a></div>`;
  const NAV = ['highlights', 'today', 'areas', 'charts', 'grahas', 'yogas', 'remedies', 'dasha', 'events', 'panchang', 'bhavas', 'gochar', 'notes'];
  const todaySec = mSec('today', 'my', premium && premium.today ? todayHtml(premium.today, tz) : lockCard('today'));
  const areasSec = mSec('areas', 'la', premium && premium.areas ? areasHtml(premium.areas, tz) : lockCard('areas', `<p class="muted small">${['career', 'marriage', 'finance', 'health', 'education', 'children'].map(k => t('la.' + k + '.name')).join(' · ')}</p>`));
  const remSec = mSec('remedies', 'rm', premium && premium.remedies ? remediesHtml(premium.remedies) : lockCard('remedies'));
  const notesSec = data.shared ? '' : mSec('notes', 'notes', session ? '<div id="notesbox"><span class="spin"></span></div>' : lockCard('notes'));

  host.innerHTML = `
  ${trialBanner}${sharedBanner}
  <div class="print-head"><b>${esc(t('brand.name'))}</b> · ${esc(location.host)} · ${esc(fDate(now, tz))}</div>
  ${profileHtml(input, c.utMs, c.lagna, P.Moon, { llHouse: P[SIGN_LORD[c.lagna.sign]].house, dasha: dashaFact })}
  ${actions}
  <nav class="jump-nav no-print" aria-label="${esc(t('nav.sections'))}">${NAV.filter(k => k !== 'notes' || !data.shared).map(k => `<a class="tag" href="#${k}">${esc(t('nav.' + k))}</a>`).join('')}</nav>
  ${sec('highlights', 'hl', `<div class="card reveal" style="padding:16px 20px"><div class="balance"><span class="lbl g">${esc(t('sec.hl.nGood', { n: an.good.length }))}</span><div class="bar"><i style="width:${gp}%"></i></div><span class="lbl b">${esc(t('sec.hl.nBad', { n: an.bad.length }))}</span></div></div>
    <div class="hl-grid"><div class="card hl-col good"><h3><span class="badge">${ic('i-check')}</span>${esc(t('sec.hl.good'))}<small>${an.good.length}</small></h3><ul class="hl-list">${an.good.map(hlItem).join('') || `<li class="empty">${esc(t('sec.hl.noneGood'))}</li>`}</ul></div>
    <div class="card hl-col bad"><h3><span class="badge">${ic('i-alert')}</span>${esc(t('sec.hl.bad'))}<small>${an.bad.length}</small></h3><ul class="hl-list">${an.bad.map(hlItem).join('') || `<li class="empty">${esc(t('sec.hl.noneBad'))}</li>`}</ul></div></div>`)}
  ${todaySec}
  ${areasSec}
  ${sec('charts', 'charts', `<div class="charts drawing" id="chartsbox">${chartsHtml(c)}</div><div class="chart-key">${ORDER.map(p => `<span><b style="color:${COL[p]}">${esc(ga(p))}</b>${esc(gn(p))}</span>`).join('')}</div>
    <div class="varga-wrap"><h3 class="sub-h">${esc(t('varga.title'))} ${premium ? '' : `<span class="tag gold">${esc(t('members.badge'))}</span>`}</h3><p class="lede">${esc(t('varga.lede'))}</p>${vargaSection}</div>`,
    `<div class="seg no-print" role="group" aria-label="${esc(t('sec.charts.style'))}" id="stylesel"><button type="button" data-style="north" aria-pressed="${chartStyle === 'north'}">${esc(t('sec.charts.north'))}</button><button type="button" data-style="south" aria-pressed="${chartStyle === 'south'}">${esc(t('sec.charts.south'))}</button></div>`)}
  ${sec('belt', 'belt', `<div class="card belt-card reveal">${drawBelt(c)}</div>`)}
  ${sec('grahas', 'grahas', `<div class="graha-grid">${grahaCards}</div>`)}
  ${sec('yogas', 'yogas', `<div class="yoga-grid" id="yogagrid">${ssCard}${yogaCards}</div>`,
    `<div class="seg yoga-filter no-print" role="group" aria-label="${esc(t('sec.yogas.filter'))}">${['all', 'present', 'good', 'bad'].map((f, i) => `<button type="button" data-f="${f}" aria-pressed="${i === 0}">${esc(t('sec.yogas.' + f))}</button>`).join('')}</div>`,
    esc(t('sec.yogas.lede', { g: nGoodY, b: nBadY })))}
  ${remSec}
  ${sec('dasha', 'dasha', `${nowCard}<div class="card ribbon-card reveal">${drawRibbon(c, now)}</div><div class="dasha-list">${dashaList}</div>`, '',
    esc(t('sec.dasha.lede', { p: ((1 - c.balance.years / DASHA_YEARS[c.balance.lord]) * 100).toFixed(1), nk: { nk: P.Moon.nak }, v: ymd(c.balance.years), g: { g: c.balance.lord } })))}
  ${mSec('events', 'events', upcomingHtml)}
  ${sec('panchang', 'pan', `<div class="pan-grid">${pan}</div><div class="card ava reveal"><h3>${esc(t('sec.pan.ava'))}</h3><dl class="ava-grid">${avRows.map(([k, v]) => `<div><dt>${esc(t('sec.pan.av.' + k))}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`)}
  ${sec('bhavas', 'bhava', `<div class="bhava-grid">${bhavas}</div>`)}
  ${sec('ashtaka', 'ashtaka', `<div class="card tbl-card reveal"><table><thead><tr><th>${esc(t('sec.ashtaka.graha'))}</th>${avHead}<th>${esc(t('sec.ashtaka.total'))}</th></tr></thead><tbody>${bavRows}${savRow}</tbody></table></div>
    <div class="legend"><span><i style="background:rgba(17,128,78,.5)"></i>${esc(t('sec.ashtaka.high'))}</span><span><i style="background:rgba(194,53,45,.4)"></i>${esc(t('sec.ashtaka.low'))}</span><span style="color:var(--gold-deep)">${esc(t('sec.ashtaka.lagnaCol'))}</span></div>`)}
  ${sec('gochar', 'gochar', `<div class="gochar-grid">${goc}</div>`, '', esc(t('sec.gochar.lede', { d: fDate(now, tz) })))}
  ${mSec('rectify', 'rect', rectHtml)}
  ${notesSec}
  ${sec('method', 'method', `<div class="card method reveal"><p class="mono">UT ${fDate(c.utMs, 0)} ${fTime(c.utMs, 0)} · JD ${c.jd.toFixed(5)} · LST ${lst} · Lahiri ${dms(c.ayanamsa)} · Sayana Lagna ${dms(method.sayanaAsc)} · ${latStr(input.lat)}, ${lonStr(input.lon)}</p><p>${esc(t('sec.method.p1'))}</p><p>${esc(t('sec.method.p2'))}</p></div>`, '', '')}`;

  // Interactions
  let currentVarga = VARGA_KEYS[0];
  $$('#stylesel button').forEach(b => b.addEventListener('click', () => {
    chartStyle = b.dataset.style; store.set('kg-style', chartStyle);
    $$('#stylesel button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.style === chartStyle)));
    const box = $('#chartsbox'); box.classList.remove('drawing'); box.innerHTML = chartsHtml(c); void box.offsetWidth; box.classList.add('drawing');
    if (premium) $('#vargabox').innerHTML = vargaHtml(c, premium.vargas, currentVarga);
  }));
  if (premium) $$('.varga-tabs button').forEach(b => b.addEventListener('click', () => {
    currentVarga = b.dataset.varga;
    $$('.varga-tabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#vargabox').innerHTML = vargaHtml(c, premium.vargas, currentVarga);
  }));
  $$('.yoga-filter button').forEach(b => b.addEventListener('click', () => {
    $$('.yoga-filter button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.f;
    $$('#yogagrid .yoga').forEach(el => { const on = el.classList.contains('on'), good = el.classList.contains('good'); el.hidden = f === 'present' ? !on : f === 'good' ? !(on && good) : f === 'bad' ? !(on && !good) : false; });
  }));
  host.querySelector('.dasha-list').addEventListener('click', e => {
    const b = e.target.closest('.ad'); if (!b) return;
    if (!premium) { requireLogin('pratyantar'); return; }
    const open = b.nextElementSibling && b.nextElementSibling.classList.contains('pd');
    if (open) { b.nextElementSibling.remove(); b.classList.remove('open'); return; }
    const [mdL, adL, s, e2] = b.dataset.ad.split('|');
    const list = pratyantar(adL, +s, +e2);
    const div = document.createElement('div'); div.className = 'pd';
    div.innerHTML = `<b class="pd-h">${esc(t('pd.title', { md: { g: mdL }, ad: { g: adL } }))}</b>` + list.map(p => `<div class="${p.start <= now && now < p.end ? 'now' : ''}">${g(p.lord, 'gimg sm')}<span>${esc(gn(p.lord))}</span><span class="num">${fDate(p.start, tz)} → ${fDate(p.end, tz)}</span></div>`).join('');
    b.classList.add('open'); b.after(div);
  });
  const sh = $('#act-share'); if (sh) sh.addEventListener('click', () => shareChart(input));
  $('#act-pdf').addEventListener('click', downloadPdf);
  if (premium && premium.areas) $$('.area-tabs button').forEach(b => b.addEventListener('click', () => {
    $$('.area-tabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#areabox').innerHTML = areaBody(premium.areas[b.dataset.area], b.dataset.area, tz);
  }));
  if (session && !data.shared) { mountNotes(input); brandHead(); }
  requestAnimationFrame(() => { const fg = $('#ringfg'); if (fg) fg.style.strokeDashoffset = circ * (1 - progress); });
  observeReveals();
}
