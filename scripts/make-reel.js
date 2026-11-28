#!/usr/bin/env node
/* Grahavani Light-Theme Animated Reel Generator with Real Data (lib/reel-cards.js) + Per-Slide Hindi TTS.
   - For data-driven topics (rashifal, panchang, rahu-kaal, special-day, daily-all-in-one, transit, match, etc.),
     renders the real Grahavani cards via lib/reel-cards.js (base -> progressive bands -> full) and speaks live
     computed Hindi facts (Rahu Kaal time, Abhijit Muhurat, Tithi, Nakshatra, Top Rashis, Chandrashtama).
   - For Samudrika / Gochar / educational topics, renders the 3-row light-theme cards from scripts/reel-topics.js.

   Usage:
     node scripts/make-reel.js --list
     node scripts/make-reel.js --topic rahu-kaal
     node scripts/make-reel.js --topic daily-rashifal
     node scripts/make-reel.js --topic daily-all-in-one
     node scripts/make-reel.js --topic mesha-gochar
*/
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = path.join(__dirname, '..');
const T = require(path.join(ROOT, 'lib/hbtext.js'));
const SC = require(path.join(ROOT, 'lib/social-card.js'));
const RC = require(path.join(ROOT, 'lib/reel-cards.js'));
const R = require(path.join(ROOT, 'lib/rashifal.js'));
const P = require(path.join(ROOT, 'lib/panchang.js'));
const L_HI = require(path.join(ROOT, 'locales/hi.json'));
const IG = require(path.join(ROOT, 'lib/social-links.js')).links().instagram;
const TEMPLATES = require('./reel-topics.js');

const W = 1080, H = 1920, MX = 72;
const K = { bg: '#FBF7EF', card: '#FFFFFF', ink: '#17172B', sub: '#6E6A80', accent: '#E0701B', soft: '#FCEBDA', line: '#EEE6D8', good: '#23855A', bad: '#D0342C' };
const { glyph, logo } = SC.kit;
const rect = (x, y, w, h, r, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

const FONT_FILES = [
  path.join(ROOT, 'lib/fonts/Hind-Regular.ttf'),
  path.join(ROOT, 'lib/fonts/Hind-Bold.ttf'),
  path.join(ROOT, 'lib/fonts/Hind-SemiBold.ttf')
];

const DELHI = { name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 330 };
function todayIst() {
  const d = new Date(Date.now() + 330 * 60000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
const hm = ms => {
  const d = new Date(ms + 330 * 60000);
  return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
};

// Map topics to real lib/reel-cards.js card sequences + live Hindi speech builder
function realSpecFor(topicId, date, city) {
  const ms = Date.UTC(date.y, date.m - 1, date.d, 0, 30);
  const rf = R.forDate(ms);
  const rHi = L_HI.names.rashi;
  const ch = rf.signs.filter(s => s.chandrashtama).map(s => rHi[s.sign]).join(' और ');
  const top = [...rf.signs].sort((a, b) => b.stars - a.stars).slice(0, 3).map(s => rHi[s.sign]).join(', ');
  const p = P.day({ year: date.y, month: date.m, day: date.d, lat: city.lat, lon: city.lon, tzMinutes: 330 });
  const tithiName = SC.tithiName(k => k.split('.').reduce((o, x) => o && o[x], L_HI), p.tithi[0].index);
  const nakName = L_HI.names.nak[p.nakshatra[0].index];
  const rahu = `${hm(p.rahuKaal.start)} से ${hm(p.rahuKaal.end)}`;
  const abh = p.abhijit ? `${hm(p.abhijit.start)} से ${hm(p.abhijit.end)}` : 'दोपहर';

  const MAP = {
    'daily-all-in-one': [
      { kind: 'day', speech: `आज का विशेष दिन। जानिए आज के मुख्य योग, शुभ मुहूर्त और किन बातों से सावधान रहना है।` },
      { kind: 'day2', speech: `आज का अभिजीत मुहूर्त ${abh} तक रहेगा। राहुकाल ${rahu} तक है, इस समय बड़े निर्णय टालें।` },
      { kind: 'rashifal', speech: `आज का राशिफल। ${top} राशि वालों के लिए आज का दिन विशेष शुभ है। ${ch} राशि वाले आज सावधानी रखें।` },
      { kind: 'rashifal2', speech: `सभी 12 राशियों के करियर, धन, प्रेम और स्वास्थ्य अंक तथा आपका लकी रंग और नंबर देखें।` },
      { kind: 'panchang', speech: `आज का पंचांग। आज ${tithiName} तिथि और ${nakName} नक्षत्र है।` },
      { kind: 'panchang2', speech: `आज का राहुकाल ${rahu} तक है। ग्रहवाणी पर अपनी मुफ़्त कुंडली अभी देखें।` }
    ],
    'daily-rashifal': [
      { kind: 'rashifal', speech: `आज का राशिफल। ${top} राशि वालों के लिए आज का दिन विशेष शुभ है। ${ch} राशि वाले आज सावधानी रखें।` },
      { kind: 'rashifal2', speech: `सभी 12 राशियों के करियर, धन, प्रेम, स्वास्थ्य सितारे और आज का लकी नंबर व रंग।` }
    ],
    'daily-panchang': [
      { kind: 'panchang', speech: `आज का पंचांग। आज ${tithiName} तिथि और ${nakName} नक्षत्र है। सूर्योदय ${hm(p.sunrise)} और सूर्यास्त ${hm(p.sunset)} पर होगा।` },
      { kind: 'panchang2', speech: `आज का अभिजीत मुहूर्त ${abh} तक और राहुकाल ${rahu} तक रहेगा।` }
    ],
    'rahu-kaal': [
      { kind: 'panchang2', speech: `आज का राहुकाल और अभिजीत मुहूर्त। आज राहुकाल ${rahu} तक रहेगा, इस समय नया काम या यात्रा टालें। आज का शुभ अभिजीत मुहूर्त ${abh} तक है।` },
      { kind: 'day2', speech: `अपने शहर का सटीक राहुकाल और चौघड़िया देखने के लिए ग्रहवाणी डॉट ध्रुव बोघाणी डॉट कॉम पर जाएं।` }
    ],
    'special-day': [
      { kind: 'day', speech: `आज का विशेष दिन। आज ${tithiName} तिथि और ${nakName} नक्षत्र है। जानिए आज के शुभ योग।` },
      { kind: 'day2', speech: `आज का अभिजीत मुहूर्त ${abh} तक है। राहुकाल ${rahu} तक रहेगा, इसमें बड़े सौदे न करें।` }
    ],
    'weekly-rashifal': [
      { kind: 'week', speech: `साप्ताहिक राशिफल। इस सप्ताह के प्रमुख शुभ दिन और किन राशियों को विशेष लाभ होगा, जानिए।` },
      { kind: 'week2', speech: `सप्ताह के सभी दिनों का राशि और शुभ समय विवरण देखें।` }
    ],
    'weekly-festivals': [
      { kind: 'fest', speech: `इस सप्ताह के प्रमुख व्रत और त्योहार। सही तिथि और शुभ मुहूर्त की पूरी जानकारी।` },
      { kind: 'fest2', speech: `ग्रहवाणी पर सभी व्रत कथा और पूजा विधि मुफ्त पढ़ें।` }
    ],
    'mulank-bhagyank': [
      { kind: 'mulank', opts: { n: 1, y: date.y }, speech: `मूलांक 1 से 9 का वार्षिक फल। जानिए आपकी जन्मतिथि का स्वामी ग्रह और लकी रंग।` },
      { kind: 'mulank2', opts: { n: 1, y: date.y }, speech: `अपने मूलांक के अनुसार शुभ दिन, व्यापार और उपाय देखें।` }
    ],
    'monthly-mulank': [
      { kind: 'numonth', opts: { y: date.y, m: date.m }, speech: `मासिक मूलांक भविष्यफल। इस महीने की आपकी सबसे शुभ तारीखें और सावधानियां।` },
      { kind: 'numonth2', opts: { y: date.y, m: date.m }, speech: `ग्रहवाणी पर अपना पूरा अंक ज्योतिष चार्ट अभी देखें।` }
    ],
    'sade-sati': [
      { kind: 'transit', opts: { planet: 'Saturn' }, speech: `शनि गोचर और साढ़ेसाती स्टेटस। जानिए अभी किन राशियों पर साढ़ेसाती और ढैया चल रही है।` },
      { kind: 'transit2', opts: { planet: 'Saturn' }, speech: `शनिवार को तिल के तेल का दीपक जलाएं और अपनी साढ़ेसाती तिथियां जांचें।` }
    ],
    'vakri-margi': [
      { kind: 'transit', opts: { planet: 'Mercury' }, speech: `ग्रह गोचर और वक्री मार्गी प्रभाव। किस राशि को लाभ मिलेगा और किसे सावधान रहना है।` },
      { kind: 'transit2', opts: { planet: 'Mercury' }, speech: `अपनी राशि के अनुसार सरल वैदिक उपाय अपनाएं।` }
    ],
    'graha-yuti': [
      { kind: 'transit', opts: { planet: 'Jupiter' }, speech: `गुरु गोचर और ग्रह युति का आपके करियर, धन और परिवार पर सीधा प्रभाव।` },
      { kind: 'transit2', opts: { planet: 'Jupiter' }, speech: `ग्रहवाणी पर अपना लाइव गोचर अभी जांचें।` }
    ],
    'kundali-match': [
      { kind: 'match', opts: { bSign: 0, gSign: 4 }, speech: `कुंडली मिलान के 36 गुण। नाड़ी, भकूट और पोरुथम मिलान क्यों जरूरी है, जानिए।` },
      { kind: 'match2', opts: { bSign: 0, gSign: 4 }, speech: `ग्रहवाणी पर मुफ़्त 36 गुण मिलान रिपोर्ट अभी निकालें।` }
    ],
    'rashi-ratna': [
      { kind: 'gem', opts: { sign: 0 }, speech: `राशि रत्न गाइड। बिना कुंडली जांचे रत्न न पहनें—जानिए सही रत्न, धातु और वार।` },
      { kind: 'gem2', opts: { sign: 0 }, speech: `अपनी कुंडली के अनुसार शुभ रत्न ग्रहवाणी पर जांचें।` }
    ],
    'muhurat-guides': [
      { kind: 'muhurta', opts: { purpose: 'marriage' }, speech: `शुभ मुहूर्त गाइड। विवाह, गृह प्रवेश और वाहन खरीद के लिए शास्त्र सम्मत शुभ तिथियां।` },
      { kind: 'muhurta2', opts: { purpose: 'marriage' }, speech: `अपने शहर के अनुसार सटीक मुहूर्त ग्रहवाणी पर देखें।` }
    ],
    'prashna': [
      { kind: 'prashna', opts: { topic: 'career' }, speech: `प्रश्न कुंडली। बिना जन्म समय के भी प्रश्न पूछने के समय से सटीक उत्तर जानें।` },
      { kind: 'prashna2', opts: { topic: 'career' }, speech: `अभी अपना प्रश्न ग्रहवाणी पर जांचें।` }
    ],
    'ekadashi': [
      { kind: 'vrat', opts: { vrat: 'ekadashi' }, speech: `एकादशी व्रत विशेष। सही तिथि, पारण समय और भगवान विष्णु की कृपा पाने का नियम।` },
      { kind: 'vrat2', opts: { vrat: 'ekadashi' }, speech: `पूरा व्रत कैलेंडर और कथा ग्रहवाणी पर पढ़ें।` }
    ],
    'puja-vrat': [
      { kind: 'vrat', opts: { vrat: 'purnima' }, speech: `संपूर्ण पूजा विधि और व्रत गाइड। सरल सामग्री और मंत्र के साथ घर पर पूजा करें।` },
      { kind: 'vrat2', opts: { vrat: 'purnima' }, speech: `6 भाषाओं में पूजा विधि ग्रहवाणी पर देखें।` }
    ],
    'baby-names': [
      { kind: 'names', opts: { sign: 0 }, speech: `नक्षत्र अनुसार शिशु नामकरण। जन्म नक्षत्र और चरण के शुभ अक्षर व आधुनिक वैदिक नाम।` },
      { kind: 'names2', opts: { sign: 0 }, speech: `सभी 27 नक्षत्रों के नाम ग्रहवाणी पर खोजें।` }
    ],
    'dream-calc': [
      { kind: 'dream', opts: { dream: 'snake' }, speech: `स्वप्न फल और ब्रह्म मुहूर्त। जानिए रात के किस प्रहर का सपना कब सच होता है और प्रमुख प्रतीकों का अर्थ।` },
      { kind: 'dream2', opts: { dream: 'snake' }, speech: `50 से अधिक स्वप्न संकेतों का अर्थ ग्रहवाणी पर देखें।` }
    ],
    'dasha-shift': [
      { kind: 'dasha', opts: { planet: 'Rahu' }, speech: `महादशा परिवर्तन का असर। राहु, शनि या गुरु महादशा में जीवन की दिशा कैसे बदलती है।` },
      { kind: 'dasha2', opts: { planet: 'Rahu' }, speech: `अपनी वर्तमान महादशा और अंतर्दशा ग्रहवाणी पर देखें।` }
    ],
    'raj-yogas': [
      { kind: 'sign', opts: { sign: 4 }, speech: `कुंडली के प्रमुख राजयोग और आपकी राशि की विशेषताएं।` },
      { kind: 'sign2', opts: { sign: 4 }, speech: `अपनी कुंडली में राजयोग ग्रहवाणी पर जांचें।` }
    ],
    'lagna-12': [
      { kind: 'sign', opts: { sign: 0 }, speech: `आपका लग्न और चंद्र राशि। जानिए यह आपके करियर, स्वभाव और जीवन की दिशा कैसे तय करते हैं।` },
      { kind: 'sign2', opts: { sign: 0 }, speech: `अपना सटीक लग्न ग्रहवाणी पर निकालें।` }
    ]
  };
  return MAP[topicId] || null;
}

const CATALOG = Object.keys(TEMPLATES).concat(['daily-all-in-one']);

function makeBaseCard(signIdx, title, sub, sub2, rows) {
  let out = `<defs><filter id="sh" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#5A4A2A" flood-opacity=".10"/></filter></defs>`
    + rect(0, 0, W, H, 0, K.bg) + `<circle cx="${W - 40}" cy="40" r="170" fill="${K.soft}"/>`;
  out += logo(MX, 84, 58) + T.line('GRAHAVANI', { size: 30, weight: 700, letter: 4 }).svg(MX + 74, 124, { fill: K.ink });
  const chip = T.line('हिन्दी', { size: 28, weight: 700 }), cw = chip.width + 48;
  out += rect(W - MX - cw, 84, cw, 58, 29, K.card, `stroke="${K.accent}" stroke-width="2.5"`) + chip.svg(W - MX - cw / 2, 124, { align: 'center', fill: K.accent });
  let y = 260;
  const lines = T.wrap(title, W - 2 * MX - 120, { size: 76, weight: 700 }, 2);
  out += `<circle cx="${W - MX - 48}" cy="245" r="46" fill="${K.soft}"/>` + glyph(signIdx || 0, W - MX - 80, 213, 64, K.accent);
  lines.forEach(l => { out += l.svg(MX, y, { fill: K.ink }); y += 90; });
  out += rect(MX, y - 54, 110, 10, 5, K.accent); y += 14;
  if (sub) { out += T.fit(sub, W - 2 * MX, { size: 36, weight: 500 }).svg(MX, y, { fill: K.sub }); y += 50; }
  if (sub2) { out += T.fit(sub2, W - 2 * MX, { size: 30, weight: 600 }).svg(MX, y, { fill: K.accent }); y += 44; }
  out += T.line('grahavani.dhruvboghani.com', { size: 38, weight: 700 }).svg(W / 2, H - 132, { align: 'center', fill: K.accent });
  if (IG) out += T.line('Instagram @' + IG.handle, { size: 28, weight: 500 }).svg(W / 2, H - 84, { align: 'center', fill: K.sub });
  const cx = MX - 20, cw2 = W - 2 * cx, cy = y + 34, rowH = 260;
  out += rect(cx, cy, cw2, rows.length * rowH + 32, 36, K.card, 'filter="url(#sh)"');
  return { out, cx, cw2, cy, rowH };
}

function drawRow(cx, cw2, ry, rowH, r, idx) {
  let o = idx > 0 ? `<path d="M${cx + 36} ${ry}H${cx + cw2 - 36}" stroke="${K.line}" stroke-width="2"/>` : '';
  const mid = ry + rowH / 2;
  const toneColor = r.tone === 'good' ? K.good : r.tone === 'bad' ? K.bad : K.accent;
  const toneBg = r.tone === 'good' ? '#E4F3EC' : r.tone === 'bad' ? '#FBE3E1' : K.soft;
  o += `<circle cx="${cx + 76}" cy="${mid}" r="38" fill="${toneBg}"/>`;
  o += T.line(r.badge, { size: 34, weight: 700 }).svg(cx + 76, mid + 12, { align: 'center', fill: toneColor });
  o += T.fit(r.tag, cw2 - 170, { size: 24, weight: 700 }).svg(cx + 142, mid - 46, { fill: toneColor });
  o += T.fit(r.title, cw2 - 170, { size: 40, weight: 700 }).svg(cx + 142, mid + 4, { fill: K.ink });
  o += T.fit(r.desc, cw2 - 170, { size: 28, weight: 500 }).svg(cx + 142, mid + 52, { fill: K.sub });
  return o;
}

function renderPng(svgInner, filePath) {
  const resvg = new Resvg(SC.kit.wrapSvg(W, H, svgInner), {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Hind' }
  });
  fs.writeFileSync(filePath, resvg.render().asPng());
}

function durationSec(file) {
  const out = execSync(`ffmpeg -i "${file}" 2>&1 || true`, { encoding: 'utf8' });
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) : 8;
}

(async () => {
  const args = process.argv.slice(2);
  if (args.includes('--list') || !args.length) {
    console.log(`Available Reel Topics (${CATALOG.length}):\n`);
    for (const id of CATALOG) console.log(`- ${id} [READY TEMPLATE]`);
    return;
  }
  const ti = args.indexOf('--topic');
  const topicId = ti >= 0 ? args[ti + 1] : 'mesha-gochar';
  const date = todayIst();
  const realSpec = realSpecFor(topicId, date, DELHI);
  const tpl = TEMPLATES[topicId];
  if (!realSpec && !tpl) { console.error(`Unknown topic: ${topicId}`); process.exit(1); }

  await T.ready();
  const workDir = path.join('/tmp', 'gv_reel_' + topicId);
  fs.mkdirSync(workDir, { recursive: true });

  const inputs = [];
  const xfadeParts = [];
  const audioDelays = [];
  const slideEndIndices = new Set();
  let tCursor = 0;

  if (realSpec) {
    // Render real lib/reel-cards.js cards (base -> full) + outro, synced to real computed Hindi speech
    for (let i = 0; i < realSpec.length; i++) {
      const sp = realSpec[i];
      const aiff = path.join(workDir, `s${i}.aiff`);
      execSync(`say -v Lekha -r 142 -o "${aiff}" ${JSON.stringify(sp.speech)}`);
      const d = durationSec(aiff);
      const baseRes = await RC.reelCard(sp.kind, { lang: 'hi', date, city: DELHI, part: 'base', ...(sp.opts || {}) });
      const fullRes = await RC.reelCard(sp.kind, { lang: 'hi', date, city: DELHI, part: 'full', ...(sp.opts || {}) });
      const pBase = path.join(workDir, `r${i}_base.png`), pFull = path.join(workDir, `r${i}_full.png`);
      fs.writeFileSync(pBase, baseRes.buf); fs.writeFileSync(pFull, fullRes.buf);
      const dBase = 1.0, dFull = Math.max(4.5, d - 0.5);
      inputs.push({ file: pBase, dur: dBase }, { file: pFull, dur: dFull });
      slideEndIndices.add(inputs.length - 1);
      audioDelays.push({ file: aiff, delayMs: Math.round(tCursor * 1000) });
      tCursor += dBase + dFull - 0.35 - 0.45;
    }
    const outroRes = await RC.reelCard('outro', { lang: 'hi', date, city: DELHI, part: 'full' });
    const pOut = path.join(workDir, 'outro.png');
    fs.writeFileSync(pOut, outroRes.buf);
    inputs.push({ file: pOut, dur: 3.6 });
    tCursor += 3.6;
  } else {
    for (let i = 0; i < tpl.slides.length; i++) {
      const s = tpl.slides[i];
      const aiff = path.join(workDir, `s${i}.aiff`);
      execSync(`say -v Lekha -r 142 -o "${aiff}" ${JSON.stringify(s.speech)}`);
      const d = durationSec(aiff);
      const b = makeBaseCard(tpl.sign, s.title, s.sub, s.sub2, s.rows);
      const p0 = path.join(workDir, `s${i}_0.png`);
      renderPng(b.out, p0);
      const minSlideDur = tpl.slides.length === 1 ? 18.0 : 0;
      const baseTail = Math.max(2.5, d - 1.0 - Math.max(1.8, d * 0.28) * 2 + 0.8);
      const stepDurs = [1.0, Math.max(1.8, d * 0.28), Math.max(1.8, d * 0.28), Math.max(baseTail, minSlideDur - 1.0 - Math.max(1.8, d * 0.28) * 2)];
      inputs.push({ file: p0, dur: stepDurs[0] });
      let acc = b.out;
      s.rows.forEach((r, rIdx) => {
        acc += drawRow(b.cx, b.cw2, b.cy + 16 + rIdx * b.rowH, b.rowH, r, rIdx);
        const px = path.join(workDir, `s${i}_${rIdx + 1}.png`);
        renderPng(acc, px);
        inputs.push({ file: px, dur: stepDurs[rIdx + 1] });
      });
      slideEndIndices.add(inputs.length - 1);
      audioDelays.push({ file: aiff, delayMs: Math.round(tCursor * 1000) });
      tCursor += stepDurs.reduce((a, b2) => a + b2, 0) - (s.rows.length * 0.3) - (i < tpl.slides.length - 1 ? 0.45 : 0);
    }
  }

  const totalDur = tCursor.toFixed(2);
  const vInputs = inputs.map(x => `-framerate 30 -loop 1 -t ${x.dur.toFixed(2)} -i "${x.file}"`).join(' ');
  const aInputs = audioDelays.map(x => `-i "${x.file}"`).join(' ');
  const musicPath = path.join(ROOT, 'static/music/bansuri-yaman.mp3');

  let curLabel = '0:v', off = 0;
  for (let idx = 0; idx < inputs.length - 1; idx++) {
    const isSlideSwitch = slideEndIndices.has(idx);
    const trans = isSlideSwitch ? 'slideleft' : 'fade';
    const dur = isSlideSwitch ? 0.45 : 0.35;
    off += inputs[idx].dur - dur;
    const nextLabel = idx === inputs.length - 2 ? 'vout' : `v${idx + 1}`;
    const fmt = idx === inputs.length - 2 ? ',format=yuv420p' : '';
    xfadeParts.push(`[${curLabel}][${idx + 1}:v]xfade=transition=${trans}:duration=${dur}:offset=${off.toFixed(2)}${fmt}[${nextLabel}]`);
    curLabel = nextLabel;
  }

  const baseA = inputs.length;
  const aMixInputs = audioDelays.map((a, i) => `[${baseA + i}:a]${a.delayMs ? `adelay=${a.delayMs}|${a.delayMs},` : ''}volume=1.15[a${i}]`);
  const bgIdx = baseA + audioDelays.length;
  const aLabels = audioDelays.map((_, i) => `[a${i}]`).join('') + `[bg]`;
  const fadeStart = Math.max(1, parseFloat(totalDur) - 2.0).toFixed(2);

  const outMp4 = path.join(ROOT, 'shots2', `${topicId}-reel.mp4`);
  const cmd = [
    `ffmpeg -y ${vInputs} ${aInputs} -i "${musicPath}"`,
    `-filter_complex "${xfadeParts.join(';')};${aMixInputs.join(';')};[${bgIdx}:a]volume=0.14[bg];${aLabels}amix=inputs=${audioDelays.length + 1}:duration=longest:normalize=0,afade=t=out:st=${fadeStart}:d=2.0[aout]"`,
    `-map "[vout]" -map "[aout]" -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 160k -t ${totalDur}`,
    `"${outMp4}"`
  ].join(' ');

  execSync(cmd, { stdio: 'inherit' });
  console.log('Generated reel:', outMp4);
})();
