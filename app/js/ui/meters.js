/**
 * Woven readouts.
 *
 * Every number the app reports is drawn as discrete cells rather than a smooth
 * bar. Two reasons, and the second is the real one:
 *
 *   1. It is the Sadu idea applied to data — a weave is built one unit at a
 *      time, and so is a measurement.
 *   2. A reader can *count* cells. "Seventeen of twenty" is a claim you can
 *      check against the picture; the length of a gradient is a claim you have
 *      to take on trust. For a project whose whole argument is that it reports
 *      honestly, that difference is the design.
 *
 * Every meter is paired with its value written out, and every cell carries a
 * 1px ink outline so the segmentation survives for a viewer who cannot separate
 * the fill colours.
 */
import { html, raw, uid } from './dom.js';
import { num, pct, t } from '../i18n.js';

/**
 * Generic cell strip.
 * @param {number} fraction 0..1
 * @param {number} cells
 */
function cells(fraction, count, cls = '') {
  const exact = Math.max(0, Math.min(1, fraction)) * count;
  const whole = Math.floor(exact + 1e-9);
  const part = exact - whole;

  const out = [];
  for (let i = 0; i < count; i++) {
    if (i < whole) out.push('<span class="meter-cell" data-on="1"></span>');
    else if (i === whole && part > 0.08) {
      out.push(`<span class="meter-cell" data-partial style="--fill:${Math.round(part * 100)}%"></span>`);
    } else out.push('<span class="meter-cell"></span>');
  }
  return `<div class="meter-cells ${cls}" aria-hidden="true">${out.join('')}</div>`;
}

/**
 * Species confidence: ten cells, one per tenth.
 * The label says "7 of 10" as well as the percentage, because the cells are the
 * thing being read and the percentage is the precise version of it.
 */
export function confidenceMeter(p) {
  const id = uid('conf');
  return html`<div class="meter" role="group" aria-labelledby="${id}">
    <div class="meter-head">
      <span id="${id}" class="small muted">${t('result.confidence')}</span>
      <span class="meter-value">${raw(pct(p))}</span>
    </div>
    ${raw(cells(p, 10))}
    <p class="small muted" style="margin:0">${t('result.confidenceHelp')}</p>
  </div>`;
}

/** The health score: twenty cells of five points each, coloured by band. */
export function healthMeter(score, band) {
  const id = uid('health');
  const tone = band === 'excellent' || band === 'good' ? 'healthy'
    : band === 'fair' ? 'chlorosis' : 'necrosis';
  return html`<div class="meter meter-${raw(tone)}" role="group" aria-labelledby="${id}">
    <div class="meter-head">
      <span id="${id}" class="small muted">${t('result.health')}</span>
      <span class="meter-value">${raw(num(Math.round(score)))}<small> ${t('result.healthOf')}</small></span>
    </div>
    ${raw(cells(score / 100, 20))}
  </div>`;
}

/** A labelled row of cells, used for per-class accuracy on the model card. */
export function barRow(label, fraction, { cells: count = 10, sub = '' } = {}) {
  return html`<div class="bar-row">
    <span class="bar-label">${raw(label)}</span>
    ${raw(cells(fraction, count))}
    <span class="bar-value tnum">${raw(pct(fraction, 1))}</span>
    ${sub ? html`<span class="bar-sub small muted">${sub}</span>` : ''}
  </div>`;
}

/**
 * The confusion matrix as a woven grid.
 *
 * Rows are the true tree, columns what the model answered, so a perfect model
 * fills only the diagonal. Each cell's tint is its share of that row, which
 * keeps a class with 60 validation images comparable with one that has 52.
 */
export function confusionMatrix(matrix, labels) {
  const n = labels.length;
  const headId = uid('mx');
  const head = ['<span class="matrix-label"></span>',
    ...labels.map((l) => `<span class="matrix-label">${l.short}</span>`)];

  const rows = matrix.map((row, i) => {
    const total = row.reduce((a, b) => a + b, 0) || 1;
    const cells = row.map((v, j) => {
      const share = v / total;
      const strong = share > 0.55 ? '1' : '0';
      const title = `${labels[i].full} answered ${labels[j].full}: ${v}`;
      return `<span class="matrix-cell" data-strong="${strong}" style="--v:${share.toFixed(3)}" title="${title}">${v}</span>`;
    });
    return `<span class="matrix-label">${labels[i].short}</span>${cells.join('')}`;
  });

  return html`<div class="matrix-wrap">
    <div class="matrix" style="grid-template-columns:auto repeat(${raw(String(n))}, minmax(0,1fr))" role="img" aria-describedby="${headId}">
      ${raw(head.join(''))}
      ${raw(rows.join(''))}
    </div>
    <p id="${headId}" class="small muted" style="margin:.6rem 0 0">${t('how.matrixHelp')}</p>
  </div>`;
}

/** A status word with its tissue colour beside it — never colour on its own. */
export function statusPill(kind, label) {
  return html`<span class="status status-${raw(kind)}"><span class="swatch"></span>${label}</span>`;
}
