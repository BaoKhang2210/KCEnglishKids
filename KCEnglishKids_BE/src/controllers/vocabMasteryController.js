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

    const ops = records
      .filter((r) => validId(r.vocabularyId))
      .map((r) => {
        const correctCount = Number(r.correctCount) || 0;
        const wrongCount = Number(r.wrongCount) || 0;
        const attemptCount = Number(r.attemptCount) || 0;
        const streak = Number(r.streak) || 0;
        const masteryLevel = calculateMasteryLevel({ correctCount, wrongCount, attemptCount, streak });

        return {
          updateOne: {
            filter: { student: childId, vocabulary: r.vocabularyId },
            update: {
              $set: {
                correctCount,
                wrongCount,
                attemptCount,
                streak,
                masteryLevel,
                lastReviewedAt: new Date()
              }
            },
            upsert: true
          }
        };
      });

    if (ops.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid records provided.' });
    }

    const result = await VocabularyMastery.bulkWrite(ops);

    res.json({
      success: true,
      message: `Synced ${ops.length} vocabulary mastery records.`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      }
    });
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
    const correct = isCorrect === true || isCorrect === 'true';

    let record = await VocabularyMastery.findOne({
      student: childId,
      vocabulary: vocabId
    });

    if (!record) {
      record = new VocabularyMastery({
        student: childId,
        vocabulary: vocabId
      });
    }

    record.attemptCount += 1;
    if (correct) {
      record.correctCount += 1;
      record.streak += 1;
    } else {
      record.wrongCount += 1;
      record.streak = 0; // reset streak on wrong
    }
    // masteryLevel auto-recalculated in pre-save hook
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
