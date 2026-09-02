/**
 * Green-Trace UAE — router, views and interaction.
 *
 * Plain ES modules, no build step: what is in this folder is exactly what
 * GitHub Pages serves, which keeps the deployment honest and the project
 * inspectable by anyone judging it.
 */
import { SPECIES, SPECIES_BY_KEY } from './data/species.js';
import { TEAM, PROJECT } from './data/team.js';
import { t, lang, setLang, initLang } from './i18n.js';
import { THEMES, currentTheme, applyTheme, initTheme } from './themes.js';
import { loadModel, classify, isUncertain, getMetadata } from './model.js';
import { analyseLeaf, FINDING_TEXT } from './health.js';
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
  const r = 26;
  const circ = 2 * Math.PI * r;
  const colour = score >= 70 ? 'var(--ok)' : score >= 45 ? 'var(--warn)' : 'var(--bad)';
  return `
    <svg class="dial" viewBox="0 0 68 68" role="img" aria-label="${score} out of 100">
      <circle cx="34" cy="34" r="${r}" fill="none" stroke="var(--bg-sunk)" stroke-width="7"/>
      <circle cx="34" cy="34" r="${r}" fill="none" stroke="${colour}" stroke-width="7"
              stroke-linecap="round" stroke-dasharray="${circ}"
              stroke-dashoffset="${circ * (1 - score / 100)}"
              transform="rotate(-90 34 34)"/>
      <text x="34" y="41" text-anchor="middle" data-score="${score}">${score}</text>
    </svg>`;
}

function resultView() {
  const { image, overlayURL, prediction, health } = lastScan;
  const top = prediction.top;
  const sp = SPECIES_BY_KEY[top.key];
  const L = lang();
  const copy = sp[L] || sp.en;
  const uncertain = isUncertain(prediction);
  const words = FINDING_TEXT[L] || FINDING_TEXT.en;

  const alternatives = prediction.ranked.slice(1).map((r) => {
    const s = SPECIES_BY_KEY[r.key];
    return `<div class="rank">
        <b>${esc((s[L] || s.en).name)}</b><span>${pct(r.p)}%</span>
        <div class="confbar"><i style="width:${pct(r.p)}%"></i></div>
      </div>`;
  }).join('');

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
          <strong style="font-size:1.15rem">${esc(t(`health.${health.band}`))}</strong>
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
      <h3 style="margin-top:16px">${esc(t('result.findings'))}</h3>
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
    <div class="row" style="margin:10px 0 16px">
      <button class="btn ghost" id="btn-toggle-overlay" type="button" aria-pressed="true">
        ${L === 'ar' ? 'إظهار الصورة الأصلية' : 'Show original photo'}
      </button>
      <button class="btn" id="btn-rescan" type="button">${esc(t('scan.again'))}</button>
    </div>

    <div class="card">
      <div class="faint" style="text-transform:uppercase;letter-spacing:.06em;font-size:.68rem;margin-bottom:8px">
        ${esc(t('result.species'))}
      </div>
      <div class="verdict">
        <div class="glyph" aria-hidden="true">${sp.emoji}</div>
        <div>
          <h2>${esc(copy.name)}</h2>
          <div class="latin">${esc(sp.latin)}</div>
        </div>
      </div>
      <div class="row" style="justify-content:space-between;align-items:baseline;margin:14px 0 6px">
        <span class="faint">${esc(t('result.confidence'))}</span>
        <strong style="font-variant-numeric:tabular-nums" data-count-confidence="${pct(top.p)}">${pct(top.p)}%</strong>
      </div>
      <div class="confbar"><i style="width:${pct(top.p)}%"></i></div>
      ${uncertain ? `<p class="muted" style="margin-top:12px;font-size:.88rem">${esc(t('result.lowConf'))}</p>` : ''}
      <h3 style="margin-top:18px">${esc(t('result.alternatives'))}</h3>
      <div class="ranks">${alternatives}</div>
      <a class="btn ghost wide" style="margin-top:14px" href="#/tree/${sp.key}">${esc(t('result.readMore'))}</a>
    </div>

    <div class="card">
      <div class="faint" style="text-transform:uppercase;letter-spacing:.06em;font-size:.68rem;margin-bottom:8px">
        ${esc(t('result.health'))}
      </div>
      ${healthBody}
    </div>

    <details class="card">
      <summary style="cursor:pointer;font-weight:650">${esc(t('result.method'))}</summary>
      <p style="margin-top:12px" class="muted">${esc(t('result.methodBody'))}</p>
      <p class="faint" style="margin:0">${esc(t('result.disclaimer'))}</p>
    </details>
  `;
}

function libraryView() {
  const L = lang();
  return `
    <h1>${esc(t('library.title'))}</h1>
    <p class="muted">${esc(t('library.lede'))}</p>
    <div class="species-grid">
      ${SPECIES.map((s) => {
        const c = s[L] || s.en;
        return `<a class="species-card" href="#/tree/${s.key}">
            <span class="em" aria-hidden="true">${s.emoji}</span>
            <b>${esc(c.name)}</b>
            ${L === 'en' ? `<span class="ar">${esc(s.ar.name)}</span>` : `<span class="ar">${esc(s.en.name)}</span>`}
            <i>${esc(s.latin)}</i>
          </a>`;
      }).join('')}
    </div>`;
}

function treeView(key) {
  const sp = SPECIES_BY_KEY[key];
  if (!sp) return libraryView();
  const L = lang();
  const c = sp[L] || sp.en;
  const section = (title, body) => `<div class="card"><h3>${esc(title)}</h3><p style="margin:0">${esc(body)}</p></div>`;
  return `
    <a class="btn ghost" href="#/library" style="margin-bottom:14px">← ${esc(t('library.back'))}</a>
    <div class="hero">
      <div class="verdict">
        <div class="glyph" aria-hidden="true" style="font-size:2rem">${sp.emoji}</div>
        <div>
          <h1 style="margin:0">${esc(c.name)}</h1>
          <div class="latin">${esc(sp.latin)} · ${esc(c.family)}</div>
        </div>
      </div>
    </div>
    ${section(t('library.leaf'), c.leaf)}
    ${section(t('library.about'), c.about)}
    ${section(t('library.significance'), c.significance)}
    ${section(t('library.health'), c.health)}`;
}

function aboutView() {
  const L = lang();
  const meta = getMetadata();
  const acc = meta ? `${(meta.validationAccuracy * 100).toFixed(1)}%` : '—';
  const samples = meta ? meta.trainingSamples.toLocaleString() : '—';

  const perClass = meta ? SPECIES.map((s) => {
    const a = meta.perClassAccuracy?.[s.key] ?? 0;
    const name = (s[L] || s.en).name;
    return `<div class="rank">
        <b>${esc(name)}</b><span>${(a * 100).toFixed(0)}%</span>
        <div class="confbar"><i style="width:${a * 100}%"></i></div>
      </div>`;
  }).join('') : '';

  const en = L === 'en';

  return `
    <h1>${esc(t('about.title'))}</h1>

    <div class="card">
      <p>${en
        ? 'Green-Trace UAE identifies four native Emirati trees from a photograph of a single leaf, and then measures how healthy that leaf is. It was built as a graduation project to show that meaningful environmental AI does not need a data centre — this entire system runs inside your phone\'s browser.'
        : 'يتعرّف «الأثر الأخضر» على أربع أشجار إماراتية أصيلة من صورة ورقة واحدة، ثم يقيس مدى صحة تلك الورقة. بُني كمشروع تخرج لإثبات أن الذكاء الاصطناعي البيئي المفيد لا يحتاج مركز بيانات — فالنظام كله يعمل داخل متصفح هاتفك.'}</p>
      <p style="margin:0">${en
        ? 'Nothing you photograph is uploaded anywhere. There is no server, no account and no tracking; after the first visit the app works with the network switched off.'
        : 'لا تُرفع أي صورة تلتقطها إلى أي مكان. لا يوجد خادم ولا حساب ولا تتبّع، وبعد الزيارة الأولى يعمل التطبيق دون اتصال بالإنترنت.'}</p>
    </div>

    <div class="card">
      <h3>${en ? 'How it works' : 'كيف يعمل'}</h3>
      <ul class="findings">
        <li class="ok"><i class="dot"></i><span>${en
          ? 'A MobileNetV2 convolutional neural network, pre-trained on ImageNet, converts the leaf photo into a 1,280-number description of its shape, texture and pattern.'
          : 'شبكة عصبية التفافية MobileNetV2 مدرَّبة مسبقاً على ImageNet تحوّل صورة الورقة إلى وصف رقمي من ١٢٨٠ قيمة يمثل شكلها وملمسها ونمطها.'}</span></li>
        <li class="ok"><i class="dot"></i><span>${en
          ? 'A small classifier, trained by us on openly-licensed field photographs of the four species, maps that description onto a tree.'
          : 'مصنّف صغير دربناه على صور ميدانية مفتوحة الترخيص للأنواع الأربعة يربط هذا الوصف بالشجرة المناسبة.'}</span></li>
        <li class="ok"><i class="dot"></i><span>${en
          ? 'Health is measured separately, without a neural network, so every number can be explained: the leaf is cut out of the background using the Excess Green vegetation index, then each pixel is graded as healthy, chlorotic (yellowing) or necrotic (dead).'
          : 'تُقاس الصحة بشكل منفصل ودون شبكة عصبية حتى يمكن تفسير كل رقم: تُفصل الورقة عن الخلفية بمؤشر الأخضر الزائد، ثم تُصنَّف كل بكسل كسليمة أو مصفرّة أو متنخرة.'}</span></li>
      </ul>
    </div>

    <div class="card">
      <h3>${en ? 'Model performance' : 'أداء النموذج'}</h3>
      <dl class="metrics">
        <div class="metric"><dt>${en ? 'Validation accuracy' : 'دقة التحقق'}</dt><dd>${acc}</dd></div>
        <div class="metric"><dt>${en ? 'Training samples' : 'عينات التدريب'}</dt><dd>${samples}</dd></div>
        <div class="metric"><dt>${en ? 'Species' : 'الأنواع'}</dt><dd>${SPECIES.length}</dd></div>
      </dl>
      ${perClass ? `<h3 style="margin-top:16px">${en ? 'Accuracy per species' : 'الدقة لكل نوع'}</h3><div class="ranks">${perClass}</div>` : ''}
      <p class="faint" style="margin:14px 0 0">${en
        ? 'Measured on a held-out validation split the model never trained on.'
        : 'قيست على مجموعة تحقق منفصلة لم يتدرب عليها النموذج.'}</p>
    </div>

    <div class="card qr-wrap">
      <h3 style="margin:0">${esc(t('about.qr'))}</h3>
      <img src="./assets/qr.svg" alt="QR code linking to ${esc(PROJECT.site)}" width="240" height="240">
      <p class="faint" style="margin:0">${esc(t('about.qrHint'))}</p>
      <button class="btn ghost" id="btn-copy" type="button">${en ? 'Copy link' : 'نسخ الرابط'}</button>
    </div>

    <div class="card">
      <h3>${en ? 'Credits & licence' : 'المصادر والترخيص'}</h3>
      <p class="faint" style="margin:0">${en
        ? 'Training photographs come from iNaturalist contributors under Creative Commons licences; every photo used is credited in dataset/inaturalist/CREDITS.json in the repository. The base network is Google\'s MobileNetV2 (Apache 2.0). Source code:'
        : 'صور التدريب من مساهمي iNaturalist بتراخيص المشاع الإبداعي، وكل صورة مستخدمة موثقة في ملف CREDITS.json داخل المستودع. الشبكة الأساسية هي MobileNetV2 من جوجل بترخيص Apache 2.0. الشيفرة المصدرية:'}
        <a href="${PROJECT.repo}" target="_blank" rel="noopener">github.com/vsoultann/green-trace-uae</a></p>
    </div>`;
}

function teamView() {
  const L = lang();
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return `
    <h1>${esc(t('team.title'))}</h1>
    <p class="muted">${esc(t('team.lede'))}</p>
    <div class="team-grid">
      ${TEAM.map((m) => `
        <div class="member">
          <div class="avatar" aria-hidden="true">${esc(initials(m.name))}</div>
          <div>
            <b>${esc(L === 'ar' ? m.ar : m.name)}</b>
            <span>${esc(m.role[L] || m.role.en)}</span>
          </div>
        </div>`).join('')}
    </div>
    <div class="card" style="margin-top:16px;text-align:center">
      <strong>${esc(L === 'ar' ? PROJECT.nameAr : PROJECT.name)}</strong>
      <p class="faint" style="margin:6px 0 0">${PROJECT.year} · ${L === 'ar' ? 'مشروع تخرج' : 'Graduation Project'}</p>
    </div>`;
}

/* ----------------------------------------------------------------- router */

const ROUTES = {
  scan: scanView,
  result: resultView,
  library: libraryView,
  about: aboutView,
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

  // Highlight the matching tab; tree pages belong to the library tab.
  const tab = name === 'tree' ? 'library' : (ROUTES[name] ? name : 'scan');
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  moveTabIndicator();

  transitionView(view, () => {
    view.innerHTML = name === 'tree' ? treeView(arg) : (ROUTES[name] || scanView)();

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
  stagger(view.querySelectorAll(':scope > .card, :scope > .hero, :scope > .species-grid, :scope > .team-grid, :scope > details'));
  stagger(view.querySelectorAll('.findings li'), 55, 220);

  if (name === 'result' || name === 'about') {
    fillBars(view);
    drawDial(view);
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

function wireView(name) {
  if (name === 'about') {
    document.getElementById('btn-copy')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(PROJECT.site);
        toast(t('copied'));
      } catch {
        toast(PROJECT.site);
      }
    });
    // The About page quotes live model numbers, so load the model if the user
    // landed here first and re-render once the metadata arrives.
    if (!getMetadata()) {
      loadModel().then(() => { if (currentRoute().name === 'about') render(); }).catch(() => {});
    }
    return;
  }

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
      btn.textContent = showingOverlay
        ? (lang() === 'ar' ? 'إظهار تحليل الصحة' : 'Show health analysis')
        : (lang() === 'ar' ? 'إظهار الصورة الأصلية' : 'Show original photo');
    });
    document.getElementById('btn-rescan')?.addEventListener('click', () => { location.hash = '#/scan'; });
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
      <button class="btn ghost" id="btn-cancel-cam" type="button">${lang() === 'ar' ? 'إلغاء' : 'Cancel'}</button>
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
      <p class="muted" style="text-align:center;margin-top:12px">${esc(t('scan.analysing'))}</p>`;
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

  const overlayURL = health.overlay ? health.overlay.toDataURL('image/jpeg', 0.86) : null;

  if (lastScan?.image?.startsWith('blob:')) URL.revokeObjectURL(lastScan.image);
  lastScan = { image: objectURL, overlayURL, prediction, health };

  const sp = SPECIES_BY_KEY[prediction.top.key];
  announce(`${(sp[lang()] || sp.en).name}, ${pct(prediction.top.p)}%`);

  // Assigning the hash fires hashchange, which renders. Only render by hand
  // when we were already on #/result and the assignment would be a no-op.
  if (currentRoute().name === 'result') render();
  else location.hash = '#/result';
}

/* ------------------------------------------------------- settings sheet */

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

/* -------------------------------------------------------------------- go */

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
