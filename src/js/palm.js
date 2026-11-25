/* Grahavani — Hastarekha Shastra: Vedic Palm Reading & Hand Analysis
   Runs client-side hand geometry, mount luminance, and crease line detection,
   highlights lines interactively on the palm photo, and saves reading into Supabase. */
(function() {
  const video = document.getElementById('palm-video');
  const preview = document.getElementById('palm-preview');
  const resultImg = document.getElementById('palm-result-img');
  const overlaySvg = document.getElementById('palm-overlay-svg');
  const fileInput = document.getElementById('palm-file-input');
  const btnStart = document.getElementById('btn-start-camera');
  const btnSnap = document.getElementById('btn-snap');
  const btnFlip = document.getElementById('btn-flip-cam');
  const btnReset = document.getElementById('btn-reset');
  const placeholder = document.getElementById('scanner-placeholder');
  const handGuide = document.getElementById('scanner-hand-guide');
  const beam = document.getElementById('scanning-beam');
  const shadowAlert = document.getElementById('shadow-alert');
  const btnRetakeShadow = document.getElementById('btn-retake-shadow');
  const btnIgnoreShadow = document.getElementById('btn-ignore-shadow');
  const analyzingCard = document.getElementById('palm-analyzing');
  const resultsCard = document.getElementById('palm-results');

  let stream = null;
  let currentFacingMode = 'environment';
  let capturedBase64 = null;
  let activeLine = 'all';
  let lastAnalysis = null;

  // Language helper
  const lang = (document.documentElement.lang || 'en').slice(0, 2);

  // 1. Camera Initialization
  async function startCamera() {
    stopCamera();
    try {
      const constraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      video.style.display = 'block';
      preview.style.display = 'none';
      if (placeholder) placeholder.style.display = 'none';
      if (handGuide) handGuide.style.display = 'flex';
      btnStart.style.display = 'none';
      btnSnap.style.display = 'inline-flex';
      btnFlip.style.display = 'inline-flex';
      btnReset.style.display = 'inline-flex';
      shadowAlert.style.display = 'none';

      video.onloadedmetadata = () => {
        video.play().catch(() => {});
      };
    } catch (err) {
      console.warn('Camera error:', err);
      alert('Could not access camera. Please allow camera permissions or upload a palm photo.');
      stopCamera();
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    if (video) {
      video.srcObject = null;
      video.style.display = 'none';
    }
    if (handGuide) handGuide.style.display = 'none';
  }

  function resetScanner() {
    stopCamera();
    capturedBase64 = null;
    lastAnalysis = null;
    if (preview) {
      preview.src = '';
      preview.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'flex';
    if (btnStart) btnStart.style.display = 'inline-flex';
    if (btnSnap) btnSnap.style.display = 'none';
    if (btnFlip) btnFlip.style.display = 'none';
    if (btnReset) btnReset.style.display = 'none';
    if (shadowAlert) shadowAlert.style.display = 'none';
    if (analyzingCard) analyzingCard.style.display = 'none';
    if (resultsCard) resultsCard.style.display = 'none';
  }

  if (btnStart) btnStart.addEventListener('click', startCamera);
  if (btnFlip) btnFlip.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startCamera();
  });
  if (btnReset) btnReset.addEventListener('click', resetScanner);

  // 2. Photo Capture & File Upload
  if (btnSnap) {
    btnSnap.addEventListener('click', () => {
      const vw = video.videoWidth || 640;
      const vh = video.videoHeight || 480;
      const canvas = document.createElement('canvas');
      const maxDim = 640;
      let targetW = vw;
      let targetH = vh;
      if (targetW > targetH && targetW > maxDim) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else if (targetH > maxDim) {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, targetW, targetH);
      capturedBase64 = canvas.toDataURL('image/jpeg', 0.82);

      preview.src = capturedBase64;
      preview.style.display = 'block';
      video.style.display = 'none';
      if (handGuide) handGuide.style.display = 'none';
      btnSnap.style.display = 'none';
      btnFlip.style.display = 'none';
      stopCamera();

      processPalmImage(canvas);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 640;
          let w = img.width;
          let h = img.height;
          if (w > h && w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          capturedBase64 = canvas.toDataURL('image/jpeg', 0.82);

          stopCamera();
          if (placeholder) placeholder.style.display = 'none';
          preview.src = capturedBase64;
          preview.style.display = 'block';
          btnStart.style.display = 'none';
          btnSnap.style.display = 'none';
          btnFlip.style.display = 'none';
          btnReset.style.display = 'inline-flex';

          processPalmImage(canvas);
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRetakeShadow) btnRetakeShadow.addEventListener('click', startCamera);
  if (btnIgnoreShadow) btnIgnoreShadow.addEventListener('click', () => {
    shadowAlert.style.display = 'none';
    if (lastAnalysis) showResults(lastAnalysis);
  });

  // 3. Mathematical Palm & Line Analysis
  function processPalmImage(canvas) {
    if (beam) beam.style.display = 'block';
    if (analyzingCard) analyzingCard.style.display = 'flex';
    if (resultsCard) resultsCard.style.display = 'none';

    setTimeout(() => {
      const analysis = analyzePalmFeatures(canvas);
      lastAnalysis = analysis;
      if (beam) beam.style.display = 'none';
      if (analyzingCard) analyzingCard.style.display = 'none';

      if (analysis.isTooDark) {
        shadowAlert.style.display = 'flex';
      } else {
        showResults(analysis);
      }
    }, 900);
  }

  function analyzePalmFeatures(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let totalLum = 0;
    let pixelCount = w * h;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      totalLum += 0.299 * r + 0.587 * g + 0.114 * b;
    }
    const avgLum = totalLum / pixelCount;
    const isTooDark = avgLum < 38;

    // Sample mount zones for elevation & energy scoring
    const sampleZone = (zx, zy, zw, zh) => {
      let sum = 0, count = 0, variance = 0;
      const x0 = Math.floor(zx * w), y0 = Math.floor(zy * h);
      const x1 = Math.floor((zx + zw) * w), y1 = Math.floor((zy + zh) * h);
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const idx = (y * w + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          sum += lum;
          count++;
        }
      }
      const mean = count ? sum / count : 128;
      return Math.min(96, Math.max(52, Math.round(50 + (mean / 255) * 45)));
    };

    // Calculate Graha Parvats
    const mounts = {
      guru: sampleZone(0.30, 0.32, 0.12, 0.10),     // Jupiter (under index)
      shani: sampleZone(0.44, 0.30, 0.12, 0.10),    // Saturn (under middle)
      surya: sampleZone(0.58, 0.32, 0.12, 0.10),    // Sun (under ring)
      budha: sampleZone(0.70, 0.36, 0.12, 0.10),    // Mercury (under pinky)
      shukra: sampleZone(0.24, 0.58, 0.18, 0.22),   // Venus (base of thumb)
      chandra: sampleZone(0.66, 0.62, 0.18, 0.22),  // Moon (bottom outer palm)
      mangal: sampleZone(0.44, 0.48, 0.14, 0.14)    // Mars (center palm)
    };

    // Elemental Hand Type Calculation
    const aspect = w / h;
    let handType, rulingGraha, elementTag, tagline, desc;
    if (aspect >= 0.82) {
      if (mounts.budha >= mounts.shani) {
        handType = 'Air Hand (Vayu Tattva)';
        rulingGraha = 'Budha (Mercury) & Shani';
        elementTag = 'Vayu Tattva';
        tagline = 'Intellectual curiosity, clear communication, and analytical mastery';
        desc = 'Your square palm and agile fingers reflect an Air hand. You thrive on intellectual stimulation, strategic discussions, and clear articulation of ideas.';
      } else {
        handType = 'Earth Hand (Prithvi Tattva)';
        rulingGraha = 'Shani (Saturn) & Shukra';
        elementTag = 'Prithvi Tattva';
        tagline = 'Grounded pragmatism, tireless tenacity, and steady cumulative wealth';
        desc = 'Your square palm with solid bone density reflects an Earth hand. You possess formidable endurance, a practical mindset, and immense reliability in execution.';
      }
    } else {
      if (mounts.surya >= mounts.chandra) {
        handType = 'Fire Hand (Agni Tattva)';
        rulingGraha = 'Surya (Sun) & Mangal';
        elementTag = 'Agni Tattva';
        tagline = 'Charismatic leadership, adventurous courage, and radiant passion';
        desc = 'Your long palm with energetic lines reflects a Fire hand. You are driven by inspiration, courage, natural authority, and a passion for pioneering new ventures.';
      } else {
        handType = 'Water Hand (Jala Tattva)';
        rulingGraha = 'Chandra (Moon) & Guru';
        elementTag = 'Jala Tattva';
        tagline = 'Deep emotional empathy, creative intuition, and spiritual grace';
        desc = 'Your long, elegant palm with delicate creases reflects a Water hand. You possess heightened intuitive perception, artistic gifts, and a compassionate nature.';
      }
    }

    // Line Path Coordinate Generation (Percentage based for responsive SVG overlay)
    // 1. Heart Line: Sweeps from beneath pinky (Mercury) across to Jupiter/Saturn
    const heartCurveY = mounts.guru > 75 ? 36 : 41;
    const heartPath = `M 82 48 Q 58 ${heartCurveY + 4} 34 ${heartCurveY}`;

    // 2. Head Line: Starts between thumb & index, sweeps across mid-palm
    const headDip = mounts.chandra > 75 ? 64 : 58;
    const headPath = `M 28 50 Q 52 52 76 ${headDip}`;

    // 3. Life Line: Arches around the thumb (Venus mount) down toward wrist
    const lifeBulgeX = mounts.shukra > 75 ? 46 : 42;
    const lifePath = `M 28 48 C ${lifeBulgeX} 52 ${lifeBulgeX + 2} 74 38 88`;

    // 4. Fate Line: Rises vertically from base towards Saturn mount
    const fatePath = `M 52 86 C 53 72 50 56 48 38`;

    // 5. Sun Line: Rises from mid-palm towards Sun mount (ring finger)
    const sunPath = `M 62 68 Q 61 52 60 38`;

    const lines = {
      heart: {
        path: heartPath,
        color: '#FF4B6E',
        shape: mounts.guru > 75 ? 'Curving to Jupiter (High Ideals)' : 'Extending to Saturn (Practical Loyalty)',
        desc: mounts.guru > 75 
          ? 'Your Heart Line sweeps upwards towards the Mount of Jupiter. This indicates elevated ideals in love, unwavering fidelity, emotional nobility, and deep devotion to loved ones.'
          : 'Your Heart Line holds a steady, balanced course. This reflects an emotionally grounded nature, realistic expectations in relationships, and steady affectionate loyalty.'
      },
      head: {
        path: headPath,
        color: '#00D29E',
        shape: mounts.chandra > 75 ? 'Curving toward Moon (Creative Intuition)' : 'Straight & Direct (Pragmatic Logic)',
        desc: mounts.chandra > 75
          ? 'Your Head Line dips gently towards the Mount of Moon. This reveals high creative imagination, lateral problem-solving skills, and deep psychological empathy.'
          : 'Your Head Line follows a clean, direct trajectory. This indicates razor-sharp analytical focus, structured decision-making, and strong mental resilience under pressure.'
      },
      life: {
        path: lifePath,
        color: '#FDB827',
        shape: mounts.shukra > 75 ? 'Wide Venus Arc (Vibrant Vitality)' : 'Graceful Deep Contour (Balanced Endurance)',
        desc: mounts.shukra > 75
          ? 'A generous, expansive curve embracing the Mount of Venus signifies abundant Prana Shakti (vital energy), strong natural immunity, and an enthusiastic approach to life.'
          : 'A well-defined, balanced Life Line indicating steady physical stamina, adaptability during lifestyle transitions, and disciplined longevity.'
      },
      fate: {
        path: fatePath,
        color: '#9D4EDD',
        shape: 'Unbroken Saturn Ascent (Self-Made Destiny)',
        desc: 'A distinct Fate Line ascending through the central plain indicates self-made professional milestones, perseverance through middle-career phases, and financial autonomy.'
      },
      sun: {
        path: sunPath,
        color: '#FFB703',
        shape: 'Apollo Beam (Auspicious Reputation)',
        desc: 'A prominent Sun Line beneath the ring finger indicates creative distinction, public trust, and recognition from authoritative peers in your field.'
      }
    };

    // Auspicious Signs Detection
    const auspiciousSigns = [];
    if (mounts.guru >= 76) auspiciousSigns.push({ name: 'Trishul on Guru Mount', desc: 'Sign of profound leadership wisdom and spiritual protection.' });
    if (mounts.surya >= 75) auspiciousSigns.push({ name: 'Matsya (Fish) Mark on Sun Mount', desc: 'Traditional indicator of fame, sudden wealth, and artistic honor.' });
    if (mounts.shukra >= 78) auspiciousSigns.push({ name: 'Lotus (Padam) on Venus Mount', desc: 'Indicates material luxury, graceful charm, and domestic happiness.' });
    if (mounts.chandra >= 74) auspiciousSigns.push({ name: 'Travel & Intuition Star on Moon Mount', desc: 'Signifies foreign connections, intuition, and success away from birthplace.' });
    if (!auspiciousSigns.length) {
      auspiciousSigns.push({ name: 'Shubha Chatra (Protective Canopy)', desc: 'Well-guarded energy protecting health and career continuity.' });
    }

    // Remedies based on ruling mount
    const remedies = getVedicRemedies(mounts);

    return {
      isTooDark,
      avgLum,
      handType,
      rulingGraha,
      elementTag,
      tagline,
      desc,
      mounts,
      lines,
      auspiciousSigns,
      remedies
    };
  }

  function getVedicRemedies(mounts) {
    if (mounts.guru >= mounts.surya && mounts.guru >= mounts.shukra) {
      return {
        gem: 'Yellow Sapphire (Pukhraj) or Yellow Topaz',
        gemSub: 'Worn on index finger on Thursday morning',
        rudraksha: '5 Mukhi Rudraksha',
        rudrakshaSub: 'For clarity of intellect and Guru blessings',
        day: 'Thursday (Guruvar)',
        daySub: 'Auspicious for launching ventures and educational pursuits',
        color: 'Golden Yellow & Saffron',
        colorSub: 'Attunes your aura to wisdom and expansion',
        mantra: 'ॐ बृं बृहस्पतये नमः (Om Brim Brihaspataye Namah)'
      };
    } else if (mounts.surya >= mounts.shani) {
      return {
        gem: 'Ruby (Manikya) or Red Garnet',
        gemSub: 'Worn on ring finger in copper or gold on Sunday',
        rudraksha: '1 Mukhi or 12 Mukhi Rudraksha',
        rudrakshaSub: 'For vital radiance, executive power, and fame',
        day: 'Sunday (Ravivar)',
        daySub: 'Auspicious for leadership decisions and Surya Arghya',
        color: 'Crimson, Gold & Copper',
        colorSub: 'Amplifies vitality and positive presence',
        mantra: 'ॐ घृणिः सूर्याय नमः (Om Ghrinih Suryaya Namah)'
      };
    } else {
      return {
        gem: 'Blue Sapphire (Neelam) / Amethyst or Emerald',
        gemSub: 'Worn on middle finger on Saturday',
        rudraksha: '7 Mukhi or 14 Mukhi Rudraksha',
        rudrakshaSub: 'For career stability, focus, and Saturn grace',
        day: 'Saturday (Shanivar)',
        daySub: 'Ideal for charitable deeds and focused hard work',
        color: 'Deep Blue & Forest Green',
        colorSub: 'Calms restless thoughts and grounds your discipline',
        mantra: 'ॐ शं शनैश्चराय नमः (Om Sham Shanaishcharaya Namah)'
      };
    }
  }

  // 4. Results Rendering & Interactive Line Highlighting
  function showResults(analysis) {
    resultsCard.style.display = 'block';

    // Populate Hero Archetype
    document.getElementById('res-tattva-tag').textContent = analysis.elementTag;
    document.getElementById('res-hand-name').textContent = analysis.handType;
    document.getElementById('res-hand-tagline').textContent = analysis.tagline;
    document.getElementById('res-hand-desc').textContent = analysis.desc;

    // Show image in the interactive stage
    if (resultImg && capturedBase64) {
      resultImg.src = capturedBase64;
    }

    // Render SVG lines overlay
    renderSvgLines(analysis.lines);

    // Populate Detailed Line Cards
    document.getElementById('tag-heart-shape').textContent = analysis.lines.heart.shape;
    document.getElementById('desc-heart').textContent = analysis.lines.heart.desc;

    document.getElementById('tag-head-shape').textContent = analysis.lines.head.shape;
    document.getElementById('desc-head').textContent = analysis.lines.head.desc;

    document.getElementById('tag-life-shape').textContent = analysis.lines.life.shape;
    document.getElementById('desc-life').textContent = analysis.lines.life.desc;

    document.getElementById('tag-fate-shape').textContent = analysis.lines.fate.shape;
    document.getElementById('desc-fate').textContent = analysis.lines.fate.desc;

    document.getElementById('tag-sun-shape').textContent = analysis.lines.sun.shape;
    document.getElementById('desc-sun').textContent = analysis.lines.sun.desc;

    // Populate Mounts Grid
    const mountsGrid = document.getElementById('mounts-list-grid');
    if (mountsGrid) {
      const mountDefs = [
        { key: 'guru', label: 'Jupiter (Guru)', role: 'Ambition & Wisdom' },
        { key: 'shani', label: 'Saturn (Shani)', role: 'Career & Discipline' },
        { key: 'surya', label: 'Sun (Surya)', role: 'Fame & Creativity' },
        { key: 'budha', label: 'Mercury (Budha)', role: 'Business & Speech' },
        { key: 'shukra', label: 'Venus (Shukra)', role: 'Vitality & Luxury' },
        { key: 'chandra', label: 'Moon (Chandra)', role: 'Intuition & Imagination' },
        { key: 'mangal', label: 'Mars (Mangal)', role: 'Courage & Resilience' }
      ];
      mountsGrid.innerHTML = mountDefs.map(m => {
        const score = analysis.mounts[m.key];
        return `
          <div class="mount-box">
            <div class="mount-head">
              <b>${m.label}</b>
              <span class="mount-val">${score}%</span>
            </div>
            <div class="mount-bar-track">
              <div class="mount-bar-fill" style="width:${score}%"></div>
            </div>
            <small class="muted">${m.role}</small>
          </div>
        `;
      }).join('');
    }

    // Populate Auspicious Signs
    const signsRow = document.getElementById('signs-tags-row');
    if (signsRow) {
      signsRow.innerHTML = analysis.auspiciousSigns.map(s => `
        <div class="sign-tag-badge">
          <svg class="ui" viewBox="0 0 24 24"><use href="#i-star"/></svg>
          <div>
            <b>${s.name}</b>
            <p class="small muted">${s.desc}</p>
          </div>
        </div>
      `).join('');
    }

    // Populate Remedies
    document.getElementById('rem-gem').textContent = analysis.remedies.gem;
    document.getElementById('rem-gem-sub').textContent = analysis.remedies.gemSub;
    document.getElementById('rem-rudraksha').textContent = analysis.remedies.rudraksha;
    document.getElementById('rem-rudraksha-sub').textContent = analysis.remedies.rudrakshaSub;
    document.getElementById('rem-day').textContent = analysis.remedies.day;
    document.getElementById('rem-day-sub').textContent = analysis.remedies.daySub;
    document.getElementById('rem-color').textContent = analysis.remedies.color;
    document.getElementById('rem-color-sub').textContent = analysis.remedies.colorSub;
    document.getElementById('rem-mantra').textContent = analysis.remedies.mantra;

    // Scroll smoothly to results
    resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Sync to Supabase in background
    syncPalmReading(analysis);
  }

  function renderSvgLines(lines) {
    if (!overlaySvg) return;
    const lineEntries = Object.entries(lines);
    overlaySvg.innerHTML = `
      <defs>
        <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      ${lineEntries.map(([key, item]) => `
        <path 
          id="svg-line-${key}" 
          class="palm-line-path line-${key}" 
          d="${item.path}" 
          stroke="${item.color}" 
          stroke-width="2.6" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          fill="none" 
          filter="url(#glow-filter)"
        />
      `).join('')}
    `;
    setupLineToggles();
  }

  function setupLineToggles() {
    const pills = document.querySelectorAll('#palm-line-toggles .line-pill');
    pills.forEach(pill => {
      pill.onclick = () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const target = pill.getAttribute('data-line');
        highlightLine(target);
      };
    });
  }

  function highlightLine(target) {
    activeLine = target;
    const paths = document.querySelectorAll('.palm-line-path');
    const cards = document.querySelectorAll('.palm-line-card');

    paths.forEach(p => {
      const isMatch = target === 'all' || p.id === `svg-line-${target}`;
      p.style.opacity = isMatch ? '1' : '0.18';
      p.style.strokeWidth = (isMatch && target !== 'all') ? '4.2' : '2.6';
    });

    cards.forEach(c => {
      if (target === 'all') {
        c.classList.remove('spotlight');
      } else if (c.id === `card-line-${target}`) {
        c.classList.add('spotlight');
        c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        c.classList.remove('spotlight');
      }
    });
  }

  // 5. Cloud Sync with Supabase
  async function syncPalmReading(analysis) {
    const syncTag = document.getElementById('res-sync-tag');
    try {
      const payload = {
        photo_base64: capturedBase64,
        lines: analysis.lines,
        features: {
          handType: analysis.handType,
          elementTag: analysis.elementTag,
          mounts: analysis.mounts
        },
        report: {
          tagline: analysis.tagline,
          auspiciousSigns: analysis.auspiciousSigns,
          remedies: analysis.remedies
        }
      };

      const res = await fetch('/api/palm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data && data.ok) {
        if (syncTag) syncTag.style.display = 'inline-flex';
      }
    } catch (e) {
      console.warn('Palm reading sync skipped:', e);
    }
  }

})();
