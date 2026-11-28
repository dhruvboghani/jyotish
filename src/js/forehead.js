// Bhāla Rekha Shastra: Vedic 7-Planet Forehead Line Scanner & Analyzer
(function () {
  'use strict';

  const PLANET_LINES = [
    {
      id: 'saturn',
      name: 'Shani Rekha (Saturn Line)',
      graha: 'Saturn (Shani)',
      yRel: 0.20,
      color: '#7C93E8',
      role: 'Longevity, Patience & Karmic Wisdom',
      destiny: 'Positioned closest to the hairline. When clear and unbroken, it signifies high longevity (Dirghayu), deep contemplative intellect, and ability to overcome life trials with detachment.',
      strength: 'Strong and well-formed. Indicates philosophical depth and enduring career foundation.',
      remedy: 'Light a sesame oil lamp on Saturday evenings and practice steady meditation.'
    },
    {
      id: 'jupiter',
      name: 'Guru Rekha (Jupiter Line)',
      graha: 'Jupiter (Brihaspati)',
      yRel: 0.30,
      color: '#FFC233',
      role: 'Wisdom, Dharma & Administrative Honor',
      destiny: 'Situated below Saturn. Reflects moral authority, intellectual leadership, and devotion to higher truth. Common in teachers, jurists, advisors, and statesmen.',
      strength: 'Distinct and prominent. Signifies respect in community and academic blessings.',
      remedy: 'Apply yellow sandalwood or saffron tilak on the forehead center.'
    },
    {
      id: 'mars',
      name: 'Mangala Rekha (Mars Line)',
      graha: 'Mars (Kuja)',
      yRel: 0.42,
      color: '#E04A2E',
      role: 'Executive Courage, Stamina & Victory',
      destiny: 'Located above the midpoint. Bestows physical resilience, leadership in competitive arenas, technical competence, and protective instinct.',
      strength: 'Energetic and sharp. Bestows courage to champion difficult projects.',
      remedy: 'Recite Hanuman Chalisa and engage in regular physical discipline.'
    },
    {
      id: 'sun',
      name: 'Surya Rekha (Sun Line)',
      graha: 'Sun (Surya)',
      yRel: 0.54,
      color: '#F07818',
      role: 'Sovereign Authority, Fame & Vitality',
      destiny: 'Runs through the center of the forehead. In classical Samudrika, a deep unbroken Sun Line bestows Raja Yoga—public recognition, executive authority, and personal radiance.',
      strength: 'Radiant and balanced. Conveys commanding presence and noble self-esteem.',
      remedy: 'Perform Surya Namaskar and offer clean water at dawn.'
    },
    {
      id: 'venus',
      name: 'Shukra Rekha (Venus Line)',
      graha: 'Venus (Shukra)',
      yRel: 0.66,
      color: '#F8CFE0',
      role: 'Artistic Refinement, Charisma & Prosperity',
      destiny: 'Positioned below the solar line. Signifies aesthetic charm, love of fine arts, diplomacy, social magnetism, and material comforts.',
      strength: 'Curved and graceful. Bestows harmonious relationships and aesthetic taste.',
      remedy: 'Keep environments fragrant, wear clean light-colored garments, and support cultural arts.'
    },
    {
      id: 'mercury',
      name: 'Budha Rekha (Mercury Line)',
      graha: 'Mercury (Budha)',
      yRel: 0.78,
      color: '#6FBF8A',
      role: 'Commercial Wit, Eloquence & Strategy',
      destiny: 'Located just above the eyebrows. Confers fast analytical reasoning, persuasive speech, mercantile skill, and mastery of languages and numbers.',
      strength: 'Agile and clear. Confers sharp communication and successful commercial negotiations.',
      remedy: 'Feed green grass or vegetables to cows on Wednesdays.'
    },
    {
      id: 'moon',
      name: 'Chandra Rekha (Moon Line)',
      graha: 'Moon (Chandra)',
      yRel: 0.90,
      color: '#DCE4FF',
      role: 'Intuition, Deep Emotion & Imagination',
      destiny: 'Frames the upper arches of the eyebrows. Indicates rich imaginative faculty, emotional sensitivity, poetic vision, and foreign voyages.',
      strength: 'Gentle and luminous. Grants intuitive hunches and creative perception.',
      remedy: 'Drink water from silver vessels and cultivate peace of mind before sleep.'
    }
  ];

  // DOM Elements
  const video = document.getElementById('forehead-video');
  const preview = document.getElementById('forehead-preview');
  const btnStartCam = document.getElementById('btn-start-camera');
  const btnSnap = document.getElementById('btn-snap');
  const btnFlipCam = document.getElementById('btn-flip-cam');
  const btnReset = document.getElementById('btn-reset');
  const fileInput = document.getElementById('forehead-file-input');
  const guide = document.getElementById('scanner-forehead-guide');
  const beam = document.getElementById('scanning-beam');
  const placeholder = document.getElementById('scanner-placeholder');
  const analyzing = document.getElementById('forehead-analyzing');
  const resultsSec = document.getElementById('forehead-results');
  const displayCanvas = document.getElementById('forehead-display-canvas');
  const overlaySvg = document.getElementById('forehead-overlay-svg');
  const toggles = document.getElementById('line-toggles');
  const caption = document.getElementById('active-line-caption');
  const cardsGrid = document.getElementById('forehead-cards-grid');

  let stream = null;
  let facingMode = 'user';
  let capturedBase64 = null;
  let activeLineId = 'all';

  const I18N_FH = (window.I18N && window.I18N.forehead) || {};
  const LINES = PLANET_LINES.map(pl => (I18N_FH.lines && I18N_FH.lines[pl.id]) ? { ...pl, ...I18N_FH.lines[pl.id] } : pl);

  async function startCamera() {
    try {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      video.srcObject = stream;
      video.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
      if (preview) preview.style.display = 'none';
      if (guide) guide.style.display = 'block';
      btnStartCam.style.display = 'none';
      btnSnap.style.display = 'inline-flex';
      btnFlipCam.style.display = 'inline-flex';
    } catch (e) {
      alert(I18N_FH.camError || 'Camera access unavailable. Please use the Upload Photo button.');
    }
  }

  function capturePhoto() {
    const c = document.createElement('canvas');
    c.width = video.videoWidth || 640;
    c.height = video.videoHeight || 480;
    const ctx = c.getContext('2d');
    ctx.drawImage(video, 0, 0, c.width, c.height);
    capturedBase64 = c.toDataURL('image/jpeg', 0.85);

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    video.style.display = 'none';
    if (guide) guide.style.display = 'none';
    btnSnap.style.display = 'none';
    btnFlipCam.style.display = 'none';
    btnReset.style.display = 'inline-flex';

    processForeheadImage(capturedBase64);
  }

  function handleFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      capturedBase64 = ev.target.result;
      if (video) video.style.display = 'none';
      if (placeholder) placeholder.style.display = 'none';
      btnStartCam.style.display = 'none';
      btnReset.style.display = 'inline-flex';
      processForeheadImage(capturedBase64);
    };
    reader.readAsDataURL(file);
  }

  function processForeheadImage(src) {
    if (beam) beam.style.display = 'block';
    if (analyzing) analyzing.style.display = 'flex';
    if (resultsSec) resultsSec.style.display = 'none';

    const img = new Image();
    img.onload = () => {
      setTimeout(() => {
        if (beam) beam.style.display = 'none';
        if (analyzing) analyzing.style.display = 'none';
        if (resultsSec) resultsSec.style.display = 'block';

        renderVisuals(img);
        renderCards();
        persistReading();
      }, 700);
    };
    img.src = src;
  }

  async function persistReading() {
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
          kind: 'forehead',
          input: { activeLine: activeLineId },
          result: { lines: PLANET_LINES.map(p => ({ id: p.id, graha: p.graha, role: p.role, destiny: p.destiny })) }
        })
      }).catch(() => {});
    } catch (e) {}
  }

  function renderVisuals(img) {
    if (!displayCanvas) return;
    const ctx = displayCanvas.getContext('2d');
    displayCanvas.width = 400;
    displayCanvas.height = 300;
    ctx.drawImage(img, 0, 0, 400, 300);

    // Render SVG bezier lines for each planet
    renderSvgLines();
  }

  function renderSvgLines() {
    if (!overlaySvg) return;
    overlaySvg.innerHTML = '';

    PLANET_LINES.forEach((pl, i) => {
      const isCurrent = activeLineId === 'all' || activeLineId === pl.id;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      const y = Math.round(300 * pl.yRel);
      // Natural forehead brow curve: slight dip in center or slight arch
      const d = `M 40 ${y + 5} Q 200 ${y - 12} 360 ${y + 5}`;
      path.setAttribute('d', d);
      path.setAttribute('class', 'forehead-line-path ' + (isCurrent ? 'active' : 'dimmed'));
      path.setAttribute('stroke', pl.color);
      path.setAttribute('stroke-width', isCurrent && activeLineId === pl.id ? '5' : '3');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('fill', 'none');
      path.style.transition = 'all 0.3s ease';

      overlaySvg.appendChild(path);
    });
  }

  function renderCards() {
    if (!cardsGrid) return;
    cardsGrid.innerHTML = '';

    LINES.forEach(pl => {
      const card = document.createElement('div');
      card.id = 'card-' + pl.id;
      card.className = 'card forehead-line-card ' + (activeLineId === pl.id ? 'active-card' : '');
      card.innerHTML = `
        <div class="line-card-header">
          <span class="tag" style="background:${pl.color}22; color:${pl.color}; border: 1px solid ${pl.color}55">${pl.graha}</span>
          <h3>${pl.name}</h3>
          <p class="role-desc font-semibold">${pl.role}</p>
        </div>
        <p class="prose-text">${pl.destiny}</p>
        <div class="strength-box">
          <span class="small font-bold">${I18N_FH.readingH || 'Vedic Reading:'}</span>
          <p class="small muted">${pl.strength}</p>
        </div>
        <div class="remedy-box">
          <span class="small font-bold">${I18N_FH.remedyH || 'Vedic Harmony Remedy:'}</span>
          <p class="small muted">${pl.remedy}</p>
        </div>
      `;
      cardsGrid.appendChild(card);
    });
  }

  // Spotlight Pill Toggle Handler
  if (toggles) {
    toggles.addEventListener('click', e => {
      const btn = e.target.closest('.line-pill');
      if (!btn) return;
      toggles.querySelectorAll('.line-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      activeLineId = btn.getAttribute('data-line');
      renderSvgLines();
      renderCards();

      if (caption) {
        if (activeLineId === 'all') {
          caption.textContent = I18N_FH.captionAll || 'Showing all 7 classical planetary lines';
        } else {
          const match = LINES.find(l => l.id === activeLineId);
          caption.textContent = `${match ? match.name : ''} (${match ? match.role : ''})`;
          // Scroll to card
          const targetCard = document.getElementById('card-' + activeLineId);
          if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    });
  }

  // Action Buttons
  if (btnStartCam) btnStartCam.addEventListener('click', startCamera);
  if (btnSnap) btnSnap.addEventListener('click', capturePhoto);
  if (btnFlipCam) {
    btnFlipCam.addEventListener('click', () => {
      facingMode = (facingMode === 'user') ? 'environment' : 'user';
      startCamera();
    });
  }
  if (fileInput) fileInput.addEventListener('change', handleFileUpload);
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = null;
      btnReset.style.display = 'none';
      btnStartCam.style.display = 'inline-flex';
      if (resultsSec) resultsSec.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
      if (video) video.style.display = 'none';
    });
  }

})();
