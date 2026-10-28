const { Assignment, User, Lesson, Activity } = require('../models');
const access = require('../services/teacherAccess');
const rules = require('../services/teacherRules');
const homework = require('../services/teacherAssignments');
const inbox = require('../services/parentInbox');
const { fail, idOf, validId } = rules;
const scope = req => req.user.role === 'ADMIN' ? {} : { teacher: req.user._id };
const wrap = handler => async (req, res, next) => { try { await handler(req, res); } catch (error) { next(error); } };
async function owned(req, id = req.params.id) {
  if (!validId(id)) fail('Mã bài giao không hợp lệ.');
  const item = await Assignment.findOne({ _id: id, ...scope(req) });
  if (!item) fail('Không tìm thấy bài giao được phân công.', 403);
  const room = await access.classroom(req, item.classRoom);
  return { item, room };
}
exports.createAssignment = wrap(async (req, res) => {
  const b = req.body;
  const room = await access.classroom(req, b.classRoomId, true);
  if (!['CLASS', 'STUDENT'].includes(b.assignedToType || 'CLASS') || !validId(b.lessonId)) fail('Đối tượng hoặc bài học không hợp lệ.');
  const lesson = await Lesson.findOne({ _id: b.lessonId, status: 'ACTIVE' });
  if (!lesson) fail('Bài học đã bị ẩn hoặc không tồn tại.');
  if (lesson.ageGroupCode && room.ageGroupCode && lesson.ageGroupCode !== room.ageGroupCode) fail('Bài giao không phù hợp nhóm tuổi của lớp.');
  if (b.activityId && (!validId(b.activityId) || !await Activity.exists({ _id: b.activityId, lesson: b.lessonId, status: 'ACTIVE' }))) fail('Hoạt động không thuộc bài học hoặc đã bị ẩn.');
  const activitySnapshot = await Activity.find({ lesson: b.lessonId, status: 'ACTIVE', ...(b.activityId ? { _id: b.activityId } : {}) }).distinct('_id');
  if (!activitySnapshot.length) fail('Bài học chưa có hoạt động đang mở để giao bài.');
  const target = b.assignedToType || 'CLASS';
  if (target === 'STUDENT' && !room.students.some(s => idOf(s) === b.studentId)) fail('Học sinh không thuộc lớp.');
  const recipients = target === 'STUDENT' ? [b.studentId] : room.students;
  if (!recipients.length) fail('Lớp chưa có học sinh để giao bài.');
  const item = await Assignment.create({ teacher: req.user._id, classRoom: room._id, assignedToType: target,
    student: target === 'STUDENT' ? b.studentId : null, recipients, activitySnapshot, lesson: b.lessonId, activity: b.activityId || null,
    ...rules.assignmentDates(b.startDate, b.dueDate), instructions: rules.text(b.instructions) });
  res.status(201).json({ success: true, data: item });
});
exports.getAssignments = wrap(async (req, res) => {
  const permitted = await require('../models').ClassRoom.find(access.classScope(req)).distinct('_id');
  const q = { ...scope(req), classRoom: { $in: permitted } };
  if (req.query.classRoomId) { await access.classroom(req, req.query.classRoomId); q.classRoom = req.query.classRoomId; }
  if (req.query.status) {
    if (!['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(req.query.status)) fail('Trạng thái bài giao không hợp lệ.');
    q.status = req.query.status;
  }
  const data = await Assignment.find(q).populate('classRoom', 'name students').populate('student', 'name avatar avatarUrl').populate('lesson', 'title').populate('activity', 'title activityType').sort({ createdAt: -1 });
  res.json({ success: true, count: data.length, data });
});
exports.getAssignment = wrap(async (req, res) => {
  const { item, room } = await owned(req);
  // Transfer of a student must not expose that child's subsequent work to a former teacher.
  const ids = homework.recipients(item, room).filter(id => room.students.some(s => idOf(s) === id));
  const students = await User.find({ _id: { $in: ids }, role: 'CHILD' }).select('name username avatar avatarUrl').lean();
  const { data: studentSubmissions, results } = await homework.submissions(item, students);
  await item.populate('classRoom', 'name ageGroupCode'); await item.populate('student', 'name username avatar avatarUrl');
  await item.populate('lesson', 'title vietnameseTitle'); await item.populate('activity', 'title activityType instructions passingScore maxScore');
  const submitted = studentSubmissions.filter(s => s.hasSubmitted);
  res.json({ success: true, data: { assignment: item, results, studentSubmissions, stats: {
    totalStudents: students.length, submittedStudents: submitted.length, unsubmittedStudents: students.length - submitted.length,
    submissionRate: students.length ? Math.round(100 * submitted.length / students.length) : 0,
    averageScore: submitted.length ? Math.round(submitted.reduce((n, s) => n + s.submission.score, 0) / submitted.length) : 0
  } } });
});
exports.reviewAssignmentSubmission = wrap(async (req, res) => {
  const { assignmentId, childId } = req.params;
  const { item, room } = await owned(req, assignmentId);
  if (item.status === 'CANCELLED') fail('Bài giao đã được hủy.', 409);
  if (!validId(childId) || !homework.recipients(item, room).includes(childId) || !room.students.some(s => idOf(s) === childId)) fail('Học sinh không thuộc đối tượng của bài giao.', 403);
  const comment = rules.text(req.body.comment);
  const bonusStars = req.body.bonusStars ?? 0;
  if (!Number.isInteger(bonusStars) || bonusStars < 0 || bonusStars > 5) fail('Sao động viên phải là số nguyên từ 0 đến 5.');
  if (!comment) fail('Vui lòng viết nhận xét cụ thể cho học sinh.');
  const student = await access.child(req, childId);
  const { data } = await homework.submissions(item, [student]);
  const submission = data[0];
  if (!submission?.hasSubmitted) fail('Học sinh chưa hoàn thành đầy đủ bài được giao.');
  const feedback = { child: childId, result: submission.submission._id, comment, bonusStars, reviewedAt: new Date(), teacher: req.user._id };
  // One atomic replacement per (assignment, child). Editing a review replaces its award.
  const matchingReview = { $filter: { input: { $ifNull: ['$reviews', []] }, as: 'review', cond: { $eq: ['$$review.child', student._id] } } };
  const newReview = { $let: { vars: { previous: { $arrayElemAt: [matchingReview, 0] } }, in: {
    $mergeObjects: [{ $literal: { ...feedback, child: student._id, teacher: req.user._id } },
      { revision: { $add: [{ $ifNull: ['$$previous.revision', 0] }, 1] } }]
  } } };
  const reviewExpression = { $concatArrays: [ { $filter: { input: { $ifNull: ['$reviews', []] }, as: 'review', cond: { $ne: ['$$review.child', student._id] } } }, [newReview] ] };
  const saved = await Assignment.findOneAndUpdate({ _id: item._id, status: { $ne: 'CANCELLED' }, ...scope(req) }, [{ $set: { reviews: reviewExpression, updatedAt: new Date() } }], { new: true });
  if (!saved) fail('Bài giao vừa thay đổi. Vui lòng tải lại.', 409);
  const savedReview = saved.reviews.find(review => idOf(review.child) === childId);
  let notification = null;
  if (req.body.notifyParent !== false) {
    const note = `Nhận xét bài tập: ${comment}${bonusStars ? ' (Sao động viên: ' + bonusStars + ')' : ''}`;
    notification = await inbox.publish({ sourceKey: `assignment:${item._id}:${childId}`, sourceRevision: savedReview.revision,
      teacher: req.user._id, child: childId, childName: student.name, className: room.name,
      subject: 'Nhận xét bài tập', content: note, teacherNote: note, stars: bonusStars,
      score: submission.submission.score, templateType: 'GENERAL', status: 'SENT', channel: 'IN_APP', sentAt: new Date()
    });
  }
  res.json({ success: true, data: { result: { ...submission.submission, teacherFeedback: savedReview }, notification } });
});
exports.deleteAssignment = wrap(async (req, res) => {
  const { item } = await owned(req);
  await Assignment.updateOne({ _id: item._id }, { $set: { status: 'CANCELLED' } });
  res.json({ success: true, message: 'Bài giao đã được hủy. Kết quả và nhận xét vẫn được lưu trong lịch sử.' });
});
exports.updateAssignment = wrap(async (req, res) => {
  const { item } = await owned(req);
  if (['COMPLETED', 'CANCELLED'].includes(item.status)) fail('Bài giao đã đóng, không thể sửa.', 409);
  if (item.reviews?.length && req.body.startDate !== undefined) {
    const nextStart = rules.assignmentDates(req.body.startDate, req.body.dueDate === undefined ? item.dueDate : req.body.dueDate).startDate;
    if ((nextStart?.getTime() ?? null) !== (item.startDate?.getTime() ?? null)) fail('Bài đã có nhận xét, không thể đổi ngày bắt đầu và phạm vi bài làm.', 409);
  }
  Object.assign(item, rules.assignmentDates(req.body.startDate === undefined ? item.startDate : req.body.startDate, req.body.dueDate === undefined ? item.dueDate : req.body.dueDate));
  if (req.body.instructions !== undefined) item.instructions = rules.text(req.body.instructions);
  await item.save(); res.json({ success: true, data: item });
});
exports.updateAssignmentStatus = wrap(async (req, res) => {
  const { item } = await owned(req);
  if (!['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(req.body.status)) fail('Trạng thái bài giao không hợp lệ.');
  item.status = req.body.status; await item.save(); res.json({ success: true, data: item });
});
