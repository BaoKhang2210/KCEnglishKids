const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
const { LESSON_VOCABULARY_SUPPLEMENTS } = require('../src/seeds/lessonVocabularySupplements');
const { applyPlan } = require('./repair_database');

function buildSupplementPlan(lessons, words) {
  const operations = [];
  for (const [key, additions] of Object.entries(LESSON_VOCABULARY_SUPPLEMENTS)) {
    const lesson = lessons.find(lesson => lesson.key === key);
    if (!lesson) throw new Error('Supplement lesson is missing: ' + key);
    const ids = [...lesson.vocabularyItems];
    for (const text of additions) {
      const word = words.find(word => word.english.toLowerCase() === text.toLowerCase());
      if (!word || !word.sourceUnits.some(id => lesson.curriculumUnits.some(unit => String(unit) === String(id)))) throw new Error('Supplement vocabulary does not belong to lesson Unit: ' + text);
      if (!ids.some(id => String(id) === String(word._id))) ids.push(word._id);
    }
    if (ids.length === lesson.vocabularyItems.length) continue;
    operations.push({ collection: 'lessons', action: 'replace', before: lesson,
      after: { ...lesson, vocabularyItems: ids, updatedAt: new Date() }, reasons: ['Restore missing vocabulary coverage within the reference Unit'] });
  }
  return operations;
}
async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const [lessons, words] = await Promise.all([db.collection('lessons').find({}).toArray(), db.collection('vocabularies').find({}).toArray()]);
  const operations = buildSupplementPlan(lessons, words);
  const report = { apply: process.argv.includes('--apply'), lessons: operations.length, wordUnitLinksAdded: operations.reduce((n, operation) => n + operation.after.vocabularyItems.length - operation.before.vocabularyItems.length, 0), lessonKeys: operations.map(operation => operation.before.key) };
  if (report.apply && operations.length) {
    const folder = path.resolve(__dirname, '../../.local-backups/vocabulary-' + new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'lesson-vocabulary-plan.ejson'), mongoose.mongo.BSON.EJSON.stringify({ operations }, null, 2, { relaxed: false }));
    await applyPlan(db, operations);
    report.backup = folder;
  }
  console.log(JSON.stringify(report, null, 2));
}
module.exports = { buildSupplementPlan };
if (require.main === module) main().catch(error => { console.error('Vocabulary migration stopped: ' + error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
