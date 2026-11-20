// models/User.js — Mongoose User schema
// Security: hashed passwords, no plain-text storage,
// password-change tracking for JWT invalidation.
'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required.'],
      trim:     true,
      maxlength:[60, 'Name must be at most 60 characters.'],
      minlength:[2,  'Name must be at least 2 characters.'],
    },

    username: {
      type:      String,
      required:  [true, 'Username is required.'],
      unique:    true,
      trim:      true,
      lowercase: true,
      maxlength: [30, 'Username must be at most 30 characters.'],
      minlength: [3,  'Username must be at least 3 characters.'],
      match:     [/^[a-z0-9_]+$/, 'Username may only contain letters, numbers, and underscores.'],
    },

    email: {
      type:      String,
      required:  [true, 'Email is required.'],
      unique:    true,
      trim:      true,
      lowercase: true,
      match:     [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
    },

    password: {
      type:      String,
      required:  [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters.'],
      select:    false,  // NEVER returned in queries by default
    },

    // Not persisted — used only during registration for validation
    confirmPassword: {
      type:     String,
      validate: {
        validator(val) { return val === this.password; },
        message:  'Passwords do not match.',
      },
    },

    role: {
      type:    String,
      enum:    ['user', 'admin'],
      default: 'user',
    },

    passwordChangedAt: {
      type:   Date,
      select: false,
    },

    active: {
      type:    Boolean,
      default: true,
      select:  false,
    },
  },
  {
    timestamps: true,  // createdAt, updatedAt
  }
);

// ── Pre-save: hash password ───────────────────────────────────────────
userSchema.pre('save', async function (next) {
  // Only hash if password was modified (new user or password change)
  if (!this.isModified('password')) return next();

  // 12 salt rounds: strong enough, not too slow for registration
  this.password = await bcrypt.hash(this.password, 12);

  // Don't persist confirmPassword
  this.confirmPassword = undefined;

  // If this is not a new document, record when password was changed
  if (!this.isNew) {
    // Subtract 1 second to account for token-issue/save timing edge case
    this.passwordChangedAt = Date.now() - 1000;
  }

  next();
});

// ── Pre-query: exclude inactive (soft-deleted) users ─────────────────
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// ── Instance method: compare plaintext vs hashed password ────────────
userSchema.methods.correctPassword = async function (candidatePassword, hashedPassword) {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

// ── Instance method: has the password changed after the token was issued? ─
userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedAt = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return jwtTimestamp < changedAt;
  }
  return false;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
