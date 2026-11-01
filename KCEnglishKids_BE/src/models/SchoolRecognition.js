const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  className: { type: String, default: 'Toàn trường' },
  kind: { type: String, enum: ['WEEK', 'MONTH'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: { type: Date, default: Date.now },
  minimumSessions: { type: Number, required: true },
  policyVersion: { type: String, default: 'STARS_PER_SESSION_V1' },
  reward: { title: String, symbol: String, description: String, suggestion: String },
  ranking: { type: [mongoose.Schema.Types.Mixed], default: [] },
  winners: [{
    _id: false,
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    stars: { type: Number, required: true, min: 1 },
    sessions: Number,
    starsPerSession: Number,
    readAt: { type: Date, default: null }
  }]
}, { timestamps: true });
schema.index({ kind: 1, periodStart: 1 }, { unique: true });
schema.index({ 'winners.child': 1, publishedAt: -1 });
module.exports = mongoose.model('SchoolRecognition', schema);
