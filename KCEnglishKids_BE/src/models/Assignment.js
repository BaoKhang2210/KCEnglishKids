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
  timestamps: true
});

module.exports = mongoose.model('Assignment', assignmentSchema);
