/* Sadhana (remedy) tracker — shared by the report and the My Sadhana page.
   A sadhana is a daily or weekly practice (mantra japa, fast, donation, other) kept for N sessions.
   Rows live in Supabase table "sadhanas" (supabase/v6_sadhana.sql), one per practice, owned by the user. */
const SD_WEEKDAY = { Sun: 0, Moon: 1, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Saturn: 6, Rahu: 6, Ketu: 2 };
const SD_JAPA = 108;
const sdWeekdayFmt = mkFmt({ weekday: 'long' });
const sdDayName = i => sdWeekdayFmt.format(Date.UTC(2023, 0, 1 + i)); // 1 Jan 2023 was a Sunday
const sdTz = () => -new Date().getTimezoneOffset();
const sdIso = ms => new Date(ms).toISOString().slice(0, 10);
const sdToday = (tz = sdTz()) => sdIso(Date.now() + tz * 60000);
const sdMs = iso => Date.parse(iso + 'T00:00:00Z');
const sdFmt = iso => dateFmt.format(new Date(sdMs(iso)));

// All scheduled dates of a sadhana, as YYYY-MM-DD strings
function sdSessions(row) {
  let d = sdMs(row.start_date);
  if (row.cadence === 'weekly') { const wd = new Date(d).getUTCDay(); d += ((row.weekday - wd + 7) % 7) * 86400000; }
  const step = row.cadence === 'weekly' ? 7 : 1;
  return Array.from({ length: row.total }, (_, i) => sdIso(d + i * step * 86400000));
}
function sdStats(row) {
  const today = sdToday(row.tz_minutes ?? sdTz()), list = sdSessions(row), done = new Set(row.done_dates || []);
  const doneN = list.filter(x => done.has(x)).length, past = list.filter(x => x < today);
  const missed = past.filter(x => !done.has(x)).length, idx = list.indexOf(today);
  let streak = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i] > today) continue;
    if (list[i] === today && !done.has(today)) continue; // today still open
    if (done.has(list[i])) streak++; else break;
  }
  const next = list.find(x => x > today);
  return { today, list, done, doneN, missed, streak, todayIdx: idx, next, complete: doneN >= row.total, ended: list[list.length - 1] < today, notStarted: list[0] > today };
}

async function sdLoad(filter) {
  if (!session || !sb) return { rows: [], error: null };
  let q = sb.from('sadhanas').select('*').eq('user_id', session.user.id);
  if (filter && filter.birth_key) q = q.eq('birth_key', filter.birth_key);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(200);
  return { rows: data || [], error };
}
const sdSetupMissing = err => err && /relation|exist|schema cache/i.test(err.message || '');

// Default text for a sadhana started from a remedy card
function sdDefaultTitle(kind, planet) {
  if (!planet) return '';
  const g = gn(planet);
  if (kind === 'mantra') return t('sd.defMantra', { g, m: (L.names.mantra || {})[planet] || '', n: SD_JAPA });
  if (kind === 'fast') return t('sd.defFast', { g, d: sdDayName(SD_WEEKDAY[planet]) });
  if (kind === 'daan') return t('sd.defDaan', { g, x: t('rm.p.' + planet + '.donate') });
  return '';
}

// Modal to start a sadhana. pre = { planet, kind, birth_key, person }
function sdStartModal(pre = {}, onDone) {
  if (!session) { authModal('signup', 'sadhana'); return; }
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  const kind0 = pre.kind || 'mantra', planet0 = pre.planet || '';
  const wdOpts = sel => [0, 1, 2, 3, 4, 5, 6].map(i => `<option value="${i}"${i === sel ? ' selected' : ''}>${esc(sdDayName(i))}</option>`).join('');
  openModal(`<h2>${esc(t('sd.newH'))}</h2>${pre.person ? `<p class="muted small">${esc(pre.person)}</p>` : ''}
    <form id="sdform" class="sd-form" novalidate>
      <div class="field"><label for="sd-kind">${esc(t('sd.kind'))}</label><select id="sd-kind">${['mantra', 'fast', 'daan', 'custom'].map(k => `<option value="${k}"${k === kind0 ? ' selected' : ''}>${esc(t('sd.kinds.' + k))}</option>`).join('')}</select></div>
      <div class="field"><label for="sd-planet">${esc(t('sd.graha'))}</label><select id="sd-planet"><option value="">${esc(t('sd.none'))}</option>${planets.map(p => `<option value="${p}"${p === planet0 ? ' selected' : ''}>${esc(gn(p))}</option>`).join('')}</select></div>
      <div class="field full"><label for="sd-title">${esc(t('sd.what'))}</label><input id="sd-title" maxlength="200" required></div>
      <div class="field" id="sd-target-f"><label for="sd-target">${esc(t('sd.perDay'))}</label><input id="sd-target" type="number" inputmode="numeric" min="1" max="100000" value="${SD_JAPA}"></div>
      <div class="field"><label for="sd-cad">${esc(t('sd.often'))}</label><select id="sd-cad"><option value="daily">${esc(t('sd.daily'))}</option><option value="weekly">${esc(t('sd.weekly', { d: '…' }))}</option></select></div>
      <div class="field" id="sd-wd-f" hidden><label for="sd-wd">${esc(t('rm.luckyDay'))}</label><select id="sd-wd">${wdOpts(planet0 ? SD_WEEKDAY[planet0] : 6)}</select></div>
      <div class="field"><label for="sd-len">${esc(t('sd.length'))}</label><select id="sd-len"></select></div>
      <div class="field"><label for="sd-start">${esc(t('sd.startOn'))}</label><input id="sd-start" type="date" value="${sdToday()}"></div>
      <label class="chk full"><input type="checkbox" id="sd-remind" checked><span>${esc(t('sd.remind'))}</span></label>
      <p class="err full" id="sd-err" role="alert"></p>
      <button class="btn-cta full" type="submit">${esc(t('sd.create'))}</button>
    </form>`);
  const $k = $('#sd-kind'), $p = $('#sd-planet'), $ti = $('#sd-title'), $cad = $('#sd-cad'), $wd = $('#sd-wd'), $len = $('#sd-len');
  let edited = !!pre.title;
  if (pre.title) $ti.value = pre.title;
  $ti.addEventListener('input', () => { edited = true; });
  const lens = () => {
    const weekly = $cad.value === 'weekly', cur = +$len.value;
    const opts = weekly ? [7, 11, 16, 21] : [...new Set([21, 40, 108, pre.days || 40])].sort((a, b) => a - b);
    const def = weekly ? 11 : pre.days || 40;
    $len.innerHTML = opts.map(n => `<option value="${n}"${n === (opts.includes(cur) ? cur : def) ? ' selected' : ''}>${esc(t(weekly ? 'sd.weeks' : 'sd.days', { n }))}</option>`).join('');
    $('#sd-wd-f').hidden = !weekly;
    $cad.options[1].textContent = t('sd.weekly', { d: sdDayName(+$wd.value) });
  };
  const sync = () => {
    const kind = $k.value, planet = $p.value;
    $('#sd-target-f').hidden = kind !== 'mantra';
    if (planet) $wd.value = SD_WEEKDAY[planet];
    if (kind === 'fast' || kind === 'daan') $cad.value = 'weekly'; else if (kind === 'mantra') $cad.value = 'daily';
    if (!edited) $ti.value = sdDefaultTitle(kind, planet);
    lens();
  };
  $k.addEventListener('change', sync); $p.addEventListener('change', sync); $cad.addEventListener('change', lens); $wd.addEventListener('change', lens);
  sync(); setTimeout(() => $ti.focus(), 30);
  $('#sdform').addEventListener('submit', async e => {
    e.preventDefault();
    const title = $ti.value.trim(), err = $('#sd-err');
    if (!title) { err.textContent = t('sd.what'); $ti.focus(); return; }
    const row = {
      kind: $k.value, planet: $p.value || null, title, target: $k.value === 'mantra' ? Math.max(1, Math.min(100000, Math.round(+$('#sd-target').value || SD_JAPA))) : null,
      cadence: $cad.value, weekday: $cad.value === 'weekly' ? +$wd.value : null, total: +$len.value, start_date: $('#sd-start').value || sdToday(),
      tz_minutes: sdTz(), remind: $('#sd-remind').checked, birth_key: pre.birth_key || null, person: pre.person || null, lang: LANG
    };
    const btn = e.submitter || $('#sdform .btn-cta'); btn.setAttribute('aria-busy', 'true');
    const { error } = await sb.from('sadhanas').insert(row);
    btn.removeAttribute('aria-busy');
    if (error) { err.textContent = sdSetupMissing(error) ? t('sd.setup') : error.message; return; }
    closeModal(); toast(t('sd.started'));
    if (onDone) onDone();
  });
}

// One sadhana as a card with its day grid. Clicking a cell toggles that day (today or earlier).
function sdCard(row, opts = {}) {
  const s = sdStats(row), stopped = row.status === 'stopped';
  const cells = s.list.map((d, i) => {
    const cls = s.done.has(d) ? 'done' : d < s.today ? 'miss' : d === s.today ? 'today' : 'future';
    return `<button type="button" class="sd-cell ${cls}" data-day="${d}" ${d > s.today || stopped ? 'disabled' : ''} title="${esc(sdFmt(d))}" aria-label="${esc(t('sd.dayOf', { n: i + 1, t: row.total }) + ' · ' + sdFmt(d))}" aria-pressed="${s.done.has(d)}">${i + 1}</button>`;
  }).join('');
  const pct = Math.round(s.doneN / row.total * 100);
  const todayDone = s.done.has(s.today);
  const head = s.complete ? `<span class="tag good">${ic('i-check')}${esc(t('sd.completed'))}</span>`
    : s.todayIdx >= 0 ? `<span class="tag gold">${esc(t('sd.dayOf', { n: s.todayIdx + 1, t: row.total }))}</span>`
    : s.notStarted ? `<span class="tag">${esc(t('sd.startsOn', { d: sdFmt(s.list[0]) }))}</span>`
    : s.next ? `<span class="tag">${esc(t('sd.noToday', { d: sdFmt(s.next) }))}</span>` : `<span class="tag">${esc(t('sd.finished'))}</span>`;
  const action = !stopped && !s.complete && s.todayIdx >= 0
    ? `<button type="button" class="${todayDone ? 'btn-line' : 'btn-cta'} sd-today" data-day="${s.today}">${ic('i-check')}${esc(t(todayDone ? 'sd.doneToday' : 'sd.markToday'))}</button>` : '';
  return `<article class="card sd-card reveal ${s.complete ? 'complete' : ''}" data-id="${row.id}" style="--gc:${row.planet ? COL[row.planet] : 'var(--gold)'}">
    <div class="sd-head">${row.planet ? g(row.planet, 'gimg') : `<span class="sd-ic">${ic('i-star')}</span>`}<div class="sd-tt"><b>${esc(row.title)}</b><small>${esc(t('sd.kinds.' + row.kind))} · ${esc(row.cadence === 'weekly' ? t('sd.weekly', { d: sdDayName(row.weekday) }) : t('sd.daily'))}${row.target ? ' · ' + row.target.toLocaleString(LOCALE) + '×' : ''}${row.person && !opts.compact ? ' · ' + esc(row.person) : ''}</small></div>
      <div class="sd-ring" style="--p:${pct}"><b>${s.doneN}</b><small>/${row.total}</small></div></div>
    <div class="sd-meta">${head}<span>${esc(t('sd.streak', { n: s.streak }))}</span>${s.missed ? `<span class="bad">${esc(t('sd.missed', { n: s.missed }))}</span>` : ''}</div>
    ${opts.compact ? '' : `<div class="sd-grid${row.total > 60 ? ' dense' : ''}">${cells}</div>`}
    <div class="sd-actions">${action}${opts.compact ? `<a class="btn-line" href="${HOME}sadhana/">${esc(t('sd.open'))}</a>` : `<button type="button" class="linkbtn" data-act="remind">${ic('i-bell')}${esc(t(row.remind ? 'sd.remindOn' : 'sd.remindOff'))}</button><button type="button" class="linkbtn" data-act="restart">${esc(t('sd.restart'))}</button>${stopped || s.complete ? '' : `<button type="button" class="linkbtn" data-act="stop">${esc(t('sd.stop'))}</button>`}<button type="button" class="del" data-act="delete">${esc(t('sd.remove'))}</button>`}</div>
  </article>`;
}

// Wire clicks on sd cards inside a container; reload() redraws after changes
function sdWire(box, rows, reload) {
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  box.onclick = async e => {
    const card = e.target.closest('.sd-card'); if (!card) return;
    const row = byId[card.dataset.id]; if (!row) return;
    const dayBtn = e.target.closest('[data-day]'), act = e.target.closest('[data-act]');
    if (dayBtn && !dayBtn.disabled) {
      const d = dayBtn.dataset.day, set = new Set(row.done_dates || []);
      set.has(d) ? set.delete(d) : set.add(d);
      const done_dates = [...set].sort(), wasComplete = sdStats(row).complete;
      row.done_dates = done_dates;
      const complete = sdStats(row).complete;
      const patch = { done_dates, updated_at: new Date().toISOString(), status: complete ? 'done' : row.status === 'done' ? 'active' : row.status };
      const { error } = await sb.from('sadhanas').update(patch).eq('id', row.id);
      if (error) { toast(error.message); return; }
      Object.assign(row, patch);
      if (complete && !wasComplete) toast(t('sd.completedMsg'));
      return reload();
    }
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'delete' && !confirm(t('sd.confirmDelete'))) return;
    if (a === 'restart' && !confirm(t('sd.confirmRestart'))) return;
    const now = new Date().toISOString();
    const res = a === 'delete' ? await sb.from('sadhanas').delete().eq('id', row.id)
      : a === 'restart' ? await sb.from('sadhanas').update({ start_date: sdToday(), done_dates: [], status: 'active', tz_minutes: sdTz(), updated_at: now }).eq('id', row.id)
      : a === 'stop' ? await sb.from('sadhanas').update({ status: 'stopped', updated_at: now }).eq('id', row.id)
      : await sb.from('sadhanas').update({ remind: !row.remind, updated_at: now }).eq('id', row.id);
    if (res.error) { toast(res.error.message); return; }
    reload();
  };
}
