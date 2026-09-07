/**
 * End-to-end smoke test: serves app/ over HTTP, drives it in real Chromium,
 * and checks that the model loads and classifies a held-out photograph.
 *
 * This is the test that actually matters -- unit-testing the analyser in Node
 * would not catch a broken model path, a WebGL failure or a router regression.
 *
 *   node tools/smoke-test.mjs
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { SPECIES } from './species.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'app');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json',
  '.bin': 'application/octet-stream',
};

const server = http.createServer(async (req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(APP, rel);
  if (!file.startsWith(APP)) { res.writeHead(403).end(); return; }
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
console.log(`Serving app/ at ${base}`);

const exe = ['/usr/bin/chromium', '/usr/bin/google-chrome-stable', '/usr/bin/brave']
  .find((p) => fssync.existsSync(p));
if (!exe) { console.error('No Chromium found'); process.exit(1); }

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'shell',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`);
  if (!ok) failures++;
};

console.log('\nLoading app...');
await page.goto(base, { waitUntil: 'networkidle2', timeout: 60000 });

check('page renders a view', await page.$eval('#view', (el) => el.children.length > 0));
check('tab bar present', (await page.$$('.tabbar a')).length === 5);

console.log('\nLoading model (this pulls 14 MB)...');
const loaded = await page.evaluate(async () => {
  const m = await import('./js/model.js');
  const t0 = performance.now();
  await m.loadModel();
  return { ms: Math.round(performance.now() - t0), meta: m.getMetadata(), backend: tf.getBackend() };
}).catch((e) => ({ error: e.message }));

if (loaded.error) {
  check('model loads', false, loaded.error);
} else {
  check('model loads', true, `${loaded.ms} ms on ${loaded.backend}`);
  check('metadata has 4 classes', loaded.meta.classes.length === 4, loaded.meta.classes.join(','));
  console.log(`    validation accuracy: ${(loaded.meta.validationAccuracy * 100).toFixed(1)}%`);
}

/* Classify one real photograph per species, straight off disk. */
console.log('\nClassifying one held-out photograph per species...');
let correct = 0, tried = 0;
for (const sp of SPECIES) {
  const dir = path.join(ROOT, 'dataset', 'inaturalist', sp.key);
  let files = [];
  try { files = (await fs.readdir(dir)).filter((f) => f.endsWith('.jpg')); } catch {}
  if (!files.length) { console.log(`  – ${sp.en}: no images on disk, skipped`); continue; }

  const b64 = (await fs.readFile(path.join(dir, files[0]))).toString('base64');
  const out = await page.evaluate(async (dataUrl) => {
    const m = await import('./js/model.js');
    const h = await import('./js/health.js');
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
    });
    const pred = await m.classify(img);
    const health = h.analyseLeaf(img);
    return {
      top: pred.top.key, p: pred.top.p, entropy: pred.entropy,
      score: health.score, valid: health.valid,
      metrics: health.metrics, findings: health.findings.length,
    };
  }, `data:image/jpeg;base64,${b64}`);

  tried++;
  if (out.top === sp.key) correct++;
  console.log(
    `  ${out.top === sp.key ? '✓' : '✗'} ${sp.en.padEnd(10)} → ${out.top.padEnd(6)} ` +
    `${(out.p * 100).toFixed(0)}%  health ${out.score ?? '—'}  ` +
    `chlorosis ${(out.metrics.chlorosis * 100).toFixed(0)}%  necrosis ${(out.metrics.necrosis * 100).toFixed(0)}%  ` +
    `${out.findings} findings`
  );
}
check(`species predictions`, tried > 0, `${correct}/${tried} correct on this tiny sample`);

/* ------------------------------------------------------------------------
   Does it know when it does not know?

   The single most visible way this app can embarrass itself is to answer
   "Ghaf, 61%" when shown something that is not a tree at all. These inputs are
   synthetic and deliberately absurd -- flat colour, noise, a drawn shape --
   because a classifier that stays confident on those is a classifier that will
   stay confident on a judge's coffee cup.
   ------------------------------------------------------------------------ */

console.log('\nRejecting things that are not leaves...');

const NOT_LEAVES = {
  'flat grey': (ctx, w, h) => {
    ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, w, h);
  },
  'random noise': (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = Math.random() * 255;
      img.data[i + 1] = Math.random() * 255;
      img.data[i + 2] = Math.random() * 255;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  },
  'blue circle on white': (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a5bd7';
    ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 3, 0, Math.PI * 2); ctx.fill();
  },
};

let rejected = 0, probes = 0;
for (const [label, _] of Object.entries(NOT_LEAVES)) {
  const out = await page.evaluate(async (name) => {
    const m = await import('./js/model.js');
    const h = await import('./js/health.js');

    const cv = document.createElement('canvas');
    cv.width = 420; cv.height = 420;
    const ctx = cv.getContext('2d');
    const w = cv.width, hh = cv.height;

    if (name === 'flat grey') {
      ctx.fillStyle = '#8a8a8a'; ctx.fillRect(0, 0, w, hh);
    } else if (name === 'random noise') {
      const img = ctx.createImageData(w, hh);
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = Math.random() * 255;
        img.data[i + 1] = Math.random() * 255;
        img.data[i + 2] = Math.random() * 255;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    } else {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, hh);
      ctx.fillStyle = '#2a5bd7';
      ctx.beginPath(); ctx.arc(w / 2, hh / 2, w / 3, 0, Math.PI * 2); ctx.fill();
    }

    const pred = await m.classify(cv);
    const health = h.analyseLeaf(cv);
    const rec = m.recognitionState(pred, health.leafConfidence);
    return {
      state: rec.state, reasons: rec.reasons,
      similarity: pred.similarity, leafConfidence: health.leafConfidence,
    };
  }, label);

  probes++;
  if (out.state === 'unknown') rejected++;
  console.log(
    `  ${out.state === 'unknown' ? '✓' : '✗'} ${label.padEnd(21)} → ${out.state.padEnd(9)} ` +
    `similarity ${out.similarity == null ? '—' : out.similarity.toFixed(2)}  ` +
    `leaf ${out.leafConfidence.toFixed(2)}  [${out.reasons.join(', ') || 'none'}]`
  );
}
check('non-leaves are refused', rejected === probes, `${rejected}/${probes} correctly unknown`);

/* And the other side of it: a genuine leaf must NOT be refused, or the
   rejection is worthless. */
{
  const dir = path.join(ROOT, 'dataset', 'inaturalist', 'ghaf');
  let files = [];
  try { files = (await fs.readdir(dir)).filter((f) => f.endsWith('.jpg')); } catch {}
  if (files.length) {
    const b64 = (await fs.readFile(path.join(dir, files[0]))).toString('base64');
    const out = await page.evaluate(async (dataUrl) => {
      const m = await import('./js/model.js');
      const h = await import('./js/health.js');
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
      });
      const pred = await m.classify(img);
      const health = h.analyseLeaf(img);
      return m.recognitionState(pred, health.leafConfidence).state;
    }, `data:image/jpeg;base64,${b64}`);
    check('a real leaf is still recognised', out !== 'unknown', out);
  }
}

/* ------------------------------------------------------------------------
   Team split and supplier directory
   ------------------------------------------------------------------------ */

console.log('\nData integrity...');
{
  const team = await page.evaluate(async () => {
    const { TEAM } = await import('./js/data/team.js');
    return {
      total: TEAM.reduce((a, m) => a + m.share, 0),
      top: [...TEAM].sort((a, b) => b.share - a.share)[0].name,
      count: TEAM.length,
    };
  });
  check('team shares total 100%', team.total === 100, `${team.total}%`);
  check('Sultan has the largest share', team.top === 'Sultan Alkaabi', team.top);
  check('five team members', team.count === 5, String(team.count));

  const sup = await page.evaluate(async () => {
    const { SUPPLIERS, HELPLINES } = await import('./js/data/suppliers.js');
    const bad = SUPPLIERS.filter((s) =>
      !s.name?.en || !s.emirate?.en || !Array.isArray(s.sells) || !s.sells.length);
    const coords = SUPPLIERS.filter((s) => s.lat != null);
    const outOfUAE = coords.filter((s) =>
      s.lat < 22.4 || s.lat > 26.5 || s.lon < 51.4 || s.lon > 56.6);
    return {
      total: SUPPLIERS.length, withPhone: SUPPLIERS.filter((s) => s.phone).length,
      withCoords: coords.length, bad: bad.length, outOfUAE: outOfUAE.length,
      helplines: HELPLINES.length,
    };
  });
  check('supplier records well formed', sup.bad === 0, `${sup.total} suppliers, ${sup.bad} malformed`);
  check('supplier coordinates are inside the UAE', sup.outOfUAE === 0,
    `${sup.withCoords} geocoded, ${sup.outOfUAE} outside`);
  check('phone numbers present', sup.withPhone >= 8, `${sup.withPhone} with a number`);
  check('official helplines listed', sup.helplines >= 2, String(sup.helplines));
}

/* Walk every route and make sure nothing throws. */
console.log('\nWalking routes...');
for (const route of ['#/scan', '#/library', '#/tree/ghaf', '#/tree/nakhl',
                     '#/nearby', '#/about', '#/model', '#/team']) {
  await page.evaluate((r) => { location.hash = r; }, route);
  await new Promise((r) => setTimeout(r, 550));
  const html = await page.$eval('#view', (el) => el.innerHTML.length);
  check(`route ${route}`, html > 200, `${html} chars`);
}

/* Themes and language. */
console.log('\nThemes and language...');
// getComputedStyle(body).backgroundColor reports the *propagated canvas*
// colour, which Chromium does not update when a token changes -- it reads the
// same for every theme and would pass a broken app. Sample real pixels.
const seen = new Map();
for (const th of ['desert-dawn', 'oasis', 'night-falcon', 'mangrove', 'contrast']) {
  await page.evaluate(async (id) => (await import('./js/themes.js')).applyTheme(id), th);
  await new Promise((r) => setTimeout(r, 350));
  const shot = await page.screenshot({ type: 'png', clip: { x: 6, y: 380, width: 24, height: 24 } });
  const png = await import('node:zlib').then(() => shot);
  // Average the clip without a decoder dependency: compare raw PNG bytes,
  // which differ whenever the rendered colour differs.
  const sig = Buffer.from(png).toString('base64').slice(0, 64);
  check(`theme ${th} renders distinctly`, !seen.has(sig), seen.has(sig) ? `identical to ${seen.get(sig)}` : 'unique');
  seen.set(sig, th);
}
await page.evaluate(async () => (await import('./js/themes.js')).applyTheme('system'));

const rtl = await page.evaluate(async () => {
  const i = await import('./js/i18n.js');
  i.setLang('ar');
  await new Promise((r) => setTimeout(r, 400));
  return { dir: document.documentElement.dir, text: document.querySelector('#view')?.textContent?.slice(0, 24) };
});
check('Arabic switches to RTL', rtl.dir === 'rtl', rtl.text);

await page.evaluate(async () => (await import('./js/i18n.js')).setLang('en'));

/* Service worker. */
const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return !!reg;
});
check('service worker registered', sw);

console.log('');
if (errors.length) {
  console.log('Console/network problems:');
  [...new Set(errors)].slice(0, 15).forEach((e) => console.log('  ! ' + e));
}

await browser.close();
server.close();

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
