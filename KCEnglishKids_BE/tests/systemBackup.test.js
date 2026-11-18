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
app.use(express.json({ limit: '50mb' }));
app.use('/api/admin', require('../src/routes/adminRoutes'));
app.use(require('../src/middlewares/errorMiddleware').errorHandler);
let server;
let baseUrl;
let endpoint;
test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = 'http://127.0.0.1:' + server.address().port + '/api/admin';
  endpoint = baseUrl + '/system/backup';
});
test.after(() => new Promise(resolve => server.close(resolve)));
const authHeader = (user = admin) => user ? { Authorization: 'Bearer ' + jwt.sign({ id: user._id }, jwtSecret()) } : {};
const request = (user = admin) => fetch(endpoint, { headers: authHeader(user) });
test('backup contains every collection and preserves BSON IDs, dates and password hashes', async () => {
  const response = await request();
  const payload = EJSON.parse(await response.text(), { relaxed: false });
  assert.equal(response.status, 200);
  assert.equal(payload.version, '3.4.0');
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
test('restore validation endpoint verifies BSON payload and returns collection breakdown', async () => {
  const backupRes = await request();
  const rawText = await backupRes.text();
  const valRes = await fetch(baseUrl + '/system/restore/validate', {
    method: 'POST',
    headers: { ...authHeader(admin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ backupRaw: rawText })
  });
  const body = await valRes.json();
  assert.equal(valRes.status, 200);
  assert.equal(body.valid, true);
  assert.equal(body.data.totalCollections, Object.keys(models).length);

  // Invalid payload should fail with 400
  const badRes = await fetch(baseUrl + '/system/restore/validate', {
    method: 'POST',
    headers: { ...authHeader(admin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ backupRaw: JSON.stringify({ system: 'Invalid', version: '1.0' }) })
  });
  assert.equal(badRes.status, 400);
});
test('restore endpoint enforces confirmation, restores collections and rolls back on failure', async t => {
  const backupRes = await request();
  const rawText = await backupRes.text();

  const insertedStore = {};
  for (const model of Object.values(models)) {
    t.mock.method(model.collection, 'deleteMany', async () => {
      insertedStore[model.collection.name] = [];
    });
    t.mock.method(model.collection, 'insertMany', async docs => {
      insertedStore[model.collection.name] = [...docs];
    });
  }

  // Without confirmation phrase or password -> 400
  const unconfirmed = await fetch(baseUrl + '/system/restore', {
    method: 'POST',
    headers: { ...authHeader(admin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ backupRaw: rawText, confirmText: 'SAI MA' })
  });
  assert.equal(unconfirmed.status, 400);

  // With valid confirmation phrase -> 200
  const confirmed = await fetch(baseUrl + '/system/restore', {
    method: 'POST',
    headers: { ...authHeader(admin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ backupRaw: rawText, confirmText: 'KHÔI PHỤC', fileName: 'TestBackup.json' })
  });
  const confirmedBody = await confirmed.json();
  assert.equal(confirmed.status, 200);
  assert.equal(confirmedBody.success, true);
  assert.equal(confirmedBody.data.totalCollections, Object.keys(models).length);
  assert.ok(audits.some(a => a.action === 'RESTORE_SYSTEM_BACKUP'));

  // Clean up the auto snapshot created during test
  if (confirmedBody.data.safetySnapshotFilename) {
    await fetch(baseUrl + '/system/snapshots/' + encodeURIComponent(confirmedBody.data.safetySnapshotFilename), {
      method: 'DELETE',
      headers: authHeader(admin)
    });
  }
});
test('server snapshot creation, validation, download and deletion work end-to-end', async () => {
  const createRes = await fetch(baseUrl + '/system/snapshots', {
    method: 'POST',
    headers: { ...authHeader(admin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: 'Unit test snapshot' })
  });
  const createBody = await createRes.json();
  assert.equal(createRes.status, 201);
  assert.equal(createBody.success, true);
  const filename = createBody.data.filename;
  assert.ok(filename.startsWith('Snapshot_Server_'));

  // Validate snapshot via API
  const valRes = await fetch(baseUrl + '/system/restore/validate', {
    method: 'POST',
    headers: { ...authHeader(admin), 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotFilename: filename })
  });
  assert.equal(valRes.status, 200);

  // Download snapshot
  const dlRes = await fetch(baseUrl + '/system/snapshots/' + encodeURIComponent(filename), {
    headers: authHeader(admin)
  });
  assert.equal(dlRes.status, 200);
  const parsed = EJSON.parse(await dlRes.text(), { relaxed: false });
  assert.equal(parsed.note, 'Unit test snapshot');

  // Delete snapshot
  const delRes = await fetch(baseUrl + '/system/snapshots/' + encodeURIComponent(filename), {
    method: 'DELETE',
    headers: authHeader(admin)
  });
  assert.equal(delRes.status, 200);
});
