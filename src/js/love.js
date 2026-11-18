/* Love & Relationship Compatibility Matcher */
(() => {
  const form = $('#lv-form'), res = $('#lv-res');
  if (!form || !res) return;

  const bCity = cityPicker(() => {}, 'b');
  const gCity = cityPicker(() => {}, 'g');

  ['b', 'g'].forEach(p => {
    const sel = $(`.pick-saved[data-p="${p}"]`);
    if (sel && typeof fillSavedSelect === 'function') {
      fillSavedSelect(sel, c => {
        if (!c) return;
        $(`#${p}-name`).value = c.name || '';
        $(`#${p}-date`).value = c.date || '';
        $(`#${p}-time`).value = c.time || '12:00';
        if (c.place) {
          $(`#${p}-place`).value = c.place;
          (p === 'b' ? bCity : gCity).setCity({ name: c.place, lat: c.lat, lon: c.lon, tz: c.tz || 'Asia/Kolkata' });
        }
      });
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const bDate = $('#b-date').value, gDate = $('#g-date').value;
    if (!bDate || !gDate) { alert('Please enter birth dates for both partners.'); return; }

    const bc = bCity.city || DEFAULT_PLACE, gc = gCity.city || DEFAULT_PLACE;
    const [by, bm, bd] = bDate.split('-').map(Number), [btH, btM] = ($('#b-time').value || '12:00').split(':').map(Number);
    const [gy, gm, gd] = gDate.split('-').map(Number), [gtH, gtM] = ($('#g-time').value || '12:00').split(':').map(Number);

    const bTz = tzOffsetMinutes(bc.tz || 'Asia/Kolkata', by, bm, bd, btH, btM);
    const gTz = tzOffsetMinutes(gc.tz || 'Asia/Kolkata', gy, gm, gd, gtH, gtM);

    const bOut = window.Jyotish.compute({ year: by, month: bm, day: bd, hour: btH, minute: btM, lat: bc.lat, lon: bc.lon, tzMinutes: bTz });
    const gOut = window.Jyotish.compute({ year: gy, month: gm, day: gd, hour: gtH, minute: gtM, lat: gc.lat, lon: gc.lon, tzMinutes: gTz });

    // 1. Emotional Harmony (Moon - Moon relationship)
    const mDist = (gOut.P.Moon.sign - bOut.P.Moon.sign + 12) % 12 + 1;
    let emoScore = [1, 7].includes(mDist) ? 95 : [3, 11, 5, 9].includes(mDist) ? 88 : [4, 10].includes(mDist) ? 75 : 62;

    // 2. Intellectual Resonance (Mercury - Mercury relationship)
    const meDist = (gOut.P.Mercury.sign - bOut.P.Mercury.sign + 12) % 12 + 1;
    let mentalScore = [1, 3, 5, 7, 9, 11].includes(meDist) ? 92 : 70;

    // 3. Passion & Physical Chemistry (Venus - Mars cross aspect)
    const vm1 = Math.abs(bOut.P.Venus.sign - gOut.P.Mars.sign);
    const vm2 = Math.abs(gOut.P.Venus.sign - bOut.P.Mars.sign);
    let chemScore = (vm1 === 0 || vm1 === 6 || vm2 === 0 || vm2 === 6) ? 96 : (vm1 === 4 || vm1 === 8 || vm2 === 4 || vm2 === 8) ? 86 : 74;

    // 4. Spiritual Trust & Stability (Jupiter - Jupiter / Sun)
    const jDist = (gOut.P.Jupiter.sign - bOut.P.Jupiter.sign + 12) % 12 + 1;
    let trustScore = [1, 5, 7, 9].includes(jDist) ? 94 : 78;

    const totalScore = Math.round((emoScore * 0.35) + (chemScore * 0.25) + (mentalScore * 0.20) + (trustScore * 0.20));

    let tierLabel = '✨ Divine Soul Connection', tone = 'good';
    if (totalScore < 70) { tierLabel = '⚖️ Moderate Chemistry (Patience Required)'; tone = 'warn'; }
    else if (totalScore < 85) { tierLabel = '💖 Strong Harmonious Bond'; tone = 'good'; }

    const bName = $('#b-name').value || 'Partner 1';
    const gName = $('#g-name').value || 'Partner 2';

    res.innerHTML = `
      <div class="love-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict ${tone}">
          <span class="eyebrow">${esc(bName)} (${rn(bOut.P.Moon.sign)}) & ${esc(gName)} (${rn(gOut.P.Moon.sign)})</span>
          <h2>${totalScore}% Love Compatibility — ${tierLabel}</h2>
          <p>Analysis of planetary wavelengths across emotions, romance, communication, and destiny.</p>
          <dl class="pq-facts" style="margin-top:1rem;">
            <div><dt>Emotional Harmony (Moon)</dt><dd><strong>${emoScore}%</strong></dd></div>
            <div><dt>Romantic Chemistry (Venus/Mars)</dt><dd><strong>${chemScore}%</strong></dd></div>
            <div><dt>Mental Connection (Mercury)</dt><dd><strong>${mentalScore}%</strong></dd></div>
            <div><dt>Spiritual Trust (Jupiter)</dt><dd><strong>${trustScore}%</strong></dd></div>
          </dl>
        </div>

        <div class="card reveal" style="margin-top:1rem;">
          <h3>Relationship Dynamic & Strengths</h3>
          <ul class="factor-list">
            <li class="good">${toneIcon('good')}<span><strong>Emotional Resonance:</strong> ${emoScore >= 80 ? 'Deep intuitive understanding and natural comfort around each other.' : 'Open communication about feelings helps bridge occasional emotional misunderstandings.'}</span></li>
            <li class="good">${toneIcon('good')}<span><strong>Romance & Passion:</strong> ${chemScore >= 85 ? 'High spontaneous attraction with playful spark and strong affection.' : 'Affection grows steadily with shared experiences and romantic dates.'}</span></li>
            <li class="good">${toneIcon('good')}<span><strong>Long-term Vision:</strong> Mutual respect for each other\'s life philosophies fosters enduring loyalty.</span></li>
          </ul>
        </div>
      </div>
    `;
    observeReveals();
    res.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
