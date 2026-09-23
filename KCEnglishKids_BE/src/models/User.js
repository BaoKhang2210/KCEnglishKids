const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['ADMIN', 'TEACHER', 'CHILD'],
      required: true,
      index: true
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
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
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
      default: 'ACTIVE'
    },
    lastLogin: {
      type: Date
    }
  },
  { timestamps: true }
);

// Pre-save hook to hash password and pin if modified
userSchema.pre('save', async function () {
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
