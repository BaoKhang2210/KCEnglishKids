const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      default: 'Trường Mầm Non Song Ngữ KCEnglishKids',
      trim: true
    },
    academicYear: {
      type: String,
      default: '2026-2027',
      trim: true
    },
    contactPhone: {
      type: String,
      default: '0901 234 567',
      trim: true
    },
    contactEmail: {
      type: String,
      default: 'admin@kcenglishkids.edu.vn',
      trim: true
    },
    address: {
      type: String,
      default: '123 Đường Sư Phạm, Quận 1, TP. Hồ Chí Minh',
      trim: true
    },
    defaultStudentPin: {
      type: String,
      default: '1234',
      trim: true
    },
    starsPerActivity: {
      type: Number,
      default: 3
    },
    maxBonusStarsPerUnit: {
      type: Number,
      default: 10
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
