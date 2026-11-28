// Hastakshar Shastra: Vedic Lucky Signature & Handwriting Analyzer
(function () {
  'use strict';

  const canvas = document.getElementById('sig-pad');
  const btnClear = document.getElementById('btn-clear-sig');
  const btnAnalyze = document.getElementById('btn-analyze-sig');
  const tabDraw = document.getElementById('tab-draw');
  const tabUpload = document.getElementById('tab-upload');
  const canvasContainer = document.getElementById('canvas-container');
  const uploadContainer = document.getElementById('upload-container');
  const fileInput = document.getElementById('sig-file-input');
  const uploadPreview = document.getElementById('sig-upload-preview');
  const analyzing = document.getElementById('sig-analyzing');
  const resultsSec = document.getElementById('sig-results');

  // Results elements
  const resScore = document.getElementById('res-sig-score');
  const resVerdict = document.getElementById('res-sig-verdict');
  const resHeading = document.getElementById('res-sig-heading');
  const resDesc = document.getElementById('res-sig-desc');
  const resSlantVal = document.getElementById('res-slant-val');
  const resSlantDesc = document.getElementById('res-slant-desc');
  const resFlowVal = document.getElementById('res-flow-val');
  const resInitialVal = document.getElementById('res-initial-val');
  const resUnderlineVal = document.getElementById('res-underline-val');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let isDrawing = false;
  let hasStrokes = false;
  let lastX = 0, lastY = 0;
  let strokePoints = [];

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1e3a8a'; // Auspicious Vedic Indigo Ink
  }

  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 50);

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function startDraw(e) {
    e.preventDefault();
    isDrawing = true;
    hasStrokes = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
    strokePoints.push(pos);
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastX = pos.x;
    lastY = pos.y;
    strokePoints.push(pos);
  }

  function stopDraw(e) {
    if (!isDrawing) return;
    isDrawing = false;
  }

  // Mouse & Touch events
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', stopDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  window.addEventListener('touchend', stopDraw);

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasStrokes = false;
      strokePoints = [];
      if (resultsSec) resultsSec.style.display = 'none';
      if (uploadPreview) uploadPreview.style.display = 'none';
    });
  }

  // Tabs
  if (tabDraw) {
    tabDraw.addEventListener('click', () => {
      tabDraw.classList.add('active');
      if (tabUpload) tabUpload.classList.remove('active');
      if (canvasContainer) canvasContainer.style.display = 'block';
      if (uploadContainer) uploadContainer.style.display = 'none';
    });
  }

  if (tabUpload) {
    tabUpload.addEventListener('click', () => {
      tabUpload.classList.add('active');
      if (tabDraw) tabDraw.classList.remove('active');
      if (canvasContainer) canvasContainer.style.display = 'none';
      if (uploadContainer) uploadContainer.style.display = 'block';
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (uploadPreview) {
          uploadPreview.src = ev.target.result;
          uploadPreview.style.display = 'block';
          hasStrokes = true;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  const I18N_SIG = (window.I18N && window.I18N.signature) || {};

  // Analyze Signature
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', () => {
      if (!hasStrokes && strokePoints.length < 5) {
        alert(I18N_SIG.drawAlert || 'Please draw your signature on the canvas first.');
        return;
      }

      if (analyzing) analyzing.style.display = 'flex';
      if (resultsSec) resultsSec.style.display = 'none';

      setTimeout(() => {
        if (analyzing) analyzing.style.display = 'none';
        if (resultsSec) resultsSec.style.display = 'block';

        calculateSignatureMetrics();
      }, 700);
    });
  }

  function calculateSignatureMetrics() {
    let slantDeg = 18;
    let score = 88;

    if (strokePoints.length > 10) {
      const firstChunk = strokePoints.slice(0, Math.floor(strokePoints.length * 0.25));
      const lastChunk = strokePoints.slice(Math.floor(strokePoints.length * 0.75));

      const avgFirstY = firstChunk.reduce((a, b) => a + b.y, 0) / firstChunk.length;
      const avgLastY = lastChunk.reduce((a, b) => a + b.y, 0) / lastChunk.length;
      const avgFirstX = firstChunk.reduce((a, b) => a + b.x, 0) / firstChunk.length;
      const avgLastX = lastChunk.reduce((a, b) => a + b.x, 0) / lastChunk.length;

      const deltaY = avgFirstY - avgLastY; // Positive if moving upwards
      const deltaX = Math.max(1, avgLastX - avgFirstX);
      const rad = Math.atan2(deltaY, deltaX);
      slantDeg = Math.round(rad * (180 / Math.PI));
    }

    // Evaluate Slant
    let verdict = I18N_SIG.verdictGood || 'Auspicious & Ambitious';
    let slantDescText = '';
    if (slantDeg > 12 && slantDeg < 38) {
      score = 92;
      verdict = I18N_SIG.verdictHigh || 'Highly Auspicious (Urdhva Gati)';
      slantDescText = (I18N_SIG.slantHigh || '+{d}° upward incline. Represents optimistic ambition and continuous career ascension under Jupiter and Sun.').replace('{d}', slantDeg);
    } else if (slantDeg >= 0 && slantDeg <= 12) {
      score = 82;
      verdict = I18N_SIG.verdictBal || 'Balanced & Steady (Sthira Gati)';
      slantDescText = (I18N_SIG.slantBal || '+{d}° balanced horizontal baseline. Reflects pragmatic realism, patience, and financial reliability under Saturn.').replace('{d}', slantDeg);
    } else if (slantDeg < 0) {
      score = 71;
      verdict = I18N_SIG.verdictLow || 'Caution (Adho Gati)';
      slantDescText = (I18N_SIG.slantLow || '{d}° downward slope. Suggests fatigue or self-doubt at project completions. Remedy: Practice writing with an upward tilt of +20°.').replace('{d}', slantDeg);
    } else {
      score = 80;
      verdict = I18N_SIG.verdictSteep || 'Hyper-Ambitious';
      slantDescText = (I18N_SIG.slantSteep || '+{d}° steep upward slope. Bold visions with advice to stay grounded in execution.').replace('{d}', slantDeg);
    }

    if (resScore) resScore.textContent = score;
    if (resVerdict) resVerdict.textContent = verdict;
    if (resSlantVal) resSlantVal.textContent = (slantDeg >= 0 ? '+' : '') + slantDeg + '° ' + (I18N_SIG.slantLabel || 'Baseline Slant');
    if (resSlantDesc) resSlantDesc.textContent = slantDescText;

    if (resFlowVal) resFlowVal.textContent = strokePoints.length > 50 ? (I18N_SIG.flowFluid || 'Fluid Cursive (Mercury Dominant)') : (I18N_SIG.flowFirm || 'Structured Firm (Sun Dominant)');
    if (resInitialVal) resInitialVal.textContent = I18N_SIG.initialClear || 'Clear & Prominent (Surya Blessing)';
    if (resUnderlineVal) resUnderlineVal.textContent = I18N_SIG.underlineBal || 'Harmonious Balance (Shani Support)';

    persistReading({ strokeCount: strokePoints.length, slantDeg, score, verdict });

    resultsSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function persistReading(data) {
    try {
      let token = null;
      if (window.KG && window.KG.sb && window.KG.sb.auth) {
        const s = (await window.KG.sb.auth.getSession()).data.session;
        if (s && s.access_token) token = s.access_token;
      }
      fetch('/api/divination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({
          kind: 'signature',
          input: { strokes: data.strokeCount, slantDeg: data.slantDeg },
          result: { score: data.score, verdict: data.verdict }
        })
      }).catch(() => {});
    } catch (e) {}
  }

})();
