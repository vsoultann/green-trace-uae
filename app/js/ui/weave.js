/**
 * The one orchestrated moment in the app.
 *
 * Everything else holds still. When a leaf is captured, this happens:
 *
 *   1. the photo freezes and a faint pixel grid settles over it — the leaf as
 *      the model receives it, a grid of samples rather than a picture;
 *   2. the Sadu band weaves in from the start edge in discrete column steps,
 *      and the steps are the three real stages of the pipeline, so the bar
 *      stops when the work stops rather than when a timer says so;
 *   3. the health map reveals row by row, the way weft rows build up on a loom.
 *
 * Under reduced motion none of it animates: the same three stages appear as
 * text with their state, and the health map simply appears. The information is
 * identical either way, which is the test of whether motion was decoration.
 */
import { html, raw } from './dom.js';
import { t } from '../i18n.js';
import { reducedMotion } from '../themes.js';

/** The three stages, in the order the pipeline actually runs them. */
export const STAGES = ['weave.1', 'weave.2', 'weave.3'];

/** Markup for the progress element. Call `new Weave(node)` on it afterwards. */
export function weaveMarkup({ id = 'weave' } = {}) {
  return html`<div class="weave-group" id="${id}">
    <div class="weave" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0"
         aria-label="${t('scan.analysing')}">
      <div class="weave-fill"></div>
    </div>
    <ol class="weave-steps">
      ${raw(STAGES.map((key, i) => `<li class="weave-step" data-step="${i}" data-state="waiting">
        <span class="dot"></span><span>${t(key)}</span>
      </li>`).join(''))}
    </ol>
  </div>`;
}

export class Weave {
  /** @param {HTMLElement} root the node rendered by weaveMarkup */
  constructor(root) {
    this.root = root;
    this.bar = root.querySelector('.weave');
    this.fill = root.querySelector('.weave-fill');
    this.steps = Array.from(root.querySelectorAll('.weave-step'));
    this.done = 0;
  }

  /** Marks stage `i` (0-based) as running. */
  begin(i) {
    this.steps.forEach((el, n) => {
      el.dataset.state = n < i ? 'done' : n === i ? 'active' : 'waiting';
    });
    // Move to the leading edge of this stage's column so the band is visibly
    // working while the stage runs, not only after it finishes.
    this.#draw(i + 0.35);
  }

  /** Marks stage `i` complete. */
  complete(i) {
    this.done = i + 1;
    this.steps.forEach((el, n) => { if (n <= i) el.dataset.state = 'done'; });
    this.#draw(this.done);
  }

  finish() {
    this.steps.forEach((el) => { el.dataset.state = 'done'; });
    this.#draw(3);
  }

  #draw(value) {
    const clamped = Math.max(0, Math.min(3, value));
    this.fill.style.width = `${(clamped / 3) * 100}%`;
    this.bar.setAttribute('aria-valuenow', String(Math.floor(clamped)));
    this.bar.setAttribute('aria-valuetext', t(STAGES[Math.min(2, Math.floor(clamped))]));
  }
}

/**
 * Lays a faint sampling grid over the frozen photo.
 *
 * Drawn as a CSS background rather than a canvas pass so it costs nothing and
 * can be removed by deleting one attribute. 14 columns, matching the Sadu tile.
 */
export function pixelGridOn(node, on = true) {
  node.dataset.pixelGrid = on ? '1' : '0';
}

/**
 * Reveals the health overlay row by row, like weft rows filling a loom.
 *
 * Resolves when the reveal is finished so the caller can announce the result
 * only once the user can actually see it.
 */
export function revealRows(node, { rows = 14, stepMs = 34 } = {}) {
  if (reducedMotion()) {
    node.style.removeProperty('--reveal');
    node.dataset.revealing = '0';
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    node.dataset.revealing = '1';
    let row = 0;
    const tick = () => {
      row += 1;
      node.style.setProperty('--reveal', `${(row / rows) * 100}%`);
      if (row >= rows) {
        node.dataset.revealing = '0';
        node.style.removeProperty('--reveal');
        resolve();
        return;
      }
      setTimeout(tick, stepMs);
    };
    node.style.setProperty('--reveal', '0%');
    setTimeout(tick, stepMs);
  });
}

/**
 * Runs the three stages against real work.
 *
 * `tasks` is an array of three async functions. Each is awaited in turn and its
 * stage is only marked done when it actually resolves — the bar is a report on
 * the pipeline, not a decoration playing alongside it.
 */
export async function runStages(weave, tasks) {
  const results = [];
  for (let i = 0; i < tasks.length; i++) {
    weave.begin(i);
    // Let the browser paint the "active" state before the work blocks the
    // thread; classification on the CPU backend is not a quick frame.
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    results.push(await tasks[i](results));
    weave.complete(i);
  }
  return results;
}
