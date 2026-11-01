const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
      index: true
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
      index: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completionSnapshot: {
      source: { type: String, enum: ['LEGACY_PROGRESS', 'CURRENT_ACTIVITIES', 'STAGES'] },
      recordedAt: Date,
      activityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }]
    },
    stars: {
      // Canonical stage-completion star total (one for each of the 3 stages).
      type: Number,
      default: 0,
      min: 0,
      max: 3
    },
    highestScore: {
      type: Number,
      default: 0
    },
    attempts: {
      type: Number,
      default: 0
    },
    // §1.3.1 — 3-stage pipeline state (server = source of truth; localStorage = cache)
    stage1Completed: {
      type: Boolean,
      default: false
    },
    stage2Completed: {
      type: Boolean,
      default: false
    },
    stage2Score: {
      type: Number,
      default: 0
    },
    stage2Stars: {
      // Deprecated legacy practice rating; the current stage flow no longer writes or reads it.
      type: Number,
      default: 0,
      min: 0,
      max: 3
    },
    stage3Completed: {
      type: Boolean,
      default: false
    },
    stage3Stars: {
      // Deprecated display-era field. Stage 3 games now record completion only;
      // retained for backward compatibility and excluded from the star ledger.
      type: Number,
      default: 0,
      min: 0,
      max: 3
    },
    stage3Games: { type: [String], default: [] },
    weakVocabulary: [
      {
        vocabulary: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vocabulary'
        },
        mistakeCount: {
          type: Number,
          default: 1
        },
        // §4.10 — consecutive correct answers shrink mistakeCount (2 in a row → -1)
        consecutiveCorrect: {
          type: Number,
          default: 0
        }
      }
    ],
    lastActivityAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

progressSchema.index({ child: 1, lesson: 1 }, { unique: true });
progressSchema.index({ child: 1, topic: 1 });

module.exports = mongoose.model('Progress', progressSchema);
