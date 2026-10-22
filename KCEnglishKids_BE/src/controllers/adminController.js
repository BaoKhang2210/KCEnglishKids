const {
  User,
  Topic,
  Lesson,
  Activity,
  CurriculumBook,
  CurriculumUnit,
  LearningSession,
  ActivityResult,
  Vocabulary,
  AgeGroup,
  ClassRoom,
  AuditLog,
  ClassroomSession,
  SystemSetting,
  LanguageContent,
  Schedule,
  UnitCompletion
} = require('../models');
const XLSX = require('xlsx');

// Helper to generate SVG avatar for demo cards
const createAvatarSvg = (emoji, bg) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" rx="40" fill="${bg || '#FFE082'}"/>
    <text x="100" y="125" font-size="95" text-anchor="middle" dominant-baseline="middle">${emoji || '🌟'}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

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
      LearningSession.countDocuments(),
      LearningSession.countDocuments({ status: 'COMPLETED' }),
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
        recentResults
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
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    // §1.1.9 — sort A-Z (Vietnamese collation) + pagination instead of fixed order/limit
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -pin')
        .populate('assignedClass', 'name academicYear')
        .populate('ageGroup', 'name code')
        .sort({ name: 1 })
        .collation({ locale: 'vi', strength: 2 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query)
    ]);

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
const createTeacher = async (req, res, next) => {
  try {
    const { name, username, email, password, avatar, contact, assignedClass } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ họ tên, tên đăng nhập, email và mật khẩu.'
      });
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc tên đăng nhập này đã được sử dụng.'
      });
    }

    const teacher = new User({
      role: 'TEACHER',
      name,
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      contact: contact || '',
      avatar: avatar || 'fox',
      avatarUrl: createAvatarSvg('🦊', '#FFE0B2'),
      status: 'ACTIVE'
    });

    await teacher.save();

    // Assign to classroom if provided
    if (assignedClass) {
      await ClassRoom.findByIdAndUpdate(assignedClass, { teacher: teacher._id });
    }

    // Log action
    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'CREATE_USER',
        targetType: 'User',
        targetId: teacher._id,
        details: { role: 'TEACHER', email: teacher.email, name: teacher.name, assignedClass }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản giáo viên và phân công thành công!',
      data: teacher
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Child account with DOB validation
// @route   POST /api/admin/children
// @access  Private / Admin
const createChild = async (req, res, next) => {
  try {
    const { name, dob, avatar, pin, assignedClass, email, contact, password } = req.body;

    if (!name || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên học sinh và mã PIN 4 chữ số.'
      });
    }

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'Mã PIN của trẻ phải đúng 4 chữ số.'
      });
    }

    // Determine age group from body or DOB (default to 3-4)
    let ageGroupCode = req.body.ageGroupCode || '3-4';
    if (dob) {
      const birthDate = new Date(dob);
      const ageDiffMs = Date.now() - birthDate.getTime();
      const ageYears = Math.floor(ageDiffMs / (365.25 * 24 * 60 * 60 * 1000));

      if (ageYears <= 3) {
        ageGroupCode = '3-4';
      } else if (ageYears === 4) {
        ageGroupCode = '4-5';
      } else {
        ageGroupCode = '5-6';
      }
    }

    const ageGroupDoc = await AgeGroup.findOne({ code: ageGroupCode });

    const avatarKey = avatar || 'lion';
    const avatarEmojiMap = { lion: '🦁', panda: '🐼', rabbit: '🐰', bear: '🐻', fox: '🦊', koala: '🐨' };
    const emoji = avatarEmojiMap[avatarKey] || '🦁';

    const child = new User({
      role: 'CHILD',
      name,
      dob: dob ? new Date(dob) : undefined,
      avatar: avatarKey,
      avatarUrl: createAvatarSvg(emoji, '#FFE082'),
      pin,
      password: password || pin, // allows logging in with password or pin
      email: email ? email.toLowerCase().trim() : undefined,
      contact: contact ? contact.trim() : undefined,
      ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
      ageGroupCode,
      assignedClass: assignedClass || undefined,
      status: 'ACTIVE'
    });

    await child.save();

    // Link student to classroom if provided
    if (assignedClass) {
      await ClassRoom.findByIdAndUpdate(assignedClass, {
        $addToSet: { students: child._id }
      });
    }

    // Log action
    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'CREATE_USER',
        targetType: 'User',
        targetId: child._id,
        details: { role: 'CHILD', name: child.name, ageGroupCode, dob }
      });
    }

    res.status(201).json({
      success: true,
      message: `Tạo tài khoản học sinh thành công! Tự động gán: Nhóm tuổi ${ageGroupCode} (${ageGroupDoc?.name || ''}).`,
      data: child
    });
  } catch (error) {
    next(error);
  }
};

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

    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Không thể khóa tài khoản quản trị viên chính.' });
    }

    const newStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    user.status = newStatus;
    await user.save();

    // Log action
    if (req.user) {
      await AuditLog.create({
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
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = eDate;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
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

    topic.status = topic.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await topic.save();

    if (req.user) {
      await AuditLog.create({
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
      .populate('students', 'name username avatar avatarUrl ageGroupCode dob contact pin status')
      .populate('ageGroup', 'name code')
      .populate('currentLesson', 'title vietnameseTitle displayOrder')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = classrooms.map(c => ({
      ...c,
      studentCount: c.students ? c.students.length : 0
    }));

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
const helperCreateStudentsFromList = async (students, classroomId, defaultAgeGroupCode = '3-4', defaultAgeGroupDoc = null) => {
  const avatarKeys = ['lion', 'panda', 'rabbit', 'bear', 'fox', 'koala'];
  const avatarEmojiMap = { lion: '🦁', panda: '🐼', rabbit: '🐰', bear: '🐻', fox: '🦊', koala: '🐨' };

  const createdUsers = [];
  const errors = [];

  const ageGroupsCache = {};
  const getAgeGroup = async (code) => {
    if (!ageGroupsCache[code]) {
      ageGroupsCache[code] = await AgeGroup.findOne({ code });
    }
    return ageGroupsCache[code];
  };

  for (let i = 0; i < students.length; i++) {
    const item = students[i];
    const rawName = item.name || item.fullName || item['Họ và tên'] || item['Họ tên'] || item['Tên'] || '';
    const name = String(rawName).trim();

    if (!name) {
      errors.push(`Dòng ${i + 1}: Thiếu họ và tên học sinh.`);
      continue;
    }

    let rawPin = item.pin || item['Mã PIN'] || item['PIN'] || '';
    rawPin = String(rawPin).trim();
    let pin = rawPin;
    if (!pin || !/^\d{4}$/.test(pin)) {
      pin = String(Math.floor(1000 + Math.random() * 9000));
    }

    let rawDob = item.dob || item.birthDate || item['Ngày sinh'] || '';
    let dob = null;
    if (rawDob) {
      if (typeof rawDob === 'number') {
        dob = new Date(Math.round((rawDob - 25569) * 86400 * 1000));
      } else if (typeof rawDob === 'string') {
        const parts = rawDob.trim().split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            dob = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`);
          } else if (parts[2].length === 4) {
            dob = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          } else {
            dob = new Date(rawDob);
          }
        } else {
          dob = new Date(rawDob);
        }
      }
      if (isNaN(dob?.getTime())) {
        dob = undefined;
      }
    }

    let itemAgeCode = item.ageGroupCode || item['Nhóm tuổi'] || defaultAgeGroupCode;
    if (!['3-4', '4-5', '5-6'].includes(itemAgeCode)) {
      if (dob) {
        const ageYears = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        itemAgeCode = ageYears <= 3 ? '3-4' : ageYears === 4 ? '4-5' : '5-6';
      } else {
        itemAgeCode = defaultAgeGroupCode || '3-4';
      }
    }

    const ageDoc = (await getAgeGroup(itemAgeCode)) || defaultAgeGroupDoc;

    const rawContact = item.contact || item.parentContact || item.phone || item['SĐT Phụ huynh'] || item['Số điện thoại'] || item['SĐT'] || '';
    const contact = String(rawContact).trim();

    const cleanName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    let username = `${cleanName || 'kid'}${Math.floor(100 + Math.random() * 900)}`;

    let existingUser = await User.findOne({ username });
    while (existingUser) {
      username = `${cleanName || 'kid'}${Math.floor(1000 + Math.random() * 9000)}`;
      existingUser = await User.findOne({ username });
    }

    const avatarKey = item.avatar && avatarKeys.includes(item.avatar)
      ? item.avatar
      : avatarKeys[i % avatarKeys.length];
    const emoji = avatarEmojiMap[avatarKey] || '🦁';

    const child = new User({
      role: 'CHILD',
      name,
      username,
      dob: dob || undefined,
      pin,
      password: pin,
      contact: contact || undefined,
      parentContact: contact || undefined,
      avatar: avatarKey,
      avatarUrl: createAvatarSvg(emoji, '#FFE082'),
      ageGroup: ageDoc ? ageDoc._id : undefined,
      ageGroupCode: itemAgeCode,
      assignedClass: classroomId || undefined,
      status: 'ACTIVE'
    });

    await child.save();
    createdUsers.push(child);
  }

  return { createdUsers, errors };
};

// @desc    Bulk create child accounts from Excel data
// @route   POST /api/admin/children/bulk-import
// @access  Private / Admin
const bulkImportChildren = async (req, res, next) => {
  try {
    const { students, classroomId, defaultAgeGroupCode } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách học sinh không hợp lệ hoặc rỗng.'
      });
    }

    let targetClass = null;
    if (classroomId) {
      targetClass = await ClassRoom.findById(classroomId);
    }

    const ageCode = targetClass?.ageGroupCode || defaultAgeGroupCode || '3-4';
    const ageDoc = await AgeGroup.findOne({ code: ageCode });

    const { createdUsers, errors } = await helperCreateStudentsFromList(
      students,
      targetClass?._id,
      ageCode,
      ageDoc
    );

    if (createdUsers.length > 0 && targetClass) {
      const newIds = createdUsers.map(u => u._id);
      await ClassRoom.findByIdAndUpdate(targetClass._id, {
        $addToSet: { students: { $each: newIds } }
      });
    }

    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'BULK_IMPORT_STUDENTS',
        targetType: targetClass ? 'ClassRoom' : 'User',
        targetId: targetClass ? targetClass._id : undefined,
        details: {
          totalRows: students.length,
          importedCount: createdUsers.length,
          errorsCount: errors.length,
          className: targetClass?.name || 'Chưa phân lớp'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã tạo thành công ${createdUsers.length} tài khoản học sinh!${errors.length > 0 ? ` Có ${errors.length} dòng lỗi.` : ''}`,
      data: {
        count: createdUsers.length,
        errors,
        users: createdUsers
      }
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Create new Classroom with assigned teacher and optional initial Excel students
// @route   POST /api/admin/classrooms
// @access  Private / Admin
const createClassroom = async (req, res, next) => {
  try {
    const { name, ageGroupCode, teacherId, academicYear, description, students } = req.body;
    if (!name || !ageGroupCode || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên lớp, độ tuổi (3-4, 4-5, 5-6) và giáo viên phụ trách.'
      });
    }

    const cleanName = String(name).trim();
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

    // 2. Validate teacher and enforce 1-1 rule
    const teacher = await User.findOne({ _id: teacherId, role: 'TEACHER' });
    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: 'Giáo viên phụ trách không hợp lệ.'
      });
    }

    const existingTeacherClass = await ClassRoom.findOne({
      teacher: teacher._id,
      status: { $ne: 'INACTIVE' }
    });
    if (existingTeacherClass) {
      return res.status(400).json({
        success: false,
        message: `Giáo viên "${teacher.name}" đã được phân công chủ nhiệm lớp "${existingTeacherClass.name}". Theo quy định của trường, mỗi giáo viên chỉ dạy 1 lớp học!`
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
      academicYear: academicYear || '2026-2027',
      description: description || '',
      status: 'ACTIVE',
      students: []
    });

    let initialImportedCount = 0;
    if (Array.isArray(students) && students.length > 0) {
      const { createdUsers } = await helperCreateStudentsFromList(students, classroom._id, ageGroupCode, ageGroupDoc);
      if (createdUsers.length > 0) {
        classroom.students = createdUsers.map(u => u._id);
        await classroom.save();
        initialImportedCount = createdUsers.length;
      }
    }

    await classroom.populate('teacher', 'name email username avatar avatarUrl');
    await classroom.populate('students', 'name username avatar avatarUrl ageGroupCode dob pin contact');
    await classroom.populate('currentLesson', 'title vietnameseTitle displayOrder');

    if (req.user) {
      await AuditLog.create({
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
      data: classroom
    });
  } catch (error) {
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
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    // Check unique name if name is changing
    if (name) {
      const cleanName = String(name).trim();
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
      const existingTeacherClass = await ClassRoom.findOne({
        teacher: teacher._id,
        _id: { $ne: id },
        status: { $ne: 'INACTIVE' }
      });
      if (existingTeacherClass) {
        return res.status(400).json({
          success: false,
          message: `Giáo viên "${teacher.name}" đã phụ trách lớp "${existingTeacherClass.name}". Mỗi giáo viên chỉ được phụ trách 1 lớp học!`
        });
      }
      classroom.teacher = teacher._id;
    }

    if (currentLessonId) {
      classroom.currentLesson = currentLessonId;
    }

    if (academicYear) classroom.academicYear = academicYear;
    if (description !== undefined) classroom.description = description;
    if (status && ['ACTIVE', 'INACTIVE', 'COMPLETED', 'UPCOMING'].includes(status)) {
      classroom.status = status;
    }

    await classroom.save();
    await classroom.populate('teacher', 'name email username avatar avatarUrl');
    await classroom.populate('students', 'name username avatar avatarUrl ageGroupCode dob contact pin');
    await classroom.populate('currentLesson', 'title vietnameseTitle displayOrder');

    if (req.user) {
      await AuditLog.create({
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
const deleteClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await ClassRoom.findById(id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại hoặc đã bị xóa.' });
    }

    const className = classroom.name;
    const studentIds = classroom.students || [];

    // 1. Wipe out all student accounts belonging to this class permanently
    const deleteStudentsResult = await User.deleteMany({
      $or: [
        { assignedClass: classroom._id },
        { _id: { $in: studentIds } }
      ],
      role: 'CHILD'
    });

    // 2. Clean up attendances, sessions, and schedules associated with this class
    try {
      await Attendance.deleteMany({ classroom: classroom._id });
      await ClassroomSession.deleteMany({ classroom: classroom._id });
      const Schedule = mongoose.models.Schedule || require('../models/Schedule');
      if (Schedule) {
        await Schedule.deleteMany({ classroom: classroom._id });
      }
    } catch (e) {
      console.warn('Could not clean up secondary classroom records:', e);
    }

    // 3. Delete the classroom document itself
    await ClassRoom.findByIdAndDelete(id);

    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'DELETE_CLASSROOM',
        targetType: 'ClassRoom',
        targetId: id,
        details: {
          name: className,
          deletedStudentsCount: deleteStudentsResult.deletedCount,
          note: 'Đã xóa vĩnh viễn lớp học và toàn bộ học sinh thuộc lớp theo quy định'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã xóa vĩnh viễn lớp học "${className}" cùng toàn bộ ${deleteStudentsResult.deletedCount} hồ sơ học sinh thuộc lớp.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign students to classroom
// @route   POST /api/admin/classrooms/:id/assign-students
// @access  Private / Admin
const assignStudentsToClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ success: false, message: 'Danh sách học sinh không hợp lệ.' });
    }

    const classroom = await ClassRoom.findById(id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    classroom.students = studentIds;
    await classroom.save();

    await User.updateMany(
      { _id: { $in: studentIds } },
      { $set: { assignedClass: classroom._id, ageGroupCode: classroom.ageGroupCode } }
    );

    res.status(200).json({
      success: true,
      message: `Đã phân bổ ${studentIds.length} học sinh vào lớp ${classroom.name}!`,
      data: classroom
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details (name, email, dob, contact, ageGroupCode, assignedClass, status)
// @route   PUT /api/admin/users/:id
// @access  Private / Admin
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, username, dob, contact, ageGroupCode, assignedClass, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
    }

    if (name) user.name = name.trim();
    if (email && email.toLowerCase().trim() !== (user.email || '').toLowerCase()) {
      const emailExists = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email đã được sử dụng bởi tài khoản khác.' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (username && username.toLowerCase().trim() !== (user.username || '').toLowerCase()) {
      const uExists = await User.findOne({ username: username.toLowerCase().trim(), _id: { $ne: id } });
      if (uExists) {
        return res.status(400).json({ success: false, message: 'Tên đăng nhập đã được sử dụng bởi tài khoản khác.' });
      }
      user.username = username.toLowerCase().trim();
    }
    if (dob) user.dob = new Date(dob);
    if (contact !== undefined) user.contact = contact.trim();
    if (status && ['ACTIVE', 'INACTIVE', 'LOCKED'].includes(status)) user.status = status;

    if (user.role === 'CHILD') {
      const oldClassId = user.assignedClass ? user.assignedClass.toString() : null;
      const newClassId = assignedClass ? assignedClass.toString() : null;

      if (oldClassId !== newClassId) {
        if (oldClassId) {
          await ClassRoom.findByIdAndUpdate(oldClassId, { $pull: { students: user._id } });
        }
        if (newClassId) {
          const newClass = await ClassRoom.findByIdAndUpdate(newClassId, { $addToSet: { students: user._id } }, { new: true });
          user.assignedClass = newClass._id;
          if (newClass.ageGroupCode) {
            user.ageGroupCode = newClass.ageGroupCode;
            const ag = await AgeGroup.findOne({ code: newClass.ageGroupCode });
            if (ag) user.ageGroup = ag._id;
          }
        } else {
          user.assignedClass = undefined;
        }
      }

      if (ageGroupCode && !user.assignedClass) {
        user.ageGroupCode = ageGroupCode;
        const ag = await AgeGroup.findOne({ code: ageGroupCode });
        if (ag) user.ageGroup = ag._id;
      }
    } else if (user.role === 'TEACHER') {
      if (assignedClass) {
        await ClassRoom.findByIdAndUpdate(assignedClass, { teacher: user._id });
        user.assignedClass = assignedClass;
      }
    }

    await user.save();

    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'UPDATE_USER',
        targetType: 'User',
        targetId: user._id,
        details: { name: user.name, role: user.role }
      });
    }

    const updatedUser = await User.findById(user._id)
      .select('-password -pin')
      .populate('assignedClass', 'name academicYear ageGroupCode')
      .populate('ageGroup', 'name code');

    res.status(200).json({
      success: true,
      message: `Cập nhật thông tin tài khoản ${user.name} thành công!`,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

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
    child.password = pin; // Allows PIN as password
    await child.save();

    if (req.user) {
      await AuditLog.create({
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

    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên chính.' });
    }

    user.status = 'INACTIVE';
    await user.save();

    if (user.assignedClass) {
      await ClassRoom.findByIdAndUpdate(user.assignedClass, { $pull: { students: user._id } });
    }

    if (req.user) {
      await AuditLog.create({
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
    const [books, units, lessons, activities, vocabularies, sentences, topics] = await Promise.all([
      CurriculumBook.find().sort({ bookNumber: 1 }).lean(),
      CurriculumUnit.find().sort({ bookNumber: 1, unitNumber: 1 }).lean(),
      Lesson.find().populate('topic', 'title englishName').sort({ displayOrder: 1 }).lean(),
      Activity.find().select('lesson activityType title status maxScore').lean(),
      Vocabulary.find().select('_id english vietnamese pronunciation meaning audioUrl imageUrl category status sourceUnits topics lesson').lean(),
      LanguageContent.find().select('_id lesson sourceUnit topic vocabulary english vietnamese pronunciation contentType difficulty status pairId relatedQuestion').lean(),
      Topic.find().lean()
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

    lesson.status = lesson.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await lesson.save();

    if (req.user) {
      await AuditLog.create({
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
const getAdminAnalytics = async (req, res, next) => {
  try {
    const [
      totalStudents,
      classrooms,
      actResults,
      clsSessions,
      unitCompletions,
      recentUsers
    ] = await Promise.all([
      User.countDocuments({ role: 'CHILD', status: 'ACTIVE' }),
      ClassRoom.find().populate('teacher', 'name email').populate('students', 'name avatar ageGroupCode').lean(),
      ActivityResult.find().select('score stars child createdAt').lean(),
      ClassroomSession.find().select('sessionNumber classroom studentScores summary status createdAt').lean(),
      UnitCompletion.find().select('child rewards').lean(),
      User.find({ role: 'CHILD' }).select('name avatar ageGroupCode assignedClass streak createdAt').sort({ createdAt: -1 }).limit(10).lean()
    ]);

    // 1. Compute Home Stars (from ActivityResult + UnitCompletion bonus stars)
    let totalHomeActivityStars = 0;
    const studentHomeStarMap = {};
    for (const resItem of actResults) {
      const s = Number(resItem.stars) || 0;
      totalHomeActivityStars += s;
      if (resItem.child) {
        const cid = resItem.child.toString();
        studentHomeStarMap[cid] = (studentHomeStarMap[cid] || 0) + s;
      }
    }

    let totalBonusStars = 0;
    for (const comp of (unitCompletions || [])) {
      const starReward = (comp.rewards || []).find(r => r.type === 'STAR');
      const amt = starReward ? (Number(starReward.amount) || 0) : 0;
      totalBonusStars += amt;
      if (comp.child) {
        const cid = comp.child.toString();
        studentHomeStarMap[cid] = (studentHomeStarMap[cid] || 0) + amt;
      }
    }

    const totalHomeStars = totalHomeActivityStars + totalBonusStars;

    // 2. Compute Classroom Stars (from ClassroomSession.studentScores and session.summary)
    let totalClassStars = 0;
    const studentClassStarMap = {};
    for (const session of clsSessions) {
      let sessionStars = 0;
      if (Array.isArray(session.studentScores)) {
        for (const scoreObj of session.studentScores) {
          const stars = Number(scoreObj.stars) || 0;
          sessionStars += stars;
          const stId = (scoreObj.student?._id || scoreObj.student)?.toString();
          if (stId) {
            studentClassStarMap[stId] = (studentClassStarMap[stId] || 0) + stars;
          }
        }
      }
      // If studentScores didn't yield stars, fallback to summary.totalStars
      if (sessionStars === 0 && session.summary && session.summary.totalStars) {
        sessionStars = Number(session.summary.totalStars) || 0;
      }
      totalClassStars += sessionStars;
    }

    // 3. Combined total stars map per student
    const studentTotalStarMap = {};
    const allStudentIds = new Set([...Object.keys(studentHomeStarMap), ...Object.keys(studentClassStarMap)]);
    for (const id of allStudentIds) {
      studentTotalStarMap[id] = (studentHomeStarMap[id] || 0) + (studentClassStarMap[id] || 0);
    }

    // 4. Classroom performance summary
    const classroomStats = classrooms.map(c => {
      const sCount = Array.isArray(c.students) ? c.students.length : 0;
      const cSessions = clsSessions.filter(cs => cs.classroom && cs.classroom.toString() === c._id.toString());

      let classSessionStars = 0;
      for (const cs of cSessions) {
        let sStars = 0;
        if (Array.isArray(cs.studentScores)) {
          sStars = cs.studentScores.reduce((acc, sc) => acc + (Number(sc.stars) || 0), 0);
        }
        if (sStars === 0 && cs.summary?.totalStars) {
          sStars = Number(cs.summary.totalStars) || 0;
        }
        classSessionStars += sStars;
      }

      let totalStudentStars = 0;
      let totalStudentHomeStars = 0;
      let totalStudentClassStars = 0;
      for (const st of (c.students || [])) {
        const sid = st._id.toString();
        totalStudentStars += studentTotalStarMap[sid] || 0;
        totalStudentHomeStars += studentHomeStarMap[sid] || 0;
        totalStudentClassStars += studentClassStarMap[sid] || 0;
      }

      return {
        _id: c._id,
        name: c.name,
        ageGroupCode: c.ageGroupCode,
        teacherName: c.teacher?.name || 'Chưa phân công',
        studentCount: sCount,
        sessionCount: cSessions.length,
        totalStars: totalStudentStars,
        classSessionStars,
        classStars: totalStudentClassStars,
        homeStars: totalStudentHomeStars,
        avgStarsPerStudent: sCount > 0 ? Math.round(totalStudentStars / sCount) : 0
      };
    });

    // 5. Top 5 students
    const studentDocs = await User.find({ role: 'CHILD', status: 'ACTIVE' })
      .select('name avatar ageGroupCode assignedClass')
      .populate('assignedClass', 'name')
      .lean();

    const rankedStudents = studentDocs.map(st => {
      const cid = st._id.toString();
      const home = studentHomeStarMap[cid] || 0;
      const classStars = studentClassStarMap[cid] || 0;
      const total = (studentTotalStarMap[cid] || (home + classStars)) || 0;
      return {
        _id: st._id,
        name: st.name,
        avatar: st.avatar || 'lion',
        ageGroupCode: st.ageGroupCode,
        className: st.assignedClass?.name || 'Chưa vào lớp',
        homeStars: home,
        classStars,
        totalStars: total
      };
    }).sort((a, b) => b.totalStars - a.totalStars).slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalHomeStars,
        totalClassStars,
        totalAllStars: totalHomeStars + totalClassStars,
        totalClassrooms: classrooms.length,
        totalSessionsConducted: clsSessions.length,
        classroomStats,
        topStudents: rankedStudents,
        recentStudents: recentUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

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
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = new SystemSetting(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    if (req.user) settings.updatedBy = req.user._id;
    await settings.save();

    if (req.user) {
      await AuditLog.create({
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
      await AuditLog.create({
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

    const attachedLessons = await Lesson.countDocuments({ curriculumUnits: unit._id });
    if (attachedLessons > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa Unit này vì đang có ${attachedLessons} bài học thuộc Unit. Vui lòng chuyển bài học sang Unit khác trước.`
      });
    }

    await CurriculumUnit.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Đã xóa Unit ${unit.unitNumber} thành công.`
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

    const finalAgeGroupCode = ageGroupCode || '3-4';
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
      status: 'ACTIVE'
    });

    if (req.user) {
      await AuditLog.create({
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

    if (title) lesson.title = title.trim();
    if (vietnameseTitle !== undefined) lesson.vietnameseTitle = vietnameseTitle.trim();
    if (description !== undefined) lesson.description = description;
    if (topicId) lesson.topic = topicId;
    if (unitId) lesson.curriculumUnits = [unitId];
    if (ageGroupCode) {
      lesson.ageGroupCode = ageGroupCode;
      const ag = await AgeGroup.findOne({ code: ageGroupCode });
      if (ag) lesson.ageGroup = ag._id;
    }
    if (displayOrder !== undefined) lesson.displayOrder = displayOrder;
    if (difficulty !== undefined) lesson.difficulty = difficulty;
    if (status) lesson.status = status;

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

    const vocab = await Vocabulary.create({
      english: english.trim(),
      vietnamese: vietnamese.trim(),
      pronunciation: pronunciation ? pronunciation.trim() : '',
      category: category ? category.trim() : 'General',
      ageGroupCodes: ageGroupCodes || ['3-4'],
      sourceUnits: sourceUnits || [],
      lesson: lessonId || undefined,
      status: 'ACTIVE'
    });

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

    if (english) vocab.english = english.trim();
    if (vietnamese) vocab.vietnamese = vietnamese.trim();
    if (pronunciation !== undefined) vocab.pronunciation = pronunciation.trim();
    if (category !== undefined) vocab.category = category.trim();
    if (ageGroupCodes) vocab.ageGroupCodes = ageGroupCodes;
    if (status) vocab.status = status;

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

    await Lesson.updateMany({ vocabularyItems: vocab._id }, { $pull: { vocabularyItems: vocab._id } });
    await Vocabulary.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Đã xóa từ vựng "${vocab.english}" thành công.`
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
        { english: { $regex: search, $options: 'i' } },
        { vietnamese: { $regex: search, $options: 'i' } }
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
        await AuditLog.create({
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
      await AuditLog.create({
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
    const { contentType, english, vietnamese, pronunciation, ageGroupCode, sourceUnit, lesson, difficulty, status, pairId, relatedQuestion } = req.body;

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
      .populate('students', 'name username avatar avatarUrl ageGroupCode dob pin contact status createdAt')
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
      const validStudents = await User.find({ _id: { $in: idsToAdd }, role: 'CHILD' });
      if (validStudents.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản học sinh hợp lệ trong hệ thống.' });
      }
      const validIds = validStudents.map(s => s._id);

      // Remove from other classes
      await ClassRoom.updateMany(
        { _id: { $ne: classroom._id }, students: { $in: validIds } },
        { $pull: { students: { $in: validIds } } }
      );

      // Add to this class
      await ClassRoom.findByIdAndUpdate(id, {
        $addToSet: { students: { $each: validIds } }
      });

      // Update students' assignedClass and ageGroupCode to match class
      await User.updateMany(
        { _id: { $in: validIds } },
        { $set: { assignedClass: classroom._id, ageGroupCode: classroom.ageGroupCode } }
      );

      if (req.user) {
        await AuditLog.create({
          user: req.user._id,
          action: 'ADD_STUDENTS_TO_CLASS',
          targetType: 'ClassRoom',
          targetId: classroom._id,
          details: { className: classroom.name, count: validIds.length, studentNames: validStudents.map(s => s.name) }
        });
      }

      const updated = await ClassRoom.findById(id)
        .populate('teacher', 'name email username avatar avatarUrl')
        .populate('students', 'name avatar avatarUrl ageGroupCode dob contact username pin status');

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
      const { createdUsers, errors } = await helperCreateStudentsFromList(
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
        await AuditLog.create({
          user: req.user._id,
          action: 'ADD_INDIVIDUAL_STUDENT',
          targetType: 'ClassRoom',
          targetId: classroom._id,
          details: { className: classroom.name, studentName: newKid.name, username: newKid.username }
        });
      }

      const updated = await ClassRoom.findById(id)
        .populate('teacher', 'name email username avatar avatarUrl')
        .populate('students', 'name avatar avatarUrl ageGroupCode dob contact username pin status');

      return res.status(201).json({
        success: true,
        message: `Đã tiếp nhận và thêm học sinh "${newKid.name}" (Mã: ${newKid.username}, PIN: ${newKid.pin}) vào lớp ${classroom.name}!`,
        data: updated,
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
const removeStudentFromClassroom = async (req, res, next) => {
  try {
    const { id, studentId } = req.params;
    const classroom = await ClassRoom.findById(id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    await ClassRoom.findByIdAndUpdate(id, { $pull: { students: studentId } });
    await User.findByIdAndUpdate(studentId, { $unset: { assignedClass: 1 } });

    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'REMOVE_STUDENT_FROM_CLASS',
        targetType: 'ClassRoom',
        targetId: classroom._id,
        details: { className: classroom.name, studentId }
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã chuyển học sinh ra khỏi lớp ${classroom.name}.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import students into a classroom from Excel data (batch creation + assignment)
// @route   POST /api/admin/classrooms/:id/import-students-excel
// @access  Private / Admin
const importStudentsFromExcel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp danh sách học sinh cần nhập từ file Excel.'
      });
    }

    const classroom = await ClassRoom.findById(id).populate('ageGroup');
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    const ageGroupCode = classroom.ageGroupCode || '3-4';
    let ageGroupDoc = classroom.ageGroup;
    if (!ageGroupDoc) {
      ageGroupDoc = await AgeGroup.findOne({ code: ageGroupCode });
    }

    const { createdUsers, errors } = await helperCreateStudentsFromList(students, classroom._id, ageGroupCode, ageGroupDoc);

    if (createdUsers.length > 0) {
      const newIds = createdUsers.map(u => u._id);
      await ClassRoom.findByIdAndUpdate(id, {
        $addToSet: { students: { $each: newIds } }
      });

      if (req.user) {
        await AuditLog.create({
          user: req.user._id,
          action: 'IMPORT_STUDENTS_EXCEL',
          targetType: 'ClassRoom',
          targetId: classroom._id,
          details: {
            className: classroom.name,
            totalImported: createdUsers.length,
            errorsCount: errors.length
          }
        });
      }
    }

    const updatedClassroom = await ClassRoom.findById(id)
      .populate('teacher', 'name email username avatar avatarUrl')
      .populate('students', 'name avatar avatarUrl ageGroupCode dob contact username pin');

    res.status(200).json({
      success: true,
      message: `Đã nhập thành công ${createdUsers.length} học sinh từ file Excel vào lớp ${classroom.name}!`,
      data: {
        importedCount: createdUsers.length,
        errors,
        students: createdUsers,
        classroom: updatedClassroom
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export classroom student roster to Excel data
// @route   GET /api/admin/classrooms/:id/export-excel
// @access  Private / Admin
const exportClassroomExcel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await ClassRoom.findById(id)
      .populate('teacher', 'name email username contact')
      .populate('students', 'name username dob pin contact parentContact status ageGroupCode createdAt')
      .lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    const students = classroom.students || [];
    const rows = students.map((s, idx) => ({
      STT: idx + 1,
      'Họ và tên': s.name || '',
      'Tên đăng nhập': s.username || '',
      'Mã PIN': s.pin || '',
      'Ngày sinh': s.dob ? new Date(s.dob).toLocaleDateString('vi-VN') : '',
      'Nhóm tuổi': classroom.ageGroupCode ? `${classroom.ageGroupCode} tuổi` : '',
      'Lớp học': classroom.name,
      'Giáo viên chủ nhiệm': classroom.teacher?.name || 'Chưa phân công',
      'Năm học': classroom.academicYear || '2026-2027',
      'SĐT Phụ huynh': s.contact || s.parentContact || '',
      'Trạng thái': s.status === 'ACTIVE' ? 'Đang học' : 'Tạm dừng'
    }));

    if (req.user) {
      await AuditLog.create({
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
const assignTeacherToClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp ID giáo viên phụ trách.' });
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'TEACHER' });
    if (!teacher) {
      return res.status(400).json({ success: false, message: 'Không tìm thấy giáo viên hợp lệ.' });
    }

    const classroom = await ClassRoom.findById(id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    // Check 1-1 rule: teacher cannot already have another active classroom
    const existingTeacherClass = await ClassRoom.findOne({
      teacher: teacher._id,
      _id: { $ne: id },
      status: { $ne: 'INACTIVE' }
    });
    if (existingTeacherClass) {
      return res.status(400).json({
        success: false,
        message: `Giáo viên "${teacher.name}" đã phụ trách lớp "${existingTeacherClass.name}". Mỗi giáo viên chỉ được phụ trách 1 lớp học!`
      });
    }

    // Update classroom teacher
    classroom.teacher = teacher._id;
    await classroom.save();

    // Update teacher's assignedClass
    await User.findByIdAndUpdate(teacher._id, { $set: { assignedClass: classroom._id } });

    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'ASSIGN_TEACHER_TO_CLASS',
        targetType: 'ClassRoom',
        targetId: classroom._id,
        details: { className: classroom.name, teacherName: teacher.name }
      });
    }

    const updated = await ClassRoom.findById(id)
      .populate('teacher', 'name email username avatar avatarUrl contact')
      .populate('students', 'name avatar');

    res.status(200).json({
      success: true,
      message: `Đã phân công giáo viên ${teacher.name} phụ trách lớp ${classroom.name}!`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

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
      query.name = { $regex: search, $options: 'i' };
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

    // Nếu không truyền teacher, lấy giáo viên chủ nhiệm của lớp
    if (!assignedTeacher && classroomDoc.teacher) {
      assignedTeacher = classroomDoc.teacher;
    }

    if (!assignedTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Lớp học này chưa có giáo viên phụ trách. Vui lòng phân công giáo viên.'
      });
    }

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
      await AuditLog.create({
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

    await schedule.save();

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate('classroom', 'name ageGroupCode academicYear studentCount isActive')
      .populate('teacher', 'name email avatar avatarUrl username')
      .populate('weeklySlots.lesson', 'title vietnameseTitle displayOrder');

    // Audit log
    if (req.user?._id) {
      await AuditLog.create({
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
      await AuditLog.create({
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
    const schedules = await Schedule.find({ teacher: teacherId, isActive: true })
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
      const searchRegex = new RegExp(search.trim(), 'i');
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

    const formattedQuestions = (questions || []).map((q, idx) => ({
      promptText: q.promptText || '',
      promptAudioUrl: q.promptAudioUrl || '',
      promptImageUrl: q.promptImageUrl || '',
      correctAnswer: q.correctAnswer || (q.options?.find(o => o.isCorrect)?.text || ''),
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
      questionCount: questionCount ? Number(questionCount) : (formattedQuestions.length || 4),
      timeLimit: Number(timeLimit) || 0,
      pointsPerQuestion: Number(pointsPerQuestion) || 10,
      starConfig: starConfig || { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 },
      questions: formattedQuestions,
      order: Number(order) || 0,
      status: status || 'ACTIVE'
    });

    await AuditLog.create({
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
      questionCount,
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

    if (questions && Array.isArray(questions)) {
      activity.questions = questions.map((q, idx) => ({
        promptText: q.promptText || '',
        promptAudioUrl: q.promptAudioUrl || '',
        promptImageUrl: q.promptImageUrl || '',
        correctAnswer: q.correctAnswer || (q.options?.find(o => o.isCorrect)?.text || ''),
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
      activity.questionCount = questionCount !== undefined ? Number(questionCount) : activity.questions.length;
    } else if (questionCount !== undefined) {
      activity.questionCount = Number(questionCount);
    }

    await activity.save();

    await AuditLog.create({
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

    const title = activity.title;
    await Activity.findByIdAndDelete(id);

    await AuditLog.create({
      user: req.user._id,
      action: 'DELETE',
      targetType: 'SYSTEM',
      targetId: id,
      details: { title }
    });

    res.status(200).json({
      success: true,
      message: `Đã xóa trò chơi "${title}".`
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

    activity.status = activity.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await activity.save();

    await AuditLog.create({
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
      status: 'COMPLETED'
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

    // If currentLesson is not explicitly set, determine the next untaught lesson
    let activeLesson = classroom.currentLesson;
    if (!activeLesson && sequentialSyllabus.length > 0) {
      const nextUntaught = sequentialSyllabus.find(l => !l.isCompleted) || sequentialSyllabus[0];
      activeLesson = nextUntaught;
    }

    res.status(200).json({
      success: true,
      data: {
        classroom,
        curriculumBook: book,
        currentLesson: activeLesson,
        totalLessons: sequentialSyllabus.length,
        completedCount: sequentialSyllabus.filter(l => l.isCompleted).length,
        units: unitsWithLessons,
        sequentialSyllabus
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
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    if (currentLessonId) {
      const lesson = await Lesson.findById(currentLessonId);
      if (!lesson) {
        return res.status(400).json({ success: false, message: 'Bài học không hợp lệ.' });
      }
      classroom.currentLesson = lesson._id;
    }

    if (Array.isArray(completedLessonIds)) {
      classroom.completedLessons = completedLessonIds;
    }

    if (markCompletedLessonId) {
      if (!classroom.completedLessons.includes(markCompletedLessonId)) {
        classroom.completedLessons.push(markCompletedLessonId);
      }
    }

    await classroom.save();

    if (req.user) {
      await AuditLog.create({
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
const exportSystemBackup = async (req, res, next) => {
  try {
    const [
      users,
      classrooms,
      schedules,
      curriculumBooks,
      curriculumUnits,
      lessons,
      topics,
      vocabularies,
      languageContents,
      activities,
      classroomSessions,
      attendances,
      systemSettings,
      auditLogs
    ] = await Promise.all([
      User.find().select('-password').lean(),
      ClassRoom.find().lean(),
      Schedule.find().lean(),
      CurriculumBook.find().lean(),
      CurriculumUnit.find().lean(),
      Lesson.find().lean(),
      Topic.find().lean(),
      Vocabulary.find().lean(),
      LanguageContent.find().lean(),
      Activity.find().lean(),
      ClassroomSession.find().lean(),
      Attendance.find().lean(),
      SystemSetting.find().lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(1000).lean()
    ]);

    const backupPayload = {
      system: 'KCEnglishKids',
      exportType: 'FULL_SYSTEM_BACKUP',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: req.user ? { name: req.user.name, email: req.user.email, role: req.user.role } : 'ADMIN',
      summary: {
        totalUsers: users.length,
        totalClassrooms: classrooms.length,
        totalSchedules: schedules.length,
        totalCurriculumBooks: curriculumBooks.length,
        totalCurriculumUnits: curriculumUnits.length,
        totalLessons: lessons.length,
        totalTopics: topics.length,
        totalVocabularies: vocabularies.length,
        totalSentencePatterns: languageContents.length,
        totalActivities: activities.length,
        totalSessions: classroomSessions.length,
        totalAttendances: attendances.length
      },
      collections: {
        users,
        classrooms,
        schedules,
        curriculumBooks,
        curriculumUnits,
        lessons,
        topics,
        vocabularies,
        languageContents,
        activities,
        classroomSessions,
        attendances,
        systemSettings,
        auditLogs
      }
    };

    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'EXPORT_SYSTEM_BACKUP',
        targetType: 'System',
        details: { totalCollections: Object.keys(backupPayload.collections).length, summary: backupPayload.summary }
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="KCEnglishKids_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json"`
    );
    res.status(200).json(backupPayload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
  // Activities & Games
  getAdminActivities,
  getAdminActivityById,
  createAdminActivity,
  updateAdminActivity,
  deleteAdminActivity,
  toggleActivityStatus
};
