/**
 * The journey.
 *
 * Two things an assessment asks for and a finished app usually cannot show: how
 * it was made, and what changed when it was tested. The iteration log is the
 * second of those, and every entry has to fill the same four beats — the problem
 * we found, the change we made, the evidence the problem was real, and the
 * result. An entry that cannot fill all four is not an iteration, it is a
 * preference, and it does not belong on this page.
 *
 * The before-and-after slider uses the screenshots in docs/evidence, captured
 * before a single line of the rebuild was written.
 */
import { html, raw, $, $$ } from '../ui/dom.js';
import { bilingual } from '../ui/bilingual.js';
import { t, L } from '../i18n.js';
import { icon } from '../icons.js';
import { STAGES, ITERATIONS, COMPARISONS } from '../data/journey.js';
import { CONFIG } from '../config.js';
import { projectNav } from './project.js';

export default function journeyView() {
  return {
    html: html`<div class="shell journey-page">
      ${raw(projectNav('/project/journey'))}

      <header class="page-head">
        ${raw(bilingual({ en: 'Journey', ar: 'المسيرة' }, { size: 'l', tag: 'h1' }))}
        <p class="lede">${t('project.journeySub')}</p>
      </header>

      <section aria-labelledby="stages-title">
        <div class="section-head"><h2 id="stages-title">${t('journey.stages')}</h2></div>
        <ol class="timeline">
          ${raw(STAGES.map(stage))}
        </ol>
      </section>

      <section aria-labelledby="compare-title" class="compare-section">
        <div class="section-head">
          <h2 id="compare-title">${t('journey.compare')}</h2>
          <a class="btn btn-outline" href="${CONFIG.links.previousSite}" target="_blank" rel="noopener">
            ${raw(icon('directions', { size: 'sm' }))}${t('journey.openV1')}
          </a>
        </div>
        <p class="small muted measure">${t('journey.openV1Help')}</p>
        ${raw(compare())}
      </section>

      <section aria-labelledby="log-title">
        <div class="section-head"><h2 id="log-title">${t('journey.log')}</h2></div>
        <div class="iterations">
          ${raw(ITERATIONS.map(iteration))}
        </div>
      </section>
    </div>`,

    mount,
  };
}

/**
 * One production stage.
 *
 * Dates the repository can prove are exact. The ones it cannot are written as
 * the term week they fall in rather than invented to the day, and the `todo`
 * flag beside them reaches the team through `npm test` rather than through a
 * marker on a page an evaluator is reading.
 */
function stage(s) {
  return `<li class="stage">
    <span class="stage-node" aria-hidden="true"></span>
    <div class="stage-body">
      <p class="stage-date small">${L(s.date)}</p>
      <h3>${L(s.title)}</h3>
      <p>${L(s.body)}</p>
    </div>
  </li>`;
}

function iteration(it) {
  const beats = [
    ['journey.problem', it.problem],
    ['journey.change', it.change],
    ['journey.evidence', it.evidence],
    ['journey.result', it.result],
  ];
  return `<article class="panel iter" data-severity="${it.severity}">
    <dl class="beats">
      ${beats.map(([key, value]) => `<dt>${t(key)}</dt><dd>${L(value)}</dd>`).join('')}
    </dl>
  </article>`;
}

/**
 * The before-and-after comparison.
 *
 * A slider rather than two images side by side: at the width a phone gives you,
 * two shrunken screenshots prove nothing, while one image with a handle through
 * it makes the difference impossible to miss. It is a range input underneath, so
 * it is operable from the keyboard and reports a value to a screen reader.
 */
function compare() {
  return `<div class="compare" id="compare">
    <div class="chips compare-picker" role="group" aria-label="${t('journey.screen')}">
      ${COMPARISONS.map((c, i) => `<button class="chip" type="button" data-compare="${i}"
        aria-pressed="${i === 0}">${L(c.label)}</button>`).join('')}
    </div>

    <div class="compare-frame" style="--split:50%">
      <img class="compare-v2" id="compare-v2" src="${shot('v2', COMPARISONS[0].v2)}" alt="${t('journey.v2')}">
      <img class="compare-v1" id="compare-v1" src="${shot('v1', COMPARISONS[0].v1)}" alt="${t('journey.v1')}">
      <span class="compare-handle" aria-hidden="true"></span>
      <span class="compare-tag compare-tag-v1">${t('journey.v1')}</span>
      <span class="compare-tag compare-tag-v2">${t('journey.v2')}</span>
    </div>

    <label class="sr" for="compare-range">${t('journey.compareHelp')}</label>
    <input type="range" id="compare-range" min="0" max="100" value="50" class="compare-range">
  </div>`;
}

/**
 * Where a comparison screenshot lives once it is inside the app.
 *
 * docs/evidence is the full-resolution set for the workbook and sits outside the
 * published folder — only app/ is deployed. tools/evidence.mjs resizes the few
 * pairs this page shows into app/evidence as JPEGs.
 */
function shot(version, file) {
  return `./evidence/${version}/${file.replace(/\.png$/, '.jpg')}`;
}

function mount(root) {
  const frame = $('.compare-frame', root);
  const range = $('#compare-range', root);
  const v1 = $('#compare-v1', root);
  const v2 = $('#compare-v2', root);
  if (!frame || !range) return;

  range.addEventListener('input', () => {
    frame.style.setProperty('--split', `${range.value}%`);
  });

  root.addEventListener('click', (e) => {
    const button = e.target.closest('[data-compare]');
    if (!button) return;
    const pick = COMPARISONS[Number(button.dataset.compare)];
    for (const b of $$('[data-compare]', root)) b.setAttribute('aria-pressed', String(b === button));
    v1.src = shot('v1', pick.v1);
    v2.src = shot('v2', pick.v2);
  });
}
