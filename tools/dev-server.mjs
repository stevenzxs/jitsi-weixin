import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const allowed = path === '/' || path === '/index.html' || path === '/runtime-config.json' || /^\/src\/[a-z-]+\.(mjs|css)$/.test(path);
  if (!allowed) { res.writeHead(404); return res.end('Not found'); }
  try {
    const file = path === '/' ? '/index.html' : path;
    const data = await readFile(resolve(root, '.' + file));
    res.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not configured'); }
}).listen(4173, '127.0.0.1', () => console.log('H5 development server: http://127.0.0.1:4173 (loopback only)'));
