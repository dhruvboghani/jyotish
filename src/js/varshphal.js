/* Varshphal (Tajika Annual Solar Return) Chart */
(() => {
  const form = $('#vp-form'), res = $('#vp-res'), saved = $('#vp-saved'), ySel = $('#vp-year');
  if (!form || !res) return;

  const curY = new Date().getFullYear();
  if (ySel) {
    ySel.innerHTML = [-1, 0, 1, 2, 3, 4, 5].map(k => {
      const yr = curY + k;
      return `<option value="${yr}"${yr === curY ? ' selected' : ''}>${yr} (${yr}–${yr + 1})</option>`;
    }).join('');
  }

  const vpCity = cityPicker(() => {});
  if (saved && typeof fillSavedSelect === 'function') {
    fillSavedSelect(saved, c => {
      if (!c) return;
      $('#vp-name').value = c.name || '';
      $('#vp-date').value = c.date || '';
      $('#vp-time').value = c.time || '12:00';
      if (c.place) {
        $('#c-place').value = c.place;
        vpCity.setCity({ name: c.place, lat: c.lat, lon: c.lon, tz: c.tz || 'Asia/Kolkata' });
      }
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dateVal = $('#vp-date').value, timeVal = $('#vp-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = vpCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({ year: y, month: m, day: d, hour: hh, minute: mm, lat: c.lat, lon: c.lon, tzMinutes });
    const targetY = parseInt(ySel.value, 10) || curY;
    const completedYears = Math.max(0, targetY - y);

    // Muntha calculation: moves 1 sign forward per completed year of life
    const natalLagna = out.lagna.sign;
    const munthaSign = (natalLagna + completedYears) % 12;
    const munthaHouse = (munthaSign - natalLagna + 12) % 12 + 1;
    const munthaLord = SIGN_LORD[munthaSign];

    let tone = 'good', badge = '✨ Auspicious (शुभ वर्ष)', verdict = 'Muntha occupies a strong benefic house, promising expansion, recognition, and progress.';
    if ([6, 8, 12].includes(munthaHouse)) {
      tone = 'warn';
      badge = '⚖️ Caution (धैर्य एवं सावधानी)';
      verdict = 'Muntha sits in a dusthana house (6, 8, or 12). Prioritize health, avoid high-risk speculation, and practice steady routine.';
    } else if ([9, 10, 11].includes(munthaHouse)) {
      tone = 'gold';
      badge = '🌟 Golden Year of Fortune (भाग्योदय वर्ष)';
      verdict = 'Muntha in the 9th, 10th, or 11th house signifies major breakthroughs in career, spiritual elevation, and lucrative gains!';
    }

    res.innerHTML = `
      <div class="varshphal-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict ${tone}">
          <span class="eyebrow">Tajika Annual Horoscope for ${targetY} (Age ${completedYears})</span>
          <h2>Muntha in ${rn(munthaSign)} (${munthaHouse}th House) — ${badge}</h2>
          <p>${verdict}</p>
          <dl class="pq-facts" style="margin-top:1rem;">
            <div><dt>Muntha Sign</dt><dd>${rn(munthaSign)}</dd></div>
            <div><dt>Muntha Lord (मुंथेश)</dt><dd>${gn(munthaLord)}</dd></div>
            <div><dt>Muntha House</dt><dd>${munthaHouse}th House from Lagna</dd></div>
            <div><dt>Completed Age</dt><dd>${completedYears} Years</dd></div>
          </dl>
        </div>

        <div class="card reveal" style="margin-top:1.5rem;">
          <h3>Annual Guidance for ${targetY}</h3>
          <ul class="factor-list">
            <li class="good">${toneIcon('good')}<span><strong>Muntha Lord Focus:</strong> Chanting the mantra of <strong>${gn(munthaLord)}</strong> strengthens the year's governing focal point.</span></li>
            <li class="good">${toneIcon('good')}<span><strong>Life Sphere:</strong> The ${munthaHouse}th house themes will be central to your major decisions, travels, and investments during ${targetY}.</span></li>
            <li class="good">${toneIcon('good')}<span><strong>Key Advice:</strong> Maintain equilibrium between personal vitality and professional responsibilities to harness this year's planetary cycle.</span></li>
          </ul>
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
