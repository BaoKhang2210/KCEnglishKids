const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { buildPlan, applyPlan } = require('../scripts/repair_database');
const { buildActivitiesForLesson } = require('../src/seeds/activityData');
const oid = () => new mongoose.Types.ObjectId();
const empty = () => Object.fromEntries(Object.keys(mongoose.models).map(name => [name, []]));
test('repair restores users only by unique account keys and archives unverifiable references', () => {
  const data = empty();
  const teacher = { _id: oid(), role: 'TEACHER', username: 'teacher', email: 'teacher@example.test' };
  const child = { _id: oid(), role: 'CHILD', username: 'child' };
  data.User = [teacher, child];
  const oldTeacher = oid(); const oldChild = oid();
  data.TeacherNote = [{ _id: oid(), teacher: oldTeacher, student: oldChild }, { _id: oid(), teacher: oldTeacher, student: oid() }];
  const plan = buildPlan(data, { users: [{ _id: String(oldTeacher), role: 'TEACHER', username: teacher.username }, { _id: String(oldChild), role: 'CHILD', username: child.username }] });
  assert.equal(plan[0].action, 'replace');
  assert.equal(String(plan[0].after.student), String(child._id));
  assert.equal(plan[1].action, 'archive');
  assert.equal(String(plan[0].before.teacher), String(oldTeacher));
});
test('repair retains current mastery counters when an old mapped row collides', () => {
  const data = empty(); const child = { _id: oid(), role: 'CHILD', username: 'child' }; const v = { _id: oid(), normalizedText: 'cat' };
  data.User = [child]; data.Vocabulary = [v]; const oldChild = oid(); const oldVocab = oid();
  const old = { _id: oid(), student: oldChild, vocabulary: oldVocab, correctCount: 99 };
  const current = { _id: oid(), student: child._id, vocabulary: v._id, correctCount: 2 };
  data.VocabularyMastery = [old, current];
  const plan = buildPlan(data, { users: [{ _id: String(oldChild), role: 'CHILD', username: 'child' }], vocabularies: [{ _id: String(oldVocab), normalizedText: 'cat' }] });
  assert.equal(plan.length, 1); assert.equal(plan[0].action, 'archive'); assert.equal(String(plan[0].before._id), String(old._id));
});
test('repair preflight prevents every write when any planned document changed', async () => {
  let writes = 0;
  const db = { collection: () => ({ findOne: async () => ({ _id: '1', changed: true }), replaceOne: async () => { writes++; } }) };
  await assert.rejects(applyPlan(db, [{ collection: 'x', action: 'replace', before: { _id: '1' }, after: { _id: '1', x: 1 } }]), /changed/);
  assert.equal(writes, 0);
});
test('Pet Animals choice questions always include the target, including fish', () => {
  const words = ['dog', 'cat', 'rabbit', 'fish'];
  const vocab = new Map(words.map(english => [english, { _id: oid(), english, imageUrl: '/images/' + english + '.svg' }]));
  const result = buildActivitiesForLesson({ key: 'B1_U5_L1', vocabularyWords: words, ageGroupCode: '3-4', order: 1, difficulty: 1, title: 'Pets', vietnameseTitle: 'Pets' }, vocab);
  const activity = result.find(a => a.activityType === 'IMAGE_WORD_MATCH');
  assert.equal(activity.questions.length, 4);
  for (const question of activity.questions) {
    assert.equal(question.options.filter(o => o.isCorrect).length, 1);
    assert.equal(question.options.find(o => o.isCorrect).text, question.correctAnswer);
  }
});
