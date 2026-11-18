/* Yoga & Raj Yoga Analyzer */
(() => {
  const form = $('#yg-form'), res = $('#yg-res');
  if (!form || !res) return;

  const ygCity = cityPicker(() => {});
  bindSavedKundali('#yg-saved', b => {
    $('#yg-name').value = b.name || '';
    $('#yg-date').value = isoDay(b.year, b.month, b.day);
    $('#yg-time').value = `${pad(b.hour)}:${pad(b.minute)}`;
    if (b.placeLabel) ygCity.set({ name: b.placeLabel, lat: b.lat, lon: b.lon, tz: 'Asia/Kolkata' });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!window.Jyotish) {
      alert('Astrology calculation engine is loading, please try again in a moment.');
      return;
    }
    const dateVal = $('#yg-date').value, timeVal = $('#yg-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = ygCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({ year: y, month: m, day: d, hour: hh, minute: mm, lat: c.lat, lon: c.lon, tzMinutes });
    const P = out.P, L = out.lagna.sign, lordOf = h => SIGN_LORD[(L + h - 1) % 12];

    const yogas = [];

    // 1. Gajakesari Yoga
    const jFromM = (P.Jupiter.sign - P.Moon.sign + 12) % 12 + 1;
    if ([1, 4, 7, 10].includes(jFromM)) {
      yogas.push({ name: 'Gajakesari Yoga (गजकेसरी योग)', cat: 'Raj Yoga', desc: 'Jupiter is in a Kendra (1st, 4th, 7th, or 10th) from the Moon. Bestows noble character, public respect, lasting prosperity, and intellectual eloquence.' });
    }

    // 2. Budhaditya Yoga
    if (P.Sun.sign === P.Mercury.sign && Math.abs(P.Sun.deg - P.Mercury.deg) > 3) {
      yogas.push({ name: 'Budhaditya Yoga (बुधादित्य योग)', cat: 'Intellect & Status', desc: 'Sun and Mercury conjunct in the same sign without severe combustion. Confers sharp intellect, administrative flair, and mathematical brilliance.' });
    }

    // 3. Panch Mahapurusha Yogas
    const isKendra = h => [1, 4, 7, 10].includes(h);
    if (isKendra(P.Mars.house) && [0, 7, 9].includes(P.Mars.sign)) {
      yogas.push({ name: 'Ruchaka Yoga (रुचक योग - मंगल)', cat: 'Maha Purusha Yoga', desc: 'Mars is in a Kendra in own or exaltation sign. Grants immense courage, athletic vitality, land/property ownership, and tactical leadership.' });
    }
    if (isKendra(P.Mercury.house) && [2, 5].includes(P.Mercury.sign)) {
      yogas.push({ name: 'Bhadra Yoga (भद्र योग - बुध)', cat: 'Maha Purusha Yoga', desc: 'Mercury is in a Kendra in Gemini or Virgo. Confers exceptional analytical intellect, scholarly eloquence, and commercial success.' });
    }
    if (isKendra(P.Jupiter.house) && [3, 8, 11].includes(P.Jupiter.sign)) {
      yogas.push({ name: 'Hamsa Yoga (हंस योग - गुरु)', cat: 'Maha Purusha Yoga', desc: 'Jupiter is in a Kendra in Cancer, Sagittarius, or Pisces. Bestows noble wisdom, spiritual purity, righteous conduct, and high societal reverence.' });
    }
    if (isKendra(P.Venus.house) && [1, 6, 11].includes(P.Venus.sign)) {
      yogas.push({ name: 'Malavya Yoga (मालव्य योग - शुक्र)', cat: 'Maha Purusha Yoga', desc: 'Venus is in a Kendra in Taurus, Libra, or Pisces. Grants aesthetic mastery, luxurious conveyances, charm, artistic flair, and domestic bliss.' });
    }
    if (isKendra(P.Saturn.house) && [6, 9, 10].includes(P.Saturn.sign)) {
      yogas.push({ name: 'Sasa Yoga (शश योग - शनि)', cat: 'Maha Purusha Yoga', desc: 'Saturn is in a Kendra in Libra, Capricorn, or Aquarius. Grants iron discipline, authority over masses, organizational perseverance, and enduring legacy.' });
    }

    // 4. Dharma-Karmadhipati Yoga
    const l9 = lordOf(9), l10 = lordOf(10);
    if (P[l9] && P[l10] && (P[l9].sign === P[l10].sign || P[l9].house === 10 || P[l10].house === 9)) {
      yogas.push({ name: 'Dharma-Karmadhipati Yoga (धर्म-कर्माधिपति योग)', cat: 'Supreme Raj Yoga', desc: 'Lords of the 9th (fortune) and 10th (career) houses are intimately connected. One of the highest yogas for career fame, executive power, and public triumph.' });
    }

    // 5. Vipareeta Raj Yoga
    const dusthana = [6, 8, 12];
    const l6 = lordOf(6), l8 = lordOf(8), l12 = lordOf(12);
    if (dusthana.includes(P[l6].house) || dusthana.includes(P[l8].house) || dusthana.includes(P[l12].house)) {
      yogas.push({ name: 'Vipareeta Raj Yoga (विपरीत राजयोग)', cat: 'Crisis into Triumph', desc: 'Lords of challenging dusthana houses occupy dusthana houses. Turns competitive crises and unexpected twists into sudden breakthroughs.' });
    }

    // 6. Amala Yoga
    const bIn10 = out.planets.filter(p => p.house === 10 && ['Jupiter', 'Venus', 'Mercury'].includes(p.name));
    if (bIn10.length) {
      yogas.push({ name: 'Amala Yoga (अमला योग)', cat: 'Stainless Reputation', desc: 'Natural benefic planet occupies the 10th house of career. Bestows unblemished professional reputation, ethical success, and enduring respect.' });
    }

    res.innerHTML = `
      <div class="yogas-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict good">
          <span class="eyebrow">${esc(out.avakahada.rashi)} Rashi · ${esc(out.avakahada.nak)} Nakshatra</span>
          <h2>${yogas.length} Auspicious Yogas Detected</h2>
          <p>Planetary combinations present in your birth chart that shape your strengths, wealth, and destiny.</p>
        </div>

        <div class="card reveal" style="margin-top:1.5rem;">
          <ul class="factor-list">
            ${yogas.map(y => `
              <li class="good" style="align-items:flex-start;">
                ${toneIcon('good')}
                <div>
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <strong>${esc(y.name)}</strong>
                    <span class="tag gold">${esc(y.cat)}</span>
                  </div>
                  <p class="small muted" style="margin:0.25rem 0 0;">${esc(y.desc)}</p>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
