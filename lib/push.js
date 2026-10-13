/* Web push helpers (VAPID keys from env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT). */
const webpush = require('web-push');
let ready = null;
function configured() {
  if (ready !== null) return ready;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv } = process.env;
  ready = !!(pub && priv);
  if (ready) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  return ready;
}
// Send to one stored subscription row; returns 'sent' | 'gone' | 'failed'
async function send(row, payload) {
  try {
    await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 12 * 3600 });
    return 'sent';
  } catch (e) { return e.statusCode === 404 || e.statusCode === 410 ? 'gone' : 'failed'; }
}
module.exports = { configured, send };
