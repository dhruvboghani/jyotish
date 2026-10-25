/* Vrat tracker: Ekadashi, Pradosh, Sankashti, Purnima and Amavasya fasts for the city, with the time to break
   each fast (parana / puja / moonrise), and a record of fasts kept with a streak.
   Members: kept in user_settings.reminders.vrat; guests: on this device. */
const VT_KINDS = ['ekadashi', 'pradosh', 'sankashti', 'purnima', 'amavasya'];
const vtCity = cityPicker(() => vtLoad());
const vtTz = () => { const d = todayIn(330); return vtCity.offset(d.y, d.m, d.d); };
let vt = { kinds: ['ekadashi'], done: [] }, vtList = [];
const VT_LOCAL = 'gv-vrat';

async function vtRead() {
  if (session) { const s = await loadSettings(true) || {}; const r = (s.reminders || {}).vrat; if (r) vt = { kinds: r.kinds || ['ekadashi'], done: r.done || [] }; const loc = store.get(VT_LOCAL); if (loc && loc.done && loc.done.length) { vt.done = [...new Set([...vt.done, ...loc.done])]; store.del(VT_LOCAL); vtSave(); } }
  else vt = store.get(VT_LOCAL) || vt;
}
async function vtSave() {
  vt.done = vt.done.slice(-400);
  if (!session) { store.set(VT_LOCAL, vt); return; }
  const s = await loadSettings() || {};
  const err = await saveSettings({ reminders: { ...(s.reminders || {}), vrat: vt } });
  if (err) toast(/relation|exist/.test(err.message) ? t('notes.setup') : err.message);
}
const vtName = v => v.kind === 'ekadashi' ? t('cal.ekadashi', { p: L.names.paksha[v.paksha], m: L.names.masa[v.month] }) : v.kind === 'pradosh' ? t('cal.pradosh', { p: L.names.paksha[v.paksha] }) : t('cal.' + v.kind) + (v.month != null ? ' · ' + L.names.masa[v.month] : '');
const vtDay = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
function vtBreak(v, tz) {
  const p = v.parana; if (!p) return '';
  const day = p.date !== v.date ? ' · ' + dayMonthFmt.format(vtDay(p.date)) : '';
  if (p.kind === 'parana') return t('vt.parana', { a: fTime(p.start, tz), b: fTime(p.end, tz) }) + day;
  if (p.kind === 'puja') return t('vt.puja', { a: fTime(p.start, tz), b: fTime(p.end, tz) });
  if (p.kind === 'moonrise') return t('vt.moonrise', { a: fTime(p.start, tz) });
  if (p.kind === 'sunrise') return t('vt.sunrise', { a: fTime(p.start, tz) }) + day;
  return '';
}
function vtStats(today) {
  const mine = vtList.filter(v => vt.kinds.includes(v.kind) && v.date <= today && v.kind !== 'amavasya').sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0; for (const v of mine) { if (vt.done.includes(v.id)) streak++; else if (v.date < today) break; }
  const yearN = vt.done.filter(id => id.slice(0, 4) === today.slice(0, 4)).length;
  return { streak, yearN, total: vt.done.length };
}
function vtRender() {
  const tz = vtTz(), td = todayIn(tz), today = isoDay(td.y, td.m, td.d);
  $('#vt-kinds').innerHTML = VT_KINDS.map(k => `<button type="button" class="chip" data-kind="${k}" aria-pressed="${vt.kinds.includes(k)}">${esc(t('vt.k.' + k))}</button>`).join('');
  const st = vtStats(today);
  $('#vt-stats').innerHTML = `<div class="card"><dt>${esc(t('vt.streak'))}</dt><dd class="num">${st.streak}</dd></div><div class="card"><dt>${esc(t('vt.thisYear'))}</dt><dd class="num">${st.yearN}</dd></div><div class="card"><dt>${esc(t('vt.total'))}</dt><dd class="num">${st.total}</dd></div>`;
  const row = (v, past) => {
    const done = vt.done.includes(v.id), left = Math.round((vtDay(v.date) - Date.UTC(td.y, td.m - 1, td.d)) / 864e5);
    return `<article class="card vt-row ${done ? 'done' : ''} ${v.date === today ? 'today' : ''} reveal"><div class="vt-d"><b>${esc(dayMonthFmt.format(vtDay(v.date)))}</b><small>${esc(weekdayFmt.format(vtDay(v.date)))}</small></div>
      <div class="vt-t"><b>${esc(vtName(v))}</b><small>${esc(vtBreak(v, tz))}</small></div>
      ${v.date <= today && v.kind !== 'amavasya' ? `<button type="button" class="${done ? 'btn-cta' : 'btn-line'} vt-tick" data-vid="${v.id}" aria-pressed="${done}">${ic('i-check')}${esc(t(done ? 'vt.kept' : 'vt.mark'))}</button>` : `<span class="tag">${esc(left === 1 ? t('td.tomorrow') : t('td.inDays', { n: left }))}</span>`}</article>`;
  };
  const shown = vtList.filter(v => vt.kinds.includes(v.kind));
  const next = shown.filter(v => v.date >= today).slice(0, 12), past = shown.filter(v => v.date < today).reverse().slice(0, 12);
  $('#vt-next').innerHTML = next.map(v => row(v)).join('') || `<p class="empty">${esc(t('vt.none'))}</p>`;
  $('#vt-past').innerHTML = past.map(v => row(v, true)).join('') || `<p class="empty">${esc(t('vt.none'))}</p>`;
  observeReveals();
}
document.addEventListener('click', async e => {
  const k = e.target.closest('[data-kind]');
  if (k) { const x = k.dataset.kind; vt.kinds = vt.kinds.includes(x) ? vt.kinds.filter(y => y !== x) : [...vt.kinds, x]; if (!vt.kinds.length) vt.kinds = [x]; vtRender(); vtSave(); return; }
  const b = e.target.closest('[data-vid]'); if (!b) return;
  const id = b.dataset.vid; vt.done = vt.done.includes(id) ? vt.done.filter(x => x !== id) : [...vt.done, id];
  if (APP && APP.haptic) APP.haptic('light');
  vtRender(); await vtSave();
});
async function vtLoad() {
  const c = vtCity.city, tz = vtTz();
  try { vtList = (await api(`/api/vrat/?lat=${c.lat.toFixed(3)}&lon=${c.lon.toFixed(3)}&tz=${tz}&days=120&back=120`)).vrats; } catch (e) { $('#vt-next').innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; return; }
  vtRender();
}
async function vtRun() { await vtRead(); vtLoad(); }
readyHooks.push(vtRun);
authHooks.push(() => vtRun());
