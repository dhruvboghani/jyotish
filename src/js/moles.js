// Til Vichar Shastra: Vedic Mole & Body Markings Analyzer
(function () {
  'use strict';

  // Comprehensive Vedic Samudrika Shastra Mole Database
  const MOLE_DATA = [
    // Face & Head
    {
      id: 'forehead_center',
      cat: 'face',
      x: 150, y: 70,
      title: 'Center of Forehead (Trinetra / Third Eye)',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Auspicious (Shubha)', summary: 'High intellect, spiritual wisdom, leadership, and unwavering faith.' },
        female: { polarity: 'auspicious', tag: 'Auspicious (Shubha)', summary: 'Noble intuition, dignified marital harmony, and respected social standing.' }
      },
      destiny: 'Indicates high spiritual merit from past lives. The person rises to commanding heights in their career after age 28 and possesses a strong ethical compass.',
      wealth: 'Financial stability increases progressively. Flourishes in advisory, civil administration, research, or higher education.',
      nature: 'Calm, thoughtful, dignified, and honest. Avoids petty gossip and values truth.',
      remedy: 'Apply white sandalwood or saffron (kesar) tilak on the forehead each morning to strengthen Jupiter and Sun currents.'
    },
    {
      id: 'forehead_right',
      cat: 'face',
      x: 175, y: 65,
      title: 'Right Side of Forehead',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Highly Auspicious', summary: 'Exceptional wealth accumulator, business acumen, and royal honors.' },
        female: { polarity: 'neutral', tag: 'Karmic Indicator', summary: 'Ambitious, independent earner, may experience occasional work stress.' }
      },
      destiny: 'Governed by Surya (Sun) and Guru (Jupiter). Blesses the native with influential networks, real estate ownership, and lasting fame.',
      wealth: 'Substantial wealth through enterprise, real estate, and strategic investments.',
      nature: 'Determined, visionary, ambitious, and charismatic.',
      remedy: 'Offer water (Arghya) to Surya Dev at sunrise in a copper vessel.'
    },
    {
      id: 'forehead_left',
      cat: 'face',
      x: 125, y: 65,
      title: 'Left Side of Forehead',
      genderRules: {
        male: { polarity: 'inauspicious', tag: 'Caution (Ashubha)', summary: 'Impulsive expenditure, tendency towards overthinking and restless travel.' },
        female: { polarity: 'auspicious', tag: 'Highly Auspicious', summary: 'Compassionate, graceful, high artistic perception, and domestic peace.' }
      },
      destiny: 'Governed by Chandra (Moon). Indicates rich imagination and creative aptitude, but requires financial discipline against unplanned splurging.',
      wealth: 'Fluctuating income if undisciplined; stabilized through systematic savings or partner guidance.',
      nature: 'Sensitive, artistic, deeply emotional, and loyal to loved ones.',
      remedy: 'Chant Om Namah Shivaya on Mondays and avoid hasty financial guarantees.'
    },
    {
      id: 'right_eyebrow',
      cat: 'face',
      x: 170, y: 88,
      title: 'Right Eyebrow',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Highly Auspicious', summary: 'Early marriage to a supportive partner, healthy progeny, and steady luck.' },
        female: { polarity: 'neutral', tag: 'Auspicious', summary: 'Sharp analytical mind, high executive drive, and executive roles.' }
      },
      destiny: 'One of the most auspicious spots in Samudrika Shastra. Signifies prosperity, loving family life, and early career stability.',
      wealth: 'Steady and secure financial flow. Blessed with ancestral support or supportive partnerships.',
      nature: 'Warm-hearted, dependable, structured, and family-oriented.',
      remedy: 'Keep a clean silver coin or silver ornament to harmonize Venus and Moon.'
    },
    {
      id: 'left_eyebrow',
      cat: 'face',
      x: 130, y: 88,
      title: 'Left Eyebrow',
      genderRules: {
        male: { polarity: 'inauspicious', tag: 'Caution', summary: 'Unplanned expenses, short temper, and challenges in partnerships.' },
        female: { polarity: 'auspicious', tag: 'Auspicious', summary: 'Artistic acclaim, devoted spouse, and prosperous household.' }
      },
      destiny: 'Subject to Rahu influence for males; indicates sharp wit but warns against speculative risks or impulsive verbal arguments.',
      wealth: 'Prone to sudden expenses; best managed through fixed assets and long-term deposits.',
      nature: 'Quick-witted, unconventional thinker, highly observant.',
      remedy: 'Donate black sesame or feed stray dogs on Saturdays to balance Rahu-Shani energies.'
    },
    {
      id: 'right_cheek',
      cat: 'face',
      x: 178, y: 130,
      title: 'Right Cheek',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Great Fortune', summary: 'Attracts respect, sudden financial windfalls, and affectionate companionship.' },
        female: { polarity: 'neutral', tag: 'Auspicious', summary: 'Dignified presence, authoritative speech, and administrative leadership.' }
      },
      destiny: 'Associated with Shukra (Venus). Confers charming demeanor, social popularity, and material luxuries like comfortable vehicles and beautiful homes.',
      wealth: 'High capacity to generate wealth in luxury, arts, trade, and counseling.',
      nature: 'Courteous, aesthetic, generous, and fond of comfort.',
      remedy: 'Wear white or cream colors on Friday and respect elders in the family.'
    },
    {
      id: 'left_cheek',
      cat: 'face',
      x: 122, y: 130,
      title: 'Left Cheek',
      genderRules: {
        male: { polarity: 'neutral', tag: 'Introvert Karmic', summary: 'Introverted, reflective, high resilience, overcomes obstacles slowly.' },
        female: { polarity: 'auspicious', tag: 'Highly Auspicious', summary: 'Natural magnetism, joyful temperament, and devoted friends.' }
      },
      destiny: 'Deep emotional life. The native faces tests in early youth but gains spiritual depth and authentic lasting relationships.',
      wealth: 'Earns through perseverance and deep technical or artistic mastery.',
      nature: 'Deep thinker, private, contemplative, and loyal friend.',
      remedy: 'Chant the Gayatri Mantra 11 times daily to ignite internal clarity and vitality.'
    },
    {
      id: 'nose_tip',
      cat: 'face',
      x: 150, y: 132,
      title: 'Tip of the Nose',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Quick Wealth & Wit', summary: 'Sudden financial gains, quick temper, but sharp commercial acumen.' },
        female: { polarity: 'auspicious', tag: 'Royal Fortune', summary: 'High luxury lover, sharp judge of character, and joyful family.' }
      },
      destiny: 'Governed by Budha (Mercury) and Shukra (Venus). The person speaks with conviction, possesses rapid problem-solving abilities, and enjoys good cuisine.',
      wealth: 'Attracts money rapidly, though spending habits can be luxurious.',
      nature: 'Sharp-tongued, spontaneous, generous host, and proud.',
      remedy: 'Keep drinking water in an earthen pot and practice cooling Pranayama (Sheetali/Anulom Vilom).'
    },
    {
      id: 'upper_lip',
      cat: 'face',
      x: 150, y: 155,
      title: 'Upper Lip',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Warm & Popular', summary: 'Silver-tongued orator, loved by friends, enjoys fine arts and hospitality.' },
        female: { polarity: 'auspicious', tag: 'Affectionate & Fortunate', summary: 'Charming voice, persuasive communicator, and blessed relationships.' }
      },
      destiny: 'Indicates high Venusian blessings. Success in public speaking, acting, diplomacy, sales, and cultural gatherings.',
      wealth: 'Continuous cash flow driven by social networks and communication prowess.',
      nature: 'Warm, sociable, empathetic, and romantic at heart.',
      remedy: 'Offer fragrant flowers or incense at a temple on Fridays.'
    },
    {
      id: 'chin_center',
      cat: 'face',
      x: 150, y: 180,
      title: 'Center of Chin',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Steadfast & Wealthy', summary: 'Stubborn perseverance, real estate accumulation, and late-life luxury.' },
        female: { polarity: 'auspicious', tag: 'Prosperous Matriarch', summary: 'Strong-willed, financially independent, and respected pillar of household.' }
      },
      destiny: 'A hallmark of stability and earth element (Prithvi Tattva). The native never stays down for long; failures convert into formidable strength.',
      wealth: 'Solid asset foundation, lands, buildings, and steady long-term appreciation.',
      nature: 'Determined, patient, practical, and grounded.',
      remedy: 'Donate yellow lentils (chana dal) to needy on Thursdays.'
    },

    // Torso & Body
    {
      id: 'neck_throat',
      cat: 'torso',
      x: 150, y: 210,
      title: 'Throat / Front of Neck (Kantha)',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Sweet Speech (Saraswati)', summary: 'Vocal charm, musical or oratorical talent, and prestigious connections.' },
        female: { polarity: 'auspicious', tag: 'Auspicious Voice', summary: 'Cultured demeanor, artistic finesse, and supportive life partner.' }
      },
      destiny: 'Known in classical Samudrika as "Kanthabharan". Blesses the person with persuasive communication, peaceful negotiations, and public adoration.',
      wealth: 'Prosperity via consulting, media, counseling, writing, and leadership.',
      nature: 'Diplomatic, gracious, peaceful mediator, and melodious.',
      remedy: 'Chant Saraswati Vandana or wear a clean silver chain.'
    },
    {
      id: 'right_collarbone',
      cat: 'torso',
      x: 185, y: 230,
      title: 'Right Collarbone / Clavicle',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Auspicious Action', summary: 'Leadership in teamwork, courageous decisions, and career rise.' },
        female: { polarity: 'neutral', tag: 'Balanced Fortune', summary: 'Responsible, highly organized, and respected administrator.' }
      },
      destiny: 'Governed by Mangala (Mars). Infuses physical stamina, organizational ability, and confidence under pressure.',
      wealth: 'Thrives in engineering, defence, executive roles, and independent ventures.',
      nature: 'Decisive, protective of dependents, and energetic.',
      remedy: 'Recite Hanuman Chalisa on Tuesdays for sustained vitality.'
    },
    {
      id: 'left_collarbone',
      cat: 'torso',
      x: 115, y: 230,
      title: 'Left Collarbone / Clavicle',
      genderRules: {
        male: { polarity: 'neutral', tag: 'Sensitive Karma', summary: 'Needs patience in career; benefits from mentorship.' },
        female: { polarity: 'auspicious', tag: 'Auspicious Grace', summary: 'Artistic talent, loving family, and high social respect.' }
      },
      destiny: 'Governed by Moon. Enhances creative vision, empathy, and humanitarian ideals.',
      wealth: 'Steady income through creative or collaborative channels.',
      nature: 'Compassionate, imaginative, and peace-seeking.',
      remedy: 'Offer raw milk and water to a Shiva Lingam on Mondays.'
    },
    {
      id: 'chest_right',
      cat: 'torso',
      x: 175, y: 260,
      title: 'Right Side of Chest',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Victorious & Bold', summary: 'Commands respect, overcomes rivals, and enjoys comfortable living.' },
        female: { polarity: 'neutral', tag: 'Strong Will', summary: 'Courageous, dedicated mother, and disciplined work ethic.' }
      },
      destiny: 'Represents valor, integrity, and endurance. The person handles major family responsibilities with distinction.',
      wealth: 'Stable financial growth with dependable returns from steady endeavors.',
      nature: 'Honorable, brave, protective, and upright.',
      remedy: 'Feed birds at dawn to maintain positive prana and balance.'
    },
    {
      id: 'chest_left',
      cat: 'torso',
      x: 125, y: 260,
      title: 'Left Side of Chest (Heart Region)',
      genderRules: {
        male: { polarity: 'neutral', tag: 'Emotional Depth', summary: 'Generous to a fault, sometimes misled by false friends.' },
        female: { polarity: 'auspicious', tag: 'Highly Auspicious', summary: 'Pure heart, blessed with noble children, and affectionate home.' }
      },
      destiny: 'Connected to the Anahata Chakra. Inspires deep empathy, spiritual devotion, and philanthropic inclinations.',
      wealth: 'Wealth is used for noble purposes and community upliftment.',
      nature: 'Selfless, compassionate, warm, and loyal.',
      remedy: 'Wear a natural pearl or silver accessory to stabilize emotional currents.'
    },
    {
      id: 'navel_area',
      cat: 'torso',
      x: 150, y: 320,
      title: 'Navel (Nabhi / Solar Plexus)',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'King-like Comfort', summary: 'Gastronomic pleasure, domestic contentment, and peaceful longevity.' },
        female: { polarity: 'auspicious', tag: 'Lakshmi Yoga', summary: 'Brings immense prosperity to marital home, joyful family life.' }
      },
      destiny: 'In Vedic physiognomy, a mole near or inside the navel is considered an emblem of Lakshmi and Annapurna (divine nourishment).',
      wealth: 'Abundance of food, grains, comfort, and peaceful assets.',
      nature: 'Hospitable, peaceful, content, and family-loving.',
      remedy: 'Never waste food and maintain gratitude before every meal.'
    },

    // Arms & Palms
    {
      id: 'right_palm',
      cat: 'arms',
      x: 230, y: 310,
      title: 'Right Palm',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Supreme Wealth (Kubera)', summary: 'Money stays in hand, high commercial success, and charitable power.' },
        female: { polarity: 'neutral', tag: 'Active Earner', summary: 'Independent, hardworking, manages finances prudently.' }
      },
      destiny: 'Signifies Kubera Yoga when located inside the palm (especially near mounts of Venus or Jupiter). The person rarely lacks funds.',
      wealth: 'Strong wealth retention capacity; multiple income streams.',
      nature: 'Generous donor, astute investor, and proactive.',
      remedy: 'Honor Goddess Lakshmi on Fridays with pure ghee lamp.'
    },
    {
      id: 'left_palm',
      cat: 'arms',
      x: 70, y: 310,
      title: 'Left Palm',
      genderRules: {
        male: { polarity: 'neutral', tag: 'Rapid Flow', summary: 'Generates great income but money slips away quickly; needs budgeting.' },
        female: { polarity: 'auspicious', tag: 'Auspicious Wealth', summary: 'Treasury keeper, brings steady savings and good luck to home.' }
      },
      destiny: 'Indicates high intellect and intuitive trade instincts, with a reminder to invest in long-term fixed assets rather than liquid cash.',
      wealth: 'High earning capacity with a tendency toward impulsive luxury purchases.',
      nature: 'Magnanimous, quick decision maker, and creative.',
      remedy: 'Keep a small silver square piece in wallet to prevent financial leakage.'
    },
    {
      id: 'right_shoulder',
      cat: 'arms',
      x: 215, y: 220,
      title: 'Right Shoulder',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Leader of People', summary: 'Takes responsibility willingly, respected supervisor, dependable.' },
        female: { polarity: 'neutral', tag: 'Strong Resilient', summary: 'Shoulders family duties with grace, reliable counselor.' }
      },
      destiny: 'Indicates strong executive shoulders. The person is trusted by higher authorities and handles major projects successfully.',
      wealth: 'Progressive promotions, authoritative pay grades, and security.',
      nature: 'Resilient, responsible, patient, and ethical.',
      remedy: 'Perform Surya Namaskar daily to empower shoulder strength.'
    },

    // Back & Legs
    {
      id: 'upper_back',
      cat: 'back',
      x: 150, y: 240,
      title: 'Upper Back / Spine Area',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Upright Courage', summary: 'Never cowers before injustice, respected by peers, courageous.' },
        female: { polarity: 'auspicious', tag: 'Noble Bearing', summary: 'High self-respect, moral principles, and spiritual fortitude.' }
      },
      destiny: 'Represents the spinal Meru Danda. Denotes unshakeable principles, protective instinct, and dependable reputation.',
      wealth: 'Solid career in established organizations, public office, or academia.',
      nature: 'Direct, honest, fearless, and protective of the weak.',
      remedy: 'Chant the Aditya Hridaya Stotram for protection and vitality.'
    },
    {
      id: 'right_knee',
      cat: 'back',
      x: 180, y: 370,
      title: 'Right Knee',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'World Traveler', summary: 'Fulfilling journeys, helpful friends abroad, and energetic career.' },
        female: { polarity: 'auspicious', tag: 'Dynamic & Joyful', summary: 'Enjoys outdoor pursuits, travel, and cultural exploration.' }
      },
      destiny: 'Associated with travel, movement, and pilgrimage. The native experiences great career breakthroughs away from their birthplace.',
      wealth: 'Prosperity through transport, foreign trade, travel, or remote consulting.',
      nature: 'Adventurous, adaptable, curious, and open-minded.',
      remedy: 'Offer water to Peepal tree on Saturdays without touching roots.'
    },
    {
      id: 'foot_sole',
      cat: 'back',
      x: 150, y: 395,
      title: 'Sole of the Foot (Padatala)',
      genderRules: {
        male: { polarity: 'auspicious', tag: 'Padareka Fortune', summary: 'Global travel, authoritative status, and comfortable transit.' },
        female: { polarity: 'auspicious', tag: 'Blessed Pilgrim', summary: 'Devoted spiritual seeker, fortunate travels, and honorable family.' }
      },
      destiny: 'One of the classical signs of leadership and spiritual pilgrimage. Signifies that the native leaves a memorable mark wherever they walk.',
      wealth: 'Financial windfalls from overseas assignments and varied enterprises.',
      nature: 'Restless for wisdom, cosmopolitan, and generous.',
      remedy: 'Massage soles with mustard or sesame oil before bed for restful sleep.'
    }
  ];

  const I18N_MOLES = (window.I18N && window.I18N.moles) || {};
  const SPOTS = MOLE_DATA.map(m => {
    const ov = I18N_MOLES.spots && I18N_MOLES.spots[m.id];
    if (!ov) return m;
    return {
      ...m,
      ...ov,
      genderRules: {
        male: { ...m.genderRules.male, ...(ov.male || {}) },
        female: { ...m.genderRules.female, ...(ov.female || {}) }
      }
    };
  });

  let currentGender = 'male';
  let currentTab = 'face';
  let activeSpotId = 'forehead_center';

  // DOM Elements
  const btnMale = document.getElementById('btn-male');
  const btnFemale = document.getElementById('btn-female');
  const searchInput = document.getElementById('mole-search');
  const tabs = document.querySelectorAll('.mole-tabs .tab-btn');
  const hotspotsGroup = document.getElementById('mole-hotspots-group');
  const spotsList = document.getElementById('spots-quick-list');
  const interactiveView = document.getElementById('mole-interactive-view');
  const cameraView = document.getElementById('mole-camera-view');

  // Result card elements
  const resPolarityTag = document.getElementById('res-polarity-tag');
  const resSpotTitle = document.getElementById('res-spot-title');
  const resSpotSummary = document.getElementById('res-spot-summary');
  const resSpotDestiny = document.getElementById('res-spot-destiny');
  const resSpotWealth = document.getElementById('res-spot-wealth');
  const resSpotNature = document.getElementById('res-spot-nature');
  const resSpotRemedy = document.getElementById('res-spot-remedy');

  function renderHotspots() {
    if (!hotspotsGroup) return;
    hotspotsGroup.innerHTML = '';

    const filtered = MOLE_DATA.filter(m => currentTab === 'all' || m.cat === currentTab || (currentTab === 'camera'));

    filtered.forEach(m => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'mole-hotspot ' + (m.id === activeSpotId ? 'active' : ''));
      g.setAttribute('data-id', m.id);
      g.style.cursor = 'pointer';

      // Outer ripple circle
      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outer.setAttribute('cx', m.x);
      outer.setAttribute('cy', m.y);
      outer.setAttribute('r', '9');
      outer.setAttribute('class', 'hotspot-pulse');

      // Inner solid mole dot
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      inner.setAttribute('cx', m.x);
      inner.setAttribute('cy', m.y);
      inner.setAttribute('r', '4.5');
      inner.setAttribute('class', 'hotspot-dot');

      g.appendChild(outer);
      g.appendChild(inner);

      g.addEventListener('click', () => {
        selectSpot(m.id);
      });

      hotspotsGroup.appendChild(g);
    });
  }

  function renderList(query = '') {
    if (!spotsList) return;
    spotsList.innerHTML = '';

    const q = query.trim().toLowerCase();
    const filtered = SPOTS.filter(m => {
      const matchesTab = (currentTab === 'camera') ? true : (m.cat === currentTab);
      const matchesQuery = !q || m.title.toLowerCase().includes(q) || m.destiny.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });

    if (filtered.length === 0) {
      spotsList.innerHTML = `<p class="muted small p-2">${I18N_MOLES.noMatch || 'No matching spots found. Try searching another term.'}</p>`;
      return;
    }

    filtered.forEach(m => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spot-badge-btn ' + (m.id === activeSpotId ? 'active' : '');
      const pol = m.genderRules[currentGender].polarity;
      const dotColor = pol === 'auspicious' ? 'var(--good, #15803d)' : pol === 'inauspicious' ? 'var(--bad, #b91c1c)' : 'var(--gold, #d97706)';
      
      btn.innerHTML = `<span class="spot-dot" style="background:${dotColor}"></span><span>${m.title}</span>`;
      btn.addEventListener('click', () => {
        selectSpot(m.id);
      });
      spotsList.appendChild(btn);
    });
  }

  function selectSpot(id) {
    activeSpotId = id;
    const m = SPOTS.find(item => item.id === id);
    if (!m) return;

    // Highlight active hotspot in SVG
    if (hotspotsGroup) {
      const allG = hotspotsGroup.querySelectorAll('.mole-hotspot');
      allG.forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-id') === id);
      });
    }

    // Highlight in list
    if (spotsList) {
      const allBtns = spotsList.querySelectorAll('.spot-badge-btn');
      allBtns.forEach(b => {
        b.classList.toggle('active', b.textContent.includes(m.title));
      });
    }

    // Update Result Card
    const rule = m.genderRules[currentGender];
    if (resPolarityTag) {
      resPolarityTag.textContent = rule.tag;
      resPolarityTag.className = 'tag ' + (rule.polarity === 'auspicious' ? 'good' : rule.polarity === 'inauspicious' ? 'bad' : 'gold');
    }
    if (resSpotTitle) resSpotTitle.textContent = m.title;
    if (resSpotSummary) resSpotSummary.textContent = rule.summary;
    if (resSpotDestiny) resSpotDestiny.textContent = m.destiny;
    if (resSpotWealth) resSpotWealth.textContent = m.wealth;
    if (resSpotNature) resSpotNature.textContent = m.nature;
    if (resSpotRemedy) resSpotRemedy.textContent = m.remedy;
    persistReading(id, currentGender);
  }

  let saveTimer = null;
  function persistReading(id, gender) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const m = MOLE_DATA.find(item => item.id === id);
        if (!m) return;
        const rule = m.genderRules[gender];
        let token = null;
        if (window.KG && window.KG.sb && window.KG.sb.auth) {
          const s = (await window.KG.sb.auth.getSession()).data.session;
          if (s && s.access_token) token = s.access_token;
        }
        fetch('/api/divination', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
          body: JSON.stringify({
            kind: 'moles',
            input: { spotId: id, gender },
            result: { title: m.title, polarity: rule.polarity, tag: rule.tag, summary: rule.summary, destiny: m.destiny, wealth: m.wealth }
          })
        }).catch(() => {});
      } catch (e) {}
    }, 600);
  }

  // Event Listeners for Gender Polarity
  if (btnMale) {
    btnMale.addEventListener('click', () => {
      currentGender = 'male';
      btnMale.classList.add('active');
      if (btnFemale) btnFemale.classList.remove('active');
      selectSpot(activeSpotId);
      renderList(searchInput ? searchInput.value : '');
    });
  }

  if (btnFemale) {
    btnFemale.addEventListener('click', () => {
      currentGender = 'female';
      btnFemale.classList.add('active');
      if (btnMale) btnMale.classList.remove('active');
      selectSpot(activeSpotId);
      renderList(searchInput ? searchInput.value : '');
    });
  }

  // Category Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-tab');

      if (currentTab === 'camera') {
        if (interactiveView) interactiveView.style.display = 'none';
        if (cameraView) cameraView.style.display = 'block';
      } else {
        if (interactiveView) interactiveView.style.display = 'block';
        if (cameraView) cameraView.style.display = 'none';
        renderHotspots();
        renderList(searchInput ? searchInput.value : '');
        // Select first item of that tab
        const first = MOLE_DATA.find(m => m.cat === currentTab);
        if (first) selectSpot(first.id);
      }
    });
  });

  // Search Input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      renderList(q);
      const match = MOLE_DATA.find(m => m.title.toLowerCase().includes(q));
      if (match) {
        selectSpot(match.id);
      }
    });
  }

  // Initialize
  renderHotspots();
  renderList();
  selectSpot(activeSpotId);

})();
