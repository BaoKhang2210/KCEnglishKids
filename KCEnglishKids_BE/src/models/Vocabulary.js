const mongoose = require('mongoose');

const vocabularySchema = new mongoose.Schema(
  {
    english: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    vietnamese: {
      type: String,
      required: true,
      trim: true
    },
    pronunciation: {
      type: String, // e.g., '/dɒɡ/'
      trim: true
    },
    partOfSpeech: {
      type: String,
      enum: ['noun', 'verb', 'adjective', 'phrase', 'interjection', 'other'],
      default: 'noun'
    },
    normalizedText: {
      type: String,
      trim: true,
      index: true
    },
    category: {
      type: String,
      trim: true
    },
    mediaKey: {
      type: String,
      trim: true
    },
    difficulty: {
      type: Number,
      default: 1,
      min: 1,
      max: 3
    },
    ageGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AgeGroup'
      }
    ],
    ageGroupCodes: [
      {
        type: String,
        enum: ['3-4', '4-5', '5-6']
      }
    ],
    sourceUnits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CurriculumUnit'
      }
    ],
    topics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic'
      }
    ],
    primaryMedia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },
    imageUrl: {
      type: String // Cached direct image URL or SVG icon
    },
    audioMedia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },
    audioUrl: {
      type: String // Cached direct audio URL
    },
    exampleSentence: {
      type: String
    },
    exampleSentenceVietnamese: {
      type: String
    },
    exampleAudio: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'HIDDEN'],
      default: 'ACTIVE'
    },
    sourceType: {
      type: String,
      enum: ['OFFICIAL_CURRICULUM', 'SYSTEM_DESIGN', 'GENERATED_CONTENT'],
      default: 'OFFICIAL_CURRICULUM'
    }
  },
  { timestamps: true }
);

vocabularySchema.index({ ageGroupCodes: 1, status: 1 });
vocabularySchema.index({ sourceUnits: 1 });

module.exports = mongoose.model('Vocabulary', vocabularySchema);
