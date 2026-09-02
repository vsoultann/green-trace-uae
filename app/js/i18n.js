/**
 * Minimal two-language dictionary. Arabic flips the document to RTL.
 * Lookup is `t('key')`; missing keys fall back to English, then to the key.
 */
const STRINGS = {
  en: {
    'app.name': 'Green-Trace UAE',
    'app.tag': 'UAE Leaf Identification & Health AI',

    'nav.scan': 'Scan',
    'nav.library': 'Trees',
    'nav.about': 'About',
    'nav.team': 'Made By',

    'scan.title': 'Identify a UAE tree from its leaf',
    'scan.lede': 'Point your camera at a single leaf on a plain background, or upload a photo. Everything runs on your device — no internet needed after the first load.',
    'scan.drop': 'Take or choose a photo',
    'scan.dropHint': 'Tap here · or drag an image in',
    'scan.camera': 'Use camera',
    'scan.upload': 'Upload photo',
    'scan.capture': 'Capture',
    'scan.again': 'Scan another leaf',
    'scan.analysing': 'Analysing leaf…',
    'scan.loadingModel': 'Loading AI model…',
    'scan.tipTitle': 'For the best result',
    'scan.tip1': 'One leaf, filling most of the frame',
    'scan.tip2': 'Plain, contrasting background (paper works well)',
    'scan.tip3': 'Even light, no harsh shadow across the leaf',
    'scan.demo': 'Try a sample leaf',

    'result.species': 'Species identification',
    'result.confidence': 'Confidence',
    'result.alternatives': 'Other possibilities',
    'result.lowConf': 'Low confidence — this may not be one of the four species in the library, or the photo may be unclear.',
    'result.health': 'Leaf health analysis',
    'result.healthScore': 'Health score',
    'result.findings': 'What the analysis found',
    'result.method': 'How this was measured',
    'result.methodBody': 'Species comes from a MobileNetV2 convolutional neural network fine-tuned on field photographs. Health is measured separately by classical computer vision: the leaf is segmented from the background using the Excess Green index, then scored on chlorosis (yellowing), necrosis (dead brown tissue), colour uniformity and texture variance.',
    'result.readMore': 'Read about this tree',
    'result.disclaimer': 'A classroom demonstration, not a substitute for an agricultural inspection.',

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

    'library.title': 'The four trees',
    'library.lede': 'Green-Trace UAE is trained on four species that define the Emirati landscape.',
    'library.leaf': 'How to recognise the leaf',
    'library.about': 'About the tree',
    'library.significance': 'Why it matters here',
    'library.health': 'Common health problems',
    'library.back': 'All trees',

    'about.title': 'About Green-Trace UAE',
    'about.qr': 'Open on your phone',
    'about.qrHint': 'Scan to load this app instantly. It installs to the home screen and works offline.',

    'team.title': 'Made by',
    'team.lede': 'A graduation project by five students.',

    'settings.title': 'Appearance',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.close': 'Done',
    'settings.motion': 'Animation',
    'settings.motionHint': "Auto follows your device's reduced-motion setting.",
    'motion.auto': 'Auto',
    'motion.on': 'Full',
    'motion.off': 'Off',

    'theme.desert-dawn': 'Desert Dawn',
    'theme.desert-dawn.d': 'Warm sand and gold, light',
    'theme.oasis': 'Oasis',
    'theme.oasis.d': 'Fresh green, light',
    'theme.night-falcon': 'Night Falcon',
    'theme.night-falcon.d': 'Deep navy and gold, dark',
    'theme.mangrove': 'Mangrove',
    'theme.mangrove.d': 'Coastal teal, dark',
    'theme.contrast': 'High Contrast',
    'theme.contrast.d': 'Maximum legibility',
    'theme.system': 'Match device',
    'theme.system.d': 'Follow your system setting',

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
    'nav.about': 'عن المشروع',
    'nav.team': 'الفريق',

    'scan.title': 'تعرّف على شجرة إماراتية من ورقتها',
    'scan.lede': 'صوّر ورقة واحدة على خلفية سادة، أو ارفع صورة. كل المعالجة تتم على جهازك ولا تحتاج إنترنت بعد التحميل الأول.',
    'scan.drop': 'التقط صورة أو اخترها',
    'scan.dropHint': 'اضغط هنا · أو اسحب صورة',
    'scan.camera': 'استخدام الكاميرا',
    'scan.upload': 'رفع صورة',
    'scan.capture': 'التقاط',
    'scan.again': 'مسح ورقة أخرى',
    'scan.analysing': 'جارٍ التحليل…',
    'scan.loadingModel': 'جارٍ تحميل النموذج…',
    'scan.tipTitle': 'للحصول على أفضل نتيجة',
    'scan.tip1': 'ورقة واحدة تملأ معظم الإطار',
    'scan.tip2': 'خلفية سادة مغايرة في اللون (الورق مناسب)',
    'scan.tip3': 'إضاءة متساوية بلا ظلال حادة',
    'scan.demo': 'جرّب ورقة نموذجية',

    'result.species': 'تحديد النوع',
    'result.confidence': 'نسبة الثقة',
    'result.alternatives': 'احتمالات أخرى',
    'result.lowConf': 'الثقة منخفضة — قد لا تكون الورقة من الأنواع الأربعة، أو الصورة غير واضحة.',
    'result.health': 'تحليل صحة الورقة',
    'result.healthScore': 'مؤشر الصحة',
    'result.findings': 'نتائج التحليل',
    'result.method': 'طريقة القياس',
    'result.methodBody': 'يُحدَّد النوع بشبكة عصبية التفافية MobileNetV2 مدرَّبة على صور ميدانية. أما الصحة فتُقاس بالرؤية الحاسوبية الكلاسيكية: تُفصل الورقة عن الخلفية بمؤشر الأخضر الزائد، ثم تُقيَّم درجة الاصفرار والتنخر وتجانس اللون وتباين الملمس.',
    'result.readMore': 'اقرأ عن هذه الشجرة',
    'result.disclaimer': 'عرض تعليمي ولا يغني عن الفحص الزراعي المتخصص.',

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

    'library.title': 'الأشجار الأربع',
    'library.lede': 'دُرِّب الأثر الأخضر على أربعة أنواع تُشكّل ملامح البيئة الإماراتية.',
    'library.leaf': 'كيف تميّز الورقة',
    'library.about': 'عن الشجرة',
    'library.significance': 'أهميتها لدينا',
    'library.health': 'المشكلات الصحية الشائعة',
    'library.back': 'كل الأشجار',

    'about.title': 'عن الأثر الأخضر',
    'about.qr': 'افتح التطبيق على هاتفك',
    'about.qrHint': 'امسح الرمز لفتح التطبيق فوراً. يمكن تثبيته على الشاشة الرئيسية ويعمل دون إنترنت.',

    'team.title': 'إعداد',
    'team.lede': 'مشروع تخرج من إعداد خمسة طلاب.',

    'settings.title': 'المظهر',
    'settings.theme': 'السمة',
    'settings.language': 'اللغة',
    'settings.close': 'تم',
    'settings.motion': 'الحركة',
    'settings.motionHint': 'الوضع التلقائي يتبع إعداد تقليل الحركة في جهازك.',
    'motion.auto': 'تلقائي',
    'motion.on': 'كاملة',
    'motion.off': 'إيقاف',

    'theme.desert-dawn': 'فجر الصحراء',
    'theme.desert-dawn.d': 'رملي ذهبي، فاتح',
    'theme.oasis': 'الواحة',
    'theme.oasis.d': 'أخضر منعش، فاتح',
    'theme.night-falcon': 'صقر الليل',
    'theme.night-falcon.d': 'كحلي وذهبي، داكن',
    'theme.mangrove': 'القرم',
    'theme.mangrove.d': 'أزرق ساحلي، داكن',
    'theme.contrast': 'تباين عالٍ',
    'theme.contrast.d': 'أقصى وضوح للقراءة',
    'theme.system': 'حسب الجهاز',
    'theme.system.d': 'اتّبع إعداد نظامك',

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

export function t(key) {
  return STRINGS[current]?.[key] ?? STRINGS.en[key] ?? key;
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
