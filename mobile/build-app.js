/* Builds the web content for the Android app into mobile/www (Capacitor's webDir).
   1. Runs the site build (../build.js) so the app has every page and feature of the website.
   2. Copies it, then makes it app-friendly:
      - the 61 KB translation block inlined in every page moves to one shared file per language (smaller app);
      - links ending in "/" point at ".../index.html" (Capacitor's local server needs a file name);
      - Supabase is bundled locally, analytics removed, app layer (app-bridge.js) and offline engine (offline.js) added;
      - config.js points API calls at the live server.
   Env (all optional): GV_API_BASE, GV_SUPABASE_URL, GV_SUPABASE_KEY. Only public values belong here. */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..'), PUB = path.join(ROOT, 'public'), WWW = path.join(__dirname, 'www');
const API_BASE = (process.env.GV_API_BASE || 'https://jyotish-mu.vercel.app').replace(/\/$/, '');
const SUPABASE_URL = process.env.GV_SUPABASE_URL || 'https://tudpjxabxxaubvthktqg.supabase.co';
const SUPABASE_KEY = process.env.GV_SUPABASE_KEY || 'sb_publishable_Yii9G0nKGF5nr0rVHRougQ_NXOn1Spv'; // publishable (browser) key
if (/^sb_secret_|service_role/.test(SUPABASE_KEY)) throw new Error('Never put a secret key in the app.');

console.log('1/5 Building the site…');
execFileSync(process.execPath, [path.join(ROOT, 'build.js')], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, SITE_URL: API_BASE, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY: SUPABASE_KEY } });

console.log('2/5 Copying into mobile/www…');
fs.rmSync(WWW, { recursive: true, force: true });
const SKIP = new Set(['sw.js', 'robots.txt', 'sitemap.xml']);
fs.cpSync(PUB, WWW, { recursive: true, filter: src => !SKIP.has(path.basename(src)) || path.dirname(src) !== PUB });
fs.mkdirSync(path.join(WWW, 'vendor'), { recursive: true });
fs.mkdirSync(path.join(WWW, 'assets', 'i18n'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'), path.join(WWW, 'vendor/supabase.js'));
fs.copyFileSync(path.join(__dirname, 'src/app-bridge.js'), path.join(WWW, 'app-bridge.js'));
fs.copyFileSync(path.join(__dirname, 'src/app.css'), path.join(WWW, 'assets', 'app.css'));
fs.writeFileSync(path.join(WWW, 'config.js'), `window.KG_CONFIG=${JSON.stringify({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_KEY, vapidPublicKey: '', apiBase: API_BASE, app: true })};\n`);

console.log('3/5 Rewriting pages…');
const PRELOADER = fs.readFileSync(path.join(__dirname, 'src/preloader.html'), 'utf8').trim(); // launch screen, shown once per app session
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const i18nFiles = new Map();
let pages = 0, before = 0, after = 0;
for (const file of walk(WWW).filter(f => f.endsWith('.html'))) {
  let html = fs.readFileSync(file, 'utf8'); before += html.length;
  html = html.replace(/<script>window\.I18N=([\s\S]*?);<\/script>/, (m, json) => {
    const h = crypto.createHash('sha1').update(json).digest('hex').slice(0, 10);
    if (!i18nFiles.has(h)) { i18nFiles.set(h, true); fs.writeFileSync(path.join(WWW, 'assets/i18n', h + '.js'), `window.I18N=${json};\n`); }
    return `<script src="/assets/i18n/${h}.js"></script>`;
  });
  html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^"]+"><\/script>/, '<script src="/app-bridge.js"></script>\n<script src="/vendor/supabase.js"></script>');
  // The icon sprite is identical on every page: write it once and document.write() it from a local script
  html = html.replace(/<svg width="0" height="0" style="position:absolute" aria-hidden="true">[\s\S]*?<\/svg>/, m => {
    const h = crypto.createHash('sha1').update(m).digest('hex').slice(0, 10);
    if (!i18nFiles.has('s' + h)) { i18nFiles.set('s' + h, true); fs.writeFileSync(path.join(WWW, 'assets', 'sprite-' + h + '.js'), `document.write(${JSON.stringify(m)});\n`); }
    return `<script src="/assets/sprite-${h}.js"></script>\n${PRELOADER}`;
  });
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, ''); // search-engine data, not needed in the app
  html = html.replace(/<script defer src="\/_vercel\/insights\/script\.js"><\/script>\s*/g, '');
  html = html.replace(/(<script src="\/config\.js[^"]*"><\/script>)/, '$1\n<script src="/offline.js" defer></script>');
  html = html.replace(/<link rel="manifest"[^>]*>\s*/, '');
  html = html.replace(/(<link rel="stylesheet" href="\/assets\/styles\.css[^"]*">)/, '$1\n<link rel="stylesheet" href="/assets/app.css">'); // Design C app look
  // Local links: "/x/y/" → "/x/y/index.html" (keeps ?query and #hash)
  html = html.replace(/(href|data-href)="(\/[^"?#]*\/)([?#][^"]*)?"/g, (m, a, p, rest) => `${a}="${p}index.html${rest || ''}"`);
  if (!html.includes('/app-bridge.js')) throw new Error('Supabase script tag not found in ' + path.relative(WWW, file) + ' — update build-app.js');
  fs.writeFileSync(file, html); after += html.length; pages++;
}
console.log(`   ${pages} pages, ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB, ${[...i18nFiles.keys()].filter(k => k[0] !== 's').length} translation files`);

console.log('4/5 Bundling the offline engine…');
const shim = { name: 'offline-shim', setup(b) { b.onResolve({ filter: /(^|\/)server\.js$/ }, args => /lib(\/|\\)routes$/.test(args.resolveDir) ? { path: path.join(__dirname, 'src/offline-server-shim.js') } : undefined); } };
esbuild.build({ entryPoints: [path.join(__dirname, 'src/offline.js')], bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'chrome90', outfile: path.join(WWW, 'offline.js'), plugins: [shim], logLevel: 'warning' })
  .then(() => {
    const kb = fs.statSync(path.join(WWW, 'offline.js')).size / 1024;
    const src = fs.readFileSync(path.join(WWW, 'offline.js'), 'utf8');
    if (/supabase|createClient/.test(src)) throw new Error('offline.js pulled in Supabase — the server.js shim did not apply');
    console.log(`   offline.js ${kb.toFixed(0)} KB`);
    console.log('5/5 Done → mobile/www. Next: npx cap sync android');
  })
  .catch(e => { console.error(e); process.exit(1); });
