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
    stars: {
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
    weakVocabulary: [
      {
        vocabulary: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vocabulary'
        },
        mistakeCount: {
          type: Number,
          default: 1
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
