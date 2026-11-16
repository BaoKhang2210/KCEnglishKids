const test = require('node:test');
const assert = require('node:assert/strict');
const ai = require('../src/services/aiService');
const { createAiController } = require('../src/controllers/aiController');
const id = n => String(n).padStart(24, '0');
const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
async function run(t, { overall = true } = {}) {
  let facts;
  t.mock.method(ai, 'generateParentNote', async value => { facts = value; return { options: [] }; });
  const db = {
    User: { findOne: () => query({ _id: id(1), name: 'An', role: 'CHILD', ageGroupCode: '3-4' }) },
    ClassRoom: { exists: async () => true },
    Progress: { countDocuments: async () => 1, findOne: () => query({ lesson: { title: 'Animals' } }) },
  };
  const controller = createAiController({ db, rewards: async () => ({ totalStars: 999 }), statistics: async () => [{ averageScore: 47 }] });
  let error, response, status = 200;
  const res = { status(value) { status = value; return this; }, json(value) { response = value; } };
  await controller.generateParentNote({ user: { _id: id(2), role: 'TEACHER' }, body: { childId: id(1) } }, res, value => { error = value; });
  return { status, facts, error, response };
}
test('overall AI note uses the progress statistics rather than averaging activity percentages or stars', async t => {
  const result = await run(t, { overall: true });
  assert.equal(result.error, undefined); assert.equal(result.facts.averageAccuracy, 47);
});
