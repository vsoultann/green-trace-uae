/**
 * Group members shown on the "Team" page.
 *
 * `share` is that member's percentage of the total work and the numbers must
 * add up to 100 — the page asserts it below rather than letting a typo ship a
 * chart that quietly doesn't sum. `contribution` is the one-line justification
 * printed under the bar, so the split is defensible rather than decorative.
 */
export const TEAM = [
  {
    name: 'Sultan Alkaabi',
    ar: 'سلطان الكعبي',
    role: { en: 'Team Leader', ar: 'قائد الفريق' },
    share: 28,
    contribution: {
      en: 'Led the project, trained the species model and built the health-analysis engine.',
      ar: 'قاد المشروع، ودرّب نموذج تحديد الأنواع، وبنى محرك تحليل صحة الأوراق.',
    },
  },
  {
    name: 'Saif Alshamsi',
    ar: 'سيف الشامسي',
    role: { en: 'Team Leader', ar: 'قائد الفريق' },
    share: 20,
    contribution: {
      en: 'Co-led the project, ran the field photography and assembled the training dataset.',
      ar: 'شارك في قيادة المشروع، وأدار التصوير الميداني، وجمّع بيانات التدريب.',
    },
  },
  {
    name: 'Mohammed Abdulla',
    ar: 'محمد عبدالله',
    role: { en: 'Co-Leader', ar: 'نائب قائد الفريق' },
    share: 19,
    contribution: {
      en: 'Coordinated the team, wrote the bilingual content and prepared the presentation.',
      ar: 'نسّق عمل الفريق، وكتب المحتوى بالّلغتين، وأعدّ العرض التقديمي.',
    },
  },
  {
    name: 'Hamdan Alneyemi',
    ar: 'حمدان النعيمي',
    role: { en: 'AI Specialist', ar: 'أخصائي الذكاء الاصطناعي' },
    share: 17,
    contribution: {
      en: 'Tuned the neural network, built the unknown-leaf detector and measured accuracy.',
      ar: 'ضبط الشبكة العصبية، وبنى كاشف الأوراق غير المعروفة، وقاس دقة النموذج.',
    },
  },
  {
    name: 'Mohammed Rashed',
    ar: 'محمد راشد',
    role: { en: 'Programmer', ar: 'مبرمج' },
    share: 16,
    contribution: {
      en: 'Built the app interface, the offline mode and the nearby-supplier finder.',
      ar: 'برمج واجهة التطبيق، ووضع العمل دون إنترنت، وأنشأ دليل الموردين القريبين.',
    },
  },
];

/** A split that doesn't total 100 is a bug, not a rounding quirk. */
const TOTAL = TEAM.reduce((sum, m) => sum + m.share, 0);
if (TOTAL !== 100) {
  console.error(`TEAM shares total ${TOTAL}%, not 100% — fix app/js/data/team.js`);
}

export const PROJECT = {
  name: 'Green-Trace UAE',
  nameAr: 'الأثر الأخضر',
  repo: 'https://github.com/vsoultann/green-trace-uae',
  site: 'https://vsoultann.github.io/green-trace-uae/',
  year: 2026,
};
