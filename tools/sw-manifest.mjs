/**
 * Regenerates the service worker's precache list and cache name.
 *
 *   node tools/sw-manifest.mjs
 *
 * The list used to be maintained by hand, which is a promise nobody keeps: a
 * new view module gets added, the list does not, and the kiosk works perfectly
 * in every rehearsal and then fails offline on the day because one file was
 * never cached. So the list is generated from what is actually in app/.
 *
 * The cache name carries a hash of every file's contents. "Bump the version
 * when you change something" is the same unkept promise in a different costume;
 * this way a changed byte anywhere produces a new cache name, and the activate
 * step deletes the old one.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

const gzip = promisify(zlib.gzip);

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'app');

/** Not served, or served but never worth holding offline. */
const SKIP = new Set(['sw.js', '.DS_Store']);
const SKIP_DIRS = new Set(['.git']);

async function walk(dir, base = '') {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (SKIP.has(rel) || SKIP_DIRS.has(entry.name)) continue;
    if (entry.isDirectory()) out.push(...await walk(path.join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

const files = (await walk(APP)).sort();

/* The hash covers contents, not names alone: editing a CSS file has to produce
   a new cache even though the file list is identical. */
const hash = crypto.createHash('sha256');
for (const rel of files) {
  hash.update(rel);
  hash.update(await fs.readFile(path.join(APP, rel)));
}
const version = hash.digest('hex').slice(0, 8);

/* './' is the navigation entry and is not a file on disk. index.html is listed
   too because the navigation fallback matches on it by name. */
const shell = ['./', ...files.map((f) => `./${f}`)];

const swPath = path.join(APP, 'sw.js');
let sw = await fs.readFile(swPath, 'utf8');

sw = sw.replace(/const CACHE = '[^']*';/, `const CACHE = 'warif-v1-${version}';`);
sw = sw.replace(
  /const SHELL = \[[\s\S]*?\n\];/,
  `const SHELL = [\n${shell.map((f) => `  '${f}',`).join('\n')}\n];`,
);

await fs.writeFile(swPath, sw);

/* The payload figure lives here rather than in the benchmark because this tool
   already has every file open, and it runs on every change — so the number on
   the Test Lab page cannot go stale between benchmark runs.

   "Shell" is the interface itself — the page, every stylesheet, every view
   module and both typefaces. It excludes the model weights and the TensorFlow.js
   runtime (the engine, downloaded after first paint and then cached forever) and
   the photographs, screenshots and icons (content, not interface). Both the raw
   and the gzipped size are recorded, because Pages serves it compressed and
   quoting the uncompressed figure would overstate what anyone waits for. */
const IS_SHELL = (f) => f === 'index.html'
  || f === 'manifest.webmanifest'
  || f.startsWith('css/')
  || f.startsWith('js/')
  || f.startsWith('assets/fonts/');

let totalBytes = 0;
let shellBytes = 0;
let shellGzipBytes = 0;
for (const rel of files) {
  const body = await fs.readFile(path.join(APP, rel));
  totalBytes += body.length;
  if (!IS_SHELL(rel)) continue;
  shellBytes += body.length;
  // woff2, png and jpg are already compressed; gzipping them again is noise.
  shellGzipBytes += /\.(woff2|png|jpg|jpeg|webp)$/.test(rel)
    ? body.length
    : (await gzip(body, { level: 9 })).length;
}

console.log(`Cache name  warif-v1-${version}`);
console.log(`Precaching  ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`Shell       ${(shellGzipBytes / 1024).toFixed(1)} KB over the wire`
  + ` (${(shellBytes / 1024).toFixed(1)} KB raw) — page, CSS, every view, both typefaces`);

/* Merge into the lab report rather than replacing it: the benchmark owns every
   other field there and takes ten minutes to produce them. */
const labPath = path.join(APP, 'data', 'lab.json');
try {
  const lab = JSON.parse(await fs.readFile(labPath, 'utf8'));
  lab.payload = {
    measuredAt: new Date().toISOString(),
    files: files.length,
    totalBytes,
    shellBytes,
    shellGzipBytes,
    budgetBytes: 250 * 1024,
  };
  await fs.writeFile(labPath, `${JSON.stringify(lab, null, 2)}\n`);
  console.log('Updated    app/data/lab.json (payload)');
} catch {
  // No lab.json yet: npm run bench writes it, and this runs again after.
}
