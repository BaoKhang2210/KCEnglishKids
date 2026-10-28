const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const models = { ...require('../src/models'), ClassRecognition: require('../src/models/ClassRecognition') };
const { validateBackup, restoreIntoEmptyDatabase } = require('../scripts/restore_system_backup');
const payload = () => ({ system: 'KCEnglishKids', version: '3.0.0', format: 'mongodb-extended-json', collections: Object.fromEntries(Object.values(models).map(model => [model.collection.name, []])) });
function database(initial = {}, failOn) {
  const contents = { ...initial };
  let writes = 0;
  return { contents, get writes() { return writes; }, listCollections: () => ({ toArray: async () => Object.keys(contents).map(name => ({ name })) }), collection: name => ({
    estimatedDocumentCount: async () => (contents[name] || []).length,
    insertMany: async docs => { writes++; if (name === failOn) throw new Error('insert failed'); contents[name] = [...docs]; },
    deleteMany: async () => { contents[name] = []; }
  }) };
}
test('restore validates completeness and rejects earlier incomplete backup formats', () => {
  const backup = payload();
  assert.ok(validateBackup(backup).has('progresses'));
  delete backup.collections.users;
  assert.throws(() => validateBackup(backup), /missing collections/);
  assert.throws(() => validateBackup({ ...backup, version: '2.0.0' }), /Unsupported/);
});
test('restore refuses a non-empty destination before writing anything', async () => {
  const db = database({ users: [{ name: 'Existing' }] });
  await assert.rejects(() => restoreIntoEmptyDatabase(payload(), db, async () => {}), /not empty/);
  assert.equal(db.writes, 0);
  assert.equal(db.contents.users[0].name, 'Existing');
});
test('restore preserves original BSON types and credential hashes', async () => {
  const backup = payload();
  backup.collections.users = [{ _id: new mongoose.Types.ObjectId(), createdAt: new Date(), password: 'synthetic-password-hash', pin: 'synthetic-pin-hash' }];
  const roundTrip = mongoose.mongo.BSON.EJSON.parse(mongoose.mongo.BSON.EJSON.stringify(backup, null, 0, { relaxed: false }), { relaxed: false });
  const db = database();
  await restoreIntoEmptyDatabase(roundTrip, db, async () => {});
  assert.deepEqual(db.contents.users, backup.collections.users);
});
test('a failed restore removes only the newly inserted batch in the previously empty destination', async () => {
  const backup = payload();
  backup.collections.users = [{ _id: new mongoose.Types.ObjectId() }];
  backup.collections.classrooms = [{ _id: new mongoose.Types.ObjectId() }];
  const db = database({}, 'classrooms');
  await assert.rejects(() => restoreIntoEmptyDatabase(backup, db, async () => {}), /insert failed/);
  assert.equal(Object.values(db.contents).flat().length, 0);
});
