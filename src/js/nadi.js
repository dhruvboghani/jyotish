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
function ndCompute(c, ss) {
  const natal = ndSigns(c), birth = new Date(c.utMs), by = birth.getUTCFullYear(), nowY = new Date().getUTCFullYear();
  const P = ndP(c), rahu = P.Rahu.lon, moon = P.Moon.lon, bb = (rahu + ((moon - rahu + 360) % 360) / 2) % 360, bbSign = Math.floor(bb / 30);
  const lordOf = h => SIGN_LORD[(c.lagna.sign + h - 1) % 12];
  const years = [];
  for (let y = by; y <= nowY + 20; y++) {
    const tr = ndTransitYear(y), acts = [];
    for (const tp of ['Jupiter', 'Saturn']) for (const run of ndRuns(tr[tp])) {
      for (const p of ND_PL) { const d = (natal[p] - run.sign + 12) % 12 + 1; if (ND_REL[d]) acts.push({ by: tp, on: p, rel: ND_REL[d], from: run.from, to: run.to }); }
      if (run.sign === bbSign) acts.push({ by: tp, on: 'BB', rel: 'conj', from: run.from, to: run.to });
    }
    // keep the strongest contact per (transit planet, natal planet): conjunction > opposition > trine
    const best = new Map(), rank = { conj: 3, opp: 2, trine: 1 };
    for (const a of acts) { const k = a.by + a.on, b = best.get(k); if (!b || rank[a.rel] > rank[b.rel]) best.set(k, a); }
    const list = [...best.values()].sort((a, b) => (a.by === b.by ? 0 : a.by === 'Jupiter' ? -1 : 1) || rank[b.rel] - rank[a.rel]);
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
  return { years, natal, bbSign, bbLon: bb, lordOf };
}
const ndChip = a => `<span class="nd-chip ${a.by === 'Jupiter' ? 'j' : 's'} ${a.rel}" title="${esc(t('nd.rel.' + a.rel))}">${g(a.by, 'gimg sm')}<i>→</i>${a.on === 'BB' ? `<b>${esc(t('nd.bbShort'))}</b>` : g(a.on, 'gimg sm')}</span>`;
const ndMonths = (a, y) => { if (a.from === 0 && a.to === 11) return ''; const f = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' }); return ` (${f.format(new Date(Date.UTC(y, a.from, 1)))}–${f.format(new Date(Date.UTC(y, a.to, 1)))})`; };
function ndYearDetail(Y, N) {
  const main = Y.acts.filter(a => a.rel !== 'trine' || a.on === 'BB'), soft = Y.acts.filter(a => a.rel === 'trine' && a.on !== 'BB');
  const lines = main.map(a => `<li class="${a.by === 'Jupiter' ? 'j' : 's'}">${ndChip(a)}<div><b>${esc(a.on === 'BB' ? t('nd.bbTitle', { g: { g: a.by } }) : t('nd.actTitle', { a: { g: a.by }, b: { g: a.on }, r: t('nd.rel.' + a.rel) }))}${esc(ndMonths(a, Y.y))}</b><p>${esc(a.on === 'BB' ? t('nd.bb.' + a.by) : t('nd.m.' + a.by + '.' + a.on))}</p></div></li>`).join('');
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
  const by = N.years[0].y, nowY = new Date().getUTCFullYear();
  return `<div class="card nd-intro reveal"><p>${esc(t('nd.intro'))}</p>
      <p class="nd-bb">${g('Rahu', 'gimg sm')}<span>${esc(t('nd.bbLine', { r: { r: N.bbSign }, d: dm(N.bbLon % 30) }))}</span></p>
      <div class="nd-legend"><span class="nd-chip j conj">${g('Jupiter', 'gimg sm')}</span>${esc(t('nd.legendJ'))} <span class="nd-chip s conj">${g('Saturn', 'gimg sm')}</span>${esc(t('nd.legendS'))}</div></div>
    <div class="seg nd-filter no-print" role="group"><button type="button" data-ndf="future" aria-pressed="true">${esc(t('nd.future'))}</button><button type="button" data-ndf="past" aria-pressed="false">${esc(t('nd.past'))}</button><button type="button" data-ndf="all" aria-pressed="false">${esc(t('nd.all'))}</button></div>
    <ol class="nd-list" data-f="future">${N.years.map(row).join('')}</ol>
    <div class="card nd-check reveal" data-key="${esc(birthKey)}"><h3>${ic('i-check')}${esc(t('nd.checkH'))}</h3><p class="muted small">${esc(t('nd.checkLede'))}</p>
      <form class="nd-form" novalidate><select aria-label="${esc(t('nd.checkType'))}">${evOpts}</select><input type="number" inputmode="numeric" min="${by}" max="${nowY}" placeholder="${esc(t('nd.checkYear'))}" aria-label="${esc(t('nd.checkYear'))}"><button type="submit" class="btn-line">${esc(t('nd.checkAdd'))}</button></form>
      <ul class="nd-results"></ul><p class="nd-score muted small"></p></div>
    <p class="muted small rem-note">${ic('i-info')}${esc(t('nd.note'))}</p>`;
}
function wireNadi(c, ss) {
  const root = document.getElementById('nadi'); if (!root || !window.Jyotish) return;
  const N = ndCompute(c, ss), byY = Object.fromEntries(N.years.map(Y => [Y.y, Y]));
  const list = root.querySelector('.nd-list');
  root.querySelectorAll('[data-ndf]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-ndf]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    list.dataset.f = b.dataset.ndf;
  }));
  list.addEventListener('click', e => {
    const h = e.target.closest('.nd-head'); if (!h) return;
    const li = h.parentElement, body = li.querySelector('.nd-body'), open = h.getAttribute('aria-expanded') !== 'true';
    if (open && !body.innerHTML) body.innerHTML = ndYearDetail(byY[li.dataset.y], N);
    h.setAttribute('aria-expanded', String(open)); body.hidden = !open;
  });
  // Past events: does the chart show them?
  const box = root.querySelector('.nd-check'), key = 'kg-nadi-' + box.dataset.key, form = box.querySelector('form'), out = box.querySelector('.nd-results'), score = box.querySelector('.nd-score');
  let evs = store.get(key, []);
  const judge = (type, y) => {
    const Y = byY[y]; if (!Y) return null;
    const E = ND_EVENTS[type], sig = new Set([...E.k, ...E.h.map(N.lordOf)]);
    const tr = Y.acts.filter(a => sig.has(a.on) && a.rel !== 'trine');   // same sign or opposite only
    const da = [Y.md, Y.ad].filter(p => p && sig.has(p));
    const level = tr.length && da.length ? 'strong' : tr.length || da.length ? 'some' : 'weak';
    return { Y, tr, da, level };
  };
  const draw = () => {
    const rs = evs.map(e => ({ e, r: judge(e.type, e.y) })).filter(x => x.r);
    out.innerHTML = rs.map(({ e, r }, i) => `<li class="${r.level}"><div class="nd-r-h"><b>${esc(t('nd.ev.' + e.type))} · ${e.y}</b><span class="tag ${r.level === 'strong' ? 'good' : r.level === 'weak' ? 'bad' : 'gold'}">${esc(t('nd.lvl.' + r.level))}</span><button type="button" class="linkbtn" data-del="${i}" aria-label="${esc(t('nd.remove'))}">×</button></div>
      ${r.tr.slice(0, 3).map(a => `<p>${ndChip(a)} ${esc(t('nd.actTitle', { a: { g: a.by }, b: { g: a.on }, r: t('nd.rel.' + a.rel) }))}</p>`).join('')}
      ${r.da.length ? `<p>${g(r.Y.md, 'gimg sm')} ${esc(t('nd.dashaMatch', { md: { g: r.Y.md }, ad: { g: r.Y.ad } }))}</p>` : ''}${!r.tr.length && !r.da.length ? `<p class="muted">${esc(t('nd.noSignal'))}</p>` : ''}</li>`).join('');
    const strong = rs.filter(x => x.r.level === 'strong').length, some = rs.filter(x => x.r.level === 'some').length;
    score.textContent = rs.length ? t('nd.score', { a: strong, s: some, b: rs.length }) + (rs.length >= 3 && (strong + some) / rs.length < 0.5 ? ' ' + t('nd.scoreLow') : '') : '';
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const type = form.querySelector('select').value, y = +form.querySelector('input').value;
    if (!byY[y] || byY[y].y > new Date().getUTCFullYear()) { form.querySelector('input').focus(); return; }
    evs.push({ type, y }); evs = evs.slice(-20); store.set(key, evs); form.querySelector('input').value = '';
    if (typeof track === 'function') track('nadi_check', { type });
    draw();
  });
  out.addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (!d) return; evs.splice(+d.dataset.del, 1); store.set(key, evs); draw(); });
  draw();
}
