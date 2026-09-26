const mongoose = require('mongoose');

// ─── Mastery Level Constants ──────────────────────────────────────────────────
// Export so controllers and frontend-sync can use the same thresholds
const MASTERY_CONFIG = {
  // Level 3 — MASTERED: requires EITHER streak OR accuracy+attempts
  MASTERED_STREAK: 3,            // 3 correct answers in a row
  MASTERED_MIN_ACCURACY: 0.80,   // 80% accuracy
  MASTERED_MIN_ATTEMPTS: 5,      // AND at least 5 attempts

  // Level 2 — PRACTICING
  PRACTICING_MIN_ATTEMPTS: 2,

  // Level 1 — LEARNING
  LEARNING_MIN_ATTEMPTS: 1
  // Level 0 — NOT_STARTED (default)
};

/**
 * Calculate mastery level from counts (rule-based, no AI).
 *
 * @param {object} record - { correctCount, wrongCount, attemptCount, streak }
 * @returns {0|1|2|3}
 */
const calculateMasteryLevel = (record) => {
  const { correctCount = 0, attemptCount = 0, streak = 0 } = record;
  const accuracy = attemptCount > 0 ? correctCount / attemptCount : 0;

  // Level 3 — MASTERED
  if (
    streak >= MASTERY_CONFIG.MASTERED_STREAK ||
    (accuracy >= MASTERY_CONFIG.MASTERED_MIN_ACCURACY &&
      attemptCount >= MASTERY_CONFIG.MASTERED_MIN_ATTEMPTS)
  ) {
    return 3;
  }

  // Level 2 — PRACTICING
  if (attemptCount >= MASTERY_CONFIG.PRACTICING_MIN_ATTEMPTS) return 2;

  // Level 1 — LEARNING
  if (attemptCount >= MASTERY_CONFIG.LEARNING_MIN_ATTEMPTS) return 1;

  // Level 0 — NOT STARTED
  return 0;
};

// ─── Schema ───────────────────────────────────────────────────────────────────
const vocabularyMasterySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    vocabulary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vocabulary',
      required: true,
      index: true
    },
    correctCount: { type: Number, default: 0, min: 0 },
    wrongCount: { type: Number, default: 0, min: 0 },
    attemptCount: { type: Number, default: 0, min: 0 },
    streak: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Consecutive correct answers'
    },
    masteryLevel: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 0,
      comment: '0=Not Started, 1=Learning, 2=Practicing, 3=Mastered'
    },
    lastReviewedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Unique compound index — one record per student+vocabulary
vocabularyMasterySchema.index({ student: 1, vocabulary: 1 }, { unique: true });

// Auto-recalculate masteryLevel before saving
vocabularyMasterySchema.pre('save', function () {
  this.masteryLevel = calculateMasteryLevel(this);
  this.lastReviewedAt = new Date();
});

module.exports = mongoose.model('VocabularyMastery', vocabularyMasterySchema);
module.exports.MASTERY_CONFIG = MASTERY_CONFIG;
module.exports.calculateMasteryLevel = calculateMasteryLevel;
