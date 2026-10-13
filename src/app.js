/* Kundali Ganit — client. Calculation happens on the server (/api/kundali); this file handles
   the form, Supabase login, the free preview gate, saved charts and rendering in the page language. */
(() => {
const L = window.I18N, LANG = L.meta.code, LOCALE = L.meta.locale;
const cfg = window.KG_CONFIG || {};
const INITIAL_HASH = location.hash, INITIAL_SEARCH = location.search;
const sb = cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const PLACES = window.PLACES || [];
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const COL = { Sun: '#C25A0E', Moon: '#56627E', Mars: '#C2311F', Mercury: '#1C7E4B', Jupiter: '#9A6F00', Venus: '#B83C74', Saturn: '#2B47B8', Rahu: '#3E4559', Ketu: '#7A4A2C' };

// ---------- i18n ----------
const get = path => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L);
function t(key, params) {
  let s = get(key);
  if (s == null) { console.warn('[i18n] missing', key); return key; }
  if (typeof s !== 'string') return s;
  return params ? s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? val(params[k]) : m)) : s;
}
function val(v) {
  if (v == null) return '';
  if (typeof v !== 'object') return String(v);
  if (v.g) return gn(v.g);
  if (v.r !== undefined) return rn(v.r);
  if (v.nk !== undefined) return nk(v.nk);
  if (v.list) return joinList(v.list.map(val));
  if (v.k) return t(v.k, v.p || {});
  return '';
}
const gn = g => L.names.graha[g], ga = g => L.names.grahaAb[g], rn = i => L.names.rashi[i], nk = i => L.names.nak[i];
function joinList(arr) { try { return new Intl.ListFormat(LOCALE, { style: 'long', type: 'conjunction' }).format(arr); } catch (e) { return arr.join(', '); } }
const msg = m => t(m[0], m[1]);

// ---------- Formatting ----------
const dm = x => { let d = Math.floor(x), m = Math.round((x - d) * 60); if (m === 60) { d++; m = 0; } return `${d}°${String(m).padStart(2, '0')}′`; };
const dms = x => { const d = Math.floor(x), mf = (x - d) * 60, m = Math.floor(mf), s = Math.floor((mf - m) * 60); return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″`; };
const offStr = min => { const s = min < 0 ? '−' : '+', a = Math.abs(min); return `${s}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(Math.round(a % 60)).padStart(2, '0')}`; };
const parseOff = s => { const m = String(s).trim().replace('−', '-').match(/^(?:UTC|GMT)?\s*([+-])?\s*(\d{1,2})(?::?(\d{2}))?$/i); if (!m) return null; const v = (+m[2]) * 60 + (+(m[3] || 0)); return m[1] === '-' ? -v : v; };
let dateFmt; try { dateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch (e) { dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
const fDate = (ms, tz) => dateFmt.format(new Date(ms + tz * 60000));
const fTime = (ms, tz) => { const d = new Date(ms + tz * 60000); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
const jdMs = jd => (jd - 2440587.5) * 86400000;
const ymd = yrs => { const y = Math.floor(yrs), mf = (yrs - y) * 12, m = Math.floor(mf), d = Math.round((mf - m) * 30.4375); return t('sec.dasha.ymd', { y, m, d }); };
const latStr = v => `${Math.abs(v).toFixed(4)}°${v >= 0 ? 'N' : 'S'}`, lonStr = v => `${Math.abs(v).toFixed(4)}°${v >= 0 ? 'E' : 'W'}`;
const g = (name, cls = 'gimg') => `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><use href="#gr-${name}"/></svg>`;
const rg = (s, cls = 'rg') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${s}"/></svg>`;
const ic = (id, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#${id}"/></svg>`;
const syllables = (nak, pada) => L.names.syll[nak].map((s, i) => i === pada - 1 ? `<b style="color:var(--gold-deep)">${esc(s)}</b>` : esc(s)).join(', ');
function toast(text) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = text; document.body.appendChild(el); setTimeout(() => el.remove(), 2800); }

function tzOffsetMinutes(tz, y, mo, d, h, mi) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const offAt = ms => { const p = {}; for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value; return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms) / 60000; };
  const guess = Date.UTC(y, mo - 1, d, h, mi); let off = offAt(guess); off = offAt(guess - off * 60000); return off;
}

// ---------- Language switch ----------
const langSel = $('#lang');
langSel.addEventListener('change', () => { try { localStorage.setItem('kg-lang', langSel.value); } catch (e) { } location.href = langSel.selectedOptions[0].dataset.href + (location.hash || ''); });

// ---------- Place picker ----------
const fPlace = $('#f-place'), sug = $('#suggest'), meta = $('#place-meta');
let chosen = null, offAuto = true, activeIdx = -1, matches = [];
function showMeta() { meta.innerHTML = chosen ? `<b>✓ ${esc(chosen.name)}</b> · ${latStr(chosen.lat)}, ${lonStr(chosen.lon)}${chosen.tz ? ' · ' + esc(chosen.tz) : ''}` : ''; }
function autoOffset() {
  if (!chosen || !chosen.tz || !offAuto) return;
  const [y, mo, d] = ($('#f-date').value || '2000-01-01').split('-').map(Number), [h, mi] = ($('#f-time').value || '12:00').split(':').map(Number);
  try { $('#f-off').value = offStr(tzOffsetMinutes(chosen.tz, y, mo, d, h, mi)); } catch (e) { }
}
function choose(p) { chosen = p; fPlace.value = `${p.name}, ${p.region}`; $('#f-lat').value = p.lat; $('#f-lon').value = p.lon; offAuto = true; autoOffset(); showMeta(); closeSug(); }
function closeSug() { sug.hidden = true; fPlace.setAttribute('aria-expanded', 'false'); activeIdx = -1; }
function renderSug() { sug.innerHTML = matches.map((p, i) => `<li role="option" aria-selected="${i === activeIdx}" data-i="${i}">${esc(p.name)}<small>${esc(p.region)}</small></li>`).join(''); sug.hidden = !matches.length; fPlace.setAttribute('aria-expanded', String(!!matches.length)); }
fPlace.addEventListener('input', () => {
  chosen = null; showMeta();
  const q = fPlace.value.trim().toLowerCase().split(',')[0].trim();
  if (q.length < 2) { matches = []; renderSug(); return; }
  const starts = PLACES.filter(p => p.name.toLowerCase().startsWith(q)), has = PLACES.filter(p => !starts.includes(p) && (p.name + ' ' + p.region).toLowerCase().includes(q));
  matches = [...starts, ...has].slice(0, 8); activeIdx = matches.length ? 0 : -1; renderSug();
});
fPlace.addEventListener('keydown', e => {
  if (sug.hidden) return;
  if (e.key === 'ArrowDown') { activeIdx = Math.min(matches.length - 1, activeIdx + 1); renderSug(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { activeIdx = Math.max(0, activeIdx - 1); renderSug(); e.preventDefault(); }
  else if (e.key === 'Enter' && activeIdx >= 0) { choose(matches[activeIdx]); e.preventDefault(); }
  else if (e.key === 'Escape') closeSug();
});
sug.addEventListener('mousedown', e => { const li = e.target.closest('li'); if (li) { e.preventDefault(); choose(matches[+li.dataset.i]); } });
fPlace.addEventListener('blur', () => setTimeout(closeSug, 120));
$('#f-date').addEventListener('change', autoOffset); $('#f-time').addEventListener('change', autoOffset);
$('#f-off').addEventListener('input', () => { offAuto = false; });
['#f-lat', '#f-lon'].forEach(s => $(s).addEventListener('input', () => { if (chosen) { chosen = { ...chosen, lat: +$('#f-lat').value, lon: +$('#f-lon').value }; showMeta(); } }));
$('#online').addEventListener('click', async () => {
  const q = fPlace.value.trim().split(',')[0], err = $('#err');
  if (!q) { err.textContent = t('err.typeFirst'); return; }
  err.textContent = t('err.looking');
  try {
    const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=8&language=' + (LANG === 'en' ? 'en' : LANG) + '&name=' + encodeURIComponent(q));
    const js = await res.json();
    if (!js.results || !js.results.length) { err.textContent = t('err.notFound', { q }); return; }
    matches = js.results.map(r => ({ name: r.name, region: [r.admin1, r.country].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude, tz: r.timezone }));
    activeIdx = 0; renderSug(); err.textContent = ''; fPlace.focus();
  } catch (e) { err.textContent = t('err.lookupFail'); }
});

// ---------- Wheel ----------
function drawWheel(data) {
  const C = 270, asc = data ? data.ascLon : 0, lagnaSign = data ? data.lagnaSign : -1;
  const pt = (lon, rad) => { const a = (180 + (lon - asc)) * Math.PI / 180; return [C + rad * Math.cos(a), C - rad * Math.sin(a)]; };
  const f = n => n.toFixed(1), R1 = 258, R2 = 212, R3 = 196;
  let s = `<svg class="wheel" viewBox="0 0 540 540" role="img" aria-label="${esc(t('hero.wheel'))}"><g class="halo"><circle cx="${C}" cy="${C}" r="266" fill="none" stroke="#D3971C" stroke-width="1" stroke-dasharray="2 7" opacity=".7"/></g>`;
  s += `<g class="spinner"><circle cx="${C}" cy="${C}" r="${R1}" fill="#fff" stroke="#D9B66B" stroke-width="1.5"/>`;
  for (let i = 0; i < 12; i++) {
    const a = i * 30, b = a + 30, [x1, y1] = pt(a, R1), [x2, y2] = pt(b, R1), [x3, y3] = pt(b, R2), [x4, y4] = pt(a, R2);
    s += `<path d="M${f(x1)} ${f(y1)} A${R1} ${R1} 0 0 0 ${f(x2)} ${f(y2)} L${f(x3)} ${f(y3)} A${R2} ${R2} 0 0 1 ${f(x4)} ${f(y4)}Z" fill="${i === lagnaSign ? '#F7E1AE' : i % 2 ? '#FDF8EC' : '#FFFFFF'}" stroke="#D9B66B"/>`;
    const [gx, gy] = pt(a + 15, 235);
    s += `<use href="#rs-${i}" x="${f(gx - 12)}" y="${f(gy - 12)}" width="24" height="24" style="color:${i === lagnaSign ? '#8C5E05' : '#2A2E7C'}"><title>${esc(rn(i))}</title></use>`;
  }
  s += `<circle cx="${C}" cy="${C}" r="${R2}" fill="#FDFCF7" stroke="#D9B66B"/>`;
  for (let k = 0; k < 27; k++) { const [a1, b1] = pt(k * 360 / 27, R2), [a2, b2] = pt(k * 360 / 27, R3); s += `<line x1="${f(a1)}" y1="${f(b1)}" x2="${f(a2)}" y2="${f(b2)}" stroke="#D9B66B"/>`; }
  s += `<circle cx="${C}" cy="${C}" r="${R3}" fill="none" stroke="#E8D3A3"/>`;
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = pt(i * 30, R3), [x2, y2] = pt(i * 30, 62);
    s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#EFE3C6"/>`;
    if (data) { const [hx, hy] = pt(i * 30 + 15, 182); s += `<text x="${f(hx)}" y="${f(hy + 4)}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="#B8A06A">${(i - lagnaSign + 12) % 12 + 1}</text>`; }
  }
  s += `<circle cx="${C}" cy="${C}" r="62" fill="#fff" stroke="#E8D3A3"/><use href="#logo" x="${C - 34}" y="${C - 34}" width="68" height="68"/>`;
  if (data) {
    const [l1x, l1y] = pt(asc, 62), [l2x, l2y] = pt(asc, R1 + 2), [lt, lty] = pt(asc, 202);
    s += `<line x1="${f(l1x)}" y1="${f(l1y)}" x2="${f(l2x)}" y2="${f(l2y)}" stroke="#C2352D" stroke-width="2"/><text x="${f(lt + 6)}" y="${f(lty - 6)}" font-weight="700" font-size="12" fill="#C2352D">${esc(t('sec.charts.asc'))}</text>`;
    const levels = [], radii = [160, 128, 96];
    [...(data.planets || [])].sort((a, b) => a.lon - b.lon).forEach((p, i) => {
      let lv = 0; while (levels[lv] !== undefined && Math.abs(((p.lon - levels[lv] + 540) % 360) - 180) < 13 && lv < 2) lv++;
      levels[lv] = p.lon;
      const [x, y] = pt(p.lon, radii[lv]), [ox, oy] = pt(p.lon, R3);
      s += `<g class="pm" style="--d:${i * 90}ms"><line x1="${f(ox)}" y1="${f(oy)}" x2="${f(x)}" y2="${f(y)}" stroke="${COL[p.name]}" stroke-dasharray="2 3" opacity=".6"/><circle cx="${f(x)}" cy="${f(y)}" r="17" fill="#fff" stroke="${COL[p.name]}" stroke-opacity=".35"/><use href="#gr-${p.name}" x="${f(x - 15)}" y="${f(y - 15)}" width="30" height="30"><title>${esc(gn(p.name))} · ${esc(rn(p.sign))} ${dm(p.deg)}</title></use></g>`;
    });
  }
  $('#wheel').innerHTML = s + `</g></svg><p class="wheel-legend">${esc(t('hero.wheel'))}</p>`;
}

// ---------- Charts ----------
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
let chartStyle = 'north';
try { chartStyle = localStorage.getItem('kg-style') || 'north'; } catch (e) { }
function chartsHtml(c) {
  const mk = (asc, key, deg) => { const bySign = Array.from({ length: 12 }, () => []); c.planets.forEach(p => bySign[p[key]].push({ t: ga(p.name) + (deg ? ' ' + Math.floor(p.deg) + '°' : ''), c: COL[p.name], r: p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' })); return { asc, bySign }; };
  const moon = c.planets.find(p => p.name === 'Moon');
  return [
    { ...mk(c.lagna.sign, 'sign', true), title: t('sec.charts.c1'), sub: t('sec.charts.c1s'), h: t('sec.charts.d1'), p: t('sec.charts.d1t', { r: { r: c.lagna.sign } }) },
    { ...mk(c.lagna.navamsa, 'navamsa', false), title: t('sec.charts.c9'), sub: t('sec.charts.c9s'), h: t('sec.charts.d9'), p: t('sec.charts.d9t') },
    { ...mk(moon.sign, 'sign', true), title: t('sec.charts.cm'), sub: t('sec.charts.cms'), h: t('sec.charts.moon'), p: t('sec.charts.moont', { r: { r: moon.sign } }) }
  ].map(d => `<div class="card chart">${chartStyle === 'north' ? drawNorth(d) : drawSouth(d)}<h3>${esc(d.h)}</h3><p>${esc(d.p)}</p></div>`).join('');
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

// ---------- Profile card (shared by preview and full) ----------
function profileHtml(input, utMs, lagna, moon, extraFacts) {
  const tz = input.tzMinutes, ll = SIGN_LORD[lagna.sign];
  return `<div class="card profile reveal">
    <div class="who"><span class="eyebrow">${esc(t('res.eyebrow'))}</span><h2>${esc(input.name || t('res.defaultName'))}</h2>
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

// ---------- Preview (logged out) ----------
function renderPreview(data) {
  const { input, preview: pv } = data, used = data.reason === 'trial_used';
  drawWheel({ ascLon: pv.lagna.sign * 30 + pv.lagna.deg, lagnaSign: pv.lagna.sign, planets: [] });
  const benefits = ['b1', 'b2', 'b3', 'b4', 'b5'].map(k => `<li>${ic('i-check')}<span>${esc(t('gate.' + k))}</span></li>`).join('');
  const mock = ['Sun', 'Jupiter', 'Saturn'].map(n => `<div class="m">${g(n)}<div class="ln"></div><div class="ln s"></div><div class="ln g"></div><div class="ln b"></div><div class="ln"></div></div>`).join('');
  $('#results').innerHTML = `
    <div style="margin-top:28px"><span class="preview-badge">${ic('i-info')}${esc(t('gate.preview'))}</span></div>
    ${profileHtml(input, pv.utMs, pv.lagna, pv.moon, {})}
    <div class="gate reveal"><div class="mock" aria-hidden="true">${mock}${mock}</div>
      <div class="over"><div class="panel"><div class="lock">${ic('i-lock')}</div><h3>${esc(t(used ? 'gate.usedTitle' : 'gate.title'))}</h3><p>${esc(t(used ? 'gate.usedText' : 'gate.text'))}</p><ul>${benefits}</ul>
        <div class="btns"><button class="btn-cta go" type="button" data-auth="signup" style="grid-column:auto">${esc(t('gate.signup'))}</button><button class="btn-line" type="button" data-auth="login">${esc(t('gate.login'))}</button></div>
        <small>${esc(t('gate.free'))}</small></div></div></div>`;
  observeReveals();
  if (used && sb) setTimeout(() => authModal('signup'), 700);
}

// ---------- Full report (logged in) ----------
function renderFull(data) {
  const { input, chart: c, analysis: an, gochar, sadeSati: ss, method } = data;
  const tz = input.tzMinutes, now = Date.now();
  const P = Object.fromEntries(c.planets.map(p => [p.name, p])), av = c.avakahada, pc = c.panchang;
  const md = c.dashas.find(m => m.start <= now && now < m.end), ad = md && md.sub.find(a => a.start <= now && now < a.end);
  drawWheel({ ascLon: c.lagna.lon, lagnaSign: c.lagna.sign, planets: c.planets });

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
      <p class="read">${esc(rd.parts.map(msg).join(' '))}</p></article>`;
  }).join('');

  const ys = [...an.yogas].sort((a, b) => (b.present - a.present) || (a.tone === 'good' ? -1 : 1));
  const yogaCard = (id, present, tone, name, rule, text, extra = '') => `<article class="card yoga reveal ${present ? 'on' : 'off'} ${tone}"><div class="yh"><h3>${esc(name)}</h3><span class="verdict ${present ? tone : ''}" style="${present ? '' : 'background:var(--bg);color:var(--ink-3)'}">${esc(present ? t(tone === 'good' ? 'sec.yogas.pGood' : 'sec.yogas.pBad') : t('sec.yogas.off'))}</span></div><p class="rule">${esc(rule)}</p><p>${esc(text)}</p>${extra}</article>`;
  const yogaCards = ys.map(y => {
    const off = get('yoga.' + y.id + '.off');
    return yogaCard(y.id, y.present, y.tone, t('yoga.' + y.id + '.name', y.nameParams), t('yoga.' + y.id + '.rule', y.params), y.present || !off ? t('yoga.' + y.id + '.text', y.params) : t('yoga.' + y.id + '.off', y.params));
  }).join('');
  const nowJdMs = now;
  const ssList = ss.periods.map(p => `<span class="tag ${p.start <= nowJdMs && nowJdMs <= p.end ? 'bad' : ''}">${fDate(p.start, tz)} → ${fDate(p.end, tz)}</span>`).join(' ');
  const ssOn = !!(ss.phase || ss.dhaiya);
  const ssText = t('yoga.sadesati.now', { r: { r: ss.satSign }, h: ss.house, m: { r: P.Moon.sign } }) + (ss.phase ? ' ' + t('yoga.sadesati.' + ss.phase) : ss.dhaiya ? ' ' + t('yoga.sadesati.dhaiya' + ss.dhaiya) : '');
  const ssCard = yogaCard('sadesati', ssOn, 'bad', t('yoga.sadesati.name'), t('yoga.sadesati.rule'), ssText, `<div class="meta" style="margin-top:4px">${ssList || `<span class="tag">${esc(t('yoga.sadesati.none'))}</span>`}</div>`);
  const nGoodY = an.yogas.filter(y => y.present && y.tone === 'good').length, nBadY = an.yogas.filter(y => y.present && y.tone === 'bad').length + (ssOn ? 1 : 0);

  // Dasha
  const progress = md ? (now - md.start) / (md.end - md.start) : 0, circ = 2 * Math.PI * 40;
  const mdTone = md ? an.reading[md.lord].tone : 'mixed';
  const nowCard = md ? `<div class="card now-card reveal"><div class="pair">${g(md.lord)}${ad ? g(ad.lord) : ''}</div>
      <div><span class="eyebrow">${esc(t('sec.dasha.runningNow'))}</span><h3>${esc(t('sec.dasha.mdad', { md: { g: md.lord }, ad: { g: ad.lord } }))}</h3>
      <p>${esc(t('sec.dasha.nowText', { md: { g: md.lord }, ad: { g: ad.lord }, s: fDate(md.start, tz), e: fDate(md.end, tz), ae: fDate(ad.end, tz) }))} <b style="color:var(--${mdTone === 'mixed' ? 'warn' : mdTone})">${esc(t('sec.dasha.tone_' + mdTone, { g: { g: md.lord } }))}</b></p></div>
      <svg class="ring" viewBox="0 0 100 100" role="img" aria-label="${Math.round(progress * 100)}%"><circle class="bg" cx="50" cy="50" r="40"/><circle class="fg" id="ringfg" cx="50" cy="50" r="40" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/><text x="50" y="56" text-anchor="middle">${Math.round(progress * 100)}%</text></svg></div>` : '';
  const dashaList = c.dashas.filter(m => m.end > c.utMs && m.start < c.utMs + 110 * 365.25 * 86400000).map((m, i) => {
    const isNow = m === md, past = m.end < now;
    const sub = m.sub.filter(a => a.end > c.utMs).map(a => `<div class="${a === ad ? 'now' : ''}">${g(a.lord)}<span><b>${esc(gn(m.lord))} / ${esc(gn(a.lord))}</b><span>${fDate(Math.max(a.start, c.utMs), tz)} → ${fDate(a.end, tz)}</span></span></div>`).join('');
    return `<details class="${isNow ? 'now' : ''}" ${isNow ? 'open' : ''}><summary>${g(m.lord)}<span class="lord">${esc(t('sec.dasha.md', { g: { g: m.lord } }))}<span>${esc(t('sec.dasha.years', { n: DASHA_YEARS[m.lord] }))}${i === 0 ? ' · ' + esc(t('sec.dasha.balance', { v: ymd(c.balance.years) })) : ''}</span></span>
      <span class="when">${fDate(Math.max(m.start, c.utMs), tz)} → ${fDate(m.end, tz)}</span><span class="pill ${isNow ? '' : past ? 'past' : 'fut'}">${esc(t('sec.dasha.' + (isNow ? 'now' : past ? 'past' : 'ahead')))}</span>${ic('i-chev', 'chev')}</summary><div class="sub"><div class="subgrid">${sub}</div></div></details>`;
  }).join('');

  // Panchang
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

  const lstH = method.lstDeg / 15, lst = `${Math.floor(lstH)}h ${String(Math.floor((lstH % 1) * 60)).padStart(2, '0')}m`;
  const dashaFact = `<div class="fact"><span class="ic">${md ? g(md.lord) : ''}</span><div><dt>${esc(t('res.dasha'))}</dt><dd>${md ? `${esc(gn(md.lord))} / ${esc(gn(ad.lord))}` : '—'}<span>${ad ? esc(t('res.until', { d: fDate(ad.end, tz) })) : ''}</span></dd></div></div>`;
  const sec = (id, k, body, right = '', lede) => `<section id="${id}"><div class="sec-head"><div><p class="eyebrow">${esc(t('sec.' + k + '.eye'))}</p><h2>${esc(t('sec.' + k + '.title'))}</h2><p class="lede">${lede !== undefined ? lede : esc(t('sec.' + k + '.lede'))}</p></div>${right}</div>${body}</section>`;

  const trialBanner = data.trial && !session ? `<div class="trial-banner reveal"><span class="ic">${ic('i-star')}</span><div><b>${esc(t('trial.title'))}</b><p>${esc(t('trial.text'))}</p></div><button class="btn-cta" type="button" data-auth="signup">${esc(t('trial.cta'))}</button></div>` : '';
  $('#results').innerHTML = `
  ${trialBanner}
  ${profileHtml(input, c.utMs, c.lagna, P.Moon, { llHouse: P[SIGN_LORD[c.lagna.sign]].house, dasha: dashaFact })}
  <nav class="jump-nav" aria-label="${esc(t('nav.sections'))}" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:18px">${['highlights', 'charts', 'grahas', 'yogas', 'dasha', 'panchang', 'bhavas', 'gochar'].map(k => `<a class="tag" style="text-decoration:none;font-size:14px;padding:6px 12px" href="#${k}">${esc(t('nav.' + k))}</a>`).join('')}</nav>
  ${sec('highlights', 'hl', `<div class="card reveal" style="padding:16px 20px"><div class="balance"><span class="lbl g">${esc(t('sec.hl.nGood', { n: an.good.length }))}</span><div class="bar"><i style="width:${gp}%"></i></div><span class="lbl b">${esc(t('sec.hl.nBad', { n: an.bad.length }))}</span></div></div>
    <div class="hl-grid"><div class="card hl-col good"><h3><span class="badge">${ic('i-check')}</span>${esc(t('sec.hl.good'))}<small>${an.good.length}</small></h3><ul class="hl-list">${an.good.map(hlItem).join('') || `<li class="empty">${esc(t('sec.hl.noneGood'))}</li>`}</ul></div>
    <div class="card hl-col bad"><h3><span class="badge">${ic('i-alert')}</span>${esc(t('sec.hl.bad'))}<small>${an.bad.length}</small></h3><ul class="hl-list">${an.bad.map(hlItem).join('') || `<li class="empty">${esc(t('sec.hl.noneBad'))}</li>`}</ul></div></div>`)}
  ${sec('charts', 'charts', `<div class="charts drawing" id="chartsbox">${chartsHtml(c)}</div><div class="chart-key">${ORDER.map(p => `<span><b style="color:${COL[p]}">${esc(ga(p))}</b>${esc(gn(p))}</span>`).join('')}</div>`,
    `<div class="seg" role="group" aria-label="${esc(t('sec.charts.style'))}"><button type="button" data-style="north" aria-pressed="${chartStyle === 'north'}">${esc(t('sec.charts.north'))}</button><button type="button" data-style="south" aria-pressed="${chartStyle === 'south'}">${esc(t('sec.charts.south'))}</button></div>`)}
  ${sec('belt', 'belt', `<div class="card belt-card reveal">${drawBelt(c)}</div>`)}
  ${sec('grahas', 'grahas', `<div class="graha-grid">${grahaCards}</div>`)}
  ${sec('yogas', 'yogas', `<div class="yoga-grid" id="yogagrid">${ssCard}${yogaCards}</div>`,
    `<div class="seg yoga-filter" role="group" aria-label="${esc(t('sec.yogas.filter'))}">${['all', 'present', 'good', 'bad'].map((f, i) => `<button type="button" data-f="${f}" aria-pressed="${i === 0}">${esc(t('sec.yogas.' + f))}</button>`).join('')}</div>`,
    esc(t('sec.yogas.lede', { g: nGoodY, b: nBadY })))}
  ${sec('dasha', 'dasha', `${nowCard}<div class="card ribbon-card reveal">${drawRibbon(c, now)}</div><div class="dasha-list">${dashaList}</div>`, '',
    esc(t('sec.dasha.lede', { p: ((1 - c.balance.years / DASHA_YEARS[c.balance.lord]) * 100).toFixed(1), nk: { nk: P.Moon.nak }, v: ymd(c.balance.years), g: { g: c.balance.lord } })))}
  ${sec('panchang', 'pan', `<div class="pan-grid">${pan}</div><div class="card ava reveal"><h3>${esc(t('sec.pan.ava'))}</h3><dl class="ava-grid">${avRows.map(([k, v]) => `<div><dt>${esc(t('sec.pan.av.' + k))}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`)}
  ${sec('bhavas', 'bhava', `<div class="bhava-grid">${bhavas}</div>`)}
  ${sec('ashtaka', 'ashtaka', `<div class="card tbl-card reveal"><table><thead><tr><th>${esc(t('sec.ashtaka.graha'))}</th>${avHead}<th>${esc(t('sec.ashtaka.total'))}</th></tr></thead><tbody>${bavRows}${savRow}</tbody></table></div>
    <div class="legend"><span><i style="background:rgba(17,128,78,.5)"></i>${esc(t('sec.ashtaka.high'))}</span><span><i style="background:rgba(194,53,45,.4)"></i>${esc(t('sec.ashtaka.low'))}</span><span style="color:var(--gold-deep)">${esc(t('sec.ashtaka.lagnaCol'))}</span></div>`)}
  ${sec('gochar', 'gochar', `<div class="gochar-grid">${goc}</div>`, '', esc(t('sec.gochar.lede', { d: fDate(now, tz) })))}
  ${sec('method', 'method', `<div class="card method reveal"><p class="mono">UT ${fDate(c.utMs, 0)} ${fTime(c.utMs, 0)} · JD ${c.jd.toFixed(5)} · LST ${lst} · Lahiri ${dms(c.ayanamsa)} · Sayana Lagna ${dms(method.sayanaAsc)} · ${latStr(input.lat)}, ${lonStr(input.lon)}</p><p>${esc(t('sec.method.p1'))}</p><p>${esc(t('sec.method.p2'))}</p></div>`, '', '')}`;

  document.querySelectorAll('#charts .seg button').forEach(b => b.addEventListener('click', () => {
    chartStyle = b.dataset.style; try { localStorage.setItem('kg-style', chartStyle); } catch (e) { }
    document.querySelectorAll('#charts .seg button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.style === chartStyle)));
    const box = $('#chartsbox'); box.classList.remove('drawing'); box.innerHTML = chartsHtml(c); void box.offsetWidth; box.classList.add('drawing');
  }));
  document.querySelectorAll('.yoga-filter button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.yoga-filter button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.f;
    document.querySelectorAll('#yogagrid .yoga').forEach(el => { const on = el.classList.contains('on'), good = el.classList.contains('good'); el.hidden = f === 'present' ? !on : f === 'good' ? !(on && good) : f === 'bad' ? !(on && !good) : false; });
  }));
  requestAnimationFrame(() => { const fg = $('#ringfg'); if (fg) fg.style.strokeDashoffset = circ * (1 - progress); });
  observeReveals();
}

let io = null;
function observeReveals() {
  if (!('IntersectionObserver' in window)) return;
  if (io) io.disconnect();
  io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px 120px 0px' });
  document.querySelectorAll('.reveal, .graha, .bhava').forEach(el => io.observe(el));
}

// ---------- API ----------
let session = null, lastInput = null, isAdmin = false;
async function run(input, opts = {}) {
  lastInput = input;
  try { localStorage.setItem('kg-last', JSON.stringify({ input, place: chosen, offAuto })); } catch (e) { }
  const btn = $('#go'), label = btn.textContent;
  btn.setAttribute('aria-busy', 'true'); btn.innerHTML = `<span class="spin"></span>${esc(t('form.working'))}`;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (session) headers.Authorization = 'Bearer ' + session.access_token;
    const res = await fetch('/api/kundali', { method: 'POST', headers, body: JSON.stringify({ ...input, log: !!(opts.log && session), lang: LANG }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.trial) { try { localStorage.setItem('kg-trial', JSON.stringify(input)); } catch (e) { } }
    if (opts.log && !session) addLocalHistory(input, data);
    if (data.locked) renderPreview(data); else { renderFull(data); if (data.saved && !opts.silent) toast(t('saved.saved')); }
    if (opts.scroll) setTimeout(() => $('#results').scrollIntoView({ behavior: 'smooth' }), 80);
  } catch (e) {
    $('#err').textContent = t('err.server');
  } finally { btn.removeAttribute('aria-busy'); btn.textContent = label; }
}

$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const err = $('#err'); err.textContent = '';
  const date = $('#f-date').value, time = $('#f-time').value;
  if (!date) { err.textContent = t('err.date'); return; }
  if (!time) { err.textContent = t('err.time'); return; }
  if (!chosen && matches.length && fPlace.value.trim()) choose(matches[0]);
  const lat = parseFloat($('#f-lat').value), lon = parseFloat($('#f-lon').value);
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 89 || Math.abs(lon) > 180) { err.textContent = t('err.place'); $('#coords').open = true; return; }
  autoOffset();
  const off = parseOff($('#f-off').value);
  if (off === null) { err.textContent = t('err.offset'); $('#coords').open = true; return; }
  const [year, month, day] = date.split('-').map(Number), [hour, minute] = time.split(':').map(Number);
  const placeLabel = chosen ? `${chosen.name}, ${chosen.region}` : (fPlace.value.trim() || latStr(lat) + ', ' + lonStr(lon));
  run({ name: $('#f-name').value.trim(), year, month, day, hour, minute, lat, lon, tzMinutes: off, placeLabel }, { scroll: true, log: true });
});

function fill(input, place) {
  $('#f-name').value = input.name || '';
  $('#f-date').value = `${input.year}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`;
  $('#f-time').value = `${String(input.hour).padStart(2, '0')}:${String(input.minute).padStart(2, '0')}`;
  $('#f-lat').value = input.lat; $('#f-lon').value = input.lon; $('#f-off').value = offStr(input.tzMinutes);
  chosen = place || null; fPlace.value = input.placeLabel || ''; showMeta();
}

// ---------- Auth ----------
const modal = $('#modal');
function closeModal() { modal.innerHTML = ''; document.body.style.overflow = ''; }
function openModal(html, wide) {
  modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="box${wide === 'admin' ? ' admin' : wide ? ' wide' : ''}"><button class="x" type="button" aria-label="${esc(t('auth.close'))}">×</button>${html}</div></div>`;
  document.body.style.overflow = 'hidden';
  modal.querySelector('.x').onclick = closeModal;
  modal.querySelector('.modal').addEventListener('mousedown', e => { if (e.target.classList.contains('modal')) closeModal(); });
  const first = modal.querySelector('input'); if (first) first.focus();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.innerHTML) closeModal(); });
const GOOGLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"/></svg>';
const redirectTo = () => location.origin + location.pathname;

function authModal(mode) {
  if (!sb) { openModal(`<h2>${esc(t('auth.loginTitle'))}</h2><p class="muted">${esc(t('auth.unavailable'))}</p>`); return; }
  const signup = mode === 'signup';
  openModal(`<h2>${esc(t(signup ? 'auth.signupTitle' : 'auth.loginTitle'))}</h2><p class="muted">${esc(t('gate.free'))}</p>
    <button type="button" class="btn-line google" id="g-btn">${GOOGLE}${esc(t('auth.google'))}</button>
    <p class="or">${esc(t('auth.or'))}</p>
    <form id="authform" novalidate>
      ${signup ? `<div class="field"><label for="a-name">${esc(t('auth.nameField'))}</label><input id="a-name" type="text" autocomplete="name"></div>` : ''}
      <div class="field"><label for="a-email">${esc(t('auth.email'))}</label><input id="a-email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="a-pass">${esc(t('auth.password'))}</label><input id="a-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required>${signup ? `<span class="place-meta">${esc(t('auth.passwordHint'))}</span>` : ''}</div>
      <p class="err" id="a-err" role="alert"></p>
      <button class="btn-cta go" type="submit">${esc(t(signup ? 'auth.signup' : 'auth.login'))}</button>
    </form>
    <div class="links">${signup ? `<span>${esc(t('auth.haveAccount'))} <button class="linkbtn" type="button" data-auth="login">${esc(t('auth.toLogin'))}</button></span>` : `<button class="linkbtn" type="button" id="forgot">${esc(t('auth.forgot'))}</button><span>${esc(t('auth.noAccount'))} <button class="linkbtn" type="button" data-auth="signup">${esc(t('auth.toSignup'))}</button></span>`}</div>`);
  $('#g-btn').onclick = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
  const fp = $('#forgot');
  if (fp) fp.onclick = async () => {
    const email = $('#a-email').value.trim(), er = $('#a-err');
    if (!email) { er.textContent = t('auth.needEmail'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
    er.className = error ? 'err' : 'ok'; er.textContent = error ? error.message : t('auth.resetSent', { email });
  };
  $('#authform').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#a-email').value.trim(), password = $('#a-pass').value, er = $('#a-err'), btn = e.target.querySelector('button[type=submit]');
    er.className = 'err'; er.textContent = '';
    if (!email || password.length < 6) { er.textContent = t('auth.invalid'); return; }
    btn.setAttribute('aria-busy', 'true');
    if (signup) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: ($('#a-name').value || '').trim(), lang: LANG }, emailRedirectTo: redirectTo() } });
      btn.removeAttribute('aria-busy');
      if (error) { er.textContent = error.message; return; }
      if (!data.session) {
        er.className = 'ok'; er.textContent = t('auth.checkEmail', { email });
        const again = document.createElement('button'); again.type = 'button'; again.className = 'linkbtn'; again.style.display = 'block'; again.style.marginTop = '6px';
        again.textContent = t('auth.resend'); again.onclick = () => resend(email, er); er.after(again); return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      btn.removeAttribute('aria-busy');
      if (error) { er.textContent = error.message; return; }
    }
    closeModal();
  });
}
function newPasswordModal() {
  openModal(`<h2>${esc(t('auth.newPassTitle'))}</h2><form id="npform" novalidate><div class="field"><label for="np">${esc(t('auth.newPass'))}</label><input id="np" type="password" autocomplete="new-password" minlength="6"></div><p class="err" id="np-err"></p><button class="btn-cta go" type="submit">${esc(t('auth.savePass'))}</button></form>`);
  $('#npform').addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: $('#np').value });
    if (error) { $('#np-err').textContent = error.message; return; }
    closeModal(); toast(t('auth.passSaved'));
  });
}

async function savedModal() {
  openModal(`<h2>${esc(t('saved.title'))}</h2><ul class="saved-list" id="savedlist"><li><span class="spin"></span></li></ul>`, true);
  const { data, error } = await sb.from('kundalis').select('id,name,birth,created_at').eq('user_id', session.user.id).order('updated_at', { ascending: false }).limit(100);
  const list = $('#savedlist'); if (!list) return;
  if (error || !data.length) { list.innerHTML = `<li><span>${esc(error ? error.message : t('saved.empty'))}</span></li>`; return; }
  list.innerHTML = data.map(row => { const b = row.birth; return `<li data-id="${row.id}"><span class="rgic">${esc((b.name || '?').trim().charAt(0).toUpperCase() || '?')}</span><div><b>${esc(b.name || t('res.defaultName'))}</b><span>${b.day}/${b.month}/${b.year} · ${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')} · ${esc(b.placeLabel || '')}</span></div><button class="btn-line" type="button" data-open>${esc(t('saved.open'))}</button><button class="del" type="button" data-del>${esc(t('saved.delete'))}</button></li>`; }).join('');
  list.addEventListener('click', async e => {
    const li = e.target.closest('li[data-id]'); if (!li) return;
    const row = data.find(r => r.id === li.dataset.id);
    if (e.target.closest('[data-open]')) { closeModal(); fill(row.birth, null); run(row.birth, { scroll: true, silent: true }); }
    if (e.target.closest('[data-del]')) { const { error } = await sb.from('kundalis').delete().eq('id', row.id); if (!error) { li.remove(); toast(t('saved.deleted')); } }
  });
}

// ---------- History: every Kundali entered ----------
// Logged out: kept in this browser (kg-history). Logged in: Supabase table kundali_history.
const HKEY = 'kg-history', HMAX = 100;
const readLocal = () => { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } };
const writeLocal = list => { try { localStorage.setItem(HKEY, JSON.stringify(list.slice(0, HMAX))); } catch (e) { } };
function summaryOf(data) {
  if (data.preview) return { lagna: data.preview.lagna.sign, moon: data.preview.moon.sign, nak: data.preview.moon.nak, pada: data.preview.moon.pada };
  if (data.chart) { const m = data.chart.planets.find(p => p.name === 'Moon'); return { lagna: data.chart.lagna.sign, moon: m.sign, nak: m.nak, pada: m.pada }; }
  return null;
}
function addLocalHistory(input, data) {
  const { log, lang, save, ...birth } = input;
  const list = readLocal();
  list.unshift({ id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: birth.name || null, birth, summary: summaryOf(data), lang: LANG, created_at: new Date().toISOString(), locked: !!data.locked });
  writeLocal(list);
}
async function moveLocalHistory(s) {
  const list = readLocal();
  if (!list.length || !s) return;
  const rows = list.map(h => ({ user_id: s.user.id, name: h.name, birth: h.birth, summary: h.summary, lang: h.lang, source: 'session', created_at: h.created_at }));
  const { error } = await sb.from('kundali_history').insert(rows);
  if (!error) { try { localStorage.removeItem(HKEY); } catch (e) { } }
}
async function loadHistory() {
  if (!session) return { rows: readLocal(), local: true };
  const { data, error } = await sb.from('kundali_history').select('id,name,birth,summary,lang,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(500);
  return { rows: data || [], local: false, error };
}
const histWhen = v => new Date(v).toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const histBirth = b => `${String(b.day).padStart(2, '0')}/${String(b.month).padStart(2, '0')}/${b.year} · ${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}`;
const histSum = sm => sm ? `${t('res.lagnaShort', { r: { r: sm.lagna } })} · ${t('res.rashiShort', { r: { r: sm.moon } })} · ${nk(sm.nak)}` : '';
async function historyModal() {
  openModal(`<h2>${esc(t('history.title'))}</h2><p class="muted" id="h-note"></p>
    <div class="field" style="margin-top:12px"><input id="h-q" type="search" placeholder="${esc(t('history.search'))}" aria-label="${esc(t('history.search'))}"></div>
    <ul class="saved-list hist-list" id="h-list"><li><span class="spin"></span></li></ul>
    <div class="links"><span id="h-count"></span><button class="linkbtn" type="button" id="h-clear">${esc(t('history.clear'))}</button></div>`, true);
  const { rows, local, error } = await loadHistory();
  const list = $('#h-list'); if (!list) return;
  $('#h-note').innerHTML = local ? `${esc(t('history.localNote'))} <button class="linkbtn" type="button" data-auth="signup">${esc(t('trial.cta'))}</button>` : esc(t('history.accountNote'));
  let items = rows;
  const draw = () => {
    const q = ($('#h-q').value || '').trim().toLowerCase();
    const shown = items.filter(h => !q || [h.name, h.birth.placeLabel, histBirth(h.birth)].join(' ').toLowerCase().includes(q));
    $('#h-count').textContent = t('history.count', { n: items.length });
    $('#h-clear').hidden = !items.length;
    if (error) { list.innerHTML = `<li><span>${esc(error.message)}</span></li>`; return; }
    list.innerHTML = shown.map(h => `<li data-id="${esc(h.id)}"><span class="rgic">${esc(((h.name || '?').trim().charAt(0) || '?').toUpperCase())}</span>
      <div><b>${esc(h.name || t('res.defaultName'))}</b><span>${esc(histBirth(h.birth))} · ${esc(h.birth.placeLabel || '')}</span><span class="hs">${esc(histSum(h.summary))}</span><span class="hw">${ic('i-clock')}${esc(histWhen(h.created_at))}${h.locked ? ` · <em>${esc(t('history.locked'))}</em>` : ''}</span></div>
      <button class="btn-line" type="button" data-open>${esc(t('saved.open'))}</button><button class="del" type="button" data-del aria-label="${esc(t('saved.delete'))}">${esc(t('saved.delete'))}</button></li>`).join('') || `<li><span>${esc(t(items.length ? 'history.noMatch' : 'history.empty'))}</span></li>`;
  };
  $('#h-q').addEventListener('input', draw);
  list.addEventListener('click', async e => {
    const li = e.target.closest('li[data-id]'); if (!li) return;
    const h = items.find(x => String(x.id) === li.dataset.id);
    if (e.target.closest('[data-open]')) { closeModal(); fill(h.birth, null); run(h.birth, { scroll: true, silent: true }); }
    if (e.target.closest('[data-del]')) {
      if (local) { items = items.filter(x => x !== h); writeLocal(items); }
      else { const { error: er } = await sb.from('kundali_history').delete().eq('id', h.id); if (er) return; items = items.filter(x => x !== h); }
      draw();
    }
  });
  const clr = $('#h-clear');
  clr.addEventListener('click', async () => {
    if (!clr.dataset.sure) { clr.dataset.sure = '1'; clr.textContent = t('history.clearSure'); return; }
    if (local) writeLocal([]);
    else { const { error: er } = await sb.from('kundali_history').delete().eq('user_id', session.user.id); if (er) return; }
    items = []; clr.removeAttribute('data-sure'); clr.textContent = t('history.clear'); draw();
  });
  draw();
}
$('#histbtn').addEventListener('click', historyModal);

// The free chart made before signing up is copied into the new account once.
async function saveTrialChart(s) {
  let trial = null;
  try { trial = JSON.parse(localStorage.getItem('kg-trial') || 'null'); localStorage.removeItem('kg-trial'); } catch (e) { }
  if (!trial || !s) return;
  try { await fetch('/api/kundali', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify(trial) }); } catch (e) { }
}

// ---------- Admin panel (users listed in public.admins) ----------
async function checkAdmin() {
  isAdmin = false;
  if (!sb || !session) return;
  try { const { data, error } = await sb.rpc('is_admin'); isAdmin = !error && data === true; } catch (e) { }
}
const fmtTs = v => v ? new Date(v).toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
async function adminModal() {
  openModal(`<h2>${esc(t('admin.title'))}</h2><p class="muted">${esc(t('admin.lede'))}</p>
    <div class="admin-stats" id="ad-stats"><span class="spin"></span></div>
    <div class="seg" role="group" style="margin:16px 0 10px" id="ad-tabs"><button type="button" data-tab="users" aria-pressed="true">${esc(t('admin.users'))}</button><button type="button" data-tab="charts" aria-pressed="false">${esc(t('admin.charts'))}</button><button type="button" data-tab="history" aria-pressed="false">${esc(t('admin.history'))}</button></div>
    <div class="field" style="margin-bottom:10px"><input id="ad-q" type="search" placeholder="${esc(t('admin.search'))}" aria-label="${esc(t('admin.search'))}"></div>
    <div id="ad-body" class="admin-body"></div>`, 'admin');
  const [u, k, hs] = await Promise.all([
    sb.rpc('admin_users'),
    sb.from('kundalis').select('id,user_id,name,birth,created_at,updated_at').order('updated_at', { ascending: false }).limit(1000),
    sb.from('kundali_history').select('id,user_id,name,birth,summary,lang,source,created_at').order('created_at', { ascending: false }).limit(2000)
  ]);
  const history = hs.error ? [] : (hs.data || []);
  const body = $('#ad-body'); if (!body) return;
  if (u.error || k.error) { $('#ad-stats').innerHTML = ''; body.innerHTML = `<p class="err">${esc((u.error || k.error).message)}</p>`; return; }
  const users = u.data || [], charts = k.data || [], byId = Object.fromEntries(users.map(x => [x.id, x]));
  const weekAgo = Date.now() - 7 * 864e5;
  const stat = (n, l) => `<div><b>${n}</b><span>${esc(l)}</span></div>`;
  $('#ad-stats').innerHTML = stat(users.length, t('admin.sUsers')) + stat(users.filter(x => x.confirmed).length, t('admin.sConfirmed')) + stat(charts.length, t('admin.sCharts')) + stat(users.filter(x => new Date(x.created_at) > weekAgo).length, t('admin.sNew')) + stat(history.length, t('admin.sHistory'));
  let tab = 'users';
  const draw = () => {
    const q = ($('#ad-q').value || '').trim().toLowerCase();
    if (tab === 'history') {
      const rows = history.filter(h => { const ow = byId[h.user_id]; return !q || [h.name, h.birth.placeLabel, ow && ow.email].join(' ').toLowerCase().includes(q); });
      body.innerHTML = `<div class="tbl-card card"><table><thead><tr><th>${esc(t('admin.when'))}</th><th>${esc(t('admin.email'))}</th><th>${esc(t('admin.name'))}</th><th>${esc(t('admin.birth'))}</th><th>${esc(t('admin.place'))}</th><th>${esc(t('admin.result'))}</th><th>${esc(t('admin.lang'))}</th></tr></thead><tbody>${rows.map(h => { const ow = byId[h.user_id]; return `<tr><td class="num">${fmtTs(h.created_at)}</td><td>${esc(ow ? ow.email : '')}</td><td>${esc(h.name || '—')}</td><td class="num">${esc(histBirth(h.birth))}</td><td>${esc(h.birth.placeLabel || '')}</td><td>${esc(histSum(h.summary))}</td><td>${esc(h.lang || '')}${h.source === 'session' ? ' · ' + esc(t('admin.fromSession')) : ''}</td></tr>`; }).join('') || `<tr><td colspan="7">${esc(t(hs.error ? 'admin.historyMissing' : 'admin.none'))}</td></tr>`}</tbody></table></div>`;
    } else if (tab === 'users') {
      const rows = users.filter(x => !q || (x.email + ' ' + (x.full_name || '')).toLowerCase().includes(q));
      body.innerHTML = `<div class="tbl-card card"><table><thead><tr><th>${esc(t('admin.email'))}</th><th>${esc(t('admin.name'))}</th><th>${esc(t('admin.status'))}</th><th>${esc(t('admin.joined'))}</th><th>${esc(t('admin.lastLogin'))}</th><th>${esc(t('admin.sCharts'))}</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.email)}</td><td>${esc(x.full_name || '—')}</td><td><span class="tag ${x.confirmed ? 'good' : 'warn'}">${esc(t(x.confirmed ? 'admin.confirmed' : 'admin.pending'))}</span></td><td class="num">${fmtTs(x.created_at)}</td><td class="num">${fmtTs(x.last_sign_in_at)}</td><td class="num">${x.charts}</td></tr>`).join('') || `<tr><td colspan="6">${esc(t('admin.none'))}</td></tr>`}</tbody></table></div>`;
    } else {
      const rows = charts.filter(r => { const b = r.birth || {}, ow = byId[r.user_id]; return !q || [b.name, b.placeLabel, ow && ow.email].join(' ').toLowerCase().includes(q); });
      body.innerHTML = `<ul class="saved-list">${rows.map(r => { const b = r.birth || {}, ow = byId[r.user_id]; return `<li data-id="${r.id}"><span class="rgic">${esc((b.name || '?').trim().charAt(0).toUpperCase() || '?')}</span><div><b>${esc(b.name || t('res.defaultName'))}</b><span>${b.day}/${b.month}/${b.year} · ${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')} · ${esc(b.placeLabel || '')}</span><span style="display:block">${esc(ow ? ow.email : '')} · ${fmtTs(r.updated_at)}</span></div><button class="btn-line" type="button" data-open>${esc(t('saved.open'))}</button></li>`; }).join('') || `<li><span>${esc(t('admin.none'))}</span></li>`}</ul>`;
    }
  };
  $('#ad-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; $('#ad-tabs').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
  $('#ad-q').addEventListener('input', draw);
  body.addEventListener('click', e => {
    const li = e.target.closest('li[data-id]'); if (!li || !e.target.closest('[data-open]')) return;
    const row = charts.find(r => r.id === li.dataset.id);
    closeModal(); fill(row.birth, null); run({ ...row.birth, save: false }, { scroll: true, silent: true });
  });
  draw();
}

// Email links come back as #error=…&error_code=otp_expired when the link was used already or is too old.
function readAuthError() {
  const h = new URLSearchParams(INITIAL_HASH.slice(1)), q = new URLSearchParams(INITIAL_SEARCH);
  const err = h.get('error') || q.get('error'), code = h.get('error_code') || q.get('error_code');
  if (!err && !code) return null;
  history.replaceState(null, '', location.pathname);
  return { code: code || err };
}
async function resend(email, er) {
  const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectTo() } });
  er.className = error ? 'err' : 'ok';
  er.textContent = error ? error.message : t('auth.resent', { email });
}
function linkErrorModal(info) {
  openModal(`<h2>${esc(t('auth.linkTitle'))}</h2><p class="muted">${esc(t(info.code === 'otp_expired' ? 'auth.linkExpired' : 'auth.linkError'))}</p>
    <form id="rsform" novalidate><div class="field"><label for="rs-email">${esc(t('auth.email'))}</label><input id="rs-email" type="email" autocomplete="email"></div>
    <p class="err" id="rs-err" role="alert"></p><button class="btn-cta go" type="submit">${esc(t('auth.resend'))}</button></form>
    <div class="links"><span>${esc(t('auth.haveAccount'))} <button class="linkbtn" type="button" data-auth="login">${esc(t('auth.toLogin'))}</button></span></div>`);
  $('#rsform').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#rs-email').value.trim(), er = $('#rs-err');
    if (!email) { er.className = 'err'; er.textContent = t('auth.needEmail'); return; }
    await resend(email, er);
  });
}

function renderAuthSlot() {
  const slot = $('#authslot');
  if (!session) { slot.innerHTML = `<button class="btn-line" type="button" data-auth="login">${esc(t('nav.login'))}</button>`; return; }
  const u = session.user, nm = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email;
  slot.innerHTML = `<span class="user"><button type="button" id="userbtn" aria-haspopup="true" aria-expanded="false"><span class="av">${esc(String(nm).charAt(0).toUpperCase())}</span><span class="nm">${esc(nm)}</span></button>
    <div class="menu" id="usermenu" hidden><div class="who">${esc(u.email || '')}</div><button type="button" data-menu="saved">${ic('i-cal')}${esc(t('nav.myCharts'))}</button>${isAdmin ? `<button type="button" data-menu="admin">${ic('i-shield')}${esc(t('admin.title'))}</button>` : ''}<button type="button" data-menu="logout">${ic('i-logout')}${esc(t('nav.logout'))}</button></div></span>`;
  const btn = $('#userbtn'), menu = $('#usermenu');
  btn.onclick = () => { menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); };
  document.addEventListener('click', e => { if (!e.target.closest('.user')) menu.hidden = true; });
  menu.onclick = async e => {
    const m = e.target.closest('[data-menu]'); if (!m) return; menu.hidden = true;
    if (m.dataset.menu === 'saved') savedModal();
    if (m.dataset.menu === 'admin') adminModal();
    if (m.dataset.menu === 'logout') { await sb.auth.signOut(); }
  };
}
document.addEventListener('click', e => { const a = e.target.closest('[data-auth]'); if (a) authModal(a.dataset.auth); });

// ---------- Start ----------
drawWheel(null);
let saved = null;
try { saved = JSON.parse(localStorage.getItem('kg-last') || 'null'); } catch (e) { }
if (saved && saved.input) { fill(saved.input, saved.place); offAuto = saved.offAuto !== false; }

(async () => {
  if (sb) {
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (session && /type=(signup|magiclink|email)/.test(INITIAL_HASH)) setTimeout(() => toast(t('auth.confirmed')), 300);
    sb.auth.onAuthStateChange((event, s) => {
      const was = !!session; session = s; renderAuthSlot(); checkAdmin().then(renderAuthSlot);
      if (event === 'PASSWORD_RECOVERY') newPasswordModal();
      if (event === 'SIGNED_IN' && !was) { saveTrialChart(s); moveLocalHistory(s); }
      if (event === 'SIGNED_IN' && !was && lastInput) { closeModal(); run(lastInput, { silent: false }); }
      if (event === 'SIGNED_OUT' && lastInput) run(lastInput, { silent: true });
    });
  }
  await checkAdmin();
  renderAuthSlot();
  const linkErr = readAuthError();
  if (linkErr && sb) linkErrorModal(linkErr);
  if (saved && saved.input) run(saved.input, { silent: true });
})();
})();
