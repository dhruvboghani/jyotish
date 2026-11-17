/* YouTube Shorts content & caption generator for Grahavani.
   Generates optimized video card data, YouTube titles, descriptions and hashtags for:
   1. Single Rashi Deep-Dive (yt_sign)
   2. Planetary Transits & Shani Sade Sati (yt_transit)
   3. Kundali 36 Guna Milan & Compatibility (yt_match)
   4. Lucky Gemstones, Rudraksha & Remedies (yt_gem) */
const J = require('./engine.js');
const R = require('./rashifal.js');
const M = require('./match.js');
const G = require('./gems.js');
const S = require('./site.js');
const { translator } = require('./i18n-server.js');

const SIGNS_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const SIGNS_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
const DEITIES = {
  Sun: { en: 'Surya Dev / Gayatri Mata', hi: 'सूर्य देव / गायत्री माता' },
  Moon: { en: 'Lord Shiva', hi: 'भगवान शिव' },
  Mars: { en: 'Lord Hanuman / Kartikeya', hi: 'हनुमान जी / कार्तिकेय' },
  Mercury: { en: 'Lord Ganesha / Vishnu', hi: 'गणेश जी / भगवान विष्णु' },
  Jupiter: { en: 'Lord Vishnu / Brihaspati', hi: 'भगवान विष्णु / बृहस्पति' },
  Venus: { en: 'Maa Lakshmi / Shukra Dev', hi: 'माँ लक्ष्मी / शुक्र देव' },
  Saturn: { en: 'Lord Shani / Hanuman Ji', hi: 'शनि देव / हनुमान जी' },
  Rahu: { en: 'Maa Saraswati / Bhairav', hi: 'माँ सरस्वती / भैरव जी' },
  Ketu: { en: 'Lord Ganesha', hi: 'भगवान गणेश' }
};

const MANTRAS = {
  Sun: 'ॐ ह्रीं ह्रीं सूर्याय नमः',
  Moon: 'ॐ सों सोमाय नमः',
  Mars: 'ॐ क्रां क्रीं क्रौं सः भौमाय नमः',
  Mercury: 'ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः',
  Jupiter: 'ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः',
  Venus: 'ॐ द्रां द्रीं द्रौं सः शुक्राय नमः',
  Saturn: 'ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः',
  Rahu: 'ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः',
  Ketu: 'ॐ स्रां स्रीं स्रौं सः केतवे नमः'
};

const WEAR_RULES = {
  Sun: { day: { en: 'Sunday morning', hi: 'रविवार प्रातः' }, metal: { en: 'Gold / Copper', hi: 'सोना / तांबा' }, finger: { en: 'Ring finger', hi: 'अनामिका अंगुली' } },
  Moon: { day: { en: 'Monday evening', hi: 'सोमवार संध्या' }, metal: { en: 'Silver', hi: 'चांदी' }, finger: { en: 'Little finger', hi: 'कनिष्ठिका अंगुली' } },
  Mars: { day: { en: 'Tuesday morning', hi: 'मंगलवार प्रातः' }, metal: { en: 'Gold / Copper', hi: 'सोना / तांबा' }, finger: { en: 'Ring finger', hi: 'अनामिका अंगुली' } },
  Mercury: { day: { en: 'Wednesday morning', hi: 'बुधवार प्रातः' }, metal: { en: 'Gold / Bronze', hi: 'सोना / कांसा' }, finger: { en: 'Little finger', hi: 'कनिष्ठिका अंगुली' } },
  Jupiter: { day: { en: 'Thursday morning', hi: 'गुरुवार प्रातः' }, metal: { en: 'Gold / Panchdhatu', hi: 'सोना / पंचधातु' }, finger: { en: 'Index finger', hi: 'तर्जनी अंगुली' } },
  Venus: { day: { en: 'Friday morning', hi: 'शुक्रवार प्रातः' }, metal: { en: 'Platinum / Silver', hi: 'प्लैटिनम / चांदी' }, finger: { en: 'Middle / Little finger', hi: 'मध्यमा / कनिष्ठिका' } },
  Saturn: { day: { en: 'Saturday evening', hi: 'शनिवार संध्या' }, metal: { en: 'Iron / Panchdhatu', hi: 'लोहा / पंचधातु' }, finger: { en: 'Middle finger', hi: 'मध्यमा अंगुली' } },
  Rahu: { day: { en: 'Saturday night', hi: 'शनिवार रात्रि' }, metal: { en: 'Silver / Ashtadhatu', hi: 'चांदी / अष्टधातु' }, finger: { en: 'Middle finger', hi: 'मध्यमा अंगुली' } },
  Ketu: { day: { en: 'Tuesday / Thursday', hi: 'मंगल / गुरुवार' }, metal: { en: 'Silver / Gold', hi: 'चांदी / सोना' }, finger: { en: 'Ring finger', hi: 'अनामिका अंगुली' } }
};

// Saturn transit calculations for given date
function saturnTransit(dateMs = Date.now()) {
  const jd = dateMs / 86400000 + 2440587.5;
  const tr = J.transit(jd);
  const satSign = Math.floor(tr.lon.Saturn / 30);
  const jupSign = Math.floor(tr.lon.Jupiter / 30);
  const sade = {
    rising: (satSign + 1) % 12,
    peak: satSign,
    setting: (satSign + 11) % 12
  };
  const dhaiya = {
    kantaka: (satSign + 3) % 12, // 4th from Saturn
    ashtama: (satSign + 7) % 12  // 8th from Saturn
  };
  const benefic = [(satSign + 2) % 12, (satSign + 5) % 12, (satSign + 10) % 12]; // 3rd, 6th, 11th
  return { satSign, jupSign, sade, dhaiya, benefic };
}

// 1. Single Rashi Deep Dive Short
function signShort(signIdx = 0, lang = 'en', date = { y: 2026, m: 11, d: 17 }) {
  const { t, L } = translator(lang);
  const sIdx = Math.min(11, Math.max(0, +signIdx || 0));
  const sName = L('names.rashi')[sIdx];
  const sLord = J.SIGN_LORD[sIdx];
  const lordName = L('names.graha')[sLord];
  const ms = Date.UTC(date.y, date.m - 1, date.d, 0, 30);
  const data = R.forDate(ms);
  const s = data.signs[sIdx] || { stars: 3, area: { career: 3, money: 3, love: 3, health: 3 } };
  const dStr = `${date.d}-${date.m}-${date.y}`;
  const enName = SIGNS_EN[sIdx];

  const title = lang === 'hi'
    ? `♈ ${sName} राशिफल (${dStr}): आज किस्मत चमकेगी या सावधानी बरतें? #Shorts`
    : `♈ ${enName} Horoscope Today (${dStr}): Big Shift Ahead? #Shorts`;

  const desc = [
    lang === 'hi' ? `✨ ${sName} दैनिक राशिफल — ${dStr}` : `✨ ${enName} Moon Sign Daily Predictions — ${dStr}`,
    '',
    `⭐ ${lang === 'hi' ? 'कुल रेटिंग' : 'Overall Rating'}: ${'★'.repeat(s.stars)}${'☆'.repeat(5 - s.stars)}`,
    s.chandrashtama ? (lang === 'hi' ? '⚠️ सावधान: आज चंद्राष्टम है (महत्वपूर्ण निर्णय टालें)' : '⚠️ Warning: Chandrashtama day (take care)') : (lang === 'hi' ? '✅ शुभ दिन: कार्यों में सफलता' : '✅ Favourable conditions'),
    '',
    `💼 ${t('rf.area.career')}: ${'★'.repeat(s.area.career)}/5`,
    `💰 ${t('rf.area.money')}: ${'★'.repeat(s.area.money)}/5`,
    `❤️ ${t('rf.area.love')}: ${'★'.repeat(s.area.love)}/5`,
    `🌿 ${t('rf.area.health')}: ${'★'.repeat(s.area.health)}/5`,
    '',
    `🪐 ${lang === 'hi' ? 'राशि स्वामी' : 'Sign Lord'}: ${lordName}`,
    `🪔 ${lang === 'hi' ? 'आज का मंत्र' : "Today's Mantra"}: ${MANTRAS[sLord]}`,
    '',
    `👉 Free detailed Kundali & predictions: ${S.SITE_URL}/`,
    '',
    `#Shorts #YouTubeShorts #${enName} #HoroscopeToday #Astrology #Grahavani #Rashifal`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #${enName} #HoroscopeToday #Astrology #Grahavani` };
}

// 2. Planetary Transit / Shani Sade Sati Short
function transitShort(planet = 'Saturn', lang = 'en', date = { y: 2026, m: 11, d: 17 }) {
  const { t, L } = translator(lang);
  const ms = Date.UTC(date.y, date.m - 1, date.d);
  const tr = saturnTransit(ms);
  const rn = i => L('names.rashi')[i];
  const enR = i => SIGNS_EN[i];

  const sadeNames = [rn(tr.sade.rising), rn(tr.sade.peak), rn(tr.sade.setting)].join(', ');
  const dhaiyaNames = [rn(tr.dhaiya.kantaka), rn(tr.dhaiya.ashtama)].join(', ');
  const benNames = tr.benefic.map(rn).join(', ');

  const title = lang === 'hi'
    ? `🪐 शनि साढ़े साती एवं ढैय्या अलर्ट: क्या आपकी राशि पर भारी है शनि का असर? #Shorts`
    : `🪐 Saturn Sade Sati & Dhaiya Alert: Which Signs Face the Impact? #Shorts`;

  const desc = [
    lang === 'hi' ? '🪐 शनि गोचर एवं साढ़े साती प्रभाव' : '🪐 Saturn Gochar & Sade Sati Timeline',
    '',
    `⚠️ ${lang === 'hi' ? 'साढ़े साती वाली राशियाँ' : 'Sade Sati Signs'}: ${sadeNames}`,
    `⚡ ${lang === 'hi' ? 'शनि ढैय्या वाली राशियाँ' : 'Shani Dhaiya Signs'}: ${dhaiyaNames}`,
    `🌟 ${lang === 'hi' ? 'शुभ गोचर (लाभकारी राशियाँ)' : 'Auspicious Transit Signs'}: ${benNames}`,
    '',
    lang === 'hi' ? '🛡️ शनि दोष निवारण के 3 महा-उपाय:' : '🛡️ Top 3 Remedies for Saturn Relief:',
    '1. 📖 ' + (lang === 'hi' ? 'नित्य हनुमान चालीसा का पाठ करें।' : 'Chant Hanuman Chalisa daily.'),
    '2. 🪔 ' + (lang === 'hi' ? 'शनिवार को पीपल वृक्ष के नीचे सरसों तेल का दीपक जलाएं।' : 'Light a mustard oil lamp under Peepal tree on Saturdays.'),
    '3. 🕉️ ' + (lang === 'hi' ? 'शनि बीज मंत्र: ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः' : 'Shani Beej Mantra: Om Sham Shanaicharaya Namah (108x).'),
    '',
    `👉 Complete transit report & remedies: ${S.SITE_URL}/`,
    '',
    `#Shorts #YouTubeShorts #ShaniSadeSati #SaturnTransit #Astrology #Grahavani #Jyotish`
  ].join('\n');

  return { title, description: desc, tags: '#Shorts #YouTubeShorts #ShaniSadeSati #SaturnTransit #Astrology #Grahavani' };
}

// 3. Kundali Matching & Guna Milan Short
function matchShort(bSign = 0, gSign = 4, lang = 'en') {
  const { t, L } = translator(lang);
  const bs = Math.min(11, Math.max(0, +bSign || 0));
  const gs = Math.min(11, Math.max(0, +gSign || 0));
  const bName = L('names.rashi')[bs], gName = L('names.rashi')[gs];
  const bEn = SIGNS_EN[bs], gEn = SIGNS_EN[gs];

  const B = { sign: bs, nak: bs * 2 + 1, deg: 10, lord: J.SIGN_LORD[bs], av: M.avFor(bs, bs * 2 + 1, 10) };
  const G_data = { sign: gs, nak: gs * 2 + 1, deg: 10, lord: J.SIGN_LORD[gs], av: M.avFor(gs, gs * 2 + 1, 10) };
  const kootas = M.kootas(B, G_data);
  const total = kootas.reduce((s, x) => s + x.score, 0);

  const verdict = total >= 28
    ? (lang === 'hi' ? 'उत्तम मिलान (वैवाहिक जीवन बहुत सुखद रहेगा)' : 'Excellent Match (Highly Auspicious)')
    : total >= 18
      ? (lang === 'hi' ? 'मध्यम मिलान (विवाह के लिए उपयुक्त)' : 'Good Match (Acceptable Compatibility)')
      : (lang === 'hi' ? 'अशुभ मिलान (दोष निवारण आवश्यक)' : 'Low Match (Astrological Remedies Needed)');

  const title = lang === 'hi'
    ? `💍 ${bName} + ${gName} कुंडली मिलान: कितने गुण मिलते हैं? #Shorts`
    : `💍 ${bEn} + ${gEn} Marriage Compatibility: 36 Guna Milan #Shorts`;

  const desc = [
    `💍 ${bName} (${bEn}) + ${gName} (${gEn}) ${lang === 'hi' ? 'अष्टकूट गुण मिलान' : 'Ashtakoot Guna Milan'}`,
    '',
    `📊 ${lang === 'hi' ? 'कुल गुण' : 'Total Score'}: ${total} / 36`,
    `✨ ${lang === 'hi' ? 'परिणाम' : 'Verdict'}: ${verdict}`,
    '',
    kootas.map(k => `• ${t('kt.' + k.id + '.name')}: ${k.score} / ${k.max}`).join('\n'),
    '',
    lang === 'hi'
      ? '💡 ध्यान दें: 18 से अधिक गुण शुभ माने जाते हैं। नाड़ी व भकूट दोष का विशेष विचार आवश्यक होता है।'
      : '💡 Note: 18+ points is acceptable, 28+ is ideal. Nadi & Bhakoot exceptions should be examined.',
    '',
    `👉 Free full Kundali Matching & Manglik check: ${S.SITE_URL}/matching/`,
    '',
    `#Shorts #YouTubeShorts #KundaliMatching #GunaMilan #${bEn} #${gEn} #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #KundaliMatching #GunaMilan #${bEn} #${gEn} #Grahavani` };
}

// 4. Lucky Gemstones & Remedies Short
function gemShort(signIdx = 0, lang = 'en') {
  const { t, L } = translator(lang);
  const sIdx = Math.min(11, Math.max(0, +signIdx || 0));
  const sName = L('names.rashi')[sIdx];
  const sEn = SIGNS_EN[sIdx];
  const sLord = J.SIGN_LORD[sIdx];
  const lordName = L('names.graha')[sLord];

  const lifeGem = G.GEM[sLord];
  const bhagyaLord = J.SIGN_LORD[(sIdx + 8) % 12];
  const bhagyaGem = G.GEM[bhagyaLord];

  const lifeGemName = t('gm.g.' + lifeGem);
  const bhagyaGemName = t('gm.g.' + bhagyaGem);
  const rules = WEAR_RULES[sLord] || WEAR_RULES.Mars;

  const title = lang === 'hi'
    ? `💎 ${sName} राशि का भाग्यशाली रत्न: कौन सा रत्न चमकाएगा आपकी किस्मत? #Shorts`
    : `💎 Lucky Gemstone for ${sEn}: Attract Wealth & Success! #Shorts`;

  const desc = [
    `💎 ${sName} (${sEn}) — ${lang === 'hi' ? 'भाग्य रत्न एवं धारण विधि' : 'Lucky Gemstones & Wearing Guide'}`,
    '',
    `🪐 ${lang === 'hi' ? 'राशि स्वामी' : 'Sign Lord'}: ${lordName}`,
    `🛡️ ${lang === 'hi' ? 'जीवन रत्न (आरोग्य एवं आत्मविश्वास)' : 'Life Stone (Health & Vitality)'}: ${lifeGemName}`,
    `🌟 ${lang === 'hi' ? 'भाग्य रत्न (धन, करियर एवं भाग्य)' : 'Fortune Stone (Luck & Prosperity)'}: ${bhagyaGemName}`,
    '',
    lang === 'hi' ? '📜 धारण करने की प्रामाणिक विधि:' : '📜 Authentic Wearing Method:',
    `• ${lang === 'hi' ? 'शुभ दिन' : 'Auspicious Day'}: ${rules.day[lang] || rules.day.en}`,
    `• ${lang === 'hi' ? 'धातु' : 'Metal'}: ${rules.metal[lang] || rules.metal.en}`,
    `• ${lang === 'hi' ? 'अंगुली' : 'Finger'}: ${rules.finger[lang] || rules.finger.en}`,
    `• ${lang === 'hi' ? 'बीज मंत्र' : 'Beej Mantra'}: ${MANTRAS[sLord]} (108 बार)`,
    '',
    `👉 Check your personalised gemstone report: ${S.SITE_URL}/`,
    '',
    `#Shorts #YouTubeShorts #Gemstones #${sEn} #AstrologyRemedies #Pukhraj #Moonga #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #Gemstones #${sEn} #AstrologyRemedies #Grahavani` };
}

module.exports = {
  signShort,
  transitShort,
  matchShort,
  gemShort,
  saturnTransit,
  SIGNS_EN,
  SIGNS_HI,
  DEITIES,
  MANTRAS,
  WEAR_RULES
};
