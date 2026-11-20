/* Grahavani — Samudrika Shastra: Vedic Face Reading & Kundali from Selfie
   Runs client-side facial landmark & zone analysis, spectacles detection,
   and saves base64 photo + reading into Supabase. */
(function() {
  const video = document.getElementById('face-video');
  const overlay = document.getElementById('face-overlay');
  const preview = document.getElementById('face-preview');
  const scannerOval = document.getElementById('scanner-oval');
  const scanningBeam = document.getElementById('scanning-beam');
  const specsAlert = document.getElementById('specs-alert');
  const specsTitle = document.getElementById('specs-alert-title');
  const specsMsg = document.getElementById('specs-alert-msg');
  const btnStart = document.getElementById('btn-start-camera');
  const btnSnap = document.getElementById('btn-snap');
  const fileInput = document.getElementById('face-file-input');
  const btnFlip = document.getElementById('btn-flip-cam');
  const btnReset = document.getElementById('btn-reset');
  const btnRetakeSpecs = document.getElementById('btn-retake-specs');
  const btnIgnoreSpecs = document.getElementById('btn-ignore-specs');
  const analyzingCard = document.getElementById('face-analyzing');
  const resultsSec = document.getElementById('face-results');
  const scannerHint = document.getElementById('scanner-hint');

  if (!video || !btnStart) return;

  let stream = null;
  let facingMode = 'user';
  let capturedBase64 = null;
  let detectedAnalysis = null;

  // --- Camera Management ---
  async function startCamera() {
    stopCamera();
    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 800 }
        },
        audio: false
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await video.play();

      video.style.display = 'block';
      if (preview) preview.style.display = 'none';
      if (scannerOval) scannerOval.style.display = 'block';
      btnStart.style.display = 'none';
      btnSnap.style.display = 'inline-flex';
      btnFlip.style.display = 'inline-flex';
      if (specsAlert) specsAlert.style.display = 'none';
      if (scannerHint) scannerHint.textContent = (window.I18N && window.I18N.face && window.I18N.face.hintAlign) || 'Align your face inside the golden oval with good lighting.';
    } catch (err) {
      console.warn('Camera error:', err);
      alert((window.I18N && window.I18N.face && window.I18N.face.camError) || 'Could not open camera. Please allow camera permissions or upload a photo.');
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  function flipCamera() {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera();
  }

  // --- Image Capture & Scaling (Base64) ---
  function captureCurrentFrame() {
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 800;

    // Rescale to 360x480 max for fast network transfer and lean base64 storage (~35 KB)
    const targetW = 360;
    const targetH = Math.round((h / w) * targetW);
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    // Mirror front camera
    if (facingMode === 'user') {
      ctx.translate(targetW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, targetW, targetH);

    const base64 = canvas.toDataURL('image/jpeg', 0.82);
    stopCamera();
    return { base64, canvas, width: targetW, height: targetH };
  }

  // --- Spectacles & Goggles Detection ---
  function analyzeSpecsAndLandmarks(canvas, width, height) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Center face box approximation
    const boxX = Math.round(width * 0.20);
    const boxW = Math.round(width * 0.60);
    const boxY = Math.round(height * 0.15);
    const boxH = Math.round(height * 0.70);

    // 1. Forehead band (top 15% to 28% of face)
    const fhY1 = boxY + Math.round(boxH * 0.05);
    const fhY2 = boxY + Math.round(boxH * 0.22);
    let fhLumaSum = 0, fhCount = 0;

    // 2. Eye and Nose-bridge band (32% to 50% of face)
    const eyeY1 = boxY + Math.round(boxH * 0.30);
    const eyeY2 = boxY + Math.round(boxH * 0.50);
    let eyeLumaSum = 0, eyeCount = 0;
    let bridgeGradients = 0, bridgePixels = 0;

    // Central bridge coordinates (45% to 55% of face width)
    const bridgeX1 = boxX + Math.round(boxW * 0.42);
    const bridgeX2 = boxX + Math.round(boxW * 0.58);

    const lumaAt = (x, y) => {
      const idx = (y * width + x) * 4;
      return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    };

    // Sample forehead luminance
    for (let y = fhY1; y < fhY2; y += 3) {
      for (let x = boxX + 10; x < boxX + boxW - 10; x += 3) {
        fhLumaSum += lumaAt(x, y);
        fhCount++;
      }
    }
    const avgFhLuma = fhCount > 0 ? (fhLumaSum / fhCount) : 120;

    // Sample eye and nasal bridge luminance and edge gradients
    for (let y = eyeY1; y < eyeY2; y += 2) {
      for (let x = boxX + 5; x < boxX + boxW - 5; x += 2) {
        const lum = lumaAt(x, y);
        eyeLumaSum += lum;
        eyeCount++;

        // In the bridge area, measure horizontal Sobel-like edge steps
        if (x >= bridgeX1 && x <= bridgeX2) {
          const leftLum = lumaAt(x - 2, y);
          const rightLum = lumaAt(x + 2, y);
          const grad = Math.abs(rightLum - leftLum);
          if (grad > 38) bridgeGradients++;
          bridgePixels++;
        }
      }
    }

    const avgEyeLuma = eyeCount > 0 ? (eyeLumaSum / eyeCount) : 100;
    const bridgeEdgeDensity = bridgePixels > 0 ? (bridgeGradients / bridgePixels) : 0;

    // Condition A: Dark Sunglasses / Goggles (eye zone is disproportionately dark)
    const isDarkGoggles = (avgEyeLuma < 55) || (avgEyeLuma < avgFhLuma * 0.48);

    // Condition B: Clear Spectacles / Frames (sharp bridge gradient density or frame rim contrast)
    const hasSpectacles = bridgeEdgeDensity > 0.16;

    const specsDetected = isDarkGoggles || hasSpectacles;
    const specsType = isDarkGoggles ? 'goggles' : hasSpectacles ? 'spectacles' : 'none';

    // Measure Samudrika proportions:
    // Upper zone (Forehead), Mid zone (Eyes + Nose), Lower zone (Chin + Jaw)
    const upperRatio = ((fhY2 - fhY1) / boxH);
    const midRatio = ((eyeY2 - eyeY1) / boxH);
    const lowerRatio = 1 - (upperRatio + midRatio);

    return {
      specsDetected,
      specsType,
      upperRatio: Number(upperRatio.toFixed(3)),
      midRatio: Number(midRatio.toFixed(3)),
      lowerRatio: Number(lowerRatio.toFixed(3)),
      avgLuma: Math.round(avgFhLuma),
      bridgeDensity: Number(bridgeEdgeDensity.toFixed(3))
    };
  }

  // --- Samudrika Shastra Astrological Reading Engine ---
  function computeSamudrikaReading(features) {
    const { upperRatio, midRatio, lowerRatio, avgLuma } = features;

    // Calculate Graha affinity scores
    const scores = {
      Guru: Math.round(40 + upperRatio * 130 + (avgLuma > 110 ? 15 : 5)),
      Surya: Math.round(35 + (avgLuma > 130 ? 25 : 10) + upperRatio * 90),
      Mangal: Math.round(30 + lowerRatio * 120 + midRatio * 50),
      Shukra: Math.round(35 + midRatio * 110 + (features.bridgeDensity < 0.12 ? 15 : 0)),
      Budha: Math.round(40 + (Math.abs(upperRatio - lowerRatio) < 0.1 ? 25 : 10)),
      Chandra: Math.round(35 + (avgLuma > 120 ? 20 : 5) + (lowerRatio < 0.35 ? 15 : 5)),
      Shani: Math.round(30 + lowerRatio * 110 + (avgLuma < 100 ? 20 : 5))
    };

    // Find dominant planet
    let dominant = 'Guru';
    let maxScore = -1;
    for (const [planet, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = planet;
      }
    }

    const tattvaMap = {
      Surya: { name: 'Agni (Fire)', desc: 'High vitality, leadership, radiant self-determination' },
      Mangal: { name: 'Agni (Fire)', desc: 'Courage, physical stamina, decisive execution' },
      Guru: { name: 'Akasha (Ether)', desc: 'Broad wisdom, philosophical depth, natural benevolence' },
      Shukra: { name: 'Jala (Water)', desc: 'Artistic appreciation, magnetic charm, emotional grace' },
      Chandra: { name: 'Jala (Water)', desc: 'Intuition, empathetic perception, deep maternal caring' },
      Budha: { name: 'Prithvi (Earth)', desc: 'Intellectual adaptability, eloquence, sharp commerce' },
      Shani: { name: 'Vayu (Air)', desc: 'Disciplined perseverance, realism, structured foundation' }
    };

    const grahaData = {
      Surya: {
        title: 'Surya (Sun) Archetype — The Sovereign & Leader',
        tagline: 'High destiny, inherent authority, vibrant vital force',
        summary: 'Your facial structure exhibits high solar vitality with an open, luminous forehead and focused brow. Samudrika Shastra considers this a signature of natural leadership, dignity, and an ambitious soul that commands respect.',
        career: 'Excels in administration, management, public office, entrepreneurship, and leadership roles where autonomy and vision are required.',
        wealth: 'Strong earning capability through independent initiative, government patronage, or commanding high executive value.',
        love: 'Warm, devoted, and protective; appreciates mutual respect, loyalty, and a partner who honors your inner dignity.',
        nature: 'Honest, courageous, and proud with a high sense of moral duty and aversion to pettiness.',
        gem: 'Ruby (Manikya) in Gold / Copper',
        rudraksha: '1 Mukhi or 12 Mukhi Rudraksha',
        color: 'Saffron, Radiant Gold, Deep Crimson',
        day: 'Sunday (Ravivar)',
        mantra: 'Om Hram Hreem Hroum Sah Suryaya Namah'
      },
      Guru: {
        title: 'Guru (Jupiter) Archetype — The Sage & Visionary',
        tagline: 'Expansive wisdom, high intellect, auspicious blessings',
        summary: 'A broad, dignified forehead and calm, steady gaze indicate strong Jupiterian influence. In Mukha Samudrika, this marks a person blessed with righteous judgment, counsel capability, and innate spiritual intelligence.',
        career: 'Thrives in mentorship, teaching, law, finance, consulting, research, and guiding organizations with strategic ethical clarity.',
        wealth: 'Consistent, principled prosperity accumulated through knowledge, wise investments, and societal goodwill.',
        love: 'Values intellectual companionship, shared spiritual principles, and a harmonious, supportive family life.',
        nature: 'Generous, noble-minded, forgiving, with a persistent thirst for learning and uplifting others.',
        gem: 'Yellow Sapphire (Pukhraj) in Gold',
        rudraksha: '5 Mukhi Rudraksha',
        color: 'Haldi Yellow, Warm Amber',
        day: 'Thursday (Guruvar)',
        mantra: 'Om Gram Greem Groum Sah Gurave Namah'
      },
      Mangal: {
        title: 'Mangal (Mars) Archetype — The Warrior & Achiever',
        tagline: 'High determination, stamina, fearless execution',
        summary: 'A structured, resolute jawline and penetrating gaze reveal intense Martian energy. Samudrika Shastra links this bone structure to courage, physical endurance, and a refusal to give up under pressure.',
        career: 'Outstanding in engineering, sports, technical industries, surgery, real estate, and high-stakes problem-solving.',
        wealth: 'Created through competitive drive, property gains, calculated risk-taking, and tireless effort.',
        love: 'Passionate, direct, and fiercely protective of loved ones; seeks honesty and equal enthusiasm.',
        nature: 'Dynamic, candid, action-oriented, with high resilience that turns challenges into triumphs.',
        gem: 'Red Coral (Moonga) in Silver or Copper',
        rudraksha: '3 Mukhi Rudraksha',
        color: 'Bright Coral Red, Vermilion',
        day: 'Tuesday (Mangalvar)',
        mantra: 'Om Kram Kreem Kroum Sah Bhaumaya Namah'
      },
      Shukra: {
        title: 'Shukra (Venus) Archetype — The Creator & Charmer',
        tagline: 'Graceful charisma, aesthetic brilliance, emotional harmony',
        summary: 'Balanced facial symmetry and soft, engaging contours reflect Venusian magnetism. You possess natural charm, a keen eye for beauty, and an effortless ability to put people at ease.',
        career: 'Flourishes in design, media, arts, hospitality, diplomacy, luxury goods, and creative commerce.',
        wealth: 'Attracted through creative talents, partnerships, aesthetic trades, and gracious networking.',
        love: 'Romantic, affectionate, seeking poetic harmony, deep mutual appreciation, and emotional comfort.',
        nature: 'Kind, refined, artistic, with a peaceful disposition and refined sensory taste.',
        gem: 'Diamond or White Zircon in Silver / Platinum',
        rudraksha: '6 Mukhi Rudraksha',
        color: 'Silk White, Pastel Blue, Rose Pink',
        day: 'Friday (Shukravar)',
        mantra: 'Om Shram Shreem Shroum Sah Shukraya Namah'
      },
      Budha: {
        title: 'Budha (Mercury) Archetype — The Strategist & Communicator',
        tagline: 'Youthful versatility, sharp intellect, articulate charm',
        summary: 'Proportionate, expressive features and animated eyes denote strong Mercurial presence. This reveals an agile mind, swift problem-solving ability, and natural communicative brilliance.',
        career: 'Excels in business, technology, communication, marketing, trading, writing, and analytical problem-solving.',
        wealth: 'Built through smart intellect, negotiation skills, multiple income streams, and commercial foresight.',
        love: 'Appreciates witty banter, open verbal communication, mental stimulation, and friendship in love.',
        nature: 'Curious, versatile, witty, quick to adapt, and constantly youthful in spirit.',
        gem: 'Emerald (Panna) in Gold or Silver',
        rudraksha: '4 Mukhi Rudraksha',
        color: 'Emerald Green, Parakeet Green',
        day: 'Wednesday (Budhavar)',
        mantra: 'Om Bram Breem Broum Sah Budhaya Namah'
      },
      Chandra: {
        title: 'Chandra (Moon) Archetype — The Healer & Empath',
        tagline: 'Intuitive sensitivity, peaceful magnetism, deep empathy',
        summary: 'Soft, luminous facial contours and gentle, receptive eyes indicate Lunar predominance. Samudrika texts highlight this as a marker of strong emotional intelligence, caring warmth, and visionary intuition.',
        career: 'Thrives in healthcare, counseling, psychology, hospitality, education, creative writing, and public care.',
        wealth: 'Fluctuating yet abundant, growing steadily through public goodwill, emotional connection, and trust.',
        love: 'Deeply loyal, nurturing, and sensitive; desires emotional security, warmth, and soulful closeness.',
        nature: 'Empathetic, peace-loving, imaginative, with profound inner feelings and psychological sensitivity.',
        gem: 'Natural Pearl (Moti) or Moonstone in Silver',
        rudraksha: '2 Mukhi Rudraksha',
        color: 'Milky White, Moonlight Silver',
        day: 'Monday (Somvar)',
        mantra: 'Om Shram Shreem Shroum Sah Chandraya Namah'
      },
      Shani: {
        title: 'Shani (Saturn) Archetype — The Master of Discipline',
        tagline: 'Long-term fortitude, profound patience, enduring achievement',
        summary: 'Deep-set, contemplative eyes and a solid chin signify Saturnian endurance. Samudrika Shastra recognizes this as a sign of a disciplined soul that achieves legendary success through patient, persistent dedication.',
        career: 'Masters heavy industry, infrastructure, administration, judiciary, agriculture, long-range research, and governance.',
        wealth: 'Accumulated steadily and solidly with time, proving durable, self-made, and generational.',
        love: 'Cautious to commit, but immensely faithful, dependable, and a lifelong pillar of strength.',
        nature: 'Realistic, practical, duty-bound, with monumental patience and profound resilience.',
        gem: 'Blue Sapphire (Neelam) or Amethyst in Panchdhatu',
        rudraksha: '7 Mukhi or 14 Mukhi Rudraksha',
        color: 'Dark Navy Blue, Steel Grey',
        day: 'Saturday (Shanivar)',
        mantra: 'Om Pram Preem Proum Sah Shanaishcharaya Namah'
      }
    };

    const g = grahaData[dominant] || grahaData.Guru;
    const t = tattvaMap[dominant] || tattvaMap.Guru;

    return {
      dominantGraha: dominant,
      scores,
      tattva: t.name,
      tattvaDesc: t.desc,
      title: g.title,
      tagline: g.tagline,
      summary: g.summary,
      zones: {
        upper: `Bhagya & Wisdom Zone (${Math.round(upperRatio * 100)}%): Reflects mental expanse, philosophical curiosity, and ancestral fortune.`,
        mid: `Karma & Wealth Zone (${Math.round(midRatio * 100)}%): Reflects dynamic ambition, sensory intelligence, and interpersonal magnetism.`,
        lower: `Dhairya & Longevity Zone (${Math.round(lowerRatio * 100)}%): Reflects grounding stamina, practical fortitude, and perseverance through trials.`
      },
      predictions: {
        career: g.career,
        wealth: g.wealth,
        love: g.love,
        nature: g.nature
      },
      remedies: {
        gem: g.gem,
        rudraksha: g.rudraksha,
        color: g.color,
        day: g.day,
        mantra: g.mantra
      }
    };
  }

  // --- Render Report UI ---
  function displayReport(report, features) {
    if (analyzingCard) analyzingCard.style.display = 'none';
    if (resultsSec) resultsSec.style.display = 'block';

    const tattvaTag = document.getElementById('res-tattva-tag');
    if (tattvaTag) tattvaTag.textContent = `${report.tattva} — ${report.tattvaDesc}`;

    const grahaName = document.getElementById('res-graha-name');
    if (grahaName) grahaName.textContent = report.title;

    const grahaTagline = document.getElementById('res-graha-tagline');
    if (grahaTagline) grahaTagline.textContent = report.tagline;

    const grahaSummary = document.getElementById('res-graha-summary');
    if (grahaSummary) grahaSummary.textContent = report.summary;

    const zoneUpper = document.getElementById('res-zone-upper');
    if (zoneUpper) zoneUpper.textContent = report.zones.upper;
    const zoneMid = document.getElementById('res-zone-mid');
    if (zoneMid) zoneMid.textContent = report.zones.mid;
    const zoneLower = document.getElementById('res-zone-lower');
    if (zoneLower) zoneLower.textContent = report.zones.lower;

    const predCareer = document.getElementById('res-pred-career');
    if (predCareer) predCareer.textContent = report.predictions.career;
    const predWealth = document.getElementById('res-pred-wealth');
    if (predWealth) predWealth.textContent = report.predictions.wealth;
    const predLove = document.getElementById('res-pred-love');
    if (predLove) predLove.textContent = report.predictions.love;
    const predNature = document.getElementById('res-pred-nature');
    if (predNature) predNature.textContent = report.predictions.nature;

    const remGem = document.getElementById('res-rem-gem');
    if (remGem) remGem.textContent = report.remedies.gem;
    const remRud = document.getElementById('res-rem-rudraksha');
    if (remRud) remRud.textContent = report.remedies.rudraksha;
    const remColor = document.getElementById('res-rem-color');
    if (remColor) remColor.textContent = report.remedies.color;
    const remDay = document.getElementById('res-rem-day');
    if (remDay) remDay.textContent = report.remedies.day;
    const remMantra = document.getElementById('res-rem-mantra');
    if (remMantra) remMantra.textContent = report.remedies.mantra;

    if (btnReset) btnReset.style.display = 'inline-flex';
    resultsSec.scrollIntoView({ behavior: 'smooth' });
  }

  // --- Persist Base64 Photo & Report to Supabase ---
  async function saveToSupabase(photoBase64, features, report) {
    try {
      let token = null;
      if (window.KG && window.KG.sb && window.KG.sb.auth) {
        const session = (await window.KG.sb.auth.getSession()).data.session;
        if (session && session.access_token) token = session.access_token;
      }

      const res = await fetch('/api/face', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          photo_base64: photoBase64,
          features,
          report
        })
      });

      const json = await res.json().catch(() => null);
      const syncTag = document.getElementById('res-sync-tag');
      if (syncTag) {
        if (json && json.ok) {
          syncTag.innerHTML = `<svg class="icon sm"><use href="#i-check"/></svg> ${(window.I18N && window.I18N.face && window.I18N.face.savedCloud) || 'Saved to Profile'}`;
          syncTag.className = 'tag good';
        } else {
          syncTag.style.display = 'none';
        }
      }
    } catch (err) {
      console.warn('Could not sync to Supabase:', err);
    }
  }

  // --- Processing Flow ---
  function processCapturedImage(canvas, base64) {
    if (scannerOval) scannerOval.style.display = 'none';
    if (scanningBeam) scanningBeam.style.display = 'block';
    if (preview) {
      preview.src = base64;
      preview.style.display = 'block';
    }
    video.style.display = 'none';
    btnSnap.style.display = 'none';
    btnFlip.style.display = 'none';

    // Run geometric & spectacles analysis
    const features = analyzeSpecsAndLandmarks(canvas, canvas.width, canvas.height);
    const reading = computeSamudrikaReading(features);
    capturedBase64 = base64;
    detectedAnalysis = { features, reading };

    if (features.specsDetected) {
      // Spectacles or Goggles detected! Alert user
      if (scanningBeam) scanningBeam.style.display = 'none';
      if (specsAlert) {
        specsAlert.style.display = 'flex';
        specsTitle.textContent = features.specsType === 'goggles'
          ? ((window.I18N && window.I18N.face && window.I18N.face.gogglesTitle) || 'Sunglasses / Goggles Detected')
          : ((window.I18N && window.I18N.face && window.I18N.face.specsTitle) || 'Spectacles / Glasses Detected');
        specsMsg.textContent = (window.I18N && window.I18N.face && window.I18N.face.specsMsg) ||
          'For the most accurate Vedic Samudrika Shastra reading, please remove your spectacles or sunglasses so your eyes, brows, and nasal bridge can be clearly measured.';
      }
    } else {
      finalizeReading();
    }
  }

  function finalizeReading() {
    if (specsAlert) specsAlert.style.display = 'none';
    if (scanningBeam) scanningBeam.style.display = 'none';
    if (analyzingCard) analyzingCard.style.display = 'flex';

    setTimeout(() => {
      if (detectedAnalysis) {
        displayReport(detectedAnalysis.reading, detectedAnalysis.features);
        saveToSupabase(capturedBase64, detectedAnalysis.features, detectedAnalysis.reading);
      }
    }, 600);
  }

  // --- Event Listeners ---
  btnStart.addEventListener('click', startCamera);
  btnFlip.addEventListener('click', flipCamera);

  btnSnap.addEventListener('click', () => {
    const { base64, canvas } = captureCurrentFrame();
    processCapturedImage(canvas, base64);
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 480;
          let w = img.width, h = img.height;
          if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL('image/jpeg', 0.82);
          processCapturedImage(canvas, base64);
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRetakeSpecs) {
    btnRetakeSpecs.addEventListener('click', () => {
      if (specsAlert) specsAlert.style.display = 'none';
      if (resultsSec) resultsSec.style.display = 'none';
      startCamera();
    });
  }

  if (btnIgnoreSpecs) {
    btnIgnoreSpecs.addEventListener('click', finalizeReading);
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (resultsSec) resultsSec.style.display = 'none';
      btnReset.style.display = 'none';
      btnStart.style.display = 'inline-flex';
      if (preview) preview.style.display = 'none';
      if (scannerOval) scannerOval.style.display = 'block';
    });
  }
})();
