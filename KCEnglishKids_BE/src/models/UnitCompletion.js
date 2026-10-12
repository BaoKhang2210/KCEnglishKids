const mongoose = require('mongoose');

// One document per (child, unit) — written when the child completes EVERY lesson
// of the unit. Rewards are granted here (automatic, server-side) and the client
// only "reveals" (cosmetic, idempotent). See PLAN.md §1.2.
const unitCompletionSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CurriculumUnit',
      required: true
    },
    unitCode: {
      type: String // 'B1_U5' — denormalized for fast UI
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['LESSON_PROGRESS', 'MANUAL_SYNC', 'SEED_BACKFILL'],
      default: 'LESSON_PROGRESS'
    },
    rewards: [
      {
        type: {
          type: String,
          enum: ['STAR', 'STICKER'],
          required: true
        },
        refId: { type: String }, // 'st_lion' (STICKER only)
        amount: { type: Number }, // STAR only
        grantedAt: { type: Date, default: Date.now }
      }
    ],
    // COSMETIC — null means "not opened yet", the rewards are NOT lost.
    revealedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

unitCompletionSchema.index({ child: 1, unit: 1 }, { unique: true });
unitCompletionSchema.index({ child: 1, completedAt: -1 });

module.exports = mongoose.model('UnitCompletion', unitCompletionSchema);
