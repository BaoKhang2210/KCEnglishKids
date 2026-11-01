const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveLessonStars, buildUnitLedgerRow, summarizeStarLedger, STARS_PER_UNIT } = require('../src/services/starLedgerService');

test('stage lessons award one star for each completed stage, independent of Chặng 2 score', () => {
  assert.equal(resolveLessonStars({ completed: false, stars: 3, stage2Stars: 3, stage1Completed: true }), 1);
  assert.equal(resolveLessonStars({ completed: false, stars: 3, stage2Stars: 1, stage1Completed: true, stage2Completed: true }), 2);
  assert.equal(resolveLessonStars({ completed: false, stars: 3, stage1Completed: true, stage2Completed: true, stage3Games: ['one'] }), 2);
  assert.equal(resolveLessonStars({ completed: true, stars: 3, stage2Stars: 0, stage3Stars: 3, stage1Completed: true, stage2Completed: true, stage3Completed: true }), 3);
  assert.equal(resolveLessonStars({ completed: false, stars: 0, stage2Stars: 3, stage1Completed: true, stage2Completed: true, stage3Games: ['one', 'two'] }), 3);
});

test('legacy lesson activities use their best aggregated rating without adding another source', () => {
  assert.equal(resolveLessonStars({ completed: true, stars: 1, completionSnapshot: { source: 'CURRENT_ACTIVITIES' } }, { completed: true, stars: 3 }), 3);
  assert.equal(resolveLessonStars({ completed: false, stars: 0, completionSnapshot: { source: 'CURRENT_ACTIVITIES' } }, { completed: false, stars: 3 }), 0);
});

test('unit reward is exactly once and only after the active lessons are complete', () => {
  const unit = { _id: 'u1', unitNumber: 1, bookNumber: 1 };
  const lessons = [{ id: 'l1', stars: 3, completed: true }, { id: 'l2', stars: 2, completed: true }];
  const grant = { rewards: [{ type: 'STAR', amount: 5 }, { type: 'STICKER', refId: 'st_star' }] };
  const completedRow = buildUnitLedgerRow(unit, lessons, grant, true, true, 'At School');
  assert.equal(completedRow.stars, 10);
  assert.equal(completedRow.title, 'At School');
  const incomplete = buildUnitLedgerRow(unit, [lessons[0], { ...lessons[1], completed: false }], grant, false, true);
  assert.equal(incomplete.bonusStars, 0);
  assert.equal(incomplete.stars, 5);
  const locked = buildUnitLedgerRow({ ...unit, _id: 'u2' }, lessons, grant, true, false);
  assert.equal(locked.stars, 0);
  assert.equal(locked.maxStars, 11);
  assert.equal(locked.lessons.reduce((sum, lesson) => sum + lesson.stars, 0), 0);
  assert.equal(STARS_PER_UNIT, 5);
});

test('randomized star trees satisfy total=sum(unit) and unit=sum(lessons)+bonus', () => {
  let seed = 42831;
  const random = max => { seed = (seed * 48271) % 2147483647; return seed % max; };
  for (let run = 0; run < 100; run++) {
    const units = Array.from({ length: 1 + random(12) }, (_, unitIndex) => {
      const lessonRows = Array.from({ length: 1 + random(7) }, (_, lessonIndex) => ({ id: `${unitIndex}-${lessonIndex}`, stars: random(4), completed: random(2) === 1 }));
      const completed = lessonRows.every(row => row.completed);
      return buildUnitLedgerRow({ _id: `u${unitIndex}`, unitNumber: unitIndex + 1, bookNumber: 1 }, lessonRows, completed ? { rewards: [{ type: 'STAR', amount: 5 }] } : null, completed, unitIndex === 0);
    });
    const ledger = summarizeStarLedger(units);
    assert.equal(ledger.totalStars, units.reduce((sum, unit) => sum + unit.stars, 0));
    assert.equal(ledger.maxStars, units.reduce((sum, unit) => sum + unit.maxStars, 0));
    for (const unit of units) {
      assert.equal(unit.stars, unit.lessons.reduce((sum, lesson) => sum + lesson.stars, 0) + unit.bonusStars);
      assert.ok(unit.stars <= unit.maxStars);
      assert.ok(unit.bonusStars === 0 || unit.bonusStars === 5);
    }
  }
});

