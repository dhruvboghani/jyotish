/* Ashtakavarga Points Calculator */
(() => {
  const form = $('#ak-form'), res = $('#ak-res');
  if (!form || !res) return;

  const akCity = cityPicker(() => {});
  bindSavedKundali('#ak-saved', b => {
    $('#ak-name').value = b.name || '';
    $('#ak-date').value = isoDay(b.year, b.month, b.day);
    $('#ak-time').value = `${pad(b.hour)}:${pad(b.minute)}`;
    if (b.placeLabel) akCity.set({ name: b.placeLabel, lat: b.lat, lon: b.lon, tz: 'Asia/Kolkata' });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!window.Jyotish) {
      alert('Astrology calculation engine is loading, please try again in a moment.');
      return;
    }
    const dateVal = $('#ak-date').value, timeVal = $('#ak-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = akCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({ year: y, month: m, day: d, hour: hh, minute: mm, lat: c.lat, lon: c.lon, tzMinutes });
    const sav = out.sav || [];
    const lagnaSign = out.lagna.sign;

    const cards = sav.map((pts, sIdx) => {
      const houseNum = (sIdx - lagnaSign + 12) % 12 + 1;
      let tone = 'good', badge = 'Strong (शुभ)';
      if (pts >= 30) { tone = 'gold'; badge = 'Very Strong (अति शुभ)'; }
      else if (pts < 25) { tone = 'warn'; badge = 'Sensitive (सावधानी)'; }
      else if (pts < 28) { tone = 'mixed'; badge = 'Average (मध्यम)'; }

      return `
        <div class="card" style="padding:1.25rem 1rem;text-align:center;border-top:3px solid ${pts >= 28 ? 'var(--gold)' : pts < 25 ? 'var(--warn)' : 'var(--line-2)'};display:flex;flex-direction:column;align-items:center;gap:6px;">
          <span class="muted small" style="display:inline-flex;align-items:center;gap:4px;">${rg(sIdx, 'rg sm')} ${rn(sIdx)}</span>
          <h4 style="margin:0.25rem 0;font-size:1.05rem;">House ${houseNum}</h4>
          <div style="font-size:1.85rem;font-weight:700;color:${pts >= 28 ? 'var(--gold-deep)' : pts < 25 ? 'var(--warn)' : 'inherit'};">${pts} <small style="font-size:0.85rem;font-weight:400;color:var(--ink-3);">pts</small></div>
          <span class="tag ${tone}" style="font-size:0.75rem;">${badge}</span>
        </div>
      `;
    }).join('');

    const h11 = sav[(lagnaSign + 10) % 12] || 0;
    const h12 = sav[(lagnaSign + 11) % 12] || 0;
    const wealthVerdict = h11 > h12
      ? '11th House of Gains (' + h11 + ' pts) exceeds 12th House of Expenses (' + h12 + ' pts) — Excellent natural wealth accumulation!'
      : '11th House of Gains (' + h11 + ' pts) and 12th House of Expenses (' + h12 + ' pts) suggest conscious budgeting and disciplined investments.';

    res.innerHTML = `
      <div class="ashtakavarga-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict good">
          <span class="eyebrow">Samudayashtakavarga (SAV) Points Overview</span>
          <h2>Total 337 Auspicious Bindus Calculated</h2>
          <p>Ashtakavarga evaluates planetary strength across all 12 houses. Points of 28 or higher denote strong, fruitful houses; points under 25 benefit from patience and remedies.</p>
          <p style="margin-top:0.75rem;"><span class="tag gold" style="font-size:0.85rem;">Financial Flow Index</span> <strong>${wealthVerdict}</strong></p>
        </div>

        <div class="card details-card reveal" style="margin-top:1.5rem;">
          <div class="details-card-header">
            <h3>12-House Bindu Distribution (SAV)</h3>
            <p class="muted small">Scores for each house from your Ascendant (${rn(lagnaSign)}).</p>
          </div>
          <div class="ashtakavarga-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:1rem;margin-top:1rem;">
            ${cards}
          </div>
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
