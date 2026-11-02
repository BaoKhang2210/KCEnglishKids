const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/models');
const proposal = require('../src/services/homeworkProposal');
const homework = require('../src/services/teacherAssignments');
const access = require('../src/services/teacherAccess');
const assignments = require('../src/controllers/teacherAssignmentController');
const teacher = require('../src/controllers/teacherController');
const id = n => String(n).padStart(24, '0');
const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, lean: async () => value, distinct: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const child = { _id: id(1), assignedClass: id(2), ageGroupCode: '3-4' };
const room = { _id: id(2), teacher: id(3), ageGroupCode: '3-4', status: 'ACTIVE', students: [id(1)], completedLessons: [id(4)] };
async function invoke(handler, body = {}) {
  let error, data, status = 200;
  const res = { status(code) { status = code; return this; }, json(value) { data = value; } };
  await handler({ user: { _id: id(3), role: 'TEACHER' }, body, params: {}, query: {} }, res, value => { error = value; });
  return { error, data, status };
}

test('individual homework uses attendance, completed learning and live observations; absence alone is insufficient', async t => {
  t.mock.method(M.ClassroomSession, 'find', filter => {
    assert.equal(filter.classroom, room._id); assert.equal(filter.status, 'COMPLETED');
    return query([{ lesson: id(4), studentScores: [{ student: child._id, attendance: 'ABSENT' }] }, { lesson: id(5), studentScores: [{ student: child._id, attendance: 'PRESENT' }] }]);
  });
  t.mock.method(M.Progress, 'find', filter => { assert.equal(filter.completed, true); return query([id(6)]); });
  t.mock.method(M.LearningObservation, 'find', filter => { assert.equal(filter.voidedAt, null); assert.equal(filter.classroom, room._id); return query([id(7)]); });
  assert.deepEqual(await proposal.studiedLessonIds(room, child), [id(5), id(6), id(7)]);
  assert.deepEqual(await proposal.studiedLessonIds(room, null), [id(4), id(5)]);
});

test('no evidence offers no invented first lesson, and proposal enforces active age-matched content', async t => {
  t.mock.method(M.ClassroomSession, 'find', () => query([]));
  t.mock.method(M.Lesson, 'find', filter => {
    assert.deepEqual(filter._id.$in, []); assert.equal(filter.status, 'ACTIVE'); assert.equal(filter.ageGroupCode, '3-4'); return query([]);
  });
  t.mock.method(M.Lesson, 'findById', () => assert.fail('no lesson may be invented'));
  const result = await proposal.proposal({ ...room, completedLessons: [] }, null);
  assert.equal(result.available, false); assert.equal(result.lessonId, ''); assert.deepEqual(result.items, []);
});

test('a direct assignment request cannot bypass studied-lesson validation; eligible homework creates one canonical assignment', async t => {
  t.mock.method(access, 'classroom', async () => room);
  t.mock.method(M.Lesson, 'findOne', () => query({ _id: id(4), status: 'ACTIVE', ageGroupCode: '3-4' }));
  t.mock.method(M.Activity, 'find', () => query([id(8)]));
  let eligible = false, writes = 0;
  t.mock.method(proposal, 'studiedLessonIds', async () => eligible ? [id(4)] : []);
  t.mock.method(M.Assignment, 'create', async value => { writes++; assert.deepEqual(value.recipients, [child._id]); return { ...value, _id: id(9) }; });
  const body = { classRoomId: room._id, lessonId: id(4), assignedToType: 'CLASS' };
  const denied = await invoke(assignments.createAssignment, body);
  assert.equal(denied.error.statusCode, 400); assert.equal(writes, 0);
  eligible = true;
  const allowed = await invoke(assignments.createAssignment, body);
  assert.equal(allowed.error, undefined); assert.equal(allowed.status, 201); assert.equal(writes, 1);
});

test('family homework uses current membership and teacher, and skips completed submissions', async t => {
  let currentRoom = room, seen;
  t.mock.method(M.ClassRoom, 'findById', () => query(currentRoom));
  const lesson = { _id: id(4), title: 'School', status: 'ACTIVE', ageGroupCode: '3-4' };
  const base = { teacher: room.teacher, lesson, activity: null, contentSnapshot: [{ _id: id(8), questions: [] }], createdAt: new Date(), completionMode: 'ACTIVITY' };
  t.mock.method(M.Assignment, 'find', filter => { seen = filter; return query([{ ...base, _id: id(9) }, { ...base, _id: id(10) }]); });
  let reads = 0;
  t.mock.method(M.ActivityResult, 'find', () => query(++reads === 1 ? [{ _id: id(11), child: child._id, activity: id(8), completed: true, correctCount: 1, incorrectCount: 0 }] : []));
  assert.equal((await homework.currentForChild(child))._id, id(10));
  assert.equal(seen.teacher, room.teacher); assert.equal(seen.classRoom, room._id);
  assert.ok(seen.$and[0].$or.some(row => row.recipients === child._id));
  assert.ok(seen.$and[1].$or.some(row => row.startDate?.$lte instanceof Date));
  currentRoom = { ...room, students: [] };
  assert.equal(await homework.currentForChild(child), null);
});

test('schedule omits stale assignments after a class changes teacher and inactive classrooms', async t => {
  t.mock.method(access, 'classroomIds', async () => [room._id]);
  t.mock.method(M.Schedule, 'find', filter => { assert.equal(filter.teacher, id(3)); return query([
    { _id: id(20), classroom: room },
    { _id: id(21), classroom: { ...room, teacher: id(99) } },
    { _id: id(22), classroom: { ...room, status: 'COMPLETED' } },
    { _id: id(23), classroom: null },
  ]); });
  const result = await invoke(teacher.getMySchedule);
  assert.equal(result.error, undefined); assert.deepEqual(result.data.data.map(row => row._id), [id(20)]);
});

test('two-way chat and duplicate approval routes are gone; reporting and assignments stay available', () => {
  const teacherRoutes = require('../src/routes/teacherRoutes').stack.filter(row => row.route).map(row => row.route);
  const childRoutes = require('../src/routes/childrenRoutes').stack.filter(row => row.route).map(row => row.route);
  assert.equal([...teacherRoutes, ...childRoutes].some(row => /parent-notifications.*reply/.test(row.path)), false);
  assert.equal(teacherRoutes.some(row => /home-practice/.test(row.path)), false);
  assert.ok(teacherRoutes.some(row => row.path === '/assignments/proposal' && row.methods.get));
  assert.ok(teacherRoutes.some(row => row.path === '/parent-notifications/bulk' && row.methods.post));
  assert.ok(childRoutes.some(row => /parent-notifications.*read/.test(row.path)));
});
