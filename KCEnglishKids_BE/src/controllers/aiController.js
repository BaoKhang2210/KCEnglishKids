const mongoose = require('mongoose');
const models = require('../models');
const { computeRewards } = require('../services/rewardService');
const ai = require('../services/aiService');

const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const validBody = (body, keys) => body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).every(key => keys.includes(key));
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const sameId = (a, b) => String(a?._id || a) === String(b?._id || b);

// Dependency injection keeps API tests isolated from real children's records.
function createAiController({ db = models, rewards = computeRewards } = {}) {
  const generateParentNote = async (req, res, next) => {
    try {
      if (!validBody(req.body, ['childId', 'assignmentId', 'resultId'])) return fail(res, 400, 'Invalid note request fields.');
      const { childId, assignmentId, resultId } = req.body;
      const hasAssignment = assignmentId !== undefined || resultId !== undefined;
      if (!validId(childId) || (hasAssignment && (!validId(assignmentId) || !validId(resultId)))) {
        return fail(res, 400, 'Valid childId and paired assignmentId/resultId are required.');
      }
      const child = await db.User.findOne({ _id: childId, role: 'CHILD', status: 'ACTIVE' })
        .select('name ageGroupCode assignedClass streak lastActiveDate');
      if (!child) return fail(res, 404, 'Active child not found.');
      const admin = req.user.role === 'ADMIN';
      if (!admin && !await db.ClassRoom.exists({ teacher: req.user._id, students: child._id, status: 'ACTIVE' })) {
        return fail(res, 403, 'You do not have access to this child.');
      }
      let selectedResult = null;
      if (hasAssignment) {
        const assignment = await db.Assignment.findOne({ _id: assignmentId, ...(admin ? {} : { teacher: req.user._id }) })
          .select('teacher classRoom assignedToType student lesson activity');
        if (!assignment) return fail(res, 403, 'You do not have access to this assignment.');
        const member = await db.ClassRoom.exists({ _id: assignment.classRoom, students: child._id, ...(admin ? {} : { teacher: req.user._id }) });
        if (!member || (assignment.assignedToType === 'STUDENT' && !sameId(assignment.student, child._id))) {
          return fail(res, 403, 'This assignment is not assigned to this child.');
        }
        selectedResult = await db.ActivityResult.findOne({
          _id: resultId, child: child._id, lesson: assignment.lesson,
          ...(assignment.activity ? { activity: assignment.activity } : {})
        }).select('correctCount incorrectCount lesson').populate('lesson', 'title');
        if (!selectedResult) return fail(res, 404, 'Matching assignment result not found.');
      }
      const [rewardState, completedLessons, accuracyRows, latest] = await Promise.all([
        rewards(child._id),
        db.Progress.countDocuments({ child: child._id, completed: true }),
        hasAssignment ? [] : db.ActivityResult.aggregate([
          { $match: { child: new mongoose.Types.ObjectId(childId), correctCount: { $gte: 0 }, incorrectCount: { $gte: 0 } } },
          { $project: { correctCount: 1, total: { $add: ['$correctCount', '$incorrectCount'] } } },
          { $match: { total: { $gt: 0 } } },
          { $group: { _id: null, accuracy: { $avg: { $multiply: [{ $divide: ['$correctCount', '$total'] }, 100] } } } }
        ]),
        hasAssignment ? selectedResult : db.Progress.findOne({ child: child._id }).sort({ lastActivityAt: -1 }).select('lesson').populate('lesson', 'title')
      ]);
      const averageAccuracy = hasAssignment ? ai.answerAccuracy(selectedResult)
        : Number.isFinite(accuracyRows[0]?.accuracy) ? Math.round(accuracyRows[0].accuracy) : null;
      const facts = {
        studentName: child.name, ageGroup: child.ageGroupCode || null,
        scope: hasAssignment ? 'assignment' : 'all_time', averageAccuracy,
        totalStars: rewardState.totalStars, completedLessons,
        streak: ai.currentStreak(child), recentLesson: latest?.lesson?.title || null
      };
      res.json({ success: true, data: await ai.generateParentNote(facts) });
    } catch (error) { next(error); }
  };

  const evaluatePronunciation = (req, res, next) => {
    try {
      if (!validBody(req.body, ['targetWord', 'spokenTranscript', 'ageGroup'])) return fail(res, 400, 'Invalid speaking request fields.');
      const { targetWord, spokenTranscript, ageGroup } = req.body;
      if (typeof targetWord !== 'string' || !ai.normalizeTranscript(targetWord) || targetWord.length > 120 ||
          typeof spokenTranscript !== 'string' || spokenTranscript.length > 240 ||
          (ageGroup !== undefined && !['3-4', '4-5', '5-6'].includes(ageGroup))) {
        return fail(res, 400, 'Provide a target up to 120 characters, transcript up to 240, and a valid age group.');
      }
      const effectiveAge = req.user.role === 'CHILD' ? req.user.ageGroupCode : ageGroup;
      res.json({ success: true, data: ai.evaluatePronunciation({ targetWord, spokenTranscript, ageGroup: effectiveAge }) });
    } catch (error) { next(error); }
  };
  return { generateParentNote, evaluatePronunciation };
}
module.exports = { ...createAiController(), createAiController };
