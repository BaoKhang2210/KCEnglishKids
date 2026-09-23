const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: ['CREATE_USER', 'UPDATE_USER', 'LOCK_USER', 'UNLOCK_USER', 'TOGGLE_TOPIC', 'TOGGLE_LESSON'],
      required: true
    },
    targetType: {
      type: String,
      enum: ['User', 'Topic', 'Lesson', 'System'],
      default: 'User'
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
