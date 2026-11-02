const test = require('node:test');
const assert = require('node:assert/strict');
const { getRoundRating, buildStage2Report } = require('../src/config/stage2Report');
const { gradeStage } = require('../src/services/stageLearning');
const { completedStageCount, earnedForStage, REQUIRED_STAGE3_GAMES } = require('../src/services/stageStarPolicy');

test('stage stars follow first completion flags and two distinct mini-games', () => {
  assert.equal(earnedForStage(true), 1);
  assert.equal(earnedForStage(false), 0);
  assert.equal(completedStageCount({ stage1Completed: true, stage2Completed: false, stage3Games: ['game-1'] }), 1);
  assert.equal(completedStageCount({ stage1Completed: true, stage2Completed: true, stage3Games: ['game-1', 'game-2'] }), 3);
  assert.equal(REQUIRED_STAGE3_GAMES, 2);
});

test('stage 2 reports distinguish strong, practice and review outcomes', () => {
  assert.equal(getRoundRating({ isCorrect: true, wrongAttemptCount: 0, usedHint: false }), 'SECURE');
  assert.equal(getRoundRating({ isCorrect: false, wrongAttemptCount: 1, usedHint: false }), 'PRACTICE');
  assert.equal(getRoundRating({ isCorrect: true, wrongAttemptCount: 0, usedHint: true }), 'PRACTICE');
  assert.equal(getRoundRating({ isCorrect: false, wrongAttemptCount: 2, usedHint: false }), 'REVIEW');
});

test('a word moves to review when it needed support in at least two rounds', () => {
  const report = buildStage2Report([
    { wordId: 'book-id', round: 1, isCorrect: true, wrongAttemptCount: 1, usedHint: false },
    { wordId: 'book-id', round: 2, isCorrect: true, wrongAttemptCount: 0, usedHint: true },
    { wordId: 'book-id', round: 3, isCorrect: true, wrongAttemptCount: 0, usedHint: false },
  ], [{ _id: 'book-id', english: 'book' }]);
  assert.equal(report.words[0].rating, 'REVIEW');
});

test('per-word rating uses the most support-needed round and server star values', () => {
  const report = buildStage2Report([
    { wordId: 'book-id', round: 1, isCorrect: true, wrongAttemptCount: 0, usedHint: false },
    { wordId: 'book-id', round: 2, isCorrect: false, wrongAttemptCount: 1, usedHint: false },
  ], [{ _id: 'book-id', english: 'book', imageUrl: '/book.png' }], { stars: 2 }, 1);
  assert.equal(report.words[0].rating, 'PRACTICE');
  assert.deepEqual(report.words[0].rounds.map(round => round.name), ['Nhận biết', 'Kết nối']);
  assert.equal(report.starsBest, 2);
  assert.equal(report.starsEarned, 1);
  assert.equal(report.starsAdded, 1);
});

test('legacy records without round codes keep an overall rating without invented round details', () => {
  const report = buildStage2Report([
    { wordId: 'ball-id', isCorrect: true },
  ], [{ _id: 'ball-id', english: 'ball' }], { stars: 1 }, 0);
  assert.equal(report.words[0].rating, 'SECURE');
  assert.deepEqual(report.words[0].rounds, []);
});

test('stage grading preserves support metadata without changing score rules', () => {
  const words = [{ _id: 'book-id', english: 'book' }, { _id: 'pen-id', english: 'pen' }];
  const answers = words.flatMap((word, index) => [1, 2, 3].map((round) => ({
    wordId: word._id,
    round,
    selectedId: index === 0 || round !== 2 ? word._id : 'book-id',
    wrongAttemptCount: round === 2 ? 1 : 0,
    usedHint: false,
  })));
  const result = gradeStage(2, { answers }, words, null, '3-4');
  assert.equal(result.score, 83);
  assert.equal(result.answers[1].wrongAttemptCount, 1);
  assert.equal(result.answers[1].usedHint, false);
  assert.throws(() => gradeStage(2, { answers: answers.map((answer, index) => index === 0 ? { ...answer, wrongAttemptCount: -1 } : answer) }, words, null, '3-4'), /attempt count/);
});
