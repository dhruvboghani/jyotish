/* Me — account screen of the app (also at /me/ on the web, not indexed): profile, sadhana, every tool, language. */
async function meRun() {
  const head = $('#me-head');
  if (!session) {
    head.innerHTML = `<span class="me-av">?</span><div><b>${esc(t('app.guest'))}</b><small>${esc(t('app.guestNote'))}</small></div><button class="btn-cta" type="button" data-auth="login">${esc(t('nav.login'))}</button>`;
    $('#me-out').hidden = true; $('#me-sadhana').innerHTML = ''; return;
  }
  const meta = session.user.user_metadata || {}, name = meta.full_name || meta.name || session.user.email || '';
  head.innerHTML = `<span class="me-av">${esc((name.trim().charAt(0) || '?').toUpperCase())}</span><div><b>${esc(name)}</b><small>${esc(session.user.email || '')}</small></div><a class="btn-line" href="${HOME}" id="me-chart">${esc(t('app.myChart'))}</a>`;
  $('#me-out').hidden = false;
  const rows = await loadMyKundalis(), me = rows.find(r => r.relation === 'self');
  if (me) {
    const lnk = $('#me-chart');
    lnk.addEventListener('click', e => { e.preventDefault(); openChart({ ...me.birth, relation: 'self' }, { save: false }); });
  }
  const box = $('#me-sadhana'), { rows: sds, error } = await sdLoad();
  const act = error ? [] : sds.filter(r => r.status !== 'stopped' && !sdStats(r).complete && !sdStats(r).ended).slice(0, 3);
  box.innerHTML = act.length ? `<div class="sd-list compact">${act.map(r => sdCard(r, { compact: true })).join('')}</div>` : '';
  sdWire(box, act, meRun); observeReveals();
}
// Language: same choices as the header's selector
(() => {
  const src = $('#lang'), sel = $('#me-lang'); if (!src || !sel) return;
  sel.innerHTML = src.innerHTML; sel.value = src.value;
  sel.addEventListener('change', () => { store.set('kg-lang', sel.value); location.href = sel.selectedOptions[0].dataset.href; });
})();
$('#me-out').addEventListener('click', async () => { if (sb) await sb.auth.signOut(); location.href = HOME + 'today/'; });
readyHooks.push(meRun);
authHooks.push(() => meRun());
