const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeTranscript,
  evaluatePronunciation,
  answerAccuracy,
  currentStreak,
  validOptions,
  generateParentNote,
  templateProvider
} = require('../src/services/aiService');

test('normalizeTranscript: cleans punctuation, unicode, whitespace and leading articles', () => {
  assert.equal(normalizeTranscript('  The Apple!  '), 'apple');
  assert.equal(normalizeTranscript('An Elephant.'), 'elephant');
  assert.equal(normalizeTranscript('a BIG dog!'), 'big dog');
  assert.equal(normalizeTranscript('Hello, World?!'), 'hello world');
});

test('evaluatePronunciation: exact matches score 100 with 3 stars and celebrating mascot', () => {
  const result = evaluatePronunciation({ targetWord: 'Banana', spokenTranscript: 'Banana' });
  assert.equal(result.score, 100);
  assert.equal(result.displayStars, 3);
  assert.equal(result.isAccepted, true);
  assert.equal(result.mascotState, 'celebrating');
  assert.equal(result.evaluationType, 'transcript_match');
});

test('evaluatePronunciation: non-exact close matches are capped at 84 with 2 stars and happy mascot', () => {
  const result = evaluatePronunciation({ targetWord: 'Banana', spokenTranscript: 'Bananna' });
  assert.ok(result.score <= 84 && result.score >= 65);
  assert.equal(result.displayStars, 2);
  assert.equal(result.isAccepted, true);
  assert.equal(result.mascotState, 'happy');
});

test('evaluatePronunciation: short words (<= 3 chars) require exact match to pass', () => {
  const pass = evaluatePronunciation({ targetWord: 'Cat', spokenTranscript: 'Cat' });
  assert.equal(pass.isAccepted, true);
  assert.equal(pass.score, 100);

  const fail = evaluatePronunciation({ targetWord: 'Cat', spokenTranscript: 'Car' });
  assert.equal(fail.isAccepted, false);
  assert.ok(fail.score <= 64);
});

test('evaluatePronunciation: distant matches get 1 star and encouraging mascot', () => {
  const result = evaluatePronunciation({ targetWord: 'Elephant', spokenTranscript: 'Apple' });
  assert.ok(result.score < 65);
  assert.equal(result.displayStars, 1);
  assert.equal(result.isAccepted, false);
  assert.equal(result.mascotState, 'encouraging');
});

test('evaluatePronunciation: empty spoken transcript returns unevaluated state', () => {
  const result = evaluatePronunciation({ targetWord: 'Apple', spokenTranscript: '' });
  assert.equal(result.evaluated, false);
  assert.equal(result.score, null);
  assert.equal(result.displayStars, 0);
  assert.equal(result.isAccepted, false);
});

test('answerAccuracy: calculates percentage correctly from correct and incorrect counts', () => {
  assert.equal(answerAccuracy({ correctCount: 8, incorrectCount: 2 }), 80);
  assert.equal(answerAccuracy({ correctCount: 10, incorrectCount: 0 }), 100);
  assert.equal(answerAccuracy({ correctCount: 0, incorrectCount: 5 }), 0);
  assert.equal(answerAccuracy({ correctCount: 0, incorrectCount: 0 }), null);
  assert.equal(answerAccuracy(null), null);
});

test('currentStreak: only accepts streak when active today or yesterday in Vietnam time', () => {
  const now = new Date('2026-10-17T12:00:00Z'); // 19:00 VN time (2026-10-17)
  const activeToday = { streak: 5, lastActiveDate: '2026-10-17' };
  assert.equal(currentStreak(activeToday, now), 5);

  const activeYesterday = { streak: 4, lastActiveDate: '2026-10-16' };
  assert.equal(currentStreak(activeYesterday, now), 4);

  const activeStale = { streak: 10, lastActiveDate: '2026-10-10' };
  assert.equal(currentStreak(activeStale, now), null);
});

test('generateParentNote: returns exactly three bounded template options', async () => {
  const facts = {
    studentName: 'Leo',
    ageGroup: '4-5',
    scope: 'all_time',
    averageAccuracy: 90,
    totalStars: 25,
    completedLessons: 4,
    streak: 3,
    recentLesson: 'Animals'
  };

  const response = await generateParentNote(facts, templateProvider);
  assert.equal(response.source, 'template');
  assert.equal(response.generative, false);
  assert.equal(response.options.length, 3);

  const types = response.options.map(o => o.type);
  assert.deepEqual(types, ['praise', 'encouragement', 'practice_hint']);
  assert.deepEqual(response.options.map(o => o.suggestedStars), [5, 4, 3]);
  assert.ok(response.options[0].content.includes('Leo'));
});

test('generateLessonPlan: generates 4-phase structured lesson plan with TPR activities', () => {
  const { generateLessonPlan } = require('../src/services/aiService');
  const plan = generateLessonPlan({
    ageGroup: '3-4',
    lessonTitle: 'Colors & Shapes',
    targetTopic: 'Colors',
    durationMinutes: 25,
    vocabularyList: [
      { english: 'Red', vietnamese: 'Màu đỏ' },
      { english: 'Blue', vietnamese: 'Màu xanh dương' },
      { english: 'Yellow', vietnamese: 'Màu vàng' }
    ],
    teachingStyle: 'active_tpr'
  });

  assert.equal(plan.meta.ageGroup, '3-4');
  assert.equal(plan.meta.durationMinutes, 25);
  assert.equal(plan.meta.bookLevel, 'Book 1 (Mầm 3–4 tuổi)');
  assert.equal(plan.phases.length, 4);

  const phaseIds = plan.phases.map(p => p.phaseId);
  assert.deepEqual(phaseIds, ['warmup', 'presentation', 'practice', 'wrapup']);

  const totalMin = plan.phases.reduce((sum, p) => sum + p.durationMin, 0);
  assert.equal(totalMin, 25);

  assert.ok(plan.targetVocabulary.length === 3);
  assert.ok(plan.objectives.knowledge.length >= 2);
  assert.ok(plan.materialsNeeded.length >= 3);
  assert.ok(plan.phases[1].activities.some(a => a.type === 'tpr_action'));
});

test('generateLessonPlan: scales time budget accurately for 15min and 35min sessions', () => {
  const { generateLessonPlan } = require('../src/services/aiService');
  const plan15 = generateLessonPlan({ durationMinutes: 15 });
  assert.equal(plan15.phases.reduce((sum, p) => sum + p.durationMin, 0), 15);

  const plan35 = generateLessonPlan({ durationMinutes: 35 });
  assert.equal(plan35.phases.reduce((sum, p) => sum + p.durationMin, 0), 35);
});

test('generateLessonPlan: customizes for age 5-6 with story_song style', () => {
  const { generateLessonPlan } = require('../src/services/aiService');
  const plan = generateLessonPlan({
    ageGroup: '5-6',
    lessonTitle: 'Wild Animals',
    targetTopic: 'Animals',
    teachingStyle: 'story_song'
  });

  assert.equal(plan.meta.bookLevel, 'Book 3 (Lá 5–6 tuổi)');
  assert.equal(plan.meta.teachingStyle, 'story_song');
  assert.ok(plan.phases[0].activities.some(a => a.type === 'story'));
});
