const mongoose = require('mongoose');

const parentNotificationSchema = new mongoose.Schema(
  {
    // Who sent the notification
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // Which child this is about
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // Optional: linked classroom session
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassroomSession',
      default: null
    },
    // Contact info for the parent (from child.contact or child.phone)
    recipientContact: {
      type: String,
      trim: true,
      default: ''
    },
    // Snapshot info (denormalised so report is self-contained)
    childName: { type: String, trim: true, default: '' },
    className: { type: String, trim: true, default: '' },
    sessionDate: { type: Date },

    // Report content
    subject: {
      type: String,
      trim: true,
      default: 'Learning Update'
    },
    content: {
      type: String,
      trim: true,
      default: ''
    },
    teacherNote: {
      type: String,
      trim: true,
      default: ''
    },

    // Learning metrics for the session
    score: { type: Number, default: 0 },         // 0–100 %
    vocabMastered: { type: Number, default: 0 },
    vocabTotal: { type: Number, default: 0 },
    stars: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },      // 0–100 %

    // Template used
    templateType: {
      type: String,
      enum: ['SESSION_REPORT', 'PROGRESS_UPDATE', 'GENERAL'],
      default: 'SESSION_REPORT'
    },

    // Status
    status: {
      type: String,
      enum: ['DRAFT', 'SENT'],
      default: 'SENT'
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    // If a parent view is ever added
    readAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

parentNotificationSchema.index({ teacher: 1, createdAt: -1 });
parentNotificationSchema.index({ child: 1, createdAt: -1 });

module.exports = mongoose.model('ParentNotification', parentNotificationSchema);
