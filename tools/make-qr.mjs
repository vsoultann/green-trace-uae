/**
 * Generates the QR code the judges scan at the kiosk.
 *
 * SVG rather than PNG so it stays sharp on the printed stand and on a retina
 * phone, and so it costs about a kilobyte in the offline cache.
 *
 *   node tools/make-qr.mjs [url]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

const ROOT = path.resolve(import.meta.dirname, '..');
const url = process.argv[2] || 'https://vsoultann.github.io/green-trace-uae/';

// High error correction: a QR taped to a stand gets smudged, curled and glared
// at under exhibition lighting, and level H survives ~30% damage.
const svg = await QRCode.toString(url, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 2,
  width: 512,
  color: { dark: '#1d1710ff', light: '#ffffffff' },
});

await fs.writeFile(path.join(ROOT, 'app', 'assets', 'qr.svg'), svg);

// A print-resolution PNG for the physical stand.
await QRCode.toFile(path.join(ROOT, 'kiosk-qr.png'), url, {
  errorCorrectionLevel: 'H',
  margin: 3,
  width: 2000,
  color: { dark: '#1d1710ff', light: '#ffffffff' },
});

console.log(`QR written for ${url}`);
console.log('  app/assets/qr.svg  (in-app)');
console.log('  kiosk-qr.png       (2000px, for printing)');
