/**
 * Species classifier front-end.
 *
 * Two models are loaded and chained:
 *   1. a frozen MobileNetV2 (ImageNet) that turns a 224x224 photo into a
 *      1280-dimension feature vector,
 *   2. a small dense head, trained by tools/train.mjs, that maps that vector
 *      onto the four Green-Trace species.
 *
 * Both are served from this repository, so once the service worker has cached
 * them the kiosk works with the network unplugged.
 */

const BASE_URL = new URL('./model/mobilenet/model.json', document.baseURI).href;
const HEAD_URL = new URL('./model/head/model.json', document.baseURI).href;
const META_URL = new URL('./model/metadata.json', document.baseURI).href;
const OOD_URL = new URL('./model/ood.json', document.baseURI).href;

const IMAGE_SIZE = 224;
const FEATURE_NODE = 'module_apply_default/MobilenetV2/Logits/AvgPool';

let base = null;
let head = null;
let metadata = null;
let ood = null;
let loading = null;

/** Reuse one offscreen canvas for every resize instead of churning through them. */
const stage = document.createElement('canvas');
stage.width = IMAGE_SIZE;
stage.height = IMAGE_SIZE;
const stageCtx = stage.getContext('2d', { willReadFrequently: true });

export function getMetadata() {
  return metadata;
}

export function getOOD() {
  return ood;
}

/**
 * Loads both models. Safe to call repeatedly; the work happens once.
 * @param {(fraction:number, label:string)=>void} [onProgress]
 */
export function loadModel(onProgress = () => {}) {
  if (loading) return loading;

  loading = (async () => {
    if (typeof tf === 'undefined') throw new Error('TensorFlow.js failed to load');

    // WebGL where available (phones included); CPU is the honest fallback.
    try {
      await tf.setBackend('webgl');
      await tf.ready();
    } catch {
      await tf.setBackend('cpu');
      await tf.ready();
    }

    onProgress(0.05, 'base');
    base = await tf.loadGraphModel(BASE_URL, {
      onProgress: (p) => onProgress(0.05 + p * 0.75, 'base'),
    });

    onProgress(0.82, 'head');
    head = await tf.loadLayersModel(HEAD_URL);

    onProgress(0.94, 'meta');
    metadata = await (await fetch(META_URL)).json();

    // The out-of-distribution reference is what lets the app say "I don't know".
    // It is optional: an older model directory simply has no ood.json, and the
    // app falls back to softmax confidence alone rather than refusing to start.
    try {
      const res = await fetch(OOD_URL);
      ood = res.ok ? await res.json() : null;
      if (ood && ood.classes.join() !== metadata.classes.join()) {
        console.warn('ood.json class order does not match metadata; ignoring it');
        ood = null;
      }
    } catch {
      ood = null;
    }

    // The head's output width has to match the class list it was trained with,
    // otherwise every label downstream would be silently off by one.
    const outUnits = head.outputs[0].shape.at(-1);
    if (outUnits !== metadata.classes.length) {
      throw new Error(`Model/metadata mismatch: head predicts ${outUnits} classes, metadata lists ${metadata.classes.length}`);
    }

    // One warm-up pass so the first real scan is not the one that pays for
    // shader compilation.
    tf.tidy(() => {
      const dummy = tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
      const f = base.execute(dummy, FEATURE_NODE);
      head.predict(f.reshape([1, f.size]));
    });

    onProgress(1, 'ready');
    return { base, head, metadata };
  })().catch((err) => {
    loading = null; // let the user retry
    throw err;
  });

  return loading;
}

/**
 * Draws any image source into the 224x224 stage, letterboxed on white so the
 * leaf keeps its aspect ratio (squashing a frond changes what the network sees).
 */
function toStage(source) {
  const sw = source.naturalWidth || source.videoWidth || source.width;
  const sh = source.naturalHeight || source.videoHeight || source.height;
  const scale = Math.min(IMAGE_SIZE / sw, IMAGE_SIZE / sh);
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  stageCtx.fillStyle = '#ffffff';
  stageCtx.fillRect(0, 0, IMAGE_SIZE, IMAGE_SIZE);
  stageCtx.drawImage(source, (IMAGE_SIZE - dw) / 2, (IMAGE_SIZE - dh) / 2, dw, dh);
  return stage;
}

/**
 * Classifies one image.
 * @returns {{ranked: Array<{key:string, p:number}>, top: object, entropy: number}}
 */
export async function classify(source) {
  if (!base || !head) throw new Error('Model not loaded');

  const [probs, featureVector] = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(toStage(source));
    const batch = pixels.toFloat().div(255).expandDims(0);
    const feats = base.execute(batch, FEATURE_NODE);
    const flat = feats.reshape([1, feats.size]);
    return [head.predict(flat), flat.flatten()];
  });

  const values = Array.from(await probs.data());
  const features = await featureVector.data();
  probs.dispose();
  featureVector.dispose();

  const ranked = values
    .map((p, i) => ({ key: metadata.classes[i], p }))
    .sort((a, b) => b.p - a.p);

  // Normalised entropy: 0 = the model is certain, 1 = it is guessing evenly.
  // More trustworthy than top-1 probability alone for spotting "not one of the
  // four species" -- which is exactly what a judge will try first.
  const eps = 1e-9;
  const entropy =
    -values.reduce((acc, p) => acc + p * Math.log(p + eps), 0) / Math.log(values.length);

  return { ranked, top: ranked[0], entropy, similarity: nearestSimilarity(features) };
}

/**
 * Cosine similarity between this photo and the closest class centroid.
 *
 * Returns null when no reference was loaded, which callers read as "no opinion"
 * rather than as "unfamiliar".
 */
function nearestSimilarity(features) {
  if (!ood) return null;

  let norm = 0;
  for (let i = 0; i < features.length; i++) norm += features[i] * features[i];
  norm = Math.sqrt(norm) || 1;

  let best = -1;
  for (const centroid of ood.centroids) {
    let dot = 0;
    for (let i = 0; i < centroid.length; i++) dot += (features[i] / norm) * centroid[i];
    if (dot > best) best = dot;
  }
  return best;
}

/** True when the prediction is too uncertain to state plainly. */
export function isUncertain(result) {
  return result.top.p < 0.55 || result.entropy > 0.72;
}

/**
 * How the result should be presented, in three honest steps.
 *
 *   'confident'  name the species
 *   'uncertain'  name it, but say the confidence is low
 *   'unknown'    do not name it at all
 *
 * The 'unknown' verdict is the one that matters. A judge's first instinct is to
 * point the camera at something that is not a UAE tree -- a houseplant, a hand,
 * a printed logo -- and an app that answers "Ghaf, 61%" to a photograph of a
 * shoe has failed in the most visible way available to it.
 *
 * Three independent signals have to agree that the input is a leaf of one of the
 * four species. `similarity` is the strongest of them because it does not go
 * through the softmax at all, but it is only available when ood.json loaded, so
 * the other two still stand on their own.
 *
 * @param {object} prediction  from classify()
 * @param {number} [leafConfidence]  0..1 from health.js: does this even look
 *   like foliage? Passing it lets the app reject a photo that contains no plant
 *   tissue before the classifier's opinion is even considered.
 */
export function recognitionState(prediction, leafConfidence = null) {
  const reasons = [];

  if (leafConfidence != null && leafConfidence < 0.25) reasons.push('noFoliage');
  if (ood && prediction.similarity != null && prediction.similarity < ood.threshold) {
    reasons.push('unfamiliar');
  }
  if (prediction.top.p < 0.40) reasons.push('lowProbability');
  if (prediction.entropy > 0.85) reasons.push('spreadEvenly');

  // One weak signal is noise; a genuine ghaf photographed badly can trip any
  // single test. Two independent ones agreeing is a real refusal. A total
  // absence of foliage is decisive on its own -- there is nothing to identify.
  if (reasons.includes('noFoliage') || reasons.length >= 2) {
    return { state: 'unknown', reasons, similarity: prediction.similarity };
  }
  if (reasons.length === 1 || isUncertain(prediction)) {
    return { state: 'uncertain', reasons, similarity: prediction.similarity };
  }
  return { state: 'confident', reasons, similarity: prediction.similarity };
}
