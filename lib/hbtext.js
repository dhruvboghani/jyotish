/* Text as SVG paths, shaped with HarfBuzz (WebAssembly), so Indian scripts (matras, conjuncts) come out right in
   server-made images. resvg's own text shaping drops some vowel signs, so images never rely on SVG <text>.
   Fonts live in lib/fonts. Each character picks the font for its script; spaces, digits and punctuation stay with the run. */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, 'fonts');
const FILES = {
  latin: { 400: 'Hind-Regular.ttf', 600: 'Hind-SemiBold.ttf', 700: 'Hind-Bold.ttf' },
  deva: { 400: 'Hind-Regular.ttf', 600: 'Hind-SemiBold.ttf', 700: 'Hind-Bold.ttf' },
  gujr: { 400: 'HindVadodara-Regular.ttf', 600: 'HindVadodara-Bold.ttf', 700: 'HindVadodara-Bold.ttf' },
  taml: { 400: 'HindMadurai-Regular.ttf', 600: 'HindMadurai-Bold.ttf', 700: 'HindMadurai-Bold.ttf' },
  telu: { 400: 'HindGuntur-Regular.ttf', 600: 'HindGuntur-Bold.ttf', 700: 'HindGuntur-Bold.ttf' },
  knda: { 400: 'NotoSansKannada.ttf', 600: 'NotoSansKannada.ttf', 700: 'NotoSansKannada.ttf' },
  display: { 400: 'Marcellus-Regular.ttf', 600: 'Marcellus-Regular.ttf', 700: 'Marcellus-Regular.ttf' }
};
let hb = null;
async function ready() { if (!hb) hb = await import('harfbuzzjs'); return hb; }

const fonts = {};
function font(script, weight) {
  const w = weight >= 650 ? 700 : weight >= 550 ? 600 : 400, file = FILES[script][w], key = file + '|' + w;
  if (fonts[key]) return fonts[key];
  const face = new hb.Face(new hb.Blob(fs.readFileSync(path.join(DIR, file))));
  const f = new hb.Font(face);
  if (script === 'knda') try { f.setVariations([new hb.Variation('wght', w)]); } catch (e) { try { f.setVariations({ wght: w }); } catch (e2) { } }
  return (fonts[key] = { f, upem: face.upem, paths: new Map() });
}
const scriptOf = cp => cp >= 0x0900 && cp <= 0x097F ? 'deva' : cp >= 0x0A80 && cp <= 0x0AFF ? 'gujr' : cp >= 0x0B80 && cp <= 0x0BFF ? 'taml'
  : cp >= 0x0C00 && cp <= 0x0C7F ? 'telu' : cp >= 0x0C80 && cp <= 0x0CFF ? 'knda' : /[\p{L}]/u.test(String.fromCodePoint(cp)) ? 'latin' : null;

// Split into runs that share a script (neutral characters join the run they sit in)
function runs(text, display) {
  const out = []; let cur = null;
  for (const ch of String(text)) {
    let s = scriptOf(ch.codePointAt(0));
    if (s === 'latin' && display) s = 'display';
    if (!s) { if (cur) { cur.text += ch; continue; } s = display ? 'display' : 'latin'; }
    if (cur && cur.script === s) cur.text += ch; else { cur = { script: s, text: ch }; out.push(cur); }
  }
  // A non-Latin run in display style uses the body font of that script, and neutral leading text sticks to it
  return out;
}
function shapeRun(fo, text) {
  const buf = new hb.Buffer(); buf.addText(text); buf.guessSegmentProperties(); hb.shape(fo.f, buf);
  const infos = buf.getGlyphInfos(), pos = buf.getGlyphPositions(); buf.destroy && buf.destroy();
  return infos.map((g, i) => ({ gid: g.codepoint, ...pos[i] }));
}
/* Lay out one line. opts: { size, weight=400, display=false (Marcellus for Latin), letter=0 (extra px between glyphs) }
   Returns { width, svg(x, y, { align='left'|'center'|'right', fill }) } with y on the baseline. */
function line(text, opts = {}) {
  if (!hb) throw new Error('hbtext: call await ready() first');
  const size = opts.size || 32, weight = opts.weight || 400, glyphs = [];
  let x = 0;
  for (const r of runs(text, opts.display)) {
    const fo = font(r.script, weight), sc = size / fo.upem;
    for (const g of shapeRun(fo, r.text)) {
      let d = fo.paths.get(g.gid); if (d === undefined) { d = fo.f.glyphToPath(g.gid) || ''; fo.paths.set(g.gid, d); }
      if (d) glyphs.push({ d, x: x + g.xOffset * sc, y: -g.yOffset * sc, sc });
      x += g.xAdvance * sc + (opts.letter || 0);
    }
  }
  const width = Math.max(0, x - (opts.letter || 0));
  return {
    width,
    svg(X, Y, o = {}) {
      const x0 = o.align === 'center' ? X - width / 2 : o.align === 'right' ? X - width : X;
      return `<g fill="${o.fill || '#000'}"${o.opacity != null ? ` fill-opacity="${o.opacity}"` : ''}>${glyphs.map(g => `<path transform="translate(${(x0 + g.x).toFixed(2)} ${(Y + g.y).toFixed(2)}) scale(${g.sc.toFixed(5)} ${(-g.sc).toFixed(5)})" d="${g.d}"/>`).join('')}</g>`;
    }
  };
}
// Shorten with … until it fits maxW
function fit(text, maxW, opts) {
  let s = String(text || ''), l = line(s, opts);
  if (l.width <= maxW) return l;
  while (s.length > 1) { s = s.slice(0, -1); l = line(s.trim() + '…', opts); if (l.width <= maxW) return l; }
  return l;
}
// Word wrap into lines no wider than maxW
function wrap(text, maxW, opts, maxLines = 99) {
  const words = String(text || '').split(/\s+/).filter(Boolean), out = []; let cur = '';
  for (const w of words) { const s = cur ? cur + ' ' + w : w; if (line(s, opts).width > maxW && cur) { out.push(cur); cur = w; } else cur = s; }
  if (cur) out.push(cur);
  if (out.length > maxLines) { const keep = out.slice(0, maxLines); keep[maxLines - 1] = keep[maxLines - 1] + ' …'; return keep.map(s => fit(s, maxW, opts)); }
  return out.map(s => line(s, opts));
}
module.exports = { ready, line, fit, wrap };
