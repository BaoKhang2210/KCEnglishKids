const mongoose = require('mongoose');

const homePracticeCompletionSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true
    },
    date: {
      type: String, // 'YYYY-MM-DD' in Vietnam timezone
      required: true,
      index: true
    },
    stars: {
      type: Number,
      default: 3
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

homePracticeCompletionSchema.index({ child: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('HomePracticeCompletion', homePracticeCompletionSchema);

