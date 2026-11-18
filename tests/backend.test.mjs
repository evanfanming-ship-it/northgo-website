import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';

test('enquiry receipt, authenticated management, and persistence', { timeout: 20_000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'northgo-test-'));
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const origin = 'http://127.0.0.1:' + port;
  const password = randomBytes(20).toString('hex');
  let child;
  async function start() {
    child = spawn(process.execPath, ['server.mjs'], {
      env: { ...process.env, HOST:'127.0.0.1', PORT:String(port), PUBLIC_ORIGIN:origin,
        ADMIN_USERNAME:'test-admin', ADMIN_PASSWORD:password, DB_PATH:join(dir,'test.sqlite') },
      stdio: ['ignore','pipe','inherit'],
    });
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('Backend failed to start'); })]);
  }
  async function stop() {
    if (child && child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, 'exit');
      child.kill();
      await stopped;
    }
  }
  t.after(async () => { await stop(); await rm(dir, { recursive:true, force:true }); });
  await start();
  let cookie = '';
  const request = (path, method='GET', data, source=origin) => fetch(origin + path, {
    method, headers:{ Origin:source, ...(cookie ? { Cookie:cookie } : {}),
      ...(data ? { 'Content-Type':'application/json' } : {}) },
    ...(data ? { body:JSON.stringify(data) } : {}),
  });
  assert.match(await (await request('/')).text(), /northgo-enquiry-api/);
  assert.match(await (await request('/admin')).text(), /管理員登入/);
  const endpoint = '/api/admin/enquiries';
  assert.equal((await request(endpoint)).status, 401);
  assert.equal((await request(endpoint,'POST',{})).status, 401);
  assert.equal((await request(endpoint+'/'+ 'a'.repeat(32),'DELETE',{})).status, 401);
  const input = { requestId:'a'.repeat(32), service:'0', office:'tpe', language:'en', consent:true,
    name:'Test User', company:'Example', email:'demo@example.com', from:'Taipei', to:'Tokyo', cargo:'<example>', date:'' };
  assert.equal((await request('/api/enquiries','POST',input,'https://example.org')).status, 403);
  assert.equal((await request('/api/enquiries','POST',{...input, consent:false})).status, 400);
  for (let i=0; i<2; i++) {
    const response = await request('/api/enquiries','POST',input);
    assert.equal(response.status, 201);
    assert.equal((await response.json()).id, input.requestId);
  }
  assert.equal((await request('/api/admin/login','POST',{username:'test-admin',password:'incorrect'})).status,401);
  const login = await request('/api/admin/login','POST',{username:'test-admin',password});
  assert.equal(login.status,200);
  const sessionCookie = login.headers.get('set-cookie');
  assert.match(sessionCookie,/HttpOnly; SameSite=Strict/);
  cookie = sessionCookie.split(';')[0];
  const { items, total } = await (await request(endpoint+'?q=example')).json();
  assert.equal(total,1);
  const record = items[0];
  assert.equal(record.cargo,'<example>');
  const changes = { company:'Updated company', cargo:'Updated cargo', status:'closed', notes:'Handled', updatedAt:record.updated_at };
  assert.equal((await request(endpoint+'/'+record.id,'PATCH',changes)).status,200);
  assert.equal((await request(endpoint+'/'+record.id,'PATCH',changes)).status,409);
  await stop();
  await start();
  const result = await (await request(endpoint+'?status=closed')).json();
  assert.equal(result.items[0].notes,'Handled');
  assert.equal(result.items[0].company,'Updated company');
  assert.equal((await (await request(endpoint+'/'+record.id)).json()).cargo,'Updated cargo');
  assert.equal((await request(endpoint+'/'+record.id,'DELETE',{updatedAt:record.updated_at})).status,409);
  assert.equal((await request(endpoint+'/'+record.id,'DELETE',{updatedAt:result.items[0].updated_at},'https://example.org')).status,403);
  const manual = await request(endpoint,'POST',{ ...input, service:'2', status:'new', notes:'Manual enquiry' });
  assert.equal(manual.status,201);
  const { id:manualId } = await manual.json();
  const manualRecord = await (await request(endpoint+'/'+manualId)).json();
  assert.equal(manualRecord.destination,'');
  assert.equal(manualRecord.notes,'Manual enquiry');
  assert.equal((await request(endpoint+'/'+record.id,'DELETE',{updatedAt:result.items[0].updated_at})).status,200);
  assert.equal((await request(endpoint+'/'+record.id)).status,404);
  assert.equal((await request('/api/enquiries','POST',input)).status,409);
  assert.equal((await (await request(endpoint+'?q=Updated cargo')).json()).total,0);
  assert.equal((await (await request(endpoint)).json()).total,1);
  for (let i = 10; i > 0; i--) {
    const created = await request(endpoint,'POST',{ ...input, name:'Page ' + String(i).padStart(2, '0'), status:'new', notes:'' });
    assert.equal(created.status,201);
  }
  const asc = await (await request(endpoint+'?sort=name&direction=asc&pageSize=10')).json();
  assert.equal(asc.username,'test-admin');
  assert.equal(asc.lastPage,2);
  assert.equal(asc.items.length,10);
  assert.equal(asc.items[0].name,'Page 01');
  const second = await (await request(endpoint+'?sort=name&direction=desc&pageSize=10&page=2')).json();
  assert.equal(second.items.length,1);
  assert.equal(second.items[0].name,'Page 01');
  assert.equal((await request(endpoint+'?sort=invalid')).status,400);
  assert.equal((await request(endpoint+'?pageSize=500')).status,400);
  assert.equal((await request('/api/admin/logout','POST',{})).status,200);
  assert.equal((await request(endpoint)).status,401);
});
