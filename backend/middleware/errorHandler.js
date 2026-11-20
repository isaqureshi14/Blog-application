// middleware/errorHandler.js — Global Express error handler
// NEVER leaks stack traces or internal details in production.
'use strict';

const AppError = require('../utils/AppError');

// ── Specific Mongoose / JWT error transformers ────────────────────────

function handleCastErrorDB(err) {
  return new AppError(`Invalid ${err.path}: '${err.value}'.`, 400);
}

function handleDuplicateFieldsDB(err) {
  let field = 'field';
  let value = '';
  if (err.keyValue) {
    field = Object.keys(err.keyValue)[0];
    value = err.keyValue[field];
  } else if (err.message) {
    const match = err.message.match(/index:\s+([a-zA-Z0-9_]+)_1/);
    if (match) field = match[1];
  }
  return new AppError(
    `The ${field} ${value ? `'${value}' ` : ''}is already in use. Please choose another ${field}.`,
    409
  );
}

function handleValidationErrorDB(err) {
  const messages = Object.values(err.errors)
    .map(e => e.message)
    .join('. ');
  return new AppError(messages, 400);
}

function handleJWTError() {
  return new AppError('Invalid token. Please log in again.', 401);
}

function handleJWTExpiredError() {
  return new AppError('Your session has expired. Please log in again.', 401);
}

// ── Response senders ─────────────────────────────────────────────────

function sendErrorDev(err, res) {
  res.status(err.statusCode).json({
    status:     err.status,
    message:    err.message,
    stack:      err.stack,
    error:      err,
  });
}

function sendErrorProd(err, res) {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status:  err.status,
      message: err.message,
    });
  } else {
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

  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;

  if (error.name === 'CastError')           error = handleCastErrorDB(error);
  if (error.code === 11000)                 error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError')     error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError')   error = handleJWTError();
  if (error.name === 'TokenExpiredError')   error = handleJWTExpiredError();

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};
