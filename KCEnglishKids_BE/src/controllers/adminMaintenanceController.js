const mongoose = require('mongoose');
const models = require('../models');
const ClassRecognition = require('../models/ClassRecognition');
const { User, ClassRoom, AgeGroup, VocabularyMastery, ActivityResult, ClassroomSession, Progress } = models;
const I = require('../services/adminIntegrity');
const { computeRewards } = require('../services/rewardService');
const handler = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

exports.createChild = handler(async (req, res) => {
  const body = req.body;
  if (!String(body.name || '').trim()) throw I.fail('Vui lòng nhập tên học sinh.');
  const room = body.assignedClass ? await I.classroom(body.assignedClass) : null;
  const dob = I.parseDob(body.dob);
  const years = dob ? Math.floor((Date.now() - +dob) / 31557600000) : 3;
  const code = room?.ageGroupCode || body.ageGroupCode || (years <= 3 ? '3-4' : years === 4 ? '4-5' : '5-6');
  const age = await AgeGroup.findOne({ code });
  if (!age) throw I.fail('Nhóm tuổi không hợp lệ.');
  const rawPin = I.pin(body.pin);
  const login = await I.username(body.name, body.username);
  const child = new User({ name: body.name.trim(), role: 'CHILD', username: login, pin: rawPin,
    password: body.password || rawPin, dob, ageGroup: age._id, ageGroupCode: code, assignedClass: room?._id,
    avatar: body.avatar || 'lion', contact: String(body.contact || '').trim(), parentContact: String(body.contact || '').trim(),
    ...(body.email ? { email: body.email.trim().toLowerCase() } : {}), status: 'ACTIVE' });
  await I.atomic(async () => {
    await child.save();
    try { if (room) await ClassRoom.updateOne({ _id: room._id }, { $addToSet: { students: child._id } }); }
    catch (error) { await User.deleteOne({ _id: child._id }); throw error; }
  });
  await I.audit(req, 'CREATE_USER', 'User', child._id, { name: child.name, role: child.role });
  res.status(201).json({ success: true, message: 'Đã tạo tài khoản học sinh.', data: I.publicUser(child), credentials: [{ name: child.name, username: login, pin: rawPin }] });
});

exports.createTeacher = handler(async (req, res) => {
  const { name, username, email, password, assignedClass, contact } = req.body;
  if (!name?.trim() || !username?.trim() || !email?.trim() || String(password || '').length < 8) throw I.fail('Nhập đầy đủ họ tên, mã đăng nhập, email và mật khẩu ít nhất 8 ký tự.');
  if (await User.exists({ $or: [{ username: username.trim().toLowerCase() }, { email: email.trim().toLowerCase() }] })) throw I.fail('Email hoặc mã đăng nhập đã được sử dụng.');
  const room = assignedClass ? await I.classroom(assignedClass) : null;
  const teacher = new User({ role: 'TEACHER', name: name.trim(), username: username.trim().toLowerCase(), email: email.trim().toLowerCase(), password, contact, status: 'ACTIVE', avatar: 'fox' });
  await I.atomic(async () => {
    await teacher.save();
    try { if (room) await I.syncTeacher(room, teacher._id); }
    catch (error) { await User.deleteOne({ _id: teacher._id }); throw error; }
  });
  await I.audit(req, 'CREATE_USER', 'User', teacher._id, { name: teacher.name, role: teacher.role });
  res.status(201).json({ success: true, message: 'Đã tạo tài khoản giáo viên.', data: I.publicUser(teacher) });
});

exports.updateUser = handler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw I.fail('Không tìm thấy tài khoản.', 404);
  const body = req.body;
  if (user.role === 'ADMIN' && has(body, 'status') && body.status !== 'ACTIVE') throw I.fail('Không thể vô hiệu hóa tài khoản quản trị viên.');
  // Validate all relationships and unique fields before mutating either side.
  const room = has(body, 'assignedClass') && body.assignedClass ? await I.classroom(body.assignedClass) : null;
  if (room && user.role === 'TEACHER') await I.availableTeacher(String(user._id), room._id);
  for (const field of ['email', 'username']) {
    if (has(body, field) && body[field]) {
      const value = String(body[field]).trim().toLowerCase();
      if (await User.exists({ [field]: value, _id: { $ne: user._id } })) throw I.fail(`${field === 'email' ? 'Email' : 'Mã đăng nhập'} đã được sử dụng.`);
      user[field] = value;
    }
  }
  if (has(body, 'name')) { if (!String(body.name).trim()) throw I.fail('Họ tên không được để trống.'); user.name = body.name.trim(); }
  if (has(body, 'contact')) user.contact = String(body.contact || '').trim();
  if (has(body, 'dob')) user.dob = I.parseDob(body.dob);
  if (has(body, 'status')) {
    if (!['ACTIVE', 'INACTIVE', 'LOCKED'].includes(body.status)) throw I.fail('Trạng thái không hợp lệ.');
    if (user.role === 'TEACHER' && body.status !== 'ACTIVE' && await ClassRoom.exists({ teacher: user._id, status: { $ne: 'INACTIVE' } })) throw I.fail('Hãy phân công giáo viên thay thế trước khi ngừng tài khoản này.');
    user.status = body.status;
  }
  if (user.role === 'TEACHER' && has(body, 'assignedClass') && !room && await ClassRoom.exists({ teacher: user._id, status: { $ne: 'INACTIVE' } })) throw I.fail('Hãy chọn giáo viên thay thế tại trang Lớp học trước khi gỡ phân công.');
  await user.validate();
  await I.atomic(async () => {
    if (user.role === 'CHILD' && has(body, 'assignedClass')) {
      if (room) {
        await I.moveStudents(room, [String(user._id)]);
        user.assignedClass = room._id; user.ageGroupCode = room.ageGroupCode; user.ageGroup = room.ageGroup;
      } else {
        await ClassRoom.updateMany({ students: user._id }, { $pull: { students: user._id } });
        user.assignedClass = undefined;
      }
    }
    if (user.role === 'CHILD' && body.ageGroupCode && !user.assignedClass) {
      const age = await AgeGroup.findOne({ code: body.ageGroupCode });
      if (!age) throw I.fail('Nhóm tuổi không hợp lệ.');
      user.ageGroupCode = body.ageGroupCode; user.ageGroup = age._id;
    }
    if (user.role === 'TEACHER' && room) { await I.syncTeacher(room, user._id); user.assignedClass = room._id; }
    await user.save();
  });
  await I.audit(req, 'UPDATE_USER', 'User', user._id, { name: user.name, role: user.role });
  const updated = await User.findById(user._id).select('-password -pin').populate('assignedClass', 'name academicYear ageGroupCode').populate('ageGroup', 'name code');
  res.json({ success: true, message: 'Đã cập nhật tài khoản.', data: updated });
});

exports.assignTeacherToClassroom = handler(async (req, res) => {
  const room = await I.classroom(req.params.id);
  await I.atomic(() => I.syncTeacher(room, req.body.teacherId));
  await I.audit(req, 'ASSIGN_TEACHER_TO_CLASS', 'ClassRoom', room._id, { className: room.name });
  res.json({ success: true, message: 'Đã cập nhật giáo viên phụ trách và lịch dạy.', data: room });
});
exports.assignStudentsToClassroom = handler(async (req, res) => {
  const room = await I.classroom(req.params.id);
  await I.atomic(() => I.moveStudents(room, req.body.studentIds, true));
  await I.audit(req, 'BULK_ASSIGN_STUDENTS', 'ClassRoom', room._id, { className: room.name, count: req.body.studentIds.length });
  res.json({ success: true, message: 'Đã cập nhật danh sách học sinh.', data: await ClassRoom.findById(room._id).populate('students', '-password -pin') });
});
exports.removeStudentFromClassroom = handler(async (req, res) => {
  const room = await I.classroom(req.params.id);
  await I.atomic(async () => {
    await ClassRoom.updateOne({ _id: room._id }, { $pull: { students: req.params.studentId } });
    await User.updateOne({ _id: req.params.studentId, role: 'CHILD', assignedClass: room._id }, { $unset: { assignedClass: 1 } });
  });
  await I.audit(req, 'REMOVE_STUDENT_FROM_CLASS', 'ClassRoom', room._id, { className: room.name, studentId: req.params.studentId });
  res.json({ success: true, message: 'Đã gỡ học sinh khỏi lớp.' });
});
exports.bulkImportChildren = handler(async (req, res) => {
  const room = req.body.classroomId ? await I.classroom(req.body.classroomId) : null;
  const data = await I.atomic(() => I.importStudents(req.body.students, room, req.body.defaultAgeGroupCode));
  await I.audit(req, 'BULK_IMPORT_STUDENTS', room ? 'ClassRoom' : 'User', room?._id, { className: room?.name, importedCount: data.createdUsers.length, skippedCount: data.skippedCount });
  res.json({ success: true, message: `Đã tạo ${data.createdUsers.length} học sinh; bỏ qua ${data.skippedCount} dòng đã nhập.`, data: { ...data, users: data.createdUsers, count: data.createdUsers.length }, credentials: data.credentials });
});
exports.importStudentsFromExcel = handler(async (req, res) => {
  const room = await I.classroom(req.params.id);
  const data = await I.atomic(() => I.importStudents(req.body.students, room));
  await I.audit(req, 'IMPORT_STUDENTS_EXCEL', 'ClassRoom', room._id, { className: room.name, importedCount: data.createdUsers.length });
  res.json({ success: true, message: `Đã nhập ${data.createdUsers.length} học sinh; bỏ qua ${data.skippedCount} dòng đã nhập.`, data: { importedCount: data.createdUsers.length, skippedCount: data.skippedCount, errors: [], students: data.createdUsers }, credentials: data.credentials });
});
exports.deleteClassroom = handler(async (req, res) => {
  const room = await ClassRoom.findById(req.params.id);
  if (!room) throw I.fail('Lớp học không tồn tại.', 404);
  // Persist the work list before cleanup, so retry can finish after a standalone Mongo outage.
  if (!room.deletionPending) {
    const children = await User.find({ role: 'CHILD', assignedClass: room._id }).select('_id');
    room.deletionStudentIds = children.map(child => child._id);
    room.deletionPending = true; room.status = 'INACTIVE'; await room.save();
  }
  const ids = room.deletionStudentIds || [];
  await I.atomic(async () => {
    for (const name of ['LearningSession', 'ActivityResult', 'Progress', 'UnitCompletion']) await models[name].deleteMany({ child: { $in: ids } });
    for (const name of ['TeacherNote', 'VocabularyMastery']) await models[name].deleteMany({ student: { $in: ids } });
    await models.Assignment.deleteMany({ $or: [{ classRoom: room._id }, { student: { $in: ids } }] });
    await models.ParentNotification.deleteMany({ child: { $in: ids } });
    await ClassRecognition.deleteMany({ classroom: room._id });
    await ClassRecognition.updateMany({ 'winners.child': { $in: ids } }, { $pull: { winners: { child: { $in: ids } }, ranking: { child: { $in: ids.map(String) } } } });
    for (const name of ['Attendance', 'ClassroomSession', 'Schedule']) await models[name].deleteMany({ classroom: room._id });
    await models.Attendance.updateMany({ 'records.student': { $in: ids } }, { $pull: { records: { student: { $in: ids } } } });
    await ClassroomSession.updateMany({ 'studentScores.student': { $in: ids } }, { $pull: { studentScores: { student: { $in: ids } }, 'questionResults.$[].studentAnswers': { student: { $in: ids } }, 'summary.topPerformers': { $in: ids }, 'summary.studentsNeedingPractice': { $in: ids } } });
    await ClassRoom.updateMany({ _id: { $ne: room._id } }, { $pull: { students: { $in: ids } } });
    await User.updateMany({ assignedClass: room._id, role: 'TEACHER' }, { $unset: { assignedClass: 1 } });
    await User.deleteMany({ _id: { $in: ids }, role: 'CHILD' });
    await ClassRoom.deleteOne({ _id: room._id });
  });
  await I.audit(req, 'DELETE_CLASSROOM', 'ClassRoom', room._id, { name: room.name, deletedStudentsCount: ids.length });
  res.json({ success: true, message: `Đã xóa lớp ${room.name}, ${ids.length} hồ sơ học sinh và dữ liệu liên quan.` });
});

exports.getAdminAnalytics = handler(async (req, res) => {
  const students = await User.find({ role: 'CHILD', status: 'ACTIVE' }).select('name avatar ageGroupCode assignedClass createdAt').populate('assignedClass', 'name').lean();
  // Use exactly the same reward calculation as the child portal, including best Lesson ratings.
  const ranked = [];
  for (let offset = 0; offset < students.length; offset += 20) {
    ranked.push(...await Promise.all(students.slice(offset, offset + 20).map(async student => {
      const reward = await computeRewards(student._id);
      return { ...student, className: student.assignedClass?.name || 'Chưa vào lớp', homeStars: reward.earnedStars + reward.bonusStars + (reward.teacherStars || 0), classStars: reward.classroomStars, totalStars: reward.totalStars };
    })));
  }
  const rooms = await ClassRoom.find({ deletionPending: { $ne: true } }).populate('teacher', 'name').lean();
  const sessions = await ClassroomSession.find({ status: 'COMPLETED' }).select('classroom studentScores').lean();
  const classroomStats = rooms.map(room => {
    const members = ranked.filter(student => String(student.assignedClass?._id) === String(room._id));
    const homeStars = members.reduce((sum, student) => sum + student.homeStars, 0);
    const classStars = members.reduce((sum, student) => sum + student.classStars, 0);
    const ownSessions = sessions.filter(session => String(session.classroom) === String(room._id));
    return { _id: room._id, name: room.name, ageGroupCode: room.ageGroupCode, teacherName: room.teacher?.name || 'Chưa phân công', studentCount: members.length, sessionCount: ownSessions.length,
      homeStars, classStars, totalStars: homeStars + classStars, classSessionStars: ownSessions.reduce((sum, session) => sum + session.studentScores.reduce((total, score) => total + (['ABSENT', 'EXCUSED'].includes(score.attendance) ? 0 : score.stars || 0), 0), 0), avgStarsPerStudent: members.length ? Math.round((homeStars + classStars) / members.length) : 0 };
  });
  const home = ranked.reduce((sum, student) => sum + student.homeStars, 0);
  const cls = ranked.reduce((sum, student) => sum + student.classStars, 0);
  res.json({ success: true, data: { totalStudents: students.length, totalClassrooms: rooms.length, totalSessionsConducted: sessions.length,
    totalHomeStars: home, totalClassStars: cls, totalAllStars: home + cls, classroomStats,
    topStudents: ranked.sort((a, b) => b.totalStars - a.totalStars).slice(0, 5), recentStudents: students.sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 10) } });
});

exports.getStudentCompetency = handler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'CHILD' }).select('-password -pin');
  if (!student) throw I.fail('Không tìm thấy học sinh.', 404);
  const [reward, results, mastery, progress] = await Promise.all([
    computeRewards(student._id), ActivityResult.find({ child: student._id }).populate('activity', 'activityType').lean(),
    VocabularyMastery.find({ student: student._id }).populate('vocabulary', 'english vietnamese').lean(), Progress.countDocuments({ child: student._id, completed: true })
  ]);
  const listening = results.filter(result => ['LISTEN_CHOOSE', 'ANIMAL_SOUND', 'COLOR_RECOGNITION', 'TAP_PICTURE'].includes(result.activity?.activityType));
  const answered = listening.reduce((sum, result) => sum + (result.correctCount || 0) + (result.incorrectCount || 0), 0);
  const correct = listening.reduce((sum, result) => sum + (result.correctCount || 0), 0);
  const words = mastery.filter(record => record.vocabulary);
  const mastered = words.filter(record => record.masteryLevel === 3);
  const review = words.filter(record => record.wrongCount > 0 && record.masteryLevel < 3);
  res.json({ success: true, data: { stats: { totalStars: reward.totalStars, completedLessons: progress, learningTime: results.reduce((sum, result) => sum + (result.duration || 0), 0) }, competencyReport: {
    explorerLevel: reward.explorerLevel,
    vocabularyCompetency: { totalEncountered: words.length, masteredCount: mastered.length, practicingCount: words.filter(record => record.masteryLevel === 2).length, learningCount: words.filter(record => record.masteryLevel <= 1).length,
      masteredWords: mastered.slice(0, 8).map(record => record.vocabulary), needsReviewWords: review.slice(0, 8).map(record => ({ ...record.vocabulary, wrongCount: record.wrongCount })) },
    listeningCompetency: { accuracyRate: answered ? Math.round(correct / answered * 100) : 0, totalResponses: answered, correctResponses: correct, reactionSpeed: 'Chưa đánh giá tốc độ phản xạ', status: answered ? 'RECORDED' : 'NO_DATA' },
    // Transcript matching is not an acoustic pronunciation assessment.
    pronunciationCompetency: { averageScore: null, confidence: 'Chưa có dữ liệu đánh giá phát âm', starsEarned: 0 },
    recommendedAction: !answered && !words.length ? 'Chưa có dữ liệu học tập. Hãy cho bé hoàn thành một hoạt động trước khi nhận xét.' : review.length ? `Cùng bé ôn lại: ${review.slice(0, 5).map(record => record.vocabulary.english).join(', ')}.` : 'Tiếp tục theo dõi các hoạt động học để nhận xét phù hợp.'
  } } });
});

exports.resetStaffPassword = handler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || !['ADMIN', 'TEACHER'].includes(user.role)) throw I.fail('Không tìm thấy tài khoản nhân sự.', 404);
  if (String(req.body.password || '').length < 8) throw I.fail('Mật khẩu mới phải có ít nhất 8 ký tự.');
  if (user.role === 'ADMIN' && String(user._id) !== String(req.user._id)) throw I.fail('Chỉ được đổi mật khẩu của chính tài khoản quản trị đang đăng nhập.', 403);
  if (user.role === 'ADMIN' && !await user.matchPassword(req.body.currentPassword || '')) throw I.fail('Mật khẩu hiện tại không đúng.');
  user.password = req.body.password;
  user.authVersion = (user.authVersion || 0) + 1;
  await user.save();
  await I.audit(req, 'RESET_PASSWORD', 'User', user._id, { name: user.name });
  res.json({ success: true, message: 'Đã đổi mật khẩu. Các phiên đăng nhập cũ đã được thu hồi.' });
});

exports.exportSystemBackup = handler(async (req, res) => {
  const collections = {};
  // Extended JSON preserves ObjectId, Date, Decimal128 and binary values for lossless restoration.
  for (const model of Object.values({ ...models, ClassRecognition })) {
    collections[model.collection.name] = await model.collection.find({}).toArray();
  }
  const payload = { system: 'KCEnglishKids', exportType: 'FULL_SYSTEM_BACKUP', version: '3.0.0', format: 'mongodb-extended-json', exportedAt: new Date(), collections };
  await I.audit(req, 'EXPORT_SYSTEM_BACKUP', 'System', undefined, { totalCollections: Object.keys(collections).length });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', `attachment; filename="KCEnglishKids_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json"`);
  // Access the BSON library through the installed MongoDB driver, without adding a dependency.
  const { EJSON } = mongoose.mongo.BSON;
  res.type('application/json').send(EJSON.stringify(payload, null, 2, { relaxed: false }));
});
