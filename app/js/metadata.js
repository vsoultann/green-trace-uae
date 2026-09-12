/**
 * The model card, available before the model is.
 *
 * Every count in the interface — "10 trees in the library, 4 recognised by the
 * current model", the "Reference only" badges, the per-tree accuracy — comes
 * from metadata.json. It used to be read through model.js, which meant it only
 * arrived after 14 MB of weights had downloaded, so the first render of a page
 * claimed all ten trees were recognised and then quietly corrected itself.
 *
 * That is v1's bug in a new costume: a page that overstates what the model can
 * do, even for two seconds, is a page that misleads whoever is reading it.
 *
 * metadata.json is about a kilobyte. It is fetched once at boot, the shell
 * awaits it before the first paint, and every view can then read it
 * synchronously and be right the first time.
 */

let metadata = null;
let inflight = null;

export function loadMetadata() {
  if (inflight) return inflight;
  inflight = fetch('./model/metadata.json')
    .then((res) => (res.ok ? res.json() : null))
    .then((json) => { metadata = json; return json; })
    .catch(() => null); // offline before the first visit: views fall back below
  return inflight;
}

export function metadataSync() { return metadata; }

/** The trees the deployed model was actually trained on. */
export function recognisedKeys() {
  return new Set(metadata?.classes ?? []);
}

/**
 * How many trees the library documents and how many the model recognises.
 *
 * When metadata is genuinely unavailable the recognised count is null rather
 * than a guess, and callers render "—". Never the library count: that is the
 * number that was wrong in v1.
 */
export function counts(libraryLength) {
  return { library: libraryLength, recognised: metadata ? metadata.classes.length : null };
}

/** Validation accuracy for one tree, or null when it was never trained on. */
export function accuracyFor(key) {
  return metadata?.perClassAccuracy?.[key] ?? null;
}
