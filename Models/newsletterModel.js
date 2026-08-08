const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  type: {
    type: String,
    default: 'wholesaler'
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  message: {
    type: String,
    default: ''
  },
  // Unsubscribe / compliance fields
  isUnsubscribed: {
    type: Boolean,
    default: false
  },
  doNotEmail: {
    type: Boolean,
    default: false
  },
  unsubscribedAt: {
    type: Date,
    default: null
  },
  unsubscribeReason: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast email lookups
newsletterSchema.index({ email: 1, type: 1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);
