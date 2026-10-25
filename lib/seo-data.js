/* Reference data for the search pages: cities (with names in each script), festival and vrat page lists,
   nakshatra and rudraksha facts, muhurat purposes. Names in gu/te/kn are transliterated from the Devanagari
   (hi) form unless an explicit form is given; Tamil is always explicit. */
const { translit } = require('./translit.js');

// slug | English | Devanagari | Tamil | lat | lon | IANA zone | state/country | optional te | optional kn
const CITY_ROWS = `
delhi|Delhi|दिल्ली|டெல்லி|28.6139|77.2090|Asia/Kolkata|Delhi
mumbai|Mumbai|मुंबई|மும்பை|19.0760|72.8777|Asia/Kolkata|Maharashtra
ahmedabad|Ahmedabad|अहमदाबाद|அகமதாபாத்|23.0225|72.5714|Asia/Kolkata|Gujarat
bengaluru|Bengaluru|बेंगलुरु|பெங்களூரு|12.9716|77.5946|Asia/Kolkata|Karnataka|బెంగళూరు|ಬೆಂಗಳೂರು
hyderabad|Hyderabad|हैदराबाद|ஹைதராபாத்|17.3850|78.4867|Asia/Kolkata|Telangana|హైదరాబాద్|ಹೈದರಾಬಾದ್
chennai|Chennai|चेन्नै|சென்னை|13.0827|80.2707|Asia/Kolkata|Tamil Nadu|చెన్నై|ಚೆನ್ನೈ
kolkata|Kolkata|कोलकाता|கொல்கத்தா|22.5726|88.3639|Asia/Kolkata|West Bengal
pune|Pune|पुणे|புனே|18.5204|73.8567|Asia/Kolkata|Maharashtra
surat|Surat|सूरत|சூரத்|21.1702|72.8311|Asia/Kolkata|Gujarat
jaipur|Jaipur|जयपुर|ஜெய்ப்பூர்|26.9124|75.7873|Asia/Kolkata|Rajasthan
lucknow|Lucknow|लखनऊ|லக்னோ|26.8467|80.9462|Asia/Kolkata|Uttar Pradesh
kanpur|Kanpur|कानपुर|கான்பூர்|26.4499|80.3319|Asia/Kolkata|Uttar Pradesh
nagpur|Nagpur|नागपुर|நாக்பூர்|21.1458|79.0882|Asia/Kolkata|Maharashtra
indore|Indore|इंदौर|இந்தூர்|22.7196|75.8577|Asia/Kolkata|Madhya Pradesh
thane|Thane|ठाणे|தானே|19.2183|72.9781|Asia/Kolkata|Maharashtra
bhopal|Bhopal|भोपाल|போபால்|23.2599|77.4126|Asia/Kolkata|Madhya Pradesh
visakhapatnam|Visakhapatnam|विशाखापत्तनम|விசாகப்பட்டினம்|17.6868|83.2185|Asia/Kolkata|Andhra Pradesh|విశాఖపట్నం
patna|Patna|पटना|பாட்னா|25.5941|85.1376|Asia/Kolkata|Bihar
vadodara|Vadodara|वडोदरा|வதோதரா|22.3072|73.1812|Asia/Kolkata|Gujarat
ghaziabad|Ghaziabad|गाज़ियाबाद|காசியாபாத்|28.6692|77.4538|Asia/Kolkata|Uttar Pradesh
ludhiana|Ludhiana|लुधियाना|லூதியானா|30.9010|75.8573|Asia/Kolkata|Punjab
agra|Agra|आगरा|ஆக்ரா|27.1767|78.0081|Asia/Kolkata|Uttar Pradesh
nashik|Nashik|नाशिक|நாசிக்|19.9975|73.7898|Asia/Kolkata|Maharashtra
faridabad|Faridabad|फ़रीदाबाद|பரிதாபாத்|28.4089|77.3178|Asia/Kolkata|Haryana
meerut|Meerut|मेरठ|மீரட்|28.9845|77.7064|Asia/Kolkata|Uttar Pradesh
rajkot|Rajkot|राजकोट|ராஜ்கோட்|22.3039|70.8022|Asia/Kolkata|Gujarat
varanasi|Varanasi|वाराणसी|வாரணாசி|25.3176|82.9739|Asia/Kolkata|Uttar Pradesh
srinagar|Srinagar|श्रीनगर|ஸ்ரீநகர்|34.0837|74.7973|Asia/Kolkata|Jammu and Kashmir
aurangabad|Chhatrapati Sambhajinagar (Aurangabad)|छत्रपति संभाजीनगर|சம்பாஜிநகர்|19.8762|75.3433|Asia/Kolkata|Maharashtra
amritsar|Amritsar|अमृतसर|அமிர்தசரஸ்|31.6340|74.8723|Asia/Kolkata|Punjab
navi-mumbai|Navi Mumbai|नवी मुंबई|நவி மும்பை|19.0330|73.0297|Asia/Kolkata|Maharashtra
prayagraj|Prayagraj|प्रयागराज|பிரயாக்ராஜ்|25.4358|81.8463|Asia/Kolkata|Uttar Pradesh
ranchi|Ranchi|रांची|ராஞ்சி|23.3441|85.3096|Asia/Kolkata|Jharkhand
howrah|Howrah|हावड़ा|ஹவுரா|22.5958|88.2636|Asia/Kolkata|West Bengal
coimbatore|Coimbatore|कोयंबटूर|கோயம்புத்தூர்|11.0168|76.9558|Asia/Kolkata|Tamil Nadu|కోయంబత్తూరు|ಕೊಯಮತ್ತೂರು
jabalpur|Jabalpur|जबलपुर|ஜபல்பூர்|23.1815|79.9864|Asia/Kolkata|Madhya Pradesh
gwalior|Gwalior|ग्वालियर|குவாலியர்|26.2183|78.1828|Asia/Kolkata|Madhya Pradesh
vijayawada|Vijayawada|विजयवाड़ा|விஜயவாடா|16.5062|80.6480|Asia/Kolkata|Andhra Pradesh|విజయవాడ|ವಿಜಯವಾಡ
jodhpur|Jodhpur|जोधपुर|ஜோத்பூர்|26.2389|73.0243|Asia/Kolkata|Rajasthan
madurai|Madurai|मदुरै|மதுரை|9.9252|78.1198|Asia/Kolkata|Tamil Nadu|మదురై|ಮಧುರೈ
raipur|Raipur|रायपुर|ராய்ப்பூர்|21.2514|81.6296|Asia/Kolkata|Chhattisgarh
kota|Kota|कोटा|கோட்டா|25.2138|75.8648|Asia/Kolkata|Rajasthan
guwahati|Guwahati|गुवाहाटी|குவஹாத்தி|26.1445|91.7362|Asia/Kolkata|Assam
chandigarh|Chandigarh|चंडीगढ़|சண்டிகர்|30.7333|76.7794|Asia/Kolkata|Chandigarh
solapur|Solapur|सोलापुर|சோலாப்பூர்|17.6599|75.9064|Asia/Kolkata|Maharashtra
hubballi|Hubballi|हुब्बल्ली|ஹூப்ளி|15.3647|75.1240|Asia/Kolkata|Karnataka|హుబ్బళ్ళి|ಹುಬ್ಬಳ್ಳಿ
mysuru|Mysuru|मैसूरु|மைசூரு|12.2958|76.6394|Asia/Kolkata|Karnataka|మైసూరు|ಮೈಸೂರು
tiruchirappalli|Tiruchirappalli|तिरुचिरापल्ली|திருச்சிராப்பள்ளி|10.7905|78.7047|Asia/Kolkata|Tamil Nadu|తిరుచిరాపల్లి|ತಿರುಚಿರಾಪಳ್ಳಿ
bareilly|Bareilly|बरेली|பரேலி|28.3670|79.4304|Asia/Kolkata|Uttar Pradesh
gurugram|Gurugram|गुरुग्राम|குருகிராம்|28.4595|77.0266|Asia/Kolkata|Haryana
noida|Noida|नोएडा|நொய்டா|28.5355|77.3910|Asia/Kolkata|Uttar Pradesh
jalandhar|Jalandhar|जालंधर|ஜலந்தர்|31.3260|75.5762|Asia/Kolkata|Punjab
bhubaneswar|Bhubaneswar|भुवनेश्वर|புவனேஸ்வர்|20.2961|85.8245|Asia/Kolkata|Odisha
salem|Salem|सेलम|சேலம்|11.6643|78.1460|Asia/Kolkata|Tamil Nadu|సేలం|ಸೇಲಂ
warangal|Warangal|वरंगल|வாரங்கல்|17.9689|79.5941|Asia/Kolkata|Telangana|వరంగల్
thiruvananthapuram|Thiruvananthapuram|तिरुवनंतपुरम|திருவனந்தபுரம்|8.5241|76.9366|Asia/Kolkata|Kerala
kochi|Kochi|कोच्चि|கொச்சி|9.9312|76.2673|Asia/Kolkata|Kerala
kozhikode|Kozhikode|कोझिकोड|கோழிக்கோடு|11.2588|75.7804|Asia/Kolkata|Kerala
dehradun|Dehradun|देहरादून|டேராடூன்|30.3165|78.0322|Asia/Kolkata|Uttarakhand
haridwar|Haridwar|हरिद्वार|ஹரித்வார்|29.9457|78.1642|Asia/Kolkata|Uttarakhand
rishikesh|Rishikesh|ऋषिकेश|ரிஷிகேஷ்|30.0869|78.2676|Asia/Kolkata|Uttarakhand
ujjain|Ujjain|उज्जैन|உஜ்ஜைன்|23.1765|75.7885|Asia/Kolkata|Madhya Pradesh
mathura|Mathura|मथुरा|மதுரா|27.4924|77.6737|Asia/Kolkata|Uttar Pradesh
vrindavan|Vrindavan|वृंदावन|பிருந்தாவனம்|27.5650|77.6593|Asia/Kolkata|Uttar Pradesh
ayodhya|Ayodhya|अयोध्या|அயோத்தி|26.7922|82.1998|Asia/Kolkata|Uttar Pradesh
tirupati|Tirupati|तिरुपति|திருப்பதி|13.6288|79.4192|Asia/Kolkata|Andhra Pradesh|తిరుపతి|ತಿರುಪತಿ
puri|Puri|पुरी|பூரி|19.8135|85.8312|Asia/Kolkata|Odisha
dwarka|Dwarka|द्वारका|துவாரகை|22.2394|68.9678|Asia/Kolkata|Gujarat
somnath|Somnath|सोमनाथ|சோம்நாத்|20.8880|70.4012|Asia/Kolkata|Gujarat
udaipur|Udaipur|उदयपुर|உதய்பூர்|24.5854|73.7125|Asia/Kolkata|Rajasthan
ajmer|Ajmer|अजमेर|அஜ்மீர்|26.4499|74.6399|Asia/Kolkata|Rajasthan
bikaner|Bikaner|बीकानेर|பிகானேர்|28.0229|73.3119|Asia/Kolkata|Rajasthan
nellore|Nellore|नेल्लूर|நெல்லூர்|14.4426|79.9865|Asia/Kolkata|Andhra Pradesh|నెల్లూరు
guntur|Guntur|गुंटूर|குண்டூர்|16.3067|80.4365|Asia/Kolkata|Andhra Pradesh|గుంటూరు
mangaluru|Mangaluru|मंगलुरु|மங்களூரு|12.9141|74.8560|Asia/Kolkata|Karnataka|మంగళూరు|ಮಂಗಳೂರು
belagavi|Belagavi|बेलगावी|பெலகாவி|15.8497|74.4977|Asia/Kolkata|Karnataka|బెళగావి|ಬೆಳಗಾವಿ
davanagere|Davanagere|दावणगेरे|தாவணகெரே|14.4644|75.9218|Asia/Kolkata|Karnataka|దావణగెరె|ದಾವಣಗೆರೆ
kalaburagi|Kalaburagi|कलबुर्गी|கலபுர்கி|17.3297|76.8343|Asia/Kolkata|Karnataka|కలబురగి|ಕಲಬುರಗಿ
shivamogga|Shivamogga|शिवमोग्गा|சிவமொக்கா|13.9299|75.5681|Asia/Kolkata|Karnataka|శివమొగ్గ|ಶಿವಮೊಗ್ಗ
udupi|Udupi|उडुपी|உடுப்பி|13.3409|74.7421|Asia/Kolkata|Karnataka|ఉడుపి|ಉಡುಪಿ
bhavnagar|Bhavnagar|भावनगर|பாவ்நகர்|21.7645|72.1519|Asia/Kolkata|Gujarat
jamnagar|Jamnagar|जामनगर|ஜாம்நகர்|22.4707|70.0577|Asia/Kolkata|Gujarat
junagadh|Junagadh|जूनागढ़|ஜூனாகத்|21.5222|70.4579|Asia/Kolkata|Gujarat
gandhinagar|Gandhinagar|गांधीनगर|காந்திநகர்|23.2156|72.6369|Asia/Kolkata|Gujarat
anand|Anand|आणंद|ஆனந்த்|22.5645|72.9289|Asia/Kolkata|Gujarat
bhuj|Bhuj|भुज|புஜ்|23.2420|69.6669|Asia/Kolkata|Gujarat
navsari|Navsari|नवसारी|நவ்சாரி|20.9467|72.9520|Asia/Kolkata|Gujarat
vapi|Vapi|वापी|வாபி|20.3893|72.9106|Asia/Kolkata|Gujarat
bharuch|Bharuch|भरूच|பரூச்|21.7051|72.9959|Asia/Kolkata|Gujarat
mehsana|Mehsana|महेसाणा|மேசானா|23.5880|72.3693|Asia/Kolkata|Gujarat
kolhapur|Kolhapur|कोल्हापुर|கோலாப்பூர்|16.7050|74.2433|Asia/Kolkata|Maharashtra
nanded|Nanded|नांदेड़|நாந்தேட்|19.1383|77.3210|Asia/Kolkata|Maharashtra
jammu|Jammu|जम्मू|ஜம்மு|32.7266|74.8570|Asia/Kolkata|Jammu and Kashmir
shimla|Shimla|शिमला|சிம்லா|31.1048|77.1734|Asia/Kolkata|Himachal Pradesh
gorakhpur|Gorakhpur|गोरखपुर|கோரக்பூர்|26.7606|83.3732|Asia/Kolkata|Uttar Pradesh
aligarh|Aligarh|अलीगढ़|அலிகர்|27.8974|78.0880|Asia/Kolkata|Uttar Pradesh
jhansi|Jhansi|झांसी|ஜான்சி|25.4484|78.5685|Asia/Kolkata|Uttar Pradesh
siliguri|Siliguri|सिलीगुड़ी|சிலிகுரி|26.7271|88.3953|Asia/Kolkata|West Bengal
cuttack|Cuttack|कटक|கட்டாக்|20.4625|85.8830|Asia/Kolkata|Odisha
bilaspur|Bilaspur|बिलासपुर|பிலாஸ்பூர்|22.0797|82.1409|Asia/Kolkata|Chhattisgarh
panaji|Panaji|पणजी|பனாஜி|15.4909|73.8278|Asia/Kolkata|Goa
puducherry|Puducherry|पुदुच्चेरी|புதுச்சேரி|11.9416|79.8083|Asia/Kolkata|Puducherry
vellore|Vellore|वेल्लोर|வேலூர்|12.9165|79.1325|Asia/Kolkata|Tamil Nadu|వేలూరు
tirunelveli|Tirunelveli|तिरुनेलवेली|திருநெல்வேலி|8.7139|77.7567|Asia/Kolkata|Tamil Nadu|తిరునెల్వేలి
thanjavur|Thanjavur|तंजावुर|தஞ்சாவூர்|10.7870|79.1378|Asia/Kolkata|Tamil Nadu|తంజావూరు|ತಂಜಾವೂರು
kanchipuram|Kanchipuram|कांचीपुरम|காஞ்சிபுரம்|12.8342|79.7036|Asia/Kolkata|Tamil Nadu
rameswaram|Rameswaram|रामेश्वरम|ராமேஸ்வரம்|9.2876|79.3129|Asia/Kolkata|Tamil Nadu
erode|Erode|ईरोड|ஈரோடு|11.3410|77.7172|Asia/Kolkata|Tamil Nadu|ఈరోడ్|ಈರೋಡ್
tiruppur|Tiruppur|तिरुप्पुर|திருப்பூர்|11.1085|77.3411|Asia/Kolkata|Tamil Nadu|తిరుప్పూర్|ತಿರುಪ್ಪೂರ್
rajahmundry|Rajahmundry|राजमहेंद्रवरम|ராஜமுந்திரி|17.0005|81.8040|Asia/Kolkata|Andhra Pradesh|రాజమహేంద్రవరం
kakinada|Kakinada|काकीनाडा|காக்கிநாடா|16.9891|82.2475|Asia/Kolkata|Andhra Pradesh|కాకినాడ
kurnool|Kurnool|कर्नूल|கர்னூல்|15.8281|78.0373|Asia/Kolkata|Andhra Pradesh|కర్నూలు
karimnagar|Karimnagar|करीमनगर|கரீம்நகர்|18.4386|79.1288|Asia/Kolkata|Telangana|కరీంనగర్
gaya|Gaya|गया|கயா|24.7955|85.0002|Asia/Kolkata|Bihar
muzaffarpur|Muzaffarpur|मुज़फ़्फ़रपुर|முசாபர்பூர்|26.1209|85.3647|Asia/Kolkata|Bihar
bhagalpur|Bhagalpur|भागलपुर|பாகல்பூர்|25.2425|86.9842|Asia/Kolkata|Bihar
durgapur|Durgapur|दुर्गापुर|துர்காபூர்|23.5204|87.3119|Asia/Kolkata|West Bengal
agartala|Agartala|अगरतला|அகர்தலா|23.8315|91.2868|Asia/Kolkata|Tripura
shillong|Shillong|शिलांग|ஷில்லாங்|25.5788|91.8933|Asia/Kolkata|Meghalaya
kathmandu|Kathmandu|काठमांडू|காத்மாண்டு|27.7172|85.3240|Asia/Kathmandu|Nepal
london|London|लंदन|லண்டன்|51.5074|-0.1278|Europe/London|United Kingdom
leicester|Leicester|लेस्टर|லெஸ்டர்|52.6369|-1.1398|Europe/London|United Kingdom
new-york|New York|न्यूयॉर्क|நியூயார்க்|40.7128|-74.0060|America/New_York|USA
new-jersey|New Jersey (Edison)|न्यू जर्सी|நியூ ஜெர்சி|40.5187|-74.4121|America/New_York|USA
chicago|Chicago|शिकागो|சிகாகோ|41.8781|-87.6298|America/Chicago|USA
houston|Houston|ह्यूस्टन|ஹூஸ்டன்|29.7604|-95.3698|America/Chicago|USA
dallas|Dallas|डलास|டல்லாஸ்|32.7767|-96.7970|America/Chicago|USA
atlanta|Atlanta|अटलांटा|அட்லாண்டா|33.7490|-84.3880|America/New_York|USA
san-francisco|San Francisco Bay Area|सैन फ्रांसिस्को|சான் பிரான்சிஸ்கோ|37.5485|-121.9886|America/Los_Angeles|USA
los-angeles|Los Angeles|लॉस एंजिल्स|லாஸ் ஏஞ்சல்ஸ்|34.0522|-118.2437|America/Los_Angeles|USA
toronto|Toronto|टोरंटो|டொராண்டோ|43.6532|-79.3832|America/Toronto|Canada
vancouver|Vancouver|वैंकूवर|வான்கூவர்|49.2827|-123.1207|America/Vancouver|Canada
dubai|Dubai|दुबई|துபாய்|25.2048|55.2708|Asia/Dubai|UAE
muscat|Muscat|मस्कट|மஸ்கட்|23.5880|58.3829|Asia/Muscat|Oman
singapore|Singapore|सिंगापुर|சிங்கப்பூர்|1.3521|103.8198|Asia/Singapore|Singapore
kuala-lumpur|Kuala Lumpur|कुआलालंपुर|கோலாலம்பூர்|3.1390|101.6869|Asia/Kuala_Lumpur|Malaysia
sydney|Sydney|सिडनी|சிட்னி|-33.8688|151.2093|Australia/Sydney|Australia
melbourne|Melbourne|मेलबर्न|மெல்போர்ன்|-37.8136|144.9631|Australia/Melbourne|Australia
auckland|Auckland|ऑकलैंड|ஆக்லாந்து|-36.8485|174.7633|Pacific/Auckland|New Zealand
nairobi|Nairobi|नैरोबी|நைரோபி|-1.2921|36.8219|Africa/Nairobi|Kenya
durban|Durban|डरबन|டர்பன்|-29.8587|31.0218|Africa/Johannesburg|South Africa
port-louis|Port Louis|पोर्ट लुई|போர்ட் லூயிஸ்|-20.1609|57.5012|Indian/Mauritius|Mauritius
`;

// Telugu and Kannada write a final halant where Hindi leaves the last consonant bare (अहमदाबाद → అహమదాబాద్)
const halant = (s, v) => s.replace(/([\u0C15-\u0C39\u0C95-\u0CB9])(?=\s|$)/g, '$1' + v);
const dn = (s, lang) => lang === 'gu' ? s.replace(/\u093C/g, '') : s.replace(/\u093C/g, '').replace(/\u0949/g, '\u093E').replace(/\u0911/g, '\u0906'); // nukta, ॉ/ऑ have no te/kn form
const GU = { ahmedabad: 'અમદાવાદ', surat: 'સુરત', mumbai: 'મુંબઈ', 'navi-mumbai': 'નવી મુંબઈ' };
const CITIES = CITY_ROWS.trim().split('\n').map(line => {
  const [slug, en, hi, ta, lat, lon, tz, region, te, kn] = line.split('|');
  return { slug, region, lat: +lat, lon: +lon, tz, india: tz === 'Asia/Kolkata', name: { en, hi, ta, gu: GU[slug] || translit('gu', dn(hi, 'gu')), te: te || halant(translit('te', dn(hi, 'te')), '\u0C4D'), kn: kn || halant(translit('kn', dn(hi, 'kn')), '\u0CCD') } };
});
const CITY = Object.fromEntries(CITIES.map(c => [c.slug, c]));
// Cities shown first in link lists (most searched)
const TOP_CITIES = ['delhi', 'mumbai', 'ahmedabad', 'bengaluru', 'hyderabad', 'chennai', 'kolkata', 'pune', 'surat', 'jaipur', 'lucknow', 'varanasi', 'indore', 'vadodara', 'rajkot', 'nagpur', 'patna', 'bhopal', 'coimbatore', 'madurai', 'vijayawada', 'visakhapatnam', 'mysuru', 'ujjain'];

// UTC offset (minutes) of an IANA zone at a UTC instant
function tzOffset(zone, ms) {
  if (zone === 'Asia/Kolkata') return 330;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute) - Math.floor(ms / 60000) * 60000) / 60000);
}
// Local calendar date (y, m, d) of a city "now", and its offset at local noon of that date
function cityToday(c, ms = Date.now(), plusDays = 0) {
  const off = tzOffset(c.tz, ms), loc = new Date(ms + off * 60000 + plusDays * 86400000);
  const y = loc.getUTCFullYear(), m = loc.getUTCMonth() + 1, d = loc.getUTCDate();
  const noonOff = tzOffset(c.tz, Date.UTC(y, m - 1, d, 12) - off * 60000);
  return { y, m, d, tz: noonOff };
}
const nearest = (c, n = 8) => CITIES.filter(x => x !== c).map(x => ({ x, d: Math.hypot(x.lat - c.lat, (x.lon - c.lon) * Math.cos(c.lat * Math.PI / 180)) })).sort((a, b) => a.d - b.d).slice(0, n).map(o => o.x);

// Ekadashi names by amanta lunar month index (0 = Chaitra) and paksha; adhika month gets Padmini / Parama
const EKADASHI = {
  0: { s: 'kamada', k: 'varuthini' }, 1: { s: 'mohini', k: 'apara' }, 2: { s: 'nirjala', k: 'yogini' }, 3: { s: 'devshayani', k: 'kamika' },
  4: { s: 'shravanaPutrada', k: 'aja' }, 5: { s: 'parivartini', k: 'indira' }, 6: { s: 'papankusha', k: 'rama' }, 7: { s: 'devutthana', k: 'utpanna' },
  8: { s: 'mokshada', k: 'saphala' }, 9: { s: 'paushPutrada', k: 'shattila' }, 10: { s: 'jaya', k: 'vijaya' }, 11: { s: 'amalaki', k: 'papmochani' }
};
// Keyed by the amanta month (Shukla then Krishna). The Krishna-paksha name is the one printed for the following
// purnimanta month (e.g. amanta Bhadrapada Krishna = Indira Ekadashi in Pitru Paksha), so both systems agree on the day.
const ADHIKA_EKADASHI = { s: 'padmini', k: 'parama' };

// Nakshatra facts: lord, deity key, symbol key, gana, yoni (animal key), nadi
const NAK = [
  ['Ketu', 'ashwins', 'horseHead', 'deva', 'horse', 'adi'], ['Venus', 'yama', 'yoni', 'manushya', 'elephant', 'madhya'], ['Sun', 'agni', 'razor', 'rakshasa', 'goat', 'antya'],
  ['Moon', 'brahma', 'chariot', 'manushya', 'serpent', 'antya'], ['Mars', 'soma', 'deerHead', 'deva', 'serpent', 'madhya'], ['Rahu', 'rudra', 'teardrop', 'manushya', 'dog', 'adi'],
  ['Jupiter', 'aditi', 'quiver', 'deva', 'cat', 'adi'], ['Saturn', 'brihaspati', 'flower', 'deva', 'goat', 'madhya'], ['Mercury', 'sarpa', 'coiledSerpent', 'rakshasa', 'cat', 'antya'],
  ['Ketu', 'pitrs', 'throne', 'rakshasa', 'rat', 'antya'], ['Venus', 'bhaga', 'hammock', 'manushya', 'rat', 'madhya'], ['Sun', 'aryaman', 'bed', 'manushya', 'cow', 'adi'],
  ['Moon', 'savitr', 'hand', 'deva', 'buffalo', 'adi'], ['Mars', 'vishvakarma', 'pearl', 'rakshasa', 'tiger', 'madhya'], ['Rahu', 'vayu', 'coral', 'deva', 'buffalo', 'antya'],
  ['Jupiter', 'indragni', 'arch', 'rakshasa', 'tiger', 'antya'], ['Saturn', 'mitra', 'lotus', 'deva', 'deer', 'madhya'], ['Mercury', 'indra', 'earring', 'rakshasa', 'deer', 'adi'],
  ['Ketu', 'nirriti', 'roots', 'rakshasa', 'dog', 'adi'], ['Venus', 'apas', 'fan', 'manushya', 'monkey', 'madhya'], ['Sun', 'vishvedevas', 'tusk', 'manushya', 'mongoose', 'antya'],
  ['Moon', 'vishnu', 'ear', 'deva', 'monkey', 'antya'], ['Mars', 'vasus', 'drum', 'rakshasa', 'lion', 'madhya'], ['Rahu', 'varuna', 'circle', 'rakshasa', 'horse', 'adi'],
  ['Jupiter', 'ajaEkapada', 'sword', 'manushya', 'lion', 'adi'], ['Saturn', 'ahirBudhnya', 'twins', 'manushya', 'cow', 'madhya'], ['Mercury', 'pushan', 'fish', 'deva', 'elephant', 'antya']
].map(([lord, deity, symbol, gana, yoni, nadi]) => ({ lord, deity, symbol, gana, yoni, nadi }));
const NAK_SLUG = ['ashwini', 'bharani', 'krittika', 'rohini', 'mrigashira', 'ardra', 'punarvasu', 'pushya', 'ashlesha', 'magha', 'purva-phalguni', 'uttara-phalguni', 'hasta', 'chitra', 'swati', 'vishakha', 'anuradha', 'jyeshtha', 'mula', 'purva-ashadha', 'uttara-ashadha', 'shravana', 'dhanishta', 'shatabhisha', 'purva-bhadrapada', 'uttara-bhadrapada', 'revati'];

// Gemstones by planet (slug, gem key from gm.g, finger/metal/day keys)
const GEMS = [
  { planet: 'Sun', slug: 'ruby', gem: 'ruby', metal: 'goldCopper', finger: 'ring', day: 0, upratna: ['garnet', 'redSpinel'] },
  { planet: 'Moon', slug: 'pearl', gem: 'pearl', metal: 'silver', finger: 'little', day: 1, upratna: ['moonstone'] },
  { planet: 'Mars', slug: 'red-coral', gem: 'coral', metal: 'goldCopper', finger: 'ring', day: 2, upratna: ['carnelian'] },
  { planet: 'Mercury', slug: 'emerald', gem: 'emerald', metal: 'gold', finger: 'little', day: 3, upratna: ['peridot', 'greenTourmaline'] },
  { planet: 'Jupiter', slug: 'yellow-sapphire', gem: 'yellowSapphire', metal: 'gold', finger: 'index', day: 4, upratna: ['yellowTopaz', 'citrine'] },
  { planet: 'Venus', slug: 'diamond', gem: 'diamond', metal: 'silverPlatinum', finger: 'middleRing', day: 5, upratna: ['whiteSapphire', 'zircon'] },
  { planet: 'Saturn', slug: 'blue-sapphire', gem: 'blueSapphire', metal: 'silverPanch', finger: 'middle', day: 6, upratna: ['amethyst', 'iolite'] },
  { planet: 'Rahu', slug: 'hessonite', gem: 'hessonite', metal: 'silverPanch', finger: 'middle', day: 6, upratna: ['orangeZircon'] },
  { planet: 'Ketu', slug: 'cats-eye', gem: 'catsEye', metal: 'silverPanch', finger: 'little', day: 2, upratna: ['tigersEye'] }
];
// Rudraksha 1–14 mukhi: ruling planet and deity key
const RUDRAKSHA = [null, ['Sun', 'shiva'], ['Moon', 'ardhanarishvara'], ['Mars', 'agni'], ['Jupiter', 'brahma'], ['Jupiter', 'kalagni'], ['Venus', 'kartikeya'], ['Saturn', 'lakshmi'], ['Rahu', 'ganesha'], ['Ketu', 'durga'], ['Mercury', 'vishnu'], ['Mars', 'hanuman'], ['Sun', 'surya'], ['Venus', 'kamadeva'], ['Saturn', 'hanumanShiva']]
  .map((x, n) => x && { n, planet: x[0], deity: x[1] });

// Muhurat purposes (muhurta rule id → URL word)
const MUHURAT = [['marriage', 'vivah'], ['griha', 'griha-pravesh'], ['vehicle', 'vehicle-purchase'], ['business', 'business-opening'], ['namkaran', 'namkaran'], ['mundan', 'mundan'], ['annaprashan', 'annaprashan']];
// Yearly vrat lists (vrat.js kinds) → URL word
const VRAT_LISTS = [['ekadashi', 'ekadashi'], ['purnima', 'purnima'], ['amavasya', 'amavasya'], ['sankashti', 'sankashti-chaturthi'], ['pradosh', 'pradosh-vrat']];
const DOSHAS = ['manglik', 'kaal-sarp', 'sade-sati', 'pitru'];

module.exports = { CITIES, CITY, TOP_CITIES, tzOffset, cityToday, nearest, EKADASHI, ADHIKA_EKADASHI, NAK, NAK_SLUG, GEMS, RUDRAKSHA, MUHURAT, VRAT_LISTS, DOSHAS };
