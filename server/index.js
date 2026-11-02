import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from './db.js';
import { createApiHandler } from './api.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const uploads = path.join(root, 'public', 'uploads');
const pool = createPool();
const api = createApiHandler(pool, process.env);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2' };

const server = createServer(async (req, res) => {
  try {
    if (req.url?.startsWith('/api/')) return await api(req, res);
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    const isUpload = pathname.startsWith('/uploads/');
    const base = isUpload ? uploads : dist;
    const candidate = path.resolve(base, `.${pathname}`);
    const safePath = candidate.startsWith(`${base}${path.sep}`) ? candidate : path.join(dist, 'index.html');
    let target = safePath;
    try { if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html'); }
    catch { target = path.join(dist, 'index.html'); }
    const data = await readFile(target);
    res.writeHead(200, { 'content-type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
    res.end(data);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Unable to serve the storefront.');
  }
});

const port = Number(process.env.API_PORT || process.env.PORT || 3001);
server.listen(port, '0.0.0.0', () => console.log(`Spidy server listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await pool.end(); process.exit(0); }));
