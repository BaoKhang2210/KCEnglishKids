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
  AuditLog
} = require('../models');

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

    const users = await User.find(query)
      .select('-password -pin')
      .populate('assignedClass', 'name academicYear')
      .populate('ageGroup', 'name code')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
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
    const { name, username, email, password, avatar, contact } = req.body;

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

    // Log action
    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'CREATE_USER',
        targetType: 'User',
        targetId: teacher._id,
        details: { role: 'TEACHER', email: teacher.email, name: teacher.name }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản giáo viên thành công!',
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
    const logs = await AuditLog.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: logs.length,
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

module.exports = {
  getDashboardStats,
  getCurriculum,
  getUsers,
  createTeacher,
  createChild,
  toggleUserStatus,
  getAuditLogs,
  toggleTopicStatus
};
