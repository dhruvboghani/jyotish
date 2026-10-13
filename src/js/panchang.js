/* Daily Panchang page: /api/panchang for a date and city. */
const cp = cityPicker(() => load());
const pDate = $('#p-date');
const startDay = (() => { const q = new URLSearchParams(location.search).get('d'); if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q; const tdy = todayIn(cp.offset(2026, 1, 1)); return isoDay(tdy.y, tdy.m, tdy.d); })();
pDate.value = startDay;
const shift = n => { const [y, m, d] = pDate.value.split('-').map(Number), x = new Date(Date.UTC(y, m - 1, d + n)); pDate.value = isoDay(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); load(); };
$('#p-prev').onclick = () => shift(-1); $('#p-next').onclick = () => shift(1);
$('#p-today').onclick = () => { const tdy = todayIn(cp.offset(2026, 1, 1)); pDate.value = isoDay(tdy.y, tdy.m, tdy.d); load(); };
pDate.addEventListener('change', load);

let seq = 0;
async function load() {
  if (!pDate.value) return;
  const [y, m, d] = pDate.value.split('-').map(Number), city = cp.city, tz = cp.offset(y, m, d), my = ++seq;
  const box = $('#pbox'); box.innerHTML = '<div class="card" style="padding:40px;text-align:center"><span class="spin"></span></div>';
  try {
    const data = await api(`/api/panchang?y=${y}&m=${m}&d=${d}&lat=${city.lat.toFixed(4)}&lon=${city.lon.toFixed(4)}&tz=${tz}`);
    if (my !== seq) return;
    render(data, tz, city);
  } catch (e) { box.innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; }
}

function render(p, tz, city) {
  const box = $('#pbox');
  if (p.polar) { box.innerHTML = `<p class="empty">${esc(t('pp.polar'))}</p>`; return; }
  const day0 = Math.floor((p.sunrise + tz * 60000) / 864e5);
  const tm = ms => { const dd = Math.floor((ms + tz * 60000) / 864e5); return fTime(ms, tz) + (dd !== day0 ? ' · ' + dayMonthFmt.format(new Date(ms + tz * 60000)) : ''); };
  const range = r => r ? `${fTime(r.start, tz)} – ${fTime(r.end, tz)}` : '—';
  const now = Date.now();
  const seqList = (arr, nameOf) => arr.map((x, i) => `<div class="pseq${i ? ' next' : ''}"><b>${esc(nameOf(x))}</b><span>${esc(i < arr.length - 1 || x.end < p.nextSunrise ? t('pp.until', { t: tm(x.end) }) : t('pp.fullDay'))}</span></div>`).join('');
  const el = (icon, k, body) => `<div class="card pan reveal"><span class="ic">${icon}</span><dl style="margin:0"><dt>${esc(t(k))}</dt><dd>${body}</dd></dl></div>`;
  const masa = L.names.masa[p.lunarMonth] + (p.adhika ? ' (' + t('pp.adhika') + ')' : '');
  const elements = [
    el(ic('i-half'), 'sec.pan.tithi', seqList(p.tithi, x => pakshaOf(x.index) + ' ' + tithiLabel(x.index))),
    el(ic('i-star'), 'sec.pan.nakshatra', seqList(p.nakshatra, x => nk(x.index))),
    el(ic('i-loop'), 'sec.pan.yoga', seqList(p.yoga, x => L.names.yoga27[x.index])),
    el(ic('i-half'), 'sec.pan.karana', seqList(p.karana, x => L.names.karana[x.name])),
    el(ic('i-cal'), 'sec.pan.vara', `<b>${esc(L.names.vara[p.weekday])}</b>`),
    el(ic('i-sun'), 'pp.masa', `<b>${esc(masa)}</b><span>${esc(t('pp.purnimanta'))}: ${esc(L.names.masa[p.purnimantaMonth])}</span>`),
    el(ic('i-rise'), 'sec.pan.sunrise', `<b>${fTime(p.sunrise, tz)}</b><span>${esc(t('sec.pan.sunset'))}: ${fTime(p.sunset, tz)}</span>`),
    el(g('Moon'), 'pp.moonSign', `<b>${esc(rn(p.moonSign))}</b><span>${p.moonSignChange ? esc(t('pp.moonEnters', { r: { r: (p.moonSign + 1) % 12 }, t: tm(p.moonSignChange) })) : esc(t('pp.sunSign')) + ': ' + esc(rn(p.sunSign))}</span>`),
    el(ic('i-loop'), 'pp.samvat', `<b>${esc(t('pp.vikram'))} ${p.vikramSamvat}</b><span>${esc(t('pp.shaka'))} ${p.shakaSamvat}</span>`),
    el(ic('i-sun'), 'pp.ritu', `<b>${esc(L.names.ritu[p.ritu])}</b><span>${esc(L.names.ayana[p.ayana])}</span>`)
  ].join('');
  const tile = (cls, k, r, sub) => { const live = r && now >= r.start && now < r.end; return `<div class="card ptime ${cls}${live ? ' live' : ''} reveal"><span>${esc(t(k))}${live ? ` <span class="tag ${cls === 'good' ? 'good' : 'bad'}">${esc(t('pp.now'))}</span>` : ''}</span><b class="num">${range(r)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`; };
  const timings = [
    tile('good', 'pp.brahma', p.brahmaMuhurta, t('pp.brahmaSub')),
    tile('good', 'pp.abhijit', p.abhijit, p.abhijit ? t('pp.abhijitSub') : t('pp.noAbhijit')),
    tile('good', 'pp.nishita', p.nishita, t('pp.nishitaSub')),
    tile('bad', 'pp.rahu', p.rahuKaal, t('pp.rahuSub')),
    tile('bad', 'pp.yama', p.yamaganda, t('pp.yamaSub')),
    tile('bad', 'pp.gulika', p.gulikaKaal, t('pp.gulikaSub'))
  ].join('');
  const ch = part => p.choghadiya.filter(c => c.part === part).map(c => { const live = now >= c.start && now < c.end; return `<li class="${c.quality}${live ? ' live' : ''}"><b>${esc(L.names.chogh[c.name])}</b><span class="num">${fTime(c.start, tz)} – ${fTime(c.end, tz)}</span><span class="q">${esc(t('pp.q.' + c.quality))}${live ? ' · ' + esc(t('pp.now')) : ''}</span></li>`; }).join('');
  const [y, m, d] = pDate.value.split('-').map(Number);
  box.innerHTML = `
    <div class="card pday reveal"><div><span class="eyebrow">${esc(city.name)}${city.region ? ', ' + esc(city.region) : ''} · UTC${offStr(tz)}</span><h2>${esc(longDateFmt.format(new Date(Date.UTC(y, m - 1, d))))}</h2>
      <p>${esc(pakshaOf(p.tithi[0].index))} ${esc(tithiLabel(p.tithi[0].index))} · ${esc(nk(p.nakshatra[0].index))} · ${esc(masa)}</p></div><span class="moonph big">${moonPhase(((p.tithi[0].index + 0.5) * 12) % 360)}</span></div>
    <h3 class="sub-h">${esc(t('pp.elements'))}</h3><div class="pan-grid">${elements}</div>
    <h3 class="sub-h">${esc(t('pp.timings'))}</h3><div class="ptimes">${timings}</div>
    <h3 class="sub-h">${esc(t('pp.chogh'))}</h3><p class="lede">${esc(t('pp.choghLede'))}</p>
    <div class="chogh-grid"><div class="card"><h4>${ic('i-sun')}${esc(t('pp.choghDay'))}</h4><ol class="chogh">${ch('day')}</ol></div><div class="card"><h4>${g('Moon', 'gimg sm')}${esc(t('pp.choghNight'))}</h4><ol class="chogh">${ch('night')}</ol></div></div>`;
  observeReveals();
}
load();
