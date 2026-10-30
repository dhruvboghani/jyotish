/* Planned delivery (C-section) date finder: every 15-minute slot in the chosen dates and hospital hours is cast as a
   birth chart (window.Jyotish, in the browser) and scored by classical birth-muhurta rules: a strong lagna and lagna lord,
   benefics in kendras and trikonas, malefics in 3/6/11, a well-placed Moon outside Gandmool nakshatras and gandanta,
   a good tithi, no Rahu kaal or Yamaganda, no Kaal Sarp, and a benefic first dasha. Guests see the top 3 windows. */
const dlCity = cityPicker(() => { });
const DL_GANDMOOL = new Set([0, 8, 9, 17, 18, 26]);         // Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati
const DL_RAHU = [8, 2, 7, 5, 6, 4, 3], DL_YAMA = [5, 4, 3, 2, 1, 7, 6];
const DL_BEN = ['Jupiter', 'Venus', 'Mercury'], DL_MAL = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];
const DL_STEP = 15;
const dlIso = d => d.toISOString().slice(0, 10);
(() => { const t0 = new Date(Date.now() + 330 * 6e4); const a = new Date(t0.getTime() + 14 * 864e5), b = new Date(t0.getTime() + 20 * 864e5); $('#dl-from').value = dlIso(a); $('#dl-to').value = dlIso(b); })();

function dlScore(c, tz) {
  const P = Object.fromEntries(c.planets.map(p => [p.name, p])), why = [];
  let s = 50;
  const add = (pts, key, params, tone) => { s += pts; why.push({ key, params: params || {}, tone: tone || (pts > 0 ? 'good' : 'bad') }); };
  const L = c.lagna.sign, ll = J_LORD[L], llp = P[ll];
  const dig = p => p.dignity === 'Exalted' ? 2 : p.dignity === 'Own sign' ? 1.5 : p.dignity === 'Debilitated' ? -2 : 0;
  // Lagna lord
  const dl = dig(llp); if (dl > 0) add(5 * dl, 'dl.w.llStrong', { g: { g: ll } }); if (dl < 0) add(-8, 'dl.w.llWeak', { g: { g: ll } });
  if ([1, 4, 5, 7, 9, 10].includes(llp.house)) add(6, 'dl.w.llGood', { g: { g: ll }, h: llp.house });
  else if ([6, 8, 12].includes(llp.house)) add(-8, 'dl.w.llBad', { g: { g: ll }, h: llp.house });
  // Benefics and malefics by house
  const benK = DL_BEN.filter(p => [1, 4, 5, 7, 9, 10].includes(P[p].house)); if (benK.length) add(4 * benK.length, 'dl.w.benK', { list: { list: benK.map(g0 => ({ g: g0 })) } });
  if (P.Jupiter.house === 1) add(5, 'dl.w.jupLagna');
  const malUp = DL_MAL.filter(p => [3, 6, 11].includes(P[p].house)); if (malUp.length) add(2.5 * malUp.length, 'dl.w.malUp', { list: { list: malUp.map(g0 => ({ g: g0 })) } });
  const malBad = ['Saturn', 'Mars', 'Rahu', 'Ketu'].filter(p => [1, 7, 8].includes(P[p].house)); if (malBad.length) add(-5 * malBad.length, 'dl.w.malBad', { list: { list: malBad.map(g0 => ({ g: g0 })) } });
  // Moon
  const M = P.Moon, waxing = c.panchang.tithi <= 15;
  if ([6, 8, 12].includes(M.house)) add(-7, 'dl.w.moonDus', { h: M.house });
  else if ([1, 4, 5, 7, 9, 10, 11].includes(M.house)) add(4, 'dl.w.moonGood', { h: M.house });
  if (M.dignity === 'Exalted' || M.dignity === 'Own sign') add(4, 'dl.w.moonStrong');
  if (M.dignity === 'Debilitated') add(-6, 'dl.w.moonDebil');
  if (DL_GANDMOOL.has(M.nak)) add(-10, 'dl.w.gandmool', { nk: { nk: M.nak } });
  const md = M.lon % 30; if ((md > 29 || md < 1) && [3, 4, 7, 8, 11, 0].includes(M.sign)) add(-8, 'dl.w.gandanta');
  // Tithi
  const ti = c.panchang.tithi, tn = ((ti - 1) % 15) + 1;
  if (ti === 30) add(-12, 'dl.w.amavasya');
  else if ([4, 9, 14].includes(tn)) add(-6, 'dl.w.rikta');
  else if (waxing && tn >= 5) add(3, 'dl.w.waxing');
  // Kaal Sarp, Manglik from lagna
  if (c.kaalSarp) add(-8, 'dl.w.kaalSarp');
  if (c.manglik && c.manglik.lagna) add(-3, 'dl.w.manglik');
  // First dasha
  const fd = c.balance && c.balance.lord;
  if (['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(fd)) add(3, 'dl.w.dashaGood', { g: { g: fd } });
  if (['Rahu', 'Ketu', 'Saturn'].includes(fd)) add(-2, 'dl.w.dashaHard', { g: { g: fd } });
  // Rahu kaal / Yamaganda
  const rise = c.panchang.sunrise, set = c.panchang.sunset, part = (set - rise) / 8, jd = c.jd, wd = c.panchang.varaIdx;
  const inSeg = n => jd >= rise + (n - 1) * part && jd < rise + n * part;
  let blocked = null;
  if (jd >= rise && jd < set) { if (inSeg(DL_RAHU[wd])) blocked = 'rahu'; else if (inSeg(DL_YAMA[wd])) blocked = 'yama'; }
  if (blocked) add(-15, 'dl.w.' + blocked);
  return { score: Math.max(0, Math.min(100, Math.round(s))), why, blocked };
}
const J_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];

let dlLast = null;
$('#dl-form').addEventListener('submit', e => {
  e.preventDefault();
  const er = $('#dl-err'); er.textContent = '';
  const from = $('#dl-from').value, to = $('#dl-to').value, h1 = $('#dl-h1').value || '08:00', h2 = $('#dl-h2').value || '18:00';
  if (!from || !to) { er.textContent = t('err.date'); return; }
  const a = Date.UTC(...from.split('-').map((v, i) => i === 1 ? v - 1 : +v)), b = Date.UTC(...to.split('-').map((v, i) => i === 1 ? v - 1 : +v));
  const days = Math.round((b - a) / 864e5) + 1;
  if (days < 1 || days > 31) { er.textContent = t('dl.range'); return; }
  const [ha, ma] = h1.split(':').map(Number), [hb, mb] = h2.split(':').map(Number), m1 = ha * 60 + ma, m2 = hb * 60 + mb;
  if (m2 <= m1) { er.textContent = t('dl.hours'); return; }
  if (!window.Jyotish) { er.textContent = t('err.server'); return; }
  const city = dlCity.city, slots = [];
  for (let d = 0; d < days; d++) { const dt = new Date(a + d * 864e5); for (let m = m1; m <= m2; m += DL_STEP) slots.push({ y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), m }); }
  track('delivery_search', { from, to, hours: h1 + '-' + h2, city: city.name, slots: slots.length });
  const box = $('#dl-res'); box.innerHTML = `<div class="card dl-wait"><span class="spin"></span><p class="muted">${esc(t('dl.working'))}</p><div class="nd-prog"><span style="width:0%"></span></div></div>`;
  const bar = box.querySelector('.nd-prog span'), out = []; let i = 0;
  const step = () => {
    const end = Math.min(i + 40, slots.length);
    for (; i < end; i++) {
      const s = slots[i], tz = dlCity.offset(s.y, s.mo, s.d);
      try {
        const c = window.Jyotish.compute({ year: s.y, month: s.mo, day: s.d, hour: Math.floor(s.m / 60), minute: s.m % 60, lat: city.lat, lon: city.lon, tzMinutes: tz });
        out.push({ ...s, tz, utMs: c.utMs, lagna: c.lagna.sign, nak: c.planets.find(p => p.name === 'Moon').nak, tithi: c.panchang.tithi, ...dlScore(c, tz) });
      } catch (err) { }
    }
    bar.style.width = Math.round(i / slots.length * 100) + '%';
    if (i < slots.length) return setTimeout(step, 0);
    dlLast = { out, city, days }; dlDraw();
  };
  setTimeout(step, 0);
});
const dlHM = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
function dlDraw() {
  if (!dlLast) return;
  const { out, city } = dlLast, box = $('#dl-res');
  // Windows: runs of consecutive slots on the same day with the same lagna and no Rahu kaal, scored by their best slot
  const wins = [];
  for (const s of out) {
    const w = wins[wins.length - 1];
    if (w && w.y === s.y && w.mo === s.mo && w.d === s.d && w.lagna === s.lagna && !s.blocked && !w.blocked && s.m === w.end + DL_STEP && Math.abs(s.score - w.best.score) <= 6) { w.end = s.m; if (s.score > w.best.score) w.best = s; }
    else wins.push({ y: s.y, mo: s.mo, d: s.d, start: s.m, end: s.m, lagna: s.lagna, best: s, blocked: s.blocked });
  }
  const good = wins.filter(w => !w.blocked).sort((a, b) => b.best.score - a.best.score);
  const show = session ? good.slice(0, 12) : good.slice(0, 3);
  const dfmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayLabel = w => dfmt.format(new Date(Date.UTC(w.y, w.mo - 1, w.d)));
  const reason = r => `<li class="${r.tone}">${esc(t(r.key, r.params))}</li>`;
  const card = (w, i) => { const b = w.best; return `<li class="card dl-win reveal ${i === 0 ? 'top' : ''}"><div class="dl-wh"><span class="dl-rank">${i + 1}</span><div><b>${esc(dayLabel(w))} · ${dlHM(w.start)}${w.end > w.start ? '–' + dlHM(w.end + DL_STEP) : ''}</b>
    <small>${rg(w.lagna, 'rg sm')}${esc(t('rl.lagna', { r: { r: w.lagna } }))} · ${esc(t('dl.moonIn', { nk: { nk: b.nak } }))} · ${esc(pakshaOf(b.tithi - 1))} ${esc(tithiLabel(b.tithi - 1))}</small></div><span class="dl-score ${b.score >= 75 ? 'good' : b.score >= 60 ? 'mixed' : 'bad'}">${b.score}</span></div>
    <ul class="dl-why">${b.why.filter(r => r.tone === 'good').slice(0, 4).map(reason).join('')}${b.why.filter(r => r.tone === 'bad').slice(0, 3).map(reason).join('')}</ul></li>`; };
  // Heat strip per day
  const byDay = {}; out.forEach(s => { const k = `${s.y}-${s.mo}-${s.d}`; (byDay[k] = byDay[k] || []).push(s); });
  const strip = Object.values(byDay).map(arr => `<div class="dl-day"><span>${esc(dfmt.format(new Date(Date.UTC(arr[0].y, arr[0].mo - 1, arr[0].d))))}</span><div class="dl-cells">${arr.map(s => `<i class="${s.blocked ? 'blk' : s.score >= 75 ? 'g3' : s.score >= 62 ? 'g2' : s.score >= 50 ? 'g1' : 'g0'}" title="${dlHM(s.m)} · ${s.blocked ? esc(t('dl.w.' + s.blocked)) : s.score}"></i>`).join('')}</div></div>`).join('');
  box.innerHTML = `<div class="dl-sum card reveal"><span class="eyebrow">${esc(city.name)}</span><h2>${esc(t('dl.found', { n: good.length }))}</h2><p class="muted small">${esc(t('dl.how'))}</p></div>
    <ol class="dl-wins">${show.map(card).join('') || `<li class="empty">${esc(t('dl.none'))}</li>`}</ol>
    ${session ? '' : lockCard('delivery', `<p class="muted small">${esc(t('dl.basicNote', { n: Math.min(3, good.length), t: good.length }))}</p>`)}
    <div class="card dl-strip reveal"><h3>${esc(t('dl.stripH'))}</h3><div class="dl-legend"><span><i class="g3"></i>${esc(t('dl.lg3'))}</span><span><i class="g2"></i>${esc(t('dl.lg2'))}</span><span><i class="g0"></i>${esc(t('dl.lg0'))}</span><span><i class="blk"></i>${esc(t('dl.lgBlk'))}</span></div>${strip}</div>
    <p class="muted small rem-note">${ic('i-info')}${esc(t('dl.note'))}</p>`;
  observeReveals();
}
authHooks.push(() => dlDraw());
