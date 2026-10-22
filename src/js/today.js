/* Today — the app's home screen (also works on the web at /today/, not indexed):
   live sky wheel for the chosen city, today's tithi and festival, best/avoid times with countdowns,
   the member's own day rating and their active sadhana. */
const tCity = (() => { const c = store.get('kg-city'); return c && isFinite(c.lat) ? c : DEFAULT_PLACE; })();
const tTz = (() => { const d = todayIn(330); try { return tzOffsetMinutes(tCity.tz || 'Asia/Kolkata', d.y, d.m, d.d, 12, 0); } catch (e) { return 330; } })();
const tClock = mkFmtLocal({ hour: 'numeric', minute: '2-digit' });
const tDay = mkFmtLocal({ weekday: 'long', day: 'numeric', month: 'long' });
function mkFmtLocal(o) { try { return new Intl.DateTimeFormat(LOCALE, { ...o, timeZone: 'UTC' }); } catch (e) { return new Intl.DateTimeFormat('en-IN', { ...o, timeZone: 'UTC' }); } }
const tAt = ms => tClock.format(new Date(ms + tTz * 60000));
const tTithi = i => (i < 15 ? L.names.paksha.Shukla : L.names.paksha.Krishna) + ' ' + (i === 14 ? L.names.tithi[14] : i === 29 ? L.names.tithi[15] : L.names.tithi[i % 15]);
const tDur = ms => { const m = Math.max(1, Math.round(ms / 60000)), h = Math.floor(m / 60); return h ? t('app.hm', { h, m: m % 60 }) : t('app.mOnly', { m }); };
function tEvName(e) { // same labels as the calendar page
  if (e.kind === 'festival') return t('fest.' + e.id);
  if (e.kind === 'sankranti') return e.id === 'sankranti' ? t('cal.sankranti', { r: { r: e.sign } }) : t('fest.' + e.id);
  if (e.id === 'ekadashi') return t('cal.ekadashi', { p: L.names.paksha[e.paksha], m: L.names.masa[e.month] });
  if (e.id === 'pradosh') return t('cal.pradosh', { p: L.names.paksha[e.paksha] });
  return t('cal.' + e.id) + (e.month != null ? ' · ' + L.names.masa[e.month] : '');
}

function tHeader() {
  const h = new Date(Date.now() + tTz * 60000).getUTCHours();
  const g = t(h < 12 ? 'app.morning' : h < 17 ? 'app.afternoon' : 'app.evening');
  const meta = session && session.user && session.user.user_metadata || {};
  const name = (meta.full_name || meta.name || '').trim().split(/\s+/)[0];
  $('#t-greet').textContent = name ? t('app.greetName', { g, n: name }) : g;
  $('#t-date').textContent = tDay.format(new Date(Date.now() + tTz * 60000));
  $('#t-cityname').textContent = tCity.name;
}

// Live sky for this city: the wheel reads #f-lat/#f-lon; the summary under it uses the same engine
function tSky() {
  $('#f-lat').value = tCity.lat; $('#f-lon').value = tCity.lon;
  drawWheel(null);
  const upd = () => {
    const d = liveSky(); if (!d) return;
    const moon = d.planets.find(p => p.name === 'Moon');
    $('#t-rising').textContent = rn(d.lagnaSign);
    $('#t-moon').textContent = rn(moon.sign) + ' · ' + nk(Math.floor(moon.lon / (360 / 27)));
    $('#t-live').textContent = t('hero.live') + ' · ' + tClock.format(new Date(Date.now() + tTz * 60000));
  };
  if (window.Jyotish) upd(); else addEventListener('load', upd);
  setInterval(() => { if (!document.hidden) upd(); }, 30000);
}

let tPan = null;
async function tPanchang() {
  const d = todayIn(tTz);
  try {
    tPan = await api(`/api/panchang/?y=${d.y}&m=${d.m}&d=${d.d}&lat=${tCity.lat.toFixed(4)}&lon=${tCity.lon.toFixed(4)}&tz=${tTz}`);
  } catch (e) { $('#t-tithi').innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; return; }
  const ti = tPan.tithi[0], nx = tPan.tithi[1], idx = ti.index;
  const phase = idx < 15 ? (idx + 1) / 15 : (30 - idx) / 15, waxing = idx < 15;
  // lit limb on the right while waxing, left while waning; the terminator bulges outward once more than half is lit
  const rx = Math.abs(1 - 2 * phase) * 25, lit = waxing ? `M28 3a25 25 0 0 1 0 50a${rx.toFixed(1)} 25 0 0 ${phase > .5 ? 1 : 0} 0-50z` : `M28 3a25 25 0 0 0 0 50a${rx.toFixed(1)} 25 0 0 ${phase > .5 ? 0 : 1} 0-50z`;
  const events = await tEvents(d);
  const evLine = events.length ? events.map(tEvName).join(' · ') : (nx ? t('app.thenNext', { x: tTithi(nx.index) }) : '');
  $('#t-tithi').innerHTML = `<svg class="t-moonph" viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="25" fill="#2A2E7C"/><path d="${lit}" fill="#F7E7B8"/></svg>
    <div><small>${esc(t('app.tithiToday', { t: tAt(ti.end) }))}</small><b>${esc(tTithi(idx))}</b><span>${esc(evLine)}</span></div>`;
  tTimes();
  setInterval(() => { if (!document.hidden) tTimes(); }, 60000);
}
async function tEvents(d) {
  const key = `gv-cal-${d.y}-${tCity.lat.toFixed(1)}-${tCity.lon.toFixed(1)}`;
  let ev = store.get(key);
  if (!ev) { try { ev = (await api(`/api/calendar/?year=${d.y}&lat=${tCity.lat.toFixed(3)}&lon=${tCity.lon.toFixed(3)}&tz=${tTz}`)).events; store.set(key, ev); } catch (e) { ev = []; } }
  const iso = `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  return ev.filter(e => e.date === iso);
}
function tTimes() {
  if (!tPan) return;
  const now = Date.now();
  const block = (cls, icon, label, name, w) => {
    if (!w) return '';
    const when = now < w.start ? t('app.startsIn', { d: tDur(w.start - now) }) : now < w.end ? t('app.endsIn', { d: tDur(w.end - now) }) : t('app.over');
    return `<div class="t-time ${cls}${now >= w.start && now < w.end ? ' now' : ''}${now >= w.end ? ' past' : ''}"><small>${ic(icon)}${esc(label)}</small><b>${esc(name)}</b><span class="num">${esc(tAt(w.start))} – ${esc(tAt(w.end))}</span><em>${esc(when)}</em></div>`;
  };
  $('#t-times').innerHTML = block('good', 'i-check', t('app.best'), t('pp.abhijit'), tPan.abhijit) + block('bad', 'i-alert', t('app.avoid'), t('pp.rahu'), tPan.rahuKaal);
}

// The member's own day: their "Self" chart (else the first saved one), computed once a day
async function tDayCard() {
  const box = $('#t-day');
  if (!session) { box.innerHTML = `<button type="button" class="t-card t-row" data-auth="login">${ic('i-star')}<span><b>${esc(t('app.yourDay'))}</b><small>${esc(t('app.loginDay'))}</small></span></button>`; return; }
  const rows = await loadMyKundalis();
  const me = rows.find(r => r.relation === 'self') || rows[0];
  if (!me) { box.innerHTML = `<a class="t-card t-row" href="${HOME}">${ic('i-star')}<span><b>${esc(t('app.yourDay'))}</b><small>${esc(t('app.addSelf'))}</small></span></a>`; return; }
  const d = todayIn(tTz), key = `gv-day-${me.id}-${d.y}${pad(d.m)}${pad(d.d)}`;
  let td = store.get(key);
  if (!td) {
    try { const r = await api('/api/kundali/', { method: 'POST', body: JSON.stringify({ ...me.birth, save: false, log: false, lang: LANG }) }); td = r.premium && r.premium.today; if (td) store.set(key, { stars: td.stars, score: td.score, area: td.area }); }
    catch (e) { td = null; }
  }
  if (!td) { box.innerHTML = ''; return; }
  const name = (me.birth.name || '').split(' ')[0];
  box.innerHTML = `<a class="t-card t-dayc" href="${HOME}" data-open-self>
    <span class="t-ring" style="--p:${td.score}"><b>${td.stars}</b><small>/5</small></span>
    <span class="t-dayt"><b>${esc(t('app.yourDay'))}${name ? ' · ' + esc(name) : ''}</b>
      <span class="t-areas">${['career', 'money', 'love', 'health'].map(a => `<span>${esc(t('rf.area.' + a))} <i>${td.area[a]}</i></span>`).join('')}</span></span>
    ${ic('i-chev')}</a>`;
  box.querySelector('[data-open-self]').addEventListener('click', e => { e.preventDefault(); openChart({ ...me.birth, relation: me.relation || undefined }, { save: false }); });
}

async function tSadhana() {
  const box = $('#t-sadhana'); if (!session) { box.innerHTML = ''; return; }
  const { rows, error } = await sdLoad(); if (error) { box.innerHTML = ''; return; }
  const act = rows.filter(r => r.status !== 'stopped' && !sdStats(r).complete && !sdStats(r).ended).slice(0, 2);
  box.innerHTML = act.length ? `<div class="sd-list compact">${act.map(r => sdCard(r, { compact: true })).join('')}</div>` : '';
  sdWire(box, act, tSadhana); observeReveals();
}

function tRun() { tHeader(); tDayCard(); tSadhana(); }
tHeader(); tSky(); tPanchang();
readyHooks.push(tRun);
authHooks.push(() => tRun());
