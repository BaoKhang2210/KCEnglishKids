const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/services/teacherRules');
const id = n => String(n).padStart(24, '0');
const session = () => ({ status: 'LIVE', activities: [id(9)], appliedOperations: [], questionResults: [], studentScores: [
  { student: id(1), attendance: 'PRESENT', points: 0, stars: 0, correctCount: 0, incorrectCount: 0, notAnswered: 0 },
  { student: id(2), attendance: 'ABSENT', points: 0, stars: 0, correctCount: 0, incorrectCount: 0, notAnswered: 0 },
  { student: id(3), attendance: 'LATE', points: 0, stars: 0, correctCount: 0, incorrectCount: 0, notAnswered: 0 }
] });
test('school dates use Vietnam midnight independently of the server timezone', () => {
  const now = new Date('2026-10-28T17:05:00Z');
  assert.equal(rules.vnDate(now), '2026-10-29');
  assert.deepEqual(rules.vnClock(now), { day: 4, minutes: 5 });
  assert.equal(rules.attendanceDate('2026-10-29', now), '2026-10-29');
  for (const date of ['2026-02-30', '2026-13-01', '2026-10-30', {}, '28/10/2026']) assert.throws(() => rules.attendanceDate(date, now));
});
test('attendance validates the entire roster, duplicate children and explicit statuses', () => {
  const roster = [id(1), id(2)];
  const records = [{ student: { _id: id(1) }, status: 'PRESENT' }, { studentId: id(2), status: 'EXCUSED', note: ' Có phép ' }];
  assert.deepEqual(rules.attendanceRecords(records, roster), [{ student: id(1), status: 'PRESENT', note: '' }, { student: id(2), status: 'EXCUSED', note: 'Có phép' }]);
  for (const invalid of [null, records.slice(0, 1), [records[0], records[0]], [records[0], { student: id(9), status: 'PRESENT' }], [records[0], { student: id(2), status: 'UNKNOWN' }]]) assert.throws(() => rules.attendanceRecords(invalid, roster));
});
test('assignment deadlines include the whole Vietnam day and reject impossible or reversed dates', () => {
  const range = rules.assignmentDates('2026-10-28', '2026-10-28');
  assert.equal(range.startDate.toISOString(), '2026-10-27T17:00:00.000Z');
  assert.equal(range.dueDate.toISOString(), '2026-10-28T16:59:59.999Z');
  for (const [start, due] of [['2026-10-29', '2026-10-28'], ['2026-02-30', null], [null, '2026-13-01'], ['oops', null]]) assert.throws(() => rules.assignmentDates(start, due));
});
test('scores require a live session, bounded integers, a present child and a stable operation ID', () => {
  for (const body of [{ stars: 100 }, { stars: 1.5 }, { points: NaN }, { correctDelta: 2 }, { points: '5' }]) assert.throws(() => rules.applyScore(session(), { operationId: 'operation-1', ...body }, [id(1)]));
  for (const target of [[id(2)], [id(9)], [id(1), id(1)], []]) assert.throws(() => rules.applyScore(session(), { operationId: 'operation-1', stars: 1 }, target));
  for (const state of ['SCHEDULED', 'COMPLETED']) assert.throws(() => rules.applyScore({ ...session(), status: state }, { operationId: 'operation-1', stars: 1 }, [id(1)]));
  assert.throws(() => rules.applyScore(session(), { stars: 1 }, [id(1)]));
});
test('retrying the same score operation never awards stars twice; a distinct operation does', () => {
  const item = session();
  const body = { operationId: 'operation-1', stars: 2, points: 5 };
  assert.equal(rules.applyScore(item, body, [id(1), id(3)]), true);
  assert.equal(rules.applyScore(item, body, [id(1), id(3)]), false);
  assert.equal(item.studentScores[0].stars, 2);
  rules.applyScore(item, { ...body, operationId: 'operation-2' }, [id(1)]);
  assert.equal(item.studentScores[0].stars, 4);
  assert.equal(item.studentScores[2].stars, 2);
});
test('a rejected bulk award does not partly modify valid classmates', () => {
  const item = session();
  assert.throws(() => rules.applyScore(item, { operationId: 'operation-1', stars: 2 }, [id(1), id(2)]));
  assert.equal(item.studentScores[0].stars, 0);
  assert.deepEqual(item.appliedOperations, []);
});
test('saving or correcting the same question replaces counters instead of counting it twice', () => {
  const item = session();
  const body = { activityId: id(9), questionIndex: 0, studentAnswers: [{ studentId: id(1), result: 'CORRECT' }, { studentId: id(2), result: 'CORRECT' }] };
  rules.recordQuestion(item, body); rules.recordQuestion(item, body);
  assert.equal(item.studentScores[0].correctCount, 1);
  assert.equal(item.studentScores[1].correctCount, 0);
  assert.equal(item.questionResults.length, 1);
  rules.recordQuestion(item, { ...body, studentAnswers: [{ studentId: id(1), result: 'INCORRECT' }] });
  assert.equal(item.studentScores[0].correctCount, 0);
  assert.equal(item.studentScores[0].incorrectCount, 1);
});
test('question results reject an unrelated activity, child, duplicate answer or completed session', () => {
  const body = { activityId: id(9), questionIndex: 0, studentAnswers: [{ studentId: id(1), result: 'CORRECT' }] };
  for (const patch of [{ activityId: id(8) }, { questionIndex: .5 }, { studentAnswers: [{ studentId: id(8), result: 'CORRECT' }] }, { studentAnswers: [body.studentAnswers[0], body.studentAnswers[0]] }, { studentAnswers: [{ studentId: id(1), result: 'oops' }] }]) assert.throws(() => rules.recordQuestion(session(), { ...body, ...patch }));
  assert.throws(() => rules.recordQuestion({ ...session(), status: 'COMPLETED' }, body));
});
test('summary distinguishes absent, unobserved and observed students needing practice', () => {
  const item = session();
  item.studentScores[0].correctCount = 1; item.studentScores[0].incorrectCount = 4;
  item.studentScores[0].stars = 3; item.studentScores[1].stars = 100;
  const summary = rules.summarize(item);
  assert.equal(summary.participationCount, 1);
  assert.equal(summary.averageAccuracy, 20);
  assert.equal(summary.totalStars, 3);
  assert.deepEqual(summary.studentsNeedingPractice, [id(1)]);
  assert.equal(item.studentScores[2].status, 'ACTIVE');
  assert.equal(rules.accuracy(item.studentScores[2]), null);
});
