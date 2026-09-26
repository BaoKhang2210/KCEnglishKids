const mongoose = require('mongoose');

// Per-student score record within a classroom session
const studentScoreSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: { type: Number, default: 0 },
  stars: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  incorrectCount: { type: Number, default: 0 },
  notAnswered: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['ACTIVE', 'NEEDS_PRACTICE', 'COMPLETED'],
    default: 'ACTIVE'
  }
}, { _id: false });

// Per-question result within a classroom session
const questionResultSchema = new mongoose.Schema({
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  },
  questionIndex: { type: Number, default: 0 },
  promptText: { type: String, default: '' },
  promptImageUrl: { type: String, default: '' },
  studentAnswers: [
    {
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      result: {
        type: String,
        enum: ['CORRECT', 'INCORRECT', 'NOT_ANSWERED'],
        default: 'NOT_ANSWERED'
      },
      _id: false
    }
  ]
}, { _id: false });

const classroomSessionSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Classroom Session'
    },
    ageGroup: {
      type: String,
      enum: ['3-4', '4-5', '5-6'],
      default: '5-6'
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'LIVE', 'COMPLETED'],
      default: 'SCHEDULED',
      index: true
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    plannedDuration: {
      type: Number,
      default: 45 // minutes
    },
    // Activities chosen for this session
    activities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity'
      }
    ],
    currentActivityIndex: {
      type: Number,
      default: 0
    },
    // Per-student scores
    studentScores: [studentScoreSchema],
    // Per-question results (for the Kahoot-like view)
    questionResults: [questionResultSchema],
    // Generated summary after session ends
    summary: {
      participationCount: { type: Number, default: 0 },
      averageAccuracy: { type: Number, default: 0 }, // 0–100 %
      totalStars: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0 },
      studentsNeedingPractice: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      ],
      topPerformers: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      ]
    }
  },
  { timestamps: true }
);

classroomSessionSchema.index({ classroom: 1, status: 1 });
classroomSessionSchema.index({ teacher: 1, createdAt: -1 });

module.exports = mongoose.model('ClassroomSession', classroomSessionSchema);
