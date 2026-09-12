/**
 * Generates every Warif brand file from one source of truth.
 *
 *   node tools/brand.mjs
 *
 * The mark is a leaf split along its midrib: the left half smooth (nature), the
 * right half woven in rows (Al Sadu, and the pixel grid a camera actually sees),
 * with a concentric diamond at the heart where the model looks. Everything here
 * -- the colour variants, the app icons, the lockups, the Sadu band -- is
 * derived from that one drawing, so the identity cannot drift between files.
 *
 * Wordmark outlines come from tools/wordmark.py; run that first if the lockups
 * need regenerating.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const BRAND = path.join(ROOT, 'app', 'assets', 'brand');
const ICONS = path.join(ROOT, 'app', 'assets', 'icons');

/* ------------------------------------------------------------------ palette */

const C = {
  ghaf: '#2E6147',
  ghafLight: '#7FA88A',
  saduRed: '#B23A2C',
  dune: '#D9C6A0',
  wool: '#F6F3EA',
  ink: '#14231C',
  night: '#0F1712',
  onDarkLeaf: '#8FC19D',
  onDarkRows: '#5B8D6C',
  onDarkNode: '#D65A45',
  iconBg: '#1F4A36',
  iconLeaf: '#EDE6D6',
};

/* -------------------------------------------------------------------- mark */

// The ten woven rows, widening towards the middle of the blade exactly as a
// leaf does. y positions are on a 5.1 pitch so the gaps read as warp threads.
const ROWS = [
  [4.7, 3], [9.8, 7.5], [14.9, 10.5], [20, 12], [25.1, 13.5],
  [30.2, 13.5], [35.3, 12], [40.4, 10.5], [45.5, 7.5], [50.6, 3],
];

/**
 * The mark's inner geometry on a 64x64 grid.
 * @param {{leaf:string, rows:string, node:string, id:string}} colours
 */
function markBody({ leaf, rows, node, id }) {
  const woven = ROWS
    .map(([y, w]) => `<rect x="33.2" y="${y}" width="${w}" height="3.7"/>`)
    .join('');
  return `<defs><mask id="${id}"><rect width="64" height="64" fill="#fff"/><path d="M32 24.5L37 29.5 32 34.5 27 29.5Z"/></mask></defs>
<g mask="url(#${id})">
 <path d="M30.8 4A30.83 30.83 0 0 0 30.8 55Z" fill="${leaf}"/>
 <g fill="${rows}">${woven}</g>
 <rect x="30.8" y="53" width="2.4" height="8" rx="1.2" fill="${leaf}"/>
</g>
<path d="M32 27L34.5 29.5 32 32 29.5 29.5Z" fill="${node}"/>`;
}

function markSVG(colours, { label = 'Warif' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${label}"><title>${label}</title>
${markBody(colours)}
</svg>
`;
}

/* -------------------------------------------------------------- Sadu band */

// The band is the one loud thing in the whole identity. It is a real Sadu
// structure -- mirrored diamonds between solid selvedge rows -- written out as
// a pixel map so it stays a weave rather than becoming a decorative gradient.
const SADU_MAP = [
  'KKKKKKKKKKKKKK',
  'WWWWWWWWWWWWWW',
  'SSKRRRWWRRRKSS',
  'SKRRRWKKWRRRKS',
  'KRRRWKWWKWRRRK',
  'RRRWKWRRWKWRRR',
  'KRRRWKWWKWRRRK',
  'SKRRRWKKWRRRKS',
  'SSKRRRWWRRRKSS',
  'WWWWWWWWWWWWWW',
  'KKKKKKKKKKKKKK',
];

const SADU_INK = { K: C.ink, W: C.wool, R: C.saduRed, S: C.dune };

/**
 * The band as one repeatable tile. Adjacent same-colour cells are merged into a
 * single rect so the file stays small and the renderer has no hairline seams to
 * round differently from its neighbours.
 */
function saduTile(palette = SADU_INK) {
  const w = SADU_MAP[0].length;
  const h = SADU_MAP.length;
  const rects = [];
  SADU_MAP.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      let run = 1;
      while (x + run < w && row[x + run] === row[x]) run++;
      rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${palette[row[x]]}"/>`);
      x += run;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" role="presentation">
${rects.join('\n')}
</svg>
`;
}

/* --------------------------------------------------------------- lockups */

const marks = JSON.parse(await fs.readFile(path.join(ROOT, 'tools', 'wordmark-paths.json'), 'utf8'));

/** Places an outlined wordmark: scale to `size`, baseline at (x, y). */
function placeWord(key, { x, y, size, fill }) {
  const w = marks[key];
  const s = size / w.upem;
  return {
    svg: `<path transform="translate(${round(x)} ${round(y)}) scale(${round(s, 5)})" d="${w.path}" fill="${fill}"/>`,
    width: w.advance * s,
    top: y + w.yMax * -s,
    bottom: y + w.yMin * -s,
  };
}

const round = (n, p = 2) => Number(n.toFixed(p));

/**
 * Horizontal lockup: mark, wordmark, hairline divider, Arabic wordmark.
 * `rtl` mirrors the order so the Arabic leads, which is what the page does when
 * the interface is in Arabic.
 */
function horizontalLockup({ leaf, rows, node, ink, muted, rtl = false, id }) {
  const SIZE = 100;          // Latin cap size drives everything else
  const MARK = 116;
  const GAP = 30;
  const RULE_GAP = 26;
  const baseline = 100;

  const latin = marks.warif_latin.advance * (SIZE / marks.warif_latin.upem);
  const arabicSize = SIZE * 0.94;
  const arabic = marks.warif_arabic.advance * (arabicSize / marks.warif_arabic.upem);

  const parts = [];
  let x = 0;
  const order = rtl ? ['mark', 'arabic', 'rule', 'latin'] : ['mark', 'latin', 'rule', 'arabic'];

  for (const part of order) {
    if (part === 'mark') {
      parts.push(`<g transform="translate(0 ${round(baseline - MARK * 0.78)}) scale(${round(MARK / 64, 5)})">${markBody({ leaf, rows, node, id })}</g>`);
      x = MARK + GAP;
    } else if (part === 'latin') {
      parts.push(placeWord('warif_latin', { x, y: baseline, size: SIZE, fill: ink }).svg);
      x += latin + RULE_GAP;
    } else if (part === 'arabic') {
      parts.push(placeWord('warif_arabic', { x, y: baseline, size: arabicSize, fill: muted }).svg);
      x += arabic + RULE_GAP;
    } else {
      parts.push(`<rect x="${round(x)}" y="${round(baseline - 72)}" width="2" height="86" fill="${muted}" opacity=".5"/>`);
      x += 2 + RULE_GAP;
    }
  }

  const width = round(x - RULE_GAP);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -6 ${width} 132" role="img" aria-label="Warif وارف"><title>Warif — وارف</title>
${parts.join('\n')}
</svg>
`;
}

/** Stacked lockup: mark, the Arabic name large, then the Latin name tracked. */
function stackedLockup({ leaf, rows, node, ink, muted, id }) {
  const MARK = 150;
  const AR = 132;
  const CAPS = 46;

  const arW = marks.warif_arabic.advance * (AR / marks.warif_arabic.upem);
  const capsW = marks.warif_caps.advance * (CAPS / marks.warif_caps.upem);
  const width = round(Math.max(MARK, arW, capsW) + 40);
  const cx = width / 2;

  const arBase = MARK + 150;
  const capsBase = arBase + 78;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${round(capsBase + 22)}" role="img" aria-label="Warif وارف"><title>Warif — وارف</title>
<g transform="translate(${round(cx - MARK / 2)} 0) scale(${round(MARK / 64, 5)})">${markBody({ leaf, rows, node, id })}</g>
${placeWord('warif_arabic', { x: cx - arW / 2, y: arBase, size: AR, fill: ink }).svg}
${placeWord('warif_caps', { x: cx - capsW / 2, y: capsBase, size: CAPS, fill: muted }).svg}
</svg>
`;
}

/* ------------------------------------------------------------------ icons */

/** Rounded-square app icon: the mark at 0.86, or 0.66 for a maskable safe zone. */
function appIcon({ scale = 0.86, maskable = false }) {
  const S = 512;
  const size = S * scale;
  const off = (S - size) / 2;
  const bg = maskable
    ? `<rect width="${S}" height="${S}" fill="${C.iconBg}"/>`
    : `<rect width="${S}" height="${S}" rx="${round(S * 14 / 64)}" fill="${C.iconBg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" role="img" aria-label="Warif"><title>Warif</title>
${bg}
<g transform="translate(${round(off)} ${round(off)}) scale(${round(size / 64, 5)})">${markBody({ leaf: C.iconLeaf, rows: C.ghafLight, node: C.onDarkNode, id: maskable ? 'mk' : 'ak' })}</g>
</svg>
`;
}

/* -------------------------------------------------------------- OG image */

function ogImage() {
  const W = 1200;
  const H = 630;
  const tileW = SADU_MAP[0].length;
  const tileH = SADU_MAP.length;
  const bandH = 22;
  const scale = bandH / tileH;
  const cols = Math.ceil(W / (tileW * scale));

  const band = (y) =>
    `<g transform="translate(0 ${y}) scale(${round(scale, 5)})" shape-rendering="crispEdges">` +
    Array.from({ length: cols }, (_, i) =>
      `<g transform="translate(${i * tileW} 0)">${SADU_MAP.map((row, ry) => {
        const out = [];
        let x = 0;
        while (x < tileW) {
          let run = 1;
          while (x + run < tileW && row[x + run] === row[x]) run++;
          out.push(`<rect x="${x}" y="${ry}" width="${run}" height="1" fill="${SADU_INK[row[x]]}"/>`);
          x += run;
        }
        return out.join('');
      }).join('')}</g>`).join('') + '</g>';

  const arW = marks.warif_arabic.advance * (96 / marks.warif_arabic.upem);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${C.night}"/>
${band(0)}
${band(H - bandH)}
<g transform="translate(96 ${round(H / 2 - 96)}) scale(3)">${markBody({ leaf: C.onDarkLeaf, rows: C.onDarkRows, node: C.onDarkNode, id: 'og' })}</g>
${placeWord('warif_latin', { x: 348, y: 268, size: 132, fill: '#EAE5D8' }).svg}
${placeWord('warif_arabic', { x: 348, y: 386, size: 96, fill: C.onDarkLeaf }).svg}
<rect x="${round(348 + arW + 30)}" y="318" width="2" height="72" fill="${C.onDarkRows}"/>
<text x="${round(348 + arW + 56)}" y="374" font-family="Readex Pro, sans-serif" font-size="30" fill="#A9B4AA">Read the leaf. Keep the shade.</text>
<text x="348" y="452" font-family="Readex Pro, sans-serif" font-size="27" fill="#A9B4AA">AI tree identification and leaf health for the UAE</text>
</svg>
`;
}

/* ------------------------------------------------------------------- run */

await fs.mkdir(BRAND, { recursive: true });
await fs.mkdir(ICONS, { recursive: true });

const files = {
  [path.join(BRAND, 'warif-mark.svg')]: markSVG({ leaf: C.ghaf, rows: C.ghafLight, node: C.saduRed, id: 'm' }),
  [path.join(BRAND, 'warif-mark-dark.svg')]: markSVG({ leaf: C.onDarkLeaf, rows: C.onDarkRows, node: C.onDarkNode, id: 'md' }),
  [path.join(BRAND, 'warif-mark-mono.svg')]: markSVG({ leaf: 'currentColor', rows: 'currentColor', node: 'currentColor', id: 'mm' }),
  [path.join(BRAND, 'sadu-band.svg')]: saduTile(),
  [path.join(BRAND, 'warif-lockup.svg')]: horizontalLockup({ leaf: C.ghaf, rows: C.ghafLight, node: C.saduRed, ink: C.ink, muted: '#4A5B51', id: 'lh' }),
  [path.join(BRAND, 'warif-lockup-rtl.svg')]: horizontalLockup({ leaf: C.ghaf, rows: C.ghafLight, node: C.saduRed, ink: C.ink, muted: '#4A5B51', rtl: true, id: 'lr' }),
  [path.join(BRAND, 'warif-lockup-dark.svg')]: horizontalLockup({ leaf: C.onDarkLeaf, rows: C.onDarkRows, node: C.onDarkNode, ink: '#EAE5D8', muted: '#A9B4AA', id: 'ld' }),
  [path.join(BRAND, 'warif-lockup-stacked.svg')]: stackedLockup({ leaf: C.ghaf, rows: C.ghafLight, node: C.saduRed, ink: C.ink, muted: '#4A5B51', id: 'ls' }),
  [path.join(BRAND, 'warif-lockup-stacked-dark.svg')]: stackedLockup({ leaf: C.onDarkLeaf, rows: C.onDarkRows, node: C.onDarkNode, ink: '#EAE5D8', muted: '#A9B4AA', id: 'lsd' }),
  [path.join(ICONS, 'icon.svg')]: appIcon({ scale: 0.86 }),
  [path.join(ICONS, 'icon-maskable.svg')]: appIcon({ scale: 0.66, maskable: true }),
};

for (const [file, body] of Object.entries(files)) {
  await fs.writeFile(file, body);
  console.log(`  ${path.relative(ROOT, file)}  ${(body.length / 1024).toFixed(1)} KB`);
}

/* Rasterise the PWA icons and the social card. */
const raster = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon.svg', 'icon-180.png', 180],
  ['icon-maskable.svg', 'icon-maskable.png', 512],
];
for (const [src, out, size] of raster) {
  await sharp(path.join(ICONS, src)).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(ICONS, out));
  console.log(`  app/assets/icons/${out}  ${size}px`);
}

const og = path.join(ROOT, 'app', 'assets', 'og.png');
await sharp(Buffer.from(ogImage())).png({ compressionLevel: 9 }).toFile(og);
console.log('  app/assets/og.png  1200x630');

/* A PNG of each lockup, for the poster, the slide master and the workbook. */
for (const [name, width] of [['warif-lockup', 1600], ['warif-lockup-stacked', 900], ['warif-lockup-dark', 1600]]) {
  const out = path.join(BRAND, `${name}.png`);
  await sharp(path.join(BRAND, `${name}.svg`)).resize({ width }).png({ compressionLevel: 9 }).toFile(out);
  console.log(`  app/assets/brand/${name}.png  ${width}px wide`);
}

console.log('\nBrand assets rebuilt.');
