/* Home page: birth form → /api/kundali → report. */
let lastInput = null;
const fName = $('#f-name'), fRel = $('#f-rel'), relField = $('#rel-field');
const picker = placePicker({ input: 'f-place', suggest: 'suggest', meta: 'place-meta', lat: 'f-lat', lon: 'f-lon', off: 'f-off', date: 'f-date', time: 'f-time', err: 'err', online: 'online' });

function showRelField() { if (relField) relField.hidden = !session; }

async function run(input, opts = {}) {
  lastInput = input;
  store.set('kg-last', { input, place: picker.chosen, offAuto: picker.offAuto });
  const btn = $('#go'), label = btn.textContent;
  btn.setAttribute('aria-busy', 'true'); btn.innerHTML = `<span class="spin"></span>${esc(t('form.working'))}`;
  $('#err').textContent = '';
  try {
    const body = { ...input, log: !!(opts.log && session), lang: LANG };
    if (opts.save === false) body.save = false;
    const data = await api('/api/kundali/', { method: 'POST', body: JSON.stringify(body) });
    if (data.trial) store.set('kg-trial', input);
    if (opts.log && !session) addLocalHistory(input, data);
    if (data.locked) renderPreview(data); else { renderFull(data); if (data.saved && !opts.silent) toast(t('saved.saved')); }
    if (opts.scroll) setTimeout(() => { const r = $('#report'); if (r) r.scrollIntoView({ behavior: 'smooth' }); }, 80);
  } catch (e) {
    console.error('kundali failed', e);
    $('#err').textContent = e.status === 429 ? t('err.busy') : e.status === 400 && e.data && e.data.error ? e.data.error : t('err.server');
  } finally { btn.removeAttribute('aria-busy'); btn.textContent = label; }
}

$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const err = $('#err'); err.textContent = '';
  const date = $('#f-date').value, time = $('#f-time').value;
  if (!date) { err.textContent = t('err.date'); return; }
  if (!time) { err.textContent = t('err.time'); return; }
  picker.pickFirst();
  const lat = parseFloat($('#f-lat').value), lon = parseFloat($('#f-lon').value);
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 89 || Math.abs(lon) > 180) { err.textContent = t('err.place'); $('#coords').open = true; return; }
  picker.autoOffset();
  const off = parseOff($('#f-off').value);
  if (off === null) { err.textContent = t('err.offset'); $('#coords').open = true; return; }
  const [year, month, day] = date.split('-').map(Number), [hour, minute] = time.split(':').map(Number);
  const ch = picker.chosen, placeText = $('#f-place').value.trim();
  const placeLabel = ch ? `${ch.name}, ${ch.region}` : (placeText || latStr(lat) + ', ' + lonStr(lon));
  const input = { name: fName.value.trim(), year, month, day, hour, minute, lat, lon, tzMinutes: off, placeLabel };
  if (session && fRel && fRel.value) input.relation = fRel.value;
  run(input, { scroll: true, log: true });
});

function fill(input, place) {
  fName.value = input.name || '';
  $('#f-date').value = isoDay(input.year, input.month, input.day);
  $('#f-time').value = `${pad(input.hour)}:${pad(input.minute)}`;
  $('#f-lat').value = input.lat; $('#f-lon').value = input.lon; $('#f-off').value = offStr(input.tzMinutes);
  if (fRel) fRel.value = input.relation || '';
  picker.set(place || null, input.placeLabel || '');
}

openChartHere = (birth, opts = {}) => {
  fill(birth, null); picker.offAuto = false;
  run(birth, { scroll: true, save: opts.save, silent: opts.save === false });
};

$$('a.newk').forEach(a => a.addEventListener('click', () => setTimeout(() => fName.focus(), 300)));

// ---------- Start ----------
const savedLast = store.get('kg-last');
const noSave = store.get('kg-open-nosave'); store.del('kg-open-nosave');
if (savedLast && savedLast.input) { fill(savedLast.input, savedLast.place); picker.offAuto = savedLast.offAuto !== false; }
drawWheel(null); // live sky until a chart is made

authHooks.push((event, s, was) => {
  showRelField();
  if (event === 'SIGNED_IN' && !was && lastInput) { closeModal(); run(lastInput, { silent: false }); }
  if (event === 'SIGNED_OUT' && lastInput) run(lastInput, { silent: true });
});
readyHooks.push(() => {
  showRelField();
  if (savedLast && savedLast.input) run(savedLast.input, { silent: true, save: noSave ? false : undefined, scroll: INITIAL_HASH === '#report' });
});
