const readiness = require('../services/contentReadiness');
const { validateSchedule, activeScheduleFilter, normalizeSchedulePeriod } = require('../services/scheduleRules');
const maintenance = require('./adminMaintenanceController');
const integrity = require('../services/adminIntegrity');
const {
  User,
  Topic,
  Lesson,
  Activity,
  CurriculumBook,
  CurriculumUnit,
  ActivityResult,
  Vocabulary,
  AgeGroup,
  ClassRoom,
  AuditLog,
  ClassroomSession,
  SystemSetting,
  LanguageContent,
  Schedule,
  Attendance
} = require('../models');
const writeAudit = entry => AuditLog.create(entry).catch(error => console.error('[Audit log]', error.message));

// @desc    Get Admin Dashboard KPI metrics
// @route   GET /api/admin/dashboard
// @access  Private / Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalChildren,
      totalTeachers,
      activeTopics,
      activeLessons,
      totalActivities,
      totalVocabulary,
      totalSessions,
      completedSessions,
      totalCurriculumUnits
    ] = await Promise.all([
      User.countDocuments({ role: 'CHILD', status: 'ACTIVE' }),
      User.countDocuments({ role: 'TEACHER', status: 'ACTIVE' }),
      Topic.countDocuments({ status: 'ACTIVE' }),
      Lesson.countDocuments({ status: 'ACTIVE' }),
      Activity.countDocuments({ status: 'ACTIVE' }),
      Vocabulary.countDocuments({ status: 'ACTIVE' }),
      ClassroomSession.countDocuments(),
      ClassroomSession.countDocuments({ status: 'COMPLETED' }),
      CurriculumUnit.countDocuments({ status: 'ACTIVE' })
    ]);

    const recentResults = await ActivityResult.find()
      .populate('child', 'name avatar avatarUrl')
      .populate('activity', 'title activityType')
      .populate('lesson', 'title')
      .sort({ createdAt: -1 })
      .limit(8);

    const completionRate = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

    // Compute today's teaching monitor (check if classes have schedule and if teacher taught)
    const now = new Date();
    const vnDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [h, m] = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }).split(':').map(Number);
    const currentMinutes = h * 60 + m;
    const vnDayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getDay();
    const startOfDay = new Date(`${vnDateStr}T00:00:00+07:00`);
    const endOfDay = new Date(`${vnDateStr}T23:59:59+07:00`);

    const [activeRooms, activeSchedules, todayClassSessions, activeLiveSessions] = await Promise.all([
      ClassRoom.find({ status: 'ACTIVE' }).populate('teacher', 'name email contact').lean(),
      Schedule.find({
        isActive: true,
        $and: [
          { $or: [{ effectiveFrom: null }, { effectiveFrom: { $lte: endOfDay } }] },
          { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: startOfDay } }] }
        ]
      }).lean(),
      ClassroomSession.find({
        $or: [
          { startedAt: { $gte: startOfDay, $lte: endOfDay } },
          { endedAt: { $gte: startOfDay, $lte: endOfDay } },
          { createdAt: { $gte: startOfDay, $lte: endOfDay } },
          { status: 'LIVE' }
        ]
      }).select('classroom status title startedAt endedAt cancellationReason cancellationNote').lean(),
      ClassroomSession.find({ status: 'LIVE' }).populate('teacher', 'name email contact').populate('lesson', 'title').populate('classroom', 'name').lean()
    ]);

    const monitorItems = activeRooms.map(r => {
      const sch = activeSchedules.find(s => String(s.classroom) === String(r._id));
      const slotsToday = (sch?.weeklySlots || []).filter(s => s.dayOfWeek === vnDayOfWeek);
      const sessions = todayClassSessions.filter(s => String(s.classroom) === String(r._id));
      const hasCompleted = sessions.some(s => s.status === 'COMPLETED');
      const liveForRoom = activeLiveSessions.find(ls => String(ls.classroom?._id || ls.classroom) === String(r._id));
      const hasLive = Boolean(liveForRoom) || sessions.some(s => s.status === 'LIVE');
      const cancelledSession = sessions.find(s => s.status === 'CANCELLED');

      let status = 'NO_SCHEDULE';
      let note = 'Không có lịch dạy hôm nay';
      if (hasLive) {
        status = 'LIVE';
        note = slotsToday.length > 0 ? `Đang trong giờ dạy (${slotsToday.map(s => `${s.startTime}-${s.endTime}`).join(', ')})` : '🔴 Đang mở buổi dạy trực tiếp';
      } else if (slotsToday.length > 0) {
        const times = slotsToday.map(s => `${s.startTime}-${s.endTime}`).join(', ');
        const earliest = Math.min(...slotsToday.map(s => {
          const [sh, sm] = s.startTime.split(':').map(Number);
          return sh * 60 + sm;
        }));
        if (hasCompleted) { status = 'TAUGHT'; note = `Đã hoàn thành buổi dạy (${times})`; }
        else if (cancelledSession) { status = 'CANCELLED'; note = `Báo nghỉ: ${cancelledSession.cancellationReason || 'Nghỉ theo kế hoạch'} (${times})`; }
        else if (currentMinutes >= earliest) { status = 'MISSED'; note = `⚠️ Có lịch (${times}) nhưng giáo viên chưa dạy!`; }
        else { status = 'UPCOMING'; note = `Sắp tới giờ học (${times})`; }
      }
      return {
        classId: r._id,
        className: r.name,
        ageGroupCode: r.ageGroupCode,
        teacherName: r.teacher?.name || 'Chưa phân công',
        teacherEmail: r.teacher?.email,
        teacherContact: r.teacher?.contact,
        hasSchedule: slotsToday.length > 0,
        slotsToday,
        status,
        note
      };
    });

    const liveItems = monitorItems.filter(m => m.status === 'LIVE');
    const taughtItems = monitorItems.filter(m => m.status === 'TAUGHT');
    const missedItems = monitorItems.filter(m => m.status === 'MISSED');
    const upcomingItems = monitorItems.filter(m => m.status === 'UPCOMING');
    const cancelledItems = monitorItems.filter(m => m.status === 'CANCELLED');
    const scheduledTodayItems = monitorItems.filter(m => m.hasSchedule);

    const teachingMonitor = {
      items: monitorItems,
      alerts: missedItems.map(m => ({ classroomId: m.classId, classroomName: m.className, teacherName: m.teacherName })),
      scheduledTodayCount: scheduledTodayItems.length,
      taughtCount: taughtItems.length,
      missedCount: missedItems.length,
      cancelledCount: cancelledItems.length,
      liveCount: liveItems.length,
      upcomingCount: upcomingItems.length,
      cancelledSessions: cancelledItems.map(c => ({
        classroomId: c.classId,
        classroomName: c.className,
        teacherName: c.teacherName,
        teacherEmail: c.teacherEmail,
        note: c.note,
        slots: c.slotsToday
      })),
      liveSessions: activeLiveSessions.map(ls => ({
        sessionId: ls._id,
        classroomId: ls.classroom?._id || ls.classroom,
        classroomName: ls.classroom?.name || 'Lớp học',
        teacherName: ls.teacher?.name || 'Giáo viên',
        lessonTitle: ls.lesson?.title || ls.title || 'Buổi học',
        startedAt: ls.startedAt
      }))
    };

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalChildren,
          totalTeachers,
          activeTopics,
          activeLessons,
          totalActivities,
          totalVocabulary,
          totalCurriculumUnits,
          totalSessions,
          completedSessions,
          completionRate
        },
        recentResults,
        teachingMonitor
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get full Curriculum (3 Books & 27 Units)
// @route   GET /api/admin/curriculum
// @access  Private / Admin
const getCurriculum = async (req, res, next) => {
  try {
    const books = await CurriculumBook.find().sort({ bookNumber: 1 }).lean();
    const units = await CurriculumUnit.find().sort({ bookNumber: 1, unitNumber: 1 }).lean();

    const curriculumTree = books.map(book => ({
      ...book,
      units: units.filter(u => u.bookNumber === book.bookNumber)
    }));

    res.status(200).json({
      success: true,
      data: curriculumTree
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Users with search and role filter
// @route   GET /api/admin/users
// @access  Private / Admin
const getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const query = {};

    if (role && role !== 'ALL') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: integrity.escapeRegex(search), $options: 'i' } },
        { email: { $regex: integrity.escapeRegex(search), $options: 'i' } },
        { username: { $regex: integrity.escapeRegex(search), $options: 'i' } }
      ];
    }

    // §1.1.9 — sort A-Z (Vietnamese collation) + pagination instead of fixed order/limit
    const [rawUsers, total, activeTeacherRooms] = await Promise.all([
      User.find(query)
        .select('-password -pin')
        .populate('assignedClass', 'name academicYear ageGroupCode')
        .populate('assignedClasses', 'name academicYear ageGroupCode')
        .populate('ageGroup', 'name code')
        .sort({ name: 1 })
        .collation({ locale: 'vi', strength: 2 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
      ClassRoom.find({ status: { $in: ['ACTIVE', 'UPCOMING'] }, deletionPending: { $ne: true } })
        .select('name academicYear ageGroupCode teacher')
        .lean()
    ]);

    const teacherRoomsMap = new Map();
    for (const room of activeTeacherRooms) {
      const tId = String(room.teacher || '');
      if (!tId) continue;
      if (!teacherRoomsMap.has(tId)) teacherRoomsMap.set(tId, []);
      teacherRoomsMap.get(tId).push({
        _id: room._id,
        name: room.name,
        academicYear: room.academicYear,
        ageGroupCode: room.ageGroupCode
      });
    }

    const users = rawUsers.map(u => {
      if (u.role === 'TEACHER') {
        const rooms = teacherRoomsMap.get(String(u._id)) || [];
        return {
          ...u,
          assignedClasses: rooms,
          assignedClass: rooms[0] || u.assignedClass || null
        };
      }
      return u;
    });

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Teacher account
// @route   POST /api/admin/teachers
// @access  Private / Admin
const createTeacher = maintenance.createTeacher;

// @desc    Create new Child account with DOB validation
// @route   POST /api/admin/children
// @access  Private / Admin
const createChild = maintenance.createChild;

// @desc    Toggle User lock/unlock status (Soft-delete / Disable)
// @route   PATCH /api/admin/users/:id/status
// @access  Private / Admin
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    if (user.role === 'TEACHER' && await ClassRoom.exists({ teacher: user._id, status: { $in: ['ACTIVE', 'UPCOMING'] } })) throw integrity.fail('Hãy phân công giáo viên thay thế trước khi ngừng tài khoản.');
    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Không thể khóa tài khoản quản trị viên chính.' });
    }

    const newStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    user.status = newStatus;
    await user.save();

    // Log action
    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: newStatus === 'LOCKED' ? 'LOCK_USER' : 'UNLOCK_USER',
        targetType: 'User',
        targetId: user._id,
        details: { name: user.name, role: user.role, newStatus }
      });
    }

    res.status(200).json({
      success: true,
      message: newStatus === 'LOCKED' ? `Đã tạm khóa tài khoản ${user.name}` : `Đã mở khóa tài khoản ${user.name}`,
      data: { id: user._id, status: user.status }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Audit Logs
// @route   GET /api/admin/audit-logs
// @access  Private / Admin
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, targetType, search, startDate, endDate } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));

    const filter = {};
    if (action && action !== 'ALL') {
      filter.action = action;
    }
    if (targetType && targetType !== 'ALL') {
      filter.targetType = targetType;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate + 'T00:00:00+07:00');
        if (!Number.isFinite(+filter.createdAt.$gte)) throw integrity.fail('Ngày bắt đầu không hợp lệ.');
      }
      if (endDate) {
        const eDate = new Date(endDate + 'T23:59:59.999+07:00');
        if (!Number.isFinite(+eDate)) throw integrity.fail('Ngày kết thúc không hợp lệ.');
        filter.createdAt.$lte = eDate;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(integrity.escapeRegex(search.trim()), 'i');
      const matchingUsers = await User.find({
        $or: [{ name: regex }, { email: regex }, { username: regex }]
      }).select('_id').lean();
      const userIds = matchingUsers.map(u => u._id);

      filter.$or = [
        { action: regex },
        { targetType: regex },
        ...(userIds.length > 0 ? [{ user: { $in: userIds } }] : []),
        { 'details.name': regex },
        { 'details.className': regex },
        { 'details.unitTitle': regex },
        { 'details.lessonTitle': regex },
        { 'details.english': regex },
        { 'details.vietnamese': regex },
        { 'details.note': regex }
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('user', 'name email role username avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Topic active/inactive status
// @route   PATCH /api/admin/topics/:id/status
// @access  Private / Admin
const toggleTopicStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const topic = await Topic.findById(id);

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Chủ đề không tồn tại.' });
    }

    if(topic.status==='ACTIVE')await readiness.assertNotAssigned({lesson:{$in:await Lesson.find({topic:topic._id}).distinct('_id')}});
    topic.status = topic.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await topic.save();

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'TOGGLE_TOPIC',
        targetType: 'Topic',
        targetId: topic._id,
        details: { slug: topic.slug, status: topic.status }
      });
    }

    res.status(200).json({
      success: true,
      message: `Chủ đề ${topic.englishName} hiện là: ${topic.status}`,
      data: topic
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CLASSROOM MANAGEMENT (Admin phân chia lớp học)
// ==========================================

// @desc    Get all Classrooms with assigned teachers & student counts
// @route   GET /api/admin/classrooms
// @access  Private / Admin
const getClassrooms = async (req, res, next) => {
  try {
    const classrooms = await ClassRoom.find()
      .populate('teacher', 'name email username avatar avatarUrl contact')
      .populate('students', 'name username avatar avatarUrl ageGroupCode dob contact status')
      .populate('ageGroup', 'name code')
      .populate('currentLesson', 'title vietnameseTitle displayOrder')
      .sort({ createdAt: -1 })
      .lean();

    const classIds = classrooms.map(c => c._id);
    const now = new Date();
    const vnDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [h, m] = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }).split(':').map(Number);
    const currentMinutes = h * 60 + m;
    const vnDayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getDay();
    const startOfDay = new Date(`${vnDateStr}T00:00:00+07:00`);
    const endOfDay = new Date(`${vnDateStr}T23:59:59+07:00`);

    const [schedules, todaySessions, liveSessions] = await Promise.all([
      Schedule.find({
        classroom: { $in: classIds },
        isActive: true,
        $and: [
          { $or: [{ effectiveFrom: null }, { effectiveFrom: { $lte: endOfDay } }] },
          { $or: [{ effectiveTo: null }, { effectiveTo: { $gte: startOfDay } }] }
        ]
      })
        .populate('weeklySlots.lesson', 'title vietnameseTitle')
        .lean(),
      ClassroomSession.find({
        classroom: { $in: classIds },
        $or: [
          { startedAt: { $gte: startOfDay, $lte: endOfDay } },
          { endedAt: { $gte: startOfDay, $lte: endOfDay } },
          { createdAt: { $gte: startOfDay, $lte: endOfDay } },
          { status: 'LIVE' },
          { status: 'CANCELLED' }
        ]
      }).select('classroom status startedAt endedAt title cancellationReason cancellationNote cancelledBy cancelledAt').lean(),
      ClassroomSession.find({ classroom: { $in: classIds }, status: 'LIVE' }).select('classroom status startedAt title').lean()
    ]);

    const formatted = classrooms.map(c => {
      const sch = schedules.find(s => String(s.classroom) === String(c._id));
      const slotsToday = (sch?.weeklySlots || []).filter(s => s.dayOfWeek === vnDayOfWeek);
      const sessions = todaySessions.filter(s => String(s.classroom) === String(c._id));
      const hasCompleted = sessions.some(s => s.status === 'COMPLETED');
      const hasLive = liveSessions.some(ls => String(ls.classroom) === String(c._id)) || sessions.some(s => s.status === 'LIVE');

      let todayTeachingStatus = 'NO_SCHEDULE';
      let todayTeachingNote = 'Hôm nay không có lịch học';
      let hasScheduleToday = false;
      let todayScheduledLesson = null;

      const times = slotsToday.map(s => `${s.startTime}-${s.endTime}`).join(', ');

      if (hasLive) {
        todayTeachingStatus = 'LIVE';
        todayTeachingNote = slotsToday.length > 0 ? `Đang trong giờ dạy trực tiếp (${times})` : '🔴 Đang mở buổi dạy trực tiếp';
      } else if (slotsToday.length > 0) {
        hasScheduleToday = true;
        const s0 = slotsToday[0];
        todayScheduledLesson = {
          lessonId: s0.lesson?._id || s0.lesson || null,
          lessonNumber: s0.lessonNumber || null,
          lessonTitle: s0.lessonTitle || s0.lesson?.title || ''
        };

        const earliest = Math.min(...slotsToday.map(s => {
          const [sh, sm] = s.startTime.split(':').map(Number);
          return sh * 60 + sm;
        }));

        const cancelledSession = sessions.find(s => s.status === 'CANCELLED');

        if (hasCompleted) {
          todayTeachingStatus = 'TAUGHT';
          todayTeachingNote = `Đã hoàn thành buổi dạy (${times})`;
        } else if (cancelledSession) {
          todayTeachingStatus = 'CANCELLED';
          todayTeachingNote = `🚫 Đã báo nghỉ (${times}): ${cancelledSession.cancellationReason || 'Nghỉ theo kế hoạch'}`;
        } else if (currentMinutes >= earliest) {
          todayTeachingStatus = 'MISSED';
          todayTeachingNote = `⚠️ Có lịch (${times}) nhưng giáo viên chưa dạy!`;
        } else {
          todayTeachingStatus = 'UPCOMING';
          todayTeachingNote = `Sắp tới giờ học (${times})`;
        }
      }

      return {
        ...c,
        studentCount: c.students ? c.students.length : 0,
        hasScheduleToday,
        todaySlots: slotsToday,
        todayTeachingStatus,
        todayTeachingNote,
        todayScheduledLesson,
        scheduleId: sch?._id || null
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

// Helper to create and assign students from parsed Excel rows
const helperCreateStudentsFromList = async (students, classroomId, defaultAgeGroupCode = '3-4') => {
  const room = classroomId ? await integrity.classroom(String(classroomId)) : null;
  return integrity.importStudents(students, room, defaultAgeGroupCode);
};

// @desc    Bulk create child accounts from Excel data
// @route   POST /api/admin/children/bulk-import
// @access  Private / Admin
const bulkImportChildren = maintenance.bulkImportChildren;


// @desc    Create new Classroom with assigned teacher and optional initial Excel students
// @route   POST /api/admin/classrooms
// @access  Private / Admin
const createClassroom = async (req, res, next) => {
  let createdRoom;
  try {
    const { name, ageGroupCode, teacherId, academicYear, description, students } = req.body;
    if (!name || !ageGroupCode || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên lớp, độ tuổi (3-4, 4-5, 5-6) và giáo viên phụ trách.'
      });
    }

    const cleanName = String(name).normalize('NFC').trim().replace(/\s+/gu, ' ');
    if (!cleanName) {
      return res.status(400).json({
        success: false,
        message: 'Tên lớp học không được để trống.'
      });
    }

    // 1. Check duplicate class name (case-insensitive)
    const existingName = await ClassRoom.findOne({
      name: { $regex: new RegExp(`^${cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    });
    if (existingName) {
      return res.status(400).json({
        success: false,
        message: `Tên lớp "${cleanName}" đã tồn tại trên hệ thống. Vui lòng đặt tên khác không bị trùng!`
      });
    }

    // 2. Validate teacher (1 teacher can teach multiple classes)
    const teacher = await User.findOne({ _id: teacherId, role: 'TEACHER', status: 'ACTIVE' });
    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: 'Giáo viên phụ trách không hợp lệ.'
      });
    }

    const ageGroupDoc = await AgeGroup.findOne({ code: ageGroupCode });
    const bookNumber = ageGroupCode === '3-4' ? 1 : ageGroupCode === '4-5' ? 2 : 3;
    const curriculumBookDoc = await CurriculumBook.findOne({ bookNumber });

    // Find initial lesson for this age group / book
    let initialLessonId = null;
    if (curriculumBookDoc) {
      const firstUnit = await CurriculumUnit.findOne({ book: curriculumBookDoc._id }).sort({ unitNumber: 1 });
      if (firstUnit) {
        const firstLesson = await Lesson.findOne({
          curriculumUnits: firstUnit._id,
          status: 'ACTIVE'
        }).sort({ displayOrder: 1, createdAt: 1 });
        if (firstLesson) initialLessonId = firstLesson._id;
      }
    }

    const classroom = await ClassRoom.create({
      name: cleanName,
      ageGroupCode,
      ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
      curriculumBook: curriculumBookDoc ? curriculumBookDoc._id : undefined,
      currentLesson: initialLessonId || undefined,
      completedLessons: [],
      teacher: teacher._id,
      academicYear: academicYear || (await SystemSetting.findOne().lean())?.academicYear || '2026-2027',
      description: description || '',
      status: 'ACTIVE',
      students: []
    });

    createdRoom = classroom;
    let credentials = [];
    let initialImportedCount = 0;
    if (Array.isArray(students) && students.length > 0) {
      const imported = await helperCreateStudentsFromList(students, classroom._id, ageGroupCode, ageGroupDoc);
      const { createdUsers } = imported;
      credentials = imported.credentials;
      if (createdUsers.length > 0) {
        classroom.students = createdUsers.map(u => u._id);
        await classroom.save();
        initialImportedCount = createdUsers.length;
      }
    }

    await integrity.syncTeacher(classroom, classroom.teacher);
    await classroom.populate('teacher', 'name email username avatar avatarUrl');
    await classroom.populate('students', 'name username avatar avatarUrl ageGroupCode dob contact');
    await classroom.populate('currentLesson', 'title vietnameseTitle displayOrder');

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'CREATE_CLASSROOM',
        targetType: 'ClassRoom',
        targetId: classroom._id,
        details: {
          name: classroom.name,
          teacher: teacher.name,
          ageGroupCode,
          initialImportedStudents: initialImportedCount
        }
      });
    }

    res.status(201).json({
      success: true,
      message: initialImportedCount > 0
        ? `Tạo lớp học ${classroom.name} và nạp thành công ${initialImportedCount} học sinh từ file Excel!`
        : `Tạo lớp học ${classroom.name} và phân công cho giáo viên ${teacher.name} thành công!`,
      credentials,
      data: classroom
    });
  } catch (error) {
    if (createdRoom) {
      await User.deleteMany({ role: 'CHILD', assignedClass: createdRoom._id });
      await User.updateMany({ role: 'TEACHER', assignedClass: createdRoom._id }, { $unset: { assignedClass: 1 } });
      await ClassRoom.deleteOne({ _id: createdRoom._id });
    }
    next(error);
  }
};

// @desc    Update classroom details or reassign teacher
// @route   PUT /api/admin/classrooms/:id
// @access  Private / Admin
const updateClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, ageGroupCode, teacherId, academicYear, description, status, currentLessonId } = req.body;

    const classroom = await ClassRoom.findById(id);
    if (classroom?.deletionPending) throw integrity.fail('Lớp đang được xóa. Hãy hoàn tất thao tác xóa trước khi chỉnh sửa.');
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    // Check unique name if name is changing
    if (name !== undefined) {
      const cleanName = String(name).normalize('NFC').trim().replace(/\s+/gu, ' ');
      if (!cleanName) throw integrity.fail('Tên lớp học không được để trống.');
      const duplicateName = await ClassRoom.findOne({
        name: { $regex: new RegExp(`^${cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        _id: { $ne: id }
      });
      if (duplicateName) {
        return res.status(400).json({
          success: false,
          message: `Tên lớp "${cleanName}" đã trùng với lớp khác. Vui lòng chọn tên khác!`
        });
      }
      classroom.name = cleanName;
    }

    if (ageGroupCode && ageGroupCode !== classroom.ageGroupCode) {
      classroom.ageGroupCode = ageGroupCode;
      classroom.currentLesson = null;
      classroom.completedLessons = [];
      const ag = await AgeGroup.findOne({ code: ageGroupCode });
      if (ag) classroom.ageGroup = ag._id;
      const bookNumber = ageGroupCode === '3-4' ? 1 : ageGroupCode === '4-5' ? 2 : 3;
      const bookDoc = await CurriculumBook.findOne({ bookNumber });
      if (bookDoc) classroom.curriculumBook = bookDoc._id;
    }

    // Teacher 1-1 rule check
    if (teacherId && String(teacherId) !== String(classroom.teacher)) {
      const teacher = await User.findOne({ _id: teacherId, role: 'TEACHER' });
      if (!teacher) {
        return res.status(400).json({ success: false, message: 'Giáo viên phụ trách không hợp lệ.' });
      }
      classroom.teacher = teacher._id;
    }

    if (currentLessonId) {
      if (!await Lesson.exists({ _id: currentLessonId, ageGroupCode: classroom.ageGroupCode, status: 'ACTIVE' })) throw integrity.fail('Bài học không phù hợp với nhóm tuổi của lớp.');
      classroom.currentLesson = currentLessonId;
    }

    if (academicYear) classroom.academicYear = academicYear;
    if (description !== undefined) classroom.description = description;
    if (status && ['ACTIVE', 'INACTIVE', 'COMPLETED', 'UPCOMING'].includes(status)) {
      classroom.status = status;
    }

    await integrity.syncTeacher(classroom, classroom.teacher);
    await User.updateMany({ role: 'CHILD', assignedClass: classroom._id }, { $set: { ageGroupCode: classroom.ageGroupCode, ageGroup: classroom.ageGroup } });
    await classroom.populate('teacher', 'name email username avatar avatarUrl');
    await classroom.populate('students', 'name username avatar avatarUrl ageGroupCode dob contact');
    await classroom.populate('currentLesson', 'title vietnameseTitle displayOrder');

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'UPDATE_CLASSROOM',
        targetType: 'ClassRoom',
        targetId: classroom._id,
        details: {
          name: classroom.name,
          status: classroom.status,
          ageGroupCode: classroom.ageGroupCode,
          academicYear: classroom.academicYear
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin phân công lớp học thành công!',
      data: classroom
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete classroom permanently and cascade delete all its students cleanly
// @route   DELETE /api/admin/classrooms/:id
// @access  Private / Admin
const deleteClassroom = maintenance.deleteClassroom;

// @desc    Assign students to classroom
// @route   POST /api/admin/classrooms/:id/assign-students
// @access  Private / Admin
const assignStudentsToClassroom = maintenance.assignStudentsToClassroom;

// @desc    Update user details (name, email, dob, contact, ageGroupCode, assignedClass, status)
// @route   PUT /api/admin/users/:id
// @access  Private / Admin
const updateUser = maintenance.updateUser;

// @desc    Reset 4-digit PIN for student
// @route   POST /api/admin/users/:id/reset-pin
// @access  Private / Admin
const resetChildPin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    if (!pin || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'Mã PIN mới phải đúng 4 chữ số (0-9).' });
    }

    const child = await User.findOne({ _id: id, role: 'CHILD' });
    if (!child) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản học sinh.' });
    }

    child.pin = pin;
    child.authVersion = (child.authVersion || 0) + 1;
    child.password = pin; // Allows PIN as password
    await child.save();

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'RESET_PIN',
        targetType: 'User',
        targetId: child._id,
        details: { name: child.name, role: 'CHILD' }
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã đặt lại mã PIN cho học sinh ${child.name} thành công!`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete / deactivate user
// @route   DELETE /api/admin/users/:id
// @access  Private / Admin
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    if (user.role === 'TEACHER' && await ClassRoom.exists({ teacher: user._id, status: { $in: ['ACTIVE', 'UPCOMING'] } })) throw integrity.fail('Hãy phân công giáo viên thay thế trước khi ngừng tài khoản.');
    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên chính.' });
    }

    user.status = 'INACTIVE';
    await user.save();

    if (user.role === 'CHILD') {
      await ClassRoom.updateMany({ students: user._id }, { $pull: { students: user._id } });
      await User.updateOne({ _id: user._id }, { $unset: { assignedClass: 1 } });
    }

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'DELETE_USER',
        targetType: 'User',
        targetId: user._id,
        details: { name: user.name, role: user.role }
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã hủy kích hoạt tài khoản ${user.name}.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed curriculum tree (Books -> Units -> Lessons -> Vocab & Activities count)
// @route   GET /api/admin/curriculum/deep
// @access  Private / Admin
const getDeepCurriculum = async (req, res, next) => {
  try {
    const [books, units, lessons, activities, vocabularies, sentences] = await Promise.all([
      CurriculumBook.find().sort({ bookNumber: 1 }).lean(),
      CurriculumUnit.find().sort({ bookNumber: 1, unitNumber: 1 }).lean(),
      Lesson.find().populate('topic', 'title englishName').sort({ displayOrder: 1 }).lean(),
      Activity.find().select('lesson activityType title status maxScore').lean(),
      Vocabulary.find().select('_id english vietnamese pronunciation meaning audioUrl imageUrl animationUrl isTransparent visualType wordType mediaSource mediaLicense category status sourceUnits topics lesson').lean(),
      LanguageContent.find().select('_id lesson sourceUnit topic vocabulary english vietnamese pronunciation contentType difficulty status pairId relatedQuestion').lean()
    ]);

    // Fast lookup maps
    const vocabMap = new Map();
    vocabularies.forEach(v => {
      vocabMap.set(v._id.toString(), {
        ...v,
        word: v.english || v.word,
        english: v.english || v.word
      });
    });

    const sentenceMap = new Map();
    sentences.forEach(s => {
      sentenceMap.set(s._id.toString(), s);
    });

    const deepTree = books.map(book => {
      const bookUnits = units.filter(u => u.bookNumber === book.bookNumber);
      const unitsWithLessons = bookUnits.map(unit => {
        const unitLessons = lessons.filter(l => 
          l.curriculumUnits && l.curriculumUnits.some(cu => cu.toString() === unit._id.toString())
        );

        const lessonsWithMeta = unitLessons.map(lesson => {
          const lessonActs = activities.filter(a => a.lesson && a.lesson.toString() === lesson._id.toString());

          // 1. Resolve lesson vocabulary: via lesson.vocabularyItems or direct lesson reference
          let lessonVocab = [];
          if (Array.isArray(lesson.vocabularyItems) && lesson.vocabularyItems.length > 0) {
            lessonVocab = lesson.vocabularyItems
              .map(vId => vocabMap.get(vId.toString()))
              .filter(Boolean);
          }
          const directVocabs = vocabularies.filter(v => v.lesson && v.lesson.toString() === lesson._id.toString());
          directVocabs.forEach(dv => {
            if (!lessonVocab.some(lv => lv._id.toString() === dv._id.toString())) {
              lessonVocab.push(vocabMap.get(dv._id.toString()) || dv);
            }
          });

          // 2. Resolve lesson sentences: via lesson.languageContents or direct lesson reference
          let lessonSentences = [];
          if (Array.isArray(lesson.languageContents) && lesson.languageContents.length > 0) {
            lessonSentences = lesson.languageContents
              .map(sId => sentenceMap.get(sId.toString()))
              .filter(Boolean);
          }
          const directSentences = sentences.filter(s => s.lesson && s.lesson.toString() === lesson._id.toString());
          directSentences.forEach(ds => {
            if (!lessonSentences.some(ls => ls._id.toString() === ds._id.toString())) {
              lessonSentences.push(sentenceMap.get(ds._id.toString()) || ds);
            }
          });

          return {
            ...lesson,
            activityCount: lessonActs.length,
            vocabularyCount: lessonVocab.length,
            sentenceCount: lessonSentences.length,
            activities: lessonActs.slice(0, 5),
            vocabulary: lessonVocab,
            sentences: lessonSentences
          };
        });

        return {
          ...unit,
          lessons: lessonsWithMeta
        };
      });

      return {
        ...book,
        units: unitsWithLessons
      };
    });

    res.status(200).json({
      success: true,
      data: deepTree,
      summary: {
        totalBooks: books.length,
        totalUnits: units.length,
        totalLessons: lessons.length,
        totalActivities: activities.length,
        totalVocabulary: vocabularies.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Lesson active/inactive status
// @route   PATCH /api/admin/lessons/:id/status
// @access  Private / Admin
const toggleLessonStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại.' });
    }

    if (lesson.status === 'ACTIVE') await readiness.assertNotAssigned({lesson:lesson._id});
    else await readiness.assertPublishable(lesson);
    lesson.status = lesson.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await lesson.save();

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'TOGGLE_LESSON',
        targetType: 'Lesson',
        targetId: lesson._id,
        details: { title: lesson.title, status: lesson.status }
      });
    }

    res.status(200).json({
      success: true,
      message: `Bài học "${lesson.title}" hiện là: ${lesson.status}`,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive system analytics for Admin
// @route   GET /api/admin/analytics/overview
// @access  Private / Admin
const getAdminAnalytics = maintenance.getAdminAnalytics;

// @desc    Get or initialize System Settings
// @route   GET /api/admin/settings
// @access  Private / Admin
const getSystemSettings = async (req, res, next) => {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update System Settings
// @route   PUT /api/admin/settings
// @access  Private / Admin
const updateSystemSettings = async (req, res, next) => {
  try {
    const allowed = Object.fromEntries(['schoolName', 'academicYear', 'contactPhone', 'contactEmail', 'address'].filter(key => req.body[key] !== undefined).map(key => [key, String(req.body[key]).trim()]));
    if (allowed.schoolName === '' || allowed.academicYear === '') throw integrity.fail('Tên trường và năm học không được để trống.');
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting(allowed);
    } else {
      Object.assign(settings, allowed);
    }
    if (req.user) settings.updatedBy = req.user._id;
    await settings.save();

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'UPDATE_SETTINGS',
        targetType: 'Settings',
        details: req.body
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật cấu hình hệ thống thành công!',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CURRICULUM UNIT CRUD (Admin quản lý Units)
// ==========================================

// @desc    Create new Curriculum Unit
// @route   POST /api/admin/curriculum/units
// @access  Private / Admin
const createUnit = async (req, res, next) => {
  try {
    const { bookNumber, unitNumber, bigQuestion, storyTitle, values, concept, oracy, displayOrder } = req.body;
    if (!bookNumber || !unitNumber || !bigQuestion) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp số sách (1, 2, 3), số thứ tự Unit (1-9) và Big Question.'
      });
    }

    const bNum = Number(bookNumber);
    const uNum = Number(unitNumber);
    const ageGroupCode = bNum === 1 ? '3-4' : bNum === 2 ? '4-5' : '5-6';
    const bookDoc = await CurriculumBook.findOne({ bookNumber: bNum });
    const ageGroupDoc = await AgeGroup.findOne({ code: ageGroupCode });

    const existingUnit = await CurriculumUnit.findOne({ bookNumber: bNum, unitNumber: uNum });
    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: `Unit ${uNum} của Sách ${bNum} đã tồn tại.`
      });
    }

    const unit = await CurriculumUnit.create({
      book: bookDoc ? bookDoc._id : undefined,
      bookNumber: bNum,
      unitNumber: uNum,
      ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
      ageGroupCode,
      bigQuestion: bigQuestion.trim(),
      storyTitle: storyTitle ? storyTitle.trim() : `Unit ${uNum} Story`,
      values: values || '',
      concept: concept || '',
      oracy: oracy || '',
      displayOrder: displayOrder || uNum,
      status: 'ACTIVE'
    });

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'CREATE_CURRICULUM_UNIT',
        targetType: 'CurriculumUnit',
        targetId: unit._id,
        details: { bookNumber: bNum, unitNumber: uNum, bigQuestion }
      });
    }

    res.status(201).json({
      success: true,
      message: `Tạo Unit ${unit.unitNumber} (Sách ${unit.bookNumber}) thành công!`,
      data: unit
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Curriculum Unit
// @route   PUT /api/admin/curriculum/units/:id
// @access  Private / Admin
const updateUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bigQuestion, storyTitle, values, concept, oracy, displayOrder, status } = req.body;

    const unit = await CurriculumUnit.findById(id);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit không tồn tại.' });
    }

    if (bigQuestion) unit.bigQuestion = bigQuestion.trim();
    if (storyTitle !== undefined) unit.storyTitle = storyTitle.trim();
    if (values !== undefined) unit.values = values;
    if (concept !== undefined) unit.concept = concept;
    if (oracy !== undefined) unit.oracy = oracy;
    if (displayOrder !== undefined) unit.displayOrder = displayOrder;
    if(status && status!=='ACTIVE' && await Lesson.exists({curriculumUnits:unit._id,status:'ACTIVE'}))throw integrity.fail('Tạm ngừng các bài đang mở trước khi lưu trữ Unit.',409);
    if (status) unit.status = status;

    await unit.save();

    res.status(200).json({
      success: true,
      message: `Cập nhật Unit ${unit.unitNumber} thành công!`,
      data: unit
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Curriculum Unit
// @route   DELETE /api/admin/curriculum/units/:id
// @access  Private / Admin
const deleteUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await CurriculumUnit.findById(id);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Unit không tồn tại.' });
    }

    const attachedLessons = await Lesson.countDocuments({ curriculumUnits: unit._id, status: { $in: ['ACTIVE', 'UPCOMING'] } });
    if (attachedLessons > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa Unit này vì đang có ${attachedLessons} bài học thuộc Unit. Vui lòng chuyển bài học sang Unit khác trước.`
      });
    }

    unit.status = 'INACTIVE';
    await unit.save();

    res.status(200).json({
      success: true,
      message: `Đã lưu trữ Unit ${unit.unitNumber}; lịch sử và liên kết được giữ lại.`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CURRICULUM LESSON CRUD (Admin quản lý bài học)
// ==========================================

// @desc    Create new Lesson
// @route   POST /api/admin/curriculum/lessons
// @access  Private / Admin
const createLesson = async (req, res, next) => {
  try {
    const { title, vietnameseTitle, description, ageGroupCode, topicId, unitId, displayOrder, difficulty } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề bài học.' });
    }

    let resolvedTopicId = topicId;
    if (!resolvedTopicId) {
      const firstTopic = await Topic.findOne({ status: 'ACTIVE' });
      resolvedTopicId = firstTopic ? firstTopic._id : undefined;
    }

    const unitDoc = unitId ? await CurriculumUnit.findById(unitId) : null;
    if (unitId && !unitDoc) throw integrity.fail('Unit không tồn tại.');
    const finalAgeGroupCode = ageGroupCode || unitDoc?.ageGroupCode || '3-4';
    if (unitDoc && unitDoc.ageGroupCode !== finalAgeGroupCode) throw integrity.fail('Nhóm tuổi của bài phải khớp Unit.');
    const ageGroupDoc = await AgeGroup.findOne({ code: finalAgeGroupCode });

    const lesson = await Lesson.create({
      title: title.trim(),
      vietnameseTitle: vietnameseTitle ? vietnameseTitle.trim() : '',
      description: description || '',
      topic: resolvedTopicId,
      ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
      ageGroupCode: finalAgeGroupCode,
      curriculumUnits: unitId ? [unitId] : [],
      displayOrder: displayOrder || 0,
      difficulty: difficulty || 1,
      status: 'DRAFT'
    });

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'CREATE_LESSON',
        targetType: 'Lesson',
        targetId: lesson._id,
        details: { title: lesson.title, ageGroupCode: finalAgeGroupCode }
      });
    }

    res.status(201).json({
      success: true,
      message: `Tạo bài học "${lesson.title}" thành công!`,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Lesson
// @route   PUT /api/admin/curriculum/lessons/:id
// @access  Private / Admin
const updateLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, vietnameseTitle, description, topicId, unitId, ageGroupCode, displayOrder, difficulty, status } = req.body;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại.' });
    }

    await readiness.assertNotAssigned({lesson:lesson._id});
    if (title) lesson.title = title.trim();
    if (vietnameseTitle !== undefined) lesson.vietnameseTitle = vietnameseTitle.trim();
    if (description !== undefined) lesson.description = description;
    if (topicId) lesson.topic = topicId;
    if (unitId) {
      const unit = await CurriculumUnit.findById(unitId);
      if (!unit) throw integrity.fail('Unit không tồn tại.');
      lesson.curriculumUnits = [unitId];
      lesson.ageGroupCode = unit.ageGroupCode;
      lesson.ageGroup = unit.ageGroup;
    }
    if (ageGroupCode) {
      lesson.ageGroupCode = ageGroupCode;
      const ag = await AgeGroup.findOne({ code: ageGroupCode });
      if (ag) lesson.ageGroup = ag._id;
    }
    if (displayOrder !== undefined) lesson.displayOrder = displayOrder;
    if (difficulty !== undefined) lesson.difficulty = difficulty;
    if (req.body.vocabularyItems !== undefined) lesson.vocabularyItems = req.body.vocabularyItems;
    if (status && status !== 'ACTIVE') await readiness.assertNotAssigned({lesson:lesson._id});
    if (status) lesson.status = status;
    if (lesson.status === 'ACTIVE') await readiness.assertPublishable(lesson);
    await lesson.save();

    res.status(200).json({
      success: true,
      message: `Cập nhật bài học "${lesson.title}" thành công!`,
      data: lesson
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Lesson
// @route   DELETE /api/admin/curriculum/lessons/:id
// @access  Private / Admin
const deleteLesson = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại.' });
    }

    await readiness.assertNotAssigned({lesson:lesson._id});
    lesson.status = 'INACTIVE';
    await lesson.save();

    res.status(200).json({
      success: true,
      message: `Đã chuyển bài học "${lesson.title}" sang trạng thái ngừng hoạt động.`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CURRICULUM VOCABULARY CRUD (Admin quản lý từ vựng)
// ==========================================

// @desc    Create new Vocabulary
// @route   POST /api/admin/curriculum/vocabularies
// @access  Private / Admin
const createVocabulary = async (req, res, next) => {
  try {
    const { english, vietnamese, pronunciation, category, ageGroupCodes, sourceUnits, lessonId } = req.body;
    if (!english || !vietnamese) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp từ tiếng Anh và nghĩa tiếng Việt.' });
    }

    const targetLesson=lessonId?await Lesson.findOne({_id:lessonId,status:{$ne:'ACTIVE'}}):null;
    if (lessonId && !targetLesson) throw integrity.fail('Chỉ thêm từ vào bài nháp/tạm ngừng.');
    const media = {mediaSource:String(req.body.mediaSource||'').slice(0,500),mediaLicense:String(req.body.mediaLicense||'').slice(0,200),imageUrl:req.body.imageUrl || '',audioUrl:req.body.audioUrl || '',wordType:req.body.wordType || 'noun',isTransparent:req.body.isTransparent === true,visualType:req.body.visualType || 'concrete'};
    if (media.imageUrl && !readiness.safeMedia(media.imageUrl) || media.audioUrl && !readiness.safeMedia(media.audioUrl)) throw integrity.fail('URL media phải là HTTPS hoặc đường dẫn nội bộ.');
    const groupCodes=ageGroupCodes || [targetLesson?.ageGroupCode || '3-4'];
    const unitIds=sourceUnits || targetLesson?.curriculumUnits || [];
    if(!Array.isArray(groupCodes)||!groupCodes.length||!Array.isArray(unitIds)) throw integrity.fail('Nhóm tuổi/Unit không hợp lệ.');
    const foundUnits=await CurriculumUnit.find({_id:{$in:unitIds}}).lean();
    if(foundUnits.length!==new Set(unitIds.map(String)).size || foundUnits.some(unit=>!groupCodes.includes(unit.ageGroupCode)) || targetLesson&&!groupCodes.includes(targetLesson.ageGroupCode)) throw integrity.fail('Quan hệ Unit và nhóm tuổi không hợp lệ.');
    const vocab = new Vocabulary({
      english: english.trim(),
      vietnamese: vietnamese.trim(),
      pronunciation: pronunciation ? pronunciation.trim() : '',
      category: category ? category.trim() : 'General',
      ageGroupCodes: groupCodes,
      sourceUnits: unitIds,
      lesson: lessonId || undefined,
      ...media, status: req.body.status === 'ACTIVE' && readiness.safeMedia(media.imageUrl) ? 'ACTIVE' : 'HIDDEN'
    });

    await vocab.validate();
    await require('../services/vocabularyMedia')(vocab);
    await vocab.save();
    if (lessonId) {
      await Lesson.findByIdAndUpdate(lessonId, { $addToSet: { vocabularyItems: vocab._id } });
    }

    res.status(201).json({
      success: true,
      message: `Tạo từ vựng "${vocab.english}" thành công!`,
      data: vocab
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Vocabulary
// @route   PUT /api/admin/curriculum/vocabularies/:id
// @access  Private / Admin
const updateVocabulary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { english, vietnamese, pronunciation, category, ageGroupCodes, status } = req.body;

    const vocab = await Vocabulary.findById(id);
    if (!vocab) {
      return res.status(404).json({ success: false, message: 'Từ vựng không tồn tại.' });
    }

    const beforeMedia={imageUrl:vocab.imageUrl,audioUrl:vocab.audioUrl};
    if (await Lesson.exists({vocabularyItems:vocab._id,status:'ACTIVE'})) throw integrity.fail('Tạm ngừng bài đang sử dụng trước khi sửa học liệu.',409);
    for(const key of ['imageUrl','audioUrl','animationUrl','wordType','visualType','isTransparent','mediaSource','mediaLicense']) if(req.body[key]!==undefined) vocab[key]=req.body[key];
    if(vocab.imageUrl && !readiness.safeMedia(vocab.imageUrl) || vocab.audioUrl && !readiness.safeMedia(vocab.audioUrl)) throw integrity.fail('URL media không hợp lệ.');
    if (english) vocab.english = english.trim();
    if (vietnamese) vocab.vietnamese = vietnamese.trim();
    if (pronunciation !== undefined) vocab.pronunciation = pronunciation.trim();
    if (category !== undefined) vocab.category = category.trim();
    if (ageGroupCodes) vocab.ageGroupCodes = ageGroupCodes;
    if (status) vocab.status = status;

    if(vocab.status==='ACTIVE'&&!readiness.safeMedia(vocab.imageUrl)) throw integrity.fail('Cần ảnh trước khi kích hoạt từ.');
    await vocab.validate();
    await require('../services/vocabularyMedia')(vocab,beforeMedia);
    await vocab.save();

    res.status(200).json({
      success: true,
      message: `Cập nhật từ vựng "${vocab.english}" thành công!`,
      data: vocab
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Vocabulary
// @route   DELETE /api/admin/curriculum/vocabularies/:id
// @access  Private / Admin
const deleteVocabulary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vocab = await Vocabulary.findById(id);
    if (!vocab) {
      return res.status(404).json({ success: false, message: 'Từ vựng không tồn tại.' });
    }

    if (await Lesson.exists({ vocabularyItems: vocab._id, status: 'ACTIVE' })) throw integrity.fail('Ẩn hoặc sửa các bài đang sử dụng từ này trước.', 409);
    vocab.status = 'INACTIVE';
    await vocab.save();

    res.status(200).json({
      success: true,
      message: `Đã lưu trữ từ "${vocab.english}"; lịch sử được giữ lại.`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SENTENCE PATTERNS CRUD (Admin quản lý Mẫu câu)
// ==========================================

// @desc    Get Sentence Patterns with filters & pagination
// @route   GET /api/admin/sentences
// @access  Private / Admin
const getSentencePatterns = async (req, res, next) => {
  try {
    const { ageGroupCode, contentType, unitId, lessonId, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));

    const query = {};
    if (ageGroupCode && ageGroupCode !== 'ALL') query.ageGroupCode = ageGroupCode;
    if (contentType && contentType !== 'ALL') query.contentType = contentType;
    if (unitId && unitId !== 'ALL') query.sourceUnit = unitId;
    if (lessonId && lessonId !== 'ALL') query.lesson = lessonId;

    if (search) {
      query.$or = [
        { english: { $regex: integrity.escapeRegex(search), $options: 'i' } },
        { vietnamese: { $regex: integrity.escapeRegex(search), $options: 'i' } }
      ];
    }

    const [items, total] = await Promise.all([
      LanguageContent.find(query)
        .populate('sourceUnit', 'unitNumber bigQuestion bookNumber')
        .populate('lesson', 'title vietnameseTitle')
        .sort({ ageGroupCode: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      LanguageContent.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: items
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Sentence Pattern (supports single sentences and paired Q&A)
// @route   POST /api/admin/sentences
// @access  Private / Admin
const createSentencePattern = async (req, res, next) => {
  try {
    const {
      contentType,
      english,
      vietnamese,
      pronunciation,
      ageGroupCode,
      sourceUnit,
      lesson,
      difficulty,
      status,
      pairId,
      relatedQuestion,
      isPair,
      answers
    } = req.body;

    if (!english) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp nội dung tiếng Anh.' });
    }

    // CASE 1: Q&A Pair creation (User created Question + paired Answer(s) in one go)
    if (isPair || contentType === 'QA_PAIR' || (Array.isArray(answers) && answers.length > 0)) {
      const generatedPairId = pairId || `pair_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 1. Create Question
      const questionDoc = await LanguageContent.create({
        contentType: 'QUESTION',
        english: english.trim(),
        vietnamese: vietnamese ? vietnamese.trim() : '',
        pronunciation: pronunciation ? pronunciation.trim() : '',
        ageGroupCode: ageGroupCode || '3-4',
        sourceUnit: sourceUnit || undefined,
        lesson: lesson || undefined,
        difficulty: difficulty || 1,
        pairId: generatedPairId,
        status: status || 'ACTIVE',
        sourceType: 'SYSTEM_DESIGN'
      });

      const allIds = [questionDoc._id];

      // 2. Create Answers
      if (Array.isArray(answers)) {
        for (const ans of answers) {
          if (ans && ans.english && ans.english.trim()) {
            const ansDoc = await LanguageContent.create({
              contentType: 'ANSWER',
              english: ans.english.trim(),
              vietnamese: ans.vietnamese ? ans.vietnamese.trim() : '',
              pronunciation: ans.pronunciation ? ans.pronunciation.trim() : '',
              ageGroupCode: ageGroupCode || '3-4',
              sourceUnit: sourceUnit || undefined,
              lesson: lesson || undefined,
              difficulty: difficulty || 1,
              pairId: generatedPairId,
              relatedQuestion: questionDoc._id,
              status: status || 'ACTIVE',
              sourceType: 'SYSTEM_DESIGN'
            });
            allIds.push(ansDoc._id);
          }
        }
      }

      if (lesson) {
        await Lesson.findByIdAndUpdate(lesson, { $addToSet: { languageContents: { $each: allIds } } });
      }

      if (req.user) {
        await writeAudit({
          user: req.user._id,
          action: 'CREATE_SENTENCE_PATTERN',
          targetType: 'LanguageContent',
          targetId: questionDoc._id,
          details: { english: questionDoc.english, isPair: true, answersCount: allIds.length - 1 }
        });
      }

      return res.status(201).json({
        success: true,
        message: `Tạo cặp Hỏi & Đáp "${questionDoc.english}" thành công!`,
        data: questionDoc
      });
    }

    // CASE 2: Single Sentence / Question / Answer
    let resolvedPairId = pairId || undefined;
    if (relatedQuestion) {
      const relDoc = await LanguageContent.findById(relatedQuestion);
      if (relDoc) {
        resolvedPairId = relDoc.pairId || `pair_${relDoc._id}`;
        if (!relDoc.pairId) {
          relDoc.pairId = resolvedPairId;
          await relDoc.save();
        }
      }
    }

    const pattern = await LanguageContent.create({
      contentType: contentType || 'PATTERN',
      english: english.trim(),
      vietnamese: vietnamese ? vietnamese.trim() : '',
      pronunciation: pronunciation ? pronunciation.trim() : '',
      ageGroupCode: ageGroupCode || '3-4',
      sourceUnit: sourceUnit || undefined,
      lesson: lesson || undefined,
      difficulty: difficulty || 1,
      pairId: resolvedPairId,
      relatedQuestion: relatedQuestion || undefined,
      status: status || 'ACTIVE',
      sourceType: 'SYSTEM_DESIGN'
    });

    if (lesson) {
      await Lesson.findByIdAndUpdate(lesson, { $addToSet: { languageContents: pattern._id } });
    }

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'CREATE_SENTENCE_PATTERN',
        targetType: 'LanguageContent',
        targetId: pattern._id,
        details: { english: pattern.english, contentType: pattern.contentType }
      });
    }

    await pattern.populate('sourceUnit', 'unitNumber bigQuestion bookNumber');
    await pattern.populate('lesson', 'title vietnameseTitle');

    res.status(201).json({
      success: true,
      message: `Tạo mẫu câu "${pattern.english}" thành công!`,
      data: pattern
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Sentence Pattern
// @route   PUT /api/admin/sentences/:id
// @access  Private / Admin
const updateSentencePattern = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { contentType, english, vietnamese, pronunciation, ageGroupCode, sourceUnit, lesson, difficulty, status, pairId, relatedQuestion, answers } = req.body;

    const pattern = await LanguageContent.findById(id);
    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Mẫu câu không tồn tại.' });
    }

    if (contentType) pattern.contentType = contentType;
    if (english) pattern.english = english.trim();
    if (vietnamese !== undefined) pattern.vietnamese = vietnamese.trim();
    if (pronunciation !== undefined) pattern.pronunciation = pronunciation.trim();
    if (ageGroupCode) pattern.ageGroupCode = ageGroupCode;
    if (sourceUnit !== undefined) pattern.sourceUnit = sourceUnit || undefined;
    if (pairId !== undefined) pattern.pairId = pairId || undefined;
    if (relatedQuestion !== undefined) pattern.relatedQuestion = relatedQuestion || undefined;
    if (lesson !== undefined) {
      if (pattern.lesson && pattern.lesson.toString() !== lesson) {
        await Lesson.findByIdAndUpdate(pattern.lesson, { $pull: { languageContents: pattern._id } });
      }
      pattern.lesson = lesson || undefined;
      if (lesson) {
        await Lesson.findByIdAndUpdate(lesson, { $addToSet: { languageContents: pattern._id } });
      }
    }
    if (difficulty !== undefined) pattern.difficulty = difficulty;
    if (status) pattern.status = status;

    // Handle updating paired answers if provided
    if (Array.isArray(answers)) {
      const generatedPairId = pattern.pairId || `pair_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (!pattern.pairId) {
        pattern.pairId = generatedPairId;
      }

      const existingAnswers = await LanguageContent.find({
        $or: [
          { relatedQuestion: pattern._id },
          { pairId: generatedPairId, contentType: 'ANSWER' }
        ]
      });

      const keptAnswerIds = [];
      const newAnswerIds = [];

      for (const ans of answers) {
        if (!ans || !ans.english || !ans.english.trim()) continue;

        if (ans._id && mongoose.isValidObjectId(ans._id)) {
          await LanguageContent.findByIdAndUpdate(ans._id, {
            english: ans.english.trim(),
            vietnamese: ans.vietnamese ? ans.vietnamese.trim() : '',
            pronunciation: ans.pronunciation ? ans.pronunciation.trim() : '',
            relatedQuestion: pattern._id,
            pairId: generatedPairId,
            lesson: pattern.lesson || undefined,
            sourceUnit: pattern.sourceUnit || undefined
          });
          keptAnswerIds.push(String(ans._id));
        } else {
          const newAnsDoc = await LanguageContent.create({
            contentType: 'ANSWER',
            english: ans.english.trim(),
            vietnamese: ans.vietnamese ? ans.vietnamese.trim() : '',
            pronunciation: ans.pronunciation ? ans.pronunciation.trim() : '',
            ageGroupCode: pattern.ageGroupCode || '3-4',
            sourceUnit: pattern.sourceUnit || undefined,
            lesson: pattern.lesson || undefined,
            difficulty: pattern.difficulty || 1,
            pairId: generatedPairId,
            relatedQuestion: pattern._id,
            status: 'ACTIVE',
            sourceType: 'SYSTEM_DESIGN'
          });
          keptAnswerIds.push(String(newAnsDoc._id));
          newAnswerIds.push(newAnsDoc._id);
        }
      }

      const removedAnswers = existingAnswers.filter(ea => !keptAnswerIds.includes(String(ea._id)));
      if (removedAnswers.length > 0) {
        const removedIds = removedAnswers.map(r => r._id);
        await LanguageContent.deleteMany({ _id: { $in: removedIds } });
        if (pattern.lesson) {
          await Lesson.findByIdAndUpdate(pattern.lesson, {
            $pull: { languageContents: { $in: removedIds } }
          });
        }
      }

      if (newAnswerIds.length > 0 && pattern.lesson) {
        await Lesson.findByIdAndUpdate(pattern.lesson, {
          $addToSet: { languageContents: { $each: newAnswerIds } }
        });
      }
    }

    await pattern.save();
    await pattern.populate('sourceUnit', 'unitNumber bigQuestion bookNumber');
    await pattern.populate('lesson', 'title vietnameseTitle');

    res.status(200).json({
      success: true,
      message: `Cập nhật mẫu câu thành công!`,
      data: pattern
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Sentence Pattern
// @route   DELETE /api/admin/sentences/:id
// @access  Private / Admin
const deleteSentencePattern = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pattern = await LanguageContent.findById(id);
    if (!pattern) {
      return res.status(404).json({ success: false, message: 'Mẫu câu không tồn tại.' });
    }

    // Unlink any answers pointing to this question
    await LanguageContent.updateMany({ relatedQuestion: pattern._id }, { $unset: { relatedQuestion: 1 } });
    await Lesson.updateMany({ languageContents: pattern._id }, { $pull: { languageContents: pattern._id } });
    await LanguageContent.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Đã xóa mẫu câu "${pattern.english}" thành công.`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CLASSROOM & STUDENT OPERATIONS (Admin quản lý lớp & trẻ em)
// ==========================================

// @desc    Get Classroom by ID with full students and teacher details
// @route   GET /api/admin/classrooms/:id
// @access  Private / Admin
const getClassroomById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await ClassRoom.findById(id)
      .populate('teacher', 'name email username avatar avatarUrl contact')
      .populate('students', 'name username avatar avatarUrl ageGroupCode dob contact status createdAt')
      .populate('ageGroup', 'name code')
      .lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    res.status(200).json({
      success: true,
      data: classroom
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Classroom full details (Overview, Teacher, Students, Schedules, Curriculum Progress, Session History & Attendance)
// @route   GET /api/admin/classrooms/:id/full-detail
// @access  Private / Admin
const getClassroomFullDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await ClassRoom.findById(id)
      .populate('teacher', 'name email username avatar avatarUrl contact')
      .populate('students', 'name username avatar avatarUrl ageGroupCode dob contact status createdAt')
      .populate('ageGroup', 'name code')
      .populate('currentLesson', 'title vietnameseTitle displayOrder description')
      .lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    const bookNumber = classroom.ageGroupCode === '3-4' ? 1 : classroom.ageGroupCode === '4-5' ? 2 : 3;
    const [schedules, units, recentSessions, attendanceRecords] = await Promise.all([
      Schedule.find({ classroom: id }).populate('weeklySlots.lesson', 'title vietnameseTitle displayOrder').sort({ createdAt: -1 }).lean(),
      CurriculumUnit.find({ bookNumber, status: 'ACTIVE' }).sort({ unitNumber: 1 }).lean(),
      ClassroomSession.find({ classroom: id })
        .sort({ startedAt: -1, createdAt: -1 })
        .limit(15)
        .populate('teacher', 'name email avatar avatarUrl')
        .populate('lesson', 'title vietnameseTitle estimatedDuration')
        .lean(),
      Attendance.find({ classroom: id }).lean()
    ]);

    const unitIds = units.map(u => u._id);
    const lessons = await Lesson.find({
      curriculumUnits: { $in: unitIds },
      status: 'ACTIVE'
    })
      .select('title vietnameseTitle displayOrder curriculumUnits')
      .sort({ displayOrder: 1 })
      .lean();

    const unitsWithLessons = units.map(u => ({
      ...u,
      lessons: lessons.filter(l => l.curriculumUnits && l.curriculumUnits.some(cu => String(cu) === String(u._id)))
    }));

    let totalPresent = 0;
    let totalRecords = 0;
    attendanceRecords.forEach(att => {
      if (Array.isArray(att.records)) {
        att.records.forEach(r => {
          totalRecords++;
          if (r.status === 'PRESENT' || r.status === 'LATE') totalPresent++;
        });
      }
    });

    const attendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 100;

    res.status(200).json({
      success: true,
      data: {
        classroom,
        schedules,
        curriculum: {
          bookNumber,
          units: unitsWithLessons,
          totalLessons: lessons.length
        },
        sessions: recentSessions,
        stats: {
          totalSessions: recentSessions.length,
          attendanceRate,
          studentCount: classroom.students?.length || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add student(s) to a specific classroom
// @route   POST /api/admin/classrooms/:id/students
// @access  Private / Admin
const addStudentToClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentId, studentIds, name, fullName, dob, pin, contact, parentContact } = req.body;

    const classroom = await ClassRoom.findById(id).populate('ageGroup');
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    // 1. Existing student ID(s) (Thêm từ tài khoản học sinh đã có sẵn trong hệ thống)
    const idsToAdd = Array.isArray(studentIds) ? studentIds : (studentId ? [studentId] : []);
    if (idsToAdd.length > 0) {
      const validStudents = await User.find({ _id: { $in: idsToAdd }, role: 'CHILD', status: 'ACTIVE' });
      if (validStudents.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản học sinh hợp lệ trong hệ thống.' });
      }

      // Chặn thêm học sinh khác độ tuổi vào lớp
      if (classroom.ageGroupCode) {
        const wrongAgeStudent = validStudents.find(s => s.ageGroupCode && s.ageGroupCode !== classroom.ageGroupCode);
        if (wrongAgeStudent) {
          return res.status(400).json({
            success: false,
            message: `Không thể thêm học sinh khác độ tuổi vào lớp. Lớp "${classroom.name}" dành cho lứa tuổi ${classroom.ageGroupCode}, nhưng học sinh "${wrongAgeStudent.name}" thuộc lứa tuổi ${wrongAgeStudent.ageGroupCode}.`
          });
        }
      }

      const validIds = validStudents.map(s => s._id);

      await integrity.atomic(() => integrity.moveStudents(classroom, validIds.map(String)));

      if (req.user) {
        await writeAudit({
          user: req.user._id,
          action: 'ADD_STUDENTS_TO_CLASS',
          targetType: 'ClassRoom',
          targetId: classroom._id,
          details: { className: classroom.name, count: validIds.length, studentNames: validStudents.map(s => s.name) }
        });
      }

      const updated = await ClassRoom.findById(id)
        .populate('teacher', 'name email username avatar avatarUrl')
        .populate('students', 'name avatar avatarUrl ageGroupCode dob contact username status');

      const studentNameStr = validStudents.length === 1 ? `học sinh "${validStudents[0].name}"` : `${validIds.length} học sinh`;
      return res.status(200).json({
        success: true,
        message: `Đã thêm ${studentNameStr} vào lớp ${classroom.name}!`,
        data: updated
      });
    }

    // 2. Single student admission fallback (Trường hợp tạo mới học sinh lẻ từ form)
    const rawName = name || fullName;
    if (rawName && String(rawName).trim()) {
      const studentObj = {
        name: String(rawName).trim(),
        dob: dob || undefined,
        pin: pin || undefined,
        contact: contact || parentContact || undefined,
        ageGroupCode: classroom.ageGroupCode
      };
      const ageGroupCode = classroom.ageGroupCode || '3-4';
      const ageGroupDoc = classroom.ageGroup || (await AgeGroup.findOne({ code: ageGroupCode }));
      const { createdUsers, credentials, errors } = await helperCreateStudentsFromList(
        [studentObj],
        classroom._id,
        ageGroupCode,
        ageGroupDoc
      );

      if (errors.length > 0 || createdUsers.length === 0) {
        return res.status(400).json({
          success: false,
          message: errors[0] || 'Không thể tạo hồ sơ học sinh mới.'
        });
      }

      const newKid = createdUsers[0];
      await ClassRoom.findByIdAndUpdate(id, {
        $addToSet: { students: newKid._id }
      });

      if (req.user) {
        await writeAudit({
          user: req.user._id,
          action: 'ADD_INDIVIDUAL_STUDENT',
          targetType: 'ClassRoom',
          targetId: classroom._id,
          details: { className: classroom.name, studentName: newKid.name, username: newKid.username }
        });
      }

      const updated = await ClassRoom.findById(id)
        .populate('teacher', 'name email username avatar avatarUrl')
        .populate('students', 'name avatar avatarUrl ageGroupCode dob contact username status');

      return res.status(201).json({
        success: true,
        message: `Đã tiếp nhận học sinh "${newKid.name}" (Mã: ${newKid.username}) vào lớp ${classroom.name}. Hãy lưu thông tin đăng nhập vừa cấp.`,
        data: updated,
        credentials,
        createdStudent: newKid
      });
    }

    return res.status(400).json({ success: false, message: 'Vui lòng chọn học sinh có sẵn từ hệ thống hoặc nhập thông tin học sinh cần thêm.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove student from classroom
// @route   DELETE /api/admin/classrooms/:id/students/:studentId
// @access  Private / Admin
const removeStudentFromClassroom = maintenance.removeStudentFromClassroom;

// @desc    Import students into a classroom from Excel data (batch creation + assignment)
// @route   POST /api/admin/classrooms/:id/import-students-excel
// @access  Private / Admin
const importStudentsFromExcel = maintenance.importStudentsFromExcel;

// @desc    Export classroom student roster to Excel data
// @route   GET /api/admin/classrooms/:id/export-excel
// @access  Private / Admin
const exportClassroomExcel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await ClassRoom.findById(id)
      .populate('teacher', 'name email username contact')
      .populate('students', 'name username dob contact parentContact status ageGroupCode createdAt')
      .lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    const students = classroom.students || [];
    const rows = students.map((s, idx) => ({
      STT: idx + 1,
      'Họ và tên': s.name || '',
      'Tên đăng nhập': s.username || '',
      'Đăng nhập': 'Dùng PIN đã cấp; đặt lại nếu quên',
      'Ngày sinh': s.dob ? new Date(s.dob).toLocaleDateString('vi-VN') : '',
      'Nhóm tuổi': classroom.ageGroupCode ? `${classroom.ageGroupCode} tuổi` : '',
      'Lớp học': classroom.name,
      'Giáo viên': classroom.teacher?.name || 'Chưa phân công',
      'Năm học': classroom.academicYear || '2026-2027',
      'SĐT Phụ huynh': s.contact || s.parentContact || '',
      'Trạng thái': s.status === 'ACTIVE' ? 'Đang học' : 'Tạm dừng'
    }));

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'EXPORT_STUDENTS_EXCEL',
        targetType: 'ClassRoom',
        targetId: classroom._id,
        details: { className: classroom.name, totalStudents: students.length }
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã lấy dữ liệu xuất Excel lớp ${classroom.name}`,
      className: classroom.name,
      academicYear: classroom.academicYear,
      teacherName: classroom.teacher?.name || 'Chưa phân công',
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Reassign teacher for a classroom
// @route   PUT /api/admin/classrooms/:id/teacher
// @access  Private / Admin
const assignTeacherToClassroom = maintenance.assignTeacherToClassroom;

// @desc    Get unassigned students (trẻ chưa được phân vào lớp nào)
// @route   GET /api/admin/students/unassigned
// @access  Private / Admin
const getUnassignedStudents = async (req, res, next) => {
  try {
    const { ageGroupCode, search } = req.query;
    const query = {
      role: 'CHILD',
      status: 'ACTIVE',
      $or: [
        { assignedClass: null },
        { assignedClass: { $exists: false } }
      ]
    };

    if (ageGroupCode && ageGroupCode !== 'ALL') {
      query.ageGroupCode = ageGroupCode;
    }

    if (search) {
      query.name = { $regex: integrity.escapeRegex(search), $options: 'i' };
    }

    const students = await User.find(query)
      .select('name username avatar avatarUrl ageGroupCode dob contact createdAt')
      .sort({ name: 1 })
      .collation({ locale: 'vi', strength: 2 })
      .lean();

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SCHEDULE MANAGEMENT (THỜI KHÓA BIỂU)
// ==========================================

// @desc    Lấy danh sách tất cả thời khóa biểu
// @route   GET /api/admin/schedules
// @access  Private / Admin
const getSchedules = async (req, res, next) => {
  try {
    const { classroomId, teacherId, academicYear, isActive } = req.query;
    const query = {};

    if (classroomId) query.classroom = classroomId;
    if (teacherId) query.teacher = teacherId;
    if (academicYear) query.academicYear = academicYear;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const schedules = await Schedule.find(query)
      .populate('classroom', 'name ageGroupCode academicYear studentCount isActive')
      .populate('teacher', 'name email avatar avatarUrl username')
      .populate('weeklySlots.lesson', 'title vietnameseTitle displayOrder')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Tạo mới thời khóa biểu
// @route   POST /api/admin/schedules
// @access  Private / Admin
const createSchedule = async (req, res, next) => {
  try {
    req.body = { ...req.body, ...normalizeSchedulePeriod(req.body) };
    const { classroom, teacher, academicYear, weeklySlots, colorTag, effectiveFrom, effectiveTo, isActive } = req.body;

    if (!classroom) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn lớp học'
      });
    }

    let assignedTeacher = teacher;
    const classroomDoc = await ClassRoom.findById(classroom);
    if (!classroomDoc) {
      return res.status(404).json({
        success: false,
        message: 'Lớp học không tồn tại'
      });
    }

    // Nếu không truyền teacher, lấy giáo viên của lớp
    if (!assignedTeacher && classroomDoc.teacher) {
      assignedTeacher = classroomDoc.teacher;
    }

    if (!assignedTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Lớp học này chưa có giáo viên phụ trách. Vui lòng phân công giáo viên.'
      });
    }

    await validateSchedule({ classroom, teacher: assignedTeacher, weeklySlots: weeklySlots || [], effectiveFrom: effectiveFrom || new Date(), effectiveTo, isActive });
    const schedule = await Schedule.create({
      classroom,
      teacher: assignedTeacher,
      academicYear: academicYear || classroomDoc.academicYear || '2026-2027',
      weeklySlots: weeklySlots || [],
      colorTag: colorTag || 'indigo',
      effectiveFrom: effectiveFrom || new Date(),
      effectiveTo: effectiveTo || null,
      isActive: isActive !== undefined ? isActive : true
    });

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate('classroom', 'name ageGroupCode academicYear studentCount isActive')
      .populate('teacher', 'name email avatar avatarUrl username')
      .populate('weeklySlots.lesson', 'title vietnameseTitle displayOrder');

    // Audit log
    if (req.user?._id) {
      await writeAudit({
        user: req.user._id,
        action: 'CREATE',
        targetType: 'Schedule',
        targetId: schedule._id,
        details: { message: `Admin đã thiết lập thời khóa biểu cho lớp ${classroomDoc.name}` }
      }).catch(err => console.error('AuditLog error:', err));
    }

    res.status(201).json({
      success: true,
      message: 'Tạo thời khóa biểu thành công',
      data: populatedSchedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cập nhật thời khóa biểu
// @route   PUT /api/admin/schedules/:id
// @access  Private / Admin
const updateSchedule = async (req, res, next) => {
  try {
    req.body = { ...req.body, ...normalizeSchedulePeriod(req.body) };
    const { id } = req.params;
    const { classroom, teacher, academicYear, weeklySlots, colorTag, effectiveFrom, effectiveTo, isActive } = req.body;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thời khóa biểu'
      });
    }

    if (classroom) schedule.classroom = classroom;
    if (teacher) schedule.teacher = teacher;
    if (academicYear) schedule.academicYear = academicYear;
    if (weeklySlots !== undefined) schedule.weeklySlots = weeklySlots;
    if (colorTag) schedule.colorTag = colorTag;
    if (effectiveFrom !== undefined) schedule.effectiveFrom = effectiveFrom;
    if (effectiveTo !== undefined) schedule.effectiveTo = effectiveTo;
    if (isActive !== undefined) schedule.isActive = isActive;

    await validateSchedule(schedule.toObject(), schedule._id);
    await schedule.save();

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate('classroom', 'name ageGroupCode academicYear studentCount isActive')
      .populate('teacher', 'name email avatar avatarUrl username')
      .populate('weeklySlots.lesson', 'title vietnameseTitle displayOrder');

    // Audit log
    if (req.user?._id) {
      await writeAudit({
        user: req.user._id,
        action: 'UPDATE',
        targetType: 'Schedule',
        targetId: schedule._id,
        details: { message: `Admin đã cập nhật thời khóa biểu ${schedule._id}` }
      }).catch(err => console.error('AuditLog error:', err));
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật thời khóa biểu thành công',
      data: populatedSchedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa thời khóa biểu
// @route   DELETE /api/admin/schedules/:id
// @access  Private / Admin
const deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thời khóa biểu'
      });
    }

    await Schedule.findByIdAndDelete(id);

    // Audit log
    if (req.user?._id) {
      await writeAudit({
        user: req.user._id,
        action: 'DELETE',
        targetType: 'Schedule',
        targetId: id,
        details: { message: `Admin đã xóa thời khóa biểu ${id}` }
      }).catch(err => console.error('AuditLog error:', err));
    }

    res.status(200).json({
      success: true,
      message: 'Xóa thời khóa biểu thành công'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Lấy thời khóa biểu của một giáo viên cụ thể
// @route   GET /api/admin/schedules/by-teacher/:teacherId
// @access  Private / Admin, Teacher
const getTeacherSchedule = async (req, res, next) => {
  try {
    const { teacherId } = req.params;
    if (req.user.role === 'TEACHER' && String(req.user._id) !== teacherId) throw integrity.fail('Bạn chỉ được xem lịch dạy của mình.', 403);
    const schedules = await Schedule.find({ teacher: teacherId, ...activeScheduleFilter() })
      .populate('classroom', 'name ageGroupCode academicYear studentCount isActive')
      .populate('teacher', 'name email avatar avatarUrl username')
      .populate('weeklySlots.lesson', 'title vietnameseTitle displayOrder')
      .lean();

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Gán toàn bộ các bài học vào toàn bộ thời khóa biểu của 3 lớp
// @route   POST /api/admin/schedules/auto-assign-curriculum
// @access  Private / Admin
const autoAssignCurriculumSchedules = async (req, res, next) => {
  try {
    const classrooms = await ClassRoom.find({ status: { $ne: 'INACTIVE' }, deletionPending: { $ne: true } })
      .populate('teacher')
      .lean();

    if (!classrooms.length) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy lớp học nào trên hệ thống.' });
    }

    const results = [];

    // Cấu hình khung giờ và phòng học độc lập cho từng lứa tuổi (chống trùng lịch 100%)
    const scheduleConfigs = {
      '3-4': {
        startTime: '08:30',
        endTime: '09:15',
        room: 'Phòng Mầm 1',
        colorTag: 'indigo',
        subjectNote: 'English Morning Discovery'
      },
      '4-5': {
        startTime: '09:30',
        endTime: '10:15',
        room: 'Phòng Chồi 2',
        colorTag: 'emerald',
        subjectNote: 'Interactive Vocabulary & Communication'
      },
      '5-6': {
        startTime: '10:30',
        endTime: '11:15',
        room: 'Phòng Lá 3',
        colorTag: 'purple',
        subjectNote: 'Sentence Patterns & Oracy Presentation'
      }
    };

    for (const cls of classrooms) {
      const config = scheduleConfigs[cls.ageGroupCode] || {
        startTime: '08:30',
        endTime: '09:15',
        room: 'Phòng học chuẩn',
        colorTag: 'indigo',
        subjectNote: 'English Exploration'
      };

      const teacherId = cls.teacher?._id || cls.teacher;
      if (!teacherId) continue;

      const bookNumber = cls.ageGroupCode === '3-4' ? 1 : cls.ageGroupCode === '4-5' ? 2 : 3;
      const units = await CurriculumUnit.find({ bookNumber, status: 'ACTIVE' }).sort({ unitNumber: 1 }).lean();
      const unitIds = units.map(u => u._id);
      const allLessons = await Lesson.find({ curriculumUnits: { $in: unitIds }, status: 'ACTIVE' })
        .sort({ displayOrder: 1, createdAt: 1 })
        .lean();

      // Flatten sequentially by Unit 1, Unit 2... so lessons are properly ordered according to the curriculum
      const sequentialLessons = [];
      units.forEach(u => {
        const uLessons = allLessons
          .filter(l => l.curriculumUnits && l.curriculumUnits.some(c => String(c) === String(u._id)))
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        sequentialLessons.push(...uLessons);
      });

      if (!sequentialLessons.length) continue;

      // Gán các bài học vào các buổi Thứ 2 đến Thứ 6 (Day 1 đến Day 5) theo đúng giáo trình chuẩn
      const weeklySlots = [1, 2, 3, 4, 5].map((dayOfWeek, idx) => {
        const lesson = sequentialLessons[idx] || sequentialLessons[0];
        return {
          dayOfWeek,
          startTime: config.startTime,
          endTime: config.endTime,
          room: config.room,
          subjectNote: `${config.subjectNote} - ${lesson.title}`,
          lesson: lesson._id,
          lessonNumber: idx + 1,
          lessonTitle: `Bài ${idx + 1}: ${lesson.title}`
        };
      });

      let schedule = await Schedule.findOne({ classroom: cls._id, isActive: true });
      if (schedule) {
        schedule.weeklySlots = weeklySlots;
        schedule.teacher = teacherId;
        schedule.academicYear = cls.academicYear || '2026-2027';
        schedule.colorTag = config.colorTag;
        await schedule.save();
      } else {
        schedule = await Schedule.create({
          classroom: cls._id,
          teacher: teacherId,
          academicYear: cls.academicYear || '2026-2027',
          weeklySlots,
          colorTag: config.colorTag,
          isActive: true,
          effectiveFrom: new Date()
        });
      }

      if (!cls.currentLesson && sequentialLessons.length > 0) {
        await ClassRoom.findByIdAndUpdate(cls._id, { currentLesson: sequentialLessons[0]._id });
      }

      results.push({
        classroomId: cls._id,
        classroomName: cls.name,
        ageGroupCode: cls.ageGroupCode,
        scheduleId: schedule._id,
        slotsCount: weeklySlots.length,
        assignedLessons: weeklySlots.map(s => ({
          dayOfWeek: s.dayOfWeek,
          lessonNumber: s.lessonNumber,
          lessonTitle: s.lessonTitle
        }))
      });
    }

    if (req.user?._id) {
      await writeAudit({
        user: req.user._id,
        action: 'UPDATE',
        targetType: 'Schedule',
        details: { message: `Admin đã gán tự động bài học vào toàn bộ thời khóa biểu cho ${results.length} lớp học.` }
      }).catch(err => console.error('AuditLog error:', err));
    }

    res.status(200).json({
      success: true,
      message: `Đã gán thành công toàn bộ bài học vào thời khóa biểu của ${results.length} lớp học!`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Xóa bỏ toàn bộ thông tin bài học gán trong thời khóa biểu (chỉ giữ lại khung giờ học)
// @route   POST /api/admin/schedules/clear-lessons
// @access  Private / Admin
const clearScheduleLessons = async (req, res, next) => {
  try {
    const { classroomId } = req.body;
    const query = classroomId ? { classroom: classroomId } : {};
    const schedules = await Schedule.find(query);

    for (const sch of schedules) {
      sch.weeklySlots = (sch.weeklySlots || []).map(slot => ({
        ...slot.toObject(),
        lesson: null,
        lessonNumber: null,
        lessonTitle: '',
        subjectNote: slot.subjectNote ? slot.subjectNote.split(' - ')[0] : ''
      }));
      await sch.save();
    }

    if (req.user?._id) {
      await writeAudit({
        user: req.user._id,
        action: 'UPDATE',
        targetType: 'Schedule',
        details: { message: `Admin đã xóa bỏ toàn bộ bài học được gán trong thời khóa biểu.` }
      }).catch(err => console.error('AuditLog error:', err));
    }

    res.status(200).json({
      success: true,
      message: 'Đã xóa toàn bộ thông tin bài học được gán trong thời khóa biểu. Các ca học chỉ giữ lại thời gian và phòng học.'
    });
  } catch (error) {
    next(error);
  }
};

// ─── Activity & Games Management (Kho Trò chơi & Hoạt động) ─────────────────

// @desc    Get all activities/games with filtering, pagination and statistics
// @route   GET /api/admin/activities
// @access  Private / Admin
const getAdminActivities = async (req, res, next) => {
  try {
    const {
      search,
      activityType,
      ageGroupCode,
      lessonId,
      status,
      difficulty,
      page = 1,
      limit = 12
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(integrity.escapeRegex(search.trim()), 'i');
      query.$or = [
        { title: searchRegex },
        { vietnameseTitle: searchRegex },
        { instructions: searchRegex }
      ];
    }

    if (activityType && activityType !== 'ALL') {
      query.activityType = activityType;
    }

    if (ageGroupCode && ageGroupCode !== 'ALL') {
      query.ageGroupCode = ageGroupCode;
    }

    if (lessonId && lessonId !== 'ALL') {
      query.lesson = lessonId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (difficulty && difficulty !== 'ALL') {
      query.difficulty = Number(difficulty);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [activities, totalCount, statsData] = await Promise.all([
      Activity.find(query)
        .populate({
          path: 'lesson',
          select: 'title ageGroupCode displayOrder curriculumUnits topic',
          populate: [
            { path: 'curriculumUnits', select: 'unitNumber bigQuestion bookNumber book' },
            { path: 'topic', select: 'englishName vietnameseName' }
          ]
        })
        .populate('questions.vocabulary', 'english vietnamese imageUrl audioUrl category')
        .sort({ updatedAt: -1, order: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Activity.countDocuments(query),
      Activity.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: 'ACTIVE' } }, { $count: 'count' }],
            inactive: [{ $match: { status: 'INACTIVE' } }, { $count: 'count' }],
            byType: [
              { $group: { _id: '$activityType', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            byAgeGroup: [
              { $group: { _id: '$ageGroupCode', count: { $sum: 1 } } },
              { $sort: { _id: 1 } }
            ]
          }
        }
      ])
    ]);

    const statsFacet = statsData[0] || {};
    const totalActivities = statsFacet.total?.[0]?.count || 0;
    const activeCount = statsFacet.active?.[0]?.count || 0;
    const inactiveCount = statsFacet.inactive?.[0]?.count || 0;
    const byType = (statsFacet.byType || []).reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});
    const byAgeGroup = (statsFacet.byAgeGroup || []).reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: activities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      },
      stats: {
        totalActivities,
        activeCount,
        inactiveCount,
        byType,
        byAgeGroup
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single activity by ID
// @route   GET /api/admin/activities/:id
// @access  Private / Admin
const getAdminActivityById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findById(id)
      .populate({
        path: 'lesson',
        select: 'title ageGroupCode displayOrder curriculumUnits topic vocabularyItems',
        populate: [
          { path: 'curriculumUnits', select: 'unitNumber bigQuestion bookNumber' },
          { path: 'vocabularyItems', select: 'english vietnamese imageUrl audioUrl category' }
        ]
      })
      .populate('questions.vocabulary', 'english vietnamese imageUrl audioUrl category');

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy trò chơi.' });
    }

    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new activity/game
// @route   POST /api/admin/activities
// @access  Private / Admin
const createAdminActivity = async (req, res, next) => {
  try {
    const {
      lessonId,
      activityType,
      title,
      vietnameseTitle,
      instructions,
      instructionAudioUrl,
      ageGroupCode,
      difficulty = 1,
      questionCount,
      timeLimit = 0,
      pointsPerQuestion = 10,
      starConfig = { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions = [],
      order = 0,
      status = 'ACTIVE'
    } = req.body;

    if (!lessonId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn bài học (Lesson) cho trò chơi.' });
    }
    if (!activityType) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn thể loại trò chơi.' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên trò chơi.' });
    }

    const lessonDoc = await Lesson.findById(lessonId);
    if (!lessonDoc) {
      return res.status(404).json({ success: false, message: 'Bài học không tồn tại.' });
    }

    const finalAgeCode = ageGroupCode || lessonDoc.ageGroupCode || '3-4';
    let ageGroupDoc = await AgeGroup.findOne({ code: finalAgeCode });
    if (!ageGroupDoc) {
      ageGroupDoc = await AgeGroup.findOne();
    }

    if (!Array.isArray(questions) || !questions.length) throw integrity.fail('Trò chơi cần ít nhất một câu hỏi.');
    const formattedQuestions = (questions || []).map((q, idx) => ({
      promptText: q.promptText || '',
      promptAudioUrl: q.promptAudioUrl || '',
      promptImageUrl: q.promptImageUrl || '',
      correctAnswer: q.options?.find(o => o.isCorrect)?.text || q.correctAnswer || '',
      vocabulary: q.vocabulary || null,
      explanation: q.explanation || '',
      metadata: q.metadata || {},
      options: (q.options || []).map((opt, optIdx) => ({
        id: opt.id || `opt_${idx}_${optIdx}`,
        text: opt.text || '',
        vietnameseText: opt.vietnameseText || '',
        imageUrl: opt.imageUrl || '',
        audioUrl: opt.audioUrl || '',
        isCorrect: Boolean(opt.isCorrect)
      }))
    }));

    const activity = await Activity.create({
      lesson: lessonDoc._id,
      activityType,
      title: title.trim(),
      vietnameseTitle: vietnameseTitle?.trim() || '',
      instructions: instructions?.trim() || 'Listen and choose the correct picture!',
      instructionAudioUrl: instructionAudioUrl || '',
      ageGroup: ageGroupDoc._id,
      ageGroupCode: finalAgeCode,
      difficulty: Number(difficulty) || 1,
      questionCount: formattedQuestions.length,
      timeLimit: Number(timeLimit) || 0,
      pointsPerQuestion: Number(pointsPerQuestion) || 10,
      starConfig: starConfig || { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: formattedQuestions,
      order: Number(order) || 0,
      status: status || 'ACTIVE'
    });

    await writeAudit({
      user: req.user._id,
      action: 'CREATE',
      targetType: 'SYSTEM',
      targetId: activity._id,
      details: { title: activity.title, activityType: activity.activityType, lesson: lessonDoc.title }
    });

    res.status(201).json({
      success: true,
      message: 'Tạo trò chơi thành công!',
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing activity/game
// @route   PUT /api/admin/activities/:id
// @access  Private / Admin
const updateAdminActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      lessonId,
      activityType,
      title,
      vietnameseTitle,
      instructions,
      instructionAudioUrl,
      ageGroupCode,
      difficulty,
      timeLimit,
      pointsPerQuestion,
      starConfig,
      questions,
      order,
      status
    } = req.body;

    const activity = await Activity.findById(id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy trò chơi.' });
    }

    if (title !== undefined) activity.title = title.trim();
    if (vietnameseTitle !== undefined) activity.vietnameseTitle = vietnameseTitle.trim();
    if (instructions !== undefined) activity.instructions = instructions.trim();
    if (instructionAudioUrl !== undefined) activity.instructionAudioUrl = instructionAudioUrl;
    if (activityType !== undefined) activity.activityType = activityType;
    if (difficulty !== undefined) activity.difficulty = Number(difficulty);
    if (timeLimit !== undefined) activity.timeLimit = Number(timeLimit);
    if (pointsPerQuestion !== undefined) activity.pointsPerQuestion = Number(pointsPerQuestion);
    if (order !== undefined) activity.order = Number(order);
    if (status !== undefined) activity.status = status;
    if (starConfig !== undefined) activity.starConfig = starConfig;

    if (lessonId && lessonId !== String(activity.lesson)) {
      const lessonDoc = await Lesson.findById(lessonId);
      if (lessonDoc) activity.lesson = lessonDoc._id;
    }

    if (ageGroupCode) {
      activity.ageGroupCode = ageGroupCode;
      const agDoc = await AgeGroup.findOne({ code: ageGroupCode });
      if (agDoc) activity.ageGroup = agDoc._id;
    }

    await readiness.assertActivityEditable(activity._id);
    if (questions !== undefined) {
      if (!Array.isArray(questions) || !questions.length) throw integrity.fail('Trò chơi cần ít nhất một câu hỏi.');
      const previous = activity.questions.map(question => question.toObject());
      activity.questions = questions.map((question, index) => {
        const old = question._id ? previous.find(item => String(item._id) === String(question._id)) || {} : previous[index] || {};
        const options = (question.options || []).map((option, optionIndex) => ({
          ...(old.options?.find(item => item.id === option.id) || old.options?.[optionIndex] || {}), ...option,
          id: option.id || 'opt_' + index + '_' + optionIndex
        }));
        const correct = options.find(option => option.isCorrect);
        return { ...old, ...question, options, vocabulary: question.vocabulary?._id || question.vocabulary || (question.vocabulary === null ? null : old.vocabulary),
          metadata: question.metadata === undefined ? old.metadata : question.metadata,
          correctAnswer: correct?.text || question.correctAnswer || old.correctAnswer };
      });
      activity.questionCount = activity.questions.length;
    }

    await activity.save();

    await writeAudit({
      user: req.user._id,
      action: 'UPDATE',
      targetType: 'SYSTEM',
      targetId: activity._id,
      details: { title: activity.title, status: activity.status }
    });

    res.status(200).json({
      success: true,
      message: 'Cập nhật trò chơi thành công!',
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete activity/game
// @route   DELETE /api/admin/activities/:id
// @access  Private / Admin
const deleteAdminActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findById(id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy trò chơi.' });
    }

    await readiness.assertNotAssigned({$or:[{activity:id},{activitySnapshot:id}]});
    const title = activity.title;
    activity.status = 'INACTIVE';
    await activity.save();

    await writeAudit({
      user: req.user._id,
      action: 'DELETE',
      targetType: 'SYSTEM',
      targetId: id,
      details: { title }
    });

    res.status(200).json({
      success: true,
      message: `Đã lưu trữ trò chơi "${title}"; lịch sử được giữ lại.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle activity active/inactive status
// @route   PATCH /api/admin/activities/:id/status
// @access  Private / Admin
const toggleActivityStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findById(id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy trò chơi.' });
    }

    await readiness.assertNotAssigned({$or:[{activity:activity._id},{activitySnapshot:activity._id}]});
    activity.status = activity.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await activity.save();

    await writeAudit({
      user: req.user._id,
      action: 'UPDATE',
      targetType: 'SYSTEM',
      targetId: activity._id,
      details: { title: activity.title, status: activity.status }
    });

    res.status(200).json({
      success: true,
      message: `Đã ${activity.status === 'ACTIVE' ? 'kích hoạt' : 'tạm ẩn'} trò chơi "${activity.title}".`,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get complete curriculum syllabus in exact order for a specific classroom
// @route   GET /api/admin/classrooms/:id/curriculum-progress
// @access  Private / Admin
const getClassroomCurriculumProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await ClassRoom.findById(id)
      .populate('teacher', 'name avatar avatarUrl email')
      .populate('currentLesson', 'title vietnameseTitle displayOrder')
      .lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    const bookNumber = classroom.ageGroupCode === '3-4' ? 1 : classroom.ageGroupCode === '4-5' ? 2 : 3;
    const book = await CurriculumBook.findOne({ bookNumber }).lean();

    // Get all units for this book sorted by unitNumber
    const units = await CurriculumUnit.find({ bookNumber, status: 'ACTIVE' })
      .sort({ unitNumber: 1 })
      .lean();

    const unitIds = units.map(u => u._id);

    // Get all lessons for these units sorted by displayOrder
    const lessons = await Lesson.find({
      curriculumUnits: { $in: unitIds },
      status: 'ACTIVE'
    })
      .populate('topic', 'englishName vietnameseName icon')
      .populate('vocabularyItems', 'english vietnamese pronunciation imageUrl')
      .populate('languageContents', 'english vietnamese')
      .sort({ displayOrder: 1, createdAt: 1 })
      .lean();

    // Get completed classroom sessions for this class to know which lessons were taught
    const completedSessions = await ClassroomSession.find({
      classroom: classroom._id,
      status: 'COMPLETED',
      $or: [{'teachingOutcome.coverage':{$exists:false}},{'teachingOutcome.coverage':'COMPLETE'}]
    }).select('lesson startedAt endedAt sessionNumber summary').lean();

    const taughtLessonMap = new Map();
    completedSessions.forEach(s => {
      if (s.lesson) {
        const lid = String(s.lesson);
        const count = (taughtLessonMap.get(lid)?.count || 0) + 1;
        taughtLessonMap.set(lid, { count, lastTaughtAt: s.endedAt || s.startedAt });
      }
    });

    // Completed lesson IDs array stored on classroom
    const completedIdsSet = new Set((classroom.completedLessons || []).map(String));

    // Group lessons by unit
    const unitsWithLessons = units.map(unit => {
      const unitLessons = lessons.filter(l =>
        l.curriculumUnits && l.curriculumUnits.some(u => String(u) === String(unit._id))
      );

      return {
        ...unit,
        lessons: unitLessons.map((les, lIdx) => {
          const taughtInfo = taughtLessonMap.get(String(les._id));
          const isMarkedCompleted = completedIdsSet.has(String(les._id)) || Boolean(taughtInfo);
          const isCurrent = classroom.currentLesson
            ? String(classroom.currentLesson._id || classroom.currentLesson) === String(les._id)
            : false;

          return {
            ...les,
            unitOrder: lIdx + 1,
            isCompleted: isMarkedCompleted,
            isCurrent,
            taughtCount: taughtInfo?.count || 0,
            lastTaughtAt: taughtInfo?.lastTaughtAt || null
          };
        })
      };
    });

    // Flatten sequential syllabus
    let sequentialSyllabus = [];
    let lessonIndex = 0;
    unitsWithLessons.forEach(u => {
      u.lessons.forEach(l => {
        lessonIndex++;
        sequentialSyllabus.push({
          ...l,
          syllabusOrder: lessonIndex,
          unitNumber: u.unitNumber,
          unitTitle: u.bigQuestion || `Unit ${u.unitNumber}`
        });
      });
    });

    // If currentLesson is completed or not explicitly set, determine the next untaught lesson
    let activeLesson = classroom.currentLesson;
    const isCurrentAlreadyCompleted = activeLesson && (
      (classroom.completedLessons || []).some(id => String(id?._id || id) === String(activeLesson._id || activeLesson)) ||
      sequentialSyllabus.some(l => String(l._id) === String(activeLesson._id || activeLesson) && l.isCompleted)
    );
    if ((!activeLesson || isCurrentAlreadyCompleted) && sequentialSyllabus.length > 0) {
      const nextUntaught = sequentialSyllabus.find(l => !l.isCompleted) || sequentialSyllabus[0];
      activeLesson = nextUntaught;
      if (nextUntaught?._id && String(nextUntaught._id) !== String(classroom.currentLesson?._id || classroom.currentLesson)) {
        await ClassRoom.updateOne({ _id: classroom._id }, { $set: { currentLesson: nextUntaught._id } });
      }
    }

    // Active schedule, recent teaching sessions, and attendance history for this class
    const [activeSchedule, rawRecentSessions, attendanceHistory, classroomDoc, liveSessionDoc, sessionCounts] = await Promise.all([
      Schedule.findOne({ classroom: classroom._id, isActive: true })
        .populate('weeklySlots.lesson', 'title vietnameseTitle')
        .lean(),
      ClassroomSession.find({ classroom: classroom._id, status: { $in: ['COMPLETED', 'LIVE', 'CANCELLED'] } })
        .sort({ startedAt: -1, createdAt: -1 })
        .limit(20)
        .populate('teacher', 'name avatar avatarUrl email')
        .populate('cancelledBy', 'name email')
        .populate('lesson', 'title vietnameseTitle estimatedDuration description')
        .populate('activities', 'title activityType questionCount')
        .populate('studentScores.student', 'name username avatar avatarUrl contact dob')
        .populate('questionResults.studentAnswers.student', 'name username avatar avatarUrl')
        .populate('summary.studentsNeedingPractice', 'name avatar avatarUrl')
        .populate('summary.topPerformers', 'name avatar avatarUrl')
        .lean(),
      Attendance.find({ classroom: classroom._id })
        .sort({ date: -1 })
        .limit(14)
        .populate('records.student', 'name username avatar avatarUrl contact')
        .lean(),
      ClassRoom.findById(classroom._id)
        .populate('students', 'name username avatar avatarUrl contact dob status')
        .lean(),
      ClassroomSession.findOne({ classroom: classroom._id, status: 'LIVE' })
        .populate('teacher', 'name avatar avatarUrl email')
        .populate('lesson', 'title vietnameseTitle')
        .populate('activities', 'title activityType questionCount')
        .populate('studentScores.student', 'name avatar avatarUrl')
        .lean(),
      ClassroomSession.aggregate([
        { $match: { classroom: classroom._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const enrolledStudents = classroomDoc?.students || [];

    const recentSessions = rawRecentSessions.map(session => {
      const recordedStudentIds = new Set(
        (session.studentScores || []).map(sc => String(sc.student?._id || sc.student))
      );

      const unrecordedStudents = session.status === 'COMPLETED'
        ? enrolledStudents
            .filter(st => !recordedStudentIds.has(String(st._id)))
            .map(st => ({
              student: st,
              attendance: 'ABSENT',
              points: 0,
              stars: 0,
              correctCount: 0,
              incorrectCount: 0,
              notAnswered: 0,
              status: 'ACTIVE',
              isAutoFilled: true
            }))
        : [];

      const allStudentScores = [...(session.studentScores || []), ...unrecordedStudents];

      const presentCount = allStudentScores.filter(s => s.attendance === 'PRESENT').length;
      const excusedCount = allStudentScores.filter(s => s.attendance === 'EXCUSED').length;
      const absentCount = allStudentScores.filter(s => s.attendance === 'ABSENT').length;
      const lateCount = allStudentScores.filter(s => s.attendance === 'LATE').length;
      const totalRoster = allStudentScores.length;
      const attendanceRate = totalRoster > 0 ? Math.round(((presentCount + lateCount) / totalRoster) * 100) : 0;

      const sDate = session.startedAt || session.createdAt;
      const startTimeStr = sDate ? new Date(sDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '--:--';
      const endTimeStr = session.endedAt ? new Date(session.endedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : (session.status === 'LIVE' ? 'Đang diễn ra' : '--:--');

      return {
        ...session,
        date: sDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        lessonTitle: session.status === 'CANCELLED'
          ? `Buổi báo nghỉ: ${session.cancellationReason || 'Nghỉ theo kế hoạch'}`
          : (session.lesson?.title || session.title || 'Buổi học'),
        teacherName: session.teacher?.name || 'Giáo viên',
        averageScore: session.summary?.averageAccuracy || session.summary?.totalStars || 0,
        allStudentScores,
        attendanceStats: {
          total: totalRoster,
          present: presentCount,
          excused: excusedCount,
          absent: absentCount,
          late: lateCount,
          attendanceRate
        }
      };
    });

    // Check today's scheduled slots and actual teaching execution
    const now = new Date();
    const vnDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [h, m] = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }).split(':').map(Number);
    const currentMinutes = h * 60 + m;
    const vnDayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })).getDay();
    const slotsToday = (activeSchedule?.weeklySlots || []).filter(s => s.dayOfWeek === vnDayOfWeek);

    const todaySessions = recentSessions.filter(s => {
      const sDate = s.startedAt || s.createdAt;
      return sDate && new Date(sDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) === vnDateStr;
    });

    const hasCompletedToday = todaySessions.some(s => s.status === 'COMPLETED');
    const hasLiveToday = Boolean(liveSessionDoc) || todaySessions.some(s => s.status === 'LIVE');

    let todayScheduledLesson = null;
    let todayStatus = {
      hasSchedule: slotsToday.length > 0,
      slots: slotsToday,
      status: 'NO_SCHEDULE',
      note: 'Hôm nay không có lịch dạy định kỳ.',
      warning: false,
      scheduledLesson: null,
      liveSession: liveSessionDoc || null
    };

    if (slotsToday.length > 0) {
      const s0 = slotsToday[0];
      if (s0.lesson) {
        const found = sequentialSyllabus.find(l => String(l._id) === String(s0.lesson._id || s0.lesson));
        if (found) {
          todayScheduledLesson = found;
        } else {
          todayScheduledLesson = {
            _id: s0.lesson._id || s0.lesson,
            title: s0.lessonTitle || s0.lesson?.title || 'Bài học theo lịch',
            vietnameseTitle: s0.lesson?.vietnameseTitle || '',
            syllabusOrder: s0.lessonNumber || 1
          };
        }
      } else if (s0.lessonTitle) {
        todayScheduledLesson = {
          title: s0.lessonTitle,
          syllabusOrder: s0.lessonNumber || 1
        };
      } else {
        todayScheduledLesson = activeLesson;
      }
      todayStatus.scheduledLesson = todayScheduledLesson;
    } else if (activeLesson) {
      todayStatus.scheduledLesson = activeLesson;
    }

    const times = slotsToday.map(s => `${s.startTime} - ${s.endTime}`).join(', ');
    const lessonNameStr = todayScheduledLesson?.title ? `"${todayScheduledLesson.title}"` : 'theo giáo trình';

    const cancelledToday = todaySessions.find(s => s.status === 'CANCELLED');

    if (hasLiveToday) {
      const liveData = liveSessionDoc || todaySessions.find(s => s.status === 'LIVE');
      todayStatus.status = 'LIVE';
      todayStatus.liveSession = liveData;
      todayStatus.hasLiveSession = true;
      todayStatus.note = `🔴 Đang diễn ra buổi dạy trực tiếp bài "${liveData?.lesson?.title || liveData?.title || todayScheduledLesson?.title || 'trực tiếp'}" (${times || 'trực tiếp'}).`;
      todayStatus.warning = false;
    } else if (slotsToday.length > 0) {
      const earliest = Math.min(...slotsToday.map(s => {
        const [sh, sm] = s.startTime.split(':').map(Number);
        return sh * 60 + sm;
      }));

      if (hasCompletedToday) {
        todayStatus.status = 'TAUGHT';
        todayStatus.note = `Buổi dạy hôm nay đã hoàn thành bài ${lessonNameStr} (${times}).`;
        todayStatus.warning = false;
      } else if (cancelledToday) {
        todayStatus.status = 'CANCELLED';
        todayStatus.note = `Lớp đã báo nghỉ buổi này (${times}). Lý do: ${cancelledToday.cancellationReason || 'Nghỉ theo kế hoạch'}. Tiến độ giáo trình được bảo lưu cho buổi học tiếp theo.`;
        todayStatus.warning = false;
        todayStatus.cancelledSession = cancelledToday;
      } else if (currentMinutes >= earliest) {
        todayStatus.status = 'MISSED';
        todayStatus.note = `⚠️ Cảnh báo: Hôm nay có lịch dạy bài ${lessonNameStr} (${times}) nhưng giáo viên chưa vào lớp giảng dạy!`;
        todayStatus.warning = true;
      } else {
        todayStatus.status = 'UPCOMING';
        todayStatus.note = `Lớp có lịch học bài ${lessonNameStr} sắp diễn ra hôm nay (${times}).`;
        todayStatus.warning = false;
      }
    }

    // Student Attendance Aggregation for this class
    const studentAttendanceSummary = enrolledStudents.map(st => {
      let present = 0;
      let excused = 0;
      let absent = 0;
      let late = 0;
      let latestNote = '';

      // 1. Tích lũy từ các buổi học trực tiếp đã hoàn thành hoặc đang diễn ra
      recentSessions.forEach(session => {
        const score = (session.allStudentScores || []).find(sc => String(sc.student?._id || sc.student) === String(st._id));
        if (score) {
          if (score.attendance === 'PRESENT') present++;
          else if (score.attendance === 'EXCUSED') excused++;
          else if (score.attendance === 'ABSENT') absent++;
          else if (score.attendance === 'LATE') late++;
          if (!latestNote && score.note) latestNote = score.note;
        }
      });

      // 2. Bổ sung từ sổ điểm danh chuyên cần (Attendance) nếu chưa trùng ngày với buổi học
      const sessionDateStrings = new Set(recentSessions.map(s => s.date ? new Date(s.date).toISOString().split('T')[0] : ''));
      attendanceHistory.forEach(att => {
        const attDateStr = att.date ? new Date(att.date).toISOString().split('T')[0] : '';
        if (attDateStr && !sessionDateStrings.has(attDateStr)) {
          const rec = (att.records || []).find(r => String(r.student?._id || r.student) === String(st._id));
          if (rec) {
            if (rec.status === 'PRESENT') present++;
            else if (rec.status === 'EXCUSED') excused++;
            else if (rec.status === 'ABSENT') absent++;
            else if (rec.status === 'LATE') late++;
            if (!latestNote && rec.note) latestNote = rec.note;
          }
        }
      });

      const totalRecorded = present + excused + absent + late;
      const rate = totalRecorded > 0 ? Math.round(((present + late) / totalRecorded) * 100) : 100;
      return {
        student: st,
        present,
        excused,
        absent,
        late,
        totalSessions: totalRecorded,
        attendanceRate: rate,
        latestNote
      };
    });

    // Map the complete sequential syllabus to the timetable slots (Roadmap)
    const weeklySlots = activeSchedule?.weeklySlots || [];
    const daysMap = { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 0: 'Chủ Nhật' };
    
    const curriculumScheduleRoadmap = sequentialSyllabus.map((les, idx) => {
      let matchedSlot = weeklySlots.find(s => String(s.lesson?._id || s.lesson) === String(les._id));
      if (!matchedSlot && weeklySlots.length > 0) {
        matchedSlot = weeklySlots[idx % weeklySlots.length];
      }
      const isScheduledToday = Boolean(slotsToday.some(st => 
        String(st.lesson?._id || st.lesson) === String(les._id) || 
        (todayScheduledLesson && String(todayScheduledLesson._id) === String(les._id))
      ));

      return {
        ...les,
        roadmapOrder: idx + 1,
        slotDayOfWeek: matchedSlot ? matchedSlot.dayOfWeek : null,
        slotDayName: matchedSlot ? (daysMap[matchedSlot.dayOfWeek] || `Thứ ${matchedSlot.dayOfWeek}`) : 'Chưa xếp',
        slotTime: matchedSlot ? `${matchedSlot.startTime} - ${matchedSlot.endTime}` : 'Theo lịch',
        slotRoom: matchedSlot ? (matchedSlot.room || 'Phòng học') : 'Phòng học',
        isScheduledToday
      };
    });

    res.status(200).json({
      success: true,
      data: {
        classroom,
        enrolledStudents,
        curriculumBook: book,
        currentLesson: activeLesson,
        totalLessons: sequentialSyllabus.length,
        completedCount: sequentialSyllabus.filter(l => l.isCompleted).length,
        units: unitsWithLessons,
        sequentialSyllabus,
        curriculumScheduleRoadmap,
        schedule: activeSchedule,
        todayStatus,
        recentSessions,
        sessionCounts: { SCHEDULED: 0, LIVE: 0, COMPLETED: 0, ...Object.fromEntries(sessionCounts.map(row => [row._id, row.count])) },
        attendanceHistory,
        studentAttendanceSummary
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed classroom sessions, attendance & student performance
// @route   GET /api/admin/classrooms/:id/sessions
// @access  Private / Admin
const getClassroomSessions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await ClassRoom.findById(id)
      .populate('teacher', 'name email avatar avatarUrl')
      .populate('students', 'name username avatar avatarUrl contact dob status')
      .lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    const [sessions, attendanceHistory] = await Promise.all([
      ClassroomSession.find({ classroom: id })
        .sort({ startedAt: -1, createdAt: -1 })
        .limit(50)
        .populate('teacher', 'name email avatar avatarUrl')
        .populate('lesson', 'title vietnameseTitle estimatedDuration description')
        .populate('activities', 'title activityType questionCount')
        .populate('studentScores.student', 'name username avatar avatarUrl contact dob')
        .populate('questionResults.studentAnswers.student', 'name username avatar avatarUrl')
        .populate('summary.studentsNeedingPractice', 'name avatar avatarUrl')
        .populate('summary.topPerformers', 'name avatar avatarUrl')
        .lean(),
      Attendance.find({ classroom: id })
        .sort({ date: -1 })
        .limit(30)
        .populate('records.student', 'name username avatar avatarUrl contact')
        .lean()
    ]);

    const enrolledStudents = classroom.students || [];

    const enhancedSessions = sessions.map(session => {
      const recordedStudentIds = new Set(
        (session.studentScores || []).map(sc => String(sc.student?._id || sc.student))
      );

      const unrecordedStudents = session.status === 'COMPLETED'
        ? enrolledStudents
            .filter(st => !recordedStudentIds.has(String(st._id)))
            .map(st => ({
              student: st,
              attendance: 'ABSENT',
              points: 0,
              stars: 0,
              correctCount: 0,
              incorrectCount: 0,
              notAnswered: 0,
              status: 'ACTIVE',
              isAutoFilled: true
            }))
        : [];

      const allStudentScores = [...(session.studentScores || []), ...unrecordedStudents];

      const presentCount = allStudentScores.filter(s => s.attendance === 'PRESENT').length;
      const excusedCount = allStudentScores.filter(s => s.attendance === 'EXCUSED').length;
      const absentCount = allStudentScores.filter(s => s.attendance === 'ABSENT').length;
      const lateCount = allStudentScores.filter(s => s.attendance === 'LATE').length;
      const totalRoster = allStudentScores.length;
      const attendanceRate = totalRoster > 0 ? Math.round(((presentCount + lateCount) / totalRoster) * 100) : 0;

      return {
        ...session,
        allStudentScores,
        attendanceStats: {
          total: totalRoster,
          present: presentCount,
          excused: excusedCount,
          absent: absentCount,
          late: lateCount,
          attendanceRate
        }
      };
    });

    res.status(200).json({
      success: true,
      data: {
        classroom,
        enrolledStudents,
        sessions: enhancedSessions,
        attendanceHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update class curriculum progress (set current active lesson or completed lessons)
// @route   PUT /api/admin/classrooms/:id/curriculum-progress
// @access  Private / Admin
const updateClassroomCurriculumProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentLessonId, completedLessonIds, markCompletedLessonId } = req.body;

    const classroom = await ClassRoom.findById(id);
    if (classroom?.deletionPending) throw integrity.fail('Lớp đang được xóa. Vui lòng hoàn tất thao tác xóa.');
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    if (currentLessonId) {
      const lesson = await Lesson.findOne({ _id: currentLessonId, ageGroupCode: classroom.ageGroupCode, status: 'ACTIVE' });
      if (!lesson) {
        return res.status(400).json({ success: false, message: 'Bài học không hợp lệ.' });
      }
      classroom.currentLesson = lesson._id;
    }

    if (Array.isArray(completedLessonIds)) {
      const count = await Lesson.countDocuments({ _id: { $in: [...new Set(completedLessonIds)] }, ageGroupCode: classroom.ageGroupCode, status: 'ACTIVE' });
      if (count !== new Set(completedLessonIds).size) throw integrity.fail('Danh sách bài hoàn thành không phù hợp với lớp.');
      classroom.completedLessons = [...new Set(completedLessonIds)];
    }

    if (markCompletedLessonId) {
      if (!await Lesson.exists({ _id: markCompletedLessonId, ageGroupCode: classroom.ageGroupCode, status: 'ACTIVE' })) throw integrity.fail('Bài hoàn thành không phù hợp với lớp.');
      if (!classroom.completedLessons.includes(markCompletedLessonId)) {
        classroom.completedLessons.push(markCompletedLessonId);
      }
    }

    await classroom.save();

    if (req.user) {
      await writeAudit({
        user: req.user._id,
        action: 'UPDATE_CLASS_CURRICULUM_PROGRESS',
        targetType: 'ClassRoom',
        targetId: classroom._id,
        details: { className: classroom.name, currentLessonId }
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã cập nhật tiến độ giáo trình cho lớp ${classroom.name} thành công!`,
      data: classroom
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Full system database export for disaster recovery & backup
// @route   GET /api/admin/system/backup
// @access  Private / Admin
const exportSystemBackup = maintenance.exportSystemBackup;

module.exports = {
  getStudentCompetency: maintenance.getStudentCompetency,
  resetStaffPassword: maintenance.resetStaffPassword,
  getDashboardStats,
  getCurriculum,
  getUsers,
  createTeacher,
  createChild,
  bulkImportChildren,
  updateUser,
  resetChildPin,
  deleteUser,
  toggleUserStatus,
  getAuditLogs,
  toggleTopicStatus,
  getClassrooms,
  getClassroomById,
  getClassroomFullDetail,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  assignStudentsToClassroom,
  addStudentToClassroom,
  removeStudentFromClassroom,
  assignTeacherToClassroom,
  importStudentsFromExcel,
  exportClassroomExcel,
  getClassroomCurriculumProgress,
  updateClassroomCurriculumProgress,
  getClassroomSessions,
  exportSystemBackup,
  getUnassignedStudents,
  getDeepCurriculum,
  toggleLessonStatus,
  getAdminAnalytics,
  getSystemSettings,
  updateSystemSettings,
  // Curriculum Units, Lessons, Vocab
  createUnit,
  updateUnit,
  deleteUnit,
  createLesson,
  updateLesson,
  deleteLesson,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  // Sentences
  getSentencePatterns,
  createSentencePattern,
  updateSentencePattern,
  deleteSentencePattern,
  // Schedules
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getTeacherSchedule,
  autoAssignCurriculumSchedules,
  clearScheduleLessons,
  // Activities & Games
  getAdminActivities,
  getAdminActivityById,
  createAdminActivity,
  updateAdminActivity,
  deleteAdminActivity,
  toggleActivityStatus
};
