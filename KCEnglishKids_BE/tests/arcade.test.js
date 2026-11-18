const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/models');
const { library } = require('../src/controllers/arcadeController');
const rules = require('../../shared/learningGames.json');
const id = n => String(n).padStart(24, '0');
const query = value => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, lean: async () => value, distinct: async () => value, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });

async function run(t, { learned = false, records = [] } = {}) {
  t.mock.method(M.User, 'findOne', () => query({ _id: id(1), ageGroupCode: '3-4' }));
  t.mock.method(M.VocabularyMastery, 'find', filter => { assert.equal(filter.student, id(1)); return query(records); });
  t.mock.method(M.Progress, 'find', () => query(learned ? [{ lesson: id(2) }] : []));
  t.mock.method(M.GameCatalogSetting, 'findOne', () => query({ games: rules.map((game, index) => ({ gameId: game.id, displayOrder: index, enabled: game.id !== 'bubble-pop' })) }));
  t.mock.method(M.Topic, 'find', () => query([id(8)]));
  t.mock.method(M.CurriculumUnit, 'find', () => query([id(9)]));
  t.mock.method(M.Lesson, 'find', filter => {
    assert.equal(filter.ageGroupCode, '3-4'); assert.equal(filter.status, 'ACTIVE');
    assert.deepEqual(filter.topic.$in, [id(8)]); assert.deepEqual(filter.curriculumUnits.$in, [id(9)]);
    return query([{ _id: id(2), title: 'Animals', curriculumUnits: [{ unitNumber: 1 }], vocabularyItems: [
      { _id: id(3), english: 'cat', imageUrl: '/cat.png', status: 'ACTIVE', wordType: 'noun' },
      { _id: id(4), english: 'dog', imageUrl: '/dog.png', status: 'ACTIVE', wordType: 'noun' },
      { _id: id(5), english: 'hidden', imageUrl: '/hidden.png', status: 'INACTIVE' }, null
    ] }]);
  });
  let result;
  await library({ params: { childId: id(1) } }, { json: value => { result = value.data; } }, error => { throw error; });
  return result;
}

test('new children receive an empty arcade instead of fabricated learned/mastered words', async t => {
  const data = await run(t);
  assert.deepEqual(data.vocabulary, []); assert.deepEqual(data.lessons, []); assert.deepEqual(data.gameIds, []);
});
test('arcade excludes stopped words and disabled games and retains real mastery levels', async t => {
  const data = await run(t, { learned: true, records: [{ vocabulary: id(3), masteryLevel: 3 }] });
  assert.deepEqual(data.vocabulary.map(word => [word.english, word.masteryLevel]), [['cat', 3], ['dog', 0]]);
  assert.deepEqual(data.lessons[0].wordIds, [id(3), id(4)]);
  assert.deepEqual(data.gameIds, ['koko-says']);
});
