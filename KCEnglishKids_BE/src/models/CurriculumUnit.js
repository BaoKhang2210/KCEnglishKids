const mongoose = require('mongoose');

const curriculumUnitSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CurriculumBook',
      required: true
    },
    bookNumber: {
      type: Number,
      required: true,
      enum: [1, 2, 3]
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
    unitNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 9
    },
    bigQuestion: {
      type: String,
      required: true
    },
    storyTitle: {
      type: String
    },
    vocabularyReferences: [
      {
        type: String // English words referenced
      }
    ],
    languagePatterns: [
      {
        type: String // Key sentences / phrases
      }
    ],
    values: {
      type: String
    },
    concept: {
      type: String
    },
    oracy: {
      type: String
    },
    crossCurricular: {
      type: String
    },
    numeracy: {
      type: String
    },
    project: {
      type: String
    },
    sourceType: {
      type: String,
      enum: ['OFFICIAL_CURRICULUM', 'SYSTEM_DESIGN', 'GENERATED_CONTENT'],
      default: 'OFFICIAL_CURRICULUM'
    },
    displayOrder: {
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

curriculumUnitSchema.index({ bookNumber: 1, unitNumber: 1 }, { unique: true });
curriculumUnitSchema.index({ ageGroupCode: 1, unitNumber: 1 });

module.exports = mongoose.model('CurriculumUnit', curriculumUnitSchema);
