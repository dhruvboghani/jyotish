module.exports = {
  auth: { exists: "This email already has an account. Log in with its password.", signupOff: "Instant sign-up is not switched on yet. Please try again in a few minutes." },
  nav: { menu: 'Menu', kundali: 'Kundali', matching: 'Matching', calendar: 'Calendar', rashifal: 'Rashifal', learn: 'Learn', events: 'Events' },
  err: { busy: 'Too many requests. Please wait a minute and try again.' },
  members: {
    title: 'Free with an account', why: '{f} is free for members. Create an account in a few seconds, with no email verification, to use it.', badge: 'Members',
    lockText: 'Free for members. Log in or create a free account to see this.', cta: 'Unlock free',
    f: { vargas: 'Divisional charts (D2–D12)', events: 'Upcoming events timeline', rectify: 'Birth time sensitivity', pratyantar: 'Pratyantar dasha', share: 'Share link', pdf: 'PDF download', matching: 'Kundali matching' }
  },
  saved: { lede: 'Every Kundali you make is saved here. Tag each one with a relation to keep your family organised.' },
  rel: { label: 'Relation', none: 'No relation', unsorted: 'Not tagged', saved: 'Relation saved', self: 'Self', spouse: 'Spouse', father: 'Father', mother: 'Mother', son: 'Son', daughter: 'Daughter', brother: 'Brother', sister: 'Sister', friend: 'Friend', other: 'Other' },
  learn: { moreAbout: 'Read about {g} in house {h}' },
  share: {
    button: 'Share', title: 'Share this Kundali', lede: 'Anyone with this private link can view the full report. You can switch the link off at any time.',
    link: 'Share link', copy: 'Copy', copied: 'Link copied', whatsapp: 'Send on WhatsApp', waText: 'Kundali of {n} on Kundali Ganit:', revoke: 'Turn off this link', revoked: 'Link turned off',
    note: 'The link shows the chart only. It does not show your email or your other Kundalis.', error: 'Could not create the link. Please try again.',
    viewTitle: 'Shared Kundali', viewText: 'Someone shared this Kundali with you. Make your own in a minute; your first one is free.', makeOwn: 'Make my Kundali',
    missing: 'This link is incomplete.', gone: 'This link no longer works', goneText: 'The owner may have turned it off, or the link was copied incompletely.'
  },
  pdf: { button: 'Download PDF', hint: 'Choose "Save as PDF" in the print window.' },
  varga: {
    title: 'Divisional charts (Vargas)', lede: 'Each varga divides every sign into equal parts to look at one area of life in detail.', lagnaIn: 'Lagna of this chart: {r}',
    D2: { name: 'Hora', short: 'wealth', about: 'Hora splits each sign in two (Sun and Moon halves). It shows how wealth is earned and kept.' },
    D3: { name: 'Drekkana', short: 'siblings', about: 'Drekkana divides each sign into three. It is read for siblings, courage and initiative.' },
    D4: { name: 'Chaturthamsha', short: 'property', about: 'Chaturthamsha divides each sign into four. It is read for home, land, vehicles and fixed assets.' },
    D7: { name: 'Saptamsha', short: 'children', about: 'Saptamsha divides each sign into seven. It is read for children and progeny.' },
    D10: { name: 'Dashamsha', short: 'career', about: 'Dashamsha divides each sign into ten. It is the main chart for career, status and achievements.' },
    D12: { name: 'Dwadashamsha', short: 'parents', about: 'Dwadashamsha divides each sign into twelve. It is read for parents and ancestry.' }
  },
  pd: { hint: 'Tap an antardasha to see its pratyantar (sub-sub) periods.', hintLocked: 'Pratyantar periods are free for members. Tap an antardasha to unlock.', title: 'Pratyantar in {md} / {ad}' },
  events: {
    eye: 'Next two years', title: 'Upcoming events', lede: 'Major transits and dasha changes from today, read from your Moon sign.', none: 'No major changes in the next two years.',
    ingress: '{g} enters {r}', ingressText: 'Transit through house {h} from your Moon ({m}).', fav: 'Usually favourable.', unfav: 'Usually needs care.',
    md: '{g} Mahadasha begins', mdText: 'A new {n}-year main period starts.', ad: '{md} / {ad} antardasha begins', adText: 'A new sub-period begins.',
    ssStart: 'Sade Sati begins', ssEnd: 'Sade Sati ends', ssStartText: 'Saturn starts its 7½-year transit around your Moon sign.', ssEndText: 'Saturn leaves the Sade Sati zone.'
  },
  rect: {
    eye: 'Accuracy check', title: 'Birth time sensitivity', lede: 'How Lagna and Navamsa change if the birth time was up to 3 hours earlier or later. Use it when the recorded time is uncertain.',
    from: 'From', to: 'To', lagna: 'Lagna', navamsa: 'Navamsa', yours: 'your time'
  },
  tools: {
    eye: 'More tools', title: 'Everything in one place', lede: 'Free Jyotish tools computed with the same mathematics as your Kundali.',
    matching: { h: 'Kundali matching', p: 'Ashtakoot Guna Milan out of 36 with Manglik check for two charts.' },
    panchang: { h: 'Today\'s Panchang', p: 'Tithi, nakshatra, yoga, karana, Rahu Kaal and Choghadiya for any city.' },
    calendar: { h: 'Festival calendar', p: 'Hindu festivals, Ekadashi, Purnima, Amavasya and Sankranti for the whole year.' },
    rashifal: { h: 'Daily Rashifal', p: 'Today\'s transits read for all twelve Moon signs, with Chandrashtama alerts.' },
    learn: { h: 'Learn Jyotish', p: 'What each graha means in each house, and a guide to all twelve Lagnas.' }
  },
  pages: {
    matching: { name: 'Kundali Matching', title: 'Kundali Matching – Ashtakoot Guna Milan out of 36 | Kundali Ganit', description: 'Free Kundali matching for marriage: Ashtakoot Guna Milan with all 8 kootas, Nadi and Bhakoot dosha, and Manglik check, calculated from exact birth details.' },
    panchang: { name: 'Panchang', title: 'Today\'s Panchang – Tithi, Nakshatra, Rahu Kaal & Choghadiya | Kundali Ganit', description: 'Daily Panchang for any city: tithi, nakshatra, yoga and karana with end times, sunrise, Rahu Kaal, Abhijit muhurta and day and night Choghadiya.' },
    calendar: { name: 'Festival Calendar', title: 'Hindu Festival Calendar – Vrat, Ekadashi & Festival Dates | Kundali Ganit', description: 'Hindu calendar with festival dates, Ekadashi, Purnima, Amavasya, Pradosh, Sankashti and Sankranti, calculated for your city.' },
    rashifal: { name: 'Rashifal', title: 'Daily Rashifal – Today\'s Horoscope for All 12 Rashis | Kundali Ganit', description: 'Daily Rashifal based on real planetary transits for all twelve Moon signs, with career, money, love and health ratings and Chandrashtama days.' },
    learn: { name: 'Learn', title: 'Learn Vedic Astrology – Planets in Houses & Lagnas | Kundali Ganit', description: 'Free guide to Vedic astrology: the effects of each of the nine grahas in all twelve houses, and the nature of all twelve Lagnas.' },
    share: { name: 'Shared Kundali', title: 'Shared Kundali | Kundali Ganit', description: 'A Kundali shared with you on Kundali Ganit.' },
    privacy: { name: 'Privacy', title: 'Privacy Policy | Kundali Ganit', description: 'How Kundali Ganit handles your birth details and account data.' },
    terms: { name: 'Terms', title: 'Terms of Use | Kundali Ganit', description: 'Terms of use for Kundali Ganit.' }
  },
  pp: {
    eye: 'Daily Panchang', title: 'Panchang', lede: 'The five limbs of the day — tithi, vara, nakshatra, yoga and karana — with their end times, plus auspicious and inauspicious periods for your city.',
    date: 'Date', prev: 'Previous day', next: 'Next day', today: 'Today', city: 'City',
    polar: 'The Sun does not rise or set at this latitude on this date.', until: 'until {t}', fullDay: 'all day',
    masa: 'Lunar month', purnimanta: 'Purnimanta', moonSign: 'Moon sign', moonEnters: 'enters {r} at {t}', sunSign: 'Sun sign',
    samvat: 'Samvat', vikram: 'Vikram', shaka: 'Shaka', ritu: 'Ritu', adhika: 'Adhika', now: 'now',
    elements: 'Panchang elements', timings: 'Muhurta and Kaal', brahma: 'Brahma Muhurta', brahmaSub: 'Before sunrise, for prayer and study',
    abhijit: 'Abhijit Muhurta', abhijitSub: 'Midday, good for most work', noAbhijit: 'Not observed on Wednesday',
    nishita: 'Nishita Kaal', nishitaSub: 'Midnight muhurta', rahu: 'Rahu Kaal', rahuSub: 'Avoid starting new work',
    yama: 'Yamaganda', yamaSub: 'Inauspicious', gulika: 'Gulika Kaal', gulikaSub: 'Inauspicious for new starts',
    q: { good: 'Good', bad: 'Avoid', neutral: 'Average' },
    chogh: 'Choghadiya', choghLede: 'Day and night are each split into eight parts. Amrit, Shubh and Labh are good; Char is fine for travel; Rog, Kaal and Udveg are avoided.', choghDay: 'Day Choghadiya', choghNight: 'Night Choghadiya'
  },
  cal: {
    eye: 'Hindu calendar', title: 'Festival & Vrat Calendar', lede: 'Festival and fasting dates computed from the Sun and Moon for your city, using the observance time each festival follows.',
    year: 'Year', filter: 'Show', f: { all: 'All', festival: 'Festivals', vrat: 'Vrat & Sankranti' },
    k: { festival: 'Festival', vrat: 'Vrat', sankranti: 'Sankranti' },
    computing: 'Calculating the year…', next: 'Next festival', today: 'today', inDays: 'in {n} days', seePanchang: 'Panchang', none: 'Nothing to show.',
    ekadashi: '{p} Ekadashi · {m}', pradosh: 'Pradosh Vrat ({p})', purnima: 'Purnima', amavasya: 'Amavasya', sankashti: 'Sankashti Chaturthi', sankranti: 'Sun enters {r}'
  },
  fest: {
    vasantPanchami: 'Vasant Panchami', mahaShivaratri: 'Maha Shivaratri', holikaDahan: 'Holika Dahan', holi: 'Holi', ugadi: 'Ugadi / Gudi Padwa', chaitraNavratri: 'Chaitra Navratri begins',
    ramNavami: 'Ram Navami', mahavirJayanti: 'Mahavir Jayanti', hanumanJayanti: 'Hanuman Jayanti', akshayaTritiya: 'Akshaya Tritiya', buddhaPurnima: 'Buddha Purnima',
    nirjalaEkadashi: 'Nirjala Ekadashi', rathYatra: 'Rath Yatra', devshayaniEkadashi: 'Devshayani Ekadashi', guruPurnima: 'Guru Purnima', nagPanchami: 'Nag Panchami',
    rakshaBandhan: 'Raksha Bandhan', janmashtami: 'Krishna Janmashtami', ganeshChaturthi: 'Ganesh Chaturthi', anantChaturdashi: 'Anant Chaturdashi', pitruPakshaStart: 'Pitru Paksha begins',
    navratri: 'Sharad Navratri begins', durgaAshtami: 'Durga Ashtami', dussehra: 'Dussehra (Vijayadashami)', sharadPurnima: 'Sharad Purnima', karwaChauth: 'Karwa Chauth',
    dhanteras: 'Dhanteras', diwali: 'Diwali (Lakshmi Puja)', govardhanPuja: 'Govardhan Puja', bhaiDooj: 'Bhai Dooj', chhathPuja: 'Chhath Puja',
    devUthaniEkadashi: 'Dev Uthani Ekadashi', kartikPurnima: 'Kartik Purnima', gitaJayanti: 'Gita Jayanti', makarSankranti: 'Makar Sankranti', meshaSankranti: 'Mesha Sankranti (Solar New Year)'
  },
  rf: {
    eye: 'Daily horoscope', title: 'Rashifal', lede: 'Read for your Moon sign (Rashi). Ratings come from where the grahas actually are today, counted from each Moon sign.',
    date: 'Date', yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow',
    positions: 'Grahas today', yours: 'Moon sign of {n}', house: 'house {h}', chandrashtama: 'Chandrashtama: Moon in the 8th — keep the day light, avoid big decisions.',
    area: { career: 'Career', money: 'Money', love: 'Love', health: 'Health' }, support: 'Support from:', caution: 'Go carefully with:',
    note: 'Daily Rashifal is a general reading for everyone with the same Moon sign. Your own Kundali, dasha and transits give a far more personal picture.',
    moon: [
      'Moon in your own sign: you feel more like yourself — good for health, comfort and personal plans.',
      'Moon in the 2nd: money and family matters need attention; watch spending and words.',
      'Moon in the 3rd: courage and energy rise — good for short trips, calls and effort.',
      'Moon in the 4th: home and mother are in focus; mood can swing, so keep things calm.',
      'Moon in the 5th: creativity and learning flow, but avoid speculation and rash choices.',
      'Moon in the 6th: you overcome obstacles and finish pending work — a productive day.',
      'Moon in the 7th: partnerships, meetings and travel go well; good for teamwork.',
      'Moon in the 8th: a sensitive day — rest, avoid risks, arguments and big decisions.',
      'Moon in the 9th: luck is mixed; spend time on study, prayer and elders\' advice.',
      'Moon in the 10th: work moves forward and you get noticed — good for important tasks.',
      'Moon in the 11th: gains, good news and support from friends — one of the best days.',
      'Moon in the 12th: expenses and tiredness rise; keep it simple and get some rest.'
    ]
  },
  mt: {
    eye: 'Guna Milan', title: 'Kundali Matching', lede: 'Ashtakoot matching compares the Moon nakshatras of two people across eight factors, for a total of 36 points, and checks Mangal dosha for both.',
    lockNote: 'Kundali matching is free for members. Log in or create an account in seconds to see the result.',
    boy: 'Boy', girl: 'Girl', pick: 'Pick from My Kundalis', submit: 'Match Kundalis', result: 'Guna Milan score', kootas: 'The eight kootas', manglik: 'Manglik check',
    v: { excellent: 'Excellent match', good: 'Good match', average: 'Average match', low: 'Low match' },
    vt: { excellent: '33 or more points: a very strong traditional match.', good: '25–32 points: a good match by the traditional standard.', average: '18–24 points: acceptable; look at the individual kootas and both full charts.', low: 'Below 18 points: traditionally not recommended without a detailed reading of both charts.' },
    isManglik: 'Manglik', notManglik: 'Not Manglik', fromLagna: 'Mars in house {h} from Lagna', fromMoon: 'house {h} from Moon', fromVenus: 'house {h} from Venus',
    m: { both: 'Both are Manglik, so the dosha is traditionally considered balanced.', one: 'Only one is Manglik. Traditionally this needs checking for cancellations in both charts before deciding.', none: 'Neither is Manglik, so there is no Mangal dosha concern.' },
    disclaimer: 'Guna Milan is one traditional input. A full compatibility reading also looks at both Kundalis, dashas and the 7th house.'
  },
  kt: {
    distance: 'Distance {a}/{b}', cancelled: 'Dosha cancelled: the Moon-sign lords are friends or the same.',
    varna: { name: 'Varna', area: 'work and ego', rule: '1 point if the boy\'s varna is equal to or higher than the girl\'s.' },
    vashya: { name: 'Vashya', area: 'mutual attraction', rule: 'Up to 2 points, by how the two Moon-sign groups relate.' },
    tara: { name: 'Tara', area: 'health and fortune', rule: 'Count nakshatras each way and divide by 9; remainders 3, 5 and 7 are unlucky. 1.5 points per direction.' },
    yoni: { name: 'Yoni', area: 'physical compatibility', rule: 'Up to 4 points by the animal symbol of each nakshatra; natural enemies score 0.' },
    maitri: { name: 'Graha Maitri', area: 'friendship of minds', rule: 'Up to 5 points by the friendship of the two Moon-sign lords.' },
    gana: { name: 'Gana', area: 'temperament', rule: 'Up to 6 points; Deva, Manushya and Rakshasa natures are compared.' },
    bhakoot: { name: 'Bhakoot', area: 'family welfare', rule: '7 points unless the Moon signs are 2/12, 5/9 or 6/8 from each other.' },
    nadi: { name: 'Nadi', area: 'health and progeny', rule: '8 points if the Nadis differ; the same Nadi scores 0 (Nadi dosha).' }
  },
  names: {
    masa: ['Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada', 'Ashwin', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna'],
    ritu: { Vasant: 'Vasant (spring)', Grishma: 'Grishma (summer)', Varsha: 'Varsha (monsoon)', Sharad: 'Sharad (autumn)', Hemant: 'Hemant (pre-winter)', Shishir: 'Shishir (winter)' },
    ayana: { Uttarayana: 'Uttarayana', Dakshinayana: 'Dakshinayana' },
    chogh: { Amrit: 'Amrit', Shubh: 'Shubh', Labh: 'Labh', Char: 'Char', Rog: 'Rog', Kaal: 'Kaal', Udveg: 'Udveg' },
    tara: ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhaka', 'Vadha', 'Mitra', 'Ati-Mitra']
  },
  info: {
    panchang: [
      { h: 'What is Panchang?', p: ['Panchang means "five limbs". Every day is described by its tithi (lunar day), vara (weekday), nakshatra (Moon\'s star), yoga (Sun–Moon combination) and karana (half tithi). Together they are used to choose good times for work, travel, ceremonies and fasting.'] },
      { h: 'How are these times calculated?', p: ['Sunrise and sunset are computed for the city you choose. Each element\'s end time is found by solving for the exact moment the Moon and Sun reach the next boundary. Rahu Kaal, Yamaganda and Gulika are one-eighth parts of the daytime, and Choghadiya splits day and night into eight parts each.'] }
    ],
    calendar: [
      { h: 'How festival dates are decided', p: ['Hindu festivals follow the lunar calendar. A festival is kept on the day its tithi is present at the right time — sunrise for most, midday for Ram Navami, evening for Diwali and midnight for Janmashtami and Shivaratri. Because these moments depend on your location, dates can differ by a day between cities and from printed calendars.'] },
      { h: 'Amanta and Purnimanta months', p: ['Months here are named in the Amanta system (month ends at new moon), used in Gujarat, Maharashtra and South India. In North India the Purnimanta system ends the month at full moon, so the month name for Krishna paksha dates is one month ahead; the festival dates themselves are the same.'] }
    ],
    rashifal: [
      { h: 'How is this Rashifal made?', p: ['Each sign\'s reading counts where the nine grahas are today from that Moon sign and applies the classical gochar (transit) rules: for example Jupiter is favourable in the 2nd, 5th, 7th, 9th and 11th, and Saturn in the 3rd, 6th and 11th. The Moon\'s house sets the mood of the day.'] },
      { h: 'Moon sign, not Sun sign', p: ['Vedic astrology reads the daily horoscope from your Moon sign (Rashi), not the western Sun sign. Make your free Kundali to find your Rashi — the site then highlights it here automatically.'] }
    ],
    matching: [
      { h: 'What is Ashtakoot Guna Milan?', p: ['Ashtakoot compares the two Moon nakshatras across eight kootas: Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot and Nadi. Their points add up to 36. Traditionally 18 or more is acceptable and 25 or more is good.'] },
      { h: 'Nadi, Bhakoot and Manglik dosha', p: ['Nadi and Bhakoot carry the most points, and a zero in either is called a dosha. Classical texts list cancellations, such as the Moon-sign lords being friends. Mangal dosha is checked from the Lagna, Moon and Venus for both people.'] }
    ]
  },
  legal: {
    privacyTitle: 'Privacy Policy', termsTitle: 'Terms of Use', updated: 'Last updated: October 2026',
    privacy: [
      { h: 'What we collect', p: ['Birth details you enter (name, date, time and place) are used to calculate your Kundali. If you create an account, we store your email, the Kundalis you make and a history of your entries so you can open them again.', 'Without an account, your history stays only in your own browser. A small cookie remembers that this browser has used its free Kundali.'] },
      { h: 'How we use it', p: ['Your data is used only to show your charts and history. We do not sell it or share it with advertisers. Share links show a chart only to people you give the link to, and you can turn a link off at any time.'] },
      { h: 'Storage and security', p: ['Accounts and saved charts are stored with Supabase with row-level security, so each account can read only its own data. Pages are served by Vercel, which also records anonymous visit statistics.'] },
      { h: 'Your choices', p: ['You can delete any saved Kundali or history entry from your account at any time. To delete your account completely, contact us from your registered email.'] }
    ],
    terms: [
      { h: 'Use of the service', p: ['Kundali Ganit is a free tool for calculating Vedic astrology charts and related information. You may use it for personal purposes. Do not misuse the service or try to access other people\'s data.'] },
      { h: 'Not professional advice', p: ['Readings follow classical rules and are for guidance and interest only. They are not medical, legal, financial or psychological advice, and important decisions should not be based on them alone.'] },
      { h: 'Accuracy', p: ['Positions are calculated mathematically and checked against standard ephemerides, but results depend on the accuracy of the birth details entered. Festival dates can differ by a day from other calendars because of location and tradition.'] },
      { h: 'Accounts', p: ['You are responsible for keeping your password safe. We may suspend accounts that abuse the service. These terms may be updated; the date at the top shows the latest version.'] }
    ]
  },
  lp: {
    indexEye: 'Free guide', indexH1: 'Learn Vedic Astrology', indexLede: 'What each of the nine grahas does in each of the twelve houses, and the nature of all twelve Lagnas — written from classical principles.',
    phSection: 'Planets in houses', lgSection: 'The twelve Lagnas', bhava: 'Bhava',
    ord: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'],
    phH1: '{g} in the {n} house', phTitle: '{g} in the {n} House – Effects in Vedic Astrology | Kundali Ganit', phDesc: 'Effects of {g} in the {n} house of the Kundali: what it means for {m}, when it is strong or weak, and its transit results.',
    intro: '{g} is the karaka (significator) of {kk}. The {n} house, called {hn} Bhava, shows {m}. When {g} sits here, these matters take on its colour.',
    nat: {
      ben: [
        'A benefic in the Lagna is a blessing: it gives a pleasant nature, good health and a likeable personality, and protects the whole chart.',
        'In the 2nd house a benefic supports savings, a sweet and truthful way of speaking, and harmony in the family.',
        'In the 3rd house a benefic makes one gentle in effort; it favours communication, writing and good relations with siblings, though drive may be soft.',
        'In the 4th house a benefic brings a comfortable home, vehicles, a caring mother and peace of mind.',
        'In the 5th house a benefic is excellent for intelligence, learning, creativity and children.',
        'In the 6th house a benefic is somewhat weakened; it helps one serve others and settle disputes kindly, but can bring small health or debt matters.',
        'In the 7th house a benefic supports a good spouse, happy partnerships and success in dealing with the public.',
        'In the 8th house a benefic protects longevity and brings interest in research and hidden subjects, though its outward results are reduced.',
        'In the 9th house a benefic is very fortunate: it brings luck, faith, higher learning and support from father and teachers.',
        'In the 10th house a benefic brings respect, ethical work and a good name in one\'s career.',
        'In the 11th house every graha gives gains; a benefic here brings steady income and helpful friends.',
        'In the 12th house a benefic turns spending toward good causes and supports sleep, spiritual life and foreign connections.'
      ],
      mal: [
        'A malefic in the Lagna gives strength of will and drive, but can make one impatient or harsh and needs care for health.',
        'In the 2nd house a malefic can make speech sharp and finances uneven, and calls for care in family relations.',
        'In the 3rd house a malefic is at its best: it gives courage, initiative and the will to win through effort.',
        'In the 4th house a malefic can disturb peace at home or with property, and asks one to build inner calm.',
        'In the 5th house a malefic can delay children or unsettle the mind, while giving a sharp, practical intelligence.',
        'In the 6th house a malefic is welcome: it defeats enemies, clears debts and gives the stamina to compete.',
        'In the 7th house a malefic can bring friction or delay in marriage and partnerships, and calls for patience with others.',
        'In the 8th house a malefic can bring sudden events and hidden worries, yet also resilience and depth.',
        'In the 9th house a malefic can test faith or relations with father and teachers, and makes one follow one\'s own path.',
        'In the 10th house a malefic gives ambition, authority and hard-won success in career.',
        'In the 11th house a malefic is strong: it brings gains, fulfilment of desires and influential contacts.',
        'In the 12th house a malefic can raise expenses, losses or sleep trouble, but also helps detachment and work abroad.'
      ]
    },
    cls: {
      kendra: 'The {n} house is a kendra (angular house), a pillar of the chart, so a graha here shows its results openly and strongly.',
      trikona: 'The {n} house is a trikona (trine), one of the houses of fortune, which improves whatever graha sits here.',
      dusthana: 'The {n} house is a dusthana (house of difficulty), so results here come through challenges and need conscious handling.',
      upachaya: 'The {n} house is an upachaya (house of growth): results improve steadily with time and effort.',
      maraka: 'The {n} house is a maraka (sensitive) house as well as a house of resources, so results depend strongly on the graha\'s dignity.'
    },
    clsName: { kendra: 'Kendra', trikona: 'Trikona', dusthana: 'Dusthana', upachaya: 'Upachaya', maraka: 'Maraka' },
    digbala: '{g} gains directional strength (Dig Bala) in the {n} house, which noticeably strengthens it here.',
    digWeak: 'The {n} house is opposite to where {g} gets directional strength, so it loses some power here.',
    strong: '{g} gives its best results here when it is exalted in {ex}, in its own sign ({own}) or in a friendly sign, and when it is not combust.',
    strongNode: '{g} is a shadow graha and gives the results of the sign lord and conjunct grahas; it is considered strong in {ex}.',
    weak: 'Results are weaker if {g} is debilitated in {deb}, combust, or afflicted by malefics.',
    weakSun: 'Results are weaker if the Sun is debilitated in {deb} or afflicted by Saturn or Rahu.',
    gocharH: 'In transit (gochar)', gocharFav: 'When {g} transits the {n} house counted from your Moon sign, the period is traditionally favourable.', gocharUnfav: 'When {g} transits the {n} house counted from your Moon sign, the period traditionally needs more care.',
    cta: 'See which house {g} occupies in your own chart, with its strength and dignity.', ctaBtn: 'Make free Kundali', otherHouses: '{g} in other houses', otherPlanets: 'Other grahas in the {n} house',
    disclaimer: 'A single placement is never read alone: sign, aspects, conjunctions, dasha and the whole chart change the outcome.',
    lgH1: '{r} Lagna', lgTitle: '{r} Lagna (Ascendant) – Nature, Lords & Yogakaraka | Kundali Ganit', lgDesc: '{r} Lagna in Vedic astrology: personality, lagna lord, functional benefics and malefics, and the Yogakaraka graha.',
    lgIntro: 'People born with {r} rising in the east have it as their Lagna (ascendant).',
    lgLord: 'The Lagna lord is {g}. It is a {el} sign of {q} nature.',
    lgBen: 'For {r} Lagna, {list} rule the trines (1st, 5th, 9th) and act as functional benefics.',
    lgMal: '{list} rule the 3rd, 6th or 11th house and tend to bring effort and obstacles.',
    lgYk: '{g} rules both a kendra and a trikona, making it the Yogakaraka — the most auspicious graha for this Lagna.',
    lgNoYk: '{r} Lagna has no single Yogakaraka graha.',
    lgCta: 'Find your Lagna exactly from your birth time.',
    elem: ['fire', 'earth', 'air', 'water'], qual: ['movable (chara)', 'fixed (sthira)', 'dual (dwiswabhava)']
  }
};
