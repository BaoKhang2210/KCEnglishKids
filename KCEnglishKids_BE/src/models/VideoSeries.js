const mongoose = require('mongoose');

const videoSeriesSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    titleEn: { type: String, trim: true, default: '' },
    subtitle: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    thumbnail: { type: String, trim: true, default: '' },
    level: { type: String, enum: ['L1', 'L2', 'L3', 'L4', 'L5'], required: true, index: true },
    levelTitle: { type: String, trim: true, default: '' },
    // Target age range exactly as published by the catalogue (e.g. "4-5").
    targetAge: { type: String, trim: true, default: '' },
    ageMin: { type: Number, min: 0, max: 18, default: 3 },
    ageMax: { type: Number, min: 0, max: 18, default: 6 },
    topicCode: { type: String, trim: true, default: '', index: true },
    difficultyLabel: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['stored', 'youtube'], required: true, index: true },
    hasDubbing: { type: Boolean, default: false, index: true },
    dubbingCount: { type: Number, default: 0, min: 0 },
    // Declared catalogue length; the exact seed publishes every lesson.
    episodeCount: { type: Number, default: 0, min: 0 },
    activeLessonCount: { type: Number, default: 0, min: 0 },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false, index: true },
    catalogVersion: { type: Number, default: 3, index: true },
    attribution: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

videoSeriesSchema.index({ level: 1, source: 1, isPublished: 1, order: 1 });
videoSeriesSchema.index({ ageMin: 1, ageMax: 1, isPublished: 1 });

module.exports = mongoose.model('VideoSeries', videoSeriesSchema);
