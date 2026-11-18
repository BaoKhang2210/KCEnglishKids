const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['ADMIN', 'TEACHER', 'CHILD', 'PARENT'],
      required: true,
      index: true
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    importKey: { type: String, unique: true, sparse: true, select: false },
    authVersion: { type: Number, default: 0 },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String // Hashed password for ADMIN and TEACHER
    },
    pin: {
      type: String // Hashed 4-digit PIN for CHILD
    },
    // Self-service account recovery secret (never leaves the API layer):
    // CHILD → bcrypt hash of the sorted pair of "secret friend" picture ids;
    // TEACHER → bcrypt hash of a one-time shown recovery code.
    recoverySecret: {
      kind: {
        type: String,
        enum: ['PICTURES', 'CODE']
      },
      hash: {
        type: String,
        select: false
      },
      updatedAt: {
        type: Date
      }
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    dob: {
      type: Date // Date of Birth for age validation and classification
    },
    contact: {
      type: String,
      trim: true // Phone or contact info for parents/teachers
    },
    phone: {
      type: String,
      trim: true,
      sparse: true
    },
    avatar: {
      type: String, // e.g. 'lion', 'panda', 'rabbit', 'bear', 'fox'
      default: 'lion'
    },
    avatarUrl: {
      type: String
    },
    ageGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgeGroup'
    },
    ageGroupCode: {
      type: String,
      enum: ['3-4', '4-5', '5-6']
    },
    assignedClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassRoom'
    },
    assignedClasses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClassRoom'
      }
    ],
    // For CHILD: parent's contact (email or phone) used for notifications
    parentContact: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
      default: 'ACTIVE'
    },
    lastLogin: {
      type: Date
    },
    streak: {
      type: Number,
      default: 1
    },
    longestStreak: {
      type: Number,
      default: 1
    },
    lastActiveDate: {
      type: String
    },
    activeDates: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

const ANIMAL_AVATAR_SYMBOLS = {
  lion: '/images/symbols/1f981.svg',
  tiger: '/images/symbols/1f42f.svg',
  panda: '/images/symbols/1f43c.svg',
  rabbit: '/images/symbols/1f430.svg',
  bear: '/images/symbols/1f43b.svg',
  fox: '/images/symbols/1f98a.svg',
  koala: '/images/symbols/1f43b.svg',
  monkey: '/images/symbols/1f412.svg',
  cat: '/images/symbols/1f431.svg',
  dog: '/images/rewards/fluent-3d/dog_face_3d.png',
  elephant: '/images/symbols/1f418.svg'
};

// Pre-save hook to hash password and pin if modified, and ensure avatarUrl
userSchema.pre('save', async function () {
  if (this.role === 'CHILD') {
    if (!this.avatar) this.avatar = 'lion';
    if (!this.avatarUrl) {
      this.avatarUrl = ANIMAL_AVATAR_SYMBOLS[this.avatar] || '/images/symbols/1f981.svg';
    }
  }
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified('pin') && this.pin) {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
  }
});

// Method to verify password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to verify PIN
userSchema.methods.matchPin = async function (enteredPin) {
  if (!this.pin) return false;
  return await bcrypt.compare(enteredPin, this.pin);
};

module.exports = mongoose.model('User', userSchema);
