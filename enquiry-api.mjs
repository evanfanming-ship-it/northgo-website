import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { offices } from './offices-data.mjs';

export const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
};
const hash = value => createHash('sha256').update(value).digest();
const digest = value => hash(value).toString('hex');
const expiry = 8 * 60 * 60;
function json(status, data, headers = {}) {
  return Response.json(data, { status, headers: { ...securityHeaders, ...headers } });
}
function fail(status) { throw Object.assign(new Error('Request rejected'), { status }); }
async function body(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type') || '')) fail(415);
  if (Number(request.headers.get('Content-Length')) > 64_000) fail(413);
  if (!request.body) fail(400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64_000) {
        await reader.cancel();
        fail(413);
      }
      text += decoder.decode(value, { stream:true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  let value;
  try { value = JSON.parse(text); } catch { fail(400); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400);
  return value;
}
function field(value, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400);
  return value.trim();
}
const statuses = ['new', 'in_progress', 'closed'];
const officeIds = offices.map(o => o.id);
const services = ['0', '1', '2', '3'];
const languages = ['zh-tw', 'en', 'ja', 'vi'];
const enquirySort = new Map([
  ['created_at', 'created_at'],
  ['name', 'name COLLATE NOCASE'],
  ['company', 'company COLLATE NOCASE'],
  ['email', 'email COLLATE NOCASE'],
  ['status', "CASE status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END"],
]);
const enquiryIdPattern = /^[a-f0-9]{32}$/;
const enquiryColumns = ['service', 'office', 'name', 'company', 'email', 'origin', 'destination', 'cargo', 'planned_date', 'language'];
function validateEnquiry(input) {
  const { service, office, language } = input;
  if (!services.includes(service) || !officeIds.includes(office) || !languages.includes(language)) fail(400);
  const email = field(input.email, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400);
  const date = field(input.date, 10, false);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date)) fail(400);
  return [service, office, field(input.name, 200), field(input.company, 200), email,
    field(input.from, 200), Number(service) < 2 ? field(input.to, 200) : '', field(input.cargo, 3000), date, language];
}
function validateManagement(input) {
  if (!statuses.includes(input.status)) fail(400);
  return [input.status, field(input.notes, 4000, false)];
}

export async function enquiryApi(request, { db, password, adminUsername = 'admin', origin, allow }) {
  const url = new URL(request.url);
  const secure = origin.startsWith('https:');
  const sessionKey = secure ? '__Host-northgo' : 'northgo';
  const cookie = (value, age) => sessionKey + '=' + value + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + age + (secure ? '; Secure' : '');
  const run = (sql, ...params) => db.prepare(sql).bind(...params).run();
  const first = (sql, ...params) => db.prepare(sql).bind(...params).first();
  const all = (sql, ...params) => db.prepare(sql).bind(...params).all();
  async function createEnquiry(id, values, [status, notes] = ['new', '']) {
    const now = new Date().toISOString();
    const created = await run(`INSERT INTO enquiries
      (id,${enquiryColumns.join(',')},status,notes,created_at,updated_at)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS
        (SELECT 1 FROM deleted_enquiry_receipts WHERE id = ?) ON CONFLICT(id) DO NOTHING`,
      id, ...values, status, notes, now, now, id);
    if (!created.meta.changes && !await first('SELECT 1 FROM enquiries WHERE id = ?', id)) fail(409);
    return id;
  }
  async function getEnquiry(id) {
    const item = await first('SELECT * FROM enquiries WHERE id = ?', id);
    if (!item) fail(404);
    return item;
  }
  try {
    if (!password || password.length < 16) fail(503);
    const { pathname } = url;
    const method = request.method;
    if (pathname.startsWith('/api/') && ['POST', 'PATCH', 'DELETE'].includes(method) && request.headers.get('Origin') !== origin) fail(403);
    if (pathname === '/api/enquiries' && method === 'POST') {
      if (!await allow('enquiry')) fail(429);
      const input = await body(request);
      const { requestId } = input;
      if (input.consent !== true || typeof requestId !== 'string' || !enquiryIdPattern.test(requestId)) fail(400);
      const values = validateEnquiry(input);
      return json(201, { id: await createEnquiry(requestId, values) });
    }
    const token = (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(sessionKey + '='))?.split('=')[1];
    const session = token && /^[a-f0-9]{64}$/.test(token) ? digest(token) : '';
    if (pathname === '/api/admin/login' && method === 'POST') {
      if (!await allow('login')) fail(429);
      const credentials = await body(request);
      const candidate = credentials.password;
      if (typeof candidate !== 'string' || !candidate.length || candidate.length > 512) fail(400);
      const valid = timingSafeEqual(hash(candidate), hash(password));
      if (!valid || credentials.username !== adminUsername) fail(401);
      await run('DELETE FROM sessions WHERE expires <= ?', Date.now());
      if (session) await run('DELETE FROM sessions WHERE hash = ?', session);
      const newToken = randomBytes(32).toString('hex');
      await run('INSERT INTO sessions VALUES (?, ?)', digest(newToken), Date.now() + expiry * 1000);
      return json(200, { ok: true }, { 'Set-Cookie': cookie(newToken, expiry) });
    }
    if (pathname.startsWith('/api/admin/')) {
      if (!session || !await first('SELECT 1 FROM sessions WHERE hash = ? AND expires > ?', session, Date.now())) fail(401);
      if (pathname === '/api/admin/logout' && method === 'POST') {
        await run('DELETE FROM sessions WHERE hash = ?', session);
        return json(200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
      }
      if (pathname === '/api/admin/enquiries' && method === 'POST') {
        const input = await body(request);
        const id = await createEnquiry(randomBytes(16).toString('hex'), validateEnquiry(input), validateManagement(input));
        return json(201, { id });
      }
      if (pathname === '/api/admin/enquiries' && method === 'GET') {
        const status = url.searchParams.get('status') || '';
        const search = (url.searchParams.get('q') || '').trim().slice(0, 100);
        const requestedPage = Number(url.searchParams.get('page') || 1);
        const page = Number.isSafeInteger(requestedPage) ? Math.max(1, requestedPage) : 1;
        const pageSize = Number(url.searchParams.get('pageSize') || 30);
        const sort = enquirySort.get(url.searchParams.get('sort') || 'created_at');
        const direction = url.searchParams.get('direction') || 'desc';
        if ((status && !statuses.includes(status)) || ![10,20,30,50,100].includes(pageSize) ||
            !sort || !['asc','desc'].includes(direction)) fail(400);
        const where = `WHERE (? = '' OR status = ?) AND (? = '' OR instr(lower(name||' '||company||' '||email||' '||id||' '||cargo), lower(?)) > 0)`;
        const params = [status, status, search, search];
        const { total } = await first('SELECT count(*) AS total FROM enquiries ' + where, ...params);
        const lastPage = Math.max(1, Math.ceil(total / pageSize));
        const current = Math.min(page, lastPage);
        const order = direction === 'asc' ? 'ASC' : 'DESC';
        const { results: items } = await all(`SELECT * FROM enquiries ${where}
          ORDER BY ${sort} ${order}, id ${order} LIMIT ? OFFSET ?`, ...params, pageSize, (current - 1) * pageSize);
        return json(200, { items, total, page: current, lastPage, username: adminUsername });
      }
      const record = /^\/api\/admin\/enquiries\/([a-f0-9]{32})$/.exec(pathname);
      if (record && method === 'GET') return json(200, await getEnquiry(record[1]));
      if (record && method === 'PATCH') {
        const data = await body(request);
        const item = await getEnquiry(record[1]);
        if (item.updated_at !== data.updatedAt) fail(409);
        const prior = Object.fromEntries(enquiryColumns.map(column => [column, item[column]]));
        const values = validateEnquiry({
          ...prior, from:item.origin, to:item.destination, date:item.planned_date, ...data
        });
        const management = validateManagement({ status:item.status, notes:item.notes, ...data });
        const nextUpdate = new Date(Math.max(Date.now(), Date.parse(item.updated_at) + 1)).toISOString();
        const fields = enquiryColumns.map(column => column + '=?').join(',');
        const updated = await run(`UPDATE enquiries SET ${fields},status=?,notes=?,updated_at=? WHERE id=? AND updated_at=?`,
          ...values, ...management, nextUpdate, item.id, item.updated_at);
        if (!updated.meta.changes) fail(409);
        return json(200, { ok: true });
      }
      if (record && method === 'DELETE') {
        const data = await body(request);
        await getEnquiry(record[1]);
        const deleted = await run('DELETE FROM enquiries WHERE id = ? AND updated_at = ?', record[1], field(data.updatedAt, 40));
        if (!deleted.meta.changes) fail(409);
        return json(200, { ok: true });
      }
    }

    return json(404, { error: 'not_found' });
  } catch (error) {
    if (!error.status) console.error('Request failed:', error.code || error.name);
    return json(error.status || 500, { error: 'request_failed' });
  }
}
