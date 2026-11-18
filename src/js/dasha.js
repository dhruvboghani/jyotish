/* Vimshottari Dasha Planner & Timeline */
(() => {
  const form = $('#ds-form'), res = $('#ds-res');
  if (!form || !res) return;

  const dsCity = cityPicker(() => {});
  bindSavedKundali('#ds-saved', b => {
    $('#ds-name').value = b.name || '';
    $('#ds-date').value = isoDay(b.year, b.month, b.day);
    $('#ds-time').value = `${pad(b.hour)}:${pad(b.minute)}`;
    if (b.placeLabel) dsCity.set({ name: b.placeLabel, lat: b.lat, lon: b.lon, tz: 'Asia/Kolkata' });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!window.Jyotish) {
      alert('Astrology calculation engine is loading, please try again in a moment.');
      return;
    }
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
          <tr style="${isCurrentAd ? 'background:rgba(212,175,55,0.12);font-weight:600;' : ''}">
            <td style="padding-left:2.5rem;"><span class="gr-cell" style="font-weight:normal;">${isCurrentAd ? '▶ ' : '└─ '}${g(ad.lord, 'gimg sm')} ${gn(ad.lord)}</span></td>
            <td class="nowrap">${fmtD(ad.start)}</td>
            <td class="nowrap">${fmtD(ad.end)}</td>
            <td class="nowrap">${isCurrentAd ? '<span class="tag good">Active Now</span>' : ''}</td>
          </tr>
        `;
      }).join('');

      return `
        <tbody style="border-top:2px solid var(--line-2);">
          <tr style="${isCurrent ? 'background:rgba(212,175,55,0.08);' : 'background:var(--surface-2, rgba(0,0,0,.01));'}">
            <td><span class="gr-cell">${g(md.lord, 'gimg sm')}<b>${gn(md.lord)} Mahadasha</b></span></td>
            <td class="nowrap"><strong>${fmtD(md.start)}</strong></td>
            <td class="nowrap"><strong>${fmtD(md.end)}</strong></td>
            <td class="nowrap">${isCurrent ? '<span class="tag gold">Current Dasha</span>' : ''}</td>
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
              <div><dt>Major Ruler (महादशा)</dt><dd>${g(currentM.lord, 'gimg sm')} ${gn(currentM.lord)}</dd></div>
              <div><dt>Sub-Period Ruler (अंतर्दशा)</dt><dd>${g(currentA.lord, 'gimg sm')} ${gn(currentA.lord)}</dd></div>
              <div><dt>Birth Nakshatra</dt><dd>${nk(out.lagna.nak)}</dd></div>
              <div><dt>Dasha Balance at Birth</dt><dd>${out.balance ? `${g(out.balance.lord, 'gimg sm')} ${gn(out.balance.lord)} (${out.balance.years.toFixed(2)} yrs)` : 'Calculated'}</dd></div>
            </dl>
          </div>
        ` : ''}

        <div class="card details-card reveal" style="margin-top:1.5rem;">
          <div class="details-card-header">
            <h3>Complete Lifetime Dasha Timeline</h3>
            <p class="muted small">Vimshottari 120-year cycle computed from your exact Moon degree at birth.</p>
          </div>
          <div class="tablewrap">
            <table class="mod-table">
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
