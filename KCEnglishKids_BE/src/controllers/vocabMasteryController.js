const mongoose = require('mongoose');
const { VocabularyMastery, User, Vocabulary } = require('../models');
const { calculateMasteryLevel } = require('../models/VocabularyMastery');

const validId = (id) => mongoose.isValidObjectId(id);

async function requireChild(req, childId) {
  if (!validId(childId)) throw Object.assign(new Error('Invalid childId.'), { statusCode: 400 });
  if (!['CHILD', 'TEACHER', 'ADMIN'].includes(req.user.role)) throw Object.assign(new Error('Access denied.'), { statusCode: 403 });
  if (req.user.role === 'CHILD' && String(req.user._id) !== String(childId)) throw Object.assign(new Error('Access denied.'), { statusCode: 403 });
  const child = req.user.role === 'CHILD'
    ? await User.findOne({ _id: childId, role: 'CHILD', status: 'ACTIVE' })
    : await require('../services/teacherAccess').child(req, childId);
  if (!child || child.status !== 'ACTIVE') throw Object.assign(new Error('Active child not found.'), { statusCode: 404 });
  return child;
}

async function requireVocabulary(ids) {
  const unique = [...new Set(ids.map(String))];
  if (unique.some(value => !validId(value))) throw Object.assign(new Error('Invalid vocabularyId.'), { statusCode: 400 });
  const count = await Vocabulary.countDocuments({ _id: { $in: unique }, status: 'ACTIVE' });
  if (count !== unique.length) throw Object.assign(new Error('Active vocabulary not found.'), { statusCode: 404 });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/children/:childId/vocabulary-mastery
// Get mastery records for a child (self or teacher view)
// ─────────────────────────────────────────────────────────────────────────────
exports.getChildMastery = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await requireChild(req, childId);
    if (!validId(childId))
      return res.status(400).json({ success: false, message: 'Invalid childId.' });

    // Only CHILD (self), TEACHER, or ADMIN can view
    if (
      req.user.role === 'CHILD' &&
      String(req.user._id) !== String(childId)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const records = await VocabularyMastery.find({ student: childId })
      .populate('vocabulary', 'english vietnamese imageUrl audioUrl category')
      .sort({ masteryLevel: -1, lastReviewedAt: -1 });

    const summary = {
      total: records.length,
      mastered: records.filter((r) => r.masteryLevel === 3).length,
      practicing: records.filter((r) => r.masteryLevel === 2).length,
      learning: records.filter((r) => r.masteryLevel === 1).length,
      notStarted: records.filter((r) => r.masteryLevel === 0).length
    };

    res.json({ success: true, summary, data: records });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/children/:childId/vocabulary-mastery
// Sync / upsert mastery records from frontend localStorage → DB
// Body: { records: [{ vocabularyId, correctCount, wrongCount, attemptCount, streak }] }
// ─────────────────────────────────────────────────────────────────────────────
exports.syncMastery = async (req, res, next) => {
  try {
    const { childId } = req.params;
    await requireChild(req, childId);
    if (!validId(childId))
      return res.status(400).json({ success: false, message: 'Invalid childId.' });

    // Only the child themselves or a TEACHER/ADMIN can sync
    if (
      req.user.role === 'CHILD' &&
      String(req.user._id) !== String(childId)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0 || records.length > 1000) {
      return res.status(400).json({ success: false, message: 'Records array is required.' });
    }

    if (new Set(records.map(r => r?.vocabularyId)).size !== records.length) return res.status(400).json({ success: false, message: 'Duplicate vocabulary records.' });
    await requireVocabulary(records.map(r => r?.vocabularyId));
    if (records.some(r => ['correctCount', 'wrongCount', 'attemptCount', 'streak'].some(key => !Number.isSafeInteger(r[key]) || r[key] < 0) || r.correctCount + r.wrongCount !== r.attemptCount || r.streak > r.correctCount)) {
      return res.status(400).json({ success: false, message: 'Practice counts must be consistent non-negative integers.' });
    }

    // Absolute counters from older clients cannot safely merge across devices.
    // Accept only an initial import. Existing counters are owned by event writes.
    const ops=records.map(r=>({updateOne:{filter:{student:childId,vocabulary:r.vocabularyId},update:{$setOnInsert:{correctCount:r.correctCount,wrongCount:r.wrongCount,attemptCount:r.attemptCount,streak:r.streak,masteryLevel:calculateMasteryLevel(r),lastReviewedAt:new Date()}},upsert:true}}));
    await VocabularyMastery.bulkWrite(ops);
    res.json({success:true,message:'Existing mastery is preserved. Use practice events for new answers.'});

  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/children/:childId/vocabulary-mastery/:vocabId/record
// Record a single practice result (correct / incorrect)
// Body: { isCorrect: boolean }
// ─────────────────────────────────────────────────────────────────────────────
exports.recordPractice = async (req, res, next) => {
  try {
    const { childId, vocabId } = req.params;
    await requireChild(req, childId);
    if (!validId(childId) || !validId(vocabId))
      return res.status(400).json({ success: false, message: 'Invalid IDs.' });

    const { isCorrect } = req.body;
    if (typeof isCorrect !== 'boolean') return res.status(400).json({ success: false, message: 'isCorrect must be a boolean.' });
    await requireVocabulary([vocabId]);
    const { independent = isCorrect, wrongAttempts = (isCorrect ? 0 : 1), activityType, sessionId } = req.body;
    if (typeof independent !== 'boolean' || !Number.isSafeInteger(wrongAttempts) || wrongAttempts < 0 || wrongAttempts > 20 || activityType != null && (typeof activityType !== 'string' || activityType.length > 40) || sessionId != null && (typeof sessionId !== 'string' || sessionId.length > 120)) {
      return res.status(400).json({ success: false, message: 'Invalid practice outcome metadata.' });
    }
    const submissionId = req.body.submissionId;
    if (typeof submissionId !== 'string' || !/^[a-zA-Z0-9_-]{8,120}$/.test(submissionId)) return res.status(400).json({ success: false, message: 'submissionId required.' });
    const Event=require('../models/MasteryEvent');
    // Capture the legacy baseline only once before accepting new events.
    await VocabularyMastery.updateOne({student:childId,vocabulary:vocabId},[
      {$set:{student:new mongoose.Types.ObjectId(childId),vocabulary:new mongoose.Types.ObjectId(vocabId),baselineCorrect:{$ifNull:['$baselineCorrect',{$ifNull:['$correctCount',0]}]},baselineWrong:{$ifNull:['$baselineWrong',{$ifNull:['$wrongCount',0]}]}}}
    ],{upsert:true,updatePipeline:true});
    let event;
    const eventData = { vocabulary: vocabId, isCorrect, independent, wrongAttempts, activityType, sessionId };
    try { event = await Event.findOneAndUpdate({ child: childId, submissionId }, { $setOnInsert: eventData }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }); }
    catch(error){if(error.code!==11000)throw error;event=await Event.findOne({child:childId,submissionId});}
    if (String(event.vocabulary) !== String(vocabId) || event.isCorrect !== isCorrect || event.independent !== independent || event.wrongAttempts !== wrongAttempts || event.activityType !== activityType || event.sessionId !== sessionId) return res.status(409).json({ success: false, message: 'Submission key reused.' });
    const events=await Event.find({child:childId,vocabulary:vocabId}).sort({createdAt:1,_id:1}).lean();
    const baseline=await VocabularyMastery.findOne({student:childId,vocabulary:vocabId});
    const correctCount = (baseline.baselineCorrect || 0) + events.filter(e => e.isCorrect).length;
    const wrongCount = (baseline.baselineWrong || 0) + events.reduce((sum, e) => sum + (e.wrongAttempts ?? (e.isCorrect ? 0 : 1)), 0);
    const latestEvent = events.at(-1);
    let independentStreak = 0;
    const streakDays = new Set();
    const streakActivityTypes = new Set();
    for (const practice of [...events].reverse()) {
      if (!practice.isCorrect || practice.independent === false) break;
      independentStreak += 1;
      streakDays.add(new Date(practice.createdAt).toISOString().slice(0, 10));
      if (practice.activityType) streakActivityTypes.add(practice.activityType);
    }
    const masteryLevel = calculateMasteryLevel({
      masteryAlgorithmVersion: 2,
      attemptCount: correctCount + wrongCount,
      independentStreak,
      practiceDaysCount: streakDays.size,
      recentActivityTypes: [...streakActivityTypes],
    });
    const lastReviewedAt = latestEvent.createdAt;
    const needsReview = !latestEvent.isCorrect || latestEvent.independent === false || (latestEvent.wrongAttempts || 0) >= 2;
    const intervalDays = needsReview || masteryLevel < 3 ? 1 : streakDays.size >= 6 ? 7 : 3;
    const record = await VocabularyMastery.findOne({ student: childId, vocabulary: vocabId });
    record.correctCount = Math.max(record.correctCount || 0, correctCount);
    record.wrongCount = Math.max(record.wrongCount || 0, wrongCount);
    record.attemptCount = record.correctCount + record.wrongCount;
    record.streak = events.reduce((count, practice) => practice.isCorrect && practice.independent !== false ? count + 1 : 0, 0);
    record.independentStreak = independentStreak;
    record.practiceDaysCount = streakDays.size;
    record.recentActivityTypes = [...streakActivityTypes];
    record.needsReview = needsReview;
    record.masteryAlgorithmVersion = 2;
    record.masteryLevel = masteryLevel;
    if (!record.lastReviewedAt || new Date(record.lastReviewedAt) <= new Date(lastReviewedAt)) {
      record.lastReviewedAt = lastReviewedAt;
      record.nextReviewAt = new Date(new Date(lastReviewedAt).getTime() + intervalDays * 86400000);
    }
    await record.save();

    res.json({ success: true, data: record });
  } catch (e) {
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/teacher/students/:studentId/vocabulary-mastery
// Teacher views a student's vocabulary mastery
// ─────────────────────────────────────────────────────────────────────────────
exports.getStudentMastery = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    if (!validId(studentId))
      return res.status(400).json({ success: false, message: 'Invalid studentId.' });

    await require('../services/teacherAccess').child(req, studentId);

    const records = await VocabularyMastery.find({ student: studentId })
      .populate('vocabulary', 'english vietnamese imageUrl category')
      .sort({ masteryLevel: -1, lastReviewedAt: -1 });

    const summary = {
      total: records.length,
      mastered: records.filter((r) => r.masteryLevel === 3).length,
      practicing: records.filter((r) => r.masteryLevel === 2).length,
      learning: records.filter((r) => r.masteryLevel === 1).length,
      notStarted: records.filter((r) => r.masteryLevel === 0).length
    };

    res.json({ success: true, summary, data: records });
  } catch (e) {
    next(e);
  }
};
