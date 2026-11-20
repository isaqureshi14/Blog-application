// controllers/blogController.js — Full CRUD for Blog posts
// Ownership check: users can only edit/delete their own posts.
// Admins can manage all posts.
'use strict';

const Blog     = require('../models/Blog');
const AppError = require('../utils/AppError');

// ── GET /api/v1/blogs — List published posts (paginated, filterable) ──
exports.getAllBlogs = async (req, res, next) => {
  try {
    // ---- Build filter ----
    const filter = { status: 'published' };

    // Safe category filter — whitelist enforced by validator
    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }

    // Safe text search filter with regex escaping to prevent ReDoS / injection
    if (req.query.search && typeof req.query.search === 'string') {
      const sanitizedSearch = req.query.search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (sanitizedSearch) {
        filter.$or = [
          { title: { $regex: sanitizedSearch, $options: 'i' } },
          { excerpt: { $regex: sanitizedSearch, $options: 'i' } },
          { content: { $regex: sanitizedSearch, $options: 'i' } },
        ];
      }
    }

    // ---- Pagination ----
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);
    const skip  = (page - 1) * limit;

    // ---- Safe sort (whitelist allowed fields) ----
    const allowedSortFields = ['createdAt', '-createdAt', 'views', '-views'];
    const sort = allowedSortFields.includes(req.query.sort) ? req.query.sort : '-createdAt';

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Blog.countDocuments(filter),
    ]);

    // Send X-Total-Count for frontend pagination
    res.setHeader('X-Total-Count', total);

    res.status(200).json({
      status:  'success',
      results: blogs.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: { blogs },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/blogs/:id — Single post ──────────────────────────────
exports.getBlog = async (req, res, next) => {
  try {
    // ID is validated as MongoId by middleware before we reach here
    const blog = await Blog.findById(req.params.id).select('-__v');

    if (!blog) {
      return next(new AppError('No blog post found with that ID.', 404));
    }

    // Only expose published posts to anonymous users
    if (blog.status !== 'published') {
      // Allow the author or admins to view drafts
      if (!req.user || (req.user.id !== blog.author._id.toString() && req.user.role !== 'admin')) {
        return next(new AppError('No blog post found with that ID.', 404));
      }
    }

    // Increment view count (non-blocking — don't await)
    Blog.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

    res.status(200).json({
      status: 'success',
      data:   { blog },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/blogs — Create a post ───────────────────────────────
exports.createBlog = async (req, res, next) => {
  try {
    // Only pick allowed fields — never trust extra client fields
    const { title, content, excerpt, category, tags, status, coverImage } = req.body;

    const blog = await Blog.create({
      title,
      content,
      excerpt,
      category,
      tags,
      status:     status || 'draft',
      coverImage: coverImage || null,
      author:     req.user.id,  // Set from authenticated session, not from body
    });

    res.status(201).json({
      status: 'success',
      data:   { blog },
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/blogs/:id — Update a post ──────────────────────────
exports.updateBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id).select('+author');

    if (!blog) {
      return next(new AppError('No blog post found with that ID.', 404));
    }

    // ── Ownership check ──
    if (blog.author._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You are not allowed to edit this post.', 403));
    }

    // Only pick allowed fields — prevent overwriting author, views, etc.
    const allowed = ['title', 'content', 'excerpt', 'category', 'tags', 'status', 'coverImage'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Blog.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-__v');

    res.status(200).json({
      status: 'success',
      data:   { blog: updated },
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/v1/blogs/:id — Delete a post ─────────────────────────
exports.deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return next(new AppError('No blog post found with that ID.', 404));
    }

    // ── Ownership check ──
    if (blog.author._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You are not allowed to delete this post.', 403));
    }

    await blog.deleteOne();

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/blogs/my — Authenticated user's own posts (all statuses) ──
exports.getMyBlogs = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const skip  = (page - 1) * limit;

    const [blogs, total] = await Promise.all([
      Blog.find({ author: req.user.id })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Blog.countDocuments({ author: req.user.id }),
    ]);

    res.setHeader('X-Total-Count', total);

    res.status(200).json({
      status:  'success',
      results: blogs.length,
      total,
      data: { blogs },
    });
  } catch (err) {
    next(err);
  }
};
