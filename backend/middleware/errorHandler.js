// middleware/errorHandler.js — Global Express error handler
// NEVER leaks stack traces or internal details in production.
'use strict';

const AppError = require('../utils/AppError');

// ── Specific Mongoose / JWT error transformers ────────────────────────

function handleCastErrorDB(err) {
  return new AppError(`Invalid ${err.path}: '${err.value}'.`, 400);
}

function handleDuplicateFieldsDB(err) {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(
    `The ${field} '${value}' is already in use. Please use a different ${field}.`,
    409
  );
}

function handleValidationErrorDB(err) {
  const messages = Object.values(err.errors)
    .map(e => e.message)
    .join('. ');
  return new AppError(`Validation failed: ${messages}`, 400);
}

function handleJWTError() {
  return new AppError('Invalid token. Please log in again.', 401);
}

function handleJWTExpiredError() {
  return new AppError('Your session has expired. Please log in again.', 401);
}

// ── Response senders ─────────────────────────────────────────────────

function sendErrorDev(err, res) {
  // In development: send full details so engineers can debug quickly
  res.status(err.statusCode).json({
    status:     err.status,
    message:    err.message,
    stack:      err.stack,
    error:      err,
  });
}

function sendErrorProd(err, res) {
  if (err.isOperational) {
    // Safe, expected errors — send a user-friendly message
    res.status(err.statusCode).json({
      status:  err.status,
      message: err.message,
    });
  } else {
    // Programming or unknown error — do NOT leak internals
    console.error('[ERROR]', err);
    res.status(500).json({
      status:  'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
}

// ── Main handler ──────────────────────────────────────────────────────
module.exports = function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status     = err.status     || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
    error.message = err.message;

    if (error.name === 'CastError')           error = handleCastErrorDB(error);
    if (error.code === 11000)                 error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')     error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError')   error = handleJWTError();
    if (error.name === 'TokenExpiredError')   error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
