/* Muhurta finder — next 15 days for everyone; longer searches and personal charts after login. */
const cm = cityPicker(() => {});
const mFrom = $('#mu-from'), mDays = $('#mu-days'), mPurpose = $('#mu-purpose'), p1 = $('#mu-p1'), p2 = $('#mu-p2');
const td0 = todayIn(cm.offset(2026, 1, 1)); mFrom.value = isoDay(td0.y, td0.m, td0.d);
let rowsM = [];
async function fillPeople() { if (!session) return; rowsM = await fillKundaliSelect(p1, t('mu.nobody')); await fillKundaliSelect(p2, t('mu.nobody')); }
$('#muform').addEventListener('submit', async e => {
  e.preventDefault();
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
    ${r.basic ? lockCard('muhurta', `<p class="muted small">${esc(t('mu.basicNote', { n: r.days || 30 }))}</p>`) : ''}
    <p class="muted small">${esc(t('mu.disclaimer'))}</p>`;
  lastMuBasic = !!r.basic;
  observeReveals();
}
let lastMuBasic = false;
readyHooks.push(s => { $('#mu-lock').hidden = !!s; fillPeople(); });
authHooks.push((ev, s) => { $('#mu-lock').hidden = !!s; fillPeople(); if (s && lastMuBasic && ev === 'SIGNED_IN') $('#muform').requestSubmit(); });

// ---------- Quick packs: one tap → the next five good dates ----------
const PACKS = [['griha', 'i-house'], ['vehicle', 'i-star'], ['mundan', 'i-users'], ['namkaran', 'i-heart'], ['marriage', 'i-heart'], ['business', 'i-chart']];
$('#mu-packs').innerHTML = PACKS.map(([k, icon]) => `<button type="button" class="card mu-pack" data-pack="${k}"><span class="ti c-gold">${ic(icon)}</span><b>${esc(t('mu.p.' + k))}</b><small>${esc(t('mu.next5'))}</small></button>`).join('');
$('#mu-packs').addEventListener('click', async e => {
  const b = e.target.closest('[data-pack]'); if (!b) return;
  $$('.mu-pack').forEach(x => x.classList.toggle('on', x === b));
  const city = cm.city, td = todayIn(cm.offset(2026, 1, 1)), tz = cm.offset(td.y, td.m, td.d), box = $('#mu-packres');
  box.innerHTML = `<div class="card" style="padding:24px;text-align:center"><span class="spin"></span><p class="muted">${esc(t('mu.searching'))}</p></div>`;
  try {
    const r = await api('/api/muhurta/', { method: 'POST', body: JSON.stringify({ purpose: b.dataset.pack, from: isoDay(td.y, td.m, td.d), days: 240, top: 5, lat: city.lat, lon: city.lon, tz }) });
    const day = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
    box.innerHTML = `<div class="card mu-top reveal"><h3>${esc(t('mu.topH', { p: t('mu.p.' + r.purpose), c: city.name }))}</h3><ol>${r.dates.map(w => `<li><b>${esc(longDateFmt.format(day(w.date)))}</b><span class="num">${fTime(w.start, tz)} – ${fTime(w.end, tz)}</span><span class="muted">${esc(pakshaOf(w.tithi))} ${esc(tithiLabel(w.tithi))} · ${esc(nk(w.nak))}</span><span class="tag ${w.score >= 75 ? 'good' : ''}">${w.score}</span></li>`).join('') || `<li class="empty">${esc(t('mu.none'))}</li>`}</ol></div>`;
    observeReveals();
  } catch (err) { box.innerHTML = `<p class="err">${esc(err.status === 401 ? t('members.lockText') : t('err.server'))}</p>`; }
});
