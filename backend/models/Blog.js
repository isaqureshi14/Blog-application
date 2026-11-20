// models/Blog.js — Mongoose Blog schema
'use strict';

const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      required:  [true, 'A blog post must have a title.'],
      trim:      true,
      maxlength: [160, 'Title must be at most 160 characters.'],
      minlength: [5,   'Title must be at least 5 characters.'],
    },

    slug: {
      type:   String,
      unique: true,
      lowercase: true,
    },

    content: {
      type:      String,
      required:  [true, 'A blog post must have content.'],
      minlength: [50, 'Content must be at least 50 characters.'],
    },

    excerpt: {
      type:      String,
      trim:      true,
      maxlength: [300, 'Excerpt must be at most 300 characters.'],
    },

    coverImage: {
      type:    String,
      default: null,
    },

    category: {
      type:     String,
      required: [true, 'Category is required.'],
      enum: {
        values:  ['technology', 'design', 'career', 'lifestyle'],
        message: 'Category must be one of: technology, design, career, lifestyle.',
      },
      lowercase: true,
    },

    tags: {
      type:    [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 10,
        message:   'A post cannot have more than 10 tags.',
      },
    },

    status: {
      type:    String,
      enum:    ['draft', 'published'],
      default: 'draft',
    },

    author: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'A blog post must have an author.'],
    },

    views: {
      type:    Number,
      default: 0,
      min:     0,
    },

    readTime: {
      type:    Number, // in minutes
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────
blogSchema.index({ author: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ status: 1 });
blogSchema.index({ createdAt: -1 });

// ── Pre-save: auto-generate slug and read time ────────────────────────
blogSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric except spaces/hyphens
      .replace(/\s+/g, '-')            // spaces → hyphens
      .replace(/-+/g, '-')             // collapse consecutive hyphens
      .slice(0, 100)
      + '-' + Date.now();              // ensure uniqueness
  }

  if (this.isModified('content')) {
    // Approximate reading speed: 200 words per minute
    const wordCount = this.content.trim().split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  if (this.isModified('content') && !this.excerpt) {
    // Auto-generate excerpt from first 200 chars of content
    this.excerpt = this.content.replace(/[#*`>_]/g, '').slice(0, 200).trim() + '…';
  }

  next();
});

// ── Query middleware: populate author ─────────────────────────────────
blogSchema.pre(/^find/, function (next) {
  this.populate({
    path:   'author',
    select: 'name username',  // never expose email/password
  });
  next();
});

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;
