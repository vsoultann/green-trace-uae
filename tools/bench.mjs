/**
 * Measures the app, and writes what it measured to app/data/lab.json.
 *
 *   node tools/bench.mjs [--runs 30] [--quick]
 *
 * The Test Lab page renders this file. Nothing on that page is typed in by
 * hand, which is the whole point: a performance claim on a school project is
 * usually a number somebody remembered, and this one can be re-run by anybody
 * with the repository.
 *
 * What it does, in order:
 *
 *   1. loads the app in headless Chromium with an empty cache and times the
 *      model download (cold), then reloads and times it again (warm);
 *   2. runs N classifications and N full photo-to-result passes, and reports
 *      the median and the 95th percentile rather than the mean, because a mean
 *      hides exactly the stutter a demonstration will hit;
 *   3. counts tf.js tensors before and after, which is how a leak shows up
 *      before it becomes a crash at the kiosk;
 *   4. reloads with the network disabled and checks the app still renders;
 *   5. measures what the unknown-leaf check actually rejects, against trees the
 *      model was never trained on;
 *   6. shells out to the calibration and sensitivity tools and records their
 *      results, so the Lab page and those tools can never disagree.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import puppeteer from 'puppeteer-core';
import { initBackend, loadBase, IMAGE_SIZE, FEATURE_NODE, FEATURE_DIM, tf } from './embed.mjs';

const run = promisify(execFile);

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'app');

const argv = process.argv.slice(2);
const RUNS = Number(argv[argv.indexOf('--runs') + 1]) || 30;
const QUICK = argv.includes('--quick');

/** Trees the model was never trained on, and how many of each to test. */
const OOD_SAMPLE = 40;

/* ---------------------------------------------------------------- server */

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.bin': 'application/octet-stream',
};

const server = http.createServer(async (req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(APP, rel);
  if (!file.startsWith(APP)) { res.writeHead(403).end(); return; }
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const exe = ['/usr/bin/chromium', '/usr/bin/google-chrome-stable', '/usr/bin/brave']
  .find((p) => fssync.existsSync(p));
if (!exe) { console.error('No Chromium found'); process.exit(1); }

/* ------------------------------------------------------------------ stats */

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
const median = (values) => quantile([...values].sort((a, b) => a - b), 0.5);
const p95 = (values) => quantile([...values].sort((a, b) => a - b), 0.95);

/* -------------------------------------------------------------- the runs */

console.log(`Warif bench — ${RUNS} runs\n`);

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'shell',
  // Software rendering makes a single inference take about a second here, and
  // thirty of them plus a 14 MB download runs past the default protocol timeout.
  protocolTimeout: 600_000,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

const errors = [];
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(String(e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.setViewport({ width: 1366, height: 860 });

/* ---- 1. cold load ---- */

await page.setCacheEnabled(false);
await page.goto(base, { waitUntil: 'domcontentloaded' });
const loadColdMs = await page.evaluate(async () => {
  const started = performance.now();
  const gate = await import('./js/ui/model-gate.js');
  await gate.ensureModel();
  return performance.now() - started;
});
console.log(`  model load, cold   ${Math.round(loadColdMs)} ms`);

/* ---- 2. warm load ---- */

await page.setCacheEnabled(true);
await page.reload({ waitUntil: 'domcontentloaded' });
const loadWarmMs = await page.evaluate(async () => {
  const started = performance.now();
  const gate = await import('./js/ui/model-gate.js');
  await gate.ensureModel();
  return performance.now() - started;
});
console.log(`  model load, warm   ${Math.round(loadWarmMs)} ms`);

/* ---- 3. inference and full pipeline ---- */

const SAMPLES = (await fs.readdir(path.join(APP, 'samples'))).filter((f) => f.endsWith('.jpg'));

const timings = await page.evaluate(async (files, runs) => {
  const model = await import('./js/model.js');
  const health = await import('./js/health.js');
  const gate = await import('./js/ui/model-gate.js');
  await gate.ensureModel();

  const load = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  const images = await Promise.all(files.map((f) => load(`./samples/${f}`)));

  // Warm the shader cache first so the first measured run is not paying for it.
  await model.classify(images[0]);

  const tensorsBefore = tf.memory().numTensors;
  const inference = [];
  const pipeline = [];
  const scores = {};

  for (let i = 0; i < runs; i++) {
    const image = images[i % images.length];
    const name = files[i % files.length];

    const t0 = performance.now();
    const prediction = await model.classify(image);
    inference.push(performance.now() - t0);

    const t1 = performance.now();
    const leaf = health.analyseLeaf(image);
    model.recognitionState(prediction, leaf.leafConfidence);
    pipeline.push(performance.now() - t1 + (performance.now() - t0));

    // Same photograph, same answer, every time: recorded so a wobble shows up.
    (scores[name] ??= []).push({ key: prediction.top.key, p: prediction.top.p, health: leaf.score });
  }

  const tensorsAfter = tf.memory().numTensors;
  return { inference, pipeline, tensorsBefore, tensorsAfter, scores };
}, SAMPLES, RUNS);

console.log(`  inference median   ${Math.round(median(timings.inference))} ms`);
console.log(`  inference p95      ${Math.round(p95(timings.inference))} ms`);
console.log(`  photo to result    ${Math.round(median(timings.pipeline))} ms`);
console.log(`  tensors            ${timings.tensorsBefore} → ${timings.tensorsAfter}`);

/* Consistency: the same photograph must give the same answer every time. */
const inconsistent = Object.entries(timings.scores).filter(([, runs]) => {
  const first = runs[0];
  return runs.some((r) => r.key !== first.key || Math.abs(r.p - first.p) > 0.001 || r.health !== first.health);
}).map(([file]) => file);
console.log(`  repeat consistency ${inconsistent.length ? `DRIFTED: ${inconsistent.join(', ')}` : 'identical across runs'}`);

/* ---- 4. offline reload ---- */

/* Give the service worker time to finish precaching 17 MB before the plug is
   pulled. `serviceWorker.ready` never settles if nothing ever takes control, so
   it is raced against a timeout rather than awaited on faith. */
let offlineReload = false;
try {
  await page.evaluate(() => Promise.race([
    navigator.serviceWorker?.ready ?? Promise.resolve(),
    new Promise((r) => setTimeout(r, 20_000)),
  ]));
  await new Promise((r) => setTimeout(r, 8000));
  await page.setOfflineMode(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  await new Promise((r) => setTimeout(r, 800));
  offlineReload = await page.evaluate(() => (document.querySelector('#view')?.textContent?.trim().length ?? 0) > 120);
} catch (err) {
  console.error(`  offline reload threw: ${String(err.message).split('\n')[0]}`);
} finally {
  await page.setOfflineMode(false).catch(() => {});
}
console.log(`  offline reload     ${offlineReload ? 'pass' : 'FAIL'}`);

const device = await page.evaluate(() => navigator.userAgent).catch(() => 'unknown');
await browser.close();
server.close();

/* ---- 5. what the refusal actually catches ---- */

let ood = null;
if (!QUICK) {
  console.log('\n  measuring the unknown-leaf check…');
  try {
    ood = await measureOod();
    for (const [key, count] of Object.entries(ood?.rejected ?? {})) {
      console.log(`    ${key.padEnd(10)} refused ${count}/${ood.sampled}`);
    }
  } catch (err) {
    // A stage that fails leaves a gap in the report rather than losing the run.
    console.error(`  could not measure it: ${String(err.message).split('\n')[0]}`);
  }
}

/* ---- 6. the analyser tools ---- */

let calibration = null;
let sensitivity = null;
if (!QUICK) {
  console.log('\n  running the health calibration…');
  calibration = await jsonFrom('tools/health-calibrate.mjs', ['--kiosk', '--json']);
  console.log('  running the sensitivity suite…');
  sensitivity = await jsonFrom('tools/health-sensitivity.mjs', ['--json']);
}

/* ------------------------------------------------------------------ write */

const chlorosis = sensitivity?.cases.filter((c) => c.kind === 'chlorosis').map((c) => c.detectedPct / 100) ?? [];
const necrosis = sensitivity?.cases.filter((c) => c.kind === 'necrosis').map((c) => c.detectedPct / 100) ?? [];

const lab = {
  measuredAt: new Date().toISOString(),
  device: `${os.type()} ${os.arch()} — headless Chromium, SwiftShader`,
  userAgent: device,
  runs: RUNS,

  performance: {
    loadColdMs: Math.round(loadColdMs),
    loadWarmMs: Math.round(loadWarmMs),
    inferenceMedianMs: Math.round(median(timings.inference)),
    inferenceP95Ms: Math.round(p95(timings.inference)),
    timeToResultMedianMs: Math.round(median(timings.pipeline)),
  },

  reliability: {
    runs: RUNS,
    tensorsBefore: timings.tensorsBefore,
    tensorsAfter: timings.tensorsAfter,
    crashes: errors.filter((e) => !/favicon|404/i.test(e)).length,
    offlineReload,
    repeatConsistent: inconsistent.length === 0,
    inconsistentSamples: inconsistent,
  },

  accuracy: {
    /* A tool whose output shape has moved should leave a gap in the report
       rather than take the whole run down at the last line. */
    calibration: calibration?.all ? {
      /* The "before" column cannot be re-measured: the v1 analyser it describes
         was rebuilt, not kept behind a flag. It is quoted from the project
         record and labelled as such rather than presented as a live figure. */
      healthyReportedBefore: 0.113,
      healthyReportedAfter: calibration.all.healthyPct / 100,
      medianScoreBefore: 47,
      medianScoreAfter: calibration.all.score?.p50 ?? null,
      syntheticNecrosis: necrosis.length ? Math.min(...necrosis) : null,
      syntheticChlorosisLow: chlorosis.length ? Math.min(...chlorosis) : null,
      syntheticChlorosisHigh: chlorosis.length ? Math.max(...chlorosis) : null,
      analysed: calibration.all.analysed,
      note: {
        en: 'The "before" column is quoted from the project record: the v1 analyser it describes was replaced, not kept behind a flag, so it cannot be re-run. Everything in the "after" column was measured by npm run bench on the date above.',
        ar: 'عمود «قبل» منقولٌ من سجل المشروع: فمحلّل النسخة الأولى الذي يصفه استُبدل ولم يُحتفظ به خلف خيار، فلا يمكن إعادة تشغيله. أما كل ما في عمود «بعد» فقِيس بأمر npm run bench في التاريخ أعلاه.',
      },
    } : null,
    sensitivity: sensitivity?.cases ?? null,
  },

  ood,
};

await fs.mkdir(path.join(APP, 'data'), { recursive: true });
await fs.writeFile(path.join(APP, 'data', 'lab.json'), `${JSON.stringify(lab, null, 2)}\n`);

console.log(`\nWrote app/data/lab.json`);
if (errors.length) {
  console.log('\nConsole/page errors seen during the run:');
  for (const e of [...new Set(errors)].slice(0, 10)) console.log(`  ${e}`);
}

/* ------------------------------------------------------------------ parts */

async function jsonFrom(script, args) {
  let stdout;
  try {
    ({ stdout } = await run('node', [path.join(ROOT, script), ...args], {
      cwd: ROOT,
      maxBuffer: 32 * 1024 * 1024,
    }));
  } catch (err) {
    // A non-zero exit is a verdict, not a crash: the sensitivity suite exits 1
    // when a case falls below its detection floor, and that measurement is
    // exactly the one worth recording. Its output is still on stdout.
    stdout = err.stdout;
    if (!stdout) {
      console.error(`  ${script} produced nothing: ${String(err.message).split('\n')[0]}`);
      return null;
    }
    console.log(`  ${script} reported a failing case — recording it`);
  }
  try {
    return JSON.parse(stdout);
  } catch {
    // A tool that fails should leave a gap in the report, not a wrong number.
    console.error(`  ${script} did not produce JSON`);
    return null;
  }
}

/**
 * How often the unknown-leaf check refuses a tree it was never trained on.
 *
 * Run in Node rather than the browser because it is four hundred forward passes
 * and nothing about it needs a DOM. The answer is uncomfortable and that is
 * exactly why it is measured: the check was built to stop the app naming a
 * species for a photograph of something else, and it turns out to do that for
 * things which are not plants rather than for other trees' leaves.
 */
async function measureOod() {
  const metadata = JSON.parse(await fs.readFile(path.join(APP, 'model', 'metadata.json'), 'utf8'));
  const oodRef = JSON.parse(await fs.readFile(path.join(APP, 'model', 'ood.json'), 'utf8'));
  const dataset = path.join(ROOT, 'dataset', 'inaturalist');

  let untrained;
  try {
    untrained = (await fs.readdir(dataset, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !metadata.classes.includes(e.name))
      .map((e) => e.name);
  } catch {
    return null; // no dataset locally: the figure is simply absent
  }
  if (!untrained.length) return null;

  await initBackend();
  const modelBase = await loadBase();
  const head = await tf.loadLayersModel({
    load: async () => {
      const json = JSON.parse(await fs.readFile(path.join(APP, 'model', 'head', 'model.json'), 'utf8'));
      const bin = await fs.readFile(path.join(APP, 'model', 'head', 'weights.bin'));
      return {
        modelTopology: json.modelTopology,
        weightSpecs: json.weightsManifest.flatMap((g) => g.weights),
        weightData: new Uint8Array(bin).buffer,
        format: json.format,
      };
    },
  });

  const rejected = {};
  for (const key of untrained) {
    const files = (await fs.readdir(path.join(dataset, key))).slice(0, OOD_SAMPLE);
    let count = 0;
    for (const file of files) {
      const { data } = await sharp({
        create: { width: IMAGE_SIZE, height: IMAGE_SIZE, channels: 3, background: '#ffffff' },
      }).composite([{
        input: await sharp(path.join(dataset, key, file)).rotate()
          .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'inside' }).toBuffer(),
        gravity: 'center',
      }]).removeAlpha().raw().toBuffer({ resolveWithObject: true });

      const similarity = tf.tidy(() => {
        const batch = tf.tensor3d(new Uint8Array(data), [IMAGE_SIZE, IMAGE_SIZE, 3], 'float32').div(255).expandDims(0);
        const feats = modelBase.execute(batch, FEATURE_NODE).reshape([FEATURE_DIM]);
        const unit = feats.div(feats.square().sum().sqrt());
        return tf.tensor2d(oodRef.centroids).dot(unit).max().arraySync();
      });
      if (similarity < oodRef.threshold) count += 1;
    }
    rejected[key] = count;
  }

  head.dispose();
  return { sampled: OOD_SAMPLE, threshold: oodRef.threshold, rejected };
}
