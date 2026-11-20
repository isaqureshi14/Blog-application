// routes/authRoutes.js — Authentication endpoints
// Aggressive rate limiting on login/register to prevent brute-force.
'use strict';

const express    = require('express');
const rateLimit  = require('express-rate-limit');

const authController = require('../controllers/authController');
const { protect }    = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} = require('../middleware/validate');

const router = express.Router();

// ── Strict rate limiter for auth endpoints ────────────────────────────
// 10 attempts per 15 minutes per IP — prevents brute-force on login
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,  // 15 minutes
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { status: 'error', message: 'Too many attempts. Please try again in 15 minutes.' },
  skipSuccessfulRequests: true,     // Only count failed requests
});

// ── Routes ────────────────────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  validateRegister,
  handleValidationErrors,
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validateLogin,
  handleValidationErrors,
  authController.login
);

router.post('/logout', protect, authController.logout);

router.get('/me', protect, authController.getMe);

module.exports = router;
