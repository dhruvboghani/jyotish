/* Family dashboard — members only: every saved Kundali on one screen. */
async function loadFamily() {
  const box = $('#fam');
  if (!session) { box.innerHTML = lockCard('family'); return; }
  box.innerHTML = '<div class="card" style="padding:30px;text-align:center"><span class="spin"></span></div>';
  const rows = await loadMyKundalis();
  if (!rows.length) { box.innerHTML = `<div class="card lock-card"><span class="lock">${ic('i-users')}</span><div><b>${esc(t('fam.emptyT'))}</b><p>${esc(t('fam.empty'))}</p></div><a class="btn-cta" href="${HOME}">${esc(t('nav.new'))}</a></div>`; return; }
  const order = r => { const i = RELATIONS.indexOf(r.relation); return i < 0 ? 99 : i; };
  rows.sort((a, b) => order(a) - order(b));
  try {
    const data = await api('/api/family/', { method: 'POST', body: JSON.stringify({ births: rows.map(r => ({ ...r.birth, id: r.id, relation: r.relation || undefined })) }) });
    const now = data.at, byId = Object.fromEntries(rows.map(r => [r.id, r]));
    box.innerHTML = `<div class="fam-grid">${data.members.map(m => {
      const tz = m.birth.tzMinutes, ss = m.sadeSati;
      const ssTxt = ss.phase ? t('fam.ssNow', { p: t('fam.phase.' + ss.phase), d: ss.until ? fDate(ss.until, tz) : '—' }) : ss.next ? t('fam.ssNext', { d: fDate(ss.next, tz) }) : t('yoga.sadesati.none');
      const evs = m.events.map(e => `<li>${g(e.planet || e.lord, 'gimg sm')}<span>${esc(e.type === 'ingress' ? t('events.ingress', { g: { g: e.planet }, r: { r: e.to } }) : e.type === 'md' ? t('events.md', { g: { g: e.lord } }) : t('events.ad', { md: { g: e.md }, ad: { g: e.lord } }))}</span><span class="num">${fDate(e.at, tz)}</span></li>`).join('');
      return `<article class="card fam reveal ${ss.phase ? 'ss' : ''}"><div class="fh"><span class="rgic">${esc(((m.name || '?').trim().charAt(0) || '?').toUpperCase())}</span><div><b>${esc(m.name || t('res.defaultName'))}</b><span>${m.relation ? `<span class="tag gold">${esc(t('rel.' + m.relation))}</span> ` : ''}${esc(t('res.rashiShort', { r: { r: m.moonSign } }))} · ${esc(nk(m.nak))}</span></div><div class="fs">${starRow(m.today.stars)}<small>${esc(t('rf.today'))}</small></div></div>
        <dl class="fam-dl"><div><dt>${esc(t('res.dasha'))}</dt><dd>${m.md ? `${g(m.md.lord, 'gimg sm')}${esc(gn(m.md.lord))} / ${esc(gn(m.ad.lord))}<small>${esc(t('res.until', { d: fDate(m.ad.end, tz) }))}</small>` : '—'}</dd></div>
        <div><dt>${esc(t('fam.next'))}</dt><dd>${m.nextAd ? `${esc(gn(m.nextAd.md))} / ${esc(gn(m.nextAd.lord))}<small>${esc(fDate(m.nextAd.start, tz))}</small>` : '—'}</dd></div>
        <div><dt>${esc(t('yoga.sadesati.name'))}</dt><dd class="${ss.phase ? 'bad' : ''}">${esc(ssTxt)}</dd></div></dl>
        ${evs ? `<h4>${esc(t('fam.soon'))}</h4><ul class="fam-ev">${evs}</ul>` : ''}
        <div class="fa"><button class="btn-line" type="button" data-open="${esc(m.id)}">${esc(t('saved.open'))}</button><a class="btn-line" href="${HOME}matching/">${ic('i-heart')}${esc(t('nav.matching'))}</a></div></article>`;
    }).join('')}</div>`;
    box.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => { const r = byId[b.dataset.open]; openChart({ ...r.birth, relation: r.relation || undefined }); }));
    observeReveals();
  } catch (e) { box.innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; }
}
readyHooks.push(loadFamily);
authHooks.push(() => loadFamily());

// ---------- Family timeline: one year of events for everyone ----------
let ftRows = null, ftFilter = 'all';
$$('.fam-tabs button').forEach(b => b.addEventListener('click', () => {
  $$('.fam-tabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  const tl = b.dataset.ft === 'timeline'; $('#fam').hidden = tl; $('#fam-tl').hidden = !tl;
  if (tl) loadTimeline();
}));
async function loadTimeline() {
  const box = $('#fam-tl');
  if (!session) { box.innerHTML = lockCard('family'); return; }
  box.innerHTML = '<div class="card" style="padding:30px;text-align:center"><span class="spin"></span></div>';
  const rows = await loadMyKundalis();
  if (!rows.length) { box.innerHTML = `<p class="empty">${esc(t('fam.empty'))}</p>`; return; }
  try {
    const city = store.get('kg-city');
    const d = await api('/api/family/', { method: 'POST', body: JSON.stringify({ timeline: true, births: rows.map(r => ({ ...r.birth, id: r.id, relation: r.relation || undefined })), city: city && isFinite(city.lat) ? { lat: city.lat, lon: city.lon, tz: tzOffsetMinutes(city.tz || 'Asia/Kolkata', todayIn(330).y, todayIn(330).m, todayIn(330).d, 12, 0) } : null }) });
    ftRows = d.events; drawTimeline();
  } catch (e) { box.innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; }
}
function ftText(e) {
  if (e.type === 'md') return [t('events.md', { g: { g: e.lord } }), t('ft.mdText', { n: DASHA_YEARS[e.lord] })];
  if (e.type === 'ad') return [t('events.ad', { md: { g: e.md }, ad: { g: e.lord } }), t('events.adText')];
  if (e.type === 'tithiBirthday') return [t('ft.tithiBd', { n: e.age }), t('td.tithiOf', { m: L.names.masa[e.month], t: L.names.paksha[e.tithi <= 15 ? 'Shukla' : 'Krishna'] + ' ' + (e.tithi === 15 ? L.names.tithi[14] : e.tithi === 30 ? L.names.tithi[15] : L.names.tithi[(e.tithi - 1) % 15]) })];
  const title = t(e.retro ? 'tl.back' : 'events.ingress', { g: { g: e.planet }, r: { r: e.sign } });
  return [title, (e.phase ? t('tl.ph.' + e.phase) + ' ' : '') + t('events.ingressText', { h: e.fromMoon, m: { k: 'names.house.' + (e.fromMoon - 1) } })];
}
function drawTimeline() {
  const box = $('#fam-tl'), names = [...new Set(ftRows.map(e => e.name || t('res.defaultName')))];
  const list = ftRows.filter(e => ftFilter === 'all' || (e.name || t('res.defaultName')) === ftFilter);
  const byMonth = new Map();
  list.forEach(e => { const k = monthFmt.format(new Date(e.at + 330 * 60000)); if (!byMonth.has(k)) byMonth.set(k, []); byMonth.get(k).push(e); });
  box.innerHTML = `<div class="chips ft-people">${['all', ...names].map(n => `<button type="button" class="chip" data-fp="${esc(n)}" aria-pressed="${n === ftFilter}">${esc(n === 'all' ? t('sec.yogas.all') : n)}</button>`).join('')}</div>
    ${[...byMonth].map(([m, evs]) => `<section class="ft-month"><h3 class="sub-h">${esc(m)}</h3><ol class="timeline">${evs.map(e => { const [a, b] = ftText(e); const tone = e.type === 'tithiBirthday' ? 'gold' : e.type === 'transit' ? (e.phase && /sade|dhaiya/.test(e.phase) ? 'bad' : e.good ? 'good' : '') : 'gold'; return `<li class="${tone}"><span class="when">${esc(dayMonthFmt.format(new Date(e.at + 330 * 60000)))}</span><span class="dot">${e.type === 'tithiBirthday' ? ic('i-lamp') : g(e.lord || e.planet)}</span><div><b>${esc(e.name || t('res.defaultName'))} · ${esc(a)}</b><p>${esc(b)}</p></div></li>`; }).join('')}</ol></section>`).join('') || `<p class="empty">${esc(t('events.none'))}</p>`}`;
  box.querySelectorAll('[data-fp]').forEach(b => b.onclick = () => { ftFilter = b.dataset.fp; drawTimeline(); });
}
