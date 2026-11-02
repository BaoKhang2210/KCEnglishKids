const mongoose = require('mongoose');

const videoFavoriteSchema = new mongoose.Schema(
  {
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    series: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoSeries', required: true, index: true }
  },
  { timestamps: true }
);

videoFavoriteSchema.index({ child: 1, series: 1 }, { unique: true });

module.exports = mongoose.model('VideoFavorite', videoFavoriteSchema);
