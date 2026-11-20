// middleware/validate.js — express-validator chains for each route
// Validation runs BEFORE controllers so bad input never reaches the DB.
'use strict';

const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// ── Helper: collect errors and pass to error handler ─────────────────
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg).join('. ');
    return next(new AppError(messages, 400));
  }
  next();
};

// ── Auth validators ───────────────────────────────────────────────────

exports.validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters.')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters.'),

  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username may only contain letters, numbers, and underscores.')
    .toLowerCase(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character.'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password.')
    .custom((val, { req }) => {
      if (val !== req.body.password) throw new Error('Passwords do not match.');
      return true;
    }),
];

exports.validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ── Blog validators ───────────────────────────────────────────────────

exports.validateCreateBlog = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ min: 5, max: 160 }).withMessage('Title must be 5–160 characters.'),

  body('content')
    .trim()
    .notEmpty().withMessage('Content is required.')
    .isLength({ min: 50 }).withMessage('Content must be at least 50 characters.'),

  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Excerpt must be at most 300 characters.'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required.')
    .isIn(['technology', 'design', 'career', 'lifestyle'])
    .withMessage('Category must be one of: technology, design, career, lifestyle.'),

  body('tags')
    .optional()
    .isArray({ max: 10 }).withMessage('Tags must be an array of at most 10 items.')
    .customSanitizer(tags => tags ? tags.map(t => String(t).trim().toLowerCase().slice(0, 30)) : []),

  body('status')
    .optional()
    .isIn(['draft', 'published']).withMessage('Status must be draft or published.'),
];

exports.validateUpdateBlog = [
  param('id')
    .isMongoId().withMessage('Invalid blog post ID.'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 160 }).withMessage('Title must be 5–160 characters.'),

  body('content')
    .optional()
    .trim()
    .isLength({ min: 50 }).withMessage('Content must be at least 50 characters.'),

  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Excerpt must be at most 300 characters.'),

  body('category')
    .optional()
    .isIn(['technology', 'design', 'career', 'lifestyle'])
    .withMessage('Invalid category.'),

  body('tags')
    .optional()
    .isArray({ max: 10 }).withMessage('Tags must be an array of at most 10 items.'),

  body('status')
    .optional()
    .isIn(['draft', 'published']).withMessage('Status must be draft or published.'),
];

exports.validateMongoId = [
  param('id').isMongoId().withMessage('Invalid ID format.'),
];

exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer.')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.')
    .toInt(),
];
