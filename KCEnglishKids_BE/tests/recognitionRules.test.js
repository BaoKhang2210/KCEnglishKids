const test = require('node:test');
const assert = require('node:assert/strict');
const { recognitionPeriod, rankClassroomStars, rewardFor } = require('../src/services/recognitionRules');
const ClassRecognition = require('../src/models/ClassRecognition');

test('weekly boundaries use Vietnam Monday, including the year transition', () => {
  const period = recognitionPeriod('WEEK', '2026-01-01');
  assert.equal(period.date, '2025-12-29');
  assert.equal(period.start.toISOString(), '2025-12-28T17:00:00.000Z');
  assert.equal(period.end.toISOString(), '2026-01-04T17:00:00.000Z');
  assert.equal(period.lastDate, '2026-01-04');
  assert.equal(recognitionPeriod('WEEK', '2026-01-04').date, period.date);
  assert.equal(recognitionPeriod('WEEK', '2026-01-05').date, '2026-01-05');
});

test('monthly boundaries include leap day and exclude the next month', () => {
  const period = recognitionPeriod('MONTH', '2024-02-29');
  assert.equal(period.start.toISOString(), '2024-01-31T17:00:00.000Z');
  assert.equal(period.end.toISOString(), '2024-02-29T17:00:00.000Z');
  assert.equal(period.lastDate, '2024-02-29');
});

test('invalid dates and kinds are rejected instead of rolling into another month', () => {
  for (const date of ['', 'bad', '2025-02-29', '2026-02-31', '2026-13-01', '2026-1-01']) {
    assert.throws(() => recognitionPeriod('WEEK', date));
  }
  assert.throws(() => recognitionPeriod('YEAR', '2026-01-01'));
});

test('all highest-star ties win; points never break ties and absent/live results are excluded', () => {
  const students = [{ _id: 'a', name: 'An' }, { _id: 'b', name: 'Bình' }, { _id: 'c', name: 'Chi' }];
  const rows = rankClassroomStars(students, [
    { status: 'COMPLETED', studentScores: [
      { student: 'a', stars: 3, points: 100 },
      { student: 'b', stars: 3, points: 1, attendance: 'LATE' },
      { student: 'c', stars: 99, attendance: 'ABSENT' },
      { student: 'removed', stars: 200 }
    ] },
    { status: 'COMPLETED', studentScores: [{ student: 'c', stars: 30, attendance: 'EXCUSED' }] },
    { status: 'LIVE', studentScores: [{ student: 'c', stars: 999 }] }
  ]);
  assert.deepEqual(rows.filter(row => row.winner).map(row => row.child), ['a', 'b']);
  assert.equal(rows.find(row => row.child === 'c').sessions, 0);
});

test('zero, negative and malformed stars never produce a winner or corrupt totals', () => {
  const students = [{ _id: 'a', name: 'An' }, { _id: 'b', name: 'Bình' }];
  const rows = rankClassroomStars(students, [{ status: 'COMPLETED', studentScores: [
    { student: 'a', stars: -2 }, { student: 'b', stars: Infinity }, { student: 'b', stars: 'bad' }
  ] }]);
  assert.equal(rows.some(row => row.winner), false);
  assert.equal(rows.every(row => row.stars === 0), true);
  assert.deepEqual(rankClassroomStars([], []), []);
});

test('rewards are symbolic and storage enforces one publication per class/period', () => {
  for (const kind of ['WEEK', 'MONTH']) {
    assert.equal(rewardFor(kind).stars, undefined);
    assert.ok(rewardFor(kind).title);
  }
  assert.ok(ClassRecognition.schema.indexes().some(([key, options]) =>
    key.classroom === 1 && key.kind === 1 && key.periodStart === 1 && options.unique));
});
