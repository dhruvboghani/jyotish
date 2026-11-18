/* Mangal Dosha (Manglik) Calculator */
(() => {
  const form = $('#mg-form'), res = $('#mg-res');
  if (!form || !res) return;

  const mgCity = cityPicker(() => {});
  bindSavedKundali('#mg-saved', b => {
    $('#mg-name').value = b.name || '';
    $('#mg-date').value = isoDay(b.year, b.month, b.day);
    $('#mg-time').value = `${pad(b.hour)}:${pad(b.minute)}`;
    if (b.placeLabel) mgCity.set({ name: b.placeLabel, lat: b.lat, lon: b.lon, tz: 'Asia/Kolkata' });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!window.Jyotish) {
      alert('Astrology calculation engine is loading, please try again in a moment.');
      return;
    }
    const dateVal = $('#mg-date').value;
    const timeVal = $('#mg-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = mgCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({
      year: y, month: m, day: d,
      hour: hh, minute: mm,
      lat: c.lat, lon: c.lon,
      tzMinutes
    });

    const mg = out.manglik || {};
    const mars = out.P.Mars;
    const jup = out.P.Jupiter;

    const cancels = [];
    if (mars.sign === 0 || mars.sign === 7) cancels.push('Mars is in its own sign (Aries/Scorpio) — Mangal Dosha is mitigated.');
    if (mars.sign === 9) cancels.push('Mars is in exaltation (Capricorn) — Malefic influence is nullified.');
    if (mg.houseL === 2 && (mars.sign === 2 || mars.sign === 5)) cancels.push('Mars in 2nd house in Gemini/Virgo cancels dosha.');
    if (mg.houseL === 4 && (mars.sign === 0 || mars.sign === 7)) cancels.push('Mars in 4th house in Aries/Scorpio cancels dosha.');
    if (mg.houseL === 7 && (mars.sign === 3 || mars.sign === 9)) cancels.push('Mars in 7th house in Cancer/Capricorn cancels dosha.');
    if (mg.houseL === 8 && (mars.sign === 8 || mars.sign === 11)) cancels.push('Mars in 8th house in Sagittarius/Pisces cancels dosha.');
    if (mg.houseL === 12 && (mars.sign === 1 || mars.sign === 6)) cancels.push('Mars in 12th house in Taurus/Libra cancels dosha.');

    const jupAsp = jup && [5, 7, 9].includes((mars.house - jup.house + 12) % 12 + 1);
    if (jupAsp) cancels.push('Divine Jupiter casts a full benefic aspect on Mars, softening any adverse effects.');

    const isL = !!mg.lagna, isM = !!mg.moon, isV = !!mg.venus;
    const isCancelled = cancels.length > 0;
    let verdictClass = 'good', verdictText = 'No Mangal Dosha (Non-Manglik)', verdictDesc = 'Mars does not occupy any of the sensitive houses (1st, 2nd, 4th, 7th, 8th, or 12th) from your Ascendant.';

    if (isL && isCancelled) {
      verdictClass = 'good';
      verdictText = 'Mangal Dosha Cancelled (दोष भंग / निष्प्रभावी)';
      verdictDesc = 'Although Mars occupies a sensitive house, classical exceptions fully cancel the dosha in your chart.';
    } else if (isL) {
      verdictClass = 'warn';
      verdictText = 'Poorna Manglik (पूर्ण मांगलिक)';
      verdictDesc = 'Mars occupies a sensitive house from your Ascendant (Lagna). Marriage compatibility with another Manglik or cancellation check is advised.';
    } else if (isM || isV) {
      verdictClass = 'mixed';
      verdictText = 'Anshik Manglik (आंशिक / सौम्य मांगलिक)';
      verdictDesc = 'Mars is in a sensitive house from the Moon or Venus only, which gives a mild, easily manageable influence.';
    }

    res.innerHTML = `
      <div class="mangal-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict ${verdictClass}">
          <span class="eyebrow">${esc(out.avakahada.rashi)} Rashi · ${esc(out.avakahada.nak)} Nakshatra</span>
          <h2>${verdictText}</h2>
          <p>${verdictDesc}</p>
          <dl class="pq-facts" style="margin-top:1rem;">
            <div><dt>From Lagna (Ascendant)</dt><dd>${rg(out.lagna.sign, 'rg sm')} ${mg.houseL}th House — <strong>${isL ? '<span class="tag warn">Manglik</span>' : '<span class="tag good">Clear</span>'}</strong></dd></div>
            <div><dt>From Chandra (Moon)</dt><dd>${g('Moon', 'gimg sm')} ${mg.houseM}th House — <strong>${isM ? '<span class="tag warn">Manglik</span>' : '<span class="tag good">Clear</span>'}</strong></dd></div>
            <div><dt>From Shukra (Venus)</dt><dd>${g('Venus', 'gimg sm')} ${mg.houseV}th House — <strong>${isV ? '<span class="tag warn">Manglik</span>' : '<span class="tag good">Clear</span>'}</strong></dd></div>
            <div><dt>Mars Sign & Deg</dt><dd>${g('Mars', 'gimg sm')} <strong>${rn(mars.sign)}</strong> <small>${dm(mars.deg)}</small></dd></div>
          </dl>
        </div>

        ${cancels.length ? `
          <div class="card details-card reveal" style="margin-top:1.5rem;">
            <div class="details-card-header">
              <h3>✨ Classical Cancellation Factors (दोष परिहार)</h3>
              <p class="muted small">Exceptions described in Brihat Parashara Hora Shastra that mitigate Martian afflictions.</p>
            </div>
            <ul class="factor-list">
              ${cancels.map(c => `<li class="good">${toneIcon('good')}<span>${esc(c)}</span></li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="card details-card reveal" style="margin-top:1.5rem;">
          <div class="details-card-header">
            <h3>🕉️ Recommended Vedic Remedies for Mars (मंगल शांति उपाय)</h3>
            <p class="muted small">Traditional remedial actions to balance and harness Martian vitality.</p>
          </div>
          <ul class="factor-list">
            <li class="good">${toneIcon('good')}<span><strong>Hanuman Chalisa:</strong> Recite the Hanuman Chalisa daily or on Tuesdays to channelize high Martian energy.</span></li>
            <li class="good">${toneIcon('good')}<span><strong>Charity:</strong> Donate red lentils (masoor dal), red sweets, or blood donation on Tuesdays.</span></li>
            <li class="good">${toneIcon('good')}<span><strong>Respect for Siblings:</strong> Mars represents younger brothers and sisters; nurturing harmonious relationships strengthens positive Martian vitality.</span></li>
          </ul>
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
