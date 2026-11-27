/* After a production build on Vercel: tell Bing/Yandex/Seznam (IndexNow) which pages changed today.
   Uses small chunks (and caps per-deploy volume) to avoid triggering Bing's batch-mode warning.
   Never fails the build. Google does not use IndexNow; it reads the sitemap. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CHUNK_SIZE = 25;
const MAX_PER_DEPLOY = 250;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (process.env.VERCEL_ENV !== 'production') return;
  const keyFile = fs.readdirSync(path.join(ROOT, 'static')).find(f => /^[0-9a-f]{32}\.txt$/.test(f));
  if (!keyFile) return;
  const key = keyFile.slice(0, 32);
  const site = (process.env.SITE_URL || 'https://grahavani.dhruvboghani.com').replace(/\/$/, '');
  const host = new URL(site).host;
  let urls = [];
  try { urls = fs.readFileSync(path.join(ROOT, '.indexnow-urls'), 'utf8').split('\n').filter(Boolean); } catch (e) { }
  if (!urls.length) { console.log('IndexNow: no changed URLs to submit'); return; }
  const toSend = urls.slice(0, MAX_PER_DEPLOY);
  if (urls.length > MAX_PER_DEPLOY) {
    console.log(`IndexNow: capping ${urls.length} changed URLs to ${MAX_PER_DEPLOY} (sitemap covers the rest)`);
  }
  for (let i = 0; i < toSend.length; i += CHUNK_SIZE) {
    const batch = toSend.slice(i, i + CHUNK_SIZE);
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 10000);
      const r = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList: batch })
      });
      clearTimeout(t);
      console.log(`IndexNow: ${batch.length} URLs → ${r.status}`);
    } catch (e) {
      console.log('IndexNow skipped:', e.message);
    }
    if (i + CHUNK_SIZE < toSend.length) await sleep(100);
  }
})();
