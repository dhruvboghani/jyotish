/* Live Planetary Gochar (Transit) Tool */
(() => {
  const sel = $('#gc-sign'), dateIn = $('#gc-date'), btn = $('#gc-btn'), res = $('#gc-res');
  if (!sel || !res) return;

  const today = new Date().toISOString().slice(0, 10);
  dateIn.value = today;

  const rNames = L.names.rashi || [];
  sel.innerHTML = rNames.map((n, i) => `<option value="${i}">${esc(n)} (${dm(0)}–${dm(30)})</option>`).join('');

  bindSavedKundali('#gc-saved', (b, row) => {
    const sm = row && row.summary;
    if (sm && sm.moon != null) { sel.value = String(sm.moon); renderGochar(); return; }
    if (window.Jyotish && b && b.year) {
      const tzMinutes = b.tzMinutes != null ? b.tzMinutes : 330;
      const out = window.Jyotish.compute({ year: b.year, month: b.month, day: b.day, hour: b.hour || 12, minute: b.minute || 0, lat: b.lat || 28.6139, lon: b.lon || 77.209, tzMinutes });
      if (out && out.P && out.P.Moon) { sel.value = String(out.P.Moon.sign); renderGochar(); }
    }
  });

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
          <td><span class="gr-cell">${g(p, 'gimg sm')}<b>${gn(p)}</b></span></td>
          <td class="nowrap"><strong>${rn(pSign)}</strong> <small>${dm(pDeg)}</small></td>
          <td class="nowrap"><strong>${houseFromSign}th House</strong> <small>(${houseFromSign}वां भाव)</small></td>
          <td class="nowrap"><span class="tag ${tone}">${statusLabel}</span></td>
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
      <div class="gochar-results reveal">
        <div class="mod-grid">
          <div class="card chart reveal">${chartHtml}</div>
          <div class="card details-card reveal">
            <div class="details-card-header">
              <h3>${rn(s)} — Live Planetary Transit Positions</h3>
              <p class="muted small">Transiting positions of all 9 planets counted from your Rashi / Ascendant.</p>
            </div>
            <div class="tablewrap">
              <table class="mod-table">
                <thead>
                  <tr>
                    <th>Graha</th>
                    <th>Sign & Degree</th>
                    <th>House</th>
                    <th>Transit Impact</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows.join('')}
                </tbody>
              </table>
            </div>
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
