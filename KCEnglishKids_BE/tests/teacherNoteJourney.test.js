const test = require('node:test');
const assert = require('node:assert/strict');
const ai = require('../src/services/aiService');
const { createAiController } = require('../src/controllers/aiController');
const id = n => String(n).padStart(24, '0');
const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
async function run(t, { source = 'STAGES', submitted = true, requestedId = id(5), recipients = [id(1)], overall = false } = {}) {
  let facts;
  t.mock.method(ai, 'generateParentNote', async value => { facts = value; return { options: [] }; });
  const db = {
    User: { findOne: () => query({ _id: id(1), name: 'An', role: 'CHILD', ageGroupCode: '3-4' }) },
    ClassRoom: { exists: async () => true },
    Assignment: { findOne: () => query({ _id: id(3), teacher: id(2), classRoom: id(4), lesson: { _id: id(6), title: 'Animals' }, recipients, assignedToType: 'CLASS' }) },
    Progress: { countDocuments: async () => 1, findOne: () => query({ lesson: { title: 'Animals' } }) },
  };
  const controller = createAiController({ db, rewards: async () => ({ totalStars: 999 }), statistics: async () => [{ averageScore: 47 }], submissions: async () => ({ data: [{ hasSubmitted: submitted, submission: { _id: id(5), source, correctCount: 3, incorrectCount: 1 } }] }) });
  let error, response, status = 200;
  const res = { status(value) { status = value; return this; }, json(value) { response = value; } };
  await controller.generateParentNote({ user: { _id: id(2), role: 'TEACHER' }, body: { childId: id(1), ...(overall ? {} : { assignmentId: id(3), resultId: requestedId }) } }, res, value => { error = value; });
  return { status, facts, error, response };
}
test('AI note uses the same completed three-stage submission as assignment review', async t => {
  const result = await run(t);
  assert.equal(result.error, undefined); assert.equal(result.status, 200);
  assert.equal(result.facts.scope, 'assignment'); assert.equal(result.facts.averageAccuracy, 75);
  assert.equal(result.facts.recentLesson, 'Animals');
});
test('AI note refuses stale submission IDs and incomplete homework', async t => {
  assert.equal((await run(t, { requestedId: id(99) })).status, 404);
  assert.equal((await run(t, { submitted: false })).status, 404);
});
test('AI note cannot include a student omitted from the frozen recipients', async t => {
  assert.equal((await run(t, { recipients: [id(99)] })).status, 403);
});
test('overall AI note uses the progress statistics rather than averaging activity percentages or stars', async t => {
  const result = await run(t, { overall: true });
  assert.equal(result.error, undefined); assert.equal(result.facts.averageAccuracy, 47);
});
