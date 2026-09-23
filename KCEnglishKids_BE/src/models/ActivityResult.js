const mongoose = require('mongoose');

const activityResultSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
      index: true
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningSession',
      required: true,
      index: true
    },
    score: {
      type: Number,
      default: 0
    },
    stars: {
      type: Number,
      default: 0,
      min: 0,
      max: 3
    },
    correctCount: {
      type: Number,
      default: 0
    },
    incorrectCount: {
      type: Number,
      default: 0
    },
    attempts: {
      type: Number,
      default: 1
    },
    duration: {
      type: Number, // duration in seconds
      default: 0
    },
    completed: {
      type: Boolean,
      default: true
    },
    answers: [
      {
        questionIndex: Number,
        promptText: String,
        selectedOptionId: String,
        isCorrect: Boolean,
        vocabularyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vocabulary'
        },
        responseTimeMs: Number
      }
    ]
  },
  { timestamps: true }
);

activityResultSchema.index({ child: 1, activity: 1 });

module.exports = mongoose.model('ActivityResult', activityResultSchema);
