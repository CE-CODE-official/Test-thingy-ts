import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

test('static game and score endpoint handle valid and malformed requests', async t => {
  const server = createApp(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(base); assert.equal(page.status, 200); assert.match(await page.text(), /SMALL TURTLE/);
  for (const path of ['/app.js', '/engine.js', '/render.js', '/style.css', '/turtle.svg']) assert.equal((await fetch(base + path)).status, 200);
  const post = body => fetch(base + '/api/score', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  assert.equal((await post('{broken')).status, 400);
  for (const score of [-1, 1.5, '10', null, 1000001]) assert.equal((await post(JSON.stringify({ score }))).status, 400);
  assert.equal((await post('x'.repeat(1500))).status, 413);
  assert.deepEqual(await (await post('{"score":42}')).json(), { bestScore: 42 });
  assert.deepEqual(await (await post('{"score":2}')).json(), { bestScore: 42 });
  assert.deepEqual(await (await fetch(base + '/api/score')).json(), { bestScore: 42 });
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await fetch(base + '/%ZZ')).status, 400);
  assert.equal((await fetch(base + '/%2e%2e%2fserver.js')).status, 403);
  assert.equal((await fetch(base, { method: 'DELETE' })).status, 405);
  assert.equal((await fetch(base)).status, 200, 'malformed requests do not crash server');
});
