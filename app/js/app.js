/**
 * Green-Trace UAE — router, views and interaction.
 *
 * Plain ES modules, no build step: what is in this folder is exactly what
 * GitHub Pages serves, which keeps the deployment honest and the project
 * inspectable by anyone judging it.
 */
import { SPECIES, SPECIES_BY_KEY } from './data/species.js';
import { TEAM, PROJECT } from './data/team.js';
import { SECTIONS, QUOTES, LEADERS } from './data/about.js';
import { TREATMENTS, SPECIES_ALERTS, treatmentsFor } from './data/treatments.js';
import { SUPPLIERS, HELPLINES, categoryFor } from './data/suppliers.js';
import { t, lang, setLang, initLang } from './i18n.js';
import { THEMES, currentTheme, applyTheme, initTheme } from './themes.js';
import { loadModel, classify, isUncertain, recognitionState, getMetadata } from './model.js';
import { analyseLeaf, FINDING_TEXT } from './health.js';
import { speciesIcon, UI_ICON } from './icons.js';
import {
  locate, knownPosition, rankSuppliers, formatDistance,
  mapsSearchURL, directionsURL, telURL,
} from './nearby.js';
import {
  applyMotion, motionPref, setMotion, transitionView, stagger, countUp,
  fillBars, drawDial, initRipples, moveTabIndicator, flashThemeShift,
} from './motion.js';

const view = document.getElementById('view');
const live = document.getElementById('live');
const toastEl = document.getElementById('toast');

/** The most recent scan, kept so the result view survives a re-render. */
let lastScan = null;
let cameraStream = null;

/* ------------------------------------------------------------------ utils */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pct = (x) => `${Math.round(x * 100)}`;

/** Picks the current language out of a `{en, ar}` pair. */
const L = (pair) => (pair ? (pair[lang()] ?? pair.en) : '');

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function announce(msg) { live.textContent = msg; }

function stopCamera() {
  cameraStream?.getTracks().forEach((tr) => tr.stop());
  cameraStream = null;
}

/* ------------------------------------------------------------------ views */

function scanView() {
  return `
    <section class="hero">
      <h1>${esc(t('scan.title'))}</h1>
      <p>${esc(t('scan.lede'))}</p>
    </section>

    <div id="capture-area">
      <div class="dropzone" id="dropzone" role="button" tabindex="0"
           aria-label="${esc(t('scan.drop'))}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2a2 2 0 0 0 1.7-1l.5-.8A2 2 0 0 1 11.6 3h.8a2 2 0 0 1 1.7 1.2l.5.8a2 2 0 0 0 1.7 1h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke-linejoin="round"/>
          <circle cx="12" cy="12.4" r="3.6"/>
        </svg>
        <strong>${esc(t('scan.drop'))}</strong>
        <span class="faint">${esc(t('scan.dropHint'))}</span>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn" id="btn-camera" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="12" cy="13" r="3.5"/><path d="M3 8.8A2 2 0 0 1 5 7h1.6l1-2h4.8l1 2H19a2 2 0 0 1 2 1.8v8.4a2 2 0 0 1-2 1.8H5a2 2 0 0 1-2-1.8V8.8Z" stroke-linejoin="round"/></svg>
          ${esc(t('scan.camera'))}
        </button>
        <button class="btn ghost" id="btn-upload" type="button">${esc(t('scan.upload'))}</button>
      </div>
      <input type="file" id="file" accept="image/*" hidden>
    </div>

    <div class="card" style="margin-top:18px">
      <h3>${esc(t('scan.tipTitle'))}</h3>
      <ul class="findings">
        <li class="ok"><i class="dot"></i><span>${esc(t('scan.tip1'))}</span></li>
        <li class="ok"><i class="dot"></i><span>${esc(t('scan.tip2'))}</span></li>
        <li class="ok"><i class="dot"></i><span>${esc(t('scan.tip3'))}</span></li>
      </ul>
    </div>

    <div id="model-status" class="card" hidden>
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong id="model-status-text">${esc(t('scan.loadingModel'))}</strong>
        <span class="faint" id="model-pct">0%</span>
      </div>
      <div class="bar"><i id="model-bar"></i></div>
    </div>
  `;
}

function dial(score) {
  const r = 27;
  const circ = 2 * Math.PI * r;
  const colour = score >= 70 ? 'var(--ok)' : score >= 45 ? 'var(--warn)' : 'var(--bad)';
  return `
    <svg class="dial" viewBox="0 0 70 70" role="img" aria-label="${score} out of 100">
      <circle cx="35" cy="35" r="${r}" fill="none" stroke="var(--bg-sunk)" stroke-width="7"/>
      <circle cx="35" cy="35" r="${r}" fill="none" stroke="${colour}" stroke-width="7"
              stroke-linecap="round" stroke-dasharray="${circ}"
              stroke-dashoffset="${circ * (1 - score / 100)}"
              transform="rotate(-90 35 35)"/>
      <text x="35" y="42" text-anchor="middle" data-score="${score}">${score}</text>
    </svg>`;
}

/* ---------------------------------------------------------------- result */

/**
 * The species half of the result — or an honest refusal.
 *
 * The 'unknown' branch is the important one. A judge's first move is to point
 * the camera at something that is not one of the four trees, and answering
 * "Ghaf, 61%" to a photograph of a coffee cup discredits everything else on
 * the screen. Saying "I don't recognise this" is a feature, so it is presented
 * as a verdict rather than as an error.
 */
function speciesSection() {
  const { prediction, recognition, health } = lastScan;
  const top = prediction.top;
  const sp = SPECIES_BY_KEY[top.key];

  if (recognition.state === 'unknown') {
    const REASON_TEXT = {
      noFoliage: t('unknown.noFoliage'),
      unfamiliar: t('unknown.unfamiliar'),
      lowProbability: t('unknown.lowProbability'),
      spreadEvenly: t('unknown.spreadEvenly'),
    };
    return `
      <div class="unknown">
        <div class="mark" aria-hidden="true">?</div>
        <h2>${esc(t('unknown.title'))}</h2>
        <p class="muted" style="margin-bottom:0">${esc(t('unknown.body'))}</p>
        <ul class="why">
          ${recognition.reasons.map((r) => `<li><span>${esc(REASON_TEXT[r] || r)}</span></li>`).join('')}
        </ul>
        <div class="row" style="margin-top:18px">
          <button class="btn" id="btn-rescan-2" type="button">${esc(t('scan.again'))}</button>
          <a class="btn ghost" href="#/library">${esc(t('unknown.seeFour'))}</a>
        </div>
      </div>`;
  }

  const copy = L(sp);
  const alternatives = prediction.ranked.slice(1).map((r) => {
    const s = SPECIES_BY_KEY[r.key];
    return `<div class="rank">
        <b>${esc(L(s).name)}</b><span>${pct(r.p)}%</span>
        <div class="confbar"><i style="width:${pct(r.p)}%"></i></div>
      </div>`;
  }).join('');

  return `
    <div class="card">
      <span class="eyebrow">${esc(t('result.species'))}</span>
      <div class="verdict">
        <div class="glyph" aria-hidden="true">${speciesIcon(sp.key)}</div>
        <div>
          <h2>${esc(copy.name)}</h2>
          <div class="latin">${esc(sp.latin)}</div>
        </div>
      </div>
      <div class="row" style="justify-content:space-between;align-items:baseline;margin:16px 0 6px">
        <span class="faint">${esc(t('result.confidence'))}</span>
        <strong style="font-variant-numeric:tabular-nums" data-count-confidence="${pct(top.p)}">${pct(top.p)}%</strong>
      </div>
      <div class="confbar"><i style="width:${pct(top.p)}%"></i></div>
      ${recognition.state === 'uncertain'
        ? `<p class="muted" style="margin-top:12px;font-size:.88rem">${esc(t('result.lowConf'))}</p>` : ''}
      <h3 style="margin-top:20px">${esc(t('result.alternatives'))}</h3>
      <div class="ranks">${alternatives}</div>
      <a class="btn ghost wide" style="margin-top:16px" href="#/tree/${sp.key}">${esc(t('result.readMore'))}</a>
    </div>`;
}

/** The treatment plan, plus where to buy it. Only rendered when something is wrong. */
function treatmentSection() {
  const { health, prediction, recognition } = lastScan;
  if (!health.valid) return '';

  const problems = health.findings.filter((f) => f.level !== 'ok');
  if (!problems.length) return '';

  const keys = treatmentsFor(problems);
  if (!keys.length) return '';

  // A notifiable pest outranks any shopping list.
  let alert = '';
  if (recognition.state !== 'unknown') {
    const sa = SPECIES_ALERTS[prediction.top.key];
    if (sa && problems.some((f) => sa.when.includes(f.key))) {
      alert = `<div class="alert">
          <h3>${esc(L(sa.title))}</h3>
          <p>${esc(L(sa.body))}</p>
        </div>`;
    }
  }

  const blocks = keys.map((key) => {
    const tr = TREATMENTS[key];
    return `
      <div class="treatment">
        <h3>${esc(t(`treat.${key}`))}</h3>
        <p class="cause">${esc(L(tr.cause))}</p>
        <div class="products">
          ${tr.products.map((p) => `
            <div class="product">
              <b>${esc(L(p))}</b>
              <span>${esc(L(p.note))}</span>
              <div style="margin-top:9px">
                <a class="btn small ghost" target="_blank" rel="noopener"
                   href="${esc(mapsSearchURL(p.search, knownPosition()))}">
                  ${UI_ICON.search}${esc(t('nearby.findOnMaps'))}
                </a>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }).join('');

  const category = categoryFor(TREATMENTS[keys[0]].products[0].search);

  return `
    ${alert}
    <div class="card">
      <span class="eyebrow">${esc(t('treat.title'))}</span>
      ${blocks}
    </div>

    <div class="card" id="nearby-card" data-category="${esc(category)}">
      <span class="eyebrow">${esc(t('nearby.title'))}</span>
      <p class="muted" style="font-size:.9rem">${esc(t('nearby.lede'))}</p>
      <div id="nearby-list">${supplierList(category, knownPosition())}</div>
      <button class="btn ghost wide" id="btn-locate" style="margin-top:14px">
        ${UI_ICON.pin}${esc(t('nearby.useLocation'))}
      </button>
    </div>`;
}

function resultView() {
  const { image, overlayURL, health, recognition } = lastScan;
  const words = FINDING_TEXT[lang()] || FINDING_TEXT.en;

  const metricCard = (key, value, unit = '%') => `
    <div class="metric">
      <dt>${esc(t(`metric.${key}`))}</dt>
      <dd><b data-value="${value}">${value}</b><span class="unit">${unit}</span></dd>
    </div>`;

  const m = health.metrics;
  const healthBody = health.valid ? `
      <div class="health-head">
        ${dial(health.score)}
        <div>
          <div class="faint">${esc(t('result.healthScore'))}</div>
          <strong style="font-size:1.2rem">${esc(t(`health.${health.band}`))}</strong>
        </div>
      </div>
      <dl class="metrics">
        ${metricCard('chlorosis', pct(m.chlorosis))}
        ${metricCard('necrosis', pct(m.necrosis))}
        ${metricCard('greenness', pct(m.greenness))}
        ${metricCard('uniformity', pct(m.uniformity))}
        ${metricCard('texture', pct(m.texture))}
        ${metricCard('coverage', pct(m.coverage))}
      </dl>
      <h3 style="margin-top:18px">${esc(t('result.findings'))}</h3>
      <ul class="findings">
        ${health.findings.map((f) => {
          const w = words[f.key];
          const text = typeof w === 'function' ? w(f.v) : (w || f.key);
          return `<li class="${f.level}"><i class="dot"></i><span>${esc(text)}</span></li>`;
        }).join('')}
      </ul>`
    : `<p class="muted">${esc(words.noLeaf)}</p>`;

  return `
    <div id="preview-wrap">
      <img src="${overlayURL || image}" alt="Analysed leaf" id="result-img">
    </div>
    <div class="row" style="margin:12px 0 18px">
      <button class="btn ghost" id="btn-toggle-overlay" type="button" aria-pressed="true">
        ${esc(t('result.showOriginal'))}
      </button>
      <button class="btn" id="btn-rescan" type="button">${esc(t('scan.again'))}</button>
    </div>

    ${speciesSection()}

    <div class="card">
      <span class="eyebrow">${esc(t('result.health'))}</span>
      ${healthBody}
    </div>

    ${treatmentSection()}

    <details class="card">
      <summary style="cursor:pointer;font-weight:650">${esc(t('result.method'))}</summary>
      <p style="margin-top:12px" class="muted">${esc(t('result.methodBody'))}</p>
      <p class="faint" style="margin:0">${esc(t('result.disclaimer'))}</p>
    </details>
  `;
}

/* ---------------------------------------------------------------- nearby */

function supplierRow(s, showDistance) {
  const km = showDistance && s.km != null ? formatDistance(s.km, lang()) : null;
  const bits = [L(s.emirate)];
  if (s.hours) bits.push(L(s.hours));

  return `
    <div class="supplier">
      <div class="head">
        <b>${esc(L(s.name))}</b>
        ${km ? `<span class="km">${esc(km)}</span>` : ''}
      </div>
      <div class="meta">${esc(bits.join(' · '))}</div>
      ${!s.hours ? `<div class="meta faint">${esc(t('nearby.hoursUnknown'))}</div>` : ''}
      <div class="acts">
        ${s.phone
          ? `<a class="btn small" href="${esc(telURL(s.phone))}">${UI_ICON.phone}${esc(s.phone)}</a>`
          : ''}
        <a class="btn small ghost" target="_blank" rel="noopener"
           href="${esc(directionsURL(s))}">${UI_ICON.pin}${esc(t('nearby.directions'))}</a>
        ${s.site
          ? `<a class="btn small ghost" target="_blank" rel="noopener" href="${esc(s.site)}">${UI_ICON.globe}${esc(t('nearby.website'))}</a>`
          : ''}
      </div>
    </div>`;
}

function supplierList(category, from, limit = 5) {
  const ranked = rankSuppliers(SUPPLIERS, category, from).slice(0, limit);
  if (!ranked.length) return `<p class="muted">${esc(t('nearby.none'))}</p>`;
  return ranked.map((s) => supplierRow(s, Boolean(from))).join('');
}

function helplineBlock() {
  return HELPLINES.map((h) => `
    <div class="helpline">
      <b>${esc(L(h.name))}</b>
      <p>${esc(L(h.role))}</p>
      ${h.hours ? `<div class="meta faint" style="margin-bottom:9px">${UI_ICON.clock} ${esc(L(h.hours))}</div>` : ''}
      <div class="acts">
        <a class="btn small" href="${esc(telURL(h.phone))}">${UI_ICON.phone}${esc(h.phone)}</a>
        ${h.altPhone ? `<a class="btn small ghost" href="${esc(telURL(h.altPhone))}">${esc(h.altPhone)}</a>` : ''}
        ${h.site ? `<a class="btn small ghost" target="_blank" rel="noopener" href="${esc(h.site)}">${UI_ICON.globe}${esc(t('nearby.website'))}</a>` : ''}
      </div>
    </div>`).join('');
}

function nearbyView() {
  const from = knownPosition();
  return `
    <h1>${esc(t('nearby.pageTitle'))}</h1>
    <p class="muted">${esc(t('nearby.pageLede'))}</p>

    <div class="card">
      <span class="eyebrow">${esc(t('nearby.official'))}</span>
      ${helplineBlock()}
    </div>

    <div class="card" id="nearby-card" data-category="">
      <span class="eyebrow">${esc(t('nearby.shops'))}</span>
      <div id="nearby-list">${supplierList(null, from, 50)}</div>
      <button class="btn ghost wide" id="btn-locate" style="margin-top:14px">
        ${UI_ICON.pin}${esc(t('nearby.useLocation'))}
      </button>
      <p class="faint" style="margin:14px 0 0">${esc(t('nearby.osmCredit'))}</p>
    </div>`;
}

/* --------------------------------------------------------------- library */

function libraryView() {
  return `
    <h1>${esc(t('library.title'))}</h1>
    <p class="muted">${esc(t('library.lede'))}</p>
    <div class="species-grid">
      ${SPECIES.map((s) => {
        const c = L(s);
        const other = lang() === 'en' ? s.ar.name : s.en.name;
        return `<a class="species-card" href="#/tree/${s.key}">
            <span class="em" aria-hidden="true">${speciesIcon(s.key)}</span>
            <b>${esc(c.name)}</b>
            <span class="ar">${esc(other)}</span>
            <i>${esc(s.latin)}</i>
          </a>`;
      }).join('')}
    </div>`;
}

function treeView(key) {
  const sp = SPECIES_BY_KEY[key];
  if (!sp) return libraryView();
  const c = L(sp);
  const section = (title, body) =>
    `<div class="card"><h3>${esc(title)}</h3><p style="margin:0">${esc(body)}</p></div>`;
  return `
    <a class="btn ghost small" href="#/library" style="margin-bottom:16px">← ${esc(t('library.back'))}</a>
    <div class="hero">
      <div class="verdict">
        <div class="glyph" aria-hidden="true">${speciesIcon(sp.key)}</div>
        <div>
          <h1 style="margin:0;font-size:1.7rem">${esc(c.name)}</h1>
          <div class="latin">${esc(sp.latin)} · ${esc(c.family)}</div>
        </div>
      </div>
    </div>
    ${section(t('library.leaf'), c.leaf)}
    ${section(t('library.about'), c.about)}
    ${section(t('library.significance'), c.significance)}
    ${section(t('library.health'), c.health)}`;
}

/* -------------------------------------------------------------- about us */

function quoteBlock(q, withRule = true) {
  const en = lang() === 'en';
  // Both languages, always: the primary language first at full size, the other
  // beneath it. A quotation from the Sheikhs should be readable to whoever is
  // standing at the kiosk without anybody reaching for a toggle.
  const primary = en ? q.en : q.ar;
  const secondary = en ? q.ar : q.en;
  return `
    <figure class="quote" ${withRule ? '' : 'style="border-top:0;padding-top:0"'}>
      <blockquote>“${esc(primary)}”</blockquote>
      <div class="${en ? 'ar-line' : ''}" ${en ? '' : 'style="font-family:Inter,system-ui,sans-serif;direction:ltr;text-align:start;color:var(--ink-soft);margin-bottom:16px"'}>${esc(secondary)}</div>
      <cite>${esc(L(q.who))}<span>${esc(L(q.title))}</span></cite>
    </figure>`;
}

function aboutUsView() {
  const en = lang() === 'en';

  const leaders = `
    <div class="leaders">
      ${LEADERS.map((p) => `
        <figure class="leader" style="margin:0">
          <img src="${esc(p.img)}" alt="${esc(L(p.name))}" width="440" height="440" loading="lazy">
          <b>${esc(L(p.name))}</b>
          <span>${esc(L(p.title))}</span>
        </figure>`).join('')}
    </div>`;

  const sections = SECTIONS.map((s) => `
    <section class="bilingual" id="about-${s.id}">
      <h2>${esc(L(s.heading))}</h2>
      <div class="en">
        <span class="langtag">English</span>
        ${s.body.en.map((p) => `<p>${esc(p)}</p>`).join('')}
      </div>
      <div class="ar">
        <span class="langtag">العربية</span>
        ${s.body.ar.map((p) => `<p>${esc(p)}</p>`).join('')}
      </div>
    </section>`).join('');

  return `
    <section class="aboutus-hero">
      <span class="flagchip" aria-label="Flag of the United Arab Emirates"><i></i><i></i><i></i></span>
      <h1>${esc(t('aboutus.title'))}</h1>
      <p>${esc(t('aboutus.lede'))}</p>
      <a class="btn hero-cta" href="#/scan">${esc(t('aboutus.tryIt'))}</a>
    </section>

    <div class="plain">
      ${quoteBlock(QUOTES.zayedAgriculture, false)}
      ${leaders}
      <p class="faint center" style="margin-top:14px">${esc(t('aboutus.portraitCredit'))}</p>
    </div>

    ${sections}

    <div class="plain">
      ${quoteBlock(QUOTES.zayedEnvironment)}
      ${quoteBlock(QUOTES.mbrFuture)}
    </div>

    <div class="plain center">
      <h2>${esc(t('aboutus.tryHeading'))}</h2>
      <p class="muted" style="max-width:40ch;margin:0 auto 22px">${esc(t('aboutus.tryBody'))}</p>
      <a class="btn hero-cta" href="#/scan">${esc(t('aboutus.tryIt'))}</a>
      <p style="margin-top:26px">
        <a href="#/model">${esc(t('aboutus.seeNumbers'))}</a> ·
        <a href="#/team">${esc(t('aboutus.meetTeam'))}</a>
      </p>
    </div>`;
}

/* ---------------------------------------------------- model / technical */

function modelView() {
  const meta = getMetadata();
  const acc = meta ? `${(meta.validationAccuracy * 100).toFixed(1)}%` : '—';
  const samples = meta ? meta.trainingSamples.toLocaleString() : '—';
  const en = lang() === 'en';

  const perClass = meta ? SPECIES.map((s) => {
    const a = meta.perClassAccuracy?.[s.key] ?? 0;
    return `<div class="rank">
        <b>${esc(L(s).name)}</b><span>${(a * 100).toFixed(0)}%</span>
        <div class="confbar"><i style="width:${a * 100}%"></i></div>
      </div>`;
  }).join('') : '';

  return `
    <h1>${esc(t('model.title'))}</h1>

    <div class="card">
      <h3>${esc(t('model.how'))}</h3>
      <ul class="findings">
        <li class="ok"><i class="dot"></i><span>${esc(t('model.how1'))}</span></li>
        <li class="ok"><i class="dot"></i><span>${esc(t('model.how2'))}</span></li>
        <li class="ok"><i class="dot"></i><span>${esc(t('model.how3'))}</span></li>
        <li class="ok"><i class="dot"></i><span>${esc(t('model.how4'))}</span></li>
      </ul>
    </div>

    <div class="card">
      <h3>${esc(t('model.performance'))}</h3>
      <dl class="metrics">
        <div class="metric"><dt>${esc(t('model.valAcc'))}</dt><dd>${acc}</dd></div>
        <div class="metric"><dt>${esc(t('model.samples'))}</dt><dd>${samples}</dd></div>
        <div class="metric"><dt>${esc(t('model.species'))}</dt><dd>${SPECIES.length}</dd></div>
      </dl>
      ${perClass ? `<h3 style="margin-top:18px">${esc(t('model.perSpecies'))}</h3><div class="ranks">${perClass}</div>` : ''}
      <p class="faint" style="margin:16px 0 0">${esc(t('model.heldOut'))}</p>
    </div>

    <div class="card qr-wrap">
      <h3 style="margin:0">${esc(t('about.qr'))}</h3>
      <img src="./assets/qr.svg" alt="QR code linking to ${esc(PROJECT.site)}" width="230" height="230">
      <p class="faint" style="margin:0">${esc(t('about.qrHint'))}</p>
      <button class="btn ghost small" id="btn-copy" type="button">${en ? 'Copy link' : 'نسخ الرابط'}</button>
    </div>

    <div class="card">
      <h3>${esc(t('model.credits'))}</h3>
      <p class="faint" style="margin:0 0 8px">${esc(t('model.creditsBody'))}
        <a href="${PROJECT.repo}" target="_blank" rel="noopener">github.com/vsoultann/green-trace-uae</a></p>
      <p class="faint" style="margin:0">${esc(t('nearby.osmCredit'))}</p>
      <p class="faint" style="margin:8px 0 0">${esc(t('aboutus.portraitCredit'))}</p>
    </div>`;
}

/* ------------------------------------------------------------------ team */

function teamView() {
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  // Only the two Team Leaders take the flag's red. Matching on "Leader" would
  // sweep the Co-Leader in with them and flatten the distinction the team drew.
  const isLead = (m) => m.role.en === 'Team Leader';

  return `
    <h1>${esc(t('team.title'))}</h1>
    <p class="muted">${esc(t('team.lede'))}</p>

    <div class="card">
      <span class="eyebrow">${esc(t('team.split'))}</span>
      <div class="team-list">
        ${TEAM.map((m) => `
          <div class="member${isLead(m) ? ' lead' : ''}">
            <div class="avatar" aria-hidden="true">${esc(initials(m.name))}</div>
            <div class="who">
              <b>${esc(lang() === 'ar' ? m.ar : m.name)}</b>
              <span>${esc(L(m.role))}</span>
            </div>
            <div class="pct">${m.share}%</div>
            <div class="contribution">${esc(L(m.contribution))}</div>
            <div class="share"><i data-fill="${m.share}" style="width:0"></i></div>
          </div>`).join('')}
      </div>
      <p class="faint" style="margin:16px 0 0">${esc(t('team.splitNote'))}</p>
    </div>

    <div class="card center">
      <strong>${esc(lang() === 'ar' ? PROJECT.nameAr : PROJECT.name)}</strong>
      <p class="faint" style="margin:6px 0 0">${PROJECT.year} · ${esc(t('team.gradProject'))}</p>
    </div>`;
}

/* ----------------------------------------------------------------- router */

const ROUTES = {
  scan: scanView,
  result: resultView,
  library: libraryView,
  nearby: nearbyView,
  about: aboutUsView,
  model: modelView,
  team: teamView,
};

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '') || 'scan';
  const [name, arg] = hash.split('/');
  return { name, arg };
}

function render() {
  const { name, arg } = currentRoute();
  stopCamera();

  if (name === 'result' && !lastScan) { location.hash = '#/scan'; return; }

  // Highlight the matching tab; tree pages belong to the library tab and the
  // technical page belongs to About.
  const tab = name === 'tree' ? 'library'
    : name === 'model' ? 'about'
    : (ROUTES[name] ? name : 'scan');
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  moveTabIndicator();

  transitionView(view, () => {
    view.innerHTML = name === 'tree' ? treeView(arg) : (ROUTES[name] || scanView)();
    // `view` *is* the <main>, so the class goes on it directly. Reaching for
    // parentElement put it on <body>, where the width rule does nothing.
    view.classList.toggle('wide', name === 'about' || name === 'nearby');

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.dataset.i18n;
      if (el.firstChild?.nodeType === 3) el.firstChild.nodeValue = t(k);
      else el.textContent = t(k);
    });

    wireView(name);
    animateView(name);
  });

  scrollTo({ top: 0, behavior: 'instant' });
}

/** Post-render motion: stagger the cards, then play the per-view flourishes. */
function animateView(name) {
  stagger(view.querySelectorAll(
    ':scope > .card, :scope > .hero, :scope > .species-grid, :scope > .plain, ' +
    ':scope > .bilingual, :scope > .aboutus-hero, :scope > .unknown, :scope > details'
  ));
  stagger(view.querySelectorAll('.findings li'), 55, 220);

  if (name === 'result' || name === 'model') {
    fillBars(view);
    drawDial(view);
  }

  if (name === 'team') {
    // Grow each contribution bar to its share once the row is on screen.
    requestAnimationFrame(() => {
      view.querySelectorAll('.share i[data-fill]').forEach((el, i) => {
        setTimeout(() => { el.style.width = `${el.dataset.fill}%`; }, 90 + i * 70);
      });
    });
  }

  if (name === 'result') {
    const conf = view.querySelector('[data-count-confidence]');
    if (conf) countUp(conf, Number(conf.dataset.countConfidence), { suffix: '%' });
    const score = view.querySelector('.dial text');
    if (score) countUp(score, Number(score.dataset.score ?? score.textContent), { duration: 1100 });
    view.querySelectorAll('.metric b[data-value]').forEach((b, i) => {
      countUp(b, Number(b.dataset.value), { duration: 700 + i * 40 });
    });
  }
}

/* -------------------------------------------------------------- behaviour */

/** Wires the "use my location" button on whichever view is showing one. */
function wireLocate() {
  const btn = document.getElementById('btn-locate');
  const card = document.getElementById('nearby-card');
  if (!btn || !card) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = t('nearby.locating');
    const fix = await locate();
    btn.disabled = false;

    if (!fix) {
      btn.textContent = t('nearby.useLocation');
      toast(t('nearby.denied'));
      return;
    }

    const category = card.dataset.category || null;
    const isPage = currentRoute().name === 'nearby';
    document.getElementById('nearby-list').innerHTML =
      supplierList(category, fix, isPage ? 50 : 5);
    btn.textContent = t('nearby.sorted');
    btn.disabled = true;
  });
}

function wireView(name) {
  if (name === 'model') {
    document.getElementById('btn-copy')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(PROJECT.site);
        toast(t('copied'));
      } catch {
        toast(PROJECT.site);
      }
    });
    // This page quotes live model numbers, so load the model if the user landed
    // here first and re-render once the metadata arrives.
    if (!getMetadata()) {
      loadModel().then(() => { if (currentRoute().name === 'model') render(); }).catch(() => {});
    }
    return;
  }

  if (name === 'nearby') { wireLocate(); return; }

  if (name === 'result') {
    const img = document.getElementById('result-img');
    const btn = document.getElementById('btn-toggle-overlay');
    btn?.addEventListener('click', () => {
      const showingOverlay = btn.getAttribute('aria-pressed') === 'true';
      img.src = showingOverlay ? lastScan.image : lastScan.overlayURL;
      img.classList.remove('wiping');
      void img.offsetWidth; // restart the wipe animation
      img.classList.add('wiping');
      btn.setAttribute('aria-pressed', String(!showingOverlay));
      btn.textContent = showingOverlay ? t('result.showAnalysis') : t('result.showOriginal');
    });
    const rescan = () => { location.hash = '#/scan'; };
    document.getElementById('btn-rescan')?.addEventListener('click', rescan);
    document.getElementById('btn-rescan-2')?.addEventListener('click', rescan);
    wireLocate();
    return;
  }

  if (name !== 'scan' && name !== '') return;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file');

  const pick = () => fileInput.click();
  dropzone.addEventListener('click', pick);
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
  });
  document.getElementById('btn-upload').addEventListener('click', pick);
  document.getElementById('btn-camera').addEventListener('click', startCamera);

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('hot'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('hot'); }));
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  });

  // Warm the model up in the background while the user is still reading.
  ensureModel().catch(() => {});
}

/* ------------------------------------------------------------------ model */

function showModelProgress(fraction) {
  const box = document.getElementById('model-status');
  if (!box) return;
  box.hidden = false;
  document.getElementById('model-bar').style.width = `${Math.round(fraction * 100)}%`;
  document.getElementById('model-pct').textContent = `${Math.round(fraction * 100)}%`;
  if (fraction >= 1) setTimeout(() => { box.hidden = true; }, 600);
}

let modelReady = null;
function ensureModel() {
  if (!modelReady) {
    modelReady = loadModel(showModelProgress).catch((err) => {
      modelReady = null;
      console.error(err);
      toast(t('err.model'));
      throw err;
    });
  }
  return modelReady;
}

/* ----------------------------------------------------------------- camera */

async function startCamera() {
  const area = document.getElementById('capture-area');
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
      audio: false,
    });
  } catch {
    toast(t('err.camera'));
    return;
  }

  area.innerHTML = `
    <div id="preview-wrap"><video id="cam" playsinline muted autoplay></video></div>
    <div class="row" style="margin-top:12px">
      <button class="btn" id="btn-shoot" type="button">${esc(t('scan.capture'))}</button>
      <button class="btn ghost" id="btn-cancel-cam" type="button">${esc(t('scan.cancel'))}</button>
    </div>`;

  const video = document.getElementById('cam');
  video.srcObject = cameraStream;
  await video.play().catch(() => {});

  document.getElementById('btn-cancel-cam').addEventListener('click', () => { stopCamera(); render(); });
  document.getElementById('btn-shoot').addEventListener('click', () => {
    const shot = document.createElement('canvas');
    shot.width = video.videoWidth;
    shot.height = video.videoHeight;
    shot.getContext('2d').drawImage(video, 0, 0);
    stopCamera();
    shot.toBlob((blob) => handleFile(blob), 'image/jpeg', 0.92);
  });

  ensureModel().catch(() => {});
}

/* --------------------------------------------------------------- analysis */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

async function handleFile(fileOrBlob) {
  const objectURL = URL.createObjectURL(fileOrBlob);
  let img;
  try {
    img = await loadImage(objectURL);
  } catch {
    URL.revokeObjectURL(objectURL);
    toast(t('err.image'));
    return;
  }

  // Show the photo with a scanning sweep while the model does its work.
  const area = document.getElementById('capture-area');
  if (area) {
    area.innerHTML = `<div id="preview-wrap" class="scanning"><img src="${objectURL}" alt=""></div>
      <p class="muted center" style="margin-top:12px">${esc(t('scan.analysing'))}</p>`;
  }
  announce(t('scan.analysing'));

  try {
    await ensureModel();
  } catch {
    render();
    return;
  }

  // Yield a frame so the sweep animation actually paints before the (blocking)
  // inference call starts.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  let prediction, health;
  try {
    prediction = await classify(img);
    health = analyseLeaf(img);
  } catch (err) {
    console.error(err);
    toast(t('err.image'));
    render();
    return;
  }

  // The health pass knows whether there is foliage in the frame at all, which
  // is the strongest single reason to refuse to name a species.
  const recognition = recognitionState(prediction, health.leafConfidence);

  const overlayURL = health.overlay ? health.overlay.toDataURL('image/jpeg', 0.86) : null;

  if (lastScan?.image?.startsWith('blob:')) URL.revokeObjectURL(lastScan.image);
  lastScan = { image: objectURL, overlayURL, prediction, health, recognition };

  if (recognition.state === 'unknown') {
    announce(t('unknown.title'));
  } else {
    const sp = SPECIES_BY_KEY[prediction.top.key];
    announce(`${L(sp).name}, ${pct(prediction.top.p)}%`);
  }

  // Assigning the hash fires hashchange, which renders. Only render by hand
  // when we were already on #/result and the assignment would be a no-op.
  if (currentRoute().name === 'result') render();
  else location.hash = '#/result';
}

/* --------------------------------------------------------- settings sheet */

const sheet = document.getElementById('sheet');

function paintThemeList() {
  const list = document.getElementById('theme-list');
  const active = currentTheme();
  list.innerHTML = THEMES.map((th) => `
    <button class="theme-opt" type="button" role="radio" data-theme-id="${th.id}"
            aria-checked="${th.id === active}">
      <span class="swatch" style="background:${th.swatch}"></span>
      <span>
        <b>${esc(t(`theme.${th.id}`))}</b>
        <span>${esc(t(`theme.${th.id}.d`))}</span>
      </span>
      ${th.id === active ? '<span class="tick" aria-hidden="true">✓</span>' : ''}
    </button>`).join('');

  list.querySelectorAll('[data-theme-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      flashThemeShift();
      applyTheme(btn.dataset.themeId);
      paintThemeList();
    });
  });
}

function paintLangSeg() {
  document.querySelectorAll('#lang-seg button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
  });
  document.getElementById('lang-label').textContent = lang() === 'ar' ? 'EN' : 'ع';
}

document.getElementById('btn-theme').addEventListener('click', () => {
  paintThemeList();
  paintLangSeg();
  sheet.showModal();
});
document.getElementById('sheet-close').addEventListener('click', () => sheet.close());
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

document.querySelectorAll('#lang-seg button').forEach((b) => {
  b.addEventListener('click', () => setLang(b.dataset.lang));
});

function paintMotionSeg() {
  document.querySelectorAll('#motion-seg button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.motion === motionPref()));
  });
}
document.querySelectorAll('#motion-seg button').forEach((b) => {
  b.addEventListener('click', () => { setMotion(b.dataset.motion); paintMotionSeg(); });
});
document.getElementById('btn-lang').addEventListener('click', () => {
  setLang(lang() === 'ar' ? 'en' : 'ar');
});

window.addEventListener('gt:lang', () => { paintLangSeg(); paintThemeList(); paintMotionSeg(); render(); });

/* --------------------------------------------------------------------- go */

initLang();
initTheme();
applyMotion();
initRipples();
paintLangSeg();
paintMotionSeg();
addEventListener('resize', moveTabIndicator, { passive: true });
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Both paths are resolved against the page, not this module, so the worker
    // claims the whole app directory rather than /js/.
    navigator.serviceWorker
      .register(new URL('./sw.js', document.baseURI), { scope: new URL('./', document.baseURI) })
      .catch((err) => console.warn('Service worker registration failed', err));
  });
}
