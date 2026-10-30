/* Career finder and "Best city for you" (relocation) sections of the report. Members only. */
function careerHtml(cr, tz) {
  const ymd = ms => new Intl.DateTimeFormat(LOCALE, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(ms + tz * 6e4));
  const fields = cr.fields.map((f, i) => `<li class="${i === 0 ? 'top' : ''}"><div class="cr-fh"><b>${i + 1}. ${esc(t('cr.f.' + f.k + '.name'))}</b><span class="cr-pl">${f.planets.map(p => g(p, 'gimg sm')).join('')}</span><span class="num">${f.pct}%</span></div>
    <div class="meter"><i class="${f.pct >= 85 ? 'good' : f.pct >= 65 ? 'mixed' : ''}" style="width:${f.pct}%"></i></div><p class="muted small">${esc(t('cr.f.' + f.k + '.ex'))}</p></li>`).join('');
  const sigs = cr.significators.map(s => `<li>${g(s.p, 'gimg sm')}<div><b>${esc(gn(s.p))}</b><p class="small">${s.why.map(w => esc(t(w[0], w[1]))).join(' · ')}</p></div></li>`).join('');
  const T = cr.tenth;
  const win = cr.windows.map(w => `<li class="${w.jup ? 'jup' : ''}"><span class="num">${esc(ymd(w.start))} – ${esc(ymd(w.end))}</span><span>${g(w.md, 'gimg sm')}${esc(gn(w.md))}–${esc(gn(w.ad))}</span>${w.now ? `<span class="tag gold">${esc(t('cr.winNow'))}</span>` : ''}${w.jup ? `<span class="tag good">${esc(t('cr.winJup'))}</span>` : ''}</li>`).join('');
  return `<div class="cr-grid">
    <div class="card cr-card reveal"><h3>${ic('i-chart')}${esc(t('cr.topH'))}</h3><ol class="cr-fields">${fields}</ol></div>
    <div class="cr-side">
      <div class="card cr-card reveal"><h3>${ic('i-star')}${esc(t('cr.leanH'))}</h3><p class="cr-lean"><span class="tag ${cr.lean === 'business' ? 'gold' : cr.lean === 'job' ? '' : 'good'}">${esc(t('cr.lean.' + cr.lean + '.t'))}</span></p><p class="small">${esc(t('cr.lean.' + cr.lean + '.x'))}</p>
        <h4>${esc(t('cr.styleH'))}</h4><p class="small">${rg(T.sign, 'rg sm')} ${esc(t('cr.tenthLine', { r: { r: T.sign }, g: { g: T.lord } }))} ${esc(t('cr.el.' + T.element))} ${esc(t('cr.mode.' + T.mode))}</p></div>
      <div class="card cr-card reveal"><h3>${ic('i-loop')}${esc(t('cr.sigH'))}</h3><ul class="cr-sigs">${sigs}</ul></div>
    </div></div>
    <div class="card cr-card reveal"><h3>${ic('i-cal')}${esc(t('cr.winH'))}</h3><p class="muted small">${esc(t('cr.winLede'))}</p>${win ? `<ul class="cr-wins">${win}</ul>` : `<p class="muted">${esc(t('cr.noWin'))}</p>`}</div>
    <p class="muted small rem-note">${ic('i-info')}${esc(t('cr.note'))}</p>`;
}

const RL_AREAS = ['career', 'finance', 'marriage', 'health'];
function rlRow(c, home, name) {
  const diff = c.overall - home.overall;
  const cell = a => { const d = c.scores[a] - home.scores[a]; return `<td class="num ${d >= 5 ? 'up' : d <= -5 ? 'down' : ''}">${c.scores[a]}${d >= 5 ? ' ▲' : d <= -5 ? ' ▼' : ''}</td>`; };
  return `<tr><td><b>${esc(name)}</b><small>${rg(c.lagna, 'rg sm')}${esc(t('rl.lagna', { r: { r: c.lagna } }))}</small></td>${RL_AREAS.map(cell).join('')}<td class="num"><b>${c.overall}</b> <span class="rl-diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${diff > 0 ? '+' : ''}${diff}</span></td></tr>`;
}
function relocHtml(rl) {
  const head = `<thead><tr><th>${esc(t('rl.city'))}</th>${RL_AREAS.map(a => `<th class="num">${esc(t('la.' + a + '.name'))}</th>`).join('')}<th class="num">${esc(t('rl.overall'))}</th></tr></thead>`;
  const H = rl.home;
  return `<div class="card rl-home reveal"><div><span class="eyebrow">${esc(t('rl.homeH'))}</span><p>${rg(H.lagna, 'rg sm')} <b>${esc(t('rl.lagna', { r: { r: H.lagna } }))}</b> · ${esc(t('rl.overall'))} <b>${H.overall}</b></p></div>
      <p class="muted small">${esc(t('rl.how'))}</p></div>
    <div class="seg rl-tabs no-print" role="group"><button type="button" data-rl="in" aria-pressed="true">${esc(t('rl.india'))}</button><button type="button" data-rl="ab" aria-pressed="false">${esc(t('rl.abroad'))}</button><button type="button" data-rl="all" aria-pressed="false">${esc(t('rl.all'))}</button></div>
    <div class="card tbl-card reveal rl-tbl" data-rlv="in"><table>${head}<tbody>${rl.cities.map(c => `<tr class="rl-r" data-reg="${c.region}" hidden></tr>`).join('')}</tbody></table></div>
    <div class="card rl-any reveal no-print"><h3>${ic('i-pin')}${esc(t('rl.anyH'))}</h3><div class="rl-any-row"><div class="field"><input id="rl-place" type="text" autocomplete="off" placeholder="${esc(t('rl.anyPh'))}" aria-label="${esc(t('rl.anyH'))}"><ul id="rl-suggest" class="suggest" role="listbox" hidden></ul></div></div>
      <div class="tbl-card rl-any-out" hidden><table>${head}<tbody></tbody></table></div></div>
    <p class="muted small rem-note">${ic('i-info')}${esc(t('rl.note'))}</p>`;
}
function wireReloc(rl, input) {
  const root = document.getElementById('reloc'); if (!root || !rl) return;
  const H = rl.home, body = root.querySelector('.rl-tbl tbody');
  const cityName = c => t('rl.c.' + c.k) !== 'rl.c.' + c.k ? t('rl.c.' + c.k) : c.name;
  const show = reg => {
    const list = rl.cities.filter(c => reg === 'all' || c.region === reg).slice(0, reg === 'all' ? 48 : 15);
    body.innerHTML = list.map(c => rlRow(c, H, cityName(c))).join('');
  };
  root.querySelectorAll('[data-rl]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-rl]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); show(b.dataset.rl);
  }));
  show('in');
  if (typeof PLACES === 'undefined' || !document.getElementById('rl-place')) { const any = root.querySelector('.rl-any'); if (any) any.hidden = true; return; }
  const out = root.querySelector('.rl-any-out'), ob = out.querySelector('tbody'), rows = [];
  const { log, lang, save, ...birth } = input;
  placePicker({ input: 'rl-place', suggest: 'rl-suggest' }, async p => {
    out.hidden = false; ob.insertAdjacentHTML('afterbegin', `<tr class="rl-wait"><td colspan="6"><span class="spin"></span></td></tr>`);
    try {
      const r = await api('/api/kundali/', { method: 'POST', body: JSON.stringify({ ...birth, relocate: { lat: p.lat, lon: p.lon } }) });
      rows.unshift({ ...r, name: p.name }); rows.splice(5);
      ob.innerHTML = rows.map(c => rlRow(c, H, c.name)).join('');
    } catch (e) { ob.querySelector('.rl-wait') && ob.querySelector('.rl-wait').remove(); toast(e.status === 401 ? t('members.lockText') : t('err.server')); }
  });
}
