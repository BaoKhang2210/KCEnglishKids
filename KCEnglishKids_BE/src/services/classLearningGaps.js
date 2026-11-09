const { idOf, fail } = require('./teacherRules');

async function buildReport(db, classroom, lessonId) {
  const query = { status: 'ACTIVE', ...(classroom.ageGroupCode ? { ageGroupCode: classroom.ageGroupCode } : {}) };
  if (classroom.curriculumBook) {
    const units = await db.CurriculumUnit.find({ book: classroom.curriculumBook, status: 'ACTIVE' }).distinct('_id');
    query.curriculumUnits = { $in: units };
  }
  const lessons = await db.Lesson.find(query).select('key title vietnameseTitle vocabularyItems ageGroupCode displayOrder').sort({ key: 1, displayOrder: 1 }).lean();
  const selected = lessonId ? lessons.find(lesson => idOf(lesson) === lessonId) : null;
  if (lessonId && !selected) fail('Bài học không thuộc giáo trình đang sử dụng của lớp.', 403);
  const vocabularyIds = [...new Set((selected ? [selected] : lessons).flatMap(lesson => (lesson.vocabularyItems || []).map(idOf)))];
  const [masteryRows, vocabularies] = await Promise.all([
    db.VocabularyMastery.find({ student: { $in: classroom.students || [] }, vocabulary: { $in: vocabularyIds } }).select('student vocabulary correctCount attemptCount masteryLevel').lean(),
    db.Vocabulary.find({ _id: { $in: vocabularyIds }, status: 'ACTIVE' }).select('english vietnamese difficulty imageUrl audioUrl phonetic pronunciation exampleSentence').lean(),
  ]);
  const data = require('./aiService').detectClassGaps({ students: classroom.students || [], vocabularies, masteryRows });
  const byWord = new Map(data.gaps.map(gap => [gap.vocabularyId, gap]));
  const recommendedLessons = lessons.map(lesson => {
    const focus = (lesson.vocabularyItems || []).map(idOf).map(id => byWord.get(id)).filter(Boolean);
    return { _id: idOf(lesson), key: lesson.key, title: lesson.title, vietnameseTitle: lesson.vietnameseTitle,
      vocabularyIds: focus.map(word => word.vocabularyId), words: focus.map(word => word.english),
      gapCount: focus.length, criticalCount: focus.filter(word => word.severity === 'critical').length };
  }).filter(lesson => lesson.gapCount).sort((a, b) => b.criticalCount - a.criticalCount || b.gapCount - a.gapCount || String(a.key).localeCompare(String(b.key), undefined, { numeric: true }));
  return { ...data, recommendedLessons, classroomId: idOf(classroom), classroomName: classroom.name, lessonTitle: selected?.title || null,
    basis: 'Quy tắc từ lượt luyện đã ghi nhận: độ đúng dưới 70% hoặc tỷ lệ ôn vững trong nhóm đã luyện dưới 70%. Chưa luyện được tách riêng; đây là gợi ý củng cố, không phải kết luận năng lực cả lớp.' };
}
module.exports = { buildReport };
