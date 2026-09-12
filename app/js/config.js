/**
 * Every fact about the project, in one file.
 *
 * The school name, the programme, the supervisor and the URLs appear on the
 * poster, the slides, the team page, the kiosk and the manifest. Keeping one
 * copy means the team edits one line when something is confirmed, rather than
 * hunting for the six places a name was pasted.
 *
 * Anything still to be confirmed carries a `todo` note. `npm test` prints them,
 * so an unconfirmed fact cannot quietly reach the assessment.
 */

export const CONFIG = {
  product: {
    name: 'Warif',
    nameAr: 'وارف',
    /* Warif is a real Arabic word, not a coined one, which is the point of it. */
    meaning: {
      en: 'In Arabic, wārif describes shade that spreads wide and greenery that is lush — what a healthy tree gives back.',
      ar: '«وارف» وصفٌ عربيٌّ للظلّ الممتدّ والخضرة النضرة، وهذا ما تمنحه الشجرة السليمة.',
    },
    tagline: {
      en: 'Read the leaf. Keep the shade.',
      ar: 'اقرأ الورقة، ليبقى الظلُّ وارفاً',
    },
    descriptor: {
      en: 'AI tree identification and leaf health for the UAE',
      ar: 'ذكاءٌ اصطناعيٌّ يتعرّف على أشجار الإمارات ويفحص صحة أوراقها',
    },
    /* v1 shipped under this name. It survives only in the Journey, as history. */
    previousName: 'Green-Trace UAE',
    previousNameAr: 'الأثر الأخضر',
  },

  school: {
    en: 'Applied Technology High School — Al Ain',
    ar: 'مدارس التكنولوجيا التطبيقية — العين',
    short: 'ATS',
    shortAr: 'مدارس التكنولوجيا التطبيقية',
    logo: './img/ats-logo.png',
    /* Flip to true once the file is in place. Until then the Team and Poster
       pages set the school's name in type rather than requesting a file that is
       not there — a missing image is a console error and a broken frame on a
       page an evaluator is reading. */
    hasLogo: false,
    todo: 'Add app/img/ats-logo.png from the workbook, then set school.hasLogo to true in app/js/config.js.',
  },

  programme: {
    en: 'Grade 12 Graduation Project — Term 1: Prototype Enhancement & Presentation',
    ar: 'مشروع التخرج للصف الثاني عشر — الفصل الأول: تطوير النموذج الأولي والعرض',
    year: '2026–2027',
  },

  supervisor: {
    name: 'Mr. Hamdy Hersi',
    nameAr: 'الأستاذ حمدي حرسي',
    role: { en: 'Project Supervisor', ar: 'مشرف المشروع' },
    todo: 'Confirm the Arabic spelling of the supervisor\'s name with him before printing.',
  },

  links: {
    site: 'https://vsoultann.github.io/green-trace-uae/',
    repo: 'https://github.com/vsoultann/green-trace-uae',
    /* Set this to a Microsoft Forms URL and the Feedback page shows it as a QR
       for phones alongside the on-device form. Empty = on-device only. */
    feedbackFormUrl: '',
    todo: 'Paste the Microsoft Forms link into links.feedbackFormUrl to put a feedback QR on the kiosk and the poster.',
  },

  kiosk: {
    /* How long the showcase screen waits before clearing a visitor's scan and
       returning to attract mode. Long enough to read a result, short enough
       that the next visitor never sees the last one's leaf. */
    idleMs: 90_000,
    factMs: 7_000,
  },

  presentation: {
    targetSeconds: 450,   // 7:30
    minSeconds: 240,      // the assessment's floor
    maxSeconds: 600,      // and its ceiling
  },

  /* The honest framing that has to survive every redesign: this is a classroom
     demonstration built on a small dataset, not an agricultural instrument. */
  disclaimer: {
    en: 'A school project and a demonstration, not a substitute for an agricultural inspection.',
    ar: 'مشروع مدرسي وعرض توضيحي، وليس بديلاً عن الفحص الزراعي المختص.',
  },
};

/** Every unconfirmed fact in the project, for the report and the smoke test. */
export function openTodos() {
  const out = [];
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === 'todo' && typeof v === 'string') out.push({ where: path, note: v });
      else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(CONFIG, '');
  return out;
}
