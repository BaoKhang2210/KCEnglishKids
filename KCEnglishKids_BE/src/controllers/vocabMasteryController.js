const mongoose = require('mongoose');
const { VocabularyMastery, User, Vocabulary } = require('../models');
const { calculateMasteryLevel } = require('../models/VocabularyMastery');

const validId = (id) => mongoose.isValidObjectId(id);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/children/:childId/vocabulary-mastery
// Get mastery records for a child (self or teacher view)
// ─────────────────────────────────────────────────────────────────────────────
exports.getChildMastery = async (req, res, next) => {
  try {
    const { childId } = req.params;
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
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Records array is required.' });
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
    if (!validId(childId) || !validId(vocabId))
      return res.status(400).json({ success: false, message: 'Invalid IDs.' });

    const { isCorrect } = req.body;
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
