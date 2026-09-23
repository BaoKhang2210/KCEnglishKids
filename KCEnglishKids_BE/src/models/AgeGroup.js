const mongoose = require('mongoose');

const ageGroupSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      enum: ['3-4', '4-5', '5-6'],
      index: true
    },
    name: {
      type: String,
      required: true // e.g. 'Age 3–4 (Book 1)'
    },
    vietnameseName: {
      type: String,
      default: 'Lớp Mầm (3–4 tuổi)'
    },
    description: {
      type: String
    },
    targetAgeMin: {
      type: Number,
      required: true
    },
    targetAgeMax: {
      type: Number,
      required: true
    },
    maxChoicesPerQuestion: {
      type: Number,
      default: 3
    },
    defaultQuestionCount: {
      type: Number,
      default: 4
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AgeGroup', ageGroupSchema);
