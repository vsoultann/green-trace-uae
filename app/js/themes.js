/**
 * Theme switching. `system` means "remove the attribute and let the
 * prefers-color-scheme block in app.css decide".
 */
const KEY = 'gt.theme';

export const THEMES = [
  { id: 'system',       swatch: 'linear-gradient(135deg, #fbf6ec 50%, #12151c 50%)' },
  { id: 'desert-dawn',  swatch: 'linear-gradient(135deg, #f7e2b8, #b8791f)' },
  { id: 'oasis',        swatch: 'linear-gradient(135deg, #cfe9d2, #2f7d4f)' },
  { id: 'night-falcon', swatch: 'linear-gradient(135deg, #232a3a, #e0a94a)' },
  { id: 'mangrove',     swatch: 'linear-gradient(135deg, #1a3b38, #3fbfa3)' },
  { id: 'contrast',     swatch: 'linear-gradient(135deg, #000000 50%, #ffd400 50%)' },
];

export function currentTheme() {
  return localStorage.getItem(KEY) || 'system';
}

export function applyTheme(id) {
  const theme = THEMES.some((t) => t.id === id) ? id : 'system';
  localStorage.setItem(KEY, theme);
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  syncBrowserChrome();
  window.dispatchEvent(new CustomEvent('gt:theme', { detail: theme }));
}

/** Keeps the mobile browser's address bar the same colour as the app. */
function syncBrowserChrome() {
  const bg = getComputedStyle(document.body).backgroundColor;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = bg;
}

export function initTheme() {
  applyTheme(currentTheme());
  // When following the system, react to the OS flipping to dark mode live.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentTheme() === 'system') syncBrowserChrome();
  });
}
