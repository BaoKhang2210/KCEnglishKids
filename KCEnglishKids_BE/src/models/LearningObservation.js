const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassRoom', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassroomSession', default: null },
  skill: { type: String, enum: ['LISTEN_POINT', 'EXPRESS', 'PARTICIPATE'], required: true },
  vocabulary: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vocabulary' }],
  unitKey: { type: String, default: '' },
  unitLabel: { type: String, default: '' },
  level: { type: String, enum: ['INDEPENDENT', 'SUPPORTED', 'EMERGING'], required: true },
  evidence: { type: String, required: true, maxlength: 1000 },
  nextStep: { type: String, maxlength: 500, default: '' },
  consentConfirmed: { type: Boolean, default: false },
  observedAt: { type: Date, default: Date.now, required: true },
  operationId: { type: String, required: true },
  payloadHash: { type: String, required: true, select: false },
  media: { mimeType: String, bytes: Number, data: { type: Buffer, select: false } },
  voidedAt: { type: Date, default: null }
}, { timestamps: true });
schema.index({ teacher: 1, operationId: 1 }, { unique: true });
schema.index({ child: 1, voidedAt: 1, observedAt: -1 });
schema.index({ classroom: 1, lesson: 1 });
schema.index({ classroom: 1, unitKey: 1, voidedAt: 1, observedAt: -1 });
module.exports = mongoose.model('LearningObservation', schema);
