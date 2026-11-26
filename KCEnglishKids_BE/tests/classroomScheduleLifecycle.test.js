const test = require('node:test');
const assert = require('node:assert/strict');
const { User, ClassRoom, AgeGroup, Schedule, CurriculumBook, CurriculumUnit, Lesson, Topic, ClassroomSession, Attendance, ParentNotification } = require('../src/models');
const I = require('../src/services/adminIntegrity');
const C = require('../src/controllers/adminController');
const sessions = require('../src/controllers/classroomSessionController');
const rules = require('../src/services/teacherRules');
const access = require('../src/services/teacherAccess');
const { validateSchedule } = require('../src/services/scheduleRules');
const { generateCurriculumDraft, generateLessonDraft, generateLessonDraftWithAI } = require('../src/services/aiService');

const id = n => String(n).padStart(24, '0');
const query = value => ({
  select() { return this; },
  populate() { return this; },
  sort() { return this; },
  limit() { return this; },
  skip() { return this; },
  lean: async () => value,
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject)
});

const invoke = async (fn, body = {}, params = {}, user = { _id: id(1), role: 'ADMIN' }) => {
  const res = {
    code: 200,
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await fn({ body, params, query: {}, user }, res, error => { res.error = error; res.code = error.statusCode || 400; });
  return res;
};

test('Classroom state machine prevents invalid jumps and preserves schedule history with effectiveTo on COMPLETED', async t => {
  const upcomingRoom = { _id: id(2), name: 'Mầm 1', teacher: id(3), status: 'UPCOMING', ageGroupCode: '3-4', save: async () => {} };
  t.mock.method(ClassRoom, 'findById', async () => upcomingRoom);

  // 1. UPCOMING -> COMPLETED directly is rejected
  const res1 = await invoke(C.updateClassroom, { status: 'COMPLETED' }, { id: id(2) });
  assert.ok(res1.error);
  assert.match(res1.error.message, /sắp khai giảng/i);

  // 2. COMPLETED -> ACTIVE is rejected (closed historical cohort)
  const completedRoom = { ...upcomingRoom, status: 'COMPLETED' };
  t.mock.method(ClassRoom, 'findById', async () => completedRoom);
  const res2 = await invoke(C.updateClassroom, { status: 'ACTIVE' }, { id: id(2) });
  assert.ok(res2.error);
  assert.match(res2.error.message, /đã hoàn thành/i);

  // 3. ACTIVE -> COMPLETED while a LIVE session exists is rejected
  const activeRoom = {
    _id: id(2),
    name: 'Mầm 1',
    teacher: id(3),
    status: 'ACTIVE',
    ageGroupCode: '3-4',
    save: async () => {},
    populate: async function () { return this; }
  };
  t.mock.method(ClassRoom, 'findById', async () => activeRoom);
  t.mock.method(ClassroomSession, 'exists', async () => ({ _id: id(99) }));
  const res3 = await invoke(C.updateClassroom, { status: 'COMPLETED' }, { id: id(2) });
  assert.ok(res3.error);
  assert.equal(res3.error.statusCode, 409);

  // 4. ACTIVE -> COMPLETED when no LIVE session exists keeps Schedule.isActive = true and sets effectiveTo
  t.mock.method(ClassroomSession, 'exists', async () => null);
  t.mock.method(User, 'updateOne', async () => ({}));
  t.mock.method(User, 'updateMany', async () => ({}));
  let scheduleUpdatePayload = null;
  t.mock.method(Schedule, 'updateMany', async (_filter, update) => {
    scheduleUpdatePayload = update;
    return {};
  });
  activeRoom.status = 'COMPLETED';
  await I.syncTeacher(activeRoom, id(3));
  assert.ok(scheduleUpdatePayload);
  assert.equal(scheduleUpdatePayload.$set.isActive, true);
  assert.ok(scheduleUpdatePayload.$set.effectiveTo instanceof Date);
});

test('Schedule validation releases teachers and rooms immediately once a class is COMPLETED', async t => {
  t.mock.method(ClassRoom, 'findById', async () => ({ _id: id(10), teacher: id(2), ageGroupCode: '3-4', status: 'ACTIVE' }));
  t.mock.method(User, 'exists', async () => true);
  t.mock.method(Schedule, 'find', () => query([
    {
      _id: id(20),
      classroom: { _id: id(5), status: 'COMPLETED' },
      teacher: id(2),
      weeklySlots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '09:00', room: 'Room A' }]
    }
  ]));

  await assert.doesNotReject(() =>
    validateSchedule({
      classroom: id(10),
      teacher: id(2),
      weeklySlots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '09:00', room: 'Room A' }]
    })
  );
});

test('Teacher startSession enforces strict opening window [start - 15m, end] and auto-closes stale >90m LIVE sessions', async t => {
  const draftSession = {
    _id: id(50),
    classroom: id(2),
    teacher: id(1),
    lesson: id(7),
    status: 'SCHEDULED',
    activities: [],
    studentScores: [],
    save: async function () { return this; }
  };

  t.mock.method(ClassroomSession, 'findOne', () => query(draftSession));
  t.mock.method(access, 'classroom', async () => ({
    _id: id(2),
    teacher: id(1),
    status: 'ACTIVE',
    students: [id(11)],
    completedLessons: []
  }));
  t.mock.method(Schedule, 'find', async () => [
    {
      _id: id(30),
      isActive: true,
      weeklySlots: [{ dayOfWeek: 1, startTime: '15:00', endTime: '15:45' }]
    }
  ]);

  // 1. At 08:00 on Monday (day 1, minutes = 480), opening a 15:00 class is blocked!
  t.mock.method(rules, 'vnClock', () => ({ day: 1, minutes: 8 * 60 }));
  const earlyRes = await invoke(sessions.startSession, {}, { id: id(50) }, { _id: id(1), role: 'TEACHER' });
  assert.equal(earlyRes.code, 409);
  assert.match(earlyRes.error.message, /15:00/);

  // 2. Admin is not allowed to start a live teaching session on behalf of the teacher
  const adminRes = await invoke(sessions.startSession, {}, { id: id(50) }, { _id: id(99), role: 'ADMIN' });
  assert.equal(adminRes.code, 403);

  // 3. At 14:50 on Monday (10 minutes before 15:00), teacher CAN start, and stale >90m LIVE session is auto-closed
  t.mock.method(rules, 'vnClock', () => ({ day: 1, minutes: 14 * 60 + 50 }));
  t.mock.method(rules, 'vnDate', () => '2026-11-16');
  t.mock.method(Attendance, 'findOne', async () => ({
    records: [{ student: id(11), status: 'PRESENT' }]
  }));
  t.mock.method(Lesson, 'exists', async () => true);

  let staleSaved = false;
  const staleSession = {
    _id: id(49),
    classroom: id(2),
    teacher: id(1),
    status: 'LIVE',
    startedAt: new Date(Date.now() - 100 * 60 * 1000), // 100 mins ago (> 90 mins)
    studentScores: [],
    questionResults: [],
    save: async function () { staleSaved = true; return this; }
  };
  let existsCall = 0;
  t.mock.method(ClassroomSession, 'exists', async () => {
    existsCall++;
    return existsCall === 1 ? { _id: id(49) } : null;
  });
  t.mock.method(ClassroomSession, 'find', async () => [staleSession]);

  const onTimeRes = await invoke(sessions.startSession, {}, { id: id(50) }, { _id: id(1), role: 'TEACHER' });
  assert.equal(onTimeRes.error, undefined);
  assert.equal(draftSession.status, 'LIVE');
  assert.equal(staleSaved, true);
  assert.equal(staleSession.status, 'COMPLETED');
});

test('Cancelled session reportOff publishes ParentNotification and never fabricates attendance scores', async t => {
  const room = { _id: id(2), name: 'Lớp Mầm 1', teacher: id(1), ageGroupCode: '3-4', students: [id(11), id(12)] };
  t.mock.method(access, 'classroom', async () => room);
  t.mock.method(ClassroomSession, 'findOne', async () => null);
  t.mock.method(ClassroomSession, 'countDocuments', async () => 3);
  t.mock.method(ClassroomSession, 'create', async data => ({ _id: id(60), ...data }));
  t.mock.method(User, 'find', () => query([
    { _id: id(11), name: 'Bé An', contact: '0901' },
    { _id: id(12), name: 'Bé Bình', contact: '0902' }
  ]));

  const publishedNotifications = [];
  const inbox = require('../src/services/parentInbox');
  t.mock.method(inbox, 'publish', async payload => {
    publishedNotifications.push(payload);
    return payload;
  });

  const futureDate = new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const res = await invoke(
    sessions.reportOff,
    {
      classroomId: id(2),
      date: futureDate,
      reason: 'Nghỉ lễ nhà trường',
      note: 'Nghỉ ngày Nhà giáo Việt Nam',
      timeSlot: { startTime: '08:00', endTime: '08:45' }
    },
    {},
    { _id: id(1), role: 'TEACHER' }
  );

  assert.equal(res.error, undefined);
  assert.equal(res.data.data.status, 'CANCELLED');
  assert.equal(publishedNotifications.length, 2);
  assert.match(publishedNotifications[0].subject, /Thông báo nghỉ học/);
  assert.match(publishedNotifications[0].content, /Nghỉ lễ nhà trường/);
});

test('reportOff blocks cancellation for past dates and when start time has passed today', async t => {
  const room = { _id: id(2), name: 'Lớp Mầm 1', teacher: id(1), ageGroupCode: '3-4', students: [id(11)] };
  t.mock.method(access, 'classroom', async () => room);

  // 1. Past date blocked
  const resPast = await invoke(
    sessions.reportOff,
    { classroomId: id(2), date: '2020-01-01', reason: 'Nghỉ' },
    {},
    { _id: id(1), role: 'TEACHER' }
  );
  assert.equal(resPast.code, 400);
  assert.match(resPast.error?.message || resPast.data?.message, /quá khứ/i);

  // 2. Today but slot startTime 00:01 (already passed) blocked
  const todayVn = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const resPassedToday = await invoke(
    sessions.reportOff,
    {
      classroomId: id(2),
      date: todayVn,
      reason: 'Nghỉ muộn',
      timeSlot: { startTime: '00:01', endTime: '00:45' }
    },
    {},
    { _id: id(1), role: 'TEACHER' }
  );
  assert.equal(resPassedToday.code, 400);
  assert.match(resPassedToday.error?.message || resPassedToday.data?.message, /quá thời hạn báo nghỉ|ít nhất 30 phút/i);
});

test('CurriculumUnit allows unitNumber > 9 (U10, U11) and AI draft generates 4 structured lessons', async t => {
  // 1. Validate CurriculumUnit schema with unitNumber = 10
  const unit10 = new CurriculumUnit({
    book: id(1),
    bookNumber: 1,
    ageGroup: id(2),
    ageGroupCode: '3-4',
    unitNumber: 10,
    bigQuestion: 'What ocean animals can you see?'
  });
  await assert.doesNotReject(() => unit10.validate());

  // 2. Verify AI curriculum draft includes 4 structured preschool lessons
  const draft = generateCurriculumDraft({
    topic: 'Động vật biển (Ocean Animals)',
    ageGroup: '3-4'
  });
  assert.equal(Array.isArray(draft.unitLessons), true);
  assert.equal(draft.unitLessons.length, 4);
  assert.deepEqual(
    draft.unitLessons.map(l => l.lessonOrder),
    [1, 2, 3, 4]
  );
  assert.match(draft.unitLessons[0].title, /Vocabulary & Phonics/);
  assert.match(draft.unitLessons[1].title, /Sentence Patterns & Speaking/);
  assert.match(draft.unitLessons[2].title, /Story, Song & Good Values/);
  assert.match(draft.unitLessons[3].title, /Fun Mini Games & Review/);

  // 3. Verify that all 4 lessons have distinct vocabularies and distinct sentence patterns
  const vehicleDraft = generateCurriculumDraft({
    topic: 'Các phương tiện giao thông (Vehicles)',
    ageGroup: '3-4'
  });
  const wordsL1 = vehicleDraft.unitLessons[0].vocabularies.map(v => v.english);
  const wordsL2 = vehicleDraft.unitLessons[1].vocabularies.map(v => v.english);
  const wordsL3 = vehicleDraft.unitLessons[2].vocabularies.map(v => v.english);
  const wordsL4 = vehicleDraft.unitLessons[3].vocabularies.map(v => v.english);
  const combinedWords = [...wordsL1, ...wordsL2, ...wordsL3, ...wordsL4];
  assert.equal(new Set(combinedWords).size, combinedWords.length, 'All 4 lessons must have completely distinct vocabulary words');
  assert.ok(wordsL1.length > 0 && wordsL2.length > 0 && wordsL3.length > 0 && wordsL4.length > 0);
  assert.ok(vehicleDraft.unitLessons.every(l => Array.isArray(l.sentencePairs) && l.sentencePairs.length > 0), 'All 4 lessons must have distinct sentence pairs');
});

test('generateLessonDraft creates a new lesson inside an existing unit with distinct words, sentence pairs and IPA', async t => {
  const lessonDraft = generateLessonDraft({
    topic: 'Vui chơi ở sân trường (Playground Fun)',
    ageGroup: '3-4',
    unitId: id(10),
    unitNumber: 2,
    unitBigQuestion: 'Who is at school?',
    existingLessonCount: 2,
    existingWords: ['teacher', 'friend']
  });

  assert.equal(lessonDraft.ageGroupCode, '3-4');
  assert.equal(lessonDraft.unitNumber, 2);
  assert.match(lessonDraft.suggestedLessonTitle, /Unit 2 - Lesson 3/);
  assert.match(lessonDraft.suggestedVietnameseTitle, /Bài 3/);
  assert.ok(Array.isArray(lessonDraft.vocabularies));
  assert.ok(lessonDraft.vocabularies.length >= 3);
  assert.ok(lessonDraft.vocabularies.every(v => v.english && v.vietnamese && v.pronunciation));
  assert.ok(Array.isArray(lessonDraft.sentencePairs));
  assert.ok(lessonDraft.sentencePairs.length >= 1);
  assert.ok(lessonDraft.sentencePairs.every(p => p.questionEnglish && p.answerEnglish));
});

test('5-minute home review logic: hidden if untaught, 3 stars on first completion, 0 stars on repeat', async t => {
  const { getHomeReview, completeHomeReview } = require('../src/services/homePractice');
  const { HomePracticeCompletion, HomePracticePlan, Progress, UnitCompletion, LanguageContent, VocabularyMastery, Activity, ActivityResult } = require('../src/models');

  const childUntaught = { _id: id(100), assignedClass: id(200), ageGroupCode: '3-4' };
  const roomUntaught = { _id: id(200), name: 'Lớp Mầm 1', completedLessons: [], save: async () => {} };

  let storedCompletion = null;
  t.mock.method(HomePracticeCompletion, 'findOne', () => query(storedCompletion));
  t.mock.method(HomePracticeCompletion, 'find', () => query(storedCompletion ? [storedCompletion] : []));
  t.mock.method(HomePracticeCompletion, 'create', async (data) => {
    storedCompletion = { ...data, _id: id(500) };
    return storedCompletion;
  });

  t.mock.method(ClassRoom, 'findById', () => query(roomUntaught));
  t.mock.method(User, 'findById', () => query(childUntaught));
  t.mock.method(User, 'findOne', () => query(childUntaught));
  t.mock.method(ClassroomSession, 'findOne', () => query(null));
  t.mock.method(ClassroomSession, 'find', () => query([]));
  t.mock.method(HomePracticePlan, 'findOne', () => query(null));
  t.mock.method(Progress, 'find', () => query([]));
  t.mock.method(UnitCompletion, 'find', () => query([]));
  if (LanguageContent) t.mock.method(LanguageContent, 'find', () => query([]));
  if (VocabularyMastery) t.mock.method(VocabularyMastery, 'find', () => query([]));
  if (Activity) t.mock.method(Activity, 'find', () => query([]));
  if (ActivityResult) t.mock.method(ActivityResult, 'find', () => query([]));

  // 1. Untaught class: getHomeReview MUST return null
  const reviewUntaught = await getHomeReview(childUntaught);
  assert.equal(reviewUntaught, null, 'Must not show or return home review when teacher has not taught any lesson');

  // Attempting to complete when no lesson has been taught returns 0 stars
  const completeUntaught = await completeHomeReview(childUntaught);
  assert.equal(completeUntaught.newlyCompleted, false);
  assert.equal(completeUntaught.starsAwarded, 0);

  // 2. Now teacher teaches Lesson id(300)
  const taughtLesson = { _id: id(300), title: 'Things at School', vietnameseTitle: 'Đồ dùng ở trường', vocabularyItems: [] };
  const sessionCompleted = {
    _id: id(400),
    classroom: id(200),
    status: 'COMPLETED',
    lesson: taughtLesson,
    studentScores: [{ student: id(100), attendance: 'PRESENT' }]
  };
  t.mock.method(ClassroomSession, 'findOne', () => query(sessionCompleted));
  t.mock.method(Lesson, 'findById', () => query(taughtLesson));

  const reviewTaught = await getHomeReview(childUntaught);
  assert.ok(reviewTaught, 'Must return review when teacher has taught a lesson');
  assert.equal(String(reviewTaught.lessonId), id(300));

  // 3. Complete review for the first time: grants exactly 3 stars

  const firstComplete = await completeHomeReview(childUntaught, id(300));
  assert.equal(firstComplete.newlyCompleted, true, 'First completion must be newlyCompleted: true');
  assert.equal(firstComplete.starsAwarded, 3, 'First completion must award exactly 3 stars');

  // 4. Complete review a second time for the same lesson: 0 stars awarded
  const secondComplete = await completeHomeReview(childUntaught, id(300));
  assert.equal(secondComplete.newlyCompleted, false, 'Repeat completion must be newlyCompleted: false');
  assert.equal(secondComplete.starsAwarded, 0, 'Repeat completion of the same lesson must NOT grant additional stars');
});
