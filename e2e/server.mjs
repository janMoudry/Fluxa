#!/usr/bin/env node
// Simple static server for E2E testing. Serves project root files, /dist and /e2e/pages.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT_A = Number(process.env.PORT_A || 4178);
const PORT_B = Number(process.env.PORT_B || 4179);
const ROOT = process.cwd();

const mime = (p) => {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js':
    case '.mjs': return 'application/javascript; charset=utf-8';
    case '.cjs': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.map': return 'application/json; charset=utf-8';
    default: return 'text/plain; charset=utf-8';
  }
};

function resolvePath(urlPath) {
  // Normalize and prevent path traversal
  const clean = path.posix.normalize(urlPath).replace(/^\/+/, '/');

  if (clean.startsWith('/dist/')) {
    return path.join(ROOT, clean);
  }
  if (clean.startsWith('/e2e/pages/')) {
    return path.join(ROOT, clean);
  }
  // Allow accessing readme for sanity, not required though
  if (clean === '/' || clean === '/index.html') {
    return path.join(ROOT, 'e2e/pages/index.html');
  }
  // Fallback to e2e pages if referenced directly
  return path.join(ROOT, clean);
}

function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = resolvePath(url.pathname);

  // If path points to a directory, try index.html in that dir
  try {
    const st = fs.statSync(filePath);
    if (st.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {}

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime(filePath) });
    res.end(data);
  });
}

function start(port) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(port, () => {
      console.log(`[e2e] listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

await start(PORT_A);
await start(PORT_B);

// Keep process alive
process.stdin.resume();

