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
const P = require('./panchang.js');
const DI = require('./dayinfo.js');
const SC = require('./social-card.js');
const W = require('./wishes.js');
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

function combineAllLangs(hiRes, enRes) {
  const cleanTitle = (hiRes.title || '').replace(/\s*#Shorts\s*$/, '').trim();
  const title = `${cleanTitle} (All 6 Languages) #Shorts`.slice(0, 100);
  const desc = [
    '⚡ Watch in 1 Short — All 6 Languages (सभी 6 भाषाएँ एक ही वीडियो में):',
    '🗣️ हिन्दी · ગુજરાતી · தமிழ் · తెలుగు · ಕನ್ನಡ · English',
    '',
    '▶️ 1. हिन्दी (Hindi)',
    '▶️ 2. ગુજરાતી (Gujarati)',
    '▶️ 3. தமிழ் (Tamil)',
    '▶️ 4. తెలుగు (Telugu)',
    '▶️ 5. ಕನ್ನಡ (Kannada)',
    '▶️ 6. English',
    '',
    '----------------------------------------',
    (hiRes.description || '').split('\n\n#Shorts')[0].trim(),
    '----------------------------------------',
    (enRes.description || '').split('\n\n#Shorts')[0].trim(),
    '',
    '👉 Free Kundali, Panchang & Astrology in 6 languages: ' + S.SITE_URL + '/',
    '',
    '#Shorts #YouTubeShorts #AllLanguages #Astrology #Grahavani #Hindi #Gujarati #Tamil #Telugu #Kannada'
  ].join('\n');
  return { title, description: desc, tags: '#Shorts #YouTubeShorts #AllLanguages #Grahavani' };
}

// 1. Single Rashi Deep Dive Short
function signShort(signIdx = 0, lang = 'en', date = { y: 2026, m: 11, d: 17 }) {
  if (lang === 'all') return combineAllLangs(signShort(signIdx, 'hi', date), signShort(signIdx, 'en', date));
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
  if (lang === 'all') return combineAllLangs(transitShort(planet, 'hi', date), transitShort(planet, 'en', date));
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
  if (lang === 'all') return combineAllLangs(matchShort(bSign, gSign, 'hi'), matchShort(bSign, gSign, 'en'));
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
  if (lang === 'all') return combineAllLangs(gemShort(signIdx, 'hi'), gemShort(signIdx, 'en'));
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

// 5. Shubh Muhurta Short
function muhurtaShort(purpose = 'marriage', lang = 'en', date = { y: 2026, m: 11, d: 17 }, city = { name: 'New Delhi', tz: 330 }) {
  if (lang === 'all') return combineAllLangs(muhurtaShort(purpose, 'hi', date, city), muhurtaShort(purpose, 'en', date, city));
  const { t } = translator(lang);
  const pName = t('sc.mu.' + (purpose || 'marriage')) || t('sc.mu.marriage');
  const dStr = `${date.d}-${date.m}-${date.y}`;

  const title = lang === 'hi'
    ? `⏱️ ${pName} (${dStr}): कब है सबसे शुभ समय? राहुकाल से बचें! #Shorts`
    : `⏱️ ${pName} Timing (${dStr}): Best Auspicious Window! #Shorts`;

  const desc = [
    `⏱️ ${pName} — ${dStr} (${city.name || 'New Delhi'})`,
    '',
    `🌟 ${t('sc.mu.bestTime')}: 10:15 AM – 12:45 PM (Abhijit / Shubh Choghadiya)`,
    `📜 ${t('sc.mu.allowedNak')}: Rohini, Uttara Phalguni, Hasta, Anuradha, Revati`,
    '',
    `⚠️ ${t('sc.mu.avoid')}:`,
    `• ${t('sc.mu.rahuWarning')}`,
    `• ${t('sc.mu.bhadraWarning')}`,
    '',
    `🕉️ ${t('sc.mu.preRitual')}:`,
    `• ${t('sc.mu.ganeshPuja')}`,
    '',
    `👉 Calculate exact personalized Muhurat: ${S.SITE_URL}/muhurta/`,
    '',
    `#Shorts #YouTubeShorts #ShubhMuhurta #VedicAstrology #${purpose} #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #ShubhMuhurta #${purpose} #Grahavani` };
}

// 6. Prashna Kundali (Horary) Short
function prashnaShort(topic = 'career', lang = 'en', date = { y: 2026, m: 11, d: 17 }) {
  if (lang === 'all') return combineAllLangs(prashnaShort(topic, 'hi', date), prashnaShort(topic, 'en', date));
  const { t } = translator(lang);
  const topName = t('sc.pr.' + (topic || 'career')) || t('sc.pr.career');

  const title = lang === 'hi'
    ? `🔮 प्रश्न कुंडली: क्या ${topName} में मिलेगी सफलता? जानें तुरंत जवाब #Shorts`
    : `🔮 Prashna Horary: Will You Succeed in ${topName}? Instant Verdict #Shorts`;

  const desc = [
    `🔮 ${topName} — ${lang === 'hi' ? 'प्रश्न कुंडली फलादेश' : 'Prashna Horary Verdict'}`,
    '',
    `✨ ${lang === 'hi' ? 'उत्तर' : 'Verdict'}: ${t('sc.pr.yes')} (85% Positive Alignment)`,
    `🪐 ${t('sc.pr.lagna')}: Pisces / Meena (Benefic Jupiter Aspect)`,
    `⏳ ${t('sc.pr.timing')}: ${t('sc.pr.days')}`,
    '',
    `💡 ${t('sc.pr.advice')}:`,
    `• ${t('sc.pr.chantLord')}`,
    '',
    `👉 Ask any life question on Prashna Kundali: ${S.SITE_URL}/prashna/`,
    '',
    `#Shorts #YouTubeShorts #PrashnaKundali #HoraryAstrology #${topic} #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #PrashnaKundali #${topic} #Grahavani` };
}

// 7. Vrats & Upvaas Short
function vratShort(vratType = 'ekadashi', lang = 'en', date = { y: 2026, m: 11, d: 17 }, city = { name: 'New Delhi' }) {
  if (lang === 'all') return combineAllLangs(vratShort(vratType, 'hi', date, city), vratShort(vratType, 'en', date, city));
  const { t } = translator(lang);
  const vName = t('sc.vr.' + (vratType || 'ekadashi')) || t('sc.vr.ekadashi');
  const dStr = `${date.d}-${date.m}-${date.y}`;

  const title = lang === 'hi'
    ? `🪔 ${vName} (${dStr}): व्रत नियम, पूजन मुहूर्त एवं पारण का सही समय #Shorts`
    : `🪔 ${vName} (${dStr}): Fasting Rules, Puja Muhurat & Parana Time #Shorts`;

  const desc = [
    `🪔 ${vName} — ${dStr} (${city.name || 'New Delhi'})`,
    '',
    `🕉️ ${t('sc.vr.pujaTime')}: 06:45 AM – 08:15 AM`,
    `⏳ ${t('sc.vr.paranaTime')}: Next day 06:48 AM – 08:52 AM`,
    '',
    `📜 ${t('sc.vr.fastRules')}:`,
    `• ${t('sc.vr.fruitDiet')}`,
    `• ${t('sc.vr.paranaRule')}`,
    '',
    `✨ ${t('sc.vr.benefits')}:`,
    `• ${t('sc.vr.cleansing')}`,
    '',
    `👉 Complete Vrats, Tithis & Fasting Calendar: ${S.SITE_URL}/vrat/`,
    '',
    `#Shorts #YouTubeShorts #${vratType} #Vrat #Ekadashi #HinduFasting #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #${vratType} #Vrat #Grahavani` };
}

// 8. Baby Names by Nakshatra Short
function namesShort(signIdx = 0, lang = 'en') {
  if (lang === 'all') return combineAllLangs(namesShort(signIdx, 'hi'), namesShort(signIdx, 'en'));
  const { t, L } = translator(lang);
  const sIdx = Math.min(11, Math.max(0, +signIdx || 0));
  const sName = L('names.rashi')[sIdx];
  const sEn = SIGNS_EN[sIdx];
  const SYLL_SAMPLE = ['Chu, Che, Cho, La', 'Li, Lu, Le, Lo', 'A, I, U, E', 'O, Va, Vi, Vu', 'Ve, Vo, Ka, Ki', 'Ku, Gha, Na, Chha', 'Ke, Ko, Ha, Hi', 'Hu, He, Ho, Da', 'Di, Du, De, Do', 'Ma, Mi, Mu, Me', 'Mo, Ta, Ti, Tu', 'Te, To, Pa, Pi'];

  const title = lang === 'hi'
    ? `👶 ${sName} राशि के सबसे सुंदर एवं भाग्यशाली बच्चों के नाम #Shorts`
    : `👶 Lucky Baby Names for ${sEn} Moon Sign (Starting Letters & Numerology) #Shorts`;

  const desc = [
    `👶 ${sName} (${sEn}) — ${t('sc.nm.title')}`,
    '',
    `🔤 ${t('sc.nm.letters')}: ${SYLL_SAMPLE[sIdx] || 'A, L, Ch'}`,
    '',
    `👦 ${t('sc.nm.boyNames')}: Aarav, Lakshya, Chirag, Lavanya, Anay`,
    `👧 ${t('sc.nm.girlNames')}: Ananya, Laranya, Chetna, Charvi, Aditi`,
    '',
    `🔢 ${t('sc.nm.chaldeanTip')}:`,
    `• ${t('sc.nm.nameNumberTip')}`,
    '',
    `👉 Explore 5,000+ Vedic baby names with numerology: ${S.SITE_URL}/names/`,
    '',
    `#Shorts #YouTubeShorts #BabyNames #${sEn} #HinduNames #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #BabyNames #${sEn} #Grahavani` };
}

// 9. Swapna Shastra / Dream Meaning Short
function dreamShort(dreamTopic = 'snake', lang = 'en') {
  if (lang === 'all') return combineAllLangs(dreamShort(dreamTopic, 'hi'), dreamShort(dreamTopic, 'en'));
  const { t } = translator(lang);
  const dName = t('sc.dr.' + (dreamTopic || 'snake')) || t('sc.dr.snake');

  const title = lang === 'hi'
    ? `🌙 ${dName}: क्या होने वाला है आपके साथ? जानें शुभ या अशुभ संकेत #Shorts`
    : `🌙 Dream of ${dName}: Good or Bad Omen? Vedic Swapna Shastra #Shorts`;

  const desc = [
    `🌙 ${dName} — ${lang === 'hi' ? 'स्वप्न शास्त्र रहस्य' : 'Swapna Shastra Interpretation'}`,
    '',
    `✨ ${lang === 'hi' ? 'संकेत' : 'Sign'}: ${t('sc.dr.goodOmen')}`,
    `⏳ ${t('sc.dr.timing')}: ${t('sc.dr.earlyMorning')}`,
    '',
    `🛡️ ${t('sc.dr.remedy')}:`,
    `• ${t('sc.dr.remedyDesc')}`,
    '',
    `👉 Complete Swapna Shastra dream meanings dictionary: ${S.SITE_URL}/dreams/`,
    '',
    `#Shorts #YouTubeShorts #DreamMeaning #SwapnaShastra #${dreamTopic} #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #DreamMeaning #${dreamTopic} #Grahavani` };
}

// 10. Mahadasha & Antardasha Short
function dashaShort(planet = 'Rahu', lang = 'en') {
  if (lang === 'all') return combineAllLangs(dashaShort(planet, 'hi'), dashaShort(planet, 'en'));
  const { t, L } = translator(lang);
  const pName = L('names.graha')[planet] || planet;
  const YEARS = { Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17, Ketu: 7, Venus: 20 };
  const yrs = YEARS[planet] || 18;

  const title = lang === 'hi'
    ? `⏳ ${pName} की महादशा (${yrs} वर्ष): क्या होगा जीवन पर असर? अचूक उपाय #Shorts`
    : `⏳ ${planet} Mahadasha (${yrs} Years): Golden Period or Struggles? Remedies #Shorts`;

  const desc = [
    `⏳ ${pName} (${planet}) — ${t('sc.ds.title')} (${yrs} ${lang === 'hi' ? 'वर्ष' : 'Years'})`,
    '',
    `🪐 ${t('sc.ds.duration')}: ${yrs} Years`,
    `🌟 ${t('sc.ds.effectsTitle')}:`,
    `• Sudden career changes, foreign travels & material ambition`,
    `• Keep mind grounded and avoid impulsive speculative risks`,
    '',
    `🛡️ ${t('sc.ds.remedyTitle')}:`,
    `• ${t('sc.ds.remedyMantra')}: ${MANTRAS[planet] || 'ॐ नमः शिवाय'}`,
    `• ${t('sc.ds.remedyDaan', { planet: pName })}`,
    '',
    `👉 Check your personal running Dasha timeline: ${S.SITE_URL}/`,
    '',
    `#Shorts #YouTubeShorts #Mahadasha #${planet} #VedicAstrology #Kundali #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #Mahadasha #${planet} #Grahavani` };
}

// ---------- Standard Reel Contents as YouTube Shorts ----------
function dayShort(d, lang, city = { name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 330 }) {
  if (lang === 'all') return combineAllLangs(dayShort(d, 'hi', city), dayShort(d, 'en', city));
  const { t } = translator(lang);
  const info = DI.dayInfo(d, city), hm = ms => SC.hm(ms, city.tz);
  const muh = DI.bestMuhurats(d, city);
  const bestM = (muh.list && muh.list[0]) ? `${hm(muh.list[0].start)} – ${hm(muh.list[0].end)}` : '11:45 AM – 12:35 PM';
  const rk = info.rahuKaal ? `${hm(info.rahuKaal.start)} – ${hm(info.rahuKaal.end)}` : '15:00 – 16:30';
  const dStr = `${String(d.d).padStart(2, '0')}-${String(d.m).padStart(2, '0')}-${d.y}`;

  const title = lang === 'hi'
    ? `📅 आज का विशेष दिन एवं श्रेष्ठ मुहूर्त (${dStr}): राहुकाल और उपाय #Shorts`
    : `📅 Daily Special Muhurat & Day Highlights (${dStr}) #Shorts`;

  const desc = [
    `📅 ${t('socad.yt.tDay')} — ${dStr} (${city.name})`,
    '',
    `🕉️ ${t('sc.dy.bestMuhurat')}: ${bestM}`,
    `⚠️ ${t('sec.pan.rahuKaal')}: ${rk} (${t('sc.mu.avoid')})`,
    `✨ ${t('sec.pan.tithi')}: ${info.tithi ? info.tithi.name : 'Shukla Paksha'}`,
    `🌟 ${t('sec.pan.nakshatra')}: ${info.nakshatra ? info.nakshatra.name : 'Rohini'}`,
    '',
    `🙏 ${t('sc.dy.pujaWin')}: ${t('sc.mu.ganeshPuja')}`,
    '',
    `👉 Daily Panchang & Free Kundali: ${S.SITE_URL}/panchang/`,
    '',
    `#Shorts #YouTubeShorts #Panchang #ShubhMuhurat #TodayPanchang #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: '#Shorts #YouTubeShorts #Panchang #ShubhMuhurat #Grahavani' };
}

function rashifalShort(d, lang) {
  if (lang === 'all') return combineAllLangs(rashifalShort(d, 'hi'), rashifalShort(d, 'en'));
  const { t, L } = translator(lang), rn = i => L('names.rashi')[i];
  const data = R.forDate(Date.UTC(d.y, d.m - 1, d.d, 0, 30));
  const sorted = data.signs.slice().sort((a, b) => b.stars - a.stars);
  const topSigns = sorted.slice(0, 3).map(s => `${rn(s.sign)} (${'★'.repeat(s.stars)})`).join(', ');
  const careSigns = data.signs.filter(s => s.chandrashtama || s.stars <= 1).slice(0, 2).map(s => rn(s.sign)).join(', ');
  const dStr = `${String(d.d).padStart(2, '0')}-${String(d.m).padStart(2, '0')}-${d.y}`;

  const title = lang === 'hi'
    ? `⭐ आज का सम्पूर्ण 12 राशियों का राशिफल (${dStr}): किसकी चमकेगी किस्मत? #Shorts`
    : `⭐ Daily Horoscope All 12 Signs Today (${dStr}) #Shorts`;

  const desc = [
    `⭐ ${t('socad.yt.tRashifal')} — ${dStr}`,
    '',
    `🌟 ${t('soc.top', { x: topSigns })}`,
    careSigns ? `⚠️ ${t('soc.care', { x: careSigns })}` : '',
    '',
    `💡 Daily Astrological Remedies:`,
    `• Chant Gayatri Mantra at sunrise for mental clarity`,
    `• Offer water to Surya Dev in a copper vessel`,
    '',
    `👉 Read your complete Moon sign forecast: ${S.SITE_URL}/rashifal/`,
    '',
    `#Shorts #YouTubeShorts #Rashifal #Horoscope #DailyHoroscope #Astrology #Grahavani`
  ].filter(Boolean).join('\n');

  return { title, description: desc, tags: '#Shorts #YouTubeShorts #Rashifal #Horoscope #Grahavani' };
}

function panchangShort(d, lang, city = { name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 330 }) {
  if (lang === 'all') return combineAllLangs(panchangShort(d, 'hi', city), panchangShort(d, 'en', city));
  const { t } = translator(lang);
  const p = P.day({ year: d.y, month: d.m, day: d.d, lat: city.lat, lon: city.lon, tzMinutes: city.tz });
  const hm = ms => { const x = new Date(ms + city.tz * 60000); return String(x.getUTCHours()).padStart(2, '0') + ':' + String(x.getUTCMinutes()).padStart(2, '0'); };
  const dStr = `${String(d.d).padStart(2, '0')}-${String(d.m).padStart(2, '0')}-${d.y}`;
  const rk = p.rahuKaal ? `${hm(p.rahuKaal.start)} – ${hm(p.rahuKaal.end)}` : '15:00 – 16:30';

  const title = lang === 'hi'
    ? `📜 आज का वैदिक पंचांग (${dStr}): तिथि, नक्षत्र, राहुकाल एवं शुभ चौघड़िया #Shorts`
    : `📜 Daily Vedic Panchang (${dStr}): Tithi, Nakshatra & Rahu Kaal #Shorts`;

  const desc = [
    `📜 ${t('socad.yt.tPanchang')} — ${dStr} (${city.name})`,
    '',
    `🌅 Sunrise / सूर्योदय: ${p.sun && p.sun.rise ? hm(p.sun.rise) : '06:30'}`,
    `⚠️ ${t('sec.pan.rahuKaal')}: ${rk}`,
    `✨ Tithi & Nakshatra: ${p.tithi && p.tithi[0] ? p.tithi[0].name : 'Shukla'} · ${p.nakshatra && p.nakshatra[0] ? p.nakshatra[0].name : 'Ashwini'}`,
    `🕉️ Shubh Choghadiya: Amrit & Shubh Muhurat active`,
    '',
    `👉 Full city Panchang & Choghadiya table: ${S.SITE_URL}/panchang/`,
    '',
    `#Shorts #YouTubeShorts #Panchang #AajKaPanchang #HinduCalendar #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: '#Shorts #YouTubeShorts #Panchang #AajKaPanchang #Grahavani' };
}

function weekShort(d, lang) {
  if (lang === 'all') return combineAllLangs(weekShort(d, 'hi'), weekShort(d, 'en'));
  const { t, L } = translator(lang), rn = i => L('names.rashi')[i];
  const wk = SC.weekData(d);
  const top = Math.max(...wk.signs.map(x => x.stars)), best = wk.signs.filter(x => x.stars === top).map(x => rn(x.sign) + ' ' + '★'.repeat(x.stars));

  const title = lang === 'hi'
    ? `📆 इस सप्ताह का साप्ताहिक राशिफल: किन राशियों के खुलेंगे भाग्य? #Shorts`
    : `📆 Weekly Horoscope (Next 7 Days): Top Lucky Signs & Forecast #Shorts`;

  const desc = [
    `📆 ${t('socad.yt.tWeek')}`,
    '',
    `🌟 ${t('soc.weekTop', { x: best.join(', ') })}`,
    '',
    `💼 Career & Finance Highlights:`,
    `• Hard work brings long-term rewards under Saturn's gaze`,
    `• Favourable alignments for new ventures and partnerships`,
    '',
    `👉 Check your full weekly analysis: ${S.SITE_URL}/rashifal/`,
    '',
    `#Shorts #YouTubeShorts #WeeklyHoroscope #Rashifal #Astrology #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: '#Shorts #YouTubeShorts #WeeklyHoroscope #Rashifal #Grahavani' };
}

function festShort(d, lang, city = { name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 330 }) {
  if (lang === 'all') return combineAllLangs(festShort(d, 'hi', city), festShort(d, 'en', city));
  const { t } = translator(lang);
  const ev = SC.festData(d, city);
  const festNames = ev.slice(0, 4).map(e => `• ${SC.festName(lang, e)} (${e.date})`).join('\n');

  const title = lang === 'hi'
    ? `🪔 आगामी 14 दिनों के प्रमुख त्यौहार एवं व्रत (2026): पूरी सूची #Shorts`
    : `🪔 Upcoming Festivals & Vrats in Next 14 Days #Shorts`;

  const desc = [
    `🪔 ${t('socad.yt.tFest')} (2026)`,
    '',
    festNames || '• Ekadashi & Pradosh Vrat dates',
    '',
    `🕉️ Fasting & Puja Advice:`,
    `• Cleanse home and observe satvik diet on vrat days`,
    `• Offer prayers to Lord Shiva & Lord Vishnu during auspicious tithi`,
    '',
    `👉 Full Hindu calendar & vrat list: ${S.SITE_URL}/calendar/`,
    '',
    `#Shorts #YouTubeShorts #HinduFestivals #Vrat #Ekadashi #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: '#Shorts #YouTubeShorts #HinduFestivals #Vrat #Grahavani' };
}

function wishShort(festId = 'diwali', lang = 'hi', d, city = { name: 'New Delhi', lat: 28.6139, lon: 77.209, tz: 330 }) {
  if (lang === 'all') return combineAllLangs(wishShort(festId, 'hi', d, city), wishShort(festId, 'en', d, city));
  const { t } = translator(lang);
  const w = W.wish(festId, lang, t('fest.' + festId) || 'Festival');

  const title = lang === 'hi'
    ? `✨ ${w.greet || 'त्यौहार'} की हार्दिक शुभकामनाएं एवं शुभ मुहूर्त #Shorts`
    : `✨ Happy ${festId.toUpperCase()} Greetings & Auspicious Blessings #Shorts`;

  const desc = [
    `✨ ${w.greet || 'Happy Festival'}!`,
    '',
    w.bless || 'May the divine light bring prosperity, peace and good health to your family.',
    '',
    `🕉️ Best Puja Muhurat & Timings:`,
    `• Perform ritual prayers during the auspicious evening window`,
    `• Light lamps and chant sacred mantras with loved ones`,
    '',
    `👉 Free Kundali & Festival Muhurat: ${S.SITE_URL}/`,
    '',
    `#Shorts #YouTubeShorts #${festId} #FestivalWishes #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #${festId} #Grahavani` };
}

function nuallShort(year = 2026, lang = 'hi') {
  if (lang === 'all') return combineAllLangs(nuallShort(year, 'hi'), nuallShort(year, 'en'));
  const { t } = translator(lang);

  const title = lang === 'hi'
    ? `🔢 अंक ज्योतिष वार्षिक भविष्यफल ${year}: मूलांक 1 से 9 का सम्पूर्ण फल #Shorts`
    : `🔢 Numerology Prediction ${year}: Life Path Numbers 1 to 9 #Shorts`;

  const desc = [
    `🔢 ${t('socad.yt.tNuall')} (${year})`,
    '',
    `🎯 Mulank Overview:`,
    `• Mulank 1, 3, 5: High career growth, new opportunities and leadership`,
    `• Mulank 2, 6: Strong relationships, marriage prospects and harmony`,
    `• Mulank 4, 7, 8: Steady disciplined progress and spiritual awakening`,
    `• Mulank 9: Energy, sports, transformation and bold victories`,
    '',
    `👉 Calculate your exact Mulank & Bhagyank: ${S.SITE_URL}/numerology/`,
    '',
    `#Shorts #YouTubeShorts #Numerology #Mulank #${year} #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #Numerology #Mulank #Grahavani` };
}

function numonthShort(ym = '2026-11', lang = 'hi') {
  if (lang === 'all') return combineAllLangs(numonthShort(ym, 'hi'), numonthShort(ym, 'en'));
  const { t } = translator(lang);

  const title = lang === 'hi'
    ? `📅 इस महीने का अंक ज्योतिष भविष्यफल: जानें अपने मूलांक का हाल #Shorts`
    : `📅 Monthly Numerology Horoscope: Lucky Dates & Forecast #Shorts`;

  const desc = [
    `📅 ${t('socad.yt.tNumonth')}`,
    '',
    `🌟 Key Monthly Energy:`,
    `• Best dates for signing contracts and starting business`,
    `• Lucky numbers and colours for financial growth`,
    '',
    `👉 Detailed monthly numerology report: ${S.SITE_URL}/numerology/`,
    '',
    `#Shorts #YouTubeShorts #MonthlyNumerology #Numerology #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: '#Shorts #YouTubeShorts #MonthlyNumerology #Grahavani' };
}

function mulankShort(n = 1, year = 2026, lang = 'hi') {
  if (lang === 'all') return combineAllLangs(mulankShort(n, year, 'hi'), mulankShort(n, year, 'en'));
  const { t } = translator(lang);
  const PLANET_NUM = { 1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury', 6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars' };
  const p = PLANET_NUM[n] || 'Sun';

  const title = lang === 'hi'
    ? `🎯 मूलांक ${n} का सम्पूर्ण भविष्यफल (${year}): करियर, धन और प्रेम जीवन #Shorts`
    : `🎯 Mulank ${n} Forecast (${year}): Career, Money & Love Life #Shorts`;

  const desc = [
    `🎯 ${t('socad.yt.tMulank')} — Mulank ${n} (${year})`,
    '',
    `🪐 Ruling Planet: ${p}`,
    `💎 Lucky Colour & Gem: Yellow / Gold / Ruby`,
    `⭐ Compatible Numbers: 1, 3, 5`,
    '',
    `🌟 Yearly Life Advice:`,
    `• Maintain focus on long-term goals without distraction`,
    `• Keep personal relationships balanced and communicative`,
    '',
    `👉 Discover your complete name numerology: ${S.SITE_URL}/numerology/`,
    '',
    `#Shorts #YouTubeShorts #Mulank${n} #Numerology #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #Mulank${n} #Grahavani` };
}

function bhagyankShort(n = 1, year = 2026, lang = 'hi') {
  if (lang === 'all') return combineAllLangs(bhagyankShort(n, year, 'hi'), bhagyankShort(n, year, 'en'));
  const { t } = translator(lang);
  const PLANET_NUM = { 1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury', 6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars' };
  const p = PLANET_NUM[n] || 'Sun';

  const title = lang === 'hi'
    ? `✨ भाग्यांक ${n} का सम्पूर्ण भविष्यफल (${year}): जीवन का मार्ग और भाग्य #Shorts`
    : `✨ Bhagyank ${n} Forecast (${year}): Life Path & Destiny Insights #Shorts`;

  const desc = [
    `✨ ${t('socad.yt.tBhagyank') || 'Destiny Number'} — Bhagyank ${n} (${year})`,
    '',
    `🪐 Ruling Planet: ${p}`,
    `💎 Auspicious Gems & Colors for Destiny Alignment`,
    `🌟 Life Path & Career Destiny`,
    '',
    `👉 Discover your complete name numerology: ${S.SITE_URL}/numerology/bhagyank-${n}/`,
    '',
    `#Shorts #YouTubeShorts #Bhagyank${n} #DestinyNumber #Numerology #Grahavani`
  ].join('\n');

  return { title, description: desc, tags: `#Shorts #YouTubeShorts #Bhagyank${n} #Grahavani` };
}

module.exports = {
  signShort,
  transitShort,
  matchShort,
  gemShort,
  muhurtaShort,
  prashnaShort,
  vratShort,
  namesShort,
  dreamShort,
  dashaShort,
  dayShort,
  rashifalShort,
  panchangShort,
  weekShort,
  festShort,
  wishShort,
  nuallShort,
  numonthShort,
  mulankShort,
  bhagyankShort,
  saturnTransit,
  SIGNS_EN,
  SIGNS_HI,
  DEITIES,
  MANTRAS,
  WEAR_RULES
};
