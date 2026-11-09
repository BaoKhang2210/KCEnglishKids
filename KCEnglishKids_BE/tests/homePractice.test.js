const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/models');
const practice = require('../src/services/homePractice');
const report = require('../src/services/familyLearningReport');
const { chooseWords } = practice;
const { lessonGuide } = require('../src/services/earlyLearning');

const id = n => String(n).padStart(24, '0');
const clone = value => JSON.parse(JSON.stringify(value));
// A chainable stand-in for a mongoose query: sort/select/limit/populate are no-ops and lean() resolves the fixture.
const chain = resolve => ({ sort() { return this; }, select() { return this; }, limit() { return this; }, populate() { return this; }, lean: async () => resolve(), then(r, j) { return Promise.resolve(resolve()).then(r, j); } });

const CHILD_ID = id(1);
const ROOM_ID = id(4);
const TEACHER_ID = id(2);
const LESSON_ID = id(3);
const SESSION_ID = id(7);
const CAT = id(20), DOG = id(21), BIRD = id(22);
const OBS_ID = id(50);

function words() {
  return [
    { _id: CAT, english: 'cat', vietnamese: 'mèo', imageUrl: '/cat.png', audioUrl: '/cat.mp3', status: 'ACTIVE', wordType: 'noun' },
    { _id: DOG, english: 'dog', vietnamese: 'chó', imageUrl: '/dog.png', audioUrl: '/dog.mp3', status: 'ACTIVE', wordType: 'noun' },
    { _id: BIRD, english: 'bird', vietnamese: 'chim', imageUrl: '/bird.png', audioUrl: '/bird.mp3', status: 'ACTIVE', wordType: 'noun' }
  ];
}
function lesson() {
  return { _id: LESSON_ID, title: 'Animals', vietnameseTitle: 'Động vật', ageGroupCode: '3-4', status: 'ACTIVE', updatedAt: new Date('2026-11-01T00:00:00Z'), vocabularyItems: words() };
}
function child() { return { _id: CHILD_ID, name: 'Bé A', ageGroupCode: '3-4', assignedClass: ROOM_ID }; }
function room() { return { _id: ROOM_ID, status: 'ACTIVE', teacher: TEACHER_ID }; }
function session() { return { _id: SESSION_ID, lesson: LESSON_ID, classroom: ROOM_ID, status: 'COMPLETED', endedAt: new Date('2026-11-01T00:00:00Z'), teachingOutcome: { coverage: 'CONTINUE' }, teachingGoals: [], studentScores: [{ student: CHILD_ID, attendance: 'PRESENT', stars: 3, correctCount: 4, incorrectCount: 1 }] }; }
function observations(level = 'SUPPORTED') {
  return [{ _id: OBS_ID, child: CHILD_ID, classroom: ROOM_ID, lesson: LESSON_ID, skill: 'LISTEN_POINT', level, vocabulary: [CAT], evidence: 'Bé chỉ tranh mèo sau khi cô gợi ý.', nextStep: 'Nhắc chậm hơn.', voidedAt: null, updatedAt: new Date('2026-11-01T00:00:00Z'), observedAt: new Date('2026-11-01T00:00:00Z') }];
}
function mastery() {
  return [{ _id: id(60), student: CHILD_ID, vocabulary: DOG, masteryLevel: 2, wrongCount: 3, streak: 1, lastReviewedAt: new Date('2026-10-30T00:00:00Z'), updatedAt: new Date('2026-11-01T00:00:00Z') }];
}

// Install in-memory fakes for the models homePractice touches; returns the live plan store.
function install(t, fixture = {}) {
  t.mock.method(M.Assignment, 'findOne', () => chain(() => fixture.assignment || null));
  const plans = [];
  let seq = 1;
  const obs = fixture.observations || observations();
  const sessionRows = fixture.sessions === undefined ? [session()] : fixture.sessions;
  const masteryRows = fixture.mastery === undefined ? mastery() : fixture.mastery;
  t.mock.method(M.ClassroomSession, 'find', () => chain(() => clone(sessionRows)));
  t.mock.method(M.LearningObservation, 'find', () => chain(() => clone(obs)));
  t.mock.method(M.VocabularyMastery, 'find', () => chain(() => clone(masteryRows)));
  t.mock.method(M.Lesson, 'findOne', () => chain(() => (fixture.lesson === null ? null : clone(lesson()))));
  t.mock.method(M.HomePracticePlan, 'findOne', filter => chain(() => {
    if (filter.operationId) {
      const doc = plans.find(p => String(p.teacher) === String(filter.teacher) && p.operationId === filter.operationId);
      return doc ? clone(doc) : null;
    }
    if (filter.child !== undefined) {
      const list = plans.filter(p => String(p.child) === String(filter.child)).sort((a, b) => b.revision - a.revision);
      return list[0] ? clone(list[0]) : null;
    }
    return null;
  }));
  t.mock.method(M.HomePracticePlan, 'create', values => {
    const doc = { _id: id(200 + seq++), createdAt: new Date('2026-11-02T00:00:00Z'), ...values };
    plans.push(doc);
    return { toObject: () => clone(doc) };
  });
  // familyCurrent collaborators
  t.mock.method(M.ClassRoom, 'findById', () => chain(() => clone({ _id: ROOM_ID, status: 'ACTIVE', teacher: TEACHER_ID })));
  t.mock.method(M.Lesson, 'exists', async () => true);
  t.mock.method(M.Vocabulary, 'countDocuments', async query => (query?._id?.$in || []).length);
  return { plans, obs };
}

const req = { user: { _id: TEACHER_ID } };
async function proposal() { return practice.proposal(child(), room(), LESSON_ID); }
function approveBody(draft, override = {}) {
  return {
    lessonId: LESSON_ID,
    expectedRevision: draft.revision,
    basisToken: draft.basisToken,
    operationId: 'approve-' + Math.random().toString(36).slice(2, 12),
    wordIds: draft.items.slice(0, 2).map(item => String(item.vocabulary._id)),
    observationIds: draft.observations.map(item => String(item._id)),
    teacherNote: 'Cô gợi ý chơi cùng bé.',
    homeActivity: { title: 'Tìm tranh động vật', steps: ['Cùng nghe mẫu.', 'Bé chỉ tranh theo lời.'] },
    ...override
  };
}

test('proposal distinguishes attendance, teacher-noted support and practice mistakes, and keeps a stable basis token', async t => {
  install(t);
  const draft = await proposal();
  assert.equal(draft.available, true);
  assert.equal(draft.attended, true);
  assert.match(draft.attendanceBasis, /tham dự/);
  const byWord = Object.fromEntries(draft.items.map(item => [item.vocabulary.english, item.reason]));
  assert.match(byWord.cat, /cô ghi nhận/i);
  assert.match(byWord.dog, /còn nhầm/i);
  assert.match(byWord.bird, /đã tham dự/i);
  // Support-flagged words are ranked before practice mistakes and neutral review words.
  assert.deepEqual(draft.items.map(item => item.vocabulary.english), ['cat', 'dog', 'bird']);
  assert.equal(draft.suggestedWordIds.length, 3);
  assert.equal((await proposal()).basisToken, draft.basisToken, 'same data yields the same basis token');
});

test('a child who never attended is not labelled as having participated', async t => {
  install(t, { sessions: [{ ...session(), studentScores: [{ student: CHILD_ID, attendance: 'ABSENT', stars: 0 }] }] });
  const draft = await proposal();
  assert.equal(draft.attended, false);
  assert.match(draft.attendanceBasis, /chưa ghi nhận/);
});

test('teacher approval writes an append-only version carrying words, kept observations and the family activity', async t => {
  const { plans } = install(t);
  const draft = await proposal();
  const saved = await practice.approve(req, child(), room(), approveBody(draft, { operationId: 'approve-stable-1' }));
  assert.equal(saved.revision, 1);
  assert.equal(saved.status, 'APPROVED');
  assert.equal(saved.words.length, 2);
  assert.equal(saved.observations.length, 1);
  assert.equal(saved.homeActivity.steps.length, 2);
  assert.equal(saved.payloadHash, undefined);
  assert.equal(saved.operationId, undefined);
  assert.equal(plans.length, 1);
});

test('resubmitting the same approval is idempotent and never stores a second version', async t => {
  const { plans } = install(t);
  const draft = await proposal();
  const body = approveBody(draft, { operationId: 'approve-once-xyz' });
  const first = await practice.approve(req, child(), room(), body);
  const retry = await practice.approve(req, child(), room(), body);
  const sameAgain = await practice.approve(req, child(), room(), body);
  assert.equal(first._id, retry._id);
  assert.equal(retry._id, sameAgain._id);
  assert.equal(plans.length, 1, 'retry must not create a new revision');
});

test('reusing an operation id for different content is rejected', async t => {
  install(t);
  const draft = await proposal();
  await practice.approve(req, child(), room(), approveBody(draft, { operationId: 'approve-reuse-1' }));
  const conflict = await practice.approve(req, child(), room(), approveBody(draft, { operationId: 'approve-reuse-1', teacherNote: 'Nội dung khác đi.' })).catch(error => error);
  assert.equal(conflict.statusCode, 409);
});

test('changing the reviewed lesson appends a new version that the family receives', async t => {
  const { plans } = install(t);
  const draft = await proposal();
  await practice.approve(req, child(), room(), approveBody(draft, { operationId: 'v1-aaaa-1111' }));
  const after = await proposal();
  assert.equal(after.revision, 1, 'latest revision feeds the next expectedRevision');
  const second = await practice.approve(req, child(), room(), approveBody(after, { operationId: 'v2-bbbb-2222', wordIds: [String(BIRD)] }));
  assert.equal(second.revision, 2);
  assert.deepEqual(second.words.map(word => word.english), ['bird']);
  assert.equal(plans.length, 2, 'the superseded version is retained as history');
  const family = await practice.familyCurrent(child());
  assert.equal(family.revision, 2);
  assert.equal(family.words.length, 1);
});

test('a stale expectedRevision is rejected so two teachers cannot silently overwrite', async t => {
  install(t);
  const draft = await proposal();
  await practice.approve(req, child(), room(), approveBody(draft, { operationId: 'first-cccc-333' }));
  const stale = await practice.approve(req, child(), room(), approveBody(draft, { operationId: 'second-dddd-444', expectedRevision: 0 })).catch(error => error);
  assert.equal(stale.statusCode, 409);
});

test('renewing the underlying observations invalidates the basis token before approval', async t => {
  const { obs } = install(t);
  const draft = await proposal();
  obs[0] = { ...obs[0], level: 'INDEPENDENT', updatedAt: new Date('2026-11-02T00:00:00Z') };
  const conflict = await practice.approve(req, child(), room(), approveBody(draft)).catch(error => error);
  assert.equal(conflict.statusCode, 409);
});

test('revoking appends a REVOKED version, hides the plan from the family and keeps prior history', async t => {
  const { plans } = install(t);
  const draft = await proposal();
  await practice.approve(req, child(), room(), approveBody(draft, { operationId: 'to-revoke-11' }));
  const current = await proposal();
  const revoked = await practice.approve(req, child(), room(), { operationId: 'revocation-22', expectedRevision: current.revision, teacherNote: 'Cô thu hồi để chuẩn bị nội dung phù hợp hơn.' }, true);
  assert.equal(revoked.revision, 2);
  assert.equal(revoked.status, 'REVOKED');
  assert.equal(revoked.words.length, 0);
  assert.equal(await practice.familyCurrent(child()), null);
  assert.equal(plans.length, 2, 'the approved version stays in history');
});

test('revoking requires an active approved plan', async t => {
  const { plans } = install(t);
  const draft = await proposal();
  await practice.approve(req, child(), room(), approveBody(draft, { operationId: 'keep-active-1' }));
  const revokeBody1 = { operationId: 'revoke-a-1', expectedRevision: 1, teacherNote: 'thu hồi' };
  await practice.approve(req, child(), room(), revokeBody1, true);
  const again = await practice.approve(req, child(), room(), { operationId: 'revoke-b-2', expectedRevision: 2, teacherNote: 'thu hồi nữa' }, true).catch(error => error);
  assert.match(again.message, /thu hồi|đang được giao/);
  assert.equal(plans.length, 2);
});

test('the family report separates grounded observations from encouragement stars', async t => {
  install(t);
  const score = session().studentScores[0];
  const row = await report.row(session(), child(), score);
  assert.equal(row.attended, true);
  assert.equal(row.observations.length, 1);
  assert.equal(row.plan, null, 'no approved plan attached yet');
  const snapshot = report.snapshot(row, { basisToken: row.basisToken, observationIds: [String(OBS_ID)] });
  const lines = report.lines(snapshot).join('\n');
  assert.match(lines, /Cô quan sát:/);
  assert.doesNotMatch(lines, /phát âm chuẩn|tốt nhất lớp/, 'report must not self-congratulate without evidence');
});

test('the family report refuses a stale basis token or an observation from another child', async t => {
  install(t);
  const score = session().studentScores[0];
  const row = await report.row(session(), child(), score);
  assert.throws(() => report.snapshot(row, { basisToken: 'tam-token', observationIds: [] }), /đổi/);
  assert.throws(() => report.snapshot(row, { basisToken: row.basisToken, observationIds: [id(999)] }), /không thuộc/);
});

test('the family report includes the canonical homework and invalidates preview when its instructions change', async t => {
  const assignment = { _id: id(300), instructions: 'Cùng nghe và chỉ tranh mèo.', dueDate: new Date('2026-11-10T00:00:00Z') };
  install(t, { assignment });
  t.mock.method(M.Assignment, 'findOne', filter => {
    assert.equal(filter.teacher, TEACHER_ID);
    assert.equal(filter.classRoom, ROOM_ID);
    assert.equal(filter.lesson, LESSON_ID);
    assert.ok(filter.$and[0].$or.some(row => row.recipients === CHILD_ID));
    assert.ok(!filter.status.$in.includes('CANCELLED'));
    return chain(() => assignment);
  });
  const currentSession = { ...session(), teacher: TEACHER_ID };
  const draft = await report.row(currentSession, child(), currentSession.studentScores[0]);
  assert.equal(draft.assignment._id, assignment._id);
  const selected = report.snapshot(draft, { basisToken: draft.basisToken, observationIds: [], includeAssignment: true });
  assert.match(report.lines(selected).join('\n'), /Cùng nghe và chỉ tranh mèo/);
  const omitted = report.snapshot(draft, { basisToken: draft.basisToken, observationIds: [], includeAssignment: false });
  assert.equal(omitted.assignment, null);
  assignment.instructions = 'Chọn tranh chó.';
  const updated = await report.row(currentSession, child(), currentSession.studentScores[0]);
  assert.throws(() => report.snapshot(updated, { basisToken: draft.basisToken, observationIds: [] }), /đổi/);
});

test('choosing review words keeps reasons ordered and never invents a word outside the lesson', () => {
  const guide = lessonGuide(lesson(), '3-4');
  const items = chooseWords(words(), mastery(), observations(), guide, true, new Date('2026-11-05T00:00:00Z'));
  assert.deepEqual(items.map(item => item.vocabulary.english), ['cat', 'dog', 'bird']);
  const withHidden = chooseWords([...words(), { _id: id(99), english: 'x', status: 'HIDDEN', imageUrl: '/x.png' }], [], [], guide, true);
  assert.equal(withHidden.length, 3, 'hidden or image-less words are excluded');
});


test('getHomeReview and completeHomeReview support the 5-minute home review flow and grant 3 stars idempotently', async t => {
  install(t);
  for (const name of ['Progress', 'UnitCompletion', 'Assignment']) {
    t.mock.method(M[name], 'find', () => chain(() => []));
  }
  t.mock.method(M.Lesson, 'findById', () => chain(() => clone(lesson())));
  t.mock.method(M.ClassroomSession, 'findOne', () => chain(() => clone(session())));
  t.mock.method(M.LanguageContent, 'find', () => chain(() => [
    { _id: id(70), english: 'What can you see?', vietnamese: 'Bé thấy gì nào?', contentType: 'QUESTION' },
    { _id: id(71), english: 'I see a cat.', vietnamese: 'Bé thấy con mèo.', contentType: 'ANSWER' }
  ]));
  const completions = [];
  t.mock.method(M.HomePracticeCompletion, 'find', () => chain(() => clone(completions)));
  t.mock.method(M.HomePracticeCompletion, 'findOne', filter => chain(() => {
    const found = completions.find(c => String(c.child) === String(filter.child) && c.date === filter.date);
    return found ? clone(found) : null;
  }));
  t.mock.method(M.HomePracticeCompletion, 'create', async values => {
    const doc = { _id: id(88), ...values };
    completions.push(doc);
    return doc;
  });

  const review = await practice.getHomeReview(child());
  assert.ok(review);
  assert.equal(review.lessonTitle, 'Animals');
  assert.equal(review.words.length, 3);
  assert.equal(review.sentencePatterns.length, 2);
  assert.equal(review.completedToday, false);
  assert.equal(review.parentGuidance.steps.length, 3);

  const firstComplete = await practice.completeHomeReview(child(), LESSON_ID);
  assert.equal(firstComplete.completedToday, true);
  assert.equal(firstComplete.newlyCompleted, true);
  assert.equal(firstComplete.starsAwarded, 3);

  const secondComplete = await practice.completeHomeReview(child(), LESSON_ID);
  assert.equal(secondComplete.completedToday, true);
  assert.equal(secondComplete.newlyCompleted, false);
  assert.equal(secondComplete.starsAwarded, 0);
});
