const models = require('../models');
const { computeRewards } = require('../services/rewardService');
const ai = require('../services/aiService');
const gemini = require('../services/geminiProvider');

const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const validBody = (body, keys) => body && typeof body === 'object' && !Array.isArray(body) && Object.keys(body).every(key => keys.includes(key));
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const sameId = (a, b) => String(a?._id || a) === String(b?._id || b);

// Dependency injection keeps API tests isolated from real children's records.
function createAiController({ db = models, rewards = computeRewards, submissions = require('../services/teacherAssignments').submissions, statistics = require('../services/teacherStatistics').statsFor } = {}) {
  const capabilities = (_req, res) => res.json({ success: true, data: { provider: gemini.configuration().enabled ? 'gemini' : 'local', generative: gemini.configuration().enabled, audioCoaching: gemini.configuration().enabled, transcriptMatching: true } });
  const evaluateAudio = async (req, res, next) => {
    try {
      if (!validBody(req.body, ['targetWord', 'ageGroup', 'audioBase64', 'mimeType'])) return fail(res, 400, 'Dữ liệu luyện nói không hợp lệ.');
      const { targetWord, audioBase64, mimeType, ageGroup } = req.body;
      if (typeof targetWord !== 'string' || !ai.normalizeTranscript(targetWord) || targetWord.length > 120 ||
          !['audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4'].includes(mimeType) ||
          typeof audioBase64 !== 'string' || audioBase64.length < 100 || audioBase64.length > 2800000 ||
          audioBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64) ||
          (ageGroup !== undefined && !['3-4', '4-5', '5-6'].includes(ageGroup))) return fail(res, 400, 'Âm thanh không hợp lệ hoặc quá lớn (tối đa 2 MB).');
      const audio = Buffer.from(audioBase64, 'base64');
      if (mimeType !== 'audio/wav' || audio.length > 2 * 1024 * 1024 || audio.subarray(0, 4).toString() !== 'RIFF' || audio.subarray(8, 12).toString() !== 'WAVE') return fail(res, 400, 'Bản ghi cần có định dạng WAV hợp lệ.');
      if (!gemini.configuration().enabled) return fail(res, 503, 'AI âm thanh chưa được cấu hình. Bé vẫn có thể nghe mẫu và luyện nói theo nhận diện từ.');
      try {
        res.json({ success: true, data: await ai.evaluateAudio({ targetWord, audioBase64, mimeType, ageGroup: req.user.role === 'CHILD' ? req.user.ageGroupCode : ageGroup }) });
      } catch { return fail(res, 503, 'Koko chưa nhận được phản hồi AI. Mình nghe mẫu hoặc thử nói lại sau nhé.'); }
    } catch (error) { next(error); }
  };
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
        const assignment = await db.Assignment.findOne({ _id: assignmentId, ...(admin ? {} : { teacher: req.user._id }) }).populate('lesson', 'title');
        if (!assignment) return fail(res, 403, 'You do not have access to this assignment.');
        const member = await db.ClassRoom.exists({ _id: assignment.classRoom, students: child._id, ...(admin ? {} : { teacher: req.user._id }) });
        if (!member || (assignment.recipients !== undefined && !assignment.recipients.some(id => sameId(id, child._id))) || (assignment.assignedToType === 'STUDENT' && !sameId(assignment.student, child._id))) {
          return fail(res, 403, 'This assignment is not assigned to this child.');
        }
        if (assignment.status === 'CANCELLED') return fail(res, 409, 'Bài giao đã được hủy.');
        const { data } = await submissions(assignment, [child]);
        const submission = data[0];
        if (!submission?.hasSubmitted || !sameId(submission.submission?._id, resultId)) return fail(res, 404, 'Matching completed assignment result not found.');
        selectedResult = { ...submission.submission, lesson: assignment.lesson };
      }
      const [rewardState, completedLessons, accuracyRows, latest] = await Promise.all([
        rewards(child._id),
        db.Progress.countDocuments({ child: child._id, completed: true }),
        hasAssignment ? [] : statistics([child._id]),
        hasAssignment ? selectedResult : db.Progress.findOne({ child: child._id }).sort({ lastActivityAt: -1 }).select('lesson').populate('lesson', 'title')
      ]);
      const averageAccuracy = hasAssignment ? ai.answerAccuracy(selectedResult)
        : Number.isFinite(accuracyRows[0]?.averageScore) ? Math.round(accuracyRows[0].averageScore) : null;
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
        'bookLevel', 'unitNumber', 'curriculumUnit', 'teacherRequest', 'reviewMode', 'reviewVocabularyIds', 'gapWords'
      ])) {
        return fail(res, 400, 'Invalid lesson plan request fields.');
      }

      const { lessonId, classroomId, durationMinutes, teachingStyle } = req.body;
      if (req.body.reviewMode !== undefined && typeof req.body.reviewMode !== 'boolean') return fail(res, 400, 'Chế độ ôn tập không hợp lệ.');
      const reviewIds = req.body.reviewVocabularyIds;
      if (reviewIds !== undefined && (!Array.isArray(reviewIds) || reviewIds.length > 12 || new Set(reviewIds).size !== reviewIds.length || reviewIds.some(id => !validId(id)))) return fail(res, 400, 'Danh sách từ cần ôn không hợp lệ.');
      if (req.body.reviewMode && (!validId(classroomId) || !validId(lessonId))) return fail(res, 400, 'Chọn lớp và bài học để soạn giáo án ôn tập.');
      if (durationMinutes !== undefined && (!Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 120)) return fail(res, 400, 'Thời lượng phải từ 10 đến 120 phút.');
      if (teachingStyle !== undefined && !['active_tpr', 'story_song', 'interactive_drills'].includes(teachingStyle)) return fail(res, 400, 'Phong cách dạy không hợp lệ.');
      if (req.body.ageGroup !== undefined && !['3-4', '4-5', '5-6'].includes(req.body.ageGroup)) return fail(res, 400, 'Nhóm tuổi không hợp lệ.');
      if (JSON.stringify(req.body).length > 30000) return fail(res, 400, 'Nội dung giáo án quá dài.');
      if (req.body.teacherRequest !== undefined && (typeof req.body.teacherRequest !== 'string' || req.body.teacherRequest.length > 1000)) return fail(res, 400, 'Yêu cầu thêm tối đa 1000 ký tự.');
      for (const key of ['lessonTitle', 'targetTopic']) if (req.body[key] !== undefined && (typeof req.body[key] !== 'string' || req.body[key].length > 200)) return fail(res, 400, 'Tên bài/chủ đề không hợp lệ.');
      for (const key of ['vocabularyList', 'sentencePatterns']) if (req.body[key] !== undefined && (!Array.isArray(req.body[key]) || req.body[key].length > 50 || req.body[key].some(item => !item || typeof item !== 'object' || Array.isArray(item) || typeof item.english !== 'string' || item.english.length > 200 || ['vietnamese','pronunciation'].some(field => item[field] !== undefined && typeof item[field] !== 'string')))) return fail(res, 400, 'Danh sách từ/mẫu câu không hợp lệ.');
      const admin = req.user.role === 'ADMIN';

      let targetAge = req.body.ageGroup || '3-4';
      let title = req.body.lessonTitle || 'English Fun';
      let topic = req.body.targetTopic || 'General';
      let vocab = Array.isArray(req.body.vocabularyList) ? req.body.vocabularyList : [];
      let sentences = Array.isArray(req.body.sentencePatterns) ? req.body.sentencePatterns : [];

      let selectedClassroom = null;
      let reviewFocus = [];
      if (classroomId) {
        if (!validId(classroomId)) return fail(res, 400, 'Invalid classroomId format.');
        const classroom = await db.ClassRoom.findOne({
          _id: classroomId,
          deletionPending: { $ne: true },
          ...(admin ? {} : { teacher: req.user._id })
        }).select('ageGroupCode curriculumBook name students');
        if (!classroom) return fail(res, 403, 'You do not have access to this classroom.');
        if (classroom.ageGroupCode) targetAge = classroom.ageGroupCode;
        selectedClassroom = classroom;
      }

      if (lessonId) {
        if (!validId(lessonId)) return fail(res, 400, 'Invalid lessonId format.');
        const lesson = await db.Lesson.findOne({ _id: lessonId, status: 'ACTIVE' })
          .populate('vocabularyItems', 'english vietnamese pronunciation status')
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
        let lessonWords = (lesson.vocabularyItems || []).filter(word => word && !['INACTIVE', 'HIDDEN', 'DRAFT'].includes(word.status));
        if (req.body.reviewMode) {
          const report = await require('../services/classLearningGaps').buildReport(db, selectedClassroom);
          const raw = Array.isArray(req.body.gapWords) ? req.body.gapWords : typeof req.body.gapWords === 'string' ? req.body.gapWords.split(',') : [];
          const names = raw.map(word => String(word).trim().toLowerCase()).filter(Boolean);
          reviewFocus = report.gaps.filter(gap => reviewIds?.length ? reviewIds.includes(gap.vocabularyId) : names.length ? names.includes(gap.english.toLowerCase()) : lessonWords.some(word => String(word._id) === gap.vocabularyId));
          if (!reviewFocus.length || reviewIds?.some(id => !reviewFocus.some(gap => gap.vocabularyId === id)) || names.some(name => !reviewFocus.some(gap => gap.english.toLowerCase() === name))) return fail(res, 409, 'Review evidence changed. Refresh the class analysis.');
          lessonWords = await db.Vocabulary.find({ _id: { $in: reviewFocus.map(gap => gap.vocabularyId) }, status: 'ACTIVE' }).select('english vietnamese pronunciation').lean();
        }
        vocab = lessonWords.map(word => ({ english: word.english, vietnamese: word.vietnamese, pronunciation: word.pronunciation }));
        if (lesson.languageContents?.length > 0) {
          sentences = lesson.languageContents.map(l => ({
            english: l.english,
            vietnamese: l.vietnamese
          }));
        }
      }

      const generated = await ai.generateLessonPlanWithAI({
        ageGroup: targetAge,
        lessonTitle: title,
        targetTopic: topic,
        durationMinutes: Number(durationMinutes) || 25,
        vocabularyList: vocab,
        sentencePatterns: sentences,
        teachingStyle: teachingStyle || 'active_tpr',
        teacherRequest: req.body.teacherRequest || ''
      });

      const plan = reviewFocus.length ? ai.applyReviewFocus(generated, reviewFocus) : generated;
      res.json({ success: true, data: plan });
    } catch (error) { next(error); }
  };

  // §3.7 — Class-wide vocabulary gap detector (rule-based, no external AI).
  const detectClassGaps = async (req, res, next) => {
    try {
      const { classRoomId, lessonId } = req.query;
      if (!validId(classRoomId)) return fail(res, 400, 'A valid classRoomId is required.');
      if (lessonId !== undefined && lessonId !== '' && !validId(lessonId)) return fail(res, 400, 'Invalid lessonId format.');
      const admin = req.user.role === 'ADMIN';
      const classroom = await db.ClassRoom.findOne({
        _id: classRoomId,
        deletionPending: { $ne: true },
        ...(admin ? {} : { teacher: req.user._id })
      }).select('name students ageGroupCode curriculumBook');
      if (!classroom) return fail(res, 403, 'You do not have access to this classroom.');
      const studentIds = classroom.students || [];
      if (studentIds.length === 0) return fail(res, 404, 'Lớp chưa có học sinh nào.');
      const data = await require('../services/classLearningGaps').buildReport(db, classroom, lessonId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };

  return { capabilities, evaluateAudio, generateParentNote, evaluatePronunciation, generateLessonPlan, detectClassGaps };
}
module.exports = { ...createAiController(), createAiController };
