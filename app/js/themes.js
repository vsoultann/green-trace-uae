/**
 * Theme registry and switching.
 *
 * `system` means "remove the attribute and let the prefers-color-scheme block
 * in themes.css decide".
 *
 * Names are proper nouns and are deliberately NOT translated — "Catppuccin" is
 * Catppuccin in every language, and localising it would only make the palette
 * harder to recognise for someone who already knows it. The one-line note is
 * translated, because that is description rather than identity.
 *
 * `swatch` is four real colours from the palette — page, accent, healthy, bad —
 * rather than a decorative gradient, so the picker previews what the theme will
 * actually do to a result screen.
 */
const KEY = 'gt.theme';

export const THEME_GROUPS = ['auto', 'emirati', 'light', 'dark', 'access'];

export const THEMES = [
  {
    id: 'system', group: 'auto', name: 'Match device', scheme: 'auto',
    swatch: ['#f7f2e7', '#9a6b16', '#101319', '#d9a441'],
    note: { en: 'Follows your system light/dark setting', ar: 'يتبع إعداد الفاتح والداكن في نظامك' },
  },

  /* ---- made for this project ---- */
  {
    id: 'desert-dawn', group: 'emirati', name: 'Desert Dawn', scheme: 'light',
    swatch: ['#f7f2e7', '#9a6b16', '#3f7233', '#a83a26'],
    note: { en: 'Warm sand and gold', ar: 'رملي وذهبي' },
  },
  {
    id: 'oasis', group: 'emirati', name: 'Oasis', scheme: 'light',
    swatch: ['#f2f7f0', '#206b41', '#206b41', '#a3352a'],
    note: { en: 'Fresh palm green', ar: 'أخضر النخيل' },
  },
  {
    id: 'night-falcon', group: 'emirati', name: 'Night Falcon', scheme: 'dark',
    swatch: ['#101319', '#d9a441', '#5fbb72', '#df6d59'],
    note: { en: 'Deep navy and gold', ar: 'كحلي وذهبي' },
  },
  {
    id: 'mangrove', group: 'emirati', name: 'Mangrove', scheme: 'dark',
    swatch: ['#0a1717', '#35b499', '#35b499', '#dd6d5c'],
    note: { en: 'Coastal teal', ar: 'أزرق ساحلي' },
  },

  /* ---- widely used light palettes ---- */
  {
    id: 'catppuccin-latte', group: 'light', name: 'Catppuccin Latte', scheme: 'light',
    swatch: ['#e6e9ef', '#8839ef', '#40a02b', '#d20f39'],
    note: { en: 'Soft pastels, easy on the eyes', ar: 'ألوان باستيل هادئة' },
  },
  {
    id: 'rose-pine-dawn', group: 'light', name: 'Rosé Pine Dawn', scheme: 'light',
    swatch: ['#faf4ed', '#907aa9', '#6d8f89', '#b4637a'],
    note: { en: 'Warm paper and iris', ar: 'ورقي دافئ وبنفسجي' },
  },
  {
    id: 'solarized-light', group: 'light', name: 'Solarized Light', scheme: 'light',
    swatch: ['#eee8d5', '#268bd2', '#859900', '#dc322f'],
    note: { en: 'The classic low-glare palette', ar: 'الكلاسيكي منخفض الوهج' },
  },
  {
    id: 'everforest-light', group: 'light', name: 'Everforest Light', scheme: 'light',
    swatch: ['#f8f5e4', '#8da101', '#8da101', '#f85552'],
    note: { en: 'Soft forest green', ar: 'أخضر غابات هادئ' },
  },

  /* ---- widely used dark palettes ---- */
  {
    id: 'catppuccin-mocha', group: 'dark', name: 'Catppuccin Mocha', scheme: 'dark',
    swatch: ['#181825', '#cba6f7', '#a6e3a1', '#f38ba8'],
    note: { en: 'Soft pastels on deep violet', ar: 'باستيل على بنفسجي عميق' },
  },
  {
    id: 'nord', group: 'dark', name: 'Nord', scheme: 'dark',
    swatch: ['#2e3440', '#88c0d0', '#a3be8c', '#bf616a'],
    note: { en: 'Cool arctic blues', ar: 'أزرق قطبي بارد' },
  },
  {
    id: 'tokyo-night', group: 'dark', name: 'Tokyo Night', scheme: 'dark',
    swatch: ['#1a1b26', '#7aa2f7', '#9ece6a', '#f7768e'],
    note: { en: 'City blue after midnight', ar: 'أزرق المدينة بعد منتصف الليل' },
  },
  {
    id: 'dracula', group: 'dark', name: 'Dracula', scheme: 'dark',
    swatch: ['#282a36', '#bd93f9', '#50fa7b', '#ff5555'],
    note: { en: 'High-saturation purple and green', ar: 'بنفسجي وأخضر زاهيان' },
  },
  {
    id: 'gruvbox-dark', group: 'dark', name: 'Gruvbox Dark', scheme: 'dark',
    swatch: ['#282828', '#fabd2f', '#b8bb26', '#fb4934'],
    note: { en: 'Retro warm, low blue light', ar: 'دافئ كلاسيكي، أزرق منخفض' },
  },
  {
    id: 'rose-pine-moon', group: 'dark', name: 'Rosé Pine Moon', scheme: 'dark',
    swatch: ['#232136', '#c4a7e7', '#95b1ac', '#eb6f92'],
    note: { en: 'Muted plum and iris', ar: 'خوخي وبنفسجي هادئ' },
  },
  {
    id: 'one-dark', group: 'dark', name: 'One Dark', scheme: 'dark',
    swatch: ['#282c34', '#61afef', '#98c379', '#e06c75'],
    note: { en: 'The familiar editor default', ar: 'الافتراضي المألوف للمحررات' },
  },

  /* ---- accessibility ---- */
  {
    id: 'contrast', group: 'access', name: 'High Contrast', scheme: 'dark',
    swatch: ['#000000', '#ffd400', '#4dff88', '#ff6b5a'],
    note: { en: 'Maximum legibility, no shadows', ar: 'أقصى وضوح، بلا ظلال' },
  },
];

const IDS = new Set(THEMES.map((t) => t.id));

export function currentTheme() {
  const stored = localStorage.getItem(KEY);
  return IDS.has(stored) ? stored : 'system';
}

export function themeById(id) {
  return THEMES.find((t) => t.id === id);
}

export function applyTheme(id) {
  const theme = IDS.has(id) ? id : 'system';
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
