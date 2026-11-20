// utils/AppError.js — Custom operational error class
// Distinguishes expected errors (400, 401, 404 …) from programming bugs.
// The global error handler uses isOperational to decide what to send to clients.
'use strict';

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode  = statusCode;
    this.status      = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture a clean stack trace that excludes this constructor frame
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
