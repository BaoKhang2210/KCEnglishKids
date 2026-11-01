const mongoose = require('mongoose');
const { TEACHING_STATUSES, normalizeClassName } = require('../services/classroomRules');

const classRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    deletionPending: { type: Boolean, default: false },
    normalizedName: { type: String, required: true },
    deletionStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    description: {
      type: String,
      trim: true,
      default: ''
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    ageGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgeGroup'
    },
    ageGroupCode: {
      type: String,
      enum: ['3-4', '4-5', '5-6']
    },
    curriculumBook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CurriculumBook'
    },
    currentLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null
    },
    completedLessons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson'
      }
    ],
    academicYear: {
      type: String,
      default: '2026-2027'
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'COMPLETED', 'UPCOMING'],
      default: 'ACTIVE'
    }
  },
  { timestamps: true }
);

classRoomSchema.pre('validate', function () {
  this.name = this.name?.normalize('NFC').trim().replace(/\s+/gu, ' ');
  this.normalizedName = normalizeClassName(this.name);
});
classRoomSchema.index({ normalizedName: 1 }, { unique: true, name: 'unique_normalized_class_name' });
classRoomSchema.index({ teacher: 1 }, { name: 'one_teacher_per_current_class', unique: true, partialFilterExpression: { status: { $in: TEACHING_STATUSES } } });
module.exports = mongoose.model('ClassRoom', classRoomSchema);
