const test = require('node:test');
const assert = require('node:assert/strict');
const { User, ClassRoom, AgeGroup, CurriculumBook, CurriculumUnit, Lesson, AuditLog, ClassroomSession } = require('../src/models');
const I = require('../src/services/adminIntegrity');
const C = require('../src/controllers/adminController');

const id = n => String(n).padStart(24, '0');

const invoke = async (fn, body = {}, params = {}, user = { _id: id(1), role: 'ADMIN' }) => {
  const res = {
    code: 200,
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await fn({ body, params, query: {}, user }, res, error => { res.error = error; res.code = error.statusCode || 400; });
  return res;
};

test('rolloverClassroom prevents rollover for 5-6 age group', async t => {
  const room56 = {
    _id: id(10),
    name: 'Lá 1',
    ageGroupCode: '5-6',
    status: 'COMPLETED',
    students: [id(20), id(21)]
  };
  t.mock.method(ClassRoom, 'findById', () => ({
    populate: async () => room56
  }));

  const res = await invoke(C.rolloverClassroom, { name: 'Lớp Mới' }, { id: id(10) });
  assert.strictEqual(res.code, 400);
  assert.ok(res.data?.message || res.error?.message);
  assert.match(res.data?.message || res.error?.message, /5-6 tuổi/i);
});

test('rolloverClassroom blocks rollover if class is ACTIVE (not completed)', async t => {
  const activeRoom = {
    _id: id(10),
    name: 'Mầm Đang Học',
    ageGroupCode: '3-4',
    status: 'ACTIVE',
    students: [id(20)]
  };
  t.mock.method(ClassRoom, 'findById', () => ({
    populate: async () => activeRoom
  }));

  const res = await invoke(C.rolloverClassroom, { name: 'Chồi Mới' }, { id: id(10) });
  assert.strictEqual(res.code, 400);
  assert.match(res.data?.message || res.error?.message, /Đã hoàn thành/i);
});

test('rolloverClassroom succeeds for 3-4 COMPLETED class: creates 4-5 class, archives old class, updates students', async t => {
  const room34 = {
    _id: id(11),
    name: 'Mầm 1',
    ageGroupCode: '3-4',
    status: 'COMPLETED',
    students: [id(30), id(31)],
    save: async function() { return this; }
  };
  t.mock.method(ClassRoom, 'findById', () => ({
    populate: async () => room34
  }));
  t.mock.method(ClassRoom, 'findOne', async () => null); // No duplicate name

  const mockNewClass = {
    _id: id(12),
    name: 'Chồi 1',
    ageGroupCode: '4-5',
    status: 'ACTIVE',
    students: [id(30), id(31)],
    save: async function() { return this; },
    populate: async function() { return this; }
  };
  t.mock.method(ClassRoom, 'create', async (data) => Object.assign(mockNewClass, data));

  const mockAgeGroup = { _id: id(50), code: '4-5', name: '4-5 Tuổi' };
  t.mock.method(AgeGroup, 'findOne', async () => mockAgeGroup);

  const mockBook = { _id: id(60), bookNumber: 2, title: 'English for 4-5' };
  t.mock.method(CurriculumBook, 'findOne', async () => mockBook);

  t.mock.method(CurriculumUnit, 'findOne', () => ({
    sort: async () => ({ _id: id(65), unitNumber: 1 })
  }));

  const mockLesson = { _id: id(70), lessonNumber: 1, title: 'Unit 1 Lesson 1' };
  t.mock.method(Lesson, 'findOne', () => ({
    sort: async () => mockLesson
  }));

  t.mock.method(I, 'moveStudents', async (room, ids) => {
    room.students.push(...ids);
  });
  t.mock.method(User, 'updateMany', async () => ({ modifiedCount: 2 }));
  t.mock.method(AuditLog, 'create', async () => ({}));

  const res = await invoke(C.rolloverClassroom, {
    name: 'Chồi 1',
    academicYear: '2027-2028',
    selectedStudentIds: [id(30), id(31)]
  }, { id: id(11) });

  assert.strictEqual(res.code, 201);
  assert.strictEqual(res.data?.success, true);
  assert.strictEqual(room34.status, 'COMPLETED');
  assert.strictEqual(mockNewClass.currentLesson, id(70));
});

test('createClassroom creates UPCOMING classroom without teacher without throwing null error', async t => {
  t.mock.method(ClassRoom, 'findOne', async () => null);

  const mockCreated = {
    _id: id(88),
    name: 'Mầm Sắp Khai Giảng',
    ageGroupCode: '3-4',
    teacher: null,
    status: 'UPCOMING',
    students: [],
    save: async function() { return this; },
    populate: async function() { return this; }
  };
  t.mock.method(ClassRoom, 'create', async (data) => Object.assign(mockCreated, data));
  t.mock.method(AgeGroup, 'findOne', async () => ({ _id: id(51), code: '3-4' }));
  t.mock.method(CurriculumBook, 'findOne', async () => ({ _id: id(61), bookNumber: 1 }));
  t.mock.method(CurriculumUnit, 'findOne', () => ({
    sort: () => ({ _id: id(66), unitNumber: 1 })
  }));
  t.mock.method(Lesson, 'findOne', () => ({
    sort: () => ({ _id: id(71), lessonNumber: 1 })
  }));
  t.mock.method(AuditLog, 'create', async () => ({}));

  const res = await invoke(C.createClassroom, {
    name: 'Mầm Sắp Khai Giảng',
    ageGroupCode: '3-4',
    academicYear: '2026-2027',
    status: 'UPCOMING'
  });

  assert.strictEqual(res.code, 201);
  assert.strictEqual(res.data?.success, true);
  assert.strictEqual(res.data?.data?.teacher, null);
  assert.strictEqual(res.data?.data?.status, 'UPCOMING');
  assert.match(res.data?.message, /Sắp khai giảng/i);
});

test('deleteClassroom blocks deletion if class has real teaching sessions', async t => {
  const room = { _id: id(20), name: 'Lớp Đã Học', status: 'ACTIVE' };
  t.mock.method(ClassRoom, 'findById', async () => room);
  t.mock.method(ClassroomSession, 'countDocuments', async () => 3);

  const res = await invoke(C.deleteClassroom, {}, { id: id(20) });
  assert.strictEqual(res.code, 400);
  assert.ok(res.error?.message);
  assert.match(res.error.message, /3 buổi dạy thực tế/i);
});

test('deleteClassroom allows deleting unused class and releases children without deleting accounts', async t => {
  const models = require('../src/models');
  const ClassRecognition = require('../src/models/ClassRecognition');
  const room = {
    _id: id(21),
    name: 'Lớp Sắp Khai Giảng',
    status: 'UPCOMING',
    deletionPending: false,
    save: async function() { return this; }
  };
  t.mock.method(ClassRoom, 'findById', async () => room);
  t.mock.method(ClassroomSession, 'countDocuments', async () => 0);
  t.mock.method(User, 'find', () => ({
    select: async () => [{ _id: id(31) }]
  }));
  t.mock.method(User, 'updateMany', async () => ({ modifiedCount: 1 }));
  t.mock.method(ClassRoom, 'deleteOne', async () => ({ deletedCount: 1 }));
  t.mock.method(ClassRoom, 'updateMany', async () => ({}));
  t.mock.method(models.Schedule, 'deleteMany', async () => ({}));
  t.mock.method(models.Attendance, 'deleteMany', async () => ({}));
  t.mock.method(models.ClassroomSession, 'deleteMany', async () => ({}));
  t.mock.method(models.LearningObservation, 'deleteMany', async () => ({}));
  t.mock.method(models.HomePracticePlan, 'deleteMany', async () => ({}));
  t.mock.method(ClassRecognition, 'deleteMany', async () => ({}));
  t.mock.method(AuditLog, 'create', async () => ({}));

  const res = await invoke(C.deleteClassroom, {}, { id: id(21) });
  assert.strictEqual(res.code, 200);
  assert.strictEqual(res.data?.success, true);
  assert.match(res.data?.message, /giải phóng/i);
});

test('promoteStudentsToClassroom blocks promotion if fromClass is not COMPLETED', async t => {
  const fromActiveClass = { _id: id(22), name: 'Chồi 1', ageGroupCode: '4-5', status: 'ACTIVE', students: [id(31)] };
  const toClass = { _id: id(23), name: 'Lá 1', ageGroupCode: '5-6', status: 'ACTIVE' };

  t.mock.method(ClassRoom, 'findById', async (roomQueryId) => {
    if (String(roomQueryId) === id(22)) return fromActiveClass;
    if (String(roomQueryId) === id(23)) return toClass;
    return null;
  });

  const res = await invoke(C.promoteStudentsToClassroom, { targetClassroomId: id(23) }, { id: id(22) });
  assert.strictEqual(res.code, 400);
  assert.match(res.data?.message || res.error?.message, /Đã hoàn thành/i);
});

test('promoteStudentsToClassroom blocks promotion if target class is not exactly 1 age step higher', async t => {
  const fromClass = { _id: id(22), name: 'Chồi 1', ageGroupCode: '4-5', status: 'COMPLETED', students: [id(31)] };
  const toClassSame = { _id: id(23), name: 'Chồi 2', ageGroupCode: '4-5', status: 'ACTIVE' };
  const toClassSmaller = { _id: id(24), name: 'Mầm 1', ageGroupCode: '3-4', status: 'ACTIVE' };
  const fromClassMam = { _id: id(25), name: 'Mầm 1', ageGroupCode: '3-4', status: 'COMPLETED', students: [id(31)] };
  const toClassLa = { _id: id(26), name: 'Lá 1', ageGroupCode: '5-6', status: 'ACTIVE' };

  t.mock.method(ClassRoom, 'findById', async (roomQueryId) => {
    if (String(roomQueryId) === id(22)) return fromClass;
    if (String(roomQueryId) === id(23)) return toClassSame;
    if (String(roomQueryId) === id(24)) return toClassSmaller;
    if (String(roomQueryId) === id(25)) return fromClassMam;
    if (String(roomQueryId) === id(26)) return toClassLa;
    return null;
  });

  // 1. Same age group promotion rejected
  const resSame = await invoke(C.promoteStudentsToClassroom, { targetClassroomId: id(23) }, { id: id(22) });
  assert.strictEqual(resSame.code, 400);
  assert.match(resSame.error?.message || resSame.data?.message, /đúng 1 bậc tuổi kế tiếp/i);

  // 2. Smaller age group promotion rejected
  const resSmaller = await invoke(C.promoteStudentsToClassroom, { targetClassroomId: id(24) }, { id: id(22) });
  assert.strictEqual(resSmaller.code, 400);
  assert.match(resSmaller.error?.message || resSmaller.data?.message, /đúng 1 bậc tuổi kế tiếp/i);

  // 3. Jumping 2 age groups (3-4 -> 5-6) rejected
  const resJump = await invoke(C.promoteStudentsToClassroom, { targetClassroomId: id(26) }, { id: id(25) });
  assert.strictEqual(resJump.code, 400);
  assert.match(resJump.error?.message || resJump.data?.message, /đúng 1 bậc tuổi kế tiếp/i);
});

test('addStudentToClassroom blocks adding older student and blocks jumping age', async t => {
  const room34 = { _id: id(25), name: 'Mầm 1', ageGroupCode: '3-4' };
  const room56 = { _id: id(26), name: 'Lá 1', ageGroupCode: '5-6' };
  const student56 = { _id: id(32), name: 'Bé Lớn', ageGroupCode: '5-6', role: 'CHILD', status: 'ACTIVE' };
  const student34 = { _id: id(33), name: 'Bé Nhỏ', ageGroupCode: '3-4', role: 'CHILD', status: 'ACTIVE' };

  t.mock.method(ClassRoom, 'findById', (roomId) => ({
    populate: async () => String(roomId) === id(26) ? room56 : room34
  }));

  // 1. Older student into younger class blocked
  t.mock.method(User, 'find', async () => [student56]);
  const res1 = await invoke(C.addStudentToClassroom, { studentId: id(32) }, { id: id(25) });
  assert.strictEqual(res1.code, 400);
  assert.match(res1.data?.message || res1.error?.message, /không thể hạ tuổi/i);

  // 2. Jumping 2 ages (3-4 into 5-6) blocked
  t.mock.method(User, 'find', async () => [student34]);
  const res2 = await invoke(C.addStudentToClassroom, { studentId: id(33) }, { id: id(26) });
  assert.strictEqual(res2.code, 400);
  assert.match(res2.data?.message || res2.error?.message, /nhảy cóc/i);
});

test('removeStudentFromClassroom blocks removing student if classroom is COMPLETED', async t => {
  const completedRoom = { _id: id(27), name: 'Mầm Xong Khóa', status: 'COMPLETED' };
  t.mock.method(ClassRoom, 'findById', async () => completedRoom);

  const res = await invoke(C.removeStudentFromClassroom, {}, { id: id(27), studentId: id(32) });
  assert.strictEqual(res.code, 400);
  assert.match(res.data?.message || res.error?.message, /đã hoàn thành.*đóng băng/i);
});

test('resetChildPin blocks easily guessable PIN (1234, 0000) and accepts strong PIN', async t => {
  const childDoc = {
    _id: id(35),
    name: 'Leo',
    role: 'CHILD',
    pin: '9876',
    save: async function() { return this; }
  };
  t.mock.method(User, 'findOne', async () => childDoc);
  t.mock.method(AuditLog, 'create', async () => ({}));

  // 1. Weak PIN 1234 rejected
  const res1234 = await invoke(C.resetChildPin, { pin: '1234' }, { id: id(35) });
  assert.strictEqual(res1234.code, 400);
  assert.match(res1234.data?.message || res1234.error?.message, /dễ đoán/i);

  // 2. Weak PIN 0000 rejected
  const res0000 = await invoke(C.resetChildPin, { pin: '0000' }, { id: id(35) });
  assert.strictEqual(res0000.code, 400);
  assert.match(res0000.data?.message || res0000.error?.message, /dễ đoán/i);

  // 3. Strong PIN 2580 accepted
  const resStrong = await invoke(C.resetChildPin, { pin: '2580' }, { id: id(35) });
  assert.strictEqual(resStrong.code, 200);
  assert.strictEqual(resStrong.data?.success, true);
  assert.strictEqual(childDoc.pin, '2580');
});

test('addStudentToClassroom blocks adding student from 5-6 COMPLETED class (graduated)', async t => {
  const roomUpcoming = { _id: id(26), name: 'Lá Mới Lên Kế Hoạch', ageGroupCode: '5-6', status: 'UPCOMING' };
  const graduatedStudent = {
    _id: id(36),
    name: 'Bé Tốt Nghiệp',
    ageGroupCode: '5-6',
    role: 'CHILD',
    status: 'ACTIVE',
    assignedClass: { _id: id(37), name: 'Lá Cũ Đã Xong', status: 'COMPLETED', ageGroupCode: '5-6' }
  };

  t.mock.method(ClassRoom, 'findById', (roomId) => ({
    populate: async () => roomUpcoming
  }));
  t.mock.method(User, 'find', () => ({
    populate: async () => [graduatedStudent]
  }));

  const res = await invoke(C.addStudentToClassroom, { studentId: id(36) }, { id: id(26) });
  assert.strictEqual(res.code, 400);
  assert.match(res.data?.message || res.error?.message, /tốt nghiệp.*mầm non|hoàn thành.*mầm non/i);
});

test('addStudentToClassroom blocks adding student from COMPLETED class into class of same age group', async t => {
  const room34Upcoming = { _id: id(28), name: 'Mầm Mới Lên Kế Hoạch', ageGroupCode: '3-4', status: 'UPCOMING' };
  const completedStudent34 = {
    _id: id(38),
    name: 'Bé Đã Học Xong Mầm',
    ageGroupCode: '3-4',
    role: 'CHILD',
    status: 'ACTIVE',
    assignedClass: { _id: id(39), name: 'Mầm Cũ Đã Xong', status: 'COMPLETED', ageGroupCode: '3-4' }
  };

  t.mock.method(ClassRoom, 'findById', (roomId) => ({
    populate: async () => room34Upcoming
  }));
  t.mock.method(User, 'find', () => ({
    populate: async () => [completedStudent34]
  }));

  const res = await invoke(C.addStudentToClassroom, { studentId: id(38) }, { id: id(28) });
  assert.strictEqual(res.code, 400);
  assert.match(res.data?.message || res.error?.message, /không thể học lại lớp cùng lứa tuổi/i);
});

test('rolloverClassroom blocks rollover if class is already rolled over (isRolledOver: true)', async t => {
  const alreadyRolledRoom = {
    _id: id(40),
    name: 'Mầm Đã Lên Lớp',
    ageGroupCode: '3-4',
    status: 'COMPLETED',
    isRolledOver: true,
    students: [id(20)]
  };
  t.mock.method(ClassRoom, 'findById', () => ({
    populate: async () => alreadyRolledRoom
  }));

  const res = await invoke(C.rolloverClassroom, { name: 'Chồi Mới' }, { id: id(40) });
  assert.strictEqual(res.code, 400);
  assert.match(res.data?.message || res.error?.message, /hoàn tất lên lớp|lên lớp một lần duy nhất/i);
});

test('promoteStudentsToClassroom blocks promotion if class is already rolled over (isRolledOver: true)', async t => {
  const alreadyRolledRoom = {
    _id: id(41),
    name: 'Chồi Đã Lên Lớp',
    ageGroupCode: '4-5',
    status: 'COMPLETED',
    isRolledOver: true,
    students: [id(21)]
  };
  const toClass = {
    _id: id(42),
    name: 'Lá Tiếp Nhận',
    ageGroupCode: '5-6',
    status: 'ACTIVE'
  };

  t.mock.method(ClassRoom, 'findById', async (roomQueryId) => {
    if (String(roomQueryId) === id(41)) return alreadyRolledRoom;
    if (String(roomQueryId) === id(42)) return toClass;
    return null;
  });

  const res = await invoke(C.promoteStudentsToClassroom, { targetClassroomId: id(42) }, { id: id(41) });
  assert.strictEqual(res.code, 400);
  assert.match(res.data?.message || res.error?.message, /hoàn tất thăng hạng|lên lớp một lần duy nhất/i);
});
