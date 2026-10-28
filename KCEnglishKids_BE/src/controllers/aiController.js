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

  const generateLessonPlan = async (req, res, next) => {
    try {
      if (!validBody(req.body, [
        'lessonId', 'classroomId', 'durationMinutes', 'teachingStyle',
        'ageGroup', 'lessonTitle', 'targetTopic', 'vocabularyList', 'sentencePatterns',
        'bookLevel', 'unitNumber', 'curriculumUnit'
      ])) {
        return fail(res, 400, 'Invalid lesson plan request fields.');
      }

      const { lessonId, classroomId, durationMinutes, teachingStyle } = req.body;
      const admin = req.user.role === 'ADMIN';

      let targetAge = req.body.ageGroup || '3-4';
      let title = req.body.lessonTitle || 'English Fun';
      let topic = req.body.targetTopic || 'General';
      let vocab = Array.isArray(req.body.vocabularyList) ? req.body.vocabularyList : [];
      let sentences = Array.isArray(req.body.sentencePatterns) ? req.body.sentencePatterns : [];

      if (classroomId) {
        if (!validId(classroomId)) return fail(res, 400, 'Invalid classroomId format.');
        const classroom = await db.ClassRoom.findOne({
          _id: classroomId,
          deletionPending: { $ne: true },
          ...(admin ? {} : { teacher: req.user._id })
        }).select('ageGroupCode name');
        if (!classroom) return fail(res, 403, 'You do not have access to this classroom.');
        if (classroom.ageGroupCode) targetAge = classroom.ageGroupCode;
      }

      if (lessonId) {
        if (!validId(lessonId)) return fail(res, 400, 'Invalid lessonId format.');
        const lesson = await db.Lesson.findOne({ _id: lessonId, status: 'ACTIVE' })
          .populate('vocabularyItems', 'english vietnamese pronunciation')
          .populate({ path: 'languageContents', select: 'english vietnamese', match: { status: 'ACTIVE' } })
          .populate('topic', 'englishName vietnameseName title name');
        if (!lesson) return fail(res, 404, 'Lesson not found.');
        if (classroomId && lesson.ageGroupCode && lesson.ageGroupCode !== targetAge) return fail(res, 400, 'Lesson age group does not match the classroom.');

        title = lesson.title;
        if (lesson.topic) {
          topic = lesson.topic.englishName || lesson.topic.vietnameseName || lesson.topic.title || lesson.topic.name || topic;
        }
        if (lesson.ageGroupCode && !classroomId) {
          targetAge = lesson.ageGroupCode;
        }
        if (lesson.vocabularyItems?.length > 0) {
          vocab = lesson.vocabularyItems.map(v => ({
            english: v.english,
            vietnamese: v.vietnamese,
            pronunciation: v.pronunciation
          }));
        }
        if (lesson.languageContents?.length > 0) {
          sentences = lesson.languageContents.map(l => ({
            english: l.english,
            vietnamese: l.vietnamese
          }));
        }
      }

      const plan = ai.generateLessonPlan({
        ageGroup: targetAge,
        lessonTitle: title,
        targetTopic: topic,
        durationMinutes: Number(durationMinutes) || 25,
        vocabularyList: vocab,
        sentencePatterns: sentences,
        teachingStyle: teachingStyle || 'active_tpr'
      });

      res.json({ success: true, data: plan });
    } catch (error) { next(error); }
  };

  return { generateParentNote, evaluatePronunciation, generateLessonPlan };
}
module.exports = { ...createAiController(), createAiController };
