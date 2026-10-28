// Backed-up, resumable repair. Dry run by default; --apply performs the reviewed plan.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
mongoose.set('autoCreate', false); mongoose.set('autoIndex', false);
const { references, valuesAt } = require('./audit_database');
const { EJSON } = mongoose.mongo.BSON;
const clone = value => EJSON.parse(EJSON.stringify(value, { relaxed: false }), { relaxed: false });
const equal = (a, b) => EJSON.stringify(a, { relaxed: false }) === EJSON.stringify(b, { relaxed: false });
const norm = value => String(value || '').trim().toLowerCase();
const sid = value => String(value || '');
function editAt(value, parts, update) {
  if (Array.isArray(value)) { for (const item of value) editAt(item, parts, update); return; }
  if (!value) return;
  const [key, ...rest] = parts;
  if (rest.length) editAt(value[key], rest, update);
  else if (Array.isArray(value[key])) value[key] = value[key].map(update);
  else if (value[key] != null) value[key] = update(value[key]);
}

function buildAliases(data, legacy) {
  const maps = Object.fromEntries(Object.keys(mongoose.models).map(name => [name, new Map()]));
  const definitions = {
    AgeGroup: d => [d.code], CurriculumBook: d => [String(d.bookNumber)],
    CurriculumUnit: d => [`${d.bookNumber}:${d.unitNumber}`], Topic: d => [d.slug],
    Vocabulary: d => [norm(d.normalizedText || d.english)], Lesson: d => [d.key], Media: d => [d.mediaKey],
    User: d => [d.username && `u:${norm(d.username)}`, d.email && `e:${norm(d.email)}`].filter(Boolean),
    ClassRoom: d => [`${norm(d.name)}:${d.ageGroupCode}`]
  };
  for (const [name, keys] of Object.entries(definitions)) {
    const candidates = new Map();
    for (const doc of data[name]) for (const key of keys(doc).filter(Boolean)) candidates.set(key, [...(candidates.get(key) || []), doc]);
    for (const old of legacy[mongoose.models[name].collection.name] || []) {
      const matches = new Map(keys(old).flatMap(key => candidates.get(key) || []).filter(d => name !== 'User' || d.role === old.role).map(d => [sid(d._id), d]));
      if (matches.size === 1) maps[name].set(sid(old._id), [...matches.values()][0]._id);
    }
  }
  const activityKey = d => `${sid(d.lesson)}:${d.activityType}:${d.order}:${norm(d.title)}`;
  const current = new Map();
  for (const d of data.Activity) current.set(activityKey(d), [...(current.get(activityKey(d)) || []), d]);
  for (const d of legacy.activities || []) {
    const lesson = maps.Lesson.get(sid(d.lesson));
    if (!lesson) continue;
    const candidates = current.get(activityKey({ ...d, lesson })) || [];
    if (candidates.length === 1) maps.Activity.set(sid(d._id), candidates[0]._id);
  }
  return maps;
}

function buildPlan(data, legacy) {
  const models = mongoose.models;
  const maps = Object.fromEntries(Object.entries(data).map(([name, docs]) => [name, new Map(docs.map(d => [sid(d._id), d]))]));
  const aliases = buildAliases(data, legacy);
  const operations = [];
  const retained = Object.fromEntries(Object.entries(data).map(([name, docs]) => [name, docs.map(clone)]));
  for (const [name, model] of Object.entries(models)) {
    const refs = references(model.schema);
    for (let index = 0; index < retained[name].length; index++) {
      const before = data[name][index];
      const after = retained[name][index];
      const reasons = [];
      for (const ref of refs) editAt(after, ref.path.split('.'), value => {
        if (!value || maps[ref.ref]?.has(sid(value))) return value;
        const replacement = aliases[ref.ref]?.get(sid(value));
        return replacement || value;
      });
      for (const ref of refs) for (const value of valuesAt(after, ref.path.split('.'))) {
        if (value && !maps[ref.ref]?.has(sid(value))) reasons.push(`unrecoverable ${ref.path} -> ${ref.ref}`);
      }
      if (name === 'VocabularyMastery' && maps.User.get(sid(after.student))?.role !== 'CHILD') reasons.push('student is not a child');
      // Archival happens outside the active collections, retaining complete BSON documents.
      if (reasons.length) {
        operations.push({ collection: model.collection.name, action: 'archive', before, reasons: [...new Set(reasons)] });
        retained[name][index] = null;
      } else if (!equal(before, after)) operations.push({ collection: model.collection.name, action: 'replace', before, after, reasons: ['restore exact stable-key links from existing backup'] });
    }
  }
  for (const name of Object.keys(retained)) retained[name] = retained[name].filter(Boolean);
  // Mapping legacy IDs can collide with newer mastery records. Keep the current record;
  // retain the old counters in the archive instead of adding overlapping attempts.
  const masteryKeys = new Set();
  const remappedMastery = doc => operations.some(o => o.collection === 'vocabularymasteries' && sid(o.before._id) === sid(doc._id) && o.action === 'replace');
  for (const doc of retained.VocabularyMastery.sort((a, b) => Number(remappedMastery(a)) - Number(remappedMastery(b)))) {
    const key = `${doc.student}:${doc.vocabulary}`;
    if (masteryKeys.has(key)) {
      const existing = operations.find(o => o.collection === 'vocabularymasteries' && sid(o.before._id) === sid(doc._id));
      if (existing) operations.splice(operations.indexOf(existing), 1);
      const before = data.VocabularyMastery.find(d => sid(d._id) === sid(doc._id));
      operations.push({ collection: 'vocabularymasteries', action: 'archive', before, reasons: ['legacy mastery duplicates an existing student/vocabulary key'] });
    } else masteryKeys.add(key);
  }
  const change = (name, doc, reason, update) => {
    let operation = operations.find(o => o.collection === models[name].collection.name && sid(o.before._id) === sid(doc._id));
    if (operation?.action === 'archive') return;
    if (!operation) {
      operation = { collection: models[name].collection.name, action: 'replace', before: data[name].find(d => sid(d._id) === sid(doc._id)), after: doc, reasons: [] };
      operations.push(operation);
    }
    update(operation.after); operation.reasons.push(reason);
  };
  for (const room of retained.ClassRoom.filter(r => r.status !== 'INACTIVE')) {
    const teacher = retained.User.find(u => sid(u._id) === sid(room.teacher));
    if (teacher && sid(teacher.assignedClass) !== sid(room._id)) {
      if (teacher.assignedClass) throw new Error('Conflicting teacher assignment; manual review required');
      change('User', teacher, 'restore classroom backlink', d => { d.assignedClass = room._id; });
    }
  }
  for (const activity of retained.Activity) {
    const questions = activity.questions || [];
    const broken = questions.filter(q => q.options?.length && !q.options.some(o => o.isCorrect));
    if (!broken.length) continue;
    change('Activity', activity, 'ensure choice questions include their correct answer', d => {
      for (const q of d.questions) if (q.options?.length && !q.options.some(o => o.isCorrect)) {
        const v = retained.Vocabulary.find(v => sid(v._id) === sid(q.vocabulary) && norm(v.english) === norm(q.correctAnswer));
        if (!v) throw new Error('Question answer cannot be verified');
        q.options = [{ id: `repaired_${q._id}_correct`, text: v.english, vietnameseText: v.vietnamese, imageUrl: v.imageUrl, isCorrect: true }, ...q.options.slice(0, 2)];
      }
    });
  }
  for (const session of retained.ClassroomSession.filter(s => s.status === 'COMPLETED' && s.lesson)) {
    const lessons = [...new Set((session.activities || []).map(aid => sid(maps.Activity.get(sid(aid))?.lesson)).filter(Boolean))];
    if (lessons.some(lid => lid !== sid(session.lesson))) change('ClassroomSession', session, 'preserve historical mixed-lesson context', d => {
      d.contentSnapshot = { mode: 'MIXED_LESSONS', originalLessonId: sid(d.lesson), lessonIds: [...new Set([sid(d.lesson), ...lessons])], repairNote: 'Historical mixed-lesson session; no single lesson reference applies.' };
      d.lesson = null;
    });
  }
  const { calculateLessonStars } = require('../src/services/starService');
  for (const progress of retained.Progress.filter(p => p.completed && !p.completionSnapshot?.source)) {
    const activities = retained.Activity.filter(a => a.status === 'ACTIVE' && sid(a.lesson) === sid(progress.lesson));
    const results = retained.ActivityResult.filter(r => r.completed && sid(r.child) === sid(progress.child) && sid(r.lesson) === sid(progress.lesson));
    if (!calculateLessonStars(activities, results).completed) change('Progress', progress, 'preserve prior completion without inventing results', d => {
      d.completionSnapshot = { source: 'LEGACY_PROGRESS', recordedAt: new Date(), activityIds: activities.filter(a => results.some(r => sid(r.activity) === sid(a._id))).map(a => a._id) };
    });
  }
  return operations;
}

async function applyPlan(db, operations) {
  // Verify the whole plan before the first mutation.
  for (const op of operations) if (!equal(await db.collection(op.collection).findOne({ _id: op.before._id }), op.before)) throw new Error('Database changed after dry run; rebuild the repair plan');
  const applied = [];
  try {
    for (const op of operations) {
      const filter = { _id: op.before._id, ...(op.before.updatedAt ? { updatedAt: op.before.updatedAt } : {}), ...(op.before.__v != null ? { __v: op.before.__v } : {}) };
      const result = op.action === 'archive' ? await db.collection(op.collection).deleteOne(filter)
        : await db.collection(op.collection).replaceOne(filter, op.after);
      if ((result.deletedCount ?? result.matchedCount) !== 1) throw new Error('Concurrent change detected');
      applied.push(op);
    }
  } catch (error) {
    for (const op of applied.reverse()) {
      const current = await db.collection(op.collection).findOne({ _id: op.before._id });
      if (op.action === 'archive' && !current) await db.collection(op.collection).insertOne(op.before);
      else if (op.action === 'replace' && equal(current, op.after)) await db.collection(op.collection).replaceOne({ _id: op.before._id }, op.before);
    }
    throw error;
  }
}

async function main() {
  const folder = path.resolve(__dirname, '../../.local-backups/database-repair-2026-10-28');
  const backupFile = path.join(folder, 'before.ejson');
  if (!fs.existsSync(backupFile)) throw new Error('A full backup is required before planning this repair');
  const backup = EJSON.parse(fs.readFileSync(backupFile, 'utf8'), { relaxed: false });
  require('./restore_system_backup').validateBackup(backup);
  await mongoose.connect(process.env.MONGODB_URI, { autoCreate: false, autoIndex: false });
  const data = {};
  for (const [name, model] of Object.entries(mongoose.models)) data[name] = await mongoose.connection.db.collection(model.collection.name).find({}).toArray();
  const legacy = {};
  for (const filename of fs.readdirSync(path.resolve(__dirname, '../data_backup'))) if (filename.endsWith('.json')) legacy[filename.slice(0, -5)] = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data_backup', filename), 'utf8'));
  const operations = buildPlan(data, legacy);
  const summary = operations.reduce((out, op) => { const key = `${op.collection}:${op.action}`; out[key] = (out[key] || 0) + 1; return out; }, {});
  const serialized = EJSON.stringify({ database: mongoose.connection.name, backupSha256: crypto.createHash('sha256').update(fs.readFileSync(backupFile)).digest('hex'), operations }, null, 2, { relaxed: false });
  const planFile = path.join(folder, `repair-plan-${Date.now()}.ejson`);
  fs.writeFileSync(planFile, serialized, { flag: 'wx' });
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', operations: operations.length, summary, planFile }));
  if (!process.argv.includes('--apply')) return;
  await applyPlan(mongoose.connection.db, operations);
  // Create declared indexes only; never drop other indexes.
  for (const model of Object.values(mongoose.models)) await model.createIndexes();
  console.log('Repair applied; original documents and archive reasons retained in the local repair plan.');
}
module.exports = { buildAliases, buildPlan, applyPlan, editAt };
if (require.main === module) main().catch(error => { console.error(`Repair stopped: ${error.name}: ${error.message.replace(/mongodb[^\s]*/gi, '[redacted]')}`); process.exitCode = 1; }).finally(() => mongoose.disconnect());
