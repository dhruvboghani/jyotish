/* Muhurta finder — members only. */
const cm = cityPicker(() => {});
const mFrom = $('#mu-from'), mDays = $('#mu-days'), mPurpose = $('#mu-purpose'), p1 = $('#mu-p1'), p2 = $('#mu-p2');
const td0 = todayIn(cm.offset(2026, 1, 1)); mFrom.value = isoDay(td0.y, td0.m, td0.d);
let rowsM = [];
async function fillPeople() { if (!session) return; rowsM = await fillKundaliSelect(p1, t('mu.nobody')); await fillKundaliSelect(p2, t('mu.nobody')); }
$('#muform').addEventListener('submit', async e => {
  e.preventDefault();
  if (!requireLogin('muhurta')) return;
  const [y, m, d] = mFrom.value.split('-').map(Number), city = cm.city, tz = cm.offset(y, m, d);
  const people = [p1, p2].map(s => s.value !== '' && rowsM[+s.value] ? rowsM[+s.value].birth : null).filter(Boolean);
  const box = $('#mures'); box.innerHTML = `<div class="card" style="padding:30px;text-align:center"><span class="spin"></span><p class="muted">${esc(t('mu.searching'))}</p></div>`;
  try {
    const r = await api('/api/muhurta/', { method: 'POST', body: JSON.stringify({ purpose: mPurpose.value, from: mFrom.value, days: +mDays.value, lat: city.lat, lon: city.lon, tz, people }) });
    drawM(r, tz, city, people);
  } catch (err) { box.innerHTML = `<p class="err">${esc(err.status === 401 ? t('members.lockText') : t('err.server'))}</p>`; if (err.status === 401) requireLogin('muhurta'); }
});
function drawM(r, tz, city, people) {
  const box = $('#mures');
  const byDate = {};
  r.windows.forEach(w => (byDate[w.date] = byDate[w.date] || []).push(w));
  const dates = Object.keys(byDate);
  const blockedSum = {}; r.blocked.forEach(b => blockedSum[b.reason] = (blockedSum[b.reason] || 0) + 1);
  const dayOf = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const best = r.windows.slice().sort((a, b) => b.score - a.score)[0];
  const winHtml = w => {
    const cross = Math.floor((w.end + tz * 60000) / 864e5) !== Math.floor((w.start + tz * 60000) / 864e5);
    return `<li class="${w.score >= 80 ? 'best' : ''}"><span class="num tm">${fTime(w.start, tz)} – ${fTime(w.end, tz)}${cross ? ' <small>+1</small>' : ''}</span><span class="el">${esc(pakshaOf(w.tithi))} ${esc(tithiLabel(w.tithi))} · ${esc(nk(w.nak))} · ${esc(L.names.yoga27[w.yoga])}</span><span class="sc"><b>${w.score}</b></span>${w.personal ? `<span class="pers">${w.personal.map((x, i) => `<span class="tag ${[2, 4, 6, 8, 9].includes(x.tara) ? 'good' : ''}">${esc(people[i].name || t('res.defaultName'))}: ${esc(L.names.tara[x.tara - 1])}</span>`).join('')}</span>` : ''}</li>`;
  };
  box.innerHTML = `
    <div class="card mu-sum reveal"><div><span class="eyebrow">${esc(t('mu.p.' + r.purpose))} · ${esc(city.name)}</span><h3>${esc(t('mu.found', { n: dates.length, w: r.windows.length }))}</h3>
      ${best ? `<p>${esc(t('mu.best', { d: longDateFmt.format(dayOf(best.date)), t: fTime(best.start, tz) + ' – ' + fTime(best.end, tz) }))}</p>` : ''}
      ${Object.keys(blockedSum).length ? `<p class="muted small">${esc(t('mu.blockedNote'))} ${Object.entries(blockedSum).map(([k, n]) => esc(t('mu.block.' + k)) + ' (' + n + ')').join(' · ')}</p>` : ''}
      ${r.personalised ? `<p class="muted small">${esc(t('mu.personalNote'))}</p>` : ''}</div></div>
    ${dates.map(d => `<section class="mu-day reveal"><h3>${esc(longDateFmt.format(dayOf(d)))}</h3><ul class="mu-list">${byDate[d].map(winHtml).join('')}</ul></section>`).join('') || `<p class="empty">${esc(t('mu.none'))}</p>`}
    <p class="muted small">${esc(t('mu.disclaimer'))}</p>`;
  observeReveals();
}
readyHooks.push(s => { $('#mu-lock').hidden = !!s; fillPeople(); });
authHooks.push((ev, s) => { $('#mu-lock').hidden = !!s; fillPeople(); });
