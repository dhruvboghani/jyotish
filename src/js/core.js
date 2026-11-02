/* Grahavani — shared browser code used by every page: i18n, formatting, icons, Supabase login,
   account menu, history, saved charts, admin panel, place picker and mobile navigation.
   build.js concatenates core.js + the page's own scripts inside one function scope. */
const L = window.I18N, LANG = L.meta.code, LOCALE = L.meta.locale, HOME = L.meta.path;
const cfg = window.KG_CONFIG || {};
const INITIAL_HASH = location.hash, INITIAL_SEARCH = location.search;
const sb = cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const PLACES = window.PLACES || [];
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const GOCHAR_GOOD = { Sun: [3, 6, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [3, 6, 11], Mercury: [2, 4, 6, 8, 10, 11], Jupiter: [2, 5, 7, 9, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 11, 12], Saturn: [3, 6, 11], Rahu: [3, 6, 11], Ketu: [3, 6, 11] };
const COL = { Sun: '#C25A0E', Moon: '#56627E', Mars: '#C2311F', Mercury: '#1C7E4B', Jupiter: '#9A6F00', Venus: '#B83C74', Saturn: '#2B47B8', Rahu: '#3E4559', Ketu: '#7A4A2C' };
const DEFAULT_PLACE = { name: 'New Delhi', region: 'Delhi, India', lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata' };

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
const pad = n => String(n).padStart(2, '0');
const dm = x => { let d = Math.floor(x), m = Math.round((x - d) * 60); if (m === 60) { d++; m = 0; } return `${d}°${pad(m)}′`; };
const dms = x => { const d = Math.floor(x), mf = (x - d) * 60, m = Math.floor(mf), s = Math.floor((mf - m) * 60); return `${d}°${pad(m)}′${pad(s)}″`; };
const offStr = min => { const s = min < 0 ? '−' : '+', a = Math.abs(min); return `${s}${pad(Math.floor(a / 60))}:${pad(Math.round(a % 60))}`; };
const parseOff = s => { const m = String(s).trim().replace('−', '-').match(/^(?:UTC|GMT)?\s*([+-])?\s*(\d{1,2})(?::?(\d{2}))?$/i); if (!m) return null; const v = (+m[2]) * 60 + (+(m[3] || 0)); return m[1] === '-' ? -v : v; };
const mkFmt = o => { try { return new Intl.DateTimeFormat(LOCALE, { ...o, timeZone: 'UTC' }); } catch (e) { return new Intl.DateTimeFormat('en-IN', { ...o, timeZone: 'UTC' }); } };
const dateFmt = mkFmt({ day: 'numeric', month: 'short', year: 'numeric' }), longDateFmt = mkFmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const dayMonthFmt = mkFmt({ day: 'numeric', month: 'short' }), monthFmt = mkFmt({ month: 'long', year: 'numeric' }), weekdayFmt = mkFmt({ weekday: 'short' });
const fDate = (ms, tz) => dateFmt.format(new Date(ms + tz * 60000));
const fTime = (ms, tz) => { const d = new Date(ms + tz * 60000); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const isoDay = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const jdMs = jd => (jd - 2440587.5) * 86400000;
const ymd = yrs => { const y = Math.floor(yrs), mf = (yrs - y) * 12, m = Math.floor(mf), d = Math.round((mf - m) * 30.4375); return t('sec.dasha.ymd', { y, m, d }); };
const latStr = v => `${Math.abs(v).toFixed(4)}°${v >= 0 ? 'N' : 'S'}`, lonStr = v => `${Math.abs(v).toFixed(4)}°${v >= 0 ? 'E' : 'W'}`;
const g = (name, cls = 'gimg') => `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true"><use href="#gr-${name}"/></svg>`;
const rg = (s, cls = 'rg') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${s}"/></svg>`;
const ic = (id, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#${id}"/></svg>`;
const starRow = n => `<span class="stars" aria-label="${n}/5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
const syllables = (n, pada) => L.names.syll[n].map((s, i) => i === pada - 1 ? `<b style="color:var(--gold-deep)">${esc(s)}</b>` : esc(s)).join(', ');
function toast(text) { const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = text; document.body.appendChild(el); setTimeout(() => el.remove(), 2800); }
const store = { get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };

function tzOffsetMinutes(tz, y, mo, d, h, mi) {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const offAt = ms => { const p = {}; for (const x of fmt.formatToParts(new Date(ms))) p[x.type] = x.value; return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms) / 60000; };
  const guess = Date.UTC(y, mo - 1, d, h, mi); let off = offAt(guess); off = offAt(guess - off * 60000); return off;
}
// "today" in a given offset
function todayIn(tz) { const d = new Date(Date.now() + tz * 60000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; }

// ---------- Header: language, mobile menu ----------
const langSel = $('#lang');
if (langSel) langSel.addEventListener('change', () => { store.set('kg-lang', langSel.value); track('lang_change', { to: langSel.value }); ACT.flush(); location.href = langSel.selectedOptions[0].dataset.href + (location.search || '') + (location.hash || ''); });
const navBtn = $('#navbtn'), drawer = $('#drawer');
if (navBtn && drawer) {
  const setOpen = o => { drawer.hidden = !o; navBtn.setAttribute('aria-expanded', String(o)); document.body.classList.toggle('nav-open', o); };
  navBtn.addEventListener('click', () => setOpen(drawer.hidden));
  drawer.addEventListener('click', e => { if (e.target === drawer || e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) setOpen(false); });
}

// Header fit: drop icons and labels first, then move the menu into the drawer — never a scrolling menu.
function fitHeader() {
  const bar = $('.topbar .wrap'), nav = $('.topnav'); if (!bar || !nav) return;
  const cls = document.body.classList;
  const over = () => bar.scrollWidth > bar.clientWidth + 1 || nav.scrollWidth > nav.clientWidth + 1 || [...bar.children].reduce((w, el) => w + (el.offsetParent ? el.getBoundingClientRect().width : 0), 0) > bar.clientWidth - 24;
  cls.remove('nav-tight', 'nav-collapsed');
  if (innerWidth <= 980) { cls.add('nav-collapsed'); return; }
  if (over()) cls.add('nav-tight');
  if (over()) cls.add('nav-collapsed');
}
let fitT = null;
addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitHeader, 80); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeader);
fitHeader();

// ---------- Place picker (reusable) ----------
// ids: { input, suggest, meta, lat?, lon?, off?, date?, time?, err?, online? } ; onPick(place)
function placePicker(ids, onPick) {
  const el = k => ids[k] ? document.getElementById(ids[k]) : null;
  const input = el('input'), sug = el('suggest'), meta = el('meta');
  const st = { chosen: null, offAuto: true, matches: [], active: -1 };
  const showMeta = () => { if (meta) meta.innerHTML = st.chosen ? `<b>✓ ${esc(st.chosen.name)}</b> · ${latStr(st.chosen.lat)}, ${lonStr(st.chosen.lon)}${st.chosen.tz ? ' · ' + esc(st.chosen.tz) : ''}` : ''; };
  const autoOffset = () => {
    const off = el('off'); if (!off || !st.chosen || !st.chosen.tz || !st.offAuto) return;
    const [y, mo, d] = ((el('date') && el('date').value) || '2000-01-01').split('-').map(Number), [h, mi] = ((el('time') && el('time').value) || '12:00').split(':').map(Number);
    try { off.value = offStr(tzOffsetMinutes(st.chosen.tz, y, mo, d, h, mi)); } catch (e) { }
  };
  const close = () => { sug.hidden = true; input.setAttribute('aria-expanded', 'false'); st.active = -1; };
  const render = () => { sug.innerHTML = st.matches.map((p, i) => `<li role="option" aria-selected="${i === st.active}" data-i="${i}">${esc(p.name)}<small>${esc(p.region)}</small></li>`).join(''); sug.hidden = !st.matches.length; input.setAttribute('aria-expanded', String(!!st.matches.length)); };
  const choose = p => { try { track('place_pick', { q: (input.value || '').slice(0, 80), place: `${p.name}, ${p.region}`, field: ids.input }); } catch (e) { } st.chosen = p; input.value = `${p.name}, ${p.region}`; if (el('lat')) el('lat').value = p.lat; if (el('lon')) el('lon').value = p.lon; st.offAuto = true; autoOffset(); showMeta(); close(); if (onPick) onPick(p); };
  input.addEventListener('input', () => {
    st.chosen = null; showMeta();
    const q = input.value.trim().toLowerCase().split(',')[0].trim();
    if (q.length < 2) { st.matches = []; render(); return; }
    const starts = PLACES.filter(p => p.name.toLowerCase().startsWith(q)), has = PLACES.filter(p => !starts.includes(p) && (p.name + ' ' + p.region).toLowerCase().includes(q));
    st.matches = [...starts, ...has].slice(0, 8); st.active = st.matches.length ? 0 : -1; render();
  });
  input.addEventListener('keydown', e => {
    if (sug.hidden) return;
    if (e.key === 'ArrowDown') { st.active = Math.min(st.matches.length - 1, st.active + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { st.active = Math.max(0, st.active - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter' && st.active >= 0) { choose(st.matches[st.active]); e.preventDefault(); }
    else if (e.key === 'Escape') close();
  });
  sug.addEventListener('mousedown', e => { const li = e.target.closest('li'); if (li) { e.preventDefault(); choose(st.matches[+li.dataset.i]); } });
  input.addEventListener('blur', () => setTimeout(close, 120));
  if (el('date')) el('date').addEventListener('change', autoOffset);
  if (el('time')) el('time').addEventListener('change', autoOffset);
  if (el('off')) el('off').addEventListener('input', () => { st.offAuto = false; });
  ['lat', 'lon'].forEach(k => { if (el(k)) el(k).addEventListener('input', () => { if (st.chosen) { st.chosen = { ...st.chosen, lat: +el('lat').value, lon: +el('lon').value }; showMeta(); } }); });
  if (el('online')) el('online').addEventListener('click', async () => {
    const q = input.value.trim().split(',')[0], err = el('err') || { textContent: '' };
    if (!q) { err.textContent = t('err.typeFirst'); return; }
    err.textContent = t('err.looking');
    try {
      const res = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=8&language=' + (LANG === 'en' ? 'en' : LANG) + '&name=' + encodeURIComponent(q));
      const js = await res.json();
      if (!js.results || !js.results.length) { err.textContent = t('err.notFound', { q }); return; }
      st.matches = js.results.map(r => ({ name: r.name, region: [r.admin1, r.country].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude, tz: r.timezone }));
      st.active = 0; render(); err.textContent = ''; input.focus();
    } catch (e) { err.textContent = t('err.lookupFail'); }
  });
  return {
    get chosen() { return st.chosen; }, get offAuto() { return st.offAuto; }, set offAuto(v) { st.offAuto = v; }, get matches() { return st.matches; },
    choose, autoOffset, showMeta,
    set(place, label) { st.chosen = place || null; input.value = label != null ? label : place ? `${place.name}, ${place.region}` : ''; showMeta(); },
    pickFirst() { if (!st.chosen && st.matches.length && input.value.trim()) choose(st.matches[0]); }
  };
}

// ---------- Modal ----------
const modal = $('#modal');
function closeModal() { modal.innerHTML = ''; document.body.style.overflow = ''; }
function openModal(html, wide) {
  modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="box${wide === 'admin' ? ' admin' : wide ? ' wide' : ''}"><button class="x" type="button" aria-label="${esc(t('auth.close'))}">×</button>${html}</div></div>`;
  document.body.style.overflow = 'hidden';
  modal.querySelector('.x').onclick = closeModal;
  modal.querySelector('.modal').addEventListener('mousedown', e => { if (e.target.classList.contains('modal')) closeModal(); });
  const first = modal.querySelector('input'); if (first) first.focus();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal && modal.innerHTML) closeModal(); });

// ---------- Session ----------
let session = null, isAdmin = false, isSuper = false;
const authHooks = [];           // page code: authHooks.push((event, session, wasLoggedIn) => …)
const readyHooks = [];          // page code: readyHooks.push(session => …) runs once after the session is known
const authHeaders = () => session ? { Authorization: 'Bearer ' + session.access_token } : {};
// In the Android app (window.GV_APP, see mobile/src/app-bridge.js) pages are local files, so API calls go to
// KG_CONFIG.apiBase; with no connection, window.GV_OFFLINE runs the same calculations on the phone.
const APP = window.GV_APP || null, API_BASE = (window.KG_CONFIG && window.KG_CONFIG.apiBase) || '';
const apiUrl = path => API_BASE + path;
const SITE_ORIGIN = API_BASE || location.origin; // public address for links people share
let offlineToastShown = false;
async function offlineApi(path, opts) {
  const out = await window.GV_OFFLINE.handle(path, { method: opts.method || 'GET', body: opts.body, headers: { ...authHeaders(), 'X-KG-Free': store.get('kg-free-token') || '' } });
  if (!out) { const err = new Error(t('app.needNet')); err.status = 503; err.data = { error: t('app.needNet') }; throw err; }
  if (out.trialToken) store.set('kg-free-token', out.trialToken);
  if (!offlineToastShown) { offlineToastShown = true; toast(t('app.offline')); }
  if (out.status >= 400) { const err = new Error((out.data && out.data.error) || 'HTTP ' + out.status); err.status = out.status; err.data = out.data; throw err; }
  return out.data;
}
async function api(path, opts = {}) {
  const t0 = performance.now();
  try { const out = await apiRaw(path, opts); trackApi(path, opts, performance.now() - t0, 200, APP && navigator.onLine === false); return out; }
  catch (e) { trackApi(path, opts, performance.now() - t0, e.status || 0); throw e; }
}
async function apiRaw(path, opts = {}) {
  const canOffline = APP && window.GV_OFFLINE;
  if (canOffline && navigator.onLine === false) return offlineApi(path, opts);
  const trial = APP ? store.get('kg-free-token') : null;
  let res;
  try { res = await fetch(apiUrl(path), { ...opts, headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(trial ? { 'X-KG-Free': trial } : {}), ...(opts.headers || {}) } }); }
  catch (e) { if (canOffline) return offlineApi(path, opts); throw e; }
  if (APP) { const tk = res.headers.get('X-KG-Free'); if (tk) store.set('kg-free-token', tk); }
  let data = null; try { data = await res.json(); } catch (e) { }
  if (!res.ok) { const err = new Error((data && data.error) || 'HTTP ' + res.status); err.status = res.status; err.data = data; throw err; }
  return data;
}
// ---------- Activity log (stored in Supabase through /api/log; read only by the super admin) ----------
const ACT = (() => {
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 36);
  let visitor = store.get('kg-vid'); if (!visitor) { visitor = rid(); store.set('kg-vid', visitor); }
  let tab = null; try { tab = sessionStorage.getItem('kg-sid'); if (!tab) { tab = rid(); sessionStorage.setItem('kg-sid', tab); } } catch (e) { tab = rid(); }
  const ua = navigator.userAgent || '';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const device = `${os} · ${APP ? 'App' : br} · ${/Mobi|Android|iPhone/.test(ua) ? 'mobile' : 'desktop'}`;
  const page = () => location.pathname.replace(/index\.html$/, '') + (location.search || '');
  const ref = (() => { try { const r = document.referrer && new URL(document.referrer); return r && r.host !== location.host ? r.host + r.pathname.slice(0, 60) : null; } catch (e) { return null; } })();
  let queue = [], timer = null, errs = 0;
  const send = (beacon) => {
    clearTimeout(timer); timer = null;
    if (!queue.length) return;
    const payload = JSON.stringify({ events: queue.splice(0, 25), token: session ? session.access_token : null });
    const url = apiUrl('/api/log/');
    try {
      if (beacon && navigator.sendBeacon && navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain' }))) { if (queue.length) send(beacon); return; }
      fetch(url, { method: 'POST', body: payload, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => { });
    } catch (e) { }
    if (queue.length) send(beacon);
  };
  const track = (event, detail) => {
    if (navigator.webdriver) return; // automated browsers
    queue.push({ event, detail: detail || undefined, page: page(), lang: LANG, platform: APP ? 'app' : 'web', device, visitor, session: tab, referrer: ref });
    if (queue.length >= 20) send(false); else if (!timer) timer = setTimeout(() => send(false), 4000);
  };
  addEventListener('pagehide', () => send(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') send(true); });
  addEventListener('error', e => { if (errs++ < 3) track('js_error', { msg: String(e.message || '').slice(0, 200), src: String(e.filename || '').split('/').pop().slice(0, 60), line: e.lineno || 0 }); });
  addEventListener('unhandledrejection', e => { if (errs++ < 3) track('js_error', { msg: String((e.reason && e.reason.message) || e.reason || '').slice(0, 200) }); });
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    const h = a.getAttribute('href');
    if (/\.apk$/.test(h)) track('app_download');
    else if (/wa\.me|whatsapp/.test(h)) track('share', { via: 'whatsapp' });
    else if (/^https?:/.test(h) && !h.startsWith(location.origin) && !(API_BASE && h.startsWith(API_BASE))) track('outbound', { to: h.slice(0, 120) });
  }, true);
  return { track, flush: () => send(true) };
})();
const track = ACT.track;
// What was typed into a tool: request body + query string, without secrets, long values trimmed
const ACT_SECRET = /pass|token|secret|auth|otp|cvv|card/i;
function actClean(v, depth = 0) {
  if (v == null) return v;
  if (typeof v === 'string') return v.length > 300 ? v.slice(0, 300) + '…' : v;
  if (typeof v !== 'object') return v;
  if (depth > 3) return undefined;
  if (Array.isArray(v)) return v.slice(0, 30).map(x => actClean(x, depth + 1));
  const o = {}; for (const [k, x] of Object.entries(v)) if (!ACT_SECRET.test(k)) o[k] = actClean(x, depth + 1); return o;
}
function actInput(path, opts) {
  let body = null; try { body = opts.body ? JSON.parse(opts.body) : null; } catch (e) { body = typeof opts.body === 'string' ? opts.body.slice(0, 300) : null; }
  const qs = path.includes('?') ? Object.fromEntries(new URLSearchParams(path.split('?')[1])) : null;
  const all = { ...(qs || {}), ...(body && typeof body === 'object' ? body : body ? { body } : {}) };
  return Object.keys(all).length ? actClean(all) : null;
}
// Every form submitted on the site (except login): its fields, without passwords
const actFieldName = el => el.id || el.name || el.dataset.k || el.getAttribute('aria-label') || el.placeholder || el.type;
function actFields(form) {
  const out = {};
  form.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.type === 'password' || el.type === 'hidden' || el.type === 'file' || el.type === 'submit' || el.type === 'button' || ACT_SECRET.test(actFieldName(el))) return;
    if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
    let v = el.tagName === 'SELECT' ? (el.selectedOptions[0] ? el.selectedOptions[0].textContent.trim() : el.value) : el.value;
    if (v === '' || v == null) return;
    out[actFieldName(el)] = String(v).slice(0, 300);
  });
  return out;
}
document.addEventListener('submit', e => {
  const f = e.target; if (!(f instanceof HTMLFormElement) || f.id === 'authform' || f.closest('.admin, .box.admin')) return;
  const fields = actFields(f); if (!Object.keys(fields).length) return;
  track('form_submit', { form: f.id || f.className.split(' ')[0] || 'form', fields });
}, true);
// API calls name the tool that was used (kundali, match, names, muhurta …)
const API_EVENT = { kundali: 'kundali', match: 'matching', names: 'names', muhurta: 'muhurta', prashna: 'prashna', varshaphal: 'varshaphal', panchang: 'panchang', calendar: 'calendar', rashifal: 'rashifal', tithi: 'tithi', vrat: 'vrat', festival: 'festival', eclipses: 'eclipses', family: 'family', share: 'share', ics: 'calendar_export', 'push-test': 'push_test' };
function trackApi(path, opts, ms, status, offline) {
  const name = (path.match(/^\/api\/([\w-]+)/) || [])[1];
  if (!name || name === 'log' || name === 'signup') return;
  const method = (opts.method || 'GET').toUpperCase();
  const detail = { api: name, method, status, ms: Math.round(ms) }; if (offline) detail.offline = true;
  const input = actInput(path, opts); if (input) detail.input = input;
  track(status >= 400 || status === 0 ? 'api_error' : (API_EVENT[name] || name), detail);
}
// Open a chart on the Kundali page (or here, when the page can show charts itself)
let openChartHere = null;
function openChart(birth, opts = {}) {
  if (openChartHere) return openChartHere(birth, opts);
  store.set('kg-last', { input: birth, place: null, offAuto: false });
  if (opts.save === false) store.set('kg-open-nosave', true);
  location.href = HOME + '#report';
}

const GOOGLE_LOGIN = false; // "Continue with Google" is switched off for now; set true to show it again
const GOOGLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"/></svg>';
const redirectTo = () => SITE_ORIGIN + location.pathname.replace(/index\.html$/, "");

// Members-only features call this; it explains why login is needed, then opens signup.
function requireLogin(featureKey) {
  if (session) return true;
  authModal('signup', featureKey);
  return false;
}

function authModal(mode, featureKey) {
  if (!sb) { openModal(`<h2>${esc(t('auth.loginTitle'))}</h2><p class="muted">${esc(t('auth.unavailable'))}</p>`); return; }
  const signup = mode === 'signup';
  const why = featureKey ? `<div class="premium-why">${ic('i-star')}<span><b>${esc(t('members.title'))}</b>${esc(t('members.why', { f: t('members.f.' + featureKey) }))}</span></div>` : '';
  openModal(`<h2>${esc(t(signup ? 'auth.signupTitle' : 'auth.loginTitle'))}</h2><p class="muted">${esc(t('gate.free'))}</p>${why}
    ${APP || !GOOGLE_LOGIN ? '' : `<button type="button" class="btn-line google" id="g-btn">${GOOGLE}${esc(t('auth.google'))}</button>
    <p class="or">${esc(t('auth.or'))}</p>`}
    <form id="authform" novalidate>
      ${signup ? `<div class="field"><label for="a-name">${esc(t('auth.nameField'))}</label><input id="a-name" type="text" autocomplete="name"></div>` : ''}
      <div class="field"><label for="a-email">${esc(t('auth.email'))}</label><input id="a-email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="a-pass">${esc(t('auth.password'))}</label><input id="a-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required>${signup ? `<span class="place-meta">${esc(t('auth.passwordHint'))}</span>` : ''}</div>
      <p class="err" id="a-err" role="alert"></p>
      <button class="btn-cta go" type="submit">${esc(t(signup ? 'auth.signup' : 'auth.login'))}</button>
    </form>
    <div class="links">${signup ? `<span>${esc(t('auth.haveAccount'))} <button class="linkbtn" type="button" data-auth="login"${featureKey ? ` data-feature="${featureKey}"` : ''}>${esc(t('auth.toLogin'))}</button></span>` : `<button class="linkbtn" type="button" id="forgot">${esc(t('auth.forgot'))}</button><span>${esc(t('auth.noAccount'))} <button class="linkbtn" type="button" data-auth="signup"${featureKey ? ` data-feature="${featureKey}"` : ''}>${esc(t('auth.toSignup'))}</button></span>`}</div>`);
  if ($('#g-btn')) $('#g-btn').onclick = () => { track('login_start', { via: 'google' }); ACT.flush(); return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } }); };
  const fp = $('#forgot');
  if (fp) fp.onclick = async () => {
    const email = $('#a-email').value.trim(), er = $('#a-err');
    if (!email) { er.textContent = t('auth.needEmail'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
    track('password_reset', { ok: !error });
    er.className = error ? 'err' : 'ok'; er.textContent = error ? error.message : t('auth.resetSent', { email });
  };
  $('#authform').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#a-email').value.trim(), password = $('#a-pass').value, er = $('#a-err'), btn = e.target.querySelector('button[type=submit]');
    er.className = 'err'; er.textContent = '';
    if (!email || password.length < 6) { er.textContent = t('auth.invalid'); return; }
    btn.setAttribute('aria-busy', 'true');
    if (signup) {
      const fullName = ($('#a-name').value || '').trim();
      // 1) Instant account (already confirmed) through our server, then log straight in.
      let direct = null;
      try {
        const r = await fetch(apiUrl('/api/signup/'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name: fullName, lang: LANG }) });
        direct = { status: r.status, data: await r.json().catch(() => ({})) };
      } catch (e) { }
      if (direct && direct.status === 200) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        btn.removeAttribute('aria-busy');
        if (error) { er.textContent = error.message; return; }
        closeModal(); return;
      }
      if (direct && direct.status === 409) {
        // Already registered: try logging in with the password they typed.
        const { error } = await sb.auth.signInWithPassword({ email, password });
        btn.removeAttribute('aria-busy');
        if (error) { er.textContent = t('auth.exists'); return; }
        closeModal(); return;
      }
      if (direct && direct.status === 400) { btn.removeAttribute('aria-busy'); er.textContent = direct.data.error === 'weak_password' || direct.data.error === 'invalid_email' ? t('auth.invalid') : (direct.data.error || t('auth.invalid')); return; }
      // 2) Fallback: normal Supabase sign-up (direct login when "Confirm email" is off in Supabase).
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName, lang: LANG }, emailRedirectTo: redirectTo() } });
      if (!error && !data.session) {
        const s2 = await sb.auth.signInWithPassword({ email, password });
        if (!s2.error) { btn.removeAttribute('aria-busy'); closeModal(); return; }
      }
      btn.removeAttribute('aria-busy');
      if (error) { track('signup_failed', { email: email.slice(0, 80), reason: String(error.message).slice(0, 80) }); er.textContent = error.message; return; }
      if (!data.session) { er.textContent = t('auth.signupOff'); return; }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      btn.removeAttribute('aria-busy');
      if (error) { track('login_failed', { email: email.slice(0, 80), reason: String(error.message).slice(0, 80) }); er.textContent = error.message; return; }
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
function readAuthError() {
  const h = new URLSearchParams(INITIAL_HASH.slice(1)), q = new URLSearchParams(INITIAL_SEARCH);
  const err = h.get('error') || q.get('error'), code = h.get('error_code') || q.get('error_code');
  if (!err && !code) return null;
  history.replaceState(null, '', location.pathname + (q.get('t') ? '?t=' + q.get('t') : ''));
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

// ---------- My Kundalis (family profiles) ----------
const RELATIONS = ['self', 'spouse', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'friend', 'other'];
const birthLine = b => `${pad(b.day)}/${pad(b.month)}/${b.year} · ${pad(b.hour)}:${pad(b.minute)}`;
async function loadMyKundalis() {
  if (!session) return [];
  let { data, error } = await sb.from('kundalis').select('id,name,birth,relation,updated_at').eq('user_id', session.user.id).order('updated_at', { ascending: false }).limit(200);
  if (error && /relation/.test(error.message)) ({ data, error } = await sb.from('kundalis').select('id,name,birth,updated_at').eq('user_id', session.user.id).order('updated_at', { ascending: false }).limit(200));
  if (error) return store.get('kg-saved-cache', []);
  store.set('kg-saved-cache', data || []);
  return data || [];
}
async function savedModal() {
  openModal(`<h2>${esc(t('saved.title'))}</h2><p class="muted">${esc(t('saved.lede'))}</p><div id="savedwrap"><span class="spin"></span></div>`, true);
  const rows = await loadMyKundalis();
  const wrap = $('#savedwrap'); if (!wrap) return;
  if (!rows.length) { wrap.innerHTML = `<p class="empty">${esc(t('saved.empty'))}</p>`; return; }
  const groups = {};
  rows.forEach(r => { const k = r.relation || 'none'; (groups[k] = groups[k] || []).push(r); });
  const order = [...RELATIONS, 'none'].filter(k => groups[k]);
  const relSel = r => `<select class="relsel" data-rel="${r.id}" aria-label="${esc(t('rel.label'))}"><option value="">${esc(t('rel.none'))}</option>${RELATIONS.map(x => `<option value="${x}"${r.relation === x ? ' selected' : ''}>${esc(t('rel.' + x))}</option>`).join('')}</select>`;
  wrap.innerHTML = order.map(k => `<h3 class="grp">${esc(k === 'none' ? t('rel.unsorted') : t('rel.' + k))} <small>${groups[k].length}</small></h3><ul class="saved-list">${groups[k].map(r => { const b = r.birth; return `<li data-id="${r.id}"><span class="rgic">${esc(((b.name || '?').trim().charAt(0) || '?').toUpperCase())}</span><div><b>${esc(b.name || t('res.defaultName'))}</b><span>${esc(birthLine(b))} · ${esc(b.placeLabel || '')}</span>${'relation' in r ? relSel(r) : ''}</div><button class="btn-line" type="button" data-open>${esc(t('saved.open'))}</button><button class="del" type="button" data-del>${esc(t('saved.delete'))}</button></li>`; }).join('')}</ul>`).join('');
  wrap.addEventListener('change', async e => {
    const s = e.target.closest('.relsel'); if (!s) return;
    const { error } = await sb.from('kundalis').update({ relation: s.value || null }).eq('id', s.dataset.rel);
    if (!error) toast(t('rel.saved'));
  });
  wrap.addEventListener('click', async e => {
    const li = e.target.closest('li[data-id]'); if (!li || e.target.closest('select')) return;
    const row = rows.find(r => r.id === li.dataset.id);
    if (e.target.closest('[data-open]')) { closeModal(); openChart({ ...row.birth, relation: row.relation || undefined }); }
    if (e.target.closest('[data-del]')) { const { error } = await sb.from('kundalis').delete().eq('id', row.id); if (!error) { li.remove(); toast(t('saved.deleted')); } }
  });
}

// Fill a <select> with the member's saved Kundalis; returns the rows
async function fillKundaliSelect(sel, placeholder) {
  const rows = await loadMyKundalis();
  sel.innerHTML = `<option value="">${esc(placeholder)}</option>` + rows.map((r, i) => `<option value="${i}">${esc(r.birth.name || t('res.defaultName'))}${r.relation ? ' · ' + esc(t('rel.' + r.relation)) : ''} · ${esc(birthLine(r.birth))}</option>`).join('');
  return rows;
}

// ---------- History: every Kundali entered ----------
const HKEY = 'kg-history', HMAX = 100;
const readLocal = () => store.get(HKEY, []);
const writeLocal = list => store.set(HKEY, list.slice(0, HMAX));
function summaryOf(data) {
  if (data.preview) return { lagna: data.preview.lagna.sign, moon: data.preview.moon.sign, nak: data.preview.moon.nak, pada: data.preview.moon.pada };
  if (data.chart) { const m = data.chart.planets.find(p => p.name === 'Moon'); return { lagna: data.chart.lagna.sign, moon: m.sign, nak: m.nak, pada: m.pada }; }
  return null;
}
function addLocalHistory(input, data) {
  const { log, lang, save, relation, ...birth } = input;
  const list = readLocal();
  list.unshift({ id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: birth.name || null, birth, summary: summaryOf(data), lang: LANG, created_at: new Date().toISOString(), locked: !!data.locked });
  writeLocal(list);
}
async function moveLocalHistory(s) {
  const list = readLocal();
  if (!list.length || !s) return;
  const rows = list.map(h => ({ user_id: s.user.id, name: h.name, birth: h.birth, summary: h.summary, lang: h.lang, source: 'session', created_at: h.created_at }));
  const { error } = await sb.from('kundali_history').insert(rows);
  if (!error) store.del(HKEY);
}
async function loadHistory() {
  if (!session) return { rows: readLocal(), local: true };
  const { data, error } = await sb.from('kundali_history').select('id,name,birth,summary,lang,created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(500);
  return { rows: data || [], local: false, error };
}
const histWhen = v => new Date(v).toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    const shown = items.filter(h => !q || [h.name, h.birth.placeLabel, birthLine(h.birth)].join(' ').toLowerCase().includes(q));
    $('#h-count').textContent = t('history.count', { n: items.length });
    $('#h-clear').hidden = !items.length;
    if (error) { list.innerHTML = `<li><span>${esc(error.message)}</span></li>`; return; }
    list.innerHTML = shown.map(h => `<li data-id="${esc(h.id)}"><span class="rgic">${esc(((h.name || '?').trim().charAt(0) || '?').toUpperCase())}</span>
      <div><b>${esc(h.name || t('res.defaultName'))}</b><span>${esc(birthLine(h.birth))} · ${esc(h.birth.placeLabel || '')}</span><span class="hs">${esc(histSum(h.summary))}</span><span class="hw">${ic('i-clock')}${esc(histWhen(h.created_at))}${h.locked ? ` · <em>${esc(t('history.locked'))}</em>` : ''}</span></div>
      <button class="btn-line" type="button" data-open>${esc(t('saved.open'))}</button><button class="del" type="button" data-del aria-label="${esc(t('saved.delete'))}">${esc(t('saved.delete'))}</button></li>`).join('') || `<li><span>${esc(t(items.length ? 'history.noMatch' : 'history.empty'))}</span></li>`;
  };
  $('#h-q').addEventListener('input', draw);
  list.addEventListener('click', async e => {
    const li = e.target.closest('li[data-id]'); if (!li) return;
    const h = items.find(x => String(x.id) === li.dataset.id);
    if (e.target.closest('[data-open]')) { closeModal(); openChart(h.birth); }
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
if ($('#histbtn')) $('#histbtn').addEventListener('click', historyModal);

// The free chart made before signing up is copied into the new account once.
async function saveTrialChart(s) {
  const trial = store.get('kg-trial'); store.del('kg-trial');
  if (!trial || !s) return;
  try { await fetch(apiUrl('/api/kundali/'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify(trial) }); } catch (e) { }
}

// ---------- Admin panel (accounts listed in public.admins) ----------
async function checkAdmin() {
  isAdmin = false; isSuper = false;
  if (!sb || !session) return;
  try { const { data, error } = await sb.rpc('is_admin'); isAdmin = !error && data === true; } catch (e) { }
  if (isAdmin) try { const { data, error } = await sb.rpc('is_superadmin'); isSuper = !error && data === true; } catch (e) { }
}
const fmtTs = v => v ? new Date(v).toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
// Activity log (super admin only): summary, breakdowns and the event list, read through security-definer RPCs
const actState = { range: 7, event: '', hideSelf: true };
const ACT_TAG = { login: 'good', signup: 'good', logout: '', login_failed: 'bad', signup_failed: 'bad', js_error: 'bad', api_error: 'bad', page_view: '' };
const actWho = r => r.email ? esc(r.email) : `<span class="muted">${esc(t('admin.visitor'))} ${esc(String(r.visitor || '').slice(0, 6))}</span>`;
const actTime = v => new Date(v).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const actBirth = o => o && o.year && o.day ? `${o.name ? o.name + ' · ' : ''}${pad(o.day)}/${pad(o.month)}/${o.year}${o.hour != null ? ' ' + pad(o.hour) + ':' + pad(o.minute || 0) : ''}${o.placeLabel ? ' · ' + o.placeLabel : o.lat != null ? ' · ' + (+o.lat).toFixed(2) + ',' + (+o.lon).toFixed(2) : ''}` : null;
const actInputHtml = o => {
  if (!o || typeof o !== 'object') return '';
  const b = actBirth(o); if (b) return `<span class="act-in">${esc(b)}</span>`;
  return `<span class="act-in">${Object.entries(o).filter(([k, v]) => v !== '' && v != null).slice(0, 12).map(([k, v]) => { const bb = typeof v === 'object' ? actBirth(v) : null; return `<span class="kv"><i>${esc(k)}</i> ${esc(bb || (typeof v === 'object' ? JSON.stringify(v) : String(v))).slice(0, 160)}</span>`; }).join(' ')}</span>`;
};
const actDetail = d => !d ? '' : d.fields ? `<span class="muted">${esc(d.form || '')}</span>${actInputHtml(d.fields)}` : d.api ? `${esc(d.method || '')} /${esc(d.api)} · <b>${esc(d.status)}</b> · ${d.ms >= 1000 ? (d.ms / 1000).toFixed(1) + ' s' : esc(d.ms) + ' ms'}${d.offline ? ' · offline' : ''}${d.input ? actInputHtml(d.input) : ''}`
  : d.title && Object.keys(d).length === 1 ? esc(String(d.title).slice(0, 70)) : actDetailKv(d);
const actDetailKv = d => d ? Object.entries(d).filter(([k, v]) => v !== null && v !== '' && v !== undefined).map(([k, v]) => `<span class="kv"><i>${esc(k)}</i> ${esc(typeof v === 'object' ? JSON.stringify(v) : String(v)).slice(0, 120)}</span>`).join(' ') : '';
// ---------- Blog editor (admins) ----------
const BLOG_CATS = ['basics', 'planets', 'festivals', 'transits', 'remedies', 'matching', 'muhurta', 'numerology', 'news'];
const BLOG_LANGS = ['en', 'hi', 'gu', 'ta', 'te', 'kn'];
const blogSlug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
// Same Markdown subset as lib/blog.js, for the live preview
function mdPreview(md) {
  const inl = x => esc(x).replace(/!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g, '<img src="$2" alt="$1">').replace(/\[([^\]]+)\]\(((?:https:\/\/|\/)[^)\s]*)\)/g, '<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  const out = []; let para = [], list = null, quote = [];
  const fp = () => { if (para.length) out.push(`<p>${inl(para.join(' '))}</p>`); para = []; }, fl = () => { if (list) out.push(`<${list.t}>${list.i.map(x => `<li>${inl(x)}</li>`).join('')}</${list.t}>`); list = null; }, fq = () => { if (quote.length) out.push(`<blockquote>${inl(quote.join(' '))}</blockquote>`); quote = []; };
  for (const l of String(md || '').split('\n')) {
    let m;
    if (!l.trim()) { fp(); fl(); fq(); continue; }
    if ((m = l.match(/^(#{2,4})\s+(.+)$/))) { fp(); fl(); fq(); out.push(`<h${m[1].length}>${inl(m[2])}</h${m[1].length}>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(l.trim())) { fp(); fl(); fq(); out.push('<hr>'); continue; }
    if ((m = l.match(/^>\s?(.*)$/))) { fp(); fl(); quote.push(m[1]); continue; }
    if ((m = l.match(/^\s*[-*]\s+(.+)$/))) { fp(); fq(); if (!list || list.t !== 'ul') { fl(); list = { t: 'ul', i: [] }; } list.i.push(m[1]); continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.+)$/))) { fp(); fq(); if (!list || list.t !== 'ol') { fl(); list = { t: 'ol', i: [] }; } list.i.push(m[1]); continue; }
    fl(); fq(); para.push(l.trim());
  }
  fp(); fl(); fq(); return out.join('');
}
// ---------- Social: today's Rashifal and Panchang images in all 6 languages, with captions to copy ----------
const SOC_LANGS = [['en', 'English'], ['hi', 'हिन्दी'], ['gu', 'ગુજરાતી'], ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['kn', 'ಕನ್ನಡ']];
const SOC_CITIES = [['New Delhi', 28.6139, 77.209], ['Mumbai', 19.076, 72.8777], ['Ahmedabad', 23.0225, 72.5714], ['Surat', 21.1702, 72.8311], ['Bengaluru', 12.9716, 77.5946], ['Chennai', 13.0827, 80.2707], ['Hyderabad', 17.385, 78.4867], ['Kolkata', 22.5726, 88.3639], ['Pune', 18.5204, 73.8567], ['Jaipur', 26.9124, 75.7873], ['Lucknow', 26.8467, 80.9462], ['Varanasi', 25.3176, 82.9739]];
const loadScript = src => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = () => no(new Error(src)); document.head.appendChild(el); });
// One caption for an all-language reel: a line per language, the website and a balanced set of hashtags
function reelCaption(kind, caps, extra2) {
  if (kind === 'week' || kind === 'fest') { // titles in every language, the details in English, then the tags
    const x = extra2 || {}, tags = new Set(['#grahavani', '#reels', kind === 'week' ? '#weeklyhoroscope' : '#hindufestivals']);
    SOC_LANGS.forEach(([l]) => ((x[l] && x[l].tags) || '').split(/\s+/).filter(v => v.startsWith('#')).slice(0, 4).forEach(v => tags.add(v)));
    return [...SOC_LANGS.map(([l]) => x[l] && x[l].title).filter(Boolean), '', ...((x.en && x.en.lines) || []), '', '👉 ' + t('socad.reelCta', { u: SITE_ORIGIN.replace(/^https?:\/\//, '') }), '', [...tags].slice(0, 30).join(' ')].join('\n').replace(/\n{3,}/g, '\n\n');
  }
  const lines = l => (caps[l] || '').split('\n');
  const pick = (l, re) => (lines(l).find(x => re.test(x)) || '').replace(/\s*#\S+/g, '').trim();
  const head = kind === 'rashifal' ? SOC_LANGS.map(([l]) => pick(l, /^✨/)) : SOC_LANGS.map(([l]) => pick(l, /^🪔/));
  const extra = kind === 'rashifal' ? [pick('en', /^🌟/), pick('en', /^🙏/)] : [];
  const tags = new Set(['#grahavani', '#reels', kind === 'rashifal' ? '#rashifal' : '#panchang']);
  SOC_LANGS.forEach(([l]) => { const tl = lines(l).filter(x => /^#/.test(x)).join(' ').match(/#\S+/g) || []; tl.slice(0, 4).forEach(x => tags.add(x)); });
  return [...head.filter(Boolean), '', ...extra.filter(Boolean), extra.length ? '' : null, '👉 ' + t('socad.reelCta', { u: SITE_ORIGIN.replace(/^https?:\/\//, '') }), '', [...tags].slice(0, 30).join(' ')].filter(x => x !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}
function socialPanel(body) {
  const td = todayIn(330), today = isoDay(td.y, td.m, td.d);
  const st = { date: today, city: store.get('gv-soc-city') || 'New Delhi', fmt: 'story', caps: {}, xcaps: { week: {}, fest: {} } };
  const REELS = ['rashifal', 'panchang', 'week', 'fest'];
  const reelOk = typeof VideoEncoder === 'function';
  body.innerHTML = `<div class="soc-bar"><div class="field"><label for="soc-date">${esc(t('socad.date'))}</label><input id="soc-date" type="date" value="${st.date}"></div>
    <div class="field"><label for="soc-city">${esc(t('socad.city'))}</label><select id="soc-city">${SOC_CITIES.map(([n]) => `<option${n === st.city ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
    <h3 class="sub-h soc-h">${ic('i-image')}${esc(t('socad.reelsH'))}</h3><p class="muted small">${esc(t('socad.reelsLede'))}</p>
    ${reelOk ? '' : `<p class="err">${esc(t('socad.noReel'))}</p>`}
    <div class="soc-reels">${REELS.map(k => `<section class="card soc-reel" data-reel="${k}"><h4>${esc(t('socad.reel.' + k))}</h4>
      <div class="soc-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
      <div class="soc-acts"><button type="button" class="btn-cta" data-make="${k}"${reelOk ? '' : ' disabled'}>${ic('i-image')}${esc(t('socad.make'))}</button></div>
      <textarea class="soc-cap" rows="7" readonly data-rcap="${k}">…</textarea><button type="button" class="btn-line soc-copy" data-rcopy="${k}">${ic('i-doc')}${esc(t('socad.copy'))}</button></section>`).join('')}</div>
    <h3 class="sub-h soc-h">${ic('i-download')}${esc(t('socad.imagesH'))}</h3>
    <div class="seg" role="group" id="soc-fmt"><button type="button" data-fmt="story" aria-pressed="true">${esc(t('sc.story'))}</button><button type="button" data-fmt="post" aria-pressed="false">${esc(t('sc.post'))}</button></div>
    <div id="soc-grid" class="soc-grid"></div>`;
  const cityQ = () => { const c = SOC_CITIES.find(x => x[0] === st.city) || SOC_CITIES[0]; return encodeURIComponent(`${c[0]}|${c[1]}|${c[2]}|330`); };
  const img = (kind, lang, fmt = st.fmt) => apiUrl(`/api/social/?img=${kind}&fmt=${fmt}&lang=${lang}&date=${st.date}${kind === 'panchang' || kind === 'fest' ? '&city=' + cityQ() : ''}`);
  const resetReels = () => $$('.soc-reel').forEach(s => { const v = s.querySelector('.soc-vid'); if (v.dataset.url) URL.revokeObjectURL(v.dataset.url); v.dataset.url = ''; v.innerHTML = `<p class="muted small">${esc(t('socad.reelHint'))}</p>`; s.querySelectorAll('.soc-dl,.soc-share').forEach(x => x.remove()); });
  const draw = async () => {
    $('#soc-grid').innerHTML = SOC_LANGS.map(([l, name]) => `<section class="card soc-lang"><h4>${esc(name)}</h4><div class="soc-imgs ${st.fmt}">${['rashifal', 'panchang'].map(k => `<a href="${img(k, l)}" download="${k}-${l}-${st.date}-${st.fmt}.png" title="${esc(t('cc.download'))}"><img loading="lazy" src="${img(k, l)}" alt="${k} ${l}"><span>${ic('i-download')}${esc(t(k === 'rashifal' ? 'socad.rashifal' : 'socad.panchang'))}</span></a>`).join('')}</div>
      <textarea class="soc-cap" rows="6" readonly data-cap="${l}">…</textarea><button type="button" class="btn-line soc-copy" data-copy="${l}">${ic('i-doc')}${esc(t('socad.copy'))}</button></section>`).join('');
    const want = st.date + st.city;
    await Promise.all(SOC_LANGS.map(async ([l]) => {
      try { const r = await api(`/api/social/?caption=1&lang=${l}&date=${st.date}&city=${cityQ()}`); st.caps[l] = r.caption; const ta = $(`[data-cap="${l}"]`); if (ta) ta.value = r.caption; } catch (e) { }
    }));
    await Promise.all(['week', 'fest'].flatMap(k => SOC_LANGS.map(async ([l]) => {
      try { st.xcaps[k][l] = await api(`/api/social/?caption=1&kind=${k}&lang=${l}&date=${st.date}&city=${cityQ()}`); } catch (e) { }
    })));
    if (want !== st.date + st.city) return;
    REELS.forEach(k => { const ta = $(`[data-rcap="${k}"]`); if (ta) ta.value = reelCaption(k, st.caps, st.xcaps[k]); });
  };
  async function makeReel(kind, btn) {
    const sec = btn.closest('.soc-reel'), box = sec.querySelector('.soc-vid');
    btn.disabled = true; sec.querySelectorAll('.soc-dl,.soc-share').forEach(x => x.remove());
    box.innerHTML = `<div class="soc-prog"><i style="width:0%"></i></div><p class="muted small" data-ptext>${esc(t('socad.loading'))}</p>`;
    try {
      await loadScript('/assets/mp4-muxer.js'); await loadScript('/assets/reelmaker.js');
      const blob = await window.GVReel.make({
        slides: SOC_LANGS.map(([l]) => img(kind, l, 'story')), outro: apiUrl('/api/social/?img=outro&fmt=story'),
        onProgress: (p, stage) => { const bar = box.querySelector('.soc-prog i'), tx = box.querySelector('[data-ptext]'); if (bar) bar.style.width = Math.round(p * 100) + '%'; if (tx) tx.textContent = stage === 'load' ? t('socad.loading') : t('socad.making', { p: Math.round(p * 100) }); }
      });
      const url = URL.createObjectURL(blob), name = `grahavani-${kind}-reel-${st.date}.mp4`;
      if (box.dataset.url) URL.revokeObjectURL(box.dataset.url);
      box.dataset.url = url;
      box.innerHTML = `<video src="${url}" controls playsinline loop muted></video>`;
      const acts = sec.querySelector('.soc-acts');
      acts.insertAdjacentHTML('beforeend', `<a class="btn-line soc-dl" href="${url}" download="${name}">${ic('i-download')}${esc(t('socad.downloadMp4'))}</a>`);
      const file = new File([blob], name, { type: 'video/mp4' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        acts.insertAdjacentHTML('beforeend', `<button type="button" class="btn-line soc-share">${ic('i-link')}${esc(t('sc.share'))}</button>`);
        acts.querySelector('.soc-share').onclick = () => navigator.share({ files: [file], text: sec.querySelector('.soc-cap').value }).catch(() => { });
      }
      track('social_reel', { kind, date: st.date, kb: Math.round(blob.size / 1024) });
    } catch (e) {
      box.innerHTML = `<p class="err">${esc(e && e.message === 'unsupported' ? t('socad.noReel') : t('socad.reelFail'))}</p>`;
    }
    btn.disabled = false;
  }
  $('#soc-date').addEventListener('change', e => { st.date = e.target.value || today; resetReels(); draw(); });
  $('#soc-city').addEventListener('change', e => { st.city = e.target.value; store.set('gv-soc-city', st.city); resetReels(); draw(); });
  $$('#soc-fmt button').forEach(b => b.addEventListener('click', () => { st.fmt = b.dataset.fmt; $$('#soc-fmt button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); }));
  body.addEventListener('click', async e => {
    const mk = e.target.closest('[data-make]'); if (mk) return makeReel(mk.dataset.make, mk);
    const b = e.target.closest('[data-copy],[data-rcopy]'); if (!b) return;
    const ta = b.dataset.copy ? $(`[data-cap="${b.dataset.copy}"]`) : $(`[data-rcap="${b.dataset.rcopy}"]`);
    try { await navigator.clipboard.writeText(ta.value); } catch (err) { ta.select(); document.execCommand('copy'); }
    toast(t('socad.copied'));
  });
  draw();
}

async function blogPanel(body) {
  body.innerHTML = '<div style="padding:20px;text-align:center"><span class="spin"></span></div>';
  const { data, error } = await sb.from('blog_posts').select('id,lang,slug,title,excerpt,body,category,tags,cover_url,group_key,status,published_at,updated_at').order('updated_at', { ascending: false }).limit(500);
  if (error) { body.innerHTML = `<p class="err">${esc(/relation|does not exist/i.test(error.message) ? t('blogad.setup') : error.message)}</p>`; return; }
  const posts = data || [];
  const postUrl = p => `${SITE_ORIGIN}${p.lang === 'en' ? '/' : '/' + p.lang + '/'}blog/${p.slug}/`;
  const list = () => {
    body.innerHTML = `<div class="blogad-bar"><button type="button" class="btn-cta" data-bnew>${ic('i-doc')}${esc(t('blogad.new'))}</button><span class="muted small">${esc(t('blogad.count', { n: posts.length, p: posts.filter(p => p.status === 'published').length }))}</span><a class="btn-line" href="${HOME}blog/" target="_blank" rel="noopener">${esc(t('blogad.viewBlog'))}</a></div>
      <div class="tbl-card card"><table><thead><tr><th>${esc(t('blogad.title'))}</th><th>${esc(t('blogad.lang'))}</th><th>${esc(t('blogad.cat'))}</th><th>${esc(t('admin.status'))}</th><th>${esc(t('blogad.updated'))}</th><th></th></tr></thead><tbody>
      ${posts.map((p, i) => `<tr data-i="${i}"><td><b>${esc(p.title)}</b><small class="muted" style="display:block">/${esc(p.slug)}/</small></td><td>${esc(p.lang)}</td><td>${esc(t('blogad.cats.' + p.category))}</td><td><span class="tag ${p.status === 'published' ? 'good' : 'warn'}">${esc(t('blogad.st.' + p.status))}</span></td><td class="num">${fmtTs(p.updated_at)}</td><td><button type="button" class="linkbtn" data-bedit>${esc(t('blogad.edit'))}</button>${p.status === 'published' ? ` · <a href="${esc(postUrl(p))}" target="_blank" rel="noopener">${esc(t('blogad.view'))}</a>` : ''}</td></tr>`).join('') || `<tr><td colspan="6">${esc(t('blogad.none'))}</td></tr>`}</tbody></table></div>`;
    body.querySelector('[data-bnew]').onclick = () => edit({ lang: LANG, status: 'draft', category: 'basics', tags: [], body: '' });
    body.querySelectorAll('[data-bedit]').forEach(b => b.onclick = () => edit(posts[+b.closest('tr').dataset.i]));
  };
  const edit = p => {
    const isNew = !p.id, opt = (arr, cur, lab) => arr.map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(lab(v))}</option>`).join('');
    body.innerHTML = `<form class="blogad-form" novalidate>
      <div class="blogad-row"><div class="field"><label>${esc(t('blogad.title'))}</label><input name="title" required maxlength="160" value="${esc(p.title || '')}"></div>
        <div class="field"><label>${esc(t('blogad.slug'))}</label><input name="slug" required maxlength="90" pattern="[a-z0-9-]+" value="${esc(p.slug || '')}" placeholder="what-is-sade-sati"><span class="place-meta">${esc(t('blogad.slugHint'))}</span></div></div>
      <div class="blogad-row"><div class="field"><label>${esc(t('blogad.lang'))}</label><select name="lang">${opt(BLOG_LANGS, p.lang, v => v.toUpperCase())}</select></div>
        <div class="field"><label>${esc(t('blogad.cat'))}</label><select name="category">${opt(BLOG_CATS, p.category, v => t('blogad.cats.' + v))}</select></div>
        <div class="field"><label>${esc(t('admin.status'))}</label><select name="status">${opt(['draft', 'published'], p.status, v => t('blogad.st.' + v))}</select></div></div>
      <div class="field"><label>${esc(t('blogad.excerpt'))}</label><textarea name="excerpt" rows="2" maxlength="320">${esc(p.excerpt || '')}</textarea></div>
      <div class="blogad-row"><div class="field"><label>${esc(t('blogad.cover'))}</label><input name="cover_url" type="url" value="${esc(p.cover_url || '')}" placeholder="https://…"></div>
        <div class="field"><label>${esc(t('blogad.tags'))}</label><input name="tags" value="${esc((p.tags || []).join(', '))}" placeholder="sade sati, shani"></div>
        <div class="field"><label>${esc(t('blogad.group'))}</label><input name="group_key" value="${esc(p.group_key || '')}" placeholder="sade-sati"><span class="place-meta">${esc(t('blogad.groupHint'))}</span></div></div>
      <div class="blogad-edit"><div class="field"><label>${esc(t('blogad.body'))}</label><textarea name="body" rows="18" spellcheck="true">${esc(p.body || '')}</textarea><span class="place-meta">${esc(t('blogad.mdHint'))}</span></div>
        <div class="field"><label>${esc(t('blogad.preview'))}</label><div class="card prose blogad-prev"></div></div></div>
      <p class="err" data-berr></p>
      <div class="blogad-bar"><button type="submit" class="btn-cta">${esc(t('blogad.save'))}</button><button type="button" class="btn-line" data-bback>← ${esc(t('blogad.back'))}</button>${isNew ? '' : `<button type="button" class="btn-line ad-del" data-bdel>${esc(t('admin.delete'))}</button>`}</div></form>`;
    const f = body.querySelector('form'), prev = body.querySelector('.blogad-prev'), ta = f.elements.body;
    const draw = () => { prev.innerHTML = mdPreview(ta.value) || `<p class="muted">${esc(t('blogad.empty'))}</p>`; };
    ta.addEventListener('input', draw); draw();
    f.elements.title.addEventListener('input', () => { if (isNew && !f.elements.slug.dataset.touched) f.elements.slug.value = blogSlug(f.elements.title.value); });
    f.elements.slug.addEventListener('input', () => { f.elements.slug.dataset.touched = '1'; });
    body.querySelector('[data-bback]').onclick = () => list();
    const del = body.querySelector('[data-bdel]');
    if (del) del.onclick = async () => {
      if (!confirm(t('blogad.delQ', { n: p.title }))) return;
      const { error } = await sb.from('blog_posts').delete().eq('id', p.id); if (error) { toast(error.message); return; }
      posts.splice(posts.indexOf(p), 1); toast(t('admin.deleted')); list();
    };
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const er = body.querySelector('[data-berr]'); er.textContent = '';
      const v = n => f.elements[n].value.trim();
      const row = { title: v('title'), slug: blogSlug(v('slug')), lang: v('lang'), category: v('category'), status: v('status'), excerpt: v('excerpt') || null, cover_url: v('cover_url') || null,
        tags: v('tags').split(',').map(x => x.trim()).filter(Boolean).slice(0, 12), group_key: v('group_key') || null, body: f.elements.body.value };
      if (row.title.length < 3) { er.textContent = t('blogad.needTitle'); return; }
      if (!row.slug) { er.textContent = t('blogad.needSlug'); return; }
      if (row.cover_url && !/^https:\/\//.test(row.cover_url)) { er.textContent = t('blogad.needHttps'); return; }
      const q = isNew ? sb.from('blog_posts').insert(row).select().single() : sb.from('blog_posts').update(row).eq('id', p.id).select().single();
      const { data: saved, error } = await q;
      if (error) { er.textContent = /duplicate|unique/i.test(error.message) ? t('blogad.dupSlug') : error.message; return; }
      if (isNew) posts.unshift(saved); else Object.assign(p, saved);
      track('blog_save', { slug: saved.slug, lang: saved.lang, status: saved.status });
      toast(t(saved.status === 'published' ? 'blogad.savedPub' : 'blogad.saved'));
      list();
    });
  };
  list();
}

async function activityPanel(body, qIn) {
  const since = new Date(Date.now() - actState.range * 864e5).toISOString();
  const q = (qIn.value || '').trim();
  body.innerHTML = '<div style="padding:24px;text-align:center"><span class="spin"></span></div>';
  const [st, ls] = await Promise.all([
    sb.rpc('admin_activity_stats', { p_since: since, p_hide_self: actState.hideSelf }),
    sb.rpc('admin_activity', { p_since: since, p_event: actState.event || null, p_q: q || null, p_limit: 200, p_hide_self: actState.hideSelf })
  ]);
  if (st.error || ls.error) { body.innerHTML = `<p class="err">${esc((st.error || ls.error).message)}</p>`; return; }
  const S = st.data || {}; let rows = ls.data || [];
  const stat = (n, l) => `<div><b>${n || 0}</b><span>${esc(l)}</span></div>`;
  const top = (h, arr, fmt) => `<div class="card act-top"><h4>${esc(h)}</h4>${(arr || []).length ? `<ol>${arr.slice(0, 10).map(x => `<li><span>${fmt ? fmt(x.k) : esc(x.k || '—')}</span><b>${x.n}</b></li>`).join('')}</ol>` : `<p class="muted small">${esc(t('admin.none'))}</p>`}</div>`;
  const maxDay = Math.max(1, ...(S.byDay || []).map(d => d.n));
  const days = (S.byDay || []).map(d => `<div class="act-bar" title="${esc(d.k)} · ${d.n} ${esc(t('admin.aViews'))} · ${d.v} ${esc(t('admin.aVisitors'))}"><i style="height:${Math.max(4, Math.round(d.n / maxDay * 100))}%"></i><span>${esc(d.k.slice(8))}</span></div>`).join('');
  const evOpts = (S.byEvent || []).map(x => `<option value="${esc(x.k)}"${x.k === actState.event ? ' selected' : ''}>${esc(x.k)} (${x.n})</option>`).join('');
  const rowHtml = r => `<tr><td class="num act-when">${actTime(r.created_at)}</td><td>${actWho(r)}</td><td><span class="tag ${r.event in ACT_TAG ? ACT_TAG[r.event] : 'gold'}">${esc(r.event)}</span></td><td class="act-page">${esc(r.page || '')}</td><td class="act-detail"><div class="act-d">${actDetail(r.detail)}</div></td><td class="act-where">${esc([r.city, r.region, r.country].filter(Boolean).join(', ') || '—')}<small>${esc(r.device || '')}</small></td></tr>`;
  body.innerHTML = `<div class="act-note">${ic('i-shield')}<ul>${L.admin.aNote.map(x => `<li>${esc(x)}</li>`).join('')}<li><a href="${HOME}privacy/" target="_blank" rel="noopener">${esc(t('admin.aPolicy'))}</a></li></ul></div>
    <div class="act-controls">
      <select id="act-range" aria-label="${esc(t('admin.aRange'))}">${[1, 7, 30, 90, 180].map(d => `<option value="${d}"${d === actState.range ? ' selected' : ''}>${esc(t('admin.aLast', { n: d }))}</option>`).join('')}</select>
      <select id="act-event" aria-label="${esc(t('admin.aEvent'))}"><option value="">${esc(t('admin.aAll'))}</option>${evOpts}</select>
      <label class="act-self"><input type="checkbox" id="act-self"${actState.hideSelf ? ' checked' : ''}> ${esc(t('admin.aHideSelf'))}</label>
      <button type="button" class="btn-line" id="act-refresh">${esc(t('admin.aRefresh'))}</button></div>
    <div class="admin-stats">${stat(S.visitors, t('admin.aVisitors'))}${stat(S.views, t('admin.aViews'))}${stat(S.users, t('admin.aUsers'))}${stat(S.logins, t('admin.aLogins'))}${stat(S.signups, t('admin.aSignups'))}${stat(S.app, t('admin.aApp'))}${stat(S.errors, t('admin.aErrors'))}</div>
    ${days ? `<div class="card act-days">${days}</div>` : ''}
    <div class="act-grid">${top(t('admin.aTopEvents'), S.byEvent)}${top(t('admin.aTopPages'), S.byPage)}${top(t('admin.aTopCities'), S.byCity)}${top(t('admin.aLangs'), S.byLang)}</div>
    <div class="tbl-card card"><table class="act-table"><thead><tr><th>${esc(t('admin.when'))}</th><th>${esc(t('admin.aWho'))}</th><th>${esc(t('admin.aEvent'))}</th><th>${esc(t('admin.aPage'))}</th><th>${esc(t('admin.aDetail'))}</th><th>${esc(t('admin.place'))} · ${esc(t('admin.aDevice'))}</th></tr></thead><tbody id="act-rows">${rows.map(rowHtml).join('') || `<tr><td colspan="6">${esc(t('admin.none'))}</td></tr>`}</tbody></table></div>
    ${rows.length >= 200 ? `<p style="text-align:center"><button type="button" class="btn-line" id="act-more">${esc(t('admin.aMore'))}</button></p>` : ''}`;
  const re = () => activityPanel(body, qIn);
  $('#act-range').onchange = e => { actState.range = +e.target.value; re(); };
  $('#act-event').onchange = e => { actState.event = e.target.value; re(); };
  $('#act-self').onchange = e => { actState.hideSelf = e.target.checked; re(); };
  $('#act-refresh').onclick = re;
  const more = $('#act-more');
  if (more) more.onclick = async () => {
    more.setAttribute('aria-busy', 'true');
    const { data, error } = await sb.rpc('admin_activity', { p_since: since, p_event: actState.event || null, p_q: q || null, p_before: rows[rows.length - 1].id, p_limit: 200, p_hide_self: actState.hideSelf });
    more.removeAttribute('aria-busy');
    if (error || !data) return;
    rows = rows.concat(data); $('#act-rows').insertAdjacentHTML('beforeend', data.map(rowHtml).join(''));
    if (data.length < 200) more.remove();
  };
}
// Admin page (/admin/): menu on the left (a scrolling tab bar on phones), the panel on the right.
const ADMIN_TABS = [['users', 'i-users', 'admin.users'], ['charts', 'i-chart', 'admin.charts'], ['history', 'i-clock', 'admin.history'], ['blog', 'i-doc', 'blogad.tab'], ['social', 'i-image', 'socad.tab'], ['activity', 'i-bell', 'admin.activity']];
// Phones: tables turn into cards, each cell labelled with its column name
function labelTables(root) { root.querySelectorAll('table').forEach(tb => { const hs = [...tb.querySelectorAll('thead th')].map(th => th.textContent.trim()); tb.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (hs[i] && !td.hasAttribute('data-label')) td.setAttribute('data-label', hs[i]); })); }); }
async function adminView(root) {
  const tabs = ADMIN_TABS.filter(x => x[0] !== 'activity' || isSuper);
  const start = (location.hash || '').slice(1), first = tabs.some(x => x[0] === start) ? start : 'users';
  root.innerHTML = `<div class="adm">
    <aside class="adm-side"><nav class="adm-nav" id="ad-tabs" aria-label="${esc(t('admin.title'))}">${tabs.map(([id, icon, key]) => `<button type="button" data-tab="${id}" aria-pressed="${id === first}">${ic(icon)}<span>${esc(t(key))}</span></button>`).join('')}</nav>
      <p class="adm-who muted small">${esc(session && session.user ? session.user.email : '')}</p></aside>
    <div class="adm-main">
      <div class="admin-stats" id="ad-stats"><span class="spin"></span></div>
      <div class="field adm-search"><input id="ad-q" type="search" placeholder="${esc(t('admin.search'))}" aria-label="${esc(t('admin.search'))}"></div>
      <div id="ad-body" class="admin-body"></div>
    </div></div>`;
  new MutationObserver(() => labelTables($('#ad-body'))).observe($('#ad-body'), { childList: true, subtree: true });
  const [u, k, hs] = await Promise.all([
    sb.rpc('admin_users'),
    sb.from('kundalis').select('id,user_id,name,birth,created_at,updated_at').order('updated_at', { ascending: false }).limit(1000),
    sb.from('kundali_history').select('id,user_id,name,birth,summary,lang,source,created_at').order('created_at', { ascending: false }).limit(2000)
  ]);
  const historyRows = hs.error ? [] : (hs.data || []);
  const body = $('#ad-body'); if (!body) return;
  if (u.error || k.error) { $('#ad-stats').innerHTML = ''; body.innerHTML = `<p class="err">${esc((u.error || k.error).message)}</p>`; return; }
  const users = u.data || [], charts = k.data || [], byId = Object.fromEntries(users.map(x => [x.id, x]));
  const weekAgo = Date.now() - 7 * 864e5;
  const stat = (n, l) => `<div><b>${n}</b><span>${esc(l)}</span></div>`;
  const drawStats = () => { $('#ad-stats').innerHTML = stat(users.length, t('admin.sUsers')) + stat(users.filter(x => x.confirmed).length, t('admin.sConfirmed')) + stat(charts.length, t('admin.sCharts')) + stat(users.filter(x => new Date(x.created_at) > weekAgo).length, t('admin.sNew')) + stat(historyRows.length, t('admin.sHistory')); };
  drawStats();
  let tab = first;
  const draw = () => {
    $('.adm-main').dataset.tab = tab;
    const q = ($('#ad-q').value || '').trim().toLowerCase();
    if (tab === 'activity') return activityPanel(body, $('#ad-q'));
    $('#ad-q').closest('.field').style.display = tab === 'blog' || tab === 'social' ? 'none' : '';
    if (tab === 'blog') return blogPanel(body);
    if (tab === 'social') return socialPanel(body);
    if (tab === 'history') {
      const rows = historyRows.filter(h => { const ow = byId[h.user_id]; return !q || [h.name, h.birth.placeLabel, ow && ow.email].join(' ').toLowerCase().includes(q); });
      body.innerHTML = `<div class="tbl-card card"><table><thead><tr><th>${esc(t('admin.when'))}</th><th>${esc(t('admin.email'))}</th><th>${esc(t('admin.name'))}</th><th>${esc(t('admin.birth'))}</th><th>${esc(t('admin.place'))}</th><th>${esc(t('admin.result'))}</th><th>${esc(t('admin.lang'))}</th><th></th></tr></thead><tbody>${rows.map(h => { const ow = byId[h.user_id]; return `<tr data-hid="${h.id}"><td class="num">${fmtTs(h.created_at)}</td><td>${esc(ow ? ow.email : '')}</td><td>${esc(h.name || '—')}</td><td class="num">${esc(birthLine(h.birth))}</td><td>${esc(h.birth.placeLabel || '')}</td><td>${esc(histSum(h.summary))}</td><td>${esc(h.lang || '')}${h.source === 'session' ? ' · ' + esc(t('admin.fromSession')) : ''}</td><td><button type="button" class="linkbtn ad-del" data-del-hist>${esc(t('admin.delete'))}</button></td></tr>`; }).join('') || `<tr><td colspan="8">${esc(t(hs.error ? 'admin.historyMissing' : 'admin.none'))}</td></tr>`}</tbody></table></div>`;
    } else if (tab === 'users') {
      const rows = users.filter(x => !q || (x.email + ' ' + (x.full_name || '')).toLowerCase().includes(q));
      body.innerHTML = `<div class="tbl-card card"><table><thead><tr><th>${esc(t('admin.email'))}</th><th>${esc(t('admin.name'))}</th><th>${esc(t('admin.status'))}</th><th>${esc(t('admin.joined'))}</th><th>${esc(t('admin.lastLogin'))}</th><th>${esc(t('admin.sCharts'))}</th><th></th></tr></thead><tbody>${rows.map(x => `<tr data-uid="${x.id}"><td>${esc(x.email)}</td><td>${esc(x.full_name || '—')}</td><td><span class="tag ${x.confirmed ? 'good' : 'warn'}">${esc(t(x.confirmed ? 'admin.confirmed' : 'admin.pending'))}</span></td><td class="num">${fmtTs(x.created_at)}</td><td class="num">${fmtTs(x.last_sign_in_at)}</td><td class="num">${x.charts}</td><td>${session && x.id !== session.user.id ? `<button type="button" class="linkbtn ad-del" data-del-user title="${esc(t('admin.delUser'))}">${esc(t('admin.delete'))}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="7">${esc(t('admin.none'))}</td></tr>`}</tbody></table></div>`;
    } else {
      const rows = charts.filter(r => { const b = r.birth || {}, ow = byId[r.user_id]; return !q || [b.name, b.placeLabel, ow && ow.email].join(' ').toLowerCase().includes(q); });
      body.innerHTML = `<ul class="saved-list">${rows.map(r => { const b = r.birth || {}, ow = byId[r.user_id]; return `<li data-id="${r.id}"><span class="rgic">${esc(((b.name || '?').trim().charAt(0) || '?').toUpperCase())}</span><div><b>${esc(b.name || t('res.defaultName'))}</b><span>${esc(birthLine(b))} · ${esc(b.placeLabel || '')}</span><span style="display:block">${esc(ow ? ow.email : '')} · ${fmtTs(r.updated_at)}</span></div><button class="btn-line" type="button" data-open>${esc(t('saved.open'))}</button><button class="btn-line ad-del" type="button" data-del-chart>${esc(t('admin.delete'))}</button></li>`; }).join('') || `<li><span>${esc(t('admin.none'))}</span></li>`}</ul>`;
    }
  };
  $('#ad-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; $('#ad-tabs').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); history.replaceState(null, '', '#' + tab); b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); draw(); });
  let qT = null;
  $('#ad-q').addEventListener('input', () => { if (tab !== 'activity') return draw(); clearTimeout(qT); qT = setTimeout(draw, 400); });
  const delErr = error => toast(/function .* does not exist|PGRST202|schema cache/i.test(error.message || '') ? t('admin.delMissing') : (error.message || t('err.server')));
  body.addEventListener('click', async e => {
    const li = e.target.closest('li[data-id]');
    if (li && e.target.closest('[data-del-chart]')) {
      const row = charts.find(r => r.id === li.dataset.id), ow = row && byId[row.user_id];
      if (!row || !confirm(t('admin.delChartQ', { n: (row.birth && row.birth.name) || t('res.defaultName'), e: ow ? ow.email : '' }))) return;
      const { error } = await sb.rpc('admin_delete_kundali', { p_id: row.id }); if (error) return delErr(error);
      charts.splice(charts.indexOf(row), 1); if (ow) ow.charts = Math.max(0, ow.charts - 1);
      track('admin_delete', { what: 'kundali' }); toast(t('admin.deleted')); drawStats(); return draw();
    }
    const hr = e.target.closest('tr[data-hid]');
    if (hr && e.target.closest('[data-del-hist]')) {
      const row = historyRows.find(h => h.id === hr.dataset.hid); if (!row || !confirm(t('admin.delHistQ'))) return;
      const { error } = await sb.rpc('admin_delete_history', { p_id: row.id }); if (error) return delErr(error);
      historyRows.splice(historyRows.indexOf(row), 1); track('admin_delete', { what: 'history' }); toast(t('admin.deleted')); drawStats(); return draw();
    }
    const ur = e.target.closest('tr[data-uid]');
    if (ur && e.target.closest('[data-del-user]')) {
      const u0 = users.find(x => x.id === ur.dataset.uid); if (!u0) return;
      if (prompt(t('admin.delUserQ', { e: u0.email, n: u0.charts })) !== u0.email) return;
      const { error } = await sb.rpc('admin_delete_user', { p_user: u0.id }); if (error) return delErr(error);
      users.splice(users.indexOf(u0), 1);
      for (let i = charts.length - 1; i >= 0; i--) if (charts[i].user_id === u0.id) charts.splice(i, 1);
      for (let i = historyRows.length - 1; i >= 0; i--) if (historyRows[i].user_id === u0.id) historyRows.splice(i, 1);
      track('admin_delete', { what: 'user' }); toast(t('admin.deleted')); drawStats(); return draw();
    }
    if (!li || !e.target.closest('[data-open]')) return;
    const row = charts.find(r => r.id === li.dataset.id);
    closeModal(); openChart(row.birth, { save: false });
  });
  draw();
}

// ---------- Account menu ----------
function renderAuthSlot() {
  const slot = $('#authslot'); if (!slot) return;
  if (!session) { slot.innerHTML = `<button class="btn-line" type="button" data-auth="login">${esc(t('nav.login'))}</button>`; return; }
  const u = session.user, nm = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || u.email;
  slot.innerHTML = `<span class="user"><button type="button" id="userbtn" aria-haspopup="true" aria-expanded="false"><span class="av">${esc(String(nm).charAt(0).toUpperCase())}</span><span class="nm">${esc(nm)}</span></button>
    <div class="menu" id="usermenu" hidden><div class="who">${esc(u.email || '')}</div><button type="button" data-menu="saved">${ic('i-users')}${esc(t('nav.myCharts'))}</button><a href="${HOME}family/" class="menu-link">${ic('i-users')}${esc(t('nav.family'))}</a><a href="${HOME}matching/" class="menu-link">${ic('i-heart')}${esc(t('nav.matching'))}</a><a href="${HOME}names/" class="menu-link">${ic('i-star')}${esc(t('nav.names'))}</a><a href="${HOME}muhurta/" class="menu-link">${ic('i-cal')}${esc(t('nav.muhurta'))}</a><a href="${HOME}sadhana/" class="menu-link">${ic('i-check')}${esc(t('nav.sadhana'))}</a><a href="${HOME}settings/" class="menu-link">${ic('i-shield')}${esc(t('nav.settings'))}</a>${isAdmin ? `<button type="button" data-menu="admin">${ic('i-shield')}${esc(t('admin.title'))}</button>` : ''}<button type="button" data-menu="logout">${ic('i-logout')}${esc(t('nav.logout'))}</button></div></span>`;
  const btn = $('#userbtn'), menu = $('#usermenu');
  btn.onclick = () => { menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); };
  menu.onclick = async e => {
    const m = e.target.closest('[data-menu]'); if (!m) return; menu.hidden = true;
    if (m.dataset.menu === 'saved') savedModal();
    if (m.dataset.menu === 'admin') { track('admin_open'); location.href = HOME + 'admin/'; }
    if (m.dataset.menu === 'logout') { track('logout'); ACT.flush(); await sb.auth.signOut(); }
  };
}
document.addEventListener('click', e => {
  if (!e.target.closest('.user')) { const m = $('#usermenu'); if (m) m.hidden = true; }
  const a = e.target.closest('[data-auth]'); if (a) authModal(a.dataset.auth, a.dataset.feature);
});

// ---------- Account settings (branding, reminders, calendar feed) ----------
let settingsCache = null;
async function loadSettings(force) {
  if (!sb || !session) return null;
  if (settingsCache && !force) return settingsCache;
  const { data, error } = await sb.from('user_settings').select('brand,reminders,feed_token').eq('user_id', session.user.id).maybeSingle();
  settingsCache = error ? { error } : (data || {});
  return settingsCache;
}
async function saveSettings(patch) {
  const { error } = await sb.from('user_settings').upsert({ user_id: session.user.id, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (!error) settingsCache = { ...(settingsCache || {}), ...patch };
  return error;
}
authHooks.push(() => { settingsCache = null; });

// ---------- Read aloud (Rashifal) ----------
// Browser speech synthesis on the web; the phone's text-to-speech engine in the app (Android WebView has none).
const SPEECH_LANG = { en: 'en-IN', hi: 'hi-IN', gu: 'gu-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN' };
let speakRun = 0;
function speechChunks(text) {
  const parts = (String(text).replace(/\s+/g, ' ').match(/[^.!?।॥]+[.!?।॥]*/g) || []).map(x => x.trim()), out = [];
  for (const p of parts) { if (out.length && (out[out.length - 1] + ' ' + p).length < 220) out[out.length - 1] += ' ' + p; else out.push(p); }
  return out.filter(Boolean);
}
function voiceFor(lang) {
  const vs = ('speechSynthesis' in window && speechSynthesis.getVoices()) || [], l = lang.toLowerCase();
  return vs.find(v => v.lang.replace('_', '-').toLowerCase() === l) || vs.find(v => v.lang.toLowerCase().startsWith(l.slice(0, 2))) || null;
}
async function speak(text, onEnd) {
  stopSpeak();
  const run = ++speakRun, lang = SPEECH_LANG[LANG] || 'en-IN', done = () => { if (run === speakRun && onEnd) onEnd(); };
  if (APP && APP.speak) {
    const r = await APP.speak(text, lang).catch(() => ({ ok: false }));
    if (r && r.ok === false && run === speakRun) toast(t('lis.noVoice'));
    done(); return;
  }
  if (!('speechSynthesis' in window)) { toast(t('lis.noSupport')); done(); return; }
  if (!speechSynthesis.getVoices().length) await new Promise(r => { speechSynthesis.onvoiceschanged = r; setTimeout(r, 800); });
  let v = voiceFor(lang); if (v && !(v instanceof SpeechSynthesisVoice)) v = null;
  if (!v && LANG !== 'en') toast(t('lis.noVoice'));
  const chunks = speechChunks(text);
  chunks.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c); u.lang = lang; try { if (v) u.voice = v; } catch (e) { } u.rate = 0.95;
    if (i === chunks.length - 1) u.onend = done;
    u.onerror = e => { if (e.error !== 'interrupted' && e.error !== 'canceled') done(); };
    speechSynthesis.speak(u);
  });
}
function stopSpeak() { speakRun++; if (APP && APP.stopSpeak) APP.stopSpeak(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
addEventListener('pagehide', () => stopSpeak());

// ---------- Reveal-on-scroll ----------
let io = null;
function observeReveals() {
  if (!('IntersectionObserver' in window)) return;
  if (io) io.disconnect();
  io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px 120px 0px' });
  $$('.reveal, .graha, .bhava').forEach(el => io.observe(el));
}

// Members-only placeholder card
function lockCard(featureKey, extra = '') {
  return `<div class="card lock-card reveal"><span class="lock">${ic('i-lock')}</span><div><b>${esc(t('members.f.' + featureKey))}</b><p>${esc(t('members.lockText'))}</p>${extra}</div><button class="btn-cta" type="button" data-auth="signup" data-feature="${featureKey}">${esc(t('members.cta'))}</button></div>`;
}

// Service worker for browser notifications
if (!APP && 'serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { }); });

// ---------- Boot ----------
async function boot() {
  if (sb) {
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (session && /type=(signup|magiclink|email)/.test(INITIAL_HASH)) setTimeout(() => toast(t('auth.confirmed')), 300);
    sb.auth.onAuthStateChange((event, s) => {
      const was = !!session; session = s;
      renderAuthSlot(); fitHeader(); checkAdmin().then(() => { renderAuthSlot(); fitHeader(); });
      if (event === 'PASSWORD_RECOVERY') newPasswordModal();
      if (event === 'SIGNED_IN' && !was && s && s.user) { const isNew = Date.now() - new Date(s.user.created_at).getTime() < 3 * 60000; track(isNew ? 'signup' : 'login', { via: (s.user.app_metadata && s.user.app_metadata.provider) || 'email' }); }
      if (event === 'SIGNED_IN' && !was) { saveTrialChart(s); moveLocalHistory(s); if (modal.querySelector('#authform')) closeModal(); }
      authHooks.forEach(f => { try { f(event, s, was); } catch (e) { console.error(e); } });
    });
  }
  await checkAdmin();
  renderAuthSlot(); fitHeader();
  const linkErr = readAuthError();
  if (linkErr && sb) linkErrorModal(linkErr);
  readyHooks.forEach(f => { try { f(session); } catch (e) { console.error(e); } });
  track('page_view', { title: document.title.split('|')[0].trim().slice(0, 90) });
  if (APP && APP.attach) APP.attach({ t, L, LANG, LOCALE, HOME, store, toast, sb, api, openChart, closeModal, authHooks, getSession: () => session, modalOpen: () => !!(modal && modal.innerHTML) });
}
