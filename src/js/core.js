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
const gimg = (name, cls = 'gimg') => g(name, cls);
const rg = (s, cls = 'rg') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#rs-${s}"/></svg>`;
const ic = (id, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#${id}"/></svg>`;
const toneIcon = tn => tn === 'good' ? ic('i-check') : tn === 'bad' ? ic('i-alert') : ic('i-info');
async function bindSavedKundali(selId, onFill, opts = {}) {
  const sel = $(selId); if (!sel) return;
  const sync = async () => {
    if (!session) {
      sel._rows = [];
      sel.innerHTML = '';
      sel.hidden = true;
      return;
    }
    try {
      const rows = await loadMyKundalis();
      sel._rows = rows || [];
      if (!rows || !rows.length) {
        sel.innerHTML = '';
        sel.hidden = true;
        const fullName = session.user && session.user.user_metadata && session.user.user_metadata.full_name;
        if (fullName && opts.onNameOnly) opts.onNameOnly(fullName);
        return;
      }
      sel.hidden = false;
      sel.innerHTML = `<option value="">${esc(t('mt.pick'))}</option>` + rows.map((r, i) => `<option value="${i}">${esc(r.birth.name || t('res.defaultName'))}${r.relation ? ' · ' + esc(t('rel.' + r.relation)) : ''} · ${esc(birthLine(r.birth))}</option>`).join('');
      if (!sel.dataset.bound) {
        sel.dataset.bound = '1';
        sel.addEventListener('change', () => {
          if (sel.value !== '' && sel._rows && sel._rows[+sel.value]) {
            const r = sel._rows[+sel.value];
            onFill(r.birth, r);
          }
        });
      }
      if (opts.autoFill !== false && (!opts.shouldAutoFill || opts.shouldAutoFill())) {
        const selfIdx = rows.findIndex(r => r.relation === 'self');
        const idx = selfIdx >= 0 ? selfIdx : 0;
        sel.value = String(idx);
        onFill(rows[idx].birth, rows[idx]);
      }
    } catch (e) { sel.hidden = true; }
  };
  readyHooks.push(sync);
  authHooks.push(sync);
  if (session) sync();
}
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
// Reel order: Hindi first, English last
const SOC_LANGS = [['hi', 'हिन्दी'], ['gu', 'ગુજરાતી'], ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['kn', 'ಕನ್ನಡ'], ['en', 'English']];
const SOC_MUSIC = [['om-dhyan', 'om'], ['bansuri-yaman', 'bansuri'], ['shanti', 'shanti'], ['none', 'none']];
const SOC_CITIES = [['New Delhi', 28.6139, 77.209], ['Mumbai', 19.076, 72.8777], ['Ahmedabad', 23.0225, 72.5714], ['Surat', 21.1702, 72.8311], ['Bengaluru', 12.9716, 77.5946], ['Chennai', 13.0827, 80.2707], ['Hyderabad', 17.385, 78.4867], ['Kolkata', 22.5726, 88.3639], ['Pune', 18.5204, 73.8567], ['Jaipur', 26.9124, 75.7873], ['Lucknow', 26.8467, 80.9462], ['Varanasi', 25.3176, 82.9739]];
const loadScript = src => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); document.querySelectorAll(`script[src^="${src.split('?')[0]}"]`).forEach(x => x.remove()); const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = () => no(new Error(src)); document.head.appendChild(el); });
// One caption for an all-language reel: a line per language, the website and a balanced set of hashtags
// Reel captions written for reach: a hook (Hindi + English) in the first lines Instagram shows, keywords in the text,
// a comment prompt, save/share and follow prompts, the site address, then 5 hashtags (Instagram's limit) — one caption for Instagram and Facebook.
const RC_HOOK = {
  day: { hi: { today: 'आज का दिन कैसा है? 🤔', tomorrow: 'कल का दिन कैसा रहेगा? 🤔', other: '{d} को क्या खास है? 🤔' }, en: 'What’s special {w}? Read before you start anything 👇' },
  rashifal: { hi: { today: 'आज किस राशि की किस्मत चमकेगी? ✨', tomorrow: 'कल किस राशि की किस्मत चमकेगी? ✨', other: '{d} – किस राशि की किस्मत चमकेगी? ✨' }, en: 'Which signs are lucky {w}? Find yours 👇' },
  panchang: { hi: { today: 'आज का शुभ मुहूर्त और राहु काल ⏰', tomorrow: 'कल का शुभ मुहूर्त और राहु काल ⏰', other: '{d} का शुभ मुहूर्त और राहु काल ⏰' }, en: 'Shubh muhurat & Rahu Kaal {w} — save it 📌' },
  week: { hi: { any: 'इस हफ्ते आपकी राशि का शुभ दिन कौन सा? 🗓️' }, en: 'Your lucky day this week — find your sign 👇' },
  fest: { hi: { any: 'अगले 14 दिनों के त्योहार और व्रत 🪔' }, en: 'Festivals & vrats in the next 14 days — save the dates 📌' }
};
const RC_ASK = {
  day: '📌 Save करें और परिवार को भेजें 🙏 | Save & share with your family',
  rashifal: '👇 कमेंट में अपनी राशि लिखें | Comment your rashi',
  panchang: '📌 Save करें, दिन में काम आएगा | Save it for later today',
  week: '👇 कमेंट में अपनी राशि लिखें | Comment your rashi',
  fest: '👇 आप कौन सा व्रत रखेंगे? कमेंट करें | Which vrat will you keep?'
};
const RC_TAGS = {
  day: ['#panchang', '#पंचांग', null, '#astrology', '#grahavani'],
  rashifal: ['#rashifal', '#राशिफल', '#horoscope', '#astrology', '#grahavani'],
  panchang: ['#panchang', '#पंचांग', '#shubhmuhurat', '#jyotish', '#grahavani'],
  week: ['#weeklyhoroscope', '#साप्ताहिक_राशिफल', '#rashifal', '#astrology', '#grahavani'],
  fest: ['#hindufestivals', '#त्योहार', null, '#panchang', '#grahavani']
};
// A festival or vrat name from the English lines → one event hashtag (#diwali, #ekadashi, #chhathpuja …)
function eventTag(lines) {
  const all = (lines || []).join(' ').toLowerCase();
  for (const big of ['diwali', 'holi', 'navratri', 'dussehra', 'janmashtami', 'shivaratri', 'rakshabandhan', 'chhath', 'makarsankranti']) if (all.replace(/[^a-z]/g, '').includes(big)) return '#' + big; // the biggest festival in view wins
  const ln = (lines || []).find(x => /^(🪔|✨)/.test(x) && !/Festivals|What’s special|What's special/i.test(x)); if (!ln) return null;
  let name = ln.replace(/^(🪔|✨)\s*/, '').replace(/^[A-Za-z]{3},?\s*\d+\s+[A-Za-z]+\s*—\s*/, '').split(/[(·—]/)[0].trim();
  for (const k of ['ekadashi', 'purnima', 'amavasya', 'pradosh', 'sankashti', 'sankranti', 'navratri', 'shivaratri']) if (name.toLowerCase().includes(k)) return '#' + k;
  name = name.toLowerCase().replace(/[^a-z]/g, '');
  return name.length >= 4 && name.length <= 24 ? '#' + name : null;
}
function reelCaption(kind, caps, extra2, opts = {}) {
  const x = extra2 || {}, host = SITE_ORIGIN.replace(/^https?:\/\//, ''), ig = (window.KG_CONFIG && KG_CONFIG.social && KG_CONFIG.social.instagram) ? '@' + KG_CONFIG.social.instagram.handle : '';
  const rel = opts.date === opts.today ? 'today' : opts.date === opts.tomorrow ? 'tomorrow' : 'other';
  const dEn = opts.date ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(opts.date + 'T00:00:00Z')) : '';
  const dHi = opts.date ? new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(opts.date + 'T00:00:00Z')) : '';
  const H = RC_HOOK[kind], hiHook = (H.hi[rel] || H.hi.other || H.hi.any).replace('{d}', dHi), enHook = H.en.replace('{w}', rel === 'today' ? 'today' : rel === 'tomorrow' ? 'tomorrow' : 'on ' + dEn);
  // details (in English, with the times) and the language titles for search
  const lines = l => (caps[l] || '').split('\n'), pick = (l, re) => (lines(l).find(v => re.test(v)) || '').replace(/\s*#\S+/g, '').trim();
  let details = [];
  if (kind === 'rashifal') details = [pick('en', /^🌟/), pick('en', /^🙏/)].map(v => rel === 'today' ? v : v.replace(/\btoday\b/i, rel === 'tomorrow' ? 'tomorrow' : 'on ' + dEn));
  else if (kind === 'panchang') details = [pick('en', /^🪔/)];
  else details = ((x.en && x.en.lines) || []).filter(v => !/^• /.test(v) || kind !== 'day').slice(0, kind === 'fest' ? 9 : 7);
  if (kind === 'day') details = ((x.en && x.en.lines) || []).slice(0, 7).concat((x.en && x.en.muh && x.en.muh.length) ? ['', '🕉️ Best muhurat | श्रेष्ठ मुहूर्त:', ...x.en.muh] : []);
  const titles = kind === 'rashifal' ? (rel === 'today' ? SOC_LANGS.map(([l]) => pick(l, /^✨/)) : []) : kind === 'panchang' ? [] : SOC_LANGS.map(([l]) => x[l] && x[l].title);
  const evTag = eventTag((x.en && x.en.lines) || []) || (kind === 'day' ? '#rahukaal' : '#vrat');
  const tags = RC_TAGS[kind].map(v => v || evTag);
  const body = [
    hiHook, enHook, '',
    ...details.filter(Boolean), '',
    ...titles.filter(Boolean).slice(0, 2), '🗣️ हिन्दी · ગુજરાતી · தமிழ் · తెలుగు · ಕನ್ನಡ · English', '',
    RC_ASK[kind],
    `➕ Follow Grahavani${ig ? ' (Instagram ' + ig + ' · Facebook)' : ''} — रोज़ राशिफल और पंचांग | Daily Rashifal & Panchang`,
    `🔗 Free Kundali in 6 languages: ${host} (link in bio)`,
    '',
    tags.join(' ')
  ];
  return body.filter(v => v !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
// Festival wishes reel caption: greeting in Hindi + English, the blessings, the puja muhurat, greetings in the other
// languages, a comment prompt ("type Happy Diwali"), follow + site, then 5 hashtags
function wishCaption(x) {
  const hi = x.hi || {}, en = x.en || {}, host = SITE_ORIGIN.replace(/^https?:\/\//, ''), ig = (window.KG_CONFIG && KG_CONFIG.social && KG_CONFIG.social.instagram) ? '@' + KG_CONFIG.social.instagram.handle : '';
  if (!en.greet) return '…';
  const em = en.art === 'sun' ? '☀️' : en.art === 'colours' ? '🎨' : '🪔';
  const tags = (en.tags || []).slice(0, 3).concat('#indianfestival', '#grahavani');
  return [
    `${em} ${hi.greet}! ${en.greet}! ✨`, '',
    hi.bless, en.bless, '',
    ...(en.muh && en.muh.length && en.onDay ? [`🕉️ पूजा मुहूर्त | Puja muhurat (${en.city}):`, ...en.muh.map(v => '• ' + v), ''] : []),
    '🗣️ ' + ['gu', 'ta', 'te', 'kn'].map(l => x[l] && x[l].greet).filter(Boolean).join(' · '), '',
    `👇 कमेंट में "${hi.greet}" लिखें और अपनों को भेजें 🙏 | Type “${en.greet}” in the comments & share with your family`,
    `➕ Follow Grahavani${ig ? ' (Instagram ' + ig + ' · Facebook)' : ''} — रोज़ राशिफल और पंचांग | Daily Rashifal & Panchang`,
    `🔗 Free Kundali in 6 languages: ${host} (link in bio)`, '',
    tags.join(' ')
  ].filter(v => v != null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function socialPanel(body) {
  const td = todayIn(330), today = isoDay(td.y, td.m, td.d);
  const st = { date: today, city: store.get('gv-soc-city') || 'New Delhi', fmt: 'story', caps: {}, xcaps: { week: {}, fest: {}, day: {} }, wish: null, wishes: [], wcaps: {}, nu: { n: 1, b: 1, y: new Date().getMonth() >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear(), ym: (() => { const d = new Date(); d.setDate(1); if (new Date().getDate() >= 20) d.setMonth(d.getMonth() + 1); return d.getFullYear() + '-' + (d.getMonth() + 1); })() }, yt: { theme: 'sign', dur: 60, sign: 0, planet: 'Saturn', bSign: 0, gSign: 4, purpose: 'marriage', topic: 'career', vrat: 'ekadashi', dream: 'snake', lang: 'all', cap: null } };
  const REELS = ['day', 'rashifal', 'panchang', 'week', 'fest'];
  const plus = n => { const x = new Date(Date.UTC(td.y, td.m - 1, td.d + n)); return isoDay(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); };
  const nextMon = (() => { const wd = new Date(Date.UTC(td.y, td.m - 1, td.d)).getUTCDay(); return plus(((8 - wd) % 7) || 7); })();
  const QUICK = [['today', today], ['tomorrow', plus(1)], ['dayAfter', plus(2)], ['nextWeek', nextMon]];
  st.music = store.get('gv-soc-music') || 'om-dhyan';
  const reelOk = typeof VideoEncoder === 'function';
  body.innerHTML = `<div class="seg soc-quick" role="group" id="soc-quick" aria-label="${esc(t('socad.date'))}">${QUICK.map(([k, v]) => `<button type="button" data-d="${v}" aria-pressed="${v === st.date}">${esc(t('socad.q.' + k))}</button>`).join('')}</div>
    <div class="soc-bar"><div class="field"><label for="soc-date">${esc(t('socad.date'))}</label><input id="soc-date" type="date" value="${st.date}"></div>
    <div class="field"><label for="soc-city">${esc(t('socad.city'))}</label><select id="soc-city">${SOC_CITIES.map(([n]) => `<option${n === st.city ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>
    <h3 class="sub-h soc-h">${ic('i-image')}${esc(t('socad.reelsH'))}</h3><p class="muted small">${esc(t('socad.reelsLede'))}</p>
    ${reelOk ? '' : `<p class="err">${esc(t('socad.noReel'))}</p>`}
    <div class="soc-music card"><div class="field"><label for="soc-music">${esc(t('socad.music'))}</label><select id="soc-music">${SOC_MUSIC.map(([id, key]) => `<option value="${id}"${id === st.music ? ' selected' : ''}>${esc(t('socad.tracks.' + key))}</option>`).join('')}</select></div>
      <button type="button" class="btn-line" id="soc-play">${ic('i-speaker')}<span>${esc(t('socad.preview'))}</span></button><audio id="soc-audio" preload="none"></audio></div>
    <section class="card soc-notice" id="soc-notice" style="display:none"></section>
    <section class="card soc-reel soc-combo" data-reel="combo">
      <h4>✨ All-in-One Daily Reel (Special Day + Rashifal 12 Signs + Panchang)</h4>
      <p class="muted small">Merges today's Special Day (events, best muhurat &amp; precautions), all 12 Rashifal signs, and Daily Panchang into one 42s+ reel with Hindi TTS voiceover.</p>
      <div class="field" style="max-width:220px"><label for="soc-combo-lang">Language</label><select id="soc-combo-lang">${SOC_LANGS.map(([c, n]) => `<option value="${c}"${c === 'hi' ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
      <div class="soc-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
      <div class="soc-acts"><button type="button" class="btn-cta" data-make="combo"${reelOk ? '' : ' disabled'}>${ic('i-image')}Make All-in-One Daily Reel (MP4)</button></div>
      <textarea class="soc-cap" rows="9" readonly id="soc-combo-cap">…</textarea>
      <div class="soc-row-btns">
        <button type="button" class="btn-line soc-copy" id="soc-combo-copy">${ic('i-doc')}${esc(t('socad.copy'))}</button>
        <button type="button" class="btn-line soc-speak" data-speak="combo">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
      </div>
    </section>
    <h3 class="sub-h soc-h">${ic('i-image')}${esc(t('socad.yt.h'))}</h3><p class="muted small">${esc(t('socad.yt.lede'))}</p>
    <section class="card soc-reel soc-yt" data-reel="yt">
      <div class="soc-row">
        <div class="field"><label for="soc-yt-theme">${esc(t('socad.yt.theme'))}</label><select id="soc-yt-theme">
          <optgroup label="✨ Astrology Modules / कुंडली एवं ज्योतिष">
            <option value="sign">${esc(t('socad.yt.tSign'))}</option>
            <option value="transit">${esc(t('socad.yt.tTransit'))}</option>
            <option value="match">${esc(t('socad.yt.tMatch'))}</option>
            <option value="gem">${esc(t('socad.yt.tGem'))}</option>
            <option value="muhurta">${esc(t('socad.yt.tMuhurta'))}</option>
            <option value="prashna">${esc(t('socad.yt.tPrashna'))}</option>
            <option value="vrat">${esc(t('socad.yt.tVrat'))}</option>
            <option value="names">${esc(t('socad.yt.tNames'))}</option>
            <option value="dream">${esc(t('socad.yt.tDream'))}</option>
            <option value="dasha">${esc(t('socad.yt.tDasha'))}</option>
          </optgroup>
          <optgroup label="🎬 Reel Contents as Shorts / सभी रील्स">
            <option value="day">${esc(t('socad.yt.tDay'))}</option>
            <option value="rashifal">${esc(t('socad.yt.tRashifal'))}</option>
            <option value="panchang">${esc(t('socad.yt.tPanchang'))}</option>
            <option value="week">${esc(t('socad.yt.tWeek'))}</option>
            <option value="fest">${esc(t('socad.yt.tFest'))}</option>
            <option value="wish">✨ ${esc(t('socad.reel.wish'))}</option>
            <option value="nuall">${esc(t('socad.yt.tNuall'))}</option>
            <option value="numonth">${esc(t('socad.yt.tNumonth'))}</option>
            <option value="mulank">${esc(t('socad.yt.tMulank'))}</option>
            <option value="bhagyank">${esc(t('socad.yt.tBhagyank') || '✨ Numerology: Single Bhagyank')}</option>
          </optgroup>
        </select></div>
        <div class="field"><label for="soc-yt-dur">⏱️ Shorts Duration / लंबाई</label><select id="soc-yt-dur">
          <option value="60" selected>1 Minute (~60s - Recommended)</option>
          <option value="90">1.5 Minutes (~90s)</option>
          <option value="120">2 Minutes (~120s)</option>
          <option value="30">Quick Short (~30s)</option>
        </select></div>
        <div class="field"><label for="soc-yt-lang">${esc(t('socad.yt.lang'))}</label><select id="soc-yt-lang">
          <option value="all" selected>🌐 All 6 Languages in 1 Short / सभी 6 भाषाएं (एक ही शॉर्ट में)</option>
          <option value="hi">हिन्दी (Hindi only)</option>
          <option value="en">English only</option>
          <option value="gu">ગુજરાતી (Gujarati only)</option>
          <option value="ta">தமிழ் (Tamil only)</option>
          <option value="te">తెలుగు (Telugu only)</option>
          <option value="kn">ಕನ್ನಡ (Kannada only)</option>
        </select></div>
      </div>
      <div class="field soc-yt-ctrl" id="soc-yt-f-sign"><label for="soc-yt-sign">${esc(t('socad.yt.sign'))}</label><select id="soc-yt-sign">${(L.names.rashi || []).map((rName, i) => `<option value="${i}">${esc(rName)}</option>`).join('')}</select></div>
      <div class="soc-row soc-yt-ctrl" id="soc-yt-f-match" style="display:none">
        <div class="field"><label for="soc-yt-bsign">${esc(t('socad.yt.boySign'))}</label><select id="soc-yt-bsign">${(L.names.rashi || []).map((rName, i) => `<option value="${i}">${esc(rName)}</option>`).join('')}</select></div>
        <div class="field"><label for="soc-yt-gsign">${esc(t('socad.yt.girlSign'))}</label><select id="soc-yt-gsign">${(L.names.rashi || []).map((rName, i) => `<option value="${i}"${i === 4 ? ' selected' : ''}>${esc(rName)}</option>`).join('')}</select></div>
      </div>
      <div class="field soc-yt-ctrl" id="soc-yt-f-planet" style="display:none"><label for="soc-yt-planet">${esc(t('socad.yt.dashaPlanet'))}</label><select id="soc-yt-planet">${['Saturn', 'Jupiter', 'Rahu', 'Sun', 'Moon', 'Mars', 'Mercury', 'Ketu', 'Venus'].map(p => `<option value="${p}">${esc((L.names.graha && L.names.graha[p]) ? `${L.names.graha[p]} (${p})` : p)}</option>`).join('')}</select></div>
      <div class="field soc-yt-ctrl" id="soc-yt-f-purpose" style="display:none"><label for="soc-yt-purpose">${esc(t('socad.yt.muhurtaPurpose'))}</label><select id="soc-yt-purpose">
        <option value="marriage">${esc(t('sc.mu.marriage'))}</option>
        <option value="griha">${esc(t('sc.mu.griha'))}</option>
        <option value="vehicle">${esc(t('sc.mu.vehicle'))}</option>
        <option value="business">${esc(t('sc.mu.business'))}</option>
        <option value="namkaran">${esc(t('sc.mu.namkaran'))}</option>
        <option value="mundan">${esc(t('sc.mu.mundan'))}</option>
      </select></div>
      <div class="field soc-yt-ctrl" id="soc-yt-f-topic" style="display:none"><label for="soc-yt-topic">${esc(t('socad.yt.prashnaTopic'))}</label><select id="soc-yt-topic">
        <option value="career">${esc(t('sc.pr.career'))}</option>
        <option value="marriage">${esc(t('sc.pr.marriage'))}</option>
        <option value="money">${esc(t('sc.pr.money'))}</option>
        <option value="health">${esc(t('sc.pr.health'))}</option>
        <option value="travel">${esc(t('sc.pr.travel'))}</option>
      </select></div>
      <div class="field soc-yt-ctrl" id="soc-yt-f-vrat" style="display:none"><label for="soc-yt-vrat">${esc(t('socad.yt.vratType'))}</label><select id="soc-yt-vrat">
        <option value="ekadashi">${esc(t('sc.vr.ekadashi'))}</option>
        <option value="pradosh">${esc(t('sc.vr.pradosh'))}</option>
        <option value="sankashti">${esc(t('sc.vr.sankashti'))}</option>
        <option value="purnima">${esc(t('sc.vr.purnima'))}</option>
        <option value="shivratri">${esc(t('sc.vr.shivratri'))}</option>
      </select></div>
      <div class="field soc-yt-ctrl" id="soc-yt-f-dream" style="display:none"><label for="soc-yt-dream">${esc(t('socad.yt.dreamTopic'))}</label><select id="soc-yt-dream">
        <option value="snake">${esc(t('sc.dr.snake'))}</option>
        <option value="temple">${esc(t('sc.dr.temple'))}</option>
        <option value="gold">${esc(t('sc.dr.gold'))}</option>
        <option value="water">${esc(t('sc.dr.water'))}</option>
        <option value="elephant">${esc(t('sc.dr.elephant'))}</option>
        <option value="flying">${esc(t('sc.dr.flying'))}</option>
        <option value="fire">${esc(t('sc.dr.fire'))}</option>
      </select></div>
      <div class="soc-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
      <div class="soc-acts"><button type="button" class="btn-cta" data-make="yt"${reelOk ? '' : ' disabled'}>${ic('i-image')}${esc(t('socad.yt.make'))}</button></div>
      <textarea class="soc-cap" rows="8" readonly id="soc-yt-cap">…</textarea>
      <div class="soc-row-btns">
        <button type="button" class="btn-line soc-copy" id="soc-yt-copy">${ic('i-doc')}${esc(t('socad.yt.copy'))}</button>
        <button type="button" class="btn-line soc-speak" data-speak="yt">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
      </div>
    </section>
    <section class="card soc-sched" id="soc-sched">
      <h4>📅 Reel Posting Schedule (Today · Tomorrow · Sun–Sat)</h4>
      <p class="muted small">Suggested 2 reels/day: 8:00 AM (Daily / Transit / Chandrashtama) &amp; 7:00 PM (Samudrika / Kundali / Engagement). Chandrashtama updates automatically for the selected week.</p>
      <div id="soc-sched-body"></div>
    </section>
    <section class="card soc-topics" id="soc-topics">
      <h4>🎬 All 52 Reel Topics &amp; Voiceover Studio</h4>
      <p class="muted small">Pick any of the 52 topics across all Grahavani modules to generate an animated light-theme MP4 reel right here, preview Hindi voiceover, or copy the CLI TTS command.</p>
      <div class="soc-row">
        <div class="field"><label for="soc-top-cat">Category</label><select id="soc-top-cat">
          <option value="all">All 52 Topics</option>
          <option value="Daily & Weekly">Daily &amp; Weekly (10)</option>
          <option value="Rashi Events">Rashi Events &amp; Gochar (10)</option>
          <option value="Kundali & Dosha">Kundali, Dosha &amp; Timing (12)</option>
          <option value="Numerology & Match">Numerology &amp; Match (6)</option>
          <option value="Samudrika & Divination">Samudrika &amp; Divination (9)</option>
          <option value="Spiritual & Utility">Spiritual &amp; Utility (5)</option>
        </select></div>
        <div class="field"><label for="soc-top-id">Topic</label><select id="soc-top-id"></select></div>
      </div>
      <div class="soc-vid" id="soc-top-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
      <div class="soc-acts" id="soc-top-acts">
        <button type="button" class="btn-cta" id="soc-top-make"${reelOk ? '' : ' disabled'}>${ic('i-image')}Make Reel (MP4)</button>
        <button type="button" class="btn-line" id="soc-top-cmd">${ic('i-doc')}Copy CLI</button>
        <button type="button" class="btn-line soc-speak" id="soc-top-speak">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
        <button type="button" class="btn-line soc-copy" id="soc-top-cap-copy">${ic('i-doc')}Copy Caption</button>
      </div>
      <label class="small muted" for="soc-top-script" style="display:block;margin-top:6px">Hindi Voiceover Script (TTS in MP4 — min 3 lines)</label>
      <textarea class="soc-cap" rows="5" readonly id="soc-top-script"></textarea>
      <label class="small muted" for="soc-top-cap" style="display:block;margin-top:6px">Instagram / Facebook Caption (5 Hashtags + Keywords)</label>
      <textarea class="soc-cap" rows="8" readonly id="soc-top-cap"></textarea>
    </section>
    <section class="card soc-reply soc-chan"><h4>${esc(t('socad.chan.h'))}</h4><p class="muted small">${esc(t('socad.chan.lede'))}</p>
      <textarea class="soc-cap" rows="9" readonly id="soc-chan">…</textarea>
      <div class="soc-row-btns">
        <button type="button" class="btn-line soc-copy" id="soc-ccopy">${ic('i-doc')}${esc(t('socad.copy'))}</button>
        <button type="button" class="btn-line soc-speak" data-speak="chan">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
      </div>
    </section>
    <section class="card soc-reel soc-wish" data-reel="wish"><h4>${esc(t('socad.reel.wish'))}</h4><p class="muted small">${esc(t('socad.wishLede'))}</p>
      <div class="field"><label for="soc-wfest">${esc(t('socad.wishFest'))}</label><select id="soc-wfest"><option>…</option></select></div>
      <div class="soc-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
      <div class="soc-acts"><button type="button" class="btn-cta" data-make="wish"${reelOk ? '' : ' disabled'}>${ic('i-image')}${esc(t('socad.make'))}</button></div>
      <textarea class="soc-cap" rows="7" readonly data-rcap="wish">…</textarea>
      <div class="soc-row-btns">
        <button type="button" class="btn-line soc-copy" data-rcopy="wish">${ic('i-doc')}${esc(t('socad.copyBoth'))}</button>
        <button type="button" class="btn-line soc-speak" data-speak="wish">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
      </div>
    </section>
    <section class="card soc-nu"><h4>${esc(t('socad.nu.h'))}</h4><p class="muted small">${esc(t('socad.nu.lede'))}</p>
      <div class="field"><label for="soc-nuy">${esc(t('socad.nu.year'))}</label><select id="soc-nuy">${[0, 1].map(k => { const y = new Date().getFullYear() + k; return `<option value="${y}"${y === st.nu.y ? ' selected' : ''}>${y}</option>`; }).join('')}</select></div>
      <div class="soc-reels">
        <section class="card soc-reel soc-nur" data-reel="nuall"><h4>${esc(t('socad.nu.all'))}</h4>
          <div class="soc-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
          <div class="soc-acts"><button type="button" class="btn-cta" data-make="nuall"${reelOk ? '' : ' disabled'}>${ic('i-image')}${esc(t('socad.make'))}</button></div>
          <textarea class="soc-cap" rows="7" readonly data-rcap="nuall">…</textarea>
          <div class="soc-row-btns">
            <button type="button" class="btn-line soc-copy" data-rcopy="nuall">${ic('i-doc')}${esc(t('socad.copyBoth'))}</button>
            <button type="button" class="btn-line soc-speak" data-speak="nuall">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
          </div>
        </section>
        <section class="card soc-reel soc-nur" data-reel="numonth"><h4>${esc(t('socad.nu.month'))}</h4>
          <div class="field"><label for="soc-num">${esc(t('socad.nu.monthSel'))}</label><select id="soc-num">${Array.from({ length: 12 }, (_, k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + k); const v = d.getFullYear() + '-' + (d.getMonth() + 1); return `<option value="${v}"${v === st.nu.ym ? ' selected' : ''}>${esc(new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(d))}</option>`; }).join('')}</select></div>
          <div class="soc-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
          <div class="soc-acts"><button type="button" class="btn-cta" data-make="numonth"${reelOk ? '' : ' disabled'}>${ic('i-image')}${esc(t('socad.make'))}</button></div>
          <textarea class="soc-cap" rows="7" readonly data-rcap="numonth">…</textarea>
          <div class="soc-row-btns">
            <button type="button" class="btn-line soc-copy" data-rcopy="numonth">${ic('i-doc')}${esc(t('socad.copyBoth'))}</button>
            <button type="button" class="btn-line soc-speak" data-speak="numonth">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
          </div>
        </section>
        <section class="card soc-reel soc-nur" data-reel="mulank"><h4>${esc(t('socad.nu.one'))}</h4>
          <div class="field"><label for="soc-nun">${esc(t('socad.nu.num'))}</label><select id="soc-nun">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<option value="${n}">${esc(t('socad.nu.num'))} ${n}</option>`).join('')}</select></div>
          <div class="soc-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
          <div class="soc-acts"><button type="button" class="btn-cta" data-make="mulank"${reelOk ? '' : ' disabled'}>${ic('i-image')}${esc(t('socad.make'))}</button></div>
          <textarea class="soc-cap" rows="7" readonly data-rcap="mulank">…</textarea>
          <div class="soc-row-btns">
            <button type="button" class="btn-line soc-copy" data-rcopy="mulank">${ic('i-doc')}${esc(t('socad.copyBoth'))}</button>
            <button type="button" class="btn-line soc-speak" data-speak="mulank">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
          </div>
        </section>
        <section class="card soc-reel soc-nur" data-reel="bhagyank"><h4>${esc(t('socad.nu.bhagyank') || 'Bhagyank reel')}</h4>
          <div class="field"><label for="soc-nub">${esc(t('socad.nu.bhagyankNum') || 'Bhagyank')}</label><select id="soc-nub">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<option value="${n}">${esc(t('socad.nu.bhagyankNum') || 'Bhagyank')} ${n}</option>`).join('')}</select></div>
          <div class="soc-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
          <div class="soc-acts"><button type="button" class="btn-cta" data-make="bhagyank"${reelOk ? '' : ' disabled'}>${ic('i-image')}${esc(t('socad.make'))}</button></div>
          <textarea class="soc-cap" rows="7" readonly data-rcap="bhagyank">…</textarea>
          <div class="soc-row-btns">
            <button type="button" class="btn-line soc-copy" data-rcopy="bhagyank">${ic('i-doc')}${esc(t('socad.copyBoth'))}</button>
            <button type="button" class="btn-line soc-speak" data-speak="bhagyank">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
          </div>
        </section>
      </div>
      <section class="card soc-reply"><h4>${esc(t('socad.nu.replyH'))}</h4><p class="muted small">${esc(t('socad.nu.replyLede'))}</p>
        <div class="soc-row"><div class="field"><label for="soc-dob">${esc(t('socad.nu.dob'))}</label><input id="soc-dob" inputmode="numeric" placeholder="16-08-1995" autocomplete="off"></div>
        <div class="field"><label for="soc-rl">${esc(t('socad.nu.replyLang'))}</label><select id="soc-rl">${SOC_LANGS.map(([l, n]) => `<option value="${l}">${esc(n)}</option>`).join('')}</select></div></div>
        <textarea class="soc-cap" rows="5" readonly id="soc-reply"></textarea>
        <div class="soc-row-btns">
          <button type="button" class="btn-line soc-copy" id="soc-rcopy">${ic('i-doc')}${esc(t('socad.copy'))}</button>
          <button type="button" class="btn-line soc-speak" data-speak="reply">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
        </div>
      </section>
    </section>
    <div class="soc-reels">${REELS.map(k => `<section class="card soc-reel" data-reel="${k}"><h4>${esc(t('socad.reel.' + k))}</h4>
      <div class="soc-vid"><p class="muted small">${esc(t('socad.reelHint'))}</p></div>
      <div class="soc-acts"><button type="button" class="btn-cta" data-make="${k}"${reelOk ? '' : ' disabled'}>${ic('i-image')}${esc(t('socad.make'))}</button></div>
      <textarea class="soc-cap" rows="7" readonly data-rcap="${k}">…</textarea>
      <div class="soc-row-btns">
        <button type="button" class="btn-line soc-copy" data-rcopy="${k}">${ic('i-doc')}${esc(t('socad.copyBoth'))}</button>
        <button type="button" class="btn-line soc-speak" data-speak="${k}">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
      </div>
    </section>`).join('')}</div>
    <h3 class="sub-h soc-h">${ic('i-download')}${esc(t('socad.imagesH'))}</h3>
    <div class="seg" role="group" id="soc-fmt"><button type="button" data-fmt="story" aria-pressed="true">${esc(t('sc.story'))}</button><button type="button" data-fmt="post" aria-pressed="false">${esc(t('sc.post'))}</button></div>
    <div id="soc-grid" class="soc-grid"></div>`;
  const cityQ = () => { const c = SOC_CITIES.find(x => x[0] === st.city) || SOC_CITIES[0]; return encodeURIComponent(`${c[0]}|${c[1]}|${c[2]}|330`); };
  const img = (kind, lang, fmt = st.fmt) => apiUrl(`/api/social/?img=${kind}&fmt=${fmt}&lang=${lang}&date=${st.date}${/^(panchang|fest|day)/.test(kind) ? '&city=' + cityQ() : ''}`);
  const resetReels = (sel = '.soc-reel:not(.soc-wish)') => $$(sel).forEach(s => { const v = s.querySelector('.soc-vid'); if (v.dataset.url) URL.revokeObjectURL(v.dataset.url); v.dataset.url = ''; v.innerHTML = `<p class="muted small">${esc(t('socad.reelHint'))}</p>`; s.querySelectorAll('.soc-dl,.soc-share').forEach(x => x.remove()); });
  const draw = async () => { drawChan();
    $('#soc-grid').innerHTML = SOC_LANGS.map(([l, name]) => `<section class="card soc-lang"><h4>${esc(name)}</h4><div class="soc-imgs ${st.fmt}">${['rashifal', 'panchang'].map(k => `<a href="${img(k, l)}" download="${k}-${l}-${st.date}-${st.fmt}.png" title="${esc(t('cc.download'))}"><img loading="lazy" src="${img(k, l)}" alt="${k} ${l}"><span>${ic('i-download')}${esc(t(k === 'rashifal' ? 'socad.rashifal' : 'socad.panchang'))}</span></a>`).join('')}</div>
      <textarea class="soc-cap" rows="6" readonly data-cap="${l}">…</textarea>
      <div class="soc-row-btns">
        <button type="button" class="btn-line soc-copy" data-copy="${l}">${ic('i-doc')}${esc(t('socad.copy'))}</button>
        <button type="button" class="btn-line soc-speak" data-speak="grid_${l}">${ic('i-speaker')}<span>${esc(t('socad.speakHindi'))}</span></button>
      </div></section>`).join('');
    const want = st.date + st.city;
    await Promise.all(SOC_LANGS.map(async ([l]) => {
      try { const r = await api(`/api/social/?caption=1&lang=${l}&date=${st.date}&city=${cityQ()}`); st.caps[l] = r.caption; const ta = $(`[data-cap="${l}"]`); if (ta) ta.value = r.caption; } catch (e) { }
    }));
    await Promise.all(['week', 'fest', 'day'].flatMap(k => SOC_LANGS.map(async ([l]) => {
      try { st.xcaps[k][l] = await api(`/api/social/?caption=1&kind=${k}&lang=${l}&date=${st.date}&city=${cityQ()}`); } catch (e) { }
    })));
    if (want !== st.date + st.city) return;
    const copt = { date: st.date, today, tomorrow: plus(1) };
    const kTags = {
      day: '#shubhmuhurat #aajkapanchang #specialday #vedicastrology #grahavani',
      rashifal: '#aajkarashifal #rashifal #horoscopetoday #vedicastrology #grahavani',
      panchang: '#dainikpanchang #rahukaal #abhijitmuhurat #vedicastrology #grahavani',
      week: '#weeklyrashifal #saptahikrashifal #rashifal #vedicastrology #grahavani',
      fest: '#vrattyohar #hindufestivals #ekadashi #vedicastrology #grahavani'
    };
    REELS.forEach(k => {
      const ta = $(`[data-rcap="${k}"]`);
      if (ta) ta.value = upgradeCapLike52(reelCaption(k, st.caps, st.xcaps[k], copt), t('socad.reel.' + k) || k, `${k}, ${t('socad.reel.' + k) || k}, daily panchang`, kTags[k] || '#vedicastrology #jyotish #aajkarashifal #shubhmuhurat #grahavani');
    });
  };
  const drawWish = async () => {
    const ta = $('[data-rcap="wish"]'); if (!st.wish) { ta.value = '…'; return; }
    const want = st.wish.id + st.wish.date + st.city; ta.value = '…';
    await Promise.all(SOC_LANGS.map(async ([l]) => { try { st.wcaps[l] = await api(`/api/social/?caption=1&kind=wish&lang=${l}&date=${st.wish.date}&fest=${st.wish.id}&city=${cityQ()}`); } catch (e) { st.wcaps[l] = null; } }));
    if (want === st.wish.id + st.wish.date + st.city) ta.value = upgradeCapLike52(wishCaption(st.wcaps), st.wish.name + ' Wishes', `${st.wish.name}, festival wishes, puja muhurat ${st.wish.date}`, '#hindufestival #shubhkamnaye #vratkatha #vedicastrology #grahavani');
  };
  const loadWishes = async () => {
    const sel = $('#soc-wfest');
    try { st.wishes = (await api(`/api/social/?caption=1&kind=wishlist&lang=en&date=${today}&city=${cityQ()}`)).list || []; } catch (e) { st.wishes = []; }
    if (!st.wishes.length) { sel.innerHTML = `<option>${esc(t('socad.wishNone'))}</option>`; return; }
    const fmtD = d => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'UTC' }).format(new Date(d + 'T00:00:00Z'));
    sel.innerHTML = st.wishes.map((w, i) => `<option value="${i}">${esc(fmtD(w.date) + ' — ' + w.name + (w.known ? '' : ' ' + t('socad.wishOther')))}</option>`).join('');
    st.wish = st.wishes.find(w => w.known) || st.wishes[0]; sel.value = String(st.wishes.indexOf(st.wish));
    drawWish();
  };
  const drawChan = () => { const ta = $('#soc-chan'); ta.value = '…'; api(`/api/social/?caption=1&kind=channel&date=${st.date}&city=${cityQ()}`).then(r => { ta.value = upgradeCapLike52(r.text, `Morning Message · ${st.date}`, `morning rashifal, daily panchang, shubh muhurat`, '#goodmorning #aajkarashifal #dainikpanchang #vedicastrology #grahavani'); }).catch(() => { ta.value = '—'; }); };
  const drawNu = async () => {
    const [my, mm] = st.nu.ym.split('-');
    for (const [k, q] of [['nuall', 'mode=all'], ['mulank', `mode=one&n=${st.nu.n}`], ['bhagyank', `mode=bhagyank&n=${st.nu.b}`], ['numonth', `mode=month&m=${mm}`]]) {
      const ta = $(`[data-rcap="${k}"]`); if (ta) ta.value = '…';
      api(`/api/social/?caption=1&kind=nu&${q}&y=${k === 'numonth' ? my : st.nu.y}`).then(r => {
        if (ta) ta.value = upgradeCapLike52(r.caption, `Numerology ${k.toUpperCase()}`, `numerology, mulank ${st.nu.n}, bhagyank ${st.nu.b}, ank jyotish ${st.nu.y}`, '#numerology #mulank #bhagyank #ankjyotish #grahavani');
      }).catch(() => { if (ta) ta.value = '—'; });
    }
  };
  let rTimer;
  const upgradeCapLike52 = (raw, title, extraKeywords, tags5) => {
    const host = location.origin;
    const cleanLines = String(raw || '').split('\n').map(s => s.trim()).filter(s => s && !/^#/.test(s) && !/^Keywords:/i.test(s));
    const body = cleanLines.slice(0, 6).join('\n');
    return [
      `✨ ${title} (${st.date})`,
      '',
      body,
      `🪔 ग्रहवाणी (Grahavani) पर सटीक पंचांग, राशिफल, मुहूर्त, कुंडली और वैदिक उपाय 6 भाषाओं में बिल्कुल मुफ़्त देखें।`,
      '',
      `👇 कमेंट में अपनी राशि या जन्म तिथि लिखें और अपनों के साथ शेयर करें 🙏`,
      `🔗 Free Vedic Kundali & Tools: ${host} (Link in Bio)`,
      '',
      `${extraKeywords}, grahavani, vedic astrology, jyotish in hindi, free kundali online, aaj ka rashifal, daily panchang, shubh muhurat ${st.date}, rahu kaal today, indian astrology, horoscope today, kundali matching, numerology mulank bhagyank, samudrika shastra, graha gochar, vastu tips, hindu calendar`,
      '',
      tags5
    ].join('\n');
  };
  const drawReply = () => {
    clearTimeout(rTimer); const out = $('#soc-reply'), v = $('#soc-dob').value.trim();
    if (!v) { out.value = ''; return; }
    rTimer = setTimeout(() => api(`/api/social/?caption=1&kind=reply&dob=${encodeURIComponent(v)}&lang=${$('#soc-rl').value}&y=${st.nu.y}`).then(r => { out.value = r.text; }).catch(() => { out.value = t('socad.nu.bad'); }), 350);
  };
  async function makeReel(kind, btn) {
    const sec = btn.closest('.soc-reel'), box = sec.querySelector('.soc-vid');
    btn.disabled = true; sec.querySelectorAll('.soc-dl,.soc-share').forEach(x => x.remove());
    box.innerHTML = `<div class="soc-prog"><i style="width:0%"></i></div><p class="muted small" data-ptext>${esc(t('socad.loading'))}</p>`;
    try {
      await loadScript('/assets/mp4-muxer.js?v=' + ASSET_V); await loadScript('/assets/reelmaker.js?v=' + ASSET_V); // versioned so phones never mix an old maker with a new page
      const card = (k, l) => { const u = img(k, l, 'story') + '&theme=modern'; return { full: u, base: u + '&part=base' }; };
      const music = st.music && st.music !== 'none' ? '/music/' + st.music : null; // reelmaker adds .aac / tails
      const muh3 = kind === 'day' && !!(st.xcaps.day.en && st.xcaps.day.en.hasFest); // festival / vrat day: a third card with the best muhurats
      const wcard = l => { const u = apiUrl(`/api/social/?img=wish&fmt=story&lang=${l}&date=${st.wish.date}&fest=${st.wish.id}&city=${cityQ()}&theme=modern`); return { full: u, base: u + '&part=base' }; };
      const [nmy, nmm] = st.nu.ym.split('-'), mq = kind === 'numonth' ? `&y=${nmy}&m=${nmm}` : `&y=${st.nu.y}`;
      const ncard = (k, l) => { const num = k.startsWith('bhagyank') ? st.nu.b : st.nu.n; const u = apiUrl(`/api/social/?img=${k}&fmt=story&lang=${l}&date=${st.date}&n=${num}${mq}&theme=modern`); return { full: u, base: u + '&part=base' }; };
      const ycard = (k, l) => { const u = apiUrl(`/api/social/?img=${k}&fmt=story&lang=${l}&date=${st.date}&sign=${st.yt.sign}&bSign=${st.yt.bSign}&gSign=${st.yt.gSign}&planet=${st.yt.planet}&purpose=${st.yt.purpose}&topic=${st.yt.topic}&vrat=${st.yt.vrat}&dream=${st.yt.dream}&city=${cityQ()}&theme=modern`); return { full: u, base: u + '&part=base' }; };
      const ytLangs = st.yt.lang === 'all' ? SOC_LANGS.map(([l]) => l) : [st.yt.lang];
      const ytTh = st.yt.theme;
      let ytCards, ytPer = 2, ytHold = 3.4;
      const targetSec = st.yt.dur || 60;
      if (ytTh === 'rashifal') {
        ytCards = ytLangs.flatMap(l => [card('rashifal', l), card('rashifal2', l)]);
      } else if (ytTh === 'panchang') {
        ytCards = ytLangs.flatMap(l => [card('panchang', l), card('panchang2', l)]);
      } else if (ytTh === 'day') {
        ytCards = ytLangs.flatMap(l => [card('day', l), card('day2', l), ...(muh3 ? [card('day3', l)] : [])]);
        if (muh3) ytPer = 3;
      } else if (ytTh === 'week') {
        ytCards = ytLangs.flatMap(l => [card('week', l), card('week2', l)]);
      } else if (ytTh === 'fest') {
        ytCards = ytLangs.flatMap(l => [card('fest', l), card('fest2', l)]);
      } else if (ytTh === 'wish') {
        if (!st.wish) throw new Error(t('socad.wishNone'));
        ytCards = ytLangs.map(l => wcard(l));
        ytPer = 1;
      } else if (ytTh === 'nuall') {
        ytCards = ytLangs.map(l => ncard('nuall', l)).concat(ncard('nucta', 'hi'));
        ytPer = 1;
      } else if (ytTh === 'numonth') {
        ytCards = ytLangs.flatMap(l => [ncard('numonth', l), ncard('numonth2', l)]).concat(ncard('nucta', 'hi'));
      } else if (ytTh === 'mulank') {
        ytCards = ytLangs.flatMap(l => [ncard('mulank', l), ncard('mulank2', l)]);
      } else if (ytTh === 'bhagyank') {
        ytCards = ytLangs.flatMap(l => [ncard('bhagyank', l), ncard('bhagyank2', l)]);
      } else {
        ytCards = ytLangs.flatMap(l => [ycard(ytTh, l), ycard(ytTh + '2', l)]);
      }
      if (targetSec >= 60 && ytCards.length) {
        const rawHold = (targetSec - 5) / ytCards.length - 1.2;
        ytHold = Math.min(18, Math.max(1.8, Math.round(rawHold * 10) / 10));
      } else if (targetSec <= 30 && ytCards.length) {
        const rawHold = (30 - 5) / ytCards.length - 1.2;
        ytHold = Math.min(18, Math.max(1.2, Math.round(rawHold * 10) / 10));
      }
      if (kind === 'wish' && !st.wish) throw new Error(t('socad.wishNone'));
      const cLang = ($('#soc-combo-lang') && $('#soc-combo-lang').value) || 'hi';
      const comboCards = [card('day', cLang), card('day2', cLang), ...(muh3 ? [card('day3', cLang)] : []), card('rashifal', cLang), card('rashifal2', cLang), card('panchang', cLang), card('panchang2', cLang)];
      const res = await window.GVReel.make({
        cards: kind === 'combo' ? comboCards : kind === 'yt' ? ytCards : kind === 'numonth' ? SOC_LANGS.flatMap(([l]) => [ncard('numonth', l), ncard('numonth2', l)]).concat(ncard('nucta', 'hi')) : kind === 'nuall' ? SOC_LANGS.map(([l]) => ncard('nuall', l)).concat(ncard('nucta', 'hi')) : kind === 'mulank' ? SOC_LANGS.flatMap(([l]) => [ncard('mulank', l), ncard('mulank2', l)]) : kind === 'bhagyank' ? SOC_LANGS.flatMap(([l]) => [ncard('bhagyank', l), ncard('bhagyank2', l)]) : kind === 'wish' ? SOC_LANGS.map(([l]) => wcard(l)) : SOC_LANGS.flatMap(([l]) => [card(kind, l), card(kind + '2', l), ...(muh3 ? [card('day3', l)] : [])]), per: kind === 'combo' ? (muh3 ? 3 : 2) : kind === 'yt' ? ytPer : kind === 'wish' || kind === 'nuall' ? 1 : muh3 ? 3 : 2, hold: kind === 'combo' ? 4.5 : kind === 'yt' ? ytHold : kind === 'wish' ? 4.5 : kind === 'nuall' ? 4.5 : undefined, outro: card('outro', (kind === 'combo' ? cLang : kind === 'yt' ? ytLangs[0] : 'en') || 'en'), music, minSec: kind === 'yt' ? Math.max(42, targetSec) : 42,
        onProgress: (p, stage) => { const bar = box.querySelector('.soc-prog i'), tx = box.querySelector('[data-ptext]'); if (bar) bar.style.width = Math.round(p * 100) + '%'; if (tx) tx.textContent = stage === 'load' ? t('socad.loading') : stage === 'music' ? t('socad.addingMusic') : t('socad.making', { p: Math.round(p * 100) }); }
      });
      const blob = res.blob;
      if (music && res.audio === 'none') toast(t('socad.noAudio'));
      else if (res.audio === 'opus') toast(t('socad.opusAudio'));
      const url = URL.createObjectURL(blob), name = kind === 'combo' ? `grahavani-daily-all-${cLang}-${st.date}.mp4` : kind === 'yt' ? `grahavani-yt-short-${st.yt.theme}-${st.yt.lang === 'all' ? 'all-langs' : st.yt.lang}-${st.yt.dur || 60}s-${st.date}.mp4` : kind === 'wish' ? `grahavani-${st.wish.id}-wishes-${st.wish.date}.mp4` : kind === 'nuall' ? `grahavani-all-mulank-${st.nu.y}.mp4` : kind === 'numonth' ? `grahavani-mulank-month-${st.nu.ym}.mp4` : kind === 'mulank' ? `grahavani-mulank-${st.nu.n}-${st.nu.y}.mp4` : kind === 'bhagyank' ? `grahavani-bhagyank-${st.nu.b}-${st.nu.y}.mp4` : `grahavani-${kind}-reel-${st.date}.mp4`;
      if (box.dataset.url) URL.revokeObjectURL(box.dataset.url);
      box.dataset.url = url;
      box.innerHTML = `<video src="${url}" controls playsinline loop></video>`;
      const acts = sec.querySelector('.soc-acts');
      acts.insertAdjacentHTML('beforeend', `<a class="btn-line soc-dl" href="${url}" download="${name}">${ic('i-download')}${esc(t('socad.downloadMp4'))}</a>`);
      const file = new File([blob], name, { type: 'video/mp4' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        acts.insertAdjacentHTML('beforeend', `<button type="button" class="btn-line soc-share">${ic('i-link')}${esc(t('sc.share'))}</button>`);
        acts.querySelector('.soc-share').onclick = () => navigator.share({ files: [file], text: sec.querySelector('.soc-cap').value }).catch(() => { });
      }
      track('social_reel', { kind, fest: kind === 'wish' ? st.wish.id : undefined, n: kind === 'mulank' ? st.nu.n : kind === 'bhagyank' ? st.nu.b : undefined, y: /^(nuall|mulank|bhagyank)$/.test(kind) ? st.nu.y : kind === 'numonth' ? st.nu.ym : undefined, date: kind === 'wish' ? st.wish.date : st.date, kb: Math.round(blob.size / 1024), music: st.music, audio: res.audio, sec: res.seconds });
    } catch (e) {
      const why = e && e.message === 'unsupported' ? '' : String((e && (e.message || e.name)) || e || '').slice(0, 160);
      box.innerHTML = `<p class="err">${esc(e && e.message === 'unsupported' ? t('socad.noReel') : t('socad.reelFail'))}</p>${why ? `<p class="muted small">${esc(t('socad.why', { e: why }))}</p>` : ''}`;
      track('social_reel_fail', { kind, why, ua: navigator.userAgent.slice(0, 120) });
    }
    btn.disabled = false;
  }
  const au = $('#soc-audio'), playBtn = $('#soc-play');
  const setPlay = on => { playBtn.querySelector('span').textContent = t(on ? 'lis.stop' : 'socad.preview'); playBtn.querySelector('use').setAttribute('href', on ? '#i-stop' : '#i-speaker'); };
  $('#soc-music').addEventListener('change', e => { st.music = e.target.value; store.set('gv-soc-music', st.music); au.pause(); setPlay(false); playBtn.disabled = st.music === 'none'; });
  playBtn.disabled = st.music === 'none';
  playBtn.addEventListener('click', () => { if (!au.paused) { au.pause(); setPlay(false); return; } au.src = '/music/' + st.music + '.mp3'; au.currentTime = 0; au.play().then(() => setPlay(true)).catch(() => { }); });
  au.addEventListener('ended', () => setPlay(false));
  const syncQuick = () => $$('#soc-quick button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === st.date)));
  $$('#soc-quick button').forEach(b => b.addEventListener('click', () => { st.date = b.dataset.d; $('#soc-date').value = st.date; syncQuick(); resetReels(); draw(); drawSchedule(); drawComboCap(); }));
  $('#soc-date').addEventListener('change', e => { st.date = e.target.value || today; syncQuick(); resetReels(); draw(); drawSchedule(); drawComboCap(); });
  $('#soc-city').addEventListener('change', e => { st.city = e.target.value; store.set('gv-soc-city', st.city); resetReels('.soc-reel'); draw(); drawWish(); drawComboCap(); });
  $('#soc-nuy').addEventListener('change', e => { st.nu.y = +e.target.value; resetReels('[data-reel="nuall"], [data-reel="mulank"], [data-reel="bhagyank"]'); drawNu(); drawReply(); });
  $('#soc-num').addEventListener('change', e => { st.nu.ym = e.target.value; resetReels('[data-reel="numonth"]'); drawNu(); });
  $('#soc-nun').addEventListener('change', e => { st.nu.n = +e.target.value; resetReels('[data-reel="mulank"]'); drawNu(); });
  const nubEl = $('#soc-nub'); if (nubEl) nubEl.addEventListener('change', e => { st.nu.b = +e.target.value; resetReels('[data-reel="bhagyank"]'); drawNu(); });
  $('#soc-dob').addEventListener('input', drawReply); $('#soc-rl').addEventListener('change', drawReply);
  $('#soc-ccopy').addEventListener('click', async () => { const v = $('#soc-chan').value; try { await navigator.clipboard.writeText(v); } catch (e) { $('#soc-chan').select(); document.execCommand('copy'); } toast(t('socad.copied')); });
  $('#soc-rcopy').addEventListener('click', async () => { const v = $('#soc-reply').value; if (!v) return; try { await navigator.clipboard.writeText(v); } catch (e) { $('#soc-reply').select(); document.execCommand('copy'); } toast(t('socad.copied')); });
  $('#soc-wfest').addEventListener('change', e => { st.wish = st.wishes[+e.target.value] || null; resetReels('.soc-wish'); drawWish(); });
  const syncYtFields = () => {
    const th = st.yt.theme;
    const fSign = $('#soc-yt-f-sign'), fMatch = $('#soc-yt-f-match');
    const fPlanet = $('#soc-yt-f-planet'), fPurpose = $('#soc-yt-f-purpose');
    const fTopic = $('#soc-yt-f-topic'), fVrat = $('#soc-yt-f-vrat'), fDream = $('#soc-yt-f-dream');
    if (fSign) fSign.style.display = (th === 'sign' || th === 'gem' || th === 'names') ? '' : 'none';
    if (fMatch) fMatch.style.display = (th === 'match') ? '' : 'none';
    if (fPlanet) fPlanet.style.display = (th === 'dasha' || th === 'transit') ? '' : 'none';
    if (fPurpose) fPurpose.style.display = (th === 'muhurta') ? '' : 'none';
    if (fTopic) fTopic.style.display = (th === 'prashna') ? '' : 'none';
    if (fVrat) fVrat.style.display = (th === 'vrat') ? '' : 'none';
    if (fDream) fDream.style.display = (th === 'dream') ? '' : 'none';
  };
  const drawYt = async () => {
    const ta = $('#soc-yt-cap'); if (!ta) return;
    ta.value = '…';
    const lang = st.yt.lang || 'all';
    const q = `kind=yt_${st.yt.theme}&lang=${lang}&date=${st.date}&sign=${st.yt.sign}&bSign=${st.yt.bSign}&gSign=${st.yt.gSign}&planet=${st.yt.planet}&purpose=${st.yt.purpose}&topic=${st.yt.topic}&vrat=${st.yt.vrat}&dream=${st.yt.dream}&city=${cityQ()}`;
    try {
      const r = await api(`/api/social/?caption=1&${q}`);
      st.yt.cap = upgradeCapLike52(r.description, r.title, `${st.yt.theme}, youtube shorts, ${r.title}, rashifal ${st.date}`, '#youtubeshorts #vedicastrology #jyotish #aajkarashifal #grahavani');
      ta.value = st.yt.cap;
    } catch (e) {
      ta.value = '—';
    }
  };
  $('#soc-yt-theme').addEventListener('change', e => { st.yt.theme = e.target.value; syncYtFields(); resetReels('.soc-yt'); drawYt(); });
  const durEl = $('#soc-yt-dur');
  if (durEl) durEl.addEventListener('change', e => { st.yt.dur = +e.target.value; resetReels('.soc-yt'); });
  $('#soc-yt-lang').addEventListener('change', e => { st.yt.lang = e.target.value; resetReels('.soc-yt'); drawYt(); });
  $('#soc-yt-sign').addEventListener('change', e => { st.yt.sign = +e.target.value; resetReels('.soc-yt'); drawYt(); });
  $('#soc-yt-bsign').addEventListener('change', e => { st.yt.bSign = +e.target.value; resetReels('.soc-yt'); drawYt(); });
  $('#soc-yt-gsign').addEventListener('change', e => { st.yt.gSign = +e.target.value; resetReels('.soc-yt'); drawYt(); });
  $('#soc-yt-planet').addEventListener('change', e => { st.yt.planet = e.target.value; resetReels('.soc-yt'); drawYt(); });
  $('#soc-yt-purpose').addEventListener('change', e => { st.yt.purpose = e.target.value; resetReels('.soc-yt'); drawYt(); });
  $('#soc-yt-topic').addEventListener('change', e => { st.yt.topic = e.target.value; resetReels('.soc-yt'); drawYt(); });
  $('#soc-yt-vrat').addEventListener('change', e => { st.yt.vrat = e.target.value; resetReels('.soc-yt'); drawYt(); });
  $('#soc-yt-dream').addEventListener('change', e => { st.yt.dream = e.target.value; resetReels('.soc-yt'); drawYt(); });
    $('#soc-yt-copy').addEventListener('click', async () => {
    const v = $('#soc-yt-cap').value;
    if (!v || v === '…' || v === '—') return;
    try { await navigator.clipboard.writeText(v); } catch (e) { $('#soc-yt-cap').select(); document.execCommand('copy'); }
    toast(t('socad.yt.copied'));
  });
  const drawComboCap = () => {
    const ta = $('#soc-combo-cap'); if (!ta) return;
    const [sy, sm, sd] = st.date.split('-').map(Number);
    const jd = Date.UTC(sy, sm - 1, sd, 0, 30) / 86400000 + 2440587.5;
    let chSign = 0;
    if (window.Jyotish && window.Jyotish.transit) chSign = (Math.floor(window.Jyotish.transit(jd).lon.Moon / 30) + 5) % 12;
    else { const d = jd - 2451545.0, L0 = (218.316 + 13.176396 * d) % 360, M = (134.963 + 13.064993 * d) * Math.PI / 180, ay = 23.85 + 0.01397 * (d / 365.25); chSign = (Math.floor((((L0 + 6.289 * Math.sin(M) - ay) % 360 + 360) % 360) / 30) + 5) % 12; }
    const rHi = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
    const rEn = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const host = location.origin;
    ta.value = [
      `✨ ${st.date} · आज का संपूर्ण पंचांग, विशेष योग और 12 राशियों का राशिफल | Today's Special Day, Rashifal & Panchang`,
      '',
      `🪔 आज का विशेष दिन: शुभ मुहूर्त, व्रत-पर्व और सावधानियां`,
      `♈ सभी 12 राशियों का आज का राशिफल (सावधान राशि / Chandrashtama: ${rHi[chSign]} / ${rEn[chSign]})`,
      `☀️ आज का पंचांग: तिथि, नक्षत्र, अभिजीत मुहूर्त और राहुकाल`,
      '',
      `👇 कमेंट में अपनी राशि लिखें और अपनों के साथ शेयर करें 🙏 | Comment your Rashi & share with family`,
      `🔗 Free Kundali, Panchang & Muhurat in 6 Languages: ${host} (Link in Bio)`,
      '',
      `आज का राशिफल, दैनिक पंचांग, आज का शुभ मुहूर्त, आज का राहुकाल, अभिजीत मुहूर्त, आज का विशेष दिन, चंद्राष्टम राशि, वैदिक ज्योतिष, मेष से मीन राशिफल, कुंडली मिलान, ग्रह गोचर, today rashifal in hindi, daily panchang, aaj ka panchang, aaj ka shubh muhurat, rahu kaal today, abhijit muhurat, vedic astrology, free kundali online, grahavani, horoscope today all 12 signs, indian calendar, vrat festival today`,
      '',
      `#aajkarashifal #dainikpanchang #vedicastrology #shubhmuhurat #grahavani`
    ].join('\n');
  };
  drawComboCap();
  const comboLangEl = $('#soc-combo-lang');
  if (comboLangEl) comboLangEl.addEventListener('change', () => { resetReels('.soc-combo'); drawComboCap(); });
  const comboCopyEl = $('#soc-combo-copy');
  if (comboCopyEl) comboCopyEl.addEventListener('click', async () => {
    const v = $('#soc-combo-cap').value;
    if (!v) return;
    try { await navigator.clipboard.writeText(v); } catch (e) { $('#soc-combo-cap').select(); document.execCommand('copy'); }
    toast(t('socad.copied'));
  });
  // ---- 52-Topic Reel Catalog & Weekly Schedule (Today, Tomorrow, Sun–Sat) ----
  const REEL_TOPICS = [
    ['daily-rashifal', 'Daily & Weekly', 'Daily Rashifal (12 Signs)',
      'आज {DATE} ({WD}) का दैनिक राशिफल। करियर, धन, प्रेम और स्वास्थ्य में आज कई राशियों को नए अवसर मिलेंगे।\nआज {CH} राशि के लिए चंद्राष्टम है, इसलिए बड़े निवेश, उधार और तीखी बहस से बचना शुभ रहेगा।\nप्रातः सूर्य को अर्घ्य दें, शुभ रंग धारण करें और ग्रहवाणी पर अपनी पूरी 12 राशियों की रिपोर्ट देखें।',
      [['शुभ राशि संकेत', 'करियर और रुके कार्यों में आज नई गति मिलेगी'], ['सतर्क राशि', 'चंद्राष्टम ({CH}) आज जोखिम व विवाद टालें'], ['लकी टिप', 'प्रातः सूर्य को अर्घ्य दें व शुभ रंग धारण करें']],
      [['धन व व्यापार', 'मित्रों और वरिष्ठों के सहयोग से रुका धन प्राप्त होगा'], ['स्वास्थ्य नियम', 'खान-पान संतुलित रखें और अनावश्यक तनाव से बचें'], ['आज का उपाय', 'गायत्री मंत्र का 11 बार जप दिन को मंगलमय बनाएगा']]],
    ['daily-panchang', 'Daily & Weekly', 'Daily Panchang (Tithi, Nakshatra, Yoga)',
      'आज {DATE} ({WD}) का सटीक पंचांग। किसी भी नए कार्य या यात्रा से पहले आज की तिथि, नक्षत्र और शुभ योग देखना आवश्यक है।\nदोपहर का अभिजीत मुहूर्त नए काम व हस्ताक्षर के लिए श्रेष्ठ है, जबकि राहुकाल में बड़े निर्णय टालने चाहिए।\n{CITY} के सूर्योदय, सूर्यास्त और पूरे दिन का पंचांग ग्रहवाणी पर बिल्कुल मुफ्त देखें।',
      [['अभिजीत मुहूर्त', 'दोपहर का सबसे शुभ समय—नए कार्य शुरू करें'], ['राहुकाल अलर्ट', 'अशुभ समय में यात्रा और बड़ा निवेश टालें'], ['आज का दिन ({WD})', '{DATE} · {CITY} के अनुसार सटीक पंचांग']],
      [['तिथि व नक्षत्र', 'उदया तिथि और नक्षत्र के अनुसार शुभ कर्म चुनें'], ['योग व करण', 'शुभ योग में पूजा, दान और संकल्प दोगुना फल देते हैं'], ['सूर्योदय नियम', 'तांबे के लोटे से सूर्य को जल देना ऊर्जा बढ़ाता है']]],
    ['special-day', 'Daily & Weekly', "Today's Special Day / Festival / Vrat",
      'आज {DATE} ({WD}) का विशेष दिन, व्रत और शुभ योग। आज के दिन पूजा, जप और दान का विशेष आध्यात्मिक महत्व है।\nअभिजीत और अमृत चौघड़िया में संकल्प लेने से कार्य सिद्ध होते हैं, वहीं राहुकाल में नया सौदा न करें।\nआज {CH} राशि वाले संयम रखें और पूरे दिन के शुभ मुहूर्त व व्रत नियम ग्रहवाणी पर देखें।',
      [['आज का विशेष योग', '{DATE} ({WD}) — पूजा और संकल्प का उत्तम दिन'], ['शुभ कार्य', 'दान, मंत्र जप और इष्टदेव स्मरण से दोगुना फल'], ['सावधानी', 'राहुकाल और भद्रा में नए सौदे व यात्रा टालें']],
      [['व्रत व पूजा विधि', 'स्वच्छ वस्त्र पहनकर धूप-दीप से इष्टदेव का पूजन करें'], ['क्या दान करें', 'अन्न, गुड़ या सफेद वस्तु का दान बाधाएं दूर करता है'], ['सटीक मुहूर्त', '{CITY} के अनुसार पूजा और पारण समय देखें']]],
    ['rahu-kaal', 'Daily & Weekly', "Today's Rahu Kaal & Best Abhijit Muhurat",
      'आज {DATE} ({WD}) का राहुकाल और अभिजीत मुहूर्त। रोज़ के महत्वपूर्ण काम से पहले यह दो समय जरूर जांच लें।\nराहुकाल में नया व्यापार, वाहन खरीद, बड़ा निवेश या लंबी यात्रा शुरू करने से कार्य में अड़चन आती है।\nअभिजीत मुहूर्त दोपहर का सबसे शुभ समय है—महत्वपूर्ण हस्ताक्षर और शुभ शुरुआत इसी समय करें।',
      [['राहुकाल (AVOID)', 'नया व्यापार, सौदा और लंबी यात्रा इस समय न करें'], ['अभिजीत मुहूर्त (BEST)', 'महत्वपूर्ण हस्ताक्षर और शुभ शुरुआत के लिए श्रेष्ठ'], ['शहर अनुसार', '{CITY} का सटीक समय ग्रहवाणी पर देखें']],
      [['राहुकाल नियम', 'सूर्योदय से सूर्यास्त के 8 भागों में एक भाग राहुकाल होता है'], ['यात्रा से पहले', 'यदि राहुकाल में निकलना जरूरी हो तो पान या सौंफ खाकर निकलें'], ['अमृत विकल्प', 'राहुकाल के बाद अमृत या शुभ चौघड़िया का चयन करें']]],
    ['chandrashtama', 'Daily & Weekly', "Today's Chandrashtama Rashi Alert",
      'आज {DATE} ({WD}) का चंद्राष्टम अलर्ट। आज चंद्रमा {CH} राशि से आठवें भाव में गोचर कर रहे हैं।\n{CH} राशि वालों को आज बड़ा वित्तीय निवेश, उधार लेन-देन, लंबी यात्रा और तीखी बहस से बचना चाहिए।\nसरल उपाय के रूप में ॐ नमः शिवाय का 11 बार जप करें और सफेद वस्तु या जल का दान करें।',
      [['सावधानी · {CH}', 'बड़े वित्तीय निर्णय और उधार आज टालें'], ['संवाद नियम', 'ऑफिस व परिवार में तीखी बहस से बचें'], ['सरल उपाय', 'ॐ नमः शिवाय 11 बार जपें और जल दान करें']],
      [['मानसिक शांति', 'चंद्राष्टम में मन अस्थिर रहता है, जल्दबाजी में फैसला न लें'], ['नया काम टालें', 'प्रॉपर्टी डील, इंटरव्यू या बड़ा कॉन्ट्रैक्ट अगले दिन रखें'], ['शुभ कवच', 'प्रातः शिवलिंग पर जल अर्पित करने से दोष शांत होता है']]],
    ['hora-time', 'Daily & Weekly', "Today's Planetary Hora (Best Hour)",
      'आज {DATE} ({WD}) का ग्रह होरा चक्र। वैदिक ज्योतिष में दिन और रात के हर एक घंटे पर एक विशेष ग्रह का शासन होता है।\nगुरु और बुध की होरा निवेश, पढ़ाई, इंटरव्यू और व्यापारिक समझौते के लिए सर्वोत्तम मानी जाती है।\nशनि व मंगल की होरा में उधार देने या बहस करने से बचें, और {CITY} की लाइव होरा ग्रहवाणी पर देखें।',
      [['गुरु व बुध होरा', 'निवेश, पढ़ाई, इंटरव्यू और व्यापार के लिए श्रेष्ठ'], ['शुक्र होरा', 'कला, खरीदारी और रिश्तों की बात के लिए उत्तम'], ['शनि व मंगल होरा', 'उधार देने या बहस करने से बचें']],
      [['सूर्य व चंद्र होरा', 'सरकारी काम के लिए सूर्य होरा और यात्रा के लिए चंद्र होरा शुभ'], ['दिन की पहली होरा', 'सूर्योदय की पहली होरा हमेशा उस दिन के स्वामी ग्रह की होती है'], ['सफलता मंत्र', 'सही होरा में शुरू किया काम कम प्रयास में सफल होता है']]],
    ['choghadiya', 'Daily & Weekly', 'Daily Choghadiya (Amrit/Shubh/Labh)',
      'आज {DATE} ({WD}) का दैनिक चौघड़िया। घर से निकलने या शुभ कार्य से पहले सही चौघड़िया चुनना अत्यंत लाभकारी है।\nअमृत, शुभ और लाभ चौघड़िया पूजा, दुकान खोलने, खरीदारी और नए काम के लिए सर्वोत्तम हैं।\nरोग, काल और उद्वेग चौघड़िया में महत्वपूर्ण काम टालें और {CITY} का सटीक समय ग्रहवाणी पर देखें।',
      [['अमृत · शुभ · लाभ', 'यात्रा, दुकान खोलने और पूजा के लिए सर्वोत्तम'], ['चर चौघड़िया', 'गतिशील कार्यों व सफर की शुरुआत के लिए ठीक'], ['रोग · काल · उद्वेग', 'अशुभ चौघड़िया में महत्वपूर्ण काम टालें']],
      [['अमृत वेला', 'सभी मांगलिक और स्थायी कार्यों के लिए सबसे श्रेष्ठ चौघड़िया'], ['लाभ वेला', 'व्यापार, शिक्षा और धन संबंधी लेन-देन के लिए उत्तम'], ['सावधानी नियम', 'काल वेला में धन हानि और रोग वेला में स्वास्थ्य कष्ट का भय रहता है']]],
    ['weekly-rashifal', 'Daily & Weekly', 'Weekly Rashifal',
      'साप्ताहिक राशिफल ({DATE} सप्ताह)। इस सप्ताह ग्रहों की चाल करियर, व्यापार और पारिवारिक जीवन में नए मोड़ लाएगी।\nमेष, सिंह, धनु और मकर राशि वालों को रुका धन व पदोन्नति के योग हैं, जबकि चंद्राष्टम के दिन सतर्क रहें।\nसभी 12 राशियों का दिन-वार साप्ताहिक फल और शुभ उपाय ग्रहवाणी पर मुफ्त पढ़ें।',
      [['सप्ताह के सितारे', 'करियर और व्यापार में नई गति व धन लाभ'], ['सावधानी के दिन', 'चंद्राष्टम के दिन बड़े जोखिम व उधार टालें'], ['साप्ताहिक उपाय', 'गुरुवार को हल्दी तिलक व शनिवार को दीपदान करें']],
      [['करियर व नौकरी', 'वरिष्ठों के सहयोग से नए प्रोजेक्ट की जिम्मेदारी मिलेगी'], ['प्रेम व परिवार', 'परिवार के साथ संवाद मधुर रखें, गलतफहमी दूर होगी'], ['लकी डे', 'सप्ताह के शुभ वार में महत्वपूर्ण मीटिंग तय करें']]],
    ['weekly-festivals', 'Daily & Weekly', "This Week's Festivals & Vrats",
      'इस सप्ताह के प्रमुख व्रत और त्योहार ({DATE} से आगे)। उदया तिथि के अनुसार सही तारीख और पूजा का शुभ मुहूर्त जानें।\nव्रत के दिन प्रातः स्नान कर संकल्प लेने से मानसिक शांति और परिवार में सुख-समृद्धि का वास होता है।\n{CITY} के अनुसार एकादशी पारण समय, प्रदोष और सभी त्योहारों की पूरी सूची ग्रहवाणी पर देखें।',
      [['व्रत और पर्व', 'उदया तिथि अनुसार सही तारीख व पारण समय जानें'], ['पूजा विधि', 'सरल सामग्री, धूप-दीप और मंत्र के साथ पूजन करें'], ['शुभ संकल्प', 'जरूरतमंदों को अन्न या फल दान करना श्रेष्ठ है']],
      [['पारण नियम', 'व्रत हमेशा शुभ पारण समय के भीतर ही खोलना चाहिए'], ['व्रत कथा लाभ', 'कथा श्रवण से व्रत का पूर्ण पुण्य फल प्राप्त होता है'], ['रिमाइंडर अलर्ट', 'अगले सभी व्रत-पर्व का कैलेंडर ग्रहवाणी पर देखें']]],
    ['weekly-avoid', 'Daily & Weekly', 'Weekly Avoid-Dates (Bhadra / Panchak)',
      'इस सप्ताह किन तारीखों से बचें। भद्रा, पंचक और अशुभ नक्षत्रों में बड़े कार्य शुरू करने से कार्य में बाधा आती है।\nभद्रा के समय गृह प्रवेश, मुंडन, विवाह और नया व्यापार शुरू करना शास्त्रों में वर्जित माना गया है।\nशुभ कार्य के लिए सर्वार्थ सिद्धि योग या अभिजीत मुहूर्त चुनें—पूरा कैलेंडर ग्रहवाणी पर देखें।',
      [['भद्रा व पंचक अलर्ट', 'नया निर्माण, यात्रा या बड़ा निवेश टालें'], ['शुभ विकल्प', 'सर्वार्थ सिद्धि या अभिजीत मुहूर्त में कार्य करें'], ['मासिक कैलेंडर', '{DATE} माह के सभी शुभ-अशुभ दिन देखें']],
      [['भद्रा काल नियम', 'भद्रा मुख में शुभ कार्य टालें, केवल पुच्छ काल ही सामान्य है'], ['पंचक सावधानी', 'धनिष्ठा से रेवती तक 5 नक्षत्रों में दक्षिण दिशा यात्रा टालें'], ['शांति उपाय', 'आकस्मिक कार्य हो तो हनुमान जी को सिंदूर अर्पित कर निकलें']]],
    ['mesha-gochar', 'Rashi Events', 'Graha Gochar: Fayde, Nuksan & Upay',
      'ग्रह गोचर फल, फायदे, नुकसान और उपाय। शनि और गुरु का गोचर जीवन में बड़े बदलाव और अवसर लेकर आता है।\nसकारात्मक गोचर में करियर में पदोन्नति, रुका धन और वरिष्ठों का सहयोग मिलता है, पर बहस से बचना जरूरी है।\nमंगलवार को हनुमान चालीसा का पाठ करें और शनिवार को तिल के तेल का दीपक जलाएं।',
      [['फायदे (SHUBHA)', 'करियर में पदोन्नति, रुका धन व वरिष्ठों का सहयोग'], ['नुकसान (CAUTION)', 'कार्यस्थल पर बहस, दिखावटी खर्च और तनाव से बचें'], ['वैदिक उपाय', 'मंगलवार हनुमान चालीसा व शनिवार तिल तेल दीपक']],
      [['गोचर नियम', 'गोचर का फल जन्म कुंडली की दशा के साथ मिलकर काम करता है'], ['धन प्रबंधन', 'अनावश्यक दिखावे व जोखिम भरे निवेश से दूरी रखें'], ['रक्षा कवच', 'शनिवार को पीपल के नीचे सरसों तेल का दीपक जलाएं']]],
    ['vakri-margi', 'Rashi Events', 'Vakri & Margi (Retrograde / Direct)',
      'वक्री और मार्गी ग्रह का प्रभाव। जब कोई ग्रह वक्री होता है तो वह अधूरे कार्यों को पूरा करने और आत्ममंथन का समय देता है।\nवक्री काल में जल्दबाजी में नए कॉन्ट्रैक्ट या विवाद से बचें, जबकि मार्गी होने पर रुका धन और निर्णय गति पकड़ते हैं।\nअपनी राशि के अनुसार लाइव वक्री-मार्गी तिथियां और वैदिक उपाय ग्रहवाणी पर जांचें।',
      [['वक्री प्रभाव', 'अधूरे कार्य पूरे करें, नए बड़े सौदों में जांच रखें'], ['मार्गी लाभ', 'रुके हुए धन, प्रमोशन और निर्णयों में तेजी आएगी'], ['सरल उपाय', 'बुधवार को हरी मूंग दान करें और धैर्य रखें']],
      [['बुध वक्री अलर्ट', 'डॉक्यूमेंट, ईमेल और वित्तीय लेन-देन दो बार जांचें'], ['शनि वक्री फल', 'मेहनत का पूरा फल मार्गी होने के बाद प्राप्त होता है'], ['गोचर ट्रैकर', 'सभी 9 ग्रहों की वर्तमान स्थिति ग्रहवाणी पर देखें']]],
    ['sade-sati', 'Rashi Events', 'Sade Sati & Dhaiya Status',
      'शनि साढ़ेसाती और ढैया की सही स्थिति। शनि देव कर्म के फलदाता हैं—यह समय डरने का नहीं, बल्कि अनुशासन और मेहनत का है।\nसाढ़ेसाती के तीन चरणों में से दूसरा चरण मानसिक व आर्थिक परीक्षा लेता है, पर अंतिम चरण में अपार सफलता मिलती है।\nशनिवार को तिल के तेल का दीपक जलाएं, हनुमान चालीसा पढ़ें और अपनी साढ़ेसाती तिथियां ग्रहवाणी पर देखें।',
      [['साढ़ेसाती चरण', 'प्रथम, द्वितीय व तृतीय चरण में अलग-अलग प्रभाव'], ['क्या न करें', 'आलस्य, झूठ और अन्याय से दूर रहें—ईमानदारी रखें'], ['शनि उपाय', 'शनिवार को तिल तेल दीपक व हनुमान चालीसा पाठ']],
      [['ढैया प्रभाव', 'चंद्र राशि से 4थे व 8वें शनि में स्वास्थ्य व कार्य पर ध्यान दें'], ['शुभ फल कब', 'यदि जन्म कुंडली में शनि उच्च या मित्र राशि में हो तो राजयोग देते हैं'], ['लाइव रिपोर्ट', 'अपनी जन्मतिथि से साढ़ेसाती की सटीक तिथियां निकालें']]],
    ['graha-yuti', 'Rashi Events', 'Graha Yuti & Rajayoga Transits',
      'ग्रह युति और राजयोग गोचर। जब दो या अधिक शुभ ग्रह एक राशि में मिलते हैं तो बुधादित्य या गजकेसरी राजयोग बनता है।\nवहीं मंगल-राहु का अंगारक योग या शनि-चंद्र का विष योग मानसिक तनाव और अचानक बाधा ला सकता है।\nअपनी कुंडली और वर्तमान गोचर की युति का असर तथा शांति उपाय ग्रहवाणी पर मुफ्त देखें।',
      [['शुभ राजयोग', 'बुधादित्य व गजकेसरी योग से बुद्धि, धन व सम्मान'], ['अशुभ युति', 'अंगारक व विष योग में क्रोध व जल्दबाजी से बचें'], ['शांति उपाय', 'सूर्य को जल, गायत्री जप और शिव आराधना करें']],
      [['गुरु-चंद्र योग', 'गजकेसरी योग शिक्षा, पद और आध्यात्मिक उन्नति देता है'], ['बुध-सूर्य योग', 'बुधादित्य योग व्यापार, संवाद और प्रशासन में सफलता दिलाता है'], ['सावधानी', 'राहु के साथ युति में भ्रम और गलत निर्णय से बचना चाहिए']]],
    ['grahan', 'Rashi Events', 'Surya & Chandra Grahan (Rashi Impact)',
      'सूर्य और चंद्र ग्रहण का प्रभाव और सूतक नियम। ग्रहण के समय प्रकृति और मन की ऊर्जा संवेदनशील हो जाती है।\nसूतक काल में पूजा-पाठ, भोजन बनाना और शुभ कार्य वर्जित होते हैं—गर्भवती महिलाएं विशेष सावधानी रखें।\nग्रहण समाप्त होने के बाद स्नान करें, तिल-अनाज का दान करें और अपने इष्ट मंत्र का जप करें।',
      [['सूतक नियम', 'सूर्य ग्रहण से 12 घंटे व चंद्र ग्रहण से 9 घंटे पहले सूतक'], ['क्या करें', 'ग्रहण काल में मौन, ध्यान और मानसिक मंत्र जप श्रेष्ठ'], ['ग्रहण बाद दान', 'स्नान के बाद गुड़, तिल, चावल या वस्त्र का दान करें']],
      [['गर्भवती सावधानी', 'ग्रहण के समय नुकीली वस्तुओं का प्रयोग और बाहर निकलना टालें'], ['राशि प्रभाव', 'ग्रहण नक्षत्र वाली राशियों को विशेष शांति उपाय करना चाहिए'], ['कैलेंडर', 'साल के सभी सूर्य व चंद्र ग्रहण की तिथियां ग्रहवाणी पर देखें']]],
    ['ast-uday', 'Rashi Events', 'Guru / Shukra Ast & Uday',
      'गुरु और शुक्र अस्त व उदय का महत्व। जब बृहस्पति या शुक्र सूर्य के अत्यंत निकट आते हैं तो वे अस्त माने जाते हैं।\nगुरु और शुक्र तारा अस्त होने पर विवाह, गृह प्रवेश, मुंडन और नए मांगलिक कार्य शास्त्रों में वर्जित रहते हैं।\nतारा उदय होते ही फिर से शुभ विवाह और गृह प्रवेश मुहूर्त शुरू होते हैं—सटीक तिथियां ग्रहवाणी पर देखें।',
      [['क्यों रुकते हैं काम', 'गुरु संतान-सुख और शुक्र विवाह-सौंदर्य के कारक हैं'], ['वर्जित कार्य', 'तारा अस्त में विवाह, गृह प्रवेश और यज्ञोपवीत टालें'], ['पुनः आरंभ', 'उदय के 3 दिन बाद सभी मांगलिक मुहूर्त शुरू होते हैं']],
      [['अपवाद नियम', 'नित्य पूजा, नामकरण और आकस्मिक चिकित्सा में बाधा नहीं होती'], ['गुरु बल', 'विवाह से पहले वर-वधू के लिए गुरु और सूर्य बल देखा जाता है'], ['मुहूर्त गाइड', 'पूरे वर्ष के अस्त-उदय और विवाह मुहूर्त देखें']]],
    ['ekadashi', 'Rashi Events', 'Ekadashi Special (Parana & Benefit)',
      'एकादशी व्रत विशेष। सभी व्रतों में एकादशी को भगवान विष्णु का सबसे प्रिय और पापनाशक व्रत माना गया है।\nएकादशी के दिन चावल और तामसिक भोजन का त्याग करें, तथा अगले दिन द्वादशी को शुभ पारण समय में व्रत खोलें।\nॐ नमो भगवते वासुदेवाय मंत्र का 108 बार जप करें और अपनी एकादशी की सही तिथि व पारण समय देखें।',
      [['व्रत नियम', 'दशमी की शाम से सात्विक भोजन व एकादशी को चावल वर्जित'], ['पारण समय', 'द्वादशी के दिन हरिवासर समाप्त होने पर ही पारण करें'], ['विष्णु मंत्र', 'ॐ नमो भगवते वासुदेवाय का 108 बार जप करें']],
      [['निर्जला व फलहार', 'सामर्थ्य अनुसार फलाहार या निर्जला व्रत का संकल्प लें'], ['तुलसी नियम', 'एकादशी पर तुलसी दल न तोड़ें—एक दिन पहले ही तोड़ लें'], ['तुलसी अर्पण', 'शालिग्राम व श्रीहरि को तुलसी दल अर्पित करने से मोक्ष व सुख मिलता है']]],
    ['purnima-amavasya', 'Rashi Events', 'Purnima & Amavasya Rashi Remedy',
      'पूर्णिमा और अमावस्या के अचूक वैदिक उपाय। पूर्णिमा चंद्रमा की पूर्ण कला और सकारात्मक ऊर्जा का दिन है।\nपूर्णिमा की रात चंद्रमा को दूध मिश्रित जल से अर्घ्य देने से मानसिक शांति और धन में स्थिरता आती है।\nअमावस्या पर पितरों के नाम से जल तर्पण और दीपदान करने से पितृ दोष शांत होता है और परिवार की उन्नति होती है।',
      [['पूर्णिमा उपाय', 'चंद्रमा को दूध-जल अर्घ्य व श्री सूक्त का पाठ करें'], ['अमावस्या नियम', 'पितरों के निमित्त तर्पण, अन्न दान व पीपल पर दीपदान'], ['मानसिक शांति', 'दोनों तिथियों पर क्रोध और तामसिक भोजन से बचें']],
      [['सत्यनारायण कथा', 'पूर्णिमा के दिन सत्यनारायण कथा श्रवण से घर में समृद्धि आती है'], ['पितृ आशीर्वाद', 'अमावस्या पर कौवे, गाय और कुत्ते को रोटी खिलाना शुभ है'], ['तिथि कैलेंडर', 'पूरे साल की पूर्णिमा व अमावस्या तिथियां ग्रहवाणी पर देखें']]],
    ['panchak', 'Rashi Events', 'Monthly Panchak Alert',
      'मासिक पंचक अलर्ट। जब चंद्रमा धनिष्ठा से रेवती नक्षत्र तक कुंभ और मीन राशि में रहते हैं, तो वे पांच दिन पंचक कहलाते हैं।\nपंचक के दौरान दक्षिण दिशा की यात्रा, घर की छत डलवाना, पलंग बनवाना और लकड़ी इकट्ठा करना टालना चाहिए।\nरविवार से शुरू होने वाला रोग पंचक और मंगलवार का अग्नि पंचक विशेष सतर्कता मांगता है—तिथियां ग्रहवाणी पर देखें।',
      [['पंचक नक्षत्र', 'धनिष्ठा, शतभिषा, पूर्वाभाद्रपद, उत्तराभाद्रपद और रेवती'], ['क्या टालें', 'दक्षिण यात्रा, छत डालना, चारपाई बनवाना और लकड़ी संग्रह'], ['पंचक प्रकार', 'राज पंचक शुभ है, जबकि रोग, अग्नि व मृत्यु पंचक सतर्क']],
      [['यात्रा उपाय', 'दक्षिण दिशा जाना जरूरी हो तो हनुमान जी को फल चढ़ाकर निकलें'], ['शुभ कार्य', 'पंचक में पूजा, जप और सामान्य व्यापार में कोई रोक नहीं'], ['सही तिथियां', 'इस महीने के पंचक आरंभ व समाप्ति समय देखें']]],
    ['rare-muhurat', 'Rashi Events', 'Rare Yogas (Guru Pushya / Sarvartha Siddhi)',
      'दुर्लभ महामुहूर्त—गुरु पुष्य, रवि पुष्य और सर्वार्थ सिद्धि योग। इन योगों में किया गया कार्य बिना किसी बाधा के सफल होता है।\nगुरु पुष्य योग सोना-चांदी खरीदने, नया व्यापार शुरू करने, खाता खोलने और मंत्र सिद्ध करने के लिए सर्वश्रेष्ठ है।\nअमृत सिद्धि और त्रिपुष्कर योग की आने वाली तारीखें अपने शहर के अनुसार ग्रहवाणी पर अभी जांचें।',
      [['गुरु पुष्य योग', 'सोना खरीद, नया व्यापार व शिक्षा आरंभ के लिए श्रेष्ठ'], ['सर्वार्थ सिद्धि', 'सभी शुभ कार्यों व नए अनुबंध में सफलता दिलाने वाला योग'], ['त्रिपुष्कर योग', 'इस योग में किया गया शुभ कर्म और दान तीन गुना फल देता है']],
      [['अमृत सिद्धि योग', 'यात्रा, गृह प्रवेश और दीर्घकालीन निवेश के लिए अत्यंत उत्तम'], ['क्या न करें', 'द्विपुष्कर या त्रिपुष्कर में कोई नुकसान या कर्ज न लें'], ['मुहूर्त खोजें', '{CITY} के लिए अगले सभी दुर्लभ योग देखें']]],
    ['raj-yogas', 'Kundali & Dosha', 'Raj Yogas & Panch Mahapurusha Yogas',
      'क्या आपकी कुंडली में राजयोग है? गजकेसरी, बुधादित्य और पंच महापुरुष योग व्यक्ति को जीवन में उच्च पद व सम्मान दिलाते हैं।\nरुचक, भद्र, हंस, मालव्य और शश—ये पांच महापुरुष योग क्रमशः मंगल, बुध, गुरु, शुक्र और शनि के केंद्र में स्वराशि/उच्च होने से बनते हैं।\nअपनी जन्मतिथि और समय डालकर ग्रहवाणी पर मुफ्त राजयोग रिपोर्ट अभी जांचें।',
      [['पंच महापुरुष', 'रुचक, भद्र, हंस, मालव्य व शश योग से अपार सफलता'], ['गजकेसरी योग', 'गुरु और चंद्र के केंद्र संबंध से यश, बुद्धि व धन लाभ'], ['कब फलित हो', 'संबंधित ग्रह की महादशा या अंतर्दशा में राजयोग जागता है']],
      [['नीचभंग राजयोग', 'कठिन संघर्ष के बाद अचानक बड़ी ऊंचाई दिलाने वाला योग'], ['विपरीत राजयोग', 'मुश्किल परिस्थितियों से निकलकर शत्रुओं पर विजय दिलाता है'], ['मुफ्त जांच', 'अपनी कुंडली में सभी राजयोग एक क्लिक में देखें']]],
    ['kaal-sarp', 'Kundali & Dosha', '12 Types of Kaal Sarp Dosha',
      'कालसर्प दोष से डरें नहीं, इसका सही अर्थ समझें। जब सभी 7 ग्रह राहु और केतु के बीच आ जाते हैं तो कालसर्प योग बनता है।\nअनंत से लेकर शेषनाग तक 12 प्रकार के कालसर्प योग होते हैं—कई सफल नेताओं व उद्योगपतियों की कुंडली में भी यह योग रहा है।\n30 से 36 की उम्र के बाद यह योग राजयोग की तरह फल देता है; शिव रुद्राभिषेक और नाग गायत्री जप से शांति मिलती है।',
      [['12 प्रकार', 'अनंत, कुलिक, वासुकि, शंखपाल से शेषनाग तक'], ['सकारात्मक पक्ष', 'कठिन परिश्रम के बाद 32–36 की उम्र में बड़ी सफलता'], ['सरल उपाय', 'प्रत्येक सोमवार शिवलिंग पर जल व महामृत्युंजय जप']],
      [['आंशिक कालसर्प', 'यदि एक भी ग्रह या लग्न राहु-केतु अक्ष से बाहर हो तो दोष भंग'], ['क्या न करें', 'भयभीत होकर महंगे टोटकों से बचें—सही कुंडली जांच करें'], ['मुफ्त चेक', 'ग्रहवाणी पर जानें आपकी कुंडली में कौन सा कालसर्प है']]],
    ['mangal-dosha', 'Kundali & Dosha', 'Mangal Dosha & Cancellation Rules',
      'मांगलिक दोष और उसके भंग होने के नियम। जन्म कुंडली के 1, 4, 7, 8 या 12वें भाव में मंगल होने से मंगल दोष बनता है।\nशास्त्रों के अनुसार यदि मंगल स्वराशि (मेष/वृश्चिक) या उच्च (मकर) का हो, या दोनों वर-वधू मांगलिक हों तो दोष स्वतः भंग हो जाता है।\n28 वर्ष की आयु के बाद मंगल का प्रभाव शांत होता है—सटीक मंगल दोष व परिहार ग्रहवाणी पर मुफ्त जांचें।',
      [['मंगल स्थान', 'लग्न या चंद्र से 1, 4, 7, 8, 12वें भाव में मंगल'], ['दोष भंग नियम', 'स्वराशि, उच्च या मित्र राशि में होने पर दोष भंग'], ['विवाह मिलान', 'दोनों मांगलिक हों या गुरु की दृष्टि हो तो शुभ विवाह']],
      [['उच्च मांगलिक', '7वें या 8वें भाव का मंगल विशेष सावधानी से मिलान मांगता है'], ['हनुमान उपाय', 'मंगलवार को सुंदरकांड पाठ व लाल मसूर दान शुभ है'], ['कुंडली चेक', 'ग्रहवाणी पर 100% सटीक मंगल दोष और परिहार देखें']]],
    ['navamsha', 'Kundali & Dosha', 'Navamsha D-9 Marriage & Luck',
      'नवांश कुंडली (D-9) का रहस्य। लग्न कुंडली शरीर है तो नवांश कुंडली उसका फल और आत्मा मानी जाती है।\nविवाह सुख, जीवनसाथी का स्वभाव और 35 वर्ष की उम्र के बाद का वास्तविक भाग्य नवांश कुंडली से ही देखा जाता है।\nजो ग्रह लग्न और नवांश दोनों में एक ही राशि में हो वह वर्गोत्तम कहलाता है और जीवन भर राजयोग देता है।',
      [['विवाह दर्पण', 'जीवनसाथी, वैवाहिक सुख व ससुराल पक्ष का सही आकलन'], ['वर्गोत्तम ग्रह', 'D-1 व D-9 में समान राशि का ग्रह अत्यंत बलवान होता है'], ['35 के बाद भाग्य', 'जीवन के उत्तरार्ध में ग्रह नवांश के अनुसार फल देते हैं']],
      [['पुष्कर नवांश', 'शुभ नवांश में स्थित ग्रह कठिन दशा में भी रक्षा करते हैं'], ['ग्रह बल जांच', 'लग्न में नीच ग्रह भी यदि नवांश में उच्च हो तो शुभ फल देता है'], ['D-9 चार्ट', 'अपनी कुंडली का पूरा नवांश और दशमांश चार्ट मुफ्त देखें']]],
    ['ashtakavarga', 'Kundali & Dosha', 'Ashtakavarga Bindu Score',
      'अष्टकवर्ग बिंदु स्कोर क्या बताता है? वैदिक ज्योतिष में प्रत्येक भाव को 0 से 56 के बीच शुभ बिंदु प्राप्त होते हैं।\nजिस भाव में 28 से अधिक (और विशेषकर 32+) बिंदु हों, उससे जुड़े सुख, धन और सफलता जीवन में सहज मिलते हैं।\nलाभ भाव (11वां) में 10वें भाव से अधिक बिंदु हों तो कम मेहनत में बड़ा धन लाभ होता है—अपना स्कोर देखें।',
      [['28+ बिंदु नियम', '28 से ऊपर शुभ भाव, 25 से नीचे संघर्ष की संभावना'], ['धन सूत्र', '11वें भाव के बिंदु 10वें भाव से ज्यादा हों तो अपार लाभ'], ['गोचर सटीकता', 'जिस राशि में 5+ भिन्न अष्टक बिंदु हों वहां गोचर शुभ']],
      [['सप्तम भाव', 'विवाह व साझेदारी के लिए 7वें भाव में मजबूत बिंदु जरूरी'], ['शनि-गुरु गोचर', 'साढ़ेसाती में भी अधिक बिंदु वाले भाव रक्षा कवच बनते हैं'], ['फ्री कैलकुलेटर', 'ग्रहवाणी पर अपना पूरा सर्वाष्टकवर्ग चार्ट निकालें']]],
    ['varshphal', 'Kundali & Dosha', 'Varshphal / Muntha Annual Prediction',
      'ताजिक वर्षफल और मुंथा भविष्यफल। हर जन्मदिन पर जब सूर्य ठीक अपने जन्म अंश पर लौटते हैं, तब आपका नया वार्षिक चार्ट बनता है।\nवर्षफल में मुंथा किस भाव में बैठी है और वर्षेश कौन सा ग्रह है—यही पूरे एक साल की उन्नति और चुनौतियां तय करता है।\n9, 10 या 11वें भाव में मुंथा अपार सफलता देती है—अपना वार्षिक वर्षफल ग्रहवाणी पर अभी निकालें।',
      [['वर्ष प्रवेश', 'हर जन्मदिन पर सूर्य की वापसी से बनता है नया चार्ट'], ['मुंथा का फल', '4, 6, 7, 8, 12 में मुंथा सावधानी; 9, 10, 11 में राजयोग'], ['ताजिक योग', 'इत्थसाल और ईसराफ योग वर्ष के बड़े परिणाम बताते हैं']],
      [['वर्षेश ग्रह', 'पूरे साल का स्वामी ग्रह वर्षेश की स्थिति से भाग्य तय होता है'], ['सटीक अवधि', 'यह रिपोर्ट एक जन्मदिन से अगले जन्मदिन तक लागू रहती है'], ['वार्षिक रिपोर्ट', 'अपनी जन्मतिथि से साल भर का वर्षफल मुफ्त देखें']]],
    ['dasha-shift', 'Kundali & Dosha', 'Mahadasha & Antardasha Shifts',
      'महादशा और अंतर्दशा परिवर्तन। जन्म कुंडली में ग्रह कितने भी शुभ हों, वे अपना पूरा फल अपनी महादशा में ही देते हैं।\nजब राहु, शनि, गुरु या शुक्र की नई महादशा शुरू होती है तो करियर, स्थान और सोच में बड़ा मोड़ आता है।\nअपनी वर्तमान विंशोत्तरी महादशा, प्रत्यंतर दशा और उनके सटीक उपाय ग्रहवाणी पर एक क्लिक में देखें।',
      [['विंशोत्तरी चक्र', '120 वर्षों का 9 ग्रहों का क्रम जीवन की घटनाएं चलाता है'], ['दशा संधि', 'एक दशा समाप्त होकर दूसरी शुरू होते समय बदलाव आते हैं'], ['अंतर्दशा फल', 'महादशा नाथ और अंतर्दशा नाथ की मित्रता से परिणाम']],
      [['राहु-शनि दशा', 'सही दिशा और अनुशासन से राहु व शनि दशा में बड़ा धन मिलता है'], ['गुरु-शुक्र दशा', 'शिक्षा, विवाह, संतान और भौतिक सुखों का स्वर्णिम समय'], ['फ्री टाइमलाइन', 'जन्म से 100 वर्ष तक की दशा तिथियां ग्रहवाणी पर देखें']]],
    ['lagna-12', 'Kundali & Dosha', '12 Lagna (Ascendant) Personalities',
      '12 लग्न और आपका असली व्यक्तित्व। चंद्र राशि आपका मन और भावनाएं बताती है, पर लग्न आपके जीवन की असली दिशा तय करता है।\nमेष से मीन तक 12 लग्न हैं—हर 2 घंटे में लग्न बदलता है, इसलिए जन्म समय का सटीक होना अत्यंत महत्वपूर्ण है।\nआपका लग्नेश कौन है, आपके लिए कौन से ग्रह योगकारक हैं और कौन मारक—यह ग्रहवाणी पर मुफ्त जानें।',
      [['लग्न vs राशि', 'लग्न शरीर, स्वास्थ्य व भाग्य है; राशि मन का दर्पण'], ['योगकारक ग्रह', 'लग्न के अनुसार ही तय होता है कौन सा ग्रह रत्न पहनें'], ['12 लग्न गुण', 'अग्नि, पृथ्वी, वायु व जल तत्व से स्वभाव की पहचान']],
      [['मारक ग्रह नियम', 'लग्नेश का शत्रु ग्रह महादशा में स्वास्थ्य व संघर्ष दे सकता है'], ['सही रत्न', 'रत्न हमेशा लग्न और लग्नेश की स्थिति देखकर ही पहनना चाहिए'], ['अपना लग्न जानें', 'ग्रहवाणी पर सेकंडों में अपनी पूरी लग्न कुंडली देखें']]],
    ['business-kundali', 'Kundali & Dosha', 'Business Opening Kundali',
      'दुकान, ऑफिस या स्टार्टअप शुभारंभ की कुंडली। जिस समय नया व्यापार शुरू होता है, उस क्षण की कुंडली उसका भविष्य तय करती है।\nमुहूर्त कुंडली में 10वां भाव (कर्म), 11वां भाव (लाभ) और 2रा भाव (धन) मजबूत तथा 8वां भाव खाली होना जरूरी है।\nस्थिर लग्न (वृषभ, सिंह, वृश्चिक, कुंभ) में व्यापार शुरू करने से कारोबार लंबे समय तक स्थिर रहता है।',
      [['स्थिर लग्न चुनें', 'वृषभ, सिंह, वृश्चिक, कुंभ लग्न में व्यापार टिकाऊ होता है'], ['10वां व 11वां भाव', 'लाभ व कर्म भाव में गुरु-बुध हों तो निरंतर धन वृद्धि'], ['क्या टालें', 'राहुकाल, रिक्ता तिथि (4, 9, 14) और भद्रा से बचें']],
      [['बुध व गुरु बल', 'बुध व्यापार बुद्धि और गुरु धन विस्तार का मुख्य कारक है'], ['अभिजीत समय', 'दोपहर के अभिजीत मुहूर्त में फीता काटना और पूजन श्रेष्ठ'], ['शहर अनुसार', '{CITY} के लिए व्यापार शुभारंभ के शुभ दिन देखें']]],
    ['prashna', 'Kundali & Dosha', 'Prashna Kundali (Instant Horary)',
      'प्रश्न कुंडली—बिना जन्म समय के सटीक उत्तर। यदि आपको अपनी सही जन्मतिथि या जन्म समय पता नहीं है, तो प्रश्न कुंडली अचूक मार्ग है।\nजब कोई व्यक्ति सच्चे मन से सवाल पूछता है, ठीक उसी समय और स्थान के ग्रहों से प्रश्न कुंडली बनती है।\nलग्न पर शुभ ग्रहों की दृष्टि और चंद्रमा का बल बताता है कि काम पूरा होगा या नहीं—अभी अपना प्रश्न जांचें।',
      [['कब उपयोग करें', 'जब जन्म समय अज्ञात हो या तत्काल निर्णय लेना हो'], ['सफलता सूत्र', 'लग्नेश व कार्येश का संबंध और शुभ ग्रहों की दृष्टि'], ['मुख्य प्रश्न', 'नौकरी, विवाह, खोई वस्तु, यात्रा व कानूनी मामले']],
      [['चंद्रमा की भूमिका', 'प्रश्न कुंडली में चंद्रमा मन और परिणाम की गति दर्शाता है'], ['ईमानदार भाव', 'एक बार में एक ही स्पष्ट प्रश्न पूछने पर सटीक उत्तर मिलता है'], ['इंस्टेंट टूल', 'ग्रहवाणी पर अभी अपना प्रश्न डालकर तुरंत फल देखें']]],
    ['delivery-muhurat', 'Kundali & Dosha', 'Shubh Delivery Muhurat',
      'शुभ प्रसव (सिजेरियन डिलीवरी) मुहूर्त। जब डॉक्टर की सलाह से डिलीवरी की तारीख तय करनी हो तो शुभ नक्षत्र चुनना अत्यंत फलदायी है।\nगंडमूल नक्षत्र, भद्रा, अमावस्या और ग्रहण काल को टालकर रोहिणी, हस्त, पुष्य या अश्विनी जैसे सौम्य नक्षत्र चुने जाते हैं।\nमां और शिशु दोनों के स्वास्थ्य के लिए शुभ लग्न व नक्षत्र समय अपने शहर के अनुसार ग्रहवाणी पर देखें।',
      [['शुभ नक्षत्र', 'रोहिणी, मृगशिरा, हस्त, पुष्य, श्रवण व रेवती उत्तम'], ['क्या टालें', 'गंडमूल नक्षत्र, भद्रा, अमावस्या व राहुकाल से बचें'], ['चिकित्सा प्रथम', 'हमेशा डॉक्टर की सलाह और सुरक्षित समय को प्राथमिकता दें']],
      [['शुभ लग्न', 'लग्न में गुरु या शुक्र का होना बच्चे को तेजस्वी व स्वस्थ बनाता है'], ['तिथि चयन', 'द्वितीया, तृतीया, पंचमी, सप्तमी, दशमी व एकादशी श्रेष्ठ हैं'], ['शहर अनुसार', '{CITY} के लिए सुरक्षित शुभ तारीखों की सूची देखें']]],
    ['muhurat-guides', 'Kundali & Dosha', 'Vivah / Griha Pravesh / Vehicle Muhurat',
      'विवाह, गृह प्रवेश, वाहन और प्रॉपर्टी खरीद का शुभ मुहूर्त। सही मुहूर्त में शुरू किया गया कार्य जीवन में सुख-समृद्धि लाता है।\nविवाह में गुरु-शुक्र उदय व त्रिबल शुद्धि, गृह प्रवेश में स्थिर लग्न और वाहन खरीद में चर नक्षत्र का ध्यान रखा जाता है।\nअपने शहर {CITY} के अनुसार पूरे साल के सभी शास्त्र सम्मत शुभ मुहूर्त ग्रहवाणी पर मुफ्त देखें।',
      [['विवाह मुहूर्त', 'अक्षय तृतीया, देवउठनी बाद के शुद्ध लग्न व तारा उदय'], ['गृह प्रवेश', 'माघ, फाल्गुन, वैशाख, ज्येष्ठ व मार्गशीर्ष के शुभ दिन'], ['वाहन व संपत्ति', 'पुष्य, रोहिणी, स्वाति व श्रवण नक्षत्र में खरीद श्रेष्ठ']],
      [['दिशा व वार', 'सोमवार, बुधवार, गुरुवार व शुक्रवार स्थायी कार्यों के लिए शुभ'], ['रिक्ता तिथि टालें', 'चतुर्थी, नवमी व चतुर्दशी को बड़ा मांगलिक कार्य न करें'], ['पूरी लिस्ट', '{CITY} के लिए महीने-वार सभी शुभ मुहूर्त देखें']]],
    ['mulank-bhagyank', 'Numerology & Match', 'Mulank (1-9) & Bhagyank Series',
      'अंक ज्योतिष—मूलांक और भाग्यांक का रहस्य। आपकी जन्मतिथि के दिन का जोड़ मूलांक और पूरी तारीख का जोड़ भाग्यांक होता है।\nमूलांक 1 से 9 तक हर अंक सूर्य, चंद्र, गुरु, राहु, बुध, शुक्र, केतु, शनि और मंगल से जुड़ा होता है।\nअपना मूलांक, भाग्यांक, लकी नंबर, शुभ रंग, मित्र अंक और करियर दिशा ग्रहवाणी पर मुफ्त निकालें।',
      [['मूलांक (1–9)', 'जन्म दिन का एकल अंक आपका मूल स्वभाव बताता है'], ['भाग्यांक', 'पूरी जन्मतिथि का जोड़ जीवन का लक्ष्य व भाग्य तय करता है'], ['नाम अंक सुधार', 'सही नाम स्पेलिंग से लकी वाइब्रेशन बढ़ाया जा सकता है']],
      [['मित्र व शत्रु अंक', 'व्यापार साझेदारी और विवाह में मित्र अंक शुभ रहते हैं'], ['लकी रंग व वार', 'प्रत्येक मूलांक का अपना शुभ रंग, रत्न और वार होता है'], ['फ्री रिपोर्ट', 'अपनी जन्मतिथि से पूरा अंक ज्योतिष चार्ट देखें']]],
    ['monthly-mulank', 'Numerology & Match', 'Monthly Mulank Forecast',
      'मासिक मूलांक भविष्यफल ({DATE} माह)। हर महीने की ऊर्जा आपके मूलांक के साथ अलग तरह से तालमेल बिठाती है।\nइस महीने किन तारीखों को नया काम, इंटरव्यू या निवेश करना सबसे शुभ रहेगा और किन तारीखों को सावधान रहें।\nअपने मूलांक 1 से 9 की पूरी मासिक भविष्यवाणी और सरल उपाय ग्रहवाणी पर अभी पढ़ें।',
      [['शुभ तारीखें', 'अपने मूलांक की मित्र तारीखों पर बड़े निर्णय लें'], ['सतर्क तारीखें', 'विरोधी अंक की तारीखों पर विवाद और उधार टालें'], ['मासिक उपाय', 'स्वामी ग्रह के वार को दान व मंत्र जप से लाभ']],
      [['करियर फोकस', 'इस महीने अपने कार्यक्षेत्र में नए संपर्क लाभदायक होंगे'], ['धन संकेत', 'बजट बनाकर चलें—अचानक खर्च पर नियंत्रण रखें'], ['डाउनलोड कार्ड', 'हर महीने का मूलांक कार्ड ग्रहवाणी से सेव करें']]],
    ['comment-numerology', 'Numerology & Match', 'Comment DOB for Lucky Color & Day',
      'कमेंट में अपनी जन्मतिथि लिखें और जानें आपका लकी दिन, शुभ रंग और मूलांक का विशेष संदेश।\nसिर्फ जन्म तारीख के आधार पर आप जान सकते हैं कि कौन सा ग्रह आपके जीवन में धन और सफलता का कारक है।\nइस रील को सेव करें, अपनों को टैग करें और अपना पूरा अंक ज्योतिष चार्ट ग्रहवाणी पर मुफ्त देखें।',
      [['कमेंट करें DOB', 'अपनी जन्मतिथि (DD-MM-YYYY) कमेंट में लिखें'], ['जानें 3 बातें', 'आपका मूलांक, सबसे लकी वार और शुभ रंग'], ['फ्री चार्ट', 'ग्रहवाणी पर नाम व जन्मतिथि से पूरी रिपोर्ट पाएं']],
      [['अंक 1, 3, 5, 6', 'सूर्य, गुरु, बुध और शुक्र के अंक नेतृत्व व धन देते हैं'], ['अंक 2, 4, 7, 8, 9', 'सही दिशा व धैर्य से ये अंक जीवन में बड़ा मुकाम दिलाते हैं'], ['शेयर करें', 'अपने दोस्तों और परिवार के साथ उनकी तारीख भी जांचें']]],
    ['kundali-match', 'Numerology & Match', 'Kundali 36 Guna Milan & Love Match',
      'कुंडली मिलान और 36 गुण अष्टकूट। विवाह के लिए कम से कम 18 से अधिक गुण मिलना शुभ माना जाता है।\nसिर्फ गुण संख्या काफी नहीं—नाड़ी दोष, भकूट दोष, मंगल दोष और दक्षिण भारतीय पोरुथम मिलान भी देखना जरूरी है।\nग्रहवाणी पर वर-वधू की जन्मतिथि डालकर 100% सटीक गुण मिलान, दोष परिहार और लव मैच रिपोर्ट मुफ्त पाएं।',
      [['36 गुण अष्टकूट', 'वर्ण, वश्य, तारा, योनि, मैत्री, गण, भकूट व नाड़ी'], ['मुख्य दोष चेक', 'नाड़ी व भकूट दोष के अपवाद और मंगल मिलान'], ['सप्तम भाव जांच', 'दोनों कुंडलियों में विवाह भाव व दशा देखना अनिवार्य']],
      [['नवांश मिलान', 'सिर्फ लग्न ही नहीं, D-9 नवांश में भी ग्रह मैत्री देखें'], ['लव कम्पैटिबिलिटी', 'शुक्र व चंद्र की स्थिति से आपसी प्रेम और समझ'], ['फ्री मिलान', 'PDF रिपोर्ट व पोरुथम के साथ तुरंत मिलान करें']]],
    ['biodata', 'Numerology & Match', 'Marriage Biodata Checklist',
      'सुंदर और सटीक विवाह बायोडाटा कैसे बनाएं? पारंपरिक विवाह चर्चा में नाम, शिक्षा व परिवार के साथ कुंडली विवरण महत्वपूर्ण होता है।\nबायोडाटा में जन्मतिथि, जन्म समय, जन्म स्थान, गोत्र, राशि, नक्षत्र और मांगलिक स्थिति स्पष्ट लिखना चाहिए।\nग्रहवाणी पर कुंडली गणना के साथ आकर्षक मैरिज बायोडाटा PDF कुछ ही सेकंड में मुफ्त तैयार करें।',
      [['जरूरी विवरण', 'जन्मतिथि, सही समय, शहर, राशि, नक्षत्र और गोत्र'], ['प्रोफेशनल लुक', 'साफ फोटो, शिक्षा, करियर और परिवार की संक्षिप्त जानकारी'], ['रेडी PDF', 'ग्रहवाणी से सुंदर डिज़ाइन वाला बायोडाटा डाउनलोड करें']],
      [['नक्षत्र व गण', 'राशि, नक्षत्र, चरण और नाड़ी लिखने से मिलान आसान होता है'], ['सटीक समय', 'जन्म का सही समय एएम/पीएम के साथ स्पष्ट लिखें'], ['शेयर करें', 'व्हाट्सऐप पर भेजने के लिए हल्की व साफ PDF बनाएं']]],
    ['family-kundali', 'Numerology & Match', 'Family Kundali & Combined Ratings',
      'पूरे परिवार की कुंडली एक ही स्क्रीन पर। माता-पिता, जीवनसाथी और बच्चों के ग्रह, साढ़ेसाती और दैनिक रेटिंग एक साथ देखें।\nजानें आज परिवार के किस सदस्य का दिन सबसे शुभ है, किस पर चंद्राष्टम है और किसकी महादशा चल रही है।\nग्रहवाणी के फैमिली डैशबोर्ड पर सभी सदस्यों की कुंडली सेव करें और हर दिन का संयुक्त मार्गदर्शन पाएं।',
      [['एक डैशबोर्ड', 'परिवार के सभी सदस्यों की कुंडली एक जगह सेव करें'], ['डेली रेटिंग', 'हर दिन जानें किस सदस्य को शुभ योग और किसे सावधानी'], ['साढ़ेसाती ट्रैक', 'परिवार में किस पर शनि दशा या साढ़ेसाती चल रही है']],
      [['संयुक्त निर्णय', 'प्रॉपर्टी, वाहन या नया काम किसके नाम से करना श्रेष्ठ है'], ['त्योहार व व्रत', 'परिवार के सभी सदस्यों के जन्म नक्षत्र और तिथि अलर्ट'], ['मुफ्त सुविधा', 'लॉगिन करके अपना फैमिली कुंडली ग्रुप आज ही बनाएं']]],
    ['palm-lines', 'Samudrika & Divination', 'Palm Reading (Lines, Mounts & Marks)',
      'हस्तरेखा शास्त्र—आपकी हथेली के रहस्य। पुरुषों के दाएं और स्त्रियों के बाएं (या कर्मशील) हाथ की मुख्य रेखाएं देखी जाती हैं।\nहृदय रेखा गुरु पर्वत तक जाए तो सच्चा प्रेम, सीधी मस्तिष्क रेखा तेज बुद्धि और गहरी भाग्य रेखा स्व-निर्मित धन देती है।\nहथेली में त्रिशूल, मछली या सूर्य रेखा जैसे शुभ चिह्नों का अर्थ ग्रहवाणी के पामिस्ट्री टूल पर मुफ्त जानें।',
      [['हृदय रेखा', 'गुरु पर्वत तक जाए तो सच्चा प्रेम, निष्ठा और सम्मान'], ['मस्तिष्क रेखा', 'सीधी व गहरी रेखा तेज बुद्धि व मजबूत निर्णय क्षमता'], ['भाग्य रेखा', 'शनि पर्वत तक जाए तो स्व-निर्मित धन और पद']],
      [['सूर्य रेखा', 'अनामिका के नीचे खड़ी रेखा यश, कला और सरकारी सफलता देती है'], ['पर्वत विचार', 'गुरु, शुक्र और बुध पर्वत का उभार सुख-संपत्ति बढ़ाता है'], ['फोटो विश्लेषण', 'ग्रहवाणी पर हथेली के चिह्न व रेखाओं का पूरा गाइड देखें']]],
    ['face-reading', 'Samudrika & Divination', 'Face Reading (Tri-Bhumi & 9 Grahas)',
      'मुख सामुद्रिक शास्त्र—चेहरे से स्वभाव और भाग्य की पहचान। हमारे चेहरे के तीन भाग जीवन के तीन चरण बताते हैं।\nऊपरी भाग (माथा) बचपन व भाग्य, मध्य भाग (आंखें व नाक) जवानी व करियर, और निचला भाग (जबड़ा) स्थिरता दर्शाता है।\nचेहरे पर कौन सा ग्रह प्रमुख है और किस अंग की बनावट क्या संकेत देती है, ग्रहवाणी पर मुफ्त जांचें।',
      [['त्रि-भूमि नियम', 'माथा (भाग्य), मध्य मुख (कर्म) और ठुड्डी (स्थिरता)'], ['9 ग्रह स्थान', 'माथा-शनि, भौं-गुरु, आंख-सूर्य/चंद्र, नाक-मंगल, गाल-शुक्र'], ['चमक व तेज', 'साफ और तेजस्वी चेहरा मजबूत सूर्य व शुक्र की निशानी']],
      [['चौड़ा माथा', 'बुद्धि, नेतृत्व क्षमता और उच्च विचारधारा का प्रतीक'], ['सुडौल नाक', 'आत्मविश्वास, धन प्रबंधन और व्यापारिक सफलता दिखाती है'], ['फेस रीडिंग टूल', 'ग्रहवाणी पर अपने चेहरे की विशेषताओं का विश्लेषण करें']]],
    ['mole-reading', 'Samudrika & Divination', 'Mole Reading (Pingala/Ida & 20+ Spots)',
      'तिल विचार (सामुद्रिक शास्त्र)। शरीर के अलग-अलग अंगों पर तिल के स्थान का गहरा ज्योतिषीय महत्व होता है।\nसामान्यतः पुरुषों के दाहिने भाग (पिंगला नाड़ी) और स्त्रियों के बाएं भाग (इड़ा नाड़ी) का तिल शुभ फलदायी माना जाता है।\nमाथे, गाल, हथेली, नाक, गर्दन और पैर के 20 से अधिक स्थानों पर तिल का सटीक अर्थ ग्रहवाणी पर देखें।',
      [['दायां बनाम बायां', 'पुरुषों के दाएं व स्त्रियों के बाएं हिस्से का तिल अधिक शुभ'], ['धन के तिल', 'हथेली के भीतर, दाहिने गाल व नाभि के पास तिल धन देता है'], ['माथे का तिल', 'दाहिनी ओर का तिल पद, प्रतिष्ठा और विदेश यात्रा दिलाता है']],
      [['होंठ व ठुड्डी', 'मीठी वाणी, आकर्षण और भौतिक सुखों का संकेत देता है'], ['कंधे व पीठ', 'मेहनत से सफलता और जिम्मेदारियों का निर्वहन दिखाता है'], ['पूरा चार्ट', 'शरीर के सभी अंगों के तिल का फल ग्रहवाणी पर मुफ्त पढ़ें']]],
    ['forehead-lines', 'Samudrika & Divination', 'Forehead 7 Planetary Lines',
      'माथे की 7 ग्रह रेखाएं। भारतीय सामुद्रिक शास्त्र के अनुसार हमारे माथे पर ऊपर से नीचे 7 ग्रहों की अदृश्य पट्टियां होती हैं।\nसबसे ऊपर शनि, फिर गुरु, मंगल, सूर्य, शुक्र, बुध और सबसे नीचे भौंहों के पास चंद्र रेखा स्थित होती है।\nयदि सूर्य और गुरु रेखा साफ, अखंडित और गहरी हों तो व्यक्ति को अपार मान-सम्मान और नेतृत्व मिलता है।',
      [['7 रेखा क्रम', 'ऊपर शनि से लेकर गुरु, मंगल, सूर्य, शुक्र, बुध व चंद्र तक'], ['अखंडित रेखा', 'बिना कटी-फटी स्पष्ट रेखा राजयोग व दीर्घायु देती है'], ['जाल व क्रॉस', 'टूटी या क्रॉस रेखा उस ग्रह के क्षेत्र में संघर्ष बताती है']],
      [['सूर्य रेखा', 'बीच माथे पर सीधी रेखा प्रशासनिक पद और यश दिलाती है'], ['चंद्र रेखा', 'भौंहों के ऊपर शांत रेखा तेज कल्पनाशक्ति व सुख देती है'], ['चेक करें', 'ग्रहवाणी के फोरहेड रीडिंग टूल से अपनी रेखाओं का अर्थ जानें']]],
    ['signature-vastu', 'Samudrika & Divination', 'Signature Vastu (Score Out of 100)',
      'हस्ताक्षर वास्तु के 3 अचूक नियम। आपका सिग्नेचर आपकी ऊर्जा, आत्मविश्वास और धन के प्रवाह को सीधे प्रभावित करता है।\nपहला—हस्ताक्षर हमेशा 15 से 25 डिग्री ऊपर की ओर रखें; दूसरा—नाम को कभी बीच में काटें नहीं।\nतीसरा—नाम के नीचे सीधी लाइन खींचकर दो कुबेर बिंदु लगाएं; ग्रहवाणी पर अपने हस्ताक्षर का 100 में से स्कोर जांचें।',
      [['1. उर्ध्व गति (15°–25°)', 'हस्ताक्षर हमेशा ऊपर की ओर रखें—नीचे न झुकाएं'], ['2. नाम न काटें', 'वापस काटती रेखा आत्म-संदेह व बाधा पैदा करती है'], ['3. दो कुबेर बिंदु', 'साफ अंडरलाइन के नीचे दो बिंदु धन स्थिर रखते हैं']],
      [['पहला अक्षर बड़ा', 'नाम का पहला अक्षर बड़ा और स्पष्ट होना नेतृत्व बढ़ाता है'], ['अंतिम अक्षर', 'हस्ताक्षर के अंत में रेखा ऊपर उठाना उन्नति का प्रतीक है'], ['लाइव स्कोरर', 'ग्रहवाणी पर अभी अपना सिग्नेचर बनाकर 100 में से स्कोर पाएं']]],
    ['thumb-nadi', 'Samudrika & Divination', 'Thumb & Nadi (Chakra/Shankha/Dhwaja/Gadha)',
      'अंगूठे के निशान और नाड़ी शास्त्र। दुनिया में हर व्यक्ति के अंगूठे का पैटर्न उसके कर्म और भाग्य का गुप्त दस्तावेज है।\nअंगूठे पर चक्र (गोल घेरा), शंख (लूप), ध्वजा या गदा जैसे चिह्न आपके नाड़ी कांड और स्वभाव को दर्शाते हैं।\nचक्र चिह्न नेतृत्व व अधिकार, जबकि शंख चिह्न रचनात्मकता और आध्यात्मिक उन्नति का संकेत देता है—अभी जांचें।',
      [['चक्र चिह्न', 'गोल घेरा नेतृत्व, उच्च पद और स्वतंत्र सोच देता है'], ['शंख चिह्न', 'लूप पैटर्न कला, संवाद, सेवा और आध्यात्मिक लाभ देता है'], ['अंगूठे के पोर', 'पहला पोर इच्छाशक्ति व दूसरा पोर तर्क शक्ति बताता है']],
      [['यव चिह्न (जौ)', 'अंगूठे के जोड़ पर जौ का चिह्न धन, मकान और सुख का प्रतीक'], ['नाड़ी संबंध', 'दक्षिण भारतीय नाड़ी ज्योतिष अंगूठे के निशान से ही देखा जाता है'], ['थंब टूल', 'ग्रहवाणी पर अपने अंगूठे के पैटर्न का पूरा फल पढ़ें']]],
    ['foot-reading', 'Samudrika & Divination', 'Foot Reading (Deva/Manushya/Bhumi Pada)',
      'पादुका सामुद्रिक शास्त्र—पैरों की बनावट से भाग्य। हमारे पैर की कमान, एड़ी और उंगलियां जीवन की यात्रा बताती हैं।\nपैर के तलवे के बीच स्पष्ट कमान (देव पाद) हो तो व्यक्ति भाग्यशाली और यात्राओं से लाभ पाने वाला होता है।\nयदि अंगूठे के पास वाली उंगली लंबी हो तो रचनात्मकता, और तलवे में शंख-चक्र चिह्न हों तो राजसी सुख मिलता है।',
      [['तलवे की कमान', 'स्पष्ट कमान (देव पाद) शुभ भाग्य व उच्च सम्मान देती है'], ['उंगलियों का क्रम', 'अंगूठे से घटती उंगलियां संतुलित और सफल जीवन बताती हैं'], ['तलवे के चिह्न', 'कमल, शंख, ध्वज या स्वास्तिक चिह्न अत्यंत दुर्लभ व शुभ']],
      [['एड़ी का आकार', 'गोल और कोमल एड़ी सुख-सुविधा व स्थिर परिवार का संकेत'], ['फ्लैट फुट', 'कमान न होने पर मेहनत अधिक करनी पड़ती है, दान से लाभ'], ['विस्तृत गाइड', 'ग्रहवाणी पर फुट रीडिंग टूल से अपना पाद प्रकार जानें']]],
    ['eye-reading', 'Samudrika & Divination', 'Eye Reading (5 Vedic Netra Archetypes)',
      'नेत्र सामुद्रिक शास्त्र—आंखें मन ही नहीं, भविष्य भी बताती हैं। वेदों में आंखों के 5 प्रमुख प्रकार बताए गए हैं।\nकमल नेत्र सुख-सौभाग्य, मृग नेत्र कला व आकर्षण, मत्स्य नेत्र बुद्धि, गरुड़ नेत्र नेतृत्व और गज नेत्र धैर्य देते हैं।\nआंखों का रंग, चमक और पुतलियों का आकार आपका प्रमुख ग्रह और स्वभाव बताता है—ग्रहवाणी पर जांचें।',
      [['5 वैदिक नेत्र', 'कमल, मृग, मत्स्य, गरुड़ और गज नेत्र के अलग गुण'], ['कमल व मृग नेत्र', 'आकर्षण, लोकप्रियता, धन और सुखी वैवाहिक जीवन'], ['गरुड़ व मत्स्य नेत्र', 'तेज दृष्टि, दूरदर्शिता, व्यापार व शोध में सफलता']],
      [['आंखों का रंग', 'गहरी काली व भूरी आंखें शनि-सूर्य, सुनहरी आंखें गुरु प्रभाव'], ['चमक नियम', 'प्रसन्न व चमकदार आंखें मजबूत चंद्रमा और शुक्र की निशानी'], ['चेक करें', 'ग्रहवाणी के आई रीडिंग गाइड से अपना नेत्र प्रकार पहचानें']]],
    ['dream-calc', 'Samudrika & Divination', 'Dream Timing (4 Prahars) & 50+ Symbols',
      'स्वप्न शास्त्र और चार प्रहर का नियम। हर सपने का फल उसके देखे जाने के समय (प्रहर) पर निर्भर करता है।\nसुबह 3 से 6 बजे ब्रह्म मुहूर्त (चौथे प्रहर) का सपना 1 से 10 दिन में सच होता है, जबकि रात के पहले हिस्से के सपने महीनों बाद फलित होते हैं।\nसपने में सांप, पानी, मंदिर, सोना या पितरों के दिखने का सटीक अर्थ और दुःस्वप्न शांति उपाय ग्रहवाणी पर देखें।',
      [['चौथा प्रहर (3–6 AM)', 'ब्रह्म मुहूर्त का सपना 1 से 10 दिन में सच होता है'], ['1–3 प्रहर नियम', 'रात के पहले हिस्से के सपने 1–12 माह में फलित'], ['दुःस्वप्न शांति', 'जागते ही हाथ-मुंह धोकर 11 बार महामृत्युंजय जपें']],
      [['शुभ स्वप्न', 'सपने में मंदिर, नदी, हाथी, सोना या वर्षा दिखना धन लाभ'], ['बुरे सपने पर', 'बुरा सपना किसी को न बताएं, सुबह तुलसी या शिव को अर्पित करें'], ['50+ प्रतीक', 'ग्रहवाणी के ड्रीम कैलकुलेटर पर अपने सपने का सही अर्थ देखें']]],
    ['baby-names', 'Spiritual & Utility', 'Baby Names by 27 Nakshatras',
      'जन्म नक्षत्र के अनुसार शिशु का शुभ नाम। बच्चे का नाम सिर्फ पहचान नहीं, बल्कि जीवन भर की ध्वनि-ऊर्जा है।\nजन्म समय के चंद्रमा से तय होने वाले नक्षत्र और उसके 4 चरणों (पद) के अनुसार नाम का पहला अक्षर निकलता है।\nग्रहवाणी पर जन्मतिथि डालकर तुरंत नक्षत्र अक्षर और अर्थ सहित सुंदर वैदिक व आधुनिक नाम की सूची पाएं।',
      [['27 नक्षत्र × 4 चरण', 'कुल 108 अक्षरों में से सटीक जन्म अक्षर निकलता है'], ['अर्थ का महत्व', 'सकारात्मक व दिव्य अर्थ वाला नाम भाग्य में वृद्धि करता है'], ['राशि अक्षर', 'बोलचाल का नाम भी राशि अक्षर से होने पर मन बलवान']],
      [['दोष शांति', 'यदि गंडमूल नक्षत्र हो तो 27वें दिन नक्षत्र शांति पूजन कराएं'], ['लड़का व लड़की', 'संस्कृत, वेदों और आधुनिक शैली के 1000+ चुनिंदा नाम'], ['मुफ्त टूल', 'ग्रहवाणी के बेबी नेम्स टूल पर अभी अक्षर व नाम खोजें']]],
    ['rashi-ratna', 'Spiritual & Utility', 'Rashi Ratna (Gemstone Rules)',
      'राशि रत्न धारण करने के सही नियम। कभी भी केवल प्रसिद्ध नाम या सुनी-सुनाई बात पर पुखराज, नीलम या मूंगा न पहनें।\nरत्न हमेशा जन्म कुंडली के लग्न और योगकारक ग्रह की स्थिति देखकर ही धारण करना चाहिए, अन्यथा विपरीत फल मिल सकता है।\nसही वजन (रत्ती), धातु (सोना/चांदी/तांबा), शुभ वार और मंत्र सहित पूरा रत्न गाइड ग्रहवाणी पर मुफ्त देखें।',
      [['कुंडली जांच जरूरी', 'सिर्फ लग्नेश के मित्र व योगकारक ग्रह का रत्न ही पहनें'], ['सही धातु व उंगली', 'पुखराज तर्जनी में, नीलम मध्यमा में और पन्ना कनिष्ठा में'], ['अभिमंत्रण नियम', 'गंगाजल व कच्चे दूध से शुद्ध कर शुभ वार को धारण करें']],
      [['नीलम सावधानी', 'शनि का नीलम पहनने से पहले 3 दिन परीक्षण जरूर करना चाहिए'], ['उपरत्न विकल्प', 'महंगे रत्न के स्थान पर सुनहला, जामुनिया या ओपल भी प्रभावी हैं'], ['रत्न कैलकुलेटर', 'अपनी कुंडली के अनुसार सही रत्न ग्रहवाणी पर जांचें']]],
    ['mantra-japa', 'Spiritual & Utility', 'Mantra Japa (108 Beads & Weekday Mantra)',
      'मंत्र जप और 108 मनकों का विज्ञान। सनातन परंपरा में माला में 108 दाने ब्रह्मांड, 27 नक्षत्र और 4 चरणों के प्रतीक हैं।\nसही वार के अनुसार जप करने से ग्रह दोष शांत होते हैं—जैसे सोमवार को शिव, मंगलवार को हनुमान और गुरुवार को विष्णु मंत्र।\nमाला का सुमेरु दाना कभी लांघना नहीं चाहिए; सभी 9 ग्रहों के सरल बीज मंत्र ग्रहवाणी पर सुनें व पढ़ें।',
      [['108 का रहस्य', '27 नक्षत्र × 4 चरण = 108; यह संपूर्ण ब्रह्मांड का प्रतीक'], ['सुमेरु नियम', '108वां दाना पूरा होने पर माला पलटें, सुमेरु न लांघें'], ['वार अनुसार मंत्र', 'सोमवार ॐ नमः शिवाय, शनिवार ॐ शं शनैश्चराय नमः']],
      [['सही माला', 'शिव मंत्र के लिए रुद्राक्ष, विष्णु के लिए तुलसी व लक्ष्मी के लिए कमलगट्टा'], ['दिशा नियम', 'पूर्व या उत्तर दिशा की ओर मुख करके आसन पर बैठकर जप करें'], ['मंत्र टूल', 'ग्रहवाणी पर डिजिटल जप काउंटर और वार मंत्र देखें']]],
    ['tithi-dates', 'Spiritual & Utility', 'Janma Tithi & Shraddha Tithi',
      'अंग्रेजी तारीख से भारतीय पंचांग की जन्म तिथि और श्राद्ध तिथि कैसे निकालें। भारत में पर्व और संस्कार चंद्र तिथि से मनाए जाते हैं।\nकई बार अंग्रेजी जन्मदिन की तारीख वही रहती है, लेकिन पंचांग की जन्म तिथि (जैसे शुक्ल पक्ष की अष्टमी) अलग दिन आती है।\nग्रहवाणी के तिथि कैलकुलेटर पर कोई भी पुरानी तारीख डालकर सटीक जन्म तिथि, नक्षत्र और वार्षिक श्राद्ध तिथि निकालें।',
      [['जन्म तिथि मिलान', 'किसी भी वर्ष की तारीख से सटीक हिंदू माह व तिथि जानें'], ['श्राद्ध व बरसी', 'अपरान्ह व्यापिनी तिथि के अनुसार सही श्राद्ध दिन निकालें'], ['शुक्ल व कृष्ण पक्ष', 'पक्ष और अधिक मास सहित 100% सटीक पंचांग गणना']],
      [['आयुष्मान पूजा', 'पंचांग के जन्मदिन (जन्म तिथि) पर पूजा व दान विशेष फलदायी'], ['पितृ पक्ष नियम', 'मृत्यु तिथि के ही दिन पितृ पक्ष में श्राद्ध व तर्पण किया जाता है'], ['मुफ्त कन्वर्टर', 'ग्रहवाणी पर अभी अपनी जन्म या श्राद्ध तिथि चेक करें']]],
    ['puja-vrat', 'Spiritual & Utility', 'Puja Samagri & Vrat Katha Guides',
      'त्योहार के अनुसार पूजा सामग्री और व्रत कथा गाइड। किसी भी व्रत या पूजा में सही सामग्री और विधि मन को शांत रखती है।\nचाहे सत्यनारायण पूजा हो, गणेश चतुर्थी, शिवरात्रि, करवा चौथ या एकादशी—संकल्प और कथा श्रवण से पूजा पूर्ण होती है।\nग्रहवाणी पर हर त्योहार की पूरी चेकलिस्ट, मंत्र, आरती और सरल व्रत कथा 6 भाषाओं में बिल्कुल मुफ्त पढ़ें।',
      [['पूर्ण सामग्री लिस्ट', 'रोली, मौली, अक्षत, धूप, दीप, नैवेद्य व पुष्प चेकलिस्ट'], ['संकल्प विधि', 'हाथ में जल-अक्षत लेकर नाम, गोत्र व तिथि से संकल्प'], ['व्रत कथा व आरती', 'पूजन के अंत में कथा सुनें और परिवार सहित आरती करें']],
      [['दिशा व आसन', 'पूजा में कुश या ऊनी आसन का प्रयोग ऊर्जा संचित रखता है'], ['प्रसाद नियम', 'शुद्ध सात्विक नैवेद्य अर्पित कर सभी में वितरित करें'], ['सभी गाइड', 'ग्रहवाणी पर अपने अगले त्योहार की पूरी पूजा विधि देखें']]]
  ];
  const topCat = $('#soc-top-cat'), topId = $('#soc-top-id'), topScript = $('#soc-top-script'), topCap = $('#soc-top-cap');
  const resetTopReel = () => {
    const v = $('#soc-top-vid'), a = $('#soc-top-acts');
    if (v) { if (v.dataset.url) { URL.revokeObjectURL(v.dataset.url); delete v.dataset.url; } v.innerHTML = `<p class="muted small">${esc(t('socad.reelHint'))}</p>`; }
    if (a) a.querySelectorAll('.soc-dl, .soc-share').forEach(x => x.remove());
  };
  const topicContext = () => {
    const [sy, sm, sd] = st.date.split('-').map(Number);
    const selDt = new Date(Date.UTC(sy, sm - 1, sd));
    const rHi = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
    const chSign = (() => {
      const jd = Date.UTC(sy, sm - 1, sd, 0, 30) / 86400000 + 2440587.5;
      if (window.Jyotish && window.Jyotish.transit) return (Math.floor(window.Jyotish.transit(jd).lon.Moon / 30) + 5) % 12;
      const d = jd - 2451545.0, L0 = (218.316 + 13.176396 * d) % 360, M = (134.963 + 13.064993 * d) * Math.PI / 180;
      const ayan = 23.85 + 0.01397 * (d / 365.25), sid = ((L0 + 6.289 * Math.sin(M) - ayan) % 360 + 360) % 360;
      return (Math.floor(sid / 30) + 5) % 12;
    })();
    const wdHi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'][selDt.getUTCDay()];
    return { DATE: st.date, WD: wdHi, CITY: st.city, CH: rHi[chSign] };
  };
  const fillTopicVars = (str, ctx) => String(str || '').replace(/\{DATE\}/g, ctx.DATE).replace(/\{WD\}/g, ctx.WD).replace(/\{CITY\}/g, ctx.CITY).replace(/\{CH\}/g, ctx.CH);
  const drawTopicCap = (cur) => {
    if (!topCap || !cur) return;
    const ctx = topicContext();
    const host = location.origin;
    const TOPIC_TAGS = {
      'daily-rashifal': '#aajkarashifal #rashifal #horoscopetoday #vedicastrology #grahavani',
      'daily-panchang': '#dainikpanchang #aajkapanchang #shubhmuhurat #vedicastrology #grahavani',
      'special-day': '#aajkaspecial #shubhmuhurat #vrattyohar #vedicastrology #grahavani',
      'rahu-kaal': '#rahukaal #abhijitmuhurat #shubhmuhurat #dainikpanchang #grahavani',
      'chandrashtama': '#chandrashtama #aajkarashifal #astrologyalerts #vedicastrology #grahavani',
      'hora-time': '#horatime #shubhghadi #muhurat #vedicastrology #grahavani',
      'choghadiya': '#choghadiya #amritchoghadiya #shubhmuhurat #dainikpanchang #grahavani',
      'weekly-rashifal': '#weeklyrashifal #saptahikrashifal #rashifal #vedicastrology #grahavani',
      'weekly-festivals': '#vrattyohar #hindufestivals #panchang #sanatandharma #grahavani',
      'weekly-avoid': '#bhadra #panchak #shubhmuhurat #hinducalendar #grahavani',
      'mesha-gochar': '#grahagochar #meshrashi #shanigochar #vedicastrology #grahavani',
      'vakri-margi': '#vakrigrah #retrograde #grahagochar #vedicastrology #grahavani',
      'sade-sati': '#sadesati #shanidev #dhaiya #shanigochar #grahavani',
      'graha-yuti': '#grahayuti #rajayoga #gajakesari #vedicastrology #grahavani',
      'grahan': '#grahan #suryagrahan #chandragrahan #sutakkal #grahavani',
      'ast-uday': '#guruast #shukraast #vivahmuhurat #vedicastrology #grahavani',
      'ekadashi': '#ekadashi #ekadashivrat #vishnubhakti #sanatandharma #grahavani',
      'purnima-amavasya': '#purnima #amavasya #pitrupaksha #vedicastrology #grahavani',
      'panchak': '#panchak #panchakalert #hinducalendar #vedicastrology #grahavani',
      'rare-muhurat': '#gurupushyayoga #sarvarthasiddhi #mahamuhurat #vedicastrology #grahavani',
      'raj-yogas': '#rajyoga #kundali #panchmahapurush #vedicastrology #grahavani',
      'kaal-sarp': '#kaalsarpdosh #shivshakti #kundali #vedicastrology #grahavani',
      'mangal-dosha': '#mangaldosha #manglik #kundalimilan #vedicastrology #grahavani',
      'navamsha': '#navamsha #d9chart #marriageastrology #vedicastrology #grahavani',
      'ashtakavarga': '#ashtakavarga #kundali #jyotishshastra #vedicastrology #grahavani',
      'varshphal': '#varshphal #tajikastrology #annualhoroscope #vedicastrology #grahavani',
      'dasha-shift': '#mahadasha #antardasha #vimshottari #vedicastrology #grahavani',
      'lagna-12': '#lagna #ascendant #kundali #vedicastrology #grahavani',
      'business-kundali': '#businessastrology #shubhmuhurat #startupastrology #vedicastrology #grahavani',
      'prashna': '#prashnakundali #horaryastrology #jyotish #vedicastrology #grahavani',
      'delivery-muhurat': '#deliverymuhurat #shubhmuhurat #nakshatra #vedicastrology #grahavani',
      'muhurat-guides': '#vivahmuhurat #grihapravesh #shubhmuhurat #hinducalendar #grahavani',
      'mulank-bhagyank': '#mulank #bhagyank #numerology #ankjyotish #grahavani',
      'monthly-mulank': '#monthlynumerology #mulank #ankjyotish #numerology #grahavani',
      'comment-numerology': '#numerology #luckynumber #dateofbirth #ankjyotish #grahavani',
      'kundali-match': '#kundalimilan #36guna #marriagematching #vedicastrology #grahavani',
      'biodata': '#marriagebiodata #vivahbiodata #kundalimilan #indianwedding #grahavani',
      'family-kundali': '#familykundali #jyotish #rashifal #vedicastrology #grahavani',
      'palm-lines': '#palmistry #hastrekha #palmreading #samudrikashastra #grahavani',
      'face-reading': '#facereading #samudrikashastra #mukhshastra #vedicastrology #grahavani',
      'mole-reading': '#molereading #tilvichar #samudrikashastra #jyotish #grahavani',
      'forehead-lines': '#foreheadlines #samudrikashastra #hastrekha #vedicastrology #grahavani',
      'signature-vastu': '#signaturevastu #vastutips #numerology #wealthmindset #grahavani',
      'thumb-nadi': '#nadiastrology #thumbreading #samudrikashastra #jyotish #grahavani',
      'foot-reading': '#footreading #samudrikashastra #jyotish #vedicastrology #grahavani',
      'eye-reading': '#eyereading #samudrikashastra #netrashastra #jyotish #grahavani',
      'dream-calc': '#dreammeaning #swapnashastra #brahmamuhurta #vedicastrology #grahavani',
      'baby-names': '#babynames #nakshatranames #hindubabynames #vedicastrology #grahavani',
      'rashi-ratna': '#rashiratna #gemstones #jyotishratna #vedicastrology #grahavani',
      'mantra-japa': '#mantrajapa #108beads #sanatandharma #bhakti #grahavani',
      'tithi-dates': '#janmatithi #shraddhatithi #hindupanchang #vedicastrology #grahavani',
      'puja-vrat': '#pujavidhi #vratkatha #sanatandharma #hindufestivals #grahavani'
    };
    const tagsMap = {
      'Daily & Weekly': '#aajkarashifal #dainikpanchang #shubhmuhurat #vedicastrology #grahavani',
      'Rashi Events': '#rashifal #gochar #vedicastrology #jyotish #grahavani',
      'Kundali & Dosha': '#kundali #astrology #jyotishupay #vedicastrology #grahavani',
      'Numerology & Match': '#numerology #mulank #kundalimilan #vedicastrology #grahavani',
      'Samudrika & Divination': '#samudrikashastra #palmistry #vastutips #vedicastrology #grahavani',
      'Spiritual & Utility': '#sanatandharma #vrattyohar #bhakti #vedicastrology #grahavani'
    };
    const tags = TOPIC_TAGS[cur[0]] || tagsMap[cur[1]] || '#vedicastrology #jyotish #horoscope #rashifal #grahavani';
    const pts = [...(cur[4] || []), ...(cur[5] || [])].map(([k, v]) => `• ${fillTopicVars(k, ctx)}: ${fillTopicVars(v, ctx)}`);
    const kwPts = [...(cur[4] || []), ...(cur[5] || [])].map(([k]) => fillTopicVars(k, ctx)).join(', ');
    topCap.value = [
      `✨ ${cur[2]} (${st.date})`,
      '',
      fillTopicVars(cur[3], ctx),
      '',
      ...pts,
      '',
      `🪔 ग्रहवाणी (Grahavani) पर सटीक पंचांग, राशिफल, मुहूर्त, कुंडली और वैदिक उपाय 6 भाषाओं में बिल्कुल मुफ़्त देखें।`,
      `👇 कमेंट में अपनी राशि या जन्म तिथि लिखें और अपनों के साथ शेयर करें 🙏`,
      `🔗 Free Vedic Kundali & Tools: ${host} (Link in Bio)`,
      '',
      `${cur[2]}, ${cur[0].replace(/-/g, ' ')}, ${cur[1]}, ${kwPts}, ${st.date}, grahavani, vedic astrology, jyotish in hindi, free kundali online, hindu panchang, shubh muhurat, vedic remedies`,
      '',
      tags
    ].join('\n');
  };
  const syncTopics = () => {
    if (!topCat || !topId) return;
    const cat = topCat.value;
    const list = cat === 'all' ? REEL_TOPICS : REEL_TOPICS.filter(x => x[1] === cat);
    topId.innerHTML = list.map(([id, c, name]) => `<option value="${id}">${esc(name)} (${esc(c)})</option>`).join('');
    const cur = REEL_TOPICS.find(x => x[0] === topId.value) || list[0];
    if (topScript && cur) topScript.value = fillTopicVars(cur[3], topicContext());
    drawTopicCap(cur);
    resetTopReel();
  };
  const topicCardBlobs = async (topic, rawPoints, subLabel) => {
    const W = 1080, H = 1920, MX = 72;
    const ctx = topicContext();
    const points = (rawPoints || topic[4] || []).map(([ptTag, ptText]) => [fillTopicVars(ptTag, ctx), fillTopicVars(ptText, ctx)]);
    let rowBands = [];
    const drawFrame = (withRows) => new Promise(resolve => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.fillStyle = '#FBF7EF'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#FCEBDA'; x.beginPath(); x.arc(W - 40, 40, 170, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#17172B'; x.font = '700 30px Hind, sans-serif'; x.fillText('GRAHAVANI', MX, 124);
      x.strokeStyle = '#E0701B'; x.lineWidth = 2.5; x.fillStyle = '#FFFFFF';
      x.beginPath(); x.roundRect(W - MX - 160, 84, 160, 58, 29); x.fill(); x.stroke();
      x.fillStyle = '#E0701B'; x.font = '700 28px Hind, sans-serif'; x.textAlign = 'center'; x.fillText('हिन्दी', W - MX - 80, 122); x.textAlign = 'left';
      x.fillStyle = '#E0701B'; x.font = '700 28px Hind, sans-serif'; x.fillText((subLabel || topic[1].toUpperCase()) + ' · ' + st.date, MX, 224);
      x.fillStyle = '#17172B'; x.font = '700 60px Hind, sans-serif';
      const words = topic[2].split(' '), lines = []; let curL = '';
      for (const w of words) { const test = curL ? curL + ' ' + w : w; if (x.measureText(test).width > W - 2 * MX && curL) { lines.push(curL); curL = w; } else curL = test; }
      if (curL) lines.push(curL);
      let y = 310;
      lines.slice(0, 2).forEach(l => { x.fillText(l, MX, y); y += 78; });
      x.fillStyle = '#E0701B'; x.beginPath(); x.roundRect(MX, y - 36, 110, 10, 5); x.fill(); y += 22;
      x.fillStyle = '#FFFFFF'; x.shadowColor = 'rgba(90,74,42,0.12)'; x.shadowBlur = 20; x.shadowOffsetY = 6;
      const cy = y + 20, cw = W - 2 * (MX - 20), ch = 960;
      x.beginPath(); x.roundRect(MX - 20, cy, cw, ch, 36); x.fill();
      x.shadowColor = 'transparent';
      if (withRows) {
        rowBands = points.map((_, idx) => [MX - 10, cy + 18 + idx * 300, cw - 20, 290]);
        const tones = ['#23855A', '#D0342C', '#E0701B'], bgs = ['#E4F3EC', '#FBE3E1', '#FCEBDA'];
        points.forEach(([ptTag, ptText], idx) => {
          const ry = cy + 36 + idx * 300;
          if (idx > 0) { x.strokeStyle = '#EEE6D8'; x.lineWidth = 2; x.beginPath(); x.moveTo(MX + 16, ry - 18); x.lineTo(W - MX - 16, ry - 18); x.stroke(); }
          x.fillStyle = bgs[idx % 3]; x.beginPath(); x.arc(MX + 56, ry + 115, 36, 0, Math.PI * 2); x.fill();
          x.fillStyle = tones[idx % 3]; x.font = '700 32px Hind, sans-serif'; x.textAlign = 'center'; x.fillText(String(idx + 1), MX + 56, ry + 126); x.textAlign = 'left';
          x.fillStyle = tones[idx % 3]; x.font = '700 28px Hind, sans-serif'; x.fillText(ptTag, MX + 116, ry + 58);
          x.fillStyle = '#17172B'; x.font = '600 36px Hind, sans-serif';
          const pWords = ptText.split(' '), pLines = []; let pl = '';
          for (const w of pWords) { const t2 = pl ? pl + ' ' + w : w; if (x.measureText(t2).width > cw - 170 && pl) { pLines.push(pl); pl = w; } else pl = t2; }
          if (pl) pLines.push(pl);
          let py = ry + 112;
          pLines.slice(0, 3).forEach(l => { x.fillText(l, MX + 116, py); py += 50; });
        });
      }
      x.fillStyle = '#E0701B'; x.font = '700 38px Hind, sans-serif'; x.textAlign = 'center';
      x.fillText('grahavani.dhruvboghani.com', W / 2, H - 132);
      x.fillStyle = '#6E6A80'; x.font = '500 28px Hind, sans-serif';
      x.fillText('Instagram @grahavani_jyotish', W / 2, H - 84);
      x.textAlign = 'left';
      c.toBlob(b => resolve(b), 'image/png');
    });
    const [baseBlob, fullBlob] = await Promise.all([drawFrame(false), drawFrame(true)]);
    const baseUrl = URL.createObjectURL(baseBlob), fullUrl = URL.createObjectURL(fullBlob);
    return { baseUrl, fullUrl, bands: rowBands };
  };
  if (topCat && topId) {
    topCat.addEventListener('change', syncTopics);
    topId.addEventListener('change', () => {
      const cur = REEL_TOPICS.find(x => x[0] === topId.value);
      if (topScript && cur) topScript.value = fillTopicVars(cur[3], topicContext());
      drawTopicCap(cur);
      resetTopReel();
    });
    $('#soc-top-cmd').addEventListener('click', async () => {
      const cmd = `node scripts/make-reel.js --topic ${topId.value}`;
      try { await navigator.clipboard.writeText(cmd); } catch (e) { }
      toast(t('socad.copied') + ' — ' + cmd);
    });
    $('#soc-top-speak').addEventListener('click', e => {
      if (topScript) speakHindiFemale(topScript.value, e.currentTarget);
    });
    const topCapCopy = $('#soc-top-cap-copy');
    if (topCapCopy) topCapCopy.addEventListener('click', async () => {
      if (!topCap || !topCap.value) return;
      try { await navigator.clipboard.writeText(topCap.value); } catch (e) { topCap.select(); document.execCommand('copy'); }
      toast(t('socad.copied'));
    });
    const topMake = $('#soc-top-make');
    if (topMake) topMake.addEventListener('click', async () => {
      const cur = REEL_TOPICS.find(x => x[0] === topId.value); if (!cur) return;
      const box = $('#soc-top-vid'), acts = $('#soc-top-acts');
      topMake.disabled = true; resetTopReel();
      box.innerHTML = `<div class="soc-prog"><i style="width:0%"></i></div><p class="muted small" data-ptext>${esc(t('socad.loading'))}</p>`;
      try {
        await loadScript('/assets/mp4-muxer.js?v=' + ASSET_V);
        await loadScript('/assets/reelmaker.js?v=' + ASSET_V);
        const card = (k, l) => { const u = img(k, l, 'story') + '&theme=modern'; return { full: u, base: u + '&part=base' }; };
        const ncard = (k, l) => { const num = k.startsWith('bhagyank') ? st.nu.b : st.nu.n; const u = apiUrl(`/api/social/?img=${k}&fmt=story&lang=${l}&date=${st.date}&n=${num}&y=${st.nu.y}&theme=modern`); return { full: u, base: u + '&part=base' }; };
        const ycard = (k, l) => { const u = apiUrl(`/api/social/?img=${k}&fmt=story&lang=${l}&date=${st.date}&sign=${st.yt.sign}&bSign=${st.yt.bSign}&gSign=${st.yt.gSign}&planet=${st.yt.planet}&purpose=${st.yt.purpose}&topic=${st.yt.topic}&vrat=${st.yt.vrat}&dream=${st.yt.dream}&city=${cityQ()}&theme=modern`); return { full: u, base: u + '&part=base' }; };
        const muh3 = !!(st.xcaps.day.en && st.xcaps.day.en.hasFest);
        const music = st.music && st.music !== 'none' ? '/music/' + st.music : null;
        const ttsText = (topScript && topScript.value.trim()) || fillTopicVars(cur[3], topicContext());
        const tts = apiUrl('/api/social/?tts=' + encodeURIComponent(ttsText) + '&lang=hi');
        const [s1, s2] = await Promise.all([
          topicCardBlobs(cur, cur[4], cur[1].toUpperCase()),
          topicCardBlobs(cur, cur[5], 'विस्तृत नियम व उपाय')
        ]);
        const TOPIC_CARDS = {
          'daily-rashifal': [card('rashifal', 'hi'), card('rashifal2', 'hi')],
          'daily-panchang': [card('panchang', 'hi'), card('panchang2', 'hi')],
          'special-day': [card('day', 'hi'), card('day2', 'hi'), ...(muh3 ? [card('day3', 'hi')] : [])],
          'weekly-rashifal': [card('week', 'hi'), card('week2', 'hi')],
          'weekly-festivals': [card('fest', 'hi'), card('fest2', 'hi')],
          'mulank-bhagyank': [ncard('mulank', 'hi'), ncard('mulank2', 'hi')],
          'monthly-mulank': [ncard('numonth', 'hi'), ncard('numonth2', 'hi')],
          'sade-sati': [ycard('transit', 'hi'), ycard('transit2', 'hi')],
          'vakri-margi': [ycard('transit', 'hi'), ycard('transit2', 'hi')],
          'graha-yuti': [ycard('transit', 'hi'), ycard('transit2', 'hi')],
          'kundali-match': [ycard('match', 'hi'), ycard('match2', 'hi')],
          'rashi-ratna': [ycard('gem', 'hi'), ycard('gem2', 'hi')],
          'muhurat-guides': [ycard('muhurta', 'hi'), ycard('muhurta2', 'hi')],
          'prashna': [ycard('prashna', 'hi'), ycard('prashna2', 'hi')],
          'ekadashi': [ycard('vrat', 'hi'), ycard('vrat2', 'hi')],
          'puja-vrat': [ycard('vrat', 'hi'), ycard('vrat2', 'hi')],
          'baby-names': [ycard('names', 'hi'), ycard('names2', 'hi')],
          'dream-calc': [ycard('dream', 'hi'), ycard('dream2', 'hi')],
          'dasha-shift': [ycard('dasha', 'hi'), ycard('dasha2', 'hi')]
        };
        const extraCards = TOPIC_CARDS[cur[0]] || [card('day', 'hi')];
        const res = await window.GVReel.make({
          cards: [
            { full: s1.fullUrl, base: s1.baseUrl, bands: s1.bands },
            { full: s2.fullUrl, base: s2.baseUrl, bands: s2.bands },
            ...extraCards
          ],
          per: 1, hold: 6.5, outro: card('outro', 'hi'), music, tts, minSec: 42,
          onProgress: (p, stage) => { const bar = box.querySelector('.soc-prog i'), tx = box.querySelector('[data-ptext]'); if (bar) bar.style.width = Math.round(p * 100) + '%'; if (tx) tx.textContent = stage === 'load' ? t('socad.loading') : stage === 'music' ? t('socad.addingMusic') : t('socad.making', { p: Math.round(p * 100) }); }
        });
        URL.revokeObjectURL(s1.baseUrl); URL.revokeObjectURL(s1.fullUrl);
        URL.revokeObjectURL(s2.baseUrl); URL.revokeObjectURL(s2.fullUrl);
        const url = URL.createObjectURL(res.blob), name = `grahavani-${cur[0]}-${st.date}.mp4`;
        box.dataset.url = url;
        box.innerHTML = `<video src="${url}" controls playsinline loop></video>`;
        acts.insertAdjacentHTML('beforeend', `<a class="btn-line soc-dl" href="${url}" download="${name}">${ic('i-download')}${esc(t('socad.downloadMp4'))}</a>`);
      } catch (e) {
        const why = e && e.message === 'unsupported' ? '' : String((e && (e.message || e.name)) || e || '').slice(0, 160);
        box.innerHTML = `<p class="err">${esc(e && e.message === 'unsupported' ? t('socad.noReel') : t('socad.reelFail'))}</p>${why ? `<p class="muted small">${esc(t('socad.why', { e: why }))}</p>` : ''}`;
      }
      topMake.disabled = false;
    });
    syncTopics();
  }
  const drawSchedule = () => {
    const box = $('#soc-sched-body'); if (!box) return;
    const [sy, sm, sd] = st.date.split('-').map(Number);
    const base = new Date(Date.UTC(sy, sm - 1, sd));
    const sunOff = -base.getUTCDay();
    const rNames = L.names.rashi || ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const chFor = dt => {
      if (window.Jyotish && window.Jyotish.transit) {
        const jd = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 30) / 86400000 + 2440587.5;
        return rNames[(Math.floor(window.Jyotish.transit(jd).lon.Moon / 30) + 5) % 12] || '—';
      }
      // Lightweight sidereal Moon sign fallback (accurate for daily Chandrashtama display)
      const jd = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 30) / 86400000 + 2440587.5;
      const d = jd - 2451545.0, L0 = (218.316 + 13.176396 * d) % 360, M = (134.963 + 13.064993 * d) * Math.PI / 180;
      const ayan = 23.85 + 0.01397 * (d / 365.25), sid = ((L0 + 6.289 * Math.sin(M) - ayan) % 360 + 360) % 360;
      return rNames[(Math.floor(sid / 30) + 5) % 12] || '—';
    };
    const PLAN = [
      ['Weekly Rashifal + Chandrashtama', 'Signature Vastu (3 Rules + Kubera Dots)', 'signature-vastu'],
      ['Somwar Shiva Mantra (Japa) + Panchang', 'Dream Timing (Brahma Muhurta 3–6 AM)', 'dream-calc'],
      ['Mangal Dosha Myths + Chandrashtama', 'Palm Reading (Heart Line: Guru vs Shani)', 'palm-lines'],
      ['Budh Hora + Business Kundali', 'Numerology Comment Hook (Mulank 1–9)', 'comment-numerology'],
      ['Guru / Pukhraj Rules + Chandrashtama', 'Forehead Lines (Surya & Guru Rekha)', 'forehead-lines'],
      ['Kundali 36 Guna / Love Match + D-9', 'Mole Reading (Right vs Left Rules)', 'mole-reading'],
      ['Sade Sati & Dhaiya Upay + Chandrashtama', 'Thumb & Nadi (Chakra vs Shankha)', 'thumb-nadi']
    ];
    const DAILY_BASE = '1. Special Day (Events, Muhurat & Precautions) · 2. Rashifal (All 12 Signs) · 3. Panchang';
    const df = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
    const dtToday = new Date(Date.UTC(td.y, td.m - 1, td.d)), dtTom = new Date(Date.UTC(td.y, td.m - 1, td.d + 1));
    const pTod = PLAN[dtToday.getUTCDay()], pTom = PLAN[dtTom.getUTCDay()];
    const quickCards = `<div class="soc-row" style="margin-bottom:12px">
      <div class="card" style="padding:12px"><b>Today (${esc(df.format(dtToday))})</b><p class="small muted">Chandrashtama: <b>${esc(chFor(dtToday))}</b></p><p class="small"><b>Daily:</b> ${DAILY_BASE}<br><b>Event / Tool:</b> ${esc(pTod[0])} · <button type="button" class="linkbtn" data-pick-topic="${pTod[2]}">${esc(pTod[1])}</button></p></div>
      <div class="card" style="padding:12px"><b>Tomorrow (${esc(df.format(dtTom))})</b><p class="small muted">Chandrashtama: <b>${esc(chFor(dtTom))}</b></p><p class="small"><b>Daily:</b> ${DAILY_BASE}<br><b>Event / Tool:</b> ${esc(pTom[0])} · <button type="button" class="linkbtn" data-pick-topic="${pTom[2]}">${esc(pTom[1])}</button></p></div>
    </div>`;
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const dt = new Date(Date.UTC(sy, sm - 1, sd + sunOff + i));
      const iso = isoDay(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
      const tag = iso === today ? ' (Today)' : iso === plus(1) ? ' (Tomorrow)' : '';
      const p = PLAN[dt.getUTCDay()];
      rows.push(`<tr${iso === today ? ' class="live"' : ''}><td><b>${esc(df.format(dt))}</b>${esc(tag)}<br><small class="muted">Chandrashtama: ${esc(chFor(dt))}</small></td><td>Special Day · Rashifal (12 Signs) · Panchang</td><td>${esc(p[0])}</td><td><button type="button" class="linkbtn" data-pick-topic="${p[2]}">${esc(p[1])}</button></td></tr>`);
    }
    box.innerHTML = quickCards + `<div class="seo-tablewrap"><table class="seo-table"><thead><tr><th>Day &amp; Chandrashtama</th><th>Daily Reels (All 3)</th><th>Event / Transit Reel</th><th>Module / Evergreen Reel</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    box.querySelectorAll('[data-pick-topic]').forEach(b => b.addEventListener('click', () => {
      if (topCat && topId) {
        topCat.value = 'all'; syncTopics();
        topId.value = b.dataset.pickTopic;
        const cur = REEL_TOPICS.find(x => x[0] === topId.value);
        if (topScript && cur) topScript.value = cur[3];
        resetTopReel();
        $('#soc-topics').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }));
  };
  drawSchedule();
  $$('#soc-fmt button').forEach(b => b.addEventListener('click', () => { st.fmt = b.dataset.fmt; $$('#soc-fmt button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); }));
  let activeSpeakBtn = null;
  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (activeSpeakBtn) {
      activeSpeakBtn.classList.remove('active');
      const sp = activeSpeakBtn.querySelector('span');
      if (sp) sp.textContent = t('socad.speakHindi');
      const use = activeSpeakBtn.querySelector('use');
      if (use) use.setAttribute('href', '#i-speaker');
      activeSpeakBtn = null;
    }
  }

  function getHindiFemaleVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    const hiVoices = voices.filter(v => /^hi([-_]|$)/i.test(v.lang) || /hindi/i.test(v.name));
    if (!hiVoices.length) {
      const inVoices = voices.filter(v => /[-_]IN$/i.test(v.lang));
      const inFemale = inVoices.find(v => /(female|aditi|raveena|priya|heera|veena)/i.test(v.name));
      return inFemale || inVoices[0] || null;
    }
    const female = hiVoices.find(v => /(female|lekha|swara|kalpana|aditi|veena|priya|zira|sangeeta|meera|ananya)/i.test(v.name));
    return female || hiVoices[0];
  }

  function extractHindiSpeechText(raw) {
    if (!raw) return '';
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const cleanLines = lines.filter(l => !l.startsWith('#') && !/^https?:\/\//i.test(l) && !/^[-—=_\s]+$/.test(l));
    const devanagariLines = cleanLines.filter(l => /[\u0900-\u097F]/.test(l));
    const targetLines = devanagariLines.length ? devanagariLines : cleanLines;
    return targetLines.join(' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/#[\w\u0900-\u097F]+/g, '')
      .replace(/[★☆✦✧•●■◆✓✔✨🪔🕉️🔮☀️🎨🔗➕🗣️]/gu, ' ')
      .replace(/[*_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function speakHindiFemale(text, btn) {
    if (!('speechSynthesis' in window)) {
      toast('Speech synthesis not supported');
      return;
    }
    if (activeSpeakBtn === btn && window.speechSynthesis.speaking) {
      stopSpeaking();
      return;
    }
    stopSpeaking();

    const clean = extractHindiSpeechText(text);
    if (!clean) {
      toast(t('socad.speakHindi'));
      return;
    }

    const ut = new SpeechSynthesisUtterance(clean);
    ut.lang = 'hi-IN';
    ut.rate = 0.92;
    ut.pitch = 1.15;

    const voice = getHindiFemaleVoice();
    if (voice) ut.voice = voice;

    btn.classList.add('active');
    const sp = btn.querySelector('span');
    if (sp) sp.textContent = t('socad.speakStop');
    const use = btn.querySelector('use');
    if (use) use.setAttribute('href', '#i-stop');
    activeSpeakBtn = btn;

    ut.onend = () => { if (activeSpeakBtn === btn) stopSpeaking(); };
    ut.onerror = () => { if (activeSpeakBtn === btn) stopSpeaking(); };
    window.speechSynthesis.speak(ut);
  }

  body.addEventListener('click', async e => {
    const mk = e.target.closest('[data-make]'); if (mk) return makeReel(mk.dataset.make, mk);
    const spk = e.target.closest('[data-speak]');
    if (spk) {
      const k = spk.dataset.speak;
      let text = '';
      if (k === 'yt') text = ($('#soc-yt-cap') || {}).value;
      else if (k === 'chan') text = ($('#soc-chan') || {}).value;
      else if (k === 'reply') text = ($('#soc-reply') || {}).value;
      else if (k.startsWith('grid_')) text = ($(`[data-cap="${k.replace('grid_', '')}"]`) || {}).value;
      else text = ($(`[data-rcap="${k}"]`) || {}).value;
      return speakHindiFemale(text, spk);
    }
    const b = e.target.closest('[data-copy],[data-rcopy]'); if (!b) return;
    const ta = b.dataset.copy ? $(`[data-cap="${b.dataset.copy}"]`) : $(`[data-rcap="${b.dataset.rcopy}"]`);
    try { await navigator.clipboard.writeText(ta.value); } catch (err) { ta.select(); document.execCommand('copy'); }
    toast(t('socad.copied'));
  });
  const loadNotice = async () => {
    const box = $('#soc-notice'); if (!box) return;
    try {
      const r = await api(`/api/social/?caption=1&kind=notice&lang=en&date=${today}&city=${cityQ()}`);
      const list = r.list || [];
      if (!list.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
      const d1 = plus(1), d2 = plus(2);
      const tagFor = d => d === today ? 'Today' : d === d1 ? 'Tomorrow' : d === d2 ? 'In 2 Days' : d;
      box.style.display = '';
      box.innerHTML = `<h4>🔔 Upcoming Event Notice (Next 2 Days — Make Reel!)</h4><p class="muted small">Special festival, vrat, or astronomical event detected in the next 48 hours. Click to load and generate its reel:</p><div class="soc-notice-list">${list.map(e => `<div class="soc-notice-item"><div><span class="soc-notice-tag">${esc(tagFor(e.date))} · ${esc(e.date)}</span> <strong>${esc(e.name)}</strong></div><button type="button" class="btn-line" data-ntopic="${esc(e.topic)}" data-ndate="${esc(e.date)}">Make Reel →</button></div>`).join('')}</div>`;
      box.querySelectorAll('[data-ntopic]').forEach(btn => btn.addEventListener('click', () => {
        const tid = btn.dataset.ntopic, nd = btn.dataset.ndate;
        if (nd) { st.date = nd; const dEl = $('#soc-date'); if (dEl) dEl.value = nd; syncQuick(); resetReels(); draw(); drawSchedule(); drawComboCap(); }
        if (topCat) topCat.value = 'all';
        syncTopics();
        if (topId && REEL_TOPICS.some(x => x[0] === tid)) { topId.value = tid; topId.dispatchEvent(new Event('change')); }
        const sec = $('#soc-topics'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
    } catch (e) { box.style.display = 'none'; }
  };
  draw(); loadWishes(); loadNotice(); drawNu(); drawYt(); syncYtFields();
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
      if (event === 'SIGNED_OUT' || !s) store.del('kg-saved-cache');
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
