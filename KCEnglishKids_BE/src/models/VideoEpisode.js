const mongoose = require('mongoose');

const cueSchema = new mongoose.Schema(
  {
    idx: { type: Number, required: true, min: 0 },
    start: { type: Number, required: true, min: 0 },
    end: { type: Number, required: true, min: 0 },
    text: { type: String, required: true, trim: true },
    translationVi: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const vocabularySchema = new mongoose.Schema(
  {
    word: { type: String, required: true, trim: true },
    meaningVi: { type: String, trim: true, default: '' },
    audioUrl: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const quizOptionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    correct: { type: Boolean, default: false }
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    idx: { type: Number, required: true, min: 0 },
    cueIdx: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      enum: ['listen_choose_sentence', 'listen_choose_picture', 'order_words', 'fill_word'],
      default: 'listen_choose_sentence'
    },
    prompt: { type: String, required: true, trim: true },
    options: { type: [quizOptionSchema], default: [] }
  },
  { _id: false }
);

const videoEpisodeSchema = new mongoose.Schema(
  {
    series: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoSeries', required: true, index: true },
    number: { type: Number, required: true, min: 1 },
    slug: { type: String, required: true, trim: true },
    // Stable lesson code in the same shape as the catalogue (e.g. r2-l1-...-001).
    lessonCode: { type: String, trim: true, default: '' },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['stored', 'youtube'], required: true },
    // Exact playback source copied from the catalogue.
    videoUrl: { type: String, trim: true, default: '' },
    youtubeId: { type: String, trim: true, default: '' },
    duration: { type: Number, required: true, min: 0 },
    videoStartMs: { type: Number, default: 0, min: 0 },
    videoEndMs: { type: Number, default: 0, min: 0 },
    clipStart: { type: Number, default: 0, min: 0 },
    clipEnd: { type: Number, default: 0, min: 0 },
    // Some episodes start with a short music intro before any dialogue.
    dialogueStartSec: { type: Number, default: 0, min: 0 },
    thumbnail: { type: String, trim: true, default: '' },
    captionCueCount: { type: Number, default: 0, min: 0 },
    canReading: { type: Boolean, default: false },
    canDubbing: { type: Boolean, default: false },
    dubbingVideoUrl: { type: String, trim: true, default: '' },
    audioUrl: { type: String, trim: true, default: '' },
    cueUrl: { type: String, trim: true, default: '' },
    sourceChannelName: { type: String, trim: true, default: '' },
    learningMode: { type: String, trim: true, default: '' },
    contentFormat: { type: String, trim: true, default: '' },
    difficultyLabel: { type: String, trim: true, default: '' },
    vocabulary: { type: [vocabularySchema], default: [] },
    subtitles: { type: [cueSchema], default: [] },
    quizzes: { type: [quizSchema], default: [] },
    isPublished: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

videoEpisodeSchema.index({ series: 1, number: 1 }, { unique: true });
videoEpisodeSchema.index({ series: 1, isPublished: 1, number: 1 });

module.exports = mongoose.model('VideoEpisode', videoEpisodeSchema);
