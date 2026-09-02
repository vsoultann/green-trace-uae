/**
 * Leaf health analysis by classical computer vision.
 *
 * Deliberately *not* a neural network: every number below can be explained to a
 * judge in one sentence, and none of it needs training data. The pipeline is
 *
 *   1. segment the leaf away from the kiosk background,
 *   2. classify each leaf pixel as healthy / chlorotic / necrotic,
 *   3. measure colour uniformity and surface texture,
 *   4. fold those into a single 0-100 score with named findings.
 *
 * Everything runs on a downscaled copy, so a 12-megapixel phone photo costs the
 * same as a thumbnail.
 */

const WORK = 384; // analysis resolution, long edge

/* ---------- colour helpers ---------- */

/** sRGB (0-255) to HSV with h in degrees, s and v in 0..1. */
function rgbToHsv(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

/**
 * Is this pixel plant tissue rather than backdrop?
 *
 * Accepts green *and* yellow *and* brown, because excluding discoloured tissue
 * would make every sick leaf score as healthy -- the classic trap with an
 * Excess-Green-only mask. Rejects the near-grey, near-white and near-black
 * pixels that paper, tabletops and shadow produce.
 */
function isTissue(h, s, v, exg) {
  if (v < 0.07 || v > 0.985) return false;          // crushed black / blown white
  if (s < 0.16) return false;                        // grey card, paper, metal
  const plantHue = (h >= 15 && h <= 175);            // brown -> yellow -> green -> cyan
  if (!plantHue) return false;
  // A strongly saturated non-green (a red table, a blue cloth) still gets in on
  // hue alone, so require either real greenness or a muted, leaf-like tone.
  return exg > -18 || s < 0.75;
}

/* ---------- main entry ---------- */

/**
 * @param {CanvasImageSource} source  an <img>, <canvas> or <video> frame
 * @returns {object} metrics, findings and an overlay canvas
 */
export function analyseLeaf(source) {
  const sw = source.naturalWidth || source.videoWidth || source.width;
  const sh = source.naturalHeight || source.videoHeight || source.height;
  const scale = WORK / Math.max(sw, sh);
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const px = img.data;

  const n = w * h;
  const mask = new Uint8Array(n);       // 1 = leaf tissue
  const cls = new Uint8Array(n);        // 0 none, 1 healthy, 2 chlorotic, 3 necrotic
  const grey = new Float32Array(n);
  const hues = [];

  let tissue = 0, healthy = 0, chlorotic = 0, necrotic = 0;
  let exgSum = 0;

  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = px[p], g = px[p + 1], b = px[p + 2];
    grey[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    const exg = 2 * g - r - b;
    const [hu, sa, va] = rgbToHsv(r, g, b);

    if (!isTissue(hu, sa, va, exg)) continue;

    mask[i] = 1;
    tissue++;
    exgSum += exg;
    hues.push(hu);

    // Necrosis: dead tissue is dark and brown/red, or a dry pale tan.
    const dark = va < 0.42;
    const brown = hu < 42;
    if (brown && (dark || sa > 0.45) && exg < 12) {
      cls[i] = 3; necrotic++;
    } else if (hu >= 38 && hu <= 78 && exg < 34) {
      // Chlorosis: the leaf has drifted from green towards yellow.
      cls[i] = 2; chlorotic++;
    } else {
      cls[i] = 1; healthy++;
    }
  }

  const coverage = tissue / n;

  // Not enough leaf in frame to say anything honest about it.
  if (tissue < n * 0.02) {
    return {
      valid: false,
      coverage,
      metrics: { chlorosis: 0, necrosis: 0, greenness: 0, uniformity: 0, texture: 0, coverage },
      score: null,
      band: null,
      findings: [{ level: 'warn', key: 'noLeaf' }],
      overlay: cv,
    };
  }

  const chlorosis = chlorotic / tissue;
  const necrosis = necrotic / tissue;
  const meanExg = exgSum / tissue;
  // Map mean Excess Green onto 0..1; 90 is a vivid, well-watered leaf.
  const greenness = Math.min(1, Math.max(0, meanExg / 90));

  // Colour uniformity: circular standard deviation of hue. A blotchy, mottled
  // leaf spreads its hues; an even one clusters them tightly.
  let sx = 0, sy = 0;
  for (const hu of hues) {
    const rad = (hu * Math.PI) / 180;
    sx += Math.cos(rad); sy += Math.sin(rad);
  }
  const R = Math.sqrt(sx * sx + sy * sy) / hues.length;
  const circSd = Math.sqrt(Math.max(0, -2 * Math.log(Math.max(R, 1e-6)))); // radians
  const uniformity = Math.min(1, Math.max(0, 1 - circSd / 0.85));

  // Texture: mean absolute Laplacian inside the mask, normalised. Spotting,
  // lesions and insect damage all raise local high-frequency energy.
  let lapSum = 0, lapCount = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const lap = Math.abs(
        4 * grey[i] - grey[i - 1] - grey[i + 1] - grey[i - w] - grey[i + w]
      );
      lapSum += lap; lapCount++;
    }
  }
  const texture = lapCount ? Math.min(1, lapSum / lapCount / 42) : 0;

  /* ---------- score ---------- */

  // Penalties are deliberately asymmetric: dead tissue is a far worse sign than
  // the same area of yellowing, and mottling matters more than overall pallor.
  let score = 100;
  score -= necrosis * 145;
  score -= chlorosis * 68;
  score -= (1 - uniformity) * 26;
  score -= Math.max(0, 0.55 - greenness) * 42;
  score -= Math.max(0, texture - 0.42) * 40;
  score = Math.round(Math.min(100, Math.max(0, score)));

  const band =
    score >= 85 ? 'excellent' :
    score >= 70 ? 'good' :
    score >= 52 ? 'fair' :
    score >= 32 ? 'poor' : 'critical';

  /* ---------- findings ---------- */

  const findings = [];
  const pct = (x) => Math.round(x * 100);

  if (necrosis >= 0.18) findings.push({ level: 'bad', key: 'necrosisHigh', v: pct(necrosis) });
  else if (necrosis >= 0.06) findings.push({ level: 'warn', key: 'necrosisSome', v: pct(necrosis) });

  if (chlorosis >= 0.35) findings.push({ level: 'bad', key: 'chlorosisHigh', v: pct(chlorosis) });
  else if (chlorosis >= 0.14) findings.push({ level: 'warn', key: 'chlorosisSome', v: pct(chlorosis) });

  if (uniformity < 0.55) findings.push({ level: 'warn', key: 'mottled' });
  if (texture > 0.6) findings.push({ level: 'warn', key: 'texture' });
  if (greenness < 0.34) findings.push({ level: 'warn', key: 'pale' });
  if (coverage < 0.14) findings.push({ level: 'warn', key: 'smallLeaf', v: pct(coverage) });

  if (!findings.length) findings.push({ level: 'ok', key: 'clean' });
  if (necrosis < 0.03 && chlorosis < 0.08) findings.unshift({ level: 'ok', key: 'evenColour' });

  /* ---------- overlay ---------- */

  // Tint the classified pixels so the user can see *where* the damage is.
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    if (cls[i] === 2) {            // chlorotic -> amber wash
      px[p] = Math.min(255, px[p] * 0.55 + 232 * 0.45);
      px[p + 1] = Math.min(255, px[p + 1] * 0.55 + 176 * 0.45);
      px[p + 2] = px[p + 2] * 0.45;
    } else if (cls[i] === 3) {     // necrotic -> red wash
      px[p] = Math.min(255, px[p] * 0.45 + 226 * 0.55);
      px[p + 1] = px[p + 1] * 0.4;
      px[p + 2] = px[p + 2] * 0.4;
    } else if (cls[i] === 0) {     // background -> desaturate and dim
      const gl = grey[i] * 0.55;
      px[p] = gl; px[p + 1] = gl; px[p + 2] = gl;
    }
  }
  ctx.putImageData(img, 0, 0);

  return {
    valid: true,
    score,
    band,
    metrics: { chlorosis, necrosis, greenness, uniformity, texture, coverage },
    findings,
    overlay: cv,
  };
}

/** Human-readable finding text, kept next to the analyser that produces it. */
export const FINDING_TEXT = {
  en: {
    clean: 'No significant discolouration or damage detected.',
    evenColour: 'Colour is even across the blade — a good sign.',
    necrosisHigh: (v) => `${v}% of the leaf is dead brown tissue. This is advanced damage — likely fungal blight, scorch or late-stage pest attack.`,
    necrosisSome: (v) => `${v}% necrotic tissue: small dead patches, often the first sign of leaf-spot disease or sun scorch.`,
    chlorosisHigh: (v) => `${v}% of the leaf has yellowed. Widespread chlorosis usually means nutrient deficiency (iron or nitrogen) or salt stress from irrigation water.`,
    chlorosisSome: (v) => `${v}% yellowing detected — early nutrient or watering stress.`,
    mottled: 'Colour is mottled rather than even, which is typical of viral infection or uneven nutrient uptake.',
    texture: 'High surface texture variance: pitting, lesions or insect feeding damage.',
    pale: 'Overall greenness is low — the leaf is pale, suggesting reduced chlorophyll.',
    smallLeaf: (v) => `The leaf fills only ${v}% of the frame; move closer for a more reliable reading.`,
    noLeaf: 'No leaf could be separated from the background. Use a plain, contrasting backdrop and fill more of the frame.',
  },
  ar: {
    clean: 'لم يُرصد تغيّر لوني أو ضرر ملحوظ.',
    evenColour: 'اللون متجانس على كامل النصل، وهذه علامة جيدة.',
    necrosisHigh: (v) => `${v}٪ من الورقة نسيج بني ميت. ضرر متقدم، غالباً لفحة فطرية أو احتراق شمسي أو إصابة حشرية متأخرة.`,
    necrosisSome: (v) => `${v}٪ نسيج متنخر: بقع ميتة صغيرة، وهي غالباً أول علامات تبقع الأوراق أو الاحتراق الشمسي.`,
    chlorosisHigh: (v) => `${v}٪ من الورقة اصفرّت. الاصفرار الواسع يعني عادةً نقص المغذيات (الحديد أو النيتروجين) أو إجهاداً ملحياً من مياه الري.`,
    chlorosisSome: (v) => `رُصد اصفرار بنسبة ${v}٪ — إجهاد مبكر في التغذية أو الري.`,
    mottled: 'اللون مبقّع وغير متجانس، وهو نمط شائع في الإصابات الفيروسية أو عدم انتظام امتصاص المغذيات.',
    texture: 'تباين عالٍ في ملمس السطح: تنقّر أو تقرحات أو أثر تغذية حشرات.',
    pale: 'درجة الخضرة منخفضة والورقة شاحبة، ما يشير إلى نقص الكلوروفيل.',
    smallLeaf: (v) => `الورقة تملأ ${v}٪ فقط من الإطار؛ اقترب أكثر للحصول على قراءة أدق.`,
    noLeaf: 'تعذّر فصل الورقة عن الخلفية. استخدم خلفية سادة مغايرة واملأ الإطار بالورقة.',
  },
};
