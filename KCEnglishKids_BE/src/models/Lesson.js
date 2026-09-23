const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
      index: true
    },
    ageGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgeGroup',
      required: true
    },
    ageGroupCode: {
      type: String,
      required: true,
      enum: ['3-4', '4-5', '5-6'],
      index: true
    },
    key: {
      type: String,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    vietnameseTitle: {
      type: String,
      trim: true
    },
    description: {
      type: String
    },
    learningObjectives: [
      {
        type: String
      }
    ],
    estimatedDuration: {
      type: Number, // in minutes
      default: 10
    },
    difficulty: {
      type: Number,
      default: 1,
      min: 1,
      max: 3
    },
    thumbnail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },
    thumbnailUrl: {
      type: String
    },
    curriculumUnits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CurriculumUnit'
      }
    ],
    vocabularyItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vocabulary'
      }
    ],
    languageContents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LanguageContent'
      }
    ],
    displayOrder: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'HIDDEN', 'DRAFT'],
      default: 'ACTIVE'
    },
    sourceType: {
      type: String,
      enum: ['OFFICIAL_CURRICULUM', 'SYSTEM_DESIGN', 'GENERATED_CONTENT'],
      default: 'SYSTEM_DESIGN'
    }
  },
  { timestamps: true }
);

lessonSchema.index({ topic: 1, status: 1, displayOrder: 1 });
lessonSchema.index({ ageGroupCode: 1, status: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
