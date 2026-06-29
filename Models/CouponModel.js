const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide a coupon code'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [4, 'Coupon code must be at least 4 characters'],
    maxlength: [20, 'Coupon code cannot exceed 20 characters'],
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Please specify discount type'],
  },
  discountValue: {
    type: Number,
    required: [true, 'Please provide a discount value'],
    min: [0, 'Discount value cannot be negative'],
  },
  minPurchase: {
    type: Number,
    default: 0,
    min: [0, 'Minimum purchase cannot be negative'],
  },
  maxDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Maximum discount cannot be negative'],
  },
  expiryDate: {
    type: Date,
    required: [true, 'Please provide an expiry date'],
  },
  usageLimit: {
    type: Number,
    default: 0, // 0 means unlimited
    min: [0, 'Usage limit cannot be negative'],
  },
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Used count cannot be negative'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please specify the creator of the coupon'],
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);