/* Daily auto-post to the Grahavani Instagram account and Facebook Page (Meta Graph API), run from the 06:00 IST cron.
   Instagram: a feed carousel [Rashifal for all signs, Panchang] (4:5) and two stories (9:16). Facebook: one post with both images.
   Images are made by /api/social/?img=… (lib/social-card.js); Meta downloads them from that public URL.
   Env (all optional; a missing one just skips that network):
     META_PAGE_TOKEN  Page access token (long-lived, from a long-lived user token) — used for both Facebook and Instagram
     META_PAGE_ID     Facebook Page id
     META_IG_USER_ID  Instagram professional account id (the Page's instagram_business_account)
     SOCIAL_LANG      en | hi | gu | ta | te | kn (default en)
     SOCIAL_CITY      "Name|lat|lon|tzMinutes" for the Panchang card (default New Delhi)
     SOCIAL_STORIES   "0" to skip Instagram stories */
const R = require('./rashifal.js');
const P = require('./panchang.js');
const S = require('./site.js');
const { translator } = require('./i18n-server.js');

const GRAPH = 'https://graph.facebook.com/v23.0';
const LANGS = ['en', 'hi', 'gu', 'ta', 'te', 'kn'];

function config() {
  const lang = LANGS.includes(process.env.SOCIAL_LANG) ? process.env.SOCIAL_LANG : 'en';
  const [n, lat, lon, tz] = String(process.env.SOCIAL_CITY || '').split('|');
  const city = Number.isFinite(+lat) && Number.isFinite(+lon) && lat && lon ? { name: n || 'City', lat: +lat, lon: +lon, tz: Number.isFinite(+tz) && tz !== '' ? +tz : 330 } : { name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 330 };
  return { lang, city, token: process.env.META_PAGE_TOKEN || '', page: process.env.META_PAGE_ID || '', ig: process.env.META_IG_USER_ID || '', stories: process.env.SOCIAL_STORIES !== '0' };
}
const istToday = (now = Date.now()) => { const d = new Date(now + 330 * 60000); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
const iso = d => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const cityParam = c => encodeURIComponent(`${c.name}|${c.lat}|${c.lon}|${c.tz}`);
function imageUrl(kind, fmt, cfg, date) {
  return `${S.SITE_URL}/api/social/?img=${kind}&fmt=${fmt}&type=jpg&lang=${cfg.lang}&date=${iso(date)}${kind === 'panchang' ? '&city=' + cityParam(cfg.city) : ''}&v=${S.BUILD || '1'}`;
}

// Caption in the chosen language, with hashtags
function caption(cfg, date, forFacebook) {
  const { t, L } = translator(cfg.lang), rn = i => L('names.rashi')[i];
  const data = R.forDate(Date.UTC(date.y, date.m - 1, date.d, 0, 30));
  let dstr; try { dstr = new Intl.DateTimeFormat(L('meta.locale') || 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(Date.UTC(date.y, date.m - 1, date.d)); } catch (e) { dstr = iso(date); }
  const sorted = data.signs.slice().sort((a, b) => b.stars - a.stars), topStars = sorted[0].stars;
  const top = sorted.filter(s => s.stars === topStars && s.stars >= 3).slice(0, 4), care = data.signs.filter(s => s.chandrashtama || s.stars <= 1).slice(0, 3);
  const c = cfg.city, p = P.day({ year: date.y, month: date.m, day: date.d, lat: c.lat, lon: c.lon, tzMinutes: c.tz });
  const hm = ms => { const d = new Date(ms + c.tz * 60000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
  const ti = p.tithi[0].index, tithi = (ti < 15 ? L('names.paksha').Shukla : L('names.paksha').Krishna) + ' ' + (ti === 14 ? L('names.tithi')[14] : ti === 29 ? L('names.tithi')[15] : L('names.tithi')[ti % 15]);
  const lines = [
    '✨ ' + t('soc.title', { d: dstr }),
    '',
    top.length ? '🌟 ' + t('soc.top', { x: top.map(s => rn(s.sign) + ' ' + '★'.repeat(s.stars)).join(', ') }) : '',
    care.length ? '🙏 ' + t('soc.care', { x: care.map(s => rn(s.sign)).join(', ') }) : '',
    p.polar ? '' : '🪔 ' + t('soc.pan', { c: c.name, t: tithi, n: L('names.nak')[p.nakshatra[0].index], r: hm(p.rahuKaal.start) + '–' + hm(p.rahuKaal.end) }),
    '',
    forFacebook ? '' : '👉 ' + t('soc.swipe'),
    forFacebook ? t('soc.ctaFb', { u: S.SITE_URL + '/' }) : t('soc.ctaIg'),
    '',
    (t('soc.tags').match(/#\S+/g) || []).filter(x => x !== '#grahavani').slice(0, 4).concat('#grahavani').join(' ') // Instagram allows 5 hashtags
  ];
  return lines.filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0)).join('\n').trim();
}

async function graph(pathName, params, method = 'POST') {
  const url = GRAPH + pathName;
  const r = method === 'GET'
    ? await fetch(url + '?' + new URLSearchParams(params))
    : await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error((j.error && (j.error.error_user_msg || j.error.message)) || ('HTTP ' + r.status));
  return j;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Instagram containers are processed before they can be published
async function waitReady(id, token, maxMs = 25000) {
  const end = Date.now() + maxMs;
  while (Date.now() < end) {
    const j = await graph('/' + id, { fields: 'status_code', access_token: token }, 'GET');
    if (j.status_code === 'FINISHED') return;
    if (j.status_code === 'ERROR' || j.status_code === 'EXPIRED') throw new Error('Instagram could not process the image (' + j.status_code + ')');
    await sleep(1500);
  }
  throw new Error('Instagram took too long to process the image');
}

async function postInstagram(cfg, date) {
  const tk = cfg.token, ig = cfg.ig, out = {};
  const kids = [];
  for (const kind of ['rashifal', 'panchang']) kids.push((await graph(`/${ig}/media`, { image_url: imageUrl(kind, 'post', cfg, date), is_carousel_item: true, access_token: tk })).id);
  const parent = await graph(`/${ig}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption: caption(cfg, date, false), access_token: tk });
  await waitReady(parent.id, tk);
  out.feed = (await graph(`/${ig}/media_publish`, { creation_id: parent.id, access_token: tk })).id;
  if (cfg.stories) {
    out.stories = [];
    for (const kind of ['rashifal', 'panchang']) {
      try {
        const c = await graph(`/${ig}/media`, { image_url: imageUrl(kind, 'story', cfg, date), media_type: 'STORIES', access_token: tk });
        await waitReady(c.id, tk, 15000);
        out.stories.push((await graph(`/${ig}/media_publish`, { creation_id: c.id, access_token: tk })).id);
      } catch (e) { out.stories.push('error: ' + e.message); }
    }
  }
  return out;
}
async function postFacebook(cfg, date) {
  const tk = cfg.token, page = cfg.page;
  const ids = [];
  for (const kind of ['rashifal', 'panchang']) ids.push((await graph(`/${page}/photos`, { url: imageUrl(kind, 'post', cfg, date), published: false, access_token: tk })).id);
  const post = await graph(`/${page}/feed`, { message: caption(cfg, date, true), attached_media: ids.map(id => ({ media_fbid: id })), access_token: tk });
  return { post: post.id };
}

// opts: { dry: true } returns what would be posted without calling Meta
async function run(opts = {}) {
  const cfg = config(), date = istToday();
  const plan = { date: iso(date), lang: cfg.lang, city: cfg.city.name, images: ['rashifal', 'panchang'].map(k => imageUrl(k, 'post', cfg, date)), stories: cfg.stories ? ['rashifal', 'panchang'].map(k => imageUrl(k, 'story', cfg, date)) : [] };
  if (opts.dry) return { dry: true, ...plan, captionInstagram: caption(cfg, date, false), captionFacebook: caption(cfg, date, true), instagram: !!(cfg.token && cfg.ig), facebook: !!(cfg.token && cfg.page) };
  if (!cfg.token || (!cfg.ig && !cfg.page)) return { skipped: 'Set META_PAGE_TOKEN and META_IG_USER_ID / META_PAGE_ID' };
  const [ig, fb] = await Promise.all([
    cfg.ig ? postInstagram(cfg, date).catch(e => ({ error: e.message })) : null,
    cfg.page ? postFacebook(cfg, date).catch(e => ({ error: e.message })) : null
  ]);
  return { date: plan.date, instagram: ig, facebook: fb };
}

// Short morning message for the Instagram broadcast channel / WhatsApp: Hindi then English, a few lines each
function channel(cfg, date) {
  const c = cfg.city, p = P.day({ year: date.y, month: date.m, day: date.d, lat: c.lat, lon: c.lon, tzMinutes: c.tz });
  const hm = ms => { const d = new Date(ms + c.tz * 60000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
  const data = R.forDate(Date.UTC(date.y, date.m - 1, date.d, 0, 30)), top = data.signs.slice().sort((a, b) => b.stars - a.stars).filter((s, i, a) => s.stars === a[0].stars).slice(0, 3);
  const fests = require('./dayinfo.js').dayInfo(date, { name: c.name, lat: c.lat, lon: c.lon, tz: c.tz }).events.filter(e => e.e && e.kind === 'festival'), SC = require('./social-card.js');
  const one = lang => {
    const { L } = translator(lang), ti = p.tithi[0].index, tithi = (ti < 15 ? L('names.paksha').Shukla : L('names.paksha').Krishna) + ' ' + (ti === 14 ? L('names.tithi')[14] : ti === 29 ? L('names.tithi')[15] : L('names.tithi')[ti % 15]);
    let ds; try { ds = new Intl.DateTimeFormat(L('meta.locale') || 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(Date.UTC(date.y, date.m - 1, date.d)); } catch (e) { ds = iso(date); }
    const W = lang === 'hi' ? ['शुभ प्रभात', 'राहु काल', 'अभिजीत', 'आज के सितारे'] : ['Good morning', 'Rahu Kaal', 'Abhijit', "Today's stars"];
    return [`🌅 ${W[0]} · ${ds}`, ...fests.map(e => '🎉 ' + SC.festName(lang, e.e)), `🪔 ${tithi} · ${L('names.nak')[p.nakshatra[0].index]}`, `⏰ ${W[1]} ${hm(p.rahuKaal.start)}–${hm(p.rahuKaal.end)}` + (p.abhijit ? ` · ${W[2]} ${hm(p.abhijit.start)}–${hm(p.abhijit.end)}` : ''), `🌟 ${W[3]}: ${top.map(x => L('names.rashi')[x.sign]).join(', ')}`].join('\n');
  };
  return [one('hi'), '', one('en'), '', `📍 ${c.name} · ${S.SITE_URL.replace(/^https?:\/\//, '')}/panchang/`].join('\n');
}
module.exports = { run, caption, channel, config, imageUrl };
