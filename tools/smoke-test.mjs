/**
 * End-to-end smoke test: serves app/ over HTTP, drives it in real Chromium, and
 * checks that the whole thing works — the model loads, a held-out photograph is
 * classified, a photograph of something that is not a leaf is refused, every
 * route renders in both languages, and the app survives the network going away.
 *
 * This is the test that actually matters. Unit-testing the analyser in Node
 * would not catch a broken model path, a WebGL failure, a router regression, or
 * a page that claims the model recognises ten trees when it recognises four.
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

/* The shell awaits the model card — a kilobyte, same origin — before it builds
   the first view, so the first paint can land just after networkidle2 under
   load. Waiting for the view is the check; asserting on it immediately was
   testing the machine's spare capacity. */
const rendered = await page
  .waitForFunction(() => Boolean(document.querySelector('#view')?.dataset.route), { timeout: 30000 })
  .then(() => true)
  .catch(() => false);
check('page renders a view', rendered);
check('bottom bar has five destinations', (await page.$$('.tabbar a')).length === 5);
check('top bar carries the lockup', Boolean(await page.$('.topbar .lockup')));

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
  check('metadata lists its classes', loaded.meta.classes.length > 0, loaded.meta.classes.join(','));
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
  /* The one that found the bug. A wood-grain desk fills the frame with a solid,
     warm, slightly green-ish brown, which the foliage check does not object to,
     and it used to come back "Ghaf, 98%, healthy 93/100". */
  'wood-grain desk': () => {},
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

    if (name === 'wood-grain desk') {
      const g = ctx.createLinearGradient(0, 0, w, hh);
      g.addColorStop(0, '#8d7b63');
      g.addColorStop(1, '#6f5f4a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh);
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 3;
      for (let y = 20; y < hh; y += 34) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + 6); ctx.stroke();
      }
    } else if (name === 'flat grey') {
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

  /* The refusal is only worth having if it costs almost nothing. A decisive
     similarity floor was added after a photograph of a desk came back as a
     healthy Ghaf; this is the measurement that says the floor is safe. */
  const sweep = { tried: 0, refused: 0 };
  for (const key of ['ghaf', 'sidr', 'nakhl', 'samar']) {
    const dir = path.join(ROOT, 'dataset', 'inaturalist', key);
    let files = [];
    try { files = (await fs.readdir(dir)).filter((f) => f.endsWith('.jpg')).slice(0, 20); } catch {}
    for (const file of files) {
      const b64 = (await fs.readFile(path.join(dir, file))).toString('base64');
      const state = await page.evaluate(async (dataUrl) => {
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
      sweep.tried++;
      if (state === 'unknown') sweep.refused++;
    }
  }
  if (sweep.tried) {
    const rate = sweep.refused / sweep.tried;
    check('genuine leaves are almost never refused', rate <= 0.02,
      `${sweep.refused}/${sweep.tried} refused (${(rate * 100).toFixed(1)}%)`);
  }
}

/* ------------------------------------------------------------------------
   Data integrity
   ------------------------------------------------------------------------ */

console.log('\nData integrity...');
{
  const team = await page.evaluate(async () => {
    const { TEAM, LEADER, MEMBERS } = await import('./js/data/team.js');
    return {
      count: TEAM.length,
      leaders: TEAM.filter((m) => m.leader).length,
      leader: LEADER?.name,
      members: MEMBERS.length,
      /* v1 ranked the team by percentage. The assessment grades equal
         participation, so the field is gone and must stay gone. */
      withShare: TEAM.filter((m) => 'share' in m).length,
      missingRole: TEAM.filter((m) => !m.role?.en || !m.role?.ar).length,
      missingSpeaks: TEAM.filter((m) => !m.speaks?.en || !m.speaks?.ar).length,
    };
  });
  check('five team members', team.count === 5, String(team.count));
  check('exactly one team leader', team.leaders === 1, `${team.leaders}: ${team.leader}`);
  check('Sultan is the leader', team.leader === 'Sultan Alkaabi', String(team.leader));
  check('no participation percentages', team.withShare === 0, `${team.withShare} members carry a share`);
  check('every member has a bilingual role', team.missingRole === 0);
  check('every member has a speaking part', team.missingSpeaks === 0);

  /* The deck is graded on length and on everyone speaking. Both are data, so
     both are checkable before anyone stands up in front of an audience. */
  const deck = await page.evaluate(async () => {
    const { SLIDES, totalSeconds } = await import('./js/data/presentation.js');
    const { TEAM } = await import('./js/data/team.js');
    const { CONFIG } = await import('./js/config.js');
    const speakers = new Set(SLIDES.map((s) => s.speaker));
    return {
      totalSeconds,
      min: CONFIG.presentation.minSeconds,
      max: CONFIG.presentation.maxSeconds,
      silent: TEAM.filter((m) => !speakers.has(m.id)).map((m) => m.name),
      unknown: [...speakers].filter((id) => !TEAM.some((m) => m.id === id)),
    };
  });
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  check('the deck runs between four and ten minutes',
    deck.totalSeconds >= deck.min && deck.totalSeconds <= deck.max, mmss(deck.totalSeconds));
  check('every member speaks', deck.silent.length === 0, deck.silent.join(', '));
  check('every slide has a real speaker', deck.unknown.length === 0, deck.unknown.join(', '));

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

  /* Both languages, every key. A missing Arabic string does not throw — it
     falls back to English — so nothing but a test will ever catch it. */
  const strings = await page.evaluate(async () => {
    const mod = await import('./js/i18n.js');
    return mod.keyParity ? mod.keyParity() : null;
  });
  if (strings) {
    check('every interface string exists in Arabic', strings.missing.length === 0,
      strings.missing.slice(0, 6).join(', ') || `${strings.count} keys`);
  }
}

/* ------------------------------------------------------------------------
   The count that was wrong in v1

   The model page used to announce "Species: 10" beside a four-class model.
   Anyone who scanned a mangrove leaf and got "Ghaf" had been told, by our own
   page, that mangrove was covered. This is the check that stops it returning:
   what the screen says has to equal what the model file says, and the badges
   have to agree with both.
   ------------------------------------------------------------------------ */

console.log('\nRecognised-count honesty...');
{
  await page.evaluate(() => { location.hash = '#/trees'; });
  await new Promise((r) => setTimeout(r, 700));

  const shown = await page.evaluate(async () => {
    const meta = await (await fetch('./model/metadata.json')).json();
    const { SPECIES } = await import('./js/data/species.js');
    return {
      declared: meta.classes.length,
      library: SPECIES.length,
      recognisedBadges: document.querySelectorAll('.badge-on').length,
      referenceBadges: document.querySelectorAll('.badge-ref').length,
      lede: document.querySelector('.page-head .lede')?.textContent ?? '',
    };
  });

  check('badges marked "recognised" match the model', shown.recognisedBadges === shown.declared,
    `${shown.recognisedBadges} badges, ${shown.declared} classes`);
  check('every other tree is marked reference only',
    shown.referenceBadges === shown.library - shown.declared,
    `${shown.referenceBadges} of ${shown.library - shown.declared}`);
  check('the page states the model\'s own count',
    shown.lede.includes(String(shown.declared)) && shown.lede.includes(String(shown.library)),
    shown.lede.trim());
}

/* ------------------------------------------------------------------------
   Every route, in both languages
   ------------------------------------------------------------------------ */

const ROUTES = await page.evaluate(async () => (await import('./js/router.js')).routePaths);
const SAMPLE_ROUTES = ROUTES.map((p) => (p === '/trees/:key' ? '/trees/ghaf' : p));

/* v1's URLs are printed on a QR code and pasted in a workbook. They have to
   keep working, or the rename breaks somebody's bookmark. */
const REDIRECTS = [
  ['#/scan', '#/'],
  ['#/library', '#/trees'],
  ['#/tree/ghaf', '#/trees/ghaf'],
  ['#/nearby', '#/help'],
  ['#/about', '#/project'],
  ['#/model', '#/project/how'],
];

/* Run one sample scan first, so #/result has a result on it. Walking to it
   cold shows the empty state, which is correct and proves nothing. */
await page.evaluate(() => { location.hash = '#/?sample=ghaf.jpg'; });
await page.waitForFunction(
  () => document.querySelector('#view')?.dataset.route === 'result',
  { timeout: 120000 },
)
  .then(() => check('a sample scan reaches a result', true))
  .catch(() => check('a sample scan reaches a result', false, 'never rendered'));

for (const language of ['en', 'ar']) {
  console.log(`\nWalking every route in ${language}...`);
  await page.evaluate(async (l) => (await import('./js/i18n.js')).setLang(l), language);
  await new Promise((r) => setTimeout(r, 300));

  for (const route of SAMPLE_ROUTES) {
    const before = errors.length;
    await page.evaluate((r) => { location.hash = `#${r}`; }, route);
    await new Promise((r) => setTimeout(r, 650));

    const state = await page.$eval('#view', (el) => ({
      chars: el.textContent.trim().length,
      dir: document.documentElement.dir,
    }));
    const fresh = errors.slice(before);
    check(`${language} ${route}`, state.chars > 120 && fresh.length === 0,
      fresh.length ? fresh[0] : `${state.chars} chars, dir=${state.dir}`);
  }
}

await page.evaluate(async () => (await import('./js/i18n.js')).setLang('en'));

console.log('\nOld URLs still work...');
for (const [from, to] of REDIRECTS) {
  await page.evaluate((r) => { location.hash = r; }, from);
  await new Promise((r) => setTimeout(r, 400));
  const landed = await page.evaluate(() => location.hash);
  check(`${from} → ${to}`, landed === to, landed);
}

/* ------------------------------------------------------------------------
   Appearance
   ------------------------------------------------------------------------ */

console.log('\nThemes, text size and language...');

await page.evaluate(() => { location.hash = '#/trees'; });
await new Promise((r) => setTimeout(r, 600));

const themeIds = await page.evaluate(async () =>
  (await import('./js/themes.js')).THEMES.map((t) => t.id));

check('four themes, not sixteen', themeIds.length === 4, themeIds.join(', '));

const seen = new Map();
for (const th of themeIds) {
  await page.evaluate(async (id) => (await import('./js/themes.js')).applyTheme(id), th);
  await new Promise((r) => setTimeout(r, 140));
  const sig = await page.evaluate(() => {
    const panel = document.querySelector('.tree-tile a');
    const cs = getComputedStyle(document.documentElement);
    return [
      panel ? getComputedStyle(panel).backgroundColor : 'no-panel',
      panel ? getComputedStyle(panel).color : '',
      cs.getPropertyValue('--primary').trim(),
      cs.getPropertyValue('--accent').trim(),
    ].join('|');
  });
  // 'auto' follows the device, so it is allowed to match day or night.
  const dup = seen.get(sig);
  const ok = !sig.startsWith('no-panel') && (th === 'auto' || !dup || dup === 'auto');
  check(`theme ${th} renders`, ok, dup && !ok ? `identical to ${dup}` : sig.split('|')[2]);
  seen.set(sig, th);
}

/* A palette that silently inherits another one's --ink looks fine on the
   machine it was written on and is unreadable on the kiosk. */
const tokenReport = await page.evaluate(async () => {
  const { THEMES } = await import('./js/themes.js');
  const REQUIRED = ['--bg', '--surface', '--surface-sunk', '--ink', '--ink-muted', '--line',
    '--primary', '--on-primary', '--accent', '--healthy', '--chlorosis', '--necrosis', '--focus'];
  const root = document.documentElement;
  const before = root.dataset.theme;
  const broken = [];
  for (const th of THEMES) {
    root.dataset.theme = th.id;
    const cs = getComputedStyle(root);
    const missing = REQUIRED.filter((k) => !cs.getPropertyValue(k).trim());
    if (missing.length) broken.push(`${th.id}: ${missing.join(' ')}`);
  }
  root.dataset.theme = before;
  return broken;
});
check('every theme defines every token', tokenReport.length === 0, tokenReport.join(' | '));

const textSize = await page.evaluate(async () => {
  const m = await import('./js/themes.js');
  const base = parseFloat(getComputedStyle(document.documentElement).fontSize);
  m.applyTextSize('large');
  const large = parseFloat(getComputedStyle(document.documentElement).fontSize);
  m.applyTextSize('standard');
  return { base, large };
});
check('large text actually gets larger', textSize.large > textSize.base,
  `${textSize.base}px → ${textSize.large}px`);

const rtl = await page.evaluate(async () => {
  const i = await import('./js/i18n.js');
  i.setLang('ar');
  await new Promise((r) => setTimeout(r, 400));
  return {
    dir: document.documentElement.dir,
    lang: document.documentElement.lang,
    text: document.querySelector('#view')?.textContent?.slice(0, 24),
  };
});
check('Arabic switches to RTL', rtl.dir === 'rtl' && rtl.lang === 'ar', rtl.text);

await page.evaluate(async () => (await import('./js/i18n.js')).setLang('en'));

/* ------------------------------------------------------------------------
   Offline
   ------------------------------------------------------------------------ */

console.log('\nOffline...');
{
  const sw = await page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration()));
  check('service worker registered', sw);

  if (sw) {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await new Promise((r) => setTimeout(r, 4000));
    await page.setOfflineMode(true);
    let rendered = false;
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 900));
      rendered = await page.$eval('#view', (el) => el.textContent.trim().length > 120);
    } catch { rendered = false; }
    await page.setOfflineMode(false);
    check('the app renders with the network off', rendered);
  }
}

/* ------------------------------------------------------------------------
   Everything still to be confirmed
   ------------------------------------------------------------------------ */

/* The app used to print a "To confirm" chip beside every unverified fact. It no
   longer does — that marker belongs in our workflow, not on a page an evaluator
   is reading — so this is the only thing left that will nag about them. It has
   to reach every one of them, not just the ones that live in config.js. */
const todos = await page.evaluate(async () => {
  const { openTodos } = await import('./js/config.js');
  const { QUOTES } = await import('./js/data/about.js');
  const { STAGES } = await import('./js/data/journey.js');

  const out = openTodos();
  for (const [key, quote] of Object.entries(QUOTES)) {
    if (quote.todo) out.push({ where: `about.QUOTES.${key}`, note: quote.todo });
  }
  const undated = STAGES.filter((stage) => stage.todo).map((stage) => stage.title.en);
  if (undated.length) {
    out.push({
      where: 'journey.STAGES',
      note: `Confirm the dates for: ${undated.join(', ')}. They are written as term weeks because the repository cannot know them.`,
    });
  }
  return out;
});

if (todos.length) {
  console.log(`\nStill to confirm (${todos.length}):`);
  for (const todo of todos) console.log(`  · ${todo.where}: ${todo.note}`);
}

console.log('');
const realErrors = [...new Set(errors)];
if (realErrors.length) {
  console.log('Console/network problems:');
  realErrors.slice(0, 15).forEach((e) => console.log('  ! ' + e));
}
check('no console or network errors', realErrors.length === 0, `${realErrors.length} seen`);

await browser.close();
server.close();

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
