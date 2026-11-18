/* Live Planetary Gochar (Transit) Tool */
(() => {
  const sel = $('#gc-sign'), dateIn = $('#gc-date'), btn = $('#gc-btn'), res = $('#gc-res');
  if (!sel || !res) return;

  const today = new Date().toISOString().slice(0, 10);
  dateIn.value = today;

  const rNames = L.names.rashi || [];
  sel.innerHTML = rNames.map((n, i) => `<option value="${i}">${esc(n)} (${dm(0)}–${dm(30)})</option>`).join('');

  function renderGochar() {
    if (!window.Jyotish) {
      setTimeout(renderGochar, 50);
      return;
    }
    const s = parseInt(sel.value, 10) || 0;
    const dt = dateIn.value ? new Date(dateIn.value + 'T12:00:00Z') : new Date();
    const jd = dt.getTime() / 86400000 + 2440587.5;
    const tr = window.Jyotish.transit(jd);
    const lon = tr.lon;

    const bySign = Array.from({ length: 12 }, () => []);
    const tableRows = [];

    ORDER.forEach(p => {
      const pLon = lon[p];
      const pSign = Math.floor(pLon / 30);
      const pDeg = pLon - pSign * 30;
      const houseFromSign = (pSign - s + 12) % 12 + 1;
      const isGood = GOCHAR_GOOD[p] && GOCHAR_GOOD[p].includes(houseFromSign);

      bySign[pSign].push({ t: ga(p), c: COL[p], r: p !== 'Rahu' && p !== 'Ketu' && tr.speed && tr.speed[p] < 0 });

      const tone = isGood ? 'good' : 'warn';
      const statusLabel = isGood ? '✨ Favorable / शुभ गोचर' : '⚖️ Caution / मिश्रित प्रभाव';

      tableRows.push(`
        <tr>
          <td><strong>${gimg(p, 'gimg sm')} ${gn(p)}</strong></td>
          <td>${rn(pSign)} ${dm(pDeg)}</td>
          <td><strong>${houseFromSign}th House</strong> (${houseFromSign}वां भाव)</td>
          <td><span class="tag ${tone}">${statusLabel}</span></td>
        </tr>
      `);
    });

    const chartHtml = typeof drawChart === 'function' ? drawChart({
      asc: s,
      bySign,
      title: `${rn(s)} Gochar Chart`,
      sub: dateIn.value || today
    }) : '';

    res.innerHTML = `
      <div class="gochar-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1.5rem;margin-top:1.5rem;">
        <div class="card chart reveal">${chartHtml}</div>
        <div class="card reveal">
          <h3>${rn(s)} — Live Planetary Transit Positions</h3>
          <p class="muted small">Transiting positions of all 9 planets counted from your Rashi / Ascendant.</p>
          <div class="tablewrap" style="overflow-x:auto;">
            <table class="seo-table">
              <thead>
                <tr>
                  <th>Graha</th>
                  <th>Sign & Degree</th>
                  <th>House</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows.join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    observeReveals();
  }

  btn.addEventListener('click', renderGochar);
  sel.addEventListener('change', renderGochar);
  dateIn.addEventListener('change', renderGochar);
  readyHooks.push(renderGochar);
})();
