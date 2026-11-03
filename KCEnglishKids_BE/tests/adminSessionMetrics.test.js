const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/models');
const { getDashboardStats } = require('../src/controllers/adminController');

function query(rows = []) {
  return {
    populate() { return this; }, select() { return this; }, sort() { return this; }, limit() { return this; },
    lean: async () => rows,
    then(resolve, reject) { return Promise.resolve(rows).then(resolve, reject); }
  };
}

test('admin completed sessions count classroom teaching, independently of child self-study', async t => {
  for (const model of [M.User, M.Topic, M.Lesson, M.Activity, M.Vocabulary, M.CurriculumUnit]) t.mock.method(model, 'countDocuments', async () => 3);
  for (const model of [M.ActivityResult, M.ClassRoom, M.Schedule, M.ClassroomSession]) t.mock.method(model, 'find', () => query());
  t.mock.method(M.LearningSession, 'countDocuments', () => { throw new Error('Self-study must not be counted as teaching'); });
  const calls = [];
  t.mock.method(M.ClassroomSession, 'countDocuments', async filter => { calls.push(filter); return filter?.status === 'COMPLETED' ? 4 : 6; });
  let response;
  const res = { status(code) { assert.equal(code, 200); return this; }, json(body) { response = body; } };
  await getDashboardStats({}, res, error => { throw error; });
  assert.deepEqual(calls, [undefined, { status: 'COMPLETED' }]);
  assert.equal(response.data.metrics.totalSessions, 6);
  assert.equal(response.data.metrics.completedSessions, 4);
  assert.equal(response.data.metrics.completionRate, 67);
});
