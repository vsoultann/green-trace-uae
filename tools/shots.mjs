/**
 * Route screenshotter — the evidence generator for the workbook.
 *
 *   node tools/shots.mjs <outDir> [--routes a,b,c] [--lang en,ar] [--full]
 *
 * Serves app/ over HTTP and photographs every route at phone and laptop width,
 * which is what the "before and after" pages of the report are built from.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'app');

const args = process.argv.slice(2);
const outDir = path.resolve(ROOT, args[0] || 'docs/evidence/shots');
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const routes = flag('routes', '#/').split(',');
const langs = flag('lang', 'en').split(',');
const themes = flag('theme', '').split(',').filter(Boolean);
const full = args.includes('--full');
/* With one theme there is nothing to disambiguate, and the evidence set is
   named to match v1's screenshots so the before/after slider can pair them. */
const flatNames = args.includes('--flat');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.webp': 'image/webp',
};

const server = http.createServer(async (req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(APP, rel);
  if (!file.startsWith(APP)) { res.writeHead(403).end(); return; }
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const exe = ['/usr/bin/chromium', '/usr/bin/google-chrome-stable', '/usr/bin/brave'].find((p) => fssync.existsSync(p));
if (!exe) { console.error('No Chromium found'); process.exit(1); }

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'shell',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--font-render-hinting=none'],
});

await fs.mkdir(outDir, { recursive: true });

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2 },
  { name: 'desktop', width: 1366, height: 860, deviceScaleFactor: 1 },
];

const slug = (r) => r.replace(/^#\/?/, '').replace(/[/?=&]/g, '-') || 'home';
const errors = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  page.on('pageerror', (e) => errors.push(`[${vp.name}] pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${vp.name}] console: ${m.text()}`); });
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 60000 });

  for (const lang of langs) {
    await page.evaluate(async (l) => {
      const i18n = await import('./js/i18n.js');
      (i18n.setLang || i18n.setLanguage)(l);
    }, lang).catch(() => {});

    for (const theme of themes.length ? themes : [null]) {
      if (theme) {
        await page.evaluate(async (t) => {
          const m = await import('./js/themes.js');
          (m.applyTheme || m.setTheme)(t);
        }, theme).catch(() => {});
      }
      for (const route of routes) {
        /* The result screen has nothing on it until something has been scanned.
           Photographing its empty state would put "No leaf has been scanned yet"
           on the poster, so a sample is run first. The stressed Ghaf is used
           because it reaches the findings and the treatment advice, which is the
           half of the screen worth showing. */
        if (route.startsWith('#/result')) {
          await page.evaluate(() => { location.hash = '#/?sample=ghaf-stressed.jpg'; });
          await page.waitForFunction(
            () => document.querySelector('#view')?.dataset.route === 'result',
            { timeout: 180000 },
          ).catch(() => console.error('  ! the sample scan never reached a result'));
          await new Promise((r) => setTimeout(r, 1200));
        } else {
          await page.evaluate((r) => { location.hash = r; }, route);
        }
        await new Promise((r) => setTimeout(r, 700));
        const parts = [slug(route), lang, flatNames ? null : theme, vp.name].filter(Boolean);
        const file = path.join(outDir, `${parts.join('-')}.png`);
        await page.screenshot({ path: file, fullPage: full });
        console.log(`  ${path.relative(ROOT, file)}`);
      }
    }
  }
  await page.close();
}

await browser.close();
server.close();
if (errors.length) {
  console.log('\nConsole/page errors seen while shooting:');
  for (const e of [...new Set(errors)].slice(0, 30)) console.log('  ' + e);
}
