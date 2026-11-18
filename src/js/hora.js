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
    if (!window.Jyotish) {
      setTimeout(renderHora, 50);
      return;
    }
    const c = hrCity.city || DEFAULT_PLACE;
    const dtStr = dateIn.value || today;
    const [y, m, d] = dtStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = dateObj.getUTCDay(); // 0 is Sunday
    const dayLord = DAY_LORDS[dayOfWeek];

    const jdMid = Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
    const events = window.Jyotish.sunEvents(jdMid, c.lat, c.lon);
    const riseMs = events.rise ? jdMs(events.rise) : (dateObj.getTime() + 6 * 3600000);
    const setMs = events.set ? jdMs(events.set) : (dateObj.getTime() + 18 * 3600000);
    const nextRiseMs = riseMs + 86400000;

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
      <tr style="${h.isNow ? 'background:rgba(212,175,55,0.14);font-weight:600;' : ''}">
        <td class="nowrap">${h.isNow ? '<span class="tag gold" style="margin-right:6px;">LIVE</span>' : ''}${h.type} Hora ${h.idx <= 12 ? h.idx : h.idx - 12}</td>
        <td><span class="gr-cell">${g(h.ruler, 'gimg sm')}<b>${gn(h.ruler)}</b></span></td>
        <td class="nowrap"><strong>${fmtT(h.start)}</strong> – <strong>${fmtT(h.end)}</strong></td>
        <td><small>${HORA_ACTIONS[h.ruler]}</small></td>
      </tr>
    `).join('');

    res.innerHTML = `
      <div class="hora-results reveal" style="margin-top:1.5rem;">
        ${currentHora ? `
          <div class="card pq-verdict good">
            <span class="eyebrow">${c.name} · Live Planetary Hour</span>
            <div style="display:flex;align-items:center;gap:10px;margin-top:0.25rem;">
              ${g(currentHora.ruler, 'gimg')}
              <h2>Current Hora: ${gn(currentHora.ruler)} Hora (${fmtT(currentHora.start)} – ${fmtT(currentHora.end)})</h2>
            </div>
            <p style="margin-top:0.5rem;"><strong>Recommended Activities:</strong> ${HORA_ACTIONS[currentHora.ruler]}</p>
          </div>
        ` : ''}

        <div class="card details-card reveal" style="margin-top:1.5rem;">
          <div class="details-card-header">
            <h3>Complete 24-Hour Hora Schedule (${c.name})</h3>
            <p class="muted small">Calculated from local sunrise (${fmtT(riseMs)}) to sunset (${fmtT(setMs)}).</p>
          </div>
          <div class="tablewrap">
            <table class="mod-table">
              <thead>
                <tr>
                  <th>Hora Period</th>
                  <th>Governing Graha</th>
                  <th>Timings</th>
                  <th>Classical Recommendations</th>
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
