/**
 * One tree.
 *
 * The order answers the question a person actually arrived with: is this the
 * leaf in my hand (how to recognise it), what is this tree (about), why should I
 * care (why it matters here), and what could I be confusing it with.
 *
 * The accuracy line is the honest part. A tree the model was trained on shows
 * the accuracy measured for that class specifically — including the weak ones —
 * and a tree it was not shows that instead of an implied promise.
 */
import { html, raw } from '../ui/dom.js';
import { bilingual } from '../ui/bilingual.js';
import { t, L, pct } from '../i18n.js';
import { icon } from '../icons.js';
import { leafShape } from '../ui/leaf-shapes.js';
import { SPECIES_BY_KEY } from '../data/species.js';
import { recognisedKeys, accuracyFor } from '../metadata.js';

export default function treeView(ctx) {
  const sp = SPECIES_BY_KEY[ctx.params.key];
  if (!sp) {
    return {
      html: html`<div class="shell stack-lg" style="padding-block:4rem">
        <h1>${t('trees.notFound')}</h1>
        <p><a class="btn btn-primary" href="#/trees">${t('trees.back')}</a></p>
      </div>`,
    };
  }

  const known = recognisedKeys().has(sp.key);
  const accuracy = accuracyFor(sp.key);
  const text = L(sp);
  const other = sp.lookalike ? SPECIES_BY_KEY[sp.lookalike.key] : null;

  return {
    html: html`<div class="shell tree-page">
      <nav class="subnav" aria-label="${t('trees.title')}">
        <a href="#/trees">${t('trees.back')}</a>
      </nav>

      <header class="tree-head">
        <span class="tree-mark" aria-hidden="true">${raw(leafShape(sp.key, { size: 120 }))}</span>
        <div>
          ${raw(bilingual({ en: sp.en.name, ar: sp.ar.name }, { size: 'l', tag: 'h1', latin: sp.latin }))}
          <p class="small muted">${text.family}</p>
          <div class="chips" style="margin-block-start:.75rem">
            <span class="badge${sp.status === 'invasive' ? ' badge-invasive' : ''}">${t(`trees.${sp.status}`)}</span>
            <span class="badge ${known ? 'badge-on' : 'badge-ref'}">${known ? t('trees.recognised') : t('trees.reference')}</span>
          </div>
        </div>
      </header>

      <div class="tree-body">
        <section class="panel">
          <h2 class="section-title">${t('trees.leaf')}</h2>
          <p>${text.leaf}</p>
        </section>

        <section class="panel">
          <h2 class="section-title">${t('trees.about')}</h2>
          <p>${text.about}</p>
        </section>

        <section class="panel">
          <h2 class="section-title">${t('trees.why')}</h2>
          <p>${text.significance}</p>
        </section>

        <section class="panel">
          <h2 class="section-title">${t('result.health')}</h2>
          <p>${text.health}</p>
        </section>

        ${raw(sp.lookalike ? `<section class="panel panel-alert lookalike">
          <h2 class="section-title">${t('trees.lookalike')}</h2>
          <div class="lookalike-body">
            <span class="lookalike-mark" aria-hidden="true">${leafShape(sp.lookalike.key, { size: 72 })}</span>
            <div>
              <p>${L(sp.lookalike)}</p>
              ${other ? `<p><a href="#/trees/${other.key}">${L(other).name}</a></p>` : ''}
            </div>
          </div>
        </section>` : '')}

        <section class="panel panel-sunk">
          <h2 class="section-title">${t('trees.accuracy')}</h2>
          ${raw(known && accuracy != null
            ? `<p class="accuracy-value tnum">${pct(accuracy, 1)}</p>
               <p class="small muted">${t('how.matrixHelp')}</p>`
            : `<p>${t('trees.referenceWhy')}</p>`)}
        </section>
      </div>

      <div class="tree-actions">
        <a class="btn btn-primary btn-lg" href="#/">${raw(icon('camera'))}${t('trees.scanThis')}</a>
      </div>
    </div>`,
  };
}
