/* Reel maker for the admin panel ("clean modern" reels). For each card the server gives the finished image, a base image
   (the same card with its rows cleared) and the rows' rectangles (X-Bands header). Rows pop in one by one, the summary
   card slides up into the detail card, languages swipe left, then the outro. Optional music (static/music/*.mp3) is
   mixed in and encoded as AAC (Opus as a fallback). WebCodecs + mp4-muxer, all in the browser; nothing is stored.
   window.GVReel.make({ cards: [{ full, base }], per, outro, music, onProgress }) → Promise<{ blob, audio, seconds }> */
(function () {
  const W = 1080, H = 1920, FPS = 30, SWIPE = 0.5, OUTRO = 3.6, ACCENT = '#E0701B';
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const outBack = x => { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const supported = () => typeof VideoEncoder === 'function' && typeof VideoFrame === 'function' && !!window.Mp4Muxer;

  async function fetchCard(url) {
    const r = await fetch(url); if (!r.ok) throw new Error('Could not load ' + url);
    let bands = []; try { bands = JSON.parse(r.headers.get('X-Bands') || '[]'); } catch (e) { }
    return { img: await createImageBitmap(await r.blob()), bands };
  }
  async function loadCard(c) { const [full, base] = await Promise.all([fetchCard(c.full), fetchCard(c.base)]); return { full: full.img, base: base.img, bands: full.bands }; }

  async function videoCodec() {
    for (const c of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640032']) {
      const cfg = { codec: c, width: W, height: H, bitrate: 6_000_000, framerate: FPS, avc: { format: 'avc' } };
      try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, mux: 'avc' }; } catch (e) { }
    }
    if (window.GVReel && window.GVReel.testVp9) return { cfg: { codec: 'vp09.00.40.08', width: W, height: H, bitrate: 6_000_000, framerate: FPS }, mux: 'vp9' }; // test browsers only
    return null;
  }
  async function audioCodec() {
    if (typeof AudioEncoder !== 'function') return null;
    for (const [codec, mux, sampleRate] of [['mp4a.40.2', 'aac', 44100], ['mp4a.40.2', 'aac', 48000], ['opus', 'opus', 48000]]) {
      const cfg = { codec, sampleRate, numberOfChannels: 2, bitrate: 128000 };
      try { if ((await AudioEncoder.isConfigSupported(cfg)).supported) return { cfg, mux, sampleRate }; } catch (e) { }
    }
    return null;
  }
  // Decode the track, fit it to the reel (looping if short), fade in and out, at the encoder's sample rate
  async function prepareMusic(url, seconds, sampleRate) {
    const data = await (await fetch(url)).arrayBuffer();
    const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
    const buf = await ctx.decodeAudioData(data);
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.9, 0.8);
    g.gain.setValueAtTime(0.9, Math.max(0.9, seconds - 2.2)); g.gain.linearRampToValueAtTime(0, seconds);
    src.connect(g).connect(ctx.destination); src.start(0);
    return ctx.startRendering();
  }

  // When each band starts to appear, and how long the card stays on screen
  function plan(card, isDetail) {
    const n = card.bands.length, stag = n > 1 ? Math.min(0.12, 1.5 / (n - 1)) : 0;
    const starts = card.bands.map((_, i) => 0.25 + i * stag), shown = starts.length ? starts[starts.length - 1] + 0.45 : 0.3;
    return { starts, dur: shown + (isDetail ? 3.4 : 2.6) };
  }
  // Base card, then each band of the finished card rising into place
  function drawCard(x, c, pl, local, dx = 0, dy = 0, alpha = 1) {
    x.save(); x.globalAlpha = alpha; x.translate(dx, dy);
    x.drawImage(c.base, 0, 0, W, H);
    c.bands.forEach(([bx, by, bw, bh], i) => {
      const p = Math.min(1, Math.max(0, (local - pl.starts[i]) / 0.45)); if (p <= 0) return;
      const e = outBack(p); x.save(); x.globalAlpha = alpha * Math.min(1, p * 1.6);
      x.drawImage(c.full, bx, by, bw, bh, bx, by + (1 - e) * 34, bw, bh); x.restore();
    });
    x.restore();
  }
  function bars(x, n, idx, p) {
    const m = 72, g = 10, w = (W - m * 2 - g * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const bx = m + i * (w + g), f = i < idx ? 1 : i === idx ? p : 0;
      x.fillStyle = 'rgba(23,23,43,.12)'; x.fillRect(bx, 34, w, 7);
      if (f > 0) { x.fillStyle = ACCENT; x.fillRect(bx, 34, w * f, 7); }
    }
  }

  async function make({ cards, per = 2, outro, music, onProgress = () => { } }) {
    if (!supported()) throw new Error('unsupported');
    const vc = await videoCodec(); if (!vc) throw new Error('unsupported');
    onProgress(0, 'load');
    const loaded = await Promise.all(cards.map(loadCard)), out = await loadCard(outro);
    const plans = loaded.map((c, i) => plan(c, per > 1 && i % per === per - 1)), oPlan = plan(out, false);
    const starts = []; let tt = 0; plans.forEach(p => { starts.push(tt); tt += p.dur; });
    const body = tt, total = body + Math.max(OUTRO, oPlan.dur - 1), n = loaded.length, groups = Math.ceil(n / per);

    const ac = music ? await audioCodec() : null, M = window.Mp4Muxer;
    const muxer = new M.Muxer({ target: new M.ArrayBufferTarget(), video: { codec: vc.mux, width: W, height: H, frameRate: FPS }, ...(ac ? { audio: { codec: ac.mux, numberOfChannels: 2, sampleRate: ac.sampleRate } } : {}), fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
    let fail = null, audioOk = false;

    if (ac) { // music first (fast), then the frames
      try {
        onProgress(0, 'music');
        const ab = await prepareMusic(music, total, ac.sampleRate);
        let aerr = null;
        const aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: e => { aerr = e; } });
        aenc.configure(ac.cfg);
        const L = ab.getChannelData(0), R = ab.getChannelData(1), step = 4096;
        for (let i = 0; i < ab.length; i += step) {
          const len = Math.min(step, ab.length - i), d = new Float32Array(len * 2); d.set(L.subarray(i, i + len), 0); d.set(R.subarray(i, i + len), len);
          const a = new AudioData({ format: 'f32-planar', sampleRate: ac.sampleRate, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round(i * 1e6 / ac.sampleRate), data: d });
          aenc.encode(a); a.close();
        }
        await aenc.flush(); aenc.close(); audioOk = !aerr;
      } catch (e) { audioOk = false; }
    }

    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d', { alpha: false });
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { fail = e; } });
    enc.configure(vc.cfg);
    const frames = Math.round(total * FPS);
    for (let f = 0; f < frames; f++) {
      if (fail) throw fail;
      const t = f / FPS;
      x.fillStyle = '#FBF7EF'; x.fillRect(0, 0, W, H);
      if (t < body) {
        let i = 0; while (i < n - 1 && t >= starts[i + 1]) i++;
        const local = t - starts[i], D = plans[i].dur, sw = local - (D - SWIPE);
        if (sw > 0 && i < n - 1) {
          const p = ease(sw / SWIPE), same = Math.floor(i / per) === Math.floor((i + 1) / per);
          if (same) { drawCard(x, loaded[i], plans[i], local, 0, -p * 140, 1 - p); drawCard(x, loaded[i + 1], plans[i + 1], 0, 0, (1 - p) * 140, p); }
          else { drawCard(x, loaded[i], plans[i], local, -p * W); drawCard(x, loaded[i + 1], plans[i + 1], 0, (1 - p) * W); }
        } else if (sw > 0) { const p = ease(sw / SWIPE); drawCard(x, loaded[i], plans[i], local, 0, 0, 1 - p); drawCard(x, out, oPlan, 0, 0, 0, p); }
        else drawCard(x, loaded[i], plans[i], local);
        const g = Math.floor(i / per), g0 = g * per, gEnd = Math.min(n, g0 + per), gS = starts[g0], gD = (gEnd < n ? starts[gEnd] : body) - gS;
        bars(x, groups, g, Math.min(1, (t - gS) / gD));
      } else drawCard(x, out, oPlan, t - body);
      const vf = new VideoFrame(cv, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(vf, { keyFrame: f % (FPS * 2) === 0 }); vf.close();
      while (enc.encodeQueueSize > 6) await sleep(2);
      if (f % 10 === 0) { onProgress(f / frames, 'encode'); await sleep(0); }
    }
    await enc.flush(); enc.close();
    if (fail) throw fail;
    muxer.finalize();
    onProgress(1, 'done');
    return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), audio: audioOk ? ac.mux : (music ? 'none' : 'off'), seconds: +total.toFixed(1) };
  }
  window.GVReel = { ...(window.GVReel || {}), make, supported };
})();
