/* My Sadhana — members only: every remedy practice with its day grid, ticks, restart and reminders. */
async function loadSadhanaPage() {
  const box = $('#sd');
  if (!session) { box.innerHTML = lockCard('sadhana'); return; }
  box.innerHTML = '<div class="card" style="padding:30px;text-align:center"><span class="spin"></span></div>';
  const { rows, error } = await sdLoad();
  if (error) { box.innerHTML = `<div class="card lock-card"><span class="lock">${ic('i-info')}</span><div><b>${esc(t('sd.title'))}</b><p>${esc(sdSetupMissing(error) ? t('sd.setup') : error.message)}</p></div></div>`; return; }
  const live = rows.filter(r => r.status !== 'stopped' && !sdStats(r).complete && !sdStats(r).ended);
  const old = rows.filter(r => !live.includes(r));
  const pushOff = !('Notification' in window) || Notification.permission !== 'granted';
  box.innerHTML = `<div class="sd-bar"><button class="btn-cta" type="button" id="sd-new">${ic('i-check')}${esc(t('sd.newBtn'))}</button>${pushOff && live.some(r => r.remind) ? `<a class="muted small" href="${HOME}settings/">${ic('i-bell')}${esc(t('sd.pushHint'))}</a>` : ''}</div>
    ${rows.length ? '' : `<div class="card lock-card"><span class="lock">${ic('i-star')}</span><div><p>${esc(t('sd.empty'))}</p></div><a class="btn-line" href="${HOME}#remedies">${esc(t('rm.title'))}</a></div>`}
    ${live.length ? `<h2 class="sub-h">${esc(t('sd.active'))}</h2><div class="sd-list">${live.map(r => sdCard(r)).join('')}</div><p class="muted small sd-rule">${ic('i-info')}${esc(t('sd.rule'))}</p>` : ''}
    ${old.length ? `<h2 class="sub-h">${esc(t('sd.finished'))}</h2><div class="sd-list">${old.map(r => sdCard(r)).join('')}</div>` : ''}`;
  $('#sd-new').onclick = () => sdStartModal({}, loadSadhanaPage);
  sdWire(box, rows, loadSadhanaPage);
  observeReveals();
}
readyHooks.push(loadSadhanaPage);
authHooks.push(() => loadSadhanaPage());
