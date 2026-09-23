const mongoose = require('mongoose');

const learningSessionSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    lastActivityAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date
    },
    currentActivity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity'
    },
    completedActivities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity'
      }
    ],
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
      default: 'IN_PROGRESS'
    },
    totalScore: {
      type: Number,
      default: 0
    },
    stars: {
      type: Number,
      default: 0,
      min: 0,
      max: 3
    }
  },
  { timestamps: true }
);

learningSessionSchema.index({ child: 1, status: 1 });
learningSessionSchema.index({ child: 1, lesson: 1 });

module.exports = mongoose.model('LearningSession', learningSessionSchema);
