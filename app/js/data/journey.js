/**
 * How the project was made, and what changed between versions.
 *
 * Dates marked `fromGit: true` are taken from the repository's commit history
 * and are exact. Dates the repository cannot know — when the idea started, when
 * the field photography happened, when the showcase is — carry `todo: true` and
 * render with a "to confirm" marker, because a made-up date on an assessment
 * page is worse than an honest gap.
 *
 * Every iteration-log entry follows the same four beats: the problem we found,
 * the change we made, the evidence that the problem was real, and the result.
 * An entry that cannot fill all four is not an iteration, it is a preference.
 */

export const STAGES = [
  {
    id: 'research',
    date: { en: 'Term 1, weeks 1–2', ar: 'الفصل الأول، الأسبوعان 1–2' },
    todo: true,
    title: { en: 'Research', ar: 'البحث' },
    body: {
      en: 'Chose the problem and the ten trees. Read up on Ghaf dieback, salinity stress and the spread of mesquite, and worked out which of them a single photograph of a leaf could actually reveal.',
      ar: 'اخترنا المشكلة والأشجار العشر، وقرأنا عن موت أطراف الغاف والإجهاد الملحي وانتشار المسكيت، وحدّدنا ما يمكن لصورة ورقة واحدة أن تكشفه منها فعلاً.',
    },
  },
  {
    id: 'design',
    date: { en: 'Term 1, week 3', ar: 'الفصل الأول، الأسبوع 3' },
    todo: true,
    title: { en: 'Design', ar: 'التصميم' },
    body: {
      en: 'Sketched the two questions the app answers — which tree, and is this leaf healthy — and decided early that they would be answered by two separate systems so that one could be explained even when the other could not.',
      ar: 'رسمنا السؤالين اللذين يجيب عنهما التطبيق: أي شجرة هذه، وهل الورقة سليمة. وقرّرنا مبكراً أن يجيب عنهما نظامان منفصلان، ليبقى أحدهما قابلاً للشرح حتى حين يصعب شرح الآخر.',
    },
  },
  {
    id: 'build',
    date: { en: '2–7 September 2026', ar: '2–7 سبتمبر 2026' },
    fromGit: true,
    title: { en: 'Build — v1, Green-Trace UAE', ar: 'البناء — النسخة الأولى، الأثر الأخضر' },
    body: {
      en: 'The working prototype: MobileNetV2 with a trained head, the classical-vision health analyser, the offline service worker and the supplier directory. Six commits over six days.',
      ar: 'النموذج الأولي العامل: شبكة MobileNetV2 مع طبقة مدرَّبة، ومحلّل الصحة بالرؤية الكلاسيكية، وعامل الخدمة للعمل دون إنترنت، ودليل المورّدين. ستة إيداعات في ستة أيام.',
    },
  },
  {
    id: 'testing',
    date: { en: '7 September 2026', ar: '7 سبتمبر 2026' },
    fromGit: true,
    title: { en: 'Testing & calibration', ar: 'الاختبار والمعايرة' },
    body: {
      en: 'Ran the health analyser against the reference set and found it was calling healthy leaves sick. Rebuilt the segmentation and the scoring, and added a calibration harness so the claim could be re-checked rather than re-argued.',
      ar: 'شغّلنا محلّل الصحة على المجموعة المرجعية فوجدناه يصنّف أوراقاً سليمة على أنها مريضة. أعدنا بناء الفصل والتقييم، وأضفنا أداة معايرة تتيح إعادة التحقق من النتيجة بدل الجدال حولها.',
    },
  },
  {
    id: 'iteration',
    date: { en: '11 September 2026', ar: '11 سبتمبر 2026' },
    fromGit: true,
    title: { en: 'Iteration — v2, Warif', ar: 'التحسين — النسخة الثانية، وارف' },
    body: {
      en: 'The rebrand and the interface rebuild. A name in Arabic, an identity drawn from Al Sadu weaving, a layout that uses a desktop screen, and an honest count of what the model actually recognises.',
      ar: 'إعادة التسمية وإعادة بناء الواجهة: اسم عربي، وهوية مستمدّة من نسيج السدو، وتخطيط يستفيد من شاشة الحاسوب، وعدد صادق لما يتعرّف عليه النموذج فعلاً.',
    },
  },
  {
    id: 'showcase',
    date: { en: 'Term 1 showcase', ar: 'معرض الفصل الأول' },
    todo: true,
    title: { en: 'Showcase', ar: 'العرض' },
    body: {
      en: 'Kiosk mode, the presentation deck, the A1 poster and the evaluator feedback form — all inside the app itself, so there is one thing to set up on the table and nothing to forget on a memory stick.',
      ar: 'وضع الكشك، وشرائح العرض، والملصق بمقاس A1، ونموذج رأي المقيّمين — كلها داخل التطبيق نفسه، فلا يبقى على الطاولة سوى شيء واحد يُجهَّز، ولا شيء يُنسى على ذاكرة محمولة.',
    },
  },
];

/**
 * The iteration log. `screens` names a pair of files in docs/evidence/{v1,v2}
 * for the before/after comparison; entries without one still stand on the
 * evidence described in `evidence`.
 */
export const ITERATIONS = [
  {
    id: 'species-count',
    severity: 'correctness',
    problem: {
      en: 'The model page announced "Species: 10" while the deployed model was trained on four. Anybody who scanned a mangrove leaf and got "Ghaf" had been told, by our own page, that mangrove was covered.',
      ar: 'كانت صفحة النموذج تعلن «10 أنواع» بينما النموذج المنشور مدرَّب على أربعة. فمن مسح ورقة قرم وحصل على «الغاف» كانت صفحتنا نفسها قد أخبرته أن القرم مشمول.',
    },
    change: {
      en: 'Every count is now written as two numbers: how many trees are in the library, and how many the current model recognises. The second comes from metadata.classes.length, so it cannot drift from the model again. Untrained trees carry a "Reference only" badge wherever they appear.',
      ar: 'صار كل عدد يُكتب برقمين: كم شجرة في المكتبة، وكم منها يتعرّف عليها النموذج الحالي. والرقم الثاني يأتي من metadata.classes.length فلا يمكن أن يفترق عن النموذج مجدداً. وتحمل الأشجار غير المدرَّبة شارة «للاطّلاع فقط» أينما ظهرت.',
    },
    evidence: {
      en: 'app/model/metadata.json lists 4 classes and a 0.8147 validation accuracy; data/species.js lists 10.',
      ar: 'يذكر ملف app/model/metadata.json أربعة أصناف ودقة تحقق 0٫8147، بينما يذكر data/species.js عشرة أنواع.',
    },
    result: {
      en: 'The smoke test now fails if the number shown on screen and the number in the metadata disagree.',
      ar: 'صار اختبار التشغيل يفشل إذا اختلف الرقم المعروض على الشاشة عن الرقم في بيانات النموذج.',
    },
    screens: { v1: 'model-en-desktop.png', v2: 'project-how-en-desktop.png' },
  },
  {
    id: 'health-calibration',
    severity: 'accuracy',
    problem: {
      en: 'The first health analyser reported only 11.3% of known-healthy reference leaves as healthy. It was reading the dark background around a leaf as dead tissue, and a leaf photographed on a desk was condemned for the desk.',
      ar: 'صنّف محلّل الصحة الأول 11٫3٪ فقط من الأوراق المرجعية السليمة على أنها سليمة. كان يقرأ الخلفية الداكنة حول الورقة على أنها نسيج ميت، فتُدان الورقة المصوَّرة على طاولة بسبب الطاولة.',
    },
    change: {
      en: 'White-balance the photo against its own background, segment the leaf out first, and measure colour and texture only inside the blade. Then calibrate the thresholds against the reference set with tools/health-calibrate.mjs.',
      ar: 'ضبط إضاءة الصورة على خلفيتها، ثم فصل الورقة أولاً، وقياس اللون والملمس داخل النصل فقط. ثم معايرة العتبات على المجموعة المرجعية بأداة tools/health-calibrate.mjs.',
    },
    evidence: {
      en: 'npm run calibrate, before and after, on the same reference photographs.',
      ar: 'تشغيل npm run calibrate قبل وبعد، على الصور المرجعية نفسها.',
    },
    result: {
      en: 'Healthy leaves reported healthy rose from 11.3% to 48.1%, and the median score on them from 47 to 86. Synthetic necrosis is detected 100% of the time and synthetic chlorosis 93–97%.',
      ar: 'ارتفعت نسبة الأوراق السليمة المصنَّفة سليمة من 11٫3٪ إلى 48٫1٪، ووسيط درجاتها من 47 إلى 86. ويُرصد التنخّر المصطنع بنسبة 100٪ والاصفرار المصطنع بنسبة 93–97٪.',
    },
  },
  {
    id: 'identity',
    severity: 'design',
    problem: {
      en: 'v1 looked like a template: cream background, a serif display face, a clay accent, every section in an identically rounded card, and all-caps eyebrow labels shouting LEAF SCANNER and WHO DID WHAT. Nothing in it was from here.',
      ar: 'بدت النسخة الأولى قالباً جاهزاً: خلفية كريمية، وخط عنوان مذيّل، ولون طيني، وكل قسم في بطاقة مستديرة متطابقة، وعناوين صغيرة بحروف كبيرة تصرخ LEAF SCANNER وWHO DID WHAT. لم يكن فيها شيء من هنا.',
    },
    change: {
      en: 'An identity built on Al Sadu: a woven band as the one bold element, Reem Kufi and Readex Pro instead of a Latin serif, a Ghaf-green palette, and a split between smooth surfaces for content and woven cells for data.',
      ar: 'هوية مبنية على السدو: شريط منسوج بوصفه العنصر البارز الوحيد، وخطا ريم كوفي وريدكس برو بدل الخط اللاتيني المذيّل، ولوحة ألوان من أخضر الغاف، وفصلٌ بين أسطح ناعمة للمحتوى وخلايا منسوجة للبيانات.',
    },
    evidence: {
      en: 'The v1 screenshots in docs/evidence/v1, taken before any change was made.',
      ar: 'لقطات النسخة الأولى في docs/evidence/v1، الملتقطة قبل أي تعديل.',
    },
    result: {
      en: 'The app now reads as one thing made in Al Ain rather than a theme with a leaf in it.',
      ar: 'صار التطبيق يُقرأ بوصفه شيئاً واحداً صُنع في العين، لا قالباً وُضعت فيه ورقة شجر.',
    },
    screens: { v1: 'scan-en-desktop.png', v2: 'home-en-desktop.png' },
  },
  {
    id: 'desktop',
    severity: 'design',
    problem: {
      en: 'On a 1366px laptop — which is what an evaluator uses — v1 was a narrow phone column stranded in the middle of the screen with empty space on both sides.',
      ar: 'على شاشة حاسوب بعرض 1366 بكسل، وهي ما يستخدمه المقيّم، كانت النسخة الأولى عموداً ضيّقاً بعرض هاتف تائهاً في منتصف الشاشة وعلى جانبيه فراغ.',
    },
    change: {
      en: 'A 12-column grid to 1240px, and a split home screen: the bilingual hero on the start side, a large viewfinder on the end side.',
      ar: 'شبكة من 12 عموداً حتى 1240 بكسل، وشاشة رئيسية مقسومة: العنوان ثنائي اللغة في الجهة الأولى، وعدسة كبيرة في الجهة المقابلة.',
    },
    evidence: {
      en: 'Side-by-side desktop screenshots at 1366×860 in docs/evidence.',
      ar: 'لقطات متجاورة لشاشة الحاسوب بمقاس 1366×860 في docs/evidence.',
    },
    result: {
      en: 'The camera is visible without scrolling on a laptop, which is the first thing a judge does.',
      ar: 'صارت الكاميرا ظاهرة دون تمرير على الحاسوب، وهو أول ما يفعله المحكّم.',
    },
    screens: { v1: 'scan-en-desktop.png', v2: 'home-en-desktop.png' },
  },
  {
    id: 'offline-fonts',
    severity: 'reliability',
    problem: {
      en: 'The fonts were loaded from a CDN. The app claimed to work offline, and then lost its typography the moment the venue wifi dropped — during the one demonstration that matters.',
      ar: 'كانت الخطوط تُحمَّل من شبكة توزيع خارجية. فالتطبيق يدّعي العمل دون إنترنت ثم يفقد خطوطه لحظة انقطاع شبكة القاعة، أي أثناء العرض الوحيد الذي يهم.',
    },
    change: {
      en: 'Both families are self-hosted as variable woff2, Latin and Arabic subsets only, 86 KB in total, precached by the service worker with everything else.',
      ar: 'صار الخطّان مستضافَين محلياً بصيغة woff2 المتغيّرة، بمجموعتي اللاتينية والعربية فقط، بحجم 86 كيلوبايت إجمالاً، ويحفظهما عامل الخدمة مع بقية الملفات.',
    },
    evidence: {
      en: 'The smoke test reloads the app with the network disabled and checks the shell still renders.',
      ar: 'يعيد اختبار التشغيل تحميل التطبيق مع تعطيل الشبكة ويتحقق من ظهور الواجهة.',
    },
    result: {
      en: 'Offline reload is now a test rather than a hope.',
      ar: 'صارت إعادة التحميل دون إنترنت اختباراً لا أمنية.',
    },
  },
  {
    id: 'offline-service-worker',
    severity: 'reliability',
    problem: {
      en: 'The app claimed to work offline and did not. The service worker was registered from a listener on the window load event, but the module that adds that listener now waits for the model card first — so by the time the line ran, load had already fired and nothing was ever registered. The app looked perfectly healthy and had no offline cache at all.',
      ar: 'كان التطبيق يدّعي العمل دون إنترنت ولا يفعل. فقد كان عامل الخدمة يُسجَّل من مستمع لحدث تحميل الصفحة، لكن الوحدة التي تضيف ذلك المستمع صارت تنتظر بيانات النموذج أولاً، فحين وصل التنفيذ إلى ذلك السطر كان الحدث قد وقع، ولم يُسجَّل شيء. بدا التطبيق سليماً تماماً وهو بلا ذاكرة للعمل دون إنترنت.',
    },
    change: {
      en: 'Register immediately when the document has already finished loading, and only wait for the event when it has not.',
      ar: 'التسجيل فوراً إذا كان تحميل المستند قد اكتمل، وانتظار الحدث فقط إذا لم يكتمل بعد.',
    },
    evidence: {
      en: 'npm run bench reported "offline reload FAIL", and a probe found no registration at all: zero caches, no controller.',
      ar: 'أبلغ أمر npm run bench عن فشل إعادة التحميل دون إنترنت، وكشف الفحص أنه لا يوجد تسجيل أصلاً: لا ذاكرة ولا عامل متحكّم.',
    },
    result: {
      en: '98 files precached, and a reload with the network switched off now renders the app. Both npm test and npm run bench check it, so the claim is a test rather than a hope.',
      ar: 'صار 98 ملفاً محفوظاً مسبقاً، وإعادة التحميل مع قطع الشبكة تعرض التطبيق. ويتحقق من ذلك كلٌّ من npm test وnpm run bench، فصار الادعاء اختباراً لا أمنية.',
    },
  },
  {
    id: 'ood-scope',
    severity: 'accuracy',
    problem: {
      en: 'We believed the unknown-leaf check would refuse a tree the model had never been trained on. It does not. Measured over the reference set it rejected 0 of 40 Mesquite and 2 of 40 Mangrove photographs — so a Mangrove leaf can be handed one of the four trained names with high confidence.',
      ar: 'كنا نظن أن فحص الورقة غير المعروفة يرفض شجرة لم يُدرَّب عليها النموذج. وهو لا يفعل. فقياساً على المجموعة المرجعية رفض صفراً من أربعين صورة مسكيت واثنتين من أربعين صورة قرم، أي أن ورقة القرم قد تُمنح أحد الأسماء الأربعة بثقة عالية.',
    },
    change: {
      en: 'The finding is stated on the How page and in the Test Lab with the measured numbers, and the demonstration sample that relied on the assumption was removed. The threshold itself was left alone: it does what it was built for, which is refusing photographs with no plant tissue in them.',
      ar: 'أُعلنت النتيجة في صفحة «كيف يعمل» وفي مختبر الاختبار بأرقامها المقيسة، وأُزيلت العيّنة التوضيحية التي كانت تعتمد على ذلك الافتراض. أما العتبة نفسها فتُركت كما هي، فهي تؤدي ما بُنيت له: رفض الصور الخالية من النسيج النباتي.',
    },
    evidence: {
      en: 'npm run bench measures it on every run, across every tree in the dataset the model was not trained on.',
      ar: 'يقيسه أمر npm run bench في كل تشغيل، على كل شجرة في مجموعة البيانات لم يُدرَّب عليها النموذج.',
    },
    result: {
      en: 'A limitation we would have been asked about is now one we state first, with a number attached.',
      ar: 'صار القصور الذي كنا سنُسأل عنه أمراً نذكره نحن أولاً، ومعه رقمه.',
    },
  },
  {
    id: 'sensitivity-drift',
    severity: 'accuracy',
    problem: {
      en: 'The sensitivity suite had been passing at 93% and 97% detection for synthetic chlorosis. Re-run across all ten reference species rather than the original four, it reports 89.4% and 93.8% — the milder case now sits below the suite\'s own 90% floor, and the tool exits non-zero because of it.',
      ar: 'كانت مجموعة اختبار الحساسية تنجح برصد الاصفرار المصطنع بنسبتي 93٪ و97٪. وبإعادة تشغيلها على الأنواع المرجعية العشرة كلها بدل الأربعة الأصلية، صارت النسبتان 89.4٪ و93.8٪، فهبطت الحالة الأخف تحت عتبة الـ90٪ التي وضعتها الأداة لنفسها، وصارت تُنهي بخطأ.',
    },
    change: {
      en: 'Nothing was re-floored and no threshold was loosened to make the red go away. The measured numbers replaced the old ones in the README and in the Test Lab, and the likely cause is recorded: six of the ten species have foliage the thresholds were never tuned against.',
      ar: 'لم تُخفَّض العتبة ولم يُرخَ أي حد لإخفاء الإخفاق. حلّت الأرقام المقيسة محل القديمة في ملف README وفي مختبر الاختبار، وسُجّل السبب المرجّح: ستة من الأنواع العشرة لها أوراق لم تُضبط العتبات عليها قط.',
    },
    evidence: {
      en: 'npm run sensitivity across 385 and 353 composited leaves per case, against 40 per species in the original run.',
      ar: 'تشغيل npm run sensitivity على 385 و353 ورقة مركّبة لكل حالة، مقابل 40 لكل نوع في التشغيل الأصلي.',
    },
    result: {
      en: 'Necrosis detection is unaffected at 99.2% and 100%. The chlorosis gap is open work, named on the page rather than hidden by a smaller sample.',
      ar: 'لم يتأثر رصد التنخّر، وبقي عند 99.2٪ و100٪. أما فجوة الاصفرار فعملٌ مفتوح، مذكورٌ في الصفحة لا مخفيٌّ خلف عيّنة أصغر.',
    },
  },
  {
    id: 'team-shares',
    severity: 'correctness',
    problem: {
      en: 'The team page ranked five teammates by percentage and listed two of them as team leader.',
      ar: 'كانت صفحة الفريق ترتّب خمسة زملاء بنسب مئوية، وتذكر اثنين منهم بوصفهما قائدين للفريق.',
    },
    change: {
      en: 'One leader. No percentages. Each member shows named responsibilities and the part of the presentation they deliver.',
      ar: 'قائد واحد، وبلا نسب مئوية. ويعرض كل عضو مسؤولياته المحدّدة والجزء الذي يقدّمه من العرض.',
    },
    evidence: {
      en: 'The assessment grades equal participation, which a ranking chart argues against.',
      ar: 'يقيّم المعيار المشاركة المتساوية، وهو ما يناقضه مخطّط ترتيبي.',
    },
    result: {
      en: 'The page now evidences what is actually graded.',
      ar: 'صارت الصفحة تُثبت ما يُقيَّم فعلاً.',
    },
    screens: { v1: 'team-en-desktop.png', v2: 'team-en-desktop.png' },
  },
];

/** Screens offered in the before/after comparison, by evidence file name. */
export const COMPARISONS = [
  { id: 'home', label: { en: 'Home', ar: 'الرئيسية' }, v1: 'scan-en-desktop.png', v2: 'home-en-desktop.png' },
  { id: 'trees', label: { en: 'Trees', ar: 'الأشجار' }, v1: 'library-en-desktop.png', v2: 'trees-en-desktop.png' },
  { id: 'team', label: { en: 'Team', ar: 'الفريق' }, v1: 'team-en-desktop.png', v2: 'team-en-desktop.png' },
];
