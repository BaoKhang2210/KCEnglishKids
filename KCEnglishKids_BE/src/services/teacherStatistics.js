const { ActivityResult, Progress, ClassroomSession, UnitCompletion, Activity, Assignment, LearningEvent } = require('../models');
const { calculateLessonStars } = require('./starService');
function combineAssessment(sources) {
  const correctAnswers = sources.reduce((n, row) => n + Math.max(0, Number(row?.correctAnswers) || 0), 0);
  const incorrectAnswers = sources.reduce((n, row) => n + Math.max(0, Number(row?.incorrectAnswers) || 0), 0);
  const answeredCount = correctAnswers + incorrectAnswers;
  return { correctAnswers, answeredCount, averageScore: answeredCount ? Math.round(100 * correctAnswers / answeredCount) : null };
}
const statsFor = async ids => {
  if (!ids.length) return [];
  const [resultStats, progressStats, classroomStats, unitStats, completedProgress, eventStats] = await Promise.all([
    ActivityResult.aggregate([
      { $match: { child: { $in: ids }, completed: true } },
      { $group: {
          _id: '$child',
          correctAnswers: { $sum: '$correctCount' },
          incorrectAnswers: { $sum: '$incorrectCount' },
          resultCount: { $sum: 1 },
          learningTime: { $sum: '$duration' },
          timedResults: { $sum: { $cond: [{ $isNumber: '$duration' }, 1, 0] } },
          lastActivity: { $max: '$createdAt' }
      } }
    ]),
    Progress.aggregate([
      { $match: { child: { $in: ids } } },
      { $group: {
          _id: '$child',
          completedLessons: { $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] } },
          lastProgressDate: { $max: '$lastActivityAt' }
      } }
    ]),
    ClassroomSession.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $unwind: '$studentScores' },
      { $match: { 'studentScores.student': { $in: ids }, 'studentScores.attendance': { $nin: ['ABSENT', 'EXCUSED'] } } },
      { $group: {
          _id: '$studentScores.student',
          classroomStars: { $sum: '$studentScores.stars' },
          classroomSessions: { $sum: 1 },
          correctAnswers: { $sum: '$studentScores.correctCount' },
          incorrectAnswers: { $sum: '$studentScores.incorrectCount' }
          ,learningTime: { $sum: { $cond: [{ $and: [{ $ne: ['$startedAt', null] }, { $gt: ['$endedAt', '$startedAt'] }] }, { $divide: [{ $subtract: ['$endedAt', '$startedAt'] }, 1000] }, 0] } }
          ,timedSessions: { $sum: { $cond: [{ $and: [{ $ne: ['$startedAt', null] }, { $gt: ['$endedAt', '$startedAt'] }] }, 1, 0] } }
      } }
    ]),
    UnitCompletion.aggregate([
      { $match: { child: { $in: ids } } },
      { $unwind: '$rewards' },
      { $match: { 'rewards.type': 'STAR' } },
      { $group: {
          _id: '$child',
          bonusStars: { $sum: '$rewards.amount' }
      } }
    ]),
    Progress.find({ child: { $in: ids }, completed: true }).select('child lesson stars completionSnapshot').lean(),
    LearningEvent.aggregate([
      { $match: { child: { $in: ids } } },
      { $group: { _id: '$child', attempts: { $sum: { $cond: [{ $in: ['$stage', [2, 3]] }, 1, 0] } }, lastActivity: { $max: '$createdAt' },
        learningTime: { $sum: '$durationSeconds' },
        timedEvents: { $sum: { $cond: [{ $isNumber: '$durationSeconds' }, 1, 0] } },
        untimedEvents: { $sum: { $cond: [{ $isNumber: '$durationSeconds' }, 0, 1] } },
        correctAnswers: { $sum: { $size: { $filter: { input: { $ifNull: ['$answers', []] }, as: 'answer', cond: { $eq: ['$$answer.isCorrect', true] } } } } },
        incorrectAnswers: { $sum: { $size: { $filter: { input: { $ifNull: ['$answers', []] }, as: 'answer', cond: { $eq: ['$$answer.isCorrect', false] } } } } }
      } }
    ])
  ]);

  const lessonIds = [...new Set(completedProgress.map((item) => item.lesson ? String(item.lesson) : null).filter(Boolean))];
  const [lessonActivities, lessonResults] = lessonIds.length
    ? await Promise.all([
      Activity.find({ lesson: { $in: lessonIds }, status: 'ACTIVE' })
        .select('_id lesson questions questionCount pointsPerQuestion')
        .lean(),
      ActivityResult.find({ child: { $in: ids }, lesson: { $in: lessonIds }, completed: true })
        .select('child lesson activity score')
        .lean()
    ])
    : [[], []];
  const activitiesByLesson = new Map();
  const resultsByChildLesson = new Map();
  for (const activity of lessonActivities) {
    const lessonId = String(activity.lesson);
    if (!activitiesByLesson.has(lessonId)) activitiesByLesson.set(lessonId, []);
    activitiesByLesson.get(lessonId).push(activity);
  }
  for (const result of lessonResults) {
    const key = `${result.child}:${result.lesson}`;
    if (!resultsByChildLesson.has(key)) resultsByChildLesson.set(key, []);
    resultsByChildLesson.get(key).push(result);
  }
  const earnedStarsByChild = new Map();
  for (const progress of completedProgress) {
    const childId = String(progress.child);
    const lessonId = String(progress.lesson);
    const rating = calculateLessonStars(
      activitiesByLesson.get(lessonId) || [],
      resultsByChildLesson.get(`${childId}:${lessonId}`) || []
    );
    const stars = progress.completionSnapshot?.source === 'STAGES' ? progress.stars : rating.completed ? rating.stars : (progress.stars || 0);
    earnedStarsByChild.set(childId, (earnedStarsByChild.get(childId) || 0) + stars);
  }

  const resultMap = new Map(resultStats.map(x => [String(x._id), x]));
  const progressMap = new Map(progressStats.map(x => [String(x._id), x]));
  const classroomMap = new Map(classroomStats.map(x => [String(x._id), x]));
  const unitMap = new Map(unitStats.map(x => [String(x._id), x]));
  const reviews = await Assignment.find({ 'reviews.child': { $in: ids } }).select('reviews').lean();
  const teacherStarsByChild = new Map();
  for (const assignment of reviews) for (const review of assignment.reviews || []) {
    const id = String(review.child);
    teacherStarsByChild.set(id, (teacherStarsByChild.get(id) || 0) + (review.bonusStars || 0));
  }

  const eventMap = new Map(eventStats.map(row => [String(row._id), row]));
  return ids.map(id => {
    const sid = String(id);
    const r = resultMap.get(sid);
    const p = progressMap.get(sid);
    const c = classroomMap.get(sid);
    const u = unitMap.get(sid);
    const event = eventMap.get(sid);

    // ActivityResult.stars are per-game feedback, not banked Lesson stars.
    const earnedStars = earnedStarsByChild.get(sid) ?? 0;
    const classroomStars = c ? (c.classroomStars || 0) : 0;
    const bonusStars = u ? (u.bonusStars || 0) : 0;
    const teacherStars = teacherStarsByChild.get(sid) || 0;
    const totalStars = earnedStars + classroomStars + bonusStars + teacherStars;

    const overall = combineAssessment([r, c, event]);
    const practice = combineAssessment([r, event]);
    const classroom = combineAssessment([c]);
    const { correctAnswers, answeredCount, averageScore } = practice;
    const completedLessons = p?.completedLessons || 0;
    const attempts = (r?.resultCount || 0) + (event?.attempts || 0);
    const practiceLearningTime = (r?.learningTime || 0) + (event?.learningTime || 0);
    const classroomLearningTime = c?.learningTime || 0;
    const learningTime = practiceLearningTime + classroomLearningTime;

    let lastActivity = r?.lastActivity || p?.lastProgressDate || null;
    if (r?.lastActivity && p?.lastProgressDate) {
      lastActivity = new Date(r.lastActivity) > new Date(p.lastProgressDate) ? r.lastActivity : p.lastProgressDate;
    }

    if (event?.lastActivity && (!lastActivity || new Date(event.lastActivity) > new Date(lastActivity))) lastActivity = event.lastActivity;
    return {
      _id: id,
      averageScore, correctAnswers, answeredCount,
      hasAssessment: answeredCount > 0,
      overallAccuracy: overall.averageScore, overallAnsweredCount: overall.answeredCount,
      practiceAccuracy: practice.averageScore, practiceAnsweredCount: practice.answeredCount, practiceCorrectAnswers: practice.correctAnswers,
      hasPracticeAssessment: practice.answeredCount > 0,
      classroomAccuracy: classroom.averageScore, classroomAnsweredCount: classroom.answeredCount, classroomCorrectAnswers: classroom.correctAnswers,
      hasClassroomAssessment: classroom.answeredCount > 0,
      stars: totalStars,
      totalStars,
      earnedStars,
      classroomStars,
      bonusStars,
      teacherStars,
      completedLessons,
      attempts,
      learningTime,
      practiceLearningTime, classroomLearningTime,
      hasLearningTime: (r?.timedResults || 0) + (event?.timedEvents || 0) + (c?.timedSessions || 0) > 0,
      hasUnmeasuredLearning: (event?.untimedEvents || 0) > 0 || (r?.resultCount || 0) > (r?.timedResults || 0) || (c?.classroomSessions || 0) > (c?.timedSessions || 0),
      lastActivity
    };
  });
};
module.exports = { statsFor, combineAssessment };
