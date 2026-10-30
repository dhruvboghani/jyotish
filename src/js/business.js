/* Business / shop Kundali: a chart for the opening or registration moment, read for the business.
   Houses: 1 the business itself, 2 cash and stock, 7 customers and partners, 10 reputation and growth, 11 profit, 6 competition and loans.
   Plus the business name number (Chaldean) against the opening date, good and careful dasha periods, and the next 12 months by transit. */
const bzCity = cityPicker(() => { });
const BZ_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const BZ_BEN = ['Jupiter', 'Venus', 'Mercury', 'Moon'], BZ_MAL = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];
const BZ_AREAS = [['self', 1], ['cash', 2], ['customers', 7], ['growth', 10], ['profit', 11], ['rivals', 6]];
(() => { const s = store.get('gv-bz'); if (s) { $('#bz-name').value = s.name || ''; $('#bz-date').value = s.date || ''; $('#bz-time').value = s.time || '10:00'; } })();

function bzRead(c) {
  const P = Object.fromEntries(c.planets.map(p => [p.name, p])), L = c.lagna.sign, lordOf = h => BZ_LORD[(L + h - 1) % 12];
  const dig = p => p.dignity === 'Exalted' ? 2 : p.dignity === 'Own sign' ? 1.5 : p.dignity === 'Debilitated' ? -2 : 0;
  return BZ_AREAS.map(([k, h]) => {
    const lord = lordOf(h), lp = P[lord], why = []; let s = 50;
    const add = (pts, key, params) => { s += pts; why.push({ key, params: params || {}, tone: pts > 0 ? 'good' : 'bad' }); };
    const goodH = h === 6 ? [3, 6, 11, 10] : [1, 2, 4, 5, 7, 9, 10, 11];
    if (goodH.includes(lp.house)) add(12, 'bz.w.lordGood', { g: { g: lord }, h, x: lp.house });
    else if ([6, 8, 12].includes(lp.house) && h !== 6) add(-12, 'bz.w.lordBad', { g: { g: lord }, h, x: lp.house });
    const d = dig(lp); if (d > 0) add(8 * d / 2, 'bz.w.lordStrong', { g: { g: lord } }); if (d < 0) add(-10, 'bz.w.lordWeak', { g: { g: lord } });
    const occ = c.planets.filter(p => p.house === h);
    const ben = occ.filter(p => BZ_BEN.includes(p.name)), mal = occ.filter(p => BZ_MAL.includes(p.name));
    if (ben.length) add(h === 6 ? -4 : 8 * ben.length, h === 6 ? 'bz.w.benIn6' : 'bz.w.benIn', { h, list: { list: ben.map(p => ({ g: p.name })) } });
    if (mal.length) add([3, 6, 10, 11].includes(h) ? 6 * mal.length : -8 * mal.length, [3, 6, 10, 11].includes(h) ? 'bz.w.malOk' : 'bz.w.malIn', { h, list: { list: mal.map(p => ({ g: p.name })) } });
    if (P.Jupiter && [5, 7, 9].includes((h - P.Jupiter.house + 12) % 12 + 1) && h !== 6) add(6, 'bz.w.jupAsp', { h });
    return { k, h, lord, score: Math.max(5, Math.min(98, Math.round(s))), why };
  });
}
function bzTimeline(c) {
  const L = c.lagna.sign, now = Date.now(), lordOf = h => BZ_LORD[(L + h - 1) % 12];
  const good = new Set([lordOf(1), lordOf(2), lordOf(10), lordOf(11), lordOf(5), lordOf(9)]), care = new Set([lordOf(6), lordOf(8), lordOf(12)]);
  const periods = [];
  for (const m of c.dashas) for (const a of m.sub) {
    if (a.end < now || a.start > now + 10 * 365.25 * 864e5) continue;
    const tone = good.has(a.lord) && !care.has(a.lord) ? 'good' : care.has(a.lord) && !good.has(a.lord) ? 'care' : 'mixed';
    periods.push({ md: m.lord, ad: a.lord, start: Math.max(now, a.start), end: a.end, tone });
  }
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now); d.setUTCDate(15); d.setUTCMonth(d.getUTCMonth() + i);
    const lon = window.Jyotish.transit(d.getTime() / 864e5 + 2440587.5).lon, hOf = p => (Math.floor(lon[p] / 30) - L + 12) % 12 + 1;
    const j = hOf('Jupiter'), s = hOf('Saturn'), r = hOf('Rahu');
    let pts = 0; const why = [];
    if ([1, 2, 5, 7, 9, 10, 11].includes(j)) { pts += 1; why.push(['bz.m.jup', { h: j }]); }
    if ([3, 6, 11].includes(s)) { pts += 1; why.push(['bz.m.satGood', { h: s }]); } else if ([1, 2, 7, 8, 12].includes(s)) { pts -= 1; why.push(['bz.m.satBad', { h: s }]); }
    if ([3, 6, 11].includes(r)) { pts += 0.5; why.push(['bz.m.rahuGood', { h: r }]); } else if ([1, 7, 8, 12].includes(r)) { pts -= 0.7; why.push(['bz.m.rahuBad', { h: r }]); }
    months.push({ ms: d.getTime(), tone: pts >= 1 ? 'good' : pts <= -1 ? 'care' : 'mixed', why });
  }
  return { periods: periods.slice(0, 10), months };
}

$('#bz-form').addEventListener('submit', e => {
  e.preventDefault();
  const er = $('#bz-err'); er.textContent = '';
  const name = $('#bz-name').value.trim(), date = $('#bz-date').value, time = $('#bz-time').value || '10:00';
  if (!date) { er.textContent = t('err.date'); return; }
  if (!window.Jyotish) { er.textContent = t('err.server'); return; }
  store.set('gv-bz', { name, date, time });
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number), city = bzCity.city;
  const c = window.Jyotish.compute({ year: y, month: mo, day: d, hour: h, minute: mi, lat: city.lat, lon: city.lon, tzMinutes: bzCity.offset(y, mo, d) });
  track('business_kundali', { name, date, time, city: city.name });
  bzLast = { c, name, y, mo, d, city }; bzDraw();
});
let bzLast = null;
function bzDraw() {
  if (!bzLast) return;
  const { c, name, y, mo, d, city } = bzLast, P = Object.fromEntries(c.planets.map(p => [p.name, p]));
  const areas = bzRead(c), overall = Math.round(areas.filter(a => a.k !== 'rivals').reduce((s, a) => s + a.score, 0) / 5);
  const mu = NU.mulank(d), bh = NU.bhagyank(d, mo, y);
  const nn = /[a-z]/i.test(name) ? NU.nameNumber(name) : null, fit = nn ? NU.fit(nn, mu, bh) : null;
  const vars = nn && fit !== 'best' ? NU.variants(name, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => NU.fit(n, mu, bh) === 'best'), 6) : [];
  const bySign = Array.from({ length: 12 }, () => []); c.planets.forEach(p => bySign[p.sign].push({ t: ga(p.name), c: COL[p.name], r: p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' }));
  const chart = drawChart({ asc: c.lagna.sign, bySign, title: name || t('bz.chartT'), sub: `${d}/${mo}/${y}` });
  const area = a => `<li><div class="cr-fh"><b>${esc(t('bz.a.' + a.k))}</b><span class="muted small">${esc(t('bz.house', { h: a.h, g: { g: a.lord } }))}</span><span class="num">${a.score}</span></div><div class="meter"><i class="${a.score >= 62 ? 'good' : a.score >= 45 ? 'mixed' : 'bad'}" style="width:${a.score}%"></i></div>
    <ul class="dl-why">${a.why.slice(0, 4).map(w => `<li class="${w.tone}">${esc(t(w.key, w.params))}</li>`).join('')}</ul></li>`;
  const fmtM = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric' });
  let timeline = '';
  if (session) {
    const T = bzTimeline(c);
    timeline = `<div class="card cr-card reveal"><h3>${ic('i-cal')}${esc(t('bz.monthsH'))}</h3><ol class="bz-months">${T.months.map(m => `<li class="cm-${m.tone === 'good' ? 'both' : m.tone === 'care' ? 'tense' : 'ok'}" title="${esc(m.why.map(w => t(w[0], w[1])).join(' · '))}"><b>${esc(fmtM.format(new Date(m.ms)))}</b><small>${esc(t('bz.tone.' + m.tone))}</small></li>`).join('')}</ol><p class="muted small">${esc(t('bz.monthsNote'))}</p></div>
      <div class="card cr-card reveal"><h3>${ic('i-loop')}${esc(t('bz.periodsH'))}</h3><ul class="cr-wins">${T.periods.map(p => `<li class="${p.tone === 'good' ? 'jup' : ''}"><span class="num">${esc(fmtM.format(new Date(p.start)))} – ${esc(fmtM.format(new Date(p.end)))}</span><span>${g(p.md, 'gimg sm')}${esc(gn(p.md))}–${esc(gn(p.ad))}</span><span class="tag ${p.tone === 'good' ? 'good' : p.tone === 'care' ? 'bad' : ''}">${esc(t('bz.tone.' + p.tone))}</span></li>`).join('')}</ul></div>`;
  } else timeline = lockCard('business', `<p class="muted small">${esc(t('bz.lockNote'))}</p>`);
  $('#bz-res').innerHTML = `<div class="bz-top"><div class="card bz-chart reveal">${chart}<p class="small">${rg(c.lagna.sign, 'rg sm')} ${esc(t('rl.lagna', { r: { r: c.lagna.sign } }))} · ${esc(t('dl.moonIn', { nk: { nk: P.Moon.nak } }))} · ${esc(city.name)}</p></div>
      <div class="card cr-card reveal"><span class="eyebrow">${esc(t('bz.overall'))}</span><p class="bz-overall"><b>${overall}</b>/100 <span class="tag ${overall >= 62 ? 'good' : overall >= 48 ? 'gold' : 'bad'}">${esc(t('bz.band.' + (overall >= 62 ? 'strong' : overall >= 48 ? 'moderate' : 'care')))}</span></p>
        ${nn ? `<h4>${esc(t('bz.nameH'))}</h4><p class="small"><b>${esc(name)}</b> = ${nn} (${esc(gn(NU.PLANET[nn]))}) <span class="tag ${fit === 'best' || fit === 'good' ? 'good' : fit === 'avoid' ? 'bad' : ''}">${esc(t('nu.fit.' + fit))}</span></p><p class="muted small">${esc(t('nu.fitText.' + fit, { n: nn }))}</p>${vars.length ? `<p class="small">${esc(t('nu.variantsH'))}: ${vars.map(v => `<span class="tag good">${esc(v.name)} · ${v.number}</span>`).join(' ')}</p>` : ''}` : `<p class="muted small">${esc(t('bz.noName'))}</p>`}
        <p class="muted small">${esc(t('bz.dateNums', { a: mu, b: bh }))}</p></div></div>
    <div class="card cr-card reveal"><h3>${ic('i-chart')}${esc(t('bz.areasH'))}</h3><ol class="cr-fields bz-areas">${areas.map(area).join('')}</ol></div>
    ${timeline}
    <p class="muted small rem-note">${ic('i-info')}${esc(t('bz.note'))}</p>`;
  observeReveals();
}
authHooks.push(() => bzDraw());
