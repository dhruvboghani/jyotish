/* Nadi life timeline (Bhrigu Nandi Nadi rules): year by year from birth to 20 years ahead.
   Each year, transiting Jupiter (growth, the person) and Saturn (karma, work) "activate" the natal planets in the same
   sign, the 5th, 7th or 9th sign from them. Adds Bhrigu Bindu (Rahu–Moon midpoint), Jupiter/Saturn returns, Sade Sati
   and the running Vimshottari dasha, plus a past-event check that tests the chart against the person's own life.
   Uses window.Jyotish (lib/engine.js) for the transits; nothing is sent to the server. */
const ND_PL = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const ND_REL = { 1: 'conj', 5: 'trine', 9: 'trine', 7: 'opp' };
// Life events and the planets / houses that signify them (karakas and house lords, BNN + Parashari)
const ND_EVENTS = {
  marriage: { k: ['Venus', 'Mars', 'Jupiter'], h: [7] }, career: { k: ['Saturn', 'Sun', 'Mercury'], h: [10] }, child: { k: ['Jupiter'], h: [5] },
  property: { k: ['Mars', 'Moon', 'Venus'], h: [4] }, education: { k: ['Mercury', 'Jupiter'], h: [4, 5] }, abroad: { k: ['Rahu', 'Ketu', 'Moon'], h: [12, 9] },
  money: { k: ['Jupiter', 'Venus', 'Mercury'], h: [2, 11] }, health: { k: ['Saturn', 'Sun', 'Mars'], h: [6, 8] }, loss: { k: ['Saturn', 'Ketu', 'Rahu'], h: [8, 12] }
};
const ndYearCache = new Map();
const ndP = c => c.P || (c.P = Object.fromEntries(c.planets.map(p => [p.name, p])));
function ndSigns(c) { const P = ndP(c); return Object.fromEntries(ND_PL.map(p => [p, P[p].sign])); }
// Jupiter/Saturn sign month by month for a year (12 samples, 15th of each month, 12:00 UT)
function ndTransitYear(y) {
  if (ndYearCache.has(y)) return ndYearCache.get(y);
  const J = window.Jyotish, out = { Jupiter: [], Saturn: [] };
  for (let m = 0; m < 12; m++) {
    const lon = J.transit(Date.UTC(y, m, 15, 12) / 864e5 + 2440587.5).lon;
    out.Jupiter.push(Math.floor(lon.Jupiter / 30)); out.Saturn.push(Math.floor(lon.Saturn / 30));
  }
  ndYearCache.set(y, out); return out;
}
// Sign runs inside the year: [{ sign, from: monthIndex, to: monthIndex }]
const ndRuns = arr => arr.reduce((a, s, i) => { const l = a[a.length - 1]; if (l && l.sign === s) l.to = i; else a.push({ sign: s, from: i, to: i }); return a; }, []);
// Jupiter/Saturn contacts on the natal planets (and Bhrigu Bindu) during year y; strongest contact per pair
const ND_RANK = { conj: 3, opp: 2, trine: 1 };
function ndActs(natal, bbSign, y) {
  const tr = ndTransitYear(y), acts = [];
  for (const tp of ['Jupiter', 'Saturn']) for (const run of ndRuns(tr[tp])) {
    for (const p of ND_PL) { const d = (natal[p] - run.sign + 12) % 12 + 1; if (ND_REL[d]) acts.push({ by: tp, on: p, rel: ND_REL[d], from: run.from, to: run.to }); }
    if (run.sign === bbSign) acts.push({ by: tp, on: 'BB', rel: 'conj', from: run.from, to: run.to });
  }
  const best = new Map();
  for (const a of acts) { const k = a.by + a.on, b = best.get(k); if (!b || ND_RANK[a.rel] > ND_RANK[b.rel]) best.set(k, a); }
  return [...best.values()].sort((a, b) => (a.by === b.by ? 0 : a.by === 'Jupiter' ? -1 : 1) || ND_RANK[b.rel] - ND_RANK[a.rel]);
}
// What the judge needs from a chart (works for any alternative birth time too)
function ndCtx(c) {
  const P = ndP(c), rahu = P.Rahu.lon, moon = P.Moon.lon, bb = (rahu + ((moon - rahu + 360) % 360) / 2) % 360;
  return { natal: ndSigns(c), bbLon: bb, bbSign: Math.floor(bb / 30), lordOf: h => SIGN_LORD[(c.lagna.sign + h - 1) % 12], dashas: c.dashas, lagna: c.lagna.sign };
}
// Dasha pairs running in a window [a, b)
function ndDashaIn(dashas, a, b) {
  const out = [];
  for (const md of dashas) if (md.start < b && md.end > a) for (const ad of md.sub) if (ad.start < b && ad.end > a) out.push({ md: md.lord, ad: ad.lord });
  return out;
}
// Does year y (and month m, 0-11, when known) show an event of this type?
// Significators: the main karaka plus the lords of the event's houses (so the result depends on the lagna, which is what
// makes birth-time correction possible). Transit: Jupiter for happy events (Saturn too for career and hard events),
// same sign or opposite only. Dasha: the antardasha lord must be a significator (a mahadasha alone lasts too long to time anything).
const ND_SAT = new Set(['career', 'health', 'loss']);
function ndJudge(X, type, y, m) {
  const E = ND_EVENTS[type], sig = new Set([E.k[0], ...E.h.map(X.lordOf)]);
  const tr = ndActs(X.natal, X.bbSign, y).filter(a => sig.has(a.on) && a.rel !== 'trine' && (a.by === 'Jupiter' || ND_SAT.has(type)) && (m == null || (a.from <= m && m <= a.to)));
  const win = m == null ? [Date.UTC(y, 0, 1), Date.UTC(y + 1, 0, 1)] : [Date.UTC(y, m, 1), Date.UTC(y, m + 1, 1)];
  const pairs = ndDashaIn(X.dashas, win[0], win[1]), hit = pairs.find(d => sig.has(d.ad)) || pairs.find(d => sig.has(d.md));
  const adHit = !!pairs.find(d => sig.has(d.ad));
  const da = hit ? [hit.md, hit.ad].filter(p => sig.has(p)) : [];
  const level = tr.length && adHit ? 'strong' : tr.length || adHit ? 'some' : 'weak';
  return { tr, da, md: (hit || pairs[0] || {}).md, ad: (hit || pairs[0] || {}).ad, level };
}
const ND_PTS = { strong: 2, some: 1, weak: 0 };
// Chance level: share of the person's own years (or months, when the event has a month) that come out "strong"
function ndBase(X, type, by, nowY, withMonth) {
  const k = type + (withMonth ? 'm' : 'y'); if (X.base && X.base.has(k)) return X.base.get(k);
  let n = 0, hit = 0;
  for (let y = by; y <= nowY; y++) for (const m of withMonth ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : [null]) { n++; if (ndJudge(X, type, y, m).level === 'strong') hit++; }
  const v = n ? hit / n : 0; (X.base || (X.base = new Map())).set(k, v); return v;
}
function ndCompute(c, ss) {
  const X = ndCtx(c), natal = X.natal, by = new Date(c.utMs).getUTCFullYear(), nowY = new Date().getUTCFullYear();
  const years = [];
  for (let y = by; y <= nowY + 20; y++) {
    const list = ndActs(natal, X.bbSign, y);
    const mid = Date.UTC(y, 6, 1), md = c.dashas.find(m => m.start <= mid && mid < m.end), ad = md && md.sub.find(a => a.start <= mid && mid < a.end);
    const inSS = (ss.periods || []).some(p => p.start < Date.UTC(y + 1, 0, 1) && p.end > Date.UTC(y, 0, 1));
    const flags = [];
    if (list.some(a => a.by === 'Jupiter' && a.on === 'Jupiter' && a.rel === 'conj')) flags.push('jupReturn');
    if (list.some(a => a.by === 'Saturn' && a.on === 'Saturn' && a.rel === 'conj')) flags.push('satReturn');
    if (list.some(a => a.on === 'BB')) flags.push('bb');
    if (inSS) flags.push('sadeSati');
    const jGood = list.filter(a => a.by === 'Jupiter' && a.on !== 'BB' && a.rel !== 'trine').length + list.filter(a => a.by === 'Jupiter' && a.rel === 'conj').length;
    const sHard = list.filter(a => a.by === 'Saturn' && ['Moon', 'Sun', 'Jupiter', 'Venus'].includes(a.on) && a.rel !== 'trine').length + (inSS ? 1 : 0);
    const tone = jGood >= 2 && sHard <= 1 ? 'good' : sHard >= 2 && jGood <= 1 ? 'bad' : 'mixed';
    years.push({ y, age: y - by, acts: list, md: md && md.lord, ad: ad && ad.lord, flags, tone, past: y < nowY, now: y === nowY });
  }
  return { years, natal, bbSign: X.bbSign, bbLon: X.bbLon, lordOf: X.lordOf, X };
}
const ndChip = a => `<span class="nd-chip ${a.by === 'Jupiter' ? 'j' : 's'} ${a.rel}" title="${esc(t('nd.rel.' + a.rel))}">${g(a.by, 'gimg sm')}<i>→</i>${a.on === 'BB' ? `<b>${esc(t('nd.bbShort'))}</b>` : g(a.on, 'gimg sm')}</span>`;
const ndMonths = (a, y) => { if (a.from === 0 && a.to === 11) return ''; const f = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' }); return ` (${f.format(new Date(Date.UTC(y, a.from, 1)))}–${f.format(new Date(Date.UTC(y, a.to, 1)))})`; };
const ndNowY = () => new Date().getUTCFullYear();
const ndPid = (y, a) => `${y}:${a.by}>${a.on}:${a.rel}`;
let ndTracked = new Set();
const ndTrackBtn = (y, a) => { const id = ndPid(y, a), on = ndTracked.has(id); return `<button type="button" class="nd-track${on ? ' on' : ''}" data-track="${esc(id)}" aria-pressed="${on}">${ic(on ? 'i-check' : 'i-star')}<span>${esc(t(on ? 'nd.tracking' : 'nd.track'))}</span></button>`; };
function ndYearDetail(Y, N) {
  const main = Y.acts.filter(a => a.rel !== 'trine' || a.on === 'BB'), soft = Y.acts.filter(a => a.rel === 'trine' && a.on !== 'BB');
  const lines = main.map(a => `<li class="${a.by === 'Jupiter' ? 'j' : 's'}">${ndChip(a)}<div><b>${esc(a.on === 'BB' ? t('nd.bbTitle', { g: { g: a.by } }) : t('nd.actTitle', { a: { g: a.by }, b: { g: a.on }, r: t('nd.rel.' + a.rel) }))}${esc(ndMonths(a, Y.y))}</b><p>${esc(a.on === 'BB' ? t('nd.bb.' + a.by) : t('nd.m.' + a.by + '.' + a.on))}</p>${Y.y >= ndNowY() ? ndTrackBtn(Y.y, a) : ''}</div></li>`).join('');
  const fl = Y.flags.map(f => `<p class="nd-flag nf-${f}">${esc(t('nd.flag.' + f + 'Text'))}</p>`).join('');
  return `${Y.md ? `<p class="nd-dasha">${g(Y.md, 'gimg sm')}${esc(t('nd.dashaLine', { md: { g: Y.md }, ad: { g: Y.ad } }))}</p>` : ''}${fl}<ul class="nd-acts">${lines || `<li><p class="muted">${esc(t('nd.quiet'))}</p></li>`}</ul>${soft.length ? `<div class="nd-soft"><small>${esc(t('nd.soft'))}</small>${soft.map(a => `<span title="${esc(t('nd.m.' + a.by + '.' + a.on))}">${ndChip(a)}</span>`).join('')}</div>` : ''}`;
}
function nadiHtml(c, ss, birthKey) {
  if (!window.Jyotish) return `<p class="muted">${esc(t('err.server'))}</p>`;
  const N = ndCompute(c, ss);
  const row = Y => `<li class="nd-year ${Y.tone}${Y.now ? ' now' : ''}${Y.past ? ' past' : ''}" data-y="${Y.y}">
    <button type="button" class="nd-head" aria-expanded="${Y.now}"><span class="nd-yr"><b>${Y.y}</b><small>${esc(t('nd.age', { n: Y.age }))}</small></span>
    <span class="nd-md">${Y.md ? `${g(Y.md, 'gimg sm')}<small>${esc(gn(Y.md))}–${esc(gn(Y.ad))}</small>` : ''}</span>
    <span class="nd-chips">${Y.acts.filter(a => a.rel === 'conj' || a.on === 'BB').slice(0, 4).map(ndChip).join('')}${Y.flags.filter(f => f !== 'bb').map(f => `<span class="tag ${f === 'sadeSati' ? 'bad' : 'gold'}">${esc(t('nd.flag.' + f))}</span>`).join('')}</span>
    <span class="nd-tone tag ${Y.tone === 'good' ? 'good' : Y.tone === 'bad' ? 'bad' : ''}">${esc(t('nd.tone.' + Y.tone))}</span></button>
    <div class="nd-body"${Y.now ? '' : ' hidden'}>${Y.now ? ndYearDetail(Y, N) : ''}</div></li>`;
  const evOpts = Object.keys(ND_EVENTS).map(k => `<option value="${k}">${esc(t('nd.ev.' + k))}</option>`).join('');
  const by = N.years[0].y, nowY = new Date().getUTCFullYear(), mf = new Intl.DateTimeFormat(LOCALE, { month: 'long', timeZone: 'UTC' });
  const mOpts = Array.from({ length: 12 }, (_, i) => `<option value="${i}">${esc(mf.format(new Date(Date.UTC(2000, i, 1))))}</option>`).join('');
  return `<div class="card nd-intro reveal"><p>${esc(t('nd.intro'))}</p>
      <p class="nd-bb">${g('Rahu', 'gimg sm')}<span>${esc(t('nd.bbLine', { r: { r: N.bbSign }, d: dm(N.bbLon % 30) }))}</span></p>
      <div class="nd-legend"><span class="nd-chip j conj">${g('Jupiter', 'gimg sm')}</span>${esc(t('nd.legendJ'))} <span class="nd-chip s conj">${g('Saturn', 'gimg sm')}</span>${esc(t('nd.legendS'))}</div></div>
    <div class="seg nd-filter no-print" role="group"><button type="button" data-ndf="future" aria-pressed="true">${esc(t('nd.future'))}</button><button type="button" data-ndf="past" aria-pressed="false">${esc(t('nd.past'))}</button><button type="button" data-ndf="all" aria-pressed="false">${esc(t('nd.all'))}</button></div>
    <ol class="nd-list" data-f="future">${N.years.map(row).join('')}</ol>
    <div class="card nd-check reveal" data-key="${esc(birthKey)}"><h3>${ic('i-check')}${esc(t('nd.checkH'))}</h3><p class="muted small">${esc(t('nd.checkLede'))}</p>
      <form class="nd-form" novalidate><select aria-label="${esc(t('nd.checkType'))}">${evOpts}</select><input type="number" inputmode="numeric" min="${by}" max="${nowY}" placeholder="${esc(t('nd.checkYear'))}" aria-label="${esc(t('nd.checkYear'))}"><select class="nd-mon" aria-label="${esc(t('nd.checkMonth'))}"><option value="">${esc(t('nd.anyMonth'))}</option>${mOpts}</select><button type="submit" class="btn-line">${esc(t('nd.checkAdd'))}</button></form>
      <ul class="nd-results"></ul><p class="nd-score muted small"></p>
      <div class="nd-rect"><h4>${ic('i-clock')}${esc(t('nd.rectH'))}</h4><p class="muted small">${esc(t('nd.rectLede'))}</p>
        <button type="button" class="btn-cta nd-rect-go" disabled>${esc(t('nd.rectGo'))}</button><p class="nd-rect-need muted small"></p><div class="nd-rect-out" aria-live="polite"></div></div></div>
    <div class="card nd-proof reveal"><h3>${ic('i-chart')}${esc(t('nd.proofH'))}</h3><p class="muted small">${esc(t('nd.proofLede'))}</p>
      <div class="nd-mine"></div><div class="nd-comm"><h4>${esc(t('nd.commH'))}</h4><div class="nd-comm-out muted small">…</div></div></div>
    <p class="muted small rem-note">${ic('i-info')}${esc(t('nd.note'))}</p>`;
}
// Community feedback (anonymous: event type, year, rule and outcome only, never birth details)
function ndSend(row) {
  if (typeof sb === 'undefined' || !sb) return;
  sb.rpc('submit_nadi_feedback', { p: { ...row, visitor: store.get('kg-vid') || null } }).then(() => {}, () => {});
}
const ndCid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const pct = x => Math.round(x * 100) + '%';
// Local time of a birth input shifted by off minutes
function ndShift(input, off) {
  const d = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute) + off * 6e4);
  return { ...input, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}
const ndHM = i => String(i.hour).padStart(2, '0') + ':' + String(i.minute).padStart(2, '0');

function wireNadi(c, ss, input) {
  const root = document.getElementById('nadi'); if (!root || !window.Jyotish) return;
  const N = ndCompute(c, ss), X = N.X, byY = Object.fromEntries(N.years.map(Y => [Y.y, Y])), nowY = ndNowY(), by = N.years[0].y;
  const list = root.querySelector('.nd-list');
  const box = root.querySelector('.nd-check'), bk = box.dataset.key, key = 'kg-nadi-' + bk, pkey = 'kg-nadi-pred-' + bk;
  let preds = store.get(pkey, []); ndTracked = new Set(preds.map(p => p.id));
  root.querySelectorAll('[data-ndf]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-ndf]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    list.dataset.f = b.dataset.ndf;
  }));
  list.addEventListener('click', e => {
    const tb = e.target.closest('[data-track]');
    if (tb) {
      const id = tb.dataset.track, [y, rest] = id.split(':'), [byP, onRel] = [rest.split('>')[0], id.split('>')[1]], [on, rel] = onRel.split(':');
      if (ndTracked.has(id)) preds = preds.filter(p => p.id !== id); else preds.push({ id, y: +y, by: byP, on, rel, cid: ndCid() });
      store.set(pkey, preds); ndTracked = new Set(preds.map(p => p.id));
      tb.outerHTML = ndTrackBtn(+y, { by: byP, on, rel });
      if (typeof track === 'function') track('nadi_track', { rule: byP + '>' + on + ':' + rel, y: +y });
      drawProof(); return;
    }
    const h = e.target.closest('.nd-head'); if (!h) return;
    const li = h.parentElement, body = li.querySelector('.nd-body'), open = h.getAttribute('aria-expanded') !== 'true';
    if (open && !body.innerHTML) body.innerHTML = ndYearDetail(byY[li.dataset.y], N);
    h.setAttribute('aria-expanded', String(open)); body.hidden = !open;
  });

  // ---- Past events: does the chart show them? ----
  const form = box.querySelector('form'), out = box.querySelector('.nd-results'), score = box.querySelector('.nd-score');
  const yIn = form.querySelector('input'), mIn = form.querySelector('.nd-mon');
  let evs = store.get(key, []);
  const mName = m => new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, m, 1)));
  const draw = () => {
    const rs = evs.filter(e => e.y >= by && e.y <= nowY).map(e => ({ e, r: ndJudge(X, e.type, e.y, e.m) }));
    out.innerHTML = rs.map(({ e, r }) => `<li class="${r.level}"><div class="nd-r-h"><b>${esc(t('nd.ev.' + e.type))} · ${e.m != null ? esc(mName(e.m)) + ' ' : ''}${e.y}</b><span class="tag ${r.level === 'strong' ? 'good' : r.level === 'weak' ? 'bad' : 'gold'}">${esc(t('nd.lvl.' + r.level))}</span><button type="button" class="linkbtn" data-del="${evs.indexOf(e)}" aria-label="${esc(t('nd.remove'))}">×</button></div>
      ${r.tr.slice(0, 3).map(a => `<p>${ndChip(a)} ${esc(t('nd.actTitle', { a: { g: a.by }, b: { g: a.on }, r: t('nd.rel.' + a.rel) }))}</p>`).join('')}
      ${r.da.length ? `<p>${g(r.md, 'gimg sm')} ${esc(t('nd.dashaMatch', { md: { g: r.md }, ad: { g: r.ad } }))}</p>` : ''}${!r.tr.length && !r.da.length ? `<p class="muted">${esc(t('nd.noSignal'))}</p>` : ''}</li>`).join('');
    const strong = rs.filter(x => x.r.level === 'strong').length, some = rs.filter(x => x.r.level === 'some').length;
    score.textContent = rs.length ? t('nd.score', { a: strong, s: some, b: rs.length }) + (rs.length >= 3 && (strong + some) / rs.length < 0.5 ? ' ' + t('nd.scoreLow') : '') : '';
    const go = box.querySelector('.nd-rect-go'), need = box.querySelector('.nd-rect-need');
    go.disabled = !input || rs.length < 3; need.textContent = rs.length < 3 ? t('nd.rectNeed', { n: 3 - rs.length }) : '';
    drawProof();
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const type = form.querySelector('select').value, y = +yIn.value, m = mIn.value === '' ? null : +mIn.value;
    if (!(y >= by && y <= nowY)) { yIn.focus(); return; }
    const ev = { type, y, cid: ndCid() }; if (m != null) ev.m = m;
    evs.push(ev); evs = evs.slice(-20); store.set(key, evs); yIn.value = ''; mIn.value = '';
    const r = ndJudge(X, type, y, m);
    ndSend({ cid: ev.cid, kind: 'event', event_type: type, year: y, has_month: m != null, matched: r.level, base: Math.round(ndBase(X, type, by, nowY, m != null) * 1000) / 1000 });
    if (typeof track === 'function') track('nadi_check', { type, y, m, level: r.level });
    draw();
  });
  out.addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (!d) return; evs.splice(+d.dataset.del, 1); store.set(key, evs); draw(); });

  // ---- Birth-time correction from life events ----
  const rOut = box.querySelector('.nd-rect-out');
  box.querySelector('.nd-rect-go').addEventListener('click', () => {
    const list = evs.filter(e => e.y >= by && e.y <= nowY); if (list.length < 3 || !input) return;
    const STEP = 2, SPAN = 120, offs = []; for (let o = -SPAN; o <= SPAN; o += STEP) offs.push(o);
    const res = []; let i = 0;
    rOut.innerHTML = `<div class="nd-prog"><span style="width:0%"></span></div>`;
    const bar = rOut.querySelector('.nd-prog span');
    const step = () => {
      const end = Math.min(i + 12, offs.length);
      for (; i < end; i++) {
        const inp = ndShift(input, offs[i]);
        try {
          const ch = window.Jyotish.compute(inp), Xi = ndCtx(ch);
          let s = 0, strong = 0; for (const e of list) { const lv = ndJudge(Xi, e.type, e.y, e.m).level; s += ND_PTS[lv]; if (lv === 'strong') strong++; }
          res.push({ off: offs[i], inp, s, strong, lagna: Xi.lagna, utMs: ch.utMs });
        } catch (err) { /* skip impossible times */ }
      }
      bar.style.width = Math.round(i / offs.length * 100) + '%';
      if (i < offs.length) return setTimeout(step, 0);
      showRect(res, list.length);
    };
    setTimeout(step, 0);
    if (typeof track === 'function') track('nadi_rectify', { events: list.length });
  });
  const showRect = (res, n) => {
    if (!res.length) { rOut.innerHTML = ''; return; }
    const max = Math.max(...res.map(r => r.s)), cur = res.find(r => r.off === 0) || res[Math.floor(res.length / 2)], tz = input.tzMinutes;
    // windows of consecutive times that reach the best score
    const wins = []; for (const r of res) { const l = wins[wins.length - 1]; if (r.s === max) { if (l && l.end.off === r.off - 2) l.end = r; else wins.push({ start: r, end: r }); } }
    wins.forEach(w => { w.mid = res.find(r => r.off === Math.round((w.start.off + w.end.off) / 4) * 2) || w.start; w.has = w.start.off <= 0 && 0 <= w.end.off; });
    const fit = r => Math.round(r.s / (2 * n) * 100);
    const bars = res.map(r => `<span class="${r.s === max ? 'best' : ''}${r.off === 0 ? ' cur' : ''}" style="height:${Math.max(4, Math.round(r.s / Math.max(1, max) * 100))}%" title="${esc(ndHM(r.inp))} · ${fit(r)}%"></span>`).join('');
    const wl = wins.slice(0, 4).map(w => `<li${w.has ? ' class="has"' : ''}><div><b>${esc(ndHM(w.start.inp))}${w.end !== w.start ? '–' + esc(ndHM(w.end.inp)) : ''}</b> ${rg(w.mid.lagna, 'rg sm')}<span>${esc(t('nd.rectLagna', { r: { r: w.mid.lagna } }))}</span>${w.has ? ` <span class="tag gold">${esc(t('nd.rectYours'))}</span>` : ''}</div>
      ${w.has ? '' : `<button type="button" class="btn-line" data-open-time="${w.mid.off}">${esc(t('nd.rectOpen', { t: ndHM(w.mid.inp) }))}</button>`}</li>`).join('');
    const verdict = wins.some(w => w.has) ? t('nd.rectOk') : cur.s >= max - 1 ? t('nd.rectClose') : t('nd.rectOff');
    rOut.innerHTML = `<div class="nd-rbars" role="img" aria-label="${esc(t('nd.rectChart'))}">${bars}</div>
      <div class="nd-raxis"><span>${esc(ndHM(res[0].inp))}</span><span>${esc(ndHM(input))}</span><span>${esc(ndHM(res[res.length - 1].inp))}</span></div>
      <p class="nd-rcur">${esc(t('nd.rectCur', { t: ndHM(input), p: fit(cur), b: fit(res.find(r => r.s === max)) }))}</p>
      <p><b>${esc(verdict)}</b></p><ul class="nd-rwins">${wl}</ul>
      <p class="muted small">${esc(t(wins.length > 3 || n < 5 ? 'nd.rectMore' : 'nd.rectNote'))}</p>`;
    rOut.querySelectorAll('[data-open-time]').forEach(b => b.addEventListener('click', () => {
      const r = res.find(x => x.off === +b.dataset.openTime); if (!r) return;
      const { log, lang, save, ...birth } = r.inp;
      if (typeof track === 'function') track('nadi_rectify_open', { off: r.off });
      openChart(birth, { save: false });
    }));
  };

  // ---- Proof: my scorecard and everyone's ----
  const mine = root.querySelector('.nd-mine');
  const ruleTxt = p => p.on === 'BB' ? t('nd.bbTitle', { g: { g: p.by } }) : t('nd.actTitle', { a: { g: p.by }, b: { g: p.on }, r: t('nd.rel.' + p.rel) });
  function drawProof() {
    const ev = evs.filter(e => e.y >= by && e.y <= nowY), evHit = ev.filter(e => ndJudge(X, e.type, e.y, e.m).level === 'strong').length;
    const base = ev.length ? ev.reduce((s, e) => s + ndBase(X, e.type, by, nowY, e.m != null), 0) / ev.length : 0;
    const due = preds.filter(p => p.y <= nowY), done = due.filter(p => p.outcome), yes = done.filter(p => p.outcome === 'yes').length, part = done.filter(p => p.outcome === 'partly').length;
    const pRow = p => `<li data-pid="${esc(p.id)}">${ndChip(p)}<div><b>${p.y} · ${esc(ruleTxt(p))}</b><p class="small muted">${esc(p.on === 'BB' ? t('nd.bb.' + p.by) : t('nd.m.' + p.by + '.' + p.on))}</p>
      ${p.y <= nowY ? `<div class="seg nd-out" role="group" aria-label="${esc(t('nd.didIt'))}">${['yes', 'partly', 'no'].map(o => `<button type="button" data-out="${o}" aria-pressed="${p.outcome === o}">${esc(t('nd.out.' + o))}</button>`).join('')}</div>` : `<p class="small">${esc(t('nd.askIn', { y: p.y }))}</p>`}</div><button type="button" class="linkbtn" data-untrack aria-label="${esc(t('nd.remove'))}">×</button></li>`;
    mine.innerHTML = `<div class="nd-stats">
        <div><b>${ev.length ? pct(evHit / ev.length) : '–'}</b><small>${esc(t('nd.sEvents', { n: ev.length }))}</small></div>
        <div><b>${ev.length ? pct(base) : '–'}</b><small>${esc(t('nd.sChance'))}</small></div>
        <div><b>${done.length ? pct((yes + part / 2) / done.length) : '–'}</b><small>${esc(t('nd.sPreds', { n: done.length }))}</small></div></div>
      ${preds.length ? `<ul class="nd-preds">${preds.slice().sort((a, b) => a.y - b.y).map(pRow).join('')}</ul>` : `<p class="muted small">${esc(t('nd.noTracked'))}</p>`}`;
  }
  mine.addEventListener('click', e => {
    const li = e.target.closest('[data-pid]'); if (!li) return;
    const p = preds.find(x => x.id === li.dataset.pid); if (!p) return;
    if (e.target.closest('[data-untrack]')) { preds = preds.filter(x => x !== p); ndTracked = new Set(preds.map(x => x.id)); store.set(pkey, preds); return drawProof(); }
    const o = e.target.closest('[data-out]'); if (!o) return;
    p.outcome = o.dataset.out; store.set(pkey, preds);
    ndSend({ cid: p.cid, kind: 'prediction', rule: p.by + '>' + p.on + ':' + p.rel, year: p.y, outcome: p.outcome });
    if (typeof track === 'function') track('nadi_outcome', { rule: p.by + '>' + p.on + ':' + p.rel, outcome: p.outcome });
    drawProof();
  });
  const comm = root.querySelector('.nd-comm-out');
  if (typeof sb !== 'undefined' && sb) sb.rpc('nadi_proof_stats').then(({ data, error }) => {
    if (error || !data) { comm.textContent = t('nd.commNone'); return; }
    const ev = (data.events || []).filter(r => r.n >= 5), pr = data.predictions || {};
    const rows = ev.map(r => `<tr><td>${esc(t('nd.ev.' + r.k))}</td><td class="num">${r.n}</td><td class="num"><b>${pct(r.hit)}</b></td><td class="num">${pct(r.base)}</td></tr>`).join('');
    comm.innerHTML = (data.total_events >= 5 ? `<p>${esc(t('nd.commEv', { n: data.total_events, a: pct(data.hit || 0), b: pct(data.base || 0) }))}</p>` : '')
      + (rows ? `<table class="nd-ctbl"><thead><tr><th>${esc(t('nd.checkType'))}</th><th>${esc(t('nd.cN'))}</th><th>${esc(t('nd.cHit'))}</th><th>${esc(t('nd.cBase'))}</th></tr></thead><tbody>${rows}</tbody></table>` : '')
      + (pr.n >= 5 ? `<p>${esc(t('nd.commPr', { n: pr.n, a: pct(pr.yes || 0), b: pct(pr.partly || 0) }))}</p>` : '')
      || esc(t('nd.commNone'));
  }, () => { comm.textContent = t('nd.commNone'); }); else comm.textContent = t('nd.commNone');
  draw();
}
