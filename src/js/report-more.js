/* More members' report sections: Varshaphal (annual chart), personal transit timeline, KP tables, Lal Kitab,
   and the shareable chart card image. Loaded after report.js and report-plus.js. */

// ---------- Varshaphal ----------
function miniChart(lagnaSign, planets, title, sub) {
  const bySign = Array.from({ length: 12 }, () => []);
  planets.forEach(p => bySign[p.sign].push({ t: ga(p.name), c: COL[p.name], r: p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' }));
  return drawChart({ asc: lagnaSign, bySign, title, sub });
}
function varshaBody(v, tz) {
  if (!v) return `<p class="empty">${esc(t('vp.none'))}</p>`;
  const now = Date.now(), cur = v.mudda.find(m => m.start <= now && now < m.end);
  const yl = v.yearLord, mu = v.muntha;
  const muTone = mu.quality === 'good' ? 'good' : mu.quality === 'bad' ? 'bad' : 'warn';
  const facts = [
    [t('vp.lagna'), `${rg(v.lagna.sign, 'rg sm')}${esc(rn(v.lagna.sign))}`],
    [t('vp.muntha'), `${rg(mu.sign, 'rg sm')}${esc(rn(mu.sign))} · ${esc(t('res.house', { h: mu.house }))}`],
    [t('vp.yearLord'), `${g(yl.planet, 'gimg sm')}${esc(gn(yl.planet))}`],
    [t('vp.age'), esc(t('vp.ageN', { n: v.age + 1 }))]
  ].map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${val}</dd></div>`).join('');
  const summary = [
    t('vp.lagnaText', { r: { r: v.lagna.sign }, g: { g: SIGN_LORD[v.lagna.sign] } }),
    t('vp.mh.' + mu.house),
    t('vp.yl.' + yl.planet) + ' ' + t(yl.strong ? 'vp.ylStrong' : 'vp.ylWeak', { g: { g: yl.planet }, h: yl.house })
  ];
  const mudda = v.mudda.map(m => `<li class="${m === cur ? 'now' : m.end < now ? 'past' : ''}">${g(m.lord, 'gimg sm')}<b>${esc(gn(m.lord))}</b><span class="num">${fDate(m.start, tz)} → ${fDate(m.end, tz)}</span>${m === cur ? `<span class="tag gold">${esc(t('sec.dasha.now'))}</span>` : ''}</li>`).join('');
  return `<div class="vp-grid"><div class="card chart vp-chart">${miniChart(v.lagna.sign, v.planets, t('vp.chartT', { y: v.year }), t('vp.chartS'))}</div>
    <div class="card vp-main reveal"><span class="eyebrow">${esc(t('vp.range', { a: fDate(v.returnMs, tz), b: fDate(v.nextReturnMs, tz) }))}</span>
      <h3>${esc(t('vp.yearH', { y: v.year, z: v.year + 1 }))}</h3>
      <dl class="vp-facts">${facts}</dl>
      <p class="vp-mq"><span class="tag ${muTone}">${esc(t('vp.mq.' + mu.quality))}</span></p>
      ${summary.map(s => `<p>${esc(s)}</p>`).join('')}
      <p class="muted small">${esc(t('vp.returnAt', { d: fDate(v.returnMs, tz), t: fTime(v.returnMs, tz) }))}</p></div></div>
    <div class="card vp-mudda reveal"><h3>${esc(t('vp.muddaH'))}</h3><p class="muted small">${esc(t('vp.muddaLede'))}</p><ol class="when-list">${mudda}</ol></div>`;
}
function varshaHtml(v, tz) {
  const y = v ? v.year : new Date().getUTCFullYear();
  return `<div class="vp-nav no-print"><button type="button" class="btn-line" data-vp="${y - 1}" aria-label="${esc(t('vp.prev'))}">‹ ${y - 1}</button><b id="vp-year">${y}</b><button type="button" class="btn-line" data-vp="${y + 1}" aria-label="${esc(t('vp.next'))}">${y + 1} ›</button></div><div id="vpbox">${varshaBody(v, tz)}</div>`;
}
function wireVarsha(input, tz) {
  const sec = $('#varsha'); if (!sec) return;
  sec.addEventListener('click', async e => {
    const b = e.target.closest('[data-vp]'); if (!b) return;
    const y = +b.dataset.vp; if (y < input.year) return;
    const box = $('#vpbox'); box.innerHTML = '<div class="card" style="padding:30px;text-align:center"><span class="spin"></span></div>';
    try {
      const v = await api('/api/varshaphal/', { method: 'POST', body: JSON.stringify({ ...input, year: y }) });
      sec.querySelector('.vp-nav').outerHTML = varshaHtml(v, tz).match(/^<div class="vp-nav[\s\S]*?<\/div>/)[0];
      box.innerHTML = varshaBody(v, tz); observeReveals();
    } catch (err) { box.innerHTML = `<p class="err">${esc(err.status === 401 ? t('members.lockText') : t('err.server'))}</p>`; }
  });
}

// ---------- Personal transit timeline ----------
const TL_PL = ['Saturn', 'Jupiter', 'Rahu'];
function transitItem(e, tz) {
  const now = e.current;
  const title = now ? t('tl.now', { g: { g: e.planet }, r: { r: e.sign } }) : t(e.retro ? 'tl.back' : 'events.ingress', { g: { g: e.planet }, r: { r: e.sign } });
  const parts = [t('tl.houses', { m: e.fromMoon, l: e.fromLagna, x: { k: 'names.house.' + (e.fromMoon - 1) } })];
  if (e.ketu) parts.push(t('tl.ketu', { r: { r: e.ketu.sign }, m: e.ketu.fromMoon, l: e.ketu.fromLagna }));
  if (e.phase) parts.push(t('tl.ph.' + e.phase));
  const tone = e.phase && /sade|dhaiya/.test(e.phase) ? 'bad' : e.phase === 'sadeEnds' ? 'good' : e.good ? 'good' : '';
  return `<li class="${tone}${now ? ' cur' : ''}" data-pl="${e.planet}"><span class="when">${esc(now ? t('tl.today') : fDate(e.at, tz))}</span><span class="dot">${g(e.planet)}</span><div><b>${esc(title)}</b><p>${esc(parts.join(' '))} <span class="tag ${e.good ? 'good' : 'bad'}">${esc(t(e.good ? 'sec.gochar.fav' : 'sec.gochar.unfav'))}</span></p></div></li>`;
}
function transitsHtml(list, tz) {
  return `<div class="seg tl-filter no-print" role="group">${['all', ...TL_PL].map((p, i) => `<button type="button" data-tl="${p}" aria-pressed="${i === 0}">${p === 'all' ? esc(t('sec.yogas.all')) : esc(gn(p)) + (p === 'Rahu' ? ' · ' + esc(gn('Ketu')) : '')}</button>`).join('')}</div>
    <ol class="timeline tl-list">${list.map(e => transitItem(e, tz)).join('')}</ol><p class="muted small">${esc(t('tl.note'))}</p>`;
}
function wireTransits() {
  $$('.tl-filter button').forEach(b => b.addEventListener('click', () => {
    $$('.tl-filter button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('.tl-list li').forEach(li => { li.hidden = b.dataset.tl !== 'all' && li.dataset.pl !== b.dataset.tl; });
  }));
}

// ---------- KP ----------
function kpHtml(kp) {
  const pos = lon => `${rg(Math.floor(lon / 30), 'rg sm')}${dm(lon % 30)}`;
  const L3 = x => `<td>${esc(ga(x.sign))}</td><td>${esc(ga(x.star))}</td><td><b>${esc(ga(x.sub))}</b></td>`;
  const cusps = kp.cusps.map(c => `<tr><td class="num">${c.house}</td><td>${pos(c.lon)}</td>${L3(c)}</tr>`).join('');
  const pls = kp.planets.map(p => `<tr><td>${g(p.name, 'gimg sm')}${esc(gn(p.name))}${p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' ? ' <small>R</small>' : ''}</td><td>${pos(p.lon)}</td><td class="num">${p.house}</td>${L3(p)}</tr>`).join('');
  const lst = a => a.length ? a.map(n => esc(ga(n))).join(' ') : '—';
  const sig = kp.cusps.map(c => `<tr><td class="num">${c.house}</td><td>${lst(c.A)}</td><td>${lst(c.B)}</td><td>${lst(c.C)}</td><td>${lst(c.D)}</td></tr>`).join('');
  const sp = kp.signifies.map(s => `<span class="tag">${g(s.name, 'gimg sm')}${esc(gn(s.name))}: ${s.houses.join(', ')}</span>`).join(' ');
  const head = cols => `<thead><tr>${cols.map(c => `<th>${esc(t(c))}</th>`).join('')}</tr></thead>`;
  return `<div class="kp-grid"><div class="card tbl-card reveal"><h3 class="tbl-h">${esc(t('kp.cuspsH'))}</h3><table class="mini">${head(['kp.cusp', 'kp.pos', 'kp.signL', 'kp.starL', 'kp.subL'])}<tbody>${cusps}</tbody></table></div>
    <div class="card tbl-card reveal"><h3 class="tbl-h">${esc(t('kp.planetsH'))}</h3><table class="mini">${head(['sec.ashtaka.graha', 'kp.pos', 'kp.house', 'kp.signL', 'kp.starL', 'kp.subL'])}<tbody>${pls}</tbody></table></div></div>
    <details class="card tbl-card reveal kp-sig"><summary>${esc(t('kp.sigH'))}</summary><p class="muted small" style="padding:0 14px">${esc(t('kp.sigLede'))}</p><table class="mini">${head(['kp.house', 'kp.A', 'kp.B', 'kp.C', 'kp.D'])}<tbody>${sig}</tbody></table>
      <p class="kp-sp">${sp}</p></details>
    <p class="muted small">${esc(t('kp.note', { a: dms(kp.ayanamsa) }))}</p>`;
}

// ---------- Lal Kitab ----------
function lalKitabHtml(lk) {
  if (!lk) return '';
  const ST = { high: 'good', pakka: 'gold', low: 'bad', neutral: '' };
  const chips = lk.planets.map(p => `<span class="tag ${p.troubled && p.status !== 'low' ? 'warn' : ST[p.status]}">${g(p.name, 'gimg sm')}${esc(gn(p.name))} · ${esc(t('res.house', { h: p.house }))}${p.status !== 'neutral' ? ' · ' + esc(t('lk.st.' + p.status)) : ''}</span>`).join(' ');
  const cards = lk.remedies.map(n => {
    const p = lk.planets.find(x => x.name === n), why = [];
    if (p.status === 'low') why.push(t('lk.whyLow', { g: { g: n }, h: p.house }));
    if (p.enemies.length) why.push(t('lk.whyWith', { g: { g: n }, list: { list: p.enemies.map(x => ({ g: x })) } }));
    const steps = t('lk.r.' + n);
    return `<article class="card rem lk reveal" style="--gc:${COL[n]}"><div class="rh">${g(n)}<div><h3>${esc(gn(n))}</h3><small>${esc(t('res.house', { h: p.house }))}</small></div></div>
      <ul class="why">${why.map(w => `<li>${ic('i-alert')}${esc(w)}</li>`).join('')}</ul><ol class="lk-steps">${(Array.isArray(steps) ? steps : []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      ${session ? `<div class="rem-act no-print"><button type="button" class="btn-line" data-lk-start="${n}">${ic('i-check')}${esc(t('lk.start43'))}</button></div>` : ''}</article>`;
  }).join('');
  return `<div class="lk-wrap"><h3 class="sub-h">${esc(t('lk.title'))}</h3><p class="lede">${esc(t('lk.lede'))}</p>
    <div class="card lk-map reveal"><p class="meta">${chips}</p></div>
    ${cards ? `<div class="rem-grid">${cards}</div>` : `<p class="empty">${esc(t('lk.none'))}</p>`}
    <div class="card lk-rules reveal"><h4>${ic('i-info')}${esc(t('lk.rulesH'))}</h4><ul>${(t('lk.rules') || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul></div></div>`;
}
function wireLalKitab(input) {
  $$('[data-lk-start]').forEach(b => b.onclick = () => {
    const n = b.dataset.lkStart, steps = t('lk.r.' + n);
    sdStartModal({ planet: n, kind: 'custom', birth_key: birthKeyOf(input), person: input.name || '', title: t('lk.sdTitle', { g: { g: n }, x: Array.isArray(steps) ? steps[0] : '' }), days: 43 }, () => mountSadhana(input));
  });
}

// ---------- Chart card image (for WhatsApp / Instagram) ----------
function wrapText(ctx, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let cur = '';
  for (const w of words) { const s = cur ? cur + ' ' + w : w; if (ctx.measureText(s).width > maxW && cur) { lines.push(cur); cur = w; } else cur = s; }
  if (cur) lines.push(cur);
  return lines;
}
function chartCardCanvas(data) {
  const { input, chart: c } = data, W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), F = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#16173B'); bg.addColorStop(1, '#2A2E7C');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  // starfield
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(247,231,184,${(0.15 + rnd() * 0.5).toFixed(2)})`; x.beginPath(); x.arc(rnd() * W, rnd() * H, rnd() * 2 + 0.4, 0, 7); x.fill(); }
  x.textAlign = 'center'; x.fillStyle = '#F7E7B8';
  x.font = `600 34px ${F}`; x.fillText(t('brand.name'), W / 2, 92);
  x.fillStyle = '#FFFFFF'; x.font = `700 58px ${F}`; x.fillText(input.name || t('res.defaultName'), W / 2, 170);
  x.fillStyle = 'rgba(255,255,255,.75)'; x.font = `400 30px ${F}`;
  x.fillText(`${longDateFmt.format(new Date(Date.UTC(input.year, input.month - 1, input.day)))} · ${pad(input.hour)}:${pad(input.minute)}`, W / 2, 222);
  if (input.placeLabel) x.fillText(input.placeLabel.split(',').slice(0, 2).join(','), W / 2, 262);
  // North Indian chart
  const S = 640, ox = (W - S) / 2, oy = 310, k = S / 400, P = (px, py) => [ox + px * k, oy + py * k];
  x.fillStyle = '#FFFDF7'; x.beginPath(); x.roundRect ? x.roundRect(ox - 16, oy - 16, S + 32, S + 32, 28) : x.rect(ox - 16, oy - 16, S + 32, S + 32); x.fill();
  x.fillStyle = 'rgba(232,184,74,.22)'; x.beginPath(); [[200, 0], [300, 100], [200, 200], [100, 100]].forEach(([a, b], i) => { const [px, py] = P(a, b); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.fill();
  x.strokeStyle = '#B8862B'; x.lineWidth = 3;
  x.strokeRect(ox, oy, S, S);
  const line = (a, b, c2, d) => { x.beginPath(); x.moveTo(...P(a, b)); x.lineTo(...P(c2, d)); x.stroke(); };
  line(0, 0, 400, 400); line(400, 0, 0, 400); line(200, 0, 400, 200); line(400, 200, 200, 400); line(200, 400, 0, 200); line(0, 200, 200, 0);
  const bySign = Array.from({ length: 12 }, () => []);
  c.planets.forEach(p => bySign[p.sign].push(p));
  for (let h = 1; h <= 12; h++) {
    const sign = (c.lagna.sign + h - 1) % 12, [[lx, ly], [nx, ny]] = NORTH[h];
    x.fillStyle = '#9A7B3C'; x.font = `600 22px ${F}`; x.fillText(String(sign + 1), ...P(nx, ny + 6));
    const items = (h === 1 ? [{ t: t('sec.charts.asc'), c: '#B8862B' }] : []).concat(bySign[sign].map(p => ({ t: ga(p.name) + (p.retro && p.name !== 'Rahu' && p.name !== 'Ketu' ? 'ᴿ' : ''), c: COL[p.name] })));
    const cols = items.length > 3 ? 2 : 1, rows = Math.ceil(items.length / cols), lh = 34, cw = 74;
    items.forEach((it, i) => {
      const cc = cols > 1 ? i % cols : 0, r = cols > 1 ? Math.floor(i / cols) : i;
      const [px, py] = P(lx, ly); x.fillStyle = it.c; x.font = `700 28px ${F}`;
      x.fillText(it.t, px + (cc - (cols - 1) / 2) * cw, py - (rows - 1) * lh / 2 + r * lh + 10);
    });
  }
  // Key facts
  const moon = c.planets.find(p => p.name === 'Moon'), now = Date.now();
  const md = c.dashas.find(m => m.start <= now && now < m.end), ad = md && md.sub.find(a => a.start <= now && now < a.end);
  const facts = [[t('res.lagna'), rn(c.lagna.sign)], [t('res.moonSign'), rn(moon.sign)], [t('sec.pan.nakshatra'), nk(moon.nak) + ' ' + moon.pada], [t('res.dasha'), md ? gn(md.lord) + (ad ? ' / ' + gn(ad.lord) : '') : '—']];
  const fy = oy + S + 70, colW = W / 4;
  facts.forEach(([k2, v], i) => {
    const cx = colW * i + colW / 2;
    x.fillStyle = 'rgba(247,231,184,.8)'; x.font = `500 24px ${F}`; x.fillText(k2, cx, fy);
    x.fillStyle = '#FFFFFF'; x.font = `700 30px ${F}`;
    wrapText(x, v, colW - 20).slice(0, 2).forEach((ln, j) => x.fillText(ln, cx, fy + 44 + j * 36));
  });
  x.fillStyle = 'rgba(255,255,255,.6)'; x.font = `400 24px ${F}`; x.fillText(t('cc.footer', { s: SITE_ORIGIN.replace(/^https?:\/\//, '') }), W / 2, H - 50);
  return cv;
}
async function shareChartCard(data) {
  const name = 'grahavani-' + String(data.input.name || 'kundali').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') + '.png';
  let cv;
  try { cv = chartCardCanvas(data); } catch (e) { toast(t('err.server')); return; }
  const text = t('cc.text', { n: data.input.name || t('res.defaultName') });
  if (APP && APP.shareImage) { await APP.shareImage(cv.toDataURL('image/png'), name, text); return; }
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const file = blob && typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  // Fallback: show the image with a download link
  const url = URL.createObjectURL(blob);
  openModal(`<h2>${esc(t('cc.title'))}</h2><img src="${url}" alt="" style="width:100%;border-radius:14px;margin:8px 0 14px"><a class="btn-cta" href="${url}" download="${name}">${ic('i-download')}${esc(t('cc.download'))}</a><p class="muted small" style="margin-top:10px">${esc(t('cc.hint'))}</p>`);
}

// Called from renderFull once the report is on the page
function wireReportMore(data) {
  const { input, premium } = data, tz = input.tzMinutes;
  const cb = $('#act-card'); if (cb) cb.addEventListener('click', () => shareChartCard(data));
  if (!premium) return;
  wireVarsha(input, tz); wireTransits();
  if (session) wireLalKitab(input);
}
