/**
 * Shared image -> MobileNetV2 feature-vector plumbing, used by the trainer.
 *
 * The browser and the trainer must agree bit-for-bit on preprocessing, so the
 * contract lives here: 224x224, RGB, scaled to [0,1]. This is a TF-Hub module
 * (note the `module_apply_default` node prefix) and TF-Hub image modules take
 * [0,1] input by convention.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';

export const IMAGE_SIZE = 224;
export const FEATURE_NODE = 'module_apply_default/MobilenetV2/Logits/AvgPool';
export const FEATURE_DIM = 1280;

const ROOT = path.resolve(import.meta.dirname, '..');

export async function initBackend() {
  setWasmPaths(
    path.join(ROOT, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + path.sep
  );
  await tf.setBackend('wasm');
  await tf.ready();
  return tf;
}

/** Loads the vendored MobileNetV2 graph model straight off the filesystem. */
export async function loadBase() {
  const dir = path.join(ROOT, 'app', 'model', 'mobilenet');
  const modelJson = JSON.parse(await fs.readFile(path.join(dir, 'model.json'), 'utf8'));

  const handler = {
    load: async () => {
      const specs = [];
      const buffers = [];
      for (const group of modelJson.weightsManifest) {
        specs.push(...group.weights);
        for (const p of group.paths) {
          const buf = await fs.readFile(path.join(dir, p));
          buffers.push(new Uint8Array(buf).buffer);
        }
      }
      // Concatenate shards into the single ArrayBuffer the loader expects.
      const total = buffers.reduce((a, b) => a + b.byteLength, 0);
      const merged = new Uint8Array(total);
      let off = 0;
      for (const b of buffers) { merged.set(new Uint8Array(b), off); off += b.byteLength; }
      return {
        modelTopology: modelJson.modelTopology,
        weightSpecs: specs,
        weightData: merged.buffer,
        format: modelJson.format,
        generatedBy: modelJson.generatedBy,
        convertedBy: modelJson.convertedBy,
      };
    },
  };

  return tf.loadGraphModel(handler);
}

/**
 * Decodes one image file into raw RGB at IMAGE_SIZE, applying an optional
 * augmentation recipe. Augmentation happens in sharp (fast, native) rather
 * than in tensor-land, which the WASM backend would make painful.
 */
export async function decode(file, aug = null) {
  let pipeline = sharp(file, { failOn: 'none' }).rotate();

  if (aug?.crop) {
    const meta = await pipeline.metadata();
    const side = Math.round(Math.min(meta.width, meta.height) * aug.crop);
    const left = Math.round((meta.width - side) * (aug.dx ?? 0.5));
    const top = Math.round((meta.height - side) * (aug.dy ?? 0.5));
    pipeline = pipeline.extract({ left, top, width: side, height: side });
  }

  pipeline = pipeline.resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' });

  if (aug?.flip) pipeline = pipeline.flop();
  if (aug?.rotate) pipeline = pipeline.rotate(aug.rotate, { background: '#ffffff' })
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'cover' });
  if (aug?.brightness || aug?.saturation) {
    pipeline = pipeline.modulate({
      brightness: aug.brightness ?? 1,
      saturation: aug.saturation ?? 1,
    });
  }

  const { data } = await pipeline.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return new Uint8Array(data);
}

/** Runs a batch of decoded images through the base model. Returns Float32Array. */
export function embedBatch(base, rawImages) {
  return tf.tidy(() => {
    const batch = tf.stack(
      rawImages.map((raw) =>
        tf.tensor3d(raw, [IMAGE_SIZE, IMAGE_SIZE, 3], 'float32').div(255)
      )
    );
    const feats = base.execute(batch, FEATURE_NODE);
    return feats.reshape([rawImages.length, FEATURE_DIM]);
  });
}

export { tf };
