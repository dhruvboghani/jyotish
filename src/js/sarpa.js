/* Kaal Sarp & Sarpa Dosha Calculator */
(() => {
  const form = $('#sp-form'), res = $('#sp-res'), saved = $('#sp-saved');
  if (!form || !res) return;

  const spCity = cityPicker(() => {});
  if (saved && typeof fillSavedSelect === 'function') {
    fillSavedSelect(saved, c => {
      if (!c) return;
      $('#sp-name').value = c.name || '';
      $('#sp-date').value = c.date || '';
      $('#sp-time').value = c.time || '12:00';
      if (c.place) {
        $('#c-place').value = c.place;
        spCity.setCity({ name: c.place, lat: c.lat, lon: c.lon, tz: c.tz || 'Asia/Kolkata' });
      }
    });
  }

  const KS_TYPES = [
    null,
    { name: 'Anant Kaal Sarp (अनंत)', rahuH: 1, ketuH: 7, desc: 'Rahu in 1st house, Ketu in 7th. Tests personal identity and partnerships; builds immense inner resilience.' },
    { name: 'Kulik Kaal Sarp (कुलिक)', rahuH: 2, ketuH: 8, desc: 'Rahu in 2nd house, Ketu in 8th. Financial and family speech require patience and discipline.' },
    { name: 'Vasuki Kaal Sarp (वासुकी)', rahuH: 3, ketuH: 9, desc: 'Rahu in 3rd house, Ketu in 9th. Courageous, self-made entrepreneurship with occasional friction with seniors.' },
    { name: 'Shankhpal Kaal Sarp (शंखपाल)', rahuH: 4, ketuH: 10, desc: 'Rahu in 4th house, Ketu in 10th. Tests domestic tranquility and mother’s health; grants high public status later.' },
    { name: 'Padma Kaal Sarp (पद्म)', rahuH: 5, ketuH: 11, desc: 'Rahu in 5th house, Ketu in 11th. Creative genius, scholarly intellect, though minor delays in education or children.' },
    { name: 'Mahapadma Kaal Sarp (महापद्म)', rahuH: 6, ketuH: 12, desc: 'Rahu in 6th house, Ketu in 12th. Strong competitive spirit, victory over rivals and litigation.' },
    { name: 'Takshak Kaal Sarp (तक्षक)', rahuH: 7, ketuH: 1, desc: 'Rahu in 7th house, Ketu in 1st. Demands emotional maturity and patience in marriage and business partnerships.' },
    { name: 'Karkotak Kaal Sarp (कर्कोटक)', rahuH: 8, ketuH: 2, desc: 'Rahu in 8th house, Ketu in 2nd. Deep interest in occult and research; careful handling of sudden assets.' },
    { name: 'Shankhachood Kaal Sarp (शंखचूड़)', rahuH: 9, ketuH: 3, desc: 'Rahu in 9th house, Ketu in 3rd. Tests faith and relationships with father-figures; leads to spiritual awakening.' },
    { name: 'Ghatak Kaal Sarp (घातक)', rahuH: 10, ketuH: 4, desc: 'Rahu in 10th house, Ketu in 4th. Ambitious career trajectory requiring steadfast professional integrity.' },
    { name: 'Vishdhar Kaal Sarp (विषधर)', rahuH: 11, ketuH: 5, desc: 'Rahu in 11th house, Ketu in 5th. High financial ambition and extensive networking with foreign or varied cultures.' },
    { name: 'Sheshnag Kaal Sarp (शेषनाग)', rahuH: 12, ketuH: 6, desc: 'Rahu in 12th house, Ketu in 6th. Foreign residence, secret expenditures, and profound spiritual detachment.' }
  ];

  form.addEventListener('submit', e => {
    e.preventDefault();
    const dateVal = $('#sp-date').value, timeVal = $('#sp-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = spCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({ year: y, month: m, day: d, hour: hh, minute: mm, lat: c.lat, lon: c.lon, tzMinutes });
    const P = out.P;
    const rLon = P.Rahu.lon, kLon = P.Ketu.lon;

    const planets7 = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    let side1 = 0, side2 = 0;

    planets7.forEach(p => {
      const plLon = P[p].lon;
      const diffR = (plLon - rLon + 360) % 360;
      if (diffR < 180) side1++; else side2++;
    });

    const isPoorna = side1 === 7 || side2 === 7;
    const isAnshik = side1 === 6 || side2 === 6;
    const rahuHouse = P.Rahu.house;
    const typeInfo = KS_TYPES[rahuHouse] || KS_TYPES[1];

    let tone = 'good', verdictH = 'No Kaal Sarp Dosha (दोष रहित)', verdictP = 'Planets are distributed across both sides of the Rahu-Ketu axis. You are completely free of Kaal Sarp Dosha.';

    if (isPoorna) {
      tone = 'warn';
      verdictH = `Poorna Kaal Sarp Yoga: ${typeInfo.name}`;
      verdictP = `All 7 planets are strictly enclosed between Rahu (${rahuHouse}th house) and Ketu. While this creates intense perseverance in early life, many prominent historical figures possess this yoga and achieve monumental success.`;
    } else if (isAnshik) {
      tone = 'mixed';
      verdictH = `Anshik Kaal Sarp Yoga (आंशिक / सौम्य)`;
      verdictP = `One planet breaks free of the Rahu-Ketu axis, substantially weakening and neutralizing the malefic intensity of the dosha.`;
    }

    res.innerHTML = `
      <div class="sarpa-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict ${tone}">
          <span class="eyebrow">${rn(out.lagna.sign)} Lagna · Rahu-Ketu Axis Evaluation</span>
          <h2>${verdictH}</h2>
          <p>${verdictP}</p>
          <dl class="pq-facts" style="margin-top:1rem;">
            <div><dt>Rahu Position</dt><dd>${rahuHouse}th House (${rn(P.Rahu.sign)})</dd></div>
            <div><dt>Ketu Position</dt><dd>${P.Ketu.house}th House (${rn(P.Ketu.sign)})</dd></div>
            <div><dt>Type of Yoga</dt><dd>${esc(typeInfo.name)}</dd></div>
            <div><dt>Axis Enclosure</dt><dd>${isPoorna ? 'Full (7/7)' : isAnshik ? 'Partial (6/7)' : 'Open (Balanced)'}</dd></div>
          </dl>
        </div>

        ${isPoorna || isAnshik ? `
          <div class="card reveal" style="margin-top:1rem;">
            <h3>${typeInfo.name} — Life Dynamics</h3>
            <p>${typeInfo.desc}</p>
            <h4 style="margin-top:1rem;">Effective Shiva & Naga Remedies (शांति उपाय)</h4>
            <ul class="factor-list">
              <li class="good">${toneIcon('good')}<span><strong>Maha Mrityunjaya Japa:</strong> Chanting the Maha Mrityunjaya Mantra (*Om Tryambakam...*) 108 times daily calms both Rahu and Ketu.</span></li>
              <li class="good">${toneIcon('good')}<span><strong>Shiva Abhishekam:</strong> Offering raw milk and water on a Shivling on Mondays or Pradosh days pacifies the serpent axis.</span></li>
              <li class="good">${toneIcon('good')}<span><strong>Feed Stray Dogs:</strong> Feeding stray dogs on Saturdays strengthens positive Ketu vibrations and dissolves sudden obstacles.</span></li>
            </ul>
          </div>
        ` : ''}
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
