/**
 * Minimal two-language dictionary. Arabic flips the document to RTL.
 * Lookup is `t('key')`; missing keys fall back to English, then to the key.
 *
 * Long-form prose does not live here — the About Us page renders both languages
 * at once and keeps its text in data/about.js, and finding text lives beside the
 * analyser that produces it in health.js. This file is for interface labels.
 */
const STRINGS = {
  en: {
    'app.name': 'Green-Trace UAE',
    'app.tag': 'UAE Leaf Identification & Health AI',

    'nav.scan': 'Scan',
    'nav.library': 'Trees',
    'nav.nearby': 'Nearby',
    'nav.about': 'About Us',
    'nav.team': 'Team',

    'scan.title': 'Identify a UAE tree from its leaf',
    'scan.lede': 'Point the camera at one leaf on a plain background. Everything runs on your device, offline.',
    'scan.drop': 'Take or choose a photo',
    'scan.dropHint': 'Tap here · or drag an image in',
    'scan.camera': 'Use camera',
    'scan.upload': 'Upload photo',
    'scan.capture': 'Capture',
    'scan.cancel': 'Cancel',
    'scan.again': 'Scan another leaf',
    'scan.analysing': 'Analysing leaf…',
    'scan.loadingModel': 'Loading AI model…',
    'scan.eyebrow': 'Leaf scanner',
    'scan.tipLine': 'One leaf · plain background · even light',
    'scan.knows': 'The {n} trees in this app',
    'scan.knowsAll': 'Read about them',

    'result.species': 'Species identification',
    'result.confidence': 'Confidence',
    'result.alternatives': 'Other possibilities',
    'result.lowConf': 'Confidence is low. This may still be the right tree, but check the leaf fills the frame and the light is even before relying on it.',
    'result.health': 'Leaf health analysis',
    'result.healthScore': 'Health score',
    'result.findings': 'What the analysis found',
    'result.method': 'How this was measured',
    'result.methodBody': 'Species comes from a MobileNetV2 convolutional neural network fine-tuned on field photographs. Health is measured separately by classical computer vision: the photo is white-balanced against its own background, the leaf is segmented out, and each pixel is graded as healthy, chlorotic or necrotic. Colour uniformity and surface texture are measured inside the leaf only, so its outline is never mistaken for damage.',
    'result.readMore': 'Read about this tree',
    'result.disclaimer': 'A classroom demonstration, not a substitute for an agricultural inspection.',
    'result.showOriginal': 'Show original photo',
    'result.showAnalysis': 'Show health analysis',

    'unknown.title': 'I don’t recognise this leaf',
    'unknown.body': 'This does not match any of the trees the model was trained on. Rather than force it into the closest one, the app is telling you it does not know.',
    'unknown.noFoliage': 'There is little or no plant tissue in the photo.',
    'unknown.unfamiliar': 'The image sits far from every species the model was trained on.',
    'unknown.lowProbability': 'No species scored anywhere near high enough.',
    'unknown.spreadEvenly': 'The scores are spread almost evenly, which means guessing.',
    'unknown.seeFour': 'See the species it knows',

    'health.excellent': 'Healthy',
    'health.good': 'Mostly healthy',
    'health.fair': 'Mild stress',
    'health.poor': 'Stressed',
    'health.critical': 'Severely affected',

    'metric.chlorosis': 'Chlorosis',
    'metric.necrosis': 'Necrosis',
    'metric.greenness': 'Greenness',
    'metric.uniformity': 'Uniformity',
    'metric.coverage': 'Leaf area',
    'metric.texture': 'Texture variance',

    'treat.title': 'What to do about it',
    'treat.chlorosis': 'Treat the yellowing',
    'treat.necrosis': 'Stop the dieback spreading',
    'treat.pest': 'Deal with the pest',
    'treat.pale': 'Feed the tree',
    'treat.salinity': 'Check for salt stress',

    'nearby.title': 'Where to get it near you',
    'nearby.lede': 'Nurseries and agricultural suppliers from our directory. Share your location to sort them by distance, or search Google Maps for anything not listed.',
    'nearby.findOnMaps': 'Find near me',
    'nearby.useLocation': 'Sort by distance from me',
    'nearby.locating': 'Finding your location…',
    'nearby.sorted': 'Sorted by distance',
    'nearby.denied': 'Location unavailable — showing the full list instead.',
    'nearby.directions': 'Directions',
    'nearby.website': 'Website',
    'nearby.hoursUnknown': 'Opening hours not recorded — check Google Maps',
    'nearby.none': 'No suppliers listed for this category yet.',
    'nearby.pageTitle': 'Help near you',
    'nearby.pageLede': 'Official plant-health helplines, and nurseries and agricultural suppliers across the Emirates.',
    'nearby.official': 'Official help',
    'nearby.shops': 'Nurseries and suppliers',
    'nearby.osmCredit': 'Shop locations, phone numbers and hours from OpenStreetMap contributors, ODbL. Volunteer-maintained, so check by phone before travelling.',

    'aboutus.title': 'About Green-Trace UAE',
    'aboutus.lede': 'A graduation project built on a simple idea: that a phone should be able to tell you what a tree is, and whether it is dying.',
    'aboutus.tryIt': 'Try our project out',
    'aboutus.tryHeading': 'See it work',
    'aboutus.tryBody': 'Point it at a leaf. Everything happens on your device, and it works with the wifi switched off.',
    'aboutus.seeNumbers': 'The numbers behind it',
    'aboutus.meetTeam': 'Meet the team',
    'aboutus.portraitCredit': 'Portraits: National Archives of the UAE (public domain); Press Service of the President of Azerbaijan (CC BY 4.0); International Monetary Fund (public domain).',

    'model.title': 'How the model works',
    'model.how': 'The pipeline, end to end',
    'model.how1': 'A MobileNetV2 convolutional neural network, pre-trained on ImageNet, converts the leaf photo into a 1,280-number description of its shape, texture and pattern.',
    'model.how2': 'A small classifier, trained by us on openly-licensed field photographs of each species, maps that description onto a tree.',
    'model.how3': 'Before naming anything, the photo is checked against the average appearance of each species in that 1,280-number space. Something unlike all of them is reported as unrecognised instead of being forced into the nearest class.',
    'model.how4': 'Health is measured separately, without a neural network, so every number can be explained: the leaf is white-balanced and cut out of the background, then each pixel is graded as healthy, chlorotic (yellowing) or necrotic (dead).',
    'model.performance': 'Model performance',
    'model.valAcc': 'Validation accuracy',
    'model.samples': 'Training samples',
    'model.species': 'Species',
    'model.perSpecies': 'Accuracy per species',
    'model.heldOut': 'Measured on a held-out validation split the model never trained on.',
    'model.credits': 'Credits & licence',
    'model.creditsBody': 'Training photographs come from iNaturalist contributors under Creative Commons licences; every photo used is credited in dataset/inaturalist/CREDITS.json in the repository. The base network is Google’s MobileNetV2 (Apache 2.0). Source code:',

    'about.qr': 'Open on your phone',
    'about.qrHint': 'Scan to load this app instantly. It installs to the home screen and works offline.',

    'team.title': 'The team',
    'team.lede': 'A graduation project by five students.',
    'team.split': 'Who did what',
    'team.splitNote': 'Percentages are the team’s own assessment of how the work divided across research, data collection, model training, programming and presentation.',
    'team.gradProject': 'Graduation Project',

    'theme.group.auto': 'Automatic',
    'theme.group.emirati': 'Made for this project',
    'theme.group.light': 'Light',
    'theme.group.dark': 'Dark',
    'theme.group.access': 'Accessibility',

    'settings.title': 'Appearance',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.close': 'Done',
    'settings.motion': 'Animation',
    'settings.motionHint': "Auto follows your device's reduced-motion setting.",
    'motion.auto': 'Auto',
    'motion.on': 'Full',
    'motion.off': 'Off',

    'library.title': 'The trees it knows',
    'library.lede': 'Native, naturalised and invasive — the species that between them cover most of what grows in the Emirates.',
    'library.leaf': 'How to recognise the leaf',
    'library.about': 'About the tree',
    'library.significance': 'Why it matters here',
    'library.health': 'Common health problems',
    'library.back': 'All trees',
    'library.referenceOnly': 'Reference only',

    'err.model': 'The AI model could not be loaded. Check your connection and reload.',
    'err.camera': 'Camera unavailable. Upload a photo instead.',
    'err.image': 'That image could not be read. Try another one.',
    'copied': 'Link copied',
  },

  ar: {
    'app.name': 'الأثر الأخضر',
    'app.tag': 'تعرّف على أشجار الإمارات وصحتها بالذكاء الاصطناعي',

    'nav.scan': 'مسح',
    'nav.library': 'الأشجار',
    'nav.nearby': 'قريب منك',
    'nav.about': 'عن المشروع',
    'nav.team': 'الفريق',

    'scan.title': 'تعرّف على شجرة إماراتية من ورقتها',
    'scan.lede': 'وجّه الكاميرا إلى ورقة واحدة على خلفية سادة. كل المعالجة على جهازك ودون إنترنت.',
    'scan.drop': 'التقط صورة أو اخترها',
    'scan.dropHint': 'اضغط هنا · أو اسحب صورة',
    'scan.camera': 'استخدام الكاميرا',
    'scan.upload': 'رفع صورة',
    'scan.capture': 'التقاط',
    'scan.cancel': 'إلغاء',
    'scan.again': 'مسح ورقة أخرى',
    'scan.analysing': 'جارٍ التحليل…',
    'scan.loadingModel': 'جارٍ تحميل النموذج…',
    'scan.eyebrow': 'ماسح الأوراق',
    'scan.tipLine': 'ورقة واحدة · خلفية سادة · إضاءة متساوية',
    'scan.knows': 'الأشجار العشر في التطبيق',
    'scan.knowsAll': 'اقرأ عنها',

    'result.species': 'تحديد النوع',
    'result.confidence': 'نسبة الثقة',
    'result.alternatives': 'احتمالات أخرى',
    'result.lowConf': 'الثقة منخفضة. قد تكون الشجرة صحيحة رغم ذلك، لكن تأكد أن الورقة تملأ الإطار وأن الإضاءة متساوية قبل الاعتماد على النتيجة.',
    'result.health': 'تحليل صحة الورقة',
    'result.healthScore': 'مؤشر الصحة',
    'result.findings': 'نتائج التحليل',
    'result.method': 'طريقة القياس',
    'result.methodBody': 'يُحدَّد النوع بشبكة عصبية التفافية MobileNetV2 مدرَّبة على صور ميدانية. أما الصحة فتُقاس بالرؤية الحاسوبية الكلاسيكية: تُضبط إضاءة الصورة اعتماداً على خلفيتها، ثم تُفصل الورقة عن تلك الخلفية، وتُصنَّف كل بكسل كسليمة أو مصفرّة أو متنخرة. ويُقاس تجانس اللون وملمس السطح داخل الورقة فقط، حتى لا يُحسب حدّها الخارجي ضرراً.',
    'result.readMore': 'اقرأ عن هذه الشجرة',
    'result.disclaimer': 'عرض تعليمي ولا يغني عن الفحص الزراعي المتخصص.',
    'result.showOriginal': 'إظهار الصورة الأصلية',
    'result.showAnalysis': 'إظهار تحليل الصحة',

    'unknown.title': 'لا أتعرّف على هذه الورقة',
    'unknown.body': 'لا تطابق هذه الصورة أياً من الأشجار التي تدرّب عليها النموذج. وبدل حشرها في أقربها، يخبرك التطبيق بأنه لا يعرف.',
    'unknown.noFoliage': 'لا يوجد نسيج نباتي في الصورة أو يكاد.',
    'unknown.unfamiliar': 'الصورة بعيدة عن كل نوع تدرّب عليه النموذج.',
    'unknown.lowProbability': 'لم يحصل أي نوع على درجة قريبة من الكافية.',
    'unknown.spreadEvenly': 'الدرجات موزّعة بالتساوي تقريباً، وهذا يعني التخمين.',
    'unknown.seeFour': 'شاهد الأنواع التي يعرفها',

    'health.excellent': 'سليمة',
    'health.good': 'سليمة غالباً',
    'health.fair': 'إجهاد خفيف',
    'health.poor': 'مُجهَدة',
    'health.critical': 'متضررة بشدة',

    'metric.chlorosis': 'الاصفرار',
    'metric.necrosis': 'التنخر',
    'metric.greenness': 'درجة الخضرة',
    'metric.uniformity': 'تجانس اللون',
    'metric.coverage': 'مساحة الورقة',
    'metric.texture': 'تباين الملمس',

    'treat.title': 'ما العمل',
    'treat.chlorosis': 'عالج الاصفرار',
    'treat.necrosis': 'أوقف انتشار الموت',
    'treat.pest': 'تعامل مع الآفة',
    'treat.pale': 'غذِّ الشجرة',
    'treat.salinity': 'افحص الإجهاد الملحي',

    'nearby.title': 'أين تجده قربك',
    'nearby.lede': 'مشاتل وموردون زراعيون من دليلنا. شارك موقعك لترتيبهم حسب المسافة، أو ابحث في خرائط جوجل عمّا ليس في القائمة.',
    'nearby.findOnMaps': 'ابحث قربي',
    'nearby.useLocation': 'رتّب حسب المسافة مني',
    'nearby.locating': 'جارٍ تحديد موقعك…',
    'nearby.sorted': 'مرتّب حسب المسافة',
    'nearby.denied': 'تعذّر تحديد الموقع — تُعرض القائمة كاملة.',
    'nearby.directions': 'الاتجاهات',
    'nearby.website': 'الموقع',
    'nearby.hoursUnknown': 'ساعات العمل غير مسجّلة — راجع خرائط جوجل',
    'nearby.none': 'لا يوجد موردون في هذه الفئة بعد.',
    'nearby.pageTitle': 'مساعدة قريبة منك',
    'nearby.pageLede': 'خطوط المساعدة الرسمية لصحة النبات، ومشاتل وموردون زراعيون في مختلف الإمارات.',
    'nearby.official': 'الجهات الرسمية',
    'nearby.shops': 'المشاتل والموردون',
    'nearby.osmCredit': 'مواقع المتاجر وأرقامها وساعات عملها من مساهمي OpenStreetMap بترخيص ODbL. يحدّثها متطوعون، لذا اتصل قبل الذهاب.',

    'aboutus.title': 'عن الأثر الأخضر',
    'aboutus.lede': 'مشروع تخرج بُني على فكرة بسيطة: أن يستطيع الهاتف أن يخبرك ما هذه الشجرة، وهل هي تموت.',
    'aboutus.tryIt': 'جرّب مشروعنا',
    'aboutus.tryHeading': 'شاهده يعمل',
    'aboutus.tryBody': 'وجّهه إلى ورقة شجر. كل شيء يحدث على جهازك، ويعمل والواي فاي مطفأ.',
    'aboutus.seeNumbers': 'الأرقام وراءه',
    'aboutus.meetTeam': 'تعرّف على الفريق',
    'aboutus.portraitCredit': 'الصور: الأرشيف الوطني للإمارات (ملكية عامة)؛ الدائرة الصحفية لرئيس أذربيجان (CC BY 4.0)؛ صندوق النقد الدولي (ملكية عامة).',

    'model.title': 'كيف يعمل النموذج',
    'model.how': 'المسار من البداية إلى النهاية',
    'model.how1': 'شبكة عصبية التفافية MobileNetV2 مدرَّبة مسبقاً على ImageNet تحوّل صورة الورقة إلى وصف رقمي من ١٢٨٠ قيمة يمثل شكلها وملمسها ونمطها.',
    'model.how2': 'مصنّف صغير دربناه على صور ميدانية مفتوحة الترخيص لكل نوع يربط هذا الوصف بالشجرة المناسبة.',
    'model.how3': 'قبل تسمية أي نوع، تُقارن الصورة بالمظهر المتوسط لكل نوع في فضاء الـ١٢٨٠ قيمة. وما لا يشبه أياً منها يُعلَن أنه غير معروف بدل حشره في أقرب فئة.',
    'model.how4': 'تُقاس الصحة بشكل منفصل ودون شبكة عصبية حتى يمكن تفسير كل رقم: تُضبط إضاءة الورقة وتُفصل عن الخلفية، ثم تُصنَّف كل بكسل كسليمة أو مصفرّة أو متنخرة.',
    'model.performance': 'أداء النموذج',
    'model.valAcc': 'دقة التحقق',
    'model.samples': 'عينات التدريب',
    'model.species': 'الأنواع',
    'model.perSpecies': 'الدقة لكل نوع',
    'model.heldOut': 'قيست على مجموعة تحقق منفصلة لم يتدرب عليها النموذج.',
    'model.credits': 'المصادر والترخيص',
    'model.creditsBody': 'صور التدريب من مساهمي iNaturalist بتراخيص المشاع الإبداعي، وكل صورة مستخدمة موثقة في ملف CREDITS.json داخل المستودع. الشبكة الأساسية هي MobileNetV2 من جوجل بترخيص Apache 2.0. الشيفرة المصدرية:',

    'about.qr': 'افتح التطبيق على هاتفك',
    'about.qrHint': 'امسح الرمز لفتح التطبيق فوراً. يمكن تثبيته على الشاشة الرئيسية ويعمل دون إنترنت.',

    'team.title': 'الفريق',
    'team.lede': 'مشروع تخرج من إعداد خمسة طلاب.',
    'team.split': 'من فعل ماذا',
    'team.splitNote': 'النسب تقدير الفريق نفسه لتوزّع العمل بين البحث وجمع البيانات وتدريب النموذج والبرمجة والعرض.',
    'team.gradProject': 'مشروع تخرج',

    'theme.group.auto': 'تلقائي',
    'theme.group.emirati': 'مصممة لهذا المشروع',
    'theme.group.light': 'فاتحة',
    'theme.group.dark': 'داكنة',
    'theme.group.access': 'إمكانية الوصول',

    'settings.title': 'المظهر',
    'settings.theme': 'السمة',
    'settings.language': 'اللغة',
    'settings.close': 'تم',
    'settings.motion': 'الحركة',
    'settings.motionHint': 'الوضع التلقائي يتبع إعداد تقليل الحركة في جهازك.',
    'motion.auto': 'تلقائي',
    'motion.on': 'كاملة',
    'motion.off': 'إيقاف',

    'library.title': 'الأشجار التي يعرفها',
    'library.lede': 'محلية ومستوطنة وغازية — أنواع تغطي بينها معظم ما ينمو في الإمارات.',
    'library.leaf': 'كيف تميّز الورقة',
    'library.about': 'عن الشجرة',
    'library.significance': 'أهميتها لدينا',
    'library.health': 'المشكلات الصحية الشائعة',
    'library.back': 'كل الأشجار',
    'library.referenceOnly': 'مرجع فقط',

    'err.model': 'تعذّر تحميل النموذج. تحقق من الاتصال وأعد التحميل.',
    'err.camera': 'الكاميرا غير متاحة. ارفع صورة بدلاً من ذلك.',
    'err.image': 'تعذّرت قراءة الصورة. جرّب صورة أخرى.',
    'copied': 'تم نسخ الرابط',
  },
};

const LANG_KEY = 'gt.lang';
let current = localStorage.getItem(LANG_KEY) || (navigator.language?.startsWith('ar') ? 'ar' : 'en');

export const lang = () => current;
export const isRTL = () => current === 'ar';

/**
 * Looks up a string, optionally filling `{name}` placeholders.
 *
 * Interpolation rather than concatenation because word order differs between
 * the two languages: "Knows 10 species" and "يعرف ١٠ أنواع" put the number in
 * different places, and gluing strings together would force one of them to be
 * wrong.
 */
export function t(key, vars) {
  const str = STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}

/** Applies the language to <html> and notifies listeners so views can re-render. */
export function setLang(next) {
  current = STRINGS[next] ? next : 'en';
  localStorage.setItem(LANG_KEY, current);
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
  window.dispatchEvent(new CustomEvent('gt:lang', { detail: current }));
}

export function initLang() {
  document.documentElement.lang = current;
  document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
}
