/* Ashtakavarga Points Calculator */
(() => {
  const form = $('#ak-form'), res = $('#ak-res'), saved = $('#ak-saved');
  if (!form || !res) return;

  const akCity = cityPicker(() => {});
  if (saved && typeof fillSavedSelect === 'function') {
    fillSavedSelect(saved, c => {
      if (!c) return;
      $('#ak-name').value = c.name || '';
      $('#ak-date').value = c.date || '';
      $('#ak-time').value = c.time || '12:00';
      if (c.place) {
        $('#c-place').value = c.place;
        akCity.setCity({ name: c.place, lat: c.lat, lon: c.lon, tz: c.tz || 'Asia/Kolkata' });
      }
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dateVal = $('#ak-date').value, timeVal = $('#ak-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = akCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({ year: y, month: m, day: d, hour: hh, minute: mm, lat: c.lat, lon: c.lon, tzMinutes });
    const sav = out.sav || [];
    const L = out.lagna.sign;

    const cards = sav.map((pts, sIdx) => {
      const houseNum = (sIdx - L + 12) % 12 + 1;
      let tone = 'good', badge = 'Strong (शुभ)';
      if (pts >= 30) { tone = 'gold'; badge = 'Very Strong (अति शुभ)'; }
      else if (pts < 25) { tone = 'warn'; badge = 'Sensitive (सावधानी)'; }
      else if (pts < 28) { tone = 'mixed'; badge = 'Average (मध्यम)'; }

      return `
        <div class="card" style="padding:1rem;text-align:center;border-top:3px solid ${pts >= 28 ? 'var(--gold)' : 'var(--border)'};">
          <span class="muted small">${rn(sIdx)}</span>
          <h4 style="margin:0.25rem 0;">House ${houseNum}</h4>
          <div style="font-size:1.75rem;font-weight:bold;color:${pts >= 28 ? 'var(--gold-deep)' : 'inherit'};">${pts}</div>
          <small><span class="tag ${tone}" style="font-size:0.75rem;">${badge}</span></small>
        </div>
      `;
    }).join('');

    const h11 = sav[(L + 10) % 12] || 0;
    const h12 = sav[(L + 11) % 12] || 0;
    const wealthVerdict = h11 > h12
      ? '11th House of Gains (' + h11 + ' pts) exceeds 12th House of Expenses (' + h12 + ' pts) — Excellent natural wealth accumulation!'
      : '11th House of Gains (' + h11 + ' pts) and 12th House of Expenses (' + h12 + ' pts) suggest conscious budgeting and disciplined investments.';

    res.innerHTML = `
      <div class="ashtakavarga-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict good">
          <span class="eyebrow">Samudayashtakavarga (SAV) Points Overview</span>
          <h2>Total 337 Auspicious Bindus Calculated</h2>
          <p>Ashtakavarga evaluates planetary strength across all 12 houses. Points of 28 or higher denote strong, fruitful houses; points under 25 benefit from patience and remedies.</p>
          <p style="margin-top:0.75rem;"><strong>Financial Flow Index:</strong> ${wealthVerdict}</p>
        </div>

        <h3 style="margin-top:1.5rem;">12-House Bindu Distribution (SAV)</h3>
        <div class="ashtakavarga-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem;margin-top:1rem;">
          ${cards}
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
