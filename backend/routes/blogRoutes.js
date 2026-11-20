// routes/blogRoutes.js — Blog CRUD endpoints
'use strict';

const express = require('express');

const blogController = require('../controllers/blogController');
const { protect }    = require('../middleware/auth');
const {
  validateCreateBlog,
  validateUpdateBlog,
  validateMongoId,
  validatePagination,
  handleValidationErrors,
} = require('../middleware/validate');

const router = express.Router();

// ── Public routes (no auth required) ─────────────────────────────────
router.get(
  '/',
  validatePagination,
  handleValidationErrors,
  blogController.getAllBlogs
);

// /my must come BEFORE /:id to avoid "my" being treated as a Mongo ID
router.get(
  '/my',
  protect,
  validatePagination,
  handleValidationErrors,
  blogController.getMyBlogs
);

router.get(
  '/:id',
  validateMongoId,
  handleValidationErrors,
  blogController.getBlog
);

// ── Protected routes (login required) ────────────────────────────────
router.post(
  '/',
  protect,
  validateCreateBlog,
  handleValidationErrors,
  blogController.createBlog
);

router.patch(
  '/:id',
  protect,
  validateUpdateBlog,
  handleValidationErrors,
  blogController.updateBlog
);

router.delete(
  '/:id',
  protect,
  validateMongoId,
  handleValidationErrors,
  blogController.deleteBlog
);

module.exports = router;
