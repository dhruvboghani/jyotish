/* Kundali Milan (Ashtakoot) page — members only (free with an account). */
const people = {};
['b', 'g'].forEach(p => {
  people[p] = placePicker({ input: p + '-place', suggest: p + '-suggest', meta: p + '-meta', lat: p + '-lat', lon: p + '-lon', off: p + '-off', date: p + '-date', time: p + '-time', err: 'm-err', online: p + '-online' });
});
let myRows = [];
async function fillPickers() {
  const sels = $$('.pick-saved');
  if (!session) { sels.forEach(s => { s.hidden = true; }); return; }
  myRows = await loadMyKundalis();
  sels.forEach(s => {
    s.hidden = !myRows.length;
    s.innerHTML = `<option value="">${esc(t('mt.pick'))}</option>` + myRows.map((r, i) => `<option value="${i}">${esc(r.birth.name || t('res.defaultName'))}${r.relation ? ' · ' + esc(t('rel.' + r.relation)) : ''} · ${esc(birthLine(r.birth))}</option>`).join('');
  });
}
function fillPerson(p, b) {
  $('#' + p + '-name').value = b.name || '';
  $('#' + p + '-date').value = isoDay(b.year, b.month, b.day);
  $('#' + p + '-time').value = `${pad(b.hour)}:${pad(b.minute)}`;
  $('#' + p + '-lat').value = b.lat; $('#' + p + '-lon').value = b.lon; $('#' + p + '-off').value = offStr(b.tzMinutes);
  people[p].set(null, b.placeLabel || ''); people[p].offAuto = false;
  people[p].chosen === null && ($('#' + p + '-meta').innerHTML = `<b>✓</b> ${latStr(b.lat)}, ${lonStr(b.lon)} · UTC${offStr(b.tzMinutes)}`);
}
$$('.pick-saved').forEach(s => s.addEventListener('change', () => { if (s.value !== '') fillPerson(s.dataset.p, myRows[+s.value].birth); }));

function readPerson(p) {
  const date = $('#' + p + '-date').value, time = $('#' + p + '-time').value;
  if (!date) return t('err.date'); if (!time) return t('err.time');
  people[p].pickFirst();
  const lat = parseFloat($('#' + p + '-lat').value), lon = parseFloat($('#' + p + '-lon').value);
  if (!isFinite(lat) || !isFinite(lon)) return t('err.place');
  people[p].autoOffset();
  const off = parseOff($('#' + p + '-off').value); if (off === null) return t('err.offset');
  const [year, month, day] = date.split('-').map(Number), [hour, minute] = time.split(':').map(Number);
  const ch = people[p].chosen;
  return { name: $('#' + p + '-name').value.trim(), year, month, day, hour, minute, lat, lon, tzMinutes: off, placeLabel: ch ? `${ch.name}, ${ch.region}` : ($('#' + p + '-place').value.trim() || latStr(lat) + ', ' + lonStr(lon)) };
}

$('#mform').addEventListener('submit', async e => {
  e.preventDefault();
  const er = $('#m-err'); er.textContent = '';
  if (!requireLogin('matching')) return;
  const boy = readPerson('b'); if (typeof boy === 'string') { er.textContent = t('mt.boy') + ': ' + boy; return; }
  const girl = readPerson('g'); if (typeof girl === 'string') { er.textContent = t('mt.girl') + ': ' + girl; return; }
  store.set('kg-match', { boy, girl });
  const btn = $('#m-go'), label = btn.textContent;
  btn.setAttribute('aria-busy', 'true'); btn.innerHTML = `<span class="spin"></span>${esc(t('form.working'))}`;
  try { renderMatch(await api('/api/match', { method: 'POST', body: JSON.stringify({ boy, girl }) })); setTimeout(() => $('#mres').scrollIntoView({ behavior: 'smooth' }), 80); }
  catch (err) { er.textContent = err.status === 401 ? t('members.lockText') : err.data && err.data.error ? err.data.error : t('err.server'); if (err.status === 401) requireLogin('matching'); }
  finally { btn.removeAttribute('aria-busy'); btn.textContent = label; }
});

const V = v => L.names.val[v] || v;
function kVal(k, side) {
  const v = k[side];
  if (k.id === 'tara') return L.names.tara[((v % 9) || 9) - 1];
  if (k.id === 'maitri') return gn(v);
  if (k.id === 'bhakoot') return rn(v);
  return V(v);
}
function renderMatch(r) {
  const pct = r.total / r.max, circ = 2 * Math.PI * 52;
  const tone = r.verdict === 'excellent' || r.verdict === 'good' ? 'good' : r.verdict === 'average' ? 'warn' : 'bad';
  const person = (p, who) => `<div class="mperson"><span class="eyebrow">${esc(t('mt.' + who))}</span><b>${esc(p.name || t('res.defaultName'))}</b><span>${esc(t('res.rashiShort', { r: { r: p.moonSign } }))} · ${esc(nk(p.nak))} ${p.pada}</span><span>${esc(t('res.lagnaShort', { r: { r: p.lagna } }))}</span></div>`;
  const rows = r.kootas.map(k => {
    const kt = k.score === k.max ? 'good' : k.score === 0 ? 'bad' : 'warn';
    return `<article class="card koota reveal ${kt}"><div class="kh"><h3>${esc(t('kt.' + k.id + '.name'))}<small>${esc(t('kt.' + k.id + '.area'))}</small></h3><span class="kscore"><b>${k.score}</b>/${k.max}</span></div>
      <div class="meter"><i class="${kt === 'warn' ? 'mixed' : kt}" style="width:${k.score / k.max * 100}%"></i></div>
      <p class="kv"><span>${esc(t('mt.boy'))}: <b>${esc(kVal(k, 'boy'))}</b></span><span>${esc(t('mt.girl'))}: <b>${esc(kVal(k, 'girl'))}</b></span>${k.distance ? `<span>${esc(t('kt.distance', { a: k.distance[0], b: k.distance[1] }))}</span>` : ''}</p>
      <p class="rule">${esc(t('kt.' + k.id + '.rule'))}</p>${k.cancelled ? `<p class="tag good">${esc(t('kt.cancelled'))}</p>` : ''}</article>`;
  }).join('');
  const mg = r.manglik, md = d => d ? [d.lagna && t('mt.fromLagna', { h: d.houseL }), d.moon && t('mt.fromMoon', { h: d.houseM }), d.venus && t('mt.fromVenus', { h: d.houseV })].filter(Boolean).join(', ') : '';
  $('#mres').innerHTML = `
    <div class="card mscore reveal"><div class="gauge"><svg viewBox="0 0 120 120" role="img" aria-label="${r.total}/36"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg ${tone}" id="mfg" cx="60" cy="60" r="52" stroke-dasharray="${circ}" stroke-dashoffset="${circ}"/></svg><div class="gnum"><b>${r.total}</b><span>/ 36</span></div></div>
      <div><span class="eyebrow">${esc(t('mt.result'))}</span><h2 class="${tone}">${esc(t('mt.v.' + r.verdict))}</h2><p>${esc(t('mt.vt.' + r.verdict))}</p><div class="mpair">${person(r.boy, 'boy')}<span class="heart">${ic('i-heart')}</span>${person(r.girl, 'girl')}</div></div></div>
    <div class="card manglik reveal ${mg.status === 'one' ? 'warn' : 'good'}"><h3>${esc(t('mt.manglik'))}</h3><p><b>${esc(t('mt.boy'))}:</b> ${esc(mg.boy ? t('mt.isManglik') + ' (' + md(mg.boyDetail) + ')' : t('mt.notManglik'))}</p><p><b>${esc(t('mt.girl'))}:</b> ${esc(mg.girl ? t('mt.isManglik') + ' (' + md(mg.girlDetail) + ')' : t('mt.notManglik'))}</p><p class="muted">${esc(t('mt.m.' + mg.status))}</p></div>
    <h3 class="sub-h">${esc(t('mt.kootas'))}</h3><div class="koota-grid">${rows}</div>
    <p class="muted small">${esc(t('mt.disclaimer'))}</p>`;
  requestAnimationFrame(() => { const fg = $('#mfg'); if (fg) fg.style.strokeDashoffset = circ * (1 - pct); });
  observeReveals();
}

const lastMatch = store.get('kg-match');
if (lastMatch) { fillPerson('b', lastMatch.boy); fillPerson('g', lastMatch.girl); }
readyHooks.push(s => { fillPickers(); $('#m-lock').hidden = !!s; });
authHooks.push((ev, s) => { fillPickers(); $('#m-lock').hidden = !!s; });
