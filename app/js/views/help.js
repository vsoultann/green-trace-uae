/**
 * Help.
 *
 * The official helplines come first and a shop never appears above them. If a
 * date palm is dying of red palm weevil, the useful thing is not a fungicide —
 * it is the Ministry's number, because a suspected infestation is reportable and
 * treating it privately is how it spreads. A tool that sells you something when
 * it should have told you to call someone has given the wrong answer
 * confidently, which is the failure mode this whole project is arguing against.
 *
 * Location is optional and explained before it is asked for. It never leaves the
 * device: it is used to sort a list that is already on it.
 */
import { html, raw, $, $$, toast } from '../ui/dom.js';
import { bilingual } from '../ui/bilingual.js';
import { t, lang, L } from '../i18n.js';
import { icon } from '../icons.js';
import { SUPPLIERS, HELPLINES } from '../data/suppliers.js';
import { supplierRow } from '../ui/supplier.js';
import { locate, knownPosition, rankSuppliers, telURL, mapsSearchURL } from '../nearby.js';

export default function helpView() {
  const emirates = [...new Set(SUPPLIERS.map((s) => L(s.emirate)))].sort();

  return {
    html: html`<div class="shell help-page">
      <header class="page-head">
        ${raw(bilingual({ en: 'Help', ar: 'المساعدة' }, { size: 'l', tag: 'h1' }))}
        <p class="lede">${t('help.sub')}</p>
      </header>

      <section aria-labelledby="official-title" class="help-official">
        <div class="section-head"><h2 id="official-title">${t('help.official')}</h2></div>
        <div class="helplines">
          ${raw(HELPLINES.map(helpline))}
        </div>
      </section>

      <section aria-labelledby="suppliers-title" class="help-suppliers">
        <div class="section-head">
          <h2 id="suppliers-title">${t('help.suppliers')}</h2>
          <button class="btn btn-outline" id="act-locate" type="button">
            ${raw(icon('location', { size: 'sm' }))}${t('help.locate')}
          </button>
        </div>
        <p class="small muted measure" id="locate-note">${t('help.locateWhy')}</p>

        <div class="field emirate-filter">
          <label for="emirate">${t('help.emirate')}</label>
          <select class="input" id="emirate">
            <option value="">${t('help.allEmirates')}</option>
            ${raw(emirates.map((e) => `<option value="${e}">${e}</option>`))}
          </select>
        </div>

        <ul class="suppliers panel" id="supplier-list"></ul>

        <p class="small muted">
          <a href="${mapsSearchURL('plant nursery', knownPosition())}" target="_blank" rel="noopener">${t('help.searchOnline')}</a>
        </p>
        <p class="small muted">${raw(OSM_CREDIT[lang()] ?? OSM_CREDIT.en)}</p>
      </section>
    </div>`,

    mount(root) {
      const list = $('#supplier-list', root);
      const select = $('#emirate', root);
      const note = $('#locate-note', root);
      let emirate = '';

      const draw = () => {
        const here = knownPosition();
        const rows = rankSuppliers(SUPPLIERS, null, here)
          .filter((s) => !emirate || L(s.emirate) === emirate);
        list.innerHTML = rows.map(supplierRow).join('');
      };

      draw();

      select.addEventListener('change', () => { emirate = select.value; draw(); });

      $('#act-locate', root).addEventListener('click', async (e) => {
        const button = e.currentTarget;
        button.disabled = true;
        try {
          await locate();
          note.textContent = t('help.located');
          draw();
        } catch {
          // Denied, unavailable or timed out. The list still works, in its
          // normal order, which is the point of not requiring a fix.
          note.textContent = t('help.denied');
          toast(t('help.denied'));
        } finally {
          button.disabled = false;
        }
      });
    },
  };
}

function helpline(h) {
  return `<article class="helpline panel">
    <h3>${L(h.name)}</h3>
    <p>${L(h.role)}</p>
    <p class="helpline-numbers">
      <a class="btn btn-primary" href="${telURL(h.phone)}">${icon('call', { size: 'sm' })}${h.phone}</a>
      ${h.altPhone ? `<a class="btn btn-outline" href="${telURL(h.altPhone)}">${h.altPhone}</a>` : ''}
    </p>
    <p class="small muted">${h.hours ? L(h.hours) : t('help.noHours')}</p>
    ${h.site ? `<p class="small"><a href="${h.site}" target="_blank" rel="noopener">${new URL(h.site).hostname}</a></p>` : ''}
  </article>`;
}

/* OpenStreetMap's licence requires the credit; keep it. */
const OSM_CREDIT = {
  en: 'Shop locations, phone numbers and hours from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL), collected September 2026.',
  ar: 'مواقع المحال وأرقامها وأوقات عملها من <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">مساهمي OpenStreetMap</a> (رخصة ODbL)، جُمعت في سبتمبر 2026.',
};
