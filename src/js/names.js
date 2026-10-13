/* Baby names by nakshatra syllable + numerology — members only. */
const nkSel = $('#n-nak'), padaSel = $('#n-pada'), gSel = $('#n-gender'), from = $('#n-from'), dateIn = $('#n-date'), checkIn = $('#n-check');
nkSel.innerHTML = L.names.nak.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join('');
const fillPadas = () => { const i = +nkSel.value; padaSel.innerHTML = `<option value="">${esc(t('nm.allPadas'))}</option>` + [1, 2, 3, 4].map(p => `<option value="${p}">${p} · ${esc(L.names.syll[i][p - 1])}</option>`).join(''); };
nkSel.addEventListener('change', fillPadas); fillPadas();
let rowsN = [], filter = '';
const mine = store.get('kg-moon');
if (mine && mine.nak != null) { nkSel.value = mine.nak; fillPadas(); }
from.addEventListener('change', () => {
  const r = rowsN[+from.value]; if (!r) return;
  const b = r.birth; dateIn.value = isoDay(b.year, b.month, b.day);
  from.dataset.birth = JSON.stringify(b);
  run();
});
$('#nform').addEventListener('submit', e => { e.preventDefault(); delete from.dataset.birth; from.value = ''; run(); });
$('#n-filter').addEventListener('input', e => { filter = e.target.value.trim().toLowerCase(); draw(lastN); });
let lastN = null;
async function run() {
  if (!requireLogin('names')) return;
  const box = $('#nres'); box.innerHTML = '<div class="card" style="padding:30px;text-align:center"><span class="spin"></span></div>';
  const [y, m, d] = (dateIn.value || '').split('-').map(Number);
  const body = { gender: gSel.value, check: checkIn.value };
  if (from.dataset.birth) body.birth = JSON.parse(from.dataset.birth);
  else { body.nak = +nkSel.value; if (padaSel.value) body.pada = +padaSel.value; if (y) Object.assign(body, { year: y, month: m, day: d }); }
  if (from.dataset.birth && !padaSel.value) body.allPadas = false;
  try { lastN = await api('/api/names/', { method: 'POST', body: JSON.stringify(body) }); if (from.dataset.birth) { nkSel.value = lastN.nak; fillPadas(); padaSel.value = lastN.pada || ''; } draw(lastN); }
  catch (e) { box.innerHTML = `<p class="err">${esc(e.status === 401 ? t('members.lockText') : t('err.server'))}</p>`; if (e.status === 401) requireLogin('names'); }
}
function draw(r) {
  if (!r) return;
  const box = $('#nres');
  const num = r.moolank ? `<div class="card numcard reveal"><div><span class="eyebrow">${esc(t('nm.moolank'))}</span><b>${r.moolank}</b><small>${esc(gn(r.moolankPlanet))}</small></div><div><span class="eyebrow">${esc(t('nm.bhagyank'))}</span><b>${r.bhagyank}</b><small>${esc(gn(r.bhagyankPlanet))}</small></div><p>${esc(t('nm.numNote'))}</p></div>` : `<p class="muted small">${esc(t('nm.addDate'))}</p>`;
  const chk = r.check ? `<div class="card check-card reveal ${r.check.friendlyMoolank || r.check.friendlyBhagyank ? 'good' : 'warn'}"><b>${esc(r.check.name)}</b> → ${esc(t('nm.nameNum', { n: r.check.number, g: { g: r.check.planet } }))} · ${esc(t(r.check.friendlyMoolank || r.check.friendlyBhagyank ? 'nm.checkGood' : 'nm.checkMid'))}</div>` : '';
  const list = r.names.filter(n => !filter || n.name.toLowerCase().includes(filter) || n.meaning.toLowerCase().includes(filter));
  box.innerHTML = `<div class="nm-head"><p>${esc(t('nm.forSyll', { nk: { nk: r.nak }, list: r.syllables.join(', ') }))}</p></div>${num}${chk}
    <div class="name-grid">${list.map(n => `<article class="card name reveal ${n.lucky ? 'lucky' : ''}"><div class="nh"><b>${esc(n.name)}</b><span class="tag ${n.gender === 'm' ? '' : n.gender === 'f' ? 'gold' : 'good'}">${esc(t('nm.g.' + n.gender))}</span></div><p>${esc(n.meaning)}</p><div class="nf"><span class="tag">${esc(n.syllable)}</span><span class="tag">${esc(t('nm.num', { n: n.number }))}</span>${n.lucky ? `<span class="tag good">${ic('i-star')}${esc(t('nm.lucky'))}</span>` : ''}</div></article>`).join('') || `<p class="empty">${esc(t('nm.none'))}</p>`}</div>
    <p class="muted small">${esc(t('nm.note'))}</p>`;
  observeReveals();
}
readyHooks.push(async s => { $('#n-lock').hidden = !!s; if (s) { rowsN = await fillKundaliSelect(from, t('mt.pick')); from.hidden = !rowsN.length; } else from.hidden = true; });
authHooks.push(async (ev, s) => { $('#n-lock').hidden = !!s; if (s) { rowsN = await fillKundaliSelect(from, t('mt.pick')); from.hidden = !rowsN.length; } });
