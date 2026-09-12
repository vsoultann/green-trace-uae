/**
 * The Test Lab.
 *
 * Everything on this page was measured. The file it reads, app/data/lab.json,
 * is written by tools/bench.mjs driving the real app in a real browser — not
 * typed in by hand — and every block says on what device and on what date, so a
 * number here can be argued with rather than only believed.
 *
 * The benchmark button matters more than any of the stored figures: it runs the
 * same measurement on the evaluator's own machine, in front of them. A claim you
 * can re-run is a different kind of claim.
 */
import { html, raw, $, announce } from '../ui/dom.js';
import { bilingual } from '../ui/bilingual.js';
import { t, lang, L, num, pct, date } from '../i18n.js';
import { icon } from '../icons.js';
import { barRow } from '../ui/meters.js';
import { metadataSync } from '../metadata.js';
import { SPECIES_BY_KEY } from '../data/species.js';
import { ensureModel } from '../ui/model-gate.js';
import { classify } from '../model.js';
import { projectNav } from './project.js';

let cached = null;

async function loadLab() {
  if (cached !== null) return cached;
  try {
    const res = await fetch('./data/lab.json');
    cached = res.ok ? await res.json() : false;
  } catch { cached = false; }
  return cached;
}

export default async function labView() {
  const lab = await loadLab();
  const meta = metadataSync();

  return {
    html: html`<div class="shell lab-page">
      ${raw(projectNav('/project/lab'))}

      <header class="page-head">
        ${raw(bilingual({ en: 'Test Lab', ar: 'مختبر الاختبار' }, { size: 'l', tag: 'h1' }))}
        <p class="lede">${t('lab.sub')}</p>
      </header>

      ${raw(lab ? performance(lab) : missing())}
      ${raw(accuracy(lab, meta))}
      ${raw(lab ? reliability(lab) : '')}
      ${raw(benchPanel())}
    </div>`,

    mount,
  };
}

function missing() {
  return html`<p class="note note-warn">${t('lab.noData')}</p>`;
}

/** "Measured on X, date" — every block carries its own provenance. */
function provenance(block) {
  if (!block?.device || !block?.measuredAt) return '';
  return `<p class="small muted">${t('lab.measuredOn', { device: block.device, date: date(block.measuredAt) })}</p>`;
}

/**
 * A measurement with a unit, isolated from the paragraph around it.
 *
 * "954 ms" set inside an Arabic page renders as "ms 954": the number and the
 * unit are two separate runs, and the right-to-left paragraph swaps them.
 * <bdi> makes the pair one run and lets the browser resolve its direction from
 * its own contents, which is the same reason scientific names are wrapped.
 */
const unit = (value, suffix) => `<bdi>${value}\u00A0${suffix}</bdi>`;

const ms = (v) => (v == null ? '—' : unit(num(Math.round(v)), 'ms'));

function performance(lab) {
  const p = lab.performance;
  if (!p) return '';
  const kb = (bytes) => (bytes == null ? '—' : unit(num(Math.round(bytes / 1024)), 'KB'));
  const pay = lab.payload;

  return html`<section class="panel" aria-labelledby="perf-title">
    <div class="section-head"><h2 id="perf-title">${t('lab.performance')}</h2></div>
    <dl class="kv-row">
      <div class="kv"><dt>${t('lab.loadCold')}</dt><dd>${raw(ms(p.loadColdMs))}</dd></div>
      <div class="kv"><dt>${t('lab.loadWarm')}</dt><dd>${raw(ms(p.loadWarmMs))}</dd></div>
      <div class="kv"><dt>${t('lab.inferMedian')}</dt><dd>${raw(ms(p.inferenceMedianMs))}</dd></div>
      <div class="kv"><dt>${t('lab.inferP95')}</dt><dd>${raw(ms(p.inferenceP95Ms))}</dd></div>
      <div class="kv"><dt>${t('lab.timeToResult')}</dt><dd>${raw(ms(p.timeToResultMedianMs))}</dd></div>
    </dl>

    ${raw(pay ? html`
      <h3 class="section-title">${t('lab.payload')}</h3>
      <dl class="kv-row">
        <div class="kv"><dt>${t('lab.shell')}</dt><dd>${raw(kb(pay.shellGzipBytes))}</dd></div>
        <div class="kv"><dt>${t('lab.offlineTotal')}</dt><dd>${raw(unit(num(Math.round(pay.totalBytes / 1024 / 1024 * 10) / 10), 'MB'))}</dd></div>
        <div class="kv"><dt>${t('lab.files')}</dt><dd>${raw(num(pay.files))}</dd></div>
      </dl>
      <p class="small muted measure">${t('lab.shellNote')}</p>` : '')}

    ${raw(provenance(lab))}
  </section>`;
}

/**
 * Accuracy, in two halves that are measured completely differently.
 *
 * The species figures come from the model's own metadata — retrain it and they
 * change here without anybody editing this file. The calibration figures are the
 * before-and-after of the health analyser, which is the single largest
 * correction the project made.
 */
function accuracy(lab, meta) {
  const cal = lab?.accuracy?.calibration;
  const perClass = meta
    ? meta.classes
      .map((key) => ({ key, value: meta.perClassAccuracy?.[key] ?? null }))
      .filter((r) => r.value != null)
      .sort((a, b) => b.value - a.value)
    : [];

  return html`<section class="panel" aria-labelledby="acc-title">
    <div class="section-head"><h2 id="acc-title">${t('lab.accuracy')}</h2></div>

    ${raw(meta ? html`
      <dl class="kv-row">
        <div class="kv"><dt>${t('how.validation')}</dt><dd>${raw(pct(meta.validationAccuracy, 1))}</dd></div>
        <div class="kv"><dt>${t('how.samples')}</dt><dd>${raw(num(meta.trainingSamples))}</dd></div>
        <div class="kv"><dt>${t('how.valSamples')}</dt><dd>${raw(num(meta.validationSamples))}</dd></div>
      </dl>
      <div class="bars">
        ${raw(perClass.map((r) => barRow(SPECIES_BY_KEY[r.key] ? L(SPECIES_BY_KEY[r.key]).name : r.key, r.value)))}
      </div>` : '')}

    ${raw(cal ? html`
      <h3 class="section-title">${t('lab.calibration')}</h3>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr>
            <th>${t('lab.measure')}</th>
            <th class="num">${t('lab.before')}</th>
            <th class="num">${t('lab.after')}</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>${t('lab.healthyReported')}</td>
              <td class="num">${raw(pct(cal.healthyReportedBefore, 1))}</td>
              <td class="num">${raw(pct(cal.healthyReportedAfter, 1))}</td>
            </tr>
            <tr>
              <td>${t('lab.medianScore')}</td>
              <td class="num">${raw(num(cal.medianScoreBefore))}</td>
              <td class="num">${raw(num(cal.medianScoreAfter))}</td>
            </tr>
            <tr>
              <td>${t('lab.syntheticNecrosis')}</td>
              <td class="num">—</td>
              <td class="num">${raw(pct(cal.syntheticNecrosis, 0))}</td>
            </tr>
            <tr>
              <td>${t('lab.syntheticChlorosis')}</td>
              <td class="num">—</td>
              <td class="num">${raw(`${pct(cal.syntheticChlorosisLow, 0)}–${pct(cal.syntheticChlorosisHigh, 0)}`)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ${raw(cal.note ? `<p class="small muted">${L(cal.note)}</p>` : '')}` : '')}

    ${raw(lab?.ood ? oodBlock(lab.ood) : '')}
  </section>`;
}

/**
 * What the refusal actually catches.
 *
 * This block exists because the assumption behind it turned out to be wrong. The
 * out-of-distribution check was built to stop the app naming a species for a
 * photograph of something else, and it does that for things which are not
 * plants. Measured against other trees' leaves it mostly does not, and a page
 * called Test Lab that only showed the tests that passed would be worthless.
 */
function oodBlock(ood) {
  const rows = Object.entries(ood.rejected ?? {});
  if (!rows.length) return '';
  return html`<h3 class="section-title">${t('lab.oodTitle')}</h3>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>
          <th>${t('lab.oodTree')}</th>
          <th class="num">${t('lab.oodRejected')}</th>
        </tr></thead>
        <tbody>
          ${raw(rows.map(([key, count]) => `<tr>
            <td>${SPECIES_BY_KEY[key] ? L(SPECIES_BY_KEY[key]).name : key}</td>
            <td class="num">${num(count)} / ${num(ood.sampled)}</td>
          </tr>`))}
        </tbody>
      </table>
    </div>
    <p class="small muted measure">${t('lab.oodNote')}</p>`;
}

function reliability(lab) {
  const r = lab.reliability;
  if (!r) return '';
  const stable = r.tensorsAfter === r.tensorsBefore;
  return html`<section class="panel" aria-labelledby="rel-title">
    <div class="section-head"><h2 id="rel-title">${t('lab.reliability')}</h2></div>
    <dl class="kv-row">
      <div class="kv"><dt>${t('lab.runs')}</dt><dd>${raw(num(r.runs))}</dd></div>
      <div class="kv">
        <dt>${t('lab.tensors')}</dt>
        <dd>${raw(num(r.tensorsAfter))} <small>${stable ? t('lab.stable') : `(${num(r.tensorsBefore)} → ${num(r.tensorsAfter)})`}</small></dd>
      </div>
      <div class="kv"><dt>${t('lab.crashes')}</dt><dd>${raw(num(r.crashes))}</dd></div>
      <div class="kv"><dt>${t('lab.offline')}</dt><dd>${r.offlineReload ? t('lab.pass') : '—'}</dd></div>
    </dl>
    ${raw(provenance(lab))}
  </section>`;
}

function benchPanel() {
  return html`<section class="panel panel-sunk" aria-labelledby="bench-title">
    <div class="section-head"><h2 id="bench-title">${t('lab.bench')}</h2></div>
    <p class="small muted measure">${t('lab.benchWhy')}</p>
    <p><button class="btn btn-primary" id="act-bench" type="button">${raw(icon('play'))}${t('lab.bench')}</button></p>
    <p class="bench-out tnum" id="bench-out" role="status" aria-live="polite"></p>
  </section>`;
}

/* ------------------------------------------------------------------ mount */

function mount(root) {
  const button = $('#act-bench', root);
  const out = $('#bench-out', root);
  if (!button) return;

  const RUNS = 10;

  button.addEventListener('click', async () => {
    button.disabled = true;
    out.textContent = t('misc.loading');
    try {
      await ensureModel();
      const image = await loadImage('./samples/ghaf.jpg');
      const times = [];
      for (let i = 0; i < RUNS; i++) {
        out.textContent = t('lab.benchRunning', { i: i + 1, n: RUNS });
        // Yield to the browser between runs so the counter actually paints and
        // the measurement is of inference, not of a blocked main thread.
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
        const started = performance.now();
        await classify(image);
        times.push(performance.now() - started);
      }
      times.sort((a, b) => a - b);
      const median = times[Math.floor(times.length / 2)];
      const message = t('lab.benchDone', { ms: num(Math.round(median)), n: RUNS });
      out.textContent = message;
      announce(message);
    } catch {
      out.textContent = t('misc.error');
    } finally {
      button.disabled = false;
    }
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
