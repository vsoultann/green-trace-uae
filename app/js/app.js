/**
 * Warif — the shell.
 *
 * This file owns everything that is on screen no matter which route you are on:
 * the Sadu band, the two navigations, the settings sheet, the language toggle
 * and the router wiring. Views own their own content and nothing else.
 *
 * Plain ES modules, no build step. What is in app/ is exactly what GitHub Pages
 * serves, which keeps the deployment honest and the project inspectable by
 * anyone who is judging it.
 */
import { CONFIG } from './config.js';
import { t, lang, dir, setLang, onLangChange } from './i18n.js';
import {
  THEMES, MOTIONS, TEXT_SIZES, current as appearance,
  applyTheme, applyMotion, applyTextSize, init as initAppearance,
} from './themes.js';
import { icon } from './icons.js';
import { html, raw, $, announce } from './ui/dom.js';
import { start, parseHash, go } from './router.js';
import { ensureModel } from './ui/model-gate.js';
import { loadMetadata } from './metadata.js';
import { clearScan } from './state.js';

const topbar = $('#topbar');
const tabbar = $('#tabbar');
const viewEl = $('#view');
const settingsEl = $('#settings');

initAppearance();

/* --------------------------------------------------------------- chrome */

/**
 * The desktop navigation.
 *
 * Scan is not in this list. On a laptop it is the primary button on the end of
 * the bar, because it is the thing the app is for; on a phone it is the diamond
 * in the middle of the bottom bar, for the same reason. A route that is the
 * product does not belong in a row of equals.
 */
const NAV = [
  { id: 'trees', path: '/trees', key: 'nav.trees', icon: 'trees' },
  { id: 'help', path: '/help', key: 'nav.help', icon: 'help' },
  { id: 'project', path: '/project', key: 'nav.project', icon: 'project' },
  { id: 'team', path: '/team', key: 'nav.team', icon: 'team' },
];

function renderTopbar() {
  topbar.innerHTML = html`<div class="shell topbar-inner">
    <a class="home" href="#/" aria-label="${t('nav.home')}">
      <span class="lockup" role="img" aria-hidden="true"></span>
    </a>
    <nav aria-label="${t('nav.main')}">
      ${raw(NAV.map((item) => `<a href="#${item.path}" data-nav="${item.id}">${t(item.key)}</a>`))}
    </nav>
    <span class="spacer"></span>
    <a class="btn btn-primary desk-only" href="#/">${raw(icon('scan', { size: 20 }))}${t('scan.start')}</a>
    <button class="iconbtn" id="lang-toggle" type="button" aria-label="${t('nav.language')}">
      <span aria-hidden="true" class="lang-glyph">${lang() === 'ar' ? 'EN' : 'ع'}</span>
    </button>
    <button class="iconbtn" id="settings-open" type="button" aria-label="${t('nav.settings')}">
      ${raw(icon('settings'))}
    </button>
  </div>`;
}

function renderTabbar() {
  const item = (nav) => `<a href="#${nav.path}" data-nav="${nav.id}">
      ${icon(nav.icon, { cls: 'ico' })}<span>${t(nav.key)}</span>
    </a>`;

  tabbar.setAttribute('aria-label', t('nav.main'));
  tabbar.innerHTML = html`
    ${raw(item(NAV[0]))}
    ${raw(item(NAV[1]))}
    <a href="#/" data-nav="scan" class="scan-tab" aria-label="${t('scan.start')}">
      <span class="diamond">${raw(icon('scan', { size: 26 }))}</span>
    </a>
    ${raw(item(NAV[2]))}
    ${raw(item(NAV[3]))}`;
}

/** Marks the tab you are on, in both navigations at once. */
function markActive(pathname) {
  const id = pathname === '/' ? 'scan'
    : pathname.startsWith('/trees') ? 'trees'
    : pathname.startsWith('/help') ? 'help'
    : pathname.startsWith('/project') ? 'project'
    : pathname.startsWith('/team') ? 'team'
    : null;

  for (const link of document.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

/* ------------------------------------------------------------- settings */

function renderSettings() {
  const now = appearance();
  const seg = (name, options, active) => options.map((o) =>
    `<button type="button" data-${name}="${o.id}" aria-pressed="${o.id === active}">${t(o.key)}</button>`).join('');

  settingsEl.innerHTML = html`<div class="sheet-body stack">
    <div class="section-head">
      <h2>${t('settings.title')}</h2>
      <button class="iconbtn" id="settings-close" type="button" aria-label="${t('settings.close')}">
        ${raw(icon('close'))}
      </button>
    </div>

    <div class="field">
      <label id="set-lang">${t('settings.language')}</label>
      <div class="seg" role="group" aria-labelledby="set-lang">
        <button type="button" data-lang="en" lang="en" aria-pressed="${lang() === 'en'}">English</button>
        <button type="button" data-lang="ar" lang="ar" aria-pressed="${lang() === 'ar'}">العربية</button>
      </div>
    </div>

    <div class="field">
      <label id="set-theme">${t('settings.theme')}</label>
      <div class="seg seg-wrap" role="group" aria-labelledby="set-theme">${raw(seg('theme', THEMES, now.theme))}</div>
      <p class="small muted">${t('settings.themeAutoHint')}</p>
    </div>

    <div class="field">
      <label id="set-motion">${t('settings.motion')}</label>
      <div class="seg" role="group" aria-labelledby="set-motion">${raw(seg('motion', MOTIONS, now.motion))}</div>
      <p class="small muted">${t('settings.motionHint')}</p>
    </div>

    <div class="field">
      <label id="set-text">${t('settings.textsize')}</label>
      <div class="seg" role="group" aria-labelledby="set-text">${raw(seg('textsize', TEXT_SIZES, now.textsize))}</div>
    </div>

    <button class="btn btn-primary btn-wide" id="settings-done" type="button">${t('settings.close')}</button>
  </div>`;
}

settingsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) {
    // A click on the backdrop lands on the dialog itself, never on its body.
    if (e.target === settingsEl) settingsEl.close();
    return;
  }
  if (btn.id === 'settings-close' || btn.id === 'settings-done') { settingsEl.close(); return; }
  if (btn.dataset.lang) { setLang(btn.dataset.lang); return; }
  if (btn.dataset.theme) applyTheme(btn.dataset.theme);
  if (btn.dataset.motion) applyMotion(btn.dataset.motion);
  if (btn.dataset.textsize) applyTextSize(btn.dataset.textsize);
  renderSettings();
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('#settings-open, #lang-toggle');
  if (!el) return;
  if (el.id === 'settings-open') { renderSettings(); settingsEl.showModal(); }
  else setLang(lang() === 'ar' ? 'en' : 'ar');
});

/* --------------------------------------------------------------- router */

/**
 * Paints a view.
 *
 * Views return `{ html, mount }`. `mount` runs after the markup is in the DOM
 * and may return its own cleanup — cameras, timers and wake locks all have to
 * be given back when the visitor navigates away, and the router calls that
 * cleanup before the next view is built.
 */
async function paint(ctx) {
  const result = await ctx.view(ctx);
  const output = typeof result === 'string' ? { html: result } : result;

  document.body.dataset.chrome = ctx.route.chrome ?? 'app';

  const swap = () => {
    viewEl.innerHTML = output.html ?? '';
    viewEl.dataset.route = ctx.route.id;
  };

  // Progressive enhancement: a browser without View Transitions simply swaps,
  // which is what the app did before the API existed.
  //
  // All three of the transition's promises are handled, including the ones we
  // do not await. A transition that is skipped — because another navigation
  // started, or the tab was hidden — rejects `ready`, and an unhandled rejection
  // there is reported as a page error, which the smoke test treats as a failure.
  if (document.startViewTransition && ctx.route.chrome !== 'bare') {
    const transition = document.startViewTransition(swap);
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
    await transition.updateCallbackDone.catch(() => { swap(); });
  } else {
    swap();
  }

  markActive(ctx.pathname);

  const cleanup = await output.mount?.(viewEl, ctx);

  // Moving focus on every route change would fight a screen reader mid-sentence,
  // so the heading is announced and focus is only moved for a deliberate
  // navigation rather than the first paint.
  if (!paint.first) {
    viewEl.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  paint.first = false;

  const heading = viewEl.querySelector('h1, .bi-lead');
  if (heading) announce(heading.textContent.trim());

  return cleanup;
}
paint.first = true;

function notFound(ctx) {
  document.body.dataset.chrome = 'app';
  viewEl.innerHTML = html`<div class="shell stack-lg" style="padding-block:4rem">
    <h1>${t('misc.error')}</h1>
    <p class="muted">${ctx.pathname}</p>
    <p><a class="btn btn-primary" href="#/">${t('scan.start')}</a></p>
  </div>`;
  markActive('/');
}

renderTopbar();
renderTabbar();

/* A kilobyte of model card, awaited before the first view is built. Everything
   that counts trees depends on it, and a count that corrects itself two seconds
   later is the v1 bug wearing a new coat. */
await loadMetadata();

const refresh = start({
  onRender: (ctx) => paint(ctx),
  onMissing: notFound,
});

/* Re-render everything on a language change: the chrome, the settings sheet if
   it is open, and the view — a translated app that keeps one English heading
   until you navigate is worse than one that never translated at all. The view
   goes back through the router rather than being repainted directly, so a
   language change during a navigation cannot win a race against it. */
onLangChange(() => {
  renderTopbar();
  renderTabbar();
  if (settingsEl.open) renderSettings();
  refresh();
});

/* ------------------------------------------------------- after first paint */

/**
 * The model is 14 MB and the visitor has not asked for it yet.
 *
 * Starting it here means the download overlaps with reading the home screen,
 * so pressing Scan usually finds it already there. It is deliberately behind a
 * paint: nothing about the first screen should wait on the network.
 */
requestAnimationFrame(() => {
  setTimeout(() => { ensureModel().catch(() => { /* the scan view reports it */ }); }, 300);
});

/**
 * Register the service worker — the thing that makes the kiosk work offline.
 *
 * The readyState check is not belt and braces. This module has a top-level
 * `await` on the model card, so its body resumes *after* the document has
 * finished loading, and a plain `addEventListener('load', …)` here attaches a
 * listener to an event that already fired. The app then looked perfectly
 * healthy and had no service worker at all, which only shows up when the wifi
 * goes — the one moment the whole offline claim is being tested.
 */
if ('serviceWorker' in navigator) {
  const register = () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* file:// or private mode */ });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

/* A kiosk reload must not come back holding the last visitor's leaf. */
window.addEventListener('pagehide', () => { if (document.body.dataset.kiosk === '1') clearScan(); });

/* Exposed for the smoke test, which asserts on the shell rather than guessing
   from pixels. Nothing in the app reads these. */
window.warif = { CONFIG, go, parseHash, lang, dir };
