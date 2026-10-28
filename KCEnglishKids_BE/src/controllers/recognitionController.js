const mongoose = require('mongoose');
const ClassRoom = require('../models/ClassRoom');
const ClassroomSession = require('../models/ClassroomSession');
const User = require('../models/User');
const ClassRecognition = require('../models/ClassRecognition');
const { recognitionPeriod, rewardFor, rankClassroomStars } = require('../services/recognitionRules');

const fail = (res, status, message) => res.status(status).json({ success: false, message });
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const scope = req => req.user.role === 'ADMIN' ? {} : { teacher: req.user._id };
async function classroomFor(req, res) {
  if (!validId(req.params.classId)) { fail(res, 400, 'Mã lớp không hợp lệ.'); return null; }
  const classroom = await ClassRoom.findOne({ _id: req.params.classId, deletionPending: { $ne: true }, ...scope(req) }).lean();
  if (!classroom) fail(res, 403, 'Bạn không có quyền quản lý lớp này.');
  return classroom;
}
function periodFor(req, res) {
  try {
    return recognitionPeriod(req.query.kind || req.body?.kind, req.query.date || req.body?.date);
  } catch (error) {
    fail(res, 400, error.message);
    return null;
  }
}
const keyFor = (classroom, period) => ({ classroom: classroom._id, kind: period.kind, periodStart: period.start });

async function calculate(classroom, period) {
  const [students, sessions] = await Promise.all([
    User.find({ _id: { $in: classroom.students }, role: 'CHILD', status: 'ACTIVE' }).select('name avatarUrl').lean(),
    ClassroomSession.find({
      classroom: classroom._id, status: 'COMPLETED',
      endedAt: { $gte: period.start, $lt: period.end }
    }).select('status studentScores').lean()
  ]);
  return rankClassroomStars(students, sessions);
}

exports.classes = async (req, res, next) => {
  try {
    const data = await ClassRoom.find({ ...scope(req), deletionPending: { $ne: true } }).select('name status').sort({ name: 1 }).lean();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.preview = async (req, res, next) => {
  try {
    const classroom = await classroomFor(req, res);
    if (!classroom) return;
    const period = periodFor(req, res);
    if (!period) return;
    const published = await ClassRecognition.findOne(keyFor(classroom, period)).lean();
    const ranking = published ? published.ranking : await calculate(classroom, period);
    res.json({ success: true, data: {
      period, className: classroom.name, ranking,
      reward: published?.reward || rewardFor(period.kind),
      published: published ? { _id: published._id, publishedAt: published.publishedAt } : null,
      canPublish: !published && period.end <= new Date() && ranking.some(row => row.winner)
    } });
  } catch (error) { next(error); }
};

exports.publish = async (req, res, next) => {
  try {
    const classroom = await classroomFor(req, res);
    if (!classroom) return;
    const period = periodFor(req, res);
    if (!period) return;
    if (period.end > new Date()) return fail(res, 400, 'Chỉ công bố khi kỳ đã kết thúc.');
    const key = keyFor(classroom, period);
    let published = await ClassRecognition.findOne(key).lean();
    if (!published) {
      const ranking = await calculate(classroom, period);
      const winners = ranking.filter(row => row.winner).map(({ child, name, stars }) => ({ child, name, stars }));
      if (!winners.length) return fail(res, 400, 'Kỳ này chưa có sao hợp lệ để vinh danh.');
      try {
        published = await ClassRecognition.create({
          ...key, periodEnd: period.end, className: classroom.name, publishedBy: req.user._id,
          reward: rewardFor(period.kind), ranking, winners
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        published = await ClassRecognition.findOne(key).lean();
      }
    }
    res.json({ success: true, data: published, message: 'Đã công bố và gửi vinh danh đến các bé.' });
  } catch (error) { next(error); }
};

exports.childInbox = async (req, res, next) => {
  try {
    // This inbox is for the authenticated child, never an arbitrary ID supplied by the client.
    const documents = await ClassRecognition.find({ 'winners.child': req.user._id })
      .select('className kind periodStart periodEnd publishedAt reward winners')
      .sort({ publishedAt: -1 }).limit(100).lean();
    const data = documents.map(doc => {
      const own = doc.winners.find(winner => String(winner.child) === String(req.user._id));
      return {
        _id: doc._id, className: doc.className, kind: doc.kind,
        periodStart: doc.periodStart, periodEnd: doc.periodEnd, publishedAt: doc.publishedAt,
        reward: doc.reward, name: own.name, stars: own.stars, readAt: own.readAt
      };
    });
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.read = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return fail(res, 400, 'Mã vinh danh không hợp lệ.');
    const result = await ClassRecognition.updateOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      winners: { $elemMatch: { child: req.user._id, readAt: null } }
    }, { $set: { 'winners.$.readAt': new Date() } });
    if (!result.matchedCount) {
      const own = await ClassRecognition.exists({ _id: req.params.id, 'winners.child': req.user._id });
      if (!own) return fail(res, 404, 'Không tìm thấy vinh danh.');
    }
    res.json({ success: true });
  } catch (error) { next(error); }
};
