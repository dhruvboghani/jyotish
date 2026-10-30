/* "Ask my chart": questions about the open chart, answered by AI from a numbered list of chart facts.
   Every [F#] citation becomes a chip that jumps to the report section the fact came from. Members only. */
function askHtml(premium) {
  const ex = ((L.ask && L.ask.examples) || []).map(q => `<button type="button" class="chip" data-askq="${esc(q)}">${esc(q)}</button>`).join('');
  return `<section id="ask" class="ask-sec no-print"><div class="card ask-card reveal">
    <div class="ask-head"><span class="badge">${ic('i-question')}</span><div><p class="eyebrow">${esc(t('ask.eye'))}</p><h2>${esc(t('ask.title'))}</h2><p class="muted small">${esc(t('ask.lede'))}</p></div></div>
    ${premium ? `<div class="ask-thread" aria-live="polite"></div>
    <form class="ask-form" novalidate><textarea rows="2" maxlength="500" placeholder="${esc(t('ask.ph'))}" aria-label="${esc(t('ask.title'))}"></textarea><button type="submit" class="btn-cta">${esc(t('ask.go'))}</button></form>
    <div class="ask-ex">${ex}</div><p class="ask-left muted small"></p><p class="muted small">${ic('i-info')}${esc(t('ask.note'))}</p>`
    : lockCard('ask')}</div></section>`;
}
function wireAsk(input) {
  const root = document.getElementById('ask'); if (!root) return;
  const form = root.querySelector('.ask-form'); if (!form) return;
  const ta = form.querySelector('textarea'), thread = root.querySelector('.ask-thread'), left = root.querySelector('.ask-left'), btn = form.querySelector('button');
  const history = [];
  const { log, lang, save, ...birth } = input;
  // Answer text: escape, keep paragraphs, turn [F3] into chips
  const render = (text, facts) => {
    const byId = Object.fromEntries(facts.map(f => [f.id, f]));
    return esc(text).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>').replace(/\[(F\d+)\]/g, (m, id) => {
      const f = byId[id]; if (!f) return '';
      return `<a class="ask-cite" href="#${esc(f.sec)}" title="${esc(f.text)}">${esc(id.slice(1))}</a>`;
    })}</p>`).join('');
  };
  const ask = async q => {
    q = q.trim(); if (q.length < 3 || btn.disabled) return;
    btn.disabled = true; ta.value = '';
    const item = document.createElement('div'); item.className = 'ask-item';
    item.innerHTML = `<p class="ask-q">${esc(q)}</p><div class="ask-a muted">${esc(t('ask.thinking'))}</div>`;
    thread.appendChild(item);
    const a = item.querySelector('.ask-a');
    try {
      const r = await api('/api/ask', { method: 'POST', body: JSON.stringify({ birth, q, lang: LANG, history }) });
      a.classList.remove('muted');
      a.innerHTML = render(r.answer, r.facts || []) + (r.facts && r.facts.length ? `<details class="ask-src"><summary>${esc(t('ask.sources'))} (${r.facts.length})</summary><ol>${r.facts.map(f => `<li><a href="#${esc(f.sec)}">${esc(f.id.slice(1))}</a> ${esc(f.text)}</li>`).join('')}</ol></details>` : '');
      history.push({ q, a: r.answer }); if (history.length > 3) history.shift();
      left.textContent = r.left != null ? t('ask.left', { n: r.left }) : '';
    } catch (e) {
      const code = e.data && e.data.error;
      a.textContent = code === 'quota' ? t('ask.quota', { n: e.data.limit || 10 }) : code === 'not_configured' ? t('ask.notConfigured') : code === 'login_required' ? t('members.lockText') : t('ask.failed');
      a.classList.add('err');
    } finally { btn.disabled = false; }
  };
  form.addEventListener('submit', e => { e.preventDefault(); ask(ta.value); });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(ta.value); } });
  root.querySelectorAll('[data-askq]').forEach(b => b.addEventListener('click', () => ask(b.dataset.askq)));
}
