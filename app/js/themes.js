/**
 * Appearance: theme, motion and text size.
 *
 * v1 shipped sixteen themes — Catppuccin, Nord, Dracula and friends. They were
 * fun to build and they diluted the identity completely: an app whose colours
 * can be swapped for a code editor's palette does not have colours of its own.
 * Warif has four, and each of them is a decision rather than a preference:
 *
 *   auto      follow the device, which is what most people actually want
 *   day       the daylight palette, for a phone in a garden
 *   night     "Majlis", for a low-lit room and a screen held between two people
 *   contrast  black, white and one signal colour, for a projected demo or for
 *             anyone who needs the maximum separation available
 *
 * All four are defined in css/tokens.css. This module only decides which one is
 * on, remembers it, and keeps the browser's own UI in step via theme-color.
 */

export const THEMES = [
  { id: 'auto', key: 'settings.themeAuto' },
  { id: 'day', key: 'settings.themeDay' },
  { id: 'night', key: 'settings.themeNight' },
  { id: 'contrast', key: 'settings.themeContrast' },
];

export const MOTIONS = [
  { id: 'auto', key: 'settings.motionAuto' },
  { id: 'on', key: 'settings.motionOn' },
  { id: 'off', key: 'settings.motionOff' },
];

export const TEXT_SIZES = [
  { id: 'standard', key: 'settings.textStandard' },
  { id: 'large', key: 'settings.textLarge' },
];

const KEYS = {
  theme: 'warif.theme',
  motion: 'warif.motion',
  textsize: 'warif.textsize',
};

const DEFAULTS = { theme: 'auto', motion: 'auto', textsize: 'standard' };

const state = { ...DEFAULTS };
const listeners = new Set();

function read(key, allowed) {
  try {
    const v = localStorage.getItem(KEYS[key]);
    return allowed.includes(v) ? v : DEFAULTS[key];
  } catch {
    return DEFAULTS[key];
  }
}

function write(key, value) {
  try { localStorage.setItem(KEYS[key], value); } catch { /* private mode */ }
}

/**
 * The browser paints its own chrome — the address bar, the status bar on an
 * installed PWA — with theme-color, so it has to track the theme or the notch
 * ends up a different green from the page under it.
 */
function syncThemeColour() {
  const existing = document.getElementById('theme-colour');

  // In auto mode the two media-scoped metas in index.html are already correct,
  // and they follow the device without a repaint. An explicit theme has to beat
  // them, and a meta only wins by coming first in the document -- hence prepend.
  if (state.theme === 'auto') {
    existing?.remove();
    return;
  }

  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (!bg) return;
  const meta = existing ?? Object.assign(document.createElement('meta'), {
    id: 'theme-colour',
    name: 'theme-color',
  });
  meta.content = bg;
  if (!meta.isConnected) document.head.prepend(meta);
}

export function applyTheme(id) {
  if (!THEMES.some((t) => t.id === id)) return;
  state.theme = id;
  document.documentElement.dataset.theme = id;
  write('theme', id);
  syncThemeColour();
  emit();
}

export function applyMotion(id) {
  if (!MOTIONS.some((m) => m.id === id)) return;
  state.motion = id;
  document.documentElement.dataset.motion = id;
  write('motion', id);
  emit();
}

export function applyTextSize(id) {
  if (!TEXT_SIZES.some((s) => s.id === id)) return;
  state.textsize = id;
  document.documentElement.dataset.textsize = id;
  write('textsize', id);
  emit();
}

export function current() { return { ...state }; }

/** True when animation should be suppressed, for JS that cannot ask CSS. */
export function reducedMotion() {
  if (state.motion === 'off') return true;
  if (state.motion === 'on') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() { for (const fn of listeners) fn(current()); }

export function init() {
  state.theme = read('theme', THEMES.map((t) => t.id));
  state.motion = read('motion', MOTIONS.map((m) => m.id));
  state.textsize = read('textsize', TEXT_SIZES.map((s) => s.id));

  const root = document.documentElement;
  root.dataset.theme = state.theme;
  root.dataset.motion = state.motion;
  root.dataset.textsize = state.textsize;
  syncThemeColour();

  // In auto mode the device can change its mind under us — sunset, or a system
  // schedule — and the theme-color meta has to follow it.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (state.theme === 'auto') syncThemeColour();
  });
}
