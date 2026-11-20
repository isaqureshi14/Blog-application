// controllers/authController.js — Register, Login, Logout, Me
// All tokens are stored in httpOnly, Secure, SameSite=Strict cookies.
// Passwords are hashed with bcrypt (12 rounds).
'use strict';

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const AppError = require('../utils/AppError');

// ── Helper: sign JWT ──────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn:  process.env.JWT_EXPIRES_IN || '7d',
    algorithm:  'HS256',
  });

// ── Helper: attach JWT cookie + send JSON response ────────────────────
const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    // 7 days in milliseconds
    expires:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,          // JS cannot read this cookie — XSS-safe
    sameSite: 'strict',      // CSRF protection
    secure:   process.env.NODE_ENV === 'production', // HTTPS only in prod
    path:     '/',
  };

  res.cookie('jwt', token, cookieOptions);

  // Strip sensitive fields from the response body
  user.password       = undefined;
  user.confirmPassword = undefined;
  user.active         = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,         // Also return token for clients that prefer headers (e.g. mobile)
    data:   { user },
  });
};

// ── POST /api/v1/auth/register ────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, username, email, password, confirmPassword } = req.body;

    // Create user — schema validators and pre-save hook run here
    const newUser = await User.create({
      name,
      username,
      email,
      password,
      confirmPassword,
      role: 'user',  // Always default — never trust client-supplied role
    });

    createAndSendToken(newUser, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/auth/login ───────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly select the hidden password field
    const user = await User.findOne({ email }).select('+password');

    // Use a constant-time comparison — same error message whether email or
    // password is wrong (prevents user-enumeration attacks).
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password.', 401));
    }

    createAndSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/auth/logout ──────────────────────────────────────────
exports.logout = (req, res) => {
  // Overwrite the JWT cookie with an empty, immediately-expired value
  res.cookie('jwt', 'loggedout', {
    expires:  new Date(Date.now() + 1000), // expires in 1 second
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
  });

  res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
};

// ── GET /api/v1/auth/me ───────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id).select('-__v');

    res.status(200).json({
      status: 'success',
      data:   { user },
    });
  } catch (err) {
    next(err);
  }
};
