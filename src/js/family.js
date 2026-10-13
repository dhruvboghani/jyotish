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
