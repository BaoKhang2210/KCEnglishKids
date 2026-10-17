const mongoose = require('mongoose');
const { ClassRoom, User, Progress, ActivityResult, LearningSession, Assignment, TeacherNote, CurriculumUnit, CurriculumBook, Lesson, Activity, ClassroomSession, UnitCompletion } = require('../models');

const validId = id => mongoose.isValidObjectId(id);
const invalid = (res, message) => res.status(400).json({ success: false, message });
const classFor = (req, id) => ClassRoom.findOne(req.user.role === 'ADMIN' ? { _id: id } : { _id: id, teacher: req.user._id });
const studentsFor = async req => ClassRoom.find({ teacher: req.user._id }).distinct('students');
const getStudent = async (req, id) => validId(id) ? User.findOne({ role: 'CHILD', $and: [{ _id: id }, { _id: { $in: await studentsFor(req) } }] }).select('-password -pin') : null;
// §1.1.4 — full zero-stats shape so no metric ever renders blank/undefined
const EMPTY_STATS = { averageScore: 0, stars: 0, totalStars: 0, attempts: 0, learningTime: 0, completedLessons: 0, lastActivity: null };
// §1.1.2 — Vietnamese-aware name order (á/ă/â/đ/ê/ô/ơ/ư sort like their base letters)
const byNameVi = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' });
// §1.1.4 — per-child stats: activity aggregates + progress + live classroom session stars + bonus stars.
const statsFor = async ids => {
  if (!ids.length) return [];
  const [resultStats, progressStats, classroomStats, unitStats] = await Promise.all([
    ActivityResult.aggregate([
      { $match: { child: { $in: ids } } },
      { $group: {
          _id: '$child',
          averageScore: { $avg: '$score' },
          activityStars: { $sum: '$stars' },
          attempts: { $sum: '$attempts' },
          learningTime: { $sum: '$duration' },
          lastActivity: { $max: '$createdAt' }
      } }
    ]),
    Progress.aggregate([
      { $match: { child: { $in: ids } } },
      { $group: {
          _id: '$child',
          completedLessons: { $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] } },
          progressStars: { $sum: '$stars' },
          highestScoreAvg: { $avg: '$highestScore' },
          progressAttempts: { $sum: '$attempts' },
          lastProgressDate: { $max: '$lastActivityAt' }
      } }
    ]),
    ClassroomSession.aggregate([
      { $unwind: '$studentScores' },
      { $match: { 'studentScores.student': { $in: ids } } },
      { $group: {
          _id: '$studentScores.student',
          classroomStars: { $sum: '$studentScores.stars' },
          classroomPoints: { $sum: '$studentScores.points' }
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
    ])
  ]);

  const resultMap = new Map(resultStats.map(x => [String(x._id), x]));
  const progressMap = new Map(progressStats.map(x => [String(x._id), x]));
  const classroomMap = new Map(classroomStats.map(x => [String(x._id), x]));
  const unitMap = new Map(unitStats.map(x => [String(x._id), x]));

  return ids.map(id => {
    const sid = String(id);
    const r = resultMap.get(sid);
    const p = progressMap.get(sid);
    const c = classroomMap.get(sid);
    const u = unitMap.get(sid);

    const earnedStars = p ? (p.progressStars || 0) : (r ? (r.activityStars || 0) : 0);
    const classroomStars = c ? (c.classroomStars || 0) : 0;
    const bonusStars = u ? (u.bonusStars || 0) : 0;
    const totalStars = earnedStars + classroomStars + bonusStars;

    const avgScore = r?.averageScore !== undefined
      ? Math.round(r.averageScore)
      : (p?.highestScoreAvg !== undefined ? Math.round(p.highestScoreAvg) : 0);

    const completedLessons = p?.completedLessons || 0;
    const attempts = (r?.attempts || 0) + (p?.progressAttempts || 0);
    const learningTime = r?.learningTime || 0;

    let lastActivity = r?.lastActivity || p?.lastProgressDate || null;
    if (r?.lastActivity && p?.lastProgressDate) {
      lastActivity = new Date(r.lastActivity) > new Date(p.lastProgressDate) ? r.lastActivity : p.lastProgressDate;
    }

    return {
      _id: id,
      averageScore: avgScore,
      stars: totalStars,
      totalStars,
      earnedStars,
      classroomStars,
      bonusStars,
      completedLessons,
      attempts,
      learningTime,
      lastActivity
    };
  });
};
const ownClassOr403 = async (req, res, id) => { if (!validId(id)) { invalid(res, 'Invalid classroom id.'); return null; } const item = await classFor(req, id); if (!item) res.status(403).json({ success: false, message: 'You do not have access to this classroom.' }); return item; };

exports.getDashboard = async (req, res, next) => { try {
  const classes = await ClassRoom.find({ teacher: req.user._id }).select('students'); const ids = classes.flatMap(c => c.students);
  const [assignmentData, resultStats, recentSessions] = await Promise.all([Assignment.find({ teacher: req.user._id }).sort({ createdAt: -1 }).limit(6).populate('classRoom', 'name').populate('lesson', 'title').populate('activity', 'title activityType'), statsFor(ids), LearningSession.find({ child: { $in: ids } }).sort({ lastActivityAt: -1 }).limit(8).populate('child', 'name avatar avatarUrl').populate('lesson', 'title')]);
  const avg = resultStats.length ? Math.round(resultStats.reduce((n, x) => n + x.averageScore, 0) / resultStats.length) : 0;
  res.json({ success: true, data: { metrics: { classes: classes.length, students: ids.length, activeAssignments: assignmentData.filter(x => ['ASSIGNED', 'IN_PROGRESS'].includes(x.status)).length, completedAssignments: assignmentData.filter(x => x.status === 'COMPLETED').length, needingAttention: ids.filter(id => { const x = resultStats.find(y => String(y._id) === String(id)); return !x || x.averageScore < 60; }).length, averageScore: avg, stars: resultStats.reduce((n, x) => n + x.stars, 0) }, recentAssignments: assignmentData, recentSessions } });
} catch (e) { next(e); } };

exports.getTeacherClasses = async (req, res, next) => { try {
  const q = { teacher: req.user._id }; if (req.query.status) q.status = req.query.status; if (req.query.ageGroupCode) q.ageGroupCode = req.query.ageGroupCode; if (req.query.search) q.name = { $regex: req.query.search, $options: 'i' };
  const data = await ClassRoom.find(q).populate('teacher', 'name avatar avatarUrl').populate('ageGroup', 'name code').populate({ path: 'students', select: 'name avatar avatarUrl ageGroupCode dob lastLogin', options: { sort: { name: 1 } } }).sort({ updatedAt: -1 }); res.json({ success: true, count: data.length, data });
} catch (e) { next(e); } };

exports.getClassDetail = async (req, res, next) => { try {
  const classRoom = await ownClassOr403(req, res, req.params.id); if (!classRoom) return;
  await classRoom.populate('teacher', 'name avatar avatarUrl'); await classRoom.populate('ageGroup', 'name code');
  // §1.1.2 + §1.1.3 — sort students A-Z and include contact/parentContact/status/assignedClass
  await classRoom.populate({ path: 'students', select: 'name avatar avatarUrl ageGroupCode dob lastLogin createdAt contact parentContact status assignedClass', options: { sort: { name: 1 } } });
  // §1.1.2 — Mongo sorts by code point; re-sort with Vietnamese locale so accented names order correctly
  classRoom.students.sort(byNameVi);
  const [resultStats, assignments] = await Promise.all([statsFor(classRoom.students.map(x => x._id)), Assignment.find({ classRoom: classRoom._id, teacher: req.user._id }).populate('lesson', 'title').populate('activity', 'title activityType').sort({ createdAt: -1 })]); const map = new Map(resultStats.map(x => [String(x._id), x]));
  res.json({ success: true, data: { ...classRoom.toObject(), students: classRoom.students.map(x => ({ ...x.toObject(), stats: map.get(String(x._id)) || { ...EMPTY_STATS } })), assignments } });
} catch (e) { next(e); } };

exports.updateClass = async (req, res, next) => { try {
  if (!validId(req.params.id)) return invalid(res, 'Invalid classroom id.'); const values = {}; ['name', 'description', 'academicYear', 'status'].forEach(k => { if (req.body[k] !== undefined) values[k] = req.body[k]; }); if (req.body.ageGroupCode) values.ageGroupCode = req.body.ageGroupCode;
  if (values.name !== undefined && !String(values.name).trim()) return invalid(res, 'Class name is required.'); const data = await ClassRoom.findOneAndUpdate({ _id: req.params.id, teacher: req.user._id }, values, { new: true, runValidators: true }); if (!data) return res.status(403).json({ success: false, message: 'You do not have access to this classroom.' }); res.json({ success: true, data });
} catch (e) { next(e); } };

exports.getEligibleStudents = async (req, res, next) => { try {
  const room = await ownClassOr403(req, res, req.params.id); if (!room) return; const q = { role: 'CHILD', status: 'ACTIVE', $or: [{ assignedClass: null }, { assignedClass: { $exists: false } }] }; if (req.query.ageGroupCode || room.ageGroupCode) q.ageGroupCode = req.query.ageGroupCode || room.ageGroupCode; if (req.query.search) q.$and = [{ $or: [{ name: { $regex: req.query.search, $options: 'i' } }, { username: { $regex: req.query.search, $options: 'i' } }] }]; const data = await User.find(q).select('name username avatar avatarUrl ageGroupCode dob createdAt').sort({ name: 1 }).collation({ locale: 'vi', strength: 2 }); res.json({ success: true, data });
} catch (e) { next(e); } };

exports.addStudents = async (req, res, next) => { try {
  const ids = req.body.studentIds; if (!Array.isArray(ids) || !ids.length || ids.some(id => !validId(id))) return invalid(res, 'Provide one or more valid children.'); const room = await ownClassOr403(req, res, req.params.id); if (!room) return;
  const students = await User.find({ _id: { $in: ids }, role: 'CHILD', status: 'ACTIVE', $or: [{ assignedClass: null }, { assignedClass: { $exists: false } }] }); if (students.length !== ids.length) return invalid(res, 'One or more children are unavailable or already assigned.'); if (room.ageGroupCode && students.some(s => s.ageGroupCode && s.ageGroupCode !== room.ageGroupCode)) return invalid(res, 'Selected children do not match the class age group.');
  await Promise.all([User.updateMany({ _id: { $in: ids } }, { $set: { assignedClass: room._id } }), ClassRoom.updateOne({ _id: room._id }, { $addToSet: { students: { $each: ids } } })]); res.json({ success: true, message: 'Children added to the class.' });
} catch (e) { next(e); } };

exports.removeStudent = async (req, res, next) => { try {
  const room = await ownClassOr403(req, res, req.params.id); if (!room) return; if (!validId(req.params.studentId) || !room.students.some(x => String(x) === req.params.studentId)) return res.status(403).json({ success: false, message: 'This child is not in your class.' }); await Promise.all([ClassRoom.updateOne({ _id: room._id }, { $pull: { students: req.params.studentId } }), User.updateOne({ _id: req.params.studentId, assignedClass: room._id }, { $unset: { assignedClass: 1 } })]); res.json({ success: true, message: 'Child removed from this class. Learning history is preserved.' });
} catch (e) { next(e); } };

exports.getStudents = async (req, res, next) => { try {
  const ids = await studentsFor(req); const q = { _id: { $in: ids }, role: 'CHILD' }; if (req.query.classRoomId) { if (!(await classFor(req, req.query.classRoomId))) return res.status(403).json({ success: false, message: 'You do not have access to this classroom.' }); q.assignedClass = req.query.classRoomId; } if (req.query.ageGroupCode) q.ageGroupCode = req.query.ageGroupCode; if (req.query.search) q.$or = [{ name: { $regex: req.query.search, $options: 'i' } }, { username: { $regex: req.query.search, $options: 'i' } }]; const data = await User.find(q).select('-password -pin').populate('assignedClass', 'name').sort({ name: 1 }).collation({ locale: 'vi', strength: 2 }); const statMap = new Map((await statsFor(data.map(x => x._id))).map(x => [String(x._id), x])); res.json({ success: true, data: data.map(x => ({ ...x.toObject(), stats: statMap.get(String(x._id)) || { ...EMPTY_STATS } })) });
} catch (e) { next(e); } };

exports.getStudentOverview = async (req, res, next) => {
  try {
    const student = await getStudent(req, req.params.studentId);
    if (!student) return res.status(403).json({ success: false, message: 'You do not have access to this child.' });
    const isHomeroom = student.assignedClass ? await ClassRoom.exists({ _id: student.assignedClass, teacher: req.user._id }) : false;
    const notesQuery = { student: student._id };
    if (!isHomeroom) {
      notesQuery.$or = [{ isHomeroomOnly: { $ne: true } }, { teacher: req.user._id }];
    }
    const [progressList, recentActivities, sessions, notes, assignments, [overallStat]] = await Promise.all([
      Progress.find({ child: student._id }).populate('lesson', 'title ageGroupCode').populate('topic', 'englishName vietnameseName').sort({ lastActivityAt: -1 }),
      ActivityResult.find({ child: student._id }).populate('activity', 'title activityType').populate('lesson', 'title').sort({ createdAt: -1 }).limit(20),
      LearningSession.find({ child: student._id }).populate('lesson', 'title').sort({ lastActivityAt: -1 }).limit(15),
      TeacherNote.find(notesQuery).populate('teacher', 'name avatar').populate('lesson', 'title').sort({ createdAt: -1 }),
      Assignment.find({ teacher: req.user._id, $or: [{ student: student._id }, { classRoom: student.assignedClass }] }).populate('lesson', 'title').populate('activity', 'title activityType').sort({ createdAt: -1 }),
      statsFor([student._id])
    ]);
    res.json({
      success: true,
      data: {
        student,
        isHomeroom,
        stats: {
          totalStars: overallStat?.totalStars || 0,
          earnedStars: overallStat?.earnedStars || 0,
          classroomStars: overallStat?.classroomStars || 0,
          bonusStars: overallStat?.bonusStars || 0,
          completedLessons: overallStat?.completedLessons || 0,
          totalActivitiesPlayed: recentActivities.length,
          averageScore: overallStat?.averageScore || 0,
          attempts: overallStat?.attempts || 0,
          learningTime: overallStat?.learningTime || 0
        },
        progressList,
        recentActivities,
        sessions,
        notes,
        assignments
      }
    });
  } catch (e) {
    next(e);
  }
};

exports.getStudentHistory = async (req, res, next) => { try { const student = await getStudent(req, req.params.studentId); if (!student) return res.status(403).json({ success: false, message: 'You do not have access to this child.' }); const q = { child: student._id }; if (req.query.completed) q.completed = req.query.completed === 'true'; const data = await ActivityResult.find(q).populate('activity', 'title activityType').populate('lesson', 'title').sort({ createdAt: -1 }); res.json({ success: true, data }); } catch (e) { next(e); } };

exports.getContent = async (req, res, next) => { try {
  const uq = { status: 'ACTIVE' }; if (req.query.ageGroupCode) uq.ageGroupCode = req.query.ageGroupCode; if (req.query.bookNumber) uq.bookNumber = Number(req.query.bookNumber); const units = await CurriculumUnit.find(uq).populate('book', 'title bookNumber ageGroupCode').sort({ bookNumber: 1, unitNumber: 1 }).lean(); const activeUnits = req.query.unitId ? units.filter(x => String(x._id) === req.query.unitId) : units; const lq = { status: 'ACTIVE', curriculumUnits: { $in: activeUnits.map(x => x._id) } }; if (req.query.lessonId) lq._id = req.query.lessonId; if (req.query.difficulty) lq.difficulty = Number(req.query.difficulty); const lessons = await Lesson.find(lq).populate('topic', 'englishName vietnameseName').populate('vocabularyItems', 'english vietnamese imageUrl audioUrl').populate('languageContents').sort({ displayOrder: 1 }).lean(); const aq = { status: 'ACTIVE', lesson: { $in: lessons.map(x => x._id) } }; if (req.query.activityType) aq.activityType = req.query.activityType; const activities = await Activity.find(aq).select('title vietnameseTitle lesson activityType difficulty questionCount pointsPerQuestion instructions starConfig ageGroupCode').lean(); res.json({ success: true, data: { books: await CurriculumBook.find({ active: true }).sort({ bookNumber: 1 }), units: activeUnits, lessons, activities } });
} catch (e) { next(e); } };
exports.getLesson = async (req, res, next) => { try { if (!validId(req.params.id)) return invalid(res, 'Invalid lesson id.'); const lesson = await Lesson.findOne({ _id: req.params.id, status: 'ACTIVE' }).populate('topic').populate('vocabularyItems').populate('languageContents').populate('curriculumUnits'); if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found.' }); const activities = await Activity.find({ lesson: lesson._id, status: 'ACTIVE' }); res.json({ success: true, data: { ...lesson.toObject(), activities } }); } catch (e) { next(e); } };
exports.getActivity = async (req, res, next) => { try { if (!validId(req.params.id)) return invalid(res, 'Invalid activity id.'); const data = await Activity.findOne({ _id: req.params.id, status: 'ACTIVE' }).populate({ path: 'lesson', populate: ['topic', 'vocabularyItems'] }); if (!data) return res.status(404).json({ success: false, message: 'Activity not found.' }); res.json({ success: true, data }); } catch (e) { next(e); } };

exports.createAssignment = async (req, res, next) => { try {
  const { classRoomId, assignedToType = 'CLASS', studentId, lessonId, activityId, dueDate, startDate, instructions } = req.body; if (![classRoomId, lessonId].every(validId) || !['CLASS', 'STUDENT'].includes(assignedToType)) return invalid(res, 'Classroom, lesson and target are required.'); const room = await classFor(req, classRoomId); if (!room) return res.status(403).json({ success: false, message: 'You do not have access to this classroom.' }); if (!(await Lesson.exists({ _id: lessonId, status: 'ACTIVE' }))) return invalid(res, 'Selected lesson is unavailable.'); if (activityId && !(await Activity.exists({ _id: activityId, lesson: lessonId, status: 'ACTIVE' }))) return invalid(res, 'Selected activity is unavailable for this lesson.'); if (assignedToType === 'STUDENT' && (!validId(studentId) || !room.students.some(x => String(x) === studentId))) return invalid(res, 'Selected child is not in this classroom.'); const item = await Assignment.create({ teacher: req.user._id, classRoom: room._id, assignedToType, student: assignedToType === 'STUDENT' ? studentId : null, lesson: lessonId, activity: activityId || null, dueDate: dueDate || null, startDate: startDate || null, instructions: String(instructions || '').trim() }); res.status(201).json({ success: true, data: item });
} catch (e) { next(e); } };
exports.getAssignments = async (req, res, next) => { try { const q = { teacher: req.user._id }; if (req.query.classRoomId) q.classRoom = req.query.classRoomId; if (req.query.status) q.status = req.query.status; const data = await Assignment.find(q).populate('classRoom', 'name students').populate('student', 'name avatar avatarUrl').populate('lesson', 'title').populate('activity', 'title activityType').sort({ createdAt: -1 }); res.json({ success: true, count: data.length, data }); } catch (e) { next(e); } };
exports.getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, teacher: req.user._id })
      .populate({
        path: 'classRoom',
        select: 'name ageGroupCode students',
        populate: {
          path: 'students',
          select: 'name username avatar avatarUrl stars totalScore'
        }
      })
      .populate('student', 'name username avatar avatarUrl stars totalScore')
      .populate('lesson', 'title vietnameseTitle')
      .populate('activity', 'title activityType instructions passingScore maxScore');

    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You do not have access to this assignment.' });
    }

    let targetStudents = [];
    if (assignment.assignedToType === 'STUDENT' && assignment.student) {
      targetStudents = [assignment.student];
    } else if (assignment.classRoom && Array.isArray(assignment.classRoom.students)) {
      targetStudents = assignment.classRoom.students;
    }

    const studentIds = targetStudents.map(s => s._id || s);

    const query = {
      child: { $in: studentIds }
    };
    if (assignment.activity) {
      query.activity = assignment.activity._id;
    } else if (assignment.lesson) {
      query.lesson = assignment.lesson._id;
    }

    const results = await ActivityResult.find(query)
      .populate('child', 'name username avatar avatarUrl')
      .populate('answers.vocabularyId', 'english vietnamese imageUrl pronunciation')
      .sort({ createdAt: -1 });

    const resultsByChild = new Map();
    results.forEach(r => {
      const cId = String(r.child?._id || r.child);
      if (!resultsByChild.has(cId)) {
        resultsByChild.set(cId, r);
      }
    });

    const studentSubmissions = targetStudents.map(student => {
      const sId = String(student._id || student);
      const submission = resultsByChild.get(sId) || null;
      return {
        student: {
          _id: student._id || student,
          name: student.name || 'Học sinh',
          username: student.username || '',
          avatar: student.avatar || '',
          avatarUrl: student.avatarUrl || ''
        },
        hasSubmitted: !!submission,
        submission: submission
          ? {
              _id: submission._id,
              score: submission.score,
              stars: submission.stars,
              correctCount: submission.correctCount,
              incorrectCount: submission.incorrectCount,
              duration: submission.duration,
              completed: submission.completed,
              submittedAt: submission.createdAt,
              answers: submission.answers,
              teacherFeedback: submission.teacherFeedback || null
            }
          : null
      };
    });

    const submittedCount = studentSubmissions.filter(s => s.hasSubmitted).length;
    const totalCount = studentSubmissions.length;
    const avgScore = submittedCount > 0
      ? Math.round(studentSubmissions.filter(s => s.hasSubmitted).reduce((sum, s) => sum + (s.submission?.score || 0), 0) / submittedCount)
      : 0;

    res.json({
      success: true,
      data: {
        assignment,
        results,
        studentSubmissions,
        stats: {
          totalStudents: totalCount,
          submittedStudents: submittedCount,
          unsubmittedStudents: totalCount - submittedCount,
          submissionRate: totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0,
          averageScore: avgScore
        }
      }
    });
  } catch (e) {
    next(e);
  }
};

exports.reviewAssignmentSubmission = async (req, res, next) => {
  try {
    const { assignmentId, childId } = req.params;
    const { comment = '', bonusStars = 0, notifyParent = true } = req.body;

    const assignment = await Assignment.findOne({ _id: assignmentId, teacher: req.user._id })
      .populate('lesson', 'title')
      .populate('activity', 'title activityType');
    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You do not have access to this assignment.' });
    }

    const student = await User.findById(childId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const query = {
      child: childId,
      ...(assignment.activity ? { activity: assignment.activity._id } : { lesson: assignment.lesson._id })
    };

    let result = await ActivityResult.findOne(query).sort({ createdAt: -1 });
    if (!result) {
      return res.status(400).json({ success: false, message: 'Học sinh chưa hoàn thành bài tập này để chấm điểm.' });
    }

    const addedStars = Math.max(0, Number(bonusStars) || 0);

    result.teacherFeedback = {
      comment: String(comment || '').trim(),
      bonusStars: addedStars,
      reviewedAt: new Date(),
      teacher: req.user._id
    };

    if (addedStars > 0) {
      student.stars = (student.stars || 0) + addedStars;
      await student.save();
    }

    await result.save();

    let notification = null;
    if (notifyParent) {
      const ParentNotification = require('../models/ParentNotification');
      const actTitle = assignment.activity?.title || assignment.lesson?.title || 'Bài tập';
      const feedbackText = String(comment || 'Bé đã hoàn thành bài tập rất tốt!').trim();
      notification = await ParentNotification.create({
        child: childId,
        teacher: req.user._id,
        templateType: 'GENERAL',
        teacherNote: `[Nhận xét bài tập "${actTitle}"]: ${feedbackText}${addedStars > 0 ? ` (Cô tặng thêm bé ${addedStars} sao ⭐)` : ''}`,
        score: result.score,
        stars: (result.stars || 0) + addedStars,
        status: 'SENT'
      });
    }

    res.json({
      success: true,
      data: {
        result,
        studentStars: student.stars,
        notification
      }
    });
  } catch (e) {
    next(e);
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const data = await Assignment.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!data) return res.status(404).json({ success: false, message: 'Assignment not found or unauthorized.' });
    res.json({ success: true, message: 'Assignment deleted successfully.' });
  } catch (e) {
    next(e);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const values = {};
    ['dueDate', 'startDate', 'instructions'].forEach(k => {
      if (req.body[k] !== undefined) values[k] = req.body[k] || null;
    });
    const data = await Assignment.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id, status: { $nin: ['COMPLETED', 'CANCELLED'] } },
      values,
      { new: true, runValidators: true }
    );
    if (!data) return res.status(403).json({ success: false, message: 'This assignment cannot be edited.' });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.updateAssignmentStatus = async (req, res, next) => {
  try {
    if (!['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(req.body.status)) {
      return invalid(res, 'Invalid assignment status.');
    }
    const data = await Assignment.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user._id },
      { status: req.body.status },
      { new: true }
    );
    if (!data) return res.status(403).json({ success: false, message: 'You do not have access to this assignment.' });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.createTeacherNote = async (req, res, next) => {
  try {
    const { studentId, lessonId, noteType = 'GENERAL', content, isHomeroomOnly = false } = req.body;
    if (!content || !String(content).trim() || !(await getStudent(req, studentId))) return invalid(res, 'A permitted child and note content are required.');
    const data = await TeacherNote.create({
      teacher: req.user._id,
      student: studentId,
      lesson: validId(lessonId) ? lessonId : null,
      noteType,
      content: String(content).trim(),
      isHomeroomOnly: Boolean(isHomeroomOnly)
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.getStudentNotes = async (req, res, next) => {
  try {
    const student = await getStudent(req, req.params.studentId);
    if (!student) return res.status(403).json({ success: false, message: 'You do not have access to this child.' });
    const isHomeroom = student.assignedClass ? await ClassRoom.exists({ _id: student.assignedClass, teacher: req.user._id }) : false;
    const query = { student: req.params.studentId };
    if (!isHomeroom) {
      query.$or = [{ isHomeroomOnly: { $ne: true } }, { teacher: req.user._id }];
    }
    const data = await TeacherNote.find(query).populate('teacher', 'name avatar').populate('lesson', 'title').sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
exports.updateNote = async (req, res, next) => { try { const data = await TeacherNote.findOneAndUpdate({ _id: req.params.id, teacher: req.user._id }, { content: req.body.content, noteType: req.body.noteType }, { new: true, runValidators: true }); if (!data) return res.status(403).json({ success: false, message: 'You can only edit your own note.' }); res.json({ success: true, data }); } catch (e) { next(e); } };
exports.deleteNote = async (req, res, next) => { try { const data = await TeacherNote.findOneAndDelete({ _id: req.params.id, teacher: req.user._id }); if (!data) return res.status(403).json({ success: false, message: 'You can only delete your own note.' }); res.json({ success: true }); } catch (e) { next(e); } };
exports.getCurriculumOptions = exports.getContent;
