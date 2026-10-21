/* Push helpers.
   - Web push for browsers (VAPID keys from env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT).
   - Firebase Cloud Messaging for the Android app (env FCM_SERVICE_ACCOUNT: the service-account JSON, raw or base64).
   App rows in push_subscriptions have endpoint "fcm:<registration token>". */
const crypto = require('crypto');
const webpush = require('web-push');

let webReady = null;
function webConfigured() {
  if (webReady !== null) return webReady;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv } = process.env;
  webReady = !!(pub && priv);
  if (webReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', pub, priv);
  return webReady;
}

let sa;
function serviceAccount() {
  if (sa !== undefined) return sa;
  sa = null;
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return sa;
  try {
    const j = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    if (j.client_email && j.private_key && j.project_id) sa = j;
  } catch (e) { console.error('FCM_SERVICE_ACCOUNT is not valid JSON'); }
  return sa;
}
const fcmConfigured = () => !!serviceAccount();
const configured = () => webConfigured() || fcmConfigured();

// OAuth access token for FCM HTTP v1, from a self-signed service-account JWT (cached ~55 min)
let tokenCache = null;
async function fcmAccessToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60000) return tokenCache.token;
  const a = serviceAccount(), now = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: a.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const jwt = unsigned + '.' + crypto.createSign('RSA-SHA256').update(unsigned).sign(a.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error('FCM auth failed: ' + (j.error_description || j.error || r.status));
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

async function sendFcm(token, payload) {
  if (!fcmConfigured()) return 'failed';
  try {
    const access = await fcmAccessToken();
    const message = {
      token,
      notification: { title: payload.title || 'Grahavani', body: payload.body || '' },
      data: { url: String(payload.url || '/'), tag: String(payload.tag || '') },
      android: { priority: 'high', ttl: '43200s', notification: { tag: payload.tag || undefined, channel_id: 'reminders', icon: 'ic_stat_grahavani', color: '#D3971C' } }
    };
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount().project_id}/messages:send`, { method: 'POST', headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
    if (r.ok) return 'sent';
    const j = await r.json().catch(() => ({}));
    const code = (j.error && (j.error.status || '')) + ' ' + JSON.stringify((j.error && j.error.details) || '');
    return r.status === 404 || /UNREGISTERED/.test(code) ? 'gone' : 'failed';
  } catch (e) { console.error('fcm', e.message); return 'failed'; }
}

// Send to one stored subscription row; returns 'sent' | 'gone' | 'failed'
async function send(row, payload) {
  if (String(row.endpoint).startsWith('fcm:')) return sendFcm(row.endpoint.slice(4), payload);
  if (!webConfigured()) return 'failed';
  try {
    await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify(payload), { TTL: 12 * 3600 });
    return 'sent';
  } catch (e) { return e.statusCode === 404 || e.statusCode === 410 ? 'gone' : 'failed'; }
}
module.exports = { configured, webConfigured, fcmConfigured, send };
