/**
 * How the AI works.
 *
 * The point of this page is that nothing on it is a claim: the pipeline diagram
 * is the code's actual shape, and every number is read out of the model's own
 * metadata at render time. Retrain the model and this page changes by itself.
 * That is also why the weakest class is shown as plainly as the strongest — the
 * page cannot flatter the model without lying about a file it does not control.
 */
import { html, raw } from '../ui/dom.js';
import { bilingual } from '../ui/bilingual.js';
import { t, lang, L, num, pct, date } from '../i18n.js';
import { barRow, confusionMatrix } from '../ui/meters.js';
import { metadataSync } from '../metadata.js';
import { SPECIES_BY_KEY } from '../data/species.js';
import { LIMITS } from '../data/about.js';
import { projectNav } from './project.js';

export default function howView() {
  const meta = metadataSync();

  return {
    html: html`<div class="shell how-page">
      ${raw(projectNav('/project/how'))}

      <header class="page-head">
        ${raw(bilingual({ en: 'How the AI works', ar: 'كيف يعمل الذكاء الاصطناعي' }, { size: 'l', tag: 'h1' }))}
        <p class="lede">${t('project.howSub')}</p>
      </header>

      <section class="panel pipeline-panel" aria-labelledby="pipeline-title">
        <h2 id="pipeline-title" class="section-title">${t('how.pipeline')}</h2>
        ${raw(pipeline())}
      </section>

      ${raw(meta ? modelCard(meta) : `<p class="note note-warn">${t('lab.noData')}</p>`)}

      <section class="panel" aria-labelledby="limits-title">
        <h2 id="limits-title" class="section-title">${t('how.limits')}</h2>
        <ul class="limits">
          ${raw(LIMITS.map((l) => `<li>${L(l)}</li>`))}
        </ul>
      </section>
    </div>`,
  };
}

/* --------------------------------------------------------------- diagram */

/**
 * The pipeline, drawn.
 *
 * Two lanes, because the two halves of the app are genuinely separate systems
 * and the most common misunderstanding is that the health score comes out of the
 * neural network. It does not: it is measured by classical computer vision, and
 * that is why every part of it can be explained and shown on the photograph.
 *
 * Rectilinear, square-cornered and built on a grid — this is data, so it is
 * woven rather than smooth. Drawn inline so it inherits the theme's colours.
 */
function pipeline() {
  const STEPS = {
    en: {
      photo: 'Photograph',
      leaf: 'Is there a leaf?',
      features: 'MobileNetV2 features',
      classifier: 'Trained classifier',
      ood: 'Do we know it?',
      health: 'Colour and texture',
      findings: 'Findings',
      treatment: 'Treatment and suppliers',
      species: 'Species lane',
      condition: 'Condition lane',
      network: 'neural network',
      classical: 'no neural network',
    },
    ar: {
      photo: 'الصورة',
      leaf: 'هل توجد ورقة؟',
      features: 'سمات MobileNetV2',
      classifier: 'المصنِّف المدرَّب',
      ood: 'هل نعرفها؟',
      health: 'اللون والملمس',
      findings: 'النتائج',
      treatment: 'العلاج والمورّدون',
      species: 'مسار النوع',
      condition: 'مسار الحالة',
      network: 'شبكة عصبية',
      classical: 'بلا شبكة عصبية',
    },
  };
  const s = STEPS[lang()] ?? STEPS.en;

  const box = (x, y, w, label, tone = '') =>
    `<g class="pipe-box ${tone}">
      <rect x="${x}" y="${y}" width="${w}" height="46" rx="2"/>
      <text x="${x + w / 2}" y="${y + 27}" text-anchor="middle">${label}</text>
    </g>`;

  const arrow = (x1, y, x2) =>
    `<path class="pipe-line" d="M${x1} ${y}H${x2}" marker-end="url(#pipe-arrow)"/>`;

  /* An elbow from the shared leaf check up into one lane and down into the
     other: the two halves of the app split here and never meet again until the
     result page puts their two answers side by side. */
  const elbow = (fromX, fromY, toX, toY) =>
    `<path class="pipe-line" d="M${fromX} ${fromY}H${fromX + 16}V${toY}H${toX}" marker-end="url(#pipe-arrow)"/>`;

  return `<div class="pipeline-scroll">
    <svg class="pipeline" viewBox="0 0 880 270" role="img"
         aria-label="${s.photo} → ${s.leaf} → ${s.features} → ${s.classifier} → ${s.ood}; ${s.leaf} → ${s.health} → ${s.findings} → ${s.treatment}">
      <defs>
        <marker id="pipe-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 8 4 0 8Z" fill="currentColor"/>
        </marker>
      </defs>

      ${box(6, 112, 116, s.photo)}
      ${arrow(126, 135, 146)}
      ${box(150, 112, 140, s.leaf)}

      ${elbow(294, 135, 316, 68)}
      ${elbow(294, 135, 316, 216)}

      <text class="pipe-lane" x="320" y="34">${s.species} — ${s.network}</text>
      ${box(320, 45, 170, s.features)}
      ${arrow(494, 68, 506)}
      ${box(510, 45, 150, s.classifier)}
      ${arrow(664, 68, 676)}
      ${box(680, 45, 170, s.ood, 'pipe-decide')}

      <text class="pipe-lane" x="320" y="182">${s.condition} — ${s.classical}</text>
      ${box(320, 193, 170, s.health)}
      ${arrow(494, 216, 506)}
      ${box(510, 193, 150, s.findings)}
      ${arrow(664, 216, 676)}
      ${box(680, 193, 190, s.treatment)}
    </svg>
  </div>`;
}

/* ------------------------------------------------------------ model card */

function modelCard(meta) {
  const labels = meta.classes.map((key) => ({
    short: SPECIES_BY_KEY[key] ? L(SPECIES_BY_KEY[key]).name : key,
    full: SPECIES_BY_KEY[key] ? L(SPECIES_BY_KEY[key]).name : key,
  }));

  const perClass = meta.classes
    .map((key) => ({ key, value: meta.perClassAccuracy?.[key] ?? null }))
    .filter((row) => row.value != null)
    .sort((a, b) => b.value - a.value);

  return html`<section class="panel model-card" aria-labelledby="card-title">
    <div class="section-head">
      <h2 id="card-title">${t('how.modelCard')}</h2>
      <span class="small muted">${t('how.trainedAt')} ${date(meta.trainedAt)}</span>
    </div>

    <dl class="kv-row">
      <div class="kv"><dt>${t('how.classes')}</dt><dd>${raw(num(meta.classes.length))}</dd></div>
      <div class="kv"><dt>${t('how.validation')}</dt><dd>${raw(pct(meta.validationAccuracy, 1))}</dd></div>
      <div class="kv"><dt>${t('how.samples')}</dt><dd>${raw(num(meta.trainingSamples))}</dd></div>
      <div class="kv"><dt>${t('how.valSamples')}</dt><dd>${raw(num(meta.validationSamples))}</dd></div>
    </dl>

    <p class="small muted arch">${meta.architecture}</p>

    <h3 class="section-title">${t('how.perClass')}</h3>
    <div class="bars">
      ${raw(perClass.map((row) => barRow(
        SPECIES_BY_KEY[row.key] ? L(SPECIES_BY_KEY[row.key]).name : row.key,
        row.value,
      )))}
    </div>

    ${raw(meta.confusionMatrix ? html`
      <h3 class="section-title">${t('how.matrix')}</h3>
      ${raw(confusionMatrix(meta.confusionMatrix, labels))}` : '')}

    <h3 class="section-title">${t('how.oodTitle')}</h3>
    <p class="measure">${t('how.oodBody', { t: num(meta.oodThreshold, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })}</p>
  </section>`;
}
