/* More search pages (static, all six languages):
   puja vidhi per festival, Hindu calendar by month, planet transits and retrogrades by year,
   mahadasha, yogas, planet-in-sign, baby names by nakshatra / first letter.
   Plus the server-rendered weekly and monthly rashifal per sign. Same layout helpers as seo-pages.js. */
const S = require('./site.js');
const J = require('./engine.js');
const P = require('./panchang.js');
const A = require('./astro.js');
const R = require('./rashifal.js');
const FG = require('./festguide.js');
const N = require('./names.js');
const D = require('./seo-data.js');
const SP = require('./seo-pages.js');

const { esc, list, gimg, SIGN_SLUG } = S;
const { H, pageObj, moreLinks, article, factTable, learnCrumb, festDates, fguide, calendarFor, vratYear, muhuratYear, eclipsesYear, ingresses, once, DELHI, FEST_CITIES, PLANETS9, kebab, S_YEARS, DAY } = SP;
const MONTH_SLUG = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const PL_SLUG = p => p.toLowerCase();
const sentence1 = s => String(s).split(/(?<=[.!?।])\s/)[0];
const tagOf = tone => tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : '';
const jd = ms => ms / DAY + 2440587.5;
const nowYear = () => new Date(Date.now() + 330 * 60000).getUTCFullYear();

// ---------- Planet paths (sign segments) from now, memoised per build ----------
const PATH_SPEC = { Sun: [1, 2], Mercury: [1, 2], Venus: [1, 2], Mars: [1, 3], Jupiter: [2, 13], Saturn: [4, 32], Rahu: [4, 20], Ketu: [4, 20] };
const pathOf = p => once('path:' + p, () => {
  const [step, years] = PATH_SPEC[p], from = Date.UTC(nowYear(), 0, 1), to = from + years * 365.25 * DAY;
  const signOf = ms => Math.floor(J.transit(jd(ms)).lon[p] / 30);
  const segs = []; let s = signOf(from), at = from;
  for (let ms = from; ms < to; ms += step * DAY) {
    const s2 = signOf(ms + step * DAY);
    if (s2 !== s) { let lo = ms, hi = ms + step * DAY; for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (signOf(mid) === s) lo = mid; else hi = mid; } segs.push({ sign: s, start: at, end: hi }); s = s2; at = hi; }
  }
  segs.push({ sign: s, start: at, end: to, open: true });
  return segs;
});
// Retrograde intervals [{start,end,sign}] of a planet in a year (stations from lib/astro)
const retroYear = (p, year) => once(`rt:${p}:${year}`, () => {
  const from = Date.UTC(year, 0, 1) - 330 * 60000, to = Date.UTC(year + 1, 0, 1) - 330 * 60000;
  const st = A.stations({ fromMs: from - 200 * DAY, toMs: to + 200 * DAY }).filter(x => x.planet === p).sort((a, b) => a.at - b.at);
  const out = []; let cur = null;
  for (const x of st) {
    if (x.kind === 'retro' || x.kind === 'inRetro') cur = { start: x.kind === 'inRetro' ? null : x.at, sign: x.sign };
    else if ((x.kind === 'direct') && cur) { out.push({ ...cur, end: x.at, endSign: x.sign }); cur = null; }
  }
  return out.filter(r => r.start != null && r.end > from && r.start < to);
});

// ---------- Dignity ----------
function dignity(p, s) {
  if (J.EXALT[p] === s) return 'exalted';
  if ((J.EXALT[p] + 6) % 12 === s) return 'debilitated';
  if (J.OWN[p] && J.OWN[p].includes(s)) return 'own';
  if (p === 'Rahu' || p === 'Ketu') return 'neutral';
  const lord = J.SIGN_LORD[s], r = J.REL[p] && J.REL[p][lord];
  return r === 'F' ? 'friend' : r === 'E' ? 'enemy' : 'neutral';
}
const DIG_TONE = { exalted: 'good', own: 'good', friend: 'good', neutral: '', enemy: 'bad', debilitated: 'bad' };
const housesRuled = (p, lagna) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(hh => J.SIGN_LORD[(lagna + hh - 1) % 12] === p);

// ---------- Schema helpers ----------
const eventOf = (name, date, desc, win) => ({ name, startDate: win ? new Date(win.start + 330 * 60000).toISOString().slice(0, 16) + '+05:30' : date, endDate: win ? new Date(win.end + 330 * 60000).toISOString().slice(0, 16) + '+05:30' : date, description: desc });

// ===================== PUJA VIDHI (per festival) =====================
const nextYearOf = id => { const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10); for (const y of S_YEARS()) { const e = festDates(y).find(x => x.id === id); if (e && e.date >= today) return { y, e }; } const y = S_YEARS()[1]; return { y, e: festDates(y).find(x => x.id === id) }; };
function pujaPage(lang, id) {
  const h = H(lang), { t, L } = h, name = L.fest[id], f = L.pj.f[id]; if (!f) return null;
  const { y, e } = nextYearOf(id); if (!e) return null;
  const g0 = fguide(id, y, DELHI), gw = Array.isArray(g0) ? g0.find(x => x.date === e.date) || g0[0] : g0;
  const win = gw && (gw.sthir || gw.main), dateL = h.fLong.format(h.ymd(e.date));
  const samagri = f.samagri.split(/[,،]\s*/).map(x => x.trim().replace(/\.$/, '')).filter(Boolean);
  const rows = FEST_CITIES.map(sl => { const c = D.CITY[sl], gg0 = fguide(id, y, c), gg = Array.isArray(gg0) ? gg0.find(x => x.date === e.date) || gg0[0] : gg0, w = gg && (gg.sthir || gg.main);
    return w ? `<tr><td>${h.link(`panchang/${c.slug}/`, h.city(c), '')}</td><td class="num">${h.range(w, 330)}</td></tr>` : ''; }).join('');
  const windows = gw ? [gw.main ? `<div><dt>${esc(t('pj.k.' + gw.kind))}</dt><dd class="num">${h.range(gw.main, 330)}</dd></div>` : '', gw.sthir ? `<div><dt>${esc(t('pj.sthir'))}</dt><dd class="num">${h.range(gw.sthir, 330)}</dd></div>` : '', gw.moonrise ? `<div><dt>${esc(t('pj.moonrise'))}</dt><dd class="num">${h.time(gw.moonrise, 330)}</dd></div>` : '', ...(gw.prahars || []).map((pr, i) => `<div><dt>${esc(t('pj.prahar', { n: i + 1 }))}</dt><dd class="num">${h.range(pr, 330)}</dd></div>`)].join('') : '';
  const faq = [
    { q: t('seo.pv.fq1', { f: name, y }), a: t('seo.pv.fa1', { f: name, d: dateL, r: win ? h.range(win, 330) : '—' }) },
    { q: t('seo.pv.fq2', { f: name }), a: f.samagri },
    { q: t('seo.pv.fq3', { f: name }), a: f.vidhi.join(' ') }
  ];
  const others = Object.keys(FG.GUIDES).filter(x => x !== id && L.pj.f[x]).map(x => h.link(`puja/${kebab(x)}/`, t('seo.pv.short', { f: L.fest[x] })));
  const body = `<main class="wrap page article seo-page">${h.crumbsHtml([{ name: t('pages.puja.name'), slug: 'puja/' }, { name: t('seo.pv.short', { f: name }) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.pv.eye'))}</p><h1>${esc(t('seo.pv.h1', { f: name, y }))}</h1><p class="lede">${esc(f.about)}</p></div>
  <div class="card seo-sum"><div><span class="eyebrow">${esc(t('seo.pv.dateH', { y }))}</span><p class="seo-big">${esc(dateL)}</p></div><dl class="seo-kv">${windows}</dl><p class="muted small">${esc(t('seo.fe.delhiNote'))}</p></div>
  <div class="card prose"><h2>${esc(t('pj.samagri'))}</h2><ul class="pv-list">${samagri.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
  <h2>${esc(t('seo.pv.stepsH', { f: name }))}</h2><ol>${f.vidhi.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
  <h2>${esc(t('seo.pv.kathaH', { f: name }))}</h2>${f.katha.map(x => `<p>${esc(x)}</p>`).join('')}
  <p class="muted small">${esc(t('pj.note'))}</p></div>
  ${rows ? `<h2 class="sub-h">${esc(t('seo.pv.citiesH', { f: name, y }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('pp.city'))}</th><th>${esc(t('seo.fe.muhurat'))}</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
  ${h.cta(t('seo.pv.cta', { f: name }), 'puja/', t('seo.fe.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.pv.dates'), S_YEARS().filter(yy => festDates(yy).some(x => x.id === id)).map(yy => h.link(`festivals/${kebab(id)}-${yy}/`, `${name} ${yy}`)))}
  ${h.linkrow(t('seo.pv.more'), others)}
  ${moreLinks(h, { year: y })}
</main>`;
  const slug = `puja/${kebab(id)}/`;
  return { ...pageObj(h, { id: 'puja-vidhi', slug, article: true, title: t('seo.pv.title', { f: name, y }), desc: t('seo.pv.desc', { f: name, y, d: dateL }), h1: t('seo.pv.h1', { f: name, y }), body, faq, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => L2.pages.puja.name, slug: 'puja/' }, { name: L2 => S.tr(L2, 'seo.pv.short', { f: L2.fest[id] }), slug }] }),
    howto: { name: t('seo.pv.h1', { f: name, y }), supply: samagri, steps: f.vidhi }, event: eventOf(`${name} ${y}`, e.date, f.about, win) };
}

// ===================== HINDU CALENDAR BY MONTH =====================
function monthLabel(h, e) {
  const { t, L } = h;
  if (e.kind === 'festival') return { text: L.fest[e.id], cls: 'gold', link: `festivals/${kebab(e.id)}-${e.date.slice(0, 4)}/` };
  if (e.kind === 'sankranti') return { text: t('cal.sankranti', { r: h.rashi(e.sign) }), cls: '' };
  if (e.id === 'ekadashi') return { text: t('cal.ekadashi', { p: L.names.paksha[e.paksha], m: L.names.masa[e.month] }), cls: 'good', link: `ekadashi-${e.date.slice(0, 4)}/` };
  if (e.id === 'pradosh') return { text: t('cal.pradosh', { p: L.names.paksha[e.paksha] }), cls: '', link: `pradosh-vrat-${e.date.slice(0, 4)}/` };
  if (e.id === 'purnima') return { text: t('cal.purnima') + ' · ' + L.names.masa[e.month], cls: '', link: `purnima-${e.date.slice(0, 4)}/` };
  if (e.id === 'amavasya') return { text: t('cal.amavasya') + ' · ' + L.names.masa[e.month], cls: '', link: `amavasya-${e.date.slice(0, 4)}/` };
  if (e.id === 'sankashti') return { text: t('cal.sankashti'), cls: '', link: `sankashti-chaturthi-${e.date.slice(0, 4)}/` };
  return { text: e.id, cls: '' };
}
function monthPage(lang, year, m) {
  const h = H(lang), { t, L } = h, mName = h.fMonth.format(new Date(Date.UTC(year, m, 1))), my = h.fMonthY.format(new Date(Date.UTC(year, m, 1)));
  const pre = `${year}-${String(m + 1).padStart(2, '0')}`;
  const evs = calendarFor(year, DELHI).filter(e => e.date.startsWith(pre)).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.kind === 'festival' ? -1 : 1));
  const byDay = {}; evs.forEach(e => (byDay[e.date] = byDay[e.date] || []).push(e));
  const rows = Object.keys(byDay).sort().map(d => `<tr><td class="num"><b>${esc(h.fDM.format(h.ymd(d)))}</b> <small class="muted">${esc(h.fWd.format(h.ymd(d)))}</small></td><td>${byDay[d].map(e => { const x = monthLabel(h, e); return x.link ? `<a class="tag ${x.cls}" href="${h.base}${x.link}">${esc(x.text)}</a>` : `<span class="tag ${x.cls}">${esc(x.text)}</span>`; }).join(' ')}</td></tr>`).join('');
  const masas = [...new Set(evs.filter(e => e.kind === 'vrat' && e.month != null).map(e => L.names.masa[e.month]))];
  const fests = evs.filter(e => e.kind === 'festival').map(e => L.fest[e.id]);
  const datesOf = id => evs.filter(e => e.id === id).map(e => h.fDM.format(h.ymd(e.date)));
  const ecl = eclipsesYear(year).filter(e => new Date(e.max + 330 * 60000).getUTCMonth() === m);
  const mu = [['marriage', 'vivah'], ['griha', 'griha-pravesh']].map(([p, w]) => ({ p, w, dates: (muhuratYear(p, year)[m] || []).map(x => h.fDM.format(h.ymd(x.date))) }));
  const faq = [
    { q: t('seo.mc.fq1', { m: my }), a: fests.length ? t('seo.mc.fa1', { m: my, list: list(L, fests) }) : t('seo.mc.fa1none', { m: my }) },
    { q: t('seo.mc.fq2', { m: my }), a: datesOf('ekadashi').length ? t('seo.mc.fa2', { list: list(L, datesOf('ekadashi')) }) : '—' },
    { q: t('seo.mc.fq3', { m: my }), a: t('seo.mc.fa3', { p: list(L, datesOf('purnima')) || '—', a: list(L, datesOf('amavasya')) || '—' }) }
  ];
  const prev = new Date(Date.UTC(year, m - 1, 1)), next = new Date(Date.UTC(year, m + 1, 1));
  const inRange = d => S_YEARS().includes(d.getUTCFullYear());
  const nav = [inRange(prev) ? h.link(`calendar/${prev.getUTCFullYear()}/${MONTH_SLUG[prev.getUTCMonth()]}/`, '← ' + h.fMonthY.format(prev)) : '', h.link(`calendar/${year}/`, t('seo.mc.yearShort', { y: year }), 'tag gold'), inRange(next) ? h.link(`calendar/${next.getUTCFullYear()}/${MONTH_SLUG[next.getUTCMonth()]}/`, h.fMonthY.format(next) + ' →') : ''].filter(Boolean);
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.mc.yearShort', { y: year }), slug: `calendar/${year}/` }, { name: my }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.mc.eye'))}</p><h1>${esc(t('seo.mc.h1', { m: my }))}</h1><p class="lede">${esc(t('seo.mc.lede', { m: my, h: list(L, masas) || '—', n: fests.length }))}</p></div>
  <div class="card seo-sum"><dl class="seo-kv">
    <div><dt>${esc(t('vt.k.ekadashi'))}</dt><dd>${esc(list(L, datesOf('ekadashi')) || '—')}</dd></div>
    <div><dt>${esc(t('vt.k.purnima'))}</dt><dd>${esc(list(L, datesOf('purnima')) || '—')}</dd></div>
    <div><dt>${esc(t('vt.k.amavasya'))}</dt><dd>${esc(list(L, datesOf('amavasya')) || '—')}</dd></div>
    <div><dt>${esc(t('vt.k.pradosh'))}</dt><dd>${esc(list(L, datesOf('pradosh')) || '—')}</dd></div>
    <div><dt>${esc(t('vt.k.sankashti'))}</dt><dd>${esc(list(L, datesOf('sankashti')) || '—')}</dd></div>
  </dl></div>
  <h2 class="sub-h">${esc(t('seo.mc.listH', { m: mName }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><tbody>${rows || `<tr><td>${esc(t('cal.none'))}</td></tr>`}</tbody></table></div>
  ${ecl.length ? `<div class="card prose"><h2>${esc(t('seo.ry.eclH'))}</h2><ul>${ecl.map(e => `<li>${esc(h.fDate.format(h.local(e.max, 330)))} — ${esc(t(`ec.k.${e.kind}.${e.type}`))} · <a href="${h.base}grahan-${year}/">${esc(t('seo.gr.short', { y: year }))}</a></li>`).join('')}</ul></div>` : ''}
  <div class="card prose"><h2>${esc(t('seo.mc.muH', { m: mName }))}</h2>${mu.map(x => `<p><b>${esc(t('mu.p.' + x.p))}:</b> ${esc(list(L, x.dates) || t('seo.mc.noMu'))} · <a href="${h.base}muhurat/${x.w}-${year}/">${esc(t(`seo.mh.${x.p}.short`, { y: year }))}</a></p>`).join('')}</div>
  <p class="muted small">${esc(t('seo.fe.delhiNote'))}</p>
  ${h.cta(t('seo.fe.ctaCal'), 'calendar/', t('seo.fe.ctaCalBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.mc.nav'), nav)}
  ${moreLinks(h, { year })}
</main>`;
  const slug = `calendar/${year}/${MONTH_SLUG[m]}/`;
  return pageObj(h, { id: 'month-cal', slug, title: t('seo.mc.title', { m: my }), desc: t('seo.mc.desc', { m: my, list: list(L, fests.slice(0, 4)) || '—' }), h1: t('seo.mc.h1', { m: my }), body, faq, priority: '0.7', freq: 'monthly', crumbs: [{ name: L2 => S.tr(L2, 'seo.mc.yearShort', { y: year }), slug: `calendar/${year}/` }, { name: () => my, slug }] });
}
function yearCalPage(lang, year) {
  const h = H(lang), { t, L } = h;
  const cards = MONTH_SLUG.map((sl, m) => { const pre = `${year}-${String(m + 1).padStart(2, '0')}`, fs = calendarFor(year, DELHI).filter(e => e.kind === 'festival' && e.date.startsWith(pre)).map(e => L.fest[e.id]);
    return `<a class="card mc-card" href="${h.base}calendar/${year}/${sl}/"><b>${esc(h.fMonth.format(new Date(Date.UTC(year, m, 1))))}</b><small>${esc(fs.slice(0, 4).join(' · ') || '—')}</small></a>`; }).join('');
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.mc.yearShort', { y: year }) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.mc.eye'))}</p><h1>${esc(t('seo.mc.yearH1', { y: year }))}</h1><p class="lede">${esc(t('seo.mc.yearLede', { y: year }))}</p></div>
  <div class="mc-grid">${cards}</div>
  ${h.linkrow(t('seo.fe.lists'), [h.link('festivals/', t('seo.fe.indexName'), 'tag gold'), ...D.VRAT_LISTS.map(([k, w]) => h.link(`${w}-${year}/`, t(`seo.vl.${k}.short`, { y: year }))), h.link(`grahan-${year}/`, t('seo.gr.short', { y: year })), h.link(`transit/saturn-${year}/`, t('seo.gt.short', { g: h.gr('Saturn'), y: year }))])}
  ${h.cta(t('seo.fe.ctaCal'), 'calendar/', t('seo.fe.ctaCalBtn'))}
  ${moreLinks(h, { year })}
</main>`;
  return pageObj(h, { id: 'year-cal', slug: `calendar/${year}/`, title: t('seo.mc.yearTitle', { y: year }), desc: t('seo.mc.yearLede', { y: year }), h1: t('seo.mc.yearH1', { y: year }), body, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => S.tr(L2, 'seo.mc.yearShort', { y: year }), slug: `calendar/${year}/` }] });
}

// ===================== PLANET TRANSIT BY YEAR (Saturn, Jupiter, Rahu-Ketu) =====================
const GT = [['saturn', 'Saturn'], ['jupiter', 'Jupiter'], ['rahu-ketu', 'Rahu']];
function transitPage(lang, slugP, p, year) {
  const h = H(lang), { t, L, gr } = h, start = Date.UTC(year, 0, 1) - 330 * 60000, end = Date.UTC(year + 1, 0, 1) - 330 * 60000;
  const name = p === 'Rahu' ? `${gr('Rahu')}–${gr('Ketu')}` : gr(p);
  const s0 = Math.floor(J.transit(jd(start)).lon[p] / 30), moves = ingresses(p, start, end);
  const segs = []; let cur = s0, at = start; for (const mv of moves) { segs.push({ sign: cur, start: at, end: mv.at }); cur = mv.sign; at = mv.at; } segs.push({ sign: cur, start: at, end });
  const rts = p === 'Rahu' ? [] : retroYear(p, year);
  const fd = ms => h.fDate.format(h.local(ms, 330));
  const effects = SIGN_SLUG.map((sl, s) => {
    const cells = segs.map(sg => { const hh = (sg.sign - s + 12) % 12 + 1, good = S.GOCHAR_GOOD[p].includes(hh); let k = '';
      if (p === 'Rahu') { const hk = (sg.sign + 6 - s + 12) % 12 + 1; k = ` · ${esc(gr('Ketu'))} ${esc(t('rf.house', { h: hk }))}`; }
      return `<div class="gt-line"><small class="gt-when">${esc(h.rashi(sg.sign))} · ${esc(h.fDM.format(h.local(sg.start, 330)))}</small><span class="tag ${good ? 'good' : 'bad'}">${esc(t('rf.house', { h: hh }))}</span>${k} <span class="muted small">${esc(h.L.names.house[hh - 1])}</span></div>`; }).join('');
    return `<tr><td><a href="${h.base}rashifal/${sl}/${year}/">${esc(h.rashi(s))}</a></td><td>${cells}</td></tr>`;
  }).join('');
  const goodSigns = SIGN_SLUG.map((_, s) => s).filter(s => S.GOCHAR_GOOD[p].includes((segs[segs.length - 1].sign - s + 12) % 12 + 1)).map(h.rashi);
  const ss = p === 'Saturn' ? [-1, 0, 1].map(k => h.rashi((segs[segs.length - 1].sign + k + 12) % 12)) : null;
  const faq = [
    { q: t('seo.gt.fq1', { g: name, y: year }), a: moves.length ? list(L, moves.map(mv => t('seo.gt.move', { r: h.rashi(mv.sign), d: fd(mv.at) }))) : t('seo.gt.stays', { g: name, r: h.rashi(s0), y: year }) },
    { q: t('seo.gt.fq2', { g: name, y: year }), a: t('seo.gt.fa2', { list: list(L, goodSigns) }) },
    ...(rts.length ? [{ q: t('seo.gt.fq3', { g: name, y: year }), a: list(L, rts.map(r => `${fd(r.start)} – ${fd(r.end)}`)) }] : []),
    ...(ss ? [{ q: t('seo.gt.fqSs', { y: year }), a: t('seo.gt.faSs', { list: list(L, ss) }) }] : [])
  ];
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.gt.index'), slug: 'transit/' }, { name: t('seo.gt.short', { g: name, y: year }) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.gt.eye'))}</p><h1>${esc(t('seo.gt.h1', { g: name, y: year }))}</h1><p class="lede">${esc(t('seo.gt.lede.' + PL_SLUG(p), { y: year }))}</p></div>
  <div class="card prose"><h2>${esc(t('seo.gt.whereH', { y: year }))}</h2><ul>${segs.map(sg => `<li><b>${esc(h.rashi(sg.sign))}${p === 'Rahu' ? ' / ' + esc(gr('Ketu')) + ' ' + esc(h.rashi((sg.sign + 6) % 12)) : ''}</b> · <span class="num">${esc(fd(sg.start))} – ${esc(fd(sg.end))}</span></li>`).join('')}</ul>
  ${rts.length ? `<h2>${esc(t('seo.gt.retroH'))}</h2><ul>${rts.map(r => `<li><span class="num">${esc(fd(r.start))} – ${esc(fd(r.end))}</span> · ${esc(h.rashi(r.sign))}</li>`).join('')}</ul>` : ''}
  ${ss ? `<h2>${esc(t('seo.ss.index'))}</h2><p>${esc(t('seo.gt.faSs', { list: list(L, ss) }))} <a href="${h.base}sade-sati/">${esc(t('seo.ss.indexH1'))}</a></p>` : ''}</div>
  <h2 class="sub-h">${esc(t('seo.gt.effectsH', { g: name, y: year }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('pp.moonSign'))}</th><th>${esc(t('seo.gt.fromMoon'))}</th></tr></thead><tbody>${effects}</tbody></table></div>
  <p class="muted small">${esc(t('seo.gt.note'))}</p>
  ${h.cta(t('seo.gt.cta'), '', t('seo.rd.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.gt.more'), [...GT.filter(([sl]) => sl !== slugP).map(([sl, q]) => h.link(`transit/${sl}-${year}/`, t('seo.gt.short', { g: q === 'Rahu' ? `${gr('Rahu')}–${gr('Ketu')}` : gr(q), y: year }))), ...S_YEARS().filter(y => y !== year).map(y => h.link(`transit/${slugP}-${y}/`, t('seo.gt.short', { g: name, y }))), ...RT.map(q => h.link(`retrograde/${PL_SLUG(q)}-${year}/`, t('seo.rt.short', { g: gr(q), y: year })))])}
  ${moreLinks(h, { year })}
</main>`;
  const slug = `transit/${slugP}-${year}/`;
  return pageObj(h, { id: 'transit', slug, article: true, title: t('seo.gt.title', { g: name, y: year }), desc: t('seo.gt.desc', { g: name, y: year, r: h.rashi(segs[segs.length - 1].sign) }), h1: t('seo.gt.h1', { g: name, y: year }), body, faq, priority: '0.8', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.gt.index, slug: 'transit/' }, { name: L2 => S.tr(L2, 'seo.gt.short', { g: p === 'Rahu' ? `${L2.names.graha.Rahu}–${L2.names.graha.Ketu}` : L2.names.graha[p], y: year }), slug }] });
}
// ===================== RETROGRADE BY YEAR =====================
const RT = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
function retroPage(lang, p, year) {
  const h = H(lang), { t, L, gr } = h, rts = retroYear(p, year), g = gr(p), fd = ms => h.fDate.format(h.local(ms, 330));
  const rows = rts.map(r => `<tr><td class="num">${esc(fd(r.start))}</td><td class="num">${esc(fd(r.end))}</td><td class="num">${Math.round((r.end - r.start) / DAY)}</td><td>${esc(h.rashi(r.sign))}${r.endSign !== r.sign ? ' → ' + esc(h.rashi(r.endSign)) : ''}</td></tr>`).join('');
  const faq = [
    { q: t('seo.rt.fq1', { g, y: year }), a: rts.length ? list(L, rts.map(r => `${fd(r.start)} – ${fd(r.end)}`)) : t('seo.rt.none', { g, y: year }) },
    { q: t('seo.rt.fq2', { g }), a: t('seo.rt.mean.' + PL_SLUG(p)) },
    { q: t('seo.rt.fq3', { g }), a: t('seo.rt.do.' + PL_SLUG(p)) }
  ];
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.gt.index'), slug: 'transit/' }, { name: t('seo.rt.short', { g, y: year }) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.rt.eye'))}</p><h1>${esc(t('seo.rt.h1', { g, y: year }))}</h1><p class="lede">${esc(rts.length ? t('seo.rt.lede', { g, y: year, n: rts.length }) : t('seo.rt.none', { g, y: year }))}</p></div>
  ${rts.length ? `<div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.rt.starts'))}</th><th>${esc(t('seo.rt.ends'))}</th><th>${esc(t('seo.rt.days'))}</th><th>${esc(t('seo.rt.sign'))}</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
  <div class="card prose"><h2>${esc(t('seo.rt.meanH', { g }))}</h2><p>${esc(t('seo.rt.mean.' + PL_SLUG(p)))}</p><h2>${esc(t('seo.rt.doH'))}</h2><p>${esc(t('seo.rt.do.' + PL_SLUG(p)))}</p><p class="muted small">${esc(t('seo.rt.note'))}</p></div>
  ${h.cta(t('seo.gt.cta'), 'eclipses/', t('seo.rt.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.gt.more'), [...RT.filter(q => q !== p).map(q => h.link(`retrograde/${PL_SLUG(q)}-${year}/`, t('seo.rt.short', { g: gr(q), y: year }))), ...S_YEARS().filter(y => y !== year).map(y => h.link(`retrograde/${PL_SLUG(p)}-${y}/`, t('seo.rt.short', { g, y }))), ...GT.map(([sl, q]) => h.link(`transit/${sl}-${year}/`, t('seo.gt.short', { g: q === 'Rahu' ? `${gr('Rahu')}–${gr('Ketu')}` : gr(q), y: year })))])}
  ${moreLinks(h, { year })}
</main>`;
  const slug = `retrograde/${PL_SLUG(p)}-${year}/`;
  let rtDesc = rts.length ? t('seo.rt.desc', { g, y: year, d: fd(rts[0].start), e: fd(rts[0].end) }) : t('seo.rt.none', { g, y: year });
  if (rtDesc.length < 110) rtDesc += ' ' + t('seo.rt.mean.' + PL_SLUG(p));
  return pageObj(h, { id: 'retro', slug, article: true, title: t('seo.rt.title', { g, y: year }), desc: rtDesc, h1: t('seo.rt.h1', { g, y: year }), body, faq, priority: '0.7', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.gt.index, slug: 'transit/' }, { name: L2 => S.tr(L2, 'seo.rt.short', { g: L2.names.graha[p], y: year }), slug }] });
}
function transitIndex(lang) {
  const h = H(lang), { t, gr } = h, Y = S_YEARS();
  const now = Date.now(), pos = J.transit(jd(now)).lon;
  const rows = PLANETS9.map(p => `<tr><td>${gimg(p, 'gimg sm')} ${esc(gr(p))}</td><td>${esc(h.rashi(Math.floor(pos[p] / 30)))}</td><td>${h.link(`learn/${PL_SLUG(p)}-in-${SIGN_SLUG[Math.floor(pos[p] / 30)]}/`, t('seo.ps.short', { g: gr(p), r: h.rashi(Math.floor(pos[p] / 30)) }), '')}</td></tr>`).join('');
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.gt.index') }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.gt.eye'))}</p><h1>${esc(t('seo.gt.indexH1', { a: Y[0], b: Y[1] }))}</h1><p class="lede">${esc(t('seo.gt.indexLede'))}</p></div>
  ${Y.map(y => h.linkrow(String(y), [...GT.map(([sl, q]) => h.link(`transit/${sl}-${y}/`, t('seo.gt.short', { g: q === 'Rahu' ? `${gr('Rahu')}–${gr('Ketu')}` : gr(q), y }))), ...RT.map(q => h.link(`retrograde/${PL_SLUG(q)}-${y}/`, t('seo.rt.short', { g: gr(q), y })))])).join('')}
  <h2 class="sub-h">${esc(t('seo.gt.nowH'))}</h2><div class="card seo-tablewrap"><table class="seo-table"><tbody>${rows}</tbody></table></div>
  ${h.cta(t('seo.gt.cta'), '', t('seo.rd.ctaBtn'))}
  ${moreLinks(h, { year: Y[0] })}
</main>`;
  return pageObj(h, { id: 'transit-index', slug: 'transit/', title: t('seo.gt.indexTitle', { a: Y[0], b: Y[1] }), desc: t('seo.gt.indexLede'), h1: t('seo.gt.indexH1', { a: Y[0], b: Y[1] }), body, priority: '0.8', freq: 'weekly', crumbs: [{ name: L2 => L2.seo.gt.index, slug: 'transit/' }] });
}

// ===================== MAHADASHA =====================
const ymTxt = (h, years) => { const y = Math.floor(years + 1e-9), m = Math.round((years - y) * 12); return h.t('seo.md.ym', { y, m }); };
function mahadashaPage(lang, p) {
  const h = H(lang), { t, L, gr } = h, g = gr(p), Y = J.DASHA_YEARS[p], i0 = J.DASHA_ORDER.indexOf(p);
  const ads = J.DASHA_ORDER.map((_, k) => J.DASHA_ORDER[(i0 + k) % 9]).map(q => { const rel = q === p ? 'own' : (J.REL[p] && J.REL[p][q]) || 'N'; return { q, years: Y * J.DASHA_YEARS[q] / 120, tone: rel === 'own' || rel === 'F' ? 'good' : rel === 'E' ? 'bad' : '' }; });
  const gem = D.GEMS.find(x => x.planet === p), rud = Object.values(D.RUDRAKSHA).find(x => x && x.planet === p);
  const k = `seo.md.${PL_SLUG(p)}`;
  const faq = [{ q: t('seo.md.fq1', { g }), a: t('seo.md.fa1', { g, n: Y }) }, { q: t('seo.md.fq2', { g }), a: t(k + '.good') + ' ' + t(k + '.bad') }, { q: t('seo.md.fq3', { g }), a: t('seo.md.fa3', { m: L.names.mantra[p] || '', d: L.names.vara[SP.WEEKDAY_OF[p]] }) }];
  const html = `${factTable([[t('seo.md.length'), esc(t('seo.md.years', { n: Y }))], [t('seo.md.order'), esc(t('seo.md.after', { a: gr(J.DASHA_ORDER[(i0 + 8) % 9]), b: gr(J.DASHA_ORDER[(i0 + 1) % 9]) }))], [t('seo.md.naks'), esc(list(L, D.NAK.map((_, j) => j).filter(j => J.DASHA_ORDER[j % 9] === p).map(h.nak)))], [t('seo.gs.mantra'), esc(L.names.mantra[p] || '')]])}
  <div class="card prose"><h2>${esc(t('seo.md.aboutH', { g }))}</h2><p>${esc(t(k + '.about'))}</p><h2>${esc(t('seo.md.goodH'))}</h2><p>${esc(t(k + '.good'))}</p><h2>${esc(t('seo.md.badH'))}</h2><p>${esc(t(k + '.bad'))}</p></div>
  <h2 class="sub-h">${esc(t('seo.md.adH', { g }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.md.ad'))}</th><th>${esc(t('seo.md.len'))}</th><th>${esc(t('seo.md.tone'))}</th></tr></thead><tbody>${ads.map(a => `<tr><td>${gimg(a.q, 'gimg sm')} ${esc(t('seo.md.adName', { a: g, b: gr(a.q) }))}</td><td class="num">${esc(ymTxt(h, a.years))}</td><td><span class="tag ${tagOf(a.tone)}">${esc(t('seo.md.t.' + (a.tone || 'mixed')))}</span></td></tr>`).join('')}</tbody></table></div>
  <p class="muted small">${esc(t('seo.md.note'))}</p>
  <div class="card prose"><h2>${esc(t('seo.md.remH', { g }))}</h2><ul><li>${esc(t('seo.md.remMantra', { m: L.names.mantra[p] || '', d: L.names.vara[SP.WEEKDAY_OF[p]] }))}</li>${gem ? `<li><a href="${h.base}learn/${gem.slug}-gemstone/">${esc(t('seo.gs.h1', { g: t('gm.g.' + gem.gem) }))}</a></li>` : ''}${rud ? `<li><a href="${h.base}learn/${rud.n}-mukhi-rudraksha/">${esc(t('gm.mukhi', { n: rud.n }))}</a></li>` : ''}</ul></div>
  ${h.cta(t('seo.md.cta'), '', t('seo.rd.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.md.all'), J.DASHA_ORDER.map(q => q === p ? `<span class="tag gold">${esc(t('seo.md.short', { g: gr(q) }))}</span>` : h.link(`learn/${PL_SLUG(q)}-mahadasha/`, t('seo.md.short', { g: gr(q) }))))}`;
  const h1 = t('seo.md.h1', { g }), slug = `learn/${PL_SLUG(p)}-mahadasha/`;
  return pageObj(h, { id: 'learn-md', slug, article: true, title: t('seo.md.title', { g }), desc: t('seo.md.desc', { g, n: Y }), h1, body: article(h, { eye: t('seo.md.eye'), h1, lede: sentence1(t(k + '.about')), icon: gimg(p, 'gimg xl'), html }), faq, priority: '0.7', crumbs: learnCrumb(L2 => S.tr(L2, 'seo.md.h1', { g: L2.names.graha[p] }), slug) });
}

// ===================== YOGAS =====================
const YOGAS = [['gajakesari', 'gajakesari'], ['budhaditya', 'budhaditya'], ['raj', 'raj'], ['yogakaraka', 'yogakaraka'], ['chandramangal', 'chandra-mangal'], ['ruchaka', 'ruchaka'], ['bhadra', 'bhadra'], ['hamsa', 'hamsa'], ['malavya', 'malavya'], ['sasa', 'shasha'], ['vipreet', 'vipreet-raj'], ['adhi', 'adhi'], ['sunapha', 'sunapha'], ['anapha', 'anapha'], ['durudhara', 'durudhara'], ['kemadruma', 'kemadruma'], ['grahan', 'grahan'], ['guruchandal', 'guru-chandal'], ['shakata', 'shakata']];
const YK = { 0: 'Mars', 1: 'Saturn', 2: null, 3: 'Mars', 4: 'Mars', 5: null, 6: 'Saturn', 7: null, 8: null, 9: 'Venus', 10: 'Venus', 11: null };
function yogaPage(lang, id, sl) {
  const h = H(lang), { t, L, gr } = h, y = L.yoga[id], k = `seo.yg.${id}`, name = y.name;
  const lagnaTbl = id === 'yogakaraka' ? `<h2 class="sub-h">${esc(t('seo.yg.ykTable'))}</h2><div class="card seo-tablewrap"><table class="seo-table"><tbody>${SIGN_SLUG.map((ls, s) => `<tr><td><a href="${h.base}learn/${ls}-lagna/">${esc(h.rashi(s))}</a></td><td>${YK[s] ? esc(gr(YK[s])) : '—'}</td></tr>`).join('')}</tbody></table></div>` : '';
  const faq = [{ q: t('seo.yg.fq1', { y: name }), a: y.rule }, { q: t('seo.yg.fq2', { y: name }), a: t(k + '.effects') }, { q: t('seo.yg.fq3', { y: name }), a: t(k + '.strong') }];
  const html = `${factTable([[t('seo.yg.rule'), esc(y.rule)], [t('seo.yg.kind'), esc(t('seo.yg.k.' + t(k + '.kind')))]])}
  <div class="card prose"><h2>${esc(t('seo.yg.whatH', { y: name }))}</h2><p>${esc(t(k + '.about'))}</p><h2>${esc(t('seo.yg.effectsH'))}</h2><p>${esc(t(k + '.effects'))}</p><h2>${esc(t('seo.yg.strongH'))}</h2><p>${esc(t(k + '.strong'))}</p><p class="muted small">${esc(L.lp.disclaimer)}</p></div>
  ${lagnaTbl}
  ${h.cta(t('seo.yg.cta', { y: name }), '', t('seo.rd.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.yg.all'), YOGAS.filter(([x]) => x !== id).map(([x, s2]) => h.link(`learn/${s2}-yoga/`, L.yoga[x].name)).concat(D.DOSHAS.map(d => h.link(`learn/${d}-dosha/`, t(`seo.ds.${d}.title`)))))}`;
  const h1 = t('seo.yg.h1', { y: name }), slug = `learn/${sl}-yoga/`;
  return pageObj(h, { id: 'learn-yoga', slug, article: true, title: t('seo.yg.title', { y: name }), desc: t('seo.yg.desc', { y: name, r: y.rule }), h1, body: article(h, { eye: t('seo.yg.eye'), h1, lede: sentence1(t(k + '.about')), html }), faq, priority: '0.7', crumbs: learnCrumb(L2 => S.tr(L2, 'seo.yg.h1', { y: L2.yoga[id].name }), slug) });
}

// ===================== PLANET IN SIGN =====================
function planetSignPage(lang, p, s) {
  const h = H(lang), { t, L, gr } = h, g = gr(p), r = h.rashi(s), dg = dignity(p, s), lord = J.SIGN_LORD[s];
  const dgTxt = t('seo.ps.dig.' + dg, { g, r, l: gr(lord) });
  const lagnaRows = SIGN_SLUG.map((ls, lg) => { const hh = (s - lg + 12) % 12 + 1, ruled = housesRuled(p, lg);
    const tone = ruled.some(x => [1, 5, 9].includes(x)) && !ruled.some(x => [6, 8, 12].includes(x)) ? 'good' : ruled.length && ruled.every(x => [6, 8, 12].includes(x)) ? 'bad' : '';
    return `<tr><td><a href="${h.base}learn/${ls}-lagna/">${esc(h.rashi(lg))}</a></td><td><a href="${h.base}learn/${PL_SLUG(p)}-in-house-${hh}/">${esc(t('seo.ps.inHouse', { h: hh, m: L.names.house[hh - 1] }))}</a></td><td>${ruled.length ? `<span class="tag ${tagOf(tone)}">${esc(t('seo.ps.rules', { list: ruled.join(', ') }))}</span>` : '—'}</td></tr>`; }).join('');
  let when = '';
  if (p !== 'Moon') {
    const seg = pathOf(p).find(x => x.sign === s && x.end > Date.now());
    if (seg) when = seg.start <= Date.now() ? t('seo.ps.nowIn', { g, r, d: h.fDate.format(h.local(seg.end, 330)) }) : t('seo.ps.nextIn', { g, r, a: h.fDate.format(h.local(seg.start, 330)), b: h.fDate.format(h.local(seg.end, 330)) });
  }
  const faq = [{ q: t('seo.ps.fq1', { g, r }), a: dgTxt }, { q: t('seo.ps.fq2', { g, r }), a: t('seo.ps.fa2', { g, r, k: L.names.karaka[p], n: sentence1(t('seo.rst.' + s)) }) }, ...(when ? [{ q: t('seo.ps.fq3', { g, r }), a: when }] : [])];
  const html = `${factTable([[t('seo.ps.dignity'), `<span class="tag ${tagOf(DIG_TONE[dg])}">${esc(t('seo.ps.d.' + dg))}</span>`], [t('seo.rs.lord'), esc(gr(lord))], [t('seo.rs.element'), esc(L.lp.elem[s % 4])], [t('seo.rs.quality'), esc(L.lp.qual[s % 3])], when ? [t('seo.ps.transit'), esc(when)] : null])}
  <div class="card prose"><h2>${esc(t('seo.ps.meaningH', { g, r }))}</h2><p>${esc(dgTxt)}</p><p>${esc(t('seo.ps.fa2', { g, r, k: L.names.karaka[p], n: sentence1(t('seo.rst.' + s)) }))}</p><p>${esc(t('seo.ps.elem.' + (s % 4), { g }))}</p></div>
  <h2 class="sub-h">${esc(t('seo.ps.byLagna', { g, r }))}</h2><div class="card seo-tablewrap"><table class="seo-table"><thead><tr><th>${esc(t('seo.ps.lagna'))}</th><th>${esc(t('seo.ps.house'))}</th><th>${esc(t('seo.ps.lordOf'))}</th></tr></thead><tbody>${lagnaRows}</tbody></table></div>
  <p class="muted small">${esc(L.lp.disclaimer)}</p>
  ${h.cta(t('seo.ps.cta', { g }), '', t('seo.rd.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.ps.sameP', { g }), SIGN_SLUG.map((ls, j) => j === s ? `<span class="tag gold">${esc(h.rashi(j))}</span>` : h.link(`learn/${PL_SLUG(p)}-in-${ls}/`, h.rashi(j))))}
  ${h.linkrow(t('seo.ps.sameS', { r }), PLANETS9.filter(q => q !== p).map(q => h.link(`learn/${PL_SLUG(q)}-in-${SIGN_SLUG[s]}/`, gr(q))))}`;
  const h1 = t('seo.ps.h1', { g, r, w: t('seo.west.' + s) }), slug = `learn/${PL_SLUG(p)}-in-${SIGN_SLUG[s]}/`;
  return pageObj(h, { id: 'learn-ps', slug, article: true, title: t('seo.ps.title', { g, r, w: t('seo.west.' + s) }), desc: t('seo.ps.desc', { g, r, d: t('seo.ps.d.' + dg) }), h1, body: article(h, { eye: t('seo.ps.eye'), h1, lede: dgTxt, icon: gimg(p, 'gimg xl'), html }), faq, priority: '0.6', crumbs: learnCrumb(L2 => S.tr(L2, 'seo.ps.h1', { g: L2.names.graha[p], r: L2.names.rashi[s], w: S.tr(L2, 'seo.west.' + s) }), slug) });
}

// ===================== BABY NAMES =====================
const ALL_NAMES = () => once('names:all', () => require('./names-data.js').filter(n => n.name && /^[A-Za-z]/.test(n.name)));
const LETTERS = () => once('names:letters', () => { const c = {}; ALL_NAMES().forEach(n => { const l = n.name[0].toLowerCase(); c[l] = c[l] || { m: 0, f: 0 }; if (n.gender !== 'f') c[l].m++; if (n.gender !== 'm') c[l].f++; }); return Object.keys(c).sort().filter(l => /[a-z]/.test(l)).map(l => ({ l, ...c[l] })); });
const MIN_L = 10; // fewer names than this makes a thin page: skip it
const nameRow = (h, n) => `<tr><td><b>${esc(n.name)}</b></td><td><span class="tag ${n.gender === 'm' ? '' : n.gender === 'f' ? 'gold' : 'good'}">${esc(h.t('nm.g.' + n.gender))}</span></td><td>${esc(n.meaning)}</td></tr>`;
const nameTable = (h, arr) => `<div class="card seo-tablewrap"><table class="seo-table names-t"><thead><tr><th>${esc(h.t('seo.bn.name'))}</th><th>${esc(h.t('seo.bn.gender'))}</th><th>${esc(h.t('seo.bn.meaning'))}</th></tr></thead><tbody>${arr.map(n => nameRow(h, n)).join('')}</tbody></table></div>`;
function namesNakPage(lang, i) {
  const h = H(lang), { t, L } = h, nk = h.nak(i), r = N.forNakshatra({ nak: i, gender: '' }), syl = r.syllables;
  const boys = r.names.filter(n => n.gender !== 'f'), girls = r.names.filter(n => n.gender !== 'm');
  const sylLocal = L.names.syll[i];
  const faq = [{ q: t('seo.bn.fq1', { n: nk }), a: t('seo.bn.fa1', { n: nk, list: list(L, sylLocal) }) }, { q: t('seo.bn.fq2', { n: nk }), a: list(L, boys.slice(0, 8).map(n => n.name)) || '—' }, { q: t('seo.bn.fq3', { n: nk }), a: list(L, girls.slice(0, 8).map(n => n.name)) || '—' }];
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.bn.index'), slug: 'baby-names/' }, { name: nk }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.bn.eye'))}</p><h1>${esc(t('seo.bn.nakH1', { n: nk }))}</h1><p class="lede">${esc(t('seo.bn.nakLede', { n: nk, list: list(L, sylLocal), s: syl.join(', ') }))}</p></div>
  <div class="card seo-sum"><dl class="seo-kv">${[1, 2, 3, 4].map(p => `<div><dt>${esc(t('seo.nk.pada', { n: p }))}</dt><dd><b>${esc(sylLocal[p - 1])}</b> <small class="muted">(${esc(syl[p - 1])})</small></dd></div>`).join('')}</dl></div>
  <h2 class="sub-h">${esc(t('seo.bn.boysH', { n: nk }))}</h2>${boys.length ? nameTable(h, boys) : `<p class="muted">${esc(t('seo.bn.few'))}</p>`}
  <h2 class="sub-h">${esc(t('seo.bn.girlsH', { n: nk }))}</h2>${girls.length ? nameTable(h, girls) : `<p class="muted">${esc(t('seo.bn.few'))}</p>`}
  <p class="muted small">${esc(t('seo.bn.note'))}</p>
  ${h.cta(t('seo.bn.cta'), 'names/', t('seo.nk.namesBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.bn.byNak'), D.NAK_SLUG.map((sl, j) => j === i ? `<span class="tag gold">${esc(h.nak(j))}</span>` : h.link(`baby-names/${sl}-nakshatra/`, h.nak(j))))}
  ${h.linkrow(t('seo.nk.all'), [h.link(`learn/${D.NAK_SLUG[i]}-nakshatra/`, t('seo.nk.h1', { n: nk }))])}
</main>`;
  const slug = `baby-names/${D.NAK_SLUG[i]}-nakshatra/`;
  return pageObj(h, { id: 'names-nak', slug, title: t('seo.bn.nakTitle', { n: nk }), desc: t('seo.bn.nakDesc', { n: nk, list: list(L, sylLocal) }), h1: t('seo.bn.nakH1', { n: nk }), body, faq, priority: '0.6', crumbs: [{ name: L2 => L2.seo.bn.index, slug: 'baby-names/' }, { name: L2 => L2.names.nak[i], slug }] });
}
function namesLetterPage(lang, gender, l) {
  const h = H(lang), { t, L } = h, U = l.toUpperCase(), arr = ALL_NAMES().filter(n => n.name[0].toLowerCase() === l && (gender === 'm' ? n.gender !== 'f' : n.gender !== 'm')).sort((a, b) => a.name.localeCompare(b.name));
  const naks = D.NAK_SLUG.map((_, i) => i).filter(i => N.SYLL[i].some(sy => sy[0].toLowerCase() === l));
  const gk = gender === 'm' ? 'boy' : 'girl';
  const faq = [{ q: t(`seo.bn.${gk}Fq`, { l: U }), a: list(L, arr.slice(0, 10).map(n => n.name)) }, ...(naks.length ? [{ q: t('seo.bn.letterFq2', { l: U }), a: list(L, naks.map(h.nak)) }] : [])];
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.bn.index'), slug: 'baby-names/' }, { name: t(`seo.bn.${gk}Short`, { l: U }) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.bn.eye'))}</p><h1>${esc(t(`seo.bn.${gk}H1`, { l: U }))}</h1><p class="lede">${esc(t('seo.bn.letterLede', { n: arr.length, l: U }))}</p></div>
  ${nameTable(h, arr)}
  ${naks.length ? `<div class="card prose"><h2>${esc(t('seo.bn.letterNakH', { l: U }))}</h2><p>${naks.map(i => `<a href="${h.base}baby-names/${D.NAK_SLUG[i]}-nakshatra/">${esc(h.nak(i))}</a>`).join(', ')}</p></div>` : ''}
  <p class="muted small">${esc(t('seo.bn.note'))}</p>
  ${h.cta(t('seo.bn.cta'), 'names/', t('seo.nk.namesBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t(`seo.bn.${gk}All`), LETTERS().filter(x => x[gender] >= MIN_L).map(x => x.l === l ? `<span class="tag gold">${x.l.toUpperCase()}</span>` : h.link(`baby-names/${gk}-names-starting-with-${x.l}/`, x.l.toUpperCase())))}
</main>`;
  const slug = `baby-names/${gk}-names-starting-with-${l}/`;
  let bnDesc = t('seo.bn.letterLede', { n: arr.length, l: U });
  if (bnDesc.length < 110) bnDesc += ' ' + t('seo.bn.note');
  return pageObj(h, { id: 'names-letter', slug, title: t(`seo.bn.${gk}Title`, { l: U }), desc: bnDesc, h1: t(`seo.bn.${gk}H1`, { l: U }), body, faq, priority: '0.6', crumbs: [{ name: L2 => L2.seo.bn.index, slug: 'baby-names/' }, { name: L2 => S.tr(L2, `seo.bn.${gk}Short`, { l: U }), slug }] });
}
function namesIndex(lang) {
  const h = H(lang), { t } = h;
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('seo.bn.index') }])}
  <div class="page-hero"><p class="eyebrow">${esc(t('seo.bn.eye'))}</p><h1>${esc(t('seo.bn.indexH1'))}</h1><p class="lede">${esc(t('seo.bn.indexLede', { n: ALL_NAMES().length }))}</p></div>
  ${h.linkrow(t('seo.bn.byNak'), D.NAK_SLUG.map((sl, j) => h.link(`baby-names/${sl}-nakshatra/`, h.nak(j))))}
  ${h.linkrow(t('seo.bn.boyAll'), LETTERS().filter(x => x.m >= MIN_L).map(x => h.link(`baby-names/boy-names-starting-with-${x.l}/`, x.l.toUpperCase())))}
  ${h.linkrow(t('seo.bn.girlAll'), LETTERS().filter(x => x.f >= MIN_L).map(x => h.link(`baby-names/girl-names-starting-with-${x.l}/`, x.l.toUpperCase())))}
  ${h.cta(t('seo.bn.cta'), 'names/', t('seo.nk.namesBtn'))}
</main>`;
  return pageObj(h, { id: 'names-index', slug: 'baby-names/', title: t('seo.bn.indexTitle'), desc: t('seo.bn.indexLede', { n: ALL_NAMES().length }), h1: t('seo.bn.indexH1'), body, priority: '0.7', freq: 'monthly', crumbs: [{ name: L2 => L2.seo.bn.index, slug: 'baby-names/' }] });
}

// ===================== WEEKLY / MONTHLY RASHIFAL (server-rendered) =====================
function signPeriod(lang, s, kind, nowMs = Date.now()) {
  const h = H(lang), { t, L, gr } = h, ist = new Date(nowMs + 330 * 60000), y = ist.getUTCFullYear(), m = ist.getUTCMonth(), d = ist.getUTCDate();
  let from, n;
  if (kind === 'weekly') { const wd = (ist.getUTCDay() + 6) % 7; from = Date.UTC(y, m, d - wd); n = 7; } else { from = Date.UTC(y, m, 1); n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }
  const days = Array.from({ length: n }, (_, k) => { const dt = new Date(from + k * DAY), x = R.forDate(from + k * DAY + 30 * 60000).signs[s]; return { dt, x }; });
  const avg = k => Math.max(1, Math.min(5, Math.round(days.reduce((a, b) => a + (k ? b.x.area[k] : b.x.stars), 0) / n)));
  const best = days.slice().sort((a, b) => b.x.stars - a.x.stars || a.dt - b.dt).slice(0, 3).sort((a, b) => a.dt - b.dt);
  const care = days.filter(z => z.x.chandrashtama);
  // Planet sign changes in the period
  const changes = []; for (const p of ['Sun', 'Mars', 'Mercury', 'Venus', 'Jupiter', 'Saturn', 'Rahu']) { let prev = Math.floor(J.transit(jd(from)).lon[p] / 30); for (let k = 1; k <= n; k++) { const sg = Math.floor(J.transit(jd(from + k * DAY)).lon[p] / 30); if (sg !== prev) { const hh = (sg - s + 12) % 12 + 1; changes.push({ p, sg, dt: new Date(from + k * DAY), hh, good: S.GOCHAR_GOOD[p].includes(hh) }); prev = sg; } } }
  const r = h.rashi(s), period = kind === 'weekly' ? `${h.fDM.format(days[0].dt)} – ${h.fDM.format(days[n - 1].dt)}` : h.fMonthY.format(days[0].dt);
  const k2 = kind === 'weekly' ? 'rw' : 'rm';
  const faq = [{ q: t(`seo.${k2}.fq1`, { r }), a: t('seo.rp.fa1', { n: avg(), b: list(L, best.map(z => h.fDM.format(z.dt))) }) }, { q: t('seo.rp.fq2', { r }), a: care.length ? t('seo.rp.fa2', { list: list(L, care.map(z => h.fDM.format(z.dt))) }) : t('seo.rp.fa2none') }];
  const grid = kind === 'weekly' ? `<div class="card seo-week">${days.map(w => `<div><b>${esc(h.fWd.format(w.dt))}</b><small>${esc(h.fDM.format(w.dt))}</small>${h.stars(w.x.stars)}${w.x.chandrashtama ? `<span class="tag bad">${esc(t('seo.rd.ch8'))}</span>` : ''}</div>`).join('')}</div>`
    : `<div class="card seo-tablewrap"><table class="seo-table rp-month"><tbody>${days.map(w => `<tr${w.x.chandrashtama ? ' class="warn"' : ''}><td class="num">${esc(h.fDM.format(w.dt))} <small class="muted">${esc(h.fWd.format(w.dt))}</small></td><td>${h.stars(w.x.stars)}</td><td class="small">${esc(t('rf.moon.' + (w.x.moonHouse - 1)))}</td></tr>`).join('')}</tbody></table></div>`;
  const body = `<main class="wrap page seo-page">${h.crumbsHtml([{ name: t('pages.rashifal.name'), slug: 'rashifal/' }, { name: r, slug: `rashifal/${SIGN_SLUG[s]}/` }, { name: t(`seo.${k2}.short`) }])}
  <div class="page-hero"><p class="eyebrow">${esc(t(`seo.${k2}.eye`))}</p><h1>${esc(t(`seo.${k2}.h1`, { r, w: t('seo.west.' + s), p: period }))}</h1><p class="lede">${esc(t('seo.rp.lede', { r, p: period, b: list(L, best.map(z => h.fDM.format(z.dt))) }))}</p></div>
  <div class="card seo-sum"><div><span class="eyebrow">${esc(t('seo.ry.overall'))}</span><p class="seo-big">${h.stars(avg())}</p></div><dl class="areas">${['career', 'money', 'love', 'health'].map(a => `<div><dt>${esc(t('rf.area.' + a))}</dt><dd>${h.stars(avg(a))}</dd></div>`).join('')}</dl></div>
  <h2 class="sub-h">${esc(t('seo.rp.daysH'))}</h2>${grid}
  ${changes.length ? `<div class="card prose"><h2>${esc(t('seo.rp.changesH'))}</h2><ul class="seo-tr">${changes.map(c => `<li class="${c.good ? 'good' : 'bad'}"><span class="num">${esc(h.fDM.format(c.dt))}</span> <b>${esc(t('seo.ry.enters', { g: gr(c.p), r: h.rashi(c.sg) }))}</b> — ${esc(t('seo.ry.house', { h: c.hh, m: L.names.house[c.hh - 1] }))} <span class="tag ${c.good ? 'good' : 'bad'}">${esc(t(c.good ? 'seo.ry.fav' : 'seo.ry.unfav'))}</span></li>`).join('')}</ul></div>` : ''}
  ${care.length ? `<p class="tag bad">${esc(t('seo.rp.fa2', { list: list(L, care.map(z => h.fDM.format(z.dt))) }))}</p>` : ''}
  <p class="muted small">${esc(t('rf.note'))}</p>
  ${h.cta(t('seo.rd.cta'), '', t('seo.rd.ctaBtn'))}
  ${h.faqHtml(faq)}
  ${h.linkrow(t('seo.rd.allSigns'), SIGN_SLUG.map((sl, i) => i === s ? `<span class="tag gold">${esc(h.rashi(i))}</span>` : h.link(`rashifal/${sl}/${kind}/`, h.rashi(i))))}
  ${h.linkrow(t('seo.links.thisSign', { r }), [h.link(`rashifal/${SIGN_SLUG[s]}/`, t('seo.rd.short')), h.link(`rashifal/${SIGN_SLUG[s]}/${kind === 'weekly' ? 'monthly' : 'weekly'}/`, t(`seo.${kind === 'weekly' ? 'rm' : 'rw'}.short`)), h.link(`rashifal/${SIGN_SLUG[s]}/${y}/`, t('seo.ry.short', { y }))])}
  ${moreLinks(h, { year: y }, { sign: s })}
</main>`;
  const slug = `rashifal/${SIGN_SLUG[s]}/${kind}/`;
  return pageObj(h, { id: 'sign-' + kind, slug, title: t(`seo.${k2}.title`, { r, w: t('seo.west.' + s), p: period }), desc: t('seo.rp.lede', { r, p: period, b: list(L, best.map(z => h.fDM.format(z.dt))) }), h1: t(`seo.${k2}.h1`, { r, w: t('seo.west.' + s), p: period }), body, faq, freq: kind === 'weekly' ? 'weekly' : 'monthly', priority: '0.7', crumbs: [{ name: L2 => L2.pages.rashifal.name, slug: 'rashifal/' }, { name: L2 => L2.names.rashi[s], slug: `rashifal/${SIGN_SLUG[s]}/` }, { name: L2 => L2.seo[k2].short, slug }] });
}

// ===================== lists =====================
function staticPages2(lang) {
  const out = [], Y = S_YEARS();
  for (const id of Object.keys(FG.GUIDES)) out.push(pujaPage(lang, id));
  for (const y of Y) { out.push(yearCalPage(lang, y)); for (let m = 0; m < 12; m++) out.push(monthPage(lang, y, m)); for (const [sl, p] of GT) out.push(transitPage(lang, sl, p, y)); for (const p of RT) out.push(retroPage(lang, p, y)); }
  out.push(transitIndex(lang));
  for (const p of J.DASHA_ORDER) out.push(mahadashaPage(lang, p));
  for (const [id, sl] of YOGAS) out.push(yogaPage(lang, id, sl));
  for (const p of PLANETS9) for (let s = 0; s < 12; s++) out.push(planetSignPage(lang, p, s));
  out.push(namesIndex(lang));
  for (let i = 0; i < 27; i++) out.push(namesNakPage(lang, i));
  for (const x of LETTERS()) { if (x.m >= MIN_L) out.push(namesLetterPage(lang, 'm', x.l)); if (x.f >= MIN_L) out.push(namesLetterPage(lang, 'f', x.l)); }
  return out.filter(Boolean);
}
const dailySlugs2 = () => SIGN_SLUG.flatMap(s => [`rashifal/${s}/weekly/`, `rashifal/${s}/monthly/`]);

module.exports = { staticPages2, signPeriod, dailySlugs2, YOGAS, MONTH_SLUG, GT, RT, PL_SLUG, LETTERS };
