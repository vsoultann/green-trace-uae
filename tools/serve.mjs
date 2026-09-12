/** Tiny static server for local development: `npm run serve`. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const APP = path.join(path.resolve(import.meta.dirname, '..'), 'app');
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json',
};

http.createServer(async (req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(APP, rel);
  if (!file.startsWith(APP)) return res.writeHead(403).end();
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`Warif dev server — http://localhost:${PORT}/`));
