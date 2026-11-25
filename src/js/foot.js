// Pāda Samudrika Shastra: Vedic Sole & Foot Reading Analyzer
(function () {
  'use strict';

  const archBtns = document.querySelectorAll('#arch-group .pill-btn');
  const toeBtns = document.querySelectorAll('#toe-group .pill-btn');
  const signInputs = document.querySelectorAll('#signs-group input[type="checkbox"]');
  const fileInput = document.getElementById('foot-file-input');

  const resTag = document.getElementById('res-foot-tag');
  const resTitle = document.getElementById('res-foot-title');
  const resSummary = document.getElementById('res-foot-summary');
  const resTravel = document.getElementById('res-foot-travel');
  const resCareer = document.getElementById('res-foot-career');
  const resNature = document.getElementById('res-foot-nature');
  const resRemedy = document.getElementById('res-foot-remedy');

  let currentArch = 'high';
  let currentToe = 'second';

  function updateReading() {
    let tag = '';
    let title = '';
    let summary = '';
    let travel = '';
    let career = '';
    let nature = '';
    let remedy = '';

    // Arch logic
    if (currentArch === 'high') {
      tag = 'Deva Pada';
      title = 'Independent Visionary';
      summary = 'A high sole arch denotes spiritual refinement, light-footed agility, and high self-reliance.';
      travel = 'Promotes distant travel, international opportunities, and flourishing outside the birthplace.';
      nature = 'Idealistic, private, intellectual, and driven by personal convictions.';
    } else if (currentArch === 'medium') {
      tag = 'Manushya Pada';
      title = 'Prosperous & Pragmatic Architect';
      summary = 'A balanced sole arch represents harmony of Earth and Water elements, granting strong domestic happiness and steady investments.';
      travel = 'Comfortable transit and steady domestic prosperity with well-planned journeys.';
      nature = 'Warm, balanced, cooperative, and family-oriented.';
    } else {
      tag = 'Bhumi Pada';
      title = 'Grounded & Steadfast Realist';
      summary = 'A grounded arch signifies immense physical stamina, unwavering loyalty, and practical mastery of real-world skills.';
      travel = 'Builds profound roots and prosperity in home region; travels when purposeful.';
      nature = 'Dependable, patient, hardworking, and deeply trustworthy.';
    }

    // Toe logic
    if (currentToe === 'second') {
      tag += ' · Agni Dominance';
      title += ' & Dynamic Leader';
      summary += ' Second toe longer than big toe channels high Agni (Fire element), bestowing natural executive command.';
      career = 'Excels when leading organizations, heading projects, or founding independent enterprises.';
    } else if (currentToe === 'big') {
      tag += ' · Prithvi Dominance';
      title += ' & Wealth Accumulator';
      summary += ' A dominant big toe represents Prithvi (Earth element), bestowing patient accumulation of gold, lands, and assets.';
      career = 'Excels in financial planning, real estate, administrative stability, and advisory positions.';
    } else {
      tag += ' · Vayu Dominance';
      title += ' & Diplomatic Sage';
      summary += ' Evenly proportioned toes represent Vayu (Air element), granting adaptability, linguistic fluency, and diplomacy.';
      career = 'Excels in law, writing, diplomacy, counseling, and commercial negotiation.';
    }

    // Signs logic
    const selectedSigns = Array.from(signInputs).filter(i => i.checked).map(i => i.value);
    if (selectedSigns.includes('lotus')) {
      remedy += 'Lotus Mark: Auspicious blessing of Goddess Lakshmi granting noble honor. ';
    }
    if (selectedSigns.includes('fish')) {
      remedy += 'Fish Mark: Sign of deep ocean wisdom and financial windfalls. ';
    }
    if (selectedSigns.includes('conch')) {
      remedy += 'Conch Mark: Bestows eloquence and spiritual knowledge. ';
    }
    if (selectedSigns.includes('trident')) {
      remedy += 'Trident Mark: Confers divine courage against obstacles. ';
    }
    remedy += 'Vedic Habit: Practice evening foot massage with warm sesame or mustard oil (Pada Abhyanga) for deep relaxation and grounding.';

    if (resTag) resTag.textContent = tag;
    if (resTitle) resTitle.textContent = title;
    if (resSummary) resSummary.textContent = summary;
    if (resTravel) resTravel.textContent = travel;
    if (resCareer) resCareer.textContent = career;
    if (resNature) resNature.textContent = nature;
    if (resRemedy) resRemedy.textContent = remedy;
  }

  archBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      archBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentArch = btn.getAttribute('data-arch');
      updateReading();
    });
  });

  toeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentToe = btn.getAttribute('data-toe');
      updateReading();
    });
  });

  signInputs.forEach(input => {
    input.addEventListener('change', updateReading);
  });

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      alert('Sole photo loaded. Review and confirm your matching arch type and toe proportions above.');
    });
  }

  // Initialize
  updateReading();

})();
