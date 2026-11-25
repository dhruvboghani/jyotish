const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'locales');
const langs = ['en', 'hi', 'gu', 'ta', 'te', 'kn'];

// Nav translations
const NAV_MAP = {
  moles: { en: 'Mole Reading', hi: 'तिल विचार', gu: 'તલ વિચાર', ta: 'மச்ச சாஸ்திரம்', te: 'మచ్చల శాస్త్రం', kn: 'ಮಚ್ಚೆ ಶಾಸ್ತ್ರ' },
  forehead: { en: 'Forehead Lines', hi: 'भाल रेखा', gu: 'ભાલ રેખા', ta: 'நெற்றி ரேகை', te: 'నుదుటి రేఖలు', kn: 'ಹಣೆಯ ರೇಖೆಗಳು' },
  signature: { en: 'Signature Analysis', hi: 'हस्ताक्षर शास्त्र', gu: 'હસ્તાક્ષર વિશ્લેષણ', ta: 'கையெழுத்து சாஸ்திரம்', te: 'సంతక విశ్లేషణ', kn: 'ಸಹಿ ವಿಶ್ಲೇಷಣೆ' },
  thumb: { en: 'Thumb & Nadi', hi: 'अंगुष्ठ नाड़ी', gu: 'અંગુષ્ઠ નાડી', ta: 'பெருவிரல் நாடி', te: 'బొటనవేలి నాడీ', kn: 'ಹೆಬ್ಬೆರಳು ನಾಡಿ' },
  foot: { en: 'Foot Reading', hi: 'पाद सामुद्रिक', gu: 'પાદ સામુદ્રિક', ta: 'பாத சாஸ்திரம்', te: 'పాద సాముద్రికం', kn: 'ಪಾದ ಸಾಮುದ್ರಿಕ' },
  eye: { en: 'Eye Reading', hi: 'नेत्र सामुद्रिक', gu: 'નેત્ર સામુદ્રિક', ta: 'நேத்ர சாஸ்திரம்', te: 'నేత్ర సాముద్రికం', kn: 'ನೇತ್ರ ಸಾಮುದ್ರಿಕ' },
  dreamcalc: { en: 'Dream Calculator', hi: 'स्वप्न कैलकुलेटर', gu: 'સ્વપ્ન કેલ્ક્યુલેટર', ta: 'கனவு கணிப்பான்', te: 'స్వప్న కాలిక్యులేటర్', kn: 'ಸ್ವಪ್ನ ಕ್ಯಾಲ್ಕುಲೇಟರ್' }
};

// Tools translations
const TOOLS_MAP = {
  moles: {
    en: { h: 'Mole Astrology (Til Vichar)', p: 'Vedic body and face mole analysis for karmic fortune and wealth.' },
    hi: { h: 'तिल विचार (सामुद्रिक शास्त्र)', p: 'चेहरे और शरीर के तिलों से जानें अपना भाग्य, धन और स्वभाव।' },
    gu: { h: 'તલ વિચાર (સામુદ્રિક શાસ્ત્ર)', p: 'ચહેરા અને શરીરના તલ પરથી જાણો ભાગ્ય, ધન અને સ્વભાવ.' },
    ta: { h: 'மச்ச சாஸ்திரம்', p: 'உடல் மற்றும் முக மச்சங்கள் மூலம் உங்கள் அதிர்ஷ்டம் மற்றும் செல்வத்தை அறியுங்கள்.' },
    te: { h: 'మచ్చల శాస్త్రం (తిల విచారం)', p: 'ముఖం మరియు శరీర మచ్చల ద్వారా మీ అదృష్టం, ధనం మరియు స్వభావాన్ని తెలుసుకోండి.' },
    kn: { h: 'ಮಚ್ಚೆ ಶಾಸ್ತ್ರ (ತಿಲ ವಿಚಾರ)', p: 'ಮುಖ ಮತ್ತು ದೇಹದ ಮಚ್ಚೆಗಳಿಂದ ನಿಮ್ಮ ಅದೃಷ್ಟ, ಸಂಪತ್ತು ಮತ್ತು ಸ್ವಭಾವವನ್ನು ತಿಳಿಯಿರಿ.' }
  },
  forehead: {
    en: { h: 'Forehead Reading (Bhāla Rekha)', p: '7-planet forehead line scanner for intellect, longevity, and fate.' },
    hi: { h: 'भाल रेखा (माथे की रेखाएं)', p: 'माथे की 7 ग्रहीय रेखाओं से जानें आयु, बुद्धि, अधिकार और राजयोग।' },
    gu: { h: 'ભાલ રેખા (કપાળની રેખાઓ)', p: 'કપાળની 7 ગ્રહીય રેખાઓથી જાણો આયુષ્ય, બુદ્ધિ અને રાજયોગ.' },
    ta: { h: 'நெற்றி ரேகை சாஸ்திரம்', p: 'நெற்றியின் 7 கிரக ரேகைகள் மூலம் ஆயுள், அறிவு மற்றும் யோகத்தை அறியுங்கள்.' },
    te: { h: 'నుదుటి రేఖల శాస్త్రం', p: 'నుదుటి 7 గ్రహ రేఖల ద్వారా ఆయుష్షు, బుద్ధి మరియు రాజయోగాన్ని తెలుసుకోండి.' },
    kn: { h: 'ಹಣೆಯ ರೇಖೆಗಳು (ಭಾಲ ರೇಖೆ)', p: 'ಹಣೆಯ 7 ಗ್ರಹ ರೇಖೆಗಳಿಂದ ಆಯುಷ್ಯ, ಬುದ್ಧಿ ಮತ್ತು ರಾಜಯೋಗವನ್ನು ತಿಳಿಯಿರಿ.' }
  },
  signature: {
    en: { h: 'Lucky Signature (Hastakshar)', p: 'Analyze signature slant, baseline, and loops for prosperity and confidence.' },
    hi: { h: 'हस्ताक्षर विश्लेषण (हस्ताक्षर वास्तु)', p: 'अपने हस्ताक्षर के झुकाव, आकार और रेखाओं से जानें वित्तीय समृद्धि और भाग्य।' },
    gu: { h: 'હસ્તાક્ષર વિશ્લેષણ (હસ્તાક્ષર વાસ્તુ)', p: 'સહીના ઢોળાવ, અક્ષરો અને રેખાઓ પરથી જાણો નાણાકીય સમૃદ્ધિ અને પ્રગતિ.' },
    ta: { h: 'கையெழுத்து சாஸ்திரம்', p: 'உங்கள் கையெழுத்தின் சாய்வு மற்றும் அமைப்பிலிருந்து அதிர்ஷ்டத்தை அறியுங்கள்.' },
    te: { h: 'సంతక విశ్లేషణ (హస్తాక్షర శాస్త్రం)', p: 'మీ సంతకం వాలు, పరిమాణం మరియు రేఖల ద్వారా ఆర్థిక పురోగతిని తెలుసుకోండి.' },
    kn: { h: 'ಸಹಿ ವಿಶ್ಲೇಷಣೆ (ಹಸ್ತಾಕ್ಷರ ವಾಸ್ತು)', p: 'ನಿಮ್ಮ ಸಹಿಯ ಇಳಿಜಾರು, ರೇಖೆಗಳು ಮತ್ತು ಅಕ್ಷರಗಳಿಂದ ಆರ್ಥಿಕ ಸಮೃದ್ಧಿ ತಿಳಿಯಿರಿ.' }
  },
  thumb: {
    en: { h: 'Nadi Thumbprint (Angustha Rekha)', p: 'Sacred Chakra, Shankha, and Dhwaja ridge patterns for destiny archetype.' },
    hi: { h: 'अंगुष्ठ नाड़ी (अंगूठे की छाप)', p: 'चक्र, शंख, ध्वज और गदा की छाप से पहचानें अपना नाड़ी भाग्य और जन्म उद्देश्य।' },
    gu: { h: 'અંગુષ્ઠ નાડી (અંગૂઠાની છાપ)', p: 'ચક્ર, શંખ, ધ્વજ છાપ પરથી ઓળખો તમારું નાડી ભાગ્ય અને જીવન લક્ષ્ય.' },
    ta: { h: 'பெருவிரல் நாடி சாஸ்திரம்', p: 'சக்கரம், சங்கு, கொடி ரேகை அமைப்புகளிலிருந்து உங்கள் வாழ்க்கை விதியை அறியுங்கள்.' },
    te: { h: 'బొటనవేలి నాడీ ముద్ర', p: 'చక్రం, శంఖం, ధ్వజ ముద్రల ద్వారా మీ నాడీ జ్యోతిష్య విధిని తెలుసుకోండి.' },
    kn: { h: 'ಹೆಬ್ಬೆರಳು ನಾಡಿ ಮುದ್ರೆ', p: 'ಚಕ್ರ, ಶಂಖ, ಧ್ವಜ ಗುರುತುಗಳಿಂದ ನಿಮ್ಮ ನಾಡಿ ಜ್ಯೋತಿಷ್ಯ ವಿಧಿಯನ್ನು ತಿಳಿಯಿರಿ.' }
  },
  foot: {
    en: { h: 'Foot Reading (Pāda Samudrika)', p: 'Sole arch, toe alignments, and auspicious markings for travel and success.' },
    hi: { h: 'पाद सामुद्रिक (पैरों के लक्षण)', p: 'तलवों की बनावट, उंगलियों के अनुपात और पद चिन्हों से जानें यात्रा और कर्म।' },
    gu: { h: 'પાદ સામુદ્રિક (પગના લક્ષણ)', p: 'પગના તળિયા, આંગળીઓ અને પદ્મ-શંખ ચિહ્નો પરથી જાણો કારકિર્દી અને પ્રવાસ.' },
    ta: { h: 'பாத சாமுத்ரிகா சாஸ்திரம்', p: 'உள்ளங்கால் வளைவு, கால் விரல்கள் மற்றும் சுப குறிகள் மூலம் தொழில் மற்றும் பயணத்தை அறியுங்கள்.' },
    te: { h: 'పాద సాముద్రిక శాస్త్రం', p: 'అరికాళ్ల ఆకారం, వేళ్ల పొడవు మరియు శుభ చిహ్నాల ద్వారా మీ ప్రయాణాలు, విజయం తెలుసుకోండి.' },
    kn: { h: 'ಪಾದ ಸಾಮುದ್ರಿಕ ಶಾಸ್ತ್ರ', p: 'ಅಂಗಾಲಿನ ರಚನೆ, ಬೆರಳುಗಳ ಗಾತ್ರ ಮತ್ತು ಶುಭ ಚಿಹ್ನೆಗಳಿಂದ ಪ್ರಯಾಣ ಮತ್ತು ವಿಜಯ ತಿಳಿಯಿರಿ.' }
  },
  eye: {
    en: { h: 'Vedic Eye Reading (Netra Samudrika)', p: 'Identify your soul archetype: Lotus, Deer, Fish, Eagle, or Elephant eyes.' },
    hi: { h: 'नेत्र सामुद्रिक (आँखों का विश्लेषण)', p: 'कमल, मृग, मत्स्य, गरुड़ और गज नयनों से पहचानें अपनी आत्मा और आंतरिक स्वभाव।' },
    gu: { h: 'નેત્ર સામુદ્રિક (આંખોનું વિશ્લેષણ)', p: 'કમળ, મૃગ, મત્સ્ય, ગરુડ અને ગજ નયનોથી ઓળખો તમારો આંતરિક સ્વભાવ.' },
    ta: { h: 'நேத்ர சாஸ்திரம் (கண் அமைப்பு)', p: 'தாமரை, மான், மீன், கழுகு கண்களின் வடிவங்கள் மூலம் உங்கள் மனப்பான்மையை அறியுங்கள்.' },
    te: { h: 'నేత్ర సాముద్రికం (కళ్ల విశ్లేషణ)', p: 'కమల, మృగ, మత్స్య, గరుడ నేత్రాల ద్వారా మీ అంతర్గత స్వభావాన్ని తెలుసుకోండి.' },
    kn: { h: 'ನೇತ್ರ ಸಾಮುದ್ರಿಕ (ಕಣ್ಣಿನ ವಿಶ್ಲೇಷಣೆ)', p: 'ಕಮಲ, ಮೃಗ, ಮತ್ಸ್ಯ, ಗರುಡ ಕಣ್ಣಿನ ಆಕಾರಗಳಿಂದ ನಿಮ್ಮ ಆಂತರಿಕ ಸ್ವಭಾವ ತಿಳಿಯಿರಿ.' }
  },
  dreamcalc: {
    en: { h: 'Dream Interpreter (Swapna Shastra)', p: 'Timing calculator and Vedic meanings for nocturnal omens and dreams.' },
    hi: { h: 'स्वप्न फल कैलकुलेटर (स्वप्न शास्त्र)', p: 'सपने देखने का प्रहर और समय डालकर जानें फल मिलने का निश्चित समय और उपाय।' },
    gu: { h: 'સ્વપ્ન ફળ કેલ્ક્યુલેટર (સ્વપ્ન શાસ્ત્ર)', p: 'સ્વપ્નનો પ્રહર અને સમય નાખીને જાણો તેનું પરિણામ અને શાસ્ત્રોક્ત ઉપાય.' },
    ta: { h: 'கனவு பலன் கணிப்பான்', p: 'கனவு கண்ட நேரத்தை உள்ளிட்டு பலன் கிடைக்கும் காலம் மற்றும் பரிகாரங்களை அறியுங்கள்.' },
    te: { h: 'స్వప్న కాలిక్యులేటర్ (స్వప్న శాస్త్రం)', p: 'కల వచ్చిన సమయం ఆధారంగా అది ఎప్పుడు ఫలిస్తుందో మరియు పరిహారాలు తెలుసుకోండి.' },
    kn: { h: 'ಸ್ವಪ್ನ ಫಲ ಕ್ಯಾಲ್ಕುಲೇಟರ್', p: 'ಕನಸು ಕಂಡ ಸಮಯದ ಆಧಾರದ ಮೇಲೆ ಫಲ ಸಿಗುವ ಸಮಯ ಮತ್ತು ಶಾಸ್ತ್ರೋಕ್ತ ಪರಿಹಾರ ತಿಳಿಯಿರಿ.' }
  }
};

// Pages meta translations
const PAGES_MAP = {
  moles: {
    en: { name: 'Mole Reading', title: 'Til Vichar – Vedic Mole Astrology & Body Mark Meaning | Grahavani', description: 'Interactive Vedic mole astrology (Til Vichar Shastra) for face and body. Discover destiny, wealth, relationships, and hidden personality.' },
    hi: { name: 'तिल विचार', title: 'तिल विचार – सामुद्रिक शास्त्र के अनुसार शरीर के तिलों का रहस्य | ग्रहवाणी', description: 'चेहरे और शरीर के तिलों का सटीक सामुद्रिक शास्त्र विश्लेषण। जानें धन, भाग्य, विवाह और करियर का भविष्यफल।' },
    gu: { name: 'તલ વિચાર', title: 'તલ વિચાર – સામુદ્રિક શાસ્ત્ર અનુસાર શરીરના તલનું રહસ્ય | ગ્રહવાણી', description: 'ચહેરા અને શરીરના તલનું સામુદ્રિક શાસ્ત્ર વિશ્લેષણ. જાણો ધન, પ્રગતિ, લગ્નજીવન અને ભાગ્ય.' },
    ta: { name: 'மச்ச சாஸ்திரம்', title: 'மச்ச சாஸ்திரம் – உடல் மற்றும் முக மச்ச பலன்கள் | கிரகவாணி', description: 'வேத மச்ச சாஸ்திரம் மூலம் உங்கள் முக மற்றும் உடல் மச்சங்களின் பலன்களைத் துல்லியமாக அறியுங்கள்.' },
    te: { name: 'మచ్చల శాస్త్రం', title: 'తిల విచారం – శరీర మచ్చల జ్యోతిష్య రహస్యాలు | గ్రహవాణి', description: 'సముద్రిక శాస్త్రం ప్రకారం ముఖం మరియు శరీర మచ్చల ఫలితాలు, ధనం మరియు అదృష్ట విశ్లేషణ.' },
    kn: { name: 'ಮಚ್ಚೆ ಶಾಸ್ತ್ರ', title: 'ತಿಲ ವಿಚಾರ – ದೇಹದ ಮಚ್ಚೆಗಳ ಜ್ಯೋತಿಷ್ಯ ರಹಸ್ಯ | ಗ್ರಹವಾಣಿ', description: 'ಸಾಮುದ್ರಿಕ ಶಾಸ್ತ್ರದ ಪ್ರಕಾರ ಮುಖ ಮತ್ತು ದೇಹದ ಮಚ್ಚೆಗಳ ಶುಭ-ಅಶುಭ ಫಲಗಳು ಮತ್ತು ಅದೃಷ್ಟ ವಿಶ್ಲೇಷಣೆ.' }
  },
  forehead: {
    en: { name: 'Forehead Reading', title: 'Bhāla Rekha – Vedic Forehead Line Reading & Planetary Scanner | Grahavani', description: 'Scan and analyze the 7 planetary forehead lines with Vedic Samudrika Shastra. Uncover wisdom, authority, and life path.' },
    hi: { name: 'भाल रेखा', title: 'भाल रेखा – माथे की 7 ग्रहीय रेखाओं का सामुद्रिक शास्त्र विश्लेषण | ग्रहवाणी', description: 'माथे की 7 ग्रहों की रेखाओं (शनि, गुरु, मंगल, सूर्य, शुक्र, बुध, चंद्र) से जानें आयु, पद, मान-सम्मान और भाग्य।' },
    gu: { name: 'ભાલ રેખા', title: 'ભાલ રેખા – કપાળની ૭ ગ્રહીય રેખાઓનું સામુદ્રિક વિશ્લેષણ | ગ્રહવાણી', description: 'કપાળની ૭ ગ્રહોની રેખાઓથી જાણો આયુષ્ય, બુદ્ધિ, સરકારી હોદ્દો અને જીવન પથ.' },
    ta: { name: 'நெற்றி ரேகை', title: 'நெற்றி ரேகை – 7 கிரக ரேகைகளின் சாமுத்ரிகா பலன்கள் | கிரகவாணி', description: 'நெற்றியில் உள்ள 7 கிரக ரேகைகளை ஸ்கேன் செய்து ஆயுள் மற்றும் தலைமை யோகத்தை அறியுங்கள்.' },
    te: { name: 'నుదుటి రేఖలు', title: 'భాల రేఖ – నుదుటి 7 గ్రహ రేఖల సాముద్రిక విశ్లేషణ | గ్రహవాణి', description: 'నుదుటిపై ఉండే 7 గ్రహ రేఖల ద్వారా ఆయుష్షు, అధికారం మరియు జ్ఞానాన్ని విశ్లేషించండి.' },
    kn: { name: 'ಹಣೆಯ ರೇಖೆಗಳು', title: 'ಭಾಲ ರೇಖೆ – ಹಣೆಯ 7 ಗ್ರಹ ರೇಖೆಗಳ ಸಾಮುದ್ರಿಕ ವಿಶ್ಲೇಷಣೆ | ಗ್ರಹವಾಣಿ', description: 'ಹಣೆಯ ಮೇಲಿರುವ 7 ಗ್ರಹ ರೇಖೆಗಳ ಮೂಲಕ ಆಯುಷ್ಯ, ಕೀರ್ತಿ ಮತ್ತು ರಾಜಯೋಗವನ್ನು ತಿಳಿಯಿರಿ.' }
  },
  signature: {
    en: { name: 'Signature Analysis', title: 'Hastakshar Shastra – Lucky Signature Analysis & Correction | Grahavani', description: 'Free lucky signature analyzer using Vedic graphology. Check baseline slant, loops, dots, and planetary alignment for financial success.' },
    hi: { name: 'हस्ताक्षर शास्त्र', title: 'हस्ताक्षर शास्त्र – भाग्यशाली हस्ताक्षर विश्लेषण व वास्तु सुधार | ग्रहवाणी', description: 'हस्ताक्षर के कोण, झुकाव, रेखाओं और बिंदुओं का वैज्ञानिक व वैदिक विश्लेषण। पाएं वित्तीय सफलता के लकी टिप्स।' },
    gu: { name: 'હસ્તાક્ષર શાસ્ત્ર', title: 'હસ્તાક્ષર વિશ્લેષણ – લકી સિગ્નેચર અને વાસ્તુ સુધાર | ગ્રહવાણી', description: 'સહીના એંગલ, અક્ષરોના કદ અને લીટીઓનું વૈદિક વિશ્લેષણ. કારકિર્દી અને સમૃદ્ધિ વધારવાના ઉપાય.' },
    ta: { name: 'கையெழுத்து சாஸ்திரம்', title: 'கையெழுத்து சாஸ்திரம் – அதிர்ஷ்ட கையெழுத்து அமைப்பு | கிரகவாணி', description: 'உங்கள் கையெழுத்தின் கோணம் மற்றும் வடிவங்களை ஆய்வு செய்து வெற்றிக்கான அமைப்பைப் பெறுங்கள்.' },
    te: { name: 'సంతక విశ్లేషణ', title: 'హస్తాక్షర శాస్త్రం – అదృష్ట సంతకం మరియు వాస్తు సవరణలు | గ్రహవాణి', description: 'మీ సంతకం వాలు, అక్షరాలు మరియు చుక్కల ఆధారంగా ఆర్థిక విజయం కోసం లక్కీ టిప్స్.' },
    kn: { name: 'ಸಹಿ ವಿಶ್ಲೇಷಣೆ', title: 'ಹಸ್ತಾಕ್ಷರ ಶಾಸ್ತ್ರ – ಅದೃಷ್ಟದ ಸಹಿ ಮತ್ತು ವಾಸ್ತು ತಿದ್ದುಪಡಿ | ಗ್ರಹವಾಣಿ', description: 'ನಿಮ್ಮ ಸಹಿಯ ಇಳಿಜಾರು, ರೇಖೆಗಳು ಮತ್ತು ಬಿಂದುಗಳ ಮೂಲಕ ಆರ್ಥಿಕ ಯಶಸ್ಸಿಗೆ ಲಕ್ಕಿ ಸಹಿ ರೂಪಿಸಿ.' }
  },
  thumb: {
    en: { name: 'Nadi Thumbprint', title: 'Angustha Rekha – Nadi Thumbprint & Fingerprint Analysis | Grahavani', description: 'Discover your sacred Vedic thumb impression archetype (Chakra, Shankha, Dhwaja) according to ancient Nadi Shastra.' },
    hi: { name: 'अंगुष्ठ नाड़ी', title: 'अंगुष्ठ नाड़ी – अंगूठे की छाप से नाड़ी ज्योतिषीय विश्लेषण | ग्रहवाणी', description: 'चक्र, शंख, ध्वज और गदा छाप से जानें अपनी आत्मा का नाड़ी अध्याय और प्रारब्ध कर्म।' },
    gu: { name: 'અંગુષ્ઠ નાડી', title: 'અંગુષ્ઠ નાડી – અંગૂઠાની છાપ પરથી નાડી જ્યોતિષ વિશ્લેષણ | ગ્રહવાણી', description: 'ચક્ર, શંખ અને ધ્વજ છાપ પરથી જાણો તમારા જીવનનું નાડી પ્રકરણ અને ભાગ્ય.' },
    ta: { name: 'பெருவிரல் நாடி', title: 'பெருவிரல் நாடி – கைரேகை நாடி ஜோதிட ரகசியங்கள் | கிரகவாணி', description: 'சக்கரம், சங்கு, கொடி ரேகை அமைப்புகளிலிருந்து உங்கள் நாடி அத்தியாயத்தைக் கண்டறியுங்கள்.' },
    te: { name: 'బొటనవేలి నాడీ', title: 'అంగుష్ఠ నాడీ – బొటనవేలి ముద్రతో నాడీ జ్యోతిష్య రహస్యాలు | గ్రహవాణి', description: 'చక్ర, శంఖ, ధ్వజ ముద్రల ద్వారా మీ నాడీ అధ్యాయం మరియు జీవిత లక్ష్యాన్ని తెలుసుకోండి.' },
    kn: { name: 'ಹೆಬ್ಬೆರಳು ನಾಡಿ', title: 'ಅಂಗುಷ್ಠ ನಾಡಿ – ಹೆಬ್ಬೆರಳಿನ ಮುದ್ರೆಯಿಂದ ನಾಡಿ ಜ್ಯೋತಿಷ್ಯ ರಹಸ್ಯ | ಗ್ರಹವಾಣಿ', description: 'ಚಕ್ರ, ಶಂಖ, ಧ್ವಜ ಗುರುತುಗಳಿಂದ ನಿಮ್ಮ ನಾಡಿ ಜ್ಯೋತಿಷ್ಯ ಪ್ರಮುಖ ಅಧ್ಯಾಯವನ್ನು ತಿಳಿಯಿರಿ.' }
  },
  foot: {
    en: { name: 'Foot Reading', title: 'Pāda Samudrika – Vedic Sole & Foot Reading Analysis | Grahavani', description: 'Analyze sole arch, toe lengths, and auspicious marks with ancient Vedic Pada Samudrika Shastra for travel and career predictions.' },
    hi: { name: 'पाद सामुद्रिक', title: 'पाद सामुद्रिक – पैरों के तलवों और उंगलियों का सामुद्रिक रहस्य | ग्रहवाणी', description: 'पद्म, शंख, मत्स्य चिन्ह, तलवे का धनुषाकार और उंगलियों के वैदिक अनुपात से जानें करियर व यात्रा का भविष्य।' },
    gu: { name: 'પાદ સામુદ્રિક', title: 'પાદ સામુદ્રિક – પગના તળિયા અને આંગળીઓનું સામુદ્રિક વિશ્લેષણ | ગ્રહવાણી', description: 'પદ્મ, શંખ અને મત્સ્ય ચિહ્નો તથા તળિયાના આકારથી જાણો પ્રગતિ અને વિદેશ પ્રવાસ.' },
    ta: { name: 'பாத சாஸ்திரம்', title: 'பாத சாமுத்ரிகா – உள்ளங்கால் ரேகை மற்றும் வடிவ ரகசியங்கள் | கிரகவாணி', description: 'பாத வளைவு, விரல் அமைப்புகள் மற்றும் சுப குறிகள் மூலம் தொழில் அதிர்ஷ்டத்தை அறியுங்கள்.' },
    te: { name: 'పాద సాముద్రికం', title: 'పాద సాముద్రిక శాస్త్రం – అరికాళ్ల రేఖలు మరియు పాదాల రహస్యాలు | గ్రహవాణి', description: 'అరికాళ్ల వంపు, వేళ్ల పొడవు మరియు పద్మ-శంఖ చిహ్నాల ద్వారా ఉద్యోగం, విదేశీయానం తెలుసుకోండి.' },
    kn: { name: 'ಪಾದ ಸಾಮುದ್ರಿಕ', title: 'ಪಾದ ಸಾಮುದ್ರಿಕ – ಅಂಗಾಲಿನ ರೇಖೆಗಳು ಮತ್ತು ಬೆರಳುಗಳ ರಹಸ್ಯ | ಗ್ರಹವಾಣಿ', description: 'ಅಂಗಾಲಿನ ವಕ್ರತೆ, ಬೆರಳುಗಳ ಗಾತ್ರ ಮತ್ತು ಪದ್ಮ-ಶಂಖ ಗುರುತುಗಳಿಂದ ಉದ್ಯೋಗ ಮತ್ತು ಪ್ರವಾಸ ತಿಳಿಯಿರಿ.' }
  },
  eye: {
    en: { name: 'Eye Reading', title: 'Netra Samudrika – Vedic Eye Shape & Iris Reading | Grahavani', description: 'Discover your Vedic eye archetype (Kamala, Mriga, Matsya, Garuda, Gaja) and soul temperament with Netra Samudrika Shastra.' },
    hi: { name: 'नेत्र सामुद्रिक', title: 'नेत्र सामुद्रिक – आँखों की बनावट और पुतली का सामुद्रिक रहस्य | ग्रहवाणी', description: 'कमल नयन, मृग नयन, मत्स्य नयन, गरुड़ नयन और गज नयन से जानें जातक का स्वभाव और आध्यात्मिक तेज।' },
    gu: { name: 'નેત્ર સામુદ્રિક', title: 'નેત્ર સામુદ્રિક – આંખોનો આકાર અને તેજનું સામુદ્રિક રહસ્ય | ગ્રહવાણી', description: 'કમળ, મૃગ, મત્સ્ય, ગરુડ અને ગજ નયન પરથી જાણો મનોવિજ્ઞાન અને વ્યક્તિગત પ્રકૃતિ.' },
    ta: { name: 'நேத்ர சாஸ்திரம்', title: 'நேத்ர சாமுத்ரிகா – கண் வடிவங்கள் மற்றும் ஆன்மீக ரகசியங்கள் | கிரகவாணி', description: 'தாமரை, மான், மீன், கழுகு கண்களின் வடிவங்கள் மூலம் உங்கள் உள்ளுணர்வு மற்றும் ஆன்மாவை அறியுங்கள்.' },
    te: { name: 'నేత్ర సాముద్రికం', title: 'నేత్ర సాముద్రిక శాస్త్రం – కళ్ల ఆకారం మరియు అంతర్గత స్వభావం | గ్రహవాణి', description: 'కమల, మృగ, మత్స్య, గరుడ నేత్రాల ద్వారా మనోభావాలు మరియు అంతర్గత తేజస్సును విశ్లేషించండి.' },
    kn: { name: 'ನೇತ್ರ ಸಾಮುದ್ರಿಕ', title: 'ನೇತ್ರ ಸಾಮುದ್ರಿಕ – ಕಣ್ಣಿನ ರಚನೆ ಮತ್ತು ಅಂತರಾಳದ ರಹಸ್ಯ | ಗ್ರಹವಾಣಿ', description: 'ಕಮಲ, ಮೃಗ, ಮತ್ಸ್ಯ, ಗರುಡ ಕಣ್ಣಿನ ಆಕಾರಗಳಿಂದ ಮನಸ್ಸಿನ ಆಳ ಮತ್ತು ನೈಜ ವ್ಯಕ್ತಿತ್ವ ತಿಳಿಯಿರಿ.' }
  },
  dreamcalc: {
    en: { name: 'Dream Calculator', title: 'Swapna Shastra – Vedic Dream Timing Calculator & Interpretation | Grahavani', description: 'Calculate when your dream manifests according to the Prahar (time of night) and find authentic Vedic meanings from Brihat Samhita & Agni Purana.' },
    hi: { name: 'स्वप्न फल कैलकुलेटर', title: 'स्वप्न शास्त्र – सपने के फलने का समय कैलकुलेटर व अर्थ | ग्रहवाणी', description: 'सपने के प्रहर (रात्रि का समय) के आधार पर जानें फल कितने दिनों में मिलेगा और बुरे सपनों के वैदिक शांति उपाय।' },
    gu: { name: 'સ્વપ્ન કેલ્ક્યુલેટર', title: 'સ્વપ્ન શાસ્ત્ર – સ્વપ્નનું ફળ મળવાનો સમય કેલ્ક્યુલેટર | ગ્રહવાણી', description: 'સ્વપ્નના પ્રહર અને સમય અનુસાર ગણતરી કરો કે પરિણામ ક્યારે મળશે અને અશુભ સ્વપ્નના ઉપાય.' },
    ta: { name: 'கனவு பலன் கணிப்பான்', title: 'கனவு சாஸ்திரம் – கனவு பலிக்கும் காலம் கணிக்கும் கருவி | கிரகவாணி', description: 'கனவு கண்ட நேரத்தின் அடிப்படையில் பலன் கிடைக்கும் காலத்தைக் கணித்து சாந்தி பரிகாரங்களை அறியுங்கள்.' },
    te: { name: 'స్వప్న కాలిక్యులేటర్', title: 'స్వప్న శాస్త్రం – కల ఫలించే కాల గణన మరియు ఫలితాలు | గ్రహవాణి', description: 'కల వచ్చిన ప్రహరం (రాత్రి సమయం) ఆధారంగా అది ఎన్ని రోజులలో ఫలిస్తుందో మరియు శాంతి పరిహారాలు తెలుసుకోండి.' },
    kn: { name: 'ಸ್ವಪ್ನ ಫಲ ಕ್ಯಾಲ್ಕುಲೇಟರ್', title: 'ಸ್ವಪ್ನ ಶಾಸ್ತ್ರ – ಕನಸು ಫಲಿಸುವ ಸಮಯದ ಕ್ಯಾಲ್ಕುಲೇಟರ್ | ಗ್ರಹವಾಣಿ', description: 'ಕನಸು ಕಂಡ ರಾತ್ರಿಯ ಪ್ರಹರದ ಆಧಾರದ ಮೇಲೆ ಫಲ ಸಿಗುವ ಸಮಯವನ್ನು ಲೆಕ್ಕಹಾಕಿ ಮತ್ತು ದುಃಸ್ವಪ್ನ ಶಾಂತಿ ಪರಿಹಾರ ತಿಳಿಯಿರಿ.' }
  }
};

// UI Section Dictionaries
const SECTIONS_EN = {
  moles: {
    eye: 'Samudrika Shastra · Til Vichar',
    title: 'Vedic Mole Astrology & Body Markings',
    lede: 'According to Brihat Samhita and Garuda Purana, moles (Til) and birthmarks (Lanchhan) are karmic signposts. Their location, size, and gender-side polarity reveal hidden fortunes and life trials.',
    tabFace: 'Face & Head Moles',
    tabBody: 'Body & Torso Moles',
    tabArms: 'Arms & Palms',
    genderLabel: 'Body Polarity:',
    male: 'Male (Right side auspicious)',
    female: 'Female (Left side auspicious)',
    searchHint: 'Search or tap a body region below...',
    auspicious: 'Auspicious (Shubha)',
    inauspicious: 'Caution (Ashubha)',
    neutral: 'Karmic Indicator (Madhyam)'
  },
  forehead: {
    eye: 'Samudrika Shastra · Bhāla Rekha',
    title: 'Forehead 7-Planet Line Scanner',
    lede: 'Classical Vedic physiognomy maps the 7 sacred planets across the horizontal creases of the human forehead. Discover your ruling intellectual and karmic currents.',
    startCam: 'Scan Forehead Camera',
    snapBtn: 'Capture Forehead',
    uploadBtn: 'Upload Forehead Photo',
    newScan: 'New Scan',
    flipCam: 'Flip Camera',
    hint: 'Position your forehead inside the guide frame under clear lighting and raise your eyebrows slightly to reveal natural crease lines.',
    analyzingTitle: 'Scanning Forehead Creases...',
    analyzingSub: 'Mapping 7 planetary lines (Saturn to Moon) with Vedic pixel edge profiling.',
    allLines: 'All 7 Planetary Lines'
  },
  signature: {
    eye: 'Hastakshar Shastra · Vedic Graphology',
    title: 'Lucky Signature Analyzer & Hastakshar Vastu',
    lede: 'Your signature is a direct manifestation of Mercury (Budha - intellect), Sun (Surya - self-projection), and Saturn (Shani - discipline). Check your slant, balance, and financial flow.',
    tabDraw: 'Draw Signature on Screen',
    tabUpload: 'Upload Photo of Signature',
    clearBtn: 'Clear Canvas',
    analyzeBtn: 'Analyze Signature Now',
    strokePrompt: 'Sign your name smoothly in the box above using your finger or stylus.',
    slantLabel: 'Baseline Slant:',
    loopsLabel: 'Loop & Flow:',
    dotsLabel: 'Underline & Dots:',
    scoreTitle: 'Signature Luck & Power Score',
    remedyTitle: 'Vedic Hastakshar Vastu Correction Tips'
  },
  thumb: {
    eye: 'Nadi Jyotish · Angustha Rekha',
    title: 'Nadi Thumbprint & Fingerprint Analysis',
    lede: 'In ancient Tamil Nadi Astrology, thumb impression classification connects the seeker to their destined palm-leaf chapter. Identify your sacred ridge archetype.',
    maleThumbNote: 'Traditional Rule: Men consult Right thumb; Women consult Left thumb.',
    tabSelect: 'Select Ridge Pattern',
    tabScan: 'Macro Camera Scan',
    whorl: 'Chakra (Concentric Whorl)',
    loop: 'Shankha (Sacred Conch Loop)',
    arch: 'Dhwaja (Steep Tent / Arch)',
    composite: 'Gadha (Composite / Club)',
    archetypeTitle: 'Your Nadi Destiny Archetype',
    rulingGraha: 'Governing Graha & Deity',
    strengths: 'Karmic Powers & Vocation',
    remedyTitle: 'Recommended Nadi Vedic Remedies'
  },
  foot: {
    eye: 'Samudrika Shastra · Pāda Rekha',
    title: 'Vedic Sole & Foot Reading (Pada Samudrika)',
    lede: 'From the foot markings of royalty and spiritual masters to everyday vitality: discover what your sole arch, toe balance, and sacred signs indicate about destiny and travel.',
    archH: 'Sole Arch Classification',
    archHigh: 'Deva Pada (High Arch - Spiritual & Independent)',
    archMedium: 'Manushya Pada (Balanced Arch - Pragmatic & Successful)',
    archFlat: 'Bhumi Pada (Flat Foot - Hardworking & Grounded)',
    toesH: 'Toe Length Proportions',
    toesAgni: 'Second Toe Longest (Agni Dominance - Natural Leader)',
    toesPrithvi: 'Big Toe Longest (Prithvi Dominance - Steady Wealth)',
    signsH: 'Auspicious Sacred Markings (Padatala)',
    signLotus: 'Kamala (Lotus Sign) – Abundance & Respect',
    signFish: 'Matsya (Fish Sign) – High Wealth & Ocean Travel',
    signConch: 'Shankha (Conch Sign) – Knowledge & Eloquence',
    signTrident: 'Trishul (Trident) – Divine Protection & Courage'
  },
  eye: {
    eye: 'Samudrika Shastra · Netra Vigyan',
    title: 'Vedic Eye Reading & Soul Archetype',
    lede: 'The eyes are the throne of Sun (Surya) and Moon (Chandra). Sages categorized the human gaze into 5 classical archetypes reflecting inner virtue, intuition, and leadership.',
    archetypesH: 'The 5 Sacred Vedic Eye Archetypes',
    lotusEye: 'Kamala Netra (Lotus-Shaped Eyes)',
    deerEye: 'Mriga Netra (Deer / Fawn-Shaped Eyes)',
    fishEye: 'Matsya Netra (Fish-Shaped Eyes)',
    eagleEye: 'Garuda Netra (Eagle / Piercing Eyes)',
    elephantEye: 'Gaja Netra (Elephant / Wise Eyes)',
    irisH: 'Iris Radiance & Sclera Tone',
    pupilH: 'Pupil Focus & Mental Stillness',
    remedyH: 'Eye Health & Solar Trataka Practice'
  },
  dreamcalc: {
    eye: 'Swapna Shastra · Agni Purana',
    title: 'Vedic Dream Manifestation Calculator',
    lede: 'In Vedic Swapna Shastra, the exact watch of the night (Prahar) when a dream occurs determines when and how its omen manifests in your waking life.',
    praharH: 'When did you see the dream?',
    prahar1: '1st Prahar (6 PM – 9 PM) · Manifests within 1 Year',
    prahar2: '2nd Prahar (9 PM – 12 Midnight) · Manifests within 6 to 8 Months',
    prahar3: '3rd Prahar (12 Midnight – 3 AM) · Manifests within 1 to 3 Months',
    prahar4: '4th Prahar (3 AM – 6 AM / Brahma Muhurta) · Manifests within 10 Days to Same Day',
    calcBtn: 'Calculate Manifestation & Omens',
    searchH: 'Search Vedic Dream Symbol Meaning',
    searchPlaceholder: 'Type what you saw (e.g. elephant, snake, river, temple)...',
    resultH: 'Dream Time & Karma Manifestation Period',
    badDreamH: 'Vedic Remedies for Nightmares (Dusswapna Shanti)',
    badDreamP: 'If you have experienced an unsettling or negative dream, ancient texts prescribe washing your face with fresh water, chanting the Maha Mrityunjaya Mantra 11 times, and offering grain or water to birds at sunrise.'
  }
};

for (const lang of langs) {
  const filePath = path.join(localesDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Update nav
  data.nav = data.nav || {};
  for (const k of Object.keys(NAV_MAP)) {
    data.nav[k] = NAV_MAP[k][lang] || NAV_MAP[k].en;
  }

  // 2. Update tools
  data.tools = data.tools || {};
  for (const k of Object.keys(TOOLS_MAP)) {
    data.tools[k] = TOOLS_MAP[k][lang] || TOOLS_MAP[k].en;
  }

  // 3. Update pages
  data.pages = data.pages || {};
  for (const k of Object.keys(PAGES_MAP)) {
    data.pages[k] = PAGES_MAP[k][lang] || PAGES_MAP[k].en;
  }

  // 4. Update section dicts (fallback to English for non-en for deep nested text, localized labels where available)
  for (const sec of Object.keys(SECTIONS_EN)) {
    data[sec] = Object.assign({}, SECTIONS_EN[sec], data[sec] || {});
    // localized title and eye if available in nav
    data[sec].title = PAGES_MAP[sec][lang] ? PAGES_MAP[sec][lang].name : SECTIONS_EN[sec].title;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${lang}.json`);
}
