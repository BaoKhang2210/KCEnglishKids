const { ActivityResult, Activity } = require('../models');
const { idOf, accuracy } = require('./teacherRules');
const { resolveLessonStars } = require('./starLedgerService');
const recipients = (assignment, room) => assignment.recipients !== undefined
  ? assignment.recipients.map(idOf)
  : assignment.assignedToType === 'STUDENT' ? [idOf(assignment.student)] : (room.students || []).map(idOf);
const resultQuery = (assignment, child) => ({
  child, lesson: assignment.lesson?._id || assignment.lesson, completed: true,
  ...(assignment.activity ? { activity: assignment.activity?._id || assignment.activity } : {}),
  createdAt: { $gte: new Date(Math.max(new Date(assignment.createdAt).getTime(), assignment.startDate ? new Date(assignment.startDate).getTime() : 0)) }
});
async function submissions(assignment, students) {
  const activities = assignment.contentSnapshot || await Activity.find({ lesson: assignment.lesson?._id || assignment.lesson, ...(assignment.activitySnapshot !== undefined ? {} : { status: 'ACTIVE' }),
    ...(assignment.activitySnapshot !== undefined ? { _id: { $in: assignment.activitySnapshot } }
      : assignment.activity ? { _id: assignment.activity?._id || assignment.activity } : {}) }).select('title questions questionCount pointsPerQuestion').lean();
  const results = await ActivityResult.find(resultQuery(assignment, { $in: students.map(s => s._id || s) }))
    .populate('child', 'name username avatar avatarUrl').populate('answers.vocabularyId', 'english vietnamese imageUrl pronunciation')
    .sort({ createdAt: -1, _id: -1 }).lean();
  const minigameRows = assignment.completionMode === 'MINIGAME' && assignment.minigameId ? await require('../models/LearningEvent').find({
    child: { $in: students.map(s => s._id || s) },
    lesson: assignment.lesson?._id || assignment.lesson,
    stage: 3,
    gameId: assignment.minigameId,
    createdAt: resultQuery(assignment, null).createdAt
  }).sort({ createdAt: -1 }).lean() : [];
  const stageRows = assignment.completionMode === 'LESSON' && !assignment.activity ? await require('../models/LearningEvent').find({
    child: { $in: students.map(s => s._id || s) }, lesson: assignment.lesson?._id || assignment.lesson,
    lessonCompleted: true, createdAt: resultQuery(assignment, null).createdAt
  }).sort({createdAt:-1}).lean() : [];
  const stageProgress = stageRows.length ? await require('../models').Progress.find({child:{$in:students.map(s=>s._id||s)},lesson:assignment.lesson?._id||assignment.lesson}).lean() : [];
  const practiceRows=stageRows.length?await require('../models/LearningEvent').find({child:{$in:students.map(s=>s._id||s)},lesson:assignment.lesson?._id||assignment.lesson,stage:2}).sort({createdAt:-1}).lean():[];
  const data = students.map(student => {
    if (assignment.completionMode === 'MINIGAME' && assignment.minigameId) {
      const mgEvent = minigameRows.find(row => idOf(row.child) === idOf(student));
      const mgAnswers = (mgEvent?.answers || []).map((answer, idx) => ({
        ...answer,
        promptText: `Mục tiêu #${idx + 1} (${assignment.minigameId})`,
        vocabularyId: { _id: answer.wordId, english: answer.english, vietnamese: answer.vietnamese, imageUrl: answer.imageUrl }
      }));
      return {
        student,
        hasSubmitted: Boolean(mgEvent),
        submission: mgEvent ? {
          _id: mgEvent._id,
          source: 'STAGES',
          completed: true,
          score: mgEvent.score ?? 100,
          stars: 3,
          correctCount: mgAnswers.filter(a => a.isCorrect).length,
          incorrectCount: mgAnswers.filter(a => !a.isCorrect).length,
          answers: mgAnswers,
          submittedAt: mgEvent.createdAt,
          createdAt: mgEvent.createdAt,
          teacherFeedback: assignment.reviews?.find(review => idOf(review.child) === idOf(student)) || null
        } : null
      };
    }
    const event = stageRows.find(row => idOf(row.child) === idOf(student));
    const progress = stageProgress.find(row => idOf(row.child) === idOf(student));
    const practice=event&&practiceRows.find(row=>idOf(row.child)===idOf(student)&&new Date(row.createdAt)<=new Date(event.createdAt));
    const answers=(practice?.answers||[]).map(answer=>({...answer,promptText:'Vòng '+answer.round,vocabularyId:{_id:answer.wordId,english:answer.english,vietnamese:answer.vietnamese,imageUrl:answer.imageUrl}}));
    if (event && progress?.stage3Completed) return { student, hasSubmitted:true, submission:{
      _id:event._id, source:'STAGES', completed:true, score:practice?.score ?? progress.stage2Score, stars:resolveLessonStars(progress),
      correctCount:answers.filter(a=>a.isCorrect).length, incorrectCount:answers.filter(a=>!a.isCorrect).length,
      answers, submittedAt:event.createdAt, createdAt:event.createdAt,
      teacherFeedback:assignment.reviews?.find(review=>idOf(review.child)===idOf(student))||null
    }};

    const childId = idOf(student);
    const own = results.filter(row => idOf(row.child) === childId && activities.some(activity => idOf(activity) === idOf(row.activity)));
    const latest = activities.map(activity => ({ activity, row: own.find(row => idOf(row.activity) === idOf(activity)) }));
    const completed = latest.length > 0 && latest.every(item => item.row);
    const rows = latest.map(item => item.row).filter(Boolean);
    const last = own[0];
    const percentages = latest.filter(item => item.row).map(({ activity, row }) => {
      const responseAccuracy = accuracy(row);
      const max = (activity.questions?.length || activity.questionCount || 1) * (activity.pointsPerQuestion || 10);
      return responseAccuracy ?? Math.min(100, Math.round(100 * Math.max(0, row.score || 0) / max));
    });
    return { student, hasSubmitted: completed, submission: last ? {
      ...last, completed, score: percentages.length ? Math.round(percentages.reduce((n, v) => n + v, 0) / percentages.length) : 0,
      stars: rows.reduce((n, row) => n + (row.stars || 0), 0),
      correctCount: rows.reduce((n, row) => n + (row.correctCount || 0), 0),
      incorrectCount: rows.reduce((n, row) => n + (row.incorrectCount || 0), 0),
      duration: rows.reduce((n, row) => n + (row.duration || 0), 0),
      answers: rows.flatMap(row => (row.answers || []).map(answer => ({ ...answer, activityId: idOf(row.activity),
        activityTitle: activities.find(activity => idOf(activity) === idOf(row.activity))?.title || '' }))),
      submittedAt: last.createdAt,
      teacherFeedback: assignment.reviews?.find(review => idOf(review.child) === childId)
        || (idOf(last.teacherFeedback?.teacher) === idOf(assignment.teacher) && last.teacherFeedback?.reviewedAt ? last.teacherFeedback : null)
    } : null };
  });
  return { data, results };
}
async function currentForChild(child) {
  const M = require('../models');
  if (!child?.assignedClass) return null;
  const room = await M.ClassRoom.findById(child.assignedClass).lean();
  if (!room || room.status !== 'ACTIVE' || !room.teacher || !room.students?.some(student => idOf(student) === idOf(child))) return null;
  const items = await M.Assignment.find({ teacher: room.teacher, classRoom: room._id, status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
    $and: [
      { $or: [{ recipients: child._id }, { recipients: { $exists: false }, assignedToType: 'CLASS' }, { recipients: { $exists: false }, student: child._id }] },
      { $or: [{ startDate: null }, { startDate: { $lte: new Date() } }] },
    ]
  }).populate('lesson', 'title vietnameseTitle status ageGroupCode').populate('activity', 'title status').sort({ createdAt: -1 }).lean();
  for (const item of items) {
    if (!item.lesson || item.lesson.status !== 'ACTIVE' || item.lesson.ageGroupCode !== child.ageGroupCode || (item.activity && item.activity.status !== 'ACTIVE')) continue;
    const { data } = await submissions(item, [child]);
    if (data[0]?.hasSubmitted) continue;
    return { _id: item._id, lessonId: idOf(item.lesson), activityId: item.activity ? idOf(item.activity) : null,
      lessonTitle: item.lesson.vietnameseTitle || item.lesson.title, instructions: item.instructions || '', dueDate: item.dueDate };
  }
  return null;
}
module.exports = { recipients, resultQuery, submissions, currentForChild };
