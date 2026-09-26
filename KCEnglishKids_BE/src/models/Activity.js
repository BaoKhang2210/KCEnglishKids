const mongoose = require('mongoose');

const activityOptionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  text: {
    type: String
  },
  vietnameseText: {
    type: String
  },
  imageUrl: {
    type: String
  },
  imageMedia: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  },
  audioUrl: {
    type: String
  },
  isCorrect: {
    type: Boolean,
    default: false
  }
});

const activityQuestionSchema = new mongoose.Schema({
  promptText: {
    type: String
  },
  promptAudio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  },
  promptAudioUrl: {
    type: String
  },
  promptImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  },
  promptImageUrl: {
    type: String
  },
  correctAnswer: {
    type: String,
    required: true
  },
  options: [activityOptionSchema],
  vocabulary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vocabulary'
  },
  explanation: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const activitySchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
      index: true
    },
    activityType: {
      type: String,
      enum: [
        'LISTEN_CHOOSE',
        'LISTEN_REPEAT',
        'MATCHING',
        'IMAGE_WORD_MATCH',
        'DRAG_DROP',
        'MEMORY',
        'MEMORY_CARD',
        'FIND_OBJECT',
        'MISSING_OBJECT',
        'COLOR_RECOGNITION',
        'COUNT_OBJECTS',
        'TRUE_FALSE',
        'CLASSIFICATION',
        'FEED_ANIMAL',
        'BUBBLE_POP',
        'TAP_PICTURE',
        'ANIMAL_SOUND',
        'STAR_CATCHER'
      ],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    vietnameseTitle: {
      type: String
    },
    instructions: {
      type: String,
      default: 'Listen and choose the correct picture!'
    },
    instructionAudio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },
    instructionAudioUrl: {
      type: String
    },
    ageGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgeGroup',
      required: true
    },
    ageGroupCode: {
      type: String,
      required: true,
      enum: ['3-4', '4-5', '5-6']
    },
    difficulty: {
      type: Number,
      default: 1,
      min: 1,
      max: 3
    },
    questionCount: {
      type: Number,
      default: 4
    },
    timeLimit: {
      type: Number, // 0 = unlimited
      default: 0
    },
    pointsPerQuestion: {
      type: Number,
      default: 10
    },
    starConfig: {
      threeStarsMin: {
        type: Number,
        default: 90
      },
      twoStarsMin: {
        type: Number,
        default: 70
      },
      oneStarMin: {
        type: Number,
        default: 50
      }
    },
    questions: [activityQuestionSchema],
    order: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'HIDDEN', 'DRAFT'],
      default: 'ACTIVE'
    }
  },
  { timestamps: true }
);

activitySchema.index({ lesson: 1, status: 1, order: 1 });
activitySchema.index({ ageGroupCode: 1, status: 1 });

module.exports = mongoose.model('Activity', activitySchema);
