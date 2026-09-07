/**
 * "Where do I get this?" — geolocation, distance and map links.
 *
 * Two mechanisms, on purpose:
 *
 *   1. The **bundled directory** in data/suppliers.js. Real shops with real
 *      coordinates, sorted by how far they are from the user. Works with the
 *      network switched off, which is the whole point of this app, and gives
 *      phone numbers and opening hours the user can act on immediately.
 *
 *   2. A **Google Maps search link** per treatment. This is the escape hatch:
 *      Google knows about shops we have never heard of, and its hours and phone
 *      numbers are current in a way a bundled file can never be. It needs a
 *      connection, so it supplements the directory rather than replacing it.
 *
 * No API key is involved anywhere. A Places API key in a page served from
 * GitHub Pages is a public key attached to a billing account, and there is no
 * way to hide it — the maps deep link gets us the same information without
 * handing the internet somebody's credit card.
 */

const GEO_TIMEOUT = 10000;

/** Last known position, cached for the session so we ask the user only once. */
let fix = null;

export function knownPosition() { return fix; }

/**
 * Asks the browser for a location.
 *
 * Resolves to null rather than rejecting when the user says no — declining is a
 * normal answer, not an error, and the caller just falls back to showing every
 * shop unsorted.
 */
export function locate() {
  if (fix) return Promise.resolve(fix);
  if (!navigator.geolocation) return Promise.resolve(null);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fix = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        resolve(fix);
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT, maximumAge: 300000 },
    );
  });
}

/** Great-circle distance in kilometres. */
export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(km, lang) {
  if (km == null) return null;
  if (km < 1) return lang === 'ar' ? `${Math.round(km * 1000)} م` : `${Math.round(km * 1000)} m`;
  if (km < 10) return lang === 'ar' ? `${km.toFixed(1)} كم` : `${km.toFixed(1)} km`;
  return lang === 'ar' ? `${Math.round(km)} كم` : `${Math.round(km)} km`;
}

/**
 * Suppliers ordered by distance from the user.
 *
 * Entries without coordinates (or when we have no fix) keep their file order and
 * sort last — better than pretending to know where they are.
 *
 * @param {Array} suppliers
 * @param {string|null} category  'plants' | 'chemicals' | 'tools', or null for all
 * @param {{lat:number, lon:number}|null} from
 */
export function rankSuppliers(suppliers, category, from) {
  const matching = category
    ? suppliers.filter((s) => s.sells.includes(category))
    : [...suppliers];

  const withDistance = matching.map((s) => ({
    ...s,
    km: from && s.lat != null ? distanceKm(from, { lat: s.lat, lon: s.lon }) : null,
  }));

  withDistance.sort((a, b) => {
    if (a.km == null && b.km == null) return 0;
    if (a.km == null) return 1;
    if (b.km == null) return -1;
    return a.km - b.km;
  });

  return withDistance;
}

/* ------------------------------------------------------------- map links */

/**
 * A Google Maps search for `query` near the user.
 *
 * Google's documented cross-platform URL form. When we have a fix we pass it as
 * the map centre, which is what makes the results local; without one Google
 * falls back to the device's own idea of where it is.
 */
export function mapsSearchURL(query, from) {
  const base = 'https://www.google.com/maps/search/?api=1&query=';
  const q = encodeURIComponent(from ? `${query} near me` : `${query} UAE`);
  const centre = from ? `&center=${from.lat},${from.lon}` : '';
  return `${base}${q}${centre}`;
}

/** Directions to one supplier — by coordinates when we have them, else by name. */
export function directionsURL(supplier, lang = 'en') {
  const dest = supplier.lat != null
    ? `${supplier.lat},${supplier.lon}`
    : `${supplier.name.en} ${supplier.emirate.en} UAE`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

/** A tel: link, with the spaces the display form needs stripped out. */
export function telURL(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
