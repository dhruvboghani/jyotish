const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// 1. Update lib/site.js
let siteJs = fs.readFileSync(path.join(ROOT, 'lib/site.js'), 'utf8');

const newNavs = [
  ['gochar/', 'gochar', 'i-loop'],
  ['mangal-dosha/', 'mangal', 'i-alert'],
  ['lagna/', 'lagna', 'i-rise'],
  ['love-match/', 'love', 'i-heart'],
  ['dasha-planner/', 'dasha', 'i-clock'],
  ['yogas/', 'yogas', 'i-yoga'],
  ['navamsha/', 'navamsha', 'i-chart'],
  ['ashtakavarga/', 'ashtakavarga', 'i-num'],
  ['varshphal/', 'varshphal', 'i-sun'],
  ['rashi-ratna/', 'ratna', 'i-star'],
  ['sarpa-dosha/', 'sarpa', 'i-half'],
  ['hora-time/', 'hora', 'i-cal']
];

const newBundles = {
  gochar: ['core', 'report', 'gochar'],
  mangal: ['core', 'city', 'mangal'],
  lagna: ['core', 'report', 'city', 'lagna'],
  love: ['core', 'city', 'love'],
  dasha: ['core', 'city', 'dasha'],
  yogas: ['core', 'city', 'yogas'],
  navamsha: ['core', 'report', 'city', 'navamsha'],
  ashtakavarga: ['core', 'city', 'ashtakavarga'],
  varshphal: ['core', 'city', 'varshphal'],
  ratna: ['core', 'city', 'ratna'],
  sarpa: ['core', 'city', 'sarpa'],
  hora: ['core', 'city', 'hora']
};

const newPlaces = ['mangal', 'lagna', 'love', 'dasha', 'yogas', 'navamsha', 'ashtakavarga', 'varshphal', 'ratna', 'sarpa', 'hora'];

// Inject into NAVS_MORE
if (!siteJs.includes("'gochar/'")) {
  siteJs = siteJs.replace(
    /const NAVS_MORE = \[(.*?)\];/s,
    (m, inner) => `const NAVS_MORE = [${inner}, ${newNavs.map(([s, k, i]) => `['${s}', '${k}', '${i}']`).join(', ')}];`
  );
}

// Inject into BUNDLES
if (!siteJs.includes("gochar: ['core'")) {
  siteJs = siteJs.replace(
    /const BUNDLES = \{ (.*?) \};/s,
    (m, inner) => `const BUNDLES = { ${inner}, ${Object.entries(newBundles).map(([k, v]) => `${k}: [${v.map(x => `'${x}'`).join(', ')}]`).join(', ')} };`
  );
}

// Inject into PLACES_PAGES
if (!siteJs.includes("'mangal'")) {
  siteJs = siteJs.replace(
    /const PLACES_PAGES = new Set\(\[(.*?)\]\);/s,
    (m, inner) => `const PLACES_PAGES = new Set([${inner}, ${newPlaces.map(p => `'${p}'`).join(', ')}]);`
  );
}

fs.writeFileSync(path.join(ROOT, 'lib/site.js'), siteJs);
console.log('Updated lib/site.js successfully.');

// 2. Update build.js
let buildJs = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');
const newPageEntries = [
  "    P('gochar', 'gochar/', { priority: '0.9', freq: 'daily' }),",
  "    P('mangal', 'mangal-dosha/', { priority: '0.9', freq: 'weekly' }),",
  "    P('lagna', 'lagna/', { priority: '0.8', freq: 'weekly' }),",
  "    P('love', 'love-match/', { priority: '0.9', freq: 'weekly' }),",
  "    P('dasha', 'dasha-planner/', { priority: '0.8', freq: 'monthly' }),",
  "    P('yogas', 'yogas/', { priority: '0.8', freq: 'monthly' }),",
  "    P('navamsha', 'navamsha/', { priority: '0.8', freq: 'monthly' }),",
  "    P('ashtakavarga', 'ashtakavarga/', { priority: '0.7', freq: 'monthly' }),",
  "    P('varshphal', 'varshphal/', { priority: '0.8', freq: 'yearly' }),",
  "    P('ratna', 'rashi-ratna/', { priority: '0.8', freq: 'monthly' }),",
  "    P('sarpa', 'sarpa-dosha/', { priority: '0.8', freq: 'monthly' }),",
  "    P('hora', 'hora-time/', { priority: '0.8', freq: 'daily' }),"
].join('\n');

if (!buildJs.includes("P('gochar'")) {
  buildJs = buildJs.replace(
    "P('business', 'business-kundali/', { priority: '0.7', freq: 'monthly' }),",
    "P('business', 'business-kundali/', { priority: '0.7', freq: 'monthly' }),\n" + newPageEntries
  );
  fs.writeFileSync(path.join(ROOT, 'build.js'), buildJs);
  console.log('Updated build.js successfully.');
}

// 3. Update all 6 locales
const MODULES_META = {
  gochar: {
    en: { nav: 'Gochar (Live Transit)', name: 'Gochar (Transit)', title: 'Live Planetary Gochar – Real-Time Transits for All Rashis | Grahavani', desc: 'Real-time planetary transit positions of Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu with house-wise impact.' },
    hi: { nav: 'ग्रह गोचर (लाइव)', name: 'ग्रह गोचर', title: 'दैनिक ग्रह गोचर – सभी 12 राशियों पर लाइव ग्रहों का गोचर फल | ग्रहवाणी', desc: 'सूर्य, चंद्रमा, मंगल, बुध, गुरु, शुक्र, शनि, राहु व केतु का लाइव गोचर देखें और अपनी चंद्र राशि व लग्न पर इसका प्रभाव जानें।' },
    gu: { nav: 'ગ્રહ ગોચર (લાઈવ)', name: 'ગ્રહ ગોચર', title: 'દૈનિક ગ્રહ ગોચર – બધી રાશિઓ પર લાઈવ ગ્રહોનું પરિભ્રમણ | ગ્રહવાણી', desc: 'સૂર્ય, ચંદ્ર, મંગળ, ગુરુ, શનિ સહિત તમામ 9 ગ્રહોનું લાઈવ ગોચર અને રાશિવાર ફળ.' },
    ta: { nav: 'கிரக பெயர்ச்சி', name: 'கிரக பெயர்ச்சி', title: 'நேரலை கிரக பெயர்ச்சி – 12 ராசிகளின் பலன்கள் | கிரகவாணி', desc: 'சனி, குரு, ராகு-கேது மற்றும் அனைத்து 9 கிரகங்களின் தற்போதைய நிலை மற்றும் பெயர்ச்சி பலன்கள்.' },
    te: { nav: 'గ్రహ గోచారం', name: 'గ్రహ గోచారం', title: 'లైవ్ గ్రహ గోచారం – 12 రాశుల ఫలితాలు | గ్రహవాణి', desc: 'శని, గురు, రాహు-కేతువులతో సహా 9 గ్రహాల ప్రస్తుత గోచార స్థానాలు మరియు ఫలితాలు.' },
    kn: { nav: 'ಗ್ರಹ ಗೋಚಾರ', name: 'ಗ್ರಹ ಗೋಚಾರ', title: 'ಲೈವ್ ಗ್ರಹ ಗೋಚಾರ – 12 ರಾಶಿಗಳ ಪ್ರಭಾವ | ಗ್ರಹವಾಣಿ', desc: 'ಶನಿ, ಗುರು, ರಾಹು-ಕೇತುಗಳ ಪ್ರಸ್ತುತ ಗೋಚಾರ ಸ್ಥಾನಗಳು ಮತ್ತು ರಾಶಿವಾರು ಫಲಿತಾಂಶಗಳು.' }
  },
  mangal: {
    en: { nav: 'Mangal Dosha', name: 'Mangal Dosha Checker', title: 'Mangal Dosha Calculator – Check Manglik Status & Cancellation | Grahavani', desc: 'Calculate Mangal Dosha from Lagna, Moon and Venus. See exact house placements, classical cancellation rules, and Vedic remedies.' },
    hi: { nav: 'मांगलिक दोष', name: 'मांगलिक दोष चेकर', title: 'मांगलिक दोष कैलकुलेटर – मांगलिक परीक्षण व दोष परिहार नियम | ग्रहवाणी', desc: 'लग्न, चंद्रमा व शुक्र से मंगल की स्थिति जांचें। जानिए पूर्ण व आंशिक मांगलिक दोष, इसके शास्त्रसम्मत अपवाद और अचूक शांति उपाय।' },
    gu: { nav: 'માંગલિક દોષ', name: 'માંગલિક દોષ ચેકર', title: 'માંગલિક દોષ કેલ્ક્યુલેટર – માંગલિક તપાસ અને પરિહાર | ગ્રહવાણી', desc: 'લગ્ન, ચંદ્ર અને શુક્રથી મંગળ દોષની ગણતરી, દોષ ભંગના નિયમો અને શાંતિ ઉપાય.' },
    ta: { nav: 'செவ்வாய் தோஷம்', name: 'செவ்வாய் தோஷம்', title: 'செவ்வாய் தோஷம் கால்குலேட்டர் – பரிகாரங்கள் | கிரகவாணி', desc: 'லக்னம், சந்திரன் மற்றும் சுக்கிரனில் இருந்து செவ்வாய் தோஷ கணிப்பு மற்றும் நிவர்த்தி முறைகள்.' },
    te: { nav: 'కుజ దోషం', name: 'కుజ దోషం చెకర్', title: 'కుజ దోష కాలిక్యులేటర్ – నివారణలు | గ్రహవాణి', desc: 'లగ్నం, చంద్రుడు, శుక్రుడి నుండి కుజ దోష విశ్లేషణ మరియు శాంతి మార్గాలు.' },
    kn: { nav: 'ಮಂಗಳ ದೋಷ', name: 'ಮಂಗಳ ದೋಷ ಕ್ಯಾಲ್ಕುಲೇಟರ್', title: 'ಮಂಗಳ ದೋಷ ಕ್ಯಾಲ್ಕುಲೇಟರ್ – ಪರಿಹಾರಗಳು | ಗ್ರಹವಾಣಿ', desc: 'ಲಗ್ನ, ಚಂದ್ರ ಮತ್ತು ಶುಕ್ರನಿಂದ ಮಂಗಳ ದೋಷ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಶಾಸ್ತ್ರೀಯ ಪರಿಹಾರಗಳು.' }
  },
  lagna: {
    en: { nav: 'Lagna Calculator', name: 'Lagna Calculator', title: 'Lagna Calculator – Find Your Ascendant & Rising Sign Traits | Grahavani', desc: 'Find your exact Lagna (Rising sign), degree, nakshatra and lord. Read physical traits, psychological profile, and lucky elements.' },
    hi: { nav: 'लग्न कैलकुलेटर', name: 'लग्न कैलकुलेटर', title: 'लग्न कैलकुलेटर – अपना लग्न (राइजिंग साइन) और स्वभाव जानें | ग्रहवाणी', desc: 'अपनी जन्म तिथि व समय से सटीक लग्न, अंश, नक्षत्र और लग्न स्वामी जानें। शारीरिक बनावट और शुभ कारकों की पूरी रिपोर्ट।' },
    gu: { nav: 'લગ્ન કેલ્ક્યુલેટર', name: 'લગ્ન કેલ્ક્યુલેટર', title: 'લગ્ન કેલ્ક્યુલેટર – તમારું લગ્ન (રાઇઝિંગ સાઇન) જાણો | ગ્રહવાણી', desc: 'જન્મ વિગતો પરથી સચોટ લગ્ન, નક્ષત્ર, સ્વભાવ અને શુભ કારકો.' },
    ta: { nav: 'லக்னம்', name: 'லக்னம் கால்குலேட்டர்', title: 'லக்னம் கால்குலேட்டர் – உங்கள் லக்ன குணங்கள் | கிரகவாணி', desc: 'துல்லியமான லக்னம், நட்சத்திரம் மற்றும் குணநலன்களை கணக்கிடுங்கள்.' },
    te: { nav: 'లగ్నం', name: 'లగ్నం కాలిక్యులేటర్', title: 'లగ్నం కాలిక్యులేటర్ – మీ లగ్న లక్షణాలు | గ్రహవాణి', desc: 'ఖచ్చితమైన లగ్నం, నక్షత్రం మరియు వ్యక్తిత్వ లక్షణాలను తెలుసుకోండి.' },
    kn: { nav: 'ಲಗ್ನ', name: 'ಲಗ್ನ ಕ್ಯಾಲ್ಕುಲೇಟರ್', title: 'ಲಗ್ನ ಕ್ಯಾಲ್ಕುಲೇಟರ್ – ನಿಮ್ಮ ಉದಯ ರಾಶಿ ಗುಣಗಳು | ಗ್ರಹವಾಣಿ', desc: 'ನಿಖರವಾದ ಲಗ್ನ, ನಕ್ಷತ್ರ ಮತ್ತು ವ್ಯಕ್ತಿತ್ವ ಗುಣಲಕ್ಷಣಗಳನ್ನು ಲೆಕ್ಕಹಾಕಿ.' }
  },
  love: {
    en: { nav: 'Love Match', name: 'Love Compatibility', title: 'Love Compatibility Calculator – Relationship & Chemistry Match | Grahavani', desc: 'Calculate emotional harmony, romantic chemistry, mental connection, and spiritual trust between two birth charts.' },
    hi: { nav: 'लव कम्पैटिबिलिटी', name: 'लव कम्पैटिबिलिटी', title: 'लव कम्पैटिबिलिटी कैलकुलेटर – प्रेम व भावनात्मक अनुकूलता | ग्रहवाणी', desc: 'दो जन्म कुंडलियों के बीच भावनात्मक तालमेल, आकर्षण, मानसिक जुड़ाव और स्थायी विश्वास का प्रतिशत जानें।' },
    gu: { nav: 'લવ સુસંગતતા', name: 'લવ સુસંગતતા', title: 'લવ સુસંગતતા કેલ્ક્યુલેટર – પ્રેમ અને કેમિસ્ટ્રી મેચ | ગ્રહવાણી', desc: 'બે કુંડળીઓ વચ્ચે ભાવનાત્મક સુમેળ, આકર્ષણ અને માનસિક જોડાણની ગણતરી.' },
    ta: { nav: 'காதல் பொருத்தம்', name: 'காதல் பொருத்தம்', title: 'காதல் பொருத்தம் கால்குலேட்டர் | கிரகவாணி', desc: 'இருவரின் உணர்ச்சி மற்றும் காதல் பொருத்தத்தை சதவீதத்தில் கணக்கிடுங்கள்.' },
    te: { nav: 'ప్రేమ పొంతన', name: 'ప్రేమ పొంతన', title: 'ప్రేమ పొంతన కాలిక్యులేటర్ – రిలేషన్షిప్ మ్యాచ్ | గ్రహవాణి', desc: 'ఇద్దరి మధ్య భావోద్వేగ అనుబంధం మరియు ప్రేమ శాతాన్ని తెలుసుకోండి.' },
    kn: { nav: 'ಪ್ರೀತಿ ಹೊಂದಾಣಿಕೆ', name: 'ಪ್ರೀತಿ ಹೊಂದಾಣಿಕೆ', title: 'ಪ್ರೀತಿ ಹೊಂದಾಣಿಕೆ ಕ್ಯಾಲ್ಕುಲೇಟರ್ | ಗ್ರಹವಾಣಿ', desc: 'ಇಬ್ಬರ ನಡುವಿನ ಭಾವನಾತ್ಮಕ ಹೊಂದಾಣಿಕೆ ಮತ್ತು ಪ್ರೀತಿಯ ಶೇಕಡಾವಾರು ಲೆಕ್ಕಹಾಕಿ.' }
  },
  dasha: {
    en: { nav: 'Dasha Planner', name: 'Dasha Planner', title: 'Vimshottari Dasha Planner – Lifetime Mahadasha Timeline | Grahavani', desc: 'Interactive 120-year Vimshottari Mahadasha and Antardasha timeline. See your active running period, turning points and forecasts.' },
    hi: { nav: 'महादशा टाइमलाइन', name: 'महादशा टाइमलाइन', title: 'विंशोत्तरी महादशा प्लानर – संपूर्ण जीवन की दशा टाइमलाइन | ग्रहवाणी', desc: '120 वर्षीय विंशोत्तरी महादशा व अंतर्दशा की संपूर्ण सूची। अपनी वर्तमान सक्रिय दशा और भविष्य के महत्वपूर्ण मोड़ देखें।' },
    gu: { nav: 'મહાદશા ટાઈમલાઈન', name: 'મહાદશા ટાઈમલાઈન', title: 'વિંશોત્તરી મહાદશા ટાઈમલાઈન – આજીવન દશા કેલેન્ડર | ગ્રહવાણી', desc: 'તમારી વર્તમાન સક્રિય મહાદશા, અંતર્દશા અને આગામી મહત્વપૂર્ણ સમયગાળો.' },
    ta: { nav: 'தசா பலன்கள்', name: 'தசா பலன்கள்', title: 'விம்சோத்தரி தசா கால்குலேட்டர் – தசா புத்தி காலங்கள் | கிரகவாணி', desc: 'வாழ்நாள் முழுவதும் நடக்கும் தசா புத்திகள் மற்றும் நடப்பு தசா பலன்கள்.' },
    te: { nav: 'దశ ప్లానర్', name: 'దశ ప్లానర్', title: 'వింశోత్తరి దశ ప్లానర్ – సమగ్ర దశా కాలాలు | గ్రహవాణి', desc: 'ప్రస్తుతం నడుస్తున్న మహాదశ, అంతర్దశ మరియు జీవిత కీలక మలుపులు.' },
    kn: { nav: 'ದಶಾ ಪ್ಲಾನರ್', name: 'ದಶಾ ಪ್ಲಾನರ್', title: 'ವಿಂಶೋತ್ತರಿ ದಶಾ ಪ್ಲಾನರ್ – ಜೀವಮಾನದ ದಶಾ ಫಲ | ಗ್ರಹವಾಣಿ', desc: 'ಪ್ರಸ್ತುತ ಚಾಲ್ತಿಯಲ್ಲಿರುವ ಮಹಾದಶಾ, ಅಂತರ್ದಶಾ ಮತ್ತು ಭವಿಷ್ಯದ ಮುನ್ಸೂಚನೆ.' }
  },
  yogas: {
    en: { nav: 'Yogas Analyzer', name: 'Yogas Analyzer', title: 'Kundali Yogas Analyzer – Check Raj Yogas & Wealth Yogas | Grahavani', desc: 'Analyze over 30 classical Vedic yogas including Gajakesari, Budhaditya, Panch Mahapurusha, Vipareeta and Dhana Yogas in your chart.' },
    hi: { nav: 'कुंडली राजयोग', name: 'राजयोग चेकर', title: 'कुंडली राजयोग विश्लेषक – गजकेसरी, पंच महापुरुष व धन योग | ग्रहवाणी', desc: 'अपनी जन्म कुंडली में उपस्थित समस्त राजयोगों, धन योगों और विपरीत राजयोगों की विस्तृत गणना व लाभ देखें।' },
    gu: { nav: 'કુંડળી રાજયોગ', name: 'રાજયોગ ચેકર', title: 'કુંડળી રાજયોગ વિશ્લેષક – ગજકેસરી અને ધન યોગ | ગ્રહવાણી', desc: 'તમારી કુંડળીમાં રહેલા પંચ મહાપુરુષ અને ધન યોગોની સચોટ માહિતી.' },
    ta: { nav: 'ராஜ யோகங்கள்', name: 'ராஜ யோகங்கள்', title: 'ஜாதக ராஜ யோகங்கள் – கஜகேசரி யோகம் மற்றும் பலன்கள் | கிரகவாணி', desc: 'உங்கள் ஜாதகத்தில் உள்ள ராஜ யோகங்கள் மற்றும் செல்வ யோகங்களின் முழு பட்டியல்.' },
    te: { nav: 'రాజ యోగాలు', name: 'రాజ యోగాలు', title: 'కుండలి రాజ యోగాలు – గజకేసరి మరియు ధన యోగాలు | గ్రహవాణి', desc: 'మీ జాతకంలో ఉన్న పంచ మహాపురుష మరియు రాజ యోగాల సమగ్ర వివరాలు.' },
    kn: { nav: 'ರಾಜ ಯೋಗಗಳು', name: 'ರಾಜ ಯೋಗಗಳು', title: 'ಜಾತಕ ರಾಜ ಯೋಗಗಳು – ಗಜಕೇಸರಿ ಮತ್ತು ಧನ ಯೋಗಗಳು | ಗ್ರಹವಾಣಿ', desc: 'ನಿಮ್ಮ ಕುಂಡಲಿಯಲ್ಲಿರುವ ಪಂಚ ಮಹಾಪುರುಷ ಮತ್ತು ರಾಜ ಯೋಗಗಳ ವಿವರವಾದ ವಿಶ್ಲೇಷಣೆ.' }
  },
  navamsha: {
    en: { nav: 'Navamsha (D9)', name: 'Navamsha Chart', title: 'Navamsha (D9) Chart Explorer – Vargottama Planets & Marriage | Grahavani', desc: 'Generate your Navamsha (D9) chart. Discover Vargottama planets, inner soul potential, and marriage compatibility.' },
    hi: { nav: 'नवांश चक्र (D9)', name: 'नवांश चक्र (D9)', title: 'नवांश कुंडली (D9) – वर्गोत्तम ग्रह, वैवाहिक सुख व आत्मिक बल | ग्रहवाणी', desc: 'अपनी नवांश (D9) कुंडली बनाएं। जानिए वर्गोत्तम ग्रहों की स्थिति, जीवनसाथी का स्वभाव और आध्यात्मिक शक्ति।' },
    gu: { nav: 'નવાંશ કુંડળી (D9)', name: 'નવાંશ કુંડળી', title: 'નવાંશ કુંડળી (D9) – વર્ગોત્તમ ગ્રહો અને લગ્ન જીવન | ગ્રહવાણી', desc: 'નવાંશ કુંડળીનું વિશ્લેષણ અને વર્ગોત્તમ ગ્રહોની શક્તિ.' },
    ta: { nav: 'நவாம்சம் (D9)', name: 'நவாம்சம் (D9)', title: 'நவாம்சம் (D9) சக்கரம் – திருமண வாழ்க்கை மற்றும் பலன்கள் | கிரகவாணி', desc: 'உங்கள் நவாம்ச சக்கரத்தை கணித்து வர்கோத்தம கிரகங்களை அறியுங்கள்.' },
    te: { nav: 'నవాంశ (D9)', name: 'నవాంశ చక్రం', title: 'నవాంశ చక్రం (D9) – వర్గోత్తమ గ్రహాలు మరియు వివాహ జీవితం | గ్రహవాణి', desc: 'మీ నవాంశ చక్రాన్ని విశ్లేషించి వివాహ బలాన్ని తెలుసుకోండి.' },
    kn: { nav: 'ನವಾಂಶ (D9)', name: 'ನವಾಂಶ ಚಾರ್ಟ್', title: 'ನವಾಂಶ (D9) ಚಾರ್ಟ್ – ವರ್ಗೋತ್ತಮ ಗ್ರಹಗಳು ಮತ್ತು ವಿವಾಹ ಜೀವನ | ಗ್ರಹವಾಣಿ', desc: 'ನಿಮ್ಮ ನವಾಂಶ ಕುಂಡಲಿಯನ್ನು ರಚಿಸಿ ವರ್ಗೋತ್ತಮ ಗ್ರಹಗಳ ಬಲವನ್ನು ತಿಳಿಯಿರಿ.' }
  },
  ashtakavarga: {
    en: { nav: 'Ashtakavarga', name: 'Ashtakavarga Calculator', title: 'Ashtakavarga Points Calculator – SAV & BAV House Strengths | Grahavani', desc: 'Calculate Samudayashtakavarga (SAV) points for all 12 houses. Discover your strongest houses for wealth, career, and gains.' },
    hi: { nav: 'अष्टकवर्ग', name: 'अष्टकवर्ग कैलकुलेटर', title: 'अष्टकवर्ग कैलकुलेटर – सभी 12 भावों के शुभ बिंदु (SAV) | ग्रहवाणी', desc: 'कुंडली के 12 भावों के कुल 337 शुभ बिंदुओं की गणना। धन भाव, लाभ भाव और करियर की शक्ति का सटीक विश्लेषण।' },
    gu: { nav: 'અષ્ટકવર્ગ', name: 'અષ્ટકવર્ગ કેલ્ક્યુલેટર', title: 'અષ્ટકવર્ગ કેલ્ક્યુલેટર – 12 ભાવોના શુભ બિંદુઓ (SAV) | ગ્રહવાણી', desc: 'કુંડળીના 12 ભાવોના અષ્ટકવર્ગ પોઈન્ટ્સ અને ધન સંચય ક્ષમતા.' },
    ta: { nav: 'அஷ்டகவர்க்கம்', name: 'அஷ்டகவர்க்கம்', title: 'அஷ்டகவர்க்க கால்குலேட்டர் – 12 பாவங்களின் பலம் | கிரகவாணி', desc: 'அனைத்து 12 பாவங்களின் அஷ்டகவர்க்க புள்ளிகளை துல்லியமாக கணக்கிடுங்கள்.' },
    te: { nav: 'అష్టకవర్గ', name: 'అష్టకవర్గ కాలిక్యులేటర్', title: 'అష్టకవర్గ కాలిక్యులేటర్ – 12 భావాల బలం | గ్రహవాణి', desc: 'సముదాయాష్టకవర్గ బిందువుల ఆధారంగా ధన, ఉద్యోగ స్థానాల బలాన్ని తెలుసుకోండి.' },
    kn: { nav: 'ಅಷ್ಟಕವರ್ಗ', name: 'ಅಷ್ಟಕವರ್ಗ ಕ್ಯಾಲ್ಕುಲೇಟರ್', title: 'ಅಷ್ಟಕವರ್ಗ ಕ್ಯಾಲ್ಕುಲೇಟರ್ – 12 ಭಾವಗಳ ಬಿಂದುಗಳು | ಗ್ರಹವಾಣಿ', desc: 'ಎಲ್ಲಾ 12 ಮನೆಗಳ ಅಷ್ಟಕವರ್ಗ ಬಿಂದುಗಳ ನಿಖರ ಲೆಕ್ಕಾಚಾರ.' }
  },
  varshphal: {
    en: { nav: 'Varshphal (Year Chart)', name: 'Varshphal', title: 'Varshphal Calculator – Tajika Annual Solar Return Horoscope | Grahavani', desc: 'Calculate your annual Solar Return Varshphal chart, Muntha sign, Muntha lord, and annual forecast for any year.' },
    hi: { nav: 'वर्षफल (वार्षिक राशिफल)', name: 'वर्षफल कैलकुलेटर', title: 'वर्षफल कैलकुलेटर – ताजिक वर्षफल, मुंथा व वार्षिक भविष्यवाणी | ग्रहवाणी', desc: 'अपने जन्मदिन पर बनने वाली वर्ष कुंडली बनाएं। जानिए इस वर्ष की मुंथा, मुंथेश और वर्षफल का सम्पूर्ण विश्लेषण।' },
    gu: { nav: 'વર્ષફળ (વાર્ષિક કુંડળી)', name: 'વર્ષફળ કેલ્ક્યુલેટર', title: 'વાર્ષિક વર્ષફળ કેલ્ક્યુલેટર – મુન્થા અને વાર્ષિક આગાહી | ગ્રહવાણી', desc: 'તાજિક પદ્ધતિથી તમારી વાર્ષિક કુંડળી અને મુન્થા ફળ જાણો.' },
    ta: { nav: 'வருட பலன்', name: 'வருட பலன்', title: 'வருட ஜாதகம் – தாஜிக முறைப்படி உங்கள் ஆண்டு பலன்கள் | கிரகவாணி', desc: 'உங்கள் பிறந்தநாளை அடிப்படையாகக் கொண்ட வருடாந்திர ஜாதக பலன்கள்.' },
    te: { nav: 'వర్షఫలం', name: 'వర్షఫలం', title: 'వర్షఫల కాలిక్యులేటర్ – వార్షిక జాతకం మరియు ముంథా | గ్రహవాణి', desc: 'తాజిక పద్ధతిలో మీ వార్షిక జాతకం మరియు ఫలితాలు.' },
    kn: { nav: 'ವರ್ಷಫಲ', name: 'ವರ್ಷಫಲ', title: 'ವರ್ಷಫಲ ಕ್ಯಾಲ್ಕುಲೇಟರ್ – ಮುಂಥಾ ಮತ್ತು ವಾರ್ಷಿಕ ಭವಿಷ್ಯ | ಗ್ರಹವಾಣಿ', desc: 'ನಿಮ್ಮ ಹುಟ್ಟುಹಬ್ಬದ ಆಧಾರದ ಮೇಲೆ ವಾರ್ಷಿಕ ಜಾತಕ ಮತ್ತು ಮುಂಥಾ ಫಲ.' }
  },
  ratna: {
    en: { nav: 'Gemstone Finder', name: 'Gemstone Finder', title: 'Vedic Gemstone Recommender – Life, Lucky & Benefic Stones | Grahavani', desc: 'Find your Life Stone (Jeevan Ratna), Lucky Stone (Bhagya Ratna), and Benefic Stone based on your Lagna with wearing rules and mantras.' },
    hi: { nav: 'रत्न परामर्श', name: 'रत्न परामर्श', title: 'राशि रत्न परामर्श – जीवन रत्न, भाग्य रत्न व कारक रत्न | ग्रहवाणी', desc: 'अपने लग्न के अनुसार जीवन रत्न, भाग्य रत्न और कारक रत्न जानें। धारण करने की विधि, धातु, अंगुली व प्राण-प्रतिष्ठा मंत्र।' },
    gu: { nav: 'રત્ન પરામર્શ', name: 'રત્ન પરામર્શ', title: 'રાશિ રત્ન પરામર્શ – જીવન રત્ન અને ભાગ્ય રત્ન | ગ્રહવાણી', desc: 'તમારા લગ્ન અનુસાર અનુકૂળ રત્ન, ધારણ કરવાની વિધિ અને મંત્ર.' },
    ta: { nav: 'ராசி ரத்தினம்', name: 'ரத்தின பரிந்துரை', title: 'ராசி ரத்தின பரிந்துரை – அதிர்ஷ்ட ரத்தினங்கள் | கிரகவாணி', desc: 'உங்கள் லக்னத்திற்கு ஏற்ற அதிர்ஷ்ட ரத்தினங்கள் மற்றும் அணியும் முறைகள்.' },
    te: { nav: 'రత్న సూచన', name: 'రత్న సూచన', title: 'రాశి రత్న సూచన – అదృష్ట రత్నాలు మరియు ధారణ విధి | గ్రహవాణి', desc: 'మీ లగ్నానికి అనుకూలమైన రత్నాలు మరియు పూజా విధానం.' },
    kn: { nav: 'ರತ್ನ ಶಿಫಾರಸು', name: 'ರತ್ನ ಶಿಫಾರಸು', title: 'ರಾಶಿ ರತ್ನ ಶಿಫಾರಸು – ಅದೃಷ್ಟ ರತ್ನಗಳು | ಗ್ರಹವಾಣಿ', desc: 'ನಿಮ್ಮ ಲಗ್ನಕ್ಕೆ ಅನುಗುಣವಾದ ಅದೃಷ್ಟ ರತ್ನಗಳು ಮತ್ತು ಧರಿಸುವ ನಿಯಮಗಳು.' }
  },
  sarpa: {
    en: { nav: 'Kaal Sarp Dosha', name: 'Kaal Sarp Checker', title: 'Kaal Sarp Dosha Calculator – 12 Types & Cancellation Check | Grahavani', desc: 'Check whether your birth chart has Poorna or Anshik Kaal Sarp Dosha. Identify your exact type among the 12 classical forms with remedies.' },
    hi: { nav: 'कालसर्प दोष', name: 'कालसर्प दोष चेकर', title: 'कालसर्प दोष कैलकुलेटर – 12 प्रकार, पूर्ण व आंशिक परीक्षण | ग्रहवाणी', desc: 'कुंडली में राहु-केतु अक्ष की जांच करें। जानिए 12 प्रकार के कालसर्प दोष, लक्षण और भगवान शिव के अचूक शांति उपाय।' },
    gu: { nav: 'કાલસર્પ દોષ', name: 'કાલસર્પ દોષ ચેકર', title: 'કાલસર્પ દોષ કેલ્ક્યુલેટર – 12 પ્રકારો અને ઉપાયો | ગ્રહવાણી', desc: 'તમારી કુંડળીમાં કાલસર્પ યોગ છે કે નહીં તેની સચોટ ચકાસણી.' },
    ta: { nav: 'காலசர்ப்ப தோஷம்', name: 'காலசர்ப்ப தோஷம்', title: 'காலசர்ப்ப தோஷம் கால்குலேட்டர் – 12 வகைகள் மற்றும் பரிகாரங்கள் | கிரகவாணி', desc: 'உங்கள் ஜாதகத்தில் உள்ள காலசர்ப்ப தோஷத்தை பரிசோதித்து பரிகாரங்களை அறியுங்கள்.' },
    te: { nav: 'కాలసర్ప దోషం', name: 'కాలసర్ప దోషం', title: 'కాలసర్ప దోష కాలిక్యులేటర్ – 12 రకాలు మరియు నివారణలు | గ్రహవాణి', desc: 'మీ జాతకంలో కాలసర్ప దోషం ఉందో లేదో ఖచ్చితంగా తెలుసుకోండి.' },
    kn: { nav: 'ಕಾಲಸರ್ಪ ದೋಷ', name: 'ಕಾಲಸರ್ಪ ದೋಷ', title: 'ಕಾಲಸರ್ಪ ದೋಷ ಕ್ಯಾಲ್ಕುಲೇಟರ್ – 12 ವಿಧಗಳು ಮತ್ತು ಪರಿಹಾರ | ಗ್ರಹವಾಣಿ', desc: 'ನಿಮ್ಮ ಕುಂಡಲಿಯಲ್ಲಿ ಕಾಲಸರ್ಪ ದೋಷವಿದೆಯೇ ಎಂದು ಪರೀಕ್ಷಿಸಿ.' }
  },
  hora: {
    en: { nav: 'Hora Timings', name: 'Hora Timings', title: 'Live 24-Hour Planetary Hora – Real-Time Auspicious Hours | Grahavani', desc: 'Live planetary Hora calculator based on local sunrise and sunset. Discover auspicious hours for finance, contracts, romance, and travel.' },
    hi: { nav: 'आज का होरा', name: 'दैनिक होरा', title: 'आज का होरा मुहूर्त – 24 घंटे का लाइव ग्रह होरा चक्र | ग्रहवाणी', desc: 'स्थानीय सूर्योदय पर आधारित दिन और रात के 24 होरा का लाइव समय। जानिए किस कार्य के लिए कौन सी होरा शुभ है।' },
    gu: { nav: 'આજનો હોરા', name: 'દૈનિક હોરા', title: 'આજનો હોરા મુહૂર્ત – લાઈવ 24 કલાકનો ગ્રહ હોરા | ગ્રહવાણી', desc: 'સૂર્યોદય પર આધારિત દિવસ અને રાતના 24 હોરાના શુભ ચોઘડિયા જેવો સમય.' },
    ta: { nav: 'ஹோரை நேரம்', name: 'ஹோரை நேரம்', title: 'இன்றைய ஹோரை நேரம் – 24 மணி நேர கிரக ஹோரை | கிரகவாணி', desc: 'சூரியோதயத்தின் அடிப்படையில் துல்லியமான சுப ஹோரை நேரங்கள்.' },
    te: { nav: 'హోరా సమయాలు', name: 'హోరా సమయాలు', title: 'ఈ రోజు హోరా సమయాలు – 24 గంటల గ్రహ హోరా చక్రం | గ్రహవాణి', desc: 'సూర్యోదయం ఆధారంగా శుభ కార్యాలకు అనుకూలమైన హోరా సమయాలు.' },
    kn: { nav: 'ಹೋರಾ ಸಮಯ', name: 'ಹೋರಾ ಸಮಯ', title: 'ಇಂದಿನ ಹೋರಾ ಸಮಯ – 24 ಗಂಟೆಗಳ ಗ್ರಹ ಹೋರಾ ಚಕ್ರ | ಗ್ರಹವಾಣಿ', desc: 'ಸ್ಥಳೀಯ ಸೂರ್ಯೋದಯ ಆಧಾರಿತ ಶುಭ ಕಾರ್ಯಗಳ ಹೋರಾ ಸಮಯಗಳು.' }
  }
};

const LANGS = ['en', 'hi', 'gu', 'ta', 'te', 'kn'];

for (const lang of LANGS) {
  const file = path.join(ROOT, 'locales', `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  data.nav = data.nav || {};
  data.pages = data.pages || {};
  data.info = data.info || {};

  for (const [id, meta] of Object.entries(MODULES_META)) {
    const lMeta = meta[lang] || meta.en;
    data.nav[id] = lMeta.nav;
    data.pages[id] = {
      name: lMeta.name,
      title: lMeta.title,
      description: lMeta.desc
    };
    data.info[id] = [
      {
        h: lMeta.name + ' Guide',
        p: [
          lMeta.desc,
          'Calculated using high-precision Drik Ganita and NASA JPL ephemeris principles with exact Chitra Paksha (Lahiri) Ayanamsha.'
        ]
      }
    ];
  }

  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated locales/${lang}.json successfully.`);
}

console.log('All 12 modules configured across site.js, build.js and locales!');
