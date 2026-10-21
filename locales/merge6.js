// Deep-merges locales/add6/<lang>.js into locales/<lang>.json (arrays replaced). Run: node locales/merge6.js
const fs = require('fs'), path = require('path');
const merge = (a, b) => { for (const [k, v] of Object.entries(b)) a[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? merge(a[k], v) : v; return a; };
for (const l of ['en', 'hi', 'gu', 'ta', 'te', 'kn']) {
  const f = path.join(__dirname, l + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  merge(j, require('./add6/' + l + '.js'));
  fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n');
}
