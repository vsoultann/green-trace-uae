/**
 * Generates the QR codes the app and the printed stand use.
 *
 *   node tools/make-qr.mjs [siteUrl]
 *
 * Two codes, both read out of app/js/config.js so there is one place to change
 * a URL: the app itself, and the evaluator feedback form if one has been set.
 * SVG for the screen — sharp on a phone, about a kilobyte in the offline cache —
 * and a print-resolution PNG of the site code for the physical stand.
 *
 * High error correction throughout: a QR taped to a stand gets smudged, curled
 * and glared at under exhibition lighting, and level H survives ~30% damage.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

const ROOT = path.resolve(import.meta.dirname, '..');

/* Read the URLs from config.js without importing it — it is a browser module
   and dragging in the DOM to read two strings would be silly. */
const config = await fs.readFile(path.join(ROOT, 'app', 'js', 'config.js'), 'utf8');
const field = (name) => new RegExp(`${name}:\\s*'([^']*)'`).exec(config)?.[1] ?? '';

const site = process.argv[2] || field('site');
const feedback = field('feedbackFormUrl');

const SVG_OPTS = {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 2,
  width: 512,
  color: { dark: '#14231Cff', light: '#ffffffff' },
};

await fs.writeFile(path.join(ROOT, 'app', 'assets', 'qr.svg'), await QRCode.toString(site, SVG_OPTS));

await QRCode.toFile(path.join(ROOT, 'kiosk-qr.png'), site, {
  errorCorrectionLevel: 'H',
  margin: 3,
  width: 2000,
  color: { dark: '#14231Cff', light: '#ffffffff' },
});

console.log(`QR written for ${site}`);
console.log('  app/assets/qr.svg      (in-app)');
console.log('  kiosk-qr.png           (2000px, for printing)');

/* The feedback code only exists when there is a form to point it at. The
   Feedback and Poster pages check for the file's absence the same way: they
   simply do not draw a code nobody can scan. */
const feedbackSvg = path.join(ROOT, 'app', 'assets', 'qr-feedback.svg');
if (feedback) {
  await fs.writeFile(feedbackSvg, await QRCode.toString(feedback, SVG_OPTS));
  console.log('  app/assets/qr-feedback.svg');
} else {
  await fs.rm(feedbackSvg, { force: true });
  console.log('\nNo links.feedbackFormUrl in app/js/config.js, so no feedback QR was written.');
  console.log('Paste the Microsoft Forms link there and re-run to put one on the kiosk and the poster.');
}
