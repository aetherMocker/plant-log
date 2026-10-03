/**
 * Plant log - local server
 *
 * No dependencies. Serves the app from /public and stores everything
 * in data.json next to this file. Every save first copies the current
 * data.json into /backups, keeping the most recent 20.
 *
 * Run with:  node server.js
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 4321;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data.json');
const BACKUP_DIR = path.join(ROOT, 'backups');
const MAX_BACKUPS = 20;

const EMPTY_DB = { version: 2, plants: [], logs: [], settings: {} };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

/* ---------- storage ---------- */

function readDB() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(EMPTY_DB, null, 2));
    return { ...EMPTY_DB };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      version: parsed.version || 2,
      plants: Array.isArray(parsed.plants) ? parsed.plants : [],
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
    };
  } catch (err) {
    console.error('data.json could not be parsed:', err.message);
    console.error('Not overwriting it. Fix or rename the file, then restart.');
    process.exit(1);
  }
}

function backup() {
  if (!fs.existsSync(DATA_FILE)) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, `data-${stamp}.json`));

  const old = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('data-') && f.endsWith('.json'))
    .sort()
    .slice(0, -MAX_BACKUPS);
  for (const f of old) fs.unlinkSync(path.join(BACKUP_DIR, f));
}

function writeDB(db) {
  const clean = {
    version: 2,
    plants: Array.isArray(db.plants) ? db.plants : [],
    logs: Array.isArray(db.logs) ? db.logs : [],
    settings: db.settings && typeof db.settings === 'object' ? db.settings : {},
  };
  backup();
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(clean, null, 2));
  fs.renameSync(tmp, DATA_FILE); // atomic-ish: never a half-written data.json
  return clean;
}

/* ---------- http helpers ---------- */

function sendJSON(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req, limitBytes = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, rel);

  // Refuse anything that escapes /public
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
}

/* ---------- routes ---------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = url.pathname;

  try {
    if (route === '/api/data' && req.method === 'GET') {
      return sendJSON(res, 200, readDB());
    }

    if (route === '/api/data' && req.method === 'PUT') {
      const raw = await readBody(req);
      let incoming;
      try {
        incoming = JSON.parse(raw);
      } catch {
        return sendJSON(res, 400, { error: 'Body was not valid JSON.' });
      }
      if (!Array.isArray(incoming.plants) || !Array.isArray(incoming.logs)) {
        return sendJSON(res, 400, { error: 'Expected an object with "plants" and "logs" arrays.' });
      }
      return sendJSON(res, 200, writeDB(incoming));
    }

    if (route.startsWith('/api/')) {
      return sendJSON(res, 404, { error: 'No such endpoint.' });
    }

    if (req.method !== 'GET') {
      res.writeHead(405).end('Method not allowed');
      return;
    }

    serveStatic(req, res, route);
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { error: err.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  readDB(); // creates data.json on first run
  console.log(`\n  Plant log is running.`);
  console.log(`  Open  http://localhost:${PORT}`);
  console.log(`  Data  ${DATA_FILE}`);
  console.log(`  Stop  Ctrl+C\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use.`);
    console.error(`  Try: PORT=4322 node server.js\n`);
    process.exit(1);
  }
  throw err;
});
