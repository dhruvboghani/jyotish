/* Live 24 Planetary Hours (Hora) Calculator */
(() => {
  const dateIn = $('#hr-date'), btn = $('#hr-btn'), res = $('#hr-res');
  if (!dateIn || !res) return;

  const hrCity = cityPicker(() => renderHora());
  const today = new Date().toISOString().slice(0, 10);
  dateIn.value = today;

  // Chaldean sequence of hora rulers
  const CHALDEAN_HORA = ['Sun', 'Venus', 'Mercury', 'Moon', 'Saturn', 'Jupiter', 'Mars'];
  const DAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  const HORA_ACTIONS = {
    Sun: 'Government work, leadership decisions, career planning, buying gold, applying for tenders.',
    Venus: 'Romance, luxury purchases, beauty, arts, vehicle registration, parties, creative agreements.',
    Mercury: 'Trading, writing, marketing, signing documents, accounts, business calls, learning.',
    Moon: 'Travel, emotional discussions, water matters, public relations, creative imagination.',
    Saturn: 'Labor matters, oil, mining, machinery repair, land dealings, finishing long-delayed tasks.',
    Jupiter: 'Auspicious starts, wealth investments, spiritual rituals, consulting advisors, studies.',
    Mars: 'Court matters, physical sports, property transactions, medical operations, competitive tasks.'
  };

  function renderHora() {
    const c = hrCity.city || DEFAULT_PLACE;
    const dtStr = dateIn.value || today;
    const [y, m, d] = dtStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = dateObj.getUTCDay(); // 0 is Sunday
    const dayLord = DAY_LORDS[dayOfWeek];

    const jdMid = Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
    const events = window.Jyotish.sunEvents(jdMid, c.lat, c.lon);
    const riseMs = events.riseUT;
    const setMs = events.setUT;
    const nextRiseMs = events.nextRiseUT || (riseMs + 86400000);

    const dayHoraLen = (setMs - riseMs) / 12;
    const nightHoraLen = (nextRiseMs - setMs) / 12;

    let lordIdx = CHALDEAN_HORA.indexOf(dayLord);
    const horas = [];
    const nowMs = Date.now();

    // 12 Day Horas
    for (let i = 0; i < 12; i++) {
      const start = riseMs + i * dayHoraLen;
      const end = start + dayHoraLen;
      const ruler = CHALDEAN_HORA[(lordIdx + i) % 7];
      const isNow = nowMs >= start && nowMs < end;
      horas.push({ idx: i + 1, type: 'Day', ruler, start, end, isNow });
    }

    // 12 Night Horas
    const nightStartLordIdx = (lordIdx + 12) % 7;
    for (let i = 0; i < 12; i++) {
      const start = setMs + i * nightHoraLen;
      const end = start + nightHoraLen;
      const ruler = CHALDEAN_HORA[(nightStartLordIdx + i) % 7];
      const isNow = nowMs >= start && nowMs < end;
      horas.push({ idx: i + 13, type: 'Night', ruler, start, end, isNow });
    }

    const tzMin = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, d, 12, 0);
    const fmtT = ms => {
      const d = new Date(ms + tzMin * 60000);
      return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    };

    const currentHora = horas.find(h => h.isNow);

    const rows = horas.map(h => `
      <tr style="${h.isNow ? 'background:rgba(212,175,55,0.14);font-weight:bold;' : ''}">
        <td>${h.isNow ? '▶ ' : ''}${h.type} Hora ${h.idx <= 12 ? h.idx : h.idx - 12}</td>
        <td><strong>${gimg(h.ruler, 'gimg sm')} ${gn(h.ruler)}</strong></td>
        <td>${fmtT(h.start)} – ${fmtT(h.end)}</td>
        <td><small class="muted">${HORA_ACTIONS[h.ruler]}</small></td>
      </tr>
    `).join('');

    res.innerHTML = `
      <div class="hora-results reveal" style="margin-top:1.5rem;">
        ${currentHora ? `
          <div class="card pq-verdict good">
            <span class="eyebrow">${c.name} · Live Planetary Hour</span>
            <h2>Current Hora: ${gn(currentHora.ruler)} Hora (${fmtT(currentHora.start)} – ${fmtT(currentHora.end)})</h2>
            <p><strong>Recommended Activities:</strong> ${HORA_ACTIONS[currentHora.ruler]}</p>
          </div>
        ` : ''}

        <div class="card reveal" style="margin-top:1.5rem;">
          <h3>Complete 24-Hour Hora Schedule (${c.name})</h3>
          <p class="muted small">Calculated from local sunrise (${fmtT(riseMs)}) to sunset (${fmtT(setMs)}).</p>
          <div class="tablewrap" style="overflow-x:auto;">
            <table class="seo-table">
              <thead>
                <tr>
                  <th>Hora #</th>
                  <th>Planetary Ruler</th>
                  <th>Timings</th>
                  <th>Best Activities</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    observeReveals();
  }

  btn.addEventListener('click', renderHora);
  dateIn.addEventListener('change', renderHora);
  readyHooks.push(renderHora);
})();
