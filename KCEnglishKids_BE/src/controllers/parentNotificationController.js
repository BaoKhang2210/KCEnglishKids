const mongoose = require('mongoose');
const { ParentNotification, ClassroomSession, User, ClassRoom } = require('../models');

const validId = (id) => mongoose.isValidObjectId(id);
const bad = (res, msg) => res.status(400).json({ success: false, message: msg });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher/parent-notifications
// Teacher sends a learning report for one child
// Body: {
//   childId, sessionId?, teacherNote?, templateType?,
//   score?, vocabMastered?, vocabTotal?, stars?, accuracy?
// }
// ─────────────────────────────────────────────────────────────────────────────
exports.sendNotification = async (req, res, next) => {
  try {
    const {
      childId,
      sessionId,
      teacherNote = '',
      templateType = 'SESSION_REPORT',
      score = 0,
      vocabMastered = 0,
      vocabTotal = 0,
      stars = 0,
      accuracy = 0
    } = req.body;

    if (!validId(childId)) return bad(res, 'Valid childId is required.');

    // Load child to get name + contact
    const child = await User.findOne({
      _id: childId,
      role: 'CHILD',
      status: 'ACTIVE'
    }).select('name contact phone parentContact assignedClass');

    if (!child) return bad(res, 'Child not found.');

    const recipientContact =
      child.parentContact || child.contact || child.phone || '';

    // Load class name
    let className = '';
    if (child.assignedClass) {
      const cls = await ClassRoom.findById(child.assignedClass).select('name');
      className = cls ? cls.name : '';
    }

    // Load session info
    let session = null;
    let sessionDate = new Date();
    if (sessionId && validId(sessionId)) {
      session = await ClassroomSession.findById(sessionId).select(
        'title startedAt summary'
      );
      if (session && session.startedAt) sessionDate = session.startedAt;
    }

    // Build content from template
    const content = buildContent({
      templateType,
      childName: child.name,
      className,
      score,
      vocabMastered,
      vocabTotal,
      stars,
      accuracy,
      teacherNote,
      sessionDate
    });

    const notification = await ParentNotification.create({
      teacher: req.user._id,
      child: childId,
      session: session ? session._id : null,
      recipientContact,
      childName: child.name,
      className,
      sessionDate,
      subject: `Learning Update — ${child.name}`,
      content,
      teacherNote,
      score,
      vocabMastered,
      vocabTotal,
      stars,
      accuracy,
      templateType,
      status: 'SENT',
      sentAt: new Date()
    });

    res.status(201).json({ success: true, data: notification });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/teacher/parent-notifications/bulk
// Send reports for multiple children at once (after a session ends)
// Body: {
//   sessionId,
//   childReports: [{ childId, score, vocabMastered, stars, accuracy, teacherNote }]
// }
// ─────────────────────────────────────────────────────────────────────────────
exports.sendBulkNotifications = async (req, res, next) => {
  try {
    const { sessionId, childReports = [], templateType = 'SESSION_REPORT' } = req.body;

    if (!Array.isArray(childReports) || childReports.length === 0)
      return bad(res, 'childReports array is required.');

    const session = sessionId && validId(sessionId)
      ? await ClassroomSession.findById(sessionId).select('title startedAt classroom')
      : null;

    let classroomName = '';
    if (session && session.classroom) {
      const cls = await ClassRoom.findById(session.classroom).select('name');
      classroomName = cls ? cls.name : '';
    }

    const sessionDate = session?.startedAt || new Date();
    const created = [];

    for (const report of childReports) {
      if (!validId(report.childId)) continue;
      const child = await User.findOne({
        _id: report.childId,
        role: 'CHILD'
      }).select('name contact phone parentContact assignedClass');
      if (!child) continue;

      const recipientContact =
        child.parentContact || child.contact || child.phone || '';
      const className = classroomName;

      const content = buildContent({
        templateType,
        childName: child.name,
        className,
        score: report.score || 0,
        vocabMastered: report.vocabMastered || 0,
        vocabTotal: report.vocabTotal || 0,
        stars: report.stars || 0,
        accuracy: report.accuracy || 0,
        teacherNote: report.teacherNote || '',
        sessionDate
      });

      const n = await ParentNotification.create({
        teacher: req.user._id,
        child: report.childId,
        session: session ? session._id : null,
        recipientContact,
        childName: child.name,
        className,
        sessionDate,
        subject: `Learning Update — ${child.name}`,
        content,
        teacherNote: report.teacherNote || '',
        score: report.score || 0,
        vocabMastered: report.vocabMastered || 0,
        vocabTotal: report.vocabTotal || 0,
        stars: report.stars || 0,
        accuracy: report.accuracy || 0,
        templateType,
        status: 'SENT',
        sentAt: new Date()
      });
      created.push(n);
    }

    res.status(201).json({
      success: true,
      message: `${created.length} notifications sent.`,
      data: created
    });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher/parent-notifications
// List all notifications sent by this teacher
// ─────────────────────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const q = { teacher: req.user._id };
    if (req.query.childId && validId(req.query.childId))
      q.child = req.query.childId;

    const data = await ParentNotification.find(q)
      .populate('child', 'name avatar avatarUrl')
      .populate('session', 'title startedAt')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: data.length, data });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher/parent-notifications/child/:childId
// Notifications for a specific child
// ─────────────────────────────────────────────────────────────────────────────
exports.getChildNotifications = async (req, res, next) => {
  try {
    const { childId } = req.params;
    if (!validId(childId)) return bad(res, 'Invalid childId.');

    const data = await ParentNotification.find({
      teacher: req.user._id,
      child: childId
    })
      .populate('session', 'title startedAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: data.length, data });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Template builder (rule-based, no AI)
// ─────────────────────────────────────────────────────────────────────────────
function buildContent({
  templateType,
  childName,
  className,
  score,
  vocabMastered,
  vocabTotal,
  stars,
  accuracy,
  teacherNote,
  sessionDate
}) {
  const dateStr = sessionDate
    ? new Date(sessionDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

  if (templateType === 'SESSION_REPORT') {
    return [
      `📚 Learning Update for ${childName}`,
      `Class: ${className || '—'}`,
      `Date: ${dateStr}`,
      '',
      `⭐ Stars earned: ${stars}`,
      `✅ Score: ${score}%`,
      `📖 Vocabulary mastered: ${vocabMastered} / ${vocabTotal}`,
      `🎯 Accuracy: ${accuracy}%`,
      '',
      teacherNote ? `Teacher's note: "${teacherNote}"` : '',
      '',
      '— Little Steps English'
    ]
      .filter((l) => l !== null)
      .join('\n');
  }

  if (templateType === 'PROGRESS_UPDATE') {
    return [
      `📊 Progress Update for ${childName}`,
      `Date: ${dateStr}`,
      '',
      `Vocabulary mastered: ${vocabMastered} / ${vocabTotal} words`,
      `Overall accuracy: ${accuracy}%`,
      '',
      teacherNote || '',
      '— Little Steps English'
    ]
      .filter((l) => l !== null)
      .join('\n');
  }

  // GENERAL
  return [
    `Hello! Here is an update about ${childName}'s learning.`,
    '',
    teacherNote || '',
    '',
    '— Little Steps English'
  ].join('\n');
}
