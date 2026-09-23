const mongoose = require('mongoose');

const teacherNoteSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    default: null
  },
  noteType: {
    type: String,
    enum: ['INTEREST', 'VOCABULARY', 'PARTICIPATION', 'LISTENING', 'SPEAKING', 'STRENGTH', 'DIFFICULTY', 'REINFORCEMENT', 'GENERAL'],
    default: 'GENERAL'
  },
  content: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TeacherNote', teacherNoteSchema);
