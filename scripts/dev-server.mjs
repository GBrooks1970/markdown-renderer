/**
 * Responsibility: serve the static page over http://localhost for local use and
 * for the Playwright `webServer`. Dependency-free (Node built-ins only), in
 * keeping with the project's no-dependency runtime.
 *
 * Why a server at all? The File System Access API needs a secure context
 * (localhost counts); `file://` only supports the fallback picker. Serving over
 * localhost lets you exercise both paths.
 *
 * Usage: `npm run dev`  (port from MR_PORT, default 4180)
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url))); // project root (parent of scripts/)
const port = Number.parseInt(process.env.MR_PORT ?? '4180', 10);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
  '.markdown': 'text/markdown; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/' || pathname.endsWith('/')) pathname += 'index.html';

    // Resolve safely inside root (block path traversal).
    const filePath = normalize(join(root, pathname));
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`markdown-renderer dev server: http://127.0.0.1:${port}/`);
});
