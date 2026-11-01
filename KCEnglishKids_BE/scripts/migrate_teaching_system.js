// Dry run by default. Back up every affected document before --apply writes.
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
const { ClassRoom, User, Schedule, SchoolRecognition, GameCatalogSetting } = require('../src/models');
const { TEACHING_STATUSES, normalizeClassName } = require('../src/services/classroomRules');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Missing database configuration.');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000, autoCreate: false, autoIndex: false });
  const [rooms, teachers, schedules, indexes] = await Promise.all([
    ClassRoom.find().lean(), User.find({ role: 'TEACHER' }).select('_id assignedClass').lean(), Schedule.find().lean(), ClassRoom.collection.indexes()
  ]);
  const names = new Map(), current = new Map();
  for (const room of rooms) {
    const name = normalizeClassName(room.name);
    if (!name || names.has(name)) throw new Error('Resolve duplicate/empty class names before migration. No documents changed.');
    names.set(name, room._id);
    if (TEACHING_STATUSES.includes(room.status)) {
      const teacher = String(room.teacher);
      if (current.has(teacher)) throw new Error('Resolve multiple current classes per teacher before migration. No documents changed.');
      current.set(teacher, room._id);
    }
  }
  const summary = { apply: process.argv.includes('--apply'), classes: rooms.length, teachers: teachers.length,
    currentClasses: current.size, normalizedNames: rooms.filter(room => room.normalizedName !== normalizeClassName(room.name)).length,
    newCollections: ['schoolrecognitions', 'gamecatalogsettings'] };
  if (!summary.apply) { console.log(JSON.stringify(summary, null, 2)); return; }
  const backupDir = path.resolve(__dirname, '../../.local-backups/teaching-' + new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, 'before.json'), mongoose.mongo.BSON.EJSON.stringify({ rooms, teachers, schedules, indexes }, { relaxed: false }));
  if (rooms.length) await ClassRoom.bulkWrite(rooms.map(room => ({ updateOne: { filter: { _id: room._id }, update: { $set: { normalizedName: normalizeClassName(room.name), name: room.name.normalize('NFC').trim().replace(/\s+/gu, ' ') } } } })));
  for (const teacher of teachers) {
    const room = current.get(String(teacher._id));
    await User.updateOne({ _id: teacher._id }, room ? { $set: { assignedClass: room } } : { $unset: { assignedClass: 1 } });
  }
  const historical = rooms.filter(room => !TEACHING_STATUSES.includes(room.status)).map(room => room._id);
  if (historical.length) await Schedule.updateMany({ classroom: { $in: historical } }, { $set: { isActive: false } });
  await ClassRoom.createIndexes();
  if (indexes.some(index => index.name === 'one_teacher_per_active_class')) await ClassRoom.collection.dropIndex('one_teacher_per_active_class');
  for (const Model of [SchoolRecognition, GameCatalogSetting]) { await Model.createCollection(); await Model.createIndexes(); }
  console.log(JSON.stringify({ ...summary, backup: backupDir, completed: true }, null, 2));
}
if (require.main === module) main().catch(error => {
  console.error('Teaching migration failed (' + error.name + '). Check configuration and preflight conflicts.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
module.exports = { main };
