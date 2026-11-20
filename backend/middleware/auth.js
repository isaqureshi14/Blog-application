// middleware/auth.js — JWT authentication & role-based access control
'use strict';

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const AppError = require('../utils/AppError');

// ── protect — verifies JWT from httpOnly cookie OR Authorization header ──
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1. Try httpOnly cookie first (most secure)
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    // 2. Fall back to Authorization: Bearer <token> (for Postman / mobile)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
    }

    // 3. Verify — throws JsonWebTokenError or TokenExpiredError on failure
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Check the user still exists (account not deleted after token was issued)
    const currentUser = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // 5. Check if the user changed their password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('Password was recently changed. Please log in again.', 401));
    }

    // 6. Attach user to request and continue
    req.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

// ── restrictTo — role-based access control ────────────────────────────
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};
