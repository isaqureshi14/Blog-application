// middleware/xss.js — Lightweight, zero-dependency XSS sanitization
// Sanitizes req.body, req.query, and req.params against cross-site scripting
'use strict';

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function clean(value) {
  if (Array.isArray(value)) {
    return value.map(clean);
  }
  if (value !== null && typeof value === 'object') {
    const cleaned = {};
    for (const key of Object.keys(value)) {
      cleaned[key] = clean(value[key]);
    }
    return cleaned;
  }
  return sanitizeString(value);
}

module.exports = function xssMiddleware(req, res, next) {
  if (req.body) {
    req.body = clean(req.body);
  }
  if (req.query) {
    req.query = clean(req.query);
  }
  if (req.params) {
    req.params = clean(req.params);
  }
  next();
};
