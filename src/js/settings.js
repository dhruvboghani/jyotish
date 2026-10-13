/* Account settings — members only: PDF branding, reminders (e-mail / WhatsApp), private calendar feed. */
const cs = cityPicker(() => {});
const KINDS = ['festival', 'ekadashi', 'purnima', 'amavasya', 'pradosh', 'sankashti', 'sankranti'];
$('#r-kinds').innerHTML = KINDS.map(k => `<label class="chk"><input type="checkbox" value="${k}" checked><span>${esc(t('st.kind.' + k))}</span></label>`).join('');
let rowsS = [], cur = {}, pushOn = false;
// ---------- Browser notifications (web push) ----------
const b64ToBytes = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
async function currentSub() { try { const reg = await navigator.serviceWorker.ready; return await reg.pushManager.getSubscription(); } catch (e) { return null; } }
async function drawPush() {
  const box = $('#pushbox'); if (!box) return;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.navigator.standalone;
  if (!pushSupported()) { box.innerHTML = `<p class="muted">${ic('i-info')} ${esc(t(ios ? 'st.pushIos' : 'st.pushUnsupported'))}</p>`; return; }
  if (!cfg.vapidPublicKey) { box.innerHTML = `<p class="muted">${ic('i-info')} ${esc(t('st.pushNotReady'))}</p>`; return; }
  if (Notification.permission === 'denied') { box.innerHTML = `<p class="err">${esc(t('st.pushDenied'))}</p>`; return; }
  const sub = await currentSub();
  pushOn = !!sub;
  box.innerHTML = sub
    ? `<p class="push-on">${ic('i-check')} ${esc(t('st.pushOn'))}</p><div class="share-actions"><button class="btn-line" type="button" id="push-test">${esc(t('st.pushTest'))}</button><button class="linkbtn" type="button" id="push-off">${esc(t('st.pushOff'))}</button></div>`
    : `<p class="muted">${esc(t('st.pushLede'))}</p><button class="btn-cta" type="button" id="push-on">${ic('i-bell')}${esc(t('st.pushEnable'))}</button>`;
  const on = $('#push-on'), off = $('#push-off'), test = $('#push-test');
  if (on) on.onclick = enablePush;
  if (off) off.onclick = async () => { const s = await currentSub(); if (s) { await sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint); await s.unsubscribe(); } pushOn = false; await saveSettings({ reminders: collect() }); drawPush(); toast(t('st.saved')); };
  if (test) test.onclick = async () => { try { const r = await api('/api/push-test/', { method: 'POST', body: '{}' }); toast(r.sent ? t('st.pushSent') : t('st.pushNone')); } catch (e) { toast(e.status === 503 ? t('st.pushNotReady') : t('err.server')); } };
}
async function enablePush() {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { drawPush(); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(cfg.vapidPublicKey) });
    const j = sub.toJSON();
    const { error } = await sb.from('push_subscriptions').upsert({ endpoint: j.endpoint, user_id: session.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth, lang: LANG }, { onConflict: 'endpoint' });
    if (error) { toast(/relation|exist/.test(error.message) ? t('notes.setup') : error.message); return; }
    pushOn = true;
    await saveSettings({ reminders: collect() });
    toast(t('st.saved')); drawPush();
  } catch (e) { toast(e.message || t('err.server')); }
}
const feedUrl = tok => `${location.origin}/api/ics/?t=${tok}`;
function showFeed(tok) {
  const box = $('#feedbox');
  if (!tok) { box.innerHTML = `<button class="btn-cta" type="button" id="mkfeed">${esc(t('st.feedMake'))}</button>`; $('#mkfeed').onclick = makeFeed; return; }
  const http = feedUrl(tok), web = http.replace(/^https?:/, 'webcal:');
  box.innerHTML = `<div class="sharelink"><input type="text" readonly value="${esc(http)}" id="feedurl" aria-label="${esc(t('st.feed'))}"><button class="btn-cta" type="button" id="cpfeed">${esc(t('share.copy'))}</button></div>
    <div class="share-actions"><a class="btn-line" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(web)}" target="_blank" rel="noopener">${ic('i-cal')}${esc(t('st.google'))}</a><a class="btn-line" href="${esc(web)}">${ic('i-cal')}${esc(t('st.apple'))}</a><button class="linkbtn" type="button" id="newfeed">${esc(t('st.feedNew'))}</button></div>`;
  $('#cpfeed').onclick = async () => { try { await navigator.clipboard.writeText(http); toast(t('share.copied')); } catch (e) { $('#feedurl').select(); } };
  $('#newfeed').onclick = makeFeed;
}
async function makeFeed() {
  const a = new Uint8Array(24); crypto.getRandomValues(a);
  const tok = btoa(String.fromCharCode(...a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const err = await saveSettings({ feed_token: tok, reminders: collect() });
  if (err) { toast(err.message); return; }
  showFeed(tok); toast(t('st.saved'));
}
function collect() {
  const kinds = $$('#r-kinds input:checked').map(i => i.value);
  const alertIdx = $('#r-alert-for').value, ab = alertIdx !== '' && rowsS[+alertIdx] ? rowsS[+alertIdx].birth : null;
  const td = todayIn(330), city = cs.city;
  return { push: pushOn, kinds, alerts: !!ab, alertBirth: ab, lang: LANG,
    city: { name: city.name, region: city.region, lat: city.lat, lon: city.lon, tz: cs.offset(td.y, td.m, td.d), zone: city.tz } };
}
$('#remform').addEventListener('submit', async e => {
  e.preventDefault();
  const err = await saveSettings({ reminders: collect() });
  toast(err ? (/relation|exist/.test(err.message) ? t('notes.setup') : err.message) : t('st.saved'));
});
// Branding
let logo = null;
$('#b-logo').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => {
    const s = Math.min(1, 320 / img.width, 160 / img.height), c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    logo = c.toDataURL('image/png'); if (logo.length > 220000) logo = c.toDataURL('image/jpeg', 0.85);
    $('#b-prev').innerHTML = `<img src="${logo}" alt="">`; URL.revokeObjectURL(url);
  };
  img.src = url;
});
$('#b-clear').onclick = () => { logo = null; $('#b-prev').innerHTML = ''; $('#b-logo').value = ''; };
$('#brandform').addEventListener('submit', async e => {
  e.preventDefault();
  const brand = { enabled: $('#b-on').checked, name: $('#b-name').value.trim(), phone: $('#b-phone').value.trim(), email: $('#b-email').value.trim(), website: $('#b-web').value.trim(), address: $('#b-addr').value.trim(), logo };
  const err = await saveSettings({ brand });
  toast(err ? (/relation|exist/.test(err.message) ? t('notes.setup') : err.message) : t('st.saved'));
});
async function loadAll() {
  const lock = $('#st-lock'), body = $('#st-body');
  lock.hidden = !!session; body.hidden = !session;
  if (!session) { lock.innerHTML = lockCard('settings'); return; }
  rowsS = await fillKundaliSelect($('#r-alert-for'), t('st.noAlerts'));
  const s = await loadSettings(true) || {};
  if (s.error) { $('#st-note').textContent = t('notes.setup'); }
  const b = s.brand || {}, r = s.reminders || {};
  $('#b-on').checked = !!b.enabled; $('#b-name').value = b.name || ''; $('#b-phone').value = b.phone || ''; $('#b-email').value = b.email || ''; $('#b-web').value = b.website || ''; $('#b-addr').value = b.address || '';
  logo = b.logo || null; $('#b-prev').innerHTML = logo ? `<img src="${esc(logo)}" alt="">` : '';
  if (r.kinds) $$('#r-kinds input').forEach(i => { i.checked = r.kinds.includes(i.value); });
  if (r.city && isFinite(r.city.lat)) { cs.set({ name: r.city.name, region: r.city.region || '', lat: r.city.lat, lon: r.city.lon, tz: r.city.zone || 'Asia/Kolkata' }); }
  if (r.alertBirth) { const i = rowsS.findIndex(x => birthLine(x.birth) === birthLine(r.alertBirth) && x.birth.name === r.alertBirth.name); if (i >= 0) $('#r-alert-for').value = i; }
  else { const self = rowsS.findIndex(x => x.relation === 'self'); if (self >= 0) $('#r-alert-for').value = self; }
  showFeed(s.feed_token);
  drawPush();
}
readyHooks.push(loadAll);
authHooks.push(() => loadAll());
