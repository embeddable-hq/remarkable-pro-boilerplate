/**
 * build-server.mjs
 * Tiny HTTP server (port 5211) that runs embeddable:build and npm run ct
 * from the boilerplate repo root and streams results back to the sandbox UI.
 *
 * Endpoints:
 *   POST /api/build   — run embeddable:build
 *   POST /api/ct      — run npm run ct (tsc --noEmit)
 *   GET  /api/status  — last cached result for both
 */

import { createServer } from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PORT = 5211;

// Cache of last results
const cache = {
  build: null,
  ct: null,
};

function runCommand(cmd, args, cwd) {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';

    const child = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        code,
        stdout,
        stderr,
        duration: Date.now() - start,
        runAt: new Date().toISOString(),
      });
    });

    child.on('error', (err) => {
      resolve({
        success: false,
        code: -1,
        stdout,
        stderr: stderr + '\n' + err.message,
        duration: Date.now() - start,
        runAt: new Date().toISOString(),
      });
    });
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? '/';

  if (req.method === 'GET' && url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ build: cache.build, ct: cache.ct }));
    return;
  }

  if (req.method === 'POST' && url === '/api/build') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // Mark as running
    cache.build = { running: true, runAt: new Date().toISOString() };
    res.end(JSON.stringify({ started: true }));
    // Run in background
    runCommand('npm', ['run', 'embeddable:build'], REPO_ROOT).then((result) => {
      cache.build = { ...result, running: false };
      console.log('[build-server] embeddable:build finished, success=', result.success);
    });
    return;
  }

  if (req.method === 'POST' && url === '/api/ct') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    cache.ct = { running: true, runAt: new Date().toISOString() };
    res.end(JSON.stringify({ started: true }));
    runCommand('npx', ['tsc', '--noEmit'], REPO_ROOT).then((result) => {
      cache.ct = { ...result, running: false };
      console.log('[build-server] ct finished, success=', result.success);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[build-server] Port ${PORT} already in use — build status API already running on ${PORT} (reusing). Exiting gracefully.`);
    process.exit(0);
  } else {
    console.error('[build-server] Unexpected error:', err);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`[build-server] Listening on http://localhost:${PORT}`);
  console.log(`[build-server] Repo root: ${REPO_ROOT}`);
});
