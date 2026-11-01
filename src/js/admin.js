/* Admin page: users, Kundalis, history, blog, social reels and activity (panels live in core.js, adminView). */
const admRoot = $('#admin-root');
let admShown = false;
function admRender() {
  if (!sb) { admRoot.innerHTML = `<div class="card adm-gate"><p class="err">${esc(t('admin.noDb'))}</p></div>`; return; }
  if (!session) { admShown = false; admRoot.innerHTML = `<div class="card adm-gate">${ic('i-lock')}<h2>${esc(t('admin.loginH'))}</h2><p class="muted">${esc(t('admin.loginP'))}</p><button type="button" class="btn-cta" data-auth="login">${esc(t('nav.login'))}</button></div>`; return; }
  if (!isAdmin) { admShown = false; admRoot.innerHTML = `<div class="card adm-gate">${ic('i-shield')}<h2>${esc(t('admin.denyH'))}</h2><p class="muted">${esc(t('admin.denyP', { e: session.user.email || '' }))}</p><a class="btn-line" href="${HOME}">${esc(t('nav.kundali'))}</a></div>`; return; }
  if (admShown) return;
  admShown = true; adminView(admRoot);
}
readyHooks.push(admRender);
authHooks.push(() => { checkAdmin().then(admRender); });
