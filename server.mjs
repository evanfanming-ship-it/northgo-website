import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { enquiryApi, securityHeaders } from './enquiry-api.mjs';

const password = process.env.ADMIN_PASSWORD;
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
if (!password || password.length < 16) throw new Error('Set ADMIN_PASSWORD to at least 16 characters.');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const origin = new URL(process.env.PUBLIC_ORIGIN || `http://localhost:${port}`).origin;
const secure = origin.startsWith('https:');
if (!secure && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) throw new Error('Use HTTPS for the public origin.');
const dbPath = process.env.DB_PATH || 'data/enquiries.sqlite';
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec(readFileSync(new URL('./migrations/0001_enquiries.sql', import.meta.url), 'utf8'));
const adapter = {
  prepare(sql) {
    return {
      bind(...params) {
        const statement = db.prepare(sql);
        return {
          first: () => statement.get(...params),
          all: () => ({ results: statement.all(...params) }),
          run: () => ({ meta: statement.run(...params) }),
        };
      },
    };
  },
};

const limits = new Map();
const buckets = { login: [15, 15 * 60_000], enquiry: [25, 60_000] };
function rateLimit(req, kind) {
  const [limit, duration] = buckets[kind];
  const key = kind + ':' + req.socket.remoteAddress;
  const now = Date.now();
  const entry = limits.get(key);
  if (entry && entry.until > now) return ++entry.count <= limit;
  limits.set(key, { count: 1, until: now + duration });
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limits) if (entry.until <= now) limits.delete(key);
  db.prepare('DELETE FROM sessions WHERE expires <= ?').run(now);
}, 60_000).unref();

const files = new Map([
  ['/', ['dist/index.html', 'text/html']], ['/northgo-updated.html', ['dist/index.html', 'text/html']],
  ['/admin', ['admin/index.html', 'text/html']], ['/admin.js', ['admin/admin.js', 'text/javascript']],
  ['/admin.css', ['admin/admin.css', 'text/css']],
]);
for (const name of ['sitemap', 'sitemap-tree', 'offices-map', 'offices-map-dark']) {
  files.set('/' + name + '.html', ['dist/' + name + '.html', 'text/html']);
}


createServer(async (req, res) => {
  try {
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith('/api/')) {
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      const request = new Request(url, {
        method: req.method, headers: req.headers,
        ...(hasBody ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
      });
      const response = await enquiryApi(request, {
        db: adapter, password, adminUsername, origin, allow: kind => rateLimit(req, kind),
      });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      return res.end(Buffer.from(await response.arrayBuffer()));
    }
    if (req.method === 'GET' && files.has(url.pathname)) {
      const [file, type] = files.get(url.pathname);
      let output = readFileSync(new URL(file, import.meta.url), 'utf8');
      if (file === 'dist/index.html') output = output.replace('</head>', '<meta name="northgo-enquiry-api" content="/api/enquiries"></head>');
      res.writeHead(200, { ...securityHeaders, 'Content-Type': type + '; charset=utf-8' });
      return res.end(output);
    }
    res.writeHead(404, securityHeaders).end();
  } catch {
    res.writeHead(500, securityHeaders).end();
  }
}).listen(port, host, () => console.log('Northgo listening on ' + origin + ' (admin: /admin)'));
