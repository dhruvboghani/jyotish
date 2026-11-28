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

  const I18N_FOOT = (window.I18N && window.I18N.foot) || {};

  function updateReading() {
    const arches = I18N_FOOT.arches || {};
    const toes = I18N_FOOT.toes || {};
    const signs = I18N_FOOT.signs || {};
    const a = arches[currentArch] || {};
    const t = toes[currentToe] || {};

    let tag = a.tag || (currentArch === 'high' ? 'Deva Pada' : currentArch === 'medium' ? 'Manushya Pada' : 'Bhumi Pada');
    let title = a.title || (currentArch === 'high' ? 'Independent Visionary' : currentArch === 'medium' ? 'Prosperous & Pragmatic Architect' : 'Grounded & Steadfast Realist');
    let summary = a.summary || '';
    let travel = a.travel || '';
    let nature = a.nature || '';
    let career = t.career || '';
    let remedy = '';

    if (t.tagSuffix) tag += ' ' + t.tagSuffix;
    if (t.titleSuffix) title += ' ' + t.titleSuffix;
    if (t.summaryExtra) summary += ' ' + t.summaryExtra;

    const selectedSigns = Array.from(signInputs).filter(i => i.checked).map(i => i.value);
    for (const s of selectedSigns) {
      if (signs[s] && signs[s].note) remedy += signs[s].note + ' ';
    }
    remedy += I18N_FOOT.habit || 'Vedic Habit: Practice evening foot massage with warm sesame or mustard oil (Pada Abhyanga) for deep relaxation and grounding.';

    if (resTag) resTag.textContent = tag;
    if (resTitle) resTitle.textContent = title;
    if (resSummary) resSummary.textContent = summary;
    if (resTravel) resTravel.textContent = travel;
    if (resCareer) resCareer.textContent = career;
    if (resNature) resNature.textContent = nature;
    if (resRemedy) resRemedy.textContent = remedy;
    persistReading();
  }

  let saveTimer = null;
  function persistReading() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        const selectedSigns = Array.from(signInputs).filter(i => i.checked).map(i => i.value);
        let token = null;
        if (window.KG && window.KG.sb && window.KG.sb.auth) {
          const s = (await window.KG.sb.auth.getSession()).data.session;
          if (s && s.access_token) token = s.access_token;
        }
        fetch('/api/divination', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
          body: JSON.stringify({
            kind: 'foot',
            input: { arch: currentArch, toe: currentToe, signs: selectedSigns },
            result: { tag: resTag ? resTag.textContent : '', title: resTitle ? resTitle.textContent : '' }
          })
        }).catch(() => {});
      } catch (e) {}
    }, 600);
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
      alert(I18N_FOOT.photoAlert || 'Sole photo loaded. Review and confirm your matching arch type and toe proportions above.');
    });
  }

  // Initialize
  updateReading();

})();
