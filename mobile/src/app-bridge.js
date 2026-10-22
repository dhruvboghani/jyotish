/* Grahavani Android app layer. Loaded before the page bundles, only in the app build (mobile/build-app.js).
   It defines window.GV_APP, which the site code (src/js/core.js, report.js, settings.js) uses when present:
   print to PDF, native share sheet, phone notifications (Firebase), home-screen widget data.
   It also fixes multi-page navigation for Capacitor's local server and handles the Android back button. */
(function () {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const PLATFORM = C.getPlatform ? C.getPlatform() : 'android';
  const PUSH_PREFIX = PLATFORM === 'ios' ? 'apns:' : 'fcm:'; // iOS tokens go to Apple directly, Android ones via Firebase
  const P = C.Plugins || {}, App = P.App, Share = P.Share, Push = P.PushNotifications, Native = P.GvNative;
  document.documentElement.classList.add('is-app');

  // ---------- Navigation ----------
  // Capacitor's local server answers every path without a file extension with the root index.html,
  // so "/hi/panchang/" must become "/hi/panchang/index.html".
  const fileUrl = href => {
    let u; try { u = new URL(href, location.href); } catch (e) { return null; }
    if (u.origin !== location.origin) return null;
    if (u.pathname.endsWith('/')) u.pathname += 'index.html';
    return u.pathname + u.search + u.hash;
  };
  if (location.pathname !== '/' && location.pathname.endsWith('/')) { location.replace(fileUrl(location.href)); return; }

  // ---------- Start on Today (once per app session), in the saved or the phone's language ----------
  const LANGS = ['en', 'hi', 'gu', 'ta', 'te', 'kn'];
  try {
    if (!sessionStorage.getItem('gv-started')) {
      sessionStorage.setItem('gv-started', '1');
      if (/^\/(index\.html)?$/.test(location.pathname) && !location.hash) {
        let lang = null; try { lang = JSON.parse(localStorage.getItem('kg-lang')); } catch (e) { }
        if (!LANGS.includes(lang)) { const n = (navigator.language || 'en').slice(0, 2).toLowerCase(); lang = LANGS.includes(n) ? n : 'en'; }
        location.replace((lang === 'en' ? '/' : '/' + lang + '/') + 'today/index.html'); return;
      }
    }
  } catch (e) { }
  const openExternal = url => Native && Native.openExternal ? Native.openExternal({ url }) : window.open(url, '_blank');
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented) return;
    const href = a.getAttribute('href'); if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    if (/^(https?:|webcal:|mailto:|tel:|whatsapp:|intent:)/i.test(href) && !href.startsWith(location.origin)) { e.preventDefault(); openExternal(a.href); return; }
    const f = fileUrl(a.href); if (f && f !== a.getAttribute('href')) { e.preventDefault(); location.href = f; }
  }, true);
  const go = url => { const f = fileUrl(url); if (f) location.href = f; else openExternal(url); };

  // ---------- App shell (Design C): app bar on inner pages, bottom tabs everywhere ----------
  function shell() {
    const I = window.I18N; if (!I || document.querySelector('.app-tabs')) return;
    const tx = k => k.split('.').reduce((o, x) => (o == null ? o : o[x]), I) || '';
    const home = I.meta.path, path = location.pathname.replace(/index\.html$/, '');
    const rel = path.startsWith(home) ? path.slice(home.length) : path.slice(1);
    const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
    const IC = {
      today: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
      panchang: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
      kundali: svg('<path d="M12 5v14M5 12h14"/>'),
      matching: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
      me: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
      back: svg('<path d="M15 5l-7 7 7 7"/>')
    };
    const TABS = [['today', 'today/'], ['panchang', 'panchang/'], ['kundali', ''], ['matching', 'matching/'], ['me', 'me/']];
    const cur = (TABS.find(([, r]) => r === rel) || [null])[0];
    document.documentElement.classList.add('app-shell', 'app-' + (cur || 'inner'));
    const nav = document.createElement('nav');
    nav.className = 'app-tabs'; nav.setAttribute('aria-label', tx('nav.sections'));
    nav.innerHTML = TABS.map(([k, r]) => `<a href="${home}${r}index.html" class="tab-${k}"${k === cur ? ' aria-current="page"' : ''}><span class="ti">${IC[k]}</span><span class="tl">${tx('app.tab' + k[0].toUpperCase() + k.slice(1))}</span></a>`).join('');
    document.body.appendChild(nav);
    if (cur === 'today' || cur === 'me') return; // these screens carry their own header
    const h1 = document.querySelector('.page-hero h1, main h1');
    const title = cur === 'kundali' ? tx('nav.new') : (h1 ? h1.textContent.trim() : tx('brand.name'));
    const bar = document.createElement('header');
    bar.className = 'app-bar';
    bar.innerHTML = (cur ? '' : `<button type="button" class="ab-back" aria-label="${tx('app.back')}">${IC.back}</button>`) + `<h1 class="ab-title">${title.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</h1>`;
    document.body.insertBefore(bar, document.body.firstChild.nextSibling);
    const back = bar.querySelector('.ab-back');
    if (back) back.addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = home + 'today/index.html'; });
  }
  if (document.body) shell(); else document.addEventListener('DOMContentLoaded', shell);

  // ---------- State shared with the page (filled by core.js → GV_APP.attach) ----------
  let core = null, lastBack = 0, pendingUrl = null;
  const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };

  // ---------- Back button ----------
  if (App) App.addListener('backButton', () => {
    const drawer = document.getElementById('drawer');
    if (core && core.modalOpen()) { core.closeModal(); return; }
    if (drawer && !drawer.hidden) { document.getElementById('navbtn').click(); return; }
    const home = /^\/((hi|gu|ta|te|kn)\/)?today\/(index\.html)?$/.test(location.pathname); // Today is the app's home
    if (!home) { history.length > 1 ? history.back() : (location.href = (core ? core.HOME : '/') + 'today/index.html'); return; }
    if (Date.now() - lastBack < 2000) { App.exitApp(); return; }
    lastBack = Date.now(); if (core) core.toast(core.t('app.exit'));
  });

  // ---------- Push (Firebase Cloud Messaging) ----------
  let regWaiter = null;
  async function pushAvailable() { try { return !!(Native && Push && (await Native.pushAvailable()).value); } catch (e) { return false; } }
  async function saveToken(tok) {
    const old = ls.get('gv-fcm-token'); ls.set('gv-fcm-token', tok);
    const s = core && core.getSession();
    if (!s || !core.sb || !ls.get('gv-push-on')) return;
    if (old && old !== tok) await core.sb.from('push_subscriptions').delete().eq('endpoint', PUSH_PREFIX + old);
    await core.sb.from('push_subscriptions').upsert({ endpoint: PUSH_PREFIX + tok, user_id: s.user.id, p256dh: '', auth: '', lang: core.LANG }, { onConflict: 'endpoint' });
  }
  if (Push) {
    Push.addListener('registration', t => { if (regWaiter) { regWaiter(t.value); regWaiter = null; } saveToken(t.value).catch(() => { }); });
    Push.addListener('registrationError', () => { if (regWaiter) { regWaiter(null); regWaiter = null; } });
    Push.addListener('pushNotificationReceived', n => { if (core) core.toast([n.title, n.body].filter(Boolean).join(' — ')); });
    Push.addListener('pushNotificationActionPerformed', a => { const url = a && a.notification && a.notification.data && a.notification.data.url; if (url) { if (core) go(url); else pendingUrl = url; } });
  }
  const push = {
    prefix: PUSH_PREFIX,
    async status() {
      if (!(await pushAvailable())) return { state: 'unavailable' };
      const p = await Push.checkPermissions();
      if (p.receive === 'denied') return { state: 'denied' };
      const token = ls.get('gv-fcm-token');
      return { state: p.receive === 'granted' && token && ls.get('gv-push-on') ? 'on' : 'off', token };
    },
    async enable() {
      if (!(await pushAvailable())) return null;
      let p = await Push.checkPermissions();
      if (p.receive !== 'granted') p = await Push.requestPermissions();
      if (p.receive !== 'granted') return null;
      try { await Push.createChannel({ id: 'reminders', name: core ? core.t('rem.pushTitle') : 'Reminders', importance: 4, visibility: 1, lights: true, vibration: true }); } catch (e) { }
      const tok = await new Promise(res => { regWaiter = res; Push.register().catch(() => res(null)); setTimeout(() => res(ls.get('gv-fcm-token')), 15000); });
      if (tok) { ls.set('gv-fcm-token', tok); ls.set('gv-push-on', true); }
      return tok;
    },
    async disable() { ls.del('gv-push-on'); try { await Push.unregister(); } catch (e) { } ls.del('gv-fcm-token'); }
  };

  // ---------- Home-screen widget ----------
  const pad = n => String(n).padStart(2, '0');
  const zoneOffset = z => { try { const d = new Date(), f = o => new Date(d.toLocaleString('en-US', { timeZone: o })); return Math.round((f(z) - f('UTC')) / 60000); } catch (e) { return null; } };
  function widgetPlace() {
    const c = ls.get('kg-city'); if (c && Number.isFinite(c.lat)) return { name: c.name, lat: c.lat, lon: c.lon, tz: Number.isFinite(c.tz) ? c.tz : typeof c.tz === 'string' ? zoneOffset(c.tz) : null };
    const last = ls.get('kg-last'); if (last && last.input) return { name: (last.input.placeLabel || '').split(',')[0], lat: last.input.lat, lon: last.input.lon, tz: last.input.tzMinutes };
    return { name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 330 };
  }
  async function refreshWidget() {
    if (!core || !window.GV_OFFLINE || !Native) return;
    const { t, L, LOCALE } = core, pl = widgetPlace(), tz = Number.isFinite(pl.tz) ? pl.tz : -new Date().getTimezoneOffset();
    const fmt = o => { try { return new Intl.DateTimeFormat(LOCALE, { ...o, timeZone: 'UTC' }); } catch (e) { return new Intl.DateTimeFormat('en-IN', { ...o, timeZone: 'UTC' }); } };
    const dayF = fmt({ weekday: 'long', day: 'numeric', month: 'short' }), timeF = fmt({ hour: 'numeric', minute: '2-digit' });
    const tm = ms => timeF.format(new Date(ms + tz * 60000));
    const tithi = i => (i < 15 ? L.names.paksha.Shukla : L.names.paksha.Krishna) + ' ' + (i === 14 ? L.names.tithi[14] : i === 29 ? L.names.tithi[15] : L.names.tithi[i % 15]);
    const rating = ls.get('gv-widget-rating') || {};
    const days = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date(Date.now() + tz * 60000 + i * 86400000), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate();
      try {
        const p = window.GV_OFFLINE.panchangDay({ year: y, month: m, day: dd, lat: pl.lat, lon: pl.lon, tzMinutes: tz });
        const date = `${y}-${pad(m)}-${pad(dd)}`;
        days.push({
          date, title: dayF.format(Date.UTC(y, m - 1, dd)),
          tithi: tithi(p.tithi[0].index), nak: L.names.nak[p.nakshatra[0].index],
          sun: `${t('app.wSunrise')} ${tm(p.sunrise)} · ${t('app.wSunset')} ${tm(p.sunset)}`,
          rahu: p.rahuKaal ? `${t('app.wRahu')} ${tm(p.rahuKaal.start)}–${tm(p.rahuKaal.end)}` : '',
          stars: rating.days && rating.days[date] || 0
        });
      } catch (e) { }
    }
    const data = { lang: core.LANG, brand: t('brand.name'), place: pl.name || '', your: rating.name ? `${t('app.wYour')} · ${rating.name}` : t('app.wYour'), open: t('app.wOpen'), days };
    try { await Native.saveWidget({ data: JSON.stringify(data) }); } catch (e) { }
  }

  window.GV_APP = {
    attach(c) {
      core = c;
      if (pendingUrl) { const u = pendingUrl; pendingUrl = null; go(u); return; }
      c.authHooks.push((ev, s) => { if (ev === 'SIGNED_IN' && ls.get('gv-push-on') && ls.get('gv-fcm-token')) saveToken(ls.get('gv-fcm-token')).catch(() => { }); });
      // Refresh the FCM token now and then (it can rotate)
      if (ls.get('gv-push-on')) pushAvailable().then(ok => ok && Push.register().catch(() => { }));
      // Rebuild the widget's 8 days of Panchang at most once an hour (it also picks the right day by itself)
      if (Date.now() - (ls.get('gv-widget-at') || 0) > 3600000) { ls.set('gv-widget-at', Date.now()); setTimeout(refreshWidget, 1500); }
    },
    print(name, done) {
      if (!Native) { window.print(); setTimeout(done, 1500); return; }
      let finished = false; const end = () => { if (finished) return; finished = true; if (h) h.then(x => x.remove()); done(); };
      const h = App ? App.addListener('resume', () => setTimeout(end, 400)) : null;
      Native.print({ name: String(name || 'Grahavani').slice(0, 80) }).then(r => { if (r && r.done) end(); }).catch(end);
      setTimeout(end, 120000);
    },
    share({ title, text, url }) { return Share ? Share.share({ title, text, url, dialogTitle: title }).catch(() => { }) : openExternal('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url)); },
    push,
    // The rating row on the widget comes from the person's own chart (relation "self"), else the last chart opened
    chartRendered(data) {
      const pr = data && data.premium, td = pr && pr.today; if (!td || !td.week) return;
      const rel = data.input && data.input.relation, cur = ls.get('gv-widget-rating');
      if (cur && cur.self && rel !== 'self') return;
      const tz = data.input.tzMinutes, days = {};
      td.week.forEach(w => { days[new Date(w.at + tz * 60000).toISOString().slice(0, 10)] = w.stars; });
      ls.set('gv-widget-rating', { name: (data.input.name || '').split(' ')[0], self: rel === 'self', days });
      refreshWidget();
    },
    refreshWidget
  };
})();
