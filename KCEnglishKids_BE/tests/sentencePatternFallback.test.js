const test = require('node:test');
const assert = require('node:assert/strict');
const { ClassRoom, CurriculumUnit, Lesson, LanguageContent } = require('../src/models');
const controller = require('../src/controllers/sentencePatternController');
const id = n => String(n).padStart(24, '0');
const query = value => ({
  select() { return this; }, populate() { return this; }, sort() { return this; },
  lean() { return Promise.resolve(value); }
});

for (const linked of [false, true]) {
  test(`lesson sentence query ${linked ? 'preserves explicit content links' : 'falls back to its units'}`, async t => {
    t.mock.method(Lesson, 'findById', () => query({
      languageContents: linked ? [id(3)] : [], curriculumUnits: [id(2)], ageGroupCode: '3-4'
    }));
    t.mock.method(Lesson, 'find', () => query([]));
    t.mock.method(LanguageContent, 'find', filter => {
      assert.equal(filter.status, 'ACTIVE');
      const conditions = filter.$and[0].$or;
      assert.deepEqual(conditions[0], { lesson: id(1) });
      assert.deepEqual(conditions[1], { _id: { $in: linked ? [id(3)] : [] } });
      assert.equal(conditions.length, linked ? 2 : 3);
      if (!linked) assert.deepEqual(conditions[2], { sourceUnit: { $in: [id(2)] } });
      return query([{ _id: id(3), contentType: 'SENTENCE', english: 'Hello', sourceUnit: { _id: id(2) } }]);
    });
    let response;
    await controller.list({ query: { lessonId: id(1) } }, { json(data) { response = data; } }, error => { throw error; });
    assert.equal(response.success, true);
    assert.equal(response.data[0].english, 'Hello');
  });
}

test('teacher sentence lists and unit overview stay within assigned ages', async t => {
  const teacherId = id(9);
  t.mock.method(ClassRoom, 'find', filter => {
    assert.equal(filter.teacher, teacherId);
    return query([{ ageGroupCode: '4-5' }]);
  });
  t.mock.method(LanguageContent, 'find', filter => {
    assert.deepEqual(filter.ageGroupCode, { $eq: '3-4', $in: ['4-5'] });
    return query([]);
  });
  t.mock.method(LanguageContent, 'aggregate', async pipeline => {
    assert.deepEqual(pipeline[0].$match.ageGroupCode, { $eq: '3-4', $in: ['4-5'] });
    return [];
  });
  t.mock.method(Lesson, 'find', () => query([]));
  t.mock.method(CurriculumUnit, 'find', () => query([]));
  const req = { user: { _id: teacherId, role: 'TEACHER' }, query: { ageGroupCode: '3-4' } };
  let listed;
  await controller.list(req, { json(data) { listed = data; } }, error => { throw error; });
  assert.deepEqual(listed.data, []);
  let overview;
  await controller.unitsOverview(req, { json(data) { overview = data; } }, error => { throw error; });
  assert.deepEqual(overview.data, []);
});
