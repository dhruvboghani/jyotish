/* Stand-in for lib/server.js inside the app's offline bundle: same helpers, no Supabase, no rate limits. */
function num(v, min, max) { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? n : null; }
function body(req) { let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { return null; } } return b && typeof b === 'object' ? b : null; }
// Offline we cannot check the token with Supabase; a stored session is trusted for calculations only (nothing is saved).
async function userFromReq(req) { const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); return { user: tok ? { id: 'offline' } : null, sb: null }; }
const rateLimit = () => true, cache = () => { }, adminClient = () => null;
module.exports = { num, body, userFromReq, rateLimit, cache, adminClient };
