/**
 * Inline SVG marks.
 *
 * The species used to be represented by emoji — 🌴 for the date palm and a
 * generic 🌿 for everything else. Emoji are drawn by the operating system, so
 * the app looked different on every phone, three of the four species shared one
 * glyph, and none of them looked like the actual plant. These are drawn once,
 * inherit `currentColor`, and are distinguishable at 24px, which is the size
 * they are actually used at.
 *
 * All of them use a 24x24 viewBox and stroke-based construction so they sit
 * happily next to the interface icons.
 */

export const SPECIES_ICON = {
  /** Ghaf: fine bipinnate leaflets on a drooping compound frond. */
  ghaf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" aria-hidden="true">
    <path d="M12 21V9"/>
    <path d="M12 9C12 9 8.5 6.5 5 7c-.6 3.2 2.4 5.6 7 4.4"/>
    <path d="M12 11.4c0 0 3.2-3.4 7-3.1.2 3.6-3.1 5.6-7 4.6"/>
    <path d="M12 14.4c0 0-2.8-2-5.7-1.4-.3 2.7 2.2 4.3 5.7 3.3"/>
    <path d="M12 16.6c0 0 2.7-2.4 5.7-1.9.2 2.8-2.4 4.3-5.7 3.2"/>
  </svg>`,

  /** Sidr: a single ovate blade with the three arching veins it is known for. */
  sidr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 21c-4.4-2.6-6.6-6.4-6.6-10.2C5.4 6.6 8.3 3.4 12 2c3.7 1.4 6.6 4.6 6.6 8.8 0 3.8-2.2 7.6-6.6 10.2Z"/>
    <path d="M12 4.2v15.2"/>
    <path d="M12 9.4c-1.7-.9-3-2.2-3.7-3.6M12 9.4c1.7-.9 3-2.2 3.7-3.6"/>
    <path d="M12 14.4c-1.8-.8-3.2-2-4.1-3.4M12 14.4c1.8-.8 3.2-2 4.1-3.4"/>
  </svg>`,

  /** Date palm: the crown of pinnate fronds and the ringed trunk. */
  nakhl: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" aria-hidden="true">
    <path d="M12 22V9"/>
    <path d="M10.6 12.6h2.8M10.6 16h2.8M10.6 19.3h2.8"/>
    <path d="M12 9C9.9 5.4 6.4 4.3 3.2 5.7"/>
    <path d="M12 9c2.1-3.6 5.6-4.7 8.8-3.3"/>
    <path d="M12 9C11.3 5 8.9 2.6 5.6 2.3"/>
    <path d="M12 9c.7-4 3.1-6.4 6.4-6.7"/>
  </svg>`,

  /** Samar: the flat-topped umbrella crown and paired thorns. */
  samar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2.6 9.4c2.6-2.2 5.9-3.4 9.4-3.4s6.8 1.2 9.4 3.4"/>
    <path d="M4.6 12.1c2.2-1.4 4.7-2.1 7.4-2.1s5.2.7 7.4 2.1"/>
    <path d="M12 21v-8.9"/>
    <path d="M12 15.4 9.1 13M12 17.9l2.9-2.4"/>
  </svg>`,
};

/** Fallback for a key that has no drawing yet, so the UI never renders blank. */
export const GENERIC_LEAF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M11 21V11"/>
  <path d="M11 13C11 7 15 3 21 3c0 7-4 10-10 10Z"/>
  <path d="M10 16c0-4-2.6-6.6-6.5-7 0 4 2.2 7 6.5 7Z"/>
</svg>`;

export function speciesIcon(key) {
  return SPECIES_ICON[key] || GENERIC_LEAF;
}

/* ------------------------------------------------------------ interface */

export const UI_ICON = {
  phone: `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6.3 3.5h3l1.5 3.7-1.9 1.1a12 12 0 0 0 5.3 5.3l1.1-1.9 3.7 1.5v3a1.7 1.7 0 0 1-1.9 1.7A15.6 15.6 0 0 1 4.6 5.4 1.7 1.7 0 0 1 6.3 3.5Z"/>
  </svg>`,

  pin: `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/>
    <circle cx="12" cy="10" r="2.6"/>
  </svg>`,

  search: `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
      stroke-linecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>
  </svg>`,

  globe: `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
      stroke-linecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15 0 18M12 3c-2.5 2.6-2.5 15 0 18"/>
  </svg>`,

  clock: `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
      stroke-linecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M12 7.2V12l3.2 2"/>
  </svg>`,
};
