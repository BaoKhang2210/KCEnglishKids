const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/models');
const { statsFor } = require('../src/services/teacherStatistics');
const rules = require('../src/services/teacherRules');
const ai = require('../src/services/aiService');
const id = n => String(n).padStart(24, '0');
const query = value => ({ select() { return this; }, sort() { return this; }, lean: async () => value });
function statistics(t, { quiz = [], classroom = [], stages = [], homePractice = [] } = {}) {
  for (const [Model, rows] of [[M.ActivityResult, quiz], [M.Progress, []], [M.ClassroomSession, classroom], [M.UnitCompletion, []], [M.LearningEvent, stages], [M.HomePracticeCompletion, homePractice]]) if (Model) t.mock.method(Model, 'aggregate', async () => rows);
  t.mock.method(M.Progress, 'find', () => query([])); t.mock.method(M.Assignment, 'find', () => query([]));
}
test('a child with classroom answers but no independent practice has no practice percentage', async t => {
  statistics(t, { classroom: [{ _id: id(1), correctAnswers: 5, incorrectAnswers: 0, classroomSessions: 1, learningTime: 1800, timedSessions: 1 }] });
  const [row] = await statsFor([id(1)]);
  assert.equal(row.averageScore, null); assert.equal(row.hasAssessment, false);
  assert.equal(row.classroomAccuracy, 100); assert.equal(row.learningTime, 1800);
  assert.equal(row.classroomLearningTime, 1800); assert.equal(row.hasLearningTime, true);
});
test('practice percentage uses quiz and stages only; measured time includes both learning modes', async t => {
  statistics(t, { quiz: [{ _id: id(1), correctAnswers: 1, incorrectAnswers: 1, learningTime: 60, resultCount: 1, timedResults: 1 }],
    stages: [{ _id: id(1), correctAnswers: 2, incorrectAnswers: 0, learningTime: 90, timedEvents: 2, attempts: 1, untimedEvents: 1 }],
    classroom: [{ _id: id(1), correctAnswers: 4, incorrectAnswers: 0, learningTime: 1200, timedSessions: 1, classroomSessions: 1 }] });
  const [row] = await statsFor([id(1)]);
  assert.equal(row.averageScore, 75); assert.equal(row.answeredCount, 4);
  assert.equal(row.classroomAccuracy, 100); assert.equal(row.practiceLearningTime, 150);
  assert.equal(row.learningTime, 1350); assert.equal(row.hasUnmeasuredLearning, true);
});
test('unmeasured historical stages remain unknown rather than fabricating elapsed minutes', async t => {
  statistics(t, { stages: [{ _id: id(1), attempts: 1, untimedEvents: 2 }] });
  const [row] = await statsFor([id(1)]);
  assert.equal(row.hasLearningTime, false); assert.equal(row.learningTime, 0); assert.equal(row.hasUnmeasuredLearning, true);
});
test('gap review rejects all star mutations including bulk while still recording answers', () => {
  const session = { status: 'LIVE', isGapReview: true, studentScores: [1, 2].map(n => ({ student: id(n), attendance: 'PRESENT', stars: 0, correctCount: 0, incorrectCount: 0 })), appliedOperations: [] };
  for (const stars of [1, 3, -1]) assert.throws(() => rules.applyScore(session, { stars, operationId: 'review-award-1' }, [id(1), id(2)]), /không cộng/);
  assert.deepEqual(session.studentScores.map(row => row.stars), [0, 0]);
  rules.applyScore(session, { correctDelta: 1, operationId: 'review-answer-1' }, [id(1), id(2)]);
  assert.deepEqual(session.studentScores.map(row => row.correctCount), [1, 1]);
  assert.deepEqual(session.studentScores.map(row => row.stars), [0, 0]);
});
test('unpracticed words and outsiders are not treated as measured weaknesses', () => {
  const result = ai.detectClassGaps({ students: [id(1), id(2)], vocabularies: [{ _id: id(3), english: 'teacher' }], masteryRows: [{ student: id(99), vocabulary: id(3), correctCount: 0, attemptCount: 100, masteryLevel: 1 }] });
  assert.equal(result.gaps.length, 0); assert.equal(result.unassessed.length, 1); assert.equal(result.unassessed[0].accuracyPercent, null);
});
test('review teaching content names every selected word without changing phase durations', () => {
  const plan = ai.generateLessonPlan({ ageGroup: '3-4', lessonTitle: 'People at School', durationMinutes: 25, vocabularyList: [{ english: 'teacher' }, { english: 'friend' }] });
  const focus = [{ vocabularyId: id(3), english: 'teacher' }, { vocabularyId: id(4), english: 'friend' }];
  const reviewed = ai.applyReviewFocus(plan, focus);
  assert.equal(reviewed.isGapReview, true);
  assert.deepEqual(reviewed.reviewFocus, focus);
  assert.deepEqual(reviewed.phases.map(phase => phase.durationMinutes), plan.phases.map(phase => phase.durationMinutes));
  for (const phase of reviewed.phases.filter(phase => ['presentation', 'practice'].includes(phase.phaseId))) {
    assert.match(phase.activities[0].teacherTalk, /teacher/);
    assert.match(phase.activities[0].teacherTalk, /friend/);
  }
  assert.equal(plan.isGapReview, undefined);
});
