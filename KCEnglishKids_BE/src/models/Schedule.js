const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassRoom',
    required: true,
    index: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  academicYear: {
    type: String,
    default: '2026-2027'
  },
  weeklySlots: [{
    dayOfWeek: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6],
      required: true
    }, // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
    startTime: {
      type: String,
      required: true
    }, // ví dụ "08:00"
    endTime: {
      type: String,
      required: true
    },   // ví dụ "08:45"
    subjectNote: {
      type: String,
      default: ''
    },
    room: {
      type: String,
      default: ''
    }
  }],
  colorTag: {
    type: String,
    default: 'indigo'
  }, // indigo, emerald, amber, rose, purple, sky, teal, orange
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
