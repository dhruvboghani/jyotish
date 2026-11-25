// Netra Samudrika Shastra: Vedic Eye Archetype Analyzer
(function () {
  'use strict';

  const EYE_DATA = {
    kamala: {
      tag: 'Kamala Netra Archetype',
      title: 'Kamala Netra (Lotus Eyes) — Spiritual Royalty',
      subtitle: 'Associated with Vishnu and Lakshmi. Reflects noble integrity, pure aesthetic discernment, and high spiritual merit from past lives.',
      soul: 'Natural dignity, calm in adversity, highly ethical, and allergic to deception. Radiates reassuring warmth to others.',
      career: 'Flourishes in law, advisory councils, creative diplomacy, spiritual guidance, and ethical leadership.',
      love: 'Deeply devoted and loyal partner. Seeks soul connection rather than superficial glamour.',
      remedy: 'Practice early morning Trataka (gazing at a pure ghee lamp flame) or rising sun for 3 minutes to enhance solar prana and eye luster.'
    },
    mriga: {
      tag: 'Mriga Netra Archetype',
      title: 'Mriga Netra (Deer Eyes) — Artistic & Gentle Intuitive',
      subtitle: 'Governed by Chandra (Moon) & Shukra (Venus). Large, expressive, luminous eyes radiating innocence, sensitivity, and artistic wonder.',
      soul: 'High empathy, deeply romantic, highly intuitive, and emotionally receptive. Easily moved by music, nature, and poetry.',
      career: 'Excel in literature, acting, music, architecture, healing therapies, and diplomacy.',
      love: 'Cherishes emotional safety, tender communication, and loyal lifelong companionship.',
      remedy: 'Apply pure organic rosewater drops to eyes before sleep to pacify excess mental heat and nourish lunar calm.'
    },
    matsya: {
      tag: 'Matsya Netra Archetype',
      title: 'Matsya Netra (Fish Eyes) — Sharp Commercial Strategist',
      subtitle: 'Governed by Budha (Mercury) & Lord Varuna. Sleek, alert, and observant eyes that notice subtle opportunities instantly.',
      soul: 'Quick-witted, agile thinker, adaptable, and pragmatic. Values economic independence and intellectual sharpness.',
      career: 'Outstanding in trade, finance, software development, data analytics, and commercial management.',
      love: 'Values intellectual banter, equal partnership, and shared financial goals.',
      remedy: 'Consume soaked almonds with milk and practice deep rhythmic breathing to keep nervous currents balanced.'
    },
    garuda: {
      tag: 'Garuda Netra Archetype',
      title: 'Garuda Netra (Eagle Eyes) — Fearless Executive Strategist',
      subtitle: 'Governed by Surya (Sun) & Mangala (Mars). Piercing, commanding, and resolute gaze that penetrates beneath surfaces.',
      soul: 'Courageous, protective, intensely focused, and natural commander. Dislikes ambiguity and indecisiveness.',
      career: 'Excels in executive management, defense, civil leadership, competitive enterprise, and pioneering research.',
      love: 'Fiercely loyal, protective guardian of family, expects honesty and mutual respect.',
      remedy: 'Splash face with cool water upon waking, practice Surya Namaskar at dawn, and avoid excessive sour or spicy food.'
    },
    gaja: {
      tag: 'Gaja Netra Archetype',
      title: 'Gaja Netra (Elephant Eyes) — Patient Sage & Anchor',
      subtitle: 'Governed by Brihaspati (Jupiter) & Lord Ganesha. Serene, wise, and contemplative gaze with encyclopedic memory.',
      soul: 'Unflappable patience, profound wisdom, generous heart, and emotional stability. The calm anchor in family storms.',
      career: 'Superb in education, legal arbitration, long-term investments, historical scholarship, and mentoring.',
      love: 'Steadfast rock for partner, patient listener, and devoted family patriarch / matriarch.',
      remedy: 'Chant Om Gam Ganapataye Namah on Wednesdays and maintain clean, well-lit reading spaces.'
    }
  };

  const cards = document.querySelectorAll('.archetype-card');
  const resTag = document.getElementById('res-eye-tag');
  const resTitle = document.getElementById('res-eye-title');
  const resSubtitle = document.getElementById('res-eye-subtitle');
  const resSoul = document.getElementById('res-eye-soul');
  const resCareer = document.getElementById('res-eye-career');
  const resLove = document.getElementById('res-eye-love');
  const resRemedy = document.getElementById('res-eye-remedy');
  const fileInput = document.getElementById('eye-file-input');

  function selectArchetype(key) {
    const data = EYE_DATA[key];
    if (!data) return;

    cards.forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-archetype') === key);
    });

    if (resTag) resTag.textContent = data.tag;
    if (resTitle) resTitle.textContent = data.title;
    if (resSubtitle) resSubtitle.textContent = data.subtitle;
    if (resSoul) resSoul.textContent = data.soul;
    if (resCareer) resCareer.textContent = data.career;
    if (resLove) resLove.textContent = data.love;
    if (resRemedy) resRemedy.textContent = data.remedy;
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
            kind: 'eye',
            input: { archetype: key },
            result: { tag: data.tag, title: data.title, soul: data.soul, career: data.career }
          })
        }).catch(() => {});
      } catch (e) {}
    }, 600);
  }

  cards.forEach(c => {
    c.addEventListener('click', () => {
      const type = c.getAttribute('data-archetype');
      selectArchetype(type);
    });
  });

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      alert('Eye photo loaded. Compare your eye contours with the 5 sacred archetypes above.');
    });
  }

  // Initialize
  selectArchetype('kamala');

})();
