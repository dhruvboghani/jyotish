/* Live hora and choghadiya, good-period nudges, and regional calendar dates (Gujarati, Tamil, Telugu/Kannada).
   Shared by the Today and Panchang pages; works on a /api/panchang day object. */
const dtCur = (list, now) => (list || []).find(x => now >= x.start && now < x.end) || null;
const dtNextGood = (list, now) => (list || []).find(x => x.start > now && x.quality === 'good') || null;
const dtTithi = i => (i < 15 ? L.names.paksha.Shukla : L.names.paksha.Krishna) + ' ' + (i === 14 ? L.names.tithi[14] : i === 29 ? L.names.tithi[15] : L.names.tithi[i % 15]);
const dtLeft = ms => { const m = Math.max(1, Math.round(ms / 60000)), h = Math.floor(m / 60); return h ? t('app.hm', { h, m: m % 60 }) : t('app.mOnly', { m }); };

// Regional dates of the day: [{ id, label, text }]
function regionalLines(p) {
  const r = p && p.regional; if (!r) return [];
  const sv = i => (L.names.samvatsara || [])[i] || '';
  const gu = r.gujarati, ta = r.tamil, gm = get('reg.gujMonths') || L.names.masa, tm = get('reg.tamMonths') || [];
  return [
    { id: 'guj', label: t('reg.gujH'), text: t('reg.guj', { m: gm[gu.month] + (gu.adhika ? ' (' + t('pp.adhika') + ')' : ''), p: t('reg.' + gu.paksha), n: gu.tithi === 15 && gu.paksha === 'vad' ? t('reg.amas') : gu.tithi, s: gu.samvat }) },
    { id: 'tam', label: t('reg.tamH'), text: t('reg.tam', { m: tm[ta.month], d: ta.day, y: sv(ta.year) }) },
    { id: 'ugadi', label: t('reg.ugadiH'), text: t('reg.ugadi', { y: sv(r.samvatsara), m: L.names.masa[p.lunarMonth], t: dtTithi(p.tithi[0].index), s: p.shakaSamvat }) }
  ];
}
// The line that fits the page language (Gujarati → Gujarati calendar, Tamil → Tamil, Telugu/Kannada → Ugadi year)
function regionalLine(p) {
  const want = { gu: 'guj', ta: 'tam', te: 'ugadi', kn: 'ugadi' }[LANG];
  if (want) { const x = regionalLines(p).find(l => l.id === want); return x ? x.text : ''; }
  return t('reg.vikram', { m: L.names.masa[p.lunarMonth], t: dtTithi(p.tithi[0].index), s: p.vikramSamvat });
}

// "Now" card: current hora and choghadiya, with the next good choghadiya
function horaCardHtml(p, tz, now = Date.now()) {
  if (!p || !p.hora) return '';
  const at = ms => fTime(ms, tz);
  const h = dtCur(p.hora, now), c = dtCur(p.choghadiya, now), nx = dtNextGood(p.choghadiya, now);
  const q = x => `<span class="tag ${x.quality === 'good' ? 'good' : x.quality === 'bad' ? 'bad' : ''}">${esc(t('pp.q.' + x.quality))}</span>`;
  const row = (icon, label, name, sub, x) => `<div class="hz-row ${x.quality}"><span class="hz-ic">${icon}</span><span class="hz-t"><small>${esc(label)}</small><b>${esc(name)}</b><span>${esc(sub)}</span></span>${q(x)}</div>`;
  return `${h ? row(g(h.lord, 'gimg'), t('hz.horaNow'), t('hz.hora', { g: { g: h.lord } }), t('hz.for.' + h.lord) + ' · ' + t('app.endsIn', { d: dtLeft(h.end - now) }), h) : ''}
    ${c ? row(ic('i-clock'), t('hz.choghNow'), L.names.chogh[c.name], `${at(c.start)} – ${at(c.end)} · ${t('app.endsIn', { d: dtLeft(c.end - now) })}`, c) : ''}
    ${nx ? `<p class="hz-next">${ic('i-check')}${esc(t('hz.nextGood', { n: L.names.chogh[nx.name], a: at(nx.start), b: at(nx.end) }))}</p>` : ''}
    <label class="chk hz-nudge no-print"><input type="checkbox" data-nudge ${store.get('gv-nudge') ? 'checked' : ''}><span>${esc(t('hz.nudge'))}</span></label>`;
}

// Full hora table (Panchang page)
function horaTableHtml(p, tz, now = Date.now()) {
  const part = pt => p.hora.filter(h => h.part === pt).map(h => { const live = now >= h.start && now < h.end; return `<li class="${h.quality}${live ? ' live' : ''}">${g(h.lord, 'gimg sm')}<b>${esc(gn(h.lord))}</b><span class="num">${fTime(h.start, tz)} – ${fTime(h.end, tz)}</span><span class="q">${esc(t('pp.q.' + h.quality))}${live ? ' · ' + esc(t('pp.now')) : ''}</span></li>`; }).join('');
  return `<div class="chogh-grid hora-grid"><div class="card"><h4>${ic('i-sun')}${esc(t('pp.choghDay'))}</h4><ol class="chogh">${part('day')}</ol></div><div class="card"><h4>${g('Moon', 'gimg sm')}${esc(t('pp.choghNight'))}</h4><ol class="chogh">${part('night')}</ol></div></div>
    <p class="muted small">${esc(t('hz.legend'))}</p>`;
}

// Good-period nudges: native local notifications in the app; in a browser, notifications while the page is open
let dtTimers = [];
function nudgeList(p, tz, now = Date.now()) {
  return (p.choghadiya || []).filter(c => c.quality === 'good' && c.start > now).map(c => ({ at: c.start, title: t('hz.pushTitle', { n: L.names.chogh[c.name] }), body: t('hz.pushBody', { a: fTime(c.start, tz), b: fTime(c.end, tz) }) }));
}
async function scheduleNudges(p, tz) {
  dtTimers.forEach(clearTimeout); dtTimers = [];
  const on = !!store.get('gv-nudge'), list = on && p ? nudgeList(p, tz) : [];
  if (APP && APP.nudges) return APP.nudges(list);
  if (!on || !('Notification' in window) || Notification.permission !== 'granted') return;
  list.forEach(n => { const ms = n.at - Date.now(); if (ms < 2147483000) dtTimers.push(setTimeout(() => { try { new Notification(n.title, { body: n.body, icon: '/icon-192.png', tag: 'gv-nudge' }); } catch (e) { } }, ms)); });
}
function wireNudge(box, getDay, tz) {
  box.addEventListener('change', async e => {
    const cb = e.target.closest('[data-nudge]'); if (!cb) return;
    if (cb.checked && !(APP && APP.nudges) && 'Notification' in window && Notification.permission !== 'granted') {
      const r = await Notification.requestPermission().catch(() => 'denied');
      if (r !== 'granted') { cb.checked = false; toast(t('hz.blocked')); return; }
    }
    store.set('gv-nudge', cb.checked);
    const ok = await scheduleNudges(getDay(), tz);
    if (ok === false) { cb.checked = false; store.set('gv-nudge', false); toast(t('hz.blocked')); return; }
    toast(t(cb.checked ? (APP ? 'hz.onApp' : 'hz.onWeb') : 'hz.off'));
  });
}

// ---------- Today's panchang as a shareable image (WhatsApp status / groups) ----------
function panchangCardCanvas(p, tz, city) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), F = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#16173B'); bg.addColorStop(1, '#2A2E7C'); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 110; i++) { x.fillStyle = `rgba(247,231,184,${(0.12 + rnd() * 0.45).toFixed(2)})`; x.beginPath(); x.arc(rnd() * W, rnd() * H, rnd() * 2 + 0.4, 0, 7); x.fill(); }
  x.textAlign = 'center';
  x.fillStyle = '#F7E7B8'; x.font = `600 34px ${F}`; x.fillText(t('brand.name'), W / 2, 92);
  x.fillStyle = '#fff'; x.font = `700 56px ${F}`; x.fillText(t('pc.title'), W / 2, 172);
  const d = new Date(p.sunrise + tz * 60000);
  x.fillStyle = 'rgba(255,255,255,.8)'; x.font = `400 32px ${F}`; x.fillText(longDateFmt.format(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), W / 2, 228);
  x.font = `400 28px ${F}`; x.fillText(city.name || '', W / 2, 270);
  const rows = [
    [t('sec.pan.tithi'), dtTithi(p.tithi[0].index), t('pp.until', { t: fTime(p.tithi[0].end, tz) })],
    [t('sec.pan.nakshatra'), L.names.nak[p.nakshatra[0].index], t('pp.until', { t: fTime(p.nakshatra[0].end, tz) })],
    [t('sec.pan.yoga'), L.names.yoga27[p.yoga[0].index], ''],
    [t('sec.pan.karana'), L.names.karana[p.karana[0].name], ''],
    [t('sec.pan.vara'), L.names.vara[p.weekday], ''],
    [t('pp.masa'), L.names.masa[p.lunarMonth], regionalLine(p)],
    [t('sec.pan.sunrise') + ' / ' + t('sec.pan.sunset'), `${fTime(p.sunrise, tz)} / ${fTime(p.sunset, tz)}`, ''],
    [t('pp.rahu'), `${fTime(p.rahuKaal.start, tz)} – ${fTime(p.rahuKaal.end, tz)}`, ''],
    [t('pp.abhijit'), p.abhijit ? `${fTime(p.abhijit.start, tz)} – ${fTime(p.abhijit.end, tz)}` : t('pp.noAbhijit'), '']
  ];
  const top = 330, rowH = 104, left = 90, right = W - 90;
  x.fillStyle = 'rgba(255,253,247,.96)'; x.beginPath(); x.roundRect ? x.roundRect(60, top - 30, W - 120, rows.length * rowH + 40, 28) : x.rect(60, top - 30, W - 120, rows.length * rowH + 40); x.fill();
  rows.forEach(([k, v, sub], i) => {
    const y = top + i * rowH + 36;
    x.textAlign = 'left'; x.fillStyle = '#8C5E05'; x.font = `600 25px ${F}`; x.fillText(k, left, y);
    x.textAlign = 'right'; x.fillStyle = i === 7 ? '#C2352D' : '#16173B'; x.font = `700 32px ${F}`; x.fillText(String(v).slice(0, 34), right, y + 4);
    if (sub) { x.fillStyle = '#7A7C9C'; x.font = `400 23px ${F}`; x.fillText(String(sub).slice(0, 48), right, y + 40); }
    if (i < rows.length - 1) { x.strokeStyle = '#EDE3CC'; x.lineWidth = 2; x.beginPath(); x.moveTo(left, y + 62); x.lineTo(right, y + 62); x.stroke(); }
  });
  x.textAlign = 'center'; x.fillStyle = 'rgba(255,255,255,.65)'; x.font = `400 25px ${F}`;
  x.fillText(t('cc.footer', { s: SITE_ORIGIN.replace(/^https?:\/\//, '') }), W / 2, H - 46);
  return cv;
}
async function sharePanchangCard(p, tz, city) {
  let cv; try { cv = panchangCardCanvas(p, tz, city); } catch (e) { toast(t('err.server')); return; }
  const name = 'panchang-' + new Date(p.sunrise + tz * 60000).toISOString().slice(0, 10) + '.png', text = t('pc.text', { c: city.name || '' });
  if (APP && APP.shareImage) { await APP.shareImage(cv.toDataURL('image/png'), name, text); return; }
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const file = blob && typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const url = URL.createObjectURL(blob);
  openModal(`<h2>${esc(t('pc.title'))}</h2><img src="${url}" alt="" style="width:100%;border-radius:14px;margin:8px 0 14px"><a class="btn-cta" href="${url}" download="${name}">${ic('i-download')}${esc(t('cc.download'))}</a><p class="muted small" style="margin-top:10px">${esc(t('cc.hint'))}</p>`);
}
