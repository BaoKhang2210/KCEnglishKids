const mongoose = require('mongoose');

const languageContentSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: ['WORD', 'PHRASE', 'SENTENCE', 'QUESTION', 'ANSWER', 'INSTRUCTION', 'PATTERN'],
      required: true
    },
    english: {
      type: String,
      required: true,
      trim: true
    },
    vietnamese: {
      type: String,
      trim: true
    },
    pronunciation: {
      type: String
    },
    ageGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgeGroup'
    },
    ageGroupCode: {
      type: String,
      enum: ['3-4', '4-5', '5-6']
    },
    difficulty: {
      type: Number,
      default: 1
    },
    sourceUnit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CurriculumUnit'
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    },
    vocabulary: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vocabulary'
      }
    ],
    audioMedia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },
    imageMedia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },
    sourceType: {
      type: String,
      enum: ['OFFICIAL_CURRICULUM', 'SYSTEM_DESIGN', 'GENERATED_CONTENT'],
      default: 'OFFICIAL_CURRICULUM'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'HIDDEN'],
      default: 'ACTIVE'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LanguageContent', languageContentSchema);
