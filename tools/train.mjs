/**
 * Trains the Green-Trace UAE species classifier.
 *
 * Transfer learning: the vendored MobileNetV2 stays frozen and supplies a
 * 1280-d feature vector per image; only a small dense head is trained. That
 * head is a few hundred kilobytes, trains in a couple of minutes on CPU, and
 * is the only thing that has to be retrained when the team adds field photos.
 *
 * Images are read from, in order of preference:
 *   dataset/custom/<class>/        team's own kiosk photographs (weighted x3)
 *   dataset/inaturalist/<class>/   openly-licensed reference photographs
 *
 *   node tools/train.mjs [--epochs 60] [--no-cache]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { SPECIES, CLASS_KEYS } from './species.mjs';
import { initBackend, loadBase, decode, embedBatch, FEATURE_DIM, tf } from './embed.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, 'dataset', 'cache');
const OUT = path.join(ROOT, 'app', 'model');

const argv = process.argv.slice(2);
const EPOCHS = Number(argv[argv.indexOf('--epochs') + 1]) || 60;
const USE_CACHE = !argv.includes('--no-cache');
const VAL_FRACTION = 0.15;
const CUSTOM_REPEATS = 3; // the team's own photos count for more than reference shots

/** Augmentation recipes applied to every training image (val gets none). */
const AUGS = [
  null,
  { flip: true },
  { crop: 0.82, dx: 0.5, dy: 0.5 },
  { crop: 0.78, dx: 0.2, dy: 0.8, flip: true },
  { brightness: 1.18, saturation: 0.85 },
  { brightness: 0.84, saturation: 1.15, flip: true },
  { rotate: 12 },
  { rotate: -12, crop: 0.88 },
];

/* deterministic shuffle so reruns are comparable */
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function listDir(dir) {
  try {
    return (await fs.readdir(dir))
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => path.join(dir, f));
  } catch { return []; }
}

/* ---------- 1. gather files ---------- */

console.log('Green-Trace UAE — training the species head\n');

const perClass = [];
for (const sp of SPECIES) {
  const custom = await listDir(path.join(ROOT, 'dataset', 'custom', sp.key));
  const inat = await listDir(path.join(ROOT, 'dataset', 'inaturalist', sp.key));
  const files = [
    ...custom.flatMap((f) => Array(CUSTOM_REPEATS).fill(f)),
    ...inat,
  ];
  if (!files.length) {
    console.error(`No images for "${sp.key}". Run: npm run fetch`);
    process.exit(1);
  }
  perClass.push({ sp, files, custom: custom.length, inat: inat.length });
  console.log(`  ${sp.en.padEnd(10)} ${String(inat.length).padStart(4)} reference` +
    (custom.length ? ` + ${custom.length} team photos (x${CUSTOM_REPEATS})` : ''));
}

/* ---------- 2. split ---------- */

const rand = mulberry32(20260902);
const train = [];
const val = [];
for (let c = 0; c < perClass.length; c++) {
  const files = shuffle([...new Set(perClass[c].files)], rand);
  const nVal = Math.max(4, Math.round(files.length * VAL_FRACTION));
  const valFiles = files.slice(0, nVal);
  const trainFiles = perClass[c].files.filter((f) => !valFiles.includes(f));
  for (const f of valFiles) val.push({ file: f, label: c, aug: null });
  for (const f of trainFiles) for (const aug of AUGS) train.push({ file: f, label: c, aug });
}
shuffle(train, rand);
console.log(`\n  ${train.length} training samples (after ${AUGS.length}x augmentation), ${val.length} validation\n`);

/* ---------- 3. embed ---------- */

await initBackend();
console.log('  Loading frozen MobileNetV2 base...');
const base = await loadBase();

async function embedAll(items, label) {
  const key = `${label}-${items.length}`;
  const cacheFile = path.join(CACHE, `${key}.bin`);
  if (USE_CACHE) {
    try {
      const buf = await fs.readFile(cacheFile);
      console.log(`  ${label}: reusing cached embeddings`);
      return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    } catch { /* no cache yet */ }
  }

  const out = new Float32Array(items.length * FEATURE_DIM);
  const BATCH = 16;
  const t0 = Date.now();
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const raws = [];
    for (const it of slice) {
      try { raws.push(await decode(it.file, it.aug)); }
      catch { raws.push(new Uint8Array(224 * 224 * 3)); }
    }
    const feats = embedBatch(base, raws);
    out.set(await feats.data(), i * FEATURE_DIM);
    feats.dispose();
    if (i % (BATCH * 10) === 0 || i + BATCH >= items.length) {
      const done = Math.min(i + BATCH, items.length);
      const rate = done / ((Date.now() - t0) / 1000);
      const eta = Math.round((items.length - done) / rate);
      process.stdout.write(`\r  ${label}: ${done}/${items.length}  (${rate.toFixed(1)}/s, eta ${eta}s)   `);
    }
  }
  process.stdout.write('\n');
  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(cacheFile, Buffer.from(out.buffer));
  return out;
}

const xTrainData = await embedAll(train, 'train');
const xValData = await embedAll(val, 'val');
base.dispose();

const xTrain = tf.tensor2d(xTrainData, [train.length, FEATURE_DIM]);
const yTrain = tf.oneHot(tf.tensor1d(train.map((t) => t.label), 'int32'), CLASS_KEYS.length);
const xVal = tf.tensor2d(xValData, [val.length, FEATURE_DIM]);
const yVal = tf.oneHot(tf.tensor1d(val.map((t) => t.label), 'int32'), CLASS_KEYS.length);

/* ---------- 4. train the head ---------- */

const head = tf.sequential({
  layers: [
    tf.layers.dense({
      inputShape: [FEATURE_DIM], units: 192, activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 1e-4 }),
    }),
    tf.layers.dropout({ rate: 0.35 }),
    tf.layers.dense({ units: 96, activation: 'relu' }),
    tf.layers.dropout({ rate: 0.2 }),
    tf.layers.dense({ units: CLASS_KEYS.length, activation: 'softmax' }),
  ],
});
head.compile({ optimizer: tf.train.adam(8e-4), loss: 'categoricalCrossentropy', metrics: ['accuracy'] });

console.log('\n  Training head...');
let best = { acc: 0, weights: null, epoch: 0 };

await head.fit(xTrain, yTrain, {
  epochs: EPOCHS,
  batchSize: 64,
  validationData: [xVal, yVal],
  shuffle: true,
  verbose: 0,
  callbacks: {
    onEpochEnd: (epoch, logs) => {
      if (logs.val_acc > best.acc) {
        best = {
          acc: logs.val_acc,
          epoch: epoch + 1,
          weights: head.getWeights().map((w) => w.clone()),
        };
      }
      if ((epoch + 1) % 5 === 0 || epoch === 0) {
        console.log(
          `    epoch ${String(epoch + 1).padStart(3)}  loss ${logs.loss.toFixed(4)}` +
          `  acc ${(logs.acc * 100).toFixed(1)}%  val_acc ${(logs.val_acc * 100).toFixed(1)}%`
        );
      }
    },
  },
});

// Roll back to the best epoch rather than shipping whatever the last one gave.
if (best.weights) {
  head.setWeights(best.weights);
  best.weights.forEach((w) => w.dispose());
}
console.log(`\n  Best validation accuracy: ${(best.acc * 100).toFixed(1)}% (epoch ${best.epoch})`);

/* ---------- 5. confusion matrix ---------- */

const predT = head.predict(xVal);
const preds = Array.from(await predT.argMax(-1).data());
predT.dispose();

const K = CLASS_KEYS.length;
const cm = Array.from({ length: K }, () => new Array(K).fill(0));
val.forEach((v, i) => { cm[v.label][preds[i]]++; });

console.log('\n  Confusion matrix (rows = truth, cols = predicted)');
console.log('              ' + SPECIES.map((s) => s.en.slice(0, 8).padStart(9)).join(''));
const perClassAcc = {};
SPECIES.forEach((s, i) => {
  const total = cm[i].reduce((a, b) => a + b, 0);
  perClassAcc[s.key] = total ? cm[i][i] / total : 0;
  console.log(
    '  ' + s.en.padEnd(11) + cm[i].map((n) => String(n).padStart(9)).join('') +
    `   ${(perClassAcc[s.key] * 100).toFixed(0)}%`
  );
});

/* ---------- 6. save ---------- */

await fs.mkdir(path.join(OUT, 'head'), { recursive: true });
const saved = await head.save(tf.io.withSaveHandler(async (artifacts) => {
  await fs.writeFile(path.join(OUT, 'head', 'weights.bin'), Buffer.from(artifacts.weightData));
  await fs.writeFile(path.join(OUT, 'head', 'model.json'), JSON.stringify({
    format: 'layers-model',
    generatedBy: 'green-trace-uae/tools/train.mjs',
    convertedBy: null,
    modelTopology: artifacts.modelTopology,
    weightsManifest: [{ paths: ['weights.bin'], weights: artifacts.weightSpecs }],
  }));
  return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
}));
void saved;

await fs.writeFile(path.join(OUT, 'metadata.json'), JSON.stringify({
  name: 'Green-Trace UAE species classifier',
  trainedAt: new Date().toISOString(),
  architecture: 'MobileNetV2 (frozen, ImageNet) + 192-96-4 dense head',
  inputSize: 224,
  featureNode: 'module_apply_default/MobilenetV2/Logits/AvgPool',
  classes: CLASS_KEYS,
  classNames: Object.fromEntries(SPECIES.map((s) => [s.key, s.en])),
  validationAccuracy: Number(best.acc.toFixed(4)),
  perClassAccuracy: Object.fromEntries(
    Object.entries(perClassAcc).map(([k, v]) => [k, Number(v.toFixed(4))])
  ),
  confusionMatrix: cm,
  trainingSamples: train.length,
  validationSamples: val.length,
  sourceCounts: Object.fromEntries(perClass.map((p) => [p.sp.key, { reference: p.inat, team: p.custom }])),
}, null, 2));

console.log(`\n  Saved head to app/model/head/ and metadata to app/model/metadata.json`);
[xTrain, yTrain, xVal, yVal].forEach((t) => t.dispose());
