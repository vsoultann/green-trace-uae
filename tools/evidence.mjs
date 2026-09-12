/**
 * Copies the before-and-after screenshots the app itself needs into app/.
 *
 *   node tools/evidence.mjs
 *
 * docs/evidence holds the full evidence set at full resolution — that is the
 * workbook's material and it is deliberately outside the deployed folder, since
 * only app/ is published to Pages. The Journey page shows a handful of those
 * pairs in a slider, so those few are resized and copied in.
 *
 * Run it after regenerating either evidence set. The pairs it copies are read
 * from app/js/data/journey.js, so adding a comparison there is the only edit
 * needed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs', 'evidence');
const OUT = path.join(ROOT, 'app', 'evidence');

/* Read the pairs straight out of the data file rather than keeping a second
   list here that can fall out of step with it. */
const source = await fs.readFile(path.join(ROOT, 'app', 'js', 'data', 'journey.js'), 'utf8');
const block = source.slice(source.indexOf('export const COMPARISONS'));
const pairs = [...block.matchAll(/v1:\s*'([^']+)',\s*v2:\s*'([^']+)'/g)]
  .map(([, v1, v2]) => ({ v1, v2 }));

if (!pairs.length) { console.error('No COMPARISONS found in journey.js'); process.exit(1); }

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(path.join(OUT, 'v1'), { recursive: true });
await fs.mkdir(path.join(OUT, 'v2'), { recursive: true });

let copied = 0;
const missing = [];

for (const pair of pairs) {
  for (const version of ['v1', 'v2']) {
    const from = path.join(DOCS, version, pair[version]);
    const to = path.join(OUT, version, pair[version].replace(/\.png$/, '.jpg'));
    try {
      await sharp(from)
        .resize(1100, null, { withoutEnlargement: true })
        .jpeg({ quality: 78, mozjpeg: true })
        .toFile(to);
      copied += 1;
    } catch {
      missing.push(path.relative(ROOT, from));
    }
  }
}

console.log(`Copied ${copied} screenshots into app/evidence/`);
if (missing.length) {
  console.log('\nNot found yet (capture them and re-run):');
  for (const m of missing) console.log(`  ${m}`);
}
