/**
 * The library.
 *
 * Ten trees are documented here and the deployed model recognises four of them,
 * and this page is where that difference has to be impossible to miss. v1
 * printed "Species: 10" beside a four-class model, which meant anyone who
 * scanned a Mangrove leaf and got "Ghaf" had been told by our own page that
 * Mangrove was covered. Every count now names both numbers, and a tree the
 * model has not been trained on wears a "Reference only" badge wherever it
 * appears — including here, in the tile, before it is opened.
 */
import { html, raw, $, $$ } from '../ui/dom.js';
import { bilingual } from '../ui/bilingual.js';
import { t, lang, L } from '../i18n.js';
import { leafShape } from '../ui/leaf-shapes.js';
import { SPECIES } from '../data/species.js';
import { recognisedKeys, counts } from '../metadata.js';

const FILTERS = [
  { id: 'all', key: 'trees.all' },
  { id: 'native', key: 'trees.native' },
  { id: 'introduced', key: 'trees.introduced' },
  { id: 'invasive', key: 'trees.invasive' },
];

export default function treesView(ctx) {
  const trained = recognisedKeys();
  const tally = counts(SPECIES.length);
  const active = FILTERS.some((f) => f.id === ctx.query.get('filter')) ? ctx.query.get('filter') : 'all';

  return {
    html: html`<div class="shell">
      <header class="page-head">
        ${raw(bilingual({ en: 'Trees', ar: 'الأشجار' }, { size: 'l', tag: 'h1' }))}
        <p class="lede">${t('trees.sub', { n: tally.library, m: tally.recognised ?? '—' })}</p>
      </header>

      <div class="chips" role="group" aria-label="${t('trees.title')}">
        ${raw(FILTERS.map((f) => `<button class="chip" type="button" data-filter="${f.id}"
          aria-pressed="${f.id === active}">${t(f.key)}</button>`))}
      </div>

      <ul class="tree-grid" id="tree-grid">
        ${raw(SPECIES.map((sp) => tile(sp, trained)))}
      </ul>
    </div>`,

    mount(root) {
      apply(root, active);
      root.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-filter]');
        if (!chip) return;
        for (const c of $$('[data-filter]', root)) c.setAttribute('aria-pressed', String(c === chip));
        apply(root, chip.dataset.filter);
        // The filter lives in the URL so a link to "the invasive one" is a link.
        history.replaceState(null, '', chip.dataset.filter === 'all' ? '#/trees' : `#/trees?filter=${chip.dataset.filter}`);
      });
    },
  };
}

function tile(sp, trained) {
  const known = trained.has(sp.key);
  return `<li class="tree-tile" data-status="${sp.status}">
    <a href="#/trees/${sp.key}">
      <span class="tile-shape" aria-hidden="true">${leafShape(sp.key, { size: 64 })}</span>
      <span class="tile-names">
        <b>${L(sp).name}</b>
        <small ${lang() === 'ar' ? 'lang="en" dir="ltr"' : 'lang="ar" dir="rtl"'}>${lang() === 'ar' ? sp.en.name : sp.ar.name}</small>
      </span>
      <span class="tile-tags">
        <span class="badge${sp.status === 'invasive' ? ' badge-invasive' : ''}">${t(`trees.${sp.status}`)}</span>
        <span class="badge ${known ? 'badge-on' : 'badge-ref'}">${known ? t('trees.recognised') : t('trees.reference')}</span>
      </span>
    </a>
  </li>`;
}

function apply(root, filter) {
  for (const tile of $$('.tree-tile', root)) {
    tile.hidden = filter !== 'all' && tile.dataset.status !== filter;
  }
}
