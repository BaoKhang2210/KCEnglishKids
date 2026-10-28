const test = require('node:test');
const assert = require('node:assert/strict');
const { User, Vocabulary, VocabularyMastery } = require('../src/models');
const controller = require('../src/controllers/vocabMasteryController');
const access = require('../src/services/teacherAccess');
const id = '012345678901234567890123';
async function invoke(fn, user, body = {}) {
  const res = { status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await fn({ user, params: { childId: id, vocabId: id }, body }, res, error => { res.error = error; });
  return res;
}
test('staff cannot write mastery for a non-child account', async t => {
  t.mock.method(access, 'child', async () => null);
  let writes = 0; t.mock.method(VocabularyMastery, 'bulkWrite', async () => { writes++; });
  const res = await invoke(controller.syncMastery, { role: 'ADMIN', _id: id }, { records: [] });
  assert.equal(res.error.statusCode, 404); assert.equal(writes, 0);
});
test('invalid or deleted vocabulary rejects a complete sync batch before writing', async t => {
  t.mock.method(User, 'findOne', async () => ({ _id: id, role: 'CHILD', status: 'ACTIVE' }));
  t.mock.method(Vocabulary, 'countDocuments', async () => 0);
  let writes = 0; t.mock.method(VocabularyMastery, 'bulkWrite', async () => { writes++; });
  const res = await invoke(controller.syncMastery, { role: 'CHILD', _id: id }, { records: [{ vocabularyId: id, correctCount: 1, wrongCount: 0, attemptCount: 1, streak: 1 }] });
  assert.equal(res.error.statusCode, 404); assert.equal(writes, 0);
});
test('negative or inconsistent mastery counts do not reach bulkWrite', async t => {
  t.mock.method(User, 'findOne', async () => ({ _id: id, role: 'CHILD', status: 'ACTIVE' }));
  t.mock.method(Vocabulary, 'countDocuments', async () => 1);
  let writes = 0; t.mock.method(VocabularyMastery, 'bulkWrite', async () => { writes++; });
  const res = await invoke(controller.syncMastery, { role: 'CHILD', _id: id }, { records: [{ vocabularyId: id, correctCount: 5, wrongCount: 0, attemptCount: 1, streak: 1 }] });
  assert.equal(res.code, 400); assert.equal(writes, 0);
});
