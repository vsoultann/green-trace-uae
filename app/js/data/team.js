/**
 * The team.
 *
 * Two things changed from v1 and both were corrections rather than redesigns.
 *
 * First, v1 listed two people as "Team Leader". There is one: Sultan. The rest
 * hold named responsibilities, which is a different thing and a clearer one.
 *
 * Second, v1 drew a percentage bar for each member — 28%, 20%, 19% and so on.
 * The assessment grades equal participation, so a chart ranking five teammates
 * against each other was working against the thing it was meant to evidence,
 * quite apart from being a number nobody could actually measure. What replaces
 * it is what an evaluator can check: what each person was responsible for, and
 * which part of the presentation they deliver.
 *
 * TODO for the team: read your own entry and correct it. These are written from
 * the v1 credits and the brief, and you are the authority on them.
 */

export const SUPERVISOR = {
  name: 'Mr. Hamdy Hersi',
  ar: 'الأستاذ حمدي حرسي',
  role: { en: 'Project Supervisor', ar: 'مشرف المشروع' },
  note: {
    en: 'Supervised the project through both terms, set the assessment milestones and reviewed every iteration.',
    ar: 'أشرف على المشروع خلال الفصلين، وحدّد محطات التقييم، وراجع كل مرحلة من مراحل التطوير.',
  },
};

/**
 * `initials` is used for the portrait placeholder; `speaks` is the slide this
 * member presents, and is the same order as data/presentation.js.
 */
export const TEAM = [
  {
    id: 'sultan',
    name: 'Sultan Alkaabi',
    ar: 'سلطان الكعبي',
    initials: 'SA',
    leader: true,
    role: { en: 'Team Leader', ar: 'قائد الفريق' },
    responsibilities: {
      en: [
        'Leads the project and holds the schedule against the assessment milestones.',
        'Trained the species classifier and assembled the model metadata.',
        'Built the leaf-health engine and its calibration.',
      ],
      ar: [
        'يقود المشروع ويلتزم بجدوله وفق محطات التقييم.',
        'درّب مصنِّف الأنواع وأعدّ بيانات النموذج.',
        'بنى محرّك تحليل صحة الأوراق ومعايرته.',
      ],
    },
    speaks: {
      en: 'Opening and closing: the team, the goals, then impact, next steps and questions.',
      ar: 'الافتتاح والختام: الفريق والأهداف، ثم الأثر والخطوات القادمة والأسئلة.',
    },
  },
  {
    id: 'saif',
    name: 'Saif Alshamsi',
    ar: 'سيف الشامسي',
    initials: 'SA',
    role: { en: 'Data & Field Research', ar: 'البيانات والبحث الميداني' },
    responsibilities: {
      en: [
        'Field photography of real leaves across Al Ain.',
        'Assembled and cleaned the training dataset, and kept its credits.',
        'Tested the app against real leaves rather than only reference images.',
      ],
      ar: [
        'التصوير الميداني لأوراق حقيقية في مدينة العين.',
        'جمع بيانات التدريب ونقّاها وحفظ مصادرها.',
        'اختبر التطبيق على أوراق حقيقية لا على الصور المرجعية وحدها.',
      ],
    },
    speaks: {
      en: 'The problem and our research.',
      ar: 'المشكلة وبحثنا فيها.',
    },
  },
  {
    id: 'mohammed-abdulla',
    name: 'Mohammed Abdulla',
    ar: 'محمد عبدالله',
    initials: 'MA',
    role: { en: 'Content & Presentation', ar: 'المحتوى والعرض التقديمي' },
    responsibilities: {
      en: [
        'Wrote and checked the bilingual content, English and Arabic.',
        'Designed the poster and prepared the presentation.',
        'Kept the project record and the evidence for the workbook.',
      ],
      ar: [
        'كتب المحتوى بالعربية والإنجليزية وراجعه.',
        'صمّم الملصق وأعدّ العرض التقديمي.',
        'وثّق سجل المشروع وأدلّته لملف العمل.',
      ],
    },
    speaks: {
      en: 'Introducing Warif, and the journey from version 1 to version 2.',
      ar: 'التعريف بـ«وارف»، والمسيرة من النسخة الأولى إلى الثانية.',
    },
  },
  {
    id: 'hamdan',
    name: 'Hamdan Alneyemi',
    ar: 'حمدان النعيمي',
    initials: 'HA',
    role: { en: 'AI Specialist', ar: 'أخصائي الذكاء الاصطناعي' },
    responsibilities: {
      en: [
        'Tuned the network and the training run.',
        'Built the unknown-leaf detector that lets the app refuse to guess.',
        'Measured accuracy, per tree and overall.',
      ],
      ar: [
        'ضبط الشبكة العصبية وعملية التدريب.',
        'بنى كاشف الأوراق غير المعروفة الذي يتيح للتطبيق الامتناع عن التخمين.',
        'قاس الدقة لكل شجرة وللنموذج ككل.',
      ],
    },
    speaks: {
      en: 'How the AI works, and the testing results.',
      ar: 'كيف يعمل الذكاء الاصطناعي، ونتائج الاختبار.',
    },
  },
  {
    id: 'mohammed-rashed',
    name: 'Mohammed Rashed',
    ar: 'محمد راشد',
    initials: 'MR',
    role: { en: 'Programmer', ar: 'المبرمج' },
    responsibilities: {
      en: [
        'Built the app interface and its navigation.',
        'Made it work offline, so the kiosk survives a dead connection.',
        'Built the nearby-help finder and the supplier directory.',
      ],
      ar: [
        'برمج واجهة التطبيق وتنقّلها.',
        'جعله يعمل دون إنترنت ليصمد الكشك عند انقطاع الشبكة.',
        'أنشأ دليل المساعدة القريبة وقائمة المورّدين.',
      ],
    },
    speaks: {
      en: 'The live demonstration.',
      ar: 'العرض الحيّ للتطبيق.',
    },
  },
];

export const LEADER = TEAM.find((m) => m.leader);
export const MEMBERS = TEAM.filter((m) => !m.leader);

/* One leader. v1 shipped with two, which is the kind of error that is invisible
   until an evaluator reads the page and asks which of them is in charge. */
if (TEAM.filter((m) => m.leader).length !== 1) {
  console.error('team.js: exactly one member must be marked leader');
}
