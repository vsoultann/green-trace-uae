/**
 * Motion orchestration.
 *
 * CSS in anim.css owns the *look* of each animation; this module owns the
 * *timing* — when to stagger, what to count up, where the tab indicator sits —
 * plus the ambient leaf field, which needs a canvas.
 *
 * Three motion states are supported and stored under `gt.motion`:
 *   'auto' (default) — follow the operating system's reduced-motion setting
 *   'on'             — full motion even if the OS asks for less
 *   'off'            — no animation at all
 */

const KEY = 'gt.motion';

export function motionPref() {
  return localStorage.getItem(KEY) || 'auto';
}

/** True when animations should actually run right now. */
export function motionOn() {
  const pref = motionPref();
  if (pref === 'off') return false;
  if (pref === 'on') return true;
  return !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function setMotion(pref) {
  localStorage.setItem(KEY, pref);
  applyMotion();
  window.dispatchEvent(new CustomEvent('gt:motion', { detail: pref }));
}

export function applyMotion() {
  const pref = motionPref();
  const root = document.documentElement;
  if (pref === 'auto') root.removeAttribute('data-motion');
  else root.setAttribute('data-motion', pref);
  if (motionOn()) startLeafField(); else stopLeafField();
}

/* ------------------------------------------------------- route transition */

/**
 * Fades the outgoing view out, swaps the markup, fades the new one in.
 * @param {HTMLElement} el   the view container
 * @param {() => void} swap  callback that replaces the content
 */
export function transitionView(el, swap) {
  if (!motionOn()) { swap(); return; }
  el.classList.remove('route-in');
  el.classList.add('route-out');
  const finish = () => {
    el.classList.remove('route-out');
    swap();
    el.classList.add('route-in');
    el.addEventListener('animationend', () => el.classList.remove('route-in'), { once: true });
  };
  let done = false;
  const once = () => { if (!done) { done = true; finish(); } };
  el.addEventListener('animationend', once, { once: true });
  setTimeout(once, 180); // don't strand the view if the animation never fires
}

/** Gives each element a staggered reveal delay. */
export function stagger(nodes, step = 70, start = 40) {
  if (!motionOn()) return;
  [...nodes].forEach((n, i) => {
    n.style.setProperty('--d', `${start + i * step}ms`);
    n.classList.add('reveal');
  });
}

/* -------------------------------------------------------- number counting */

/**
 * Counts an element's text from 0 up to `to`. Uses an ease-out curve so the
 * number lands softly instead of stopping dead.
 */
export function countUp(el, to, { suffix = '', duration = 900, decimals = 0 } = {}) {
  if (!el) return;
  if (!motionOn()) { el.textContent = to.toFixed(decimals) + suffix; return; }
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (to * eased).toFixed(decimals) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Animates a .confbar fill from zero to its target width. */
export function fillBars(root) {
  root.querySelectorAll('.confbar i').forEach((bar, i) => {
    const target = bar.style.width;
    if (!motionOn()) return;
    bar.style.width = '0%';
    bar.parentElement.classList.add('shine');
    setTimeout(() => { bar.style.width = target; }, 120 + i * 90);
  });
}

/** Redraws the health dial from empty. */
export function drawDial(root) {
  const ring = root.querySelector('.dial circle:last-of-type');
  if (!ring || !motionOn()) return;
  const target = ring.getAttribute('stroke-dashoffset');
  ring.setAttribute('stroke-dashoffset', ring.getAttribute('stroke-dasharray'));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ring.setAttribute('stroke-dashoffset', target);
  }));
}

/* --------------------------------------------------------------- ripples */

/** Delegated click ripple for every button-like surface. */
export function initRipples() {
  document.addEventListener('pointerdown', (e) => {
    if (!motionOn()) return;
    const host = e.target.closest('.btn, .iconbtn, .species-card, .theme-opt');
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const dot = document.createElement('span');
    dot.className = 'ripple';
    dot.style.width = dot.style.height = `${size}px`;
    dot.style.left = `${e.clientX - rect.left - size / 2}px`;
    dot.style.top = `${e.clientY - rect.top - size / 2}px`;
    host.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  }, { passive: true });
}

/* --------------------------------------------------------- tab indicator */

/** Slides the accent bar above the bottom tab bar onto the active tab. */
export function moveTabIndicator() {
  const bar = document.querySelector('.tabbar');
  const active = bar?.querySelector('a[aria-current="page"]');
  if (!bar || !active) return;
  const barBox = bar.getBoundingClientRect();
  const box = active.getBoundingClientRect();
  bar.style.setProperty('--tab-w', `${box.width}px`);
  bar.style.setProperty('--tab-x', `${box.left - barBox.left}px`);
}

/* ------------------------------------------------------ ambient leaf field */

let field = null;
let raf = 0;

/**
 * A very light drifting-leaf background. Capped at 18 particles and paused
 * whenever the tab is hidden, so it costs effectively nothing on a phone.
 */
function startLeafField() {
  if (field) return;
  field = document.createElement('canvas');
  field.id = 'leaf-field';
  field.setAttribute('aria-hidden', 'true');
  document.body.appendChild(field);
  const ctx = field.getContext('2d');

  let w = 0, h = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    w = innerWidth; h = innerHeight;
    field.width = w * dpr; field.height = h * dpr;
    field.style.width = `${w}px`; field.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize, { passive: true });

  const leaves = Array.from({ length: 18 }, () => spawn(w, h, true));

  function spawn(W, H, anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : -30,
      r: 5 + Math.random() * 9,
      vy: 0.16 + Math.random() * 0.42,
      vx: -0.22 + Math.random() * 0.44,
      spin: (-0.5 + Math.random()) * 0.012,
      a: Math.random() * Math.PI * 2,
      alpha: 0.1 + Math.random() * 0.22,
    };
  }

  const accent = () => getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#b8791f';

  function frame() {
    ctx.clearRect(0, 0, w, h);
    const colour = accent();
    for (let i = 0; i < leaves.length; i++) {
      const l = leaves[i];
      l.y += l.vy; l.x += l.vx + Math.sin(l.y / 90) * 0.28; l.a += l.spin;
      if (l.y - l.r > h) leaves[i] = spawn(w, h, false);

      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.a);
      ctx.globalAlpha = l.alpha;
      ctx.fillStyle = colour;
      // A simple two-arc leaf silhouette.
      ctx.beginPath();
      ctx.moveTo(0, -l.r);
      ctx.quadraticCurveTo(l.r * 0.82, 0, 0, l.r);
      ctx.quadraticCurveTo(-l.r * 0.82, 0, 0, -l.r);
      ctx.fill();
      ctx.restore();
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (field) raf = requestAnimationFrame(frame);
  });
}

function stopLeafField() {
  cancelAnimationFrame(raf);
  field?.remove();
  field = null;
}

/** Briefly enables colour transitions so a theme swap cross-fades. */
export function flashThemeShift() {
  if (!motionOn()) return;
  const root = document.documentElement;
  root.classList.add('theme-shift');
  setTimeout(() => root.classList.remove('theme-shift'), 360);
}
