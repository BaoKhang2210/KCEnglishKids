const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { references, valuesAt, auditData } = require('../scripts/audit_database');
const models = mongoose.models;
const oid = () => new mongoose.Types.ObjectId();
const empty = () => Object.fromEntries(Object.keys(models).map(name => [name, []]));

test('audit discovers scalar, array, and nested references, including newer models', () => {
  assert.ok(references(models.Lesson.schema).some(r => r.path === 'curriculumUnits' && r.ref === 'CurriculumUnit' && r.array));
  assert.ok(references(models.Activity.schema).some(r => r.path === 'questions.options.imageMedia' && r.ref === 'Media'));
  assert.ok(references(models.ClassRecognition.schema).some(r => r.path === 'winners.child'));
});

test('missing optional parent arrays are valid; missing required child inside an existing item is checked', () => {
  assert.deepEqual(valuesAt({}, ['reviews', 'child']), []);
  assert.deepEqual(valuesAt({ reviews: [] }, ['reviews', 'child']), []);
  assert.deepEqual(valuesAt({ reviews: [{}] }, ['reviews', 'child']), [undefined]);
  assert.deepEqual(valuesAt({}, ['teacher']), [undefined]);
});

test('dangling references count occurrences separately from affected documents', async () => {
  const data = empty();
  const missing = oid();
  data.ClassroomSession = [{ _id: oid(), classroom: oid(), teacher: oid(), title: 'Historical', activities: [missing, missing] }];
  const report = await auditData(data, models);
  const issue = report.issues.find(i => i.code === 'DANGLING_REFERENCE' && i.detail === 'activities -> Activity');
  assert.equal(issue.count, 2);
  assert.equal(issue.affectedDocuments, 1);
  assert.equal(report.integrity.find(i => i.model === 'ClassroomSession').documentsWithBrokenReferences, 1);
});

test('valid BSON references are accepted and a valid optional reviews omission is not an error', async () => {
  const data = empty();
  const teacher = { _id: oid(), role: 'TEACHER', name: 'Teacher' };
  const child = { _id: oid(), role: 'CHILD', name: 'Child' };
  data.User = [teacher, child];
  data.TeacherNote = [{ _id: oid(), teacher: teacher._id, student: child._id }];
  const report = await auditData(data, models);
  assert.equal(report.issues.filter(i => i.code === 'DANGLING_REFERENCE').length, 0);
});

test('audit reports invalid roles and stored string IDs without concealing them by casting', async () => {
  const data = empty();
  const child = { _id: oid(), role: 'CHILD', name: 'Child' };
  data.User = [child];
  data.TeacherNote = [{ _id: oid(), teacher: String(child._id), student: child._id }];
  const report = await auditData(data, models);
  assert.ok(report.issues.some(i => i.code === 'REFERENCE_BSON_TYPE' && i.detail === 'teacher'));
  assert.ok(report.issues.some(i => i.code === 'REFERENCE_USER_ROLE' && i.detail === 'teacher'));
});

test('a choice question with no correct option is detected even when correctAnswer has text', async () => {
  const data = empty();
  data.Activity = [{ _id: oid(), lesson: oid(), ageGroup: oid(), ageGroupCode: '3-4', title: 'Fish', activityType: 'IMAGE_WORD_MATCH', status: 'ACTIVE', questionCount: 1,
    questions: [{ correctAnswer: 'fish', options: [{ id: 'dog', text: 'dog', isCorrect: false }] }] }];
  const report = await auditData(data, models);
  assert.ok(report.issues.some(i => i.code === 'CORRECT_OPTION_COUNT'));
  assert.equal(report.issues.some(i => i.code === 'ANSWER_NOT_OPTION_ID'), false);
});
