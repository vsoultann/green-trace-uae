/**
 * The Warif icon set.
 *
 * One family, drawn to one spec: a 24-unit grid, 1.75 stroke, round caps and
 * joins, no fills except where a shape is genuinely solid. They are stroked
 * with `currentColor`, so they inherit the theme instead of carrying colours of
 * their own.
 *
 * Two family traits tie them to the mark: leaves are drawn with a visible
 * midrib, and anything that means "here, this point" is a diamond rather than a
 * dot — the same concentric-diamond motif that sits at the heart of the logo.
 *
 * Icons that point somewhere carry `dir: true`; the shell adds a class that
 * mirrors them in RTL. A leaf does not mirror. An arrow does.
 */

const P = {
  /* --------------------------------------------------------- navigation */
  scan: {
    // A viewfinder with the diamond node at its centre: the point the model looks at.
    d: '<path d="M3 8.5V5.5A2.5 2.5 0 0 1 5.5 3h3M15.5 3h3A2.5 2.5 0 0 1 21 5.5v3M21 15.5v3a2.5 2.5 0 0 1-2.5 2.5h-3M8.5 21h-3A2.5 2.5 0 0 1 3 18.5v-3"/><path d="M12 8.5 15.5 12 12 15.5 8.5 12Z"/>',
  },
  leaf: {
    d: '<path d="M12 21v-8"/><path d="M12 13c0-5.5 3.8-9.5 9-10 .4 6.2-3.2 10-9 10Z"/><path d="M12 13c0-4.2-2.8-7.2-6.8-7.6C4.9 10.1 7.6 13 12 13Z"/>',
  },
  trees: {
    d: '<path d="M12 21v-6"/><path d="M12 15c0-4.6 3.2-8 7.6-8.4.3 5.2-2.7 8.4-7.6 8.4Z"/><path d="M12 15c0-3.6-2.4-6.1-5.8-6.5C5.9 12.6 8.2 15 12 15Z"/><path d="M9.5 21h5"/>',
  },
  help: {
    // A hand offering support, reduced to a bowl and a rising stem.
    d: '<path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13v1.5A5.5 5.5 0 0 0 9.5 20H12"/><path d="M20 13v1.5"/><path d="M12 9.5 14 12l-2 2.5L10 12Z"/>',
  },
  project: {
    // An open workbook.
    d: '<path d="M12 6.5C10.4 5.2 8.4 4.5 6 4.5H3.5v14H6c2.4 0 4.4.7 6 2 1.6-1.3 3.6-2 6-2h2.5v-14H18c-2.4 0-4.4.7-6 2Z"/><path d="M12 6.5v14"/>',
  },
  team: {
    d: '<circle cx="9" cy="8" r="3.25"/><path d="M2.75 20a6.25 6.25 0 0 1 12.5 0"/><path d="M16.25 5.2a3.25 3.25 0 0 1 0 5.6"/><path d="M17.6 14.3A6.26 6.26 0 0 1 21.25 20"/>',
  },

  /* ------------------------------------------------------------ actions */
  camera: {
    d: '<path d="M3.5 8.5h3l1.6-2.4h6.8l1.6 2.4h3A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-8a1.5 1.5 0 0 1 .5-1.5Z"/><path d="M12 10.2 14.8 13 12 15.8 9.2 13Z"/>',
  },
  upload: {
    d: '<path d="M12 15.5V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M3.5 15v4a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-4"/>',
  },
  sample: {
    d: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M12 8 15.5 12 12 16 8.5 12Z"/><path d="M3.5 16.5h4M16.5 7.5h4"/>',
  },
  share: {
    d: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>',
  },
  call: {
    d: '<path d="M5.5 3.5h3l1.5 4-2 1.5a11.5 11.5 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2C9.6 18.5 5.5 14.4 5.5 5.5a2 2 0 0 1 0-2Z"/>',
  },
  directions: {
    dir: true,
    d: '<path d="M12 21s6.5-5.6 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z"/><path d="M12 7.5 14.5 10 12 12.5 9.5 10Z"/>',
  },
  location: {
    d: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>',
  },
  search: {
    d: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.1 4.1"/>',
  },
  close: {
    d: '<path d="m6 6 12 12M18 6 6 18"/>',
  },
  check: {
    d: '<path d="m4.5 12.5 5 5 10-11"/>',
  },
  chevron: {
    dir: true,
    d: '<path d="m9.5 5 7 7-7 7"/>',
  },
  back: {
    dir: true,
    d: '<path d="M20 12H4.5M11 5.5 4.5 12l6.5 6.5"/>',
  },
  settings: {
    // Sliders, not a cog: these are preferences, not machinery.
    d: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><path d="M15 4.5 17.5 7 15 9.5 12.5 7Z"/><path d="M9 14.5 11.5 17 9 19.5 6.5 17Z"/>',
  },
  language: {
    d: '<circle cx="12" cy="12" r="8.5"/><path d="M3.6 9.5h16.8M3.6 14.5h16.8"/><path d="M12 3.5c-2.4 2.3-3.6 5.1-3.6 8.5s1.2 6.2 3.6 8.5c2.4-2.3 3.6-5.1 3.6-8.5S14.4 5.8 12 3.5Z"/>',
  },
  print: {
    d: '<path d="M7 8.5V3.5h10v5"/><path d="M7 17H5a1.5 1.5 0 0 1-1.5-1.5V10A1.5 1.5 0 0 1 5 8.5h14A1.5 1.5 0 0 1 20.5 10v5.5A1.5 1.5 0 0 1 19 17h-2"/><path d="M7 13.5h10v7H7Z"/>',
  },
  download: {
    d: '<path d="M12 3.5v12"/><path d="m7.5 11 4.5 4.5L16.5 11"/><path d="M3.5 15v4a1.5 1.5 0 0 0 1.5 1.5h14a1.5 1.5 0 0 0 1.5-1.5v-4"/>',
  },
  play: { d: '<path d="M7.5 4.5 19 12 7.5 19.5Z"/>' },
  pause: { d: '<path d="M8.5 4.5v15M15.5 4.5v15"/>' },
  reset: {
    d: '<path d="M3.8 12a8.2 8.2 0 1 0 2.6-6"/><path d="M3.5 3v3.5H7"/>',
  },
  clock: {
    d: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.3 2"/>',
  },
  info: {
    d: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 6.6 13.2 7.8 12 9l-1.2-1.2Z"/>',
  },
  warning: {
    d: '<path d="M12 3.8 21.2 19.5H2.8Z"/><path d="M12 9.8v4.4"/><path d="M12 16 13 17l-1 1-1-1Z"/>',
  },
  diamond: { d: '<path d="M12 4 20 12 12 20 4 12Z"/>' },
  grid: {
    d: '<path d="M3.5 3.5h7v7h-7ZM13.5 3.5h7v7h-7ZM3.5 13.5h7v7h-7ZM13.5 13.5h7v7h-7Z"/>',
  },
  offline: {
    d: '<path d="M5 12.5a9.5 9.5 0 0 1 14 0"/><path d="M8.2 15.8a5.3 5.3 0 0 1 7.6 0"/><path d="M12 19.2 13 20.2 12 21.2 11 20.2Z"/><path d="m3.5 3.5 17 17"/>',
  },
  weave: {
    d: '<path d="M3.5 6h17M3.5 12h17M3.5 18h17"/><path d="M8 3.5v17M16 3.5v17"/>',
  },
};

/**
 * Renders one icon.
 *
 * `size` is either one of the two named steps or a number of pixels for the few
 * places — the scan diamond, the kiosk — that need a size the scale does not
 * have. An icon with a `title` is exposed as an image with that label; every
 * other icon is decoration beside a word and is hidden from assistive tech.
 *
 * @param {string} name  a key of the set above
 * @param {{size?:'sm'|'lg'|number, cls?:string, title?:string}} [opts]
 */
export function icon(name, opts = {}) {
  const spec = P[name];
  if (!spec) return '';
  const classes = ['ico'];
  if (opts.size === 'sm') classes.push('ico-sm');
  if (opts.size === 'lg') classes.push('ico-lg');
  if (spec.dir) classes.push('ico-dir');
  if (opts.cls) classes.push(opts.cls);

  const sized = typeof opts.size === 'number'
    ? ` style="width:${opts.size}px;height:${opts.size}px"`
    : '';

  const labelled = opts.title
    ? ` role="img" aria-label="${opts.title.replace(/"/g, '&quot;')}"`
    : ' aria-hidden="true"';

  return `<svg class="${classes.join(' ')}" viewBox="0 0 24 24"${sized}${labelled}>${spec.d}</svg>`;
}

export const iconNames = Object.keys(P);
