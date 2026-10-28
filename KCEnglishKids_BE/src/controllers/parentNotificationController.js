const { ParentNotification, ClassroomSession, ClassRoom, VocabularyMastery } = require('../models');
const access = require('../services/teacherAccess');
const rules = require('../services/teacherRules');
const inbox = require('../services/parentInbox');
const { validId, idOf, fail } = rules;
const bad = (res, message) => res.status(400).json({ success: false, message });
const scope = req => req.user.role === 'ADMIN' ? {} : { teacher: req.user._id };
const wrap = handler => async (req, res, next) => { try { await handler(req, res); } catch (error) { next(error); } };
async function prepare(req, body) {
  const child = await access.child(req, body.childId);
  const templateType = body.templateType || (body.sessionId ? 'SESSION_REPORT' : 'GENERAL');
  if (!['SESSION_REPORT', 'PROGRESS_UPDATE', 'GENERAL'].includes(templateType)) fail('Loại thông báo không hợp lệ.');
  const teacherNote = rules.text(body.teacherNote);
  if (templateType !== 'SESSION_REPORT' && !teacherNote) fail('Vui lòng nhập lời nhắn cho phụ huynh.');
  let session = null, row = null;
  if (body.sessionId) {
    if (!validId(body.sessionId)) fail('Mã buổi học không hợp lệ.');
    session = await ClassroomSession.findOne({ _id: body.sessionId, ...scope(req), status: 'COMPLETED' }).populate('classroom', 'name');
    if (!session) fail('Chỉ gửi báo cáo cho buổi dạy đã kết thúc và được phân công.', 403);
    await access.classroom(req, session.classroom?._id);
    row = session.studentScores.find(item => idOf(item.student) === idOf(child));
    if (!row) fail('Học sinh không thuộc buổi dạy.', 403);
  }
  if (templateType === 'SESSION_REPORT' && !session) fail('Báo cáo buổi học cần liên kết một buổi dạy đã kết thúc.');
  const room = session?.classroom || (child.assignedClass ? await ClassRoom.findById(child.assignedClass).select('name') : null);
  const accuracy = row && rules.present(row) ? rules.accuracy(row) : null;
  const mastery = templateType === 'PROGRESS_UPDATE' ? await VocabularyMastery.find({ student: child._id }).select('masteryLevel') : [];
  const stars = row && rules.present(row) ? row.stars : 0;
  const lines = [templateType === 'SESSION_REPORT' ? 'Thông tin buổi học của ' + child.name : 'Trao đổi về ' + child.name];
  if (session) {
    lines.push('Lớp: ' + (room?.name || '—'), 'Buổi học: ' + session.title,
      !rules.present(row) ? 'Học sinh vắng mặt trong buổi học.' : accuracy === null ? 'Chưa có đủ câu trả lời để tính độ đúng.' : 'Độ đúng qua các câu đã trả lời: ' + accuracy + '%',
      'Sao động viên trong buổi: ' + stars);
  }
  if (mastery.length) lines.push('Từ vựng đã vững: ' + mastery.filter(item => item.masteryLevel === 3).length + '/' + mastery.length + ' từ đã luyện.');
  if (teacherNote) lines.push(teacherNote);
  return { teacher: req.user._id, child: child._id, session: session?._id || null,
    childName: child.name, className: room?.name || '', sessionDate: session?.startedAt || null,
    recipientContact: child.parentContact || child.contact || child.phone || '',
    subject: rules.text(body.subject, 200) || (session ? 'Báo cáo buổi học' : 'Trao đổi cùng gia đình'),
    teacherNote, content: lines.join('\n'), templateType, score: accuracy ?? 0, accuracy: accuracy ?? 0, stars,
    vocabTotal: mastery.length, vocabMastered: mastery.filter(item => item.masteryLevel === 3).length,
    status: 'SENT', channel: 'IN_APP', sentAt: new Date(),
    ...(session ? { sourceKey: 'session:' + session._id + ':' + child._id } : {}) };
}
async function deliver(values) {
  // Delivery is the parent inbox inside this app. No email/SMS transport is configured.
  return inbox.publish(values);
}
exports.sendNotification = wrap(async (req, res) => {
  const data = await deliver(await prepare(req, req.body));
  res.status(201).json({ success: true, channel: 'IN_APP', data });
});
exports.sendBulkNotifications = wrap(async (req, res) => {
  const reports = req.body.childReports;
  if (!Array.isArray(reports) || !reports.length || reports.length > 200 || new Set(reports.map(row => row?.childId)).size !== reports.length) fail('Danh sách người nhận không hợp lệ hoặc bị lặp (tối đa 200).');
  if (!req.body.sessionId) fail('Gửi báo cáo hàng loạt cần liên kết buổi dạy.');
  // Validate the whole batch before writing; stable source keys make a retry safe after a partial outage.
  const values = [];
  for (const report of reports) values.push(await prepare(req, { ...report, sessionId: req.body.sessionId, templateType: req.body.templateType || 'SESSION_REPORT' }));
  const data = [];
  for (const value of values) data.push(await deliver(value));
  res.status(201).json({ success: true, count: data.length, channel: 'IN_APP', data });
});
exports.getNotifications = wrap(async (req, res) => {
  const ids = await access.studentIds(req);
  const q = { ...scope(req), child: { $in: ids } };
  if (req.query.childId) { await access.child(req, req.query.childId); q.child = req.query.childId; }
  const data = await ParentNotification.find(q).populate('child', 'name avatar avatarUrl').populate('teacher', 'name avatar').populate('session', 'title startedAt').sort({ createdAt: -1 });
  res.json({ success: true, count: data.length, data });
});
exports.getChildNotifications = wrap(async (req, res) => {
  await access.child(req, req.params.childId);
  const data = await ParentNotification.find({ child: req.params.childId, ...scope(req) }).populate('teacher', 'name avatar').populate('session', 'title startedAt').sort({ createdAt: -1 });
  res.json({ success: true, count: data.length, data });
});
exports.replyAsTeacher = wrap(async (req, res) => {
  if (!validId(req.params.id)) fail('Mã trao đổi không hợp lệ.');
  const message = rules.text(req.body.message);
  if (!message) fail('Vui lòng nhập lời nhắn.');
  const thread = await ParentNotification.findOne({ _id: req.params.id, ...scope(req) });
  if (!thread) fail('Không tìm thấy trao đổi được phân công.', 403);
  await access.child(req, thread.child);
  const data = await ParentNotification.findOneAndUpdate({ _id: thread._id, ...scope(req) }, { $push: { replies: { senderRole: 'TEACHER', senderName: req.user.name, message, createdAt: new Date() } } }, { new: true, runValidators: true });
  res.json({ success: true, data });
});

exports.getChildNotificationsForParent = async (req, res, next) => {
  try {
    const { childId } = req.params;
    if (!validId(childId)) return bad(res, 'Invalid childId.');

    const data = await ParentNotification.find({ child: childId, status: 'SENT' })
      .populate('teacher', 'name email avatar')
      .populate('session', 'title startedAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: data.length, data });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/children/:childId/parent-notifications/:id/reply
// Parent sends a reply / message to the teacher
// ─────────────────────────────────────────────────────────────────────────────
exports.replyAsParent = async (req, res, next) => {
  try {
    const { childId, id } = req.params;
    if (req.user.role !== 'CHILD' || idOf(req.user._id) !== childId) return res.status(403).json({ success: false, message: 'Chỉ tài khoản gia đình của học sinh mới được phản hồi với vai trò phụ huynh.' });
    const { message, parentName } = req.body;
    if (!validId(childId) || !validId(id)) return bad(res, 'Invalid IDs.');
    const cleanMessage = rules.text(message);
    if (!cleanMessage) return bad(res, 'Message is required.');
    const notif = await ParentNotification.findOneAndUpdate({ _id: id, child: childId, status: 'SENT' }, { $push: { replies: {
      senderRole: 'PARENT',
      senderName: rules.text(parentName, 100) || 'Phụ huynh',
      message: cleanMessage,
      createdAt: new Date()
    } } }, { new: true, runValidators: true });
    if (!notif) return bad(res, 'Notification not found.');

    res.json({ success: true, data: notif });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/children/:childId/parent-notifications/:id/read
// Parent marks notification as read
// ─────────────────────────────────────────────────────────────────────────────
exports.markAsReadByParent = async (req, res, next) => {
  try {
    const { childId, id } = req.params;
    if (req.user.role !== 'CHILD' || idOf(req.user._id) !== childId) return res.status(403).json({ success: false, message: 'Chỉ tài khoản gia đình của học sinh mới được xác nhận đã đọc.' });
    if (!validId(childId) || !validId(id)) return bad(res, 'Invalid IDs.');

    const notif = await ParentNotification.findOneAndUpdate(
      { _id: id, child: childId },
      { readAt: new Date() },
      { new: true }
    );
    if (!notif) return bad(res, 'Notification not found.');

    res.json({ success: true, data: notif });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
