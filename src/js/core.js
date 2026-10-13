/* Kundali Ganit — shared browser code used by every page: i18n, formatting, icons, Supabase login,
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
if (langSel) langSel.addEventListener('change', () => { store.set('kg-lang', langSel.value); location.href = langSel.selectedOptions[0].dataset.href + (location.search || '') + (location.hash || ''); });
const navBtn = $('#navbtn'), drawer = $('#drawer');
if (navBtn && drawer) {
  const setOpen = o => { drawer.hidden = !o; navBtn.setAttribute('aria-expanded', String(o)); document.body.classList.toggle('nav-open', o); };
  navBtn.addEventListener('click', () => setOpen(drawer.hidden));
  drawer.addEventListener('click', e => { if (e.target === drawer || e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) setOpen(false); });
}

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
  const choose = p => { st.chosen = p; input.value = `${p.name}, ${p.region}`; if (el('lat')) el('lat').value = p.lat; if (el('lon')) el('lon').value = p.lon; st.offAuto = true; autoOffset(); showMeta(); close(); if (onPick) onPick(p); };
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
let session = null, isAdmin = false;
const authHooks = [];           // page code: authHooks.push((event, session, wasLoggedIn) => …)
const readyHooks = [];          // page code: readyHooks.push(session => …) runs once after the session is known
const authHeaders = () => session ? { Authorization: 'Bearer ' + session.access_token } : {};
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) } });
  let data = null; try { data = await res.json(); } catch (e) { }
  if (!res.ok) { const err = new Error((data && data.error) || 'HTTP ' + res.status); err.status = res.status; err.data = data; throw err; }
  return data;
}
// Open a chart on the Kundali page (or here, when the page can show charts itself)
let openChartHere = null;
function openChart(birth, opts = {}) {
  if (openChartHere) return openChartHere(birth, opts);
  store.set('kg-last', { input: birth, place: null, offAuto: false });
  if (opts.save === false) store.set('kg-open-nosave', true);
  location.href = HOME + '#report';
}

const GOOGLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"/></svg>';
const redirectTo = () => location.origin + location.pathname;

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
    <button type="button" class="btn-line google" id="g-btn">${GOOGLE}${esc(t('auth.google'))}</button>
    <p class="or">${esc(t('auth.or'))}</p>
    <form id="authform" novalidate>
      ${signup ? `<div class="field"><label for="a-name">${esc(t('auth.nameField'))}</label><input id="a-name" type="text" autocomplete="name"></div>` : ''}
      <div class="field"><label for="a-email">${esc(t('auth.email'))}</label><input id="a-email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="a-pass">${esc(t('auth.password'))}</label><input id="a-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required>${signup ? `<span class="place-meta">${esc(t('auth.passwordHint'))}</span>` : ''}</div>
      <p class="err" id="a-err" role="alert"></p>
      <button class="btn-cta go" type="submit">${esc(t(signup ? 'auth.signup' : 'auth.login'))}</button>
    </form>
    <div class="links">${signup ? `<span>${esc(t('auth.haveAccount'))} <button class="linkbtn" type="button" data-auth="login"${featureKey ? ` data-feature="${featureKey}"` : ''}>${esc(t('auth.toLogin'))}</button></span>` : `<button class="linkbtn" type="button" id="forgot">${esc(t('auth.forgot'))}</button><span>${esc(t('auth.noAccount'))} <button class="linkbtn" type="button" data-auth="signup"${featureKey ? ` data-feature="${featureKey}"` : ''}>${esc(t('auth.toSignup'))}</button></span>`}</div>`);
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
      const fullName = ($('#a-name').value || '').trim();
      // 1) Instant account (already confirmed) through our server, then log straight in.
      let direct = null;
      try {
        const r = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name: fullName, lang: LANG }) });
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
      if (error) { er.textContent = error.message; return; }
      if (!data.session) { er.textContent = t('auth.signupOff'); return; }
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
  return error ? [] : data || [];
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
  try { await fetch('/api/kundali', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify(trial) }); } catch (e) { }
}

// ---------- Admin panel (accounts listed in public.admins) ----------
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
  const historyRows = hs.error ? [] : (hs.data || []);
  const body = $('#ad-body'); if (!body) return;
  if (u.error || k.error) { $('#ad-stats').innerHTML = ''; body.innerHTML = `<p class="err">${esc((u.error || k.error).message)}</p>`; return; }
  const users = u.data || [], charts = k.data || [], byId = Object.fromEntries(users.map(x => [x.id, x]));
  const weekAgo = Date.now() - 7 * 864e5;
  const stat = (n, l) => `<div><b>${n}</b><span>${esc(l)}</span></div>`;
  $('#ad-stats').innerHTML = stat(users.length, t('admin.sUsers')) + stat(users.filter(x => x.confirmed).length, t('admin.sConfirmed')) + stat(charts.length, t('admin.sCharts')) + stat(users.filter(x => new Date(x.created_at) > weekAgo).length, t('admin.sNew')) + stat(historyRows.length, t('admin.sHistory'));
  let tab = 'users';
  const draw = () => {
    const q = ($('#ad-q').value || '').trim().toLowerCase();
    if (tab === 'history') {
      const rows = historyRows.filter(h => { const ow = byId[h.user_id]; return !q || [h.name, h.birth.placeLabel, ow && ow.email].join(' ').toLowerCase().includes(q); });
      body.innerHTML = `<div class="tbl-card card"><table><thead><tr><th>${esc(t('admin.when'))}</th><th>${esc(t('admin.email'))}</th><th>${esc(t('admin.name'))}</th><th>${esc(t('admin.birth'))}</th><th>${esc(t('admin.place'))}</th><th>${esc(t('admin.result'))}</th><th>${esc(t('admin.lang'))}</th></tr></thead><tbody>${rows.map(h => { const ow = byId[h.user_id]; return `<tr><td class="num">${fmtTs(h.created_at)}</td><td>${esc(ow ? ow.email : '')}</td><td>${esc(h.name || '—')}</td><td class="num">${esc(birthLine(h.birth))}</td><td>${esc(h.birth.placeLabel || '')}</td><td>${esc(histSum(h.summary))}</td><td>${esc(h.lang || '')}${h.source === 'session' ? ' · ' + esc(t('admin.fromSession')) : ''}</td></tr>`; }).join('') || `<tr><td colspan="7">${esc(t(hs.error ? 'admin.historyMissing' : 'admin.none'))}</td></tr>`}</tbody></table></div>`;
    } else if (tab === 'users') {
      const rows = users.filter(x => !q || (x.email + ' ' + (x.full_name || '')).toLowerCase().includes(q));
      body.innerHTML = `<div class="tbl-card card"><table><thead><tr><th>${esc(t('admin.email'))}</th><th>${esc(t('admin.name'))}</th><th>${esc(t('admin.status'))}</th><th>${esc(t('admin.joined'))}</th><th>${esc(t('admin.lastLogin'))}</th><th>${esc(t('admin.sCharts'))}</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x.email)}</td><td>${esc(x.full_name || '—')}</td><td><span class="tag ${x.confirmed ? 'good' : 'warn'}">${esc(t(x.confirmed ? 'admin.confirmed' : 'admin.pending'))}</span></td><td class="num">${fmtTs(x.created_at)}</td><td class="num">${fmtTs(x.last_sign_in_at)}</td><td class="num">${x.charts}</td></tr>`).join('') || `<tr><td colspan="6">${esc(t('admin.none'))}</td></tr>`}</tbody></table></div>`;
    } else {
      const rows = charts.filter(r => { const b = r.birth || {}, ow = byId[r.user_id]; return !q || [b.name, b.placeLabel, ow && ow.email].join(' ').toLowerCase().includes(q); });
      body.innerHTML = `<ul class="saved-list">${rows.map(r => { const b = r.birth || {}, ow = byId[r.user_id]; return `<li data-id="${r.id}"><span class="rgic">${esc(((b.name || '?').trim().charAt(0) || '?').toUpperCase())}</span><div><b>${esc(b.name || t('res.defaultName'))}</b><span>${esc(birthLine(b))} · ${esc(b.placeLabel || '')}</span><span style="display:block">${esc(ow ? ow.email : '')} · ${fmtTs(r.updated_at)}</span></div><button class="btn-line" type="button" data-open>${esc(t('saved.open'))}</button></li>`; }).join('') || `<li><span>${esc(t('admin.none'))}</span></li>`}</ul>`;
    }
  };
  $('#ad-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; $('#ad-tabs').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
  $('#ad-q').addEventListener('input', draw);
  body.addEventListener('click', e => {
    const li = e.target.closest('li[data-id]'); if (!li || !e.target.closest('[data-open]')) return;
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
    <div class="menu" id="usermenu" hidden><div class="who">${esc(u.email || '')}</div><button type="button" data-menu="saved">${ic('i-users')}${esc(t('nav.myCharts'))}</button><a href="${HOME}family/" class="menu-link">${ic('i-users')}${esc(t('nav.family'))}</a><a href="${HOME}matching/" class="menu-link">${ic('i-heart')}${esc(t('nav.matching'))}</a><a href="${HOME}names/" class="menu-link">${ic('i-star')}${esc(t('nav.names'))}</a><a href="${HOME}muhurta/" class="menu-link">${ic('i-cal')}${esc(t('nav.muhurta'))}</a><a href="${HOME}settings/" class="menu-link">${ic('i-shield')}${esc(t('nav.settings'))}</a>${isAdmin ? `<button type="button" data-menu="admin">${ic('i-shield')}${esc(t('admin.title'))}</button>` : ''}<button type="button" data-menu="logout">${ic('i-logout')}${esc(t('nav.logout'))}</button></div></span>`;
  const btn = $('#userbtn'), menu = $('#usermenu');
  btn.onclick = () => { menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); };
  menu.onclick = async e => {
    const m = e.target.closest('[data-menu]'); if (!m) return; menu.hidden = true;
    if (m.dataset.menu === 'saved') savedModal();
    if (m.dataset.menu === 'admin') adminModal();
    if (m.dataset.menu === 'logout') { await sb.auth.signOut(); }
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

// ---------- Boot ----------
async function boot() {
  if (sb) {
    const { data } = await sb.auth.getSession();
    session = data.session;
    if (session && /type=(signup|magiclink|email)/.test(INITIAL_HASH)) setTimeout(() => toast(t('auth.confirmed')), 300);
    sb.auth.onAuthStateChange((event, s) => {
      const was = !!session; session = s;
      renderAuthSlot(); checkAdmin().then(renderAuthSlot);
      if (event === 'PASSWORD_RECOVERY') newPasswordModal();
      if (event === 'SIGNED_IN' && !was) { saveTrialChart(s); moveLocalHistory(s); if (modal.querySelector('#authform')) closeModal(); }
      authHooks.forEach(f => { try { f(event, s, was); } catch (e) { console.error(e); } });
    });
  }
  await checkAdmin();
  renderAuthSlot();
  const linkErr = readAuthError();
  if (linkErr && sb) linkErrorModal(linkErr);
  readyHooks.forEach(f => { try { f(session); } catch (e) { console.error(e); } });
}
