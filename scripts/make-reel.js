#!/usr/bin/env node
/* Grahavani Light-Theme Animated Reel Generator with Per-Slide Hindi TTS + Background Flute Music.
   Uses the modern light theme from lib/reel-cards.js (#FBF7EF cream, #FFFFFF cards, #E0701B saffron),
   HarfBuzz Devanagari shaping (lib/hbtext.js), progressive row reveals, slideleft transitions,
   macOS `say -v Lekha` per-slide synced TTS, and ffmpeg.

   Usage:
     node scripts/make-reel.js --list
     node scripts/make-reel.js --topic mesha-gochar
     node scripts/make-reel.js --topic chandrashtama
     node scripts/make-reel.js --topic palm-lines
*/
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = path.join(__dirname, '..');
const T = require(path.join(ROOT, 'lib/hbtext.js'));
const SC = require(path.join(ROOT, 'lib/social-card.js'));
const IG = require(path.join(ROOT, 'lib/social-links.js')).links().instagram;

const W = 1080, H = 1920, MX = 72;
const K = { bg: '#FBF7EF', card: '#FFFFFF', ink: '#17172B', sub: '#6E6A80', accent: '#E0701B', soft: '#FCEBDA', line: '#EEE6D8', good: '#23855A', bad: '#D0342C' };
const { glyph, logo } = SC.kit;
const rect = (x, y, w, h, r, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

const FONT_FILES = [
  path.join(ROOT, 'lib/fonts/Hind-Regular.ttf'),
  path.join(ROOT, 'lib/fonts/Hind-Bold.ttf'),
  path.join(ROOT, 'lib/fonts/Hind-SemiBold.ttf')
];

// Master catalog of all 52 reel topics across all Grahavani modules
const CATALOG = [
  // 1. Daily & Weekly
  { id: 'daily-rashifal', cat: 'Daily & Weekly', name: 'Daily Rashifal (12 Signs)' },
  { id: 'daily-panchang', cat: 'Daily & Weekly', name: 'Daily Panchang (Tithi, Nakshatra, Yoga)' },
  { id: 'special-day', cat: 'Daily & Weekly', name: "Today's Special Day / Festival / Vrat" },
  { id: 'rahu-kaal', cat: 'Daily & Weekly', name: "Today's Rahu Kaal & Best Abhijit Muhurat" },
  { id: 'chandrashtama', cat: 'Daily & Weekly', name: "Today's Chandrashtama Rashi Alert" },
  { id: 'hora-time', cat: 'Daily & Weekly', name: "Today's Planetary Hora (Best Hour)" },
  { id: 'choghadiya', cat: 'Daily & Weekly', name: 'Daily Choghadiya (Amrit/Shubh/Labh)' },
  { id: 'weekly-rashifal', cat: 'Daily & Weekly', name: 'Weekly Rashifal' },
  { id: 'weekly-festivals', cat: 'Daily & Weekly', name: "This Week's Festivals & Vrats" },
  { id: 'weekly-avoid', cat: 'Daily & Weekly', name: 'Weekly Avoid-Dates (Bhadra / Panchak)' },
  // 2. Rashi-Event & Transits
  { id: 'mesha-gochar', cat: 'Rashi Events', name: 'Graha Gochar: Fayde, Nuksan & Upay (Mesha Demo)' },
  { id: 'vakri-margi', cat: 'Rashi Events', name: 'Vakri & Margi (Retrograde / Direct)' },
  { id: 'sade-sati', cat: 'Rashi Events', name: 'Sade Sati & Dhaiya Status' },
  { id: 'graha-yuti', cat: 'Rashi Events', name: 'Graha Yuti & Rajayoga Transits' },
  { id: 'grahan', cat: 'Rashi Events', name: 'Surya & Chandra Grahan (Rashi Impact)' },
  { id: 'ast-uday', cat: 'Rashi Events', name: 'Guru / Shukra Ast & Uday' },
  { id: 'ekadashi', cat: 'Rashi Events', name: 'Ekadashi Special (Parana & Rashi Benefit)' },
  { id: 'purnima-amavasya', cat: 'Rashi Events', name: 'Purnima & Amavasya Rashi Remedy' },
  { id: 'panchak', cat: 'Rashi Events', name: 'Monthly Panchak Alert' },
  { id: 'rare-muhurat', cat: 'Rashi Events', name: 'Rare Yogas (Guru Pushya / Sarvartha Siddhi)' },
  // 3. Kundali, Dosha & Timing
  { id: 'raj-yogas', cat: 'Kundali & Dosha', name: 'Raj Yogas & Panch Mahapurusha Yogas' },
  { id: 'kaal-sarp', cat: 'Kundali & Dosha', name: '12 Types of Kaal Sarp Dosha' },
  { id: 'mangal-dosha', cat: 'Kundali & Dosha', name: 'Mangal Dosha & Cancellation Rules' },
  { id: 'navamsha', cat: 'Kundali & Dosha', name: 'Navamsha D-9 Marriage & Luck' },
  { id: 'ashtakavarga', cat: 'Kundali & Dosha', name: 'Ashtakavarga Bindu Score' },
  { id: 'varshphal', cat: 'Kundali & Dosha', name: 'Varshphal / Muntha Annual Prediction' },
  { id: 'dasha-shift', cat: 'Kundali & Dosha', name: 'Mahadasha & Antardasha Shifts' },
  { id: 'lagna-12', cat: 'Kundali & Dosha', name: '12 Lagna (Ascendant) Personalities' },
  { id: 'business-kundali', cat: 'Kundali & Dosha', name: 'Business Opening Kundali' },
  { id: 'prashna', cat: 'Kundali & Dosha', name: 'Prashna Kundali (Instant Horary)' },
  { id: 'delivery-muhurat', cat: 'Kundali & Dosha', name: 'Shubh Delivery Muhurat' },
  { id: 'muhurat-guides', cat: 'Kundali & Dosha', name: 'Vivah / Griha Pravesh / Vehicle Muhurat' },
  // 4. Numerology & Compatibility
  { id: 'mulank-bhagyank', cat: 'Numerology & Match', name: 'Mulank (1-9) & Bhagyank Series' },
  { id: 'monthly-mulank', cat: 'Numerology & Match', name: 'Monthly Mulank Forecast' },
  { id: 'comment-numerology', cat: 'Numerology & Match', name: 'Comment DOB for Lucky Color & Day' },
  { id: 'kundali-match', cat: 'Numerology & Match', name: 'Kundali 36 Guna Milan & Love Match' },
  { id: 'biodata', cat: 'Numerology & Match', name: 'Marriage Biodata Checklist' },
  { id: 'family-kundali', cat: 'Numerology & Match', name: 'Family Kundali & Combined Ratings' },
  // 5. Samudrika & Divination
  { id: 'palm-lines', cat: 'Samudrika & Divination', name: 'Palm Reading (Lines, Mounts & Rare Marks)' },
  { id: 'face-reading', cat: 'Samudrika & Divination', name: 'Face Reading (Tri-Bhumi & 9 Grahas)' },
  { id: 'mole-reading', cat: 'Samudrika & Divination', name: 'Mole Reading (Pingala/Ida & 20+ Spots)' },
  { id: 'forehead-lines', cat: 'Samudrika & Divination', name: 'Forehead 7 Planetary Lines' },
  { id: 'signature-vastu', cat: 'Samudrika & Divination', name: 'Signature Vastu (Score Out of 100)' },
  { id: 'thumb-nadi', cat: 'Samudrika & Divination', name: 'Thumb & Nadi (Chakra/Shankha/Dhwaja/Gadha)' },
  { id: 'foot-reading', cat: 'Samudrika & Divination', name: 'Foot Reading (Deva/Manushya/Bhumi Pada)' },
  { id: 'eye-reading', cat: 'Samudrika & Divination', name: 'Eye Reading (5 Vedic Netra Archetypes)' },
  { id: 'dream-calc', cat: 'Samudrika & Divination', name: 'Dream Timing (4 Prahars) & 50+ Symbols' },
  // 6. Spiritual & Utility
  { id: 'baby-names', cat: 'Spiritual & Utility', name: 'Baby Names by 27 Nakshatras' },
  { id: 'rashi-ratna', cat: 'Spiritual & Utility', name: 'Rashi Ratna (Gemstone Rules)' },
  { id: 'mantra-japa', cat: 'Spiritual & Utility', name: 'Mantra Japa (108 Beads & Weekday Mantra)' },
  { id: 'tithi-dates', cat: 'Spiritual & Utility', name: 'Janma Tithi & Shraddha Tithi' },
  { id: 'puja-vrat', cat: 'Spiritual & Utility', name: 'Puja Samagri & Vrat Katha Guides' }
];

// Full animated scripts loaded from scripts/reel-topics.js (all 52 topics)
const TEMPLATES = require('./reel-topics.js');

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
    for (const c of CATALOG) {
      const ready = TEMPLATES[c.id] ? ' [READY TEMPLATE]' : '';
      console.log(`- ${c.id.padEnd(20)} | ${c.cat.padEnd(22)} | ${c.name}${ready}`);
    }
    return;
  }
  const ti = args.indexOf('--topic');
  const topicId = ti >= 0 ? args[ti + 1] : 'mesha-gochar';
  const tpl = TEMPLATES[topicId];
  if (!tpl) {
    console.error(`Topic "${topicId}" not in TEMPLATES yet. Run --list to see topics with [READY TEMPLATE], or add it to TEMPLATES.`);
    process.exit(1);
  }

  await T.ready();
  const workDir = path.join('/tmp', 'gv_reel_' + topicId);
  fs.mkdirSync(workDir, { recursive: true });

  const inputs = [];
  const xfadeParts = [];
  const audioDelays = [];
  let tCursor = 0;

  for (let i = 0; i < tpl.slides.length; i++) {
    const s = tpl.slides[i];
    const aiff = path.join(workDir, `s${i}.aiff`);
    execSync(`say -v Lekha -r 142 -o "${aiff}" ${JSON.stringify(s.speech)}`);
    const d = durationSec(aiff);

    const b = makeBaseCard(tpl.sign, s.title, s.sub, s.sub2, s.rows);
    const p0 = path.join(workDir, `s${i}_0.png`);
    renderPng(b.out, p0);

    const stepDurs = [1.0, Math.max(1.8, d * 0.28), Math.max(1.8, d * 0.28), Math.max(2.5, d - 1.0 - Math.max(1.8, d * 0.28) * 2 + 0.8)];
    inputs.push({ file: p0, dur: stepDurs[0] });
    let acc = b.out;
    s.rows.forEach((r, rIdx) => {
      acc += drawRow(b.cx, b.cw2, b.cy + 16 + rIdx * b.rowH, b.rowH, r, rIdx);
      const px = path.join(workDir, `s${i}_${rIdx + 1}.png`);
      renderPng(acc, px);
      inputs.push({ file: px, dur: stepDurs[rIdx + 1] });
    });

    audioDelays.push({ file: aiff, delayMs: Math.round(tCursor * 1000) });
    tCursor += stepDurs.reduce((a, b2) => a + b2, 0) - (s.rows.length * 0.3) - (i < tpl.slides.length - 1 ? 0.45 : 0);
  }

  const totalDur = tCursor.toFixed(2);
  const vInputs = inputs.map(x => `-framerate 30 -loop 1 -t ${x.dur.toFixed(2)} -i "${x.file}"`).join(' ');
  const aInputs = audioDelays.map(x => `-i "${x.file}"`).join(' ');
  const musicPath = path.join(ROOT, 'static/music/bansuri-yaman.mp3');

  let curLabel = '0:v', off = 0;
  for (let idx = 0; idx < inputs.length - 1; idx++) {
    const isSlideSwitch = (idx % 4 === 3);
    const trans = isSlideSwitch ? 'slideleft' : 'fade';
    const dur = isSlideSwitch ? 0.45 : 0.30;
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
