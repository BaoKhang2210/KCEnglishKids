const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['IMAGE', 'AUDIO', 'ANIMATION', 'VIDEO', 'LOTTIE'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    mediaKey: {
      type: String,
      trim: true,
      index: true
    },
    thumbnail: {
      type: String
    },
    duration: {
      type: Number // in seconds for audio/video
    },
    mimeType: {
      type: String
    },
    altText: {
      type: String
    },
    transcript: {
      type: String
    },
    language: {
      type: String,
      default: 'en'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'HIDDEN'],
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

module.exports = mongoose.model('Media', mediaSchema);
