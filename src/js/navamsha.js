/* Navamsha (D9) Chart Explorer */
(() => {
  const form = $('#nv-form'), res = $('#nv-res'), saved = $('#nv-saved');
  if (!form || !res) return;

  const nvCity = cityPicker(() => {});
  if (saved && typeof fillSavedSelect === 'function') {
    fillSavedSelect(saved, c => {
      if (!c) return;
      $('#nv-name').value = c.name || '';
      $('#nv-date').value = c.date || '';
      $('#nv-time').value = c.time || '12:00';
      if (c.place) {
        $('#c-place').value = c.place;
        nvCity.setCity({ name: c.place, lat: c.lat, lon: c.lon, tz: c.tz || 'Asia/Kolkata' });
      }
    });
  }

  function getD9(sign, deg) {
    const navIndex = Math.floor(deg / (30 / 9));
    const start = [0, 9, 6, 3][sign % 4];
    return (start + navIndex) % 12;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dateVal = $('#nv-date').value, timeVal = $('#nv-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = nvCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({ year: y, month: m, day: d, hour: hh, minute: mm, lat: c.lat, lon: c.lon, tzMinutes });
    const d9Lagna = getD9(out.lagna.sign, out.lagna.deg);

    const bySign = Array.from({ length: 12 }, () => []);
    const vargottama = [];
    const rows = [];

    ORDER.forEach(p => {
      const pl = out.P[p];
      const d9Sign = getD9(pl.sign, pl.deg);
      const isVargottama = d9Sign === pl.sign;
      if (isVargottama) vargottama.push(p);

      bySign[d9Sign].push({ t: ga(p), c: COL[p], r: pl.retro });

      rows.push(`
        <tr>
          <td><strong>${gimg(p, 'gimg sm')} ${gn(p)}</strong></td>
          <td>${rn(pl.sign)} (D1)</td>
          <td><strong>${rn(d9Sign)} (D9)</strong></td>
          <td>${isVargottama ? '<span class="tag gold">🌟 Vargottama (अत्यंत बली)</span>' : '<span class="tag good">Normal</span>'}</td>
        </tr>
      `);
    });

    const chartHtml = drawChart ? drawChart({
      asc: d9Lagna,
      bySign,
      title: 'Navamsha (D9) Chart',
      sub: `${dateVal} ${timeVal}`
    }) : '';

    res.innerHTML = `
      <div class="navamsha-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict good">
          <span class="eyebrow">D9 Navamsha Analysis</span>
          <h2>${rn(d9Lagna)} Navamsha Lagna</h2>
          <p>The Navamsha (D9) chart reveals your inner soul potential, spiritual evolution, and marriage destiny.</p>
          ${vargottama.length ? `
            <p style="margin-top:0.75rem;"><span class="tag gold" style="font-size:0.9rem;">🌟 Vargottama Planets: ${vargottama.map(p => gn(p)).join(', ')}</span> — These planets occupy the identical sign in both D1 and D9, conferring extraordinary strength and lasting success.</p>
          ` : ''}
        </div>

        <div class="navamsha-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1.5rem;margin-top:1rem;">
          <div class="card chart reveal">${chartHtml}</div>
          <div class="card reveal">
            <h3>Planetary Positions in Navamsha (D9)</h3>
            <div class="tablewrap" style="overflow-x:auto;">
              <table class="seo-table">
                <thead>
                  <tr>
                    <th>Planet</th>
                    <th>Rashi (D1)</th>
                    <th>Navamsha (D9)</th>
                    <th>Strength</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
