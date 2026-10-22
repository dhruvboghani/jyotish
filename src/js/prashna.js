/* Prashna (horary): a chart for the moment the question is asked, at the chosen city, judged by classical rules
   (lib/prashna.js). The last few questions are kept on this device. */
const PQ_TOPICS = ['general', 'career', 'marriage', 'money', 'health', 'travel', 'property', 'children', 'education', 'legal'];
const pqCity = cityPicker(() => { });
let pqTopic = store.get('gv-pq-topic') || 'general';
$('#pq-topics').innerHTML = PQ_TOPICS.map(k => `<button type="button" class="chip" data-topic="${k}" aria-pressed="${k === pqTopic}">${esc(t('pq.t.' + k))}</button>`).join('');
$('#pq-topics').addEventListener('click', e => {
  const b = e.target.closest('[data-topic]'); if (!b) return;
  pqTopic = b.dataset.topic; store.set('gv-pq-topic', pqTopic);
  $$('#pq-topics [data-topic]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
});
const pqTz = ms => { const d = new Date(ms), c = pqCity.city; try { return tzOffsetMinutes(c.tz || 'Asia/Kolkata', d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()); } catch (e) { return 330; } };
const PQ_TONE = { yes: 'good', likely: 'good', mixed: 'warn', unlikely: 'bad' };

function pqFactor(f) {
  const p = { ...f.params };
  for (const k of ['p', 'a', 'b']) if (p[k]) p[k] = { g: p[k] };
  if (p.list) p.list = { list: p.list.map(x => ({ g: x })) };
  const tone = f.pts > 0 ? 'good' : f.pts < 0 ? 'bad' : 'mixed';
  return `<li class="${tone}">${toneIcon(tone)}<span>${esc(t('pq.f.' + f.id, p))}</span></li>`;
}
const toneIcon = tn => tn === 'good' ? ic('i-check') : tn === 'bad' ? ic('i-alert') : ic('i-info');

function pqRender(r, q, tz) {
  const bySign = Array.from({ length: 12 }, () => []);
  r.planets.forEach(p => bySign[p.sign].push({ t: ga(p.name), c: COL[p.name], r: p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' }));
  const chart = drawChart({ asc: r.lagna.sign, bySign, title: t('pq.chartT'), sub: fTime(r.utMs, tz) });
  const tone = PQ_TONE[r.verdict];
  $('#pq-res').innerHTML = `<div class="pq-grid">
    <div class="card pq-verdict ${tone} reveal"><span class="eyebrow">${esc(t('pq.t.' + r.topic))} · ${esc(longDateFmt.format(new Date(r.utMs + tz * 60000)))} ${fTime(r.utMs, tz)}</span>
      ${q ? `<p class="pq-qtext">“${esc(q)}”</p>` : ''}
      <h2>${esc(t('pq.v.' + r.verdict))}</h2><p>${esc(t('pq.vt.' + r.verdict))}</p>
      <p class="pq-timing">${ic('i-clock')}${esc(t('pq.timing.' + r.timing))}</p>
      ${r.early || r.late ? `<p class="tag warn">${esc(t(r.early ? 'pq.early' : 'pq.late'))}</p>` : ''}
      <dl class="pq-facts"><div><dt>${esc(t('res.lagna'))}</dt><dd>${rg(r.lagna.sign, 'rg sm')}${esc(rn(r.lagna.sign))} ${dm(r.lagna.deg)}</dd></div>
        <div><dt>${esc(t('pq.lagnaLord'))}</dt><dd>${g(r.lagnaLord, 'gimg sm')}${esc(gn(r.lagnaLord))}</dd></div>
        <div><dt>${esc(t('pq.karyaLord', { h: r.house }))}</dt><dd>${g(r.karyaLord, 'gimg sm')}${esc(gn(r.karyaLord))}</dd></div>
        <div><dt>${esc(t('pq.moon'))}</dt><dd>${esc(rn(r.moon.sign))} · ${esc(nk(r.moon.nak))}</dd></div></dl></div>
    <div class="card chart reveal">${chart}</div></div>
    <div class="card pq-why reveal"><h3>${esc(t('pq.why'))}</h3><ul class="factor-list">${r.factors.map(pqFactor).join('')}</ul>
      <p class="muted small">${esc(t('pq.rising.' + r.rising))} ${esc(t('pq.note'))}</p></div>`;
  observeReveals();
  $('#pq-res').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function pqHist() {
  const h = store.get('gv-pq-hist') || [];
  $('#pq-hist').innerHTML = h.length ? `<h3 class="sub-h">${esc(t('pq.recent'))}</h3><div class="pq-hlist">${h.map((x, i) => `<button type="button" class="card pq-h" data-h="${i}"><span class="tag ${PQ_TONE[x.r.verdict]}">${esc(t('pq.v.' + x.r.verdict))}</span><b>${esc(x.q || t('pq.t.' + x.r.topic))}</b><small>${esc(fDate(x.r.utMs, x.tz))} ${fTime(x.r.utMs, x.tz)}</small></button>`).join('')}</div>` : '';
}
$('#pq-hist').addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (!b) return; const x = (store.get('gv-pq-hist') || [])[+b.dataset.h]; if (x) pqRender(x.r, x.q, x.tz); });
$('#pq-form').addEventListener('submit', async e => {
  e.preventDefault();
  const c = pqCity.city, now = Date.now(), tz = pqTz(now), q = $('#pq-q').value.trim();
  const btn = e.submitter || $('#pq-form .btn-cta'); btn.setAttribute('aria-busy', 'true');
  try {
    const r = await api(`/api/prashna/?lat=${c.lat.toFixed(4)}&lon=${c.lon.toFixed(4)}&tz=${tz}&topic=${pqTopic}&t=${now}`);
    pqRender(r, q, tz);
    const h = [{ q, r, tz }, ...(store.get('gv-pq-hist') || [])].slice(0, 8); store.set('gv-pq-hist', h); pqHist();
  } catch (err) { $('#pq-res').innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; }
  btn.removeAttribute('aria-busy');
});
pqHist();
