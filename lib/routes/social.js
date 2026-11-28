// GET /api/social/?img=rashifal|panchang&fmt=post|story&lang=en&date=YYYY-MM-DD[&city=Name|lat|lon|tz][&type=jpg] → PNG or JPEG (public, cached)
// GET /api/social/?post=1[&dry=1] with "Authorization: Bearer <CRON_SECRET>" → posts today's cards to Instagram / Facebook now
const { cache, rateLimit } = require('../server.js');

const LANGS = new Set(['en', 'hi', 'gu', 'ta', 'te', 'kn']);
module.exports = async (req, res) => {
  const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  if (q.post) {
    res.setHeader('Cache-Control', 'no-store');
    const secret = process.env.CRON_SECRET;
    if (!secret || (req.headers.authorization || '') !== 'Bearer ' + secret) return res.status(401).json({ error: 'unauthorised' });
    const out = await require('../social-post.js').run({ dry: !!q.dry });
    return res.status(200).json(out);
  }
  if (!rateLimit(req, res, { limit: 600, key: 'social' })) return;
  if (q.tts) {
    const raw = String(q.tts || '').trim().slice(0, 1000);
    if (!raw) return res.status(400).json({ error: 'empty tts' });
    const tl = LANGS.has(q.lang) ? q.lang : 'hi';
    const chunks = [];
    let rest = raw;
    while (rest.length > 0) {
      if (rest.length <= 180) { chunks.push(rest); break; }
      let cut = Math.max(rest.lastIndexOf('।', 180), rest.lastIndexOf('.', 180), rest.lastIndexOf(',', 180), rest.lastIndexOf(' ', 180));
      if (cut < 40) cut = 180;
      chunks.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    try {
      const bufs = [];
      for (const ch of chunks) {
        const u = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(ch)}`;
        const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r.ok) return res.status(502).json({ error: 'tts ' + r.status });
        bufs.push(Buffer.from(await r.arrayBuffer()));
      }
      const out = Buffer.concat(bufs);
      cache(res, 86400);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', out.length);
      return res.status(200).end(out);
    } catch (e) {
      return res.status(502).json({ error: 'tts failed' });
    }
  }
  if (q.caption) { // the day's caption with hashtags, in one language
    const SPo = require('../social-post.js'), cfg = SPo.config(), m0 = String(q.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/), n0 = new Date(Date.now() + 330 * 60000);
    cfg.lang = LANGS.has(q.lang) ? q.lang : 'en';
    if (q.city) { const [n, lat, lon] = String(q.city).split('|'); if (Number.isFinite(+lat) && Number.isFinite(+lon)) cfg.city = { name: String(n || '').slice(0, 40), lat: +lat, lon: +lon, tz: 330 }; }
    const d = m0 ? { y: +m0[1], m: +m0[2], d: +m0[3] } : { y: n0.getUTCFullYear(), m: n0.getUTCMonth() + 1, d: n0.getUTCDate() };
    cache(res, 3600);
    if (q.kind === 'day') { // special-day reel: one line per event in this language
      await require('../hbtext.js').ready();
      const SC = require('../social-card.js'), { t } = require('../i18n-server.js').translator(cfg.lang), ic = { good: '✅', bad: '⚠️', fest: '🪔', info: '•' };
      const { rows } = require('../reel-cards.js').dayRows(cfg.lang, d, cfg.city);
      const M = require('../dayinfo.js').bestMuhurats(d, cfg.city), hm = ms => SC.hm(ms, cfg.city.tz), L = require('../i18n-server.js').translator(cfg.lang).L;
      const muh = M.list.map(m => { const lab = m.kind === 'puja' ? t('sc.dy.pujaWin') + ' (' + SC.festName(cfg.lang, m.fest) + ')' : m.kind === 'sthir' ? t('sc.dy.sthir') : m.kind === 'moonrise' ? t('sc.dy.moonrise') : m.kind === 'chogh' ? t('sc.dy.chogh', { n: (L('names.chogh') || {})[m.name] || m.name }) : t('pp.abhijit'); return '🕉️ ' + lab + ' — ' + hm(m.start) + (m.end ? '–' + hm(m.end) : ''); });
      return res.status(200).json({ title: '📅 ' + t('sc.dy.caption', { d: SC.dateFmt(cfg.lang, Date.UTC(d.y, d.m - 1, d.d)) }), lines: rows.map(r => ic[r.tone] + ' ' + r.label + (r.sub ? ' — ' + r.sub : '')), muh, hasFest: M.hasFest, tags: t('soc.tags') });
    }
    if (q.kind === 'channel') return res.status(200).json({ text: SPo.channel(cfg, d) });
    if (q.kind && q.kind.startsWith('yt_')) {
      const YT = require('../yt-shorts.js');
      const lang = (q.lang === 'all' || LANGS.has(q.lang)) ? q.lang : 'en';
      if (q.kind === 'yt_sign') return res.status(200).json(YT.signShort(Math.min(11, Math.max(0, +q.sign || 0)), lang, d));
      if (q.kind === 'yt_transit') return res.status(200).json(YT.transitShort(q.planet || 'Saturn', lang, d));
      if (q.kind === 'yt_match') return res.status(200).json(YT.matchShort(+q.bSign || 0, +q.gSign || 4, lang));
      if (q.kind === 'yt_gem') return res.status(200).json(YT.gemShort(Math.min(11, Math.max(0, +q.sign || 0)), lang));
      if (q.kind === 'yt_muhurta') return res.status(200).json(YT.muhurtaShort(q.purpose || 'marriage', lang, d, cfg.city));
      if (q.kind === 'yt_prashna') return res.status(200).json(YT.prashnaShort(q.topic || 'career', lang, d));
      if (q.kind === 'yt_vrat') return res.status(200).json(YT.vratShort(q.vrat || 'ekadashi', lang, d, cfg.city));
      if (q.kind === 'yt_names') return res.status(200).json(YT.namesShort(Math.min(11, Math.max(0, +q.sign || 0)), lang));
      if (q.kind === 'yt_dream') return res.status(200).json(YT.dreamShort(q.dream || 'snake', lang));
      if (q.kind === 'yt_dasha') return res.status(200).json(YT.dashaShort(q.planet || 'Rahu', lang));
      if (q.kind === 'yt_day') return res.status(200).json(YT.dayShort(d, lang, cfg.city));
      if (q.kind === 'yt_rashifal') return res.status(200).json(YT.rashifalShort(d, lang));
      if (q.kind === 'yt_panchang') return res.status(200).json(YT.panchangShort(d, lang, cfg.city));
      if (q.kind === 'yt_week') return res.status(200).json(YT.weekShort(d, lang));
      if (q.kind === 'yt_fest') return res.status(200).json(YT.festShort(d, lang, cfg.city));
      if (q.kind === 'yt_wish') return res.status(200).json(YT.wishShort(q.fest || 'diwali', lang, d, cfg.city));
      if (q.kind === 'yt_nuall') return res.status(200).json(YT.nuallShort(+q.y || d.y, lang));
      if (q.kind === 'yt_numonth') return res.status(200).json(YT.numonthShort(`${+q.y || d.y}-${+q.m || d.m}`, lang));
      if (q.kind === 'yt_mulank') return res.status(200).json(YT.mulankShort(Math.min(9, Math.max(1, +q.n || 1)), +q.y || d.y, lang));
      if (q.kind === 'yt_bhagyank') return res.status(200).json(YT.bhagyankShort(Math.min(9, Math.max(1, +q.n || 1)), +q.y || d.y, lang));
    }
    if (q.kind === 'nu' || q.kind === 'reply') { // numerology reels: combined caption, or a reply to a comment with a date of birth
      const NS = require('../nu-social.js'), y = +q.y >= 1900 && +q.y <= 2100 ? +q.y : d.y;
      if (q.kind === 'reply') { const r = NS.reply(q.dob, cfg.lang, y); return r ? res.status(200).json(r) : res.status(400).json({ error: 'bad date' }); }
      return res.status(200).json({ caption: q.mode === 'month' ? NS.captionMonth(y, Math.min(12, Math.max(1, +q.m || 1))) : q.mode === 'bhagyank' ? NS.captionBhagyank(Math.min(9, Math.max(1, +q.n || 1)), y) : q.mode === 'one' ? NS.captionOne(Math.min(9, Math.max(1, +q.n || 1)), y) : NS.captionAll(y) });
    }
    if (q.kind === 'notice') { // upcoming events in the next 2 days (today .. today+2) for admin reel notice
      const SC = require('../social-card.js'), P = require('../panchang.js'), a = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`, end = SC.addDays(d, 2), z = `${end.y}-${String(end.m).padStart(2, '0')}-${String(end.d).padStart(2, '0')}`;
      let ev = []; for (const y of new Set([d.y, end.y])) ev = ev.concat(P.calendar({ year: y, lat: cfg.city.lat, lon: cfg.city.lon, tzMinutes: cfg.city.tz }).filter(e => e.date >= a && e.date <= z));
      const seen = new Set(); ev = ev.filter(e => !seen.has(e.id + e.date) && seen.add(e.id + e.date)).sort((x, y) => x.date < y.date ? -1 : 1);
      const topicFor = e => /ekadashi/i.test(e.id) ? 'ekadashi' : /purnima|amavasya/i.test(e.id) ? 'purnima-amavasya' : /grahan|eclipse/i.test(e.id) ? 'grahan' : /panchak/i.test(e.id) ? 'panchak' : e.kind === 'festival' ? 'special-day' : 'puja-vrat';
      const W = require('../wishes.js').WISHES;
      return res.status(200).json({ list: ev.map(e => ({ id: e.id, date: e.date, kind: e.kind, name: SC.festName(cfg.lang, e).split('(')[0].trim(), topic: topicFor(e), wish: !!W[e.id] })) });
    }
    if (q.kind === 'wishlist') { // festivals in the next 120 days, for the wishes reel
      const SC = require('../social-card.js'), P = require('../panchang.js'), a = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`, end = SC.addDays(d, 120), z = `${end.y}-${String(end.m).padStart(2, '0')}-${String(end.d).padStart(2, '0')}`;
      let ev = []; for (const y of new Set([d.y, end.y])) ev = ev.concat(P.calendar({ year: y, lat: cfg.city.lat, lon: cfg.city.lon, tzMinutes: cfg.city.tz }).filter(e => (e.kind === 'festival' || e.id === 'makarSankranti') && e.date >= a && e.date <= z));
      const seen = new Set(); ev = ev.filter(e => !seen.has(e.id + e.date) && seen.add(e.id + e.date)).sort((x, y) => x.date < y.date ? -1 : 1);
      return res.status(200).json({ list: ev.map(e => ({ id: e.id, date: e.date, name: SC.festName(cfg.lang, e).split('(')[0].trim(), known: !!require('../wishes.js').WISHES[e.id] })) });
    }
    if (q.kind === 'wish') { // greeting reel: the greeting, blessing, puja muhurat and event hashtags in this language
      await require('../hbtext.js').ready();
      const SC = require('../social-card.js'), { t, L } = require('../i18n-server.js').translator(cfg.lang), fid = /^[A-Za-z]{2,30}$/.test(q.fest || '') ? q.fest : 'diwali';
      const ev = require('../dayinfo.js').dayInfo(d, cfg.city).events.find(e => e.e && e.e.id === fid), hm = ms => SC.hm(ms, cfg.city.tz);
      const w = require('../wishes.js').wish(fid, cfg.lang, ev ? SC.festName(cfg.lang, ev.e) : t('fest.' + fid));
      const M = require('../dayinfo.js').bestMuhurats(d, cfg.city).list.filter(m => (m.kind === 'puja' || m.kind === 'sthir' || m.kind === 'moonrise') && (!m.fest || m.fest.id === fid)).slice(0, 2);
      const muh = M.map(m => (m.kind === 'puja' ? (t('sc.dy.puja_' + m.win) === 'sc.dy.puja_' + m.win ? t('sc.dy.pujaWin') : t('sc.dy.puja_' + m.win)) : m.kind === 'sthir' ? t('sc.dy.sthir') : t('sc.dy.moonrise')) + ': ' + hm(m.start) + (m.end ? '–' + hm(m.end) : ''));
      return res.status(200).json({ greet: w.greet, bless: w.bless, muh, tags: w.tags, city: cfg.city.name, onDay: !!ev });
    }
    if (q.kind === 'week' || q.kind === 'fest') { // weekly / festival reels: a title line and the details in this language
      const SC = require('../social-card.js'), { t, L } = require('../i18n-server.js').translator(cfg.lang), rn = i => L('names.rashi')[i];
      if (q.kind === 'week') {
        const wk = SC.weekData(d), top = Math.max(...wk.signs.map(x => x.stars)), best = wk.signs.filter(x => x.stars === top).map(x => rn(x.sign) + ' ' + '★'.repeat(x.stars));
        return res.status(200).json({ title: '✨ ' + t('soc.weekTitle', { r: SC.rangeFmt(cfg.lang, wk.days[0], wk.days[6]) }), lines: ['🌟 ' + t('soc.weekTop', { x: best.join(', ') })], tags: t('soc.tags') });
      }
      const ev = SC.festData(d, cfg.city), loc = L('meta.locale') || 'en-IN', f = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'UTC' });
      return res.status(200).json({ title: '🪔 ' + t('soc.festTitle', { r: SC.rangeFmt(cfg.lang, d, SC.addDays(d, 13)) }), lines: ev.map(e => { const [y, m, dd] = e.date.split('-').map(Number); return (e.kind === 'festival' ? '✨ ' : '• ') + f.format(Date.UTC(y, m - 1, dd)) + ' — ' + SC.festName(cfg.lang, e); }), tags: t('soc.tags') });
    }
    return res.status(200).json({ caption: SPo.caption(cfg, d, false) });
  }
  const kind = [
    'numonth', 'numonth2', 'mulank', 'mulank2', 'bhagyank', 'bhagyank2', 'nuall', 'nucta', 'wish', 'panchang', 'rashifal', 'outro', 'week', 'fest', 'rashifal2', 'panchang2', 'week2', 'fest2', 'day', 'day2', 'day3',
    'sign', 'sign2', 'transit', 'transit2', 'match', 'match2', 'gem', 'gem2',
    'muhurta', 'muhurta2', 'prashna', 'prashna2', 'vrat', 'vrat2', 'names', 'names2', 'dream', 'dream2', 'dasha', 'dasha2'
  ].includes(q.img) && (q.theme === 'modern' || !/^(day|wish|mulank|bhagyank|nu|sign|transit|match|gem|muhurta|prashna|vrat|names|dream|dasha)/.test(q.img)) ? q.img : null;
  if (!kind) return res.status(400).json({ error: 'Use img=rashifal or img=panchang' });
  const fmt = q.fmt === 'story' ? 'story' : 'post', lang = LANGS.has(q.lang) ? q.lang : 'en';
  const now = new Date(Date.now() + 330 * 60000), m = String(q.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = m ? { y: +m[1], m: +m[2], d: +m[3] } : { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
  if (date.y < 1900 || date.y > 2100 || date.m < 1 || date.m > 12 || date.d < 1 || date.d > 31) return res.status(400).json({ error: 'Bad date' });
  let city = { name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 330 };
  if (q.city) {
    const [n, lat, lon, tz] = String(q.city).split('|');
    if (!Number.isFinite(+lat) || !Number.isFinite(+lon) || Math.abs(+lat) > 70 || Math.abs(+lon) > 180) return res.status(400).json({ error: 'Bad city' });
    city = { name: String(n || '').slice(0, 40), lat: +lat, lon: +lon, tz: Number.isFinite(+tz) && Math.abs(+tz) <= 840 ? Math.round(+tz) : 330 };
  }
  try {
    if (q.theme === 'modern') { // reel cards: clean modern look, with the reveal bands in X-Bands
      const r = await require('../reel-cards.js').reelCard(kind, {
        lang, date, city,
        part: q.part === 'base' ? 'base' : 'full',
        fest: /^[A-Za-z]{2,30}$/.test(q.fest || '') ? q.fest : undefined,
        n: Math.min(9, Math.max(1, +q.n || 1)),
        y: +q.y >= 1900 && +q.y <= 2100 ? +q.y : undefined,
        m: +q.m >= 1 && +q.m <= 12 ? +q.m : undefined,
        sign: Math.min(11, Math.max(0, +q.sign || 0)),
        planet: ['Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus'].includes(q.planet) ? q.planet : 'Saturn',
        bSign: Math.min(11, Math.max(0, +q.bSign || 0)),
        gSign: Math.min(11, Math.max(0, +q.gSign || 0)),
        purpose: /^[a-z_]{2,20}$/.test(q.purpose || '') ? q.purpose : 'marriage',
        topic: /^[a-z_]{2,20}$/.test(q.topic || '') ? q.topic : 'career',
        vrat: /^[a-z_]{2,20}$/.test(q.vrat || '') ? q.vrat : 'ekadashi',
        dream: /^[a-z_]{2,20}$/.test(q.dream || '') ? q.dream : 'snake'
      });
      cache(res, 86400);
      res.setHeader('Content-Type', 'image/png'); res.setHeader('X-Bands', JSON.stringify(r.bands)); res.setHeader('Content-Length', r.buf.length);
      return res.status(200).end(r.buf);
    }
    const type = q.type === 'jpg' ? 'jpg' : 'png';
    const r = await require('../social-card.js').card(kind, { lang, date, fmt, city, type }), buf = r[type];
    cache(res, 86400);
    res.setHeader('Content-Type', type === 'jpg' ? 'image/jpeg' : 'image/png');
    res.setHeader('Content-Length', buf.length);
    return res.status(200).end(buf);
  } catch (e) {
    console.error('social card', e);
    return res.status(500).json({ error: 'Could not draw the card' });
  }
};
