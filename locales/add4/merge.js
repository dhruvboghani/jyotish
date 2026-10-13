// Merge locales/add/<lang>.js into locales/<lang>.json (deep; arrays replaced). Usage: node locales/add/merge.js en hi ...
const fs = require('fs'), path = require('path');
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const merge = (a, b) => { const o = { ...a }; for (const k of Object.keys(b)) o[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; return o; };
for (const l of process.argv.slice(2)) {
  const f = path.join(__dirname, '..', l + '.json');
  const out = merge(JSON.parse(fs.readFileSync(f, 'utf8')), require('./' + l + '.js'));
  fs.writeFileSync(f, JSON.stringify(out, null, 1) + '\n');
  console.log('merged', l);
}
