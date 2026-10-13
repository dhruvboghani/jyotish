/* Members' report sections: Today for you, life-area reports, remedies, private chart notes, branded PDF header. */

const birthKeyOf = i => [i.year, i.month, i.day, i.hour, i.minute, Number(i.lat).toFixed(4), Number(i.lon).toFixed(4), i.tzMinutes].join('|');
const toneIc = tn => tn === 'good' ? ic('i-check') : tn === 'bad' ? ic('i-alert') : ic('i-info');

function todayHtml(td, tz) {
  const notes = td.notes.map((m, i) => `<li class="${i === 0 ? td.tara : i === 1 ? td.chandra : ''}">${esc(msg(m))}</li>`).join('');
  const areas = ['career', 'money', 'love', 'health'].map(a => `<div><dt>${esc(t('rf.area.' + a))}</dt><dd>${starRow(td.area[a])}</dd></div>`).join('');
  const week = td.week.map((w, i) => `<li class="${w.stars >= 4 ? 'good' : w.stars <= 2 ? 'bad' : ''}"><b>${esc(i === 0 ? t('rf.today') : weekdayFmt.format(new Date(w.at + tz * 60000)))}</b><small>${esc(dayMonthFmt.format(new Date(w.at + tz * 60000)))}</small>${starRow(w.stars)}${w.chandraH === 8 ? `<em>${esc(t('my.ch8'))}</em>` : ''}</li>`).join('');
  const rows = td.transits.map(x => `<tr class="${x.good ? 'g' : 'b'}"><td>${g(x.planet, 'gimg sm')}${esc(gn(x.planet))}${x.retro && x.planet !== 'Rahu' && x.planet !== 'Ketu' ? ' <small>R</small>' : ''}</td><td>${rg(x.sign, 'rg sm')}${esc(rn(x.sign))}</td><td class="num">${x.fromMoon}</td><td class="num">${x.fromLagna}</td><td class="num">${x.bav == null ? '—' : x.bav}</td><td><span class="tag ${x.good ? 'good' : 'bad'}">${esc(t(x.good ? 'sec.gochar.fav' : 'sec.gochar.unfav'))}</span></td></tr>`).join('');
  return `<div class="today-grid"><div class="card today-main reveal"><div class="th"><div><span class="eyebrow">${esc(longDateFmt.format(new Date(td.at + tz * 60000)))}</span><h3>${esc(t('my.overall'))}</h3></div><div class="big-stars">${starRow(td.stars)}<b>${td.score}/100</b></div></div>
      <dl class="areas">${areas}</dl><ul class="today-notes">${notes}</ul></div>
    <div class="card today-week reveal"><h3>${esc(t('my.week'))}</h3><ol class="week">${week}</ol></div></div>
    <details class="card tbl-card today-tr"><summary>${esc(t('my.transitTable'))}</summary><table><thead><tr><th>${esc(t('sec.ashtaka.graha'))}</th><th>${esc(t('my.sign'))}</th><th>${esc(t('my.fromMoon'))}</th><th>${esc(t('my.fromLagna'))}</th><th>${esc(t('my.bindu'))}</th><th></th></tr></thead><tbody>${rows}</tbody></table><p class="muted small" style="padding:10px 14px">${esc(t('my.method'))}</p></details>`;
}

const AREA_IC = { career: 'i-chart', marriage: 'i-heart', finance: 'i-star', health: 'i-sun', education: 'i-book', children: 'i-users' };
function areaBody(a, key, tz) {
  const f = a.factors.filter(x => x.tone !== 'mixed' || x.msg[0] !== 'la.occNone');
  const when = a.when.length ? `<h4>${esc(t('la.whenH'))}</h4><ul class="when-list">${a.when.map(w => `<li${w.now ? ' class="now"' : ''}>${g(w.ad, 'gimg sm')}<b>${esc(gn(w.md))} / ${esc(gn(w.ad))}</b><span class="num">${fDate(w.start, tz)} → ${fDate(w.end, tz)}</span>${w.now ? `<span class="tag gold">${esc(t('sec.dasha.now'))}</span>` : ''}</li>`).join('')}</ul>` : `<p class="muted small">${esc(t('la.noWhen'))}</p>`;
  return `<div class="area-head"><div class="area-score ${a.band}"><b>${a.score}</b><span>/100</span></div><div><h3>${esc(t('la.' + key + '.name'))}</h3><p><span class="tag ${a.band === 'strong' ? 'good' : a.band === 'care' ? 'bad' : 'warn'}">${esc(t('la.band.' + a.band))}</span> ${esc(t('la.' + key + '.' + a.band))}</p><p class="muted small">${esc(t('la.housesUsed', { list: { list: a.houses } }))}</p></div></div>
    <ul class="factor-list">${f.map(x => `<li class="${x.tone}">${toneIc(x.tone)}<span>${esc(msg(x.msg))}</span></li>`).join('')}</ul>${when}`;
}
function areasHtml(areas, tz) {
  const keys = Object.keys(areas);
  return `<div class="area-tabs seg no-print" role="tablist">${keys.map((k, i) => `<button type="button" data-area="${k}" aria-pressed="${i === 0}">${ic(AREA_IC[k])}${esc(t('la.' + k + '.name'))}<small>${areas[k].score}</small></button>`).join('')}</div>
    <div class="card area-card reveal" id="areabox">${areaBody(areas[keys[0]], keys[0], tz)}</div>
    <div class="print-only">${keys.slice(1).map(k => `<div class="card area-card">${areaBody(areas[k], k, tz)}</div>`).join('')}</div>`;
}

function remediesHtml(list) {
  if (!list.length) return `<p class="empty">${esc(t('rm.none'))}</p>`;
  const P = k => L.names && L.names.mantra ? L.names.mantra[k] : '';
  return `<div class="rem-grid">${list.map(r => {
    const d = k => t('rm.p.' + r.planet + '.' + k);
    const gemCls = r.gem === 'yes' ? 'good' : r.gem === 'no' ? 'bad' : r.gem === 'skip' ? '' : 'warn';
    return `<article class="card rem reveal" style="--gc:${COL[r.planet]}"><div class="rh">${g(r.planet)}<div><h3>${esc(gn(r.planet))}</h3><small>${esc(t('sec.grahas.strength'))}: ${r.strength}/100</small></div></div>
      <ul class="why">${r.reasons.map(m => `<li>${ic('i-alert')}${esc(msg(m))}</li>`).join('')}</ul>
      <dl class="rem-dl">
        <div><dt>${esc(t('rm.mantra'))}</dt><dd><span class="mantra" lang="sa">${esc(P(r.planet))}</span>${LANG === 'en' && L.names.mantraDev ? `<span class="mantra dev" lang="sa">${esc(L.names.mantraDev[r.planet])}</span>` : ''}<small>${esc(t('rm.japa', { n: r.japa.toLocaleString(LOCALE) }))}</small></dd></div>
        <div><dt>${esc(t('rm.fast'))}</dt><dd>${esc(d('day'))}</dd></div>
        <div><dt>${esc(t('rm.donate'))}</dt><dd>${esc(d('donate'))}</dd></div>
        <div><dt>${esc(t('rm.deity'))}</dt><dd>${esc(d('deity'))}</dd></div>
        <div><dt>${esc(t('rm.gemLabel'))}</dt><dd><span class="tag ${gemCls}">${esc(t('rm.gemStatus.' + r.gem))}</span> ${esc(d('gem'))}${r.gem === 'yes' || r.gem === 'maybe' ? ` · ${esc(t('rm.wear', { m: d('metal'), f: d('finger'), d: d('day') }))}` : ''}<small>${esc(msg(r.gemWhy))}</small></dd></div>
      </dl></article>`;
  }).join('')}</div><p class="muted small rem-note">${ic('i-info')}${esc(t('rm.disclaimer'))}</p>`;
}

// ---------- Notes ----------
async function mountNotes(input) {
  const box = $('#notesbox'); if (!box || !session || !sb) return;
  const key = birthKeyOf(input);
  const draw = rows => {
    box.innerHTML = `<form id="noteform" class="noteform"><textarea id="note-text" rows="3" maxlength="5000" placeholder="${esc(t('notes.ph'))}" aria-label="${esc(t('notes.ph'))}"></textarea><button class="btn-cta" type="submit">${esc(t('notes.add'))}</button></form>
      <ul class="notes">${rows.map(n => `<li data-id="${n.id}"><p>${esc(n.body)}</p><span class="hw">${ic('i-clock')}${esc(histWhen(n.updated_at || n.created_at))}</span><div class="na"><button class="linkbtn" type="button" data-edit>${esc(t('notes.edit'))}</button><button class="del" type="button" data-del>${esc(t('saved.delete'))}</button></div></li>`).join('') || `<li class="empty">${esc(t('notes.empty'))}</li>`}</ul>`;
    $('#noteform').addEventListener('submit', async e => {
      e.preventDefault();
      const body = $('#note-text').value.trim(); if (!body) return;
      const { error } = await sb.from('kundali_notes').insert({ birth_key: key, body });
      if (error) { toast(/relation|exist/.test(error.message) ? t('notes.setup') : error.message); return; }
      load();
    });
    box.querySelector('.notes').addEventListener('click', async e => {
      const li = e.target.closest('li[data-id]'); if (!li) return;
      if (e.target.closest('[data-del]')) { await sb.from('kundali_notes').delete().eq('id', li.dataset.id); load(); }
      if (e.target.closest('[data-edit]')) {
        const p = li.querySelector('p'), old = p.textContent;
        li.innerHTML = `<textarea rows="3" maxlength="5000">${esc(old)}</textarea><div class="na"><button class="btn-cta" type="button" data-save>${esc(t('notes.save'))}</button></div>`;
        li.querySelector('[data-save]').onclick = async () => { const v = li.querySelector('textarea').value.trim(); if (v) await sb.from('kundali_notes').update({ body: v, updated_at: new Date().toISOString() }).eq('id', li.dataset.id); load(); };
      }
    });
  };
  const load = async () => {
    const { data, error } = await sb.from('kundali_notes').select('id,body,created_at,updated_at').eq('user_id', session.user.id).eq('birth_key', key).order('created_at', { ascending: false }).limit(100);
    if (error) { box.innerHTML = `<p class="muted small">${esc(t('notes.setup'))}</p>`; return; }
    draw(data || []);
  };
  load();
}

// ---------- Branded PDF header ----------
async function brandHead() {
  const s = await loadSettings();
  const b = s && s.brand;
  const ph = $('.print-head'); if (!ph) return;
  if (!b || !b.enabled || !(b.name || b.logo)) return;
  ph.classList.add('branded');
  ph.innerHTML = `${b.logo ? `<img src="${esc(b.logo)}" alt="">` : ''}<div><b>${esc(b.name || '')}</b><span>${[b.phone, b.email, b.website].filter(Boolean).map(esc).join(' · ')}</span>${b.address ? `<span>${esc(b.address)}</span>` : ''}</div>`;
  let foot = $('.print-foot'); if (!foot) { foot = document.createElement('div'); foot.className = 'print-foot'; $('#results').appendChild(foot); }
  foot.textContent = [b.name, b.phone, b.website].filter(Boolean).join(' · ');
}
