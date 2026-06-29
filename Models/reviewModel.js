const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  purchaseId: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    maxlength: 500,
  },
  websiteRole: {
    type: String,
    enum: ['retailer', 'wholesaler'],
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

}, { timestamps: true });

// Create unique index to prevent duplicate reviews per user per purchase
reviewSchema.index({ user: 1, purchaseId: 1 }, { unique: true });



module.exports = mongoose.model('Review', reviewSchema);