/**
 * Hash router.
 *
 * Hash routes rather than the History API because the app is served from a
 * GitHub Pages project path with no server-side rewriting: a real URL path
 * would 404 on a refresh, which is exactly what an evaluator does when they
 * want to check that something works twice.
 *
 * Views are loaded on demand. The shell — router, i18n, themes, chrome — is
 * what has to be on screen fast; the poster and the slide deck can arrive when
 * somebody asks for them. The service worker precaches all of it anyway, so
 * "on demand" costs nothing after the first visit.
 */

/**
 * Every route, in one table.
 *
 * `load` is a dynamic import. `chrome: 'bare'` means the view paints the whole
 * window itself — kiosk, slides and poster all hide the app's navigation, for
 * the same reason a projector does not show your dock.
 */
const ROUTES = [
  { id: 'scan', path: '/', load: () => import('./views/scan.js') },
  { id: 'result', path: '/result', load: () => import('./views/result.js') },
  { id: 'trees', path: '/trees', load: () => import('./views/trees.js') },
  { id: 'tree', path: '/trees/:key', load: () => import('./views/tree.js') },
  { id: 'help', path: '/help', load: () => import('./views/help.js') },
  { id: 'project', path: '/project', load: () => import('./views/project.js') },
  { id: 'how', path: '/project/how', load: () => import('./views/how.js') },
  { id: 'lab', path: '/project/lab', load: () => import('./views/lab.js') },
  { id: 'journey', path: '/project/journey', load: () => import('./views/journey.js') },
  { id: 'team', path: '/team', load: () => import('./views/team.js') },
  { id: 'feedback', path: '/feedback', load: () => import('./views/feedback.js') },
  { id: 'brand', path: '/brand', load: () => import('./views/brand.js') },
  { id: 'showcase', path: '/showcase', chrome: 'bare', load: () => import('./views/showcase.js') },
  { id: 'present', path: '/present', chrome: 'bare', load: () => import('./views/present.js') },
  { id: 'poster', path: '/poster', chrome: 'bare', load: () => import('./views/poster.js') },
];

/**
 * v1's routes, kept working.
 *
 * A QR code printed for the v1 kiosk, a link in the workbook, a bookmark on the
 * supervisor's laptop — none of them should break because the app was renamed.
 * `:rest` carries the tail of the old path through to the new one.
 */
const REDIRECTS = [
  [/^\/scan\/?$/, () => '/'],
  [/^\/library\/?$/, () => '/trees'],
  [/^\/tree\/([^/]+)$/, (m) => `/trees/${m[1]}`],
  [/^\/nearby\/?$/, () => '/help'],
  [/^\/about\/?$/, () => '/project'],
  [/^\/model\/?$/, () => '/project/how'],
];

/** Turns '/trees/:key' into a matcher that also extracts the parameters. */
function compile(path) {
  const names = [];
  const source = path
    .split('/')
    .map((seg) => {
      if (!seg.startsWith(':')) return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      names.push(seg.slice(1));
      return '([^/]+)';
    })
    .join('/');
  return { re: new RegExp(`^${source}/?$`), names };
}

for (const route of ROUTES) Object.assign(route, compile(route.path));

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathname, query = ''] = raw.split('?');
  return {
    pathname: pathname.startsWith('/') ? pathname : `/${pathname}`,
    query: new URLSearchParams(query),
  };
}

/** Resolves a pathname, following a v1 redirect if there is one. */
export function resolve(pathname) {
  for (const [re, to] of REDIRECTS) {
    const m = pathname.match(re);
    if (m) return { redirect: to(m) };
  }
  for (const route of ROUTES) {
    const m = pathname.match(route.re);
    if (m) {
      const params = {};
      route.names.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
  }
  return { route: null, params: {} };
}

export function go(path, { replace = false } = {}) {
  const next = `#${path}`;
  if (location.hash === next) return;
  if (replace) history.replaceState(null, '', next);
  else location.hash = next;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export const routeIds = ROUTES.map((r) => r.id);
export const routePaths = ROUTES.map((r) => r.path);

/**
 * Starts routing.
 *
 * @param {{onRender:(ctx:object)=>Promise<void>, onMissing:(ctx:object)=>void}} handlers
 */
export function start(handlers) {
  let token = 0;
  let cleanup = null;

  async function render() {
    const mine = ++token;
    const { pathname, query } = parseHash();
    const match = resolve(pathname);

    if (match.redirect) {
      go(match.redirect, { replace: true });
      return;
    }

    if (cleanup) { try { cleanup(); } catch { /* a view's teardown must not block the next one */ } cleanup = null; }

    if (!match.route) { handlers.onMissing({ pathname, query }); return; }

    const module = await match.route.load();
    if (mine !== token) return; // a faster click won; drop this one

    cleanup = await handlers.onRender({
      route: match.route,
      view: module.default ?? module,
      params: match.params,
      query,
      pathname,
    });
  }

  window.addEventListener('hashchange', render);
  return render();
}
