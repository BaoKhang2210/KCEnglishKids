const mongoose = require('mongoose');
const {
  ClassroomSession,
  ClassRoom,
  User,
  Lesson,
  Activity,
  VocabularyMastery,
  Attendance
} = require('../models');
const aiService = require('../services/aiService');

const validId = (id) => mongoose.isValidObjectId(id);
const bad = (res, msg) => res.status(400).json({ success: false, message: msg });
const notFound = (res, msg = 'Not found.') =>
  res.status(404).json({ success: false, message: msg });
const forbidden = (res, msg = 'Access denied.') =>
  res.status(403).json({ success: false, message: msg });

// Helper — ensure teacher owns this session
const ownSession = async (req, sessionId) => {
  if (!validId(sessionId)) return null;
  const query =
    req.user.role === 'ADMIN'
      ? { _id: sessionId }
      : { _id: sessionId, teacher: req.user._id };
  return ClassroomSession.findOne(query);
};

// Helper — get class and verify teacher owns it
const ownClass = async (req, classId) => {
  if (!validId(classId)) return null;
  const query =
    req.user.role === 'ADMIN'
      ? { _id: classId }
      : { _id: classId, teacher: req.user._id };
  return ClassRoom.findOne(query);
};

const computeSessionSummary = (session) => {
  const scores = session.studentScores || [];
  const participated = scores.filter(
    (s) => s.correctCount + s.incorrectCount > 0
  );
  const totalAnswered = participated.reduce(
    (n, s) => n + s.correctCount + s.incorrectCount,
    0
  );
  const totalCorrect = participated.reduce(
    (n, s) => n + s.correctCount,
    0
  );
  const avgAccuracy =
    totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : 0;

  const needsPractice = scores
    .filter((s) => {
      const ans = s.correctCount + s.incorrectCount;
      if (ans === 0) return true;
      return s.correctCount / ans < 0.5;
    })
    .map((s) => s.student);

  const top = [...scores]
    .sort((a, b) => b.stars - a.stars || b.points - a.points)
    .slice(0, 3)
    .map((s) => s.student);

  session.summary = {
    participationCount: participated.length,
    averageAccuracy: avgAccuracy,
    totalStars: scores.reduce((n, s) => n + s.stars, 0),
    totalPoints: scores.reduce((n, s) => n + s.points, 0),
    studentsNeedingPractice: needsPractice,
    topPerformers: top
  };

  for (const s of session.studentScores) {
    const ans = s.correctCount + s.incorrectCount;
    if (ans === 0) {
      s.status = 'ACTIVE';
    } else {
      const acc = s.correctCount / ans;
      s.status = acc >= 0.8 ? 'COMPLETED' : acc < 0.5 ? 'NEEDS_PRACTICE' : 'ACTIVE';
    }
  }
};

const autoEndOverdueLiveSessions = async (teacherFilter = {}) => {
  try {
    const now = Date.now();
    const liveSessions = await ClassroomSession.find({
      status: 'LIVE',
      ...teacherFilter
    });

    for (const session of liveSessions) {
      const plannedMin = Number(session.plannedDuration) || 45;
      // Allow plannedDuration + 30 minutes leeway, max 90 minutes
      const maxAllowedMs = Math.max(plannedMin + 30, 75) * 60 * 1000;
      const startMs = new Date(session.startedAt || session.createdAt).getTime();

      if (now - startMs > maxAllowedMs) {
        session.status = 'COMPLETED';
        session.endedAt = new Date(startMs + plannedMin * 60 * 1000);
        computeSessionSummary(session);
        await session.save();
      }
    }
  } catch (err) {
    console.warn('Auto-end overdue sessions warning:', err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher/classroom-sessions
// List sessions for the logged-in teacher (or all for ADMIN)
// ─────────────────────────────────────────────────────────────────────────────
exports.getSessions = async (req, res, next) => {
  try {
    const teacherFilter = req.user.role === 'ADMIN' ? {} : { teacher: req.user._id };

    // Auto cleanup stale/inactive sessions and auto-complete overdue LIVE sessions
    await autoEndOverdueLiveSessions(teacherFilter);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deleteFilter = {
      status: 'SCHEDULED',
      updatedAt: { $lt: twentyFourHoursAgo },
      ...teacherFilter
    };
    await ClassroomSession.deleteMany(deleteFilter);

    const q = req.user.role === 'ADMIN' ? {} : { teacher: req.user._id };
    if (req.query.status) q.status = req.query.status;
    if (req.query.classroomId) q.classroom = req.query.classroomId;

    const sessions = await ClassroomSession.find(q)
      .populate('classroom', 'name ageGroupCode teacher')
      .populate('teacher', 'name avatar avatarUrl')
      .populate({
        path: 'lesson',
        select: 'title vietnameseTitle displayOrder curriculumUnits',
        populate: {
          path: 'curriculumUnits',
          select: 'bookNumber unitNumber title vietnameseTitle theme'
        }
      })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher/classroom-sessions
// Create a new classroom session (status = SCHEDULED)
// Body: { classroomId, lessonId?, title?, activityIds?, plannedDuration? }
// ─────────────────────────────────────────────────────────────────────────────
exports.createSession = async (req, res, next) => {
  try {
    const classroomId = req.body.classroomId || req.body.classRoomId;
    const { lessonId, title, activityIds, plannedDuration, sessionNumber, includeWarmup, lessonPlan } = req.body;

    if (!validId(classroomId))
      return bad(res, 'Valid classroomId is required.');

    const classroom = await ownClass(req, classroomId);
    if (!classroom)
      return forbidden(res, 'You do not have access to this classroom.');

    // Verify lesson exists (optional)
    let lesson = null;
    let initialPlan = lessonPlan || null;
    if (lessonId) {
      if (!validId(lessonId)) return bad(res, 'Invalid lessonId.');
      lesson = await Lesson.findOne({ _id: lessonId, status: 'ACTIVE' })
        .populate('vocabularyItems', 'english vietnamese pronunciation')
        .populate('languageContents', 'english vietnamese')
        .populate('topic', 'englishName vietnameseName title name');
      if (!lesson) return bad(res, 'Lesson not found or inactive.');

      if (!initialPlan) {
        try {
          const topicName = lesson.topic?.englishName || lesson.topic?.vietnameseName || lesson.topic?.title || 'General';
          initialPlan = aiService.generateLessonPlan({
            ageGroup: classroom.ageGroupCode || lesson.ageGroupCode || '3-4',
            lessonTitle: lesson.title,
            targetTopic: topicName,
            durationMinutes: plannedDuration === 15 ? 15 : plannedDuration === 35 ? 35 : 25,
            vocabularyList: lesson.vocabularyItems || [],
            sentencePatterns: lesson.languageContents || [],
            teachingStyle: 'active_tpr'
          });
        } catch (err) {
          console.warn('Could not auto-generate plan for session:', err);
        }
      }
    }

    // Validate activity IDs (optional)
    let resolvedActivities = [];
    if (Array.isArray(activityIds) && activityIds.length > 0) {
      const validIds = activityIds.filter(validId);
      resolvedActivities = await Activity.find({
        _id: { $in: validIds },
        status: 'ACTIVE'
      }).select('_id');
      resolvedActivities = resolvedActivities.map((a) => a._id);
    }

    // Initialise per-student score rows with attendance from pre-session check-in
    const attendanceMap = new Map();
    if (Array.isArray(req.body.attendanceRecords) && req.body.attendanceRecords.length > 0) {
      req.body.attendanceRecords.forEach((r) => {
        const sId = String(r.student?._id || r.student || r.studentId || '');
        if (sId) {
          attendanceMap.set(sId, ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'].includes(r.status) ? r.status : 'PRESENT');
        }
      });

      // Also persist to Attendance collection for today
      try {
        const todayStr = req.body.attendanceDate || new Date().toISOString().split('T')[0];
        const validRecs = req.body.attendanceRecords.map((r) => ({
          student: r.student?._id || r.student || r.studentId,
          status: ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'].includes(r.status) ? r.status : 'PRESENT',
          note: String(r.note || '').trim()
        }));
        await Attendance.findOneAndUpdate(
          { classroom: classroomId, date: todayStr },
          {
            classroom: classroomId,
            teacher: req.user._id,
            date: todayStr,
            records: validRecs,
            note: req.body.attendanceNote || ''
          },
          { upsert: true, new: true, runValidators: true }
        );
      } catch (attErr) {
        console.warn('Could not auto-sync attendance on session create:', attErr);
      }
    }

    const studentScores = classroom.students.map((s) => {
      const sId = String(s._id || s);
      const att = attendanceMap.get(sId) || 'PRESENT';
      return {
        student: s,
        points: 0,
        stars: 0,
        correctCount: 0,
        incorrectCount: 0,
        notAnswered: 0,
        attendance: att,
        status: 'ACTIVE'
      };
    });

    const session = await ClassroomSession.create({
      classroom: classroomId,
      teacher: req.user._id,
      lesson: lessonId || null,
      title: title || (lesson ? lesson.title : 'Classroom Session'),
      ageGroup: classroom.ageGroupCode || '5-6',
      status: 'SCHEDULED',
      plannedDuration: plannedDuration || 45,
      sessionNumber: Number(sessionNumber) || 1,
      includeWarmup: includeWarmup !== false,
      activities: resolvedActivities,
      currentActivityIndex: 0,
      lessonPlan: initialPlan,
      studentScores
    });

    await session.populate('classroom', 'name ageGroupCode students');
    await session.populate('lesson', 'title');

    res.status(201).json({ success: true, data: session });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher/classroom-sessions/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getSession = async (req, res, next) => {
  try {
    const session = await ownSession(req, req.params.id);
    if (!session) return notFound(res, 'Session not found.');

    // Auto-complete if session was LIVE and has exceeded maximum allowed duration
    if (session.status === 'LIVE') {
      const plannedMin = Number(session.plannedDuration) || 45;
      const maxAllowedMs = Math.max(plannedMin + 30, 75) * 60 * 1000;
      const startMs = new Date(session.startedAt || session.createdAt).getTime();
      if (Date.now() - startMs > maxAllowedMs) {
        session.status = 'COMPLETED';
        session.endedAt = new Date(startMs + plannedMin * 60 * 1000);
        computeSessionSummary(session);
        await session.save();
      }
    }

    await session.populate('classroom', 'name ageGroupCode');
    await session.populate('teacher', 'name avatar avatarUrl');
    await session.populate({
      path: 'lesson',
      select: 'title vietnameseTitle description vocabularyItems topic curriculumUnits',
      populate: [
        {
          path: 'vocabularyItems',
          select: 'word english vietnamese pronunciation audioUrl imageUrl category'
        },
        {
          path: 'curriculumUnits',
          select: 'unitNumber bookNumber bigQuestion title'
        },
        {
          path: 'topic',
          select: 'englishName vietnameseName'
        }
      ]
    });
    await session.populate('activities', 'title activityType questionCount questions');
    await session.populate('studentScores.student', 'name avatar avatarUrl ageGroupCode');

    res.json({ success: true, data: session });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher/classroom-sessions/:id/start
// Set status → LIVE, record startedAt
// ─────────────────────────────────────────────────────────────────────────────
exports.startSession = async (req, res, next) => {
  try {
    const session = await ownSession(req, req.params.id);
    if (!session) return notFound(res, 'Session not found.');
    if (session.status === 'COMPLETED')
      return bad(res, 'This session has already ended.');

    session.status = 'LIVE';
    if (!session.startedAt) session.startedAt = new Date();
    await session.save();

    res.json({ success: true, data: session });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher/classroom-sessions/:id/end
// Set status → COMPLETED, generate summary
// ─────────────────────────────────────────────────────────────────────────────
exports.endSession = async (req, res, next) => {
  try {
    const session = await ownSession(req, req.params.id);
    if (!session) return notFound(res, 'Session not found.');
    if (session.status === 'COMPLETED') {
      await session.populate('studentScores.student', 'name avatar avatarUrl');
      await session.populate('summary.studentsNeedingPractice', 'name avatar');
      await session.populate('summary.topPerformers', 'name avatar');
      return res.json({ success: true, data: session, message: 'Session is already completed.' });
    }

    session.status = 'COMPLETED';
    session.endedAt = new Date();

    computeSessionSummary(session);
    await session.save();

    await session.populate('studentScores.student', 'name avatar avatarUrl');
    await session.populate('summary.studentsNeedingPractice', 'name avatar');
    await session.populate('summary.topPerformers', 'name avatar');

    res.json({ success: true, data: session });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher/classroom-sessions/:id/score-student
// Give points / stars to a student in the session
// Body: { studentId, points?, stars?, correctDelta?, incorrectDelta? }
// ─────────────────────────────────────────────────────────────────────────────
exports.scoreStudent = async (req, res, next) => {
  try {
    const session = await ownSession(req, req.params.id);
    if (!session) return notFound(res, 'Session not found.');
    if (session.status === 'COMPLETED')
      return bad(res, 'Cannot score students after session ends.');

    const { studentId, points = 0, stars = 0, correctDelta = 0, incorrectDelta = 0 } =
      req.body;
    if (!validId(studentId)) return bad(res, 'Valid studentId is required.');

    const scoreRow = session.studentScores.find(
      (s) => String(s.student) === String(studentId)
    );
    if (!scoreRow) return bad(res, 'Student is not in this session.');

    // Apply deltas
    if (points) scoreRow.points = Math.max(0, scoreRow.points + Number(points));
    if (stars) scoreRow.stars = Math.max(0, scoreRow.stars + Number(stars));
    if (correctDelta) scoreRow.correctCount = Math.max(0, scoreRow.correctCount + Number(correctDelta));
    if (incorrectDelta) scoreRow.incorrectCount = Math.max(0, scoreRow.incorrectCount + Number(incorrectDelta));

    // Mark session as modified (nested array)
    session.markModified('studentScores');
    await session.save();

    res.json({
      success: true,
      data: {
        studentId,
        points: scoreRow.points,
        stars: scoreRow.stars,
        correctCount: scoreRow.correctCount,
        incorrectCount: scoreRow.incorrectCount
      }
    });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher/classroom-sessions/:id/score-bulk
// Give points / stars to multiple students at once
// Body: { studentIds: string[], points?, stars?, correctDelta?, incorrectDelta? }
// ─────────────────────────────────────────────────────────────────────────────
exports.scoreBulk = async (req, res, next) => {
  try {
    const session = await ownSession(req, req.params.id);
    if (!session) return notFound(res, 'Session not found.');
    if (session.status === 'COMPLETED')
      return bad(res, 'Cannot score students after session ends.');

    const { studentIds = [], points = 0, stars = 0, correctDelta = 0, incorrectDelta = 0 } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return bad(res, 'studentIds array is required.');
    }

    const updated = [];
    studentIds.forEach((sid) => {
      const scoreRow = session.studentScores.find(
        (s) => String(s.student._id || s.student) === String(sid)
      );
      if (scoreRow) {
        if (points) scoreRow.points = Math.max(0, scoreRow.points + Number(points));
        if (stars) scoreRow.stars = Math.max(0, scoreRow.stars + Number(stars));
        if (correctDelta) scoreRow.correctCount = Math.max(0, scoreRow.correctCount + Number(correctDelta));
        if (incorrectDelta) scoreRow.incorrectCount = Math.max(0, scoreRow.incorrectCount + Number(incorrectDelta));
        updated.push({
          studentId: sid,
          points: scoreRow.points,
          stars: scoreRow.stars,
          correctCount: scoreRow.correctCount
        });
      }
    });

    session.markModified('studentScores');
    await session.save();

    res.json({
      success: true,
      count: updated.length,
      data: updated
    });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher/classroom-sessions/:id/question-result
// Record answer results for a question (for the student grid view)
// Body: { activityId, questionIndex, promptText?, promptImageUrl?,
//         studentAnswers: [{ studentId, result: 'CORRECT'|'INCORRECT'|'NOT_ANSWERED' }] }
// ─────────────────────────────────────────────────────────────────────────────
exports.recordQuestionResult = async (req, res, next) => {
  try {
    const session = await ownSession(req, req.params.id);
    if (!session) return notFound(res, 'Session not found.');

    const {
      activityId,
      questionIndex = 0,
      promptText = '',
      promptImageUrl = '',
      studentAnswers = []
    } = req.body;

    const qResult = {
      activityId: validId(activityId) ? activityId : null,
      questionIndex,
      promptText,
      promptImageUrl,
      studentAnswers: studentAnswers
        .filter((a) => validId(a.studentId))
        .map((a) => ({
          student: a.studentId,
          result: ['CORRECT', 'INCORRECT', 'NOT_ANSWERED'].includes(a.result)
            ? a.result
            : 'NOT_ANSWERED'
        }))
    };

    // Update per-student score counters based on answers
    for (const ans of qResult.studentAnswers) {
      const row = session.studentScores.find(
        (s) => String(s.student) === String(ans.student)
      );
      if (!row) continue;
      if (ans.result === 'CORRECT') row.correctCount += 1;
      else if (ans.result === 'INCORRECT') row.incorrectCount += 1;
      else row.notAnswered += 1;
    }

    session.questionResults.push(qResult);
    session.markModified('studentScores');
    session.markModified('questionResults');
    await session.save();

    res.json({ success: true, data: qResult });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher/classroom-sessions/:id/summary
// ─────────────────────────────────────────────────────────────────────────────
exports.getSessionSummary = async (req, res, next) => {
  try {
    const session = await ownSession(req, req.params.id);
    if (!session) return notFound(res, 'Session not found.');

    await session.populate('classroom', 'name ageGroupCode');
    await session.populate('lesson', 'title');
    await session.populate(
      'studentScores.student',
      'name avatar avatarUrl ageGroupCode'
    );
    await session.populate(
      'summary.studentsNeedingPractice',
      'name avatar avatarUrl'
    );
    await session.populate('summary.topPerformers', 'name avatar avatarUrl');

    res.json({ success: true, data: session });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/teacher/classroom-sessions/:id/activity-index
// Teacher moves to next/prev activity
// Body: { index: number }
// ─────────────────────────────────────────────────────────────────────────────
exports.updateActivityIndex = async (req, res, next) => {
  try {
    const session = await ownSession(req, req.params.id);
    if (!session) return notFound(res, 'Session not found.');

    const idx = Number(req.body.index);
    if (isNaN(idx) || idx < 0) return bad(res, 'Valid index required.');

    session.currentActivityIndex = idx;
    await session.save();

    res.json({ success: true, data: { currentActivityIndex: session.currentActivityIndex } });
  } catch (e) {
    next(e);
  }
};
