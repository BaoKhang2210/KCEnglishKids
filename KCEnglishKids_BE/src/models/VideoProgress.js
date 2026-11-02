const mongoose = require('mongoose');

const quizAnswerSchema = new mongoose.Schema(
  {
    idx: { type: Number, required: true, min: 0 },
    firstTryCorrect: { type: Boolean, default: false }
  },
  { _id: false }
);

const videoProgressSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    series: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoSeries', required: true, index: true },
    episode: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoEpisode', required: true, index: true },
    listen: {
      watchedPercent: { type: Number, default: 0, min: 0, max: 100 },
      done: { type: Boolean, default: false }
    },
    read: {
      readIdx: { type: [Number], default: [] },
      done: { type: Boolean, default: false }
    },
    speak: {
      markedIdx: { type: [Number], default: [] },
      done: { type: Boolean, default: false }
    },
    quiz: {
      answers: { type: [quizAnswerSchema], default: [] },
      score: { type: Number, default: 0, min: 0 },
      total: { type: Number, default: 0, min: 0 },
      done: { type: Boolean, default: false }
    },
    dub: {
      done: { type: Boolean, default: false }
    },
    lastPositionSec: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

videoProgressSchema.index({ child: 1, episode: 1 }, { unique: true });
videoProgressSchema.index({ child: 1, completed: 1, updatedAt: -1 });

module.exports = mongoose.model('VideoProgress', videoProgressSchema);
