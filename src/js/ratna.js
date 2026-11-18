/* Rashi Ratna (Vedic Gemstone) Recommender */
(() => {
  const form = $('#rt-form'), res = $('#rt-res');
  if (!form || !res) return;

  const rtCity = cityPicker(() => {});
  bindSavedKundali('#rt-saved', b => {
    $('#rt-name').value = b.name || '';
    $('#rt-date').value = isoDay(b.year, b.month, b.day);
    $('#rt-time').value = `${pad(b.hour)}:${pad(b.minute)}`;
    if (b.placeLabel) rtCity.set({ name: b.placeLabel, lat: b.lat, lon: b.lon, tz: 'Asia/Kolkata' });
  });

  const GEM_INFO = {
    Sun: { name: 'Ruby (माणिक्य)', metal: 'Gold / Copper', finger: 'Ring finger (अनामिका)', day: 'Sunday morning', mantra: 'Om Hram Hreem Hroum Sah Suryaya Namah' },
    Moon: { name: 'Pearl (मोती)', metal: 'Silver', finger: 'Little finger (कनिष्ठिका)', day: 'Monday evening', mantra: 'Om Shram Shreem Shroum Sah Chandraya Namah' },
    Mars: { name: 'Red Coral (मूंगा)', metal: 'Copper / Gold', finger: 'Ring finger (अनामिका)', day: 'Tuesday morning', mantra: 'Om Kram Kreem Kroum Sah Bhaumaya Namah' },
    Mercury: { name: 'Emerald (पन्ना)', metal: 'Gold / Bronze', finger: 'Little finger (कनिष्ठिका)', day: 'Wednesday morning', mantra: 'Om Bram Breem Broum Sah Budhaya Namah' },
    Jupiter: { name: 'Yellow Sapphire (पुखराज)', metal: 'Gold / Brass', finger: 'Index finger (तर्जनी)', day: 'Thursday morning', mantra: 'Om Gram Greem Groum Sah Guruve Namah' },
    Venus: { name: 'Diamond / White Zircon (हीरा)', metal: 'Silver / Platinum', finger: 'Middle or Little finger', day: 'Friday morning', mantra: 'Om Dram Dreem Droum Sah Shukraya Namah' },
    Saturn: { name: 'Blue Sapphire (नीलम)', metal: 'Panchadhatu / Iron', finger: 'Middle finger (मध्यमा)', day: 'Saturday evening', mantra: 'Om Pram Preem Proum Sah Shanaishcharaya Namah' },
    Rahu: { name: 'Hessonite (गोमेद)', metal: 'Silver', finger: 'Middle finger', day: 'Saturday night', mantra: 'Om Bhram Bhreem Bhroum Sah Rahave Namah' },
    Ketu: { name: 'Cat’s Eye (लहसुनिया)', metal: 'Silver / Panchadhatu', finger: 'Little finger', day: 'Thursday night', mantra: 'Om Stram Streem Stroum Sah Ketave Namah' }
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!window.Jyotish) {
      alert('Astrology calculation engine is loading, please try again in a moment.');
      return;
    }
    const dateVal = $('#rt-date').value, timeVal = $('#rt-time').value || '12:00';
    if (!dateVal) { alert('Please enter date of birth'); return; }

    const c = rtCity.city || DEFAULT_PLACE;
    const [y, m, d] = dateVal.split('-').map(Number);
    const [hh, mm] = timeVal.split(':').map(Number);
    const tzMinutes = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, hh, mm);

    const out = window.Jyotish.compute({ year: y, month: m, day: d, hour: hh, minute: mm, lat: c.lat, lon: c.lon, tzMinutes });
    const L = out.lagna.sign, lordOf = h => SIGN_LORD[(L + h - 1) % 12];

    const l1Lord = lordOf(1);
    const l5Lord = lordOf(5);
    const l9Lord = lordOf(9);

    const stones = [
      { type: 'Jeevan Ratna (जीवन रत्न - Life Stone)', lord: l1Lord, role: 'Lagna Lord (1st House) — Boosts health, immunity, self-confidence, and vitality.', ...GEM_INFO[l1Lord] },
      { type: 'Bhagya Ratna (भाग्य रत्न - Fortune Stone)', lord: l9Lord, role: 'Bhagyesh (9th House) — Awakens fortune, higher blessings, career luck, and prosperity.', ...GEM_INFO[l9Lord] },
      { type: 'Karya Ratna (कारक रत्न - Intellect & Education)', lord: l5Lord, role: 'Panchamesh (5th House) — Enhances intellect, memory, decision making, and creative gains.', ...GEM_INFO[l5Lord] }
    ];

    res.innerHTML = `
      <div class="ratna-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict good">
          <span class="eyebrow">${rn(L)} Lagna · Vedic Gemstone Prescription</span>
          <h2>3 Primary Auspicious Gemstones (रत्न परामर्श)</h2>
          <p>In Vedic astrology, gemstones strengthen friendly, benefic house lords. For your <strong>${rn(L)}</strong> ascendant, the lords of the 1st, 5th, and 9th houses are natural benefics.</p>
        </div>

        <div class="ratna-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-top:1.5rem;">
          ${stones.map(s => `
            <div class="card reveal" style="border-top:3px solid var(--gold);">
              <span class="tag gold" style="font-size:0.8rem;">${esc(s.type)}</span>
              <h3 style="margin:0.5rem 0 0.25rem;">${gimg(s.lord, 'gimg sm')} ${esc(s.name)}</h3>
              <p class="muted small">${esc(s.role)}</p>
              <ul class="factor-list" style="margin-top:0.75rem;">
                <li class="good">${toneIcon('good')}<span><strong>Ideal Metal:</strong> ${esc(s.metal)}</span></li>
                <li class="good">${toneIcon('good')}<span><strong>Wearing Finger:</strong> ${esc(s.finger)}</span></li>
                <li class="good">${toneIcon('good')}<span><strong>Auspicious Day:</strong> ${esc(s.day)}</span></li>
                <li class="good">${toneIcon('good')}<span><strong>Energizing Mantra:</strong> <code style="display:block;margin-top:0.25rem;">${esc(s.mantra)}</code></span></li>
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
