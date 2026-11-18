/* Vimshottari Dasha Planner & Timeline */
(() => {
  const form = $('#ds-form'), res = $('#ds-res'), saved = $('#ds-saved');
  if (!form || !res) return;

  const dsCity = cityPicker(() => {});
  if (saved && typeof fillSavedSelect === 'function') {
    fillSavedSelect(saved, c => {
      if (!c) return;
      $('#ds-name').value = c.name || '';
      $('#ds-date').value = c.date || '';
      $('#ds-time').value = c.time || '12:00';
      if (c.place) {
        $('#c-place').value = c.place;
        dsCity.setCity({ name: c.place, lat: c.lat, lon: c.lon, tz: c.tz || 'Asia/Kolkata' });
      }
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dateVal = $('#ds-date').value;
    const timeVal = $('#ds-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = dsCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({
      year: y, month: m, day: d,
      hour: hh, minute: mm,
      lat: c.lat, lon: c.lon,
      tzMinutes
    });

    const now = Date.now();
    const dashas = out.dashas || [];
    let currentM = null, currentA = null;

    for (const md of dashas) {
      if (md.sub) {
        for (const ad of md.sub) {
          if (now >= ad.start && now <= ad.end) {
            currentM = md;
            currentA = ad;
            break;
          }
        }
      }
      if (currentA) break;
    }

    const fmtD = ms => dateFmt.format(new Date(ms));

    const mRows = dashas.map(md => {
      const isCurrent = currentM && currentM.lord === md.lord;
      const subRows = (md.sub || []).map(ad => {
        const isCurrentAd = currentA && currentA.lord === ad.lord && currentM && currentM.lord === md.lord;
        return `
          <tr style="${isCurrentAd ? 'background:rgba(212,175,55,0.12);font-weight:bold;' : ''}">
            <td style="padding-left:1.5rem;">${isCurrentAd ? '▶ ' : ''}${gn(md.lord)} – ${gn(ad.lord)}</td>
            <td>${fmtD(ad.start)}</td>
            <td>${fmtD(ad.end)}</td>
            <td>${isCurrentAd ? '<span class="tag good">Active Now</span>' : ''}</td>
          </tr>
        `;
      }).join('');

      return `
        <tbody style="border-top:1px solid var(--border);">
          <tr style="${isCurrent ? 'background:rgba(212,175,55,0.08);' : ''}">
            <td><strong>${gimg(md.lord, 'gimg sm')} ${gn(md.lord)} Mahadasha</strong></td>
            <td><strong>${fmtD(md.start)}</strong></td>
            <td><strong>${fmtD(md.end)}</strong></td>
            <td>${isCurrent ? '<span class="tag gold">Current Dasha</span>' : ''}</td>
          </tr>
          ${subRows}
        </tbody>
      `;
    }).join('');

    res.innerHTML = `
      <div class="dasha-results reveal" style="margin-top:1.5rem;">
        ${currentM && currentA ? `
          <div class="card pq-verdict good">
            <span class="eyebrow">Active Vimshottari Planetary Period</span>
            <h2>${gn(currentM.lord)} Mahadasha — ${gn(currentA.lord)} Antardasha</h2>
            <p>From <strong>${fmtD(currentA.start)}</strong> until <strong>${fmtD(currentA.end)}</strong></p>
            <dl class="pq-facts" style="margin-top:1rem;">
              <div><dt>Major Ruler (महादशा)</dt><dd>${gn(currentM.lord)}</dd></div>
              <div><dt>Sub-Period Ruler (अंतर्दशा)</dt><dd>${gn(currentA.lord)}</dd></div>
              <div><dt>Birth Nakshatra</dt><dd>${nk(out.lagna.nak)}</dd></div>
              <div><dt>Dasha Balance at Birth</dt><dd>${out.balance ? `${gn(out.balance.lord)} (${out.balance.years.toFixed(2)} yrs)` : 'Calculated'}</dd></div>
            </dl>
          </div>
        ` : ''}

        <div class="card reveal" style="margin-top:1.5rem;">
          <h3>Complete Lifetime Dasha Timeline</h3>
          <p class="muted small">Vimshottari 120-year cycle computed from your exact Moon degree at birth.</p>
          <div class="tablewrap" style="overflow-x:auto;">
            <table class="seo-table">
              <thead>
                <tr>
                  <th>Period (Mahadasha – Antardasha)</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              ${mRows}
            </table>
          </div>
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
