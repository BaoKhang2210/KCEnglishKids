const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vocabulary: { type: mongoose.Schema.Types.ObjectId, ref: 'Vocabulary', required: true },
  submissionId: { type: String, required: true },
  isCorrect: { type: Boolean, required: true }
}, { timestamps: true });
schema.index({ child: 1, submissionId: 1 }, { unique: true });
schema.index({ child: 1, vocabulary: 1, createdAt: 1 });
module.exports = mongoose.model('MasteryEvent', schema);
