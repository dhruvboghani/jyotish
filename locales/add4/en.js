module.exports = {
  nav: { family: 'Family', names: 'Baby names', muhurta: 'Muhurta', settings: 'Settings', today: 'Today', areas: 'Life areas', remedies: 'Remedies', notes: 'Notes' },
  members: { f: { today: 'Personal daily horoscope', areas: 'Life-area reports', remedies: 'Remedies', notes: 'Chart notes', names: 'Baby names', muhurta: 'Muhurta finder', family: 'Family dashboard', settings: 'Account settings' } },
  my: {
    eye: 'For this chart', title: 'Today for you', lede: 'Today\'s transits read against this chart — from the Moon, the Lagna and the Ashtakavarga points — with Tara and Chandra bala and the running dasha.',
    overall: 'Your day', week: 'Next 7 days', transitTable: 'All transits for this chart', sign: 'Sign', fromMoon: 'From Moon', fromLagna: 'From Lagna', bindu: 'Points',
    method: 'Points are this chart\'s Ashtakavarga bindus for that graha in that sign (0–8). Four or more softens a difficult transit.',
    ch8: 'Moon 8th',
    tara: { good: 'Tara bala is good: today\'s nakshatra {nk} is your {t} tara — a favourable day to begin things.', bad: 'Tara bala is weak: today\'s nakshatra {nk} is your {t} tara — avoid starting important work.', mixed: 'Today\'s nakshatra {nk} is your {t} tara — an ordinary day; keep to routine work.' },
    dasha: { good: 'Your running dasha lord ({md} / {ad}) is transiting house {h} from your Moon in {r}, which supports this period.', bad: 'Your running dasha lord ({md} / {ad}) is transiting house {h} from your Moon in {r}; move carefully in matters it rules.' },
    slow: { good: '{g} in {r} — house {h} from your Moon, {l} from your Lagna, {b} points: a supportive background for the coming weeks.', bad: '{g} in {r} — house {h} from your Moon, {l} from your Lagna, {b} points: a slower, testing background for now.' }
  },
  la: {
    eye: 'Life areas', title: 'Life-area reports', lede: 'Career, marriage, finance, health, education and children — each read from its houses, their lords, karaka grahas and the matching divisional chart, with the dasha periods that activate it.',
    whenH: 'When it comes alive', noWhen: 'No strongly linked dasha periods in the next 15 years.', housesUsed: 'Houses read: {list}',
    band: { strong: 'Strong', moderate: 'Moderate', care: 'Needs care' },
    career: { name: 'Career', strong: 'The 10th house and its lord are well placed, so work brings recognition and steady growth.', moderate: 'Career grows with effort; some factors support it and some ask for patience.', care: 'Career needs patience and the right timing; use the favourable dasha periods below.' },
    marriage: { name: 'Marriage', strong: 'The 7th house, Venus and the Navamsa support a happy, stable partnership.', moderate: 'Marriage is supported but asks for understanding and the right timing.', care: 'Marriage needs care: check compatibility carefully and choose the timing well.' },
    finance: { name: 'Finance', strong: 'The 2nd and 11th houses are strong, so income and savings build steadily.', moderate: 'Finances are average; gains come with planning and discipline.', care: 'Money needs careful handling; avoid speculation and keep savings.' },
    health: { name: 'Health', strong: 'The Lagna, its lord and the 6th house are strong — good vitality and recovery.', moderate: 'Health is generally fine; keep regular habits and check-ups.', care: 'Health needs attention; prevention and routine matter more for this chart.' },
    education: { name: 'Education', strong: 'The 4th and 5th houses with Mercury and Jupiter support learning and good results.', moderate: 'Studies go well with steady effort and the right guidance.', care: 'Learning needs focus and patience; the right subjects and teachers make the difference.' },
    children: { name: 'Children', strong: 'The 5th house, its lord and Jupiter support children and joy from them.', moderate: 'Children are indicated with some delays or effort.', care: 'This area needs care; timing and remedies are traditionally advised.' },
    lord: 'The lord of house {h}, {g}, sits in house {x}.',
    lordStr: '{g} has a strength of {s}/100.',
    occBen: 'Benefic {list} in house {h} support it.',
    occMal: 'Malefic {list} in house {h} add friction.',
    occMalOk: '{list} in house {h} give drive here (a house of growth).',
    occNone: 'House {h} has no graha; its lord decides the results.',
    sav: 'House {h} has {n} Ashtakavarga points (28 is average).',
    aspJup: 'Jupiter aspects house {h} — a protective, expanding influence.',
    aspMal: '{list} aspect house {h}, adding pressure.',
    karaka: '{g}, karaka of {kk}, has a strength of {s}/100.',
    varga: { exalted: 'In {d}, {g} is exalted in {r} — a strong sign of good results.', own: 'In {d}, {g} is in its own sign {r} — dependable results.', debil: 'In {d}, {g} is debilitated in {r} — results come with effort.', plain: 'In {d}, {g} is in {r}.' },
    manglik: 'Mangal dosha is present, so compatibility should be checked carefully.',
    healthLL: 'The Lagna lord {g} is strong — good stamina and resistance.'
  },
  rm: {
    eye: 'Upaya', title: 'Remedies', lede: 'Suggestions for the grahas that are weak, debilitated, combust or tied to a dosha in this chart. Each shows why it is suggested.',
    none: 'No graha in this chart needs a special remedy right now.',
    mantra: 'Mantra', japa: '{n} repetitions in total (e.g. 108 a day)', fast: 'Fasting day', donate: 'Donation', deity: 'Worship', gemLabel: 'Gemstone',
    wear: 'set in {m}, on the {f}, first worn on a {d}',
    gemStatus: { yes: 'Suitable', maybe: 'Ask an astrologer first', no: 'Not advised', skip: 'Not needed' },
    disclaimer: 'Remedies are traditional and optional. Mantra, prayer, fasting and charity are safe for everyone. Wear a gemstone only after an experienced astrologer has checked your full chart.',
    why: {
      debil: '{g} is debilitated in {r}.', combust: '{g} is combust (too close to the Sun).', weak: '{g} is weak in this chart ({s}/100).',
      md: 'You are running the {g} Mahadasha and {g} is not strong ({s}/100).', ad: 'You are in the {g} Antardasha and {g} is weak ({s}/100).',
      manglik: 'Mangal dosha is present.', kaalsarp: 'Kaal Sarp yoga is present.', sadesati: 'Sade Sati of Saturn is running now.', dhaiya: 'Saturn\'s Dhaiya (Kantaka Shani) is running now.',
      grahan: '{g} is with Rahu or Ketu (Grahan yoga).', guruchandal: '{g} is with Rahu or Ketu (Guru Chandal yoga).'
    },
    gem: {
      yes: '{g} rules house {list} for this Lagna, so strengthening it is helpful.', node: '{g} is a shadow graha; its stone is advised only after a careful reading.',
      dus: '{g} rules house {list} (difficult houses) for this Lagna, so its stone could magnify problems — use mantra and charity instead.',
      maybe: '{g} rules house {list}; whether to strengthen it depends on the whole chart.', strong: '{g} is already strong ({s}/100), so a stone is not needed.'
    },
    p: {
      Sun: { gem: 'Ruby (Manik)', metal: 'gold or copper', finger: 'ring finger', day: 'Sunday', donate: 'wheat, jaggery, copper, red cloth', deity: 'Surya — offer water at sunrise, Aditya Hridayam' },
      Moon: { gem: 'Pearl (Moti)', metal: 'silver', finger: 'little finger', day: 'Monday', donate: 'rice, milk, white cloth, silver', deity: 'Shiva — water or milk on the Shivling' },
      Mars: { gem: 'Red Coral (Moonga)', metal: 'gold or copper', finger: 'ring finger', day: 'Tuesday', donate: 'red lentils (masoor), jaggery, red cloth', deity: 'Hanuman — Hanuman Chalisa on Tuesdays' },
      Mercury: { gem: 'Emerald (Panna)', metal: 'gold', finger: 'little finger', day: 'Wednesday', donate: 'green moong, green cloth, books for students', deity: 'Vishnu or Ganesha — Vishnu Sahasranama' },
      Jupiter: { gem: 'Yellow Sapphire (Pukhraj)', metal: 'gold', finger: 'index finger', day: 'Thursday', donate: 'chana dal, turmeric, yellow cloth, books', deity: 'Vishnu, Brihaspati — respect teachers and elders' },
      Venus: { gem: 'Diamond (Heera) or white sapphire', metal: 'silver or platinum', finger: 'middle or little finger', day: 'Friday', donate: 'rice, sugar, white clothes, perfume', deity: 'Lakshmi — Shri Suktam on Fridays' },
      Saturn: { gem: 'Blue Sapphire (Neelam)', metal: 'silver or iron', finger: 'middle finger', day: 'Saturday', donate: 'black sesame, mustard oil, black cloth, help to workers', deity: 'Shani and Hanuman — lamp of sesame oil on Saturdays' },
      Rahu: { gem: 'Hessonite (Gomed)', metal: 'silver', finger: 'middle finger', day: 'Saturday', donate: 'black gram (urad), blanket, coconut', deity: 'Durga — Durga Saptashati' },
      Ketu: { gem: 'Cat\'s eye (Lehsunia)', metal: 'silver', finger: 'little finger', day: 'Tuesday', donate: 'mixed grains, blanket, food for dogs', deity: 'Ganesha — Ganesh Atharvashirsha' }
    }
  },
  notes: { eye: 'Private', title: 'Chart notes', lede: 'Your own notes on this Kundali. Only you can see them.', ph: 'Write a note — predictions, events, questions…', add: 'Add note', edit: 'Edit', save: 'Save', empty: 'No notes yet.', setup: 'This feature needs the latest database update (v4_features.sql).' },
  nm: {
    eye: 'Namkaran', title: 'Baby names by nakshatra', lede: 'Traditional first syllables for the child\'s Moon nakshatra and pada, with a numerology check against the birth date.',
    lockNote: 'Baby names are free for members. Log in or create an account in seconds.',
    fromChart: 'From a saved Kundali', pada: 'Pada', allPadas: 'All four padas', gender: 'Gender', g: { any: 'Any', m: 'Boy', f: 'Girl', u: 'Both' },
    date: 'Birth date (for numerology)', check: 'Check a name', checkPh: 'e.g. Aarav', submit: 'Show names', filter: 'Filter names or meanings',
    moolank: 'Moolank', bhagyank: 'Bhagyank', numNote: 'Names whose number is friendly with the Moolank or Bhagyank are marked lucky and listed first.',
    addDate: 'Add the birth date to see numerology.', nameNum: 'name number {n} ({g})', checkGood: 'friendly with the birth numbers', checkMid: 'neutral with the birth numbers',
    forSyll: 'Names for {nk}, starting with {list}', num: 'No. {n}', lucky: 'Lucky', none: 'No names found for these syllables yet — try all four padas.',
    note: 'Meanings are shown in English. Numerology uses the Chaldean system on the English spelling.'
  },
  mu: {
    eye: 'Shubh muhurta', title: 'Muhurta finder', lede: 'Find good dates and time windows for marriage, griha pravesh, buying a vehicle or starting a business, for your city — optionally checked against your own chart.',
    lockNote: 'The muhurta finder is free for members. Log in or create an account in seconds.',
    purpose: 'Purpose', p: { marriage: 'Marriage (vivah)', griha: 'Griha pravesh', vehicle: 'Vehicle purchase', business: 'Start a business', general: 'Any good work' },
    from: 'From', days: 'Days to search', for1: 'Check for (optional)', for2: 'And for (optional)', nobody: 'No one', submit: 'Find muhurta',
    searching: 'Checking every hour of the range…', found: '{n} days with {w} good time windows', best: 'Best window: {d}, {t}',
    blockedNote: 'Days left out by tradition:', block: { adhika: 'Adhika maas', chaturmas: 'Chaturmas', kharmas: 'Kharmas', holashtak: 'Holashtak', guruAsta: 'Jupiter combust', shukraAsta: 'Venus combust', pitru: 'Pitru Paksha' },
    personalNote: 'Windows with a bad Tara bala or Chandrashtama for the chosen people were removed.', none: 'No good window in this range — try a longer range or another purpose.',
    disclaimer: 'Windows avoid Rahu Kaal, Yamaganda, Gulika, Vishti karana and harsh yogas. For marriage, also fix the exact lagna with a priest or astrologer.'
  },
  fam: {
    eye: 'Family', title: 'Family dashboard', lede: 'Every saved Kundali on one screen: today\'s rating, running dasha, the next change, Sade Sati and big transits ahead.',
    emptyT: 'No saved Kundalis yet', empty: 'Make a Kundali for each family member and tag the relation in My Kundalis.',
    ssNow: 'Running ({p}) until {d}', ssNext: 'Next begins {d}', next: 'Next period', soon: 'Next 4 months',
    phase: { rising: 'rising phase', peak: 'peak phase', setting: 'setting phase' }
  },
  st: {
    eye: 'Account', title: 'Settings', lede: 'Reminders for festivals and vrats, alerts for your own transits, a calendar you can subscribe to, and your branding on PDFs.',
    remTitle: 'Reminders and alerts', remLede: 'Choose what to be reminded about. Reminders arrive the evening before; transit alerts a week before.',
    kinds: 'Remind me about', kind: { festival: 'Festivals', ekadashi: 'Ekadashi', purnima: 'Purnima', amavasya: 'Amavasya', pradosh: 'Pradosh', sankashti: 'Sankashti Chaturthi', sankranti: 'Sankranti' },
    alertFor: 'Transit alerts for', alertNote: 'Saturn, Jupiter and Rahu changing sign, Sade Sati and dasha changes for this chart.', noAlerts: 'No transit alerts',
    byEmail: 'Send by e-mail', byWa: 'Send on WhatsApp', phone: 'Phone (with country code)', save: 'Save', saved: 'Saved',
    feed: 'Calendar subscription', feedLede: 'Add your reminders to Google Calendar, iPhone or Outlook. They update by themselves and remind you on your phone.',
    feedMake: 'Create my calendar link', feedNew: 'Make a new link (the old one stops working)', google: 'Add to Google Calendar', apple: 'Add to iPhone / Outlook',
    brandTitle: 'PDF branding', brandLede: 'For astrologers: put your name, logo and contact details on every PDF you download.',
    brandOn: 'Show my branding on PDFs', bName: 'Name or business', bWeb: 'Website', bAddr: 'Address', bLogo: 'Logo (PNG or JPG)', bClear: 'Remove logo'
  },
  rem: { mailSubject: '{n} reminder(s) from Grahavani', mailIntro: 'Here is what is coming up:', mailFooter: 'You get this because reminders are on in your Grahavani settings. Turn them off there at any time.' },
  mt: { tab: { ashtakoot: 'Ashtakoot (36)', porutham: '10 Porutham', report: 'Full report' } },
  pr: {
    passNote: 'Rajju and Vedha both match, which is required in the South Indian system.', failNote: 'Rajju or Vedha does not match — traditionally this is treated as not compatible whatever the other scores.',
    count: 'count {n}', st: { good: 'Matches', mid: 'Partly', bad: 'No match' }, must: 'Must match',
    rajjuN: { pada: 'Pada', kati: 'Kati', nabhi: 'Nabhi', kanta: 'Kanta', siro: 'Siro' },
    dina: { name: 'Dina', area: 'health and long life', rule: 'Count from the bride\'s star to the groom\'s; remainders 2, 4, 6, 8 or 0 after dividing by 9 match.' },
    gana: { name: 'Gana', area: 'temperament', rule: 'Same gana matches; Deva with Manushya partly; Rakshasa with the others does not.' },
    mahendra: { name: 'Mahendra', area: 'children and prosperity', rule: 'Matches when the groom\'s star is the 4th, 7th, 10th, 13th, 16th, 19th, 22nd or 25th from the bride\'s.' },
    streeDeergha: { name: 'Stree Deergha', area: 'the bride\'s well-being', rule: 'Matches when the groom\'s star is more than 13 stars from the bride\'s (more than 9 partly).' },
    yoni: { name: 'Yoni', area: 'physical harmony', rule: 'The animal symbols of the two stars should be the same or friendly, not enemies.' },
    rasi: { name: 'Rasi', area: 'family harmony', rule: 'Moon signs 2/12 or 6/8 from each other do not match.' },
    rasiAdhipati: { name: 'Rasi Adhipati', area: 'mutual understanding', rule: 'The lords of the two Moon signs should be friends.' },
    vasya: { name: 'Vasya', area: 'attraction', rule: 'Matches when one Moon sign is in the vasya (attracted) group of the other.' },
    rajju: { name: 'Rajju', area: 'longevity of the marriage', rule: 'The two stars must not belong to the same rajju (body part group).' },
    vedha: { name: 'Vedha', area: 'freedom from obstacles', rule: 'The two stars must not be a vedha (mutually obstructing) pair.' }
  },
  cp: {
    title: 'Compatibility beyond the 36 points', sideNote: 'Read from the 7th house, its lord, Venus and Jupiter, the Navamsa and Mangal dosha.', cross: 'How the two charts meet',
    band: { strong: 'Both charts support a happy marriage.', moderate: 'A workable match; understanding and good timing will help.', care: 'Several factors need care; consult an astrologer before deciding.' },
    lagna: 'Lagnas {a} and {b}: their lords {ga} and {gb} decide how naturally you get along.',
    moon: 'Moon signs {a} and {b} are {d} apart (counted from the boy).',
    attraction: 'Venus of one sits with or opposite Mars of the other — natural attraction.',
    navamsa: 'Navamsa Lagnas {a} and {b} — the inner nature of each in marriage.',
    dasha: '{who}: now running {md} / {ad}.',
    sandhi: '{who}: the {g} Mahadasha ends within a year (dasha sandhi) — a time of change.'
  },
  names: {
    mantra: { Sun: 'Om Hraam Hreem Hraum Sah Suryaya Namah', Moon: 'Om Shraam Shreem Shraum Sah Chandramase Namah', Mars: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah', Mercury: 'Om Braam Breem Braum Sah Budhaya Namah', Jupiter: 'Om Graam Greem Graum Sah Gurave Namah', Venus: 'Om Draam Dreem Draum Sah Shukraya Namah', Saturn: 'Om Praam Preem Praum Sah Shanaischaraya Namah', Rahu: 'Om Bhraam Bhreem Bhraum Sah Rahave Namah', Ketu: 'Om Sraam Sreem Sraum Sah Ketave Namah' },
    mantraDev: { Sun: 'ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः', Moon: 'ॐ श्रां श्रीं श्रौं सः चन्द्रमसे नमः', Mars: 'ॐ क्रां क्रीं क्रौं सः भौमाय नमः', Mercury: 'ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः', Jupiter: 'ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः', Venus: 'ॐ द्रां द्रीं द्रौं सः शुक्राय नमः', Saturn: 'ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः', Rahu: 'ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः', Ketu: 'ॐ स्रां स्रीं स्रौं सः केतवे नमः' }
  },
  tools: {
    family: { h: 'Family dashboard', p: 'Dashas, Sade Sati and today\'s rating for every saved family member.' },
    names: { h: 'Baby names', p: 'Names from the nakshatra syllable with a numerology check.' },
    muhurta: { h: 'Muhurta finder', p: 'Good dates for marriage, griha pravesh, vehicle or business in your city.' }
  },
  pages: {
    names: { name: 'Baby names', title: 'Baby Names by Nakshatra & Rashi with Numerology | Grahavani', description: 'Find baby names from the nakshatra and pada syllable of the birth Moon, with Chaldean numerology against the birth date. Boy and girl names with meanings.' },
    muhurta: { name: 'Muhurta', title: 'Shubh Muhurta Finder – Marriage, Griha Pravesh, Vehicle | Grahavani', description: 'Find auspicious dates and time windows for marriage, griha pravesh, vehicle purchase and business for your city, avoiding Rahu Kaal, Vishti and Chaturmas.' },
    family: { name: 'Family', title: 'Family Dashboard | Grahavani', description: 'Dashas, Sade Sati and daily ratings for all your saved Kundalis.' },
    settings: { name: 'Settings', title: 'Settings | Grahavani', description: 'Reminders, calendar subscription and PDF branding.' }
  },
  info: {
    names: [
      { h: 'How are names chosen?', p: ['Each nakshatra has four padas, and each pada has a sacred first syllable (Akshar). Naming the child with that syllable is the traditional Namkaran practice. The names here start with your child\'s syllables; pick a pada to narrow the list.'] },
      { h: 'Numerology check', p: ['The name number is the sum of the letters in the Chaldean system, reduced to one digit. Moolank comes from the day of birth and Bhagyank from the full date. A name whose number is friendly with these is marked lucky.'] }
    ],
    muhurta: [
      { h: 'What makes a good muhurta?', p: ['A muhurta is chosen from the tithi, nakshatra, weekday, yoga and karana. Each purpose has its own favourable stars and lunar days — for example Rohini, Uttara Phalguni, Hasta and Revati for marriage. Harsh yogas, Vishti karana and Rahu Kaal are avoided.'] },
      { h: 'Seasons that are left out', p: ['Marriage and griha pravesh are traditionally not held during Chaturmas, Kharmas (Sun in Dhanu or Meena), Adhika maas, Pitru Paksha, Holashtak, or while Jupiter or Venus is combust. Add your own Kundali to also skip days with bad Tara bala or Chandrashtama.'] }
    ]
  }
};
