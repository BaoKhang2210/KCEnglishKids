const mongoose = require('mongoose');
const {
  ClassroomSession,
  ClassRoom,
  User,
  Lesson,
  Activity,
  VocabularyMastery
} = require('../models');

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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher/classroom-sessions
// List sessions for the logged-in teacher (or all for ADMIN)
// ─────────────────────────────────────────────────────────────────────────────
exports.getSessions = async (req, res, next) => {
  try {
    const q =
      req.user.role === 'ADMIN' ? {} : { teacher: req.user._id };
    if (req.query.status) q.status = req.query.status;
    if (req.query.classroomId) q.classroom = req.query.classroomId;

    const sessions = await ClassroomSession.find(q)
      .populate('classroom', 'name ageGroupCode')
      .populate('teacher', 'name avatar avatarUrl')
      .populate('lesson', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

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
    const { classroomId, lessonId, title, activityIds, plannedDuration } =
      req.body;

    if (!validId(classroomId))
      return bad(res, 'Valid classroomId is required.');

    const classroom = await ownClass(req, classroomId);
    if (!classroom)
      return forbidden(res, 'You do not have access to this classroom.');

    // Verify lesson exists (optional)
    let lesson = null;
    if (lessonId) {
      if (!validId(lessonId)) return bad(res, 'Invalid lessonId.');
      lesson = await Lesson.findOne({ _id: lessonId, status: 'ACTIVE' });
      if (!lesson) return bad(res, 'Lesson not found or inactive.');
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

    // Initialise per-student score rows
    const studentScores = classroom.students.map((s) => ({
      student: s,
      points: 0,
      stars: 0,
      correctCount: 0,
      incorrectCount: 0,
      notAnswered: 0,
      status: 'ACTIVE'
    }));

    const session = await ClassroomSession.create({
      classroom: classroomId,
      teacher: req.user._id,
      lesson: lessonId || null,
      title: title || (lesson ? lesson.title : 'Classroom Session'),
      ageGroup: classroom.ageGroupCode || '5-6',
      status: 'SCHEDULED',
      plannedDuration: plannedDuration || 45,
      activities: resolvedActivities,
      currentActivityIndex: 0,
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

    await session.populate('classroom', 'name ageGroupCode');
    await session.populate('teacher', 'name avatar avatarUrl');
    await session.populate({
      path: 'lesson',
      select: 'title vietnameseTitle description vocabularyItems',
      populate: {
        path: 'vocabularyItems',
        select: 'word english vietnamese pronunciation audioUrl imageUrl category'
      }
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
    if (session.status === 'COMPLETED')
      return bad(res, 'Session is already completed.');

    session.status = 'COMPLETED';
    session.endedAt = new Date();

    // ── Build summary ────────────────────────────────────────────────────────
    const scores = session.studentScores;
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

    // Mark students needing practice (< 50% accuracy OR no participation)
    const needsPractice = scores
      .filter((s) => {
        const ans = s.correctCount + s.incorrectCount;
        if (ans === 0) return true;
        return s.correctCount / ans < 0.5;
      })
      .map((s) => s.student);

    // Top performers (stars desc, take top 3)
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

    // Update student status flags
    for (const s of session.studentScores) {
      const ans = s.correctCount + s.incorrectCount;
      if (ans === 0) { s.status = 'NEEDS_PRACTICE'; continue; }
      const acc = s.correctCount / ans;
      s.status = acc >= 0.8 ? 'COMPLETED' : acc < 0.5 ? 'NEEDS_PRACTICE' : 'ACTIVE';
    }

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
