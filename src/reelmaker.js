/* Daily reel maker for the admin panel. Takes the server's 9:16 cards for one date (one per language, plus the outro)
   and turns them into an MP4 reel in the browser: gentle zoom on each card, a swipe to the next language, story-style
   progress bars at the top. Uses WebCodecs (VideoEncoder) and mp4-muxer (assets/mp4-muxer.js), so nothing is stored
   on the server and any date works. window.GVReel.make({ slides, onProgress }) → Promise<Blob video/mp4> */
(function () {
  const W = 1080, H = 1920, FPS = 30, SEG = 3.8, SWIPE = 0.45, OUTRO = 3.2;
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const load = src => new Promise((ok, no) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => no(new Error('Could not load ' + src)); im.src = src; });
  const supported = () => typeof VideoEncoder === 'function' && typeof VideoFrame === 'function' && !!window.Mp4Muxer;

  async function codec() {
    for (const c of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640032']) {
      const cfg = { codec: c, width: W, height: H, bitrate: 7_000_000, framerate: FPS, avc: { format: 'avc' } };
      try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, mux: 'avc' }; } catch (e) { }
    }
    if (window.GVReel && window.GVReel.testVp9) return { cfg: { codec: 'vp09.00.40.08', width: W, height: H, bitrate: 7_000_000, framerate: FPS }, mux: 'vp9' }; // test browsers without H.264 only
    return null;
  }

  // Draw one card with a slow zoom-out (1.035 → 1.0) over its time on screen
  function card(x, im, local, dx, alpha, dur = SEG, dy = 0) {
    const s = 1.035 - 0.035 * ease(Math.min(1, Math.max(0, local / (dur + SWIPE))));
    x.save(); x.globalAlpha = alpha; x.translate(W / 2 + dx, H / 2 + dy); x.scale(s, s); x.drawImage(im, -W / 2, -H / 2, W, H); x.restore();
  }
  function bars(x, n, idx, p) {
    const m = 36, g = 8, w = (W - m * 2 - g * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const bx = m + i * (w + g);
      x.fillStyle = 'rgba(255,255,255,.28)'; x.fillRect(bx, 22, w, 6);
      const f = i < idx ? 1 : i === idx ? p : 0;
      if (f > 0) { x.fillStyle = 'rgba(255,255,255,.95)'; x.fillRect(bx, 22, w * f, 6); }
    }
  }
  // Timeline: each slide has its own time on screen; `per` slides make one language (one progress bar).
  // Inside a language the next card slides up; to the next language it swipes left; the last fades into the outro.
  function timeline(n, per, durs) {
    const starts = []; let t = 0;
    for (let i = 0; i < n; i++) { starts.push(t); t += durs[i]; }
    return { starts, body: t };
  }
  function frame(x, imgs, outro, t, per, durs, tl) {
    const n = imgs.length;
    x.fillStyle = '#16173B'; x.fillRect(0, 0, W, H);
    if (t < tl.body) {
      let i = 0; while (i < n - 1 && t >= tl.starts[i + 1]) i++;
      const D = durs[i], local = t - tl.starts[i], sw = local - (D - SWIPE);
      if (sw > 0 && i < n - 1) {
        const p = ease(sw / SWIPE), sameLang = Math.floor(i / per) === Math.floor((i + 1) / per);
        if (sameLang) { card(x, imgs[i], local, 0, 1, D, -p * H * 0.35); card(x, imgs[i + 1], sw - SWIPE, 0, p, durs[i + 1], (1 - p) * H * 0.25); }
        else { card(x, imgs[i], local, -p * W, 1, D); card(x, imgs[i + 1], sw - SWIPE, (1 - p) * W, 1, durs[i + 1]); }
      } else if (sw > 0 && i === n - 1) {
        const p = ease(sw / SWIPE);
        card(x, imgs[i], local, 0, 1, D); card(x, outro, 0, 0, p);
      } else card(x, imgs[i], local, 0, 1, D);
      const g = Math.floor(i / per), g0 = g * per, gEnd = Math.min(n, g0 + per);
      const gStart = tl.starts[g0], gDur = (gEnd < n ? tl.starts[gEnd] : tl.body) - gStart;
      bars(x, Math.ceil(n / per), g, Math.min(1, (t - gStart) / gDur));
    } else card(x, outro, t - tl.body + SWIPE, 0, 1);
  }

  // slides: flat list of card URLs; per: cards per language (1 or 2); durs: optional seconds per card
  async function make({ slides, outro, per = 1, durs, onProgress = () => { } }) {
    if (!supported()) throw new Error('unsupported');
    const cd = await codec(); if (!cd) throw new Error('unsupported');
    onProgress(0, 'load');
    const imgs = await Promise.all(slides.map(load)), out = await load(outro);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d', { alpha: false });
    const M = window.Mp4Muxer, muxer = new M.Muxer({ target: new M.ArrayBufferTarget(), video: { codec: cd.mux, width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' });
    let fail = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { fail = e; } });
    enc.configure(cd.cfg);
    const d = durs && durs.length === imgs.length ? durs : imgs.map((_, i) => per > 1 && i % per ? SEG + 1.2 : SEG), tl = timeline(imgs.length, per, d);
    const total = Math.round((tl.body + OUTRO) * FPS);
    for (let f = 0; f < total; f++) {
      if (fail) throw fail;
      frame(x, imgs, out, f / FPS, per, d, tl);
      const vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      while (enc.encodeQueueSize > 6) await sleep(2);
      if (f % 10 === 0) { onProgress(f / total, 'encode'); await sleep(0); }
    }
    await enc.flush(); enc.close();
    if (fail) throw fail;
    muxer.finalize();
    onProgress(1, 'done');
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  }
  window.GVReel = { ...(window.GVReel || {}), make, supported };
})();
