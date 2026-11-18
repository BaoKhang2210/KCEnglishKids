const mongoose = require('mongoose');

const childClientStateSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    vocabStats: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    vocabSelfMarks: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    lessonStates: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    stage2Sessions: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    preferences: {
      videoAutoNext: { type: Boolean, default: true },
      flashcardFlipGuided: { type: Boolean, default: false },
      enableSpeakCoach: { type: Boolean, default: true }
    }
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.model('ChildClientState', childClientStateSchema);

