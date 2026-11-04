/* Reel maker for the admin panel ("clean modern" reels). For each card the server gives the finished image, a base image
   (the same card with its rows cleared) and the rows' rectangles (X-Bands header). Rows pop in one by one, the summary
   card slides up into the detail card, languages swipe left, then the outro. Optional music: pre-encoded AAC
   (static/music) copied into the MP4 with a fade-out made for the reel's length. WebCodecs + mp4-muxer, all in the browser; nothing is stored.
   window.GVReel.make({ cards: [{ full, base }], per, outro, music, onProgress }) → Promise<{ blob, audio, seconds }> */
(function () {
  const W = 1080, H = 1920, FPS = 30, SWIPE = 0.5, OUTRO = 3.6, ACCENT = '#E0701B';
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const outBack = x => { const c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const supported = () => typeof VideoEncoder === 'function' && typeof VideoFrame === 'function' && !!window.Mp4Muxer;

  // Cards are fetched up front (with retries) but only decoded to bitmaps when needed, so phones don't run out of memory
  async function fetchCard(url) {
    let last;
    for (let k = 0; k < 4; k++) {
      try {
        const r = await fetch(url);
        if (r.ok) { let bands = []; try { bands = JSON.parse(r.headers.get('X-Bands') || '[]'); } catch (e) { } return { blob: await r.blob(), bands }; }
        last = new Error('card ' + r.status);
      } catch (e) { last = e; }
      await sleep(600 * (k + 1));
    }
    throw new Error('Could not load a card (' + (last && last.message) + ')');
  }
  async function loadCard(c) { const [full, base] = await Promise.all([fetchCard(c.full), fetchCard(c.base)]); return { fullBlob: full.blob, baseBlob: base.blob, bands: full.bands, full: null, base: null }; }
  async function inBatches(list, size, fn) { const out = []; for (let i = 0; i < list.length; i += size) out.push(...await Promise.all(list.slice(i, i + size).map(fn))); return out; }
  async function decode(c) { if (!c.full) { c.full = await createImageBitmap(c.fullBlob); c.base = await createImageBitmap(c.baseBlob); } }
  function release(c) { if (c && c.full) { try { c.full.close(); c.base.close(); } catch (e) { } c.full = c.base = null; } }

  async function videoCodec() {
    for (const c of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640032']) {
      const cfg = { codec: c, width: W, height: H, bitrate: 6_000_000, framerate: FPS, avc: { format: 'avc' } };
      try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, mux: 'avc' }; } catch (e) { }
    }
    if (window.GVReel && window.GVReel.testVp9) return { cfg: { codec: 'vp09.00.40.08', width: W, height: H, bitrate: 6_000_000, framerate: FPS }, mux: 'vp9' }; // test browsers only
    return null;
  }
  // Music: pre-encoded AAC-LC (static/music, made by scripts/make-music.py) copied frame by frame into the MP4, so no audio
  // encoder is needed in the browser (iOS Safari's produced silent tracks). Body frames up to the splice, then the fade-out
  // tail made for this exact reel length (even seconds 16–150), cut from the same audio on the same 1024-sample grid.
  const SR = 44100, AF = 1024, LEAD = 2, FADE = 2.2, TMIN = 16, TMAX = 150;
  function adts(buf) {
    const b = new Uint8Array(buf), out = []; let i = 0;
    while (i + 7 <= b.length) {
      if (b[i] !== 0xFF || (b[i + 1] & 0xF6) !== 0xF0) throw new Error('bad AAC data');
      const len = ((b[i + 3] & 3) << 11) | (b[i + 4] << 3) | (b[i + 5] >> 5), hdr = (b[i + 1] & 1) ? 7 : 9;
      if (len < hdr || i + len > b.length) break;
      out.push(b.subarray(i + hdr, i + len)); i += len;
    }
    return out;
  }
  async function getBuf(url) { let last; for (let k = 0; k < 3; k++) { try { const r = await fetch(url); if (r.ok) return await r.arrayBuffer(); last = new Error('music ' + r.status); } catch (e) { last = e; } await sleep(500 * (k + 1)); } throw last; }
  async function musicFrames(base, T) {
    const tt = Math.min(TMAX, Math.max(TMIN, T)), m = Math.floor(Math.floor((tt - FADE - 0.2) * SR) / AF) - LEAD;
    const [body, tail] = await Promise.all([getBuf(base + '.aac'), getBuf(base + '/t' + String(tt).padStart(3, '0') + '.aac')]);
    const bf = adts(body), tf = adts(tail);
    if (bf.length < m + LEAD || tf.length <= LEAD) throw new Error('short music');
    return bf.slice(0, m + LEAD).concat(tf.slice(LEAD));
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
    let got = 0; const nCards = cards.length + 1;
    const loaded = await inBatches(cards, 4, async c => { const r = await loadCard(c); onProgress(++got / nCards * 0.2, 'load'); return r; }), out = await loadCard(outro);
    await decode(out);
    const plans = loaded.map((c, i) => plan(c, per > 1 && i % per === per - 1)), oPlan = plan(out, false);
    const starts = []; let tt = 0; plans.forEach(p => { starts.push(tt); tt += p.dur; });
    const body = tt, n = loaded.length, groups = Math.ceil(n / per);
    const total = Math.max(TMIN, Math.ceil((body + Math.max(OUTRO, oPlan.dur - 1)) / 2) * 2); // even seconds, to match a music tail

    const M = window.Mp4Muxer;
    let fail = null, frames = null;
    if (music) { try { onProgress(0.2, 'music'); frames = await musicFrames(String(music).replace(/\.(mp3|aac)$/, ''), total); } catch (e) { frames = null; } }
    const muxer = new M.Muxer({ target: new M.ArrayBufferTarget(), video: { codec: vc.mux, width: W, height: H, frameRate: FPS }, ...(frames ? { audio: { codec: 'aac', numberOfChannels: 2, sampleRate: SR } } : {}), fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
    if (frames) { const d = AF * 1e6 / SR, last = Math.floor(total * SR / AF); frames.slice(0, last).forEach((f, k) => muxer.addAudioChunkRaw(new Uint8Array(f), 'key', Math.round(k * d), Math.round(d))); }
    const audioOk = !!frames;

    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d', { alpha: false });
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { fail = e; } });
    enc.configure(vc.cfg);
    const nFrames = Math.round(total * FPS); let cur = -1;
    for (let f = 0; f < nFrames; f++) {
      if (fail) throw fail;
      const t = f / FPS;
      if (t < body) { let j = 0; while (j < n - 1 && t >= starts[j + 1]) j++; if (j !== cur) { cur = j; await decode(loaded[j]); if (j + 1 < n) await decode(loaded[j + 1]); for (let q = 0; q < j - 1; q++) release(loaded[q]); } }
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
      if (f % 10 === 0) { onProgress(0.25 + 0.75 * f / nFrames, 'encode'); await sleep(0); }
    }
    await enc.flush(); enc.close();
    if (fail) throw fail;
    loaded.forEach(release); release(out);
    muxer.finalize();
    onProgress(1, 'done');
    return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), audio: audioOk ? 'aac' : (music ? 'none' : 'off'), seconds: +total.toFixed(1) };
  }
  window.GVReel = { ...(window.GVReel || {}), make, supported };
})();
