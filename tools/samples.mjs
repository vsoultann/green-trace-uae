/**
 * Builds app/samples/ — the six demonstration leaves.
 *
 *   node tools/samples.mjs                 build and verify the pinned samples
 *   node tools/samples.mjs --shortlist ghaf  contact sheet to pick new ones from
 *
 * The kiosk cannot depend on a camera. A school hall has bad light, a borrowed
 * laptop has a camera the browser will not release, and a judge will ask to see
 * it work before anyone has time to debug. So six leaves ship with the app and
 * "Try a sample leaf" always works.
 *
 * ## How these six were chosen
 *
 * Only CC-BY and CC0 photographs are eligible. The training set is mostly
 * CC-BY-NC, which is fine for training a model that never redistributes an image
 * and not fine for shipping the photograph itself inside a published app.
 *
 * Within that set the candidates were ranked by the app's own leaf check — is
 * there a leaf here, and does it fill the frame — and then chosen by eye from
 * the contact sheet `--shortlist` prints. Two rounds of picking purely by score
 * shipped a whole Ghaf at thirty metres and a photograph of a bicycle, because
 * "lots of green, filling the frame" is also a description of a hedge.
 *
 * Each pinned photograph is then verified on every build: the deployed model has
 * to identify it correctly, and the health analyser has to put it in the band it
 * was picked for. A sample the model misreads is not a demonstration, it is a
 * trap set for your own presentation.
 *
 * ## Why two of them are unhealthy
 *
 * A demonstration where every sample returns "Healthy, 92" never reaches the
 * half of the app that does the real work — the findings, the treatment advice,
 * and the red palm weevil warning on a damaged date palm. So those paths get a
 * sample each, and `needs` below is what guarantees they still fire.
 *
 * ## What is deliberately not here
 *
 * An earlier version shipped a Mangrove leaf as an "unknown" demonstration, on
 * the assumption that a tree the model had never seen would be refused. It is
 * not. Measured over the reference set, the out-of-distribution check rejects
 * 0 of 40 Mesquite and 2 of 40 Mangrove photographs: it reliably refuses images
 * with no plant tissue in them, which is what it was built for, and it does not
 * reliably refuse another tree's leaf. That is stated on the How page as a
 * limitation rather than hidden behind a sample that happened to work.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { analysePixels } from '../app/js/health.js';
import { initBackend, loadBase, IMAGE_SIZE, FEATURE_NODE, FEATURE_DIM, tf } from './embed.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'dataset', 'inaturalist');
const MODEL = path.join(ROOT, 'app', 'model');
const OUT = path.join(ROOT, 'app', 'samples');

/**
 * The pinned six. `photo` is the iNaturalist photo id, which is also the file
 * name in dataset/inaturalist/<key>/ and the key into CREDITS.json.
 *
 * `want` is the health band the sample demonstrates; `needs` names finding keys
 * of which at least one must fire.
 */
const SAMPLES = [
  { file: 'ghaf.jpg', key: 'ghaf', photo: 42829025, want: 'healthy' },
  { file: 'sidr.jpg', key: 'sidr', photo: 214021845, want: 'healthy' },
  { file: 'nakhl.jpg', key: 'nakhl', photo: 481624509, want: 'healthy' },
  { file: 'samar.jpg', key: 'samar', photo: 75857048, want: 'healthy' },
  { file: 'ghaf-stressed.jpg', key: 'ghaf', photo: 42829675, want: 'stressed', needs: ['necrosisHigh', 'necrosisSome'] },
  { file: 'nakhl-stressed.jpg', key: 'nakhl', photo: 482651528, want: 'stressed', needs: ['necrosisHigh', 'necrosisSome', 'texture'] },
];

const OPEN = new Set(['cc-by', 'cc0']);
const MIN_CONFIDENCE = 0.6;
const HEALTHY_AT = 70;   // the app calls 70+ "mostly healthy" or better
const STRESSED_AT = 58;  // and below this it has something to say about it
const WORK = 384;        // health.js's analysis resolution, long edge
const SHIP = 900;        // long edge of the file that ships

const credits = JSON.parse(await fs.readFile(path.join(SRC, 'CREDITS.json'), 'utf8'));

/* ------------------------------------------------------------------ image */

/** The stored URL is iNaturalist's "medium" (256px); "large" is 1024px. */
async function fetchLarge(url) {
  if (!url) return null;
  try {
    const res = await fetch(url.replace('/medium.', '/large.'), { signal: AbortSignal.timeout(20_000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null; // offline, or the photo was withdrawn: the local crop still works
  }
}

/**
 * The browser's preprocessing, reproduced exactly.
 *
 * model.js letterboxes onto white rather than cropping to fill, so a frond keeps
 * its proportions. Scoring a candidate any other way would be scoring a picture
 * the app will never see.
 */
async function asModelSees(buffer) {
  const { data } = await sharp({
    create: { width: IMAGE_SIZE, height: IMAGE_SIZE, channels: 3, background: '#ffffff' },
  })
    .composite([{
      input: await sharp(buffer).rotate().resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'inside' }).toBuffer(),
      gravity: 'center',
    }])
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return new Uint8Array(data);
}

/** Runs health.js over a file exactly as analyseLeaf() would in the browser. */
async function analyseAsApp(buffer) {
  const meta = await sharp(buffer).metadata();
  const scale = WORK / Math.max(meta.width, meta.height);
  const w = Math.max(1, Math.round(meta.width * scale));
  const h = Math.max(1, Math.round(meta.height * scale));
  const { data } = await sharp(buffer).resize(w, h, { fit: 'fill' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return analysePixels(data, w, h);
}

/* ----------------------------------------------------------- shortlist mode */

const shortlistFor = process.argv.includes('--shortlist')
  ? process.argv[process.argv.indexOf('--shortlist') + 1]
  : null;

if (shortlistFor) {
  const pool = credits.classes[shortlistFor]?.credits.filter((c) => OPEN.has(c.licence)).slice(0, 120);
  if (!pool) { console.error(`Unknown tree "${shortlistFor}"`); process.exit(1); }

  const scored = [];
  for (const c of pool) {
    try {
      const raw = await sharp(path.join(SRC, shortlistFor, `${c.id}.jpg`))
        .resize(256, 256, { fit: 'cover' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const v = analysePixels(raw.data, raw.info.width, raw.info.height);
      if (!v.valid || v.coverage < 0.3) continue;
      scored.push({
        id: c.id,
        rank: v.leafConfidence * 0.6 + Math.min(1, v.coverage / 0.6) * 0.4,
        health: v.score, band: v.band, findings: v.findings.map((f) => f.key),
      });
    } catch { /* a credited id the fetch tool never managed to download */ }
  }
  scored.sort((a, b) => b.rank - a.rank);
  const top = scored.slice(0, 24);

  const tiles = await Promise.all(top.map(async (t) => {
    const img = await sharp(path.join(SRC, shortlistFor, `${t.id}.jpg`)).resize(200, 200, { fit: 'cover' }).toBuffer();
    const caption = Buffer.from(`<svg width="200" height="26"><rect width="200" height="26" fill="#14231C" opacity="0.8"/>`
      + `<text x="5" y="18" fill="#F6F3EA" font-size="13" font-family="monospace">${t.id} · ${t.health}</text></svg>`);
    return sharp(img).composite([{ input: caption, top: 174, left: 0 }]).toBuffer();
  }));

  const sheet = path.join(ROOT, 'docs', `shortlist-${shortlistFor}.png`);
  await fs.mkdir(path.dirname(sheet), { recursive: true });
  await sharp({ create: { width: 1200, height: Math.ceil(top.length / 6) * 200, channels: 3, background: '#F6F3EA' } })
    .composite(tiles.map((b, i) => ({ input: b, left: (i % 6) * 200, top: Math.floor(i / 6) * 200 })))
    .png().toFile(sheet);

  console.log(`\n${shortlistFor}: ${top.length} openly-licensed candidates, best first\n`);
  for (const t of top) console.log(`  ${String(t.id).padStart(10)}  health ${String(t.health).padStart(3)} ${t.band.padEnd(9)} ${t.findings.join(', ')}`);
  console.log(`\nContact sheet: ${path.relative(ROOT, sheet)}`);
  console.log('Pick an id, put it in SAMPLES at the top of this file, and re-run without --shortlist.');
  process.exit(0);
}

/* ------------------------------------------------------------------ build */

const metadata = JSON.parse(await fs.readFile(path.join(MODEL, 'metadata.json'), 'utf8'));
const ood = JSON.parse(await fs.readFile(path.join(MODEL, 'ood.json'), 'utf8'));

await initBackend();
const base = await loadBase();
const head = await tf.loadLayersModel({
  load: async () => {
    const json = JSON.parse(await fs.readFile(path.join(MODEL, 'head', 'model.json'), 'utf8'));
    const bin = await fs.readFile(path.join(MODEL, 'head', 'weights.bin'));
    return {
      modelTopology: json.modelTopology,
      weightSpecs: json.weightsManifest.flatMap((g) => g.weights),
      weightData: new Uint8Array(bin).buffer,
      format: json.format,
    };
  },
});

function classify(raw) {
  const [probs, feats] = tf.tidy(() => {
    const batch = tf.tensor3d(raw, [IMAGE_SIZE, IMAGE_SIZE, 3], 'float32').div(255).expandDims(0);
    const f = base.execute(batch, FEATURE_NODE).reshape([1, FEATURE_DIM]);
    return [head.predict(f), f.flatten()];
  });
  const values = Array.from(probs.dataSync());
  const features = feats.dataSync();
  probs.dispose(); feats.dispose();

  const ranked = values.map((p, i) => ({ key: metadata.classes[i], p })).sort((a, b) => b.p - a.p);

  let norm = 0;
  for (let i = 0; i < features.length; i++) norm += features[i] * features[i];
  norm = Math.sqrt(norm) || 1;
  let similarity = -1;
  for (const centroid of ood.centroids) {
    let dot = 0;
    for (let i = 0; i < centroid.length; i++) dot += (features[i] / norm) * centroid[i];
    if (dot > similarity) similarity = dot;
  }
  return { top: ranked[0], similarity };
}

await fs.mkdir(OUT, { recursive: true });
const rows = [];
const problems = [];

for (const want of SAMPLES) {
  const credit = credits.classes[want.key].credits.find((c) => c.id === want.photo);
  if (!credit) { problems.push(`${want.file}: photo ${want.photo} is not in CREDITS.json`); continue; }
  if (!OPEN.has(credit.licence)) { problems.push(`${want.file}: ${credit.licence} may not be redistributed`); continue; }

  const large = await fetchLarge(credit.url);
  const source = large ?? await fs.readFile(path.join(SRC, want.key, `${want.photo}.jpg`));
  const shipped = await sharp(source).rotate()
    .resize(SHIP, SHIP, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true }).toBuffer();

  const verdict = classify(await asModelSees(shipped));
  const health = await analyseAsApp(shipped);

  /* Every check is reported rather than thrown, so one stale pin does not hide
     the state of the other five. */
  const fails = [];
  if (verdict.top.key !== want.key) fails.push(`identified as ${verdict.top.key}, not ${want.key}`);
  else if (verdict.top.p < MIN_CONFIDENCE) fails.push(`confidence ${(verdict.top.p * 100).toFixed(0)}% is below ${MIN_CONFIDENCE * 100}%`);
  if (verdict.similarity < ood.threshold) fails.push(`rejected as unfamiliar (${verdict.similarity.toFixed(2)})`);
  if (!health.valid) fails.push('no leaf could be segmented');
  else if (want.want === 'healthy' && health.score < HEALTHY_AT) fails.push(`health ${health.score} is below ${HEALTHY_AT}`);
  else if (want.want === 'stressed' && health.score > STRESSED_AT) fails.push(`health ${health.score} is above ${STRESSED_AT}`);
  if (want.needs && !health.findings.some((f) => want.needs.includes(f.key))) {
    fails.push(`none of ${want.needs.join('/')} fired`);
  }

  if (fails.length) { problems.push(`${want.file}: ${fails.join('; ')}`); continue; }

  await fs.writeFile(path.join(OUT, want.file), shipped);
  // CC0 photographs carry "no rights reserved" and no name at all. Writing
  // "unknown" beside one would imply we failed to find the author rather than
  // that they chose not to be named.
  const author = /\(c\) ([^,]+)/.exec(credit.attribution)?.[1]
    ?? (credit.licence === 'cc0' ? 'Dedicated to the public domain' : 'Photographer not named');

  rows.push({
    file: want.file,
    key: want.key,
    latin: credits.classes[want.key].latin,
    photo: want.photo,
    author,
    licence: credit.licence,
    observation: credit.observation,
    want: want.want,
    confidence: Number(verdict.top.p.toFixed(3)),
    similarity: Number(verdict.similarity.toFixed(3)),
    health: health.score,
    band: health.band,
    findings: health.findings.map((f) => f.key),
  });

  console.log(
    `${want.file.padEnd(20)} ${verdict.top.key.padEnd(6)} ${(verdict.top.p * 100).toFixed(0).padStart(3)}%`
    + `  health ${String(health.score).padStart(3)} ${health.band.padEnd(10)}`
    + ` ${health.findings.map((f) => f.key).join(', ').padEnd(28)} ${author}, ${credit.licence}`,
  );
}

if (problems.length) {
  console.error('\nSome samples did not pass:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nRe-pin them with: node tools/samples.mjs --shortlist <tree>');
  process.exit(1);
}

await fs.writeFile(path.join(OUT, 'credits.json'), `${JSON.stringify(rows, null, 2)}\n`);

/* ---------------------------------------------------------- credits file */

const LICENCE_URL = {
  'cc-by': 'https://creativecommons.org/licenses/by/4.0/',
  cc0: 'https://creativecommons.org/publicdomain/zero/1.0/',
};
const table = [
  '## Sample leaves',
  '',
  'The six photographs in `app/samples/` ship with the app so the kiosk can',
  'demonstrate a scan without a working camera. Every one is CC-BY or CC0 — the',
  'rest of the training set is CC-BY-NC and is used only to train a model, never',
  'redistributed. Each file was rotated to its EXIF orientation and resized to fit',
  `${SHIP}x${SHIP}; nothing else was changed.`,
  '',
  'They are pinned in `tools/samples.mjs`, which verifies on every build that the',
  'deployed model still identifies each one correctly and that the health analyser',
  'still puts it in the band it was chosen for. Two are unhealthy on purpose, so a',
  'demonstration reaches the findings and the treatment advice.',
  '',
  '| File | Tree | Identified | Leaf health | Photographer | Licence | Observation |',
  '|------|------|-----------|-------------|--------------|---------|-------------|',
  ...rows.map((r) => `| \`samples/${r.file}\` | ${r.latin} | ${Math.round(r.confidence * 100)}% | ${r.health}/100 (${r.band}) | ${r.author} | [${r.licence.toUpperCase()}](${LICENCE_URL[r.licence]}) | [iNaturalist ${r.observation}](https://www.inaturalist.org/observations/${r.observation}) |`),
  '',
  'Photographs are © their authors, from iNaturalist.',
  '',
].join('\n');

const mdPath = path.join(ROOT, 'app', 'img', 'CREDITS.md');
let md = await fs.readFile(mdPath, 'utf8');
md = md.includes('## Sample leaves')
  ? md.slice(0, md.indexOf('## Sample leaves')) + table
  : `${md.trimEnd()}\n\n${table}`;
await fs.writeFile(mdPath, md);

console.log(`\nWrote ${rows.length} samples to app/samples/ and credited them in app/img/CREDITS.md`);
