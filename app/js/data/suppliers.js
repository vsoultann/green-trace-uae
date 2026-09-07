/**
 * Where to actually buy the treatment.
 *
 * ## Provenance — read this before changing anything here
 *
 * Every shop below is a real business taken from OpenStreetMap on 2026-09-07,
 * with its coordinates, and with the phone number and opening hours exactly as
 * OSM recorded them. Nothing in this file is invented: an entry with no phone
 * number has `phone: null` and the app shows a maps link instead of making one
 * up. OSM data is contributed by volunteers, so a number can be out of date —
 * that is why every card also carries a "Open in Google Maps" link, which shows
 * whatever Google believes today.
 *
 * OpenStreetMap data is © OpenStreetMap contributors, ODbL. The credit line on
 * the results page satisfies that licence; keep it.
 *
 * ## Adding your own
 *
 * The most convincing entries at the kiosk will be the shops your family
 * actually uses. Add them here — `name`, `lat`, `lon` and `emirate` are the only
 * required fields — and check the number by calling it once.
 */

/**
 * `sells` tags let a treatment recommendation surface the right shops:
 *   'plants'    nursery stock and potting material
 *   'chemicals' fertiliser, fungicide, pesticide
 *   'tools'     shears, sprayers, meters
 */
export const SUPPLIERS = [
  /* ---------------- Abu Dhabi ---------------- */
  {
    name: { en: 'Mina Plant Market', ar: 'سوق النباتات - المينا' },
    emirate: { en: 'Abu Dhabi', ar: 'أبوظبي' },
    lat: 24.51570, lon: 54.37497,
    phone: null, hours: null,
    sells: ['plants'],
  },
  {
    name: { en: 'Gardenia Flowers & Plants', ar: 'غاردينيا للزهور والنباتات' },
    emirate: { en: 'Abu Dhabi', ar: 'أبوظبي' },
    lat: 24.49352, lon: 54.38303,
    phone: null, hours: null,
    sells: ['plants'],
  },
  {
    name: { en: 'Desert Garden Centre', ar: 'مركز حدائق الصحراء' },
    emirate: { en: 'Abu Dhabi', ar: 'أبوظبي' },
    lat: 24.42342, lon: 54.47274,
    phone: null, hours: null,
    sells: ['plants', 'chemicals'],
  },
  {
    name: { en: 'Golden Tools Trading — Mussafah', ar: 'الأدوات الذهبية للتجارة - مصفح' },
    emirate: { en: 'Abu Dhabi', ar: 'أبوظبي' },
    lat: 24.37651, lon: 54.50984,
    phone: '+971 2 555 0425',
    hours: { en: 'Sat–Thu 08:00–13:00, 15:00–19:30 · Fri 08:00–12:00, 15:00–19:30',
             ar: 'السبت–الخميس ٠٨:٠٠–١٣:٠٠، ١٥:٠٠–١٩:٣٠ · الجمعة ٠٨:٠٠–١٢:٠٠، ١٥:٠٠–١٩:٣٠' },
    site: 'https://www.goldentools.ae',
    sells: ['tools', 'chemicals'],
  },

  /* ---------------- Al Ain ---------------- */
  {
    name: { en: 'Golden Tools Trading — Al Ain', ar: 'الأدوات الذهبية للتجارة - العين' },
    emirate: { en: 'Al Ain', ar: 'العين' },
    lat: 24.19248, lon: 55.76151,
    phone: '+971 3 722 8782',
    hours: { en: 'Every day 08:30–20:30', ar: 'يومياً ٠٨:٣٠–٢٠:٣٠' },
    site: 'https://www.goldentools.ae',
    sells: ['tools', 'chemicals'],
  },

  /* ---------------- Dubai ---------------- */
  {
    name: { en: 'Dubai Garden Centre', ar: 'مركز دبي للحدائق' },
    emirate: { en: 'Dubai', ar: 'دبي' },
    lat: 25.12942, lon: 55.21238,
    phone: '+971 4 590 4333',
    hours: { en: 'Every day 09:00–22:00', ar: 'يومياً ٠٩:٠٠–٢٢:٠٠' },
    site: 'https://www.dubaigardencentre.ae/',
    sells: ['plants', 'chemicals', 'tools'],
  },
  {
    name: { en: 'The Leaf Ornamental Plants Trading', ar: 'ذا ليف لتجارة نباتات الزينة' },
    emirate: { en: 'Dubai', ar: 'دبي' },
    lat: 25.15495, lon: 55.46112,
    phone: '+971 50 452 5703',
    hours: { en: 'Every day 08:00–20:00', ar: 'يومياً ٠٨:٠٠–٢٠:٠٠' },
    sells: ['plants', 'chemicals'],
  },
  {
    name: { en: 'Plants & Flowers — Al Barsha', ar: 'نباتات وزهور - البرشاء' },
    emirate: { en: 'Dubai', ar: 'دبي' },
    lat: 25.09484, lon: 55.16618,
    phone: '+971 4 422 4616',
    hours: { en: 'Sat–Thu 09:00–21:00 · Fri 10:00–21:00',
             ar: 'السبت–الخميس ٠٩:٠٠–٢١:٠٠ · الجمعة ١٠:٠٠–٢١:٠٠' },
    sells: ['plants'],
  },
  {
    name: { en: 'Golden Tools Trading — Al Quoz', ar: 'الأدوات الذهبية للتجارة - القوز' },
    emirate: { en: 'Dubai', ar: 'دبي' },
    lat: 25.17356, lon: 55.24450,
    phone: '+971 4 339 3311',
    hours: { en: 'Mon–Sat 08:00–20:00 · Sun 08:00–18:00',
             ar: 'الاثنين–السبت ٠٨:٠٠–٢٠:٠٠ · الأحد ٠٨:٠٠–١٨:٠٠' },
    site: 'https://www.goldentools.ae',
    sells: ['tools', 'chemicals'],
  },
  {
    name: { en: 'Phoenician Plant Nursery', ar: 'مشتل فينيقيا للنباتات' },
    emirate: { en: 'Dubai', ar: 'دبي' },
    lat: null, lon: null,   // no coordinates published; maps link works by name
    phone: '+971 4 882 9484',
    hours: null,
    site: 'https://www.phoenician-uae.com/',
    sells: ['plants', 'chemicals'],
  },
  {
    name: { en: 'The Garden Centre — Al Quoz', ar: 'مركز الحدائق - القوز' },
    emirate: { en: 'Dubai', ar: 'دبي' },
    lat: 25.11677, lon: 55.20545,
    phone: null, hours: null,
    sells: ['plants'],
  },
  {
    name: { en: 'Brook Plants & Landscaping', ar: 'بروك للنباتات وتنسيق الحدائق' },
    emirate: { en: 'Dubai', ar: 'دبي' },
    lat: 25.14886, lon: 55.38930,
    phone: null, hours: null,
    sells: ['plants'],
  },

  /* ---------------- Sharjah ---------------- */
  {
    name: { en: 'Sharjah Plant Souq', ar: 'سوق النباتات - الشارقة' },
    emirate: { en: 'Sharjah', ar: 'الشارقة' },
    lat: 25.35232, lon: 55.37964,
    phone: null, hours: null,
    sells: ['plants'],
  },
  {
    name: { en: 'Golden Tools Trading — Sharjah', ar: 'الأدوات الذهبية للتجارة - الشارقة' },
    emirate: { en: 'Sharjah', ar: 'الشارقة' },
    lat: 25.31926, lon: 55.39876,
    phone: '+971 6 533 0055',
    hours: { en: 'Sat–Thu 08:00–14:00, 16:00–20:00 · Fri 08:00–12:00, 16:00–20:00',
             ar: 'السبت–الخميس ٠٨:٠٠–١٤:٠٠، ١٦:٠٠–٢٠:٠٠ · الجمعة ٠٨:٠٠–١٢:٠٠، ١٦:٠٠–٢٠:٠٠' },
    site: 'https://www.goldentools.ae',
    sells: ['tools', 'chemicals'],
  },
  {
    name: { en: 'Royal Garden Plants Nursery', ar: 'مشتل الحديقة الملكية' },
    emirate: { en: 'Sharjah', ar: 'الشارقة' },
    lat: 25.38846, lon: 55.43678,
    phone: null, hours: null,
    sells: ['plants'],
  },
  {
    name: { en: 'Al Ebdaa Al Mobkar Nursery', ar: 'مشتل الإبداع المبكر' },
    emirate: { en: 'Sharjah', ar: 'الشارقة' },
    lat: 25.37785, lon: 55.45601,
    phone: null, hours: null,
    sells: ['plants'],
  },

  /* ---------------- Umm Al Quwain ---------------- */
  {
    name: { en: 'Apple Tree Nursery', ar: 'مشتل شجرة التفاح' },
    emirate: { en: 'Umm Al Quwain', ar: 'أم القيوين' },
    lat: 25.53918, lon: 55.55268,
    phone: null, hours: null,
    sells: ['plants'],
  },

  /* ---------------- Fujairah ---------------- */
  {
    name: { en: 'Al Baraka Flowers & Gardening', ar: 'البركة للزهور والبستنة' },
    emirate: { en: 'Fujairah', ar: 'الفجيرة' },
    lat: 25.12864, lon: 56.34955,
    phone: '+971 50 873 5008',
    hours: { en: 'Open 24 hours', ar: 'مفتوح ٢٤ ساعة' },
    sells: ['plants'],
  },
  {
    name: { en: 'Wadi Al Bidya Seeds Trading', ar: 'وادي البدية لتجارة البذور' },
    emirate: { en: 'Fujairah', ar: 'الفجيرة' },
    lat: 25.11511, lon: 56.35503,
    phone: '+971 50 391 7836',
    hours: null,
    sells: ['plants', 'chemicals'],
  },
  {
    name: { en: 'Taj Flowers', ar: 'تاج للزهور' },
    emirate: { en: 'Fujairah', ar: 'الفجيرة' },
    lat: 25.11584, lon: 56.35504,
    phone: '+971 50 470 9815',
    hours: null,
    sells: ['plants'],
  },
  {
    name: { en: 'Jamela Nursery', ar: 'مشتل جميلة' },
    emirate: { en: 'Fujairah', ar: 'الفجيرة' },
    lat: 25.12132, lon: 56.35469,
    phone: null, hours: null,
    sells: ['plants'],
  },
];

/**
 * Official help, national in scope, so never distance-sorted — these appear
 * above the shops because for a notifiable pest they are the correct first call.
 *
 * Verified against moccae.gov.ae on 2026-09-07.
 */
export const HELPLINES = [
  {
    name: {
      en: 'Ministry of Climate Change and Environment',
      ar: 'وزارة التغير المناخي والبيئة',
    },
    role: {
      en: 'National plant health, agriculture and pest reporting. The right call for a suspected red palm weevil infestation.',
      ar: 'صحة النبات والزراعة والإبلاغ عن الآفات على مستوى الدولة. الجهة الصحيحة عند الاشتباه بإصابة سوسة النخيل الحمراء.',
    },
    phone: '800 3050',
    altPhone: '+971 2 444 4747',
    email: 'info@moccae.gov.ae',
    hours: { en: 'Sun–Thu 07:00–17:00', ar: 'الأحد–الخميس ٠٧:٠٠–١٧:٠٠' },
    site: 'https://www.moccae.gov.ae/',
  },
  {
    name: {
      en: 'Abu Dhabi Agriculture and Food Safety Authority (ADAFSA)',
      ar: 'هيئة أبوظبي للزراعة والسلامة الغذائية',
    },
    role: {
      en: 'Free advice for farms and growers in the Emirate of Abu Dhabi, including pest and disease diagnosis.',
      ar: 'إرشاد مجاني للمزارع والمزارعين في إمارة أبوظبي، ويشمل تشخيص الآفات والأمراض.',
    },
    phone: '800 555',
    altPhone: '+971 2 818 2888',
    email: null,
    hours: null,
    site: 'https://www.adafsa.gov.ae/',
  },
];

/** The categories a treatment's `search` phrase maps onto, for filtering shops. */
export const SEARCH_CATEGORY = [
  [/fertilizer|fertiliser|iron|gypsum|compost|npk/i, 'chemicals'],
  [/fungicide|pesticide|neem|insecticid|traps/i, 'chemicals'],
  [/pruning|tools|meter|shears/i, 'tools'],
  [/nursery|garden|plant|soil testing/i, 'plants'],
];

/** Which `sells` tag a treatment search phrase implies. */
export function categoryFor(search) {
  for (const [re, cat] of SEARCH_CATEGORY) if (re.test(search)) return cat;
  return 'plants';
}
