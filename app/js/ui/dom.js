/**
 * The small set of helpers every view is written with.
 *
 * Views return HTML strings and the router puts them on the page. That is a
 * deliberate choice for a no-build project: it keeps each view readable as the
 * markup it produces, and the whole app is small enough that re-rendering a
 * route costs nothing measurable. The one rule that makes it safe is that
 * anything from data goes through `esc`, and `html` does it automatically.
 */

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Tagged template that escapes every interpolation.
 *
 * Arrays are joined, so `${items.map(row)}` works without a `.join('')` at
 * every call site. Anything already built by a component is wrapped in `raw()`
 * to opt out — that wrapper is the only way to inject markup, which makes an
 * accidental injection something you have to type on purpose.
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += render(values[i]) + strings[i + 1];
  }
  return out;
}

function render(v) {
  if (v == null || v === false) return '';
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return esc(v);
}

class Raw {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

/** Marks a string as already-safe markup. */
export const raw = (value) => new Raw(Array.isArray(value) ? value.join('') : String(value ?? ''));

/** Conditional markup without a dangling `: ''` at every call site. */
export const when = (cond, value) => (cond ? raw(typeof value === 'function' ? value() : value) : raw(''));

/* ---------------------------------------------------------------- querying */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Delegated listener: one handler for a list that re-renders under it. */
export function delegate(root, event, selector, handler) {
  root.addEventListener(event, (e) => {
    const target = e.target instanceof Element ? e.target.closest(selector) : null;
    if (target && root.contains(target)) handler(e, target);
  });
}

/* ------------------------------------------------------------------ create */

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/* ------------------------------------------------------------------- misc */

/** Politely announce something to a screen reader without moving focus. */
export function announce(message) {
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  // A same-value write is not announced, so let the DOM settle between them.
  requestAnimationFrame(() => { live.textContent = message; });
}

let toastTimer = null;
export function toast(message) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = message;
  node.dataset.show = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.dataset.show = '0'; }, 2600);
  announce(message);
}

/** A stable id for aria-labelledby and friends. */
let seq = 0;
export const uid = (prefix = 'w') => `${prefix}${(seq += 1)}`;

/** mm:ss, for the presentation timer. */
export function clock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
