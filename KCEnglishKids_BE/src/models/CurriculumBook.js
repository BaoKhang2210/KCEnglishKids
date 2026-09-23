const mongoose = require('mongoose');

const curriculumBookSchema = new mongoose.Schema(
  {
    bookNumber: {
      type: Number,
      required: true,
      unique: true,
      enum: [1, 2, 3]
    },
    title: {
      type: String,
      required: true // 'Book 1', 'Book 2', 'Book 3'
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
    description: {
      type: String
    },
    totalUnits: {
      type: Number,
      default: 9
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CurriculumBook', curriculumBookSchema);
