/* After a production build on Vercel: tell Bing/Yandex/Seznam (IndexNow) which pages changed today.
   Never fails the build. Google does not use IndexNow; it reads the sitemap. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
(async () => {
  if (process.env.VERCEL_ENV !== 'production' || !process.env.SITE_URL) return;
  const keyFile = fs.readdirSync(path.join(ROOT, 'static')).find(f => /^[0-9a-f]{32}\.txt$/.test(f)); if (!keyFile) return;
  const key = keyFile.slice(0, 32), site = process.env.SITE_URL.replace(/\/$/, ''), host = new URL(site).host;
  let urls = []; try { urls = fs.readFileSync(path.join(ROOT, '.indexnow-urls'), 'utf8').split('\n').filter(Boolean); } catch (e) { }
  urls.push(site + '/sitemap.xml');
  for (let i = 0; i < urls.length; i += 10000) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList: urls.slice(i, i + 10000) }) });
      clearTimeout(t); console.log(`IndexNow: ${urls.slice(i, i + 10000).length} URLs → ${r.status}`);
    } catch (e) { console.log('IndexNow skipped:', e.message); }
  }
})();
