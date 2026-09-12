/**
 * The one piece of state that outlives a route change: the last scan.
 *
 * Kept in memory rather than in storage on purpose. A result holds a photograph
 * of whatever the last person pointed the camera at, and at a kiosk the next
 * visitor is a stranger — persisting it would mean their leaf greets somebody
 * else. Kiosk mode clears it on a timer as well.
 */

const state = {
  /** @type {null | {species, prediction, recognition, health, photo, overlay, at}} */
  scan: null,
};

const listeners = new Set();

export function lastScan() { return state.scan; }

export function setScan(result) {
  state.scan = result;
  emit();
}

export function clearScan() {
  state.scan = null;
  emit();
}

export function onScanChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() { for (const fn of listeners) fn(state.scan); }
