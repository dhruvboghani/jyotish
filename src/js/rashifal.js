/* Daily Rashifal page: transits for today / tomorrow / a chosen date, read from each Moon sign. */
const myMoon = store.get('kg-moon');
const rDate = $('#r-date');
const tdy = todayIn(330);
const dayStr = n => { const x = new Date(Date.UTC(tdy.y, tdy.m - 1, tdy.d + n)); return isoDay(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); };
rDate.value = dayStr(0);
$$('#r-tabs button').forEach(b => b.addEventListener('click', () => { $$('#r-tabs button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); rDate.value = dayStr(+b.dataset.n); loadR(); }));
rDate.addEventListener('change', () => { $$('#r-tabs button').forEach(x => x.setAttribute('aria-pressed', 'false')); loadR(); });
let seqR = 0;
const stars = n => `<span class="stars" aria-label="${n}/5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
const ord = h => t('rf.house', { h });
async function loadR() {
  const my = ++seqR, box = $('#rbox');
  box.innerHTML = '<div class="card" style="padding:40px;text-align:center"><span class="spin"></span></div>';
  try {
    const data = await api('/api/rashifal/?date=' + rDate.value);
    if (my !== seqR) return;
    const [y, m, d] = data.date.split('-').map(Number);
    $('#r-when').textContent = longDateFmt.format(new Date(Date.UTC(y, m - 1, d)));
    const pos = ORDER.map(p => `<span class="tag">${g(p, 'gimg sm')}${esc(ga(p))} ${esc(rn(data.positions[p].sign))}${data.positions[p].retro && p !== 'Rahu' && p !== 'Ketu' ? ' R' : ''}</span>`).join('');
    let signs = data.signs.slice();
    if (myMoon && myMoon.sign != null) signs = [signs[myMoon.sign], ...signs.filter(s => s.sign !== myMoon.sign)];
    box.innerHTML = `<div class="card r-pos reveal"><b>${esc(t('rf.positions'))}</b><div class="meta">${pos}</div></div><div class="rgrid">${signs.map(s => {
      const good = s.items.filter(i => i.good), bad = s.items.filter(i => !i.good && i.planet !== 'Moon');
      const mine = myMoon && myMoon.sign === s.sign;
      return `<article class="card rcard reveal${mine ? ' mine' : ''}${s.chandrashtama ? ' warn' : ''}" id="rs${s.sign}"><div class="rh">${rg(s.sign, 'rg big')}<div><h3>${esc(rn(s.sign))}</h3><small>${esc(t('res.lord', { g: { g: SIGN_LORD[s.sign] } }))}</small></div>${stars(s.stars)}</div>
        ${mine ? `<span class="tag gold">${esc(t('rf.yours', { n: myMoon.name || t('res.defaultName') }))}</span>` : ''}
        <p class="rmoon">${esc(t('rf.moon.' + (s.moonHouse - 1)))}</p>
        ${s.chandrashtama ? `<p class="tag bad">${esc(t('rf.chandrashtama'))}</p>` : ''}
        <dl class="areas">${['career', 'money', 'love', 'health'].map(a => `<div><dt>${esc(t('rf.area.' + a))}</dt><dd>${stars(s.area[a])}</dd></div>`).join('')}</dl>
        <p class="rsupport">${good.length ? `<b class="good">${esc(t('rf.support'))}</b> ${esc(joinList(good.map(i => gn(i.planet) + ' (' + ord(i.house) + ')')))}` : ''}${bad.length ? `<br><b class="bad">${esc(t('rf.caution'))}</b> ${esc(joinList(bad.map(i => gn(i.planet) + ' (' + ord(i.house) + ')')))}` : ''}</p></article>`;
    }).join('')}</div><p class="muted small">${esc(t('rf.note'))}</p>`;
    observeReveals();
  } catch (e) { box.innerHTML = `<p class="err">${esc(t('err.server'))}</p>`; }
}
loadR();
