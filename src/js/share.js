/* Shared Kundali page: /share/?t=TOKEN */
(async () => {
  const tok = new URLSearchParams(INITIAL_SEARCH).get('t') || '';
  const host = $('#results');
  if (!tok) { host.innerHTML = `<p class="empty">${esc(t('share.missing'))}</p>`; return; }
  host.innerHTML = '<div class="card" style="padding:40px;text-align:center;margin-top:28px"><span class="spin"></span></div>';
  try { renderFull(await api('/api/share/?t=' + encodeURIComponent(tok)), host); }
  catch (e) { host.innerHTML = `<div class="card lock-card" style="margin-top:28px"><span class="lock">${ic('i-link')}</span><div><b>${esc(t('share.gone'))}</b><p>${esc(t('share.goneText'))}</p></div><a class="btn-cta" href="${HOME}">${esc(t('share.makeOwn'))}</a></div>`; }
})();
