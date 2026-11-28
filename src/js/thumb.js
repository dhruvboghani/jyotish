// Nadi Jyotish: Angustha Rekha Thumbprint Analysis
(function () {
  'use strict';

  const NADI_DATA = {
    chakra: {
      tag: 'Chakra Archetype (Sovereign Leader)',
      title: 'Chakra (Concentric Whorl) — Sovereign Leader',
      subtitle: 'Governed by Surya (Sun) & Lord Maha Vishnu. Marked by independent authority, self-earned wealth, and magnetic willpower.',
      kandam: 'Associated with the Podhu Kandam (General Chapter) and Arasiyal Kandam (Governance Chapter). Predicts notable social stature and executive leadership.',
      graha: 'Governed by Surya (Sun) and Maha Vishnu. Channeling truth, nobility, and high executive stamina.',
      strengths: 'Natural decision-maker who dislikes subservience. Succeeds when leading enterprises, governing teams, and creating original systems.',
      remedies: 'Offer water (Arghya) to the rising sun, chant the Vishnu Sahasranama or Gayatri Mantra, and donate grain on Sundays.'
    },
    shankha: {
      tag: 'Shankha Archetype (Creative Visionary)',
      title: 'Shankha (Sacred Conch Loop) — Eloquent Empath',
      subtitle: 'Governed by Chandra (Moon) & Lord Varuna. Marked by poetic speech, emotional intelligence, aesthetic gifts, and peaceful charisma.',
      kandam: 'Associated with the Kalathira Kandam (Marital Harmony Chapter) and Gnana Kandam (Wisdom Chapter). Predicts fulfilling relationships and foreign travels.',
      graha: 'Governed by Chandra (Moon) and Goddess Saraswati. Fostering intuitive harmony and linguistic grace.',
      strengths: 'Gifted communicator, empathetic counselor, writer, designer, or international negotiator. Resolves disputes effortlessly.',
      remedies: 'Keep drinking water in silver vessels, chant Om Namah Shivaya on Mondays, and honor maternal elders.'
    },
    dhwaja: {
      tag: 'Dhwaja Archetype (Warrior Builder)',
      title: 'Dhwaja (Ascending Flag / Arch) — Tenacious Victor',
      subtitle: 'Governed by Mangala (Mars) & Lord Kartikeya. Marked by unyielding grit, technical competence, and dramatic rise after age 28.',
      kandam: 'Associated with the Thozhil Kandam (Career & Enterprise Chapter) and Shatru Kandam (Victory over Rivals Chapter). Predicts triumph over difficult early circumstances.',
      graha: 'Governed by Mangala (Mars) and Lord Muruga / Kartikeya. Channeling valor, discipline, and endurance.',
      strengths: 'Thrives in engineering, defence, entrepreneurship, construction, and high-pressure turnarounds. Never surrenders.',
      remedies: 'Recite Hanuman Chalisa on Tuesdays, donate red lentils (masoor dal), and maintain physical fitness.'
    },
    gadha: {
      tag: 'Gadha Archetype (Philosopher Diplomat)',
      title: 'Gadha (Twin Loop / Sacred Mace) — Strategic Mastermind',
      subtitle: 'Governed by Guru (Jupiter) & Budha (Mercury). Marked by versatile intelligence, dual mastery of trade and spirituality, and deep wisdom.',
      kandam: 'Associated with the Dhana Kandam (Wealth Accumulation Chapter) and Guru Kandam (Spiritual Master Chapter). Predicts substantial wealth and advisory respect.',
      graha: 'Governed by Brihaspati (Jupiter) and Budha (Mercury). Synthesis of commercial shrewdness and moral philosophy.',
      strengths: 'Mastery in strategic consulting, financial trading, legal architecture, scholarly publishing, and educational leadership.',
      remedies: 'Apply saffron tilak on the forehead, chant Guru Mantra (Om Brim Brihaspataye Namah), and support student education.'
    }
  };

  const patternCards = document.querySelectorAll('.pattern-card');
  const resTag = document.getElementById('res-nadi-tag');
  const resTitle = document.getElementById('res-nadi-title');
  const resSubtitle = document.getElementById('res-nadi-subtitle');
  const resKandam = document.getElementById('res-nadi-kandam');
  const resGraha = document.getElementById('res-nadi-graha');
  const resStrengths = document.getElementById('res-nadi-strengths');
  const resRemedies = document.getElementById('res-nadi-remedies');
  const fileInput = document.getElementById('thumb-file-input');

  const I18N_THUMB = (window.I18N && window.I18N.thumb) || {};
  const DATA = I18N_THUMB.data || NADI_DATA;

  function selectArchetype(key) {
    const data = DATA[key] || NADI_DATA[key];
    if (!data) return;

    patternCards.forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-type') === key);
    });

    if (resTag) resTag.textContent = data.tag;
    if (resTitle) resTitle.textContent = data.title;
    if (resSubtitle) resSubtitle.textContent = data.subtitle;
    if (resKandam) resKandam.innerHTML = data.kandam;
    if (resGraha) resGraha.innerHTML = data.graha;
    if (resStrengths) resStrengths.textContent = data.strengths;
    if (resRemedies) resRemedies.textContent = data.remedies;
    persistReading(key, data);
  }

  let saveTimer = null;
  function persistReading(key, data) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
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
            kind: 'thumb',
            input: { pattern: key },
            result: { tag: data.tag, title: data.title, subtitle: data.subtitle, strengths: data.strengths }
          })
        }).catch(() => {});
      } catch (e) {}
    }, 600);
  }

  patternCards.forEach(c => {
    c.addEventListener('click', () => {
      const type = c.getAttribute('data-type');
      selectArchetype(type);
    });
  });

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      // Upon macro photo upload, prompt user to confirm closest pattern
      alert(I18N_THUMB.photoAlert || 'Photo loaded. Please verify if your central ridge pattern matches Chakra (whorl) or Shankha (loop) from the cards above.');
    });
  }

  // Initialize with Chakra
  selectArchetype('chakra');

})();
