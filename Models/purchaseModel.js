
const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Optional for products without variants
    },
    variantName: {
      type: String,
      required: false, // Store variant name for display
    },
    variantSku: {
      type: String,
      required: false, // Store variant SKU for order invoice
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    websiteRole: {
      type: String,
      enum: ['retailer', 'wholesaler'],
      required: [true, 'Website role is required'],
    },
    flavour: {
      type: String,
      required: false, // Only for Maximum Cardio product
    },
  }],
  total: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total cannot be negative'],
  },

  shippingCost: { type: Number, default: 0 },

  purchaseId: {
    type: String,
    required: [true, 'Purchase ID is required'],
  },
  paymentIntentId: {
    type: String,
    required: [true, 'Payment Intent ID is required'],
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: [true, 'Shipping address is required'],
  },
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: false, // Optional to allow orders to be saved even if label fails
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'refund_requested', 'refunded'],
    default: 'pending',
  },
  refundReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Refund reason cannot exceed 500 characters'],
  },
  refundStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processed'],
    default: 'pending',
  },
  refundProcessedAt: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema)