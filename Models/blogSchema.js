const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  // ── Core content ──────────────────────────────
  title: {
    type: String,
    required: [true, 'Please provide a blog title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [220, 'Slug too long'],
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [300, 'Subtitle cannot exceed 300 characters'],
    default: ''
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    default: ''
  },
  content: {
    type: String,
    required: [true, 'Please provide blog content'],
    trim: true
  },
  // ── Media ────────────────────────────────────
  images: [{
    type: String,
    default: ''
  }],
  featureImage: {
    type: String,
    default: ''
  },
  featureImageAlt: {
    type: String,
    default: ''
  },
  featureOverlayText: {
    type: String,
    default: ''
  },
  // ── Authorship ───────────────────────────────
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please specify the author'],
  },
  authorDisplayName: {
    type: String,
    default: ''
  },
  authorBrandLine: {
    type: String,
    default: "Ray's Healthy Living"
  },
  // ── Taxonomy ─────────────────────────────────
  category: {
    type: String,
    default: 'General'
  },
  categorySlug: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  // ── Publishing ───────────────────────────────
  published: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  readTime: {
    type: String,
    default: ''
  },
  // ── SEO ──────────────────────────────────────
  seoTitle: {
    type: String,
    default: ''
  },
  metaDescription: {
    type: String,
    default: ''
  },
  // ── Site scope ───────────────────────────────
  websiteRole: {
    type: String,
    enum: ['retailer', 'wholesaler'],
    required: [true, 'Please specify the website role'],
  },
  // ── Related ──────────────────────────────────
  relatedSlugs: [{
    type: String
  }],
  bottomLine: {
    type: String,
    default: ''
  },
}, { timestamps: true });

// Auto-generate slug from title before save
blogSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 200);
  }
  // Set publishedAt when first published
  if (this.published && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
