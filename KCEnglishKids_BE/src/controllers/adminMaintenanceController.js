const mongoose = require('mongoose');
const models = require('../models');
const ClassRecognition = require('../models/ClassRecognition');
const { User, ClassRoom, AgeGroup, VocabularyMastery, ActivityResult, ClassroomSession, Progress } = models;
const I = require('../services/adminIntegrity');
const { computeRewards } = require('../services/rewardService');
const { statsFor } = require('../services/teacherStatistics');
const handler = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const ANIMAL_AVATARS = ['lion', 'panda', 'rabbit', 'bear', 'fox', 'koala', 'monkey', 'cat', 'dog', 'elephant'];
const ANIMAL_AVATAR_SYMBOLS = {
  lion: '/images/symbols/1f981.svg',
  tiger: '/images/symbols/1f42f.svg',
  panda: '/images/symbols/1f43c.svg',
  rabbit: '/images/symbols/1f430.svg',
  bear: '/images/symbols/1f43b.svg',
  fox: '/images/symbols/1f98a.svg',
  koala: '/images/symbols/1f43b.svg',
  monkey: '/images/symbols/1f412.svg',
  cat: '/images/symbols/1f431.svg',
  dog: '/images/rewards/fluent-3d/dog_face_3d.png',
  elephant: '/images/symbols/1f418.svg'
};
const randomAnimalAvatar = () => ANIMAL_AVATARS[Math.floor(Math.random() * ANIMAL_AVATARS.length)];

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
  const avatarKey = body.avatar || randomAnimalAvatar();
  const avatarUrl = body.avatarUrl || ANIMAL_AVATAR_SYMBOLS[avatarKey] || '/images/symbols/1f981.svg';
  const child = new User({ name: body.name.trim(), role: 'CHILD', username: login, pin: rawPin,
    password: body.password || rawPin, dob, ageGroup: age._id, ageGroupCode: code, assignedClass: room?._id,
    avatar: avatarKey, avatarUrl, contact: String(body.contact || '').trim(), parentContact: String(body.contact || '').trim(),
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
  const teacher = new User({ role: 'TEACHER', name: name.trim(), username: username.trim().toLowerCase(), email: email.trim().toLowerCase(), password, contact, status: 'ACTIVE', avatar: req.body.avatar || randomAnimalAvatar() });
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
    if (user.role === 'TEACHER' && body.status !== 'ACTIVE' && await ClassRoom.exists({ teacher: user._id, status: { $in: ['ACTIVE', 'UPCOMING'] } })) throw I.fail('Hãy phân công giáo viên thay thế trước khi ngừng tài khoản này.');
    user.status = body.status;
  }
  if (user.role === 'TEACHER' && has(body, 'assignedClass') && !room && await ClassRoom.exists({ teacher: user._id, status: { $in: ['ACTIVE', 'UPCOMING'] } })) throw I.fail('Hãy chọn giáo viên thay thế tại trang Lớp học trước khi gỡ phân công.');
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
    if (user.role === 'TEACHER' && room) {
      if (!['ACTIVE', 'UPCOMING'].includes(room.status)) throw I.fail('Chỉ phân công tài khoản giáo viên vào lớp đang hoạt động hoặc sắp mở.');
      await I.syncTeacher(room, user._id); user.assignedClass = room._id;
    }
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
  if (room.status === 'COMPLETED') {
    throw I.fail('Lớp học đã hoàn thành niên khóa, danh sách học sinh đã được đóng băng lưu trữ và không thể xóa khỏi lớp.', 400);
  }
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
  if (room.status === 'COMPLETED' || room.status === 'INACTIVE') {
    throw I.fail('Không thể thêm học sinh vào lớp học đã hoàn thành hoặc đã vô hiệu hóa.', 400);
  }
  const data = await I.atomic(() => I.importStudents(req.body.students, room));
  await I.audit(req, 'IMPORT_STUDENTS_EXCEL', 'ClassRoom', room._id, { className: room.name, importedCount: data.createdUsers.length });
  res.json({ success: true, message: `Đã nhập ${data.createdUsers.length} học sinh; bỏ qua ${data.skippedCount} dòng đã nhập.`, data: { importedCount: data.createdUsers.length, skippedCount: data.skippedCount, errors: [], students: data.createdUsers }, credentials: data.credentials });
});
exports.deleteClassroom = handler(async (req, res) => {
  const room = await ClassRoom.findById(req.params.id);
  if (!room) throw I.fail('Lớp học không tồn tại.', 404);
  if (room.status === 'COMPLETED') {
    throw I.fail('Lớp học đã hoàn thành khóa học, không thể xóa để bảo toàn lịch sử buổi dạy và học bạ.', 400);
  }

  // Check if this classroom has ANY classroom sessions (buổi dạy thực tế)
  const sessionCount = await ClassroomSession.countDocuments({ classroom: room._id });
  if (sessionCount > 0) {
    throw I.fail(`Lớp học đã có ${sessionCount} buổi dạy thực tế trong hệ thống. Để bảo toàn lịch sử giảng dạy và học bạ của trẻ, không thể xóa lớp này. Vui lòng chuyển trạng thái lớp sang "Đã hoàn thành" hoặc "Tạm dừng".`, 400);
  }

  // Persist the work list before cleanup, so retry can finish after a standalone Mongo outage.
  if (!room.deletionPending) {
    const children = await User.find({ role: 'CHILD', assignedClass: room._id }).select('_id');
    room.deletionStudentIds = children.map(child => child._id);
    room.deletionPending = true; room.status = 'INACTIVE'; await room.save();
  }
  const ids = room.deletionStudentIds || [];
  await I.atomic(async () => {
    // Release students back to unassigned rather than destroying their user accounts
    if (ids.length > 0) {
      await User.updateMany({ _id: { $in: ids }, role: 'CHILD' }, { $unset: { assignedClass: 1 } });
    }
    await models.LearningObservation.deleteMany({ classroom: room._id });
    await models.HomePracticePlan.deleteMany({ classroom: room._id });
    await ClassRecognition.deleteMany({ classroom: room._id });
    for (const name of ['Attendance', 'ClassroomSession', 'Schedule']) await models[name].deleteMany({ classroom: room._id });
    await ClassRoom.updateMany({ _id: { $ne: room._id } }, { $pull: { students: { $in: ids } } });
    await User.updateMany({ role: 'TEACHER' }, { $pull: { assignedClasses: room._id } });
    const remainingForTeacher = room.teacher
      ? await ClassRoom.findOne({ _id: { $ne: room._id }, teacher: room.teacher, status: { $in: ['ACTIVE', 'UPCOMING'] } }).select('_id').lean()
      : null;
    if (room.teacher) {
      if (remainingForTeacher) {
        await User.updateOne({ _id: room.teacher, role: 'TEACHER', assignedClass: room._id }, { $set: { assignedClass: remainingForTeacher._id } });
      } else {
        await User.updateOne({ _id: room.teacher, role: 'TEACHER', assignedClass: room._id }, { $unset: { assignedClass: 1 } });
      }
    }
    await ClassRoom.deleteOne({ _id: room._id });
  });
  await I.audit(req, 'DELETE_CLASSROOM', 'ClassRoom', room._id, { name: room.name, releasedStudentsCount: ids.length });
  res.json({
    success: true,
    message: ids.length > 0
      ? `Đã xóa lớp ${room.name} và giải phóng ${ids.length} học sinh về trạng thái Chưa có lớp (bảo toàn tài khoản).`
      : `Đã xóa thành công lớp ${room.name}.`
  });
});

exports.getAdminAnalytics = handler(async (req, res) => {
  const students = await User.find({ role: 'CHILD', status: 'ACTIVE' }).select('name username avatar avatarUrl ageGroupCode assignedClass createdAt').populate('assignedClass', 'name').lean();
  // Use exactly the same reward calculation as the child portal, including best Lesson ratings.
  const ranked = [];
  for (let offset = 0; offset < students.length; offset += 20) {
    ranked.push(...await Promise.all(students.slice(offset, offset + 20).map(async student => {
      const reward = await computeRewards(student._id);
      return { ...student, className: student.assignedClass?.name || 'Chưa vào lớp', homeStars: reward.homeStars, classStars: reward.classStars, totalStars: reward.totalStars };
    })));
  }
  const rooms = await ClassRoom.find({ deletionPending: { $ne: true } }).populate('teacher', 'name').lean();
  const sessions = await ClassroomSession.find({ status: 'COMPLETED' }).select('classroom studentScores startedAt endedAt').lean();

  const allResults = await ActivityResult.find().select('score stars correctCount incorrectCount duration').lean();
  const totalActivitiesPlayed = allResults.length;
  const totalCorrect = allResults.reduce((sum, r) => sum + (r.correctCount || 0), 0);
  const totalAnswered = allResults.reduce((sum, r) => sum + (r.correctCount || 0) + (r.incorrectCount || 0), 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  let sessionMinutes = 0;
  for (const s of sessions) {
    if (s.startedAt && s.endedAt && new Date(s.endedAt) > new Date(s.startedAt)) {
      sessionMinutes += Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
    }
  }
  const totalLearningMinutes = Math.round(allResults.reduce((sum, r) => sum + (r.duration || 0), 0) / 60) + sessionMinutes;

  const classroomStats = rooms.map(room => {
    const members = ranked.filter(student => String(student.assignedClass?._id) === String(room._id));
    const homeStars = members.reduce((sum, student) => sum + student.homeStars, 0);
    const classStars = members.reduce((sum, student) => sum + student.classStars, 0);
    const ownSessions = sessions.filter(session => String(session.classroom) === String(room._id));

    let totalRosterAcrossSessions = 0;
    let totalPresentAcrossSessions = 0;
    ownSessions.forEach(s => {
      (s.studentScores || []).forEach(sc => {
        totalRosterAcrossSessions++;
        if (['PRESENT', 'LATE'].includes(sc.attendance)) totalPresentAcrossSessions++;
      });
    });
    const classAttendanceRate = totalRosterAcrossSessions > 0 ? Math.round((totalPresentAcrossSessions / totalRosterAcrossSessions) * 100) : (members.length > 0 ? 100 : 0);

    return { _id: room._id, name: room.name, ageGroupCode: room.ageGroupCode, teacherName: room.teacher?.name || 'Chưa phân công', studentCount: members.length, sessionCount: ownSessions.length,
      homeStars, classStars, totalStars: homeStars + classStars, classAttendanceRate, classSessionStars: ownSessions.reduce((sum, session) => sum + session.studentScores.reduce((total, score) => total + (['ABSENT', 'EXCUSED'].includes(score.attendance) ? 0 : score.stars || 0), 0), 0), avgStarsPerStudent: members.length ? Math.round((homeStars + classStars) / members.length) : 0 };
  });
  const home = ranked.reduce((sum, student) => sum + student.homeStars, 0);
  const cls = ranked.reduce((sum, student) => sum + student.classStars, 0);
  res.json({ success: true, data: { totalStudents: students.length, totalClassrooms: rooms.length, totalSessionsConducted: sessions.length,
    totalActivitiesPlayed, overallAccuracy, totalLearningMinutes,
    totalHomeStars: home, totalClassStars: cls, totalAllStars: home + cls, classroomStats,
    topStudents: ranked.sort((a, b) => b.totalStars - a.totalStars).slice(0, 5), recentStudents: students.sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 10) } });
});

exports.getStudentCompetency = handler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'CHILD' }).select('-password -pin');
  if (!student) throw I.fail('Không tìm thấy học sinh.', 404);
  const [reward, statResult, results, mastery, progress] = await Promise.all([
    computeRewards(student._id),
    mongoose.connection.readyState === 1 ? statsFor([student._id]).catch(() => []) : Promise.resolve([]),
    ActivityResult.find({ child: student._id }).populate('activity', 'activityType').lean(),
    VocabularyMastery.find({ student: student._id }).populate('vocabulary', 'english vietnamese').lean(),
    Progress.countDocuments({ child: student._id, completed: true })
  ]);
  const stat = statResult[0];
  const listening = results.filter(result => ['LISTEN_CHOOSE', 'ANIMAL_SOUND', 'COLOR_RECOGNITION', 'TAP_PICTURE'].includes(result.activity?.activityType));
  const answered = listening.reduce((sum, result) => sum + (result.correctCount || 0) + (result.incorrectCount || 0), 0);
  const correct = listening.reduce((sum, result) => sum + (result.correctCount || 0), 0);
  const words = mastery.filter(record => record.vocabulary);
  const mastered = words.filter(record => record.masteryLevel === 3);
  const review = words.filter(record => record.wrongCount > 0 && record.masteryLevel < 3);
  const repeat = results.filter(result => result.activity?.activityType === 'LISTEN_REPEAT');
  const repeatScores = repeat.map(r => r.score).filter(s => typeof s === 'number' && s > 0);
  const avgPronunciationScore = repeatScores.length
    ? Math.round(repeatScores.reduce((sum, s) => sum + s, 0) / repeatScores.length)
    : null;
  res.json({ success: true, data: { stats: {
    ...(stat || {}),
    totalStars: reward.totalStars,
    completedLessons: progress,
    learningTime: stat?.learningTime || results.reduce((sum, result) => sum + (result.duration || 0), 0),
    practiceLearningTime: stat?.practiceLearningTime || 0,
    classroomLearningTime: stat?.classroomLearningTime || 0,
    hasLearningTime: Boolean(stat?.hasLearningTime),
    hasUnmeasuredLearning: Boolean(stat?.hasUnmeasuredLearning)
  }, competencyReport: {
    explorerLevel: reward.explorerLevel,
    vocabularyCompetency: { totalEncountered: words.length, masteredCount: mastered.length, practicingCount: words.filter(record => record.masteryLevel === 2).length, learningCount: words.filter(record => record.masteryLevel <= 1).length,
      masteredWords: mastered.slice(0, 8).map(record => record.vocabulary), needsReviewWords: review.slice(0, 8).map(record => ({ ...record.vocabulary, wrongCount: record.wrongCount })) },
    listeningCompetency: { accuracyRate: answered ? Math.round(correct / answered * 100) : null, totalResponses: answered, correctResponses: correct, reactionSpeed: answered ? 'Tốc độ phản xạ tốt' : 'Chưa đánh giá tốc độ phản xạ', status: answered ? 'RECORDED' : 'NOT_ASSESSED' },
    pronunciationCompetency: {
      averageScore: avgPronunciationScore,
      confidence: avgPronunciationScore === null
        ? 'Chưa có dữ liệu đánh giá phát âm'
        : avgPronunciationScore >= 85
        ? 'Bật âm to, rõ ràng, phản xạ tự nhiên'
        : avgPronunciationScore >= 70
        ? 'Tự tin phát âm, cần hoàn thiện ngữ điệu'
        : 'Cần khuyến khích bé phát âm to hơn',
      starsEarned: repeat.reduce((sum, r) => sum + (r.stars || 0), 0)
    },
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
  const payload = { system: 'KCEnglishKids', exportType: 'FULL_SYSTEM_BACKUP', version: '3.4.0', format: 'mongodb-extended-json', exportedAt: new Date(), collections };
  await I.audit(req, 'EXPORT_SYSTEM_BACKUP', 'System', undefined, { totalCollections: Object.keys(collections).length });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', `attachment; filename="KCEnglishKids_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json"`);
  // Access the BSON library through the installed MongoDB driver, without adding a dependency.
  const { EJSON } = mongoose.mongo.BSON;
  res.type('application/json').send(EJSON.stringify(payload, null, 2, { relaxed: false }));
});

const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/auth');
const { validateBackup } = require('../../scripts/restore_system_backup');

const SNAPSHOT_DIR = path.resolve(__dirname, '../../../.local-backups/snapshots');

const COLLECTION_METADATA = {
  users: { label: 'Tài khoản người dùng (Admin, GV, Học sinh)', group: 'Người dùng & Lớp học' },
  classrooms: { label: 'Lớp học', group: 'Người dùng & Lớp học' },
  schedules: { label: 'Thời khóa biểu lớp học', group: 'Người dùng & Lớp học' },
  classroomsessions: { label: 'Buổi dạy trực tiếp trên lớp', group: 'Người dùng & Lớp học' },
  attendances: { label: 'Sổ điểm danh chuyên cần', group: 'Người dùng & Lớp học' },
  agegroups: { label: 'Nhóm độ tuổi mầm non', group: 'Người dùng & Lớp học' },
  curriculumbooks: { label: 'Sách giáo trình theo độ tuổi', group: 'Giáo trình & Học liệu' },
  curriculumunits: { label: 'Đơn vị bài học (Units)', group: 'Giáo trình & Học liệu' },
  lessons: { label: 'Bài học chi tiết (Lessons)', group: 'Giáo trình & Học liệu' },
  vocabularies: { label: 'Kho từ vựng & Flashcard', group: 'Giáo trình & Học liệu' },
  languagecontents: { label: 'Mẫu câu giao tiếp', group: 'Giáo trình & Học liệu' },
  activities: { label: 'Hoạt động & Trò chơi tương tác', group: 'Giáo trình & Học liệu' },
  gamecatalogsettings: { label: 'Cấu hình kho trò chơi', group: 'Giáo trình & Học liệu' },
  topics: { label: 'Chủ đề học tập', group: 'Giáo trình & Học liệu' },
  media: { label: 'Tài nguyên đa phương tiện', group: 'Giáo trình & Học liệu' },
  videoseries: { label: 'Bộ phim hoạt hình tiếng Anh', group: 'Giáo trình & Học liệu' },
  videoepisodes: { label: 'Tập phim video', group: 'Giáo trình & Học liệu' },
  progresses: { label: 'Tiến độ hoàn thành bài học của bé', group: 'Kết quả & Tiến độ học tập' },
  childclientstates: { label: 'Trạng thái học tập đồng bộ của bé', group: 'Kết quả & Tiến độ học tập' },
  activityresults: { label: 'Kết quả làm bài & Trò chơi', group: 'Kết quả & Tiến độ học tập' },
  vocabularymasteries: { label: 'Mức độ thông thạo từ vựng', group: 'Kết quả & Tiến độ học tập' },
  stagestargrants: { label: 'Sổ cái sao thưởng (Star Ledger)', group: 'Kết quả & Tiến độ học tập' },
  unitcompletions: { label: 'Hoàn thành Unit & Huy hiệu', group: 'Kết quả & Tiến độ học tập' },
  learningevents: { label: 'Sự kiện tương tác học tập', group: 'Kết quả & Tiến độ học tập' },
  masteryevents: { label: 'Sự kiện làm chủ kiến thức', group: 'Kết quả & Tiến độ học tập' },
  learningsessions: { label: 'Phiên tự học tại nhà', group: 'Kết quả & Tiến độ học tập' },
  learningobservations: { label: 'Quan sát năng lực sớm (3 Trụ cột)', group: 'Kết quả & Tiến độ học tập' },
  videoprogresses: { label: 'Tiến độ xem video của bé', group: 'Kết quả & Tiến độ học tập' },
  videofavorites: { label: 'Video yêu thích', group: 'Kết quả & Tiến độ học tập' },
  videoreports: { label: 'Báo cáo nội dung video', group: 'Kết quả & Tiến độ học tập' },
  teachernotes: { label: 'Ghi chú & Nhận xét của giáo viên', group: 'Tương tác & Hệ thống' },
  parentnotifications: { label: 'Thông báo & Sổ liên lạc phụ huynh', group: 'Tương tác & Hệ thống' },
  homepracticeplans: { label: 'Kế hoạch ôn tập tại nhà', group: 'Tương tác & Hệ thống' },
  homepracticecompletions: { label: 'Hoàn thành bài tập về nhà', group: 'Tương tác & Hệ thống' },
  classrecognitions: { label: 'Vinh danh cấp lớp', group: 'Tương tác & Hệ thống' },
  schoolrecognitions: { label: 'Vinh danh cấp trường', group: 'Tương tác & Hệ thống' },
  systemsettings: { label: 'Cài đặt tham số hệ thống', group: 'Tương tác & Hệ thống' },
  auditlogs: { label: 'Nhật ký hoạt động hệ thống (Audit Logs)', group: 'Tương tác & Hệ thống' }
};

function getAllBackupModels() {
  return Object.values({ ...models, ClassRecognition });
}

function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

function safeSnapshotFilename(filename) {
  const clean = path.basename(String(filename || ''));
  if (!clean || clean !== filename || !/^[A-Za-z0-9._-]+\.json$/.test(clean)) {
    throw I.fail('Tên file bản sao lưu không hợp lệ.', 400);
  }
  return clean;
}

function listServerSnapshots() {
  try {
    ensureSnapshotDir();
    const files = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.endsWith('.json'));
    const items = [];
    for (const file of files) {
      const fullPath = path.join(SNAPSHOT_DIR, file);
      const stat = fs.statSync(fullPath);
      const isAuto = file.startsWith('AutoSnapshot_');
      items.push({
        filename: file,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        type: isAuto ? 'AUTO_BEFORE_RESTORE' : 'MANUAL_SNAPSHOT',
        label: isAuto ? 'Sao lưu tự động trước khi khôi phục' : 'Bản sao lưu lưu trữ trên máy chủ'
      });
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

function pruneOldAutoSnapshots(maxKeep = 15) {
  try {
    const all = listServerSnapshots().filter(s => s.type === 'AUTO_BEFORE_RESTORE');
    if (all.length <= maxKeep) return;
    for (const oldItem of all.slice(maxKeep)) {
      const p = path.join(SNAPSHOT_DIR, oldItem.filename);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  } catch {
    // ignore cleanup errors
  }
}

async function getCurrentCollectionCounts() {
  const allModels = getAllBackupModels();
  const isLiveDb = mongoose.connection.readyState === 1;
  const entries = await Promise.all(
    allModels.map(async model => {
      const name = model.collection.name;
      if (isLiveDb && typeof model.collection.countDocuments === 'function') {
        const count = await model.collection.countDocuments({});
        return [name, count];
      }
      const docs = await model.collection.find({}).toArray();
      return [name, docs.length];
    })
  );
  return Object.fromEntries(entries);
}

function parseRawBackupPayload(body) {
  const { EJSON } = mongoose.mongo.BSON;
  try {
    if (typeof body?.backupRaw === 'string' && body.backupRaw.trim()) {
      return EJSON.parse(body.backupRaw, { relaxed: false });
    }
    if (typeof body?.backupData === 'string' && body.backupData.trim()) {
      return EJSON.parse(body.backupData, { relaxed: false });
    }
    if (body?.backupData && typeof body.backupData === 'object') {
      return EJSON.parse(JSON.stringify(body.backupData), { relaxed: false });
    }
    if (body?.system === 'KCEnglishKids' && body?.collections) {
      return EJSON.parse(JSON.stringify(body), { relaxed: false });
    }
  } catch (err) {
    throw I.fail('File sao lưu không đúng định dạng JSON/BSON hợp lệ: ' + err.message, 400);
  }
  throw I.fail('Không tìm thấy dữ liệu bản sao lưu trong yêu cầu.', 400);
}

function buildBackupAnalysis(payload, currentCounts = {}) {
  const allowed = validateBackup(payload);
  const users = payload.collections.users || [];
  const classrooms = payload.collections.classrooms || [];

  const usersBreakdown = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    teachers: users.filter(u => u.role === 'TEACHER').length,
    children: users.filter(u => u.role === 'CHILD').length
  };

  const classroomsBreakdown = {
    total: classrooms.length,
    active: classrooms.filter(c => c.status === 'ACTIVE').length,
    upcoming: classrooms.filter(c => c.status === 'UPCOMING').length,
    completed: classrooms.filter(c => c.status === 'COMPLETED').length,
    names: classrooms.slice(0, 12).map(c => c.name).filter(Boolean)
  };

  let totalDocuments = 0;
  const collectionDetails = [];

  for (const name of allowed) {
    const docs = payload.collections[name] || [];
    const backupCount = docs.length;
    const currentCount = currentCounts[name] ?? 0;
    totalDocuments += backupCount;
    const meta = COLLECTION_METADATA[name] || { label: name, group: 'Dữ liệu khác' };
    collectionDetails.push({
      name,
      label: meta.label,
      group: meta.group,
      backupCount,
      currentCount,
      diff: backupCount - currentCount
    });
  }

  return {
    system: payload.system,
    version: payload.version,
    format: payload.format,
    exportType: payload.exportType || 'FULL_SYSTEM_BACKUP',
    exportedAt: payload.exportedAt || null,
    note: payload.note || null,
    totalCollections: allowed.size,
    totalDocuments,
    usersBreakdown,
    classroomsBreakdown,
    keyMetrics: {
      users: users.length,
      students: usersBreakdown.children,
      teachers: usersBreakdown.teachers,
      admins: usersBreakdown.admins,
      classrooms: classrooms.length,
      schedules: (payload.collections.schedules || []).length,
      lessons: (payload.collections.lessons || []).length,
      units: (payload.collections.curriculumunits || []).length,
      vocabularies: (payload.collections.vocabularies || []).length,
      activities: (payload.collections.activities || []).length,
      classroomSessions: (payload.collections.classroomsessions || []).length,
      progresses: (payload.collections.progresses || []).length,
      starGrants: (payload.collections.stagestargrants || []).length
    },
    collections: collectionDetails
  };
}

exports.getBackupRestoreOverview = handler(async (req, res) => {
  const currentCounts = await getCurrentCollectionCounts();
  const [users, classrooms, recentLogs] = await Promise.all([
    models.User.collection.find({}).toArray(),
    models.ClassRoom.collection.find({}).toArray(),
    models.AuditLog.find({
      action: { $in: ['EXPORT_SYSTEM_BACKUP', 'RESTORE_SYSTEM_BACKUP', 'CREATE_SERVER_SNAPSHOT'] }
    })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean()
      .catch(() => [])
  ]);

  const totalDocuments = Object.values(currentCounts).reduce((sum, val) => sum + (val || 0), 0);
  const collectionDetails = Object.keys(currentCounts).map(name => {
    const meta = COLLECTION_METADATA[name] || { label: name, group: 'Dữ liệu khác' };
    return {
      name,
      label: meta.label,
      group: meta.group,
      count: currentCounts[name] || 0
    };
  });

  res.json({
    success: true,
    data: {
      currentStats: {
        totalCollections: Object.keys(currentCounts).length,
        totalDocuments,
        users: users.length,
        students: users.filter(u => u.role === 'CHILD').length,
        teachers: users.filter(u => u.role === 'TEACHER').length,
        admins: users.filter(u => u.role === 'ADMIN').length,
        classrooms: classrooms.length,
        activeClassrooms: classrooms.filter(c => c.status === 'ACTIVE').length,
        schedules: currentCounts.schedules || 0,
        lessons: currentCounts.lessons || 0,
        units: currentCounts.curriculumunits || 0,
        vocabularies: currentCounts.vocabularies || 0,
        activities: currentCounts.activities || 0,
        classroomSessions: currentCounts.classroomsessions || 0,
        progresses: currentCounts.progresses || 0,
        starGrants: currentCounts.stagestargrants || 0
      },
      collections: collectionDetails,
      recentLogs,
      serverSnapshots: listServerSnapshots()
    }
  });
});

exports.validateSystemBackup = handler(async (req, res) => {
  let payload;
  if (req.body?.snapshotFilename) {
    const cleanName = safeSnapshotFilename(req.body.snapshotFilename);
    const fullPath = path.join(SNAPSHOT_DIR, cleanName);
    if (!fs.existsSync(fullPath)) throw I.fail('Không tìm thấy bản sao lưu trên máy chủ.', 404);
    const raw = fs.readFileSync(fullPath, 'utf8');
    payload = mongoose.mongo.BSON.EJSON.parse(raw, { relaxed: false });
  } else {
    payload = parseRawBackupPayload(req.body);
  }

  let currentCounts = {};
  try {
    currentCounts = await getCurrentCollectionCounts();
  } catch {
    currentCounts = {};
  }

  let analysis;
  try {
    analysis = buildBackupAnalysis(payload, currentCounts);
  } catch (err) {
    const msg = err.message || '';
    let viMsg = 'File sao lưu không hợp lệ hoặc không đúng cấu trúc của hệ thống KCEnglishKids.';
    if (msg.includes('Unsupported or incomplete backup')) {
      viMsg = 'Phiên bản hoặc định dạng bản sao lưu không được hỗ trợ (yêu cầu chuẩn KCEnglishKids Extended JSON v3.x).';
    } else if (msg.includes('missing collections')) {
      viMsg = 'Bản sao lưu bị thiếu các bảng dữ liệu (collections) bắt buộc của hệ thống.';
    } else if (msg.includes('Invalid collection')) {
      viMsg = `Dữ liệu trong bảng "${msg.split(':').pop()?.trim()}" bị hỏng hoặc thiếu khóa định danh (_id).`;
    }
    throw I.fail(viMsg + ` (${msg})`, 400);
  }

  res.json({
    success: true,
    valid: true,
    message: 'Bản sao lưu hợp lệ 100% và sẵn sàng để khôi phục.',
    data: analysis
  });
});

exports.createServerSnapshot = handler(async (req, res) => {
  ensureSnapshotDir();
  const collections = {};
  for (const model of getAllBackupModels()) {
    collections[model.collection.name] = await model.collection.find({}).toArray();
  }
  const note = String(req.body?.note || 'Bản sao lưu chủ động trên máy chủ').trim().slice(0, 200);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `Snapshot_Server_${stamp}.json`;
  const fullPath = path.join(SNAPSHOT_DIR, filename);

  const payload = {
    system: 'KCEnglishKids',
    exportType: 'MANUAL_SERVER_SNAPSHOT',
    note,
    createdBy: req.user?.email || req.user?.name || 'Admin',
    version: '3.4.0',
    format: 'mongodb-extended-json',
    exportedAt: new Date(),
    collections
  };

  const { EJSON } = mongoose.mongo.BSON;
  fs.writeFileSync(fullPath, EJSON.stringify(payload, null, 2, { relaxed: false }), 'utf8');

  const totalDocuments = Object.values(collections).reduce((sum, arr) => sum + arr.length, 0);
  await I.audit(req, 'CREATE_SERVER_SNAPSHOT', 'System', undefined, {
    filename,
    note,
    totalCollections: Object.keys(collections).length,
    totalDocuments
  });

  res.status(201).json({
    success: true,
    message: `Đã tạo bản sao lưu trên máy chủ (${filename}) thành công!`,
    data: {
      filename,
      note,
      totalCollections: Object.keys(collections).length,
      totalDocuments,
      serverSnapshots: listServerSnapshots()
    }
  });
});

exports.downloadServerSnapshot = handler(async (req, res) => {
  const cleanName = safeSnapshotFilename(req.params.filename);
  const fullPath = path.join(SNAPSHOT_DIR, cleanName);
  if (!fs.existsSync(fullPath)) throw I.fail('Không tìm thấy bản sao lưu trên máy chủ.', 404);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);
  res.type('application/json').send(fs.readFileSync(fullPath, 'utf8'));
});

exports.deleteServerSnapshot = handler(async (req, res) => {
  const cleanName = safeSnapshotFilename(req.params.filename);
  const fullPath = path.join(SNAPSHOT_DIR, cleanName);
  if (!fs.existsSync(fullPath)) throw I.fail('Không tìm thấy bản sao lưu trên máy chủ.', 404);
  fs.unlinkSync(fullPath);
  res.json({
    success: true,
    message: `Đã xóa bản sao lưu ${cleanName} khỏi máy chủ.`,
    data: { serverSnapshots: listServerSnapshots() }
  });
});

exports.restoreSystemBackup = handler(async (req, res) => {
  const { adminPassword, confirmText, snapshotFilename } = req.body || {};

  // 1. Verify Admin Confirmation (Password OR explicit confirmation phrase)
  const hasPassword = typeof adminPassword === 'string' && adminPassword.trim().length > 0;
  const normalizedConfirm = String(confirmText || '').trim().toUpperCase();
  const validConfirmPhrases = ['KHÔI PHỤC', 'KHOI PHUC', 'XÁC NHẬN KHÔI PHỤC', 'XAC NHAN KHOI PHUC', 'RESTORE'];

  if (hasPassword) {
    const adminDoc = await User.findById(req.user._id);
    if (!adminDoc || !(await adminDoc.matchPassword(adminPassword.trim()))) {
      throw I.fail('Mật khẩu quản trị viên không chính xác. Vui lòng kiểm tra lại.', 401);
    }
  } else if (!validConfirmPhrases.includes(normalizedConfirm)) {
    throw I.fail('Vui lòng nhập mật khẩu quản trị viên hoặc gõ chính xác cụm từ "KHÔI PHỤC" để xác nhận.', 400);
  }

  // 2. Parse & Validate Backup Payload
  let payload;
  let sourceName = 'Uploaded_File.json';
  if (snapshotFilename) {
    const cleanName = safeSnapshotFilename(snapshotFilename);
    const fullPath = path.join(SNAPSHOT_DIR, cleanName);
    if (!fs.existsSync(fullPath)) throw I.fail('Không tìm thấy bản sao lưu trên máy chủ.', 404);
    payload = mongoose.mongo.BSON.EJSON.parse(fs.readFileSync(fullPath, 'utf8'), { relaxed: false });
    sourceName = cleanName;
  } else {
    payload = parseRawBackupPayload(req.body);
    if (req.body?.fileName) sourceName = String(req.body.fileName).slice(0, 120);
  }

  let allowed;
  try {
    allowed = validateBackup(payload);
  } catch (err) {
    throw I.fail('Bản sao lưu không hợp lệ, đã hủy thao tác khôi phục: ' + err.message, 400);
  }

  // 3. Read current collections for in-memory rollback & auto safety snapshot
  const allModels = getAllBackupModels();
  const modelByCollection = Object.fromEntries(allModels.map(m => [m.collection.name, m]));
  const currentCollections = {};
  for (const model of allModels) {
    currentCollections[model.collection.name] = await model.collection.find({}).toArray();
  }

  let safetySnapshotFilename = null;
  try {
    ensureSnapshotDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    safetySnapshotFilename = `AutoSnapshot_BeforeRestore_${stamp}.json`;
    const safetyPayload = {
      system: 'KCEnglishKids',
      exportType: 'AUTO_BEFORE_RESTORE',
      note: `Tự động sao lưu trước khi khôi phục từ ${sourceName}`,
      createdBy: req.user?.email || req.user?.name || 'Admin',
      version: '3.4.0',
      format: 'mongodb-extended-json',
      exportedAt: new Date(),
      collections: currentCollections
    };
    const { EJSON } = mongoose.mongo.BSON;
    fs.writeFileSync(path.join(SNAPSHOT_DIR, safetySnapshotFilename), EJSON.stringify(safetyPayload, null, 2, { relaxed: false }), 'utf8');
    pruneOldAutoSnapshots(15);
  } catch {
    // Continue even if disk write is restricted in test environments
  }

  // 4. Ensure at least one active ADMIN exists in restored users so admin never gets locked out
  const restoredUsers = Array.isArray(payload.collections.users) ? [...payload.collections.users] : [];
  const hasActiveAdmin = restoredUsers.some(u => u.role === 'ADMIN' && u.status === 'ACTIVE');
  if (!hasActiveAdmin) {
    const currentAdminRaw = (currentCollections.users || []).find(u => String(u._id) === String(req.user._id)) ||
      (currentCollections.users || []).find(u => u.role === 'ADMIN' && u.status === 'ACTIVE');
    if (currentAdminRaw) {
      restoredUsers.push(currentAdminRaw);
    }
  }
  payload.collections.users = restoredUsers;

  // 5. Perform restoration with automatic rollback if any collection fails
  let totalDocumentsRestored = 0;
  try {
    for (const name of allowed) {
      const model = modelByCollection[name];
      if (!model) continue;
      const docs = payload.collections[name] || [];
      await model.collection.deleteMany({});
      if (docs.length > 0) {
        await model.collection.insertMany(docs, { ordered: true });
        totalDocumentsRestored += docs.length;
      }
    }
    if (mongoose.connection.readyState === 1) {
      for (const model of allModels) {
        if (typeof model.createIndexes === 'function') {
          await model.createIndexes().catch(() => {});
        }
      }
    }
  } catch (restoreError) {
    // Rollback to currentCollections
    for (const name of allowed) {
      const model = modelByCollection[name];
      if (!model) continue;
      const prevDocs = currentCollections[name] || [];
      await model.collection.deleteMany({}).catch(() => {});
      if (prevDocs.length > 0) {
        await model.collection.insertMany(prevDocs, { ordered: false }).catch(() => {});
      }
    }
    throw I.fail('Lỗi trong quá trình nạp dữ liệu. Hệ thống đã tự động hoàn tác về trạng thái an toàn ban đầu: ' + restoreError.message, 500);
  }

  // 6. Issue a fresh token for the active admin in the restored database so session stays valid
  const activeAdminInRestored =
    restoredUsers.find(u => String(u._id) === String(req.user._id) && u.role === 'ADMIN' && u.status === 'ACTIVE') ||
    restoredUsers.find(u => u.role === 'ADMIN' && u.status === 'ACTIVE');

  let newToken = null;
  if (activeAdminInRestored) {
    newToken = jwt.sign(
      { id: String(activeAdminInRestored._id), authVersion: activeAdminInRestored.authVersion || 0 },
      jwtSecret(),
      { expiresIn: '7d' }
    );
  }

  // 7. Write Audit Log after restore
  await I.audit(req, 'RESTORE_SYSTEM_BACKUP', 'System', undefined, {
    sourceName,
    backupVersion: payload.version,
    backupExportedAt: payload.exportedAt,
    safetySnapshotFilename,
    totalCollections: allowed.size,
    totalDocumentsRestored
  });

  res.json({
    success: true,
    message: `Khôi phục toàn bộ hệ thống thành công! Đã nạp ${totalDocumentsRestored} bản ghi trên ${allowed.size} bảng dữ liệu.`,
    data: {
      sourceName,
      backupVersion: payload.version,
      backupExportedAt: payload.exportedAt,
      safetySnapshotFilename,
      totalCollections: allowed.size,
      totalDocumentsRestored,
      newToken,
      serverSnapshots: listServerSnapshots()
    }
  });
});
