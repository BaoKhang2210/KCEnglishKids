type CurriculumLesson = {
  key?: string; ageGroupCode?: string; bookNumber?: number; unitNumber?: number;
  lessonNumber?: number; displayOrder?: number; title?: string; vietnameseTitle?: string;
  curriculumUnits?: Array<string | { _id?: string; unitNumber?: number; bookNumber?: number }>;
};
type Unit = { _id?: string; unitNumber?: number; bookNumber?: number };

export function lessonPosition(lesson: CurriculumLesson, units: Unit[] = []) {
  const match = lesson.key?.match(/B(\d+)_U(\d+)_L(\d+)/i);
  const linked = lesson.curriculumUnits?.[0];
  const unit = typeof linked === 'object' ? linked : units.find(u => String(u._id) === String(linked));
  return {
    book: Number(match?.[1]) || unit?.bookNumber || lesson.bookNumber || Number(lesson.ageGroupCode?.[0]) - 2 || 0,
    unit: Number(match?.[2]) || unit?.unitNumber || lesson.unitNumber || 0,
    lesson: Number(match?.[3]) || lesson.lessonNumber || lesson.displayOrder || 0,
  };
}

export function compareLessons(a: CurriculumLesson, b: CurriculumLesson, units: Unit[] = []) {
  const x = lessonPosition(a, units), y = lessonPosition(b, units);
  return x.book - y.book || x.unit - y.unit || x.lesson - y.lesson
    || (a.key || '').localeCompare(b.key || '', 'en', { numeric: true })
    || (a.title || '').localeCompare(b.title || '', 'en');
}

export function bilingualLessonTitle(lesson: CurriculumLesson) {
  return (lesson.title || lesson.vietnameseTitle || '') + (lesson.vietnameseTitle && lesson.vietnameseTitle !== lesson.title ? ' (' + lesson.vietnameseTitle + ')' : '');
}
