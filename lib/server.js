/* Shared helpers for the Vercel functions: auth, body parsing, rate limiting, caching headers. */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// Publishable key (sb_publishable_…) or legacy anon key. Never the secret/service_role key.
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

function anonClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function userFromReq(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL || !SUPABASE_KEY) return { user: null, sb: null };
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data || !data.user) return { user: null, sb: null };
    return { user: data.user, sb };
  } catch (e) { return { user: null, sb: null }; }
}

function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { return null; } }
  return b && typeof b === 'object' ? b : null;
}

// Simple per-instance sliding window. Vercel runs several instances, so this caps bursts rather than
// enforcing an exact global quota; add Vercel Firewall rules for stricter limits.
const hits = new Map();
function rateLimit(req, res, { limit = 60, windowMs = 60000, key = 'default' } = {}) {
  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown').split(',')[0].trim();
  const k = key + '|' + ip, now = Date.now();
  const arr = (hits.get(k) || []).filter(t => now - t < windowMs);
  arr.push(now); hits.set(k, arr);
  if (hits.size > 5000) for (const [kk, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(kk);
  if (arr.length > limit) {
    res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
    res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });
    return false;
  }
  return true;
}

const num = (v, lo, hi) => { const n = Number(v); return isFinite(n) && n >= lo && n <= hi ? n : null; };
function cache(res, seconds) { res.setHeader('Cache-Control', `public, max-age=${Math.min(seconds, 3600)}, s-maxage=${seconds}, stale-while-revalidate=${seconds}`); }

// Optional, server-only: the secret key lets /api/signup create accounts that are confirmed at once.
// It is read only inside Vercel functions and is never sent to the browser.
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
function adminClient() {
  if (!SUPABASE_URL || !SECRET_KEY) return null;
  return createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

module.exports = { adminClient, anonClient, userFromReq, body, rateLimit, num, cache };
