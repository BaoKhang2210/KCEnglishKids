const { ClassroomSession, ClassRoom, Lesson, Activity, Attendance, Schedule, CurriculumUnit } = require('../models');
const access = require('../services/teacherAccess');
const rules = require('../services/teacherRules');
const { activeScheduleFilter } = require('../services/scheduleRules');
const ai = require('../services/aiService');
const { lessonGuide, closureDecision } = require('../services/earlyLearning');
const { idOf, validId, fail } = rules;
const reviewSession = session => session.isGapReview === true || session.lessonPlan?.isGapReview === true || session.lessonPlan?.meta?.isReviewPlan === true;
const scope = req => req.user.role === 'ADMIN' ? {} : { teacher: req.user._id };
const wrap = handler => async (req, res, next) => { try { await handler(req, res); } catch (error) { next(error); } };
async function sessionFor(req, writing = false, active = true) {
  if (!validId(req.params.id)) fail('Mã buổi học không hợp lệ.');
  const query = ClassroomSession.findOne({ _id: req.params.id, ...scope(req) });
  const item = await (writing ? query.select('+appliedOperations') : query);
  if (!item) fail('Không tìm thấy buổi học được phân công.', 404);
  await access.classroom(req, item.classroom, writing && active);
  return item;
}
async function saveSession(req, mutate, closing = false) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const item = await sessionFor(req, true, !closing);
    const changed = await mutate(item);
    if (changed === false) return item;
    try { await item.save(); return item; }
    catch (error) {
      if (error.code === 11000) fail('Lớp hoặc giáo viên đã có một buổi học đang diễn ra.', 409);
      if (error.name !== 'VersionError') throw error;
    }
  }
  fail('Buổi học vừa được cập nhật ở thiết bị khác. Vui lòng tải lại.', 409);
}
async function checkTiming(req, classroom) {
  if (req.user.role === 'ADMIN') return;
  const schedules = await Schedule.find({ classroom, teacher: req.user._id, ...activeScheduleFilter() });
  const slots = schedules.flatMap(item => item.weeklySlots || []);
  // Preparation is allowed anytime; teaching requires an effective admin timetable.
  if (!slots.length) {
    if (await Schedule.exists({ classroom, teacher: req.user._id, isActive: true })) fail('Thời khóa biểu của lớp chưa có hiệu lực hoặc đã hết hiệu lực. Vui lòng kiểm tra với quản trị viên.', 409);
    fail('Lớp chưa có thời khóa biểu. Vui lòng liên hệ quản trị viên để xếp lịch trước khi bắt đầu.', 409);
  }
  const clock = rules.vnClock();
  const mins = value => value.split(':').reduce((n, part) => n * 60 + Number(part), 0);
  const activeSlot = slots.find(slot => slot.dayOfWeek === clock.day && clock.minutes >= mins(slot.startTime) - 15 && clock.minutes <= mins(slot.endTime) + 30);
  const todaySlot = slots.find(slot => slot.dayOfWeek === clock.day);
  if (!activeSlot && !todaySlot) {
    fail('Chưa đến giờ dạy theo thời khóa biểu. Lớp học không có ca dạy hôm nay.', 409);
  }
  return activeSlot || todaySlot;
}
async function populateSession(item, summary = false) {
  await item.populate('classroom', 'name ageGroupCode teacher');
  await item.populate('teacher', 'name avatar avatarUrl');
  await item.populate({ path: 'lesson', select: 'title vietnameseTitle description ageGroupCode learningObjectives vocabularyItems languageContents topic curriculumUnits', populate: [
    { path: 'vocabularyItems', select: 'english vietnamese pronunciation audioUrl imageUrl category' },
    { path: 'languageContents', match: { status: 'ACTIVE' } },
    { path: 'curriculumUnits', select: 'unitNumber bookNumber bigQuestion title' },
    { path: 'topic', select: 'englishName vietnameseName' }
  ] });
  await item.populate('activities', 'title vietnameseTitle instructions activityType questionCount questions status');
  await item.populate('studentScores.student', 'name avatar avatarUrl ageGroupCode');
  if (summary) {
    await item.populate('summary.studentsNeedingPractice', 'name avatar avatarUrl');
    await item.populate('summary.topPerformers', 'name avatar avatarUrl');
  }
  const data = item.toObject ? item.toObject() : item;
  data.isGapReview = reviewSession(data);
  if (data.isGapReview && data.lesson && data.lessonPlan?.reviewFocus?.length) data.lesson.vocabularyItems = await require('../models').Vocabulary.find({ _id: { $in: data.lessonPlan.reviewFocus.map(word => word.vocabularyId).filter(Boolean) }, status: 'ACTIVE' }).lean();
  data.teachingGuide = data.teachingGuideSnapshot || lessonGuide(data.lesson, data.ageGroup);
  if (data.teachingGoals?.length) data.teachingGuide.goals = data.teachingGoals;
  return data;
}
exports.getSessions = wrap(async (req, res) => {
  const query = scope(req);
  if (req.user.role !== 'ADMIN') query.classroom = { $in: await access.classroomIds(req) };
  if (req.query.status) {
    if (!['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'].includes(req.query.status)) fail('Trạng thái buổi học không hợp lệ.');
    query.status = req.query.status;
  }
  if (req.query.classroomId) { await access.classroom(req, req.query.classroomId); query.classroom = req.query.classroomId; }
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 100));
  const [data, total] = await Promise.all([
    ClassroomSession.find(query).populate('classroom', 'name ageGroupCode teacher').populate('teacher', 'name avatar avatarUrl')
      .populate({ path: 'lesson', select: 'title vietnameseTitle displayOrder curriculumUnits', populate: { path: 'curriculumUnits', select: 'bookNumber unitNumber title vietnameseTitle theme' } })
      .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    ClassroomSession.countDocuments(query)
  ]);
  for (const item of data) if (item.status === 'COMPLETED') rules.summarize(item);
  res.json({ success: true, count: data.length, total, page, pages: Math.ceil(total / limit), data });
});
exports.createSession = wrap(async (req, res) => {
  const body = req.body;
  const room = await access.classroom(req, body.classroomId || body.classRoomId, true);
  const duration = body.plannedDuration ?? 25;
  if (!Number.isInteger(duration) || duration < 10 || duration > 120) fail('Thời lượng buổi học phải từ 10 đến 120 phút.');
  const number = body.sessionNumber ?? 1;
  if (!Number.isInteger(number) || number < 1 || number > 10000) fail('Số buổi học không hợp lệ.');
  let lesson = null;
  if (body.lessonId) {
    if (!validId(body.lessonId)) fail('Mã bài học không hợp lệ.');
    lesson = await Lesson.findOne({ _id: body.lessonId, status: 'ACTIVE' }).populate('vocabularyItems').populate({ path: 'languageContents', match: { status: 'ACTIVE' } }).populate('topic');
    if (!lesson) fail('Bài học đã bị ẩn hoặc không tồn tại.');
    if (lesson.ageGroupCode && room.ageGroupCode && lesson.ageGroupCode !== room.ageGroupCode) fail('Bài học không phù hợp nhóm tuổi của lớp.');
    if (room.curriculumBook && !(await require('../models').CurriculumUnit.exists({ book: room.curriculumBook, _id: { $in: lesson.curriculumUnits || [] }, status: 'ACTIVE' }))) fail('Bài học không thuộc giáo trình được phân cho lớp.');
  }
  const activityIds = body.activityIds ?? [];
  if (!Array.isArray(activityIds) || activityIds.some(id => !validId(id)) || new Set(activityIds).size !== activityIds.length) fail('Danh sách hoạt động không hợp lệ.');
  if (activityIds.length && !lesson) fail('Vui lòng chọn bài học trước khi chọn hoạt động.');
  const activities = activityIds.length ? await Activity.find({ _id: { $in: activityIds }, lesson: lesson._id, status: 'ACTIVE' }).select('_id') : [];
  if (activities.length !== activityIds.length) fail('Hoạt động đã bị ẩn hoặc không thuộc bài học.');
  let records = null;
  if (body.attendanceRecords !== undefined) records = rules.attendanceRecords(body.attendanceRecords, room.students);
  const date = rules.attendanceDate(body.attendanceDate);
  if (records && date !== rules.vnDate()) fail('Điểm danh buổi dạy mới phải là ngày hôm nay (giờ Việt Nam).');
  const roster = room.students;
  const map = new Map((records || []).map(row => [row.student, row.status]));
  let plan = body.lessonPlan || null;
  if (plan && (typeof plan !== 'object' || Array.isArray(plan) || JSON.stringify(plan).length > 200000)) fail('Giáo án không hợp lệ.');
  if (plan && lesson && (plan.meta?.lessonTitle !== lesson.title || plan.meta?.ageGroup !== room.ageGroupCode || plan.meta?.durationMinutes !== duration)) plan = null;
  const isGapReview = body.isGapReview === true || body.reviewMode === true || plan?.isGapReview === true || plan?.meta?.isReviewPlan === true;
  let reviewVocabulary = null;
  if (isGapReview) {
    const rawWords = body.gapWords || plan?.reviewFocus?.map(word => word.english) || plan?.meta?.gapRemediationFocus || [];
    const names = (Array.isArray(rawWords) ? rawWords : String(rawWords).split(',')).map(word => String(word).trim().toLowerCase()).filter(Boolean);
    if (!lesson || !names.length || names.length > 12 || new Set(names).size !== names.length) fail('Chọn bài học và từ 1 đến 12 từ ôn khác nhau.');
    const report = await require('../services/classLearningGaps').buildReport(require('../models'), room);
    const focus = report.gaps.filter(word => names.includes(word.english.toLowerCase()));
    if (names.some(name => !focus.some(word => word.english.toLowerCase() === name))) fail('Dữ liệu ôn tập đã thay đổi. Vui lòng tải lại phần phân tích của lớp.', 409);
    reviewVocabulary = await require('../models').Vocabulary.find({ _id: { $in: focus.map(word => word.vocabularyId) }, status: 'ACTIVE' }).lean();
    plan = ai.applyReviewFocus(ai.generateLessonPlan({ ageGroup: room.ageGroupCode, lessonTitle: lesson.title, durationMinutes: duration, vocabularyList: reviewVocabulary, sentencePatterns: [], teachingStyle: 'active_tpr' }), focus);
  } else if (!plan && lesson) plan = await ai.generateLessonPlanWithAI({ ageGroup: room.ageGroupCode, lessonTitle: lesson.title, targetTopic: lesson.topic?.englishName || 'General', durationMinutes: duration, vocabularyList: lesson.vocabularyItems || [], sentencePatterns: lesson.languageContents || [], teachingStyle: 'active_tpr' });
  const guideLesson = reviewVocabulary ? { ...(lesson.toObject ? lesson.toObject() : lesson), vocabularyItems: reviewVocabulary } : lesson;
  const session = await ClassroomSession.create({ classroom: room._id, teacher: req.user._id, lesson: lesson?._id || null,
    title: rules.text(body.title, 200) || lesson?.title || 'Buổi dạy trên lớp', ageGroup: room.ageGroupCode,
    status: 'SCHEDULED', plannedDuration: duration, sessionNumber: number, includeWarmup: body.includeWarmup !== false,
    isGapReview,
    activities: isGapReview ? [] : activityIds, lessonPlan: plan, teachingGoals: lessonGuide(guideLesson,room.ageGroupCode).goals, teachingGuideSnapshot: lessonGuide(guideLesson,room.ageGroupCode),
    studentScores: roster.map(student => ({ student, attendance: map.get(idOf(student)) || 'PRESENT' }))
  });
  if (records) {
    try {
      await Attendance.findOneAndUpdate({ classroom: room._id, date }, { classroom: room._id, teacher: req.user._id, date, records, note: rules.text(body.attendanceNote) }, { upsert: true, new: true, runValidators: true });
    } catch (error) { await ClassroomSession.deleteOne({ _id: session._id, status: 'SCHEDULED' }); throw error; }
  }
  res.status(201).json({ success: true, data: await populateSession(session) });
});
exports.getSession = wrap(async (req, res) => res.json({ success: true, data: await populateSession(await sessionFor(req)) }));
exports.startSession = wrap(async (req, res) => {
  const item = await saveSession(req, async session => {
    if (session.status === 'LIVE') return false;
    if (session.status !== 'SCHEDULED') fail('Buổi học đã kết thúc.', 409);
    const scheduledSlot = await checkTiming(req, session.classroom);
    const room = await access.classroom(req, session.classroom, true);
    const completedIds = (room.completedLessons || []).map(id => idOf(id));
    const slotLessonId = scheduledSlot?.lesson ? idOf(scheduledSlot.lesson) : null;
    const slotLessonAlreadyCompleted = Boolean(slotLessonId && completedIds.includes(slotLessonId));
    if (!reviewSession(session) && slotLessonId && !slotLessonAlreadyCompleted && slotLessonId !== idOf(session.lesson)) {
      fail('Bài dạy không khớp bài đã được phân trên thời khóa biểu. Vui lòng mở đúng bài theo lịch.', 409);
    }
    const attendance = await Attendance.findOne({ classroom: room._id, date: rules.vnDate() });
    if (!attendance) fail('Vui lòng hoàn tất điểm danh hôm nay ở phần chuẩn bị buổi dạy trước khi mở lớp.');
    const records = rules.attendanceRecords(attendance.records, room.students);
    session.studentScores = room.students.map(student => ({ student, attendance: records.find(row => row.student === idOf(student)).status }));
    const other = await ClassroomSession.exists({ _id: { $ne: session._id }, status: 'LIVE', $or: [{ classroom: session.classroom }, { teacher: session.teacher }] });
    if (other) fail('Vui lòng kết thúc buổi dạy đang mở trước khi mở buổi mới.', 409);
    if (session.lesson && !await Lesson.exists({ _id: session.lesson, status: 'ACTIVE' })) fail('Bài học đã bị ẩn. Vui lòng tạo lại kế hoạch.');
    if (session.activities.length && await Activity.countDocuments({ _id: { $in: session.activities }, lesson: session.lesson, status: 'ACTIVE' }) !== session.activities.length) fail('Một hoạt động đã thay đổi hoặc bị ẩn. Vui lòng chuẩn bị lại buổi dạy.', 409);
    session.status = 'LIVE'; session.startedAt = new Date();
  });
  res.json({ success: true, data: item });
});
async function advanceClassroomCurriculum(classroomId, completedLessonId) {
  try {
    const classroom = await ClassRoom.findById(classroomId);
    if (!classroom) return;

    const completedLessonIds = (classroom.completedLessons || []).map(id => String(id?._id || id));
    if (completedLessonId && !completedLessonIds.includes(String(completedLessonId))) {
      completedLessonIds.push(String(completedLessonId));
    }

    if (CurriculumUnit && typeof CurriculumUnit.find === 'function') {
      const units = await CurriculumUnit.find({ ageGroupCode: classroom.ageGroupCode, status: 'ACTIVE' }).sort({ bookNumber: 1, unitNumber: 1 }).lean();
      const unitIds = units.map(u => u._id);
      const lessons = await Lesson.find({ curriculumUnits: { $in: unitIds }, status: 'ACTIVE', ageGroupCode: classroom.ageGroupCode }).sort({ displayOrder: 1, _id: 1 }).lean();

      const unitOrderMap = new Map(units.map((u, idx) => [String(u._id), idx]));
      const sortedLessons = [...lessons].sort((a, b) => {
        const uA = Array.isArray(a.curriculumUnits) ? a.curriculumUnits[0] : a.curriculumUnits;
        const uB = Array.isArray(b.curriculumUnits) ? b.curriculumUnits[0] : b.curriculumUnits;
        const orderA = unitOrderMap.get(String(uA)) ?? 999;
        const orderB = unitOrderMap.get(String(uB)) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      });

      const nextUntaught = sortedLessons.find(l => !completedLessonIds.includes(String(l._id)));
      await ClassRoom.updateOne(
        { _id: classroom._id, deletionPending: { $ne: true } },
        {
          $addToSet: { completedLessons: completedLessonId },
          $set: { currentLesson: nextUntaught ? nextUntaught._id : classroom.currentLesson }
        }
      );
      return;
    }

    await ClassRoom.updateOne({ _id: classroom._id, deletionPending: { $ne: true } }, { $addToSet: { completedLessons: completedLessonId } });
  } catch (err) {
    console.error('Lỗi tự động thăng cấp bài học cho lớp:', err);
  }
}

exports.endSession = wrap(async (req, res) => {
  const item = await saveSession(req, async session => {
    if (session.status === 'COMPLETED') return false;
    rules.requireLive(session);
    const lesson = session.lesson ? await Lesson.findById(session.lesson).populate('vocabularyItems') : null;
    const guide = session.teachingGuideSnapshot || lessonGuide(lesson,session.ageGroup);
    if(session.teachingGoals?.length)guide.goals=session.teachingGoals;
    session.teachingOutcome = closureDecision(reviewSession(session) ? { ...(req.body || {}), coverage: 'REVIEW' } : req.body||{},guide,session.studentScores);
    session.status = 'COMPLETED'; session.endedAt = new Date(); rules.summarize(session);
  }, true);
  // Idempotent progress update and automatic advance to the next untaught curriculum lesson
  if (item.lesson && item.teachingOutcome?.coverage === 'COMPLETE') {
    await advanceClassroomCurriculum(item.classroom, item.lesson);
  }
  res.json({ success: true, data: await populateSession(item, true) });
});
exports.scoreStudent = wrap(async (req, res) => {
  const item = await saveSession(req, session => rules.applyScore(session, req.body, [req.body.studentId]));
  res.json({ success: true, data: item });
});
exports.scoreBulk = wrap(async (req, res) => {
  const item = await saveSession(req, session => rules.applyScore(session, req.body, req.body.studentIds));
  res.json({ success: true, data: item });
});
exports.recordQuestionResult = wrap(async (req, res) => {
  const item = await saveSession(req, async session => {
    if (req.body.activityId) {
      const activity = await Activity.findOne({ _id: req.body.activityId, status: 'ACTIVE' }).select('questions questionCount');
      const count = activity?.questions?.length || activity?.questionCount || 0;
      if (!activity || !Number.isInteger(req.body.questionIndex ?? 0) || (req.body.questionIndex ?? 0) >= count) fail('Câu hỏi không tồn tại trong hoạt động.');
    }
    rules.recordQuestion(session, req.body);
  });
  res.json({ success: true, data: item });
});
exports.updateStudentAttendance = wrap(async (req, res) => {
  const { studentId } = req.params;
  const status = req.body.attendance || 'LATE';
  if (!['PRESENT', 'LATE', 'EXCUSED', 'ABSENT'].includes(status)) fail('Trạng thái điểm danh không hợp lệ.');

  const item = await saveSession(req, async session => {
    rules.requireLive(session);
    const scoreRow = session.studentScores.find(row => idOf(row.student) === studentId);
    if (!scoreRow) fail('Học sinh không thuộc danh sách buổi học.', 404);
    scoreRow.attendance = status;
  });

  try {
    const today = rules.vnDate();
    await Attendance.updateOne(
      { classroom: item.classroom, date: today, 'records.student': studentId },
      { $set: { 'records.$.status': status } }
    );
  } catch (err) {
    console.warn('Could not sync live attendance update to daily roster:', err);
  }

  res.json({ success: true, data: await populateSession(item) });
});
exports.updateActivityIndex = wrap(async (req, res) => {
  const item = await saveSession(req, session => {
    rules.requireLive(session);
    const index = req.body.index;
    if (!Number.isInteger(index) || index < 0 || index >= session.activities.length) fail('Vị trí hoạt động không hợp lệ.');
    session.currentActivityIndex = index;
  });
  res.json({ success: true, data: item });
});
exports.getSessionSummary = wrap(async (req, res) => {
  const item = await sessionFor(req);
  if (item.status !== 'COMPLETED') fail('Vui lòng kết thúc buổi dạy trước khi xem tổng kết.', 409);
  rules.summarize(item);
  res.json({ success: true, data: await populateSession(item, true) });
});
exports.deleteDraft = wrap(async (req, res) => {
  const item = await sessionFor(req, true, false);
  if (item.status !== 'SCHEDULED' || item.startedAt || item.questionResults?.length || item.studentScores.some(row => row.stars || row.points || row.correctCount || row.incorrectCount)) fail('Chỉ xóa được kế hoạch chưa bắt đầu và chưa có kết quả học tập.', 409);
  const result = await ClassroomSession.deleteOne({ _id: item._id, status: 'SCHEDULED', __v: item.__v });
  if (!result.deletedCount) fail('Kế hoạch vừa thay đổi. Vui lòng tải lại.', 409);
  res.json({ success: true });
});

exports.reportOff = wrap(async (req, res) => {
  const { classroomId, date: inputDate, reason, note, timeSlot } = req.body;
  if (!rules.validId(classroomId)) fail('Mã lớp học không hợp lệ.');
  const room = await access.classroom(req, classroomId, true);
  let date = rules.vnDate();
  if (inputDate) {
    if (typeof inputDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) fail('Ngày báo nghỉ không đúng định dạng YYYY-MM-DD.');
    if (isNaN(new Date(`${inputDate}T00:00:00+07:00`).getTime())) fail('Ngày báo nghỉ không hợp lệ.');
    date = inputDate;
  }
  const validReason = rules.text(reason, 200) || 'Nghỉ theo kế hoạch';
  const validNote = rules.text(note, 500) || '';

  const startOfDay = new Date(`${date}T00:00:00+07:00`);
  const endOfDay = new Date(`${date}T23:59:59+07:00`);

  let session = await ClassroomSession.findOne({
    classroom: room._id,
    status: { $in: ['SCHEDULED', 'CANCELLED'] },
    $or: [
      { startedAt: { $gte: startOfDay, $lte: endOfDay } },
      { createdAt: { $gte: startOfDay, $lte: endOfDay } }
    ]
  });

  if (session) {
    session.status = 'CANCELLED';
    session.cancellationReason = validReason;
    session.cancellationNote = validNote;
    session.cancelledBy = req.user._id;
    session.cancelledAt = new Date();
    await session.save();
  } else {
    session = await ClassroomSession.create({
      classroom: room._id,
      teacher: room.teacher || req.user._id,
      lesson: null,
      title: 'Buổi học báo nghỉ',
      ageGroup: room.ageGroupCode || '4-5',
      status: 'CANCELLED',
      plannedDuration: 0,
      sessionNumber: (await ClassroomSession.countDocuments({ classroom: room._id })) + 1,
      cancellationReason: validReason,
      cancellationNote: validNote,
      cancelledBy: req.user._id,
      cancelledAt: new Date(),
      startedAt: new Date(`${date}T${timeSlot?.startTime || '08:00'}:00+07:00`),
      endedAt: new Date(`${date}T${timeSlot?.endTime || '08:45'}:00+07:00`)
    });
  }

  res.status(200).json({ success: true, data: session });
});

exports.cancelSession = wrap(async (req, res) => {
  const item = await sessionFor(req, true, false);
  if (item.status === 'COMPLETED' || item.status === 'LIVE') {
    fail('Không thể báo nghỉ buổi học đang diễn ra hoặc đã hoàn thành.', 409);
  }
  item.status = 'CANCELLED';
  item.cancellationReason = rules.text(req.body.reason, 200) || 'Nghỉ theo kế hoạch';
  item.cancellationNote = rules.text(req.body.note, 500) || '';
  item.cancelledBy = req.user._id;
  item.cancelledAt = new Date();
  await item.save();
  res.json({ success: true, data: item });
});

exports.restoreCancelledSession = wrap(async (req, res) => {
  const item = await sessionFor(req, true, false);
  if (item.status !== 'CANCELLED') fail('Buổi học không ở trạng thái báo nghỉ.', 409);
  await ClassroomSession.deleteOne({ _id: item._id });
  res.json({ success: true, message: 'Đã hủy báo nghỉ thành công.' });
});
