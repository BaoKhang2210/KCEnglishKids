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
  SystemSetting
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
      .populate('students', 'name username avatar avatarUrl ageGroupCode dob')
      .populate('ageGroup', 'name code')
      .sort({ academicYear: -1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: classrooms.length,
      data: classrooms
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new Classroom with assigned teacher and age group
// @route   POST /api/admin/classrooms
// @access  Private / Admin
const createClassroom = async (req, res, next) => {
  try {
    const { name, ageGroupCode, teacherId, academicYear, description } = req.body;
    if (!name || !ageGroupCode || !teacherId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp tên lớp, độ tuổi (3-4, 4-5, 5-6) và giáo viên phụ trách.'
      });
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'TEACHER' });
    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: 'Giáo viên phụ trách không hợp lệ.'
      });
    }

    const ageGroupDoc = await AgeGroup.findOne({ code: ageGroupCode });

    const classroom = await ClassRoom.create({
      name: name.trim(),
      ageGroupCode,
      ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
      teacher: teacher._id,
      academicYear: academicYear || '2026-2027',
      description: description || '',
      status: 'ACTIVE',
      students: []
    });

    await classroom.populate('teacher', 'name email username avatar avatarUrl');

    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'CREATE_CLASSROOM',
        targetType: 'ClassRoom',
        targetId: classroom._id,
        details: { name: classroom.name, teacher: teacher.name, ageGroupCode }
      });
    }

    res.status(201).json({
      success: true,
      message: `Tạo lớp học ${classroom.name} và phân công cho giáo viên ${teacher.name} thành công!`,
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
    const { name, ageGroupCode, teacherId, academicYear, description, status } = req.body;

    const classroom = await ClassRoom.findById(id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    if (name) classroom.name = name.trim();
    if (ageGroupCode) {
      classroom.ageGroupCode = ageGroupCode;
      const ag = await AgeGroup.findOne({ code: ageGroupCode });
      if (ag) classroom.ageGroup = ag._id;
    }
    if (teacherId) {
      const teacher = await User.findOne({ _id: teacherId, role: 'TEACHER' });
      if (teacher) classroom.teacher = teacher._id;
    }
    if (academicYear) classroom.academicYear = academicYear;
    if (description !== undefined) classroom.description = description;
    if (status) classroom.status = status;

    await classroom.save();
    await classroom.populate('teacher', 'name email username avatar avatarUrl');

    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'UPDATE_CLASSROOM',
        targetType: 'ClassRoom',
        targetId: classroom._id,
        details: { name: classroom.name }
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

// @desc    Deactivate classroom
// @route   DELETE /api/admin/classrooms/:id
// @access  Private / Admin
const deleteClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await ClassRoom.findById(id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Lớp học không tồn tại.' });
    }

    classroom.status = 'INACTIVE';
    await classroom.save();

    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action: 'DEACTIVATE_CLASSROOM',
        targetType: 'ClassRoom',
        targetId: classroom._id,
        details: { name: classroom.name }
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã dừng hoạt động lớp ${classroom.name}.`
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
    const [books, units, lessons, activities, vocabularies, topics] = await Promise.all([
      CurriculumBook.find().sort({ bookNumber: 1 }).lean(),
      CurriculumUnit.find().sort({ bookNumber: 1, unitNumber: 1 }).lean(),
      Lesson.find().populate('topic', 'title englishName').sort({ displayOrder: 1 }).lean(),
      Activity.find().select('lesson activityType title status maxScore').lean(),
      Vocabulary.find().select('lesson word vietnamese meaning audioUrl imageUrl').lean(),
      Topic.find().lean()
    ]);

    const deepTree = books.map(book => {
      const bookUnits = units.filter(u => u.bookNumber === book.bookNumber);
      const unitsWithLessons = bookUnits.map(unit => {
        const unitLessons = lessons.filter(l => 
          (l.curriculumUnits && l.curriculumUnits.some(cu => cu.toString() === unit._id.toString())) ||
          (l.ageGroupCode === unit.ageGroupCode)
        );

        const lessonsWithMeta = unitLessons.map(lesson => {
          const lessonActs = activities.filter(a => a.lesson && a.lesson.toString() === lesson._id.toString());
          const lessonVocab = vocabularies.filter(v => v.lesson && v.lesson.toString() === lesson._id.toString());
          return {
            ...lesson,
            activityCount: lessonActs.length,
            vocabularyCount: lessonVocab.length,
            activities: lessonActs.slice(0, 5),
            vocabulary: lessonVocab.slice(0, 6)
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
      recentUsers
    ] = await Promise.all([
      User.countDocuments({ role: 'CHILD', status: 'ACTIVE' }),
      ClassRoom.find().populate('teacher', 'name email').populate('students', 'name avatar ageGroupCode').lean(),
      ActivityResult.find().select('score stars child createdAt').lean(),
      ClassroomSession.find().select('sessionNumber classroom studentScores starsAwarded createdAt').lean(),
      User.find({ role: 'CHILD' }).select('name avatar ageGroupCode assignedClass streak createdAt').sort({ createdAt: -1 }).limit(10).lean()
    ]);

    // Compute star distribution
    let totalHomeStars = 0;
    const studentStarMap = {};
    for (const resItem of actResults) {
      const s = resItem.stars || 0;
      totalHomeStars += s;
      if (resItem.child) {
        const cid = resItem.child.toString();
        studentStarMap[cid] = (studentStarMap[cid] || 0) + s;
      }
    }

    let totalClassStars = 0;
    for (const session of clsSessions) {
      totalClassStars += session.starsAwarded || 0;
      if (session.studentScores) {
        const entries = session.studentScores instanceof Map
          ? Array.from(session.studentScores.entries())
          : Object.entries(session.studentScores);
        for (const [stId, scoreObj] of entries) {
          const stars = typeof scoreObj === 'object' ? (scoreObj?.stars || 0) : 0;
          studentStarMap[stId] = (studentStarMap[stId] || 0) + stars;
        }
      }
    }

    // Classroom performance summary
    const classroomStats = classrooms.map(c => {
      const sCount = Array.isArray(c.students) ? c.students.length : 0;
      const cSessions = clsSessions.filter(cs => cs.classroom && cs.classroom.toString() === c._id.toString());
      let classStars = 0;
      for (const st of (c.students || [])) {
        classStars += studentStarMap[st._id.toString()] || 0;
      }
      return {
        _id: c._id,
        name: c.name,
        ageGroupCode: c.ageGroupCode,
        teacherName: c.teacher?.name || 'Chưa phân công',
        studentCount: sCount,
        sessionCount: cSessions.length,
        totalStars: classStars,
        avgStarsPerStudent: sCount > 0 ? Math.round(classStars / sCount) : 0
      };
    });

    // Top 5 students
    const studentDocs = await User.find({ role: 'CHILD', status: 'ACTIVE' }).select('name avatar ageGroupCode assignedClass').populate('assignedClass', 'name').lean();
    const rankedStudents = studentDocs.map(st => ({
      _id: st._id,
      name: st.name,
      avatar: st.avatar || 'lion',
      ageGroupCode: st.ageGroupCode,
      className: st.assignedClass?.name || 'Chưa vào lớp',
      totalStars: studentStarMap[st._id.toString()] || 0
    })).sort((a, b) => b.totalStars - a.totalStars).slice(0, 5);

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

module.exports = {
  getDashboardStats,
  getCurriculum,
  getUsers,
  createTeacher,
  createChild,
  updateUser,
  resetChildPin,
  deleteUser,
  toggleUserStatus,
  getAuditLogs,
  toggleTopicStatus,
  getClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  assignStudentsToClassroom,
  getDeepCurriculum,
  toggleLessonStatus,
  getAdminAnalytics,
  getSystemSettings,
  updateSystemSettings
};
