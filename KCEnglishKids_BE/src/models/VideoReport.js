const mongoose = require('mongoose');

const videoReportSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    episode: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoEpisode', required: true, index: true },
    cueIdx: { type: Number, default: null },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['OPEN', 'REVIEWED', 'DISMISSED'],
      default: 'OPEN',
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VideoReport', videoReportSchema);
