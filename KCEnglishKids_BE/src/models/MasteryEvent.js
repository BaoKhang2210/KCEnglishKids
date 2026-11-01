const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vocabulary: { type: mongoose.Schema.Types.ObjectId, ref: 'Vocabulary', required: true },
  submissionId: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  independent: { type: Boolean, default: true },
  wrongAttempts: { type: Number, min: 0, default: 0 },
  activityType: { type: String, maxlength: 40 },
  sessionId: { type: String, maxlength: 120 }
}, { timestamps: true });
schema.index({ child: 1, submissionId: 1 }, { unique: true });
schema.index({ child: 1, vocabulary: 1, createdAt: 1 });
module.exports = mongoose.model('MasteryEvent', schema);
