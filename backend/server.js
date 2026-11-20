// =====================================================================
// server.js — Express entry point
// Loads security middleware first, then routes, then error handler.
// =====================================================================

'use strict';

const path        = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express     = require('express');
const helmet      = require('helmet');
const cors        = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss         = require('./middleware/xss');
const hpp         = require('hpp');
const cookieParser = require('cookie-parser');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');

const connectDB   = require('./config/db');
const authRoutes  = require('./routes/authRoutes');
const blogRoutes  = require('./routes/blogRoutes');
const errorHandler = require('./middleware/errorHandler');
const AppError    = require('./utils/AppError');

// ── 1. Connect to MongoDB ─────────────────────────────────────────────
connectDB();

const app = express();

// ── 2. Trust proxy (for rate-limiter behind reverse proxies / Heroku) ─
app.set('trust proxy', 1);

// ── 3. Security HTTP Headers (Helmet) ────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'"],
        styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
        imgSrc:     ["'self'", 'data:', 'https://images.unsplash.com'],
        connectSrc: ["'self'", 'http://localhost:5000', 'http://127.0.0.1:5000'],
        frameSrc:   ["'none'"],
        objectSrc:  ["'none'"],
      },
    },
    // Prevent browsers from MIME-sniffing
    noSniff: true,
    // Strict HSTS (enable in production behind HTTPS)
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    // Hide X-Powered-By: Express
    hidePoweredBy: true,
    // Block iframes
    frameguard: { action: 'deny' },
    // Prevent XSS filter bypass in older browsers
    xssFilter: true,
    // Referrer policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// ── 4. CORS — whitelist only the frontend origin ──────────────────────
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5500')
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      // in development only.
      if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
    },
    credentials: true,          // Allow cookies to be sent cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 600,                 // Cache preflight for 10 min
  })
);
app.options('*', cors());       // Pre-flight for all routes

// ── 5. Body parser — size limits to prevent large-payload DoS ────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── 6. Cookie parser (required for httpOnly JWT cookies) ─────────────
app.use(cookieParser());

// ── 7. HTTP request logger (dev only) ────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── 8. NoSQL injection sanitisation ──────────────────────────────────
// Strips $ and . from req.body, req.params, req.query to prevent
// MongoDB operator injection (e.g. { "$gt": "" }).
app.use(mongoSanitize({ replaceWith: '_' }));

// ── 9. XSS sanitisation ───────────────────────────────────────────────
// Encodes HTML entities in req.body, req.query, req.params.
app.use(xss);

// ── 10. HTTP Parameter Pollution protection ───────────────────────────
// Prevents duplicate query params being used to bypass validation.
app.use(hpp({ whitelist: ['sort', 'fields', 'page', 'limit', 'category'] }));

// ── 11. Global rate limiter (all routes) ─────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 200,                    // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests. Please try again later.' },
  skipSuccessfulRequests: false,
});
app.use('/api', globalLimiter);

// ── 12. Health check ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV });
});

// ── 13. Routes ────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/blogs', blogRoutes);

// ── 14. Serve Frontend Static Files ──────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));

// ── 15. 404 handler — catch all unmatched API routes ───────────────────
app.all('/api/*', (req, res, next) => {
  next(new AppError(`Cannot find '${req.originalUrl}' on this server.`, 404));
});

// Fallback to index.html for unknown frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── 15. Global error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── 16. Start server ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 5000;
const server = app.listen(PORT, () => {
  console.log(`[BlogVerse] Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// ── 17. Graceful shutdown on unhandled promise rejections ────────────
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err.name, err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err.name, err.message);
  process.exit(1);
});

module.exports = app;
