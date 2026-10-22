/* Japa mala counter: 108 beads per round, a light tap feel on each bead and a stronger one at the end of a round.
   Progress is kept on this device per day; reaching the day's goal ticks the matching sadhana for members. */
const JP_BEADS = 108, JP_GOALS = [1, 3, 5, 7, 11, 16, 21, 108];
const JP_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const jpKey = () => sdToday();
let jp = store.get('gv-japa') || {};
if (!jp.days) jp = { days: {}, total: 0 };
let jpSd = [], jpSel = store.get('gv-japa-sel') || 'c:0';

const jpDay = () => { const k = jpKey(); jp.days[k] = jp.days[k] || { count: 0, beads: 0 }; return jp.days[k]; };
const jpSave = () => { const keys = Object.keys(jp.days).sort(); while (keys.length > 120) delete jp.days[keys.shift()]; store.set('gv-japa', jp); };

function jpOptions() {
  const cm = get('jp.common') || [];
  const sd = jpSd.map(r => `<option value="sd:${r.id}">${esc(r.title)}</option>`).join('');
  return (sd ? `<optgroup label="${esc(t('jp.mySadhana'))}">${sd}</optgroup>` : '') +
    `<optgroup label="${esc(t('jp.popular'))}">${cm.map((n, i) => `<option value="c:${i}">${esc(n)}</option>`).join('')}</optgroup>` +
    `<optgroup label="${esc(t('jp.graha'))}">${JP_PLANETS.map(p => `<option value="p:${p}">${esc(t('jp.grahaMantra', { g: { g: p } }))}</option>`).join('')}</optgroup>` +
    `<option value="x">${esc(t('jp.custom'))}</option>`;
}
function jpText() {
  const [k, v] = jpSel.split(/:(.*)/);
  if (k === 'c') return (L.names.japaMantra || [])[+v] || '';
  if (k === 'p') return (L.names.mantra || {})[v] || '';
  if (k === 'sd') { const r = jpSd.find(x => x.id === v); return r ? r.title : ''; }
  return $('#jp-custom').value.trim() || store.get('gv-japa-custom') || '';
}
function jpGoalDefault() {
  if (jpSel.startsWith('sd:')) { const r = jpSd.find(x => 'sd:' + x.id === jpSel); if (r && r.target) return Math.max(1, Math.ceil(r.target / JP_BEADS)); }
  return store.get('gv-japa-goal') || 1;
}

function drawRing(beads) {
  const R = 104, out = [];
  for (let i = 0; i < JP_BEADS; i++) {
    const a = (i / JP_BEADS) * Math.PI * 2 - Math.PI / 2, x = 120 + R * Math.cos(a), y = 120 + R * Math.sin(a);
    out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i === 0 ? 4.6 : 3.1}" class="${i < beads ? 'on' : ''}${i === 0 ? ' meru' : ''}"/>`);
  }
  $('#jp-ring').innerHTML = out.join('');
}
function jpRender(bump) {
  const d = jpDay(), goal = +$('#jp-goal').value || 1, rounds = Math.floor(d.count / JP_BEADS);
  $('#jp-count').textContent = d.beads;
  $('#jp-round').textContent = rounds >= goal ? t('jp.allDone', { n: rounds }) : t('jp.round', { n: rounds + 1, t: goal });
  $('#jp-text').textContent = jpText();
  drawRing(d.beads);
  if (bump) { const el = $('#jp-count'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  const week = Object.entries(jp.days).filter(([k]) => k > sdIso(Date.now() - 7 * 86400000)).reduce((s, [, v]) => s + v.count, 0);
  $('#jp-stats').innerHTML = `<div><dt>${esc(t('jp.today'))}</dt><dd class="num">${t('jp.malas', { n: rounds })}<small>${d.count.toLocaleString(LOCALE)} ${esc(t('jp.japa'))}</small></dd></div>
    <div><dt>${esc(t('jp.week'))}</dt><dd class="num">${week.toLocaleString(LOCALE)}<small>${esc(t('jp.japa'))}</small></dd></div>
    <div><dt>${esc(t('jp.total'))}</dt><dd class="num">${(jp.total || 0).toLocaleString(LOCALE)}<small>${esc(t('jp.japa'))}</small></dd></div>`;
}
function haptic(strong) {
  if (!$('#jp-vib').checked) return;
  if (APP && APP.haptic) { APP.haptic(strong ? 'heavy' : 'light'); return; }
  if (navigator.vibrate) navigator.vibrate(strong ? [70, 50, 140] : 12);
}
async function jpGoalReached() {
  toast(t('jp.goalDone'));
  if (!jpSel.startsWith('sd:') || !session || !sb) return;
  const r = jpSd.find(x => 'sd:' + x.id === jpSel); if (!r) return;
  const s = sdStats(r); if (s.todayIdx < 0 || s.done.has(s.today)) return;
  const done_dates = [...s.done, s.today].sort();
  r.done_dates = done_dates;
  const complete = sdStats(r).complete;
  const { error } = await sb.from('sadhanas').update({ done_dates, updated_at: new Date().toISOString(), status: complete ? 'done' : r.status }).eq('id', r.id);
  if (!error) toast(t(complete ? 'sd.completedMsg' : 'jp.ticked'));
}
function jpTap() {
  const d = jpDay(), goal = +$('#jp-goal').value || 1;
  d.count++; d.beads++; jp.total = (jp.total || 0) + 1;
  if (d.beads >= JP_BEADS) {
    d.beads = 0; haptic(true);
    const rounds = Math.floor(d.count / JP_BEADS);
    if (rounds === goal) jpGoalReached(); else toast(t('jp.malaDone', { n: rounds }));
  } else haptic(false);
  jpSave(); jpRender(true);
}

// Wiring
const tap = $('#jp-tap');
tap.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); jpTap(); });
tap.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); jpTap(); } });
tap.addEventListener('click', e => { if (e.detail === 0) jpTap(); }); // keyboard "click" without pointer
$('#jp-undo').onclick = () => { const d = jpDay(); if (!d.count) return; d.count--; jp.total = Math.max(0, (jp.total || 0) - 1); d.beads = d.count % JP_BEADS; jpSave(); jpRender(); };
$('#jp-reset').onclick = () => { if (!confirm(t('jp.confirmReset'))) return; const d = jpDay(); jp.total = Math.max(0, (jp.total || 0) - d.count); d.count = 0; d.beads = 0; jpSave(); jpRender(); };
$('#jp-vib').checked = store.get('gv-japa-vib') !== false;
$('#jp-vib').onchange = () => store.set('gv-japa-vib', $('#jp-vib').checked);
$('#jp-goal').innerHTML = JP_GOALS.map(n => `<option value="${n}">${esc(t('jp.malas', { n }))} · ${(n * JP_BEADS).toLocaleString(LOCALE)}</option>`).join('');
$('#jp-goal').onchange = () => { store.set('gv-japa-goal', +$('#jp-goal').value); jpRender(); };
$('#jp-custom').value = store.get('gv-japa-custom') || '';
$('#jp-custom').oninput = () => { store.set('gv-japa-custom', $('#jp-custom').value.trim()); jpRender(); };
function jpFill() {
  const sel = $('#jp-mantra'); sel.innerHTML = jpOptions();
  if (![...sel.options].some(o => o.value === jpSel)) jpSel = 'c:0';
  const q = new URLSearchParams(location.search).get('sd'); if (q && jpSd.some(r => r.id === q)) jpSel = 'sd:' + q;
  sel.value = jpSel; $('#jp-custom-f').hidden = jpSel !== 'x';
  const gd = jpGoalDefault(); if (![...$('#jp-goal').options].some(o => +o.value === gd)) $('#jp-goal').insertAdjacentHTML('beforeend', `<option value="${gd}">${esc(t('jp.malas', { n: gd }))}</option>`);
  $('#jp-goal').value = gd;
  jpRender();
}
$('#jp-mantra').onchange = () => { jpSel = $('#jp-mantra').value; store.set('gv-japa-sel', jpSel); jpFill(); };
async function jpLoad() {
  if (session) { const { rows } = await sdLoad(); jpSd = rows.filter(r => r.kind === 'mantra' && r.status !== 'stopped' && !sdStats(r).complete && !sdStats(r).ended); } else jpSd = [];
  jpFill();
}
jpFill();
readyHooks.push(jpLoad);
authHooks.push(() => jpLoad());
