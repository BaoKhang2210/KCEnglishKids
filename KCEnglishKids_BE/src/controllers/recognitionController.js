const mongoose = require('mongoose');
const ClassRoom = require('../models/ClassRoom');
const ClassroomSession = require('../models/ClassroomSession');
const User = require('../models/User');
const ClassRecognition = require('../models/ClassRecognition');
const SchoolRecognition = require('../models/SchoolRecognition');
const { HomePracticeCompletion, UnitCompletion, Progress, Assignment } = require('../models');
const { recognitionPeriod, rewardFor, rankClassroomStars, rankSchoolStars } = require('../services/recognitionRules');
const { statsFor } = require('../services/teacherStatistics');

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

async function periodHomeStars(studentIds, period) {
  if (!studentIds || !studentIds.length) return new Map();

  const [homePractices, unitCompletions, progressDocs, assignmentReviews] = await Promise.all([
    HomePracticeCompletion && typeof HomePracticeCompletion.aggregate === 'function'
      ? HomePracticeCompletion.aggregate([
          {
            $match: {
              child: { $in: studentIds },
              $or: [
                { completedAt: { $gte: period.start, $lt: period.end } },
                { date: { $gte: period.date, $lte: period.lastDate } }
              ]
            }
          },
          {
            $group: {
              _id: '$child',
              stars: { $sum: '$stars' }
            }
          }
        ])
      : Promise.resolve([]),

    UnitCompletion && typeof UnitCompletion.aggregate === 'function'
      ? UnitCompletion.aggregate([
          {
            $match: {
              child: { $in: studentIds },
              completedAt: { $gte: period.start, $lt: period.end }
            }
          },
          { $unwind: '$rewards' },
          { $match: { 'rewards.type': 'STAR' } },
          {
            $group: {
              _id: '$child',
              stars: { $sum: '$rewards.amount' }
            }
          }
        ])
      : Promise.resolve([]),

    Progress && typeof Progress.find === 'function'
      ? Progress.find({
          child: { $in: studentIds },
          completed: true,
          $or: [
            { 'completionSnapshot.recordedAt': { $gte: period.start, $lt: period.end } },
            { lastActivityAt: { $gte: period.start, $lt: period.end } },
            { updatedAt: { $gte: period.start, $lt: period.end } }
          ]
        }).select('child stars').lean()
      : Promise.resolve([]),

    Assignment && typeof Assignment.aggregate === 'function'
      ? Assignment.aggregate([
          { $match: { 'reviews.child': { $in: studentIds } } },
          { $unwind: '$reviews' },
          {
            $match: {
              'reviews.child': { $in: studentIds },
              'reviews.reviewedAt': { $gte: period.start, $lt: period.end },
              'reviews.bonusStars': { $gt: 0 }
            }
          },
          {
            $group: {
              _id: '$reviews.child',
              stars: { $sum: '$reviews.bonusStars' }
            }
          }
        ])
      : Promise.resolve([])
  ]);

  const map = new Map();
  for (const id of studentIds) {
    map.set(String(id), 0);
  }

  for (const hp of homePractices || []) {
    const cid = String(hp._id || hp.child);
    if (map.has(cid)) {
      map.set(cid, map.get(cid) + (Number(hp.stars) || Number(hp.homePracticeStars) || 0));
    }
  }

  for (const uc of unitCompletions || []) {
    const cid = String(uc._id || uc.child);
    if (map.has(cid)) {
      map.set(cid, map.get(cid) + (Number(uc.stars) || 0));
    }
  }

  for (const p of progressDocs || []) {
    const cid = String(p.child);
    if (map.has(cid)) {
      map.set(cid, map.get(cid) + (Number(p.stars) || 0));
    }
  }

  for (const ar of assignmentReviews || []) {
    const cid = String(ar._id || ar.child);
    if (map.has(cid)) {
      map.set(cid, map.get(cid) + (Number(ar.stars) || 0));
    }
  }

  return map;
}

async function calculate(classroom, period) {
  const students = await User.find({ _id: { $in: classroom.students }, role: 'CHILD', status: 'ACTIVE' }).select('name avatarUrl').lean();
  const studentIds = students.map(s => s._id);
  const [sessions, statsList, homeStarsMap] = await Promise.all([
    ClassroomSession.find({
      classroom: classroom._id, status: 'COMPLETED',
      endedAt: { $gte: period.start, $lt: period.end }
    }).select('status studentScores endedAt startedAt').lean(),
    statsFor(studentIds),
    periodHomeStars(studentIds, period)
  ]);
  const statsMap = new Map((statsList || []).map(s => [String(s._id), s]));
  const studentsWithTotal = students.map(s => ({
    ...s,
    className: classroom.name,
    totalStars: statsMap.get(String(s._id))?.totalStars || 0,
    homeStars: homeStarsMap.get(String(s._id)) || 0
  }));
  return rankClassroomStars(studentsWithTotal, sessions);
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
      const winners = ranking.filter(row => row.winner).map(({ child, name, stars, totalStars }) => ({ child, name, stars: stars || totalStars }));
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
    const lists = await Promise.all([ClassRecognition, SchoolRecognition].map(Model => Model.find({ 'winners.child': req.user._id })
      .select('className kind periodStart periodEnd publishedAt reward winners')
      .sort({ publishedAt: -1 }).limit(100).lean()));
    const documents = lists.flat().sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 100);
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
    const Model = await SchoolRecognition.exists({ _id: req.params.id, 'winners.child': req.user._id }) ? SchoolRecognition : ClassRecognition;
    const result = await Model.updateOne({
      _id: new mongoose.Types.ObjectId(req.params.id),
      winners: { $elemMatch: { child: req.user._id, readAt: null } }
    }, { $set: { 'winners.$.readAt': new Date() } });
    if (!result.matchedCount) {
      const own = await Model.exists({ _id: req.params.id, 'winners.child': req.user._id });
      if (!own) return fail(res, 404, 'Không tìm thấy vinh danh.');
    }
    res.json({ success: true });
  } catch (error) { next(error); }
};

async function schoolRanking(period) {
  const students = await User.find({ role: 'CHILD', status: 'ACTIVE' })
    .select('name avatarUrl assignedClass')
    .populate('assignedClass', 'name')
    .lean();
  const studentIds = students.map(s => s._id);
  const [sessions, statsList, homeStarsMap] = await Promise.all([
    ClassroomSession.find({
      status: 'COMPLETED',
      endedAt: { $gte: period.start, $lt: period.end }
    }).select('status studentScores endedAt startedAt').lean(),
    statsFor(studentIds),
    periodHomeStars(studentIds, period)
  ]);
  const statsMap = new Map((statsList || []).map(s => [String(s._id), s]));
  const studentsWithTotal = students.map(s => ({
    ...s,
    className: s.assignedClass?.name || 'Chưa phân lớp',
    totalStars: statsMap.get(String(s._id))?.totalStars || 0,
    homeStars: homeStarsMap.get(String(s._id)) || 0
  }));
  return { minimumSessions: 0, ranking: rankSchoolStars(studentsWithTotal, sessions) };
}
const schoolKey = period => ({ kind: period.kind, periodStart: period.start });
exports.schoolPreview = async (req, res, next) => {
  try {
    const period = periodFor(req, res);
    if (!period) return;
    const published = await SchoolRecognition.findOne(schoolKey(period)).lean();
    const result = published || await schoolRanking(period);
    res.json({ success: true, data: {
      className: 'Toàn trường', period, ranking: result.ranking, minimumSessions: result.minimumSessions,
      reward: published?.reward || rewardFor(period.kind),
      published: published ? { _id: published._id, publishedAt: published.publishedAt } : null,
      canPublish: !published && period.end <= new Date() && result.ranking.some(row => row.winner)
    } });
  } catch (error) { next(error); }
};
exports.schoolPublish = async (req, res, next) => {
  try {
    const period = periodFor(req, res);
    if (!period) return;
    if (period.end > new Date()) return fail(res, 400, 'Chỉ công bố khi kỳ đã kết thúc.');
    const key = schoolKey(period);
    let published = await SchoolRecognition.findOne(key).lean();
    if (!published) {
      const { ranking, minimumSessions } = await schoolRanking(period);
      const winners = ranking.filter(row => row.winner).map(({ child, name, stars, totalStars, sessions, starsPerSession }) => ({ child, name, stars: stars || totalStars, sessions, starsPerSession }));
      if (!winners.length) return fail(res, 400, 'Chưa có học sinh có sao hợp lệ để vinh danh.');
      try {
        published = await SchoolRecognition.create({ ...key, className: 'Toàn trường', periodEnd: period.end,
          publishedBy: req.user._id, minimumSessions, reward: rewardFor(period.kind), ranking, winners });
      } catch (error) {
        if (error.code !== 11000) throw error;
        published = await SchoolRecognition.findOne(key).lean();
      }
    }
    res.json({ success: true, data: published });
  } catch (error) { next(error); }
};
