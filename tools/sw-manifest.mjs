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

const bytes = (await Promise.all(files.map(async (f) => (await fs.stat(path.join(APP, f))).size)))
  .reduce((a, b) => a + b, 0);

console.log(`Cache name  warif-v1-${version}`);
console.log(`Precaching  ${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
