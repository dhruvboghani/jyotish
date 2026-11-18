/* Love & Relationship Compatibility Matcher */
(() => {
  const form = $('#lv-form'), res = $('#lv-res');
  if (!form || !res) return;

  const people = {};
  ['b', 'g'].forEach(p => {
    people[p] = placePicker({
      input: p + '-place',
      suggest: p + '-suggest',
      meta: p + '-meta',
      lat: p + '-lat',
      lon: p + '-lon',
      off: p + '-off',
      date: p + '-date',
      time: p + '-time',
      err: 'lv-err',
      online: p + '-online'
    });
  });

  let myRows = [];
  async function fillPickers() {
    const sels = $$('.pick-saved');
    if (!session) { sels.forEach(s => { s.hidden = true; }); return; }
    try {
      myRows = await loadMyKundalis();
      sels.forEach(s => {
        s.hidden = !myRows.length;
        s.innerHTML = `<option value="">${esc(t('mt.pick'))}</option>` + myRows.map((r, i) => `<option value="${i}">${esc(r.birth.name || t('res.defaultName'))}${r.relation ? ' · ' + esc(t('rel.' + r.relation)) : ''} · ${esc(birthLine(r.birth))}</option>`).join('');
      });
    } catch (e) { sels.forEach(s => { s.hidden = true; }); }
  }

  function fillPerson(p, b) {
    $('#' + p + '-name').value = b.name || '';
    $('#' + p + '-date').value = isoDay(b.year, b.month, b.day);
    $('#' + p + '-time').value = `${pad(b.hour)}:${pad(b.minute)}`;
    $('#' + p + '-lat').value = b.lat;
    $('#' + p + '-lon').value = b.lon;
    $('#' + p + '-off').value = offStr(b.tzMinutes);
    people[p].set(null, b.placeLabel || '');
    people[p].offAuto = false;
    people[p].chosen === null && ($('#' + p + '-meta').innerHTML = `<b>✓</b> ${latStr(b.lat)}, ${lonStr(b.lon)} · UTC${offStr(b.tzMinutes)}`);
  }

  $$('.pick-saved').forEach(s => s.addEventListener('change', () => {
    if (s.value !== '') fillPerson(s.dataset.p, myRows[+s.value].birth);
  }));
  readyHooks.push(fillPickers);

  function readPerson(p) {
    const date = $('#' + p + '-date').value, time = $('#' + p + '-time').value;
    if (!date) return 'Please enter birth date.';
    if (!time) return 'Please enter birth time.';
    people[p].pickFirst();
    const lat = parseFloat($('#' + p + '-lat').value), lon = parseFloat($('#' + p + '-lon').value);
    if (!isFinite(lat) || !isFinite(lon)) return 'Please pick a city from suggestions.';
    people[p].autoOffset();
    const off = parseOff($('#' + p + '-off').value);
    if (off === null) return 'Invalid timezone offset.';
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    return { name: $('#' + p + '-name').value.trim(), year, month, day, hour, minute, lat, lon, tzMinutes: off };
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!window.Jyotish) {
      alert('Astrology calculation engine is loading, please try again in a moment.');
      return;
    }
    const pBoy = readPerson('b'), pGirl = readPerson('g');
    if (typeof pBoy === 'string') { alert('Partner 1: ' + pBoy); return; }
    if (typeof pGirl === 'string') { alert('Partner 2: ' + pGirl); return; }

    const bOut = window.Jyotish.compute(pBoy);
    const gOut = window.Jyotish.compute(pGirl);

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

    const bName = pBoy.name || 'Partner 1';
    const gName = pGirl.name || 'Partner 2';

    res.innerHTML = `
      <div class="love-results reveal" style="margin-top:1.5rem;">
        <div class="card pq-verdict ${tone}">
          <span class="eyebrow">${esc(bName)} (${rn(bOut.P.Moon.sign)}) & ${esc(gName)} (${rn(gOut.P.Moon.sign)})</span>
          <h2>${totalScore}% Love Compatibility — ${tierLabel}</h2>
          <p>Analysis of planetary wavelengths across emotions, romance, communication, and destiny.</p>
          <dl class="pq-facts" style="margin-top:1rem;">
            <div><dt>Emotional Harmony (Moon)</dt><dd>${g('Moon', 'gimg sm')} <strong>${emoScore}%</strong></dd></div>
            <div><dt>Romantic Chemistry (Venus/Mars)</dt><dd>${g('Venus', 'gimg sm')}${g('Mars', 'gimg sm')} <strong>${chemScore}%</strong></dd></div>
            <div><dt>Mental Connection (Mercury)</dt><dd>${g('Mercury', 'gimg sm')} <strong>${mentalScore}%</strong></dd></div>
            <div><dt>Spiritual Trust (Jupiter)</dt><dd>${g('Jupiter', 'gimg sm')} <strong>${trustScore}%</strong></dd></div>
          </dl>
        </div>

        <div class="card details-card reveal" style="margin-top:1.5rem;">
          <div class="details-card-header">
            <h3>Relationship Dynamic & Strengths</h3>
            <p class="muted small">Planetary synergy across emotional, intellectual, and spiritual dimensions.</p>
          </div>
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
