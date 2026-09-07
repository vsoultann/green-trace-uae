// Single source of truth for the Green-Trace UAE species.
// Keep this in sync with app/js/data/species.js (the browser copy).
//
// The order of this array IS the class order of the trained model. Changing it
// without retraining silently mislabels every prediction, so append rather than
// reorder, and let tools/train.mjs write the new metadata.
//
// `taxonId` is the iNaturalist taxon. Counts below are open-licensed,
// research-grade observations available at the time the class was added, which
// is what decides whether a species can be trained at all.
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

  /* ---- added 2026-09-07 ---- */

  {
    // The tree the country's coastline is measured by. Abu Dhabi's mangrove
    // forests are the reason this one belongs in any UAE tree app.
    key: 'qurm',
    taxonId: 75723,
    latin: 'Avicennia marina',
    en: 'Grey Mangrove',
    ar: 'القرم',
  },
  {
    // Native windbreak, planted along farm edges across the Emirates for
    // centuries and impossible to mistake once you know the scale-like foliage.
    key: 'athl',
    taxonId: 56017,
    latin: 'Tamarix aphylla',
    en: 'Athel Tamarisk',
    ar: 'الأثل',
  },
  {
    // The miswak tree. Cultural weight far beyond its size.
    key: 'arak',
    taxonId: 197082,
    latin: 'Salvadora persica',
    en: 'Arak (Toothbrush Tree)',
    ar: 'الأراك',
  },
  {
    // Not native, but planted along more UAE streets than almost anything else,
    // so it is the tree a visitor is most likely to be standing under.
    key: 'neem',
    taxonId: 319135,
    latin: 'Azadirachta indica',
    en: 'Neem',
    ar: 'النيم',
  },
  {
    // The desert shrub everyone has seen and few can name.
    key: 'osher',
    taxonId: 120917,
    latin: 'Calotropis procera',
    en: 'Apple of Sodom',
    ar: 'العشر',
  },
  {
    // Deliberately included as the hard case: an invasive mesquite that looks
    // enough like the native Ghaf to be mistaken for it in the field. Telling
    // the two apart is a live conservation problem in the UAE, and a classifier
    // that never has to try is a classifier that has dodged the question.
    key: 'mesquite',
    taxonId: 1493168,
    latin: 'Prosopis juliflora',
    en: 'Mesquite',
    ar: 'المسكيت',
  },
];

export const CLASS_KEYS = SPECIES.map((s) => s.key);
