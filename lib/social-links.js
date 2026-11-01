/* Grahavani's own Instagram and Facebook pages, set in env (handle or full URL). Empty → nothing is shown.
   SOCIAL_INSTAGRAM=grahavani   SOCIAL_FACEBOOK=grahavani (page username, or the full https://facebook.com/… link) */
const clean = v => String(v || '').trim();
function links() {
  const ig = clean(process.env.SOCIAL_INSTAGRAM), fb = clean(process.env.SOCIAL_FACEBOOK);
  const igHandle = ig.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  const fbUrl = !fb ? '' : /^https:\/\//i.test(fb) ? fb : 'https://www.facebook.com/' + fb.replace(/^@/, '');
  return {
    instagram: igHandle && /^[A-Za-z0-9._]{1,30}$/.test(igHandle) ? { handle: igHandle, url: 'https://www.instagram.com/' + igHandle + '/' } : null,
    facebook: fbUrl && /^https:\/\/(www\.|m\.)?(facebook|fb)\.com\/[^\s"'<>]+$/i.test(fbUrl) ? { url: fbUrl } : null
  };
}
module.exports = { links };
