const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  stars: { type: Number, required: true, min: 1 },
  readAt: { type: Date, default: null }
}, { _id: false });

// One atomic document contains the published result AND each child's notification.
// The unique key makes retries and concurrent publication safe without transactions.
const schema = new mongoose.Schema({
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassRoom', required: true },
  className: { type: String, required: true },
  kind: { type: String, enum: ['WEEK', 'MONTH'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: { type: Date, default: Date.now },
  reward: {
    title: String, symbol: String, description: String, suggestion: String
  },
  winners: { type: [winnerSchema], required: true },
  ranking: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { timestamps: true });
schema.index({ classroom: 1, kind: 1, periodStart: 1 }, { unique: true });
schema.index({ 'winners.child': 1, publishedAt: -1 });
module.exports = mongoose.model('ClassRecognition', schema);
