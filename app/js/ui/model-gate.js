/**
 * One loader, many listeners.
 *
 * `loadModel()` in model.js takes a single progress callback and only honours
 * the first caller's, which is correct for what it is — a loader — and wrong for
 * what the interface needs. The shell starts the download after first paint so
 * the 14 MB is already arriving by the time anyone presses Scan, and the scan
 * view, the kiosk and the test lab all want to draw the same progress.
 *
 * So the gate owns the one call and broadcasts. model.js stays untouched.
 */
import { loadModel } from '../model.js';

const listeners = new Set();
const state = { phase: 'idle', fraction: 0, label: '', error: null };
let promise = null;

function emit() {
  for (const fn of listeners) fn({ ...state });
}

/**
 * Starts the load, or returns the one already in flight.
 * Safe to call from anywhere, as often as you like.
 */
export function ensureModel() {
  if (promise) return promise;

  state.phase = 'loading';
  state.fraction = 0;
  state.error = null;
  emit();

  promise = loadModel((fraction, label) => {
    state.fraction = fraction;
    state.label = label;
    emit();
  }).then((loaded) => {
    state.phase = 'ready';
    state.fraction = 1;
    emit();
    return loaded;
  }).catch((err) => {
    state.phase = 'error';
    state.error = err;
    emit();
    promise = null; // a failed download should be retryable
    throw err;
  });

  return promise;
}

export function modelState() { return { ...state }; }

/** Subscribe. The current state is delivered immediately, then on every change. */
export function onModelProgress(fn) {
  listeners.add(fn);
  fn({ ...state });
  return () => listeners.delete(fn);
}
