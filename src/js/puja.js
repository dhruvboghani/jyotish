/* Festival puja guides: each festival's date in the chosen city with its puja muhurta, the samagri list,
   step-by-step vidhi and the short katha (which can be read aloud). Data: /api/calendar and /api/festival. */
const PJ_IDS = ['diwali', 'dhanteras', 'ganeshChaturthi', 'janmashtami', 'mahaShivaratri', 'navratri', 'holikaDahan', 'rakshaBandhan', 'karwaChauth', 'ramNavami', 'hanumanJayanti', 'dussehra', 'sharadPurnima', 'vasantPanchami'];
const pjCity = cityPicker(() => pjLoad());
const pjTz = () => { const d = todayIn(330); return pjCity.offset(d.y, d.m, d.d); };
let pjDates = {}, pjSel = new URLSearchParams(location.search).get('id') || location.hash.slice(1) || null;
const pjDay = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const pjLeft = iso => { const tz = pjTz(), td = todayIn(tz); return Math.round((pjDay(iso) - Date.UTC(td.y, td.m - 1, td.d)) / 864e5); };

async function pjLoad() {
  const c = pjCity.city, tz = pjTz(), y = todayIn(tz).y;
  try {
    const evs = (await Promise.all([y, y + 1].map(yy => api(`/api/calendar/?year=${yy}&lat=${c.lat.toFixed(3)}&lon=${c.lon.toFixed(3)}&tz=${tz}`)))).flatMap(r => r.events);
    const today = isoDay(todayIn(tz).y, todayIn(tz).m, todayIn(tz).d);
    pjDates = {};
    for (const e of evs) if (e.kind === 'festival' && PJ_IDS.includes(e.id) && e.date >= today && !pjDates[e.id]) pjDates[e.id] = e.date;
  } catch (e) { pjDates = {}; }
  const ids = PJ_IDS.slice().sort((a, b) => (pjDates[a] || '9').localeCompare(pjDates[b] || '9'));
  $('#pj-list').innerHTML = ids.map(id => {
    const d = pjDates[id], left = d ? pjLeft(d) : null;
    return `<button type="button" class="card pj-card ${id === pjSel ? 'on' : ''}" data-pj="${id}"><span class="pj-ic">${ic('i-lamp')}</span><b>${esc(t('fest.' + id))}</b><small>${d ? esc(dateFmt.format(pjDay(d))) + ' · ' + esc(left === 0 ? t('td.today') : left === 1 ? t('td.tomorrow') : t('td.inDays', { n: left })) : '—'}</small></button>`;
  }).join('');
  if (!pjSel) pjSel = ids[0];
  pjShow(pjSel, false);
}
$('#pj-list').addEventListener('click', e => { const b = e.target.closest('[data-pj]'); if (!b) return; pjShow(b.dataset.pj, true); });

async function pjShow(id, scroll) {
  pjSel = id; history.replaceState(null, '', '#' + id);
  $$('.pj-card').forEach(b => b.classList.toggle('on', b.dataset.pj === id));
  const box = $('#pj-detail'), c = pjCity.city, tz = pjTz(), d = pjDates[id];
  box.innerHTML = '<div class="card" style="padding:30px;text-align:center"><span class="spin"></span></div>';
  let w = null;
  if (d) { try { w = (await api(`/api/festival/?id=${id}&year=${d.slice(0, 4)}&lat=${c.lat.toFixed(3)}&lon=${c.lon.toFixed(3)}&tz=${tz}`)).dates.find(x => x.date === d); } catch (e) { } }
  const tm = r => r ? `${fTime(r.start, tz)} – ${fTime(r.end, tz)}` : '—';
  const mu = [];
  if (w) {
    mu.push([t('pj.k.' + w.kind), tm(w.main)]);
    if (w.sthir) mu.push([t('pj.sthir'), tm(w.sthir)]);
    if (w.moonrise) mu.push([t('pj.moonrise'), fTime(w.moonrise, tz)]);
    if (w.prahars) w.prahars.forEach((p, i) => mu.push([t('pj.prahar', { n: i + 1 }), tm(p)]));
  }
  const steps = t('pj.f.' + id + '.vidhi'), katha = t('pj.f.' + id + '.katha');
  box.innerHTML = `<article class="card pj-main reveal"><span class="eyebrow">${esc(c.name)}</span><h2>${esc(t('fest.' + id))}</h2>
      <p class="pj-date">${d ? esc(longDateFmt.format(pjDay(d))) : ''}</p>
      ${mu.length ? `<dl class="pj-mu">${mu.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="num">${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      <p class="pj-about">${esc(t('pj.f.' + id + '.about'))}</p></article>
    <div class="pj-cols">
      <div class="card pj-sec reveal"><h3>${ic('i-check')}${esc(t('pj.samagri'))}</h3><p>${esc(t('pj.f.' + id + '.samagri'))}</p></div>
      <div class="card pj-sec reveal"><h3>${ic('i-lamp')}${esc(t('pj.vidhi'))}</h3><ol>${(Array.isArray(steps) ? steps : []).map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
    </div>
    <div class="card pj-sec pj-katha reveal"><div class="pj-kh"><h3>${ic('i-book')}${esc(t('pj.katha'))}</h3><button type="button" class="listen no-print" id="pj-listen">${ic('i-speaker')}<span>${esc(t('lis.listen'))}</span></button></div>
      ${(Array.isArray(katha) ? katha : []).map(p => `<p>${esc(p)}</p>`).join('')}</div>
    <p class="muted small">${esc(t('pj.note'))}</p>`;
  const lb = $('#pj-listen'); let on = false;
  lb.onclick = () => {
    if (on) { stopSpeak(); on = false; lb.classList.remove('on'); lb.querySelector('span').textContent = t('lis.listen'); return; }
    on = true; lb.classList.add('on'); lb.querySelector('span').textContent = t('lis.stop');
    speak([t('fest.' + id), ...(Array.isArray(katha) ? katha : [])].join('. '), () => { on = false; lb.classList.remove('on'); lb.querySelector('span').textContent = t('lis.listen'); });
  };
  observeReveals();
  if (scroll) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
pjLoad();
