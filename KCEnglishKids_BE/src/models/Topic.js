const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    englishName: {
      type: String,
      required: true,
      trim: true
    },
    vietnameseName: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String
    },
    icon: {
      type: String, // emoji or Lucide icon name, e.g. '🐾' or 'Dog'
      default: '🌟'
    },
    imageMedia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media'
    },
    imageUrl: {
      type: String
    },
    colorCode: {
      type: String,
      default: '#FF7043' // Fun playful background accent
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
    relatedUnits: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CurriculumUnit'
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
    featured: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

topicSchema.index({ ageGroupCodes: 1, status: 1, displayOrder: 1 });

module.exports = mongoose.model('Topic', topicSchema);
