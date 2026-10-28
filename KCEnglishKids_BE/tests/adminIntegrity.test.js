const test = require('node:test');
const assert = require('node:assert/strict');
const { User, ClassRoom, AgeGroup, Schedule, AuditLog, Activity, Lesson } = require('../src/models');
const models = require('../src/models');
const ClassRecognition = require('../src/models/ClassRecognition');
const I = require('../src/services/adminIntegrity');
const C = require('../src/controllers/adminController');
const { validateSlots, validateSchedule } = require('../src/services/scheduleRules');
const id = n => String(n).padStart(24, '0');
const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, lean: async () => value, then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) });
const invoke = async (fn, body = {}, params = {}, user) => {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await fn({ body, params, query: {}, user }, res, error => { res.error = error; });
  return res;
};
test('child creation honours username, issues PIN once and never returns stored hashes', async t => {
  t.mock.method(User, 'exists', async () => null);
  t.mock.method(AgeGroup, 'findOne', async () => ({ _id: id(1) }));
  t.mock.method(User.prototype, 'save', async function () { this.pin = 'hash'; this.password = 'hash'; });
  const res = await invoke(C.createChild, { name: 'Test child', username: 'testchild', pin: '0123', ageGroupCode: '5-6' });
  assert.equal(res.code, 201);
  assert.equal(res.data.data.username, 'testchild');
  assert.equal(res.data.data.ageGroupCode, '5-6');
  assert.equal(res.data.data.pin, undefined);
  assert.equal(res.data.data.password, undefined);
  assert.equal(res.data.credentials[0].pin, '0123');
});
test('partial name updates preserve existing classroom membership', async t => {
  const child = new User({ _id: id(1), name: 'Child', role: 'CHILD', assignedClass: id(2) });
  t.mock.method(child, 'save', async () => child);
  t.mock.method(User, 'findById', () => query(child));
  const res = await invoke(C.updateUser, { name: 'Updated' }, { id: id(1) });
  assert.equal(res.error, undefined);
  assert.equal(String(child.assignedClass), id(2));
});
test('teacher assignment through user editing rejects conflicting classrooms before writes', async t => {
  const teacher = new User({ _id: id(1), name: 'Teacher', role: 'TEACHER', assignedClass: id(2) });
  t.mock.method(User, 'findById', async () => teacher);
  t.mock.method(User, 'findOne', async () => teacher);
  t.mock.method(ClassRoom, 'findById', async () => ({ _id: id(3), name: 'B' }));
  t.mock.method(ClassRoom, 'findOne', async () => ({ _id: id(2), name: 'A' }));
  const res = await invoke(C.updateUser, { assignedClass: id(3) }, { id: id(1) });
  assert.equal(res.error.statusCode, 400);
});
test('teacher synchronisation clears previous assignments and updates existing schedules', async t => {
  const room = { _id: id(2), teacher: id(3), save: async () => {} };
  t.mock.method(User, 'findOne', async () => ({ _id: id(4), role: 'TEACHER' }));
  t.mock.method(ClassRoom, 'findOne', async () => null);
  const calls = [];
  t.mock.method(User, 'updateMany', async (...args) => calls.push(['clear', ...args]));
  t.mock.method(User, 'findByIdAndUpdate', async (...args) => calls.push(['assign', ...args]));
  t.mock.method(Schedule, 'updateMany', async (...args) => calls.push(['schedule', ...args]));
  await I.syncTeacher(room, id(4));
  assert.equal(room.teacher, id(4));
  assert.equal(calls.find(call => call[0] === 'schedule')[2].$set.teacher, id(4));
  assert.equal(calls.find(call => call[0] === 'clear')[1]._id.$ne, id(4));
});
test('bulk assignments reject non-student IDs before membership changes', async t => {
  t.mock.method(User, 'find', () => query([]));
  let writes = 0;
  t.mock.method(ClassRoom, 'updateMany', async () => writes++);
  await assert.rejects(() => I.moveStudents({ _id: id(2) }, [id(1)], true), /học sinh/);
  assert.equal(writes, 0);
});
test('replacing a roster removes old memberships and releases omitted students', async t => {
  t.mock.method(User, 'find', () => query([{ _id: id(1) }]));
  const calls = [];
  t.mock.method(ClassRoom, 'updateMany', async (...args) => calls.push(['old', ...args]));
  t.mock.method(ClassRoom, 'updateOne', async (...args) => calls.push(['roster', ...args]));
  t.mock.method(User, 'updateMany', async (...args) => calls.push(['users', ...args]));
  await I.moveStudents({ _id: id(2), ageGroupCode: '5-6', ageGroup: id(3) }, [id(1)], true);
  assert.deepEqual(calls.find(call => call[0] === 'old')[2], { $pull: { students: { $in: [id(1)] } } });
  assert.ok(calls.some(call => call[2].$unset?.assignedClass));
  assert.ok(calls.some(call => call[2].$set?.ageGroup === id(3)));
});
test('stale removal clears assignedClass only if it still matches the selected room', async t => {
  t.mock.method(ClassRoom, 'findById', async () => ({ _id: id(2), name: 'A' }));
  t.mock.method(ClassRoom, 'updateOne', async () => ({}));
  let filter;
  t.mock.method(User, 'updateOne', async value => { filter = value; });
  const res = await invoke(C.removeStudentFromClassroom, {}, { id: id(2), studentId: id(1) });
  assert.equal(res.error, undefined);
  assert.equal(filter.assignedClass, id(2));
  assert.equal(filter.role, 'CHILD');
});
test('all import rows validate before the first write', async t => {
  t.mock.method(AgeGroup, 'findOne', async () => ({ _id: id(1) }));
  t.mock.method(User, 'exists', async () => null);
  let saves = 0;
  t.mock.method(User.prototype, 'save', async () => saves++);
  await assert.rejects(() => I.importStudents([{ name: 'Good' }, { name: '' }], null), /Dòng 2/);
  assert.equal(saves, 0);
});
test('failed imports compensate saved accounts and roster links', async t => {
  t.mock.method(AgeGroup, 'findOne', async () => ({ _id: id(1) }));
  t.mock.method(User, 'exists', async () => null);
  let saved = 0;
  let deleted;
  t.mock.method(User.prototype, 'save', async function () { if (this.name === 'Bad') throw new Error('insert failure'); saved++; });
  t.mock.method(User, 'deleteMany', async filter => { deleted = filter._id.$in; });
  t.mock.method(ClassRoom, 'updateOne', async () => ({}));
  await assert.rejects(() => I.importStudents([{ name: 'Good' }, { name: 'Bad' }], { _id: id(2), ageGroupCode: '3-4' }), /insert failure/);
  assert.equal(saved, 1);
  assert.equal(deleted.length, 1);
});
test('retrying an imported row skips its account and does not re-expose credentials', async t => {
  t.mock.method(AgeGroup, 'findOne', async () => ({ _id: id(1) }));
  t.mock.method(User, 'exists', async filter => filter.importKey ? { _id: id(3) } : null);
  const result = await I.importStudents([{ name: 'Already imported', pin: '0123' }], null);
  assert.equal(result.skippedCount, 1);
  assert.deepEqual(result.credentials, []);
});
test('older game forms preserve metadata, vocabulary and option audio when saved', async t => {
  const activity = new Activity({ lesson: id(2), title: 'Game', activityType: 'COUNT_OBJECTS', ageGroup: id(3), ageGroupCode: '3-4', questions: [{ promptText: 'Count', correctAnswer: '3', vocabulary: id(4), metadata: { quantity: 3 }, options: [{ id: 'one', text: '3', isCorrect: true, audioUrl: '/three.mp3' }] }] });
  t.mock.method(activity, 'save', async () => activity);
  t.mock.method(Activity, 'findById', async () => activity);
  t.mock.method(AuditLog, 'create', async () => ({}));
  const res = await invoke(C.updateAdminActivity, { title: 'Renamed', questions: [{ promptText: 'Count', correctAnswer: '3', options: [{ id: 'one', text: '3', isCorrect: true }] }] }, { id: String(activity._id) }, { _id: id(1) });
  assert.equal(res.error, undefined);
  assert.deepEqual(activity.questions[0].metadata, { quantity: 3 });
  assert.equal(String(activity.questions[0].vocabulary), id(4));
  assert.equal(activity.questions[0].options[0].audioUrl, '/three.mp3');
});
test('schedule rules reject invalid times, reversed dates and overlapping slots', () => {
  const slot = { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' };
  assert.throws(() => validateSlots([{ ...slot, endTime: '07:00' }]), /kết thúc/);
  assert.throws(() => validateSlots([{ ...slot, startTime: '25:00' }]), /HH:mm/);
  assert.throws(() => validateSlots([slot, { ...slot, startTime: '08:30' }]), /trùng giờ/);
  assert.throws(() => validateSlots([slot], '2026-10-29', '2026-10-28'), /Ngày kết thúc/);
  assert.doesNotThrow(() => validateSlots([slot, { ...slot, startTime: '09:00', endTime: '10:00' }]));
});
test('schedule validation also checks reservations in other classrooms', async t => {
  t.mock.method(ClassRoom, 'findById', async () => ({ teacher: id(2), ageGroupCode: '3-4', status: 'ACTIVE' }));
  t.mock.method(User, 'exists', async () => true);
  t.mock.method(Schedule, 'find', () => query([{ classroom: id(5), teacher: id(6), weeklySlots: [{ dayOfWeek: 1, startTime: '08:30', endTime: '09:30', room: 'Room A' }] }]));
  await assert.rejects(() => validateSchedule({ classroom: id(1), teacher: id(2), weeklySlots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '09:00', room: 'room a' }] }), /Trùng lịch/);
});
test('admins cannot be disabled through user editing', async t => {
  t.mock.method(User, 'findById', async () => new User({ _id: id(1), role: 'ADMIN', name: 'Admin' }));
  const res = await invoke(C.updateUser, { status: 'LOCKED' }, { id: id(1) });
  assert.equal(res.error.statusCode, 400);
});
test('teachers cannot read another teacher schedule', async () => {
  const res = await invoke(C.getTeacherSchedule, {}, { teacherId: id(2) }, { _id: id(1), role: 'TEACHER' });
  assert.equal(res.error.statusCode, 403);
});
test('inactive or wrong-age lessons cannot be assigned as the current class lesson', async t => {
  t.mock.method(ClassRoom, 'findById', async () => ({ ageGroupCode: '3-4' }));
  let filter;
  t.mock.method(Lesson, 'findOne', async value => { filter = value; return null; });
  const res = await invoke(C.updateClassroomCurriculumProgress, { currentLessonId: id(2) }, { id: id(1) });
  assert.equal(res.code, 400);
  assert.equal(filter.status, 'ACTIVE');
  assert.equal(filter.ageGroupCode, '3-4');
});
test('classroom cleanup reports failures and resumes the saved work list on retry', async t => {
  const room = { _id: id(2), name: 'Room', status: 'ACTIVE', deletionPending: false, save: async () => {} };
  t.mock.method(ClassRoom, 'findById', async () => room);
  t.mock.method(User, 'find', () => query([{ _id: id(1) }]));
  for (const name of ['LearningSession', 'ActivityResult', 'Progress', 'UnitCompletion', 'TeacherNote', 'VocabularyMastery', 'Assignment', 'ParentNotification', 'Attendance', 'ClassroomSession']) t.mock.method(models[name], 'deleteMany', async () => ({}));
  for (const name of ['Attendance', 'ClassroomSession', 'ClassRoom', 'User']) t.mock.method(models[name], 'updateMany', async () => ({}));
  t.mock.method(User, 'deleteMany', async () => ({}));
  t.mock.method(ClassRecognition, 'deleteMany', async () => ({}));
  t.mock.method(ClassRecognition, 'updateMany', async () => ({}));
  let failSchedule = true;
  let deletedRooms = 0;
  t.mock.method(Schedule, 'deleteMany', async () => { if (failSchedule) throw new Error('schedule cleanup unavailable'); });
  t.mock.method(ClassRoom, 'deleteOne', async () => { deletedRooms++; });
  const first = await invoke(C.deleteClassroom, {}, { id: id(2) });
  assert.match(first.error.message, /cleanup unavailable/);
  assert.equal(room.deletionPending, true);
  assert.equal(room.status, 'INACTIVE');
  assert.deepEqual(room.deletionStudentIds, [id(1)]);
  assert.equal(deletedRooms, 0);
  failSchedule = false;
  const second = await invoke(C.deleteClassroom, {}, { id: id(2) });
  assert.equal(second.error, undefined);
  assert.equal(second.data.success, true);
  assert.equal(deletedRooms, 1);
});
test('PIN, username and calendar validation handle leading zeroes and impossible dates', async t => {
  t.mock.method(User, 'exists', async () => null);
  assert.equal(I.pin('0000'), '0000');
  assert.throws(() => I.pin('123'), /PIN/);
  assert.throws(() => I.parseDob('2026-02-31'), /không tồn tại/);
  assert.equal(await I.username('Đỗ An', 'do.an'), 'do.an');
  assert.match(await I.username('Đỗ An'), /^doan\d{5}$/);
});
test('admin analytics uses best Lesson stars and includes homework awards without summing retries', async t => {
  t.mock.method(models.Assignment, 'find', () => query([{ reviews: [{ child: id(1), bonusStars: 2 }] }]));
  t.mock.method(User, 'find', () => query([{ _id: id(1), name: 'Child', assignedClass: { _id: id(2), name: 'Room' } }]));
  t.mock.method(ClassRoom, 'find', () => query([{ _id: id(2), name: 'Room', teacher: { name: 'Teacher' } }]));
  t.mock.method(models.Progress, 'find', () => query([{ lesson: id(3), completed: true, stars: 3 }]));
  t.mock.method(models.UnitCompletion, 'find', () => query([]));
  t.mock.method(models.ClassroomSession, 'find', filter => { assert.equal(filter.status, 'COMPLETED'); return query([]); });
  t.mock.method(Activity, 'find', () => query([{ _id: id(4), lesson: id(3), questions: [{}], pointsPerQuestion: 10 }]));
  t.mock.method(models.ActivityResult, 'find', () => query([{ activity: id(4), lesson: id(3), score: 10, stars: 3 }, { activity: id(4), lesson: id(3), score: 10, stars: 3 }]));
  const res = await invoke(C.getAdminAnalytics);
  assert.equal(res.error, undefined);
  assert.equal(res.data.data.totalHomeStars, 5);
  assert.equal(res.data.data.totalAllStars, 5);
  assert.equal(res.data.data.classroomStats[0].totalStars, 5);
  assert.equal(res.data.data.topStudents[0].totalStars, 5);
});
test('a new child competency report has no fabricated vocabulary or pronunciation measurements', async t => {
  t.mock.method(User, 'findOne', () => query({ _id: id(1), name: 'New child' }));
  for (const name of ['Progress', 'UnitCompletion', 'ClassroomSession', 'ActivityResult', 'VocabularyMastery', 'Assignment']) t.mock.method(models[name], 'find', () => query([]));
  t.mock.method(models.Progress, 'countDocuments', async () => 0);
  const res = await invoke(C.getStudentCompetency, {}, { id: id(1) });
  assert.equal(res.error, undefined);
  assert.equal(res.data.data.competencyReport.vocabularyCompetency.masteredCount, 0);
  assert.equal(res.data.data.competencyReport.listeningCompetency.totalResponses, 0);
  assert.equal(res.data.data.competencyReport.pronunciationCompetency.averageScore, null);
});
test('activity submission rejects non-child accounts before creating learning records', async t => {
  t.mock.method(User, 'exists', async () => null);
  await assert.rejects(() => require('../src/services/learningService').processActivityResult({ childId: id(1), activityId: id(2), lessonId: id(3) }), /học sinh/);
});
test('production signing refuses a missing JWT secret', () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = 'production'; delete process.env.JWT_SECRET;
  try { assert.throws(() => require('../src/config/auth').jwtSecret(), /JWT_SECRET/); }
  finally { if (oldNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldNodeEnv; if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret; }
});
test('an active activity in a stopped lesson cannot be opened from a saved URL', async t => {
  t.mock.method(Activity, 'findOne', () => query({ _id: id(1), status: 'ACTIVE', lesson: { _id: id(2), status: 'INACTIVE' } }));
  const res = await invoke(require('../src/controllers/activityController').getActivityById, {}, { id: id(1) });
  assert.equal(res.code, 404);
});
test('starting a session validates active child and lesson before creating any record', async t => {
  t.mock.method(User, 'exists', async () => false);
  await assert.rejects(() => require('../src/services/learningService').getOrCreateSession(id(1), id(2)), /không hoạt động/);
});
