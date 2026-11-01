const mongoose = require('mongoose');
// Append-only editions. Latest revision (including a revocation) is authoritative.
const schema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassRoom', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  sourceSession: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassroomSession', default: null },
  revision: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['APPROVED', 'REVOKED'], required: true },
  operationId: { type: String, required: true },
  payloadHash: { type: String, select: false, required: true },
  lessonTitle: String,
  ageGroupCode: String,
  teacherNote: { type: String, maxlength: 1000 },
  words: [{ _id: false, vocabulary: { type: mongoose.Schema.Types.ObjectId, ref: 'Vocabulary', required: true }, english: String, vietnamese: String, imageUrl: String, audioUrl: String, wordType: String, visualType: String, isTransparent: Boolean, reason: String }],
  homeActivity: { title: String, steps: [String] },
  observations: [{ _id: false, observation: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningObservation' }, skill: String, level: String, evidence: String, nextStep: String }],
  guideRevision: Number,
  basis: String
}, { timestamps: true });
schema.index({ child: 1, revision: -1 }, { unique: true });
schema.index({ teacher: 1, operationId: 1 }, { unique: true });
schema.index({ classroom: 1, createdAt: -1 });
module.exports = mongoose.model('HomePracticePlan', schema);
