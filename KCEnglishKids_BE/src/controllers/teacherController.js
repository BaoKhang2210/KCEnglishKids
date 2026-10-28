const { ClassRoom, User, Progress, ActivityResult, LearningSession, Assignment, TeacherNote, CurriculumUnit, CurriculumBook, Lesson, Activity, ClassroomSession, UnitCompletion, Schedule, VocabularyMastery, Attendance } = require('../models');
const { calculateLessonStars } = require('../services/starService');

const rules = require('../services/teacherRules');
const access = require('../services/teacherAccess');
const { escapeRegex } = require('../services/adminIntegrity');
const validId = rules.validId;
const invalid = (res, message) => res.status(400).json({ success: false, message });
const classFor = (req, id) => ClassRoom.findOne({ _id: id, deletionPending: { $ne: true }, ...(req.user.role === 'ADMIN' ? {} : { teacher: req.user._id }) });
const studentsFor = access.studentIds;
const getStudent = async (req, id) => validId(id) ? User.findOne({ role: 'CHILD', $and: [{ _id: id }, { _id: { $in: await studentsFor(req) } }] }).select('-password -pin') : null;
// §1.1.4 — full zero-stats shape so no metric ever renders blank/undefined
const EMPTY_STATS = { hasAssessment: false, averageScore: 0, stars: 0, totalStars: 0, attempts: 0, learningTime: 0, completedLessons: 0, lastActivity: null };
// §1.1.2 — Vietnamese-aware name order (á/ă/â/đ/ê/ô/ơ/ư sort like their base letters)
const byNameVi = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' });
// §1.1.4 — per-child stats: activity aggregates + progress + live classroom session stars + bonus stars.
const statsFor = async ids => {
  if (!ids.length) return [];
  const [resultStats, progressStats, classroomStats, unitStats, completedProgress] = await Promise.all([
    ActivityResult.aggregate([
      { $match: { child: { $in: ids } } },
      { $group: {
          _id: '$child',
          averageScore: { $avg: { $cond: [{ $gt: [{ $add: ['$correctCount', '$incorrectCount'] }, 0] }, { $multiply: [100, { $divide: ['$correctCount', { $add: ['$correctCount', '$incorrectCount'] }] }] }, null] } },
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
          progressStars: { $sum: { $cond: [{ $eq: ['$completed', true] }, '$stars', 0] } },
          highestScoreAvg: { $avg: '$highestScore' },
          progressAttempts: { $sum: '$attempts' },
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
    ]),
    Progress.find({ child: { $in: ids }, completed: true }).select('child lesson stars').lean()
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
    const stars = rating.completed ? rating.stars : (progress.stars || 0);
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

  return ids.map(id => {
    const sid = String(id);
    const r = resultMap.get(sid);
    const p = progressMap.get(sid);
    const c = classroomMap.get(sid);
    const u = unitMap.get(sid);

    // ActivityResult.stars are per-game feedback, not banked Lesson stars.
    const earnedStars = earnedStarsByChild.get(sid) ?? 0;
    const classroomStars = c ? (c.classroomStars || 0) : 0;
    const bonusStars = u ? (u.bonusStars || 0) : 0;
    const teacherStars = teacherStarsByChild.get(sid) || 0;
    const totalStars = earnedStars + classroomStars + bonusStars + teacherStars;

    const avgScore = Number.isFinite(r?.averageScore)
      ? Math.round(r.averageScore)
      : 0;

    const completedLessons = p?.completedLessons || 0;
    const attempts = r?.attempts || p?.progressAttempts || 0;
    const learningTime = r?.learningTime || 0;

    let lastActivity = r?.lastActivity || p?.lastProgressDate || null;
    if (r?.lastActivity && p?.lastProgressDate) {
      lastActivity = new Date(r.lastActivity) > new Date(p.lastProgressDate) ? r.lastActivity : p.lastProgressDate;
    }

    return {
      _id: id,
      averageScore: avgScore,
      hasAssessment: Number.isFinite(r?.averageScore),
      stars: totalStars,
      totalStars,
      earnedStars,
      classroomStars,
      bonusStars,
      teacherStars,
      completedLessons,
      attempts,
      learningTime,
      lastActivity
    };
  });
};
const ownClassOr403 = async (req, res, id) => { if (!validId(id)) { invalid(res, 'Invalid classroom id.'); return null; } const item = await classFor(req, id); if (!item) res.status(403).json({ success: false, message: 'You do not have access to this classroom.' }); return item; };

exports.getDashboard = async (req, res, next) => { try {
  const classes = await ClassRoom.find(access.classScope(req)).select('students name status');
  const ids = [...new Map(classes.flatMap(c => c.students).map(id => [String(id), id])).values()];
  const assignmentQuery = { ...(req.user.role === 'ADMIN' ? {} : { teacher: req.user._id }), classRoom: { $in: classes.map(c => c._id) } };
  const [recentAssignments, allAssignments, resultStats, recentSessions] = await Promise.all([
    Assignment.find(assignmentQuery).sort({ createdAt: -1 }).limit(6).populate('classRoom', 'name').populate('lesson', 'title').populate('activity', 'title activityType'),
    Assignment.find(assignmentQuery).select('status'), statsFor(ids),
    LearningSession.find({ child: { $in: ids } }).sort({ lastActivityAt: -1 }).limit(8).populate('child', 'name avatar avatarUrl').populate('lesson', 'title')
  ]);
  const assessed = resultStats.filter(s => s.hasAssessment);
  res.json({ success: true, data: { metrics: { classes: classes.length, students: ids.length,
    activeAssignments: allAssignments.filter(a => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status)).length,
    completedAssignments: allAssignments.filter(a => a.status === 'COMPLETED').length,
    needingAttention: assessed.filter(s => s.averageScore < 60).length, unassessedStudents: ids.length - assessed.length,
    activeLearners: assessed.length, averageScore: assessed.length ? Math.round(assessed.reduce((n,s) => n+s.averageScore, 0)/assessed.length) : null,
    stars: resultStats.reduce((n,s) => n+s.stars, 0) }, recentAssignments, recentSessions } });
} catch(e) { next(e); } };

exports.getTeacherClasses = async (req, res, next) => { try {
  const q = access.classScope(req); if (req.query.status) q.status = req.query.status; if (req.query.ageGroupCode) q.ageGroupCode = req.query.ageGroupCode; if (req.query.search) q.name = { $regex: escapeRegex(String(req.query.search).slice(0, 200)), $options: 'i' };
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
  const room = await access.classroom(req, req.params.id);
  if (Object.keys(req.body).some(key => !['name','description'].includes(key))) rules.fail('Nhóm tuổi, niên khóa, phân lớp và trạng thái do quản trị viên quản lý.', 403);
  if (req.body.name !== undefined) { room.name = rules.text(req.body.name, 150); if (!room.name) rules.fail('Vui lòng nhập tên lớp.'); }
  if (req.body.description !== undefined) room.description = rules.text(req.body.description);
  await room.save(); res.json({ success: true, data: room });
} catch(e) { next(e); } };

exports.getEligibleStudents = (_req, res) => res.status(403).json({ success: false, message: 'Danh sách học sinh do quản trị viên phân bổ. Vui lòng liên hệ quản trị viên.' });

exports.addStudents = (_req, res) => res.status(403).json({ success: false, message: 'Danh sách học sinh do quản trị viên phân bổ. Vui lòng liên hệ quản trị viên.' });

exports.removeStudent = (_req, res) => res.status(403).json({ success: false, message: 'Danh sách học sinh do quản trị viên phân bổ. Vui lòng liên hệ quản trị viên.' });

exports.getClassAttendance = async (req, res, next) => {
  try {
    const classRoom = await ownClassOr403(req, res, req.params.id);
    if (!classRoom) return;

    const date = rules.attendanceDate(req.query.date);
    const attendance = await Attendance.findOne({ classroom: classRoom._id, date });

    await classRoom.populate({
      path: 'students',
      select: 'name avatar avatarUrl ageGroupCode dob contact parentContact',
      options: { sort: { name: 1 } }
    });
    classRoom.students.sort(byNameVi);

    const existingMap = new Map((attendance?.records || []).map(r => [String(r.student), r]));
    const records = classRoom.students.map(s => {
      const existing = existingMap.get(String(s._id));
      return {
        student: s,
        status: existing?.status || 'PRESENT',
        note: existing?.note || ''
      };
    });

    res.json({
      success: true,
      data: {
        classroomId: classRoom._id,
        className: classRoom.name,
        date,
        records,
        note: attendance?.note || '',
        updatedAt: attendance?.updatedAt || null
      }
    });
  } catch (e) {
    next(e);
  }
};

exports.saveClassAttendance = async (req, res, next) => { try {
  const room = await access.classroom(req, req.params.id);
  const date = rules.attendanceDate(req.body.date);
  const records = rules.attendanceRecords(req.body.records, room.students);
  const data = await Attendance.findOneAndUpdate({ classroom: room._id, date }, { classroom: room._id, teacher: req.user._id, date, records, note: rules.text(req.body.note) }, { upsert: true, new: true, runValidators: true });
  res.json({ success: true, data });
} catch(e) { next(e); } };

exports.getStudents = async (req, res, next) => { try {
  const ids = await studentsFor(req); const q = { _id: { $in: ids }, role: 'CHILD' }; if (req.query.classRoomId) { if (!(await classFor(req, req.query.classRoomId))) return res.status(403).json({ success: false, message: 'You do not have access to this classroom.' }); q.assignedClass = req.query.classRoomId; } if (req.query.ageGroupCode) q.ageGroupCode = req.query.ageGroupCode; if (req.query.search) q.$or = [{ name: { $regex: escapeRegex(String(req.query.search).slice(0, 200)), $options: 'i' } }, { username: { $regex: escapeRegex(String(req.query.search).slice(0, 200)), $options: 'i' } }]; const data = await User.find(q).select('-password -pin').populate('assignedClass', 'name').sort({ name: 1 }).collation({ locale: 'vi', strength: 2 }); const statMap = new Map((await statsFor(data.map(x => x._id))).map(x => [String(x._id), x])); res.json({ success: true, data: data.map(x => ({ ...x.toObject(), stats: statMap.get(String(x._id)) || { ...EMPTY_STATS } })) });
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
    const [progressList, recentActivities, sessions, notes, assignments, [overallStat], masteryList] = await Promise.all([
      Progress.find({ child: student._id }).populate('lesson', 'title ageGroupCode').populate('topic', 'englishName vietnameseName').sort({ lastActivityAt: -1 }),
      ActivityResult.find({ child: student._id }).populate('activity', 'title activityType').populate('lesson', 'title').sort({ createdAt: -1 }).limit(30),
      LearningSession.find({ child: student._id }).populate('lesson', 'title').sort({ lastActivityAt: -1 }).limit(15),
      TeacherNote.find(notesQuery).populate('teacher', 'name avatar').populate('lesson', 'title').sort({ createdAt: -1 }),
      Assignment.find({ ...(req.user.role === 'ADMIN' ? {} : { teacher: req.user._id }), classRoom: student.assignedClass, $and: [{ $or: [{ student: student._id }, { assignedToType: 'CLASS' }] }, { $or: [{ recipients: { $exists: false } }, { recipients: student._id }] }] }).populate('lesson', 'title').populate('activity', 'title activityType').sort({ createdAt: -1 }),
      statsFor([student._id]),
      VocabularyMastery.find({ student: student._id }).populate('vocabulary', 'english vietnamese imageUrl audioUrl category').lean()
    ]);

    // ─── Early Childhood Competency Report (3 Pillars) ────────────────────
    const totalStars = overallStat?.totalStars || 0;
    let explorerLevel = {
      level: 1,
      title: 'Mầm Nhí Khám Phá',
      titleEn: 'Sprout Explorer',
      icon: '🌱',
      minStars: 0,
      maxStars: 50,
      currentStars: totalStars,
      progressPercent: Math.min(100, Math.round((totalStars / 50) * 100))
    };
    if (totalStars > 300) {
      explorerLevel = {
        level: 4,
        title: 'Đại Sứ Anh Ngữ Nhí',
        titleEn: 'Master Explorer',
        icon: '👑',
        minStars: 300,
        maxStars: 500,
        currentStars: totalStars,
        progressPercent: 100
      };
    } else if (totalStars > 150) {
      explorerLevel = {
        level: 3,
        title: 'Bạn Nhỏ Tự Tin',
        titleEn: 'Confident Star',
        icon: '🦁',
        minStars: 151,
        maxStars: 300,
        currentStars: totalStars,
        progressPercent: Math.min(100, Math.round(((totalStars - 150) / 150) * 100))
      };
    } else if (totalStars > 50) {
      explorerLevel = {
        level: 2,
        title: 'Thám Hiểm Tí Hon',
        titleEn: 'Little Adventurer',
        icon: '🎒',
        minStars: 51,
        maxStars: 150,
        currentStars: totalStars,
        progressPercent: Math.min(100, Math.round(((totalStars - 50) / 100) * 100))
      };
    }

    // 1. Vocabulary Competency
    const safeMasteryList = masteryList || [];
    const masteredList = safeMasteryList.filter(m => m.masteryLevel === 3);
    const practicingList = safeMasteryList.filter(m => m.masteryLevel === 2);
    const learningList = safeMasteryList.filter(m => m.masteryLevel === 1);

    const weakVocabMap = new Map();
    (progressList || []).forEach(p => {
      (p.weakVocabulary || []).forEach(wv => {
        if (wv.vocabulary) {
          weakVocabMap.set(String(wv.vocabulary._id || wv.vocabulary), {
            mistakeCount: wv.mistakeCount,
            id: String(wv.vocabulary._id || wv.vocabulary)
          });
        }
      });
    });

    const needsReviewWords = safeMasteryList
      .filter(m => m.wrongCount > 0 || weakVocabMap.has(String(m.vocabulary?._id)))
      .sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0))
      .slice(0, 5)
      .map(m => ({
        english: m.vocabulary?.english || 'Word',
        vietnamese: m.vocabulary?.vietnamese || '',
        imageUrl: m.vocabulary?.imageUrl,
        wrongCount: m.wrongCount || 1
      }));

    const vocabularyCompetency = {
      totalEncountered: safeMasteryList.length,
      masteredCount: masteredList.length,
      practicingCount: practicingList.length,
      learningCount: learningList.length,
      masteredWords: masteredList.slice(0, 8).map(m => ({
        english: m.vocabulary?.english,
        vietnamese: m.vocabulary?.vietnamese,
        imageUrl: m.vocabulary?.imageUrl
      })),
      needsReviewWords
    };

    // Listening observations only; game scores cannot establish pronunciation ability.
    const answers = (recentActivities || []).filter(a => ['LISTEN_CHOOSE', 'LISTEN_REPEAT'].includes(a.activity?.activityType)).flatMap(a => a.answers || []);
    const answeredCount = answers.length;
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const listeningAccuracy = answeredCount ? Math.round(100 * correctAnswers / answeredCount) : null;
    const times = answers.map(a => a.responseTimeMs).filter(n => Number.isFinite(n) && n > 0);
    const listeningCompetency = {
      accuracyRate: listeningAccuracy, totalResponses: answeredCount, correctResponses: correctAnswers,
      reactionSpeed: times.length ? 'Trung bình ' + (times.reduce((n,t) => n+t, 0) / times.length / 1000).toFixed(1) + ' giây/câu đã ghi nhận' : 'Chưa có dữ liệu thời gian phản hồi',
      status: listeningAccuracy === null ? 'NOT_ASSESSED' : listeningAccuracy >= 80 ? 'EXCELLENT' : listeningAccuracy >= 60 ? 'GOOD' : 'PRACTICE_NEEDED'
    };
    const pronunciationCompetency = { averageScore: null, confidence: 'Chưa có dữ liệu đánh giá phát âm riêng. Giáo viên cần quan sát và ghi nhận trực tiếp.', starsEarned: 0 };

    const competencyReport = {
      explorerLevel,
      vocabularyCompetency,
      listeningCompetency,
      pronunciationCompetency,
      recommendedAction: needsReviewWords.length > 0 
        ? `Nên cùng bé củng cố nhóm từ đã ghi nhận nhầm lẫn: ${needsReviewWords.map(w => w.english).join(', ')}.`
        : 'Tiếp tục quan sát và ghi nhận hoạt động thực tế trước khi đưa ra nhận xét tổng hợp.'
    };

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
          totalActivitiesPlayed: overallStat?.attempts || 0,
          hasAssessment: overallStat?.hasAssessment || false,
          averageScore: overallStat?.averageScore || 0,
          attempts: overallStat?.attempts || 0,
          learningTime: overallStat?.learningTime || 0
        },
        competencyReport,
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
  const uq = { status: 'ACTIVE' }; if (req.query.ageGroupCode) uq.ageGroupCode = req.query.ageGroupCode; if (req.query.bookNumber) uq.bookNumber = Number(req.query.bookNumber); const units = await CurriculumUnit.find(uq).populate('book', 'title bookNumber ageGroupCode').sort({ bookNumber: 1, unitNumber: 1 }).lean(); const activeUnits = req.query.unitId ? units.filter(x => String(x._id) === req.query.unitId) : units; const lq = { status: 'ACTIVE', curriculumUnits: { $in: activeUnits.map(x => x._id) } }; if (req.query.lessonId) lq._id = req.query.lessonId; if (req.query.difficulty) lq.difficulty = Number(req.query.difficulty); const lessons = await Lesson.find(lq).populate('topic', 'englishName vietnameseName').populate('vocabularyItems', 'english vietnamese imageUrl audioUrl').populate({ path: 'languageContents', match: { status: 'ACTIVE' } }).sort({ displayOrder: 1 }).lean(); const aq = { status: 'ACTIVE', lesson: { $in: lessons.map(x => x._id) } }; if (req.query.activityType) aq.activityType = req.query.activityType; const activities = await Activity.find(aq).select('title vietnameseTitle lesson activityType difficulty questionCount pointsPerQuestion instructions starConfig ageGroupCode').lean(); res.json({ success: true, data: { books: await CurriculumBook.find({ active: true }).sort({ bookNumber: 1 }), units: activeUnits, lessons, activities } });
} catch (e) { next(e); } };
exports.getLesson = async (req, res, next) => { try { if (!validId(req.params.id)) return invalid(res, 'Invalid lesson id.'); const lesson = await Lesson.findOne({ _id: req.params.id, status: 'ACTIVE' }).populate('topic').populate('vocabularyItems').populate({ path: 'languageContents', match: { status: 'ACTIVE' } }).populate('curriculumUnits'); if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found.' }); const activities = await Activity.find({ lesson: lesson._id, status: 'ACTIVE' }); res.json({ success: true, data: { ...lesson.toObject(), activities } }); } catch (e) { next(e); } };
exports.getActivity = async (req, res, next) => { try { if (!validId(req.params.id)) return invalid(res, 'Invalid activity id.'); const data = await Activity.findOne({ _id: req.params.id, status: 'ACTIVE' }).populate({ path: 'lesson', populate: ['topic', 'vocabularyItems'] }); if (!data || data.lesson?.status !== 'ACTIVE') return res.status(404).json({ success: false, message: 'Activity not found or lesson inactive.' }); res.json({ success: true, data }); } catch (e) { next(e); } };

exports.createAssignment = require('./teacherAssignmentController').createAssignment;

exports.getAssignments = require('./teacherAssignmentController').getAssignments;

exports.getAssignment = require('./teacherAssignmentController').getAssignment;

exports.reviewAssignmentSubmission = require('./teacherAssignmentController').reviewAssignmentSubmission;

exports.deleteAssignment = require('./teacherAssignmentController').deleteAssignment;

exports.updateAssignment = require('./teacherAssignmentController').updateAssignment;

exports.updateAssignmentStatus = require('./teacherAssignmentController').updateAssignmentStatus;

exports.createTeacherNote = async (req, res, next) => {
  try {
    const { studentId, lessonId, noteType = 'GENERAL', content, isHomeroomOnly = false } = req.body;
    if (!content || !rules.text(content) || !(await getStudent(req, studentId))) return invalid(res, 'A permitted child and note content are required.');
    if (typeof isHomeroomOnly !== 'boolean') return invalid(res, 'Quyền xem ghi chú không hợp lệ.');
    const data = await TeacherNote.create({
      teacher: req.user._id,
      student: studentId,
      lesson: validId(lessonId) ? lessonId : null,
      noteType,
      content: rules.text(content),
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
exports.updateNote = async (req, res, next) => { try {
    if (!validId(req.params.id)) return invalid(res, 'Mã ghi chú không hợp lệ.');
    const note = await TeacherNote.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!note) return res.status(403).json({ success: false, message: 'Chỉ sửa hoặc xóa ghi chú của bạn.' });
    await access.child(req, note.student);
    note.content = rules.text(req.body.content); if (!note.content) rules.fail('Vui lòng nhập nội dung ghi chú.'); if (req.body.noteType) note.noteType = req.body.noteType; await note.save(); res.json({ success: true, data: note });
  } catch(e) { next(e); } };

exports.deleteNote = async (req, res, next) => { try {
    if (!validId(req.params.id)) return invalid(res, 'Mã ghi chú không hợp lệ.');
    const note = await TeacherNote.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!note) return res.status(403).json({ success: false, message: 'Chỉ sửa hoặc xóa ghi chú của bạn.' });
    await access.child(req, note.student);
    await TeacherNote.deleteOne({ _id: note._id, teacher: req.user._id }); res.json({ success: true });
  } catch(e) { next(e); } };

exports.getCurriculumOptions = exports.getContent;

exports.getMySchedule = async (req, res, next) => {
  try {
    const schedules = await Schedule.find({ teacher: req.user._id, ...require('../services/scheduleRules').activeScheduleFilter() })
      .populate('classroom', 'name ageGroupCode academicYear studentCount isActive')
      .populate('teacher', 'name email avatar avatarUrl username')
      .lean();

    res.json({ success: true, count: schedules.length, data: schedules });
  } catch (e) {
    next(e);
  }
};
