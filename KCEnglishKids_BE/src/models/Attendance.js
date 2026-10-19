const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'EXCUSED', 'LATE'],
      default: 'PRESENT'
    },
    note: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassRoom',
      required: true,
      index: true
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    records: [attendanceRecordSchema],
    note: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

attendanceSchema.index({ classroom: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
