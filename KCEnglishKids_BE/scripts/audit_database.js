// Read-only audit. Never initializes collections/indexes or falls back to another DB.
// Run from any directory: node scripts/audit_database.js --out ../docs/database-audit-data.json
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);
require('../src/models');
require('../src/models/ClassRecognition');

const id = value => value == null ? '' : String(value);
const hasId = (values, value) => (values || []).some(v => id(v) === id(value));
const active = doc => doc.status === 'ACTIVE';
const normalize = value => String(value || '').trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ');
const canonical = obj => JSON.stringify(obj, (_, v) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);

function references(schema, prefix = '') {
  const refs = [];
  schema.eachPath((name, type) => {
    const embedded = type.getEmbeddedSchemaType?.();
    const ref = type.options.ref || embedded?.options.ref;
    if (ref) refs.push({ path: prefix + name, ref, required: Boolean(type.isRequired), array: Boolean(embedded) });
    if (type.schema) refs.push(...references(type.schema, prefix + name + '.'));
  });
  return refs;
}

// Preserve missing values within existing subdocuments for required-ref checks.
function valuesAt(value, parts) {
  if (Array.isArray(value)) return value.flatMap(v => valuesAt(v, parts));
  if (!parts.length) return Array.isArray(value) ? value : [value];
  if (value == null) return [];
  return valuesAt(value[parts[0]], parts.slice(1));
}

async function auditData(data, models) {
  const issues = new Map();
  const affected = new Map();
  const add = (severity, code, model, doc, detail) => {
    const key = `${severity}:${code}:${model}:${detail}`;
    if (!issues.has(key)) { issues.set(key, { severity, code, model, detail, count: 0, sampleIds: [] }); affected.set(key, new Set()); }
    const issue = issues.get(key);
    issue.count++;
    affected.get(key).add(id(doc._id));
    if (issue.sampleIds.length < 8 && !issue.sampleIds.includes(id(doc._id))) issue.sampleIds.push(id(doc._id));
  };
  const maps = Object.fromEntries(Object.entries(data).map(([name, docs]) => [name, new Map(docs.map(d => [id(d._id), d]))]));
  const get = (name, value) => maps[name]?.get(id(value));
  let checkedReferences = 0;
  let referencePaths = 0;
  for (const [name, model] of Object.entries(models)) {
    const refs = references(model.schema);
    referencePaths += refs.length;
    for (const doc of data[name] || []) {
      for (const ref of refs) {
        for (const value of valuesAt(doc, ref.path.split('.'))) {
          if (value == null || value === '') {
            if (ref.required && !ref.array) add('ERROR', 'MISSING_REQUIRED_REFERENCE', name, doc, ref.path);
            continue;
          }
          checkedReferences++;
          if (!get(ref.ref, value)) add('ERROR', 'DANGLING_REFERENCE', name, doc, `${ref.path} -> ${ref.ref}`);
          else if (!(value instanceof mongoose.Types.ObjectId)) add('WARNING', 'REFERENCE_BSON_TYPE', name, doc, ref.path);
          if (ref.ref === 'User' && get('User', value)) {
            const leaf = ref.path.split('.').at(-1);
            const roles = /^(child|student|students|recipients|deletionStudentIds|studentsNeedingPractice|topPerformers)$/.test(leaf) ? ['CHILD']
              : leaf === 'teacher' ? ['TEACHER'] : leaf === 'publishedBy' ? ['TEACHER', 'ADMIN'] : null;
            if (roles && !roles.includes(get('User', value).role)) add('ERROR', 'REFERENCE_USER_ROLE', name, doc, ref.path);
          }
        }
      }
      let validation;
      try { await model.hydrate(doc).validate(); } catch (error) { validation = error; }
      for (const [field, error] of Object.entries(validation?.errors || {})) {
        add('ERROR', 'SCHEMA_VALIDATION', name, doc, `${field}: ${error.kind || error.name}`);
      }
      if (doc.ageGroup && get('AgeGroup', doc.ageGroup) && doc.ageGroupCode && get('AgeGroup', doc.ageGroup).code !== doc.ageGroupCode) {
        add('ERROR', 'AGE_GROUP_MISMATCH', name, doc, 'ageGroup vs ageGroupCode');
      }
      if (doc.ageGroups && doc.ageGroupCodes) {
        const codes = doc.ageGroups.map(a => get('AgeGroup', a)?.code).filter(Boolean).sort();
        if (JSON.stringify(codes) !== JSON.stringify([...doc.ageGroupCodes].sort())) add('ERROR', 'AGE_GROUP_ARRAY_MISMATCH', name, doc, 'ageGroups vs ageGroupCodes');
      }
    }
  }
  const checkLesson = (name, doc, lessonId, code) => {
    const lesson = get('Lesson', lessonId);
    if (lesson && code && lesson.ageGroupCode !== code) add('ERROR', 'LESSON_AGE_MISMATCH', name, doc, 'ageGroupCode vs lesson');
    return lesson;
  };
  for (const unit of data.CurriculumUnit) {
    const book = get('CurriculumBook', unit.book);
    if (book && (book.bookNumber !== unit.bookNumber || book.ageGroupCode !== unit.ageGroupCode)) add('ERROR', 'UNIT_BOOK_MISMATCH', 'CurriculumUnit', unit, 'bookNumber/ageGroupCode');
  }
  const coverage = data.CurriculumUnit.map(unit => {
    const lessons = data.Lesson.filter(l => active(l) && hasId(l.curriculumUnits, unit._id));
    const vocabulary = data.Vocabulary.filter(v => active(v) && hasId(v.sourceUnits, unit._id));
    const language = data.LanguageContent.filter(l => active(l) && id(l.sourceUnit) === id(unit._id));
    if (active(unit) && !lessons.length) add('ERROR', 'UNIT_WITHOUT_LESSONS', 'CurriculumUnit', unit, 'no active lessons');
    if (active(unit) && !vocabulary.length) add('ERROR', 'UNIT_WITHOUT_VOCABULARY', 'CurriculumUnit', unit, 'no active vocabulary');
    if (active(unit) && !language.length) add('WARNING', 'UNIT_WITHOUT_LANGUAGE', 'CurriculumUnit', unit, 'no active language content');
    return { unit: `B${unit.bookNumber}_U${unit.unitNumber}`, lessons: lessons.length, vocabulary: vocabulary.length, language: language.length,
      activities: data.Activity.filter(a => active(a) && lessons.some(l => id(l._id) === id(a.lesson))).length,
      vocabularyReferencesWithoutExactMatch: (unit.vocabularyReferences || []).filter(word => !vocabulary.some(v => normalize(v.english) === normalize(word))) };
  }).sort((a, b) => a.unit.localeCompare(b.unit));
  for (const lesson of data.Lesson) {
    for (const unitId of lesson.curriculumUnits || []) {
      const unit = get('CurriculumUnit', unitId);
      if (unit && unit.ageGroupCode !== lesson.ageGroupCode) add('ERROR', 'LESSON_UNIT_AGE_MISMATCH', 'Lesson', lesson, 'curriculumUnits');
    }
    if (!active(lesson)) continue;
    if (!lesson.curriculumUnits?.length) add('ERROR', 'LESSON_WITHOUT_UNITS', 'Lesson', lesson, 'curriculumUnits');
    if (!lesson.vocabularyItems?.length) add('WARNING', 'LESSON_WITHOUT_VOCABULARY', 'Lesson', lesson, 'vocabularyItems');
    if (!lesson.languageContents?.length) add('WARNING', 'LESSON_WITHOUT_LANGUAGE', 'Lesson', lesson, 'languageContents');
    if (!data.Activity.some(a => active(a) && id(a.lesson) === id(lesson._id))) add('WARNING', 'LESSON_WITHOUT_ACTIVITIES', 'Lesson', lesson, 'no active activity');
    for (const vid of lesson.vocabularyItems || []) {
      const v = get('Vocabulary', vid);
      if (v?.ageGroupCodes?.length && !v.ageGroupCodes.includes(lesson.ageGroupCode)) add('ERROR', 'LESSON_VOCAB_AGE_MISMATCH', 'Lesson', lesson, 'vocabularyItems.ageGroupCodes');
      if (v && !lesson.curriculumUnits?.some(u => hasId(v.sourceUnits, u))) add('WARNING', 'LESSON_VOCAB_UNIT_MISMATCH', 'Lesson', lesson, 'vocabularyItems.sourceUnits');
    }
    for (const lid of lesson.languageContents || []) {
      const l = get('LanguageContent', lid);
      if (l?.sourceUnit && !hasId(lesson.curriculumUnits, l.sourceUnit)) add('ERROR', 'LESSON_LANGUAGE_UNIT_MISMATCH', 'Lesson', lesson, 'languageContents.sourceUnit');
    }
  }
  for (const topic of data.Topic.filter(active)) {
    if (!data.Lesson.some(l => active(l) && id(l.topic) === id(topic._id))) add('WARNING', 'TOPIC_WITHOUT_LESSONS', 'Topic', topic, topic.slug);
  }
  for (const activity of data.Activity) {
    checkLesson('Activity', activity, activity.lesson, activity.ageGroupCode);
    if (!active(activity)) continue;
    if (!activity.questions?.length) add('ERROR', 'ACTIVITY_WITHOUT_QUESTIONS', 'Activity', activity, activity.activityType);
    if (activity.questionCount !== activity.questions?.length) add('WARNING', 'QUESTION_COUNT_MISMATCH', 'Activity', activity, activity.activityType);
    for (const q of activity.questions || []) {
      const ids = (q.options || []).map(o => o.id);
      if (new Set(ids).size !== ids.length) add('ERROR', 'DUPLICATE_OPTION_ID', 'Activity', activity, activity.activityType);
      const correct = (q.options || []).filter(o => o.isCorrect);
      // correctAnswer may be text; server grading primarily uses option.isCorrect.
      if (q.options?.length && correct.length !== 1) add('WARNING', 'CORRECT_OPTION_COUNT', 'Activity', activity, activity.activityType);
    }
  }
  for (const room of data.ClassRoom) {
    const teacher = get('User', room.teacher);
    if (teacher && teacher.role !== 'TEACHER') add('ERROR', 'USER_ROLE_MISMATCH', 'ClassRoom', room, 'teacher');
    if (teacher && room.status !== 'INACTIVE' && id(teacher.assignedClass) !== id(room._id)) add('ERROR', 'TEACHER_CLASS_BACKLINK', 'ClassRoom', room, 'teacher.assignedClass');
    if (new Set((room.students || []).map(id)).size !== room.students?.length) add('ERROR', 'DUPLICATE_CLASS_STUDENT', 'ClassRoom', room, 'students');
    for (const sid of room.students || []) {
      const student = get('User', sid);
      if (student && student.role !== 'CHILD') add('ERROR', 'USER_ROLE_MISMATCH', 'ClassRoom', room, 'students');
      if (student && id(student.assignedClass) !== id(room._id)) add('ERROR', 'STUDENT_CLASS_BACKLINK', 'ClassRoom', room, 'students.assignedClass');
      if (student && student.ageGroupCode !== room.ageGroupCode) add('ERROR', 'STUDENT_CLASS_AGE', 'ClassRoom', room, 'students.ageGroupCode');
    }
  }
  for (const user of data.User.filter(u => u.assignedClass)) {
    const room = get('ClassRoom', user.assignedClass);
    if (room && user.role === 'CHILD' && !hasId(room.students, user._id)) add('ERROR', 'CLASS_STUDENT_BACKLINK', 'User', user, 'assignedClass.students');
    if (room && user.role === 'TEACHER' && id(room.teacher) !== id(user._id)) add('ERROR', 'CLASS_TEACHER_BACKLINK', 'User', user, 'assignedClass.teacher');
  }
  for (const result of data.ActivityResult) {
    const session = get('LearningSession', result.session);
    const activity = get('Activity', result.activity);
    if (session && (id(session.child) !== id(result.child) || id(session.lesson) !== id(result.lesson))) add('ERROR', 'RESULT_SESSION_MISMATCH', 'ActivityResult', result, 'child/lesson');
    if (activity && id(activity.lesson) !== id(result.lesson)) add('ERROR', 'RESULT_ACTIVITY_LESSON', 'ActivityResult', result, 'lesson');
  }
  for (const progress of data.Progress) {
    const lesson = get('Lesson', progress.lesson);
    if (lesson && id(lesson.topic) !== id(progress.topic)) add('ERROR', 'PROGRESS_TOPIC_MISMATCH', 'Progress', progress, 'topic vs lesson.topic');
    if (progress.completed) {
      if (progress.completionSnapshot?.source === 'LEGACY_PROGRESS') {
        add('INFO', 'LEGACY_COMPLETION_RETAINED', 'Progress', progress, 'prior completion preserved; no missing activity results invented');
        continue;
      }
      const activities = data.Activity.filter(a => active(a) && id(a.lesson) === id(progress.lesson) &&
        (!progress.completionSnapshot?.source || hasId(progress.completionSnapshot.activityIds, a._id)));
      const results = data.ActivityResult.filter(r => r.completed && id(r.lesson) === id(progress.lesson) && id(r.child) === id(progress.child));
      const rating = require('../src/services/starService').calculateLessonStars(activities, results);
      if (!rating.completed) add('WARNING', 'COMPLETION_WITHOUT_ALL_CURRENT_RESULTS', 'Progress', progress, 'completed vs active activity results (content may have changed)');
      else if (rating.stars !== progress.stars) add('WARNING', 'LEGACY_LESSON_STARS', 'Progress', progress, 'stored stars vs current lesson rating');
    }
  }
  for (const completion of data.UnitCompletion) {
    const lessons = data.Lesson.filter(l => active(l) && hasId(l.curriculumUnits, completion.unit));
    if (!lessons.length || lessons.some(l => !data.Progress.some(p => p.completed && id(p.child) === id(completion.child) && id(p.lesson) === id(l._id)))) {
      add('WARNING', 'UNIT_COMPLETION_PROGRESS_MISMATCH', 'UnitCompletion', completion, 'current active lessons are not all completed (may be historical)');
    }
  }
  for (const session of data.LearningSession) {
    for (const aid of [session.currentActivity, ...(session.completedActivities || [])].filter(Boolean)) {
      const activity = get('Activity', aid);
      if (activity && id(activity.lesson) !== id(session.lesson)) add('ERROR', 'SESSION_ACTIVITY_LESSON', 'LearningSession', session, 'current/completed activities');
    }
  }
  for (const session of data.ClassroomSession) {
    checkLesson('ClassroomSession', session, session.lesson, session.ageGroup);
    if (session.lesson) for (const aid of session.activities || []) {
      const activity = get('Activity', aid);
      if (activity && id(activity.lesson) !== id(session.lesson)) add('ERROR', 'CLASS_SESSION_ACTIVITY_LESSON', 'ClassroomSession', session, 'activities');
    }
  }
  for (const assignment of data.Assignment) {
    const activity = get('Activity', assignment.activity);
    if (activity && id(activity.lesson) !== id(assignment.lesson)) add('ERROR', 'ASSIGNMENT_ACTIVITY_LESSON', 'Assignment', assignment, 'activity');
    if (assignment.assignedToType === 'STUDENT' && !assignment.student) add('ERROR', 'ASSIGNMENT_WITHOUT_STUDENT', 'Assignment', assignment, 'student');
  }
  for (const schedule of data.Schedule.filter(s => s.isActive)) {
    const room = get('ClassRoom', schedule.classroom);
    if (room && id(room.teacher) !== id(schedule.teacher)) add('ERROR', 'SCHEDULE_TEACHER_MISMATCH', 'Schedule', schedule, 'teacher vs classroom.teacher');
  }
  const imageKind = url => !url ? 'missing' : url.startsWith('data:image/svg+xml') ? 'inlineSvg' : /^https?:/.test(url) ? 'remote' : 'local';
  const imageInventory = {};
  for (const [name, field] of [['Vocabulary', 'imageUrl'], ['Topic', 'imageUrl'], ['Lesson', 'thumbnailUrl']]) {
    imageInventory[name] = (data[name] || []).reduce((counts, d) => { const kind = imageKind(d[field]); counts[kind] = (counts[kind] || 0) + 1; return counts; }, {});
  }
  imageInventory.mediaTypes = data.Media.reduce((counts, d) => { counts[d.type] = (counts[d.type] || 0) + 1; return counts; }, {});
  imageInventory.languageImageReferences = data.LanguageContent.filter(l => l.imageMedia).length;
  imageInventory.vocabularyCacheMismatch = data.Vocabulary.filter(v => v.primaryMedia && get('Media', v.primaryMedia) && v.imageUrl !== get('Media', v.primaryMedia).url).length;
  imageInventory.audioCacheMismatch = data.Vocabulary.filter(v => v.audioMedia && get('Media', v.audioMedia) && v.audioUrl !== get('Media', v.audioMedia).url).length;
  imageInventory.emojiSvgVocabulary = data.Vocabulary.filter(v => {
    try { return v.imageUrl?.startsWith('data:image/svg+xml') && /<text[\s>]/i.test(decodeURIComponent(v.imageUrl.split(',').slice(1).join(','))); } catch { return false; }
  }).length;
  imageInventory.animationPlaceholders = data.Media.filter(m => m.type === 'ANIMATION' && m.url?.startsWith('placeholder:')).length;
  imageInventory.genericSparkleVocabulary = data.Vocabulary.filter(v => {
    try { return /dominant-baseline="middle">[✨🌟]<\/text>/.test(decodeURIComponent(v.imageUrl?.split(',').slice(1).join(',') || '')); } catch { return false; }
  }).map(v => v.english);
  const contentUsage = {
    vocabularyWithoutLesson: data.Vocabulary.filter(v => !data.Lesson.some(l => hasId(l.vocabularyItems, v._id))).map(v => ({ id: id(v._id), english: v.english })),
    languageWithoutLesson: data.LanguageContent.filter(c => !data.Lesson.some(l => hasId(l.languageContents, c._id))).map(c => ({ id: id(c._id), english: c.english }))
  };
  const integrity = Object.entries(models).map(([name, model]) => ({ model: name, collection: model.collection.name,
    documentsWithBrokenReferences: new Set([...issues.entries()].filter(([, issue]) => issue.model === name && issue.code === 'DANGLING_REFERENCE').flatMap(([key]) => [...affected.get(key)])).size }));
  return { checkedReferences, referencePaths, coverage, imageInventory, contentUsage, integrity,
    issues: [...issues.entries()].map(([key, issue]) => ({ ...issue, affectedDocuments: affected.get(key).size })) };
}

async function run() {
  const output = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
  if (process.argv.includes('--out') && (!output || output.startsWith('--'))) throw new Error('Missing --out path');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required; audit never silently falls back to another database.');
  const startedAt = new Date().toISOString();
  await mongoose.connect(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const models = mongoose.models;
  const collections = await db.listCollections().toArray();
  const names = new Set(collections.map(c => c.name));
  const data = {};
  const indexes = [];
  // Raw reads prevent casting/defaults from concealing stored reference problems.
  for (const [name, model] of Object.entries(models)) {
    const collection = db.collection(model.collection.name);
    data[name] = names.has(model.collection.name) ? await collection.find({}).toArray() : [];
    const actual = names.has(model.collection.name) ? await collection.listIndexes().toArray() : [];
    const missing = model.schema.indexes().filter(([key, opts]) => !actual.some(index =>
      JSON.stringify(index.key) === JSON.stringify(key) && Boolean(index.unique) === Boolean(opts.unique) &&
      Boolean(index.sparse) === Boolean(opts.sparse) && canonical(index.partialFilterExpression) === canonical(opts.partialFilterExpression)));
    const duplicates = [];
    for (const [key, opts] of model.schema.indexes().filter(([, opts]) => opts.unique)) {
      const fields = Object.keys(key);
      const filters = [];
      if (opts.partialFilterExpression) filters.push(opts.partialFilterExpression);
      if (opts.sparse) filters.push({ $or: fields.map(f => ({ [f]: { $exists: true } })) });
      const groups = await collection.aggregate([
        ...(filters.length ? [{ $match: { $and: filters } }] : []),
        { $group: { _id: Object.fromEntries(fields.map((f, i) => ['f' + i, '$' + f])), count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }, { $count: 'groups' }
      ]).toArray();
      // Do not export usernames, emails or other unique-key values.
      if (groups.length) duplicates.push({ key, groups: groups[0].groups });
    }
    indexes.push({ model: name, collection: model.collection.name, count: data[name].length, present: names.has(model.collection.name),
      missing: missing.map(([key, opts]) => ({ key, unique: Boolean(opts.unique), sparse: Boolean(opts.sparse), ...(opts.name ? { name: opts.name } : {}), ...(opts.partialFilterExpression ? { partialFilterExpression: opts.partialFilterExpression } : {}) })), duplicates });
  }
  const report = { startedAt, finishedAt: new Date().toISOString(), database: db.databaseName, readOnly: true,
    snapshot: 'Sequential reads; run during a quiet period for a consistent audit.',
    collections: indexes, unmappedCollections: [...names].filter(n => !indexes.some(i => i.collection === n)),
    ...await auditData(data, models) };
  if (output) fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(output ? { output: path.resolve(output), counts: indexes.map(i => ({ model: i.model, count: i.count })),
    checkedReferences: report.checkedReferences, referencePaths: report.referencePaths,
    issues: report.issues.map(({ sampleIds, ...issue }) => issue), integrity: report.integrity.filter(i => i.documentsWithBrokenReferences),
    missingIndexes: indexes.filter(i => i.missing.length), duplicateKeys: indexes.filter(i => i.duplicates.length), imageInventory: report.imageInventory } : report, null, 2));
  if (report.issues.some(i => i.severity === 'ERROR') || indexes.some(i => i.duplicates.length || i.missing.some(k => k.unique))) process.exitCode = 2;
}
if (require.main === module) run().catch(error => {
  // Driver messages can contain connection credentials; report only the error class.
  console.error(`Database audit could not complete (${error.name}). Check MONGODB_URI, network access and --out path.`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
module.exports = { references, valuesAt, auditData };
