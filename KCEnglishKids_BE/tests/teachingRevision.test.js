const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const M = require('../src/models');
const { normalizeClassName } = require('../src/services/classroomRules');
const { rankSchoolStars } = require('../src/services/recognitionRules');
const { combineAssessment } = require('../src/services/teacherStatistics');
const catalog = require('../src/services/gameCatalog');
const rules = require('../../shared/learningGames.json');
const id = n => String(n).padStart(24, '0');
const query = value => ({ select() { return this; }, lean: async () => value });

test('stage grading accepts a synonymous answer and game targets do not repeat synonyms', () => {
  const words = ['Dad', 'father', 'dog'].map((english, index) => ({ _id: id(index + 1), english, imageUrl: '/word-'+index+'.png', visualType: 'abstract', wordType: 'noun' }));
  const answers = words.map(word => ({ wordId: word._id, selectedId: word.english === 'Dad' ? id(2) : word._id, round: 3 }));
  const result = require('../src/services/stageLearning').gradeStage(2, { answers }, words, null, '3-4');
  assert.equal(result.score, 100);
  assert.equal(require('../src/services/gameRules').usable(rules[0], words).length, 2);
  answers[0].selectedId = id(3);
  assert.equal(require('../src/services/stageLearning').gradeStage(2, { answers }, words, null, '3-4').answers[0].isCorrect, false);
});

test('supplemental vocabulary migration adds only references in the correct Unit and is idempotent', () => {
  const spec = require('../src/seeds/lessonVocabularySupplements').LESSON_VOCABULARY_SUPPLEMENTS;
  const { buildSupplementPlan } = require('../scripts/migrate_lesson_vocabulary');
  const keys = Object.keys(spec), words = [];
  const lessons = keys.map((key, index) => {
    const unit = id(100 + index);
    for (const english of spec[key]) {
      const existing = words.find(word => word.english === english);
      if (existing) existing.sourceUnits.push(unit);
      else words.push({ _id: id(words.length + 1), english, sourceUnits: [unit] });
    }
    return { key, curriculumUnits: [unit], vocabularyItems: [id(9999)], progressMarker: 'preserve' };
  });
  const plan = buildSupplementPlan(lessons, words);
  assert.equal(plan.length, 26);
  assert.equal(plan.reduce((total, item) => total + item.after.vocabularyItems.length - item.before.vocabularyItems.length, 0), 64);
  assert.ok(plan.every(item => item.after.progressMarker === 'preserve' && item.after.vocabularyItems.includes(id(9999))));
  assert.deepEqual(buildSupplementPlan(plan.map(item => item.after), words), []);
  assert.throws(() => buildSupplementPlan(lessons, words.map(word => ({ ...word, sourceUnits: [] }))), /does not belong/);
});

test('class names normalize Vietnamese Unicode, case and repeated whitespace; current-class index excludes history', async () => {
  assert.equal(normalizeClassName('  LỚP   MẦM A '), normalizeClassName('lớp mầm a'.normalize('NFD')));
  const room = new M.ClassRoom({ name: '  Lớp   Mầm A  ', teacher: new mongoose.Types.ObjectId() });
  await room.validate();
  assert.equal(room.name, 'Lớp Mầm A');
  assert.equal(room.normalizedName, 'lớp mầm a');
  const indexes = M.ClassRoom.schema.indexes();
  assert.ok(indexes.some(([key, options]) => key.normalizedName === 1 && options.unique));
  assert.deepEqual(indexes.find(([, options]) => options.name === 'one_teacher_per_current_class')[1].partialFilterExpression.status.$in, ['ACTIVE', 'UPCOMING']);
});

test('school recognition compares stars per attended completed session and includes exact ties', () => {
  const children = [1, 2, 3, 4].map(n => ({ _id: id(n), name: 'Bé ' + n }));
  const sessions = Array.from({ length: 4 }, (_, index) => ({ status: 'COMPLETED', studentScores: [
    { student: id(1), stars: 3, attendance: 'PRESENT' },
    { student: id(2), stars: index < 2 ? 4 : 0, attendance: index < 2 ? 'LATE' : 'ABSENT' },
    { student: id(3), stars: index < 2 ? 4 : 0, attendance: index < 2 ? 'PRESENT' : 'EXCUSED' },
    { student: id(4), stars: 99, attendance: index === 0 ? 'PRESENT' : 'ABSENT' }
  ] }));
  sessions.push({ status: 'LIVE', studentScores: [{ student: id(1), stars: 100 }] });
  const ranking = rankSchoolStars(children, sessions, 2);
  assert.deepEqual(ranking.filter(row => row.winner).map(row => row.child), [id(2), id(3)]);
  assert.equal(ranking.find(row => row.child === id(1)).rank, 3);
  assert.equal(ranking.find(row => row.child === id(4)).eligible, false);
  assert.equal(ranking.find(row => row.child === id(4)).rank, null);
  assert.equal(ranking.find(row => row.child === id(2)).starsPerSession, 4);
});

test('school ranking does not use rounded averages or game points to create ties', () => {
  const children = [1, 2].map(n => ({ _id: id(n), name: 'Bé ' + n }));
  const sessions = Array.from({ length: 1000 }, (_, i) => ({ status: 'COMPLETED', studentScores: [
    { student: id(1), stars: i === 0 ? 1001 : 0 }, { student: id(2), stars: i === 0 ? 1002 : 0, points: -9999 }
  ] }));
  const ranking = rankSchoolStars(children, sessions, 4);
  assert.equal(ranking[0].starsPerSession, ranking[1].starsPerSession);
  assert.equal(ranking[0].child, id(2));
  assert.equal(ranking[1].winner, false);
});

test('accuracy uses total correct over total answered, never the mean of percentages or best score', () => {
  assert.deepEqual(combineAssessment([{ correctAnswers: 1, incorrectAnswers: 0 }, { correctAnswers: 0, incorrectAnswers: 9 }]), { correctAnswers: 1, answeredCount: 10, averageScore: 10 });
  assert.deepEqual(combineAssessment([undefined, { highestScore: 100, stage2Score: 100 }]), { correctAnswers: 0, answeredCount: 0, averageScore: null });
});

test('a valid game catalog controls enablement and order without modifying game mechanics', async t => {
  const settings = rules.map((rule, index) => ({ gameId: rule.id, enabled: index === 0 || index === 4, displayOrder: rules.length - index - 1 }));
  catalog.validateCatalog(settings);
  assert.deepEqual(catalog.mergeCatalog(new M.GameCatalogSetting({ games: settings })), catalog.mergeCatalog({ games: settings }));
  t.mock.method(M.GameCatalogSetting, 'findOne', () => query({ games: settings, __v: 3 }));
  const games = await catalog.configuredGames(['cat', 'dog', 'bird', 'cow'].map((english, index) => ({ _id: id(index), english, wordType: 'noun', imageUrl: '/' + english + '.svg' })), 1, 1);
  assert.deepEqual(games.map(game => game.id), [rules[4].id, rules[0].id]);
  for (const bad of [[], [...settings, settings[0]], settings.map(row => ({ ...row, enabled: false })), settings.map(row => ({ ...row, displayOrder: 0 }))]) assert.throws(() => catalog.validateCatalog(bad));
});

test('catalog cannot strand an active lesson with fewer than two playable games', async t => {
  t.mock.method(M.Lesson, 'find', () => query([{ title: 'Colors', vocabularyItems: [id(1), id(2)] }]));
  t.mock.method(M.Vocabulary, 'find', () => query([{ _id: id(1), english: 'red', wordType: 'color' }, { _id: id(2), english: 'blue', wordType: 'color' }]));
  await assert.rejects(() => catalog.assertLessonCoverage(catalog.mergeCatalog({ games: rules.map((rule, index) => ({ gameId: rule.id, enabled: index === 6 || index === 10, displayOrder: index })) })), /không còn đủ/);
});

test('closing a classroom releases its teacher without erasing the historical teacher or another current class', async t => {
  const room = { _id: id(1), status: 'COMPLETED', teacher: id(2), save: async () => {} };
  t.mock.method(M.ClassroomSession, 'exists', async () => false);
  t.mock.method(M.User, 'updateMany', async () => ({}));
  let unsetFilter, scheduleUpdate;
  t.mock.method(M.User, 'updateOne', async filter => { unsetFilter = filter; });
  t.mock.method(M.Schedule, 'updateMany', async (_filter, update) => { scheduleUpdate = update; });
  await require('../src/services/adminIntegrity').syncTeacher(room, id(2));
  assert.equal(room.teacher, id(2));
  assert.equal(unsetFilter.assignedClass, id(1));
  assert.equal(scheduleUpdate.$set.isActive, false);
});

test('a live class cannot be closed or handed to a different teacher', async t => {
  t.mock.method(M.ClassroomSession, 'exists', async () => true);
  await assert.rejects(() => require('../src/services/adminIntegrity').syncTeacher({ _id: id(1), status: 'COMPLETED', save: () => assert.fail('must not write') }, id(2)), /kết thúc buổi dạy/);
});
