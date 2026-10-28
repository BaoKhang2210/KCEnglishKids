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
const homework = require('../src/services/teacherAssignments');
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
    assert.ok(checked >= 40);
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
  t.mock.method(models.ClassroomSession, 'find', filter => { assert.equal(filter.teacher, id(1)); return query([]); });
  t.mock.method(models.ClassroomSession, 'countDocuments', async () => 0);
  t.mock.method(models.ClassroomSession, 'deleteMany', () => assert.fail('GET must not delete'));
  t.mock.method(models.ClassroomSession, 'updateMany', () => assert.fail('GET must not end sessions'));
  const result = await invoke(sessions.getSessions);
  assert.equal(result.error, undefined); assert.equal(result.data.total, 0);
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
test('assignment result lookup excludes old attempts and snapshots the original recipients', () => {
  const a = { lesson: id(4), createdAt: '2026-10-01T00:00:00Z', startDate: '2026-10-02T00:00:00Z', recipients: [id(3)] };
  const q = homework.resultQuery(a, id(3));
  assert.equal(q.completed, true); assert.equal(q.createdAt.$gte.toISOString(), '2026-10-02T00:00:00.000Z');
  assert.deepEqual(homework.recipients(a, { students: [id(5)] }), [id(3)]);
});
test('session model protects one live class and enables optimistic saves', () => {
  const schema = models.ClassroomSession.schema;
  assert.equal(schema.options.optimisticConcurrency, true);
  for (const field of ['classroom', 'teacher']) assert.ok(schema.indexes().some(([keys, options]) => keys[field] === 1 && options.unique && options.partialFilterExpression?.status === 'LIVE'));
});
test('lesson homework remains incomplete until every assigned activity has a new completed result', async t => {
  t.mock.method(models.Activity, 'find', () => query([{ _id: id(4), questions: [{}], pointsPerQuestion: 10 }, { _id: id(5), questions: [{}], pointsPerQuestion: 10 }]));
  t.mock.method(models.ActivityResult, 'find', filter => {
    assert.equal(filter.completed, true); assert.equal(filter.createdAt.$gte.toISOString(), '2026-10-01T00:00:00.000Z');
    return query([{ _id: id(6), activity: id(4), child: id(3), score: 10, correctCount: 1, incorrectCount: 0, createdAt: '2026-10-02' }]);
  });
  const result = await homework.submissions({ lesson: id(7), createdAt: '2026-10-01' }, [{ _id: id(3), name: 'Child' }]);
  assert.equal(result.data[0].hasSubmitted, false);
});
test('homework reports a response percentage instead of presenting game points as percent', async t => {
  t.mock.method(models.Activity, 'find', () => query([{ _id: id(4), questions: [{}, {}, {}, {}], pointsPerQuestion: 10 }]));
  t.mock.method(models.ActivityResult, 'find', () => query([{ _id: id(6), activity: id(4), child: id(3), score: 20, correctCount: 2, incorrectCount: 2, createdAt: '2026-10-02' }]));
  const result = await homework.submissions({ lesson: id(7), createdAt: '2026-10-01' }, [{ _id: id(3) }]);
  assert.equal(result.data[0].hasSubmitted, true); assert.equal(result.data[0].submission.score, 50);
});
test('reviewing another child in the same class rejects work not targeted to that child', async t => {
  t.mock.method(models.Assignment, 'findOne', () => query({ _id: id(7), classRoom: id(2), recipients: [id(3)], status: 'ASSIGNED' }));
  t.mock.method(access, 'classroom', async () => ({ _id: id(2), students: [id(3), id(4)] }));
  t.mock.method(models.Assignment, 'findOneAndUpdate', () => assert.fail('must not update'));
  const result = await invoke(C.reviewAssignmentSubmission, { comment: 'Note', bonusStars: 1 }, { assignmentId: id(7), childId: id(4) });
  assert.equal(result.status, 403);
});
test('review awards are replaced atomically per assignment and child; no increment touches User.stars', async t => {
  const item = { _id: id(7), classRoom: id(2), recipients: [id(3)], status: 'ASSIGNED' };
  const room = { _id: id(2), students: [id(3)] };
  t.mock.method(models.Assignment, 'findOne', () => query(item));
  t.mock.method(access, 'classroom', async () => room);
  t.mock.method(access, 'child', async () => ({ _id: id(3), name: 'Child' }));
  t.mock.method(homework, 'submissions', async () => ({ data: [{ hasSubmitted: true, submission: { _id: id(8), score: 75 } }] }));
  t.mock.method(models.User, 'updateOne', () => assert.fail('direct star increment is not idempotent'));
  let updates = 0;
  t.mock.method(models.Assignment, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter._id, id(7));
    const expression = update[0].$set.reviews.$concatArrays;
    assert.deepEqual(expression[0].$filter.cond, { $ne: ['$$review.child', id(3)] });
    assert.equal(expression[1].length, 1);
    assert.equal(expression[1][0].$let.in.$mergeObjects[0].$literal.bonusStars, 2);
    assert.deepEqual(expression[1][0].$let.in.$mergeObjects[1].revision, { $add: [{ $ifNull: ['$$previous.revision', 0] }, 1] });
    updates++; return { ...item, reviews: [{ child: id(3), comment: 'Cùng ôn thêm từ đã học.', bonusStars: 2, revision: updates }] };
  });
  for (let retry = 0; retry < 2; retry++) assert.equal((await invoke(C.reviewAssignmentSubmission, { comment: 'Cùng ôn thêm từ đã học.', bonusStars: 2, notifyParent: false }, { assignmentId: id(7), childId: id(3) })).error, undefined);
  assert.equal(updates, 2);
});
test('parent session reports derive their figures from the authorized completed session', async t => {
  t.mock.method(access, 'child', async () => ({ _id: id(3), name: 'Child' }));
  t.mock.method(access, 'classroom', async () => ({ _id: id(2) }));
  t.mock.method(models.ClassroomSession, 'findOne', filter => {
    assert.equal(filter.teacher, id(1)); assert.equal(filter.status, 'COMPLETED');
    return query({ _id: id(7), classroom: { _id: id(2), name: 'Room' }, title: 'Lesson', studentScores: [{ student: id(3), attendance: 'PRESENT', correctCount: 1, incorrectCount: 3, stars: 2 }] });
  });
  let upserts = 0;
  t.mock.method(models.ParentNotification, 'findOneAndUpdate', async (filter, update) => {
    assert.equal(filter.sourceKey, 'session:' + id(7) + ':' + id(3));
    assert.equal(update.$set.accuracy, 25); assert.equal(update.$set.score, 25); assert.equal(update.$set.stars, 2);
    assert.equal(update.$set.channel, 'IN_APP'); assert.doesNotMatch(update.$set.content, /99%/);
    upserts++; return update.$set;
  });
  const result = await invoke(notifications.sendNotification, { childId: id(3), sessionId: id(7), stars: 999, score: 99, accuracy: 99 });
  assert.equal(result.error, undefined); assert.equal(upserts, 1);
});
test('a bulk parent report validates all recipients before writing the first message', async t => {
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
test('a teacher cannot impersonate a parent reply or mark a family message read', async t => {
  t.mock.method(models.ParentNotification, 'findOneAndUpdate', () => assert.fail('must not write as parent'));
  assert.equal((await invoke(notifications.replyAsParent, { message: 'Impersonated reply' }, { childId: id(3), id: id(7) })).status, 403);
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
  const result = await inbox.publish({ sourceKey: 'session:demo', stars: 2 });
  assert.equal(result.stars, 2); assert.equal(attempts, 2);
});
test('new activities added later do not expand an existing homework assignment', async t => {
  t.mock.method(models.Activity, 'find', filter => {
    assert.deepEqual(filter._id.$in, [id(4)]);
    return query([{ _id: id(4), title: 'Assigned game', questionCount: 1, pointsPerQuestion: 10 }]);
  });
  t.mock.method(models.ActivityResult, 'find', () => query([{ _id: id(6), activity: id(4), child: id(3), score: 10, correctCount: 1, incorrectCount: 0, createdAt: '2026-10-02' }]));
  const result = await homework.submissions({ lesson: id(7), createdAt: '2026-10-01', activitySnapshot: [id(4)] }, [{ _id: id(3) }]);
  assert.equal(result.data[0].hasSubmitted, true);
});
test('an empty lesson cannot create homework that nobody can complete', async t => {
  t.mock.method(access, 'classroom', async () => ({ _id: id(2), status: 'ACTIVE', students: [id(3)], ageGroupCode: '3-4' }));
  t.mock.method(models.Lesson, 'findOne', async () => ({ _id: id(7), ageGroupCode: '3-4', status: 'ACTIVE' }));
  t.mock.method(models.Activity, 'find', () => query([]));
  t.mock.method(models.Assignment, 'create', () => assert.fail('must not create impossible homework'));
  const result = await invoke(C.createAssignment, { classRoomId: id(2), lessonId: id(7) });
  assert.equal(result.status, 400);
});
test('lesson submission details combine answers and duration from all assigned games', async t => {
  t.mock.method(models.Activity, 'find', () => query([{ _id: id(4), title: 'Game A' }, { _id: id(5), title: 'Game B' }]));
  t.mock.method(models.ActivityResult, 'find', () => query([
    { _id: id(10), activity: id(9), child: id(3), answers: [{ promptText: 'Unassigned game' }], duration: 999, createdAt: '2026-10-03' },
    { _id: id(6), activity: id(5), child: id(3), answers: [{ promptText: 'B' }], duration: 30, createdAt: '2026-10-02T02:00:00Z' },
    { _id: id(8), activity: id(4), child: id(3), answers: [{ promptText: 'A' }], duration: 20, createdAt: '2026-10-02T01:00:00Z' }
  ]));
  const result = await homework.submissions({ lesson: id(7), createdAt: '2026-10-01' }, [{ _id: id(3) }]);
  const submission = result.data[0].submission;
  assert.equal(submission._id, id(6)); assert.equal(submission.duration, 50);
  assert.deepEqual(submission.answers.map(answer => answer.activityTitle), ['Game A', 'Game B']);
  assert.deepEqual(submission.answers.map(answer => answer.promptText), ['A', 'B']);
});
