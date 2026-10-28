// Restore into an EMPTY, explicitly selected database. Never uses the application's MONGODB_URI.
const fs = require('node:fs');
const mongoose = require('mongoose');
const models = require('../src/models');
const ClassRecognition = require('../src/models/ClassRecognition');
function validateBackup(payload) {
  if (payload.system !== 'KCEnglishKids' || payload.version !== '3.0.0' || payload.format !== 'mongodb-extended-json') throw new Error('Unsupported or incomplete backup. Version 3.0.0 Extended JSON is required.');
  const allowed = new Set(Object.values({ ...models, ClassRecognition }).map(model => model.collection.name));
  if (Object.keys(payload.collections || {}).length !== allowed.size) throw new Error('Backup is missing collections.');
  for (const name of allowed) {
    const documents = payload.collections[name];
    if (!Array.isArray(documents) || documents.some(doc => !doc._id)) throw new Error('Invalid collection: ' + name);
  }
  return allowed;
}
async function restoreIntoEmptyDatabase(payload, db, createIndexes = async () => {
  for (const model of Object.values({ ...models, ClassRecognition })) await model.createIndexes();
}) {
  const allowed = validateBackup(payload);
  for (const collection of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (!collection.name.startsWith('system.') && await db.collection(collection.name).estimatedDocumentCount()) throw new Error('Destination is not empty. Restore refused; existing data has not been changed.');
  }
  const inserted = [];
  try {
    for (const name of allowed) {
      const documents = payload.collections[name];
      inserted.push(name);
      if (documents.length) await db.collection(name).insertMany(documents, { ordered: true });
    }
    await createIndexes();
  } catch (error) {
    for (const name of inserted) await db.collection(name).deleteMany({});
    throw error;
  }
}
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/restore_system_backup.js <backup.json> [--dry-run]; set RESTORE_MONGODB_URI for the destination.');
  const payload = mongoose.mongo.BSON.EJSON.parse(fs.readFileSync(file, 'utf8'), { relaxed: false });
  for (const name of validateBackup(payload)) console.log(name + ': ' + payload.collections[name].length + ' documents');
  if (process.argv.includes('--dry-run')) return;
  if (!process.env.RESTORE_MONGODB_URI) throw new Error('RESTORE_MONGODB_URI is required. Use a new empty database.');
  await mongoose.connect(process.env.RESTORE_MONGODB_URI, { autoIndex: false });
  await restoreIntoEmptyDatabase(payload, mongoose.connection.db);
  console.log('Restore complete. IDs, timestamps and password/PIN hashes preserved.');
}
module.exports = { validateBackup, restoreIntoEmptyDatabase };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
