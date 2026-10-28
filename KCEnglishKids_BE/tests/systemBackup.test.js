const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const models = { ...require('../src/models'), ClassRecognition: require('../src/models/ClassRecognition') };
const { jwtSecret } = require('../src/config/auth');
const EJSON = mongoose.mongo.BSON.EJSON;
const admin = { _id: String(new mongoose.Types.ObjectId()), name: 'Admin', role: 'ADMIN', status: 'ACTIVE' };
const teacher = { ...admin, _id: String(new mongoose.Types.ObjectId()), role: 'TEACHER' };
const records = Object.fromEntries(Object.values(models).map(model => [model.collection.name, [{ _id: new mongoose.Types.ObjectId(), createdAt: new Date('2026-10-28T00:00:00Z'), name: 'Dữ liệu tổng hợp' }]]));
records.users[0].password = '$2b$synthetic-password-hash';
records.users[0].pin = '$2b$synthetic-pin-hash';
let databaseError;
let audits;
let reads;
test.beforeEach(t => {
  databaseError = null; audits = []; reads = 0;
  t.mock.method(models.User, 'findById', id => ({ select: async () => id === admin._id ? admin : teacher }));
  for (const model of Object.values(models)) t.mock.method(model.collection, 'find', () => ({ toArray: async () => {
    reads++; if (databaseError) throw databaseError; return records[model.collection.name];
  } }));
  t.mock.method(models.AuditLog, 'create', async entry => { audits.push(entry); });
});
const app = express();
app.use('/api/admin', require('../src/routes/adminRoutes'));
app.use(require('../src/middlewares/errorMiddleware').errorHandler);
let server;
let endpoint;
test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  endpoint = 'http://127.0.0.1:' + server.address().port + '/api/admin/system/backup';
});
test.after(() => new Promise(resolve => server.close(resolve)));
const request = (user = admin) => fetch(endpoint, { headers: user ? { Authorization: 'Bearer ' + jwt.sign({ id: user._id }, jwtSecret()) } : {} });
test('backup contains every collection and preserves BSON IDs, dates and password hashes', async () => {
  const response = await request();
  const payload = EJSON.parse(await response.text(), { relaxed: false });
  assert.equal(response.status, 200);
  assert.equal(payload.version, '3.0.0');
  assert.equal(payload.format, 'mongodb-extended-json');
  assert.deepEqual(payload.collections, records);
  assert.match(response.headers.get('content-disposition'), /attachment; filename="KCEnglishKids_Backup_/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(audits[0].action, 'EXPORT_SYSTEM_BACKUP');
  assert.equal(Object.keys(payload.collections).length, Object.keys(models).length);
});
test('backup requires an administrator before reading data', async () => {
  assert.equal((await request(null)).status, 401);
  assert.equal((await request(teacher)).status, 403);
  assert.equal(reads, 0);
});
test('a failed collection read never produces a partial backup attachment or success audit', async () => {
  databaseError = new Error('Database unavailable');
  const response = await request();
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('content-disposition'), null);
  assert.equal(audits.length, 0);
});
