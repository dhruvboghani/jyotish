// Deep-merges locales/<dir>/<lang>.js into locales/<lang>.json (arrays replaced). Run: node locales/merge6.js add7
const fs = require('fs'), path = require('path');
const merge = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? merge(a[k], v) : v; return a; };
for (const l of ['en', 'hi', 'gu', 'ta', 'te', 'kn']) {
  const f = path.join(__dirname, l + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const src = path.join(__dirname, process.argv[2] || 'add6', l + '.js');
  if (!fs.existsSync(src)) { console.log('skip', l, '(no file)'); continue; } // languages not translated yet fall back to English at build time
  merge(j, require(src));
  fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n');
}
