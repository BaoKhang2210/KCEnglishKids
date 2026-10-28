const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassRoom',
    required: true
  },
  assignedToType: {
    type: String,
    enum: ['CLASS', 'STUDENT'],
    default: 'CLASS'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  recipients: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: undefined },
  activitySnapshot: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }], default: undefined },
  reviews: [{
    child: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    result: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityResult' },
    comment: { type: String, default: '' },
    bonusStars: { type: Number, min: 0, max: 5, default: 0 },
    reviewedAt: Date,
    revision: { type: Number, default: 0 },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    _id: false
  }],
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    default: null
  },
  dueDate: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'ASSIGNED'
  },
  instructions: {
    type: String,
    default: ''
  }
}, {
  timestamps: true, optimisticConcurrency: true
});

assignmentSchema.index({ teacher: 1, classRoom: 1, createdAt: -1 });
assignmentSchema.index({ 'reviews.child': 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
