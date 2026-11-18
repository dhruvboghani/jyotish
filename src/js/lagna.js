/* Lagna (Ascendant / Rising Sign) Calculator */
(() => {
  const form = $('#lg-form'), res = $('#lg-res');
  if (!form || !res) return;

  const lgCity = cityPicker(() => {});
  bindSavedKundali('#lg-saved', b => {
    $('#lg-name').value = b.name || '';
    $('#lg-date').value = isoDay(b.year, b.month, b.day);
    $('#lg-time').value = `${pad(b.hour)}:${pad(b.minute)}`;
    if (b.placeLabel) lgCity.set({ name: b.placeLabel, lat: b.lat, lon: b.lon, tz: 'Asia/Kolkata' });
  });

  const LAGNA_TRAITS = [
    { el: 'Fire', col: 'Red / Coral', stone: 'Red Coral', num: '1, 9', dir: 'East', desc: 'Courageous, energetic, pioneering, dynamic natural leaders with high physical vitality.' },
    { el: 'Earth', col: 'White / Cream', stone: 'Diamond / Opal', num: '2, 6', dir: 'South', desc: 'Patient, stable, loyal, lovers of art and comfort, grounded, practical wealth-builders.' },
    { el: 'Air', col: 'Green / Emerald', stone: 'Emerald', num: '5, 3', dir: 'West', desc: 'Intellectual, communicative, versatile, fast thinkers, witty, great in commerce and media.' },
    { el: 'Water', col: 'White / Silver', stone: 'Pearl', num: '2, 7', dir: 'North', desc: 'Intuitive, nurturing, empathetic, highly imaginative, protective of family and emotions.' },
    { el: 'Fire', col: 'Gold / Orange', stone: 'Ruby', num: '1, 5', dir: 'East', desc: 'Regal, charismatic, magnanimous, proud, born administrators with natural commanding presence.' },
    { el: 'Earth', col: 'Green / Pastel', stone: 'Emerald', num: '5, 6', dir: 'South', desc: 'Analytical, detail-oriented, methodical, service-oriented, sharp financial and editing minds.' },
    { el: 'Air', col: 'Blue / White', stone: 'Diamond / Sapphire', num: '6, 8', dir: 'West', desc: 'Harmonious, diplomatic, charming, aesthetic, great negotiators and lovers of justice.' },
    { el: 'Water', col: 'Maroon / Red', stone: 'Red Coral', num: '9, 3', dir: 'North', desc: 'Intense, profound, investigative, resilient, deep emotional depth and investigative willpower.' },
    { el: 'Fire', col: 'Yellow / Gold', stone: 'Yellow Sapphire', num: '3, 9', dir: 'East', desc: 'Philosophical, optimistic, truthful, mentors, lifelong seekers of higher wisdom and adventure.' },
    { el: 'Earth', col: 'Dark Blue / Black', stone: 'Blue Sapphire', num: '8, 4', dir: 'South', desc: 'Disciplined, pragmatic, ambitious, perseverant, masters of long-term structure and legacy.' },
    { el: 'Air', col: 'Electric Blue / Navy', stone: 'Blue Sapphire', num: '8, 7', dir: 'West', desc: 'Visionary, humanitarian, independent, progressive thinkers who champion collective causes.' },
    { el: 'Water', col: 'Sea Green / Yellow', stone: 'Yellow Sapphire', num: '3, 7', dir: 'North', desc: 'Spiritual, compassionate, artistic, dreamers, deeply connected to universal empathy.' }
  ];

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!window.Jyotish) {
      alert('Astrology calculation engine is loading, please try again in a moment.');
      return;
    }
    const dateVal = $('#lg-date').value;
    const timeVal = $('#lg-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = lgCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({
      year: y, month: m, day: d,
      hour: hh, minute: mm,
      lat: c.lat, lon: c.lon,
      tzMinutes
    });

    const l = out.lagna;
    const info = LAGNA_TRAITS[l.sign];
    const lord = SIGN_LORD[l.sign];
    const lordPlanet = out.P[lord];

    const bySign = Array.from({ length: 12 }, () => []);
    ORDER.forEach(p => {
      const pl = out.P[p];
      bySign[pl.sign].push({ t: ga(p), c: COL[p], r: pl.retro });
    });

    const chartHtml = typeof drawChart === 'function' ? drawChart({
      asc: l.sign,
      bySign,
      title: `${rn(l.sign)} Lagna Chart`,
      sub: `${dateVal} ${timeVal}`
    }) : '';

    res.innerHTML = `
      <div class="lagna-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict good">
          <span class="eyebrow">Your Ascendant (लग्न) Profile</span>
          <h2>${rn(l.sign)} Lagna (${l.sign + 1}) — ${dm(l.deg)}</h2>
          <p>You rise as a <strong>${rn(l.sign)}</strong> ascendant. The Lagna describes your physical body, temperament, vitality, and primary life lens.</p>
          <dl class="pq-facts" style="margin-top:1rem;">
            <div><dt>Lagna Nakshatra</dt><dd>${nk(l.nak)} (Pada ${l.pada})</dd></div>
            <div><dt>Nakshatra Lord</dt><dd>${gn(l.nakLord)}</dd></div>
            <div><dt>Lagna Lord (लग्न स्वामी)</dt><dd>${gn(lord)} (in ${lordPlanet.house}th house, ${rn(lordPlanet.sign)})</dd></div>
            <div><dt>Element (तत्व)</dt><dd>${info.el}</dd></div>
          </dl>
        </div>

        <div class="lagna-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1.5rem;margin-top:1rem;">
          <div class="card chart reveal">${chartHtml}</div>
          <div class="card reveal">
            <h3>Personality & Physical Blueprint</h3>
            <p>${info.desc}</p>
            <h4 style="margin-top:1rem;">Auspicious Alignments (शुभ कारक)</h4>
            <ul class="factor-list">
              <li class="good">${toneIcon('good')}<span><strong>Lucky Colors:</strong> ${info.col}</span></li>
              <li class="good">${toneIcon('good')}<span><strong>Benefic Gemstone:</strong> ${info.stone}</span></li>
              <li class="good">${toneIcon('good')}<span><strong>Favorable Numbers:</strong> ${info.num}</span></li>
              <li class="good">${toneIcon('good')}<span><strong>Auspicious Direction:</strong> ${info.dir}</span></li>
            </ul>
          </div>
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
