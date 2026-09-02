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

const IMAGE_SIZE = 224;
const FEATURE_NODE = 'module_apply_default/MobilenetV2/Logits/AvgPool';

let base = null;
let head = null;
let metadata = null;
let loading = null;

/** Reuse one offscreen canvas for every resize instead of churning through them. */
const stage = document.createElement('canvas');
stage.width = IMAGE_SIZE;
stage.height = IMAGE_SIZE;
const stageCtx = stage.getContext('2d', { willReadFrequently: true });

export function getMetadata() {
  return metadata;
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

  const probs = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(toStage(source));
    const batch = pixels.toFloat().div(255).expandDims(0);
    const feats = base.execute(batch, FEATURE_NODE);
    return head.predict(feats.reshape([1, feats.size]));
  });

  const values = Array.from(await probs.data());
  probs.dispose();

  const ranked = values
    .map((p, i) => ({ key: metadata.classes[i], p }))
    .sort((a, b) => b.p - a.p);

  // Normalised entropy: 0 = the model is certain, 1 = it is guessing evenly.
  // More trustworthy than top-1 probability alone for spotting "not one of the
  // four species" -- which is exactly what a judge will try first.
  const eps = 1e-9;
  const entropy =
    -values.reduce((acc, p) => acc + p * Math.log(p + eps), 0) / Math.log(values.length);

  return { ranked, top: ranked[0], entropy };
}

/** True when the prediction is too uncertain to state plainly. */
export function isUncertain(result) {
  return result.top.p < 0.55 || result.entropy > 0.72;
}
