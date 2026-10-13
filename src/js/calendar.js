/* Festival & vrat calendar page: /api/calendar for a year and city. */
const cc = cityPicker(() => load());
const ySel = $('#y-sel');
const thisYear = todayIn(330).y;
ySel.innerHTML = Array.from({ length: 7 }, (_, i) => thisYear - 2 + i).map(y => `<option${y === thisYear ? ' selected' : ''}>${y}</option>`).join('');
ySel.addEventListener('change', load);
let filter = 'all', events = [], loadedTz = 330, seqC = 0;
$$('#cal-filter button').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; $$('#cal-filter button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); }));

function evName(e) {
  if (e.kind === 'festival') return t('fest.' + e.id);
  if (e.kind === 'sankranti') return e.id === 'sankranti' ? t('cal.sankranti', { r: { r: e.sign } }) : t('fest.' + e.id);
  if (e.id === 'ekadashi') return t('cal.ekadashi', { p: L.names.paksha[e.paksha], m: L.names.masa[e.month] });
  if (e.id === 'pradosh') return t('cal.pradosh', { p: L.names.paksha[e.paksha] });
  return t('cal.' + e.id) + (e.month != null ? ' · ' + L.names.masa[e.month] : '');
}
async function load() {
  const year = +ySel.value, city = cc.city, tz = cc.offset(year, 6, 1), my = ++seqC;
  $('#calbox').innerHTML = `<div class="card" style="padding:40px;text-align:center"><span class="spin"></span><p class="muted">${esc(t('cal.computing'))}</p></div>`;
  try {
    const data = await api(`/api/calendar/?year=${year}&lat=${city.lat.toFixed(3)}&lon=${city.lon.toFixed(3)}&tz=${tz}`);
    if (my !== seqC) return;
    events = data.events; loadedTz = tz; draw();
  } catch (e) { $('#calbox').innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; }
}
function draw() {
  const today = (() => { const x = todayIn(loadedTz); return isoDay(x.y, x.m, x.d); })();
  const shown = events.filter(e => filter === 'all' || e.kind === filter || (filter === 'vrat' && e.kind === 'sankranti'));
  const next = events.filter(e => e.kind === 'festival' && e.date >= today)[0];
  const byMonth = {};
  shown.forEach(e => { const k = e.date.slice(0, 7); (byMonth[k] = byMonth[k] || []).push(e); });
  const dayOf = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const nextHtml = next ? (() => { const days = Math.round((dayOf(next.date) - dayOf(today)) / 864e5); return `<div class="card next-fest reveal"><span class="ic">${ic('i-star')}</span><div><span class="eyebrow">${esc(t('cal.next'))}</span><h3>${esc(evName(next))}</h3><p>${esc(longDateFmt.format(dayOf(next.date)))} · ${esc(days === 0 ? t('cal.today') : t('cal.inDays', { n: days }))}</p></div><a class="btn-line" href="${HOME}panchang/?d=${next.date}">${esc(t('cal.seePanchang'))}</a></div>`; })() : '';
  $('#calbox').innerHTML = nextHtml + (Object.keys(byMonth).map(k => `<section class="cal-month reveal"><h3>${esc(monthFmt.format(dayOf(k + '-01')))}</h3><ul>${byMonth[k].map(e => { const dt = dayOf(e.date); return `<li class="${e.kind}${e.date === today ? ' today' : ''}${e.date < today ? ' past' : ''}"><a href="${HOME}panchang/?d=${e.date}"><span class="d"><b>${dt.getUTCDate()}</b><small>${esc(weekdayFmt.format(dt))}</small></span><span class="n">${esc(evName(e))}</span><span class="tag ${e.kind === 'festival' ? 'gold' : e.kind === 'sankranti' ? 'good' : ''}">${esc(t('cal.k.' + e.kind))}</span></a></li>`; }).join('')}</ul></section>`).join('') || `<p class="empty">${esc(t('cal.none'))}</p>`);
  observeReveals();
}
load();
