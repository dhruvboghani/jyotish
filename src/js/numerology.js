/* Numerology calculator: Mulank, Bhagyank, name number, personal year, lucky things, and checks for a mobile /
   vehicle number, a business name and a partner. Runs entirely in the browser (maths in numcore.js). */
const nuForm = $('#nu-form'), nuName = $('#nu-name'), nuDate = $('#nu-date'), nuBox = $('#nu-res');
const NUK = 'kg-nu';
const numLink = (slug, text) => `<a class="linkbtn" href="${HOME}numerology/${slug}/">${esc(text)} →</a>`;
const planetOf = n => NU.PLANET[n];
const fitTag = f => `<span class="tag ${f === 'best' || f === 'good' ? 'good' : f === 'avoid' ? 'bad' : ''}">${esc(t('nu.fit.' + f))}</span>`;
const lvTag = lv => `<span class="tag ${lv === 'excellent' || lv === 'good' ? 'good' : lv === 'difficult' ? 'bad' : ''}">${esc(t('nu.lv.' + lv + '.label'))}</span>`;
let NUP = null; // current profile

(function prefill() {
  const saved = store.get(NUK), last = store.get('kg-last');
  const src = saved || (last && last.input ? { name: last.input.name || '', date: isoDay(last.input.year, last.input.month, last.input.day) } : null);
  if (src) { nuName.value = src.name || ''; nuDate.value = src.date || ''; if (src.date) calc(); }
})();
bindSavedKundali('#nu-saved', b => {
  nuName.value = b.name || '';
  nuDate.value = isoDay(b.year, b.month, b.day);
  if (nuDate.value) calc();
}, {
  shouldAutoFill: () => !nuDate.value,
  onNameOnly: fullName => { if (!nuName.value) nuName.value = fullName; }
});
nuForm.addEventListener('submit', e => { e.preventDefault(); calc(true); });

function calc(user) {
  const [y, m, d] = (nuDate.value || '').split('-').map(Number);
  if (!y || !m || !d) { nuBox.innerHTML = `<p class="err">${esc(t('nu.needDate'))}</p>`; return; }
  const name = nuName.value.trim();
  store.set(NUK, { name, date: nuDate.value });
  const td = todayIn(330), mu = NU.mulank(d), bh = NU.bhagyank(d, m, y), py = NU.personalYear(d, m, td.y);
  const nm = name && /[a-z]/i.test(name) ? { n: NU.nameNumber(name), t: NU.nameTotal(name) } : null;
  NUP = { mu, bh, y, m, d, name, nm, py, year: td.y };
  if (user) track('numerology', { mulank: mu, bhagyank: bh, nameNumber: nm ? nm.n : null });
  draw();
  if (user) nuBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function card(label, n, what, link, extra = '') {
  return `<article class="card nu-num reveal"><span class="eyebrow">${esc(label)}</span><div class="nu-big"><b>${n}</b>${g(planetOf(n), 'gimg sm')}<small>${esc(gn(planetOf(n)))}</small></div>${extra}<p>${esc(what)}</p>${link || ''}</article>`;
}

function draw() {
  const { mu, bh, nm, py, year, name } = NUP, N = L.nu.num;
  const lucky = NU.luckyFor(mu, bh), avoid = NU.avoidFor(mu, bh), gemKey = NU.GEM[mu];
  const nums = `<div class="nu-grid">
    ${card(t('nu.mulank'), mu, t('nu.mulankWhat'), numLink('mulank-' + mu, t('nu.readMore', { n: mu })))}
    ${card(t('nu.bhagyank'), bh, t('nu.bhagyankWhat'), numLink('bhagyank-' + bh, t('nu.readBh', { n: bh })))}
    ${nm ? card(t('nu.nameNum'), nm.n, t('nu.nameWhat'), '', `<small class="muted">${esc(t('nu.total', { t: nm.t }))}</small>`) : ''}
    ${card(t('nu.py', { y: year }), py, t('nu.pyWhat', { y: year }), numLink(`mulank-${mu}-${year}`, t('nu.readYear', { n: mu, y: year })))}
  </div>`;
  const facts = `<div class="card seo-tablewrap reveal"><table class="seo-table facts"><tbody>
    <tr><th>${esc(t('nu.luckyNums'))}</th><td>${lucky.map(n => `<span class="tag good">${n}</span>`).join(' ')}</td></tr>
    <tr><th>${esc(t('nu.avoidNums'))}</th><td>${avoid.length ? avoid.map(n => `<span class="tag bad">${n}</span>`).join(' ') : esc(t('nu.none'))}</td></tr>
    <tr><th>${esc(t('nu.luckyDates'))}</th><td>${esc(NU.luckyDates(lucky).join(', '))}</td></tr>
    <tr><th>${esc(t('nu.luckyDay'))}</th><td>${esc(L.names.vara[NU.DAY[mu]])}</td></tr>
    <tr><th>${esc(t('nu.luckyColor'))}</th><td>${esc(N[mu].color)}</td></tr>
    <tr><th>${esc(t('nu.gem'))}</th><td><a href="${HOME}learn/${NU.GEM_SLUG[mu]}-gemstone/">${esc(t('gm.g.' + gemKey))}</a></td></tr>
  </tbody></table></div>`;
  const nature = `<div class="card prose reveal"><h2>${esc(t('nu.traitH', { n: mu }))}</h2><p>${esc(N[mu].trait)}</p>
    <dl class="nu-dl"><div><dt>${esc(t('nu.strong'))}</dt><dd>${esc(N[mu].strong)}</dd></div><div><dt>${esc(t('nu.weak'))}</dt><dd>${esc(N[mu].weak)}</dd></div><div><dt>${esc(t('nu.career'))}</dt><dd>${esc(N[mu].career)}</dd></div><div><dt>${esc(t('nu.love'))}</dt><dd>${esc(N[mu].love)}</dd></div><div><dt>${esc(t('nu.health'))}</dt><dd>${esc(N[mu].health)}</dd></div></dl>
    <h2>${esc(t('nu.destinyH', { n: bh }))}</h2><p>${esc(N[bh].destiny)}</p>
    <h2>${esc(t('nu.py', { y: year }))}</h2><p>${esc(N[py].py)}</p></div>`;
  let nameCard = '';
  if (nm) {
    const f = NU.fit(nm.n, mu, bh);
    const vars = f === 'best' ? [] : NU.variants(name, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => NU.fit(n, mu, bh) === 'best').concat(f === 'avoid' ? [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => NU.fit(n, mu, bh) === 'good') : []));
    nameCard = `<div class="card nu-check reveal ${f === 'avoid' ? 'warn' : 'good'}"><h3>${ic('i-star')}${esc(t('nu.nameNum'))}</h3>
      <p><b>${esc(t('nu.nameRes', { name, t: nm.t, n: nm.n, g: gn(planetOf(nm.n)) }))}</b> ${fitTag(f)}</p><p class="muted small">${esc(t('nu.fitText.' + f, { n: nm.n }))}</p>
      ${f === 'best' ? '' : `<h4>${esc(t('nu.variantsH'))}</h4>${vars.length ? `<div class="meta linkrow">${vars.map(v => `<span class="tag good" title="${esc(t('nu.total', { t: v.total }))}">${esc(v.name)} · ${v.number}</span>`).join('')}</div><p class="muted small">${esc(t('nu.variantsNote'))}</p>` : `<p class="muted small">${esc(t('nu.variantsNone'))}</p>`}`}</div>`;
  }
  const checks = `<div class="nu-checks">
    <form class="card nu-check" id="nu-mob" novalidate><h3>${ic('i-phone')}${esc(t('nu.mobileH'))}</h3><div class="nu-row"><input type="text" inputmode="text" id="nu-mob-in" placeholder="${esc(t('nu.mobilePh'))}" aria-label="${esc(t('nu.mobileH'))}" maxlength="24"><button class="btn-line" type="submit">${esc(t('nu.mobileBtn'))}</button></div><div class="nu-out" id="nu-mob-out"></div></form>
    <form class="card nu-check" id="nu-biz" novalidate><h3>${ic('i-doc')}${esc(t('nu.bizH'))}</h3><div class="nu-row"><input type="text" id="nu-biz-in" placeholder="${esc(t('nu.bizPh'))}" aria-label="${esc(t('nu.bizH'))}" maxlength="60"><button class="btn-line" type="submit">${esc(t('nu.bizBtn'))}</button></div><div class="nu-out" id="nu-biz-out"></div></form>
    <form class="card nu-check" id="nu-pair" novalidate><h3>${ic('i-heart')}${esc(t('nu.pairH'))}</h3><div class="nu-row"><input type="date" id="nu-pair-in" aria-label="${esc(t('nu.pairDate'))}"><button class="btn-line" type="submit">${esc(t('nu.pairBtn'))}</button></div><div class="nu-out" id="nu-pair-out"></div></form>
  </div>`;
  // Not logged in: the numbers, lucky facts and reading; name correction and the mobile / business / partner checks need a login
  const locked = lockCard('numerology', `<p class="muted small">${esc([t('nu.variantsH'), t('nu.mobileH'), t('nu.bizH'), t('nu.pairH')].join(' · '))}</p>`);
  nuBox.innerHTML = nums + facts + (session ? nameCard + checks : (nm ? nameCard.replace(/<h4>[\s\S]*$/, '</div>') : '') + locked) + nature + `<p class="muted small">${esc(t('nu.note'))}</p>`;
  if (session) bindChecks();
  observeReveals();
}

function bindChecks() {
  const { mu, bh } = NUP;
  const verdict = (n, line) => { const f = NU.fit(n, mu, bh); return `<p>${esc(line)} ${fitTag(f)}</p><p class="muted small">${esc(t('nu.fitText.' + f, { n }))}</p>`; };
  $('#nu-mob').addEventListener('submit', e => {
    e.preventDefault();
    const r = NU.phoneNumber($('#nu-mob-in').value), out = $('#nu-mob-out');
    if (r) track('numerology_check', { kind: 'mobile', number: r.number });
    out.innerHTML = r ? verdict(r.number, t('nu.mobileRes', { t: r.total, n: r.number, g: gn(planetOf(r.number)) })) : `<p class="err">${esc(t('nu.mobileBad'))}</p>`;
  });
  $('#nu-biz').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#nu-biz-in').value.trim(), out = $('#nu-biz-out');
    if (!/[a-z]/i.test(v)) { out.innerHTML = ''; return; }
    const n = NU.nameNumber(v), f = NU.fit(n, mu, bh);
    track('numerology_check', { kind: 'business', number: n });
    const vars = f === 'best' ? [] : NU.variants(v, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => NU.fit(x, mu, bh) === 'best'), 6);
    out.innerHTML = verdict(n, t('nu.nameRes', { name: v, t: NU.nameTotal(v), n, g: gn(planetOf(n)) })) + `<p class="muted small">${esc(t('nu.bizNote'))}</p>` + (vars.length ? `<h4>${esc(t('nu.variantsH'))}</h4><div class="meta linkrow">${vars.map(x => `<span class="tag good">${esc(x.name)} · ${x.number}</span>`).join('')}</div>` : '');
  });
  $('#nu-pair').addEventListener('submit', e => {
    e.preventDefault();
    const [y, m, d] = ($('#nu-pair-in').value || '').split('-').map(Number), out = $('#nu-pair-out');
    if (!y) { out.innerHTML = `<p class="err">${esc(t('nu.needDate'))}</p>`; return; }
    const mu2 = NU.mulank(d), bh2 = NU.bhagyank(d, m, y), lv = NU.level(mu, mu2), lv2 = NU.level(bh, bh2);
    track('numerology_check', { kind: 'partner', level: lv });
    const [a, b] = mu <= mu2 ? [mu, mu2] : [mu2, mu];
    out.innerHTML = `<p><b>${esc(t('nu.pairRes', { a: mu, b: mu2 }))}</b> ${lvTag(lv)}</p><p>${esc(t('nu.lv.' + lv + '.love'))}</p><p class="muted small">${esc(t('nu.lv.' + lv + '.work'))}</p>
      <p><b>${esc(t('nu.pairRes2', { a: bh, b: bh2 }))}</b> ${lvTag(lv2)}</p>${numLink(`compatibility/${a}-and-${b}`, t('nu.readPair', { a, b }))}`;
  });
}

const nuRedraw = () => { if (NUP && NUP.mu) draw(); };
readyHooks.push(nuRedraw); authHooks.push(nuRedraw);
