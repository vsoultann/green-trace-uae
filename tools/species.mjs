// Single source of truth for the four Green-Trace UAE species.
// Keep this in sync with app/js/data/species.js (the browser copy).
export const SPECIES = [
  {
    key: 'ghaf',
    taxonId: 131133,
    latin: 'Prosopis cineraria',
    en: 'Ghaf',
    ar: 'الغاف',
  },
  {
    key: 'sidr',
    taxonId: 322319,
    latin: 'Ziziphus spina-christi',
    en: 'Sidr',
    ar: 'السدر',
  },
  {
    key: 'nakhl',
    taxonId: 78555,
    latin: 'Phoenix dactylifera',
    en: 'Date Palm',
    ar: 'النخيل',
  },
  {
    key: 'samar',
    taxonId: 489563,
    latin: 'Vachellia tortilis',
    en: 'Samar',
    ar: 'السمر',
  },
];

export const CLASS_KEYS = SPECIES.map((s) => s.key);
