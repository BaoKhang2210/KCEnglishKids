// Probe: how can we pair QUESTION/ANSWER and structure a teaching deck?
const mongoose = require('mongoose');
const { LanguageContent, Lesson, CurriculumUnit } = require('../src/models');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/kcenglishkids');
  const db = mongoose.connection.db;

  // 1. Do lessons link languageContents?
  const lessonsWithContents = await Lesson.find({ languageContents: { $exists: true, $ne: [] } })
    .select('title vietnameseTitle displayOrder languageContents curriculumUnit ageGroupCode')
    .lean();
  console.log('LESSONS_WITH_CONTENTS=', lessonsWithContents.length);

  // 2. Coverage: total teaching docs + how many link to a lesson (either direction)
  const all = await LanguageContent.find({ status: 'ACTIVE', contentType: { $in: ['PATTERN','SENTENCE','QUESTION','ANSWER','ORACY','DIALOGUE'] } })
    .select('contentType lesson sourceUnit ageGroupCode vocabulary english vietnamese difficulty')
    .lean();
  console.log('TOTAL_TEACHING=', all.length);
  const byType = {};
  all.forEach(d => { byType[d.contentType] = (byType[d.contentType] || 0) + 1; });
  console.log('BY_TYPE=', JSON.stringify(byType));
  console.log('HAS_LESSON_FIELD=', all.filter(d => d.lesson).length);
  console.log('HAS_UNIT=', all.filter(d => d.sourceUnit).length);
  console.log('HAS_VOCAB=', all.filter(d => (d.vocabulary || []).length > 0).length);

  // 3. Q&A pairing: within same lesson (via lesson field), Q followed by A?
  const sample = await LanguageContent.find({ contentType: 'QUESTION', status: 'ACTIVE' })
    .select('english vietnamese lesson sourceUnit vocabulary difficulty')
    .populate('lesson', 'title')
    .limit(5).lean();
  console.log('SAMPLE_QUESTIONS=', JSON.stringify(sample.map(s => ({ q: s.english, vi: s.vietnamese, lesson: s.lesson?.title, unit: String(s.sourceUnit) })), null, 1));

  // Same-unit QUESTION + ANSWER counts (to check pairing feasibility by unit)
  const byUnit = {};
  all.forEach(d => {
    const k = String(d.sourceUnit);
    if (!byUnit[k]) byUnit[k] = { Q: 0, A: 0, total: 0 };
    if (d.contentType === 'QUESTION') byUnit[k].Q++;
    if (d.contentType === 'ANSWER') byUnit[k].A++;
    byUnit[k].total++;
  });
  const unitIds = Object.keys(byUnit);
  console.log('UNITS_WITH_CONTENT=', unitIds.length);
  const units = await CurriculumUnit.find({ _id: { $in: unitIds } }).select('unitNumber bookNumber bigQuestion').lean();
  units.slice(0, 8).forEach(u => {
    const s = byUnit[String(u._id)];
    console.log(`UNIT book${u.bookNumber}-u${u.unitNumber} "${(u.bigQuestion||'').slice(0,40)}" total=${s.total} Q=${s.Q} A=${s.A}`);
  });

  // 4. Look for natural Q/A text pairs in one unit (e.g. "What is this?" / "It is a cat.")
  const oneUnit = all.filter(d => String(d.sourceUnit) === unitIds[0]);
  console.log('FIRST_UNIT_DOCS=', JSON.stringify(oneUnit.slice(0, 12).map(d => ({ t: d.contentType, en: d.english, vi: d.vietnamese, diff: d.difficulty })), null, 1));

  // 5. Lessons per unit (for deck structure)
  const firstUnitLessons = lessonsWithContents.filter(l => String(l.curriculumUnit) === unitIds[0]);
  console.log('FIRST_UNIT_LESSONS=', firstUnitLessons.map(l => ({ title: l.title, order: l.displayOrder, contents: (l.languageContents||[]).length })));

  // 6. Sample full doc with vocabulary
  const withVocab = all.find(d => (d.vocabulary || []).length > 0);
  if (withVocab) {
    const full = await LanguageContent.findById(withVocab._id).populate('vocabulary', 'english vietnamese imageUrl').lean();
    console.log('SAMPLE_WITH_VOCAB=', JSON.stringify({ t: full.contentType, en: full.english, vocab: full.vocabulary.map(v => v.english) }));
  }

  // 7. How many lessons total & their content distribution
  const lessonContentCount = lessonsWithContents.map(l => (l.languageContents || []).length);
  console.log('LESSON_CONTENT_COUNTS=', JSON.stringify(lessonContentCount));

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error('PROBE_ERR', e); process.exit(1); });
