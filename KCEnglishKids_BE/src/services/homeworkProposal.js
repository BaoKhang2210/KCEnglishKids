const M = require('../models');
const { idOf, present } = require('./teacherRules');
const { lessonGuide } = require('./earlyLearning');

async function studiedLessonIds(room, child) {
  const sessions = await M.ClassroomSession.find({ classroom: room._id, status: 'COMPLETED', isGapReview: { $ne: true }, 'lessonPlan.isGapReview': { $ne: true }, 'lessonPlan.meta.isReviewPlan': { $ne: true } }).select('lesson studentScores').lean();
  const taught = sessions.filter(session => !child || (session.studentScores || []).some(row => idOf(row.student) === idOf(child) && present(row))).map(session => idOf(session.lesson));
  if (!child) return [...new Set([...taught, ...(room.completedLessons || []).map(idOf)].filter(Boolean))];
  const [progress, observations] = await Promise.all([
    M.Progress.find({ child: child._id, completed: true }).distinct('lesson'),
    M.LearningObservation.find({ child: child._id, classroom: room._id, voidedAt: null }).distinct('lesson'),
  ]);
  return [...new Set([...taught, ...progress.map(idOf), ...observations.map(idOf)].filter(Boolean))];
}

async function proposal(room, child, lessonId) {
  const ids = await studiedLessonIds(room, child);
  const lessons = await M.Lesson.find({ _id: { $in: ids }, status: 'ACTIVE', ageGroupCode: room.ageGroupCode })
    .select('key title vietnameseTitle ageGroupCode curriculumUnits displayOrder').sort({ key: 1, displayOrder: 1 }).lean();
  const selected = lessons.find(lesson => idOf(lesson) === lessonId) || (!lessonId ? lessons[0] : null);
  if (!selected) return { lessons, lessonId: '', items: [], instructions: '', available: false,
    message: lessons.length ? 'Chọn một bài đã học trong danh sách.' : 'Chưa có bài đã học được ghi nhận. Hoàn tất buổi dạy hoặc ghi quan sát trước khi giao ôn.' };
  const lesson = await M.Lesson.findById(selected._id).populate('vocabularyItems').lean();
  if (!lesson || lesson.status !== 'ACTIVE') return { lessons: [], lessonId: '', items: [], instructions: '', available: false, message: 'Bài học không còn khả dụng. Vui lòng tải lại.' };
  const guide = lessonGuide(lesson, room.ageGroupCode);
  let items = guide.focus.map(word => ({ vocabulary: { ...word, _id: word.id }, reason: 'Từ trọng tâm trong bài lớp đã học' }));
  if (child) {
    const draft = await require('./homePractice').proposal(child, room, idOf(selected));
    if (draft.available) items = draft.items.slice(0, guide.reviewWords).map(({ vocabulary, reason }) => ({ vocabulary, reason }));
  }
  return { lessons, lessonId: idOf(selected), available: true, items,
    instructions: [guide.homeActivity.title, ...guide.homeActivity.steps].join('\n'),
    message: 'Gợi ý dựa trên bài đã học, quan sát và các lượt luyện được ghi nhận. Giáo viên chọn bài và gửi một lần.' };
}
module.exports = { studiedLessonIds, proposal };
