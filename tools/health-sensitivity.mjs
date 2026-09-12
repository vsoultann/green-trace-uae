/**
 * Does the health analyser still notice damage after being made less trigger-happy?
 *
 * health-calibrate.mjs measures *specificity*: how often a healthy leaf is left
 * alone. On its own that number is easy to cheat — an analyser that reports
 * "healthy" unconditionally scores 100%. This tool measures the other half.
 *
 * It takes reference photographs, paints synthetic lesions onto the living
 * tissue at a known severity, and checks that the analyser (a) drops the score
 * and (b) raises the matching finding. Because the damage is applied by us, the
 * ground truth is exact — we know precisely what fraction of the leaf was
 * spoiled, which no field photograph can tell us.
 *
 * Synthetic damage is not real disease, and this is not a claim that the app
 * diagnoses blight. It is a regression test for sensitivity: if a future change
 * to TUNING quietly stops the analyser reacting to a third of a leaf turning
 * brown, this run fails and says so.
 *
 *   node tools/health-sensitivity.mjs [--n 40]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { SPECIES } from './species.mjs';
import { analysePixels } from '../app/js/health.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const WORK = 384;

const argv = process.argv.slice(2);
const PER_CLASS = Number(argv[argv.indexOf('--n') + 1]) || 40;
/* tools/bench.mjs reads these numbers rather than re-deriving them, so the
   Test Lab page and this tool can never disagree about what was measured. */
const AS_JSON = argv.includes('--json');
const cases = [];

/* Deterministic noise, so a failure is reproducible. */
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Is this pixel living green tissue we are entitled to spoil? */
function isGreen(px, p) {
  const r = px[p], g = px[p + 1], b = px[p + 2];
  const sum = r + g + b;
  if (sum < 90) return false;
  return (2 * g - r - b) / sum > 0.06;
}

/**
 * Paints elliptical lesions over roughly `severity` of the green tissue.
 *
 * Blobs rather than a uniform wash, because that is how both leaf-spot and
 * scorch actually present, and because a uniform wash would let a naive
 * analyser pass by measuring the mean alone.
 *
 * `targetPixels` is expressed in pixels of *leaf tissue*, not of green tissue,
 * so that the severity we ask for is on the same denominator as the `necrosis`
 * and `chlorosis` fractions the analyser reports. Getting that wrong makes a
 * correctly-calibrated analyser look insensitive.
 *
 * @param {'necrosis'|'chlorosis'} kind
 * @returns {number} pixels actually painted
 */
function damage(px, w, h, targetPixels, kind, rand) {
  const n = w * h;

  let green = 0;
  for (let i = 0, p = 0; i < n; i++, p += 4) if (isGreen(px, p)) green++;
  if (!green) return 0;

  const target = Math.min(targetPixels, green);
  // Brown for dead tissue, yellow for chlorosis — the colours the classifier
  // is meant to key off.
  const [tr, tg, tb] = kind === 'necrosis' ? [104, 62, 28] : [214, 198, 62];

  let painted = 0;
  let guard = 0;
  while (painted < target && guard++ < 400) {
    const cx = rand() * w, cy = rand() * h;
    const rx = (0.03 + rand() * 0.10) * w;
    const ry = rx * (0.6 + rand() * 0.8);

    for (let y = Math.max(0, cy - ry | 0); y < Math.min(h, cy + ry); y++) {
      for (let x = Math.max(0, cx - rx | 0); x < Math.min(w, cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        const p = (y * w + x) * 4;
        if (!isGreen(px, p)) continue;
        // Blend, not replace: real lesions keep some of the leaf's own shading.
        px[p]     = px[p] * 0.15 + tr * 0.85;
        px[p + 1] = px[p + 1] * 0.15 + tg * 0.85;
        px[p + 2] = px[p + 2] * 0.15 + tb * 0.85;
        painted++;
      }
    }
  }
  return painted;
}

async function listDir(dir) {
  try {
    return (await fs.readdir(dir))
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => path.join(dir, f)).sort();
  } catch { return []; }
}

function sample(files, n) {
  if (files.length <= n) return files;
  const step = files.length / n;
  return Array.from({ length: n }, (_, i) => files[Math.floor(i * step)]);
}

async function decodeRGBA(file) {
  const img = sharp(file, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const scale = WORK / Math.max(meta.width, meta.height);
  const w = Math.max(1, Math.round(meta.width * scale));
  const h = Math.max(1, Math.round(meta.height * scale));
  const { data } = await img.resize(w, h, { fit: 'fill' }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w, h };
}

/* -------------------------------------------------------------------- run */

if (!AS_JSON) {
  console.log('Warif — health analyser sensitivity\n');
  console.log('  Synthetic lesions painted onto living tissue in reference photos.');
  console.log('  "detected" = the matching finding fired at all.\n');
}

// Each severity sits clear of the finding threshold it should trip: the point
// is to catch an analyser that has gone blind, not to probe the exact boundary.
const CASES = [
  { kind: 'necrosis',  severity: 0.25, keys: ['necrosisSome', 'necrosisHigh'] },
  { kind: 'necrosis',  severity: 0.45, keys: ['necrosisHigh', 'necrosisSome'] },
  { kind: 'chlorosis', severity: 0.38, keys: ['chlorosisSome', 'chlorosisHigh'] },
  { kind: 'chlorosis', severity: 0.60, keys: ['chlorosisHigh', 'chlorosisSome'] },
];

const files = [];
for (const sp of SPECIES) {
  files.push(...sample(await listDir(path.join(ROOT, 'dataset', 'inaturalist', sp.key)), PER_CLASS));
}
if (!files.length) {
  console.error('No reference images. Run: npm run fetch');
  process.exit(1);
}

const decoded = [];
for (const f of files) {
  try { decoded.push(await decodeRGBA(f)); } catch { /* skip unreadable */ }
}

let failures = 0;

for (const test of CASES) {
  const rand = mulberry32(20260907);
  let detected = 0, usable = 0, dropSum = 0;

  for (const { data, w, h } of decoded) {
    const clean = new Uint8ClampedArray(data);
    const before = analysePixels(clean, w, h, { paint: false });
    if (!before.valid) continue;

    // Severity is a share of the tissue the analyser itself found, so the
    // ground truth and the reported metric use the same denominator.
    const tissuePx = before.coverage * w * h;
    const dirty = new Uint8ClampedArray(data);
    const painted = damage(dirty, w, h, tissuePx * test.severity, test.kind, rand);
    if (painted < tissuePx * test.severity * 0.9) continue;  // not enough green to spoil
    const after = analysePixels(dirty, w, h, { paint: false });
    if (!after.valid) continue;

    usable++;
    dropSum += before.score - after.score;
    if (after.findings.some((f) => test.keys.includes(f.key))) detected++;
  }

  const rate = usable ? (detected / usable) * 100 : 0;
  const drop = usable ? dropSum / usable : 0;
  const pass = rate >= 90;
  if (!pass) failures++;

  cases.push({ kind: test.kind, severity: test.severity, detectedPct: rate, meanScoreDrop: drop, n: usable, pass });

  if (AS_JSON) continue;
  console.log(
    `  ${pass ? 'PASS' : 'FAIL'}  ${test.kind.padEnd(10)} ` +
    `${String(Math.round(test.severity * 100)).padStart(3)}% of leaf   ` +
    `detected ${rate.toFixed(1).padStart(5)}%   ` +
    `mean score drop ${drop.toFixed(1).padStart(5)}   (n=${usable})`
  );
}

if (AS_JSON) {
  console.log(JSON.stringify({ perClass: PER_CLASS, floorPct: 90, failures, cases }, null, 2));
} else {
  console.log('');
  if (!failures) console.log('  All sensitivity cases passed.\n');
}
if (failures) {
  console.error(`  ${failures} case(s) below the 90% detection floor — the analyser has gone blind.`);
  process.exit(1);
}
