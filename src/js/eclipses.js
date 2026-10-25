/* Eclipse and retrograde calendar: solar and lunar eclipses for the next two years with local visibility,
   contact times and sutak for the chosen city, which saved family charts they touch, and planet stations. */
const ecCity = cityPicker(() => ecLoad());
const ecTz = () => { const d = todayIn(330); return ecCity.offset(d.y, d.m, d.d); };
let ecFam = [];
const ecFx = (sign, nak, m) => {
  const h = (sign - m.moonSign + 12) % 12 + 1;
  const tone = m.nak === nak || h === 1 ? 'bad' : [4, 8, 12].includes(h) ? 'warn' : [3, 6, 10, 11].includes(h) ? 'good' : '';
  return { h, tone, janma: m.nak === nak };
};
async function ecFamily() {
  if (!session || !window.Jyotish) { ecFam = []; return; }
  const rows = await loadMyKundalis();
  ecFam = rows.map(r => { try { const c = window.Jyotish.compute(r.birth); return { name: r.birth.name || r.name || '', moonSign: c.P.Moon.sign, nak: c.P.Moon.nak }; } catch (e) { return null; } }).filter(Boolean);
}
async function ecLoad() {
  const c = ecCity.city, tz = ecTz();
  let r;
  try { r = await api(`/api/eclipses/?lat=${c.lat.toFixed(3)}&lon=${c.lon.toFixed(3)}&years=2`); } catch (e) { $('#ec-list').innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; return; }
  await ecFamily();
  const dt = ms => `${dateFmt.format(new Date(ms + tz * 60000))} ${fTime(ms, tz)}`;
  $('#ec-list').innerHTML = r.eclipses.map(e => {
    const L0 = e.local, vis = L0.visible, past = e.max < Date.now();
    const times = vis ? (e.kind === 'lunar'
      ? [[t('ec.start'), dt(L0.start)], L0.totalStart ? [t('ec.totality'), `${fTime(L0.totalStart, tz)} – ${fTime(L0.totalEnd, tz)}`] : null, [t('ec.max'), dt(e.max)], [t('ec.end'), dt(L0.end)]]
      : [[t('ec.start'), dt(L0.start)], [t('ec.max'), dt(L0.max)], [t('ec.end'), dt(L0.end)]]).filter(Boolean) : [[t('ec.max'), dt(e.max) + ' (' + t('ec.global') + ')']];
    const fam = ecFam.map(m => ({ m, ...ecFx(e.sign, e.nak, m) }));
    return `<article class="card ecl ${e.kind} ${vis ? 'vis' : ''} ${past ? 'past' : ''} reveal"><div class="ecl-h"><span class="ecl-ic ${e.kind}"></span><div><b>${esc(t('ec.k.' + e.kind + '.' + e.type))}</b><small>${esc(longDateFmt.format(new Date(e.max + tz * 60000)))}</small></div>
      <span class="tag ${vis ? 'gold' : ''}">${esc(t(vis ? 'ec.visible' : 'ec.notVisible', { c: c.name }))}</span></div>
      <dl class="ecl-t">${times.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd class="num">${esc(v)}</dd></div>`).join('')}
        <div><dt>${esc(t('ec.sutak'))}</dt><dd>${e.sutak ? esc(t('ec.sutakFrom', { d: dt(e.sutak) })) : esc(t(e.type === 'penumbral' ? 'ec.noSutakPen' : 'ec.noSutak'))}</dd></div>
        <div><dt>${esc(t('ec.in'))}</dt><dd>${rg(e.sign, 'rg sm')}${esc(rn(e.sign))} · ${esc(nk(e.nak))}</dd></div></dl>
      ${fam.length ? `<div class="ecl-fam"><b>${esc(t('ec.family'))}</b>${fam.map(f => `<span class="tag ${f.tone}">${esc(f.m.name || t('res.defaultName'))}: ${esc(f.janma ? t('ec.janma') : t('ec.house', { h: f.h }))}</span>`).join('')}<p class="muted small">${esc(t('ec.famNote'))}</p></div>` : (session ? '' : `<p class="muted small">${esc(t('ec.loginFam'))}</p>`)}</article>`;
  }).join('') || `<p class="empty">${esc(t('ec.none'))}</p>`;
  $('#ec-retro').innerHTML = `<ol class="timeline">${r.stations.map(s => `<li class="${s.kind === 'retro' || s.kind === 'inRetro' ? 'bad' : 'good'}"><span class="when">${esc(s.current ? t('tl.today') : dateFmt.format(new Date(s.at + tz * 60000)))}</span><span class="dot">${g(s.planet)}</span><div><b>${esc(t('ec.st.' + s.kind, { g: { g: s.planet }, r: { r: s.sign } }))}</b><p>${esc(t('ec.stx.' + (s.kind === 'retro' || s.kind === 'inRetro' ? 'retro' : 'direct'), { g: { g: s.planet } }))}</p></div></li>`).join('')}</ol>`;
  observeReveals();
}
readyHooks.push(ecLoad);
authHooks.push(() => ecLoad());
