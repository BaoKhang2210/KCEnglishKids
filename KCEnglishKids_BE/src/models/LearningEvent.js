const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  submissionId: { type: String, required: true },
  stage: { type: Number, required: true, enum: [1, 2, 3] },
  gameId: String,
  score: Number,
  durationSeconds: { type: Number, min: 0, max: 7200 },
  answers: [mongoose.Schema.Types.Mixed],
  payloadHash: String,
  lessonCompleted: { type: Boolean, default: false }
}, { timestamps: true });
schema.index({ child: 1, submissionId: 1 }, { unique: true });
schema.index({ child: 1, lesson: 1, stage: 1, createdAt: -1 });
module.exports = mongoose.model('LearningEvent', schema);
