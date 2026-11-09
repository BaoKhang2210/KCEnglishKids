const mongoose = require('mongoose');

// ─── Mastery Level Constants ──────────────────────────────────────────────────
// Export so controllers and frontend-sync can use the same thresholds
const MASTERY_CONFIG = {
  // New records require successful retrieval across separate days and activity types.
  MASTERED_STREAK: 3,
  MASTERED_MIN_DAYS: 2,
  MASTERED_MIN_ACTIVITY_TYPES: 2,

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
  if ((record.masteryAlgorithmVersion || 1) < 2) {
    const attempts = record.attemptCount || 0;
    const accuracy = attempts ? (record.correctCount || 0) / attempts : 0;
    if ((record.streak || 0) >= 3 || (attempts >= 5 && accuracy >= 0.8)) return 3;
    if (attempts >= 2) return 2;
    return attempts >= 1 ? 1 : 0;
  }
  const { attemptCount = 0, independentStreak = 0, practiceDaysCount = 0, recentActivityTypes = [] } = record;
  if (independentStreak >= MASTERY_CONFIG.MASTERED_STREAK &&
      practiceDaysCount >= MASTERY_CONFIG.MASTERED_MIN_DAYS &&
      recentActivityTypes.length >= MASTERY_CONFIG.MASTERED_MIN_ACTIVITY_TYPES) return 3;

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
    baselineCorrect: Number,
    baselineWrong: Number,
    correctCount: { type: Number, default: 0, min: 0 },
    wrongCount: { type: Number, default: 0, min: 0 },
    attemptCount: { type: Number, default: 0, min: 0 },
    streak: {
      type: Number,
      default: 0,
      min: 0,
      comment: 'Consecutive correct answers'
    },
    independentStreak: { type: Number, default: 0, min: 0 },
    practiceDaysCount: { type: Number, default: 0, min: 0 },
    recentActivityTypes: { type: [String], default: [] },
    needsReview: { type: Boolean, default: false },
    nextReviewAt: { type: Date, default: null },
    masteryLevel: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 0,
      comment: '0=Not Started, 1=Learning, 2=Practicing, 3=Mastered'
    },
    masteryAlgorithmVersion: { type: Number, default: 1 },
    // ─── Leitner review schedule (owned by services/vocabReview.js) ──────────
    reviewAlgorithmVersion: { type: Number, default: 0 },
    reviewLevel: { type: Number, default: 0, min: 0 },
    reviewMaxLevel: { type: Number, default: 0, min: 0 },
    reviewDueOn: { type: String, default: null },
    reviewStatus: {
      type: String,
      enum: ['LEARNING', 'PRACTICE', 'REVIEW', 'MASTERED'],
      default: 'LEARNING'
    },
    lastReviewOutcome: { type: String, enum: ['SECURE', 'PRACTICE', 'REVIEW', null], default: null },
    lastReviewSubmissionId: { type: String, default: null },
    lastRoundMarks: { type: [mongoose.Schema.Types.Mixed], default: [] },
    demotionCount: { type: Number, default: 0, min: 0 },
    lastPromotionOn: { type: String, default: null },
    lastPracticedOn: { type: String, default: null },
    lastReviewedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Unique compound index — one record per student+vocabulary
vocabularyMasterySchema.index({ student: 1, vocabulary: 1 }, { unique: true });
vocabularyMasterySchema.index({ student: 1, reviewDueOn: 1 });

// Auto-recalculate masteryLevel before saving.
// Records managed by the Leitner module carry an explicit level.
vocabularyMasterySchema.pre('save', function () {
  if (!this.reviewAlgorithmVersion) this.masteryLevel = calculateMasteryLevel(this);
  this.lastReviewedAt = new Date();
});

module.exports = mongoose.model('VocabularyMastery', vocabularyMasterySchema);
module.exports.MASTERY_CONFIG = MASTERY_CONFIG;
module.exports.calculateMasteryLevel = calculateMasteryLevel;
