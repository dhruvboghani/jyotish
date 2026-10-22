/* Tithi dates: Hindu (lunar) birthdays of the family and shraddha dates of ancestors, for the chosen city.
   Members: saved Kundalis are included; extra people and ancestors live in user_settings.reminders.tithi,
   so the daily job can send a reminder the evening before. Guests: kept on this device. */
const tdCity = cityPicker(() => tdCompute());
const TD_LOCAL = 'gv-tithi';
let tdData = { people: [], ancestors: [], remind: false }, tdFamily = [];
const tdId = () => Math.random().toString(36).slice(2, 10);
const tdName = T => pakshaOf(T - 1) + ' ' + tithiLabel(T - 1);
const tdLabel = (T, M) => t('td.tithiOf', { m: L.names.masa[M], t: tdName(T) });
const tdTz = () => { const d = todayIn(330); return tdCity.offset(d.y, d.m, d.d); };

async function tdLoadData() {
  if (session) {
    const s = await loadSettings(true) || {}, r = (s.reminders || {}).tithi || {};
    tdData = { people: r.people || [], ancestors: r.ancestors || [], remind: !!r.remind };
    // move anything added before logging in
    const local = store.get(TD_LOCAL);
    if (local && (local.people.length || local.ancestors.length)) { tdData.people.push(...local.people); tdData.ancestors.push(...local.ancestors); store.del(TD_LOCAL); await tdSave(); }
    tdFamily = (await loadMyKundalis()).map(k => ({ id: 'k:' + k.id, name: k.birth.name || k.name || '', relation: k.relation, birth: k.birth }));
  } else {
    tdData = store.get(TD_LOCAL) || { people: [], ancestors: [], remind: false }; tdFamily = [];
  }
}
async function tdSave() {
  if (!session) { store.set(TD_LOCAL, tdData); return null; }
  const s = await loadSettings() || {};
  const err = await saveSettings({ reminders: { ...(s.reminders || {}), tithi: tdData } });
  if (err) toast(/relation|exist/.test(err.message) ? t('notes.setup') : err.message);
  return err;
}

let tdSeq = 0;
async function tdCompute() {
  const my = ++tdSeq, city = tdCity.city, tz = tdTz();
  const people = [...tdFamily, ...tdData.people].map(p => ({ id: p.id, kind: 'birthday', birth: p.birth }));
  const anc = tdData.ancestors.map(a => ({ id: a.id, kind: 'shraddha', tithi: a.tithi, month: a.month }));
  if (!people.length && !anc.length) { tdRender([], tz); return; }
  $('#td-people').innerHTML = '<span class="spin"></span>';
  try {
    const r = await api('/api/tithi/', { method: 'POST', body: JSON.stringify({ lat: +city.lat.toFixed(4), lon: +city.lon.toFixed(4), tz, people: [...people, ...anc] }) });
    if (my === tdSeq) tdRender(r.people, tz);
  } catch (e) { $('#td-people').innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; }
}

function tdWhen(n, tz) {
  if (!n) return `<span class="muted">—</span>`;
  const today = todayIn(tz), days = Math.round((Date.UTC(n.y, n.m - 1, n.d) - Date.UTC(today.y, today.m - 1, today.d)) / 864e5);
  const rel = days === 0 ? t('td.today') : days === 1 ? t('td.tomorrow') : t('td.inDays', { n: days });
  return `<b>${esc(longDateFmt.format(new Date(Date.UTC(n.y, n.m - 1, n.d))))}</b><span class="tag ${days <= 7 ? 'gold' : ''}">${esc(rel)}</span>`;
}
function tdRender(res, tz) {
  const by = Object.fromEntries((res || []).map(r => [r.id, r]));
  const fam = [...tdFamily, ...tdData.people].map(p => ({ ...p, r: by[p.id] })).sort((a, b) => ((a.r && a.r.next && a.r.next.date) || '9').localeCompare((b.r && b.r.next && b.r.next.date) || '9'));
  const row = (p, extra, own) => `<article class="card td-row reveal"><div class="td-who"><b>${esc(p.name || t('res.defaultName'))}</b><small>${esc(extra)}</small></div>
    <div class="td-when">${p.r ? tdWhen(p.r.next, tz) : ''}${p.r && p.r.age != null ? `<small>${esc(t('td.turns', { n: p.r.age }))}</small>` : ''}</div>${own ? `<button type="button" class="del" data-del="${p.id}" aria-label="${esc(t('sd.remove'))}">×</button>` : ''}</article>`;
  $('#td-people').innerHTML = fam.length ? fam.map(p => row(p, [p.relation ? L.rel[p.relation] : '', p.r ? tdLabel(p.r.tithi, p.r.month) : ''].filter(Boolean).join(' · '), !String(p.id).startsWith('k:'))).join('')
    : `<p class="empty">${esc(t(session ? 'td.noPeople' : 'td.noPeopleGuest'))}</p>`;
  const anc = tdData.ancestors.map(a => ({ ...a, r: by[a.id] }));
  $('#td-anc').innerHTML = anc.length ? anc.map(a => `<article class="card td-row anc reveal"><div class="td-who"><b>${esc(a.name)}</b><small>${esc([a.relation, tdLabel(a.tithi, a.month)].filter(Boolean).join(' · '))}</small></div>
    <div class="td-when"><span class="eyebrow">${esc(t('td.annual'))}</span>${a.r ? tdWhen(a.r.next, tz) : ''}</div>
    <div class="td-when"><span class="eyebrow">${esc(t('td.mahalaya'))}</span>${a.r ? tdWhen(a.r.mahalaya, tz) : ''}</div><button type="button" class="del" data-del="${a.id}" aria-label="${esc(t('sd.remove'))}">×</button></article>`).join('')
    : `<p class="empty">${esc(t('td.noAnc'))}</p>`;
  $('#td-remind').innerHTML = session
    ? `<label class="chk"><input type="checkbox" id="td-rem" ${tdData.remind ? 'checked' : ''}><span>${esc(t('td.remind'))}</span></label><p class="muted small">${esc(t('td.remindNote'))} <a href="${HOME}settings/">${esc(t('nav.settings'))} →</a></p>`
    : `<p class="muted small">${ic('i-info')} ${esc(t('td.guestNote'))}</p><button type="button" class="btn-cta" data-auth="signup">${esc(t('members.cta'))}</button>`;
  const rem = $('#td-rem'); if (rem) rem.onchange = async () => { tdData.remind = rem.checked; await tdSave(); toast(t('st.saved')); };
  observeReveals();
}
document.addEventListener('click', async e => {
  const d = e.target.closest('[data-del]'); if (!d) return;
  if (!confirm(t('td.confirmDel'))) return;
  tdData.people = tdData.people.filter(p => p.id !== d.dataset.del); tdData.ancestors = tdData.ancestors.filter(p => p.id !== d.dataset.del);
  await tdSave(); tdCompute();
});

// Add a person (birthday) — date and time; the place is the city above
$('#td-add-p').onclick = () => {
  openModal(`<h2>${esc(t('td.addPerson'))}</h2><form id="tdp" class="sd-form" novalidate>
    <div class="field full"><label for="tdp-n">${esc(t('form.name'))}</label><input id="tdp-n" maxlength="60" required></div>
    <div class="field"><label for="tdp-d">${esc(t('td.birthDate'))}</label><input id="tdp-d" type="date" required></div>
    <div class="field"><label for="tdp-t">${esc(t('td.birthTime'))}</label><input id="tdp-t" type="time" value="12:00"></div>
    <p class="muted small full">${esc(t('td.placeNote', { c: tdCity.city.name }))}</p><p class="err full" id="tdp-e" role="alert"></p>
    <button class="btn-cta full" type="submit">${esc(t('td.save'))}</button></form>`);
  $('#tdp').onsubmit = async e => {
    e.preventDefault();
    const n = $('#tdp-n').value.trim(), d = $('#tdp-d').value, tm = ($('#tdp-t').value || '12:00').split(':').map(Number);
    if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(d)) { $('#tdp-e').textContent = t('td.fill'); return; }
    const [y, m, dd] = d.split('-').map(Number), c = tdCity.city;
    let tz = 330; try { tz = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, dd, tm[0], tm[1]); } catch (x) { }
    tdData.people.push({ id: tdId(), name: n, birth: { name: n, year: y, month: m, day: dd, hour: tm[0] || 0, minute: tm[1] || 0, lat: +c.lat.toFixed(4), lon: +c.lon.toFixed(4), tzMinutes: tz } });
    await tdSave(); closeModal(); tdCompute();
  };
};
// Add an ancestor: by known tithi, or by date of death (converted to its tithi here)
$('#td-add-a').onclick = () => {
  const tOpts = Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">${esc(tdName(i + 1))}</option>`).join('');
  const mOpts = L.names.masa.map((m, i) => `<option value="${i}">${esc(m)}</option>`).join('');
  openModal(`<h2>${esc(t('td.addAncestor'))}</h2><form id="tda" class="sd-form" novalidate>
    <div class="field"><label for="tda-n">${esc(t('form.name'))}</label><input id="tda-n" maxlength="60" required></div>
    <div class="field"><label for="tda-r">${esc(t('td.relation'))}</label><input id="tda-r" maxlength="40" placeholder="${esc(t('td.relationPh'))}"></div>
    <div class="seg full" role="group"><button type="button" data-by="date" aria-pressed="true">${esc(t('td.byDate'))}</button><button type="button" data-by="tithi" aria-pressed="false">${esc(t('td.byTithi'))}</button></div>
    <div class="field" data-f="date"><label for="tda-d">${esc(t('td.deathDate'))}</label><input id="tda-d" type="date"></div>
    <div class="field" data-f="date"><label for="tda-t">${esc(t('td.deathTime'))}</label><input id="tda-t" type="time"></div>
    <div class="field" data-f="tithi" hidden><label for="tda-m">${esc(t('pp.masa'))}</label><select id="tda-m">${mOpts}</select></div>
    <div class="field" data-f="tithi" hidden><label for="tda-ti">${esc(t('sec.pan.tithi'))}</label><select id="tda-ti">${tOpts}</select></div>
    <p class="muted small full">${esc(t('td.amanta'))}</p><p class="err full" id="tda-e" role="alert"></p>
    <button class="btn-cta full" type="submit">${esc(t('td.save'))}</button></form>`);
  let by = 'date';
  $$('#tda [data-by]').forEach(b => b.onclick = () => { by = b.dataset.by; $$('#tda [data-by]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); $$('#tda [data-f]').forEach(f => { f.hidden = f.dataset.f !== by; }); });
  $('#tda').onsubmit = async e => {
    e.preventDefault();
    const n = $('#tda-n').value.trim(), rel = $('#tda-r').value.trim(), err = $('#tda-e');
    if (!n) { err.textContent = t('td.fill'); return; }
    let tithi, month, date = null;
    if (by === 'tithi') { tithi = +$('#tda-ti').value; month = +$('#tda-m').value; }
    else {
      const d = $('#tda-d').value; if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { err.textContent = t('td.fill'); return; }
      const [y, m, dd] = d.split('-').map(Number), tm = ($('#tda-t').value || '12:00').split(':').map(Number);
      try {
        const r = await api('/api/tithi/', { method: 'POST', body: JSON.stringify({ lat: tdCity.city.lat, lon: tdCity.city.lon, tz: tdTz(), people: [{ id: 'x', kind: 'death', date: { year: y, month: m, day: dd, hour: tm[0], minute: tm[1] } }] }) });
        ({ tithi, month } = r.people[0]); date = d;
      } catch (x) { err.textContent = t('err.server'); return; }
    }
    tdData.ancestors.push({ id: tdId(), name: n, relation: rel, tithi, month, date });
    await tdSave(); closeModal(); tdCompute();
    toast(t('td.ancSaved', { x: tdLabel(tithi, month) }));
  };
};

async function tdRun() { await tdLoadData(); tdCompute(); }
readyHooks.push(tdRun);
authHooks.push(() => tdRun());
