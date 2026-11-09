const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  stage: { type: Number, required: true, enum: [1, 2, 3] },
  submissionId: { type: String, required: true },
  amount: { type: Number, default: 1, min: 1, max: 1 },
}, { timestamps: true });

schema.index({ child: 1, lesson: 1, stage: 1 }, { unique: true });
schema.index({ child: 1, submissionId: 1 }, { unique: true });

module.exports = mongoose.model('StageStarGrant', schema);
