const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const models = require('../src/models');
const { jwtSecret } = require('../src/config/auth');
const { errorHandler } = require('../src/middlewares/errorMiddleware');
const C = require('../src/controllers/teacherController');
const sessions = require('../src/controllers/classroomSessionController');
const notifications = require('../src/controllers/parentNotificationController');
const mastery = require('../src/controllers/vocabMasteryController');
const access = require('../src/services/teacherAccess');
const inbox = require('../src/services/parentInbox');
const id = n => String(n).padStart(24, '0');
const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, limit() { return this; }, skip() { return this; }, lean() { return this; }, distinct: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
async function invoke(handler, body = {}, params = {}, reqPatch = {}) {
  const result = { status: 200 };
  const req = { user: { _id: id(1), role: 'TEACHER', name: 'Teacher' }, body, params, query: {}, ...reqPatch };
  const res = { status(code) { result.status = code; return this; }, json(data) { result.data = data; return this; } };
  await handler(req, res, error => { result.error = error; result.status = error.statusCode || 500; });
  return result;
}
test('all teacher and live-session routes reject anonymous access and child tokens', async t => {
  const routers = [require('../src/routes/teacherRoutes'), require('../src/routes/classroomSessionRoutes'), require('../src/routes/sentencePatternRoutes')];
  t.mock.method(models.User, 'findById', () => query({ _id: id(1), role: 'CHILD', status: 'ACTIVE', authVersion: 0 }));
  const app = express(); app.use(express.json()); routers.forEach((router, i) => app.use('/' + i, router)); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const token = jwt.sign({ id: id(1), authVersion: 0 }, jwtSecret()); let checked = 0;
  try {
    for (const [i, router] of routers.entries()) for (const layer of router.stack) {
      if (!layer.route) continue;
      const path = layer.route.path.replace(/:[^/]+/g, id(2));
      const method = Object.keys(layer.route.methods)[0].toUpperCase();
      const options = { method, headers: { 'Content-Type': 'application/json' }, ...(['POST', 'PUT', 'PATCH'].includes(method) ? { body: '{}' } : {}) };
      const url = 'http://127.0.0.1:' + server.address().port + '/' + i + path;
      assert.equal((await fetch(url, options)).status, 401, method + path);
      assert.equal((await fetch(url, { ...options, headers: { ...options.headers, Authorization: 'Bearer ' + token } })).status, 403, method + path);
      checked++;
    }
    assert.ok(checked >= 35);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('student vocabulary and notifications reject another classroom before reading private records', async t => {
  t.mock.method(models.ClassRoom, 'find', () => query([id(3)]));
  t.mock.method(models.User, 'findOne', filter => { assert.equal(filter._id.$eq, id(9)); assert.deepEqual(filter._id.$in, [id(3)]); return query(null); });
  t.mock.method(models.VocabularyMastery, 'find', () => assert.fail('must not read mastery'));
  t.mock.method(models.ParentNotification, 'create', () => assert.fail('must not notify a different class'));
  assert.equal((await invoke(mastery.getStudentMastery, {}, { studentId: id(9) })).status, 403);
  assert.equal((await invoke(notifications.sendNotification, { childId: id(9), teacherNote: 'Note' })).status, 403);
});
test('teachers cannot change administrative class fields or enroll/remove students', async t => {
  t.mock.method(access, 'classroom', async () => ({ _id: id(2), save: () => assert.fail('must not save') }));
  assert.equal((await invoke(C.updateClass, { status: 'INACTIVE' }, { id: id(2) })).status, 403);
  assert.equal((await invoke(C.addStudents, { studentIds: [id(3)] }, { id: id(2) })).status, 403);
  assert.equal((await invoke(C.removeStudent, {}, { id: id(2), studentId: id(3) })).status, 403);
});
test('invalid attendance is rejected before an upsert can affect another child', async t => {
  t.mock.method(access, 'classroom', async () => ({ _id: id(2), students: [id(3)] }));
  t.mock.method(models.Attendance, 'findOneAndUpdate', () => assert.fail('must not write'));
  const result = await invoke(C.saveClassAttendance, { date: '2026-01-01', records: [{ student: id(9), status: 'PRESENT' }] }, { id: id(2) });
  assert.equal(result.status, 400);
});
test('reading session history never deletes drafts or changes the lifecycle', async t => {
  t.mock.method(access, 'classroomIds', async () => [id(4)]);
  t.mock.method(models.ClassroomSession, 'find', filter => { assert.equal(filter.teacher, id(1)); assert.deepEqual(filter.classroom, { $in: [id(4)] }); return query([]); });
  t.mock.method(models.ClassroomSession, 'countDocuments', async () => 0);
  t.mock.method(models.ClassroomSession, 'deleteMany', () => assert.fail('GET must not delete'));
  t.mock.method(models.ClassroomSession, 'updateMany', () => assert.fail('GET must not end sessions'));
  const result = await invoke(sessions.getSessions);
  assert.equal(result.error, undefined); assert.equal(result.data.total, 0);
});

test('timetable requires both teacher ownership and current classroom assignment', async t => {
  t.mock.method(access, 'classroomIds', async () => [id(4)]);
  t.mock.method(models.Schedule, 'find', filter => {
    assert.equal(filter.teacher, id(1));
    assert.deepEqual(filter.classroom, { $in: [id(4)] });
    assert.equal(filter.isActive, true);
    return query([]);
  });
  assert.equal((await invoke(C.getMySchedule)).error, undefined);
});

test('a reassigned former teacher cannot read an old classroom session', async t => {
  t.mock.method(models.ClassroomSession, 'findOne', () => query({ _id: id(2), classroom: id(4), status: 'COMPLETED' }));
  t.mock.method(access, 'classroom', async () => { throw Object.assign(new Error('Not current teacher'), { statusCode: 403 }); });
  assert.equal((await invoke(sessions.getSession, {}, { id: id(2) })).status, 403);
});

test('content without an assigned classroom cannot leak the whole curriculum', async t => {
  t.mock.method(models.ClassRoom, 'find', () => query([]));
  t.mock.method(models.CurriculumUnit, 'find', filter => {
    assert.deepEqual(filter.$or, [{ book: { $in: [] } }, { ageGroupCode: { $in: [] } }]);
    return query([]);
  });
  t.mock.method(models.Lesson, 'find', filter => { assert.deepEqual(filter.curriculumUnits, { $in: [] }); return query([]); });
  t.mock.method(models.Activity, 'find', () => query([]));
  t.mock.method(models.CurriculumBook, 'find', filter => { assert.deepEqual(filter._id, { $in: [] }); return query([]); });
  const result = await invoke(C.getContent);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.data.data, { books: [], units: [], lessons: [], activities: [] });
  const repositoryResult = await invoke(C.getContent, {}, {}, { query: { repository: 'true' } });
  assert.equal(repositoryResult.error, undefined);
  assert.deepEqual(repositoryResult.data.data, { books: [], units: [], lessons: [], activities: [] });
});
test('a reassigned former teacher cannot mutate an old classroom session', async t => {
  t.mock.method(models.ClassroomSession, 'findOne', () => query({ _id: id(2), classroom: id(4), status: 'LIVE', save: () => assert.fail('must not write') }));
  t.mock.method(access, 'classroom', async () => { throw Object.assign(new Error('Not current teacher'), { statusCode: 403 }); });
  assert.equal((await invoke(sessions.scoreStudent, { studentId: id(3), operationId: 'operation-1', stars: 1 }, { id: id(2) })).status, 403);
});
test('a completed session rejects scoring and an unstarted plan cannot be ended', async t => {
  let status = 'COMPLETED';
  t.mock.method(models.ClassroomSession, 'findOne', () => query({ status, classroom: id(2), save: () => assert.fail('must not write') }));
  t.mock.method(access, 'classroom', async () => ({ status: 'ACTIVE' }));
  assert.equal((await invoke(sessions.scoreStudent, { studentId: id(3), operationId: 'operation-1', stars: 1 }, { id: id(2) })).status, 409);
  status = 'SCHEDULED';
  assert.equal((await invoke(sessions.endSession, {}, { id: id(2) })).status, 409);
});
test('optimistic concurrency retries a scoring write using fresh data without dropping a concurrent award', async t => {
  let writes = 0;
  const saved = { stars: 5, operations: [] };
  t.mock.method(access, 'classroom', async () => ({ status: 'ACTIVE' }));
  t.mock.method(models.ClassroomSession, 'findOne', () => query({ status: 'LIVE', classroom: id(2), appliedOperations: [...saved.operations], studentScores: [{ student: id(3), attendance: 'PRESENT', stars: saved.stars, points: 0 }], async save() {
    writes++;
    if (writes === 1) { saved.stars = 7; throw Object.assign(new Error('Concurrent write'), { name: 'VersionError' }); }
    saved.stars = this.studentScores[0].stars; saved.operations = this.appliedOperations;
  } }));
  const result = await invoke(sessions.scoreStudent, { studentId: id(3), operationId: 'operation-1', stars: 1 }, { id: id(2) });
  assert.equal(result.error, undefined); assert.equal(writes, 2); assert.equal(saved.stars, 8);
});
test('session model protects one live class and enables optimistic saves', () => {
  const schema = models.ClassroomSession.schema;
  assert.equal(schema.options.optimisticConcurrency, true);
  for (const field of ['classroom', 'teacher']) assert.ok(schema.indexes().some(([keys, options]) => keys[field] === 1 && options.unique && options.partialFilterExpression?.status === 'LIVE'));
});
test('parent session reports derive their figures from the authorized completed session', async t => {
  t.mock.method(models.ParentNotification, 'findOne', () => query(null));
  t.mock.method(access, 'child', async () => ({ _id: id(3), name: 'Child' }));
  t.mock.method(access, 'classroom', async () => ({ _id: id(2) }));
  t.mock.method(models.ClassroomSession, 'findOne', filter => {
    assert.equal(filter.teacher, id(1)); assert.equal(filter.status, 'COMPLETED');
    return query({ _id: id(7), classroom: { _id: id(2), name: 'Room' }, title: 'Lesson', studentScores: [{ student: id(3), attendance: 'PRESENT', correctCount: 1, incorrectCount: 3, stars: 2 }] });
  });
  let upserts = 0;
  t.mock.method(models.ParentNotification, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.sourceKey, 'session:' + id(7) + ':' + id(3));
    assert.equal(update.$setOnInsert.accuracy, 25); assert.equal(update.$setOnInsert.score, 25); assert.equal(update.$setOnInsert.stars, 2);
    assert.equal(update.$setOnInsert.channel, 'IN_APP'); assert.doesNotMatch(update.$setOnInsert.content, /99%/);
    upserts++; return update.$setOnInsert;
  });
  const result = await invoke(notifications.sendNotification, { childId: id(3), sessionId: id(7), stars: 999, score: 99, accuracy: 99 });
  assert.equal(result.error, undefined); assert.equal(upserts, 1);
});
test('a bulk parent report validates all recipients before writing the first message', async t => {
  t.mock.method(models.ParentNotification, 'findOne', () => query(null));
  t.mock.method(access, 'child', async (_req, child) => {
    if (child === id(4)) throw Object.assign(new Error('Wrong classroom'), { statusCode: 403 });
    return { _id: id(3), name: 'Child' };
  });
  t.mock.method(access, 'classroom', async () => ({ _id: id(2) }));
  t.mock.method(models.ClassroomSession, 'findOne', () => query({ _id: id(7), classroom: { _id: id(2), name: 'Room' }, title: 'Lesson', studentScores: [{ student: id(3), attendance: 'PRESENT', stars: 0 }] }));
  t.mock.method(models.ParentNotification, 'findOneAndUpdate', () => assert.fail('all recipients must be validated before a write'));
  const result = await invoke(notifications.sendBulkNotifications, { sessionId: id(7), childReports: [{ childId: id(3) }, { childId: id(4) }] });
  assert.equal(result.status, 403);
});
test('a teacher cannot mark a family message read as a parent', async t => {
  t.mock.method(models.ParentNotification, 'findOneAndUpdate', () => assert.fail('must not write as parent'));
  assert.equal((await invoke(notifications.markAsReadByParent, {}, { childId: id(3), id: id(7) })).status, 403);
});
test('only an empty unstarted plan can be deleted, using its current version', async t => {
  let item = { _id: id(7), classroom: id(2), status: 'SCHEDULED', __v: 2, studentScores: [], questionResults: [] };
  t.mock.method(models.ClassroomSession, 'findOne', () => query(item));
  t.mock.method(access, 'classroom', async () => ({ _id: id(2) }));
  let deletes = 0;
  t.mock.method(models.ClassroomSession, 'deleteOne', async filter => {
    assert.equal(filter.status, 'SCHEDULED'); assert.equal(filter.__v, 2); deletes++; return { deletedCount: 1 };
  });
  assert.equal((await invoke(sessions.deleteDraft, {}, { id: id(7) })).error, undefined);
  for (const patch of [{ status: 'LIVE' }, { status: 'COMPLETED' }, { startedAt: new Date() }, { studentScores: [{ stars: 1 }] }, { questionResults: [{}] }]) {
    const original = item; item = { ...original, ...patch };
    assert.equal((await invoke(sessions.deleteDraft, {}, { id: id(7) })).status, 409); item = original;
  }
  assert.equal(deletes, 1);
});
test('a delayed parent notification from an older review cannot overwrite a newer review report', async t => {
  let attempts = 0;
  t.mock.method(models.ParentNotification, 'findOneAndUpdate', async (filter, _update, options) => {
    assert.equal(filter.sourceKey, 'assignment:demo');
    assert.equal(filter.$or[0].sourceRevision.$lte, 1);
    attempts++;
    if (options.upsert) throw Object.assign(new Error('A newer source already exists'), { code: 11000 });
    return null;
  });
  t.mock.method(models.ParentNotification, 'findOne', async () => ({ sourceKey: 'assignment:demo', sourceRevision: 2, stars: 5, teacherNote: 'Latest review' }));
  const result = await inbox.publish({ sourceKey: 'assignment:demo', sourceRevision: 1, stars: 1, teacherNote: 'Older review' });
  assert.equal(attempts, 2); assert.equal(result.sourceRevision, 2); assert.equal(result.stars, 5);
});
test('a simultaneous first report publication recovers its stable source instead of failing', async t => {
  let attempts = 0;
  t.mock.method(models.ParentNotification, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(filter.sourceKey, 'session:demo'); attempts++;
    if (options.upsert) throw Object.assign(new Error('Duplicate source'), { code: 11000 });
    return { _id: id(9), ...update.$set };
  });
  t.mock.method(models.ParentNotification, 'findOne', async () => ({ _id: id(9), sourceKey: 'session:demo', stars: 2 }));
  const result = await inbox.publish({ sourceKey: 'session:demo', stars: 2 });
  assert.equal(result.stars, 2); assert.equal(attempts, 1);
});
