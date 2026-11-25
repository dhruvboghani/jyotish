// Swapna Shastra: Vedic Dream Manifestation Timing Calculator & Symbol Explorer
(function () {
  'use strict';

  const PRAHAR_DATA = {
    1: {
      tag: '1st Prahar (6 PM – 9 PM)',
      title: 'Manifestation Window: Within 1 Year',
      desc: 'Occurs during the first watch of sleep. Governed heavily by the residue of daytime sensory impressions and digestion. Its prophetic fruition is gradual and takes roughly 1 full solar year to unfold.',
      badgeClass: 'tag'
    },
    2: {
      tag: '2nd Prahar (9 PM – 12 Midnight)',
      title: 'Manifestation Window: Within 6 to 8 Months',
      desc: 'Occurs during deep nocturnal sleep. Reflects emotional clearing and medium-term psychological shifts. Ancient treatises state the omen typically materializes in 6 to 8 months.',
      badgeClass: 'tag'
    },
    3: {
      tag: '3rd Prahar (12 Midnight – 3 AM)',
      title: 'Manifestation Window: Within 1 to 3 Months',
      desc: 'Occurs when the nervous system enters profound stillness. Astral communications and ancestral impressions are vivid. The dream manifests in approximately 1 to 3 months.',
      badgeClass: 'tag gold'
    },
    4: {
      tag: '4th Prahar / Brahma Muhurta (3 AM – 6 AM)',
      title: 'Manifestation Window: Within 10 Days to Same Day',
      desc: 'Occurs during the sacred ambrosial hours before dawn. The mind is purified by Sattva Guna and divine inspiration. Sages consider dreams in this window highly accurate, unfolding within 10 days to the very same day.',
      badgeClass: 'tag good'
    }
  };

  const DREAM_SYMBOLS = [
    {
      name: 'White Elephant (Airavata)',
      tone: 'shubha',
      meaning: 'Supreme omen of royal honor, sudden elevation in social status, and blessings of Goddess Lakshmi.',
      advice: 'Stay humble and dedicate a portion of upcoming gains to righteous charity.'
    },
    {
      name: 'Crossing a River Safely',
      tone: 'shubha',
      meaning: 'Symbolizes triumph over difficult karmic hurdles, legal disputes, or chronic family dilemmas.',
      advice: 'Proceed with planned ventures confidently; your path has cleared.'
    },
    {
      name: 'Snake (Serpent / Nag Devta)',
      tone: 'shubha',
      meaning: 'In Vedic Shastra, seeing a calm or ascending snake indicates activation of Kundalini prana, ancestral blessings, and unexpected wealth.',
      advice: 'Offer milk or water to a Shiva Lingam on the next Monday.'
    },
    {
      name: 'Drinking Clear River Water',
      tone: 'shubha',
      meaning: 'Indicates profound physical healing, recovery from ailment, and purification of the mind.',
      advice: 'Maintain clean hydration and express gratitude for physical health.'
    },
    {
      name: 'Climbing a High Mountain or Tower',
      tone: 'shubha',
      meaning: 'Signals dramatic rise in career hierarchy, promotions, and triumph over competitors.',
      advice: 'Embrace leadership duties boldly without hesitating.'
    },
    {
      name: 'Temple Bells or Vedic Chanting',
      tone: 'shubha',
      meaning: 'Direct spiritual blessing from the Ishta Devta. Calms wandering thoughts and heralds peace in household.',
      advice: 'Spend quiet moments in prayer or meditation today.'
    },
    {
      name: 'Golden Ornaments or Coins',
      tone: 'shubha',
      meaning: 'Harbinger of commercial windfalls, successful sales, and domestic luxury.',
      advice: 'Save and invest prudently; protect your new prosperity.'
    },
    {
      name: 'Flying Gracefully in Clear Sky',
      tone: 'shubha',
      meaning: 'Mental liberation, freedom from anxieties, and creative expansion of intellect.',
      advice: 'Start the creative or entrepreneurial project you have postponed.'
    },
    {
      name: 'Blossoming Lotus Flower',
      tone: 'shubha',
      meaning: 'Emblem of spiritual enlightenment, Saraswati and Lakshmi blessings, and noble friendships.',
      advice: 'Nourish peaceful thoughts and respect teachers and mentors.'
    },
    {
      name: 'Falling from Height into Darkness',
      tone: 'ashubha',
      meaning: 'Indicates temporary loss of confidence, overextended pride, or insecurity about finances.',
      advice: 'Ground yourself with steady daily routines and review financial commitments.'
    },
    {
      name: 'Muddy or Turbulent Water',
      tone: 'ashubha',
      meaning: 'Warns of emotional confusion, gossip, or unresolved misunderstandings with close relatives.',
      advice: 'Refrain from making impulsive promises or engaging in fiery arguments.'
    },
    {
      name: 'Losing Footwear or Shoes',
      tone: 'ashubha',
      meaning: 'Indicates temporary delays in journeys or anxiety regarding professional footing.',
      advice: 'Verify travel schedules and ensure clarity in office paperwork.'
    },
    {
      name: 'Extinguished Oil Lamp',
      tone: 'ashubha',
      meaning: 'Signals temporary low vitality or lethargy in spiritual routines.',
      advice: 'Light a pure ghee diya in your home sanctuary at sunset.'
    },
    {
      name: 'Teeth Shedding or Falling',
      tone: 'ashubha',
      meaning: 'Classic warning of stress, verbal harshness, or minor health check needed for elderly relatives.',
      advice: 'Speak gently, practice mindfulness, and chant Maha Mrityunjaya Mantra.'
    },
    {
      name: 'Mirror Shattering',
      tone: 'ashubha',
      meaning: 'Dissolution of false illusions, shedding outdated self-images or ego illusions.',
      advice: 'Accept transitions with grace; a higher truth is emerging.'
    }
  ];

  // DOM Elements
  const praharBtns = document.querySelectorAll('#prahar-group .prahar-btn');
  const bannerTag = document.getElementById('banner-tag');
  const bannerTitle = document.getElementById('banner-title');
  const bannerDesc = document.getElementById('banner-desc');
  const searchInput = document.getElementById('dream-search');
  const filterPills = document.querySelectorAll('#dream-filter-pills .pill');
  const dreamsGrid = document.getElementById('dreams-cards-grid');

  let currentPrahar = 4;
  let currentFilter = 'all';

  function updatePraharBanner(p) {
    const data = PRAHAR_DATA[p];
    if (!data) return;

    praharBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-prahar') === String(p));
    });

    if (bannerTag) {
      bannerTag.textContent = data.tag;
      bannerTag.className = data.badgeClass;
    }
    if (bannerTitle) bannerTitle.textContent = data.title;
    if (bannerDesc) bannerDesc.textContent = data.desc;
  }

  function renderDreams() {
    if (!dreamsGrid) return;
    dreamsGrid.innerHTML = '';

    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = DREAM_SYMBOLS.filter(item => {
      const matchesFilter = (currentFilter === 'all') || (item.tone === currentFilter);
      const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.meaning.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });

    if (filtered.length === 0) {
      dreamsGrid.innerHTML = '<p class="muted small p-2">No matching symbols found. Try searching for "water", "snake", "elephant", or "temple".</p>';
      return;
    }

    filtered.forEach(d => {
      const card = document.createElement('div');
      card.className = 'card dream-symbol-card';
      const isGood = d.tone === 'shubha';
      card.innerHTML = `
        <div class="symbol-header">
          <span class="tag ${isGood ? 'good' : 'bad'}">${isGood ? '🌟 Auspicious (Shubha)' : '⚠️ Caution (Ashubha)'}</span>
          <h4>${d.name}</h4>
        </div>
        <p class="prose-text mt-1">${d.meaning}</p>
        <div class="advice-box mt-2">
          <span class="small font-bold">Vedic Guidance:</span>
          <p class="small muted">${d.advice}</p>
        </div>
      `;
      dreamsGrid.appendChild(card);
    });
  }

  praharBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.getAttribute('data-prahar'), 10);
      currentPrahar = p;
      updatePraharBanner(p);
    });
  });

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      renderDreams();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderDreams();
    });
  }

  // Initialize
  updatePraharBanner(4);
  renderDreams();

})();
