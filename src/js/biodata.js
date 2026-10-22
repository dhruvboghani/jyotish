/* Marriage biodata maker: one printable A4 page from a saved Kundali (or birth details typed here) plus personal and
   family details. Horoscope facts come from the same engine as the Kundali. The draft and photo stay on this device. */
const bdCity = cityPicker(() => bdDraw());
const BD_KEY = 'gv-biodata';
let bd = store.get(BD_KEY) || {}, bdRows = [];
bd.f = bd.f || {}; bd.style = bd.style || 'classic';
if (!bd.f.invocation && bd.f.invocation !== '') bd.f.invocation = t('bd.invocation');

const bdSave = () => { try { store.set(BD_KEY, bd); } catch (e) { } };
function bdBirth() {
  if (bd.pick && bd.pick !== 'manual') { const r = bdRows.find(x => x.id === bd.pick); if (r) return r.birth; }
  const d = $('#bd-date').value, tm = $('#bd-time').value; if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, dd] = d.split('-').map(Number), [h, mi] = (tm || '12:00').split(':').map(Number), c = bdCity.city;
  let tz = 330; try { tz = tzOffsetMinutes(c.tz || 'Asia/Kolkata', y, m, dd, h, mi); } catch (e) { }
  return { year: y, month: m, day: dd, hour: h, minute: mi, lat: c.lat, lon: c.lon, tzMinutes: tz, placeLabel: [c.name, c.region].filter(Boolean).join(', ') };
}
function bdAstro(b) {
  if (!b || !window.Jyotish) return null;
  const r = window.Jyotish.compute(b), m = r.P.Moon, av = r.avakahada, mg = r.manglik;
  const manglik = mg.lagna && mg.moon ? 'yes' : mg.lagna || mg.moon ? 'partial' : 'no';
  return { rashi: m.sign, nak: m.nak, pada: m.pada, lagna: r.lagna.sign, manglik, gana: av.gana, nadi: av.nadi, varna: av.varna, rashiLord: av.rashiLord, yoni: av.yoni };
}
function bdDraw() {
  const f = bd.f, b = bdBirth(), a = bdAstro(b), V = L.names.val;
  const row = (k, v) => v ? `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : '';
  const dob = b ? longDateFmt.format(new Date(Date.UTC(b.year, b.month - 1, b.day))) : '';
  const tob = b ? `${pad(b.hour)}:${pad(b.minute)}` : '';
  const block = (h, rows) => { const inner = rows.join(''); return inner ? `<section><h4>${esc(h)}</h4><dl>${inner}</dl></section>` : ''; };
  $('#bd-sheet').className = 'bd-sheet ' + bd.style;
  $('#bd-sheet').innerHTML = `${f.invocation ? `<p class="bd-inv">${esc(f.invocation)}</p>` : ''}<h2 class="bd-h">${esc(t('bd.heading'))}</h2>
    <div class="bd-top">${bd.photo ? `<img class="bd-ph" src="${bd.photo}" alt="">` : ''}<div><h3>${esc(f.name || (b && b.name) || t('bd.namePh'))}</h3><p>${esc([f.education, f.occupation].filter(Boolean).join(' · '))}</p></div></div>
    ${block(t('bd.personalH'), [row(t('bd.dob'), dob), row(t('bd.tob'), tob), row(t('bd.pob'), b && b.placeLabel), row(t('bd.height'), f.height), row(t('bd.education'), f.education), row(t('bd.occupation'), f.occupation), row(t('bd.gotra'), f.gotra), row(t('bd.native'), f.native)])}
    ${a ? block(t('bd.horoH'), [row(t('bd.rashi'), rn(a.rashi)), row(t('res.nakshatra'), `${nk(a.nak)} · ${t('res.pada', { p: a.pada })}`), row(t('res.lagna'), rn(a.lagna)), row(t('bd.manglik'), t('bd.mg.' + a.manglik)), row(t('sec.pan.av.gana'), V[a.gana]), row(t('sec.pan.av.nadi'), V[a.nadi]), row(t('sec.pan.av.varna'), V[a.varna]), row(t('sec.pan.av.rashiLord'), gn(a.rashiLord))]) : ''}
    ${block(t('bd.familyH'), [row(t('bd.father'), f.father), row(t('bd.mother'), f.mother), row(t('bd.siblings'), f.siblings)])}
    ${block(t('bd.contactH'), [row(t('st.phone'), f.phone), row(t('st.bAddr'), f.address)])}
    ${f.about ? `<section><h4>${esc(t('bd.about'))}</h4><p class="bd-about">${esc(f.about)}</p></section>` : ''}
    <p class="bd-foot">${esc(t('bd.foot'))}</p>`;
}
function bdFill() {
  $$('#bd-form [data-k]').forEach(el => { el.value = bd.f[el.dataset.k] || ''; });
  $$('#bd-style button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.style === bd.style)));
  const m = bd.manual || {}; if (m.date) $('#bd-date').value = m.date; if (m.time) $('#bd-time').value = m.time;
}
$('#bd-form').addEventListener('input', e => {
  const k = e.target.dataset && e.target.dataset.k;
  if (k) bd.f[k] = e.target.value;
  if (e.target.id === 'bd-date' || e.target.id === 'bd-time') bd.manual = { date: $('#bd-date').value, time: $('#bd-time').value };
  bdSave(); bdDraw();
});
$('#bd-style').addEventListener('click', e => { const b = e.target.closest('[data-style]'); if (!b) return; bd.style = b.dataset.style; bdSave(); bdFill(); bdDraw(); });
$('#bd-pick').addEventListener('change', () => {
  bd.pick = $('#bd-pick').value; $('#bd-birth').hidden = bd.pick !== 'manual';
  const r = bdRows.find(x => x.id === bd.pick); if (r && !bd.f.name) { bd.f.name = r.birth.name || ''; $('#bd-name').value = bd.f.name; }
  bdSave(); bdDraw();
});
// Photo: resized here and kept only in this browser
$('#bd-photo').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const s = Math.min(1, 480 / img.width, 600 / img.height), c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    bd.photo = c.toDataURL('image/jpeg', 0.85); URL.revokeObjectURL(url); bdSave(); bdDraw();
  };
  img.src = url;
});
$('#bd-photo-x').onclick = () => { delete bd.photo; $('#bd-photo').value = ''; bdSave(); bdDraw(); };
$('#bd-pdf').onclick = () => {
  document.body.classList.add('bd-printing');
  const done = () => document.body.classList.remove('bd-printing');
  if (APP && APP.print) APP.print(t('bd.heading') + ' ' + (bd.f.name || ''), done); else { window.print(); setTimeout(done, 800); }
};
$('#bd-wa').onclick = () => {
  const b = bdBirth(), a = bdAstro(b), f = bd.f;
  const lines = [t('bd.heading') + ': ' + (f.name || ''), b ? t('bd.dob') + ': ' + longDateFmt.format(new Date(Date.UTC(b.year, b.month - 1, b.day))) + ' ' + pad(b.hour) + ':' + pad(b.minute) : '', b && b.placeLabel ? t('bd.pob') + ': ' + b.placeLabel : '',
    a ? `${t('bd.rashi')}: ${rn(a.rashi)} · ${t('res.nakshatra')}: ${nk(a.nak)} ${a.pada} · ${t('bd.manglik')}: ${t('bd.mg.' + a.manglik)}` : '',
    f.education ? t('bd.education') + ': ' + f.education : '', f.occupation ? t('bd.occupation') + ': ' + f.occupation : '', f.phone ? t('st.phone') + ': ' + f.phone : ''].filter(Boolean).join('\n');
  if (APP && APP.share) APP.share({ title: t('bd.heading'), text: lines, url: '' });
  else window.open('https://wa.me/?text=' + encodeURIComponent(lines), '_blank', 'noopener');
};

async function bdRun() {
  bdRows = session ? (await loadMyKundalis()).map(k => ({ id: k.id, birth: { ...k.birth, name: k.birth.name || k.name || '' }, relation: k.relation })) : [];
  $('#bd-pick').innerHTML = bdRows.map(r => `<option value="${esc(r.id)}">${esc(r.birth.name || t('res.defaultName'))}${r.relation ? ' · ' + esc(L.rel[r.relation]) : ''}</option>`).join('') + `<option value="manual">${esc(t('bd.manual'))}</option>`;
  if (!bd.pick || (bd.pick !== 'manual' && !bdRows.some(r => r.id === bd.pick))) bd.pick = bdRows.length ? (bdRows.find(r => r.relation !== 'self') || bdRows[0]).id : 'manual';
  $('#bd-pick').value = bd.pick; $('#bd-birth').hidden = bd.pick !== 'manual';
  bdFill(); bdDraw();
}
bdFill(); addEventListener('load', bdDraw);
readyHooks.push(bdRun);
authHooks.push(() => bdRun());
