/**
 * Prints the poster to a PDF, the same way Chrome's "Save as PDF" would.
 *
 *   node tools/poster-pdf.mjs [A0|A1|A2] [out.pdf]
 *
 * The team will print from the browser on the day — this exists so the page
 * size can be checked in CI-ish conditions rather than discovered at the print
 * shop, and so there is a PDF to attach to the workbook.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'app');

const size = (process.argv[2] || 'A1').toUpperCase();
const out = path.resolve(ROOT, process.argv[3] || `docs/warif-poster-${size}.pdf`);

const MM = { A0: [841, 1189], A1: [594, 841], A2: [420, 594] }[size];
if (!MM) { console.error(`Unknown size ${size}`); process.exit(1); }

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

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: 'shell',
  protocolTimeout: 300_000,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1200 });
await page.goto(`${base}#/poster?size=${size}`, { waitUntil: 'networkidle2', timeout: 120_000 });
/* The page is laid out in millimetres and the screen preview zooms it to fit;
   emulating print switches that off and gives the printed layout. */
await page.emulateMediaType('print');
await new Promise((r) => setTimeout(r, 1200));

await fs.mkdir(path.dirname(out), { recursive: true });
await page.pdf({
  path: out,
  width: `${MM[0]}mm`,
  height: `${MM[1]}mm`,
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: true,
});

await browser.close();
server.close();

const { size: bytes } = await fs.stat(out);
console.log(`${size} poster → ${path.relative(ROOT, out)}  (${MM[0]}×${MM[1]} mm, ${(bytes / 1024).toFixed(0)} KB)`);
