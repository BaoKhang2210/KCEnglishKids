const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../src/models');
const { jwtSecret } = require('../src/config/auth');
const router = require('../src/routes/adminRoutes');
const id = '000000000000000000000001';
let version = 0;
test.beforeEach(t => {
  version = 0;
  t.mock.method(User, 'findById', () => ({ select: async () => ({ _id: id, role: 'TEACHER', status: 'ACTIVE', authVersion: version }) }));
});
let server;
let base;
test.before(async () => {
  const app = express(); app.use(express.json()); app.use('/api/admin', router);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port + '/api/admin';
});
test.after(() => new Promise(resolve => server.close(resolve)));
test('every admin endpoint including public-stats rejects anonymous access and non-admin writes', async () => {
  const token = jwt.sign({ id, authVersion: 0 }, jwtSecret());
  let checked = 0;
  for (const layer of router.stack) {
    if (!layer.route) continue;
    const path = layer.route.path.replace(/:[^/]+/g, id);
    const method = Object.keys(layer.route.methods)[0].toUpperCase();
    const options = { method, headers: { 'Content-Type': 'application/json' }, ...(['POST', 'PUT', 'PATCH'].includes(method) ? { body: '{}' } : {}) };
    assert.equal((await fetch(base + path, options)).status, 401, method + ' ' + path);
    if (layer.route.path !== '/schedules/by-teacher/:teacherId') assert.equal((await fetch(base + path, { ...options, headers: { ...options.headers, Authorization: 'Bearer ' + token } })).status, 403, method + ' ' + path);
    checked++;
  }
  assert.ok(checked > 50);
});
test('password version changes revoke an existing signed token', async () => {
  const token = jwt.sign({ id, authVersion: 0 }, jwtSecret());
  version = 1;
  const response = await fetch(base + '/users', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal(response.status, 401);
});
