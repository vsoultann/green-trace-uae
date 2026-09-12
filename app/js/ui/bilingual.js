/**
 * Bilingual headings, in the manner of UAE road signage.
 *
 * Both languages are always present. The one the visitor chose is set large,
 * the other runs beneath it smaller and quieter — so a visitor reading Arabic
 * on an English interface is never the one being accommodated, they simply read
 * the second line. Body prose stays single-language; two paragraphs of the same
 * text stacked is not bilingualism, it is noise.
 *
 * Each half carries its own lang and dir, which is what lets a browser pick the
 * right font, the right justification and the right line-breaking for it.
 */
import { html, raw } from './dom.js';
import { lang } from '../i18n.js';

const ATTRS = {
  en: 'lang="en" dir="ltr"',
  ar: 'lang="ar" dir="rtl"',
};

/**
 * @param {{en:string, ar:string}} pair
 * @param {{size?:'xl'|'l'|'m'|'s', tag?:string, latin?:string, id?:string, cls?:string}} [opts]
 */
export function bilingual(pair, opts = {}) {
  const size = opts.size ?? 'm';
  const tag = opts.tag ?? 'h2';
  const active = lang();
  const other = active === 'ar' ? 'en' : 'ar';

  const lead = pair[active] ?? pair.en ?? '';
  const alt = pair[other] ?? '';

  return html`<div class="bi bi-${raw(size)} ${raw(opts.cls ?? '')}"${raw(opts.id ? ` id="${opts.id}"` : '')}>
    <${raw(tag)} class="bi-lead" ${raw(ATTRS[active])}>${lead}</${raw(tag)}>
    ${when(alt && alt !== lead, () => html`<span class="bi-alt" ${raw(ATTRS[other])}>${alt}</span>`)}
    ${when(opts.latin, () => html`<span class="latin-name" lang="la" dir="ltr"><bdi>${opts.latin}</bdi></span>`)}
  </div>`;
}

/**
 * A scientific name inside running text.
 *
 * Latin set inside Arabic has to be isolated or the bidi algorithm drags the
 * surrounding punctuation to the wrong end of the phrase; `<bdi>` is what stops
 * that. Italics are fine on the Latin and never applied to the Arabic.
 */
export const latin = (name) => html`<span class="latin-name" lang="la" dir="ltr"><bdi>${name}</bdi></span>`;

function when(cond, fn) { return cond ? raw(fn()) : raw(''); }
